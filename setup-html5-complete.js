const fs = require('fs');
const path = require('path');

const targetDir = path.join('C:', 'bible-html5-app');
const opDir = path.join(targetDir, 'operator');
const outDir = path.join(targetDir, 'output');
const dataDir = path.join(targetDir, 'data');
const transDir = path.join(dataDir, 'translations');

[targetDir, opDir, outDir, dataDir, transDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 1. KOPYAHIN ANG TRANSLATIONS MULA SA BIBLE-NDI-APP
const sourceTransDir = path.join('C:', 'bible-ndi-app', 'data', 'translations');
let manifestList = [];

if (fs.existsSync(sourceTransDir)) {
  const files = fs.readdirSync(sourceTransDir).filter(f => f.endsWith('.json'));
  files.forEach(f => {
    fs.copyFileSync(path.join(sourceTransDir, f), path.join(transDir, f));
    const id = f.replace('.json', '');
    let name = id.toUpperCase();
    if (id === '001') name = 'ANG DATING BIBLIA';
    manifestList.push({ id, name, file: f });
  });
}

// Fallback kung sakaling walang nahanap na files
if (manifestList.length === 0) {
  const defaultGenesis = {
    "GENESIS": {
      "1": {
        "1": "Nang pasimula ay nilikha ng Dios ang langit at ang lupa.",
        "2": "At ang lupa ay walang anyo at walang laman; at ang kadiliman ay sumasa ibabaw ng kalaliman.",
        "3": "At sinabi ng Dios, Magkaroon ng liwanag; at nagkaroon ng liwanag."
      }
    }
  };
  fs.writeFileSync(path.join(transDir, '001.json'), JSON.stringify(defaultGenesis, null, 2), 'utf8');
  manifestList.push({ id: '001', name: 'ANG DATING BIBLIA', file: '001.json' });
}

manifestList.sort((a, b) => (a.name === 'ANG DATING BIBLIA' ? -1 : 1));
fs.writeFileSync(path.join(dataDir, 'translations-manifest.json'), JSON.stringify(manifestList, null, 2), 'utf8');

// ============================================================================
// 2. SERVER.JS (LIGHTWEIGHT HTTP + WEBSOCKET BROADCASTER - ZERO ELECTRON)
// ============================================================================
const serverJsContent = `const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 5000;
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

  // API para sa manifest
  if (reqPath === '/api/translations') {
    const manifestPath = path.join(__dirname, 'data', 'translations-manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(fs.readFileSync(manifestPath));
    }
  }

  const filePath = path.join(__dirname, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return res.end(fs.readFileSync(filePath));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Ipadala agad ang pinakahuling state pagka-connect ng client (OBS man o browser)
  if (lastLiveState) {
    try { ws.send(JSON.stringify(lastLiveState)); } catch(e) {}
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      lastLiveState = data;
      // I-broadcast sa lahat ng konektadong screens (kasama ang OBS)
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(JSON.stringify(data));
        }
      });
    } catch(err) {
      console.error('WS Error:', err);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================================');
  console.log('✓ BIBLE APP HTML5 SERVER GUMAGANA NA!');
  console.log('  Operator Panel : http://localhost:' + PORT + '/operator/index.html');
  console.log('  Output Screen  : http://localhost:' + PORT + '/output/output.html');
  console.log('========================================================');
});
`;
fs.writeFileSync(path.join(targetDir, 'server.js'), serverJsContent, 'utf8');

// ============================================================================
// 3. I-UPDATE ANG OUTPUT.JS (SUPPORTS WEBSOCKET + BROADCASTCHANNEL)
// ============================================================================
const outJsPath = path.join(outDir, 'output.js');
let outJs = fs.readFileSync(outJsPath, 'utf8');

const outputSyncLogic = `
// WEBSOCKET REAL-TIME SYNC ENGINE (OBS + ALL BROWSERS)
function connectLiveSocket() {
  const wsHost = window.location.host || 'localhost:5000';
  const ws = new WebSocket('ws://' + wsHost);

  ws.onopen = () => console.log('✓ Connected to Bible Live Broadcast Feed');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      renderOutputState(data);
    } catch(e) {}
  };
  ws.onclose = () => setTimeout(connectLiveSocket, 1500);
  ws.onerror = () => ws.close();
}

connectLiveSocket();

// Fallback: BroadcastChannel at LocalStorage
try {
  const bc = new BroadcastChannel('bible_live_stream');
  bc.onmessage = (e) => { if (e.data) renderOutputState(e.data); };
} catch(e) {}

window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch(err) {}
  }
});
`;

// I-inject sa dulo ng output.js
if (!outJs.includes('connectLiveSocket')) {
  outJs += '\n' + outputSyncLogic;
  fs.writeFileSync(outJsPath, outJs, 'utf8');
}

// ============================================================================
// 4. I-UPDATE ANG OPERATOR.JS (DIRECT WEBSOCKET BROADCAST SA LAHAT NG BUTTONS)
// ============================================================================
const opJsPath = path.join(opDir, 'operator.js');
let opJs = fs.readFileSync(opJsPath, 'utf8');

// Ayusin ang syncState para magpadala sa WebSocket
opJs = opJs.replace(
  /function syncState\(forcePreviewAnim\) \{[\s\S]*?localStorage\.setItem\('bible_live_timestamp', String\(Date\.now\(\)\)\);\s*\}/,
  `function syncState(forcePreviewAnim) {
  const transparentToggle = document.getElementById('transparentToggle');
  const bgColor = document.getElementById('bgColor');
  let bgToSend = (transparentToggle && transparentToggle.checked) ? 'transparent' : (bgColor ? bgColor.value : '#004cff');
  if (currentCustomBg && transparentToggle && !transparentToggle.checked) bgToSend = currentCustomBg;

  const serializedSlots = slots.map(s => ({
    reference: s.reference || 'GENESIS 1:1',
    version: s.versionName || 'ANG DATING BIBLIA',
    words: s.words || [],
    hasSpaces: s.hasSpaces !== false,
    highlighted: Array.from(s.highlighted)
  }));

  const payload = {
    displayMode: outputDisplayMode,
    slots: serializedSlots,
    reference: serializedSlots[0].reference,
    version: serializedSlots[0].version,
    words: serializedSlots[0].words,
    hasSpaces: serializedSlots[0].hasSpaces,
    highlighted: serializedSlots[0].highlighted,
    bg: bgToSend,
    fonts: window.customOutputFonts,
    animation: window.customAnimSettings,
    navDirection: window.lastNavDirection || 'next',
    forcePreviewAnim: Boolean(forcePreviewAnim),
    settings: {
      topGap: (window.customLayoutSettings.topGap || 18) + 'px',
      boxPadding: window.customLayoutSettings.boxPadding || 40,
      screenMargin: window.customLayoutSettings.screenMargin || 55,
      maxFontSize: window.customLayoutSettings.maxFontSize || 46,
      hideBoxBg: window.customLayoutSettings.hideBoxBg || false
    }
  };

  // 1. Ipadala sa WebSocket Server (OBS & Web Clients)
  if (window.liveOperatorSocket && window.liveOperatorSocket.readyState === 1) {
    try { window.liveOperatorSocket.send(JSON.stringify(payload)); } catch(e) {}
  }

  // 2. BroadcastChannel
  try {
    const bc = new BroadcastChannel('bible_live_stream');
    bc.postMessage(payload);
  } catch(e) {}

  // 3. LocalStorage
  try {
    localStorage.setItem('bible_live_payload', JSON.stringify(payload));
    localStorage.setItem('bible_live_timestamp', String(Date.now()));
  } catch(e) {}
}`
);

// Idagdag ang WebSocket connection sa operator.js
const opWsInit = `
function initOperatorSocket() {
  const wsHost = window.location.host || 'localhost:5000';
  window.liveOperatorSocket = new WebSocket('ws://' + wsHost);
  window.liveOperatorSocket.onopen = () => {
    console.log('✓ Operator connected to WebSocket Server');
    syncState();
  };
  window.liveOperatorSocket.onclose = () => setTimeout(initOperatorSocket, 1500);
}
initOperatorSocket();
`;

if (!opJs.includes('initOperatorSocket')) {
  opJs += '\n' + opWsInit;
}

fs.writeFileSync(opJsPath, opJs, 'utf8');

// ============================================================================
// 5. I-UPDATE ANG PACKAGE.JSON PARA SA WS DEPENDENCY
// ============================================================================
const pkgJsonPath = path.join(targetDir, 'package.json');
const pkgData = {
  name: "bible-html5-app",
  version: "1.0.0",
  main: "server.js",
  scripts: {
    "start": "node server.js"
  },
  dependencies: {
    "ws": "^8.18.0"
  }
};
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgData, null, 2), 'utf8');

console.log('========================================================');
console.log('✓ 100% SETUP COMPLETED! May sarili nang WebSocket Server ang HTML5 version!');
console.log('========================================================');