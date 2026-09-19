// Scene 7: The Nine Expressions.
'use strict';

// Tilt (rotateY) and drift (translateZ) values below are the approved Plan 15 motion and are
// never changed by Plan 17. Only static layout numbers (position and size) move inward here.
//
// Inset budget (Plan 17 review round 1). The TV cuts at the scene box, not the screen: the scene
// has overflow:hidden and is 1812 x 636 inside a 1920 x 1080 frame, so every number here is in
// scene coordinates and every painted edge must stay at least 16px (1920) / 32px (3840) inside
// that box. Each card's reach is its own left/top/width/height, plus what the motion adds (the
// side that tilts toward the viewer grows under the 1600px perspective, and translateZ 90 scales
// the focused panel by 1600 / 1510, about 1.06, around the scene centre 906, 318), plus its
// box-shadow: 7px at the sides and 20px below for every card, and for the focused panel a 3px ring
// inside a 55px glow on every side and a drop shadow reaching 56px below, all times that 1.06.
// The focused panel's x of 124 is therefore the smallest left that keeps the glow 16px clear of
// the scene's left edge (124 - 906 = -782, times 1.06 = -829 from centre = 77 local, minus 58
// glow = 19). Its top keeps the title 16px clear and its bottom keeps the drop shadow 16px clear.
const expressions_ROW_Z = [-40, 0, -40];
const expressions_COL_ROTY = [7, 0, -7];
const EXPRESSIONS_FOCUS_START = 6;
const EXPRESSIONS_FOCUS_CYCLE = 10;
const EXPRESSIONS_FOCUS_RAMP = 2.4;

// Grid layout: the outer columns tilt their outside edge toward the viewer, so they sit 44px in
// from each side (Plan 15 used 0 and a 590px width, which put the tilted edge past the scene box).
// The top row starts at 96 so the outer cards' tilted top corners stay 16px below the title's line
// box (91 left 11.7px). Rows are 158px on a 171px step so the bottom row's contact shadow still ends
// clear above the scene edge.
const EXPRESSIONS_GRID_COL_X = [44, 626, 1208];
const EXPRESSIONS_GRID_COL_W = 560;
const EXPRESSIONS_GRID_ROW_Y = [96, 267, 438];
const EXPRESSIONS_GRID_ROW_H = 158;

// Focused-panel target (see the budget above): left clear of the glow, top 16px below the title,
// right edge clear of the compact column.
const EXPRESSIONS_FOCUS_TARGET = { x: 124, y: 110, w: 916, h: 437, z: 90, rotY: 0, opacity: 1, zIndex: 9 };
// Compact-card target: the right column ends at 1776 so a middle-row, right-column card, which
// starts its move still tilted -7 degrees with its right edge toward the viewer, keeps its edge
// and side shadow 16px inside the scene; four rows end at 598 so the bottom shadow clears too.
const EXPRESSIONS_COMPACT_X = [1068, 1430];
const EXPRESSIONS_COMPACT_ROW_STEP = 129;
const EXPRESSIONS_COMPACT_W = 346;
const EXPRESSIONS_COMPACT_H = 121;
const EXPRESSIONS_COMPACT_Y = 90;

