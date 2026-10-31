// === [START] LIVE SERVER MEMORY SESSION ===
const SESSION_CACHE_FILE = require('path').join(process.env.BIBLE_BROADCAST_DATA_DIR || __dirname, 'live-session-cache.json');
let MASTER_SESSION = { localStorageBackup: {}, updatedAt: 0 };
try {
  if (require('fs').existsSync(SESSION_CACHE_FILE)) {
    const loaded = JSON.parse(require('fs').readFileSync(SESSION_CACHE_FILE, 'utf8'));
    if (loaded && typeof loaded === 'object') MASTER_SESSION = Object.assign(MASTER_SESSION, loaded);
  }
} catch (e) {}
function saveMasterSession() {
  try { require('fs').writeFileSync(SESSION_CACHE_FILE, JSON.stringify(MASTER_SESSION), 'utf8'); } catch (e) {}
}

const __liveMemoryClients = new Set();
const __origCreateServer = require('http').createServer;
require('http').createServer = function(requestListener) {
  return __origCreateServer.call(this, function(req, res) {
    const parsed = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    if (req.method === 'GET' && parsed.pathname === '/api/live-session-stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write('data: ' + JSON.stringify({ type: 'init-storage', storage: MASTER_SESSION.localStorageBackup || {} }) + '\n\n');
      __liveMemoryClients.add(res);
      req.on('close', () => __liveMemoryClients.delete(res));
      return;
    }
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
        req.on('data', c => { body += c; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            if (!MASTER_SESSION.localStorageBackup) MASTER_SESSION.localStorageBackup = {};
            if (data.batch && typeof data.batch === 'object') {
              Object.assign(MASTER_SESSION.localStorageBackup, data.batch);
              MASTER_SESSION.updatedAt = Date.now();
              saveMasterSession();
              const msg = 'data: ' + JSON.stringify({ type: 'storage-sync', clientId: data.clientId || null, batch: data.batch }) + '\n\n';
              __liveMemoryClients.forEach(c => { try { c.write(msg); } catch (e) {} });
            } else if (data.key) {
              MASTER_SESSION.localStorageBackup[data.key] = data.value;
              MASTER_SESSION.updatedAt = Date.now();
              saveMasterSession();
              const msg = 'data: ' + JSON.stringify({ type: 'storage-sync', clientId: data.clientId || null, key: data.key, value: data.value }) + '\n\n';
              __liveMemoryClients.forEach(c => { try { c.write(msg); } catch (e) {} });
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
// === [END] LIVE SERVER MEMORY SESSION ===

// === UNIVERSAL PILOT LOCK & RELAY HOOK START ===
(function installUniversalPilotHook() {
  if (global.__pilotHookInstalled) return;
  global.__pilotHookInstalled = true;

  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  global.__activeSlotPilots = { 0: null, 1: null, 2: null, 3: null };
  global.__slaveActionQueue = [];
  global.__slaveActionSeq = 1;
  global.__latestOperatorState = {};

  function findPortalFile() {
    const candidates = [
      path.join(__dirname, 'portal-home.html'),
      path.join(__dirname, 'src', 'portal-home.html'),
      path.join(__dirname, 'public', 'portal-home.html')
    ];
    return candidates.find(c => fs.existsSync(c)) || candidates[0];
  }

  function cleanupExpiredPilots() {
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      if (global.__activeSlotPilots[i] && (now - global.__activeSlotPilots[i].lastSeen > 10000)) {
        global.__activeSlotPilots[i] = null;
      }
    }
  }
  setInterval(cleanupExpiredPilots, 2500);

  function processSlavePacket(pkt, broadcastFn) {
    cleanupExpiredPilots();
    const sIdx = parseInt(pkt.slotIndex, 10);
    const now = Date.now();

    if (!isNaN(sIdx) && sIdx >= 0 && sIdx <= 3 && pkt.operatorName) {
      const existing = global.__activeSlotPilots[sIdx];
      if (pkt.action === 'LEAVE') {
        if (existing && (existing.clientId === pkt.clientId || existing.name === pkt.operatorName)) {
          global.__activeSlotPilots[sIdx] = null;
        }
      } else {
        if (existing && existing.clientId && pkt.clientId && existing.clientId !== pkt.clientId && (now - existing.lastSeen < 10000)) {
          if (broadcastFn) {
            broadcastFn(JSON.stringify({
              type: 'JOIN_REJECTED',
              clientId: pkt.clientId,
              slotIndex: sIdx,
              occupiedBy: existing.name,
              reason: '🔒 Ang Slot ' + (sIdx + 1) + ' ay kasalukuyang hawak ni ' + existing.name + '!'
            }));
          }
          return { locked: true, occupiedBy: existing.name };
        }

        for (let i = 0; i < 4; i++) {
          if (i !== sIdx && global.__activeSlotPilots[i] && global.__activeSlotPilots[i].clientId === pkt.clientId) {
            global.__activeSlotPilots[i] = null;
          }
        }

        global.__activeSlotPilots[sIdx] = {
          name: pkt.operatorName,
          clientId: pkt.clientId || ('c_' + pkt.operatorName),
          lastSeen: now
        };
      }
    }

    if (pkt.action && pkt.action !== 'HEARTBEAT') {
      pkt.actionId = ++global.__slaveActionSeq;
      global.__slaveActionQueue.push(pkt);
      if (global.__slaveActionQueue.length > 80) global.__slaveActionQueue.shift();
    }

    if (broadcastFn) {
      broadcastFn(JSON.stringify({
        type: 'PILOT_LOCK_STATE',
        pilots: global.__activeSlotPilots,
        packet: (pkt.action && pkt.action !== 'HEARTBEAT') ? pkt : null
      }));
    }

    return { locked: false, pilots: global.__activeSlotPilots };
  }

  function customRouteInterceptor(req, res) {
    const urlClean = (req.url || '').split('?')[0];

    if (req.method === 'GET' && (urlClean === '/' || urlClean === '/home' || urlClean === '/index.html')) {
      const pFile = findPortalFile();
      if (fs.existsSync(pFile)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(pFile, 'utf8'));
        return true;
      }
    }

    
    if (req.method === 'GET' && urlClean === '/api/translations') {
      const tDir = require('path').join(__dirname, 'data', 'translations');
      let list = [];
      if (tDir && fs.existsSync(tDir)) {
        const files = fs.readdirSync(tDir).filter(f => f.endsWith('.json'));
        list = files.map(f => {
          const id = path.basename(f, '.json');
          const metaPath = path.join(tDir, id + '.meta');
          let name = id;
          if (fs.existsSync(metaPath)) {
            try {
              const rawMeta = fs.readFileSync(metaPath, 'utf8').trim();
              if (rawMeta.startsWith('{')) {
                const parsed = JSON.parse(rawMeta);
                name = parsed.name || parsed.title || id;
              } else {
                name = rawMeta.split(/\r?\n/)[0].trim() || id;
              }
            } catch (e) {}
          }
          if (id === '001' && (name === '001' || !name)) name = 'ANG DATING BIBLIA';
          return { id, name };
        });
      }
      if (list.length === 0) list = [{ id: '001', name: 'ANG DATING BIBLIA' }];
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(list));
      return true;
    }

    if (req.method === 'GET' && urlClean.includes('/translations/') && urlClean.endsWith('.json')) {
      const fileName = path.basename(urlClean);
      const tDir = require('path').join(__dirname, 'data', 'translations');
      if (tDir && fs.existsSync(path.join(tDir, fileName))) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(fs.readFileSync(path.join(tDir, fileName)));
        return true;
      }
    }

    if (req.method === 'GET' && urlClean === '/api/pilots') {
      cleanupExpiredPilots();
      const urlObj = new URL(req.url, 'http://localhost');
      const since = parseInt(urlObj.searchParams.get('since'), 10) || 0;
      const pending = global.__slaveActionQueue.filter(c => c.actionId > since);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        pilots: global.__activeSlotPilots,
        queue: pending,
        state: global.__latestOperatorState
      }));
      return true;
    }

    if (req.method === 'POST' && urlClean === '/api/slave-action') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const pkt = JSON.parse(body || '{}');
          if (pkt.type === 'OPERATOR_STATE_SYNC') {
            global.__latestOperatorState = pkt.state || {};
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          const result = processSlavePacket(pkt, global.__wsBroadcastAll);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: true, ...result }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
      });
      return true;
    }

    return false;
  }

  // Wrap http.createServer so our custom routes stop before calling original listener (NO DOUBLE HEADERS!)
  const origCreateServer = http.createServer;
  http.createServer = function(options, requestListener) {
    if (typeof options === 'function') {
      requestListener = options;
      options = undefined;
    }
    const wrappedListener = function(req, res) {
      if (customRouteInterceptor(req, res)) return;
      if (typeof requestListener === 'function') {
        return requestListener.call(this, req, res);
      }
    };
    return options ? origCreateServer.call(this, options, wrappedListener) : origCreateServer.call(this, wrappedListener);
  };

  try {
    const wsModule = require('ws');
    const OrigWSS = wsModule.Server || wsModule.WebSocketServer;
    if (OrigWSS && !OrigWSS.__hooked) {
      const origEmit = OrigWSS.prototype.emit;
      OrigWSS.prototype.emit = function(event, ...args) {
        if (event === 'connection') {
          const wssInstance = this;
          const clientSocket = args[0];
          global.__wsBroadcastAll = (msgStr) => {
            if (!wssInstance.clients) return;
            wssInstance.clients.forEach(c => {
              if (c.readyState === 1) c.send(msgStr);
            });
          };
          clientSocket.on('message', (raw) => {
            try {
              const str = raw.toString();
              const parsed = JSON.parse(str);
              if (parsed && parsed.type === 'SLAVE_SLOT_PACKET') {
                processSlavePacket(parsed, global.__wsBroadcastAll);
              } else if (parsed && (parsed.slots || parsed.words || parsed.reference)) {
                global.__latestOperatorState = parsed;
              }
            } catch (e) {}
          });
        }
        return origEmit.apply(this, [event, ...args]);
      };
      OrigWSS.__hooked = true;
    }
  } catch (e) {}

  setTimeout(() => {
    const nets = os.networkInterfaces();
    let ip = '127.0.0.1';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) ip = net.address;
      }
    }
    const port = 3300;
    console.log('\n====================================================================');
    console.log('🌐 BIBLE BROADCAST SYSTEM — LAN IP ADDRESSES (COPY & PASTE):');
    console.log('--------------------------------------------------------------------');
    console.log('🏠 Main Home Page   : http://' + ip + ':' + port + '/');
    console.log('🎛️ Main Operator    : http://' + ip + ':' + port + '/operator/');
    console.log('🕹️ Slot 1 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=1');
    console.log('🕹️ Slot 2 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=2');
    console.log('🕹️ Slot 3 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=3');
    console.log('🕹️ Slot 4 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=4');
    console.log('🖍️ Highlighter      : http://' + ip + ':' + port + '/highlighter/');
    console.log('📺 Live Output Feed : http://' + ip + ':' + port + '/output/output.html');
    console.log('====================================================================\n');
  }, 300);
})();
// === UNIVERSAL PILOT LOCK & RELAY HOOK END ===



