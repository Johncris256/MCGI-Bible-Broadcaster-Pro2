
window.onerror = function(msg, url, line) {
  console.error("Operator Error: " + msg + " at line " + line);
};

const translationsCache = {};
let translationsMetaList = [];
let activeSlotIndex = 0;
let outputDisplayMode = 1;
let isMouseDown = false;
let dragSlotIdx = null;
let dragStartWordIdx = null;
let dragTargetState = true;
const DEFAULT_BACKGROUND_URL = '/images/Bible%20BG.jpg';
let currentCustomBg = "url('" + DEFAULT_BACKGROUND_URL + "')";
let animatedBgActive = localStorage.getItem('bible_background_mode') === 'animated';
const VALID_ANIMATED_BG_SELECTIONS = new Set(['blue-wave', 'digibible-blue', 'spbb-pennant']);
let selectedAnimatedBg = localStorage.getItem('bible_animated_bg_selection') || 'blue-wave';
if (!VALID_ANIMATED_BG_SELECTIONS.has(selectedAnimatedBg)) selectedAnimatedBg = 'blue-wave';
let verseHistoryList = [];
let copiedSlotClipboard = null;
let contextTargetSlot = 0;

const slots = [
  { transId: '001', versionName: 'ANG DATING BIBLIA', bookIndex: 0, chapter: '1', verse: '1', words: [], highlighted: new Set() },
  { transId: '001', versionName: 'ANG DATING BIBLIA', bookIndex: 0, chapter: '1', verse: '1', words: [], highlighted: new Set() },
  { transId: '001', versionName: 'ANG DATING BIBLIA', bookIndex: 0, chapter: '1', verse: '2', words: [], highlighted: new Set() },
  { transId: '001', versionName: 'ANG DATING BIBLIA', bookIndex: 0, chapter: '1', verse: '3', words: [], highlighted: new Set() }
];

const DEFAULT_ARIAL = 'Arial, Helvetica, sans-serif';
const VERSE_LENGTH_RANGES = Object.freeze([
  { min: 1, max: 50 }, { min: 51, max: 100 }, { min: 101, max: 150 },
  { min: 151, max: 200 }, { min: 201, max: 250 }, { min: 251, max: 300 },
  { min: 301, max: 350 }, { min: 351, max: 400 }, { min: 401, max: 450 },
  { min: 451, max: 500 }, { min: 501, max: 550 }, { min: 551, max: 600 },
  { min: 601, max: 650 }, { min: 651, max: 999 }
]);
const PREVIOUS_DEFAULT_LENGTH_FONT_SIZES = Object.freeze([68, 69, 68, 59, 56, 50, 48, 43, 42, 28, 29, 27, 27, 24]);
const DEFAULT_LENGTH_FONT_SIZES = Object.freeze([100, 88, 88, 79, 74, 70, 67, 66, 60, 58, 58, 27, 27, 24]);
function loadLengthFontSizes() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('bible_length_font_sizes') || '[]'); } catch (e) {}
  const versionKey = 'bible_length_font_defaults_version';
  const needsMigration = localStorage.getItem(versionKey) !== '2026-11-01-v3';
  let migrated = false;
  const result = DEFAULT_LENGTH_FONT_SIZES.map((fallback, index) => {
    const raw = Array.isArray(saved) ? saved[index] : undefined;
    const value = Number(raw);
    if (needsMigration && Number.isFinite(value) && value === PREVIOUS_DEFAULT_LENGTH_FONT_SIZES[index]) {
      migrated = true;
      return fallback;
    }
    return Number.isFinite(value) ? Math.min(100, Math.max(14, Math.round(value))) : fallback;
  });
  if (needsMigration && Array.isArray(saved) && saved.length > 0) {
    try {
      if (migrated) localStorage.setItem('bible_length_font_sizes', JSON.stringify(result));
      localStorage.setItem(versionKey, '2026-11-01-v3');
    } catch (e) {}
  }
  return result;
}
window.customLengthFontSizes = loadLengthFontSizes();
window.customOutputFonts = {
  ref: localStorage.getItem('bible_font_ref') || DEFAULT_ARIAL,
  refBold: localStorage.getItem('bible_font_ref_bold') !== 'false',
  refItalic: localStorage.getItem('bible_font_ref_italic') === 'true',
  refShadow: localStorage.getItem('bible_font_ref_shadow') !== 'false',
  version: localStorage.getItem('bible_font_ver') || DEFAULT_ARIAL,
  verBold: localStorage.getItem('bible_font_ver_bold') !== 'false',
  verItalic: localStorage.getItem('bible_font_ver_italic') !== 'false',
  verShadow: localStorage.getItem('bible_font_ver_shadow') !== 'false',
  content: localStorage.getItem('bible_font_content') || DEFAULT_ARIAL,
  contentBold: localStorage.getItem('bible_font_content_bold') !== 'false',
  contentItalic: localStorage.getItem('bible_font_content_italic') === 'true',
  contentShadow: localStorage.getItem('bible_font_content_shadow') !== 'false',
  refSize: parseInt(localStorage.getItem('bible_font_ref_size') || '60', 10),
  verSize: parseInt(localStorage.getItem('bible_font_ver_size') || '45', 10),
  contentSize: parseInt(localStorage.getItem('bible_max_font_size') || '100', 10)
};

window.customLayoutSettings = {
  topGap: parseInt(localStorage.getItem('bible_top_gap') || '1', 10),
  screenMargin: parseInt(localStorage.getItem('bible_screen_margin') || '39', 10),
  boxPadding: parseInt(localStorage.getItem('bible_box_padding') || '70', 10),
  maxFontSize: parseInt(localStorage.getItem('bible_max_font_size') || '100', 10),
  hideBoxBg: localStorage.getItem('bible_hide_box_bg') === 'true'
};

// Per-layout defaults. New X framing and Title Size controls preserve the
// existing Y framing, spacing, and verse-length font behavior.
const DEFAULT_MODE_TITLE_SIZE = Math.min(120, Math.max(20, Number(window.customOutputFonts.refSize) || 60));
const DEFAULT_MODE_ADJUSTMENTS = Object.freeze({
  1: Object.freeze({ zoomX: 100, panX: 0, zoomY: 100, panY: 0, titleSize: DEFAULT_MODE_TITLE_SIZE, topGap: 11, boxPadding: 55, letterSpacing: -1.1, lineSpacing: 1.20 }),
  2: Object.freeze({ zoomX: 100, panX: 0, zoomY: 100, panY: -82, titleSize: DEFAULT_MODE_TITLE_SIZE, topGap: 30, boxPadding: 59, letterSpacing: -1.1, lineSpacing: 1.20 }),
  3: Object.freeze({ zoomX: 82, panX: 0, zoomY: 82, panY: 0, titleSize: 60, topGap: 50, boxPadding: 65, letterSpacing: -1.0, lineSpacing: 1.20}),
  4: Object.freeze({ zoomX: 82, panX: 0, zoomY: 82, panY: 0, titleSize: 60, topGap: 50, boxPadding: 65, letterSpacing: -1.0, lineSpacing: 1.20})
});
const MODE_DEFAULTS_VERSION = '2026-11-07-layout-xy-title-v4';
function getDefaultModeAdjustment(mode) {
  return { ...(DEFAULT_MODE_ADJUSTMENTS[mode] || DEFAULT_MODE_ADJUSTMENTS[1]) };
}
function normalizeModeAdjustment(value, mode = 1) {
  const item = value && typeof value === 'object' ? value : {};
  const defaults = DEFAULT_MODE_ADJUSTMENTS[mode] || DEFAULT_MODE_ADJUSTMENTS[1];
  const boundedInt = (raw, fallback, min, max) => {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };
  const boundedNumber = (raw, fallback, min, max, decimals) => {
    const n = Number(raw);
    return Number.isFinite(n) ? Number(Math.min(max, Math.max(min, n)).toFixed(decimals)) : fallback;
  };
  return {
    zoomX: boundedInt(item.zoomX, defaults.zoomX, 50, 150),
    panX: boundedInt(item.panX, defaults.panX, -400, 400),
    zoomY: boundedInt(item.zoomY, defaults.zoomY, 50, 150),
    panY: boundedInt(item.panY, defaults.panY, -400, 400),
    titleSize: boundedInt(item.titleSize, defaults.titleSize, 20, 120),
    topGap: boundedInt(item.topGap, defaults.topGap, 0, 120),
    boxPadding: boundedInt(item.boxPadding, defaults.boxPadding, 10, 90),
    letterSpacing: boundedNumber(item.letterSpacing, defaults.letterSpacing, -2, 10, 1),
    lineSpacing: boundedNumber(item.lineSpacing, defaults.lineSpacing, 0.8, 2.5, 2)
  };
}
function migrateLegacyModeDefaults(value, mode) {
  const item = value && typeof value === 'object' ? { ...value } : {};
  const defaults = DEFAULT_MODE_ADJUSTMENTS[mode] || DEFAULT_MODE_ADJUSTMENTS[1];
  // Add newly introduced controls without changing existing custom values.
  if (item.zoomX === undefined || item.zoomX === null) item.zoomX = defaults.zoomX;
  if (item.panX === undefined || item.panX === null) item.panX = defaults.panX;
  if (item.titleSize === undefined || item.titleSize === null) item.titleSize = defaults.titleSize;
  // Upgrade only the previous untouched generic Y defaults. Keep deliberate values.
  if (item.zoomY === undefined || item.zoomY === null || (Number(item.zoomY) === 100 && defaults.zoomY !== 100)) item.zoomY = defaults.zoomY;
  if (item.panY === undefined || item.panY === null || (Number(item.panY) === 0 && defaults.panY !== 0)) item.panY = defaults.panY;
  if (item.topGap === undefined || item.topGap === null || Number(item.topGap) === 1) item.topGap = defaults.topGap;
  if (item.boxPadding === undefined || item.boxPadding === null || Number(item.boxPadding) === 70) item.boxPadding = defaults.boxPadding;
  if (item.letterSpacing === undefined || item.letterSpacing === null || Number(item.letterSpacing) === 0) item.letterSpacing = defaults.letterSpacing;
  if (item.lineSpacing === undefined || item.lineSpacing === null || Number(item.lineSpacing) === 1.55) item.lineSpacing = defaults.lineSpacing;
  // Move untouched values from XY/Title v1 to the new 3 Split / 4 Grid defaults.
  // Values different from the previous defaults are treated as operator customizations.
  const previousXYTitleDefaults = {
    3: { zoomX: 100, titleSize: DEFAULT_MODE_TITLE_SIZE, topGap: 70, boxPadding: 65, letterSpacing: -1.0 },
    4: { zoomX: 100, titleSize: DEFAULT_MODE_TITLE_SIZE, topGap: 65, boxPadding: 70, letterSpacing: -1.1 }
  }[mode];
  if (previousXYTitleDefaults) {
    Object.keys(previousXYTitleDefaults).forEach(field => {
      if (item[field] !== undefined && item[field] !== null && Number(item[field]) === Number(previousXYTitleDefaults[field])) {
        item[field] = defaults[field];
      }
    });
  }
  // Upgrade the untouched 82% Zoom X/Y values from the previous 3 Split / 4 Grid defaults.
  // Values other than 82% remain as deliberate operator customizations.
  const previousSplitZoomDefaults = {
    3: { zoomX: 82, zoomY: 82 },
    4: { zoomX: 82, zoomY: 82 }
  }[mode];
  if (previousSplitZoomDefaults) {
    Object.keys(previousSplitZoomDefaults).forEach(field => {
      if (item[field] !== undefined && item[field] !== null && Number(item[field]) === previousSplitZoomDefaults[field]) {
        item[field] = defaults[field];
      }
    });
  }
  delete item.maxFontSize;
  return item;
}
function loadModeAdjustments() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('bible_mode_adjustments') || '{}'); } catch (e) {}
  const versionKey = 'bible_mode_adjustments_defaults_version';
  const needsMigration = localStorage.getItem(versionKey) !== MODE_DEFAULTS_VERSION;
  const normalized = {};
  [1, 2, 3, 4].forEach(mode => {
    const raw = needsMigration && saved[mode] ? migrateLegacyModeDefaults(saved[mode], mode) : saved[mode];
    normalized[mode] = normalizeModeAdjustment(raw, mode);
  });
  if (needsMigration && saved && Object.keys(saved).length > 0) {
    try {
      localStorage.setItem('bible_mode_adjustments', JSON.stringify(normalized));
      localStorage.setItem(versionKey, MODE_DEFAULTS_VERSION);
    } catch (e) {}
  }
  return normalized;
}
window.customModeAdjustments = loadModeAdjustments();

