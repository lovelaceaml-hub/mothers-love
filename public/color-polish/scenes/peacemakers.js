// Scene 8: We Are Peacemakers.
//
// A faithful restore of what the live TV shows today (Plan 12 production,
// commit b7d92a0): the title copy, the globe artwork, and four message
// bubbles drawn by the shared orb/floater engine in core/orbs.js and
// core/motion.js. Anthony rejected the Plan 15 redesign of this scene (the
// rotating puzzle globe with detachable cards) on September 18; a redesign
// is a separate later plan (Plan 17, decision 9).
'use strict';

// Production's rightBubbles(), not the Plan 15 core's. Production shows one
// large reader bubble alone when any of the four chosen records does not
// fit a small bubble (renderer.js rightBubbles(), lines 159-164); the Plan
// 15 core's rightBubbles() always draws four and reorders by slot size via
// drawSlots' grow mechanism, which is a Plan 15 decision-10 behavior for the
// other, approved scenes and not what production does here. Named locally,
// never the global rightBubbles core/orbs.js already defines, so this never
// shadows it for anything else that may call it.
function peacemakersRightBubbles() {
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

function peacemakers() {
  return `<div style="position:absolute;left:12px;top:33px;width:829px"><div class="eyebrow">Mother’s Love in our community</div><h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1><p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p></div>${art('globe', 'left:271px;top:134px;width:604px;height:482px')}${peacemakersRightBubbles()}`;
}

registerScene(8, {
  markup: peacemakers,
  floaters: true,
  fxCanvas: true,
  // Matches production's tickSlots() scene-id branch (S.s===9?'hearts':
  // 'drift', so 'drift' for scene 8): steady bubbles drift off screen and
  // are replaced, same as scenes 4 and 8 in production.
  replaceMode: 'drift',
  // Matches production's forbidden() box for scene 8: keep floating bubbles
  // clear of the title copy over the top-left of the stage.
  keepOut: () => [{ x: 0, y: 8, w: 700, h: 296 }]
});
