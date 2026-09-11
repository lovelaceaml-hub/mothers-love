// Scene 1: Welcome / Living campaign.
'use strict';

(() => {
  const FAR_SCALE = 0.84;
  const FAR_BLUR = 0.9;
  const FAR_PACE = 0.7;
  const MID_SCALE = 0.93;
  const MID_BLUR = 0.35;
  const MID_PACE = 0.9;
  const NEAR_PACE = 1.15;

  const LAYERS = {
    far: { scale: FAR_SCALE, blur: FAR_BLUR, pace: FAR_PACE, z: 40 },
    mid: { scale: MID_SCALE, blur: MID_BLUR, pace: MID_PACE, z: 60 },
    near: { scale: 1, blur: 0, pace: NEAR_PACE, z: 80 }
  };

  function welcome() {
    return `<div style="position:absolute;left:15px;top:43px;width:831px"><div class="eyebrow">A living campaign of appreciation</div><h1 style="font-size:74px;letter-spacing:-2.2px;line-height:1.08;margin:20px 0 22px">The Words of<br>${shimmer('Mother’s Love')}</h1><p class="serif" style="font-size:29px;line-height:1.4;color:#89836b">Where a mother's love resides,<br>peace abides.</p></div>${art('community','left:-20px;top:325px;width:910px;height:298px')}${rightBubbles()}`;
  }

  function mountWelcome(root) {
    V.actors.forEach((a, i) => {
      if (a.large) {
        a.layer = 'near';
        if (a.el) a.el.dataset.depth = 'near';
        return;
      }
      const layer = i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
      a.layer = layer;
      const L = LAYERS[layer] || LAYERS.near;
      a.pace *= L.pace;
      if (a.el) a.el.dataset.depth = layer;
    });
  }

  function integrateWelcome(a, dt) {
    if (a.life === 'steady' && !a.large && V.clock >= a.nextTurn) {
      const sign = a.rng() > 0.5 ? 1 : -1;
      const deg = sign * (25 + a.rng() * 45);
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const vx = a.vx * cos - a.vy * sin;
      const vy = a.vx * sin + a.vy * cos;
      a.vx = vx;
      a.vy = vy;
      a.nextTurn = V.clock + 4 + a.rng() * 6;
    }
    return false;
  }

  function placeWelcome(a) {
    if (S.still) return true;
    const layer = a.layer || 'near';
    const L = LAYERS[layer] || LAYERS.near;
    const scale = a.screenScale * L.scale;
    const x = a.screenX;
    const y = a.screenY;
    const op = a.opacity;
    if (a.el) {
      if (a.el.dataset.depth !== layer) a.el.dataset.depth = layer;
      a.el.style.left = 0;
      a.el.style.top = 0;
      a.el.style.transform = `translate(${(x - a.d / 2).toFixed(2)}px,${(y - a.d / 2).toFixed(2)}px) scale(${scale.toFixed(4)})`;
      a.el.style.opacity = op.toFixed(3);
      a.el.style.zIndex = String(L.z + Math.round(scale * 100));
      const baseBlur = scale < 0.93 ? (0.93 - scale) * 3 : 0;
      const blur = Math.max(baseBlur, L.blur);
      a.el.style.filter = blur > 0 ? `blur(${blur.toFixed(2)}px)` : 'none';
    }
    const b = slots.find((b) => b.key === a.key);
    if (b) {
      b.x = x - a.d / 2;
      b.y = y - a.d / 2;
      b.phase = a.life;
    }
    return true;
  }

  registerScene(1, {
    markup: welcome,
    mount: mountWelcome,
    integrate: integrateWelcome,
    place: placeWelcome,
    floaters: true,
    fxCanvas: true,
    keepOut: () => [{ x: 0, y: 10, w: 855, h: 347 }],
    replaceMode: null
  });
})();
