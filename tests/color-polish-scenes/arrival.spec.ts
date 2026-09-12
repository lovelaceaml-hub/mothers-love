import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer } from './helpers';
import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

test.use({ viewport: { width: 1920, height: 1080 } });

type ArrivalRecord = {
  id: string;
  recipient: string;
  message: string;
  createdAt: string;
  firstPublishedAt: string;
  expiresAt: string;
  expressionIds: number[];
  [key: string]: unknown;
};

type ArrivalEvent = {
  eventId: string;
  recognitionId: string;
  publishedAt: string;
  [key: string]: unknown;
};

type ArrivalSnapshot = Omit<ReturnType<typeof buildActiveDisplayFixture>, 'recognitions' | 'arrivals'> & {
  recognitions: ArrivalRecord[];
  arrivals: ArrivalEvent[];
  sync?: string;
};

async function pushArrivalWave(
  page: Page,
  frame: Frame,
  snapshot: ArrivalSnapshot,
  wave: number,
  sequence: number,
  options?: { idPrefix?: string; expressionIds?: number[]; message?: string },
) {
  const count = wave < 6 ? 1 : 10;
  const prefix = options?.idPrefix || `arrival-w${wave}-s${sequence}`;
  const records: ArrivalRecord[] = Array.from({ length: count }, (_, index) => ({
    ...snapshot.recognitions[0],
    id: `${prefix}-${index}`,
    recipient: `Sample ${wave + 1}.${index + 1}`,
    message: options?.message || 'Thank you for helping today.',
    createdAt: snapshot.serverTime,
    firstPublishedAt: snapshot.serverTime,
    expiresAt: new Date(Date.parse(snapshot.serverTime) + 86_400_000).toISOString(),
    expressionIds: options?.expressionIds || [2],
  }));
  snapshot.recognitions.push(...records);
  snapshot.revision++;
  snapshot.sync = 'delta';
  snapshot.arrivals = records.map((record: ArrivalRecord) => ({
    eventId: 'event-' + record.id,
    recognitionId: record.id,
    publishedAt: snapshot.serverTime,
  }));

  const dummyQr =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const reactionCounts: Record<string, number> = { [snapshot.recognitions[0].id]: 0 };

  await page.evaluate(
    ({ snapshot, qr, reactionCounts, sequence }) => {
      (window as any).probePort.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce: (window as any).probeNonce,
        sequence,
        snapshot,
        control: {
          nowMs: Date.parse(snapshot.serverTime),
          status: 'ready',
          source: 'sample',
          playing: true,
          scene: 'welcome',
          reactionCounts,
          qrDataUrl: qr,
          submissionUrl: snapshot.submissionUrl,
        },
      });
    },
    { snapshot, qr: dummyQr, reactionCounts, sequence },
  );

  await frame.waitForFunction(
    (targetCount) => (window as any).colorPolishRuntime.getState().queueLength >= targetCount,
    count,
  );
}

test('single and group entrance styles cycle in the recorded order, and four frame styles are declared', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const expectedSequence = [
    { kind: 'single', style: 1 },
    { kind: 'single', style: 5 },
    { kind: 'single', style: 2 },
    { kind: 'single', style: 3 },
    { kind: 'single', style: 4 },
    { kind: 'single', style: 0 },
    { kind: 'group', style: 2 },
    { kind: 'group', style: 4 },
    { kind: 'group', style: 3 },
    { kind: 'group', style: 1 },
    { kind: 'group', style: 0 },
  ];

  const recordedSequence: Array<{ kind: string; style: number }> = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));

    const activeState = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return state.active ? { kind: state.active.kind, style: state.active.style } : null;
    });

    expect(activeState).not.toBeNull();
    recordedSequence.push(activeState!);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }

  expect(recordedSequence).toEqual(expectedSequence);

  // Assert four frame styles recorded in log over the first four single arrivals
  const logFrames = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs
      .filter((l: any) => l.type === 'entrance_start')
      .slice(0, 4)
      .map((l: any) => l.frame);
  });
  const expectedFrames = ['Light beam', 'Petal curtain', 'Aurora', 'Constellation gather'];
  expect(new Set(logFrames)).toEqual(new Set(expectedFrames));
  expect(logFrames).toHaveLength(4);
});

