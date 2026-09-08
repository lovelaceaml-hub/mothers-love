export const MAX_NAME_GRAPHEMES = 80;

export function countGraphemes(value: string) {
  const IntlWithSegmenter = Intl as typeof Intl & {
    Segmenter?: new (locales?: string | string[], options?: { granularity: 'grapheme' }) => {
      segment(value: string): Iterable<string>;
    };
  };

  if (typeof Intl !== 'undefined' && IntlWithSegmenter.Segmenter) {
    const segmenter = new IntlWithSegmenter.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value)).length;
  }

  return Array.from(value).length;
}

function containsLetterOrNumber(value: string) {
  return /[\p{L}\p{M}\p{N}]/u.test(value);
}

export function isFirstNameLastInitial(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;

  const lastPart = parts.at(-1)?.replace(/\.$/, '') ?? '';
  if (countGraphemes(lastPart) !== 1 || !containsLetterOrNumber(lastPart)) {
    return false;
  }

  return parts.slice(0, -1).every(containsLetterOrNumber);
}
