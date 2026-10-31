const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');

console.log('--- REPAIRING OUTPUT.HTML AND ELIMINATING INFINITE LOOPS ---');

if (!fs.existsSync(outHtmlPath)) {
  console.error('Hindi nahanap ang output/output.html');
  process.exit(1);
}

let html = fs.readFileSync(outHtmlPath, 'utf8');

// 1. Linisin ang lahat ng sirang custom styles at script observers na nagdudulot ng freeze
html = html.replace(/<style id="SMART_DYNAMIC_HIGHLIGHT_STYLE">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id="SMART_OUTPUT_RECEIVER">[\s\S]*?<\/script>/gi, '');
html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script id=".*?">[\s\S]*?<\/script>/gi, '');

// 2. Ilagay ang malinis, ligtas, at zero-loop na dynamic engine
const cleanRepairBlock = `
<style id="CLEAN_REPAIRED_OUTPUT_STYLE">
  :root {
    --hl-font-color: #ffd700;
    --hl-box-rgba: rgba(255, 215, 0, 0.85);
    --hl-corner-radius: 6px;
  }

  /* SMOOTH HIDE / UNHIDE VERSE BOX ANIMATION */
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

  /* Universal Reset para sa Spans */
  span, .ndi-word, .ndi-space, .highlight-start, .highlight-end, .active-highlight, [class*="highlight"] {
    transition: background-color 0.15s ease, color 0.12s ease !important;
  }

  /* 1. KARAOKE GLOW FONT ONLY (0 BACKGROUND, 0 BARS) */
  [data-hl-mode="karaoke"] span,
  [data-hl-mode="karaoke"] .ndi-word,
  [data-hl-mode="karaoke"] .ndi-space,
  [data-hl-mode="karaoke"] .highlight-start,
  [data-hl-mode="karaoke"] .highlight-end,
  [data-hl-mode="karaoke"] .active-highlight,
  [data-hl-mode="karaoke"] [class*="highlight"] {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    border-radius: 0px !important;
    padding: 0px !important;
    margin: 0px !important;
  }

  [data-hl-mode="karaoke"] .active-highlight,
  [data-hl-mode="karaoke"] span.active-highlight,
  [data-hl-mode="karaoke"] .ndi-word.active-highlight {
    color: var(--hl-font-color) !important;
    text-shadow: 0 0 8px var(--hl-font-color),
                 0 0 16px var(--hl-font-color),
                 2px 2px 4px rgba(0, 0, 0, 0.95) !important;
  }

  /* 2. BOX HIGHLIGHT ROUNDED (WHITE FONT BY DEFAULT) */
  [data-hl-mode="box"] .active-highlight {
    background-color: var(--hl-box-rgba) !important;
    color: #ffffff !important;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9) !important;
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

  /* Unhighlighted Text */
  .ndi-word, .ndi-space, span {
    color: #ffffff;
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.9) !important;
  }

  .ndi-space {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
</style>

<script id="CLEAN_REPAIRED_RECEIVER">
  (function() {
    function hexToRgba(hex, alpha) {
      let c = (hex || '#ffd700').replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return 'rgba(' + ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255) + ',' + alpha + ')';
    }

    function applyConfig(mode, fontColor, boxColor, op, rad) {
      document.documentElement.setAttribute('data-hl-mode', mode || 'karaoke');
      document.documentElement.style.setProperty('--hl-font-color', fontColor || '#ffd700');
      document.documentElement.style.setProperty('--hl-box-rgba', hexToRgba(boxColor || '#ffd700', op || 0.85));
      document.documentElement.style.setProperty('--hl-corner-radius', (rad || 6) + 'px');
    }

    const savedMode = localStorage.getItem('hl_preset_mode') || 'karaoke';
    const savedFontColor = localStorage.getItem('hl_font_color') || '#ffd700';
    const savedBoxColor = localStorage.getItem('hl_box_color') || '#ffd700';
    const savedOp = localStorage.getItem('hl_box_opacity') || 0.85;
    const savedRad = localStorage.getItem('hl_corner_radius') || 6;
    applyConfig(savedMode, savedFontColor, savedBoxColor, savedOp, savedRad);

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

if (html.includes('</head>')) {
  html = html.replace('</head>', cleanRepairBlock + '\n</head>');
} else {
  html = cleanRepairBlock + '\n' + html;
}

// Bago at sariwang cache-buster timestamp
html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);

fs.writeFileSync(outHtmlPath, html, 'utf8');
console.log('✓ SUCCESS! Naayos at na-restore na ang output.html nang walang infinite loops.');