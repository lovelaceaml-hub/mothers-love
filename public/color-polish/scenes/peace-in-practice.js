// Scene 9: Peace in Practice.
//
// Restored in Plan 17 Lane 3 to match what the live TV shows today (Plan 12
// production, commit b7d92a0): the title copy, the hands banner art, a
// rotating heart, fourteen ambient floating hearts, and message bubbles drawn
// by the shared orb/floater engine in core/orbs.js and core/motion.js.
//
// Plan 17 Lane 10 adds the two changes Anthony asked for after watching the
// preview on the church TV on 2026-09-19:
//   1. One bubble on this screen is reserved for the very long recognitions,
//      so a very long message fits inside a bubble instead of taking over the
//      whole screen (production replaced all four bubbles with a single
//      reader whenever any chosen record failed smallFits()).
//   2. The big turning heart is a real solid with thickness, drawn here as a
//      shaded three dimensional surface, because the flat image thinned to a
//      card edge as it span.
// Everything else (art, heading, bubble styling, motion, the small floating
// hearts) stays as the live TV shows it.
'use strict';

/* ---------------------------------------------------------------------------
   Reserved long bubble

   Layout, in stage coordinates (the stage is 1812 x 636):

   - Two regular bubbles keep production's own left column positions and
     diameters, ps[0] and ps[2] of the live scene.
   - One reserved bubble sits to their right, centred at (1492, 332). It grows
     with the message: the wider the recognition, the larger the circle and the
     smaller the text, down to the core's 18 px floor at 1920 (36 px drawn at
     3840, where the whole TV is scaled by two).
   - Production's other two positions, ps[1] and ps[3], are where the reserved
     bubble now sits. Four bubbles plus a circle large enough to hold a 500
     grapheme message whole do not both fit to the right of the title and the
     illustration, so this scene now shows three bubbles instead of four.

   "Very long" is measured, not guessed: a record is very long when the core's
   own fitCircle() cannot lay it out whole in a regular bubble, which is the
   same code that lays out the real bubble later.
--------------------------------------------------------------------------- */

// [x, y, diameter] of the two regular bubbles, straight from production.
const PIP_REGULAR_SLOTS = [[885, 23, 312], [824, 323, 304]];
// The smaller of the two regular diameters decides what counts as very long,
// so a record called regular fits either regular bubble.
const PIP_CLASSIFY_DIAMETER = 304;
// Centre of the reserved bubble. Chosen so the largest step clears the title
// keep out box, the heart and hands artwork, and both regular bubbles.
const PIP_RESERVED_CX = 1500;
const PIP_RESERVED_CY = 332;
// Diameter steps for the reserved bubble, smallest first.
const PIP_RESERVED_STEPS = [456, 504, 552];
// Grapheme counts that pick the first step to try. The measured fit check
// below moves up a step whenever a long name or many expression chips make the
// first guess too small, so these are a starting point and not the rule.
const PIP_RESERVED_STEP_GRAPHEMES = [150, 280];
// How many records to look at, in the core's least recently shown order, when
// filling this scene's bubbles.
const PIP_CANDIDATE_SCAN = 10;

let pipSegmenter = null;
const pipFitCache = new Map();

// Grapheme count, as Anthony's ruling asks for: Intl.Segmenter, so an emoji or
// a combining accent counts once rather than once per code unit.
function pipGraphemeCount(text) {
  const value = String(text == null ? '' : text);
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    if (!pipSegmenter) pipSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    let count = 0;
    for (const _segment of pipSegmenter.segment(value)) count++;
    return count;
  }
  return Array.from(value).length;
}