test('the four reworked entrances start deep and resolve flat', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const s2z = await frame.evaluate(() => (window as any).singleTrajectory(2, 0.15).z);
  const s5z = await frame.evaluate(() => (window as any).singleTrajectory(5, 0.15).z);
  expect(s2z).toBeLessThan(-450);
  expect(s5z).toBeLessThan(-450);

  const g0zRank0 = await frame.evaluate(
    () => (window as any).groupTrajectory(0, 0, 0.15, { x: 906, y: 307 }).z,
  );
  const g0zRank9 = await frame.evaluate(
    () => (window as any).groupTrajectory(0, 9, 9 * 0.032 + 0.15, { x: 906, y: 307 }).z,
  );
  expect(g0zRank0 - g0zRank9).toBeGreaterThanOrEqual(400);

  const [g4z0, g4z1, g4z2] = await frame.evaluate(() => {
    const b = { x: 906, y: 307 };
    return [
      (window as any).groupTrajectory(4, 0, 0.2, b).z,
      (window as any).groupTrajectory(4, 1, 0.2, b).z,
      (window as any).groupTrajectory(4, 2, 0.2, b).z,
    ];
  });
  expect(Math.abs(g4z0 - g4z1)).toBeGreaterThanOrEqual(100);
  expect(Math.abs(g4z0 - g4z2)).toBeGreaterThanOrEqual(100);

  const [normZ0, normZ1, normZ2] = await frame.evaluate(() => {
    const b = { x: 906, y: 307 };
    const duration = 0.71;
    const orders = [2, 7, 1, 3, 6, 8, 0, 4, 5, 9];
    const pForU = (idx: number, uVal: number) => orders.indexOf(idx) * 0.032 + uVal * duration;
    return [
      (window as any).groupTrajectory(4, 0, pForU(0, 0.2), b).z,
      (window as any).groupTrajectory(4, 1, pForU(1, 0.2), b).z,
      (window as any).groupTrajectory(4, 2, pForU(2, 0.2), b).z,
    ];
  });
  expect(Math.abs(normZ0 - normZ1)).toBeGreaterThanOrEqual(100);
  expect(Math.abs(normZ0 - normZ2)).toBeGreaterThanOrEqual(100);
  expect(Math.abs(normZ1 - normZ2)).toBeGreaterThanOrEqual(100);

  const settled = await frame.evaluate(() => {
    const b = { x: 906, y: 307 };
    return {
      s2: (window as any).singleTrajectory(2, 1),
      s5: (window as any).singleTrajectory(5, 1),
      g0: (window as any).groupTrajectory(0, 3, 1, b),
      g4: (window as any).groupTrajectory(4, 5, 1, b),
    };
  });
  expect(Math.abs(settled.s2.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.s2.k - 1)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(settled.s5.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.s5.k - 1)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(settled.g0.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.g0.k - 1)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(settled.g4.z)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(settled.g4.k - 1)).toBeLessThanOrEqual(0.01);

  let seq = 1;
  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));

    const entranceDuration = wave < 6 ? 3600 : 4700;
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), entranceDuration + 100);

    const resolvedInfo = await frame.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
      return elements.map((el) => {
        const zi = parseInt(el.style.zIndex || window.getComputedStyle(el).zIndex || '600', 10);
        const z = zi - 600;
        const opacity = parseFloat(el.style.opacity || '1');
        const transform = el.style.transform || '';
        const match = transform.match(/scale\(([^)]+)\)/);
        const scale = match ? parseFloat(match[1]) : 1;
        return { z, scale, opacity };
      });
    });

    expect(resolvedInfo.length).toBeGreaterThan(0);
    for (const orb of resolvedInfo) {
      expect(Math.abs(orb.z)).toBeLessThanOrEqual(2);
      expect(Math.abs(orb.scale - 1)).toBeLessThanOrEqual(0.02);
      expect(orb.opacity).toBe(1);
    }

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
  }
});

