import { expect, test } from '@playwright/test';

import { buildActiveDisplayFixture, loadRenderer } from './helpers';

async function finishTransition(frame: Awaited<ReturnType<typeof loadRenderer>>) {
  let elapsed = 0;
  while (elapsed < 3000) {
    const running = await frame.evaluate(
      () => (window as any).colorPolishRuntime.getState().transition !== null,
    );
    if (!running) return elapsed;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50));
    elapsed += 50;
  }
  throw new Error('transition did not finish within 3 seconds');
}

test.describe('Section B: scene transitions', () => {
  test('all ten playlist scene changes complete with one scene and no transition artifacts', async ({ page }) => {
    const frame = await loadRenderer(page);
    const scenes = [2, 4, 5, 8, 6, 7, 9, 10, 11, 1];

    for (const sceneId of scenes) {
      await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), sceneId);
      const during = await frame.evaluate(() => {
        const layer = document.getElementById('transition-layer');
        return {
          sceneCount: document.querySelectorAll('#stage > .scene').length,
          transition: (window as any).colorPolishRuntime.getState().transition,
          transitionArtifacts: layer?.querySelectorAll('canvas, .transition-bubble, [class*="nave"], [class*="vault"]').length ?? 0,
        };
      });

      expect(during.transition).not.toBeNull();
      expect(during.sceneCount).toBe(2);
      expect(during.transitionArtifacts).toBe(0);

      await finishTransition(frame);
      const after = await frame.evaluate(() => ({
        sceneCount: document.querySelectorAll('#stage > .scene').length,
        scene: (window as any).colorPolishRuntime.getState().scene,
        transition: (window as any).colorPolishRuntime.getState().transition,
        layerChildren: document.getElementById('transition-layer')?.children.length ?? 0,
      }));
      expect(after.scene).toBe(sceneId);
      expect(after.sceneCount).toBe(1);
      expect(after.transition).toBeNull();
      expect(after.layerChildren).toBe(0);
    }
  });

  test('uses the live gentle crossfade with slight translation and uniform scale', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    const start = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      const oldRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="1"]');
      const nextRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="2"]');
      return {
        duration: state.transition?.duration,
        oldOpacity: oldRoot?.style.opacity,
        nextOpacity: nextRoot?.style.opacity,
      };
    });
    expect(start.duration).toBeCloseTo(1.15, 2);
    expect(start.oldOpacity).toBe('');
    expect(start.nextOpacity).toBe('0');

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(575));
    const middle = await frame.evaluate(() => {
      const oldRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="1"]');
      const nextRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="2"]');
      return {
        oldOpacity: Number(oldRoot?.style.opacity),
        nextOpacity: Number(nextRoot?.style.opacity),
        oldTransform: oldRoot?.style.transform ?? '',
        nextTransform: nextRoot?.style.transform ?? '',
      };
    });
    const transform = (value: string) => {
      const match = value.match(/^translateX\((-?[\d.]+)px\) scale\(([\d.]+)\)$/);
      return match ? { x: Number(match[1]), scale: Number(match[2]) } : null;
    };
    const oldTransform = transform(middle.oldTransform);
    const nextTransform = transform(middle.nextTransform);
    expect(middle.oldOpacity).toBeGreaterThan(0);
    expect(middle.oldOpacity).toBeLessThan(1);
    expect(middle.nextOpacity).toBeGreaterThan(0);
    expect(middle.nextOpacity).toBeLessThan(1);
    expect(oldTransform).not.toBeNull();
    expect(nextTransform).not.toBeNull();
    expect(Math.abs(oldTransform!.x)).toBeLessThanOrEqual(15);
    expect(Math.abs(nextTransform!.x)).toBeLessThanOrEqual(20);
    expect(oldTransform!.scale).toBeGreaterThan(0.99);
    expect(oldTransform!.scale).toBeLessThanOrEqual(1);
    expect(nextTransform!.scale).toBeGreaterThan(0.99);
    expect(nextTransform!.scale).toBeLessThanOrEqual(1);

    const elapsed = 575 + (await finishTransition(frame));
    expect(elapsed).toBeGreaterThanOrEqual(1100);
    expect(elapsed).toBeLessThanOrEqual(1200);
  });

  test('ignores clicks and queues a requested scene while a transition is active', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(250));

    await frame.locator('body').click();
    await frame.evaluate(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      (window as any).colorPolishRuntime.setScene(4);
    });
    const queued = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return {
        scene: state.scene,
        transition: state.transition,
        starts: state.log.filter((entry: any) => entry.type === 'scene_transition_start').length,
      };
    });
    expect(queued.scene).toBe(2);
    expect(queued.transition).not.toBeNull();
    expect(queued.starts).toBe(1);

    await finishTransition(frame);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50));
    const next = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(next.scene).toBe(4);
    expect(next.transition).not.toBeNull();
  });

  test('holds queued arrivals until the scene transition has cleaned up', async ({ page }) => {
    const snapshot = buildActiveDisplayFixture() as any;
    const frame = await loadRenderer(page, { fixture: snapshot });
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(100));

    const newRecord = {
      ...snapshot.recognitions[0],
      id: 'arrival-during-transition-1',
      recipient: 'Arrival Recipient',
      message: 'Thank you for helping today.',
      createdAt: snapshot.serverTime,
      firstPublishedAt: snapshot.serverTime,
      expiresAt: new Date(Date.parse(snapshot.serverTime) + 86_400_000).toISOString(),
      expressionIds: [2],
    };
    snapshot.recognitions.push(newRecord);
    snapshot.revision++;
    snapshot.sync = 'delta';
    snapshot.arrivals = [{
      eventId: 'event-' + newRecord.id,
      recognitionId: newRecord.id,
      publishedAt: snapshot.serverTime,
    }];

    await page.evaluate((nextSnapshot) => {
      (window as any).probePort.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce: (window as any).probeNonce,
        sequence: 2,
        snapshot: nextSnapshot,
        control: {
          nowMs: Date.parse(nextSnapshot.serverTime),
          status: 'ready',
          source: 'sample',
          playing: true,
          scene: 2,
          reactionCounts: {},
          qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          submissionUrl: nextSnapshot.submissionUrl,
        },
      });
    }, snapshot);

    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().queueLength > 0);
    const during = await frame.evaluate(() => ({
      transition: (window as any).colorPolishRuntime.getState().transition,
      active: (window as any).colorPolishRuntime.getState().active,
      layerChildren: document.getElementById('transition-layer')?.children.length ?? 0,
    }));
    expect(during.transition).not.toBeNull();
    expect(during.active).toBeNull();
    expect(during.layerChildren).toBe(0);

    await finishTransition(frame);
    const afterTransition = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(afterTransition.active).toBeNull();
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50));
    const arrival = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(arrival.active).not.toBeNull();
  });

  test('calls the departing scene onLeave once and records a thrown hook', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => {
      const descriptor = (window as any).sceneDescriptor(1);
      (window as any).__transitionOnLeaveCalls = 0;
      descriptor.onLeave = () => {
        (window as any).__transitionOnLeaveCalls += 1;
        throw new Error('synthetic transition onLeave failure');
      };
      (window as any).colorPolishRuntime.setScene(2);
    });

    const beforeSwap = await frame.evaluate(() => (window as any).__transitionOnLeaveCalls);
    expect(beforeSwap).toBe(0);
    await finishTransition(frame);

    const result = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      const calls = (window as any).__transitionOnLeaveCalls;
      const errors = state.log.filter(
        (entry: any) => entry.type === 'scene_onleave_error' && entry.scene === 1,
      );
      (window as any).sceneDescriptor(1).onLeave = null;
      delete (window as any).__transitionOnLeaveCalls;
      return { calls, errors: errors.length, scene: state.scene };
    });
    expect(result.calls).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.scene).toBe(2);
  });

  test('switches scenes immediately and leaves no transition layer in still mode', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setPlaying(false));
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    const state = await frame.evaluate(() => ({
      runtime: (window as any).colorPolishRuntime.getState(),
      sceneCount: document.querySelectorAll('#stage > .scene').length,
      layerChildren: document.getElementById('transition-layer')?.children.length ?? 0,
    }));
    expect(state.runtime.still).toBe(true);
    expect(state.runtime.transition).toBeNull();
    expect(state.runtime.scene).toBe(2);
    expect(state.sceneCount).toBe(1);
    expect(state.layerChildren).toBe(0);
  });

  test('hides the countdown during transition and shows it after completion', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    const during = await frame.evaluate(() => {
      const countdown = document.getElementById('scene-countdown');
      return countdown ? { hidden: countdown.hidden, display: getComputedStyle(countdown).display } : null;
    });
    expect(during).not.toBeNull();
    expect(during!.hidden || during!.display === 'none').toBe(true);

    await finishTransition(frame);
    const after = await frame.evaluate(() => {
      const countdown = document.getElementById('scene-countdown');
      return countdown ? { hidden: countdown.hidden, display: getComputedStyle(countdown).display } : null;
    });
    expect(after).not.toBeNull();
    expect(after!.hidden).toBe(false);
    expect(after!.display).not.toBe('none');
  });
});
