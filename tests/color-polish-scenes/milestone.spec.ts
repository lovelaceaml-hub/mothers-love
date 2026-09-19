import { expect, test } from '@playwright/test';
import {
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';
import { buildColorPolishSampleSnapshot } from '../../src/components/display/color-polish/sample';
import { buildMostlyLongFixture, textFits } from './text-fits';

test('milestone renders circular bubbles, studio preview, and does not overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 14000);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);

  const streamPearls = await frame.evaluate(() => {
    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    const elements = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-pearl') || []);
    return elements.map((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        offsetWidth: el.offsetWidth,
      };
    });
  });

  expect(streamPearls.length).toBeGreaterThanOrEqual(14);
  for (const pearl of streamPearls) {
    expect(Math.abs(pearl.width - pearl.height)).toBeLessThanOrEqual(1);
    const isPercent = pearl.borderRadius.includes('50%');
    const numericRadius = parseFloat(pearl.borderRadius);
    const halfWidth = pearl.offsetWidth / 2;
    const isHalfWidth =
      !isNaN(numericRadius) &&
      (Math.abs(numericRadius - halfWidth) <= 1 || Math.abs(numericRadius - pearl.width / 2) <= 1);
    expect(isPercent || isHalfWidth).toBe(true);
  }

  const circleResult = await circularity(frame);
  expect(circleResult.failures).toHaveLength(0);
});

test('the goal expression heading or phrase is the largest computed font size, strictly larger than threshold', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 1000);

  const fontSizes = await frame.evaluate(() => {
    const goalH3 = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"] .progress-goal h3');
    const goalPhrase = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"] .progress-goal .goal-phrase');
    const threshold = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"] .progress-milestone .threshold');
    const allElements = Array.from(document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="11"] *'));

    const getFontSize = (el: HTMLElement | null) => {
      if (!el) return 0;
      return parseFloat(window.getComputedStyle(el).fontSize) || 0;
    };

    const maxAny = Math.max(
      ...allElements.map((el) => parseFloat(window.getComputedStyle(el).fontSize) || 0),
    );

    return {
      h3Size: getFontSize(goalH3),
      phraseSize: getFontSize(goalPhrase),
      thresholdSize: getFontSize(threshold),
      maxSceneFontSize: maxAny,
    };
  });

  expect(fontSizes.h3Size).toBeGreaterThan(0);
  expect(fontSizes.phraseSize).toBeGreaterThan(0);
  expect(fontSizes.thresholdSize).toBeGreaterThan(0);

  expect(Math.max(fontSizes.h3Size, fontSizes.phraseSize)).toBeGreaterThan(fontSizes.thresholdSize);
  expect(Math.max(fontSizes.h3Size, fontSizes.phraseSize)).toBeGreaterThanOrEqual(fontSizes.maxSceneFontSize);
});

function buildMilestoneSnapshot(goalExpressionId = 2) {
  const snapshot = buildColorPolishSampleSnapshot();
  const currentWeekStart = '2026-09-06';
  const currentWeekEnd = '2026-09-12';

  snapshot.insights.goal = {
    weekStart: currentWeekStart,
    weekEnd: currentWeekEnd,
    expressionId: goalExpressionId,
    value: 7,
    target: 17,
    achieved: false,
  };
  snapshot.insights.currentWeek.periodStart = currentWeekStart;
  snapshot.insights.currentWeek.periodEnd = currentWeekEnd;

  const outsideWeekCreated = '2026-09-04T12:00:00.000Z';
  const outsideWeekExpires = '2026-09-11T12:00:00.000Z';
  const insideWeekCreated = '2026-09-09T12:00:00.000Z';
  const insideWeekExpires = '2026-09-16T12:00:00.000Z';

  const nonGoalExpr = goalExpressionId === 2 ? 8 : 2;

  for (let i = 0; i < snapshot.recognitions.length; i++) {
    if (i < 6) {
      // Created outside current week (2026-09-04), within 168h display pool.
      // Even if they include the goal expression, weekKey !== S.week, so data-weekly must be "false".
      snapshot.recognitions[i] = {
        ...snapshot.recognitions[i],
        createdAt: outsideWeekCreated,
        firstPublishedAt: outsideWeekCreated,
        expiresAt: outsideWeekExpires,
        expressionIds: i % 2 === 0 ? [goalExpressionId, nonGoalExpr] : [nonGoalExpr],
      };
    } else if (i < 18) {
      // Created inside current week WITH goal expression: data-weekly must be "true".
      snapshot.recognitions[i] = {
        ...snapshot.recognitions[i],
        createdAt: insideWeekCreated,
        firstPublishedAt: insideWeekCreated,
        expiresAt: insideWeekExpires,
        expressionIds: [goalExpressionId, nonGoalExpr],
      };
    } else {
      // Created inside current week WITHOUT goal expression: data-weekly must be "false".
      snapshot.recognitions[i] = {
        ...snapshot.recognitions[i],
        createdAt: insideWeekCreated,
        firstPublishedAt: insideWeekCreated,
        expiresAt: insideWeekExpires,
        expressionIds: [nonGoalExpr],
      };
    }
  }
  return snapshot;
}

