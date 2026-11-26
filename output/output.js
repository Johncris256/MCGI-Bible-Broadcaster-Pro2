let lastReceivedData = null;
const DEFAULT_LENGTH_FONT_SIZES = [100, 88, 88, 79, 74, 70, 67, 66, 60, 58, 58, 27, 27, 24];
const VERSE_LENGTH_RANGES = [
  [1,50],[51,100],[101,150],[151,200],[201,250],[251,300],[301,350],
  [351,400],[401,450],[451,500],[501,550],[551,600],[601,650],[651,999]
];
function getLengthBasedFontSize(textValue, values) {
  const length = Array.from(String(textValue || '').trim()).length;
  const fontSizes = Array.isArray(values) ? values : DEFAULT_LENGTH_FONT_SIZES;
  for (let i = 0; i < VERSE_LENGTH_RANGES.length; i++) {
    const [min, max] = VERSE_LENGTH_RANGES[i];
    const isFinalOpenEndedRange = i === VERSE_LENGTH_RANGES.length - 1;
    if (length >= min && (length <= max || isFinalOpenEndedRange)) {
      const candidate = Number(fontSizes[i]);
      return Number.isFinite(candidate) ? Math.min(100, Math.max(14, candidate)) : DEFAULT_LENGTH_FONT_SIZES[i];
    }
  }
  return DEFAULT_LENGTH_FONT_SIZES[DEFAULT_LENGTH_FONT_SIZES.length - 1];
}
function readClampedFloat(value, fallback, min, max, decimals = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(Math.min(max, Math.max(min, parsed)).toFixed(decimals)) : fallback;
}
const ALL_ANIM_CLASSES = ['anim-fade-slide', 'anim-page-flip-next', 'anim-page-flip-prev', 'anim-vertical-flip', 'anim-zoom-in'];

function applyAnimationVariables(anim) {
  const a = anim || {};
  const verseDur = (a.enabled === false) ? 0 : (parseFloat(a.duration) || 0.55);
  const highDur = (a.highlightAnimEnabled === false) ? 0 : (parseFloat(a.highlightDuration) || 0.35);
  const highOp = (a.highlightOpacity !== undefined) ? parseFloat(a.highlightOpacity) : 0.50;

  document.documentElement.style.setProperty('--verse-anim-duration', `${verseDur}s`);
  document.documentElement.style.setProperty('--highlight-anim-duration', `${highDur}s`);
  document.documentElement.style.setProperty('--highlight-bg-color', `rgba(250, 204, 21, ${highOp})`);
}

function triggerVerseAnimation(container, anim, direction) {
  // Layout-mode transitions animate the complete 16:9 canvas. Suppress the
  // separate verse-content entrance animation during that same transition.
  if (window.__bibleLayoutTransitionInProgress) return;
  ALL_ANIM_CLASSES.forEach(cls => container.classList.remove(cls));
  const a = anim || {};
  if (a.enabled === false) return;
  void container.offsetWidth;
  const styleType = a.style || 'fadeSlide';
  if (styleType === 'pageFlip') {
    container.classList.add(direction === 'prev' ? 'anim-page-flip-prev' : 'anim-page-flip-next');
  } else if (styleType === 'verticalFlip') {
    container.classList.add('anim-vertical-flip');
  } else if (styleType === 'zoomIn') {
    container.classList.add('anim-zoom-in');
  } else {
    container.classList.add('anim-fade-slide');
  }
}

function updateHighlightClasses(container, wordsLength, highSet) {
  for (let idx = 0; idx < wordsLength; idx++) {
    const isHigh = highSet.has(idx);
    const prevHigh = highSet.has(idx - 1);
    const nextHigh = highSet.has(idx + 1);
    const wordSpan = container.querySelector(`[data-idx='${idx}']`);
    if (wordSpan) {
      if (isHigh) {
        wordSpan.classList.add('active-highlight');
        wordSpan.classList.toggle('highlight-start', !prevHigh);
        wordSpan.classList.toggle('highlight-end', !nextHigh);
      } else {
        wordSpan.classList.remove('active-highlight', 'highlight-start', 'highlight-end');
      }
    }
    const spaceSpan = container.querySelector(`[data-space-after='${idx}']`);
    if (spaceSpan) {
      spaceSpan.classList.toggle('active-highlight', isHigh && nextHigh);
    }
  }
}

