// Scene 4: Featured Recognition.
'use strict';

const FEATURED_LAYERS = {
  far: { scale: 0.86, blur: 0.8, pace: 0.75, z: 40 },
  mid: { scale: 0.94, blur: 0.3, pace: 0.9, z: 60 },
  near: { scale: 1, blur: 0, pace: 1.1, z: 80 }
};
const FEATURED_DRIFT_TO = { far: 'mid', mid: 'near', near: 'near' };

function featured() {
  const id = S.featured, e = catalog[id - 1];
  let h = `<div class="eyebrow">Featured Recognition · Expression ${String(id).padStart(2, '0')} / 09</div><div class="feature-panel" style="--tint:${e.color}">${medallion(id)}<h2>${shimmer(e.name)}</h2><p class="principle">${esc(e.principle)}</p><p class="serif">“${esc(e.phrase)}”</p><div class="feature-progress">Recognitions selecting this expression</div></div>`;
  const chosen = [];
  for (let i = 0; i < 3; i++) {
    const r = choose(chosen.map((a) => a.id), id);
    if (r) chosen.push(r);
  }
  const long = chosen.find((r) => !smallFits(r));
  if (long) return h + addOrb(long, 820, 37, 580, { expression: id, large: true });
  const ps = [[582, 64, 356], [1006, 283, 337], [1430, 76, 342]];
  h += chosen.map((r, i) => addOrb(r, ...ps[i], { expression: id })).join('');
  if (!chosen.length) h += '<p class="subheading" style="position:absolute;left:650px;top:220px">No current recognitions for this expression.</p>';
  return h;
}

function mountFeatured(root) {
  V.actors.forEach((a, i) => {
    if (a.large) {
      a.layer = 'near';
      if (a.el) a.el.dataset.depth = 'near';
      return;
    }
    a.layer = i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
    const L = FEATURED_LAYERS[a.layer] || FEATURED_LAYERS.near;
    a.pace *= L.pace;
    if (a.el) a.el.dataset.depth = a.layer;
  });
}

function integrateFeatured(a, dt) {
  if (a.life === 'steady' && !a.large && V.clock - a.born >= 12 && !a.shifted) {
    a.shifted = true;
    a.shiftFrom = a.layer;
    a.shiftAt = V.clock;
    a.layer = FEATURED_DRIFT_TO[a.layer] || 'near';
  }
  return false;
}

function placeFeatured(a) {
  if (a.life === 'entering') {
    a.shifted = false;
    a.shiftAt = undefined;
  }
  if (a.el && a.el.dataset.depth !== a.layer) {
    a.el.dataset.depth = a.layer;
  }
  const isShifting = a.shiftAt !== undefined && V.clock - a.shiftAt >= 0 && V.clock - a.shiftAt < 2;
  let layerScale, layerBlur;
  if (isShifting) {
    const fromL = FEATURED_LAYERS[a.shiftFrom] || FEATURED_LAYERS.near;
    const toL = FEATURED_LAYERS[a.layer] || FEATURED_LAYERS.near;
    const q = smooth((V.clock - a.shiftAt) / 2);
    layerScale = lerp(fromL.scale, toL.scale, q);
    layerBlur = lerp(fromL.blur, toL.blur, q);
  } else {
    const baseL = FEATURED_LAYERS[a.layer] || FEATURED_LAYERS.near;
    layerScale = baseL.scale;
    layerBlur = baseL.blur;
  }
  const L = isShifting
    ? { ...(FEATURED_LAYERS[a.layer] || FEATURED_LAYERS.near), blur: layerBlur }
    : (FEATURED_LAYERS[a.layer] || FEATURED_LAYERS.near);
  const scale = a.screenScale * layerScale;
  const x = a.screenX, y = a.screenY, op = a.opacity;
  a.el.style.left = 0;
  a.el.style.top = 0;
  a.el.style.transform = `translate(${(x - a.d / 2).toFixed(2)}px,${(y - a.d / 2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
  a.el.style.opacity = op.toFixed(3);
  a.el.style.zIndex = String(L.z + Math.round(scale * 100));
  const baseBlur = scale < 0.93 ? (0.93 - scale) * 3 : 0;
  const blur = Math.min(.9, Math.max(baseBlur, L.blur));
  a.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : 'none';
  const b = slots.find((b) => b.key === a.key);
  if (b) {
    b.x = x - a.d / 2;
    b.y = y - a.d / 2;
    b.phase = a.life;
  }
  return true;
}

registerScene(4, {
  markup: featured,
  mount: mountFeatured,
  integrate: integrateFeatured,
  place: placeFeatured,
  floaters: true,
  fxCanvas: true,
  topMargin: 87,
  keepOut: () => [{ x: 0, y: 0, w: 520, h: 636 }],
  replaceMode: 'drift'
});
