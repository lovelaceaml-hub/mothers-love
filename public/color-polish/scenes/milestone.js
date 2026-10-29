// Scene 11: Milestone and Weekly Goal.
'use strict';

function nextMilestone(){const n=sum(totals().month.expr);return Math.max(250,Math.ceil((n+1)/250)*250)}
function milestoneScene(){
 const g=goal(),e=catalog[g.id-1],T=totals(),next=nextMilestone();
 return `<div class="progress-sculpture"><div class="progress-rail"><div class="progress-goal"><div class="goal-head">THIS WEEK’S EXPRESSION GOAL</div><div class="week-range">${formatDayRange(S.week)} · SUN-SAT</div><div class="goal-name">${medallion(g.id)}<h3>${shimmer(e.name)}</h3><span class="goal-rank" id="goal-rank"></span></div><div class="goal-phrase">${esc(e.phrase)}</div><div class="goal-values"><span id="goal-status">Shared progress</span><b>${num('goal:value')} / ${num('goal:target')}</b></div><div class="progress-track"><div class="progress-fill" id="goal-fill" style="width:${clamp(g.ratio*100,0,100)}%"></div></div></div><div class="progress-milestone"><div class="eyebrow">${S.milestoneValue?'Milestone reached':'Growing campaign'}</div><div class="threshold" id="milestone-threshold"${S.milestoneValue?'':' hidden'}>${num('milestone')}</div><h2>Expressions of<br>${shimmer('Mother’s Love')}</h2><div class="row"><span>Current <b>${num('month:expr')}</b></span><span>Next ${fmt(next)}</span></div><div class="progress-track"><div class="progress-fill" id="milestone-fill" style="width:${clamp(sum(T.month.expr)/next*100,0,100)}%"></div></div></div></div><div class="stream-world" id="tribute-stream"><canvas class="stream-canvas" id="stream-canvas" width="1162" height="622" aria-hidden="true"></canvas></div></div>`;
}

function formatDayRange(week){const start=new Date(week+'T12:00:00Z');const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);return `${start.toLocaleString('en-US',{month:'short',timeZone:'UTC'}).toUpperCase()} ${start.getUTCDate()}-${end.getUTCDate()}`}
function updateGoalDOM(){const g=goal();if($('goal-fill'))$('goal-fill').style.width=clamp(g.ratio*100,0,100)+'%';if($('goal-rank'))$('goal-rank').textContent=g.rank===null?'':`Now #${g.rank} → #4`;if($('goal-status'))$('goal-status').textContent=g.achieved?'Fourth-place level reached':'This week’s shared progress';if($('milestone-fill'))$('milestone-fill').style.width=clamp(sum(totals().month.expr)/nextMilestone()*100,0,100)+'%';
 // Plan 17 Lane H (Anthony on the church TV): a bare 0 must never show as the
 // milestone number. The number lives in the shared numCache keyed by the
 // string 'milestone' (state.js num()/bindNumbers()/tickNumbers()), which
 // keeps counting and writing textContent every frame for as long as the
 // node stays in the document, remount or not. A snapshot can flip
 // S.milestoneValue between 0 and a reached threshold while scene 11 stays
 // mounted (host.js applySnapshotPayload takes the refreshNumbers()-only
 // path, no remount, whenever the scene and the record list are unchanged),
 // so the element itself must never be left out of the markup: only removing
 // it after the fact could race a value update and either throw on a
 // missing node or leave a stale number. Keeping the node and toggling
 // native `hidden` here, on every refresh, is what stays correct across
 // that race: the counted value keeps living in the cache and DOM whether
 // or not it is currently shown.
 if($('milestone-threshold'))$('milestone-threshold').hidden=!S.milestoneValue;
}

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
 // A pearl is the same bubble as every other screen's, with the whole
 // message (Anthony, October 25, 2026). It grows until all of it fits, up to
 // STREAM_PEARL_MAX; past that a long message keeps every word in smaller
 // type (Anthony, October 29: smaller bubbles, a smooth swirl).
 const {d,font}=streamPearlDiameter(r,goalId);
 a.d=d;a.el.style.width=a.el.style.height=d+'px';a.el.style.setProperty('--bubble',bubbleHue(r.id));
 a.el.innerHTML=`<div class="orb-life">${completeOrb(r,d,{focus:goalId})}</div>`;
 if(font)a.el.querySelector('.message').style.fontSize=font+'px';
 bindNumbers(a.el);
 if(V.stream&&a.baseRadius!==undefined)a.radius=Math.max(0,Math.min(a.baseRadius,streamWidestRadius(V.stream.width,a.size*a.shrink,a.depth,a.offset,d/2)));
}

