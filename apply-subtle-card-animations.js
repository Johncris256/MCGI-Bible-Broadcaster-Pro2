const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- APPLYING SUBTLE ELEGANT ANIMATIONS (NO CYAN BORDER GLOW) ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang lahat ng naunang custom style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const subtleAnimationBlock = `
<style id="SUBTLE_ELEGANT_ANIMATIONS">
  /* ==================== 1. SUBTLE ELEGANT CARD TRANSITIONS ==================== */
  #multiSlotStage,
  .render-box {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                top 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                left 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s ease !important;
    will-change: transform, width, height, top, left, opacity;
    position: relative;
    box-shadow: none !important; /* Explicitly removed cyan/gold glowing border effects */
  }

  /* Banayad at hiyang na card shifting effect */
  @keyframes subtleCardShift {
    0% {
      opacity: 0.85;
      transform: scale(0.98);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .render-box.subtle-shift-active {
    animation: subtleCardShift 0.38s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  /* ==================== 2. SUBTLE VERSE TEXT TRANSITION ==================== */
  @keyframes subtleVerseEntrance {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0px);
    }
  }

  .verse-text-anim {
    animation: subtleVerseEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  /* ==================== 3. STRICT ZERO VERTICAL BARS RESET ==================== */
  span,
  .ndi-word,
  .ndi-space,
  .highlight-start,
  .highlight-end,
  .active-highlight,
  [class*="highlight"],
  [class*="ndi"] {
    transition: color 0.12s ease !important;
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

  /* ==================== 4. PRISTINE FONT-ONLY KARAOKE HIGHLIGHT ==================== */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.9) !important;
  }

  .active-highlight,
  .ndi-word.active-highlight,
  span.active-highlight {
    color: #ffd700 !important;
    text-shadow: 0 0 8px #ffd700,
                 0 0 16px rgba(255, 215, 0, 0.45),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  *::before, *::after {
    display: none !important;
    content: none !important;
  }
</style>

<script id="SUBTLE_ANIM_ENGINE">
  (function() {
    let lastMode = '';
    let lastVerseTexts = {};

    function applySubtleEffects() {
      // 1. Permanent cleaning ng background & border artifacts
      document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]').forEach(el => {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
        el.style.setProperty('padding', '0px', 'important');
      });

      const stage = document.getElementById('multiSlotStage');
      if (!stage) return;

      // 2. Subtle Card Motion trigger on mode change
      const currentMode = stage.className;
      if (lastMode && lastMode !== currentMode) {
        document.querySelectorAll('.render-box').forEach(box => {
          box.classList.remove('subtle-shift-active');
          void box.offsetWidth; // Force Reflow
          box.classList.add('subtle-shift-active');
          setTimeout(() => box.classList.remove('subtle-shift-active'), 400);
        });
      }
      lastMode = currentMode;

      // 3. Subtle Verse Text Entrance trigger on verse update
      document.querySelectorAll('.render-box').forEach((box, idx) => {
        const verseEl = box.querySelector('.verse-text');
        if (verseEl) {
          const txt = verseEl.textContent.trim();
          if (lastVerseTexts[idx] !== txt && txt.length > 0) {
            verseEl.classList.remove('verse-text-anim');
            void verseEl.offsetWidth; // Reflow
            verseEl.classList.add('verse-text-anim');
          }
          lastVerseTexts[idx] = txt;
        }
      });
    }

    const observer = new MutationObserver(applySubtleEffects);

    window.addEventListener('DOMContentLoaded', () => {
      const stage = document.getElementById('multiSlotStage') || document.body;
      lastMode = stage.className;
      applySubtleEffects();

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
  html = html.replace('</head>', subtleAnimationBlock + '\n</head>');
} else {
  html = subtleAnimationBlock + '\n' + html;
}

// Fresh cache-buster timestamp
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Applied subtle card/verse transitions and completely removed cyan border expansion.');