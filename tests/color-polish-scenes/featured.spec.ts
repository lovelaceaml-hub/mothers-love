import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

// Featured turns to its next expression at 15 s and every bubble re-enters
// from below the scene. The Studio preview plays on its own for a moment
// before a check pauses it, a second or two on a busy machine, so a check of
// the settled scene looks at 11 s, well clear of that turn.
test('featured renders circular bubbles and no overflow at 11 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 11000);
  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('the scene stays populated and replaces one bubble at a time', async ({ page }) => {
  test.setTimeout(60000);
  const checkpoints = [2000, 8000, 14000, 20000, 26000];
  for (const ms of checkpoints) {
    const { frame } = await openStudioScene(page, 'featured', ms);
    const visual = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
    expect(visual.actors.length).toBeGreaterThanOrEqual(1);
    const exitingActors = visual.actors.filter((a: any) => a.life === 'exiting');
    expect(exitingActors.length).toBeLessThanOrEqual(1);
  }
});

test('bubbles span two depth layers', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 11000);

  const depths = await frame.evaluate(() => {
    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb-slot'));
    return slots.map((el) => el.dataset.depth);
  });
  const uniqueDepths = new Set(depths.filter(Boolean));
  expect(uniqueDepths.size).toBeGreaterThanOrEqual(2);

  const visual = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState());
  const blurs = visual.actors.map((a: any) => {
    const match = (a.blur || '').match(/blur\(([\d.]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  });

  expect(blurs.some((b: number) => b >= 0.3)).toBe(true);
  // A near bubble's gentle depth sway can add a faint size blur (at most
  // 0.09 px, core/motion.js); far and mid bubbles carry 0.3 px or more.
  expect(blurs.some((b: number) => b < 0.15)).toBe(true);
});

test('bubbles stay circular during an exit', async ({ page }) => {
  test.setTimeout(60000);
  const checkpoints = [300, 6000, 14000, 20000];
  for (const ms of checkpoints) {
    const { frame } = await openStudioScene(page, 'featured', ms);
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders the featured scene still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'featured');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('expression panel displays catalog content and eight orbit icons at 2 s and 17 s', async ({ page }) => {
  const catalogNames = [
    'Greeting',
    'Gratitude',
    'Apology',
    'Inclusiveness',
    'Concession',
    'Respect',
    'Encouragement',
    'Consideration',
    'Compliment',
  ];

  const { frame: frame2000 } = await openStudioScene(page, 'featured', 2000);
  const panel2000 = await frame2000.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const nameEl = scene?.querySelector<HTMLElement>('.feature-panel h2');
    const icons = scene?.querySelectorAll<HTMLImageElement>('.feature-orbit .orbit-icon');
    return {
      name: nameEl?.textContent?.trim() || '',
      orbitCount: icons?.length || 0,
    };
  });
  expect(catalogNames).toContain(panel2000.name);
  expect(panel2000.orbitCount).toBe(8);

  const { frame: frame17000 } = await openStudioScene(page, 'featured', 17000);
  const panel17000 = await frame17000.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const nameEl = scene?.querySelector<HTMLElement>('.feature-panel h2');
    const eyebrowEl = scene?.querySelector<HTMLElement>('.eyebrow');
    return {
      name: nameEl?.textContent?.trim() || '',
      eyebrow: eyebrowEl?.textContent || '',
    };
  });
  expect(catalogNames).toContain(panel17000.name);
  const id = catalogNames.indexOf(panel17000.name) + 1;
  const paddedId = String(id).padStart(2, '0');
  expect(panel17000.eyebrow).toContain(`Expression ${paddedId} / 09`);
});

test('expression panel rotates across fresh opens', async ({ page }) => {
  test.setTimeout(60000);
  const names = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const { frame } = await openStudioScene(page, 'featured', 300);
    const name = await frame.evaluate(() => {
      const h2 = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel h2');
      return h2?.textContent?.trim() || '';
    });
    if (name) names.add(name);
  }
  expect(names.size).toBeGreaterThanOrEqual(2);
});

test('in-pass advance flips cleanly with no error at 16 s', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const { frame } = await openStudioScene(page, 'featured', 16000);
  await page.waitForTimeout(700);

  const classes = await frame.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel');
    return {
      hasFlipOut: panel?.classList.contains('flip-out') ?? false,
      hasFlipIn: panel?.classList.contains('flip-in') ?? false,
    };
  });

  expect(errors).toHaveLength(0);
  expect(classes.hasFlipOut).toBe(false);
  expect(classes.hasFlipIn).toBe(false);
});

