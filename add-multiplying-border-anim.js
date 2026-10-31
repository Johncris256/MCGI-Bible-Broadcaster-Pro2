const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ENFORCING NO-ANIMATION CONTENT & MULTIPLYING BORDER ANIMATION ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang lahat ng naunang custom style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const borderAndContentBlock = `
<style id="MULTIPLYING_BORDER_ANIMATION_CSS">
  /* 1. PANLABAS NA CARD: Smooth Position & Size Transitions */
  #multiSlotStage,
  .render-box {
    transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.38s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.38s cubic-bezier(0.16, 1, 0.3, 1),
                top 0.38s cubic-bezier(0.16, 1, 0.3, 1),
                left 0.38s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, width, height, top, left;
    position: relative;
  }

  /* 2. STRICTLY NO ANIMATION SA VERSE CONTENT & TEXT (PREVENTS ANY TEXT GLITCH/FLICKER) */
  .reference-container, 
  .reference-title, 
  .version-subtitle, 
  .verse-container, 
  .verse-text,
  .verse-text *,
  .reference-container * {
    animation: none !important;
    transition: none !important;
    -webkit-transition: none !important;
    will-change: auto !important;
  }

  /* 3. MULTIPLYING BORDER EXPANSION KEYFRAMES (2 SPLIT TO 4 GRID EFFECT) */
  @keyframes multiplyBorderPulse {
    0% {
      box-shadow: 0 0 0 0px rgba(255, 215, 0, 0.8),
                  0 0 0 0px rgba(0, 119, 255, 0.5);
      border-color: #ffd700;
    }
    50% {
      box-shadow: 0 0 0 6px rgba(255, 215, 0, 0.4),
                  0 0 20px 8px rgba(0, 119, 255, 0.6);
      border-color: #00ffff;
    }
    100% {
      box-shadow: 0 0 0 0px rgba(255, 215, 0, 0),
                  0 0 0 0px rgba(0, 119, 255, 0);
    }
  }

  /* Class na itinatakip kapag nagpalit ng display mode */
  .render-box.multiply-border-active {
    animation: multiplyBorderPulse 0.55s cubic-bezier(0.16, 1, 0.3, 1) both !important;
    border: 2px solid #ffd700 !important;
  }

  /* 4. HARD CUT FONT-ONLY HIGHLIGHT (ZERO BACKGROUND, ZERO BARS) */
  span,
  .ndi-word,
  .ndi-space,
  .highlight-start,
  .highlight-end,
  .active-highlight,
  [class*="highlight"],
  [class*="ndi"] {
    transition: none !important;
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  /* 5. NORMAL UNHIGHLIGHTED TEXT */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 6. HIGHLIGHTED TEXT: INSTANT FONT GLOW */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.5),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="MULTIPLY_BORDER_TRIGGER">
  (function() {
    let lastModeClass = '';

    function checkAndTriggerBorderAnim() {
      const stage = document.getElementById('multiSlotStage');
      if (!stage) return;

      const currentModeClass = stage.className;

      // Kapag nagbago ang mode (halimbawa mula mode-2 patungong mode-4 / 2 split -> 4 grid)
      if (lastModeClass && lastModeClass !== currentModeClass) {
        const boxes = document.querySelectorAll('.render-box');
        boxes.forEach(box => {
          box.classList.remove('multiply-border-active');
          void box.offsetWidth; // Force Reflow
          box.classList.add('multiply-border-active');
          
          setTimeout(() => {
            box.classList.remove('multiply-border-active');
          }, 600);
        });
      }
      lastModeClass = currentModeClass;
    }

    // Direct MutationObserver
    const observer = new MutationObserver(() => {
      checkAndTriggerBorderAnim();
      
      // Force clean inline backgrounds for karaoke text
      document.querySelectorAll('span, [class*="highlight"]').forEach(el => {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
      });
    });

    window.addEventListener('DOMContentLoaded', () => {
      const stage = document.getElementById('multiSlotStage') || document.body;
      lastModeClass = stage.className;
      
      observer.observe(stage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    });
  })();
</script>
`;

if (html.includes('</head>')) {
  html = html.replace('</head>', borderAndContentBlock + '\n</head>');
} else {
  html = borderAndContentBlock + '\n' + html;
}

// Fresh cache-buster timestamp para ma-force reload ng browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Zero text animation & Multiplying Border effect applied!');