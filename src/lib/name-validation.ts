export const MAX_NAME_GRAPHEMES = 80;

const NON_VISIBLE_NAME_CONTENT = /[\s\p{Cc}\p{Default_Ignorable_Code_Point}]/gu;

export function hasVisibleNameContent(value: string) {
  return value.replace(NON_VISIBLE_NAME_CONTENT, '').length > 0;
}

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
