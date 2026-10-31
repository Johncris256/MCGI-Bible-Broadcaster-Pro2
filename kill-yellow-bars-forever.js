const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- PERMANENTING TINATANGGAL ANG DILAW NA PATAYONG GUHIT ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Tanggalin ang mga lumang style injection
html = html.replace(/<style id="KILL_YELLOW_BARS_CSS">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<style id="KARAOKE_STYLE_CSS">[\s\S]*?<\/style>/gi, '');

const killYellowBarsCss = `
<style id="KILL_YELLOW_BARS_CSS">
  /* 1. LAHAT NG HIGHLIGHT ELEMENTS: Zero border, zero box-shadow, zero padding */
  .ndi-word, 
  .ndi-space, 
  .highlight-start, 
  .highlight-end, 
  [class*="highlight"] {
    background: transparent !important;
    background-color: transparent !important;
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
    opacity: 1.0 !important;
  }

  /* 2. NORMAL UNHIGHLIGHTED TEXT: Pure White + Soft Drop Shadow */
  .ndi-word, .ndi-space {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
    transition: color 0.15s ease, text-shadow 0.15s ease !important;
  }

  /* 3. KARAOKE HIGHLIGHTED TEXT: Gold/Yellow + Inner & Outer Glow */
  .ndi-word.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 6px #ffd700,
                 0 0 14px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 4. TANGGALIN ANG ANUMANG PSEUDO-ELEMENTS (::before / ::after) NA GUMAGAWA NG BARS */
  .ndi-word::before, .ndi-word::after,
  .ndi-space::before, .ndi-space::after,
  .highlight-start::before, .highlight-start::after,
  .highlight-end::before, .highlight-end::after {
    display: none !important;
    content: none !important;
    border: none !important;
  }
</style>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', killYellowBarsCss + '\n</head>');
} else if (html.includes('</style>')) {
  html = html.replace('</style>', '</style>\n' + killYellowBarsCss);
}

// Maglagay ng sariwang cache-buster timestamp
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Permanente nang naalis ang dilaw na patayong guhit sa output.html');