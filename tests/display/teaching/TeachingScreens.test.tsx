import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EXPRESSIONS } from '@/lib/catalog';
import {
  DAILY_PRACTICE_URL,
  DailyPractice,
  EverydayPeace,
  ExpressionSpotlight,
  ONE_KIND_WORD_LINES,
  OneKindWord,
  PEACE_PROMISE_URL,
  PeacePromise,
  normalizeRotationIndex,
  oneKindWordAt,
  spotlightExpressionAt,
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

describe('teaching display screens', () => {
  it('rotates fairly through every canonical expression and wraps safely', () => {
    expect(Array.from({ length: EXPRESSIONS.length }, (_, index) => spotlightExpressionAt(index).id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(spotlightExpressionAt(EXPRESSIONS.length).id).toBe(1);
    expect(spotlightExpressionAt(-1).id).toBe(9);
    expect(normalizeRotationIndex(Number.NaN, 9)).toBe(0);
    expect(normalizeRotationIndex(3.8, 9)).toBe(3);
  });

  it('renders the selected official phrase, principle, and catalog example', () => {
    const markup = renderToStaticMarkup(<ExpressionSpotlight expressionIndex={7} motion="still" />);
    const item = EXPRESSIONS[7];
    expect(markup).toContain('data-expression-id="8"');
    expect(markup).toContain(item.phrase);
    expect(markup).toContain(item.principle);
    expect(markup).toContain(item.example!);
    expect(markup).toContain('Everyday example');
    expect(markup).toContain('data-rotation-index="7"');
  });

  it('uses exactly one expression and the fixed Daily Check form', () => {
    const markup = renderToStaticMarkup(<DailyPractice expressionIndex={2} motion="still" />);
    expect(markup).toContain('data-expression-id="3"');
    expect(textWithoutTags(markup)).toContain(EXPRESSIONS[2].phrase);
    expect(markup).toContain(`href="${DAILY_PRACTICE_URL}"`);
    expect(markup).toContain(`data-form-url="${DAILY_PRACTICE_URL}"`);
    expect(markup).toContain('Daily Check external official form');
    expect(markup).toContain('External official form');
    expect(markup).not.toContain('recognitionId');
    expect(markup).not.toContain('recipient');
  });

  it('keeps One Kind Word to the three approved strings while rotating one at a time', () => {
    expect(ONE_KIND_WORD_LINES).toEqual([
      'One Kind Word Heartfelt Change',
      'May Mother’s love bring peace to the world',
      'Today, achieve peace through the ‘Words of Mother’s Love.’',
    ]);
    ONE_KIND_WORD_LINES.forEach((line, index) => {
      const markup = renderToStaticMarkup(<OneKindWord wordIndex={index} motion="still" />);
      expect(textWithoutTags(markup)).toBe(line);
      expect(oneKindWordAt(index + ONE_KIND_WORD_LINES.length)).toBe(line);
    });
  });

  it('provides original home, school, and work scenes', () => {
    const markup = renderToStaticMarkup(<EverydayPeace motion="still" />);
    expect(markup).toContain('data-screen="everyday-peace"');
    expect(markup).toContain('HOME');
    expect(markup).toContain('SCHOOL');
    expect(markup).toContain('WORK');
    expect(markup).toContain('Make space to listen.');
    expect(markup).toContain('Share the turn.');
    expect(markup).toContain('Name the effort.');
  });

  it('uses abstract hands, one ribbon, and only the fixed Peace Promise form', () => {
    const markup = renderToStaticMarkup(<PeacePromise motion="still" />);
    expect(markup).toContain('promiseHandLeft');
    expect(markup).toContain('promiseHandRight');
    expect((markup.match(/promiseRibbon/g) ?? []).length).toBe(1);
    expect(markup).toContain(`href="${PEACE_PROMISE_URL}"`);
    expect(markup).toContain(`data-form-url="${PEACE_PROMISE_URL}"`);
    expect(markup).toContain('Peace Promise external official form');
    expect(markup).not.toContain('recognitionId');
    expect(markup).not.toContain('submittedName');
  });
});
