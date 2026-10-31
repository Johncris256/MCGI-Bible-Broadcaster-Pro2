let lastReceivedData = null;
const ALL_ANIM_CLASSES = ['anim-fade-slide', 'anim-page-flip-next', 'anim-page-flip-prev', 'anim-vertical-flip', 'anim-zoom-in'];

function applyAnimationVariables(anim) {
  const a = anim || {};
  const verseDur = (a.enabled === false) ? 0 : (parseFloat(a.duration) || 0.55);
  const highDur = (a.highlightAnimEnabled === false) ? 0 : (parseFloat(a.highlightDuration) || 0.35);
  const highOp = (a.highlightOpacity !== undefined) ? parseFloat(a.highlightOpacity) : 0.50;

  document.documentElement.style.setProperty('--verse-anim-duration', `${verseDur}s`);
  document.documentElement.style.setProperty('--highlight-anim-duration', `${highDur}s`);
  document.documentElement.style.setProperty('--highlight-bg-color', `rgba(250, 204, 21, ${highOp})`);
}

function triggerVerseAnimation(container, anim, direction) {
  ALL_ANIM_CLASSES.forEach(cls => container.classList.remove(cls));
  const a = anim || {};
  if (a.enabled === false) return;
  void container.offsetWidth;
  const styleType = a.style || 'fadeSlide';
  if (styleType === 'pageFlip') {
    container.classList.add(direction === 'prev' ? 'anim-page-flip-prev' : 'anim-page-flip-next');
  } else if (styleType === 'verticalFlip') {
    container.classList.add('anim-vertical-flip');
  } else if (styleType === 'zoomIn') {
    container.classList.add('anim-zoom-in');
  } else {
    container.classList.add('anim-fade-slide');
  }
}

function updateHighlightClasses(container, wordsLength, highSet) {
  for (let idx = 0; idx < wordsLength; idx++) {
    const isHigh = highSet.has(idx);
    const prevHigh = highSet.has(idx - 1);
    const nextHigh = highSet.has(idx + 1);
    const wordSpan = container.querySelector(`[data-idx='${idx}']`);
    if (wordSpan) {
      if (isHigh) {
        wordSpan.classList.add('active-highlight');
        wordSpan.classList.toggle('highlight-start', !prevHigh);
        wordSpan.classList.toggle('highlight-end', !nextHigh);
      } else {
        wordSpan.classList.remove('active-highlight', 'highlight-start', 'highlight-end');
      }
    }
    const spaceSpan = container.querySelector(`[data-space-after='${idx}']`);
    if (spaceSpan) {
      spaceSpan.classList.toggle('active-highlight', isHigh && nextHigh);
    }
  }
}

function adjustSlotFontSize(boxEl, baseMaxSize, displayMode, fontsObj) {
  const canvas = boxEl.querySelector('.slot-canvas');
  const container = boxEl.querySelector('.verse-container');
  const text = boxEl.querySelector('.verse-text');
  const refTitle = boxEl.querySelector('.reference-title');
  const verSub = boxEl.querySelector('.version-subtitle');
  if (!canvas || !container || !text) return;

  // Do not apply a second font multiplier here. The complete 16:9 card is
  // scaled by CSS, so typography and spacing zoom out together.
  const baseRefSz = (fontsObj && parseInt(fontsObj.refSize, 10)) || 38;
  const baseVerSz = (fontsObj && parseInt(fontsObj.verSize, 10)) || 19;
  if (refTitle) refTitle.style.fontSize = baseRefSz + 'px';
  if (verSub) verSub.style.fontSize = baseVerSz + 'px';

  text.style.lineHeight = '1.55';
  text.style.width = '100%';
  text.style.maxHeight = '100%';
  text.style.overflow = 'hidden';

  const fitKey = [
    text.dataset.verseKey || '', Number(baseMaxSize) || 46,
    baseRefSz, baseVerSz, container.clientWidth, container.clientHeight
  ].join('|');
  // Highlight-only broadcasts must not resize the typography.
  if (text.dataset.fontFitKey === fitKey && text.dataset.fittedFontSize) return;

  let low = 14;
  let high = Math.max(14, Number(baseMaxSize) || 46);
  let best = 14;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    text.style.fontSize = mid + 'px';
    if (text.scrollHeight <= container.clientHeight + 1 &&
        text.scrollWidth <= container.clientWidth + 1) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  text.style.fontSize = best + 'px';
  text.dataset.fittedFontSize = String(best);
  text.dataset.fontFitKey = fitKey;
}