function nineScene(){
 let h = heading('The Nine Expressions', 'Words that bring peace.');
 h += `<div class="edu-step" id="edu-step">01-09 · THE COMPLETE PHRASES</div><div class="educational" id="educational">`;
 catalog.forEach((e, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = EXPRESSIONS_GRID_COL_X[col];
  const y = EXPRESSIONS_GRID_ROW_Y[row];
  const rotY = expressions_COL_ROTY[col];
  const tz = expressions_ROW_Z[row];
  h += `<article class="edu-card" id="edu-${e.id}" data-expression-id="${e.id}" data-col="${col}" data-row="${row}" style="left:${x}px;top:${y}px;width:${EXPRESSIONS_GRID_COL_W}px;height:${EXPRESSIONS_GRID_ROW_H}px;--tint:${e.color};transform:translate3d(0px,0px,${tz}px) rotateY(${rotY}deg)">`
     + `<div class="edu-front">`
     + `<div class="edu-header">${medallion(e.id)}<div><div class="edu-category">${esc(e.name)}</div><span class="edu-number">${String(e.id).padStart(2, '0')} / 09</span></div></div>`
     + `<p class="edu-phrase">“${esc(e.phrase)}”</p>`
     + `</div>`
     + `<div class="edu-detail">`
     + `<div class="edu-header">${medallion(e.id)}<div><div class="eyebrow">Expression ${String(e.id).padStart(2, '0')} of 09</div><h2>${shimmer(e.name)}</h2></div></div>`
     + `<p class="edu-phrase">“${esc(e.phrase)}”</p>`
     + `<p class="edu-principle">${esc(e.principle)}</p>`
     + `<p class="edu-explanation">${esc(GUIDANCE[i])}</p>`
     + `<div class="edu-source">Supporting guidance adapted from the official About Campaign page.<br>The approved expression and principle above retain the supplied catalog.</div>`
     + `</div>`
     + `<div class="edu-bloom" aria-hidden="true">${Array.from({length: 6}, (_, n) => `<i class="edu-petal" style="--angle:${n * 60}deg"></i>`).join('')}${Array.from({length: 6}, (_, n) => `<i class="edu-spark" style="--angle:${n * 60 + 30}deg"></i>`).join('')}</div>`
     + `</article>`;
 });
 return h + `</div><div class="edu-caption">The stage turns through the complete set of expressions.</div>`;
}

// Plan 17 Lane 7: the view switch is a movement, not a cut. Tilt, drift and the 6 / 10 / 2.4 timing
// above are untouched; the numbers below only describe the new glide between arrangements.
//
// Every arrangement change (grid to focus, focus to the next focus, focus back to grid) runs for
// EXPRESSIONS_MOVE_SECONDS with an eased progress m. A card's visual rectangle (what the viewer
// sees after perspective) is interpolated from where it rested to where it will rest, and the
// card is put there with transform only: translate() scale() in front of the unchanged
// translate3d() rotateY() pose. Left, top, width, height and the focused / compact look change
// exactly once per move, at EXPRESSIONS_MOVE_SWAP, while the card's words are faded out
// (opacity only), so nothing is laid out per frame. While a card moves it carries no box-shadow
// (a scaled shadow would reach past the 16px edge budget); the shadow and the focus glow return
// when it lands.
const EXPRESSIONS_MOVE_SECONDS = 1.1;
const EXPRESSIONS_MOVE_SWAP = 0.5;
const EXPRESSIONS_MOVE_FADE_OUT = 0.5;
const EXPRESSIONS_MOVE_FADE_IN = 0.5;
// The visit ends back on the all-nine grid for at least this long, so the scene never leaves in
// the middle of a focus that has just begun.
const EXPRESSIONS_RETURN_HOLD = 4;
// The focused panel lets its glow fade (the 700ms fade it always had, in place) during the last
// moments of its hold, so nothing pops off when it takes flight.
const EXPRESSIONS_GLOW_LEAD = 0.8;
const EXPRESSIONS_PERSPECTIVE = 1600;
const EXPRESSIONS_CENTER = { x: 906, y: 318 };
let expressions_moveKey = null;
let expressions_ghost = null;

function expressionsMoveEase(t){
 // Smootherstep: no speed and no acceleration at either end, so cards lift off and land softly.
 t = clamp(t, 0, 1);
 return t * t * t * (t * (t * 6 - 15) + 10);
}

// The visit plan, read from the dwell in state (never hardcoded): grid until 6 s, then one focus
// every 10 s for as many whole focuses as fit before the closing grid hold, then the reverse move
// back to the grid. 30 s gives two focuses and the grid from 26 s; 60 s gives five and the grid
// from 56 s. A scene held past its dwell (rotation paused, Studio preview) repeats the plan and
// carries on to the following expressions.
function expressionsPlan(){
 const dwell = Number(S.dwell?.[7]) || DWELL[7] || 30;
 const focuses = Math.max(1, Math.floor((dwell - EXPRESSIONS_FOCUS_START - EXPRESSIONS_RETURN_HOLD) / EXPRESSIONS_FOCUS_CYCLE));
 const returnAt = EXPRESSIONS_FOCUS_START + focuses * EXPRESSIONS_FOCUS_CYCLE;
 return { dwell, focuses, returnAt, period: Math.max(dwell, returnAt + EXPRESSIONS_RETURN_HOLD) };
}