// Does this record lay out whole, on one page, in a circle of this diameter?
// Measured with the core's own fitCircle() on a detached copy of the bubble,
// so the answer is exactly what the real bubble will do. The probe is removed
// again immediately, so nothing else ever sees it.
function pipFitsWhole(record, diameter) {
  if (!record || typeof completeOrb !== 'function' || typeof fitCircle !== 'function') return false;
  const key = diameter + '|' + record.id + '|' + record.name + '|' + record.ids.join(',') + '|' + record.message;
  const cached = pipFitCache.get(key);
  if (cached !== undefined) return cached;
  const probe = document.createElement('div');
  probe.className = 'orb-slot';
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = `position:fixed;left:-9000px;top:0;width:${diameter}px;height:${diameter}px;opacity:0;pointer-events:none;--tint:${catalog[record.ids[0] - 1].color}`;
  probe.dataset.growMax = String(diameter);
  probe.innerHTML = `<div class="orb-life">${completeOrb(record, diameter)}</div>`;
  document.body.append(probe);
  let fits = false;
  try {
    const reading = fitCircle(probe, record, diameter, 0);
    fits = !!reading && reading.pages.length === 1;
  } finally {
    probe.remove();
  }
  if (pipFitCache.size > 600) pipFitCache.clear();
  pipFitCache.set(key, fits);
  return fits;
}

function pipIsVeryLong(record) {
  return !pipFitsWhole(record, PIP_CLASSIFY_DIAMETER);
}

// The smallest reserved step that holds the whole message. Falls back to the
// largest step, where the core pages inside this one bubble and nowhere else.
function pipReservedDiameter(record) {
  if (!record) return PIP_RESERVED_STEPS[0];
  const graphemes = pipGraphemeCount(record.message);
  let index = 0;
  while (index < PIP_RESERVED_STEP_GRAPHEMES.length && graphemes > PIP_RESERVED_STEP_GRAPHEMES[index]) index++;
  while (index < PIP_RESERVED_STEPS.length - 1 && !pipFitsWhole(record, PIP_RESERVED_STEPS[index])) index++;
  return PIP_RESERVED_STEPS[index];
}

// The next few records in the core's own rotation order (least recently shown
// first), skipping anything already on screen.
function pipCandidates(exclude, limit) {
  const seen = [...exclude];
  const out = [];
  for (let i = 0; i < limit; i++) {
    const record = choose(seen);
    if (!record) break;
    seen.push(record.id);
    out.push(record);
  }
  return out;
}

// One very long record for the reserved bubble, plus records that fit whole
// for the regular bubbles. When nothing in the pool is very long the reserved
// bubble takes a regular record, so it is never empty.
function pipChooseSet() {
  const candidates = pipCandidates([], PIP_CANDIDATE_SCAN);
  const veryLong = [];
  const regular = [];
  for (const record of candidates) (pipIsVeryLong(record) ? veryLong : regular).push(record);
  const reserved = veryLong.length ? veryLong[0] : regular.shift() || null;
  return { reserved, regular: regular.slice(0, PIP_REGULAR_SLOTS.length) };
}

// Replacement pick when a bubble retires. The reserved bubble takes the next
// very long record so several of them take turns in it, and falls back to a
// regular record when the pool holds no very long one. A regular bubble only
// ever takes a record that fits it whole.
function pipReplacementFor(isReserved, exclude) {
  const candidates = pipCandidates(exclude, PIP_CANDIDATE_SCAN);
  let fallback = null;
  for (const record of candidates) {
    const veryLong = pipIsVeryLong(record);
    if (isReserved) {
      if (veryLong) return record;
      if (!fallback) fallback = record;
    } else if (!veryLong) {
      return record;
    }
  }
  return isReserved ? fallback : null;
}

// Production's rightBubbles(), rewritten for the reserved bubble. Named
// locally so it never shadows the global rightBubbles() in core/orbs.js that
// the other scenes use.
function pipRightBubbles() {
  const { reserved, regular } = pipChooseSet();
  const largest = PIP_RESERVED_STEPS[PIP_RESERVED_STEPS.length - 1];
  let markup = '';
  if (reserved) {
    const d = pipReservedDiameter(reserved);
    markup += addOrb(reserved, PIP_RESERVED_CX - d / 2, PIP_RESERVED_CY - d / 2, d, { large: true, growMax: largest });
  }
  regular.forEach((record, index) => {
    const [x, y, d] = PIP_REGULAR_SLOTS[index];
    markup += addOrb(record, x, y, d);
  });
  return markup;
}

