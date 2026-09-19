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
// ride the swirl instead of 26. Lane 8 review: 52 pearls that all take the
// full turn pile up in the middle of the panel, because every pearl is at
// its largest exactly where it crosses the centre line, and the words of the
// near pearls sat more than half covered. So the swirl has two layers.
// Reading pearls (STREAM_FRONT_SHARE of them) take the full turn as one
// even helix: the same rise and turn, a golden angle apart, so the pearls
// that are near at the same moment are spread across the panel instead of
// stacked, and their words draw at 18 px or more whenever they are on the
// near half (depth 0 or more, scale 1 or more). Depth pearls stay behind
// them the whole way round, small and soft, and fill the panel out to its
// sides; they can never cover a reading pearl on its near half.
const STREAM_TARGET=52;
const STREAM_FRONT_SHARE=24/52;
// A record may hold two pearls when the pool is smaller than the swirl, and
// three only when the pool is tiny.
const STREAM_MAX_COPIES=3;
const STREAM_TINY_POOL=3;
// Two pearls of one layer only share a record when no other record is left.
const STREAM_SAME_LAYER=10000;
// Pearls enter STREAM_EDGE px below the panel and are recycled STREAM_EDGE px
// above it, so the travel every pearl shares is the panel plus both margins.
const STREAM_EDGE=180;
// Pearls and the light currents turn around the panel's centre line.
const STREAM_CENTRE=.5;
const STREAM_GOLDEN_ANGLE=TAU*.381966;
// Reading pearls: depth swings 300 to 340 either side of 0, so the scale
// runs from about .75 to 1.51 and is 1 or more on the whole near half.
// Radius 330 to 360 px keeps the widest drawn edge 58 px inside the panel.
// Depth pearls: depth -620 to -150 (scale .62 to .87, words 11.1 to 15.7 px,
// never below the 10.7 px the far pearls drew before this lane), radius 150
// to 520 px, drawn from the square root of a flat number so they spread
// evenly over the turning area.
const STREAM_BACK_RADIUS_MIN=150;
const STREAM_BACK_RADIUS_MAX=520;

/** How many pearls one record may hold at the same time. */
function streamCopyCap(poolSize,count){
 if(poolSize<=0)return 1;
 return clamp(Math.ceil(count/poolSize),1,poolSize<=STREAM_TINY_POOL?STREAM_MAX_COPIES:2);
}