// Where the visit stands at a scene age: the arrangement on stage (cur, an expression id or 0 for
// the grid), the one before it (prev), the unchanged tilt ramp p, and the eased move progress m.
function expressionsTimeline(age){
 if(S.still) return { cur: S.bloomIndex, prev: S.bloomIndex, chosen: S.bloomIndex, p: 1, m: 1, key: 'still' };
 const plan = expressionsPlan();
 const loop = Math.max(0, Math.floor(age / plan.period));
 const a = age - loop * plan.period;
 const idAt = n => ((S.bloomIndex - 1 + loop * plan.focuses + n) % catalog.length + catalog.length) % catalog.length + 1;
 if(a < EXPRESSIONS_FOCUS_START) return { cur: 0, prev: 0, chosen: idAt(0), p: 0, m: 1, key: loop + ':grid' };
 if(a < plan.returnAt){
  const focusAge = a - EXPRESSIONS_FOCUS_START;
  const cycle = Math.floor(focusAge / EXPRESSIONS_FOCUS_CYCLE);
  const cycleAge = focusAge % EXPRESSIONS_FOCUS_CYCLE;
  return { cur: idAt(cycle), prev: cycle ? idAt(cycle - 1) : 0, chosen: idAt(cycle), settling: cycleAge >= EXPRESSIONS_FOCUS_CYCLE - EXPRESSIONS_GLOW_LEAD, p: ease(clamp(cycleAge / EXPRESSIONS_FOCUS_RAMP, 0.02, 1)), m: expressionsMoveEase(cycleAge / EXPRESSIONS_MOVE_SECONDS), key: loop + ':' + cycle };
 }
 // On the way back the tilt and depth return with the glide itself (p = 1 - m), so a card is in its
 // exact grid pose the moment it lands. Holding the focused panel's forward depth any longer would
 // magnify a card at an outer grid place past the 16px edge budget.
 const backAge = a - plan.returnAt;
 const back = expressionsMoveEase(backAge / EXPRESSIONS_MOVE_SECONDS);
 return { cur: 0, prev: idAt(plan.focuses - 1), chosen: idAt(plan.focuses - 1), p: 1 - back, m: back, key: loop + ':back' };
}

// A card's box, resting pose and look under an arrangement (focusId 0 is the all-nine grid).
function expressionsSlot(focusId, i){
 const col = i % 3;
 const row = Math.floor(i / 3);
 if(!focusId) return { role: 'grid', x: EXPRESSIONS_GRID_COL_X[col], y: EXPRESSIONS_GRID_ROW_Y[row], w: EXPRESSIONS_GRID_COL_W, h: EXPRESSIONS_GRID_ROW_H, z: expressions_ROW_Z[row], rotY: expressions_COL_ROTY[col], opacity: 1, zIndex: 1 };
 if(i + 1 === focusId) return { role: 'focused', ...EXPRESSIONS_FOCUS_TARGET };
 const k = i + 1 < focusId ? i : i - 1;
 return { role: 'compact', x: EXPRESSIONS_COMPACT_X[k % 2], y: EXPRESSIONS_COMPACT_Y + Math.floor(k / 2) * EXPRESSIONS_COMPACT_ROW_STEP, w: EXPRESSIONS_COMPACT_W, h: EXPRESSIONS_COMPACT_H, z: 0, rotY: 0, opacity: 0.7, zIndex: 1 };
}

// The depth scale of a tilted card's left and right edges under the scene's perspective: rotateY
// swings one edge toward the viewer and the other away, and each is magnified about the scene
// centre by perspective / (perspective - depth).
function expressionsEdgeScales(box, z, rotY){
 const swing = box.w / 2 * Math.sin(rotY * Math.PI / 180);
 return { left: EXPRESSIONS_PERSPECTIVE / (EXPRESSIONS_PERSPECTIVE - (z + swing)), right: EXPRESSIONS_PERSPECTIVE / (EXPRESSIONS_PERSPECTIVE - (z - swing)) };
}

// The rectangle the viewer sees (the bounding box after tilt, depth and perspective) for a box
// resting at depth z and tilt rotY, in scene coordinates.
function expressionsVisual(box, z, rotY){
 const K = expressionsEdgeScales(box, z, rotY);
 const near = Math.max(K.left, K.right), far = Math.min(K.left, K.right);
 const half = box.w / 2 * Math.cos(rotY * Math.PI / 180);
 const mid = box.x + box.w / 2 - EXPRESSIONS_CENTER.x;
 const top = box.y - EXPRESSIONS_CENTER.y, bottom = box.y + box.h - EXPRESSIONS_CENTER.y;
 return {
  l: EXPRESSIONS_CENTER.x + (mid - half) * K.left,
  r: EXPRESSIONS_CENTER.x + (mid + half) * K.right,
  t: EXPRESSIONS_CENTER.y + top * (top < 0 ? near : far),
  b: EXPRESSIONS_CENTER.y + bottom * (bottom > 0 ? near : far)
 };
}

