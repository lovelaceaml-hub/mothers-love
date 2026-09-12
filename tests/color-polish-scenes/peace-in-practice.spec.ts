import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  cardShape,
  circularity,
  loadRenderer,
  noOverflow,
  recognition,
  reducedMotionScene,
  settings,
  studioClickDoesNotAdvance,
} from './helpers';

test('peace in practice renders heart cards and no circular orbs at 14 s', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 14000 });

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBe(0);
  expect(circleResult.failures).toHaveLength(0);

  const shapeResult = await cardShape(frame, '.heart-card', 'heart');
  expect(shapeResult.count).toBeGreaterThanOrEqual(2);
  expect(shapeResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('background heart count increases at each explosion until the 160-heart cap over 40 s', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 1000 });

  let prevExplosionCount = 0;
  let prevHeartCount = 14;

  for (let t = 2000; t <= 40000; t += 2000) {
    await frame.evaluate((stepMs) => {
      (window as any).colorPolishRuntime.step(stepMs);
    }, 2000);

    const data = await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const state = runtime?.getState();
      const explosions = (state?.log || []).filter((e: any) => e.type === 'heart_explosion');
      const heartsCount = document.querySelectorAll('#heart-field .floating-heart:not(.pip-fading)').length;
      return {
        explosions,
        heartsCount,
      };
    });

    expect(data.heartsCount).toBeLessThanOrEqual(160);

    if (data.explosions.length > prevExplosionCount) {
      if (prevHeartCount < 160) {
        expect(data.heartsCount).toBeGreaterThan(prevHeartCount);
      } else {
        expect(data.heartsCount).toBe(160);
      }
      for (let i = prevExplosionCount; i < data.explosions.length; i++) {
        const exp = data.explosions[i];
        expect(exp.count).toBeGreaterThanOrEqual(12);
        expect(exp.count).toBeLessThanOrEqual(20);
      }
      prevExplosionCount = data.explosions.length;
      prevHeartCount = data.heartsCount;
    }
  }

  expect(prevExplosionCount).toBeGreaterThanOrEqual(5);
});

test('three card slots are disjoint in measured rects and at least two cards visible over 40 s', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 1000 });

  const rects = await frame.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('#heart-cards .heart-card'));
    return cards.map((c) => {
      const r = c.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
  });

  expect(rects.length).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      expect(overlap).toBe(false);
    }
  }

  for (let s = 1; s <= 40; s++) {
    if (s > 1) {
      await frame.evaluate(() => {
        (window as any).colorPolishRuntime.step(1000);
      });
    }

    const visibleCount = await frame.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('#heart-cards .heart-card'));
      return cards.filter((c) => {
        const style = window.getComputedStyle(c);
        const opacity = parseFloat(style.opacity || '1');
        return style.display !== 'none' && style.visibility !== 'hidden' && opacity > 0.05;
      }).length;
    });

    expect(visibleCount).toBeGreaterThanOrEqual(2);
  }
});

test('heart canvas dominant hue is red with saturation above 60 percent at hold midpoint', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 25000 });

  const samples = await frame.evaluate(() => {
    const canvas = document.querySelector('#heart-host canvas') as HTMLCanvasElement | null;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const points = [
      { fx: 0.50, fy: 0.35 },
      { fx: 0.35, fy: 0.55 },
      { fx: 0.65, fy: 0.55 },
    ];

    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
          case g: h = ((b - r) / d + 2) * 60; break;
          case b: h = ((r - g) / d + 4) * 60; break;
        }
      }
      return { h, s: s * 100, l: l * 100 };
    };

    return points.map((p) => {
      const x = Math.round(p.fx * canvas.width);
      const y = Math.round(p.fy * canvas.height);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hsl = rgbToHsl(pixel[0], pixel[1], pixel[2]);
      return { x, y, r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3], ...hsl };
    });
  });

  expect(samples).not.toBeNull();
  expect(samples!.length).toBe(3);

  for (const s of samples!) {
    expect(s.a).toBeGreaterThan(50);
    const hueOk = (s.h >= 345 && s.h <= 360) || (s.h >= 0 && s.h <= 10);
    expect(hueOk).toBe(true);
    expect(s.s).toBeGreaterThan(60);
  }
});

test('every card message is present in full in the DOM and font size is at or above 18 px', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 5000 });

  const cardData = await frame.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('#heart-cards .heart-card'));
    return cards.map((c) => {
      const msg = c.querySelector('.pip-card-message') as HTMLElement | null;
      const joinedPages = c.querySelector('.pip-joined-pages')?.textContent;
      const style = msg ? window.getComputedStyle(msg) : null;
      const fontSize = style ? parseFloat(style.fontSize) : 0;
      return {
        cardId: c.id,
        text: msg?.textContent || '',
        joinedPages: joinedPages || c.dataset.joinedPages || null,
        fullMessage: c.dataset.fullMessage || null,
        fontSize,
      };
    });
  });

  expect(cardData.length).toBeGreaterThan(0);
  for (const c of cardData) {
    expect(c.fontSize).toBeGreaterThanOrEqual(18);
    expect(c.text.length).toBeGreaterThan(0);
    if (c.fullMessage) {
      const textMatches = c.text === c.fullMessage || c.joinedPages === c.fullMessage;
      expect(textMatches).toBe(true);
    }
  }
});

