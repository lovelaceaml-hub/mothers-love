import { expect, test } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  cardShape,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  recognition,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('peacemakers satisfies the common scene spec with puzzle cardShape, circularity, and no overflow', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 14000 });

  const shapeResult = await cardShape(frame, '.puzzle-card', 'puzzle');
  expect(shapeResult.count).toBeGreaterThan(0);
  expect(shapeResult.failures).toHaveLength(0);

  const circleResult = await circularity(frame);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
});

test('peacemakers sample preview in studio does not advance on click', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'peacemakers', 14000);
  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});


test('joined card count increases monotonically to at least six over 40 s with short messages', async ({ page }) => {
  const shortFixture = buildActiveDisplayFixture({
    recognitions: [
      recognition({ id: 'rec-short-1', message: 'Kind note one.' }),
      recognition({ id: 'rec-short-2', message: 'Kind note two.' }),
      recognition({ id: 'rec-short-3', message: 'Kind note three.' }),
      recognition({ id: 'rec-short-4', message: 'Kind note four.' }),
      recognition({ id: 'rec-short-5', message: 'Kind note five.' }),
      recognition({ id: 'rec-short-6', message: 'Kind note six.' }),
      recognition({ id: 'rec-short-7', message: 'Kind note seven.' }),
      recognition({ id: 'rec-short-8', message: 'Kind note eight.' }),
    ],
  });

  const frame = await loadRenderer(page, { scene: 8, fixture: shortFixture });

  let previousCount = 0;
  for (const stepMs of [8000, 8000, 8000, 8000, 8000]) {
    await frame.evaluate((ms) => {
      (window as any).colorPolishRuntime.step(ms);
    }, stepMs);

    const count = await frame.locator('.joined-card').count();
    expect(count).toBeGreaterThanOrEqual(previousCount);
    previousCount = count;
  }

  expect(previousCount).toBeGreaterThanOrEqual(6);
});

test('held card hold time equals 3 s plus message.length / 40 within 0.3 s for short and 500-char records', async ({ page }) => {
  const msg500 = 'Kindness begins with a word and spreads peace through honest consideration. '.repeat(7).slice(0, 500);
  const timingFixture = buildActiveDisplayFixture({
    recognitions: [
      recognition({ id: 'rec-timing-short', message: 'Thank you neighbor.' }),
      recognition({ id: 'rec-timing-500', message: msg500 }),
    ],
  });

  const frame = await loadRenderer(page, { scene: 8, fixture: timingFixture });

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(32000);
  });

  const holdLogs = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    return runtime.getState().log.filter((entry: any) => entry.type === 'peacemakers_piece_hold');
  });

  expect(holdLogs.length).toBeGreaterThanOrEqual(1);
  for (const log of holdLogs) {
    const expected = 3 + log.msgLen / 40;
    expect(Math.abs(log.duration - expected)).toBeLessThanOrEqual(0.3);
  }
});

test('message text is visible on the held card and absent or hidden on every joined card', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 14000 });

  const heldCard = frame.locator('.puzzle-card.face-on');
  await expect(heldCard.locator('.puzzle-message')).toBeVisible();

  const joinedCards = frame.locator('.joined-card');
  const joinedCount = await joinedCards.count();
  expect(joinedCount).toBeGreaterThan(0);

  for (let i = 0; i < joinedCount; i++) {
    await expect(joinedCards.nth(i).locator('.puzzle-message')).toBeHidden();
  }

  const farFacingCheck = await frame.evaluate(() => {
    const joined = Array.from(document.querySelectorAll<HTMLElement>('.joined-card'));
    return joined.every((card) => {
      const msg = card.querySelector<HTMLElement>('.puzzle-message');
      return !msg || window.getComputedStyle(msg).display === 'none';
    });
  });
  expect(farFacingCheck).toBe(true);
});

test('noOverflow holds and no speech bubble box overlaps the title block text', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 9000 });

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const overlapResult = await frame.evaluate(() => {
    const title = document.querySelector<HTMLElement>('#stage .scene[data-scene="8"] > div[style*="left:12px"]');
    const bubbles = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="8"] .speech-bubble'));
    if (!title || !bubbles.length) return { checked: false, overlaps: [] };

    const titleRect = title.getBoundingClientRect();
    const overlaps: string[] = [];

    for (const b of bubbles) {
      const bRect = b.getBoundingClientRect();
      const overlapX = Math.min(titleRect.right, bRect.right) - Math.max(titleRect.left, bRect.left);
      const overlapY = Math.min(titleRect.bottom, bRect.bottom) - Math.max(titleRect.top, bRect.top);
      if (overlapX > 0 && overlapY > 0) {
        overlaps.push(`speech bubble at (${bRect.left}, ${bRect.top}) overlaps title (${titleRect.left}, ${titleRect.top}, ${titleRect.right}, ${titleRect.bottom})`);
      }
    }
    return { checked: true, overlaps };
  });

  expect(overlapResult.checked).toBe(true);
  expect(overlapResult.overlaps).toHaveLength(0);
});

