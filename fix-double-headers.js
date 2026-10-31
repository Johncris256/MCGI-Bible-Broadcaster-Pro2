const fs = require('fs');
const path = require('path');

const srvPath = path.join(__dirname, 'server.js');
if (!fs.existsSync(srvPath)) {
  console.error('Hindi nahanap ang C:\\bible-html5-app\\server.js');
  process.exit(1);
}

let srv = fs.readFileSync(srvPath, 'utf8');

// 1. Alisin ang lahat ng lumang hooks
srv = srv.replace(/\/\/ === UNIVERSAL PILOT LOCK & RELAY HOOK START ===[\s\S]*?\/\/ === UNIVERSAL PILOT LOCK & RELAY HOOK END ===/g, '');
srv = srv.replace(/\/\/ === LAN HUB & TERMINAL LOGGER START ===[\s\S]*?\/\/ === LAN HUB & TERMINAL LOGGER END ===/g, '');

// 2. Alisin/I-silence ang lumang "BIBLE PROJECTION ISOLATED SYSTEM READY" console logs para hindi doble
srv = srv.replace(/console\.log\([^\n]*BIBLE PROJECTION ISOLATED SYSTEM READY[^\n]*\);?/g, '');
srv = srv.replace(/console\.log\([^\n]*Control Room \(PC\):[^\n]*\);?/g, '');
srv = srv.replace(/console\.log\([^\n]*Output Screen:[^\n]*\);?/g, '');
srv = srv.replace(/console\.log\([^\n]*Pastor Stage Panel:[^\n]*\);?/g, '');
srv = srv.replace(/console\.log\(['"`]={20,}['"`]\);?/g, '');

// 3. I-update ang portal-home.html at index.html para sa tamang /highlighter/ link
['portal-home.html', 'index.html', path.join('src', 'portal-home.html'), path.join('src', 'index.html')].forEach(rel => {
  const p = path.join(__dirname, rel);
  if (fs.existsSync(p)) {
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/\/operator\/highlighter\.html/g, '/highlighter/');
    fs.writeFileSync(p, html, 'utf8');
  }
});

// 4. Gumawa ng malinis na Wrapper sa http.createServer(listener) na HINDI nagdo-double send ng headers
const cleanSingleHook = `// === UNIVERSAL PILOT LOCK & RELAY HOOK START ===
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
    console.log('\\n====================================================================');
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
    console.log('====================================================================\\n');
  }, 300);
})();
// === UNIVERSAL PILOT LOCK & RELAY HOOK END ===`;

srv = cleanSingleHook + '\n' + srv;
fs.writeFileSync(srvPath, srv, 'utf8');
console.log('✅ Na-fix na ang ERR_HTTP_HEADERS_SENT at naalis na ang duplicate banner sa server.js!');
