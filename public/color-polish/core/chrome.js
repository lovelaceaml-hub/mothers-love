// Core feed rail, header, atmosphere, and countdown display.
'use strict';

// Persistent independent feed tracks. Full strings remain intact and timestamps never reset on replay.
function chatMarkup(r,incoming=false){return `<article class="chat-item ${incoming?'incoming-item':''}" data-feed-id="${esc(r.id)}" style="--tint:${catalog[r.ids[0]-1].color}"><div class="chat-avatar">${icon(r.ids[0])}</div><div><div class="chat-head"><strong class="chat-name">${esc(r.name)}</strong><time class="chat-time" datetime="${new Date(r.createdAt).toISOString()}">${submittedStamp(r)}</time></div><p class="chat-message" data-full-message="${esc(r.id)}">${esc(r.message)}</p><div class="chat-foot">${r.ids.map(id=>`${icon(id)}<span>${esc(catalog[id-1].name)}</span>`).join('<span> · </span>')}${reactionMarkup(r,'span','chat-like')}</div></div></article>`}
function initFeed(){feedLanes=[];const p=records().sort((a,b)=>b.createdAt-a.createdAt);if(!p.length){$('feed-columns').innerHTML='<div class="feed-safe" style="grid-column:1/-1">'+(['offline','neutral'].includes(S.mode)?'Recognition feed paused · no names or messages displayed.':'No recognitions cleared for display yet.')+'</div>';return}$('feed-columns').innerHTML='<div class="feed-lane" id="lane0"></div><div class="feed-lane" id="lane1"></div>';for(let n=0;n<2;n++){const list=p.filter((_,i)=>i%2===n);if(!list.length)continue;const track=document.createElement('div');track.className='feed-track';$('lane'+n).append(track);const lane={el:track,index:n,offset:n?24:0,cursor:0,list:list.map(r=>r.id),next:[]};for(let i=0;i<Math.min(9,list.length);i++){track.insertAdjacentHTML('beforeend',chatMarkup(list[i]));lane.cursor++}feedLanes.push(lane);bindNumbers(track)}}
function addFeed(r){if(!feedLanes.length){initFeed();return}S.feedArrivalCounter=(S.feedArrivalCounter||0)+1;const lane=feedLanes[S.feedArrivalCounter%feedLanes.length],temp=document.createElement('div');temp.innerHTML=chatMarkup(r,true);const node=temp.firstElementChild;let y=-lane.offset,before=null;for(const child of lane.el.children){if(y>=115){before=child;break}y+=child.getBoundingClientRect().height/getScale()+9}lane.el.insertBefore(node,before);while(lane.el.children.length>12)lane.el.lastElementChild.remove();bindNumbers(node);log('feed_insertion',{id:r.id,lane:lane.index})}

function tickFeeds(dt){if(S.still||!records().length)return;for(const lane of feedLanes){lane.offset+=dt*5.5;const first=lane.el.firstElementChild;if(!first)continue;const h=first.getBoundingClientRect().height/getScale()+9;if(lane.offset>=h){lane.offset-=h;first.remove();let id=lane.next.shift();if(!id){const p=records().filter((_,i)=>i%2===lane.index);if(p.length)id=p[(lane.cursor++)%p.length].id}const r=S.pool.find(x=>x.id===id);if(eligible(r)){const temp=document.createElement('div');temp.innerHTML=chatMarkup(r,false);lane.el.append(temp.firstElementChild);bindNumbers(lane.el)}}lane.el.style.transform=`translate3d(0,${-lane.offset}px,0)`;}}
function getScale(){return $('tv').getBoundingClientRect().width/1920||1}
function updateHeader(){const now=effectiveNow();const date=now?new Intl.DateTimeFormat('en-US',{timeZone:ZONE,month:'long',day:'numeric',year:'numeric'}).format(now):'';const sourceLabel=S.source==='sample'?'SIMULATED SAMPLE':'LIVE CAMPAIGN';if($('header-time'))$('header-time').innerHTML=date+`<small>${sourceLabel} · `+(now?new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(now):'')+'</small>';const total=reactionTotal();const likes=$('campaign-likes');if(likes){if(total===null){likes.replaceChildren();likes.hidden=true;likes.style.display='none'}else{likes.hidden=false;likes.style.display='flex';likes.innerHTML=THUMB+num('likes')+`<span>${reactionWord(total)}</span>`;bindNumbers(likes)}}S.lastHeader=Math.floor(S.t/30)}
function renderQueue(){const el=$('queue');if(!active&&!S.queue.length){el.hidden=true;return}el.hidden=false;const a=active,secs=a&&a.phase==='reading'?Math.max(0,Math.ceil(a.hold-(S.t-a.phaseAt))):null;el.innerHTML=`<span class="queue-badge">${S.queue.length}</span><span>waiting</span><span class="queue-dots">${Array.from({length:5},(_,i)=>`<i class="${i<Math.min(5,S.queue.length)?'filled':''}" style="animation-delay:-${i*.2}s"></i>`).join('')}</span>${a?`<span>·</span><span>${a.kind==='group'?'Group of '+a.items.length:'1 recognition'} ${a.phase==='reading'?'on screen':a.phase==='exit'?'exiting':a.phase==='gap'?'next arriving':'arriving'}</span>${secs!==null?`<b class="queue-hold">${secs}s</b><span class="queue-meter"><i style="width:${(1-(S.t-a.phaseAt)/a.hold)*100}%"></i></span>`:''}`:''}${S.queue.length>=5?'<span>· Next five release together</span>':''}`;}

