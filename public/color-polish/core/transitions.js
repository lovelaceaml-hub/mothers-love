// Transition constants and the shared Nave camera projection.
'use strict';

const TRANSITION_NAVE_F = 1500;
const TRANSITION_NAVE_TILT = 0.34;
const TRANSITION_NAVE_A = 0.9427546655;
const TRANSITION_NAVE_B = 0.3334870921;
const TRANSITION_NAVE_VBASE = 530.6053;
const TRANSITION_NAVE_PPY = 538.6053;
const TRANSITION_NAVE_M = [6, 10, 14, 18, 22];
const TRANSITION_NAVE_P = [120, 315, 512, 752, 1075];
const TRANSITION_NAVE_R = [187, 223, 257, 309, 383];
const TRANSITION_NAVE_Z = [8000, 2950, 1600, 940, 560];
const TRANSITION_NAVE_PHASE = [0, 0.077, 0.154, 0.231, 0.308];
const TRANSITION_NAVE_STAG = [0.11, 0.11, 0.10, 0.09, 0.07];
const TRANSITION_NAVE_RHO = TRANSITION_NAVE_P.map((p, i) => p * TRANSITION_NAVE_Z[i] / TRANSITION_NAVE_F);
const TRANSITION_NAVE_RW = TRANSITION_NAVE_R.map((r, i) => r * TRANSITION_NAVE_Z[i] / TRANSITION_NAVE_F);
const TRANSITION_NAVE_N = TRANSITION_NAVE_Z.map((z) => z / TRANSITION_NAVE_A);

const TRANSITION_NAVE_COVER = 2.6;
const TRANSITION_NAVE_REVEAL = 2.8;
const TRANSITION_NAVE_TOTAL = 5.4;
const TRANSITION_NAVE_OMEGA = 1.00;
const TRANSITION_NAVE_ZRIM0 = 6200;
const TRANSITION_NAVE_ZRIMEND = 135;
const TRANSITION_NAVE_LN_IN = 2.404368;
const TRANSITION_NAVE_LN_OUT = 1.15;
const TRANSITION_NAVE_ARC = 150;
const TRANSITION_NAVE_SHIFT = 44;
const TRANSITION_NAVE_SURGE = 1800;
const TRANSITION_NAVE_FLARE = 420;
const TRANSITION_NAVE_FLARE_CORE = 420;
const TRANSITION_NAVE_ZNEAR = 140;
const TRANSITION_NAVE_ZFADE = 330;
const TRANSITION_NAVE_ZCLEAR = 10200;
const TRANSITION_NAVE_ZHAZE = 34000;
const TRANSITION_NAVE_FOG_ALPHA = 0.34;
const TRANSITION_NAVE_FOG_SAT = 0.35;
const TRANSITION_NAVE_FOG_LIFT = 0.10;
const TRANSITION_NAVE_FOG_BLUR = 1.8;
const TRANSITION_NAVE_DSOFT = 1300;
const TRANSITION_NAVE_DHARD = 1950;
const TRANSITION_NAVE_ZFOCUS = 1500;
const TRANSITION_NAVE_COC_K = 2500;
const TRANSITION_NAVE_COC_CAP = 3.2;
const TRANSITION_NAVE_LAMP = [-620, -760, 720];
const TRANSITION_NAVE_LIT_BASE = 0.70;
const TRANSITION_NAVE_LIT_KEY = 0.68;
const TRANSITION_NAVE_LIT_REACH = 1700;
const TRANSITION_NAVE_LIT_OCU = 0.22;
const TRANSITION_NAVE_LIT_MIN = 0.68;
const TRANSITION_NAVE_LIT_MAX = 1.10;
const TRANSITION_NAVE_OCU_LO = 600;
const TRANSITION_NAVE_OCU_HI = 9000;
const TRANSITION_NAVE_ZI_K = 3000000;
const TRANSITION_NAVE_ZI_MIN = 40;
const TRANSITION_NAVE_ZI_MAX = 8990;
const TRANSITION_NAVE_SPLIT = 1500;
const TRANSITION_NAVE_CANVAS_W = 1280;
const TRANSITION_NAVE_CANVAS_H = 720;
const TRANSITION_NAVE_CANVAS_HZ = 30;
const TRANSITION_NAVE_RIBS = 24;
const TRANSITION_NAVE_RIB_R = 620;
const TRANSITION_NAVE_RIB_N0 = 400;
const TRANSITION_NAVE_RIB_N1 = 12000;
const TRANSITION_NAVE_BAYS = 9;
const TRANSITION_NAVE_BAY_N0 = 560;
const TRANSITION_NAVE_BAY_GAP = 1180;
const TRANSITION_NAVE_ARCH_SEG = 44;
const TRANSITION_NAVE_VAULT_R = 1.22;
const TRANSITION_NAVE_SOFFITS = 4;
const TRANSITION_NAVE_SPOKES = 22;
const TRANSITION_NAVE_MOTES = 60;
const TRANSITION_NAVE_MOTES_NR = 24;
const TRANSITION_NAVE_SEED = 40913;
const TRANSITION_NAVE_BASE_MIN = 240;
const TRANSITION_NAVE_BASE_MAX = 900;
const TRANSITION_NAVE_BASE_STEP = 20;
const TRANSITION_NAVE_SAMPLES = 240;

