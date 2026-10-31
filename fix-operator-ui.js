const fs = require('fs');
const path = require('path');

const targetIndexHtml = path.join('C:', 'bible-html5-app', 'operator', 'index.html');

const fullOperatorHtml = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <title>Bible Operator Panel (HTML5)</title>
  <style>
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

    /* TOP HEADER */
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

    /* 4-SLOT WORKSPACE */
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

    /* TOP RIGHT FIXED BUTTON STACK (GEAR & MODAL BUTTONS) */
    .top-right-btn-stack {
      position: fixed !important;
      top: 6px !important;
      right: 10px !important;
      z-index: 9998 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      width: 140px !important;
    }
    .side-stack-btn {
      background: #1e293b; color: #f8fafc; border: 1px solid #334155;
      border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4); transition: all 0.15s ease;
    }
    .side-stack-btn:hover { background: #334155; border-color: #38bdf8; color: #38bdf8; }

    /* MODAL BACKDROPS (LOCKED TO DISPLAY: NONE BY DEFAULT) */
    .lan-modal-backdrop {
      position: fixed !important;
      inset: 0 !important;
      background: rgba(5, 10, 20, 0.72) !important;
      z-index: 9999 !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .lan-modal-backdrop.open {
      display: flex !important;
    }
    .lan-modal-box {
      background: #0f172a; color: #f8fafc; border: 1px solid #1e293b;
      border-radius: 10px; padding: 20px 26px; min-width: 590px;
      box-shadow: 0 20px 45px rgba(0,0,0,0.8);
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
      position: fixed !important; z-index: 10020 !important; width: 245px; background: #0d1322;
      border: 1px solid #26334d; border-radius: 10px; padding: 6px 0;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.78); display: none !important;
      font-size: 13.5px; color: #f8fafc; user-select: none;
    }
    .slot-ctx-menu.open { display: block !important; }
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
      position: fixed !important; inset: 0 !important; background: rgba(5, 10, 20, 0.68) !important;
      z-index: 10030 !important; display: none !important; align-items: center !important; justify-content: center !important;
    }
    .change-verse-backdrop.open { display: flex !important; }
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
  </style>
</head>
<body>
  <!-- HEADER CONTROLS -->
  <header class="op-header">
    <div class="op-row-2">
      <label class="ctrl-label">BG: <input type="color" id="bgColor" value="#004cff"></label>
      <input type="file" id="bgImageInput" accept="image/*" style="display: none;">
      <button id="uploadImgBtn" class="std-btn" type="button">Upload BG</button>

      <label class="ctrl-label"><input type="checkbox" id="transparentToggle"> Transparent BG</label>
      <label class="ctrl-label"><input type="checkbox" id="hideVerseBoxToggle"> Hide Verse Box</label>

      <button id="searchWordBtn" class="std-btn">🔍 Search Word</button>
      <button id="clearHighlightsBtn" class="btn-yellow">Remove Highlight</button>
      <button id="clearAllHighlightsBtn" class="btn-orange">Remove All Highlights</button>
    </div>

    <div class="op-row-3">
      <div class="mode-group">
        <span class="mode-label">OUTPUT DISPLAY MODE:</span>
        <button type="button" class="mode-pill active" data-mode="1">1 Full (Slot 1 Live)</button>
        <button type="button" class="mode-pill" data-mode="2">2 Split (Side-by-Side)</button>
        <button type="button" class="mode-pill" data-mode="3">3 Split</button>
        <button type="button" class="mode-pill" data-mode="4">4 Grid (2x2)</button>
      </div>
      <div class="workspace-status">
        Operator Screen: <strong>Permanent 4-Slot Workspace (HTML5)</strong>
      </div>
    </div>
  </header>

  <!-- 4-SLOT WORKSPACE -->
  <main class="workspace-grid" id="workspaceGrid">
    <div class="slot-card active-slot" data-slot="0" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle0">Slot 1: GENESIS 1:1</span>
          <span class="slot-badge live" id="slotBadge0">● LIVE</span>
        </div>
        <div class="slot-center-nav" id="slotNav0">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="0">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="0">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge editing" id="slotFocus0">• EDITING</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas0"></div>
    </div>

    <div class="slot-card" data-slot="1" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle1">Slot 2: GENESIS 1:1</span>
          <span class="slot-badge staging" id="slotBadge1">● STAGING</span>
        </div>
        <div class="slot-center-nav" id="slotNav1" style="display:none;">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="1">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="1">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge" id="slotFocus1">CLICK TO FOCUS</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas1"></div>
    </div>

    <div class="slot-card" data-slot="2" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle2">Slot 3: GENESIS 1:2</span>
          <span class="slot-badge staging" id="slotBadge2">● STAGING</span>
        </div>
        <div class="slot-center-nav" id="slotNav2" style="display:none;">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="2">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="2">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge" id="slotFocus2">CLICK TO FOCUS</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas2"></div>
    </div>

    <div class="slot-card" data-slot="3" draggable="true">
      <div class="slot-header">
        <div class="slot-left-meta">
          <span class="drag-dots" title="Drag to swap slot">⠿</span>
          <span class="slot-title" id="slotTitle3">Slot 4: GENESIS 1:3</span>
          <span class="slot-badge staging" id="slotBadge3">● STAGING</span>
        </div>
        <div class="slot-center-nav" id="slotNav3" style="display:none;">
          <button type="button" class="mini-nav-btn" data-dir="prev" data-slot="3">◀</button>
          <button type="button" class="mini-nav-btn" data-dir="next" data-slot="3">▶</button>
        </div>
        <div class="slot-right-meta">
          <span class="focus-badge" id="slotFocus3">CLICK TO FOCUS</span>
        </div>
      </div>
      <div class="slot-canvas" id="slotCanvas3"></div>
    </div>
  </main>

  <footer class="op-footer">
    💡 Tip: Mag-Right Click sa kahit anong Slot para magpalit ng Verse (o pindutin ang <b>Enter</b>), magpalit ng Translation, Copy/Paste Slot, o tingnan ang History.
  </footer>

  <!-- SEARCH WORD MODAL -->
  <div id="searchModal" class="lan-modal-backdrop">
    <div class="lan-modal-box" style="width: 780px; max-width: 95vw;">
      <div class="lan-modal-header">
        <span>🔍 Search Word(s) in Bible</span>
        <button type="button" class="lan-close-x" id="closeModal">×</button>
      </div>
      <div class="lan-row">
        <div class="lan-label-col">Translation:</div>
        <select id="searchTransSelect" class="lan-font-select"></select>
      </div>
      <div class="lan-row">
        <div class="lan-label-col">Keyword:</div>
        <input type="text" id="keywordInput" class="lan-font-select" placeholder="I-type ang salita o parirala...">
        <button type="button" class="lan-btn primary" id="doSearchBtn">Search</button>
      </div>
      <div id="searchStatsBar" style="display:none; font-size:12px; color:#38bdf8; margin: 4px 0 10px 160px;" id="searchSummaryText"></div>
      <div id="searchResults" style="max-height: 280px; overflow-y: auto; padding-right: 4px;"></div>
    </div>
  </div>

  <script src="operator.js"></script>
</body>
</html>`;

fs.writeFileSync(targetIndexHtml, fullOperatorHtml, 'utf8');
console.log('✓ MATAGUMPAY NA NA-UPDATE ANG OPERATOR INDEX.HTML!');