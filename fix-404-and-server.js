const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const opDir = path.join(baseDir, 'operator');
const outDir = path.join(baseDir, 'output');
const dataDir = path.join(baseDir, 'data');
const transDir = path.join(dataDir, 'translations');

[baseDir, opDir, outDir, dataDir, transDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 1. Tiyaking may Translations Manifest
const manifestPath = path.join(dataDir, 'translations-manifest.json');
if (!fs.existsSync(manifestPath)) {
  const sampleManifest = [{ id: "001", name: "ANG DATING BIBLIA", file: "001.json" }];
  fs.writeFileSync(manifestPath, JSON.stringify(sampleManifest, null, 2), 'utf8');
}

// Tiyaking may Genesis 1 fallback translation
const sample001 = path.join(transDir, '001.json');
if (!fs.existsSync(sample001)) {
  const genesis = {
    "GENESIS": {
      "1": {
        "1": "Nang pasimula ay nilikha ng Dios ang langit at ang lupa.",
        "2": "At ang lupa ay walang anyo at walang laman; at ang kadiliman ay sumasa ibabaw ng kalaliman.",
        "3": "At sinabi ng Dios, Magkaroon ng liwanag; at nagkaroon ng liwanag."
      }
    }
  };
  fs.writeFileSync(sample001, JSON.stringify(genesis, null, 2), 'utf8');
}

// ============================================================================
// 2. SERVER.JS (Port 3300 + Windows-safe path resolution + WebSocket)
// ============================================================================
const serverCode = `const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 3300;
let lastLiveState = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  if (reqPath === '/api/translations') {
    const mPath = path.join(__dirname, 'data', 'translations-manifest.json');
    if (fs.existsSync(mPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(fs.readFileSync(mPath));
    }
  }

  // Windows-safe relative path
  const cleanPath = reqPath.replace(/^[\\\\/]+/, '');
  const filePath = path.join(__dirname, cleanPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return res.end(fs.readFileSync(filePath));
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h3>404 Not Found</h3><p>Hinahanap na file: <code>' + filePath + '</code></p>');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  if (lastLiveState) {
    try { ws.send(JSON.stringify(lastLiveState)); } catch(e) {}
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      lastLiveState = data;
      wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(JSON.stringify(data));
      });
    } catch(err) {}
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================================');
  console.log('✓ BIBLE APP SERVER GUMAGANA SA PORT ' + PORT);
  console.log('  Operator Panel : http://localhost:' + PORT + '/operator/index.html');
  console.log('  Output Screen  : http://localhost:' + PORT + '/output/output.html');
  console.log('========================================================');
});
`;
fs.writeFileSync(path.join(baseDir, 'server.js'), serverCode, 'utf8');

// ============================================================================
// 3. ROOT INDEX.HTML (DIRECT PORT 3300 LAUNCHER)
// ============================================================================
const rootHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible App Launcher (HTML5)</title>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    h1 { color: #facc15; margin-bottom: 24px; font-size: 26px; }
    .btn-container { display: flex; gap: 16px; }
    a { padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; }
    .btn-op { background: #2563eb; color: #ffffff; }
    .btn-out { background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; }
  </style>
</head>
<body>
  <h1>Custom Bible App (HTML5)</h1>
  <div class="btn-container">
    <a href="/operator/index.html" class="btn-op">🎛️ Open Operator Panel</a>
    <a href="/output/output.html" target="_blank" class="btn-out">🖥️ Open Output Screen</a>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(baseDir, 'index.html'), rootHtml, 'utf8');

console.log('✓ Na-update ang server.js at index.html para sa Port 3300!');