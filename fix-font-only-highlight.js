const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- TINATANGGAL ANG DILAW NA KAHON AT GINAGAWANG FONT-ONLY HIGHLIGHT ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang custom style tags
html = html.replace(/<style id="FONT_ONLY_HIGHLIGHT_CSS">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<style id="KILL_YELLOW_BARS_CSS">[\s\S]*?<\/style>/gi, '');

const fontOnlyHighlightCss = `
<style id="FONT_ONLY_HIGHLIGHT_CSS">
  /* 1. TANGGALIN ANG YELLOW BACKGROUND SQUARE SA LAHAT NG HIGHLIGHT ELEMENTS */
  span.active-highlight,
  .active-highlight,
  .ndi-word.active-highlight,
  .ndi-space.active-highlight,
  [class*="highlight"] {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  /* 2. FONT-ONLY HIGHLIGHT: Mismong titik lamang ang magiging dilaw na may subtle glow */
  span.active-highlight,
  .active-highlight,
  .ndi-word.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 3. Tiyaking walang bilog o hugis sa dulo ng parirala */
  .highlight-start, .highlight-end {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
  }
</style>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', fontOnlyHighlightCss + '\n</head>');
} else if (html.includes('</style>')) {
  html = html.replace('</style>', '</style>\n' + fontOnlyHighlightCss);
}

// Maglagay ng sariwang cache-buster timestamp
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Font-only karaoke highlight na ang output.html');