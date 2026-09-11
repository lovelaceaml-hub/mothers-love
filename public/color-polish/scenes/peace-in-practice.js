// Scene 9: Peace in Practice.
'use strict';

const PIP_LAYERS = {
 far: { scale: 0.85, blur: 0.8, pace: 0.75, z: 40 },
 mid: { scale: 0.93, blur: 0.3, pace: 0.9, z: 60 },
 near: { scale: 1, blur: 0, pace: 1.1, z: 80 }
};

function hexToRgbaPIP(hex, a) {
 const n = parseInt(hex.slice(1), 16);
 return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function peace_in_practice_hexToRgba(hex, a) {
 return hexToRgbaPIP(hex, a);
}

function peaceScene(){return `<div style="position:absolute;left:12px;top:36px;width:861px"><div class="eyebrow">Peace in practice</div><h1 style="font-size:61px;letter-spacing:-2px;line-height:1.1;margin:23px 0">May Mother’s ${shimmer('love')}<br>bring ${shimmer('peace')} to the world!</h1><p class="subheading">Love expressed through words and actions.</p></div>${art('hands_banner','left:20px;top:393px;width:823px;height:238px;opacity:.8;mask-image:linear-gradient(transparent,#000 20%,#000 85%,transparent)')}<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px"></div><div id="heart-field"></div>${rightBubbles()}`}

function mountHearts(){const root=$('heart-field');if(!root)return;hearts=[];for(let i=0;i<14;i++){const el=document.createElement('div');el.className='floating-heart';const size=27+i%4*13;el.style.width=size+'px';el.style.height=size+'px';el.innerHTML=heartSVG(i%3===0?'#d6bbc9':'#e9b1b9');root.append(el);hearts.push({el,x:24+i%7*106,y:276+Math.floor(i/7)*135,phase:i,size})}}
function tickHearts(dt){if(S.still)return;hearts.forEach((h,i)=>{const y=250+((h.y-250-S.t*(3+i%3))%330+330)%330;h.el.style.transform=`translate(${h.x+Math.sin(S.t/10+i)*22}px,${y}px) rotate(${Math.sin(S.t/14+i)*12}deg) scale(${1+Math.sin(S.t/3+i)*.025})`})}
function mountHeart(){const host=$('heart-host');if(!host)return;if(!heartRenderer)heartRenderer=createHeart();host.append(heartRenderer.canvas);heartRenderer.draw(S.t)}
function createHeart(){
 const img=document.createElement('img');img.src=ASSETS.heart_render;img.alt='Sculpted rotating heart';img.style='width:100%;height:100%;object-fit:contain';
 return{canvas:img,draw:t=>{img.style.transform=`perspective(800px) rotateY(${t*7.5}deg)`}};
}

registerScene(9,{
 markup:peaceScene,
 mount(root){
  mountHeart();
  mountHearts();
  V.peaceFx = [];
  V.actors.forEach((a, i) => {
   if (a.large) {
    a.layer = 'near';
    if (a.el) a.el.dataset.depth = 'near';
    return;
   }
   const layer = i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
   a.layer = layer;
   a.pace *= PIP_LAYERS[layer].pace;
   if (a.el) a.el.dataset.depth = layer;
  });
 },
 floaters:true,
 fxCanvas:true,
 keepOut:()=>[{x:0,y:10,w:870,h:276}],
 replaceMode:'hearts',
 integrate(a, dt) {
  return false;
 },
 place(a) {
  const layerName = a.layer || 'near';
  const L = PIP_LAYERS[layerName] || PIP_LAYERS.near;
  const scale = a.screenScale * L.scale;
  const x = a.screenX;
  const y = a.screenY;
  const op = a.opacity;
  a.el.style.left = 0;
  a.el.style.top = 0;
  a.el.style.transform = `translate(${(x - a.d / 2).toFixed(2)}px,${(y - a.d / 2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
  a.el.style.opacity = op.toFixed(3);
  a.el.style.zIndex = String(L.z + Math.round(scale * 100));
  const baseBlur = scale < 0.93 ? (0.93 - scale) * 3 : 0;
  const blur = Math.min(.9, Math.max(baseBlur, L.blur));
  a.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : 'none';
  if (a.el.dataset.depth !== layerName) a.el.dataset.depth = layerName;
  const b = slots.find(b => b.key === a.key);
  if (b) {
   b.x = x - a.d / 2;
   b.y = y - a.d / 2;
   b.phase = a.life;
  }
  return true;
 },
 onRetire(a) {
  if (!V.peaceFx) V.peaceFx = [];
  const rng = a.rng || Math.random;
  for (let i = 0; i < 12; i++) {
   const angle = rng() * TAU;
   const speed = 30 + rng() * 80;
   V.peaceFx.push({
    kind: 'peace',
    x: a.screenX,
    y: a.screenY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 40,
    r: 7 + rng() * 4,
    phase: rng() * TAU,
    start: V.clock,
    life: 2.4 + rng() * 1.2,
    color: i % 2 === 0 ? '#E8C777' : '#EABB89'
   });
  }
  for (let i = 0; i < 8; i++) {
   const angle = rng() * TAU;
   const speed = 30 + rng() * 80;
   V.peaceFx.push({
    kind: 'glow',
    x: a.screenX,
    y: a.screenY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 40,
    r: 9 + rng() * 7,
    phase: rng() * TAU,
    start: V.clock,
    life: 2.4 + rng() * 1.2,
    color: '#FFF4BA'
   });
  }
  if (V.peaceFx.length > 80) {
   V.peaceFx.splice(0, V.peaceFx.length - 80);
  }
 },
 prime(dt) {
  if (V.canvas) V.canvas.dataset.peaceFx = String(V.peaceFx ? V.peaceFx.length : 0);
 },
 draw(dt) {
  const c = V.canvas?.getContext('2d');
  if (!c) return;
  if (V.peaceFx) {
   V.peaceFx = V.peaceFx.filter(p => (V.clock - p.start) < p.life);
  } else {
   V.peaceFx = [];
  }
  if (V.canvas) V.canvas.dataset.peaceFx = String(V.peaceFx.length);
  const sin60 = Math.sin(Math.PI / 3);
  const cos60 = Math.cos(Math.PI / 3);
  for (const p of V.peaceFx) {
   const age = V.clock - p.start;
   const q = clamp(age / p.life, 0, 1);
   const x = p.x + p.vx * age * 0.55 + Math.sin(age * 1.7 + p.phase) * age * 11;
   const y = p.y + p.vy * age * 0.5 + age * age * 8;
   const alpha = Math.sin(Math.PI * q) * 0.85;
   c.save();
   c.globalAlpha = clamp(alpha, 0, 1);
   if (p.kind === 'peace') {
    c.translate(x, y);
    c.rotate(age * 0.5 + p.phase);
    c.strokeStyle = p.color;
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(0, 0, p.r, 0, TAU);
    c.moveTo(0, 0);
    c.lineTo(0, p.r);
    c.moveTo(0, 0);
    c.lineTo(-p.r * sin60, p.r * cos60);
    c.moveTo(0, 0);
    c.lineTo(p.r * sin60, p.r * cos60);
    c.stroke();
   } else if (p.kind === 'glow') {
    const grad = c.createRadialGradient(x, y, 0, x, y, p.r);
    grad.addColorStop(0, hexToRgbaPIP(p.color, 0.55));
    grad.addColorStop(1, hexToRgbaPIP(p.color, 0));
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, p.r, 0, TAU);
    c.fill();
   }
   c.restore();
  }
 }
});

