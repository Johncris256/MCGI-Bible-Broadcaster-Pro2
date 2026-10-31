const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join('C:', 'bible-html5-app');
const opJsPath = path.join(baseDir, 'operator', 'operator.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- INAAYOS ANG KONEKSYON AT ANIMATION ENGINE ---');

// 1. I-RESTORE AT PROTEKTAHAN ANG OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // A. Alisin ang nagka-crash na _stateSignature at map() block
  js = js.replace(/function\s+renderOutputState\s*\(\s*data\s*\)\s*\{[\s\S]*?window\._lastRenderedSig\s*=\s*_stateSignature;\s*/, 'function renderOutputState(data) {\n');

  // B. Linisin ang mga sirang top-level code fragments
  js = js.replace(/\/\/ Intercept hideVerseBox[\s\S]*?(?=function\s+renderOutputState)/, '');

  // C. Maglagay ng 100% crash-proof Hide Verse Box toggle sa loob ng renderOutputState
  const safeRenderHeader = `function renderOutputState(data) {
  if (!data) return;

  // Ligtas na pag-toggle ng Hide Verse Box nang hindi nagca-crash
  try {
    if (typeof data.hideVerseBox !== 'undefined') {
      document.body.classList.toggle('hide-verse-box', !!data.hideVerseBox);
    }
  } catch (err) {}
`;

  js = js.replace(/function\s+renderOutputState\s*\(\s*data\s*\)\s*\{/, safeRenderHeader);

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na naibalik ang koneksyon sa output/output.js');
  } catch (err) {
    console.error('Syntax error sa output.js:', err.message);
  }
}

// 2. I-UPDATE ANG OUTPUT.HTML (Malinis na CSS para sa Fade at Karaoke)
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang mga lumang block
  html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//gi, '');

  const robustOutputCss = `
  /* ==================== ROBUST BROADCAST ENGINE ==================== */
  :root {
    --highlight-text-color: #ffd700;
  }

  /* 1. Karaoke Text Highlight */
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

  /* 2. Hide Verse Box: Smooth Fade Out / In */
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

  /* 3. Card Glide Move Animation */
  @keyframes cardGlideMove {
    0% {
      opacity: 0.3;
      transform: translateY(20px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1);
    }
  }

  .render-box {
    animation: cardGlideMove 0.35s cubic-bezier(0.16, 1, 0.3, 1) both !important;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  /* ==================== END BROADCAST ENGINE ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', robustOutputCss + '\n</style>');
  }

  // Fresh cache-busting timestamp
  const ts = Date.now();
  html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${ts}"`);
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Na-update ang output/output.html na may fresh cache-buster');
}

// 3. I-RESTORE ANG OPERATOR.JS (Tanggalin ang anumang nakaharang na click block)
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  // Linisin ang mga lumang failed capture guards
  opCode = opCode.replace(/\/\/ ==================== UNIVERSAL MODE CAPTURE GUARD[\s\S]*?\/\/ ==================== END UNIVERSAL GUARD ====================\n?/gi, '');
  opCode = opCode.replace(/\/\/ ==================== DISPLAY MODE CLICK GUARD[\s\S]*?\/\/ ==================== END DISPLAY MODE GUARD ====================\n?/gi, '');

  // Ligtas na Single-Click debounce guard na hindi haharang sa syncState()
  const safeDebounceGuard = `
// ==================== SAFE MODE DEBOUNCE GUARD ====================
(function() {
  let lastClickTime = 0;
  let activeModeBtn = null;

  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const txt = (btn.textContent || '').trim().toLowerCase();
    const isMode = txt.includes('full') || txt.includes('split') || txt.includes('grid');

    if (isMode) {
      const now = Date.now();
      // Huwag ulitin kapag pinindot muli ang mismong aktibong button sa loob ng 300ms
      if (activeModeBtn === btn || (now - lastClickTime < 300)) {
        e.stopImmediatePropagation();
        return;
      }
      activeModeBtn = btn;
      lastClickTime = now;
    } else {
      activeModeBtn = null;
    }
  }, true);
})();
// ==================== END SAFE GUARD ====================
`;

  opCode = safeDebounceGuard + '\n' + opCode;

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Naibalik at nalinis ang operator/operator.js');
  } catch (err) {
    console.error('Error sa operator.js:', err.message);
  }
}

// 4. CACHE-BUST OPERATOR HTML
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  const ts = Date.now();
  opHtml = opHtml.replace(/src=["']operator\.js(\?v=\d+)?["']/gi, `src="operator.js?v=${ts}"`);
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Na-update ang operator/index.html');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAI-RESTORE NA ANG KONEKSYON AT ANIMATION!');
console.log('========================================================');