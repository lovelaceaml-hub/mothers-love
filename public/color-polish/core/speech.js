// Speech bubbles for people in scene art.
'use strict';

function nextSpeechPhrase(){
 if(!S.speechBag||!S.speechBag.length){
  const values=Array.from({length:catalog.length},(_,i)=>i);
  const rng=randSeed(2003+(S.idCounter||0)*53+Math.floor(S.t*10));
  for(let i=values.length-1;i>0;i--){
   const j=Math.floor(rng()*(i+1));
   [values[i],values[j]]=[values[j],values[i]];
  }
  const last=S.speechLast;
  if(values[0]===last&&values.length>1){
   [values[0],values[1]]=[values[1],values[0]];
  }
  S.speechBag=values;
 }
 const next=S.speechBag.shift();
 S.speechLast=next;
 return catalog[next].phrase;
}

function mountSpeech(root,speakers){
 if(!root||!Array.isArray(speakers)||!speakers.length)return;
 V.speech=[];
 speakers.forEach((sp,i)=>{
  const el=document.createElement('div');
  el.className='speech-bubble';
  el.style.left=sp.x+'px';
  el.style.top=sp.y+'px';
  const phrase=nextSpeechPhrase();
  el.textContent=phrase;
  root.appendChild(el);
  const duration=6+((i*1.3)%3);
  V.speech.push({
   el,
   x:sp.x,
   y:sp.y,
   duration,
   age:0,
   phase:'showing',
   fadeAge:0
  });
 });
}

function tickSpeech(dt){
 if(!V.speech||!V.speech.length||S.still)return;
 for(const b of V.speech){
  b.age+=dt;
  if(b.phase==='showing'){
   if(b.age>=b.duration){
    b.phase='fading_out';
    b.fadeAge=0;
    b.el.classList.add('fading');
   }
  }else if(b.phase==='fading_out'){
   b.fadeAge+=dt;
   if(b.fadeAge>=0.5){
    b.phase='fading_in';
    b.fadeAge=0;
    const phrase=nextSpeechPhrase();
    b.el.textContent=phrase;
    b.el.classList.remove('fading');
    b.duration=6+((hashText(b.x+','+b.y+','+Math.floor(S.t))%30)/10);
    b.age=0;
   }
  }else if(b.phase==='fading_in'){
   b.fadeAge+=dt;
   if(b.fadeAge>=0.5){
    b.phase='showing';
    b.fadeAge=0;
   }
  }
 }
}
