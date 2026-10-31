const fs = require('fs');
const path = require('path');
const vm = require('vm');

const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('--- AAYUSIN ANG HARD CUT PATUNGO SA CINEMATIC SMOOTH FADE ---');

// 1. I-UPDATE ANG OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // I-print ang mga lumang linyang humaharang sa animation
  const lines = js.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('hideVerseBox')) {
      console.log(`Natagpuan sa output.js (Line ${idx + 1}): ${l.trim()}`);
    }
  });

  // A. Palitan ang if (state.hideVerseBox) { ...style.display = 'none'... } else { ...style.display = ... }
  js = js.replace(
    /if\s*\(\s*([a-zA-Z0-9_$.]+)\.hideVerseBox\s*\)\s*\{[^}]*style\.display\s*=\s*['"]none['"][^}]*\}\s*else\s*\{[^}]*style\.display\s*=[^}]*\}/g,
    `document.body.classList.toggle('hide-verse-box-active', !!$1.hideVerseBox);`
  );

  // B. Palitan ang ternary assignment: box.style.display = state.hideVerseBox ? 'none' : ...
  js = js.replace(
    /([a-zA-Z0-9_$.]+)\.style\.display\s*=\s*([a-zA-Z0-9_$.]+)\.hideVerseBox\s*\?\s*['"]none['"]\s*:\s*['"][^'"]*['"];?/g,
    `document.body.classList.toggle('hide-verse-box-active', !!$2.hideVerseBox);`
  );

  // C. Palitan ang if (state.hideVerseBox) { box.style.visibility = 'hidden'; } else { ... }
  js = js.replace(
    /if\s*\(\s*([a-zA-Z0-9_$.]+)\.hideVerseBox\s*\)\s*\{[^}]*style\.visibility\s*=\s*['"]hidden['"][^}]*\}\s*else\s*\{[^}]*style\.visibility\s*=[^}]*\}/g,
    `document.body.classList.toggle('hide-verse-box-active', !!$1.hideVerseBox);`
  );

  // D. Tiyaking nahuhuli sa mismong message / sync handler
  const syncInterceptor = `
  // Intercept hideVerseBox para sa smooth fade
  if (typeof state !== 'undefined' && typeof state.hideVerseBox !== 'undefined') {
    document.body.classList.toggle('hide-verse-box-active', !!state.hideVerseBox);
  } else if (typeof data !== 'undefined' && typeof data.hideVerseBox !== 'undefined') {
    document.body.classList.toggle('hide-verse-box-active', !!data.hideVerseBox);
  }
`;

  if (!js.includes('hide-verse-box-active')) {
    js = syncInterceptor + '\n' + js;
  }

  // Linisin ang lumang helper kung meron man
  js = js.replace(/\/\/ ==================== SMOOTH VERSE BOX TOGGLE[\s\S]*?\/\/ ==================== END SMOOTH TOGGLE ====================\n?/gi, '');

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na naalis ang hard "display: none" sa output/output.js');
  } catch (e) {
    console.error('Syntax error:', e.message);
  }
}

// 2. I-UPDATE ANG OUTPUT.HTML PARA SA HARDWARE-ACCELERATED CSS FADE
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Alisin ang lumang fade css
  html = html.replace(/\/\* =+ SMOOTH FADE FOR VERSE BOX =+ \*\/[\s\S]*?\/\* =+ END SMOOTH FADE =+ \*\//gi, '');
  html = html.replace(/\/\* =+ HARDWARE-ACCELERATED SMOOTH FADE =+ \*\/[\s\S]*?\/\* =+ END HARDWARE FADE =+ \*\//gi, '');

  const universalFadeCss = `
  /* ==================== HARDWARE-ACCELERATED SMOOTH FADE ==================== */
  /* Lahat ng posibleng verse card container ay may transition */
  .verse-box,
  .verse-card,
  .slot-card,
  .slot-box,
  .verse-container,
  #verseBox,
  #mainCard,
  #card-1,
  .card {
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                visibility 0.4s ease !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: scale(1) !important;
  }

  /* Kapag naka-check ang Hide Verse Box: malumanay na fade-out at bahagyang scale-down */
  body.hide-verse-box-active .verse-box,
  body.hide-verse-box-active .verse-card,
  body.hide-verse-box-active .slot-card,
  body.hide-verse-box-active .slot-box,
  body.hide-verse-box-active .verse-container,
  body.hide-verse-box-active #verseBox,
  body.hide-verse-box-active #mainCard,
  body.hide-verse-box-active #card-1,
  body.hide-verse-box-active .card {
    opacity: 0 !important;
    visibility: hidden !important;
    transform: scale(0.96) !important;
    pointer-events: none !important;
  }
  /* ==================== END HARDWARE FADE ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', universalFadeCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na nailagay ang CSS Transition sa output/output.html');
  }
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAKA-ENABLE NA ANG CINEMATIC FADE-IN AT FADE-OUT!');
console.log('========================================================');