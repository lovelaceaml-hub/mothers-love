// Core floater physics and scene particle effects.
'use strict';

function swapSlot(b){
 if(b.reader){b.phase='pop';b.since=S.t;b.reshape=true;b.el.querySelector('.orb-life').classList.add('orb-pop');log('bubble_pop',{scene:S.s,id:b.id,age:S.t-b.born});return}
 const otherIds=slots.map(x=>x.id);const r=choose(otherIds,b.expression);if(!r){b.born=S.t;return}
 const d=sceneDescriptor();
 if(d.entrance==='sprout'&&!smallFits(r)){// Preserve the full message by using the measured large-bubble layout.
  S.forceId=r.id;renderNow(S.s,{keepAge:true});S.replenishAt=S.sceneAge+10;log('large_bubble_selected',{id:r.id});return
 }
 b.next=r.id;b.phase='pop';b.since=S.t;b.el?.querySelector('.orb-life')?.classList.add('orb-pop');emit(b.x+b.d/2,b.y+b.d/2,16,catalog[r.ids[0]-1].color);log('bubble_pop',{scene:S.s,id:b.id,age:S.t-b.born})
}
function tickSlots(dt){
 if(!V.root?.isConnected||active||transition||S.still||['offline','neutral','empty'].includes(S.mode))return;
 V.clock+=dt;
 const d=sceneDescriptor();
 if(d.tick){d.tick(dt);return}
 if(!d.floaters)return;
 integrateFloaters(dt);
 for(const a of [...V.actors]){
  if(!a.reading)a.reading=slots.find(b=>b.key===a.key)?.reading;
  if(a.reading)a.minRead=a.reading.pages.reduce((n,p)=>n+Math.max(9,p.length/14),0);
  if(a.life==='steady')tickCirclePages(a,V.clock);
  const age=V.clock-a.lifeAt;
  if(a.life==='swelling'&&age>=.72){
   const kind=d.burst;burstAt(a.screenX,a.screenY,kind,44,a.d*.48);
   d.onRetire?.(a);
   a.life='absent';a.lifeAt=V.clock;log('bubble_burst',{scene:S.s,id:a.id,kind});
  }
  if(a.life==='absent'&&age>=.48)installNext(a);
  else if(a.life==='exiting'&&age>=3.8)installNext(a);
  else if((a.life==='entering'&&age>=3.8)||(a.life==='sprout'&&age>=2.65)){a.x=a.homeX;a.y=a.homeY;a.life='steady';a.born=V.clock;log('bubble_settled',{scene:S.s,id:a.id})}
 }
 if(d.replaceMode==='garden'&&V.clock>=V.next){
  gardenReplace();
 }
 else if(d.replaceMode==='drift'||d.replaceMode==='hearts'){
  const a=V.actors.find(a=>a.life==='steady'&&V.clock>=Math.max(a.retireAt,a.born+(a.minRead||0))); 
  if(a)replaceActor(a,d.replaceMode==='hearts'?'hearts':'drift');
 }
 renderFloaters();drawSceneFX(dt);d.draw?.(dt);
}

function emit(x,y,n=10,color='#d9b477'){if(S.still)return;for(let i=0;i<n;i++){if(particles.length>=180)particles.shift();const a=i*2.3999;particles.push({x,y,dx:Math.cos(a)*(8+i%7*5),dy:Math.sin(a)*(8+i%5*5),life:2.1,age:0,color,r:1.6+i%3})}}
function drawSpark(c,x,y,r,opacity,color){c.save();c.globalAlpha=clamp(opacity,0,1);c.fillStyle=color;c.beginPath();c.moveTo(x,y-r*2);c.quadraticCurveTo(x+r*.25,y-r*.25,x+r*1.4,y);c.quadraticCurveTo(x+r*.25,y+r*.25,x,y+r*2);c.quadraticCurveTo(x-r*.25,y+r*.25,x-r*1.4,y);c.quadraticCurveTo(x-r*.25,y-r*.25,x,y-r*2);c.fill();c.restore()}

