// Scene 8: We Are Peacemakers.
'use strict';

function peacemakers(){
 PEACEMAKERS_BEADS=[];
 return `<div style="position:absolute;left:12px;top:33px;width:829px"><div class="eyebrow">Mother’s Love in our community</div><h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1><p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p></div>${art('globe','left:271px;top:134px;width:604px;height:482px')}<div class="globe-light"></div>${peacemakersBubbles()}`;
}

const PEACEMAKERS_LAYERS={
 far:{scale:.84,blur:.9,pace:.75,z:40},
 mid:{scale:.93,blur:.35,pace:.9,z:60},
 near:{scale:1,blur:0,pace:1.1,z:80}
};

const PEACEMAKERS_POSITIONS=[
 [880,18,296],
 [1250,12,284],
 [1545,70,262],
 [905,340,262],
 [1215,326,290],
 [1560,350,244]
];

const PEACEMAKERS_PETAL_COLORS=['#e7b2bc','#e8c575','#d1b8d2','#bad19c'];

let PEACEMAKERS_BEADS=[];

function peacemakersBubbles(){
 const chosen=[];
 for(let i=0;i<6;i++){
  const r=choose(chosen.map(a=>a.id));
  if(r)chosen.push(r);
 }
 const long=chosen.find(r=>!smallFits(r));
 if(long)return readerSlot(long,861,37,925,586);
 return chosen.map((r,i)=>addOrb(r,...PEACEMAKERS_POSITIONS[i])).join('');
}

function mountPEACEMAKERS(root){
 PEACEMAKERS_BEADS=[];
 V.peacemakersLastExit=-999;
 V.actors.forEach((a,i)=>{
  a._peacemakersSeenLife=a.life;
  if(a.large){
   a.layer='near';
   a.retireAt=Infinity;
   if(a.el)a.el.dataset.depth='near';
   return;
  }
  a.retireAt=9+i*4.6;
  const layer=['far','mid','near'][i%3];
  a.layer=layer;
  const L=PEACEMAKERS_LAYERS[layer]||PEACEMAKERS_LAYERS.near;
  a.pace*=L.pace;
  if(a.el)a.el.dataset.depth=layer;
 });
}
function peacemakersMount(root){return mountPEACEMAKERS(root)}

function peacemakersEmitPetals(a){
 if(!V.fx||S.still)return;
 const x=a.screenX||a.x, y=a.screenY||a.y;
 const rnd=a.rng||Math.random;
 for(let i=0;i<10;i++){
  const angle=rnd()*Math.PI*2, speed=25+rnd()*65;
  V.fx.push({
   kind:'petal',
   x,
   y,
   vx:Math.cos(angle)*speed,
   vy:Math.sin(angle)*speed-18,
   r:3.5+rnd()*4.5,
   phase:rnd()*Math.PI*2,
   start:V.clock,
   life:1.8+rnd()*1.5,
   color:PEACEMAKERS_PETAL_COLORS[i%4]
  });
 }
 if(V.fx.length>250)V.fx.splice(0,V.fx.length-250);
}

function integratePEACEMAKERS(a,dt){
 if(S.still)return false;
 if(a.life==='exiting'&&a._peacemakersSeenLife!=='exiting'){
  V.peacemakersLastExit=V.clock;
  peacemakersEmitPetals(a);
 }
 a._peacemakersSeenLife=a.life;
 if(a.life==='steady'&&!a.large){
  if(a.retireAt-a.born>22){
   a.retireAt=a.born+14+(a.rng?a.rng():Math.random())*6;
  }
 }
 const lastExit=V.peacemakersLastExit??-999;
 const anyExitingOrAbsent=V.actors.some(x=>x.life==='exiting'||x.life==='absent');
 const inCooldown=(V.clock-lastExit)<4.6;
 if(anyExitingOrAbsent||inCooldown){
  for(const x of V.actors){
   if(x.life==='steady'&&!x.large&&x.retireAt<=V.clock){
    x.retireAt=V.clock+0.5;
   }
  }
 }
 return false;
}
function peacemakersIntegrate(a,dt){return integratePEACEMAKERS(a,dt)}