// Server-memory hydration happens after this script initializes on a new device.
// Reload the per-mode values then, and rebroadcast once the workspace is ready.
window.addEventListener('bbl-live-storage-hydrated', () => {
  // Upgrade old factory defaults once, but preserve values that the operator
  // had deliberately customized away from the old defaults.
  const defaultsVersion = '2026-11-01-layout-typography-defaults-v3';
  if (localStorage.getItem('bible_defaults_version') !== defaultsVersion) {
    const upgrades = [
      ['bible_font_ref_size', '38', '60'],
      ['bible_font_ver_size', '19', '45'],
      ['bible_max_font_size', '46', '100'],
      ['bible_screen_margin', '55', '39'],
      ['bible_top_gap', '18', '1'],
      ['bible_box_padding', '40', '70'],
      ['bible_op_slot_font_size', '26', '24']
    ];
    upgrades.forEach(([key, oldValue, newValue]) => {
      const current = localStorage.getItem(key);
      if (current === null || current === oldValue) localStorage.setItem(key, newValue);
    });
    // The old global Max default was 72px. Move that untouched default to 100px
    // so the new content-length presets (including the 100px short-verse row) work.
    if (['72', '80'].includes(localStorage.getItem('bible_max_font_size'))) {
      localStorage.setItem('bible_max_font_size', '100');
    }
    localStorage.setItem('bible_defaults_version', '2026-11-01-layout-typography-defaults-v3');
  }

  // Re-read settings only after server memory has hydrated, avoiding old
  // browser defaults overwriting the shared session.
  window.customOutputFonts = {
    ref: localStorage.getItem('bible_font_ref') || DEFAULT_ARIAL,
    refBold: localStorage.getItem('bible_font_ref_bold') !== 'false',
    refItalic: localStorage.getItem('bible_font_ref_italic') === 'true',
    refShadow: localStorage.getItem('bible_font_ref_shadow') !== 'false',
    version: localStorage.getItem('bible_font_ver') || DEFAULT_ARIAL,
    verBold: localStorage.getItem('bible_font_ver_bold') !== 'false',
    verItalic: localStorage.getItem('bible_font_ver_italic') !== 'false',
    verShadow: localStorage.getItem('bible_font_ver_shadow') !== 'false',
    content: localStorage.getItem('bible_font_content') || DEFAULT_ARIAL,
    contentBold: localStorage.getItem('bible_font_content_bold') !== 'false',
    contentItalic: localStorage.getItem('bible_font_content_italic') === 'true',
    contentShadow: localStorage.getItem('bible_font_content_shadow') !== 'false',
    refSize: parseInt(localStorage.getItem('bible_font_ref_size') || '60', 10),
    verSize: parseInt(localStorage.getItem('bible_font_ver_size') || '45', 10),
    contentSize: parseInt(localStorage.getItem('bible_max_font_size') || '100', 10)
  };
  window.customLayoutSettings = {
    screenMargin: parseInt(localStorage.getItem('bible_screen_margin') || '39', 10),
    topGap: parseInt(localStorage.getItem('bible_top_gap') || '1', 10),
    boxPadding: parseInt(localStorage.getItem('bible_box_padding') || '70', 10),
    maxFontSize: parseInt(localStorage.getItem('bible_max_font_size') || '100', 10),
    hideBoxBg: localStorage.getItem('bible_hide_box_bg') === 'true'
  };
  window.customModeAdjustments = loadModeAdjustments();
  window.customLengthFontSizes = loadLengthFontSizes();

  const savedBgUrl = localStorage.getItem('bible_custom_bg_url');
  currentCustomBg = savedBgUrl && /^\/uploads\/backgrounds\/[a-f0-9]{32}\.(?:jpg|png|gif|webp|bmp)$/.test(savedBgUrl)
    ? "url('" + savedBgUrl + "')" : "url('" + DEFAULT_BACKGROUND_URL + "')";
  animatedBgActive = localStorage.getItem('bible_background_mode') === 'animated';
  selectedAnimatedBg = localStorage.getItem('bible_animated_bg_selection') || 'blue-wave';
  if (typeof updateAnimatedBgButtonState === 'function') updateAnimatedBgButtonState();

  const opSize = parseInt(localStorage.getItem('bible_op_slot_font_size') || '24', 10);
  document.documentElement.style.setProperty('--op-slot-font-size', opSize + 'px');
  ['opSlotFontRange', 'opSlotFontInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = String(opSize);
  });
  if (typeof initFontModalValues === 'function') initFontModalValues();
  if (window._workspaceBooted) syncState();
});

window.customAnimSettings = {
  enabled: localStorage.getItem('bible_anim_enabled') !== 'false',
  style: localStorage.getItem('bible_anim_style') || 'fadeSlide',
  duration: parseFloat(localStorage.getItem('bible_anim_duration') || '0.55'),
  highlightAnimEnabled: localStorage.getItem('bible_high_anim_enabled') !== 'false',
  highlightDuration: parseFloat(localStorage.getItem('bible_high_anim_duration') || '0.35'),
  highlightOpacity: parseFloat(localStorage.getItem('bible_high_opacity') || '0.50')
};

async function ensureTranslationLoaded(transId) {
  if (translationsCache[transId]) return translationsCache[transId];
  try {
    const res = await fetch('../data/translations/' + encodeURIComponent(transId) + '.json');
    const data = await res.json();
    translationsCache[transId] = data;
    return data;
  } catch (err) {
    console.error('Error loading translation:', transId, err);
    return {};
  }
}

function getActiveSlot() { return slots[activeSlotIndex]; }
function getActiveBibleData() { return translationsCache[getActiveSlot().transId] || {}; }

function syncState(forcePreviewAnim) {
  const transparentToggle = document.getElementById('transparentToggle');
  const bgColor = document.getElementById('bgColor');
  let bgToSend = (transparentToggle && transparentToggle.checked) ? 'transparent' : (bgColor ? bgColor.value : '#004cff');
  if (currentCustomBg && transparentToggle && !transparentToggle.checked) bgToSend = currentCustomBg;
  if (animatedBgActive && !(transparentToggle && transparentToggle.checked)) {
    bgToSend = 'animated:' + (selectedAnimatedBg || 'blue-wave');
  }

  const serializedSlots = slots.map(s => ({
    transId: s.transId || '001',
    bookIndex: Number.isInteger(s.bookIndex) ? s.bookIndex : 0,
    chapter: String(s.chapter || '1'),
    verse: String(s.verse || '1'),
    reference: s.reference || 'GENESIS 1:1',
    version: s.versionName || 'ANG DATING BIBLIA',
    words: s.words || [],
    hasSpaces: s.hasSpaces !== false,
    highlighted: Array.from(s.highlighted)
  }));

  const payload = {
    displayMode: outputDisplayMode,
    slots: serializedSlots,
    allSlots: serializedSlots,
    reference: serializedSlots[0].reference,
    version: serializedSlots[0].version,
    words: serializedSlots[0].words,
    hasSpaces: serializedSlots[0].hasSpaces,
    highlighted: serializedSlots[0].highlighted,
    bg: bgToSend,
    fonts: window.customOutputFonts,
    animation: window.customAnimSettings,
    navDirection: window.lastNavDirection || 'next',
    forcePreviewAnim: Boolean(forcePreviewAnim),
    settings: {
      topGap: (window.customLayoutSettings.topGap ?? 1) + 'px',
      boxPadding: window.customLayoutSettings.boxPadding ?? 70,
      screenMargin: window.customLayoutSettings.screenMargin ?? 39,
      maxFontSize: window.customLayoutSettings.maxFontSize || 100,
      hideBoxBg: window.customLayoutSettings.hideBoxBg || false,
      modeAdjustments: window.customModeAdjustments,
      lengthFontSizes: window.customLengthFontSizes
    }
  };

  // 1. Ipadala sa WebSocket Server (OBS & Web Clients)
  if (window.liveOperatorSocket && window.liveOperatorSocket.readyState === 1) {
    try { window.liveOperatorSocket.send(JSON.stringify(payload)); } catch(e) {}
  }

  // 2. BroadcastChannel
  try {
    const bc = new BroadcastChannel('bible_live_stream');
    bc.postMessage(payload);
  } catch(e) {}

  // 3. LocalStorage
  try {
    localStorage.setItem('bible_live_payload', JSON.stringify(payload));
    localStorage.setItem('bible_live_timestamp', String(Date.now()));
  } catch(e) {}
}

function recordHistory(ref, verName, slotIdx) {
  if (!window._workspaceBooted) return;
  const s = slots[slotIdx];
  const entryKey = ref + '|' + s.transId;
  verseHistoryList = verseHistoryList.filter(h => h.key !== entryKey);
  verseHistoryList.unshift({
    key: entryKey,
    reference: ref,
    versionName: verName,
    transId: s.transId,
    bookIndex: s.bookIndex,
    chapter: s.chapter,
    verse: s.verse,
    textPreview: (s.words || []).join(' '),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });
  if (verseHistoryList.length > 100) verseHistoryList.pop();
  if (typeof window.refreshHistoryModalList === 'function') window.refreshHistoryModalList();
}

function loadSlotVerseData(slotIdx, clearHigh) {
  if (clearHigh === undefined) clearHigh = true;
  const s = slots[slotIdx];
  const bData = translationsCache[s.transId] || {};
  const books = Object.keys(bData);
  if (books.length === 0) return;

  if (s.bookIndex >= books.length || s.bookIndex < 0) s.bookIndex = 0;
  const bookName = books[s.bookIndex];
  const chapters = Object.keys(bData[bookName] || {});
  if (!chapters.includes(s.chapter)) s.chapter = chapters[0] || '1';
  const verses = Object.keys(bData[bookName]?.[s.chapter] || {});
  if (!verses.includes(s.verse)) s.verse = verses[0] || '1';

  const text = bData[bookName]?.[s.chapter]?.[s.verse] || '';
  const isChinese = /[\u4e00-\u9fff]/.test(text);
  s.words = isChinese ? Array.from(text.trim()) : text.trim().split(/\s+/);
  s.hasSpaces = !isChinese;
  s.reference = bookName + ' ' + s.chapter + ':' + s.verse;

  if (clearHigh) s.highlighted.clear();
  renderSlotCanvas(slotIdx);
  updateSlotHeaderMeta(slotIdx);
  if (slotIdx === activeSlotIndex) refreshVerseLengthFontIndicator();
  recordHistory(s.reference, s.versionName, slotIdx);
}

