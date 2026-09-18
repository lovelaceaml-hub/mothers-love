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
