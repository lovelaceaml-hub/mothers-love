import { describe, expect, it } from 'vitest';

import { countGraphemes, getValidationErrors, isFirstNameLastInitial } from '@/components/submission/SubmissionForm';

describe('submission validation', () => {
  it('counts grapheme clusters instead of UTF-16 code units', () => {
    expect(countGraphemes('e\u0301 🌼')).toBe(3);
    expect(countGraphemes('👩🏽‍💻')).toBe(1);
  });

  it('accepts Unicode, apostrophes, hyphens, and multiword first names', () => {
    expect(isFirstNameLastInitial("Mary Jane O.")).toBe(true);
    expect(isFirstNameLastInitial('Jean-Luc É.')).toBe(true);
    expect(isFirstNameLastInitial('张 伟')).toBe(true);
    expect(isFirstNameLastInitial('Michelle')).toBe(false);
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
