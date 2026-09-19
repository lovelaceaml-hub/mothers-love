// Scene 11: Milestone and Weekly Goal.
'use strict';

function nextMilestone(){const n=sum(totals().month.expr);return Math.max(250,Math.ceil((n+1)/250)*250)}
function milestoneScene(){
 const g=goal(),e=catalog[g.id-1],T=totals(),next=nextMilestone();
 return `<div class="progress-sculpture"><div class="progress-rail"><div class="progress-goal"><div class="goal-head">THIS WEEK’S EXPRESSION GOAL</div><div class="week-range">${formatDayRange(S.week)} · SUN-SAT</div><div class="goal-name">${medallion(g.id)}<h3>${shimmer(e.name)}</h3><span class="goal-rank" id="goal-rank"></span></div><div class="goal-phrase">${esc(e.phrase)}</div><div class="goal-values"><span id="goal-status">Shared progress</span><b>${num('goal:value')} / ${num('goal:target')}</b></div><div class="progress-track"><div class="progress-fill" id="goal-fill" style="width:${clamp(g.ratio*100,0,100)}%"></div></div><div class="goal-caption">Gold-rimmed recognitions support this week’s goal.<br>Categories only · never a ranking of people.</div></div><div class="progress-milestone"><div class="eyebrow">${S.milestoneValue?'Milestone reached':'Growing campaign'}</div><div class="threshold">${num('milestone')}</div><h2>Expressions of<br>${shimmer('Mother’s Love')}</h2><div class="row"><span>Current <b>${num('month:expr')}</b></span><span>Next ${fmt(next)}</span></div><div class="progress-track"><div class="progress-fill" id="milestone-fill" style="width:${clamp(sum(T.month.expr)/next*100,0,100)}%"></div></div></div></div><div class="stream-world" id="tribute-stream"><canvas class="stream-canvas" id="stream-canvas" width="1162" height="622" aria-hidden="true"></canvas></div><div class="stream-caption">Individual acts. Shared progress.</div></div>`;
}

function formatDayRange(week){const start=new Date(week+'T12:00:00Z');const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);return `${start.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()} ${start.getUTCDate()}-${end.getUTCDate()}`}
function updateGoalDOM(){const g=goal();if($('goal-fill'))$('goal-fill').style.width=clamp(g.ratio*100,0,100)+'%';if($('goal-rank'))$('goal-rank').textContent=g.rank===null?'':`Now #${g.rank} → #4`;if($('goal-status'))$('goal-status').textContent=g.achieved?'Fourth-place level reached':'This week’s shared progress';if($('milestone-fill'))$('milestone-fill').style.width=clamp(sum(totals().month.expr)/nextMilestone()*100,0,100)+'%'}

function contributorPool(){
 return records();
}

function tributeContent(a,r){
 if(!r)return;
 markShown(r.id);
 a.id=r.id;a.el.dataset.tributeId=r.id;
 const goalId=S.goalExpression||goal().id;
 a.el.dataset.weekly=String(weekKey(r.createdAt)===S.week&&r.ids.includes(goalId));
 const hasGoal=r.ids.includes(goalId);
 const chosenId=hasGoal?goalId:r.ids[0];
 const chosenExpr=catalog[chosenId-1];
 a.el.style.setProperty('--tint',chosenExpr.color);
 a.el.innerHTML=`<div class="stream-pearl"><div class="stream-phrase">${esc(chosenExpr.phrase)}</div><b>${esc(r.name)}</b><div class="stream-tags">${r.ids.map(id=>icon(id)).join('')}</div></div>`;
}

// Plan 17 Lane 8 (Anthony on the church TV, September 19): "the swirling
// recognitions need to be fuller, with more bubbles". STREAM_TARGET pearls
// ride the swirl instead of 26, and they are spread across three radius
// bands so they fill the panel's width instead of crowding one column in
// the middle. STREAM_MAX_COPIES lets a small pool still fill the panel: a
// record may take more than one pearl at a time, in separate passes over
// the pool, so its copies sit far apart. With a pool of STREAM_TARGET or
// more records every pearl holds a different record, as before.
const STREAM_TARGET=52;
const STREAM_MAX_COPIES=3;
// Pearls enter STREAM_EDGE px below the panel and are recycled STREAM_EDGE px
// above it, so the travel every pearl shares is the panel plus both margins.
const STREAM_EDGE=180;
// Pearls and the light currents turn around the panel's centre line.
const STREAM_CENTRE=.5;
const STREAM_GOLDEN_ANGLE=TAU*.381966;
// Turning radius, 150 to 405 px. 405 is the widest radius at which a pearl's
// own drawn edge (its radius times the depth scale) plus its wobble still
// stays inside the panel's half width of 581 px at every angle and depth:
// the worst case measures 566 px from the centre line.
const STREAM_RADIUS_MIN=150;
const STREAM_RADIUS_MAX=405;