test('circularity holds on .event-orb at entrance midpoint, hold midpoint, and exit midpoint', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);

  // 1. Entrance midpoint (~1800 ms)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1800));
  const entranceCirc = await circularity(frame);
  expect(entranceCirc.failures).toHaveLength(0);
  expect(entranceCirc.count).toBeGreaterThan(0);

  // 2. Hold midpoint (~1800 ms + 4000 ms = hold phase)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(4000));
  const holdCirc = await circularity(frame);
  expect(holdCirc.failures).toHaveLength(0);
  expect(holdCirc.count).toBeGreaterThan(0);

  // 3. Exit midpoint (~675 ms into exit)
  await frame.evaluate(() => {
    const active = (window as any).active;
    const remainingHold = Math.max(0, (active?.hold || 8) - (active?.localTime || 0));
    (window as any).colorPolishRuntime.step(remainingHold * 1000 + 10);
    (window as any).colorPolishRuntime.step(675);
  });
  const exitCirc = await circularity(frame);
  expect(exitCirc.failures).toHaveLength(0);
  expect(exitCirc.count).toBeGreaterThan(0);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
});

test('arrival ring carries 3D rotation while orb and ancestors carry none', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));

  const transformAudit = await frame.evaluate(() => {
    const rings = Array.from(document.querySelectorAll<HTMLElement>('.arrival-ring'));
    const orbs = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
    return {
      rings: rings.map((r) => ({
        inline: r.style.transform || '',
        computed: window.getComputedStyle(r).transform,
        preserve3d: window.getComputedStyle(r).transformStyle,
      })),
      orbs: orbs.map((o) => {
        const inline = o.style.transform || '';
        const computed = window.getComputedStyle(o).transform;
        const ancestors: Array<{ tag: string; id: string; className: string; transform: string; computed: string }> = [];
        let p = o.parentElement;
        while (p && p.id !== 'tv') {
          ancestors.push({
            tag: p.tagName,
            id: p.id,
            className: p.className,
            transform: p.style.transform || '',
            computed: window.getComputedStyle(p).transform,
          });
          p = p.parentElement;
        }
        return { inline, computed, ancestors };
      }),
    };
  });

  expect(transformAudit.rings.length).toBeGreaterThan(0);
  for (const r of transformAudit.rings) {
    const hasRotate = r.inline.includes('rotate') || r.computed.startsWith('matrix3d');
    expect(hasRotate).toBe(true);
    expect(r.preserve3d).toBe('preserve-3d');
  }

  expect(transformAudit.orbs.length).toBeGreaterThan(0);
  for (const o of transformAudit.orbs) {
    expect(o.inline).not.toContain('rotate');
    expect(o.computed.startsWith('matrix3d')).toBe(false);
    for (const a of o.ancestors) {
      expect(a.transform).not.toContain('rotate');
      expect(a.computed.startsWith('matrix3d')).toBe(false);
    }
  }

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active === null);
});

test('reduced motion displays bubble within one frame without assembly or burst', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);

  // Confirm queue and mode state in reduced motion
  const initial = await frame.evaluate(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return { queueLength: st.queueLength, mode: st.mode, still: st.still };
  });
  expect(initial.queueLength).toBeGreaterThanOrEqual(1);
  expect(initial.mode).toBe('normal');
  expect(initial.still).toBe(true);

  // Advance past 650 ms queue gap so the queued arrival begins
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(700));
  await frame.waitForFunction(() => (window as any).colorPolishRuntime.getState().active !== null);

  const stillCheck = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    const orbs = Array.from(document.querySelectorAll<HTMLElement>('.event-orb'));
    const bursts = document.querySelectorAll('.arrival-burst-item');
    const eventStage = document.getElementById('event');
    const hasBackdrop = !!eventStage && window.getComputedStyle(eventStage, '::before').content !== 'none';
    return {
      still: state.still,
      active: state.active !== null,
      orbCount: orbs.length,
      firstOrbOpacity: orbs[0] ? parseFloat(orbs[0].style.opacity || '1') : 0,
      burstCount: bursts.length,
      hasBackdrop,
    };
  });

  expect(stillCheck.still).toBe(true);
  expect(stillCheck.active).toBe(true);
  expect(stillCheck.orbCount).toBe(1);
  expect(stillCheck.firstOrbOpacity).toBe(1);
  expect(stillCheck.burstCount).toBe(0);
  expect(stillCheck.hasBackdrop).toBe(true);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });
});