test('every pearl shows catalog phrase and name without THANK YOU, using goal expression or first expression', async ({ page }) => {
  const snapshot = buildMilestoneSnapshot(1);
  const frame = await loadRenderer(page, { scene: 11, fixture: snapshot as unknown as Record<string, unknown> });

  const pearlData = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const catalogList = runtime.catalog as Array<{ id: number; phrase: string }>;
    const catalogPhrases = new Set(catalogList.map((c) => c.phrase));

    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    const nodes = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-node') || []);

    return nodes.map((node) => {
      const pearl = node.querySelector<HTMLElement>('.stream-pearl');
      const phraseEl = node.querySelector<HTMLElement>('.stream-phrase');
      const nameEl = node.querySelector<HTMLElement>('b');
      const phraseText = phraseEl?.textContent?.trim() || '';
      const nameText = nameEl?.textContent?.trim() || '';
      const fullPearlText = pearl?.textContent || '';
      const tributeId = node.dataset.tributeId || '';
      const isWeekly = node.dataset.weekly === 'true';

      return {
        tributeId,
        phraseText,
        nameText,
        fullPearlText,
        isWeekly,
        isCatalogPhrase: catalogPhrases.has(phraseText),
      };
    });
  });

  expect(pearlData.length).toBeGreaterThanOrEqual(14);

  for (const pearl of pearlData) {
    expect(pearl.fullPearlText).not.toContain('THANK YOU');
    expect(pearl.isCatalogPhrase).toBe(true);
    expect(pearl.nameText.length).toBeGreaterThan(0);
  }

  const fixtureRecords = snapshot.recognitions.map((r) => ({
    id: r.id,
    ids: [...r.expressionIds],
  }));

  const verification = await frame.evaluate(({ records, goalId }) => {
    const runtime = (window as any).colorPolishRuntime;
    const catalogList = runtime.catalog as Array<{ id: number; phrase: string }>;
    const catalogMap = new Map(catalogList.map((c) => [c.id, c.phrase]));
    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    const nodes = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-node') || []);

    const results: boolean[] = [];
    for (const node of nodes) {
      const tid = node.dataset.tributeId;
      const phraseText = node.querySelector('.stream-phrase')?.textContent?.trim();
      const rec = records.find((r: { id: string }) => r.id === tid);
      if (!rec || !phraseText) continue;
      const expectedId = rec.ids.includes(goalId) ? goalId : rec.ids[0];
      const expectedPhrase = catalogMap.get(expectedId);
      results.push(phraseText === expectedPhrase);
    }
    return results;
  }, { records: fixtureRecords, goalId: 1 });

  expect(verification.length).toBeGreaterThan(0);
  expect(verification.every(Boolean)).toBe(true);
});

test('with 48-record sample at least 12 distinct record ids pass through in 30 s including outside current week', async ({ page }) => {
  const snapshot = buildMilestoneSnapshot();
  const currentWeekStartMs = Date.parse('2026-09-06T07:00:00.000Z');
  const frame = await loadRenderer(page, { scene: 11, fixture: snapshot as unknown as Record<string, unknown> });

  const seenRecordIds = new Set<string>();

  for (let s = 0; s <= 30; s += 5) {
    if (s > 0) {
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
      }, 5000);
    }

    const currentIds = await frame.evaluate(() => {
      const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
      const nodes = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-node') || []);
      return nodes.map((node) => node.dataset.tributeId).filter(Boolean) as string[];
    });

    for (const id of currentIds) {
      seenRecordIds.add(id);
    }
  }

  expect(seenRecordIds.size).toBeGreaterThanOrEqual(12);

  const fixtureMap = new Map(snapshot.recognitions.map((r) => [r.id, Date.parse(r.createdAt)]));
  const hasOutsideWeek = Array.from(seenRecordIds).some((id) => {
    const createdAtMs = fixtureMap.get(id);
    return createdAtMs !== undefined && createdAtMs < currentWeekStartMs;
  });

  expect(hasOutsideWeek).toBe(true);
});