// The smallest pearl diameter, in steps of 8 px from the base pearl, at which
// the whole recognition fits: words inside the content limit and every chip
// inside the rim, at the pearl's fixed type sizes. Measured once per record
// in a hidden pearl inside the stream, so it carries the scene's own styles.
// A message too long even for the largest pearl keeps every word and sets
// its type smaller instead, never cut.
const STREAM_PEARL_MAX=360;
const streamDiameterCache=new Map();
function streamPearlDiameter(r,goalId){
 const key=r.id+'|'+r.message.length+'|'+r.name.length+'|'+shownIds(r.ids,goalId).join(',');
 if(streamDiameterCache.has(key))return streamDiameterCache.get(key);
 const host=V.stream?.el||$('tribute-stream');if(!host)return {d:STREAM_PEARL_HALF*2,font:0};
 const probe=document.createElement('div');probe.className='stream-node';probe.setAttribute('aria-hidden','true');
 probe.style.cssText='transform:none;visibility:hidden;pointer-events:none;left:-9000px';
 probe.innerHTML=`<div class="orb-life">${completeOrb(r,STREAM_PEARL_HALF*2,{focus:goalId})}</div>`;
 host.append(probe);
 const content=probe.querySelector('.orb-content'),chipBox=probe.querySelector('.chips'),msg=probe.querySelector('.message');
 // Every line keeps max(3 percent, 12 px) inside the rim (Plan 17 rim rule).
 const linesInside=d=>{const box=probe.getBoundingClientRect(),s=box.width/d,cx=box.left+box.width/2,cy=box.top+box.height/2,limit=(d/2-Math.max(.03*d,12)-1)*s;
  const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
  for(let n=walker.nextNode();n;n=walker.nextNode()){if(!n.nodeValue.trim())continue;const range=document.createRange();range.selectNodeContents(n);
   for(const r of range.getClientRects())if(Math.hypot(Math.max(Math.abs(r.left-cx),Math.abs(r.right-cx)),Math.max(Math.abs(r.top-cy),Math.abs(r.bottom-cy)))>limit)return false}
  return true};
 const fits=d=>{probe.style.width=probe.style.height=d+'px';return content.scrollHeight<=d*.86&&chipsInsideCircle(content,chipBox,d)&&linesInside(d)};
 let lo=STREAM_PEARL_HALF*2,hi=STREAM_PEARL_MAX,font=0;
 if(fits(lo))hi=lo;
 else if(!fits(hi)){font=parseFloat(getComputedStyle(msg).fontSize);while(!fits(hi)&&font>8){font-=.5;msg.style.fontSize=font+'px'}lo=hi}
 else while(hi-lo>8){const mid=Math.round((lo+hi)/16)*8;fits(mid)?hi=mid:lo=mid}
 const result={d:hi,font};
 probe.remove();streamDiameterCache.set(key,result);
 return result;
}

