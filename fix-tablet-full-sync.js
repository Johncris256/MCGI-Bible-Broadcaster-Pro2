const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- FIXING FULL LAN TABLET SYNC (PROTOTYPE INTERCEPTOR) ---');

// 1. UPDATE SERVER.JS (ROBUST SSE SYNC HUB WITH CORS & LIVE LOGS)
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

let sseClients = [];

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  let cleanUrl = req.url.split('?')[0];

  // SSE STREAM: Pinakikinggan ng PC Output
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: {"type":"CONNECTED"}\\n\\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // SYNC ENDPOINT: Tinatanggap ang bawat click mula sa Tablet
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log('[LAN EVENT] Natanggap mula sa device:', payload.type || 'SYNC');
        
        // I-broadcast sa lahat ng konektadong screens (PC Output)
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
  console.log('       ✨ BIBLE PROJECTION LAN SERVER RUNNING ✨');
  console.log('===========================================================');
  console.log('  > PC Operator:    http://localhost:' + PORT + '/operator/');
  console.log('  > Android Tablet: http://' + ip + ':' + PORT + '/operator/');
  console.log('  > PC Output:      http://localhost:' + PORT + '/output/output.html');
  console.log('===========================================================');
  console.log('  Nakikinig sa bawat galaw mula sa Android Tablet...');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js');

// 2. I-INJECT ANG GLOBAL INTERCEPTOR SA OPERATOR PANEL
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const opInterceptor = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    // 1. I-intercept ang LAHAT ng BroadcastChannel messages sa tablet
    const originalPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      originalPost.apply(this, arguments);
      try {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'BROADCAST_EVENT', channel: this.name, payload: data })
        }).catch(() => {});
      } catch(e) {}
    };

    // 2. I-intercept ang LAHAT ng localStorage writes sa tablet
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      originalSetItem.apply(this, arguments);
      try {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'STORAGE_EVENT', key: key, value: String(value) })
        }).catch(() => {});
      } catch(e) {}
    };
  })();
</script>
`;

  // Ipasok agad sa pinakatuktok ng <head> para ma-intercept bago pa mag-load ang operator.js
  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + opInterceptor);
  } else {
    opHtml = opInterceptor + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang Global Prototype Interceptor sa operator/index.html');
}

// 3. I-INJECT ANG UNIVERSAL EVENT RECEIVER SA OUTPUT DISPLAY
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');
  outHtml = outHtml.replace(/<script id="LAN_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outReceiver = `
<script id="LAN_OUTPUT_RECEIVER">
  (function() {
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const msg = JSON.parse(event.data);

        // A. Kapag may binagong data sa storage ang Tablet
        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        // B. Kapag may broadcast message (talata, highlight, transitions)
        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const chName = msg.channel || 'bible_projection_channel';
          const localBC = new BroadcastChannel(chName);
          localBC.postMessage(msg.payload);
        }
      } catch(e) {}
    };
  })();
</script>
`;

  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + outReceiver);
  } else {
    outHtml = outReceiver + '\n' + outHtml;
  }
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naikabit ang Universal Event Receiver sa output/output.html');
}

console.log('\n✓ REPAIR COMPLETE! Handang-handa na ang real-time LAN communication.');