// Scene 3: Recognition Arrival.
'use strict';

const SINGLE_STYLES=['Through the light','Comet sweep','A thousand kind sparks','Pearl spring','Spiral bloom','Petals into pearl'];
const GROUP_STYLES=['Cascading constellation','Two tides, one wave','Spiral constellation','Petal fountains','Ripple of kindness'];
const GROUP_TITLES=['A new wave of Mother’s Love.','Kindness is being shared.','A constellation of kind words.','A garden of appreciation blooms.','Five expressions. One shared moment.'];
const ARRIVAL_FRAME_STYLES=['Light beam','Petal curtain','Aurora','Constellation gather'];

// Full screen composition (Plan 17 Lane 14). The arrival frame is the whole TV
// surface inside even 54 px margins: 1812 by 972, at TV 54,54. Every entrance
// coordinate below is in that box. Orbs are laid out at their long standing
// sizes, so circular fitting and paging are untouched, and are drawn larger
// through a scale factor, so every word grows with the orb.
const ARRIVAL_W=1812, ARRIVAL_H=972;
const ARRIVAL_SINGLE={x:1300,y:486,layout:540,drawn:760};
// A wave is five, always shown together. The five orbs sit in a balanced 3 over
// 2 stagger around the group centre at the largest diameter that still leaves a
// clear gap between neighbours and keeps every ring clear of the title, the
// caption, the waiting pill and the frame edge. They are laid out at 300 and
// drawn at 400, so the words are drawn a third larger than they are measured.
const ARRIVAL_GROUP={cx:906,cy:500,layout:300,drawn:400,show:21,slots:[[286,340],[906,340],[1526,340],[596,660],[1216,660]]};
const ARRIVAL_PAIR={layout:518,drawn:720,x:[506,1306],y:490};
// Anthony, 2026-09-19: the bubble stays on screen for 7 seconds (each page of a long
// message gets its own 7 seconds, so no message is ever cut short).
const ARRIVAL_SHOW=7;

let ARRIVAL_FRAME_BAG=[];
let ARRIVAL_FRAME_LAST=null;

// Bright, heavenly full screen backdrop. It is mounted on #tv, not inside the
// arrival frame, so it covers the header and the live recognition rail too.
const ARRIVAL_SKY_RAYS=9;
let ARRIVAL_SKY_TIMER=null;

function arrivalSkyMarkup(){
 let rays='';
 for(let i=0;i<ARRIVAL_SKY_RAYS;i++){
  const x=-60+i*228;
  const width=86+(i%4)*54;
  const rot=(-7.4+i*1.9).toFixed(1);
  rays+=`<div class="arrival-sky-ray" style="--ray-x:${x}px;--ray-w:${width}px;--ray-rot:${rot}deg;--ray-delay:-${(i*0.73).toFixed(2)}s"></div>`;
 }
 return `<div class="arrival-sky-wash"></div>${rays}<div class="arrival-sky-glow"></div>`;
}

function arrivalRemoveSky(){
 if(ARRIVAL_SKY_TIMER){clearTimeout(ARRIVAL_SKY_TIMER);ARRIVAL_SKY_TIMER=null}
 $('arrival-sky')?.remove();
}

function arrivalMountSky(){
 const tv=$('tv');if(!tv)return null;
 arrivalRemoveSky();
 const el=document.createElement('div');
 el.className='arrival-sky';
 el.id='arrival-sky';
 el.setAttribute('aria-hidden','true');
 el.innerHTML=arrivalSkyMarkup();
 // Self cleaning: whenever the backdrop finishes fading to nothing (the arrival
 // frame stopped being active by any path, including a safe mode clear), it
 // leaves the DOM on its own.
 el.addEventListener('transitionend',event=>{if(event.target===el&&event.propertyName==='opacity'&&getComputedStyle(el).opacity==='0')el.remove()});
 tv.append(el);
 return el;
}

