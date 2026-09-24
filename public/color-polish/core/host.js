// Core parent host communication, message validation, and payload pruning.
'use strict';

function pruneRemovedIds(ids){if(!ids.length)return;const removed=new Set(ids);document.querySelectorAll('[data-record-id],[data-event-id],[data-tribute-id],[data-feed-id]').forEach(el=>{const id=el.dataset.recordId||el.dataset.eventId||el.dataset.tributeId||el.dataset.feedId;if(removed.has(id))el.remove()});slots=slots.filter(slot=>!removed.has(slot.id));if(typeof V!=='undefined'){V.actors=V.actors.filter(actor=>!removed.has(actor.id)&&!removed.has(actor.nextId));V.planets=V.planets.filter(planet=>!removed.has(planet.b?.id))}feedLanes.forEach(lane=>{lane.list=lane.list.filter(id=>!removed.has(id));lane.next=lane.next.filter(id=>!removed.has(id))})}
function preserveRuntimeState(next,previous,nextById){
 const fields=['bloomIndex','bloomNext','groupNumber','replenishAt','idCounter','singleStyle','groupStyle','singleBag','groupBag','singleBagLast','groupBagLast','speechBag','speechLast','randomDrawCounter','feedArrivalCounter','returnScene','returnAge','pendingScene','chain','countJobs','lowSince','lowAutomatic','milestonePending','milestoneContributors','milestonesSeen','privacyAt','shimmerUntil','lastHeader'];
 for(const key of fields){const value=previous?.[key];if(value===undefined)continue;if(Array.isArray(value))next[key]=[...value];else if(value instanceof Map)next[key]=new Map(value);else if(value instanceof Set)next[key]=new Set(value);else next[key]=value}
 next.lastShown=new Map(previous?.lastShown instanceof Map?[...previous.lastShown].filter(([id])=>nextById.has(id)):[]);
 next.shownCount=new Map(previous?.shownCount instanceof Map?[...previous.shownCount].filter(([id])=>nextById.has(id)):[]);
}
function applySnapshotPayload(snapshot,control={}){
 const previous=S,previousReady=previous.mode==='normal'&&previous.snapshotRevision!==null,previousIds=new Set(previous.arrivalIds||[]),wasSafe=previous.mode!=='normal';
 const usable=usableSnapshot(snapshot),next=setStateFromSnapshot(usable?snapshot:null,{...control,status:usable?control.status:'unavailable'});
 const replayed=previous.replayKey!==null&&control.replayKey!==undefined&&control.replayKey!==previous.replayKey;
 next.replayKey=control.replayKey??null;
 if(next.mode!=='normal'){
  S=next;clearPresentation();renderNow(1);initFeed();updateHeader();applyStill();return;
 }
 const sceneChanged=next.s!==previous.s,previousPool=Array.isArray(previous.pool)?previous.pool:[],nextById=new Map(next.pool.map(record=>[record.id,record])),removedIds=previousPool.filter(record=>!nextById.has(record.id)).map(record=>record.id);let activeAffected=false;preserveRuntimeState(next,previous,nextById);next.slotCounter=previous.slotCounter||0;next.sceneAge=wasSafe||sceneChanged||replayed?0:previous.sceneAge;next.eduAge=wasSafe||sceneChanged||replayed?0:previous.eduAge;next.queue=replayed?[]:(previous.queue||[]).filter(id=>next.pool.some(r=>r.id===id));next.queueStart=previous.queueStart||0;
 if(active){const activeItems=active.items.map(item=>nextById.get(item.id)).filter(Boolean);activeAffected=activeItems.length!==active.items.length||active.items.some((item,index)=>{const replacement=activeItems[index];return !replacement||replacement.name!==item.name||replacement.message!==item.message||replacement.expiresAt!==item.expiresAt||replacement.ids.join(',')!==item.ids.join(',')});if(!activeAffected)active.items=activeItems}
 const currentArrivals=Array.isArray(snapshot?.arrivals)?snapshot.arrivals:[],newRecords=[];
 if(!previousReady||replayed){next.arrivalIds=new Set(currentArrivals.map(item=>safeText(item?.eventId,128)).filter(Boolean))}else{
  next.arrivalIds=new Set(previousIds);for(const arrival of currentArrivals){const eventId=safeText(arrival?.eventId,128),recognitionId=safeText(arrival?.recognitionId,128),publishedAt=safeEpoch(arrival?.publishedAt),record=next.pool.find(item=>item.id===recognitionId);if(!eventId||!recognitionId||publishedAt===null||!record||!eligible(record))continue;if(!next.arrivalIds.has(eventId)){next.arrivalIds.add(eventId);newRecords.push(record)}}
 }
 S=next;pruneRemovedIds(removedIds);if(activeAffected)cancelActiveEvent();
 const elapsedDelta=S.t-previous.t;
 if(previousReady&&!wasSafe&&!sceneChanged&&!replayed&&elapsedDelta>0&&S.playing){const target=S.t;S.t=previous.t;S.clockControlled=false;coordinator(elapsedDelta);S.clockControlled=true;S.t=target;}
 const pauseArrivals=snapshot?.settings?.pauseArrivals===true;
 if(!pauseArrivals&&!replayed){for(const record of newRecords)if(!S.queue.includes(record.id))S.queue.push(record.id);if(newRecords.length&&!active)S.queueStart=S.t+.65}
 if(!previousReady||wasSafe||replayed){renderNow(S.s);initFeed();updateHeader();applyStill()}
 else{
  mandatoryPrune();if((sceneChanged||recordsChanged(previous.pool,S.pool))&&!active&&!transition)renderNow(S.s,{keepAge:true});else{refreshNumbers();updateHeader();}
  applyStill();
 }
 renderQueue();
 if(S.qrDataUrl&&$('qr'))$('qr').src=S.qrDataUrl;else $('qr')?.removeAttribute('src');
}
function postReady(){if(!parentPort)return;parentPort.postMessage({version:COLOR_POLISH_VERSION,type:'color-polish:ready',nonce:bootstrapNonce,sequence:0})}
function validEnvelope(value,type,sequence){return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.version===COLOR_POLISH_VERSION&&value.type===type&&value.nonce===bootstrapNonce&&Number.isSafeInteger(value.sequence)&&value.sequence===sequence}
function receivePortMessage(event){const value=event?.data;if(!validEnvelope(value,'color-polish:update',expectedSequence+1))return;expectedSequence=value.sequence;try{applySnapshotPayload(value.snapshot??null,value.control&&typeof value.control==='object'?value.control:{})}catch{const safe=blankState();S=safe;clearPresentation();renderNow(1);initFeed();}}
function receiveBootstrap(event){const value=event?.data;if(initialized||window.parent===window||event.source!==window.parent||event.origin==='null'||!validBootstrap(value)||event.ports.length!==1)return;parentOrigin=event.origin;bootstrapNonce=value.nonce;parentPort=event.ports[0];initialized=true;expectedSequence=0;$('tv').style.visibility='';parentPort.onmessage=receivePortMessage;parentPort.start?.();postReady()}
function validBootstrap(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&value.version===COLOR_POLISH_VERSION&&value.type==='color-polish:bootstrap'&&typeof value.nonce==='string'&&/^[A-Za-z0-9._:-]{16,128}$/.test(value.nonce)&&value.sequence===0}