function placePEACEMAKERS(a){
 const L=PEACEMAKERS_LAYERS[a.layer]||PEACEMAKERS_LAYERS.near, scale=a.screenScale*L.scale, x=a.screenX, y=a.screenY, op=a.opacity;
 if(a.el.dataset.depth!==a.layer)a.el.dataset.depth=a.layer;
 a.el.style.left=0;a.el.style.top=0;a.el.style.transform=`translate(${(x-a.d/2).toFixed(2)}px,${(y-a.d/2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
 a.el.style.opacity=op.toFixed(3);a.el.style.zIndex=String(L.z+Math.round(scale*100));
 const baseBlur=scale<.93?(.93-scale)*3:0, blur=Math.min(.9, Math.max(baseBlur, L.blur));
 a.el.style.filter=blur>0?`blur(${blur.toFixed(2)}px)`:'none';
 const b=slots.find(b=>b.key===a.key);if(b){b.x=x-a.d/2;b.y=y-a.d/2;b.phase=a.life}
 return true;
}
function peacemakersPlace(a){return placePEACEMAKERS(a)}

function peacemakersBezier(p0,p1,p2,u){
 const inv=1-u;
 return inv*inv*p0+2*inv*u*p1+u*u*p2;
}

function peacemakersDraw(dt){
 if(S.still)return;
 const c=V.canvas?.getContext('2d');
 if(!c)return;
 const t=V.clock;

 const haloCycle=(t*Math.PI*2)/6;
 const haloAlpha1=0.06+0.10*(0.5+0.5*Math.sin(haloCycle));
 const haloAlpha2=0.06+0.10*(0.5+0.5*Math.sin(haloCycle+1.2));

 c.save();
 c.lineWidth=1.2;

 c.strokeStyle='#e8c777';
 c.globalAlpha=haloAlpha1;
 c.beginPath();
 c.arc(573,375,252,0,Math.PI*2);
 c.stroke();

 c.strokeStyle='#ffffff';
 c.globalAlpha=haloAlpha2;
 c.beginPath();
 c.arc(573,375,268,0,Math.PI*2);
 c.stroke();
 c.restore();

 for(const a of V.actors){
  if(a._peacemakersHitUntil&&t>=a._peacemakersHitUntil){
   a._peacemakersHitUntil=0;
   if(a.el)a.el.classList.remove('thread-hit');
  }
 }

 const steady=V.actors.filter(a=>a.life==='steady').slice(0,6);

 steady.forEach(a=>{
  const L=PEACEMAKERS_LAYERS[a.layer]||PEACEMAKERS_LAYERS.near;
  const scale=(a.screenScale||1)*L.scale;
  const bx=a.screenX, by=a.screenY, br=(a.d/2)*scale;
  const dx=bx-573, dy=by-375, dist=Math.hypot(dx,dy);
  if(dist<1)return;
  const ux=dx/dist, uy=dy/dist;
  const sx=573+ux*240, sy=375+uy*240;
  const ex=bx-ux*br, ey=by-uy*br;

  if(!a._peacemakersBow){
   const rnd=a.rng?a.rng():Math.random();
   a._peacemakersBow=60+rnd*60;
  }

  const mx=(sx+ex)/2, my=(sy+ey)/2;
  const cpx=mx, cpy=my-a._peacemakersBow;

  a._peacemakersThread={sx,sy,cpx,cpy,ex,ey};

  c.save();
  c.strokeStyle='#e8c777';
  c.globalAlpha=0.22;
  c.lineWidth=1.2;
  c.beginPath();
  c.moveTo(sx,sy);
  c.quadraticCurveTo(cpx,cpy,ex,ey);
  c.stroke();
  c.restore();

  if(!a._peacemakersNextBead){
   const r0=a.rng?a.rng():Math.random();
   a._peacemakersNextBead=t+r0*2.0;
  }
  if(t>=a._peacemakersNextBead){
   const r1=a.rng?a.rng():Math.random();
   a._peacemakersNextBead=t+2.5+r1*1.5;
   if(PEACEMAKERS_BEADS.length<12){
    PEACEMAKERS_BEADS.push({a,start:t,duration:1.2,hit:false});
   }
  }
 });

 for(const bead of PEACEMAKERS_BEADS){
  const a=bead.a;
  if(!a||a.life!=='steady'||!a._peacemakersThread)continue;
  const u=(t-bead.start)/bead.duration;
  if(u<0)continue;
  if(u>=1&&!bead.hit){
   bead.hit=true;
   a._peacemakersHitUntil=t+0.6;
   if(a.el)a.el.classList.add('thread-hit');
  }
  if(u<=1.05){
   const {sx,sy,cpx,cpy,ex,ey}=a._peacemakersThread;
   const headAlpha=0.9*Math.min(1,u/0.08);
   for(let k=5;k>=0;k--){
    const sampleU=u-k*0.025;
    if(sampleU<0||sampleU>1)continue;
    const x=peacemakersBezier(sx,cpx,ex,sampleU);
    const y=peacemakersBezier(sy,cpy,ey,sampleU);
    const sampleAlpha=headAlpha*(1-k/6);
    const sampleR=4.2*(1-k*0.08);
    drawSpark(c,x,y,sampleR,sampleAlpha,'#fff');
   }
  }
 }

 PEACEMAKERS_BEADS=PEACEMAKERS_BEADS.filter(b=>(t-b.start)<b.duration+0.1);
 if(PEACEMAKERS_BEADS.length>12)PEACEMAKERS_BEADS.splice(0,PEACEMAKERS_BEADS.length-12);
}

registerScene(8,{
 markup:peacemakers,
 floaters:true,
 fxCanvas:true,
 keepOut:()=>[{x:0,y:8,w:700,h:296}],
 replaceMode:'drift',
 mount:mountPEACEMAKERS,
 integrate:integratePEACEMAKERS,
 place:placePEACEMAKERS,
 draw:peacemakersDraw
});


