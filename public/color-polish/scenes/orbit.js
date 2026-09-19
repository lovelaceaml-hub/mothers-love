// Scene 10: Expression Orbit.
'use strict';

let ORBIT_BAG = [];
let ORBIT_LAST = 0;
let ORBIT_PASS_TOKEN = 0;
let ORBIT_REFILL_COUNT = 0;
let ORBIT_SESSION_SALT = null;

const ORBIT_RADIUS_X = 648;
const ORBIT_RADIUS_Y = 48;

// Plan 17 Lane 6 (Anthony's TV watch, September 19, item 8): "the orbiting
// bubbles need to be smaller", with the gold centre circle staying the
// dominant element. The Plan 15 starting tiers scale down with the layout
// font floor below (19.5 px instead of 23.1 px, the same words drawn at the
// same 18 px), so a planet starts smaller and still grows only as much as
// its own message needs.
function orbitPlanetDiameter(message) {
  const len = (message || '').length;
  if (len < 80) return 165;
  if (len < 200) return 192;
  return 222;
}

// Plan 17 bubble fit ("pages, long only", Anthony, September 18), the same
// rule as Welcome. A planet grows from its Plan 15 size tier to the diameter
// its message needs to show whole on one page, with every text line, chip
// and page indicator inside a concentric circle max(3 percent of the
// diameter, 12 px) in from the rim. Only a message that cannot fit whole
// even at ORBIT_MAX_DIAMETER flips through pages, at that size and at the
// floor. Sizes are measured on a hidden, unscaled copy of the planet, then
// applied to the live planet.
//
// Plan 17 Lane 6 (Anthony, September 19, item 8), "the orbiting bubbles need
// to be smaller". Two things set how large a planet is drawn:
//
// 1. The projection. It magnified a planet from 0.782 of its layout size at
//    the back of the ring to 1.385 at the front, so a planet on the near
//    pass was drawn nearly as wide as the 480 px gold centre. The drawn
//    scale is now softened to ORBIT_SCALE_SOFTEN of that swing. Depth is
//    untouched: position, z order, blur and tone still come from the raw
//    projection, only the size swing is gentler.
// 2. The layout font floor. Words must be drawn at 18 px or larger at every
//    moment (36 px at 3840), so the layout floor is 18 / ORBIT_K_MIN. With
//    the softened swing that is 19.5 px instead of 23.1 px, and a message
//    needs a smaller circle to hold it at the floor, so every measured
//    diameter comes down with it.
//
// ORBIT_SOFT_CAP is the size at which the gold centre stays the dominant
// element: 70 percent of its diameter. A planet that fits inside it is drawn
// no wider than it, however near the viewer it comes. A planet whose own
// message cannot show whole any smaller than that is the one exception, and
// then it is never magnified either: it is drawn at ORBIT_K_MIN of its
// layout size all the way round, the smallest circle that still shows those
// words at 18 px. ORBIT_MAX_DIAMETER keeps even that inside
// ORBIT_DRAWN_CAP, the room between the scene title (bottom at y 80, plus an
// 8 px gap) and the bottom of the 636 px stage (4 px in), so no planet ever
// rises over the title, and the largest planet holds a 500 grapheme message
// whole.
const ORBIT_SUN_DIAMETER = 480;
const ORBIT_SOFT_CAP = Math.round(ORBIT_SUN_DIAMETER * 0.7);
const ORBIT_SCALE_SOFTEN = 0.35;
const ORBIT_K_RAW_MIN = 1420 / 1815;
const orbitDrawScale = (k) => 1 + (k - 1) * ORBIT_SCALE_SOFTEN;
const ORBIT_K_MIN = orbitDrawScale(ORBIT_K_RAW_MIN);
const ORBIT_TITLE_BOTTOM = 80;
const ORBIT_TITLE_GAP = 8;
const ORBIT_DRAWN_CAP = 636 - 4 - (ORBIT_TITLE_BOTTOM + ORBIT_TITLE_GAP);
const ORBIT_MAX_DIAMETER = Math.floor(ORBIT_DRAWN_CAP / ORBIT_K_MIN);
const ORBIT_FONT_FLOOR = Math.ceil((18 / ORBIT_K_MIN) * 10) / 10;
const ORBIT_RIM_MARGIN = 0.03;
const ORBIT_RIM_MARGIN_MIN = 12;
const ORBIT_CONTENT_WIDTHS = [80, 74, 68];

