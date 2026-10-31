const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- REPAIRING PC CONTROLS, OUTPUT SCREEN, AND TABLET SYNC ---');

// 1. UPDATE SERVER.JS (CENTRAL REAL-TIME RELAY HUB)
const serverCode = `const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3300;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

let masterStorage = {};
let latestVerseState = {};
let sseClients = [];

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  let cleanUrl = req.url.split('?')[0];

  // SSE STREAM: Real-Time Event Hub
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Ipadala agad ang kasalukuyang state sa bagong bukas na device
    res.write('data: ' + JSON.stringify({
      type: 'INIT_STATE',
      storage: masterStorage,
      verses: latestVerseState
    }) + '\\n\\n');

    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // SYNC ENDPOINT: Tanggapin mula sa PC o Tablet at i-broadcast sa lahat
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        if (payload.type === 'STORAGE_EVENT' && payload.key) {
          masterStorage[payload.key] = payload.value;
        }
        if (payload.type === 'VERSE_MIRROR' && typeof payload.slotIndex === 'number') {
          latestVerseState[payload.slotIndex] = payload;
        }

        const msg = 'data: ' + JSON.stringify(payload) + '\\n\\n';
        sseClients.forEach(c => c.write(msg));

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (cleanUrl === '/') cleanUrl = '/operator/index.html';
  let filePath = path.join(BASE_DIR, decodeURIComponent(cleanUrl));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('===========================================================');
  console.log('   ✨ BIBLE PROJECTION CENTRAL RELAY SERVER ACTIVE ✨');
  console.log('===========================================================');
  console.log('  > Control Room (PC):  http://localhost:' + PORT + '/operator/');
  console.log('  > Stage Tablet:       http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Output Screen:      http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js');

// 2. I-UPDATE ANG OPERATOR/INDEX.HTML (NON-DESTRUCTIVE EVENT BRIDGE)
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const opSafeBridge = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    const CLIENT_ID = 'dev_' + Math.random().toString(36).substr(2, 9);
    let isApplyingRemote = false;

    // Helper: Hanapin ang mga slot cards
    function getSlots() {
      const allCards = document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]');
      if (allCards.length >= 4) return Array.from(allCards).slice(0, 4);
      return Array.from(document.querySelectorAll('.render-box')).slice(0, 4);
    }

    // A. TOAST NOTIFICATION
    function showSyncToast(text) {
      let t = document.getElementById('SYNC_TOAST_ALERT');
      if (!t) {
        t = document.createElement('div');
        t.id = 'SYNC_TOAST_ALERT';
        t.style.cssText = 'position:fixed;top:15px;left:50%;transform:translateX(-50%);background:#0f172a;color:#ffd700;border:1px solid #eab308;box-shadow:0 10px 25px rgba(0,0,0,0.8);padding:8px 18px;border-radius:20px;font-family:sans-serif;font-size:0.85rem;font-weight:bold;z-index:999999;transition:all 0.3s ease;pointer-events:none;opacity:0;';
        document.body.appendChild(t);
      }
      t.innerHTML = '🔔 ' + text;
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(window.__tTimer);
      window.__tTimer = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(-10px)';
      }, 3000);
    }

    // B. HOOK SA BROADCASTCHANNEL AT STORAGE (PARA SA VERSE SELECTION AT OUTPUT)
    const origPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      origPost.apply(this, arguments);
      if (isApplyingRemote) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'BROADCAST_EVENT', channel: this.name, payload: data })
      }).catch(() => {});
    };

    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      origSetItem.apply(this, arguments);
      if (isApplyingRemote) return;
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: CLIENT_ID, type: 'STORAGE_EVENT', key: key, value: String(value) })
      }).catch(() => {});
    };

    // C. REAL-TIME EVENT LISTENER MULA SA SERVER
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.senderId === CLIENT_ID) return;

        isApplyingRemote = true;

        // Init State
        if (msg.type === 'INIT_STATE') {
          if (msg.storage) {
            Object.keys(msg.storage).forEach(k => localStorage.setItem(k, msg.storage[k]));
          }
          if (msg.verses) {
            Object.keys(msg.verses).forEach(slotIdx => applyVerseText(msg.verses[slotIdx], false));
          }
        }

        // Storage Event Sync
        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        // Broadcast Channel Message Sync
        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const ch = new BroadcastChannel(msg.channel || 'bible_projection_channel');
          ch.postMessage(msg.payload);
        }

        // Verse Text Sync (Hindi sinisira ang slot buttons)
        if (msg.type === 'VERSE_MIRROR') {
          applyVerseText(msg, true);
        }

        // Highlight Sync
        if (msg.type === 'HIGHLIGHT_TAP') {
          applyHighlightTap(msg.slotIndex, msg.wordIndex, msg.isHighlighted);
        }

        setTimeout(() => { isApplyingRemote = false; }, 40);
      } catch(err) {
        isApplyingRemote = false;
      }
    };

    // D. NON-DESTRUCTIVE VERSE UPDATE (Ligtas: Teksto lamang ang pinapalitan)
    function applyVerseText(data, showAlert) {
      if (!data || typeof data.slotIndex !== 'number') return;
      const slots = getSlots();
      const slot = slots[data.slotIndex];
      if (!slot) return;

      const titleEl = slot.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
      const textEl = slot.querySelector('.verse-text, p, [class*="verse"]');

      if (titleEl && data.titleText) {
        titleEl.textContent = data.titleText;
      }
      if (textEl && data.verseHtml) {
        textEl.innerHTML = data.verseHtml;
      }

      if (showAlert) {
        slot.style.transition = 'box-shadow 0.3s ease';
        slot.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        setTimeout(() => { slot.style.boxShadow = ''; }, 2000);
        showSyncToast('Na-update ang Slot ' + (data.slotIndex + 1));
      }
    }

    // E. NON-DESTRUCTIVE HIGHLIGHT SYNC
    function applyHighlightTap(slotIdx, wordIdx, isHighlighted) {
      const slots = getSlots();
      const slot = slots[slotIdx];
      if (!slot) return;
      const words = slot.querySelectorAll('.ndi-word, span');
      if (words[wordIdx]) {
        words[wordIdx].classList.toggle('active-highlight', isHighlighted);
      }
    }

    // F. REAL-TIME HIGHLIGHT TAP EVENT (Tablet & PC)
    document.addEventListener('click', function(e) {
      const word = e.target.closest('.ndi-word, span');
      if (!word || !word.innerText.trim()) return;

      const slots = getSlots();
      let slotIdx = -1;
      slots.forEach((s, idx) => { if (s.contains(word)) slotIdx = idx; });
      if (slotIdx === -1) return;

      const words = Array.from(slots[slotIdx].querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
      const wordIdx = words.indexOf(word);
      if (wordIdx === -1) return;

      word.classList.toggle('active-highlight');
      const isNowHl = word.classList.contains('active-highlight');

      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: CLIENT_ID,
          type: 'HIGHLIGHT_TAP',
          slotIndex: slotIdx,
          wordIndex: wordIdx,
          isHighlighted: isNowHl
        })
      }).catch(() => {});
    });

    // G. OBSERVE VERSE CHANGE (Mula sa PC) AT I-BROADCAST
    window.addEventListener('DOMContentLoaded', () => {
      let timer;
      const observer = new MutationObserver(() => {
        if (isApplyingRemote) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const slots = getSlots();
          slots.forEach((s, idx) => {
            const titleEl = s.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
            const textEl = s.querySelector('.verse-text, p, [class*="verse"]');
            if (textEl && textEl.innerHTML) {
              fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  senderId: CLIENT_ID,
                  type: 'VERSE_MIRROR',
                  slotIndex: idx,
                  titleText: titleEl ? titleEl.textContent : '',
                  verseHtml: textEl.innerHTML
                })
              }).catch(() => {});
            }
          });
        }, 80);
      });

      const root = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    });
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + opSafeBridge);
  } else {
    opHtml = opSafeBridge + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naisaayos ang operator/index.html (Ligtas ang PC controls)');
}

// 3. I-REPAIR ANG OUTPUT/OUTPUT.HTML (RELIABLE BROADCAST & ZERO-BARS)
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang mga sirang script at style tags
  outHtml = outHtml.replace(/<script id="OUTPUT_TAP_RECEIVER">[\s\S]*?<\/script>/gi, '');
  outHtml = outHtml.replace(/<script id="LAN_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');
  outHtml = outHtml.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
  outHtml = outHtml.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

  const completeOutputEngine = `
