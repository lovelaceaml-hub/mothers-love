// Scene 7: The Nine Expressions.
'use strict';

const expressions_ROW_Z = [-40, 0, -40];
const expressions_COL_ROTY = [7, 0, -7];

function nineScene(){
 let h = heading('The Nine Expressions', 'Words that bring peace.');
 h += `<div class="edu-step" id="edu-step">01-09 · THE COMPLETE PHRASES</div><div class="educational" id="educational">`;
 catalog.forEach((e, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = col * 611;
  const y = 91 + row * 177;
  const rotY = expressions_COL_ROTY[col];
  const tz = expressions_ROW_Z[row];
  h += `<article class="edu-card" id="edu-${e.id}" data-expression-id="${e.id}" data-col="${col}" data-row="${row}" style="left:${x}px;top:${y}px;width:590px;height:167px;--tint:${e.color};transform:translate3d(0px,0px,${tz}px) rotateY(${rotY}deg)">`
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
 return h + `</div><div class="edu-caption">One expression blossoms into focus on each visit.</div>`;
}

function tickEducation(){
 if(S.s !== 7 || !eduCards.length) return;
 const p = S.still ? 1 : ease((S.eduAge - 6) / 3);
 const chosen = S.bloomIndex;
 let other = 0;

 eduCards.forEach((el, i) => {
  const sel = (i + 1) === chosen;
  const col = i % 3;
  const row = Math.floor(i / 3);
  const baseRotY = expressions_COL_ROTY[col];
  const baseTz = expressions_ROW_Z[row];

  if(p <= 0){
   const x = col * 611;
   const y = 91 + row * 177;
   el.style.left = x + 'px';
   el.style.top = y + 'px';
   el.style.width = '590px';
   el.style.height = '167px';
   el.style.transform = `translate3d(0px, 0px, ${baseTz}px) rotateY(${baseRotY}deg)`;
   el.style.opacity = '1';
   el.style.zIndex = '1';
   el.classList.remove('focused', 'compact');
   const bloom = el.querySelector('.edu-bloom');
   if(bloom) bloom.style.opacity = '0';
  } else {
   const k = sel ? 0 : other++;
   const end = sel
    ? { x: 8, y: 90, w: 950, h: 530, z: 90, rotY: 0, opacity: 1, zIndex: 9 }
    : { x: 985 + (k % 2) * 419, y: 90 + Math.floor(k / 2) * 136, w: 403, h: 126, z: 0, rotY: 0, opacity: 0.7, zIndex: 1 };

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