// Plan 17 Lane 8 (Anthony on the church TV, September 19): "the swirling
// recognitions need to be fuller, with more bubbles". Lane 8 review: pearls
// that all take the full turn pile up in the middle of the panel, so the
// swirl has two layers. Reading pearls (STREAM_FRONT_SHARE of them) take the
// full turn and come to the front, where their words draw at 18 px or more.
// Depth pearls stay behind them the whole way round and can never cover a
// reading pearl on its near half.
//
// Second watch (Anthony, September 19): "The vortex needs to have more
// variety of bubble sizes. The vortex needs to be very dynamic. Beautiful
// architecture." So the swirl is now a true vortex instead of a cylinder:
//  - Funnel. The turning radius is narrow at the foot of the panel and flares
//    toward its top (STREAM_WAIST), and a slow wave travels up it so the whole
//    funnel breathes. Its spine sways, most at the foot, like a waterspout.
//  - Speed. A pearl turns fastest in the narrow foot and eases as the funnel
//    opens (STREAM_SPIN), and pearls rise at their own pace: small ones are
//    light and quick, large ones slow and stately.
//  - Sizes. Four kinds of bubble, large to tiny. Reading pearls have their
//    own size (a.size) from 1 to 1.25 of the base pearl and bloom from
//    STREAM_BLOOM_MIN of it as they climb out of the foot. Depth pearls run
//    from .68 to 1.15, on top of the depth scale, so the far ones are small
//    and soft. Glass bubbles of 56 to 112 px carry the expression icons that
//    used to float bare, and empty foam bubbles of 10 to 60 px fill the
//    funnel out to its sides.
//  - Architecture. The canvas draws the funnel itself: a soft column of light,
//    rising tilted rings, five ribbons of light wound round it (brighter where
//    they pass in front) and sparks that spin faster toward the foot.
// The pearl's layout box never changes (236 px, words 18 px), only its drawn
// scale, so every phrase, name and icon row keeps its place inside the rim at
// every size.
// 30 pearls, 12 reading and 18 depth (from 60, Anthony, October 29, 2026):
// each carries a whole recognition now, and 60 crowded the panel and made
// the church TV stutter.
const STREAM_TARGET=30;
const STREAM_SHRINK_MIN=.6;
const STREAM_SHRINK_MAX=.75;
const STREAM_FRONT_SHARE=12/30;
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
// The funnel: STREAM_WAIST of the full radius at the foot, the full radius at
// the top, a breathing wave of STREAM_BREATH either side, a spine that sways
// up to STREAM_SWAY px, and orbits tilted toward the viewer so the far side
// of a turn sits STREAM_TILT of the radius higher than the near side.
// .55 (from .62): with fewer, larger pearls the foot narrows a little more,
// so the funnel still reads.
const STREAM_WAIST=.55;
// Reading pearls ride a gentler funnel, so the pearls that are near together
// stay spread across the panel at its foot and keep their words clear.
const STREAM_READING_WAIST=.86;
const STREAM_BREATH=.04;
const STREAM_SWAY=22;
const STREAM_TILT=.1;
const STREAM_SPIN=1.3;
const STREAM_BLOOM_MIN=.85;
// No pearl's words ever draw below 11 px (.63 of 18 is 11.3), and no pearl
// draws larger than 1.55 of the base pearl (366 px in the 622 px panel).
const STREAM_MIN_DRAWN=.63;
const STREAM_MAX_DRAWN=1.55;
// Clear room kept between a pearl's drawn edge and the panel's sides.
const STREAM_SIDE_MARGIN=6;
// The funnel's background, kept calm for phones and tablets (Anthony,
// October 29, 2026): rising rings, ribbons of light and sparks, from 6, 5
// and 64.
const STREAM_RINGS=4;
const STREAM_RIBBONS=3;
const STREAM_SPARKS=24;
// 8 icon bubbles, then the empty foam (24 in all, from 46).
const STREAM_ICON_BUBBLES=8;
const STREAM_FOAM=24;

/**
 * How much smaller pearl `j` of `count` draws (Anthony, October 29, 2026:
 * "a mixture of 40% to 25%, dynamic"): .6 to .75 of its size, dealt evenly
 * and shuffled along the helix so neighbours differ. Its whole message is
 * laid out at the base type size and drawn smaller with the pearl.
 */
function streamShrink(j,count){return STREAM_SHRINK_MIN+(STREAM_SHRINK_MAX-STREAM_SHRINK_MIN)*(((j*5)%count+.5)/count)}

/** How many pearls one record may hold at the same time. */
function streamCopyCap(poolSize,count){
 if(poolSize<=0)return 1;
 return clamp(Math.ceil(count/poolSize),1,poolSize<=STREAM_TINY_POOL?STREAM_MAX_COPIES:2);
}

function streamCount(poolSize){
 return Math.min(STREAM_TARGET,poolSize*(poolSize<=STREAM_TINY_POOL?STREAM_MAX_COPIES:2));
}

