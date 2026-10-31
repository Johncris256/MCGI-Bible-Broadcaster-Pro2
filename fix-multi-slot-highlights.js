const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const highlighterHtmlPath = path.join(baseDir, 'highlighter', 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');

console.log('--- ENABLING INDEPENDENT MULTI-SLOT HIGHLIGHTING ---');

// =========================================================================
// 1. I-UPDATE ANG OUTPUT/OUTPUT.HTML (INDEPENDENT MULTI-SLOT HIGHLIGHTS)
// =========================================================================
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  outHtml = outHtml.replace(/<script id="(?:PRISTINE_LAN_OUTPUT_RECEIVER|CLEAR_HIGHLIGHTS_LISTENER|UNIVERSAL_OUTPUT_LAN_RECEIVER)">[\s\S]*?<\/script>/gi, '');

  const multiSlotOutputReceiver = `
<script id="PRISTINE_LAN_OUTPUT_RECEIVER">
  (function() {
    const registeredChannels = new Set();
    const seenMsgIds = new Set();

    const OrigBC = window.BroadcastChannel;
    window.BroadcastChannel = function(name) {
      const instance = new OrigBC(name);
      registeredChannels.add(instance);
      instance.addEventListener('message', function(ev) {
        if (ev.data && ev.data.__msgId) seenMsgIds.add(ev.data.__msgId);
      });
      return instance;
    };
    window.BroadcastChannel.prototype = OrigBC.prototype;

    const es = new EventSource('/api/output-stream');
    es.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.__msgId) {
          if (seenMsgIds.has(msg.__msgId)) return;
          seenMsgIds.add(msg.__msgId);
        }

        // A. INDEPENDENT HIGHLIGHT SA PARTIKULAR NA SLOT LANG (HINDI GAGALAWIN ANG IBANG SLOT)
        if (msg.type === 'SET_SLOT_HIGHLIGHT') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          const boxes = Array.from(stage.querySelectorAll('.render-box, [id*="slot"], [class*="slot"]')).filter(b => {
            const s = window.getComputedStyle(b);
            return s.display !== 'none' && s.opacity !== '0';
          });
          const targetBox = boxes[msg.slotIndex];
          if (targetBox) {
            const words = Array.from(targetBox.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
            if (words[msg.wordIndex]) {
              words[msg.wordIndex].classList.toggle('active-highlight', !!msg.isHighlighted);
            }
          }
          return; // HINDI ipapasa sa output.js para hindi mag-conflict
        }

        // B. REMOVE ALL HIGHLIGHTS (TEXT MANANATILING BUO)
        if (msg.type === 'CLEAR_ALL_HIGHLIGHTS' || msg.type === 'CLEAR_HIGHLIGHTS') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          stage.querySelectorAll('.active-highlight').forEach(el => {
            el.classList.remove('active-highlight');
            el.removeAttribute('data-highlighted');
          });
          return;
        }

        // Regular Verse Projection Messages
        registeredChannels.forEach(ch => {
          const ev = new MessageEvent('message', { data: msg });
          if (typeof ch.onmessage === 'function') {
            try { ch.onmessage(ev); } catch(err) {}
          }
          try { ch.dispatchEvent(ev); } catch(err) {}
        });
      } catch(err) {}
    };
  })();
</script>
`;

  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + multiSlotOutputReceiver);
  } else {
    outHtml = multiSlotOutputReceiver + '\n' + outHtml;
  }

  outHtml = outHtml.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ output/output.html: Handa na para sa independent multi-slot highlighting.');
}