function adjustSlotFontSize(boxEl, displayMode, fontsObj, lengthFontSizes, letterSpacingPx, lineSpacing) {
  const canvas = boxEl.querySelector('.slot-canvas');
  const container = boxEl.querySelector('.verse-container');
  const text = boxEl.querySelector('.verse-text');
  const refTitle = boxEl.querySelector('.reference-title');
  const verSub = boxEl.querySelector('.version-subtitle');
  if (!canvas || !container || !text) return;

  // Reference title and translation/version label are independent controls.
  // The font dialog sends fontsObj.refSize and fontsObj.verSize separately;
  // never scale the version label from the reference title size.
  const readHeaderFontSize = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed)
      ? Math.min(120, Math.max(20, parsed))
      : fallback;
  };
  const rawRefSize = fontsObj && fontsObj.refSize;
  const hasExplicitRefSize = rawRefSize !== undefined && rawRefSize !== null &&
    String(rawRefSize).trim() !== '' && Number.isFinite(Number.parseInt(rawRefSize, 10));
  // The Bible Verse size in the font dialog is the single source of truth
  // for the reference/title label across every layout.
  const effectiveRefSize = hasExplicitRefSize ? readHeaderFontSize(rawRefSize, 65) : 65;
  const effectiveVerSize = readHeaderFontSize(fontsObj && fontsObj.verSize, 45);
  // Typography is fitted once on the native 16:9 canvas. Zoom X/Y then
  // stretches/compresses the canvas and every text element together.
  const contentText = text.textContent.trim();
  // The active content-length row is the only configured target. This fit pass
  // can still choose a smaller size only when the text does not fit its box.
  const effectiveMax = getLengthBasedFontSize(contentText, lengthFontSizes);
  const letterSpacing = readClampedFloat(letterSpacingPx, 0, -2, 10, 1);
  const lineHeight = readClampedFloat(lineSpacing, 1.55, 0.8, 2.5, 2);

  // Header labels use their dedicated font-dialog sizes. Verse text keeps
  // its independent content-length target and is fitted to the X/Y frame.
  if (refTitle) refTitle.style.fontSize = effectiveRefSize + 'px';
  if (verSub) verSub.style.fontSize = effectiveVerSize + 'px';
  text.style.setProperty('letter-spacing', letterSpacing + 'px', 'important');
  text.style.setProperty('line-height', String(lineHeight), 'important');
  text.style.width = '100%';
  text.style.maxHeight = '100%';
  text.style.overflow = 'hidden';

  const usableHeight = container.clientHeight;
  const usableWidth = container.clientWidth;
  const fitKey = [
    text.dataset.verseKey || '', effectiveMax, effectiveRefSize, effectiveVerSize,
    letterSpacing, lineHeight, container.clientWidth, container.clientHeight
  ].join('|');
  if (text.dataset.fontFitKey === fitKey && text.dataset.fittedFontSize) return;

  let low = 14;
  let high = Math.max(14, Math.floor(effectiveMax));
  let best = 14;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    text.style.fontSize = mid + 'px';
    if (text.scrollHeight <= usableHeight + 1 &&
        text.scrollWidth <= usableWidth + 1) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  text.style.fontSize = best + 'px';
  text.dataset.fittedFontSize = String(best);
  text.dataset.fontFitKey = fitKey;
}

function fitOutputScreenToViewport(screen) {
  const root = document.documentElement;
  const viewportWidth = Math.max(1, root.clientWidth || window.innerWidth || 1);
  const viewportHeight = Math.max(1, root.clientHeight || window.innerHeight || 1);
  const scale = Math.max(0.0001, Math.min(viewportWidth / 1920, viewportHeight / 1080));
  if (screen) {
    screen.style.setProperty('--output-screen-scale', String(scale));
    screen.dataset.designWidth = '1920';
    screen.dataset.designHeight = '1080';
    screen.dataset.designAspectRatio = '16:9';
  }
  return scale;
}

function fitOutputStageTo16x9(stage, outerMargin, displayMode) {
  // The stage is the safe-area layout grid. Each verse box remains a native
  // 1920x1080 canvas and is uniformly scaled to fit its layout cell. This
  // prevents the margin from changing text wrapping, font fitting, or shape.
  const margin = Math.max(0, Math.min(120, Number(outerMargin) || 0));
  const screen = document.getElementById('outputScreen');
  fitOutputScreenToViewport(screen);

  const width = Math.max(1, 1920 - margin * 2);
  let height = Math.max(1, 1080 - margin * 2);
  const gapRaw = parseFloat(getComputedStyle(stage).gap);
  const gap = Number.isFinite(gapRaw) ? Math.max(0, gapRaw) : 18;
  let top = margin;

  // 3 Split / 4 Grid should use the same compact horizontal tile spacing as
  // the layout design intends. If two 16:9 rows need slightly more height than
  // the vertical safe area provides, expand the stage and keep it centered
  // inside the 1920x1080 program frame. This avoids shrinking each tile and
  // creating a wide visual gap between the left/right canvases.
  if (displayMode === 3 || displayMode === 4) {
    const widthFitScale = Math.min((width - gap) / (2 * 1920), 1);
    const requiredGridHeight = (2 * 1080 * widthFitScale) + gap;
    if (requiredGridHeight > height) {
      height = Math.min(1080, requiredGridHeight);
      top = Math.max(0, (1080 - height) / 2);
    }
  }

  stage.style.position = 'absolute';
  stage.style.left = margin + 'px';
  stage.style.top = top + 'px';
  stage.style.width = width + 'px';
  stage.style.height = height + 'px';
  stage.style.aspectRatio = '16 / 9';
  stage.style.maxWidth = 'none';
  stage.style.maxHeight = 'none';
  stage.style.flex = 'none';
  stage.dataset.outputAspectRatio = '16:9';
  stage.style.setProperty('--output-safe-margin', margin + 'px');
  stage.style.setProperty('--screen-safe-margin', margin + 'px');
  stage.style.setProperty('--output-viewport-scale', String(
    Math.max(0.0001, Math.min(
      (document.documentElement.clientWidth || window.innerWidth || 1) / 1920,
      (document.documentElement.clientHeight || window.innerHeight || 1) / 1080
    ))
  ));
  // Never shrink the authored canvas itself; only its rendered scale changes.
  stage.style.setProperty('--canvas-width', '1920px');
  stage.style.setProperty('--canvas-height', '1080px');

  const safeWidth = Math.max(1, width - gap);
  const safeHeight = Math.max(1, height - gap);
  let scale = 1;
  if (displayMode === 1) {
    scale = Math.min(width / 1920, height / 1080, 1);
  } else if (displayMode === 2) {
    // Two independent 16:9 canvases share the safe width in one row.
    scale = Math.min(safeWidth / (2 * 1920), height / 1080, 1);
  } else if (displayMode === 3 || displayMode === 4) {
    // 3 Split keeps its centered lower canvas the same size as the two above;
    // 4 Grid uses the same per-cell 16:9 scale.
    scale = Math.min(safeWidth / (2 * 1920), safeHeight / (2 * 1080), 1);
  }
  stage.style.setProperty('--slot-scale', String(Math.max(0.01, scale)));
}

