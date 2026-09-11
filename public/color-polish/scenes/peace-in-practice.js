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
const PIP_HEART_N = 56;
const PIP_HEART_M = 18;
const PIP_HEART_TOTAL_VERTS = (PIP_HEART_M + 1) * PIP_HEART_N + 2;
const PIP_HEART_TOTAL_QUADS = PIP_HEART_M * PIP_HEART_N + 2 * PIP_HEART_N;

let PIP_HEART_MESH_DATA = null;
let PIP_HEART_SPARKS_DATA = null;
let PIP_HEART_ROT_BUFFERS = null;
let PIP_HEART_COLOR_TABLE = null;

function pipInitHeartMesh() {
  if (PIP_HEART_MESH_DATA) return;
  const N = PIP_HEART_N;
  const M = PIP_HEART_M;
  const totalVerts = PIP_HEART_TOTAL_VERTS;
  const totalQuads = PIP_HEART_TOTAL_QUADS;

  const rawX = new Float32Array(N);
  const rawY = new Float32Array(N);
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < N; i++) {
    const u = (i * TAU) / N;
    const sinU = Math.sin(u);
    rawX[i] = 16 * sinU * sinU * sinU;
    rawY[i] = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);
    if (rawY[i] < minY) minY = rawY[i];
    if (rawY[i] > maxY) maxY = rawY[i];
  }

  const yMid = (minY + maxY) * 0.5;
  let maxR = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.hypot(rawX[i], rawY[i] - yMid);
    if (r > maxR) maxR = r;
  }

  const px = new Float32Array(N);
  const py = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    px[i] = rawX[i] / maxR;
    py[i] = (rawY[i] - yMid) / maxR;
  }

  const vx = new Float32Array(totalVerts);
  const vy = new Float32Array(totalVerts);
  const vz = new Float32Array(totalVerts);

  for (let j = 0; j <= M; j++) {
    const phi = (j * Math.PI) / M;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const w = 0.22 + 0.78 * sinPhi;
    const z = 0.62 * cosPhi;
    const row = j * N;
    for (let i = 0; i < N; i++) {
      const idx = row + i;
      vx[idx] = px[i] * w;
      vy[idx] = py[i] * w;
      vz[idx] = z;
    }
  }

  const frontPole = (M + 1) * N;
  vx[frontPole] = 0;
  vy[frontPole] = 0;
  vz[frontPole] = 0.62;

  const backPole = frontPole + 1;
  vx[backPole] = 0;
  vy[backPole] = 0;
  vz[backPole] = -0.62;

  const v0 = new Int16Array(totalQuads);
  const v1 = new Int16Array(totalQuads);
  const v2 = new Int16Array(totalQuads);
  const v3 = new Int16Array(totalQuads);
  const cx = new Float32Array(totalQuads);
  const cy = new Float32Array(totalQuads);
  const cz = new Float32Array(totalQuads);
  const nx = new Float32Array(totalQuads);
  const ny = new Float32Array(totalQuads);
  const nz = new Float32Array(totalQuads);

  let q = 0;
  for (let j = 0; j < M; j++) {
    const r0 = j * N;
    const r1 = (j + 1) * N;
    for (let i = 0; i < N; i++) {
      const nextI = (i + 1) % N;
      v0[q] = r0 + i;
      v1[q] = r0 + nextI;
      v2[q] = r1 + nextI;
      v3[q] = r1 + i;
      q++;
    }
  }

  for (let i = 0; i < N; i++) {
    const nextI = (i + 1) % N;
    v0[q] = frontPole;
    v1[q] = nextI;
    v2[q] = i;
    v3[q] = frontPole;
    q++;
  }

  const lastRow = M * N;
  for (let i = 0; i < N; i++) {
    const nextI = (i + 1) % N;
    v0[q] = backPole;
    v1[q] = lastRow + i;
    v2[q] = lastRow + nextI;
    v3[q] = backPole;
    q++;
  }

  for (let k = 0; k < totalQuads; k++) {
    const a = v0[k];
    const b = v1[k];
    const c = v2[k];
    const d = v3[k];

    cx[k] = (vx[a] + vx[b] + vx[c] + vx[d]) * 0.25;
    cy[k] = (vy[a] + vy[b] + vy[c] + vy[d]) * 0.25;
    cz[k] = (vz[a] + vz[b] + vz[c] + vz[d]) * 0.25;

    const d1x = vx[c] - vx[a];
    const d1y = vy[c] - vy[a];
    const d1z = vz[c] - vz[a];

    const d2x = vx[d] - vx[b];
    const d2y = vy[d] - vy[b];
    const d2z = vz[d] - vz[b];

    const normX = d1y * d2z - d1z * d2y;
    const normY = d1z * d2x - d1x * d2z;
    const normZ = d1x * d2y - d1y * d2x;
    let len = Math.hypot(normX, normY, normZ);

    if (len > 1e-6) {
      nx[k] = normX / len;
      ny[k] = normY / len;
      nz[k] = normZ / len;
    } else {
      if (k < M * N) {
        nx[k] = cx[k];
        ny[k] = cy[k];
        nz[k] = cz[k];
        len = Math.hypot(nx[k], ny[k], nz[k]);
        if (len > 1e-6) {
          nx[k] /= len;
          ny[k] /= len;
          nz[k] /= len;
        }
      } else if (k < (M + 1) * N) {
        nx[k] = 0;
        ny[k] = 0;
        nz[k] = 1;
      } else {
        nx[k] = 0;
        ny[k] = 0;
        nz[k] = -1;
      }
    }
  }

  PIP_HEART_MESH_DATA = {
    totalVerts,
    totalQuads,
    vx, vy, vz,
    v0, v1, v2, v3,
    cx, cy, cz,
    nx, ny, nz
  };
}

