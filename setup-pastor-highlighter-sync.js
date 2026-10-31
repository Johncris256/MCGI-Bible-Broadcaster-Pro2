const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const highlighterDir = path.join(baseDir, 'highlighter');
const highlighterHtmlPath = path.join(highlighterDir, 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- DEPLOYING DEDICATED PASTOR HIGHLIGHTER WITH OUTPUT MIRRORING ---');

if (!fs.existsSync(highlighterDir)) {
  fs.mkdirSync(highlighterDir, { recursive: true });
}

// =========================================================================
// 1. HIGHLIGHTER.HTML (DYNAMIC GRID: 1 FULL, 2 SPLIT, 3 SPLIT, 4 GRID)
// =========================================================================
const highlighterUI = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
  <title>Pastor Stage Highlighter</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #131b2e;
      --card-border: rgba(255, 255, 255, 0.08);
      --gold: #ffd700;
      --accent: #38bdf8;
      --text: #f8fafc;
    }

    * {
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      touch-action: manipulation;
    }

    /* TOP LIVE BAR (READ-ONLY STATUS) */
    header {
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .status-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pulse-dot {
      width: 12px;
      height: 12px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .brand-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: 0.5px;
    }

    .layout-badge {
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.35);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      letter-spacing: 1px;
    }

    /* DYNAMIC STAGE GRID (MIRRORS OUTPUT.HTML) */
    #stageContainer {
      flex: 1;
      padding: 16px;
      display: grid;
      gap: 16px;
      overflow-y: auto;
      width: 100%;
      height: 100%;
    }

    /* 1 FULL: 1 Col, 1 Row */
    #stageContainer.layout-1 {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }

    /* 2 SPLIT: 2 Cols */
    #stageContainer.layout-2 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr;
    }

    /* 3 SPLIT: 3 Cols */
    #stageContainer.layout-3 {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr;
    }

    /* 4 GRID: 2x2 */
    #stageContainer.layout-4 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }

    @media (max-width: 768px) and (orientation: portrait) {
      #stageContainer.layout-2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
      #stageContainer.layout-3 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr 1fr; }
    }

    /* SLOT CARDS */
    .pastor-slot-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }

    .slot-ref-header {
      font-size: 1rem;
      font-weight: 700;
      color: var(--accent);
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .slot-words-area {
      flex: 1;
      overflow-y: auto;
      line-height: 1.75;
      word-spacing: 4px;
      color: #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      align-items: center;
      gap: 3px 6px;
    }

    /* FONT SIZES ACCORDING TO ACTIVE LAYOUT */
    #stageContainer.layout-1 .slot-words-area { font-size: clamp(1.8rem, 3.4vw, 2.7rem); }
    #stageContainer.layout-2 .slot-words-area { font-size: clamp(1.3rem, 2.3vw, 1.9rem); }
    #stageContainer.layout-3 .slot-words-area { font-size: clamp(1.1rem, 1.8vw, 1.5rem); }
    #stageContainer.layout-4 .slot-words-area { font-size: clamp(1.1rem, 1.8vw, 1.45rem); }

    /* TOUCH WORD SPANS */
    .p-word {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .p-word:active {
      transform: scale(0.92);
    }

    /* ACTIVE HIGHLIGHT STATE */
    .p-word.active-highlight {
      color: var(--gold) !important;
      text-shadow: 0 0 10px var(--gold), 0 0 20px var(--gold), 2px 2px 4px rgba(0,0,0,0.9) !important;
      background: rgba(255, 215, 0, 0.15) !important;
      border-bottom: 3px solid var(--gold);
    }

    /* EMPTY / WAITING SCREEN */
    .waiting-box {
      grid-column: 1 / -1;
      grid-row: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 1.3rem;
      text-align: center;
      padding: 30px;
    }

    /* BOTTOM CONTROLS */
    footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .btn-pastor {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-pastor:active {
      background: #334155;
    }

    .btn-clear {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.3);
    }
  </style>
</head>
<body>

  <!-- STATUS HEADER -->
  <header>
    <div class="status-left">
      <div class="pulse-dot" id="dotStatus"></div>
      <span class="brand-title">PASTOR HIGHLIGHTER</span>
      <span class="layout-badge" id="layoutBadge">1 FULL</span>
    </div>
    <span style="font-size: 0.8rem; color: #94a3b8;">Output Mirror Active</span>
  </header>

  <!-- LIVE STAGE CONTAINER (1, 2, 3, OR 4 SLOTS) -->
  <div id="stageContainer" class="layout-1">
    <div class="waiting-box">
      <p>⏳ Naghihintay ng Talata mula sa Output...</p>
      <p style="font-size: 0.9rem; margin-top: 8px; color: #475569;">Pumili ng talata ang Control Room para lumitaw dito.</p>
    </div>
  </div>

  <!-- STAGE SAFE FOOTER -->
  <footer>
    <button class="btn-pastor btn-clear" id="btnClearAll">
      <span>🧹</span> I-clear ang Highlights
    </button>
    <button class="btn-pastor" id="btnFullscreen">
      <span>⛶</span> Fullscreen
    </button>
  </footer>

  <script>
    (function() {
      const stage = document.getElementById('stageContainer');
      const layoutBadge = document.getElementById('layoutBadge');
      const dotStatus = document.getElementById('dotStatus');

      let currentSlots = []; // Array ng visible slots mula sa Output
      let currentLayout = 'layout-1';

      // 1. I-RENDER ANG MGA KASALUKUYANG SLOTS NA NASA OUTPUT LAMANG
      function renderStage(slots, layoutCount) {
        if (!Array.isArray(slots) || slots.length === 0) {
          stage.className = 'layout-1';
          layoutBadge.textContent = 'WAITING';
          stage.innerHTML = \`
            <div class="waiting-box">
              <p>⏳ Naghihintay ng Talata mula sa Output...</p>
              <p style="font-size: 0.9rem; margin-top: 8px; color: #475569;">Pumili ng talata ang Control Room para lumitaw dito.</p>
            </div>\`;
          return;
        }

        currentSlots = slots;
        const count = layoutCount || slots.length;
        const layoutClass = 'layout-' + Math.min(Math.max(count, 1), 4);
        stage.className = layoutClass;

        const layoutNames = { 'layout-1': '1 FULL', 'layout-2': '2 SPLIT', 'layout-3': '3 SPLIT', 'layout-4': '4 GRID' };
        layoutBadge.textContent = layoutNames[layoutClass] || (count + ' SLOTS');

        stage.innerHTML = '';

        slots.forEach((slotData) => {
          const card = document.createElement('div');
          card.className = 'pastor-slot-card';
          card.dataset.slotIndex = slotData.slotIndex;

          const header = document.createElement('div');
          header.className = 'slot-ref-header';
          header.innerHTML = '<span>' + (slotData.reference || ('SLOT ' + (slotData.slotIndex + 1))) + '</span><span style="font-size:0.75rem; color:#64748b;">Slot ' + (slotData.slotIndex + 1) + '</span>';
          card.appendChild(header);

          const wordsArea = document.createElement('div');
          wordsArea.className = 'slot-words-area';

          const activeSet = new Set(slotData.highlightedIndices || []);

          slotData.words.forEach((w, wIdx) => {
            const span = document.createElement('span');
            span.className = 'p-word' + (activeSet.has(wIdx) ? ' active-highlight' : '');
            span.textContent = w;
            span.dataset.slotIdx = slotData.slotIndex;
            span.dataset.wordIdx = wIdx;

            // Zero-latency Touch/Tap Listener
            span.addEventListener('pointerdown', (e) => {
              e.preventDefault();
              toggleHighlight(slotData.slotIndex, wIdx, span);
            });

            wordsArea.appendChild(span);
          });

          card.appendChild(wordsArea);
          stage.appendChild(card);
        });
      }

      // 2. TOGGLE HIGHLIGHT & REAL-TIME BROADCAST TO OUTPUT.HTML
      function toggleHighlight(slotIdx, wordIdx, spanEl) {
        spanEl.classList.toggle('active-highlight');
        const isHl = spanEl.classList.contains('active-highlight');

        const payload = {
          type: 'HIGHLIGHT_WORD',
          slotIndex: slotIdx,
          wordIndex: wordIdx,
          highlight: isHl,
          source: 'pastor_stage_highlighter'
        };

        // I-broadcast sa buong LAN via Server
        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});

        // Local BroadcastChannel kung bukas sa iisang browser
        try {
          const bc = new BroadcastChannel('bible_projection_channel');
          bc.postMessage(payload);
        } catch(e) {}
      }

      // 3. I-CLEAR ANG HIGHLIGHTS
      document.getElementById('btnClearAll').addEventListener('click', () => {
        document.querySelectorAll('.p-word.active-highlight').forEach(el => el.classList.remove('active-highlight'));

        const payload = {
          type: 'CLEAR_HIGHLIGHTS',
          source: 'pastor_stage_highlighter'
        };

        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});

        try {
          const bc = new BroadcastChannel('bible_projection_channel');
          bc.postMessage(payload);
        } catch(e) {}
      });

      // 4. MAKINIG SA LIVE STREAM MULA SA OUTPUT.HTML AT SERVER
      function connectSSE() {
        const es = new EventSource('/api/stream');
        es.onopen = () => {
          dotStatus.style.background = '#22c55e';
          dotStatus.style.boxShadow = '0 0 10px #22c55e';
        };
        es.onmessage = (e) => {
          if (!e.data) return;
          try {
            const data = JSON.parse(e.data);

            // A. Full Stage Snapshot mula sa output.html
            if (data.type === 'OUTPUT_STAGE_SNAPSHOT' && Array.isArray(data.slots)) {
              renderStage(data.slots, data.layoutCount);
            }

            // B. Direct Word Highlight mula sa ibang devices
            if (data.type === 'HIGHLIGHT_WORD' && typeof data.slotIndex === 'number' && typeof data.wordIndex === 'number') {
              const target = stage.querySelector(\`[data-slot-idx="\${data.slotIndex}"][data-word-idx="\${data.wordIndex}"]\`);
              if (target) {
                target.classList.toggle('active-highlight', !!data.highlight);
              }
            }

            // C. Clear
            if (data.type === 'CLEAR_HIGHLIGHTS') {
              document.querySelectorAll('.p-word.active-highlight').forEach(el => el.classList.remove('active-highlight'));
            }
          } catch(err) {}
        };
        es.onerror = () => {
          dotStatus.style.background = '#ef4444';
          dotStatus.style.boxShadow = '0 0 10px #ef4444';
          es.close();
          setTimeout(connectSSE, 2000);
        };
      }
      connectSSE();

      // Fullscreen Toggle
      document.getElementById('btnFullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(highlighterHtmlPath, highlighterUI, 'utf8');
fs.writeFileSync(highlighterRootPath, highlighterUI, 'utf8');
console.log('✓ Nilikha ang Pastor Stage Highlighter sa highlighter/index.html');

// =========================================================================
// 2. I-UPDATE ANG OUTPUT/OUTPUT.HTML PARA MAGPADALA NG LIVE STAGE SNAPSHOT
// =========================================================================
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  outHtml = outHtml.replace(/<script id="OUTPUT_STAGE_FEEDER">[\s\S]*?<\/script>/gi, '');

  const stageFeeder = `
<script id="OUTPUT_STAGE_FEEDER">
  (function() {
    let lastSnapJson = '';

    // Kunan ng snapshot ang aktuwal na nakaproyektang slots sa output.html
    function publishOutputStageState() {
      const stage = document.getElementById('multiSlotStage') || document.body;
      const allBoxes = Array.from(stage.querySelectorAll('.render-box, [id*="slot"], [class*="slot"]'));

      // Kunin lamang ang mga boxes na kasalukuyang visible (hindi display:none at hindi opacity 0)
      const visibleBoxes = allBoxes.filter(box => {
        const style = window.getComputedStyle(box);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      const effectiveBoxes = visibleBoxes.length > 0 ? visibleBoxes : (allBoxes.length > 0 ? [allBoxes[0]] : []);

      const slots = [];
      effectiveBoxes.forEach((box, idx) => {
        const titleEl = box.querySelector('.verse-title, .slot-header, h3, h4, [class*="title"], [class*="header"]');
        const textEl = box.querySelector('.verse-text, [class*="verse"], p');
        const wordNodes = textEl ? Array.from(textEl.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim()) : [];

        const words = [];
        const hlIndices = [];

        wordNodes.forEach((w, wIdx) => {
          words.push(w.innerText.trim());
          if (w.classList.contains('active-highlight')) {
            hlIndices.push(wIdx);
          }
        });

        slots.push({
          slotIndex: idx,
          reference: titleEl ? titleEl.innerText.trim() : ('SLOT ' + (idx + 1)),
          words: words,
          highlightedIndices: hlIndices
        });
      });

      const snapshot = {
        type: 'OUTPUT_STAGE_SNAPSHOT',
        layoutCount: effectiveBoxes.length,
        slots: slots
      };

      const snapJson = JSON.stringify(snapshot);
      if (snapJson !== lastSnapJson) {
        lastSnapJson = snapJson;
        // Ipadala sa server para mai-render agad sa tablet ng pastor
        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: snapJson
        }).catch(() => {});
      }
    }

    // Bantayan ang anumang pagbabago sa talata o layout sa output.html
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(publishOutputStageState, 300);
      const stage = document.getElementById('multiSlotStage') || document.body;
      const obs = new MutationObserver(() => {
        setTimeout(publishOutputStageState, 60);
      });
      obs.observe(stage, { childList: true, subtree: true, attributes: true, characterData: true });
    });

    // Makinig din sa mga utos ng highlight mula sa tablet ng pastor
    const es = new EventSource('/api/stream');
    es.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'HIGHLIGHT_WORD' && typeof msg.slotIndex === 'number' && typeof msg.wordIndex === 'number') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          const boxes = Array.from(stage.querySelectorAll('.render-box, [id*="slot"], [class*="slot"]')).filter(b => {
            const s = window.getComputedStyle(b);
            return s.display !== 'none' && s.opacity !== '0';
          });
          const targetBox = boxes[msg.slotIndex] || boxes[0];
          if (targetBox) {
            const words = Array.from(targetBox.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
            if (words[msg.wordIndex]) {
              words[msg.wordIndex].classList.toggle('active-highlight', !!msg.highlight);
            }
          }
        }
        if (msg.type === 'CLEAR_HIGHLIGHTS') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          stage.querySelectorAll('.active-highlight').forEach(el => el.classList.remove('active-highlight'));
        }
      } catch(err) {}
    };
  })();
</script>
`;

  if (outHtml.includes('</body>')) {
    outHtml = outHtml.replace('</body>', stageFeeder + '\n</body>');
  } else {
    outHtml += stageFeeder;
  }

  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naikabit ang Stage Feeder sa output/output.html');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! PASTOR HIGHLIGHTER MIRRORING IS FULLY READY.');
console.log('========================================================');