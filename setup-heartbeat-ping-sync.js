const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- DEPLOYING 300MS HEARTBEAT PING & VERSIONED STATE ENGINE ---');

// 1. SERVER.JS: Central Master State with Versioning and Fast Polling Ping
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

// CENTRAL MASTER STATE (Single Source of Truth)
let masterState = {
  version: 1,
  slots: {},       // { slotIndex: { title: "...", verseHtml: "..." } }
  highlights: {},  // { slotIndex: [highlightedIndices...] }
  storage: {},     // key-value pairs
  lastBroadcast: null
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, 'http://localhost:' + PORT);
  const cleanUrl = urlObj.pathname;

  // HEARTBEAT PING ENDPOINT: Tinatawag ng lahat ng devices kada 300ms
  if (cleanUrl === '/api/heartbeat-ping') {
    const clientVer = parseInt(urlObj.searchParams.get('v') || '0', 10);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    if (clientVer < masterState.version) {
      // May bagong update: ipadala ang buong sariwang state
      return res.end(JSON.stringify({ hasUpdate: true, state: masterState }));
    } else {
      // Pareho pa rin: magaan na response lamang
      return res.end(JSON.stringify({ hasUpdate: false, version: masterState.version }));
    }
  }

  // ACTION ENDPOINT: Tinatawag kapag may nagpalit ng talata o nag-highlight
  if (cleanUrl === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const action = JSON.parse(body);

        if (action.type === 'UPDATE_SLOT') {
          masterState.slots[action.slotIndex] = {
            title: action.title,
            verseHtml: action.verseHtml
          };
          // I-reset ang highlights kapag nagbago ang talata sa slot na ito
          masterState.highlights[action.slotIndex] = [];
        }

        if (action.type === 'TOGGLE_WORD_HIGHLIGHT') {
          if (!masterState.highlights[action.slotIndex]) {
            masterState.highlights[action.slotIndex] = [];
          }
          const list = masterState.highlights[action.slotIndex];
          const exists = list.indexOf(action.wordIndex);
          if (exists > -1) {
            list.splice(exists, 1);
          } else {
            list.push(action.wordIndex);
          }
        }

        if (action.type === 'STORAGE_SET') {
          masterState.storage[action.key] = action.value;
        }

        if (action.type === 'BROADCAST') {
          masterState.lastBroadcast = action.payload;
        }

        // Taasan ang bersyon para malaman ng lahat ng nagpi-ping na may bagong update
        masterState.version++;

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, version: masterState.version }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(BASE_DIR, decodeURIComponent(cleanUrl === '/' ? '/operator/index.html' : cleanUrl));
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
  console.log('   ✨ 300MS HEARTBEAT PING SYNC SERVER IS ONLINE ✨');
  console.log('===========================================================');
  console.log('  > Control Room (PC):  http://localhost:' + PORT + '/operator/');
  console.log('  > Stage Tablet:       http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Output Screen:      http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js na may Heartbeat Ping engine.');