const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3300;
const BASE_DIR = __dirname;
const crypto = require('crypto');
const BG_UPLOAD_DIR = path.join(process.env.BIBLE_BROADCAST_DATA_DIR || BASE_DIR, 'uploads', 'backgrounds');
const MAX_BG_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per background image

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
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

// DEDICATED SEPARATE CLIENT LISTS
let outputClients = [];
let pastorFeedClients = [];
let operatorProxyClients = [];

let latestOutputMessages = {};
let latestPastorFeed = null;

function detectBackgroundImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return { ext: 'png', type: 'image/png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  const gif = buffer.toString('ascii', 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return { ext: 'gif', type: 'image/gif' };
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return { ext: 'bmp', type: 'image/bmp' };
  return null;
}

function uploadBackground(req, res) {
  const chunks = [];
  let totalBytes = 0;
  let tooLarge = false;
  req.on('data', chunk => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BG_UPLOAD_BYTES) {
      tooLarge = true;
      chunks.length = 0;
      return;
    }
    if (!tooLarge) chunks.push(chunk);
  });
  req.on('end', () => {
    if (tooLarge) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, error: 'Image exceeds the 20 MB upload limit.' }));
    }
    const imageBuffer = Buffer.concat(chunks);
    const detected = detectBackgroundImage(imageBuffer);
    if (!detected) {
      res.writeHead(415, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, error: 'Unsupported image. Use PNG, JPG, GIF, WebP, or BMP.' }));
    }
    const filename = crypto.randomBytes(16).toString('hex') + '.' + detected.ext;
    fs.mkdir(BG_UPLOAD_DIR, { recursive: true }, err => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ ok: false, error: 'Unable to create the background upload folder.' }));
      }
      fs.writeFile(path.join(BG_UPLOAD_DIR, filename), imageBuffer, writeErr => {
        if (writeErr) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(JSON.stringify({ ok: false, error: 'Unable to save the uploaded background.' }));
        }
        const imageUrl = '/uploads/backgrounds/' + filename;
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, url: imageUrl, contentType: detected.type, size: imageBuffer.length }));
      });
    });
  });
  req.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ ok: false, error: 'Background upload request was interrupted.' }));
    }
  });
}

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

  // Store background files on the LAN server instead of embedding large Base64
  // data URLs inside live broadcast messages (more compatible with vMix CEF).
  if (cleanUrl === '/api/upload-background' && req.method === 'POST') {
    return uploadBackground(req, res);
  }

  // Only serve generated, random-name background files from the upload folder.
  const bgMatch = cleanUrl.match(/^\/uploads\/backgrounds\/([a-f0-9]{32})\.(jpg|png|gif|webp|bmp)$/i);
  if (req.method === 'GET' && bgMatch) {
    const bgPath = path.join(BG_UPLOAD_DIR, bgMatch[1] + '.' + bgMatch[2].toLowerCase());
    return fs.readFile(bgPath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end('Background not found');
      }
      const ext = path.extname(bgPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': content.length,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin'
      });
      res.end(content);
    });
  }

  // ==================== CHANNEL 1: OUTPUT STREAM (EXCLUSIVELY FOR OUTPUT.HTML) ====================
  if (cleanUrl === '/api/output-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    Object.values(latestOutputMessages).forEach(m => res.write('data: ' + JSON.stringify(m) + '\n\n'));
    outputClients.push(res);
    req.on('close', () => { outputClients = outputClients.filter(c => c !== res); });
    return;
  }

  // Operator broadcasts official output projection commands
  if (cleanUrl === '/api/output-broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const k = data.type || ('slot_' + (data.slotIndex || 0));
        latestOutputMessages[k] = data;
        const packet = 'data: ' + JSON.stringify(data) + '\n\n';
        outputClients.forEach(c => c.write(packet));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ==================== CHANNEL 2: PASTOR FEED (OPERATOR -> TABLET) ====================
  if (cleanUrl === '/api/pastor-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    if (latestPastorFeed) {
      res.write('data: ' + JSON.stringify(latestPastorFeed) + '\n\n');
    }
    pastorFeedClients.push(res);
    req.on('close', () => { pastorFeedClients = pastorFeedClients.filter(c => c !== res); });
    return;
  }

  // Operator pushes verse text & layout to Pastor's tablet
  if (cleanUrl === '/api/pastor-feed' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        latestPastorFeed = data;
        const packet = 'data: ' + JSON.stringify(data) + '\n\n';
        pastorFeedClients.forEach(c => c.write(packet));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ==================== CHANNEL 3: PASTOR TAP PROXY (TABLET -> OPERATOR) ====================
  if (cleanUrl === '/api/operator-proxy-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    operatorProxyClients.push(res);
    req.on('close', () => { operatorProxyClients = operatorProxyClients.filter(c => c !== res); });
    return;
  }

  // Pastor taps word on tablet -> forwards tap to Operator to simulate click
  if (cleanUrl === '/api/pastor-tap' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const packet = 'data: ' + JSON.stringify(data) + '\n\n';
        operatorProxyClients.forEach(c => c.write(packet));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // STATIC FILE SERVING
  if (cleanUrl === '/') cleanUrl = '/operator/index.html';
  if (cleanUrl === '/highlighter' || cleanUrl === '/highlighter/') cleanUrl = '/highlighter/index.html';

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

function startServer(port = Number(PORT), host = process.env.HOST || '0.0.0.0') {
  return new Promise((resolve, reject) => {
    if (server.listening) return resolve(server);
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(server);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function stopServer() {
  return new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    for (const response of [...__liveMemoryClients]) {
      try { response.end(); } catch (error) {}
    }
    __liveMemoryClients.clear();
    for (const clients of [outputClients, pastorFeedClients, operatorProxyClients]) {
      for (const response of clients) {
        try { response.end(); } catch (error) {}
      }
      clients.length = 0;
    }
    server.close((error) => error ? reject(error) : resolve());
  });
}

if (require.main === module) {
  startServer().then(() => {
    console.log(`Local: http://localhost:${PORT}/`);
  }).catch((error) => {
    console.error('Bible Broadcast server failed to start:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { server, startServer, stopServer, getLocalIP, PORT };