function updateSlotHeaderMeta(slotIdx) {
  const s = slots[slotIdx];
  const titleEl = document.getElementById('slotTitle' + slotIdx);
  const badgeEl = document.getElementById('slotBadge' + slotIdx);
  const focusEl = document.getElementById('slotFocus' + slotIdx);
  const navEl = document.getElementById('slotNav' + slotIdx);
  const cardEl = document.querySelector('.slot-card[data-slot="' + slotIdx + '"]');

  if (titleEl) titleEl.textContent = 'Slot ' + (slotIdx + 1) + ': ' + (s.reference || 'GENESIS 1:1');

  const isLiveOnOutput = slotIdx < outputDisplayMode;
  if (badgeEl) {
    badgeEl.className = 'slot-badge ' + (isLiveOnOutput ? 'live' : 'staging');
    badgeEl.textContent = isLiveOnOutput ? '● LIVE' : '● STAGING';
  }

  const isFocused = (slotIdx === activeSlotIndex);
  if (cardEl) cardEl.classList.toggle('active-slot', isFocused);
  if (focusEl) {
    focusEl.className = 'focus-badge' + (isFocused ? ' editing' : '');
    focusEl.textContent = isFocused ? '• EDITING' : 'CLICK TO FOCUS';
  }
  if (navEl) navEl.style.display = isFocused ? 'flex' : 'none';
}

function updateWorkspaceUI() {
  for (let i = 0; i < 4; i++) updateSlotHeaderMeta(i);
}

function focusSlot(slotIdx) {
  activeSlotIndex = slotIdx;
  updateWorkspaceUI();
  refreshVerseLengthFontIndicator();
}

function renderSlotCanvas(slotIdx) {
  const canvas = document.getElementById('slotCanvas' + slotIdx);
  if (!canvas) return;
  canvas.innerHTML = '';
  const s = slots[slotIdx];

  s.words.forEach((word, wIdx) => {
    const span = document.createElement('span');
    span.textContent = word;
    span.classList.add('word-span');
    span.dataset.index = wIdx;
    if (s.highlighted.has(wIdx)) span.classList.add('highlighted');

    span.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      focusSlot(slotIdx);
      isMouseDown = true;
      dragSlotIdx = slotIdx;
      dragStartWordIdx = wIdx;
      dragTargetState = !s.highlighted.has(wIdx);
      toggleSlotWord(slotIdx, wIdx, dragTargetState);
    });

    span.addEventListener('mouseenter', () => {
      if (isMouseDown && dragSlotIdx === slotIdx) applySlotDragRange(slotIdx, wIdx);
    });

    canvas.appendChild(span);

    if (wIdx < s.words.length - 1 && s.hasSpaces) {
      const space = document.createElement('span');
      space.textContent = ' ';
      space.classList.add('space-span');
      space.dataset.spaceAfter = wIdx;
      if (s.highlighted.has(wIdx) && s.highlighted.has(wIdx + 1)) space.classList.add('highlighted');
      space.addEventListener('mouseenter', () => {
        if (isMouseDown && dragSlotIdx === slotIdx) applySlotDragRange(slotIdx, wIdx);
      });
      canvas.appendChild(space);
    }
  });
}

function updateSlotVisuals(slotIdx) {
  const canvas = document.getElementById('slotCanvas' + slotIdx);
  if (!canvas) return;
  const s = slots[slotIdx];
  s.words.forEach((_, idx) => {
    const wordSpan = canvas.querySelector('[data-index="' + idx + '"]');
    if (wordSpan) wordSpan.classList.toggle('highlighted', s.highlighted.has(idx));
    const spaceSpan = canvas.querySelector('[data-space-after="' + idx + '"]');
    if (spaceSpan) {
      const bridge = s.highlighted.has(idx) && s.highlighted.has(idx + 1);
      spaceSpan.classList.toggle('highlighted', bridge);
    }
  });
}

function toggleSlotWord(slotIdx, wordIdx, shouldHighlight) {
  const s = slots[slotIdx];
  if (shouldHighlight) s.highlighted.add(wordIdx);
  else s.highlighted.delete(wordIdx);
  updateSlotVisuals(slotIdx);
  syncState();
}

function applySlotDragRange(slotIdx, endWordIdx) {
  if (dragStartWordIdx === null) return;
  const s = slots[slotIdx];
  const minIdx = Math.min(dragStartWordIdx, endWordIdx);
  const maxIdx = Math.max(dragStartWordIdx, endWordIdx);
  let changed = false;
  for (let i = minIdx; i <= maxIdx; i++) {
    if (dragTargetState && !s.highlighted.has(i)) { s.highlighted.add(i); changed = true; }
    else if (!dragTargetState && s.highlighted.has(i)) { s.highlighted.delete(i); changed = true; }
  }
  if (changed) { updateSlotVisuals(slotIdx); syncState(); }
}

document.addEventListener('mouseup', () => {
  isMouseDown = false;
  dragSlotIdx = null;
  dragStartWordIdx = null;
});

// SLOT CARD CLICK & DRAG TO SWAP
document.querySelectorAll('.slot-card').forEach(card => {
  const idx = parseInt(card.dataset.slot, 10);
  card.addEventListener('click', () => focusSlot(idx));

  card.addEventListener('dragstart', (e) => {
    draggedCardSlot = idx;
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    card.classList.add('drag-over');
  });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    if (draggedCardSlot === null || draggedCardSlot === idx) return;

    const temp = { ...slots[draggedCardSlot], highlighted: new Set(slots[draggedCardSlot].highlighted) };
    slots[draggedCardSlot] = { ...slots[idx], highlighted: new Set(slots[idx].highlighted) };
    slots[idx] = temp;

    renderSlotCanvas(draggedCardSlot);
    renderSlotCanvas(idx);
    focusSlot(idx);
    syncState();
    draggedCardSlot = null;
  });
});

// MINI PREV / NEXT BUTTONS
document.querySelectorAll('.mini-nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const sIdx = parseInt(btn.dataset.slot, 10);
    focusSlot(sIdx);
    if (btn.dataset.dir === 'prev') goToPrevVerse(sIdx);
    else goToNextVerse(sIdx);
  });
});

// OUTPUT DISPLAY MODE PILLS
document.querySelectorAll('.mode-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    outputDisplayMode = parseInt(pill.dataset.mode, 10) || 1;
    updateWorkspaceUI();
    syncState(true);
  });
});

// Right-click any layout mode to open its independent framing and typography controls.
(function initModeAdjustmentMenu() {
  const menu = document.getElementById('modeAdjustMenu');
  if (!menu) return;
  const title = document.getElementById('modeAdjustTitle');
  const zoomXRange = document.getElementById('modeAdjustZoomX');
  const panXRange = document.getElementById('modeAdjustPanX');
  const zoomYRange = document.getElementById('modeAdjustZoomY');
  const panYRange = document.getElementById('modeAdjustPanY');
  const titleSizeRange = document.getElementById('modeAdjustTitleSize');
  const zoomXValue = document.getElementById('modeAdjustZoomXValue');
  const panXValue = document.getElementById('modeAdjustPanXValue');
  const zoomYValue = document.getElementById('modeAdjustZoomYValue');
  const panYValue = document.getElementById('modeAdjustPanYValue');
  const titleSizeValue = document.getElementById('modeAdjustTitleSizeValue');
  const gapRange = document.getElementById('modeAdjustTopGap');
  const paddingRange = document.getElementById('modeAdjustBoxPadding');
  const gapValue = document.getElementById('modeAdjustTopGapValue');
  const paddingValue = document.getElementById('modeAdjustBoxPaddingValue');
  const letterSpacingRange = document.getElementById('modeAdjustLetterSpacing');
  const lineSpacingRange = document.getElementById('modeAdjustLineSpacing');
  const letterSpacingValue = document.getElementById('modeAdjustLetterSpacingValue');
  const lineSpacingValue = document.getElementById('modeAdjustLineSpacingValue');
  const resetBtn = document.getElementById('modeAdjustReset');
  const closeBtn = document.getElementById('modeAdjustClose');
  let editingMode = 1;

  function getAdjustment(mode) {
    if (!window.customModeAdjustments[mode]) {
      window.customModeAdjustments[mode] = getDefaultModeAdjustment(mode);
    }
    return normalizeModeAdjustment(window.customModeAdjustments[mode], mode);
  }
  function getEffectiveAdjustment(mode) {
    return getAdjustment(mode);
  }
  function formatPan(value) { return (value > 0 ? '+' : '') + value + 'px'; }
  function refreshControls() {
    const value = getEffectiveAdjustment(editingMode);
    zoomXRange.value = String(value.zoomX);
    panXRange.value = String(value.panX);
    zoomYRange.value = String(value.zoomY);
    panYRange.value = String(value.panY);
    titleSizeRange.value = String(value.titleSize);
    zoomXValue.textContent = value.zoomX + '%';
    panXValue.textContent = formatPan(value.panX);
    zoomYValue.textContent = value.zoomY + '%';
    panYValue.textContent = formatPan(value.panY);
    titleSizeValue.textContent = value.titleSize + 'px';
    gapRange.value = String(value.topGap);
    paddingRange.value = String(value.boxPadding);
    gapValue.textContent = value.topGap + 'px';
    paddingValue.textContent = value.boxPadding + 'px';
    letterSpacingRange.value = String(value.letterSpacing);
    lineSpacingRange.value = String(value.lineSpacing);
    letterSpacingValue.textContent = value.letterSpacing.toFixed(1) + 'px';
    lineSpacingValue.textContent = value.lineSpacing.toFixed(2);
  }
  function saveAndBroadcast(changedField) {
    const current = getAdjustment(editingMode);
    const next = { ...current };
    if (changedField === 'zoomX') next.zoomX = zoomXRange.value;
    else if (changedField === 'panX') next.panX = panXRange.value;
    else if (changedField === 'zoomY') next.zoomY = zoomYRange.value;
    else if (changedField === 'panY') next.panY = panYRange.value;
    else if (changedField === 'titleSize') next.titleSize = titleSizeRange.value;
    else if (changedField === 'topGap') next.topGap = gapRange.value;
    else if (changedField === 'boxPadding') next.boxPadding = paddingRange.value;
    else if (changedField === 'letterSpacing') next.letterSpacing = letterSpacingRange.value;
    else if (changedField === 'lineSpacing') next.lineSpacing = lineSpacingRange.value;
    window.customModeAdjustments[editingMode] = normalizeModeAdjustment(next, editingMode);
    try { localStorage.setItem('bible_mode_adjustments', JSON.stringify(window.customModeAdjustments)); localStorage.setItem('bible_mode_adjustments_defaults_version', MODE_DEFAULTS_VERSION); } catch (e) {}
    refreshControls();
    syncState();
  }
  function closeMenu() { menu.classList.remove('open'); }
  function openMenu(mode, event, anchor) {
    editingMode = mode;
    const typographySection = document.getElementById('modeAdjustTypographySection');
    if (typographySection) typographySection.hidden = mode !== 1;
    const labels = { 1: '1 Full', 2: '2 Split', 3: '3 Split', 4: '4 Grid' };
    title.textContent = labels[mode] + ' — Layout Settings';
    refreshControls();
    menu.classList.add('open');
    const pointX = event && Number.isFinite(event.clientX) ? event.clientX : anchor.getBoundingClientRect().left;
    const pointY = event && Number.isFinite(event.clientY) ? event.clientY : anchor.getBoundingClientRect().bottom;
    const rect = menu.getBoundingClientRect();
    menu.style.left = Math.max(8, Math.min(pointX, window.innerWidth - rect.width - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(pointY, window.innerHeight - rect.height - 8)) + 'px';
  }

  document.querySelectorAll('.mode-pill[data-mode="1"], .mode-pill[data-mode="2"], .mode-pill[data-mode="3"], .mode-pill[data-mode="4"]').forEach(button => {
    button.title = 'Left-click: select layout  •  Right-click: adjust layout settings';
    button.addEventListener('contextmenu', event => {
      event.preventDefault();
      event.stopPropagation();
      openMenu(parseInt(button.dataset.mode, 10), event, button);
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        openMenu(parseInt(button.dataset.mode, 10), null, button);
      }
    });
  });

  zoomXRange.addEventListener('input', () => saveAndBroadcast('zoomX'));
  panXRange.addEventListener('input', () => saveAndBroadcast('panX'));
  zoomYRange.addEventListener('input', () => saveAndBroadcast('zoomY'));
  panYRange.addEventListener('input', () => saveAndBroadcast('panY'));
  titleSizeRange.addEventListener('input', () => saveAndBroadcast('titleSize'));
  gapRange.addEventListener('input', () => saveAndBroadcast('topGap'));
  paddingRange.addEventListener('input', () => saveAndBroadcast('boxPadding'));
  letterSpacingRange.addEventListener('input', () => saveAndBroadcast('letterSpacing'));
  lineSpacingRange.addEventListener('input', () => saveAndBroadcast('lineSpacing'));
  resetBtn.addEventListener('click', () => {
    // Reset only this layout to the defaults shown in the screenshots.
    window.customModeAdjustments[editingMode] = getDefaultModeAdjustment(editingMode);
    try { localStorage.setItem('bible_mode_adjustments', JSON.stringify(window.customModeAdjustments)); localStorage.setItem('bible_mode_adjustments_defaults_version', MODE_DEFAULTS_VERSION); } catch (e) {}
    refreshControls();
    syncState();
  });
  closeBtn.addEventListener('click', closeMenu);
  document.getElementById('modeAdjustClosePrimary').addEventListener('click', closeMenu);
  document.addEventListener('pointerdown', event => {
    if (menu.classList.contains('open') && !menu.contains(event.target)) closeMenu();
  }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', closeMenu);
})();

// CLEAR HIGHLIGHTS BUTTONS
const clearHighlightsBtn = document.getElementById('clearHighlightsBtn');
if (clearHighlightsBtn) {
  clearHighlightsBtn.addEventListener('click', () => {
    slots[activeSlotIndex].highlighted.clear();
    updateSlotVisuals(activeSlotIndex);
    syncState();
  });
}

const clearAllHighlightsBtn = document.getElementById('clearAllHighlightsBtn');
if (clearAllHighlightsBtn) {
  clearAllHighlightsBtn.addEventListener('click', () => {
    for (let i = 0; i < 4; i++) {
      slots[i].highlighted.clear();
      updateSlotVisuals(i);
    }
    syncState();
  });
}

// BG CONTROLS
const uploadImgBtn = document.getElementById('uploadImgBtn');
const restoreDefaultBgBtn = document.getElementById('restoreDefaultBgBtn');
const bgImageInput = document.getElementById('bgImageInput');
const bgColor = document.getElementById('bgColor');
const transparentToggle = document.getElementById('transparentToggle');
const hideVerseBoxToggle = document.getElementById('hideVerseBoxToggle');
const animatedBgBtn = document.getElementById('animatedBgBtn');
const animatedBgModal = document.getElementById('animatedBgModal');
const animatedBgChoices = Array.from(document.querySelectorAll('[data-animated-bg]'));
const animatedBgApplyBtn = document.getElementById('animatedBgApplyBtn');
let pendingAnimatedBgSelection = selectedAnimatedBg;

// Restore the last uploaded server-hosted background on Operator refresh.
try {
  const savedBgUrl = localStorage.getItem('bible_custom_bg_url');
  if (savedBgUrl && /^\/uploads\/backgrounds\/[a-f0-9]{32}\.(?:jpg|png|gif|webp|bmp)$/.test(savedBgUrl)) {
    currentCustomBg = "url('" + savedBgUrl + "')";
  }
} catch (e) {}

function updateAnimatedBgButtonState() {
  if (!animatedBgBtn) return;
  const isActive = animatedBgActive && !(transparentToggle && transparentToggle.checked);
  animatedBgBtn.classList.toggle('animated-bg-active', isActive);
  animatedBgBtn.setAttribute('aria-pressed', String(isActive));
}

function renderAnimatedBgChoice() {
  animatedBgChoices.forEach(choice => {
    const selected = choice.dataset.animatedBg === pendingAnimatedBgSelection;
    choice.classList.toggle('selected', selected);
    choice.setAttribute('aria-pressed', String(selected));
    const badge = choice.querySelector('.animated-bg-choice-badge');
    if (badge) badge.textContent = selected ? 'SELECTED' : '';
  });
}

function openAnimatedBgModal() {
  if (!animatedBgModal) return;
  pendingAnimatedBgSelection = selectedAnimatedBg || 'blue-wave';
  renderAnimatedBgChoice();
  animatedBgModal.classList.add('open');
}

function closeAnimatedBgModal() {
  if (animatedBgModal) animatedBgModal.classList.remove('open');
}

function disableAnimatedBackground() {
  animatedBgActive = false;
  try { localStorage.setItem('bible_background_mode', 'default'); } catch (e) {}
  updateAnimatedBgButtonState();
}

if (animatedBgBtn) animatedBgBtn.addEventListener('click', openAnimatedBgModal);
animatedBgChoices.forEach(choice => {
  choice.addEventListener('click', () => {
    const selectedId = choice.dataset.animatedBg;
    if (!VALID_ANIMATED_BG_SELECTIONS.has(selectedId)) return;
    pendingAnimatedBgSelection = selectedId;
    renderAnimatedBgChoice();
  });
});
if (animatedBgApplyBtn) {
  animatedBgApplyBtn.addEventListener('click', () => {
    selectedAnimatedBg = pendingAnimatedBgSelection || 'blue-wave';
    animatedBgActive = true;
    try {
      localStorage.setItem('bible_background_mode', 'animated');
      localStorage.setItem('bible_animated_bg_selection', selectedAnimatedBg);
    } catch (e) {}
    if (transparentToggle) transparentToggle.checked = false;
    updateAnimatedBgButtonState();
    closeAnimatedBgModal();
    syncState();
  });
}
['animatedBgCloseX', 'animatedBgCancelBtn'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', closeAnimatedBgModal);
});
if (animatedBgModal) {
  animatedBgModal.addEventListener('click', event => {
    if (event.target === animatedBgModal) closeAnimatedBgModal();
  });
}

