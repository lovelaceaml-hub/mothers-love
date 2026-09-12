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
      const prevNode = prevSample.find((n) => n.id === currNode.id);
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

