import { expect, test } from '@playwright/test';

import { buildActiveDisplayFixture, loadRenderer } from './helpers';

// Mirrors the live renderer's smoothstep ease exactly (core/state.js: t*t*(3-2t)),
// so the test can compute the expected frame independently of the app code.
function ease(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

// Whole class tokens only (a CSS class selector like .storm already matches the "storm" token,
// not a substring, so it will not false-fire on an unrelated class like "brainstorm" from
// another lane's work), plus a bare data-transition-style attribute of any value.
const RETIRED_STYLE_SELECTOR = '.flood, .tide, .vortex, .storm, [data-transition-style]';

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

// Scoped to the only two places a retired transition style could ever have left a trace: the
// (always-empty-today) #transition-layer subtree, and the #stage > .scene roots' own class list
// and data attributes (not their descendants, which may legitimately carry unrelated classes).
async function retiredStyleArtifactCount(frame: Awaited<ReturnType<typeof loadRenderer>>) {
  return frame.evaluate((selector) => {
    const layer = document.getElementById('transition-layer');
    const layerMatches = layer ? layer.querySelectorAll(selector).length : 0;
    const sceneRootMatches = Array.from(document.querySelectorAll('#stage > .scene')).filter((el) =>
      el.matches(selector),
    ).length;
    return layerMatches + sceneRootMatches;
  }, RETIRED_STYLE_SELECTOR);
}

test.describe('Section B: scene transitions', () => {
  test('all ten playlist scene changes complete with one scene, the live fade, and no flood, tide, vortex or storm artifact', async ({ page }) => {
    const frame = await loadRenderer(page);
    const scenes = [2, 4, 5, 8, 6, 7, 9, 10, 11, 1];

    for (const sceneId of scenes) {
      await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), sceneId);
      const atStart = await frame.evaluate(() => {
        const layer = document.getElementById('transition-layer');
        return {
          sceneCount: document.querySelectorAll('#stage > .scene').length,
          transition: (window as any).colorPolishRuntime.getState().transition,
          layerChildren: layer?.children.length ?? 0,
        };
      });
      expect(atStart.transition).not.toBeNull();
      expect(atStart.transition.duration).toBeCloseTo(1.15, 2);
      expect(atStart.sceneCount).toBe(2);
      expect(atStart.layerChildren).toBe(0);
      expect(await retiredStyleArtifactCount(frame)).toBe(0);

      // Sample mid-flight too: none of the four retired styles, and no
      // extra scene-layer artifacts, may appear at any point in the fade.
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(400));
      const midFlight = await frame.evaluate(() => ({
        sceneCount: document.querySelectorAll('#stage > .scene').length,
        transition: (window as any).colorPolishRuntime.getState().transition,
        layerChildren: document.getElementById('transition-layer')?.children.length ?? 0,
      }));
      expect(midFlight.transition).not.toBeNull();
      expect(midFlight.sceneCount).toBe(2);
      expect(midFlight.layerChildren).toBe(0);
      expect(await retiredStyleArtifactCount(frame)).toBe(0);

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
      expect(await retiredStyleArtifactCount(frame)).toBe(0);
    }
  });

  test('uses the live gentle crossfade with slight translation and uniform scale, matching the formula at several points', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    const start = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      const oldRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="1"]');
      const nextRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="2"]');
      return {
        duration: state.transition?.duration,
        oldOpacity: oldRoot ? getComputedStyle(oldRoot).opacity : null,
        nextOpacity: nextRoot?.style.opacity,
      };
    });
    expect(start.duration).toBeCloseTo(1.15, 2);
    expect(start.oldOpacity).toBe('1');
    expect(start.nextOpacity).toBe('0');

    const transform = (value: string) => {
      const match = value.match(/^translateX\((-?[\d.]+)px\) scale\(([\d.]+)\)$/);
      return match ? { x: Number(match[1]), scale: Number(match[2]) } : null;
    };

    // Sample the fade at several points through its 1.15 s duration and check
    // old/new opacity and transform against the production formula exactly:
    // old: opacity 1-p, translateX(-15p) scale(1-.004p)
    // next: opacity p, translateX(20(1-p)) scale(.997+.003p)
    // where p = ease(age / duration).
    const sampleMsPoints = [200, 375, 375]; // cumulative steps: 200, 575, 950 ms of age
    let elapsedMs = 0;
    for (const stepMs of sampleMsPoints) {
      await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), stepMs);
      elapsedMs += stepMs;
      const sample = await frame.evaluate(() => {
        const oldRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="1"]');
        const nextRoot = document.querySelector<HTMLElement>('#stage > .scene[data-scene="2"]');
        return {
          oldOpacity: Number(oldRoot?.style.opacity),
          nextOpacity: Number(nextRoot?.style.opacity),
          oldTransform: oldRoot?.style.transform ?? '',
          nextTransform: nextRoot?.style.transform ?? '',
        };
      });
      const p = ease(elapsedMs / 1150);
      const oldTransform = transform(sample.oldTransform);
      const nextTransform = transform(sample.nextTransform);
      expect(oldTransform, `old transform at ${elapsedMs}ms`).not.toBeNull();
      expect(nextTransform, `next transform at ${elapsedMs}ms`).not.toBeNull();
      expect(sample.oldOpacity).toBeCloseTo(1 - p, 2);
      expect(sample.nextOpacity).toBeCloseTo(p, 2);
      expect(oldTransform!.x).toBeCloseTo(-15 * p, 1);
      expect(oldTransform!.scale).toBeCloseTo(1 - 0.004 * p, 3);
      expect(nextTransform!.x).toBeCloseTo(20 * (1 - p), 1);
      expect(nextTransform!.scale).toBeCloseTo(0.997 + 0.003 * p, 3);
      expect(Math.abs(oldTransform!.x)).toBeLessThanOrEqual(15);
      expect(Math.abs(nextTransform!.x)).toBeLessThanOrEqual(20);
      expect(oldTransform!.scale).toBeGreaterThan(0.99);
      expect(oldTransform!.scale).toBeLessThanOrEqual(1);
      expect(nextTransform!.scale).toBeGreaterThan(0.99);
      expect(nextTransform!.scale).toBeLessThanOrEqual(1);
    }

    const elapsed = elapsedMs + (await finishTransition(frame));
    expect(elapsed).toBeGreaterThanOrEqual(1100);
    expect(elapsed).toBeLessThanOrEqual(1200);
  });

  test('a click during a transition does not double-advance, and a requested scene queues instead', async ({ page }) => {
    // loadRenderer's own bootstrap uses control.source: 'sample'. manualAdvance
    // (core/stage.js) returns immediately whenever S.source !== 'live', before it ever reaches
    // the active/transition guard this test exists to check — so a click sent against the
    // default sample source would pass even if that guard were deleted. Go live for real first.
    const snapshot = buildActiveDisplayFixture() as any;
    const frame = await loadRenderer(page, { fixture: snapshot });
    await page.evaluate((liveSnapshot) => {
      (window as any).probePort.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce: (window as any).probeNonce,
        sequence: 2,
        snapshot: liveSnapshot,
        control: {
          nowMs: Date.parse(liveSnapshot.serverTime),
          status: 'ready',
          source: 'live',
          playing: true,
          reactionCounts: {},
          qrDataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          submissionUrl: liveSnapshot.submissionUrl,
        },
      });
    }, snapshot);
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().mode === 'normal');
    const sourceCheck = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(sourceCheck.scene).toBe(1);

    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(250));

    // Mid-fade: a click must not double-advance the playlist.
    await frame.evaluate(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const duringTransition = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return {
        scene: state.scene,
        transition: state.transition,
        starts: state.log.filter((entry: any) => entry.type === 'scene_transition_start').length,
        manualAdvances: state.log.filter((entry: any) => entry.type === 'manual_advance').length,
      };
    });
    expect(duringTransition.transition).not.toBeNull();
    expect(duringTransition.scene).toBe(2);
    expect(duringTransition.starts).toBe(1);
    expect(duringTransition.manualAdvances).toBe(0);

    // A genuinely requested scene still queues behind the in-flight fade instead of interrupting it.
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(4));
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

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(950));
    const next = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(next.scene).toBe(4);
    expect(next.transition).not.toBeNull();

    await finishTransition(frame);

    // Counter-check: once the fade is done and the real 700 ms manual-advance debounce
    // (core/stage.js manualAdvance, keyed off performance.now(), not the simulated clock) has
    // actually elapsed, a click does advance to the next playlist scene.
    const settled = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(settled.transition).toBeNull();
    expect(settled.scene).toBe(4);

    await page.waitForTimeout(750);
    await frame.evaluate(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const afterClick = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return {
        scene: state.scene,
        transition: state.transition,
        manualAdvances: state.log.filter((entry: any) => entry.type === 'manual_advance').length,
      };
    });
    expect(afterClick.manualAdvances).toBe(1);
    expect(afterClick.scene).toBe(5);
    expect(afterClick.transition).not.toBeNull();
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
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(16));

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
