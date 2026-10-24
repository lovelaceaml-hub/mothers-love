import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, loadRenderer } from './helpers';

test.use({ viewport: { width: 1920, height: 1080 } });

// A new recognition used to rebuild the screen behind it at once, with no fade
// and every bubble in a new place, about half a second before its arrival
// began, so the TV jumped as each one came in. The screen now stays as it is
// while the arrival comes in, takes the new record once the arrival covers it,
// and is not rebuilt again when the arrival leaves. Synthetic records only.
type Snapshot = Omit<ReturnType<typeof buildActiveDisplayFixture>, 'recognitions' | 'arrivals'> & {
  recognitions: Record<string, unknown>[];
  arrivals: Record<string, unknown>[];
};

async function pushNewRecognition(page: Page, snapshot: Snapshot, sequence: number, id: string) {
  snapshot.recognitions.push({
    ...snapshot.recognitions[0],
    id,
    recipient: 'Synthetic Arrival',
    message: 'Thank you for helping today.',
    createdAt: snapshot.serverTime,
    firstPublishedAt: snapshot.serverTime,
    expiresAt: new Date(Date.parse(snapshot.serverTime) + 86_400_000).toISOString(),
  });
  snapshot.revision++;
  snapshot.arrivals = [{ eventId: 'event-' + id, recognitionId: id, publishedAt: snapshot.serverTime }];
  await page.evaluate(({ snapshot, sequence }) => {
    (window as any).probePort.postMessage({
      version: 'color-polish-v6',
      type: 'color-polish:update',
      nonce: (window as any).probeNonce,
      sequence,
      snapshot,
      control: { nowMs: Date.parse(snapshot.serverTime), status: 'ready', source: 'sample', playing: true },
    });
  }, { snapshot, sequence });
}

const sceneRoot = (frame: Frame) => frame.evaluate(() => {
  const root = document.querySelector('#stage > .scene') as any;
  if (!root) return null;
  root.__mark ??= Math.random().toString(36).slice(2);
  return root.__mark as string;
});

for (const scene of [1, 4]) {
  test(`scene ${scene} waits until the arrival covers it to take a new recognition`, async ({ page }) => {
    const snapshot = buildActiveDisplayFixture() as unknown as Snapshot;
    const frame = await loadRenderer(page, { scene, fixture: snapshot });
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(5000));
    const before = await sceneRoot(frame);
    expect(before).not.toBeNull();

    await pushNewRecognition(page, snapshot, 2, 'steady-arrival-1');
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().queueLength >= 1);
    expect(await sceneRoot(frame)).toBe(before);

    // The arrival starts over the same screen.
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    expect(await frame.evaluate(() => document.getElementById('event')?.classList.contains('active'))).toBe(true);
    expect(await sceneRoot(frame)).toBe(before);

    // Once the arrival covers the screen, the screen takes the new record out of sight.
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(4000));
    expect(await frame.evaluate(() => document.getElementById('event')?.classList.contains('active'))).toBe(true);
    const covered = await sceneRoot(frame);
    expect(covered).not.toBe(before);

    // When the arrival is over, the same screen comes back, with no second rebuild.
    await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      for (let i = 0; i < 40 && document.getElementById('event')?.classList.contains('active'); i++) runtime.step(1000);
    });
    expect(await frame.evaluate(() => document.getElementById('event')?.classList.contains('active'))).toBe(false);
    expect(await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene)).toBe(scene);
    expect(await sceneRoot(frame)).toBe(covered);
  });
}