function mountFloaters(){
 const d=sceneDescriptor();
 V.actors=slots.map((b,i)=>{
  const random=randSeed(hashText(b.id+'scene'+S.s+i));
  const a={...b,el:b.el,x:b.x+b.d/2,y:b.y+b.d/2,homeX:b.x+b.d/2,homeY:b.y+b.d/2,vx:(random()>.5?1:-1)*(9+random()*11),vy:(random()-.5)*15,rng:random,phase:random()*TAU,rate:.14+random()*.11,pace:11+random()*10,z:random()*100-60,depth:.9+random()*.1,life:'steady',lifeAt:0,born:0,retireAt:17+i*9.2,nextTurn:2+random()*5};
  if(d.pace!==null)a.pace=d.pace;
  if(!smallFits(S.pool.find(r=>r.id===a.id)))a.large=true;
  return a;
 });
}

function forbidden(a){
 return sceneDescriptor().keepOut();
}

function steerOutside(a,box,dt){
 const rad=a.d*a.depth*.49+14;
 const px=clamp(a.x,box.x,box.x+box.w),py=clamp(a.y,box.y,box.y+box.h);
 const dx=a.x-px,dy=a.y-py,dist=Math.hypot(dx,dy);
 if(dist>rad)return;
 if(dist>.1){const push=(rad-dist)*.75; a.vx+=dx/dist*push*dt;a.vy+=dy/dist*push*dt;a.x+=dx/dist*Math.min(3,(rad-dist)*.12);a.y+=dy/dist*Math.min(3,(rad-dist)*.12)}
 else{const edges=[{d:Math.abs(a.x-box.x),x:-1,y:0},{d:Math.abs(a.x-box.x-box.w),x:1,y:0},{d:Math.abs(a.y-box.y),x:0,y:-1},{d:Math.abs(a.y-box.y-box.h),x:0,y:1}].sort((u,v)=>u.d-v.d);a.x+=edges[0].x*3;a.y+=edges[0].y*3}
}

function integrateFloaters(dt){
 const d=sceneDescriptor();
 for(const a of V.actors){
  if(d.integrate?.(a,dt))continue;
  if(a.large||!a.motion||a.life!=='steady')continue;
  const t=V.clock,noiseX=Math.sin(t*a.rate+a.phase)+.45*Math.sin(t*a.rate*.367+a.phase*3),noiseY=Math.cos(t*a.rate*.83+a.phase*2);
  a.vx+=noiseX*dt*4;a.vy+=noiseY*dt*3;
  let speed=Math.hypot(a.vx,a.vy),min=a.pace*.45,max=a.pace*(S.mode==='low'?.65:1);
  if(speed>max){a.vx*=1-(1-max/speed)*dt*1.3;a.vy*=1-(1-max/speed)*dt*1.3}
  if(speed<min){a.vx+=Math.cos(a.phase)*dt*2;a.vy+=Math.sin(a.phase)*dt*2}
  const rad=a.d*.51*a.depth,top=d.topMargin;
  if(a.x<rad+12){a.vx+=dt*24;a.x=Math.max(rad+3,a.x)}
  if(a.x>1812-rad-12){a.vx-=dt*24;a.x=Math.min(1809-rad,a.x)}
  if(a.y<top+rad){a.vy+=dt*19;a.y=Math.max(top+rad-5,a.y)}
  if(a.y>626-rad){a.vy-=dt*19;a.y=Math.min(631-rad,a.y)}
  forbidden(a).forEach(box=>steerOutside(a,box,dt));
 }
 for(let i=0;i<V.actors.length;i++)for(let j=i+1;j<V.actors.length;j++){
  const a=V.actors[i],b=V.actors[j];if(a.life!=='steady'||b.life!=='steady')continue;
  let dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy)||1,r=(a.d*a.depth+b.d*b.depth)/2+24;
  if(dist<r){let f=(r-dist)*dt*.95,nx=dx/dist,ny=dy/dist;if(!a.large){a.vx+=nx*f;a.vy+=ny*f;a.x+=nx*(r-dist)*.012;a.y+=ny*(r-dist)*.012}if(!b.large){b.vx-=nx*f;b.vy-=ny*f;b.x-=nx*(r-dist)*.012;b.y-=ny*(r-dist)*.012}}
 }
 V.actors.forEach(a=>{if(a.life==='steady'&&a.motion&&!a.large){a.x+=a.vx*dt;a.y+=a.vy*dt}});
}