// Plan 17 Lane 6 (Anthony, September 19, item 8), "the expression symbols and
// images need to revolve around the recognition; right now they go behind
// it". A medallion now travels a tilted ring outside the bubble's rim
// (ORBIT_MOON_GAP px of clearance before its own 21.5 px radius) instead of
// a flat 50 px path that crossed the words, and it passes in front of the
// bubble on the near half of that ring and behind it on the far half.
const ORBIT_MOON_RADIUS = 21.5;
const ORBIT_MOON_GAP = 26;
const ORBIT_MOON_TILT = 0.94;
const ORBIT_MOON_DEPTH = 52;
const ORBIT_MOON_K_MAX = 600 / (600 - ORBIT_MOON_DEPTH);
let ORBIT_FIT_CACHE = new Map();

function orbitWithHost(fn) {
  const stage = typeof document !== 'undefined' ? document.getElementById('stage') : null;
  if (!stage) return fn(null);
  const host = document.createElement('div');
  host.className = 'scene';
  host.dataset.scene = '10';
  host.dataset.orbitMeasure = 'true';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'visibility:hidden;pointer-events:none;z-index:-1';
  stage.append(host);
  try {
    return fn(host);
  } finally {
    host.remove();
  }
}

function orbitFitKey(r, d) {
  return `${r.id}|${d}|${r.name}|${r.message}|${r.ids.join(',')}`;
}

function orbitTextRects(el) {
  const rects = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue.trim() || !node.parentElement || node.parentElement.closest('[hidden]')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const q of range.getClientRects()) if (q.width > 0 && q.height > 0) rects.push(q);
  }
  el.querySelectorAll('.chip').forEach((chip) => rects.push(chip.getBoundingClientRect()));
  return rects;
}

// The same inline styling core fitCircle applies for diameter d, plus the
// content column width and message size this fit chose.
function orbitStyleOrb(el, r, d, width, font) {
  const content = el.querySelector('.orb-content'), msg = el.querySelector('.message');
  const title = el.querySelector('.recipient'), chipBox = el.querySelector('.chips');
  if (!content || !msg) return false;
  if (title && r.name.length > 16) title.style.fontSize = (d >= 450 ? 30 : 23) + 'px';
  if (chipBox && r.ids.length > 3) {
    chipBox.style.gap = '3px';
    chipBox.querySelectorAll('.chip').forEach((x) => {
      x.style.fontSize = (d >= 450 ? 13 : 10) + 'px';
      x.style.padding = '2px 4px';
    });
  }
  if (d < 335) {
    if (title) title.style.fontSize = '26px';
    if (chipBox) {
      chipBox.querySelectorAll('.chip').forEach((x) => {
        x.style.fontSize = '10.5px';
        x.style.padding = '2px 3px';
        const img = x.querySelector('img');
        if (img) {
          img.style.width = '16px';
          img.style.height = '16px';
        }
      });
      chipBox.style.marginTop = '6px';
    }
    el.querySelector('.like-count')?.style.setProperty('margin-top', '6px');
  }
  msg.style.fontSize = font + 'px';
  msg.style.lineHeight = '1.27';
  content.style.width = width + '%';
  content.style.maxWidth = content.style.width;
  return true;
}

function orbitInside(el, d) {
  const content = el.querySelector('.orb-content');
  if (!content || content.scrollWidth > content.clientWidth + 1) return false;
  const box = el.getBoundingClientRect();
  if (!box.width) return false;
  const s = box.width / d, cx = box.left + box.width / 2, cy = box.top + box.height / 2;
  const limit = (d / 2 - Math.max(ORBIT_RIM_MARGIN * d, ORBIT_RIM_MARGIN_MIN)) * s;
  for (const q of orbitTextRects(el)) {
    const dx = Math.max(Math.abs(q.left - cx), Math.abs(q.right - cx));
    const dy = Math.max(Math.abs(q.top - cy), Math.abs(q.bottom - cy));
    if (Math.hypot(dx, dy) > limit) return false;
  }
  return true;
}