/** How far up the panel a height is: 0 at the foot, 1 at the top. */
function streamLift(y,H){return clamp(1-y/H,0,1)}
/** The funnel's share of the full radius at lift `u`, breathing with time. */
function streamFunnel(u,t,waist=STREAM_WAIST){return (waist+(1-waist)*Math.pow(u,.85))*(1+STREAM_BREATH*Math.sin(t*.23+u*2.2))}
/** Where the funnel's spine stands at height `y`: it sways most at the foot. */
function streamAxis(y,t,W,H){return W*STREAM_CENTRE+Math.sin(t*.17+y*.0035)*STREAM_SWAY*(.4+.6*clamp(y/H,0,1))}
/** A pearl's size as it climbs out of the foot: STREAM_BLOOM_MIN at the foot, whole from 35 percent up. */
function streamBloom(u){return STREAM_BLOOM_MIN+(1-STREAM_BLOOM_MIN)*smooth(u/.35)}

/**
 * The widest turning radius that keeps a pearl of this size and depth swing
 * inside the panel's sides at every angle of its turn, with the funnel fully
 * open, the breathing wave at its crest and the spine at its furthest sway.
 */
function streamWidestRadius(W,size,depth,offset,half=STREAM_PEARL_HALF){
 const room=W/2-STREAM_SIDE_MARGIN-12-STREAM_SWAY;
 let widest=Infinity;
 for(let i=0;i<96;i++){
  const angle=i/96*TAU,k=1000/(1000-(Math.sin(angle)*depth+offset)),reach=Math.abs(Math.cos(angle))*(1+STREAM_BREATH);
  if(reach>.02)widest=Math.min(widest,(room/k-half*size)/reach);
 }
 return widest;
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
 * back in at the bottom). A pearl that repeats a record rises in step with
 * that record's other pearl (streamGive), so this distance holds while both
 * cross the panel. A holder in the pearl's own layer counts as no distance
 * at all.
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

/**
 * Hands pearl `a` its record. Pearls rise at their own pace, so a pearl that
 * repeats a record another pearl holds takes that pearl's pace for this
 * crossing: the two stay the same height apart and never drift together. A
 * pearl alone on its record goes back to its own pace.
 */