// The translate and scale that, placed in front of the pose, make the box at depth z and tilt
// rotY appear exactly as the wanted rectangle. The inverse of expressionsVisual, so a card that
// is already where it should be gets translate 0 and scale 1.
function expressionsSolve(box, z, rotY, want){
 const K = expressionsEdgeScales(box, z, rotY);
 const near = Math.max(K.left, K.right), far = Math.min(K.left, K.right);
 const half = box.w / 2 * Math.cos(rotY * Math.PI / 180);
 const pl = (want.l - EXPRESSIONS_CENTER.x) / K.left, pr = (want.r - EXPRESSIONS_CENTER.x) / K.right;
 const qt = (want.t - EXPRESSIONS_CENTER.y) / (want.t < EXPRESSIONS_CENTER.y ? near : far);
 const qb = (want.b - EXPRESSIONS_CENTER.y) / (want.b > EXPRESSIONS_CENTER.y ? near : far);
 return {
  tx: (pl + pr) / 2 + EXPRESSIONS_CENTER.x - (box.x + box.w / 2),
  ty: (qt + qb) / 2 + EXPRESSIONS_CENTER.y - (box.y + box.h / 2),
  sx: (pr - pl) / (2 * half),
  sy: (qb - qt) / box.h
 };
}

function expressionsClearGhost(){
 expressions_ghost?.remove();
 expressions_ghost = null;
 const stage = eduCards[0]?.parentNode;
 if(stage) stage.style.opacity = '';
}

