const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const highlighterDir = path.join(baseDir, 'highlighter');
const highlighterHtmlPath = path.join(highlighterDir, 'index.html');
const highlighterRootPath = path.join(baseDir, 'highlighter.html');

console.log('--- REPAIRING AND ISOLATING BIBLE PROJECTION ARCHITECTURE ---');

if (!fs.existsSync(highlighterDir)) {
  fs.mkdirSync(highlighterDir, { recursive: true });
}

// =========================================================================
// 1. LINISIN AT I-RESTORE ANG OUTPUT.HTML (100% CLEAN, 0 CONFLICT, 0 BARS)
// =========================================================================
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  // Alisin ang lahat ng mga nakaraang injected conflict scripts
  outHtml = outHtml.replace(/<script id="(?:UNIVERSAL_OUTPUT_LAN_RECEIVER|OUTPUT_TAP_RECEIVER|PASTOR_HIGHLIGHT_RECEIVER|OUTPUT_STAGE_FEEDER|OUTPUT_BULLETPROOF_ENGINE_SCRIPT|LAN_OUTPUT_RECEIVER)">[\s\S]*?<\/script>/gi, '');
  outHtml = outHtml.replace(/<style id="(?:OUTPUT_BULLETPROOF_ENGINE|CLEAN_REPAIRED_OUTPUT_STYLE|BULLETPROOF_ZERO_BAR_STYLE)">[\s\S]*?<\/style>/gi, '');

  const pristineOutputAddon = `
<style id="PRISTINE_ZERO_BAR_OUTPUT_STYLE">
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

  /* ZERO VERTICAL YELLOW BARS GUARANTEE */
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
  }

  /* 1. KARAOKE GLOW FONT ONLY */
  [data-hl-mode="karaoke"] .active-highlight,
  [data-hl-mode="karaoke"] span.active-highlight,
  [data-hl-mode="karaoke"] .ndi-word.active-highlight {
    background: transparent !important;
    background-color: transparent !important;
    color: var(--hl-font-color) !important;
    text-shadow: 0 0 8px var(--hl-font-color), 0 0 16px var(--hl-font-color), 2px 2px 4px rgba(0,0,0,0.95) !important;
    border: none !important;
  }

  /* 2. BOX HIGHLIGHT ROUNDED */
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

    // Makinig LAMANG sa authentic output stream (ligtas sa foreign messages)
    const es = new EventSource('/api/output-stream');
    es.onmessage = function(e) {
      if (!e.data) return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.__msgId) {
          if (seenMsgIds.has(msg.__msgId)) return;
          seenMsgIds.add(msg.__msgId);
        }

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
    outHtml = outHtml.replace('<head>', '<head>\n' + pristineOutputAddon);
  } else {
    outHtml = pristineOutputAddon + '\n' + outHtml;
  }

  outHtml = outHtml.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);
  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ output/output.html: 100% Nalinis at naihiwalay ang linya. Ligtas na sa conflict!');
}

// =========================================================================
// 2. SERVER.JS: ISOLATED DATA CHANNELS
// =========================================================================
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
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
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

// DEDICATED SEPARATE CLIENT LISTS
let outputClients = [];
let pastorFeedClients = [];
let operatorProxyClients = [];

let latestOutputMessages = {};
let latestPastorFeed = null;

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

  // ==================== CHANNEL 1: OUTPUT STREAM (EXCLUSIVELY FOR OUTPUT.HTML) ====================
  if (cleanUrl === '/api/output-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    Object.values(latestOutputMessages).forEach(m => res.write('data: ' + JSON.stringify(m) + '\\n\\n'));
    outputClients.push(res);
    req.on('close', () => { outputClients = outputClients.filter(c => c !== res); });
    return;
  }

  // Operator broadcasts official output projection commands
  if (cleanUrl === '/api/output-broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const k = data.type || ('slot_' + (data.slotIndex || 0));
        latestOutputMessages[k] = data;
        const packet = 'data: ' + JSON.stringify(data) + '\\n\\n';
        outputClients.forEach(c => c.write(packet));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ==================== CHANNEL 2: PASTOR FEED (OPERATOR -> TABLET) ====================
  if (cleanUrl === '/api/pastor-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    if (latestPastorFeed) {
      res.write('data: ' + JSON.stringify(latestPastorFeed) + '\\n\\n');
    }
    pastorFeedClients.push(res);
    req.on('close', () => { pastorFeedClients = pastorFeedClients.filter(c => c !== res); });
    return;
  }

  // Operator pushes verse text & layout to Pastor's tablet
  if (cleanUrl === '/api/pastor-feed' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        latestPastorFeed = data;
        const packet = 'data: ' + JSON.stringify(data) + '\\n\\n';
        pastorFeedClients.forEach(c => c.write(packet));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ==================== CHANNEL 3: PASTOR TAP PROXY (TABLET -> OPERATOR) ====================
  if (cleanUrl === '/api/operator-proxy-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    operatorProxyClients.push(res);
    req.on('close', () => { operatorProxyClients = operatorProxyClients.filter(c => c !== res); });
    return;
  }

  // Pastor taps word on tablet -> forwards tap to Operator to simulate click
  if (cleanUrl === '/api/pastor-tap' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const packet = 'data: ' + JSON.stringify(data) + '\\n\\n';
        operatorProxyClients.forEach(c => c.write(packet));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // STATIC FILE SERVING
  if (cleanUrl === '/') cleanUrl = '/operator/index.html';
  if (cleanUrl === '/highlighter' || cleanUrl === '/highlighter/') cleanUrl = '/highlighter/index.html';

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
  console.log('       ✨ BIBLE PROJECTION ISOLATED SYSTEM READY ✨');
  console.log('===========================================================');
  console.log('  > Control Room (PC):  http://localhost:' + PORT + '/operator/');
  console.log('  > Output Screen:      http://' + ip + ':' + PORT + '/output/output.html');
  console.log('  > Pastor Stage Panel: http://' + ip + ':' + PORT + '/highlighter/');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, serverCode, 'utf8');
console.log('✓ server.js: Handa na ang 3 isolated streaming channels.');

// =========================================================================
// 3. OPERATOR/INDEX.HTML: THE MASTER PROXY BRIDGE
// =========================================================================
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  opHtml = opHtml.replace(/<script id="OPERATOR_LAN_BROADCAST_BRIDGE">[\s\S]*?<\/script>/gi, '');
  opHtml = opHtml.replace(/<script id="OPERATOR_PASTOR_FEED">[\s\S]*?<\/script>/gi, '');
  opHtml = opHtml.replace(/<script id="MASTER_OPERATOR_PROXY_BRIDGE">[\s\S]*?<\/script>/gi, '');

  const masterOperatorBridge = `
