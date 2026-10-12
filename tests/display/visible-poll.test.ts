import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startVisiblePoll } from '@/lib/visible-poll';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-10T16:00:00Z')); });

describe('visible display polling', () => {
  it('keeps the five-second visible cadence, pauses hidden requests, and refreshes on return', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const doc = Object.assign(target, { hidden: false });
    vi.stubGlobal('document', doc);
    const request = vi.fn();
    const beforeResume = vi.fn();
    const stop = startVisiblePoll(request, 5_000, beforeResume);

    expect(request).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(request).toHaveBeenCalledTimes(3);

    doc.hidden = true;
    target.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);
    expect(request).toHaveBeenCalledTimes(3);

    doc.hidden = false;
    target.dispatchEvent(new Event('visibilitychange'));
    expect(beforeResume).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(4);
    stop();
    vi.advanceTimersByTime(10_000);
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('does not request while the page starts hidden', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { hidden: true });
    vi.stubGlobal('document', doc);
    const request = vi.fn();
    const stop = startVisiblePoll(request, 5_000);
    vi.advanceTimersByTime(60_000);
    expect(request).not.toHaveBeenCalled();
    stop();
  });
});