<style id="OUTPUT_BULLETPROOF_ENGINE">
  :root {
    --hl-font-color: #ffd700;
    --hl-box-rgba: rgba(255, 215, 0, 0.85);
    --hl-corner-radius: 6px;
  }

  /* Smooth Hide/Unhide Transition */
  #multiSlotStage, .render-box {
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  body.hide-verse-box-active #multiSlotStage,
  body.hide-verse-box-active .render-box {
    opacity: 0 !important;
    transform: scale(0.96) translateY(10px) !important;
    pointer-events: none !important;
  }

  /* 1. ZERO VERTICAL BARS AT ULTRA SPECIFICITY */
  html body #multiSlotStage .render-box .verse-text span,
  html body #multiSlotStage .render-box .verse-text [class*="highlight"],
  html body #multiSlotStage .render-box .verse-text [class*="ndi"],
  html body [class*="highlight"] {
    border: none !important;
    border-left: none !important;
    border-right: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  html body [class*="highlight"]::before,
  html body [class*="highlight"]::after {
    display: none !important;
    content: none !important;
    border: none !important;
  }

  /* 2. KARAOKE GLOW MODE (Font Only) */
  [data-hl-mode="karaoke"] .active-highlight,
  [data-hl-mode="karaoke"] span.active-highlight,
  [data-hl-mode="karaoke"] .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    color: var(--hl-font-color) !important;
    text-shadow: 0 0 8px var(--hl-font-color), 0 0 16px var(--hl-font-color), 2px 2px 4px rgba(0,0,0,0.95) !important;
    border: none !important;
  }

  /* 3. BOX HIGHLIGHT MODE (Rounded) */
  [data-hl-mode="box"] .active-highlight {
    background-color: var(--hl-box-rgba) !important;
    color: #ffffff !important;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.9) !important;
    border-radius: 0px !important;
  }
  [data-hl-mode="box"] .active-highlight.highlight-start,
  [data-hl-mode="box"] .ndi-word.active-highlight:first-child {
    border-top-left-radius: var(--hl-corner-radius) !important;
    border-bottom-left-radius: var(--hl-corner-radius) !important;
  }
  [data-hl-mode="box"] .active-highlight.highlight-end,
  [data-hl-mode="box"] .ndi-word.active-highlight:last-child {
    border-top-right-radius: var(--hl-corner-radius) !important;
    border-bottom-right-radius: var(--hl-corner-radius) !important;
  }

  .ndi-word, .ndi-space, span {
    color: #ffffff;
    text-shadow: 2px 2px 5px rgba(0,0,0,0.9) !important;
  }
  .ndi-space { background: transparent !important; border: none !important; }
