const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- REFINING MODE SWITCHING ANIMATIONS (REMOVING GLITCHES) ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang mga lumang ininject na script at style blocks
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const refinedBlock = `
<style id="REFINED_CLEAN_OUTPUT">
  /* 1. SMOOTH LAYOUT TRANSITIONS PARA SA MODE SWITCHING (FULL / SPLIT / GRID) */
  #multiSlotStage,
  .render-box,
  .reference-container,
  .verse-container {
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, opacity, width, height;
  }

  /* 2. PURE TEXT-ONLY HIGHLIGHT (ZERO BACKGROUND, ZERO BORDER, ZERO GLITCH) */
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

  /* 3. NORMAL TEXT: PURE WHITE */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 4. HIGHLIGHTED TEXT ONLY: GOLD / YELLOW GLOW */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 5. TANGGALIN ANG MGA PSEUDO-ELEMENTS NA GUMAGAWA NG BARS */
  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="EFFICIENT_STYLE_CLEANER">
  (function() {
    let isCleaning = false;

    // Ligtas at maayos na tagalinis na hindi nakikipag-agawan sa animation frame
    function cleanStylesSafely() {
      if (isCleaning) return;
      isCleaning = true;

      requestAnimationFrame(() => {
        const elements = document.querySelectorAll('span.active-highlight, .ndi-word, .ndi-space, .highlight-start, .highlight-end');
        elements.forEach(el => {
          if (el.style.backgroundColor || el.style.background) {
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
          }
          if (el.style.border) el.style.setProperty('border', 'none', 'important');
          if (el.style.boxShadow) el.style.setProperty('box-shadow', 'none', 'important');
        });
        isCleaning = false;
      });
    }

    // Observer na tanging inline style lang sa loob ng verse stage ang binabantayan
    const observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        // Huwag pakialaman kapag class name lang ng stage ang nagbago (Mode switching)
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          cleanStylesSafely();
          break;
        } else if (mutation.type === 'childList') {
          cleanStylesSafely();
          break;
        }
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      cleanStylesSafely();
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
  html = html.replace('</head>', refinedBlock + '\n</head>');
} else {
  html = refinedBlock + '\n' + html;
}

// Sariwang cache-buster timestamp para sa instant update
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Smooth na ang Mode Switch at wala nang glitch!');