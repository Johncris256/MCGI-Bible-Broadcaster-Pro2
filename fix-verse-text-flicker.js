const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- FIXING VERSE CONTENT FLICKER ON MODE SWITCH ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang ininject na style at script blocks
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const noFlickerBlock = `
<style id="NO_FLICKER_MODE_SWITCH">
  /* 1. LAYOUT ANIMATION: Sa panlabas na container lang (.render-box / stage), WALA sa mismong teksto */
  #multiSlotStage,
  .render-box {
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, opacity, width, height;
  }

  /* 2. PROTEKTAHAN ANG VERSE TEXT AT REFERENCE PARA HINDI MAG-FLICKER O MAG-ANIMATE SA INSIDE REDRAW */
  .reference-container,
  .reference-title,
  .version-subtitle,
  .verse-container,
  .verse-text {
    transition: none !important; /* Papatayin ang transition sa teksto para walang flicker */
  }

  /* 3. PURE TEXT-ONLY HIGHLIGHT (ZERO BACKGROUND, ZERO BORDER) */
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
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  /* 4. NORMAL TEXT: PURE WHITE */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 5. HIGHLIGHTED TEXT ONLY: GOLD / YELLOW GLOW */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 6. TANGGALIN ANG MGA PSEUDO-ELEMENTS */
  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="SAFE_STYLE_CLEANER">
  (function() {
    let isScheduled = false;

    function cleanHighlightStyles() {
      if (isScheduled) return;
      isScheduled = true;

      requestAnimationFrame(() => {
        const elements = document.querySelectorAll('.active-highlight, .ndi-word, .ndi-space, .highlight-start, .highlight-end');
        elements.forEach(el => {
          if (el.style.backgroundColor || el.style.background) {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
          }
          if (el.style.border) el.style.setProperty('border', 'none', 'important');
          if (el.style.boxShadow) el.style.setProperty('box-shadow', 'none', 'important');
        });
        isScheduled = false;
      });
    }

    // Observer na nagbabantay lamang kapag may totoong pagbabago sa highlight spans
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
          cleanHighlightStyles();
          break;
        }
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      cleanHighlightStyles();
      const stage = document.getElementById('multiSlotStage') || document.body;
      observer.observe(stage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      });
    });
  })();
</script>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', noFlickerBlock + '\n</head>');
} else {
  html = noFlickerBlock + '\n' + html;
}

// Sariwang cache-buster timestamp para sa instant update
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Naalis na ang flicker sa mga verse content!');