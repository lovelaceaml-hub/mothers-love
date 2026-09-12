// Scene 2: Recognition Garden.
'use strict';

const GARDEN_LAYERS = {
  far: { scale: 0.86, blur: 0.7, pace: 0.75, z: 40 },
  mid: { scale: 0.94, blur: 0.25, pace: 0.9, z: 60 },
  near: { scale: 1, blur: 0, pace: 1.1, z: 80 }
};

function garden() {
  let h = heading('Recognition Garden', 'Appreciation, all around us.');
  const chosen = [];
  if (S.forceId) {
    const fr = records().find(r => r.id === S.forceId);
    if (fr) chosen.push(fr);
  }
  for (let i = chosen.length; i < Math.min(5, records().length); i++) {
    const r = chooseRandom(chosen.map(a => a.id));
    if (r) chosen.push(r);
  }
  if (!chosen.length) return h + emptyPanel();
  chosen.sort((a, b) => b.message.length - a.message.length);
  const long = chosen.find(r => !smallFits(r));
  const ps = long
    ? [[18, 88, 508], [597, 96, 284], [927, 286, 294], [1266, 83, 285], [1497, 332, 278]]
    : [[29, 141, 304], [389, 307, 299], [751, 96, 303], [1121, 297, 302], [1462, 128, 300]];
  h += '<canvas class="garden-canvas" id="living-garden" width="1812" height="636" aria-hidden="true"></canvas>';
  h += drawSlots(chosen, ps, { readerBounds: { maxW: 1786, maxH: 623 } });
  return h + '<div class="garden-caption">Every expression of Mother’s Love helps the garden grow.</div>';
}

function mountGarden(root) {
  const rng = randSeed(89001);
  V.garden = {
    canvas: $('living-garden'),
    plants: [],
    pending: [],
    glows: [],
    petals: []
  };
  for (let i = 0; i < 28; i++) {
    V.garden.plants.push({
      x: 20 + i * 66 + (rng() - 0.5) * 35,
      y: 617 + rng() * 15,
      height: 20 + rng() * 35,
      phase: rng() * TAU,
      born: -20,
      color: ['#edc66e', '#e1acae', '#d6bdcf', '#f7e6ab'][i % 4],
      leaves: rng() > 0.3
    });
  }

  if (V.actors) {
    V.actors.forEach((a, i) => {
      if (a.large) {
        a.layer = 'near';
        if (a.el) a.el.dataset.depth = 'near';
        return;
      }
      a.layer = i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
      const L = GARDEN_LAYERS[a.layer] || GARDEN_LAYERS.near;
      a.pace *= L.pace;
      if (a.el) a.el.dataset.depth = a.layer;
    });
  }

  drawGarden();
}

function gardenGlow(x, born) {
  V.garden?.glows.push({ x, born });
}

function integrateGarden(a, dt) {
  return false;
}

