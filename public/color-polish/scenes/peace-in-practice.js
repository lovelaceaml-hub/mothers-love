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
//
// A Plan 17 handoff on 2026-09-19 adds a third, after Anthony saw the solid on
// the TV and found it plain:
//   3. Flowing ribbons of gold sweep around the turning heart, behind it and
//      in front of it, and the heart beats, floats and glows.
// Everything else (art, heading, bubble styling, motion, the small floating
// hearts) stays as the live TV shows it.
//
// Anthony, 2026-09-20, replaces that heart and its thick gold hoops with the
// approved three dimensional study: a sculpted rose heart with sheer pearl and
// champagne ribbons, drawn with WebGL 2 by peace-in-practice-heart3d.js. The
// Canvas 2D solid below is kept, unchanged, as what the scene shows when
// WebGL 2 cannot be had. See "Mounting the heart" at the foot of this file.
'use strict';

/* ---------------------------------------------------------------------------
   Reserved long bubble

   Layout, in stage coordinates (the stage is 1812 x 636):

   - Two regular bubbles keep production's own left column positions and
     diameters, ps[0] and ps[2] of the live scene.
   - One reserved bubble sits to their right, centred at (1500, 332). It grows
     with the message: the wider the recognition, the larger the circle and the
     smaller the text, down to the core's 18 px floor at 1920 (36 px drawn at
     3840, where the whole TV is scaled by two).
   - Production's other two positions, ps[1] and ps[3], are where the reserved
     bubble now sits. Four bubbles plus a circle large enough to hold a 500
     grapheme message whole do not both fit to the right of the title and the
     illustration, so this scene now shows three bubbles instead of four.

   - The reserved bubble changes its message where it stands (the words fade,
     the circle eases to the next size, the next words fade in), the same way
     the reserved bubble on We Are Peacemakers does, so its place is never
     empty. A message stays at least 18 seconds, or its whole reading time if
     longer, and the next one is only taken if there is still time to read it
     before the scene ends (the dwell is read from state).

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
// How far down the core's least recently shown order to look for a record a
// bubble may show.
const PIP_CANDIDATE_SCAN = 24;
// Seconds a regular bubble waits before trying again, when nothing may replace it.
const PIP_RETRY = 12;
// Seconds a message stays in the reserved bubble before another may take its
// turn; a long message stays for its whole reading time if that is longer.
const PIP_RESERVED_HOLD = 18;
// Seconds the reserved bubble's words take to fade out, and seconds the circle
// takes to ease to the next message's size, before the next words fade in.
const PIP_RESERVED_FADE = 0.6;
const PIP_RESERVED_RESIZE = 0.7;

let pipReservedKey = null;
let pipSegmenter = null;

// The slot key of the reserved bubble in the current render, or null. Read by
// this scene's spec and useful in QA.
function pipReservedSlotKey() {
  return pipReservedKey;
}
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

// The next record in the core's own rotation order (least recently shown
// first) that a bubble is allowed to show, or null.
function pipPick(exclude, allowed) {
  const tried = exclude.slice();
  for (let i = 0; i < PIP_CANDIDATE_SCAN; i++) {
    const record = choose(tried);
    if (!record) return null;
    if (allowed(record)) return record;
    tried.push(record.id);
  }
  return null;
}

// Everything the other bubbles are showing or are about to show.
function pipTaken(actor) {
  const taken = [];
  for (const other of V.actors) {
    if (other === actor) continue;
    if (other.id) taken.push(other.id);
    if (other.nextId) taken.push(other.nextId);
    if (other.pipNext) taken.push(other.pipNext);
  }
  return taken;
}

// Seconds left in this showing of the scene, read from state. When the scene
// is held (rotation paused, or a scene chosen by the operator) it does not
// end, so there is no limit.
function pipTimeLeft() {
  if (S.pauseRotation || S.sceneControlled || !S.playlist?.length) return Infinity;
  return (S.dwell?.[S.s] ?? DWELL[S.s] ?? 0) - S.sceneAge;
}

// core/motion.js tickSlots()'s own reading time for a message.
function pipReadSeconds(record) {
  return Math.max(9, record.message.length / 14);
}

// What a regular bubble may show next, or null to keep the one it has: only a
// message that fits a regular bubble whole.
function pipRegularCandidate(actor) {
  const taken = pipTaken(actor);
  taken.push(actor.id);
  return pipPick(taken, (record) => !pipIsVeryLong(record));
}

// What the reserved bubble may show next, or null to keep the one it has.
// Another very long recognition comes first, so several of them take turns.
// When none is waiting, a regular message takes a turn, so the biggest bubble
// on the screen does not show the same words for the whole scene. Either way
// the next message must have time to be read before the scene ends.
function pipReservedCandidate(actor) {
  const taken = pipTaken(actor);
  taken.push(actor.id);
  const room = pipTimeLeft() - PIP_RESERVED_FADE - PIP_RESERVED_RESIZE;
  const readable = (record) => pipReadSeconds(record) <= room;
  return pipPick(taken, (record) => pipIsVeryLong(record) && readable(record))
    || pipPick(taken, (record) => !pipIsVeryLong(record) && readable(record));
}

function pipSetReservedDiameter(actor, d) {
  actor.d = d;
  actor.el.style.width = d + 'px';
  actor.el.style.height = d + 'px';
  const slot = slots.find((entry) => entry.key === actor.key);
  if (slot) slot.d = d;
}

// The reserved bubble changes its message where it stands: the words fade
// out, the circle eases to the size the next message needs, the next message
// is installed by core/motion.js installNext() (so it is measured and fitted
// exactly like every other bubble), and the words fade in. It never bursts or
// leaves the stage, so its place is never empty.
function pipTurnReserved(actor) {
  if (actor.life !== 'steady') return;
  // The core's replacement never takes this bubble.
  actor.retireAt = Infinity;
  actor.homeX = actor.x = PIP_RESERVED_CX;
  actor.homeY = actor.y = PIP_RESERVED_CY;
  if (actor.pipNext) {
    const since = V.clock - actor.pipFadeAt;
    if (since < PIP_RESERVED_FADE) return;
    if (actor.pipToD !== actor.pipFromD) {
      const progress = Math.min(1, (since - PIP_RESERVED_FADE) / PIP_RESERVED_RESIZE);
      pipSetReservedDiameter(actor, mix(actor.pipFromD, actor.pipToD, smooth(progress)));
      if (progress < 1) return;
    }
    const next = actor.pipNext;
    actor.pipNext = null;
    actor.nextId = next;
    installNext(actor);
    // installNext() starts the core's fly-in; this bubble stays where it is.
    actor.nextId = null;
    actor.life = 'steady';
    actor.lifeAt = V.clock;
    actor.born = V.clock;
    actor.retireAt = Infinity;
    actor.homeX = actor.x = PIP_RESERVED_CX;
    actor.homeY = actor.y = PIP_RESERVED_CY;
    actor.el.classList.remove('pip-words-out');
    actor.el.classList.add('pip-words-in');
    if (actor.id === next) pipReport('turn');
    return;
  }
  const read = (actor.reading?.pages || []).reduce((total, page) => total + Math.max(9, page.length / 14), 0);
  if (V.clock < actor.born + Math.max(read, PIP_RESERVED_HOLD)) return;
  if (V.clock - (actor.pipProbedAt || 0) < 0.75) return;
  actor.pipProbedAt = V.clock;
  const pick = pipReservedCandidate(actor);
  if (!pick) return;
  actor.pipNext = pick.id;
  actor.pipFadeAt = V.clock;
  actor.pipFromD = actor.d;
  actor.pipToD = pipReservedDiameter(pick);
  actor.el.classList.remove('pip-words-in');
  actor.el.classList.add('pip-words-out');
  log('pip_replacement', { key: actor.key, reserved: true, id: pick.id });
}

// Runs for every bubble on every physics frame, before core/motion.js moves
// it and before core/motion.js tickSlots() decides a replacement. It returns
// false so the live drift runs untouched; it only corrects which record a
// bubble is about to take and where a new bubble comes in from.
function pipIntegrate(actor) {
  if (!V.actors || !V.actors.length) return false;
  if (actor.key === pipReservedKey) {
    pipTurnReserved(actor);
    return false;
  }
  if (actor.nextId && actor.pipFor !== actor.nextId) {
    // replaceActor() picked by recency alone, which can put a very long
    // recognition in a regular bubble. Pick again under this scene's rule.
    const pick = pipRegularCandidate(actor);
    const next = pick ? pick.id : actor.id;
    actor.nextId = next;
    actor.pipFor = next;
    log('pip_replacement', { key: actor.key, reserved: false, id: next });
  }
  if (!actor.nextId) actor.pipFor = null;
  if (actor.life === 'entering' && actor.pipEntered !== actor.lifeAt) {
    // Of production's three ways in (from the left, from the right, from
    // below), a new bubble here always rises from below its resting place.
    // From the right it would slide under the reserved bubble, and from the
    // left across the heading and the turning heart.
    actor.pipEntered = actor.lifeAt;
    actor.originX = clamp(actor.homeX - actor.rng() * 80, 180, 1620);
    actor.originY = 720;
  }
  if (actor.life === 'steady' && !actor.nextId
    && V.clock >= Math.max(actor.retireAt, actor.born + (actor.minRead || 0))
    && V.clock - (actor.pipProbedAt || 0) >= 0.75) {
    actor.pipProbedAt = V.clock;
    // Hold the bubble rather than burst it with nothing allowed to take its
    // place; an empty bubble is never an option.
    if (!pipRegularCandidate(actor)) {
      actor.retireAt = V.clock + PIP_RETRY;
      log('pip_hold', { key: actor.key, reserved: false });
    }
  }
  return false;
}

// Production's rightBubbles(), rewritten for the reserved bubble. Named
// locally so it never shadows the global rightBubbles() in core/orbs.js that
// the other scenes use. One very long record goes to the reserved bubble; when
// nothing in the pool is very long it takes a regular record, so it is never
// empty. The regular bubbles only take records that fit them whole.
function pipRightBubbles() {
  pipReservedKey = null;
  const used = [];
  const largest = PIP_RESERVED_STEPS[PIP_RESERVED_STEPS.length - 1];
  let markup = '';
  const reserved = pipPick(used, pipIsVeryLong) || choose(used);
  if (reserved) {
    const d = pipReservedDiameter(reserved);
    markup += addOrb(reserved, PIP_RESERVED_CX - d / 2, PIP_RESERVED_CY - d / 2, d, { large: true, growMax: largest });
    pipReservedKey = slots[slots.length - 1].key;
    used.push(reserved.id);
  }
  for (const [x, y, d] of PIP_REGULAR_SLOTS) {
    const record = pipPick(used, (candidate) => !pipIsVeryLong(candidate));
    if (!record) continue;
    markup += addOrb(record, x, y, d);
    used.push(record.id);
  }
  return markup;
}

// Runs after core/stage.js checkFullFits() has measured every bubble, so these
// are the numbers the TV is actually drawing.
function pipReport(when) {
  const reserved = slots.find((slot) => slot.key === pipReservedKey);
  if (!reserved) return;
  const record = S.pool.find((item) => item.id === reserved.id);
  if (!record) return;
  const pages = reserved.reading?.pages?.length || 1;
  const read = (reserved.reading?.pages || [record.message]).reduce((total, page) => total + Math.max(9, page.length / 14), 0);
  const size = reserved.el?.querySelector('.message')?.style.fontSize || '';
  log('pip_reserved', {
    when,
    id: record.id,
    graphemes: pipGraphemeCount(record.message),
    diameter: reserved.d,
    fontSize: parseFloat(size) || 0,
    pages,
    readSeconds: +read.toFixed(2),
    dwell: S.dwell?.[S.s] ?? DWELL[S.s] ?? 0,
    sceneAge: +S.sceneAge.toFixed(2),
    veryLong: pipIsVeryLong(record)
  });
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

   Technique: a smooth heart solid, shaded for every pixel and drawn with plain
   Canvas 2D. Nothing is fetched, so it satisfies the renderer's content
   security policy (default-src 'none', script-src 'self', img-src 'self'
   data:), and it needs no WebGL context, no library and no new asset file.

   The solid is the classic algebraic heart surface
       (x^2 + 9/4 y^2 + z^2 - 1)^3 - x^2 z^3 - 9/80 y^2 z^3 = 0
   (x across, z up, y through the depth). Face on it is the same rounded heart
   as the live artwork. It is one smooth surface, so there is no seam down the
   middle and no facet to show: the cleft is a soft dimple, as on a balloon.
   The depth is scaled so the heart is a little under half as thick as it is
   wide, fuller behind the two lobes and tapering to the point, so that edge on
   it still reads as a heart seen from the side and not as an egg.

   Drawing: the solid is turned about its vertical axis, so every pixel row of
   the picture is an independent slice of the solid. For each row the slice's
   outline (front surface and back surface) is turned, its visible side is
   painted along the row with a one row depth buffer, and every pixel gets its
   own surface normal, looked up in a small pre-lit sphere table (soft wrap
   light, a broad gloss with a tight core, a low bounce light, gentle rim
   darkening). The light is fixed to the screen, so the highlight slides over
   the surface as the heart turns. The shading is drawn at the scene's own 390
   x 363 size; on a 3840 wide TV it is enlarged smoothly by two, and the
   outline is cut at full device resolution with an antialiased vector path,
   so the edge stays crisp at either width and no band or streak can form.
--------------------------------------------------------------------------- */

