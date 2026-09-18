import { expect, test } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer, recognition } from './helpers';

// A pool with several distinct, short recognitions (each fits a small
// bubble), so peaceInPracticeRightBubbles() has enough records to fill all
// four bubble slots.
const manyRecordsFixture = buildActiveDisplayFixture({
  recognitions: Array.from({ length: 6 }, (_, i) =>
    recognition({
      id: `rec-many-${i + 1}`,
      recipient: `Recipient ${i + 1}`,
      message: `Thank you for your kindness, number ${i + 1}.`,
      expressionIds: [(i % 9) + 1],
    }),
  ),
});

// A message long enough that smallFits() is false (over 160 characters),
// so production's rightBubbles() shows it alone in one large reader slot
// instead of four small bubbles.
const longMessage = ('Thank you for the many small kindnesses you show every day, '
  + 'the patient listening, the warm greetings, and the quiet encouragement '
  + 'that keeps this whole community feeling like family to everyone here.')
  .padEnd(300, '.')
  .slice(0, 300);

// A mixed pool: three short records that would each fit a small bubble on
// their own, plus one long one. This is the fixture that actually proves
// the long record is shown ALONE: with only one record in the pool (the
// earlier version of this fixture) there was nothing else it could have
// shown instead, so that version could not tell "shows it alone" apart
// from "there was nothing else available".
const longMessageFixture = buildActiveDisplayFixture({
  recognitions: [
    recognition({ id: 'rec-mix-short-1', recipient: 'Short One', message: 'Thank you for your kindness today.', expressionIds: [1] }),
    recognition({ id: 'rec-mix-short-2', recipient: 'Short Two', message: 'You always greet me warmly.', expressionIds: [2] }),
    recognition({ id: 'rec-mix-short-3', recipient: 'Short Three', message: 'Your patience means a lot.', expressionIds: [3] }),
    recognition({ id: 'rec-long', recipient: 'Long Message Friend', message: longMessage, expressionIds: [4] }),
  ],
});

// Scene 9, Peace in Practice, restored to match what the live TV shows
// today (Plan 12 production, commit b7d92a0). These specs test the restored
// scene: the title copy, the hands banner art, the rotating heart image,
// the ambient floating hearts, and the message bubbles from the shared
// orb/floater engine plus this scene's own peaceInPracticeRightBubbles()
// (production's own picking and layout logic, not the Plan 15 core's
// drawSlots()). The Plan 15 redesign specs (a 3D heart mesh and exploding
// message cards) tested a scene Anthony rejected on September 18 and no
// longer exist here.
//
// These specs drive the renderer directly through loadRenderer's /probe
// harness rather than openStudioScene's /admin/login sign-in flow: the
// admin sign-in flow fails to reach /admin in this worktree's dev server for
// every color-polish scene spec, not only these two (confirmed against an
// unrelated, already-approved scene). That is a pre-existing environment
// issue outside this lane's allowlist, recorded in RESULT.md. loadRenderer
// exercises the same renderer code and DOM without going through sign-in.

test('peace in practice renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 9, ms: 14000 });

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  // Every visible piece of this scene (title copy, the hands banner art, the
  // rotating heart, the ambient hearts, and the message bubbles) stays
  // within the scene bounds. This scene's ambient hearts are plain SVGs
  // whose markup carries a <defs><radialGradient> block for the fill
  // gradient (same as production); <defs> content never paints, but the
  // shared noOverflow() helper measures raw scrollHeight, which Chromium
  // inflates from that invisible, non-rendered geometry, a measurement
  // artifact of the harness, not a visible defect. So this checks the
  // bounding rects of the actual visible elements directly instead.
  const overflow = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="9"]');
    if (!scene) return { ok: false, offenders: ['no scene'] };
    const sceneRect = scene.getBoundingClientRect();
    const visible = Array.from(
      scene.querySelectorAll<HTMLElement>(
        '.scene-copy, img.art, #heart-host, .floating-heart, .orb-slot',
      ),
    );
    const offenders: string[] = [];
    for (const el of visible) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const inside =
        r.left >= sceneRect.left - 1 &&
        r.right <= sceneRect.right + 1 &&
        r.top >= sceneRect.top - 1 &&
        r.bottom <= sceneRect.bottom + 1;
      if (!inside) {
        offenders.push(el.className || el.id || el.tagName);
      }
    }
    return { ok: offenders.length === 0, offenders, count: visible.length };
  });
  expect(overflow.count).toBeGreaterThan(0);
  expect(overflow.offenders).toEqual([]);
});

test('bubbles stay circular at 0.3 s, 6 s, 14 s and 20 s', async ({ page }) => {
  test.setTimeout(60000);
  for (const ms of [300, 6000, 14000, 20000]) {
    const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 9, ms });
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders peace in practice still, with circular bubbles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 9 });
  const still = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still === true);
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('shows the production title copy and the hands banner artwork', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 2000 });

  const content = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="9"]');
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const heading = scene?.querySelector<HTMLElement>('h1')?.textContent || '';
    const subheading = scene?.querySelector<HTMLElement>('.subheading')?.textContent || '';
    const art = scene?.querySelector<HTMLImageElement>('img.art');
    return {
      eyebrow,
      heading,
      subheading,
      artSrc: art?.getAttribute('src') || '',
    };
  });

  expect(content.eyebrow).toBe('Peace in practice');
  expect(content.heading).toContain('love');
  expect(content.heading).toContain('peace');
  expect(content.subheading).toContain('Love expressed through words and actions.');
  expect(content.artSrc).toContain('/color-polish/assets/hands_banner.png');
});