function placeGarden(a) {
  if (a.el && a.el.dataset.depth !== a.layer) a.el.dataset.depth = a.layer;
  const L = GARDEN_LAYERS[a.layer] || GARDEN_LAYERS.near,
    scale = a.screenScale * L.scale,
    x = a.screenX,
    y = a.screenY,
    op = a.opacity;
  a.el.style.left = 0;
  a.el.style.top = 0;
  a.el.style.transform = `translate(${(x - a.d / 2).toFixed(2)}px,${(y - a.d / 2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
  a.el.style.opacity = op.toFixed(3);
  a.el.style.zIndex = String(L.z + Math.round(scale * 100));
  const baseBlur = scale < 0.93 ? (0.93 - scale) * 3 : 0,
    blur = Math.min(.9, Math.max(baseBlur, L.blur));
  a.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : 'none';
  const b = slots.find(b => b.key === a.key);
  if (b) {
    b.x = x - a.d / 2;
    b.y = y - a.d / 2;
    b.phase = a.life;
  }
  return true;
}

function plant(c, p, t) {
  let grow = p.born < 0 ? 1 : outCubic((t - p.born) / 2.9);
  if (grow <= 0) return;
  let sway = Math.sin(t * 0.62 + p.phase) * 3.8 + Math.sin(t * 0.27 + p.phase * 2) * 1.8;
  c.save();
  c.translate(p.x, p.y);
  c.scale(grow, grow);
  c.strokeStyle = '#8caa7787';
  c.lineWidth = 2.3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(4, -p.height * 0.3, -5 + sway, -p.height * 0.62, sway, -p.height);
  c.stroke();
  if (p.leaves) {
    for (let side of [-1, 1]) {
      c.save();
      c.translate(sway * 0.3, -p.height * 0.4);
      c.rotate(side * 0.52 + sway * 0.02);
      c.fillStyle = side < 0 ? '#a3bc80ab' : '#b8c58b9c';
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(side * 25, -26, side * 28, -20);
      c.quadraticCurveTo(side * 20, 5, 0, 0);
      c.fill();
      c.restore();
    }
  }
  c.translate(sway, -p.height);
  c.rotate(sway * 0.04);
  const bloom = smooth((grow - 0.38) / 0.62);
  c.scale(bloom, bloom);
  for (let k = 0; k < 6; k++) {
    c.save();
    c.rotate((k * TAU) / 6);
    const g = c.createLinearGradient(0, 0, 0, -22);
    g.addColorStop(0, p.color);
    g.addColorStop(1, '#fff8e8');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, -9, 6.5, 12, Math.sin(t * 0.4 + p.phase + k) * 0.08, 0, TAU);
    c.fill();
    c.restore();
  }
  c.fillStyle = '#d8ad50';
  c.beginPath();
  c.arc(0, 0, 4.2, 0, TAU);
  c.fill();
  c.restore();
}

function drawGarden() {
  const g = V.garden;
  if (!g) return;
  const c = g.canvas.getContext('2d'),
    t = V.clock;
  c.clearRect(0, 0, 1812, 636);
  const wash = c.createLinearGradient(0, 490, 0, 636);
  wash.addColorStop(0, '#cbdcaa00');
  wash.addColorStop(1, '#c1d19b43');
  c.fillStyle = wash;
  c.fillRect(0, 490, 1812, 146);

  c.save();
  c.beginPath();
  c.rect(0, 470, 1812, 166);
  c.clip();
  const lx = ((t * 102) % 2652) - 420;
  const lg = c.createLinearGradient(lx, 0, lx + 420, 0);
  lg.addColorStop(0, '#fff4ba00');
  lg.addColorStop(0.5, '#FFF4BA38');
  lg.addColorStop(1, '#fff4ba00');
  c.fillStyle = lg;
  c.fillRect(lx, 470, 420, 166);
  c.restore();

  g.pending = g.pending.filter(p => {
    if (t >= p.born) {
      g.plants.push({
        x: p.x,
        y: 628,
        height: 53 + (g.plants.length % 4) * 13,
        phase: g.plants.length * 2.4,
        born: t,
        color: p.color,
        leaves: true
      });
      if (g.plants.length > 72) g.plants.splice(0, 1);
      log('garden_flower_grown', { flowers: g.plants.length });
      return false;
    }
    return true;
  });
  g.plants.forEach(p => plant(c, p, t));
  for (const glow of g.glows) {
    const age = t - glow.born;
    if (age > 3) continue;
    const r = 80 * smooth(age / 2) + 15,
      grad = c.createRadialGradient(glow.x, 625, 0, glow.x, 625, r);
    grad.addColorStop(0, `rgba(234,199,107,${Math.sin((Math.PI * age) / 3) * 0.65})`);
    grad.addColorStop(1, '#ffe7a900');
    c.fillStyle = grad;
    c.fillRect(glow.x - r, 625 - r, 2 * r, 2 * r);
  }
  g.glows = g.glows.filter(a => t - a.born < 3);
  for (const a of V.actors) {
    if (a.life === 'sprout') {
      const age = t - a.lifeAt,
        q = smooth(age / 2.65);
      c.save();
      c.strokeStyle = `rgba(168,190,124,${0.7 * (1 - q)})`;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(a.originX, 633);
      c.bezierCurveTo(a.originX - 25, 570, a.screenX + 15, a.screenY + 90, a.screenX, a.screenY);
      c.stroke();
      c.restore();
    }
  }

  if (g.petals) {
    g.petals = g.petals.filter(p => t - p.start < p.life);
    if (g.petals.length > 120) g.petals.splice(0, g.petals.length - 120);
    if (g.canvas) g.canvas.dataset.petals = String(g.petals.length);
    for (const p of g.petals) {
      const age = t - p.start;
      const q = clamp(age / p.life, 0, 1);
      const x = p.x + p.vx * age * 0.35 + age * 14 + Math.sin(age * 1.3 + p.phase) * 18;
      const y = p.y + p.vy * age * 0.3 - age * 6 + Math.sin(age * 0.9 + p.phase) * 9;
      const alpha = Math.sin(Math.PI * q) * 0.85;
      c.save();
      c.globalAlpha = clamp(alpha, 0, 1);
      c.translate(x, y);
      c.rotate(age * 1.1 + p.phase);
      c.scale(0.7 + 0.3 * Math.sin(age * 2 + p.phase), 1);
      c.fillStyle = p.color;
      c.beginPath();
      c.moveTo(0, -p.r);
      c.bezierCurveTo(p.r * 1.5, -p.r, p.r, p.r, 0, p.r);
      c.bezierCurveTo(-p.r * 0.7, p.r, -p.r * 0.9, -p.r * 0.5, 0, -p.r);
      c.fill();
      c.restore();
    }
  } else if (g.canvas) {
    g.canvas.dataset.petals = '0';
  }
}

function gardenReplaceActor(a) {
  const excluded = V.actors.map(x => x.id).concat(V.actors.map(x => x.nextId).filter(Boolean));
  const r = chooseRandom(excluded, a.expression);
  if (!r) return false;
  a.nextId = r.id;
  a.life = 'swelling';
  a.lifeAt = V.clock;
  a.exitDX = (a.x > 900 ? 1 : -1) * (a.d + 350);
  a.exitDY = (a.rng() - 0.5) * 220;
  log('bubble_exit_start', { scene: S.s, id: a.id, kind: 'petals', age: V.clock - a.born });
  return true;
}

function gardenReplace() {
  const ready = V.actors
    .filter(a => a.life === 'steady' && V.clock - a.born >= Math.max(13, a.minRead || 0))
    .sort((a, b) => a.born - b.born || a.serial - b.serial);
  if (ready.length && gardenReplaceActor(ready[0])) {
    log('garden_replacement', { scene: 2, index: ++V.serial, active: V.actors.length });
  }
  V.next += 7;
}

registerScene(2, {
  markup: garden,
  mount: mountGarden,
  draw: drawGarden,
  integrate: integrateGarden,
  place: placeGarden,
  floaters: true,
  fxCanvas: true,
  topMargin: 87,
  replaceEvery: 14,
  replaceMode: 'garden',
  entrance: 'sprout',
  burst: 'petals',
  keepOut: () => [{ x: 0, y: 0, w: 1812, h: 78 }],
  onRetire(a) {
    const x = clamp(a.x + (a.rng() - 0.5) * 190, 50, 1762);
    V.garden.pending.push({
      x,
      born: V.clock + 2.15,
      color: catalog[S.pool.find(r => r.id === a.id).ids[0] - 1].color
    });
    V.fx.push({ kind: 'return', x: a.x, y: a.y, tx: x, ty: 603, start: V.clock, life: 2.2, color: '#e3b95c' });

    const petals = [];
    V.fx = V.fx.filter(p => {
      if (p.kind === 'petals') {
        petals.push(p);
        return false;
      }
      return true;
    });

    V.garden.petals.push(...petals);
    if (V.garden.petals.length > 120) V.garden.petals.splice(0, V.garden.petals.length - 120);
  }
});