// The backdrop fades out with the arrival frame, then leaves the DOM. Its
// opacity is gated on #tv:has(.event-stage.active), so it never covers the rail
// once the chain has ended, even if this removal is pre-empted.
function arrivalClearSky(){
 if(!$('arrival-sky'))return;
 if(S.still){arrivalRemoveSky();return}
 if(ARRIVAL_SKY_TIMER)clearTimeout(ARRIVAL_SKY_TIMER);
 ARRIVAL_SKY_TIMER=setTimeout(()=>{ARRIVAL_SKY_TIMER=null;$('arrival-sky')?.remove()},700);
}

// The living architecture behind the bubble: two counter turning fans of light, a bloom,
// two gold line rosettes like a rose window, a dawn flash, soft drifting lights and a light
// that travels round the panel edge. Everything here is decoration (aria-hidden) and is
// moved by arrivalStageTick from the renderer clock, so stills and tests stay exact.
function arrivalFocus(kind,oversize){
 if(kind==='group')return{x:ARRIVAL_GROUP.cx,y:ARRIVAL_GROUP.cy,s:1.42,quiet:null};
 return{x:ARRIVAL_SINGLE.x,y:ARRIVAL_SINGLE.y,s:1,quiet:{x0:80,x1:820,y0:290,y1:690}};
}

function arrivalRosette(layer){
 let shapes='';
 if(layer===0){
  for(let i=0;i<30;i++){const t=i*TAU/30;shapes+=`<circle cx="${(Math.cos(t)*300).toFixed(1)}" cy="${(Math.sin(t)*300).toFixed(1)}" r="300"/>`}
  shapes+='<circle r="600"/><circle r="592"/>';
 }else{
  for(let i=0;i<18;i++){const t=i*TAU/18;shapes+=`<circle class="rose" cx="${(Math.cos(t)*330).toFixed(1)}" cy="${(Math.sin(t)*330).toFixed(1)}" r="200"/>`}
  shapes+='<circle r="404"/><circle r="436"/><circle class="ticks" r="420"/>';
  for(let i=0;i<12;i++){const t=i*TAU/12,x=Math.cos(t)*486,y=Math.sin(t)*486;shapes+=`<path class="gem" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(i*30).toFixed(0)})" d="M0-13Q2-2 13 0Q2 2 0 13Q-2 2-13 0Q-2-2 0-13Z"/>`}
 }
 return `<svg class="arrival-rosette arrival-rosette-${layer}" viewBox="-620 -620 1240 1240" width="1240" height="1240" aria-hidden="true">${shapes}</svg>`;
}

function arrivalStageMarkup(kind){
 const f=arrivalFocus(kind);
 let lights='';
 for(let i=0;i<9;i++){
  const size=150+((i*97)%230),x=((i*263+120)%1760)-60,y=((i*173+40)%900)-40;
  lights+=`<div class="arrival-light" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;--light-delay:-${(i*1.7).toFixed(1)}s;--light-dur:${13+i%4*3}s"></div>`;
 }
 return `<div class="arrival-architecture" aria-hidden="true">${lights}<div class="arrival-halo" style="left:${f.x}px;top:${f.y}px"><div class="arrival-halo-fan fan-a"></div><div class="arrival-halo-fan fan-b"></div>${arrivalRosette(0)}${arrivalRosette(1)}<div class="arrival-halo-bloom"></div></div><div class="arrival-dawn" style="left:${f.x}px;top:${f.y}px"></div></div><div class="arrival-edge" aria-hidden="true"><i></i></div>`;
}

const arrivalWord=html=>`<span class="arrival-word">${html}</span>`;

