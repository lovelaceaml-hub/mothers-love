// Core orb rendering and circular measurement helpers.
'use strict';

function completeOrb(r,d,{event=false,group=false}={}){
 const size=d>=450?'orb-large':d<285?'orb-small':'';
 return `<div class="orb-breath"><article class="orb ${size}" style="--tint:${catalog[r.ids[0]-1].color}"><div class="orb-sheen"></div><div class="orb-content"><div class="thanks">THANK YOU,</div><h3 class="recipient">${esc(r.name)}</h3><p class="message" data-full-message="${esc(r.id)}">${esc(r.message)}</p>${chips(r.ids)}${reactionMarkup(r)}<div class="orb-page-indicator" hidden></div></div></article></div>`;
}
function addOrb(r,x,y,d,opts={}){
 if(!r)return '';const key='slot-'+(++S.slotCounter);
 slots.push({id:r.id,key,x,y,d,born:S.t,phase:'steady',since:S.t,serial:S.slotCounter,expression:opts.expression||null,large:!!opts.large,motion:opts.motion!==false});
 S.lastShown.set(r.id,S.t);
 return `<div class="orb-slot" id="${key}" data-record-id="${esc(r.id)}" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;--tint:${catalog[r.ids[0]-1].color}"><div class="orb-life">${completeOrb(r,d)}</div></div>`;
}
function smallFits(r){return r.message.length<=160&&r.ids.length<=3&&r.name.length<25}
function emptyPanel(){return `<div class="safe-panel"><div class="eyebrow">A quiet moment</div><h1>Kindness begins<br>with a word.</h1><p>No recognitions are currently cleared for display.<br>Scan the QR to recognize someone.</p></div>`}
function readerSlot(r,x,y,w,h){const d=Math.min(w,h);return addOrb(r,x+(w-d)/2,y,d,{large:true})}
function rightBubbles(){
 const chosen=[];for(let i=0;i<4;i++){const r=choose(chosen.map(a=>a.id));if(r)chosen.push(r)}
 const long=chosen.find(r=>!smallFits(r));if(long)return readerSlot(long,861,37,925,586);
 const ps=[[885,23,312],[1301,26,320],[824,323,304],[1454,330,295]];
 return chosen.map((r,i)=>addOrb(r,...ps[i])).join('');
}
function safeScene(){const label=S.mode==='neutral'?'Recognitions paused':'Connection not verified';return `<div class="safe-panel"><div class="eyebrow">${label}</div><h1>The Words of<br>${shimmer('Mother’s Love')}</h1><p>${S.mode==='neutral'?'The operator has selected a neutral display.':'Names and messages stay hidden until display access is verified.'}</p><p class="serif">Where a mother’s love resides, peace abides.</p></div>`}
function checkFullFits(){slots.forEach(b=>{const r=S.pool.find(x=>x.id===b.id);if(!r||!b.el)return;b.reading=fitCircle(b.el,r,b.d,V.clock);b.el.dataset.long=String(!smallFits(r))})}
function fullReader(r,w,h){return completeOrb(r,Math.min(w,h))}
function fitCircle(el,r,d,clock=0){
 const content=el.querySelector('.orb-content'),msg=el.querySelector('.message');if(!content||!msg)return null;
 const title=el.querySelector('.recipient'),chipBox=el.querySelector('.chips'),page=el.querySelector('.orb-page-indicator');
 const grouped=el.classList.contains('grouped');
 let font=d>=450?28:grouped?18.5:d>=335?24:21;
 if(r.name.length>16)title.style.fontSize=(d>=450?30:23)+'px';
 if(r.ids.length>3){chipBox.style.gap='3px';chipBox.querySelectorAll('.chip').forEach(x=>{x.style.fontSize=(d>=450?13:10)+'px';x.style.padding='2px 4px'})}
 msg.style.fontSize=font+'px';msg.style.lineHeight='1.27';msg.textContent=r.message;
 content.style.width=(grouped?'83%':'80%');content.style.maxWidth=content.style.width;
 const limit=d*.855;
 if(d<335){title.style.fontSize='26px';chipBox.querySelectorAll('.chip').forEach(x=>{x.style.fontSize='10.5px';x.style.padding='2px 3px';x.querySelector('img').style.width='16px';x.querySelector('img').style.height='16px'});chipBox.style.marginTop='6px';el.querySelector('.like-count')?.style.setProperty('margin-top','6px')}
 while(content.scrollHeight>limit&&font>(d>=450?22:grouped?18:20)){font-=.5;msg.style.fontSize=font+'px'}
 if(content.scrollHeight<=limit){page.hidden=true;return{pages:[r.message],index:0,at:clock,duration:Math.max(9,r.message.length/14)}}
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
