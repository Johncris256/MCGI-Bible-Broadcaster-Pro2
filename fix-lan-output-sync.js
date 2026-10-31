const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- DEPLOYING LIGHTWEIGHT UNIVERSAL LAN OUTPUT SYNC ---');

// 1. UPDATE SERVER.JS (NATIVE HTTP + LIGHTWEIGHT SSE STREAM RELAY)
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
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
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

let sseClients = [];
let latestByType = {}; // Naka-cache ang huling mga talata at settings

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

  // SSE STREAM: Pinakikinggan ng lahat ng Output displays sa LAN
  if (cleanUrl === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Ipadala agad ang pinakabagong screen data sa bagong bukas na Output
    Object.values(latestByType).forEach(msg => {
      res.write('data: ' + JSON.stringify(msg) + '\\n\\n');
    });

    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // BROADCAST RELAY: Tinatanggap ang copy ng broadcast mula sa Operator
  if (cleanUrl === '/api/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const key = data.type || (typeof data.slotIndex !== 'undefined' ? ('slot_' + data.slotIndex) : '_generic');
        latestByType[key] = data;

        const packet = 'data: ' + JSON.stringify(data) + '\\n\\n';
        sseClients.forEach(c => c.write(packet));

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
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
  console.log('    ✨ UNIVERSAL LAN BIBLE OUTPUT SERVER ONLINE ✨');
  console.log('===========================================================');
  console.log('  > PC Operator:    http://localhost:' + PORT + '/operator/');
  console.log('  > Output Screen:  http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ server.js: Handa na ang Stream at Broadcast relay.');

// 2. OPERATOR/INDEX.HTML: MAGAAN AT NON-DESTRUCTIVE TRANSMITTER
// (Walang gagalawing DOM, walang babaguhing HTML sa slots)
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="OPERATOR_LAN_BROADCAST_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const opRelay = `
<script id="OPERATOR_LAN_BROADCAST_BRIDGE">
  (function() {
    const origPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      if (data && typeof data === 'object' && !data.__msgId) {
        data.__msgId = Date.now() + '_' + Math.random().toString(36).substr(2, 7);
      }
      origPost.apply(this, arguments);

      // Tahimik na ipadala sa server para sa lahat ng LAN Output screens
      try {
        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
      } catch(e) {}
    };
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + opRelay);
  } else {
    opHtml = opRelay + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Naikabit ang non-destructive LAN transmitter.');
}

// 3. OUTPUT/OUTPUT.HTML: UNIVERSAL RECEIVER (PARA SA LAHAT NG DEVICES SA NETWORK)
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  outHtml = outHtml.replace(/<script id="UNIVERSAL_OUTPUT_LAN_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outUniversalReceiver = `
<script id="UNIVERSAL_OUTPUT_LAN_RECEIVER">
  (function() {
    const registeredChannels = new Set();
    const seenMsgIds = new Set();

    // I-hook ang native BroadcastChannel bago pa mag-load ang output.js
    const OrigBC = window.BroadcastChannel;
    window.BroadcastChannel = function(name) {
      const instance = new OrigBC(name);
      registeredChannels.add(instance);
      instance.addEventListener('message', function(ev) {
        if (ev.data && ev.data.__msgId) {
          seenMsgIds.add(ev.data.__msgId);
        }
      });
      return instance;
    };
    window.BroadcastChannel.prototype = OrigBC.prototype;

    // Makinig sa Real-Time SSE Stream mula sa Server
    const es = new EventSource('/api/stream');
    es.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);

        // Iwas-duplicate kung natanggap na via local BroadcastChannel sa mismong PC
        if (msg.__msgId) {
          if (seenMsgIds.has(msg.__msgId)) return;
          seenMsgIds.add(msg.__msgId);
          if (seenMsgIds.size > 200) {
            const first = seenMsgIds.values().next().value;
            seenMsgIds.delete(first);
          }
        }

        // I-dispatch sa lahat ng channel listeners ng output.js
        registeredChannels.forEach(ch => {
          const ev = new MessageEvent('message', { data: msg });
          if (typeof ch.onmessage === 'function') {
            try { ch.onmessage(ev); } catch(err) {}
          }
          try { ch.dispatchEvent(ev); } catch(err) {}
        });
      } catch(err) {}
    };
  })();
</script>
`;

  // I-inject sa pinakaunahan ng <head> para mauna sa output.js
  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + outUniversalReceiver);
  } else {
    outHtml = outUniversalReceiver + '\n' + outHtml;
  }

  // Refresh timestamp
  outHtml = outHtml.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ output/output.html: Naikabit ang Universal LAN Receiver.');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! UNIVERSAL LAN OUTPUT SYNC IS FULLY ACTIVE.');
console.log('========================================================');