function pipScene() {
  return `<div style="position:absolute;left:12px;top:36px;width:861px"><div class="eyebrow">Peace in practice</div><h1 style="font-size:61px;letter-spacing:-2px;line-height:1.1;margin:23px 0">May Mother’s ${shimmer('love')}<br>bring ${shimmer('peace')} to the world!</h1><p class="subheading">Love expressed through words and actions.</p></div>${art('hands_banner', 'left:20px;top:393px;width:823px;height:238px;opacity:.8;mask-image:linear-gradient(transparent,#000 20%,#000 85%,transparent)')}<div class="heart-host" id="heart-host" style="left:198px;top:232px;width:390px;height:363px"></div><div id="heart-field"></div>${pipRightBubbles()}`;
}

// Fourteen small ambient hearts drifting behind the bubbles. Same count,
// layout and drift formula as production.
function pipMountAmbientHearts() {
  const root = $('heart-field');
  if (!root) return;
  hearts = [];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'floating-heart';
    const size = 27 + (i % 4) * 13;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.innerHTML = heartSVG(i % 3 === 0 ? '#d6bbc9' : '#e9b1b9');
    root.append(el);
    hearts.push({ el, x: 24 + (i % 7) * 106, y: 276 + Math.floor(i / 7) * 135, phase: i, size });
  }
}

// Called every coordinator tick regardless of the current scene, same as
// production; a no-op whenever hearts is empty (any scene but this one).
function tickHearts(dt) {
  if (S.still) return;
  hearts.forEach((h, i) => {
    const y = 250 + (((h.y - 250 - S.t * (3 + i % 3)) % 330) + 330) % 330;
    h.el.style.transform = `translate(${h.x + Math.sin(S.t / 10 + i) * 22}px,${y}px) rotate(${Math.sin(S.t / 14 + i) * 12}deg) scale(${1 + Math.sin(S.t / 3 + i) * .025})`;
  });
}

/* ---------------------------------------------------------------------------
   The big turning heart, as a real solid

   Anthony on the church TV: "when it spins around it shows as a flat heart, it
   needs to be fully 3D". The live scene rotated a flat PNG with CSS
   perspective, so at ninety degrees it was edge on and almost invisible.

   Technique: a parametric heart surface, shaded and drawn with plain Canvas
   2D. Nothing is fetched, so it satisfies the renderer's content security
   policy (default-src 'none', script-src 'self', img-src 'self' data:), and it
   needs no WebGL context, no library and no new asset file.

   The surface takes the classic heart outline
       x(t) = 16 sin(t)^3
       y(t) = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
   and puffs it into a closed solid: the outline is swept from the back pole to
   the front pole, shrinking toward the heart's centre as sin(psi) and moving
   through the depth axis as -T cos(psi). At psi = 90 degrees it is the full
   heart silhouette; at the poles it closes to a point, the way a stuffed heart
   does. Thickness is 21 units against a 32 unit width, so the silhouette at
   the edge on angle stays about 65 percent of the face on width instead of
   collapsing to a line.

   Shading is a Lambert term over a rose to crimson ramp, a Blinn specular
   highlight that travels with the turn, and a rim term. Each quad is filled
   with a gradient between the shade at its inner ring edge and the shade at
   its outer ring edge, which is what keeps a mesh this size from showing the
   concentric terracing a flat shaded mesh leaves. Back faces are dropped and
   the rest are painted far to near.

   The canvas has twice the pixels of its CSS box, so it is one device pixel
   per canvas pixel on a 3840 wide TV (where the whole TV is scaled by two) and
   supersampled on a 1920 wide one.
--------------------------------------------------------------------------- */

