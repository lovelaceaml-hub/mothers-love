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
const ARRIVAL_GROUP={cx:906,cy:500,layout:300,drawn:400,slots:[[286,340],[906,340],[1526,340],[596,660],[1216,660]]};
const ARRIVAL_PAIR={layout:518,drawn:720,x:[506,1306],y:490};

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

registerScene(3,{
 markup:arrivalScene,
 floaters:true,
 fxCanvas:true,
 pace:0,
 replaceMode:null
});
