import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPollingState, nextPollingBoundary, pollingInterval, pollingMode, SLOW_POLL_MS } from '@/lib/polling-schedule';
import { startVisiblePoll } from '@/lib/visible-poll';

describe('Pacific campaign schedule', () => {
  it.each([
    ['2026-10-10T15:59:59.999Z', 'slow'], // Saturday 08:59 PDT
    ['2026-10-10T16:00:00Z', 'fast'],
    ['2026-10-11T04:59:59.999Z', 'fast'],
    ['2026-10-11T05:00:00Z', 'slow'], // Saturday 22:00
    ['2026-10-14T00:59:59.999Z', 'slow'], // Tuesday 17:59 PDT
    ['2026-10-14T01:00:00Z', 'fast'],
    ['2026-10-14T04:59:59.999Z', 'fast'],
    ['2026-10-14T05:00:00Z', 'slow'], // Tuesday 22:00
    ['2026-10-12T06:59:59.999Z', 'slow'], // Sunday 23:59 PDT
    ['2026-10-12T07:00:00Z', 'paused'],
    ['2026-10-12T13:59:59.999Z', 'paused'],
    ['2026-10-12T14:00:00Z', 'slow'],
    ['2026-10-12T19:00:00Z', 'slow'], // Monday noon
    ['2026-01-10T16:59:59.999Z', 'slow'], // Winter Saturday
    ['2026-01-10T17:00:00Z', 'fast'],
    ['2026-01-11T06:00:00Z', 'slow'],
    ['2026-01-11T08:00:00Z', 'paused'],
    ['2026-01-11T15:00:00Z', 'slow'],
    ['2026-03-08T09:59:59.999Z', 'paused'], // Spring: skips 02:00
    ['2026-03-08T10:00:00Z', 'paused'],
    ['2026-03-08T14:00:00Z', 'slow'],
    ['2026-11-01T08:59:59.999Z', 'paused'], // Fall: repeats 01:00
    ['2026-11-01T09:00:00Z', 'paused'],
    ['2026-11-01T15:00:00Z', 'slow'],
  ])('%s is %s independently of device timezone', (iso, expected) => {
    expect(pollingMode(Date.parse(iso))).toBe(expected);
  });

  it.each([
    ['2026-03-08T08:00:00Z', '2026-03-08T14:00:00Z'], // Six actual paused hours
    ['2026-11-01T07:00:00Z', '2026-11-01T15:00:00Z'], // Eight actual paused hours
    ['2026-10-10T15:55:00Z', '2026-10-10T16:00:00Z'],
    ['2026-10-11T04:55:00Z', '2026-10-11T05:00:00Z'],
    ['2026-10-14T00:55:00Z', '2026-10-14T01:00:00Z'],
  ])('next mode boundary after %s is %s', (iso, boundary) => {
    expect(nextPollingBoundary(Date.parse(iso))).toBe(Date.parse(boundary));
  });

  it('uses each current cadence only in fast windows', () => {
    for (const ms of [4_000, 5_000, 10_000, 30_000, 300_000]) {
      expect(pollingInterval(ms, Date.parse('2026-10-10T16:00:00Z'))).toBe(ms);
      expect(pollingInterval(ms, Date.parse('2026-10-12T19:00:00Z'))).toBe(SLOW_POLL_MS);
      expect(pollingInterval(ms, Date.parse('2026-10-12T10:00:00Z'))).toBeNull();
    }
  });
});

