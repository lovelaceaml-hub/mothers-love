// Core state, catalog constants, and normalization helpers.
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
const DWELL={1:60,2:180,3:30,4:60,5:60,6:60,7:60,8:60,9:60,10:60,11:60};
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
const blankState=()=>({t:0,s:1,sceneAge:0,eduAge:0,bloomIndex:1,bloomNext:1,featured:2,mode:'offline',still:true,playing:false,clockControlled:true,pool:[],queue:[],seen:new Set(),arrivalIds:new Set(),days:{},currentWeek:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},previousWeek:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},month:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},campaign:{...EMPTY_AGGREGATE,expr:[...EMPTY_AGGREGATE.expr]},goal:{id:1,value:0,target:1,rank:null,ratio:0,week:'',referenceFourth:0,achieved:false},playlist:[{id:1,duration:DWELL[1]}],dwell:{...DWELL},pauseRotation:false,sceneControlled:false,idCounter:0,lastShown:new Map(),shownCount:new Map(),randomDrawCounter:0,forceId:null,replenishAt:10,slotCounter:0,selectedDay:1,singleStyle:0,groupStyle:0,groupNumber:0,singleBag:[],groupBag:[],singleBagLast:null,groupBagLast:null,speechBag:[],speechLast:null,feedArrivalCounter:0,returnScene:null,returnAge:0,pendingScene:null,chain:false,countJobs:new Map(),lowSince:0,lowAutomatic:false,week:'',goalExpression:1,milestoneValue:0,milestonePending:null,milestoneContributors:[],milestonesSeen:new Set(),privacyAt:0,shimmerUntil:0,lastHeader:-1,snapshotRevision:null,source:'live',qrDataUrl:null,nowMs:0,replayKey:null,queueStart:0,motion:'standard'});
let S=blankState(), active=null, transition=null, slots=[], sceneRoot=null, eduCards=[], numberNodes=[], numCache=new Map(), feedLanes=[], particles=[], heartRenderer=null, hearts=[], tributes=[], lastFrame=0, frozen=false, parentPort=null, parentOrigin='', expectedSequence=0, bootstrapNonce='', initialized=false, reducedMotionPreferred=false, lastManualAdvanceAt=-Infinity;
function motionStill(motion,forced){return forced||motion==='still'||(reducedMotionPreferred&&motion!=='lively')}
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
 next.still=motionStill(next.motion,control.playing===false);
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
function markShown(id){
 if(!id)return;
 S.shownCount.set(id,(S.shownCount.get(id)||0)+1);
}
function choose(exclude=[],expressionId=null){const p=records().filter(r=>!exclude.includes(r.id)&&(!expressionId||r.ids.includes(expressionId)));p.sort((a,b)=>(S.lastShown.get(a.id)??-10000)-(S.lastShown.get(b.id)??-10000)||b.createdAt-a.createdAt||a.id.localeCompare(b.id));return p[0]}
function chooseRandom(exclude=[],expressionId=null){
 const pool=records().filter(r=>!exclude.includes(r.id)&&(!expressionId||r.ids.includes(expressionId)));
 if(!pool.length)return undefined;
 const stable=pool.map(r=>r.id).join(',');
 const draw=S.randomDrawCounter||0;
 S.randomDrawCounter=draw+1;
 const salt=Math.floor(S.t);
 const seed=((hashText(stable)^salt^Math.imul(draw,0x9e3779b9))>>>0)||1;
 const rng=randSeed(seed);
 let total=0;
 for(const r of pool)total+=1/(1+(S.shownCount.get(r.id)??0));
 let roll=rng()*total;
 for(const r of pool){
  const w=1/(1+(S.shownCount.get(r.id)??0));
  if(roll<w)return r;
  roll-=w;
 }
 return pool[pool.length-1];
}
function recordsChanged(previous,next){if(previous.length!==next.length)return true;const before=new Map(previous.map(r=>[r.id,r]));return next.some(r=>{const old=before.get(r.id);return !old||old.name!==r.name||old.message!==r.message||old.expiresAt!==r.expiresAt||old.ids.join(',')!==r.ids.join(',')})}
function captureMilestone(threshold){S.milestoneValue=Math.max(0,Math.floor(Number(threshold)||0));S.milestoneContributors=[];}
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