test('noOverflow holds on scene root with 160 background hearts present', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 45000 });

  const heartCount = await frame.evaluate(() => document.querySelectorAll('#heart-field .floating-heart:not(.pip-fading)').length);
  expect(heartCount).toBe(160);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
});

test('frame time sampled at 3840 stays under 40 ms per frame with 160 background hearts', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  const frame = await loadRenderer(page, { scene: 9, ms: 45000 });

  const heartCount = await frame.evaluate(() => document.querySelectorAll('#heart-field .floating-heart:not(.pip-fading)').length);
  expect(heartCount).toBe(160);

  const frameDurationMs = await frame.evaluate(() => {
    const start = performance.now();
    (window as any).colorPolishRuntime.step(40);
    return performance.now() - start;
  });

  expect(frameDurationMs).toBeLessThan(40);
});

test('reduced motion renders the scene still with 3 static cards and 14 ambient hearts', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'peace-in-practice');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBe(0);
  expect(circleResult.failures).toHaveLength(0);

  const shapeResult = await cardShape(frame, '.heart-card', 'heart');
  expect(shapeResult.count).toBe(3);
  expect(shapeResult.failures).toHaveLength(0);

  const heartsCount = await frame.evaluate(() => document.querySelectorAll('#heart-field .floating-heart').length);
  expect(heartsCount).toBe(14);

  const hasCanvas = await frame.evaluate(() => {
    const host = document.querySelector('#heart-host');
    return Boolean(host?.querySelector('canvas'));
  });
  expect(hasCanvas).toBe(true);
});

test('no timer survives onLeave on forced scene change', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 3000 });

  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    runtime.setScene(1);
    const transition = runtime.getState().transition;
    runtime.step(transition ? (transition.duration - transition.age) * 1000 + 40 : 40);
  });

  const state = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const errors = (runtime?.getState().log || []).filter((e: any) => e.type === 'scene_onleave_error');
    const oldScene = document.querySelector('#stage .scene[data-scene="9"]');
    return {
      errors,
      hasOldScene: Boolean(oldScene),
    };
  });

  expect(state.errors).toHaveLength(0);
  expect(state.hasOldScene).toBe(false);
});

test('sculpted rotating heart is a real canvas that turns over time', async ({ page }) => {
  const frame2000 = await loadRenderer(page, { scene: 9, ms: 2000 });

  const check2000 = await frame2000.evaluate(() => {
    const host = document.querySelector('#heart-host');
    const canvas = host?.querySelector('canvas');
    const img = host?.querySelector('img');
    return {
      hasCanvas: Boolean(canvas),
      hasImg: Boolean(img),
      dataUrl: canvas ? canvas.toDataURL() : null,
      role: canvas?.getAttribute('role'),
      ariaLabel: canvas?.getAttribute('aria-label'),
    };
  });

  expect(check2000.hasCanvas).toBe(true);
  expect(check2000.hasImg).toBe(false);
  expect(check2000.role).toBe('img');
  expect(check2000.ariaLabel).toBe('Sculpted rotating heart');
  expect(check2000.dataUrl).toBeTruthy();

  const frame4000 = await loadRenderer(page, { scene: 9, ms: 4000 });

  const check4000 = await frame4000.evaluate(() => {
    const canvas = document.querySelector('#heart-host canvas') as HTMLCanvasElement | null;
    return canvas ? canvas.toDataURL() : null;
  });

  expect(check4000).toBeTruthy();
  expect(check2000.dataUrl).not.toBe(check4000);
});

test('heart canvas displays distinct luminance shading bands', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 2000 });

  const bands = await frame.evaluate(() => {
    const canvas = document.querySelector('#heart-host canvas') as HTMLCanvasElement | null;
    if (!canvas) return { shadow: 0, base: 0, highlight: 0, totalOpaque: 0, nonHighlightRatio: 0 };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { shadow: 0, base: 0, highlight: 0, totalOpaque: 0, nonHighlightRatio: 0 };

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let shadowCount = 0;
    let baseCount = 0;
    let highlightCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 50) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum < 165) shadowCount++;
      else if (lum <= 215) baseCount++;
      else highlightCount++;
    }

    const totalOpaque = shadowCount + baseCount + highlightCount;
    const nonHighlightRatio = totalOpaque > 0 ? (shadowCount + baseCount) / totalOpaque : 0;

    return { shadow: shadowCount, base: baseCount, highlight: highlightCount, totalOpaque, nonHighlightRatio };
  });

  expect(bands.shadow).toBeGreaterThan(200);
  expect(bands.base).toBeGreaterThan(200);
  expect(bands.highlight).toBeGreaterThan(200);
  expect(bands.nonHighlightRatio).toBeGreaterThanOrEqual(0.4);
});

