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
