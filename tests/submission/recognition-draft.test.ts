import { describe, expect, it } from 'vitest';

import {
  RECOGNITION_DRAFT_LIFETIME_MS,
  RECOGNITION_DRAFT_STORAGE_KEY,
  clearRecognitionDraft,
  decodeRecognitionDraft,
  encodeRecognitionDraft,
  loadRecognitionDraft,
  saveRecognitionDraft,
} from '@/lib/recognition-draft';

const IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const NOW = Date.parse('2026-11-11T20:00:00Z');
const KEY = '0b9f4c1e-6d1b-4f0a-9d53-6a1c2e3f4a5b';
const draft = { submitter: 'Example Sender', recipient: 'Example Friend', message: 'Thank you 🌼', expressionIds: [2, 6] };

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('the unfinished recognition kept on the device', () => {
  it('comes back exactly as written, with its duplicate guard', () => {
    const encoded = encodeRecognitionDraft({ draft, requestKey: KEY, sendAttempted: true }, NOW);
    expect(decodeRecognitionDraft(encoded, NOW + 5_000, IDS)).toEqual({ draft, requestKey: KEY, sendAttempted: true });
  });

  it('stores nothing for an empty form', () => {
    const empty = { submitter: '  ', recipient: '', message: '\n', expressionIds: [] };
    expect(encodeRecognitionDraft({ draft: empty, requestKey: KEY, sendAttempted: false }, NOW)).toBeNull();
  });

  it('is ignored once it is a day old or dated in the future', () => {
    const encoded = encodeRecognitionDraft({ draft, requestKey: KEY, sendAttempted: false }, NOW);
    expect(decodeRecognitionDraft(encoded, NOW + RECOGNITION_DRAFT_LIFETIME_MS - 1, IDS)).not.toBeNull();
    expect(decodeRecognitionDraft(encoded, NOW + RECOGNITION_DRAFT_LIFETIME_MS + 1, IDS)).toBeNull();
    expect(decodeRecognitionDraft(encoded, NOW - 5 * 60_000, IDS)).toBeNull();
  });

  it('treats damaged or foreign values as no draft', () => {
    const good = JSON.parse(encodeRecognitionDraft({ draft, requestKey: KEY, sendAttempted: false }, NOW)!);
    const cases = [
      null,
      '',
      'not json',
      '[]',
      JSON.stringify({ ...good, version: 2 }),
      JSON.stringify({ ...good, savedAt: 'yesterday' }),
      JSON.stringify({ ...good, message: 42 }),
      JSON.stringify({ ...good, message: 'x'.repeat(6001) }),
      JSON.stringify({ ...good, expressionIds: 'all' }),
      JSON.stringify({ ...good, requestKey: 'short' }),
      JSON.stringify({ ...good, requestKey: 'has spaces in the key' }),
    ];
    for (const raw of cases) expect(decodeRecognitionDraft(raw, NOW, IDS)).toBeNull();
  });

  it('keeps only real expressions, once each, in order', () => {
    const good = JSON.parse(encodeRecognitionDraft({ draft, requestKey: KEY, sendAttempted: false }, NOW)!);
    const raw = JSON.stringify({ ...good, expressionIds: [9, 2, 2, 12, '3', 1.5, 1] });
    expect(decodeRecognitionDraft(raw, NOW, IDS)?.draft.expressionIds).toEqual([1, 2, 9]);
  });

  it('saves, loads and clears through a storage, and removes an empty or unreadable copy', () => {
    const storage = memoryStorage();
    saveRecognitionDraft(storage, { draft, requestKey: KEY, sendAttempted: false }, NOW);
    expect(storage.values.has(RECOGNITION_DRAFT_STORAGE_KEY)).toBe(true);
    expect(loadRecognitionDraft(storage, NOW, IDS)?.draft).toEqual(draft);

    saveRecognitionDraft(storage, { draft: { ...draft, submitter: '', recipient: '', message: '', expressionIds: [] }, requestKey: KEY, sendAttempted: false }, NOW);
    expect(storage.values.size).toBe(0);

    storage.values.set(RECOGNITION_DRAFT_STORAGE_KEY, 'damaged');
    expect(loadRecognitionDraft(storage, NOW, IDS)).toBeNull();
    expect(storage.values.size).toBe(0);

    saveRecognitionDraft(storage, { draft, requestKey: KEY, sendAttempted: false }, NOW);
    clearRecognitionDraft(storage);
    expect(storage.values.size).toBe(0);
  });

  it('never throws when the browser refuses storage', () => {
    const refusing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(loadRecognitionDraft(refusing, NOW, IDS)).toBeNull();
    expect(() => saveRecognitionDraft(refusing, { draft, requestKey: KEY, sendAttempted: false }, NOW)).not.toThrow();
    expect(() => clearRecognitionDraft(refusing)).not.toThrow();
    expect(loadRecognitionDraft(null, NOW, IDS)).toBeNull();
  });
});
