// Core recognition arrival event state machine and presentation.
'use strict';

function cancelActiveEvent(){active=null;transition=null;S.chain=false;$('event')?.replaceChildren();$('event')?.classList.remove('active');$('stage')?.classList.remove('dimmed');$('qr-zone')?.classList.remove('qr-active');renderQueue()}

function beginEvent(){
 if(active&&active.phase!=='gap')return;
 S.queue=S.queue.filter(id=>eligible(S.pool.find(r=>r.id===id)));
 if(!S.queue.length){endChain();return}
 const items=S.queue.splice(0,S.queue.length>=10?10:1).map(id=>S.pool.find(r=>r.id===id)),group=items.length===10;
 if(!S.chain){S.chain=true;S.returnScene=S.s;S.returnAge=S.sceneAge;$('stage').classList.add('dimmed')}
 const style=nextStyle(group?'group':'single');
 const frameStyle=nextArrivalFrame();
 active={items,kind:group?'group':'single',style,frameStyle,phase:'entrance',phaseAt:S.t,hold:group?30:8,entrance:S.still?0:group?4.7:3.6,exit:S.still?0:1.35,page:0,oversize:group&&items.some(r=>!smallFits(r)),elements:[],localTime:0,exitPos:null};
 buildEvent();
 log('entrance_start',{kind:active.kind,style:group?GROUP_STYLES[style]:SINGLE_STYLES[style],frame:ARRIVAL_FRAME_STYLES[frameStyle],ids:items.map(x=>x.id)});renderQueue();
}

function buildEvent(){
 const a=active;if(!a)return;const group=a.kind==='group';
 const root=$('event');root.className='event-stage active'+(S.still?' still':'');root.dataset.style=(group?'group-':'single-')+a.style;
 root.dataset.frame=String(a.frameStyle);root.dataset.frameName=ARRIVAL_FRAME_STYLES[a.frameStyle];
 const frameMarkup=arrivalBuildFrameMarkup(a.frameStyle,a.kind);
 root.innerHTML=`${frameMarkup}<div class="event-world ${group?'group-world':''}"></div>${group?`<h2 class="group-title">${shimmer(GROUP_TITLES[a.style])}</h2><span class="group-kind">${esc(GROUP_STYLES[a.style].toUpperCase())} · A WAVE OF TEN</span>`:`<div class="event-kicker">A NEW RECOGNITION HAS ARRIVED</div><div class="event-title"><div class="eyebrow">Mother’s Love, shared</div><h2>${shimmer('Kindness')}<br>comes full circle.</h2><p>A moment of appreciation<br>for you.</p></div><div class="countdown-caption">${esc(SINGLE_STYLES[a.style])} · ${esc(ARRIVAL_FRAME_STYLES[a.frameStyle])}</div>`}<canvas class="event-sparkles" id="event-canvas" width="1812" height="615" aria-hidden="true"></canvas><div id="event-items"></div>`;
 a.elements=[];
 if(a.oversize){buildGroupPage(0);log('extended_group_reading',{reason:'Long messages are shown in circular pairs with content-aware reading time.'})}
 else{
  a.items.forEach((r,i)=>{
   const d=group?258:540,x=group?175+i%5*365:1070,y=group?184+Math.floor(i/5)*286:310;
   a.elements.push(eventElement(r,d,x,y,i,group));
  });
  const longest=Math.max(...a.elements.map(b=>b.reading.pages.reduce((n,s)=>n+Math.max(8,s.length/14),0)));
  a.hold=group?Math.max(30,longest):Math.max(8,longest);
 }
 $('qr-zone').classList.add('qr-active');
 drawEventParticles(0);
}