function drawAtmosphere(dt){const c=$('atmosphere').getContext('2d');c.clearRect(0,0,1920,686);if(S.still||['offline','neutral'].includes(S.mode))return;const energy=S.mode==='low'||S.lowAutomatic?.45:1;for(let i=0;i<30;i++){const x=((i*373.7)%1870)+Math.sin(S.t/15+i)*23,y=((i*149.2-S.t*(2+i%3))%665+665)%665;drawSpark(c,x,y,1.2+i%3,.18*energy*(.7+.3*Math.sin(S.t/3+i)),i%3?'#cbb682':'#d9bdb7')}
 for(let i=0;i<8;i++){const x=70+((i*271+S.t*2)%1820),y=28+((i*91+S.t*3)%635);c.save();c.translate(x,y);c.rotate(S.t/23+i);c.fillStyle=i%2?'#e7c4c23d':'#d7d8b540';c.beginPath();c.ellipse(0,0,4,9,0,0,Math.PI*2);c.fill();c.restore()}
 particles=particles.filter(p=>p.age<p.life);particles.forEach(p=>{p.age+=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;drawSpark(c,p.x+54,p.y+28,p.r,(1-p.age/p.life)*.8,p.color)});}

const SCENE_COUNTDOWN_RADIUS=16;
const SCENE_COUNTDOWN_CIRCUMFERENCE=2*Math.PI*SCENE_COUNTDOWN_RADIUS;
function sceneCountdownDwell(){return S.dwell?.[S.s]??DWELL[S.s]??30}
function sceneCountdownHidden(){
 // Explicit stillness (owner-selected still motion, or a forced pause such as
 // the Studio Pause button) hides the ring outright. A viewer's own reduced
 // motion preference does not hide it, it only changes how often it redraws
 // below, per the discreet-not-hidden requirement.
 const explicitlyStill=S.motion==='still'||S.playing===false;
 // Studio (and the renderer probe) always pass an explicit control.scene, so
 // sceneControlled is true there by design and the ring still shows while
 // that sample preview is playing. Only a scene forced away from the normal
 // playlist on a non-sample source would hide it, which live TV never does.
 const forcedElsewhere=S.sceneControlled&&S.source!=='sample';
 return S.mode!=='normal'||S.pauseRotation||explicitlyStill||forcedElsewhere||!!active||!!transition;
}
function updateSceneCountdown(){
 const el=$('scene-countdown');if(!el)return;
 if(sceneCountdownHidden()){el.hidden=true;return}
 const dwell=Math.max(1,sceneCountdownDwell());
 const rawAge=clamp(S.sceneAge,0,dwell);
 const age=reducedMotionPreferred?Math.min(dwell,Math.floor(rawAge)):rawAge;
 el.hidden=false;
 const fill=$('scene-countdown-fill');
 if(fill){fill.style.strokeDasharray=String(SCENE_COUNTDOWN_CIRCUMFERENCE);fill.style.strokeDashoffset=(SCENE_COUNTDOWN_CIRCUMFERENCE*(age/dwell)).toFixed(2)}
 const number=$('scene-countdown-number');if(number)number.textContent=String(Math.max(0,Math.ceil(dwell-age)));
}
