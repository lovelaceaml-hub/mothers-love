// Scene 6: Participation Status.
'use strict';

let statusTimers = [];

function statusFlipAngle(i, t){
 const start = 2.5 + i * 1.4;
 if(t < start) return 0;
 const elapsed = t - start;
 const cycleIndex = Math.floor(elapsed / 9);
 const cycleTime = elapsed - cycleIndex * 9;
 const isToBack = (cycleIndex % 2 === 0);
 if(cycleTime < 0.8){
  const p = ease(cycleTime / 0.8);
  return isToBack ? p * 180 : 180 - p * 180;
 }
 return isToBack ? 180 : 0;
}

function statusScene(){
 return `${heading('Participation Status','Mother’s Love, recognized.')}<div class="stat-top panel"><div><div class="metric-title">Expressions of Mother’s Love<br>Recognized This Month</div><div style="font-size:16px;color:#97937e;margin-top:13px">${monthLabel(S.month)}</div></div><div class="metric-value" style="padding:0 28px;border-right:1px solid #ded7c8">${num('month:expr')}</div><div><div class="metric-value" style="font-size:58px">${num('month:rec')}</div><div class="metric-title" style="font-size:20px;margin-top:9px">Recognitions shared<br>this month</div></div><div style="flex:1"></div>${art('puzzle','position:relative;width:133px;height:125px;margin-right:25px')}</div><div class="expression-stats"><div class="stat-particles" aria-hidden="true">${Array.from({length:10},(_,i)=>`<span class="stat-particle" style="--px:${((i*11+5)%94)+3}%;--py:${((i*19+7)%88)+6}%;--pd:${(i*0.9)%3.5}s;--ps:${0.7+(i%3)*0.25}"></span>`).join('')}</div><div class="stat-grid-sweep" aria-hidden="true"></div>${catalog.map(e=>`<div class="stat-expression panel"><div class="medallion" style="--tint:${e.color}"><div class="stat-coin"><div class="stat-coin-face stat-coin-front">${icon(e.id)}</div><div class="stat-coin-face stat-coin-back" aria-hidden="true"><span class="stat-coin-num">${String(e.id).padStart(2,'0')}</span></div></div></div><div class="stat-content"><div class="stat-head"><span class="stat-eyebrow">${esc(e.name)}</span><b>${num('month:'+e.id)}</b></div><div class="stat-phrase${e.phrase.length>40?' stat-phrase-long':''}">${esc(e.phrase)}</div></div></div>`).join('')}</div><div class="periods">${[['today','Today'],['all','Overall']].map(([k,t])=>`<div class="period panel"><div><h3>${t}</h3><b>${num(k+':rec')}</b><small>Recognitions</small></div><div style="text-align:right"><h3>&nbsp;</h3><b>${num(k+':expr')}</b><small>Expressions</small></div></div>`).join('')}</div><div class="body-note">All nine expressions · same period · equal appreciation</div>`;
}

function mountStatus(){
 ['today:rec','today:expr','all:rec','all:expr'].forEach(key=>{
  const c=numCache.get(key);
  if(c)c.duration=1.2;
 });
 statusTimers.forEach(id=>clearTimeout(id));
 statusTimers=[];
 const kinds=['float','sway','breathe'];
 const cards=[...sceneRoot.querySelectorAll('.stat-expression')];
 V.status=cards.map((card,i)=>{
  const med=card.querySelector('.medallion');
  const coin=card.querySelector('.stat-coin');
  const img=card.querySelector('.medallion img');
  const kind=kinds[i%3];
  if(med)med.setAttribute('data-motion',kind);
  if(img&&img.parentElement)img.parentElement.setAttribute('data-motion',kind);
  if(coin&&S.still){
   coin.style.transform='rotateY(0deg)';
  }
  return {
   el:img,
   med,
   coin,
   kind,
   phase:i*2.399,
   rate:0.4+i*0.037,
   amplitude:2.2+(i%3),
   nextLift:V.clock+9+(i%5),
   liftStart:null,
   index:i
  };
 });
}

function tickStatus(dt){
 if(!V.status||!V.status.length)return;
 V.status.forEach((a,i)=>{
  const t=V.clock;
  const breath=Math.sin(t*a.rate+a.phase);
  let x=0,y=0,rot=0,scale=1;
  if(a.kind==='float'){
   x=Math.sin(t*0.19+a.phase)*2;
   y=Math.sin(t*a.rate+a.phase)*a.amplitude;
   rot=Math.sin(t*0.23+a.phase)*3;
  }else if(a.kind==='sway'){
   x=Math.cos(t*a.rate*0.9+a.phase)*2;
   rot=Math.sin(t*a.rate*0.9+a.phase)*6.5;
  }else if(a.kind==='breathe'){
   scale=1+Math.sin(t*a.rate+a.phase)*0.025;
   if(a.liftStart!=null){
    const q=(t-a.liftStart)/1.1;
    if(q<1){
     y=-Math.sin(Math.PI*q)*6;
    }else{
     a.liftStart=null;
     a.nextLift=t+9+(a.phase%5);
    }
   }else if(t>=a.nextLift){
    a.liftStart=t;
   }
  }
  if(a.el){
   a.el.style.transform=`translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
  }
  if(a.med){
   a.med.style.boxShadow=`inset 3px 5px 9px #fff,inset -6px -8px 14px #ae95512b,0 6px 17px rgba(213,188,121,${0.1+0.1*(breath+1)/2})`;
  }
  if(a.coin){
   const flipAngle=S.still?0:statusFlipAngle(i,t);
   a.coin.style.transform=`rotateY(${flipAngle}deg)`;
  }
 });
}

function leaveStatus(root){
 statusTimers.forEach(id=>clearTimeout(id));
 statusTimers=[];
}

registerScene(6,{
 markup:statusScene,
 mount:mountStatus,
 tick:tickStatus,
 onLeave:leaveStatus,
 archOpacity:'.13'
});