function buildGroupPage(page){
 const a=active;if(!a)return;a.page=page;$('event-items').replaceChildren();a.elements=[];
 a.items.slice(page*2,page*2+2).forEach((r,i)=>a.elements.push(eventElement(r,518,505+i*787,330,i,false)));
 a.hold=Math.max(10,...a.elements.map(b=>b.reading.pages.reduce((n,s)=>n+Math.max(9,s.length/14),0)));
 const cap=document.querySelector('.group-kind');if(cap)cap.textContent=`CIRCULAR FULL-MESSAGE PAIRS · ${page+1}/5 · EXTENDED READING`;
}

function tickEvent(dt){
 const a=active;if(!a)return;let elapsed=S.t-a.phaseAt;
 if(a.phase==='gap'){if(elapsed>=.4)beginEvent();return}
 if(a.phase==='entrance'){
  const p=S.still?1:clamp(elapsed/a.entrance,0,1);
  a.elements.forEach((b,i)=>{
   let pos=a.kind==='group'?groupTrajectory(a.style,a.oversize?i*5:i,p,b):singleTrajectory(a.style,p);
   if(a.oversize)pos={...pos,x:mix(pos.x,b.x,smooth(p)),y:mix(pos.y,b.y,smooth(p))};
   if(S.still)pos={x:b.x,y:b.y,z:0,k:1,alpha:1};positionEvent(b,pos);
  });drawEventParticles(p);
  if(p>=1){a.phase='reading';a.phaseAt=S.t;a.localTime=0;a.elements.forEach(b=>{b.reading.at=0;positionEvent(b,{x:b.x,y:b.y,k:1,z:0,alpha:1})});$('qr-zone').classList.remove('qr-active');$('event-canvas').getContext('2d').clearRect(0,0,1812,615);log('reading_start',{kind:a.kind,duration:a.hold,page:a.page,ids:a.items.map(r=>r.id)})}
 }else if(a.phase==='reading'){
  a.localTime=elapsed;
  a.elements.forEach((b,i)=>{tickCirclePages(b,elapsed);if(!S.still)positionEvent(b,{x:b.x+Math.sin(elapsed*.27+i*1.73)*2,y:b.y+Math.sin(elapsed*.32+i*2.39)*3,z:0,k:1,alpha:1})});
  if(elapsed>=a.hold){
   if(a.oversize&&a.page<4){buildGroupPage(a.page+1);a.phase='entrance';a.phaseAt=S.t;a.entrance=S.still?0:1.5}
   else{
    a.phase='exit';a.phaseAt=S.t;
    const feed=$('feed-columns'), targetEl=feed?.firstElementChild||feed;
    const stageEl=$('event');
    let exitPos=null;
    if(targetEl&&stageEl){
     const tr=targetEl.getBoundingClientRect(), sr=stageEl.getBoundingClientRect();
     if(tr.width>0&&tr.height>0&&sr.width>0){
      const scaleFactor=sr.width/1812;
      exitPos={
       x:(tr.left+tr.width/2-sr.left)/scaleFactor,
       y:(tr.top+tr.height/2-sr.top)/scaleFactor
      };
     }
    }
    a.exitPos=exitPos;
    log('reading_end',{kind:a.kind,ids:a.items.map(r=>r.id)});
    arrivalSpawnExitBurst(a);
   }
  }
 }else if(a.phase==='exit'){
  const p=S.still?1:smooth(elapsed/a.exit);
  a.elements.forEach((b,i)=>{
   let tx, ty, tk;
   if(a.exitPos){
    tx=a.exitPos.x;
    ty=a.exitPos.y;
    tk=Math.min(0.2, 52/b.d);
   }else{
    tx=b.x+(a.kind==='group'?(i%2?180:-180):110);
    ty=b.y-100;
    tk=0.75;
   }
   const curX=mix(b.x,tx,p);
   const curY=mix(b.y,ty,p);
   const curK=mix(1,tk,p);
   const curZ=-p*200;
   const curAlpha=1-p;
   positionEvent(b,{x:curX,y:curY,z:curZ,k:curK,alpha:curAlpha});
  });
  if(p>=1){log('presentation_complete',{kind:a.kind,ids:a.items.map(r=>r.id),hold:a.hold});if(S.queue.length){active={...a,phase:'gap',phaseAt:S.t};$('event-items').replaceChildren()}else{active=null;endChain()}}
 }
 renderQueue();
}