/**
 * How many pearls one record may hold at the same time: one whenever the
 * pool is at least as large as the swirl, and otherwise just enough passes
 * over the pool to fill `count` pearls, capped at STREAM_MAX_COPIES.
 */
function streamCopyCap(poolSize,count){
 if(poolSize<=0)return 1;
 return clamp(Math.ceil(count/poolSize),1,STREAM_MAX_COPIES);
}

/**
 * Picks the record for each pearl. The milestone contributors come first,
 * then repeated passes over the pool: a record is only reused once every
 * other record has been taken in this pass, so a repeated record's pearls
 * are a whole pass apart in the swirl.
 */
function streamAssignments(pool,count){
 const contribIds=Array.isArray(S.milestoneContributors)?S.milestoneContributors:[];
 const assigned=[];
 let pass=new Set();
 for(const cid of contribIds){
  if(assigned.length>=count)break;
  const r=pool.find(item=>item.id===cid);
  if(r&&!pass.has(r.id)){assigned.push(r);pass.add(r.id)}
 }
 while(assigned.length<count){
  if(pass.size>=pool.length)pass=new Set();
  let r=chooseRandom([...pass]);
  if(!r)r=pool.find(item=>!pass.has(item.id));
  if(!r)r=pool[assigned.length%pool.length];
  if(!r)break;
  assigned.push(r);
  pass.add(r.id);
 }
 return assigned;
}

function mountTributes(){
 const root=$('tribute-stream');if(!root)return;
 const pool=contributorPool();V.stream={el:root,width:root.clientWidth,height:root.clientHeight,nodes:[],icons:[],canvas:$('stream-canvas')};
 if(!pool.length){const p=document.createElement('p');p.className='subheading';p.style='padding:180px 90px';p.textContent='The milestone remains. No current personal recognitions are available to replay.';root.append(p);return}
 const N=Math.min(STREAM_TARGET,pool.length*STREAM_MAX_COPIES),rng=randSeed(189391);
 const assignedRecords=streamAssignments(pool,N);
 const span=V.stream.height+STREAM_EDGE*2;

 for(let i=0;i<assignedRecords.length;i++){
  const r=assignedRecords[i],el=document.createElement('div');el.className='stream-node';root.append(el);
  // Even phases (the golden angle, plus a little jitter) instead of random
  // ones: twice as many pearls drawn from a random phase clumped into one
  // crowd in the middle of the panel and left both sides of it empty. The
  // radius is drawn from the square root of a flat number so the pearls
  // spread evenly over the whole turning area: a flat radius would put the
  // same count in the small middle ring as in the wide outer one, which is
  // what left the sides of the panel bare.
  const spread=Math.sqrt(STREAM_RADIUS_MIN*STREAM_RADIUS_MIN+rng()*(STREAM_RADIUS_MAX*STREAM_RADIUS_MAX-STREAM_RADIUS_MIN*STREAM_RADIUS_MIN));
  const a={el,id:r.id,y:span*(i+.5)/assignedRecords.length-STREAM_EDGE,phase:(i*STREAM_GOLDEN_ANGLE+rng()*.45)%TAU,radius:spread,rise:16+rng()*28,turn:.13+rng()*.15,depth:360+rng()*160,offset:-110-rng()*65,wobble:rng()*TAU,rng,cycles:0};tributeContent(a,r);V.stream.nodes.push(a);
 }
 for(let i=0;i<14;i++){const el=document.createElement('img');el.className='stream-icon';el.src=ASSETS['icon'+(1+i%9)];el.alt='';root.append(el);V.stream.icons.push({el,y:740*(i/14),phase:rng()*TAU,radius:240+rng()*145,rise:14+rng()*20,turn:.15+rng()*.16})}
}