const PIP_HEART_BOX_W = 390;          // the live #heart-host box, CSS pixels
const PIP_HEART_BOX_H = 363;
const PIP_HEART_WIDTH = 279;          // face on width in CSS pixels, as the live artwork (278)
const PIP_HEART_THICKNESS = 0.46;     // greatest thickness as a share of the face on width
const PIP_HEART_TAPER = 0.35;         // how much fuller the depth is toward the lobes than toward the point
const PIP_HEART_DEGREES_PER_T = 7.5;  // production's turn rate, unchanged
const PIP_HEART_STILL_T = 40 / 7.5;   // three quarter view when motion is off
const PIP_HEART_REDRAW_DEGREES = 0.1; // a smaller turn than this moves the edge under a fifth of a TV pixel
const PIP_HEART_TABLE = 512;          // the pre-lit sphere table is 512 x 512
const PIP_HEART_FOLD_STEP = 6;        // a jump in depth, in pixels, that marks one part passing in front of another

// Rose and crimson, measured from the live artwork (heart_render.png).
const PIP_HEART_DEEP = [146, 58, 82];
const PIP_HEART_MID = [214, 90, 121];
const PIP_HEART_LIGHT = [250, 124, 152];
const PIP_HEART_GLOSS = [255, 190, 211];
const PIP_HEART_CORE = [255, 244, 248];
const PIP_HEART_BOUNCE = [255, 150, 172];

