const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- TINATANGGAL ANG MGA EXTRA PADDING AT GAP SA HIGHLIGHT ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

const cleanKaraokeCss = `
  /* ==================== PURE CLEAN KARAOKE HIGHLIGHT ==================== */
  :root {
    --highlight-text-color: #ffe600;
  }

  /* 1. Natural at pantay na spacing sa lahat ng salita at espasyo */
  .ndi-word, .ndi-space {
    display: inline !important;
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease, text-shadow 0.15s ease;
  }

  /* 2. Karaoke Highlight: Kulay lamang ang nagbabago, walang padding o galaw sa spacing */
  .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    text-shadow: 0 0 10px var(--highlight-bg-color, #ffe600),
                 0 0 20px rgba(255, 230, 0, 0.6),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 3. Tanggalin nang buo ang 6px padding at shadow sa simula at dulo */
  .ndi-word.active-highlight.highlight-start,
  .ndi-word.active-highlight.highlight-end,
  .ndi-word.active-highlight.highlight-start.highlight-end {
    padding-left: 0px !important;
    padding-right: 0px !important;
    margin-left: 0px !important;
    margin-right: 0px !important;
    border-radius: 0px !important;
    box-shadow: none !important;
  }

  .ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }
  /* ==================== END PURE CLEAN KARAOKE HIGHLIGHT ==================== */
`;

// Linisin ang mga lumang highlight CSS blocks
html = html.replace(/\/\* ==================== EXACT SMOOTH OUTER[\s\S]*?\/\* ==================== END HIGHLIGHT ENGINE ====================\ \*\//g, '');
html = html.replace(/\/\* ==================== KARAOKE TEXT-ONLY HIGHLIGHT[\s\S]*?\/\* ==================== END KARAOKE HIGHLIGHT ====================\ \*\//g, '');
html = html.replace(/\/\* ==================== PURE CLEAN KARAOKE HIGHLIGHT[\s\S]*?\/\* ==================== END PURE CLEAN KARAOKE HIGHLIGHT ====================\ \*\//g, '');

if (html.includes('</style>')) {
  html = html.replace('</style>', cleanKaraokeCss + '\n</style>');
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Tagumpay! Natanggal na ang lahat ng extra gaps at padding.');
}