function streamGive(a,r,nodes){
 if(!r)return;
 const holder=nodes.find(x=>x!==a&&x.id===r.id);
 tributeContent(a,r);
 a.rise=holder?holder.rise:a.pace;
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
 const give=(a,r)=>{streamGive(a,r,placed);placed.push(a);const i=fresh.indexOf(r);if(i>=0)fresh.splice(i,1)};
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
 const pool=contributorPool();V.stream={el:root,width:root.clientWidth,height:root.clientHeight,nodes:[],icons:[],foam:[],canvas:$('stream-canvas')};
 if(!pool.length){const p=document.createElement('p');p.className='subheading';p.style='padding:180px 90px';p.textContent='The milestone remains. No current personal recognitions are available to replay.';root.append(p);return}
 const N=streamCount(pool.length),rng=randSeed(189391),W=V.stream.width;
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
  let a;
  if(front){
   // Sizes are dealt evenly from a curve that leans small with a few large
   // pearls, shuffled along the helix so neighbours differ. Depth swings either side of
   // 0, so the scale is 1 or more on the whole near half, and the swing is
   // held back on the largest pearls so none draws past STREAM_MAX_DRAWN.
   // Paces and turns differ widely from pearl to pearl (Anthony, October 29,
   // 2026), and the turn reaches out wide across the panel.
   const size=1+.25*Math.pow(((j*7)%frontCount+.5)/frontCount,2.2),depth=Math.min(300+rng()*40,1000-1000*size/STREAM_MAX_DRAWN),shrink=streamShrink(j,frontCount);
   a={el,front,size,shrink,depth,offset:0,phase:(j*STREAM_GOLDEN_ANGLE+rng()*.2)%TAU,y:span*(j+.5)/frontCount-STREAM_EDGE,
    radius:Math.min(380+rng()*120,streamWidestRadius(W,size*shrink,depth,0)),pace:15+rng()*15,turn:.14+rng()*.14,sway:.1};
  }else{
   // Every sixth depth pearl is a deep giant that swings to the far back of
   // the vortex; the rest lean small. The far end of the swing stops where
   // the pearl would draw below STREAM_MIN_DRAWN, the near end stays behind
   // the reading pearls' near half. Depth pearls do not bloom.
   const giant=j%6===0,size=giant?1.05+rng()*.1:.68+.42*Math.pow(((j*11)%backCount+.5)/backCount,1.4);
   const far=Math.max(-640,1000-1000*size/STREAM_MIN_DRAWN),nearEnd=Math.min(-45,far+90+rng()*380),depth=(nearEnd-far)/2,offset=(nearEnd+far)/2;
   const shrink=streamShrink(j,backCount),widest=streamWidestRadius(W,size*shrink,depth,offset);
   a={el,front,size,shrink,depth,offset,phase:(j*STREAM_GOLDEN_ANGLE+rng()*.45)%TAU,y:span*(j+.5)/backCount-STREAM_EDGE,
    radius:Math.min(widest,Math.sqrt(180*180+rng()*(widest*widest-180*180))),pace:30-11*(size-.68)/.47+rng()*10,turn:.13+rng()*.15,sway:.17};
  }
  Object.assign(a,{id:'',rise:a.pace,angle:a.phase,wobble:rng()*TAU,rng,cycles:0,baseRadius:a.radius,d:STREAM_PEARL_HALF*2});
  el.dataset.size=a.size.toFixed(3);
  V.stream.nodes.push(a);
 }
 streamSpreadCopies(V.stream.nodes,assignedRecords,span);
 // Glass bubbles, light and quick. The first STREAM_ICON_BUBBLES carry an
 // expression icon and stay behind the reading pearls' near half, so an icon
 // never crosses words a viewer is reading; the rest are empty foam of many sizes, spread out to the
 // funnel's sides where no pearl reaches.
 for(let i=0;i<STREAM_FOAM;i++){
  const el=document.createElement('div'),art=i<STREAM_ICON_BUBBLES,d=Math.round(art?56+56*rng():10+50*Math.pow(rng(),1.8));
  el.className='stream-foam';el.style.width=el.style.height=d+'px';el.style.setProperty('--bubble',BUBBLE_HUES[i%BUBBLE_HUES.length]);
  if(art){const img=document.createElement('img');img.src=ASSETS['icon'+(1+i%9)];img.alt='';el.append(img)}
  root.append(el);
  V.stream.foam.push({el,d,art,y:(V.stream.height+140)*((i*7%STREAM_FOAM)+.5)/STREAM_FOAM-70,angle:rng()*TAU,radius:art?210+rng()*260:80+rng()*470,rise:(art?20:30)+rng()*30-d*.1,turn:.2+rng()*.3,wobble:rng()*TAU});
 }
}

