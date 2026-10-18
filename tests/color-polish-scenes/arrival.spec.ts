import { expect, test, type Frame, type Page } from '@playwright/test';
import { buildActiveDisplayFixture, circularity, loadRenderer } from './helpers';
import { MOSTLY_LONG_MESSAGE_500, graphemeCount } from './text-fits';
import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

test.use({ viewport: { width: 1920, height: 1080 } });

// A wave is five recognitions. Anthony, 2026-09-19, after watching it on the
// TV: a group wave always shows all five together, laid out at 300 TV px and
// drawn at 400, so its words are drawn a third larger (ARRIVAL_GROUP in
// scenes/arrival.js).
const GROUP_SIZE = 5;
const GROUP_LAYOUT = 300;
const GROUP_DRAWN = 400;
// The group's own centre inside the arrival frame (ARRIVAL_GROUP.cy), set a
// little below the frame's middle so the larger bubbles clear the title.
const GROUP_CENTRE_Y = 500;
// Anthony's floor: text a viewer reads is never under 18 px drawn at 1920.
const TEXT_FLOOR_PX = 18;

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
  options?: { idPrefix?: string; expressionIds?: number[]; message?: string; messages?: string[]; count?: number },
) {
  const count = options?.count ?? (wave < 6 ? 1 : GROUP_SIZE);
  const prefix = options?.idPrefix || `arrival-w${wave}-s${sequence}`;
  const records: ArrivalRecord[] = Array.from({ length: count }, (_, index) => ({
    ...snapshot.recognitions[0],
    id: `${prefix}-${index}`,
    recipient: `Sample ${wave + 1}.${index + 1}`,
    message: options?.messages?.[index] || options?.message || 'Thank you for helping today.',
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
  const lastRank = GROUP_SIZE - 1;
  const g0zLastRank = await frame.evaluate(
    (rank: number) => (window as any).groupTrajectory(0, 2, rank * 0.032 + 0.15, { x: 906, y: 307 }).z,
    lastRank,
  );
  // Each later rank starts deeper by at least as much per rank as the wave of ten did
  // (400 over its 9 ranks), so the cascade keeps its depth with five bubbles.
  expect((g0zRank0 - g0zLastRank) / lastRank).toBeGreaterThanOrEqual(400 / 9);

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
    const orders = [0, 3, 4, 2, 1];
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
      g4: (window as any).groupTrajectory(4, 4, 1, b),
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
      // Flat means no flight scale is left: only the fixed drawn size over layout size
      // factor remains (760 over 540 single, 400 over 300 group).
      const drawnOverLayout = wave < 6 ? 760 / 540 : GROUP_DRAWN / GROUP_LAYOUT;
      expect(Math.abs(orb.scale - drawnOverLayout)).toBeLessThanOrEqual(0.02);
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
    const sky = document.getElementById('arrival-sky');
    const skyStyle = sky ? window.getComputedStyle(sky) : null;
    const ray = document.querySelector<HTMLElement>('.arrival-sky-ray');
    const rayStyle = ray ? window.getComputedStyle(ray) : null;
    return {
      still: state.still,
      active: state.active !== null,
      orbCount: orbs.length,
      firstOrbOpacity: orbs[0] ? parseFloat(orbs[0].style.opacity || '1') : 0,
      burstCount: bursts.length,
      hasBackdrop: !!sky,
      backdropOpacity: skyStyle ? parseFloat(skyStyle.opacity) : 0,
      skyAnimation: skyStyle ? skyStyle.animationName : 'missing',
      rayCount: document.querySelectorAll('.arrival-sky-ray').length,
      rayAnimation: rayStyle ? rayStyle.animationName : 'missing',
    };
  });

  expect(stillCheck.still).toBe(true);
  expect(stillCheck.active).toBe(true);
  expect(stillCheck.orbCount).toBe(1);
  expect(stillCheck.firstOrbOpacity).toBe(1);
  expect(stillCheck.burstCount).toBe(0);
  // Reduced motion keeps the bright backdrop, static, with no ray animation.
  expect(stillCheck.hasBackdrop).toBe(true);
  expect(stillCheck.backdropOpacity).toBe(1);
  expect(stillCheck.rayCount).toBeGreaterThan(0);
  expect(stillCheck.skyAnimation).toBe('none');
  expect(stillCheck.rayAnimation).toBe('none');

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(50000));
  await frame.waitForFunction(() => {
    const st = (window as any).colorPolishRuntime.getState();
    return st.active === null && st.queueLength === 0;
  });
});