// The algebraic heart's own measurements, in its own units.
const PIP_HEART_A = 9 / 4;
const PIP_HEART_B = 9 / 80;
const PIP_HEART_HALF_SPAN = 1.139;    // greatest |x| of the face on outline
const PIP_HEART_TOP = 1.2365;         // height of the two lobe tops
const PIP_HEART_BOTTOM = -1;          // height of the point
const PIP_HEART_LOBE_X = 0.5;         // |x| of the two lobe tops
const PIP_HEART_MAX_PROFILE = 0.752;  // greatest tapered half depth before scaling, see pipHeartDepthScale

let pipHeartModel = null;
let pipHeartTable = null;

// Depth scale at a given height: fuller toward the lobes, thinner toward the
// point. Returns [scale, slope].
function pipHeartDepthScale(z) {
  const k0 = PIP_HEART_THICKNESS * PIP_HEART_HALF_SPAN / PIP_HEART_MAX_PROFILE;
  return [k0 * (1 + PIP_HEART_TAPER * z), k0 * PIP_HEART_TAPER];
}

// Face on outline test: negative inside.
function pipHeartOutline(x, z) {
  const q = x * x + z * z - 1;
  return q * q * q - x * x * z * z * z;
}

// Every pixel row of the heart, sliced once: sample points along the front
// surface with their half depth and surface normal. The back surface is the
// mirror image, so it is not stored.
function pipBuildHeartModel() {
  const W = PIP_HEART_BOX_W;
  const H = PIP_HEART_BOX_H;
  const unit = PIP_HEART_WIDTH / (2 * PIP_HEART_HALF_SPAN);
  const centreX = W / 2;
  const centreY = H / 2;
  const centreZ = (PIP_HEART_TOP + PIP_HEART_BOTTOM) / 2;
  const a = PIP_HEART_A;
  const b = PIP_HEART_B;

  const rowStart = [];   // first interval index of each row
  const spanFirst = [];  // per interval: first sample index
  const spanCount = [];  // per interval: sample count
  const spanRow = [];    // per interval: pixel row
  const sx = [];
  const sh = [];
  const snx = [];
  const sny = [];
  const snz = [];

  const refine = (z, inside, outside) => {
    for (let i = 0; i < 40; i++) {
      const mid = (inside + outside) / 2;
      if (pipHeartOutline(mid, z) < 0) inside = mid; else outside = mid;
    }
    return (inside + outside) / 2;
  };

  const addSpan = (row, z, x0, x1) => {
    const [k, slope] = pipHeartDepthScale(z);
    const widthPx = (x1 - x0) * unit;
    const n = Math.max(6, Math.ceil(widthPx * 1.15) + 8);
    spanFirst.push(sx.length);
    spanCount.push(n);
    spanRow.push(row);
    const z3 = z * z * z;
    for (let i = 0; i < n; i++) {
      // Cosine spacing: close together at the two rims, where the surface
      // turns fastest, so the samples are even along the slice's outline.
      const x = i === 0 ? x0 : i === n - 1 ? x1 : x0 + (x1 - x0) * (1 - Math.cos(Math.PI * i / (n - 1))) / 2;
      let s = 0;
      if (i > 0 && i < n - 1) {
        // Smallest positive root in s = y^2 of (A + a s)^3 - z^3 (x^2 + b s).
        const A = x * x + z * z - 1;
        let low = 0;
        let high = 0.6;
        for (let j = 0; j < 30; j++) {
          const mid = (low + high) / 2;
          const q = A + a * mid;
          if (q * q * q - z3 * (x * x + b * mid) < 0) low = mid; else high = mid;
        }
        s = (low + high) / 2;
      }
      const y = Math.sqrt(s);
      const q = x * x + a * s + z * z - 1;
      const fx = 6 * x * q * q - 2 * x * z3;
      const fy = 6 * a * y * q * q - 2 * b * y * z3;
      const fz = 6 * z * q * q - 3 * z * z * (x * x + b * s);
      let nx = fx;
      let nz = fy / k;
      let ny = fz - fy * y * slope / k;
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (length > 1e-12) {
        nx /= length;
        ny /= length;
        nz /= length;
      } else {
        nx = 0;
        ny = z > 0 ? 1 : -1;
        nz = 0;
      }
      sx.push(x * unit);
      sh.push(y * k * unit);
      snx.push(nx);
      sny.push(ny);
      snz.push(nz);
    }
  };

  let firstRow = -1;
  let lastRow = -1;
  for (let row = 0; row < H; row++) {
    rowStart.push(spanFirst.length);
    const z = centreZ + (centreY - (row + 0.5)) / unit;
    if (z >= PIP_HEART_TOP || z <= PIP_HEART_BOTTOM) continue;
    // Walk outward from the centre line in quarter pixel steps to find where
    // the outline is crossed, then refine each crossing.
    const step = 0.25 / unit;
    let inner = null;
    let outer = null;
    let wasInside = pipHeartOutline(0, z) < 0;
    if (wasInside) inner = 0;
    for (let x = step; x <= PIP_HEART_HALF_SPAN + 2 * step; x += step) {
      const isInside = pipHeartOutline(x, z) < 0;
      if (isInside && !wasInside && inner === null) inner = refine(z, x, x - step);
      if (!isInside && wasInside && outer === null) outer = refine(z, x - step, x);
      wasInside = isInside;
    }
    if (inner === null || outer === null || outer - inner <= 0) continue;
    if (firstRow < 0) firstRow = row;
    lastRow = row;
    if (inner > 0) {
      addSpan(row, z, -outer, -inner);
      addSpan(row, z, inner, outer);
    } else {
      addSpan(row, z, -outer, outer);
    }
  }
  rowStart.push(spanFirst.length);

  return {
    W,
    H,
    centreX,
    firstRow,
    lastRow,
    topY: centreY - (PIP_HEART_TOP - centreZ) * unit,
    bottomY: centreY - (PIP_HEART_BOTTOM - centreZ) * unit,
    lobeX: PIP_HEART_LOBE_X * unit,
    rowStart: Int32Array.from(rowStart),
    spanFirst: Int32Array.from(spanFirst),
    spanCount: Int32Array.from(spanCount),
    x: Float32Array.from(sx),
    h: Float32Array.from(sh),
    nx: Float32Array.from(snx),
    ny: Float32Array.from(sny),
    nz: Float32Array.from(snz)
  };
}

// The pre-lit sphere: the colour of a surface facing (nx, ny), for every
// direction that can face the viewer. Light from the upper left and in front.
function pipBuildHeartTable() {
  const N = PIP_HEART_TABLE;
  const table = new Uint32Array(N * N);
  const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const norm = (v) => {
    const length = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
  };
  const key = norm([-0.46, 0.6, 0.66]);
  const half = norm([key[0], key[1], key[2] + 1]);
  const bounce = norm([0.62, -0.55, 0.42]);
  for (let j = 0; j < N; j++) {
    const ny = (j / (N - 1)) * 2 - 1;
    for (let i = 0; i < N; i++) {
      const nx = (i / (N - 1)) * 2 - 1;
      let planar = nx * nx + ny * ny;
      let ux = nx;
      let uy = ny;
      if (planar > 1) {
        const length = Math.sqrt(planar);
        ux /= length;
        uy /= length;
        planar = 1;
      }
      const uz = Math.sqrt(1 - planar);
      // Wrapped diffuse light, so the shaded side falls away softly.
      let wrap = (ux * key[0] + uy * key[1] + uz * key[2] + 0.3) / 1.3;
      wrap = wrap < 0 ? 0 : wrap;
      const tone = wrap * wrap * (3 - 2 * wrap);
      const u = 1 - tone;
      const w0 = u * u;
      const w1 = 2 * u * tone;
      const w2 = tone * tone;
      let gloss = ux * half[0] + uy * half[1] + uz * half[2];
      gloss = gloss < 0 ? 0 : gloss;
      const broad = Math.pow(gloss, 9) * 0.55;
      const core = Math.pow(gloss, 64) * 0.8;
      let fill = ux * bounce[0] + uy * bounce[1] + uz * bounce[2];
      fill = fill < 0 ? 0 : fill * fill * 0.16;
      const edge = 1 - uz;
      const shade = 1 - 0.3 * edge * edge * edge;
      const channel = (c) => {
        let value = PIP_HEART_DEEP[c] * w0 + PIP_HEART_MID[c] * w1 + PIP_HEART_LIGHT[c] * w2;
        value += (PIP_HEART_BOUNCE[c] - value) * fill;
        value *= shade;
        value += (PIP_HEART_GLOSS[c] - value) * broad;
        value += (PIP_HEART_CORE[c] - value) * core;
        return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
      };
      const r = channel(0);
      const g = channel(1);
      const bl = channel(2);
      table[j * N + i] = littleEndian
        ? ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0
        : ((r << 24) | (g << 16) | (bl << 8) | 255) >>> 0;
    }
  }
  return table;
}