function transitionNaveCamera(age, trans, forcedPhase) {
  const flow = trans.flow;
  const phase = forcedPhase || (age < TRANSITION_NAVE_COVER ? 'cover' : 'reveal');
  const p = phase === 'cover'
    ? clamp(age / TRANSITION_NAVE_COVER, 0, 1)
    : clamp((age - TRANSITION_NAVE_COVER) / TRANSITION_NAVE_REVEAL, 0, 1);
  const entryLength = Math.hypot(flow.entry[0], flow.entry[1]) || 1;
  const exitLength = Math.hypot(flow.exit[0], flow.exit[1]) || 1;
  const entry = [flow.entry[0] / entryLength, flow.entry[1] / entryLength];
  const exit = [flow.exit[0] / exitLength, flow.exit[1] / exitLength];
  let zRim;
  let lu = 0;
  let lw = 0;
  let PPX = 0;
  let PPY = 0;
  let flare = 0;
  let wash;
  let haze;

  if (phase === 'cover') {
    const u = curve(0, 0.06, 1.00, 1, p);
    zRim = TRANSITION_NAVE_ZRIM0 * Math.exp(-TRANSITION_NAVE_LN_IN * u);
    const g = 1 - smooth(p);
    lu = -entry[0] * TRANSITION_NAVE_ARC * g;
    lw = entry[1] * TRANSITION_NAVE_ARC * g;
    PPX = entry[0] * TRANSITION_NAVE_SHIFT * g;
    PPY = entry[1] * TRANSITION_NAVE_SHIFT * g;
    wash = smooth(clamp((p - 0.60) / 0.27, 0, 1));
    haze = smooth(clamp((p - 0.20) / 0.55, 0, 1));
  } else {
    const v = curve(0, 0.00, 0.70, 1, p);
    zRim = 560 * Math.exp(-TRANSITION_NAVE_LN_OUT * v);
    const g = smooth(p);
    const lat = TRANSITION_NAVE_ARC * g + TRANSITION_NAVE_SURGE * smooth(clamp((p - 0.30) / 0.70, 0, 1));
    lu = -exit[0] * lat;
    lw = exit[1] * lat;
    PPX = exit[0] * TRANSITION_NAVE_SHIFT * g;
    PPY = exit[1] * TRANSITION_NAVE_SHIFT * g;
    flare = TRANSITION_NAVE_FLARE * Math.pow(clamp((p - 0.10) / 0.80, 0, 1), 1.9);
    wash = 1 - smooth(clamp((p - 0.125) / 0.30, 0, 1));
    haze = 1 - smooth(clamp((p - 0.20) / 0.45, 0, 1));
  }

  return {
    age,
    phase,
    p,
    alpha: flow.spin * TRANSITION_NAVE_OMEGA * (age - TRANSITION_NAVE_COVER),
    c: (560 - zRim) / TRANSITION_NAVE_A,
    lu,
    lw,
    PPX,
    PPY,
    flare,
    wash,
    haze,
    flow,
  };
}