test('G3 computed-style stage dim and near-black backdrop assertions hold at hold midpoint', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  // Step past gap and entrance to hold midpoint (entrance 3.6 s + 4 s hold)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(5600));

  // Allow real wall-clock time past 900 ms for CSS transition on #stage to settle
  await page.waitForTimeout(1000);

  const styles = await frame.evaluate(() => {
    const stage = document.getElementById('stage');
    const eventStage = document.getElementById('event');
    if (!stage || !eventStage) return null;
    const stageStyle = window.getComputedStyle(stage);
    const backdropStyle = window.getComputedStyle(eventStage, '::before');
    return {
      stageDimmed: stage.classList.contains('dimmed'),
      stageOpacity: parseFloat(stageStyle.opacity),
      stageFilter: stageStyle.filter,
      backdropBg: backdropStyle.backgroundColor,
    };
  });

  expect(styles).not.toBeNull();
  expect(styles!.stageDimmed).toBe(true);
  expect(styles!.stageOpacity).toBeLessThanOrEqual(0.23);
  expect(styles!.stageFilter).toContain('blur(');

  const alphaMatch = styles!.backdropBg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : (styles!.backdropBg.startsWith('rgb(') ? 1 : 0);
  expect(alpha).toBeGreaterThanOrEqual(0.88);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });
});

test('four frame styles are logged with no immediate repeat and vary independently from path styles', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await frame.evaluate(() => (window as any).arrivalResetFrameBag?.());

  let seq = 1;
  for (let wave = 0; wave < 4; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }

  const logEntries = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'entrance_start');
  });

  expect(logEntries.length).toBeGreaterThanOrEqual(4);
  const frames = logEntries.slice(0, 4).map((l: any) => l.frame);
  const styles = logEntries.slice(0, 4).map((l: any) => l.style);

  // Four different frame names logged over four consecutive single arrivals
  const uniqueFrames = new Set(frames);
  expect(uniqueFrames.size).toBe(4);

  // No immediate repeat
  for (let i = 0; i < frames.length - 1; i++) {
    expect(frames[i]).not.toBe(frames[i + 1]);
  }

  // Frame and path vary independently: logged pair differs in at least one component every time
  for (let i = 0; i < frames.length - 1; i++) {
    const samePair = frames[i] === frames[i + 1] && styles[i] === styles[i + 1];
    expect(samePair).toBe(false);
  }
});

test('feed rail and returnScene behavior are unchanged after arrival chain', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const beforeState = await frame.evaluate(() => {
    const feed = document.getElementById('feed-columns');
    const items = Array.from(feed?.querySelectorAll<HTMLElement>('.chat-item') || []);
    const feedIds = items.map((el) => el.dataset.feedId || '').filter(Boolean);
    return {
      scene: (window as any).colorPolishRuntime.getState().scene,
      chatItemCount: items.length,
      feedIds,
    };
  });

  // Run single arrival
  await pushArrivalWave(page, frame, snapshot, 0, 2);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });

  const afterState = await frame.evaluate(() => {
    const feed = document.getElementById('feed-columns');
    const items = Array.from(feed?.querySelectorAll<HTMLElement>('.chat-item') || []);
    const feedIds = items.map((el) => el.dataset.feedId || '').filter(Boolean);
    return {
      scene: (window as any).colorPolishRuntime.getState().scene,
      chatItemCount: items.length,
      feedIds,
    };
  });

  expect(afterState.scene).toBe(beforeState.scene);
  expect(afterState.chatItemCount).toBe(beforeState.chatItemCount);
  expect(afterState.feedIds).toEqual(beforeState.feedIds);
});

