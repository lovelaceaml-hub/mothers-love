// Core stage orchestration, scene registry, transitions, and runtime host interface.
'use strict';

const SCENES=Object.create(null);
function registerScene(id,descriptor){SCENES[id]=Object.assign({markup:()=>'',mount:null,tick:null,draw:null,prime:null,tickAge:null,floaters:false,fxCanvas:false,archOpacity:'.52',topMargin:7,pace:null,replaceEvery:null,replaceMode:'drift',entrance:'entering',burst:'hearts',keepOut:()=>[],integrate:null,place:null,onRetire:null},descriptor)}
function sceneDescriptor(id=S.s){return SCENES[id]||SCENES[0]}
registerScene(0,{});

function renderNow(id,{keepAge=false}={}){
 S.s=id;slots=[];eduCards=[];hearts=[];tributes=[];
 const el=document.createElement('div');el.className='scene';el.dataset.scene=id;sceneRoot=el;
 el.innerHTML=['offline','neutral'].includes(S.mode)?safeScene():S.mode==='empty'?emptyPanel():sceneDescriptor(id).markup();
 $('stage').replaceChildren(el);transition=null;
 if(!keepAge){S.sceneAge=0;S.eduAge=0}
 postRender();
}
function postRender(){
 slots.forEach(b=>b.el=$(b.key));
 V={root:sceneRoot,clock:0,actors:[],fx:[],garden:null,planets:[],stream:null,status:[],next:sceneDescriptor().replaceEvery??12,serial:0};
 $('arch')?.style.setProperty('opacity',sceneDescriptor().archOpacity);
 document.querySelectorAll('.scene-nav').forEach(el=>el.classList.toggle('active',+el.dataset.scene===S.s));
 bindNumbers(sceneRoot);
 if(['offline','neutral','empty'].includes(S.mode)){updateNotes();return}
 sceneRoot.querySelectorAll(':scope > div[style*="position:absolute"]').forEach(el=>{if(!el.classList.contains('orb-slot')&&el.querySelector('h1'))el.classList.add('scene-copy')});
 if(sceneDescriptor().floaters)mountFloaters();
 sceneDescriptor().mount?.(sceneRoot);
 checkFullFits();
 if(sceneDescriptor().fxCanvas){const canvas=document.createElement('canvas');canvas.className='scene-fx';canvas.width=1812;canvas.height=636;canvas.setAttribute('aria-hidden','true');sceneRoot.append(canvas);V.canvas=canvas;renderFloaters();drawSceneFX(0)}
 sceneDescriptor().prime?.(0);
 updateNotes();
 updateSceneCountdown();
}

function requestScene(id,{force=false}={}){
 id=sceneNumber(id);if(active&&!force){S.pendingScene=id;return}if(transition){S.pendingScene=id;return}if(id===S.s&&!force)return;
 if(id===7){S.bloomIndex=S.bloomNext;S.bloomNext=S.bloomIndex%9+1}
 const old=sceneRoot,prev=S.s;S.s=id;S.sceneAge=0;S.eduAge=0;slots=[];eduCards=[];hearts=[];tributes=[];
 const el=document.createElement('div');el.className='scene';el.dataset.scene=id;sceneRoot=el;
 el.innerHTML=['offline','neutral'].includes(S.mode)?safeScene():S.mode==='empty'?emptyPanel():sceneDescriptor(id).markup();
 $('stage').append(el);postRender();log('scene_transition_start',{from:prev,to:id});
 if(S.still){old?.remove();return}el.style.opacity=0;transition={old,next:el,age:0,duration:1.15};
}
function nextPlaylistEntry(){
 const list=S.playlist;if(!list?.length)return null;
 const current=list.findIndex(entry=>entry.id===S.s);if(current<0)return null;
 return list[(current+1)%list.length]||null;
}
function manualAdvance(){
 if(S.mode!=='normal'||S.source!=='live')return;
 if(active||transition)return;
 const now=typeof performance!=='undefined'?performance.now():Date.now();
 if(now-lastManualAdvanceAt<700)return;
 const next=nextPlaylistEntry();if(!next)return;
 lastManualAdvanceAt=now;
 const from=S.s;
 requestScene(next.id,{force:true});
 log('manual_advance',{from,to:next.id});
}
function manualAdvanceKey(event){
 if(event.code==='ArrowRight'||event.code==='Space'||event.key==='ArrowRight'||event.key===' '||event.key==='Spacebar'){
  event.preventDefault();manualAdvance();
 }
}
function tickTransition(dt){if(!transition)return;transition.age+=dt;const p=ease(transition.age/transition.duration);transition.old.style.opacity=1-p;transition.old.style.transform=`translateX(${-15*p}px) scale(${1-.004*p})`;transition.next.style.opacity=p;transition.next.style.transform=`translateX(${20*(1-p)}px) scale(${.997+.003*p})`;if(p>=1){transition.old.remove();transition.next.style.opacity='';transition.next.style.transform='';transition=null;log('scene_transition_end',{scene:S.s});if(S.pendingScene&&!active){const n=S.pendingScene;S.pendingScene=null;requestScene(n)}}}

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
  if(!S.still){S.sceneAge+=dt;sceneDescriptor().tickAge?.(dt);tickSlots(dt);tickTributes(dt);tickHearts(dt);}
 }
 if(!active&&!transition&&!S.still&&!S.sceneControlled&&!S.pauseRotation&&S.playlist?.length){const duration=S.dwell?.[S.s]??DWELL[S.s]??30;if(S.sceneAge>=duration){const next=nextPlaylistEntry();if(next)requestScene(next.id)}}
 if(!active&&!transition&&S.milestonePending&&!S.queue.length&&S.sceneAge>=10){captureMilestone(S.milestonePending);S.milestonePending=null;requestScene(11)}
 tickFeeds(dt);tickNumbers();
 if(!S.still&&!active&&!transition&&heartRenderer&&heartRenderer.canvas.isConnected)heartRenderer.draw(V.clock*.55+6);
 if(Math.floor(S.t/30)!==S.lastHeader)updateHeader();
 if(S.shimmerUntil&&S.t>S.shimmerUntil){$('tv')?.classList.remove('force-shimmer');S.shimmerUntil=0}
 updateSceneCountdown();
}
function updateNotes(){}
function applyStill(){
 $('tv')?.classList.toggle('still',S.still);
 if(S.still){particles=[];numCache.forEach(c=>c.value=c.target);if(active?.phase==='entrance')active.entrance=0}
 updateSceneCountdown();
}
function size(){const f=$('frame').getBoundingClientRect(),scale=Math.min(f.width/1920,f.height/1080);$('tv').style.transform=`scale(${scale})`;$('tv').style.left=(f.width-1920*scale)/2+'px';$('tv').style.top=(f.height-1080*scale)/2+'px'}
let drawAccum=0;function frame(t){
 const dt=lastFrame?Math.min(.065,(t-lastFrame)/1000):0;lastFrame=t;
 coordinator(dt*playbackRate);drawAccum+=dt;
 if(drawAccum>=1/25){if(!frozen)drawAtmosphere(drawAccum*playbackRate);drawAccum=0}requestAnimationFrame(frame);
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