test('globe container transform-style is preserve-3d, transform contains rotate, and no .orb exists', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 6000 });

  const globeStyles = await frame.evaluate(() => {
    const sphere = document.querySelector<HTMLElement>('.peacemakers-globe-sphere');
    if (!sphere) return null;
    const style = window.getComputedStyle(sphere);
    return {
      transformStyle: style.transformStyle,
      transform: style.transform,
      animationName: style.animationName,
    };
  });

  expect(globeStyles).not.toBeNull();
  expect(globeStyles!.transformStyle).toBe('preserve-3d');
  expect(globeStyles!.transform).toMatch(/matrix3d|rotate/);

  const orbCount = await frame.locator('#stage .scene[data-scene="8"] .orb').count();
  expect(orbCount).toBe(0);
});

test('four speech bubbles are present by 9 s with border-radius 16 px and no immediate phrase repeat over 12 draws', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 9000 });

  const bubbles = frame.locator('#stage .scene[data-scene="8"] .speech-bubble');
  expect(await bubbles.count()).toBe(4);

  const radii = await frame.evaluate(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="8"] .speech-bubble'));
    return els.map((el) => window.getComputedStyle(el).borderRadius);
  });
  for (const radius of radii) {
    expect(radius).toBe('16px');
  }

  const drawnPhrases = await frame.evaluate(() => {
    const phrases: string[] = [];
    for (let i = 0; i < 12; i++) {
      phrases.push((window as any).nextSpeechPhrase());
    }
    return phrases;
  });
  expect(drawnPhrases).toHaveLength(12);
  for (let i = 1; i < drawnPhrases.length; i++) {
    expect(drawnPhrases[i]).not.toBe(drawnPhrases[i - 1]);
  }
});

test('joined card count never exceeds 24 and oldest card is removed after 25th join', async ({ page }) => {
  test.setTimeout(120000);
  const shortFixture = buildActiveDisplayFixture({
    recognitions: Array.from({ length: 40 }, (_, i) =>
      recognition({ id: `rec-batch-${i + 1}`, message: `Short recognition message ${i + 1}.` })
    ),
  });

  const frame = await loadRenderer(page, { scene: 8, fixture: shortFixture });

  for (const stepMs of [60000, 60000, 60000]) {
    await frame.evaluate((ms) => {
      (window as any).colorPolishRuntime.step(ms);
    }, stepMs);
  }

  const joinedCount = await frame.locator('.joined-card').count();
  expect(joinedCount).toBeLessThanOrEqual(24);

  const joinLogs = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    return runtime.getState().log.filter((l: any) => l.type === 'peacemakers_piece_joined');
  });

  expect(joinLogs.length).toBeGreaterThanOrEqual(25);

  const firstJoinedId = joinLogs[0]?.id;
  const isFirstStillPresent = await frame.evaluate((id) => {
    return Boolean(document.querySelector(`.joined-card[data-record-id="${id}"]`));
  }, firstJoinedId);
  expect(isFirstStillPresent).toBe(false);
});

test('frame time sampled at 3840 stays under 40 ms per frame', async ({ page }) => {
  await page.setViewportSize({ width: 3840, height: 2160 });
  const frame = await loadRenderer(page, { scene: 8, ms: 6000 });

  const averageFrameMs = await frame.evaluate(() => {
    const start = performance.now();
    const frames = 40;
    for (let i = 0; i < frames; i++) {
      (window as any).coordinator(0.02);
    }
    return (performance.now() - start) / frames;
  });

  expect(averageFrameMs).toBeLessThan(40);
});

test('reduced motion renders the peacemakers scene still with eight globe cards and one held card', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'peacemakers');
  expect(still).toBe(true);

  const joinedCards = frame.locator('.joined-card');
  expect(await joinedCards.count()).toBe(8);

  const heldCard = frame.locator('.puzzle-card.face-on.held-card');
  expect(await heldCard.count()).toBe(1);
  await expect(heldCard.locator('.puzzle-message')).toBeVisible();

  const animationName = await frame.evaluate(() => {
    const sphere = document.querySelector<HTMLElement>('.peacemakers-globe-sphere');
    return sphere ? window.getComputedStyle(sphere).animationName : '';
  });
  expect(animationName).toBe('none');

  const globeLight = await frame.$('.globe-light');
  expect(globeLight).not.toBeNull();

  const fxCanvas = await frame.$('canvas.scene-fx');
  expect(fxCanvas).not.toBeNull();
});
