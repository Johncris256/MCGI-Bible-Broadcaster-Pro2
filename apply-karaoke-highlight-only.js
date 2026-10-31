const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ILINAPAT ANG KARAOKE-STYLE TEXT HIGHLIGHT SA OUTPUT.HTML ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Alisin ang anumang dating ininject na karaoke/highlight CSS blocks upang maiwasan ang conflict
html = html.replace(/<style id="KARAOKE_STYLE_CSS">[\s\S]*?<\/style>/gi, '');
html = html.replace(/\/\* =+ [^=]*HIGHLIGHT[^=]* =+ \*\/[\s\S]*?\/\* =+ END [^=]* =+ \*\//gi, '');

const karaokeCssTag = `
<style id="KARAOKE_STYLE_CSS">
  :root {
    --highlight-text-color: #ffd700;
  }

  /* 1. Karaniwang teksto: Puti, solid 1.0 opacity, walang background box o padding */
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
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
    transition: color 0.15s ease, text-shadow 0.15s ease;
  }

  /* 2. Karaoke Highlight: Teksto lamang ang iilaw nang may subtle glow (1.0 opacity) */
  .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
    opacity: 1.0 !important;
    color: var(--highlight-bg-color, var(--highlight-text-color)) !important;
    text-shadow: 0 0 6px var(--highlight-bg-color, #ffd700),
                 0 0 14px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 3. Siguruhing zero padding at zero border sa unahan at hulihan upang walang vertical yellow bar */
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
    margin: 0px !important;
  }

  /* 4. Espasyo sa pagitan ng mga salita: transparent at natural ang pagitan */
  .ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0px !important;
    margin: 0px !important;
  }
</style>
`;

// I-inject ang bagong style tag bago ang </head>
if (html.includes('</head>')) {
  html = html.replace('</head>', karaokeCssTag + '\n</head>');
} else if (html.includes('</style>')) {
  html = html.replace('</style>', '</style>\n' + karaokeCssTag);
}

// Maglagay ng sariwang timestamp cache buster
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ Matagumpay na nailapat ang Karaoke Highlight sa output/output.html');