<script id="MASTER_OPERATOR_PROXY_BRIDGE">
  (function() {
    // 1. RELAY OFFICIAL OPERATOR BROADCASTS TO OUTPUT SCREENS (LAN)
    const origPost = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function(data) {
      if (data && typeof data === 'object' && !data.__msgId) {
        data.__msgId = Date.now() + '_' + Math.random().toString(36).substr(2, 7);
      }
      origPost.apply(this, arguments);

      // Ipadala LAMANG sa Output channel
      fetch('/api/output-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => {});
    };

    // 2. SEND VERSE & LAYOUT FEED TO PASTOR'S TABLET
    let lastFeedStr = '';
    function syncFeedToPastor() {
      // Alamin ang mga visible slot cards
      const allSlots = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).filter(el => {
        return (el.innerText || '').includes('SLOT') || el.querySelector('.verse-text, p');
      });

      const visibleSlots = allSlots.filter(s => {
        const st = window.getComputedStyle(s);
        return st.display !== 'none' && st.visibility !== 'hidden' && s.offsetParent !== null;
      });

      const effectiveSlots = visibleSlots.length > 0 ? visibleSlots : allSlots.slice(0, 1);
      const layoutCount = Math.min(Math.max(effectiveSlots.length, 1), 4);

      const slotsData = [];
      effectiveSlots.slice(0, layoutCount).forEach((sEl, idx) => {
        const titleEl = sEl.querySelector('.slot-header, h3, h4, [class*="title"], [class*="header"]');
        const textEl = sEl.querySelector('.verse-text, [class*="verse"], p');
        let rawText = textEl ? (textEl.innerText || textEl.textContent || '') : '';
        const words = rawText.trim().split(/\\s+/).filter(Boolean);

        const hlList = [];
        if (textEl) {
          const spans = Array.from(textEl.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
          spans.forEach((sp, spIdx) => {
            if (sp.classList.contains('active-highlight')) hlList.push(spIdx);
          });
        }

        slotsData.push({
          slotIndex: idx,
          reference: titleEl ? titleEl.innerText.trim() : ('SLOT ' + (idx + 1)),
          words: words,
          highlightedIndices: hlList
        });
      });

      const payload = { layoutCount: layoutCount, slots: slotsData };
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

    // 3. LISTEN TO PASTOR'S TABLET TAPS & SIMULATE REAL WORD CLICK ON OPERATOR SCREEN
    function triggerRealClick(element) {
      if (!element) return;
      ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(evtName => {
        const ev = new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(ev);
      });
    }

    const proxyES = new EventSource('/api/operator-proxy-stream');
    proxyES.onmessage = function(e) {
      if (!e.data) return;
      try {
        const tap = JSON.parse(e.data);
        if (tap.type === 'TAP_WORD') {
          const allSlots = Array.from(document.querySelectorAll('.slot-card, [id*="slot"], [class*="slot"]')).filter(el => {
            return (el.innerText || '').includes('SLOT') || el.querySelector('.verse-text, p');
          });
          const targetSlot = allSlots[tap.slotIndex] || allSlots[0];
          if (targetSlot) {
            const words = Array.from(targetSlot.querySelectorAll('.ndi-word, span')).filter(w => w.innerText.trim());
            const targetWord = words[tap.wordIndex];
            if (targetWord) {
              triggerRealClick(targetWord);
              setTimeout(syncFeedToPastor, 50);
            }
          }
        }
      } catch(err) {}
    };

    // Auto-update feed when operator clicks or types
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(syncFeedToPastor, 400);
      document.addEventListener('click', () => { setTimeout(syncFeedToPastor, 80); });
      const root = document.querySelector('.workspace, #workspace, .main-content') || document.body;
      const obs = new MutationObserver(() => { setTimeout(syncFeedToPastor, 100); });
      obs.observe(root, { childList: true, subtree: true, characterData: true });
    });
  })();
