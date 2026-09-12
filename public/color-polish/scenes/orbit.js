// Scene 10: Expression Orbit.
'use strict';

let ORBIT_BAG = [];
let ORBIT_LAST = 0;
let ORBIT_PASS_TOKEN = 0;
let ORBIT_REFILL_COUNT = 0;

const ORBIT_BASE_DIAMETER = 227;
const ORBIT_CENTER_DIAMETER = 420;
const ORBIT_RADIUS_X = 648;
const ORBIT_RADIUS_Y = 48;

function orbitPlanetDiameter(message) {
  const len = (message || '').length;
  if (len < 80) return 195;
  if (len < 200) return 227;
  return 263;
}

function orbitNextId() {
  if (!ORBIT_BAG.length) {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    // Fold in wall-clock seconds as well as the session values. On a fresh page
    // open S.t is 0, S.idCounter is never incremented anywhere in this renderer,
    // and ORBIT_REFILL_COUNT starts at 0, so without a clock term every fresh
    // open picked the identical first expression: six opens showed one name.
    // Nothing asserts reproducibility of this particular bag (the renderer probe
    // checks that scenes render and which arrival styles cycle, not which
    // expression the orbit centre chose), so an earlier round's reproducibility
    // requirement here was the coordinator over-specifying, and it cost the
    // variety Anthony sees on the TV.
    const rng = randSeed(
      3301 + (S.idCounter || 0) * 41 + Math.floor(S.t) + (ORBIT_REFILL_COUNT++) * 17 + Math.floor(Date.now() / 1000) * 7,
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
  chosen.forEach(({ r, expression }, i) => {
    const d = orbitPlanetDiameter(r.message);
    h += `<div class="planet-system" data-planet="${i}" style="width:${d}px;height:${d}px;--d:${d}px;">${addOrb(r, 0, 0, d, { expression, motion: false })}${r.ids.map((n, j) => `<span class="orbit-moon" data-moon="${j}" style="--tint:${catalog[n - 1].color}">${icon(n)}</span>`).join('')}</div>`;
  });
  if (!chosen.length) h += '<p class="subheading" style="position:absolute;left:50px;top:150px">No current recognitions for this expression.</p>';
  return h + '</div>';
}

function mountOrbit() {
  ORBIT_PASS_TOKEN = ORBIT_LAST;
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
    p.scale = pos.k;
    // Clamp the drawn position so a planet at the low point of its orbit cannot
    // dip past the stage. The scene root is 636 tall and the .orbit-universe
    // layer is absolute, so a planet that oversteps adds to the scene's
    // scrollHeight and trips the no-overflow rule (measured at 641 and 653
    // against 636). Planets are placed by their top-left after subtracting
    // d/2, and the rendered size is d * k, so clamp against that.
    const drawn = b.d * pos.k;
    const left = clamp(pos.x - b.d / 2, 0, 1812 - drawn);
    const top = clamp(pos.y - b.d / 2, 0, 636 - drawn);
    p.el.style.transform = `translate(${left}px,${top}px) scale(${pos.k})`;
    p.el.style.zIndex = String(Math.round(10000 + pos.z));
    p.el.style.opacity = String(pos.z < 0 ? 0.72 + (0.28 * (pos.z + 395)) / 395 : 1);
    const blur = Math.min(1.8, Math.max(0, (-pos.z - 100) / 160));
    const shadow = `drop-shadow(0 ${(6 * pos.k).toFixed(1)}px ${(10 * pos.k).toFixed(1)}px #5C659240)`;
    p.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px) ${shadow}` : shadow;
    b.x = pos.x - b.d / 2;
    b.y = pos.y - b.d / 2 + 84;
    if (b.reading) tickCirclePages(b, V.clock);
    const cx = b.d / 2;
    const cy = b.d / 2;
    const rMoon = cx + 15;
    p.moons.forEach((moon, j) => {
      const a = V.clock * (0.33 + j * 0.04) + j * Math.PI + p.phase, mz = Math.sin(a) * 52, k = 600 / (600 - mz);
      moon.style.transform = `translate(${cx + Math.cos(a) * rMoon * k - 21.5}px,${cy + Math.sin(a) * 50 * k - 21.5}px) scale(${k})`;
      moon.style.zIndex = mz > 0 ? '4' : '1';
      moon.style.opacity = mz > 0 ? '1' : '.8';
    });
    if (V.clock - p.lastSwap > 24 && pos.z < -330) {
      const r = chooseRandom(slots.map((x) => x.id), b.expression) || chooseRandom(slots.map((x) => x.id));
      if (r) {
        const newD = orbitPlanetDiameter(r.message);
        b.d = newD;
        b.id = r.id;
        b.el.dataset.recordId = r.id;
        b.el.style.width = newD + 'px';
        b.el.style.height = newD + 'px';
        p.el.style.width = newD + 'px';
        p.el.style.height = newD + 'px';
        p.el.style.setProperty('--d', newD + 'px');
        b.el.innerHTML = `<div class="orb-life">${completeOrb(r, b.d)}</div>`;
        S.lastShown.set(r.id, S.t);
        markShown(r.id);
        bindNumbers(b.el);
        b.reading = fitCircle(b.el, r, b.d, V.clock);
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
  prime: tickOrbit,
  onLeave: leaveOrbit,
  archOpacity: '.13',
});
