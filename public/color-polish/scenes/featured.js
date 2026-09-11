// Scene 4: Featured Recognition.
'use strict';

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

registerScene(4,{
 markup:featured,
 floaters:true,
 fxCanvas:true,
 topMargin:87,
 keepOut:()=>[{x:0,y:0,w:520,h:636}],
 replaceMode:'drift'
});
