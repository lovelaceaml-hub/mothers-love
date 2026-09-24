/** How a recognition's message is paged and how long each page is read. */
import type { Recognition } from '@/lib/contracts';

export const READING_MESSAGE_PAGE_GRAPHEMES = 180;
export const READING_MESSAGE_PAGE_LINES = 7;

function graphemes(text: string): string[] {
  const segmenter = (Intl as typeof Intl & {
    Segmenter?: new (locales?: string | string[], options?: { granularity: 'grapheme' }) => { segment(input: string): Iterable<{ segment: string }> };
  }).Segmenter;
  if (segmenter) return [...new segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((part) => part.segment);
  return Array.from(text);
}

export function splitVerbatimMessage(message: string): string[] {
  const units = graphemes(message);
  if (!units.length) return [''];
  const pages: string[] = [];
  let cursor = 0;
  while (cursor < units.length) {
    let end = cursor;
    let newlineCount = 0;
    while (end < units.length && end - cursor < READING_MESSAGE_PAGE_GRAPHEMES) {
      const unit = units[end];
      if (unit === '\n' && newlineCount >= READING_MESSAGE_PAGE_LINES) break;
      end += 1;
      if (unit === '\n') newlineCount += 1;
      if (newlineCount >= READING_MESSAGE_PAGE_LINES) break;
    }
    if (end === cursor) end += 1;
    if (end < units.length && newlineCount < READING_MESSAGE_PAGE_LINES) {
      const whitespace = units.slice(cursor, end).reduce((last, unit, index) => /\s/u.test(unit) ? cursor + index : last, -1);
      if (whitespace > cursor + Math.floor(READING_MESSAGE_PAGE_GRAPHEMES * 0.55)) end = whitespace + 1;
    }
    pages.push(units.slice(cursor, end).join(''));
    cursor = end;
  }
  return pages;
}

export function recognitionReadingPageCount(recognition: Recognition): number {
  const messagePages = splitVerbatimMessage(recognition.message).length;
  return messagePages + (messagePages > 1 || recognition.expressionIds.length > 4 ? 1 : 0);
}

export function readingTotalDuration(recognition: Recognition, minimumMs = 12_000): number {
  const expressionWeight = recognition.expressionIds.length * 350;
  return Math.max(minimumMs, Math.min(120_000, 12_000 + graphemes(recognition.message).length * 30 + expressionWeight));
}

export function readingPageDuration(recognition: Recognition, minimumMs = 12_000): number {
  return Math.ceil(readingTotalDuration(recognition, minimumMs) / recognitionReadingPageCount(recognition));
}
