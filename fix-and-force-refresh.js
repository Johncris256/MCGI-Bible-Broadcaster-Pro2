const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join('C:', 'bible-html5-app');
const opJsPath = path.join(baseDir, 'operator', 'operator.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- NAGSISIMULA ANG CLEAN REPAIR AT CACHE-BUSTING ---');

// 1. LINISIN ANG OUTPUT.JS (Tanggalin ang humaharang na WebSocket wrapper)
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Alisin ang lahat ng naunang injected wrappers at observers
  js = js.replace(/\/\/ ==================== UNIVERSAL OUTPUT RUNTIME INTERCEPTOR[\s\S]*?\/\/ ==================== END RUNTIME INTERCEPTOR ====================\n?/gi, '');
  js = js.replace(/\/\/ ==================== OUTPUT ANIMATION ENGINE WITH MOVE SWAP[\s\S]*?\/\/ ==================== END OUTPUT ENGINE ====================\n?/gi, '');
  js = js.replace(/\/\/ ==================== SMOOTH VERSE BOX TOGGLE[\s\S]*?\/\/ ==================== END SMOOTH TOGGLE ====================\n?/gi, '');

  // Aalisin ang anumang direktang style.display = 'none' na pumapatay sa CSS transition
  js = js.replace(
    /([a-zA-Z0-9_$.]+)\.style\.display\s*=\s*([a-zA-Z0-9_$.]+)\.hideVerseBox\s*\?\s*['"]none['"]\s*:\s*['"][^'"]*['"];?/g,
    `if ($2.hideVerseBox) { document.body.classList.add('hide-verse-box'); } else { document.body.classList.remove('hide-verse-box'); }`
  );

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Nalinis at naibalik sa normal ang output/output.js');
  } catch (e) {
    console.error('Syntax error sa output.js:', e.message);
  }
}

// 2. I-UPDATE ANG OUTPUT.HTML (Malinis na CSS + Cache Buster)
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang lumang styles
  html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//gi, '');

  const universalStyles = `
  /* ==================== CLEAN STYLING AND TRANSITIONS ==================== */
  :root {
    --highlight-text-color: #ffd700;
  }

  /* 1. Karaoke Text Highlight (Walang padding, may subtle glow) */
  .ndi-word, .ndi-space {
    display: inline !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease;
  }

  .ndi-word.active-highlight {
    background: transparent !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    text-shadow: 0 0 6px var(--highlight-bg-color, #ffd700),
                 0 0 14px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 2. Smooth Fade para sa Hide Verse Box (Transition sa buong output container) */
  body > div,
  main,
  #app,
  #display,
  #output,
  .verse-box,
  .verse-card,
  .card,
  [class*="slot"],
  [class*="verse"],
  [id*="slot"],
  [id*="card"] {
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  /* Kapag Hide Verse Box: malumanay na maglalaho sa 0.4 segundo */
  body.hide-verse-box body > div,
  body.hide-verse-box main,
  body.hide-verse-box #app,
  body.hide-verse-box #display,
  body.hide-verse-box #output,
  body.hide-verse-box .verse-box,
  body.hide-verse-box .verse-card,
  body.hide-verse-box .card,
  body.hide-verse-box [class*="slot"],
  body.hide-verse-box [class*="card"] {
    opacity: 0 !important;
    transform: scale(0.97) !important;
    pointer-events: none !important;
  }
  /* ==================== END STYLING ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', universalStyles + '\n</style>');
  }

  // Cache Buster: Piliting i-reload ng browser ang output.js
  const timestamp = Date.now();
  html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${timestamp}"`);

  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Na-update ang output/output.html na may Cache-Buster');
}

// 3. I-UPDATE ANG OPERATOR (Anti-Double Click Guard + Cache Buster)
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  // Linisin ang lumang injections
  opCode = opCode.replace(/\/\/ ==================== UNIVERSAL MODE CAPTURE GUARD[\s\S]*?\/\/ ==================== END UNIVERSAL GUARD ====================\n?/gi, '');

  const robustGuard = `
// ==================== UNIVERSAL MODE CAPTURE GUARD ====================
(function() {
  let currentActiveMode = '';
  let lastClickTime = 0;

  // Intercept click bago makarating sa lumang listener
  document.addEventListener('click', function(e) {
    const el = e.target.closest('button, .btn, [class*="mode"], [id*="mode"]');
    if (!el) return;

    const text = (el.textContent || '').trim().toLowerCase();
    const isMode = text.includes('full') || text.includes('split') || text.includes('grid');

    if (isMode) {
      const now = Date.now();
      // Harangin kung ito na ang aktibong mode o kung na-double click
      if (currentActiveMode === text || (now - lastClickTime < 350)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
      currentActiveMode = text;
      lastClickTime = now;
    }
  }, true);
})();
// ==================== END UNIVERSAL GUARD ====================
`;

  opCode = robustGuard + '\n' + opCode;

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Na-update ang operator/operator.js gamit ang Capture Guard');
  } catch (err) {
    console.error('Error sa operator.js:', err.message);
  }
}

if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  const timestamp = Date.now();
  opHtml = opHtml.replace(/src=["']operator\.js(\?v=\d+)?["']/gi, `src="operator.js?v=${timestamp}"`);
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Na-update ang operator/index.html na may Cache-Buster');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! FORCE RELOAD READY!');
console.log('========================================================');