if (restoreDefaultBgBtn) {
  restoreDefaultBgBtn.addEventListener('click', () => {
    disableAnimatedBackground();
    currentCustomBg = "url('" + DEFAULT_BACKGROUND_URL + "')";
    localStorage.setItem('bible_custom_bg_url', '');
    if (transparentToggle) transparentToggle.checked = false;
    updateAnimatedBgButtonState();
    syncState();
  });
}

if (uploadImgBtn && bgImageInput) {
  uploadImgBtn.addEventListener('click', () => bgImageInput.click());
  bgImageInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const oldLabel = uploadImgBtn.textContent;
    uploadImgBtn.disabled = true;
    uploadImgBtn.textContent = 'Uploading BG...';
    try {
      const response = await fetch('/api/upload-background', {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        throw new Error(result.error || ('Upload failed (HTTP ' + response.status + ')'));
      }
      disableAnimatedBackground();
      currentCustomBg = "url('" + result.url + "')";
      localStorage.setItem('bible_custom_bg_url', result.url);
      if (transparentToggle) transparentToggle.checked = false;
      updateAnimatedBgButtonState();
      syncState();
      console.info('[Upload BG] Server-hosted background ready:', result.url);
    } catch (error) {
      console.error('[Upload BG] Failed:', error);
      alert('Hindi na-upload ang background. ' + (error && error.message ? error.message : 'Pakisubukan muli.'));
    } finally {
      uploadImgBtn.disabled = false;
      uploadImgBtn.textContent = oldLabel;
      bgImageInput.value = '';
    }
  });
}

if (bgColor) bgColor.addEventListener('input', () => {
  disableAnimatedBackground();
  currentCustomBg = null;
  try { localStorage.setItem('bible_custom_bg_url', ''); } catch (e) {}
  syncState();
});
if (transparentToggle) transparentToggle.addEventListener('change', () => {
  if (transparentToggle.checked) disableAnimatedBackground();
  updateAnimatedBgButtonState();
  syncState();
});
if (hideVerseBoxToggle) {
  hideVerseBoxToggle.checked = window.customLayoutSettings.hideBoxBg;
  hideVerseBoxToggle.addEventListener('change', () => {
    window.customLayoutSettings.hideBoxBg = hideVerseBoxToggle.checked;
    localStorage.setItem('bible_hide_box_bg', String(hideVerseBoxToggle.checked));
    syncState();
  });
}
updateAnimatedBgButtonState();
renderAnimatedBgChoice();

// VERSE NAVIGATION (PREV / NEXT)
function goToNextVerse(slotIdx) {
  if (slotIdx === undefined) slotIdx = activeSlotIndex;
  window.lastNavDirection = "next";
  const s = slots[slotIdx];
  const bData = translationsCache[s.transId] || {};
  const books = Object.keys(bData);
  const bookName = books[s.bookIndex];
  if (!bData[bookName] || !bData[bookName][s.chapter]) return;

  const verses = Object.keys(bData[bookName][s.chapter]);
  const vIdx = verses.indexOf(s.verse);

  if (vIdx < verses.length - 1) {
    s.verse = verses[vIdx + 1];
  } else {
    const chapters = Object.keys(bData[bookName]);
    const cIdx = chapters.indexOf(s.chapter);
    if (cIdx < chapters.length - 1) {
      s.chapter = chapters[cIdx + 1];
      s.verse = Object.keys(bData[bookName][s.chapter])[0];
    } else if (s.bookIndex < books.length - 1) {
      s.bookIndex++;
      const newBook = books[s.bookIndex];
      s.chapter = Object.keys(bData[newBook])[0];
      s.verse = Object.keys(bData[newBook][s.chapter])[0];
    }
  }
  loadSlotVerseData(slotIdx, true);
  syncState();
}

function goToPrevVerse(slotIdx) {
  if (slotIdx === undefined) slotIdx = activeSlotIndex;
  window.lastNavDirection = "prev";
  const s = slots[slotIdx];
  const bData = translationsCache[s.transId] || {};
  const books = Object.keys(bData);
  const bookName = books[s.bookIndex];
  if (!bData[bookName] || !bData[bookName][s.chapter]) return;

  const verses = Object.keys(bData[bookName][s.chapter]);
  const vIdx = verses.indexOf(s.verse);

  if (vIdx > 0) {
    s.verse = verses[vIdx - 1];
  } else {
    const chapters = Object.keys(bData[bookName]);
    const cIdx = chapters.indexOf(s.chapter);
    if (cIdx > 0) {
      s.chapter = chapters[cIdx - 1];
      const versesPrev = Object.keys(bData[bookName][s.chapter]);
      s.verse = versesPrev[versesPrev.length - 1];
    } else if (s.bookIndex > 0) {
      s.bookIndex--;
      const newBook = books[s.bookIndex];
      const chaptersPrev = Object.keys(bData[newBook]);
      s.chapter = chaptersPrev[chaptersPrev.length - 1];
      const versesPrev = Object.keys(bData[newBook][s.chapter]);
      s.verse = versesPrev[versesPrev.length - 1];
    }
  }
  loadSlotVerseData(slotIdx, true);
  syncState();
}

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowRight') goToNextVerse(activeSlotIndex);
  else if (e.key === 'ArrowLeft') goToPrevVerse(activeSlotIndex);
  else if (e.key === 'Enter') {
    e.preventDefault();
    openChangeVersePrompt(activeSlotIndex);
  }
});