function applyModeFramingAdjustment(stage, displayMode, adjustments) {
  const modeValue = adjustments && adjustments[displayMode] ? adjustments[displayMode] : {};
  const rawZoomX = Number(modeValue.zoomX);
  const rawPanX = Number(modeValue.panX);
  const rawZoomY = Number(modeValue.zoomY);
  const rawPanY = Number(modeValue.panY);
  const zoomX = Math.min(1.5, Math.max(0.5, (Number.isFinite(rawZoomX) ? rawZoomX : 100) / 100));
  const panX = Math.min(400, Math.max(-400, Number.isFinite(rawPanX) ? rawPanX : 0));
  const zoomY = Math.min(1.5, Math.max(0.5, (Number.isFinite(rawZoomY) ? rawZoomY : 100) / 100));
  const panY = Math.min(400, Math.max(-400, Number.isFinite(rawPanY) ? rawPanY : 0));
  stage.style.setProperty('--slot-zoom-x', String(zoomX));
  stage.style.setProperty('--slot-zoom-x-inverse', String(1 / zoomX));
  stage.style.setProperty('--slot-zoom-x-width', (zoomX * 100) + '%');
  stage.style.setProperty('--slot-pan-x', panX + 'px');
  stage.style.setProperty('--slot-zoom-y', String(zoomY));
  stage.style.setProperty('--slot-zoom-y-inverse', String(1 / zoomY));
  stage.style.setProperty('--slot-pan-y', panY + 'px');
}

function applyBoxTypography(boxEl, fonts) {
  const outRefEl = boxEl.querySelector('.reference-title');
  const outVerEl = boxEl.querySelector('.version-subtitle');
  const outContentEl = boxEl.querySelector('.verse-text');
  const defaultFont = 'Arial, Helvetica, sans-serif';
  const defaultShadow = '2px 3px 6px rgba(0, 0, 0, 0.85), 0px 1px 3px rgba(0, 0, 0, 0.9)';
  const f = fonts || {};

  const refShadowOn = f.refShadow !== false;
  const verShadowOn = f.verShadow !== false;
  const contentShadowOn = f.contentShadow !== false;

  if (outRefEl) {
    outRefEl.style.setProperty('font-family', f.ref || defaultFont, 'important');
    outRefEl.style.setProperty('font-weight', f.refBold ? '700' : '400', 'important');
    outRefEl.style.setProperty('font-style', f.refItalic ? 'italic' : 'normal', 'important');
    outRefEl.style.setProperty('text-shadow', refShadowOn ? defaultShadow : 'none', 'important');
  }
  if (outVerEl) {
    outVerEl.style.setProperty('font-family', f.version || defaultFont, 'important');
    outVerEl.style.setProperty('font-weight', f.verBold ? '700' : '400', 'important');
    outVerEl.style.setProperty('font-style', f.verItalic ? 'italic' : 'normal', 'important');
    outVerEl.style.setProperty('color', '#FFFF00', 'important');
    outVerEl.style.setProperty('text-shadow', verShadowOn ? defaultShadow : 'none', 'important');
  }
  if (outContentEl) {
    outContentEl.style.setProperty('font-family', f.content || defaultFont, 'important');
    outContentEl.style.setProperty('font-weight', f.contentBold ? '700' : '400', 'important');
    outContentEl.style.setProperty('font-style', f.contentItalic ? 'italic' : 'normal', 'important');
  }
  boxEl.querySelectorAll('.ndi-word').forEach(span => {
    span.style.setProperty('text-shadow', contentShadowOn ? defaultShadow : 'none', 'important');
  });
}