/* ---------------------------------------------------------------------------
   Flowing ribbons of gold, and the life around the heart

   Anthony, after seeing the solid on the TV: "it still looks very plain. I want
   you to make it very dynamic with beautiful architecture". A first answer, a
   heart set in raised gold tracery, he turned down: "the gold looks like metal.
   I was imagining flowing ribbons of gold", and he wanted it more majestic.

   So the rose solid stays as it is, and ribbons of gold silk sweep around it,
   two wide and two fine. Each is a real band in space: it climbs around the heart in a wide loose
   spiral from below the point to above the lobes, passes behind the heart and
   then in front of it, twists along its length, tapers to a point at both
   ends, and ripples as it flows. The whole spiral is seen from a little above,
   so the loops open into ovals.

   The ribbons are shaded as cloth and not as metal: a soft body colour from
   the way the band faces the light, and the long sheen silk has, which runs
   along the band and slides as it twists. Nothing here is a hard highlight.

   Which side of the heart a piece of ribbon is on is not guessed: each piece
   is compared with the depth of the solid painted at that spot, and is drawn
   on the layer behind the solid or the layer in front of it.

   Everything is a function of the scene clock, so a given moment always draws
   the same picture, and with motion off it is drawn once and never again.

   - The ribbons flow around the heart, one circuit in 26 seconds, rippling.
   - A heartbeat: two soft beats every 1.9 seconds. The heart swells by three
     percent, and the glow behind it brightens with each beat.
   - The heart floats: it rises and falls a few pixels and leans a couple of
     degrees either way as it turns.
   - A wide glow cut into rays turns slowly behind it all.
   - Small stars ride along the ribbons and flicker.
--------------------------------------------------------------------------- */

const PIP_RIBBON_PAD_X = 50;          // the ribbon layers reach this far past the heart's box on each side
const PIP_RIBBON_PAD_BOTTOM = 40;     // and this far below it (never above: the subheading is there)
const PIP_RIBBONS = 4;                // two wide ribbons, and two fine ones between them
const PIP_RIBBON_SEGMENTS = 120;      // pieces each ribbon is drawn in
const PIP_RIBBON_TURNS = 1.35;        // times each ribbon goes around the heart
const PIP_RIBBON_RADIUS = 164;        // the heart is at most 140 from its axis, so the ribbons always clear it
const PIP_RIBBON_RADIUS_WAVE = 17;
const PIP_RIBBON_FLARE = 34;          // the two ends stream this much farther out
const PIP_RIBBON_BOTTOM = 118;        // pixels below the heart's centre where a ribbon starts
const PIP_RIBBON_TOP = -100;          // and above it where it ends
const PIP_RIBBON_HEIGHT_WAVE = 19;
const PIP_RIBBON_HALF_WIDTHS = [17, 6.5, 17, 6.5];
const PIP_RIBBON_TILT = 0.4;          // radians the spiral is seen from above
const PIP_RIBBON_CIRCUIT = 26;        // seconds for the ribbons to flow once around
const PIP_RIBBON_DEEP = [176, 112, 30];
const PIP_RIBBON_GOLD = [244, 190, 78];
const PIP_RIBBON_SHEEN = [255, 244, 206];
const PIP_RIBBON_STARS = 3;           // stars riding each ribbon
const PIP_BEAT_SECONDS = 1.9;
const PIP_BEAT_SWELL = 0.03;
const PIP_FLOAT_PIXELS = 4;
const PIP_LEAN_DEGREES = 2.2;
const PIP_STILL_SECONDS = 2.2;        // the moment drawn when motion is off

// 0 to 1: how far into a beat the heart is. Two bumps, the second smaller.
function pipBeat(seconds) {
  const p = ((seconds / PIP_BEAT_SECONDS) % 1 + 1) % 1;
  const bump = (from, length) => {
    const q = (p - from) / length;
    return q <= 0 || q >= 1 ? 0 : Math.sin(Math.PI * q) ** 2;
  };
  return bump(0, 0.2) + 0.6 * bump(0.22, 0.2);
}

// The centre line of ribbon i at u (0 to 1 along it), before the tilt:
// x to the right, y down the screen, z toward the viewer.
function pipRibbonPoint(i, u, seconds, out) {
  const angle = (i / PIP_RIBBONS) * Math.PI * 2 + PIP_RIBBON_TURNS * Math.PI * 2 * u + (seconds / PIP_RIBBON_CIRCUIT) * Math.PI * 2;
  const end = Math.max(0, Math.abs(2 * u - 1) - 0.62) / 0.38;
  const radius = PIP_RIBBON_RADIUS + PIP_RIBBON_FLARE * end * end
    + PIP_RIBBON_RADIUS_WAVE * Math.sin(Math.PI * 2 * 1.1 * u - seconds * 0.8 + 2.1 * i);
  out[0] = radius * Math.cos(angle);
  out[1] = PIP_RIBBON_BOTTOM + (PIP_RIBBON_TOP - PIP_RIBBON_BOTTOM) * u + PIP_RIBBON_HEIGHT_WAVE * Math.sin(Math.PI * 2 * 1.4 * u + seconds * 1.1 + 1.3 * i);
  out[2] = radius * Math.sin(angle);
  return angle;
}

