const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'out'];

function scanFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORE_DIRS.includes(file)) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanFiles(fullPath, fileList);
    } else if (/\.(html|js)$/i.test(file) && file !== 'make-web-ready.js') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

console.log('🚀 Sinisimulan ang pag-convert sa Pure Web Version...\n');

const allFiles = scanFiles(ROOT);

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  const relPath = path.relative(ROOT, filePath);
  const isServer = path.basename(filePath).toLowerCase() === 'server.js';

  if (isServer) {
    // 1. Ayusin ang hardcoded Windows path (C:\bible-html5-app\...) papuntang dynamic cloud path
    content = content.replace(
      /["']C:\\+bible-html5-app\\+data\\+translations["']/gi,
      "require('path').join(__dirname, 'data', 'translations')"
    );
    content = content.replace(
      /["']C:\/bible-html5-app\/data\/translations["']/gi,
      "require('path').join(__dirname, 'data', 'translations')"
    );

    // 2. Gawing dynamic ang PORT para sa Render/Web Hosting (process.env.PORT)
    content = content.replace(
      /(const|let|var)\s+PORT\s*=\s*3300\s*;/g,
      '$1 PORT = process.env.PORT || 3300;'
    );
    content = content.replace(
      /\.listen\(\s*3300\s*,/g,
      '.listen(process.env.PORT || 3300,'
    );
  } else {
    // --- FRONTEND FILES (HTML & JS) ---

    // 1. Tanggalin ang hardcoded http://localhost:3300 o http://127.0.0.1:3300
    content = content.replace(/https?:\/\/(localhost|127\.0\.0\.1):3300/gi, '');

    // 2. Palitan ang hardcoded ws://localhost:3300 papuntang dynamic Web Link (wss:// / ws://)
    content = content.replace(
      /['"`]wss?:\/\/(localhost|127\.0\.0\.1):3300([^'"`]*)['"`]/gi,
      "((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '$2')"
    );

    // 3. Palitan ang dynamic hostname na may nakadikit pang :3300 (hal. location.hostname + ':3300')
    content = content.replace(
      /window\.location\.hostname\s*\+\s*['"]:3300['"]/g,
      'window.location.host'
    );
    content = content.replace(
      /location\.hostname\s*\+\s*['"]:3300['"]/g,
      'location.host'
    );

    // 4. Siguraduhing nagiging wss:// kapag naka-HTTPS (Render) ang anumang new WebSocket('ws://' + ...)
    content = content.replace(
      /new\s+WebSocket\(\s*['"]ws:\/\/['"]\s*\+\s*(window\.location\.host|location\.host)/g,
      "new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + $1"
    );

    // 5. Mag-inject ng automatic Network Interceptor sa lahat ng HTML files
    // Sasaluin nito ang kahit anong natitirang tawag sa :3300 o maling ws:// sa runtime
    if (filePath.endsWith('.html') && !content.includes('/* WEB-LINK-INTERCEPTOR */')) {
      const interceptorScript = `
<script>
/* WEB-LINK-INTERCEPTOR */
(function() {
  const cleanUrl = (u) => {
    if (typeof u !== 'string') return u;
    return u
      .replace(/^https?:\\/\\/(localhost|127\\.0\\.0\\.1):3300/i, window.location.origin)
      .replace(/^https?:\\/\\/[^/]+:3300/i, window.location.origin);
  };
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') input = cleanUrl(input);
    return origFetch.call(this, input, init);
  };
  const OrigWS = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    if (typeof url === 'string') {
      const wsProto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      url = url
        .replace(/^wss?:\\/\\/(localhost|127\\.0\\.0\\.1):3300/i, wsProto + window.location.host)
        .replace(/^wss?:\\/\\/[^/]+:3300/i, wsProto + window.location.host);
      if (window.location.protocol === 'https:' && url.startsWith('ws://')) {
        url = 'wss://' + url.slice(5);
      }
    }
    return protocols ? new OrigWS(url, protocols) : new OrigWS(url);
  };
  window.WebSocket.prototype = OrigWS.prototype;
  window.WebSocket.OPEN = OrigWS.OPEN;
  window.WebSocket.CLOSED = OrigWS.CLOSED;
})();
</script>`;
      if (content.includes('<head>')) {
        content = content.replace('<head>', '<head>' + interceptorScript);
      } else {
        content = interceptorScript + content;
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Na-update at nalinis: ${relPath}`);
  }
}

console.log('\n🎉 Tapos na! Pure Web-Ready na ang buong project mo.');
console.log('👉 Pwede mo na itong i-commit at i-push sa GitHub para mag-deploy sa Render.');