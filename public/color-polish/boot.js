// Bootstrap initialization.
'use strict';

function init(){
 if(window.parent===window){document.body.replaceChildren();return;}
 $('tv').style.visibility='hidden';
 $('flowers').src=ASSETS.flowers;$('foliage').src=ASSETS.foliage;size();
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(size):null;observer?.observe($('frame'));window.addEventListener('resize',size);
 document.addEventListener('visibilitychange',()=>{lastFrame=performance.now()});
 document.addEventListener('click',manualAdvance);
 document.addEventListener('keydown',manualAdvanceKey);
 if(typeof window.matchMedia==='function'){
  const reduceMotionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateReducedMotion=()=>{reducedMotionPreferred=reduceMotionQuery.matches;S.still=motionStill(S.motion,!S.playing);applyStill()};
  updateReducedMotion();
  reduceMotionQuery.addEventListener?.('change',updateReducedMotion);
 }
 requestAnimationFrame(frame);
}

// Exposed only after every core and scene script has loaded, so no host poll or bootstrap message can run before the registry is complete.
window.addEventListener('message',receiveBootstrap);
window.colorPolishRuntime={
 getState:runtimeState,
 visualState,
 setScene:id=>{if(S.mode==='normal')requestScene(sceneNumber(id),{force:true})},
 setPlaying:value=>{S.playing=value===true;S.still=motionStill(S.motion,!S.playing);applyStill()},
 setClock:ms=>{if(finiteNumber(ms)&&ms>=0){S.t=ms/1000;S.clockControlled=true;updateHeader();tickNumbers()}},
 step:stepRuntime,
 clear:()=>{S=blankState();clearPresentation()},
 catalog:catalog.map(item=>({...item}))
};

init();