// Draws the ribbons, the glow and the stars on the two layers around the
// solid, and moves the rig. `solid` gives the painted depth of the rose heart.
function pipHeartLife(model, rig, backCanvas, frontCanvas, solid) {
  const W = model.W;
  const H = model.H;
  const fullW = W + 2 * PIP_RIBBON_PAD_X;
  const fullH = H + PIP_RIBBON_PAD_BOTTOM;
  const back = backCanvas.getContext('2d');
  const front = frontCanvas.getContext('2d');
  const centreX = model.centreX;
  const centreY = (model.topY + model.bottomY) / 2;
  const cosTilt = Math.cos(PIP_RIBBON_TILT);
  const sinTilt = Math.sin(PIP_RIBBON_TILT);
  const norm = (v) => {
    const length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  };
  // The light the solid is lit by (upper left, in front), with y down here.
  const light = norm([-0.46, -0.6, 0.66]);
  const half = norm([light[0], light[1], light[2] + 1]);
  const total = PIP_RIBBONS * PIP_RIBBON_SEGMENTS;
  // Per ribbon, per station along it: the two edges on the screen, the depth,
  // and the colour of the piece that starts there.
  const stations = PIP_RIBBON_SEGMENTS + 1;
  const edgeAX = new Float32Array(PIP_RIBBONS * stations);
  const edgeAY = new Float32Array(PIP_RIBBONS * stations);
  const edgeBX = new Float32Array(PIP_RIBBONS * stations);
  const edgeBY = new Float32Array(PIP_RIBBONS * stations);
  const midX = new Float32Array(PIP_RIBBONS * stations);
  const midY = new Float32Array(PIP_RIBBONS * stations);
  const deep = new Float32Array(PIP_RIBBONS * stations);
  const shade = new Float32Array(PIP_RIBBONS * stations);
  const sheen = new Float32Array(PIP_RIBBONS * stations);
  const order = new Int32Array(total);
  const isFront = new Uint8Array(PIP_RIBBONS * stations);
  const p = [0, 0, 0];
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  let auraSprite = null;
  let auraReach = 0;
  let backing = 1;
  let frontPieces = 0;
  let backPieces = 0;
  let starsDrawn = 0;

  function setBacking(next) {
    backing = next;
    for (const layer of [backCanvas, frontCanvas]) {
      layer.width = fullW * backing;
      layer.height = fullH * backing;
    }
    auraSprite = null;
  }

  // The glow behind the heart, cut into twelve rays, drawn once at the size in
  // use and then turned and brightened every frame.
  function buildAura() {
    auraReach = Math.min(centreX + PIP_RIBBON_PAD_X, centreY) - 2;
    auraSprite = document.createElement('canvas');
    auraSprite.width = Math.ceil(auraReach * 2 * backing);
    auraSprite.height = auraSprite.width;
    const sprite = auraSprite.getContext('2d');
    sprite.setTransform(backing, 0, 0, backing, 0, 0);
    const mid = auraReach;
    const glow = sprite.createRadialGradient(mid, mid, 30, mid, mid, auraReach);
    glow.addColorStop(0, 'rgba(255,214,128,1)');
    glow.addColorStop(0.55, 'rgba(255,186,140,0.55)');
    glow.addColorStop(1, 'rgba(255,190,160,0)');
    sprite.fillStyle = glow;
    sprite.fillRect(0, 0, mid * 2, mid * 2);
    sprite.globalCompositeOperation = 'destination-out';
    for (let ray = 0; ray < 12; ray++) {
      const angle = (ray / 12) * Math.PI * 2;
      const width = 0.1 + 0.04 * Math.sin(ray * 2.4);
      const wedge = sprite.createRadialGradient(mid, mid, 70, mid, mid, auraReach);
      wedge.addColorStop(0, 'rgba(0,0,0,0)');
      wedge.addColorStop(1, 'rgba(0,0,0,0.8)');
      sprite.fillStyle = wedge;
      sprite.beginPath();
      sprite.moveTo(mid, mid);
      sprite.arc(mid, mid, auraReach + 4, angle - width, angle + width);
      sprite.closePath();
      sprite.fill();
    }
  }

  // A four pointed star with a soft centre.
  function star(target, x, y, reach, strength) {
    const glow = target.createRadialGradient(x, y, 0, x, y, reach * 0.6);
    glow.addColorStop(0, `rgba(255,255,246,${strength})`);
    glow.addColorStop(0.4, `rgba(255,232,170,${strength * 0.5})`);
    glow.addColorStop(1, 'rgba(255,220,150,0)');
    target.fillStyle = glow;
    target.beginPath();
    target.arc(x, y, reach * 0.6, 0, Math.PI * 2);
    target.fill();
    target.lineCap = 'round';
    target.lineWidth = Math.max(0.7, reach * 0.08);
    for (const [dx, dy, scale] of [[1, 0, 1], [0, 1, 1], [0.7, 0.7, 0.42], [-0.7, 0.7, 0.42]]) {
      const fade = target.createLinearGradient(x - dx * reach * scale, y - dy * reach * scale, x + dx * reach * scale, y + dy * reach * scale);
      fade.addColorStop(0, 'rgba(255,250,235,0)');
      fade.addColorStop(0.5, `rgba(255,253,245,${strength})`);
      fade.addColorStop(1, 'rgba(255,250,235,0)');
      target.strokeStyle = fade;
      target.beginPath();
      target.moveTo(x - dx * reach * scale, y - dy * reach * scale);
      target.lineTo(x + dx * reach * scale, y + dy * reach * scale);
      target.stroke();
    }
  }

  function layOut(seconds) {
    const step = 1 / PIP_RIBBON_SEGMENTS;
    for (let i = 0; i < PIP_RIBBONS; i++) {
      for (let k = 0; k < stations; k++) {
        const u = k * step;
        const at = i * stations + k;
        const angle = pipRibbonPoint(i, u, seconds, p);
        pipRibbonPoint(i, u - 0.004, seconds, a);
        pipRibbonPoint(i, u + 0.004, seconds, b);
        const t = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
        // The band's width runs partly up and partly outward; how much of each
        // changes along the ribbon and with time, which is the twist.
        const twist = 0.9 + i * 1.7 + Math.PI * 2 * 0.95 * u + seconds * 0.5;
        let w = [Math.sin(twist) * Math.cos(angle), Math.cos(twist), Math.sin(twist) * Math.sin(angle)];
        const along = w[0] * t[0] + w[1] * t[1] + w[2] * t[2];
        w = norm([w[0] - along * t[0], w[1] - along * t[1], w[2] - along * t[2]]);
        const n = [t[1] * w[2] - t[2] * w[1], t[2] * w[0] - t[0] * w[2], t[0] * w[1] - t[1] * w[0]];
        // Seen from a little above: near parts drop, far parts rise.
        const tilt = (v) => [v[0], v[1] * cosTilt + v[2] * sinTilt, -v[1] * sinTilt + v[2] * cosTilt];
        const c = tilt(p);
        const wt = tilt(w);
        const nt = tilt(n);
        const tt = tilt(t);
        const halfWidth = PIP_RIBBON_HALF_WIDTHS[i % PIP_RIBBON_HALF_WIDTHS.length] * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.55);
        edgeAX[at] = centreX + c[0] - wt[0] * halfWidth;
        edgeAY[at] = centreY + c[1] - wt[1] * halfWidth;
        edgeBX[at] = centreX + c[0] + wt[0] * halfWidth;
        edgeBY[at] = centreY + c[1] + wt[1] * halfWidth;
        midX[at] = centreX + c[0];
        midY[at] = centreY + c[1];
        deep[at] = c[2];
        // Cloth: lit on either face, and silk's long sheen, brightest where the
        // thread direction is square to the light.
        shade[at] = Math.abs(nt[0] * light[0] + nt[1] * light[1] + nt[2] * light[2]);
        const threadwise = tt[0] * half[0] + tt[1] * half[1] + tt[2] * half[2];
        sheen[at] = Math.pow(Math.max(0, 1 - threadwise * threadwise), 14) * (0.35 + 0.65 * Math.abs(nt[2]));
        // In front of the solid, or behind it? Ask the painted depth.
        const px = Math.round(midX[at] - 0.5);
        const row = Math.round(midY[at] - 0.5);
        const painted = px >= 0 && px < W && row >= 0 && row < H ? solid.depthAt(row * W + px) : -Infinity;
        isFront[at] = (painted > -Infinity ? c[2] > painted : c[2] > 0) ? 1 : 0;
      }
    }
    let count = 0;
    for (let i = 0; i < PIP_RIBBONS; i++) for (let k = 0; k < PIP_RIBBON_SEGMENTS; k++) order[count++] = i * stations + k;
    order.sort((m, n) => deep[m] - deep[n]);
  }

  function piece(target, at, grow, r, g, bl, alpha) {
    const next = at + 1;
    let ax = edgeAX[at];
    let ay = edgeAY[at];
    let bx = edgeBX[at];
    let by = edgeBY[at];
    let cx = edgeBX[next];
    let cy = edgeBY[next];
    let dx = edgeAX[next];
    let dy = edgeAY[next];
    if (grow !== 1) {
      ax = midX[at] + (ax - midX[at]) * grow; ay = midY[at] + (ay - midY[at]) * grow;
      bx = midX[at] + (bx - midX[at]) * grow; by = midY[at] + (by - midY[at]) * grow;
      cx = midX[next] + (cx - midX[next]) * grow; cy = midY[next] + (cy - midY[next]) * grow;
      dx = midX[next] + (dx - midX[next]) * grow; dy = midY[next] + (dy - midY[next]) * grow;
    }
    const style = `rgba(${r | 0},${g | 0},${bl | 0},${alpha})`;
    target.fillStyle = style;
    target.strokeStyle = style;
    target.beginPath();
    target.moveTo(ax, ay);
    target.lineTo(bx, by);
    target.lineTo(cx, cy);
    target.lineTo(dx, dy);
    target.closePath();
    target.fill();
    // A hairline in the same colour closes the seam between neighbouring pieces.
    target.stroke();
  }

  function ribbons(target, wantFront) {
    target.lineJoin = 'round';
    target.lineCap = 'round';
    // A soft warm halo first, so the far ribbons glow against the pale room:
    // one wide faint stroke along each run. The near ribbons get none, because
    // over the rose heart a halo shows as pale stripes.
    target.strokeStyle = 'rgba(255,204,104,0.16)';
    for (let i = 0; i < (wantFront ? 0 : PIP_RIBBONS); i++) {
      target.lineWidth = PIP_RIBBON_HALF_WIDTHS[i % PIP_RIBBON_HALF_WIDTHS.length] * 2 + 12;
      let open = false;
      for (let k = 0; k < PIP_RIBBON_SEGMENTS; k++) {
        const at = i * stations + k;
        const mine = (isFront[at] === 1) === wantFront && k > 5 && k < PIP_RIBBON_SEGMENTS - 6;
        if (mine && !open) { target.beginPath(); target.moveTo(midX[at], midY[at]); open = true; }
        if (mine) target.lineTo(midX[at + 1], midY[at + 1]);
        if (!mine && open) { target.stroke(); open = false; }
      }
      if (open) target.stroke();
    }
    target.lineWidth = 0.7;
    let drawn = 0;
    for (let q = 0; q < total; q++) {
      const at = order[q];
      if ((isFront[at] === 1) !== wantFront) continue;
      drawn++;
      const tone = 0.2 + 0.8 * shade[at];
      const glint = Math.min(1, sheen[at] * 0.9);
      const body = (c) => {
        const cloth = PIP_RIBBON_DEEP[c] + (PIP_RIBBON_GOLD[c] - PIP_RIBBON_DEEP[c]) * tone;
        return cloth + (PIP_RIBBON_SHEEN[c] - cloth) * glint;
      };
      // Three opaque bands, lighter toward the middle, give the ribbon its
      // roundness without any piece showing through its neighbour.
      for (const [grow, lift] of [[1, 0], [0.66, 0.16 + 0.2 * glint], [0.3, 0.3 + 0.4 * glint]]) {
        piece(target, at, grow,
          body(0) + (PIP_RIBBON_SHEEN[0] - body(0)) * lift,
          body(1) + (PIP_RIBBON_SHEEN[1] - body(1)) * lift,
          body(2) + (PIP_RIBBON_SHEEN[2] - body(2)) * lift, 1);
      }
    }
    return drawn;
  }

  function stars(target, wantFront, seconds, still) {
    let drawn = 0;
    for (let i = 0; i < PIP_RIBBONS; i++) {
      for (let j = 0; j < PIP_RIBBON_STARS; j++) {
        const u = (((seconds * 0.07 + j / PIP_RIBBON_STARS + i * 0.11) % 1) + 1) % 1;
        const at = i * stations + Math.min(PIP_RIBBON_SEGMENTS - 1, Math.floor(u * PIP_RIBBON_SEGMENTS));
        if ((isFront[at] === 1) !== wantFront) continue;
        const flicker = still ? 0.8 : 0.55 + 0.45 * Math.sin(seconds * 2.6 + i * 2.3 + j * 1.7);
        const strength = Math.sin(Math.PI * u) * flicker * (0.45 + 0.55 * sheen[at]);
        if (strength < 0.12) continue;
        star(target, midX[at], midY[at], 8 + 12 * strength, Math.min(1, strength));
        drawn++;
      }
    }
    return drawn;
  }

  function draw(seconds, still) {
    const s = backing;
    const beat = still ? 0 : pipBeat(seconds);
    layOut(seconds);
    for (const target of [back, front]) {
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.clearRect(0, 0, fullW * s, fullH * s);
      target.setTransform(s, 0, 0, s, PIP_RIBBON_PAD_X * s, 0);
    }
    if (!auraSprite) buildAura();
    back.save();
    back.translate(centreX, centreY);
    back.rotate(seconds * 0.09);
    back.globalAlpha = 0.74 + 0.26 * beat;
    back.drawImage(auraSprite, -auraReach, -auraReach, auraReach * 2, auraReach * 2);
    back.restore();
    backPieces = ribbons(back, false);
    frontPieces = ribbons(front, true);
    starsDrawn = stars(back, false, seconds, still) + stars(front, true, seconds, still);
    if (still) {
      rig.style.transform = 'none';
    } else {
      const swell = 1 + PIP_BEAT_SWELL * beat;
      const lift = Math.sin(seconds * 0.8) * PIP_FLOAT_PIXELS;
      const lean = Math.sin(seconds * 0.53 + 0.6) * PIP_LEAN_DEGREES;
      rig.style.transform = `translateY(${lift.toFixed(2)}px) rotate(${lean.toFixed(2)}deg) scale(${swell.toFixed(4)})`;
    }
  }

  return {
    draw,
    setBacking,
    get frontPieces() { return frontPieces; },
    get backPieces() { return backPieces; },
    get stars() { return starsDrawn; }
  };
}

