const fs = require('fs');
const path = require('path');

const sourceAppDir = path.join('C:', 'bible-ndi-app');
const targetDir = path.join('C:', 'bible-html5-app');
const opDir = path.join(targetDir, 'operator');
const outDir = path.join(targetDir, 'output');
const dataDir = path.join(targetDir, 'data');
const transDir = path.join(dataDir, 'translations');

[targetDir, opDir, outDir, dataDir, transDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 1. HANAPIN AT KOPYAHIN ANG BIBLE TRANSLATIONS
function findTranslationsFolder(base) {
  const direct = [
    path.join(base, 'src', 'data', 'translations'),
    path.join(base, 'data', 'translations'),
    path.join(base, 'translations'),
    path.join(base, 'src', 'translations')
  ];
  for (const p of direct) {
    if (fs.existsSync(p) && fs.readdirSync(p).some(f => f.endsWith('.json'))) return p;
  }
  return null;
}

const foundTransDir = findTranslationsFolder(sourceAppDir);
let manifestList = [];

if (foundTransDir) {
  const files = fs.readdirSync(foundTransDir).filter(f => f.endsWith('.json'));
  files.forEach(f => {
    fs.copyFileSync(path.join(foundTransDir, f), path.join(transDir, f));
    const id = f.replace('.json', '');
    let name = id.toUpperCase();
    if (id === '001') name = 'ANG DATING BIBLIA';
    manifestList.push({ id, name, file: f });
  });
  console.log(`✓ Na-kopya ang ${files.length} translations mula sa ${foundTransDir}`);
} else {
  console.warn('⚠️ Hindi nahanap ang translations folder, gagawa ng default Genesis 1:1 backup...');
  const fallback001 = {
    "GENESIS": {
      "1": {
        "1": "Nang pasimula ay nilikha ng Dios ang langit at ang lupa.",
        "2": "At ang lupa ay walang anyo at walang laman; at ang kadiliman ay sumasa ibabaw ng kalaliman.",
        "3": "At sinabi ng Dios, Magkaroon ng liwanag; at nagkaroon ng liwanag."
      }
    }
  };
  fs.writeFileSync(path.join(transDir, '001.json'), JSON.stringify(fallback001, null, 2), 'utf8');
  manifestList.push({ id: '001', name: 'ANG DATING BIBLIA', file: '001.json' });
}

manifestList.sort((a, b) => (a.name === 'ANG DATING BIBLIA' ? -1 : 1));
fs.writeFileSync(path.join(dataDir, 'translations-manifest.json'), JSON.stringify(manifestList, null, 2), 'utf8');

// ============================================================================
// 2. OUTPUT SCREEN (output.html + output.js)
// ============================================================================
const outputHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible Output Screen</title>
  <style>
    :root {
      --verse-anim-duration: 0.55s;
      --highlight-anim-duration: 0.35s;
      --highlight-bg-color: rgba(250, 204, 21, 0.5);
      --title-verse-gap: 18px;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      width: 100vw; height: 100vh;
      overflow: hidden;
      display: flex; justify-content: center; align-items: center;
      background-color: transparent;
      font-family: Arial, Helvetica, sans-serif;
    }
    #multiSlotStage {
      display: grid;
      gap: 18px;
      width: calc(100vw - 110px);
      height: calc(100vh - 110px);
      transition: width 0.2s ease, height 0.2s ease;
    }
    #multiSlotStage.mode-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
    #multiSlotStage.mode-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
    #multiSlotStage.mode-3 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr; }
    #multiSlotStage.mode-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

    .render-box {
      width: 100%; height: 100%;
      background: rgba(10, 25, 60, 0.78);
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      display: flex; flex-direction: column; justify-content: flex-start;
      overflow: hidden;
      padding: 40px 48px;
      perspective: 1600px;
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
    }
    .reference-title {
      font-size: 38px;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-shadow: 2px 3px 6px rgba(0,0,0,0.85);
    }
    .version-subtitle {
      font-size: 20px;
      font-weight: 700;
      font-style: italic;
      color: #facc15;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
      text-shadow: 2px 3px 6px rgba(0,0,0,0.85);
    }
    .verse-container {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      text-align: center;
      overflow: hidden;
      perspective: 1600px;
      position: relative;
    }
    .verse-text {
      line-height: 1.55;
      color: #ffffff;
      word-break: break-word;
      font-size: 46px;
    }
    .ndi-word, .ndi-space {
      display: inline !important;
      padding: 2px 0px !important;
      text-shadow: 2px 3px 6px rgba(0,0,0,0.85);
      transition: background-color var(--highlight-anim-duration) ease,
                  box-shadow var(--highlight-anim-duration) ease,
                  color var(--highlight-anim-duration) ease;
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

    @keyframes animFadeSlide {
      0% { opacity: 0; transform: translateY(10px); filter: blur(1.5px); }
      100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
    }
    @keyframes animPageFlipNext {
      0% { opacity: 0; transform-origin: left center; transform: perspective(1600px) rotateY(78deg) translateX(25px) scale(0.96); filter: brightness(0.65); }
      100% { opacity: 1; transform-origin: left center; transform: perspective(1600px) rotateY(0deg) translateX(0) scale(1); filter: brightness(1); }
    }
    @keyframes animPageFlipPrev {
      0% { opacity: 0; transform-origin: right center; transform: perspective(1600px) rotateY(-78deg) translateX(-25px) scale(0.96); filter: brightness(0.65); }
      100% { opacity: 1; transform-origin: right center; transform: perspective(1600px) rotateY(0deg) translateX(0) scale(1); filter: brightness(1); }
    }
    @keyframes animVerticalFlip {
      0% { opacity: 0; transform-origin: center top; transform: perspective(1400px) rotateX(-75deg) translateY(-10px); }
      100% { opacity: 1; transform-origin: center top; transform: perspective(1400px) rotateX(0deg) translateY(0); }
    }
    @keyframes animZoomIn {
      0% { opacity: 0; transform: scale(0.92); filter: blur(2px); }
      100% { opacity: 1; transform: scale(1); filter: blur(0px); }
    }
    .anim-fade-slide { animation: animFadeSlide var(--verse-anim-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .anim-page-flip-next { animation: animPageFlipNext var(--verse-anim-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .anim-page-flip-prev { animation: animPageFlipPrev var(--verse-anim-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .anim-vertical-flip { animation: animVerticalFlip var(--verse-anim-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .anim-zoom-in { animation: animZoomIn var(--verse-anim-duration) cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
</head>
<body>
  <div id="multiSlotStage" class="mode-1">
    <div class="render-box" data-slot-box="0">
      <div class="reference-container">
        <div class="reference-title">GENESIS 1:1</div>
        <div class="version-subtitle">ANG DATING BIBLIA</div>
      </div>
      <div class="verse-container">
        <div class="verse-text">Nang pasimula ay nilikha ng Dios ang langit at ang lupa.</div>
      </div>
    </div>
  </div>
  <script src="output.js"></script>
</body>
</html>`;

const outputJs = `let lastReceivedData = null;
const ALL_ANIM_CLASSES = ['anim-fade-slide', 'anim-page-flip-next', 'anim-page-flip-prev', 'anim-vertical-flip', 'anim-zoom-in'];

function applyAnimationVariables(anim) {
  const a = anim || {};
  const verseDur = (a.enabled === false) ? 0 : (parseFloat(a.duration) || 0.55);
  const highDur = (a.highlightAnimEnabled === false) ? 0 : (parseFloat(a.highlightDuration) || 0.35);
  const highOp = (a.highlightOpacity !== undefined) ? parseFloat(a.highlightOpacity) : 0.50;

  document.documentElement.style.setProperty('--verse-anim-duration', \`\${verseDur}s\`);
  document.documentElement.style.setProperty('--highlight-anim-duration', \`\${highDur}s\`);
  document.documentElement.style.setProperty('--highlight-bg-color', \`rgba(250, 204, 21, \${highOp})\`);
}

function triggerVerseAnimation(container, anim, direction) {
  ALL_ANIM_CLASSES.forEach(cls => container.classList.remove(cls));
  const a = anim || {};
  if (a.enabled === false) return;
  void container.offsetWidth;
  const styleType = a.style || 'fadeSlide';
  if (styleType === 'pageFlip') {
    container.classList.add(direction === 'prev' ? 'anim-page-flip-prev' : 'anim-page-flip-next');
  } else if (styleType === 'verticalFlip') {
    container.classList.add('anim-vertical-flip');
  } else if (styleType === 'zoomIn') {
    container.classList.add('anim-zoom-in');
  } else {
    container.classList.add('anim-fade-slide');
  }
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

  const refShadowOn = f.refShadow !== false;
  const verShadowOn = f.verShadow !== false;
  const contentShadowOn = f.contentShadow !== false;

  if (outRefEl) {
    outRefEl.style.setProperty('font-family', f.ref || defaultFont, 'important');
    outRefEl.style.setProperty('font-weight', f.refBold ? '700' : '400', 'important');
    outRefEl.style.setProperty('font-style', f.refItalic ? 'italic' : 'normal', 'important');
    outRefEl.style.setProperty('text-shadow', refShadowOn ? defaultShadow : 'none', 'important');
  }
  if (outVerEl) {
    outVerEl.style.setProperty('font-family', f.version || defaultFont, 'important');
    outVerEl.style.setProperty('font-weight', f.verBold ? '700' : '400', 'important');
    outVerEl.style.setProperty('font-style', f.verItalic ? 'italic' : 'normal', 'important');
    outVerEl.style.setProperty('text-shadow', verShadowOn ? defaultShadow : 'none', 'important');
  }
  if (outContentEl) {
    outContentEl.style.setProperty('font-family', f.content || defaultFont, 'important');
    outContentEl.style.setProperty('font-weight', f.contentBold ? '700' : '400', 'important');
    outContentEl.style.setProperty('font-style', f.contentItalic ? 'italic' : 'normal', 'important');
  }
  boxEl.querySelectorAll('.ndi-word').forEach(span => {
    span.style.setProperty('text-shadow', contentShadowOn ? defaultShadow : 'none', 'important');
  });
}

function renderOutputState(data) {
  if (!data) return;
  lastReceivedData = data;

  if (data.bg === 'transparent') {
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
  } else if (data.bg && data.bg.startsWith('url')) {
    document.body.style.backgroundImage = data.bg;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  } else if (data.bg) {
    document.body.style.backgroundColor = data.bg;
    document.body.style.backgroundImage = 'none';
  }

  applyAnimationVariables(data.animation);
  const s = data.settings || {};
  const pad = (s.boxPadding !== undefined) ? parseInt(s.boxPadding, 10) : 40;
  const outerMargin = (s.screenMargin !== undefined) ? parseInt(s.screenMargin, 10) : 55;
  const hideBoxBg = Boolean(s.hideBoxBg);
  const baseMaxFont = parseInt(s.maxFontSize, 10) || 46;
  const topGapPx = (s.topGap !== undefined) ? parseInt(s.topGap, 10) : 18;
  const displayMode = parseInt(data.displayMode, 10) || 1;

  document.documentElement.style.setProperty('--title-verse-gap', topGapPx + 'px');

  const stage = document.getElementById('multiSlotStage');
  stage.className = \`mode-\${displayMode}\`;
  stage.style.width = \`calc(100vw - \${outerMargin * 2}px)\`;
  stage.style.height = \`calc(100vh - \${outerMargin * 2}px)\`;

  const slotsList = Array.isArray(data.slots) && data.slots.length > 0
    ? data.slots.slice(0, displayMode)
    : [];

  while (stage.children.length > slotsList.length) stage.removeChild(stage.lastChild);
  while (stage.children.length < slotsList.length) {
    const box = document.createElement('div');
    box.className = 'render-box';
    box.innerHTML = \`
      <div class="reference-container">
        <div class="reference-title"></div>
        <div class="version-subtitle"></div>
      </div>
      <div class="verse-container">
        <div class="verse-text"></div>
      </div>
    \`;
    stage.appendChild(box);
  }

  slotsList.forEach((slotData, sIdx) => {
    const boxEl = stage.children[sIdx];
    const padScaled = displayMode > 1 ? Math.max(16, Math.round(pad * 0.65)) : pad;
    boxEl.style.padding = \`\${padScaled}px \${padScaled + 8}px\`;
    boxEl.style.borderRadius = outerMargin === 0 && displayMode === 1 ? '0px' : '14px';
    boxEl.classList.toggle('transparent-verse-box', hideBoxBg);

    const refEl = boxEl.querySelector('.reference-title');
    const verEl = boxEl.querySelector('.version-subtitle');
    const contentEl = boxEl.querySelector('.verse-text');

    refEl.textContent = slotData.reference || '';
    verEl.textContent = slotData.version || '';

    const wordsArr = slotData.words || [];
    const hasSpaces = slotData.hasSpaces !== false;
    const highSet = new Set(slotData.highlighted || []);

    const newVerseKey = (slotData.reference || '') + '|' + (slotData.version || '') + '|' + wordsArr.join(' ');
    if (contentEl.dataset.verseKey !== newVerseKey || data.forcePreviewAnim) {
      contentEl.dataset.verseKey = newVerseKey;
      contentEl.innerHTML = '';
      triggerVerseAnimation(contentEl, data.animation, data.navDirection || 'next');

      wordsArr.forEach((word, wIdx) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('ndi-word');
        span.dataset.idx = wIdx;
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

// 1. BroadcastChannel Listener (Tabs in same browser)
try {
  const bc = new BroadcastChannel('bible_live_stream');
  bc.onmessage = (e) => { if (e.data) renderOutputState(e.data); };
} catch (e) {}

// 2. LocalStorage Event (Tabs/Windows)
window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch (err) {}
  }
});

// 3. OBS CEF Realtime Poller (80ms interval ensures OBS gets live updates)
let lastTimestampSeen = 0;
setInterval(() => {
  const ts = localStorage.getItem('bible_live_timestamp');
  if (ts && ts !== String(lastTimestampSeen)) {
    lastTimestampSeen = ts;
    const raw = localStorage.getItem('bible_live_payload');
    if (raw) {
      try { renderOutputState(JSON.parse(raw)); } catch (err) {}
    }
  }
}, 80);

// Auto load cached state on launch
const savedInit = localStorage.getItem('bible_live_payload');
if (savedInit) {
  try { renderOutputState(JSON.parse(savedInit)); } catch (err) {}
}

window.addEventListener('resize', () => {
  if (lastReceivedData) renderOutputState(lastReceivedData);
});`;

fs.writeFileSync(path.join(outDir, 'output.html'), outputHtml, 'utf8');
fs.writeFileSync(path.join(outDir, 'output.js'), outputJs, 'utf8');

// ============================================================================
// 3. OPERATOR INTERFACE (Self-Contained UI + HTML5 Engine)
// ============================================================================
const operatorHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible Operator Panel (HTML5)</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      width: 100vw; height: 100vh;
      overflow: hidden !important;
      background: #141c2b;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      display: flex; flex-direction: column;
    }
    .op-header {
      background: #0b111e;
      border-bottom: 1px solid #1e293b;
      padding: 10px 160px 4px 16px;
      display: flex; flex-direction: column; gap: 8px;
      flex-shrink: 0;
    }
    .op-row-1 { display: none !important; }
    .op-row-2 {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .op-row-3 {
      display: flex; align-items: center; justify-content: space-between;
      border-top: 1px solid #1e293b;
      padding-top: 6px; margin-top: 2px;
      margin-right: -145px; padding-right: 145px;
    }
    .ctrl-label {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; color: #e2e8f0; cursor: pointer; user-select: none;
    }
    #bgColor {
      width: 38px; height: 26px; border: 1px solid #94a3b8; border-radius: 4px;
      padding: 0; background: none; cursor: pointer;
    }
    .std-btn, .btn-yellow, .btn-orange {
      padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;
      border: 1px solid transparent; transition: all 0.15s ease;
    }
    .std-btn { background: #1e293b; color: #f8fafc; border-color: #334155; }
    .std-btn:hover { background: #334155; }
    .btn-yellow { background: #facc15; color: #0f172a; border-color: #eab308; }
    .btn-yellow:hover { background: #fde047; }
    .btn-orange { background: #f97316; color: #ffffff; border-color: #ea580c; }
    .btn-orange:hover { background: #fb923c; }

    .mode-group { display: flex; align-items: center; gap: 6px; }
    .mode-label { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; margin-right: 4px; }
    .mode-pill {
      background: #1e293b; color: #cbd5e1; border: 1px solid #334155;
      padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .mode-pill:hover { background: #334155; }
    .mode-pill.active { background: #2563eb; color: #ffffff; border-color: #3b82f6; }
    .workspace-status { font-size: 12px; color: #94a3b8; }
    .workspace-status strong { color: #38bdf8; }

    .workspace-grid {
      flex: 1; display: grid;
      grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
      gap: 12px; padding: 12px 16px 6px 16px; overflow: hidden;
    }
    .slot-card {
      background: #0d1322; border: 1px solid #1e293b; border-radius: 8px;
      display: flex; flex-direction: column; overflow: hidden; cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .slot-card.active-slot {
      border: 2px solid #facc15 !important;
      box-shadow: 0 0 14px rgba(250, 204, 21, 0.2);
    }
    .slot-card.drag-over { border: 2px dashed #38bdf8 !important; }
    .slot-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 12px; background: rgba(15, 23, 42, 0.7);
      border-bottom: 1px solid #1e293b; min-height: 36px; flex-shrink: 0;
    }
    .slot-left-meta { display: flex; align-items: center; gap: 8px; }
    .drag-dots { color: #64748b; font-size: 16px; cursor: grab; user-select: none; }
    .slot-title { font-size: 12px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.4px; }
    .slot-card.active-slot .slot-title { color: #facc15; }
    .slot-badge {
      font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px;
      letter-spacing: 0.4px; text-transform: uppercase;
    }
    .slot-badge.live { background: #ef4444; color: #ffffff; }
    .slot-badge.staging { background: #334155; color: #94a3b8; }
    .slot-center-nav { display: flex; gap: 4px; }
    .mini-nav-btn {
      background: transparent; color: #facc15; border: 1px solid #ca8a04;
      border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer;
    }
    .mini-nav-btn:hover { background: rgba(250, 204, 21, 0.2); }
    .focus-badge {
      font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px;
      background: #1e293b; color: #64748b; text-transform: uppercase;
    }
    .focus-badge.editing { background: #facc15; color: #0f172a; }

    .slot-canvas {
      flex: 1; padding: 16px 20px; font-size: 21px; line-height: 1.75;
      text-align: center; overflow-y: auto; color: #cbd5e1; user-select: none;
    }
    .slot-card.active-slot .slot-canvas { color: #ffffff; }
    .word-span, .space-span {
      display: inline; padding: 2px 0; border-radius: 4px; transition: all 0.15s ease;
    }
    .word-span { cursor: pointer; }
    .word-span:hover { background: rgba(255,255,255,0.14); }
    .word-span.highlighted, .space-span.highlighted {
      background: rgba(250, 204, 21, 0.88) !important;
      color: #0f172a !important;
      box-shadow: 0 0 8px 2px rgba(250, 204, 21, 0.45);
    }
    .op-footer {
      text-align: center; font-size: 11.5px; color: #94a3b8;
      padding: 5px 0 7px 0; flex-shrink: 0;
    }
  </style>
</head>
<body>
  <!-- HEADER CONTROLS -->
  <header class="op-header">
    <div class="op-row-2">
      <label class="ctrl-label">BG: <input type="color" id="bgColor" value="#004cff"></label>
      <input type="file" id="bgImageInput" accept="image/*" style="display: none;">
      <button id="uploadImgBtn" class="std-btn" type="button">Upload BG</button>

      <label class="ctrl-label"><input type="checkbox" id="transparentToggle"> Transparent BG</label>
      <label class="ctrl-label"><input type="checkbox" id="hideVerseBoxToggle"> Hide Verse Box</label>

      <button id="searchWordBtn" class="std-btn">🔍 Search Word</button>
      <button id="clearHighlightsBtn" class="btn-yellow">Remove Highlight</button>
      <button id="clearAllHighlightsBtn" class="btn-orange">Remove All Highlights</button>
    </div>

    <div class="op-row-3">
      <div class="mode-group">
        <span class="mode-label">OUTPUT DISPLAY MODE:</span>
        <button type="button" class="mode-pill active" data-mode="1">1 Full (Slot 1 Live)</button>
        <button type="button" class="mode-pill" data-mode="2">2 Split (Side-by-Side)</button>
        <button type="button" class="mode-pill" data-mode="3">3 Split</button>
        <button type="button" class="mode-pill" data-mode="4">4 Grid (2x2)</button>
      </div>
      <div class="workspace-status">
        Operator Screen: <strong>Permanent 4-Slot Workspace (HTML5)</strong>
      </div>
    </div>
  </header>

  <!-- 4-SLOT WORKSPACE -->
  <main class="workspace-grid" id="workspaceGrid">
    <div class="slot-card active-slot" data-slot="0" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle0">Slot 1: GENESIS 1:1</span>
          <span class="slot-badge live" id="slotBadge0">● LIVE</span>
        </div>
        <div class="slot-center-nav" id="slotNav0">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="0">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="0">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge editing" id="slotFocus0">• EDITING</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas0"></div>
    </div>

    <div class="slot-card" data-slot="1" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle1">Slot 2: GENESIS 1:1</span>
          <span class="slot-badge staging" id="slotBadge1">● STAGING</span>
        </div>
        <div class="slot-center-nav" id="slotNav1" style="display:none;">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="1">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="1">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge" id="slotFocus1">CLICK TO FOCUS</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas1"></div>
    </div>

    <div class="slot-card" data-slot="2" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle2">Slot 3: GENESIS 1:2</span>
          <span class="slot-badge staging" id="slotBadge2">● STAGING</span>
        </div>
        <div class="slot-center-nav" id="slotNav2" style="display:none;">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="2">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="2">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge" id="slotFocus2">CLICK TO FOCUS</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas2"></div>
    </div>

    <div class="slot-card" data-slot="3" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle3">Slot 4: GENESIS 1:3</span>
          <span class="slot-badge staging" id="slotBadge3">● STAGING</span>
        </div>
        <div class="slot-center-nav" id="slotNav3" style="display:none;">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="3">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="3">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge" id="slotFocus3">CLICK TO FOCUS</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas3"></div>
    </div>
  </main>

  <footer class="op-footer">
    💡 Tip: Mag-Right Click sa kahit anong Slot para magpalit ng Verse (o pindutin ang <b>Enter</b>), magpalit ng Translation, Copy/Paste Slot, o tingnan ang History.
  </footer>

  <script src="operator.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(opDir, 'index.html'), operatorHtml, 'utf8');

// ============================================================================
// 4. KUNIN AT AYUSIN ANG OPERATOR.JS (Pure HTML5 Sync)
// ============================================================================
const sourceOperatorJs = path.join(sourceAppDir, 'src', 'operator', 'operator.js');
let opCode = fs.readFileSync(sourceOperatorJs, 'utf8');

// Alisin ang window.electronAPI at palitan ng HTML5 BroadcastChannel + LocalStorage
opCode = opCode.replace(
  /window\.electronAPI\.sendVerse\([\s\S]*?\n\s*\}\);/,
  `try {
    const bibleChannel = new BroadcastChannel('bible_live_stream');
    const payload = {
      displayMode: outputDisplayMode,
      slots: serializedSlots,
      reference: slot0.reference,
      version: slot0.version,
      words: slot0.words,
      hasSpaces: slot0.hasSpaces,
      highlighted: slot0.highlighted,
      bg: bgToSend,
      fonts: fontsToSend,
      animation: animCfg,
      navDirection: window.lastNavDirection || 'next',
      forcePreviewAnim: Boolean(forcePreviewAnim),
      settings: {
        topGap: (layoutCfg.topGap !== undefined ? layoutCfg.topGap : 18) + 'px',
        boxPadding: layoutCfg.boxPadding,
        screenMargin: layoutCfg.screenMargin,
        maxFontSize: layoutCfg.maxFontSize,
        hideBoxBg: layoutCfg.hideBoxBg
      }
    };
    bibleChannel.postMessage(payload);
    localStorage.setItem('bible_live_payload', JSON.stringify(payload));
    localStorage.setItem('bible_live_timestamp', String(Date.now()));
  } catch(e) { console.error('Broadcast error:', e); }`
);

// I-load ang translations mula sa static JSON manifest
opCode = opCode.replace(
  /let port = 3000;[\s\S]*?translationsMetaList = await res\.json\(\);/,
  `const res = await fetch('../data/translations-manifest.json');
  translationsMetaList = await res.json();`
);

// Siguraduhing safe ang fetch path ng bawat translation
opCode = opCode.replace(
  /fetch\(`\.\.\/data\/translations\/\${transId}\.json`\)/g,
  `fetch(\`../data/translations/\${transId}.json\`)`
);

// Palitan ang Settings modal para maging direct launcher ng Output Screen
opCode = opCode.replace(
  /<div class="lan-modal-box">[\s\S]*?Full path: <code id="lanFullUrlText"[\s\S]*?<\/div>/,
  `<div class="lan-modal-box">
      <div class="lan-modal-header">
        <span>⚙️ HTML5 Output Screen Controls</span>
        <button type="button" class="lan-close-x" id="lanCloseX">×</button>
      </div>
      <div class="lan-row">
        <div class="lan-label-col">Output Screen:</div>
        <button type="button" class="lan-btn primary" id="openOutputWindowBtn" style="padding: 9px 18px; font-size: 13px;">
          🖥️ Open Output Window in New Tab
        </button>
      </div>
      <div style="font-size:12px; color:#94a3b8; margin-left:160px; margin-top:4px;">
        💡 Tip: Ilagay ang address ng <code>output/output.html</code> sa OBS Studio bilang <b>Browser Source</b> (Width: 1920, Height: 1080).
      </div>`
);

opCode = opCode.replace(
  /gearBtn\.addEventListener\('click'[\s\S]*?lanApplyBtn'\)\.addEventListener\('click'[\s\S]*?\}\);/g,
  `gearBtn.addEventListener('click', () => { lanModal.classList.add('open'); });
  document.getElementById('lanCloseX').addEventListener('click', () => lanModal.classList.remove('open'));
  lanModal.addEventListener('click', (e) => { if (e.target === lanModal) lanModal.classList.remove('open'); });
  const openOutBtn = document.getElementById('openOutputWindowBtn');
  if (openOutBtn) {
    openOutBtn.addEventListener('click', () => {
      window.open('../output/output.html', '_blank', 'width=1280,height=720');
      lanModal.classList.remove('open');
    });
  }`
);

// Alisin ang anumang natitirang unhandled call sa electronAPI
opCode = opCode.replace(/window\.electronAPI\.[a-zA-Z0-9_]+\([^\)]*\)/g, 'void 0');

fs.writeFileSync(path.join(opDir, 'operator.js'), opCode, 'utf8');

// 5. ROOT QUICK LAUNCHER (index.html)
const rootLauncherHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible App Launcher (HTML5)</title>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    h1 { color: #facc15; margin-bottom: 24px; font-size: 26px; }
    .btn-container { display: flex; gap: 16px; }
    a { padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; transition: transform 0.15s ease; }
    a:hover { transform: translateY(-2px); }
    .btn-op { background: #2563eb; color: #ffffff; }
    .btn-out { background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; }
  </style>
</head>
<body>
  <h1>Custom Bible App (HTML5 Web Version)</h1>
  <div class="btn-container">
    <a href="operator/index.html" class="btn-op">🎛️ Open Operator Panel</a>
    <a href="output/output.html" target="_blank" class="btn-out">🖥️ Open Output Screen</a>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(targetDir, 'index.html'), rootLauncherHtml, 'utf8');

console.log('\n========================================');
console.log('✓ MATAGUMPAY NA NA-REPAIR ANG HTML5 VERSION!');
console.log('Location: C:\\bible-html5-app');
console.log('========================================\n');