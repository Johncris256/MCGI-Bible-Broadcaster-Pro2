const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');
const opJsPath = path.join(baseDir, 'operator', 'operator.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');

console.log('--- SAFE APPEND INJECTION (HINDI BUBURA NG KAHIT ANONG CODE) ---');

// 1. OUTPUT HTML: Ligtas na pagdagdag ng CSS bago ang </head>
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');
  if (!html.includes('SAFE_FEATURES_CSS')) {
    const safeCss = `
    <style id="SAFE_FEATURES_CSS">
      /* 1. KARAOKE HIGHLIGHT: Walang padding, walang vertical bar, pure glow */
      .ndi-word, .ndi-space {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0px !important;
        margin: 0px !important;
        border-radius: 0px !important;
        color: #ffffff !important;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
        transition: color 0.15s ease, text-shadow 0.15s ease !important;
      }

      .ndi-word.active-highlight {
        color: #ffd700 !important;
        text-shadow: 0 0 6px #ffd700, 0 0 14px rgba(255, 215, 0, 0.45), 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
      }

      .highlight-start, .highlight-end {
        padding: 0px !important;
        margin: 0px !important;
        border-radius: 0px !important;
        box-shadow: none !important;
      }

      /* 2. SMOOTH FADE: Para sa Hide Verse Box */
      #multiSlotStage {
        transition: opacity 0.4s ease, transform 0.4s ease !important;
        opacity: 1;
        transform: scale(1);
      }
      body.hide-verse-box-active #multiSlotStage {
        opacity: 0 !important;
        transform: scale(0.96) !important;
        pointer-events: none !important;
      }

      /* 3. MOVE SWAP: Dudulas kapag nag-swap ng card */
      @keyframes cardGlideMove {
        0% { opacity: 0.3; transform: translateY(20px) scale(0.98); }
        100% { opacity: 1; transform: translateY(0px) scale(1); }
      }
      .card-swap-anim {
        animation: cardGlideMove 0.35s cubic-bezier(0.16, 1, 0.3, 1) both !important;
      }
    </style>
    `;
    html = html.replace('</head>', safeCss + '\n</head>');
    html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, 'src="output.js?v=' + Date.now() + '"');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na naidagdag ang CSS sa output.html');
  }
}

// 2. OUTPUT JS: Ligtas na pag-wrap sa Render Function (Walang buburahin)
if (fs.existsSync(outJsPath)) {
  let outJs = fs.readFileSync(outJsPath, 'utf8');
  if (!outJs.includes('SAFE_OUTPUT_OVERRIDE')) {
    const safeOutJs = `
// SAFE_OUTPUT_OVERRIDE
const originalRenderOutputState = renderOutputState;
let lastRenderedText = {};

renderOutputState = function(data) {
  // 1. PATAKBUHIN ANG ORIGINAL NA RENDER CODE (Kaya hindi masisira ang app)
  originalRenderOutputState(data);

  if (!data) return;

  // 2. OVERRIDE HARD CUT: I-force ang CSS Transition para mag-fade
  if (typeof data.hideVerseBox !== 'undefined') {
    document.body.classList.toggle('hide-verse-box-active', !!data.hideVerseBox);
    const stage = document.getElementById('multiSlotStage');
    if (stage && stage.style.display === 'none') stage.style.display = '';
    
    document.querySelectorAll('.render-box, .verse-box').forEach(el => {
       if (el.style.display === 'none') el.style.display = '';
    });
  }

  // 3. APPLY MOVE SWAP ANIMATION
  setTimeout(() => {
    document.querySelectorAll('.render-box, .verse-box').forEach((card, idx) => {
      const txt = card.textContent.trim();
      if (lastRenderedText[idx] !== txt && txt.length > 0) {
        card.classList.remove('card-swap-anim');
        void card.offsetWidth; // Reflow
        card.classList.add('card-swap-anim');
      }
      lastRenderedText[idx] = txt;
    });
  }, 20);
};
`;
    outJs = outJs + '\n' + safeOutJs;
    fs.writeFileSync(outJsPath, outJs, 'utf8');
    console.log('✓ Matagumpay na na-hook ang animation sa output.js nang ligtas');
  }
}

// 3. OPERATOR JS: Ligtas na Anti-Double Click Guard
if (fs.existsSync(opJsPath)) {
  let opJs = fs.readFileSync(opJsPath, 'utf8');
  if (!opJs.includes('SAFE_OPERATOR_GUARD')) {
    const safeOpJs = `
// SAFE_OPERATOR_GUARD
(function() {
  let activeModeName = '';
  let lastClickTime = 0;
  // Harangin ang click sa mode buttons bago pa mag-trigger
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const txt = (btn.textContent || '').trim().toLowerCase();
    const isMode = txt.includes('full') || txt.includes('split') || txt.includes('grid');
    
    if (isMode) {
      const now = Date.now();
      if (activeModeName === txt || (now - lastClickTime < 400)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
      activeModeName = txt;
      lastClickTime = now;
    } else {
      activeModeName = ''; 
    }
  }, true);
})();
`;
    opJs = opJs + '\n' + safeOpJs;
    fs.writeFileSync(opJsPath, opJs, 'utf8');
    console.log('✓ Matagumpay na naidagdag ang Click Guard sa operator.js');
  }
}

// CACHE BUSTER
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/src=["']operator\.js(\?v=\d+)?["']/gi, 'src="operator.js?v=' + Date.now() + '"');
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! LAHAT NG FEATURES AY NAIKABIT NANG LIGTAS.');
console.log('========================================================');