const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const highlighterHtmlPath = path.join(baseDir, 'highlighter', 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');

console.log('--- SWITCHING HIGHLIGHTER FEED SOURCE TO OPERATOR PANEL ---');

// =========================================================================
// 1. LINISIN ANG OUTPUT.HTML (TANGGALIN ANG ANUMANG FEEDER SCRIPTS)
// =========================================================================
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  // Alisin ang dating stage feeder mula sa output
  outHtml = outHtml.replace(/<script id="OUTPUT_STAGE_FEEDER">[\s\S]*?<\/script>/gi, '');

  // Tiyaking may malinis na listener para sa mga highlight taps ng pastor
  outHtml = outHtml.replace(/<script id="PASTOR_HIGHLIGHT_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const pastorHighlightReceiver = `
<script id="PASTOR_HIGHLIGHT_RECEIVER">
  (function() {
    const es = new EventSource('/api/stream');
    es.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'HIGHLIGHT_WORD' && typeof msg.slotIndex === 'number' && typeof msg.wordIndex === 'number') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          const boxes = Array.from(stage.querySelectorAll('.render-box, [id*="slot"], .slot')).filter(b => {
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
        } else if (msg.type === 'CLEAR_HIGHLIGHTS') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          stage.querySelectorAll('.active-highlight').forEach(el => el.classList.remove('active-highlight'));
        }
      } catch(err) {}
    };
  })();
</script>
`;

  if (outHtml.includes('</body>')) {
    outHtml = outHtml.replace('</body>', pastorHighlightReceiver + '\n</body>');
  } else {
    outHtml += pastorHighlightReceiver;
  }

  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ output/output.html: Nalinis at naging pure display receiver muli (0 conflict).');
}

// =========================================================================
// 2. I-INJECT ANG DIRECT PASTOR FEED SA OPERATOR/INDEX.HTML
// =========================================================================
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  opHtml = opHtml.replace(/<script id="OPERATOR_PASTOR_FEEDER">[\s\S]*?<\/script>/gi, '');

  const operatorFeeder = `
<script id="OPERATOR_PASTOR_FEEDER">
  (function() {
    let lastFeedJson = '';

    // Tukuyin ang aktibong layout at kunin ang mga talata sa Operator Workspace
    function publishFeedToPastor() {
      // 1. Hanapin ang active layout mula sa mga buttons o workspace class
      let activeLayoutCount = 1;
      const layoutBtns = Array.from(document.querySelectorAll('button, .btn, .layout-btn, [class*="layout"]'));
      const activeBtn = layoutBtns.find(b => {
        const t = (b.innerText || '').toLowerCase();
        const isSelected = b.classList.contains('active') || b.classList.contains('selected');
        return isSelected && (t.includes('split') || t.includes('grid') || t.includes('full') || t.includes('1') || t.includes('2') || t.includes('3') || t.includes('4'));
      });

      if (activeBtn) {
        const txt = activeBtn.innerText.toLowerCase();
        if (txt.includes('4') || txt.includes('grid')) activeLayoutCount = 4;
        else if (txt.includes('3')) activeLayoutCount = 3;
        else if (txt.includes('2')) activeLayoutCount = 2;
        else activeLayoutCount = 1;
      }

      // 2. Hanapin ang mga slots sa Operator UI
      const allSlots = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).filter(el => {
        return (el.innerText || '').includes('SLOT') || el.querySelector('.verse-text, p, textarea');
      });

      // Kung walang .slot-card, gamitin ang workspace children
      const effectiveSlots = allSlots.length >= 4 ? allSlots.slice(0, 4) : allSlots;
      const visibleCount = Math.max(activeLayoutCount, 1);

      const slotsPayload = [];
      effectiveSlots.slice(0, visibleCount).forEach((sEl, idx) => {
        const titleEl = sEl.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
        const textEl = sEl.querySelector('.verse-text, [class*="verse"], p');

        let rawText = '';
        if (textEl) {
          rawText = textEl.innerText || textEl.textContent || '';
        }

        const words = rawText.trim().split(/\\s+/).filter(Boolean);
        const hlIndices = [];
        if (textEl) {
          const spans = Array.from(textEl.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
          spans.forEach((sp, spIdx) => {
            if (sp.classList.contains('active-highlight')) hlIndices.push(spIdx);
          });
        }

        slotsPayload.push({
          slotIndex: idx,
          reference: titleEl ? titleEl.innerText.trim() : ('SLOT ' + (idx + 1)),
          words: words,
          highlightedIndices: hlIndices
        });
      });

      const feedData = {
        type: 'OPERATOR_PASTOR_FEED',
        layoutCount: visibleCount,
        slots: slotsPayload
      };

      const feedJson = JSON.stringify(feedData);
      if (feedJson !== lastFeedJson) {
        lastFeedJson = feedJson;
        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: feedJson
        }).catch(() => {});
      }
    }

    // Bantayan ang mga pagbabago sa Operator Panel
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(publishFeedToPastor, 500);

      // Bantayan ang clicks sa layout buttons at slots
      document.addEventListener('click', () => {
        setTimeout(publishFeedToPastor, 100);
      });

      // Bantayan ang DOM changes sa workspace
      const obs = new MutationObserver(() => {
        setTimeout(publishFeedToPastor, 150);
      });
      const root = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    });

    // Makinig kung may highlight na ginawa ang pastor mula sa tablet para makita rin ng operator
    const es = new EventSource('/api/stream');
    es.onmessage = function(e) {
      if (!e.data) return;
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'HIGHLIGHT_WORD' && typeof d.slotIndex === 'number' && typeof d.wordIndex === 'number') {
          const allSlots = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).filter(el => {
            return (el.innerText || '').includes('SLOT') || el.querySelector('.verse-text, p');
          });
          const targetSlot = allSlots[d.slotIndex];
          if (targetSlot) {
            const words = Array.from(targetSlot.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
            if (words[d.wordIndex]) {
              words[d.wordIndex].classList.toggle('active-highlight', !!d.highlight);
            }
          }
        }
      } catch(err) {}
    };
  })();