test('G3 computed-style stage dim holds, and the backdrop is a bright full screen layer above header and rail', async ({ page }) => {
  test.setTimeout(60_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  // Step past gap and entrance to hold midpoint (entrance 3.6 s + 4 s hold)
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(5600));

  // Wait for the CSS transitions on #stage and the backdrop to settle. A fixed wait is
  // not enough on a loaded machine, so poll the settled values instead.
  await page.waitForTimeout(1000);
  await expect
    .poll(
      async () =>
        await frame.evaluate(() => {
          const stage = document.getElementById('stage');
          const sky = document.getElementById('arrival-sky');
          return (
            !!stage && parseFloat(window.getComputedStyle(stage).opacity) <= 0.23 &&
            !!sky && parseFloat(window.getComputedStyle(sky).opacity) === 1
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  const styles = await frame.evaluate(() => {
    const stage = document.getElementById('stage');
    const eventStage = document.getElementById('event');
    const tv = document.getElementById('tv');
    const sky = document.getElementById('arrival-sky');
    const header = document.querySelector<HTMLElement>('.tv-header');
    const footer = document.querySelector<HTMLElement>('.footer');
    if (!stage || !eventStage || !tv || !header || !footer) return null;
    const stageStyle = window.getComputedStyle(stage);
    const legacyBackdrop = window.getComputedStyle(eventStage, '::before');
    const skyStyle = sky ? window.getComputedStyle(sky) : null;
    const tvRect = tv.getBoundingClientRect();
    const skyRect = sky ? sky.getBoundingClientRect() : null;
    return {
      stageDimmed: stage.classList.contains('dimmed'),
      stageOpacity: parseFloat(stageStyle.opacity),
      stageFilter: stageStyle.filter,
      legacyBackdropContent: legacyBackdrop.content,
      legacyBackdropBg: legacyBackdrop.backgroundColor,
      hasSky: !!sky,
      skyOpacity: skyStyle ? parseFloat(skyStyle.opacity) : 0,
      skyZ: skyStyle ? parseInt(skyStyle.zIndex, 10) : 0,
      skyPointerEvents: skyStyle ? skyStyle.pointerEvents : '',
      eventZ: parseInt(window.getComputedStyle(eventStage).zIndex, 10),
      headerZ: parseInt(window.getComputedStyle(header).zIndex, 10),
      footerZ: parseInt(window.getComputedStyle(footer).zIndex, 10),
      skyInTv: !!sky && sky.parentElement === tv,
      tvRect: { x: tvRect.x, y: tvRect.y, width: tvRect.width, height: tvRect.height },
      skyRect: skyRect ? { x: skyRect.x, y: skyRect.y, width: skyRect.width, height: skyRect.height } : null,
    };
  });

  expect(styles).not.toBeNull();
  expect(styles!.stageDimmed).toBe(true);
  expect(styles!.stageOpacity).toBeLessThanOrEqual(0.23);
  expect(styles!.stageFilter).toContain('blur(');

  // The near-black arrival backdrop is gone.
  const legacyAlphaMatch = styles!.legacyBackdropBg.match(
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/,
  );
  const legacyAlpha = legacyAlphaMatch
    ? parseFloat(legacyAlphaMatch[1])
    : styles!.legacyBackdropBg.startsWith('rgb(')
    ? 1
    : 0;
  expect(legacyAlpha).toBe(0);

  // The bright backdrop is mounted on #tv, covers the whole TV box, and paints
  // above the header and the footer that carries the live recognition rail.
  expect(styles!.hasSky).toBe(true);
  expect(styles!.skyInTv).toBe(true);
  expect(styles!.skyOpacity).toBe(1);
  expect(styles!.skyPointerEvents).toBe('none');
  expect(styles!.skyZ).toBeGreaterThan(styles!.headerZ);
  expect(styles!.skyZ).toBeGreaterThan(styles!.footerZ);
  expect(styles!.eventZ).toBeGreaterThan(styles!.skyZ);
  expect(Math.abs(styles!.skyRect!.x - styles!.tvRect.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(styles!.skyRect!.y - styles!.tvRect.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(styles!.skyRect!.width - styles!.tvRect.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(styles!.skyRect!.height - styles!.tvRect.height)).toBeLessThanOrEqual(1);

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

test('arrival records log exactly one arrival_record_shown per record for single arrival and a long message group wave', async ({ page }) => {
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

  // 2. Group wave of five long messages: each of the five ids has exactly one entry, not more
  seq++;
  const groupPrefix = 'arrival-group-oversize-log';
  const longMessage =
    'This is an extended appreciation message designed to test the group reading flow with long messages on the display. Thank you for your continued support and kindness.';
  await pushArrivalWave(page, frame, snapshot, 6, seq, {
    idPrefix: groupPrefix,
    message: longMessage,
  });

  const expectedGroupIds = Array.from({ length: GROUP_SIZE }, (_, i) => `${groupPrefix}-${i}`);

  // Step through the reading and exit to completion
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

  // All five stay on screen together for the whole wave: the reading is one
  // group page, never the old two at a time pair pages.
  const pagesLogged = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs
      .filter((l: any) => l.type === 'reading_start' && l.kind === 'group')
      .map((l: any) => l.page);
  });
  expect(pagesLogged.length).toBeGreaterThan(0);
  expect(new Set(pagesLogged)).toEqual(new Set([0]));

  // Verify each of the five record ids has exactly one arrival_record_shown entry
  const allShownLogs = await frame.evaluate(() => {
    const logs = (window as any).colorPolishRuntime.getState().log || [];
    return logs.filter((l: any) => l.type === 'arrival_record_shown');
  });

  for (const id of expectedGroupIds) {
    const idLogs = allShownLogs.filter((l: any) => l.id === id);
    expect(idLogs).toHaveLength(1);
  }
});

test('a wave of five draws five bubbles at the group size, one per recognition, with every word on screen', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const prefix = 'wave-of-five';
  const messages = Array.from(
    { length: GROUP_SIZE },
    (_, index) => `Sample message ${index + 1}. Thank you for the steady help you gave this week.`,
  );
  await pushArrivalWave(page, frame, snapshot, 6, 2, { idPrefix: prefix, messages });
  await stepToReading(frame);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1700));

  const shown = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    const orbs = [...document.querySelectorAll<HTMLElement>('#event .event-orb')];
    const tv = document.getElementById('tv')!.getBoundingClientRect();
    const zoom = tv.width / 1920;
    return {
      kind: state.active?.kind ?? null,
      itemCount: state.active?.ids?.length ?? 0,
      orbs: orbs.map((orb) => {
        const matrix = new DOMMatrixReadOnly(window.getComputedStyle(orb).transform);
        const scale = Math.hypot(matrix.a, matrix.b);
        const message = orb.querySelector<HTMLElement>('.message')!;
        const content = orb.querySelector<HTMLElement>('.orb-content')!;
        return {
          id: orb.dataset.eventId || '',
          text: message.textContent || '',
          drawnDiameter: orb.getBoundingClientRect().width / zoom,
          messagePx: parseFloat(window.getComputedStyle(message).fontSize) * scale,
          fits: content.scrollHeight <= parseFloat(orb.style.width) * 0.855 + 0.5,
        };
      }),
    };
  });

  expect(shown.kind).toBe('group');
  expect(shown.itemCount).toBe(GROUP_SIZE);
  expect(shown.orbs).toHaveLength(GROUP_SIZE);
  const ids = shown.orbs.map((orb) => orb.id);
  expect(new Set(ids).size).toBe(GROUP_SIZE);
  for (let index = 0; index < GROUP_SIZE; index++) {
    expect(ids.filter((id) => id === `${prefix}-${index}`)).toHaveLength(1);
  }
  for (const orb of shown.orbs) {
    const own = messages[Number(orb.id.slice(prefix.length + 1))];
    expect(own.startsWith(orb.text) || own.includes(orb.text)).toBe(true);
    expect(orb.text.length).toBeGreaterThan(0);
    expect(orb.text.endsWith('...'), 'a message is never ellipsized').toBe(false);
    expect(orb.fits, 'the words fit inside the bubble').toBe(true);
    expect(orb.drawnDiameter, 'the bubble is drawn at the group size').toBeCloseTo(GROUP_DRAWN, 0);
    expect(orb.messagePx, 'message drawn px').toBeGreaterThanOrEqual(TEXT_FLOOR_PX);
  }
  // Every word of every message is reachable: whatever does not fit at once is paged, verbatim.
  const paginated = await frame.evaluate(
    (idPrefix: string) =>
      ((window as any).colorPolishRuntime.getState().log || []).filter(
        (l: any) => l.type === 'circular_pagination' && String(l.id).startsWith(idPrefix),
      ),
    prefix,
  );
  for (const entry of paginated) expect(entry.verbatim).toBe(true);
  await stepToDrained(frame);
});

test('the oversize group reading reaches every one of the five messages across its pages', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const prefix = 'five-oversize';
  const messages = Array.from(
    { length: GROUP_SIZE },
    (_, index) =>
      `Message ${index + 1} of five. This is a long appreciation note written so the wave of five has to open its circular full message pages, and every word of it belongs to recognition number ${index + 1}. Thank you for the care you showed this week, and for the quiet steady help nobody was asked to give.`,
  );
  await pushArrivalWave(page, frame, snapshot, 6, 2, { idPrefix: prefix, messages });

  const seen = new Map<string, string>();
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1200));
  for (let step = 0; step < 120; step++) {
    const state = await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const value = runtime.getState();
      return {
        done: value.active === null && value.queueLength === 0,
        orbs: [...document.querySelectorAll<HTMLElement>('#event .event-orb')].map((orb) => ({
          id: orb.dataset.eventId || '',
          text: orb.querySelector<HTMLElement>('.message')!.textContent || '',
        })),
      };
    });
    if (state.done) break;
    for (const orb of state.orbs) seen.set(orb.id, (seen.get(orb.id) || '') + orb.text);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));
  }

  for (let index = 0; index < GROUP_SIZE; index++) {
    const id = `${prefix}-${index}`;
    expect(seen.has(id), `recognition ${index + 1} of five reached the screen`).toBe(true);
    expect(messages[index].includes(seen.get(id)!.slice(0, 40))).toBe(true);
  }
  const pages = await frame.evaluate(
    (idPrefix: string) =>
      ((window as any).colorPolishRuntime.getState().log || []).filter(
        (l: any) => l.type === 'circular_pagination' && String(l.id).startsWith(idPrefix),
      ),
    prefix,
  );
  for (const entry of pages) expect(entry.verbatim).toBe(true);
  await stepToDrained(frame);
});

test('fewer than five waiting still arrive one at a time as single entrances', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  await pushArrivalWave(page, frame, snapshot, 6, 2, { idPrefix: 'four-waiting', count: GROUP_SIZE - 1 });
  const queueWording = await frame.evaluate(() => document.getElementById('queue')?.textContent || '');
  expect(queueWording).not.toContain('release together');

  await stepToReading(frame);
  const first = await frame.evaluate(() => {
    const state = (window as any).colorPolishRuntime.getState();
    return { kind: state.active?.kind ?? null, items: state.active?.ids?.length ?? 0 };
  });
  expect(first.kind).toBe('single');
  expect(first.items).toBe(1);

  await stepToDrained(frame);
  const entrances = await frame.evaluate(() =>
    ((window as any).colorPolishRuntime.getState().log || [])
      .filter((l: any) => l.type === 'entrance_start')
      .map((l: any) => l.kind),
  );
  expect(entrances).toHaveLength(GROUP_SIZE - 1);
  expect(entrances.every((kind: string) => kind === 'single')).toBe(true);
});

type LuminanceStats = {
  mean: number;
  min: number;
  darkest5: number;
  brightest50: number;
  /** Share of pixels darker than mid grey, which is what readable dark text looks like. */
  darkFraction: number;
  count: number;
};

type Box = { x: number; y: number; width: number; height: number };

/**
 * Screenshots the viewport (or one clip of it) and measures rendered luminance.
 * The PNG is decoded back inside the probe page, so no image dependency is added.
 */
async function luminanceStats(page: Page, clip?: Box, stride = 1): Promise<LuminanceStats> {
  const rounded = clip
    ? {
        x: Math.max(0, Math.round(clip.x)),
        y: Math.max(0, Math.round(clip.y)),
        width: Math.max(1, Math.round(clip.width)),
        height: Math.max(1, Math.round(clip.height)),
      }
    : undefined;
  const buffer = await page.screenshot(rounded ? { clip: rounded } : {});
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return await page.evaluate(
    async ({ url, stride }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2d context');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const channel = (value: number) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      const values: number[] = [];
      for (let i = 0; i < pixels.length; i += 4 * stride) {
        values.push(
          0.2126 * channel(pixels[i]) + 0.7152 * channel(pixels[i + 1]) + 0.0722 * channel(pixels[i + 2]),
        );
      }
      values.sort((a, b) => a - b);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const band = (from: number, to: number) => {
        const start = Math.floor(values.length * from);
        const end = Math.max(Math.floor(values.length * to), start + 1);
        const slice = values.slice(start, end);
        return slice.reduce((sum, value) => sum + value, 0) / slice.length;
      };
      let dark = 0;
      for (const value of values) {
        if (value < 0.35) dark++;
        else break;
      }
      return {
        mean,
        min: values[0],
        darkest5: band(0, 0.05),
        brightest50: band(0.5, 1),
        darkFraction: dark / values.length,
        count: values.length,
      };
    },
    { url: dataUrl, stride },
  );
}

