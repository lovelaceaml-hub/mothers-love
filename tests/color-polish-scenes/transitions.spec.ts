import { expect, test } from '@playwright/test';
import { buildActiveDisplayFixture, loadRenderer } from './helpers';

test.describe('Section B: Theatrical transitions', () => {
  test('1. full playlist loop logs transition style for every scene change with all four styles and no consecutive repeat', async ({
    page,
  }) => {
    const frame = await loadRenderer(page);
    const sceneSequence = [2, 4, 5, 8, 6, 7, 9, 10, 11, 1];

    for (const sceneId of sceneSequence) {
      await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), sceneId);
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));
    }

    const logs: Array<{ type: string; style?: string; from?: number; to?: number; scene?: number }> =
      await frame.evaluate(() => (window as any).colorPolishRuntime.getState().log);

    const startLogs = logs.filter((l) => l.type === 'scene_transition_start');
    const endLogs = logs.filter((l) => l.type === 'scene_transition_end');

    expect(startLogs.length).toBe(sceneSequence.length);
    expect(endLogs.length).toBe(sceneSequence.length);

    const expectedStyles = ['flood', 'tide', 'vortex', 'storm'];
    const startStyles = startLogs.map((l) => l.style);
    const endStyles = endLogs.map((l) => l.style);

    for (const s of startStyles) {
      expect(expectedStyles).toContain(s);
    }
    for (const s of endStyles) {
      expect(expectedStyles).toContain(s);
    }

    for (const exp of expectedStyles) {
      expect(startStyles).toContain(exp);
      expect(endStyles).toContain(exp);
    }

    for (let i = 1; i < startStyles.length; i++) {
      expect(startStyles[i]).not.toBe(startStyles[i - 1]);
    }
    for (let i = 1; i < endStyles.length; i++) {
      expect(endStyles[i]).not.toBe(endStyles[i - 1]);
    }
  });

  test('2. each transition duration is measured between 2.3 and 2.8 seconds', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    let steppedMs = 0;
    let running = true;
    while (running && steppedMs < 5000) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(50));
      steppedMs += 50;
      running = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().transition !== null);
    }

    const durationSec = steppedMs / 1000;
    expect(durationSec).toBeGreaterThanOrEqual(2.3);
    expect(durationSec).toBeLessThanOrEqual(2.8);

    const logs = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().log);
    const startLog = logs.find((l: any) => l.type === 'scene_transition_start');
    const endLog = logs.find((l: any) => l.type === 'scene_transition_end');
    expect(startLog).toBeDefined();
    expect(endLog).toBeDefined();
    const logDuration = endLog.at - startLog.at;
    expect(logDuration).toBeGreaterThanOrEqual(2.3);
    expect(logDuration).toBeLessThanOrEqual(2.8);
  });

  test('3. countdown ring is hidden for the whole duration of every transition', async ({ page }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    for (let i = 0; i < 6; i++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(300));
      const hidden = await frame.evaluate(() => {
        const el = document.getElementById('scene-countdown');
        if (!el) return true;
        const style = window.getComputedStyle(el);
        return el.hidden || style.display === 'none';
      });
      expect(hidden).toBe(true);
    }

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    const finishedHidden = await frame.evaluate(() => {
      const el = document.getElementById('scene-countdown');
      return el ? el.hidden : false;
    });
    expect(finishedHidden).toBe(false);
  });

  test('4. transition layer has zero children between transitions and under reduced motion', async ({ page }) => {
    const frame = await loadRenderer(page);

    const countBefore = await frame.evaluate(() => {
      return document.getElementById('transition-layer')?.children.length ?? 0;
    });
    expect(countBefore).toBe(0);

    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));

    const countAfter = await frame.evaluate(() => {
      return document.getElementById('transition-layer')?.children.length ?? 0;
    });
    expect(countAfter).toBe(0);

    await frame.evaluate(() => {
      (window as any).colorPolishRuntime.setPlaying(false);
    });
    const isStill = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still);
    expect(isStill).toBe(true);

    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(4));
    for (const stepMs of [0, 50, 500, 1500]) {
      if (stepMs > 0) {
        await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), stepMs);
      }
      const countStill = await frame.evaluate(() => {
        return document.getElementById('transition-layer')?.children.length ?? 0;
      });
      expect(countStill).toBe(0);
    }
  });

  test('5. click during a transition does not start a second transition and preserves transition identity', async ({
    page,
  }) => {
    const frame = await loadRenderer(page);
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(400));

    const before = await frame.evaluate(() => {
      const s = (window as any).colorPolishRuntime.getState();
      return {
        transition: s.transition,
        scene: s.scene,
      };
    });
    expect(before.transition).not.toBeNull();

    await frame.locator('body').click();
    await frame.evaluate(() => {
      if (typeof (window as any).manualAdvance === 'function') {
        (window as any).manualAdvance();
      }
    });

    const after = await frame.evaluate(() => {
      const s = (window as any).colorPolishRuntime.getState();
      return {
        transition: s.transition,
        scene: s.scene,
      };
    });

    expect(after.transition).not.toBeNull();
    expect(after.transition?.style).toBe(before.transition?.style);
    expect(after.scene).toBe(before.scene);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(2300));
    const finalState = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(finalState.transition).toBeNull();
    expect(finalState.scene).toBe(2);
  });

  test('6. arrival queued during transition starts only after transition completes', async ({ page }) => {
    const snapshot = buildActiveDisplayFixture() as any;
    const dummyQr =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const reactionCounts: Record<string, number> = snapshot.recognitions?.[0]?.id
      ? { [snapshot.recognitions[0].id]: 0 }
      : {};

    const frame = await loadRenderer(page, { fixture: snapshot });
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(300));

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
    snapshot.arrivals = [
      {
        eventId: 'event-' + newRecord.id,
        recognitionId: newRecord.id,
        publishedAt: snapshot.serverTime,
      },
    ];

    await page.evaluate(
      ({ snapshot, qr, reactionCounts }) => {
        (window as any).probePort.postMessage({
          version: 'color-polish-v6',
          type: 'color-polish:update',
          nonce: (window as any).probeNonce,
          sequence: 2,
          snapshot,
          control: {
            nowMs: Date.parse(snapshot.serverTime),
            status: 'ready',
            source: 'sample',
            playing: true,
            scene: 2,
            reactionCounts,
            qrDataUrl: qr,
            submissionUrl: snapshot.submissionUrl,
          },
        });
      },
      { snapshot, qr: dummyQr, reactionCounts },
    );

    await frame.waitForFunction(
      () => (window as any).colorPolishRuntime.getState().queueLength > 0,
    );

    const midState = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(midState.transition).not.toBeNull();
    expect(midState.active).toBeNull();
    expect(midState.queueLength).toBeGreaterThan(0);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
    const revealState = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(revealState.transition).not.toBeNull();
    expect(revealState.active).toBeNull();
    expect(revealState.queueLength).toBeGreaterThan(0);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(800));
    const completedState = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(completedState.transition).toBeNull();

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50));
    const arrivalState = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
    expect(arrivalState.active).not.toBeNull();
  });

  test('7. the cover is 70 real recognition bubbles that tile the entire screen, header and feed included', async ({
    page,
  }) => {
    test.setTimeout(120000);
    // Anthony, 2026-09-12: "it should vortex with REAL recognition bubbles and
    // covering the screen completely." This replaces the earlier assertion,
    // which required 40 decorative elements carrying NO text, per the plan's
    // decision 5. His instruction overrides his own earlier decision, and both
    // halves of the old assertion are inverted: the bubbles carry real
    // recipients and real words, and there are 48 of them because that is the
    // count at which they provably tile the stage.
    const frame = await loadRenderer(page, { scene: 1 });
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(880));

    const m = await frame.evaluate(() => {
      const layer = document.getElementById('transition-layer');
      // The WHOLE TV, not the stage. Anthony, 2026-09-12: "it needs to cover
      // the ENTIRE screen. even the title and the live feed."
      const tv = document.getElementById('tv');
      if (!layer || !tv) return null;
      const bubbles = Array.from(layer.querySelectorAll<HTMLElement>('.transition-bubble'));
      const sr = tv.getBoundingClientRect();
      const rects = bubbles.map((b) => b.getBoundingClientRect());

      // Coverage is sampled rather than argued: every point on a 25 by 13 grid
      // over the stage must fall inside some bubble's circle.
      let covered = 0;
      let total = 0;
      for (let gx = 0; gx <= 32; gx++) {
        for (let gy = 0; gy <= 18; gy++) {
          const px = sr.left + (sr.width * gx) / 32;
          const py = sr.top + (sr.height * gy) / 18;
          total += 1;
          for (const r of rects) {
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const rr = Math.min(r.width, r.height) / 2;
            if ((px - cx) ** 2 + (py - cy) ** 2 <= rr * rr) {
              covered += 1;
              break;
            }
          }
        }
      }

      const first = bubbles[0];
      const firstRect = first ? first.getBoundingClientRect() : null;
      return {
        count: bubbles.length,
        coveragePct: Math.round((covered / total) * 100),
        // Real content: a recipient name and a message on every bubble.
        withName: bubbles.filter((b) => (b.querySelector('.recipient')?.textContent ?? '').trim().length > 0).length,
        withMessage: bubbles.filter((b) => (b.querySelector('.message')?.textContent ?? '').trim().length > 0).length,
        borderRadius: first ? getComputedStyle(first).borderRadius : null,
        square: firstRect ? Math.abs(firstRect.width - firstRect.height) < 1 : false,
        // The layer must sit above the header, the footer and feed rail, and the
        // countdown, or the title and the live feed stay visible through it.
        layerZ: Number(getComputedStyle(layer).zIndex),
        headerZ: Number(getComputedStyle(document.querySelector('.tv-header') as HTMLElement).zIndex) || 0,
        footerZ: Number(getComputedStyle(document.querySelector('.footer') as HTMLElement).zIndex) || 0,
        countdownHidden: (document.getElementById('scene-countdown') as HTMLElement | null)?.hidden === true,
      };
    });

    expect(m).not.toBeNull();
    expect(m!.count, '70 bubbles, a denser crowd that still tiles the screen').toBe(70);
    expect(m!.coveragePct, 'every sampled point on the whole screen is covered').toBe(100);
    expect(m!.layerZ, 'the vortex is above the header').toBeGreaterThan(m!.headerZ);
    expect(m!.layerZ, 'the vortex is above the footer and feed rail').toBeGreaterThan(m!.footerZ);
    expect(m!.countdownHidden, 'the countdown ring is hidden during a transition').toBe(true);
    expect(m!.withName, 'every bubble carries a real recipient').toBe(70);
    expect(m!.withMessage, 'every bubble carries real words').toBe(70);
    // Still circular, like every other bubble on this display.
    expect(m!.borderRadius).toBe('50%');
    expect(m!.square).toBe(true);
  });

  test('8b. building and animating the vortex stays affordable at 3840', async ({ page }) => {
    test.setTimeout(120000);
    // The risk the coordinator named when Anthony asked for real recognitions:
    // 48 real recognition cards created at the start of every transition is 48
    // layout passes, which would be a visible hitch on the TV. Measured rather
    // than assumed, so a future change that makes it expensive fails here.
    await page.setViewportSize({ width: 3840, height: 2160 });
    const frame = await loadRenderer(page, { scene: 1 });
    const timings = await frame.evaluate(() => {
      const rt = (window as any).colorPolishRuntime;
      const samples: number[] = [];
      const t0 = performance.now();
      rt.setScene(2);
      rt.step(20);
      const buildMs = performance.now() - t0;
      for (let i = 0; i < 40; i++) {
        const s0 = performance.now();
        rt.step(20);
        samples.push(performance.now() - s0);
      }
      samples.sort((a, b) => a - b);
      return {
        buildMs,
        p90: samples[Math.floor(samples.length * 0.9)],
      };
    });
    expect(timings.buildMs, 'building 70 real recognition bubbles').toBeLessThan(160);
    expect(timings.p90, 'per-frame cost during the vortex at 3840').toBeLessThan(40);
  });