function pipCreateHeartRenderer() {
  if (!pipHeartModel) pipHeartModel = pipBuildHeartModel();
  if (!pipHeartTable) pipHeartTable = pipBuildHeartTable();
  const canvas = document.createElement('canvas');
  canvas.width = PIP_HEART_BOX_W;
  canvas.height = PIP_HEART_BOX_H;
  canvas.className = 'pip-heart';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A turning three dimensional heart with ribbons of gold flowing around it');
  return pipHeartPainter(canvas, pipHeartModel, pipHeartTable);
}

function pipHeartPainter(canvas, model, table) {
  const W = model.W;
  const H = model.H;
  const N = PIP_HEART_TABLE;
  const context = canvas.getContext('2d');
  // The rig holds the three layers and carries the heartbeat, float and lean:
  // the glow and the far side of the ribbons (behind), the rose solid, and the
  // near side of the ribbons (in front), in that order.
  const rig = document.createElement('div');
  rig.className = 'pip-heart-rig';
  const backCanvas = document.createElement('canvas');
  backCanvas.className = 'pip-heart-back';
  backCanvas.setAttribute('aria-hidden', 'true');
  const frontCanvas = document.createElement('canvas');
  frontCanvas.className = 'pip-heart-front';
  frontCanvas.setAttribute('aria-hidden', 'true');
  rig.append(backCanvas, canvas, frontCanvas);
  // The shading is always drawn at the box's own size. When the TV shows the
  // box at twice that size, this small picture is enlarged onto the canvas.
  const shadeCanvas = document.createElement('canvas');
  shadeCanvas.width = W;
  shadeCanvas.height = H;
  const shadeContext = shadeCanvas.getContext('2d');
  const image = shadeContext.createImageData(W, H);
  const pixels = new Uint32Array(image.data.buffer);
  const before = new Uint32Array(W * H);
  const depths = new Float32Array(W * H);
  const rows = model.lastRow - model.firstRow + 1;
  // Outline of the turned solid, per row: the left lobe and body, and the
  // right lobe on the rows above the cleft.
  const bodyLeft = new Float32Array(H);
  const bodyRight = new Float32Array(H);
  const lobeLeft = new Float32Array(H);
  const lobeRight = new Float32Array(H);
  const hasLobe = new Uint8Array(H);
  let backing = 1;
  let lastAngle = null;
  let spanLow = 0;
  let spanHigh = 0;
  const life = pipHeartLife(model, rig, backCanvas, frontCanvas, { depthAt: (k) => depths[k] });
  life.setBacking(1);

  function setBacking(scale) {
    const next = scale >= 1.4 ? 2 : 1;
    if (next === backing && canvas.width === W * next) return;
    backing = next;
    canvas.width = W * backing;
    canvas.height = H * backing;
    life.setBacking(backing);
    lastAngle = null;
  }

  function paintSpan(base, first, count, sign, cos, sin) {
    const { x, h, nx, ny, nz } = model;
    const centre = model.centreX;
    let low = Infinity;
    let high = -Infinity;
    let ax = 0;
    let ad = 0;
    let anx = 0;
    let any = 0;
    let anz = 0;
    for (let i = 0; i < count; i++) {
      const k = first + i;
      const depthHalf = sign * h[k];
      const bx = centre + x[k] * cos + depthHalf * sin;
      const bd = -x[k] * sin + depthHalf * cos;
      const bnx = nx[k] * cos + sign * nz[k] * sin;
      const bny = ny[k];
      const bnz = -nx[k] * sin + sign * nz[k] * cos;
      if (bx < low) low = bx;
      if (bx > high) high = bx;
      if (i > 0) {
        // The slice's outline runs left to right along the front surface and
        // back again along the back surface, so a piece faces the viewer when
        // it runs left to right on the front, or right to left on the back.
        const visible = sign > 0 ? bx > ax : bx < ax;
        if (visible) {
          let x0 = ax;
          let x1 = bx;
          let d0 = ad;
          let d1 = bd;
          let mx0 = anx;
          let mx1 = bnx;
          let my0 = any;
          let my1 = bny;
          let mz0 = anz;
          let mz1 = bnz;
          if (sign < 0) {
            x0 = bx; x1 = ax; d0 = bd; d1 = ad;
            mx0 = bnx; mx1 = anx; my0 = bny; my1 = any; mz0 = bnz; mz1 = anz;
          }
          let px = Math.ceil(x0 - 0.5);
          const end = Math.floor(x1 - 0.5);
          if (px < 0) px = 0;
          const stop = end >= W ? W - 1 : end;
          if (px <= stop) {
            const scale = 1 / (x1 - x0);
            for (; px <= stop; px++) {
              const t = (px + 0.5 - x0) * scale;
              const depth = d0 + (d1 - d0) * t;
              if (depth <= depths[base + px]) continue;
              depths[base + px] = depth;
              const vx = mx0 + (mx1 - mx0) * t;
              const vy = my0 + (my1 - my0) * t;
              const vz = mz0 + (mz1 - mz0) * t;
              const inverse = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz);
              const iu = ((vx * inverse * 0.5 + 0.5) * (N - 1) + 0.5) | 0;
              const iv = ((vy * inverse * 0.5 + 0.5) * (N - 1) + 0.5) | 0;
              pixels[base + px] = table[iv * N + iu];
            }
          }
        }
      }
      ax = bx;
      ad = bd;
      anx = bnx;
      any = bny;
      anz = bnz;
    }
    spanLow = low;
    spanHigh = high;
  }

  // Where one part of the heart passes in front of another (the near lobe in
  // front of the far one), the step in depth would show as a stair stepped
  // line. Those few pixels are averaged with their painted neighbours.
  function soften() {
    // The byte order below is the one every current TV, phone and computer
    // uses; on any other machine the step is skipped.
    if (new Uint8Array(new Uint32Array([1]).buffer)[0] !== 1) return;
    before.set(pixels);
    const weights = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    for (let row = model.firstRow + 1; row < model.lastRow; row++) {
      const base = row * W;
      for (let px = 1; px < W - 1; px++) {
        const k = base + px;
        if (!before[k]) continue;
        const depth = depths[k];
        const step = PIP_HEART_FOLD_STEP;
        if (!((before[k - 1] && Math.abs(depths[k - 1] - depth) > step)
          || (before[k + 1] && Math.abs(depths[k + 1] - depth) > step)
          || (before[k - W] && Math.abs(depths[k - W] - depth) > step)
          || (before[k + W] && Math.abs(depths[k + W] - depth) > step))) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let total = 0;
        let w = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const value = before[k + dy * W + dx];
            const weight = weights[w++];
            if (!value) continue;
            r += (value & 255) * weight;
            g += ((value >>> 8) & 255) * weight;
            b += ((value >>> 16) & 255) * weight;
            total += weight;
          }
        }
        pixels[k] = ((255 << 24) | (Math.round(b / total) << 16) | (Math.round(g / total) << 8) | Math.round(r / total)) >>> 0;
      }
    }
  }

  // Carry the edge colours two pixels outward, so the antialiased outline (and
  // the enlargement on a 3840 TV) never mixes in an unpainted pixel.
  function spread() {
    for (let pass = 0; pass < 2; pass++) {
      before.set(pixels);
      const top = Math.max(1, model.firstRow - 2);
      const bottom = Math.min(H - 2, model.lastRow + 2);
      for (let row = top; row <= bottom; row++) {
        const base = row * W;
        for (let px = 1; px < W - 1; px++) {
          const k = base + px;
          if (before[k]) continue;
          pixels[k] = before[k - 1] || before[k + 1] || before[k - W] || before[k + W];
        }
      }
    }
  }

  function outline(cos) {
    const s = backing;
    const centre = model.centreX;
    const first = model.firstRow;
    const last = model.lastRow;
    let lastLobe = first - 1;
    for (let row = first; row <= last; row++) if (hasLobe[row]) lastLobe = row;
    context.beginPath();
    // Left lobe and body: down the left side, around the point, up the right.
    context.moveTo((centre - model.lobeX * cos) * s, model.topY * s);
    for (let row = first; row <= last; row++) context.lineTo(bodyLeft[row] * s, (row + 0.5) * s);
    context.lineTo(centre * s, model.bottomY * s);
    for (let row = last; row >= first; row--) context.lineTo(bodyRight[row] * s, (row + 0.5) * s);
    context.closePath();
    if (lastLobe >= first) {
      // Right lobe, closed into the body on the first row below the cleft.
      context.moveTo((centre + model.lobeX * cos) * s, model.topY * s);
      for (let row = first; row <= lastLobe; row++) context.lineTo(lobeLeft[row] * s, (row + 0.5) * s);
      const join = Math.min(last, lastLobe + 1);
      context.lineTo(bodyLeft[join] * s, (join + 0.5) * s);
      context.lineTo(bodyRight[join] * s, (join + 0.5) * s);
      for (let row = lastLobe; row >= first; row--) context.lineTo(lobeRight[row] * s, (row + 0.5) * s);
      context.closePath();
    }
  }

  function draw(t, force) {
    paintSolid(t, force);
    // core/stage.js calls draw(clock * 0.55 + 6), so this is the scene clock.
    const still = typeof S !== 'undefined' && !!S.still;
    life.draw(still ? PIP_STILL_SECONDS : (t - 6) / 0.55, still);
  }

  function paintSolid(t, force) {
    const degrees = t * PIP_HEART_DEGREES_PER_T;
    if (!force && lastAngle !== null && Math.abs(degrees - lastAngle) < PIP_HEART_REDRAW_DEGREES) return;
    lastAngle = degrees;
    const radians = degrees * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    pixels.fill(0);
    depths.fill(-Infinity);
    for (let row = model.firstRow; row <= model.lastRow; row++) {
      const base = row * W;
      const from = model.rowStart[row];
      const to = model.rowStart[row + 1];
      hasLobe[row] = to - from > 1 ? 1 : 0;
      for (let span = from; span < to; span++) {
        const first = model.spanFirst[span];
        const count = model.spanCount[span];
        paintSpan(base, first, count, 1, cos, sin);
        let low = spanLow;
        let high = spanHigh;
        paintSpan(base, first, count, -1, cos, sin);
        if (spanLow < low) low = spanLow;
        if (spanHigh > high) high = spanHigh;
        if (span === from) {
          bodyLeft[row] = low;
          bodyRight[row] = high;
        } else {
          lobeLeft[row] = low;
          lobeRight[row] = high;
        }
      }
    }
    soften();
    spread();
    context.globalCompositeOperation = 'copy';
    if (backing === 1) {
      context.putImageData(image, 0, 0);
    } else {
      shadeContext.putImageData(image, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(shadeCanvas, 0, 0, W * backing, H * backing);
    }
    context.globalCompositeOperation = 'destination-in';
    context.fillStyle = '#000';
    outline(cos);
    context.fill('nonzero');
    context.globalCompositeOperation = 'source-over';
  }

  canvas.dataset.technique = 'canvas2d-per-pixel';
  return { canvas, rig, backCanvas, frontCanvas, life, draw, setBacking, technique: 'canvas2d-per-pixel', rows, get backing() { return backing; } };
}