function transitionNaveProject(item, camera) {
  const theta = item.psi + camera.alpha;
  const du = item.rho * Math.cos(theta) - camera.lu;
  const dw = item.rho * Math.sin(theta) - camera.lw;
  const dn = item.n - camera.c;
  const dX = du;
  const dY = -TRANSITION_NAVE_A * dw - TRANSITION_NAVE_B * dn;
  const dZ = -TRANSITION_NAVE_B * dw + TRANSITION_NAVE_A * dn;
  const zd = Math.max(dZ, TRANSITION_NAVE_ZNEAR);
  const k = TRANSITION_NAVE_F / zd;
  const bx = 960 + camera.PPX + dX * k;
  const by = 540 + TRANSITION_NAVE_PPY + camera.PPY + dY * k;
  const D = 2 * (item.rw || 0) * k;
  const fogBase = clamp((zd - TRANSITION_NAVE_ZCLEAR) / (TRANSITION_NAVE_ZHAZE - TRANSITION_NAVE_ZCLEAR), 0, 1);
  const fog = Math.pow(fogBase, 0.85);
  const nearFade = clamp((zd - TRANSITION_NAVE_ZNEAR) / (TRANSITION_NAVE_ZFADE - TRANSITION_NAVE_ZNEAR), 0, 1);
  const sizeFade = D <= TRANSITION_NAVE_DSOFT
    ? 1
    : clamp((TRANSITION_NAVE_DHARD - D) / (TRANSITION_NAVE_DHARD - TRANSITION_NAVE_DSOFT), 0, 1);
  const entry = camera.phase === 'cover' ? smooth(clamp(camera.p / 0.06, 0, 1)) : 1;
  const tail = camera.phase === 'reveal' ? 1 - smooth(clamp((camera.p - 0.86) / 0.14, 0, 1)) : 1;
  const opacity = (1 - TRANSITION_NAVE_FOG_ALPHA * fog) * nearFade * sizeFade * entry * tail;
  const lampDistance = Math.hypot(
    item.rho * Math.cos(theta) - TRANSITION_NAVE_LAMP[0],
    item.rho * Math.sin(theta) - TRANSITION_NAVE_LAMP[1],
    item.n - TRANSITION_NAVE_LAMP[2],
  );
  const key = clamp(1 - lampDistance / TRANSITION_NAVE_LIT_REACH, 0, 1);
  const ocu = item.ocu ?? clamp((item.n - TRANSITION_NAVE_OCU_LO) / (TRANSITION_NAVE_OCU_HI - TRANSITION_NAVE_OCU_LO), 0, 1);
  const lit = clamp(TRANSITION_NAVE_LIT_BASE + TRANSITION_NAVE_LIT_KEY * key + TRANSITION_NAVE_LIT_OCU * ocu + TRANSITION_NAVE_FOG_LIFT * fog, TRANSITION_NAVE_LIT_MIN, TRANSITION_NAVE_LIT_MAX);
  const coc = Math.min(TRANSITION_NAVE_COC_CAP, TRANSITION_NAVE_COC_K * Math.max(0, 1 / zd - 1 / TRANSITION_NAVE_ZFOCUS));
  const blur = coc + TRANSITION_NAVE_FOG_BLUR * Math.pow(fog, 1.6);
  const vanishX = 960 + camera.PPX;
  const vanishY = 540 + TRANSITION_NAVE_PPY + camera.PPY - TRANSITION_NAVE_VBASE;
  const ex = bx - vanishX;
  const ey = by - vanishY;
  const distance = Math.max(Math.hypot(ex, ey), TRANSITION_NAVE_FLARE_CORE);
  const sx = bx + camera.flare * ex / distance;
  const sy = by + camera.flare * ey / distance;

  return { sx, sy, bx, by, D, zd, k, opacity, lit, blur, fog, vanishX, vanishY };
}

