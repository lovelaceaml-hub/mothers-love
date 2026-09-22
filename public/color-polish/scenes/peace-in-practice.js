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

function pipHeartSVG(color = '#d7263d', idSuffix = '') {
  const cleanColor = color.startsWith('#') ? color.slice(1) : color;
  const gradId = 'pip-hg-' + cleanColor + (idSuffix ? '-' + idSuffix : '');
  return `<svg viewBox="0 0 100 94" aria-hidden="true" style="width:100%;height:100%;display:block"><defs><radialGradient id="${gradId}" cx=".3" cy=".25" r=".85"><stop offset="0%" stop-color="#ff8a95"/><stop offset="45%" stop-color="${color}"/><stop offset="100%" stop-color="#8a0f22"/></radialGradient></defs><path d="M50 84C42 76 9 57 8 32C7 11 30 3 43 18C46 21 49 27 50 30C52 25 55 20 59 16C76 2 95 16 92 35C89 59 58 78 50 84Z" fill="url(#${gradId})" stroke="#ff8a95" stroke-width="1.2" stroke-opacity="0.6"/><path d="M21 28Q25 15 36 23" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}

const PIP_CARD_SLOTS = [
  { id: 'pip-slot-a', left: 872, top: 150, width: 300, height: 300, phaseOffset: 0.0 },
  { id: 'pip-slot-b', left: 1196, top: 40, width: 300, height: 300, phaseOffset: 3.5 },
  { id: 'pip-slot-c', left: 1510, top: 190, width: 290, height: 290, phaseOffset: 7.0 }
];

let pipCards = [];
let pipActiveTimers = [];
let pipExplosionSerial = 0;

function peaceScene() {
  return `<svg width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true"><defs><clipPath id="pip-heart-clip" clipPathUnits="objectBoundingBox"><path d="M 0.5,0.894 C 0.42,0.809 0.09,0.606 0.08,0.34 C 0.07,0.117 0.30,0.032 0.43,0.191 C 0.46,0.223 0.49,0.287 0.5,0.319 C 0.52,0.266 0.55,0.213 0.59,0.17 C 0.76,0.021 0.95,0.17 0.92,0.372 C 0.89,0.628 0.58,0.83 0.5,0.894 Z"/></clipPath></defs></svg><div style="position:absolute;left:12px;top:36px;width:861px"><div class="eyebrow">Peace in practice</div><h1 style="font-size:61px;letter-spacing:-2px;line-height:1.1;margin:23px 0">May Mother’s ${shimmer('love')}<br>bring ${shimmer('peace')} to the world!</h1><p class="subheading">Love expressed through words and actions.</p></div>${art('hands_banner', 'left:20px;top:393px;width:823px;height:238px;opacity:.8;mask-image:linear-gradient(transparent,#000 20%,#000 85%,transparent)')}<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px"></div><div id="heart-field"></div><div id="heart-cards"></div>`;
}

function mountHearts() {
  const root = $('heart-field');
  if (!root) return;
  hearts = [];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    const size = 27 + (i % 4) * 13;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    const color = i % 3 === 0 ? '#d7263d' : '#ff8a95';
    el.innerHTML = pipHeartSVG(color, 'amb-' + i);
    root.append(el);
    const x = 24 + (i % 7) * 106;
    const y = 276 + Math.floor(i / 7) * 135;
    el.style.transform = `translate(${x}px, ${y}px)`;
    hearts.push({
      el,
      x,
      y,
      vx: Math.sin(i * 1.7) * 4,
      vy: -(2 + (i % 3) * 2),
      phase: i * 0.9,
      size,
      born: V.clock || 0,
      fading: false,
      fadeStart: 0
    });
  }
}

function tickHearts(dt) {
  if (S.still) return;
  const now = V.clock;
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    if (h.fading) {
      const fadeAge = now - h.fadeStart;
      if (fadeAge >= 0.6) {
        h.el.remove();
        hearts.splice(i, 1);
        continue;
      }
      h.el.style.opacity = String(Math.max(0, 1 - fadeAge / 0.6));
    }
    h.vx *= Math.pow(0.85, dt * 25);
    h.vy *= Math.pow(0.85, dt * 25);
    h.x += h.vx * dt;
    h.y += (h.vy - 6) * dt;
    const driftX = Math.sin(now * 0.4 + h.phase) * 14;
    const driftY = Math.cos(now * 0.35 + h.phase * 1.3) * 10;
    if (h.y < -50) h.y = 650;
    if (h.x < -30) h.x = 1820;
    if (h.x > 1830) h.x = -20;
    const rot = Math.sin(now * 0.5 + h.phase) * 14;
    const pulse = 1 + Math.sin(now * 1.8 + h.phase) * 0.04;
    h.el.style.transform = `translate(${(h.x + driftX).toFixed(1)}px, ${(h.y + driftY).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${pulse.toFixed(3)})`;
  }
}

function pipSpawnExplosionHearts(cx, cy, count, cardRecordId) {
  const root = $('heart-field');
  if (!root) return;
  log('heart_explosion', { count, scene: 9, id: cardRecordId });

  const nonFading = hearts.filter((h) => !h.fading);
  if (nonFading.length + count > 160) {
    const excess = (nonFading.length + count) - 160;
    let marked = 0;
    for (let i = 0; i < hearts.length && marked < excess; i++) {
      if (!hearts[i].fading) {
        hearts[i].fading = true;
        hearts[i].fadeStart = V.clock || 0;
        hearts[i].el.classList.add('pip-fading');
        marked++;
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    const size = 20 + ((i * 7) % 24);
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    const color = i % 2 === 0 ? '#d7263d' : '#ff8a95';
    el.innerHTML = pipHeartSVG(color, 'exp-' + Math.floor((V.clock || 0) * 100) + '-' + i);
    root.append(el);

    const angle = (i / count) * TAU + ((i % 5) - 2) * 0.12;
    const speed = 65 + ((i * 13) % 85);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 20;

    el.style.transform = `translate(${cx}px, ${cy}px)`;
    hearts.push({
      el,
      x: cx,
      y: cy,
      vx,
      vy,
      phase: i * 0.7,
      size,
      born: V.clock || 0,
      fading: false,
      fadeStart: 0
    });
  }
}

function pipPaginateMessage(message) {
  if (message.length <= 85) {
    return [message];
  }
  const words = message.match(/\S+\s*|\s+/g) || [message];
  const pages = [];
  let buffer = '';
  for (const word of words) {
    if ((buffer + word).length > 85 && buffer.length > 0) {
      pages.push(buffer);
      buffer = word;
    } else {
      buffer += word;
    }
  }
  if (buffer) {
    pages.push(buffer);
  }
  return pages.length ? pages : [message];
}

function pipActiveRecordIds() {
  const ids = [];
  for (const slot of pipCards) {
    if (slot.card && slot.card.record && slot.card.record.id) {
      ids.push(slot.card.record.id);
    }
  }
  return ids;
}

function pipCreateCardElement(def, record, slotIdx) {
  const cardId = 'pip-card-' + slotIdx + '-' + (++V.serial);
  const isStill = Boolean(S.still);
  const pages = pipPaginateMessage(record.message);
  const holdDuration = Math.max(9, record.message.length / 14);

  const el = document.createElement('div');
  el.className = 'heart-card' + (isStill ? ' is-still' : '');
  el.id = cardId;
  el.dataset.recordId = record.id;
  el.dataset.fullMessage = record.message;
  el.dataset.joinedPages = pages.join('');
  el.style.left = def.left + 'px';
  el.style.top = def.top + 'px';
  el.style.width = def.width + 'px';
  el.style.height = def.height + 'px';

  const primaryExpr = record.ids && record.ids.length ? record.ids[0] : 1;
  const pageIndicator = (!isStill && pages.length > 1)
    ? `<div class="pip-card-page" style="margin-top:3px;font-size:11px;opacity:0.85;letter-spacing:1px">01 / ${String(pages.length).padStart(2, '0')}</div>`
    : '';

  const nameLen = record.name ? record.name.length : 0;
  let nameFontSize = 19;
  if (nameLen > 50) {
    nameFontSize = 13;
  } else if (nameLen > 30) {
    nameFontSize = 15;
  } else if (nameLen > 18) {
    nameFontSize = 17;
  }

  const displayMessage = isStill ? record.message : pages[0];

  el.innerHTML = `<div class="heart-card-bg" aria-hidden="true">${pipHeartSVG('#d7263d', cardId)}</div><div class="heart-card-content"><div class="pip-card-icon">${icon(primaryExpr, 'pip-icon')}</div><h3 class="pip-card-name" style="font-size:${nameFontSize}px">${esc(record.name)}</h3><p class="pip-card-message" data-full-message="${esc(record.message)}" style="font-size:18px">${esc(displayMessage)}</p><span class="pip-joined-pages" hidden>${esc(pages.join(''))}</span>${pageIndicator}</div>`;

  return {
    el,
    record,
    holdDuration,
    pages,
    pageIndex: 0,
    pageTimer: 0
  };
}

function pipMountCards(root) {
  pipCards = [];
  pipExplosionSerial = 0;
  const container = $('heart-cards');
  if (!container) return;
  container.replaceChildren();

  const chosenIds = [];
  for (let i = 0; i < PIP_CARD_SLOTS.length; i++) {
    const def = PIP_CARD_SLOTS[i];
    const rec = chooseRandom(chosenIds) || {
      id: 'pip-fallback-' + i,
      name: 'Kindness Friend',
      message: 'Peace begins with warm words and gentle understanding.',
      ids: [i + 1]
    };
    chosenIds.push(rec.id);
    markShown(rec.id);

    const card = pipCreateCardElement(def, rec, i);
    container.append(card.el);

    if (S.still) {
      card.el.style.transform = 'scale(1)';
      card.el.style.opacity = '1';
      pipCards.push({
        def,
        slotIndex: i,
        state: 'hold',
        age: 0,
        gapAge: 0,
        card
      });
    } else {
      const initialAge = def.phaseOffset;
      if (initialAge <= 1.0) {
        const p = initialAge / 1.0;
        const scale = 0.14 + 0.86 * (1 - Math.pow(1 - p, 3));
        const opacity = 0.2 + 0.8 * p;
        card.el.style.transform = `scale(${scale.toFixed(4)})`;
        card.el.style.opacity = opacity.toFixed(3);
        pipCards.push({
          def,
          slotIndex: i,
          state: 'grow',
          age: initialAge,
          gapAge: 0,
          card
        });
      } else {
        card.el.style.transform = 'scale(1)';
        card.el.style.opacity = '1';
        pipCards.push({
          def,
          slotIndex: i,
          state: 'hold',
          age: initialAge,
          gapAge: 0,
          card
        });
      }
    }
  }
}

function pipTickAge(dt) {
  if (S.still) return;
  const container = $('heart-cards');
  if (!container) return;

  for (let i = 0; i < pipCards.length; i++) {
    const slot = pipCards[i];
    if (slot.state === 'gap') {
      slot.gapAge += dt;
      if (slot.gapAge >= 0.4) {
        const exclude = pipActiveRecordIds();
        const rec = chooseRandom(exclude) || {
          id: 'pip-card-next-' + slot.slotIndex + '-' + Math.floor(V.clock),
          name: 'Peace Partner',
          message: 'Warm words nurture peace every day.',
          ids: [(slot.slotIndex % 9) + 1]
        };
        markShown(rec.id);
        const newCard = pipCreateCardElement(slot.def, rec, slot.slotIndex);
        container.append(newCard.el);
        newCard.el.style.transform = 'scale(0.14)';
        newCard.el.style.opacity = '0.2';
        slot.card = newCard;
        slot.state = 'grow';
        slot.age = 0;
        slot.gapAge = 0;
      }
      continue;
    }

    const card = slot.card;
    if (!card) continue;
    slot.age += dt;

    if (slot.state === 'grow') {
      if (slot.age >= 1.0) {
        slot.state = 'hold';
        card.el.style.transform = 'scale(1)';
        card.el.style.opacity = '1';
      } else {
        const p = slot.age / 1.0;
        const scale = 0.14 + 0.86 * (1 - Math.pow(1 - p, 3));
        const opacity = 0.2 + 0.8 * p;
        card.el.style.transform = `scale(${scale.toFixed(4)})`;
        card.el.style.opacity = opacity.toFixed(3);
      }
    } else if (slot.state === 'hold') {
      if (card.pages.length > 1) {
        card.pageTimer += dt;
        const pageDuration = card.holdDuration / card.pages.length;
        const nextIdx = Math.min(card.pages.length - 1, Math.floor((slot.age - 1.0) / pageDuration));
        if (nextIdx !== card.pageIndex) {
          card.pageIndex = nextIdx;
          const msgEl = card.el.querySelector('.pip-card-message');
          if (msgEl) msgEl.textContent = card.pages[card.pageIndex];
          const pageEl = card.el.querySelector('.pip-card-page');
          if (pageEl) pageEl.textContent = `${String(card.pageIndex + 1).padStart(2, '0')} / ${String(card.pages.length).padStart(2, '0')}`;
        }
      }

      if (slot.age >= 1.0 + card.holdDuration) {
        const cx = slot.def.left + slot.def.width * 0.5;
        const cy = slot.def.top + slot.def.height * 0.5;
        // Keep each burst varied while building the fuller persistent heart
        // field specified for this scene.
        const pieces = 14 + ((pipExplosionSerial++ * 7) % 4);
        pipSpawnExplosionHearts(cx, cy, pieces, card.record.id);

        card.el.remove();
        slot.card = null;
        slot.state = 'gap';
        slot.gapAge = 0;
      }
    }
  }
}

function pipOnLeave(root) {
  for (const timer of pipActiveTimers) {
    clearTimeout(timer);
    clearInterval(timer);
  }
  pipActiveTimers = [];
  pipCards = [];
}

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
  }

  // Smooth per-vertex normals accumulated from face normals
  const vnx = new Float32Array(totalVerts);
  const vny = new Float32Array(totalVerts);
  const vnz = new Float32Array(totalVerts);

  for (let k = 0; k < totalQuads; k++) {
    const a = v0[k], b = v1[k], c = v2[k], d = v3[k];
    const d1x = vx[c] - vx[a], d1y = vy[c] - vy[a], d1z = vz[c] - vz[a];
    const d2x = vx[d] - vx[b], d2y = vy[d] - vy[b], d2z = vz[d] - vz[b];
    const normX = d1y * d2z - d1z * d2y;
    const normY = d1z * d2x - d1x * d2z;
    const normZ = d1x * d2y - d1y * d2x;
    vnx[a] += normX; vny[a] += normY; vnz[a] += normZ;
    vnx[b] += normX; vny[b] += normY; vnz[b] += normZ;
    vnx[c] += normX; vny[c] += normY; vnz[c] += normZ;
    vnx[d] += normX; vny[d] += normY; vnz[d] += normZ;
  }

  for (let v = 0; v < totalVerts; v++) {
    const len = Math.hypot(vnx[v], vny[v], vnz[v]);
    if (len > 1e-6) {
      vnx[v] /= len;
      vny[v] /= len;
      vnz[v] /= len;
    }
  }

  // Average 4 corner vertex normals per quad for smooth shading
  for (let k = 0; k < totalQuads; k++) {
    const a = v0[k], b = v1[k], c = v2[k], d = v3[k];
    let avgX = (vnx[a] + vnx[b] + vnx[c] + vnx[d]) * 0.25;
    let avgY = (vny[a] + vny[b] + vny[c] + vny[d]) * 0.25;
    let avgZ = (vnz[a] + vnz[b] + vnz[c] + vnz[d]) * 0.25;
    let len = Math.hypot(avgX, avgY, avgZ);
    if (len > 1e-6) {
      nx[k] = avgX / len;
      ny[k] = avgY / len;
      nz[k] = avgZ / len;
    } else {
      nx[k] = 0;
      ny[k] = 0;
      nz[k] = 1;
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
    const color = i % 3 === 0 ? '#ffd166' : i % 3 === 1 ? '#ff8a95' : '#ffccd5';
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
    outline: new Int16Array(PIP_HEART_N),
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
      const t = intensity / 0.5;
      baseR = 138 + (215 - 138) * t;
      baseG = 15 + (38 - 15) * t;
      baseB = 34 + (61 - 34) * t;
    } else {
      const t = (intensity - 0.5) / 0.5;
      baseR = 215 + (255 - 215) * t;
      baseG = 38 + (155 - 38) * t;
      baseB = 61 + (165 - 61) * t;
    }

    for (let r = 0; r < 8; r++) {
      const rimVal = r === 0 ? 0 : (r / 7) * 0.45;
      for (let s = 0; s < 8; s++) {
        const specVal = s === 0 ? 0 : (s / 7) * 0.85;

        let red = baseR;
        let green = baseG;
        let blue = baseB;

        if (rimVal > 0) {
          red += (255 - red) * rimVal * 0.4;
          green += (155 - green) * rimVal * 0.4;
          blue += (165 - blue) * rimVal * 0.4;
        }

        if (specVal > 0) {
          red += (255 - red) * specVal;
          green += (240 - green) * specVal;
          blue += (245 - blue) * specVal;
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

  // Keep the mesh for the projected silhouette and motion, but paint the
  // visible heart as one continuous surface. Filling each mesh quad with a
  // flat color made the intended glossy red read as a tiled object on TV.
  const outline = buf.outline;
  for (let i = 0; i < PIP_HEART_N; i++) {
    let bestIndex = Math.floor(PIP_HEART_M * 0.5) * PIP_HEART_N + i;
    let bestRadius = -1;
    for (let j = 0; j <= PIP_HEART_M; j++) {
      const vertexIndex = j * PIP_HEART_N + i;
      const dx = projX[vertexIndex] - cx;
      const dy = projY[vertexIndex] - cy;
      const radius = dx * dx + dy * dy;
      if (radius > bestRadius) {
        bestRadius = radius;
        bestIndex = vertexIndex;
      }
    }
    outline[i] = bestIndex;
  }

  ctx.fillStyle = '#8a0f2230';
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

  const outlinePoint = (index) => ({ x: projX[outline[index]], y: projY[outline[index]] });
  const first = outlinePoint(0);
  const previous = outlinePoint(PIP_HEART_N - 1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo((first.x + previous.x) * 0.5, (first.y + previous.y) * 0.5);
  for (let i = 0; i < PIP_HEART_N; i++) {
    const point = outlinePoint(i);
    const next = outlinePoint((i + 1) % PIP_HEART_N);
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) * 0.5, (point.y + next.y) * 0.5);
  }
  ctx.closePath();
  ctx.clip();

  const highlightX = cx - scaleCanvas * (0.2 + 0.08 * Math.sin(rotY));
  const highlightY = cy - scaleCanvas * (0.22 + 0.03 * Math.cos(rotX));
  const surface = ctx.createRadialGradient(
    highlightX,
    highlightY,
    scaleCanvas * 0.04,
    cx + scaleCanvas * 0.1 * Math.sin(rotY),
    cy + scaleCanvas * 0.08,
    scaleCanvas * 1.22
  );
  surface.addColorStop(0, '#fff1f4');
  surface.addColorStop(0.18, '#ffccd5');
  surface.addColorStop(0.52, '#d7263d');
  surface.addColorStop(0.82, '#a9162b');
  surface.addColorStop(1, '#710b1c');
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, W, H);

  const depthShade = ctx.createLinearGradient(0, cy - scaleCanvas, 0, cy + scaleCanvas);
  depthShade.addColorStop(0, 'rgba(255, 150, 164, 0.04)');
  depthShade.addColorStop(0.58, 'rgba(90, 0, 20, 0.02)');
  depthShade.addColorStop(1, 'rgba(65, 0, 16, 0.24)');
  ctx.fillStyle = depthShade;
  ctx.fillRect(0, 0, W, H);

  const gloss = ctx.createRadialGradient(
    highlightX,
    highlightY,
    0,
    highlightX + scaleCanvas * 0.04,
    highlightY + scaleCanvas * 0.03,
    scaleCanvas * 0.34
  );
  gloss.addColorStop(0, 'rgba(255, 250, 252, 0.42)');
  gloss.addColorStop(0.28, 'rgba(255, 218, 224, 0.20)');
  gloss.addColorStop(1, 'rgba(255, 190, 204, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

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

function mountHeart() {
  const host = $('heart-host');
  if (!host) return;
  if (!heartRenderer) heartRenderer = createHeart();
  if (!host.contains(heartRenderer.canvas)) host.append(heartRenderer.canvas);
  heartRenderer.draw(S.t);
}

function createHeart() {
  const canvas = document.createElement('canvas');
  canvas.width = 780;
  canvas.height = 726;
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Sculpted rotating heart');
  pipInitHeartMesh();
  pipInitHeartSparks();
  pipInitHeartBuffers();
  pipInitHeartColorTable();
  const ctx = canvas.getContext('2d');
  return {
    canvas,
    draw: (t) => {
      if (!canvas.isConnected) return;
      pipRenderHeartFrame(ctx, canvas, t);
    }
  };
}

registerScene(9, {
  markup: peaceScene,
  mount(root) {
    mountHeart();
    mountHearts();
    pipMountCards(root);
  },
  tickAge(dt) {
    pipTickAge(dt);
  },
  onLeave(root) {
    pipOnLeave(root);
  },
  floaters: true,
  fxCanvas: false,
  keepOut: () => [{ x: 0, y: 10, w: 870, h: 276 }]
});