function arrivalStageBind(a){
 const root=$('event');if(!root||!a)return;
 const q=s=>root.querySelector(s);
 a.fx={at:S.t,landedAt:null,focus:arrivalFocus(a.kind),halo:q('.arrival-halo'),fanA:q('.fan-a'),fanB:q('.fan-b'),bloom:q('.arrival-halo-bloom'),rosA:q('.arrival-rosette-0'),rosB:q('.arrival-rosette-1'),dawn:q('.arrival-dawn'),edge:q('.arrival-edge i'),words:[...root.querySelectorAll('.arrival-word')]};
 arrivalStageTick(a);
}

function arrivalStageTick(a){
 const fx=a&&a.fx;if(!fx||!fx.halo)return;
 const still=S.still,T=still?0:S.t-fx.at,L=fx.landedAt===null||still?-1:S.t-fx.landedAt;
 const reveal=still?1:outCubic(T/2.4),pulse=L>=0?Math.exp(-L*2.1):0;
 const out=a.phase==='exit'&&!still?smooth((S.t-a.phaseAt)/a.exit):0,vis=reveal*(1-out),fs=fx.focus.s;
 fx.halo.style.opacity=vis.toFixed(3);
 fx.halo.style.transform=`scale(${(fs*(.7+.3*reveal)*(1-.22*out)).toFixed(4)})`;
 fx.fanA.style.transform=`translate(-50%,-50%) rotate(${(T*5-(1-reveal)*70).toFixed(2)}deg) scale(2.2)`;
 fx.fanB.style.transform=`translate(-50%,-50%) rotate(${(-T*3.4+(1-reveal)*55).toFixed(2)}deg) scale(2.2)`;
 fx.rosA.style.transform=`translate(-50%,-50%) rotate(${(T*1.6-(1-reveal)*90).toFixed(2)}deg) scale(${(.55+.45*reveal).toFixed(4)})`;
 fx.rosB.style.transform=`translate(-50%,-50%) rotate(${(-T*2.3+(1-reveal)*120).toFixed(2)}deg) scale(${(.7+.3*reveal).toFixed(4)})`;
 fx.bloom.style.transform=`translate(-50%,-50%) scale(${(1+pulse*.2+(still?0:Math.sin(T*.9)*.025)).toFixed(4)})`;
 fx.bloom.style.opacity=(.74+.26*pulse).toFixed(3);
 // Dawn: one flash of light opens the scene, a second answers the landing.
 const d=clamp(T/1.3,0,1),first=still?0:(1-d)*.95,second=L>=0&&L<1?(1-L)*.7:0,late=second>first;
 fx.dawn.style.opacity=Math.max(first,second).toFixed(3);
 fx.dawn.style.transform=`translate(-50%,-50%) scale(${(late?(.7+1.5*outCubic(L))*fs:.15+2.6*outCubic(d)).toFixed(4)})`;
 if(fx.edge){fx.edge.style.transform=`rotate(${(T*38).toFixed(2)}deg)`;fx.edge.parentElement.style.opacity=(vis*(.6+.4*pulse)).toFixed(3)}
 fx.words.forEach((el,i)=>{
  if(!el.isConnected)return;
  const w=still?1:outCubic(clamp((T-.2-i*.13)/.95,0,1));
  el.style.opacity=(w*(1-out)).toFixed(3);
  el.style.transform=w>=1&&!out?'':`translate(${(-out*46).toFixed(1)}px,${((1-w)*58).toFixed(1)}px)`;
 });
}

function nextArrivalFrame(){
 if(!ARRIVAL_FRAME_BAG.length){
  const values=Array.from({length:ARRIVAL_FRAME_STYLES.length},(_,i)=>i);
  const rng=randSeed(2311+S.idCounter*53);
  for(let i=values.length-1;i>0;i--){
   const j=Math.floor(rng()*(i+1));
   [values[i],values[j]]=[values[j],values[i]];
  }
  const last=ARRIVAL_FRAME_LAST;
  if(values[0]===last)[values[0],values[1]]=[values[1],values[0]];
  ARRIVAL_FRAME_BAG=values;
 }
 const next=ARRIVAL_FRAME_BAG.shift();
 ARRIVAL_FRAME_LAST=next;
 return next;
}

