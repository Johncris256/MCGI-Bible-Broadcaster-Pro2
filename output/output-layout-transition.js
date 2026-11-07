/*
 * MCGI Bible Broadcaster Pro - Cubic ease-in-out, aspect-ratio-safe directional FLIP transitions.
 *
 * Existing 16:9 .slot-canvas elements animate as complete canvases. Their
 * screen-space movement is calculated from canvas centers, while size changes
 * use one UNIFORM scale factor (never separate X/Y scaling). This preserves
 * the verse frame and all of its contents without stretching.
 *
 * New canvases enter from beyond explicit viewport edges for the requested
 * transition; removed canvases use the exact reverse paths where applicable.
 * Existing canvases FLIP to their new positions. The 4->1 transition reverses
 * 1->4: tile 1 expands concurrently as tiles 2/3/4 exit. All motion uses
 * cubic-bezier(0.42, 0, 0.58, 1) ease-in-out.
 * Verse rendering/highlighting remains owned by output.js.
 */
(function () {
  'use strict';

  if (window.__bibleCubicFlipLayoutTransitionInstalled) return;

  const DURATION = 620;
  const ENTER_SCALE = 0.97;
  const EXIT_SCALE = 0.97;
  const EASING = { x1: 0.42, y1: 0, x2: 0.58, y2: 1 };
  const OFFSCREEN_PADDING = 96;
  const STYLE_ID = 'bible-cubic-flip-layout-transition-style';
  const GHOST_Z_INDEX = 2147483000;

  const stageAtStartup = document.getElementById('multiSlotStage');
  const modeFromClass = (className) => {
    const match = String(className || '').match(/(?:^|\s)mode-([1-4])(?:\s|$)/);
    return match ? Number(match[1]) : 1;
  };
  const readMode = (data) => {
    const value = Number.parseInt(data && data.displayMode, 10);
    return Number.isFinite(value) ? Math.min(4, Math.max(1, value)) : 1;
  };
  const requestFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : (callback) => window.setTimeout(() => callback(Date.now()), 16);
  const cancelFrame = window.cancelAnimationFrame
    ? window.cancelAnimationFrame.bind(window)
    : window.clearTimeout.bind(window);

  // Solve the cubic-bezier x curve, then return its y value. This applies the
  // same true CSS cubic-bezier(0.42, 0, 0.58, 1) ease-in-out curve to every
  // layout animation (FLIP, entry, exit and delayed expansion).
  function cubicCoordinate(t, p1, p2) {
    const inv = 1 - t;
    return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t;
  }
  function cubicEaseInOut(progress) {
    const x = Math.min(1, Math.max(0, progress));
    if (x === 0 || x === 1) return x;
    let low = 0;
    let high = 1;
    let parameter = x;
    for (let i = 0; i < 18; i++) {
      const estimate = cubicCoordinate(parameter, EASING.x1, EASING.x2);
      if (estimate < x) low = parameter;
      else high = parameter;
      parameter = (low + high) / 2;
    }
    return cubicCoordinate(parameter, EASING.y1, EASING.y2);
  }

  const originalRenderOutputState = window.renderOutputState;
  if (typeof originalRenderOutputState !== 'function') return;

  const oldStyle = document.getElementById(STYLE_ID);
  if (oldStyle) oldStyle.remove();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* Per-frame canvas transforms are owned by the FLIP animator. */
    #multiSlotStage[data-layout-animating="true"] > .render-box,
    #multiSlotStage[data-layout-animating="true"] > .render-box > .slot-canvas {
      transition: none !important;
    }
    @media (prefers-reduced-motion: reduce) {
      #multiSlotStage[data-layout-animating="true"] > .render-box,
      #multiSlotStage[data-layout-animating="true"] > .render-box > .slot-canvas {
        transition: none !important;
      }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  let previousMode = modeFromClass(stageAtStartup && stageAtStartup.className);
  let generation = 0;
  let activeRun = null;

  function getDirectRenderBoxes(stage) {
    return Array.from(stage.children).filter((element) =>
      element && element.classList && element.classList.contains('render-box')
    );
  }

  function getCanvas(box) {
    return box && box.querySelector ? (box.querySelector('.slot-canvas') || box) : box;
  }

  function getStageScale(stage) {
    const transform = window.getComputedStyle(stage).transform;
    if (!transform || transform === 'none') return { x: 1, y: 1 };

    try {
      const Matrix = window.DOMMatrixReadOnly || window.DOMMatrix;
      if (typeof Matrix === 'function') {
        const matrix = new Matrix(transform);
        return {
          x: Math.abs(matrix.a) > 0.0001 ? Math.abs(matrix.a) : 1,
          y: Math.abs(matrix.d) > 0.0001 ? Math.abs(matrix.d) : 1
        };
      }
    } catch (_) {}

    const match2d = transform.match(/^matrix\(([^)]+)\)$/);
    if (match2d) {
      const values = match2d[1].split(',').map(Number);
      return {
        x: Math.abs(values[0]) > 0.0001 ? Math.abs(values[0]) : 1,
        y: Math.abs(values[3]) > 0.0001 ? Math.abs(values[3]) : 1
      };
    }
    const match3d = transform.match(/^matrix3d\(([^)]+)\)$/);
    if (match3d) {
      const values = match3d[1].split(',').map(Number);
      return {
        x: Math.abs(values[0]) > 0.0001 ? Math.abs(values[0]) : 1,
        y: Math.abs(values[5]) > 0.0001 ? Math.abs(values[5]) : 1
      };
    }
    return { x: 1, y: 1 };
  }

  function getCenter(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function getViewportRect() {
    const width = Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1);
    const height = Math.max(1, document.documentElement.clientHeight || window.innerHeight || 1);
    return { left: 0, top: 0, right: width, bottom: height, width, height };
  }

  // Return a center point fully beyond the nearest screen edge or corner.
  // The direction is determined by the slot's screen quadrant, not by the
  // composition/stage center. This is the requested "away from center" path.
  function getOffscreenCenter(anchorCenter, viewport, elementWidth, elementHeight, direction) {
    // Explicit edge-only paths are used where the requested motion is NOT a
    // corner entry/exit. Keep the other coordinate aligned with the slot.
    const point = { x: anchorCenter.x, y: anchorCenter.y };
    if (direction === 'left') {
      point.x = viewport.left - elementWidth / 2 - OFFSCREEN_PADDING;
      return point;
    }
    if (direction === 'right') {
      point.x = viewport.right + elementWidth / 2 + OFFSCREEN_PADDING;
      return point;
    }
    if (direction === 'top') {
      point.y = viewport.top - elementHeight / 2 - OFFSCREEN_PADDING;
      return point;
    }
    if (direction === 'bottom') {
      point.y = viewport.bottom + elementHeight / 2 + OFFSCREEN_PADDING;
      return point;
    }

    // Default path: use the nearest edge or corner based on the slot's
    // screen quadrant. This remains the 4-grid -> 1-full exit choreography.
    const middleX = viewport.left + viewport.width / 2;
    const middleY = viewport.top + viewport.height / 2;
    const epsilon = 12;
    let sideX = anchorCenter.x < middleX - epsilon ? -1 : anchorCenter.x > middleX + epsilon ? 1 : 0;
    let sideY = anchorCenter.y < middleY - epsilon ? -1 : anchorCenter.y > middleY + epsilon ? 1 : 0;
    if (sideX === 0 && sideY === 0) {
      const distances = [
        { side: 'left', distance: anchorCenter.x - viewport.left },
        { side: 'right', distance: viewport.right - anchorCenter.x },
        { side: 'top', distance: anchorCenter.y - viewport.top },
        { side: 'bottom', distance: viewport.bottom - anchorCenter.y }
      ].sort((a, b) => a.distance - b.distance);
      if (distances[0].side === 'left') sideX = -1;
      else if (distances[0].side === 'right') sideX = 1;
      else if (distances[0].side === 'top') sideY = -1;
      else sideY = 1;
    }
    if (sideX < 0) point.x = viewport.left - elementWidth / 2 - OFFSCREEN_PADDING;
    else if (sideX > 0) point.x = viewport.right + elementWidth / 2 + OFFSCREEN_PADDING;
    if (sideY < 0) point.y = viewport.top - elementHeight / 2 - OFFSCREEN_PADDING;
    else if (sideY > 0) point.y = viewport.bottom + elementHeight / 2 + OFFSCREEN_PADDING;
    return point;
  }

  function getEntranceDirection(oldMode, nextMode, index) {
    // 1 -> 2: slot 2 arrives from the right edge.
    if (oldMode === 1 && nextMode === 2 && index === 1) return 'right';
    // 1 -> 3 is the reverse of 3 -> 1:
    // slot 2 enters horizontally from the right; slot 3 enters vertically from below.
    if (oldMode === 1 && nextMode === 3 && index === 1) return 'right';
    if (oldMode === 1 && nextMode === 3 && index === 2) return 'bottom';
    // 2 -> 3: slot 3 arrives from below, centered (not from a corner).
    if (oldMode === 2 && nextMode === 3 && index === 2) return 'bottom';
    // 2 -> 4: lower-left slot enters from outside the left edge at lower-row height;
    // lower-right slot enters from outside the right edge at lower-row height.
    if (oldMode === 2 && nextMode === 4 && index === 2) return 'left';
    if (oldMode === 2 && nextMode === 4 && index === 3) return 'right';
    // 3 -> 4: slot 4 enters from the right edge at its bottom-row height.
    if (oldMode === 3 && nextMode === 4 && index === 3) return 'right';
    return null;
  }

  function getExitDirection(oldMode, nextMode, index) {
    // 3 -> 1: reverse of 1 -> 3. Slot 2 exits straight right;
    // bottom-center slot 3 exits straight down.
    if (oldMode === 3 && nextMode === 1 && index === 1) return 'right';
    if (oldMode === 3 && nextMode === 1 && index === 2) return 'bottom';
    // 4 -> 2: reverse of 2 -> 4. Bottom-left slot 3 exits straight left;
    // bottom-right slot 4 exits straight right (not through the corners).
    if (oldMode === 4 && nextMode === 2 && index === 2) return 'left';
    if (oldMode === 4 && nextMode === 2 && index === 3) return 'right';
    // 4 -> 3: reverse of 3 -> 4. Slot 4 exits straight right.
    if (oldMode === 4 && nextMode === 3 && index === 3) return 'right';
    return null;
  }

  function saveInlineStyles(element, properties) {
    const saved = {};
    properties.forEach((property) => {
      saved[property] = {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      };
    });
    return saved;
  }

  function restoreInlineStyles(element, saved) {
    Object.keys(saved).forEach((property) => {
      const item = saved[property];
      if (item.value) element.style.setProperty(property, item.value, item.priority);
      else element.style.removeProperty(property);
    });
  }

  function copyComputedStyleTree(source, target) {
    if (!source || !target) return;
    const computed = window.getComputedStyle(source);
    for (let i = 0; i < computed.length; i++) {
      const property = computed[i];
      try {
        target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
      } catch (_) {}
    }
    const sourceChildren = source.children || [];
    const targetChildren = target.children || [];
    for (let i = 0; i < Math.min(sourceChildren.length, targetChildren.length); i++) {
      copyComputedStyleTree(sourceChildren[i], targetChildren[i]);
    }
  }

  function createExitGhost(box, stageScale) {
    // Clone the complete render-box, not the already-transformed canvas alone.
    // This preserves the canvas' own computed font/layout scale in the snapshot.
    const rect = box.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const ghost = box.cloneNode(true);
    copyComputedStyleTree(box, ghost);
    const localWidth = rect.width / stageScale.x;
    const localHeight = rect.height / stageScale.y;
    const left = rect.left - (localWidth * (1 - stageScale.x)) / 2;
    const top = rect.top - (localHeight * (1 - stageScale.y)) / 2;

    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('data-layout-exit-ghost', 'true');
    ghost.style.setProperty('position', 'fixed', 'important');
    ghost.style.setProperty('left', left + 'px', 'important');
    ghost.style.setProperty('top', top + 'px', 'important');
    ghost.style.setProperty('width', localWidth + 'px', 'important');
    ghost.style.setProperty('height', localHeight + 'px', 'important');
    ghost.style.setProperty('max-width', 'none', 'important');
    ghost.style.setProperty('max-height', 'none', 'important');
    ghost.style.setProperty('margin', '0', 'important');
    ghost.style.setProperty('transform', `scale(${stageScale.x}, ${stageScale.y})`, 'important');
    ghost.style.setProperty('transform-origin', 'center center', 'important');
    ghost.style.setProperty('opacity', '1', 'important');
    ghost.style.setProperty('z-index', String(GHOST_Z_INDEX), 'important');
    ghost.style.setProperty('pointer-events', 'none', 'important');
    ghost.style.setProperty('transition', 'none', 'important');
    ghost.style.setProperty('will-change', 'transform, opacity', 'important');
    ghost.style.setProperty('animation', 'none', 'important');
    ghost.querySelectorAll('*').forEach((element) => {
      element.style.setProperty('transition', 'none', 'important');
      element.style.setProperty('animation', 'none', 'important');
    });

    return { element: ghost, rect, stageScale };
  }

  function removeGhosts(ghosts) {
    ghosts.forEach((ghost) => {
      if (ghost && ghost.element && ghost.element.parentNode) ghost.element.parentNode.removeChild(ghost.element);
    });
  }

  function cancelActiveRun() {
    if (!activeRun) return;
    activeRun.cancelled = true;
    activeRun.frames.forEach((frameId) => cancelFrame(frameId));
    activeRun.frames.clear();
    activeRun.cleanups.forEach((cleanup) => { try { cleanup(); } catch (_) {} });
    activeRun.cleanups.clear();
    removeGhosts(activeRun.ghosts);
    if (activeRun.stage) activeRun.stage.removeAttribute('data-layout-animating');
    window.__bibleLayoutTransitionInProgress = false;
    activeRun = null;
  }

  function animate(run, duration, update, cleanup) {
    const start = (window.performance && performance.now) ? performance.now() : Date.now();
    let completed = false;
    let frameId = null;

    const finish = () => {
      if (completed) return;
      completed = true;
      if (frameId !== null) run.frames.delete(frameId);
      run.cleanups.delete(cancel);
      if (typeof cleanup === 'function') cleanup();
    };
    const cancel = () => {
      if (completed) return;
      completed = true;
      if (frameId !== null) {
        cancelFrame(frameId);
        run.frames.delete(frameId);
      }
      if (typeof cleanup === 'function') cleanup();
    };
    run.cleanups.add(cancel);

    const tick = (now) => {
      if (frameId !== null) {
        run.frames.delete(frameId);
        frameId = null;
      }
      if (run.cancelled) { finish(); return; }
      const elapsed = Math.max(0, (now || Date.now()) - start);
      const progress = Math.min(1, elapsed / duration);
      update(cubicEaseInOut(progress), progress);
      if (progress >= 1) finish();
      else {
        frameId = requestFrame(tick);
        run.frames.add(frameId);
      }
    };
    frameId = requestFrame(tick);
    run.frames.add(frameId);
  }

  // FLIP the actual 16:9 canvas, not the flexible grid cell. Translation follows
  // the canvas center; scaling is one scalar so neither X nor Y is stretched.
  function prepareCanvasFlip(canvas, firstRect, lastRect, stageScale) {
    if (!firstRect || !lastRect || !lastRect.width || !lastRect.height) return null;

    const firstCenter = getCenter(firstRect);
    const lastCenter = getCenter(lastRect);
    const dx = (firstCenter.x - lastCenter.x) / stageScale.x;
    const dy = (firstCenter.y - lastCenter.y) / stageScale.y;
    const widthRatio = firstRect.width / lastRect.width;
    const heightRatio = firstRect.height / lastRect.height;
    // Uniform scale preserves the native 16:9 canvas and its contents.
    const startScale = Math.sqrt(Math.max(0.0001, widthRatio * heightRatio));
    const baseTransform = window.getComputedStyle(canvas).transform;
    const base = baseTransform && baseTransform !== 'none' ? baseTransform : '';
    const saved = saveInlineStyles(canvas, ['transform', 'transform-origin', 'will-change', 'transition']);
    let restored = false;

    canvas.style.setProperty('transition', 'none', 'important');
    canvas.style.setProperty('transform-origin', 'center center', 'important');
    canvas.style.setProperty('will-change', 'transform', 'important');

    const update = (eased) => {
      const x = dx * (1 - eased);
      const y = dy * (1 - eased);
      const scale = startScale + (1 - startScale) * eased;
      canvas.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0) scale(${scale}) ${base}`.trim(), 'important');
    };
    const restore = () => {
      if (restored) return;
      restored = true;
      restoreInlineStyles(canvas, saved);
    };

    // Apply the inverse transform immediately. This prevents a 4 -> 1 tile 1
    // flash/jump to full size while slots 2/3/4 are exiting. It will then play
    // forward exactly once after the exits complete.
    update(0);
    return {
      play(run) { animate(run, DURATION, update, restore); },
      cancel: restore
    };
  }

  function animateCanvasFlip(run, canvas, firstRect, lastRect, stageScale) {
    const plan = prepareCanvasFlip(canvas, firstRect, lastRect, stageScale);
    if (plan) plan.play(run);
  }

  // Animate a snapshot of Tile 1 from the full-screen composition into its
  // 2-Split destination. This is the literal visual reverse of the liked
  // 2-Split -> 1-Full FLIP: the snapshot stays at the original full-screen
  // coordinates on the first frame, then moves/resizes smoothly to Tile 1's
  // split position while Tile 2 enters from the right. Keeping this one
  // transition on a fixed snapshot avoids a one-frame jump when mode-1's
  // stage-level zoom/pan is replaced by mode-2's per-canvas split scale.
  function animateReverseOneToTwoGhost(run, ghost, finalRect, stageScale, liveCanvas) {
    if (!ghost || !ghost.element || !finalRect || !finalRect.width || !finalRect.height || !liveCanvas) return false;

    const startRect = ghost.rect;
    const startCenter = getCenter(startRect);
    const finalCenter = getCenter(finalRect);
    const dx = finalCenter.x - startCenter.x;
    const dy = finalCenter.y - startCenter.y;
    const widthRatio = finalRect.width / startRect.width;
    const heightRatio = finalRect.height / startRect.height;
    // Use one scalar only, so the cloned 16:9 verse canvas never stretches.
    const targetScale = Math.sqrt(Math.max(0.0001, widthRatio * heightRatio));
    const savedLiveCanvas = saveInlineStyles(liveCanvas, ['opacity', 'visibility']);

    liveCanvas.style.setProperty('opacity', '0', 'important');
    liveCanvas.style.setProperty('visibility', 'hidden', 'important');

    animate(run, DURATION, (eased) => {
      const scale = 1 + (targetScale - 1) * eased;
      const sx = (stageScale.x || 1) * scale;
      const sy = (stageScale.y || 1) * scale;
      ghost.element.style.setProperty(
        'transform',
        `translate3d(${dx * eased}px, ${dy * eased}px, 0) scale(${sx}, ${sy})`,
        'important'
      );
    }, () => {
      if (ghost.element.parentNode) ghost.element.parentNode.removeChild(ghost.element);
      restoreInlineStyles(liveCanvas, savedLiveCanvas);
    });
    return true;
  }

  // A new canvas starts fully outside the viewport edge/corner nearest its
  // final slot, then travels inward to that slot. The travel is not from the
  // center of the stage or screen. Scale remains uniform (no stretching).
  function animateCanvasEnter(run, canvas, finalRect, viewport, stageScale, direction) {
    if (!finalRect || !finalRect.width || !finalRect.height) return;
    const finalCenter = getCenter(finalRect);
    const offscreenCenter = getOffscreenCenter(finalCenter, viewport, finalRect.width, finalRect.height, direction);
    const dx = (offscreenCenter.x - finalCenter.x) / stageScale.x;
    const dy = (offscreenCenter.y - finalCenter.y) / stageScale.y;
    const computed = window.getComputedStyle(canvas);
    const finalOpacity = Number.parseFloat(computed.opacity);
    const opacity = Number.isFinite(finalOpacity) ? finalOpacity : 1;
    const baseTransform = computed.transform;
    const base = baseTransform && baseTransform !== 'none' ? baseTransform : '';
    const saved = saveInlineStyles(canvas, ['opacity', 'transform', 'transform-origin', 'will-change', 'transition']);

    canvas.style.setProperty('transition', 'none', 'important');
    canvas.style.setProperty('transform-origin', 'center center', 'important');
    canvas.style.setProperty('will-change', 'transform, opacity', 'important');
    canvas.style.setProperty('opacity', '0', 'important');

    animate(run, DURATION, (eased) => {
      const x = dx * (1 - eased);
      const y = dy * (1 - eased);
      const scale = ENTER_SCALE + (1 - ENTER_SCALE) * eased;
      canvas.style.setProperty('opacity', String(opacity * eased), 'important');
      canvas.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0) scale(${scale}) ${base}`.trim(), 'important');
    }, () => restoreInlineStyles(canvas, saved));
  }

  // Removed canvases travel beyond the nearest viewport edge/corner for
  // their current slot. A top-right tile exits upper-right; a bottom-left
  // tile exits lower-left; a bottom-right tile exits lower-right.
  function animateCanvasExit(run, ghost, viewport, direction) {
    const element = ghost.element;
    const startCenter = getCenter(ghost.rect);
    const offscreenCenter = getOffscreenCenter(startCenter, viewport, ghost.rect.width, ghost.rect.height, direction);
    const dx = offscreenCenter.x - startCenter.x;
    const dy = offscreenCenter.y - startCenter.y;
    const stageScale = ghost.stageScale || { x: 1, y: 1 };

    animate(run, DURATION, (eased) => {
      const x = dx * eased;
      const y = dy * eased;
      const scale = 1 + (EXIT_SCALE - 1) * eased;
      element.style.setProperty('opacity', String(1 - eased), 'important');
      element.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0) scale(${stageScale.x * scale}, ${stageScale.y * scale})`, 'important');
    }, () => {
      if (element.parentNode) element.parentNode.removeChild(element);
    });
  }

  function finishRunWhenIdle(run) {
    const check = () => {
      if (run.finishFrame !== null) {
        run.frames.delete(run.finishFrame);
        run.finishFrame = null;
      }
      if (run.cancelled || activeRun !== run) return;
      if (run.cleanups.size === 0 && run.frames.size === 0) {
        if (run.stage) run.stage.removeAttribute('data-layout-animating');
        removeGhosts(run.ghosts);
        window.__bibleLayoutTransitionInProgress = false;
        activeRun = null;
        return;
      }
      run.finishFrame = requestFrame(check);
      run.frames.add(run.finishFrame);
    };
    run.finishFrame = requestFrame(check);
    run.frames.add(run.finishFrame);
  }

  window.renderOutputState = function (data) {
    if (!data) return originalRenderOutputState.apply(this, arguments);

    const nextMode = readMode(data);
    const oldMode = previousMode;
    const modeChanged = nextMode !== oldMode;
    previousMode = nextMode;
    if (!modeChanged) return originalRenderOutputState.apply(this, arguments);

    generation += 1;
    cancelActiveRun();
    const thisGeneration = generation;
    const stage = document.getElementById('multiSlotStage');
    if (!stage) return originalRenderOutputState.apply(this, arguments);

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const willBeHidden = !!data.hideVerseBox || document.body.classList.contains('hide-verse-box-active');
    if (reducedMotion || willBeHidden) return originalRenderOutputState.apply(this, arguments);

    const oldBoxes = getDirectRenderBoxes(stage);
    const oldCanvases = oldBoxes.map(getCanvas);
    const oldRects = oldCanvases.map((canvas) => canvas.getBoundingClientRect());
    const oldStageScale = getStageScale(stage);
    const stageRectBefore = stage.getBoundingClientRect();
    const viewportRect = getViewportRect();
    const slotsCount = Array.isArray(data.slots) && data.slots.length > 0
      ? Math.min(data.slots.length, nextMode)
      : 0;
    const exitGhosts = [];
    // 1 Full -> 2 Split uses a fixed visual snapshot for Tile 1. It is the
    // exact reverse of the already-liked 2 Split -> 1 Full movement and
    // prevents the stage's mode-specific transform from causing a first-frame
    // vertical jump before Tile 2 enters.
    const reverseOneToTwoGhost = (oldMode === 1 && nextMode === 2 && oldBoxes[0])
      ? createExitGhost(oldBoxes[0], oldStageScale)
      : null;

    // Keep the old canvas of each removed slot visible until its exit completes.
    for (let index = slotsCount; index < oldBoxes.length; index++) {
      const ghost = createExitGhost(oldBoxes[index], oldStageScale);
      if (ghost) {
        ghost.slotIndex = index;
        exitGhosts.push(ghost);
      }
    }

    stage.setAttribute('data-layout-animating', 'true');
    window.__bibleLayoutTransitionInProgress = true;
    let result;
    try {
      result = originalRenderOutputState.apply(this, arguments);
    } catch (error) {
      stage.removeAttribute('data-layout-animating');
      window.__bibleLayoutTransitionInProgress = false;
      throw error;
    }
    if (thisGeneration !== generation) return result;

    const newBoxes = getDirectRenderBoxes(stage);
    const newCanvases = newBoxes.map(getCanvas);
    const newRects = newCanvases.map((canvas) => canvas.getBoundingClientRect());
    const newStageRect = stage.getBoundingClientRect();
    const newStageScale = getStageScale(stage);
    const run = {
      generation: thisGeneration,
      stage,
      ghosts: reverseOneToTwoGhost ? exitGhosts.concat(reverseOneToTwoGhost) : exitGhosts,
      frames: new Set(),
      cleanups: new Set(),
      cancelled: false,
      finishFrame: null
    };
    activeRun = run;

    exitGhosts.forEach((ghost) => {
      document.body.appendChild(ghost.element);
      const exitDirection = getExitDirection(oldMode, nextMode, ghost.slotIndex);
      animateCanvasExit(run, ghost, viewportRect, exitDirection);
    });

    if (reverseOneToTwoGhost) document.body.appendChild(reverseOneToTwoGhost.element);

    const sharedCount = Math.min(oldCanvases.length, newCanvases.length);
    const isReverseOneToTwo = oldMode === 1 && nextMode === 2 && !!reverseOneToTwoGhost;

    // Every shared tile FLIPs at the same time as entering/exiting tiles.
    // In particular, 4-grid -> 1-full is the exact temporal reverse of
    // 1-full -> 4-grid: tile 1 expands toward the full-screen center WHILE
    // tiles 2/3/4 leave through the same off-screen positions they entered from.
    // Do not delay tile 1; the former delay left it stranded in the top-left.
    for (let index = 0; index < sharedCount; index++) {
      if (isReverseOneToTwo && index === 0) continue;
      animateCanvasFlip(run, newCanvases[index], oldRects[index], newRects[index], newStageScale);
    }

    if (isReverseOneToTwo) {
      const moved = animateReverseOneToTwoGhost(
        run,
        reverseOneToTwoGhost,
        newRects[0],
        oldStageScale,
        newCanvases[0]
      );
      if (!moved) {
        if (reverseOneToTwoGhost.element.parentNode) reverseOneToTwoGhost.element.remove();
        animateCanvasFlip(run, newCanvases[0], oldRects[0], newRects[0], newStageScale);
      }
    }

    for (let index = oldCanvases.length; index < newCanvases.length; index++) {
      const entranceDirection = getEntranceDirection(oldMode, nextMode, index);
      animateCanvasEnter(run, newCanvases[index], newRects[index], viewportRect, newStageScale, entranceDirection);
    }

    if (run.cleanups.size === 0 && run.frames.size === 0) {
      stage.removeAttribute('data-layout-animating');
      removeGhosts(run.ghosts);
      window.__bibleLayoutTransitionInProgress = false;
      activeRun = null;
    } else {
      finishRunWhenIdle(run);
    }
    return result;
  };

  window.__bibleCubicFlipLayoutTransitionInstalled = true;
})();