let TRANSITION_NAVE_CURSOR = 0;

function transitionNaveHash(index) {
  const rng = randSeed((TRANSITION_NAVE_SEED + Math.imul(index + 1, 0x9e3779b9)) >>> 0);
  return rng();
}

function transitionNaveRecords() {
  const pool = records();
  if (!pool.length) return [];
  const start = TRANSITION_NAVE_CURSOR % pool.length;
  const result = Array.from({ length: TRANSITION_BUBBLE_COUNT }, (_, index) => {
    const slot = (index * 37) % TRANSITION_BUBBLE_COUNT;
    return pool[(start + Math.floor(slot * pool.length / TRANSITION_BUBBLE_COUNT)) % pool.length];
  });
  TRANSITION_NAVE_CURSOR = (start + 1) % pool.length;
  return result;
}

function transitionNaveVanish(camera) {
  return {
    x: 960 + camera.PPX,
    y: 540 + TRANSITION_NAVE_PPY + camera.PPY - TRANSITION_NAVE_VBASE,
  };
}

function transitionNaveFilter(item, projection) {
  const scale = Math.max(projection.D / item.base, 0.001);
  const blurElement = Math.round((projection.blur / scale) / 0.25) * 0.25;
  const brightness = Math.round(projection.lit / 0.02) * 0.02;
  const saturation = Math.round((0.78 - TRANSITION_NAVE_FOG_SAT * projection.fog) / 0.02) * 0.02;
  const value = `brightness(${brightness.toFixed(2)}) saturate(${saturation.toFixed(2)})${blurElement >= 0.25 ? ` blur(${blurElement.toFixed(2)}px)` : ''}`;
  if (item.lastFilter !== value) {
    item.lastFilter = value;
    item.el.style.filter = value;
  }
}

function transitionNaveBase(item, trans) {
  let maxVisibleD = TRANSITION_NAVE_BASE_MIN;
  for (let sample = 0; sample < TRANSITION_NAVE_SAMPLES; sample++) {
    const age = TRANSITION_NAVE_TOTAL * sample / (TRANSITION_NAVE_SAMPLES - 1);
    const phase = age < TRANSITION_NAVE_COVER ? 'cover' : 'reveal';
    const camera = transitionNaveCamera(age, trans, phase);
    const projection = transitionNaveProject(item, camera);
    const radius = projection.D / 2;
    const visible = projection.opacity >= 0.05 && projection.sx + radius >= 0 && projection.sx - radius <= 1920 && projection.sy + radius >= 0 && projection.sy - radius <= 1080;
    if (visible) maxVisibleD = Math.max(maxVisibleD, projection.D);
  }
  return clamp(Math.round(maxVisibleD / TRANSITION_NAVE_BASE_STEP) * TRANSITION_NAVE_BASE_STEP, TRANSITION_NAVE_BASE_MIN, TRANSITION_NAVE_BASE_MAX);
}

function transitionNaveMotes() {
  return Array.from({ length: TRANSITION_NAVE_MOTES + TRANSITION_NAVE_MOTES_NR }, (_, index) => {
    const rng = randSeed((TRANSITION_NAVE_SEED + Math.imul(index + 1, 0x45d9f3b)) >>> 0);
    return {
      rho: 120 + rng() * 900,
      psi: rng() * TAU,
      n: 300 + rng() * 11000,
      near: index >= TRANSITION_NAVE_MOTES,
    };
  });
}