function arrivalResetFrameBag(){
 ARRIVAL_FRAME_BAG=[];
 ARRIVAL_FRAME_LAST=null;
}

function arrivalBuildFrameMarkup(frameIndex, kind){
 const group=kind==='group';
 if(frameIndex===0){
  let shafts='';
  for(let i=0;i<12;i++){
   const left=group?(86+i*149):(ARRIVAL_SINGLE.x-230+i*40);
   shafts+=`<div class="arrival-beam-shaft" style="left:${left}px;--shaft-delay:${(i*0.14).toFixed(2)}s;--shaft-w:${3+i%3*2}px"></div>`;
  }
  let motes='';
  for(let i=0;i<14;i++){
   const mx=group?(120+i*120):(ARRIVAL_SINGLE.x-200+i*30);
   const my=120+((i*59)%740);
   motes+=`<div class="arrival-beam-mote" style="left:${mx}px;top:${my}px;--mote-delay:${(i*0.22).toFixed(2)}s"></div>`;
  }
  return `<div class="arrival-frame arrival-frame-light-beam" data-frame-index="0"><div class="arrival-beam-column ${group?'group':''}"></div>${shafts}${motes}</div>`;
 }
 if(frameIndex===1){
  let leftPetals='';
  for(let i=0;i<20;i++){
   const px=30+(i%4)*100, py=44+Math.floor(i/4)*180;
   const rot=-22+i*6;
   leftPetals+=`<div class="arrival-curtain-petal" data-tint="${i%3}" style="left:${px}px;top:${py}px;--rot:${rot}deg"></div>`;
  }
  let rightPetals='';
  for(let i=0;i<20;i++){
   const px=1388+(i%4)*100, py=44+Math.floor(i/4)*180;
   const rot=22-i*6;
   rightPetals+=`<div class="arrival-curtain-petal" data-tint="${i%3}" style="left:${px}px;top:${py}px;--rot:${rot}deg"></div>`;
  }
  let floats='';
  for(let i=0;i<6;i++){
   const fx=group?(300+i*210):(480+i*140), fy=120+((i*97)%720);
   floats+=`<div class="arrival-petal-float" style="left:${fx}px;top:${fy}px;--delay:${(i*0.35).toFixed(2)}s"></div>`;
  }
  return `<div class="arrival-frame arrival-frame-petal-curtain" data-frame-index="1"><div class="arrival-curtain-half left">${leftPetals}</div><div class="arrival-curtain-half right">${rightPetals}</div>${floats}</div>`;
 }
 if(frameIndex===2){
  let ribbons='';
  for(let i=0;i<3;i++){
   ribbons+=`<div class="arrival-aurora-ribbon arrival-aurora-ribbon-${i}"></div>`;
  }
  let stars='';
  for(let i=0;i<36;i++){
   const sx=40+((i*73)%1720), sy=30+((i*67)%900);
   stars+=`<div class="arrival-aurora-star" style="left:${sx}px;top:${sy}px;--star-delay:${(i*0.19).toFixed(2)}s;--star-size:${2+i%4}px"></div>`;
  }
  return `<div class="arrival-frame arrival-frame-aurora" data-frame-index="2">${ribbons}${stars}</div>`;
 }
 if(frameIndex===3){
  let stars='';
  const cx=group?ARRIVAL_GROUP.cx:ARRIVAL_SINGLE.x, cy=group?ARRIVAL_GROUP.cy:ARRIVAL_SINGLE.y;
  for(let i=0;i<16;i++){
   const angle=i*TAU/16;
   const dist=group?(300+((i*37)%260)):(300+((i*37)%230));
   const sx=cx+Math.cos(angle)*dist, sy=cy+Math.sin(angle)*(dist*0.78);
   stars+=`<div class="arrival-const-star" style="left:${sx.toFixed(1)}px;top:${sy.toFixed(1)}px;--dx:${(cx-sx).toFixed(1)}px;--dy:${(cy-sy).toFixed(1)}px;--delay:${(i*0.08).toFixed(2)}s"></div>`;
  }
  let lines='';
  for(let i=0;i<14;i++){
   const angle=i*TAU/14;
   const dist=group?300:245;
   const lx=cx+Math.cos(angle)*dist, ly=cy+Math.sin(angle)*(dist*0.78);
   lines+=`<div class="arrival-const-line" style="left:${lx.toFixed(1)}px;top:${ly.toFixed(1)}px;--rot:${(angle*180/Math.PI).toFixed(1)}deg;--delay:${(i*0.1).toFixed(2)}s"></div>`;
  }
  return `<div class="arrival-frame arrival-frame-constellation" data-frame-index="3">${stars}${lines}</div>`;
 }
 return '';
}

