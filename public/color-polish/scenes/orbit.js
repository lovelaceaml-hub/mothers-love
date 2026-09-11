// Scene 10: Expression Orbit.
'use strict';

let ORBIT_BAG = [];
let ORBIT_LAST = 0;

function orbitNextId() {
  if (!ORBIT_BAG.length) {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = ids[i];
      ids[i] = ids[j];
      ids[j] = t;
    }
    if (ids[0] === ORBIT_LAST) {
      ids.push(ids.shift());
    }
    ORBIT_BAG = ids;
  }
  ORBIT_LAST = ORBIT_BAG.shift();
  return ORBIT_LAST;
}

function orbitScene() {
  const id = (S.sceneAge > 0.5 && ORBIT_LAST) ? ORBIT_LAST : orbitNextId();
  const e = catalog[id - 1], chosen = [];
  for (let i = 0; i < 4; i++) {
    const r = choose(chosen.map(x => x.r.id), id);
    if (r) chosen.push({ r, expression: id });
  }
  while (chosen.length < 4) {
    const r = choose(chosen.map(x => x.r.id));
    if (!r) break;
    chosen.push({ r, expression: null });
  }
  let h = heading('Expression Orbit', 'A shared expression. Many kind words.');
  h += `<div class="orbit-universe" id="orbit-universe"><canvas id="orbit-lines" class="orbit-lines" width="1812" height="552" aria-hidden="true"></canvas><div class="orbit-sun">${medallion(id)}<h2>${shimmer(e.name)}</h2><p>“${esc(e.phrase)}”</p><div class="sun-principle">${esc(e.principle)}</div></div>`;
  chosen.forEach(({ r, expression }, i) => {
    h += `<div class="planet-system" data-planet="${i}">${addOrb(r, 0, 0, 284, { expression, motion: false })}${r.ids.map((n, j) => `<span class="orbit-moon" data-moon="${j}" style="--tint:${catalog[n - 1].color}">${icon(n)}</span>`).join('')}</div>`;
  });
  if (!chosen.length) h += '<p class="subheading" style="position:absolute;left:50px;top:150px">No current recognitions for this expression.</p>';
  return h + '</div>';
}

function mountOrbit(){
 V.planets=slots.map((b,i)=>({b,el:b.el.parentElement,index:i,phase:i*TAU/Math.max(1,slots.length)+.3,moons:[...b.el.parentElement.querySelectorAll('.orbit-moon')],lastSwap:0}));
}

function projectOrbit(theta){
 const z=Math.sin(theta)*395,k=1420/(1420-z);
 return{x:906+Math.cos(theta)*632*k,y:270+Math.sin(theta)*46*k,z,k};
}

function tickOrbit(dt){
 const can=$('orbit-lines');if(!can)return;const c=can.getContext('2d');c.clearRect(0,0,1812,552);
 for(let n=0;n<2;n++){
 c.beginPath();for(let j=0;j<=160;j++){const a=j/160*TAU,p=projectOrbit(a),x=906+(p.x-906)*(1+n*.055),y=270+(p.y-270)*(1+n*.23);j?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=n?'#d4c3af2b':'#d3bb8840';c.lineWidth=1;c.stroke();
 }
 V.planets.forEach(p=>{
  const theta=p.phase+V.clock*.082,pos=projectOrbit(theta),b=p.b;
  p.z=pos.z;p.scale=pos.k;p.theta=theta;p.angle=theta;
  p.el.style.transform=`translate(${pos.x-b.d/2}px,${pos.y-b.d/2}px) scale(${pos.k})`;
  p.el.style.zIndex=String(Math.round(10000+pos.z));
  p.el.style.opacity=String(pos.z<0?.72+.28*(pos.z+395)/395:1);
  const blur=Math.min(1.8,Math.max(0,(-pos.z-100)/160));
  const shadow=`drop-shadow(0 ${(6*pos.k).toFixed(1)}px ${(10*pos.k).toFixed(1)}px #5C659240)`;
  p.el.style.filter=blur>0?`blur(${blur.toFixed(2)}px) ${shadow}`:shadow;
  b.x=pos.x-b.d/2;b.y=pos.y-b.d/2+84;
  if(b.reading)tickCirclePages(b,V.clock);
  p.moons.forEach((moon,j)=>{const a=V.clock*(.33+j*.04)+j*Math.PI+p.phase,mz=Math.sin(a)*52,k=600/(600-mz),r=157;moon.style.transform=`translate(${142+Math.cos(a)*r*k-21.5}px,${142+Math.sin(a)*50*k-21.5}px) scale(${k})`;moon.style.zIndex=mz>0?'4':'1';moon.style.opacity=mz>0?'1':'.8'});
  if(V.clock-p.lastSwap>24&&pos.z<-330){
   const r=choose(slots.map(x=>x.id),b.expression)||choose(slots.map(x=>x.id));if(r){b.id=r.id;b.el.dataset.recordId=r.id;b.el.innerHTML=`<div class="orb-life">${completeOrb(r,b.d)}</div>`;S.lastShown.set(r.id,S.t);bindNumbers(b.el);b.reading=fitCircle(b.el,r,b.d,V.clock);p.moons.forEach((el,j)=>{const id=r.ids[j%r.ids.length];el.innerHTML=icon(id);el.style.setProperty('--tint',catalog[id-1].color)});log('orbit_backside_replace',{id:r.id})}p.lastSwap=V.clock;
  }
 });
}

registerScene(10,{
 markup:orbitScene,
 mount:mountOrbit,
 tick:tickOrbit,
 prime:tickOrbit,
 archOpacity:'.13'
});
