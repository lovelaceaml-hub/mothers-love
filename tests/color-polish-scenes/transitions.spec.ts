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

  test('7. decorative element count during cover phase is exactly 24 and contains zero text nodes', async ({
    page,
  }) => {
    const frame = await loadRenderer(page);

    for (const targetScene of [2, 4, 5, 8]) {
      await frame.evaluate((id) => (window as any).colorPolishRuntime.setScene(id), targetScene);
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(450));

      const result = await frame.evaluate(() => {
        const layer = document.getElementById('transition-layer');
        if (!layer) return { count: 0, textNodes: [] };

        const children = Array.from(layer.children);
        const textNodes: string[] = [];

        function checkTextNodes(node: Node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const val = node.nodeValue?.trim() || '';
            if (val.length > 0) {
              textNodes.push(val);
            }
          }
          for (const child of Array.from(node.childNodes)) {
            checkTextNodes(child);
          }
        }

        for (const child of children) {
          checkTextNodes(child);
        }

        return {
          count: children.length,
          textNodes,
        };
      });

      expect(result.count).toBe(24);
      expect(result.textNodes).toHaveLength(0);

      await frame.evaluate(() => (window as any).colorPolishRuntime.step(2200));
    }
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

  test('9. all four styles render with no console error at 1920 and at 3840', async ({ page }) => {
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

      const styles = ['flood', 'tide', 'vortex', 'storm'];
      for (let i = 0; i < styles.length; i++) {
        const styleId = styles[i];
        const nextScene = [2, 4, 5, 8][i];

        await frame.evaluate(
          ({ styleId, nextScene }) => {
            (window as any).TRANSITION_BAG = [styleId];
            (window as any).colorPolishRuntime.setScene(nextScene);
          },
          { styleId, nextScene },
        );

        await frame.evaluate(() => (window as any).colorPolishRuntime.step(2600));

        const currentScene = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
        expect(currentScene).toBe(nextScene);
      }

      expect(consoleErrors).toHaveLength(0);
    }
  });
});