function arrivalSpawnExitBurst(a){
 if(S.still||!a||!a.elements)return;
 const container=$('event-items');
 if(!container)return;
 a.elements.forEach(b=>{
  const count=a.kind==='group'?3:12;
  for(let i=0;i<count;i++){
   const el=document.createElement('div');
   el.className='arrival-burst-item '+(i%2===0?'heart':'petal');
   const angle=(i*TAU/count)+(Math.random()*0.4-0.2);
   const dist=(80+Math.random()*110)*(b.s||1);
   const dx=Math.cos(angle)*dist, dy=Math.sin(angle)*dist;
   el.style.cssText=`left:${b.x}px;top:${b.y}px;--bx:${dx.toFixed(1)}px;--by:${dy.toFixed(1)}px;--brot:${(Math.random()*80-40).toFixed(1)}deg;`;
   if(i%2===0){
    el.innerHTML=heartSVG(catalog[b.r.ids[0]-1].color);
   }else{
    const petalColor=['#f4cbd6','#ffd7b3','#ecd2c0'][i%3];
    el.innerHTML=`<svg viewBox="0 0 24 36" class="arrival-burst-petal-svg" aria-hidden="true"><ellipse cx="12" cy="18" rx="8" ry="16" fill="${petalColor}"/></svg>`;
   }
   container.append(el);
  }
 });
}

function arrivalScene(){
 const r=records()[0];return r?`<div class="scene-copy" style="position:absolute;left:32px;top:78px;width:510px"><div class="eyebrow">Recognition arrival</div><h1 style="font-size:57px;line-height:1.1;margin:24px 0">A little kindness,<br>${shimmer('a moment for you.')}</h1><p class="subheading">Six individual entrances.<br>Five choreographed waves of five.</p></div>${addOrb(r,943,49,534,{motion:false})}`:emptyPanel();
}