test('keepAge remount preserves current expression and does not re-flip when sceneAge >= 15', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 17000);
  const before = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const name = scene?.querySelector<HTMLElement>('.feature-panel h2')?.textContent?.trim() || '';
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    return { name, eyebrow };
  });

  await frame.evaluate(() => {
    (window as any).renderNow(4, { keepAge: true });
  });

  const after = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const name = scene?.querySelector<HTMLElement>('.feature-panel h2')?.textContent?.trim() || '';
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const panel = scene?.querySelector<HTMLElement>('.feature-panel');
    return {
      name,
      eyebrow,
      hasFlipOut: panel?.classList.contains('flip-out') ?? false,
      hasFlipIn: panel?.classList.contains('flip-in') ?? false,
    };
  });

  expect(after.name).toBe(before.name);
  expect(after.eyebrow).toBe(before.eyebrow);
  expect(after.hasFlipOut).toBe(false);
  expect(after.hasFlipIn).toBe(false);

  await page.waitForTimeout(900);

  const settled = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const name = scene?.querySelector<HTMLElement>('.feature-panel h2')?.textContent?.trim() || '';
    const panel = scene?.querySelector<HTMLElement>('.feature-panel');
    return {
      name,
      hasFlipOut: panel?.classList.contains('flip-out') ?? false,
      hasFlipIn: panel?.classList.contains('flip-in') ?? false,
    };
  });

  expect(settled.name).toBe(before.name);
  expect(settled.hasFlipOut).toBe(false);
  expect(settled.hasFlipIn).toBe(false);
});

test('sweep clip wrapper exists and feature panel preserves 3d without overflow hidden', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'featured', 2000);
  const info = await frame.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel');
    const clip = panel?.querySelector<HTMLElement>('.feature-sweep-clip');
    const sweep = clip?.querySelector<HTMLElement>('.feature-sweep');
    const panelStyle = panel ? window.getComputedStyle(panel) : null;
    const clipStyle = clip ? window.getComputedStyle(clip) : null;
    return {
      hasClip: Boolean(clip),
      hasSweepInClip: Boolean(sweep),
      panelOverflow: panelStyle?.overflow,
      clipOverflow: clipStyle?.overflow,
    };
  });

  expect(info.hasClip).toBe(true);
  expect(info.hasSweepInClip).toBe(true);
  expect(info.panelOverflow).not.toBe('hidden');
  expect(info.clipOverflow).toBe('hidden');
});

test('at 14 s eyebrow and bubbles match first expression, at 21 s match second, with burst between', async ({ page }) => {
  const recognitions: Array<Record<string, unknown>> = [];
  for (let expr = 1; expr <= 9; expr++) {
    for (let j = 1; j <= 3; j++) {
      recognitions.push({
        id: `rec-e${expr}-${j}`,
        recipient: `Person ${expr}-${j}`,
        message: `Gratitude message ${j} for expression ${expr}.`,
        expressionIds: [expr],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      });
    }
  }
  const fixture = buildActiveDisplayFixture({ recognitions });
  const frame = await loadRenderer(page, { fixture, scene: 4 });

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(14000);
  });

  const state14 = await frame.evaluate(() => {
    const scenes = Array.from(document.querySelectorAll('#stage .scene'));
    const sceneCount = scenes.length;
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const match = eyebrow.match(/Expression (\d{2}) \/ 09/);
    const exprId = match ? parseInt(match[1], 10) : 0;
    const runtime = (window as any).colorPolishRuntime;
    const catalogItem = runtime.catalog.find((c: any) => c.id === exprId);

    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb-slot'));
    const chipsMatch = slots.map((slot) => {
      const chipTexts = Array.from(slot.querySelectorAll('.chip')).map((c) => c.textContent?.trim() || '');
      return chipTexts.some((t) => t.includes(catalogItem?.name || ''));
    });

    return { sceneCount, exprId, eyebrow, chipsMatch, slotCount: slots.length };
  });

  expect(state14.sceneCount).toBe(1);
  expect(state14.exprId).toBeGreaterThan(0);
  expect(state14.slotCount).toBe(3);
  expect(state14.chipsMatch.every(Boolean)).toBe(true);

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(7000);
  });

  const state21 = await frame.evaluate(() => {
    const scenes = Array.from(document.querySelectorAll('#stage .scene'));
    const sceneCount = scenes.length;
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const match = eyebrow.match(/Expression (\d{2}) \/ 09/);
    const exprId = match ? parseInt(match[1], 10) : 0;
    const runtime = (window as any).colorPolishRuntime;
    const catalogItem = runtime.catalog.find((c: any) => c.id === exprId);

    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb-slot'));
    const chipsMatch = slots.map((slot) => {
      const chipTexts = Array.from(slot.querySelectorAll('.chip')).map((c) => c.textContent?.trim() || '');
      return chipTexts.some((t) => t.includes(catalogItem?.name || ''));
    });

    const logs = runtime.getState().log;
    const burstLogs = logs.filter((l: any) => l.type === 'featured_bubble_burst');

    return { sceneCount, exprId, eyebrow, chipsMatch, slotCount: slots.length, burstLogs };
  });

  expect(state21.sceneCount).toBe(1);
  expect(state21.exprId).toBeGreaterThan(0);
  expect(state21.exprId).not.toBe(state14.exprId);
  expect(state21.slotCount).toBe(3);
  expect(state21.chipsMatch.every(Boolean)).toBe(true);

  expect(state21.burstLogs.length).toBeGreaterThanOrEqual(1);
  const burst = state21.burstLogs[0];
  expect(burst.at).toBeGreaterThanOrEqual(14);
  expect(burst.at).toBeLessThanOrEqual(21);
  expect(burst.ids.length).toBe(3);
});

