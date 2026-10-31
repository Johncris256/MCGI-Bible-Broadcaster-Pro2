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
const webRootDir = path.dirname(operatorDir);
const outHtmlFiles = findFiles(__dirname, ['output.html']);
const outputDir = outHtmlFiles.length > 0 ? path.dirname(outHtmlFiles[0]) : path.join(webRootDir, 'output');

// ============================================================================
// 1. IBALIK ANG HIGHLIGHTER.HTML NA NAKA-BASE MISMO SA OUTPUT.HTML
// ============================================================================
let baseOutputHtml = '';
if (outHtmlFiles.length > 0) {
  baseOutputHtml = fs.readFileSync(outHtmlFiles[0], 'utf8');
}

const highlighterBasedOnOutput = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible Highlighter (Output-Based Interactive View)</title>
  <link rel="stylesheet" href="../output/output.css">
  <style>
    :root {
      --verse-anim-duration: 0.55s;
      --highlight-anim-duration: 0.25s;
      --highlight-bg-color: rgba(250, 204, 21, 0.5);
    }
    body, .reference-title, .version-subtitle, .verse-text {
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      margin: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      background-color: #004cff;
      user-select: none;
    }
    #multiSlotStage {
      display: grid;
      gap: 18px;
      box-sizing: border-box;
      transition: width 0.2s ease, height 0.2s ease;
    }
    #multiSlotStage.mode-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
    #multiSlotStage.mode-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
    #multiSlotStage.mode-3 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr; }
    #multiSlotStage.mode-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

    .render-box {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      background: rgba(10, 25, 60, 0.78);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }
    .render-box.transparent-verse-box {
      background: transparent !important;
      box-shadow: none !important;
      border: none !important;
    }
    .reference-container {
      text-align: left;
      margin-bottom: var(--title-verse-gap, 18px);
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .reference-title {
      font-size: 38px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .version-subtitle {
      font-size: 20px;
      font-weight: 700;
      font-style: italic;
      color: #facc15;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .verse-container {
      flex: 1;
      display: flex;
      align-items: flex-start !important;
      justify-content: center;
      text-align: center;
      overflow: hidden;
      padding-top: 4px;
      position: relative;
    }
    .verse-text {
      line-height: 1.55;
      color: #ffffff;
      word-break: break-word;
    }
    .ndi-word, .ndi-space {
      display: inline !important;
      position: relative !important;
      padding: 2px 0px !important;
      margin: 0px !important;
      cursor: pointer;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      transition: background-color var(--highlight-anim-duration) ease, box-shadow var(--highlight-anim-duration) ease;
    }
    .ndi-word:hover {
      background-color: rgba(255, 255, 255, 0.18) !important;
    }
    .ndi-word.active-highlight, .ndi-space.active-highlight {
      background-color: var(--highlight-bg-color) !important;
      color: #ffffff !important;
    }
    .ndi-word.active-highlight.highlight-start.highlight-end {
      box-shadow: -6px 0 0 0 var(--highlight-bg-color), 6px 0 0 0 var(--highlight-bg-color) !important;
    }
    .ndi-word.active-highlight.highlight-start:not(.highlight-end) {
      box-shadow: -6px 0 0 0 var(--highlight-bg-color) !important;
    }
    .ndi-word.active-highlight.highlight-end:not(.highlight-start) {
      box-shadow: 6px 0 0 0 var(--highlight-bg-color) !important;
    }
    .floating-clear-btn {
      background: rgba(250, 204, 21, 0.9);
      color: #0f172a;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .floating-clear-btn:hover { background: #fde047; }
  </style>
</head>
<body id="outputBody">
  <div id="multiSlotStage" class="mode-1"></div>

  <script>
    let socket;
    let lastState = null;
    let isDragging = false;
    let dragSlot = null;
    let dragTargetHigh = true;

    document.addEventListener('mouseup', () => {
      isDragging = false;
      dragSlot = null;
    });

    function sendHighlightCmd(payload) {
      const msg = JSON.stringify({ type: 'SLAVE_SLOT_PACKET', ...payload });
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(msg);
      }
      fetch('/api/slave-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: msg
      }).catch(() => {});
    }

    function updateHighlightClasses(container, wordsLength, highSet) {
      for (let idx = 0; idx < wordsLength; idx++) {
        const isHigh = highSet.has(idx);
        const prevHigh = highSet.has(idx - 1);
        const nextHigh = highSet.has(idx + 1);
        const wordSpan = container.querySelector(\`[data-idx='\${idx}']\`);
        if (wordSpan) {
          if (isHigh) {
            wordSpan.classList.add('active-highlight');
            wordSpan.classList.toggle('highlight-start', !prevHigh);
            wordSpan.classList.toggle('highlight-end', !nextHigh);
          } else {
            wordSpan.classList.remove('active-highlight', 'highlight-start', 'highlight-end');
          }
        }
        const spaceSpan = container.querySelector(\`[data-space-after='\${idx}']\`);
        if (spaceSpan) {
          spaceSpan.classList.toggle('active-highlight', isHigh && nextHigh);
        }
      }
    }

    function adjustSlotFontSize(boxEl, baseMaxSize, displayMode) {
      const container = boxEl.querySelector('.verse-container');
      const text = boxEl.querySelector('.verse-text');
      const refTitle = boxEl.querySelector('.reference-title');
      const verSub = boxEl.querySelector('.version-subtitle');
      if (!container || !text) return;

      let scaleFactor = 1;
      if (displayMode === 2) scaleFactor = 0.82;
      if (displayMode === 3) scaleFactor = 0.70;
      if (displayMode === 4) scaleFactor = 0.72;

      if (refTitle) refTitle.style.fontSize = Math.round(38 * scaleFactor) + 'px';
      if (verSub) verSub.style.fontSize = Math.round(20 * scaleFactor) + 'px';

      let fontSize = Math.round(baseMaxSize * scaleFactor);
      text.style.fontSize = fontSize + 'px';

      while ((text.scrollHeight > container.clientHeight || text.scrollWidth > container.clientWidth) && fontSize > 14) {
        fontSize -= 2;
        text.style.fontSize = fontSize + 'px';
      }
    }

    function applyBoxTypography(boxEl, fonts) {
      const outRefEl = boxEl.querySelector('.reference-title');
      const outVerEl = boxEl.querySelector('.version-subtitle');
      const outContentEl = boxEl.querySelector('.verse-text');
      const defaultFont = 'Arial, Helvetica, sans-serif';
      const defaultShadow = '2px 3px 6px rgba(0, 0, 0, 0.85), 0px 1px 3px rgba(0, 0, 0, 0.9)';
      const f = fonts || {};

      if (outRefEl) {
        outRefEl.style.setProperty('font-family', f.ref || defaultFont, 'important');
        outRefEl.style.setProperty('font-weight', f.refBold ? '700' : '400', 'important');
        outRefEl.style.setProperty('font-style', f.refItalic ? 'italic' : 'normal', 'important');
        outRefEl.style.setProperty('text-shadow', f.refShadow !== false ? defaultShadow : 'none', 'important');
      }
      if (outVerEl) {
        outVerEl.style.setProperty('font-family', f.version || defaultFont, 'important');
        outVerEl.style.setProperty('font-weight', f.verBold ? '700' : '400', 'important');
        outVerEl.style.setProperty('font-style', f.verItalic ? 'italic' : 'normal', 'important');
        outVerEl.style.setProperty('text-shadow', f.verShadow !== false ? defaultShadow : 'none', 'important');
      }
      if (outContentEl) {
        outContentEl.style.setProperty('font-family', f.content || defaultFont, 'important');
        outContentEl.style.setProperty('font-weight', f.contentBold ? '700' : '400', 'important');
        outContentEl.style.setProperty('font-style', f.contentItalic ? 'italic' : 'normal', 'important');
      }
      boxEl.querySelectorAll('.ndi-word').forEach(span => {
        span.style.setProperty('text-shadow', f.contentShadow !== false ? defaultShadow : 'none', 'important');
      });
    }

    function renderHighlighterState(data) {
      if (!data) return;
      lastState = data;

      if (data.bg && data.bg !== 'transparent') {
        if (data.bg.startsWith('url')) {
          document.body.style.backgroundImage = data.bg;
          document.body.style.backgroundSize = 'cover';
          document.body.style.backgroundPosition = 'center';
        } else {
          document.body.style.backgroundColor = data.bg;
          document.body.style.backgroundImage = 'none';
        }
      } else {
        document.body.style.backgroundColor = '#0b111e';
      }

      const a = data.animation || {};
      const highOp = (a.highlightOpacity !== undefined) ? parseFloat(a.highlightOpacity) : 0.50;
      document.documentElement.style.setProperty('--highlight-bg-color', \`rgba(250, 204, 21, \${highOp})\`);

      const s = data.settings || {};
      const pad = (s.boxPadding !== undefined) ? parseInt(s.boxPadding, 10) : 40;
      const outerMargin = (s.screenMargin !== undefined) ? parseInt(s.screenMargin, 10) : 55;
      const hideBoxBg = Boolean(s.hideBoxBg);
      const baseMaxFont = parseInt(s.maxFontSize, 10) || 46;
      const topGapPx = (s.topGap !== undefined) ? parseInt(s.topGap, 10) : 18;
      document.documentElement.style.setProperty('--title-verse-gap', topGapPx + 'px');

      const displayMode = parseInt(data.displayMode, 10) || 1;
      const stage = document.getElementById('multiSlotStage');
      stage.className = \`mode-\${displayMode}\`;
      stage.style.width = \`calc(100vw - \${outerMargin * 2}px)\`;
      stage.style.height = \`calc(100vh - \${outerMargin * 2}px)\`;

      const slotsList = Array.isArray(data.slots) && data.slots.length > 0
        ? data.slots.slice(0, displayMode)
        : [{
            reference: data.reference || 'GENESIS 1:1',
            version: data.version || 'ANG DATING BIBLIA',
            words: data.words || [],
            hasSpaces: data.hasSpaces !== false,
            highlighted: data.highlighted || []
          }];

      while (stage.children.length > slotsList.length) stage.removeChild(stage.lastChild);
      while (stage.children.length < slotsList.length) {
        const idx = stage.children.length;
        const box = document.createElement('div');
        box.className = 'render-box';
        box.innerHTML = \`
          <div class="reference-container">
            <div>
              <div class="reference-title"></div>
              <div class="version-subtitle"></div>
            </div>
            <button type="button" class="floating-clear-btn" data-slot="\${idx}">Remove Highlight</button>
          </div>
          <div class="verse-container">
            <div class="verse-text"></div>
          </div>
        \`;
        box.querySelector('.floating-clear-btn').addEventListener('click', () => {
          sendHighlightCmd({ slotIndex: idx, action: 'CLEAR_HIGHLIGHT' });
        });
        stage.appendChild(box);
      }

      slotsList.forEach((slotData, sIdx) => {
        const boxEl = stage.children[sIdx];
        const padScaled = displayMode > 1 ? Math.max(16, Math.round(pad * 0.65)) : pad;
        boxEl.style.padding = \`\${padScaled}px \${padScaled + 8}px\`;
        boxEl.classList.toggle('transparent-verse-box', hideBoxBg);

        const refEl = boxEl.querySelector('.reference-title');
        const verEl = boxEl.querySelector('.version-subtitle');
        const contentEl = boxEl.querySelector('.verse-text');

        const incomingRef = slotData.reference || '';
        const incomingVer = slotData.version || 'ANG DATING BIBLIA';
        const wordsArr = slotData.words || [];
        const hasSpaces = slotData.hasSpaces !== false;
        const highSet = new Set(slotData.highlighted || []);

        refEl.textContent = incomingRef;
        verEl.textContent = incomingVer;

        const newVerseKey = incomingRef + '|' + incomingVer + '|' + wordsArr.join(' ');
        if (contentEl.dataset.verseKey !== newVerseKey) {
          contentEl.dataset.verseKey = newVerseKey;
          contentEl.innerHTML = '';

          wordsArr.forEach((word, wIdx) => {
            const span = document.createElement('span');
            span.textContent = word;
            span.classList.add('ndi-word');
            span.dataset.idx = wIdx;

            span.addEventListener('mousedown', (e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              isDragging = true;
              dragSlot = sIdx;
              const currentlyHigh = span.classList.contains('active-highlight');
              dragTargetHigh = !currentlyHigh;
              sendHighlightCmd({ slotIndex: sIdx, action: 'SET_HIGHLIGHT', wordIndex: wIdx, state: dragTargetHigh });
            });

            span.addEventListener('mouseenter', () => {
              if (isDragging && dragSlot === sIdx) {
                sendHighlightCmd({ slotIndex: sIdx, action: 'SET_HIGHLIGHT', wordIndex: wIdx, state: dragTargetHigh });
              }
            });

            contentEl.appendChild(span);

            if (wIdx < wordsArr.length - 1 && hasSpaces) {
              const space = document.createElement('span');
              space.textContent = ' ';
              space.classList.add('ndi-space');
              space.dataset.spaceAfter = wIdx;
              contentEl.appendChild(space);
            }
          });
        }

        updateHighlightClasses(contentEl, wordsArr.length, highSet);
        applyBoxTypography(boxEl, data.fonts);
        adjustSlotFontSize(boxEl, baseMaxFont, displayMode);
      });
    }

    function connectWS() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(proto + '//' + (window.location.host || 'localhost:3300'));
      socket.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d && (d.slots || d.words || d.reference)) renderHighlighterState(d);
        } catch (e) {}
      };
      socket.onclose = () => setTimeout(connectWS, 1000);
    }
    connectWS();
    window.addEventListener('resize', () => { if (lastState) renderHighlighterState(lastState); });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(operatorDir, 'highlighter.html'), highlighterBasedOnOutput, 'utf8');
if (fs.existsSync(outputDir)) {
  fs.writeFileSync(path.join(outputDir, 'highlighter.html'), highlighterBasedOnOutput, 'utf8');
}
console.log('Restored highlighter.html based on output.html!');

// ============================================================================
// 2. UPDATE SLOT OPERATOR (slotoperator.html) WITH:
//    - Guaranteed WebSocket + HTTP Connection
//    - Strict Slot Locking (Occupied slots are LOCKED and cannot be selected)
//    - Built-in Verse History Panel per Slot Operator
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
    .login-title {
      font-size: 20px;
      font-weight: 800;
      color: #facc15;
      margin: 0 0 6px 0;
    }
    .login-sub {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 18px 0;
    }
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
    .form-select option:disabled {
      color: #ef4444;
      background: #1e1b2e;
      font-weight: 700;
    }
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
    }

    /* Main Split Workspace: Left = Verse Monitor, Right = Verse History */
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
    .slave-ref-title { font-size: 20px; font-weight: 800; color: #facc15; }
    .slave-ver-sub { font-size: 13px; font-weight: 700; color: #38bdf8; }
    .slave-verse-body {
      flex: 1;
      padding: 28px;
      font-size: 26px;
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
    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .history-item {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }
    .history-item:hover {
      background: #334155;
      border-color: #38bdf8;
    }
    .history-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      font-weight: 800;
      color: #38bdf8;
      margin-bottom: 3px;
    }
    .history-item-ver {
      font-size: 10.5px;
      color: #facc15;
      font-weight: 700;
    }
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
  </style>
</head>
<body>
  <!-- LOGIN GATE MODAL WITH REAL-TIME SLOT LOCKING -->
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
          <option value="0">Slot 1 (Checking...)</option>
          <option value="1">Slot 2 (Checking...)</option>
          <option value="2">Slot 3 (Checking...)</option>
          <option value="3">Slot 4 (Checking...)</option>
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
  <main class="slave-workspace">
    <div class="slave-card">
      <div class="slave-card-header">
        <div>
          <div class="slave-ref-title" id="dispRef">GENESIS 1:1</div>
          <div class="slave-ver-sub" id="dispVer">ANG DATING BIBLIA</div>
        </div>
        <div id="liveStatusBadge" style="font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px; background:#334155; color:#cbd5e1;">
          CONNECTED TO OPERATOR
        </div>
      </div>
      <div class="slave-verse-body" id="dispBody">
        Naghihintay ng verse data mula sa Main Operator...
      </div>
    </div>

    <!-- VERSE HISTORY PANEL -->
    <aside class="history-panel">
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
    Shortcut: Pindutin ang <b>Enter</b> para mag-type ng talata, o gamitin ang <b>◀ Left</b> at <b>Right ▶</b> arrow keys para lumipat ng talata.
  </footer>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const initialSlotParam = parseInt(urlParams.get('slot'), 10);
    let mySlotIdx = (!isNaN(initialSlotParam) && initialSlotParam >= 1 && initialSlotParam <= 4) ? (initialSlotParam - 1) : 0;
    let myOperatorName = sessionStorage.getItem('bible_slave_op_name') || '';
    const myClientId = sessionStorage.getItem('bible_slave_client_id') || ('pilot_' + Math.random().toString(36).slice(2, 10));
    sessionStorage.setItem('bible_slave_client_id', myClientId);

    let isLoggedIn = false;
    let ws = null;
    let heartbeatTimer = null;
    let currentPilotsMap = { 0: null, 1: null, 2: null, 3: null };
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

    opSlotSelect.value = String(mySlotIdx);
    if (myOperatorName) opNameInput.value = myOperatorName;

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
      currentPilotsMap = pilotsObj;
      const now = Date.now();
      let availableCount = 0;

      Array.from(opSlotSelect.options).forEach((opt, idx) => {
        const p = pilotsObj[idx];
        const isOccupiedByOther = p && p.name && (now - (p.lastSeen || now) < 12000) && p.clientId !== myClientId;
        if (isOccupiedByOther) {
          opt.disabled = true;
          opt.textContent = \`🔒 Slot \${idx + 1} — LOCKED (Pilot: \${p.name})\`;
        } else {
          opt.disabled = false;
          opt.textContent = \`🟢 Slot \${idx + 1} — Available\`;
          availableCount++;
        }
      });

      // Kung ang kasalukuyang naka-select sa dropdown ay na-lock na ng iba, ilipat sa unang available slot
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
        transId: transId || transSelect.value,
        text: textPreview,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      if (slotHistory.length > 80) slotHistory.pop();
      localStorage.setItem('bible_slave_history_' + mySlotIdx, JSON.stringify(slotHistory));
      renderHistoryList();
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
        div.addEventListener('click', () => {
          if (item.transId && item.transId !== transSelect.value) {
            transSelect.value = item.transId;
            sendSlavePacket({ action: 'CHANGE_TRANS', transId: item.transId, versionName: item.version });
          }
          sendSlavePacket({ action: 'QUERY_VERSE', query: item.reference });
        });
        histList.appendChild(div);
      });
    }

    histFilterInput.addEventListener('input', renderHistoryList);
    clearHistBtn.addEventListener('click', () => {
      slotHistory = [];
      localStorage.removeItem('bible_slave_history_' + mySlotIdx);
      renderHistoryList();
    });

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

    function applyIncomingState(data) {
      if (!data) return;
      if (data.pilots) {
        updateSlotDropdownLocks(data.pilots);
      }
      const sourceSlots = data.allSlots || data.slots;
      if (Array.isArray(sourceSlots)) {
        const slotObj = sourceSlots[mySlotIdx];
        if (slotObj) {
          const ref = slotObj.reference || 'GENESIS 1:1';
          const ver = slotObj.version || 'ANG DATING BIBLIA';
          const words = slotObj.words || [];

          dispRef.textContent = ref;
          dispVer.textContent = ver;
          if (slotObj.transId && transSelect.value !== slotObj.transId) {
            transSelect.value = slotObj.transId;
          }
          const highSet = new Set(slotObj.highlighted || []);
          dispBody.innerHTML = words.map((w, i) =>
            highSet.has(i) ? '<span class="slave-word-high">' + w + '</span>' : w
          ).join(slotObj.hasSpaces === false ? '' : ' ');

          if (isLoggedIn && words.length > 0) {
            addVerseToHistory(ref, ver, slotObj.transId, words);
          }

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

      ws.onopen = () => {
        if (isLoggedIn) sendSlavePacket({ action: 'JOIN' });
      };

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

    // Poll /api/pilots para laging updated ang lock status sa login gate
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

      // Double check sa server kung libre ang slot
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
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'SELECT') return;
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
</html>`;

fs.writeFileSync(path.join(operatorDir, 'slotoperator.html'), slotOpHtml, 'utf8');
console.log('Updated slotoperator.html with Slot Locking & Verse History!');

// ============================================================================
// 3. FIX UNIVERSAL WEBSOCKET + HTTP HOOK INSIDE SERVER / MAIN.JS
//    (Works even when `app` or `wss` is inside a function scope!)
// ============================================================================
const serverFiles = findFiles(__dirname, ['server.js', 'main.js', 'app.js', 'index.js']).filter(
  f => !f.includes('operator') && !f.includes('output') && !f.includes('node_modules')
);

const universalServerHook = `
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
  const portalPath = ${JSON.stringify(path.join(webRootDir, 'portal-home.html'))};

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
        // STRICT LOCK CHECK: Kung may ibang pilot na nakakonekta sa slot na ito, tanggihan!
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

        // Kung nagpalit ng slot ang parehong clientId, bitawan ang dati niyang slot
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

  // Intercept http.createServer so /home, /api/pilots, /api/slave-action ALWAYS work before Express!
  const origCreateServer = http.createServer;
  http.createServer = function(...args) {
    const server = origCreateServer.apply(this, args);

    server.on('request', (req, res) => {
      const urlClean = (req.url || '').split('?')[0];

      if (req.method === 'GET' && (urlClean === '/' || urlClean === '/home' || urlClean === '/index.html')) {
        if (fs.existsSync(portalPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fs.readFileSync(portalPath, 'utf8'));
          return;
        }
      }

      if (req.method === 'GET' && urlClean === '/api/pilots') {
        cleanupExpiredPilots();
        const urlObj = new URL(req.url, 'http://localhost');
        const since = parseInt(urlObj.searchParams.get('since'), 10) || 0;
        const pending = global.__slaveActionQueue.filter(c => c.actionId > since);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          pilots: global.__activeSlotPilots,
          queue: pending,
          state: global.__latestOperatorState
        }));
        return;
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
        return;
      }
    });

    // Ensure our listener runs FIRST before Express's default listener
    const origOn = server.on;
    server.on = function(ev, fn) {
      if (ev === 'request' && server.listeners('request').length > 0) {
        const existingListeners = server.listeners('request').slice();
        server.removeAllListeners('request');
        origOn.call(server, 'request', (req, res) => {
          const u = (req.url || '').split('?')[0];
          if (u === '/' || u === '/home' || u === '/index.html' || u === '/api/pilots' || u === '/api/slave-action') {
            existingListeners[0].call(server, req, res);
            return;
          }
          fn.call(server, req, res);
        });
        return server;
      }
      return origOn.apply(this, arguments);
    };

    return server;
  };

  // Hook into `ws` WebSocketServer so any SLAVE_SLOT_PACKET over WebSocket is also processed & broadcast!
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
})();
// === UNIVERSAL PILOT LOCK & RELAY HOOK END ===
`;

serverFiles.forEach(srvPath => {
  let srv = fs.readFileSync(srvPath, 'utf8');
  if (!srv.includes('express') && !srv.includes('createServer') && !srv.includes('WebSocket')) return;

  srv = srv.replace(/\/\/ === UNIVERSAL PILOT LOCK & RELAY HOOK START ===[\s\S]*?\/\/ === UNIVERSAL PILOT LOCK & RELAY HOOK END ===/g, '');
  srv = universalServerHook + '\n' + srv;
  fs.writeFileSync(srvPath, srv, 'utf8');
  console.log('Injected Universal Pilot Hook at top of:', srvPath);
});

// ============================================================================
// 4. UPDATE MAIN OPERATOR (operator.js) TO SYNC STATE & DISPLAY CONNECTED PILOTS IMMEDIATELY
// ============================================================================
let opJs = fs.readFileSync(opJsPath, 'utf8');

opJs = opJs.replace(/\/\/ === MULTI-USER SLAVE HUB START ===[\s\S]*?\/\/ === MULTI-USER SLAVE HUB END ===/g, '');

const mainOperatorSlaveEngine = `
// === MULTI-USER SLAVE HUB START ===
(function initMainOperatorSlaveHub() {
  const connectedPilots = { 0: null, 1: null, 2: null, 3: null };
  let lastProcessedActionId = 0;
  let adminSocket = null;

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

  // Siguraduhing may pilot badge sa bawat Slot Header
  function ensurePilotBadgesExist() {
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
  }
  ensurePilotBadgesExist();

  function renderPilotBadges() {
    ensurePilotBadgesExist();
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      const pill = document.getElementById(\`slotPilotBadge\${i}\`);
      if (!pill) continue;
      const info = connectedPilots[i];
      if (info && info.name && (now - (info.lastSeen || now) < 10000)) {
        pill.className = 'pilot-status-pill connected';
        pill.textContent = \`🔒 Pilot: \${info.name}\`;
        pill.title = \`Slot \${i + 1} is locked and piloted by \${info.name}\`;
      } else {
        connectedPilots[i] = null;
        pill.className = 'pilot-status-pill';
        pill.textContent = '👤 No Pilot';
        pill.title = 'Available — Walang nakakonektang Slot Operator';
      }
    }
  }

  function applyServerPilotsMap(pilotsMap) {
    if (!pilotsMap) return;
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      const p = pilotsMap[i];
      if (p && p.name && (now - (p.lastSeen || now) < 10000)) {
        connectedPilots[i] = { name: p.name, lastSeen: p.lastSeen || now };
      } else {
        connectedPilots[i] = null;
      }
    }
    renderPilotBadges();
  }

  async function executeSlaveCommand(packet) {
    if (!packet) return;
    if (packet.actionId && packet.actionId <= lastProcessedActionId) return;
    if (packet.actionId) lastProcessedActionId = packet.actionId;

    const sIdx = parseInt(packet.slotIndex, 10);
    if (isNaN(sIdx) || sIdx < 0 || sIdx > 3) return;

    if (packet.operatorName) {
      if (packet.action === 'LEAVE') {
        connectedPilots[sIdx] = null;
      } else {
        connectedPilots[sIdx] = { name: packet.operatorName, lastSeen: Date.now() };
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
    } else if (packet.action === 'SET_HIGHLIGHT' && typeof packet.wordIndex === 'number') {
      toggleSlotWord(sIdx, packet.wordIndex, Boolean(packet.state));
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

  // Push current state to HTTP server as well so Slot Operators always get live verse & history
  const origSyncState = window.syncState;
  if (typeof origSyncState === 'function' && !origSyncState.__wrappedForSlaves) {
    window.syncState = function(...args) {
      origSyncState.apply(this, args);
      try {
        const serializedSlots = slots.map(s => ({
          transId: s.transId || '001',
          reference: s.reference || 'GENESIS 1:1',
          version: s.versionName || 'ANG DATING BIBLIA',
          words: s.words || [],
          hasSpaces: s.hasSpaces !== false,
          highlighted: Array.from(s.highlighted)
        }));
        const baseUrl = window.location.protocol === 'file:' ? '' : '';
        fetch(baseUrl + '/api/slave-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'OPERATOR_STATE_SYNC',
            state: { displayMode: outputDisplayMode, slots: serializedSlots, allSlots: serializedSlots }
          })
        }).catch(() => {});
      } catch (e) {}
    };
    window.syncState.__wrappedForSlaves = true;
  }

  // 1) Real-time WebSocket Listener
  function connectAdminWS() {
    const wsHost = (window.location.protocol === 'file:' || !window.location.host) ? '127.0.0.1:3300' : window.location.host;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    adminSocket = new WebSocket(proto + '//' + wsHost);
    adminSocket.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.type === 'PILOT_LOCK_STATE') {
          if (d.pilots) applyServerPilotsMap(d.pilots);
          if (d.packet) executeSlaveCommand(d.packet);
        } else if (d.type === 'SLAVE_SLOT_PACKET') {
          executeSlaveCommand(d);
        }
      } catch (e) {}
    };
    adminSocket.onclose = () => setTimeout(connectAdminWS, 1200);
  }
  connectAdminWS();

  // 2) Guaranteed HTTP Polling Backup every 600ms
  async function pollPilotsHttp() {
    try {
      const baseUrl = window.location.protocol === 'file:' ? '' : '';
      const res = await fetch(baseUrl + '/api/pilots?since=' + lastProcessedActionId);
      const data = await res.json();
      if (data && data.pilots) {
        applyServerPilotsMap(data.pilots);
      }
      if (data && Array.isArray(data.queue)) {
        for (const cmd of data.queue) {
          await executeSlaveCommand(cmd);
        }
      }
    } catch (e) {}
  }
  setInterval(pollPilotsHttp, 600);
  setTimeout(() => { if (typeof window.syncState === 'function') window.syncState(); }, 800);
})();
// === MULTI-USER SLAVE HUB END ===
`;

opJs = opJs.trimEnd() + '\n' + mainOperatorSlaveEngine + '\n';
fs.writeFileSync(opJsPath, opJs, 'utf8');

console.log('\n====================================================================');
console.log('✅ NA-RESTORE NA ANG HIGHLIGHTER AT NA-FIX NA ANG SLOT OPERATORS!');
console.log('1. Highlighter.html -> Balik na sa Output.html layout.');
console.log('2. Slot Operators   -> 100% Connected na sa Main Operator Panel.');
console.log('3. Slot Locking     -> Kapag may Pilot na sa Slot 1, LOCKED na ito sa iba (3 available na lang).');
console.log('4. Verse History    -> May sariling Verse History sidebar na ang Slot Operators.');
console.log('====================================================================\n');
