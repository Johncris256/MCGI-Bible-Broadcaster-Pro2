/*
 * Clean slide-only layout transition.
 * Fixes ghost/overlap by removing the old-layout snapshot and View Transition
 * layers. Only the live render boxes move upward; there is no opacity change.
 */
(function () {
  'use strict';

  if (window.__bibleCleanSlideLayoutTransitionInstalled) return;

  const DURATION = 250;
  const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const STYLE_ID = 'bible-clean-slide-layout-transition-style';

  const stageAtStartup = document.getElementById('multiSlotStage');
  const modeFromClass = (className) => {
    const match = String(className || '').match(/(?:^|\s)mode-([1-4])(?:\s|$)/);
    return match ? Number(match[1]) : 1;
  };
  const readMode = (data) => {
    const value = Number.parseInt(data && data.displayMode, 10);
    return Number.isFinite(value) ? Math.min(4, Math.max(1, value)) : 1;
  };

  const originalRenderOutputState = window.renderOutputState;
  if (typeof originalRenderOutputState !== 'function') return;

  // This stylesheet intentionally has no opacity, filter, or old/new snapshot rules.
  const previousStyle = document.getElementById(STYLE_ID);
  if (previousStyle) previousStyle.remove();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes bibleCleanSlideUp {
      from { transform: translate3d(0, 9px, 0); }
      to   { transform: translate3d(0, 0, 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bible-clean-slide-transition { animation-duration: 1ms !important; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  let previousMode = modeFromClass(stageAtStartup && stageAtStartup.className);
  let transitionGeneration = 0;
  let pendingFrame = null;
  const activeAnimations = new Set();
  const requestFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(callback, 16);
  const cancelFrame = window.cancelAnimationFrame
    ? window.cancelAnimationFrame.bind(window)
    : window.clearTimeout.bind(window);

  function cleanupAnimation(record, cancel) {
    if (!record || record.cleaned) return;
    record.cleaned = true;
    if (record.timeout) window.clearTimeout(record.timeout);
    if (record.animation) {
      record.animation.onfinish = null;
      record.animation.oncancel = null;
      if (cancel) {
        try { record.animation.cancel(); } catch (_) {}
      }
    }
    activeAnimations.delete(record);
  }

  function cancelActiveAnimations() {
    activeAnimations.forEach((record) => cleanupAnimation(record, true));
    activeAnimations.clear();
  }

  function animateCurrentBoxes(stage, generation) {
    if (!stage || generation !== transitionGeneration) return;

    // Do not create snapshots or overlays. Every visible panel animates once
    // in its final grid cell, so there is never a second copy left underneath.
    const boxes = Array.from(stage.children).filter((element) =>
      element && element.classList && element.classList.contains('render-box')
    );

    boxes.forEach((box) => {
      if (typeof box.animate !== 'function') return;
      let animation;
      try {
        animation = box.animate(
          [
            { transform: 'translate3d(0, 9px, 0)' },
            { transform: 'translate3d(0, 0, 0)' }
          ],
          {
            duration: DURATION,
            easing: EASE_OUT,
            fill: 'none'
          }
        );
      } catch (_) {
        return;
      }

      const record = { animation, timeout: null, cleaned: false };
      activeAnimations.add(record);
      animation.onfinish = () => cleanupAnimation(record, true);
      animation.oncancel = () => cleanupAnimation(record, false);

      // Safety cleanup for embedded/CEF browsers where a finished event may
      // be delayed or dropped when the output surface is temporarily hidden.
      record.timeout = window.setTimeout(
        () => cleanupAnimation(record, true),
        DURATION + 180
      );
    });
  }

  window.renderOutputState = function (data) {
    if (!data) return originalRenderOutputState.apply(this, arguments);

    const nextMode = readMode(data);
    const modeChanged = nextMode !== previousMode;
    previousMode = nextMode;

    if (!modeChanged) {
      return originalRenderOutputState.apply(this, arguments);
    }

    // Stop any in-flight slide before rendering a newer layout. This prevents
    // two animation effects from controlling the same panel at once.
    transitionGeneration += 1;
    const generation = transitionGeneration;
    if (pendingFrame !== null) {
      cancelFrame(pendingFrame);
      pendingFrame = null;
    }
    cancelActiveAnimations();

    const result = originalRenderOutputState.apply(this, arguments);

    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = document.getElementById('multiSlotStage');
    const verseBoxHidden = document.body.classList.contains('hide-verse-box-active');

    if (!reduced && stage && !verseBoxHidden) {
      pendingFrame = requestFrame(() => {
        pendingFrame = null;
        animateCurrentBoxes(stage, generation);
      });
    }

    return result;
  };

  window.__bibleCleanSlideLayoutTransitionInstalled = true;
})();
