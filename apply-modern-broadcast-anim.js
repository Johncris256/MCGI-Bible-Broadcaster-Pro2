const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- ENFORCING MODERN BROADCAST ANIMATIONS & ZERO BARS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang lahat ng naunang custom style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const modernBroadcastBlock = `
<style id="MODERN_BROADCAST_ANIMATIONS">
  /* ==================== 1. MODERN CARD SWITCHING TRANSITION ==================== */
  #multiSlotStage,
  .render-box {
    transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                top 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                left 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.4s ease !important;
    will-change: transform, width, height, top, left, opacity;
    position: relative;
    border-radius: 12px !important;
  }

  /* ==================== 2. MODERN MULTIPLYING BORDER EFFECT ==================== */
  @keyframes modernBorderExpand {
    0% {
      box-shadow: 0 0 0 0px rgba(0, 242, 254, 0.8),
                  0 0 0 0px rgba(255, 215, 0, 0.6);
      border-color: #00f2fe;
    }
    40% {
      box-shadow: 0 0 0 8px rgba(0, 242, 254, 0.3),
                  0 0 24px 12px rgba(255, 215, 0, 0.4);
      border-color: #ffd700;
    }
    100% {
      box-shadow: 0 0 0 0px rgba(0, 242, 254, 0),
                  0 0 0 0px rgba(255, 215, 0, 0);
    }
  }

  .render-box.modern-multiply-active {
    animation: modernBorderExpand 0.6s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  /* ==================== 3. COOL STAGGER TEXT ANIMATION ==================== */
  @keyframes modernTextRise {
    0% {
      opacity: 0;
      transform: translateY(14px) scale(0.98);
      filter: blur(4px);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1);
      filter: blur(0px);
    }
  }

  /* Cool animation sa buong verse text block */
  .verse-text, .reference-container {
    animation: modernTextRise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  /* ==================== 4. PERMANENT ZERO VERTICAL BAR RESET ==================== */
  span,
  .ndi-word,
  .ndi-space,
  .highlight-start,
  .highlight-end,
  .active-highlight,
  [class*="highlight"],
  [class*="ndi"] {
    transition: color 0.12s ease !important; /* Mabilis at malinis na color switch */
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

  /* ==================== 5. FONT-ONLY KARAOKE HIGHLIGHT ==================== */
  /* Normal Text: Pure White */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.9) !important;
  }

  /* Highlighted Font: Gold Glow */
  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 10px #ffd700,
                 0 0 20px rgba(255, 215, 0, 0.6),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="MODERN_ANIMATION_ENGINE">
  (function() {
    let lastMode = '';

    function cleanBarsAndTriggerAnim() {
      // 1. Permanently strip any injected yellow bar styles
      const elements = document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]');
      elements.forEach(el => {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
        el.style.setProperty('padding', '0px', 'important');
      });

      // 2. Trigger Modern Border Animation on Mode Switch
      const stage = document.getElementById('multiSlotStage');
      if (stage) {
        const currentMode = stage.className;
        if (lastMode && lastMode !== currentMode) {
          document.querySelectorAll('.render-box').forEach(box => {
            box.classList.remove('modern-multiply-active');
            void box.offsetWidth; // Reflow
            box.classList.add('modern-multiply-active');
            setTimeout(() => box.classList.remove('modern-multiply-active'), 650);
          });
        }
        lastMode = currentMode;
      }
    }

    const observer = new MutationObserver(cleanBarsAndTriggerAnim);

    window.addEventListener('DOMContentLoaded', () => {
      const stage = document.getElementById('multiSlotStage') || document.body;
      lastMode = stage.className;
      cleanBarsAndTriggerAnim();

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
  html = html.replace('</head>', modernBroadcastBlock + '\n</head>');
} else {
  html = modernBroadcastBlock + '\n' + html;
}

// Fresh cache-buster timestamp para ma-force reload ng browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Modern Broadcast Animations at Zero Vertical Bars Applied!');