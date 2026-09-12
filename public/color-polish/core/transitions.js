// Core transition registry, style definitions, and stage layer management.
'use strict';

const TRANSITIONS = Object.create(null);
const TRANSITION_STYLES = TRANSITIONS;
const TRANSITION_BUBBLE_COUNT = 24;
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
    const rng = randSeed(4801 + (S.idCounter || 0) * 59);
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

function transitionCreateBubbles(layer) {
  const items = [];
  for (let i = 0; i < TRANSITION_BUBBLE_COUNT; i++) {
    const exprId = (i % 9) + 1;
    const cat = catalog[exprId - 1];
    const el = document.createElement('div');
    el.className = 'transition-bubble';
    el.style.setProperty('--tint', cat.color);

    const d = 140 + ((i * 17) % 60);
    el.style.width = `${d}px`;
    el.style.height = `${d}px`;

    const inner = document.createElement('div');
    inner.className = 'transition-bubble-inner';

    const img = document.createElement('img');
    img.className = 'transition-icon';
    img.src = ASSETS['icon' + exprId];
    img.alt = '';
    inner.append(img);
    el.append(inner);

    layer.append(el);
    items.push({ el, exprId, d, index: i });
  }
  return items;
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
    trans.items = transitionCreateBubbles(layer);
    const rng = randSeed(54321 + (S.idCounter || 0) * 31 + Math.floor(S.t));
    trans.direction = TRANSITION_FLOOD_DIRS[Math.floor(rng() * 4)] || 'right';
  },
  cover(trans, p) {
    const dir = trans.direction;
    trans.items.forEach((item, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const targetX = 90 + col * 275 + ((row % 2) * 50);
      const targetY = 45 + row * 145 + ((col % 2) * 20);

      let startX = targetX;
      let startY = targetY;
      let stagger = 0;

      if (dir === 'right') {
        startX = targetX - 1950;
        stagger = (col / 5) * 0.28;
      } else if (dir === 'left') {
        startX = targetX + 1950;
        stagger = ((5 - col) / 5) * 0.28;
      } else if (dir === 'down') {
        startY = targetY - 800;
        stagger = (row / 3) * 0.28;
      } else {
        startY = targetY + 800;
        stagger = ((3 - row) / 3) * 0.28;
      }

      const q = clamp((p - stagger) / (1 - 0.28), 0, 1);
      const curX = mix(startX, targetX, outCubic(q));
      const curY = mix(startY, targetY, outCubic(q));
      const scale = mix(0.4, 1.0, outCubic(q));
      const alpha = clamp(q * 2, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
  reveal(trans, p) {
    const dir = trans.direction;
    trans.items.forEach((item, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const targetX = 90 + col * 275 + ((row % 2) * 50);
      const targetY = 45 + row * 145 + ((col % 2) * 20);

      let endX = targetX;
      let endY = targetY;
      let stagger = 0;

      if (dir === 'right') {
        endX = targetX + 1950;
        stagger = (col / 5) * 0.28;
      } else if (dir === 'left') {
        endX = targetX - 1950;
        stagger = ((5 - col) / 5) * 0.28;
      } else if (dir === 'down') {
        endY = targetY + 800;
        stagger = (row / 3) * 0.28;
      } else {
        endY = targetY - 800;
        stagger = ((3 - row) / 3) * 0.28;
      }

      const q = clamp((p - stagger) / (1 - 0.28), 0, 1);
      const curX = mix(targetX, endX, q * q);
      const curY = mix(targetY, endY, q * q);
      const scale = mix(1.0, 0.45, q);
      const alpha = clamp(1 - q * 1.4, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
});

// Register Style 2: tide (bubbles rise from the bottom and fill the stage)
registerTransition('tide', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.items = transitionCreateBubbles(layer);
  },
  cover(trans, p) {
    trans.items.forEach((item, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const targetX = 90 + col * 275 + ((row % 2) * 55);
      const targetY = 45 + row * 145 + ((i * 13) % 25);
      const startY = 700 + (i % 6) * 60;
      const stagger = (row / 3) * 0.24;

      const q = clamp((p - stagger) / (1 - 0.24), 0, 1);
      const curX = targetX + Math.sin(q * 4 + i) * 20;
      const curY = mix(startY, targetY, outCubic(q));
      const scale = mix(0.35, 1.0, outCubic(q));
      const alpha = clamp(q * 2, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
  reveal(trans, p) {
    trans.items.forEach((item, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const targetX = 90 + col * 275 + ((row % 2) * 55);
      const targetY = 45 + row * 145 + ((i * 13) % 25);
      const endY = -260 - (i % 6) * 50;
      const stagger = (row / 3) * 0.24;

      const q = clamp((p - stagger) / (1 - 0.24), 0, 1);
      const curX = targetX + Math.sin(q * 4 + i) * 25;
      const curY = mix(targetY, endY, q * q);
      const scale = mix(1.0, 1.15, q);
      const alpha = clamp(1 - q * q, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
});

// Register Style 3: vortex (bubbles gather to the centre, then burst outward to reveal)
registerTransition('vortex', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.items = transitionCreateBubbles(layer);
  },
  cover(trans, p) {
    const cx = 906;
    const cy = 318;
    trans.items.forEach((item, i) => {
      const theta = (i / 24) * TAU;
      const startR = 1100 + (i % 4) * 80;
      const centerR = 65 + (i % 6) * 35;

      const curTheta = theta + (1 - p) * 2.8;
      const curR = mix(startR, centerR, outCubic(p));
      const curX = cx + Math.cos(curTheta) * curR - (item.d / 2);
      const curY = cy + Math.sin(curTheta) * curR * 0.52 - (item.d / 2);
      const scale = mix(0.3, 1.06, outCubic(p));
      const alpha = clamp(p * 2, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
  reveal(trans, p) {
    const cx = 906;
    const cy = 318;
    trans.items.forEach((item, i) => {
      const theta = (i / 24) * TAU;
      const centerR = 65 + (i % 6) * 35;
      const burstR = 1400 + (i % 4) * 160;

      const burstTheta = theta + p * 0.7;
      const curR = mix(centerR, burstR, outCubic(p));
      const curX = cx + Math.cos(burstTheta) * curR - (item.d / 2);
      const curY = cy + Math.sin(burstTheta) * curR * 0.52 - (item.d / 2);
      const scale = mix(1.06, 0.35, p);
      const alpha = clamp(1 - p * 1.3, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
});

// Register Style 4: storm (petals and hearts instead of round bubbles)
registerTransition('storm', {
  duration: 2.5,
  coverDuration: 0.9,
  revealDuration: 1.6,
  init(trans, layer) {
    trans.items = transitionCreateStormElements(layer);
  },
  cover(trans, p) {
    trans.items.forEach((item, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const targetX = 90 + col * 280 + ((i * 31) % 40 - 20);
      const targetY = 50 + row * 145 + ((i * 23) % 40 - 20);
      const startX = targetX - 900 - (i % 4) * 120;
      const startY = targetY - 600 - (i % 3) * 100;
      const baseRot = (i * 37) % 60 - 30;

      const q = clamp(p * 1.15 - (i % 6) * 0.03, 0, 1);
      const curX = mix(startX, targetX, outCubic(q)) + Math.sin(q * 4 + i) * 25;
      const curY = mix(startY, targetY, outCubic(q)) + Math.cos(q * 3 + i) * 20;
      const rot = mix(-180, baseRot, outCubic(q));
      const scale = mix(0.3, 1.0, outCubic(q));
      const alpha = clamp(q * 2, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
  reveal(trans, p) {
    trans.items.forEach((item, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const targetX = 90 + col * 280 + ((i * 31) % 40 - 20);
      const targetY = 50 + row * 145 + ((i * 23) % 40 - 20);
      const endX = targetX + 1100 + (i % 4) * 150;
      const endY = targetY - 450 - (i % 3) * 100;
      const baseRot = (i * 37) % 60 - 30;

      const q = clamp(p * 1.15 - (i % 6) * 0.03, 0, 1);
      const curX = mix(targetX, endX, q * q) + Math.sin(q * 4 + i) * 35;
      const curY = mix(targetY, endY, q) + Math.cos(q * 3 + i) * 25;
      const rot = mix(baseRot, baseRot + 180, q);
      const scale = mix(1.0, 0.5, q);
      const alpha = clamp(1 - q * 1.2, 0, 1);

      item.el.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      item.el.style.opacity = alpha.toFixed(3);
    });
  },
});