/* ---------------------------------------------------------------------------
   Mounting the heart

   The scene shows the WebGL 2 heart and ribbons (peace-in-practice-heart3d.js)
   and keeps the Canvas 2D solid above for a display where WebGL 2 is missing,
   fails to start, or loses its graphics context part way through.

   Either one is handed to the core as `heartRenderer`, and the core draws it
   from its single frame loop while the scene is in motion (never in still
   mode, never during an arrival or a scene change, never while the display is
   paused or the tab hidden), so neither heart needs a loop of its own.

   The WebGL 2 heart is built when the scene opens and given back when the
   scene is left: its programs, buffers, textures, render targets and the
   graphics context itself. A scene that is only redrawn in place (a new
   recognition arrived) keeps the same heart, so the ribbons do not start over.
--------------------------------------------------------------------------- */

let pipHeart2D = null;                // the Canvas 2D solid, built at most once
let pipHeart3D = null;                // the WebGL 2 heart, only while this scene is showing
let pipHeart3DLeftAt = -Infinity;     // when the scene last let go of it
const PIP_HEART_REMOUNT_MS = 250;     // a mount this soon after a leave is the same showing, redrawn in place

// One canvas pixel per TV pixel: the whole TV is drawn at twice the size on a
// 3840 wide screen, at its own size on a 1920 wide one, and smaller on a phone.
function pipHeartBacking() {
  const tv = $('tv');
  const shown = tv ? tv.getBoundingClientRect().width / 1920 : 1;
  return shown * (window.devicePixelRatio || 1);
}

