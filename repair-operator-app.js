const fs = require('fs');
const path = require('path');

const targetDir = path.join('C:', 'bible-html5-app');
const opDir = path.join(targetDir, 'operator');

if (!fs.existsSync(opDir)) fs.mkdirSync(opDir, { recursive: true });

// 1. ISULAT ANG MALINIS NA OPERATOR STYLE (style.css)
const opCss = `
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  width: 100vw; height: 100vh;
  overflow: hidden !important;
  background: #141c2b;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  display: flex; flex-direction: column;
}
.op-header {
  background: #0b111e;
  border-bottom: 1px solid #1e293b;
  padding: 10px 165px 4px 16px;
  display: flex; flex-direction: column; gap: 8px;
  flex-shrink: 0;
}
.op-row-1 { display: none !important; }
.op-row-2 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.op-row-3 {
  display: flex; align-items: center; justify-content: space-between;
  border-top: 1px solid #1e293b;
  padding-top: 6px; margin-top: 2px;
  margin-right: -150px; padding-right: 150px;
}
.ctrl-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #e2e8f0; cursor: pointer; user-select: none;
}
#bgColor {
  width: 38px; height: 26px; border: 1px solid #94a3b8; border-radius: 4px;
  padding: 0; background: none; cursor: pointer;
}
.std-btn, .btn-yellow, .btn-orange {
  padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer;
  border: 1px solid transparent; transition: all 0.15s ease;
}
.std-btn { background: #1e293b; color: #f8fafc; border-color: #334155; }
.std-btn:hover { background: #334155; }
.btn-yellow { background: #facc15; color: #0f172a; border-color: #eab308; }
.btn-yellow:hover { background: #fde047; }
.btn-orange { background: #f97316; color: #ffffff; border-color: #ea580c; }
.btn-orange:hover { background: #fb923c; }

.mode-group { display: flex; align-items: center; gap: 6px; }
.mode-label { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; margin-right: 4px; }
.mode-pill {
  background: #1e293b; color: #cbd5e1; border: 1px solid #334155;
  padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;
}
.mode-pill:hover { background: #334155; }
.mode-pill.active { background: #2563eb; color: #ffffff; border-color: #3b82f6; }
.workspace-status { font-size: 12px; color: #94a3b8; }
.workspace-status strong { color: #38bdf8; }

.workspace-grid {
  flex: 1; display: grid;
  grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
  gap: 12px; padding: 12px 16px 6px 16px; overflow: hidden;
}
.slot-card {
  background: #0d1322; border: 1px solid #1e293b; border-radius: 8px;
  display: flex; flex-direction: column; overflow: hidden; cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.slot-card.active-slot {
  border: 2px solid #facc15 !important;
  box-shadow: 0 0 14px rgba(250, 204, 21, 0.2);
}
.slot-card.drag-over { border: 2px dashed #38bdf8 !important; }
.slot-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px; background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid #1e293b; min-height: 36px; flex-shrink: 0;
}
.slot-left-meta { display: flex; align-items: center; gap: 8px; }
.drag-dots { color: #64748b; font-size: 16px; cursor: grab; user-select: none; }
.slot-title { font-size: 12px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.4px; }
.slot-card.active-slot .slot-title { color: #facc15; }
.slot-badge {
  font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px;
  letter-spacing: 0.4px; text-transform: uppercase;
}
.slot-badge.live { background: #ef4444; color: #ffffff; }
.slot-badge.staging { background: #334155; color: #94a3b8; }
.slot-center-nav { display: flex; gap: 4px; }
.mini-nav-btn {
  background: transparent; color: #facc15; border: 1px solid #ca8a04;
  border-radius: 4px; padding: 2px 8px; font-size: 11px; cursor: pointer;
}
.mini-nav-btn:hover { background: rgba(250, 204, 21, 0.2); }
.focus-badge {
  font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px;
  background: #1e293b; color: #64748b; text-transform: uppercase;
}
.focus-badge.editing { background: #facc15; color: #0f172a; }

.slot-canvas {
  flex: 1; padding: 16px 20px; font-size: 21px; line-height: 1.75;
  text-align: center; overflow-y: auto; color: #cbd5e1; user-select: none;
}
.slot-card.active-slot .slot-canvas { color: #ffffff; }
.word-span, .space-span {
  display: inline; padding: 2px 0; border-radius: 4px; transition: all 0.15s ease;
}
.word-span { cursor: pointer; }
.word-span:hover { background: rgba(255,255,255,0.14); }
.word-span.highlighted, .space-span.highlighted {
  background: rgba(250, 204, 21, 0.88) !important;
  color: #0f172a !important;
  box-shadow: 0 0 8px 2px rgba(250, 204, 21, 0.45);
}
.op-footer {
  text-align: center; font-size: 11.5px; color: #94a3b8;
  padding: 5px 0 7px 0; flex-shrink: 0;
}

/* TOP RIGHT SIDEBAR BUTTONS */
.top-right-btn-stack {
  position: fixed; top: 6px; right: 10px; z-index: 9998;
  display: flex; flex-direction: column; gap: 3px; width: 138px;
}
.side-stack-btn {
  background: #1e293b; color: #f8fafc; border: 1px solid #334155;
  border-radius: 5px; padding: 4px 10px; font-size: 11px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.35);
}
.side-stack-btn:hover { background: #334155; border-color: #38bdf8; }

/* MODALS */
.lan-modal-backdrop {
  position: fixed; inset: 0; background: rgba(5, 10, 20, 0.72);
  z-index: 9999; display: none; align-items: center; justify-content: center;
}
.lan-modal-backdrop.open { display: flex; }
.lan-modal-box {
  background: #0f172a; color: #f8fafc; border: 1px solid #1e293b;
  border-radius: 10px; padding: 20px 26px; min-width: 590px;
  box-shadow: 0 20px 45px rgba(0,0,0,0.8);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  font-size: 13px;
}
.lan-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 18px;
  font-weight: 700; font-size: 15px; color: #facc15;
}
.lan-close-x {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: #94a3b8; font-weight: 700; line-height: 1;
}
.lan-close-x:hover { color: #ffffff; }
.lan-row { display: flex; align-items: center; margin-bottom: 14px; gap: 10px; }
.lan-label-col {
  width: 150px; text-align: right; color: #cbd5e1;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.lan-font-select {
  padding: 7px 10px; border: 1px solid #334155; border-radius: 5px;
  font-size: 13px; color: #f8fafc; background: #1e293b; outline: none; flex: 1;
}
.style-chk-label {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
  color: #f8fafc; cursor: pointer; user-select: none; padding: 6px 10px;
  background: #1e293b; border: 1px solid #334155; border-radius: 5px; white-space: nowrap;
}
.style-chk-label:hover { border-color: #475569; }
.lan-modal-footer {
  display: flex; justify-content: flex-end; align-items: center;
  margin-top: 18px; padding-top: 14px; border-top: 1px solid #1e293b; gap: 10px;
}
.lan-status-msg { font-size: 12px; color: #4ade80; font-weight: 600; margin-right: auto; }
.lan-btn-group { display: flex; gap: 8px; align-items: center; }
.lan-btn {
  padding: 7px 15px; border-radius: 5px; border: 1px solid #334155;
  background: #1e293b; color: #f8fafc; font-size: 12px; font-weight: 700; cursor: pointer;
}
.lan-btn:hover { background: #334155; }
.lan-btn.primary { background: #2563eb; border-color: #3b82f6; color: #ffffff; }
.lan-btn.outline-blue { background: #1e293b; border-color: #0284c7; color: #38bdf8; }
.lan-btn.outline-yellow { background: #1e293b; border-color: #ca8a04; color: #facc15; }
.lan-btn.danger-red { background: #dc2626; border-color: #ef4444; color: #ffffff; }
.preset-pill-btn {
  padding: 4px 11px; border-radius: 5px; border: 1px solid #334155;
  background: #1e293b; color: #e2e8f0; font-size: 11px; font-weight: 700; cursor: pointer;
}

/* RIGHT CLICK CONTEXT MENU */
.slot-ctx-menu {
  position: fixed; z-index: 10020; width: 245px; background: #0d1322;
  border: 1px solid #26334d; border-radius: 10px; padding: 6px 0;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.78); display: none;
  font-size: 13.5px; color: #f8fafc; user-select: none;
}
.slot-ctx-menu.open { display: block; }
.ctx-divider { height: 1px; background: #1e293b; margin: 5px 0; }
.ctx-item {
  position: relative; display: flex; align-items: center; justify-content: space-between;
  padding: 9px 16px; cursor: pointer; color: #f1f5f9; transition: background 0.12s ease;
}
.ctx-item:hover { background: #1e293b; }
.ctx-item.disabled { color: #64748b; cursor: default; }
.ctx-item.disabled:hover { background: transparent; }
.ctx-item-left { display: flex; align-items: center; gap: 12px; }
.ctx-icon { font-size: 15px; width: 20px; text-align: center; }
.ctx-shortcut { font-size: 12px; color: #94a3b8; }
.ctx-arrow { font-size: 10px; color: #cbd5e1; }
.ctx-item.clear-high { color: #facc15; font-weight: 600; }
.ctx-submenu {
  position: absolute; top: -4px; left: 100%; width: 290px; max-height: 330px;
  background: #0d1322; border: 1px solid #26334d; border-radius: 10px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.82); padding: 6px 0; display: none;
  flex-direction: column; z-index: 10025;
}
.ctx-item.has-sub:hover > .ctx-submenu { display: flex; }
.ctx-sub-search {
  margin: 4px 10px 6px 10px; padding: 6px 10px; background: #1e293b;
  border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 12px; outline: none;
}
.ctx-sub-list { overflow-y: auto; max-height: 275px; }
.ctx-sub-option {
  padding: 7px 14px; font-size: 12.5px; color: #e2e8f0; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
}
.ctx-sub-option:hover { background: #1e293b; color: #38bdf8; }
.ctx-sub-option.active-trans { color: #facc15; font-weight: 700; background: rgba(250,204,21,0.08); }

/* CHANGE VERSE POPUP */
.change-verse-backdrop {
  position: fixed; inset: 0; background: rgba(5, 10, 20, 0.68);
  z-index: 10030; display: none; align-items: center; justify-content: center;
}
.change-verse-backdrop.open { display: flex; }
.change-verse-box {
  background: #0f172a; border: 1px solid #334155; border-radius: 10px;
  padding: 18px 22px; width: 390px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.85);
}
.change-verse-title {
  font-size: 14px; font-weight: 700; color: #facc15; margin-bottom: 10px;
  display: flex; justify-content: space-between; align-items: center;
}
.change-verse-input {
  width: 100%; padding: 10px 12px; background: #1e293b; border: 2px solid #38bdf8;
  border-radius: 6px; color: #ffffff; font-size: 15px; outline: none; margin-bottom: 10px;
}

/* SEARCH RESULTS */
.search-result-item {
  background: #1e293b !important; border: 1px solid #334155 !important;
  border-radius: 6px !important; padding: 10px 14px !important; margin-bottom: 8px !important; cursor: pointer;
}
.search-result-item:hover { background: #334155 !important; border-color: #38bdf8 !important; }
.search-result-ref {
  color: #38bdf8 !important; font-weight: 700 !important; font-size: 13px !important;
  margin-bottom: 4px !important; display: flex; justify-content: space-between;
}
.search-result-text { color: #f1f5f9 !important; font-size: 14px !important; line-height: 1.45 !important; }
.kw-match-mark { background: rgba(250, 204, 21, 0.35); color: #fde047; font-weight: 700; padding: 0 3px; border-radius: 3px; }
`;
fs.writeFileSync(path.join(opDir, 'style.css'), opCss, 'utf8');