function transitionNaveDrawVault(trans, camera) {
  const vanish = transitionNaveVanish(camera);
  const drawCanvas = (canvas, near) => {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(TRANSITION_NAVE_CANVAS_W / 1920, 0, 0, TRANSITION_NAVE_CANVAS_H / 1080, 0, 0);
    ctx.clearRect(0, 0, 1920, 1080);

    const drawLine = (a, b, color, width) => {
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    const drawPath = (points, color, width, close = false) => {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0].sx, points[0].sy);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].sx, points[i].sy);
      if (close) ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    const point = (rho, psi, n) => transitionNaveProject({ rho, psi, n, rw: 0 }, camera);
    const pointDepth = (rho, psi, n) => point(rho, psi, n).zd;

    if (!near) {
      const haze = ctx.createRadialGradient(vanish.x, vanish.y, 0, vanish.x, vanish.y, 1500);
      haze.addColorStop(0, `rgba(255,247,228,${(0.30 * camera.haze).toFixed(3)})`);
      haze.addColorStop(0.34, `rgba(247,226,189,${(0.24 * camera.haze).toFixed(3)})`);
      haze.addColorStop(0.70, `rgba(234,208,198,${(0.16 * camera.haze).toFixed(3)})`);
      haze.addColorStop(1, `rgba(230,201,201,${(0.10 * camera.haze).toFixed(3)})`);
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, 1920, 1080);
    }

    for (let j = 0; j < TRANSITION_NAVE_RIBS; j++) {
      const psi = j * TAU / TRANSITION_NAVE_RIBS;
      if (near) {
        const steps = 24;
        for (let step = 0; step < steps; step++) {
          const n0 = TRANSITION_NAVE_RIB_N0 + (TRANSITION_NAVE_RIB_N1 - TRANSITION_NAVE_RIB_N0) * step / steps;
          const n1 = TRANSITION_NAVE_RIB_N0 + (TRANSITION_NAVE_RIB_N1 - TRANSITION_NAVE_RIB_N0) * (step + 1) / steps;
          const a = point(TRANSITION_NAVE_RIB_R, psi, n0);
          const b = point(TRANSITION_NAVE_RIB_R, psi, n1);
          if ((a.zd + b.zd) / 2 < TRANSITION_NAVE_SPLIT) drawLine(a, b, 'rgba(255,244,214,0.18)', 1.6);
        }
      } else {
        const a = point(TRANSITION_NAVE_RIB_R, psi, TRANSITION_NAVE_RIB_N0);
        const mid = point(TRANSITION_NAVE_RIB_R, psi, 3000);
        const b = point(TRANSITION_NAVE_RIB_R, psi, TRANSITION_NAVE_RIB_N1);
        drawLine(a, mid, 'rgba(255,244,214,0.18)', 1.6);
        drawLine(mid, b, 'rgba(215,182,140,0.08)', 1.6);
      }
    }

    const rhoAt = (n) => {
      for (let q = 0; q < TRANSITION_NAVE_N.length - 1; q++) {
        if (n <= TRANSITION_NAVE_N[q] && n >= TRANSITION_NAVE_N[q + 1]) {
          const t = clamp((n - TRANSITION_NAVE_N[q + 1]) / (TRANSITION_NAVE_N[q] - TRANSITION_NAVE_N[q + 1]), 0, 1);
          return lerp(TRANSITION_NAVE_RHO[q + 1], TRANSITION_NAVE_RHO[q], t);
        }
      }
      return n < TRANSITION_NAVE_N[TRANSITION_NAVE_N.length - 1] ? TRANSITION_NAVE_RHO[TRANSITION_NAVE_RHO.length - 1] : TRANSITION_NAVE_RHO[0];
    };
    const archSets = [];
    for (let j = 0; j < TRANSITION_NAVE_BAYS; j++) {
      const n = TRANSITION_NAVE_BAY_N0 + j * TRANSITION_NAVE_BAY_GAP;
      const radius = TRANSITION_NAVE_VAULT_R * rhoAt(n);
      const points = [];
      for (let i = 0; i <= TRANSITION_NAVE_ARCH_SEG; i++) {
        const psi = i * TAU / TRANSITION_NAVE_ARCH_SEG;
        points.push(point(radius, psi, n));
      }
      archSets.push(points);
      const mid = points[Math.floor(points.length / 2)];
      const alpha = 0.30 * (1 - mid.fog) + 0.06;
      if (!near) {
        drawPath(points, `rgba(243,220,174,${(alpha * 0.72).toFixed(3)})`, 2.2);
      } else {
        for (let i = 0; i < points.length - 1; i++) {
          if ((points[i].zd + points[i + 1].zd) / 2 < TRANSITION_NAVE_SPLIT) drawLine(points[i], points[i + 1], `rgba(243,220,174,${(alpha * 0.72).toFixed(3)})`, 2.2);
        }
      }
    }

    if (!near) {
      for (let j = 0; j < TRANSITION_NAVE_SOFFITS; j++) {
        const a = archSets[j];
        const b = archSets[j + 1];
        ctx.beginPath();
        let started = false;
        for (const p of a) {
          if (p.sy > vanish.y) {
            if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
            else ctx.lineTo(p.sx, p.sy);
          }
        }
        for (let i = b.length - 1; i >= 0; i--) if (b[i].sy > vanish.y) ctx.lineTo(b[i].sx, b[i].sy);
        if (started) {
          ctx.closePath();
          ctx.fillStyle = 'rgba(201,169,126,0.08)';
          ctx.fill();
        }
      }
    }

    if (!near) {
      for (let q = 0; q < TRANSITION_NAVE_M.length; q++) {
        const points = Array.from({ length: 37 }, (_, i) => point(TRANSITION_NAVE_RHO[q], TRANSITION_NAVE_PHASE[q] + i * TAU / 36, TRANSITION_NAVE_N[q]));
        drawPath(points, 'rgba(255,249,226,0.10)', 1.4, true);
      }
      for (let i = 0; i < TRANSITION_NAVE_SPOKES; i++) {
        const psi = i * TAU / TRANSITION_NAVE_SPOKES;
        drawLine(point(TRANSITION_NAVE_RHO[3], psi, TRANSITION_NAVE_N[3]), point(TRANSITION_NAVE_RHO[4], psi, TRANSITION_NAVE_N[4]), 'rgba(255,249,226,0.08)', 1.1);
      }
      const bloom = ctx.createRadialGradient(vanish.x, vanish.y, 0, vanish.x, vanish.y, 300);
      bloom.addColorStop(0, `rgba(255,253,242,${(0.24 * camera.haze).toFixed(3)})`);
      bloom.addColorStop(1, 'rgba(255,253,242,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, 1920, 1080);
    }

    const motes = trans.motes.filter((mote) => !near ? !mote.near : mote.near);
    for (const mote of motes) {
      const projection = transitionNaveProject(mote, camera);
      if (near && projection.zd >= TRANSITION_NAVE_SPLIT) continue;
      drawSpark(ctx, projection.sx, projection.sy, 1 + 7 * Math.min(projection.k, 1.1), 0.18 + 0.32 * Math.min(projection.k, 1) * camera.haze, '#d4b76f');
    }

    if (near) {
      const edge = ctx.createRadialGradient(960, 540, 0, 960, 540, 1400);
      edge.addColorStop(0.62, 'rgba(255,240,210,0)');
      edge.addColorStop(1, 'rgba(255,236,198,0.12)');
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, 1920, 1080);
    }
  };

  drawCanvas(trans.farCanvas, false);
  drawCanvas(trans.nearCanvas, true);
}