// =========================================================================
// 2. I-UPDATE ANG OPERATOR/INDEX.HTML (PREVIEW FEED WITHOUT DESTRUCTIVE CLICKS)
// =========================================================================
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="MASTER_OPERATOR_PROXY_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const operatorBridge = `
<script id="MASTER_OPERATOR_PROXY_BRIDGE">
  (function() {
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

    function getOperatorTopLevelSlots() {
      const slotsById = [null, null, null, null];
      for (let i = 0; i < 4; i++) {
        const el = document.querySelector(\`[data-slot-id="\${i}"], [data-slot="\${i}"], [data-slot-index="\${i}"], #slot-\${i}, #slot\${i}, #slot_\${i}, [data-slot-id="\${i+1}"], [data-slot="\${i+1}"], [data-slot-index="\${i+1}"], #slot-\${i+1}, #slot\${i+1}, #slot_\${i+1}\`);
        if (el) slotsById[i] = el;
      }
      if (slotsById.every(Boolean)) return slotsById;

      const allCandidates = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"], .card')).filter(el => {
        return (el.innerText || '').toUpperCase().includes('SLOT');
      });

      const topLevel = allCandidates.filter(el => {
        return !allCandidates.some(other => other !== el && other.contains(el));
      });

      const matched = [null, null, null, null];
      topLevel.forEach(el => {
        const txt = (el.innerText || '').toUpperCase();
        for (let n = 1; n <= 4; n++) {
          if (new RegExp(\`\\\\bSLOT\\\\s*\${n}\\\\b\`).test(txt)) {
            if (!matched[n - 1]) matched[n - 1] = el;
          }
        }
      });

      for (let n = 0; n < 4; n++) {
        if (!matched[n] && topLevel[n]) matched[n] = topLevel[n];
      }
      return matched;
    }

    function extractWordsFromSlot(slotEl) {
      if (!slotEl) return { words: [] };

      const wordSpans = Array.from(slotEl.querySelectorAll('.ndi-word, span[data-word-idx], .word-span')).filter(w => {
        return w.innerText.trim() && !w.closest('.slot-header, header, [class*="header"], button, .controls');
      });

      if (wordSpans.length > 0) {
        return { words: wordSpans.map(sp => sp.innerText.trim()) };
      }

      const textContainer = slotEl.querySelector('.verse-text, .verse-body, .verse-content, [class*="verse-text"]');
      if (textContainer) {
        const clone = textContainer.cloneNode(true);
        clone.querySelectorAll('button, .header, .controls, .badge').forEach(e => e.remove());
        const plain = (clone.innerText || clone.textContent || '').trim();
        if (plain) return { words: plain.split(/\\s+/).filter(Boolean) };
      }

      return { words: [] };
    }

    function cleanTitle(raw, slotNum) {
      if (!raw) return 'SLOT ' + slotNum;
      return raw.replace(/[⠿::◄►•]/g, ' ')
                .replace(/\\bLIVE\\b/gi, '')
                .replace(/\\bEDITING\\b/gi, '')
                .replace(/\\s+/g, ' ')
                .trim() || ('SLOT ' + slotNum);
    }

    let lastFeedStr = '';
    function syncFeedToKuya() {
      const slots = getOperatorTopLevelSlots();
      const slotsData = [];

      for (let i = 0; i < 4; i++) {
        const sEl = slots[i];
        if (sEl) {
          const titleEl = sEl.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
          const rawTitle = titleEl ? titleEl.innerText : ('SLOT ' + (i + 1));
          const extracted = extractWordsFromSlot(sEl);

          slotsData.push({
            slotIndex: i,
            reference: cleanTitle(rawTitle, i + 1),
            words: extracted.words
          });
        } else {
          slotsData.push({
            slotIndex: i,
            reference: 'SLOT ' + (i + 1),
            words: []
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

    // Makinig sa highlight taps ni Kuya para makita rin sa PC Operator screen nang HINDI pini-trigger ang mapanirang click
    const proxyES = new EventSource('/api/operator-proxy-stream');
    proxyES.onmessage = function(e) {
      if (!e.data) return;
      try {
        const action = JSON.parse(e.data);
        if (action.type === 'SET_SLOT_HIGHLIGHT') {
          const slots = getOperatorTopLevelSlots();
          const targetSlot = slots[action.slotIndex];
          if (targetSlot) {
            const words = Array.from(targetSlot.querySelectorAll('.ndi-word, span[data-word-idx], .word-span')).filter(w => {
              return w.innerText.trim() && !w.closest('.slot-header, header, button');
            });
            if (words[action.wordIndex]) {
              words[action.wordIndex].classList.toggle('active-highlight', !!action.isHighlighted);
            }
          }
        }
        if (action.type === 'CLEAR_ALL_HIGHLIGHTS') {
          const slots = getOperatorTopLevelSlots();
          slots.forEach(s => {
            if (s) s.querySelectorAll('.active-highlight').forEach(w => w.classList.remove('active-highlight'));
          });
        }
      } catch(err) {}
    };

    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(syncFeedToKuya, 300);
      setInterval(syncFeedToKuya, 1000);
      document.addEventListener('click', () => { setTimeout(syncFeedToKuya, 80); });
      const root = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      const obs = new MutationObserver(() => { setTimeout(syncFeedToKuya, 100); });
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    });
  })();
</script>
`;

  if (opHtml.includes('</body>')) {
    opHtml = opHtml.replace('</body>', operatorBridge + '\n</body>');
  } else {
    opHtml += operatorBridge;
  }

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Na-update ang non-destructive visual bridge.');
}

// =========================================================================
// 3. I-UPDATE ANG KUYA HIGHLIGHTER (INDEPENDENT MULTI-SLOT MEMORY + SMART DIFF)
// =========================================================================
const kuyaUI = `<!DOCTYPE html>
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

    .p-word {
      display: inline-block;
      padding: 4px 9px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.1s ease;
      background: rgba(255, 255, 255, 0.03);
    }

    .p-word:active { transform: scale(0.92); }

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

    footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 14px;
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
      transition: all 0.15s ease;
    }

    .btn-kuya:active { transform: scale(0.95); background: #334155; }

    .btn-clear {
      background: rgba(239, 68, 68, 0.18) !important;
      color: #fca5a5 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
      font-weight: 800 !important;
    }

    .btn-clear:active { background: rgba(239, 68, 68, 0.35) !important; }
  </style>
</head>
<body>

  <header>
    <div class="status-left">
      <div class="pulse-dot" id="dotStatus"></div>
      <span class="brand-title">KUYA HIGHLIGHTER</span>
      <span class="layout-badge">4 GRID</span>
    </div>
    <span style="font-size: 0.8rem; color: #94a3b8;">Operator Feed Linked</span>
  </header>

  <div id="stageContainer"></div>

  <footer>
    <div class="footer-left">
      <button class="btn-kuya btn-clear" id="btnClearHighlights" title="Alisin ang highlight lamang">
        <span>🧹</span> Remove Highlight
      </button>
      <span style="font-size: 0.85rem; color: #64748b;">👉 I-tap ang salita para mag-highlight nang sabay</span>
    </div>

    <button class="btn-kuya" id="btnFullscreen">
      <span>⛶</span> Fullscreen
    </button>
  </footer>

  <script>
    (function() {
      const stage = document.getElementById('stageContainer');
      const dotStatus = document.getElementById('dotStatus');

      // HIWALAY NA MEMORY BAWAT SLOT (HINDI MAGBUBURAHAN)
      const slotHighlights = {
        0: new Set(),
        1: new Set(),
        2: new Set(),
        3: new Set()
      };

      const lastSlotFingerprints = ['', '', '', ''];

      function render4Grid(slots) {
        for (let i = 0; i < 4; i++) {
          const slotData = (slots && slots[i]) ? slots[i] : { slotIndex: i, reference: 'SLOT ' + (i + 1), words: [] };
          const wordsArr = Array.isArray(slotData.words) ? slotData.words : [];
          const fingerprint = (slotData.reference || '') + ':::' + wordsArr.join(' ');

          let card = stage.querySelector(\`.kuya-slot-card[data-slot-index="\${i}"]\`);
          if (!card) {
            card = document.createElement('div');
            card.className = 'kuya-slot-card';
            card.dataset.slotIndex = i;
            stage.appendChild(card);
          }

          // SMART DIFFING: I-render lang muli kung TALAGANG NAGBAGO ang mga salita o talata
          if (lastSlotFingerprints[i] !== fingerprint) {
            lastSlotFingerprints[i] = fingerprint;
            slotHighlights[i].clear(); // I-clear lamang ang highlight ng slot na nagbago ang talata

            card.innerHTML = \`
              <div class="slot-ref-header">
                <span>\${slotData.reference || ('SLOT ' + (i + 1))}</span>
                <span style="font-size:0.75rem; color:#64748b;">Slot \${i + 1}</span>
              </div>
              <div class="slot-words-area"></div>
            \`;

            const wordsArea = card.querySelector('.slot-words-area');
            if (wordsArr.length > 0) {
              wordsArr.forEach((w, wIdx) => {
                const span = document.createElement('span');
                span.className = 'p-word' + (slotHighlights[i].has(wIdx) ? ' active-highlight' : '');
                span.textContent = w;
                span.dataset.slotIdx = i;
                span.dataset.wordIdx = wIdx;

                span.addEventListener('pointerdown', (e) => {
                  e.preventDefault();

                  // INDEPENDENT TOGGLE
                  const isNowHl = !slotHighlights[i].has(wIdx);
                  if (isNowHl) {
                    slotHighlights[i].add(wIdx);
                    span.classList.add('active-highlight');
                  } else {
                    slotHighlights[i].delete(wIdx);
                    span.classList.remove('active-highlight');
                  }

                  const payload = {
                    type: 'SET_SLOT_HIGHLIGHT',
                    slotIndex: i,
                    wordIndex: wIdx,
                    isHighlighted: isNowHl
                  };

                  // 1. Diretso sa Projector Output
                  fetch('/api/output-broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  }).catch(() => {});

                  // 2. Diretso sa PC Operator preview
                  fetch('/api/pastor-tap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  }).catch(() => {});
                });

                wordsArea.appendChild(span);
              });
            } else {
              wordsArea.innerHTML = \`<span class="empty-slot-msg">Walang talata sa Slot \${i + 1}</span>\`;
            }
          } else {
            // Walang binagong talata: I-update lamang ang active classes
            const spans = card.querySelectorAll('.p-word');
            spans.forEach((sp, idx) => {
              sp.classList.toggle('active-highlight', slotHighlights[i].has(idx));
            });
          }
        }
      }

      render4Grid([]);

      // REMOVE HIGHLIGHT PARA SA LAHAT NG SLOTS
      document.getElementById('btnClearHighlights').addEventListener('click', () => {
        for (let i = 0; i < 4; i++) {
          slotHighlights[i].clear();
        }
        document.querySelectorAll('.p-word.active-highlight').forEach(el => el.classList.remove('active-highlight'));

        const payload = { type: 'CLEAR_ALL_HIGHLIGHTS' };

        fetch('/api/output-broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});

        fetch('/api/pastor-tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      });

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

fs.writeFileSync(highlighterHtmlPath, kuyaUI, 'utf8');
fs.writeFileSync(highlighterRootPath, kuyaUI, 'utf8');
console.log('✓ highlighter/index.html & highlighter.html: Na-update ang Independent Multi-Slot Memory.');

console.log('\n========================================================');
console.log('✓ SUCCESS! MULTI-SLOT HIGHLIGHT PERSISTENCE IS NOW DEPLOYED.');
console.log('========================================================');