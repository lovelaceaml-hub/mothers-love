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
    // Long enough to see the vortex turn. Anthony: "the transition time doesnt
    // need to be limited to whatever it is now." At 0.9 s of cover the crowd
    // could not complete a visible revolution; 2.6 s in and 2.6 s out gives
    // TRANSITION_TURNS revolutions each way at a readable speed. Scene dwells
    // are 30 s and up, so a 5.2 s change is a small share of any scene.
    duration: 5.2,
    coverDuration: 2.6,
    revealDuration: 2.6,
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
// Denser and bigger. Anthony, 2026-09-12: "just like that vortex but bigger
// with more recognitions." A 10 by 7 grid over 1920 by 1080 gives sx 192 and
// sy 154.3, so full coverage needs a radius of at least
// sqrt(192^2 + 154.3^2) / 2 = 123.2 and a diameter of 247. These stay at 300,
// so 70 bubbles cover the screen with generous overlap and read as a crowd
// rather than a tiling.
const TRANSITION_GRID_COLS = 10;
const TRANSITION_GRID_ROWS = 7;
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

    // Home position: the grid cell's centre. Kept in polar form about the
    // centre of the screen, because the vortex moves in polar coordinates.
    const homeCx = col * sx + sx / 2;
    const homeCy = row * sy + sy / 2;
    const dx = homeCx - TRANSITION_COVER_W / 2;
    const dy = (homeCy - TRANSITION_COVER_H / 2) / 0.62;
    const homeRadius = Math.hypot(dx, dy);
    const homeAngle = Math.atan2(dy, dx);

    items.push({
      el,
      record: r,
      index: i,
      col,
      row,
      d,
      homeRadius,
      homeAngle,
      // Each bubble has its own place on the helix and its own moment of
      // arrival, so the crowd flows through rather than snapping into place.
      depth: 260 + ((i * 37) % 340),
      // Staggered along the direction of travel: bubbles nearer the entry edge
      // arrive first, which is what makes it read as a flow.
      flowStagger: (col / (TRANSITION_GRID_COLS - 1)) * 0.5 + (row / (TRANSITION_GRID_ROWS - 1)) * 0.5,
    });
  });
  return items;
}

// An actual vortex: the crowd ORBITS the centre, several full turns, spiralling
// inward until it fills the screen and then spiralling back out.
//
// Anthony had to say this three times, so the record should be blunt about why.
// The first attempt swept decorative discs across a visible background. The
// second covered with a flat colour wash. The third translated the crowd along
// a straight line with one sinusoidal wobble and advanced the rotation by about
// 2.1 radians, a third of a turn, over a 0.9 second cover. None of those is a
// vortex: a vortex is rotation around a centre, and a third of a turn in under
// a second is invisible. "i dont understnad how you arent understanding that.
// the transition time doesnt need to be limited to whatever it is now."
//
// So: polar motion about the centre of the screen. Each bubble keeps its grid
// home, expressed in polar coordinates, and travels in on a spiral that
// advances TRANSITION_TURNS full revolutions while its radius collapses from
// far outside the screen to its home. The whole funnel is also offset toward
// the entry side on the way in and toward the exit side on the way out, so it
// arrives from one direction and departs in another while spinning throughout.
// Depth comes from the orbit angle, so bubbles swing toward and away from the
// viewer, scaling and blurring, which is the helix scene 11's tribute stream
// uses.
// Four revolutions each way. At 2.6 the measured rotation of a single bubble
// came to under two turns once the per-bubble stagger and the easing were
// accounted for, which still reads as a swirl rather than a vortex.
const TRANSITION_TURNS = 4;
const TRANSITION_FAR_RADIUS = 2100;
const TRANSITION_FUNNEL_OFFSET = 620;

const TRANSITION_FLOWS = [
  { id: 'rise', entry: [-0.4, 1], exit: [0.4, -1], spin: 1 },
  { id: 'sweep', entry: [-1, 0.3], exit: [1, -0.3], spin: -1 },
  { id: 'fall', entry: [0.35, -1], exit: [-0.35, 1], spin: 1 },
  { id: 'cross', entry: [-1, -0.6], exit: [1, 0.6], spin: -1 },
];

function transitionNormalize(v) {
  const len = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / len, v[1] / len];
}

function transitionVortex(trans, phase, p) {
  const flow = trans.flow || TRANSITION_FLOWS[0];
  const spin = flow.spin || 1;
  const vec = transitionNormalize(phase === 'cover' ? flow.entry : flow.exit);
  const eased = outCubic(clamp(p, 0, 1));

  trans.items.forEach((item) => {
    // t is 1 far out on the spiral, 0 home in the grid.
    const stagger = item.flowStagger;
    const q = clamp((eased - stagger * 0.3) / (1 - 0.3), 0, 1);
    const t = phase === 'cover' ? 1 - q : q;

    // Several full revolutions about the centre. This is the vortex.
    const angle = item.homeAngle + spin * t * TRANSITION_TURNS * TAU;
    const radius = item.homeRadius + t * TRANSITION_FAR_RADIUS;

    // The funnel's own centre slides toward the entry side on the way in and
    // toward the exit side on the way out.
    const fx = TRANSITION_COVER_W / 2 + vec[0] * TRANSITION_FUNNEL_OFFSET * t;
    const fy = TRANSITION_COVER_H / 2 + vec[1] * TRANSITION_FUNNEL_OFFSET * t;

    // Depth from the orbit angle: bubbles swing toward and away from us. It
    // must fall to exactly zero at full cover, or the perspective factor k
    // displaces every bubble off its grid cell at the very moment the crowd is
    // supposed to tile the screen, which is what held coverage at 95 percent.
    const z = Math.sin(angle) * item.depth * t;
    const k = 1000 / (1000 - z);

    const x = fx + Math.cos(angle) * radius * k - item.d / 2;
    const y = fy + Math.sin(angle) * radius * 0.62 * k - item.d / 2;

    const scale = mix(1, 0.42, t) * k;
    const blur = t > 0.03 ? Math.min(2.8, t * 3.2) : 0;
    const alpha = clamp(1 - t * 0.1, 0, 1);

    item.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
    item.el.style.opacity = alpha.toFixed(3);
    item.el.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : 'none';
    item.el.style.zIndex = String(1000 + Math.round(z));
  });
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
  duration: 5.2,
  coverDuration: 2.6,
  revealDuration: 2.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.flow = TRANSITION_FLOWS[0];
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
  duration: 5.2,
  coverDuration: 2.6,
  revealDuration: 2.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.flow = TRANSITION_FLOWS[1];
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
  duration: 5.2,
  coverDuration: 2.6,
  revealDuration: 2.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.flow = TRANSITION_FLOWS[2];
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
  duration: 5.2,
  coverDuration: 2.6,
  revealDuration: 2.6,
  init(trans, layer) {
    trans.wash = transitionCreateWash(layer);
    trans.items = transitionCreateBubbles(layer);
    trans.flow = TRANSITION_FLOWS[3];
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

