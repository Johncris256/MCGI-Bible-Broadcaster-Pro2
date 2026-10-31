const fs = require('fs');
const path = require('path');

const baseDir = path.join('C:', 'bible-html5-app');
const outDir = path.join(baseDir, 'output');
const outHtmlPath = path.join(outDir, 'output.html');
const outCssPath = path.join(outDir, 'output.css');
const outJsPath = path.join(outDir, 'output.js');

console.log('--- PURGING ALL VERTICAL YELLOW BARS PERMANENTLY ---');

// 1. LINISIN ANG OUTPUT.CSS KUNG MAYROONG NAKA-HARDCODE NA BORDER O BARS
if (fs.existsSync(outCssPath)) {
  let css = fs.readFileSync(outCssPath, 'utf8');
  const originalCss = css;
  css = css.replace(/border-left\s*:[^;]+;/gi, '/* border-left removed */');
  css = css.replace(/border-right\s*:[^;]+;/gi, '/* border-right removed */');
  css = css.replace(/\.highlight-start[^{]*\{[^}]*\}/gi, '/* highlight-start rule neutralized */');
  css = css.replace(/\.highlight-end[^{]*\{[^}]*\}/gi, '/* highlight-end rule neutralized */');
  if (css !== originalCss) {
    fs.writeFileSync(outCssPath, css, 'utf8');
    console.log('✓ Nalinis ang border-left / border-right rules sa output.css');
  }
}

// 2. LINISIN ANG INLINE BORDER INJECTIONS SA OUTPUT.JS
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');
  let jsModified = false;
  if (js.includes('borderLeft') || js.includes('borderRight')) {
    js = js.replace(/\.style\.borderLeft\s*=[^;]+;/gi, '.style.borderLeft = "none";');
    js = js.replace(/\.style\.borderRight\s*=[^;]+;/gi, '.style.borderRight = "none";');
    jsModified = true;
  }
  if (jsModified) {
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Na-neutralize ang inline border styling sa output.js');
  }
}

// 3. I-UPDATE ANG OUTPUT.HTML GAMIT ANG ULTRA-HIGH SPECIFICITY ZERO-BAR CSS
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  // Linisin ang mga lumang injection styles
  html = html.replace(/<style id=".*?">[\s\S]*?<\/style>/gi, '');

  const bulletproofZeroBarStyles = `
<style id="BULLETPROOF_ZERO_BAR_STYLE">
  :root {
    --hl-font-color: #ffd700;
    --hl-box-rgba: rgba(255, 215, 0, 0.85);
    --hl-corner-radius: 6px;
  }

  /* ==================== 1. ULTRA-HIGH SPECIFICITY ZERO-BAR ANNIHILATION ==================== */
  /* Target ang lahat ng antas ng DOM para walang makatalong stylesheet */
  html body #multiSlotStage .render-box .verse-text span,
  html body #multiSlotStage .render-box .verse-text [class*="highlight"],
  html body #multiSlotStage .render-box .verse-text [class*="ndi"],
  html body #multiSlotStage .render-box .verse-text .highlight-start,
  html body #multiSlotStage .render-box .verse-text .highlight-end,
  html body #multiSlotStage .render-box .verse-text .active-highlight,
  html body .render-box span,
  html body [class*="highlight"],
  html body [class*="ndi"] {
    border: none !important;
    border-left: none !important;
    border-right: none !important;
    border-top: none !important;
    border-bottom: none !important;
    outline: none !important;
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
  }

  /* Patayin ang lahat ng pseudo-elements (::before at ::after) na posibleng gumuguhit ng bar */
  html body #multiSlotStage .render-box .verse-text *::before,
  html body #multiSlotStage .render-box .verse-text *::after,
  html body .render-box *::before,
  html body .render-box *::after,
  html body [class*="highlight"]::before,
  html body [class*="highlight"]::after,
  html body [class*="ndi"]::before,
  html body [class*="ndi"]::after {
    display: none !important;
    content: none !important;
    border: none !important;
    width: 0px !important;
    height: 0px !important;
    background: transparent !important;
  }

  /* ==================== 2. STRICT KARAOKE GLOW (FONT ONLY) ==================== */
  [data-hl-mode="karaoke"] html body #multiSlotStage .render-box .verse-text span,
  [data-hl-mode="karaoke"] .active-highlight,
  [data-hl-mode="karaoke"] .ndi-word,
  [data-hl-mode="karaoke"] .ndi-space {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    border-left: none !important;
    border-right: none !important;
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

  /* ==================== 3. BOX HIGHLIGHT ROUNDED ==================== */
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

  /* Unhighlighted text default: White */
  .ndi-word, .ndi-space, span {
    color: #ffffff;
    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.9) !important;
  }

  /* Tiyaking laging transparent ang spaces */
  .ndi-space {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
</style>

<script id="ZERO_BAR_CLEANUP_ENGINE">
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
      cleanDOMBars();
    }

    // Direct DOM cleaner para burahin ang anumang naiwang border sa mismong HTML elements
    function cleanDOMBars() {
      const mode = document.documentElement.getAttribute('data-hl-mode') || 'karaoke';
      const spans = document.querySelectorAll('#multiSlotStage span, .verse-text span, [class*="highlight"]');
      spans.forEach(el => {
        el.style.setProperty('border', 'none', 'important');
        el.style.setProperty('border-left', 'none', 'important');
        el.style.setProperty('border-right', 'none', 'important');
        el.style.setProperty('box-shadow', 'none', 'important');
        if (mode === 'karaoke') {
          el.style.setProperty('background', 'transparent', 'important');
          el.style.setProperty('background-color', 'transparent', 'important');
        }
      });
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
        setTimeout(cleanDOMBars, 20);
      };
    } catch(e) {}

    // Linisin tuwing may binabagong talata
    const observer = new MutationObserver(cleanDOMBars);
    window.addEventListener('DOMContentLoaded', () => {
      const target = document.getElementById('multiSlotStage') || document.body;
      observer.observe(target, { childList: true, subtree: true, attributes: false });
      cleanDOMBars();
    });
  })();
</script>
`;

  if (html.includes('</head>')) {
    html = html.replace('</head>', bulletproofZeroBarStyles + '\n</head>');
  } else {
    html = bulletproofZeroBarStyles + '\n' + html;
  }

  // Bagong timestamp para maiwasan ang lumang browser cache
  html = html.replace(/src=["']output\.js(\?v=\d+)?["']/gi, `src="output.js?v=${Date.now()}"`);
  fs.writeFileSync(outHtmlPath, html, 'utf8');
  console.log('✓ Naidagdag ang Bulletproof Zero-Bar CSS at DOM Cleaner sa output.html');
}

console.log('\n========================================================');
console.log('✓ SUCCESS! PERMANENTENG NAALIS ANG VERTICAL YELLOW BARS.');
console.log('========================================================');