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

const opJsFiles = findFiles(__dirname, ['operator.js']);
if (opJsFiles.length === 0) {
  console.error('Hindi nahanap ang operator.js!');
  process.exit(1);
}

const opJsPath = opJsFiles[0];
const operatorDir = path.dirname(opJsPath);

// Hanapin kung nasaan ang translations folder (hal. data/translations o src/data/translations)
function findTranslationsDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === 'translations') return fullPath;
      const sub = findTranslationsDir(fullPath);
      if (sub) return sub;
    }
  }
  return null;
}

const translationsDir = findTranslationsDir(__dirname);
console.log('Detected Translations Dir:', translationsDir);

// ============================================================================
// 1. UPDATE SERVER.JS PARA SIGURADONG GUMAGANA ANG /api/translations AT /data/translations/
// ============================================================================
const srvPath = path.join(__dirname, 'server.js');
if (fs.existsSync(srvPath)) {
  let srv = fs.readFileSync(srvPath, 'utf8');

  // Idagdag sa customRouteInterceptor ang /api/translations at /data/translations/<file> fallback
  const transApiCode = `
    if (req.method === 'GET' && urlClean === '/api/translations') {
      const tDir = ${JSON.stringify(translationsDir)};
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
                name = rawMeta.split(/\\r?\\n/)[0].trim() || id;
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
      const tDir = ${JSON.stringify(translationsDir)};
      if (tDir && fs.existsSync(path.join(tDir, fileName))) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        res.end(fs.readFileSync(path.join(tDir, fileName)));
        return true;
      }
    }
`;

  if (!srv.includes("urlClean === '/api/translations'")) {
    srv = srv.replace(
      'if (req.method === \'GET\' && urlClean === \'/api/pilots\') {',
      transApiCode + '\n    if (req.method === \'GET\' && urlClean === \'/api/pilots\') {'
    );
    fs.writeFileSync(srvPath, srv, 'utf8');
    console.log('Added /api/translations and JSON loader route in server.js');
  }
}