// Plan 17, decision 6: a pearl stays fully opaque while it is inside the
// panel and fades out only over a short band as its own drawn edge (half
// size STREAM_PEARL_HALF px times its depth scale k) meets the panel's top or bottom
// edge, reaching fully transparent before any of it crosses. Depth is shown
// by blur and an opaque tone shift instead of transparency, so no pearl ever
// lets the words of another pearl show through it.
// 118 (pearls 236 px, up from 216): every catalog phrase, name and icon row
// keeps max(3 percent, 12 px) inside the rim (Plan 17 rim rule).
const STREAM_PEARL_HALF = 118;
const STREAM_FADE_BAND = 40;
function tickTributes(dt){
 if(S.s!==11||!V.stream||active||transition||(S.still&&dt>0))return;
 const v=V.stream,t=V.clock,W=v.width,H=v.height;
 for(const a of v.nodes){
  a.y-=dt*a.rise;
  if(a.y< -STREAM_EDGE){
   a.y=H+STREAM_EDGE;
   a.cycles++;
   const cap=streamCopyCap(records().length,v.nodes.length);
   const counts=new Map();
   for(const x of v.nodes)if(x!==a)counts.set(x.id,(counts.get(x.id)||0)+1);
   // A record only comes back while fewer than `cap` of the other pearls
   // already carry it, so the swirl never doubles a record beyond the
   // number of passes the pool actually needs.
   const full=[...counts].filter(entry=>entry[1]>=cap).map(entry=>entry[0]);
   const nextRecord=chooseRandom(full)||chooseRandom([]);
   if(nextRecord)tributeContent(a,nextRecord);
  }
  const angle=a.phase+t*a.turn+Math.sin(t*.13+a.wobble)*.17,z=Math.sin(angle)*a.depth+a.offset,k=1000/(1000-z);
  const x=W*STREAM_CENTRE+Math.cos(angle)*a.radius*k+Math.sin(t*.23+a.wobble)*12,y=a.y-(k-.75)*27;
  const half=STREAM_PEARL_HALF*k;
  const opacity=smooth((y-half)/STREAM_FADE_BAND)*smooth((H-y-half)/STREAM_FADE_BAND);
  const depthTone=z< -220?Math.max(.45,.45+.35*(z+630)/410):1;
  a.el.style.transform=`translate(${x-STREAM_PEARL_HALF}px,${y-STREAM_PEARL_HALF}px) scale(${k})`;a.el.style.opacity=clamp(opacity,0,1);a.el.style.zIndex=String(1000+Math.round(z));
  // With twice as many pearls the filter string is the costly part of the
  // frame, so it is only rewritten when the depth it draws actually
  // changes: blur to a fortieth of a px and the tone to a thousandth.
  const filter=`blur(${Math.min(2,Math.max(0,(-z-120)/260)).toFixed(2)}px) contrast(${(.55+.45*depthTone).toFixed(3)}) brightness(${(1+.3*(1-depthTone)).toFixed(3)}) drop-shadow(${(-7*k).toFixed(1)}px ${(13*k).toFixed(1)}px ${(12*k).toFixed(1)}px #99846925)`;
  if(a.filter!==filter){a.filter=filter;a.el.style.filter=filter}
  a.x=x;a.z=z;a.scale=k;a.screenY=y;
 }
 for(const a of v.icons){a.y-=dt*a.rise;if(a.y< -80)a.y=H+80;const angle=a.phase+t*a.turn,z=Math.sin(angle)*370-120,k=950/(950-z),x=W*STREAM_CENTRE+Math.cos(angle)*a.radius*k;a.el.style.transform=`translate(${x}px,${a.y}px) scale(${k}) rotate(${Math.sin(t*.33+a.phase)*17}deg)`;a.el.style.opacity=.72*smooth((a.y+45)/80)*smooth((H+40-a.y)/80);a.el.style.zIndex=String(1000+Math.round(z));}
 drawStream();
}

function drawStream(){
 const v=V.stream;if(!v?.canvas)return;const c=v.canvas.getContext('2d'),W=v.width,H=v.height,t=V.clock;c.clearRect(0,0,v.canvas.width,v.canvas.height);
 c.save();c.scale(v.canvas.width/W,v.canvas.height/H);
 const glow=c.createRadialGradient(W*STREAM_CENTRE,H*.6,0,W*STREAM_CENTRE,H*.6,420);glow.addColorStop(0,'#f9e2a545');glow.addColorStop(.55,'#f3d8a018');glow.addColorStop(1,'#ffedc000');c.fillStyle=glow;c.fillRect(0,0,W,H);
 // A few broken light currents reinforce the helix without drawing rigid rails.
 for(let j=0;j<4;j++){
  c.beginPath();for(let i=0;i<96;i++){const q=i/95,angle=q*TAU*1.12+t*.17+j*1.57,z=Math.sin(angle)*360-170,k=1000/(1000-z),x=W*STREAM_CENTRE+Math.cos(angle)*(235+j*22)*k,y=H+60-q*(H+120);i?c.lineTo(x,y):c.moveTo(x,y)}c.strokeStyle=['#d7b55c19','#fff5d348','#d4b78919','#ffffff38'][j];c.lineWidth=j%2?1.4:.7;c.stroke();
 }
 for(let i=0;i<55;i++){const y=((i*71-t*(7+i%8))%(H+60)+H+60)%(H+60),a=i*2.4+t*.12,r=190+i%7*34,z=Math.sin(a)*300-180,k=900/(900-z),x=W*STREAM_CENTRE+Math.cos(a)*r*k;drawSpark(c,x,y,1.1+i%3*.6,.2+.2*Math.sin(i+t*.6)**2,'#d4b76f')}
 c.restore();
}

function milestoneSetContributors(ids){
 S.milestoneContributors=Array.isArray(ids)?[...ids]:[];
}

function milestoneGetShownCount(id){
 return S.shownCount.get(id)||0;
}

if(typeof window!=='undefined'){
 window.milestoneSetContributors=milestoneSetContributors;
 window.milestoneGetShownCount=milestoneGetShownCount;
}

registerScene(11,{
 markup:milestoneScene,
 mount(root){
  mountTributes();
  updateGoalDOM();
 },
 prime:tickTributes,
 onLeave(root){
  V.stream=null;
 },
 archOpacity:'.13'
});
