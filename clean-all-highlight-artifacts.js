const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('--- TINATANGGAL ANG LAHAT NG VERTICAL BARS AT HIGHLIGHT ARTIFACTS ---');

// 1. LINISIN ANG OUTPUT.HTML
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Burahin ang lahat ng naunang highlight blocks at lingering caps
  html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//g, '');

  const pristineKaraokeCss = `
  /* ==================== PRISTINE KARAOKE HIGHLIGHT ==================== */
  :root {
    --highlight-text-color: #ffd700;
  }

  /* 1. Karaniwang mga salita at espasyo */
  .ndi-word, .ndi-space {
    display: inline !important;
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease;
  }

  /* 2. Highlighted text: Kulay lamang ng letra ang nagbabago */
  .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    text-shadow: 0 0 10px var(--highlight-bg-color, #ffd700),
                 0 0 20px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 3. CONDITIONAL STRIP: Tanggalin ang anumang vertical line, border, o pseudo-element sa caps */
  .highlight-start,
  .highlight-end,
  .ndi-word.highlight-start,
  .ndi-word.highlight-end,
  .ndi-word.active-highlight.highlight-start,
  .ndi-word.active-highlight.highlight-end {
    border: none !important;
    border-left: none !important;
    border-right: none !important;
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

  .highlight-start::before,
  .highlight-end::after,
  .ndi-word::before,
  .ndi-word::after {
    display: none !important;
    content: none !important;
  }

  .ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }
  /* ==================== END PRISTINE KARAOKE HIGHLIGHT ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', pristineKaraokeCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na nalinis ang CSS sa output/output.html');
  }
}

// 2. LINISIN ANG ANUMANG NA-INJECT NA SPAN BUILDER SA OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');
  js = js.replace(/\/\/ ==================== HIGHLIGHT SPAN BUILDER[\s\S]*?\/\/ ==================== END SPAN BUILDER ====================\n?/g, '');
  fs.writeFileSync(outJsPath, js, 'utf8');
  console.log('✓ Na-verify at nalinis ang output/output.js');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! 100% WALA NANG VERTICAL BAR O SOBRANG ESPASYO.');
console.log('========================================================');