const fs = require('fs');
const path = require('path');
const vm = require('vm');

const opJsPath = path.join('C:', 'bible-html5-app', 'operator', 'operator.js');
const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('--- DIRECT INJECTION: MODE GUARD, FADE-OUT, AT MOVE SWAP ---');

// 1. I-INJECT ANG EVENT CAPTURING GUARD SA OPERATOR.JS
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  // Tanggalin ang lumang failed injections kung meron man
  opCode = opCode.replace(/\/\/ ==================== DISPLAY MODE CLICK GUARD[\s\S]*?\/\/ ==================== END DISPLAY MODE GUARD ====================\n?/gi, '');
  opCode = opCode.replace(/\/\/ ==================== UNIVERSAL MODE CAPTURE GUARD[\s\S]*?\/\/ ==================== END UNIVERSAL GUARD ====================\n?/gi, '');

  const universalCaptureGuard = `
// ==================== UNIVERSAL MODE CAPTURE GUARD ====================
(function() {
  let activeModeName = '';
  let lastModeClick = 0;

  // Gumamit ng capture: true upang unahan ang lahat ng click handlers
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, .btn, [data-mode]');
    if (!btn) return;

    const label = (btn.textContent || '').trim().toLowerCase();
    const isModeButton = label.includes('full') || label.includes('split') || label.includes('grid');

    if (isModeButton) {
      const now = Date.now();
      // Kung kaparehong mode o na-double click nang mas mabilis sa 400ms: Harangin agad!
      if (activeModeName === label || (now - lastModeClick < 400)) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
      activeModeName = label;
      lastModeClick = now;
    }
  }, true);
})();
// ==================== END UNIVERSAL GUARD ====================
`;

  opCode = universalCaptureGuard + '\n' + opCode;

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Matagumpay na naikabit ang Single-Click Mode Lock sa operator.js');
  } catch (err) {
    console.error('Syntax error sa operator.js:', err.message);
  }
}

// 2. I-INJECT ANG CSS TRANSITIONS AT MOVE/SWAP KEYFRAMES SA OUTPUT.HTML
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang lumang styles
  html = html.replace(/\/\* =+ HARDWARE-ACCELERATED SMOOTH FADE =+ \*\/[\s\S]*?\/\* =+ END HARDWARE FADE =+ \*\//gi, '');
  html = html.replace(/\/\* =+ CARD MOVE AND SWAP ANIMATION =+ \*\/[\s\S]*?\/\* =+ END SWAP ANIMATION =+ \*\//gi, '');
  html = html.replace(/\/\* =+ UNIVERSAL BROADCAST TRANSITIONS =+ \*\/[\s\S]*?\/\* =+ END BROADCAST TRANSITIONS =+ \*\//gi, '');

  const universalBroadcastCss = `
  /* ==================== UNIVERSAL BROADCAST TRANSITIONS ==================== */
  /* Lahat ng container at cards ay may 0.4s smooth transition */
  .verse-box,
  .verse-card,
  .slot-card,
  .slot-box,
  .verse-container,
  #verseBox,
  #mainCard,
  #card-1,
  .card,
  [class*="slot"],
  [class*="card"],
  [class*="verse"] {
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: opacity, transform;
  }

  /* Kapag itinago (Hide Verse Box): banayad na fade out at subtle scale-down */
  body.hide-verse-box-active .verse-box,
  body.hide-verse-box-active .verse-card,
  body.hide-verse-box-active .slot-card,
  body.hide-verse-box-active .slot-box,
  body.hide-verse-box-active .verse-container,
  body.hide-verse-box-active #verseBox,
  body.hide-verse-box-active #mainCard,
  body.hide-verse-box-active #card-1,
  body.hide-verse-box-active .card,
  body.hide-verse-box-active [class*="slot"],
  body.hide-verse-box-active [class*="card"] {
    opacity: 0 !important;
    transform: scale(0.96) !important;
    pointer-events: none !important;
  }

  /* Card Move / Glide Swap Animation */
  @keyframes cardMoveGlide {
    0% {
      opacity: 0.4;
      transform: translateY(22px) scale(0.97);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1);
    }
  }

  .card-glide-active {
    animation: cardMoveGlide 0.38s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }
  /* ==================== END BROADCAST TRANSITIONS ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', universalBroadcastCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na na-update ang CSS rules sa output.html');
  }
}

// 3. I-HOOK ANG WEBSOCKET AT DOM ENGINE SA OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Linisin ang mga lumang failed helper injections
  js = js.replace(/\/\/ ==================== OUTPUT ANIMATION ENGINE WITH MOVE SWAP[\s\S]*?\/\/ ==================== END OUTPUT ENGINE ====================\n?/gi, '');
  js = js.replace(/\/\/ ==================== UNIVERSAL OUTPUT RUNTIME INTERCEPTOR[\s\S]*?\/\/ ==================== END RUNTIME INTERCEPTOR ====================\n?/gi, '');

  const runtimeInterceptor = `
// ==================== UNIVERSAL OUTPUT RUNTIME INTERCEPTOR ====================
(function() {
  let lastVerseCache = {};

  // 1. Intercept at i-override ang anumang pagtatangkang maglagay ng display: 'none'
  const observer = new MutationObserver(function() {
    if (document.body.classList.contains('hide-verse-box-active')) {
      const cards = document.querySelectorAll('.verse-box, .verse-card, .slot-card, .card, [class*="card"], [class*="slot"]');
      cards.forEach(c => {
        if (c.style.display === 'none') {
          c.style.display = ''; // Alisin ang hard cut para gumana ang CSS fade out
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

  // 2. Card Move / Swap Animation Trigger
  window.checkAndTriggerSwapAnimation = function() {
    const cards = document.querySelectorAll('.verse-box, .verse-card, .slot-card, .card, [class*="card"], [class*="slot"]');
    cards.forEach((card, idx) => {
      const currentText = (card.textContent || '').trim();
      if (lastVerseCache[idx] && lastVerseCache[idx] !== currentText && currentText.length > 0) {
        card.classList.remove('card-glide-active');
        void card.offsetWidth; // Reflow
        card.classList.add('card-glide-active');
      }
      lastVerseCache[idx] = currentText;
    });
  };

  // 3. Intercept WebSocket messages para sa Hide Verse Box at Move Swap
  const origWebSocket = window.WebSocket;
  if (origWebSocket) {
    window.WebSocket = function(...args) {
      const ws = new origWebSocket(...args);
      ws.addEventListener('message', function(evt) {
        try {
          const data = JSON.parse(evt.data);
          if (typeof data.hideVerseBox !== 'undefined') {
            document.body.classList.toggle('hide-verse-box-active', !!data.hideVerseBox);
          }
          setTimeout(() => {
            if (typeof window.checkAndTriggerSwapAnimation === 'function') {
              window.checkAndTriggerSwapAnimation();
            }
          }, 40);
        } catch(e) {}
      });
      return ws;
    };
  }
})();
// ==================== END RUNTIME INTERCEPTOR ====================
`;

  js = runtimeInterceptor + '\n' + js;

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na naikabit ang Runtime Interceptor sa output.js');
  } catch (err) {
    console.error('Syntax error sa output.js:', err.message);
  }
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAKA-APPLY NA ANG LAHAT NG FEATURES!');
console.log('========================================================');