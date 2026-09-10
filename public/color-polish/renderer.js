/* The child is a static, script-only renderer. It stays blank until a trusted
 * parent bootstrap supplies a validated snapshot. */
'use strict';
const COLOR_POLISH_VERSION='color-polish-v6';
const ASSETS=Object.freeze({
 icon1:'/color-polish/assets/icon1.png',icon2:'/color-polish/assets/icon2.png',icon3:'/color-polish/assets/icon3.png',
 icon4:'/color-polish/assets/icon4.png',icon5:'/color-polish/assets/icon5.png',icon6:'/color-polish/assets/icon6.png',
 icon7:'/color-polish/assets/icon7.png',icon8:'/color-polish/assets/icon8.png',icon9:'/color-polish/assets/icon9.png',
 hands_banner:'/color-polish/assets/hands_banner.png',puzzle:'/color-polish/assets/puzzle.png',community:'/color-polish/assets/community.png',
 hands:'/color-polish/assets/hands.png',heart_render:'/color-polish/assets/heart_render.png',flowers:'/color-polish/assets/flowers.png',
 foliage:'/color-polish/assets/foliage.png',globe:'/color-polish/assets/globe.png'
});
const catalog=[
 {id:1,name:'Greeting',principle:'The first phrase to peace',phrase:'How Are You?',color:'#FF977C'},
 {id:2,name:'Gratitude',principle:'Express gratitude even for small efforts and acts of kindness',phrase:"Thank you. It's all thanks to you. You've worked hard.",color:'#FFD05F'},
 {id:3,name:'Apology',principle:"A phrase that melts the heart by understanding the other's feelings first",phrase:"I'm sorry. It must have been hard on you.",color:'#FFAD69'},
 {id:4,name:'Inclusiveness',principle:'A phrase of forgiveness that embraces faults',phrase:"It's okay. I understand.",color:'#F582AF'},
 {id:5,name:'Concession',principle:'When feeling impatient, take a breath and yield to others',phrase:'Please, after you.',color:'#82B0ED'},
 {id:6,name:'Respect',principle:'When opinions differ, listen carefully to others',phrase:"I'd love to hear more about your thoughts.",color:'#CE927E'},
 {id:7,name:'Encouragement',principle:'Offer sincere support and encouragement',phrase:"I'll pray (or root) for you. Everything will go well.",color:'#B293E7'},
 {id:8,name:'Consideration',principle:'Consideration begins with paying attention to those around you',phrase:'Can I give you a hand with anything?',color:'#EF7A96'},
 {id:9,name:'Compliment',principle:'Warm compliments bring happiness to both sides',phrase:"You're amazing. You're doing great!",color:'#BE9CEB'}
];
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), lerp=(a,b,t)=>a+(b-a)*t, ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)}, fmt=n=>Math.round(n).toLocaleString('en-US');
const ZONE='America/Los_Angeles';
const NAMES=['Welcome / Living campaign','Recognition Garden','New Recognition Arrival','Featured Expressions','Recognition Calendar','Participation Status','The Nine Expressions','We Are Peacemakers','Peace in Practice','Expression Orbit','Milestone & Weekly Goal'];
const ORDER=[1,2,4,5,8,6,7,9,10,11];
const DWELL={1:30,2:180,3:30,4:30,5:30,6:30,7:30,8:60,9:60,10:30,11:30};
const SINGLE_STYLES=['Through the light','Comet sweep','A thousand kind sparks','Pearl spring','Spiral bloom','Petals into pearl'];
const GROUP_STYLES=['Cascading constellation','Two tides, one wave','Spiral constellation','Petal fountains','Ripple of kindness'];
const GROUP_TITLES=['A new wave of Mother’s Love.','Kindness is being shared.','A constellation of kind words.','A garden of appreciation blooms.','Ten expressions. One shared moment.'];
// Exact phrase and principle catalog is inherited from the approved design files.
// Supporting guidance below is an attributed paraphrase, not a verbatim website quotation.
const GUIDANCE=[
'Notice familiar faces and people you briefly pass. Begin kindly with neighbors, friends, and those serving your community.',
'Thank people who cook, drive, or help you in ordinary ways. Exchanging appreciation can make familiar routines happier.',
'To repair a relationship, consider how your actions felt to the other person. Acknowledge mistakes and take the first step.',
'Everyone makes mistakes. Respond generously when someone feels awkward about theirs.',
'Pause before rushing ahead. Yield in a checkout line, at a transit gate, or while driving.',
'During disagreement, stop competing to speak and listen. Mutual consideration helps people communicate.',
'Support can strengthen someone facing difficulty. Encourage them sincerely so they know they are not facing it alone.',
'Notice a heavy load or difficult situation. Offer practical assistance; even modest help can mean a great deal.',
'Praise effort and progress sincerely. A kind compliment can encourage both the speaker and the person receiving it.'
];
const THUMB='<svg class="thumb" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 10l4-7c1-2 3-1 3 1v5h5c1 0 2 1 1 3l-2 7c0 1-1 2-3 2H8V10Zm-5 0h4v11H3z"/></svg>';
const heartSVG=(color='#e39baa')=>`<svg viewBox="0 0 100 94" aria-hidden="true"><defs><radialGradient id="hg-${color.slice(1)}" cx=".25" cy=".2" r=".9"><stop stop-color="#fff0e9"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="#be6e85"/></radialGradient></defs><path d="M50 84C42 76 9 57 8 32C7 11 30 3 43 18C46 21 49 27 50 30C52 25 55 20 59 16C76 2 95 16 92 35C89 59 58 78 50 84Z" fill="url(#hg-${color.slice(1)})" stroke="#ffe8dc" stroke-width="1"/><path d="M21 28Q25 15 36 23" stroke="#fff2e7" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
const icon=(id,cl='icon')=>`<img class="${cl}" src="${ASSETS['icon'+id]}" alt="${esc(catalog[id-1].name)}">`;
const art=(key,style)=>`<img class="art" src="${ASSETS[key]}" style="${style}" alt="">`;
const medallion=id=>`<div class="medallion" style="--tint:${catalog[id-1].color}">${icon(id)}</div>`;
const shimmer=(text,type='')=>`<span class="spark-word"><span class="text-shimmer ${type}">${esc(text)}</span></span>`;
const chips=ids=>`<div class="chips">${ids.map(id=>`<span class="chip">${icon(id)}${esc(catalog[id-1].name)}</span>`).join('')}</div>`;
const heading=(small,title,subtitle='')=>`<div class="eyebrow">${esc(small)}</div><h1 class="heading">${shimmer(title,'ink')}</h1>${subtitle?`<p class="subheading">${esc(subtitle)}</p>`:''}`;
function localDay(ms){return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms))}
function weekKey(ms){const d=localDay(ms),utc=new Date(d+'T12:00:00Z');utc.setUTCDate(utc.getUTCDate()-utc.getUTCDay());return utc.toISOString().slice(0,10)}
function submittedStamp(r){return new Intl.DateTimeFormat('en-US',{timeZone:ZONE,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(r.createdAt))}
function monthKey(aggregate){const source=typeof aggregate?.periodStart==='string'&&/^\d{4}-\d{2}/.test(aggregate.periodStart)?aggregate.periodStart:localDay(effectiveNow());return source.slice(0,7)}
function monthLabel(aggregate){const key=monthKey(aggregate),parsed=Date.parse(`${key}-01T12:00:00.000Z`);return Number.isFinite(parsed)?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(parsed)):'Current month'}
function fullDateLabel(aggregate,day){const key=monthKey(aggregate),parsed=Date.parse(`${key}-${String(day).padStart(2,'0')}T12:00:00.000Z`);return Number.isFinite(parsed)?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}).format(new Date(parsed)):`${monthLabel(aggregate)} ${day}`}
function daysInMonth(aggregate){const key=monthKey(aggregate),parts=key.split('-').map(Number);return parts.length===2&&parts.every(Number.isInteger)?new Date(Date.UTC(parts[0],parts[1],0)).getUTCDate():31}
const sum=a=>a.reduce((n,v)=>n+v,0);
const EMPTY_AGGREGATE={rec:0,expr:Array(9).fill(0),periodStart:'',periodEnd:''};
const blankState=()=>({t:0,s:1,sceneAge:0,eduAge:0,bloomIndex:1,bloomNext:1,featured:2,mode:'offline',still:true,playing:false,clockControlled:true,pool:[],queue:[],seen:new Set(),arrivalIds:new Set(),days:{},currentWeek:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},previousWeek:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},month:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},campaign:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},goal:{id:1,value:0,target:1,rank:null,ratio:0,week:'',referenceFourth:0,achieved:false},playlist:[{id:1,duration:DWELL[1]}],dwell:{...DWELL},pauseRotation:false,sceneControlled:false,idCounter:0,lastShown:new Map(),replenishAt:10,slotCounter:0,selectedDay:1,singleStyle:0,groupStyle:0,groupNumber:0,singleBag:[],groupBag:[],singleBagLast:null,groupBagLast:null,feedArrivalCounter:0,returnScene:null,returnAge:0,pendingScene:null,chain:false,countJobs:new Map(),lowSince:0,lowAutomatic:false,week:'',goalExpression:1,milestoneValue:0,milestonePending:null,milestoneContributors:[],milestonesSeen:new Set(),privacyAt:0,shimmerUntil:0,lastHeader:-1,snapshotRevision:null,source:'live',qrDataUrl:null,nowMs:0,replayKey:null,queueStart:0,motion:'standard'});
let S=blankState(), active=null, transition=null, slots=[], sceneRoot=null, eduCards=[], numberNodes=[], numCache=new Map(), feedLanes=[], particles=[], heartRenderer=null, hearts=[], tributes=[], lastFrame=0, frozen=false, parentPort=null, parentOrigin='', expectedSequence=0, bootstrapNonce='', initialized=false;
const qaLog=[];function log(type,data={}){qaLog.push({at:+S.t.toFixed(3),type,...data});if(qaLog.length>1400)qaLog.shift()}
function finiteNumber(value){return typeof value==='number'&&Number.isFinite(value)}
function safeText(value,max){return typeof value==='string'&&value.length>=1&&value.length<=max?value:null}
function safeEpoch(value){if(typeof value!=='string'||value.length>64)return null;const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null}
function normalizedAggregate(value){if(!value||typeof value!=='object'||Array.isArray(value))return {...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]};const expressionCounts=Array.isArray(value.expressionCounts)&&value.expressionCounts.length===9?value.expressionCounts.map(v=>finiteNumber(v)?Math.max(0,Math.min(100000000,Math.floor(v))):0):Array(9).fill(0);return{rec:finiteNumber(value.recognitions)?Math.max(0,Math.min(100000000,Math.floor(value.recognitions))):0,expr:expressionCounts,periodStart:typeof value.periodStart==='string'&&value.periodStart.length<=64?value.periodStart:'',periodEnd:typeof value.periodEnd==='string'&&value.periodEnd.length<=64?value.periodEnd:''}}
function normalizedRecord(value,reactionCounts){if(!value||typeof value!=='object'||Array.isArray(value))return null;const id=safeText(value.id,128),name=safeText(value.recipient,512),message=safeText(value.message,4000),createdAt=safeEpoch(value.createdAt),publishedAt=safeEpoch(value.firstPublishedAt),expiresAt=safeEpoch(value.expiresAt);if(!id||!name||!message||createdAt===null||publishedAt===null||expiresAt===null||expiresAt<=createdAt||value.status!=='published'||!Array.isArray(value.expressionIds)||value.expressionIds.length<1||value.expressionIds.length>9)return null;const ids=[...new Set(value.expressionIds.filter(id=>Number.isSafeInteger(id)&&id>=1&&id<=9))].sort((a,b)=>a-b);if(ids.length!==value.expressionIds.length)return null;const hasLikes=!!reactionCounts&&Object.prototype.hasOwnProperty.call(reactionCounts,id)&&finiteNumber(reactionCounts[id]);const likes=hasLikes?Math.max(0,Math.min(100000000,Math.floor(reactionCounts[id]))):null;return{id,name,message,ids,createdAt,publishedAt,expiresAt,status:'published',valid:true,likes}}
function calendarDay(value){if(typeof value!=='string')return null;const day=value.slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return null;const parsed=Date.parse(`${day}T12:00:00.000Z`);return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===day?day:null}
function normalizedDays(calendar){const days={};if(!Array.isArray(calendar))return days;for(const aggregate of calendar){const day=calendarDay(aggregate?.periodStart);if(!day)continue;days[day]=normalizedAggregate(aggregate)}return days}
function normalizedPlaylist(presentation){const playlist=[];const seen=new Set();if(Array.isArray(presentation?.playlist))for(const entry of presentation.playlist){if(entry?.enabled!==true)continue;const id=sceneNumber(entry?.id);if(!Number.isSafeInteger(id)||seen.has(id)||!finiteNumber(entry?.durationSeconds))continue;seen.add(id);playlist.push({id,duration:clamp(Math.floor(entry.durationSeconds),12,180)})}return playlist.length?playlist:[{id:1,duration:DWELL[1]}]}
function normalizedDurations(playlist){const dwell={...DWELL};for(const entry of playlist)dwell[entry.id]=entry.duration;return dwell}
function snapshotClock(payload){return finiteNumber(payload?.nowMs)?Math.max(0,payload.nowMs):0}
function selectedDayFor(ms){const text=localDay(ms),day=Number(text.slice(-2));return Number.isSafeInteger(day)&&day>=1&&day<=31?day:1}
function thresholdFor(value){return Math.floor(Math.max(0,value)/250)*250}
function sceneNumber(value){if(typeof value==='number'&&value>=1&&value<=11)return Math.floor(value);if(typeof value==='string'){const ids={welcome:1,garden:2,featured:4,calendar:5,peacemakers:8,status:6,expressions:7,'peace-in-practice':9,orbit:10,milestone:11};return ids[value]||1}return 1}
function usableSnapshot(snapshot){return !!snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)&&snapshot.presentation?.version===COLOR_POLISH_VERSION&&snapshot.presentation?.enabled===true&&snapshot.settings&&Array.isArray(snapshot.recognitions)&&snapshot.insights&&typeof snapshot.insights==='object'}
function safeQrDataUrl(value,submissionUrl){return submissionUrl==='https://mothers-love.vercel.app/recognize'&&typeof value==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]{40,500000}$/.test(value)?value:null}
function setStateFromSnapshot(snapshot,control={}){
 const next=blankState(),nowMs=snapshotClock(control),settings=snapshot?.settings,playlist=normalizedPlaylist(snapshot?.presentation),requestedScene=control.scene===undefined?(S?.s||playlist[0].id):sceneNumber(control.scene);
 next.nowMs=nowMs;
 next.t=Math.max(0,finiteNumber(control.elapsedMs)?control.elapsedMs/1000:S?.t||0);
 next.clockControlled=finiteNumber(control.elapsedMs);
 next.playing=control.playing!==false;
 next.source=control.source==='sample'?'sample':'live';
 next.motion=settings?.motion||'standard';
 next.pauseRotation=settings?.pauseRotation===true;
 next.sceneControlled=control.scene!==undefined;
 next.playlist=playlist;
 next.dwell=normalizedDurations(playlist);
 next.s=playlist.some(entry=>entry.id===requestedScene)?requestedScene:playlist[0].id;
 next.featured=clamp(Number(snapshot?.insights?.goal?.expressionId)||2,1,9);
 next.mode=control.status==='ready'&&usableSnapshot(snapshot)&&settings?.mode==='normal'?'normal':control.status==='quiet'?'neutral':'offline';
 next.still=settings?.motion==='still'||control.playing===false;
 next.pool=(Array.isArray(snapshot?.recognitions)?snapshot.recognitions:[]).map(value=>normalizedRecord(value,control.reactionCounts)).filter(Boolean).slice(0,1000);
 next.seen=new Set(next.pool.map(r=>r.id));
 next.arrivalIds=new Set((Array.isArray(snapshot?.arrivals)?snapshot.arrivals:[]).map(item=>safeText(item?.eventId,128)).filter(Boolean));
 next.days=normalizedDays(snapshot?.insights?.calendar);
 next.currentWeek=normalizedAggregate(snapshot?.insights?.currentWeek);
 next.previousWeek=normalizedAggregate(snapshot?.insights?.previousWeek);
 next.month=normalizedAggregate(snapshot?.insights?.month);
 next.campaign=normalizedAggregate(snapshot?.insights?.campaign);
 const goalId=clamp(Number(snapshot?.insights?.goal?.expressionId)||1,1,9);
 next.goal={id:goalId,value:Math.max(0,Number(snapshot?.insights?.goal?.value)||0),target:Math.max(1,Number(snapshot?.insights?.goal?.target)||1),achieved:snapshot?.insights?.goal?.achieved===true,week:safeText(snapshot?.insights?.goal?.weekStart,32)||'',referenceFourth:0,rank:null,ratio:0};
 const weeklyExpressionValue=next.currentWeek.expr[goalId-1]||0;
 next.goal.rank=1+next.currentWeek.expr.filter(count=>count>weeklyExpressionValue).length;
 next.goal.ratio=next.goal.value/next.goal.target;
 next.week=next.goal.week;
 next.goalExpression=next.goal.id;
 next.selectedDay=selectedDayFor(nowMs);
 next.milestoneValue=thresholdFor(sum(next.month.expr));
 next.snapshotRevision=finiteNumber(snapshot?.revision)?snapshot.revision:null;
 next.qrDataUrl=safeQrDataUrl(control.qrDataUrl,control.submissionUrl);
 return next;
}
function effectiveNow(){return S.nowMs||0}
function eligible(r){return !!r&&r.status==='published'&&r.valid!==false&&r.expiresAt>effectiveNow()}
function records(){return ['empty','offline','neutral'].includes(S.mode)?[]:S.pool.filter(eligible)}
function totals(){return{today:S.days[localDay(effectiveNow())]||{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},month:S.month,week:S.currentWeek,all:S.campaign}}
function lowest(a){let index=0;a.forEach((v,i)=>{if(v<a[index])index=i});return index+1}
function goal(){const g=S.goal||{};return{id:clamp(Number(g.id)||1,1,9),value:Math.max(0,Number(g.value)||0),target:Math.max(1,Number(g.target)||1),rank:Number.isFinite(g.rank)?Math.max(1,Math.floor(g.rank)):null,ratio:Math.max(0,Number(g.ratio)||0),week:g.week||S.week,referenceFourth:Number(g.referenceFourth)||0,achieved:g.achieved===true}}
function hasReaction(r){return finiteNumber(r?.likes)}
function reactionWord(value){return value===1?'like':'likes'}
function reactionTotal(){const values=S.pool.filter(r=>eligible(r)&&hasReaction(r)).map(r=>r.likes);return values.length?sum(values):null}
function reactionMarkup(r,tag='div',className='like-count'){if(!hasReaction(r))return '';return `<${tag} class="${className}">${THUMB}${num('like:'+r.id)}<span>${reactionWord(r.likes)}</span></${tag}>`}
function numberValue(key){const T=totals(),g=goal();if(key==='likes')return reactionTotal()??0;if(key.startsWith('like:')){const value=S.pool.find(r=>r.id===key.slice(5))?.likes;return finiteNumber(value)?value:0}if(key==='goal:value')return g.value;if(key==='goal:target')return g.target;if(key==='milestone')return S.milestoneValue;const parts=key.split(':');if(parts[0]==='d'){const d=S.days[parts[1]]||{rec:0,expr:Array(9).fill(0)};return parts[2]==='rec'?d.rec:d.expr[Number(parts[2])-1]||0}const x=T[parts[0]];if(!x)return 0;return parts[1]==='rec'?x.rec:parts[1]==='expr'?sum(x.expr):x.expr[+parts[1]-1]||0}
function num(key,cls='number'){const n=numCache.get(key)?.value??0;return `<span class="${cls}" data-number="${key}">${fmt(n)}</span>`}
function bindNumbers(root=document){root.querySelectorAll('[data-number]').forEach(el=>{let key=el.dataset.number,to=numberValue(key),c=numCache.get(key);if(!c){c={value:S.still?to:0,from:0,target:to,start:S.t,duration:1.45};numCache.set(key,c)}else if(c.target!==to){c.from=c.value;c.target=to;c.start=S.t}numberNodes.push(el);el.textContent=fmt(c.value)});numberNodes=numberNodes.filter((n,i,a)=>n.isConnected&&a.indexOf(n)===i)}
function refreshNumbers(){for(const [k,c] of numCache){const to=numberValue(k);if(to!==c.target){c.from=c.value;c.target=to;c.start=S.t;c.duration=1.45}}updateGoalDOM();}
function tickNumbers(){numCache.forEach(c=>{const p=S.still?1:clamp((S.t-c.start)/c.duration,0,1);c.value=lerp(c.from,c.target,1-Math.pow(1-p,3))});numberNodes=numberNodes.filter(el=>el.isConnected);numberNodes.forEach(el=>{const c=numCache.get(el.dataset.number);if(c){el.textContent=fmt(c.value);el.classList.toggle('counting',Math.abs(c.value-c.target)>.15)}})}
function choose(exclude=[],expressionId=null){const p=records().filter(r=>!exclude.includes(r.id)&&(!expressionId||r.ids.includes(expressionId)));p.sort((a,b)=>(S.lastShown.get(a.id)??-10000)-(S.lastShown.get(b.id)??-10000)||b.createdAt-a.createdAt||a.id.localeCompare(b.id));return p[0]}
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
function garden(){
 let h=heading('Recognition Garden','Appreciation, all around us.');
 const chosen=[];for(let i=0;i<Math.min(5,records().length);i++){const r=choose(chosen.map(a=>a.id));if(r)chosen.push(r)}
 if(!chosen.length)return h+emptyPanel();
 const long=chosen.find(r=>!smallFits(r));
 const ps=long?[[18,88,508],[597,96,284],[927,286,294],[1266,83,285],[1497,332,278]]:[[29,141,304],[389,307,299],[751,96,303],[1121,297,302],[1462,128,300]];
 if(long)chosen.sort((a,b)=>a.id===long.id?-1:b.id===long.id?1:0);
 h+='<canvas class="garden-canvas" id="living-garden" width="1812" height="636" aria-hidden="true"></canvas>';
 h+=chosen.map((r,i)=>addOrb(r,...ps[i])).join('');
 return h+'<div class="garden-caption">Every expression of Mother’s Love helps the garden grow.</div>';
}
function emptyPanel(){return `<div class="safe-panel"><div class="eyebrow">A quiet moment</div><h1>Kindness begins<br>with a word.</h1><p>No recognitions are currently cleared for display.<br>Scan the QR to recognize someone.</p></div>`}
function readerSlot(r,x,y,w,h){const d=Math.min(w,h);return addOrb(r,x+(w-d)/2,y,d,{large:true})}
function rightBubbles(){
 const chosen=[];for(let i=0;i<4;i++){const r=choose(chosen.map(a=>a.id));if(r)chosen.push(r)}
 const long=chosen.find(r=>!smallFits(r));if(long)return readerSlot(long,861,37,925,586);
 const ps=[[885,23,312],[1301,26,320],[824,323,304],[1454,330,295]];
 return chosen.map((r,i)=>addOrb(r,...ps[i])).join('');
}

function welcome(){return `<div style="position:absolute;left:15px;top:43px;width:831px"><div class="eyebrow">A living campaign of appreciation</div><h1 style="font-size:74px;letter-spacing:-2.2px;line-height:1.08;margin:20px 0 22px">The Words of<br>${shimmer('Mother’s Love')}</h1><p class="serif" style="font-size:29px;line-height:1.4;color:#89836b">Where a mother's love resides,<br>peace abides.</p></div>${art('community','left:-20px;top:325px;width:910px;height:298px')}${rightBubbles()}`}
function featured(){
 const id=S.featured,e=catalog[id-1];let h=`<div class="eyebrow">Featured Recognition · Expression ${String(id).padStart(2,'0')} / 09</div><div class="feature-panel" style="--tint:${e.color}">${medallion(id)}<h2>${shimmer(e.name)}</h2><p class="principle">${esc(e.principle)}</p><p class="serif">“${esc(e.phrase)}”</p><div class="feature-progress">Recognitions selecting this expression</div></div>`;
 const chosen=[];for(let i=0;i<3;i++){const r=choose(chosen.map(a=>a.id),id);if(r)chosen.push(r)}
 const long=chosen.find(r=>!smallFits(r));
 if(long)return h+addOrb(long,820,37,580,{expression:id,large:true});
 const ps=[[582,64,356],[1006,283,337],[1430,76,342]];
 h+=chosen.map((r,i)=>addOrb(r,...ps[i],{expression:id})).join('');
 if(!chosen.length)h+='<p class="subheading" style="position:absolute;left:650px;top:220px">No current recognitions for this expression.</p>';
 return h;
}
function calendarScene(){const month=monthKey(S.month),d=`${month}-${String(S.selectedDay).padStart(2,'0')}`,label=monthLabel(S.month),selectedLabel=fullDateLabel(S.month,S.selectedDay),offset=(()=>{const parts=month.split('-').map(Number);return parts.length===2?new Date(Date.UTC(parts[0],parts[1]-1,1)).getUTCDay():0})();let h=heading('Recognition Calendar','Every day, a little love.');h+=`<div class="calendar-info panel"><div class="selected-date">${selectedLabel}${S.selectedDay===selectedDayFor(S.nowMs)?' · Today':''}</div><div class="metric-value">${num('d:'+d+':rec')}</div><div class="metric-title">Recognitions shared</div><div class="calendar-expressions">${catalog.map(e=>`<div class="calendar-expression">${icon(e.id)}<b>${num('d:'+d+':'+e.id)}</b><span>${esc(e.name)}</span></div>`).join('')}</div><div class="rule">Original submission date · Cleared recognitions only.<br>${S.selectedDay<3?'Historical aggregate only; no expired names are retrieved.':'A recognition can celebrate more than one expression.'}</div></div><div class="calendar-month panel"><div class="calendar-top"><h2>${label}</h2><span>Original submission date</span></div><div class="calendar-days">${['SUN','MON','TUE','WED','THU','FRI','SAT'].map(x=>`<div class="dayname">${x}</div>`).join('')}${Array.from({length:offset},()=>'<div class="day blank"></div>').join('')}`;
 for(let day=1;day<=daysInMonth(S.month);day++){const key=`${month}-${String(day).padStart(2,'0')}`,future=day>S.selectedDay;h+=`<button class="day ${day===S.selectedDay?'today':''} ${future?'future':''}" ${future?'disabled':''} onclick="selectDay(${day})" aria-label="${label} ${day}"><span>${day}</span>${future?'':`<b>${num('d:'+key+':rec')}</b>`}</button>`}return h+`</div><div class="calendar-rule"><span>Sunday-Saturday · original submission dates</span><span>Future dates have no counts</span></div></div>`}
