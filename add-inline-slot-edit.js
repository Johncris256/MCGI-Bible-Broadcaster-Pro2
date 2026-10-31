const fs = require('fs');
const path = require('path');

function findFiles(dir, targetNames, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(fullPath, targetNames, results);
    } else if (targetNames.includes(entry.name.toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

const inlineEditSnippet = `
// === INLINE SLOT VERSE EDIT START ===
(function initInlineSlotVerseQuickEdit() {
  const style = document.createElement('style');
  style.textContent = \`
    .slot-title {
      display: inline-flex !important;
      align-items: center;
      gap: 4px;
      cursor: text !important;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px dashed transparent;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .slot-title:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #ffffff !important;
    }
    .slot-card.active-slot .slot-title:hover {
      background: rgba(250, 204, 21, 0.18);
      border-color: #facc15;
    }
    .inline-verse-input {
      background: #0f172a;
      color: #ffffff;
      border: 1.5px solid #38bdf8;
      border-radius: 4px;
      padding: 1px 7px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      width: 150px;
      outline: none;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.45);
    }
    .slot-card.active-slot .inline-verse-input {
      border-color: #facc15;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.45);
    }
  \`;
  document.head.appendChild(style);

  function startInlineEdit(slotIdx, titleEl) {
    if (typeof focusSlot === 'function') focusSlot(slotIdx);
    if (!titleEl || titleEl.querySelector('.inline-verse-input')) return;

    const fullText = (titleEl.textContent || '').trim();
    const currentRefText = (typeof slots !== 'undefined' && slots[slotIdx] && slots[slotIdx].reference)
      ? slots[slotIdx].reference
      : fullText.replace(/^SLOT\\s*\\d+\\s*:\\s*/i, '').trim();

    const parentCard = titleEl.closest('.slot-card');
    if (parentCard) parentCard.setAttribute('draggable', 'false');

    const savedText = fullText;
    titleEl.innerHTML = \`<span>SLOT \${slotIdx + 1}: </span>\`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-verse-input';
    input.value = currentRefText;
    input.placeholder = 'hal. jn 3;16';

    let finished = false;
    function finishEdit(applyChange) {
      if (finished) return;
      finished = true;
      if (parentCard) parentCard.setAttribute('draggable', 'true');

      const rawVal = input.value.trim();
      titleEl.textContent = savedText;

      if (applyChange && rawVal) {
        if (typeof parseAndLoadVerse === 'function') {
          parseAndLoadVerse(rawVal, slotIdx);
        } else if (typeof loadVerseByQuery === 'function') {
          loadVerseByQuery(rawVal, slotIdx);
        }
      } else if (typeof updateSlotHeaderMeta === 'function') {
        updateSlotHeaderMeta(slotIdx);
      }
    }

    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEdit(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEdit(false);
      }
    });

    input.addEventListener('blur', () => {
      finishEdit(false);
    });

    titleEl.appendChild(input);
    input.focus();
    input.select();
  }

  document.addEventListener('click', (e) => {
    const titleEl = e.target.closest('.slot-title, [id^="slotTitle"]');
    if (!titleEl) return;
    if (e.target.classList.contains('inline-verse-input')) return;

    e.stopPropagation();
    let sIdx = -1;
    if (titleEl.id && titleEl.id.startsWith('slotTitle')) {
      sIdx = parseInt(titleEl.id.replace('slotTitle', ''), 10);
    } else {
      const card = titleEl.closest('.slot-card');
      if (card && card.dataset.slot !== undefined) {
        sIdx = parseInt(card.dataset.slot, 10);
      }
    }

    if (!isNaN(sIdx) && sIdx >= 0) {
      startInlineEdit(sIdx, titleEl);
    }
  });
})();
// === INLINE SLOT VERSE EDIT END ===
`;

const jsCandidates = findFiles(__dirname, ['operator.js']);
let updatedCount = 0;

if (jsCandidates.length > 0) {
  jsCandidates.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\/\/ === INLINE SLOT VERSE EDIT START ===[\s\S]*?\/\/ === INLINE SLOT VERSE EDIT END ===/g, '');
    content = content.trimEnd() + '\n' + inlineEditSnippet + '\n';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('MATAGUMPAY NA NA-UPDATE ANG:', filePath);
    updatedCount++;
  });
} else {
  const htmlCandidates = findFiles(__dirname, ['index.html', 'operator.html']).filter(f =>
    f.toLowerCase().includes('operator') || fs.readFileSync(f, 'utf8').includes('slot-card')
  );
  htmlCandidates.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\/\/ === INLINE SLOT VERSE EDIT START ===[\s\S]*?\/\/ === INLINE SLOT VERSE EDIT END ===/g, '');
    if (content.includes('</body>')) {
      content = content.replace('</body>', '<script>' + inlineEditSnippet + '</script>\n</body>');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('MATAGUMPAY NA NA-INJECT SA HTML:', filePath);
      updatedCount++;
    }
  });
}