function endChain(){if(active&&active.phase!=='gap')return;active=null;S.chain=false;$('event').className='event-stage';$('event').replaceChildren();$('stage').classList.remove('dimmed');$('qr-zone').classList.remove('qr-active');renderQueue();if(S.pendingScene){const id=S.pendingScene;S.pendingScene=null;requestScene(id)}else if(S.milestonePending){const v=S.milestonePending;S.milestonePending=null;captureMilestone(v);requestScene(11)}log('queue_drained',{resumeScene:S.s})}

function drawEventParticles(p){
 const a=active,can=$('event-canvas'),c=can?.getContext('2d');if(!c||!a)return;c.clearRect(0,0,1812,615);if(S.still)return;
 const group=a.kind==='group',style=a.style,strength=Math.sin(Math.PI*p);
 // Projected rings, trails and cloud-to-pearl geometry are unique to each entrance.
 function ring(x,y,rx,ry,alpha,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.strokeStyle=`rgba(216,173,81,${alpha})`;c.shadowBlur=18;c.shadowColor='#f6d284';c.lineWidth=1.7;c.beginPath();c.ellipse(0,0,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.stroke();c.restore()}
 if(!group&&style===0)for(let i=0;i<7;i++){const q=clamp(p*1.2-i*.06,0,1);ring(1070,310,100+q*390,170+q*160,(1-q)*.4,.25*Math.sin(p*3))}
 if(!group&&style===3){for(let i=0;i<4;i++)ring(1070,555,50+p*310+i*29,8+p*42+i*4,strength*.23)}
 if(group&&style===4){[430,906,1382].forEach((x,j)=>{for(let i=0;i<3;i++){const q=clamp((p-j*.1)*1.6-i*.12,0,1);ring(x,305,20+q*340,18+q*190,(1-q)*q*.8)}})}
 if(!group&&style===5){
  for(let i=0;i<7;i++){const angle=i*TAU/7+p*.6,r=70+smooth(p)*360,x=1070+Math.cos(angle)*r,y=310+Math.sin(angle)*r*.7;c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);c.globalAlpha=strength*.45;c.fillStyle=['#f0cbd6','#efddb6','#ead3c5'][i%3];c.beginPath();c.ellipse(0,-20,45*(1-p)+10,120*(1-p)+30,0,0,TAU);c.fill();c.restore()}
 }
 // Motion ribbons are evaluated analytically; no frame-rate-dependent trails.
 if((!group&&[1,4].includes(style))||(group&&[1,2,3].includes(style))){
  a.elements.forEach((b,j)=>{
   c.save();c.lineWidth=group?2.5:5;c.lineCap='round';c.strokeStyle=group?'#d3b7aa68':'#dfbb7688';c.shadowColor='#edcc8a';c.shadowBlur=15;c.beginPath();
   for(let i=0;i<22;i++){const q=Math.max(0,p-i*.008),pos=group?groupTrajectory(style,a.oversize?j*5:j,q,b):singleTrajectory(style,q);i?c.lineTo(pos.x,pos.y):c.moveTo(pos.x,pos.y)}c.stroke();c.restore();
  });
 }
 const N=group?155:115;
 for(let i=0;i<N;i++){
  const theta=i*2.39996,band=i%9,cx=group?906:1070,cy=310;
  let x,y,r=1.5+i%4,alpha=strength*.65,z=0;
  if(!group&&style===2){const q=smooth(p/.86),radius=mix(610,190,q);x=cx+Math.cos(theta+p*2)*radius;y=cy+Math.sin(theta+p*2)*radius*.65;z=Math.sin(theta)*200*(1-q);alpha=Math.sin(Math.PI*q)*.8;}
  else if(group&&style===3){const q=(p+i*.001)%1,base=[300,906,1512][i%3];x=base+Math.cos(theta)*q*220;y=660-q*870+q*q*450;r=4+i%6;alpha=Math.sin(Math.PI*q)*strength*.6;}
  else{const radius=65+band*19+p*(group?300:190);x=cx+Math.cos(theta+p*.65)*radius*(group?2.5:1.35);y=cy+Math.sin(theta+p*.65)*radius*.76;z=Math.cos(theta)*160;}
  const k=900/(900-z);x=cx+(x-cx)*k;y=cy+(y-cy)*k;
  if((!group&&style===5)||(group&&style===3)){c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(theta+p);c.fillStyle=i%3?'#e8c8b0':'#e4bccd';c.beginPath();c.ellipse(0,0,r,2*r,0,0,TAU);c.fill();c.restore()}
  else if((!group&&style===2)||(group&&style===4)){c.save();c.globalAlpha=alpha;c.fillStyle=i%3?'#fff1bf':'#e3d4ed';c.shadowColor='#f9d286';c.shadowBlur=6;c.beginPath();c.arc(x,y,r*k,0,TAU);c.fill();c.restore()}
  else drawSpark(c,x,y,r*k,alpha,i%3?'#dfbe7d':'#d4bad5');
 }
}