function pipInitHeartSparks() {
  if (PIP_HEART_SPARKS_DATA) return;
  const sparks = [];
  for (let i = 0; i < 12; i++) {
    const phi = (i * TAU) / 12;
    const radius = 1.15 + ((i * 7 + 3) % 21) * 0.01;
    const tilt = 0.3 + ((i * 5) % 9) * 0.14;
    const speed = 0.5 + ((i * 3) % 7) * 0.12;
    const size = 1.5 + (i % 4) * 0.5;
    const color = i % 2 === 0 ? '#fff0e9' : '#ffe8dc';
    sparks.push({ phi, radius, tilt, speed, size, color });
  }
  PIP_HEART_SPARKS_DATA = sparks;
}

function pipInitHeartBuffers() {
  if (PIP_HEART_ROT_BUFFERS) return;
  const verts = PIP_HEART_TOTAL_VERTS;
  const quads = PIP_HEART_TOTAL_QUADS;
  PIP_HEART_ROT_BUFFERS = {
    px: new Float32Array(verts),
    py: new Float32Array(verts),
    depth: new Float32Array(quads),
    colorIdx: new Uint16Array(quads),
    visible: new Int16Array(quads),
    spX: new Float32Array(12),
    spY: new Float32Array(12),
    spZ: new Float32Array(12),
    spRadius: new Float32Array(12),
    spAlpha: new Float32Array(12)
  };
}

function pipInitHeartColorTable() {
  if (PIP_HEART_COLOR_TABLE) return;
  const table = new Array(2048);
  for (let b = 0; b < 32; b++) {
    const intensity = (b + 0.5) / 32;
    let baseR, baseG, baseB;
    if (intensity < 0.5) {
      const tCol = intensity / 0.5;
      baseR = 190 + 37 * tCol;
      baseG = 110 + 45 * tCol;
      baseB = 133 + 37 * tCol;
    } else {
      const tCol = (intensity - 0.5) / 0.5;
      baseR = 227 + 28 * tCol;
      baseG = 155 + 85 * tCol;
      baseB = 170 + 63 * tCol;
    }

    for (let r = 0; r < 8; r++) {
      const rimVal = r === 0 ? 0 : (r / 7) * 0.5;
      for (let s = 0; s < 8; s++) {
        const specVal = s === 0 ? 0 : (s / 7) * 0.85;

        let red = baseR;
        let green = baseG;
        let blue = baseB;

        if (rimVal > 0) {
          red += (255 - red) * rimVal * 0.6;
          green += (232 - green) * rimVal * 0.6;
          blue += (220 - blue) * rimVal * 0.6;
        }

        if (specVal > 0) {
          red += (255 - red) * specVal;
          green += (240 - green) * specVal;
          blue += (233 - blue) * specVal;
        }

        const cr = Math.min(255, Math.max(0, Math.round(red)));
        const cg = Math.min(255, Math.max(0, Math.round(green)));
        const cb = Math.min(255, Math.max(0, Math.round(blue)));

        table[b * 64 + r * 8 + s] = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
      }
    }
  }
  PIP_HEART_COLOR_TABLE = table;
}

