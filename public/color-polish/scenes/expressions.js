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

function tickEducation(){
 if(S.s !== 7 || !eduCards.length) return;
 const focusAge = S.eduAge - EXPRESSIONS_FOCUS_START;
 const cycle = S.still ? 0 : Math.max(0, Math.floor(focusAge / EXPRESSIONS_FOCUS_CYCLE));
 const chosen = ((S.bloomIndex - 1 + cycle) % catalog.length) + 1;
 const cycleAge = S.still ? EXPRESSIONS_FOCUS_RAMP : focusAge < 0 ? 0 : focusAge % EXPRESSIONS_FOCUS_CYCLE;
 const p = S.still ? 1 : focusAge < 0 ? 0 : ease(clamp(cycleAge / EXPRESSIONS_FOCUS_RAMP, 0.02, 1));
 let other = 0;

 eduCards.forEach((el, i) => {
  const sel = (i + 1) === chosen;
  const col = i % 3;
  const row = Math.floor(i / 3);
  const baseRotY = expressions_COL_ROTY[col];
  const baseTz = expressions_ROW_Z[row];

  if(p <= 0){
   const x = EXPRESSIONS_GRID_COL_X[col];
   const y = EXPRESSIONS_GRID_ROW_Y[row];
   el.style.left = x + 'px';
   el.style.top = y + 'px';
   el.style.width = EXPRESSIONS_GRID_COL_W + 'px';
   el.style.height = EXPRESSIONS_GRID_ROW_H + 'px';
   el.style.transform = `translate3d(0px, 0px, ${baseTz}px) rotateY(${baseRotY}deg)`;
   el.style.opacity = '1';
   el.style.zIndex = '1';
   el.classList.remove('focused', 'compact');
   const bloom = el.querySelector('.edu-bloom');
   if(bloom) bloom.style.opacity = '0';
  } else {
   const k = sel ? 0 : other++;
   const end = sel
    ? EXPRESSIONS_FOCUS_TARGET
    : { x: EXPRESSIONS_COMPACT_X[k % 2], y: EXPRESSIONS_COMPACT_Y + Math.floor(k / 2) * EXPRESSIONS_COMPACT_ROW_STEP, w: EXPRESSIONS_COMPACT_W, h: EXPRESSIONS_COMPACT_H, z: 0, rotY: 0, opacity: 0.7, zIndex: 1 };

   el.style.left = end.x + 'px';
   el.style.top = end.y + 'px';
   el.style.width = end.w + 'px';
   el.style.height = end.h + 'px';
   el.classList.toggle('focused', sel);
   el.classList.toggle('compact', !sel);
   el.style.zIndex = String(end.zIndex);
   el.style.opacity = S.still ? String(end.opacity) : String(lerp(1, end.opacity, p));

   const curZ = S.still ? end.z : lerp(baseTz, end.z, p);
   const curRotY = S.still ? end.rotY : lerp(baseRotY, end.rotY, p);
   el.style.transform = `translate3d(0px, 0px, ${curZ}px) rotateY(${curRotY}deg)`;

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
  }
 });

 const step = $('edu-step');
 if(step){
  step.textContent = p > 0
   ? 'IN FOCUS · ' + catalog[chosen - 1].name.toUpperCase() + ' · ' + String(chosen).padStart(2, '0') + '/09'
   : '01-09 · THE COMPLETE PHRASES';
 }
}

registerScene(7, {
 markup: nineScene,
 archOpacity: '.13',
 mount(root){
  eduCards = [...root.querySelectorAll('.edu-card')];
  tickEducation();
 },
 tickAge(dt){
  S.eduAge += dt;
  tickEducation();
 },
 onLeave(root){
  eduCards = [];
 }
});