function statusScene(){return `${heading('Participation Status','Mother’s Love, recognized.')}<div class="stat-top panel"><div><div class="metric-title">Expressions of Mother’s Love<br>Recognized This Month</div><div style="font-size:16px;color:#97937e;margin-top:13px">${monthLabel(S.month)}</div></div><div class="metric-value" style="padding:0 28px;border-right:1px solid #ded7c8">${num('month:expr')}</div><div><div class="metric-value" style="font-size:58px">${num('month:rec')}</div><div class="metric-title" style="font-size:20px;margin-top:9px">Recognitions shared<br>this month</div></div><div style="flex:1"></div>${art('puzzle','position:relative;width:133px;height:125px;margin-right:25px')}</div><div class="expression-stats">${catalog.map(e=>`<div class="stat-expression panel">${medallion(e.id)}<div><h3>${esc(e.name)}</h3><b>${num('month:'+e.id)}</b></div></div>`).join('')}</div><div class="periods">${[['today','Today'],['all','Overall']].map(([k,t])=>`<div class="period panel"><div><h3>${t}</h3><b>${num(k+':rec')}</b><small>Recognitions</small></div><div style="text-align:right"><h3>&nbsp;</h3><b>${num(k+':expr')}</b><small>Expressions</small></div></div>`).join('')}</div><div class="body-note">All nine expressions · same period · equal appreciation</div>`}
function nineScene(){let h=heading('The Nine Expressions','Words that bring peace.');h+=`<div class="edu-step" id="edu-step">01-09 · THE COMPLETE PHRASES</div><div class="educational" id="educational">`;catalog.forEach((e,i)=>{const x=(i%3)*611,y=91+Math.floor(i/3)*176;h+=`<article class="edu-card" id="edu-${e.id}" data-expression-id="${e.id}" style="left:${x}px;top:${y}px;width:590px;height:159px;--tint:${e.color}"><div class="edu-front"><div class="edu-header">${medallion(e.id)}<div><div class="edu-category">${esc(e.name)}</div><span class="edu-number">${String(e.id).padStart(2,'0')} / 09</span></div></div><p class="edu-phrase">“${esc(e.phrase)}”</p></div><div class="edu-detail"><div class="edu-header">${medallion(e.id)}<div><div class="eyebrow">Expression ${String(e.id).padStart(2,'0')} of 09</div><h2>${shimmer(e.name)}</h2></div></div><p class="edu-phrase">“${esc(e.phrase)}”</p><p class="edu-principle">${esc(e.principle)}</p><p class="edu-explanation">${esc(GUIDANCE[i])}</p><div class="edu-source">Supporting guidance adapted from the official About Campaign page.<br>The approved expression and principle above retain the supplied catalog.</div></div><div class="edu-petals">${Array.from({length:5},(_,n)=>`<i class="edu-petal" style="rotate:${n*72}deg"></i>`).join('')}</div></article>`});return h+`</div><div class="edu-caption">One expression blossoms into focus on each visit.</div>`}
function peaceScene(){return `<div style="position:absolute;left:12px;top:36px;width:861px"><div class="eyebrow">Peace in practice</div><h1 style="font-size:61px;letter-spacing:-2px;line-height:1.1;margin:23px 0">May Mother’s ${shimmer('love')}<br>bring ${shimmer('peace')} to the world!</h1><p class="subheading">Love expressed through words and actions.</p></div>${art('hands_banner','left:20px;top:393px;width:823px;height:238px;opacity:.8;mask-image:linear-gradient(transparent,#000 20%,#000 85%,transparent)')}<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px"></div><div id="heart-field"></div>${rightBubbles()}`}
function peacemakers(){return `<div style="position:absolute;left:12px;top:33px;width:829px"><div class="eyebrow">Mother’s Love in our community</div><h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1><p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p></div>${art('globe','left:271px;top:134px;width:604px;height:482px')}${rightBubbles()}`}
function orbitScene(){
 const id=S.featured,e=catalog[id-1],chosen=[];
 for(let i=0;i<4;i++){const r=choose(chosen.map(x=>x.id),id);if(r)chosen.push(r)}
 let h=heading('Expression Orbit','A shared expression. Many kind words.');
 h+=`<div class="orbit-universe" id="orbit-universe"><canvas id="orbit-lines" class="orbit-lines" width="1812" height="552" aria-hidden="true"></canvas><div class="orbit-sun">${medallion(id)}<h2>${shimmer(e.name)}</h2><p>“${esc(e.phrase)}”</p><div class="sun-principle">${esc(e.principle)}</div></div>`;
 chosen.forEach((r,i)=>{h+=`<div class="planet-system" data-planet="${i}">${addOrb(r,0,0,284,{expression:id,motion:false})}${r.ids.map((n,j)=>`<span class="orbit-moon" data-moon="${j}" style="--tint:${catalog[n-1].color}">${icon(n)}</span>`).join('')}</div>`});
 if(!chosen.length)h+='<p class="subheading" style="position:absolute;left:50px;top:150px">No current recognitions for this expression.</p>';
 return h+'</div>';
}
function nextMilestone(){const n=sum(totals().month.expr);return Math.max(250,Math.ceil((n+1)/250)*250)}
function milestoneScene(){
 const g=goal(),e=catalog[g.id-1],T=totals(),next=nextMilestone();
 return `<div class="progress-intro"><div class="eyebrow">A shared milestone</div><h1>Every kind word<br>${shimmer('helped us')}<br>get here.</h1><div class="intro-line"></div><p>Expressions of Mother’s Love,<br>recognized together.</p><p class="period-label">${monthLabel(T.month)}<br>Every expression matters.</p></div><div class="progress-sculpture"><div class="progress-rail"><div class="progress-milestone"><div class="eyebrow">${S.milestoneValue?'Milestone reached':'Growing campaign'}</div><div class="threshold">${num('milestone')}</div><h2>Expressions of<br>${shimmer('Mother’s Love')}</h2><div class="row"><span>Current <b>${num('month:expr')}</b></span><span>Next ${fmt(next)}</span></div><div class="progress-track"><div class="progress-fill" id="milestone-fill" style="width:${clamp(sum(T.month.expr)/next*100,0,100)}%"></div></div></div><div class="progress-goal"><div class="goal-head">THIS WEEK’S EXPRESSION GOAL</div><div class="week-range">${formatDayRange(S.week)} · SUN-SAT</div><div class="goal-name">${medallion(g.id)}<h3>${shimmer(e.name)}</h3><span class="goal-rank" id="goal-rank"></span></div><div class="goal-values"><span id="goal-status">Shared progress</span><b>${num('goal:value')} / ${num('goal:target')}</b></div><div class="progress-track"><div class="progress-fill" id="goal-fill" style="width:${clamp(g.ratio*100,0,100)}%"></div></div><div class="goal-caption">Gold-rimmed recognitions support this week’s goal.<br>Categories only · never a ranking of people.</div></div></div><div class="stream-world" id="tribute-stream"><canvas class="stream-canvas" id="stream-canvas" width="1017" height="622" aria-hidden="true"></canvas></div><div class="stream-caption">Individual acts. Shared progress.</div></div>`;
}
function arrivalScene(){
 const r=records()[0];return r?`<div class="scene-copy" style="position:absolute;left:32px;top:78px;width:510px"><div class="eyebrow">Recognition arrival</div><h1 style="font-size:57px;line-height:1.1;margin:24px 0">A little kindness,<br>${shimmer('a moment for you.')}</h1><p class="subheading">Six individual entrances.<br>Five choreographed waves of ten.</p></div>${addOrb(r,943,49,534,{motion:false})}`:emptyPanel();
}
function safeScene(){const label=S.mode==='neutral'?'Recognitions paused':'Connection not verified';return `<div class="safe-panel"><div class="eyebrow">${label}</div><h1>The Words of<br>${shimmer('Mother’s Love')}</h1><p>${S.mode==='neutral'?'The operator has selected a neutral display.':'Names and messages stay hidden until display access is verified.'}</p><p class="serif">Where a mother’s love resides, peace abides.</p></div>`}
function selectDay(day){const value=Math.floor(Number(day));if(!Number.isSafeInteger(value)||value<1||value>S.selectedDay)return;S.selectedDay=value;renderNow(5,{keepAge:true})}
const renderers={1:welcome,2:garden,3:arrivalScene,4:featured,5:calendarScene,6:statusScene,7:nineScene,8:peacemakers,9:peaceScene,10:orbitScene,11:milestoneScene};
function recordsChanged(previous,next){if(previous.length!==next.length)return true;const before=new Map(previous.map(r=>[r.id,r]));return next.some(r=>{const old=before.get(r.id);return !old||old.name!==r.name||old.message!==r.message||old.expiresAt!==r.expiresAt||old.ids.join(',')!==r.ids.join(',')})}
function cancelActiveEvent(){active=null;transition=null;S.chain=false;$('event')?.replaceChildren();$('event')?.classList.remove('active');$('stage')?.classList.remove('dimmed');$('qr-zone')?.classList.remove('qr-active');renderQueue()}
function pruneRemovedIds(ids){if(!ids.length)return;const removed=new Set(ids);document.querySelectorAll('[data-record-id],[data-event-id],[data-tribute-id],[data-feed-id]').forEach(el=>{const id=el.dataset.recordId||el.dataset.eventId||el.dataset.tributeId||el.dataset.feedId;if(removed.has(id))el.remove()});slots=slots.filter(slot=>!removed.has(slot.id));if(typeof V!=='undefined'){V.actors=V.actors.filter(actor=>!removed.has(actor.id)&&!removed.has(actor.nextId));V.planets=V.planets.filter(planet=>!removed.has(planet.b?.id))}feedLanes.forEach(lane=>{lane.list=lane.list.filter(id=>!removed.has(id));lane.next=lane.next.filter(id=>!removed.has(id))})}
function preserveRuntimeState(next,previous,nextById){
 const fields=['bloomIndex','bloomNext','groupNumber','replenishAt','idCounter','singleStyle','groupStyle','singleBag','groupBag','singleBagLast','groupBagLast','feedArrivalCounter','returnScene','returnAge','pendingScene','chain','countJobs','lowSince','lowAutomatic','week','goalExpression','milestonePending','milestoneContributors','milestonesSeen','privacyAt','shimmerUntil','lastHeader'];
 for(const key of fields){const value=previous?.[key];if(value===undefined)continue;if(Array.isArray(value))next[key]=[...value];else if(value instanceof Map)next[key]=new Map(value);else if(value instanceof Set)next[key]=new Set(value);else next[key]=value}
 next.lastShown=new Map(previous?.lastShown instanceof Map?[...previous.lastShown].filter(([id])=>nextById.has(id)):[]);
}
function applySnapshotPayload(snapshot,control={}){
 const previous=S,previousReady=previous.mode==='normal'&&previous.snapshotRevision!==null,previousIds=new Set(previous.arrivalIds||[]),wasSafe=previous.mode!=='normal';
 const usable=usableSnapshot(snapshot),next=setStateFromSnapshot(usable?snapshot:null,{...control,status:usable?control.status:'unavailable'});
 const replayed=previous.replayKey!==null&&control.replayKey!==undefined&&control.replayKey!==previous.replayKey;
 next.replayKey=control.replayKey??null;
 if(next.mode!=='normal'){
  S=next;clearPresentation();renderNow(1);initFeed();updateHeader();applyStill();return;
 }
 const sceneChanged=next.s!==previous.s,previousPool=Array.isArray(previous.pool)?previous.pool:[],nextById=new Map(next.pool.map(record=>[record.id,record])),removedIds=previousPool.filter(record=>!nextById.has(record.id)).map(record=>record.id);let activeAffected=false;preserveRuntimeState(next,previous,nextById);next.slotCounter=previous.slotCounter||0;next.sceneAge=wasSafe||sceneChanged||replayed?0:previous.sceneAge;next.eduAge=wasSafe||sceneChanged||replayed?0:previous.eduAge;next.queue=replayed?[]:(previous.queue||[]).filter(id=>next.pool.some(r=>r.id===id));next.queueStart=previous.queueStart||0;
 if(active){const activeItems=active.items.map(item=>nextById.get(item.id)).filter(Boolean);activeAffected=activeItems.length!==active.items.length||active.items.some((item,index)=>{const replacement=activeItems[index];return !replacement||replacement.name!==item.name||replacement.message!==item.message||replacement.expiresAt!==item.expiresAt||replacement.ids.join(',')!==item.ids.join(',')||replacement.likes!==item.likes});if(!activeAffected)active.items=activeItems}
 const currentArrivals=Array.isArray(snapshot?.arrivals)?snapshot.arrivals:[],newRecords=[];
 if(!previousReady||replayed){next.arrivalIds=new Set(currentArrivals.map(item=>safeText(item?.eventId,128)).filter(Boolean))}else{
  next.arrivalIds=new Set(previousIds);for(const arrival of currentArrivals){const eventId=safeText(arrival?.eventId,128),recognitionId=safeText(arrival?.recognitionId,128),publishedAt=safeEpoch(arrival?.publishedAt),record=next.pool.find(item=>item.id===recognitionId);if(!eventId||!recognitionId||publishedAt===null||!record||!eligible(record))continue;if(!next.arrivalIds.has(eventId)){next.arrivalIds.add(eventId);newRecords.push(record)}}
 }
 S=next;pruneRemovedIds(removedIds);if(activeAffected)cancelActiveEvent();
 const elapsedDelta=S.t-previous.t;
 if(previousReady&&!wasSafe&&!sceneChanged&&!replayed&&elapsedDelta>0&&S.playing){const target=S.t;S.t=previous.t;S.clockControlled=false;coordinator(elapsedDelta);S.clockControlled=true;S.t=target;}
 const pauseArrivals=snapshot?.settings?.pauseArrivals===true;
 if(!pauseArrivals&&!replayed){for(const record of newRecords)if(!S.queue.includes(record.id))S.queue.push(record.id);if(newRecords.length&&!active)S.queueStart=S.t+.65}
 if(!previousReady||wasSafe||replayed){renderNow(S.s);initFeed();updateHeader();applyStill()}
 else{
  mandatoryPrune();if((sceneChanged||recordsChanged(previous.pool,S.pool))&&!active&&!transition)renderNow(S.s,{keepAge:true});else{refreshNumbers();updateHeader();}
  applyStill();
 }
 renderQueue();
 if(S.qrDataUrl&&$('qr'))$('qr').src=S.qrDataUrl;else $('qr')?.removeAttribute('src');
}
function postReady(){if(!parentPort)return;parentPort.postMessage({version:COLOR_POLISH_VERSION,type:'color-polish:ready',nonce:bootstrapNonce,sequence:0})}
function validEnvelope(value,type,sequence){return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.version===COLOR_POLISH_VERSION&&value.type===type&&value.nonce===bootstrapNonce&&Number.isSafeInteger(value.sequence)&&value.sequence===sequence}
function receivePortMessage(event){const value=event?.data;if(!validEnvelope(value,'color-polish:update',expectedSequence+1))return;expectedSequence=value.sequence;try{applySnapshotPayload(value.snapshot??null,value.control&&typeof value.control==='object'?value.control:{})}catch{const safe=blankState();S=safe;clearPresentation();renderNow(1);initFeed();}}
function receiveBootstrap(event){const value=event?.data;if(initialized||window.parent===window||event.source!==window.parent||event.origin==='null'||!validBootstrap(value)||event.ports.length!==1)return;parentOrigin=event.origin;bootstrapNonce=value.nonce;parentPort=event.ports[0];initialized=true;expectedSequence=0;$('tv').style.visibility='';parentPort.onmessage=receivePortMessage;parentPort.start?.();postReady()}
function validBootstrap(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.version===COLOR_POLISH_VERSION&&value.type==='color-polish:bootstrap'&&typeof value.nonce==='string'&&/^[A-Za-z0-9._:-]{16,128}$/.test(value.nonce)&&value.sequence===0}
window.addEventListener('message',receiveBootstrap);

