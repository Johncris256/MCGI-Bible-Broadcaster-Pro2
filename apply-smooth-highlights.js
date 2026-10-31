const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- ILINAPAT ANG CONTINUOUS SMOOTH-CAP HIGHLIGHT ENGINE ---');

// 1. ILAPAT ANG CSS RULES SA OUTPUT.HTML
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  const highlightCss = `
  /* ==================== SMOOTH CONTINUOUS HIGHLIGHT ENGINE ==================== */
  :root {
    --highlight-bg-color: #ffd700;
    --highlight-anim-duration: 0.25s;
  }

  .ndi-word, .ndi-space {
    display: inline !important;
    padding: 2px 0px !important;
    text-shadow: 2px 3px 6px rgba(0, 0, 0, 0.85);
    transition: background-color var(--highlight-anim-duration) ease,
                box-shadow var(--highlight-anim-duration) ease,
                color var(--highlight-anim-duration) ease;
  }

  /* 1. MGA SALITA AT ESPASYO SA GITNA: Flat ang dulo para walang putol */
  .ndi-word.active-highlight, 
  .ndi-space.active-highlight {
    background-color: var(--highlight-bg-color) !important;
    color: #111111 !important;
    border-radius: 0px !important;
  }

  /* 2. UNANG SALITA SA PARIRALA: Kaliwa lamang ang may kurbada */
  .ndi-word.active-highlight.highlight-start {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
    padding-left: 6px !important;
    box-shadow: -4px 0 8px 0 var(--highlight-bg-color) !important;
  }

  /* 3. HULING SALITA SA PARIRALA: Kanan lamang ang may kurbada */
  .ndi-word.active-highlight.highlight-end {
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
    padding-right: 6px !important;
    box-shadow: 4px 0 8px 0 var(--highlight-bg-color) !important;
  }

  /* 4. ISANG SALITA LAMANG: Kurbado ang magkabilang dulo */
  .ndi-word.active-highlight.highlight-start.highlight-end {
    border-radius: 8px !important;
    padding-left: 6px !important;
    padding-right: 6px !important;
    box-shadow: -4px 0 8px 0 var(--highlight-bg-color), 
                 4px 0 8px 0 var(--highlight-bg-color) !important;
  }
  /* ==================== END HIGHLIGHT ENGINE ==================== */
  `;

  // Alisin ang lumang highlight block kung mayroon
  html = html.replace(/\/\* ==================== SMOOTH CONTINUOUS HIGHLIGHT ENGINE[\s\S]*?\/\* ==================== END HIGHLIGHT ENGINE ====================\ \*\//, '');

  if (html.includes('</style>')) {
    html = html.replace('</style>', highlightCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na nailagay ang highlight styles sa output/output.html');
  }
}

// 2. TIYAKING NILALAGYAN NG OUTPUT.JS NG HIGHLIGHT-START AT HIGHLIGHT-END ANG MGA SALITA
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Helper logic para matukoy ang simula at dulo ng magkakatabing highlights
  const spaceBridgerHelper = `
// ==================== SPACE BRIDGING & CAPS LOGIC ====================
function computeHighlightCaps(wordsArray, highlightsMap) {
  if (!highlightsMap) return {};
  const caps = {};
  const len = wordsArray.length;

  for (let i = 0; i < len; i++) {
    if (highlightsMap[i]) {
      const prevHighlighted = (i > 0 && highlightsMap[i - 1]);
      const nextHighlighted = (i < len - 1 && highlightsMap[i + 1]);

      caps[i] = {
        isStart: !prevHighlighted,
        isEnd: !nextHighlighted
      };
    }
  }
  return caps;
}
// ==================== END LOGIC ====================
`;

  if (!js.includes('computeHighlightCaps')) {
    js = spaceBridgerHelper + '\n' + js;
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Naidagdag ang computeHighlightCaps sa output/output.js');
  }
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAI-RESTORE NA ANG SMOOTH HIGHLIGHT ENGINE!');
console.log('========================================================');