const BOOK_ALIASES = {
  "gen": 0, "genesis": 0, "ex": 1, "exod": 1, "exodus": 1, "lev": 2, "bil": 3, "num": 3,
  "deut": 4, "jos": 5, "huk": 6, "rut": 7, "1sam": 8, "2sam": 9, "1har": 10, "2har": 11,
  "1cron": 12, "2cron": 13, "ezr": 14, "neh": 15, "est": 16, "jb": 17, "job": 17, "aw": 18, "ps": 18,
  "kaw": 19, "prov": 19, "ecl": 20, "sol": 21, "isa": 22, "jer": 23, "pan": 24, "eze": 25, "dan": 26,
  "os": 27, "jl": 28, "am": 29, "ob": 30, "jon": 31, "mi": 32, "nah": 33, "hab": 34, "zep": 35,
  "hag": 36, "zac": 37, "mal": 38, "mat": 39, "mar": 40, "luc": 41, "lk": 41, "jn": 42, "juan": 42,
  "john": 42, "gaw": 43, "act": 43, "acts": 43, "rom": 44, "roma": 44, "1cor": 45, "2cor": 46,
  "gal": 47, "ef": 48, "fil": 49, "col": 50, "1tes": 51, "2tes": 52, "1tim": 53, "2tim": 54,
  "tit": 55, "flm": 56, "heb": 57, "sant": 58, "jas": 58, "1ped": 59, "2ped": 60, "1jn": 61,
  "2jn": 62, "3jn": 63, "jud": 64, "apoc": 65, "rev": 65
};

function parseAndLoadVerse(query, slotIdx) {
  if (slotIdx === undefined) slotIdx = activeSlotIndex;
  if (!query) return;
  const trimmed = query.trim();
  const s = slots[slotIdx];
  const bData = translationsCache[s.transId] || {};
  const availableBooks = Object.keys(bData);
  if (availableBooks.length === 0) return;

  // 1. Kung NUMBERS lang ang tinype: hal. "1:5" (Chapter:Verse) o "5" (Verse lang sa current chapter)
  const numOnlyMatch = trimmed.match(/^(\d+)(?:\s*[:;.,\s-]\s*(\d+))?$/);
  if (numOnlyMatch) {
    const currentBook = availableBooks[s.bookIndex];
    if (!currentBook || !bData[currentBook]) return;

    const chapQuery = numOnlyMatch[2] !== undefined ? String(parseInt(numOnlyMatch[1], 10)) : String(s.chapter);
    const verseQuery = numOnlyMatch[2] !== undefined ? String(parseInt(numOnlyMatch[2], 10)) : String(parseInt(numOnlyMatch[1], 10));

    if (bData[currentBook][chapQuery]) {
      s.chapter = chapQuery;
      s.verse = bData[currentBook][chapQuery][verseQuery] ? verseQuery : Object.keys(bData[currentBook][chapQuery])[0];
      loadSlotVerseData(slotIdx, true);
      syncState();
    }
    return;
  }

  // 2. Kung may Book Name sa unahan (hal. "I TIMOTEO 1:5" o "1 tim 1:5")
  const match = trimmed.match(/^([1-3I]{0,3}\s*[a-zA-Z.\s-]+?)\s*(\d+)(?:\s*[:;.,\s-]\s*(\d+))?$/i);
  if (!match) return;

  const rawBook = match[1].trim();
  const cleanExact = rawBook.toLowerCase().replace(/[^a-z0-9]/g, '');

  // I-convert ang Roman numeral prefix (I, II, III -> 1, 2, 3) para tumugma sa BOOK_ALIASES
  const romanToNumBook = rawBook
    .replace(/^III\s+/i, '3 ')
    .replace(/^II\s+/i, '2 ')
    .replace(/^I\s+/i, '1 ')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  // A. Check muna kung exact match sa availableBooks (hal. "I TIMOTEO")
  let bookIdx = availableBooks.findIndex(b => b.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanExact);

  // B. Check sa BOOK_ALIASES (gamit ang Roman-converted o direct input)
  if (bookIdx === -1 || !availableBooks[bookIdx]) {
    if (BOOK_ALIASES[romanToNumBook] !== undefined) bookIdx = BOOK_ALIASES[romanToNumBook];
    else if (BOOK_ALIASES[cleanExact] !== undefined) bookIdx = BOOK_ALIASES[cleanExact];
  }

  // C. Partial match fallback sa availableBooks
  if (bookIdx === -1 || bookIdx === undefined || !availableBooks[bookIdx]) {
    bookIdx = availableBooks.findIndex(b => {
      const bClean = b.toLowerCase().replace(/[^a-z0-9]/g, '');
      return bClean.includes(cleanExact) || bClean.includes(romanToNumBook);
    });
  }

  if (bookIdx === -1 || bookIdx === undefined || !availableBooks[bookIdx]) return;

  const foundBook = availableBooks[bookIdx];
  const chapQuery = String(parseInt(match[2], 10));
  const verseQuery = match[3] ? String(parseInt(match[3], 10)) : "1";

  if (bData[foundBook] && bData[foundBook][chapQuery]) {
    s.bookIndex = bookIdx;
    s.chapter = chapQuery;
    s.verse = bData[foundBook][chapQuery][verseQuery] ? verseQuery : Object.keys(bData[foundBook][chapQuery])[0];
    loadSlotVerseData(slotIdx, true);
    syncState();
  }
}

// CONTEXT MENU & QUICK CHANGE VERSE
const ctxMenu = document.getElementById('slotContextMenu');
const cvModal = document.getElementById('changeVerseBackdrop');
const cvModalInput = document.getElementById('cvModalInput');
const cvModalHeaderText = document.getElementById('cvModalHeaderText');

function openChangeVersePrompt(slotIdx) {
  if (ctxMenu) ctxMenu.classList.remove('open');
  focusSlot(slotIdx);
  if (cvModalHeaderText) cvModalHeaderText.textContent = '✏️ Change Verse — Slot ' + (slotIdx + 1) + ' (' + (slots[slotIdx].reference || '') + ')';
  if (cvModalInput) cvModalInput.value = '';
  if (cvModal) cvModal.classList.add('open');
  setTimeout(() => cvModalInput && cvModalInput.focus(), 30);
}

function submitChangeVerse() {
  const val = cvModalInput ? cvModalInput.value.trim() : '';
  if (val) parseAndLoadVerse(val, activeSlotIndex);
  if (cvModal) cvModal.classList.remove('open');
}

const cvCloseX = document.getElementById('cvCloseX');
const cvCancelBtn = document.getElementById('cvCancelBtn');
const cvGoBtn = document.getElementById('cvGoBtn');

if (cvCloseX) cvCloseX.addEventListener('click', () => cvModal.classList.remove('open'));
if (cvCancelBtn) cvCancelBtn.addEventListener('click', () => cvModal.classList.remove('open'));
if (cvGoBtn) cvGoBtn.addEventListener('click', submitChangeVerse);
if (cvModalInput) {
  cvModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitChangeVerse(); }
    else if (e.key === 'Escape') cvModal.classList.remove('open');
  });
}

document.querySelectorAll('.slot-card').forEach(card => {
  const idx = parseInt(card.dataset.slot, 10);
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault(); e.stopPropagation();
    contextTargetSlot = idx;
    focusSlot(idx);

    const pasteItem = document.getElementById('ctxPasteSlot');
    const pasteLabel = document.getElementById('ctxPasteLabel');
    if (copiedSlotClipboard && pasteItem && pasteLabel) {
      pasteItem.classList.remove('disabled');
      pasteLabel.textContent = 'Paste Slot (' + copiedSlotClipboard.reference + ')';
    } else if (pasteItem && pasteLabel) {
      pasteItem.classList.add('disabled');
      pasteLabel.textContent = 'Paste Slot (Walang kopya)';
    }

    renderTransSubmenu(idx, '');
    renderHistorySubmenu(idx);

    if (ctxMenu) {
      ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 260) + 'px';
      ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 280) + 'px';
      ctxMenu.classList.add('open');
    }
  });
});

document.addEventListener('click', (e) => {
  if (ctxMenu && !ctxMenu.contains(e.target)) ctxMenu.classList.remove('open');
});

const ctxChangeVerse = document.getElementById('ctxChangeVerse');
const ctxCopySlot = document.getElementById('ctxCopySlot');
const ctxPasteSlot = document.getElementById('ctxPasteSlot');
const ctxClearHighlights = document.getElementById('ctxClearHighlights');

if (ctxChangeVerse) ctxChangeVerse.addEventListener('click', () => openChangeVersePrompt(contextTargetSlot));
if (ctxCopySlot) {
  ctxCopySlot.addEventListener('click', () => {
    const src = slots[contextTargetSlot];
    copiedSlotClipboard = { ...src, highlighted: new Set(src.highlighted) };
    if (ctxMenu) ctxMenu.classList.remove('open');
  });
}
if (ctxPasteSlot) {
  ctxPasteSlot.addEventListener('click', async () => {
    if (!copiedSlotClipboard) return;
    if (ctxMenu) ctxMenu.classList.remove('open');
    await ensureTranslationLoaded(copiedSlotClipboard.transId);
    slots[contextTargetSlot] = { ...copiedSlotClipboard, highlighted: new Set(copiedSlotClipboard.highlighted) };
    loadSlotVerseData(contextTargetSlot, false);
    updateSlotVisuals(contextTargetSlot);
    updateWorkspaceUI();
    syncState();
  });
}
if (ctxClearHighlights) {
  ctxClearHighlights.addEventListener('click', () => {
    slots[contextTargetSlot].highlighted.clear();
    updateSlotVisuals(contextTargetSlot);
    syncState();
    if (ctxMenu) ctxMenu.classList.remove('open');
  });
}

function renderTransSubmenu(slotIdx, filter) {
  const listEl = document.getElementById('ctxTransList');
  if (!listEl) return;
  listEl.innerHTML = '';
  const q = (filter || '').toLowerCase().trim();
  const currentId = slots[slotIdx].transId;

  translationsMetaList
    .filter(t => !q || t.name.toLowerCase().includes(q))
    .forEach(t => {
      const row = document.createElement('div');
      row.className = 'ctx-sub-option' + (t.id === currentId ? ' active-trans' : '');
      row.innerHTML = '<span>' + t.name + '</span>' + (t.id === currentId ? '<span>✓</span>' : '');
      row.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (ctxMenu) ctxMenu.classList.remove('open');
        await ensureTranslationLoaded(t.id);
        slots[slotIdx].transId = t.id;
        slots[slotIdx].versionName = t.name;
        loadSlotVerseData(slotIdx, false);
        updateWorkspaceUI();
        syncState();
      });
      listEl.appendChild(row);
    });
}

const ctxTransFilterInput = document.getElementById('ctxTransFilterInput');
if (ctxTransFilterInput) {
  ctxTransFilterInput.addEventListener('input', (e) => renderTransSubmenu(contextTargetSlot, e.target.value));
  ctxTransFilterInput.addEventListener('click', (e) => e.stopPropagation());
}

function renderHistorySubmenu(slotIdx) {
  const listEl = document.getElementById('ctxHistoryList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (verseHistoryList.length === 0) {
    listEl.innerHTML = '<div style="padding:10px 14px; color:#64748b; font-size:12px;">Walang history.</div>';
    return;
  }
  verseHistoryList.slice(0, 20).forEach(h => {
    const row = document.createElement('div');
    row.className = 'ctx-sub-option';
    row.innerHTML = '<span style="color:#38bdf8; font-weight:700;">' + h.reference + '</span><small style="color:#94a3b8;">' + h.versionName + '</small>';
    row.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (ctxMenu) ctxMenu.classList.remove('open');
      await ensureTranslationLoaded(h.transId);
      const s = slots[slotIdx];
      s.transId = h.transId; s.versionName = h.versionName;
      s.bookIndex = h.bookIndex; s.chapter = h.chapter; s.verse = h.verse;
      loadSlotVerseData(slotIdx, true);
      updateWorkspaceUI();
      syncState();
    });
    listEl.appendChild(row);
  });
}

// TOP RIGHT BUTTONS & MODALS
const gearBtn = document.getElementById('gearBtn');
const fontBtn = document.getElementById('fontBtn');
const layoutBtn = document.getElementById('layoutBtn');
const animBtn = document.getElementById('animBtn');
const historyBtn = document.getElementById('historyBtn');

