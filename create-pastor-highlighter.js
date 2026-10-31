const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const highlighterDir = path.join(baseDir, 'highlighter');
const highlighterHtmlPath = path.join(highlighterDir, 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');

console.log('--- CREATING DEDICATED PASTOR HIGHLIGHTER PANEL ---');

if (!fs.existsSync(highlighterDir)) {
  fs.mkdirSync(highlighterDir, { recursive: true });
}

// 1. ANG HIGH-PERFORMANCE, TOUCH-OPTIMIZED NA HIGHLIGHTER.HTML PARA SA PASTOR
const highlighterUI = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
  <title>Pastor's Bible Highlighter</title>
  <style>
    :root {
      --bg-color: #0b0f19;
      --card-bg: #151d30;
      --text-color: #f8fafc;
      --gold: #ffd700;
      --accent: #38bdf8;
      --hl-glow: 0 0 16px rgba(255, 215, 0, 0.95);
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
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      touch-action: manipulation;
    }

    /* TOP STATUS HEADER (NO VERSE SELECT CONTROLS) */
    header {
      background: rgba(15, 23, 42, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(10px);
    }

    .title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .live-dot {
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

    .verse-ref {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .status-badge {
      font-size: 0.75rem;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 600;
    }

    /* SLOT TABS (Kung multi-slot ang bukas sa Operator) */
    #slotTabs {
      display: none;
      background: #111827;
      padding: 6px 16px;
      gap: 8px;
      overflow-x: auto;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .slot-tab-btn {
      background: #1f2937;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }

    .slot-tab-btn.active {
      background: var(--gold);
      color: #000;
      border-color: var(--gold);
    }

    /* MAIN READING & HIGHLIGHTING SURFACE */
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
    }

    .reading-card {
      background: var(--card-bg);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      min-height: 250px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
    }

    .card-header-bar {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .active-reference-label {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--accent);
    }

    .hint-label {
      font-size: 0.8rem;
      color: #64748b;
    }

    /* TOUCH WORDS */
    .verse-words-container {
      font-size: clamp(1.6rem, 3.8vw, 2.7rem);
      line-height: 1.8;
      word-spacing: 4px;
      color: #e2e8f0;
      text-align: left;
    }

    .hl-word {
      display: inline-block;
      padding: 3px 8px;
      margin: 2px 2px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.12s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .hl-word:active {
      transform: scale(0.94);
    }

    /* ACTIVE HIGHLIGHT STATE */
    .hl-word.active-highlight {
      color: var(--gold) !important;
      text-shadow: 0 0 10px var(--gold), 0 0 20px var(--gold), 2px 2px 4px rgba(0,0,0,0.9) !important;
      background: rgba(255, 215, 0, 0.12) !important;
      border-bottom: 3px solid var(--gold);
    }

    .waiting-screen {
      text-align: center;
      color: #64748b;
      font-size: 1.3rem;
      padding: 40px 10px;
    }

    /* BOTTOM CONTROLS FOR PASTOR */
    footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      bottom: 0;
      z-index: 50;
    }

    .btn-action {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }

    .btn-action:hover, .btn-action:active {
      background: #334155;
    }

    .btn-clear {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .btn-clear:hover, .btn-clear:active {
      background: rgba(239, 68, 68, 0.3);
    }

    .font-stepper {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-step {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: #1e293b;
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-weight: bold;
      font-size: 1.1rem;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- HEADER: STATUS ONLY (NO NEXT/PREV OR SEARCH) -->
  <header>
    <div class="title-area">
      <div class="live-dot" id="netDot" title="Live LAN Sync"></div>
      <div>
        <div class="verse-ref" id="topHeaderRef">Naghihintay ng Talata...</div>
      </div>
    </div>
    <div class="status-badge">📖 PASTOR STAGE PANEL</div>
  </header>

  <!-- MULTI-SLOT SELECTOR (IF APPLICABLE) -->
  <div id="slotTabs"></div>

  <!-- READING SURFACE -->
  <main>
    <div class="reading-card">
      <div class="card-header-bar">
        <span class="active-reference-label" id="cardRefLabel">Verse Text</span>
        <span class="hint-label">👉 Pindutin ang bawat salita para mag-highlight</span>
      </div>
      <div class="verse-words-container" id="wordsContainer">
        <div class="waiting-screen">
          <p>⏳ Nakakonekta sa Control Room.</p>
          <p style="font-size: 0.95rem; margin-top: 8px; color: #475569;">Pumili ang PC Operator ng talata para lumabas dito.</p>
        </div>
      </div>
    </div>
  </main>

  <!-- STAGE SAFE ACTION BAR -->
  <footer>
    <button class="btn-action btn-clear" id="btnClearHighlights">
      <span>🧹</span> Alisin ang Highlight
    </button>

    <div class="font-stepper">
      <button class="btn-step" id="btnFontDown" title="Liitan ang Font">A-</button>
      <button class="btn-step" id="btnFontUp" title="Lakihan ang Font">A+</button>
    </div>

    <button class="btn-action" id="btnFullscreen">
      <span>⛶</span> Fullscreen
    </button>
  </footer>

  <script>
    (function() {
      let currentSlotIndex = 0;
      let slotsData = {}; // { 0: { ref: 'GENESIS 1:1', text: '...', words: [...] } }
      let highlightedIndicesBySlot = {};
      let currentFontSize = 2.2; // rem

      const wordsContainer = document.getElementById('wordsContainer');
      const topHeaderRef = document.getElementById('topHeaderRef');
      const cardRefLabel = document.getElementById('cardRefLabel');
      const slotTabs = document.getElementById('slotTabs');
      const netDot = document.getElementById('netDot');

      // 1. I-RENDER ANG MGA SALITA BILANG INTERACTIVE TOUCH BADGES
      function renderActiveVerse() {
        const slot = slotsData[currentSlotIndex];
        if (!slot || !slot.words || slot.words.length === 0) {
          wordsContainer.innerHTML = \`
            <div class="waiting-screen">
              <p>⏳ Nakakonekta sa Control Room.</p>
              <p style="font-size: 0.95rem; margin-top: 8px; color: #475569;">Pumili ang PC Operator ng talata para lumabas dito.</p>
            </div>\`;
          topHeaderRef.textContent = "Naghihintay ng Talata...";
          cardRefLabel.textContent = "Walang Aktibong Talata";
          return;
        }

        topHeaderRef.textContent = slot.ref || "LIVE VERSE";
        cardRefLabel.textContent = slot.ref || "LIVE VERSE";

        const activeSet = new Set(highlightedIndicesBySlot[currentSlotIndex] || []);
        wordsContainer.innerHTML = '';
        wordsContainer.style.fontSize = currentFontSize + 'rem';

        slot.words.forEach((w, idx) => {
          const span = document.createElement('span');
          span.className = 'hl-word' + (activeSet.has(idx) ? ' active-highlight' : '');
          span.textContent = w;
          span.dataset.idx = idx;

          span.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            toggleWordHighlight(idx);
          });

          wordsContainer.appendChild(span);
          wordsContainer.appendChild(document.createTextNode(' '));
        });
      }

      // 2. TOGGLE HIGHLIGHT AT IPADALA SA OUTPUT & PC OPERATOR
      function toggleWordHighlight(idx) {
        if (!highlightedIndicesBySlot[currentSlotIndex]) {
          highlightedIndicesBySlot[currentSlotIndex] = [];
        }
        const list = highlightedIndicesBySlot[currentSlotIndex];
        const pos = list.indexOf(idx);
        let isNowHl = false;

        if (pos > -1) {
          list.splice(pos, 1);
          isNowHl = false;
        } else {
          list.push(idx);
          isNowHl = true;
        }

        // Update locally
        const targetSpan = wordsContainer.querySelector(\`[data-idx="\${idx}"]\`);
        if (targetSpan) {
          targetSpan.classList.toggle('active-highlight', isNowHl);
        }

        // I-broadcast sa Output display at PC Operator
        const payload = {
          type: 'HIGHLIGHT_WORD',
          slotIndex: currentSlotIndex,
          wordIndex: idx,
          highlight: isNowHl,
          highlightedIndices: list,
          activeIndices: list,
          source: 'highlighter_panel'
        };

        // Via Server Stream Relay
        try {
          fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});
        } catch(e) {}

        // Via Local BroadcastChannel (kung bukas sa parehong device)
        try {
          const bc = new BroadcastChannel('bible_projection_channel');
          bc.postMessage(payload);
        } catch(e) {}
      }

      // 3. I-CLEAR ANG HIGHLIGHTS SA KASALUKUYANG TALATA
      document.getElementById('btnClearHighlights').addEventListener('click', () => {
        highlightedIndicesBySlot[currentSlotIndex] = [];
        renderActiveVerse();

        const payload = {
          type: 'CLEAR_HIGHLIGHTS',
          slotIndex: currentSlotIndex,
          source: 'highlighter_panel'
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

      // 4. PARSER: HIMAYIN ANG INCOMING MESSAGE MULA SA OPERATOR
      function processIncomingData(msg) {
        if (!msg || typeof msg !== 'object') return;

        // A. Kapag Verse/Slot update mula sa PC Operator
        if (msg.verseText || msg.text || msg.verseHtml || msg.reference || typeof msg.slotIndex !== 'undefined') {
          const sIdx = typeof msg.slotIndex === 'number' ? msg.slotIndex : 0;
          let rawText = msg.verseText || msg.text || '';
          
          if (!rawText && msg.verseHtml) {
            const temp = document.createElement('div');
            temp.innerHTML = msg.verseHtml;
            rawText = temp.textContent || temp.innerText || '';
          }

          const rawWords = rawText.trim().split(/\\s+/).filter(Boolean);
          if (rawWords.length > 0) {
            slotsData[sIdx] = {
              ref: msg.reference || msg.title || ('SLOT ' + (sIdx + 1)),
              words: rawWords
            };
            if (!highlightedIndicesBySlot[sIdx]) {
              highlightedIndicesBySlot[sIdx] = [];
            }
            updateSlotTabsUI();
            if (sIdx === currentSlotIndex || Object.keys(slotsData).length === 1) {
              currentSlotIndex = sIdx;
              renderActiveVerse();
            }
          }
        }

        // B. Kapag Highlight update
        if (msg.type === 'HIGHLIGHT_WORD' || typeof msg.wordIndex !== 'undefined') {
          const sIdx = typeof msg.slotIndex === 'number' ? msg.slotIndex : currentSlotIndex;
          if (Array.isArray(msg.highlightedIndices)) {
            highlightedIndicesBySlot[sIdx] = msg.highlightedIndices;
          } else if (typeof msg.wordIndex === 'number') {
            if (!highlightedIndicesBySlot[sIdx]) highlightedIndicesBySlot[sIdx] = [];
            const list = highlightedIndicesBySlot[sIdx];
            const p = list.indexOf(msg.wordIndex);
            if (msg.highlight && p === -1) list.push(msg.wordIndex);
            if (!msg.highlight && p > -1) list.splice(p, 1);
          }
          if (sIdx === currentSlotIndex) renderActiveVerse();
        }

        // C. Kapag Clear Highlights
        if (msg.type === 'CLEAR_HIGHLIGHTS' || msg.type === 'REMOVE_ALL_HIGHLIGHTS') {
          const sIdx = typeof msg.slotIndex === 'number' ? msg.slotIndex : currentSlotIndex;
          highlightedIndicesBySlot[sIdx] = [];
          if (sIdx === currentSlotIndex) renderActiveVerse();
        }
      }

      function updateSlotTabsUI() {
        const keys = Object.keys(slotsData);
        if (keys.length <= 1) {
          slotTabs.style.display = 'none';
          return;
        }
        slotTabs.style.display = 'flex';
        slotTabs.innerHTML = '';
        keys.forEach(k => {
          const btn = document.createElement('button');
          btn.className = 'slot-tab-btn' + (parseInt(k) === currentSlotIndex ? ' active' : '');
          btn.textContent = slotsData[k].ref || ('Slot ' + (parseInt(k) + 1));
          btn.addEventListener('click', () => {
            currentSlotIndex = parseInt(k);
            updateSlotTabsUI();
            renderActiveVerse();
          });
          slotTabs.appendChild(btn);
        });
      }

      // 5. MAKINIG SA SERVER SSE STREAM (LAN SYNC MULA SA CONTROL ROOM PC)
      function connectSSE() {
        const es = new EventSource('/api/stream');
        es.onopen = () => {
          netDot.style.background = '#22c55e';
          netDot.style.boxShadow = '0 0 10px #22c55e';
        };
        es.onmessage = (e) => {
          if (!e.data) return;
          try {
            const data = JSON.parse(e.data);
            processIncomingData(data);
          } catch(err) {}
        };
        es.onerror = () => {
          netDot.style.background = '#ef4444';
          netDot.style.boxShadow = '0 0 10px #ef4444';
          es.close();
          setTimeout(connectSSE, 2000);
        };
      }
      connectSSE();

      // Makinig din sa local BroadcastChannel
      try {
        const bc = new BroadcastChannel('bible_projection_channel');
        bc.onmessage = (e) => {
          if (e.data && e.data.source !== 'highlighter_panel') {
            processIncomingData(e.data);
          }
        };
      } catch(e) {}

      // 6. FONT SIZE CONTROLS
      document.getElementById('btnFontUp').addEventListener('click', () => {
        if (currentFontSize < 4.2) {
          currentFontSize += 0.25;
          wordsContainer.style.fontSize = currentFontSize + 'rem';
        }
      });
      document.getElementById('btnFontDown').addEventListener('click', () => {
        if (currentFontSize > 1.2) {
          currentFontSize -= 0.25;
          wordsContainer.style.fontSize = currentFontSize + 'rem';
        }
      });

      // 7. FULLSCREEN TOGGLE
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

// I-save sa dalawang lokasyon: /highlighter/index.html at /highlighter.html
fs.writeFileSync(highlighterHtmlPath, highlighterUI, 'utf8');
fs.writeFileSync(highlighterRootPath, highlighterUI, 'utf8');
console.log('✓ Nilikha ang Pastor Highlighter UI sa highlighter/index.html');

// 2. SIGURUHING SERVED ITO NG SERVER.JS AT IPALABAS SA CONSOLE BANNER
if (fs.existsSync(serverJsPath)) {
  let serverCode = fs.readFileSync(serverJsPath, 'utf8');

  // I-update ang banner ng server upang makita ang URL ng Pastor's Highlighter
  if (!serverCode.includes("Pastor's Tablet:")) {
    serverCode = serverCode.replace(
      /> Output Screen:\s*http:\/\/[^\n]+/i,
      (match) => match + "\\n  > Pastor's Tablet: http://' + ip + ':' + PORT + '/highlighter/'"
    );
    fs.writeFileSync(serverJsPath, serverCode, 'utf8');
    console.log("✓ Naidagdag ang Pastor's Tablet route sa server.js");
  }
}

console.log('\\n========================================================');
console.log('✓ SUCCESS! DEDICATED PASTOR HIGHLIGHTER IS READY TO USE.');
console.log('========================================================');