function colorLuminance(color: string): number {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`unreadable color: ${color}`);
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(Number(parts[0])) +
    0.7152 * channel(Number(parts[1])) +
    0.0722 * channel(Number(parts[2]))
  );
}

function contrastRatio(a: number, b: number): number {
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Steps the virtual clock until the arrival is holding on screen.
 * The renderer fixture stubs requestAnimationFrame, so waitForFunction cannot
 * re-poll here; every wait in these checks steps or polls explicitly instead.
 */
async function stepToReading(frame: Frame) {
  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    for (let i = 0; i < 200; i++) {
      const state = runtime.getState();
      if (state.active && state.active.phase === 'reading') return;
      runtime.step(200);
    }
    throw new Error('arrival never reached its reading phase');
  });
  const phase = await frame.evaluate(
    () => (window as any).colorPolishRuntime.getState().active?.phase ?? null,
  );
  expect(phase).toBe('reading');
}

async function stepToDrained(frame: Frame) {
  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    for (let i = 0; i < 400; i++) {
      const state = runtime.getState();
      if (state.active === null && state.queueLength === 0) return;
      runtime.step(250);
    }
  });
  const state = await frame.evaluate(() => {
    const value = (window as any).colorPolishRuntime.getState();
    return { active: value.active, queueLength: value.queueLength };
  });
  expect(state.active).toBeNull();
  expect(state.queueLength).toBe(0);
}

async function waitForSkyGone(frame: Frame) {
  await expect
    .poll(async () => await frame.evaluate(() => !document.getElementById('arrival-sky')), {
      timeout: 5000,
    })
    .toBe(true);
}

/**
 * Pauses every animation, screenshots, hides the header and the footer (rail, title, QR),
 * screenshots again, restores, and returns how many pixels really differ (any channel by
 * more than 8 levels) and the box they sit in. 0 means the header and the rail are completely covered.
 */
async function hiddenChromeDiff(
  page: Page,
  frame: Frame,
): Promise<{ count: number; box: { left: number; top: number; right: number; bottom: number } | null }> {
  await frame.evaluate(() => document.getAnimations().forEach((animation) => animation.pause()));
  const shown = await page.screenshot();
  await frame.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.tv-header, .footer').forEach((el) => {
      el.dataset.l14Visibility = el.style.visibility;
      el.style.visibility = 'hidden';
    });
  });
  const hidden = await page.screenshot();
  await frame.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.tv-header, .footer').forEach((el) => {
      el.style.visibility = el.dataset.l14Visibility || '';
      delete el.dataset.l14Visibility;
    });
    document.getAnimations().forEach((animation) => animation.play());
  });
  return await page.evaluate(
    async ({ a, b }) => {
      const load = async (url: string) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('no 2d context');
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [pa, pb] = [await load(a), await load(b)];
      if (pa.length !== pb.length) throw new Error('screenshots differ in size');
      const width = await (async () => {
        const image = new Image();
        image.src = a;
        await image.decode();
        return image.naturalWidth;
      })();
      let count = 0;
      const box = { left: Infinity, top: Infinity, right: -1, bottom: -1 };
      for (let i = 0; i < pa.length; i += 4) {
        if (Math.abs(pa[i] - pb[i]) > 8 || Math.abs(pa[i + 1] - pb[i + 1]) > 8 || Math.abs(pa[i + 2] - pb[i + 2]) > 8) {
          const x = (i / 4) % width;
          const y = Math.floor(i / 4 / width);
          // Old headless Chromium redraws the four rounded screen corners differently when
          // the layer tree changes (Lane 5 review); they are not part of this question.
          const height = pa.length / 4 / width;
          const corner = 16 * (width / 1920);
          if ((x < corner || x >= width - corner) && (y < corner || y >= height - corner)) continue;
          count++;
          box.left = Math.min(box.left, x);
          box.top = Math.min(box.top, y);
          box.right = Math.max(box.right, x);
          box.bottom = Math.max(box.bottom, y);
        }
      }
      return { count, box: count ? box : null };
    },
    { a: `data:image/png;base64,${shown.toString('base64')}`, b: `data:image/png;base64,${hidden.toString('base64')}` },
  );
}

const ARRIVAL_KINDS: Array<{ name: string; wave: number; expected: string }> = [
  { name: 'single', wave: 0, expected: 'single' },
  { name: 'group', wave: 6, expected: 'group' },
];

for (const kind of ARRIVAL_KINDS) {
test(`the ${kind.name} arrival backdrop is bright at 1920 and at 3840, and orb text keeps AA contrast on it`, async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const beforeArrival = await luminanceStats(page, undefined, 7);

  await pushArrivalWave(page, frame, snapshot, kind.wave, 2);
  await stepToReading(frame);
  await page.waitForTimeout(900);

  const activeKind = await frame.evaluate(
    () => (window as any).colorPolishRuntime.getState().active?.kind ?? null,
  );
  expect(activeKind).toBe(kind.expected);

  const during1920 = await luminanceStats(page, undefined, 7);
  expect(during1920.mean).toBeGreaterThan(0.72);
  expect(during1920.mean).toBeGreaterThan(beforeArrival.mean * 0.9);

  // A column of the TV that only the backdrop paints, top edge to bottom edge.
  const tvBox1920 = await frame.locator('#tv').boundingBox();
  expect(tvBox1920).not.toBeNull();
  const skyOnly1920 = await luminanceStats(
    page,
    { x: tvBox1920!.x + 8, y: tvBox1920!.y + 40, width: 40, height: tvBox1920!.height - 80 },
    1,
  );
  expect(skyOnly1920.mean).toBeGreaterThan(0.85);
  expect(skyOnly1920.min).toBeGreaterThan(0.6);

  // Text on the orb against the backdrop it is actually rendered on.
  const orbBox = await frame.locator('.event-orb').first().boundingBox();
  expect(orbBox).not.toBeNull();
  const orbStats = await luminanceStats(page, orbBox!, 1);
  const textColors = await frame.evaluate(() => {
    const orb = document.querySelector<HTMLElement>('.event-orb');
    if (!orb) return null;
    const recipient = orb.querySelector<HTMLElement>('.recipient');
    const message = orb.querySelector<HTMLElement>('.message');
    return {
      recipient: recipient ? window.getComputedStyle(recipient).color : null,
      message: message ? window.getComputedStyle(message).color : null,
    };
  });
  expect(textColors).not.toBeNull();
  expect(textColors!.recipient).not.toBeNull();
  expect(textColors!.message).not.toBeNull();
  for (const color of [textColors!.recipient!, textColors!.message!]) {
    expect(contrastRatio(colorLuminance(color), orbStats.brightest50)).toBeGreaterThanOrEqual(4.5);
  }

  // Same arrival, 3840 wide: the backdrop still covers the whole TV box and stays bright.
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.waitForTimeout(400);
  const geometry3840 = await frame.evaluate(() => {
    const tv = document.getElementById('tv');
    const sky = document.getElementById('arrival-sky');
    if (!tv || !sky) return null;
    const tvRect = tv.getBoundingClientRect();
    const skyRect = sky.getBoundingClientRect();
    return {
      tv: { width: tvRect.width, height: tvRect.height, x: tvRect.x, y: tvRect.y },
      sky: { width: skyRect.width, height: skyRect.height, x: skyRect.x, y: skyRect.y },
      skyOpacity: parseFloat(window.getComputedStyle(sky).opacity),
    };
  });
  expect(geometry3840).not.toBeNull();
  expect(geometry3840!.tv.width).toBeGreaterThan(3000);
  expect(Math.abs(geometry3840!.sky.width - geometry3840!.tv.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry3840!.sky.height - geometry3840!.tv.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry3840!.sky.x - geometry3840!.tv.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry3840!.sky.y - geometry3840!.tv.y)).toBeLessThanOrEqual(1);
  expect(geometry3840!.skyOpacity).toBe(1);

  const during3840 = await luminanceStats(page, undefined, 13);
  expect(during3840.mean).toBeGreaterThan(0.72);
  const skyOnly3840 = await luminanceStats(
    page,
    {
      x: geometry3840!.tv.x + 16,
      y: geometry3840!.tv.y + 80,
      width: 80,
      height: geometry3840!.tv.height - 160,
    },
    2,
  );
  expect(skyOnly3840.mean).toBeGreaterThan(0.85);
  expect(skyOnly3840.min).toBeGreaterThan(0.6);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await stepToDrained(frame);
});

