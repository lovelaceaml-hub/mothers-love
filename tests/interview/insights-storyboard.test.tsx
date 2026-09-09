import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EXPRESSIONS } from '@/lib/catalog';
import { MonthlyImpact, NineExpressions, SharedExpression } from '@/components/display/insights';
import {
  INSIGHT_STORY_TIMINGS,
  insightStoryPhaseAt,
  normalizeElapsedMs,
} from '@/components/display/insights/insights-data';
import type { Aggregate, Recognition } from '@/lib/contracts';

const insightsSource = readFileSync(
  new URL('../../src/components/display/insights/DisplayInsights.tsx', import.meta.url),
  'utf8',
);
const insightsStyles = readFileSync(
  new URL('../../src/components/display/insights/DisplayInsights.module.css', import.meta.url),
  'utf8',
);

function textWithoutTags(markup: string): string {
  return markup
    .replace(/<[^>]*>/g, '')
    .replace(/<!-- -->/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function recognition(id: string, expressionIds: number[]): Recognition {
  return {
    id,
    recipient: `Synthetic recipient ${id}`,
    message: `Synthetic message ${id}`,
    expressionIds,
    createdAt: '2026-09-09T12:00:00.000Z',
    firstPublishedAt: '2026-09-09T12:00:00.000Z',
    expiresAt: '2026-09-16T12:00:00.000Z',
    version: 1,
    status: 'published',
    featured: false,
  };
}

const aggregate: Aggregate = {
  periodStart: '2026-09-01T07:00:00.000Z',
  periodEnd: '2026-10-01T06:59:59.999Z',
  recognitions: 12,
  expressionCounts: [2, 3, 1, 2, 0, 1, 1, 1, 1],
  expressionTotal: 12,
  revision: 1,
};

describe('approved insight storyboards', () => {
  it('maps the parent clock to each approved reveal phase', () => {
    expect(normalizeElapsedMs(-5)).toBe(0);
    expect(normalizeElapsedMs(1820.9)).toBe(1820);

    expect(insightStoryPhaseAt('nine', 0)).toBe('opening');
    expect(insightStoryPhaseAt('nine', INSIGHT_STORY_TIMINGS.nine.cardsOpenMs)).toBe('revealing');
    expect(insightStoryPhaseAt('nine', INSIGHT_STORY_TIMINGS.nine.settledMs)).toBe('settled');

    expect(insightStoryPhaseAt('shared', 0)).toBe('opening');
    expect(insightStoryPhaseAt('shared', INSIGHT_STORY_TIMINGS.shared.weaveMs)).toBe('weaving');
    expect(insightStoryPhaseAt('shared', INSIGHT_STORY_TIMINGS.shared.revealMs)).toBe('revealing');
    expect(insightStoryPhaseAt('shared', INSIGHT_STORY_TIMINGS.shared.settledMs)).toBe('settled');

    expect(insightStoryPhaseAt('impact', 0)).toBe('opening');
    expect(insightStoryPhaseAt('impact', INSIGHT_STORY_TIMINGS.impact.ribbonsMs)).toBe('revealing');
  });

  it('renders nine radial petals and all nine readable catalog cards', () => {
    const markup = renderToStaticMarkup(<NineExpressions elapsedMs={0} motion="lively" />);

    expect(markup).toContain('data-testid="nine-radial-flower"');
    expect((markup.match(/data-story-role="radial-petal"/g) ?? []).length).toBe(EXPRESSIONS.length);
    expect((markup.match(/data-testid="flower-expression-card"/g) ?? []).length).toBe(EXPRESSIONS.length);
    const readableText = textWithoutTags(markup);
    EXPRESSIONS.forEach((item) => {
      expect(readableText).toContain(item.phrase);
      expect(readableText).toContain(item.principle);
    });
    expect(markup).toContain('data-motion="lively"');
    expect(markup).toContain('data-story-phase="opening"');
  });

  it('renders connected recognitions, one ribbon per source, and the official reveal', () => {
    const records = [recognition('first', [2, 8]), recognition('second', [2, 4])];
    const markup = renderToStaticMarkup(<SharedExpression recognitions={records} expressionId={2} elapsedMs={6200} motion="still" />);

    expect((markup.match(/data-testid="connected-recognition"/g) ?? []).length).toBe(2);
    expect((markup.match(/data-testid="heart-ribbon-strand"/g) ?? []).length).toBe(2);
    expect(markup).toContain('data-testid="ribbon-heart"');
    const readableText = textWithoutTags(markup);
    expect(readableText).toContain(EXPRESSIONS[1].phrase);
    expect(readableText).toContain(EXPRESSIONS[1].principle);
    expect(markup).toContain('data-story-phase="revealing"');
  });

  it('lights the shared total before nine color ribbons and preserves counts', () => {
    const markup = renderToStaticMarkup(<MonthlyImpact aggregate={aggregate} elapsedMs={0} motion="standard" />);

    expect(markup).toContain('data-testid="monthly-impact-total"');
    expect((markup.match(/data-testid="monthly-impact-flow-ribbon"/g) ?? []).length).toBe(EXPRESSIONS.length);
    expect((markup.match(/data-testid="monthly-impact-ribbon"/g) ?? []).length).toBe(EXPRESSIONS.length);
    expect(markup).toContain('data-story-phase="opening"');
    aggregate.expressionCounts.forEach((count) => expect(markup).toContain(`>${count}<`));
  });

  it('keeps the timelines CSS driven and lets an explicit Lively setting run', () => {
    expect(insightsSource).toContain('elapsedMs?: number');
    expect(insightsSource).toContain('data-story-phase');
    expect(insightsSource).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    expect(insightsStyles).toContain('@keyframes petalColorWave');
    expect(insightsStyles).toContain('@keyframes heartRibbonWeave');
    expect(insightsStyles).toContain('@keyframes impactFlowReveal');
    expect(insightsStyles).toContain('.screen.motionLively');
    expect(insightsStyles).toContain('.screen:not(.motionLively) .radialFlower');
  });
});
