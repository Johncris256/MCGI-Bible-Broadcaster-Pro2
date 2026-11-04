/*
 * Output-only Bible translation selector.
 * The selected translation is stored in this browser tab's sessionStorage and
 * is never sent to the Operator, WebSocket, BroadcastChannel or localStorage.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'bible_output_viewer_translation_v1';
  const translationCache = new Map();
  const translationPromises = new Map();
  let translationList = [];
  let activeTranslationId = '';
  let activeTranslationName = '';
  let latestOperatorState = null;
  let originalRenderOutputState = null;
  const slotAlignmentMaps = new Map();
  let menuRoot = null;
  let optionList = null;
  let searchInput = null;
  let menuStatus = null;
  let toastEl = null;
  let toastTimer = null;

  function safeSessionGet(key) {
    try { return window.sessionStorage.getItem(key) || ''; }
    catch (error) { return ''; }
  }

  function safeSessionSet(key, value) {
    try {
      if (value) window.sessionStorage.setItem(key, value);
      else window.sessionStorage.removeItem(key);
    } catch (error) {}
  }

  function normalizeIncomingState(data) {
    if (data && data.__viewerTranslationViewState && data.__viewerTranslationOriginalState) {
      return data.__viewerTranslationOriginalState;
    }
    return data;
  }

  function readInitialState() {
    try {
      const raw = localStorage.getItem('bible_live_payload');
      if (raw) latestOperatorState = JSON.parse(raw);
    } catch (error) {}
  }

  async function fetchTranslationList() {
    const response = await fetch('/api/translations', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load the translation list. HTTP ' + response.status);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('The translation list has an unexpected format.');
    translationList = rows
      .filter(item => item && item.id)
      .map(item => ({ id: String(item.id), name: String(item.name || item.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return translationList;
  }

  async function loadTranslationData(translationId) {
    if (translationCache.has(translationId)) return translationCache.get(translationId);
    if (translationPromises.has(translationId)) return translationPromises.get(translationId);

    const promise = (async function () {
      const url = '../data/translations/' + encodeURIComponent(translationId) + '.json';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load "' + translationId + '". HTTP ' + response.status);
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('The selected translation file has an unexpected format.');
      }
      translationCache.set(translationId, data);
      return data;
    })();

    translationPromises.set(translationId, promise);
    try {
      return await promise;
    } finally {
      translationPromises.delete(translationId);
    }
  }

  function normalizeWord(word) {
    return String(word == null ? '' : word).toLowerCase()
      .replace(/^[^a-z0-9\u00C0-\uFFFF]+|[^a-z0-9\u00C0-\uFFFF]+$/g, '');
  }

  // A conservative LCS alignment maps highlighted source words only when an
  // equivalent token exists in the viewer's selected translation. This avoids
  // highlighting an unrelated word merely because it has the same index.
  function buildWordAlignment(sourceWords, targetWords) {
    const source = Array.isArray(sourceWords) ? sourceWords : [];
    const target = Array.isArray(targetWords) ? targetWords : [];
    const sourceNorm = source.map(normalizeWord);
    const targetNorm = target.map(normalizeWord);
    const rows = source.length + 1;
    const cols = target.length + 1;
    const dp = Array.from({ length: rows }, () => new Uint16Array(cols));

    for (let i = source.length - 1; i >= 0; i--) {
      for (let j = target.length - 1; j >= 0; j--) {
        if (sourceNorm[i] && sourceNorm[i] === targetNorm[j]) {
          dp[i][j] = dp[i + 1][j + 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    const map = new Map();
    let i = 0;
    let j = 0;
    while (i < source.length && j < target.length) {
      if (sourceNorm[i] && sourceNorm[i] === targetNorm[j]) {
        map.set(i, j);
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        i++;
      } else {
        j++;
      }
    }
    return map;
  }

  function parseReference(reference) {
    const match = String(reference || '').match(/^(.*?)\s+(\d+):(\d+)$/);
    if (!match) return { bookName: '', chapter: '', verse: '' };
    return { bookName: match[1].trim(), chapter: match[2], verse: match[3] };
  }

  function getTargetVerse(translationData, slotData) {
    const referenceParts = parseReference(slotData.reference);
    const books = Object.keys(translationData || {});
    if (!books.length) return null;

    let bookName = '';
    const requestedIndex = Number(slotData.bookIndex);
    if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < books.length) {
      bookName = books[requestedIndex];
    }

    // Prefer a literal book-name match when the source and target use the same
    // spelling; otherwise use the canonical book position sent by Operator.
    if (referenceParts.bookName) {
      const exactBook = books.find(name => name.toLowerCase() === referenceParts.bookName.toLowerCase());
      if (exactBook) bookName = exactBook;
    }
    if (!bookName) return null;

    const chapter = String(slotData.chapter || referenceParts.chapter || '');
    const verse = String(slotData.verse || referenceParts.verse || '');
    if (!chapter || !verse) return null;

    const chapterData = translationData[bookName] || {};
    const verseData = chapterData[chapter] || chapterData[String(Number(chapter))];
    if (!verseData) return null;
    const text = verseData[verse] != null ? verseData[verse] : verseData[String(Number(verse))];
    if (text == null || String(text).trim() === '') return null;

    const verseText = String(text).trim();
    const isChinese = /[\u4e00-\u9fff]/.test(verseText);
    const words = isChinese ? Array.from(verseText) : verseText.split(/\s+/);
    return {
      reference: bookName + ' ' + chapter + ':' + verse,
      words: words,
      hasSpaces: !isChinese
    };
  }

  function buildViewerState(operatorState, translationData) {
    const viewerState = Object.assign({}, operatorState);
    const sourceSlots = Array.isArray(operatorState.slots) ? operatorState.slots : [];
    slotAlignmentMaps.clear();

    viewerState.slots = sourceSlots.map((slotData, slotIndex) => {
      const originalSlot = Object.assign({}, slotData);
      if (String(slotData.transId || '') === activeTranslationId) {
        const identity = new Map();
        (slotData.words || []).forEach((word, index) => identity.set(index, index));
        slotAlignmentMaps.set(slotIndex, identity);
        return originalSlot;
      }

      const targetVerse = getTargetVerse(translationData, slotData);
      if (!targetVerse) {
        // Incomplete translations fall back to the Operator's verse for this slot.
        const identity = new Map();
        (slotData.words || []).forEach((word, index) => identity.set(index, index));
        slotAlignmentMaps.set(slotIndex, identity);
        return originalSlot;
      }

      const sourceWords = Array.isArray(slotData.words) ? slotData.words : [];
      const alignment = buildWordAlignment(sourceWords, targetVerse.words);
      slotAlignmentMaps.set(slotIndex, alignment);
      const highlighted = (Array.isArray(slotData.highlighted) ? slotData.highlighted : [])
        .map(index => alignment.get(Number(index)))
        .filter(index => Number.isInteger(index));

      return Object.assign({}, originalSlot, {
        reference: targetVerse.reference,
        version: activeTranslationName,
        words: targetVerse.words,
        hasSpaces: targetVerse.hasSpaces,
        highlighted: highlighted
      });
    });

    // The base renderer caches its last argument for resize events. Retain the
    // original Operator payload so a resize can never treat translated text as
    // a new source payload and translate it a second time.
    viewerState.__viewerTranslationViewState = true;
    viewerState.__viewerTranslationOriginalState = operatorState;
    return viewerState;
  }

  function renderLatestState() {
    if (latestOperatorState && typeof window.renderOutputState === 'function') {
      window.renderOutputState(latestOperatorState);
    }
  }

  function showToast(message, isError) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'outputViewerTranslationToast';
      toastEl.className = 'output-viewer-translation-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl && toastEl.classList.remove('visible'), 2600);
  }

  function createMenu() {
    if (menuRoot) return;
    menuRoot = document.createElement('div');
    menuRoot.id = 'viewerTranslationContextMenu';
    menuRoot.className = 'viewer-translation-context-menu';
    menuRoot.innerHTML = `
      <div class="viewer-translation-main-item" tabindex="0" role="menuitem">
        <span>Bible Translation</span><span class="viewer-translation-chevron">›</span>
      </div>
      <div class="viewer-translation-submenu" role="menu">
        <div class="viewer-translation-menu-heading">OUTPUT VIEWER TRANSLATION</div>
        <div class="viewer-translation-menu-note">This device / tab only</div>
        <input class="viewer-translation-search" type="search" placeholder="Search translation..." autocomplete="off" />
        <div class="viewer-translation-options"></div>
        <div class="viewer-translation-menu-footer">Highlights map only where words match.</div>
        <div class="viewer-translation-menu-status" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(menuRoot);
    optionList = menuRoot.querySelector('.viewer-translation-options');
    searchInput = menuRoot.querySelector('.viewer-translation-search');
    menuStatus = menuRoot.querySelector('.viewer-translation-menu-status');

    const mainItem = menuRoot.querySelector('.viewer-translation-main-item');
    mainItem.addEventListener('mouseenter', () => menuRoot.classList.add('submenu-open'));
    mainItem.addEventListener('click', () => menuRoot.classList.toggle('submenu-open'));
    searchInput.addEventListener('input', () => renderOptionList(searchInput.value));
    searchInput.addEventListener('click', event => event.stopPropagation());
    menuRoot.addEventListener('contextmenu', event => event.preventDefault());

    document.addEventListener('contextmenu', event => {
      if (event.target && event.target.closest && event.target.closest('#viewerTranslationContextMenu')) return;
      event.preventDefault();
      placeMenu(event.clientX, event.clientY);
      renderOptionList(searchInput.value);
    });

    document.addEventListener('click', event => {
      if (menuRoot && !menuRoot.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });
    window.addEventListener('resize', closeMenu);
  }

  function placeMenu(clientX, clientY) {
    if (!menuRoot) return;
    menuRoot.classList.add('open', 'submenu-open');
    const mainWidth = 220;
    const subWidth = 310;
    const edge = 8;
    const totalWidth = mainWidth + subWidth;
    const flip = clientX + totalWidth > window.innerWidth - edge;
    menuRoot.classList.toggle('flip', flip);

    let left;
    if (flip) {
      left = Math.max(subWidth + edge, Math.min(window.innerWidth - mainWidth - edge, clientX));
    } else {
      left = Math.max(edge, Math.min(window.innerWidth - totalWidth - edge, clientX));
    }
    const top = Math.max(edge, Math.min(window.innerHeight - 360, clientY));
    menuRoot.style.left = left + 'px';
    menuRoot.style.top = top + 'px';
  }

  function closeMenu() {
    if (menuRoot) menuRoot.classList.remove('open', 'submenu-open', 'flip');
  }

  function setMenuStatus(message, isError) {
    if (!menuStatus) return;
    menuStatus.textContent = message || '';
    menuStatus.classList.toggle('error', !!isError);
  }

  function makeOption(label, selected, onClick, extraClass) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'viewer-translation-option' + (selected ? ' selected' : '') + (extraClass ? ' ' + extraClass : '');
    const name = document.createElement('span');
    name.textContent = label;
    const mark = document.createElement('span');
    mark.className = 'viewer-translation-check';
    mark.textContent = selected ? '✓' : '';
    button.appendChild(name);
    button.appendChild(mark);
    button.addEventListener('click', event => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function renderOptionList(filterText) {
    if (!optionList) return;
    optionList.replaceChildren();
    const query = String(filterText || '').trim().toLowerCase();
    optionList.appendChild(makeOption(
      'Follow Operator Translation',
      !activeTranslationId,
      useOperatorTranslation,
      'follow-operator'
    ));

    const matches = translationList.filter(item =>
      !query || item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query)
    );
    matches.forEach(item => {
      optionList.appendChild(makeOption(
        item.name,
        item.id === activeTranslationId,
        () => selectTranslation(item),
        ''
      ));
    });
    if (!matches.length && query) {
      const empty = document.createElement('div');
      empty.className = 'viewer-translation-empty';
      empty.textContent = 'No matching translation found.';
      optionList.appendChild(empty);
    }
  }

  async function selectTranslation(item) {
    if (!item || !item.id) return;
    setMenuStatus('Loading ' + item.name + '…', false);
    try {
      await loadTranslationData(item.id);
      activeTranslationId = item.id;
      activeTranslationName = item.name;
      safeSessionSet(STORAGE_KEY, item.id);
      if (typeof window.clearOutputPersistentHighlights === 'function') {
        window.clearOutputPersistentHighlights();
      }
      renderOptionList(searchInput ? searchInput.value : '');
      setMenuStatus('Applied to this Output tab only.', false);
      renderLatestState();
      closeMenu();
      showToast('Output translation: ' + item.name, false);
    } catch (error) {
      setMenuStatus(error.message || 'Unable to load this translation.', true);
      showToast('Unable to load ' + item.name + '.', true);
    }
  }

  function useOperatorTranslation() {
    activeTranslationId = '';
    activeTranslationName = '';
    safeSessionSet(STORAGE_KEY, '');
    slotAlignmentMaps.clear();
    if (typeof window.clearOutputPersistentHighlights === 'function') {
      window.clearOutputPersistentHighlights();
    }
    renderOptionList(searchInput ? searchInput.value : '');
    renderLatestState();
    closeMenu();
    showToast('Following the Operator translation.', false);
  }

  window.mapOutputViewerHighlightIndex = function (slotIndex, sourceWordIndex) {
    const slotMap = slotAlignmentMaps.get(Number(slotIndex));
    if (!activeTranslationId || !slotMap) return Number(sourceWordIndex);
    const mapped = slotMap.get(Number(sourceWordIndex));
    return Number.isInteger(mapped) ? mapped : -1;
  };

  function installRenderWrapper() {
    originalRenderOutputState = window.renderOutputState;
    if (typeof originalRenderOutputState !== 'function') {
      showToast('Output translation menu could not connect to the renderer.', true);
      return false;
    }

    window.renderOutputState = function (incomingData) {
      const rawData = normalizeIncomingState(incomingData);
      if (!rawData) return originalRenderOutputState(incomingData);
      latestOperatorState = rawData;

      if (!activeTranslationId) {
        slotAlignmentMaps.clear();
        return originalRenderOutputState(rawData);
      }

      const translationData = translationCache.get(activeTranslationId);
      if (!translationData) return originalRenderOutputState(rawData);
      const viewerState = buildViewerState(rawData, translationData);
      return originalRenderOutputState(viewerState);
    };
    return true;
  }

  async function initialize() {
    createMenu();
    readInitialState();
    installRenderWrapper();

    try {
      await fetchTranslationList();
      renderOptionList('');
    } catch (error) {
      setMenuStatus('Could not load translation list. Check the Bible Broadcast server.', true);
      renderOptionList('');
    }

    const savedId = safeSessionGet(STORAGE_KEY);
    if (savedId) {
      const savedItem = translationList.find(item => item.id === savedId);
      if (!savedItem) {
        safeSessionSet(STORAGE_KEY, '');
      } else {
        try {
          await loadTranslationData(savedId);
          activeTranslationId = savedId;
          activeTranslationName = savedItem.name;
          renderOptionList(searchInput ? searchInput.value : '');
          renderLatestState();
        } catch (error) {
          safeSessionSet(STORAGE_KEY, '');
          showToast('Saved Output translation was unavailable. Following Operator.', true);
        }
      }
    }
  }

  initialize();
})();
