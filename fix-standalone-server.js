const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');

console.log('--- CREATING ZERO-DEPENDENCY NATIVE LAN SERVER ---');

const nativeServerCode = `const http = require('http');
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
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
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

const server = http.createServer((req, res) => {
  // Tanggalin ang query params tulad ng ?v=123
  let cleanUrl = req.url.split('?')[0];
  
  if (cleanUrl === '/') {
    cleanUrl = '/operator/index.html';
  }

  let filePath = path.join(BASE_DIR, decodeURIComponent(cleanUrl));

  // Kung folder ang binuksan, hanapin ang index.html sa loob
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found: ' + cleanUrl);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error: ' + err.code);
      }
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

// I-bind sa 0.0.0.0 upang ma-access ng buong Local Network (LAN / Wi-Fi)
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('===========================================================');
  console.log('       ✨ BIBLE PROJECTION WEB SERVER IS RUNNING ✨');
  console.log('===========================================================');
  console.log(\`  > Local PC Access:        http://localhost:\${PORT}/operator/\`);
  console.log(\`  > LAN Web Address (vMix):  http://\${ip}:\${PORT}/operator/\`);
  console.log(\`  > Output Display Stream:  http://\${ip}:\${PORT}/output/output.html\`);
  console.log('===========================================================');
  console.log('  Handa na para sa mga cellphone, tablet, at ibang laptops!');
});
`;

fs.writeFileSync(serverJsPath, nativeServerCode, 'utf8');
console.log('✓ SUCCESS! Na-update ang server.js gamit ang Zero-Dependency Native HTTP engine.');