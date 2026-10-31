const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- WINAWASAK NANG TULUYAN ANG MGA VERTICAL YELLOW BARS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang custom style tags para walang mag-conflict
html = html.replace(/<style id="KILL_YELLOW_BARS_PERMANENT">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<style id="KILL_SPACE_BARS_CSS">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<style id="FONT_ONLY_HIGHLIGHT_CSS">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id="BAR_STRIPPER_SCRIPT">[\s\S]*?<\/script>/gi, '');

const cssResetBlock = `
<style id="KILL_YELLOW_BARS_PERMANENT">
  /* 1. TANGGALIN ANG LAHAT NG BORDER AT BOX SHADOW SA ANUMANG HIGHLIGHT ELEMENT */
  .ndi-word,
  .ndi-space,
  .highlight-start,
  .highlight-end,
  .active-highlight,
  [class*="highlight"],
  [class*="ndi"] {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    border-bottom: none !important;
    outline: none !important;
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
    margin: 0px !important;
    margin-left: 0px !important;
    margin-right: 0px !important;
  }

  /* 2. UNHIGHLIGHTED TEXT: PURE WHITE */
  .ndi-word, .ndi-space {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
    transition: color 0.15s ease, text-shadow 0.15s ease !important;
  }

  /* 3. HIGHLIGHTED TEXT: KARAOKE GOLD GLOW (FONT ONLY) */
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 4. ESPASYO SA PAGITAN NG MGA SALITA: 100% TRANSPARENT */
  .ndi-space, .ndi-space.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    color: #ffffff !important;
    text-shadow: none !important;
  }

  /* 5. TANGGALIN ANG PSEUDO ELEMENTS ::before AT ::after NA GUMAGAWA NG BARS */
  *:before, *:after {
    box-shadow: none !important;
  }
  .highlight-start::before, .highlight-start::after,
  .highlight-end::before, .highlight-end::after,
  .ndi-word::before, .ndi-word::after {
    display: none !important;
    content: none !important;
    border: none !important;
    width: 0px !important;
  }
</style>

<script id="BAR_STRIPPER_SCRIPT">
  // Observer na naglilinis ng inline borders/shadows tuwing may panibagong render
  (function() {
    function cleanElements() {
      const elems = document.querySelectorAll('[class*="highlight"], .ndi-word, .ndi-space, .highlight-start, .highlight-end');
      elems.forEach(el => {
        if (el.style.borderLeft) el.style.borderLeft = 'none';
        if (el.style.borderRight) el.style.borderRight = 'none';
        if (el.style.border) el.style.border = 'none';
        if (el.style.boxShadow) el.style.boxShadow = 'none';
        if (el.style.paddingLeft) el.style.paddingLeft = '0px';
        if (el.style.paddingRight) el.style.paddingRight = '0px';
        if (el.classList.contains('ndi-space')) {
          el.style.backgroundColor = 'transparent';
          el.style.background = 'transparent';
        }
      });
    }

    const observer = new MutationObserver(cleanElements);
    document.addEventListener('DOMContentLoaded', function() {
      cleanElements();
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  })();
</script>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', cssResetBlock + '\n</head>');
} else if (html.includes('</style>')) {
  html = html.replace('</style>', '</style>\n' + cssResetBlock);
}

// Maglagay ng sariwang cache-buster timestamp
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Permanenteng na-strips ang lahat ng yellow bars at inline shadows.');