test('still mode renders full 500-character message on card without truncation or paging stalls', async ({ page }) => {
  const longMessage =
    'Peace in practice is expressed every single day through patience, gentle understanding, warm encouragement, and unconditional kindness to everyone around us. '.repeat(
      4,
    ).slice(0, 500);
  expect(longMessage.length).toBe(500);

  const fixture = buildActiveDisplayFixture({
    settings: settings({ motion: 'still' }),
    recognitions: [
      recognition({
        id: 'rec-still-500',
        recipient: 'Kindness Partner',
        message: longMessage,
      }),
    ],
  });

  const frame = await loadRenderer(page, {
    scene: 9,
    ms: 1000,
    fixture,
  });

  const cardData = await frame.evaluate(() => {
    const card = document.querySelector('#heart-cards .heart-card') as HTMLElement | null;
    if (!card) return null;
    const msgEl = card.querySelector('.pip-card-message') as HTMLElement | null;
    return {
      text: msgEl?.textContent || '',
      fullMessage: card.dataset.fullMessage || '',
      hasPageIndicator: Boolean(card.querySelector('.pip-card-page')),
    };
  });

  expect(cardData).not.toBeNull();
  expect(cardData!.text).toBe(longMessage);
  expect(cardData!.hasPageIndicator).toBe(false);
});

test('after cap is reached, excess hearts enter fading state for at least one frame before DOM removal', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 60000 });

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(50000);
  });

  const nonFadingCount = await frame.evaluate(() => {
    const sceneRoot = document.querySelector<HTMLElement>('#stage .scene[data-scene="9"]');
    if (!sceneRoot) return 0;
    return sceneRoot.querySelectorAll('#heart-field .floating-heart:not(.pip-fading)').length;
  });
  expect(
    nonFadingCount,
    'Precondition failed: background heart count never reached the 160 cap',
  ).toBe(160);

  let foundFading = false;
  for (let step = 0; step < 30; step++) {
    await frame.evaluate(() => {
      (window as any).colorPolishRuntime.step(200);
    });

    const state = await frame.evaluate(() => {
      const sceneRoot = document.querySelector<HTMLElement>('#stage .scene[data-scene="9"]');
      if (!sceneRoot) return { count: 0, connected: false, opacities: [] };
      const fadingEls = Array.from(
        sceneRoot.querySelectorAll<HTMLElement>('#heart-field .floating-heart.pip-fading'),
      );
      return {
        count: fadingEls.length,
        connected: fadingEls.length > 0 && fadingEls.every((el) => el.isConnected),
        opacities: fadingEls.map((el) => ({
          inline: parseFloat(el.style.opacity || '1'),
          computed: parseFloat(window.getComputedStyle(el).opacity || '1'),
        })),
      };
    });

    if (state.count > 0 && state.connected) {
      foundFading = true;
      expect(state.count).toBeGreaterThan(0);
      expect(state.connected).toBe(true);
      expect(state.opacities.length).toBeGreaterThan(0);
      for (const op of state.opacities) {
        expect(op.inline).toBeGreaterThan(0);
        expect(op.inline).toBeLessThan(1);
        expect(op.computed).toBeGreaterThan(0);
        expect(op.computed).toBeLessThan(1);
      }

      // Advance past the 0.6 s fade duration
      await frame.evaluate(() => {
        (window as any).colorPolishRuntime.step(800);
      });

      const afterFadeState = await frame.evaluate(() => {
        const sceneRoot = document.querySelector<HTMLElement>('#stage .scene[data-scene="9"]');
        if (!sceneRoot) return { fadingCount: 0, totalCount: 0 };
        return {
          fadingCount: sceneRoot.querySelectorAll('#heart-field .floating-heart.pip-fading').length,
          totalCount: sceneRoot.querySelectorAll('#heart-field .floating-heart').length,
        };
      });

      expect(afterFadeState.fadingCount).toBe(0);
      expect(afterFadeState.totalCount).toBeLessThanOrEqual(160);
      break;
    }
  }

  expect(foundFading, 'Expected to observe at least one fading heart after reaching cap').toBe(true);
});

test('card with an 80-character recipient name renders the full name without ellipsis or horizontal overflow', async ({ page }) => {
  const longName = 'Alexandrina Victoria Elizabeth Montgomery Featherstonehaugh Beresford Harrington';
  expect(longName.length).toBe(80);

  const frame = await loadRenderer(page, {
    scene: 9,
    ms: 1000,
    fixture: buildActiveDisplayFixture({
      recognitions: [
        recognition({
          id: 'rec-long-name-80',
          recipient: longName,
          message: 'Peace begins with warm words and gentle understanding.',
        }),
      ],
    }),
  });

  const nameData = await frame.evaluate(() => {
    const nameEl = document.querySelector('#heart-cards .heart-card .pip-card-name') as HTMLElement | null;
    if (!nameEl) return null;
    return {
      text: nameEl.textContent || '',
      scrollWidth: nameEl.scrollWidth,
      clientWidth: nameEl.clientWidth,
    };
  });

  expect(nameData).not.toBeNull();
  expect(nameData!.text).toBe(longName);
  expect(nameData!.scrollWidth).toBeLessThanOrEqual(nameData!.clientWidth);
});