describe('scheduled reader lifecycle', () => {
  let doc: EventTarget & { hidden: boolean };
  let page: EventTarget;
  const time = (iso: string) => vi.setSystemTime(new Date(iso));
  const visible = (hidden: boolean) => { doc.hidden = hidden; doc.dispatchEvent(new Event('visibilitychange')); };
  beforeEach(() => {
    vi.useFakeTimers();
    doc = Object.assign(new EventTarget(), { hidden: false });
    page = new EventTarget();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', page);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('does one initial read, then at most one per ten minutes including visibility/focus changes', () => {
    time('2026-10-12T19:00:00Z');
    const read = vi.fn();
    const stop = startVisiblePoll(read, 5_000);
    vi.advanceTimersByTime(60_000);
    visible(true); visible(false);
    page.dispatchEvent(new Event('pageshow'));
    page.dispatchEvent(new Event('focus'));
    expect(read).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(540_000);
    expect(read).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stops at midnight, resumes at 07:00 once, and continues slowly', () => {
    time('2026-10-12T06:59:55Z');
    const read = vi.fn();
    const stop = startVisiblePoll(read, 5_000);
    vi.advanceTimersByTime(5_000);
    vi.advanceTimersByTime(7 * 3_600_000 - 1);
    expect(read).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(read).toHaveBeenCalledTimes(2);
    page.dispatchEvent(new Event('pageshow'));
    visible(false);
    expect(read).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(SLOW_POLL_MS);
    expect(read).toHaveBeenCalledTimes(3);
    stop();
  });

  it('allows a user-opened overnight page one initial read, not recurring retries', () => {
    time('2026-10-12T10:00:00Z');
    const read = vi.fn();
    const stop = startVisiblePoll(read, 4_000);
    vi.advanceTimersByTime(3 * 3_600_000);
    visible(true); visible(false);
    page.dispatchEvent(new Event('focus'));
    expect(read).toHaveBeenCalledTimes(1);
    stop();
  });

  it.each([
    ['2026-10-10T15:59:50Z', '2026-10-10T16:00:00Z'],
    ['2026-10-14T00:59:50Z', '2026-10-14T01:00:00Z'],
  ])('refreshes on entry into a fast window from %s', (iso, boundary) => {
    time(iso);
    const read = vi.fn();
    const stop = startVisiblePoll(read, 5_000);
    vi.advanceTimersByTime(Date.parse(boundary) - Date.parse(iso));
    expect(read).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5_000);
    expect(read).toHaveBeenCalledTimes(3);
    stop();
  });

  it.each(['2026-10-11T04:59:55Z', '2026-10-14T04:59:55Z'])('switches to slow at 22:00 after %s', (iso) => {
    time(iso);
    const read = vi.fn();
    const stop = startVisiblePoll(read, 5_000);
    vi.advanceTimersByTime(599_999);
    expect(read).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(read).toHaveBeenCalledTimes(2);
    stop();
  });

  it('coalesces late timers and repeated wake events without catch-up bursts', () => {
    time('2026-10-12T19:00:00Z');
    const read = vi.fn();
    const beforeResume = vi.fn();
    const stop = startVisiblePoll(read, 5_000, beforeResume);
    time('2026-10-12T20:00:00Z');
    page.dispatchEvent(new Event('pageshow'));
    page.dispatchEvent(new Event('focus'));
    visible(false);
    vi.advanceTimersByTime(5_000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(beforeResume).toHaveBeenCalled();
    stop();
  });

  it('preserves budgets through effect restarts and cancels all work on unmount', () => {
    time('2026-10-12T19:00:00Z');
    const read = vi.fn();
    const state = createPollingState();
    startVisiblePoll(read, 5_000, undefined, { state })();
    const stop = startVisiblePoll(read, 5_000, undefined, { state });
    expect(read).toHaveBeenCalledTimes(1);
    stop();
    vi.advanceTimersByTime(24 * 3_600_000);
    visible(false); page.dispatchEvent(new Event('focus'));
    expect(read).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('build checks skip an initial read and obey the same paused/slow schedule', () => {
    time('2026-10-12T13:59:50Z');
    const read = vi.fn();
    const stop = startVisiblePoll(read, 300_000, undefined, { initial: false });
    expect(read).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(read).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SLOW_POLL_MS);
    expect(read).toHaveBeenCalledTimes(2);
    stop();
  });

  it.each([[5_000, 12_852], [4_000, 15_912], [10_000, 6_732]])('counts one normal week at %i ms without mount/manual extras', (cadence, expected) => {
    time('2026-10-12T07:00:00Z'); // Monday midnight PDT
    let reads = 0;
    const stop = startVisiblePoll(() => { reads++; }, cadence, undefined, { initial: false });
    vi.advanceTimersByTime(7 * 24 * 3_600_000);
    expect(reads).toBe(expected);
    stop();
  });
});
