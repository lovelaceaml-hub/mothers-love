// Original Plan 12 live crossfade, adapted to the scene registry.
'use strict';

const TRANSITIONS = Object.create(null);
const TRANSITION_STYLES = TRANSITIONS;
const TRANSITION_ORIGINAL_DURATION = 1.15;
const TRANSITION_STYLE_IDS = ['flood', 'tide', 'vortex', 'storm'];

let TRANSITION_BAG = [];
let TRANSITION_LAST = null;

function registerTransition(id, descriptor) {
  TRANSITIONS[id] = Object.assign({
    id,
    duration: TRANSITION_ORIGINAL_DURATION,
    coverDuration: TRANSITION_ORIGINAL_DURATION,
    revealDuration: 0,
    init: null,
    cover: null,
    swap: null,
    reveal: null,
  }, descriptor);
}

function transitionOriginalFrame(trans) {
  if (!trans?.old || !trans.next) return;
  const p = ease(trans.age / trans.duration);
  trans.old.style.opacity = 1 - p;
  trans.old.style.transform = `translateX(${-15 * p}px) scale(${1 - 0.004 * p})`;
  trans.next.style.opacity = p;
  trans.next.style.transform = `translateX(${20 * (1 - p)}px) scale(${0.997 + 0.003 * p})`;
}

const transitionRegister = registerTransition;

function transitionDescriptor(id) {
  return TRANSITIONS[id] || TRANSITIONS.flood;
}

function transitionNextStyle() {
  if (!TRANSITION_BAG.length) {
    const values = [...TRANSITION_STYLE_IDS];
    const rng = randSeed(4801 + (S.idCounter || 0) * 59 + Math.floor(S.t));
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    if (TRANSITION_LAST !== null && values[0] === TRANSITION_LAST && values.length > 1) {
      [values[0], values[1]] = [values[1], values[0]];
    }
    TRANSITION_BAG = values;
  }
  const next = TRANSITION_BAG.shift();
  TRANSITION_LAST = next;
  return next;
}

function transitionCleanup() {
  const layer = $('transition-layer');
  if (layer) {
    layer.replaceChildren();
    layer.classList.remove('active');
  }
}

function transitionStart(styleId, oldRoot, prevSceneId, nextRoot) {
  if (S.still) return null;
  const oldSceneId = oldRoot?.dataset?.scene;
  const nextSceneId = nextRoot?.dataset?.scene;
  if (oldSceneId !== undefined && nextSceneId !== undefined && oldSceneId === nextSceneId && String(prevSceneId) === oldSceneId) {
    if (prevSceneId !== 0 && oldRoot) {
      try { sceneDescriptor(prevSceneId).onLeave?.(oldRoot); } catch (e) { log('scene_onleave_error', { scene: prevSceneId }); }
    }
    oldRoot?.remove();
    nextRoot.style.opacity = '';
    nextRoot.style.transform = '';
    transitionCleanup();
    return null;
  }
  const layer = $('transition-layer');
  if (!layer) return null;
  layer.replaceChildren();
  layer.classList.add('active');
  const desc = transitionDescriptor(styleId);
  const trans = {
    style: styleId,
    descriptor: desc,
    old: oldRoot,
    prev: prevSceneId,
    next: nextRoot,
    phase: 'cover',
    age: 0,
    duration: desc.duration || TRANSITION_ORIGINAL_DURATION,
    items: [],
  };
  desc.init?.(trans, layer);
  desc.cover?.(trans, 0);
  return trans;
}

registerTransition('flood', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});

registerTransition('tide', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});

registerTransition('vortex', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});

registerTransition('storm', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});