test(`the header and the live recognition rail are covered during the ${kind.name} arrival and readable again after`, async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const railItems = await frame.locator('#feed-columns .chat-item').count();
  expect(railItems).toBeGreaterThan(0);

  const fullHeaderBox = await frame.locator('.tv-header').boundingBox();
  const railBox = await frame.locator('#feed-columns').boundingBox();
  const tvBox = await frame.locator('#tv').boundingBox();
  expect(fullHeaderBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect(tvBox).not.toBeNull();
  // The full screen arrival frame (Plan 17 Lane 14) puts the arrival's own words (kicker or
  // group title, waiting pill) from TV y 72 down, which overlaps the header's lower band.
  // The probe is the header band above those words: the brand, the likes and the clock.
  const tvZoom = tvBox!.width / 1920;
  const headerBox = {
    x: fullHeaderBox!.x,
    y: fullHeaderBox!.y,
    width: fullHeaderBox!.width,
    height: tvBox!.y + 70 * tvZoom - fullHeaderBox!.y,
  };
  expect(headerBox.height).toBeGreaterThan(30 * tvZoom);

  // The footer panel carries the rail, its LIVE RECOGNITIONS title and the QR
  // block, so it stays a stable readability probe while the rail lanes scroll.
  const footerBox = await frame.locator('.footer').boundingBox();
  expect(footerBox).not.toBeNull();

  const headerBefore = await luminanceStats(page, headerBox!, 1);
  const railBefore = await luminanceStats(page, railBox!, 1);
  const footerBefore = await luminanceStats(page, footerBox!, 1);
  // Readable dark text is on screen in the header, the rail and the footer.
  expect(headerBefore.darkFraction).toBeGreaterThan(0.002);
  expect(railBefore.darkFraction).toBeGreaterThan(0.002);
  expect(footerBefore.darkFraction).toBeGreaterThan(0.002);

  await pushArrivalWave(page, frame, snapshot, kind.wave, 2);
  await stepToReading(frame);
  await page.waitForTimeout(900);

  const headerDuring = await luminanceStats(page, headerBox!, 1);
  const railDuring = await luminanceStats(page, railBox!, 1);
  // Nothing of the header shows through above the arrival's own words, and the rail band
  // is bright. The full screen entrance (Plan 17 Lane 14) now draws its own orbs and caption
  // over the rail band, so dark pixels there are the arrival's own words; whether the rail
  // itself shows through is settled by the hide and compare check below.
  expect(headerDuring.darkFraction).toBeLessThan(0.0002);
  expect(headerDuring.min).toBeGreaterThan(0.3);
  expect(headerDuring.mean).toBeGreaterThan(0.6);
  expect(railDuring.mean).toBeGreaterThan(0.6);

  // The one time name shimmer blends with what is behind it, so let it finish first.
  await page.waitForTimeout(3000);

  // Hide and compare: with every animation paused, hiding the header and the footer (rail,
  // title and QR) must not change the screen, because the entrance covers them. Up to 50
  // stray pixels of raster noise are allowed; an uncovered header and rail change more than
  // 5000 (checked at the end of this test), and a rail showing through changes thousands.
  const coveredDiff = await hiddenChromeDiff(page, frame);
  expect(coveredDiff.count, `pixels that change when the covered header and rail are hidden, in ${JSON.stringify(coveredDiff.box)}`).toBeLessThanOrEqual(50);

  await stepToDrained(frame);
  await waitForSkyGone(frame);
  await page.waitForTimeout(400);

  const headerAfter = await luminanceStats(page, headerBox!, 1);
  const footerAfter = await luminanceStats(page, footerBox!, 1);
  // Readable again: the header and the footer that carries the rail show their
  // own dark text instead of the wash.
  expect(headerAfter.darkFraction).toBeGreaterThan(0.002);
  expect(footerAfter.darkFraction).toBeGreaterThan(0.002);

  const skyGone = await frame.evaluate(() => !document.getElementById('arrival-sky'));
  expect(skyGone).toBe(true);

  // The same probe does see the header and the rail once they are uncovered again.
  const uncoveredDiff = await hiddenChromeDiff(page, frame);
  expect(uncoveredDiff.count).toBeGreaterThan(5000);
});
}

test('every entrance style, single and group, runs under the bright backdrop', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const seen: Array<{ kind: string; style: number; hasSky: boolean; opacity: number; rays: number }> = [];
  let seq = 1;

  for (let wave = 0; wave < 11; wave++) {
    seq++;
    await pushArrivalWave(page, frame, snapshot, wave, seq);
    await stepToReading(frame);
    const reading = await frame.evaluate(() => {
      const state = (window as any).colorPolishRuntime.getState();
      const sky = document.getElementById('arrival-sky');
      const style = sky ? window.getComputedStyle(sky) : null;
      return {
        kind: state.active?.kind ?? 'none',
        style: state.active?.style ?? -1,
        hasSky: !!sky,
        opacity: style ? parseFloat(style.opacity) : 0,
        rays: document.querySelectorAll('.arrival-sky-ray').length,
      };
    });
    seen.push(reading);
    await stepToDrained(frame);
  }

  expect(seen).toHaveLength(11);
  for (const entry of seen) {
    expect(entry.hasSky).toBe(true);
    expect(entry.opacity).toBe(1);
    expect(entry.rays).toBeGreaterThan(0);
  }
  const singleStyles = seen.filter((entry) => entry.kind === 'single').map((entry) => entry.style);
  const groupStyles = seen.filter((entry) => entry.kind === 'group').map((entry) => entry.style);
  expect(new Set(singleStyles).size).toBe(6);
  expect(new Set(groupStyles).size).toBe(5);
});

test('arrival timing: the single bubble shows for 7 seconds (Anthony, 2026-09-19); entrance and exit keep their recorded lengths', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);

  const sample = async (steps: number) =>
    await frame.evaluate((count: number) => {
      const runtime = (window as any).colorPolishRuntime;
      const samples: Array<{ clock: number; phase: string | null }> = [];
      for (let i = 0; i < count; i++) {
        const state = runtime.getState();
        samples.push({ clock: state.clock, phase: state.active ? state.active.phase : null });
        runtime.step(100);
      }
      return samples;
    }, steps);

  const firstClock = (samples: Array<{ clock: number; phase: string | null }>, phase: string | null) =>
    samples.find((entry) => entry.phase === phase)?.clock ?? null;

  await pushArrivalWave(page, frame, snapshot, 0, 2);
  const singleSamples = await sample(180);
  const singleEntrance = firstClock(singleSamples, 'entrance');
  const singleReading = firstClock(singleSamples, 'reading');
  const singleExit = firstClock(singleSamples, 'exit');
  const afterSingle = singleSamples.find(
    (entry) => entry.phase === null && singleExit !== null && entry.clock > singleExit,
  )?.clock ?? null;

  expect(singleEntrance).not.toBeNull();
  expect(singleReading).not.toBeNull();
  expect(singleExit).not.toBeNull();
  expect(afterSingle).not.toBeNull();
  expect(singleReading! - singleEntrance!).toBeGreaterThanOrEqual(3.5);
  expect(singleReading! - singleEntrance!).toBeLessThanOrEqual(3.8);
  expect(singleExit! - singleReading!).toBeGreaterThanOrEqual(6.9);
  expect(singleExit! - singleReading!).toBeLessThanOrEqual(7.3);
  expect(afterSingle! - singleExit!).toBeGreaterThanOrEqual(1.25);
  expect(afterSingle! - singleExit!).toBeLessThanOrEqual(1.55);

  await stepToDrained(frame);

  await pushArrivalWave(page, frame, snapshot, 6, 3);
  const groupSamples = await sample(120);
  const groupEntrance = firstClock(groupSamples, 'entrance');
  const groupReading = firstClock(groupSamples, 'reading');
  expect(groupEntrance).not.toBeNull();
  expect(groupReading).not.toBeNull();
  expect(groupReading! - groupEntrance!).toBeGreaterThanOrEqual(4.6);
  expect(groupReading! - groupEntrance!).toBeLessThanOrEqual(4.9);

  await frame.evaluate(() => (window as any).colorPolishRuntime.step(120000));
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(120000));
});

