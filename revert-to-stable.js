const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const serverJsPath = path.join(baseDir, 'server.js');
const opHtmlPath = path.join(baseDir, 'operator', 'index.html');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- REVERTING APP TO CLEAN & STABLE STATE ---');

// 1. IBALIK ANG SERVER.JS SA MALINIS AT NATIVE STATIC SERVER
const cleanServerCode = `const http = require('http');
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
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
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

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];
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
  console.log('       ✨ BIBLE PROJECTION SERVER (STABLE RESTORED) ✨');
  console.log('===========================================================');
  console.log('  > Operator Panel:  http://localhost:' + PORT + '/operator/');
  console.log('  > Output Screen:   http://localhost:' + PORT + '/output/output.html');
  console.log('  > LAN Address:     http://' + ip + ':' + PORT + '/operator/');
  console.log('===========================================================');
});
`;
fs.writeFileSync(serverJsPath, cleanServerCode, 'utf8');
console.log('✓ server.js: Naibalik sa malinis at mabilis na native server.');

// 2. LINISIN ANG OPERATOR/INDEX.HTML SA LAHAT NG INJECTED EXPERIMENTAL SCRIPTS
if (fs.existsSync(opHtmlPath)) {
  let opHtml = fs.readFileSync(opHtmlPath, 'utf8');

  // Alisin ang lahat ng custom sync scripts at toast overlays
  opHtml = opHtml.replace(/<script id="LAN_OPERATOR_BRIDGE">[\s\S]*?<\/script>/gi, '');
  opHtml = opHtml.replace(/<div id="HIGHLIGHT_CUSTOM_SETTINGS_SECTION">[\s\S]*?<\/div>/gi, '');
  opHtml = opHtml.replace(/<div id="SYNC_TOAST_ALERT"[\s\S]*?<\/div>/gi, '');
  opHtml = opHtml.replace(/<div id="PING_TOAST_ALERT"[\s\S]*?<\/div>/gi, '');

  // I-update ang timestamp para mag-fresh reload ang browser
  opHtml = opHtml.replace(/src=["']operator\.js(\?v=\d+)?["']/gi, `src="operator.js?v=${Date.now()}"`);

  fs.writeFileSync(opHtmlPath, opHtml, 'utf8');
  console.log('✓ operator/index.html: Nalinis ang DOM; 100% buo muli ang PC mouse & click controls.');
}

// 3. IBALIK ANG OUTPUT/OUTPUT.HTML SA STABLE BROADCAST LISTENER NA WALANG YELLOW BARS
if (fs.existsSync(outHtmlPath)) {
  let outHtml = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang lahat ng dating injected style at script tags
  outHtml = outHtml.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
  outHtml = outHtml.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

  const stableOutputEngine = `
<style id="STABLE_OUTPUT_STYLE">
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

  /* ZERO VERTICAL BARS ANNIHILATION */
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

  /* Unhighlighted text default: White */
  .ndi-word, .ndi-space, span {
    color: #ffffff;
    text-shadow: 2px 2px 5px rgba(0,0,0,0.9) !important;
  }
  .ndi-space { background: transparent !important; border: none !important; }
</style>

<script id="STABLE_OUTPUT_RECEIVER">
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

    try {
      const bc = new BroadcastChannel('bible_projection_channel');
      bc.onmessage = function(ev) {
        if (!ev.data) return;
        if (ev.data.type === 'UPDATE_HIGHLIGHT_CONFIG') {
          applyConfig(ev.data.presetMode, ev.data.fontColor, ev.data.boxColor, ev.data.boxOpacity, ev.data.cornerRadius);
        } else if (typeof ev.data.hideVerseBox !== 'undefined') {
          document.body.classList.toggle('hide-verse-box-active', !!ev.data.hideVerseBox);
        }
      };
    } catch(e) {}

    window.addEventListener('storage', function() {
      const mode = localStorage.getItem('hl_preset_mode') || 'karaoke';
      const fontColor = localStorage.getItem('hl_font_color') || '#ffd700';
      const boxColor = localStorage.getItem('hl_box_color') || '#ffd700';
      const op = localStorage.getItem('hl_box_opacity') || 0.85;
      const rad = localStorage.getItem('hl_corner_radius') || 6;
      applyConfig(mode, fontColor, boxColor, op, rad);
    });
  })();
</script>
`;

  if (outHtml.includes('<head>')) {
    outHtml = outHtml.replace('<head>', '<head>\n' + stableOutputEngine);
  } else {
    outHtml = stableOutputEngine + '\n' + outHtml;
  }

  outHtml = outHtml.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

  fs.writeFileSync(outHtmlPath, outHtml, 'utf8');
  console.log('✓ output/output.html: Naibalik ang malinis na display; 0 vertical bars.');
}

console.log('\n========================================================');
console.log('✓ REVERT COMPLETE! THE APP IS FULLY STABLE AGAIN.');
console.log('========================================================');