function renderNow(id,{keepAge=false}={}){
 S.s=id;slots=[];eduCards=[];hearts=[];tributes=[];
 const el=document.createElement('div');el.className='scene';el.dataset.scene=id;sceneRoot=el;
 el.innerHTML=['offline','neutral'].includes(S.mode)?safeScene():S.mode==='empty'?emptyPanel():renderers[id]();
 $('stage').replaceChildren(el);transition=null;
 if(!keepAge){S.sceneAge=0;S.eduAge=0}
 postRender();
}
function postRender(){
 slots.forEach(b=>b.el=$(b.key));
 V={root:sceneRoot,clock:0,actors:[],fx:[],garden:null,planets:[],stream:null,status:[],next:S.s===2?14:12,serial:0};
 $('arch')?.style.setProperty('opacity',[5,6,7,10,11].includes(S.s)?'.13':'.52');
 document.querySelectorAll('.scene-nav').forEach(el=>el.classList.toggle('active',+el.dataset.scene===S.s));
 bindNumbers(sceneRoot);
 if(['offline','neutral','empty'].includes(S.mode)){updateNotes();return}
 sceneRoot.querySelectorAll(':scope > div[style*="position:absolute"]').forEach(el=>{if(!el.classList.contains('orb-slot')&&el.querySelector('h1'))el.classList.add('scene-copy')});
 if([1,2,3,4,8,9].includes(S.s))mountFloaters();
 if(S.s===2)mountGarden();
 if(S.s===5)sceneRoot.querySelectorAll('.day:not(.future):not(.blank)').forEach(el=>{const day=+el.querySelector('span')?.textContent;if(day<S.selectedDay)el.classList.add('past');el.style.setProperty('--day-delay',`${-day*1.93}s`)});
 if(S.s===6)mountStatus();
 if(S.s===7){eduCards=[...sceneRoot.querySelectorAll('.edu-card')];tickEducation()}
 if(S.s===9){mountHeart();mountHearts()}
 if(S.s===10)mountOrbit();
 if(S.s===11){mountTributes();updateGoalDOM()}
 checkFullFits();
 if([1,2,3,4,8,9].includes(S.s)){const canvas=document.createElement('canvas');canvas.className='scene-fx';canvas.width=1812;canvas.height=636;canvas.setAttribute('aria-hidden','true');sceneRoot.append(canvas);V.canvas=canvas;renderFloaters();drawSceneFX(0)}
 if(S.s===10)tickOrbit(0);
 if(S.s===11)tickTributes(0);
 updateNotes();
}
function checkFullFits(){slots.forEach(b=>{const r=S.pool.find(x=>x.id===b.id);if(!r||!b.el)return;b.reading=fitCircle(b.el,r,b.d,V.clock);b.el.dataset.long=String(!smallFits(r))})}
function fullReader(r,w,h){return completeOrb(r,Math.min(w,h))}
function requestScene(id,{force=false}={}){
 id=sceneNumber(id);if(active&&!force){S.pendingScene=id;return}if(transition){S.pendingScene=id;return}if(id===S.s&&!force)return;
 if(id===7){S.bloomIndex=S.bloomNext;S.bloomNext=S.bloomIndex%9+1}
 const old=sceneRoot,prev=S.s;S.s=id;S.sceneAge=0;S.eduAge=0;slots=[];eduCards=[];hearts=[];tributes=[];
 const el=document.createElement('div');el.className='scene';el.dataset.scene=id;sceneRoot=el;
 el.innerHTML=['offline','neutral'].includes(S.mode)?safeScene():S.mode==='empty'?emptyPanel():renderers[id]();
 $('stage').append(el);postRender();log('scene_transition_start',{from:prev,to:id});
 if(S.still){old?.remove();return}el.style.opacity=0;transition={old,next:el,age:0,duration:1.15};
}
function tickTransition(dt){if(!transition)return;transition.age+=dt;const p=ease(transition.age/transition.duration);transition.old.style.opacity=1-p;transition.old.style.transform=`translateX(${-15*p}px) scale(${1-.004*p})`;transition.next.style.opacity=p;transition.next.style.transform=`translateX(${20*(1-p)}px) scale(${.997+.003*p})`;if(p>=1){transition.old.remove();transition.next.style.opacity='';transition.next.style.transform='';transition=null;log('scene_transition_end',{scene:S.s});if(S.pendingScene&&!active){const n=S.pendingScene;S.pendingScene=null;requestScene(n)}}}
function swapSlot(b){if(b.reader){b.phase='pop';b.since=S.t;b.reshape=true;b.el.querySelector('.orb-life').classList.add('orb-pop');log('bubble_pop',{scene:S.s,id:b.id,age:S.t-b.born});return}const otherIds=slots.map(x=>x.id);const r=choose(otherIds,b.expression);if(!r){b.born=S.t;return}if(S.s===2&&!smallFits(r)){// Preserve the full message by using the measured large-bubble layout.
 S.lastShown.set(r.id,-100000);renderNow(S.s,{keepAge:true});S.replenishAt=S.sceneAge+10;log('large_bubble_selected',{id:r.id});return}b.next=r.id;b.phase='pop';b.since=S.t;b.el?.querySelector('.orb-life')?.classList.add('orb-pop');emit(b.x+b.d/2,b.y+b.d/2,16,catalog[r.ids[0]-1].color);log('bubble_pop',{scene:S.s,id:b.id,age:S.t-b.born})}
