const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// 1. CODE NA IDADAGDAG SA SERVER.JS (Server Memory + Disk Cache)
const SERVER_MEMORY_PATCH = `
// === [START] LIVE SERVER MEMORY SESSION ===
const SESSION_CACHE_FILE = require('path').join(__dirname, 'live-session-cache.json');
let MASTER_SESSION = {
  lastOutputPayload: null,
  lastHighlightPayload: null,
  slots: {},
  settings: {},
  updatedAt: 0
};

// Load previous session kung nag-restart ang server
try {
  if (require('fs').existsSync(SESSION_CACHE_FILE)) {
    MASTER_SESSION = JSON.parse(require('fs').readFileSync(SESSION_CACHE_FILE, 'utf8'));
  }
} catch (e) {}

function saveMasterSession() {
  try {
    require('fs').writeFileSync(SESSION_CACHE_FILE, JSON.stringify(MASTER_SESSION), 'utf8');
  } catch (e) {}
}
// === [END] LIVE SERVER MEMORY SESSION ===
`;

// 2. CODE NA IDADAGDAG SA HTML FILES (Auto-Sync pagkabukas ng page)
const CLIENT_SYNC_SCRIPT = `
<script>
/* LIVE-MEMORY-CLIENT-SYNC */
(function() {
  // Pagka-load ng page, kunin agad ang live session sa server
  window.addEventListener('DOMContentLoaded', () => {
    fetch('/api/live-session')
      .then(r => r.json())
      .then(session => {
        if (!session) return;
        window.__SERVER_SESSION__ = session;
        // Mag-dispatch ng custom event at gayahin ang localStorage kung ginagamit ng app
        if (session.localStorageBackup) {
          for (const [k, v] of Object.entries(session.localStorageBackup)) {
            try { localStorage.setItem(k, v); } catch (e) {}
          }
        }
        window.dispatchEvent(new CustomEvent('server-session-loaded', { detail: session }));
      })
      .catch(() => {});
  });

  // Bantayan ang localStorage changes ng Operator at i-sync sa Server Memory
  const origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    origSetItem.apply(this, arguments);
    if (this === window.localStorage && !window.__APPLYING_REMOTE_STORAGE__) {
      fetch('/api/live-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      }).catch(() => {});
    }
  };

  // Makinig sa live updates mula sa ibang connected clients
  const es = new EventSource('/api/live-session-stream');
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'storage-sync' && data.key) {
        window.__APPLYING_REMOTE_STORAGE__ = true;
        origSetItem.call(window.localStorage, data.key, data.value);
        // Trigger ang native storage event para mag-update agad ang Output Screen at Operator
        window.dispatchEvent(new StorageEvent('storage', {
          key: data.key,
          newValue: data.value,
          storageArea: window.localStorage
        }));
        window.__APPLYING_REMOTE_STORAGE__ = false;
      } else if (data.type === 'init-storage' && data.storage) {
        window.__APPLYING_REMOTE_STORAGE__ = true;
        for (const [k, v] of Object.entries(data.storage)) {
          origSetItem.call(window.localStorage, k, v);
          window.dispatchEvent(new StorageEvent('storage', {
            key: k,
            newValue: v,
            storageArea: window.localStorage
          }));
        }
        window.__APPLYING_REMOTE_STORAGE__ = false;
      }
    } catch (err) {}
  };
})();
</script>
`;

console.log('🔄 Ikakabit ang Live Server Memory Session...');

// I-patch ang server.js
const serverPath = path.join(ROOT, 'server.js');
if (fs.existsSync(serverPath)) {
  let sContent = fs.readFileSync(serverPath, 'utf8');

  if (!sContent.includes('LIVE SERVER MEMORY SESSION')) {
    const interceptorCode = `
${SERVER_MEMORY_PATCH}
const __liveMemoryClients = new Set();
const __origCreateServer = require('http').createServer;
require('http').createServer = function(requestListener) {
  return __origCreateServer.call(this, function(req, res) {
    const parsed = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    
    // 1. Live SSE Stream para sa real-time memory sync sa lahat ng browsers
    if (req.method === 'GET' && parsed.pathname === '/api/live-session-stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      // Pagka-connect ng Output Screen o bagong Operator, ibato agad ang nakasave na state!
      res.write('data: ' + JSON.stringify({
        type: 'init-storage',
        storage: MASTER_SESSION.localStorageBackup || {}
      }) + '\\n\\n');
      
      __liveMemoryClients.add(res);
      req.on('close', () => __liveMemoryClients.delete(res));
      return;
    }

    // 2. Endpoint para kunin o i-save ang kasalukuyang talata/state
    if (parsed.pathname === '/api/live-session') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(MASTER_SESSION));
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!MASTER_SESSION.localStorageBackup) MASTER_SESSION.localStorageBackup = {};
            if (data.key) {
              MASTER_SESSION.localStorageBackup[data.key] = data.value;
              MASTER_SESSION.updatedAt = Date.now();
              saveMasterSession();
              // I-broadcast sa lahat ng nakabukas na Output Screen at Operator!
              const msg = 'data: ' + JSON.stringify({ type: 'storage-sync', key: data.key, value: data.value }) + '\\n\\n';
              __liveMemoryClients.forEach(client => { try { client.write(msg); } catch (e) {} });
            }
          } catch (e) {}
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        });
        return;
      }
    }

    return requestListener.apply(this, arguments);
  });
};
`;
    sContent = interceptorCode + '\n' + sContent;
    fs.writeFileSync(serverPath, sContent, 'utf8');
    console.log('✅ Server Memory Session idinagdag sa server.js');
  }
}

// I-patch ang lahat ng HTML files
function patchHtmlFiles(dir) {
  for (const file of fs.readdirSync(dir)) {
    if (['node_modules', '.git'].includes(file)) continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      patchHtmlFiles(full);
    } else if (file.endsWith('.html')) {
      let html = fs.readFileSync(full, 'utf8');
      if (!html.includes('LIVE-MEMORY-CLIENT-SYNC')) {
        html = html.includes('<head>')
          ? html.replace('<head>', '<head>' + CLIENT_SYNC_SCRIPT)
          : CLIENT_SYNC_SCRIPT + html;
        fs.writeFileSync(full, html, 'utf8');
        console.log(`✅ Auto-Sync ikinabit sa: ${path.relative(ROOT, full)}`);
      }
    }
  }
}

patchHtmlFiles(ROOT);
console.log('\n🎉 Tapos na! Naka-sync na sa iisang Server Memory ang lahat ng bukas na screens.');