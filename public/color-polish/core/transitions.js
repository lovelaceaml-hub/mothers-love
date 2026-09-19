// Every scene change on the live TV uses exactly one transition: the original
// Plan 12 gentle crossfade. Anthony's decision on 2026-09-18 keeps it this way
// for all ten scenes; no other transition style plays.
'use strict';

const TRANSITION_DURATION = 1.15;

function transitionCleanup() {
  const layer = $('transition-layer');
  if (layer) {
    layer.replaceChildren();
    layer.classList.remove('active');
  }
}

function transitionStart(oldRoot, prevSceneId, nextRoot) {
  if (S.still) return null;
  return {
    old: oldRoot,
    prev: prevSceneId,
    next: nextRoot,
    age: 0,
    duration: TRANSITION_DURATION,
  };
}

// Matches the live renderer's tickTransition frame formula exactly: old scene
// eases out with a slight leftward drift and shrink, next scene eases in with
// a slight rightward drift and grow, both driven by the same smoothstep ease.
function transitionFrame(trans) {
  const p = ease(trans.age / trans.duration);
  trans.old.style.opacity = 1 - p;
  trans.old.style.transform = `translateX(${-15 * p}px) scale(${1 - 0.004 * p})`;
  trans.next.style.opacity = p;
  trans.next.style.transform = `translateX(${20 * (1 - p)}px) scale(${0.997 + 0.003 * p})`;
  return p;
}

// Anthony, September 19: on a scene change the bubbles were already there.
// Now each bubble of the incoming scene fades and grows in on its own, one at a
// time in a shuffled order at uneven intervals. The first starts when the new
// scene is about half faded in, and the last has settled about 3.5 seconds
// after the change, however many bubbles the scene has. The bubble's own
// position and drift are untouched: the entrance only drives the --arrive-o
// and --arrive-s properties that transitions.css applies to the bubble's inner
// circle and rings.
const BUBBLE_ENTRANCE = { first: 0.55, spread: 2.2, maxGap: 0.45, duration: 0.85 };
let bubbleEntrance = null;

function backOut(q) {
  const s = 1.2;
  return 1 + (s + 1) * Math.pow(q - 1, 3) + s * Math.pow(q - 1, 2);
}

function bubbleEntranceStart(root) {
  bubbleEntrance = null;
  const bubbles = [...root.querySelectorAll('.orb-slot')];
  if (!bubbles.length) return;
  const rng = randSeed(hashText(S.s + ':' + bubbles.map((el) => el.dataset.recordId || '').join(',')) || 1);
  const order = bubbles.map((el) => ({ el, key: rng() })).sort((a, b) => a.key - b.key);
  const gap = order.length > 1 ? Math.min(BUBBLE_ENTRANCE.maxGap, BUBBLE_ENTRANCE.spread / (order.length - 1)) : 0;
  const items = order.map(({ el }, i) => ({
    el,
    delay: BUBBLE_ENTRANCE.first + i * gap + (i ? (rng() - 0.5) * gap * 0.6 : 0),
  }));
  bubbleEntrance = { root, age: 0, end: Math.max(...items.map((item) => item.delay)) + BUBBLE_ENTRANCE.duration, items };
  items.forEach((item) => {
    item.el.dataset.arriving = '';
    bubbleEntranceFrame(item, 0);
  });
  log('bubble_entrance_start', { scene: S.s, bubbles: items.length, end: +bubbleEntrance.end.toFixed(2) });
}

function bubbleEntranceFrame(item, age) {
  const q = clamp((age - item.delay) / BUBBLE_ENTRANCE.duration, 0, 1);
  item.el.style.setProperty('--arrive-o', smooth(q * 1.6).toFixed(3));
  item.el.style.setProperty('--arrive-s', (0.62 + 0.38 * backOut(q)).toFixed(4));
}

function bubbleEntranceClear(item) {
  delete item.el.dataset.arriving;
  item.el.style.removeProperty('--arrive-o');
  item.el.style.removeProperty('--arrive-s');
}

function tickBubbleEntrance(dt) {
  const entrance = bubbleEntrance;
  if (!entrance) return;
  entrance.age += dt;
  if (!entrance.root.isConnected || S.still || entrance.age >= entrance.end) {
    entrance.items.forEach(bubbleEntranceClear);
    bubbleEntrance = null;
    return;
  }
  entrance.items.forEach((item) => bubbleEntranceFrame(item, entrance.age));
}