test('milestone contributors are present in the stream at 0 s and markShown is called for all pearls', async ({ page }) => {
  const snapshot = buildMilestoneSnapshot();
  const contribIds = ['fixture-0', 'fixture-1', 'fixture-2'];

  const frame = await loadRenderer(page, { fixture: snapshot as unknown as Record<string, unknown> });

  const testResult = await frame.evaluate((contributors) => {
    const runtime = (window as any).colorPolishRuntime;
    if (typeof (window as any).milestoneSetContributors === 'function') {
      (window as any).milestoneSetContributors(contributors);
    }
    runtime.setScene(11);

    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    const nodes = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-node') || []);
    const initialTributeIds = nodes.map((n) => n.dataset.tributeId);

    const hasAllContributors = contributors.every((id) => initialTributeIds.includes(id));
    const firstThreeMatch = contributors.every((id, idx) => initialTributeIds[idx] === id);

    const getCount = (window as any).milestoneGetShownCount;
    const shownCountsValid = initialTributeIds.every((id) => typeof getCount === 'function' && getCount(id) >= 1);

    return {
      hasAllContributors,
      firstThreeMatch,
      shownCountsValid,
      nodeCount: nodes.length,
    };
  }, contribIds);

  expect(testResult.nodeCount).toBeGreaterThanOrEqual(14);
  expect(testResult.hasAllContributors).toBe(true);
  expect(testResult.firstThreeMatch).toBe(true);
  expect(testResult.shownCountsValid).toBe(true);
});

test('records including goal expression carry data-weekly="true" and gold rim', async ({ page }) => {
  const goalId = 2;
  const snapshot = buildMilestoneSnapshot(goalId);
  const currentWeekStartMs = Date.parse('2026-09-06T07:00:00.000Z');
  const currentWeekEndMs = Date.parse('2026-09-13T07:00:00.000Z');

  const frame = await loadRenderer(page, { scene: 11, fixture: snapshot as unknown as Record<string, unknown> });

  const recordMap = snapshot.recognitions.map((r) => {
    const createdMs = Date.parse(r.createdAt);
    const inCurrentWeek = createdMs >= currentWeekStartMs && createdMs < currentWeekEndMs;
    const hasGoal = r.expressionIds.includes(goalId);
    return {
      id: r.id,
      isWeeklyGoal: inCurrentWeek && hasGoal,
    };
  });

  const weeklyNodes = await frame.evaluate(({ records }) => {
    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    const nodes = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-node') || []);

    const results: Array<{
      id: string;
      isWeeklyGoal: boolean;
      dataWeekly: string | undefined;
    }> = [];

    for (const node of nodes) {
      const tid = node.dataset.tributeId;
      const rec = records.find((r: { id: string }) => r.id === tid);
      if (rec) {
        results.push({
          id: rec.id,
          isWeeklyGoal: rec.isWeeklyGoal,
          dataWeekly: node.dataset.weekly,
        });
      }
    }
    return results;
  }, { records: recordMap });

  expect(weeklyNodes.length).toBeGreaterThan(0);

  const goalNodes = weeklyNodes.filter((n) => n.isWeeklyGoal);
  const nonGoalNodes = weeklyNodes.filter((n) => !n.isWeeklyGoal);

  expect(goalNodes.length).toBeGreaterThan(0);
  for (const node of goalNodes) {
    expect(node.dataWeekly).toBe('true');
  }

  expect(nonGoalNodes.length).toBeGreaterThan(0);
  for (const node of nonGoalNodes) {
    expect(node.dataWeekly).toBe('false');
  }
});

test('the stream is dense, continuous and individual', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 1000);
  // From here only the explicit step() calls advance the swirl. Without
  // this the renderer's own animation frames keep running between
  // checkpoints, so a pearl travels by however long the round trip took and
  // "moved down" below stops meaning "recycled at the top". Only the
  // renderer frame is stubbed; the Studio page around it still animates.
  await frame.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });

  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  const samples: Array<
    Array<{
      id: string;
      x: number;
      y: number;
      z: number;
      scale: number;
      rise: number;
      radius: number;
      turn: number;
    }>
  > = [];

  for (let i = 0; i < checkpoints.length; i++) {
    if (i > 0) {
      const dtMs = checkpoints[i] - checkpoints[i - 1];
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
      }, dtMs);
    }

    const stream = await frame.evaluate(() => {
      return (window as any).colorPolishRuntime.visualState().stream as Array<{
        id: string;
        x: number;
        y: number;
        z: number;
        scale: number;
        rise: number;
        radius: number;
        turn: number;
      }>;
    });

    expect(stream.length).toBeGreaterThanOrEqual(14);

    const triples = new Set<string>();
    for (const node of stream) {
      const key = `${node.rise},${node.radius},${node.turn}`;
      expect(triples.has(key)).toBe(false);
      triples.add(key);
    }

    samples.push(stream);
  }

  for (let i = 1; i < samples.length; i++) {
    const prevSample = samples[i - 1];
    const currSample = samples[i];
    for (const currNode of currSample) {
      // Pearls are matched by the motion triple asserted unique just above,
      // not by record id: when the pool is smaller than the swirl a record
      // holds more than one pearl, so its id no longer names one pearl.
      const key = (n: { rise: number; radius: number; turn: number }) => `${n.rise},${n.radius},${n.turn}`;
      const prevNode = prevSample.find((n) => key(n) === key(currNode));
      if (!prevNode) continue;
      const movedDown = currNode.y - prevNode.y;
      if (movedDown > 40) {
        expect(prevNode.y).toBeLessThan(350);
        expect(currNode.y).toBeGreaterThan(400);
      }
    }
  }
});