function orbitProbe(host, r, d) {
  host.innerHTML = `<div class="planet-system" style="width:${d}px;height:${d}px;--d:${d}px;"><div class="orb-slot" style="left:0;top:0;width:${d}px;height:${d}px;--tint:${catalog[r.ids[0] - 1].color}"><div class="orb-life">${completeOrb(r, d)}</div></div></div>`;
  return host.querySelector('.orb-slot');
}

function orbitWholeWidth(host, r, d) {
  const el = orbitProbe(host, r, d);
  const msg = el.querySelector('.message');
  for (const width of ORBIT_CONTENT_WIDTHS) {
    if (!orbitStyleOrb(el, r, d, width, ORBIT_FONT_FLOOR)) return null;
    msg.textContent = r.message;
    if (orbitInside(el, d)) return width;
  }
  return null;
}

// Smallest diameter in [lo, hi] that shows the whole message on one page,
// or null when even hi cannot.
function orbitNeed(host, r, lo, hi) {
  lo = Math.round(lo);
  hi = Math.round(Math.max(lo, hi));
  for (let d = lo; ; d = Math.min(hi, d + 8)) {
    if (orbitWholeWidth(host, r, d) !== null) {
      let best = d;
      for (let dd = d - 2; dd > Math.max(lo - 1, d - 8); dd -= 2) {
        if (orbitWholeWidth(host, r, dd) === null) break;
        best = dd;
      }
      return best;
    }
    if (d >= hi) return null;
  }
}

function orbitPaginate(el, d, msg, message) {
  const words = message.match(/\S+\s*|\s+/g) || [message];
  const pages = [];
  let buffer = '';
  for (const word of words) {
    msg.textContent = buffer + word;
    if (buffer && !orbitInside(el, d)) {
      pages.push(buffer);
      buffer = word;
    } else buffer += word;
  }
  if (buffer) pages.push(buffer);
  return pages;
}

function orbitFitAt(host, r, d) {
  const el = orbitProbe(host, r, d);
  const msg = el.querySelector('.message'), page = el.querySelector('.orb-page-indicator');
  if (!msg || !page) return null;
  const start = Math.max(ORBIT_FONT_FLOOR, d >= 450 ? 28 : d >= 335 ? 24 : 21);
  for (const width of ORBIT_CONTENT_WIDTHS) {
    orbitStyleOrb(el, r, d, width, ORBIT_FONT_FLOOR);
    msg.textContent = r.message;
    if (!orbitInside(el, d)) continue;
    let font = start;
    for (; font > ORBIT_FONT_FLOOR; font -= 0.5) {
      msg.style.fontSize = font + 'px';
      if (orbitInside(el, d)) break;
    }
    // Never below the floor (the floor itself was verified above).
    font = Math.max(font, ORBIT_FONT_FLOOR);
    return { d, width, font, pages: [r.message] };
  }
  page.hidden = false;
  let best = null;
  for (const width of ORBIT_CONTENT_WIDTHS) {
    orbitStyleOrb(el, r, d, width, ORBIT_FONT_FLOOR);
    page.textContent = '00 / 00 · CONTINUED';
    const pages = orbitPaginate(el, d, msg, r.message);
    if (!best || pages.length < best.pages.length) best = { d, width, font: ORBIT_FONT_FLOOR, pages };
  }
  return best;
}

