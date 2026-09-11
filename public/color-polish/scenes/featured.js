// Scene 4: Featured Recognition.
'use strict';

const FEATURED_LAYERS = {
  far: { scale: 0.86, blur: 0.8, pace: 0.75, z: 40 },
  mid: { scale: 0.94, blur: 0.3, pace: 0.9, z: 60 },
  near: { scale: 1, blur: 0, pace: 1.1, z: 80 }
};
const FEATURED_DRIFT_TO = { far: 'mid', mid: 'near', near: 'near' };

let FEATURED_BAG = [];
let FEATURED_LAST = 0;
let FEATURED_PASS_ID = 0;
let FEATURED_FLIP_CANCEL = null;

function featuredNextId() {
  if (!FEATURED_BAG.length) {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }
    if (items[0] === FEATURED_LAST && items.length > 1) {
      const swapIndex = 1 + Math.floor(Math.random() * (items.length - 1));
      const temp = items[0];
      items[0] = items[swapIndex];
      items[swapIndex] = temp;
    }
    FEATURED_BAG = items;
  }
  const id = FEATURED_BAG.shift();
  FEATURED_LAST = id;
  return id;
}

function featuredMarkupPanel(id) {
  const e = catalog[id - 1];
  const otherIds = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== id);
  const words = e.phrase.split(/\s+/);
  const wordsHtml = words
    .map((w, i) => {
      const prefix = i === 0 ? '“' : '';
      const suffix = i === words.length - 1 ? '”' : '';
      return `<span class="phrase-word" style="--w-i:${i}">${prefix}${esc(w)}${suffix}</span>`;
    })
    .join(' ');
  const orbitIconsHtml = otherIds
    .map((oid) => icon(oid, 'orbit-icon'))
    .join('');

  return `<div class="feature-stage"><div class="feature-panel" style="--tint:${e.color}"><div class="feature-aurora"><div class="feature-blob blob-1"></div><div class="feature-blob blob-2"></div></div><div class="feature-sweep-clip"><div class="feature-sweep"></div></div><div class="feature-medallion-host"><div class="feature-ring ring-outer"></div><div class="feature-ring ring-inner"></div><div class="feature-orbit">${orbitIconsHtml}</div>${medallion(id)}</div><h2>${shimmer(e.name)}</h2><p class="principle" style="--principle-delay:${words.length * 70 + 80}ms">${esc(e.principle)}</p><p class="serif phrase">${wordsHtml}</p><div class="feature-progress">Recognitions selecting this expression</div></div></div>`;
}

function featured() {
  const id = (S.sceneAge > 0.5 && FEATURED_PASS_ID) ? FEATURED_PASS_ID : featuredNextId();
  FEATURED_PASS_ID = id;
  let h = `<div class="eyebrow">Featured Recognition · Expression <span class="feature-count">${String(id).padStart(2, '0')}</span> / 09</div>` + featuredMarkupPanel(id);
  const chosen = [];
  for (let i = 0; i < 3; i++) {
    const r = choose(chosen.map((a) => a.r.id), id);
    if (r) chosen.push({ r, expr: id });
  }
  while (chosen.length < 3) {
    const r = choose(chosen.map((a) => a.r.id));
    if (!r) break;
    chosen.push({ r, expr: null });
  }
  const long = chosen.find((item) => !smallFits(item.r));
  if (long) return h + addOrb(long.r, 820, 37, 580, { expression: long.expr, large: true });
  const ps = [[582, 64, 356], [1006, 283, 337], [1430, 76, 342]];
  h += chosen.map((item, i) => addOrb(item.r, ...ps[i], { expression: item.expr })).join('');
  if (!chosen.length) h += '<p class="subheading" style="position:absolute;left:650px;top:220px">No current recognitions.</p>';
  return h;
}

function featuredUpdateEyebrow(id) {
  const root = sceneRoot || document.querySelector('#stage .scene[data-scene="4"]');
  if (!root) return;
  const countEl = root.querySelector('.feature-count');
  if (countEl) {
    countEl.textContent = String(id).padStart(2, '0');
    countEl.classList.remove('flip');
    void countEl.offsetWidth;
    countEl.classList.add('flip');
  } else {
    const eyebrow = root.querySelector('.eyebrow');
    if (eyebrow) {
      eyebrow.textContent = `Featured Recognition · Expression ${String(id).padStart(2, '0')} / 09`;
    }
  }
}