function pipRenderHeartFrame(ctx, canvas, t) {
  const mesh = PIP_HEART_MESH_DATA;
  const sparks = PIP_HEART_SPARKS_DATA;
  const buf = PIP_HEART_ROT_BUFFERS;
  const colorTable = PIP_HEART_COLOR_TABLE;
  if (!mesh || !sparks || !buf || !colorTable) return;

  const W = canvas.width;
  const H = canvas.height;
  const cx = W * 0.5;
  const cy = H * 0.5;

  ctx.clearRect(0, 0, W, H);

  const rotY = t * 0.9;
  const rotX = 0.28 + 0.12 * Math.sin(t * 0.7);
  const pulse = Math.max(0, Math.sin(t * 2.4));
  const scale = 1 + 0.035 * Math.pow(pulse, 6);

  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);

  const r11 = cosY;
  const r13 = sinY;

  const r21 = sinX * sinY;
  const r22 = cosX;
  const r23 = -sinX * cosY;

  const r31 = -cosX * sinY;
  const r32 = sinX;
  const r33 = cosX * cosY;

  const F = 3.2;
  const scaleCanvas = Math.min(W, H) * 0.49;

  const totalVerts = mesh.totalVerts;
  const mvx = mesh.vx;
  const mvy = mesh.vy;
  const mvz = mesh.vz;
  const projX = buf.px;
  const projY = buf.py;

  for (let i = 0; i < totalVerts; i++) {
    const x = mvx[i];
    const y = mvy[i];
    const z = mvz[i];

    const rotVx = scale * (x * r11 + z * r13);
    const rotVy = scale * (x * r21 + y * r22 + z * r23);
    const rotVz = scale * (x * r31 + y * r32 + z * r33);

    const p = F / (F - rotVz);
    projX[i] = cx + rotVx * p * scaleCanvas;
    projY[i] = cy - rotVy * p * scaleCanvas;
  }

  const lKeyX = -0.45;
  const lKeyY = 0.60;
  const lKeyZ = 0.66;
  const lKeyLen = Math.hypot(lKeyX, lKeyY, lKeyZ);
  const lkx = lKeyX / lKeyLen;
  const lky = lKeyY / lKeyLen;
  const lkz = lKeyZ / lKeyLen;

  const lFillX = 0.75;
  const lFillY = 0.15;
  const lFillZ = 0.64;
  const lFillLen = Math.hypot(lFillX, lFillY, lFillZ);
  const lfx = lFillX / lFillLen;
  const lfy = lFillY / lFillLen;
  const lfz = lFillZ / lFillLen;

  const totalQuads = mesh.totalQuads;
  const mcx = mesh.cx;
  const mcy = mesh.cy;
  const mcz = mesh.cz;
  const mnx = mesh.nx;
  const mny = mesh.ny;
  const mnz = mesh.nz;
  const qDepth = buf.depth;
  const qColorIdx = buf.colorIdx;
  const visible = buf.visible;

  let visibleCount = 0;

  for (let k = 0; k < totalQuads; k++) {
    const qx = mcx[k];
    const qy = mcy[k];
    const qz = mcz[k];

    const rotCx = scale * (qx * r11 + qz * r13);
    const rotCy = scale * (qx * r21 + qy * r22 + qz * r23);
    const rotCz = scale * (qx * r31 + qy * r32 + qz * r33);

    const normX = mnx[k];
    const normY = mny[k];
    const normZ = mnz[k];

    const rnx = normX * r11 + normZ * r13;
    const rny = normX * r21 + normY * r22 + normZ * r23;
    const rnz = normX * r31 + normY * r32 + normZ * r33;

    const vx = -rotCx;
    const vy = -rotCy;
    const vz = F - rotCz;

    const dotView = rnx * vx + rny * vy + rnz * vz;
    if (dotView <= 0) continue;

    const vLen = Math.hypot(vx, vy, vz);
    const vViewX = vx / vLen;
    const vViewY = vy / vLen;
    const vViewZ = vz / vLen;

    const dotKey = Math.max(0, rnx * lkx + rny * lky + rnz * lkz);
    const dotFill = Math.max(0, rnx * lfx + rny * lfy + rnz * lfz);
    const diffuse = dotKey * 0.74 + dotFill * 0.26;

    let hx = lkx + vViewX;
    let hy = lky + vViewY;
    let hz = lkz + vViewZ;
    const hLen = Math.hypot(hx, hy, hz);
    hx /= hLen;
    hy /= hLen;
    hz /= hLen;
    const dotH = Math.max(0, rnx * hx + rny * hy + rnz * hz);
    const spec = Math.pow(dotH, 20) * 0.85;

    const dotNormView = Math.max(0, rnx * vViewX + rny * vViewY + rnz * vViewZ);
    const rim = Math.pow(1 - dotNormView, 2.8) * 0.5;

    const intensity = Math.min(1, Math.max(0, 0.12 + diffuse * 0.88));
    const bucket = Math.min(31, Math.max(0, (intensity * 32) | 0));
    const rimLevel = Math.min(7, Math.max(0, ((rim / 0.5) * 8) | 0));
    const specLevel = Math.min(7, Math.max(0, ((spec / 0.85) * 8) | 0));

    qColorIdx[k] = (bucket << 6) | (rimLevel << 3) | specLevel;
    qDepth[k] = rotCz;
    visible[visibleCount++] = k;
  }

  const visSlice = visible.subarray(0, visibleCount);
  visSlice.sort((a, b) => qDepth[a] - qDepth[b]);

  ctx.fillStyle = '#c6748230';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 285 * scale, 115 * scale, 18 * scale, 0, 0, TAU);
  ctx.fill();

  const numSparks = sparks.length;
  const spX = buf.spX;
  const spY = buf.spY;
  const spZ = buf.spZ;
  const spRadius = buf.spRadius;
  const spAlpha = buf.spAlpha;

  for (let sIdx = 0; sIdx < numSparks; sIdx++) {
    const sp = sparks[sIdx];
    const angle = sp.phi + t * sp.speed;
    const sx0 = sp.radius * Math.cos(angle);
    const sy0 = sp.radius * Math.sin(angle) * Math.cos(sp.tilt);
    const sz0 = sp.radius * Math.sin(angle) * Math.sin(sp.tilt);

    const srx = scale * (sx0 * r11 + sz0 * r13);
    const sry = scale * (sx0 * r21 + sy0 * r22 + sz0 * r23);
    const srz = scale * (sx0 * r31 + sy0 * r32 + sz0 * r33);

    const spP = F / (F - srz);
    spX[sIdx] = cx + srx * spP * scaleCanvas;
    spY[sIdx] = cy - sry * spP * scaleCanvas;
    spZ[sIdx] = srz;
    spRadius[sIdx] = sp.size * spP;
    spAlpha[sIdx] = Math.min(0.85, 0.45 + 0.4 * Math.sin(t * 3.5 + sp.phi));
  }

  for (let sIdx = 0; sIdx < numSparks; sIdx++) {
    if (spZ[sIdx] < 0) {
      ctx.globalAlpha = spAlpha[sIdx];
      ctx.fillStyle = sparks[sIdx].color;
      ctx.beginPath();
      ctx.arc(spX[sIdx], spY[sIdx], spRadius[sIdx], 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const v0 = mesh.v0;
  const v1 = mesh.v1;
  const v2 = mesh.v2;
  const v3 = mesh.v3;

  for (let i = 0; i < visibleCount; i++) {
    const qIdx = visSlice[i];
    const a = v0[qIdx];
    const b = v1[qIdx];
    const c = v2[qIdx];
    const d = v3[qIdx];

    ctx.fillStyle = colorTable[qColorIdx[qIdx]];
    ctx.beginPath();
    ctx.moveTo(projX[a], projY[a]);
    ctx.lineTo(projX[b], projY[b]);
    ctx.lineTo(projX[c], projY[c]);
    ctx.lineTo(projX[d], projY[d]);
    ctx.closePath();
    ctx.fill();
  }

  for (let sIdx = 0; sIdx < numSparks; sIdx++) {
    if (spZ[sIdx] >= 0) {
      ctx.globalAlpha = spAlpha[sIdx];
      ctx.fillStyle = sparks[sIdx].color;
      ctx.beginPath();
      ctx.arc(spX[sIdx], spY[sIdx], spRadius[sIdx], 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function mountHeart(){
 const host=$('heart-host');
 if(!host)return;
 if(!heartRenderer)heartRenderer=createHeart();
 if(!host.contains(heartRenderer.canvas))host.append(heartRenderer.canvas);
 heartRenderer.draw(S.t);
}

function createHeart(){
 const canvas=document.createElement('canvas');
 canvas.width=780;
 canvas.height=726;
 canvas.style.cssText='width:100%;height:100%;display:block;';
 canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label','Sculpted rotating heart');
 pipInitHeartMesh();
 pipInitHeartSparks();
 pipInitHeartBuffers();
 pipInitHeartColorTable();
 const ctx=canvas.getContext('2d');
 return{
  canvas,
  draw:t=>{
   if(!canvas.isConnected)return;
   pipRenderHeartFrame(ctx,canvas,t);
  }
 };
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

