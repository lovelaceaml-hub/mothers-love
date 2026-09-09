import { describe, expect, it } from 'vitest';

import { countGraphemes, getValidationErrors, hasVisibleNameContent } from '@/components/submission/SubmissionForm';

describe('submission validation', () => {
  it('counts grapheme clusters instead of UTF-16 code units', () => {
    expect(countGraphemes('e\u0301 🌼')).toBe(3);
    expect(countGraphemes('👩🏽‍💻')).toBe(1);
  });

  it('checks visible name content without requiring letters or changing the name', () => {
    expect(hasVisibleNameContent('\u200B')).toBe(false);
    expect(hasVisibleNameContent('\u200D')).toBe(false);
    expect(hasVisibleNameContent('\uFE0F')).toBe(false);
    expect(hasVisibleNameContent('\u0000')).toBe(false);
    expect(hasVisibleNameContent('A\u0301')).toBe(true);
    expect(hasVisibleNameContent('👩‍👩‍👧‍👦')).toBe(true);
  });

  it('accepts single, full, nickname, and Unicode names', () => {
    const errors = getValidationErrors({
      submitter: '  Mimi  ',
      recipient: '张 伟',
      message: 'Thank you for your kindness.',
      expressionIds: [2],
    });

    expect(errors).toEqual({});
  });

  it('rejects missing names while accepting names with any shape', () => {
    const errors = getValidationErrors({
      submitter: '',
      recipient: '  ',
      message: 'Thank you for your kindness.',
      expressionIds: [2],
    });

    expect(errors.submitter).toBe('Enter your name.');
    expect(errors.recipient).toBe('Enter the recipient name.');
  });

  it('rejects names made only of invisible or control characters as required', () => {
    for (const value of ['\u200B', '\u200D', '\uFE0F', '\u0000']) {
      const errors = getValidationErrors({
        submitter: value,
        recipient: value,
        message: 'Thank you for your kindness.',
        expressionIds: [2],
      });

      expect(errors.submitter).toBe('Enter your name.');
      expect(errors.recipient).toBe('Enter the recipient name.');
    }
  });

  it('accepts visible combining, joined, and emoji names as entered', () => {
    const submitter = 'A\u0301';
    const recipient = '👩‍👩‍👧‍👦';
    const errors = getValidationErrors({
      submitter,
      recipient,
      message: 'Thank you for your kindness.',
      expressionIds: [2],
    });

    expect(errors).toEqual({});
    expect(submitter).toBe('A\u0301');
    expect(recipient).toBe('👩‍👩‍👧‍👦');
  });

  it('rejects over-limit names without shortening them', () => {
    const submitter = '🙂'.repeat(81);
    const recipient = 'a'.repeat(81);
    const errors = getValidationErrors({
      submitter,
      recipient,
      message: 'Thank you for your kindness.',
      expressionIds: [2],
    });

    expect(errors.submitter).toContain('80');
    expect(errors.recipient).toContain('80');
    expect(submitter).toHaveLength(162);
    expect(recipient).toHaveLength(81);
  });

  it('returns field level errors without shortening the draft', () => {
    const message = 'a'.repeat(500);
    const errors = getValidationErrors({
      submitter: 'Maya R.',
      recipient: 'Michelle R.',
      message,
      expressionIds: [2, 6, 8],
    });

    expect(errors).toEqual({});
    expect(message).toHaveLength(500);
  });

  it('rejects an over-limit message and missing expression', () => {
    const errors = getValidationErrors({
      submitter: 'Maya R.',
      recipient: 'Michelle R.',
      message: 'a'.repeat(501),
      expressionIds: [],
    });

    expect(errors.message).toContain('500');
    expect(errors.expressions).toBe('Select at least one expression.');
  });
});
