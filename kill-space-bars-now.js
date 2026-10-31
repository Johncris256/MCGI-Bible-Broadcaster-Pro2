const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- TINATANGGAL ANG MGA SPACES AT VERTICAL BARS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang custom style tags
html = html.replace(/<style id="KILL_SPACE_BARS_CSS">[\s\S]*?<\/style>/gi, '');

const killSpaceBarsCss = `
<style id="KILL_SPACE_BARS_CSS">
  /* 1. ESPASYO SA PAGITAN NG MGA SALITA: Walang kulay, walang background, walang shadow */
  .ndi-space,
  .ndi-space.active-highlight,
  span.ndi-space,
  span.ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    outline: none !important;
    padding: 0px !important;
    margin: 0px !important;
    text-shadow: none !important;
  }

  /* 2. MISMONG MGA SALITA LANG ANG MAY KULAY AT GLOW */
  .ndi-word.active-highlight,
  span.ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0px !important;
  }

  /* 3. SIGURADUHING STRIPPED ANG UNAHAN AT HULIHAN */
  .highlight-start, .highlight-end {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }
</style>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', killSpaceBarsCss + '\n</head>');
} else if (html.includes('</style>')) {
  html = html.replace('</style>', '</style>\n' + killSpaceBarsCss);
}

// Maglagay ng sariwang cache-buster timestamp
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Naalis na ang dilaw na patayong guhit sa mga espasyo.');