function clearPresentation(){
 active=null;transition=null;slots=[];sceneRoot=null;eduCards=[];numberNodes=[];numCache.clear();feedLanes=[];particles=[];heartRenderer=null;hearts=[];tributes=[];frozen=false;
 // Scene 9's WebGL 2 heart holds a graphics context; a cleared display gives it back.
 if(typeof pipReleaseHeart3D==='function')pipReleaseHeart3D();
 if(typeof V!=='undefined')V={root:null,clock:0,actors:[],fx:[],garden:null,planets:[],stream:null,status:[],next:14,serial:0};
 const stage=$('stage');if(stage)stage.replaceChildren();
 const event=$('event');if(event){event.className='event-stage';event.replaceChildren();}
 const queue=$('queue');if(queue){queue.hidden=true;queue.replaceChildren();}
 const feeds=$('feed-columns');if(feeds)feeds.replaceChildren();
 const field=$('heart-field');if(field)field.replaceChildren();
 const atmosphere=$('atmosphere');const context=atmosphere?.getContext?.('2d');context?.clearRect(0,0,atmosphere.width,atmosphere.height);
 const qr=$('qr');if(qr)qr.removeAttribute('src');$('qr-zone')?.classList.remove('qr-active');$('stage')?.classList.remove('dimmed');
 S.pool=[];S.queue=[];S.seen=new Set();S.arrivalIds=new Set();S.lastShown=new Map();S.milestoneContributors=[];S.pendingScene=null;S.chain=false;
 const countdown=$('scene-countdown');if(countdown)countdown.hidden=true;
}

function mandatoryPrune(){
 const invalid=S.pool.filter(r=>!eligible(r)).map(r=>r.id);if(!invalid.length)return;
 S.queue=S.queue.filter(id=>!invalid.includes(id));
 if(active&&active.items.some(r=>invalid.includes(r.id))){
  active.items=active.items.filter(eligible);if(!active.items.length){active=null;S.chain=false;$('event')?.replaceChildren();$('event')?.classList.remove('active');$('stage')?.classList.remove('dimmed');$('qr-zone')?.classList.remove('qr-active')}
  else if(active.kind==='group'&&active.oversize){buildGroupPage(active.page);}
 }
 const removeIds=new Set(invalid);
 document.querySelectorAll('[data-record-id],[data-event-id],[data-tribute-id],[data-feed-id]').forEach(el=>{const id=el.dataset.recordId||el.dataset.eventId||el.dataset.tributeId||el.dataset.feedId;if(removeIds.has(id))el.remove()});
 if(invalid.some(id=>slots.some(slot=>slot.id===id)))renderNow(S.s,{keepAge:true});
 if(invalid.some(id=>[...document.querySelectorAll('[data-feed-id]')].some(el=>el.dataset.feedId===id)))initFeed();
 refreshNumbers();renderQueue();
}
