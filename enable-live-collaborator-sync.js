const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- DEPLOYING LIVE COLLABORATOR OPERATOR SYNC & ALERTS ---');

// 1. UPDATE SERVER.JS (CENTRAL REAL-TIME HUB WITH LATEST SNAPSHOT CACHE)
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

let latestSlotsState = null;
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

  // SSE STREAM: Real-Time Event Bus
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Ipadala agad ang pinakabagong buong kalagayan ng mga slots sa bagong bukas na Tablet
    if (latestSlotsState) {
      res.write('data: ' + JSON.stringify({ type: 'INIT_SNAPSHOT', data: latestSlotsState }) + '\\n\\n');
    }

    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // SYNC ENDPOINT: Tinatanggap ang verse updates at highlight taps
  if (cleanUrl === '/api/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        if (payload.type === 'SLOTS_MIRROR_SYNC') {
          latestSlotsState = payload.slots;
        }

        // I-broadcast sa lahat ng iba pang devices (PC, Tablet, Output)
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
  console.log('   ✨ LIVE COLLABORATOR SYNC ENGINE IS RUNNING ✨');
  console.log('===========================================================');
  console.log('  > Control Room (PC):  http://localhost:' + PORT + '/operator/');
  console.log('  > Stage Tablet:       http://' + ip + ':' + PORT + '/operator/');
  console.log('  > Output Screen:      http://' + ip + ':' + PORT + '/output/output.html');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ Naisaayos ang server.js');