test('extreme depth', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'milestone', 1000);
  // Same reason as the test above: the checkpoints below must measure the
  // time this test steps, not the time the machine took to answer.
  await frame.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });

  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  let smallestMinZ = Infinity;
  let largestMaxZ = -Infinity;
  let largestMaxScale = -Infinity;

  for (let i = 0; i < checkpoints.length; i++) {
    if (i > 0) {
      const dtMs = checkpoints[i] - checkpoints[i - 1];
      await frame.evaluate((stepMs) => {
        (window as any).colorPolishRuntime.step(stepMs);
      }, dtMs);
    }

    const sample = await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const stream = runtime.visualState().stream as Array<{
        id: string;
        x: number;
        y: number;
        z: number;
        scale: number;
        rise: number;
        radius: number;
        turn: number;
      }>;
      const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
      const nodeElements = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-node') || []);
      const blurs = nodeElements.map((el) => {
        const filter = window.getComputedStyle(el).filter;
        if (!filter || filter === 'none') return 0;
        const match = filter.match(/blur\(([^)]+)\)/);
        return match ? parseFloat(match[1]) : 0;
      });
      return { stream, blurs };
    });

    const { stream, blurs } = sample;
    expect(stream.length).toBeGreaterThanOrEqual(14);

    const minZ = Math.min(...stream.map((n) => n.z));
    const maxZ = Math.max(...stream.map((n) => n.z));
    smallestMinZ = Math.min(smallestMinZ, minZ);
    largestMaxZ = Math.max(largestMaxZ, maxZ);
    expect(minZ).toBeLessThanOrEqual(-500);
    expect(maxZ).toBeGreaterThanOrEqual(200);

    const hasBlurAtLeastOneAndHalf = blurs.some((b) => b >= 1.5);
    const hasBlurZeroOrNone = blurs.some((b) => b <= 0.05);
    expect(hasBlurAtLeastOneAndHalf).toBe(true);
    expect(hasBlurZeroOrNone).toBe(true);

    const maxScale = Math.max(...stream.map((n) => n.scale));
    largestMaxScale = Math.max(largestMaxScale, maxScale);
    expect(maxScale).toBeGreaterThanOrEqual(1.2);
  }

  expect(smallestMinZ).toBeLessThanOrEqual(-600);
  expect(largestMaxZ).toBeGreaterThanOrEqual(300);
  expect(largestMaxScale).toBeGreaterThanOrEqual(1.4);
});

test('reduced motion renders the milestone still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'milestone');
  expect(still).toBe(true);

  const stream = await frame.evaluate(() => {
    return (window as any).colorPolishRuntime.visualState().stream as Array<unknown>;
  });
  expect(stream.length).toBeGreaterThanOrEqual(14);
});

test('left copy is removed and rail is widened without overflow at 2000 ms', async ({ page }) => {
  const snapshot = buildMilestoneSnapshot(2);
  const frame = await loadRenderer(page, { scene: 11, fixture: snapshot as unknown as Record<string, unknown>, ms: 2000 });

  const introExists = await frame.evaluate(() => {
    return document.querySelector('.progress-intro') !== null;
  });
  expect(introExists).toBe(false);

  const phraseText = await frame.evaluate(() => {
    return document.querySelector('.progress-goal .goal-phrase')?.textContent?.trim();
  });
  expect(phraseText).toBe("Thank you. It's all thanks to you. You've worked hard.");

  const rail = await frame.evaluate(() => {
    const railEl = document.querySelector<HTMLElement>('.progress-rail');
    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    if (!railEl || !sceneEl) return null;
    const railRect = railEl.getBoundingClientRect();
    const sceneRect = sceneEl.getBoundingClientRect();
    const scale = sceneRect.width / 1812;
    return {
      scrollHeight: railEl.scrollHeight,
      clientHeight: railEl.clientHeight,
      scrollWidth: railEl.scrollWidth,
      clientWidth: railEl.clientWidth,
      leftWithinScene: railRect.left - sceneRect.left,
      width: railRect.width,
      scale,
      outsideCount: (() => {
        const rr = railEl.getBoundingClientRect();
        let n = 0;
        railEl.querySelectorAll('*').forEach((el) => {
          const b = (el as HTMLElement).getBoundingClientRect();
          if (b.bottom - rr.bottom > 0.5 || b.right - rr.right > 0.5) n += 1;
        });
        return n;
      })(),
    };
  });

  expect(rail).not.toBeNull();
  if (rail) {
    const scale = rail.scale;
    // The invariant that matters, asserted directly below by measuring every
    // descendant: nothing is drawn outside the rail. scrollHeight carries a
    // small documented tolerance because the rail reports about 9 px of
    // scrollable overflow regardless of its content: with the type at its
    // smaller sizes its two children occupied 205 px of a 584 px rail, and at
    // the larger legible sizes they occupy 249 px, and the 9 px is identical
    // either way while no element's rect is ever outside. Treating that as a
    // space problem is what led an earlier round to shrink the section heading
    // to 14 px and the captions to 11 px on a display meant to be read from
    // across a room.
    expect(rail.scrollHeight).toBeLessThanOrEqual(rail.clientHeight + 12);
    expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth + 1);
    expect(rail.outsideCount, 'no element is drawn outside the rail').toBe(0);
    expect(rail.leftWithinScene / scale).toBeLessThan(60);
    expect(rail.width / scale).toBeGreaterThanOrEqual(540);
  }
});

