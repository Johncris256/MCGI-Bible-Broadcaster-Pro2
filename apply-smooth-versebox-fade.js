const fs = require('fs');
const path = require('path');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('--- IKINAKABIT ANG SMOOTH FADE-IN AT FADE-OUT SA VERSE BOX ---');

// 1. I-UPDATE ANG OUTPUT.HTML PARA SA SMOOTH FADE TRANSITION
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Tanggalin ang lumang fade rules kung mayroon
  html = html.replace(/\/\* =+ SMOOTH FADE FOR VERSE BOX =+ \*\/[\s\S]*?\/\* =+ END SMOOTH FADE =+ \*\//gi, '');

  const smoothFadeCss = `
  /* ==================== SMOOTH FADE FOR VERSE BOX ==================== */
  /* Verse card/box transition para sa malumanay na fade in at fade out */
  .verse-box,
  .verse-card,
  .slot-card,
  .slot-box,
  .verse-container,
  #verseBox,
  #mainCard,
  .card {
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                visibility 0.45s ease !important;
    opacity: 1;
    visibility: visible;
    transform: scale(1);
  }

  /* Kapag naka-on ang Hide Verse Box: banayad na fade out at subtle scale down */
  body.hide-verse-box .verse-box,
  body.hide-verse-box .verse-card,
  body.hide-verse-box .slot-card,
  body.hide-verse-box .slot-box,
  body.hide-verse-box .verse-container,
  body.hide-verse-box #verseBox,
  body.hide-verse-box #mainCard,
  body.hide-verse-box .card,
  .verse-box.is-box-hidden,
  .verse-card.is-box-hidden {
    opacity: 0 !important;
    visibility: hidden !important;
    transform: scale(0.97) !important;
    pointer-events: none !important;
  }
  /* ==================== END SMOOTH FADE ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', smoothFadeCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na nailagay ang Smooth Fade CSS sa output/output.html');
  }
}

// 2. I-UPDATE ANG OUTPUT.JS PARA GAMITIN ANG CLASS TOGGLE SA HALIP NA DISPLAY: NONE
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Helper para sa smooth toggling ng hideVerseBox
  const smoothToggleHelper = `
// ==================== SMOOTH VERSE BOX TOGGLE ====================
function handleSmoothHideVerseBox(shouldHide) {
  if (shouldHide) {
    document.body.classList.add('hide-verse-box');
  } else {
    document.body.classList.remove('hide-verse-box');
  }

  // Tiyaking hindi instant 'display: none' ang humaharang sa CSS transition
  const boxes = document.querySelectorAll('.verse-box, .verse-card, .slot-card, .slot-box, .verse-container, #verseBox, #mainCard');
  boxes.forEach(box => {
    if (box.style.display === 'none') {
      box.style.display = '';
    }
    box.classList.toggle('is-box-hidden', !!shouldHide);
  });
}
// ==================== END SMOOTH TOGGLE ====================
`;

  js = js.replace(/\/\/ ==================== SMOOTH VERSE BOX TOGGLE[\s\S]*?\/\/ ==================== END SMOOTH TOGGLE ====================\n?/gi, '');
  js = smoothToggleHelper + '\n' + js;

  // I-hook sa update / render handler kung saan binabasa ang state.hideVerseBox
  if (js.includes('hideVerseBox')) {
    // Palitan ang mga lumang direct display assignment (hal. box.style.display = 'none')
    js = js.replace(
      /([a-zA-Z0-9_$.]+)\.style\.display\s*=\s*([a-zA-Z0-9_$.]+)\.hideVerseBox\s*\?\s*['"]none['"]\s*:\s*['"][^'"]*['"];?/g,
      `handleSmoothHideVerseBox(!!$2.hideVerseBox);`
    );

    // Siguraduhing tinatawag ang helper tuwing may state change
    if (!js.includes('handleSmoothHideVerseBox(state.hideVerseBox)')) {
      js = js.replace(
        /(function\s+(?:applyState|renderOutput|updateDisplay|onStateChange)[^{]*\{)/,
        `$1\n  if (typeof state !== 'undefined' && typeof state.hideVerseBox !== 'undefined') { handleSmoothHideVerseBox(state.hideVerseBox); }`
      );
    }
  }

  fs.writeFileSync(outJsPath, js, 'utf8');
  console.log('✓ Matagumpay na na-hook ang smooth toggle sa output/output.js');
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! SMOOTH FADE-IN AT FADE-OUT NA ANG VERSE BOX!');
console.log('========================================================');