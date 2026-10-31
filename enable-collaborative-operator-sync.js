const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- ENABLING COLLABORATIVE MULTI-OPERATOR REAL-TIME SYNC ---');

// 1. UPDATE SERVER.JS (CENTRAL COLLABORATIVE REAL-TIME HUB)
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

// Master central memory para sa lahat ng live slots at settings
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

  // REAL-TIME COLLABORATIVE STREAM
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Agad ipadala sa bagong bukas na Tablet/PC ang buong kasalukuyang state
    res.write('data: ' + JSON.stringify({ type: 'FULL_STATE_INIT', storage: masterStorage }) + '\\n\\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // COLLABORATIVE ACTION SYNC (Verse change, Highlight tap, Mode switch)
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        if (payload.type === 'STORAGE_EVENT' && payload.key) {
          masterStorage[payload.key] = payload.value;
        }

        // I-broadcast agad sa LAHAT ng iba pang devices (Tablet, PC Operator, at Output)
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
  console.log('  ✨ DUAL-OPERATOR COLLABORATIVE BIBLE SYSTEM READY ✨');
  console.log('===========================================================');
  console.log('  > Control Room (PC):  http://localhost:' + PORT + '/operator/');
  console.log('  > Stage Tablet (Pad): http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Output Screen:     http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js bilang Collaborative Hub.');

// 2. INJECT COLLABORATIVE DUAL-OPERATOR ENGINE SA OPERATOR/INDEX.HTML
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const collaborativeEngine = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    const CLIENT_ID = 'op_' + Math.random().toString(36).substr(2, 9);
    let isApplyingRemote = false;

    // 1. Hook sa BroadcastChannel at localStorage para i-transmit ang bawat action
    const originalPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      originalPost.apply(this, arguments);
      if (isApplyingRemote) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'BROADCAST_EVENT', channel: this.name, payload: data })
      }).catch(() => {});
    };

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.apply(this, arguments);
      if (isApplyingRemote) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'STORAGE_EVENT', key: key, value: String(value) })
      }).catch(() => {});
    };

    // 2. Tumatanggap ng pagbabago mula sa ibang Operator (PC <-> Tablet)
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.senderId === CLIENT_ID) return; // Iwas double-trigger sa nag-click

        isApplyingRemote = true;

        // A. Kapag unang nag-load ang Tablet, kunin ang buong snapshot
        if (msg.type === 'FULL_STATE_INIT' && msg.storage) {
          Object.keys(msg.storage).forEach(k => {
            localStorage.setItem(k, msg.storage[k]);
          });
        }

        // B. Kapag nagbago ang talata o storage key sa PC
        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        // C. Kapag nagpalit ng talata o nag-highlight sa kabilang device
        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const ch = new BroadcastChannel(msg.channel || 'bible_projection_channel');
          ch.postMessage(msg.payload);

          // I-sync ang live DOM highlights sa screen ng tablet/PC
          if (msg.payload.type === 'HIGHLIGHT' || msg.payload.highlightedWords) {
            syncDOMHighlights(msg.payload);
          }
        }

        isApplyingRemote = false;
      } catch(e) {
        isApplyingRemote = false;
      }
    };

    // Helper: I-reflect ang active highlights sa sariling screen
    function syncDOMHighlights(payload) {
      const activeSlotIndex = payload.slotIndex || 0;
      const boxes = document.querySelectorAll('.slot-card, .render-box, [id*="slot"]');
      if (boxes[activeSlotIndex]) {
        const words = boxes[activeSlotIndex].querySelectorAll('.ndi-word, span');
        if (Array.isArray(payload.highlightedIndices)) {
          words.forEach((w, idx) => {
            if (payload.highlightedIndices.includes(idx)) {
              w.classList.add('active-highlight');
            } else {
              w.classList.remove('active-highlight');
            }
          });
        }
      }
    }

    // Tablet Touch Optimization: mabilis at walang delay na tap sa mga salita
    window.addEventListener('DOMContentLoaded', function() {
      const style = document.createElement('style');
      style.textContent = '.ndi-word { -webkit-tap-highlight-color: transparent; touch-action: manipulation; cursor: pointer; user-select: none; }';
      document.head.appendChild(style);
    });
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + collaborativeEngine);
  } else {
    opHtml = collaborativeEngine + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang Collaborative Dual-Operator Engine sa operator/index.html');
}

// 3. SIGURUHING NAKIKINIG ANG OUTPUT SA COLLABORATIVE HUB
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');
  outHtml = outHtml.replace(/<script id="LAN_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outEngine = `
<script id="LAN_OUTPUT_RECEIVER">
  (function() {
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);

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
      } catch(e) {}
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
  console.log('✓ Naisaayos ang Output Receiver sa output/output.html');
}

console.log('\n✓ SUCCESS! COLLABORATIVE DUAL-OPERATOR IS FULLY ACTIVE.');