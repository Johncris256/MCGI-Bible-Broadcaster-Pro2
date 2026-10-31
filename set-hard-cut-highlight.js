const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ENFORCING HARD CUT ON HIGHLIGHT (NO FADE / NO BARS) ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang lahat ng naunang custom style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const hardCutHighlightBlock = `
<style id="HARD_CUT_FONT_HIGHLIGHT">
  /* 1. LAYOUT ANIMATION: Sa panlabas na card lang (.render-box / stage) */
  #multiSlotStage,
  .render-box {
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, opacity, width, height;
  }

  /* 2. PREVENT VERSE TEXT FLICKER */
  .reference-container, .reference-title, .version-subtitle, .verse-container, .verse-text {
    transition: none !important;
  }

  /* 3. HARD CUT ON HIGHLIGHTS: WALANG TRANSITION SA COLOR/SHADOW AT WALANG BARS */
  span,
  .ndi-word,
  .ndi-space,
  .highlight-start,
  .highlight-end,
  .active-highlight,
  [class*="highlight"],
  [class*="ndi"] {
    /* HARD CUT: Instant transition off para walang fade-out latency */
    transition: none !important;
    -webkit-transition: none !important;

    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    border-left: none !important;
    border-right: none !important;
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

  /* 4. UNHIGHLIGHTED TEXT: PURE WHITE (INSTANT CUT) */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 5. HIGHLIGHTED TEXT ONLY: INSTANT HARD CUT TO GOLD/YELLOW WITH SUBTLE GLOW */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 6. REMOVE ALL PSEUDO ELEMENTS */
  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="HARD_CUT_CLEANER">
  (function() {
    function cleanInstantly() {
      const elements = document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]');
      elements.forEach(el => {
        el.style.setProperty('transition', 'none', 'important');
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
        el.style.setProperty('padding', '0px', 'important');
        el.style.setProperty('margin', '0px', 'important');
      });
    }

    const observer = new MutationObserver((mutations) => {
      cleanInstantly();
    });

    window.addEventListener('DOMContentLoaded', () => {
      cleanInstantly();
      const stage = document.getElementById('multiSlotStage') || document.body;
      observer.observe(stage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    });
  })();
</script>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', hardCutHighlightBlock + '\n</head>');
} else {
  html = hardCutHighlightBlock + '\n' + html;
}

// Sariwang cache-buster timestamp para ma-force reload ng browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Hard cut na ang highlight transition (Zero fade-out delay)!');