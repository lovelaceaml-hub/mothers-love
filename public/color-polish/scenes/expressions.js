// Scene 7: The Nine Expressions.
'use strict';

function nineScene(){let h=heading('The Nine Expressions','Words that bring peace.');h+=`<div class="edu-step" id="edu-step">01-09 · THE COMPLETE PHRASES</div><div class="educational" id="educational">`;catalog.forEach((e,i)=>{const x=(i%3)*611,y=91+Math.floor(i/3)*176;h+=`<article class="edu-card" id="edu-${e.id}" data-expression-id="${e.id}" style="left:${x}px;top:${y}px;width:590px;height:159px;--tint:${e.color}"><div class="edu-front"><div class="edu-header">${medallion(e.id)}<div><div class="edu-category">${esc(e.name)}</div><span class="edu-number">${String(e.id).padStart(2,'0')} / 09</span></div></div><p class="edu-phrase">“${esc(e.phrase)}”</p></div><div class="edu-detail"><div class="edu-header">${medallion(e.id)}<div><div class="eyebrow">Expression ${String(e.id).padStart(2,'0')} of 09</div><h2>${shimmer(e.name)}</h2></div></div><p class="edu-phrase">“${esc(e.phrase)}”</p><p class="edu-principle">${esc(e.principle)}</p><p class="edu-explanation">${esc(GUIDANCE[i])}</p><div class="edu-source">Supporting guidance adapted from the official About Campaign page.<br>The approved expression and principle above retain the supplied catalog.</div></div><div class="edu-petals">${Array.from({length:5},(_,n)=>`<i class="edu-petal" style="rotate:${n*72}deg"></i>`).join('')}</div></article>`});return h+`</div><div class="edu-caption">One expression blossoms into focus on each visit.</div>`}

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

registerScene(7,{
 markup:nineScene,
 archOpacity:'.13',
 mount(root){
  eduCards=[...root.querySelectorAll('.edu-card')];
  tickEducation();
 },
 tickAge(dt){
  S.eduAge+=dt;
  tickEducation();
 }
});
