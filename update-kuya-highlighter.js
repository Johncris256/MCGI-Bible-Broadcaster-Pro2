const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const highlighterDir = path.join(baseDir, 'highlighter');
const highlighterHtmlPath = path.join(highlighterDir, 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');

console.log('--- UPDATING TO KUYA HIGHLIGHTER (FULL 4-GRID VERSE SYNC) ---');

// =========================================================================
// 1. I-UPDATE ANG OPERATOR/INDEX.HTML (DEEP VERSE TEXT & WORD EXTRACTOR)
// =========================================================================
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  // Alisin ang lumang bridge
  opHtml = opHtml.replace(/<script id="MASTER_OPERATOR_PROXY_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const robustOperatorBridge = `
<script id="MASTER_OPERATOR_PROXY_BRIDGE">
  (function() {
    // 1. I-RELAY ANG BROADCAST SA OUTPUT SCREENS (LAN)
    const origPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      if (data && typeof data === 'object' && !data.__msgId) {
        data.__msgId = Date.now() + '_' + Math.random().toString(36).substr(2, 7);
      }
      origPost.apply(this, arguments);

      fetch('/api/output-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {});
    };

    // 2. ROBUST DEEP VERSE EXTRACTOR PARA SA 4-GRID NI KUYA
    let lastFeedStr = '';

    function extractCleanWordsAndHighlights(slotEl) {
      // Paraan A: Hanapin ang mga salitang naka-span na (.ndi-word o span)
      let wordSpans = Array.from(slotEl.querySelectorAll('.ndi-word, span[data-word-idx], .word-span')).filter(w => w.innerText.trim());
      
      // Paraan B: Kung walang spans, i-clone ang slot at alisin ang header/buttons para makuha ang mismong talata
      if (wordSpans.length === 0) {
        const clone = slotEl.cloneNode(true);
        const trash = clone.querySelectorAll('.slot-header, header, [class*="header"], button, .slot-actions, .slot-controls, .controls, .badge');
        trash.forEach(t => t.remove());
        const plainText = (clone.innerText || clone.textContent || '').trim();
        const rawWords = plainText.split(/\\s+/).filter(Boolean);
        return {
          words: rawWords,
          highlightedIndices: []
        };
      }

      const words = [];
      const hlIndices = [];
      wordSpans.forEach((sp, idx) => {
        words.push(sp.innerText.trim());
        if (sp.classList.contains('active-highlight') || sp.getAttribute('data-highlighted') === 'true') {
          hlIndices.push(idx);
        }
      });

      return {
        words: words,
        highlightedIndices: hlIndices
      };
    }

    function cleanReferenceTitle(rawTitle, defaultSlotNum) {
      if (!rawTitle) return 'SLOT ' + defaultSlotNum;
      // Tanggalin ang mga edit buttons at icons tulad ng "• LIVE ◄ ► • EDITING"
      let clean = rawTitle
        .replace(/[◄►•]/g, '')
        .replace(/LIVE/gi, '')
        .replace(/EDITING/gi, '')
        .replace(/\\s+/g, ' ')
        .trim();
      return clean || ('SLOT ' + defaultSlotNum);
    }

    function syncFeedToKuya() {
      // Hanapin ang 4 slot containers sa Operator Workspace
      let allSlots = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).filter(el => {
        const t = el.innerText || '';
        return t.includes('SLOT') || el.querySelector('.verse-text, p, textarea, .ndi-word');
      });

      if (allSlots.length < 4) {
        const workspaceBoxes = Array.from(document.querySelectorAll('.workspace > div, #workspace > div, .main-content > div'));
        if (workspaceBoxes.length >= 4) allSlots = workspaceBoxes;
      }

      const slotsData = [];

      for (let i = 0; i < 4; i++) {
        const sEl = allSlots[i];
        if (sEl) {
          const titleEl = sEl.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
          const rawTitle = titleEl ? titleEl.innerText : ('SLOT ' + (i + 1));
          const extracted = extractCleanWordsAndHighlights(sEl);

          slotsData.push({
            slotIndex: i,
            reference: cleanReferenceTitle(rawTitle, i + 1),
            words: extracted.words,
            highlightedIndices: extracted.highlightedIndices
          });
        } else {
          slotsData.push({
            slotIndex: i,
            reference: 'SLOT ' + (i + 1),
            words: [],
            highlightedIndices: []
          });
        }
      }

      const payload = { layoutCount: 4, slots: slotsData };
      const str = JSON.stringify(payload);
      if (str !== lastFeedStr) {
        lastFeedStr = str;
        fetch('/api/pastor-feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: str
        }).catch(() => {});
      }
    }

    // 3. TANGGAPIN ANG TAP NI KUYA AT I-TRIGGER SA MISMONG SALITA SA OPERATOR
    function triggerWordClick(element) {
      if (!element) return;
      ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
        element.dispatchEvent(new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window }));
      });
    }

    const proxyES = new EventSource('/api/operator-proxy-stream');
    proxyES.onmessage = function(e) {
      if (!e.data) return;
      try {
        const tap = JSON.parse(e.data);
        if (tap.type === 'TAP_WORD') {
          const allSlots = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).filter(el => {
            return (el.innerText || '').includes('SLOT') || el.querySelector('.verse-text, p, .ndi-word');
          });
          const targetSlot = allSlots[tap.slotIndex];
          if (targetSlot) {
            const words = Array.from(targetSlot.querySelectorAll('.ndi-word, span[data-word-idx], .word-span')).filter(w => w.innerText.trim());
            const targetWord = words[tap.wordIndex];
            if (targetWord) {
              triggerWordClick(targetWord);
              setTimeout(syncFeedToKuya, 40);
            }
          }
        }
      } catch(err) {}
    };

    // Auto-sync tuwing may galaw sa Operator
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(syncFeedToKuya, 300);
      setInterval(syncFeedToKuya, 1000); // Pulse check para garantisadong laging may laman ang mga kahon
      document.addEventListener('click', () => { setTimeout(syncFeedToKuya, 80); });
      const root = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      const obs = new MutationObserver(() => { setTimeout(syncFeedToKuya, 100); });
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    });
  })();
