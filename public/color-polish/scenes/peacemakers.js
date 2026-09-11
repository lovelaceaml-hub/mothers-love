// Scene 8: We Are Peacemakers.
'use strict';

function peacemakers(){return `<div style="position:absolute;left:12px;top:33px;width:829px"><div class="eyebrow">Mother’s Love in our community</div><h1 style="font-size:71px;letter-spacing:-2.2px;line-height:1.02;margin:22px 0">We Are<br>${shimmer('Peace')}<span class="violet">makers</span></h1><p class="subheading" style="font-size:26px">Recognize the kindness<br>you see around you.</p></div>${art('globe','left:271px;top:134px;width:604px;height:482px')}${rightBubbles()}`}

const PEACEMAKERS_LAYERS={
 far:{scale:.84,blur:.9,pace:.75,z:40},
 mid:{scale:.93,blur:.35,pace:.9,z:60},
 near:{scale:1,blur:0,pace:1.1,z:80}
};

function mountPEACEMAKERS(root){
 V.actors.forEach((a,i)=>{
  if(a.large){a.layer='near';if(a.el)a.el.dataset.depth='near';return}
  const layer=i===3?'near':['far','mid','near'][i%3];
  a.layer=layer;
  const L=PEACEMAKERS_LAYERS[layer]||PEACEMAKERS_LAYERS.near;
  a.pace*=L.pace;
  if(a.el)a.el.dataset.depth=layer;
 });
}
function peacemakersMount(root){return mountPEACEMAKERS(root)}

function integratePEACEMAKERS(a,dt){
 return false;
}
function peacemakersIntegrate(a,dt){return integratePEACEMAKERS(a,dt)}

function placePEACEMAKERS(a){
 const L=PEACEMAKERS_LAYERS[a.layer]||PEACEMAKERS_LAYERS.near, scale=a.screenScale*L.scale, x=a.screenX, y=a.screenY, op=a.opacity;
 if(a.el.dataset.depth!==a.layer)a.el.dataset.depth=a.layer;
 a.el.style.left=0;a.el.style.top=0;a.el.style.transform=`translate(${(x-a.d/2).toFixed(2)}px,${(y-a.d/2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
 a.el.style.opacity=op.toFixed(3);a.el.style.zIndex=String(L.z+Math.round(scale*100));
 const baseBlur=scale<.93?(.93-scale)*3:0, blur=Math.min(.9, Math.max(baseBlur, L.blur));
 a.el.style.filter=blur>0?`blur(${blur.toFixed(2)}px)`:'none';
 const b=slots.find(b=>b.key===a.key);if(b){b.x=x-a.d/2;b.y=y-a.d/2;b.phase=a.life}
 return true;
}
function peacemakersPlace(a){return placePEACEMAKERS(a)}

registerScene(8,{
 markup:peacemakers,
 floaters:true,
 fxCanvas:true,
 keepOut:()=>[{x:0,y:8,w:700,h:296}],
 replaceMode:'drift',
 mount:mountPEACEMAKERS,
 integrate:integratePEACEMAKERS,
 place:placePEACEMAKERS
});

