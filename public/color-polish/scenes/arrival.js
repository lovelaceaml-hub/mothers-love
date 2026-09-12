// Scene 3: Recognition Arrival.
'use strict';

const SINGLE_STYLES=['Through the light','Comet sweep','A thousand kind sparks','Pearl spring','Spiral bloom','Petals into pearl'];
const GROUP_STYLES=['Cascading constellation','Two tides, one wave','Spiral constellation','Petal fountains','Ripple of kindness'];
const GROUP_TITLES=['A new wave of Mother’s Love.','Kindness is being shared.','A constellation of kind words.','A garden of appreciation blooms.','Ten expressions. One shared moment.'];
const ARRIVAL_FRAME_STYLES=['Light beam','Petal curtain','Aurora','Constellation gather'];

let ARRIVAL_FRAME_BAG=[];
let ARRIVAL_FRAME_LAST=null;

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
   const left=group?(80+i*130):(910+i*28);
   shafts+=`<div class="arrival-beam-shaft" style="left:${left}px;--shaft-delay:${(i*0.14).toFixed(2)}s;--shaft-w:${3+i%3*2}px"></div>`;
  }
  let motes='';
  for(let i=0;i<14;i++){
   const mx=group?(120+i*110):(930+i*20);
   const my=90+((i*37)%430);
   motes+=`<div class="arrival-beam-mote" style="left:${mx}px;top:${my}px;--mote-delay:${(i*0.22).toFixed(2)}s"></div>`;
  }
  return `<div class="arrival-frame arrival-frame-light-beam" data-frame-index="0"><div class="arrival-beam-column ${group?'group':''}"></div>${shafts}${motes}</div>`;
 }
 if(frameIndex===1){
  let leftPetals='';
  for(let i=0;i<12;i++){
   const px=30+(i%4)*75, py=40+Math.floor(i/4)*160;
   const rot=-22+i*6;
   leftPetals+=`<div class="arrival-curtain-petal" data-tint="${i%3}" style="left:${px}px;top:${py}px;--rot:${rot}deg"></div>`;
  }
  let rightPetals='';
  for(let i=0;i<12;i++){
   const px=group?(1400+(i%4)*75):(1340+(i%4)*75), py=40+Math.floor(i/4)*160;
   const rot=22-i*6;
   rightPetals+=`<div class="arrival-curtain-petal" data-tint="${i%3}" style="left:${px}px;top:${py}px;--rot:${rot}deg"></div>`;
  }
  let floats='';
  for(let i=0;i<6;i++){
   const fx=group?(300+i*210):(480+i*140), fy=100+((i*59)%390);
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
  for(let i=0;i<24;i++){
   const sx=40+((i*73)%1720), sy=30+((i*41)%545);
   stars+=`<div class="arrival-aurora-star" style="left:${sx}px;top:${sy}px;--star-delay:${(i*0.19).toFixed(2)}s;--star-size:${2+i%4}px"></div>`;
  }
  return `<div class="arrival-frame arrival-frame-aurora" data-frame-index="2">${ribbons}${stars}</div>`;
 }
 if(frameIndex===3){
  let stars='';
  const cx=group?906:1070, cy=310;
  for(let i=0;i<16;i++){
   const angle=i*TAU/16;
   const dist=group?(280+((i*37)%180)):(210+((i*37)%160));
   const sx=cx+Math.cos(angle)*dist, sy=cy+Math.sin(angle)*(dist*0.62);
   stars+=`<div class="arrival-const-star" style="left:${sx.toFixed(1)}px;top:${sy.toFixed(1)}px;--dx:${(cx-sx).toFixed(1)}px;--dy:${(cy-sy).toFixed(1)}px;--delay:${(i*0.08).toFixed(2)}s"></div>`;
  }
  let lines='';
  for(let i=0;i<14;i++){
   const angle=i*TAU/14;
   const dist=group?220:170;
   const lx=cx+Math.cos(angle)*dist, ly=cy+Math.sin(angle)*(dist*0.6);
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
   const dist=80+Math.random()*110;
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
 const r=records()[0];return r?`<div class="scene-copy" style="position:absolute;left:32px;top:78px;width:510px"><div class="eyebrow">Recognition arrival</div><h1 style="font-size:57px;line-height:1.1;margin:24px 0">A little kindness,<br>${shimmer('a moment for you.')}</h1><p class="subheading">Six individual entrances.<br>Five choreographed waves of ten.</p></div>${addOrb(r,943,49,534,{motion:false})}`:emptyPanel();
}

function singleTrajectory(style,p){
 const tx=1070,ty=310;let x=tx,y=ty,z=0,scale=1,alpha=1;
 const q=outCubic(p);
 switch(style){
 case 0: // Through a luminous portal: approach, forward overshoot, settle.
  z=-1550*Math.pow(1-p,2.7)+Math.sin(Math.PI*p)*180;
  x=tx+170*(1-q);y=ty-65*(1-q);alpha=smooth(p/.18);break;
 case 1: // Comet with a sweeping volumetric flight path.
  x=curve(-390,80,1830,tx,q);y=curve(530,-285,5,ty,q);z=curve(-460,340,540,0,q);alpha=smooth(p/.1);break;
 case 2: // Particle aggregation: the shell resolves where sparks converge.
  x=tx;y=ty;z=-900*(1-q)+120*Math.sin(Math.PI*clamp((p-.6)/.4,0,1));scale=.68+.32*smooth((p-.24)/.62);alpha=smooth((p-.33)/.23);break;
 case 3: // A pearl drops through depth; two diminishing rebounds.
  if(p<.46){const s=p/.46;x=tx+170*(1-s);y=-670+1020*s*s;z=450*(1-s)}
  else{const s=(p-.46)/.54;x=tx;y=ty-Math.abs(Math.sin(s*Math.PI*2.1))*145*(1-s);z=100*Math.sin(s*Math.PI)*(1-s)}
  alpha=smooth(p/.13);break;
 case 4: // Loose corkscrew: wrap around the destination through depth.
  {const r=630*Math.pow(1-p,1.4),theta=-p*Math.PI*3.4;x=tx+Math.cos(theta)*r;y=ty+Math.sin(theta)*r*.48;z=-360*(1-p)+Math.sin(theta)*r*.85;alpha=smooth(p/.14)}break;
 case 5: // Bloom shell opens; pearl rises from the flower's center.
  x=tx+Math.sin(p*Math.PI*2)*40*(1-q);y=ty+210*(1-q);z=-760*(1-q);scale=.16+.84*smooth(p/.76);alpha=smooth((p-.08)/.21);break;
 }
 const perspective=1300/(1300-z);return{x:tx+(x-tx)*perspective,y:ty+(y-ty)*perspective,z,k:perspective*scale,alpha};
}

function groupTrajectory(style,index,p,b){
 const orders=[[0,4,7,1,8,2,6,3,5,9],[0,9,1,8,2,7,3,6,4,5],[4,0,9,5,3,1,8,6,2,7],[0,5,2,7,4,9,1,3,6,8],[2,7,1,3,6,8,0,4,5,9]];
 const rank=orders[style].indexOf(index),delay=rank*(style===3?.034:.032),duration=style===3?.69:.71;
 const u=clamp((p-delay)/duration,0,1),q=outCubic(u),tx=b.x,ty=b.y;
 let x=tx,y=ty,z=0,scale=1,alpha=smooth(u/.14);
 if(p<delay)return{x:tx,y:ty,z:-1000,k:.05,alpha:0};
 switch(style){
 case 0:
  x=mix(906+(index%3-1)*150+(rank%2?60:-60),tx,q);y=mix(80-index%2*160,ty,q);z=(-1450-rank*90)*Math.pow(1-u,2.5)+Math.sin(Math.PI*u)*70;break;
 case 1:
  {const left=rank%2===0;x=curve(left?-350:2162,left?240:1572,tx+(left?170:-170),tx,q);y=curve(170+(rank%3)*125,-160+index*45,ty+75,ty,q);z=Math.sin(Math.PI*u)*340-350*(1-u)}break;
 case 2:
  {const angle=index*2.4+(1-q)*Math.PI*3,rad=(1-q)*570;x=mix(906,tx,q)+Math.cos(angle)*rad;y=mix(315,ty,q)+Math.sin(angle)*rad*.33;z=Math.sin(angle)*rad*.8-400*(1-q)}break;
 case 3:
  {const source=[300,906,1512][index%3];x=mix(source,tx,q);y=curve(940,-300,ty-130,ty,q);z=curve(-400,280,170,0,q);scale=.22+.78*q}break;
 case 4:
  {const source=[430,906,1382][index%3],zStart=[-900,-500,-700][index%3];x=mix(source,tx,q);y=mix(300,ty,q)+Math.sin(Math.PI*u)*(index<5?-65:65)*(1+(index%3)*.35);z=zStart*(1-q)+Math.sin(Math.PI*u)*190;scale=.15+.85*smooth(u/.65);alpha=smooth((u-.06)/.18)}break;
 }
 const k=1100/(1100-z)*scale;
 return{x:906+(x-906)*(1100/(1100-z)),y:307+(y-307)*(1100/(1100-z)),z,k,alpha};
}

registerScene(3,{
 markup:arrivalScene,
 floaters:true,
 fxCanvas:true,
 pace:0,
 replaceMode:null
});
