const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- DEPLOYING CENTRALIZED NETWORK SYNC HUB (VICE VERSA CONTROL) ---');

// 1. UPDATE SERVER.JS (CENTRAL STATE STORAGE & REAL-TIME EVENT STREAM)
const serverCode = `const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3300;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// CENTRAL IN-MEMORY MASTER DATABASE
let masterStorage = {};
let sseClients = [];

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  let cleanUrl = req.url.split('?')[0];

  // REAL-TIME SSE SYNC STREAM
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Initial Handshake: Ipadala agad ang kabuuang server state sa bagong bukas na device
    res.write('data: ' + JSON.stringify({ type: 'FULL_STATE_INIT', storage: masterStorage }) + '\\n\\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // CENTRAL SYNC ENDPOINT (Tumatanggap mula sa kahit anong PC o Tablet)
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        // Itala sa Master Server Memory
        if (payload.type === 'STORAGE_EVENT' && payload.key) {
          masterStorage[payload.key] = payload.value;
        }

        // I-broadcast pabalik sa LAHAT ng iba pang devices
        const msg = 'data: ' + JSON.stringify(payload) + '\\n\\n';
        sseClients.forEach(client => client.write(msg));

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static File Serving
  if (cleanUrl === '/') cleanUrl = '/operator/index.html';
  let filePath = path.join(BASE_DIR, decodeURIComponent(cleanUrl));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('===========================================================');
  console.log('    ✨ BIBLE PROJECTION VICE-VERSA CENTRAL SERVER ✨');
  console.log('===========================================================');
  console.log('  > PC Operator:    http://localhost:' + PORT + '/operator/');
  console.log('  > Tablet Control: http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Unified Output: http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js bilang Master Database at Event Broadcaster.');

// 2. BIDIRECTIONAL OPERATOR ENGINE (PARA SA PC AT TABLET)
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const opEngine = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    const CLIENT_ID = 'dev_' + Math.random().toString(36).substr(2, 9);
    window.__isRemoteSyncing = false;

    const originalPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      originalPost.apply(this, arguments);
      if (window.__isRemoteSyncing) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'BROADCAST_EVENT', channel: this.name, payload: data })
      }).catch(() => {});
    };

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.apply(this, arguments);
      if (window.__isRemoteSyncing) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'STORAGE_EVENT', key: key, value: String(value) })
      }).catch(() => {});
    };

    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.senderId === CLIENT_ID) return;

        window.__isRemoteSyncing = true;

        if (msg.type === 'FULL_STATE_INIT' && msg.storage) {
          Object.keys(msg.storage).forEach(k => {
            localStorage.setItem(k, msg.storage[k]);
          });
        }

        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const ch = new BroadcastChannel(msg.channel || 'bible_projection_channel');
          ch.postMessage(msg.payload);
        }

        window.__isRemoteSyncing = false;
      } catch(e) {
        window.__isRemoteSyncing = false;
      }
    };
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + opEngine);
  } else {
    opHtml = opEngine + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang Bidirectional Sync Engine sa operator/index.html');
}

// 3. UNIFIED OUTPUT RECEIVER
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');
  outHtml = outHtml.replace(/<script id="LAN_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outEngine = `
<script id="LAN_OUTPUT_RECEIVER">
  (function() {
    window.__isRemoteSyncing = false;

    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);
        window.__isRemoteSyncing = true;

        if (msg.type === 'FULL_STATE_INIT' && msg.storage) {
          Object.keys(msg.storage).forEach(k => {
            localStorage.setItem(k, msg.storage[k]);
            window.dispatchEvent(new StorageEvent('storage', {
              key: k,
              newValue: msg.storage[k],
              storageArea: localStorage,
              url: window.location.href
            }));
          });
        }

        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const ch = new BroadcastChannel(msg.channel || 'bible_projection_channel');
          ch.postMessage(msg.payload);
        }

        window.__isRemoteSyncing = false;
      } catch(e) {
        window.__isRemoteSyncing = false;
      }
    };
  })();
</script>
`;

  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + outEngine);
  } else {
    outHtml = outEngine + '\n' + outHtml;
  }
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naikabit ang Unified Output Engine sa output/output.html');
}

console.log('\n✓ SETUP COMPLETE! Handang-handa na ang Vice-Versa Central System.');