const PIP_HEART_SEGMENTS = 216;       // samples around the outline
const PIP_HEART_RINGS = 16;           // rings from back pole to front pole (even, so one ring sits on the equator and forms the silhouette)
const PIP_HEART_HALF_DEPTH = 10.5;    // half thickness, in model units
const PIP_HEART_HEIGHT_SCALE = 1.09;  // matches the live artwork's proportions
const PIP_HEART_UNIT = 18.75;         // canvas pixels per model unit
const PIP_HEART_CANVAS_W = 780;       // twice the 390 px CSS width of the host
const PIP_HEART_CANVAS_H = 726;       // twice the 363 px CSS height of the host
const PIP_HEART_DEGREES_PER_T = 7.5;  // production's turn rate, unchanged
const PIP_HEART_STILL_T = 40 / 7.5;   // three quarter view when motion is off

// Rose and crimson, the colour family of the live artwork.
const PIP_HEART_DEEP = [126, 34, 62];
const PIP_HEART_MID = [206, 86, 122];
const PIP_HEART_LIGHT = [243, 158, 182];
const PIP_HEART_RIM = [255, 196, 214];
const PIP_HEART_SPECULAR = [255, 243, 248];

function pipHeartColour(r, g, b) {
  const ri = r < 0 ? 0 : r > 255 ? 255 : r | 0;
  const gi = g < 0 ? 0 : g > 255 ? 255 : g | 0;
  const bi = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  return 'rgb(' + ri + ',' + gi + ',' + bi + ')';
}