function featuredUpdatePanelContent(panel, id) {
  const e = catalog[id - 1];
  panel.style.setProperty('--tint', e.color);

  const med = panel.querySelector('.medallion');
  if (med) {
    med.style.setProperty('--tint', e.color);
    med.innerHTML = icon(id);
  }

  const orbit = panel.querySelector('.feature-orbit');
  if (orbit) {
    const otherIds = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== id);
    orbit.innerHTML = otherIds.map((oid) => icon(oid, 'orbit-icon')).join('');
  }

  const h2 = panel.querySelector('h2');
  if (h2) {
    h2.innerHTML = shimmer(e.name);
  }

  const words = e.phrase.split(/\s+/);
  const phrase = panel.querySelector('.serif.phrase');
  if (phrase) {
    phrase.innerHTML = words
      .map((w, i) => {
        const prefix = i === 0 ? '“' : '';
        const suffix = i === words.length - 1 ? '”' : '';
        return `<span class="phrase-word" style="--w-i:${i}">${prefix}${esc(w)}${suffix}</span>`;
      })
      .join(' ');
  }

  const principle = panel.querySelector('.principle');
  if (principle) {
    principle.textContent = e.principle;
    principle.style.setProperty('--principle-delay', `${words.length * 70 + 80}ms`);
    principle.style.animation = 'none';
    void principle.offsetWidth;
    principle.style.animation = '';
  }
}

function featuredAdvance() {
  if (V.flipping) return;
  V.flipping = true;
  const newId = featuredNextId();
  FEATURED_PASS_ID = newId;

  const nonLarge = V.actors.filter((a) => !a.large);
  nonLarge.forEach((a, i) => {
    a.expression = newId;
    a.retireAt = V.clock + i * 4.2;
  });
  slots.forEach((s) => {
    if (!s.large) s.expression = newId;
  });

  const root = sceneRoot || document.querySelector('#stage .scene[data-scene="4"]');
  const panel = root?.querySelector('.feature-panel');
  if (!panel) {
    V.flipping = false;
    return;
  }

  V.flipStartAge = S.sceneAge;
  V.flipSwapped = false;
  panel.classList.add('flip-out');

  let outTimer = null;
  let inTimer = null;

  function onFlipOutAnim(evt) {
    if (evt.target === panel) onFlipOutEnd();
  }
  function onFlipInAnim(evt) {
    if (evt.target === panel) onFlipInEnd();
  }

  FEATURED_FLIP_CANCEL = () => {
    if (outTimer) clearTimeout(outTimer);
    if (inTimer) clearTimeout(inTimer);
    panel.removeEventListener('animationend', onFlipOutAnim);
    panel.removeEventListener('animationend', onFlipInAnim);
    if (typeof V !== 'undefined' && V) V.flipping = false;
  };

  let swapped = false;
  function onFlipOutEnd() {
    if (swapped) return;
    swapped = true;
    V.flipSwapped = true;
    panel.removeEventListener('animationend', onFlipOutAnim);
    clearTimeout(outTimer);
    outTimer = null;

    featuredUpdatePanelContent(panel, newId);
    featuredUpdateEyebrow(newId);

    panel.classList.remove('flip-out');
    panel.classList.add('flip-in');

    let inDone = false;
    function onFlipInEnd() {
      if (inDone) return;
      inDone = true;
      panel.removeEventListener('animationend', onFlipInAnim);
      clearTimeout(inTimer);
      inTimer = null;
      panel.classList.remove('flip-in');
      V.flipping = false;
      FEATURED_FLIP_CANCEL = null;
    }
    panel.addEventListener('animationend', onFlipInAnim);
    inTimer = setTimeout(onFlipInEnd, 520);
    V.flipInFinisher = onFlipInEnd;
  }
  panel.addEventListener('animationend', onFlipOutAnim);
  outTimer = setTimeout(onFlipOutEnd, 460);
  V.flipOutFinisher = onFlipOutEnd;
}

function featuredTickAge(dt) {
  if (S.sceneAge >= 15 && !V.featuredAdvanced) {
    V.featuredAdvanced = true;
    featuredAdvance();
  }
  if (V.flipping) {
    if (!V.flipSwapped && S.sceneAge >= (V.flipStartAge ?? 15) + 0.45) {
      V.flipOutFinisher?.();
    }
    if (V.flipSwapped && S.sceneAge >= (V.flipStartAge ?? 15) + 0.95) {
      V.flipInFinisher?.();
    }
  }
}

function mountFeatured(root) {
  FEATURED_FLIP_CANCEL?.();
  FEATURED_FLIP_CANCEL = null;
  V.featuredAdvanced = S.sceneAge >= 15;
  V.flipping = false;
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
  tickAge: featuredTickAge,
  integrate: integrateFeatured,
  place: placeFeatured,
  floaters: true,
  fxCanvas: true,
  topMargin: 87,
  keepOut: () => [{ x: 0, y: 0, w: 520, h: 636 }],
  replaceMode: 'drift'
});
