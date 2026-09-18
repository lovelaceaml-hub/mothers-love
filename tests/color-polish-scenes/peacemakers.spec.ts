import { expect, test } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer, recognition } from './helpers';

// A pool with several distinct, short recognitions (each fits a small
// bubble), so peacemakersRightBubbles() has enough records to fill all four
// bubble slots and enough spares to replace a retiring one.
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

// Scene 8, We Are Peacemakers, restored to match what the live TV shows
// today (Plan 12 production, commit b7d92a0). These specs test the restored
// scene: the title copy, the globe artwork, and the message bubbles from
// the shared orb/floater engine plus this scene's own peacemakersRightBubbles()
// (production's own picking and layout logic, not the Plan 15 core's
// drawSlots()). The Plan 15 redesign specs (a rotating puzzle globe with
// detachable cards) tested a scene Anthony rejected on September 18 and no
// longer exist here.
//
// These specs drive the renderer directly through loadRenderer's /probe
// harness rather than openStudioScene's /admin/login sign-in flow: the
// admin sign-in flow fails to reach /admin in this worktree's dev server for
// every color-polish scene spec, not only these two (confirmed against an
// unrelated, already-approved scene). That is a pre-existing environment
// issue outside this lane's allowlist, recorded in RESULT.md. loadRenderer
// exercises the same renderer code and DOM without going through sign-in.

test('peacemakers renders circular bubbles and no overflow at 14 s', async ({ page }) => {
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 8, ms: 14000 });

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await frame.evaluate(() => {
    const el = document.querySelector<HTMLElement>('#stage .scene[data-scene="8"]');
    if (!el) return { scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0 };
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);
});

test('bubbles stay circular at 0.3 s, 6 s, 14 s and 20 s', async ({ page }) => {
  test.setTimeout(60000);
  for (const ms of [300, 6000, 14000, 20000]) {
    const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 8, ms });
    const circleResult = await circularity(frame);
    expect(circleResult.count).toBeGreaterThan(0);
    expect(circleResult.failures).toHaveLength(0);
  }
});

test('reduced motion renders peacemakers still, with circular bubbles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 8 });
  const still = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still === true);
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('shows the production title copy and the globe artwork', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 8, ms: 2000 });

  const content = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="8"]');
    const eyebrow = scene?.querySelector<HTMLElement>('.eyebrow')?.textContent || '';
    const heading = scene?.querySelector<HTMLElement>('h1')?.textContent || '';
    const violet = scene?.querySelector<HTMLElement>('h1 .violet')?.textContent || '';
    const subheading = scene?.querySelector<HTMLElement>('.subheading')?.textContent || '';
    const art = scene?.querySelector<HTMLImageElement>('img.art');
    return {
      eyebrow,
      heading,
      violet,
      subheading,
      artSrc: art?.getAttribute('src') || '',
    };
  });

  expect(content.eyebrow).toContain('Mother’s Love in our community');
  expect(content.heading).toContain('We Are');
  expect(content.violet).toBe('makers');
  expect(content.subheading).toContain('Recognize the kindness');
  expect(content.artSrc).toContain('/color-polish/assets/globe.png');
});

test('with all-short records, four bubbles appear in pick order at production’s ps positions', async ({ page }) => {
  // loadRenderer's own scene switch already skips the entrance transition by
  // stepping the runtime forward, so a little floater drift has already run
  // by the time this reads state; it does not step any further itself. The
  // four ps positions are hundreds of pixels apart, so a generous tolerance
  // still tells a correct pick-order-to-ps assignment apart from the Plan 15
  // core's drawSlots(), which would reorder by slot size instead.
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 8 });
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
  const frame = await loadRenderer(page, { fixture: longMessageFixture, scene: 8, ms: 2000 });
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

test('a steady bubble retires by drifting out, then a new bubble arrives', async ({ page }) => {
  test.setTimeout(60000);
  // The first-mounted floater's retireAt is 17 s; step just past it.
  const frame = await loadRenderer(page, { fixture: manyRecordsFixture, scene: 8, ms: 18000 });

  const exitLogs = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return (state.log || []).filter((e: any) => e.type === 'bubble_exit_start' && e.scene === 8);
  });
  expect(exitLogs.length).toBeGreaterThan(0);
  expect(exitLogs[0].kind).toBe('drift');

  // Exiting takes 3.8 s before the slot installs its replacement, so step
  // comfortably past retireAt (17 s) + 3.8 s.
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(6000));

  const newLogs = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return (state.log || []).filter((e: any) => e.type === 'bubble_new' && e.scene === 8);
  });
  expect(newLogs.length).toBeGreaterThan(0);
});

test('the scene 8 keep-out box matches production’s forbidden() rule', async ({ page }) => {
  // With this fixture's ps-positioned bubbles starting at x >= 824, none of
  // them ever drift into or near scene 8's keep-out box (x 0-700, y 8-296)
  // within any reasonable test time; the box sits in the title copy's
  // corner, far from where the bubbles start and roam. So a dynamic check
  // (step time, then look for a bubble too close to the box) cannot tell a
  // working keepOut apart from a deleted one here, the box is simply never
  // exercised either way. What can be checked directly, and what actually
  // catches keepOut being deleted or changed, is the scene's own declared
  // keep-out box, which core/motion.js's forbidden() reads via
  // sceneDescriptor(id).keepOut() every physics tick.
  const frame = await loadRenderer(page, { scene: 8, ms: 2000 });
  const box = await frame.evaluate(() => (window as any).sceneDescriptor(8).keepOut());
  expect(box).toEqual([{ x: 0, y: 8, w: 700, h: 296 }]);
});

test('no recognition data is fetched from a live network endpoint', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await loadRenderer(page, { scene: 8, ms: 6000 });
  const live = requests.filter((url) => /supabase|recognitions|display\/color-polish/.test(url));
  expect(live).toHaveLength(0);
});