function pipBuildHeartMesh() {
  const NU = PIP_HEART_SEGMENTS;
  const NV = PIP_HEART_RINGS;
  const T = PIP_HEART_HALF_DEPTH;
  const ox = new Float64Array(NU);
  const oy = new Float64Array(NU);
  const dx = new Float64Array(NU);
  const dy = new Float64Array(NU);
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < NU; i++) {
    const t = (i / NU) * Math.PI * 2;
    const s = Math.sin(t);
    const c = Math.cos(t);
    ox[i] = 16 * s * s * s;
    oy[i] = (13 * c - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * PIP_HEART_HEIGHT_SCALE;
    dx[i] = 48 * s * s * c;
    dy[i] = (-13 * s + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t)) * PIP_HEART_HEIGHT_SCALE;
    if (oy[i] < lowest) lowest = oy[i];
    if (oy[i] > highest) highest = oy[i];
  }
  const centreY = (lowest + highest) / 2;

  const count = NU * (NV + 1);
  const vx = new Float64Array(count);
  const vy = new Float64Array(count);
  const vz = new Float64Array(count);
  const screenY = new Float64Array(count);
  for (let j = 0; j <= NV; j++) {
    const psi = (j / NV) * Math.PI;
    const s = Math.sin(psi);
    const c = Math.cos(psi);
    for (let i = 0; i < NU; i++) {
      const k = j * NU + i;
      vx[k] = ox[i] * s;
      vy[k] = (oy[i] - centreY) * s;
      vz[k] = -T * c;
      screenY[k] = PIP_HEART_CANVAS_H / 2 - vy[k] * PIP_HEART_UNIT;
    }
  }

  const quadCount = NU * NV;
  const qa = new Int32Array(quadCount);
  const qb = new Int32Array(quadCount);
  const qc = new Int32Array(quadCount);
  const qd = new Int32Array(quadCount);
  const qnx = new Float64Array(quadCount);
  const qny = new Float64Array(quadCount);
  const qnz = new Float64Array(quadCount);
  const qcx = new Float64Array(quadCount);
  const qcz = new Float64Array(quadCount);
  let q = 0;
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const i2 = (i + 1) % NU;
      qa[q] = j * NU + i;
      qb[q] = j * NU + i2;
      qc[q] = (j + 1) * NU + i2;
      qd[q] = (j + 1) * NU + i;
      q++;
    }
  }

  // Face normals from the quad's own corners, not from the parametric
  // derivatives. Both derivatives vanish at the top cleft and at the bottom
  // point of the heart outline, so an analytic normal is undefined exactly
  // there and produced a dark crease down the middle of the heart and a
  // starburst around the highlight.
  const fnx = new Float64Array(quadCount);
  const fny = new Float64Array(quadCount);
  const fnz = new Float64Array(quadCount);
  for (let n = 0; n < quadCount; n++) {
    const a = qa[n];
    const b = qb[n];
    const c = qc[n];
    const d = qd[n];
    const e1x = vx[c] - vx[a];
    const e1y = vy[c] - vy[a];
    const e1z = vz[c] - vz[a];
    const e2x = vx[d] - vx[b];
    const e2y = vy[d] - vy[b];
    const e2z = vz[d] - vz[b];
    fnx[n] = e1y * e2z - e1z * e2y;
    fny[n] = e1z * e2x - e1x * e2z;
    fnz[n] = e1x * e2y - e1y * e2x;
    qcx[n] = (vx[a] + vx[b] + vx[c] + vx[d]) / 4;
    qcz[n] = (vz[a] + vz[b] + vz[c] + vz[d]) / 4;
  }
  // The winding decides the sign. Check it once against a face whose outward
  // direction is known: the one at the heart's right edge, on the equator,
  // which must face along positive x.
  const reference = Math.floor(NV / 2) * NU + Math.floor(NU / 4);
  const orientation = fnx[reference] < 0 ? -1 : 1;

  // Smooth the shading normals by gathering the surrounding faces at every
  // vertex, the usual way to keep a coarse mesh from looking faceted.
  const snx = new Float64Array(count);
  const sny = new Float64Array(count);
  const snz = new Float64Array(count);
  for (let n = 0; n < quadCount; n++) {
    const x = fnx[n] * orientation;
    const y = fny[n] * orientation;
    const z = fnz[n] * orientation;
    for (const k of [qa[n], qb[n], qc[n], qd[n]]) {
      snx[k] += x;
      sny[k] += y;
      snz[k] += z;
    }
  }
  for (let k = 0; k < count; k++) {
    const length = Math.sqrt(snx[k] * snx[k] + sny[k] * sny[k] + snz[k] * snz[k]) || 1;
    snx[k] /= length;
    sny[k] /= length;
    snz[k] /= length;
  }
  for (let n = 0; n < quadCount; n++) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const k of [qa[n], qb[n], qc[n], qd[n]]) {
      x += snx[k];
      y += sny[k];
      z += snz[k];
    }
    const length = Math.sqrt(x * x + y * y + z * z) || 1;
    qnx[n] = x / length;
    qny[n] = y / length;
    qnz[n] = z / length;
  }

  // The shade of a quad is interpolated between its inner ring edge and its
  // outer ring edge, so store the smooth normal at each of those two edges.
  const qinx = new Float64Array(quadCount);
  const qiny = new Float64Array(quadCount);
  const qinz = new Float64Array(quadCount);
  const qoutx = new Float64Array(quadCount);
  const qouty = new Float64Array(quadCount);
  const qoutz = new Float64Array(quadCount);
  for (let n = 0; n < quadCount; n++) {
    const a = qa[n];
    const b = qb[n];
    const c = qc[n];
    const d = qd[n];
    let x = snx[a] + snx[b];
    let y = sny[a] + sny[b];
    let z = snz[a] + snz[b];
    let length = Math.sqrt(x * x + y * y + z * z) || 1;
    qinx[n] = x / length;
    qiny[n] = y / length;
    qinz[n] = z / length;
    x = snx[c] + snx[d];
    y = sny[c] + sny[d];
    z = snz[c] + snz[d];
    length = Math.sqrt(x * x + y * y + z * z) || 1;
    qoutx[n] = x / length;
    qouty[n] = y / length;
    qoutz[n] = z / length;
  }

  return { count, vx, vz, screenY, quadCount, qa, qb, qc, qd, qnx, qny, qnz, qcx, qcz, qinx, qiny, qinz, qoutx, qouty, qoutz };
}

// The light, shared by both drawing paths: upper left and in front, so the
// highlight travels across the face as the heart turns.
const PIP_HEART_LIGHT_RAW = [-0.42, 0.66, 0.62];

function pipCreateHeartRenderer() {
  const canvas = document.createElement('canvas');
  canvas.width = PIP_HEART_CANVAS_W;
  canvas.height = PIP_HEART_CANVAS_H;
  canvas.className = 'pip-heart';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A turning three dimensional heart');
  return pipHeartPainter(canvas, pipBuildHeartMesh());
}