test('8. onLeave fires exactly once per scene departure at all three sites and throwing onLeave logs scene_onleave_error', async ({
    page,
  }) => {
    const frame = await loadRenderer(page);

    const site1 = await frame.evaluate(() => {
      let calls = 0;
      try {
        (window as any).sceneDescriptor(1).onLeave = () => {
          calls++;
          throw new Error('test onleave error site 1');
        };
        (window as any).renderNow(2);
        const logs = (window as any).colorPolishRuntime.getState().log;
        const errLog = logs.find((l: any) => l.type === 'scene_onleave_error' && l.scene === 1);
        const scene = (window as any).colorPolishRuntime.getState().scene;
        return { calls, hasErrLog: !!errLog, scene };
      } finally {
        (window as any).sceneDescriptor(1).onLeave = null;
      }
    });
    expect(site1.calls).toBe(1);
    expect(site1.hasErrLog).toBe(true);
    expect(site1.scene).toBe(2);

    const site2 = await frame.evaluate(() => {
      let calls = 0;
      try {
        (window as any).colorPolishRuntime.setPlaying(false);
        (window as any).sceneDescriptor(2).onLeave = () => {
          calls++;
          throw new Error('test onleave error site 2');
        };
        (window as any).colorPolishRuntime.setScene(4);
        const logs = (window as any).colorPolishRuntime.getState().log;
        const errLog = logs.filter((l: any) => l.type === 'scene_onleave_error' && l.scene === 2);
        const scene = (window as any).colorPolishRuntime.getState().scene;
        return { calls, errCount: errLog.length, scene };
      } finally {
        (window as any).sceneDescriptor(2).onLeave = null;
        (window as any).colorPolishRuntime.setPlaying(true);
      }
    });
    expect(site2.calls).toBe(1);
    expect(site2.errCount).toBe(1);
    expect(site2.scene).toBe(4);

    const site3 = await frame.evaluate(() => {
      let calls = 0;
      (window as any).colorPolishRuntime.setPlaying(true);
      (window as any).sceneDescriptor(4).onLeave = () => {
        calls++;
        throw new Error('test onleave error site 3');
      };
      (window as any).colorPolishRuntime.setScene(5);
      return { callsBefore: calls };
    });
    expect(site3.callsBefore).toBe(0);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    const site3After = await frame.evaluate(() => {
      const logs = (window as any).colorPolishRuntime.getState().log;
      const errLog = logs.filter((l: any) => l.type === 'scene_onleave_error' && l.scene === 4);
      const scene = (window as any).colorPolishRuntime.getState().scene;
      const transition = (window as any).colorPolishRuntime.getState().transition;
      return {
        errCount: errLog.length,
        scene,
        phase: transition?.phase,
      };
    });
    expect(site3After.errCount).toBe(1);
    expect(site3After.scene).toBe(5);
    expect(site3After.phase).toBe('reveal');

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1600));
    const site3Final = await frame.evaluate(() => {
      try {
        return (window as any).colorPolishRuntime.getState();
      } finally {
        (window as any).sceneDescriptor(4).onLeave = null;
      }
    });
    expect(site3Final.transition).toBeNull();
    expect(site3Final.scene).toBe(5);
  });

  test('9. four consecutive transitions draw all four styles with no console error at 1920 and at 3840', async ({
    page,
  }) => {
    for (const width of [1920, 3840]) {
      await page.setViewportSize({ width, height: width === 3840 ? 2160 : 1080 });
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      const frame = await loadRenderer(page);

      const observedStyles: string[] = [];
      const scenes = [2, 4, 5, 8];
      for (const nextScene of scenes) {
        await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), nextScene);
        const style = await frame.evaluate(
          () => (window as any).colorPolishRuntime.getState().transition?.style,
        );
        if (style) observedStyles.push(style);

        await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));

        const currentScene = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
        expect(currentScene).toBe(nextScene);
      }

      const logs: Array<{ type: string; style?: string }> = await frame.evaluate(
        () => (window as any).colorPolishRuntime.getState().log,
      );
      const startLogs = logs.filter((l) => l.type === 'scene_transition_start');
      const logStyles = startLogs.map((l) => l.style);

      const expectedStyles = new Set(['flood', 'tide', 'vortex', 'storm']);
      expect(new Set(observedStyles)).toEqual(expectedStyles);
      expect(new Set(logStyles)).toEqual(expectedStyles);
      expect(consoleErrors).toHaveLength(0);
    }
  });

  test('10. separate bag refills at different clock times produce different style permutations', async ({
    page,
  }) => {
    const frame = await loadRenderer(page);

    // Drive 4 transitions to exhaust refill 1 (drawn at S.t = 0).
    const batch1 = [2, 4, 5, 8];
    for (const sceneId of batch1) {
      await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), sceneId);
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));
    }

    // Drive 4 more transitions to trigger refill 2 (drawn at S.t >= 10.4) and exhaust it.
    const batch2 = [6, 7, 9, 10];
    for (const sceneId of batch2) {
      await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), sceneId);
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));
    }

    const logs: Array<{ type: string; style?: string }> = await frame.evaluate(
      () => (window as any).colorPolishRuntime.getState().log,
    );
    const startLogs = logs.filter((l) => l.type === 'scene_transition_start');
    expect(startLogs.length).toBe(8);

    const allStyles = startLogs.map((l) => l.style as string);
    const refill1 = allStyles.slice(0, 4);
    const refill2 = allStyles.slice(4, 8);

    const expectedStyles = new Set(['flood', 'tide', 'vortex', 'storm']);
    expect(new Set(refill1)).toEqual(expectedStyles);
    expect(new Set(refill2)).toEqual(expectedStyles);

    // Assert that two separate bag refills at different S.t values do not produce the same style order.
    expect(refill1).not.toEqual(refill2);

    // The no-immediate-repeat guarantee holds across refills and throughout the sequence.
    for (let i = 1; i < allStyles.length; i++) {
      expect(allStyles[i]).not.toBe(allStyles[i - 1]);
    }
  });

  test('the wash fully occludes the stage at the swap, for every style', async ({ page }) => {
    test.setTimeout(120000);
    // Anthony rejected the first implementation on the TV because the cover
    // phase left the background fully visible: 24 decorative bubbles spaced
    // 275 px apart cannot cover an 1812 by 636 stage. Coverage is now a single
    // full-bleed .transition-wash element that sweeps in, and this is the
    // assertion that keeps it that way.
    const frame = await loadRenderer(page, { scene: 1 });
    const seen: Record<string, { covers: boolean; opacity: number; bg: string; bubbles: number }> = {};

    for (let n = 0; n < 8; n++) {
      await frame.evaluate(() => {
        const rt = (window as any).colorPolishRuntime;
        rt.setScene((rt.getState().scene % 11) + 1);
      });
      // Step to the end of the cover phase, which is where the swap sits.
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(880));

      const m = await frame.evaluate(() => {
        const st = (window as any).colorPolishRuntime.getState();
        const layer = document.getElementById('transition-layer');
        const stage = document.getElementById('stage');
        const wash = layer?.querySelector('.transition-wash') as HTMLElement | null;
        if (!wash || !stage || !st.transition) return null;
        const w = wash.getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        const cs = getComputedStyle(wash);
        return {
          style: String(st.transition.style),
          covers:
            w.left <= sr.left + 0.5 &&
            w.top <= sr.top + 0.5 &&
            w.right >= sr.right - 0.5 &&
            w.bottom >= sr.bottom - 0.5,
          opacity: parseFloat(cs.opacity),
          bg: cs.backgroundColor,
          bubbles: layer!.querySelectorAll(
            '.transition-bubble, .transition-heart, .transition-petal',
          ).length,
        };
      });
      if (m) seen[m.style] = { covers: m.covers, opacity: m.opacity, bg: m.bg, bubbles: m.bubbles };
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));
    }

    const styles = Object.keys(seen);
    expect(styles.length).toBeGreaterThanOrEqual(3);
    for (const key of styles) {
      const m = seen[key];
      expect(m.covers, `style ${key} wash covers the whole stage at the swap`).toBe(true);
      expect(m.opacity, `style ${key} wash is fully opaque at the swap`).toBeGreaterThanOrEqual(0.99);
      expect(m.bg, `style ${key} wash colour has no alpha`).not.toContain('rgba');
      expect(m.bubbles, `style ${key} carries the full crowd of recognition bubbles`).toBe(70);
    }
  });

  test('9b. the crowd enters from one direction and leaves through another', async ({ page }) => {
    test.setTimeout(120000);
    // Anthony, 2026-09-12: "they should come in like the vortex. it should be
    // coming from one direction and then leaving in another direction. just
    // like that vortex but bigger with more recognitions." So this is a
    // through-flow, not a spiral that backs out the way it came, and this test
    // is what keeps it one.
    const frame = await loadRenderer(page, { scene: 1 });
    await frame.evaluate(() => (window as any).colorPolishRuntime.setScene(2));

    const track = await frame.evaluate(() => {
      const rt = (window as any).colorPolishRuntime;
      const measure = () => {
        const layer = document.getElementById('transition-layer');
        const tv = document.getElementById('tv');
        if (!layer || !tv) return null;
        const bs = Array.from(layer.querySelectorAll<HTMLElement>('.transition-bubble'));
        if (!bs.length) return null;
        const tr = tv.getBoundingClientRect();
        const k = 1920 / tr.width;
        const rects = bs.map((b) => b.getBoundingClientRect());
        let sx = 0;
        let sy = 0;
        rects.forEach((r) => {
          sx += (r.left + r.width / 2 - tr.left) * k;
          sy += (r.top + r.height / 2 - tr.top) * k;
        });
        let covered = 0;
        let total = 0;
        for (let gx = 0; gx <= 32; gx++) {
          for (let gy = 0; gy <= 18; gy++) {
            const px = tr.left + (tr.width * gx) / 32;
            const py = tr.top + (tr.height * gy) / 18;
            total += 1;
            for (const r of rects) {
              const cx = r.left + r.width / 2;
              const cy = r.top + r.height / 2;
              const rr = Math.min(r.width, r.height) / 2;
              if ((px - cx) ** 2 + (py - cy) ** 2 <= rr * rr) {
                covered += 1;
                break;
              }
            }
          }
        }
        const st = rt.getState();
        return {
          cx: Math.round(sx / bs.length),
          cy: Math.round(sy / bs.length),
          pct: Math.round((covered / total) * 100),
          phase: st.transition ? String(st.transition.phase) : null,
        };
      };
      const trail: { cx: number; cy: number; pct: number; phase: string | null }[] = [];
      for (let i = 0; i < 130; i += 1) {
        rt.step(25);
        const m = measure();
        if (m) trail.push(m);
      }
      return trail;
    });

    // Only the FIRST transition. Stepping past its end starts the next one,
    // whose crowd is back at the centre, and reading the last frame overall
    // was how an earlier version of this test concluded the crowd never left.
    const firstRevealIdx = track.findIndex((t) => t.phase === 'reveal');
    expect(firstRevealIdx, 'a reveal phase happens').toBeGreaterThan(0);
    let endIdx = firstRevealIdx;
    while (endIdx + 1 < track.length && track[endIdx + 1].phase === 'reveal') endIdx += 1;

    const entry = track[0];
    const exit = track[endIdx];
    const peak = track.slice(0, endIdx + 1).reduce((a, b) => (b.pct > a.pct ? b : a));

    // Covers everything at the handover.
    expect(peak.pct, 'the crowd covers the whole screen at the swap').toBe(100);
    // Arrives from off screen and departs off screen.
    expect(Math.hypot(entry.cx - 960, entry.cy - 540), 'enters from off screen').toBeGreaterThan(700);
    expect(Math.hypot(exit.cx - 960, exit.cy - 540), 'leaves to off screen').toBeGreaterThan(700);
    // And those are two different directions, not a bounce.
    expect(
      Math.hypot(entry.cx - exit.cx, entry.cy - exit.cy),
      'entry and exit are different directions',
    ).toBeGreaterThan(900);
    // It really does clear: coverage returns to nothing by the end of reveal.
    expect(exit.pct, 'the screen is uncovered again when the crowd has gone').toBeLessThanOrEqual(5);
  });
});