const OUTPUT_BLUE_WAVE_STYLE_ID = 'OUTPUT_BLUE_WAVE_ANIMATED_BG_STYLE';
const OUTPUT_BLUE_WAVE_LAYER_ID = 'outputAnimatedBackgroundLayer';
let lastOutputBackgroundMode = '';

function ensureOutputBlueWaveStyles() {
  if (document.getElementById(OUTPUT_BLUE_WAVE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = OUTPUT_BLUE_WAVE_STYLE_ID;
  style.textContent = `
    #${OUTPUT_BLUE_WAVE_LAYER_ID} {
      position: absolute; inset: 0; z-index: 0; width: 1920px; height: 1080px;
      overflow: hidden; pointer-events: none;
      background: linear-gradient(45deg,#06368f 0%,#0757b8 35%,#167fdb 70%,#38a9ff 100%);
    }
    #${OUTPUT_BLUE_WAVE_LAYER_ID} svg { display:block; width:100%; height:100%; }
    #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-main { transform-origin:center; animation: outputBlueWaveMain 12s ease-in-out infinite alternate; }
    #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-upper { transform-origin:center; animation: outputBlueWaveUpper 15s ease-in-out infinite alternate; }
    #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-lower { transform-origin:center; animation: outputBlueWaveLower 13s ease-in-out infinite alternate; }
    #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-glow { animation: outputBlueWaveGlow 7s ease-in-out infinite alternate; }
    @keyframes outputBlueWaveMain { 0% { transform:translate(-2.5%,1.5%) scale(1.02); } 100% { transform:translate(2.5%,-1.5%) scale(1.05); } }
    @keyframes outputBlueWaveUpper { 0% { transform:translate(2%,-1.5%) scale(1.02); } 100% { transform:translate(-2%,1.5%) scale(1.04); } }
    @keyframes outputBlueWaveLower { 0% { transform:translate(-2%,1.5%) scale(1.02); } 100% { transform:translate(2%,-1.5%) scale(1.04); } }
    @keyframes outputBlueWaveGlow { 0% { opacity:.35; } 100% { opacity:.85; } }
    @media (prefers-reduced-motion: reduce) {
      #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-main, #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-upper,
      #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-lower, #${OUTPUT_BLUE_WAVE_LAYER_ID} .wave-glow,
      #${OUTPUT_BLUE_WAVE_LAYER_ID} animate, #${OUTPUT_BLUE_WAVE_LAYER_ID} animateTransform {
        display:none !important; animation:none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function createOutputBlueWaveMarkup() {
  return `
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="outWaveMainGradient" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#06368f"/><stop offset="35%" stop-color="#0752c4"/><stop offset="70%" stop-color="#087de8"/><stop offset="100%" stop-color="#38a9ff"/>
        </linearGradient>
        <linearGradient id="outWaveGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#168fff"/><stop offset="45%" stop-color="#0752c4"/><stop offset="100%" stop-color="#052b78"/>
        </linearGradient>
        <linearGradient id="outLightWave" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#83d4ff" stop-opacity=".5"/><stop offset="50%" stop-color="#24a0ff" stop-opacity=".22"/><stop offset="100%" stop-color="#087de8" stop-opacity="0"/>
        </linearGradient>
        <filter id="outWaveSoftBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="35"/></filter>
        <filter id="outWaveGlowBlur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="55"/></filter>
      </defs>
      <rect width="1600" height="900" fill="url(#outWaveMainGradient)"/>
      <g class="wave-glow" filter="url(#outWaveGlowBlur)">
        <ellipse cx="1180" cy="180" rx="520" ry="280" fill="#7bd0ff" opacity=".35"/>
        <ellipse cx="300" cy="760" rx="500" ry="280" fill="#001e68" opacity=".5"/>
      </g>
      <g class="wave-upper" filter="url(#outWaveSoftBlur)">
        <path d="M-100 180 C180 20 390 90 620 170 C900 270 1120 100 1370 80 C1530 65 1660 130 1750 190 L1750 -100 L-100 -100 Z" fill="url(#outLightWave)"/>
      </g>
      <g class="wave-main">
        <path d="M-100 500 C180 360 350 390 570 490 C820 610 990 520 1190 390 C1390 260 1540 330 1700 430 L1700 1050 L-100 1050 Z" fill="url(#outWaveGradient)" opacity=".9"/>
        <path d="M-100 590 C170 470 370 500 590 590 C830 690 1030 610 1230 500 C1430 390 1580 460 1700 530" fill="none" stroke="#45b5ff" stroke-width="85" opacity=".12" filter="url(#outWaveSoftBlur)"/>
      </g>
      <g class="wave-lower">
        <path d="M-100 740 C180 600 400 640 620 730 C860 830 1070 760 1280 660 C1470 570 1600 640 1700 700 L1700 1050 L-100 1050 Z" fill="#032b78" opacity=".52"/>
        <path d="M-100 790 C220 660 400 700 640 790 C880 880 1110 810 1320 710 C1490 630 1600 680 1700 740" fill="none" stroke="#168fff" stroke-width="55" opacity=".16" filter="url(#outWaveSoftBlur)"/>
      </g>
      <path d="M-100 300 C250 180 430 250 680 330 C950 420 1190 290 1450 220 C1550 195 1640 220 1700 250" fill="none" stroke="#a4e2ff" stroke-width="3" opacity=".12" filter="url(#outWaveSoftBlur)"/>
    </svg>
  `;
}


function createOutputAnimatedBackgroundMarkup(selectionId) {
  if (selectionId === 'blue-wave') return createOutputBlueWaveMarkup();
  const library = window.OUTPUT_ANIMATED_BACKGROUND_LIBRARY || {};
  return typeof library[selectionId] === 'string' ? library[selectionId] : createOutputBlueWaveMarkup();
}


function applyOutputBackground(backgroundValue) {
  const screen = document.getElementById('outputScreen');
  const stage = document.getElementById('multiSlotStage');
  if (!screen) return;
  const isAnimated = typeof backgroundValue === 'string' && backgroundValue.startsWith('animated:');
  let layer = document.getElementById(OUTPUT_BLUE_WAVE_LAYER_ID);

  if (isAnimated) {
    const selectionId = backgroundValue.slice('animated:'.length) || 'blue-wave';
    // Keep the SVG DOM alive across verse/highlight updates. It lives inside
    // the fixed screen so it scales/crops exactly with the full 1920x1080 frame.
    if (layer && layer.dataset.backgroundSelection === selectionId) {
      lastOutputBackgroundMode = backgroundValue;
      return;
    }
    ensureOutputBlueWaveStyles();
    if (!layer) {
      layer = document.createElement('div');
      layer.id = OUTPUT_BLUE_WAVE_LAYER_ID;
      screen.insertBefore(layer, stage || screen.firstChild);
    }
    layer.dataset.backgroundSelection = selectionId;
    layer.innerHTML = createOutputAnimatedBackgroundMarkup(selectionId);
    screen.style.backgroundColor = 'transparent';
    screen.style.backgroundImage = 'none';
    if (stage) stage.style.zIndex = '1';
    lastOutputBackgroundMode = backgroundValue;
    return;
  }

  if (layer) layer.remove();
  if (stage) stage.style.zIndex = '1';
  screen.style.backgroundImage = 'none';
  screen.style.backgroundPosition = 'center center';
  screen.style.backgroundRepeat = 'no-repeat';
  if (backgroundValue === 'transparent') {
    // Transparent inside the 16:9 program frame; letterbox bars remain black.
    screen.style.backgroundColor = 'transparent';
  } else if (typeof backgroundValue === 'string' && backgroundValue.startsWith('url')) {
    screen.style.backgroundImage = backgroundValue;
    screen.style.backgroundSize = 'cover';
    screen.style.backgroundColor = '#000000';
  } else {
    screen.style.backgroundColor = backgroundValue || '#004cff';
  }
  lastOutputBackgroundMode = backgroundValue || 'default';
}

// OUTPUT_EXTERNAL_BLEND_COMPOSITING_V1
// Keep each blend surface as a direct child of #outputScreen. The slot canvas
// is transformed and therefore forms its own stacking context; nesting a
// mix-blend-mode layer inside it prevents that layer from blending with the
// actual background. This mirrors the Operator preview: background, blend,
// and verse stage are sibling layers in one compositing context.
const OUTPUT_VERSE_BOX_BLEND_CLASS = 'output-verse-box-blend';
let outputVerseBoxBlendSyncFrame = null;
let outputVerseBoxBlendSyncUntil = 0;
let outputVerseBoxBlendLatestAppearance = { opacity: 88, blendMode: 'default', fill: '#0A193C', hidden: false };

function getOutputVerseBoxMultiplyFillColor(intensity) {
  const raw = Number.parseFloat(intensity);
  const strength = Math.min(300, Math.max(100, Number.isFinite(raw) ? raw : 100)) / 100;
  const base = [0x84, 0x99, 0xB8];
  return '#' + base.map(channel => Math.round(255 * Math.pow(channel / 255, strength)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// MULTIPLY_INTENSITY_OUTPUT_V1
function getOutputVerseBoxAppearance(settings) {
  const s = settings || {};
  const opacityRaw = Number.parseInt(s.verseBoxOpacity ?? 88, 10);
  const opacity = Math.min(100, Math.max(0, Number.isFinite(opacityRaw) ? opacityRaw : 88));
  const blendMode = ['default', 'multiply', 'darken'].includes(s.verseBoxBlendMode)
    ? s.verseBoxBlendMode
    : 'default';
  const intensityRaw = Number.parseInt(s.verseBoxMultiplyIntensity ?? 100, 10);
  const multiplyIntensity = Math.min(300, Math.max(100, Number.isFinite(intensityRaw) ? intensityRaw : 100));
  const fill = blendMode === 'multiply'
    ? getOutputVerseBoxMultiplyFillColor(multiplyIntensity)
    : (blendMode === 'darken' ? '#243B5E' : '#0A193C');
  return { opacity, blendMode, fill, hidden: !!s.hideBoxBg, multiplyIntensity };
}

function getOutputVerseBoxBlendTargets(stage) {
  const targets = new Map();
  const liveBoxes = Array.from(stage.children).filter(box =>
    box && box.classList && box.classList.contains('render-box')
  );

  liveBoxes.forEach((box, index) => {
    // Store the index on the element so the transition engine's cloned ghost
    // retains the same identity while it travels out of or into the layout.
    box.dataset.slotBox = String(index);
    targets.set(index, box);
  });

  // During FLIP transitions the visual tile may be a fixed ghost clone rather
  // than the live canvas. Prefer that clone so the blend stays attached to the
  // tile throughout 1->2, 2->1, and the other entering/exiting transitions.
  document.querySelectorAll('[data-layout-exit-ghost][data-slot-box]').forEach(ghost => {
    const index = Number.parseInt(ghost.getAttribute('data-slot-box'), 10);
    if (Number.isInteger(index) && index >= 0) targets.set(index, ghost);
  });

  return targets;
}

function syncOutputVerseBoxBlendOverlayPositions(appearance) {
  const screen = document.getElementById('outputScreen');
  const stage = document.getElementById('multiSlotStage');
  if (!screen || !stage) return;

  const screenRect = screen.getBoundingClientRect();
  const screenStyle = window.getComputedStyle(screen);
  const cssScale = Number.parseFloat(screenStyle.getPropertyValue('--output-screen-scale'));
  const screenScale = Math.max(0.0001, Number.isFinite(cssScale) && cssScale > 0
    ? cssScale
    : (screenRect.width / 1920) || 1);
  const targets = getOutputVerseBoxBlendTargets(stage);
  const validIndices = new Set();

  targets.forEach((box, index) => {
    const canvas = box.querySelector('.slot-canvas');
    if (!canvas) return;

    validIndices.add(index);
    let overlay = Array.from(screen.children).find(child =>
      child.classList && child.classList.contains(OUTPUT_VERSE_BOX_BLEND_CLASS) &&
      child.getAttribute('data-slot-index') === String(index)
    );

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = OUTPUT_VERSE_BOX_BLEND_CLASS;
      overlay.setAttribute('data-slot-index', String(index));
      overlay.setAttribute('aria-hidden', 'true');
      screen.appendChild(overlay);
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      overlay.style.display = 'none';
      return;
    }

    const left = (rect.left - screenRect.left) / screenScale;
    const top = (rect.top - screenRect.top) / screenScale;
    const width = rect.width / screenScale;
    const height = rect.height / screenScale;
    const canvasWidth = canvas.offsetWidth || 1920;
    const canvasHeight = canvas.offsetHeight || 1080;
    const localScaleX = width / canvasWidth;
    const localScaleY = height / canvasHeight;
    const canvasStyle = window.getComputedStyle(canvas);
    const radius = Number.parseFloat(canvasStyle.borderTopLeftRadius) || 0;

    overlay.style.position = 'absolute';
    overlay.style.left = left + 'px';
    overlay.style.top = top + 'px';
    overlay.style.width = width + 'px';
    overlay.style.height = height + 'px';
    overlay.style.borderRadius = (radius * localScaleX) + 'px / ' + (radius * localScaleY) + 'px';
    overlay.style.pointerEvents = 'none';
    overlay.style.backgroundColor = appearance.fill;
    overlay.style.opacity = String(appearance.opacity / 100);
    overlay.style.mixBlendMode = appearance.blendMode === 'default' ? 'normal' : appearance.blendMode;
    overlay.style.display = appearance.hidden || box.classList.contains('transparent-verse-box') || appearance.opacity <= 0
      ? 'none'
      : 'block';
  });

  // Remove stale overlay elements after a removed tile's exit ghost is gone.
  Array.from(screen.children).forEach(child => {
    if (!child.classList || !child.classList.contains(OUTPUT_VERSE_BOX_BLEND_CLASS)) return;
    const index = Number.parseInt(child.getAttribute('data-slot-index'), 10);
    if (!validIndices.has(index)) child.remove();
  });
}

function scheduleOutputVerseBoxBlendOverlaySync(appearance) {
  outputVerseBoxBlendLatestAppearance = appearance;
  const now = (window.performance && performance.now) ? performance.now() : Date.now();
  const refreshWindow = window.__bibleLayoutTransitionInProgress ? 760 : 260;
  outputVerseBoxBlendSyncUntil = Math.max(outputVerseBoxBlendSyncUntil, now + refreshWindow);
  if (outputVerseBoxBlendSyncFrame !== null) return;

  const raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : callback => window.setTimeout(callback, 16);

  const tick = () => {
    outputVerseBoxBlendSyncFrame = null;
    syncOutputVerseBoxBlendOverlayPositions(outputVerseBoxBlendLatestAppearance);
    const current = (window.performance && performance.now) ? performance.now() : Date.now();
    if (window.__bibleLayoutTransitionInProgress || current < outputVerseBoxBlendSyncUntil) {
      outputVerseBoxBlendSyncFrame = raf(tick);
    }
  };

  outputVerseBoxBlendSyncFrame = raf(tick);
}

function syncOutputVerseBoxBlendOverlays(settings) {
  const stage = document.getElementById('multiSlotStage');
  if (!stage) return;

  const appearance = getOutputVerseBoxAppearance(settings);

  // Remove legacy blend children from the transformed canvas. Leaving one here
  // would create a second, unblended grey layer below the new external overlay.
  stage.querySelectorAll('.slot-canvas > .output-verse-box-blend').forEach(node => node.remove());
  document.querySelectorAll('[data-layout-exit-ghost] .slot-canvas > .output-verse-box-blend')
    .forEach(node => node.remove());

  syncOutputVerseBoxBlendOverlayPositions(appearance);
  scheduleOutputVerseBoxBlendOverlaySync(appearance);
}

window.addEventListener('resize', () => {
  const data = (typeof lastReceivedData !== 'undefined' && lastReceivedData) ? lastReceivedData : null;
  syncOutputVerseBoxBlendOverlays(data && data.settings ? data.settings : {});
}, { passive: true });

function renderOutputState(data) {
  if (!data) return;
  lastReceivedData = data;

  const backgroundValue = (typeof data.bg === 'string' && data.bg)
    ? data.bg
    : "url('/images/Bible%20BG.jpg')";

  applyOutputBackground(backgroundValue);

  applyAnimationVariables(data.animation);
  const s = data.settings || {};
  const displayMode = parseInt(data.displayMode, 10) || 1;
  const modeSettings = (s.modeAdjustments && s.modeAdjustments[displayMode]) || {};
  // FULL_COMPOSITION_BASELINE_FOR_SPLIT_MODES
  // Treat every split view as a zoomed-out copy of the 1 Full composition.
  // Keep the active mode's Zoom/Pan below, but take typography, spacing and
  // inner padding from 1 Full so the verse never gets independently re-fitted
  // or crowded when changing to 2 Split, 3 Split or 4 Grid.
  const compositionSettings = displayMode === 1
    ? modeSettings
    : ((s.modeAdjustments && s.modeAdjustments[1]) || {});
  const readClampedInt = (value, fallback, min, max) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  const pad = readClampedInt(compositionSettings.boxPadding ?? s.boxPadding, 70, 10, 90);
  const outerMarginRaw = modeSettings.screenMargin !== undefined ? modeSettings.screenMargin : s.screenMargin;
  const outerMarginParsed = Number.parseInt(outerMarginRaw, 10);
  const outerMargin = Number.isFinite(outerMarginParsed) ? Math.min(120, Math.max(0, outerMarginParsed)) : 39;
  const hideBoxBg = Boolean(s.hideBoxBg);
  const topGapPx = readClampedInt(compositionSettings.topGap ?? s.topGap, 25, 0, 120);
  const letterSpacingPx = readClampedFloat(compositionSettings.letterSpacing, 0, -2, 10, 1);
  const lineSpacing = readClampedFloat(compositionSettings.lineSpacing, 1.55, 0.8, 2.5, 2);
  const lengthFontSizes = Array.isArray(s.lengthFontSizes) ? s.lengthFontSizes : DEFAULT_LENGTH_FONT_SIZES;

  document.documentElement.style.setProperty('--title-verse-gap', topGapPx + 'px');

  const stage = document.getElementById('multiSlotStage');
  stage.className = `mode-${displayMode}`;
  fitOutputStageTo16x9(stage, outerMargin, displayMode);
  applyModeFramingAdjustment(stage, displayMode, s.modeAdjustments);

  const slotsList = Array.isArray(data.slots) && data.slots.length > 0
    ? data.slots.slice(0, displayMode)
    : [];

  while (stage.children.length > slotsList.length) stage.removeChild(stage.lastChild);
  while (stage.children.length < slotsList.length) {
    const box = document.createElement('div');
    box.className = 'render-box';
    box.innerHTML = `
      <div class="slot-canvas">
        <div class="reference-container">
          <div class="reference-text-guard">
            <div class="reference-title"></div>
            <div class="version-subtitle"></div>
          </div>
        </div>
        <div class="verse-container">
          <div class="verse-text-guard">
            <div class="verse-text"></div>
          </div>
        </div>
      </div>
    `;
    stage.appendChild(box);
  }

  slotsList.forEach((slotData, sIdx) => {
    const boxEl = stage.children[sIdx];
    boxEl.dataset.slotBox = String(sIdx);
    const canvasEl = boxEl.querySelector('.slot-canvas');
    if (canvasEl) {
      canvasEl.style.padding = `${pad}px ${pad + 8}px`;
      canvasEl.style.borderRadius = outerMargin === 0 && displayMode === 1 ? '0px' : '14px';
    }
    boxEl.classList.toggle('transparent-verse-box', hideBoxBg);

    const refEl = boxEl.querySelector('.reference-title');
    const verEl = boxEl.querySelector('.version-subtitle');
    const contentEl = boxEl.querySelector('.verse-text');

    refEl.textContent = slotData.reference || '';
    verEl.textContent = slotData.version || '';

    const wordsArr = slotData.words || [];
    const hasSpaces = slotData.hasSpaces !== false;
    const highSet = new Set(slotData.highlighted || []);

    const newVerseKey = (slotData.reference || '') + '|' + (slotData.version || '') + '|' + wordsArr.join(' ');
    if (contentEl.dataset.verseKey !== newVerseKey || data.forcePreviewAnim) {
      contentEl.dataset.verseKey = newVerseKey;
      contentEl.innerHTML = '';
      triggerVerseAnimation(contentEl, data.animation, data.navDirection || 'next');

      wordsArr.forEach((word, wIdx) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('ndi-word');
        span.dataset.idx = wIdx;
        contentEl.appendChild(span);

        if (wIdx < wordsArr.length - 1 && hasSpaces) {
          const space = document.createElement('span');
          space.textContent = ' ';
          space.classList.add('ndi-space');
          space.dataset.spaceAfter = wIdx;
          contentEl.appendChild(space);
        }
      });
    }

    updateHighlightClasses(contentEl, wordsArr.length, highSet);
    applyBoxTypography(boxEl, data.fonts);
    adjustSlotFontSize(boxEl, displayMode, data.fonts, lengthFontSizes, letterSpacingPx, lineSpacing);
  });

  // Match Operator mini-monitor appearance: the box fill/opacity is a separate
  // layer behind the verse text and above the live background image.
  syncOutputVerseBoxBlendOverlays(s);
}

// 1. BroadcastChannel Listener (Tabs in same browser)
try {
  const bc = new BroadcastChannel('bible_live_stream');
  bc.onmessage = (e) => { if (e.data) renderOutputState(e.data); };
} catch (e) {}

// 2. LocalStorage Event (Tabs/Windows)
window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch (err) {}
  }
});

// 3. OBS CEF Realtime Poller (80ms interval ensures OBS gets live updates)
let lastTimestampSeen = 0;
setInterval(() => {
  const ts = localStorage.getItem('bible_live_timestamp');
  if (ts && ts !== String(lastTimestampSeen)) {
    lastTimestampSeen = ts;
    const raw = localStorage.getItem('bible_live_payload');
    if (raw) {
      try { renderOutputState(JSON.parse(raw)); } catch (err) {}
    }
  }
}, 80);

// Auto load cached state on launch
const savedInit = localStorage.getItem('bible_live_payload');
if (savedInit) {
  try { renderOutputState(JSON.parse(savedInit)); } catch (err) {}
}

// The 1920x1080 design canvas never changes its internal dimensions. A resize
// only recalculates one uniform scale on the outer screen wrapper; it must not
// re-render verses, refit text, or restart any verse/background animation.
let outputViewportResizeFrame = null;
function scheduleOutputViewportRefit() {
  if (outputViewportResizeFrame !== null) cancelAnimationFrame(outputViewportResizeFrame);
  outputViewportResizeFrame = requestAnimationFrame(() => {
    outputViewportResizeFrame = null;
    fitOutputScreenToViewport(document.getElementById('outputScreen'));
  });
}
fitOutputScreenToViewport(document.getElementById('outputScreen'));
window.addEventListener('resize', scheduleOutputViewportRefit, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleOutputViewportRefit, { passive: true });
}
window.addEventListener('orientationchange', scheduleOutputViewportRefit, { passive: true });

// WEBSOCKET REAL-TIME SYNC ENGINE (OBS + ALL BROWSERS)
function connectLiveSocket() {
  const wsHost = window.location.host || 'localhost:5000';
  const ws = new WebSocket('ws://' + wsHost);

  ws.onopen = () => console.log('✓ Connected to Bible Live Broadcast Feed');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      renderOutputState(data);
    } catch(e) {}
  };
  ws.onclose = () => setTimeout(connectLiveSocket, 1500);
  ws.onerror = () => ws.close();
}

connectLiveSocket();

// Fallback: BroadcastChannel at LocalStorage
try {
  const bc = new BroadcastChannel('bible_live_stream');
  bc.onmessage = (e) => { if (e.data) renderOutputState(e.data); };
} catch(e) {}

window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch(err) {}
  }
});


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
    // Do not stack the legacy per-card swap animation on top of a layout FLIP.
    // Still refresh the text cache so the next ordinary verse update is clean.
    if (window.__bibleLayoutTransitionInProgress) {
      document.querySelectorAll('.render-box, .verse-box').forEach((card, idx) => {
        lastRenderedText[idx] = card.textContent.trim();
      });
      return;
    }
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
