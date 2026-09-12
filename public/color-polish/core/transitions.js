// Core transition registry, style definitions, and stage layer management.
'use strict';

const TRANSITIONS = Object.create(null);
const TRANSITION_STYLES = TRANSITIONS;
// 40, not 24. A previous round capped this at 24 to protect the frame budget
// at 3840, and Anthony rejected the result on the TV: 24 bubbles spaced 275 px
// apart cannot cover an 1812 by 636 stage, so the cover phase read as a thin
// scatter drifting over a fully visible background. Coverage is now the wash's
// job (one full-bleed element, animated on transform and opacity only, which
// costs the compositor almost nothing), and the bubbles are texture on top of
// it, so the count can go back up.
const TRANSITION_BUBBLE_COUNT = 40;
const TRANSITION_STYLE_IDS = ['flood', 'tide', 'vortex', 'storm'];
const TRANSITION_FLOOD_DIRS = ['left', 'right', 'up', 'down'];

let TRANSITION_BAG = [];
let TRANSITION_LAST = null;

function registerTransition(id, descriptor) {
  TRANSITIONS[id] = Object.assign({
    id,
    duration: 2.5,
    coverDuration: 0.9,
    revealDuration: 1.6,
    init: null,
    cover: null,
    swap: null,
    reveal: null,
  }, descriptor);
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

// One full-bleed opaque element that sweeps across the stage and occludes it
// completely at the swap, so neither the outgoing nor the incoming scene is
// ever visible mid-change. Appended before the decorative elements so it sits
// behind them. Anthony's brief: "As they cover the screen, the scene will
// change to the next one, and be revealed as the sweeping flood is completing
// off the screen."
function transitionCreateWash(layer) {
  const el = document.createElement('div');
  el.className = 'transition-wash';
  layer.append(el);
  return el;
}

// Drives the wash for a translate-swept style. `axis` is 'x' or 'y' and `from`
// is the edge it enters from, so cover runs the wash from fully off-stage on
// that edge to exactly covering, and reveal continues in the same direction
// until it is fully off the opposite edge. Full coverage therefore happens at
// cover p = 1, which is where the scene swap sits.
// The wash is no longer the visual. It sits under the bubbles purely so that
// "cannot see the background" holds even for the frames before the crowd has
// closed up, and it is tinted to the campaign's warm ground rather than
// reading as a coloured sheet sweeping the screen, which is what Anthony
// rejected in the previous attempt.
function transitionWashFade(trans, phase, p) {
  if (!trans.wash) return;
  const eased = outCubic(clamp(p, 0, 1));
  const alpha = phase === 'cover' ? eased : 1 - eased;
  trans.wash.style.transform = 'translate3d(0,0,0)';
  trans.wash.style.opacity = alpha.toFixed(3);
}

function transitionWashSlide(trans, phase, p, axis, from) {
  if (!trans.wash) return;
  const sign = (from === 'left' || from === 'top') ? -1 : 1;
  const eased = outCubic(clamp(p, 0, 1));
  let pct;
  if (phase === 'cover') {
    pct = sign * 100 * (1 - eased);
  } else {
    pct = -sign * 100 * eased;
  }
  const t = axis === 'x' ? `translate3d(${pct.toFixed(2)}%, 0, 0)` : `translate3d(0, ${pct.toFixed(2)}%, 0)`;
  trans.wash.style.transform = t;
  trans.wash.style.opacity = '1';
}

// Real recognition bubbles, not decorative discs. Anthony, 2026-09-12: "it
// should vortex with REAL recognition bubbles and covering the screen
// completely". This overrides the plan's decision 5, which said the flood's
// bubbles carry expression icons and never text; his instruction wins over his
// own earlier decision, and it is recorded at
// docs/runs/2026-09-12-tv-next-level/decisions/2026-09-12T07-30Z-anthony-transition-vortex-of-real-recognitions.md
//
// Coverage is geometric rather than hopeful. Circles of radius r on a grid of
// spacing sx by sy cover the plane when r >= sqrt(sx^2 + sy^2) / 2. On the
// 1812 by 636 stage an 8 by 6 grid gives sx 226.5 and sy 106, so r must reach
// 125 and the diameter 250. These are 260, so the 48 of them tile the stage
// with overlap to spare and nothing of either scene can show through.
// Sized for the WHOLE screen, not the stage. Anthony, 2026-09-12: the vortex
// must cover the entire screen including the title and the live feed. Circles
// of radius r on a grid of spacing sx by sy cover the plane when
// r >= sqrt(sx^2 + sy^2) / 2. An 8 by 6 grid over 1920 by 1080 gives sx 240 and
// sy 180, so r must reach sqrt(240^2 + 180^2) / 2 = 150 and the diameter 300.
const TRANSITION_GRID_COLS = 8;
const TRANSITION_GRID_ROWS = 6;
const TRANSITION_BUBBLE_D = 300;
const TRANSITION_COVER_W = 1920;
const TRANSITION_COVER_H = 1080;

function transitionRecordsForCover() {
  const pool = records();
  if (!pool.length) return [];
  const wanted = TRANSITION_GRID_COLS * TRANSITION_GRID_ROWS;
  const out = [];
  for (let i = 0; i < wanted; i++) out.push(pool[i % pool.length]);
  return out;
}

function transitionCreateBubbles(layer) {
  const items = [];
  const recs = transitionRecordsForCover();
  if (!recs.length) return items;

  const sx = TRANSITION_COVER_W / TRANSITION_GRID_COLS;
  const sy = TRANSITION_COVER_H / TRANSITION_GRID_ROWS;

  recs.forEach((r, i) => {
    const col = i % TRANSITION_GRID_COLS;
    const row = Math.floor(i / TRANSITION_GRID_COLS);
    const d = TRANSITION_BUBBLE_D;

    // The real recognition card, same markup the scenes use, so these read as
    // recognitions and stay perfectly circular.
    const el = document.createElement('div');
    el.className = 'transition-bubble';
    el.style.setProperty('--tint', catalog[r.ids[0] - 1].color);
    el.style.width = `${d}px`;
    el.style.height = `${d}px`;
    el.innerHTML = completeOrb(r, d);
    layer.append(el);

    // Home position: the grid cell's centre, offset to the element's top left.
    const homeX = col * sx + sx / 2 - d / 2;
    const homeY = row * sy + sy / 2 - d / 2;

    items.push({
      el,
      record: r,
      index: i,
      col,
      row,
      d,
      homeX,
      homeY,
      // Each bubble enters on its own arm of the spiral.
      armAngle: (i / recs.length) * TAU * 2.2,
      armRadius: 900 + ((i * 53) % 420),
      depth: 260 + ((i * 37) % 300),
    });
  });
  return items;
}

// The vortex itself, mirroring scene 11's tribute stream: a perspective helix
// where a bubble's depth scales it and blurs it, so the crowd reads as a swirl
// with near and far members rather than a flat sheet of discs.
//
// phase 'cover': the bubbles spiral inward from off stage to their grid cells,
// arriving at full size and zero blur, which is the moment the stage is
// completely hidden and the scene swap happens behind them.
// phase 'reveal': they spiral back out, uncovering the new scene as they leave.
function transitionVortex(trans, phase, p) {
  const eased = outCubic(clamp(p, 0, 1));
  const t = phase === 'cover' ? 1 - eased : eased;
  const spin = trans.spinDir || 1;

  trans.items.forEach((item) => {
    // t is 1 when far out on the arm, 0 when home in the grid.
    const angle = item.armAngle + spin * t * 2.1;
    const radius = item.armRadius * t;
    const z = Math.sin(angle) * item.depth * t;
    const k = 1000 / (1000 - z);

    const cx = TRANSITION_COVER_W / 2 + Math.cos(angle) * radius;
    const cy = TRANSITION_COVER_H / 2 + Math.sin(angle) * radius * 0.52;
    const x = mix(item.homeX, cx - item.d / 2, t) * 1;
    const y = mix(item.homeY, cy - item.d / 2, t) * 1;

    const scale = mix(1, 0.34, t) * k;
    const blur = t > 0.02 ? Math.min(2.4, t * 3.1) : 0;
    const alpha = clamp(1 - t * 0.15, 0, 1);

    item.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    item.el.style.opacity = alpha.toFixed(3);
    item.el.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : 'none';
    item.el.style.zIndex = String(1000 + Math.round(z));
  });
}

function transitionCreateStormElements(layer) {
  const items = [];
  for (let i = 0; i < TRANSITION_BUBBLE_COUNT; i++) {
    const exprId = (i % 9) + 1;
    const cat = catalog[exprId - 1];
    const isHeart = i % 2 === 0;
    const el = document.createElement('div');
    el.className = isHeart ? 'transition-heart' : 'transition-petal';
    el.style.setProperty('--tint', cat.color);

    if (isHeart) {
      el.innerHTML = heartSVG(cat.color);
    }

    const img = document.createElement('img');
    img.className = 'transition-icon';
    img.src = ASSETS['icon' + exprId];
    img.alt = '';
    el.append(img);

    layer.append(el);
    items.push({ el, exprId, isHeart, d: isHeart ? 140 : 130, index: i });
  }
  return items;
}

function transitionCleanup() {
  const layer = $('transition-layer');
  if (layer) {
    layer.replaceChildren();
    layer.classList.remove('active');
  }
}

function transitionStart(styleId, oldRoot, prevSceneId, nextRoot) {
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
    duration: desc.duration || 2.5,
    items: [],
  };

  desc.init?.(trans, layer);
  desc.cover?.(trans, 0);

  return trans;
}