// 2. OPERATOR/INDEX.HTML: Safe Heartbeat Poller at Word Delegator
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  // Tanggalin ang mga lumang bridges
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const pingOperatorEngine = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    let currentVersion = 0;
    let isApplyingUpdate = false;

    // Helper: Hanapin ang 4 slot containers
    function getSlotNodes() {
      const all = document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]');
      if (all.length >= 4) return Array.from(all).slice(0, 4);
      return Array.from(document.querySelectorAll('.render-box')).slice(0, 4);
    }

    // A. TOAST NOTIFICATION PARA SA COLLABORATOR
    function showPingToast(msg) {
      let t = document.getElementById('PING_TOAST_ALERT');
      if (!t) {
        t = document.createElement('div');
        t.id = 'PING_TOAST_ALERT';
        t.style.cssText = 'position:fixed;top:15px;left:50%;transform:translateX(-50%);background:#0284c7;color:#fff;border:1px solid #38bdf8;box-shadow:0 10px 25px rgba(0,0,0,0.8);padding:8px 18px;border-radius:20px;font-family:sans-serif;font-size:0.85rem;font-weight:bold;z-index:999999;transition:all 0.3s ease;pointer-events:none;opacity:0;';
        document.body.appendChild(t);
      }
      t.innerHTML = '⚡ ' + msg;
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(window.__pTimer);
      window.__pTimer = setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(-10px)';
      }, 2500);
    }

    // B. NON-DESTRUCTIVE DOM UPDATE (Hindi sinisira ang click listeners)
    function applyServerState(state) {
      if (!state) return;
      isApplyingUpdate = true;
      const slots = getSlotNodes();

      // 1. Verse Updates
      if (state.slots) {
        Object.keys(state.slots).forEach(idx => {
          const slot = slots[idx];
          const data = state.slots[idx];
          if (!slot || !data) return;

          const titleEl = slot.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
          const textEl = slot.querySelector('.verse-text, p, [class*="verse"]');

          if (titleEl && data.title && titleEl.textContent !== data.title) {
            titleEl.textContent = data.title;
          }
          if (textEl && data.verseHtml && textEl.innerHTML !== data.verseHtml) {
            textEl.innerHTML = data.verseHtml;
            // Visual alert sa slot
            slot.style.transition = 'box-shadow 0.3s ease';
            slot.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.9)';
            setTimeout(() => { slot.style.boxShadow = ''; }, 1800);
            showPingToast('Naka-sync ang Verse sa Slot ' + (parseInt(idx) + 1));
          }
        });
      }

      // 2. Highlight Updates
      if (state.highlights) {
        Object.keys(state.highlights).forEach(idx => {
          const slot = slots[idx];
          if (!slot) return;
          const words = slot.querySelectorAll('.ndi-word, span');
          const activeIndices = state.highlights[idx] || [];
          words.forEach((w, wIdx) => {
            if (activeIndices.includes(wIdx)) {
              w.classList.add('active-highlight');
            } else {
              w.classList.remove('active-highlight');
            }
          });
        });
      }

      // 3. Storage Sync
      if (state.storage) {
        Object.keys(state.storage).forEach(k => {
          localStorage.setItem(k, state.storage[k]);
        });
      }

      setTimeout(() => { isApplyingUpdate = false; }, 30);
    }

    // C. 300MS HEARTBEAT PING LOOP
    async function doHeartbeatPing() {
      try {
        const res = await fetch('/api/heartbeat-ping?v=' + currentVersion);
        if (res.ok) {
          const data = await res.json();
          if (data.hasUpdate && data.state) {
            currentVersion = data.state.version;
            applyServerState(data.state);
          } else if (typeof data.version === 'number') {
            currentVersion = data.version;
          }
        }
      } catch (err) {}
      setTimeout(doHeartbeatPing, 300); // Patuloy na magpi-ping kada 300ms
    }

    // D. TAP TO HIGHLIGHT DELEGATION (Para sa Tablet at PC)
    document.addEventListener('pointerdown', function(e) {
      const word = e.target.closest('.ndi-word, span');
      if (!word || !word.innerText.trim()) return;

      const slots = getSlotNodes();
      let slotIdx = -1;
      slots.forEach((s, idx) => { if (s.contains(word)) slotIdx = idx; });
      if (slotIdx === -1) return;

      const words = Array.from(slots[slotIdx].querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
      const wordIdx = words.indexOf(word);
      if (wordIdx === -1) return;

      // Agad i-toggle sa sariling screen
      word.classList.toggle('active-highlight');

      // Ipadala sa server action
      fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TOGGLE_WORD_HIGHLIGHT',
          slotIndex: slotIdx,
          wordIndex: wordIdx
        })
      }).then(r => r.json()).then(d => {
        if (d && d.version) currentVersion = d.version;
      }).catch(() => {});
    });

    // E. DETECT VERSE CHANGES (Kapag nagpalit ng talata ang PC)
    window.addEventListener('DOMContentLoaded', () => {
      let vTimer;
      const observer = new MutationObserver(() => {
        if (isApplyingUpdate) return;
        clearTimeout(vTimer);
        vTimer = setTimeout(() => {
          const slots = getSlotNodes();
          slots.forEach((s, idx) => {
            const titleEl = s.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
            const textEl = s.querySelector('.verse-text, p, [class*="verse"]');
            if (textEl && textEl.innerHTML) {
              fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'UPDATE_SLOT',
                  slotIndex: idx,
                  title: titleEl ? titleEl.textContent : '',
                  verseHtml: textEl.innerHTML
                })
              }).then(r => r.json()).then(d => {
                if (d && d.version) currentVersion = d.version;
              }).catch(() => {});
            }
          });
        }, 100);
      });

      const root = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      observer.observe(root, { childList: true, subtree: true, characterData: true });

      // Simulan ang Heartbeat Ping Loop
      doHeartbeatPing();
    });
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + pingOperatorEngine);
  } else {
    opHtml = pingOperatorEngine + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang Heartbeat Ping engine sa operator/index.html');
}

// 3. OUTPUT/OUTPUT.HTML: Heartbeat Poller + Clean Karaoke Rendering
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  outHtml = outHtml.replace(/<script id="OUTPUT_BULLETPROOF_ENGINE_SCRIPT">[\s\S]*?<\/script>/gi, '');
  outHtml = outHtml.replace(/<script id="OUTPUT_TAP_RECEIVER">[\s\S]*?<\/script>/gi, '');
  outHtml = outHtml.replace(/<script id="LAN_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outputPingEngine = `
<script id="OUTPUT_BULLETPROOF_ENGINE_SCRIPT">
  (function() {
    let outVersion = 0;

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

    // 300MS OUTPUT PING LOOP
    async function doOutputPing() {
      try {
        const res = await fetch('/api/heartbeat-ping?v=' + outVersion);
        if (res.ok) {
          const data = await res.json();
          if (data.hasUpdate && data.state) {
            outVersion = data.state.version;

            // Sync Highlights sa Screen
            const stage = document.getElementById('multiSlotStage') || document.body;
            const boxes = stage.querySelectorAll('.render-box, [id*="slot"], .slot');

            if (data.state.highlights) {
              Object.keys(data.state.highlights).forEach(slotIdx => {
                const targetBox = boxes[slotIdx] || boxes[0];
                if (targetBox) {
                  const words = targetBox.querySelectorAll('.ndi-word, span');
                  const activeList = data.state.highlights[slotIdx] || [];
                  words.forEach((w, wIdx) => {
                    if (activeList.includes(wIdx)) {
                      w.classList.add('active-highlight');
                    } else {
                      w.classList.remove('active-highlight');
                    }
                  });
                }
              });
            }

            // Sync Hide Verse Box state kung mayroon
            if (data.state.storage && typeof data.state.storage['hideVerseBox'] !== 'undefined') {
              document.body.classList.toggle('hide-verse-box-active', data.state.storage['hideVerseBox'] === 'true');
            }
          } else if (typeof data.version === 'number') {
            outVersion = data.version;
          }
        }
      } catch (e) {}
      setTimeout(doOutputPing, 250);
    }

    doOutputPing();
  })();
</script>
`;

  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + outputPingEngine);
  } else {
    outHtml = outputPingEngine + '\n' + outHtml;
  }
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naikabit ang Heartbeat Poller sa output/output.html');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! HEARTBEAT PING ENGINE IS FULLY DEPLOYED.');
console.log('========================================================');