// Diameter and layout for record r: its Plan 15 tier at least, grown to its
// measured need, never past ORBIT_MAX_DIAMETER.
function orbitSize(host, r) {
  const tier = orbitPlanetDiameter(r.message);
  if (!host) return { d: tier, fit: null };
  const need = orbitNeed(host, r, tier, ORBIT_MAX_DIAMETER);
  const d = Math.round(Math.max(tier, Math.min(ORBIT_MAX_DIAMETER, need === null ? ORBIT_MAX_DIAMETER : need)));
  const key = orbitFitKey(r, d);
  let fit = ORBIT_FIT_CACHE.get(key);
  if (!fit) {
    fit = orbitFitAt(host, r, d);
    if (fit) ORBIT_FIT_CACHE.set(key, fit);
  }
  return { d, fit };
}

// Puts record r into planet p at diameter d with the measured layout.
function orbitApplyFit(p, r, d, fit) {
  const b = p.b, el = b.el;
  b.d = d;
  p.el.style.width = d + 'px';
  p.el.style.height = d + 'px';
  p.el.style.setProperty('--d', d + 'px');
  el.style.width = d + 'px';
  el.style.height = d + 'px';
  el.dataset.growMax = String(d);
  el.dataset.fitCap = String(ORBIT_MAX_DIAMETER);
  el.innerHTML = `<div class="orb-life">${completeOrb(r, d)}</div>`;
  bindNumbers(el);
  orbitStyleOrb(el, r, d, fit.width, fit.font);
  const msg = el.querySelector('.message'), page = el.querySelector('.orb-page-indicator');
  msg.textContent = fit.pages[0];
  page.hidden = fit.pages.length < 2;
  if (!page.hidden) page.textContent = `01 / ${String(fit.pages.length).padStart(2, '0')} · CONTINUED`;
  el.dataset.long = String(!smallFits(r));
  b.reading = { pages: fit.pages, index: 0, at: V.clock, duration: Math.max(9, fit.pages[0].length / 14) };
  log('orbit_bubble_fit', { id: r.id, diameter: d, cap: ORBIT_MAX_DIAMETER, softCap: ORBIT_SOFT_CAP, drawnCap: ORBIT_DRAWN_CAP, pages: fit.pages.length, font: fit.font, verbatim: fit.pages.join('') === r.message });
  // Core's own fit pass may already have logged this record's pagination
  // at this moment; log it only once.
  if (fit.pages.length > 1 && !qaLog.some((e) => e.type === 'circular_pagination' && e.id === r.id && e.at === +S.t.toFixed(3))) log('circular_pagination', { id: r.id, pages: fit.pages.length, diameter: d, verbatim: fit.pages.join('') === r.message });
}

// Lays out every planet: after core's mount-time fit pass (cached layouts
// from the markup), or measured again once the real fonts have loaded.
function orbitFitAll(remeasure) {
  if (!V.planets || !V.planets.length) return;
  if (remeasure) ORBIT_FIT_CACHE = new Map();
  orbitWithHost((host) => {
    V.planets.forEach((p) => {
      const r = S.pool.find((x) => x.id === p.b.id);
      if (!r || !p.b.el) return;
      const { d, fit } = orbitSize(host, r);
      if (fit) orbitApplyFit(p, r, d, fit);
    });
  });
}

function primeOrbit(dt) {
  orbitFitAll(false);
  tickOrbit(dt);
}

function orbitNextId() {
  if (!ORBIT_BAG.length) {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    // Keep fresh opens varied while preserving fixed-seed direct renderer runs.
    // The harness controls Math.random before scripts load, so this salt is
    // stable for a seeded run and naturally varies between live page opens.
    if (ORBIT_SESSION_SALT === null) {
      ORBIT_SESSION_SALT = Math.floor(Math.random() * 0x100000000);
    }
    const rng = randSeed(
      3301 + (S.idCounter || 0) * 41 + Math.floor(S.t) + (ORBIT_REFILL_COUNT++) * 17 + ORBIT_SESSION_SALT,
    );
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = ids[i];
      ids[i] = ids[j];
      ids[j] = t;
    }
    if (ids[0] === ORBIT_LAST && ids.length > 1) {
      ids.push(ids.shift());
    }
    ORBIT_BAG = ids;
  }
  ORBIT_LAST = ORBIT_BAG.shift();
  return ORBIT_LAST;
}