</script>
`;

  if (opHtml.includes('</body>')) {
    opHtml = opHtml.replace('</body>', masterOperatorBridge + '\n</body>');
  } else {
    opHtml += masterOperatorBridge;
  }

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Naikabit ang Master Proxy Bridge.');
}

// =========================================================================
// 4. HIGHLIGHTER/INDEX.HTML: CLEAN PASTOR STAGE INTERFACE
// =========================================================================
const pastorHighlighterUI = `<!DOCTYPE html>
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
  </style>
</head>
<body>

  <header>
    <div class="status-left">
      <div class="pulse-dot" id="dotStatus"></div>
      <span class="brand-title">PASTOR HIGHLIGHTER</span>
      <span class="layout-badge" id="layoutBadge">1 FULL</span>
    </div>
    <span style="font-size: 0.8rem; color: #94a3b8;">Operator Feed Linked</span>
  </header>

  <div id="stageContainer" class="layout-1">
    <div class="waiting-box">
      <p>⏳ Naghihintay ng Talata mula sa Operator...</p>
      <p style="font-size: 0.9rem; margin-top: 8px; color: #475569;">Pumili ng talata ang Control Room para lumitaw dito.</p>
    </div>
  </div>

  <footer>
    <span style="font-size: 0.85rem; color: #64748b;">👉 I-tap ang salita para mag-highlight nang live</span>
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

            // Zero-latency local tap + forward to Operator PC
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

          card.appendChild(wordsArea);
          stage.appendChild(card);
        });
      }

      // Connect ONLY to pastor feed
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
              renderStage(data.slots, data.layoutCount);
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

fs.writeFileSync(highlighterHtmlPath, pastorHighlighterUI, 'utf8');
fs.writeFileSync(highlighterRootPath, pastorHighlighterUI, 'utf8');
console.log('✓ highlighter/index.html: Handa na ang malinis na Pastor interface.');

console.log('\n========================================================');
console.log('✓ SUCCESS! THE SYSTEM IS FULLY REPAIRED AND ISOLATED.');
console.log('========================================================');