// ============================================================================
// 2. UPDATE slotoperator.html (Self-Loading Bible JSON + Working Translations + Right-Click Menu w/ History)
// ============================================================================
const slotOpHtml = `<!DOCTYPE html>
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
      width: 440px;
      max-width: 100%;
      box-shadow: 0 20px 50px rgba(0,0,0,0.85);
    }
    .login-title { font-size: 20px; font-weight: 800; color: #facc15; margin: 0 0 6px 0; }
    .login-sub { font-size: 13px; color: #94a3b8; margin: 0 0 18px 0; }
    .form-group { margin-bottom: 16px; }
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
    .form-select option:disabled { color: #ef4444; background: #1e1b2e; font-weight: 700; }
    .login-error {
      display: none;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 12px;
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
      margin-top: 4px;
    }
    .login-btn:hover { background: #1d4ed8; }
    .login-btn:disabled { background: #475569; cursor: not-allowed; }

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
    .slave-meta { display: flex; align-items: center; gap: 10px; }
    .slot-pill {
      background: #2563eb;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      padding: 5px 12px;
      border-radius: 6px;
    }
    .operator-pill {
      background: rgba(74, 222, 128, 0.16);
      border: 1px solid #22c55e;
      color: #4ade80;
      font-size: 12.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .conn-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      margin-right: 5px;
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
      width: 230px;
      outline: none;
    }
    .ctrl-btn {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
    }
    .ctrl-btn:hover { background: #334155; border-color: #475569; }
    .ctrl-btn.primary { background: #2563eb; border-color: #3b82f6; }
    #transSelect {
      background: #1e293b;
      color: #facc15;
      border: 1px solid #334155;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 700;
      min-width: 260px;
      outline: none;
      cursor: pointer;
    }

    /* Main Split Workspace */
    .slave-workspace {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 330px;
      gap: 14px;
      padding: 14px 18px;
      overflow: hidden;
    }
    @media (max-width: 860px) {
      .slave-workspace { grid-template-columns: 1fr; grid-template-rows: 1fr 220px; }
    }
    .slave-card {
      background: #0d1322;
      border: 2px solid #facc15;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 0 14px rgba(250, 204, 21, 0.12);
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
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px dashed transparent;
    }
    .slave-ref-title:hover {
      border-color: #facc15;
      background: rgba(250, 204, 21, 0.12);
    }
    .slave-ver-sub { font-size: 13px; font-weight: 700; color: #38bdf8; padding-left: 6px; }
    .slave-verse-body {
      flex: 1;
      padding: 28px;
      font-size: 26px;
      line-height: 1.65;
      text-align: center;
      color: #ffffff;
      overflow-y: auto;
      user-select: none;
    }
    .slave-word-high {
      background: rgba(250, 204, 21, 0.35);
      color: #fde047;
      padding: 2px 4px;
      border-radius: 4px;
    }

    /* Verse History Sidebar */
    .history-panel {
      background: #0d1322;
      border: 1px solid #1e293b;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .history-header {
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.9);
      border-bottom: 1px solid #1e293b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 800;
      color: #facc15;
    }
    .history-search-box {
      padding: 8px 10px;
      border-bottom: 1px solid #1e293b;
    }
    .history-search-box input {
      width: 100%;
      padding: 6px 10px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
    }
    .history-list { flex: 1; overflow-y: auto; padding: 8px; }
    .history-item {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .history-item:hover { background: #334155; border-color: #38bdf8; }
    .history-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      font-weight: 800;
      color: #38bdf8;
      margin-bottom: 3px;
    }
    .history-item-ver { font-size: 10.5px; color: #facc15; font-weight: 700; }
    .history-item-text {
      font-size: 12px;
      color: #cbd5e1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.35;
    }
    .clear-hist-btn {
      background: #dc2626;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .slave-footer {
      padding: 7px 18px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      background: #0b111e;
      border-top: 1px solid #1e293b;
    }

    /* RIGHT-CLICK CONTEXT MENU (with Translation & History Submenus) */
    .slot-ctx-menu {
      position: fixed;
      z-index: 10020;
      width: 245px;
      background: #0d1322;
      border: 1px solid #26334d;
      border-radius: 10px;
      padding: 6px 0;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.85);
      display: none;
      font-size: 13.5px;
      color: #f8fafc;
      user-select: none;
    }
    .slot-ctx-menu.open { display: block; }
    .ctx-divider { height: 1px; background: #1e293b; margin: 5px 0; }
    .ctx-item {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 16px;
      cursor: pointer;
      color: #f1f5f9;
      transition: background 0.12s ease;
    }
    .ctx-item:hover { background: #1e293b; }
    .ctx-item-left { display: flex; align-items: center; gap: 12px; }
    .ctx-icon { font-size: 15px; width: 20px; text-align: center; }
    .ctx-shortcut { font-size: 12px; color: #94a3b8; }
    .ctx-arrow { font-size: 10px; color: #cbd5e1; }
    .ctx-submenu {
      position: absolute;
      top: -4px;
      left: 100%;
      width: 290px;
      max-height: 330px;
      background: #0d1322;
      border: 1px solid #26334d;
      border-radius: 10px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.88);
      padding: 6px 0;
      display: none;
      flex-direction: column;
      z-index: 10025;
    }
    .ctx-submenu.flip-left { left: auto; right: 100%; }
    .ctx-submenu.flip-up { top: auto; bottom: -4px; }
    .ctx-item.has-sub:hover > .ctx-submenu { display: flex; }
    .ctx-sub-search {
      margin: 4px 10px 6px 10px;
      padding: 6px 10px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
    }
    .ctx-sub-list { overflow-y: auto; max-height: 270px; }
    .ctx-sub-option {
      padding: 7px 14px;
      font-size: 12.5px;
      color: #e2e8f0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .ctx-sub-option:hover { background: #1e293b; color: #38bdf8; }
    .ctx-sub-option.active-trans { color: #facc15; font-weight: 700; background: rgba(250, 204, 21, 0.08); }
  </style>
</head>
<body>
  <!-- LOGIN GATE MODAL -->
  <div id="loginGate">
    <form class="login-box" id="loginForm">
      <h2 class="login-title">🕹️ Slot Operator Login</h2>
      <p class="login-sub">Ilagay ang iyong pangalan at piliin ang available na Slot.</p>

      <div id="loginErrorBox" class="login-error"></div>

      <div class="form-group">
        <label class="form-label">Iyong Pangalan (Operator Name):</label>
        <input type="text" id="opNameInput" class="form-input" placeholder="Hal. Bro. Dan / Sis. Joy" required autocomplete="off">
      </div>

      <div class="form-group">
        <label class="form-label">Piliin ang Available Slot (1 - 4):</label>
        <select id="opSlotSelect" class="form-select">
          <option value="0">🟢 Slot 1 — Available</option>
          <option value="1">🟢 Slot 2 — Available</option>
          <option value="2">🟢 Slot 3 — Available</option>
          <option value="3">🟢 Slot 4 — Available</option>
        </select>
      </div>

      <button type="submit" id="loginSubmitBtn" class="login-btn">Mag-connect bilang Slot Operator ▶</button>
      <div style="text-align:center; margin-top:12px;">
        <a href="/home" style="color:#94a3b8; font-size:12px; text-decoration:none;">← Bumalik sa Main Home Page</a>
      </div>
    </form>
  </div>

  <!-- HEADER -->
  <header class="slave-header">
    <div class="slave-meta">
      <a href="/home" style="color:#94a3b8; text-decoration:none; font-size:13px; font-weight:700; margin-right:6px;">🏠 Home</a>
      <span class="slot-pill" id="activeSlotBadge">SLOT 1</span>
      <span class="operator-pill" id="activeOperatorBadge"><span class="conn-dot"></span>👤 Pilot: ---</span>
    </div>
    <div style="font-size:12px; color:#94a3b8;">
      🔒 <b>Slave Mode:</b> Verse, Next/Back, Translation & History Only
    </div>
    <button type="button" id="logoutSlotBtn" class="ctrl-btn" style="padding:5px 12px; font-size:12px; border-color:#ef4444; color:#fca5a5;">Change Slot / Logout</button>
  </header>

  <!-- VERSE & TRANSLATION CONTROLS -->
  <section class="slave-controls">
    <input type="text" id="verseInput" placeholder="I-type: jn 3;16 & Enter">
    <button type="button" id="loadVerseBtn" class="ctrl-btn primary">Load Verse</button>
    <button type="button" id="prevBtn" class="ctrl-btn" title="Left Arrow">◀ Back</button>
    <button type="button" id="nextBtn" class="ctrl-btn" title="Right Arrow">Next ▶</button>
    <select id="transSelect">
      <option value="001">ANG DATING BIBLIA</option>
    </select>
  </section>

  <!-- WORKSPACE: LEFT = VERSE MONITOR, RIGHT = VERSE HISTORY -->
  <main class="slave-workspace" id="slaveWorkspace">
    <div class="slave-card" id="slaveCardBox">
      <div class="slave-card-header">
        <div>
          <div class="slave-ref-title" id="dispRef" title="Click para mag-type ng verse o Right-Click para sa menu">GENESIS 1:1</div>
          <div class="slave-ver-sub" id="dispVer">ANG DATING BIBLIA</div>
        </div>
        <div id="liveStatusBadge" style="font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px; background:#334155; color:#cbd5e1;">
          CONNECTED TO OPERATOR
        </div>
      </div>
      <div class="slave-verse-body" id="dispBody">
        Naglo-load ng Biblia...
      </div>
    </div>

    <!-- VERSE HISTORY PANEL -->
    <aside class="history-panel" id="historySidePanel">
      <div class="history-header">
        <span>📜 Slot Verse History (<span id="histCount">0</span>)</span>
        <button type="button" id="clearHistBtn" class="clear-hist-btn">Clear</button>
      </div>
      <div class="history-search-box">
        <input type="text" id="histFilterInput" placeholder="I-filter ang history (hal. Roma)...">
      </div>
      <div class="history-list" id="histList">
        <div style="text-align:center; padding:24px 10px; color:#64748b; font-size:12px;">Wala pang history sa slot na ito.</div>
      </div>
    </aside>
  </main>

  <footer class="slave-footer">
    Tip: Mag-<b>Right Click</b> sa Verse Card para sa <b>Change Verse, Translation, at History menu</b>. Gamitin ang <b>◀ / ▶</b> arrow keys para lumipat ng talata.
  </footer>

  <!-- RIGHT-CLICK CONTEXT MENU -->
  <div class="slot-ctx-menu" id="slaveCtxMenu">
    <div class="ctx-item" id="ctxChangeVerse">
      <div class="ctx-item-left">
        <span class="ctx-icon">✏️</span>
        <span>Change Verse</span>
      </div>
      <span class="ctx-shortcut">Enter</span>
    </div>

    <div class="ctx-item" id="ctxPrevVerse">
      <div class="ctx-item-left">
        <span class="ctx-icon">◀</span>
        <span>Previous Verse</span>
      </div>
      <span class="ctx-shortcut">←</span>
    </div>

    <div class="ctx-item" id="ctxNextVerse">
      <div class="ctx-item-left">
        <span class="ctx-icon">▶</span>
        <span>Next Verse</span>
      </div>
      <span class="ctx-shortcut">→</span>
    </div>

    <div class="ctx-divider"></div>

    <div class="ctx-item has-sub" id="ctxTransMenu">
      <div class="ctx-item-left">
        <span class="ctx-icon">🌐</span>
        <span>Translation</span>
      </div>
      <span class="ctx-arrow">▶</span>
      <div class="ctx-submenu" id="ctxTransSubmenu">
        <input type="text" class="ctx-sub-search" id="ctxTransSearch" placeholder="Search translation...">
        <div class="ctx-sub-list" id="ctxTransList"></div>
      </div>
    </div>

    <div class="ctx-item has-sub" id="ctxHistoryMenu">
      <div class="ctx-item-left">
        <span class="ctx-icon">🕒</span>
        <span>History</span>
      </div>
      <span class="ctx-arrow">▶</span>
      <div class="ctx-submenu" id="ctxHistorySubmenu">
        <div class="ctx-sub-list" id="ctxHistorySubList"></div>
      </div>
    </div>
  </div>

  <script>
    const BOOK_INDEX_ALIASES = {
      "gen": 0, "gn": 0, "ge": 0, "genesis": 0,
      "ex": 1, "exo": 1, "exod": 1, "exodo": 1, "exodus": 1,
      "lev": 2, "lv": 2, "le": 2, "levitico": 2, "leviticus": 2,
      "bil": 3, "blg": 3, "num": 3, "nm": 3, "nb": 3, "bilang": 3, "numbers": 3,
      "deut": 4, "dt": 4, "deu": 4, "deuteronomio": 4, "deuteronomy": 4,
      "jos": 5, "josh": 5, "js": 5, "josue": 5, "joshua": 5,
      "huk": 6, "hkm": 6, "judg": 6, "jdg": 6, "jg": 6, "hukom": 6, "judges": 6,
      "rut": 7, "rth": 7, "ru": 7, "ruth": 7,
      "1sam": 8, "1sm": 8, "1s": 8, "isam": 8, "1samuel": 8, "isamuel": 8,
      "2sam": 9, "2sm": 9, "2s": 9, "iisam": 9, "2samuel": 9, "iisamuel": 9,
      "1har": 10, "1hr": 10, "1hari": 10, "1kgs": 10, "1ki": 10, "1k": 10, "ihari": 10, "1kings": 10,
      "2har": 11, "2hr": 11, "2hari": 11, "2kgs": 11, "2ki": 11, "2k": 11, "iihari": 11, "2kings": 11,
      "1cron": 12, "1cr": 12, "1chr": 12, "1ch": 12, "icron": 12, "1cronica": 12, "1chronicles": 12,
      "2cron": 13, "2cr": 13, "2chr": 13, "2ch": 13, "iicron": 13, "2cronica": 13, "2chronicles": 13,
      "ezr": 14, "ez": 14, "ezra": 14,
      "neh": 15, "ne": 15, "nehemias": 15, "nehemiah": 15,
      "est": 16, "esth": 16, "es": 16, "esther": 16, "ester": 16,
      "jb": 17, "job": 17,
      "aw": 18, "awt": 18, "awit": 18, "ps": 18, "psa": 18, "psalm": 18, "psalms": 18,
      "kaw": 19, "kw": 19, "kawikaan": 19, "prov": 19, "prv": 19, "pr": 19, "proverbs": 19,
      "ecl": 20, "eccl": 20, "ecc": 20, "mang": 20, "mng": 20, "mangangaral": 20, "ecclesiastes": 20,
      "awitni": 21, "sol": 21, "song": 21, "sos": 21, "ss": 21, "awitnisolomon": 21,
      "isa": 22, "is": 22, "isaias": 22, "isaiah": 22,
      "jer": 23, "je": 23, "jr": 23, "jeremias": 23, "jeremiah": 23,
      "pan": 24, "png": 24, "panaghoy": 24, "lam": 24, "la": 24, "lamentations": 24,
      "eze": 25, "ezk": 25, "ezek": 25, "ezekiel": 25,
      "dan": 26, "da": 26, "dn": 26, "daniel": 26,
      "os": 27, "ose": 27, "hos": 27, "ho": 27, "oseas": 27, "hosea": 27,
      "jl": 28, "joe": 28, "joel": 28,
      "am": 29, "amo": 29, "amos": 29,
      "ob": 30, "oba": 30, "obad": 30, "obadias": 30, "obadiah": 30,
      "jon": 31, "jnh": 31, "jonas": 31, "jonah": 31,
      "mi": 32, "mik": 32, "mic": 32, "mikas": 32, "micah": 32,
      "nah": 33, "na": 33, "nahum": 33,
      "hab": 34, "hb": 34, "habacuc": 34, "habakkuk": 34,
      "zep": 35, "zef": 35, "zeph": 35, "zp": 35, "zefanias": 35, "zephaniah": 35,
      "hag": 36, "hg": 36, "hagai": 36, "haggai": 36,
      "zac": 37, "zc": 37, "zech": 37, "zec": 37, "zacarias": 37, "zechariah": 37,
      "mal": 38, "ml": 38, "malakias": 38, "malachi": 38,
      "mat": 39, "mt": 39, "matt": 39, "mateo": 39, "matthew": 39,
      "mar": 40, "mrk": 40, "mk": 40, "mr": 40, "mark": 40, "marcos": 40,
      "luc": 41, "lk": 41, "luk": 41, "lu": 41, "luke": 41, "lucas": 41,
      "jn": 42, "jhn": 42, "ju": 42, "john": 42, "joh": 42, "juan": 42,
      "gaw": 43, "gw": 43, "gawa": 43, "act": 43, "acts": 43, "ac": 43,
      "rom": 44, "rm": 44, "ro": 44, "roma": 44, "romans": 44,
      "1cor": 45, "1co": 45, "1kor": 45, "icor": 45, "1corinto": 45, "icorinto": 45, "1corinthians": 45, "1korinto": 45,
      "2cor": 46, "2co": 46, "2kor": 46, "iicor": 46, "2corinto": 46, "iicorinto": 46, "2corinthians": 46, "2korinto": 46,
      "gal": 47, "ga": 47, "galacia": 47, "galatians": 47,
      "ef": 48, "efe": 48, "efeso": 48, "eph": 48, "ephesians": 48,
      "fil": 49, "flp": 49, "filipos": 49, "phil": 49, "philippians": 49,
      "col": 50, "kol": 50, "colosas": 50, "colossians": 50,
      "1tes": 51, "1th": 51, "1thes": 51, "1tesalonica": 51, "itesalonica": 51, "1thessalonians": 51,
      "2tes": 52, "2th": 52, "2thes": 52, "2tesalonica": 52, "iitesalonica": 52, "2thessalonians": 52,
      "1tim": 53, "1ti": 53, "1tm": 53, "1timoteo": 53, "itimoteo": 53, "1timothy": 53,
      "2tim": 54, "2ti": 54, "2tm": 54, "2timoteo": 54, "iitimoteo": 54, "2timothy": 54,
      "tit": 55, "ti": 55, "tito": 55, "titus": 55,
      "flm": 56, "filem": 56, "filemon": 56, "phlm": 56, "philemon": 56,
      "heb": 57, "he": 57, "hebreo": 57, "hebrews": 57,
      "sant": 58, "snt": 58, "san": 58, "jas": 58, "jm": 58, "santiago": 58, "james": 58,
      "1ped": 59, "1pe": 59, "1pt": 59, "1p": 59, "1pedro": 59, "ipedro": 59, "1peter": 59,
      "2ped": 60, "2pe": 60, "2pt": 60, "2p": 60, "2pedro": 60, "iipedro": 60, "2peter": 60,
      "1jn": 61, "1jhn": 61, "1ju": 61, "1juan": 61, "ijuan": 61, "1john": 61,
      "2jn": 62, "2jhn": 62, "2ju": 62, "2juan": 62, "iijuan": 62, "2john": 62,
      "3jn": 63, "3jhn": 63, "3ju": 63, "3juan": 63, "iiijuan": 63, "3john": 63,
      "jud": 64, "jd": 64, "judas": 64, "jude": 64,
      "apoc": 65, "ap": 65, "apo": 65, "pah": 65, "pahayag": 65, "rev": 65, "rv": 65, "apocalipsis": 65, "revelation": 65
    };

    const urlParams = new URLSearchParams(window.location.search);
    const initialSlotParam = parseInt(urlParams.get('slot'), 10);
    let mySlotIdx = (!isNaN(initialSlotParam) && initialSlotParam >= 1 && initialSlotParam <= 4) ? (initialSlotParam - 1) : 0;
    let myOperatorName = sessionStorage.getItem('bible_slave_op_name') || '';
    const myClientId = sessionStorage.getItem('bible_slave_client_id') || ('pilot_' + Math.random().toString(36).slice(2, 10));
    sessionStorage.setItem('bible_slave_client_id', myClientId);

    // Local Bible Data Cache para may sariling verse reader ang Slot Operator!
    const bibleCache = {};
    let translationsList = [{ id: '001', name: 'ANG DATING BIBLIA' }];
    let localSlotState = {
      transId: '001',
      versionName: 'ANG DATING BIBLIA',
      bookIndex: 0,
      chapter: '1',
      verse: '1',
      reference: 'GENESIS 1:1',
      words: [],
      highlighted: []
    };

    let isLoggedIn = false;
    let ws = null;
    let heartbeatTimer = null;
    let slotHistory = JSON.parse(localStorage.getItem('bible_slave_history_' + mySlotIdx) || '[]');
    let lastRecordedKey = '';

    const loginGate = document.getElementById('loginGate');
    const loginForm = document.getElementById('loginForm');
    const loginErrorBox = document.getElementById('loginErrorBox');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const opNameInput = document.getElementById('opNameInput');
    const opSlotSelect = document.getElementById('opSlotSelect');
    const activeSlotBadge = document.getElementById('activeSlotBadge');
    const activeOperatorBadge = document.getElementById('activeOperatorBadge');
    const logoutSlotBtn = document.getElementById('logoutSlotBtn');

    const verseInput = document.getElementById('verseInput');
    const loadVerseBtn = document.getElementById('loadVerseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const transSelect = document.getElementById('transSelect');

    const dispRef = document.getElementById('dispRef');
    const dispVer = document.getElementById('dispVer');
    const dispBody = document.getElementById('dispBody');
    const liveStatusBadge = document.getElementById('liveStatusBadge');

    const histList = document.getElementById('histList');
    const histCount = document.getElementById('histCount');
    const histFilterInput = document.getElementById('histFilterInput');
    const clearHistBtn = document.getElementById('clearHistBtn');

    const slaveCtxMenu = document.getElementById('slaveCtxMenu');
    const ctxTransSearch = document.getElementById('ctxTransSearch');
    const ctxTransList = document.getElementById('ctxTransList');
    const ctxHistorySubList = document.getElementById('ctxHistorySubList');

    opSlotSelect.value = String(mySlotIdx);
    if (myOperatorName) opNameInput.value = myOperatorName;

    // 1. Load Translations List & Default Bible JSON directly
    async function ensureBibleLoaded(transId) {
      if (bibleCache[transId]) return bibleCache[transId];
      const urlsToTry = [
        \`../data/translations/\${transId}.json\`,
        \`/data/translations/\${transId}.json\`,
        \`/src/data/translations/\${transId}.json\`
      ];
      for (const u of urlsToTry) {
        try {
          const r = await fetch(u);
          if (r.ok) {
            const d = await r.json();
            bibleCache[transId] = d;
            return d;
          }
        } catch (e) {}
      }
      return null;
    }

    async function initTranslationsAndDefaultVerse() {
      try {
        const res = await fetch('/api/translations');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            translationsList = list;
          }
        }
      } catch (e) {}

      translationsList.sort((a, b) => (a.name.toUpperCase() === 'ANG DATING BIBLIA' ? -1 : b.name.toUpperCase() === 'ANG DATING BIBLIA' ? 1 : 0));
      transSelect.innerHTML = '';
      translationsList.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        transSelect.appendChild(opt);
      });

      const def = translationsList.find(t => t.name.toUpperCase() === 'ANG DATING BIBLIA') || translationsList[0];
      localSlotState.transId = def.id;
      localSlotState.versionName = def.name;
      transSelect.value = def.id;

      await ensureBibleLoaded(def.id);
      renderLocalVerse();
    }

    function renderLocalVerse(recordHist = true) {
      const bData = bibleCache[localSlotState.transId];
      if (!bData) return;
      const books = Object.keys(bData);
      if (books.length === 0) return;

      if (localSlotState.bookIndex < 0 || localSlotState.bookIndex >= books.length) localSlotState.bookIndex = 0;
      const bookName = books[localSlotState.bookIndex];
      const chapters = Object.keys(bData[bookName] || {});
      if (!chapters.includes(localSlotState.chapter)) localSlotState.chapter = chapters[0] || '1';
      const verses = Object.keys(bData[bookName]?.[localSlotState.chapter] || {});
      if (!verses.includes(localSlotState.verse)) localSlotState.verse = verses[0] || '1';

      const rawText = bData[bookName]?.[localSlotState.chapter]?.[localSlotState.verse] || '';
      const isChinese = /[\\u4e00-\\u9fff]/.test(rawText);
      localSlotState.words = isChinese ? Array.from(rawText.trim()) : rawText.trim().split(/\\s+/);
      localSlotState.hasSpaces = !isChinese;
      localSlotState.reference = \`\${bookName} \${localSlotState.chapter}:\${localSlotState.verse}\`;

      dispRef.textContent = localSlotState.reference;
      dispVer.textContent = localSlotState.versionName;

      const highSet = new Set(localSlotState.highlighted || []);
      dispBody.innerHTML = localSlotState.words.map((w, i) =>
        highSet.has(i) ? '<span class="slave-word-high">' + w + '</span>' : w
      ).join(localSlotState.hasSpaces === false ? '' : ' ');

      if (recordHist && isLoggedIn && localSlotState.words.length > 0) {
        addVerseToHistory(localSlotState.reference, localSlotState.versionName, localSlotState.transId, localSlotState.words);
      }
    }

    function findBookIdx(rawBookInput, availableBooks) {
      const clean = rawBookInput.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!clean) return -1;
      if (BOOK_INDEX_ALIASES.hasOwnProperty(clean) && availableBooks.length === 66) {
        return BOOK_INDEX_ALIASES[clean];
      }
      const numMatch = rawBookInput.trim().match(/^([1-3]|III|II|I)\\s+(.*)/i);
      if (numMatch) {
        const rawNum = numMatch[1].toUpperCase();
        const restText = numMatch[2].trim().toUpperCase();
        let romanPrefix = "I ", arabicPrefix = "1 ";
        if (rawNum === "2" || rawNum === "II") { romanPrefix = "II "; arabicPrefix = "2 "; }
        if (rawNum === "3" || rawNum === "III") { romanPrefix = "III "; arabicPrefix = "3 "; }
        const idx = availableBooks.findIndex(b => {
          const bUp = b.toUpperCase();
          return (bUp.startsWith(romanPrefix) || bUp.startsWith(arabicPrefix)) && bUp.includes(restText);
        });
        if (idx !== -1) return idx;
      }
      const cleanUpper = rawBookInput.trim().toUpperCase();
      let idx = availableBooks.findIndex(b => b.toUpperCase() === cleanUpper);
      if (idx !== -1) return idx;
      return availableBooks.findIndex(b => {
        const bUp = b.toUpperCase();
        if (/^(I|II|III|1|2|3)\\s/.test(bUp)) return false;
        return bUp.includes(cleanUpper);
      });
    }

    function localParseAndLoad(query) {
      const match = (query || '').trim().match(/^([1-3]?\\s*[a-zA-Z.\\s-]+?)\\s*(\\d+)(?:\\s*[:;.,\\s-]\\s*(\\d+))?$/);
      if (!match) return false;
      const bData = bibleCache[localSlotState.transId];
      if (!bData) return false;
      const availableBooks = Object.keys(bData);
      const bIdx = findBookIdx(match[1].trim(), availableBooks);
      if (bIdx === -1 || !availableBooks[bIdx]) return false;

      const foundBook = availableBooks[bIdx];
      const chapQ = String(parseInt(match[2], 10));
      const verseQ = match[3] ? String(parseInt(match[3], 10)) : '1';
      if (bData[foundBook] && bData[foundBook][chapQ]) {
        localSlotState.bookIndex = bIdx;
        localSlotState.chapter = chapQ;
        localSlotState.verse = bData[foundBook][chapQ][verseQ] ? verseQ : Object.keys(bData[foundBook][chapQ])[0];
        localSlotState.highlighted = [];
        renderLocalVerse(true);
        return true;
      }
      return false;
    }

    function localNextVerse() {
      const bData = bibleCache[localSlotState.transId];
      if (!bData) return;
      const books = Object.keys(bData);
      const bookName = books[localSlotState.bookIndex];
      if (!bData[bookName] || !bData[bookName][localSlotState.chapter]) return;
      const verses = Object.keys(bData[bookName][localSlotState.chapter]);
      const vIdx = verses.indexOf(localSlotState.verse);
      if (vIdx < verses.length - 1) {
        localSlotState.verse = verses[vIdx + 1];
      } else {
        const chapters = Object.keys(bData[bookName]);
        const cIdx = chapters.indexOf(localSlotState.chapter);
        if (cIdx < chapters.length - 1) {
          localSlotState.chapter = chapters[cIdx + 1];
          localSlotState.verse = Object.keys(bData[bookName][localSlotState.chapter])[0];
        } else if (localSlotState.bookIndex < books.length - 1) {
          localSlotState.bookIndex++;
          const newB = books[localSlotState.bookIndex];
          localSlotState.chapter = Object.keys(bData[newB])[0];
          localSlotState.verse = Object.keys(bData[newB][localSlotState.chapter])[0];
        }
      }
      localSlotState.highlighted = [];
      renderLocalVerse(true);
    }

    function localPrevVerse() {
      const bData = bibleCache[localSlotState.transId];
      if (!bData) return;
      const books = Object.keys(bData);
      const bookName = books[localSlotState.bookIndex];
      if (!bData[bookName] || !bData[bookName][localSlotState.chapter]) return;
      const verses = Object.keys(bData[bookName][localSlotState.chapter]);
      const vIdx = verses.indexOf(localSlotState.verse);
      if (vIdx > 0) {
        localSlotState.verse = verses[vIdx - 1];
      } else {
        const chapters = Object.keys(bData[bookName]);
        const cIdx = chapters.indexOf(localSlotState.chapter);
        if (cIdx > 0) {
          localSlotState.chapter = chapters[cIdx - 1];
          const vPrev = Object.keys(bData[bookName][localSlotState.chapter]);
          localSlotState.verse = vPrev[vPrev.length - 1];
        } else if (localSlotState.bookIndex > 0) {
          localSlotState.bookIndex--;
          const newB = books[localSlotState.bookIndex];
          const cPrev = Object.keys(bData[newB]);
          localSlotState.chapter = cPrev[cPrev.length - 1];
          const vPrev = Object.keys(bData[newB][localSlotState.chapter]);
          localSlotState.verse = vPrev[vPrev.length - 1];
        }
      }
      localSlotState.highlighted = [];
      renderLocalVerse(true);
    }

    initTranslationsAndDefaultVerse();

    function showLoginError(msg) {
      if (!msg) {
        loginErrorBox.style.display = 'none';
        loginErrorBox.textContent = '';
      } else {
        loginErrorBox.style.display = 'block';
        loginErrorBox.textContent = msg;
      }
    }

    function updateSlotDropdownLocks(pilotsObj) {
      if (!pilotsObj) return;
      const now = Date.now();
      let availableCount = 0;

      Array.from(opSlotSelect.options).forEach((opt, idx) => {
        const p = pilotsObj[idx];
        const isOccupiedByOther = p && p.name && (now - (p.lastSeen || now) < 10000) && p.clientId !== myClientId;
        if (isOccupiedByOther) {
          opt.disabled = true;
          opt.textContent = \`🔒 Slot \${idx + 1} — LOCKED (Pilot: \${p.name})\`;
        } else {
          opt.disabled = false;
          opt.textContent = \`🟢 Slot \${idx + 1} — Available\`;
          availableCount++;
        }
      });

      const currentOpt = opSlotSelect.options[opSlotSelect.selectedIndex];
      if (currentOpt && currentOpt.disabled) {
        const firstFree = Array.from(opSlotSelect.options).find(o => !o.disabled);
        if (firstFree) opSlotSelect.value = firstFree.value;
      }

      loginSubmitBtn.disabled = (availableCount === 0);
      if (availableCount === 0) {
        showLoginError('Puno na ang lahat ng 4 Slots! Maghintay na may mag-logout na Pilot.');
      }
    }

    function addVerseToHistory(ref, ver, transId, wordsArr) {
      if (!ref) return;
      const key = ref + '|' + ver;
      if (key === lastRecordedKey) return;
      lastRecordedKey = key;

      const textPreview = (wordsArr || []).join(' ');
      slotHistory = slotHistory.filter(h => h.key !== key);
      slotHistory.unshift({
        key,
        reference: ref,
        version: ver,
        transId: transId || localSlotState.transId,
        text: textPreview,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      if (slotHistory.length > 80) slotHistory.pop();
      localStorage.setItem('bible_slave_history_' + mySlotIdx, JSON.stringify(slotHistory));
      renderHistoryList();
    }

    async function loadFromHistoryItem(item) {
      if (item.transId && item.transId !== localSlotState.transId) {
        await ensureBibleLoaded(item.transId);
        localSlotState.transId = item.transId;
        localSlotState.versionName = item.version;
        transSelect.value = item.transId;
        sendSlavePacket({ action: 'CHANGE_TRANS', transId: item.transId, versionName: item.version });
      }
      localParseAndLoad(item.reference);
      sendSlavePacket({ action: 'QUERY_VERSE', query: item.reference });
    }

    function renderHistoryList() {
      const q = (histFilterInput.value || '').trim().toLowerCase();
      const filtered = q
        ? slotHistory.filter(h =>
            h.reference.toLowerCase().includes(q) ||
            h.version.toLowerCase().includes(q) ||
            (h.text || '').toLowerCase().includes(q)
          )
        : slotHistory;

      histCount.textContent = String(slotHistory.length);
      histList.innerHTML = '';

      if (filtered.length === 0) {
        histList.innerHTML = '<div style="text-align:center; padding:24px 10px; color:#64748b; font-size:12px;">Walang nakatalang history.</div>';
        return;
      }

      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = \`
          <div class="history-item-top">
            <span>\${item.reference}</span>
            <span style="color:#94a3b8; font-size:10.5px;">\${item.time}</span>
          </div>
          <div class="history-item-ver">\${item.version}</div>
          <div class="history-item-text">\${item.text || ''}</div>
        \`;
        div.addEventListener('click', () => loadFromHistoryItem(item));
        histList.appendChild(div);
      });
    }

    histFilterInput.addEventListener('input', renderHistoryList);
    clearHistBtn.addEventListener('click', () => {
      slotHistory = [];
      localStorage.removeItem('bible_slave_history_' + mySlotIdx);
      renderHistoryList();
    });

    function sendSlavePacket(actionPayload) {
      if (!isLoggedIn) return;
      const packet = {
        type: 'SLAVE_SLOT_PACKET',
        slotIndex: mySlotIdx,
        operatorName: myOperatorName,
        clientId: myClientId,
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
    }

    async function applyIncomingState(data) {
      if (!data) return;
      if (data.pilots) updateSlotDropdownLocks(data.pilots);
      const sourceSlots = data.allSlots || data.slots;
      if (Array.isArray(sourceSlots)) {
        const slotObj = sourceSlots[mySlotIdx];
        if (slotObj && Array.isArray(slotObj.words) && slotObj.words.length > 0) {
          const ref = slotObj.reference || 'GENESIS 1:1';
          const ver = slotObj.version || 'ANG DATING BIBLIA';
          const words = slotObj.words;

          if (slotObj.transId && slotObj.transId !== localSlotState.transId) {
            localSlotState.transId = slotObj.transId;
            localSlotState.versionName = ver;
            transSelect.value = slotObj.transId;
            ensureBibleLoaded(slotObj.transId);
          }

          localSlotState.reference = ref;
          localSlotState.versionName = ver;
          localSlotState.words = words;
          localSlotState.hasSpaces = slotObj.hasSpaces !== false;
          localSlotState.highlighted = slotObj.highlighted || [];

          dispRef.textContent = ref;
          dispVer.textContent = ver;
          const highSet = new Set(localSlotState.highlighted);
          dispBody.innerHTML = words.map((w, i) =>
            highSet.has(i) ? '<span class="slave-word-high">' + w + '</span>' : w
          ).join(localSlotState.hasSpaces === false ? '' : ' ');

          if (isLoggedIn) addVerseToHistory(ref, ver, localSlotState.transId, words);

          const mode = parseInt(data.displayMode, 10) || 1;
          const isLive = mySlotIdx < mode;
          liveStatusBadge.style.background = isLive ? '#ef4444' : '#334155';
          liveStatusBadge.style.color = '#ffffff';
          liveStatusBadge.textContent = isLive ? '● LIVE ON OUTPUT' : '● STAGING MODE';
        }
      }
    }

    function connectSocket() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(proto + '//' + (window.location.host || 'localhost:3300'));
      ws.onopen = () => { if (isLoggedIn) sendSlavePacket({ action: 'JOIN' }); };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PILOT_LOCK_STATE' && data.pilots) {
            updateSlotDropdownLocks(data.pilots);
          } else if (data.type === 'JOIN_REJECTED' && data.clientId === myClientId) {
            isLoggedIn = false;
            loginGate.style.display = 'flex';
            showLoginError(data.reason || 'Ang Slot na ito ay may Pilot na!');
          } else {
            applyIncomingState(data);
          }
        } catch (err) {}
      };
      ws.onclose = () => setTimeout(connectSocket, 1000);
    }
    connectSocket();

    setInterval(() => {
      fetch('/api/pilots')
        .then(r => r.json())
        .then(d => {
          if (d && d.pilots) updateSlotDropdownLocks(d.pilots);
          if (d && d.state) applyIncomingState(d.state);
        })
        .catch(() => {});
    }, 900);

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      showLoginError('');
      const nameVal = opNameInput.value.trim();
      const targetSlot = parseInt(opSlotSelect.value, 10);
      if (!nameVal || isNaN(targetSlot)) return;

      try {
        const res = await fetch('/api/slave-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'SLAVE_SLOT_PACKET',
            action: 'JOIN',
            slotIndex: targetSlot,
            operatorName: nameVal,
            clientId: myClientId
          })
        });
        const result = await res.json();
        if (result && result.locked) {
          showLoginError(\`🔒 Hindi pwedeng pumasok! Ang Slot \${targetSlot + 1} ay hawak na ni \${result.occupiedBy}.\`);
          return;
        }
      } catch (err) {}

      myOperatorName = nameVal;
      mySlotIdx = targetSlot;
      sessionStorage.setItem('bible_slave_op_name', myOperatorName);
      slotHistory = JSON.parse(localStorage.getItem('bible_slave_history_' + mySlotIdx) || '[]');
      renderHistoryList();

      isLoggedIn = true;
      activeSlotBadge.textContent = 'SLOT ' + (mySlotIdx + 1);
      activeOperatorBadge.innerHTML = '<span class="conn-dot"></span>👤 Pilot: ' + myOperatorName;
      loginGate.style.display = 'none';

      renderLocalVerse(true);
      sendSlavePacket({ action: 'JOIN' });

      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        sendSlavePacket({ action: 'HEARTBEAT' });
      }, 2500);

      verseInput.focus();
    });

    logoutSlotBtn.addEventListener('click', () => {
      if (isLoggedIn) {
        sendSlavePacket({ action: 'LEAVE' });
        isLoggedIn = false;
      }
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      loginGate.style.display = 'flex';
      opNameInput.focus();
    });

    window.addEventListener('beforeunload', () => {
      if (isLoggedIn) sendSlavePacket({ action: 'LEAVE' });
    });

    function triggerLoadVerse() {
      const q = verseInput.value.trim();
      if (!q) return;
      localParseAndLoad(q);
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

    prevBtn.addEventListener('click', () => {
      localPrevVerse();
      sendSlavePacket({ action: 'PREV_VERSE' });
    });

    nextBtn.addEventListener('click', () => {
      localNextVerse();
      sendSlavePacket({ action: 'NEXT_VERSE' });
    });

    async function switchTranslationTo(newId, newName) {
      await ensureBibleLoaded(newId);
      localSlotState.transId = newId;
      localSlotState.versionName = newName;
      transSelect.value = newId;
      renderLocalVerse(true);
      sendSlavePacket({ action: 'CHANGE_TRANS', transId: newId, versionName: newName });
    }

    transSelect.addEventListener('change', () => {
      const newId = transSelect.value;
      const newName = transSelect.selectedOptions[0]?.textContent || 'ANG DATING BIBLIA';
      switchTranslationTo(newId, newName);
    });

    // Click on Reference Title to focus Verse Input
    dispRef.addEventListener('click', () => {
      verseInput.focus();
      verseInput.select();
    });

    // ========================================================================
    // RIGHT-CLICK CONTEXT MENU LOGIC (Change Verse, Translation, History)
    // ========================================================================
    function closeCtxMenu() {
      slaveCtxMenu.classList.remove('open');
    }

    function populateCtxTranslations(filter = '') {
      ctxTransList.innerHTML = '';
      const q = filter.trim().toLowerCase();
      translationsList
        .filter(t => !q || t.name.toLowerCase().includes(q))
        .forEach(t => {
          const div = document.createElement('div');
          div.className = 'ctx-sub-option' + (t.id === localSlotState.transId ? ' active-trans' : '');
          div.innerHTML = \`
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${t.name}</span>
            \${t.id === localSlotState.transId ? '<span>✓</span>' : ''}
          \`;
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            closeCtxMenu();
            switchTranslationTo(t.id, t.name);
          });
          ctxTransList.appendChild(div);
        });
    }

    function populateCtxHistory() {
      ctxHistorySubList.innerHTML = '';
      if (slotHistory.length === 0) {
        ctxHistorySubList.innerHTML = '<div style="padding:12px 14px; color:#64748b; font-size:12px;">Walang nakatalang history.</div>';
        return;
      }
      slotHistory.slice(0, 30).forEach(h => {
        const div = document.createElement('div');
        div.className = 'ctx-sub-option';
        div.innerHTML = \`
          <span style="font-weight:700; color:#38bdf8;">\${h.reference}</span>
          <small style="color:#facc15; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${h.version}</small>
        \`;
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          closeCtxMenu();
          loadFromHistoryItem(h);
        });
        ctxHistorySubList.appendChild(div);
      });
    }

    ctxTransSearch.addEventListener('click', (e) => e.stopPropagation());
    ctxTransSearch.addEventListener('input', (e) => populateCtxTranslations(e.target.value));

    function adjustSubmenuPos(subEl) {
      subEl.classList.remove('flip-left', 'flip-up');
      const rect = slaveCtxMenu.getBoundingClientRect();
      if (rect.right + 295 > window.innerWidth) subEl.classList.add('flip-left');
      if (rect.bottom + 240 > window.innerHeight) subEl.classList.add('flip-up');
    }

    document.getElementById('ctxTransMenu').addEventListener('mouseenter', () => adjustSubmenuPos(document.getElementById('ctxTransSubmenu')));
    document.getElementById('ctxHistoryMenu').addEventListener('mouseenter', () => adjustSubmenuPos(document.getElementById('ctxHistorySubmenu')));

    document.getElementById('slaveCardBox').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ctxTransSearch.value = '';
      populateCtxTranslations('');
      populateCtxHistory();
      slaveCtxMenu.classList.add('open');

      const w = 248, h = 210;
      const x = (e.clientX + w > window.innerWidth) ? (window.innerWidth - w - 8) : e.clientX;
      const y = (e.clientY + h > window.innerHeight) ? (window.innerHeight - h - 8) : e.clientY;
      slaveCtxMenu.style.left = Math.max(8, x) + 'px';
      slaveCtxMenu.style.top = Math.max(8, y) + 'px';
    });

    document.getElementById('ctxChangeVerse').addEventListener('click', () => {
      closeCtxMenu();
      verseInput.focus();
      verseInput.select();
    });
    document.getElementById('ctxPrevVerse').addEventListener('click', () => {
      closeCtxMenu();
      localPrevVerse();
      sendSlavePacket({ action: 'PREV_VERSE' });
    });
    document.getElementById('ctxNextVerse').addEventListener('click', () => {
      closeCtxMenu();
      localNextVerse();
      sendSlavePacket({ action: 'NEXT_VERSE' });
    });

    document.addEventListener('click', (e) => {
      if (!slaveCtxMenu.contains(e.target)) closeCtxMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (!isLoggedIn || loginGate.style.display !== 'none') return;
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        localPrevVerse();
        sendSlavePacket({ action: 'PREV_VERSE' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        localNextVerse();
        sendSlavePacket({ action: 'NEXT_VERSE' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        verseInput.focus();
        verseInput.select();
      } else if (e.key === 'Escape') {
        closeCtxMenu();
      }
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(operatorDir, 'slotoperator.html'), slotOpHtml, 'utf8');
console.log('✅ Matagumpay na na-update ang slotoperator.html (Local Bible Reader + Translations + Right-Click History Menu)!');