// Plan 17, decision 6: a pearl stays fully opaque while it is inside the
// panel and fades out only over a short band as its own drawn edge (half
// size STREAM_PEARL_HALF px times its drawn scale) meets the panel's top or
// bottom edge, reaching fully transparent before any of it crosses. Depth is
// shown by blur and an opaque tone shift instead of transparency, so no pearl
// ever lets the words of another pearl show through it.
// 118 (pearls 236 px, up from 216): every catalog phrase, name and icon row
// keeps max(3 percent, 12 px) inside the rim (Plan 17 rim rule).
const STREAM_PEARL_HALF = 118;
// 24 px (from 40): a large pearl is see-through for about a second as it
// enters or leaves, instead of nearly two.
const STREAM_FADE_BAND = 24;
// The largest share of the panel's height a pearl may draw at: .62 (from
// .92), so a large pearl is wholly inside the panel for most of its climb and
// pearls crowd each other less (Anthony, October 29, 2026).
const STREAM_MAX_PANEL = .62;
function tickTributes(dt){
 if(S.s!==11||!V.stream||active||transition||(S.still&&dt>0))return;
 const v=V.stream,t=V.clock,W=v.width,H=v.height;
 for(const a of v.nodes){
  a.y-=dt*a.rise;
  if(a.y< -STREAM_EDGE){
   a.y=H+STREAM_EDGE;
   a.cycles++;
   const nextRecord=streamNextRecord(a,v.nodes,H+STREAM_EDGE*2);
   if(nextRecord)streamGive(a,nextRecord,v.nodes);
  }
  // The pearl turns fastest in the funnel's narrow foot and eases as it opens.
  const u=streamLift(a.y,H),funnel=streamFunnel(u,t,a.front?STREAM_READING_WAIST:STREAM_WAIST);
  a.angle+=dt*a.turn/(a.front?1:Math.pow(funnel,STREAM_SPIN));
  // A pearl grown for a long message never draws taller than most of the
  // panel or wider than its sides, and stays inside them across its turn.
  const angle=a.angle+Math.sin(t*.13+a.wobble)*a.sway,z=Math.sin(angle)*a.depth+a.offset,deep=1000/(1000-z);
  const k=Math.min(deep*a.size*a.shrink*(a.front?streamBloom(u):1),Math.min(H*STREAM_MAX_PANEL,W-2*STREAM_SIDE_MARGIN)/a.d);
  const reach=a.radius*funnel*deep,half=a.d/2*k;
  const x=clamp(streamAxis(a.y,t,W,H)+Math.cos(angle)*reach+Math.sin(t*.23+a.wobble)*12,half+STREAM_SIDE_MARGIN,Math.max(half+STREAM_SIDE_MARGIN,W-half-STREAM_SIDE_MARGIN)),y=a.y-(deep-.75)*27-Math.sin(angle)*reach*STREAM_TILT;
  const opacity=smooth((y-half)/STREAM_FADE_BAND)*smooth((H-y-half)/STREAM_FADE_BAND);
  // A pearl looks as far away as it draws small, and stacks that way.
  const zSeen=Math.min(z,1000-1000/k);
  a.el.style.transform=`translate(${x-a.d/2}px,${y-a.d/2}px) scale(${k})`;a.el.style.opacity=clamp(opacity,0,1);a.el.style.zIndex=String(1000+Math.round(zSeen));
  // Frame cost. Pearls outside the panel and fully faded are hidden outright
  // so the browser paints nothing for them. Pearls carry no filter: the
  // stepped depth blur and tone redrew a whole pearl, words and all, each time
  // a step changed, which the church TV showed as stutter and flicker
  // (Anthony, October 29, 2026). Depth shows through size and stacking.
  const shown=opacity>0;
  if(a.shown!==shown){a.shown=shown;a.el.style.visibility=shown?'visible':'hidden'}
  a.x=x;a.z=z;a.scale=k;a.screenY=y;
 }
 for(const a of v.foam){
  a.y-=dt*a.rise;if(a.y< -70)a.y=H+70;
  const funnel=streamFunnel(streamLift(a.y,H),t);a.angle+=dt*a.turn/Math.pow(funnel,STREAM_SPIN);
  const z=a.art?Math.sin(a.angle)*195-225:Math.sin(a.angle)*330-90,k=1000/(1000-z),reach=Math.min(a.radius*funnel*k,W/2-a.d*k);
  const x=streamAxis(a.y,t,W,H)+Math.cos(a.angle)*reach+Math.sin(t*.4+a.wobble)*9,y=a.y-Math.sin(a.angle)*reach*STREAM_TILT;
  a.el.style.transform=`translate(${x-a.d/2}px,${y-a.d/2}px) scale(${k}) rotate(${Math.sin(t*.33+a.wobble)*14}deg)`;
  a.el.style.opacity=(.55+.45*clamp((z+420)/660,0,1))*smooth((y-a.d)/60)*smooth((H-y-a.d)/60)*smooth((Math.min(x,W-x)-a.d)/40);
  a.el.style.zIndex=String(1000+Math.round(z));
 }
 // The funnel's light changes slowly, so it is redrawn at most 30 times a
 // second; a phone then spends its frames on the pearls.
 v.canvasDue=(v.canvasDue||0)+dt;
 if(v.canvasDue>=1/30||dt<=0){v.canvasDue=0;drawStream()}
}