// Reduced motion (only reachable when the owner forces lively motion on a reduced-motion device;
// otherwise the scene is still): no card travels. A frozen copy of the old arrangement fades out
// over the new one fading in.
function expressionsCrossfade(T, reduced){
 const stage = eduCards[0]?.parentNode;
 if(!stage) return;
 if(reduced && T.m < 1 && expressions_moveKey !== null && expressions_moveKey !== T.key){
  expressionsClearGhost();
  const ghost = stage.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.classList.add('edu-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  stage.parentNode.insertBefore(ghost, stage);
  expressions_ghost = ghost;
 }
 expressions_moveKey = T.key;
 if(!expressions_ghost) return;
 if(!reduced || T.m >= 1){ expressionsClearGhost(); return; }
 expressions_ghost.style.opacity = String(1 - T.m);
 stage.style.opacity = String(T.m);
}

function tickEducation(){
 if(S.s !== 7 || !eduCards.length) return;
 const T = expressionsTimeline(S.eduAge);
 const reduced = !S.still && reducedMotionPreferred;
 const p = T.p;
 expressionsCrossfade(T, reduced);

 eduCards.forEach((el, i) => {
  const base = expressionsSlot(0, i);
  const from = expressionsSlot(T.prev, i);
  const to = expressionsSlot(T.cur, i);
  const sel = T.cur !== 0 && (i + 1) === T.cur;
  // Every card counts as moving through a change of arrangement, including one that keeps its
  // slot: the Plan 15 ramp resets its tilt and depth at that moment, and the solve below is what
  // keeps it visually where it was.
  const moving = !reduced && T.m < 1 && T.prev !== T.cur;
  const box = moving && T.m < EXPRESSIONS_MOVE_SWAP ? from : to;

  // Tilt and drift, exactly as Plan 15: grid pose at p = 0, resting pose at p = 1. On the way back
  // to the grid p runs from 1 to 0, so the same ramp plays in reverse.
  const rest = T.cur ? to : from;
  const curZ = S.still ? to.z : lerp(base.z, rest.z, p);
  const curRotY = S.still ? to.rotY : lerp(base.rotY, rest.rotY, p);
  const pose = `translate3d(0px, 0px, ${curZ}px) rotateY(${curRotY}deg)`;

  el.style.left = box.x + 'px';
  el.style.top = box.y + 'px';
  el.style.width = box.w + 'px';
  el.style.height = box.h + 'px';
  el.classList.toggle('focused', box.role === 'focused');
  el.classList.toggle('compact', box.role === 'compact');
  el.classList.toggle('edu-moving', moving);
  el.classList.toggle('edu-settling', !moving && sel && T.settling === true);
  el.style.zIndex = String(moving && from.role === 'focused' ? 8 : to.zIndex);
  // Focus to focus keeps every card's brightness continuous; grid to focus and back keep the
  // Plan 15 ramp.
  el.style.opacity = S.still ? String(to.opacity)
   : T.cur && T.prev ? String(lerp(from.opacity, to.opacity, T.m))
   : String(lerp(1, rest.opacity, p));

  const front = el._eduFront || (el._eduFront = el.querySelector('.edu-front'));
  const detail = el._eduDetail || (el._eduDetail = el.querySelector('.edu-detail'));
  if(moving){
   const start = expressionsVisual(from, from.z, from.rotY);
   const end = expressionsVisual(to, curZ, curRotY);
   const want = { l: lerp(start.l, end.l, T.m), r: lerp(start.r, end.r, T.m), t: lerp(start.t, end.t, T.m), b: lerp(start.b, end.b, T.m) };
   const { tx, ty, sx, sy } = expressionsSolve(box, curZ, curRotY, want);
   el.style.transform = `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px) scale(${sx.toFixed(5)}, ${sy.toFixed(5)}) ${pose}`;
   // The words keep their shape (one uniform scale, anchored top left) inside the stretching
   // card, fade out before the swap and fade in as the new look after it.
   const fade = from.role === to.role ? 1
    : T.m < EXPRESSIONS_MOVE_SWAP ? 1 - ease(T.m / EXPRESSIONS_MOVE_FADE_OUT)
    : ease((T.m - EXPRESSIONS_MOVE_FADE_IN) / (1 - EXPRESSIONS_MOVE_FADE_IN));
   const unit = Math.min(sx, sy);
   const shown = box.role === 'focused' ? detail : front;
   const hidden = box.role === 'focused' ? front : detail;
   if(shown){ shown.style.opacity = String(fade); shown.style.transformOrigin = '0 0'; shown.style.transform = `scale(${(unit / sx).toFixed(5)}, ${(unit / sy).toFixed(5)})`; }
   if(hidden){ hidden.style.opacity = '0'; hidden.style.transform = ''; }
  } else {
   el.style.transform = pose;
   for(const layer of [front, detail]){
    if(!layer) continue;
    layer.style.opacity = '';
    layer.style.transform = '';
    layer.style.transformOrigin = '';
   }
  }

  const bloom = el.querySelector('.edu-bloom');
  if(bloom){
   if(sel && !S.still && p > 0 && p < 1){
    const bloomOp = Math.sin(Math.PI * p) * 0.75;
    bloom.style.opacity = String(bloomOp);
    const petals = bloom.querySelectorAll('.edu-petal');
    petals.forEach((petal, n) => {
     const rad = (n * 60) * (Math.PI / 180);
     const dist = p * 160;
     petal.style.transform = `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px) rotate(${n * 60 + p * 45}deg) scale(${1 - p * 0.3})`;
    });
    const sparks = bloom.querySelectorAll('.edu-spark');
    sparks.forEach((spark, n) => {
     const rad = (n * 60 + 30) * (Math.PI / 180);
     const dist = p * 220;
     spark.style.transform = `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px) rotate(${n * 60 + p * 45}deg) scale(${1 - p * 0.4})`;
    });
   } else {
    bloom.style.opacity = '0';
   }
  }
 });

 const step = $('edu-step');
 if(step){
  step.textContent = T.cur
   ? 'IN FOCUS · ' + catalog[T.cur - 1].name.toUpperCase() + ' · ' + String(T.cur).padStart(2, '0') + '/09'
   : '01-09 · THE COMPLETE PHRASES';
 }
}

registerScene(7, {
 markup: nineScene,
 archOpacity: '.13',
 mount(root){
  eduCards = [...root.querySelectorAll('.edu-card')];
  expressions_moveKey = null;
  expressions_ghost = null;
  tickEducation();
 },
 tickAge(dt){
  S.eduAge += dt;
  tickEducation();
 },
 onLeave(root){
  eduCards = [];
  expressions_ghost = null;
  expressions_moveKey = null;
 }
});