// Register Style 1: flood (sweeping wall across the stage from left, right, up, or down)
registerTransition('flood', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.spinDir = 1;
  },
  cover(trans, p) {
    transitionWashFade(trans, 'cover', p);
    transitionVortex(trans, 'cover', p);
  },
  reveal(trans, p) {
    transitionWashFade(trans, 'reveal', p);
    transitionVortex(trans, 'reveal', p);
  },
});

registerTransition('tide', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.spinDir = -1;
  },
  cover(trans, p) {
    transitionWashFade(trans, 'cover', p);
    transitionVortex(trans, 'cover', p);
  },
  reveal(trans, p) {
    transitionWashFade(trans, 'reveal', p);
    transitionVortex(trans, 'reveal', p);
  },
});

registerTransition('vortex', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.spinDir = 1;
  },
  cover(trans, p) {
    transitionWashFade(trans, 'cover', p);
    transitionVortex(trans, 'cover', p);
  },
  reveal(trans, p) {
    transitionWashFade(trans, 'reveal', p);
    transitionVortex(trans, 'reveal', p);
  },
});

registerTransition('storm', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.spinDir = -1;
  },
  cover(trans, p) {
    transitionWashFade(trans, 'cover', p);
    transitionVortex(trans, 'cover', p);
  },
  reveal(trans, p) {
    transitionWashFade(trans, 'reveal', p);
    transitionVortex(trans, 'reveal', p);
  },
});