test('noOverflow holds and no phrase is truncated at any pearl size', async ({ page }) => {
  const frame = await loadRenderer(page, { scene: 11, fixture: buildMilestoneSnapshot() as unknown as Record<string, unknown> });

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const pearlFits = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const catalogList = runtime.catalog as Array<{ id: number; phrase: string }>;
    const catalogPhrases = new Map(catalogList.map((c) => [c.phrase, c.phrase]));

    const sceneEl = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]');
    const pearls = Array.from(sceneEl?.querySelectorAll<HTMLElement>('.stream-pearl') || []);
    return pearls.map((pearl) => {
      const phraseEl = pearl.querySelector<HTMLElement>('.stream-phrase');
      const text = phraseEl?.textContent?.trim() || '';
      const fullCatalogPhrase = catalogPhrases.get(text);

      const style = window.getComputedStyle(phraseEl || pearl);
      const fontSize = parseFloat(style.fontSize) || 0;

      return {
        pearlScrollW: pearl.scrollWidth,
        pearlClientW: pearl.clientWidth,
        pearlScrollH: pearl.scrollHeight,
        pearlClientH: pearl.clientHeight,
        hasEllipsis: text.includes('...') || text.includes('…'),
        matchesFullPhrase: fullCatalogPhrase === text,
        fontSize,
      };
    });
  });

  expect(pearlFits.length).toBeGreaterThanOrEqual(14);
  for (const fit of pearlFits) {
    expect(fit.fontSize).toBeGreaterThanOrEqual(18);
    expect(fit.hasEllipsis).toBe(false);
    expect(fit.matchesFullPhrase).toBe(true);
    expect(fit.pearlScrollW).toBeLessThanOrEqual(fit.pearlClientW + 1);
    expect(fit.pearlScrollH).toBeLessThanOrEqual(fit.pearlClientH + 1);
  }
});

test('mostly-long fixture: the goal card, milestone card and tribute pearl text all fit their panels and rims at 0, 6, 14 and 21 s at 1920 and 3840 wide', async ({ page }) => {
  // Plan 17 Lane 8 stepped the budget up from 120 s: the swirl now carries
  // three pearls per record instead of one, so every checkpoint measures
  // three times the text. The assertions are unchanged.
  test.setTimeout(240000);
  const fixture = buildMostlyLongFixture();
  const widths: Array<{ width: number; height: number }> = [
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ];

  for (const { width, height } of widths) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize({ width, height });
      const frame = await loadRenderer(testPage, { scene: 11, ms, fixture });
      await frame.evaluate(() => {
        (window as any).colorPolishRuntime.step(1500);
      });

      // Pearl text is checked against its pearl's rim and the stream panel;
      // the goal and milestone cards against their panel boxes.
      const failures = await textFits(frame, '#stage .scene[data-scene="11"]');
      expect(failures, `milestone text-fit failures at ${width}x${height}, ${ms} ms: ${JSON.stringify(failures)}`).toHaveLength(0);

      const overflow = await noOverflow(frame);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

      await testPage.close();
    }
  }
});

