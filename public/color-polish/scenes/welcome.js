// Scene 1: Welcome / Living campaign.
'use strict';

(() => {
  const WELCOME_FAR_SCALE = 0.84;
  const WELCOME_FAR_BLUR = 0.9;
  const WELCOME_FAR_PACE = 0.7;
  const WELCOME_MID_SCALE = 0.93;
  const WELCOME_MID_BLUR = 0.35;
  const WELCOME_MID_PACE = 0.9;
  const WELCOME_NEAR_PACE = 1.15;

  const WELCOME_LAYERS = {
    far: { scale: WELCOME_FAR_SCALE, blur: WELCOME_FAR_BLUR, pace: WELCOME_FAR_PACE, z: 40 },
    mid: { scale: WELCOME_MID_SCALE, blur: WELCOME_MID_BLUR, pace: WELCOME_MID_PACE, z: 60 },
    near: { scale: 1, blur: 0, pace: WELCOME_NEAR_PACE, z: 80 }
  };

  const WELCOME_POSITIONS = [
    [870, 22, 300],
    [1228, 14, 286],
    [1530, 60, 270],
    [930, 345, 268],
    [1290, 336, 272],
    [1575, 350, 224]
  ];

  function welcomeBubbles() {
    const chosen = [];
    const pool = records();
    for (let i = 0; i < 6; i++) {
      const exclude = pool.length && chosen.length >= pool.length ? [] : chosen.map((a) => a.id);
      const r = chooseRandom(exclude) || (pool.length ? pool[i % pool.length] : undefined);
      if (r) chosen.push(r);
    }
    return drawSlots(chosen, WELCOME_POSITIONS, { readerBounds: { maxW: 1780, maxH: 625 } });
  }

  function welcome() {
    return `<div style="position:absolute;left:15px;top:43px;width:831px"><div class="eyebrow">A living campaign of appreciation</div><h1 style="font-size:74px;letter-spacing:-2.2px;line-height:1.08;margin:20px 0 22px">The Words of<br>${shimmer('Mother’s Love')}</h1><p class="serif" style="font-size:29px;line-height:1.4;color:#89836b">Where a mother's love resides,<br>peace abides.</p></div>${art('community','left:-20px;top:325px;width:910px;height:298px')}${welcomeBubbles()}`;
  }

  function mountWelcome(root) {
    V.welcomeLastExit = -9999;
    V.actors.forEach((a, i) => {
      a._welcomeSeenLife = a.life;
      a.trail = [];
      a.enterLifeAt = -1;
      a.exitLifeAt = -1;

      const isOdd = i % 2 === 1;
      if (a.el) {
        a.el.style.setProperty('--welcome-ring-delay', `${(-i * 1.5).toFixed(1)}s`);
        a.el.classList.toggle('spin-reverse', isOdd);
      }

      a.retireAt = 9 + i * 4.6;
      const layer = i === 3 ? 'near' : ['far', 'mid', 'near'][i % 3];
      a.layer = layer;
      const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
      a.pace *= L.pace;
      if (a.el) a.el.dataset.depth = layer;
    });
  }

  function primeWelcome() {
    if (!V.speech || !V.speech.length) return;
    const delays = [0, 2.5, 5.0];
    V.speech.forEach((b, i) => {
      if (b.el) {
        b.el.dataset.speaker = String(i);
      }
      if (!S.still) {
        if (i === 0) {
          b.phase = 'showing';
          b.age = 0;
          b.duration = 6.0;
        } else {
          const delay = delays[i] || 2.5;
          b.phase = 'fading_out';
          b.fadeAge = 0.5 - delay;
          if (b.el) b.el.classList.add('fading');
        }
      } else {
        b.phase = 'showing';
        b.age = 0;
        if (b.el) b.el.classList.remove('fading');
      }
    });
  }

  function integrateWelcome(a, dt) {
    if (a.life === 'exiting' && a._welcomeSeenLife !== 'exiting') {
      V.welcomeLastExit = V.clock;
    }
    a._welcomeSeenLife = a.life;

    const isExitBlocked =
      V.actors.some((act) => act.life === 'exiting' || act.life === 'absent') ||
      (typeof V.welcomeLastExit === 'number' && V.clock - V.welcomeLastExit < 4.6);

    if (isExitBlocked) {
      for (const act of V.actors) {
        if (act.life === 'steady' && act.retireAt <= V.clock) {
          act.retireAt = V.clock + 0.5;
        }
      }
    }

    if (a.born > 0 && a.life === 'steady' && a.retireAt - a.born > 22) {
      a.retireAt = a.born + 14 + a.rng() * 6;
    }

    if (a.life === 'steady' && V.clock >= a.nextTurn) {
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
    const layer = a.layer || 'near';
    const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
    const scale = a.screenScale * L.scale;
    const x = a.screenX;
    const y = a.screenY;
    const op = a.opacity;

    let R = 0;
    if (!S.still) {
      if (a.life === 'entering') {
        if (a.enterLifeAt !== a.lifeAt) {
          a.enterLifeAt = a.lifeAt;
          const sign = a.rng() > 0.5 ? 1 : -1;
          a.enterAngle = sign * (200 + a.rng() * 120);
        }
        const p = Math.max(0, V.clock - a.lifeAt);
        const q = clamp(p / 3.8, 0, 1);
        const easeOut = outCubic(q);
        R = a.enterAngle * (1 - easeOut);
      } else if (a.life === 'exiting') {
        if (a.exitLifeAt !== a.lifeAt) {
          a.exitLifeAt = a.lifeAt;
          const sign = a.rng() > 0.5 ? 1 : -1;
          a.exitAngle = sign * 160;
        }
        const p = Math.max(0, V.clock - a.lifeAt);
        const q = clamp(p / 3.8, 0, 1);
        const easeIn = q * q * q;
        R = a.exitAngle * easeIn;
      }
    }

    if (a.el) {
      if (a.el.dataset.depth !== layer) a.el.dataset.depth = layer;
      a.el.style.left = '0px';
      a.el.style.top = '0px';
      const half = (a.d / 2) * scale;
      const minX = half + 8;
      const maxX = 1812 - half - 30;
      const minY = half + 8;
      const maxY = 636 - half - 8;
      const renderX = minX <= maxX ? clamp(x, minX, maxX) : (minX + maxX) / 2;
      const renderY = minY <= maxY ? clamp(y, minY, maxY) : (minY + maxY) / 2;
      a.el.style.transform = `translate(${(renderX - a.d / 2).toFixed(2)}px,${(renderY - a.d / 2).toFixed(2)}px) rotate(${R.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      a.el.style.opacity = op.toFixed(3);
      a.el.style.zIndex = String(L.z + Math.round(scale * 100));
      const baseBlur = scale < 0.93 ? (0.93 - scale) * 3 : 0;
      const blur = Math.min(0.9, Math.max(baseBlur, L.blur));
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

  function drawWelcome(dt) {
    if (S.still || !V.canvas) return;
    const c = V.canvas.getContext('2d');
    if (!c) return;

    let sparksDrawn = 0;

    // (a) Soft ground shadow ellipse under every visible bubble
    for (const a of V.actors) {
      if (a.life === 'absent' || a.opacity <= 0.01) continue;
      const layer = a.layer || 'near';
      const baseAlpha = layer === 'near' ? 0.10 : layer === 'mid' ? 0.06 : 0.03;
      const alpha = baseAlpha * a.opacity;
      const scale = a.screenScale;
      const width = 0.8 * a.d * scale;
      const rx = width / 2;
      const ry = rx * 0.28;
      const cx = a.screenX;
      const cy = a.screenY + 0.55 * a.d * scale;

      c.save();
      c.beginPath();
      c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      c.fillStyle = `rgba(128, 116, 81, ${alpha.toFixed(4)})`;
      c.fill();
      c.restore();
    }

    // (b) Sparkle trail behind entering or exiting bubbles
    for (const a of V.actors) {
      if (!a.trail) a.trail = [];
      if (a.life === 'entering' || a.life === 'exiting') {
        a.trail.push({ x: a.screenX, y: a.screenY });
        if (a.trail.length > 14) a.trail.shift();

        const len = a.trail.length;
        for (let j = 0; j < len; j++) {
          if (sparksDrawn >= 120) break;
          const pt = a.trail[j];
          const progress = (j + 1) / len;
          const opacity = progress * 0.85 * a.opacity;
          const r = 1.2 + progress * 2.2;
          const color = j % 2 === 0 ? '#e8c777' : '#fff9';
          drawSpark(c, pt.x, pt.y, r, opacity, color);
          sparksDrawn++;
        }
      } else if (a.trail.length > 0) {
        a.trail.length = 0;
      }
    }

    // (c) Orbiting glint per steady bubble
    for (const a of V.actors) {
      if (a.life !== 'steady' || a.opacity <= 0.01) continue;
      if (sparksDrawn >= 120) break;
      const layer = a.layer || 'near';
      const L = WELCOME_LAYERS[layer] || WELCOME_LAYERS.near;
      const rimR = (a.d * a.screenScale) / 2;
      const angle = (V.clock * 1.6 * L.pace + (a.phase || 0)) % TAU;
      const gx = a.screenX + Math.cos(angle) * rimR;
      const gy = a.screenY + Math.sin(angle) * rimR;
      const sparkR = 2.4 * a.screenScale;
      const sparkOp = 0.85 * a.opacity;
      drawSpark(c, gx, gy, sparkR, sparkOp, '#fff9');
      sparksDrawn++;
    }
  }

  function leaveWelcome(root) {
    // Scene descriptor onLeave hook. No active timers in Welcome.
  }

  registerScene(1, {
    markup: welcome,
    mount: mountWelcome,
    prime: primeWelcome,
    integrate: integrateWelcome,
    place: placeWelcome,
    draw: drawWelcome,
    onLeave: leaveWelcome,
    speakers: [
      { x: 509, y: 361 },
      { x: 628, y: 422 },
      { x: 702, y: 408 }
    ],
    floaters: true,
    fxCanvas: true,
    keepOut: () => [{ x: 0, y: 10, w: 855, h: 347 }],
    replaceMode: 'drift'
  });
})();