test('panel transform-style is preserve-3d, bounding box >= 1.5x bubble diameter, and orbs have no 3D rotation', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 4, ms: 14000 });

  const info = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"]');
    const panel = scene?.querySelector<HTMLElement>('.feature-panel');
    const panelStyle = panel ? window.getComputedStyle(panel) : null;
    const panelRect = panel ? panel.getBoundingClientRect() : null;

    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb-slot'));
    const bubbleDiameters = slots.map((s) => {
      const rect = s.getBoundingClientRect();
      return Math.max(rect.width, rect.height);
    });
    const maxBubbleDiameter = Math.max(...bubbleDiameters, 1);

    const orbs = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb'));
    const rot3dErrors: string[] = [];

    function has3dRotation(el: HTMLElement): boolean {
      let cur: HTMLElement | null = el;
      while (cur && !cur.classList.contains('scene')) {
        const style = window.getComputedStyle(cur);
        const transform = style.transform;
        if (transform && transform !== 'none') {
          const m = transform.match(/^matrix3d\((.+)\)$/);
          if (m) {
            const v = m[1].split(',').map((x) => parseFloat(x.trim()));
            if (Math.abs(v[2]) > 0.001 || Math.abs(v[6]) > 0.001 || Math.abs(v[8]) > 0.001 || Math.abs(v[9]) > 0.001) {
              return true;
            }
          }
        }
        cur = cur.parentElement;
      }
      return false;
    }

    for (const orb of orbs) {
      if (has3dRotation(orb)) {
        rot3dErrors.push(orb.className);
      }
    }

    return {
      transformStyle: panelStyle?.transformStyle,
      panelWidth: panelRect?.width ?? 0,
      panelHeight: panelRect?.height ?? 0,
      maxBubbleDiameter,
      rot3dErrors,
    };
  });

  expect(info.transformStyle).toBe('preserve-3d');
  expect(info.panelWidth).toBeGreaterThanOrEqual(1.5 * info.maxBubbleDiameter);
  expect(info.panelHeight).toBeGreaterThanOrEqual(1.5 * info.maxBubbleDiameter);
  expect(info.rot3dErrors).toHaveLength(0);
});

test('bubbles stay circular at flip midpoint and steady state under perspective', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 4 });

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(14000));
  const circle14 = await circularity(frame);
  expect(circle14.count).toBeGreaterThan(0);
  expect(circle14.failures).toHaveLength(0);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1450));
  const circleMid = await circularity(frame);
  expect(circleMid.count).toBeGreaterThan(0);
  expect(circleMid.failures).toHaveLength(0);
});