test('the goal card and milestone card sit clear of the panel top and bottom edges, balanced, with no empty middle gap, at 1920 and 3840 wide', async ({ page }) => {
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(size);
    const frame = await loadRenderer(page, { scene: 11, ms: 6000 });
    const m = await frame.evaluate(() => {
      const q = (sel: string) => document.querySelector<HTMLElement>(`#stage .scene[data-scene="11"] ${sel}`)!.getBoundingClientRect();
      const scale = document.getElementById('tv')!.getBoundingClientRect().width / 1920;
      const panel = q('.progress-sculpture'), goal = q('.progress-goal'), milestone = q('.progress-milestone');
      return {
        topGap: (goal.top - panel.top) / scale,
        bottomGap: (panel.bottom - milestone.bottom) / scale,
        middleGap: (milestone.top - goal.bottom) / scale,
      };
    });
    // Real room from the rounded top and bottom edges (the Plan 15 layout
    // left 0 px), the leftover split evenly, and the cards 40 px apart at
    // most instead of all the slack collecting between them.
    expect(m.topGap, JSON.stringify(m)).toBeGreaterThanOrEqual(40);
    expect(m.bottomGap, JSON.stringify(m)).toBeGreaterThanOrEqual(36);
    expect(Math.abs(m.topGap - m.bottomGap), JSON.stringify(m)).toBeLessThanOrEqual(12);
    expect(m.middleGap, JSON.stringify(m)).toBeGreaterThan(0);
    expect(m.middleGap, JSON.stringify(m)).toBeLessThanOrEqual(40);
  }
});

test('tribute pearls are fully opaque inside the panel and fade out only at its edges, never crossing it while visible', async ({ page }) => {
  // 240 s rather than 120: the same 100 quarter-second steps now move 52
  // pearls on the sample and 18 on the mostly-long fixture, where they
  // moved 26 and 6. The assertions are unchanged.
  test.setTimeout(240000);
  for (const fixture of [buildMostlyLongFixture(), buildColorPolishSampleSnapshot()]) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(testPage, { scene: 11, fixture: fixture as Record<string, unknown> });
    let crossings = 0;
    let translucentInside = 0;
    let samples = 0;
    const detail: string[] = [];
    // 25 s in quarter-second steps, inside the scene's 30 s dwell.
    for (let i = 0; i < 100; i++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(250));
      const r = await frame.evaluate(() => {
        const panel = document.querySelector('#stage .scene[data-scene="11"] .stream-world')!.getBoundingClientRect();
        const out = { crossings: 0, translucentInside: 0, samples: 0, detail: [] as string[] };
        document.querySelectorAll<HTMLElement>('#stage .scene[data-scene="11"] .stream-node').forEach((node) => {
          const opacity = parseFloat(getComputedStyle(node).opacity);
          const box = node.getBoundingClientRect();
          out.samples++;
          const crosses = box.top < panel.top - 0.5 || box.bottom > panel.bottom + 0.5 || box.left < panel.left - 0.5 || box.right > panel.right + 0.5;
          if (opacity > 0.1 && crosses) {
            out.crossings++;
            out.detail.push(`crossing at opacity ${opacity.toFixed(2)} box ${box.top.toFixed(0)}-${box.bottom.toFixed(0)}`);
          }
          // Clear of both edges by more than the 40 px fade band: fully opaque.
          if (box.top > panel.top + 41 && box.bottom < panel.bottom - 41 && opacity < 0.999) {
            out.translucentInside++;
            out.detail.push(`translucent inside at ${opacity.toFixed(2)}`);
          }
        });
        return out;
      });
      crossings += r.crossings;
      translucentInside += r.translucentInside;
      samples += r.samples;
      detail.push(...r.detail.slice(0, 2));
    }
    expect(samples).toBeGreaterThan(500);
    expect(crossings, detail.slice(0, 6).join('; ')).toBe(0);
    expect(translucentInside, detail.slice(0, 6).join('; ')).toBe(0);
    await testPage.close();
  }
});

/**
 * The swirl's stated minimums (Plan 17 Lane 8, Anthony: "the swirling
 * recognitions need to be fuller, with more bubbles"). The scene mounts 52
 * pearls where it mounted 26, and the numbers below are the pearls actually
 * drawn inside the panel: measured second by second over a whole 60 second
 * showing of the 48 record sample, this lane's swirl runs between 12 and 27
 * with a mean of 20.4, where the same measurement on the previous scene ran
 * between 5 and 15 with a mean of 10.4. Every assertion below therefore
 * fails on the previous scene.
 */
const MIN_MOUNTED_PEARLS = 52;
const MIN_DRAWN_PEARLS = 11;
const MIN_MEAN_DRAWN_PEARLS = 18;
/** The same numbers for a pool of only six records. */
const MIN_MOUNTED_PEARLS_SMALL_POOL = 18;
const MIN_DRAWN_PEARLS_SMALL_POOL = 5;
/** No record may hold more pearls than this at the same moment. */
const MAX_PEARLS_PER_RECORD = 3;

