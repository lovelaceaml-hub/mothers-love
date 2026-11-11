import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EARLY_READ_MAX_AGE_MS, awaitEarlyRead, earlyReadScript, takeEarlyRead } from '@/lib/early-read';

// The unit tests run without a browser: a plain object stands in for the page's window.
let holder: Record<string, unknown> = {};
beforeEach(() => {
  holder = {};
  vi.stubGlobal('window', holder);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the early first read', () => {
  it('writes a fixed script for each page', () => {
    expect(earlyReadScript('feed')).toContain('fetch("/api/feed"');
    expect(earlyReadScript('feed')).toContain('window["__mlEarlyFeed"]');
    expect(earlyReadScript('config')).toContain('fetch("/api/config"');
    expect(earlyReadScript('config')).not.toContain('<');
  });

  it('is taken once, and only while it is recent', () => {
    const response = Promise.resolve(new Response('{}'));
    holder.__mlEarlyFeed = { startedAt: 1_000, response };
    const early = takeEarlyRead('feed', 1_500);
    expect(early?.startedAt).toBe(1_000);
    expect(early?.response).toBe(response);
    expect(takeEarlyRead('feed', 1_600)).toBeNull();

    holder.__mlEarlyFeed = { startedAt: 1_000, response };
    expect(takeEarlyRead('feed', 1_000 + EARLY_READ_MAX_AGE_MS + 1)).toBeNull();
    expect(holder.__mlEarlyFeed).toBeUndefined();
  });

  it('ignores anything that is not a started read', () => {
    for (const value of [null, 'text', {}, { startedAt: 'now', response: Promise.resolve() }, { startedAt: 5, response: 'no' }, { startedAt: 9_000, response: Promise.resolve() }]) {
      holder.__mlEarlyConfig = value;
      expect(takeEarlyRead('config', 1_000)).toBeNull();
    }
    expect(takeEarlyRead('config', 1_000)).toBeNull();
    vi.unstubAllGlobals();
    expect(takeEarlyRead('config', 1_000)).toBeNull();
  });

  it('gives up waiting when the caller aborts, and passes a failure through', async () => {
    const never = { startedAt: 0, response: new Promise<Response>(() => {}) };
    const controller = new AbortController();
    const waiting = awaitEarlyRead(never, controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' });

    const failed = { startedAt: 0, response: Promise.reject(new TypeError('offline')) };
    await expect(awaitEarlyRead(failed, new AbortController().signal)).rejects.toThrow('offline');

    const answer = new Response('{}');
    await expect(awaitEarlyRead({ startedAt: 0, response: Promise.resolve(answer) }, new AbortController().signal)).resolves.toBe(answer);
  });
});