function orbitScene() {
  const id = (S.sceneAge > 0.5 && ORBIT_PASS_TOKEN && ORBIT_LAST) ? ORBIT_LAST : orbitNextId();
  ORBIT_PASS_TOKEN = id;
  const e = catalog[id - 1], chosen = [];
  for (let i = 0; i < 4; i++) {
    const r = chooseRandom(chosen.map((x) => x.r.id), id);
    if (r) chosen.push({ r, expression: id });
  }
  while (chosen.length < 4) {
    const r = chooseRandom(chosen.map((x) => x.r.id));
    if (!r) break;
    chosen.push({ r, expression: null });
  }
  let h = heading('Expression Orbit', 'A shared expression. Many kind words.');
  h += '<div class="orbit-universe" id="orbit-universe">' +
    '<canvas id="orbit-lines" class="orbit-lines" width="1812" height="552" aria-hidden="true"></canvas>' +
    `<div class="orbit-sun" style="--tint:${e.color}">` +
      '<div class="orbit-sun-halo" aria-hidden="true"></div>' +
      '<div class="orbit-sun-rays" aria-hidden="true">' +
        '<span class="orbit-sun-ray ray-0"></span>' +
        '<span class="orbit-sun-ray ray-1"></span>' +
        '<span class="orbit-sun-ray ray-2"></span>' +
        '<span class="orbit-sun-ray ray-3"></span>' +
      '</div>' +
      '<div class="orbit-sun-particles" aria-hidden="true">' +
        '<span class="orbit-sun-spark spark-0"></span>' +
        '<span class="orbit-sun-spark spark-1"></span>' +
        '<span class="orbit-sun-spark spark-2"></span>' +
        '<span class="orbit-sun-spark spark-3"></span>' +
        '<span class="orbit-sun-spark spark-4"></span>' +
        '<span class="orbit-sun-spark spark-5"></span>' +
      '</div>' +
      '<div class="orbit-sun-ring ring-0" style="transform: translate(-50%, -50%) translateZ(0px);" aria-hidden="true"></div>' +
      '<div class="orbit-sun-ring ring-1" style="transform: translate(-50%, -50%) translateZ(26px);" aria-hidden="true"></div>' +
      '<div class="orbit-sun-ring ring-2" style="transform: translate(-50%, -50%) translateZ(52px);" aria-hidden="true"></div>' +
      '<div class="orbit-sun-ring ring-3" style="transform: translate(-50%, -50%) translateZ(78px);" aria-hidden="true"></div>' +
      `<div class="orbit-sun-content" style="transform: translateZ(78px);">${medallion(id)}<h2 class="orbit-sun-name">${shimmer(e.name)}</h2><p class="orbit-sun-phrase serif">“${esc(e.phrase)}”</p><div class="sun-principle">${esc(e.principle)}</div></div>` +
    '</div>';
  ORBIT_FIT_CACHE = new Map();
  const sizes = orbitWithHost((host) => chosen.map(({ r }) => orbitSize(host, r).d));
  chosen.forEach(({ r, expression }, i) => {
    const d = sizes[i];
    h += `<div class="planet-system" data-planet="${i}" style="width:${d}px;height:${d}px;--d:${d}px;">${addOrb(r, 0, 0, d, { expression, motion: false, growMax: d })}${r.ids.map((n, j) => `<span class="orbit-moon" data-moon="${j}" style="--tint:${catalog[n - 1].color}">${icon(n)}</span>`).join('')}</div>`;
  });
  if (!chosen.length) h += '<p class="subheading" style="position:absolute;left:50px;top:150px">No current recognitions for this expression.</p>';
  return h + '</div>';
}

// A slow font load on the real TV must not leave planets sized against
// fallback-font metrics: once the real fonts are ready, run core's fit pass
// again and then measure every planet again. Registers only while fonts are
// genuinely still loading, and is guarded by scene id and a per-mount token
// so a callback from a scene the viewer has since left never touches a
// torn-down DOM.
function refitOrbitWhenFontsReady() {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.ready?.then !== 'function') return;
  if (document.fonts.status === 'loaded') return;
  const token = (V.orbitFontToken = (V.orbitFontToken || 0) + 1);
  document.fonts.ready.then(() => {
    if (S.s !== 10 || V.orbitFontToken !== token) return;
    checkFullFits();
    orbitFitAll(true);
  });
}