function transitionNaveWash(trans, camera) {
  if (!trans.wash) return;
  trans.wash.style.transform = 'translate3d(0, 0, 0)';
  trans.wash.style.opacity = camera.wash.toFixed(3);
  const visible = camera.phase === 'cover' ? camera.p >= 0.87 : camera.p <= 0.30;
  trans.wash.style.visibility = visible ? 'visible' : 'hidden';
}

function transitionNaveFrame(trans, phase) {
  if (S.still || !trans.items?.length) {
    if (!trans.naveCleaned) {
      trans.naveCleaned = true;
      transitionCleanup();
    }
    return;
  }
  const camera = transitionNaveCamera(trans.age, trans, phase);
  trans.camera = camera;
  transitionNaveWash(trans, camera);
  for (const item of trans.items) {
    const projection = transitionNaveProject(item, camera);
    const scale = projection.D / item.base;
    const x = projection.sx - item.base / 2;
    const y = projection.sy - item.base / 2;
    item.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    item.el.style.opacity = projection.opacity.toFixed(3);
    const zIndex = clamp(Math.round(TRANSITION_NAVE_ZI_K / projection.zd), TRANSITION_NAVE_ZI_MIN, TRANSITION_NAVE_ZI_MAX);
    if (item.lastZIndex !== zIndex) {
      item.lastZIndex = zIndex;
      item.el.style.zIndex = String(zIndex);
    }
    transitionNaveFilter(item, projection);
  }
  if (trans.lastVaultAge === null || trans.age - trans.lastVaultAge >= 1 / TRANSITION_NAVE_CANVAS_HZ || trans.lastVaultPhase !== phase) {
    transitionNaveDrawVault(trans, camera);
    trans.lastVaultAge = trans.age;
    trans.lastVaultPhase = phase;
  }
}