// 2. INJECT COLLABORATOR OPERATOR CORE SA OPERATOR/INDEX.HTML
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const collaboratorCore = `
<script id="LAN_OPERATOR_BRIDGE">
  (function() {
    const CLIENT_ID = 'dev_' + Math.random().toString(36).substr(2, 9);
    let isApplyingRemote = false;

    // Helper: Hanapin ang 4 slot containers sa Operator Workspace
    function getSlotContainers() {
      const candidates = Array.from(document.querySelectorAll('div, section')).filter(el => {
        const txt = el.innerText || '';
        return (txt.includes('SLOT 1:') || txt.includes('SLOT 1 ')) && el.children.length >= 2;
      });
      if (candidates.length > 0) {
        const parent = candidates[0].parentElement;
        if (parent && parent.children.length >= 2) {
          return Array.from(parent.children).slice(0, 4);
        }
      }
      return Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).slice(0, 4);
    }

    // A. TOAST NOTIFICATION PARA SA COLLABORATOR
    function showCollaboratorToast(message) {
      let toast = document.getElementById('COLLABORATOR_SYNC_TOAST');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'COLLABORATOR_SYNC_TOAST';
        toast.style.cssText = 'position:fixed;top:15px;left:50%;transform:translateX(-50%);background:#0f172a;color:#ffd700;border:1px solid #eab308;box-shadow:0 10px 25px rgba(0,0,0,0.8);padding:10px 20px;border-radius:30px;font-family:sans-serif;font-size:0.88rem;font-weight:bold;z-index:999999;display:flex;align-items:center;gap:10px;transition:all 0.3s ease;pointer-events:none;opacity:0;';
        document.body.appendChild(toast);
      }
      toast.innerHTML = '<span style="font-size:1.1rem;">🔔</span> ' + message;
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
      }, 3500);
    }

    // B. TRANSMIT LOCAL CHANGES (KAPAG NAGPALIT NG TALATA SA PC)
    function broadcastLocalSlots(changedSlotIdx) {
      if (isApplyingRemote) return;
      const slots = getSlotContainers().map((el, i) => ({ index: i, html: el.innerHTML }));
      if (slots.length === 0) return;

      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: CLIENT_ID,
          type: 'SLOTS_MIRROR_SYNC',
          slots: slots,
          changedSlot: typeof changedSlotIdx === 'number' ? changedSlotIdx : null
        })
      }).catch(() => {});
    }

    // C. RECEIVE REMOTE CHANGES (KAPAG NAGBAGO ANG SCREEN MULA SA KABILANG DEVICE)
    function applyRemoteSlots(slotsData, changedSlot) {
      if (!Array.isArray(slotsData)) return;
      const currentSlots = getSlotContainers();
      isApplyingRemote = true;

      slotsData.forEach(item => {
        if (currentSlots[item.index]) {
          currentSlots[item.index].innerHTML = item.html;
        }
      });

      // Pulse visual indicator sa na-update na slot
      if (typeof changedSlot === 'number' && currentSlots[changedSlot]) {
        const target = currentSlots[changedSlot];
        target.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        target.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        target.style.borderColor = '#ffd700';
        setTimeout(() => {
          target.style.boxShadow = '';
          target.style.borderColor = '';
        }, 2000);
        showCollaboratorToast('Na-update ang Slot ' + (changedSlot + 1) + ' mula sa Control Room!');
      } else {
        showCollaboratorToast('Naka-sync ang mga Talata mula sa Control Room!');
      }

      setTimeout(() => { isApplyingRemote = false; }, 60);
    }

    // D. REAL-TIME EVENT STREAM LISTENER
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.senderId === CLIENT_ID) return;

        if (msg.type === 'INIT_SNAPSHOT' && msg.data) {
          applyRemoteSlots(msg.data, null);
        } else if (msg.type === 'SLOTS_MIRROR_SYNC' && msg.slots) {
          applyRemoteSlots(msg.slots, msg.changedSlot);
        } else if (msg.type === 'LIVE_HIGHLIGHT_TAP') {
          // I-sync ang highlight taps sa screen
          const slots = getSlotContainers();
          if (slots[msg.slotIndex]) {
            const words = slots[msg.slotIndex].querySelectorAll('.ndi-word, span');
            if (words[msg.wordIndex]) {
              words[msg.wordIndex].classList.toggle('active-highlight', msg.isHighlighted);
            }
          }
        }
      } catch(err) {}
    };

    // E. DELEGATED WORD HIGHLIGHTING PARA SA TABLET (HINDI MASISIRA KAHIT MAGPALIT NG VERSE)
    document.addEventListener('pointerdown', function(e) {
      const word = e.target.closest('.ndi-word, span');
      if (!word || !word.innerText.trim()) return;

      const slots = getSlotContainers();
      let slotIdx = -1;
      slots.forEach((s, i) => { if (s.contains(word)) slotIdx = i; });
      if (slotIdx === -1) return;

      const wordsInSlot = Array.from(slots[slotIdx].querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
      const wordIdx = wordsInSlot.indexOf(word);
      if (wordIdx === -1) return;

      // Toggle local state
      word.classList.toggle('active-highlight');
      const isNowHighlighted = word.classList.contains('active-highlight');

      // I-broadcast agad sa buong network
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: CLIENT_ID,
          type: 'LIVE_HIGHLIGHT_TAP',
          slotIndex: slotIdx,
          wordIndex: wordIdx,
          isHighlighted: isNowHighlighted
        })
      }).catch(() => {});

      // I-trigger din ang local Output BroadcastChannel
      try {
        const bc = new BroadcastChannel('bible_projection_channel');
        bc.postMessage({
          type: 'HIGHLIGHT_WORD',
          slotIndex: slotIdx,
          wordIndex: wordIdx,
          highlight: isNowHighlighted
        });
      } catch(e) {}
    });

    // F. OBSERVE LOCAL VERSE CHANGES SA PC
    window.addEventListener('DOMContentLoaded', () => {
      let debounceTimer;
      const observer = new MutationObserver((mutations) => {
        if (isApplyingRemote) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          let affectedSlot = null;
          const slots = getSlotContainers();
          mutations.forEach(m => {
            slots.forEach((s, idx) => {
              if (s.contains(m.target)) affectedSlot = idx;
            });
          });
          broadcastLocalSlots(affectedSlot);
        }, 80);
      });

      const bodyOrWorkspace = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      observer.observe(bodyOrWorkspace, { childList: true, subtree: true, characterData: true });
    });
  })();
</script>
`;

  if (opHtml.includes('<head>')) {
    opHtml = opHtml.replace('<head>', '<head>\n' + collaboratorCore);
  } else {
    opHtml = collaboratorCore + '\n' + opHtml;
  }
  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ Naikabit ang Collaborator Core sa operator/index.html');
}

// 3. I-UPDATE ANG OUTPUT/OUTPUT.HTML PARA TUMANGGAP NG LIVE_HIGHLIGHT_TAP
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');
  outHtml = outHtml.replace(/<script id="OUTPUT_TAP_RECEIVER">[\s\S]*?<\/script>/gi, '');

  const outTapReceiver = `
<script id="OUTPUT_TAP_RECEIVER">
  (function() {
    const evtSource = new EventSource('/api/events');
    evtSource.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'LIVE_HIGHLIGHT_TAP') {
          const stage = document.getElementById('multiSlotStage') || document.body;
          const renderBoxes = stage.querySelectorAll('.render-box, [id*="slot"], .slot');
          const targetBox = renderBoxes[msg.slotIndex] || renderBoxes[0];
          if (targetBox) {
            const words = targetBox.querySelectorAll('.ndi-word, span');
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

  if (outHtml.includes('</head>')) {
    outHtml = outHtml.replace('</head>', outTapReceiver + '\n</head>');
  } else {
    outHtml = outTapReceiver + '\n' + outHtml;
  }
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ Naikabit ang Output Tap Receiver sa output/output.html');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! LIVE COLLABORATOR SYNC IS NOW DEPLOYED.');
console.log('========================================================');