function singleTrajectory(style,p){
 const tx=ARRIVAL_SINGLE.x,ty=ARRIVAL_SINGLE.y;let x=tx,y=ty,z=0,scale=1,alpha=1;
 const q=outCubic(p);
 switch(style){
 case 0: // Through a luminous portal: approach, forward overshoot, settle.
  z=-1550*Math.pow(1-p,2.7)+Math.sin(Math.PI*p)*180;
  x=tx+170*(1-q);y=ty-100*(1-q);alpha=smooth(p/.18);break;
 case 1: // Comet with a sweeping volumetric flight path.
  x=curve(-390,80,1830,tx,q);y=curve(840,-450,8,ty,q);z=curve(-460,340,540,0,q);alpha=smooth(p/.1);break;
 case 2: // Particle aggregation: the shell resolves where sparks converge.
  x=tx;y=ty;z=-900*(1-q)+120*Math.sin(Math.PI*clamp((p-.6)/.4,0,1));scale=.68+.32*smooth((p-.24)/.62);alpha=smooth((p-.33)/.23);break;
 case 3: // A pearl drops through depth; two diminishing rebounds.
  if(p<.46){const s=p/.46;x=tx+170*(1-s);y=mix(-1060,ty+40,s*s);z=450*(1-s)}
  else{const s=(p-.46)/.54;x=tx;y=ty-Math.abs(Math.sin(s*Math.PI*2.1))*230*(1-s);z=100*Math.sin(s*Math.PI)*(1-s)}
  alpha=smooth(p/.13);break;
 case 4: // Loose corkscrew: wrap around the destination through depth.
  {const r=760*Math.pow(1-p,1.4),theta=-p*Math.PI*3.4;x=tx+Math.cos(theta)*r;y=ty+Math.sin(theta)*r*.62;z=-360*(1-p)+Math.sin(theta)*r*.85;alpha=smooth(p/.14)}break;
 case 5: // Bloom shell opens; pearl rises from the flower's center.
  x=tx+Math.sin(p*Math.PI*2)*40*(1-q);y=ty+330*(1-q);z=-760*(1-q);scale=.16+.84*smooth(p/.76);alpha=smooth((p-.08)/.21);break;
 }
 const perspective=1300/(1300-z);
 // The full screen orb is already large: a flight toward the viewer swells it only a
 // little past its resting size, so it is never wider than the screen mid flight.
 const raw=perspective*scale,k=raw>1?1+(raw-1)*.3:raw;
 return{x:tx+(x-tx)*perspective,y:ty+(y-ty)*perspective,z,k,alpha};
}

function groupTrajectory(style,index,p,b){
 // Arrival order for the five slots, one ordering per group style.
 const orders=[[0,3,1,4,2],[0,4,1,3,2],[2,0,4,1,3],[0,2,4,1,3],[0,3,4,2,1]];
 const rank=orders[style].indexOf(index),delay=rank*(style===3?.034:.032),duration=style===3?.69:.71;
 const u=clamp((p-delay)/duration,0,1),q=outCubic(u),tx=b.x,ty=b.y;
 let x=tx,y=ty,z=0,scale=1,alpha=smooth(u/.14);
 if(p<delay)return{x:tx,y:ty,z:-1000,k:.05,alpha:0};
 switch(style){
 case 0:
  x=mix(906+(index%3-1)*150+(rank%2?60:-60),tx,q);y=mix(126-index%2*250,ty,q);z=(-1450-rank*90)*Math.pow(1-u,2.5)+Math.sin(Math.PI*u)*70;break;
 case 1:
  {const left=rank%2===0;x=curve(left?-350:2162,left?240:1572,tx+(left?170:-170),tx,q);y=curve(270+(rank%3)*200,-250+index*70,ty+118,ty,q);z=Math.sin(Math.PI*u)*340-350*(1-u)}break;
 case 2:
  {const angle=index*2.4+(1-q)*Math.PI*3,rad=(1-q)*570;x=mix(906,tx,q)+Math.cos(angle)*rad;y=mix(ARRIVAL_GROUP.cy,ty,q)+Math.sin(angle)*rad*.5;z=Math.sin(angle)*rad*.8-400*(1-q)}break;
 case 3:
  {const source=[300,906,1512][index%3];x=mix(source,tx,q);y=curve(1100,-470,ty-200,ty,q);z=curve(-400,280,170,0,q);scale=.22+.78*q}break;
 case 4:
  {const source=[430,906,1382][index%3],zStart=[-900,-500,-700][index%3];x=mix(source,tx,q);y=mix(ARRIVAL_GROUP.cy,ty,q)+Math.sin(Math.PI*u)*(index%2?100:-100)*(1+(index%3)*.35);z=zStart*(1-q)+Math.sin(Math.PI*u)*190;scale=.15+.85*smooth(u/.65);alpha=smooth((u-.06)/.18)}break;
 }
 const k=1100/(1100-z)*scale;
 return{x:906+(x-906)*(1100/(1100-z)),y:ARRIVAL_GROUP.cy+(y-ARRIVAL_GROUP.cy)*(1100/(1100-z)),z,k,alpha};
}

