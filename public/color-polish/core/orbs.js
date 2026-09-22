// Core orb rendering and circular measurement helpers.
'use strict';

function completeOrb(r,d,{event=false,group=false}={}){
 const size=d>=450?'orb-large':d<285?'orb-small':'';
 return `<div class="orb-breath"><article class="orb ${size}" style="--tint:${catalog[r.ids[0]-1].color}"><div class="orb-sheen"></div><div class="orb-content"><div class="thanks">THANK YOU,</div><h3 class="recipient">${esc(r.name)}</h3><p class="message" data-full-message="${esc(r.id)}">${esc(r.message)}</p>${chips(r.ids)}${reactionMarkup(r)}<div class="orb-page-indicator" hidden></div></div></article></div>`;
}
function addOrb(r,x,y,d,opts={}){
 if(!r)return '';const key='slot-'+(++S.slotCounter);
 slots.push({id:r.id,key,x,y,d,born:S.t,phase:'steady',since:S.t,serial:S.slotCounter,expression:opts.expression||null,large:!!opts.large,motion:opts.motion!==false,growMax:opts.growMax||null});
 S.lastShown.set(r.id,S.t);
 markShown(r.id);
 return `<div class="orb-slot" id="${key}" data-record-id="${esc(r.id)}"${opts.growMax?` data-grow-max="${opts.growMax}"`:''} style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;--tint:${catalog[r.ids[0]-1].color}"><div class="orb-life">${completeOrb(r,d)}</div></div>`;
}
function smallFits(r){return r.message.length<=160&&r.ids.length<=3&&r.name.length<25}
function emptyPanel(){return `<div class="safe-panel"><div class="eyebrow">A quiet moment</div><h1>Kindness begins<br>with a word.</h1><p>No recognitions are currently cleared for display.<br>Scan the QR to recognize someone.</p></div>`}
function readerSlot(r,x,y,w,h){const d=Math.min(w,h);return addOrb(r,x+(w-d)/2,y,d,{large:true})}
function drawSlots(records,positions,{readerBounds=null,forceId=null}={}){
 if(!records||!records.length||!positions||!positions.length)return '';
 const targetForce=forceId||S.forceId||null;
 const posIndices=positions.map((p,i)=>({i,x:p[0],y:p[1],d:p[2]}));
 const sortedSlots=[...posIndices].sort((a,b)=>b.d-a.d);
 const assigned=new Array(positions.length);
 const recs=[...records];
 let forcedRecord=null;
 if(targetForce){
  const idx=recs.findIndex(r=>r.id===targetForce);
  if(idx>=0){
   forcedRecord=recs.splice(idx,1)[0];
   S.forceId=null;
  }
 }
 if(forcedRecord){
  assigned[sortedSlots[0].i]=forcedRecord;
  recs.sort((a,b)=>(!smallFits(a)&&smallFits(b)?-1:smallFits(a)&&!smallFits(b)?1:0));
  for(let k=1;k<sortedSlots.length&&k-1<recs.length;k++){
   assigned[sortedSlots[k].i]=recs[k-1];
  }
 }else{
  recs.sort((a,b)=>(!smallFits(a)&&smallFits(b)?-1:smallFits(a)&&!smallFits(b)?1:0));
  for(let k=0;k<sortedSlots.length&&k<recs.length;k++){
   assigned[sortedSlots[k].i]=recs[k];
  }
 }
 return positions.map((p,i)=>{
  const r=assigned[i];
  if(!r)return '';
  let [x,y,d]=p;
  let growMax=d;
  if(!smallFits(r)){
   let maxAllowed=Infinity;
   if(readerBounds){
    if(typeof readerBounds.maxW==='number')maxAllowed=Math.min(maxAllowed,readerBounds.maxW-x);
    if(typeof readerBounds.maxH==='number')maxAllowed=Math.min(maxAllowed,readerBounds.maxH-y);
   }
   for(let j=0;j<positions.length;j++){
    if(j===i)continue;
    const [ox,oy,od]=positions[j];
    if(x<ox+od&&y<oy+od){
     const limitJ=Math.max(ox-x,oy-y);
     maxAllowed=Math.min(maxAllowed,limitJ);
    }
   }
   const cap=maxAllowed>=d?maxAllowed:d;
   growMax=cap;
   d=cap;
  }
  return addOrb(r,x,y,d,{growMax,large:!smallFits(r)});
 }).join('');
}
function rightBubbles(){
 const chosen=[];for(let i=0;i<4;i++){const r=choose(chosen.map(a=>a.id));if(r)chosen.push(r)}
 const ps=[[885,23,312],[1301,26,320],[824,323,304],[1454,330,295]];
 return drawSlots(chosen,ps,{readerBounds:{maxW:1786,maxH:623}});
}
function safeScene(){const label=S.mode==='neutral'?'Recognitions paused':'Connection not verified';return `<div class="safe-panel"><div class="eyebrow">${label}</div><h1>The Words of<br>${shimmer('Mother’s Love')}</h1><p>${S.mode==='neutral'?'The operator has selected a neutral display.':'Names and messages stay hidden until display access is verified.'}</p><p class="serif">Where a mother’s love resides, peace abides.</p></div>`}
function checkFullFits(){slots.forEach(b=>{const r=S.pool.find(x=>x.id===b.id);if(!r||!b.el)return;b.reading=fitCircle(b.el,r,b.d,V.clock);b.el.dataset.long=String(!smallFits(r))})}
function fullReader(r,w,h){return completeOrb(r,Math.min(w,h))}
function fitCircle(el,r,d,clock=0,growBudget=null){
 const content=el.querySelector('.orb-content'),msg=el.querySelector('.message');if(!content||!msg)return null;
 const title=el.querySelector('.recipient'),chipBox=el.querySelector('.chips'),page=el.querySelector('.orb-page-indicator');
 const grouped=el.classList.contains('grouped');
 const fontFloor=18;
 let font=d>=450?28:grouped?18.5:d>=335?24:21;
 if(r.name.length>16)title.style.fontSize=(d>=450?30:23)+'px';
 if(r.ids.length>3){chipBox.style.gap='3px';chipBox.querySelectorAll('.chip').forEach(x=>{x.style.fontSize=(d>=450?13:10)+'px';x.style.padding='2px 4px'})}
 msg.style.fontSize=font+'px';msg.style.lineHeight='1.27';msg.textContent=r.message;
 content.style.width=(grouped?'83%':'80%');content.style.maxWidth=content.style.width;
 let limit=d*.855;
 if(d<335){title.style.fontSize='26px';chipBox.querySelectorAll('.chip').forEach(x=>{x.style.fontSize='10.5px';x.style.padding='2px 3px';x.querySelector('img').style.width='16px';x.querySelector('img').style.height='16px'});chipBox.style.marginTop='6px';el.querySelector('.like-count')?.style.setProperty('margin-top','6px')}
 while(content.scrollHeight>limit&&font>fontFloor){font-=.5;msg.style.fontSize=font+'px'}
 if(content.scrollHeight<=limit){page.hidden=true;return{pages:[r.message],index:0,at:clock,duration:Math.max(9,r.message.length/14)}}
 const slotEl=el.classList.contains('orb-slot')?el:el.closest('.orb-slot');
 const maxD=growBudget!==null?growBudget:parseFloat(slotEl?.dataset?.growMax||el.dataset?.growMax||'0');
 if(maxD>d){
  d=maxD;
  if(slotEl){
   slotEl.style.width=d+'px';slotEl.style.height=d+'px';
   slotEl.dataset.growMax=String(d);
  }
  const slotObj=slots.find(s=>s.key===slotEl?.id);if(slotObj)slotObj.d=d;
  const actor=typeof V!=='undefined'?V.actors?.find(a=>a.key===slotEl?.id):null;if(actor)actor.d=d;
  const orb=el.querySelector('.orb')||(el.classList.contains('orb')?el:null);
  if(orb){if(d>=450){orb.classList.add('orb-large');orb.classList.remove('orb-small')}else if(d<285){orb.classList.add('orb-small');orb.classList.remove('orb-large')}}
  font=d>=450?28:grouped?18.5:d>=335?24:21;
  if(r.name.length>16)title.style.fontSize=(d>=450?30:23)+'px';
  if(r.ids.length>3){chipBox.style.gap='3px';chipBox.querySelectorAll('.chip').forEach(x=>{x.style.fontSize=(d>=450?13:10)+'px';x.style.padding='2px 4px'})}
  if(d<335){title.style.fontSize='26px';chipBox.querySelectorAll('.chip').forEach(x=>{x.style.fontSize='10.5px';x.style.padding='2px 3px';x.querySelector('img').style.width='16px';x.querySelector('img').style.height='16px'});chipBox.style.marginTop='6px';el.querySelector('.like-count')?.style.setProperty('margin-top','6px')}
  msg.style.fontSize=font+'px';
  limit=d*.855;
  while(content.scrollHeight>limit&&font>fontFloor){font-=.5;msg.style.fontSize=font+'px'}
  if(content.scrollHeight<=limit){page.hidden=true;return{pages:[r.message],index:0,at:clock,duration:Math.max(9,r.message.length/14)}}
 }
 page.hidden=false;page.textContent='01 / 02 · CONTINUED';
 const pages=[],words=r.message.match(/\S+\s*|\s+/g)||[r.message];let buffer='';
 for(const word of words){msg.textContent=buffer+word;if(content.scrollHeight>limit&&buffer){pages.push(buffer);buffer=word}else buffer+=word}
 if(buffer)pages.push(buffer);
 msg.textContent=pages[0];page.textContent=`01 / ${String(pages.length).padStart(2,'0')} · CONTINUED`;
 log('circular_pagination',{id:r.id,pages:pages.length,diameter:d,verbatim:pages.join('')===r.message});
 return{pages,index:0,at:clock,duration:Math.max(9,pages[0].length/14)};
}
function tickCirclePages(a,t){
 if(!a.reading||a.reading.pages.length<2)return;
 const p=a.reading;if(t-p.at<p.duration)return;
 p.index=(p.index+1)%p.pages.length;p.at=t;p.duration=Math.max(9,p.pages[p.index].length/14);
 a.el.querySelector('.message').textContent=p.pages[p.index];
 a.el.querySelector('.orb-page-indicator').textContent=`${String(p.index+1).padStart(2,'0')} / ${String(p.pages.length).padStart(2,'0')} · ${p.index===p.pages.length-1?'COMPLETE':'CONTINUED'}`;
}