function nextStyle(kind){
 const key=kind==='group'?'groupBag':'singleBag',count=kind==='group'?5:6;
 const manual=null;
 if(manual&&manual!=='auto')return +manual;
 if(!S[key]?.length){
  const values=Array.from({length:count},(_,i)=>i),rng=randSeed(1009+S.idCounter*67+(kind==='group'?419:0));
  for(let i=values.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[values[i],values[j]]=[values[j],values[i]]}
  const last=S[key+'Last'];if(values[0]===last)[values[0],values[1]]=[values[1],values[0]];
  S[key]=values;
 }
 const next=S[key].shift();S[key+'Last']=next;return next;
}

function eventElement(r,d,x,y,index,group){
 const ringEl=document.createElement('div');ringEl.className='arrival-ring';
 ringEl.style.cssText=`width:${d}px;height:${d}px;opacity:0;--tint:${catalog[r.ids[0]-1].color};`;
 $('event-items').append(ringEl);
 const el=document.createElement('div');el.className='event-orb '+(group?'grouped':'');el.dataset.eventId=r.id;el.style.cssText=`left:0;top:0;width:${d}px;height:${d}px;opacity:0;--tint:${catalog[r.ids[0]-1].color}`;
 el.innerHTML=completeOrb(r,d,{event:true,group});$('event-items').append(el);bindNumbers(el);
 markShown(r.id);log('arrival_record_shown',{id:r.id});
 const b={el,ringEl,r,d,x,y,index,trail:[],reading:null,screenX:x,screenY:y};b.reading=fitCircle(el,r,d,0);return b;
}

function positionEvent(b,pos){
 b.el.style.transform=`translate(${(pos.x-b.d/2).toFixed(2)}px,${(pos.y-b.d/2).toFixed(2)}px) scale(${pos.k.toFixed(4)})`;
 b.el.style.opacity=clamp(pos.alpha,0,1);b.el.style.zIndex=String(600+Math.round(clamp(pos.z,-500,450)));
 b.screenX=pos.x;b.screenY=pos.y;b.scale=pos.k;b.opacity=pos.alpha;
 if(b.ringEl){
  const rot=S.still?'rotateY(0deg) rotateX(20deg)':`rotateY(${((S.t*60+b.index*35)%360).toFixed(1)}deg) rotateX(20deg)`;
  b.ringEl.style.transform=`translate(${(pos.x-b.d/2).toFixed(2)}px,${(pos.y-b.d/2).toFixed(2)}px) ${rot}`;
  b.ringEl.style.opacity=clamp(pos.alpha,0,1);
  b.ringEl.style.zIndex=String(590+Math.round(clamp(pos.z,-500,450)));
 }
}