// Canvas light. All of it is worked out from the renderer clock, never from frame count.
const ARRIVAL_INKS=['#dba941','#e58fa9','#c8922e','#b9a3dc'];
function arrivalHash(i,salt){const v=Math.sin(i*127.1+salt*311.7)*43758.5453;return v-Math.floor(v)}

function drawArrivalHeart(c,x,y,s,alpha,color){
 c.save();c.globalAlpha=clamp(alpha,0,1);c.fillStyle=color;c.translate(x,y);c.scale(s,s);c.beginPath();
 c.moveTo(0,3.2);c.bezierCurveTo(-6.4,-1.6,-3.2,-7,0,-3.2);c.bezierCurveTo(3.2,-7,6.4,-1.6,0,3.2);c.fill();c.restore();
}

// Stardust is born where the bubble was and stays there while it fades, so the flight
// leaves a true wake across the screen.
function drawArrivalWake(c,a,p){
 const b=a.elements[0];if(!b||a.kind!=='single')return;
 const step=.0055,life=.24,from=Math.max(0,Math.floor((p-life)/step)),to=Math.floor(p/step);
 for(let j=from;j<=to;j++){
  const born=j*step,age=(p-born)/life;if(age<0||age>1)continue;
  const pos=singleTrajectory(a.style,born),rad=b.d*b.s*.5*pos.k,ang=arrivalHash(j,1)*TAU,off=rad*(.2+.85*arrivalHash(j,2));
  const x=pos.x+Math.cos(ang)*off,y=pos.y+Math.sin(ang)*off+age*34,r=(1.4+3.6*arrivalHash(j,3))*(1-age*.6);
  if(j%7===0)drawArrivalHeart(c,x,y,r*.55,(1-age)*pos.alpha*.8,ARRIVAL_INKS[1]);
  else drawSpark(c,x,y,r,(1-age)*pos.alpha*.9,ARRIVAL_INKS[j%4]);
 }
}