function tickSlots(dt){
 if(!V.root?.isConnected||active||transition||S.still||['offline','neutral','empty'].includes(S.mode))return;
 V.clock+=dt;
 if(S.s===10){tickOrbit(dt);return}
 if(S.s===6){tickStatus(dt);return}
 if(![1,2,3,4,8,9].includes(S.s))return;
 integrateFloaters(dt);
 for(const a of [...V.actors]){
  if(!a.reading)a.reading=slots.find(b=>b.key===a.key)?.reading;
  if(a.reading)a.minRead=a.reading.pages.reduce((n,p)=>n+Math.max(9,p.length/14),0);
  if(a.life==='steady')tickCirclePages(a,V.clock);
  const age=V.clock-a.lifeAt;
  if(a.life==='swelling'&&age>=.72){
   const kind=S.s===2?'petals':'hearts';burstAt(a.screenX,a.screenY,kind,44,a.d*.48);
   if(S.s===2){const x=clamp(a.x+(a.rng()-.5)*190,50,1762);V.garden.pending.push({x,born:V.clock+2.15,color:catalog[S.pool.find(r=>r.id===a.id).ids[0]-1].color});V.fx.push({kind:'return',x:a.x,y:a.y,tx:x,ty:603,start:V.clock,life:2.2,color:'#e3b95c'})}
   a.life='absent';a.lifeAt=V.clock;log('bubble_burst',{scene:S.s,id:a.id,kind});
  }
  if(a.life==='absent'&&age>=.48)installNext(a);
  else if(a.life==='exiting'&&age>=3.8)installNext(a);
  else if((a.life==='entering'&&age>=3.8)||(a.life==='sprout'&&age>=2.65)){a.x=a.homeX;a.y=a.homeY;a.life='steady';a.born=V.clock;log('bubble_settled',{scene:S.s,id:a.id})}
 }
 if(S.s===2&&V.clock>=V.next){
  const ready=V.actors.filter(a=>a.life==='steady'&&V.clock-a.born>=Math.max(13,a.minRead||0)).sort((a,b)=>a.born-b.born||a.serial-b.serial);
  if(ready.length&&replaceActor(ready[0],'petals'))log('garden_replacement',{scene:2,index:++V.serial,active:V.actors.length});
  V.next+=7;
 }
 else if([4,8,9].includes(S.s)){
  const a=V.actors.find(a=>a.life==='steady'&&V.clock>=Math.max(a.retireAt,a.born+(a.minRead||0))); 
  if(a)replaceActor(a,S.s===9?'hearts':'drift');
 }
 renderFloaters();drawSceneFX(dt);if(S.s===2)drawGarden();
}
function tickEducation(){
 if(S.s!==7||!eduCards.length)return;
 const p=S.still?1:ease((S.eduAge-6)/3),chosen=S.bloomIndex;let other=0;
 eduCards.forEach((el,i)=>{
  const sel=i+1===chosen,k=sel?0:other++,start={x:(i%3)*611,y:91+Math.floor(i/3)*177,w:590,h:167},end=sel?{x:8,y:90,w:950,h:530}:{x:985+(k%2)*419,y:90+Math.floor(k/2)*136,w:403,h:126};
  el.style.left=lerp(start.x,end.x,p)+'px';el.style.top=lerp(start.y,end.y,p)+'px';el.style.width=lerp(start.w,end.w,p)+'px';el.style.height=lerp(start.h,end.h,p)+'px';el.classList.toggle('focused',sel&&p>0);el.classList.toggle('compact',!sel&&p>.1);el.style.zIndex=sel&&p>0?'9':'1';
  el.querySelector('.edu-front').style.opacity=sel?1-clamp(p*2,0,1):1;el.querySelector('.edu-detail').style.opacity=sel?clamp((p-.5)*2,0,1):0;
  const petals=el.querySelector('.edu-petals');petals.style.opacity=sel?Math.sin(Math.PI*p)*.65:0;petals.querySelectorAll('.edu-petal').forEach((leaf,n)=>leaf.style.transform=`translate(${Math.cos(n*1.256)*p*180}px,${Math.sin(n*1.256)*p*115}px) scale(${1-p*.4})`);
 });
 if($('edu-step'))$('edu-step').textContent=p>0?'IN FOCUS · '+catalog[chosen-1].name.toUpperCase()+' · '+String(chosen).padStart(2,'0')+'/09':'01-09 · THE COMPLETE PHRASES';
}
function formatDayRange(week){const start=new Date(week+'T12:00:00Z');const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);return `${start.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()} ${start.getUTCDate()}-${end.getUTCDate()}`}
function updateGoalDOM(){const g=goal();if($('goal-fill'))$('goal-fill').style.width=clamp(g.ratio*100,0,100)+'%';if($('goal-rank'))$('goal-rank').textContent=g.rank===null?'':`Now #${g.rank} → #4`;if($('goal-status'))$('goal-status').textContent=g.achieved?'Fourth-place level reached':'This week’s shared progress';if($('milestone-fill'))$('milestone-fill').style.width=clamp(sum(totals().month.expr)/nextMilestone()*100,0,100)+'%'}
function captureMilestone(threshold){S.milestoneValue=Math.max(0,Math.floor(Number(threshold)||0));S.milestoneContributors=[];}

