const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const highlighterDir = path.join(baseDir, 'highlighter');
const highlighterHtmlPath = path.join(highlighterDir, 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');

console.log('--- FIXING 4-SLOT EXTRACTION & ADDING REMOVE HIGHLIGHT BUTTON ---');

// =========================================================================
// 1. I-UPDATE ANG OPERATOR/INDEX.HTML (TUNAY NA 4 SEPARATE SLOTS + CLEAR LOGIC)
// =========================================================================
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  opHtml = opHtml.replace(/<script id="MASTER_OPERATOR_PROXY_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const robustOperatorBridge = `
<script id="MASTER_OPERATOR_PROXY_BRIDGE">
  (function() {
    // 1. RELAY BROADCAST TO OUTPUT DISPLAY (LAN)
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

    // 2. HANAPIN ANG TUNAY NA TOP-LEVEL 4 SLOTS (EXCLUDE CHILD ELEMENTS)
    function getOperatorTopLevelSlots() {
      // Approach A: Hanapin ayon sa kilalang ID o data-attribute
      const slotsById = [null, null, null, null];
      for (let i = 0; i < 4; i++) {
        const el = document.querySelector(\`[data-slot-id="\${i}"], [data-slot="\${i}"], [data-slot-index="\${i}"], #slot-\${i}, #slot\${i}, #slot_\${i}, [data-slot-id="\${i+1}"], [data-slot="\${i+1}"], [data-slot-index="\${i+1}"], #slot-\${i+1}, #slot\${i+1}, #slot_\${i+1}\`);
        if (el) slotsById[i] = el;
      }
      if (slotsById.every(Boolean)) return slotsById;

      // Approach B: Kolektahin ang lahat ng slot candidates
      const allCandidates = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"], .card')).filter(el => {
        const txt = (el.innerText || '').toUpperCase();
        return txt.includes('SLOT');
      });

      // PANUNTUNAN: Tanggalin ang anumang element na nasa loob na ng isa pang candidate
      const topLevel = allCandidates.filter(el => {
        return !allCandidates.some(other => other !== el && other.contains(el));
      });

      // Itugma ang bawat slot card sa Slot 1, Slot 2, Slot 3, Slot 4
      const matched = [null, null, null, null];
      topLevel.forEach(el => {
        const txt = (el.innerText || '').toUpperCase();
        for (let n = 1; n <= 4; n++) {
          if (new RegExp(\`\\\\bSLOT\\\\s*\${n}\\\\b\`).test(txt)) {
            if (!matched[n - 1]) matched[n - 1] = el;
          }
        }
      });

      // Punan kung may kulang ayon sa pagkakasunod-sunod sa DOM
      for (let n = 0; n < 4; n++) {
        if (!matched[n] && topLevel[n]) matched[n] = topLevel[n];
      }

      return matched;
    }

    // 3. KUHANIN ANG MGA SALITA AT TANGGALIN ANG BUTTONS/HEADERS
    function extractWordsFromSlot(slotEl) {
      if (!slotEl) return { words: [], highlightedIndices: [] };

      // Maghanap LAMANG sa labas ng header at controls
      const wordSpans = Array.from(slotEl.querySelectorAll('.ndi-word, span[data-word-idx], .word-span')).filter(w => {
        return w.innerText.trim() && !w.closest('.slot-header, header, [class*="header"], button, .controls');
      });

      if (wordSpans.length > 0) {
        const words = [];
        const hlIndices = [];
        wordSpans.forEach((sp, idx) => {
          words.push(sp.innerText.trim());
          if (sp.classList.contains('active-highlight') || sp.getAttribute('data-highlighted') === 'true') {
            hlIndices.push(idx);
          }
        });
        return { words, highlightedIndices: hlIndices };
      }

      // Kung walang spans, tingnan kung may nakalaang .verse-text
      const textContainer = slotEl.querySelector('.verse-text, .verse-body, .verse-content, [class*="verse-text"]');
      if (textContainer) {
        const clone = textContainer.cloneNode(true);
        clone.querySelectorAll('button, .header, .controls, .badge').forEach(e => e.remove());
        const plain = (clone.innerText || clone.textContent || '').trim();
        if (plain) {
          return { words: plain.split(/\\s+/).filter(Boolean), highlightedIndices: [] };
        }
      }

      // Kung walang talata, ibalik bilang empty (HINDI kukunin ang header o buttons)
      return { words: [], highlightedIndices: [] };
    }

    function cleanTitle(raw, slotNum) {
      if (!raw) return 'SLOT ' + slotNum;
      let c = raw.replace(/[⠿::◄►•]/g, ' ')
                 .replace(/\\bLIVE\\b/gi, '')
                 .replace(/\\bEDITING\\b/gi, '')
                 .replace(/\\s+/g, ' ')
                 .trim();
      return c || ('SLOT ' + slotNum);
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

    // 4. TANGGAPIN ANG TAP NI KUYA AT I-TRIGGER SA PC OPERATOR
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
        const action = JSON.parse(e.data);

        // A. TAP ISANG SALITA
        if (action.type === 'TAP_WORD') {
          const slots = getOperatorTopLevelSlots();
          const targetSlot = slots[action.slotIndex];
          if (targetSlot) {
            const words = Array.from(targetSlot.querySelectorAll('.ndi-word, span[data-word-idx], .word-span')).filter(w => {
              return w.innerText.trim() && !w.closest('.slot-header, header, button');
            });
            const targetWord = words[action.wordIndex];
            if (targetWord) {
              triggerWordClick(targetWord);
              setTimeout(syncFeedToKuya, 40);
            }
          }
        }

        // B. REMOVE ALL HIGHLIGHTS
        if (action.type === 'CLEAR_ALL_HIGHLIGHTS') {
          // I-click ang native clear button kung mayroon sa Operator
          const clearBtns = Array.from(document.querySelectorAll('button, .btn')).filter(b => {
            const t = (b.innerText || '').toLowerCase();
            return t.includes('clear') && (t.includes('highlight') || t.includes('hl'));
          });
          if (clearBtns.length > 0) {
            clearBtns[0].click();
          } else {
            // Unhighlight ang lahat ng active words sa Operator
            const activeWords = Array.from(document.querySelectorAll('.active-highlight, [data-highlighted="true"]'));
            activeWords.forEach(w => triggerWordClick(w));
          }

          // Sabihan ang Output Screen Projector na alisin ang highlight
          fetch('/api/output-broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'CLEAR_HIGHLIGHTS', __msgId: Date.now() + '_clear' })
          }).catch(() => {});

          setTimeout(syncFeedToKuya, 50);
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
    opHtml = opHtml.replace('</body>', robustOperatorBridge + '\n</body>');
  } else {
    opHtml += robustOperatorBridge;
  }

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Naayos ang top-level slot detection at clear highlight listener.');
}

// =========================================================================
// 2. I-UPDATE ANG KUYA HIGHLIGHTER UI (MAY REMOVE HIGHLIGHT BUTTON)
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

    /* RED/ACCENT REMOVE HIGHLIGHT BUTTON */
    .btn-clear {
      background: rgba(239, 68, 68, 0.18) !important;
      color: #fca5a5 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
      font-weight: 800 !important;
    }

    .btn-clear:active {
      background: rgba(239, 68, 68, 0.35) !important;
    }
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
      <button class="btn-kuya btn-clear" id="btnClearHighlights" title="Alisin ang lahat ng highlight">
        <span>🧹</span> Remove Highlight
      </button>
      <span style="font-size: 0.85rem; color: #64748b;">👉 I-tap ang salita para mag-highlight nang live</span>
    </div>

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
            wordsArea.innerHTML = '<span class="empty-slot-msg">Walang talata sa Slot ' + (i + 1) + '</span>';
          }

          card.appendChild(wordsArea);
          stage.appendChild(card);
        }
      }

      render4Grid([]);

      // REMOVE HIGHLIGHT BUTTON HANDLER
      document.getElementById('btnClearHighlights').addEventListener('click', () => {
        // Alisin locally
        document.querySelectorAll('.p-word.active-highlight').forEach(el => el.classList.remove('active-highlight'));

        // Ipadala sa Operator PC para i-clear ang highlight sa screen at output projector
        fetch('/api/pastor-tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'CLEAR_ALL_HIGHLIGHTS'
          })
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
console.log('✓ highlighter/index.html: Naikabit ang Remove Highlight button at malinis na 4-slot rendering.');

// =========================================================================
// 3. SIGURUHIN NA MAALIS DIN SA OUTPUT.HTML ANG HIGHLIGHT KAPAG CLINICK
// =========================================================================
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');
  if (!outHtml.includes('CLEAR_HIGHLIGHTS_LISTENER')) {
    const clearHook = `
<script id="CLEAR_HIGHLIGHTS_LISTENER">
  (function() {
    const origPost = BroadcastChannel.prototype.postMessage;
    const es = new EventSource('/api/output-stream');
    es.addEventListener('message', function(e) {
      if (!e.data) return;
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'CLEAR_HIGHLIGHTS') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          stage.querySelectorAll('.active-highlight').forEach(el => el.classList.remove('active-highlight'));
        }
      } catch(err) {}
    });
  })();
</script>
`;
    if (outHtml.includes('</head>')) {
      outHtml = outHtml.replace('</head>', clearHook + '\n</head>');
    } else {
      outHtml = clearHook + '\n' + outHtml;
    }
    fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
    console.log('✓ output/output.html: Handa na para sa Clear Highlights broadcast.');
  }
}

console.log('\n========================================================');
console.log('✓ SUCCESS! 4 SLOTS FIXED & REMOVE HIGHLIGHT ADDED.');
console.log('========================================================');