function pipHeart3DResize() {
  if (pipHeart3D) pipHeart3D.solid.setBacking(pipHeartBacking());
}

function pipReleaseHeart3D() {
  const held = pipHeart3D;
  if (!held) return;
  pipHeart3D = null;
  window.removeEventListener('resize', pipHeart3DResize);
  held.solid.dispose();
  if (heartRenderer === held) heartRenderer = null;
  if (window.pipHeartRenderer === held) window.pipHeartRenderer = null;
}

// The graphics context was lost while the heart was up: show the Canvas 2D
// solid in its place, at once, if the scene is still on the stage.
function pipHeart3DLost() {
  pipReleaseHeart3D();
  if ($('heart-host')) pipMountHeart2D($('heart-host'));
}

function pipMountHeart3D(host) {
  if (typeof pipCreateHeart3D !== 'function') return false;
  const sameShowing = !!pipHeart3D && performance.now() - pipHeart3DLeftAt < PIP_HEART_REMOUNT_MS;
  if (pipHeart3D && !pipHeart3D.solid.alive) pipReleaseHeart3D();
  if (!pipHeart3D) {
    const solid = pipCreateHeart3D(pipHeart3DLost);
    if (!solid) return false;
    // The core hands the Canvas 2D heart a turn angle. This heart keeps time
    // in seconds, so it reads the scene's own clock instead.
    pipHeart3D = { solid, canvas: solid.canvas, rig: solid.rig, technique: solid.technique, draw: (t, force) => solid.draw(V.clock, force, S.still), setBacking: solid.setBacking, get stats() { return solid.stats; }, get glError() { return solid.glError; } };
    window.addEventListener('resize', pipHeart3DResize);
  }
  if (!sameShowing) pipHeart3D.solid.restart();
  heartRenderer = pipHeart3D;
  window.pipHeartRenderer = pipHeart3D;
  // The host's soft drop shadow is for the solid alone; the ribbons and their
  // light reach far past it and carry their own depth.
  host.classList.add('pip-heart-host-3d');
  host.replaceChildren(pipHeart3D.rig);
  pipHeart3D.solid.setBacking(pipHeartBacking());
  pipHeart3D.draw(0, true);
  return true;
}

function pipMountHeart2D(host) {
  if (!pipHeart2D) pipHeart2D = pipCreateHeartRenderer();
  heartRenderer = pipHeart2D;
  // A named handle for the scene spec and for checking the frame cost by hand,
  // alongside the renderer's existing colorPolishRuntime debug surface.
  window.pipHeartRenderer = heartRenderer;
  host.classList.remove('pip-heart-host-3d');
  host.replaceChildren(heartRenderer.rig);
  heartRenderer.setBacking(pipHeartBacking());
  heartRenderer.draw(S.still ? PIP_HEART_STILL_T : S.t, true);
}

function pipMountHeart() {
  const host = $('heart-host');
  if (!host) return;
  if (!pipMountHeart3D(host)) pipMountHeart2D(host);
}

// Leaving the scene gives the WebGL 2 heart back. The core also calls this
// just before it redraws this same scene in place, so the release waits one
// turn: if the heart is back on the stage by then, it is kept.
function pipLeaveHeart() {
  const held = pipHeart3D;
  if (!held) return;
  pipHeart3DLeftAt = performance.now();
  setTimeout(() => { if (pipHeart3D === held && !held.canvas.isConnected) pipReleaseHeart3D(); }, 0);
}

registerScene(9, {
  markup: pipScene,
  mount() {
    pipMountHeart();
    pipMountAmbientHearts();
    // The core marks any actor whose record fails smallFits() as large, which
    // freezes it in place. Only the reserved bubble is meant to hold still;
    // the regular bubbles keep the live drift, because this scene only gives
    // them messages that fit their bubble whole.
    V.actors.forEach((actor) => {
      actor.large = actor.key === pipReservedKey;
      if (actor.large) actor.retireAt = Infinity;
    });
  },
  prime() {
    pipReport('first');
  },
  integrate: pipIntegrate,
  onLeave: pipLeaveHeart,
  floaters: true,
  fxCanvas: true,
  replaceMode: 'hearts',
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