function mountTributes(){
 const root=$('tribute-stream');if(!root)return;
 const pool=contributorPool();V.stream={el:root,width:root.clientWidth,height:root.clientHeight,nodes:[],icons:[],canvas:$('stream-canvas')};
 if(!pool.length){const p=document.createElement('p');p.className='subheading';p.style='padding:180px 90px';p.textContent='The milestone remains. No current personal recognitions are available to replay.';root.append(p);return}
 const N=Math.min(26,pool.length),rng=randSeed(189391);
 for(let i=0;i<N;i++){
  const r=pool[i],el=document.createElement('div');el.className='stream-node';root.append(el);
  const a={el,id:r.id,y:900*(i+.5)/N-130,phase:rng()*TAU,radius:145+rng()*168,rise:19+rng()*19,turn:.13+rng()*.15,depth:295+rng()*95,offset:-110-rng()*65,wobble:rng()*TAU,rng,cycles:0};tributeContent(a,r);V.stream.nodes.push(a);
 }
 for(let i=0;i<14;i++){const el=document.createElement('img');el.className='stream-icon';el.src=ASSETS['icon'+(1+i%9)];el.alt='';root.append(el);V.stream.icons.push({el,y:740*(i/14),phase:rng()*TAU,radius:240+rng()*145,rise:14+rng()*20,turn:.15+rng()*.16})}
}
function tickTributes(dt){
 if(S.s!==11||!V.stream||active||transition||(S.still&&dt>0))return;
 const v=V.stream,t=V.clock,W=v.width,H=v.height,ids=contributorPool();
 for(const a of v.nodes){
  a.y-=dt*a.rise;
  if(a.y< -180){a.y=H+180;a.cycles++;const used=v.nodes.filter(x=>x!==a).map(x=>x.id);const free=ids.filter(r=>!used.includes(r.id));if(free.length)tributeContent(a,free[Math.floor(a.rng()*free.length)]);}
  const angle=a.phase+t*a.turn+Math.sin(t*.13+a.wobble)*.17,z=Math.sin(angle)*a.depth+a.offset,k=1000/(1000-z);
  const x=W*.52+Math.cos(angle)*a.radius*k+Math.sin(t*.23+a.wobble)*12,y=a.y-(k-.75)*27;
  const opacity=smooth((y+115)/110)*smooth((H+125-y)/130)*(z< -220?.52+.25*(z+560)/340:1);
  a.el.style.transform=`translate(${x-79}px,${y-79}px) scale(${k})`;a.el.style.opacity=clamp(opacity,0,1);a.el.style.zIndex=String(1000+Math.round(z));a.el.style.filter=`blur(${Math.max(0,(-z-150)/350).toFixed(2)}px) drop-shadow(${(-7*k).toFixed(1)}px ${(13*k).toFixed(1)}px ${(12*k).toFixed(1)}px #99846925)`;
  a.x=x;a.z=z;a.scale=k;a.screenY=y;
 }
 for(const a of v.icons){a.y-=dt*a.rise;if(a.y< -80)a.y=H+80;const angle=a.phase+t*a.turn,z=Math.sin(angle)*370-120,k=950/(950-z),x=W*.52+Math.cos(angle)*a.radius*k;a.el.style.transform=`translate(${x}px,${a.y}px) scale(${k}) rotate(${Math.sin(t*.33+a.phase)*17}deg)`;a.el.style.opacity=.72*smooth((a.y+45)/80)*smooth((H+40-a.y)/80);a.el.style.zIndex=String(1000+Math.round(z));}
 drawStream();
}
// Persistent independent feed tracks. Full strings remain intact and timestamps never reset on replay.
function chatMarkup(r,incoming=false){return `<article class="chat-item ${incoming?'incoming-item':''}" data-feed-id="${esc(r.id)}" style="--tint:${catalog[r.ids[0]-1].color}"><div class="chat-avatar">${icon(r.ids[0])}</div><div><div class="chat-head"><strong class="chat-name">${esc(r.name)}</strong><time class="chat-time" datetime="${new Date(r.createdAt).toISOString()}">${submittedStamp(r)}</time></div><p class="chat-message" data-full-message="${esc(r.id)}">${esc(r.message)}</p><div class="chat-foot">${r.ids.map(id=>`${icon(id)}<span>${esc(catalog[id-1].name)}</span>`).join('<span> · </span>')}${reactionMarkup(r,'span','chat-like')}</div></div></article>`}
function initFeed(){feedLanes=[];const p=records().sort((a,b)=>b.createdAt-a.createdAt);if(!p.length){$('feed-columns').innerHTML='<div class="feed-safe" style="grid-column:1/-1">'+(['offline','neutral'].includes(S.mode)?'Recognition feed paused · no names or messages displayed.':'No recognitions cleared for display yet.')+'</div>';return}$('feed-columns').innerHTML='<div class="feed-lane" id="lane0"></div><div class="feed-lane" id="lane1"></div>';for(let n=0;n<2;n++){const list=p.filter((_,i)=>i%2===n);if(!list.length)continue;const track=document.createElement('div');track.className='feed-track';$('lane'+n).append(track);const lane={el:track,index:n,offset:n?24:0,cursor:0,list:list.map(r=>r.id),next:[]};for(let i=0;i<Math.min(9,list.length);i++){track.insertAdjacentHTML('beforeend',chatMarkup(list[i]));lane.cursor++}feedLanes.push(lane);bindNumbers(track)}}
function addFeed(r){if(!feedLanes.length){initFeed();return}S.feedArrivalCounter=(S.feedArrivalCounter||0)+1;const lane=feedLanes[S.feedArrivalCounter%feedLanes.length],temp=document.createElement('div');temp.innerHTML=chatMarkup(r,true);const node=temp.firstElementChild;let y=-lane.offset,before=null;for(const child of lane.el.children){if(y>=115){before=child;break}y+=child.getBoundingClientRect().height/getScale()+9}lane.el.insertBefore(node,before);while(lane.el.children.length>12)lane.el.lastElementChild.remove();bindNumbers(node);log('feed_insertion',{id:r.id,lane:lane.index})}

