const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ILINAPAT ANG KARAOKE TEXT-ONLY HIGHLIGHT STYLE ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

const karaokeHighlightCss = `
  /* ==================== KARAOKE TEXT-ONLY HIGHLIGHT ==================== */
  :root {
    --highlight-text-color: #ffe600; /* Matingkad na Karaoke Yellow */
  }

  /* Karaniwang teksto */
  .ndi-word, .ndi-space {
    display: inline !important;
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
    transition: color 0.15s ease, text-shadow 0.15s ease;
  }

  /* Karaoke Highlighted Word: Teksto mismo ang umiilaw/nagpapalit ng kulay */
  .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    font-weight: 700 !important;
    /* Karaoke text glow effect */
    text-shadow: 0 0 10px var(--highlight-bg-color, #ffe600),
                 0 0 20px rgba(255, 230, 0, 0.6),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* Walang kulay ang espasyo */
  .ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
  }
  /* ==================== END KARAOKE HIGHLIGHT ==================== */
`;

// Linisin ang mga lumang highlight css block
html = html.replace(/\/\* ==================== EXACT SMOOTH OUTER[\s\S]*?\/\* ==================== END HIGHLIGHT ENGINE ====================\ \*\//g, '');
html = html.replace(/\/\* ==================== KARAOKE TEXT-ONLY HIGHLIGHT[\s\S]*?\/\* ==================== END KARAOKE HIGHLIGHT ====================\ \*\//g, '');

if (html.includes('</style>')) {
  html = html.replace('</style>', karaokeHighlightCss + '\n</style>');
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Tagumpay! Nailapat na ang Karaoke Text Highlight sa output.html');
}