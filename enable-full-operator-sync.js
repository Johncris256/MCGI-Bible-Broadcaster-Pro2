const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- ENABLING FULL TWO-WAY OPERATOR-TO-OPERATOR SYNC ---');

// 1. UPDATE SERVER.JS (CENTRAL REAL-TIME BROKER & SNAPSHOT CACHE)
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

// Master central memory
let latestOperatorSnapshot = null;
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

  // REAL-TIME COLLABORATIVE SSE STREAM
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Ipadala agad ang pinakabagong buong kalagayan ng Operator sa bagong bukas na device
    res.write('data: ' + JSON.stringify({
      type: 'INIT_STATE',
      storage: masterStorage,
      snapshot: latestOperatorSnapshot
    }) + '\\n\\n');

    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // CENTRAL SYNC ENDPOINT (Tinatanggap ang lahat ng verse change, highlight tap, at settings)
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        if (payload.type === 'WORKSPACE_SNAPSHOT') {
          latestOperatorSnapshot = payload.snapshot;
        }

        if (payload.type === 'STORAGE_EVENT' && payload.key) {
          masterStorage[payload.key] = payload.value;
        }

        // I-broadcast agad sa lahat ng iba pang devices
        const msg = 'data: ' + JSON.stringify(payload) + '\\n\\n';
        sseClients.forEach(c => c.write(msg));

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

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
  console.log('  ✨ DUAL-OPERATOR COLLABORATIVE SYSTEM RUNNING ✨');
  console.log('===========================================================');
  console.log('  > Control Room (PC):  http://localhost:' + PORT + '/operator/');
  console.log('  > Stage Tablet:       http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Output Screen:      http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js bilang Collaborative Two-Way Broker.');

// 2. INJECT TWO-WAY OPERATOR SYNCHRONIZER SA OPERATOR/INDEX.HTML
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const opSyncEngine = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    const CLIENT_ID = 'client_' + Math.random().toString(36).substr(2, 9);
    let isApplyingRemote = false;

    // Helper: Hanapin ang workspace slot cards
    function getSlotCards() {
      return document.querySelectorAll('.slot-card, .render-box, [id*="slot"], [class*="slot"]');
    }

    // A. SNAPSHOT GENERATOR: Kunin ang kasalukuyang laman ng mga slots
    function captureSnapshot() {
      const slots = [];
      getSlotCards().forEach((box, idx) => {
        const header = box.querySelector('.slot-header, [class*="header"], h3, h4');
        const verseText = box.querySelector('.verse-text, [class*="verse"], p');
        if (verseText) {
          slots.push({
            index: idx,
            headerHtml: header ? header.innerHTML : '',
            verseHtml: verseText.innerHTML
          });
        }
      });
      return { slots: slots };
    }

    // B. TRANSMIT LOCAL CHANGES: Ipadala sa Server tuwing may binago
    function broadcastSnapshot() {
      if (isApplyingRemote) return;
      const snap = captureSnapshot();
      if (snap.slots.length > 0) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: CLIENT_ID, type: 'WORKSPACE_SNAPSHOT', snapshot: snap })
        }).catch(() => {});
      }
    }

    // Intercept ang BroadcastChannel (hal. kapag nagpalit ng talata o highlight)
    const origPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      origPost.apply(this, arguments);
      if (isApplyingRemote) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'BROADCAST_EVENT', channel: this.name, payload: data })
      }).catch(() => {});
      setTimeout(broadcastSnapshot, 50);
    };

    // Intercept ang localStorage writes
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      origSetItem.apply(this, arguments);
      if (isApplyingRemote) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'STORAGE_EVENT', key: key, value: String(value) })
      }).catch(() => {});
    };

    // C. APPLY REMOTE CHANGES: Tanggapin at i-update ang sariling screen
    function applySnapshot(snap) {
      if (!snap || !snap.slots) return;
      const cards = getSlotCards();
      snap.slots.forEach(item => {
        const box = cards[item.index];
        if (box) {
          const header = box.querySelector('.slot-header, [class*="header"], h3, h4');
          const verseText = box.querySelector('.verse-text, [class*="verse"], p');
          if (header && item.headerHtml) header.innerHTML = item.headerHtml;
          if (verseText && item.verseHtml) verseText.innerHTML = item.verseHtml;
        }
      });
    }

    // D. REAL-TIME SSE LISTENER (Tablet <-> PC Sync)
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.senderId === CLIENT_ID) return;

        isApplyingRemote = true;

        // Unang bukas ng tablet: kunin ang snapshot
        if (msg.type === 'INIT_STATE') {
          if (msg.storage) {
            Object.keys(msg.storage).forEach(k => localStorage.setItem(k, msg.storage[k]));
          }
          if (msg.snapshot) applySnapshot(msg.snapshot);
        }

        // Kapag nagbago ang mga talata sa kabilang device
        if (msg.type === 'WORKSPACE_SNAPSHOT' && msg.snapshot) {
          applySnapshot(msg.snapshot);
        }

        // Kapag nagbago ang storage
        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        // Kapag may pinindot na highlight o command
        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const ch = new BroadcastChannel(msg.channel || 'bible_projection_channel');
          ch.postMessage(msg.payload);
        }

        setTimeout(() => { isApplyingRemote = false; }, 30);
      } catch(e) {
        isApplyingRemote = false;
      }
    };

    // E. EVENT DELEGATION PARA SA TABLET TAP: Tiyaking laging gagana ang pag-tap sa mga salita
    document.addEventListener('click', function(e) {
      const wordSpan = e.target.closest('.ndi-word, span[data-word-idx]');
      if (!wordSpan) return;

      // Kung hindi na-trigger ng app, i-toggle ang highlight
      setTimeout(() => {
        broadcastSnapshot();
      }, 40);
    });

    // Bantayan ang local DOM changes (hal. kapag pumili ng talata sa Control Room PC)
    window.addEventListener('DOMContentLoaded', function() {
      const stage = document.getElementById('multiSlotStage') || document.body;
      const observer = new MutationObserver(() => {
        if (!isApplyingRemote) {
          setTimeout(broadcastSnapshot, 60);
        }
      });
      observer.observe(stage, { childList: true, subtree: true, characterData: true });

      // Tablet Touch UI smooth tap styling
      const style = document.createElement('style');
      style.textContent = '.ndi-word, span { -webkit-tap-highlight-color: transparent; touch-action: manipulation; cursor: pointer; }';
      document.head.appendChild(style);
    });
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + opSyncEngine);
  } else {
    opHtml = opSyncEngine + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang Two-Way Operator Synchronizer sa operator/index.html');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! FULL TWO-WAY OPERATOR SYNC IS NOW ACTIVE.');
console.log('========================================================');