function tickFeeds(dt){if(S.still||!records().length)return;for(const lane of feedLanes){lane.offset+=dt*5.5;const first=lane.el.firstElementChild;if(!first)continue;const h=first.getBoundingClientRect().height/getScale()+9;if(lane.offset>=h){lane.offset-=h;first.remove();let id=lane.next.shift();if(!id){const p=records().filter((_,i)=>i%2===lane.index);if(p.length)id=p[(lane.cursor++)%p.length].id}const r=S.pool.find(x=>x.id===id);if(eligible(r)){const temp=document.createElement('div');temp.innerHTML=chatMarkup(r,false);lane.el.append(temp.firstElementChild);bindNumbers(lane.el)}}lane.el.style.transform=`translate3d(0,${-lane.offset}px,0)`;}}
function getScale(){return $('tv').getBoundingClientRect().width/1920||1}
function updateHeader(){const now=effectiveNow();const date=now?new Intl.DateTimeFormat('en-US',{timeZone:ZONE,month:'long',day:'numeric',year:'numeric'}).format(now):'';const sourceLabel=S.source==='sample'?'SIMULATED SAMPLE':'LIVE CAMPAIGN';if($('header-time'))$('header-time').innerHTML=date+`<small>${sourceLabel} · `+(now?new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(now):'')+'</small>';const total=reactionTotal();const likes=$('campaign-likes');if(likes){if(total===null){likes.replaceChildren();likes.hidden=true;likes.style.display='none'}else{likes.hidden=false;likes.style.display='flex';likes.innerHTML=THUMB+num('likes')+`<span>${reactionWord(total)}</span>`;bindNumbers(likes)}}S.lastHeader=Math.floor(S.t/30)}
function renderQueue(){const el=$('queue');if(!active&&!S.queue.length){el.hidden=true;return}el.hidden=false;const a=active,secs=a&&a.phase==='reading'?Math.max(0,Math.ceil(a.hold-(S.t-a.phaseAt))):null;el.innerHTML=`<span class="queue-badge">${S.queue.length}</span><span>waiting</span><span class="queue-dots">${Array.from({length:10},(_,i)=>`<i class="${i<Math.min(10,S.queue.length)?'filled':''}" style="animation-delay:-${i*.2}s"></i>`).join('')}</span>${a?`<span>·</span><span>${a.kind==='group'?'Group of '+a.items.length:'1 recognition'} ${a.phase==='reading'?'on screen':a.phase==='exit'?'exiting':a.phase==='gap'?'next arriving':'arriving'}</span>${secs!==null?`<b class="queue-hold">${secs}s</b><span class="queue-meter"><i style="width:${(1-(S.t-a.phaseAt)/a.hold)*100}%"></i></span>`:''}`:''}${S.queue.length>=10?'<span>· Next ten release together</span>':''}`;}
function beginEvent(){
 if(active&&active.phase!=='gap')return;
 S.queue=S.queue.filter(id=>eligible(S.pool.find(r=>r.id===id)));
 if(!S.queue.length){endChain();return}
 const items=S.queue.splice(0,S.queue.length>=10?10:1).map(id=>S.pool.find(r=>r.id===id)),group=items.length===10;
 if(!S.chain){S.chain=true;S.returnScene=S.s;S.returnAge=S.sceneAge;$('stage').classList.add('dimmed')}
 const style=nextStyle(group?'group':'single');
 active={items,kind:group?'group':'single',style,phase:'entrance',phaseAt:S.t,hold:group?30:8,entrance:S.still?0:group?4.7:3.6,exit:S.still?0:1.35,page:0,oversize:group&&items.some(r=>!smallFits(r)),elements:[],localTime:0};
 buildEvent();
 log('entrance_start',{kind:active.kind,style:group?GROUP_STYLES[style]:SINGLE_STYLES[style],ids:items.map(x=>x.id)});renderQueue();
}
function buildEvent(){
 const a=active;if(!a)return;const group=a.kind==='group';
 const root=$('event');root.className='event-stage active';root.dataset.style=(group?'group-':'single-')+a.style;
 root.innerHTML=`<div class="event-world ${group?'group-world':''}"></div>${group?`<h2 class="group-title">${shimmer(GROUP_TITLES[a.style])}</h2><span class="group-kind">${esc(GROUP_STYLES[a.style].toUpperCase())} · A WAVE OF TEN</span>`:`<div class="event-kicker">A NEW RECOGNITION HAS ARRIVED</div><div class="event-title"><div class="eyebrow">Mother’s Love, shared</div><h2>${shimmer('Kindness')}<br>comes full circle.</h2><p>A moment of appreciation<br>for you.</p></div><div class="countdown-caption">${esc(SINGLE_STYLES[a.style])} · full message</div>`}<canvas class="event-sparkles" id="event-canvas" width="1812" height="615" aria-hidden="true"></canvas><div id="event-items"></div>`;
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
   else{a.phase='exit';a.phaseAt=S.t;log('reading_end',{kind:a.kind,ids:a.items.map(r=>r.id)})}
  }
 }else if(a.phase==='exit'){
  const p=S.still?1:smooth(elapsed/a.exit);
  a.elements.forEach((b,i)=>positionEvent(b,{x:b.x+(a.kind==='group'?(i%2?180:-180):110)*p,y:b.y-100*p,z:-p*200,k:1-.25*p,alpha:1-p}));
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
function emit(x,y,n=10,color='#d9b477'){if(S.still)return;for(let i=0;i<n;i++){if(particles.length>=180)particles.shift();const a=i*2.3999;particles.push({x,y,dx:Math.cos(a)*(8+i%7*5),dy:Math.sin(a)*(8+i%5*5),life:2.1,age:0,color,r:1.6+i%3})}}
function drawSpark(c,x,y,r,opacity,color){c.save();c.globalAlpha=clamp(opacity,0,1);c.fillStyle=color;c.beginPath();c.moveTo(x,y-r*2);c.quadraticCurveTo(x+r*.25,y-r*.25,x+r*1.4,y);c.quadraticCurveTo(x+r*.25,y+r*.25,x,y+r*2);c.quadraticCurveTo(x-r*.25,y+r*.25,x-r*1.4,y);c.quadraticCurveTo(x-r*.25,y-r*.25,x,y-r*2);c.fill();c.restore()}
function drawAtmosphere(dt){const c=$('atmosphere').getContext('2d');c.clearRect(0,0,1920,686);if(S.still||['offline','neutral'].includes(S.mode))return;const energy=S.mode==='low'||S.lowAutomatic?.45:1;for(let i=0;i<30;i++){const x=((i*373.7)%1870)+Math.sin(S.t/15+i)*23,y=((i*149.2-S.t*(2+i%3))%665+665)%665;drawSpark(c,x,y,1.2+i%3,.18*energy*(.7+.3*Math.sin(S.t/3+i)),i%3?'#cbb682':'#d9bdb7')}
 for(let i=0;i<8;i++){const x=70+((i*271+S.t*2)%1820),y=28+((i*91+S.t*3)%635);c.save();c.translate(x,y);c.rotate(S.t/23+i);c.fillStyle=i%2?'#e7c4c23d':'#d7d8b540';c.beginPath();c.ellipse(0,0,4,9,0,0,Math.PI*2);c.fill();c.restore()}
 particles=particles.filter(p=>p.age<p.life);particles.forEach(p=>{p.age+=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;drawSpark(c,p.x+54,p.y+28,p.r,(1-p.age/p.life)*.8,p.color)});}
function mountHearts(){const root=$('heart-field');if(!root)return;hearts=[];for(let i=0;i<14;i++){const el=document.createElement('div');el.className='floating-heart';const size=27+i%4*13;el.style.width=size+'px';el.style.height=size+'px';el.innerHTML=heartSVG(i%3===0?'#d6bbc9':'#e9b1b9');root.append(el);hearts.push({el,x:24+i%7*106,y:276+Math.floor(i/7)*135,phase:i,size})}}
function tickHearts(dt){if(S.still)return;hearts.forEach((h,i)=>{const y=250+((h.y-250-S.t*(3+i%3))%330+330)%330;h.el.style.transform=`translate(${h.x+Math.sin(S.t/10+i)*22}px,${y}px) rotate(${Math.sin(S.t/14+i)*12}deg) scale(${1+Math.sin(S.t/3+i)*.025})`})}
function mountHeart(){const host=$('heart-host');if(!host)return;if(!heartRenderer)heartRenderer=createHeart();host.append(heartRenderer.canvas);heartRenderer.draw(S.t)}
function createHeart(){
 const img=document.createElement('img');img.src=ASSETS.heart_render;img.alt='Sculpted rotating heart';img.style='width:100%;height:100%;object-fit:contain';
 return{canvas:img,draw:t=>{img.style.transform=`perspective(800px) rotateY(${t*7.5}deg)`}};
}
function clearPresentation(){
 active=null;transition=null;slots=[];sceneRoot=null;eduCards=[];numberNodes=[];numCache.clear();feedLanes=[];particles=[];heartRenderer=null;hearts=[];tributes=[];frozen=false;
 if(typeof V!=='undefined')V={root:null,clock:0,actors:[],fx:[],garden:null,planets:[],stream:null,status:[],next:14,serial:0};
 const stage=$('stage');if(stage)stage.replaceChildren();
 const event=$('event');if(event){event.className='event-stage';event.replaceChildren();}
 const queue=$('queue');if(queue){queue.hidden=true;queue.replaceChildren();}
 const feeds=$('feed-columns');if(feeds)feeds.replaceChildren();
 const field=$('heart-field');if(field)field.replaceChildren();
 const atmosphere=$('atmosphere');const context=atmosphere?.getContext?.('2d');context?.clearRect(0,0,atmosphere.width,atmosphere.height);
 const qr=$('qr');if(qr)qr.removeAttribute('src');$('qr-zone')?.classList.remove('qr-active');$('stage')?.classList.remove('dimmed');
 S.pool=[];S.queue=[];S.seen=new Set();S.arrivalIds=new Set();S.lastShown=new Map();S.milestoneContributors=[];S.pendingScene=null;S.chain=false;
}

function mandatoryPrune(){
 const invalid=S.pool.filter(r=>!eligible(r)).map(r=>r.id);if(!invalid.length)return;
 S.queue=S.queue.filter(id=>!invalid.includes(id));
 if(active&&active.items.some(r=>invalid.includes(r.id))){
  active.items=active.items.filter(eligible);if(!active.items.length){active=null;S.chain=false;$('event')?.replaceChildren();$('event')?.classList.remove('active');$('stage')?.classList.remove('dimmed');$('qr-zone')?.classList.remove('qr-active')}
  else if(active.kind==='group'&&active.oversize){buildGroupPage(active.page);}
 }
 const removeIds=new Set(invalid);
 document.querySelectorAll('[data-record-id],[data-event-id],[data-tribute-id],[data-feed-id]').forEach(el=>{const id=el.dataset.recordId||el.dataset.eventId||el.dataset.tributeId||el.dataset.feedId;if(removeIds.has(id))el.remove()});
 if(invalid.some(id=>slots.some(slot=>slot.id===id)))renderNow(S.s,{keepAge:true});
 if(invalid.some(id=>[...document.querySelectorAll('[data-feed-id]')].some(el=>el.dataset.feedId===id)))initFeed();
 refreshNumbers();renderQueue();
}
function changeWeek(){}
function coordinator(dt){
 if(frozen||document.hidden||!S.playing||S.mode!=='normal')return;
 if(!S.clockControlled)S.t+=dt;
 changeWeek();
 if(S.t>=S.privacyAt){mandatoryPrune();S.privacyAt=S.t+1}
 if(transition)tickTransition(dt);
 else if(!active&&S.queue.length&&S.t>=(S.queueStart??0)&&!['offline','neutral','empty'].includes(S.mode))beginEvent();
 if(active)tickEvent(dt);
 else if(!transition){
  if(!S.still){S.sceneAge+=dt;if(S.s===7){S.eduAge+=dt;tickEducation()}tickSlots(dt);tickTributes(dt);tickHearts(dt);}
 }
 if(!active&&!transition&&!S.still&&!S.sceneControlled&&!S.pauseRotation&&S.playlist?.length){const current=S.playlist.findIndex(entry=>entry.id===S.s),duration=S.dwell?.[S.s]??DWELL[S.s]??30;if(current>=0&&S.sceneAge>=duration){const next=S.playlist[(current+1)%S.playlist.length];if(next)requestScene(next.id)}}
 if(!active&&!transition&&S.milestonePending&&!S.queue.length&&S.sceneAge>=10){captureMilestone(S.milestonePending);S.milestonePending=null;requestScene(11)}
 tickFeeds(dt);tickNumbers();
 if(!S.still&&!active&&!transition&&heartRenderer&&heartRenderer.canvas.isConnected)heartRenderer.draw(V.clock*.55+6);
 if(Math.floor(S.t/30)!==S.lastHeader)updateHeader();
 if(S.shimmerUntil&&S.t>S.shimmerUntil){$('tv')?.classList.remove('force-shimmer');S.shimmerUntil=0}
}
function updateNotes(){}
function applyStill(){
 $('tv')?.classList.toggle('still',S.still);
 if(S.still){particles=[];numCache.forEach(c=>c.value=c.target);if(active?.phase==='entrance')active.entrance=0}
}
function size(){const f=$('frame').getBoundingClientRect(),scale=Math.min(f.width/1920,f.height/1080);$('tv').style.transform=`scale(${scale})`;$('tv').style.left=(f.width-1920*scale)/2+'px';$('tv').style.top=(f.height-1080*scale)/2+'px'}
let drawAccum=0;function frame(t){
 const dt=lastFrame?Math.min(.065,(t-lastFrame)/1000):0;lastFrame=t;
 coordinator(dt*playbackRate);drawAccum+=dt;
 if(drawAccum>=1/25){if(!frozen)drawAtmosphere(drawAccum*playbackRate);drawAccum=0}requestAnimationFrame(frame);
}
function init(){
 if(window.parent===window){document.body.replaceChildren();return;}
 $('tv').style.visibility='hidden';
 $('flowers').src=ASSETS.flowers;$('foliage').src=ASSETS.foliage;size();
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(size):null;observer?.observe($('frame'));window.addEventListener('resize',size);
 document.addEventListener('visibilitychange',()=>{lastFrame=performance.now()});
 requestAnimationFrame(frame);
}
let V={root:null,clock:0,actors:[],fx:[],garden:null,planets:[],stream:null,status:[],next:14,serial:0};

let playbackRate=1;

const TAU=Math.PI*2;

const randSeed=n=>{let x=n>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}};

