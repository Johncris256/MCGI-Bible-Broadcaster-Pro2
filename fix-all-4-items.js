const fs = require('fs');
const path = require('path');
const os = require('os');

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function findFiles(dir, targetNames, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, targetNames, results);
    } else if (targetNames.includes(entry.name.toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

const opJsFiles = findFiles(__dirname, ['operator.js']);
if (opJsFiles.length === 0) {
  console.error('Hindi nahanap ang operator.js!');
  process.exit(1);
}

const opJsPath = opJsFiles[0];
const operatorDir = path.dirname(opJsPath);
const webRootDir = path.dirname(operatorDir);
const portalFilePath = path.join(webRootDir, 'portal-home.html');

// ============================================================================
// 1. SAVE DEDICATED PORTAL HOME PAGE (portal-home.html & root index.html)
// ============================================================================
const portalHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bible Broadcast System — Main Home Page</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top, #1e293b 0%, #0b111e 70%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .portal-container { max-width: 980px; width: 100%; }
    .portal-header { text-align: center; margin-bottom: 28px; }
    .portal-badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 999px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .portal-title { font-size: 30px; font-weight: 800; margin: 0 0 6px 0; color: #ffffff; }
    .portal-sub { font-size: 14px; color: #94a3b8; margin: 0; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .role-card {
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .role-card:hover {
      transform: translateY(-3px);
      border-color: #38bdf8;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
    .role-card.admin-card {
      border-color: #eab308;
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
    }
    .role-icon { font-size: 28px; margin-bottom: 10px; }
    .role-name { font-size: 18px; font-weight: 800; margin: 0 0 6px 0; color: #f8fafc; }
    .role-desc { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 18px 0; }
    .role-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s;
    }
    .btn-admin { background: #facc15; color: #0f172a; }
    .btn-admin:hover { background: #fde047; }
    .btn-emerald { background: #059669; color: #ffffff; }
    .btn-emerald:hover { background: #047857; }
    .btn-purple { background: #7c3aed; color: #ffffff; }
    .btn-purple:hover { background: #6d28d9; }
    .slot-quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .slot-quick-btn {
      padding: 8px 10px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #38bdf8;
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      text-align: center;
      transition: background 0.15s, border-color 0.15s;
    }
    .slot-quick-btn:hover { background: #334155; border-color: #38bdf8; color: #ffffff; }
    .portal-footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="portal-container">
    <div class="portal-header">
      <div class="portal-badge">LAN Multi-Operator Broadcast Hub</div>
      <h1 class="portal-title">Bible Operator Broadcast System</h1>
      <p class="portal-sub">Piliin ang iyong role o station para mag-connect sa live session</p>
    </div>

    <div class="cards-grid">
      <div class="role-card admin-card">
        <div>
          <div class="role-icon">🎛️</div>
          <h2 class="role-name" style="color:#facc15;">Main Operator (Admin)</h2>
          <p class="role-desc">
            Full 4-Slot Permanent Workspace. Nakikita kung sinong Slot Operators ang nakakonekta, nakakapagpalit ng Display Mode (1/2/3/4), Background, Font, at Highlights.
          </p>
        </div>
        <a href="/operator/index.html" class="role-btn btn-admin">Buksan ang Main Operator ▶</a>
      </div>

      <div class="role-card">
        <div>
          <div class="role-icon">🕹️</div>
          <h2 class="role-name" style="color:#38bdf8;">Slot Operators (1 - 4)</h2>
          <p class="role-desc">
            Slave controller para sa nakatalagang Slot. Mag-log in gamit ang iyong pangalan para mag-pilot ng talata, Next/Back, at Translation nang hindi nagagalaw ang BG o Highlights.
          </p>
        </div>
        <div class="slot-quick-grid">
          <a href="/operator/slotoperator.html?slot=1" class="slot-quick-btn">🕹️ Pilot Slot 1</a>
          <a href="/operator/slotoperator.html?slot=2" class="slot-quick-btn">🕹️ Pilot Slot 2</a>
          <a href="/operator/slotoperator.html?slot=3" class="slot-quick-btn">🕹️ Pilot Slot 3</a>
          <a href="/operator/slotoperator.html?slot=4" class="slot-quick-btn">🕹️ Pilot Slot 4</a>
        </div>
      </div>

      <div class="role-card">
        <div>
          <div class="role-icon">🖍️</div>
          <h2 class="role-name" style="color:#a78bfa;">Highlighter Station</h2>
          <p class="role-desc">
            Dedicated station para sa pag-highlight at pag-clear ng mga salita sa alinmang Slot (1-4) nang real-time habang nagsasalita ang mangangaral.
          </p>
        </div>
        <a href="/operator/highlighter.html" class="role-btn btn-purple">Buksan ang Highlighter ▶</a>
      </div>

      <div class="role-card">
        <div>
          <div class="role-icon">📺</div>
          <h2 class="role-name" style="color:#4ade80;">Live Broadcast Output</h2>
          <p class="role-desc">
            Clean HTML5 Output feed para sa vMix, OBS Browser Source, o Projector Display. Sumusunod nang live sa 1 Full, 2 Split, 3 Split, at 4 Grid modes.
          </p>
        </div>
        <a href="/output/output.html" target="_blank" class="role-btn btn-emerald">Buksan ang Live Output ↗</a>
      </div>
    </div>

    <div class="portal-footer">
      Tip: Maaaring buksan ang link na ito sa iba't ibang laptop, tablet, o phone na nakakonekta sa parehong Local Network (Wi-Fi / LAN).
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(portalFilePath, portalHtml, 'utf8');
fs.writeFileSync(path.join(webRootDir, 'index.html'), portalHtml, 'utf8');
fs.writeFileSync(path.join(__dirname, 'index.html'), portalHtml, 'utf8');

// ============================================================================
// 2. UPDATE slotoperator.html & highlighter.html (Use HTTP + WS Dual Sync & /home link)
// ============================================================================
const slotOpPath = path.join(operatorDir, 'slotoperator.html');
if (fs.existsSync(slotOpPath)) {
  let sHtml = fs.readFileSync(slotOpPath, 'utf8');

  // Fix Home links to point to /home (Main Home Page index.html, NOT /operator/)
  sHtml = sHtml.replace(/href="\/"/g, 'href="/home"');

  // Upgrade sendSlavePacket to send via BOTH WebSocket and HTTP POST /api/slave-action for 100% reliability
  sHtml = sHtml.replace(
    /function sendSlavePacket\(actionPayload\) \{[\s\S]*?\n    \}/,
    `function sendSlavePacket(actionPayload) {
      if (!isLoggedIn) return;
      const packet = {
        type: 'SLAVE_SLOT_PACKET',
        slotIndex: mySlotIdx,
        operatorName: myOperatorName,
        ...actionPayload
      };
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(packet));
      }
      fetch('/api/slave-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet)
      }).catch(() => {});
    }`
  );

  // Also poll /api/state every 1.2s in case WebSocket state hasn't arrived yet
  if (!sHtml.includes('/api/state')) {
    sHtml = sHtml.replace(
      'connectSocket();',
      `connectSocket();
    function applyIncomingState(data) {
      if (!data) return;
      const sourceSlots = data.allSlots || data.slots;
      if (Array.isArray(sourceSlots)) {
        const slotObj = sourceSlots[mySlotIdx];
        if (slotObj) {
          dispRef.textContent = slotObj.reference || 'GENESIS 1:1';
          dispVer.textContent = slotObj.version || 'ANG DATING BIBLIA';
          if (slotObj.transId && transSelect.value !== slotObj.transId) {
            transSelect.value = slotObj.transId;
          }
          const highSet = new Set(slotObj.highlighted || []);
          const words = slotObj.words || [];
          dispBody.innerHTML = words.map((w, i) =>
            highSet.has(i) ? '<span class="slave-word-high">' + w + '</span>' : w
          ).join(slotObj.hasSpaces === false ? '' : ' ');

          const mode = parseInt(data.displayMode, 10) || 1;
          const isLive = mySlotIdx < mode;
          liveStatusBadge.style.background = isLive ? '#ef4444' : '#334155';
          liveStatusBadge.style.color = '#ffffff';
          liveStatusBadge.textContent = isLive ? '● LIVE ON OUTPUT' : '● STAGING MODE';
        }
      }
    }
    setInterval(() => {
      fetch('/api/state').then(r => r.json()).then(applyIncomingState).catch(() => {});
    }, 1000);`
    );
  }

  fs.writeFileSync(slotOpPath, sHtml, 'utf8');
}

const highPath = path.join(operatorDir, 'highlighter.html');
if (fs.existsSync(highPath)) {
  let hHtml = fs.readFileSync(highPath, 'utf8');
  hHtml = hHtml.replace(/href="\/"/g, 'href="/home"');
  hHtml = hHtml.replace(
    /ws\.send\(JSON\.stringify\(\{\s*type:\s*'SLAVE_SLOT_PACKET'([\s\S]*?)\}\)\);/g,
    `{ const pkt = { type: 'SLAVE_SLOT_PACKET'$1 }; if(ws && ws.readyState===1) ws.send(JSON.stringify(pkt)); fetch('/api/slave-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pkt)}).catch(()=>{}); }`
  );
  fs.writeFileSync(highPath, hHtml, 'utf8');
}

// ============================================================================
// 3. REMOVE TOP LAN CONTROLLER ADDRESS BAR FROM OPERATOR HTML & OPERATOR.JS
// ============================================================================
const opHtmlFiles = findFiles(operatorDir, ['index.html', 'operator.html']);
opHtmlFiles.forEach(hFile => {
  let hContent = fs.readFileSync(hFile, 'utf8');
  // Remove any top banner div that contains "LAN Web Controller Address"
  hContent = hContent.replace(/<div[^>]*>[\s\S]*?LAN Web Controller Address:[\s\S]*?<\/div>/gi, '');
  fs.writeFileSync(hFile, hContent, 'utf8');
});

let opJs = fs.readFileSync(opJsPath, 'utf8');

// Replace the Multi-User Slave Hub in operator.js with HTTP + WebSocket polling & top LAN bar remover
opJs = opJs.replace(/\/\/ === MULTI-USER SLAVE HUB START ===[\s\S]*?\/\/ === MULTI-USER SLAVE HUB END ===/g, '');

const upgradedSlaveHub = `
// === MULTI-USER SLAVE HUB START ===
(function initMainOperatorSlaveHub() {
  const connectedPilots = { 0: null, 1: null, 2: null, 3: null };
  let lastProcessedActionId = 0;

  const style = document.createElement('style');
  style.textContent = \`
    /* Itago ang LAN Web Controller Address bar sa pinakataas */
    #lanTopBar, .lan-top-bar, .lan-banner, [id*="lanBanner"], [class*="lan-bar"] {
      display: none !important;
    }
    .pilot-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 6px;
      background: rgba(30, 41, 59, 0.9);
      color: #64748b;
      border: 1px solid #334155;
      transition: all 0.2s ease;
    }
    .pilot-status-pill.connected {
      background: rgba(22, 163, 74, 0.22);
      color: #4ade80;
      border-color: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.35);
    }
    .home-nav-link {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      margin-right: 6px;
    }
    .home-nav-link:hover {
      background: #334155;
      color: #ffffff;
    }
  \`;
  document.head.appendChild(style);

  // Hanapin at alisin ang kahit anong bar sa DOM na may text na "LAN Web Controller Address:"
  function removeLanAddressTopBar() {
    document.querySelectorAll('div, header, section').forEach(el => {
      if (el.children.length <= 6 && el.textContent && el.textContent.includes('LAN Web Controller Address:')) {
        if (!el.classList.contains('workspace-grid') && !el.classList.contains('op-header')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }
  removeLanAddressTopBar();
  setTimeout(removeLanAddressTopBar, 300);
  setTimeout(removeLanAddressTopBar, 1000);

  // Home Portal button sa Row 2 -> papuntang /home
  const row2 = document.querySelector('.op-row-2');
  const existingHome = document.getElementById('mainHomePortalLink');
  if (existingHome) existingHome.href = '/home';
  else if (row2) {
    const homeLink = document.createElement('a');
    homeLink.id = 'mainHomePortalLink';
    homeLink.href = '/home';
    homeLink.target = '_blank';
    homeLink.className = 'home-nav-link';
    homeLink.textContent = '🏠 Home Portal';
    row2.insertBefore(homeLink, row2.firstChild);
  }

  for (let i = 0; i < 4; i++) {
    const leftMeta = document.querySelector(\`.slot-card[data-slot="\${i}"] .slot-left-meta\`);
    if (leftMeta && !document.getElementById(\`slotPilotBadge\${i}\`)) {
      const pill = document.createElement('span');
      pill.id = \`slotPilotBadge\${i}\`;
      pill.className = 'pilot-status-pill';
      pill.textContent = '👤 No Pilot';
      leftMeta.appendChild(pill);
    }
  }

  function renderPilotBadges() {
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      const pill = document.getElementById(\`slotPilotBadge\${i}\`);
      if (!pill) continue;
      const info = connectedPilots[i];
      if (info && (now - info.lastSeen < 12000)) {
        pill.className = 'pilot-status-pill connected';
        pill.textContent = \`👤 Pilot: \${info.name}\`;
        pill.title = \`Slot \${i + 1} is currently piloted by \${info.name}\`;
      } else {
        connectedPilots[i] = null;
        pill.className = 'pilot-status-pill';
        pill.textContent = '👤 No Pilot';
        pill.title = 'Walang nakakonektang Slot Operator sa slot na ito';
      }
    }
  }

  async function executeSlaveCommand(packet) {
    if (!packet) return;
    if (packet.actionId && packet.actionId <= lastProcessedActionId) return;
    if (packet.actionId) lastProcessedActionId = packet.actionId;

    const sIdx = parseInt(packet.slotIndex, 10);
    if (isNaN(sIdx) || sIdx < 0 || sIdx > 3) return;

    if (packet.operatorName) {
      if (packet.action === 'LEAVE') {
        if (connectedPilots[sIdx] && connectedPilots[sIdx].name === packet.operatorName) {
          connectedPilots[sIdx] = null;
        }
      } else {
        connectedPilots[sIdx] = {
          name: packet.operatorName,
          lastSeen: Date.now()
        };
      }
      renderPilotBadges();
    }

    if (packet.action === 'JOIN') {
      syncState();
      return;
    }

    if (packet.action === 'QUERY_VERSE' && packet.query) {
      parseAndLoadVerse(packet.query, sIdx);
    } else if (packet.action === 'NEXT_VERSE') {
      goToNextVerse(sIdx);
    } else if (packet.action === 'PREV_VERSE') {
      goToPrevVerse(sIdx);
    } else if (packet.action === 'CHANGE_TRANS' && packet.transId) {
      await ensureTranslationLoaded(packet.transId);
      slots[sIdx].transId = packet.transId;
      slots[sIdx].versionName = packet.versionName || 'ANG DATING BIBLIA';
      loadSlotVerseData(sIdx, false);
      updateWorkspaceUI();
      syncState();
    } else if (packet.action === 'TOGGLE_HIGHLIGHT' && typeof packet.wordIndex === 'number') {
      const shouldHigh = !slots[sIdx].highlighted.has(packet.wordIndex);
      toggleSlotWord(sIdx, packet.wordIndex, shouldHigh);
    } else if (packet.action === 'CLEAR_HIGHLIGHT') {
      slots[sIdx].highlighted.clear();
      updateSlotVisuals(sIdx);
      syncState();
    } else if (packet.action === 'CLEAR_ALL_HIGHLIGHTS') {
      for (let i = 0; i < 4; i++) {
        slots[i].highlighted.clear();
        updateSlotVisuals(i);
      }
      syncState();
    }
  }

  // Poll /api/pilots every 600ms para kahit anong browser o Electron window ay laging kita ang Pilots & Actions
  async function pollPilotsAndQueue() {
    try {
      let baseUrl = '';
      if (window.location.protocol === 'file:') {
        baseUrl = '';
      }
      const res = await fetch(baseUrl + '/api/pilots?since=' + lastProcessedActionId);
      const data = await res.json();
      if (data && data.pilots) {
        const now = Date.now();
        for (let i = 0; i < 4; i++) {
          const p = data.pilots[i];
          if (p && (now - p.lastSeen < 12000)) {
            connectedPilots[i] = { name: p.name, lastSeen: p.lastSeen };
          } else {
            connectedPilots[i] = null;
          }
        }
        renderPilotBadges();
      }
      if (data && Array.isArray(data.queue)) {
        for (const cmd of data.queue) {
          await executeSlaveCommand(cmd);
        }
      }
    } catch (e) {}
  }

  setInterval(pollPilotsAndQueue, 600);
})();
// === MULTI-USER SLAVE HUB END ===
`;

opJs = opJs.trimEnd() + '\n' + upgradedSlaveHub + '\n';
fs.writeFileSync(opJsPath, opJs, 'utf8');

// ============================================================================
// 4. UPDATE SERVER / MAIN.JS:
//    - Fix `/` and `/home` to serve Main Home Page (portal-home.html) instead of redirecting to /operator/
//    - Add `/api/slave-action`, `/api/pilots`, and `/api/state` endpoints
//    - Print Copy-Pasteable LAN IP Links in Terminal on startup
// ============================================================================
const serverFiles = findFiles(__dirname, ['server.js', 'main.js', 'app.js', 'index.js']).filter(
  f => !f.includes('operator') && !f.includes('output') && !f.includes('node_modules')
);

serverFiles.forEach(srvPath => {
  let srv = fs.readFileSync(srvPath, 'utf8');
  if (!srv.includes('express') && !srv.includes('createServer')) return;

  // A. Fix root redirect `/operator` so `/` opens the Main Home Page index.html
  srv = srv.replace(/res\.redirect\(['"]\/operator\/?['"]\)/g, `res.sendFile(${JSON.stringify(portalFilePath)})`);

  // B. Remove old injected block if present
  srv = srv.replace(/\/\/ === LAN HUB & TERMINAL LOGGER START ===[\s\S]*?\/\/ === LAN HUB & TERMINAL LOGGER END ===/g, '');

  const serverAddon = `
// === LAN HUB & TERMINAL LOGGER START ===
(function attachLanHubAndLogger() {
  const os = require('os');
  const fs = require('fs');
  const path = require('path');

  function getLocalLanIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return '127.0.0.1';
  }

  const activePilots = { 0: null, 1: null, 2: null, 3: null };
  let slaveCommandQueue = [];
  let actionCounter = 1;
  const portalPath = ${JSON.stringify(portalFilePath)};

  if (typeof app !== 'undefined' && app && typeof app.get === 'function') {
    // Make sure JSON body parsing works for /api/slave-action
    const expressRef = require('express');
    app.use(expressRef.json({ limit: '5mb' }));

    // Serve Main Home Page on / and /home and /index.html
    const servePortal = (req, res) => {
      if (fs.existsSync(portalPath)) res.sendFile(portalPath);
      else res.send('Portal file missing');
    };

    // Move our /, /home, /index.html handlers to the front of Express router stack
    app.get('/home', servePortal);
    app.get('/index.html', servePortal);
    app.get('/', servePortal);

    if (app._router && Array.isArray(app._router.stack)) {
      const len = app._router.stack.length;
      const newRoutes = app._router.stack.splice(len - 3, 3);
      app._router.stack.splice(2, 0, ...newRoutes);
    }

    app.post('/api/slave-action', (req, res) => {
      const pkt = req.body || {};
      const sIdx = parseInt(pkt.slotIndex, 10);
      if (!isNaN(sIdx) && sIdx >= 0 && sIdx <= 3 && pkt.operatorName) {
        if (pkt.action === 'LEAVE') {
          if (activePilots[sIdx] && activePilots[sIdx].name === pkt.operatorName) {
            activePilots[sIdx] = null;
          }
        } else {
          activePilots[sIdx] = { name: pkt.operatorName, lastSeen: Date.now() };
        }
      }
      if (pkt.action && pkt.action !== 'HEARTBEAT') {
        pkt.actionId = ++actionCounter;
        slaveCommandQueue.push(pkt);
        if (slaveCommandQueue.length > 60) slaveCommandQueue.shift();
      }
      res.json({ ok: true });
    });

    app.get('/api/pilots', (req, res) => {
      const since = parseInt(req.query.since, 10) || 0;
      const pending = slaveCommandQueue.filter(c => c.actionId > since);
      res.json({ pilots: activePilots, queue: pending });
    });

    app.get('/api/state', (req, res) => {
      res.json((typeof latestState !== 'undefined' && latestState) ? latestState : (global.latestBibleState || {}));
    });
  }

  setTimeout(() => {
    const ip = getLocalLanIp();
    const port = (typeof currentPort !== 'undefined' && currentPort) ? currentPort : 3300;
    console.log('\\n====================================================================');
    console.log('🌐 BIBLE BROADCAST SYSTEM — LAN IP ADDRESSES (COPY & PASTE):');
    console.log('--------------------------------------------------------------------');
    console.log('🏠 Main Home Page   : http://' + ip + ':' + port + '/');
    console.log('🎛️ Main Operator    : http://' + ip + ':' + port + '/operator/index.html');
    console.log('🕹️ Slot 1 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=1');
    console.log('🕹️ Slot 2 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=2');
    console.log('🕹️ Slot 3 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=3');
    console.log('🕹️ Slot 4 Operator  : http://' + ip + ':' + port + '/operator/slotoperator.html?slot=4');
    console.log('🖍️ Highlighter      : http://' + ip + ':' + port + '/operator/highlighter.html');
    console.log('📺 Live Output Feed : http://' + ip + ':' + port + '/output/output.html');
    console.log('====================================================================\\n');
  }, 800);
})();
// === LAN HUB & TERMINAL LOGGER END ===
`;

  srv = srv.trimEnd() + '\n' + serverAddon + '\n';
  fs.writeFileSync(srvPath, srv, 'utf8');
  console.log('Updated Server File:', srvPath);
});

const lanIp = getLanIp();
console.log('\n====================================================================');
console.log('✅ ALL 4 FIXES APPLIED! NARITO ANG IYONG LAN IP LINKS:');
console.log('🏠 Main Home Page   : http://' + lanIp + ':3300/');
console.log('🎛️ Main Operator    : http://' + lanIp + ':3300/operator/index.html');
console.log('🕹️ Slot 1 Operator  : http://' + lanIp + ':3300/operator/slotoperator.html?slot=1');
console.log('📺 Live Output Feed : http://' + lanIp + ':3300/output/output.html');
console.log('====================================================================\n');