test('forced scene change at 15.2 s leaves next scene eyebrow untouched and logs no error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  const frame = await loadRenderer(page, { scene: 4 });

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(15200);
  });

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.setScene(5);
  });

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(2000);
  });

  const nextSceneInfo = await frame.evaluate(() => {
    const scene5 = document.querySelector<HTMLElement>('#stage .scene[data-scene="5"]');
    const eyebrow = scene5?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const runtime = (window as any).colorPolishRuntime;
    const logs = runtime.getState().log;
    const errorLogs = logs.filter((l: any) => l.type.includes('error'));
    return { eyebrow, errorLogs };
  });

  expect(errors).toHaveLength(0);
  expect(nextSceneInfo.errorLogs).toHaveLength(0);
  expect(nextSceneInfo.eyebrow).not.toContain('Featured Recognition');
});

test('with fixture where only one record carries incoming expression, three bubbles appear and featured_sparse_expression is logged', async ({ page }) => {
  const customFixture = buildActiveDisplayFixture({
    recognitions: [
      {
        id: 'rec-1',
        recipient: 'Person One',
        message: 'A nice message of greeting.',
        expressionIds: [1],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
      {
        id: 'rec-2',
        recipient: 'Person Two',
        message: 'Another greeting message.',
        expressionIds: [1],
        createdAt: '2026-09-10T17:01:00Z',
        firstPublishedAt: '2026-09-10T17:01:00Z',
        expiresAt: '2026-09-17T17:01:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
      {
        id: 'rec-3',
        recipient: 'Person Three',
        message: 'Third greeting message.',
        expressionIds: [1],
        createdAt: '2026-09-10T17:02:00Z',
        firstPublishedAt: '2026-09-10T17:02:00Z',
        expiresAt: '2026-09-17T17:02:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
      {
        id: 'rec-solo',
        recipient: 'Solo Person',
        message: 'Only recognition with expression 2.',
        expressionIds: [2],
        createdAt: '2026-09-10T17:03:00Z',
        firstPublishedAt: '2026-09-10T17:03:00Z',
        expiresAt: '2026-09-17T17:03:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
    ],
  });

  const frame = await loadRenderer(page, { fixture: customFixture, scene: 4 });

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));

  const result = await frame.evaluate(() => {
    const scenes = Array.from(document.querySelectorAll('#stage .scene'));
    const sceneCount = scenes.length;
    const slots = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="4"] .orb-slot'));
    const runtime = (window as any).colorPolishRuntime;
    const logs = runtime.getState().log;
    const sparseLogs = logs.filter((l: any) => l.type === 'featured_sparse_expression');
    return {
      sceneCount,
      slotCount: slots.length,
      sparseLogs,
    };
  });

  expect(result.sceneCount).toBe(1);
  expect(result.slotCount).toBe(3);
  expect(result.sparseLogs.length).toBeGreaterThanOrEqual(1);
});

test('phrase is the panel largest text and is rendered above the expression name', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 4, ms: 2000 });
  const textInfo = await frame.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-panel');
    const phrase = panel?.querySelector<HTMLElement>('.serif.phrase');
    const h2 = panel?.querySelector<HTMLElement>('h2');
    const principle = panel?.querySelector<HTMLElement>('.principle');

    const phraseSize = phrase ? parseFloat(window.getComputedStyle(phrase).fontSize) : 0;
    const h2Size = h2 ? parseFloat(window.getComputedStyle(h2).fontSize) : 0;
    const principleSize = principle ? parseFloat(window.getComputedStyle(principle).fontSize) : 0;

    const phraseRect = phrase?.getBoundingClientRect();
    const h2Rect = h2?.getBoundingClientRect();
    const isAbove = phraseRect && h2Rect ? phraseRect.top < h2Rect.top : false;

    return { phraseSize, h2Size, principleSize, isAbove };
  });

  expect(textInfo.phraseSize).toBeGreaterThan(textInfo.h2Size);
  expect(textInfo.phraseSize).toBeGreaterThan(textInfo.principleSize);
  expect(textInfo.isAbove).toBe(true);
});

test('panel has soft glow and particle layer inside bounds', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 4, ms: 2000 });
  const effects = await frame.evaluate(() => {
    const stage = document.querySelector<HTMLElement>('#stage .scene[data-scene="4"] .feature-stage');
    const glow = stage?.querySelector<HTMLElement>('.feature-glow');
    const panel = stage?.querySelector<HTMLElement>('.feature-panel');
    const particles = panel?.querySelector<HTMLElement>('.feature-particles');
    return {
      hasGlow: Boolean(glow),
      hasParticles: Boolean(particles),
    };
  });
  expect(effects.hasGlow).toBe(true);
  expect(effects.hasParticles).toBe(true);
});