test('screenshots for frame styles at assembly midpoint and path styles at entrance midpoint', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const outputFolder = resolve(process.cwd(), 'docs/runs/2026-09-12-tv-next-level/logs/arrival');
  await mkdir(outputFolder, { recursive: true });

  const screenshotPaths: string[] = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);

    // Step 650 ms queue gap first, then advance to mid-entrance
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    const midpointMs = wave < 6 ? 1800 : 2350;
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), midpointMs);

    const activeInfo = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      return state.active ? { kind: state.active.kind, style: state.active.style } : null;
    });

    expect(activeInfo).not.toBeNull();
    const filename = `${activeInfo!.kind}-${activeInfo!.style}.png`;
    const outputPath = resolve(outputFolder, filename);

    await frame.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });

    await page.screenshot({ path: outputPath });
    screenshotPaths.push(outputPath);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }

  expect(screenshotPaths).toHaveLength(11);
  for (const p of screenshotPaths) {
    const fileStat = await stat(p);
    expect(fileStat.size).toBeGreaterThan(0);
  }

  // Also capture screenshots of the 4 frame styles at assembly midpoint
  await frame.evaluate(() => (window as any).arrivalResetFrameBag?.());
  for (let f = 0; f < 4; f++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, f, seq, { idPrefix: `frame-shot-${f}` });
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1800));

    const frameFile = `frame-${f}.png`;
    const framePath = resolve(outputFolder, frameFile);

    await frame.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });

    await page.screenshot({ path: framePath });
    const frameStat = await stat(framePath);
    expect(frameStat.size).toBeGreaterThan(0);

    await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
    await frame.waitForFunction(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
  }
});

test('arrival records log exactly one arrival_record_shown per record for single arrival and oversize group wave', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  // 1. Single arrival: exactly one arrival_record_shown entry exists for that record's id
  let seq = 2;
  const singlePrefix = 'arrival-single-log';
  await pushArrivalWave(page, frame, snapshot, 0, seq, { idPrefix: singlePrefix });
  const singleRecordId = `${singlePrefix}-0`;

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(25000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });

  const singleShownLogs = await frame.evaluate((id: string) => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'arrival_record_shown' && l.id === id);
  }, singleRecordId);
  expect(singleShownLogs).toHaveLength(1);

  // 2. Full oversize group wave of ten: each of the ten ids has exactly one entry, not more
  seq++;
  const groupPrefix = 'arrival-group-oversize-log';
  const longMessage =
    'This is an extended appreciation message designed to test the full oversize group reading flow across all five circular pair pages on the display. Thank you for your continued support and kindness.';
  await pushArrivalWave(page, frame, snapshot, 6, seq, {
    idPrefix: groupPrefix,
    message: longMessage,
  });

  const expectedGroupIds = Array.from({ length: 10 }, (_, i) => `${groupPrefix}-${i}`);

  // Step through all 5 buildGroupPage pages and exit to completion
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  for (let step = 0; step < 25; step++) {
    const isDone = await frame.evaluate(() => {
      const st = (window as any).colorPolishRuntime.getState();
      return st.active === null && st.queueLength === 0;
    });
    if (isDone) break;
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(8000));
  }

  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });

  // Verify all 5 pages (0 through 4) executed
  const pagesLogged = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs
      .filter((l: any) => l.type === 'reading_start' && l.kind === 'group')
      .map((l: any) => l.page);
  });
  expect(pagesLogged).toEqual(expect.arrayContaining([0, 1, 2, 3, 4]));

  // Verify each of the ten record ids has exactly one arrival_record_shown entry
  const allShownLogs = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'arrival_record_shown');
  });

  for (const id of expectedGroupIds) {
    const idLogs = allShownLogs.filter((l: any) => l.id === id);
    expect(idLogs).toHaveLength(1);
  }
});


