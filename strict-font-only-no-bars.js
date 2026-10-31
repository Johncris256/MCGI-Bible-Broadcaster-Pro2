const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ENFORCING STRICT FONT-ONLY GLOW & ZERO VERTICAL BARS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang lahat ng naunang custom style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const strictFontOnlyBlock = `
<style id="STRICT_FONT_ONLY_HIGHLIGHT">
  /* 1. LAYOUT ANIMATION: Sa panlabas na card lang (.render-box / stage), WALA sa mismong teksto */
  #multiSlotStage,
  .render-box {
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, opacity, width, height;
  }

  /* 2. PROTEKTAHAN ANG TEKSTO LABAN SA FLICKER */
  .reference-container, .reference-title, .version-subtitle, .verse-container, .verse-text {
    transition: none !important;
  }

  /* 3. STRICT ZERO BACKGROUND, ZERO BORDER, ZERO PADDING (ELIMINATES ALL YELLOW SQUARES & BARS) */
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

  /* 4. UNHIGHLIGHTED TEXT: PURE WHITE */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 5. STRICT FONT-ONLY HIGHLIGHT: LETRA LANG ANG DILAW/GINTO AT MAY SUBTLE GLOW */
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

  /* 6. TANGGALIN ANG PSEUDO ELEMENTS AT ESPASYO BARS */
  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="STRICT_STYLE_CLEANER">
  (function() {
    let isScheduled = false;

    function forceStripBackgroundsAndBars() {
      if (isScheduled) return;
      isScheduled = true;

      requestAnimationFrame(() => {
        const elements = document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]');
        elements.forEach(el => {
          // I-strip ang anumang inline background, border, o padding
          el.style.setProperty('background', 'transparent', 'important');
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('border', 'none', 'important');
          el.style.setProperty('box-shadow', 'none', 'important');
          el.style.setProperty('padding', '0px', 'important');
          el.style.setProperty('margin', '0px', 'important');
        });
        isScheduled = false;
      });
    }

    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
          forceStripBackgroundsAndBars();
          break;
        }
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      forceStripBackgroundsAndBars();
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
  html = html.replace('</head>', strictFontOnlyBlock + '\n</head>');
} else {
  html = strictFontOnlyBlock + '\n' + html;
}

// Sariwang cache-buster timestamp para ma-force reload ng browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Strict font-only glow at wala nang vertical yellow bars!');