test('the dynamic entrance: living architecture opens behind the bubble, words rise, light fills the hold', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await pushArrivalWave(page, frame, snapshot, 0, 2);

  const probe = async () =>
    await frame.evaluate(() => {
      const event = document.getElementById('event')!;
      const style = (selector: string) => {
        const el = event.querySelector<HTMLElement>(selector);
        return el ? { transform: el.style.transform, opacity: parseFloat(el.style.opacity || '1') } : null;
      };
      const words = [...event.querySelectorAll<HTMLElement>('.arrival-word')].map((el) => ({
        opacity: parseFloat(el.style.opacity || '1'),
        transform: el.style.transform,
      }));
      const canvas = document.getElementById('event-canvas') as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const painted = (x: number, y: number, w: number, h: number) => {
        const data = context.getImageData(x, y, w, h).data;
        let count = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 24) count++;
        return count;
      };
      const state = (window as any).colorPolishRuntime.getState();
      return {
        phase: state.active ? state.active.phase : null,
        halo: style('.arrival-halo'),
        fanA: style('.arrival-halo-fan.fan-a'),
        fanB: style('.arrival-halo-fan.fan-b'),
        rosette: style('.arrival-rosette-0'),
        edge: style('.arrival-edge'),
        dawn: style('.arrival-dawn'),
        decorationHidden: ['.arrival-architecture', '.arrival-edge'].every(
          (selector) => event.querySelector(selector)?.getAttribute('aria-hidden') === 'true',
        ),
        decorationText: (event.querySelector('.arrival-architecture')?.textContent || '').trim(),
        words,
        paintedAll: painted(0, 0, 1812, 972),
        // The headline block (TV x 154 to 790, y 380 to 700 is stage x 100 to 736, y 326 to 646).
        paintedOverHeadline: painted(100, 326, 636, 320),
        // The bubble's face, well inside its rim (stage centre 1300,486, radius 380).
        paintedOverBubble: painted(1300 - 240, 486 - 240, 480, 480),
      };
    });

  const stepUntil = async (phase: string) =>
    await frame.evaluate((target: string) => {
      const runtime = (window as any).colorPolishRuntime;
      for (let i = 0; i < 400; i++) {
        if (runtime.getState().active?.phase === target) return;
        runtime.step(50);
      }
      throw new Error('never reached ' + target);
    }, phase);

  // Opening: the scene starts closed, with a flash of light, and the words have not risen yet.
  await stepUntil('entrance');
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(100));
  const opening = await probe();
  expect(opening.phase).toBe('entrance');
  expect(opening.decorationHidden).toBe(true);
  expect(opening.decorationText).toBe('');
  expect(opening.halo!.opacity).toBeLessThan(0.35);
  expect(opening.dawn!.opacity).toBeGreaterThan(0.5);
  expect(opening.words.length).toBeGreaterThanOrEqual(7);
  expect(opening.words[opening.words.length - 1].opacity).toBe(0);
  expect(opening.words[0].transform).toContain('translate');

  // Mid flight: the architecture is opening and the stardust wake is on the canvas.
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1700));
  const flight = await probe();
  expect(flight.phase).toBe('entrance');
  expect(flight.halo!.opacity).toBeGreaterThan(opening.halo!.opacity);
  expect(flight.paintedAll).toBeGreaterThan(400);

  // Landed: everything is open, every word has risen and rests untransformed (so it is
  // crisp and measured where it is laid out), and the hold is alive with light.
  await stepUntil('reading');
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(2500));
  const holdA = await probe();
  expect(holdA.phase).toBe('reading');
  expect(holdA.halo!.opacity).toBeGreaterThan(0.95);
  expect(holdA.edge!.opacity).toBeGreaterThan(0.5);
  expect(holdA.dawn!.opacity).toBeLessThan(0.05);
  for (const word of holdA.words) {
    expect(word.opacity).toBe(1);
    expect(word.transform).toBe('');
  }
  expect(holdA.paintedAll).toBeGreaterThan(400);
  // The light never crosses the headline or the words on the bubble.
  expect(holdA.paintedOverHeadline).toBe(0);
  expect(holdA.paintedOverBubble).toBe(0);

  // It keeps moving through the hold: the two fans turn opposite ways, the rosette turns.
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
  const holdB = await probe();
  const angle = (transform: string) => parseFloat(/rotate\((-?[\d.]+)deg\)/.exec(transform)![1]);
  expect(angle(holdB.fanA!.transform)).toBeGreaterThan(angle(holdA.fanA!.transform));
  expect(angle(holdB.fanB!.transform)).toBeLessThan(angle(holdA.fanB!.transform));
  expect(angle(holdB.rosette!.transform)).not.toBe(angle(holdA.rosette!.transform));

  // Leaving: the architecture folds away with the bubble.
  await stepUntil('exit');
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(900));
  const leaving = await probe();
  expect(leaving.phase).toBe('exit');
  expect(leaving.halo!.opacity).toBeLessThan(0.6);
  expect(leaving.words[0].opacity).toBeLessThan(0.6);
  await stepToDrained(frame);
});

test('reduced motion: the architecture is open at once, nothing turns, words rest in place, no canvas light', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await pushArrivalWave(page, frame, snapshot, 0, 2);
  await stepToReading(frame);
  const read = async () =>
    await frame.evaluate(() => {
      const event = document.getElementById('event')!;
      const canvas = document.getElementById('event-canvas') as HTMLCanvasElement;
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 24) painted++;
      return {
        still: (window as any).colorPolishRuntime.getState().still,
        halo: parseFloat(event.querySelector<HTMLElement>('.arrival-halo')!.style.opacity),
        dawn: parseFloat(event.querySelector<HTMLElement>('.arrival-dawn')!.style.opacity),
        fan: event.querySelector<HTMLElement>('.arrival-halo-fan.fan-a')!.style.transform,
        rosette: event.querySelector<HTMLElement>('.arrival-rosette-0')!.style.transform,
        words: [...event.querySelectorAll<HTMLElement>('.arrival-word')].map((el) => el.style.opacity + '|' + el.style.transform),
        running: document.getAnimations().filter((a) => a.playState === 'running' && event.contains((a.effect as KeyframeEffect).target)).length,
        painted,
      };
    });
  const first = await read();
  expect(first.still).toBe(true);
  expect(first.halo).toBe(1);
  expect(first.dawn).toBe(0);
  expect(first.painted).toBe(0);
  expect(first.running).toBe(0);
  for (const word of first.words) expect(word).toBe('1|');
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));
  const later = await read();
  expect(later.fan).toBe(first.fan);
  expect(later.rosette).toBe(first.rosette);
  expect(later.painted).toBe(0);
});

test('a long single message still shows every page: 7 seconds for each page, never cut short', async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await pushArrivalWave(page, frame, snapshot, 0, 2, { message: MOSTLY_LONG_MESSAGE_500 });
  await stepToReading(frame);
  const seen = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const start = runtime.getState().clock;
    const pages: string[] = [];
    let readingEnd: number | null = null;
    for (let i = 0; i < 1200; i++) {
      const state = runtime.getState();
      if (!state.active || state.active.phase !== 'reading') {
        readingEnd = state.clock;
        break;
      }
      const text = document.querySelector('#event .event-orb .message')?.textContent || '';
      if (pages[pages.length - 1] !== text) pages.push(text);
      runtime.step(100);
    }
    return { pages, held: readingEnd === null ? null : readingEnd - start };
  });
  expect(seen.held).not.toBeNull();
  expect(seen.pages.length).toBeGreaterThanOrEqual(1);
  // Every page was shown once, in order, and together they are the whole message.
  expect(seen.pages.join(' ').replace(/\s+/g, ' ').trim()).toBe(MOSTLY_LONG_MESSAGE_500.replace(/\s+/g, ' ').trim());
  expect(seen.held!).toBeGreaterThanOrEqual(7 * seen.pages.length - 0.2);
  expect(seen.held!).toBeLessThanOrEqual(7 * seen.pages.length + 0.4);
});

for (const width of [1920, 3840]) {
test(`captures the bright single and group arrival at start, mid flight and after clearing, at ${width}`, async ({ page }) => {
  test.setTimeout(300_000);
  const outputFolder =
    process.env.L14_CAPTURE_DIR ??
    resolve(process.cwd(), 'docs/runs/2026-09-18-tv-fit/logs/captures/L14/after');
  await mkdir(outputFolder, { recursive: true });

  const written: string[] = [];
  const height = width === 1920 ? 1080 : 2160;
  await page.setViewportSize({ width, height });

  for (const kind of ARRIVAL_KINDS) {
    const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
    const frame = await loadRenderer(page);
    await page.waitForTimeout(300);

    const shot = async (name: string) => {
      await frame.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      });
      const target = resolve(outputFolder, `w${width}-${kind.name}-${name}.png`);
      await page.screenshot({ path: target });
      const info = await stat(target);
      expect(info.size).toBeGreaterThan(0);
      written.push(target);
    };

    await pushArrivalWave(page, frame, snapshot, kind.wave, 2);

    // Start: the backdrop is up and the entrance has begun.
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(650));
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(300));
    await page.waitForTimeout(900);
    await shot('arrival-start');

    // Mid flight: entrance midpoint.
    await frame.evaluate((ms) => (window as any).colorPolishRuntime.step(ms), kind.wave < 6 ? 1500 : 2050);
    await shot('arrival-mid-flight');

    // Exit flight toward the rail.
    await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      for (let i = 0; i < 300; i++) {
        const state = runtime.getState();
        if (state.active && state.active.phase === 'exit') break;
        runtime.step(200);
      }
      runtime.step(600);
    });
    await shot('arrival-exit-flight');

    // After clearing: the rail is readable again.
    await stepToDrained(frame);
    await waitForSkyGone(frame);
    await page.waitForTimeout(400);
    await shot('arrival-cleared');
  }

  expect(written).toHaveLength(8);
});
}



/* Reviewer additions (Plan 17 Lane 11 review). */