/** The 48 record sample with the milestone scene's dwell set to `seconds`. */
function milestoneSnapshotWithDwell(seconds: number) {
  const snapshot = buildMilestoneSnapshot() as unknown as {
    presentation: { playlist: Array<{ id: string; enabled: boolean; durationSeconds: number }> };
  };
  snapshot.presentation = {
    ...snapshot.presentation,
    playlist: snapshot.presentation.playlist.map((entry) =>
      entry.id === 'milestone' ? { ...entry, durationSeconds: seconds } : entry,
    ),
  };
  return snapshot as unknown as Record<string, unknown>;
}

type SwirlSample = {
  drawn: number;
  crossing: string[];
  maxCopies: number;
  nodes: Array<{ key: string; id: string; x: number; y: number }>;
};

/**
 * One reading of the swirl: how many pearls are drawn (effective opacity
 * above 0.1), which of those are cut by the panel's edges, the most pearls
 * any one record holds, and each drawn pearl's position keyed by its motion
 * triple, which the scene gives every pearl uniquely.
 */
async function swirlSample(frame: import('@playwright/test').Frame): Promise<SwirlSample> {
  return await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="11"]')!;
    const panel = scene.querySelector<HTMLElement>('.stream-world')!.getBoundingClientRect();
    const stream = ((window as any).colorPolishRuntime.visualState().stream || []) as Array<{
      id: string; x: number; y: number; rise: number; radius: number; turn: number;
    }>;
    const out: SwirlSample = { drawn: 0, crossing: [], maxCopies: 0, nodes: [] };
    const copies = new Map<string, number>();
    const elements = Array.from(scene.querySelectorAll<HTMLElement>('.stream-node'));
    elements.forEach((node, index) => {
      if (parseFloat(window.getComputedStyle(node).opacity) <= 0.1) return;
      const box = node.getBoundingClientRect();
      out.drawn += 1;
      const id = node.dataset.tributeId || '';
      copies.set(id, (copies.get(id) || 0) + 1);
      if (
        box.top < panel.top - 0.5 || box.bottom > panel.bottom + 0.5 ||
        box.left < panel.left - 0.5 || box.right > panel.right + 0.5
      ) {
        out.crossing.push(
          `${id} box ${box.left.toFixed(0)},${box.top.toFixed(0)},${box.right.toFixed(0)},${box.bottom.toFixed(0)} panel ${panel.left.toFixed(0)},${panel.top.toFixed(0)},${panel.right.toFixed(0)},${panel.bottom.toFixed(0)}`,
        );
      }
      const motion = stream[index];
      out.nodes.push({
        key: motion ? `${motion.rise},${motion.radius},${motion.turn}` : `element-${index}`,
        id,
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
      });
    });
    for (const n of copies.values()) out.maxCopies = Math.max(out.maxCopies, n);
    return out;
  });
}

test('the swirl is full: at least 11 pearls drawn inside the panel, none cut at its edges, for a whole 60 second showing', async ({ page }) => {
  test.setTimeout(300000);
  const requestedDwell = 60;

  // A whole 60 second showing is stepped at 1920, where the church TV runs.
  // The same swirl at 3840 is checked by the test below, which measures the
  // same counts and fits at four checkpoints instead of stepping a minute
  // twice over.
  for (const size of [{ width: 1920, height: 1080 }]) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize(size);
    const frame = await loadRenderer(testPage, { scene: 11, fixture: milestoneSnapshotWithDwell(requestedDwell) });

    // The showing's length is the scene's own dwell, read from state, never a
    // number written into this file.
    const dwell = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState().dwell[11] as number);
    expect(dwell).toBe(requestedDwell);

    const mounted = await frame.evaluate(
      () => document.querySelectorAll('#stage .scene[data-scene="11"] .stream-node').length,
    );
    expect(mounted, 'pearls mounted in the swirl').toBeGreaterThanOrEqual(MIN_MOUNTED_PEARLS);

    const samples: SwirlSample[] = [await swirlSample(frame)];
    const checkpoints = new Set([0, Math.round(dwell / 3), Math.round((dwell * 2) / 3), dwell - 1]);
    for (let second = 0; second < dwell; second++) {
      if (checkpoints.has(second)) {
        const failures = await textFits(frame, '#stage .scene[data-scene="11"]', { dwellSeconds: dwell });
        expect(
          failures,
          `milestone text-fit failures at ${size.width}x${size.height}, ${second} s: ${JSON.stringify(failures)}`,
        ).toHaveLength(0);
      }
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
      samples.push(await swirlSample(frame));
    }

    const drawnCounts = samples.map((s) => s.drawn);
    const thinnest = Math.min(...drawnCounts);
    const mean = drawnCounts.reduce((n, v) => n + v, 0) / drawnCounts.length;
    expect(
      thinnest,
      `fewest pearls drawn at once over ${dwell} s at ${size.width}: ${JSON.stringify(drawnCounts)}`,
    ).toBeGreaterThanOrEqual(MIN_DRAWN_PEARLS);
    expect(
      mean,
      `mean pearls drawn over ${dwell} s at ${size.width}: ${mean.toFixed(1)}`,
    ).toBeGreaterThanOrEqual(MIN_MEAN_DRAWN_PEARLS);

    const cut = samples.flatMap((s) => s.crossing);
    expect(cut.slice(0, 4).join(' | '), 'pearls drawn past the panel edge').toBe('');

    const mostCopies = Math.max(...samples.map((s) => s.maxCopies));
    expect(mostCopies, 'pearls holding the same record at once').toBeLessThanOrEqual(MAX_PEARLS_PER_RECORD);

    // Lively for the whole showing: between one second and the next, every
    // drawn pearl that is still drawn has moved, and records keep arriving.
    let stalled = 0;
    for (let i = 1; i < samples.length; i++) {
      const before = new Map(samples[i - 1].nodes.map((n) => [n.key, n]));
      for (const node of samples[i].nodes) {
        const previous = before.get(node.key);
        if (!previous) continue;
        if (Math.hypot(node.x - previous.x, node.y - previous.y) < 1) stalled += 1;
      }
    }
    expect(stalled, 'pearls that did not move from one second to the next').toBe(0);

    const seen = new Set(samples.flatMap((s) => s.nodes.map((n) => n.id)));
    expect(seen.size, 'records that passed through the swirl during the showing').toBeGreaterThan(MIN_DRAWN_PEARLS);

    await testPage.close();
  }
});

