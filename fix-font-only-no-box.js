const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- AALISIN ANG BACKGROUND BOX (FONT ONLY HIGHLIGHT) ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang ininject na style at script blocks
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const fontOnlyGlowBlock = `
<style id="FONT_ONLY_NO_BOX_CSS">
  /* 1. TANGGALIN ANG LAHAT NG BACKGROUND COLOR, BORDER AT CAPSULE SHAPE */
  span,
  .ndi-word,
  .ndi-space,
  .highlight-start,
  .highlight-end,
  .active-highlight,
  [class*="highlight"],
  [class*="ndi"] {
    background: none !important;
    background-color: transparent !important;
    border: none !important;
    border-left: none !important;
    border-right: none !important;
    outline: none !important;
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  /* 2. UNHIGHLIGHTED TEXT: PURE WHITE */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 3. HIGHLIGHTED TEXT ONLY: FONT COLOR GOLD/YELLOW + SUBTLE GLOW (NO BACKGROUND) */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    background: none !important;
    background-color: transparent !important;
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 4. TANGGALIN ANG PSEUDO ELEMENTS */
  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="FORCE_TRANSPARENT_BG">
  (function() {
    function wipeBackgrounds() {
      const elements = document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]');
      elements.forEach(el => {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
      });
    }

    const observer = new MutationObserver(wipeBackgrounds);
    window.addEventListener('DOMContentLoaded', function() {
      wipeBackgrounds();
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    });
    setInterval(wipeBackgrounds, 100);
  })();
</script>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', fontOnlyGlowBlock + '\n</head>');
} else {
  html = fontOnlyGlowBlock + '\n' + html;
}

// Fresh timestamp para ma-force reload ng browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ TAGUMPAI! Mismong font na lang ang nag-hi-highlight nang walang background box.');