const lanModal = document.getElementById('lanModal');
const fontModal = document.getElementById('fontModal');
const layoutModal = document.getElementById('layoutModal');
const animModal = document.getElementById('animModal');
const historyModal = document.getElementById('historyModal');

if (gearBtn && lanModal) {
  gearBtn.addEventListener('click', () => lanModal.classList.add('open'));
  document.getElementById('lanCloseX').addEventListener('click', () => lanModal.classList.remove('open'));
  document.getElementById('lanDoneBtn').addEventListener('click', () => lanModal.classList.remove('open'));
  document.getElementById('openOutputWindowBtn').addEventListener('click', () => {
    window.open('../output/output.html', '_blank', 'width=1280,height=720');
    lanModal.classList.remove('open');
  });
}

// FONT MODAL
const FONT_OPTIONS = [
  'Arial, Helvetica, sans-serif',
  '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  'Verdana, Geneva, sans-serif',
  '"Trebuchet MS", Helvetica, sans-serif',
  'Impact, Haettenschweiler, sans-serif',
  'Georgia, serif',
  '"Times New Roman", Times, serif',
  '"Microsoft YaHei", sans-serif'
];

function buildFontSelect(elId, val) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = FONT_OPTIONS.map(f => {
    const label = f.split(',')[0].replace(/"/g, '');
    return '<option value="' + f + '" ' + (f === val ? 'selected' : '') + '>' + label + '</option>';
  }).join('');
}

function initFontModalValues() {
  buildFontSelect('fontRefSelect', window.customOutputFonts.ref);
  buildFontSelect('fontVerSelect', window.customOutputFonts.version);
  buildFontSelect('fontContentSelect', window.customOutputFonts.content);

  document.getElementById('fontRefBoldChk').checked = window.customOutputFonts.refBold;
  document.getElementById('fontRefItalicChk').checked = window.customOutputFonts.refItalic;
  document.getElementById('fontRefShadowChk').checked = window.customOutputFonts.refShadow;

  document.getElementById('fontVerBoldChk').checked = window.customOutputFonts.verBold;
  document.getElementById('fontVerItalicChk').checked = window.customOutputFonts.verItalic;
  document.getElementById('fontVerShadowChk').checked = window.customOutputFonts.verShadow;

  document.getElementById('fontContentBoldChk').checked = window.customOutputFonts.contentBold;
  document.getElementById('fontContentItalicChk').checked = window.customOutputFonts.contentItalic;
  document.getElementById('fontContentShadowChk').checked = window.customOutputFonts.contentShadow;

  const refSizeEl = document.getElementById('fontRefSizeInput');
  const verSizeEl = document.getElementById('fontVerSizeInput');
  const contentSizeEl = document.getElementById('fontContentSizeInput');
  if (refSizeEl) refSizeEl.value = window.customOutputFonts.refSize || 60;
  if (verSizeEl) verSizeEl.value = window.customOutputFonts.verSize || 45;
  if (contentSizeEl) contentSizeEl.value = window.customLayoutSettings.maxFontSize || 100;
  document.querySelectorAll('[data-length-font-index]').forEach(input => {
    const index = parseInt(input.dataset.lengthFontIndex, 10);
    input.value = String(window.customLengthFontSizes[index] ?? DEFAULT_LENGTH_FONT_SIZES[index] ?? 24);
  });
  refreshVerseLengthFontIndicator();
}

if (fontBtn && fontModal) {
  fontBtn.addEventListener('click', () => {
    initFontModalValues();
    fontModal.classList.add('open');
  });
  document.getElementById('fontCloseX').addEventListener('click', () => fontModal.classList.remove('open'));

  function syncFontsLive() {
    const rSize = parseInt(document.getElementById('fontRefSizeInput')?.value, 10) || 60;
    const vSize = parseInt(document.getElementById('fontVerSizeInput')?.value, 10) || 45;
    const cSize = parseInt(document.getElementById('fontContentSizeInput')?.value, 10) || 100;

    window.customOutputFonts = {
      ref: document.getElementById('fontRefSelect').value,
      refBold: document.getElementById('fontRefBoldChk').checked,
      refItalic: document.getElementById('fontRefItalicChk').checked,
      refShadow: document.getElementById('fontRefShadowChk').checked,
      version: document.getElementById('fontVerSelect').value,
      verBold: document.getElementById('fontVerBoldChk').checked,
      verItalic: document.getElementById('fontVerItalicChk').checked,
      verShadow: document.getElementById('fontVerShadowChk').checked,
      content: document.getElementById('fontContentSelect').value,
      contentBold: document.getElementById('fontContentBoldChk').checked,
      contentItalic: document.getElementById('fontContentItalicChk').checked,
      contentShadow: document.getElementById('fontContentShadowChk').checked,
      refSize: rSize,
      verSize: vSize,
      contentSize: cSize
    };

    // Global Max is a shared ceiling; content-length rows select the target size.
    window.customLayoutSettings.maxFontSize = cSize;
    const layoutMaxRange = document.getElementById('layoutMaxFontRange');
    const layoutMaxVal = document.getElementById('layoutMaxFontVal');
    if (layoutMaxRange) layoutMaxRange.value = cSize;
    if (layoutMaxVal) layoutMaxVal.textContent = cSize + 'px';

    localStorage.setItem('bible_font_ref', window.customOutputFonts.ref);
    localStorage.setItem('bible_font_ref_bold', String(window.customOutputFonts.refBold));
    localStorage.setItem('bible_font_ref_italic', String(window.customOutputFonts.refItalic));
    localStorage.setItem('bible_font_ref_shadow', String(window.customOutputFonts.refShadow));
    localStorage.setItem('bible_font_ver', window.customOutputFonts.version);
    localStorage.setItem('bible_font_ver_bold', String(window.customOutputFonts.verBold));
    localStorage.setItem('bible_font_ver_italic', String(window.customOutputFonts.verItalic));
    localStorage.setItem('bible_font_ver_shadow', String(window.customOutputFonts.verShadow));
    localStorage.setItem('bible_font_content', window.customOutputFonts.content);
    localStorage.setItem('bible_font_content_bold', String(window.customOutputFonts.contentBold));
    localStorage.setItem('bible_font_content_italic', String(window.customOutputFonts.contentItalic));
    localStorage.setItem('bible_font_content_shadow', String(window.customOutputFonts.contentShadow));
    localStorage.setItem('bible_font_ref_size', String(rSize));
    localStorage.setItem('bible_font_ver_size', String(vSize));
    localStorage.setItem('bible_max_font_size', String(cSize));
    syncState();
  }

  fontModal.querySelectorAll('select, input:not([data-length-font-index])').forEach(el => {
    const handleFontInput = () => syncFontsLive();
    el.addEventListener('change', handleFontInput);
    if (el.type === 'number') el.addEventListener('input', handleFontInput);
  });
  document.getElementById('fontToggleShadowBtn').addEventListener('click', () => {
    const r = document.getElementById('fontRefShadowChk');
    const v = document.getElementById('fontVerShadowChk');
    const c = document.getElementById('fontContentShadowChk');
    const anyOff = !r.checked || !v.checked || !c.checked;
    r.checked = anyOff; v.checked = anyOff; c.checked = anyOff;
    syncFontsLive();
  });
  document.getElementById('fontResetBtn').addEventListener('click', () => {
    document.getElementById('fontRefSelect').value = DEFAULT_ARIAL;
    document.getElementById('fontRefBoldChk').checked = true;
    document.getElementById('fontRefItalicChk').checked = false;
    document.getElementById('fontRefShadowChk').checked = true;
    document.getElementById('fontVerSelect').value = DEFAULT_ARIAL;
    document.getElementById('fontVerBoldChk').checked = true;
    document.getElementById('fontVerItalicChk').checked = true;
    document.getElementById('fontVerShadowChk').checked = true;
    document.getElementById('fontContentSelect').value = DEFAULT_ARIAL;
    document.getElementById('fontContentBoldChk').checked = true;
    document.getElementById('fontContentItalicChk').checked = false;
    document.getElementById('fontContentShadowChk').checked = true;
    if (document.getElementById('fontRefSizeInput')) document.getElementById('fontRefSizeInput').value = 60;
    if (document.getElementById('fontVerSizeInput')) document.getElementById('fontVerSizeInput').value = 45;
    if (document.getElementById('fontContentSizeInput')) document.getElementById('fontContentSizeInput').value = 100;
    window.customLengthFontSizes = [...DEFAULT_LENGTH_FONT_SIZES];
    document.querySelectorAll('[data-length-font-index]').forEach(input => {
      const index = parseInt(input.dataset.lengthFontIndex, 10);
      input.value = String(window.customLengthFontSizes[index] ?? DEFAULT_LENGTH_FONT_SIZES[index]);
    });
    try { localStorage.setItem('bible_length_font_sizes', JSON.stringify(window.customLengthFontSizes)); localStorage.setItem('bible_length_font_defaults_version', '2026-11-01-v3'); } catch (e) {}
    refreshVerseLengthFontIndicator();
    syncFontsLive();
  });
  document.getElementById('fontSaveBtn').addEventListener('click', () => {
    syncFontsLive();
    fontModal.classList.remove('open');
  });
}

// Verse content font size by character length (shared by Output and Highlighter).
function getVerseTextForLength(slot) {
  if (!slot) return '';
  const words = Array.isArray(slot.words) ? slot.words : [];
  return words.join(slot.hasSpaces === false ? '' : ' ').trim();
}
function refreshVerseLengthFontIndicator() {
  const indicator = document.getElementById('verseLengthFontCurrent');
  if (!indicator) return;
  const currentLength = Array.from(getVerseTextForLength(slots[activeSlotIndex])).length;
  indicator.textContent = 'Current Content Length: ' + currentLength;
  document.querySelectorAll('.verse-length-font-row').forEach(row => {
    const min = parseInt(row.dataset.min, 10);
    const max = parseInt(row.dataset.max, 10);
    row.classList.toggle('active-length-range', currentLength >= min && currentLength <= max);
  });
}
document.querySelectorAll('[data-length-font-index]').forEach(input => {
  input.addEventListener('input', () => {
    const index = parseInt(input.dataset.lengthFontIndex, 10);
    if (!Number.isInteger(index) || index < 0 || index >= DEFAULT_LENGTH_FONT_SIZES.length) return;
    const parsed = parseInt(input.value, 10);
    const value = Number.isFinite(parsed) ? Math.min(100, Math.max(14, parsed)) : DEFAULT_LENGTH_FONT_SIZES[index];
    input.value = String(value);
    const next = [...window.customLengthFontSizes];
    next[index] = value;
    window.customLengthFontSizes = next;
    try { localStorage.setItem('bible_length_font_sizes', JSON.stringify(next)); localStorage.setItem('bible_length_font_defaults_version', '2026-11-01-v3'); } catch (e) {}
    syncState();
  });
});