function renderFloaters(){
 const d=sceneDescriptor();
 for(const a of V.actors){
  const t=V.clock;a.depth=a.large?1:.948+.048*Math.sin(t*(a.rate*.31)+a.phase);
  let x=a.x,y=a.y,scale=a.depth,op=1;const p=t-a.lifeAt;
  if(a.life==='swelling'){scale*=1+.09*smooth(p/.58);if(p>.58)op=1-smooth((p-.58)/.23)}
  if(a.life==='sprout'){const q=smooth(p/2.65);x=mix(a.originX,a.homeX,q)+Math.sin(q*Math.PI)*a.sproutBend;y=mix(654,a.homeY,q);scale*=.04+.96*outCubic(q);op=smooth(p/.5)}
  if(a.life==='exiting'){const q=smooth(p/3.8);x+=a.exitDX*q;y+=a.exitDY*q;scale*=1-.12*q;op=1-smooth((q-.55)/.45)}
  if(a.life==='entering'){const q=smooth(p/3.8);x=mix(a.originX,a.homeX,q);y=mix(a.originY,a.homeY,q)+Math.sin(q*Math.PI)*36;scale*=.75+.25*q;op=smooth(p/1.2)}
  if(a.life==='absent')op=0;
  a.screenX=x;a.screenY=y;a.screenScale=scale;a.opacity=op;
  if(d.place?.(a))continue;
  a.el.style.left=0;a.el.style.top=0;a.el.style.transform=`translate(${(x-a.d/2).toFixed(2)}px,${(y-a.d/2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
  a.el.style.opacity=op.toFixed(3);a.el.style.zIndex=String(Math.round(scale*100));
  a.el.style.filter=scale<.93?`blur(${((.93-scale)*3).toFixed(2)}px)`:'none';
  const b=slots.find(b=>b.key===a.key);if(b){b.x=x-a.d/2;b.y=y-a.d/2;b.phase=a.life}
 }
}

function replaceActor(a,mode){
 const r=choose([...V.actors.map(x=>x.id),...V.actors.map(x=>x.nextId).filter(Boolean)],a.expression);if(!r)return false;
 a.nextId=r.id;a.life=mode==='drift'?'exiting':'swelling';a.lifeAt=V.clock;
 a.exitDX=(a.x>900?1:-1)*(a.d+350);a.exitDY=(a.rng()-.5)*220;
 log('bubble_exit_start',{scene:S.s,id:a.id,kind:mode,age:V.clock-a.born});return true;
}

function installNext(a){
 let r=S.pool.find(r=>r.id===a.nextId);if(!eligible(r)){a.nextId=null;a.life='steady';return}
 a.id=r.id;S.lastShown.set(r.id,S.t);a.el.dataset.recordId=r.id;a.el.style.setProperty('--tint',catalog[r.ids[0]-1].color);
 // Larger messages keep a circle, using automatic verbatim page composition.
 a.el.innerHTML=`<div class="orb-life">${completeOrb(r,a.d)}</div>`;bindNumbers(a.el);a.reading=fitCircle(a.el,r,a.d,V.clock);
 const b=slots.find(x=>x.key===a.key);if(b){b.id=r.id;b.reading=a.reading;b.born=S.t}
 a.nextId=null;a.born=V.clock;a.retireAt=V.clock+26+a.rng()*8;
 a.homeX=clamp(a.x,180,1620);a.homeY=clamp(a.y,210,460);
 const d=sceneDescriptor();
 if(d.entrance==='sprout'){a.life='sprout';a.lifeAt=V.clock;a.originX=clamp(a.homeX+(a.rng()-.5)*200,80,1730);a.sproutBend=(a.rng()-.5)*110;gardenGlow(a.originX,V.clock)}
 else{a.life='entering';a.lifeAt=V.clock;const side=Math.floor(a.rng()*3);a.originX=side===0?-a.d:side===1?1812+a.d:a.homeX+(a.rng()-.5)*350;a.originY=side===2?720:a.homeY;}
 log('bubble_new',{scene:S.s,id:a.id,method:a.life});
}

function burstAt(x,y,kind,count=38,radius=90){
 const rng=randSeed(Math.floor(V.clock*1000)+count*31);V.fx.push({kind:'ring',x,y,r:radius,start:V.clock,life:1.25,color:'#e8c777'});
 for(let i=0;i<count;i++){const angle=rng()*TAU,speed=35+rng()*125;V.fx.push({kind,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-30,r:kind==='hearts'?5+rng()*11:5+rng()*12,phase:rng()*TAU,start:V.clock,life:2.2+rng()*2.5,color:kind==='hearts'?['#ec9cad','#e0b9c9','#eabb89'][i%3]:['#e7b2bc','#e8c575','#d1b8d2','#bad19c'][i%4]})}
 if(V.fx.length>250)V.fx.splice(0,V.fx.length-250);
}

function drawHeartParticle(c,x,y,r,angle,color){c.save();c.translate(x,y);c.rotate(angle);c.scale(r/10,r/10);c.fillStyle=color;c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-18,-3,-7,-15,0,-6);c.bezierCurveTo(7,-15,18,-3,0,7);c.fill();c.restore()}

function drawSceneFX(dt){
 const c=V.canvas?.getContext('2d');if(!c)return;c.clearRect(0,0,1812,636);
 V.fx=V.fx.filter(p=>V.clock-p.start<p.life);
 for(const p of V.fx){const age=V.clock-p.start,q=clamp(age/p.life,0,1);c.save();c.globalAlpha=Math.sin(Math.PI*q)*.85;
 if(p.kind==='ring'){c.globalAlpha=(1-q)*.7;c.strokeStyle=p.color;c.lineWidth=2*(1-q)+.2;c.beginPath();c.arc(p.x,p.y,p.r+q*130,0,TAU);c.stroke()}
 else if(p.kind==='return'){
  const x=curve(p.x,p.x+170,p.tx-140,p.tx,q),y=curve(p.y,p.y-100,490,p.ty,q);
  c.shadowBlur=16;c.shadowColor=p.color;drawSpark(c,x,y,6,1-q*.2,p.color);
  c.strokeStyle=p.color;c.lineWidth=2;c.beginPath();for(let k=0;k<10;k++){const s=Math.max(0,q-k*.009),xx=curve(p.x,p.x+170,p.tx-140,p.tx,s),yy=curve(p.y,p.y-100,490,p.ty,s);k?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.stroke();
 }else{const x=p.x+p.vx*age*.55+Math.sin(age*1.7+p.phase)*age*11,y=p.y+p.vy*age*.5+age*age*8;
 if(p.kind==='hearts')drawHeartParticle(c,x,y,p.r,age*.6+p.phase,p.color);
 else{c.translate(x,y);c.rotate(age*1.1+p.phase);c.scale(.7+.3*Math.sin(age*2+p.phase),1);c.fillStyle=p.color;c.beginPath();c.moveTo(0,-p.r);c.bezierCurveTo(p.r*1.5,-p.r,p.r,p.r,0,p.r);c.bezierCurveTo(-p.r*.7,p.r,-p.r*.9,-p.r*.5,0,-p.r);c.fill()}}
 c.restore();}
}