function fitOutputStageTo16x9(stage, outerMargin, displayMode) {
  const margin = Math.max(0, Number(outerMargin) || 0);
  const availableWidth = Math.max(160, window.innerWidth - margin * 2);
  const availableHeight = Math.max(90, window.innerHeight - margin * 2);
  const width = Math.min(availableWidth, availableHeight * 16 / 9);
  const height = width * 9 / 16;
  stage.style.width = width + 'px';
  stage.style.height = height + 'px';
  stage.style.setProperty('--canvas-width', width + 'px');
  stage.style.setProperty('--canvas-height', height + 'px');

  const gap = parseFloat(getComputedStyle(stage).gap) || 18;
  let scale = 1;
  if (displayMode === 2) {
    scale = Math.min((width - gap) / (2 * width), 1);
  } else if (displayMode === 3 || displayMode === 4) {
    scale = Math.min((width - gap) / (2 * width), (height - gap) / (2 * height), 1);
  }
  stage.style.setProperty('--slot-scale', String(Math.max(0.05, scale)));
}

function applyBoxTypography(boxEl, fonts) {
  const outRefEl = boxEl.querySelector('.reference-title');
  const outVerEl = boxEl.querySelector('.version-subtitle');
  const outContentEl = boxEl.querySelector('.verse-text');
  const defaultFont = 'Arial, Helvetica, sans-serif';
  const defaultShadow = '2px 3px 6px rgba(0, 0, 0, 0.85), 0px 1px 3px rgba(0, 0, 0, 0.9)';
  const f = fonts || {};

  const refShadowOn = f.refShadow !== false;
  const verShadowOn = f.verShadow !== false;
  const contentShadowOn = f.contentShadow !== false;

  if (outRefEl) {
    outRefEl.style.setProperty('font-family', f.ref || defaultFont, 'important');
    outRefEl.style.setProperty('font-weight', f.refBold ? '700' : '400', 'important');
    outRefEl.style.setProperty('font-style', f.refItalic ? 'italic' : 'normal', 'important');
    outRefEl.style.setProperty('text-shadow', refShadowOn ? defaultShadow : 'none', 'important');
  }
  if (outVerEl) {
    outVerEl.style.setProperty('font-family', f.version || defaultFont, 'important');
    outVerEl.style.setProperty('font-weight', f.verBold ? '700' : '400', 'important');
    outVerEl.style.setProperty('font-style', f.verItalic ? 'italic' : 'normal', 'important');
    outVerEl.style.setProperty('text-shadow', verShadowOn ? defaultShadow : 'none', 'important');
  }
  if (outContentEl) {
    outContentEl.style.setProperty('font-family', f.content || defaultFont, 'important');
    outContentEl.style.setProperty('font-weight', f.contentBold ? '700' : '400', 'important');
    outContentEl.style.setProperty('font-style', f.contentItalic ? 'italic' : 'normal', 'important');
  }
  boxEl.querySelectorAll('.ndi-word').forEach(span => {
    span.style.setProperty('text-shadow', contentShadowOn ? defaultShadow : 'none', 'important');
  });
}

function renderOutputState(data) {
  if (!data) return;
  lastReceivedData = data;

  if (data.bg === 'transparent') {
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
  } else if (data.bg && data.bg.startsWith('url')) {
    document.body.style.backgroundImage = data.bg;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
  } else if (data.bg) {
    document.body.style.backgroundColor = data.bg;
    document.body.style.backgroundImage = 'none';
  }

  applyAnimationVariables(data.animation);
  const s = data.settings || {};
  const pad = (s.boxPadding !== undefined) ? parseInt(s.boxPadding, 10) : 40;
  const outerMargin = (s.screenMargin !== undefined) ? parseInt(s.screenMargin, 10) : 55;
  const hideBoxBg = Boolean(s.hideBoxBg);
  const baseMaxFont = parseInt(s.maxFontSize, 10) || 46;
  const topGapPx = (s.topGap !== undefined) ? parseInt(s.topGap, 10) : 18;
  const displayMode = parseInt(data.displayMode, 10) || 1;

  document.documentElement.style.setProperty('--title-verse-gap', topGapPx + 'px');

  const stage = document.getElementById('multiSlotStage');
  stage.className = `mode-${displayMode}`;
  fitOutputStageTo16x9(stage, outerMargin, displayMode);

  const slotsList = Array.isArray(data.slots) && data.slots.length > 0
    ? data.slots.slice(0, displayMode)
    : [];

  while (stage.children.length > slotsList.length) stage.removeChild(stage.lastChild);
  while (stage.children.length < slotsList.length) {
    const box = document.createElement('div');
    box.className = 'render-box';
    box.innerHTML = `
      <div class="slot-canvas">
        <div class="reference-container">
          <div class="reference-title"></div>
          <div class="version-subtitle"></div>
        </div>
        <div class="verse-container">
          <div class="verse-text"></div>
        </div>
      </div>
    `;
    stage.appendChild(box);
  }

  slotsList.forEach((slotData, sIdx) => {
    const boxEl = stage.children[sIdx];
    const canvasEl = boxEl.querySelector('.slot-canvas');
    if (canvasEl) {
      canvasEl.style.padding = `${pad}px ${pad + 8}px`;
      canvasEl.style.borderRadius = outerMargin === 0 && displayMode === 1 ? '0px' : '14px';
    }
    boxEl.classList.toggle('transparent-verse-box', hideBoxBg);

    const refEl = boxEl.querySelector('.reference-title');
    const verEl = boxEl.querySelector('.version-subtitle');
    const contentEl = boxEl.querySelector('.verse-text');

    refEl.textContent = slotData.reference || '';
    verEl.textContent = slotData.version || '';

    const wordsArr = slotData.words || [];
    const hasSpaces = slotData.hasSpaces !== false;
    const highSet = new Set(slotData.highlighted || []);

    const newVerseKey = (slotData.reference || '') + '|' + (slotData.version || '') + '|' + wordsArr.join(' ');
    if (contentEl.dataset.verseKey !== newVerseKey || data.forcePreviewAnim) {
      contentEl.dataset.verseKey = newVerseKey;
      contentEl.innerHTML = '';
      triggerVerseAnimation(contentEl, data.animation, data.navDirection || 'next');

      wordsArr.forEach((word, wIdx) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.classList.add('ndi-word');
        span.dataset.idx = wIdx;
        contentEl.appendChild(span);

        if (wIdx < wordsArr.length - 1 && hasSpaces) {
          const space = document.createElement('span');
          space.textContent = ' ';
          space.classList.add('ndi-space');
          space.dataset.spaceAfter = wIdx;
          contentEl.appendChild(space);
        }
      });
    }

    updateHighlightClasses(contentEl, wordsArr.length, highSet);
    applyBoxTypography(boxEl, data.fonts); adjustSlotFontSize(boxEl, baseMaxFont, displayMode, data.fonts);
  });
}