function transitionNaveBuild(trans, layer) {
  if (S.still) {
    trans.items = [];
    return;
  }
  trans.wash = transitionCreateWash(layer);
  trans.farCanvas = document.createElement('canvas');
  trans.farCanvas.className = 'transition-vault-far';
  trans.farCanvas.width = TRANSITION_NAVE_CANVAS_W;
  trans.farCanvas.height = TRANSITION_NAVE_CANVAS_H;
  trans.farCanvas.setAttribute('aria-hidden', 'true');
  layer.append(trans.farCanvas);
  const recs = transitionNaveRecords();
  const items = [];
  const courses = [4, 3, 2, 1, 0];
  let index = 0;
  for (const q of courses) {
    for (let i = 0; i < TRANSITION_NAVE_M[q]; i++) {
      const record = recs[index % recs.length];
      const item = {
        record,
        index,
        course: q,
        courseIndex: i,
        rho: TRANSITION_NAVE_RHO[q],
        rw: TRANSITION_NAVE_RW[q],
        psi: TRANSITION_NAVE_PHASE[q] + i * TAU / TRANSITION_NAVE_M[q],
        n: TRANSITION_NAVE_N[q] * (i % 2 === 0 ? 1 + TRANSITION_NAVE_STAG[q] : 1 - TRANSITION_NAVE_STAG[q]),
      };
      item.ocu = clamp((item.n - TRANSITION_NAVE_OCU_LO) / (TRANSITION_NAVE_OCU_HI - TRANSITION_NAVE_OCU_LO), 0, 1);
      item.base = transitionNaveBase(item, trans);
      const el = document.createElement('div');
      el.className = 'transition-bubble transition-nave-card';
      el.style.setProperty('--tint', catalog[record.ids[0] - 1].color);
      el.style.width = `${item.base}px`;
      el.style.height = `${item.base}px`;
      el.innerHTML = completeOrb(record, item.base);
      item.el = el;
      item.lastZIndex = null;
      item.lastFilter = null;
      layer.append(el);
      items.push(item);
      index++;
    }
  }
  trans.items = items;
  trans.motes = transitionNaveMotes();
  trans.nearCanvas = document.createElement('canvas');
  trans.nearCanvas.className = 'transition-vault-near';
  trans.nearCanvas.width = TRANSITION_NAVE_CANVAS_W;
  trans.nearCanvas.height = TRANSITION_NAVE_CANVAS_H;
  trans.nearCanvas.setAttribute('aria-hidden', 'true');
  layer.append(trans.nearCanvas);
}

const TRANSITIONS = Object.create(null);
const TRANSITION_STYLES = TRANSITIONS;
const TRANSITION_BUBBLE_COUNT = 70;
const TRANSITION_ORIGINAL_DURATION = 1.15;
const TRANSITION_STYLE_IDS = ['flood', 'tide', 'vortex', 'storm'];
const TRANSITION_FLOOD_DIRS = ['left', 'right', 'up', 'down'];
const TRANSITION_TURNS = 2.2;
const TRANSITION_FAR_RADIUS = 2100;
const TRANSITION_FUNNEL_OFFSET = 620;
const TRANSITION_GRID_COLS = 10;
const TRANSITION_GRID_ROWS = 7;
const TRANSITION_BUBBLE_D = 300;
const TRANSITION_COVER_W = 1920;
const TRANSITION_COVER_H = 1080;