// 2. ISULAT ANG OPERATOR.JS (100% Valid JavaScript Engine)
const opJs = `
// ============================================================================
// BIBLE OPERATOR PANEL - PURE HTML5 ENGINE
// ============================================================================
const translationsCache = {};
let translationsMetaList = [];
let activeSlotIndex = 0;
let outputDisplayMode = 1;
let isMouseDown = false;
let dragSlotIdx = null;
let dragStartWordIdx = null;
let dragTargetState = true;
let currentCustomBg = null;
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
  contentShadow: localStorage.getItem('bible_font_content_shadow') !== 'false'
};

window.customLayoutSettings = {
  topGap: parseInt(localStorage.getItem('bible_top_gap') ?? '18', 10),
  screenMargin: parseInt(localStorage.getItem('bible_screen_margin') ?? '55', 10),
  boxPadding: parseInt(localStorage.getItem('bible_box_padding') ?? '40', 10),
  maxFontSize: parseInt(localStorage.getItem('bible_max_font_size') ?? '46', 10),
  hideBoxBg: localStorage.getItem('bible_hide_box_bg') === 'true'
};

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
    const res = await fetch(\`../data/translations/\${transId}.json\`);
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

  const serializedSlots = slots.map(s => ({
    reference: s.reference || 'GENESIS 1:1',
    version: s.versionName || 'ANG DATING BIBLIA',
    words: s.words || [],
    hasSpaces: s.hasSpaces !== false,
    highlighted: Array.from(s.highlighted)
  }));

  const payload = {
    displayMode: outputDisplayMode,
    slots: serializedSlots,
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
      topGap: (window.customLayoutSettings.topGap ?? 18) + 'px',
      boxPadding: window.customLayoutSettings.boxPadding ?? 40,
      screenMargin: window.customLayoutSettings.screenMargin ?? 55,
      maxFontSize: window.customLayoutSettings.maxFontSize ?? 46,
      hideBoxBg: window.customLayoutSettings.hideBoxBg ?? false
    }
  };

  try {
    const bc = new BroadcastChannel('bible_live_stream');
    bc.postMessage(payload);
  } catch (e) {}

  localStorage.setItem('bible_live_payload', JSON.stringify(payload));
  localStorage.setItem('bible_live_timestamp', String(Date.now()));
}

function recordHistory(ref, verName, slotIdx) {
  if (!window._workspaceBooted) return;
  const s = slots[slotIdx];
  const entryKey = \`\${ref}|\${s.transId}\`;
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

function loadSlotVerseData(slotIdx, clearHigh = true) {
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
  const isChinese = /[\\u4e00-\\u9fff]/.test(text);
  s.words = isChinese ? Array.from(text.trim()) : text.trim().split(/\\s+/);
  s.hasSpaces = !isChinese;
  s.reference = \`\${bookName} \${s.chapter}:\${s.verse}\`;

  if (clearHigh) s.highlighted.clear();
  renderSlotCanvas(slotIdx);
  updateSlotHeaderMeta(slotIdx);
  recordHistory(s.reference, s.versionName, slotIdx);
}

function updateSlotHeaderMeta(slotIdx) {
  const s = slots[slotIdx];
  const titleEl = document.getElementById(\`slotTitle\${slotIdx}\`);
  const badgeEl = document.getElementById(\`slotBadge\${slotIdx}\`);
  const focusEl = document.getElementById(\`slotFocus\${slotIdx}\`);
  const navEl = document.getElementById(\`slotNav\${slotIdx}\`);
  const cardEl = document.querySelector(\`.slot-card[data-slot="\${slotIdx}"]\`);

  if (titleEl) titleEl.textContent = \`Slot \${slotIdx + 1}: \${s.reference || 'GENESIS 1:1'}\`;

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
}

function renderSlotCanvas(slotIdx) {
  const canvas = document.getElementById(\`slotCanvas\${slotIdx}\`);
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
  const canvas = document.getElementById(\`slotCanvas\${slotIdx}\`);
  if (!canvas) return;
  const s = slots[slotIdx];
  s.words.forEach((_, idx) => {
    const wordSpan = canvas.querySelector(\`[data-index='\${idx}']\`);
    if (wordSpan) wordSpan.classList.toggle('highlighted', s.highlighted.has(idx));
    const spaceSpan = canvas.querySelector(\`[data-space-after='\${idx}']\`);
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
let draggedCardSlot = null;
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
const bgImageInput = document.getElementById('bgImageInput');
const bgColor = document.getElementById('bgColor');
const transparentToggle = document.getElementById('transparentToggle');
const hideVerseBoxToggle = document.getElementById('hideVerseBoxToggle');

if (uploadImgBtn && bgImageInput) {
  uploadImgBtn.addEventListener('click', () => bgImageInput.click());
  bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        currentCustomBg = \`url('\${ev.target.result}')\`;
        syncState();
      };
      reader.readAsDataURL(file);
    }
  });
}

if (bgColor) bgColor.addEventListener('input', () => { currentCustomBg = null; syncState(); });
if (transparentToggle) transparentToggle.addEventListener('change', () => syncState());
if (hideVerseBoxToggle) {
  hideVerseBoxToggle.checked = window.customLayoutSettings.hideBoxBg;
  hideVerseBoxToggle.addEventListener('change', () => {
    window.customLayoutSettings.hideBoxBg = hideVerseBoxToggle.checked;
    localStorage.setItem('bible_hide_box_bg', String(hideVerseBoxToggle.checked));
    syncState();
  });
}

// VERSE NAVIGATION (PREV / NEXT)
function goToNextVerse(slotIdx = activeSlotIndex) {
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

function goToPrevVerse(slotIdx = activeSlotIndex) {
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

// QUICK PARSER
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

function parseAndLoadVerse(query, slotIdx = activeSlotIndex) {
  if (!query) return;
  const match = query.trim().match(/^([1-3]?\\s*[a-zA-Z.\\s-]+?)\\s*(\\d+)(?:\\s*[:;.,\\s-]\\s*(\\d+))?$/);
  if (!match) return;

  const s = slots[slotIdx];
  const bData = translationsCache[s.transId] || {};
  const availableBooks = Object.keys(bData);
  const cleanBook = match[1].toLowerCase().replace(/[^a-z0-9]/g, '');

  let bookIdx = BOOK_ALIASES[cleanBook];
  if (bookIdx === undefined || !availableBooks[bookIdx]) {
    bookIdx = availableBooks.findIndex(b => b.toLowerCase().includes(cleanBook));
  }
  if (bookIdx === -1 || !availableBooks[bookIdx]) return;

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

// ============================================================================
// CONTEXT MENU & CHANGE VERSE POPUP
// ============================================================================
const ctxMenu = document.createElement('div');
ctxMenu.className = 'slot-ctx-menu';
ctxMenu.innerHTML = \`
  <div class="ctx-item" id="ctxChangeVerse">
    <div class="ctx-item-left"><span class="ctx-icon">✏️</span><span>Change Verse</span></div>
    <span class="ctx-shortcut">Enter</span>
  </div>
  <div class="ctx-divider"></div>
  <div class="ctx-item" id="ctxCopySlot">
    <div class="ctx-item-left"><span class="ctx-icon">📋</span><span>Copy Slot</span></div>
  </div>
  <div class="ctx-item disabled" id="ctxPasteSlot">
    <div class="ctx-item-left"><span class="ctx-icon">📋</span><span id="ctxPasteLabel">Paste Slot (Walang kopya)</span></div>
  </div>
  <div class="ctx-divider"></div>
  <div class="ctx-item has-sub" id="ctxTranslationItem">
    <div class="ctx-item-left"><span class="ctx-icon">🌐</span><span>Translation</span></div>
    <span class="ctx-arrow">▶</span>
    <div class="ctx-submenu" id="ctxTransSubmenu">
      <input type="text" class="ctx-sub-search" id="ctxTransFilterInput" placeholder="Search translation...">
      <div class="ctx-sub-list" id="ctxTransList"></div>
    </div>
  </div>
  <div class="ctx-item has-sub" id="ctxHistoryItem">
    <div class="ctx-item-left"><span class="ctx-icon">🕒</span><span>History</span></div>
    <span class="ctx-arrow">▶</span>
    <div class="ctx-submenu" id="ctxHistorySubmenu">
      <div class="ctx-sub-list" id="ctxHistoryList"></div>
    </div>
  </div>
  <div class="ctx-divider"></div>
  <div class="ctx-item clear-high" id="ctxClearHighlights">
    <div class="ctx-item-left"><span class="ctx-icon">🧹</span><span>Clear Highlights</span></div>
  </div>
\`;
document.body.appendChild(ctxMenu);

const cvModal = document.createElement('div');
cvModal.className = 'change-verse-backdrop';
cvModal.innerHTML = \`
  <div class="change-verse-box">
    <div class="change-verse-title">
      <span id="cvModalHeaderText">✏️ Change Verse</span>
      <button type="button" class="lan-close-x" id="cvCloseX">×</button>
    </div>
    <input type="text" class="change-verse-input" id="cvModalInput" placeholder="Hal. jn 3;16, rom 8:28, 1 cor 13:4">
    <div style="font-size:11.5px; color:#94a3b8; margin-bottom:12px;">I-type ang aklat, kabanata, at talata at pindutin ang <b>Enter</b>.</div>
    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="lan-btn" id="cvCancelBtn">Cancel</button>
      <button type="button" class="lan-btn primary" id="cvGoBtn">Load Verse</button>
    </div>
  </div>
\`;
document.body.appendChild(cvModal);

const cvModalInput = document.getElementById('cvModalInput');
const cvModalHeaderText = document.getElementById('cvModalHeaderText');

function openChangeVersePrompt(slotIdx) {
  ctxMenu.classList.remove('open');
  focusSlot(slotIdx);
  cvModalHeaderText.textContent = \`✏️ Change Verse — Slot \${slotIdx + 1} (\${slots[slotIdx].reference || ''})\`;
  cvModalInput.value = '';
  cvModal.classList.add('open');
  setTimeout(() => cvModalInput.focus(), 25);
}

function submitChangeVerse() {
  const val = cvModalInput.value.trim();
  if (val) parseAndLoadVerse(val, activeSlotIndex);
  cvModal.classList.remove('open');
}

document.getElementById('cvCloseX').addEventListener('click', () => cvModal.classList.remove('open'));
document.getElementById('cvCancelBtn').addEventListener('click', () => cvModal.classList.remove('open'));
document.getElementById('cvGoBtn').addEventListener('click', submitChangeVerse);
cvModalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitChangeVerse(); }
  else if (e.key === 'Escape') cvModal.classList.remove('open');
});

// RIGHT CLICK OPEN CONTEXT MENU
document.querySelectorAll('.slot-card').forEach(card => {
  const idx = parseInt(card.dataset.slot, 10);
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault(); e.stopPropagation();
    contextTargetSlot = idx;
    focusSlot(idx);

    const pasteItem = document.getElementById('ctxPasteSlot');
    const pasteLabel = document.getElementById('ctxPasteLabel');
    if (copiedSlotClipboard) {
      pasteItem.classList.remove('disabled');
      pasteLabel.textContent = \`Paste Slot (\${copiedSlotClipboard.reference})\`;
    } else {
      pasteItem.classList.add('disabled');
      pasteLabel.textContent = 'Paste Slot (Walang kopya)';
    }

    renderTransSubmenu(idx, '');
    renderHistorySubmenu(idx);

    ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 260) + 'px';
    ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 280) + 'px';
    ctxMenu.classList.add('open');
  });
});

document.addEventListener('click', (e) => {
  if (!ctxMenu.contains(e.target)) ctxMenu.classList.remove('open');
});

document.getElementById('ctxChangeVerse').addEventListener('click', () => openChangeVersePrompt(contextTargetSlot));
document.getElementById('ctxCopySlot').addEventListener('click', () => {
  const src = slots[contextTargetSlot];
  copiedSlotClipboard = { ...src, highlighted: new Set(src.highlighted) };
  ctxMenu.classList.remove('open');
});

document.getElementById('ctxPasteSlot').addEventListener('click', async () => {
  if (!copiedSlotClipboard) return;
  ctxMenu.classList.remove('open');
  await ensureTranslationLoaded(copiedSlotClipboard.transId);
  slots[contextTargetSlot] = { ...copiedSlotClipboard, highlighted: new Set(copiedSlotClipboard.highlighted) };
  loadSlotVerseData(contextTargetSlot, false);
  updateSlotVisuals(contextTargetSlot);
  updateWorkspaceUI();
  syncState();
});

document.getElementById('ctxClearHighlights').addEventListener('click', () => {
  slots[contextTargetSlot].highlighted.clear();
  updateSlotVisuals(contextTargetSlot);
  syncState();
  ctxMenu.classList.remove('open');
});

function renderTransSubmenu(slotIdx, filter = '') {
  const listEl = document.getElementById('ctxTransList');
  if (!listEl) return;
  listEl.innerHTML = '';
  const q = filter.toLowerCase().trim();
  const currentId = slots[slotIdx].transId;

  translationsMetaList
    .filter(t => !q || t.name.toLowerCase().includes(q))
    .forEach(t => {
      const row = document.createElement('div');
      row.className = 'ctx-sub-option' + (t.id === currentId ? ' active-trans' : '');
      row.innerHTML = \`<span>\${t.name}</span>\${t.id === currentId ? '<span>✓</span>' : ''}\`;
      row.addEventListener('click', async (e) => {
        e.stopPropagation();
        ctxMenu.classList.remove('open');
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
    row.innerHTML = \`<span style="color:#38bdf8; font-weight:700;">\${h.reference}</span><small style="color:#94a3b8;">\${h.versionName}</small>\`;
    row.addEventListener('click', async (e) => {
      e.stopPropagation();
      ctxMenu.classList.remove('open');
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

// ============================================================================
// TOP RIGHT BUTTONS & MODALS
// ============================================================================
const btnStack = document.createElement('div');
btnStack.className = 'top-right-btn-stack';

const gearBtn = document.createElement('button');
gearBtn.className = 'side-stack-btn'; gearBtn.innerHTML = '⚙️ Settings';

const fontBtn = document.createElement('button');
fontBtn.className = 'side-stack-btn'; fontBtn.innerHTML = '🔤 Change Font';

const layoutBtn = document.createElement('button');
layoutBtn.className = 'side-stack-btn'; layoutBtn.innerHTML = '📐 Box & Margin';

const animBtn = document.createElement('button');
animBtn.className = 'side-stack-btn'; animBtn.innerHTML = '✨ Animation';

const historyBtn = document.createElement('button');
historyBtn.className = 'side-stack-btn'; historyBtn.innerHTML = '📜 History';

btnStack.appendChild(gearBtn);
btnStack.appendChild(fontBtn);
btnStack.appendChild(layoutBtn);
btnStack.appendChild(animBtn);
btnStack.appendChild(historyBtn);
document.body.appendChild(btnStack);

// 1. SETTINGS MODAL
const lanModal = document.createElement('div');
lanModal.className = 'lan-modal-backdrop';
lanModal.innerHTML = \`
  <div class="lan-modal-box">
    <div class="lan-modal-header">
      <span>⚙️ HTML5 Output Screen Controls</span>
      <button type="button" class="lan-close-x" id="lanCloseX">×</button>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Output Screen:</div>
      <button type="button" class="lan-btn primary" id="openOutputWindowBtn" style="padding: 9px 18px; font-size: 13px;">
        🖥️ Open Output Window in New Tab
      </button>
    </div>
    <div style="font-size:12px; color:#94a3b8; margin-left:160px; margin-top:4px;">
      💡 Tip: Ilagay ang address ng <code>output/output.html</code> sa OBS Studio bilang <b>Browser Source</b>.
    </div>
    <div class="lan-modal-footer">
      <button type="button" class="lan-btn" id="lanDoneBtn">Close</button>
    </div>
  </div>
\`;
document.body.appendChild(lanModal);

gearBtn.addEventListener('click', () => lanModal.classList.add('open'));
document.getElementById('lanCloseX').addEventListener('click', () => lanModal.classList.remove('open'));
document.getElementById('lanDoneBtn').addEventListener('click', () => lanModal.classList.remove('open'));
document.getElementById('openOutputWindowBtn').addEventListener('click', () => {
  window.open('../output/output.html', '_blank', 'width=1280,height=720');
  lanModal.classList.remove('open');
});

// 2. FONT MODAL
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
function fontOpts(val) {
  return FONT_OPTIONS.map(f => \`<option value='\${f}' \${f === val ? 'selected' : ''}>\${f.split(',')[0].replace(/"/g, '')}</option>\`).join('');
}

const fontModal = document.createElement('div');
fontModal.className = 'lan-modal-backdrop';
fontModal.innerHTML = \`
  <div class="lan-modal-box" style="min-width: 650px;">
    <div class="lan-modal-header">
      <span>🔤 Change Output Font, Style & Drop Shadow</span>
      <button type="button" class="lan-close-x" id="fontCloseX">×</button>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">ROMA 8:28:</div>
      <select id="fontRefSelect" class="lan-font-select">\${fontOpts(window.customOutputFonts.ref)}</select>
      <label class="style-chk-label"><input type="checkbox" id="fontRefBoldChk" \${window.customOutputFonts.refBold ? 'checked' : ''}> <b>Bold</b></label>
      <label class="style-chk-label"><input type="checkbox" id="fontRefItalicChk" \${window.customOutputFonts.refItalic ? 'checked' : ''}> <i>Italic</i></label>
      <label class="style-chk-label"><input type="checkbox" id="fontRefShadowChk" \${window.customOutputFonts.refShadow ? 'checked' : ''}> <span>Drop Shadow</span></label>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">ANG DATING BIBLIA:</div>
      <select id="fontVerSelect" class="lan-font-select">\${fontOpts(window.customOutputFonts.version)}</select>
      <label class="style-chk-label"><input type="checkbox" id="fontVerBoldChk" \${window.customOutputFonts.verBold ? 'checked' : ''}> <b>Bold</b></label>
      <label class="style-chk-label"><input type="checkbox" id="fontVerItalicChk" \${window.customOutputFonts.verItalic ? 'checked' : ''}> <i>Italic</i></label>
      <label class="style-chk-label"><input type="checkbox" id="fontVerShadowChk" \${window.customOutputFonts.verShadow ? 'checked' : ''}> <span>Drop Shadow</span></label>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Verse Content:</div>
      <select id="fontContentSelect" class="lan-font-select">\${fontOpts(window.customOutputFonts.content)}</select>
      <label class="style-chk-label"><input type="checkbox" id="fontContentBoldChk" \${window.customOutputFonts.contentBold ? 'checked' : ''}> <b>Bold</b></label>
      <label class="style-chk-label"><input type="checkbox" id="fontContentItalicChk" \${window.customOutputFonts.contentItalic ? 'checked' : ''}> <i>Italic</i></label>
      <label class="style-chk-label"><input type="checkbox" id="fontContentShadowChk" \${window.customOutputFonts.contentShadow ? 'checked' : ''}> <span>Drop Shadow</span></label>
    </div>
    <div class="lan-modal-footer">
      <span class="lan-status-msg" id="fontStatusMsg"></span>
      <div class="lan-btn-group">
        <button type="button" class="lan-btn outline-blue" id="fontToggleShadowBtn">Toggle All Shadows</button>
        <button type="button" class="lan-btn" id="fontResetBtn">Reset Default</button>
        <button type="button" class="lan-btn primary" id="fontSaveBtn">Save & Close</button>
      </div>
    </div>
  </div>
\`;
document.body.appendChild(fontModal);

fontBtn.addEventListener('click', () => fontModal.classList.add('open'));
document.getElementById('fontCloseX').addEventListener('click', () => fontModal.classList.remove('open'));

function syncFontsLive() {
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
    contentShadow: document.getElementById('fontContentShadowChk').checked
  };
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
  syncState();
}

fontModal.querySelectorAll('select, input').forEach(el => el.addEventListener('change', syncFontsLive));
document.getElementById('fontToggleShadowBtn').addEventListener('click', () => {
  const rChk = document.getElementById('fontRefShadowChk');
  const vChk = document.getElementById('fontVerShadowChk');
  const cChk = document.getElementById('fontContentShadowChk');
  const anyOff = !rChk.checked || !vChk.checked || !cChk.checked;
  rChk.checked = anyOff; vChk.checked = anyOff; cChk.checked = anyOff;
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
  syncFontsLive();
});
document.getElementById('fontSaveBtn').addEventListener('click', () => { syncFontsLive(); fontModal.classList.remove('open'); });

// 3. LAYOUT / BOX & MARGIN MODAL
const layoutModal = document.createElement('div');
layoutModal.className = 'lan-modal-backdrop';
layoutModal.innerHTML = \`
  <div class="lan-modal-box" style="min-width: 630px;">
    <div class="lan-modal-header">
      <span>📐 Verse Box & Title Safe Margin Settings</span>
      <button type="button" class="lan-close-x" id="layoutCloseX">×</button>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Outer Screen Margin:</div>
      <input type="range" id="layoutScreenMarginRange" min="0" max="120" value="\${window.customLayoutSettings.screenMargin}" style="flex:1; accent-color:#38bdf8;">
      <span id="layoutMarginVal" style="width:48px; text-align:right; font-weight:800; color:#facc15;">\${window.customLayoutSettings.screenMargin}px</span>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Title-to-Verse Gap:</div>
      <input type="range" id="layoutTopGapRange" min="0" max="120" value="\${window.customLayoutSettings.topGap}" style="flex:1; accent-color:#facc15;">
      <span id="layoutTopGapVal" style="width:48px; text-align:right; font-weight:800; color:#facc15;">\${window.customLayoutSettings.topGap}px</span>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Inner Box Padding:</div>
      <input type="range" id="layoutBoxPaddingRange" min="10" max="90" value="\${window.customLayoutSettings.boxPadding}" style="flex:1; accent-color:#38bdf8;">
      <span id="layoutPaddingVal" style="width:48px; text-align:right; font-weight:800; color:#38bdf8;">\${window.customLayoutSettings.boxPadding}px</span>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Max Verse Font Size:</div>
      <input type="range" id="layoutMaxFontRange" min="28" max="72" value="\${window.customLayoutSettings.maxFontSize}" style="flex:1; accent-color:#38bdf8;">
      <span id="layoutMaxFontVal" style="width:48px; text-align:right; font-weight:800; color:#4ade80;">\${window.customLayoutSettings.maxFontSize}px</span>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Verse Box Background:</div>
      <label class="style-chk-label" style="flex:1; padding:8px 12px;">
        <input type="checkbox" id="layoutHideBoxChk" \${window.customLayoutSettings.hideBoxBg ? 'checked' : ''}>
        <span style="font-weight:700;">Remove / Hide Verse Box Background</span>
      </label>
    </div>
    <div class="lan-modal-footer">
      <div class="lan-btn-group">
        <button type="button" class="lan-btn outline-yellow" id="layoutFullBleedBtn">Expand Full Screen (0px)</button>
        <button type="button" class="lan-btn" id="layoutResetBtn">Reset Default</button>
        <button type="button" class="lan-btn primary" id="layoutSaveBtn">Done</button>
      </div>
    </div>
  </div>
\`;
document.body.appendChild(layoutModal);

layoutBtn.addEventListener('click', () => layoutModal.classList.add('open'));
document.getElementById('layoutCloseX').addEventListener('click', () => layoutModal.classList.remove('open'));

function syncLayoutLive() {
  const mRange = document.getElementById('layoutScreenMarginRange');
  const gRange = document.getElementById('layoutTopGapRange');
  const pRange = document.getElementById('layoutBoxPaddingRange');
  const fRange = document.getElementById('layoutMaxFontRange');
  const hChk = document.getElementById('layoutHideBoxChk');

  window.customLayoutSettings = {
    screenMargin: parseInt(mRange.value, 10),
    topGap: parseInt(gRange.value, 10),
    boxPadding: parseInt(pRange.value, 10),
    maxFontSize: parseInt(fRange.value, 10),
    hideBoxBg: hChk.checked
  };

  document.getElementById('layoutMarginVal').textContent = mRange.value + 'px';
  document.getElementById('layoutTopGapVal').textContent = gRange.value + 'px';
  document.getElementById('layoutPaddingVal').textContent = pRange.value + 'px';
  document.getElementById('layoutMaxFontVal').textContent = fRange.value + 'px';

  const mainHideToggle = document.getElementById('hideVerseBoxToggle');
  if (mainHideToggle) mainHideToggle.checked = hChk.checked;

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
  document.getElementById('layoutScreenMarginRange').value = 55;
  document.getElementById('layoutTopGapRange').value = 18;
  document.getElementById('layoutBoxPaddingRange').value = 40;
  document.getElementById('layoutMaxFontRange').value = 46;
  document.getElementById('layoutHideBoxChk').checked = false;
  syncLayoutLive();
});
document.getElementById('layoutSaveBtn').addEventListener('click', () => { syncLayoutLive(); layoutModal.classList.remove('open'); });

// 4. ANIMATION MODAL
const animModal = document.createElement('div');
animModal.className = 'lan-modal-backdrop';
animModal.innerHTML = \`
  <div class="lan-modal-box" style="min-width: 600px;">
    <div class="lan-modal-header">
      <span>✨ Verse & Highlight Animation Settings</span>
      <button type="button" class="lan-close-x" id="animCloseX">×</button>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Verse Transition:</div>
      <label class="style-chk-label" style="flex:1; padding:8px 12px;">
        <input type="checkbox" id="animEnabledChk" \${window.customAnimSettings.enabled ? 'checked' : ''} style="accent-color:#0284c7;">
        <span style="font-weight:700;">Enable Verse Transition Animation</span>
      </label>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Animation Style:</div>
      <select id="animStyleSelect" class="lan-font-select">
        <option value="fadeSlide" \${window.customAnimSettings.style === 'fadeSlide' ? 'selected' : ''}>Smooth Fade & Slide Up (Default)</option>
        <option value="pageFlip" \${window.customAnimSettings.style === 'pageFlip' ? 'selected' : ''}>📖 3D Book Page Flip (Next/Back Aware)</option>
        <option value="verticalFlip" \${window.customAnimSettings.style === 'verticalFlip' ? 'selected' : ''}>🗓️ 3D Vertical Card Flip</option>
        <option value="zoomIn" \${window.customAnimSettings.style === 'zoomIn' ? 'selected' : ''}>🔍 Gentle Broadcast Zoom In</option>
      </select>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Transition Speed:</div>
      <input type="range" id="animDurRange" min="0.15" max="2.50" step="0.05" value="\${window.customAnimSettings.duration}" style="flex:1; accent-color:#facc15;">
      <span id="animDurVal" style="width:52px; text-align:right; font-weight:800; color:#facc15;">\${Number(window.customAnimSettings.duration).toFixed(2)}s</span>
    </div>
    <div class="lan-row" style="margin-top:-4px; margin-bottom:16px;">
      <div class="lan-label-col">Speed Presets:</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button type="button" class="preset-pill-btn" data-s="0.30">Fast (0.30s)</button>
        <button type="button" class="preset-pill-btn" data-s="0.55">Normal (0.55s)</button>
        <button type="button" class="preset-pill-btn" data-s="1.00">Slow (1.00s)</button>
        <button type="button" class="preset-pill-btn" data-s="1.50">Very Slow (1.50s)</button>
      </div>
    </div>
    <div style="border-top:1px solid #1e293b; margin: 14px 0;"></div>
    <div class="lan-row">
      <div class="lan-label-col">Highlight Fade:</div>
      <label class="style-chk-label" style="flex:1; padding:8px 12px;">
        <input type="checkbox" id="highAnimChk" \${window.customAnimSettings.highlightAnimEnabled ? 'checked' : ''} style="accent-color:#eab308;">
        <span style="font-weight:700;">Smooth Word Highlight Fade</span>
      </label>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Highlight Speed:</div>
      <input type="range" id="highDurRange" min="0.10" max="1.50" step="0.05" value="\${window.customAnimSettings.highlightDuration}" style="flex:1; accent-color:#38bdf8;">
      <span id="highDurVal" style="width:52px; text-align:right; font-weight:800; color:#38bdf8;">\${Number(window.customAnimSettings.highlightDuration).toFixed(2)}s</span>
    </div>
    <div class="lan-row">
      <div class="lan-label-col">Highlight Opacity:</div>
      <input type="range" id="highOpacityRange" min="0.10" max="1.00" step="0.05" value="\${window.customAnimSettings.highlightOpacity}" style="flex:1; accent-color:#facc15;">
      <span id="highOpVal" style="width:52px; text-align:right; font-weight:800; color:#facc15;">\${Number(window.customAnimSettings.highlightOpacity).toFixed(2)}</span>
    </div>
    <div class="lan-modal-footer">
      <div class="lan-btn-group">
        <button type="button" class="lan-btn outline-blue" id="animPreviewBtn">▶ Preview Animation Now</button>
        <button type="button" class="lan-btn primary" id="animSaveBtn">Save & Close</button>
      </div>
    </div>
  </div>
\`;
document.body.appendChild(animModal);

animBtn.addEventListener('click', () => animModal.classList.add('open'));
document.getElementById('animCloseX').addEventListener('click', () => animModal.classList.remove('open'));

function syncAnimLive(preview = false) {
  const eChk = document.getElementById('animEnabledChk');
  const sSel = document.getElementById('animStyleSelect');
  const dRange = document.getElementById('animDurRange');
  const hChk = document.getElementById('highAnimChk');
  const hdRange = document.getElementById('highDurRange');
  const opRange = document.getElementById('highOpacityRange');

  window.customAnimSettings = {
    enabled: eChk.checked,
    style: sSel.value,
    duration: parseFloat(dRange.value),
    highlightAnimEnabled: hChk.checked,
    highlightDuration: parseFloat(hdRange.value),
    highlightOpacity: parseFloat(opRange.value)
  };

  document.getElementById('animDurVal').textContent = window.customAnimSettings.duration.toFixed(2) + 's';
  document.getElementById('highDurVal').textContent = window.customAnimSettings.highlightDuration.toFixed(2) + 's';
  document.getElementById('highOpVal').textContent = window.customAnimSettings.highlightOpacity.toFixed(2);

  localStorage.setItem('bible_anim_enabled', String(window.customAnimSettings.enabled));
  localStorage.setItem('bible_anim_style', window.customAnimSettings.style);
  localStorage.setItem('bible_anim_duration', String(window.customAnimSettings.duration));
  localStorage.setItem('bible_high_anim_enabled', String(window.customAnimSettings.highlightAnimEnabled));
  localStorage.setItem('bible_high_anim_duration', String(window.customAnimSettings.highlightDuration));
  localStorage.setItem('bible_high_opacity', String(window.customAnimSettings.highlightOpacity));
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
document.getElementById('animSaveBtn').addEventListener('click', () => { syncAnimLive(false); animModal.classList.remove('open'); });

// 5. HISTORY MODAL
const historyModal = document.createElement('div');
historyModal.className = 'lan-modal-backdrop';
historyModal.innerHTML = \`
  <div class="lan-modal-box" style="min-width: 580px;">
    <div class="lan-modal-header">
      <span>📜 Verse History</span>
      <button type="button" class="lan-close-x" id="histCloseX">×</button>
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px;">
      <div style="font-size:13px; color:#94a3b8;">Total History: <strong id="histCountNum" style="color:#38bdf8;">0</strong> / 100</div>
      <div style="display:flex; gap:8px;">
        <input type="text" id="histFilterInput" placeholder="I-filter ang history..." style="width:215px; padding:6px 10px; background:#1e293b; border:1px solid #334155; border-radius:5px; color:#f8fafc; font-size:12px; outline:none;">
        <button type="button" class="lan-btn danger-red" id="histClearBtn">🗑️ Clear History</button>
      </div>
    </div>
    <div id="histListContainer" style="min-height: 95px; max-height: 310px; overflow-y: auto; padding-right: 4px;"></div>
    <div class="lan-modal-footer">
      <button type="button" class="lan-btn primary" id="histDoneBtn">Close</button>
    </div>
  </div>
\`;
document.body.appendChild(historyModal);

historyBtn.addEventListener('click', () => { window.refreshHistoryModalList(); historyModal.classList.add('open'); });
document.getElementById('histCloseX').addEventListener('click', () => historyModal.classList.remove('open'));
document.getElementById('histDoneBtn').addEventListener('click', () => historyModal.classList.remove('open'));
document.getElementById('histClearBtn').addEventListener('click', () => {
  verseHistoryList = [];
  window.refreshHistoryModalList();
});

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
    row.innerHTML = \`
      <div class="search-result-ref">
        <span>\${item.reference} — <small style="color:#facc15;">\${item.versionName}</small></span>
        <span style="color:#94a3b8; font-size:11px;">\${item.time}</span>
      </div>
      \${item.textPreview ? \`<div class="search-result-text" style="font-size:12.5px; color:#cbd5e1; margin-top:2px;">\${item.textPreview}</div>\` : ''}
    \`;
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

// ============================================================================
// SEARCH WORD MODAL (In-Page Search)
// ============================================================================
const searchModal = document.getElementById('searchModal');
const closeModal = document.getElementById('closeModal');
const searchWordBtn = document.getElementById('searchWordBtn');
const keywordInput = document.getElementById('keywordInput');
const doSearchBtn = document.getElementById('doSearchBtn');
const searchResults = document.getElementById('searchResults');
const searchTransSelect = document.getElementById('searchTransSelect');

if (searchWordBtn) {
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
    if (searchModal) {
      searchModal.style.display = 'flex';
      setTimeout(() => keywordInput && keywordInput.focus(), 25);
    }
  });
}
if (closeModal) closeModal.addEventListener('click', () => { searchModal.style.display = 'none'; });
if (keywordInput) keywordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doKeywordSearch(); });
if (doSearchBtn) doSearchBtn.addEventListener('click', () => doKeywordSearch());

function doKeywordSearch() {
  const rawKw = keywordInput.value.trim().toLowerCase();
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
          item.innerHTML = \`
            <div class="search-result-ref">
              <span>\${book} \${chap}:\${verse}</span>
            </div>
            <div class="search-result-text">\${text}</div>
          \`;
          item.addEventListener('click', () => {
            const s = getActiveSlot();
            s.bookIndex = Object.keys(bData).indexOf(book);
            s.chapter = chap;
            s.verse = verse;
            loadSlotVerseData(activeSlotIndex, true);
            syncState();
            searchModal.style.display = 'none';
          });
          searchResults.appendChild(item);
          if (matchCount >= 150) break;
        }
      }
      if (matchCount >= 150) break;
    }
    if (matchCount >= 150) break;
  }

  const summary = document.getElementById('searchSummaryText');
  const statsBar = document.getElementById('searchStatsBar');
  if (statsBar) statsBar.style.display = 'flex';
  if (summary) summary.innerHTML = \`Found <strong style="color:#facc15;">\${matchCount}</strong> result(s)\`;
}

// ============================================================================
// INITIAL LOAD WORKSPACE
// ============================================================================
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
}

initWorkspace();
`;
fs.writeFileSync(path.join(opDir, 'operator.js'), opJs, 'utf8');

console.log('========================================');
console.log('✓ 100% REPAIRED! Naka-attach na ang lahat ng click, right-click, at buttons sa Operator Panel!');
console.log('========================================');