async function pushSafeMode(page: Page, snapshot: ArrivalSnapshot, sequence: number, status: 'quiet' | 'unavailable') {
  await page.evaluate(
    ({ snapshot, sequence, status }) => {
      (window as any).probePort.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce: (window as any).probeNonce,
        sequence,
        snapshot: status === 'quiet' ? { ...snapshot, recognitions: [], arrivals: [] } : null,
        control: { nowMs: Date.parse(snapshot.serverTime), status, source: 'sample', playing: true, scene: 'welcome' },
      });
    },
    { snapshot, sequence, status },
  );
}

for (const status of ['quiet', 'unavailable'] as const) {
for (const kind of ARRIVAL_KINDS) {
test(`a ${status} update during the ${kind.name} arrival clears every personal word and the backdrop cannot outlive it`, async ({ page }) => {
  test.setTimeout(180_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await pushArrivalWave(page, frame, snapshot, kind.wave, 2);
  await stepToReading(frame);

  const during = await frame.evaluate(() => ({
    sky: !!document.getElementById('arrival-sky'),
    names: document.querySelectorAll('#event [data-event-id], #event .event-orb').length,
  }));
  expect(during.sky).toBe(true);
  expect(during.names).toBeGreaterThan(0);

  await pushSafeMode(page, snapshot, 3, status);
  await expect
    .poll(async () => await frame.evaluate(() => (window as any).colorPolishRuntime.getState().mode), { timeout: 15_000 })
    .not.toBe('normal');

  const after = await frame.evaluate(() => {
    const event = document.getElementById('event')!;
    return {
      active: event.classList.contains('active'),
      children: event.childElementCount,
      personal: document.querySelectorAll('[data-event-id], .event-orb').length,
      sampleText: /Sample \d+\.\d+/.test(document.getElementById('tv')!.textContent || ''),
    };
  });
  expect(after.active).toBe(false);
  expect(after.children).toBe(0);
  expect(after.personal).toBe(0);
  expect(after.sampleText).toBe(false);

  // The backdrop fades with the frame and then removes itself; it never stays painted.
  await expect
    .poll(
      async () =>
        await frame.evaluate(() => {
          const sky = document.getElementById('arrival-sky');
          return sky ? parseFloat(window.getComputedStyle(sky).opacity) : 0;
        }),
      { timeout: 15_000 },
    )
    .toBe(0);
  await waitForSkyGone(frame);
});
}
}

for (const width of [1920, 3840]) {
test(`captures every frame style, single and group, under the bright backdrop at ${width}, and each stays bright`, async ({ page }) => {
  test.setTimeout(600_000);
  const zoom = width / 1920;
  await page.setViewportSize({ width, height: 1080 * zoom });
  const outputFolder =
    process.env.L14_CAPTURE_DIR ??
    resolve(process.cwd(), 'docs/runs/2026-09-18-tv-fit/logs/captures/L14/after');
  await mkdir(outputFolder, { recursive: true });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await page.waitForTimeout(300);
  // The arrival frame is the whole TV inside even 54 px margins (Plan 17 Lane 14).
  const panel = { x: 54 * zoom, y: 54 * zoom, width: 1812 * zoom, height: 972 * zoom };
  let seq = 1;
  let written = 0;

  for (const kind of ARRIVAL_KINDS) {
    for (let f = 0; f < 4; f++) {
      seq++;
      await frame.evaluate((index) => {
        // Force the next frame style; the bag is the arrival scene's own global.
        (0, eval)(`ARRIVAL_FRAME_BAG=[${index}]`);
      }, f);
      await pushArrivalWave(page, frame, snapshot, kind.wave, seq, { idPrefix: `frame-${kind.name}-${f}` });
      await stepToReading(frame);
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const info = await frame.evaluate(() => ({
        frame: document.getElementById('event')!.dataset.frame,
        name: document.getElementById('event')!.dataset.frameName || '',
        radius: window.getComputedStyle(document.querySelector('#event .arrival-frame')!).borderTopLeftRadius,
      }));
      expect(info.frame).toBe(String(f));
      expect(parseFloat(info.radius)).toBeGreaterThanOrEqual(36);
      // Let the one time name shimmer finish so the capture shows the resting look.
      await page.waitForTimeout(3600);

      // The arrival panel itself must read as light in every frame style, not as a dim slab.
      const stats = await luminanceStats(page, panel, 4);
      expect(stats.mean, `${kind.name} ${info.name} panel mean luminance`).toBeGreaterThan(0.7);

      const slug = info.name.toLowerCase().replace(/[^a-z]+/g, '-');
      const target = resolve(outputFolder, `w${width}-${kind.name}-frame-${f}-${slug}.png`);
      await page.screenshot({ path: target });
      expect((await stat(target)).size).toBeGreaterThan(0);
      written++;
      await stepToDrained(frame);
    }
  }
  expect(written).toBe(8);
});
}

/* Plan 17 Lane 14: the entrance composition fills the whole screen. */

type TvRect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

type ArrivalGeometry = {
  zoom: number;
  stage: TvRect;
  world: TvRect;
  orbs: Array<TvRect & { scale: number; recipientPx: number; messagePx: number; contentFits: boolean }>;
  words: Array<TvRect & { selector: string; fontPx: number }>;
  pill: (TvRect & { fontPx: number; hidden: boolean }) | null;
  canvas: { width: number; height: number; cssWidth: number; cssHeight: number };
};

/**
 * Measures the live arrival in TV units (1920 by 1080), whatever the viewport width, so
 * one set of numbers holds at 1920 and at 3840. Drawn font sizes are in real screen pixels.
 */
async function arrivalGeometry(frame: Frame): Promise<ArrivalGeometry> {
  return await frame.evaluate(() => {
    const tv = document.getElementById('tv')!;
    const tvRect = tv.getBoundingClientRect();
    const zoom = tvRect.width / 1920;
    const norm = (el: Element) => {
      const r = el.getBoundingClientRect();
      const left = (r.left - tvRect.left) / zoom;
      const top = (r.top - tvRect.top) / zoom;
      return { left, top, right: left + r.width / zoom, bottom: top + r.height / zoom, width: r.width / zoom, height: r.height / zoom };
    };
    const fontPx = (el: Element, scale: number) => parseFloat(window.getComputedStyle(el).fontSize) * scale * zoom;
    const event = document.getElementById('event')!;
    const orbs = [...event.querySelectorAll<HTMLElement>('.event-orb')].map((orb) => {
      const matrix = new DOMMatrixReadOnly(window.getComputedStyle(orb).transform);
      const scale = Math.hypot(matrix.a, matrix.b);
      const content = orb.querySelector<HTMLElement>('.orb-content')!;
      const layout = parseFloat(orb.style.width);
      return {
        ...norm(orb),
        scale,
        recipientPx: fontPx(orb.querySelector('.recipient')!, scale),
        messagePx: fontPx(orb.querySelector('.message')!, scale),
        contentFits: content.scrollHeight <= layout * 0.855 + 0.5,
      };
    });
    const words = ['.event-kicker', '.event-title .eyebrow', '.event-title h2', '.event-title p', '.countdown-caption', '.group-title', '.group-kind']
      .flatMap((selector) => [...event.querySelectorAll(selector)].map((el) => ({ ...norm(el), selector, fontPx: fontPx(el, 1) })));
    const queue = document.getElementById('queue');
    const canvas = document.getElementById('event-canvas') as HTMLCanvasElement;
    return {
      zoom,
      stage: norm(event),
      world: norm(event.querySelector('.event-world')!),
      orbs,
      words,
      pill: queue ? { ...norm(queue), fontPx: fontPx(queue, 1), hidden: queue.hidden } : null,
      canvas: { width: canvas.width, height: canvas.height, cssWidth: norm(canvas).width, cssHeight: norm(canvas).height },
    };
  });
}

/** Shortest distance from a circle's centre to a rectangle, minus the radius: above 0 means clear. */
function circleRectGap(orb: TvRect, rect: TvRect, extraRadius: number): number {
  const cx = (orb.left + orb.right) / 2;
  const cy = (orb.top + orb.bottom) / 2;
  const dx = Math.max(rect.left - cx, 0, cx - rect.right);
  const dy = Math.max(rect.top - cy, 0, cy - rect.bottom);
  return Math.hypot(dx, dy) - (orb.width / 2 + extraRadius);
}

// Today's sizes before this lane (renderer.css and core/arrivals.js at 592a405), TV units.
const BEFORE_LANE_14 = {
  singleOrb: 540,
  groupOrb: 258,
  pairOrb: 518,
  words: {
    '.event-kicker': 14,
    '.event-title .eyebrow': 15,
    '.event-title h2': 53,
    '.event-title p': 23,
    '.countdown-caption': 15,
    '.group-title': 29,
    '.group-kind': 13,
  } as Record<string, number>,
};

const SCREEN_MARGIN = 54;

function expectFullScreenComposition(geometry: ArrivalGeometry, kind: 'single' | 'group' | 'pair', label: string) {
  const { stage, world, orbs, words, pill, zoom } = geometry;

  // The arrival frame is the whole TV inside even margins, centred top to bottom.
  expect(stage.left, `${label}: left margin`).toBeCloseTo(SCREEN_MARGIN, 0);
  expect(1920 - stage.right, `${label}: right margin`).toBeCloseTo(SCREEN_MARGIN, 0);
  expect(stage.top, `${label}: top margin`).toBeCloseTo(SCREEN_MARGIN, 0);
  expect(1080 - stage.bottom, `${label}: bottom margin`).toBeCloseTo(SCREEN_MARGIN, 0);
  expect((stage.top + stage.bottom) / 2, `${label}: frame vertical centre`).toBeCloseTo(540, 0);
  expect(stage.height, `${label}: frame height`).toBeGreaterThanOrEqual(1080 - 2 * SCREEN_MARGIN - 1);
  expect(world.top, `${label}: panel top`).toBeCloseTo(stage.top, 0);
  expect(world.bottom, `${label}: panel bottom`).toBeCloseTo(stage.bottom, 0);
  expect(geometry.canvas.width).toBe(1812);
  expect(geometry.canvas.height).toBe(972);
  expect(geometry.canvas.cssHeight, `${label}: sparkle canvas height`).toBeCloseTo(972, 0);

  // Orbs: larger than before, inside the frame with room for their rings, centred top to bottom.
  const expectedCount = kind === 'group' ? GROUP_SIZE : kind === 'pair' ? 2 : 1;
  expect(orbs, `${label}: orb count`).toHaveLength(expectedCount);
  const before = kind === 'group' ? BEFORE_LANE_14.groupOrb : kind === 'pair' ? BEFORE_LANE_14.pairOrb : BEFORE_LANE_14.singleOrb;
  const ring = 28 * (orbs[0].width / (kind === 'group' ? GROUP_LAYOUT : before));
  for (const orb of orbs) {
    if (kind === 'group') {
      // The drawn diameter is exactly the approved group size in TV units, which is
      // that many real pixels at 1920 and double at 3840.
      expect(orb.width, `${label}: orb drawn diameter`).toBeCloseTo(GROUP_DRAWN, 0);
      expect(orb.width * zoom, `${label}: orb drawn diameter in screen px`).toBeCloseTo(GROUP_DRAWN * zoom, 0);
      expect(orb.scale, `${label}: orb drawn over layout`).toBeCloseTo(GROUP_DRAWN / GROUP_LAYOUT, 2);
    } else {
      expect(orb.width, `${label}: orb drawn diameter`).toBeGreaterThanOrEqual(before * 1.15);
      expect(orb.scale, `${label}: orb words are scaled up with the orb`).toBeGreaterThanOrEqual(1.15);
    }
    expect(Math.abs(orb.width - orb.height), `${label}: orb is round`).toBeLessThan(1);
    expect(orb.left - ring, `${label}: orb and ring inside the frame, left`).toBeGreaterThanOrEqual(stage.left);
    expect(orb.right + ring, `${label}: orb and ring inside the frame, right`).toBeLessThanOrEqual(stage.right);
    expect(orb.top - ring, `${label}: orb and ring inside the frame, top`).toBeGreaterThanOrEqual(stage.top);
    expect(orb.bottom + ring, `${label}: orb and ring inside the frame, bottom`).toBeLessThanOrEqual(stage.bottom);
    // Every word on the orb: never below 18 px drawn at 1920 (36 at 3840).
    expect(orb.messagePx, `${label}: message drawn px`).toBeGreaterThanOrEqual(TEXT_FLOOR_PX * zoom);
    expect(orb.recipientPx, `${label}: recipient drawn px`).toBeGreaterThanOrEqual(23 * zoom);
    expect(orb.contentFits, `${label}: orb words fit the circle`).toBe(true);
  }
  // No bubble may touch another bubble, judged on the drawn circles.
  for (let i = 0; i < orbs.length; i++) {
    for (let j = i + 1; j < orbs.length; j++) {
      const a = orbs[i];
      const b = orbs[j];
      const gap = Math.hypot(
        (a.left + a.right) / 2 - (b.left + b.right) / 2,
        (a.top + a.bottom) / 2 - (b.top + b.bottom) / 2,
      ) - (a.width + b.width) / 2;
      expect(gap, `${label}: bubble ${i} clear of bubble ${j}`).toBeGreaterThan(0);
    }
  }
  const orbTop = Math.min(...orbs.map((orb) => orb.top));
  const orbBottom = Math.max(...orbs.map((orb) => orb.bottom));
  // A single or pair centres on the screen; a group centres on its own centre.
  const middleY = kind === 'group' ? stage.top + GROUP_CENTRE_Y : 540;
  expect(Math.abs((orbTop + orbBottom) / 2 - middleY), `${label}: orbs centred top to bottom`).toBeLessThanOrEqual(12);
  expect(orbBottom - orbTop, `${label}: orbs span most of the screen height`).toBeGreaterThanOrEqual(680);
  if (kind === 'group') {
    // Five bubbles stay a composed arrangement across the stage, not a thin strip:
    // a 3 over 2 stagger, centred on the group centre, spread across the frame.
    const orbLeft = Math.min(...orbs.map((orb) => orb.left));
    const orbRight = Math.max(...orbs.map((orb) => orb.right));
    expect(orbRight - orbLeft, `${label}: bubbles spread across the frame`).toBeGreaterThanOrEqual(1100);
    expect(Math.abs((orbLeft + orbRight) / 2 - 960), `${label}: bubbles centred left to right`).toBeLessThanOrEqual(12);
    // The reading sway moves each bubble a few px, so rows are judged by band.
    const centreY = (orb: TvRect) => (orb.top + orb.bottom) / 2;
    const topRow = orbs.filter((orb) => centreY(orb) < 540);
    const bottomRow = orbs.filter((orb) => centreY(orb) >= 540);
    expect(topRow, `${label}: three bubbles on the upper row`).toHaveLength(3);
    expect(bottomRow, `${label}: two bubbles on the lower row`).toHaveLength(2);
    for (const row of [topRow, bottomRow]) {
      const spread = Math.max(...row.map(centreY)) - Math.min(...row.map(centreY));
      expect(spread, `${label}: a row sits level`).toBeLessThanOrEqual(12);
    }
    // The lower two sit under the gaps of the upper three, not under a bubble.
    const topCentres = topRow.map((orb) => (orb.left + orb.right) / 2).sort((a, b) => a - b);
    for (const orb of bottomRow) {
      const x = (orb.left + orb.right) / 2;
      for (const topX of topCentres) {
        expect(Math.abs(x - topX), `${label}: lower bubble staggered against the upper row`).toBeGreaterThan(80);
      }
    }
  }

  // Words: never below today's sizes, inside the frame, and the whole composition reaches
  // from near the top margin to near the bottom margin.
  expect(words.length, `${label}: headline and caption words`).toBeGreaterThanOrEqual(2);
  for (const word of words) {
    expect(word.fontPx, `${label}: ${word.selector} drawn px`).toBeGreaterThanOrEqual(BEFORE_LANE_14.words[word.selector] * zoom);
    expect(word.left, `${label}: ${word.selector} left`).toBeGreaterThanOrEqual(stage.left);
    expect(word.right, `${label}: ${word.selector} right`).toBeLessThanOrEqual(stage.right);
    expect(word.top, `${label}: ${word.selector} top`).toBeGreaterThanOrEqual(stage.top);
    expect(word.bottom, `${label}: ${word.selector} bottom`).toBeLessThanOrEqual(stage.bottom);
    for (const orb of orbs) {
      expect(circleRectGap(orb, word, 0), `${label}: ${word.selector} clear of an orb`).toBeGreaterThan(0);
    }
  }
  const allTop = Math.min(orbTop, ...words.map((word) => word.top));
  const allBottom = Math.max(orbBottom, ...words.map((word) => word.bottom));
  expect(allTop, `${label}: composition starts near the top margin`).toBeLessThanOrEqual(SCREEN_MARGIN + 60);
  expect(allBottom, `${label}: composition ends near the bottom margin`).toBeGreaterThanOrEqual(1080 - SCREEN_MARGIN - 60);
  expect(Math.abs((allTop + allBottom) / 2 - 540), `${label}: composition centred top to bottom`).toBeLessThanOrEqual(12);
  if (kind === 'single') {
    const title = words.find((word) => word.selector === '.event-title h2')!;
    const block = words.filter((word) => word.selector.startsWith('.event-title'));
    const blockTop = Math.min(...block.map((word) => word.top));
    const blockBottom = Math.max(...block.map((word) => word.bottom));
    expect(title).toBeTruthy();
    expect(Math.abs((blockTop + blockBottom) / 2 - 540), `${label}: headline centred top to bottom`).toBeLessThanOrEqual(12);
  }

  // The waiting pill: on screen, in a corner of the frame, readable, clear of every orb and ring.
  expect(pill, `${label}: waiting pill`).not.toBeNull();
  expect(pill!.hidden).toBe(false);
  expect(pill!.fontPx, `${label}: waiting pill drawn px`).toBeGreaterThanOrEqual(14 * zoom);
  expect(pill!.top).toBeGreaterThanOrEqual(stage.top);
  expect(pill!.right).toBeLessThanOrEqual(stage.right);
  expect(pill!.left).toBeGreaterThanOrEqual(stage.left);
  expect(pill!.bottom, `${label}: waiting pill sits in the top corner`).toBeLessThanOrEqual(stage.top + 80);
  expect(pill!.left, `${label}: waiting pill sits in the right corner`).toBeGreaterThanOrEqual(960);
  for (const orb of orbs) {
    expect(circleRectGap(orb, pill!, ring), `${label}: waiting pill clear of an orb`).toBeGreaterThan(0);
  }
  for (const word of words) {
    const overlap = word.left < pill!.right && word.right > pill!.left && word.top < pill!.bottom && word.bottom > pill!.top;
    expect(overlap, `${label}: waiting pill clear of ${word.selector}`).toBe(false);
  }
}

for (const width of [1920, 3840]) {
test(`the entrance composition fills the whole screen for every wave and every frame style at ${width}`, async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width, height: (width / 1920) * 1080 });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await page.waitForTimeout(300);

  const framesSeen: Record<string, Set<number>> = { single: new Set(), group: new Set() };
  let seq = 1;
  for (let wave = 0; wave < 11; wave++) {
    seq++;
    const frameIndex = wave % 4;
    await frame.evaluate((index) => {
      (0, eval)(`ARRIVAL_FRAME_BAG=[${index}]`);
    }, frameIndex);
    await pushArrivalWave(page, frame, snapshot, wave, seq, { idPrefix: `fill-${width}-${wave}` });
    await stepToReading(frame);
    // The reading sway is on: measure a moment into the hold, not only its first frame.
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1700));
    const info = await frame.evaluate(() => ({
      kind: (window as any).colorPolishRuntime.getState().active?.kind as 'single' | 'group',
      frame: Number(document.getElementById('event')!.dataset.frame),
    }));
    expect(info.kind).toBe(wave < 6 ? 'single' : 'group');
    expect(info.frame).toBe(frameIndex);
    framesSeen[info.kind].add(info.frame);

    const geometry = await arrivalGeometry(frame);
    expect(geometry.zoom).toBeCloseTo(width / 1920, 2);
    expectFullScreenComposition(geometry, info.kind, `w${width} wave ${wave} ${info.kind} frame ${frameIndex}`);
    await stepToDrained(frame);
  }
  expect([...framesSeen.single].sort()).toEqual([0, 1, 2, 3]);
  expect([...framesSeen.group].sort()).toEqual([0, 1, 2, 3]);
});

