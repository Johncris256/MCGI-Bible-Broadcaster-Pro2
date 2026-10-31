const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join('C:', 'bible-html5-app');
const opJsPath = path.join(baseDir, 'operator', 'operator.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- PAG-AAYOS SA NAPUTOL NA KONEKSYON AT ENGINE ---');

// 1. TANGGALIN ANG MGA NAKAHARANG NA CODE SA OPERATOR.JS
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  // Alisin ang anumang capture guard na humaharang sa pag-click ng buttons
  opCode = opCode.replace(/\/\/ ==================== UNIVERSAL MODE CAPTURE GUARD[\s\S]*?\/\/ ==================== END UNIVERSAL GUARD ====================\n?/gi, '');
  opCode = opCode.replace(/\/\/ ==================== SAFE MODE DEBOUNCE GUARD[\s\S]*?\/\/ ==================== END SAFE GUARD ====================\n?/gi, '');
  opCode = opCode.replace(/\/\/ ==================== DISPLAY MODE CLICK GUARD[\s\S]*?\/\/ ==================== END DISPLAY MODE GUARD ====================\n?/gi, '');

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Malinis at walang harang ang operator.js');
  } catch (err) {
    console.error('Error sa operator.js:', err.message);
  }
}

// 2. I-RESTORE AT LINISIN ANG OUTPUT.JS (TANGGALIN ANG RUNTIME CRASH)
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Alisin ang lahat ng naunang injected wrappers na nagdudulot ng crash
  js = js.replace(/\/\/ ==================== UNIVERSAL OUTPUT RUNTIME INTERCEPTOR[\s\S]*?\/\/ ==================== END RUNTIME INTERCEPTOR ====================\n?/gi, '');
  js = js.replace(/\/\/ ==================== OUTPUT ANIMATION ENGINE WITH MOVE SWAP[\s\S]*?\/\/ ==================== END OUTPUT ENGINE ====================\n?/gi, '');
  js = js.replace(/\/\/ ==================== SMOOTH VERSE BOX TOGGLE[\s\S]*?\/\/ ==================== END SMOOTH TOGGLE ====================\n?/gi, '');
  js = js.replace(/\/\/ Intercept hideVerseBox[\s\S]*?(?=function\s+renderOutputState)/, '');

  // Ibalik ang renderOutputState sa malinis na anyo na may ligtas na hideVerseBox toggle
  js = js.replace(
    /function\s+renderOutputState\s*\(\s*data\s*\)\s*\{[\s\S]*?(?=const stage\s*=|let stage\s*=|var stage\s*=|stage\s*=|if\s*\(!data\))/i,
    `function renderOutputState(data) {\n  if (!data) return;\n  try {\n    if (typeof data.hideVerseBox !== 'undefined') {\n      document.body.classList.toggle('hide-verse-box', !!data.hideVerseBox);\n    }\n  } catch (e) {}\n  `
  );

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na naibalik ang renderOutputState sa output.js (Walang Crash)');
  } catch (err) {
    console.error('Syntax error sa output.js:', err.message);
  }
}

// 3. I-UPDATE ANG OUTPUT.HTML (Malinis na CSS para sa Smooth Fade at Karaoke Glow)
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Alisin ang lumang highlight at fade styles
  html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//gi, '');

  const cleanStyles = `
  /* ==================== CLEAN BROADCAST ENGINE ==================== */
  :root {
    --highlight-text-color: #ffd700;
  }

  /* 1. Karaoke Text Highlight (Walang padding, walang vertical bar, may subtle glow) */
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

  /* 2. Hide Verse Box: Malinis na CSS Transition sa mismong Stage */
  #multiSlotStage {
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
    opacity: 1;
    transform: scale(1);
    will-change: opacity, transform;
  }

  body.hide-verse-box #multiSlotStage {
    opacity: 0 !important;
    transform: scale(0.97) !important;
    pointer-events: none !important;
  }

  /* 3. Smooth Card Render Transition */
  .render-box {
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s ease !important;
  }
  /* ==================== END BROADCAST ENGINE ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', cleanStyles + '\n</style>');
  }

  // Force cache-busting timestamp
  const ts = Date.now();
  html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${ts}"`);
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Nai-update ang output.html na may sariwang cache-buster');
}

// 4. CACHE-BUST OPERATOR HTML
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  const ts = Date.now();
  opHtml = opHtml.replace(/src=["']operator\.js(\?v=\d+)?["']/gi, `src="operator.js?v=${ts}"`);
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Nai-update ang operator/index.html');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! KONEKTADO NA MULI ANG OPERATOR AT OUTPUT.');
console.log('========================================================');