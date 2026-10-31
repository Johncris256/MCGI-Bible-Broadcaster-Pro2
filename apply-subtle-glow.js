const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- IKINAKABIT ANG OPACITY 1.0 AT SUBTLE GLOW SA HIGHLIGHT ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang highlight CSS blocks
html = html.replace(/\/\* =+ [^=]+ =+ \*\/[\s\S]*?\/\* =+ END [^=]+ =+ \*\//gi, '');

const subtleGlowKaraokeCss = `
  /* ==================== SUBTLE GLOW KARAOKE HIGHLIGHT ==================== */
  :root {
    --highlight-text-color: #ffd700;
    --highlight-opacity: 1.0;
  }

  /* 1. Normal unhighlighted text: Puti, solid 1.0 opacity, malinaw na dark shadow */
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
    opacity: 1.0 !important;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease, text-shadow 0.15s ease;
  }

  /* 2. Highlighted word: 1.0 Opacity + Elegant Subtle Glow Effect */
  .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
    opacity: 1.0 !important; /* 100% solid opacity by default */
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    /* Subtle Karaoke Glow: banayad na inner radiance + soft aura + drop shadow para malinaw ang contrast */
    text-shadow: 0 0 6px var(--highlight-bg-color, #ffd700),
                 0 0 14px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 3. Tiyaking walang extra gap, border, o padding sa dulo */
  .highlight-start,
  .highlight-end,
  .ndi-word.highlight-start,
  .ndi-word.highlight-end {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  .ndi-space.active-highlight {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }
  /* ==================== END SUBTLE GLOW HIGHLIGHT ==================== */
`;

if (html.includes('</style>')) {
  html = html.replace('</style>', subtleGlowKaraokeCss + '\n</style>');
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Matagumpay na nailapat ang Opacity 1.0 at Subtle Glow sa output/output.html');
}