function streamCount(poolSize){
 return Math.min(STREAM_TARGET,poolSize*(poolSize<=STREAM_TINY_POOL?STREAM_MAX_COPIES:2));
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

/**
 * How far apart in height pearl `a` would be from the nearest pearl already
 * holding a record, measured round the loop (a pearl leaving the top comes
 * back in at the bottom). Every pearl rises at nearly the same speed, so
 * this distance holds while both pearls cross the panel. A holder in the
 * pearl's own layer counts as no distance at all.
 */
function streamGap(a,holders,span){
 return Math.min(...holders.map(h=>{const d=Math.abs(h.y-a.y)%span;return Math.min(d,span-d)-(h.front===a.front?STREAM_SAME_LAYER:0)}));
}

/**
 * The record for pearl `a` when every record is already on screen: the one
 * under its copy cap whose nearest holder is furthest away in height, and
 * never one the pearl's own layer holds while another choice exists. So two
 * copies of a record are never side by side, and two reading pearls never
 * carry the same record unless the pool is smaller than the reading layer.
 */
function streamRepeat(a,others,pool,span,total){
 const cap=streamCopyCap(pool.length,total);
 let best,bestGap=-Infinity;
 for(const r of pool){
  const holders=others.filter(x=>x.id===r.id);
  if(holders.length>=cap)continue;
  const gap=holders.length?streamGap(a,holders,span):span;
  if(gap>bestGap){bestGap=gap;best=r}
 }
 return best;
}

/** The record for a pearl re-entering at the bottom: one nobody holds, else a repeat. */
function streamNextRecord(a,nodes,span){
 const pool=records();if(!pool.length)return undefined;
 const others=nodes.filter(x=>x!==a);
 return chooseRandom(others.map(x=>x.id))||streamRepeat(a,others,pool,span,nodes.length)||chooseRandom([]);
}

/**
 * Gives every mounted pearl its record. Reading pearls take the first
 * records (the milestone contributors). Depth pearls that must repeat a
 * record are matched to the reading pearl furthest from them in height,
 * widest gaps first; the rest take the records nobody holds yet.
 */
function streamSpreadCopies(nodes,assigned,span){
 const pool=[...new Map(assigned.map(r=>[r.id,r])).values()];
 const fresh=[...pool],placed=[];
 const give=(a,r)=>{tributeContent(a,r);placed.push(a);const i=fresh.indexOf(r);if(i>=0)fresh.splice(i,1)};
 const front=nodes.filter(a=>a.front),back=nodes.filter(a=>!a.front);
 for(const a of front)give(a,fresh[0]||streamRepeat(a,placed,pool,span,nodes.length)||assigned[0]);
 const pairs=[];
 for(const a of back)for(const h of front)pairs.push({a,h,gap:streamGap(a,[h],span)});
 pairs.sort((x,y)=>y.gap-x.gap);
 let repeats=Math.max(0,back.length-fresh.length);
 const used=new Set();
 for(const {a,h} of pairs){
  if(!repeats)break;
  if(placed.includes(a)||used.has(h.id))continue;
  if(placed.filter(x=>x.id===h.id).length>=streamCopyCap(pool.length,nodes.length))continue;
  used.add(h.id);give(a,pool.find(r=>r.id===h.id));repeats--;
 }
 for(const a of back)if(!placed.includes(a))give(a,fresh[0]||streamRepeat(a,placed,pool,span,nodes.length)||assigned[0]);
}

function mountTributes(){
 const root=$('tribute-stream');if(!root)return;
 const pool=contributorPool();V.stream={el:root,width:root.clientWidth,height:root.clientHeight,nodes:[],icons:[],canvas:$('stream-canvas')};
 if(!pool.length){const p=document.createElement('p');p.className='subheading';p.style='padding:180px 90px';p.textContent='The milestone remains. No current personal recognitions are available to replay.';root.append(p);return}
 const N=streamCount(pool.length),rng=randSeed(189391);
 const assignedRecords=streamAssignments(pool,N);
 const total=assignedRecords.length,backCount=Math.min(total-Math.round(total*STREAM_FRONT_SHARE),pool.length),frontCount=total-backCount;
 const span=V.stream.height+STREAM_EDGE*2;

 // Reading pearls take the first records (the milestone contributors), so
 // while the pool is at least as large as the reading layer every reading
 // pearl starts on a different record.
 for(let i=0;i<total;i++){
  const el=document.createElement('div');el.className='stream-node';root.append(el);
  const front=i<frontCount,j=front?i:i-frontCount;
  el.dataset.layer=front?'front':'back';
  const a=front
   ?{el,front,id:'',y:span*(j+.5)/frontCount-STREAM_EDGE,phase:(j*STREAM_GOLDEN_ANGLE+rng()*.2)%TAU,radius:330+rng()*30,rise:23+rng()*1.5,turn:.2+rng()*.01,depth:300+rng()*40,offset:0,sway:.1,wobble:rng()*TAU,rng,cycles:0}
   :{el,front,id:'',y:span*(j+.5)/backCount-STREAM_EDGE,phase:(j*STREAM_GOLDEN_ANGLE+rng()*.45)%TAU,radius:Math.sqrt(STREAM_BACK_RADIUS_MIN*STREAM_BACK_RADIUS_MIN+rng()*(STREAM_BACK_RADIUS_MAX*STREAM_BACK_RADIUS_MAX-STREAM_BACK_RADIUS_MIN*STREAM_BACK_RADIUS_MIN)),rise:23+rng()*1.5,turn:.13+rng()*.15,depth:200+rng()*35,offset:-385,sway:.17,wobble:rng()*TAU,rng,cycles:0};
  V.stream.nodes.push(a);
 }
 streamSpreadCopies(V.stream.nodes,assignedRecords,span);
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
   const nextRecord=streamNextRecord(a,v.nodes,H+STREAM_EDGE*2);
   if(nextRecord)tributeContent(a,nextRecord);
  }
  const angle=a.phase+t*a.turn+Math.sin(t*.13+a.wobble)*a.sway,z=Math.sin(angle)*a.depth+a.offset,k=1000/(1000-z);
  const x=W*STREAM_CENTRE+Math.cos(angle)*a.radius*k+Math.sin(t*.23+a.wobble)*12,y=a.y-(k-.75)*27;
  const half=STREAM_PEARL_HALF*k;
  const opacity=smooth((y-half)/STREAM_FADE_BAND)*smooth((H-y-half)/STREAM_FADE_BAND);
  const depthTone=z< -220?Math.max(.45,.45+.35*(z+630)/410):1;
  a.el.style.transform=`translate(${x-STREAM_PEARL_HALF}px,${y-STREAM_PEARL_HALF}px) scale(${k})`;a.el.style.opacity=clamp(opacity,0,1);a.el.style.zIndex=String(1000+Math.round(z));
  // Frame cost (Lane 8 review). More than half of the pearls are outside the
  // panel and fully faded at any moment: those are hidden outright so the
  // browser paints and filters nothing for them. For every pearl the filter is
  // stepped (blur to a quarter px, tone to a twentieth, shadow to a tenth of
  // the scale) and only written when the stepped value changes, which is a
  // few times a second per pearl instead of every frame.
  const shown=opacity>0;
  if(a.shown!==shown){a.shown=shown;a.el.style.visibility=shown?'visible':'hidden'}
  {
   const blur=Math.round(Math.min(2,Math.max(0,(-z-120)/260))*4)/4,tone=Math.round(depthTone*20)/20;
   const filter=`${blur?`blur(${blur}px) `:''}${tone<1?`contrast(${(.55+.45*tone).toFixed(3)}) brightness(${(1+.3*(1-tone)).toFixed(3)})`:''}`||'none';
   if(a.filter!==filter){a.filter=filter;a.el.style.filter=filter}
  }
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
