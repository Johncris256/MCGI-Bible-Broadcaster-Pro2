const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- ENABLING FULL CROSS-DEVICE LAN SYNC ENGINE (TABLET -> PC) ---');

// 1. UPDATE SERVER.JS (BUILT-IN REAL-TIME SSE SYNC HUB)
const updatedServerCode = `const http = require('http');
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

// Global LAN Sync Hub
let clients = [];
let currentLANState = {};

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];

  // REAL-TIME SSE STREAM (Para sa lahat ng nakakonektang devices)
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Ipadala ang pinakabagong state pagka-connect
    res.write('data: ' + JSON.stringify(currentLANState) + '\\n\\n');
    clients.push(res);

    req.on('close', () => {
      clients = clients.filter(c => c !== res);
    });
    return;
  }

  // DISPATCH STATE (Tinatanggap ang utos mula sa Android Tablet o PC Operator)
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        currentLANState = { ...currentLANState, ...payload, _ts: Date.now() };

        // I-broadcast sa lahat ng devices (Output display at ibang Operators)
        const msg = 'data: ' + JSON.stringify(currentLANState) + '\\n\\n';
        clients.forEach(c => c.write(msg));

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // STATIC FILE SERVING
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
  console.log('       ✨ BIBLE PROJECTION LAN SERVER RUNNING ✨');
  console.log('===========================================================');
  console.log('  > PC Operator:    http://localhost:' + PORT + '/operator/');
  console.log('  > Android Tablet: http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Output Screen:  http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, updatedServerCode, 'utf8');
console.log('✓ Naisaayos ang server.js para maging LAN Real-time Sync Hub.');

// 2. I-INJECT ANG UNIVERSAL LAN BRIDGE SA OPERATOR
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const opBridge = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    // Mag-hook sa local broadcast channel para i-retransmit sa Server gamit ang HTTP POST
    try {
      const bc = new BroadcastChannel('bible_projection_channel');
      const originalPost = bc.postMessage.bind(bc);
      bc.postMessage = function(data) {
        originalPost(data);
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'BROADCAST_EVENT', payload: data })
        }).catch(() => {});
      };
    } catch(e) {}
  })();
</script>
`;
  if (opHtml.includes('</body>')) {
    opHtml = opHtml.replace('</body>', opBridge + '\n</body>');
  } else {
    opHtml += opBridge;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang LAN transmitter sa operator/index.html');
}

// 3. I-INJECT ANG UNIVERSAL LAN RECEIVER SA OUTPUT DISPLAY
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');
  outHtml = outHtml.replace(/<script id="LAN_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outBridge = `
<script id="LAN_OUTPUT_RECEIVER">
  (function() {
    // Makinig sa Real-Time SSE Stream mula sa Server
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const state = JSON.parse(event.data);
        if (state.type === 'BROADCAST_EVENT' && state.payload) {
          // Ipadala sa internal BroadcastChannel listener ng output.js
          const bc = new BroadcastChannel('bible_projection_channel');
          bc.postMessage(state.payload);
        }
      } catch(e) {}
    };
  })();
</script>
`;
  if (outHtml.includes('</body>')) {
    outHtml = outHtml.replace('</body>', outBridge + '\n</body>');
  } else {
    outHtml += outBridge;
  }
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naikabit ang LAN receiver sa output/output.html');
}

console.log('\\n✓ TAPOS! Handang-handa na para sa wireless Android Tablet control.');