// 1. BroadcastChannel Listener (Tabs in same browser)
try {
  const bc = new BroadcastChannel('bible_live_stream');
  bc.onmessage = (e) => { if (e.data) renderOutputState(e.data); };
} catch (e) {}

// 2. LocalStorage Event (Tabs/Windows)
window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch (err) {}
  }
});

// 3. OBS CEF Realtime Poller (80ms interval ensures OBS gets live updates)
let lastTimestampSeen = 0;
setInterval(() => {
  const ts = localStorage.getItem('bible_live_timestamp');
  if (ts && ts !== String(lastTimestampSeen)) {
    lastTimestampSeen = ts;
    const raw = localStorage.getItem('bible_live_payload');
    if (raw) {
      try { renderOutputState(JSON.parse(raw)); } catch (err) {}
    }
  }
}, 80);

// Auto load cached state on launch
const savedInit = localStorage.getItem('bible_live_payload');
if (savedInit) {
  try { renderOutputState(JSON.parse(savedInit)); } catch (err) {}
}

window.addEventListener('resize', () => {
  if (lastReceivedData) renderOutputState(lastReceivedData);
});

// WEBSOCKET REAL-TIME SYNC ENGINE (OBS + ALL BROWSERS)
function connectLiveSocket() {
  const wsHost = window.location.host || 'localhost:5000';
  const ws = new WebSocket('ws://' + wsHost);

  ws.onopen = () => console.log('✓ Connected to Bible Live Broadcast Feed');
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      renderOutputState(data);
    } catch(e) {}
  };
  ws.onclose = () => setTimeout(connectLiveSocket, 1500);
  ws.onerror = () => ws.close();
}

connectLiveSocket();

// Fallback: BroadcastChannel at LocalStorage
try {
  const bc = new BroadcastChannel('bible_live_stream');
  bc.onmessage = (e) => { if (e.data) renderOutputState(e.data); };
} catch(e) {}

window.addEventListener('storage', (e) => {
  if (e.key === 'bible_live_payload' && e.newValue) {
    try { renderOutputState(JSON.parse(e.newValue)); } catch(err) {}
  }
});


// SAFE_OUTPUT_OVERRIDE
const originalRenderOutputState = renderOutputState;
let lastRenderedText = {};

renderOutputState = function(data) {
  // 1. PATAKBUHIN ANG ORIGINAL NA RENDER CODE (Kaya hindi masisira ang app)
  originalRenderOutputState(data);

  if (!data) return;

  // 2. OVERRIDE HARD CUT: I-force ang CSS Transition para mag-fade
  if (typeof data.hideVerseBox !== 'undefined') {
    document.body.classList.toggle('hide-verse-box-active', !!data.hideVerseBox);
    const stage = document.getElementById('multiSlotStage');
    if (stage && stage.style.display === 'none') stage.style.display = '';
    
    document.querySelectorAll('.render-box, .verse-box').forEach(el => {
       if (el.style.display === 'none') el.style.display = '';
    });
  }

  // 3. APPLY MOVE SWAP ANIMATION
  setTimeout(() => {
    document.querySelectorAll('.render-box, .verse-box').forEach((card, idx) => {
      const txt = card.textContent.trim();
      if (lastRenderedText[idx] !== txt && txt.length > 0) {
        card.classList.remove('card-swap-anim');
        void card.offsetWidth; // Reflow
        card.classList.add('card-swap-anim');
      }
      lastRenderedText[idx] = txt;
    });
  }, 20);
};
