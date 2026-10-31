const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join('C:', 'bible-html5-app');
const outHtmlPath = path.join(baseDir, 'output', 'output.html');
const outJsPath = path.join(baseDir, 'output', 'output.js');

console.log('--- ILINAPAT ANG SHARP-INNER AT SMOOTH-OUTER HIGHLIGHT SETUP ---');

// 1. ILAPAT ANG CSS SA OUTPUT.HTML
if (fs.existsSync(outHtmlPath)) {
  let html = fs.readFileSync(outHtmlPath, 'utf8');

  const highlightCss = `
  /* ==================== EXACT SMOOTH OUTER / SHARP INNER HIGHLIGHT ==================== */
  :root {
    --highlight-bg-color: #ffd700;
    --highlight-anim-duration: 0.2s;
  }

  .ndi-word, .ndi-space {
    display: inline !important;
    padding-top: 3px !important;
    padding-bottom: 3px !important;
    padding-left: 0px !important;
    padding-right: 0px !important;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    text-shadow: 2px 3px 6px rgba(0, 0, 0, 0.85);
    transition: background-color var(--highlight-anim-duration) ease,
                box-shadow var(--highlight-anim-duration) ease,
                color var(--highlight-anim-duration) ease;
  }

  /* 1. MGA SALITA AT ESPASYO SA GITNA: 100% SHARP AT FLAT (0px radius) */
  .ndi-word.active-highlight,
  .ndi-space.active-highlight {
    background-color: var(--highlight-bg-color) !important;
    color: #111111 !important;
    border-radius: 0px !important;
    box-shadow: none !important;
  }

  /* 2. UNANG SALITA SA PARIRALA: Kurbado sa kaliwa lamang */
  .ndi-word.active-highlight.highlight-start {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
    border-top-right-radius: 0px !important;
    border-bottom-right-radius: 0px !important;
    padding-left: 6px !important;
    box-shadow: -4px 0 8px 0 var(--highlight-bg-color) !important;
  }

  /* 3. HULING SALITA SA PARIRALA: Kurbado sa kanan lamang */
  .ndi-word.active-highlight.highlight-end {
    border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
    padding-right: 6px !important;
    box-shadow: 4px 0 8px 0 var(--highlight-bg-color) !important;
  }

  /* 4. ISANG SALITA LAMANG ANG HINIGHLIGHT: Kurbado ang magkabilang gilid */
  .ndi-word.active-highlight.highlight-start.highlight-end {
    border-radius: 8px !important;
    padding-left: 6px !important;
    padding-right: 6px !important;
    box-shadow: -4px 0 8px 0 var(--highlight-bg-color),
                 4px 0 8px 0 var(--highlight-bg-color) !important;
  }
  /* ==================== END HIGHLIGHT ENGINE ==================== */
  `;

  // Alisin ang lumang highlight blocks kung meron man
  html = html.replace(/\/\* ==================== EXACT SMOOTH OUTER[\s\S]*?\/\* ==================== END HIGHLIGHT ENGINE ====================\ \*\//g, '');
  html = html.replace(/\/\* ==================== SMOOTH CONTINUOUS HIGHLIGHT[\s\S]*?\/\* ==================== END HIGHLIGHT ENGINE ====================\ \*\//g, '');

  if (html.includes('</style>')) {
    html = html.replace('</style>', highlightCss + '\n</style>');
    fs.writeFileSync(outHtmlPath, html, 'utf8');
    console.log('✓ Matagumpay na na-update ang CSS rules sa output/output.html');
  }
}

// 2. I-UPDATE ANG OUTPUT.JS PARA SA CONTINUOUS WORDS AT SPACES
if (fs.existsSync(outJsPath)) {
  let js = fs.readFileSync(outJsPath, 'utf8');

  // Logic na nagbubuo ng HTML spans na may tamang start/end tags at bridged spaces
  const renderVerseWordsFunction = `
// ==================== HIGHLIGHT SPAN BUILDER ====================
function buildHighlightedVerseHtml(words, wordHighlights) {
  if (!words || !Array.isArray(words)) return '';
  const highlights = wordHighlights || {};
  let htmlResult = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isHighlighted = !!highlights[i];

    if (isHighlighted) {
      const isStart = (i === 0 || !highlights[i - 1]);
      const isEnd = (i === words.length - 1 || !highlights[i + 1]);

      let classNames = 'ndi-word active-highlight';
      if (isStart) classNames += ' highlight-start';
      if (isEnd) classNames += ' highlight-end';

      htmlResult += '<span class="' + classNames + '" data-word-idx="' + i + '">' + word + '</span>';
    } else {
      htmlResult += '<span class="ndi-word" data-word-idx="' + i + '">' + word + '</span>';
    }

    // Space sa pagitan ng mga salita
    if (i < words.length - 1) {
      const nextHighlighted = !!highlights[i + 1];
      // Kung parehong highlighted ang kasalukuyan at susunod na salita, kulayan din ang espasyo nang flat
      if (isHighlighted && nextHighlighted) {
        htmlResult += '<span class="ndi-space active-highlight"> </span>';
      } else {
        htmlResult += '<span class="ndi-space"> </span>';
      }
    }
  }

  return htmlResult;
}
// ==================== END SPAN BUILDER ====================
`;

  js = js.replace(/\/\/ ==================== HIGHLIGHT SPAN BUILDER[\s\S]*?\/\/ ==================== END SPAN BUILDER ====================\n?/g, '');
  js = renderVerseWordsFunction + '\n' + js;

  try {
    new vm.Script(js);
    fs.writeFileSync(outJsPath, js, 'utf8');
    console.log('✓ Matagumpay na na-update ang span builder sa output/output.js');
  } catch (e) {
    console.error('Syntax error sa output.js:', e.message);
  }
}

console.log('\n========================================================');
console.log('✓ TAPOS NA! NAKAKABIT NA ANG EXACT SMOOTH-EDGE HIGHLIGHT!');
console.log('========================================================');