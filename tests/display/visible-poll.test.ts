import { afterEach, describe, expect, it, vi } from 'vitest';
import { startVisiblePoll } from '@/lib/visible-poll';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('visible display polling', () => {
  it('polls every five seconds, stops while hidden, and refreshes immediately on return', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const doc = Object.assign(target, { hidden: false });
    vi.stubGlobal('document', doc);
    const load = vi.fn();
    const beforeResume = vi.fn();
    const stop = startVisiblePoll(load, 5000, beforeResume);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    expect(load).toHaveBeenCalledTimes(3);
    doc.hidden = true;
    target.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60000);
    expect(load).toHaveBeenCalledTimes(3);
    doc.hidden = false;
    target.dispatchEvent(new Event('visibilitychange'));
    expect(beforeResume).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledTimes(4);
    stop();
    vi.advanceTimersByTime(10000);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it('does not start requests when initially hidden', () => {
    vi.useFakeTimers();
    const doc = Object.assign(new EventTarget(), { hidden: true });
    vi.stubGlobal('document', doc);
    const load = vi.fn();
    const stop = startVisiblePoll(load, 5000);
    vi.advanceTimersByTime(60000);
    expect(load).not.toHaveBeenCalled();
    stop();
  });
});
