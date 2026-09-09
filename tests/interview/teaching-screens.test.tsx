import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EXPRESSIONS } from '@/lib/catalog';
import {
  DAILY_PRACTICE_PHASE_DURATION_MS,
  DAILY_PRACTICE_URL,
  DailyPractice,
  EverydayPeace,
  EVERYDAY_PEACE_PHASE_DURATION_MS,
  EVERYDAY_PEACE_SCENES,
  ExpressionSpotlight,
  OFFICIAL_TEACHING_LABELS,
  ONE_KIND_WORD_LINES,
  ONE_KIND_WORD_PHASE_DURATION_MS,
  OneKindWord,
  PEACE_PROMISE_PHASE_DURATION_MS,
  PEACE_PROMISE_URL,
  PeacePromise,
  SPOTLIGHT_PHASE_DURATION_MS,
  dailyPracticePhaseAt,
  everydayPeacePhaseAt,
  normalizeElapsedMs,
  normalizeRotationIndex,
  oneKindWordAt,
  oneKindWordPhaseAt,
  peacePromisePhaseAt,
  spotlightExpressionAt,
  spotlightPhaseAt,
  teachingLabelForExpression,
} from '@/components/display/teaching/TeachingScreens';

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

describe('interview teaching stories', () => {
  it('keeps rotation helpers fair, bounded, and parent controllable', () => {
    expect(Array.from({ length: EXPRESSIONS.length }, (_, index) => spotlightExpressionAt(index).id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(spotlightExpressionAt(EXPRESSIONS.length).id).toBe(1);
    expect(spotlightExpressionAt(-1).id).toBe(9);
    expect(normalizeRotationIndex(Number.NaN, 9)).toBe(0);
    expect(normalizeRotationIndex(3.8, 9)).toBe(3);
    expect(normalizeElapsedMs(-20)).toBe(0);
    expect(normalizeElapsedMs(3.8)).toBe(3);
    expect(normalizeElapsedMs(Number.NaN)).toBe(0);
  });

  it('stages the Spotlight from flower wheel through the complete lesson', () => {
    expect(SPOTLIGHT_PHASE_DURATION_MS).toBe(12_000);
    expect(spotlightPhaseAt(0)).toBe('wheel');
    expect(spotlightPhaseAt(2_399)).toBe('wheel');
    expect(spotlightPhaseAt(2_400)).toBe('phrase');
    expect(spotlightPhaseAt(5_200)).toBe('principle');
    expect(spotlightPhaseAt(8_200)).toBe('example');
    expect(spotlightPhaseAt(60_000)).toBe('example');

    const markup = renderToStaticMarkup(<ExpressionSpotlight expressionIndex={7} motion="still" elapsedMs={8_200} />);
    const item = EXPRESSIONS[7];
    expect(markup).toContain('data-phase="example"');
    expect(markup).toContain('data-elapsed-ms="8200"');
    expect(markup).toContain('data-expression-id="8"');
    expect(markup).toContain('data-rotation-index="7"');
    expect(markup).toContain(item.phrase);
    expect(markup).toContain(item.principle);
    expect(markup).toContain(item.example!);
    expect(markup).toContain(OFFICIAL_TEACHING_LABELS[8]);
    expect(markup).toContain('Nine expression flower wheel');
  });

  it('keeps Daily Practice to one catalog expression and its fixed official QR', () => {
    expect(DAILY_PRACTICE_PHASE_DURATION_MS).toBe(12_000);
    expect(dailyPracticePhaseAt(0)).toBe('expression');
    expect(dailyPracticePhaseAt(4_200)).toBe('practice');
    expect(dailyPracticePhaseAt(8_000)).toBe('invitation');

    const markup = renderToStaticMarkup(<DailyPractice expressionIndex={2} motion="still" elapsedMs={8_000} />);
    expect(markup).toContain('data-phase="invitation"');
    expect(markup).toContain('data-expression-id="3"');
    expect(markup).toContain(`href="${DAILY_PRACTICE_URL}"`);
    expect(markup).toContain(`data-form-url="${DAILY_PRACTICE_URL}"`);
    expect(markup).toContain('Scan to open the official Daily Check.');
    expect(markup).toContain('Daily Check external official form');
    expect(markup).not.toContain('recognitionId');
    expect(markup).not.toContain('recipient');
  });

  it('uses only the three exact One Kind Word lines and emits color ripples', () => {
    expect(ONE_KIND_WORD_LINES).toEqual([
      'One Kind Word Heartfelt Change',
      'May Mother’s love bring peace to the world',
      'Today, achieve peace through the ‘Words of Mother’s Love.’',
    ]);
    expect(ONE_KIND_WORD_PHASE_DURATION_MS).toBe(8_000);
    expect(oneKindWordPhaseAt(0)).toBe('glow');
    expect(oneKindWordPhaseAt(1_800)).toBe('line');
    expect(oneKindWordPhaseAt(4_000)).toBe('ripples');
    ONE_KIND_WORD_LINES.forEach((line, index) => {
      const markup = renderToStaticMarkup(<OneKindWord wordIndex={index} motion="still" elapsedMs={4_000} />);
      expect(textWithoutTags(markup)).toBe(line);
      expect(markup).toContain('data-phase="ripples"');
      expect(oneKindWordAt(index + ONE_KIND_WORD_LINES.length)).toBe(line);
    });
  });

  it('plays original home, school, and work scenes in order with catalog phrases', () => {
    expect(EVERYDAY_PEACE_PHASE_DURATION_MS).toBe(24_000);
    expect(everydayPeacePhaseAt(0)).toBe('home');
    expect(everydayPeacePhaseAt(7_999)).toBe('home');
    expect(everydayPeacePhaseAt(8_000)).toBe('school');
    expect(everydayPeacePhaseAt(16_000)).toBe('work');
    expect(everydayPeacePhaseAt(22_000)).toBe('settled');

    const markup = renderToStaticMarkup(<EverydayPeace motion="still" elapsedMs={8_000} />);
    expect(markup).toContain('data-phase="school"');
    expect(markup).toContain('data-scene="home"');
    expect(markup).toContain('data-scene="school"');
    expect(markup).toContain('data-scene="work"');
    expect(markup).toContain('data-scene-active="true"');
    EVERYDAY_PEACE_SCENES.forEach((scene) => {
      const expression = EXPRESSIONS.find((candidate) => candidate.id === scene.expressionId)!;
      expect(markup).toContain(scene.label);
      expect(markup).toContain(scene.title);
      expect(textWithoutTags(markup)).toContain(expression.phrase);
      expect(markup).toContain(teachingLabelForExpression(expression.id));
    });
  });

  it('joins many abstract hands into a ribbon circle before the fixed Peace Promise QR', () => {
    expect(PEACE_PROMISE_PHASE_DURATION_MS).toBe(12_000);
    expect(peacePromisePhaseAt(0)).toBe('hands');
    expect(peacePromisePhaseAt(3_799)).toBe('hands');
    expect(peacePromisePhaseAt(3_800)).toBe('ribbon');
    expect(peacePromisePhaseAt(7_600)).toBe('invitation');

    const markup = renderToStaticMarkup(<PeacePromise motion="still" elapsedMs={7_600} />);
    expect(markup).toContain('data-phase="invitation"');
    expect((markup.match(/promiseHand/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect((markup.match(/promiseRibbon/g) ?? []).length).toBe(1);
    expect(markup).toContain('promiseHandLeft');
    expect(markup).toContain('promiseHandRight');
    expect(markup).toContain('promiseRing');
    expect(markup).toContain(`href="${PEACE_PROMISE_URL}"`);
    expect(markup).toContain(`data-form-url="${PEACE_PROMISE_URL}"`);
    expect(markup).toContain('Scan to open the official Supporting Signature form.');
    expect(markup).toContain('It asks for your details on the official site.');
    expect(markup).not.toContain('recognitionId');
    expect(markup).not.toContain('submittedName');
  });
});