let TRANSITION_BAG = [];
let TRANSITION_LAST = null;

function registerTransition(id, descriptor) {
  TRANSITIONS[id] = Object.assign({
    id,
    duration: TRANSITION_ORIGINAL_DURATION,
    coverDuration: TRANSITION_ORIGINAL_DURATION,
    revealDuration: 0,
    init: null,
    cover: null,
    swap: null,
    reveal: null,
  }, descriptor);
}

function transitionOriginalFrame(trans) {
  if (!trans?.old || !trans.next) return;
  const p = ease(trans.age / trans.duration);
  trans.old.style.opacity = 1 - p;
  trans.old.style.transform = `translateX(${-15 * p}px) scale(${1 - 0.004 * p})`;
  trans.next.style.opacity = p;
  trans.next.style.transform = `translateX(${20 * (1 - p)}px) scale(${0.997 + 0.003 * p})`;
}

const transitionRegister = registerTransition;

function transitionDescriptor(id) {
  return TRANSITIONS[id] || TRANSITIONS.flood;
}

function transitionNextStyle() {
  if (!TRANSITION_BAG.length) {
    const values = [...TRANSITION_STYLE_IDS];
    const rng = randSeed(4801 + (S.idCounter || 0) * 59 + Math.floor(S.t));
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    if (TRANSITION_LAST !== null && values[0] === TRANSITION_LAST && values.length > 1) {
      [values[0], values[1]] = [values[1], values[0]];
    }
    TRANSITION_BAG = values;
  }
  const next = TRANSITION_BAG.shift();
  TRANSITION_LAST = next;
  return next;
}

function transitionCreateWash(layer) {
  const el = document.createElement('div');
  el.className = 'transition-wash';
  layer.append(el);
  return el;
}

function transitionCleanup() {
  const layer = $('transition-layer');
  if (layer) {
    layer.replaceChildren();
    layer.classList.remove('active');
  }
}

function transitionStart(styleId, oldRoot, prevSceneId, nextRoot) {
  if (S.still) return null;
  const oldSceneId = oldRoot?.dataset?.scene;
  const nextSceneId = nextRoot?.dataset?.scene;
  if (oldSceneId !== undefined && nextSceneId !== undefined && oldSceneId === nextSceneId && String(prevSceneId) === oldSceneId) {
    if (prevSceneId !== 0 && oldRoot) {
      try { sceneDescriptor(prevSceneId).onLeave?.(oldRoot); } catch (e) { log('scene_onleave_error', { scene: prevSceneId }); }
    }
    oldRoot?.remove();
    nextRoot.style.opacity = '';
    nextRoot.style.transform = '';
    transitionCleanup();
    return null;
  }
  const layer = $('transition-layer');
  if (!layer) return null;
  layer.replaceChildren();
  layer.classList.add('active');
  const desc = transitionDescriptor(styleId);
  const trans = {
    style: styleId,
    descriptor: desc,
    old: oldRoot,
    prev: prevSceneId,
    next: nextRoot,
    phase: 'cover',
    age: 0,
    duration: desc.duration || TRANSITION_NAVE_TOTAL,
    items: [],
    lastVaultAge: null,
    lastVaultPhase: null,
    naveCleaned: false,
  };
  desc.init?.(trans, layer);
  desc.cover?.(trans, 0);
  return trans;
}

const TRANSITION_FLOWS = [
  { id: 'rise', entry: [-0.4, 1], exit: [0.4, -1], spin: 1 },
  { id: 'sweep', entry: [-1, 0.3], exit: [1, -0.3], spin: -1 },
  { id: 'fall', entry: [0.35, -1], exit: [-0.35, 1], spin: 1 },
  { id: 'cross', entry: [-1, -0.6], exit: [1, 0.6], spin: -1 },
];

registerTransition('flood', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});

registerTransition('tide', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});

registerTransition('vortex', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});

registerTransition('storm', {
  cover(trans) { transitionOriginalFrame(trans); },
  reveal(trans) { transitionOriginalFrame(trans); },
});