</script>
`;

  if (opHtml.includes('</body>')) {
    opHtml = opHtml.replace('</body>', operatorFeeder + '\n</body>');
  } else {
    opHtml += operatorFeeder;
  }

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Naikabit ang Direct Pastor Feed transmitter.');
}

// =========================================================================
// 3. I-UPDATE ANG HIGHLIGHTER.HTML PARA MAKINIG SA OPERATOR_PASTOR_FEED
// =========================================================================
const updatedHighlighterUI = `<!DOCTYPE html>
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

    #stageContainer {
      flex: 1;
      padding: 16px;
      display: grid;
      gap: 16px;
      overflow-y: auto;
      width: 100%;
      height: 100%;
    }

    #stageContainer.layout-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
    #stageContainer.layout-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
    #stageContainer.layout-3 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr; }
    #stageContainer.layout-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

    @media (max-width: 768px) and (orientation: portrait) {
      #stageContainer.layout-2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
      #stageContainer.layout-3 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr 1fr; }
    }

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

    #stageContainer.layout-1 .slot-words-area { font-size: clamp(1.8rem, 3.4vw, 2.7rem); }
    #stageContainer.layout-2 .slot-words-area { font-size: clamp(1.3rem, 2.3vw, 1.9rem); }
    #stageContainer.layout-3 .slot-words-area { font-size: clamp(1.1rem, 1.8vw, 1.5rem); }
    #stageContainer.layout-4 .slot-words-area { font-size: clamp(1.1rem, 1.8vw, 1.45rem); }

    .p-word {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .p-word:active { transform: scale(0.92); }

    .p-word.active-highlight {
      color: var(--gold) !important;
      text-shadow: 0 0 10px var(--gold), 0 0 20px var(--gold), 2px 2px 4px rgba(0,0,0,0.9) !important;
      background: rgba(255, 215, 0, 0.15) !important;
      border-bottom: 3px solid var(--gold);
    }

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

    .btn-pastor:active { background: #334155; }

    .btn-clear {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.3);
    }
  </style>
</head>
<body>

  <header>
    <div class="status-left">
      <div class="pulse-dot" id="dotStatus"></div>
      <span class="brand-title">PASTOR HIGHLIGHTER</span>
      <span class="layout-badge" id="layoutBadge">1 FULL</span>
    </div>
    <span style="font-size: 0.8rem; color: #94a3b8;">Operator Feed Connected</span>
  </header>

  <div id="stageContainer" class="layout-1">
    <div class="waiting-box">
      <p>⏳ Naghihintay ng Talata mula sa Operator...</p>
      <p style="font-size: 0.9rem; margin-top: 8px; color: #475569;">Pumili ng talata ang Control Room para lumitaw dito.</p>
    </div>
  </div>

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

      function renderStage(slots, layoutCount) {
        if (!Array.isArray(slots) || slots.length === 0) {
          stage.className = 'layout-1';
          layoutBadge.textContent = 'WAITING';
          stage.innerHTML = \`
            <div class="waiting-box">
              <p>⏳ Naghihintay ng Talata mula sa Operator...</p>
              <p style="font-size: 0.9rem; margin-top: 8px; color: #475569;">Pumili ng talata ang Control Room para lumitaw dito.</p>
            </div>\`;
          return;
        }

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

        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }

      document.getElementById('btnClearAll').addEventListener('click', () => {
        document.querySelectorAll('.p-word.active-highlight').forEach(el => el.classList.remove('active-highlight'));
        fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'CLEAR_HIGHLIGHTS', source: 'pastor_stage_highlighter' })
        }).catch(() => {});
      });

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

            // Tumatanggap ng feed diretso mula sa Operator Panel
            if (data.type === 'OPERATOR_PASTOR_FEED' && Array.isArray(data.slots)) {
              renderStage(data.slots, data.layoutCount);
            }

            // Sync word highlights
            if (data.type === 'HIGHLIGHT_WORD' && typeof data.slotIndex === 'number' && typeof data.wordIndex === 'number') {
              const target = stage.querySelector(\`[data-slot-idx="\${data.slotIndex}"][data-word-idx="\${data.wordIndex}"]\`);
              if (target) {
                target.classList.toggle('active-highlight', !!data.highlight);
              }
            }

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

fs.writeFileSync(highlighterHtmlPath, updatedHighlighterUI, 'utf8');
fs.writeFileSync(highlighterRootPath, updatedHighlighterUI, 'utf8');
console.log('✓ highlighter/index.html: Nakakabit na nang direkta sa Operator Feed.');

console.log('\n========================================================');
console.log('✓ SUCCESS! HIGHLIGHTER FEED SOURCE TRANSFERRED TO OPERATOR.');
console.log('========================================================');