test(`a 500 grapheme message fits whole on the full screen single orb and pages verbatim in the group of five at ${width}`, async ({ page }) => {
  test.setTimeout(300_000);
  const zoom = width / 1920;
  await page.setViewportSize({ width, height: zoom * 1080 });
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  await page.waitForTimeout(300);
  expect(graphemeCount(MOSTLY_LONG_MESSAGE_500)).toBe(500);
  const outputFolder =
    process.env.L14_CAPTURE_DIR ??
    resolve(process.cwd(), 'docs/runs/2026-09-18-tv-fit/logs/captures/L14/after');
  await mkdir(outputFolder, { recursive: true });

  const pagesFor = async (prefix: string) =>
    await frame.evaluate((idPrefix: string) => {
      const logs = (window as any).colorPolishRuntime.getState().log || [];
      return logs.filter((l: any) => l.type === 'circular_pagination' && String(l.id).startsWith(idPrefix));
    }, prefix);

  // Single.
  await pushArrivalWave(page, frame, snapshot, 0, 2, { idPrefix: `long-single-${width}`, message: MOSTLY_LONG_MESSAGE_500 });
  await stepToReading(frame);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1700));
  const single = await arrivalGeometry(frame);
  expectFullScreenComposition(single, 'single', `w${width} 500 grapheme single`);
  await page.screenshot({ path: resolve(outputFolder, `w${width}-single-long-500.png`) });
  for (const entry of await pagesFor(`long-single-${width}`)) expect(entry.verbatim).toBe(true);
  const singleText = await frame.evaluate(() => document.querySelector('#event .event-orb .message')!.textContent || '');
  expect(singleText.length).toBeGreaterThan(0);
  expect(MOSTLY_LONG_MESSAGE_500.includes(singleText.trim())).toBe(true);
  await stepToDrained(frame);

  // Group of five long messages: all five together, each paging its own
  // message inside its own bubble, word for word.
  await pushArrivalWave(page, frame, snapshot, 6, 3, { idPrefix: `long-group-${width}`, message: MOSTLY_LONG_MESSAGE_500 });
  await stepToReading(frame);
  await frame.evaluate(() => (window as any).colorPolishRuntime.step(1700));
  const group = await arrivalGeometry(frame);
  expectFullScreenComposition(group, 'group', `w${width} 500 grapheme group of five`);
  await page.screenshot({ path: resolve(outputFolder, `w${width}-group-five-long-500.png`) });
  const groupLogs = await pagesFor(`long-group-${width}`);
  expect(groupLogs.length, 'the long messages page inside their bubbles').toBeGreaterThan(0);
  for (const entry of groupLogs) expect(entry.verbatim).toBe(true);
  const groupTexts = await frame.evaluate(() => [...document.querySelectorAll('#event .event-orb .message')].map((m) => (m.textContent || '').trim()));
  expect(groupTexts).toHaveLength(GROUP_SIZE);
  for (const text of groupTexts) expect(text.length > 0 && MOSTLY_LONG_MESSAGE_500.includes(text)).toBe(true);
  // Long reading: drain with large steps, then confirm it cleared.
  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    for (let i = 0; i < 80; i++) {
      const state = runtime.getState();
      if (state.active === null && state.queueLength === 0) return;
      runtime.step(8000);
    }
  });
  await stepToDrained(frame);
});
}

