const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ATOMIC DOM STRIPPER: TULUYAN NANG PAPATAYIN ANG BARS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga dating custom injected style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const finalStripperBlock = `
<style id="ABSOLUTE_KARAOKE_CSS">
  /* 1. FORCE ZERO BACKGROUND, ZERO BORDER, ZERO SHADOW SA LAHAT NG SPANS */
  span, 
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
  .ndi-word, .ndi-space, span {
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95);
  }

  /* 3. HIGHLIGHTED TEXT: KARAOKE GOLD GLOW (TEXT ONLY) */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 4. TANGGALIN ANG PSEUDO-ELEMENTS (::before / ::after) */
  *::before, *::after {
    display: none !important;
    content: none !important;
    border: none !important;
    box-shadow: none !important;
  }
</style>

<script id="DOM_LIVE_STRIPPER">
  (function() {
    function sanitizeDOM() {
      // Hanapin ang lahat ng spans sa loob ng verse stage
      const spans = document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]');
      spans.forEach(el => {
        // Alisin ang anumang direktang inline style na inilalagay ng JS na nagdudulot ng bar
        if (el.style.backgroundColor) el.style.backgroundColor = 'transparent';
        if (el.style.background) el.style.background = 'transparent';
        if (el.style.borderLeft) el.style.borderLeft = 'none';
        if (el.style.borderRight) el.style.borderRight = 'none';
        if (el.style.border) el.style.border = 'none';
        if (el.style.boxShadow) el.style.boxShadow = 'none';
        if (el.style.paddingLeft) el.style.paddingLeft = '0px';
        if (el.style.paddingRight) el.style.paddingRight = '0px';
        if (el.style.borderRadius) el.style.borderRadius = '0px';
      });
    }

    // Patakbuhin ang sanitizer sa pamamagitan ng real-time observer
    const observer = new MutationObserver(sanitizeDOM);
    
    window.addEventListener('DOMContentLoaded', function() {
      sanitizeDOM();
      observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['style', 'class'] 
      });
    });

    // backup interval para sa anumang background updates
    setInterval(sanitizeDOM, 100);
  })();
</script>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', finalStripperBlock + '\n</head>');
} else {
  html = finalStripperBlock + '\n' + html;
}

// Maglagay ng sariwang timestamp para piliting mag-reload ang browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ PERMANENTE NANG NAISAPAT ANG ATOMIC STRIPPER SA OUTPUT.HTML!');