// BOX & MARGIN MODAL
if (layoutBtn && layoutModal) {
  layoutBtn.addEventListener('click', () => {
    document.getElementById('layoutScreenMarginRange').value = window.customLayoutSettings.screenMargin;
    document.getElementById('layoutTopGapRange').value = window.customLayoutSettings.topGap;
    document.getElementById('layoutBoxPaddingRange').value = window.customLayoutSettings.boxPadding;
    document.getElementById('layoutMaxFontRange').value = window.customLayoutSettings.maxFontSize;
    document.getElementById('layoutHideBoxChk').checked = window.customLayoutSettings.hideBoxBg;

    document.getElementById('layoutMarginVal').textContent = window.customLayoutSettings.screenMargin + 'px';
    document.getElementById('layoutTopGapVal').textContent = window.customLayoutSettings.topGap + 'px';
    document.getElementById('layoutPaddingVal').textContent = window.customLayoutSettings.boxPadding + 'px';
    document.getElementById('layoutMaxFontVal').textContent = window.customLayoutSettings.maxFontSize + 'px';

    layoutModal.classList.add('open');
  });
  document.getElementById('layoutCloseX').addEventListener('click', () => layoutModal.classList.remove('open'));

  function syncLayoutLive() {
    const m = document.getElementById('layoutScreenMarginRange').value;
    const g = document.getElementById('layoutTopGapRange').value;
    const p = document.getElementById('layoutBoxPaddingRange').value;
    const f = document.getElementById('layoutMaxFontRange').value;
    const h = document.getElementById('layoutHideBoxChk').checked;

    window.customLayoutSettings = {
      screenMargin: parseInt(m, 10),
      topGap: parseInt(g, 10),
      boxPadding: parseInt(p, 10),
      maxFontSize: parseInt(f, 10),
      hideBoxBg: h
    };

    document.getElementById('layoutMarginVal').textContent = m + 'px';
    document.getElementById('layoutTopGapVal').textContent = g + 'px';
    document.getElementById('layoutPaddingVal').textContent = p + 'px';
    document.getElementById('layoutMaxFontVal').textContent = f + 'px';

    const mainHideToggle = document.getElementById('hideVerseBoxToggle');
    if (mainHideToggle) mainHideToggle.checked = h;

    localStorage.setItem('bible_screen_margin', String(window.customLayoutSettings.screenMargin));
    localStorage.setItem('bible_top_gap', String(window.customLayoutSettings.topGap));
    localStorage.setItem('bible_box_padding', String(window.customLayoutSettings.boxPadding));
    localStorage.setItem('bible_max_font_size', String(window.customLayoutSettings.maxFontSize));
    localStorage.setItem('bible_hide_box_bg', String(window.customLayoutSettings.hideBoxBg));
    syncState();
  }

  layoutModal.querySelectorAll('input').forEach(el => el.addEventListener('input', syncLayoutLive));
  layoutModal.querySelectorAll('input[type="checkbox"]').forEach(el => el.addEventListener('change', syncLayoutLive));
  document.getElementById('layoutFullBleedBtn').addEventListener('click', () => {
    document.getElementById('layoutScreenMarginRange').value = 0;
    syncLayoutLive();
  });
  document.getElementById('layoutResetBtn').addEventListener('click', () => {
    document.getElementById('layoutScreenMarginRange').value = 39;
    document.getElementById('layoutTopGapRange').value = 1;
    document.getElementById('layoutBoxPaddingRange').value = 70;
    document.getElementById('layoutMaxFontRange').value = 100;
    document.getElementById('layoutHideBoxChk').checked = false;
    syncLayoutLive();
  });
  document.getElementById('layoutSaveBtn').addEventListener('click', () => {
    syncLayoutLive();
    layoutModal.classList.remove('open');
  });
}

// ANIMATION MODAL
if (animBtn && animModal) {
  animBtn.addEventListener('click', () => {
    document.getElementById('animEnabledChk').checked = window.customAnimSettings.enabled;
    document.getElementById('animStyleSelect').value = window.customAnimSettings.style;
    document.getElementById('animDurRange').value = window.customAnimSettings.duration;
    document.getElementById('highAnimChk').checked = window.customAnimSettings.highlightAnimEnabled;
    document.getElementById('highDurRange').value = window.customAnimSettings.highlightDuration;
    document.getElementById('highOpacityRange').value = window.customAnimSettings.highlightOpacity;

    document.getElementById('animDurVal').textContent = window.customAnimSettings.duration.toFixed(2) + 's';
    document.getElementById('highDurVal').textContent = window.customAnimSettings.highlightDuration.toFixed(2) + 's';
    document.getElementById('highOpVal').textContent = window.customAnimSettings.highlightOpacity.toFixed(2);

    animModal.classList.add('open');
  });
  document.getElementById('animCloseX').addEventListener('click', () => animModal.classList.remove('open'));

  function syncAnimLive(preview) {
    if (preview === undefined) preview = false;
    const e = document.getElementById('animEnabledChk').checked;
    const s = document.getElementById('animStyleSelect').value;
    const d = parseFloat(document.getElementById('animDurRange').value);
    const h = document.getElementById('highAnimChk').checked;
    const hd = parseFloat(document.getElementById('highDurRange').value);
    const op = parseFloat(document.getElementById('highOpacityRange').value);

    window.customAnimSettings = {
      enabled: e, style: s, duration: d,
      highlightAnimEnabled: h, highlightDuration: hd, highlightOpacity: op
    };

    document.getElementById('animDurVal').textContent = d.toFixed(2) + 's';
    document.getElementById('highDurVal').textContent = hd.toFixed(2) + 's';
    document.getElementById('highOpVal').textContent = op.toFixed(2);

    localStorage.setItem('bible_anim_enabled', String(e));
    localStorage.setItem('bible_anim_style', s);
    localStorage.setItem('bible_anim_duration', String(d));
    localStorage.setItem('bible_high_anim_enabled', String(h));
    localStorage.setItem('bible_high_anim_duration', String(hd));
    localStorage.setItem('bible_high_opacity', String(op));
    syncState(preview);
  }

  animModal.querySelectorAll('input, select').forEach(el => el.addEventListener('input', () => syncAnimLive(false)));
  animModal.querySelectorAll('input[type="checkbox"]').forEach(el => el.addEventListener('change', () => syncAnimLive(true)));
  animModal.querySelectorAll('.preset-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('animDurRange').value = btn.dataset.s;
      document.getElementById('animEnabledChk').checked = true;
      syncAnimLive(true);
    });
  });
  document.getElementById('animPreviewBtn').addEventListener('click', () => syncAnimLive(true));
  document.getElementById('animSaveBtn').addEventListener('click', () => {
    syncAnimLive(false);
    animModal.classList.remove('open');
  });
}

// HISTORY MODAL
if (historyBtn && historyModal) {
  historyBtn.addEventListener('click', () => {
    window.refreshHistoryModalList();
    historyModal.classList.add('open');
  });
  document.getElementById('histCloseX').addEventListener('click', () => historyModal.classList.remove('open'));
  document.getElementById('histDoneBtn').addEventListener('click', () => historyModal.classList.remove('open'));
  document.getElementById('histClearBtn').addEventListener('click', () => {
    verseHistoryList = [];
    window.refreshHistoryModalList();
  });
}

window.refreshHistoryModalList = function() {
  const container = document.getElementById('histListContainer');
  const countEl = document.getElementById('histCountNum');
  const filterInput = document.getElementById('histFilterInput');
  if (!container) return;
  if (countEl) countEl.textContent = String(verseHistoryList.length);

  const q = (filterInput ? filterInput.value : '').toLowerCase().trim();
  const filtered = q
    ? verseHistoryList.filter(h => h.reference.toLowerCase().includes(q) || h.versionName.toLowerCase().includes(q))
    : verseHistoryList;

  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:24px 12px; color:#64748b; font-size:13px;">Walang nakatalang verse history.</div>';
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('div');
    row.className = 'search-result-item';
    row.innerHTML = '<div class="search-result-ref"><span>' + item.reference + ' — <small style="color:#facc15;">' + item.versionName + '</small></span><span style="color:#94a3b8; font-size:11px;">' + item.time + '</span></div>' +
      (item.textPreview ? '<div class="search-result-text" style="font-size:12.5px; color:#cbd5e1; margin-top:2px;">' + item.textPreview + '</div>' : '');
    row.addEventListener('click', async () => {
      await ensureTranslationLoaded(item.transId);
      const s = getActiveSlot();
      s.transId = item.transId; s.versionName = item.versionName;
      s.bookIndex = item.bookIndex; s.chapter = item.chapter; s.verse = item.verse;
      loadSlotVerseData(activeSlotIndex, true);
      updateWorkspaceUI();
      syncState();
      historyModal.classList.remove('open');
    });
    container.appendChild(row);
  });
};

const histFilterInput = document.getElementById('histFilterInput');
if (histFilterInput) histFilterInput.addEventListener('input', () => window.refreshHistoryModalList());

// SEARCH WORD MODAL
const searchModal = document.getElementById('searchModal');
const closeModal = document.getElementById('closeModal');
const searchWordBtn = document.getElementById('searchWordBtn');
const keywordInput = document.getElementById('keywordInput');
const doSearchBtn = document.getElementById('doSearchBtn');
const searchResults = document.getElementById('searchResults');
const searchTransSelect = document.getElementById('searchTransSelect');

if (searchWordBtn && searchModal) {
  searchWordBtn.addEventListener('click', () => {
    if (searchTransSelect) {
      searchTransSelect.innerHTML = '';
      translationsMetaList.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id; opt.textContent = t.name;
        if (t.id === getActiveSlot().transId) opt.selected = true;
        searchTransSelect.appendChild(opt);
      });
    }
    searchModal.classList.add('open');
    setTimeout(() => keywordInput && keywordInput.focus(), 30);
  });
}
if (closeModal && searchModal) closeModal.addEventListener('click', () => searchModal.classList.remove('open'));
if (keywordInput) keywordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doKeywordSearch(); });
if (doSearchBtn) doSearchBtn.addEventListener('click', () => doKeywordSearch());

function doKeywordSearch() {
  const rawKw = keywordInput ? keywordInput.value.trim().toLowerCase() : '';
  if (!rawKw) return;
  const bData = getActiveBibleData();
  searchResults.innerHTML = '';
  let matchCount = 0;

  for (const [book, chapters] of Object.entries(bData)) {
    for (const [chap, verses] of Object.entries(chapters)) {
      for (const [verse, text] of Object.entries(verses)) {
        if (text.toLowerCase().includes(rawKw)) {
          matchCount++;
          const item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML = '<div class="search-result-ref"><span>' + book + ' ' + chap + ':' + verse + '</span></div><div class="search-result-text">' + text + '</div>';
          item.addEventListener('click', () => {
            const s = getActiveSlot();
            s.bookIndex = Object.keys(bData).indexOf(book);
            s.chapter = chap;
            s.verse = verse;
            loadSlotVerseData(activeSlotIndex, true);
            syncState();
            searchModal.classList.remove('open');
          });
          searchResults.appendChild(item);
          if (matchCount >= 150) break;
        }
      }
      if (matchCount >= 150) break;
    }
    if (matchCount >= 150) break;
  }

  const statsBar = document.getElementById('searchStatsBar');
  if (statsBar) {
    statsBar.style.display = 'block';
    statsBar.innerHTML = 'Found <strong style="color:#facc15;">' + matchCount + '</strong> result(s)';
  }
}

// INITIALIZATION
async function initWorkspace() {
  try {
    const res = await fetch('../data/translations-manifest.json');
    translationsMetaList = await res.json();
  } catch (e) {
    translationsMetaList = [{ id: '001', name: 'ANG DATING BIBLIA' }];
  }

  const defaultId = translationsMetaList[0]?.id || '001';
  const defaultName = translationsMetaList[0]?.name || 'ANG DATING BIBLIA';

  await ensureTranslationLoaded(defaultId);

  for (let i = 0; i < 4; i++) {
    slots[i].transId = defaultId;
    slots[i].versionName = defaultName;
    loadSlotVerseData(i, false);
  }
  updateWorkspaceUI();
  syncState();
  window._workspaceBooted = true;
  console.log("✓ Bible Operator Panel ready!");
}

initWorkspace();


// HIGHILIGHTER_LIVE_STATE_RELAY_FIX_V1
function initOperatorSocket() {
  const wsHost = window.location.host || 'localhost:5000';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  window.liveOperatorSocket = new WebSocket(wsProtocol + wsHost);
  window.liveOperatorSocket.onopen = () => {
    console.log('✓ Operator connected to WebSocket Server');
    syncState();
  };
  window.liveOperatorSocket.onclose = () => setTimeout(initOperatorSocket, 1500);
}
initOperatorSocket();


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