const hashText=s=>{let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};

const mix=(a,b,p)=>a+(b-a)*p;

const smooth=p=>{p=clamp(p,0,1);return p*p*(3-2*p)};

const outCubic=p=>1-Math.pow(1-clamp(p,0,1),3);

const curve=(a,b,c,d,p)=>Math.pow(1-p,3)*a+3*(1-p)*(1-p)*p*b+3*(1-p)*p*p*c+p*p*p*d;

const MOTION_ORDER=[1,2,4,5,8,6,7,9,10,11];

const SCENE_NUMBERS={1:1,2:2,3:3,4:4,5:5,8:6,6:7,7:8,9:9,10:10,11:11};

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

function mountFloaters(){
 V.actors=slots.map((b,i)=>{
  const random=randSeed(hashText(b.id+'scene'+S.s+i));
  const a={...b,el:b.el,x:b.x+b.d/2,y:b.y+b.d/2,homeX:b.x+b.d/2,homeY:b.y+b.d/2,vx:(random()>.5?1:-1)*(9+random()*11),vy:(random()-.5)*15,rng:random,phase:random()*TAU,rate:.14+random()*.11,pace:11+random()*10,z:random()*100-60,depth:.9+random()*.1,life:'steady',lifeAt:0,born:0,retireAt:17+i*9.2,nextTurn:2+random()*5};
  if(S.s===3)a.pace=0;
  if(!smallFits(S.pool.find(r=>r.id===a.id)))a.large=true;
  return a;
 });
}

function forbidden(a){
 if(S.s===4)return[{x:0,y:0,w:520,h:636}];
 if(S.s===1)return[{x:0,y:10,w:855,h:347}];
 if(S.s===8)return[{x:0,y:8,w:700,h:296}];
 if(S.s===9)return[{x:0,y:10,w:870,h:276}];
 if(S.s===2)return[{x:0,y:0,w:1812,h:78}];
 return[];
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
 for(const a of V.actors){
  if(a.large||!a.motion||a.life!=='steady')continue;
  const t=V.clock,noiseX=Math.sin(t*a.rate+a.phase)+.45*Math.sin(t*a.rate*.367+a.phase*3),noiseY=Math.cos(t*a.rate*.83+a.phase*2);
  a.vx+=noiseX*dt*4;a.vy+=noiseY*dt*3;
  let speed=Math.hypot(a.vx,a.vy),min=a.pace*.45,max=a.pace*(S.mode==='low'?.65:1);
  if(speed>max){a.vx*=1-(1-max/speed)*dt*1.3;a.vy*=1-(1-max/speed)*dt*1.3}
  if(speed<min){a.vx+=Math.cos(a.phase)*dt*2;a.vy+=Math.sin(a.phase)*dt*2}
  const rad=a.d*.51*a.depth,top=S.s===2||S.s===4?87:7;
  if(a.x<rad+12){a.vx+=dt*24;a.x=Math.max(rad+3,a.x)}
  if(a.x>1812-rad-12){a.vx-=dt*24;a.x=Math.min(1809-rad,a.x)}
  if(a.y<top+rad){a.vy+=dt*19;a.y=Math.max(top+rad-5,a.y)}
  if(a.y>626-rad){a.vy-=dt*19;a.y=Math.min(631-rad,a.y)}
  forbidden(a).forEach(box=>steerOutside(a,box,dt));
 }
 for(let i=0;i<V.actors.length;i++)for(let j=i+1;j<V.actors.length;j++){
  const a=V.actors[i],b=V.actors[j];if(a.life!=='steady'||b.life!=='steady')continue;
  let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy)||1,r=(a.d*a.depth+b.d*b.depth)/2+24;
  if(d<r){let f=(r-d)*dt*.95,nx=dx/d,ny=dy/d;if(!a.large){a.vx+=nx*f;a.vy+=ny*f;a.x+=nx*(r-d)*.012;a.y+=ny*(r-d)*.012}if(!b.large){b.vx-=nx*f;b.vy-=ny*f;b.x-=nx*(r-d)*.012;b.y-=ny*(r-d)*.012}}
 }
 V.actors.forEach(a=>{if(a.life==='steady'&&a.motion&&!a.large){a.x+=a.vx*dt;a.y+=a.vy*dt}});
}

function renderFloaters(){
 for(const a of V.actors){
  const t=V.clock;a.depth=a.large?1:.948+.048*Math.sin(t*(a.rate*.31)+a.phase);
  let x=a.x,y=a.y,scale=a.depth,op=1;const p=t-a.lifeAt;
  if(a.life==='swelling'){scale*=1+.09*smooth(p/.58);if(p>.58)op=1-smooth((p-.58)/.23)}
  if(a.life==='sprout'){const q=smooth(p/2.65);x=mix(a.originX,a.homeX,q)+Math.sin(q*Math.PI)*a.sproutBend;y=mix(654,a.homeY,q);scale*=.04+.96*outCubic(q);op=smooth(p/.5)}
  if(a.life==='exiting'){const q=smooth(p/3.8);x+=a.exitDX*q;y+=a.exitDY*q;scale*=1-.12*q;op=1-smooth((q-.55)/.45)}
  if(a.life==='entering'){const q=smooth(p/3.8);x=mix(a.originX,a.homeX,q);y=mix(a.originY,a.homeY,q)+Math.sin(q*Math.PI)*36;scale*=.75+.25*q;op=smooth(p/1.2)}
  if(a.life==='absent')op=0;
  a.screenX=x;a.screenY=y;a.screenScale=scale;a.opacity=op;
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
 if(S.s===2){a.life='sprout';a.lifeAt=V.clock;a.originX=clamp(a.homeX+(a.rng()-.5)*200,80,1730);a.sproutBend=(a.rng()-.5)*110;gardenGlow(a.originX,V.clock)}
 else{a.life='entering';a.lifeAt=V.clock;const side=Math.floor(a.rng()*3);a.originX=side===0?-a.d:side===1?1812+a.d:a.homeX+(a.rng()-.5)*350;a.originY=side===2?720:a.homeY;}
 log('bubble_new',{scene:S.s,id:a.id,method:a.life});
}

function mountGarden(){
 const rng=randSeed(89001);V.garden={canvas:$('living-garden'),plants:[],pending:[],glows:[]};
 for(let i=0;i<28;i++)V.garden.plants.push({x:20+i*66+(rng()-.5)*35,y:617+rng()*15,height:20+rng()*35,phase:rng()*TAU,born:-20,color:['#edc66e','#e1acae','#d6bdcf','#f7e6ab'][i%4],leaves:rng()>.3});
 drawGarden();
}

function gardenGlow(x,born){V.garden?.glows.push({x,born})}

function plant(c,p,t){
 let grow=p.born<0?1:outCubic((t-p.born)/2.9);if(grow<=0)return;
 let sway=Math.sin(t*.62+p.phase)*3.8+Math.sin(t*.27+p.phase*2)*1.8;
 c.save();c.translate(p.x,p.y);c.scale(grow,grow);
 c.strokeStyle='#8caa7787';c.lineWidth=2.3;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.bezierCurveTo(4,-p.height*.3,-5+sway,-p.height*.62,sway,-p.height);c.stroke();
 if(p.leaves)for(let side of [-1,1]){c.save();c.translate(sway*.3,-p.height*.4);c.rotate(side*.52+sway*.02);c.fillStyle=side<0?'#a3bc80ab':'#b8c58b9c';c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(side*25,-26,side*28,-20);c.quadraticCurveTo(side*20,5,0,0);c.fill();c.restore()}
 c.translate(sway,-p.height);c.rotate(sway*.04);
 const bloom=smooth((grow-.38)/.62);c.scale(bloom,bloom);
 for(let k=0;k<6;k++){c.save();c.rotate(k*TAU/6);const g=c.createLinearGradient(0,0,0,-22);g.addColorStop(0,p.color);g.addColorStop(1,'#fff8e8');c.fillStyle=g;c.beginPath();c.ellipse(0,-9,6.5,12,Math.sin(t*.4+p.phase+k)*.08,0,TAU);c.fill();c.restore()}
 c.fillStyle='#d8ad50';c.beginPath();c.arc(0,0,4.2,0,TAU);c.fill();c.restore();
}

function drawGarden(){
 const g=V.garden;if(!g)return;const c=g.canvas.getContext('2d'),t=V.clock;c.clearRect(0,0,1812,636);
 const wash=c.createLinearGradient(0,490,0,636);wash.addColorStop(0,'#cbdcaa00');wash.addColorStop(1,'#c1d19b43');c.fillStyle=wash;c.fillRect(0,490,1812,146);
 g.pending=g.pending.filter(p=>{if(t>=p.born){g.plants.push({x:p.x,y:628,height:53+(g.plants.length%4)*13,phase:g.plants.length*2.4,born:t,color:p.color,leaves:true});if(g.plants.length>72)g.plants.splice(0,1);log('garden_flower_grown',{flowers:g.plants.length});return false}return true});
 g.plants.forEach(p=>plant(c,p,t));
 for(const glow of g.glows){const age=t-glow.born;if(age>3)continue;const r=80*smooth(age/2)+15,grad=c.createRadialGradient(glow.x,625,0,glow.x,625,r);grad.addColorStop(0,`rgba(234,199,107,${Math.sin(Math.PI*age/3)*.65})`);grad.addColorStop(1,'#ffe7a900');c.fillStyle=grad;c.fillRect(glow.x-r,625-r,2*r,2*r)}
 g.glows=g.glows.filter(a=>t-a.born<3);
 for(const a of V.actors)if(a.life==='sprout'){
  const age=t-a.lifeAt,q=smooth(age/2.65);c.save();c.strokeStyle=`rgba(168,190,124,${.7*(1-q)})`;c.lineWidth=4;c.beginPath();c.moveTo(a.originX,633);c.bezierCurveTo(a.originX-25,570,a.screenX+15,a.screenY+90,a.screenX,a.screenY);c.stroke();c.restore();
 }
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

function mountStatus(){
 V.status=[...sceneRoot.querySelectorAll('.stat-expression .medallion img')].map((el,i)=>({el,phase:i*2.399,rate:.4+i*.037,amplitude:2.2+i%3}));
}

function tickStatus(dt){V.status.forEach((a,i)=>{let t=V.clock,breath=Math.sin(t*a.rate+a.phase),tilt=Math.sin(t*.29+a.phase*2)*4.5;a.el.style.transform=`translate(${Math.sin(t*.19+a.phase)*2}px,${breath*a.amplitude}px) rotate(${tilt}deg) scale(${1+Math.sin(t*.21+a.phase)*.018})`;a.el.parentElement.style.boxShadow=`inset 3px 5px 9px #fff,inset -6px -8px 14px #ae95512b,0 6px 17px rgba(213,188,121,${.1+.1*(breath+1)/2})`})}

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
  const theta=p.phase+V.clock*.102,pos=projectOrbit(theta),b=p.b;
  p.z=pos.z;p.scale=pos.k;
  p.el.style.transform=`translate(${pos.x-b.d/2}px,${pos.y-b.d/2}px) scale(${pos.k})`;
  p.el.style.zIndex=String(Math.round(10000+pos.z));p.el.style.opacity=String(pos.z<0?.78+.22*(pos.z+395)/395:1);p.el.style.filter=pos.z< -120?`blur(${(-pos.z-120)/1000}px)`:'none';
  b.x=pos.x-b.d/2;b.y=pos.y-b.d/2+84;
  if(b.reading)tickCirclePages(b,V.clock);
  p.moons.forEach((moon,j)=>{const a=V.clock*(.33+j*.04)+j*Math.PI+p.phase,mz=Math.sin(a)*52,k=600/(600-mz),r=157;moon.style.transform=`translate(${142+Math.cos(a)*r*k-21.5}px,${142+Math.sin(a)*50*k-21.5}px) scale(${k})`;moon.style.zIndex=mz>0?'4':'1';moon.style.opacity=mz>0?'1':'.8'});
  if(V.clock-p.lastSwap>24&&pos.z<-330){
   const r=choose(slots.map(x=>x.id),S.featured);if(r){b.id=r.id;b.el.dataset.recordId=r.id;b.el.innerHTML=`<div class="orb-life">${completeOrb(r,b.d)}</div>`;S.lastShown.set(r.id,S.t);bindNumbers(b.el);b.reading=fitCircle(b.el,r,b.d,V.clock);p.moons.forEach((el,j)=>{const id=r.ids[j%r.ids.length];el.innerHTML=icon(id);el.style.setProperty('--tint',catalog[id-1].color)});log('orbit_backside_replace',{id:r.id})}p.lastSwap=V.clock;
  }
 });
}

