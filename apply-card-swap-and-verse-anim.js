const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');

console.log('--- APPLYING CARD SWAP MOTION & VERSE TRANSITION ANIMATIONS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// Linisin ang lahat ng naunang custom style at script tags
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

const cardAndVerseBlock = `
<style id="CARD_SWAP_AND_VERSE_ANIMATIONS">
  /* ==================== 1. CARD SLOT GLIDE / DRAG-LIKE MOTION ==================== */
  #multiSlotStage,
  .render-box {
    transition: transform 0.5s cubic-bezier(0.2, 1, 0.22, 1),
                width 0.5s cubic-bezier(0.2, 1, 0.22, 1),
                height 0.5s cubic-bezier(0.2, 1, 0.22, 1),
                top 0.5s cubic-bezier(0.2, 1, 0.22, 1),
                left 0.5s cubic-bezier(0.2, 1, 0.22, 1),
                opacity 0.4s ease !important;
    will-change: transform, width, height, top, left, opacity;
    position: relative;
    border-radius: 12px !important;
  }

  /* Keyframe kapag nagmo-move o nagse-swap ng slots (Drag & Drop feel) */
  @keyframes cardGlideShift {
    0% {
      transform: scale(0.93) translateY(12px);
      box-shadow: 0 10px 25px rgba(0, 242, 254, 0.4);
    }
    60% {
      transform: scale(1.02) translateY(-4px);
      box-shadow: 0 15px 30px rgba(255, 215, 0, 0.5);
    }
    100% {
      transform: scale(1) translateY(0px);
      box-shadow: none;
    }
  }

  .render-box.card-shift-active {
    animation: cardGlideShift 0.52s cubic-bezier(0.2, 1, 0.22, 1) both !important;
  }

  /* ==================== 2. VERSE TEXT TRANSITION ANIMATION ==================== */
  @keyframes verseTextEntrance {
    0% {
      opacity: 0;
      transform: translateY(18px) scale(0.98);
      filter: blur(3px);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1);
      filter: blur(0px);
    }
  }

  .verse-text-anim {
    animation: verseTextEntrance 0.42s cubic-bezier(0.16, 1, 0.3, 1) both !important;
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

  /* ==================== 4. FONT-ONLY KARAOKE HIGHLIGHT ==================== */
  .ndi-word, .ndi-space, span {
    color: #ffffff !important;
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.9) !important;
  }

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

<script id="SWAP_AND_VERSE_ANIM_ENGINE">
  (function() {
    let lastMode = '';
    let lastVerseTexts = {};

    function handleAnimationsAndClean() {
      // 1. Strip all inline backgrounds and borders for clean karaoke font
      document.querySelectorAll('span, [class*="highlight"], [class*="ndi"]').forEach(el => {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
        el.style.setProperty('padding', '0px', 'important');
      });

      const stage = document.getElementById('multiSlotStage');
      if (!stage) return;

      // 2. Card Swap / Mode Change Animation (Drag & Drop Card Motion)
      const currentMode = stage.className;
      if (lastMode && lastMode !== currentMode) {
        document.querySelectorAll('.render-box').forEach(box => {
          box.classList.remove('card-shift-active');
          void box.offsetWidth; // Force Reflow
          box.classList.add('card-shift-active');
          setTimeout(() => box.classList.remove('card-shift-active'), 550);
        });
      }
      lastMode = currentMode;

      // 3. Verse Text Entrance Animation kapag nag-palit ng talata
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

    const observer = new MutationObserver(handleAnimationsAndClean);

    window.addEventListener('DOMContentLoaded', () => {
      const stage = document.getElementById('multiSlotStage') || document.body;
      lastMode = stage.className;
      handleAnimationsAndClean();

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
  html = html.replace('</head>', cardAndVerseBlock + '\n</head>');
} else {
  html = cardAndVerseBlock + '\n' + html;
}

// Fresh cache-buster timestamp para ma-force reload ng browser
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Card Drag-Glide Motion at Verse Transition Animations applied!');