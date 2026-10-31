const fs = require('fs');
const path = require('path');
const vm = require('vm');

const opJsPath = path.join('C:', 'bible-html5-app', 'operator', 'operator.js');
const outHtmlPath = path.join('C:', 'bible-html5-app', 'output', 'output.html');
const outJsPath = path.join('C:', 'bible-html5-app', 'output', 'output.js');

console.log('--- IKINAKABIT ANG MODE CLICK GUARD AT CARD SWAP ANIMATION ---');

// 1. I-UPDATE ANG OPERATOR.JS: ANTI-DOUBLE CLICK & SAME-MODE GUARD
if (fs.existsSync(opJsPath)) {
  let opCode = fs.readFileSync(opJsPath, 'utf8');

  const modeGuardHelper = `
// ==================== DISPLAY MODE CLICK GUARD ====================
let currentActiveDisplayMode = null;
let modeSwitchDebounceTimer = null;

function setDisplayModeSafe(newMode, originalHandler) {
  if (!newMode) return;
  // 1. Kung ito na ang aktibong display mode, huwag nang ulitin ang animation
  if (currentActiveDisplayMode === newMode) {
    return;
  }

  // 2. Cooldown lock laban sa mabilisang double-click
  if (modeSwitchDebounceTimer) {
    return;
  }

  currentActiveDisplayMode = newMode;
  modeSwitchDebounceTimer = setTimeout(() => {
    modeSwitchDebounceTimer = null;
  }, 350);

  if (typeof originalHandler === 'function') {
    originalHandler();
  }
}
// ==================== END DISPLAY MODE GUARD ====================
`;

  opCode = opCode.replace(/\/\/ ==================== DISPLAY MODE CLICK GUARD[\s\S]*?\/\/ ==================== END DISPLAY MODE GUARD ====================\n?/gi, '');
  opCode = modeGuardHelper + '\n' + opCode;

  // I-wrap ang mga click handlers ng display mode buttons
  opCode = opCode.replace(
    /(function\s+(?:setDisplayMode|changeDisplayMode|switchDisplayMode|handleDisplayModeChange)\s*\(([^)]*)\)\s*\{)/,
    `$1\n  if (currentActiveDisplayMode === $2) return;\n  currentActiveDisplayMode = $2;`
  );

  try {
    new vm.Script(opCode);
    fs.writeFileSync(opJsPath, opCode, 'utf8');
    console.log('✓ Matagumpay na nailagay ang Single-Click Mode Guard sa operator/operator.js');
  } catch (e) {
    console.error('Error sa operator.js:', e.message);
  }
}

// 2. I-UPDATE ANG OUTPUT.HTML PARA SA CARD SWAP / MOVE ANIMATION
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Alisin ang lumang swap styles kung mayroon
  html = html.replace(/\/\* =+ CARD MOVE AND SWAP ANIMATION =+ \*\/[\s\S]*?\/\* =+ END SWAP ANIMATION =+ \*\//gi, '');

  const swapAnimCss = `
  /* ==================== CARD MOVE AND SWAP ANIMATION ==================== */
  /* Maayos na layout transition kapag naglilipat ng slot o nagpapalit ng split mode */
  .verse-box,
  .verse-card,
  .slot-card,
  .slot-box,
  .verse-container,
  #verseBox,
  #mainCard,
  #card-1,
  .card {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                opacity 0.35s ease,
                flex 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                width 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                height 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
    will-change: transform, opacity;
  }

  /* Engaging Move / Glide Swap Effect */
  @keyframes cardGlideSwap {
    0% {
      transform: translateY(18px) scale(0.96);
      opacity: 0.65;
    }
    50% {
      transform: translateY(-4px) scale(1.01);
      opacity: 0.9;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  .card-move-swap {
    animation: cardGlideSwap 0.42s cubic-bezier(0.16, 1, 0.3, 1) both !important;
  }
  /* ==================== END SWAP ANIMATION ==================== */
  `;

  if (html.includes('</style>')) {
    html = html.replace('</style>', swapAnimCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na naidagdag ang Swap Move Keyframes sa output/output.html');
  }
}

// 3. I-UPDATE ANG OUTPUT.JS: SINGLE ANIMATION TRIGGER & SWAP DETECTOR
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  const outputModeGuard = `
// ==================== OUTPUT ANIMATION ENGINE WITH MOVE SWAP ====================
let lastRenderedMode = null;
let lastRenderedVerseKeys = {};

function triggerCardMoveSwapAnimation(cardElement, slotId, currentVerseKey) {
  if (!cardElement) return;

  // Kung nagbago ang talata o nag-swap ng slot, i-play ang engaging glide movement
  if (lastRenderedVerseKeys[slotId] && lastRenderedVerseKeys[slotId] !== currentVerseKey) {
    cardElement.classList.remove('card-move-swap');
    void cardElement.offsetWidth; // Reflow para mag-restart nang malinis
    cardElement.classList.add('card-move-swap');
  }
  lastRenderedVerseKeys[slotId] = currentVerseKey;
}
// ==================== END OUTPUT ENGINE ====================
`;

  js = js.replace(/\/\/ ==================== OUTPUT ANIMATION ENGINE WITH MOVE SWAP[\s\S]*?\/\/ ==================== END OUTPUT ENGINE ====================\n?/gi, '');
  js = outputModeGuard + '\n' + js;

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na na-update ang output/output.js para sa move swap animations');
  } catch (e) {
    console.error('Error sa output.js:', e.message);
  }
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAKA-LOCK NA ANG DOUBLE-CLICK AT MAY MOVE SWAP NA!');
console.log('========================================================');