function contributorPool(){
 const g=goal();return records().filter(r=>S.milestoneContributors.includes(r.id)||(weekKey(r.createdAt)===S.week&&r.ids.includes(g.id)));
}

function tributeContent(a,r){
 a.id=r.id;a.el.dataset.tributeId=r.id;a.el.dataset.weekly=String(weekKey(r.createdAt)===S.week&&r.ids.includes(S.goalExpression));a.el.style.setProperty('--tint',catalog[r.ids[0]-1].color);
 a.el.innerHTML=`<div class="stream-pearl"><small>THANK YOU</small><b>${esc(r.name)}</b><div class="stream-tags">${r.ids.map(id=>icon(id)).join('')}</div></div>`;
}

function drawStream(){
 const v=V.stream;if(!v?.canvas)return;const c=v.canvas.getContext('2d'),W=v.width,H=v.height,t=V.clock;c.clearRect(0,0,v.canvas.width,v.canvas.height);
 c.save();c.scale(v.canvas.width/W,v.canvas.height/H);
 const glow=c.createRadialGradient(W*.53,H*.6,0,W*.53,H*.6,360);glow.addColorStop(0,'#f9e2a545');glow.addColorStop(.55,'#f3d8a018');glow.addColorStop(1,'#ffedc000');c.fillStyle=glow;c.fillRect(0,0,W,H);
 // A few broken light currents reinforce the helix without drawing rigid rails.
 for(let j=0;j<4;j++){
  c.beginPath();for(let i=0;i<96;i++){const q=i/95,angle=q*TAU*1.12+t*.17+j*1.57,z=Math.sin(angle)*360-170,k=1000/(1000-z),x=W*.52+Math.cos(angle)*(220+j*13)*k,y=H+60-q*(H+120);i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=['#d7b55c19','#fff5d348','#d4b78919','#ffffff38'][j];c.lineWidth=j%2?1.4:.7;c.stroke();
 }
 for(let i=0;i<55;i++){const y=((i*71-t*(7+i%8))%(H+60)+H+60)%(H+60),a=i*2.4+t*.12,r=180+i%7*28,z=Math.sin(a)*300-180,k=900/(900-z),x=W*.52+Math.cos(a)*r*k;drawSpark(c,x,y,1.1+i%3*.6,.2+.2*Math.sin(i+t*.6)**2,'#d4b76f')}
 c.restore();
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
 const el=document.createElement('div');el.className='event-orb '+(group?'grouped':'');el.dataset.eventId=r.id;el.style.cssText=`left:0;top:0;width:${d}px;height:${d}px;opacity:0;--tint:${catalog[r.ids[0]-1].color}`;
 el.innerHTML=completeOrb(r,d,{event:true,group});$('event-items').append(el);bindNumbers(el);
 const b={el,r,d,x,y,index,trail:[],reading:null,screenX:x,screenY:y};b.reading=fitCircle(el,r,d,0);return b;
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
  x=tx;y=ty;z=-150*(1-q);scale=.68+.32*smooth((p-.24)/.62);alpha=smooth((p-.33)/.23);break;
 case 3: // A pearl drops through depth; two diminishing rebounds.
  if(p<.46){const s=p/.46;x=tx+170*(1-s);y=-670+1020*s*s;z=450*(1-s)}
  else{const s=(p-.46)/.54;x=tx;y=ty-Math.abs(Math.sin(s*Math.PI*2.1))*145*(1-s);z=100*Math.sin(s*Math.PI)*(1-s)}
  alpha=smooth(p/.13);break;
 case 4: // Loose corkscrew: wrap around the destination through depth.
  {const r=630*Math.pow(1-p,1.4),theta=-p*Math.PI*3.4;x=tx+Math.cos(theta)*r;y=ty+Math.sin(theta)*r*.48;z=-360*(1-p)+Math.sin(theta)*r*.85;alpha=smooth(p/.14)}break;
 case 5: // Bloom shell opens; pearl rises from the flower's center.
  x=tx+Math.sin(p*Math.PI)*35;y=ty+160*(1-q);z=-290*(1-q);scale=.16+.84*smooth(p/.76);alpha=smooth((p-.08)/.21);break;
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
  x=mix(906+(index%3-1)*150,tx,q);y=mix(80-index%2*160,ty,q);z=-1450*Math.pow(1-u,2.5)+Math.sin(Math.PI*u)*70;break;
 case 1:
  {const left=rank%2===0;x=curve(left?-350:2162,left?240:1572,tx+(left?170:-170),tx,q);y=curve(170+(rank%3)*125,-160+index*45,ty+75,ty,q);z=Math.sin(Math.PI*u)*340-350*(1-u)}break;
 case 2:
  {const angle=index*2.4+(1-q)*Math.PI*3,rad=(1-q)*570;x=mix(906,tx,q)+Math.cos(angle)*rad;y=mix(315,ty,q)+Math.sin(angle)*rad*.33;z=Math.sin(angle)*rad*.8-400*(1-q)}break;
 case 3:
  {const source=[300,906,1512][index%3];x=mix(source,tx,q);y=curve(940,-300,ty-130,ty,q);z=curve(-400,280,170,0,q);scale=.22+.78*q}break;
 case 4:
  {const source=[430,906,1382][index%3];x=mix(source,tx,q);y=mix(300,ty,q)+Math.sin(Math.PI*u)*(index<5?-65:65);z=-680*(1-q)+Math.sin(Math.PI*u)*190;scale=.15+.85*smooth(u/.65);alpha=smooth((u-.06)/.18)}break;
 }
 const k=1100/(1100-z)*scale;
 return{x:906+(x-906)*(1100/(1100-z)),y:307+(y-307)*(1100/(1100-z)),z,k,alpha};
}

function positionEvent(b,pos){
 b.el.style.transform=`translate(${(pos.x-b.d/2).toFixed(2)}px,${(pos.y-b.d/2).toFixed(2)}px) scale(${pos.k.toFixed(4)})`;
 b.el.style.opacity=clamp(pos.alpha,0,1);b.el.style.zIndex=String(600+Math.round(clamp(pos.z,-500,450)));
 b.screenX=pos.x;b.screenY=pos.y;b.scale=pos.k;b.opacity=pos.alpha;
}

function changeRate(value){playbackRate=clamp(+value,.25,6)}
function visualState(){
 return{clock:V.clock,scene:S.s,dwell:{...(S.dwell||DWELL)},actors:V.actors.map(a=>({id:a.id,x:a.screenX,y:a.screenY,d:a.d,scale:a.screenScale,opacity:a.opacity,vx:a.vx,vy:a.vy,life:a.life,readingPages:a.reading?.pages.length||1})),flowers:V.garden?.plants.length||0,gardenNext:V.next,fx:V.fx.length,orbit:V.planets.map(p=>({id:p.b.id,z:p.z,scale:p.scale,moons:p.moons.length})),stream:V.stream?.nodes.map(a=>({id:a.id,x:a.x,y:a.screenY,z:a.z,scale:a.scale,rise:a.rise,radius:a.radius,turn:a.turn}))||[],singleStyles:SINGLE_STYLES,groupStyles:GROUP_STYLES};
}
function stepRuntime(ms){
 if(!finiteNumber(ms)||ms<=0||S.mode!=='normal')return;
 const wasFrozen=frozen,wasControlled=S.clockControlled,wasPlaying=S.playing;frozen=false;S.playing=true;S.clockControlled=false;
 let remaining=Math.min(120000,ms)/1000;while(remaining>0){const dt=Math.min(.02,remaining);coordinator(dt);remaining-=dt}
 S.clockControlled=wasControlled;S.playing=wasPlaying;frozen=wasFrozen;applyStill();drawAtmosphere(0);drawSceneFX(0);if(V.garden)drawGarden();if(V.stream)drawStream();
}
function runtimeState(){return{version:COLOR_POLISH_VERSION,initialized,scene:S.s,sceneAge:S.sceneAge,clock:S.t,playing:S.playing,still:S.still,mode:S.mode,queueLength:S.queue.length,active:active?{kind:active.kind,phase:active.phase,style:active.style,hold:active.hold,page:active.page,ids:active.items.map(r=>r.id)}:null,transition:transition?{age:transition.age}:null,slots:slots.map(({el,...slot})=>slot),visual:visualState(),log:[...qaLog]}}
window.colorPolishRuntime={
 getState:runtimeState,
 visualState,
 setScene:id=>{if(S.mode==='normal')requestScene(sceneNumber(id),{force:true})},
 setPlaying:value=>{S.playing=value===true;S.still=S.motion==='still'||!S.playing;applyStill()},
 setClock:ms=>{if(finiteNumber(ms)&&ms>=0){S.t=ms/1000;S.clockControlled=true;updateHeader();tickNumbers()}},
 step:stepRuntime,
 clear:()=>{S=blankState();clearPresentation()},
 catalog:catalog.map(item=>({...item}))
};

init();