test('the exit flight still lands on the feed rail from the full screen frame', async ({ page }) => {
  test.setTimeout(120_000);
  const snapshot = buildActiveDisplayFixture() as ArrivalSnapshot;
  const frame = await loadRenderer(page);
  const rail = await frame.evaluate(() => {
    const tv = document.getElementById('tv')!.getBoundingClientRect();
    const feed = document.getElementById('feed-columns')!;
    const r = (feed.firstElementChild || feed).getBoundingClientRect();
    return { x: r.left + r.width / 2 - tv.left, y: r.top + r.height / 2 - tv.top, zoom: tv.width / 1920 };
  });
  await pushArrivalWave(page, frame, snapshot, 0, 2, { idPrefix: 'exit-landing' });
  await stepToReading(frame);
  // Step to the last moment of the exit and read where the orb is heading.
  const landing = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    for (let i = 0; i < 400; i++) {
      if (runtime.getState().active?.phase === 'exit') break;
      runtime.step(100);
    }
    let last: { x: number; y: number; size: number; opacity: number; ringOverflow: number; samples: number } | null = null;
    let ringOverflow = 0;
    let samples = 0;
    for (let i = 0; i < 60; i++) {
      const orb = document.querySelector<HTMLElement>('#event .event-orb');
      const ring = document.querySelector<HTMLElement>('#event .arrival-ring');
      if (!orb || !ring || runtime.getState().active?.phase !== 'exit') break;
      const tv = document.getElementById('tv')!.getBoundingClientRect();
      const r = orb.getBoundingClientRect();
      const g = ring.getBoundingClientRect();
      // How far the ring's own box reaches past any TV edge while it flies (0 means never).
      ringOverflow = Math.max(ringOverflow, tv.left - g.left, tv.top - g.top, g.right - tv.right, g.bottom - tv.bottom);
      samples++;
      last = { x: r.left + r.width / 2 - tv.left, y: r.top + r.height / 2 - tv.top, size: r.width, opacity: parseFloat(orb.style.opacity), ringOverflow, samples };
      runtime.step(25);
    }
    return last;
  });
  expect(landing).not.toBeNull();
  expect(landing!.opacity).toBeLessThan(0.05);
  expect(landing!.samples).toBeGreaterThan(20);
  expect(landing!.ringOverflow, 'the ring never reaches past a screen edge during the exit flight').toBeLessThanOrEqual(0);
  expect(Math.abs(landing!.x / rail.zoom - rail.x / rail.zoom)).toBeLessThanOrEqual(24);
  expect(Math.abs(landing!.y / rail.zoom - rail.y / rail.zoom)).toBeLessThanOrEqual(24);
  // The rail sits in the bottom band of the TV, below the old recognition box.
  expect(rail.y / rail.zoom).toBeGreaterThan(787);
  expect(landing!.size / rail.zoom).toBeLessThanOrEqual(80);
  await stepToDrained(frame);
});