// The hold: a landing answer (rings of light and a starburst), then a living scene of
// rising lights and hearts, with pearls riding a single bubble's ring. Words stay clear.
function drawArrivalAmbient(a,elapsed){
 const can=$('event-canvas'),c=can?.getContext('2d');if(!c||!a)return;c.clearRect(0,0,ARRIVAL_W,ARRIVAL_H);if(S.still)return;
 const fx=a.fx,L=fx&&fx.landedAt!==null?S.t-fx.landedAt:elapsed,t=S.t-(fx?fx.at:0),quiet=fx?fx.focus.quiet:null;
 const discs=a.elements.map(b=>({x:b.screenX,y:b.screenY,r:b.d*b.s*.5}));
 if(L<1.7){
  discs.forEach((o,n)=>{
   if(discs.length>2&&n%2)return;
   for(let i=0;i<3;i++){
    const q=clamp(L/1.7-i*.13,0,1);if(q<=0||q>=1)continue;
    c.save();c.globalAlpha=(1-q)*.55;c.strokeStyle=i%2?'#f2a9bd':'#e4b24c';c.lineWidth=3.4*(1-q)+.6;c.beginPath();c.arc(o.x,o.y,o.r+24+outCubic(q)*(discs.length>2?120:400),0,TAU);c.stroke();c.restore();
   }
   const count=discs.length>2?14:64;
   for(let i=0;i<count;i++){
    const q=clamp(L/1.5-arrivalHash(i,5)*.12,0,1);if(q<=0||q>=1)continue;
    const ang=i*2.39996+n,dist=o.r+18+outCubic(q)*(90+arrivalHash(i,6)*(discs.length>2?90:330));
    drawSpark(c,o.x+Math.cos(ang)*dist,o.y+Math.sin(ang)*dist,(2+3*arrivalHash(i,8))*(1-q*.5),(1-q)*.95,ARRIVAL_INKS[i%4]);
   }
  });
 }
 const rise=smooth(L/1.2);
 for(let i=0;i<40;i++){
  const speed=26+arrivalHash(i,11)*40,span=ARRIVAL_H+120;
  const y=ARRIVAL_H+60-((arrivalHash(i,12)*span+t*speed)%span),x=arrivalHash(i,13)*ARRIVAL_W+Math.sin(t*.5+i)*26;
  if(discs.some(o=>Math.hypot(x-o.x,y-o.y)<o.r+20))continue;
  if(quiet&&x>quiet.x0&&x<quiet.x1&&y>quiet.y0&&y<quiet.y1)continue;
  const alpha=rise*(.3+.35*arrivalHash(i,14))*Math.sin(Math.PI*clamp((ARRIVAL_H+60-y)/span,0,1));
  if(i%4===0)drawArrivalHeart(c,x,y,1.5+arrivalHash(i,15)*1.6,alpha,ARRIVAL_INKS[1]);
  else drawSpark(c,x,y,1.6+arrivalHash(i,16)*2.6,alpha*(.75+.25*Math.sin(t*2.2+i*1.7)),ARRIVAL_INKS[i%4]);
 }
 // Three pearls ride the bubble's outer ring, each with a fading tail. They stay on the
 // ring, so they never cross the words on the bubble.
 if(discs.length<=2)discs.forEach((o,n)=>{
  for(let j=0;j<3;j++)for(let k=0;k<10;k++){
   const theta=t*.8+j*TAU/3+n*1.1-k*.05,x=o.x+Math.cos(theta)*(o.r+34),y=o.y+Math.sin(theta)*(o.r+34);
   const size=8*(1-k*.085),alpha=rise*(k?.36*(1-k/10):1);
   c.save();c.globalAlpha=alpha*.32;c.fillStyle='#f3c763';c.beginPath();c.arc(x,y,size*2,0,TAU);c.fill();
   c.globalAlpha=alpha;c.fillStyle=k?'#f0cd7c':'#fffaf0';c.beginPath();c.arc(x,y,size,0,TAU);c.fill();
   if(!k){c.strokeStyle='#d9a63a';c.lineWidth=1.4;c.stroke()}
   c.restore();
  }
 });
}

// The flight to the rail leaves its own fading wake.
function drawArrivalExit(a,p){
 const can=$('event-canvas'),c=can?.getContext('2d');if(!c||!a)return;c.clearRect(0,0,ARRIVAL_W,ARRIVAL_H);if(S.still||!a.exitPos)return;
 a.elements.forEach((b,n)=>{
  const count=a.kind==='group'?16:46,life=.42;
  const tail=1-smooth((p-.78)/.22);
  for(let j=0;j<count;j++){
   const born=j/count,age=(p-born)/life;if(age<0||age>1)continue;
   const k=mix(1,Math.min(.2,52/(b.d*b.s)),born),rad=b.d*b.s*.5*k,ang=arrivalHash(j+n*50,21)*TAU,off=rad*arrivalHash(j+n*50,22);
   const x=mix(b.x,a.exitPos.x,born)+Math.cos(ang)*off,y=mix(b.y,a.exitPos.y,born)+Math.sin(ang)*off+age*26;
   if(j%6===0)drawArrivalHeart(c,x,y,(2.2-age)*1.2,(1-age)*.85*tail,ARRIVAL_INKS[1]);
   else drawSpark(c,x,y,(1.6+3*arrivalHash(j,23))*(1-age*.5),(1-age)*.9*tail,ARRIVAL_INKS[j%4]);
  }
 });
}

registerScene(3,{
 markup:arrivalScene,
 floaters:true,
 fxCanvas:true,
 pace:0,
 replaceMode:null
});