function drawStream(){
 const v=V.stream;if(!v?.canvas)return;const c=v.canvas.getContext('2d'),W=v.width,H=v.height,t=V.clock;c.clearRect(0,0,v.canvas.width,v.canvas.height);
 c.save();c.scale(v.canvas.width/W,v.canvas.height/H);
 const glow=c.createRadialGradient(W*STREAM_CENTRE,H*.6,0,W*STREAM_CENTRE,H*.6,420);glow.addColorStop(0,'#f9e2a545');glow.addColorStop(.55,'#f3d8a018');glow.addColorStop(1,'#ffedc000');c.fillStyle=glow;c.fillRect(0,0,W,H);
 // The funnel's column of light: its own silhouette, brightest at mid height.
 const column=c.createLinearGradient(0,0,0,H);column.addColorStop(0,'#fff6d800');column.addColorStop(.45,'#fff3cf55');column.addColorStop(.8,'#fbe3a540');column.addColorStop(1,'#fbe3a500');
 c.beginPath();
 for(let i=0;i<=40;i++){const y=H-i/40*H,x=streamAxis(y,t,W,H)-150*streamFunnel(streamLift(y,H),t);i?c.lineTo(x,y):c.moveTo(x,y)}
 for(let i=40;i>=0;i--){const y=H-i/40*H;c.lineTo(streamAxis(y,t,W,H)+150*streamFunnel(streamLift(y,H),t),y)}
 c.closePath();c.fillStyle=column;c.fill();
 // Rising rings: tilted hoops that climb the funnel and widen with it. The
 // far half of each hoop is faint, the near half bright with a fine highlight.
 const ringSpan=H*1.2;
 for(let j=0;j<STREAM_RINGS;j++){
  const y=H*1.1-(((j/STREAM_RINGS)*ringSpan+t*11)%ringSpan),u=streamLift(y,H),rx=405*streamFunnel(u,t),ry=rx*.17,cx=streamAxis(y,t,W,H),show=smooth((y+10)/120)*smooth((H+10-y)/120);
  if(show<=0)continue;
  c.globalAlpha=show;
  c.beginPath();c.ellipse(cx,y,rx,ry,0,Math.PI,TAU);c.strokeStyle='#cfa94a5e';c.lineWidth=1.2;c.stroke();
  c.beginPath();c.ellipse(cx,y,rx,ry,0,0,Math.PI);c.strokeStyle='#cda43fa8';c.lineWidth=2.2;c.stroke();
  c.beginPath();c.ellipse(cx,y-1.5,rx,ry,0,.35,Math.PI-.35);c.strokeStyle='#ffffffc8';c.lineWidth=1;c.stroke();
 }
 c.globalAlpha=1;
 // Ribbons of light wound round the funnel. Each is stroked once whole and
 // faint, then again only where it passes in front, so the winding reads as
 // depth without rigid rails.
 for(let j=0;j<STREAM_RIBBONS;j++){
  const whole=new Path2D(),nearSide=new Path2D();let pen=false;
  for(let i=0;i<=80;i++){
   const q=i/80,yy=H+50-q*(H+100),funnel=streamFunnel(streamLift(yy,H),t),angle=q*TAU*1.35+t*.22+j*TAU/STREAM_RIBBONS,z=Math.sin(angle)*360-170,k=1000/(1000-z),reach=(250+j*16)*funnel*k;
   const x=streamAxis(yy,t,W,H)+Math.cos(angle)*reach,y=yy-Math.sin(angle)*reach*STREAM_TILT;
   i?whole.lineTo(x,y):whole.moveTo(x,y);
   if(Math.sin(angle)>.12){pen?nearSide.lineTo(x,y):nearSide.moveTo(x,y);pen=true}else pen=false;
  }
  c.strokeStyle=['#d7b55c2e','#fff5d350','#d4b7892e','#ffffff48','#e6c77a30'][j];c.lineWidth=j%2?1.6:1;c.stroke(whole);
  c.strokeStyle=['#d9b04c9c','#fff8e0d0','#d3b26f94','#ffffffc4','#e3c16a9c'][j];c.lineWidth=j%2?2.6:1.6;c.stroke(nearSide);
 }
 // Sparks spiral with the funnel: closer in and quicker toward the foot.
 for(let i=0;i<STREAM_SPARKS;i++){const y=((i*71-t*(9+i%8*1.5))%(H+60)+H+60)%(H+60),u=streamLift(y,H),funnel=streamFunnel(u,t),a=i*2.4+t*(.12+.3*(1-u)),r=(170+i%7*38)*funnel,z=Math.sin(a)*300-180,k=900/(900-z),x=streamAxis(y,t,W,H)+Math.cos(a)*r*k;drawSpark(c,x,y-Math.sin(a)*r*k*STREAM_TILT,1+i%4*.6,.2+.25*Math.sin(i+t*.6)**2,i%5?'#d4b76f':'#fffaf0')}
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
