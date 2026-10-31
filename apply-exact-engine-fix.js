const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join('C:', 'bible-html5-app');
const opJsPath = path.join(baseDir, 'operator', 'operator.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- IKINAKABIT ANG ANIMATION SA #multiSlotStage AT .render-box ---');

// 1. I-UPDATE ANG OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // A. Linisin ang sirang top-level code (L6-L10) bago ang renderOutputState
  js = js.replace(/\/\/ Intercept hideVerseBox[\s\S]*?(?=function\s+renderOutputState)/, '');

  // B. I-inject ang Guard at Hide toggle sa pinakaunang linya ng renderOutputState(data)
  const renderEngineHook = `function renderOutputState(data) {
  if (!data) return;

  // 1. Smooth Fade Out / In para sa Hide Verse Box
  if (typeof data.hideVerseBox !== 'undefined') {
    document.body.classList.toggle('hide-verse-box', !!data.hideVerseBox);
  }

  // 2. Anti-Double Animation Guard (Kapag pareho ang state, huwag i-re-render para walang double animation)
  const _stateSignature = JSON.stringify({
    m: data.displayMode || data.mode,
    h: !!data.hideVerseBox,
    s: (data.slots || []).map(s => s ? [s.transId, s.book, s.chapter, s.verse, s.verseText, s.wordHighlights] : [])
  });

  if (window._lastRenderedSig === _stateSignature) {
    return;
  }
  window._lastRenderedSig = _stateSignature;
`;

  js = js.replace(/function\s+renderOutputState\s*\(\s*data\s*\)\s*\{/, renderEngineHook);

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na na-hook ang renderOutputState sa output/output.js');
  } catch (err) {
    console.error('Syntax error sa output.js:', err.message);
  }
}

// 2. I-UPDATE ANG OUTPUT.HTML (Itali ang CSS sa #multiSlotStage at .render-box)
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang lumang styles
  html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//gi, '');

  const exactEngineCss = `
  /* ==================== EXACT BROADCAST TRANSITIONS ==================== */
  :root {
    --highlight-text-color: #ffd700;
  }

  /* 1. Karaoke Text Highlight (Pure text glow, zero gaps) */
  .ndi-word, .ndi-space {
    display: inline !important;
    background: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease, text-shadow 0.15s ease;
  }

  .ndi-word.active-highlight {
    background: transparent !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    text-shadow: 0 0 6px var(--highlight-bg-color, #ffd700),
                 0 0 14px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  .highlight-start, .highlight-end {
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  /* 2. Hide Verse Box: Smooth Fade Out / In sa mismong #multiSlotStage */
  #multiSlotStage {
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
    opacity: 1;
    transform: scale(1);
    will-change: opacity, transform;
  }

  body.hide-verse-box #multiSlotStage {
    opacity: 0 !important;
    transform: scale(0.96) !important;
    pointer-events: none !important;
  }

  /* 3. Card Move / Glide Animation sa mismong .render-box */
  @keyframes cardGlideMove {
    0% {
      opacity: 0.2;
      transform: translateY(24px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1);
    }
  }

  .render-box {
    animation: cardGlideMove 0.38s cubic-bezier(0.16, 1, 0.3, 1) both !important;
    transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  /* ==================== END BROADCAST TRANSITIONS ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', exactEngineCss + '\n</style>');
  }

  // Force cache-busting gamit ang bagong timestamp
  const ts = Date.now();
  html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${ts}"`);
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Matagumpay na nai-link ang CSS sa #multiSlotStage at .render-box sa output/output.html');
}

// 3. I-UPDATE ANG OPERATOR.JS (Single-Click Mode Guard)
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  opCode = opCode.replace(/\/\/ ==================== UNIVERSAL MODE CAPTURE GUARD[\s\S]*?\/\/ ==================== END UNIVERSAL GUARD ====================\n?/gi, '');

  const operatorGuard = `
// ==================== UNIVERSAL MODE CAPTURE GUARD ====================
(function() {
  let activeModeText = '';
  let lastClickTime = 0;

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, .btn, [class*="mode"]');
    if (!btn) return;

    const label = (btn.textContent || '').trim().toLowerCase();
    const isModeBtn = label.includes('full') || label.includes('split') || label.includes('grid');

    if (isModeBtn) {
      const now = Date.now();
      // Harangin kapag aktibo na ang mode o pinindot muli sa loob ng 350ms
      if (activeModeText === label || (now - lastClickTime < 350)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
      activeModeText = label;
      lastClickTime = now;
    }
  }, true);
})();
// ==================== END UNIVERSAL GUARD ====================
`;

  opCode = operatorGuard + '\n' + opCode;

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Matagumpay na naikabit ang Single-Click Mode Lock sa operator/operator.js');
  } catch (err) {
    console.error('Error sa operator.js:', err.message);
  }
}

// 4. CACHE BUST OPERATOR/INDEX.HTML
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  const ts = Date.now();
  opHtml = opHtml.replace(/src=["']operator\.js(\?v=\d+)?["']/gi, `src="operator.js?v=${ts}"`);
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Na-update ang operator/index.html na may fresh cache-buster');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAKA-BIND NA ANG TRANSITION SA MISMONG MGA ELEMENTO.');
console.log('========================================================');