// The mesh painted far to near with Canvas 2D. Plain 2D is used rather than
// WebGL so that one code path runs everywhere, including a TV browser with no
// working WebGL context, and so the shipped path is the one the scene spec and
// the repository probe both exercise.
function pipHeartPainter(canvas, mesh) {
  const context = canvas.getContext('2d');
  const screenX = new Float64Array(mesh.count);
  const depth = new Float64Array(mesh.quadCount);
  const inner = new Array(mesh.quadCount);
  const outer = new Array(mesh.quadCount);
  const order = [];
  const lightLength = Math.sqrt(PIP_HEART_LIGHT_RAW[0] ** 2 + PIP_HEART_LIGHT_RAW[1] ** 2 + PIP_HEART_LIGHT_RAW[2] ** 2);
  const lx = PIP_HEART_LIGHT_RAW[0] / lightLength;
  const ly = PIP_HEART_LIGHT_RAW[1] / lightLength;
  const lz = PIP_HEART_LIGHT_RAW[2] / lightLength;
  const halfLength = Math.sqrt(lx * lx + ly * ly + (lz + 1) * (lz + 1));
  const hx = lx / halfLength;
  const hy = ly / halfLength;
  const hz = (lz + 1) / halfLength;
  let lastAngle = null;

  // Shade for one normal, already rotated into screen space.
  function shadeFor(nx, ny, nz) {
    let lambert = nx * lx + ny * ly + nz * lz;
    if (lambert < 0) lambert = 0;
    let specular = nx * hx + ny * hy + nz * hz;
    specular = specular <= 0 ? 0 : Math.pow(specular, 22) * 0.75;
    const facing = nz < 0 ? 1 : 1 - nz;
    const rim = facing * facing * facing;
    // A quadratic blend through the middle tone, so there is no crease where a
    // two piece ramp would join.
    const t = Math.pow(lambert, 0.85);
    const u = 1 - t;
    const w0 = u * u;
    const w1 = 2 * u * t;
    const w2 = t * t;
    const r = PIP_HEART_DEEP[0] * w0 + PIP_HEART_MID[0] * w1 + PIP_HEART_LIGHT[0] * w2 + rim * 0.3 * PIP_HEART_RIM[0] + specular * PIP_HEART_SPECULAR[0];
    const g = PIP_HEART_DEEP[1] * w0 + PIP_HEART_MID[1] * w1 + PIP_HEART_LIGHT[1] * w2 + rim * 0.3 * PIP_HEART_RIM[1] + specular * PIP_HEART_SPECULAR[1];
    const b = PIP_HEART_DEEP[2] * w0 + PIP_HEART_MID[2] * w1 + PIP_HEART_LIGHT[2] * w2 + rim * 0.3 * PIP_HEART_RIM[2] + specular * PIP_HEART_SPECULAR[2];
    return pipHeartColour(r, g, b);
  }

  function draw(t) {
    const degrees = t * PIP_HEART_DEGREES_PER_T;
    if (lastAngle !== null && Math.abs(degrees - lastAngle) < 0.02) return;
    lastAngle = degrees;
    const radians = degrees * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const centre = PIP_HEART_CANVAS_W / 2;
    for (let k = 0; k < mesh.count; k++) {
      screenX[k] = centre + (mesh.vx[k] * cos + mesh.vz[k] * sin) * PIP_HEART_UNIT;
    }
    order.length = 0;
    for (let q = 0; q < mesh.quadCount; q++) {
      if (-mesh.qnx[q] * sin + mesh.qnz[q] * cos <= 0) continue;
      inner[q] = shadeFor(mesh.qinx[q] * cos + mesh.qinz[q] * sin, mesh.qiny[q], -mesh.qinx[q] * sin + mesh.qinz[q] * cos);
      outer[q] = shadeFor(mesh.qoutx[q] * cos + mesh.qoutz[q] * sin, mesh.qouty[q], -mesh.qoutx[q] * sin + mesh.qoutz[q] * cos);
      depth[q] = -mesh.qcx[q] * sin + mesh.qcz[q] * cos;
      order.push(q);
    }
    order.sort((a, b) => depth[a] - depth[b]);
    context.clearRect(0, 0, PIP_HEART_CANVAS_W, PIP_HEART_CANVAS_H);
    context.lineJoin = 'round';
    context.lineWidth = 1;
    for (let n = 0; n < order.length; n++) {
      const q = order[n];
      const a = mesh.qa[q];
      const b = mesh.qb[q];
      const c = mesh.qc[q];
      const d = mesh.qd[q];
      const ax = screenX[a];
      const ay = mesh.screenY[a];
      const bx = screenX[b];
      const by = mesh.screenY[b];
      const cx = screenX[c];
      const cy = mesh.screenY[c];
      const dx = screenX[d];
      const dy = mesh.screenY[d];
      // A gradient across the ring direction instead of one flat tone, which is
      // what removed the concentric terracing a flat shaded mesh leaves.
      const gradient = context.createLinearGradient((ax + bx) / 2, (ay + by) / 2, (cx + dx) / 2, (cy + dy) / 2);
      gradient.addColorStop(0, inner[q]);
      gradient.addColorStop(1, outer[q]);
      context.fillStyle = gradient;
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(ax, ay);
      context.lineTo(bx, by);
      context.lineTo(cx, cy);
      context.lineTo(dx, dy);
      context.closePath();
      context.fill();
      context.stroke();
    }
  }

  canvas.dataset.technique = 'canvas2d';
  return { canvas, draw, technique: 'canvas2d', quads: mesh.quadCount };
}

