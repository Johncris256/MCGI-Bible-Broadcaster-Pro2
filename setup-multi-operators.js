const fs = require('fs');
const path = require('path');

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

// Hanapin kung saan nakalagay ang operator.js at output.html para malaman ang web root directory
const opJsFiles = findFiles(__dirname, ['operator.js']);
if (opJsFiles.length === 0) {
  console.error('Hindi nahanap ang operator.js! Siguraduhing nasa C:\\bible-html5-app ka.');
  process.exit(1);
}

const opJsPath = opJsFiles[0];
const operatorDir = path.dirname(opJsPath);
const webRootDir = path.dirname(operatorDir); // Karaniwang src/ o public/ o root

console.log('Detected Operator Dir:', operatorDir);
console.log('Detected Web Root Dir:', webRootDir);

// ============================================================================
// 1. CREATE MAIN HOME PORTAL (index.html sa Web Root)
// ============================================================================
const portalHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bible Broadcast System — Main Launchpad</title>
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
    .portal-container {
      max-width: 980px;
      width: 100%;
    }
    .portal-header {
      text-align: center;
      margin-bottom: 28px;
    }
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
    .portal-title {
      font-size: 30px;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #ffffff;
    }
    .portal-sub {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }
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
    .role-icon {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .role-name {
      font-size: 18px;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #f8fafc;
    }
    .role-desc {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 18px 0;
    }
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
    .btn-admin {
      background: #facc15;
      color: #0f172a;
    }
    .btn-admin:hover { background: #fde047; }
    .btn-blue {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-blue:hover { background: #1d4ed8; }
    .btn-emerald {
      background: #059669;
      color: #ffffff;
    }
    .btn-emerald:hover { background: #047857; }
    .btn-purple {
      background: #7c3aed;
      color: #ffffff;
    }
    .btn-purple:hover { background: #6d28d9; }

    .slot-quick-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
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
    .slot-quick-btn:hover {
      background: #334155;
      border-color: #38bdf8;
      color: #ffffff;
    }
    .portal-footer {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      margin-top: 12px;
    }
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
      <!-- 1. MAIN OPERATOR (ADMIN) -->
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

      <!-- 2. SLOT OPERATORS (1, 2, 3, 4 SLAVES) -->
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

      <!-- 3. HIGHLIGHTER STATION -->
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

      <!-- 4. LIVE OUTPUT STREAM -->
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
</html>
`;

fs.writeFileSync(path.join(webRootDir, 'index.html'), portalHtml, 'utf8');
console.log('Created Main Home Portal:', path.join(webRootDir, 'index.html'));

// ============================================================================
// 2. CREATE SLOT OPERATOR SLAVE PAGE (operator/slotoperator.html)
// ============================================================================
const slotOperatorHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slot Operator (Slave Controller)</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      height: 100vh;
      background: #0b111e;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Login Modal Gate */
    #loginGate {
      position: fixed;
      inset: 0;
      background: rgba(7, 12, 24, 0.96);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-box {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 26px 28px;
      width: 420px;
      max-width: 100%;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    }
    .login-title {
      font-size: 20px;
      font-weight: 800;
      color: #facc15;
      margin: 0 0 6px 0;
    }
    .login-sub {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 20px 0;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-input, .form-select {
      width: 100%;
      padding: 10px 12px;
      background: #1e293b;
      border: 1.5px solid #334155;
      border-radius: 8px;
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      outline: none;
    }
    .form-input:focus, .form-select:focus {
      border-color: #38bdf8;
    }
    .login-btn {
      width: 100%;
      padding: 11px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      margin-top: 6px;
    }
    .login-btn:hover { background: #1d4ed8; }

    /* Top Bar */
    .slave-header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .slave-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .slot-pill {
      background: #2563eb;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      padding: 5px 12px;
      border-radius: 6px;
      letter-spacing: 0.4px;
    }
    .operator-pill {
      background: rgba(74, 222, 128, 0.14);
      border: 1px solid rgba(74, 222, 128, 0.4);
      color: #4ade80;
      font-size: 12.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .slave-notice {
      font-size: 11.5px;
      color: #94a3b8;
      background: #1e293b;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #334155;
    }

    /* Controls Bar */
    .slave-controls {
      background: #141c2b;
      border-bottom: 1px solid #1e293b;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    #verseInput {
      background: #1e293b;
      border: 2px solid #38bdf8;
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
      width: 240px;
      outline: none;
    }
    .ctrl-btn {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .ctrl-btn:hover {
      background: #334155;
      border-color: #475569;
    }
    .ctrl-btn.primary {
      background: #2563eb;
      border-color: #3b82f6;
    }
    #transSelect {
      background: #1e293b;
      color: #facc15;
      border: 1px solid #334155;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      min-width: 280px;
      outline: none;
    }

    /* Verse Read-Only Display Area */
    .slave-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      overflow: hidden;
    }
    .slave-card {
      flex: 1;
      background: #0d1322;
      border: 2px solid #334155;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .slave-card-header {
      padding: 12px 18px;
      background: rgba(15, 23, 42, 0.85);
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .slave-ref-title {
      font-size: 20px;
      font-weight: 800;
      color: #facc15;
    }
    .slave-ver-sub {
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
    }
    .slave-verse-body {
      flex: 1;
      padding: 32px;
      font-size: 28px;
      line-height: 1.65;
      text-align: center;
      color: #e2e8f0;
      overflow-y: auto;
      user-select: none;
    }
    .slave-word-high {
      background: rgba(250, 204, 21, 0.35);
      color: #fde047;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .slave-footer {
      padding: 8px 18px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      background: #0b111e;
      border-top: 1px solid #1e293b;
    }
  </style>
</head>
<body>
  <!-- LOGIN GATE MODAL -->
  <div id="loginGate">
    <form class="login-box" id="loginForm">
      <h2 class="login-title">🕹️ Slot Operator Login</h2>
      <p class="login-sub">Ilagay ang iyong pangalan at piliin ang Slot na iyong ipi-pilot.</p>

      <div class="form-group">
        <label class="form-label">Iyong Pangalan (Operator Name):</label>
        <input type="text" id="opNameInput" class="form-input" placeholder="Hal. Bro. Dan / Sis. Joy" required autocomplete="off">
      </div>

      <div class="form-group">
        <label class="form-label">Piliin ang Slot (1 - 4):</label>
        <select id="opSlotSelect" class="form-select">
          <option value="0">Slot 1</option>
          <option value="1">Slot 2</option>
          <option value="2">Slot 3</option>
          <option value="3">Slot 4</option>
        </select>
      </div>

      <button type="submit" class="login-btn">Mag-connect bilang Slot Operator ▶</button>
      <div style="text-align:center; margin-top:12px;">
        <a href="/" style="color:#94a3b8; font-size:12px; text-decoration:none;">← Bumalik sa Main Home Page</a>
      </div>
    </form>
  </div>

  <!-- HEADER -->
  <header class="slave-header">
    <div class="slave-meta">
      <a href="/" style="color:#94a3b8; text-decoration:none; font-size:13px; font-weight:700; margin-right:6px;">🏠 Home</a>
      <span class="slot-pill" id="activeSlotBadge">SLOT 1</span>
      <span class="operator-pill" id="activeOperatorBadge">👤 Pilot: ---</span>
    </div>
    <div class="slave-notice">
      🔒 <b>Slave Mode Only:</b> Verse Navigation & Translation Control (Walang Highlight / BG Control)
    </div>
    <button type="button" id="switchSlotBtn" class="ctrl-btn" style="padding:5px 12px; font-size:12px;">Palitan ang Slot / Name</button>
  </header>

  <!-- VERSE & TRANSLATION CONTROLS -->
  <section class="slave-controls">
    <input type="text" id="verseInput" placeholder="I-type: jn 3;16 & Enter">
    <button type="button" id="loadVerseBtn" class="ctrl-btn primary">Go</button>
    <button type="button" id="prevBtn" class="ctrl-btn" title="Left Arrow">◀ Back</button>
    <button type="button" id="nextBtn" class="ctrl-btn" title="Right Arrow">Next ▶</button>
    <select id="transSelect">
      <option value="001">ANG DATING BIBLIA</option>
    </select>
  </section>

  <!-- READ-ONLY VERSE MONITOR -->
  <main class="slave-stage">
    <div class="slave-card">
      <div class="slave-card-header">
        <div>
          <div class="slave-ref-title" id="dispRef">GENESIS 1:1</div>
          <div class="slave-ver-sub" id="dispVer">ANG DATING BIBLIA</div>
        </div>
        <div id="liveStatusBadge" style="font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px; background:#334155; color:#cbd5e1;">
          SYNCED TO MAIN OPERATOR
        </div>
      </div>
      <div class="slave-verse-body" id="dispBody">
        Naghihintay ng koneksyon sa Main Operator...
      </div>
    </div>
  </main>

  <footer class="slave-footer">
    Shortcut: Pindutin ang <b>Enter</b> para mag-type ng talata, o gamitin ang <b>◀ Left</b> at <b>Right ▶</b> arrow keys para lumipat ng talata.
  </footer>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const initialSlotParam = parseInt(urlParams.get('slot'), 10);
    let mySlotIdx = (!isNaN(initialSlotParam) && initialSlotParam >= 1 && initialSlotParam <= 4) ? (initialSlotParam - 1) : 0;
    let myOperatorName = sessionStorage.getItem('bible_slave_op_name') || '';
    let isLoggedIn = false;
    let ws = null;
    let heartbeatTimer = null;

    const loginGate = document.getElementById('loginGate');
    const loginForm = document.getElementById('loginForm');
    const opNameInput = document.getElementById('opNameInput');
    const opSlotSelect = document.getElementById('opSlotSelect');
    const activeSlotBadge = document.getElementById('activeSlotBadge');
    const activeOperatorBadge = document.getElementById('activeOperatorBadge');
    const switchSlotBtn = document.getElementById('switchSlotBtn');

    const verseInput = document.getElementById('verseInput');
    const loadVerseBtn = document.getElementById('loadVerseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const transSelect = document.getElementById('transSelect');

    const dispRef = document.getElementById('dispRef');
    const dispVer = document.getElementById('dispVer');
    const dispBody = document.getElementById('dispBody');
    const liveStatusBadge = document.getElementById('liveStatusBadge');

    opSlotSelect.value = String(mySlotIdx);
    if (myOperatorName) opNameInput.value = myOperatorName;

    async function loadTranslationsList() {
      try {
        const res = await fetch('/api/translations');
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          transSelect.innerHTML = '';
          list.sort((a, b) => (a.name.toUpperCase() === 'ANG DATING BIBLIA' ? -1 : b.name.toUpperCase() === 'ANG DATING BIBLIA' ? 1 : 0));
          list.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            transSelect.appendChild(opt);
          });
        }
      } catch (e) {}
    }
    loadTranslationsList();

    function sendSlavePacket(actionPayload) {
      if (!ws || ws.readyState !== WebSocket.OPEN || !isLoggedIn) return;
      ws.send(JSON.stringify({
        type: 'SLAVE_SLOT_PACKET',
        slotIndex: mySlotIdx,
        operatorName: myOperatorName,
        ...actionPayload
      }));
    }

    function connectSocket() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(proto + '//' + window.location.host);

      ws.onopen = () => {
        if (isLoggedIn) {
          sendSlavePacket({ action: 'JOIN' });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Kapag nag-broadcast ang Main Operator ng state
          if (Array.isArray(data.allSlots) || Array.isArray(data.slots)) {
            const sourceSlots = data.allSlots || data.slots;
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
        } catch (err) {}
      };

      ws.onclose = () => {
        setTimeout(connectSocket, 1200);
      };
    }

    connectSocket();

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = opNameInput.value.trim();
      if (!nameVal) return;

      if (isLoggedIn) {
        sendSlavePacket({ action: 'LEAVE' });
      }

      myOperatorName = nameVal;
      mySlotIdx = parseInt(opSlotSelect.value, 10) || 0;
      sessionStorage.setItem('bible_slave_op_name', myOperatorName);
      isLoggedIn = true;

      activeSlotBadge.textContent = 'SLOT ' + (mySlotIdx + 1);
      activeOperatorBadge.textContent = '👤 Pilot: ' + myOperatorName;
      loginGate.style.display = 'none';

      sendSlavePacket({ action: 'JOIN' });
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        sendSlavePacket({ action: 'HEARTBEAT' });
      }, 4000);

      verseInput.focus();
    });

    switchSlotBtn.addEventListener('click', () => {
      loginGate.style.display = 'flex';
      opNameInput.focus();
    });

    window.addEventListener('beforeunload', () => {
      if (isLoggedIn) sendSlavePacket({ action: 'LEAVE' });
    });

    function triggerLoadVerse() {
      const q = verseInput.value.trim();
      if (!q) return;
      sendSlavePacket({ action: 'QUERY_VERSE', query: q });
      verseInput.select();
    }

    loadVerseBtn.addEventListener('click', triggerLoadVerse);
    verseInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerLoadVerse();
      }
    });

    prevBtn.addEventListener('click', () => sendSlavePacket({ action: 'PREV_VERSE' }));
    nextBtn.addEventListener('click', () => sendSlavePacket({ action: 'NEXT_VERSE' }));

    transSelect.addEventListener('change', () => {
      const newId = transSelect.value;
      const newName = transSelect.selectedOptions[0]?.textContent || 'ANG DATING BIBLIA';
      sendSlavePacket({ action: 'CHANGE_TRANS', transId: newId, versionName: newName });
    });

    document.addEventListener('keydown', (e) => {
      if (!isLoggedIn || loginGate.style.display !== 'none') return;
      if (document.activeElement === verseInput || document.activeElement === transSelect) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        sendSlavePacket({ action: 'PREV_VERSE' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        sendSlavePacket({ action: 'NEXT_VERSE' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        verseInput.focus();
        verseInput.select();
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(operatorDir, 'slotoperator.html'), slotOperatorHtml, 'utf8');
console.log('Created Slot Operator Page:', path.join(operatorDir, 'slotoperator.html'));

// ============================================================================
// 3. CREATE DEDICATED HIGHLIGHTER PAGE (operator/highlighter.html)
// ============================================================================
const highlighterHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bible Highlighter Station</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      height: 100vh;
      background: #0b111e;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .high-header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .high-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 10px;
      padding: 12px;
      overflow: hidden;
    }
    .high-card {
      background: #0d1322;
      border: 1px solid #1e293b;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .high-card-head {
      padding: 8px 12px;
      background: #141c2b;
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 800;
      color: #38bdf8;
    }
    .high-canvas {
      flex: 1;
      padding: 18px;
      font-size: 22px;
      line-height: 1.75;
      text-align: center;
      overflow-y: auto;
      user-select: none;
    }
    .h-word {
      display: inline;
      padding: 2px 3px;
      border-radius: 4px;
      cursor: pointer;
    }
    .h-word:hover { background: rgba(255,255,255,0.12); }
    .h-word.active {
      background: rgba(250, 204, 21, 0.88);
      color: #0f172a;
    }
    .clear-btn {
      background: #facc15;
      color: #0f172a;
      border: none;
      border-radius: 4px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header class="high-header">
    <div style="display:flex; align-items:center; gap:12px;">
      <a href="/" style="color:#94a3b8; text-decoration:none; font-size:13px; font-weight:700;">🏠 Home</a>
      <strong style="color:#a78bfa; font-size:16px;">🖍️ Live Word Highlighter Station (4 Slots)</strong>
    </div>
    <button type="button" id="clearAllBtn" class="clear-btn" style="background:#f97316; color:#fff; padding:6px 14px; font-size:12px;">Clear All Highlights</button>
  </header>
  <main class="high-grid" id="highGrid">
    <div class="high-card"><div class="high-card-head"><span id="hTitle0">Slot 1</span><button class="clear-btn" data-clear="0">Clear</button></div><div class="high-canvas" id="hCanvas0"></div></div>
    <div class="high-card"><div class="high-card-head"><span id="hTitle1">Slot 2</span><button class="clear-btn" data-clear="1">Clear</button></div><div class="high-canvas" id="hCanvas1"></div></div>
    <div class="high-card"><div class="high-card-head"><span id="hTitle2">Slot 3</span><button class="clear-btn" data-clear="2">Clear</button></div><div class="high-canvas" id="hCanvas2"></div></div>
    <div class="high-card"><div class="high-card-head"><span id="hTitle3">Slot 4</span><button class="clear-btn" data-clear="3">Clear</button></div><div class="high-canvas" id="hCanvas3"></div></div>
  </main>
  <script>
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws;
    function connect() {
      ws = new WebSocket(proto + '//' + window.location.host);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const list = data.allSlots || data.slots;
          if (!Array.isArray(list)) return;
          list.forEach((s, sIdx) => {
            const tEl = document.getElementById('hTitle' + sIdx);
            const cEl = document.getElementById('hCanvas' + sIdx);
            if (!tEl || !cEl) return;
            tEl.textContent = 'SLOT ' + (sIdx + 1) + ': ' + (s.reference || '');
            cEl.innerHTML = '';
            const highSet = new Set(s.highlighted || []);
            (s.words || []).forEach((w, wIdx) => {
              const sp = document.createElement('span');
              sp.className = 'h-word' + (highSet.has(wIdx) ? ' active' : '');
              sp.textContent = w;
              sp.addEventListener('click', () => {
                ws.send(JSON.stringify({ type: 'SLAVE_SLOT_PACKET', slotIndex: sIdx, action: 'TOGGLE_HIGHLIGHT', wordIndex: wIdx }));
              });
              cEl.appendChild(sp);
              if (s.hasSpaces !== false) cEl.appendChild(document.createTextNode(' '));
            });
          });
        } catch (e) {}
      };
      ws.onclose = () => setTimeout(connect, 1000);
    }
    connect();
    document.querySelectorAll('[data-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'SLAVE_SLOT_PACKET', slotIndex: parseInt(btn.dataset.clear, 10), action: 'CLEAR_HIGHLIGHT' }));
      });
    });
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      ws.send(JSON.stringify({ type: 'SLAVE_SLOT_PACKET', slotIndex: 0, action: 'CLEAR_ALL_HIGHLIGHTS' }));
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(operatorDir, 'highlighter.html'), highlighterHtml, 'utf8');
console.log('Created Highlighter Page:', path.join(operatorDir, 'highlighter.html'));

// ============================================================================
// 4. UPDATE SERVER / MAIN.JS TO RELAY WEBSOCKET MESSAGES & SERVE ROOT INDEX.HTML
// ============================================================================
const serverCandidates = findFiles(__dirname, ['server.js', 'main.js', 'app.js', 'index.js']).filter(f => !f.includes('operator'));
serverCandidates.forEach(srvPath => {
  let srv = fs.readFileSync(srvPath, 'utf8');
  let modified = false;

  // Siguraduhing kapag may nag-send sa WebSocket (gaya ng SLAVE_SLOT_PACKET), ire-relay ito sa lahat ng connected clients (kasama ang Main Operator)
  if (srv.includes('wss.on') && !srv.includes('SLAVE_SLOT_PACKET')) {
    srv = srv.replace(
      /wss\.on\(['"]connection['"],\s*\((?:ws|socket)\)\s*=>\s*\{/,
      `wss.on('connection', (ws) => {
        ws.on('message', (rawMsg) => {
          try {
            const msgStr = rawMsg.toString();
            const parsed = JSON.parse(msgStr);
            if (parsed && parsed.type === 'SLAVE_SLOT_PACKET') {
              wss.clients.forEach(client => {
                if (client.readyState === 1) client.send(msgStr);
              });
            }
          } catch (err) {}
        });`
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(srvPath, srv, 'utf8');
    console.log('Updated WebSocket Relay in:', srvPath);
  }
});

// ============================================================================
// 5. UPDATE MAIN OPERATOR (operator.js) TO SHOW CONNECTED SLOT PILOTS & HANDLE SLAVE COMMANDS
// ============================================================================
let opJs = fs.readFileSync(opJsPath, 'utf8');

// Siguraduhing kasama ang full 4 slots (`allSlots`) at `transId` sa syncState() para laging synced ang Slot 1-4 Slaves kahit naka-1 Full mode
opJs = opJs.replace(
  /const serializedSlots = slots\.map\(s => \(\{[\s\S]*?\}\)\);/,
  `const serializedSlots = slots.map(s => ({
    transId: s.transId || '001',
    reference: s.reference || 'GENESIS 1:1',
    version: s.versionName || 'ANG DATING BIBLIA',
    words: s.words || [],
    hasSpaces: s.hasSpaces !== false,
    highlighted: Array.from(s.highlighted)
  }));`
);

if (!opJs.includes('allSlots: serializedSlots')) {
  opJs = opJs.replace(
    'slots: serializedSlots,',
    'slots: serializedSlots,\n    allSlots: serializedSlots,'
  );
}

// Alisin ang lumang Slave Hub block kung meron man
opJs = opJs.replace(/\/\/ === MULTI-USER SLAVE HUB START ===[\s\S]*?\/\/ === MULTI-USER SLAVE HUB END ===/g, '');

const slaveHubCode = `
// === MULTI-USER SLAVE HUB START ===
(function initMainOperatorSlaveHub() {
  const connectedPilots = {
    0: null,
    1: null,
    2: null,
    3: null
  };

  const style = document.createElement('style');
  style.textContent = \`
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
      background: rgba(22, 163, 74, 0.18);
      color: #4ade80;
      border-color: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.25);
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

  // Maglagay ng Home Portal button sa Row 2 ng Main Operator
  const row2 = document.querySelector('.op-row-2');
  if (row2 && !document.getElementById('mainHomePortalLink')) {
    const homeLink = document.createElement('a');
    homeLink.id = 'mainHomePortalLink';
    homeLink.href = '/';
    homeLink.target = '_blank';
    homeLink.className = 'home-nav-link';
    homeLink.title = 'Buksan ang Main Home Portal (Links para sa Slot Operators 1-4, Highlighter, at Output)';
    homeLink.textContent = '🏠 Home Portal';
    row2.insertBefore(homeLink, row2.firstChild);
  }

  // Maglagay ng Pilot Status Badge sa bawat Slot Header (Slot 1 hanggang Slot 4)
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

  setInterval(renderPilotBadges, 3000);

  async function handleSlavePacket(packet) {
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

  // Mag-connect sa parehong WebSocket para tanggapin ang mga commands ng Slot Operators 1-4
  function connectAdminListenerSocket() {
    const wsHost = window.location.host || 'localhost:3300';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const adminWs = new WebSocket(proto + '//' + wsHost);

    adminWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type === 'SLAVE_SLOT_PACKET') {
          handleSlavePacket(data);
        }
      } catch (e) {}
    };

    adminWs.onclose = () => {
      setTimeout(connectAdminListenerSocket, 1500);
    };
  }

  connectAdminListenerSocket();
})();
// === MULTI-USER SLAVE HUB END ===
`;

opJs = opJs.trimEnd() + '\n' + slaveHubCode + '\n';
fs.writeFileSync(opJsPath, opJs, 'utf8');
console.log('MATAGUMPAY NA NA-UPGRADE ANG MAIN OPERATOR, SLOT OPERATORS (1-4), HIGHLIGHTER, AT HOME PORTAL!');