test('the heart host holds a rotating heart image and the heart field holds fourteen ambient hearts', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 9, ms: 2000 });

  const before = await frame.evaluate(() => {
    const host = document.getElementById('heart-host');
    const img = host?.querySelector<HTMLImageElement>('img');
    const field = document.getElementById('heart-field');
    const hearts = field ? field.querySelectorAll('.floating-heart').length : 0;
    return { imgSrc: img?.getAttribute('src') || '', transform: img?.style.transform || '', hearts };
  });

  expect(before.imgSrc).toContain('/color-polish/assets/heart_render.png');
  expect(before.hearts).toBe(14);
  expect(before.transform).toContain('rotateY(');

  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(4000);
  });

  const after = await frame.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('#heart-host img');
    return img?.style.transform || '';
  });

  // The heart image keeps rotating with the clock, same as production.
  expect(after).not.toBe(before.transform);
});

test('four message bubbles are drawn from the fictional fixture', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 9, ms: 2000 });
  const slotCount = await frame.evaluate(
    () => document.querySelectorAll('#stage .scene[data-scene="9"] .orb-slot').length,
  );
  expect(slotCount).toBe(4);
});

test('with all-short records, four bubbles appear in pick order at production’s ps positions', async ({ page }) => {
  // loadRenderer's own scene switch already skips the entrance transition by
  // stepping the runtime forward, so a little floater drift has already run
  // by the time this reads state; it does not step any further itself. The
  // four ps positions are hundreds of pixels apart, so a generous tolerance
  // still tells a correct pick-order-to-ps assignment apart from the Plan 15
  // core's drawSlots(), which would reorder by slot size instead.
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 9 });
  const slots = await frame.evaluate(
    () => (window as any).colorPolishRuntime.getState().slots.map((s: any) => ({ id: s.id, x: s.x, y: s.y, d: s.d })),
  );
  expect(slots.length).toBe(4);

  const ps = [[885, 23, 312], [1301, 26, 320], [824, 323, 304], [1454, 330, 295]];
  // choose() is priority-sorted, not random: with every record's lastShown
  // and createdAt tied, it picks by ascending id, so the fixture's four
  // records are chosen in this order.
  const expectedOrder = ['rec-many-1', 'rec-many-2', 'rec-many-3', 'rec-many-4'];
  expectedOrder.forEach((id, i) => {
    const slot = slots.find((s: { id: string }) => s.id === id);
    expect(slot, `no slot found for ${id}`).toBeTruthy();
    expect(slot.d).toBeCloseTo(ps[i][2], 0);
    expect(Math.abs(slot.x - ps[i][0])).toBeLessThan(180);
    expect(Math.abs(slot.y - ps[i][1])).toBeLessThan(180);
  });
});

test('a long message is shown alone in one large reader slot about 586 px wide, even with short records available', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: longMessageFixture, scene: 9, ms: 2000 });
  const slots = await frame.evaluate(
    () => (window as any).colorPolishRuntime.getState().slots.map((s: any) => ({ id: s.id, d: s.d })),
  );
  // The pool has three short records too, so this proves the long record
  // is shown ALONE (production's rule when any chosen record fails
  // smallFits), not just that it is the only thing available.
  expect(slots.length).toBe(1);
  expect(slots[0].id).toBe('rec-long');
  expect(slots[0].d).toBeCloseTo(586, 0);

  // circularity() matches .orb-slot, .orb and .event-orb; a single bubble
  // is both an .orb-slot wrapper and a nested .orb, so count is 2 here, not 1.
  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('every steady bubble stays outside the keep-out box at 40 s, by production’s own circular distance rule', async ({ page }) => {
  test.setTimeout(60000);
  // At 20 s (the first pass's checkpoint) none of this fixture's bubbles had
  // drifted near enough to the box to distinguish a working keepOut from a
  // deleted one; 40 s gives the random-walk floater physics enough time to
  // actually reach the box's corner of the stage. The check itself now
  // matches production's steerOutside() exactly: distance from the point to
  // the nearest point on the (unrounded) box, not a rectangle grown by
  // radius on every side, which is a larger, squared-off shape that misses
  // real intrusions near the box's rounded corners.
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 9, ms: 40000 });

  const result = await frame.evaluate(() => {
    const visual = (window as any).colorPolishRuntime.visualState();
    // Matches production's forbidden() box for scene 9.
    const box = { x: 0, y: 10, w: 870, h: 276 };
    const clampTo = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
    const offenders: any[] = [];
    for (const a of visual.actors) {
      if (a.life !== 'steady') continue;
      // Matches core/motion.js's steerOutside() radius formula exactly.
      const rad = a.d * (a.depth ?? 1) * 0.49 + 14;
      const cx = clampTo(a.x, box.x, box.x + box.w);
      const cy = clampTo(a.y, box.y, box.y + box.h);
      const dist = Math.hypot(a.x - cx, a.y - cy);
      // A 2 px buffer for the steady-state distance steerOutside settles a
      // bubble at, which can sit right at dist === rad without that being a
      // real intrusion.
      if (dist < rad - 2) offenders.push({ id: a.id, x: a.x, y: a.y, dist, rad });
    }
    return { count: visual.actors.length, offenders };
  });

  expect(result.count).toBeGreaterThan(0);
  expect(result.offenders).toEqual([]);
});

test('no recognition data is fetched from a live network endpoint', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await loadRenderer(page, { scene: 9, ms: 6000 });
  const live = requests.filter((url) => /supabase|recognitions|display\/color-polish/.test(url));
  expect(live).toHaveLength(0);
});
