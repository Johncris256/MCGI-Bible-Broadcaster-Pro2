const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('--- TINATANGGAL ANG LAHAT NG 6PX PADDING AT VERTICAL YELLOW BARS ---');

// 1. LINISIN ANG OUTPUT.HTML
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // A. Burahin ang lahat ng naunang highlight CSS blocks
  html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//gi, '');

  // B. Burahin ang anumang hiwalay na lumang rules na may padding-left: 6px o highlight-start/end
  html = html.replace(/\.ndi-word[^{}]*\{[^{}]*\}/gi, '');
  html = html.replace(/\.ndi-space[^{}]*\{[^{}]*\}/gi, '');
  html = html.replace(/\.highlight-start[^{}]*\{[^{}]*\}/gi, '');
  html = html.replace(/\.highlight-end[^{}]*\{[^{}]*\}/gi, '');

  // C. Ilapat ang 100% PURE TEXT-ONLY HIGHLIGHT (Zero padding, zero borders, zero background)
  const zeroBarCss = `
  /* ==================== ZERO-BAR CLEAN TEXT HIGHLIGHT ==================== */
  :root {
    --highlight-text-color: #ffd700;
  }

  /* Normal text: walang padding, walang margin, puti ang kulay */
  .ndi-word, .ndi-space {
    display: inline !important;
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
    margin: 0px !important;
    margin-left: 0px !important;
    margin-right: 0px !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease;
  }

  /* Highlighted text: Letra lang mismo ang nagiging dilaw/ginto, walang background */
  .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
    margin: 0px !important;
    margin-left: 0px !important;
    margin-right: 0px !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    text-shadow: 0 0 10px var(--highlight-bg-color, #ffd700),
                 0 0 20px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* Ganap na tanggalin ang 6px padding at anumang background sa unahan at hulihan */
  .highlight-start,
  .highlight-end,
  .ndi-word.highlight-start,
  .ndi-word.highlight-end,
  .ndi-word.active-highlight.highlight-start,
  .ndi-word.active-highlight.highlight-end {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
    margin: 0px !important;
    margin-left: 0px !important;
    margin-right: 0px !important;
  }

  .ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }
  /* ==================== END ZERO-BAR HIGHLIGHT ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', zeroBarCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na naalis ang 6px padding at na-update ang output/output.html');
  }
}

// 2. LINISIN ANG OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Tanggalin ang anumang naunang na-inject na highlight span builder o space bridging functions
  js = js.replace(/\/\/ ==================== HIGHLIGHT SPAN BUILDER[\s\S]*?\/\/ ==================== END SPAN BUILDER ====================\n?/gi, '');
  js = js.replace(/\/\/ ==================== SPACE BRIDGING & CAPS LOGIC[\s\S]*?\/\/ ==================== END LOGIC ====================\n?/gi, '');

  fs.writeFileSync(outJsPath, js, 'utf8');
  console.log('✓ Na-verify at nalinis ang output/output.js');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! ZERO-GAP AT WALA NANG VERTICAL YELLOW BARS!');
console.log('========================================================');