function mountOrbit() {
  ORBIT_PASS_TOKEN = ORBIT_LAST;
  refitOrbitWhenFontsReady();
  // Right edge of the title's words (the heading block itself spans the
  // stage), measured once per mount for the top clamp in tickOrbit.
  V.orbitTitleRight = 900;
  const title = sceneRoot?.querySelector('.heading');
  if (title && typeof document.createRange === 'function') {
    const range = document.createRange();
    range.selectNodeContents(title);
    const rect = range.getBoundingClientRect();
    const scene = sceneRoot.getBoundingClientRect();
    const scale = scene.width ? scene.width / 1812 : 1;
    if (rect.width) V.orbitTitleRight = Math.min(1200, Math.max(400, (rect.right - scene.left) / scale + 12));
  }
  V.planets = slots.map((b, i) => ({
    b,
    el: b.el.parentElement,
    index: i,
    phase: (i * TAU) / Math.max(1, slots.length) + 0.3,
    moons: [...b.el.parentElement.querySelectorAll('.orbit-moon')],
    lastSwap: 0,
  }));
}

function leaveOrbit(root) {
  if (S.s !== 10) {
    ORBIT_PASS_TOKEN = 0;
  }
}

function projectOrbit(theta) {
  const z = Math.sin(theta) * 395, k = 1420 / (1420 - z);
  return { x: 906 + Math.cos(theta) * ORBIT_RADIUS_X * k, y: 258 + Math.sin(theta) * ORBIT_RADIUS_Y * k, z, k };
}