</style>

<script id="OUTPUT_BULLETPROOF_ENGINE_SCRIPT">
  (function() {
    function hexToRgba(hex, alpha) {
      let c = (hex || '#ffd700').replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return 'rgba(' + ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255) + ',' + alpha + ')';
    }

    function applyConfig(mode, fCol, bCol, op, rad) {
      document.documentElement.setAttribute('data-hl-mode', mode || 'karaoke');
      document.documentElement.style.setProperty('--hl-font-color', fCol || '#ffd700');
      document.documentElement.style.setProperty('--hl-box-rgba', hexToRgba(bCol || '#ffd700', op || 0.85));
      document.documentElement.style.setProperty('--hl-corner-radius', (rad || 6) + 'px');
    }

    const savedMode = localStorage.getItem('hl_preset_mode') || 'karaoke';
    const savedFont = localStorage.getItem('hl_font_color') || '#ffd700';
    const savedBox = localStorage.getItem('hl_box_color') || '#ffd700';
    const savedOp = localStorage.getItem('hl_box_opacity') || 0.85;
    const savedRad = localStorage.getItem('hl_corner_radius') || 6;
    applyConfig(savedMode, savedFont, savedBox, savedOp, savedRad);

    // CENTRAL SSE LISTENER PARA SA OUTPUT SCREEN
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);

        // 1. I-forward sa native BroadcastChannel ng output.js para magpalit ng talata
        if (msg.type === 'BROADCAST_EVENT' && msg.payload) {
          const ch = new BroadcastChannel(msg.channel || 'bible_projection_channel');
          ch.postMessage(msg.payload);
        }

        // 2. Storage event
        if (msg.type === 'STORAGE_EVENT') {
          localStorage.setItem(msg.key, msg.value);
          window.dispatchEvent(new StorageEvent('storage', {
            key: msg.key,
            newValue: msg.value,
            storageArea: localStorage,
            url: window.location.href
          }));
        }

        // 3. Highlight tap
        if (msg.type === 'HIGHLIGHT_TAP') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          const renderBoxes = stage.querySelectorAll('.render-box, [id*="slot"], .slot');
          const box = renderBoxes[msg.slotIndex] || renderBoxes[0];
          if (box) {
            const words = box.querySelectorAll('.ndi-word, span');
            if (words[msg.wordIndex]) {
              words[msg.wordIndex].classList.toggle('active-highlight', msg.isHighlighted);
            }
          }
        }
      } catch(err) {}
    };
  })();
</script>
`;

  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + completeOutputEngine);
  } else {
    outHtml = completeOutputEngine + '\n' + outHtml;
  }

  outHtml = outHtml.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naisaayos ang output/output.html (Buo at gumagana na ang Output)');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! REPAIRED PC CONTROLS, OUTPUT SCREEN, & TABLET SYNC.');
console.log('========================================================');