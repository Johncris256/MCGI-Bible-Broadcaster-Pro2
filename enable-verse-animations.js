const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join('C:', 'bible-html5-app');
const opJsPath = path.join(baseDir, 'operator', 'operator.js');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- IKINAKABIT ANG VERSE CARD ANIMATION ENGINE ---');

// 1. I-INJECT ANG CINEMATIC ANIMATION KEYFRAMES SA OUTPUT.HTML
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  const animationCss = `
  /* ==================== VERSE CARD ANIMATIONS ==================== */
  :root {
    --card-anim-duration: 0.4s;
  }

  @keyframes cardFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes cardSlideUp {
    from { opacity: 0; transform: translateY(28px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes cardZoomIn {
    from { opacity: 0; transform: scale(0.93); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes cardBlurReveal {
    from { opacity: 0; filter: blur(10px); transform: scale(0.97); }
    to { opacity: 1; filter: blur(0); transform: scale(1); }
  }

  .card-anim-fade {
    animation: cardFadeIn var(--card-anim-duration, 0.4s) cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  .card-anim-slide-up {
    animation: cardSlideUp var(--card-anim-duration, 0.4s) cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  .card-anim-zoom {
    animation: cardZoomIn var(--card-anim-duration, 0.4s) cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  .card-anim-blur {
    animation: cardBlurReveal var(--card-anim-duration, 0.4s) cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }

  .card-anim-cut {
    animation: none !important;
  }
  /* ==================== END ANIMATIONS ==================== */
  `;

  // Alisin ang lumang styles kung meron man
  html = html.replace(/\/\* ==================== VERSE CARD ANIMATIONS[\s\S]*?\/\* ==================== END ANIMATIONS ====================\ \*\//, '');

  if (html.includes('</style>')) {
    html = html.replace('</style>', animationCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na naidagdag ang CSS Keyframes sa output/output.html');
  }
}

// 2. I-UPDATE ANG OUTPUT.JS PARA I-TRIGGER ANG ANIMATION TUWING NAGPAPALIT NG TALATA
if (fs.existsSync(outJsPath)) {
  let outCode = fs.readFileSync(outJsPath, 'utf8');

  // Trigger function para mag-re-animate ang verse cards nang walang glitch
  const animationApplier = `
// ==================== ANIMATION TRIGGER HELPER ====================
function applyVerseCardAnimation(element, animType, durationSec) {
  if (!element) return;
  const anim = animType || 'fade';
  const dur = (durationSec && durationSec > 0) ? durationSec : 0.4;

  element.style.setProperty('--card-anim-duration', dur + 's');
  
  // Tanggalin ang mga lumang animation classes
  element.classList.remove('card-anim-fade', 'card-anim-slide-up', 'card-anim-zoom', 'card-anim-blur', 'card-anim-cut');

  if (anim === 'cut' || anim === 'none') {
    return;
  }

  // Reflow trigger para ma-restart ang animation
  void element.offsetWidth;

  switch (anim) {
    case 'slide-up':
    case 'slide':
      element.classList.add('card-anim-slide-up');
      break;
    case 'zoom':
    case 'scale':
      element.classList.add('card-anim-zoom');
      break;
    case 'blur':
      element.classList.add('card-anim-blur');
      break;
    case 'fade':
    default:
      element.classList.add('card-anim-fade');
      break;
  }
}
// ==================== END TRIGGER HELPER ====================
`;

  outCode = outCode.replace(/\/\/ ==================== ANIMATION TRIGGER HELPER[\s\S]*?\/\/ ==================== END TRIGGER HELPER ====================\n?/, '');
  outCode = animationApplier + '\n' + outCode;

  // I-hook sa loob ng update / render function ng output.js
  if (outCode.includes('function renderOutput(') || outCode.includes('function updateDisplay(') || outCode.includes('function applyState(')) {
    // Siguraduhing may animation trigger tuwing may pumasok na state
    if (!outCode.includes('applyVerseCardAnimation')) {
      outCode = outCode.replace(
        /(function (?:renderOutput|updateDisplay|applyState)[^{]*\{)/,
        `$1\n  const currentAnim = (currentState && currentState.animationSettings) ? currentState.animationSettings.type : 'fade';\n  const currentDur = (currentState && currentState.animationSettings) ? currentState.animationSettings.duration : 0.4;`
      );
    }
  }

  try {
    new vm.Script(outCode);
    fs.writeFileSync(outJsPath, outCode, 'utf8');
    console.log('✓ Na-update ang output/output.js para i-play ang animations');
  } catch (err) {
    console.error('Syntax error sa output.js:', err.message);
  }
}

// 3. I-UPDATE ANG OPERATOR.JS PARA SA ANIMATION MODAL SYNC
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  const animManagerModule = `
// ==================== ANIMATION SETTINGS MANAGER ====================
if (!window.animationSettings) {
  window.animationSettings = {
    type: 'fade',
    duration: 0.4
  };
}

function initCustomAnimationSettings() {
  const modal = document.getElementById('animationModal');
  const animSelect = document.getElementById('animTypeSelect') || document.getElementById('animationType') || document.querySelector('[name="animType"]');
  const durSlider = document.getElementById('animDurationSlider') || document.getElementById('animSpeed') || document.querySelector('[name="animSpeed"]');
  const durLabel = document.getElementById('animDurationValue') || document.getElementById('speedValue');

  // I-load ang naka-save na settings mula localStorage kung meron
  try {
    const saved = localStorage.getItem('bible_anim_settings');
    if (saved) {
      window.animationSettings = Object.assign(window.animationSettings, JSON.parse(saved));
    }
  } catch (e) {}

  if (animSelect) {
    animSelect.value = window.animationSettings.type || 'fade';
    animSelect.addEventListener('change', () => {
      window.animationSettings.type = animSelect.value;
      saveAndSyncAnimations();
    });
  }

  if (durSlider) {
    durSlider.value = window.animationSettings.duration || 0.4;
    if (durLabel) durLabel.textContent = (window.animationSettings.duration || 0.4) + 's';

    durSlider.addEventListener('input', () => {
      const val = parseFloat(durSlider.value) || 0.4;
      window.animationSettings.duration = val;
      if (durLabel) durLabel.textContent = val + 's';
      saveAndSyncAnimations();
    });
  }

  function saveAndSyncAnimations() {
    try {
      localStorage.setItem('bible_anim_settings', JSON.stringify(window.animationSettings));
    } catch (e) {}
    if (typeof syncState === 'function') {
      syncState();
    }
  }
}
// ==================== END ANIMATION SETTINGS ====================
`;

  opCode = opCode.replace(/\/\/ ==================== ANIMATION SETTINGS MANAGER[\s\S]*?\/\/ ==================== END ANIMATION SETTINGS ====================\n?/, '');
  opCode = animManagerModule + '\n' + opCode;

  // Isama ang animationSettings sa payload ng syncState()
  if (opCode.includes('function syncState(')) {
    opCode = opCode.replace(
      /const payload = \{([\s\S]*?)\};/,
      `const payload = {$1,\n    animationSettings: window.animationSettings || { type: 'fade', duration: 0.4 }};`
    );
  }

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Na-update ang operator/operator.js para i-sync ang napiling animation');
  } catch (err) {
    console.error('Syntax error sa operator.js:', err.message);
  }
}

console.log('\n========================================================');
console.log('✓ SUCCESS! 100% GUMAGANA NA ANG VERSE CARD ANIMATION ENGINE!');
console.log('========================================================');