test('at 3840 the swirl carries the same pearls, drawn inside the panel with their words fitting, at 0, 6, 14 and 21 s', async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 3840, height: 2160 });
  const frame = await loadRenderer(page, { scene: 11, fixture: milestoneSnapshotWithDwell(60) });

  const dwell = await frame.evaluate(() => (window as any).colorPolishRuntime.visualState().dwell[11] as number);
  const mounted = await frame.evaluate(
    () => document.querySelectorAll('#stage .scene[data-scene="11"] .stream-node').length,
  );
  expect(mounted, 'pearls mounted in the swirl at 3840').toBeGreaterThanOrEqual(MIN_MOUNTED_PEARLS);

  let elapsed = 0;
  for (const ms of [0, 6000, 14000, 21000]) {
    if (ms > elapsed) {
      await frame.evaluate((step) => (window as any).colorPolishRuntime.step(step), ms - elapsed);
      elapsed = ms;
    }
    const sample = await swirlSample(frame);
    expect(sample.drawn, `pearls drawn at 3840, ${ms} ms`).toBeGreaterThanOrEqual(MIN_DRAWN_PEARLS);
    expect(sample.crossing.slice(0, 4).join(' | '), `pearls past the panel edge at ${ms} ms`).toBe('');
    expect(sample.maxCopies).toBeLessThanOrEqual(MAX_PEARLS_PER_RECORD);
    const failures = await textFits(frame, '#stage .scene[data-scene="11"]', { dwellSeconds: dwell });
    expect(failures, `milestone text-fit failures at 3840, ${ms} ms: ${JSON.stringify(failures)}`).toHaveLength(0);
  }
});

test('a pool smaller than the swirl still fills the panel, and a record never takes more pearls than the pool needs', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  // Six records, the mostly-long fixture: before this lane the scene mounted
  // one pearl per record and drew between 1 and 3 of them at a time.
  const frame = await loadRenderer(page, { scene: 11, fixture: buildMostlyLongFixture() });

  const mounted = await frame.evaluate(
    () => document.querySelectorAll('#stage .scene[data-scene="11"] .stream-node').length,
  );
  expect(mounted, 'pearls mounted from a six record pool').toBe(MIN_MOUNTED_PEARLS_SMALL_POOL);

  const samples: SwirlSample[] = [await swirlSample(frame)];
  for (let second = 0; second < 30; second++) {
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
    samples.push(await swirlSample(frame));
  }

  const drawnCounts = samples.map((s) => s.drawn);
  expect(Math.min(...drawnCounts), `pearls drawn: ${JSON.stringify(drawnCounts)}`).toBeGreaterThanOrEqual(
    MIN_DRAWN_PEARLS_SMALL_POOL,
  );
  expect(samples.flatMap((s) => s.crossing).slice(0, 4).join(' | ')).toBe('');
  expect(Math.max(...samples.map((s) => s.maxCopies))).toBeLessThanOrEqual(MAX_PEARLS_PER_RECORD);

  const failures = await textFits(frame, '#stage .scene[data-scene="11"]');
  expect(failures, JSON.stringify(failures)).toHaveLength(0);
});
