const fs = require('fs');
const path = require('path');

// Siguraduhing eksakto ang source at target directories
const sourceAppDir = path.join('C:', 'bible-ndi-app');
const targetDir = path.join('C:', 'bible-html5-app');

const opDir = path.join(targetDir, 'operator');
const outDir = path.join(targetDir, 'output');
const dataDir = path.join(targetDir, 'data');
const transDir = path.join(dataDir, 'translations');

// 1. Gumawa ng target folders
[targetDir, opDir, outDir, dataDir, transDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 2. Kopyahin ang translations mula C:\bible-ndi-app\data\translations
const sourceTransDir = path.join(sourceAppDir, 'data', 'translations');
let manifestList = [];

if (fs.existsSync(sourceTransDir)) {
  const files = fs.readdirSync(sourceTransDir).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    const srcPath = path.join(sourceTransDir, file);
    const destPath = path.join(transDir, file);
    fs.copyFileSync(srcPath, destPath);

    const baseName = file.replace('.json', '');
    let displayName = baseName;
    if (baseName === '001') displayName = 'ANG DATING BIBLIA';
    manifestList.push({ id: baseName, name: displayName, file: file });
  });
  console.log(`Na-kopya ang ${manifestList.length} translations mula sa ${sourceTransDir}`);
} else {
  console.error(`PANSININ: Hindi nahanap ang translations folder sa ${sourceTransDir}`);
}

manifestList.sort((a, b) => (a.name === 'ANG DATING BIBLIA' ? -1 : 1));
fs.writeFileSync(path.join(dataDir, 'translations-manifest.json'), JSON.stringify(manifestList, null, 2), 'utf8');

// ============================================================================
// 3. I-GENERATE ANG OUTPUT.HTML & OUTPUT.JS
// ============================================================================
const outputHtmlContent = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible Output Screen (HTML5)</title>
  <style>
    :root {
      --verse-anim-duration: 0.55s;
      --highlight-anim-duration: 0.35s;
      --highlight-bg-color: rgba(250, 204, 21, 0.5);
      --title-verse-gap: 18px;
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
      background-color: transparent;
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
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      box-sizing: border-box;
      overflow: hidden;
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
    }
    .version-subtitle {
      font-size: 20px;
      font-weight: 700;
      font-style: italic;
      color: #facc15;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }
    .verse-container {
      flex: 1;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      text-align: center;
      overflow: hidden;
      perspective: 1600px;
      transform-style: preserve-3d;
      position: relative;
    }
    .verse-text {
      line-height: 1.55;
      color: #ffffff;
      word-break: break-word;
      transform: translateZ(0);
    }
    .ndi-word, .ndi-space {
      display: inline !important;
      padding: 2px 0px !important;
      transition: background-color var(--highlight-anim-duration) cubic-bezier(0.4, 0, 0.2, 1),
                  box-shadow var(--highlight-anim-duration) cubic-bezier(0.4, 0, 0.2, 1),
                  color var(--highlight-anim-duration) cubic-bezier(0.4, 0, 0.2, 1) !important;
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
  <div id="multiSlotStage" class="mode-1"></div>
  <script src="output.js"></script>
</body>
</html>`;

const outputJsContent = `let lastReceivedData = null;
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

// HTML5 BroadcastChannel + LocalStorage Dual Listener
const bibleChannel = new BroadcastChannel('bible_live_stream');
bibleChannel.onmessage = (e) => renderOutputState(e.data);

window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch (err) {}
  }
});

const savedInitialState = localStorage.getItem('bible_live_payload');
if (savedInitialState) {
  try { renderOutputState(JSON.parse(savedInitialState)); } catch (err) {}
}

window.addEventListener('resize', () => {
  if (lastReceivedData) renderOutputState(lastReceivedData);
});`;

fs.writeFileSync(path.join(outDir, 'output.html'), outputHtmlContent, 'utf8');
fs.writeFileSync(path.join(outDir, 'output.js'), outputJsContent, 'utf8');

// ============================================================================
// 4. KUNIN AT I-ADAPT ANG OPERATOR FILES MULA C:\bible-ndi-app
// ============================================================================
const sourceIndexHtml = path.join(sourceAppDir, 'src', 'operator', 'index.html');
const sourceOperatorJs = path.join(sourceAppDir, 'src', 'operator', 'operator.js');

if (!fs.existsSync(sourceIndexHtml) || !fs.existsSync(sourceOperatorJs)) {
  console.error(`ERROR: Hindi nahanap ang operator source files sa ${sourceAppDir}`);
  process.exit(1);
}

const electronOpHtml = fs.readFileSync(sourceIndexHtml, 'utf8');
let html5OpJs = fs.readFileSync(sourceOperatorJs, 'utf8');

// A. Palitan ang window.electronAPI.sendVerse(...) ng BroadcastChannel + LocalStorage
html5OpJs = html5OpJs.replace(
  /window\.electronAPI\.sendVerse\([\s\S]*?\n\s*\}\);/,
  `const bibleChannel = new BroadcastChannel('bible_live_stream');
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
  localStorage.setItem('bible_live_payload', JSON.stringify(payload));`
);

// B. I-update ang pagbasa ng translations mula manifest file
html5OpJs = html5OpJs.replace(
  /const res = await fetch\(`http:\/\/127\.0\.0\.1:\${port}\/api\/translations`\);[\s\S]*?translationsMetaList = await res\.json\(\);/,
  `const res = await fetch('../data/translations-manifest.json');
  translationsMetaList = await res.json();`
);

// C. Palitan ang LAN Settings modal para maging direct "Open Output Screen" controls
html5OpJs = html5OpJs.replace(
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
        Tip: Pwede mong ilagay ang link ng <code>output/output.html</code> direkta sa OBS Studio bilang Browser Source.
      </div>`
);

html5OpJs = html5OpJs.replace(
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

fs.writeFileSync(path.join(opDir, 'index.html'), electronOpHtml, 'utf8');
fs.writeFileSync(path.join(opDir, 'operator.js'), html5OpJs, 'utf8');

// 5. Root Launcher
const rootLauncherHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bible App Launcher (HTML5)</title>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    h1 { color: #facc15; margin-bottom: 24px; }
    .btn-container { display: flex; gap: 16px; }
    a { padding: 14px 26px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; }
    .btn-op { background: #2563eb; color: #ffffff; }
    .btn-out { background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; }
    a:hover { opacity: 0.9; }
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

console.log('MATAGUMPAY NA NA-BUILD ANG HTML5 VERSION SA: C:\\bible-html5-app');