function tickOrbit(dt) {
  const can = $('orbit-lines');
  if (!can) return;
  const c = can.getContext('2d');
  c.clearRect(0, 0, 1812, 552);
  for (let n = 0; n < 2; n++) {
    c.beginPath();
    for (let j = 0; j <= 160; j++) {
      const a = (j / 160) * TAU, p = projectOrbit(a), x = 906 + (p.x - 906) * (1 + n * 0.055), y = 258 + (p.y - 258) * (1 + n * 0.23);
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = n ? '#d4c3af2b' : '#d3bb8840';
    c.lineWidth = 1;
    c.stroke();
  }
  V.planets.forEach((p) => {
    const theta = p.phase + V.clock * 0.082, pos = projectOrbit(theta), b = p.b;
    p.z = pos.z;
    // The softened draw scale (see the note above), then the cap. A planet
    // that fits inside the soft cap is held to it as it comes round the near
    // side. A planet whose own message needs a wider circle than that is
    // held to its own back-pass size instead, b.d * ORBIT_K_MIN, which is
    // the smallest circle that still shows those words at 18 px, and which
    // ORBIT_MAX_DIAMETER keeps inside the hard cap. Either way only the
    // front pass is reduced; the back pass, which the floor rests on, is not.
    const cap = Math.max(ORBIT_SOFT_CAP, b.d * ORBIT_K_MIN);
    const k = Math.min(orbitDrawScale(pos.k), cap / b.d);
    p.scale = k;
    // Clamp the drawn planet so it never leaves the stage. The scene root is
    // 636 tall, the .orbit-universe layer starts 84 px down it, and a planet
    // scales by k about its own centre, so its drawn box is d * k around
    // (x, y). Its medallions ride outside that box on their own ring, so the
    // reach used here is the wider of the two, in both directions. A planet
    // whose drawn box overlaps the scene title's words (x below
    // V.orbitTitleRight) keeps its top below the title.
    const half = (b.d * k) / 2;
    const moonRx = b.d / 2 + ORBIT_MOON_GAP;
    const moonReachX = moonRx * ORBIT_MOON_K_MAX + ORBIT_MOON_RADIUS;
    const moonReachY = moonRx * ORBIT_MOON_TILT * ORBIT_MOON_K_MAX + ORBIT_MOON_RADIUS;
    const reachX = Math.max(b.d / 2, moonReachX) * k;
    const reachY = Math.max(b.d / 2, moonReachY) * k;
    const cxDrawn = clamp(pos.x, reachX, 1812 - reachX);
    const overTitle = cxDrawn - reachX < (V.orbitTitleRight || 900);
    const topLimit = overTitle ? ORBIT_TITLE_BOTTOM + ORBIT_TITLE_GAP : 4;
    const cyDrawn = clamp(pos.y, reachY - 84 + topLimit, 552 - reachY - 4);
    const left = cxDrawn - b.d / 2;
    const top = cyDrawn - b.d / 2;
    p.el.style.transform = `translate(${left}px,${top}px) scale(${k})`;
    p.el.style.zIndex = String(Math.round(10000 + pos.z));
    // Depth shows through tone, never transparency: the planet fill stays
    // opaque so the centre quote can never show through message text.
    p.el.style.opacity = '1';
    const dim = pos.z < 0 ? 0.9 + (0.1 * (pos.z + 395)) / 395 : 1;
    const blur = Math.min(1.8, Math.max(0, (-pos.z - 100) / 160));
    const shadow = `drop-shadow(0 ${(6 * k).toFixed(1)}px ${(10 * k).toFixed(1)}px #5C659240)`;
    const tone = dim < 1 ? ` brightness(${dim.toFixed(3)}) saturate(${(0.8 + 0.2 * (dim - 0.9) / 0.1).toFixed(3)})` : '';
    p.el.style.filter = (blur > 0 ? `blur(${blur.toFixed(2)}px) ${shadow}` : shadow) + tone;
    b.x = left;
    b.y = top + 84;
    if (b.reading) tickCirclePages(b, V.clock);
    const cx = b.d / 2;
    const cy = b.d / 2;
    // The medallions revolve on a ring outside the rim: near half in front
    // of the bubble (z index above the .orb-slot's 2), far half behind it,
    // so they pass around the recognition instead of across its words.
    p.moons.forEach((moon, j) => {
      const a = V.clock * (0.33 + j * 0.04) + j * Math.PI + p.phase;
      const mz = Math.sin(a) * ORBIT_MOON_DEPTH, mk = 600 / (600 - mz);
      const mx = cx + Math.cos(a) * moonRx * mk - ORBIT_MOON_RADIUS;
      const my = cy + Math.sin(a) * moonRx * ORBIT_MOON_TILT * mk - ORBIT_MOON_RADIUS;
      moon.style.transform = `translate(${mx}px,${my}px) scale(${mk})`;
      moon.style.zIndex = mz > 0 ? '4' : '1';
      moon.style.opacity = mz > 0 ? '1' : '.8';
    });
    if (V.clock - p.lastSwap > 24 && pos.z < -330) {
      const r = chooseRandom(slots.map((x) => x.id), b.expression) || chooseRandom(slots.map((x) => x.id));
      if (r) {
        b.id = r.id;
        b.el.dataset.recordId = r.id;
        S.lastShown.set(r.id, S.t);
        markShown(r.id);
        orbitWithHost((host) => {
          const { d, fit } = orbitSize(host, r);
          if (fit) orbitApplyFit(p, r, d, fit);
          else {
            b.d = d;
            b.el.innerHTML = `<div class="orb-life">${completeOrb(r, d)}</div>`;
            bindNumbers(b.el);
            b.reading = fitCircle(b.el, r, d, V.clock);
          }
        });
        p.moons.forEach((el, j) => {
          const id = r.ids[j % r.ids.length];
          el.innerHTML = icon(id);
          el.style.setProperty('--tint', catalog[id - 1].color);
        });
        log('orbit_backside_replace', { id: r.id });
      }
      p.lastSwap = V.clock;
    }
  });
}

registerScene(10, {
  markup: orbitScene,
  mount: mountOrbit,
  tick: tickOrbit,
  prime: primeOrbit,
  onLeave: leaveOrbit,
  archOpacity: '.13',
});