// === INLINE SLOT VERSE EDIT START ===
(function initInlineSlotVerseQuickEdit() {
  const style = document.createElement('style');
  style.textContent = `
    .slot-title {
      display: inline-flex !important;
      align-items: center;
      gap: 4px;
      cursor: text !important;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px dashed transparent;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .slot-title:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #ffffff !important;
    }
    .slot-card.active-slot .slot-title:hover {
      background: rgba(250, 204, 21, 0.18);
      border-color: #facc15;
    }
    .inline-verse-input {
      background: #0f172a;
      color: #ffffff;
      border: 1.5px solid #38bdf8;
      border-radius: 4px;
      padding: 1px 7px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      width: 150px;
      outline: none;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.45);
    }
    .slot-card.active-slot .inline-verse-input {
      border-color: #facc15;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.45);
    }
  `;
  document.head.appendChild(style);

  function startInlineEdit(slotIdx, titleEl) {
    if (typeof focusSlot === 'function') focusSlot(slotIdx);
    if (!titleEl || titleEl.querySelector('.inline-verse-input')) return;

    const fullText = (titleEl.textContent || '').trim();
    const currentRefText = (typeof slots !== 'undefined' && slots[slotIdx] && slots[slotIdx].reference)
      ? slots[slotIdx].reference
      : fullText.replace(/^SLOT\s*\d+\s*:\s*/i, '').trim();

    const parentCard = titleEl.closest('.slot-card');
    if (parentCard) parentCard.setAttribute('draggable', 'false');

    const savedText = fullText;
    titleEl.innerHTML = `<span>SLOT ${slotIdx + 1}: </span>`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-verse-input';
    input.value = currentRefText;
    input.placeholder = 'hal. jn 3;16';

    let finished = false;
    function finishEdit(applyChange) {
      if (finished) return;
      finished = true;
      if (parentCard) parentCard.setAttribute('draggable', 'true');

      const rawVal = input.value.trim();
      titleEl.textContent = savedText;

      if (applyChange && rawVal) {
        if (typeof parseAndLoadVerse === 'function') {
          parseAndLoadVerse(rawVal, slotIdx);
        } else if (typeof loadVerseByQuery === 'function') {
          loadVerseByQuery(rawVal, slotIdx);
        }
      } else if (typeof updateSlotHeaderMeta === 'function') {
        updateSlotHeaderMeta(slotIdx);
      }
    }

    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEdit(false);
      }
    });

    input.addEventListener('blur', () => {
      finishEdit(false);
    });

    titleEl.appendChild(input);
    input.focus();
    const numTail = input.value.match(/\d+:\d+\s*$/);
    if (numTail) {
      input.setSelectionRange(numTail.index, input.value.length);
    } else {
      input.select();
    }
  }

  document.addEventListener('click', (e) => {
    const titleEl = e.target.closest('.slot-title, [id^="slotTitle"]');
    if (!titleEl) return;
    if (e.target.classList.contains('inline-verse-input')) return;

    e.stopPropagation();
    let sIdx = -1;
    if (titleEl.id && titleEl.id.startsWith('slotTitle')) {
      sIdx = parseInt(titleEl.id.replace('slotTitle', ''), 10);
    } else {
      const card = titleEl.closest('.slot-card');
      if (card && card.dataset.slot !== undefined) {
        sIdx = parseInt(card.dataset.slot, 10);
      }
    }

    if (!isNaN(sIdx) && sIdx >= 0) {
      startInlineEdit(sIdx, titleEl);
    }
  });
})();
// === INLINE SLOT VERSE EDIT END ===

// === MULTI-USER SLAVE HUB START ===
(function initMainOperatorSlaveHub() {
  const connectedPilots = { 0: null, 1: null, 2: null, 3: null };
  let lastProcessedActionId = 0;

  const style = document.createElement('style');
  style.textContent = `
    /* Itago ang LAN Web Controller Address bar sa pinakataas */
    #lanTopBar, .lan-top-bar, .lan-banner, [id*="lanBanner"], [class*="lan-bar"] {
      display: none !important;
    }
    .pilot-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 6px;
      background: rgba(30, 41, 59, 0.9);
      color: #64748b;
      border: 1px solid #334155;
      transition: all 0.2s ease;
    }
    .pilot-status-pill.connected {
      background: rgba(22, 163, 74, 0.22);
      color: #4ade80;
      border-color: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.35);
    }
    .home-nav-link {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      margin-right: 6px;
    }
    .home-nav-link:hover {
      background: #334155;
      color: #ffffff;
    }
  `;
  document.head.appendChild(style);

  // Hanapin at alisin ang kahit anong bar sa DOM na may text na "LAN Web Controller Address:"
  function removeLanAddressTopBar() {
    document.querySelectorAll('div, header, section').forEach(el => {
      if (el.children.length <= 6 && el.textContent && el.textContent.includes('LAN Web Controller Address:')) {
        if (!el.classList.contains('workspace-grid') && !el.classList.contains('op-header')) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }
  removeLanAddressTopBar();
  setTimeout(removeLanAddressTopBar, 300);
  setTimeout(removeLanAddressTopBar, 1000);

  // Home Portal button sa Row 2 -> papuntang /home
  const row2 = document.querySelector('.op-row-2');
  const existingHome = document.getElementById('mainHomePortalLink');
  if (existingHome) existingHome.href = '/home';
  else if (row2) {
    const homeLink = document.createElement('a');
    homeLink.id = 'mainHomePortalLink';
    homeLink.href = '/home';
    homeLink.target = '_blank';
    homeLink.className = 'home-nav-link';
    homeLink.textContent = '🏠 Home Portal';
    row2.insertBefore(homeLink, row2.firstChild);
  }

  for (let i = 0; i < 4; i++) {
    const leftMeta = document.querySelector(`.slot-card[data-slot="${i}"] .slot-left-meta`);
    if (leftMeta && !document.getElementById(`slotPilotBadge${i}`)) {
      const pill = document.createElement('span');
      pill.id = `slotPilotBadge${i}`;
      pill.className = 'pilot-status-pill';
      pill.textContent = '👤 No Pilot';
      leftMeta.appendChild(pill);
    }
  }

  function renderPilotBadges() {
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      const pill = document.getElementById(`slotPilotBadge${i}`);
      if (!pill) continue;
      const info = connectedPilots[i];
      if (info && (now - info.lastSeen < 12000)) {
        pill.className = 'pilot-status-pill connected';
        pill.textContent = `👤 Pilot: ${info.name}`;
        pill.title = `Slot ${i + 1} is currently piloted by ${info.name}`;
      } else {
        connectedPilots[i] = null;
        pill.className = 'pilot-status-pill';
        pill.textContent = '👤 No Pilot';
        pill.title = 'Walang nakakonektang Slot Operator sa slot na ito';
      }
    }
  }

  async function executeSlaveCommand(packet) {
    if (!packet) return;
    if (packet.actionId && packet.actionId <= lastProcessedActionId) return;
    if (packet.actionId) lastProcessedActionId = packet.actionId;

    const sIdx = parseInt(packet.slotIndex, 10);
    if (isNaN(sIdx) || sIdx < 0 || sIdx > 3) return;

    if (packet.operatorName) {
      if (packet.action === 'LEAVE') {
        if (connectedPilots[sIdx] && connectedPilots[sIdx].name === packet.operatorName) {
          connectedPilots[sIdx] = null;
        }
      } else {
        connectedPilots[sIdx] = {
          name: packet.operatorName,
          lastSeen: Date.now()
        };
      }
      renderPilotBadges();
    }

    if (packet.action === 'JOIN') {
      syncState();
      return;
    }

    if (packet.action === 'QUERY_VERSE' && packet.query) {
      parseAndLoadVerse(packet.query, sIdx);
    } else if (packet.action === 'NEXT_VERSE') {
      goToNextVerse(sIdx);
    } else if (packet.action === 'PREV_VERSE') {
      goToPrevVerse(sIdx);
    } else if (packet.action === 'CHANGE_TRANS' && packet.transId) {
      await ensureTranslationLoaded(packet.transId);
      slots[sIdx].transId = packet.transId;
      slots[sIdx].versionName = packet.versionName || 'ANG DATING BIBLIA';
      loadSlotVerseData(sIdx, false);
      updateWorkspaceUI();
      syncState();
    } else if (packet.action === 'TOGGLE_HIGHLIGHT' && typeof packet.wordIndex === 'number') {
      const shouldHigh = !slots[sIdx].highlighted.has(packet.wordIndex);
      toggleSlotWord(sIdx, packet.wordIndex, shouldHigh);
    } else if (packet.action === 'CLEAR_HIGHLIGHT') {
      slots[sIdx].highlighted.clear();
      updateSlotVisuals(sIdx);
      syncState();
    } else if (packet.action === 'CLEAR_ALL_HIGHLIGHTS') {
      for (let i = 0; i < 4; i++) {
        slots[i].highlighted.clear();
        updateSlotVisuals(i);
      }
      syncState();
    }
  }

  // Poll /api/pilots every 600ms para kahit anong browser o Electron window ay laging kita ang Pilots & Actions
  async function pollPilotsAndQueue() {
    try {
      let baseUrl = '';
      if (window.location.protocol === 'file:') {
        baseUrl = '';
      }
      const res = await fetch(baseUrl + '/api/pilots?since=' + lastProcessedActionId);
      const data = await res.json();
      if (data && data.pilots) {
        const now = Date.now();
        for (let i = 0; i < 4; i++) {
          const p = data.pilots[i];
          if (p && (now - p.lastSeen < 12000)) {
            connectedPilots[i] = { name: p.name, lastSeen: p.lastSeen };
          } else {
            connectedPilots[i] = null;
          }
        }
        renderPilotBadges();
      }
      if (data && Array.isArray(data.queue)) {
        for (const cmd of data.queue) {
          await executeSlaveCommand(cmd);
        }
      }
    } catch (e) {}
  }

  setInterval(pollPilotsAndQueue, 600);
})();
// === MULTI-USER SLAVE HUB END ===



// === OPERATOR SLOT FONT SIZE CONTROLLER ===
(function initOperatorSlotFontSize() {
  const savedSize = parseInt(localStorage.getItem('bible_op_slot_font_size') || '24', 10);
  document.documentElement.style.setProperty('--op-slot-font-size', savedSize + 'px');

  function applyOpSlotSize(val) {
    const sz = Math.max(14, Math.min(64, parseInt(val, 10) || 24));
    document.documentElement.style.setProperty('--op-slot-font-size', sz + 'px');
    localStorage.setItem('bible_op_slot_font_size', String(sz));

    const rangeEl = document.getElementById('opSlotFontRange');
    const numEl = document.getElementById('opSlotFontInput');
    if (rangeEl && rangeEl.value !== String(sz)) rangeEl.value = sz;
    if (numEl && numEl.value !== String(sz)) numEl.value = sz;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const rangeEl = document.getElementById('opSlotFontRange');
    const numEl = document.getElementById('opSlotFontInput');
    const resetBtn = document.getElementById('fontResetBtn');
    const fontBtn = document.getElementById('fontBtn');

    applyOpSlotSize(savedSize);

    if (fontBtn) {
      fontBtn.addEventListener('click', () => {
        const cur = parseInt(localStorage.getItem('bible_op_slot_font_size') || '24', 10);
        applyOpSlotSize(cur);
      });
    }
    if (rangeEl) rangeEl.addEventListener('input', (e) => applyOpSlotSize(e.target.value));
    if (numEl) {
      numEl.addEventListener('input', (e) => applyOpSlotSize(e.target.value));
      numEl.addEventListener('change', (e) => applyOpSlotSize(e.target.value));
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => applyOpSlotSize(24));
    }
  });
})();
// === END OPERATOR SLOT FONT SIZE ===