</script>
`;

  if (opHtml.includes('</body>')) {
    opHtml = opHtml.replace('</body>', robustOperatorBridge + '\n</body>');
  } else {
    opHtml += robustOperatorBridge;
  }

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Na-update ang Deep Verse Text Extractor.');
}

// =========================================================================
// 2. I-UPDATE ANG KUYA HIGHLIGHTER UI (index.html & highlighter.html)
// =========================================================================
const kuyaHighlighterUI = `<!DOCTYPE html>
<html lang="tl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
  <title>Kuya Highlighter</title>
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

    /* STATUS HEADER */
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
    }

    .brand-title {
      font-size: 1.05rem;
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

    /* 4-GRID CONTAINER (DEFAULT 2x2) */
    #stageContainer {
      flex: 1;
      padding: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 14px;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }

    @media (max-width: 768px) and (orientation: portrait) {
      #stageContainer {
        grid-template-columns: 1fr;
        grid-template-rows: repeat(4, 1fr);
        overflow-y: auto;
      }
    }

    /* SLOT CARDS */
    .kuya-slot-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }

    .slot-ref-header {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--accent);
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .slot-words-area {
      flex: 1;
      overflow-y: auto;
      line-height: 1.7;
      word-spacing: 4px;
      color: #e2e8f0;
      font-size: clamp(1.15rem, 1.85vw, 1.55rem);
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      align-items: center;
      gap: 4px 6px;
    }

    /* TOUCH WORD SPANS */
    .p-word {
      display: inline-block;
      padding: 4px 9px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.1s ease;
      background: rgba(255, 255, 255, 0.03);
    }

    .p-word:active {
      transform: scale(0.92);
    }

    /* ACTIVE HIGHLIGHT STATE */
    .p-word.active-highlight {
      color: var(--gold) !important;
      text-shadow: 0 0 10px var(--gold), 0 0 20px var(--gold), 2px 2px 4px rgba(0,0,0,0.9) !important;
      background: rgba(255, 215, 0, 0.18) !important;
      border-bottom: 3px solid var(--gold);
    }

    .empty-slot-msg {
      color: #475569;
      font-style: italic;
      font-size: 0.95rem;
      margin: auto;
    }

    /* FOOTER */
    footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .btn-kuya {
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

    .btn-kuya:active { background: #334155; }
  </style>
</head>
<body>

  <!-- STATUS HEADER -->
  <header>
    <div class="status-left">
      <div class="pulse-dot" id="dotStatus"></div>
      <span class="brand-title">KUYA HIGHLIGHTER</span>
      <span class="layout-badge">4 GRID</span>
    </div>
    <span style="font-size: 0.8rem; color: #94a3b8;">Operator Feed Linked</span>
  </header>

  <!-- 4-GRID STAGE -->
  <div id="stageContainer"></div>

  <!-- FOOTER -->
  <footer>
    <span style="font-size: 0.85rem; color: #64748b;">👉 I-tap ang salita para mag-highlight nang live</span>
    <button class="btn-kuya" id="btnFullscreen">
      <span>⛶</span> Fullscreen
    </button>
  </footer>

  <script>
    (function() {
      const stage = document.getElementById('stageContainer');
      const dotStatus = document.getElementById('dotStatus');

      function render4Grid(slots) {
        stage.innerHTML = '';

        for (let i = 0; i < 4; i++) {
          const slotData = (slots && slots[i]) ? slots[i] : { slotIndex: i, reference: 'SLOT ' + (i + 1), words: [] };

          const card = document.createElement('div');
          card.className = 'kuya-slot-card';
          card.dataset.slotIndex = slotData.slotIndex;

          const header = document.createElement('div');
          header.className = 'slot-ref-header';
          header.innerHTML = '<span>' + (slotData.reference || ('SLOT ' + (i + 1))) + '</span><span style="font-size:0.75rem; color:#64748b;">Slot ' + (i + 1) + '</span>';
          card.appendChild(header);

          const wordsArea = document.createElement('div');
          wordsArea.className = 'slot-words-area';

          const activeSet = new Set(slotData.highlightedIndices || []);

          if (Array.isArray(slotData.words) && slotData.words.length > 0) {
            slotData.words.forEach((w, wIdx) => {
              const span = document.createElement('span');
              span.className = 'p-word' + (activeSet.has(wIdx) ? ' active-highlight' : '');
              span.textContent = w;
              span.dataset.slotIdx = slotData.slotIndex;
              span.dataset.wordIdx = wIdx;

              // Zero-latency tap: Local instant toggle + proxy click sa Operator PC
              span.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                span.classList.toggle('active-highlight');

                fetch('/api/pastor-tap', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'TAP_WORD',
                    slotIndex: slotData.slotIndex,
                    wordIndex: wIdx
                  })
                }).catch(() => {});
              });

              wordsArea.appendChild(span);
            });
          } else {
            wordsArea.innerHTML = '<span class="empty-slot-msg">Walang laman ang Slot ' + (i + 1) + ' sa Operator</span>';
          }

          card.appendChild(wordsArea);
          stage.appendChild(card);
        }
      }

      // Initial empty 4-grid render
      render4Grid([]);

      function connectFeed() {
        const es = new EventSource('/api/pastor-stream');
        es.onopen = () => {
          dotStatus.style.background = '#22c55e';
          dotStatus.style.boxShadow = '0 0 10px #22c55e';
        };
        es.onmessage = (e) => {
          if (!e.data) return;
          try {
            const data = JSON.parse(e.data);
            if (Array.isArray(data.slots)) {
              render4Grid(data.slots);
            }
          } catch(err) {}
        };
        es.onerror = () => {
          dotStatus.style.background = '#ef4444';
          dotStatus.style.boxShadow = '0 0 10px #ef4444';
          es.close();
          setTimeout(connectFeed, 2000);
        };
      }
      connectFeed();

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

fs.writeFileSync(highlighterHtmlPath, kuyaHighlighterUI, 'utf8');
fs.writeFileSync(highlighterRootPath, kuyaHighlighterUI, 'utf8');
console.log('✓ highlighter/index.html & highlighter.html: Naging KUYA HIGHLIGHTER na!');

console.log('\n========================================================');
console.log('✓ SUCCESS! KUYA HIGHLIGHTER IS FULLY CONFIGURED.');
console.log('========================================================');