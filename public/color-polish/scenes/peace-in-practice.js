// Scene 9: Peace in Practice.
//
// A faithful restore of what the live TV shows today (Plan 12 production,
// commit b7d92a0): the title copy, the hands banner art, a rotating heart
// image, fourteen ambient floating hearts, and four message bubbles drawn by
// the shared orb/floater engine in core/orbs.js and core/motion.js. Anthony
// rejected the Plan 15 redesign of this scene (the 3D heart mesh and
// exploding message cards) on September 18; a redesign is a separate later
// plan (Plan 17, decision 9).
'use strict';

// Production's rightBubbles(), not the Plan 15 core's. Production shows one
// large reader bubble alone when any of the four chosen records does not
// fit a small bubble (renderer.js rightBubbles(), lines 159-164); the Plan
// 15 core's rightBubbles() always draws four and reorders by slot size via
// drawSlots' grow mechanism, which is a Plan 15 decision-10 behavior for the
// other, approved scenes and not what production does here. Named locally,
// never the global rightBubbles core/orbs.js already defines, so this never
// shadows it for anything else that may call it.
function peaceInPracticeRightBubbles() {
  const chosen = [];
  for (let i = 0; i < 4; i++) {
    const r = choose(chosen.map((a) => a.id));
    if (r) chosen.push(r);
  }
  const long = chosen.find((r) => !smallFits(r));
  if (long) return readerSlot(long, 861, 37, 925, 586);
  const ps = [[885, 23, 312], [1301, 26, 320], [824, 323, 304], [1454, 330, 295]];
  return chosen.map((r, i) => addOrb(r, ...ps[i])).join('');
}

function peaceScene() {
  return `<div style="position:absolute;left:12px;top:36px;width:861px"><div class="eyebrow">Peace in practice</div><h1 style="font-size:61px;letter-spacing:-2px;line-height:1.1;margin:23px 0">May Mother’s ${shimmer('love')}<br>bring ${shimmer('peace')} to the world!</h1><p class="subheading">Love expressed through words and actions.</p></div>${art('hands_banner', 'left:20px;top:393px;width:823px;height:238px;opacity:.8;mask-image:linear-gradient(transparent,#000 20%,#000 85%,transparent)')}<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px"></div><div id="heart-field"></div>${peaceInPracticeRightBubbles()}`;
}

// Fourteen small ambient hearts drifting behind the bubbles. Same count,
// layout and drift formula as production; not the Plan 15 explosion field.
function mountHearts() {
  const root = $('heart-field');
  if (!root) return;
  hearts = [];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    const size = 27 + (i % 4) * 13;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.innerHTML = heartSVG(i % 3 === 0 ? '#d6bbc9' : '#e9b1b9');
    root.append(el);
    hearts.push({ el, x: 24 + (i % 7) * 106, y: 276 + Math.floor(i / 7) * 135, phase: i, size });
  }
}

// Called every coordinator tick regardless of the current scene, same as
// production; a no-op whenever hearts is empty (any scene but this one).
function tickHearts(dt) {
  if (S.still) return;
  hearts.forEach((h, i) => {
    const y = 250 + (((h.y - 250 - S.t * (3 + i % 3)) % 330) + 330) % 330;
    h.el.style.transform = `translate(${h.x + Math.sin(S.t / 10 + i) * 22}px,${y}px) rotate(${Math.sin(S.t / 14 + i) * 12}deg) scale(${1 + Math.sin(S.t / 3 + i) * .025})`;
  });
}

// The rotating heart at scene center: a plain image rotated with CSS
// perspective, same as production. Not the Plan 15 3D canvas mesh renderer.
function createHeart() {
  const img = document.createElement('img');
  img.src = ASSETS.heart_render;
  img.alt = 'Sculpted rotating heart';
  img.style = 'width:100%;height:100%;object-fit:contain';
  return {
    canvas: img,
    draw: (t) => {
      img.style.transform = `perspective(800px) rotateY(${t * 7.5}deg)`;
    }
  };
}

function mountHeart() {
  const host = $('heart-host');
  if (!host) return;
  if (!heartRenderer) heartRenderer = createHeart();
  host.append(heartRenderer.canvas);
  heartRenderer.draw(S.t);
}

registerScene(9, {
  markup: peaceScene,
  mount() {
    mountHeart();
    mountHearts();
  },
  floaters: true,
  fxCanvas: true,
  replaceMode: 'hearts',
  // Matches production's forbidden() box for scene 9: keep floating bubbles
  // clear of the title copy over the top-left of the stage.
  keepOut: () => [{ x: 0, y: 10, w: 870, h: 276 }]
});