function pipMountHeart() {
  const host = $('heart-host');
  if (!host) return;
  if (!heartRenderer) heartRenderer = pipCreateHeartRenderer();
  // A named handle for the scene spec and for checking the frame cost by hand,
  // alongside the renderer's existing colorPolishRuntime debug surface.
  window.pipHeartRenderer = heartRenderer;
  host.append(heartRenderer.canvas);
  heartRenderer.draw(S.still ? PIP_HEART_STILL_T : S.t);
}

registerScene(9, {
  markup: pipScene,
  mount() {
    pipMountHeart();
    pipMountAmbientHearts();
    // The core marks any actor whose record fails smallFits() as large, which
    // freezes it in place. Only the reserved bubble is meant to hold still;
    // the regular bubbles keep the live drift, because this scene now only
    // gives them messages that fit their bubble whole.
    V.actors.forEach((actor) => {
      const slot = slots.find((entry) => entry.key === actor.key);
      if (slot) actor.large = !!slot.large;
    });
  },
  floaters: true,
  fxCanvas: true,
  replaceMode: 'hearts',
  // A retiring bubble takes its replacement from this scene's own rule rather
  // than the core's next record: very long recognitions only ever appear in
  // the reserved bubble, and take turns in it.
  onRetire(actor) {
    const slot = slots.find((entry) => entry.key === actor.key);
    const isReserved = !!slot?.large;
    const onScreen = [];
    for (const other of V.actors) {
      if (other.id && other.id !== actor.id) onScreen.push(other.id);
      if (other.nextId && other.key !== actor.key) onScreen.push(other.nextId);
    }
    const next = pipReplacementFor(isReserved, onScreen);
    actor.nextId = next ? next.id : actor.id;
  },
  // The first box is production's own forbidden() box for scene 9: keep the
  // floating bubbles clear of the title copy. The second box is new with the
  // reserved bubble. Production kept four bubbles on the right, and four
  // bubbles of a similar size hold each other there. With two regular bubbles
  // and one large reserved one, the regular pair has far more room to wander,
  // and they drifted across the turning heart, the raised hands and the
  // flowers. This box keeps them off the artwork, which is the arrangement the
  // live TV shows: bubbles on the right, illustration clear on the left.
  keepOut: () => [{ x: 0, y: 10, w: 870, h: 276 }, { x: 0, y: 250, w: 700, h: 386 }]
});
