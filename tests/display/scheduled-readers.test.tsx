import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { snapshot as displaySnapshot } from '../world/fixtures';

const probes = vi.hoisted(() => ({ renderer: vi.fn(() => null), fallback: vi.fn(() => null), phases: [] as unknown[] }));
// Network/lifecycle integration under React, without a browser or rendering text.
// Intrinsic DOM tags are unnecessary here; actual hooks and callbacks still run.
vi.mock('react/jsx-runtime', async (original) => {
  const runtime = await original<Record<string, unknown>>();
  const factory = (name: string) => (type: unknown, props: Record<string, unknown>, key: unknown) => {
    if (type === probes.renderer) return probes.renderer();
    if (type === probes.fallback) return probes.fallback();
    if (typeof type === 'string') {
      if (props?.['data-display-phase']) probes.phases.push(props['data-display-phase']);
      return null;
    }
    return Reflect.apply(runtime[name] as (...args: unknown[]) => unknown, undefined, [type, props, key]);
  };
  return { ...runtime, jsx: factory('jsx'), jsxs: factory('jsxs') };
});
vi.mock('react/jsx-dev-runtime', async (original) => {
  const runtime = await original<Record<string, unknown>>();
  return { ...runtime, jsxDEV: (...args: unknown[]) => {
    const [type, props] = args as [unknown, Record<string, unknown>];
    if (type === probes.renderer) return probes.renderer();
    if (type === probes.fallback) return probes.fallback();
    if (typeof type === 'string') {
      if (props?.['data-display-phase']) probes.phases.push(props['data-display-phase']);
      return null;
    }
    return Reflect.apply(runtime.jsxDEV as (...args: unknown[]) => unknown, undefined, args);
  } };
});
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/components/display/color-polish/renderer', () => ({ COLOR_POLISH_PREVIEW_BUILD: false, ColorPolishRenderer: probes.renderer }));
vi.mock('@/components/display/V6DisplayExperience', () => ({ V6DisplayExperience: probes.fallback }));
vi.mock('@/lib/display-build', async (original) => ({ ...await original<object>(), DISPLAY_BUILD: 'synthetic-old-build' }));

import { ColorPolishHost } from '@/components/display/color-polish-host/ColorPolishHost';
import { DisplayBuildWatch } from '@/components/display/DisplayBuildWatch';
import { PublicFeedProvider, usePublicFeed } from '@/components/feed/PublicFeedProvider';

let doc: EventTarget & { hidden: boolean; visibilityState: string };
let page: EventTarget;
let roots: Root[];
let requests: Array<{ path: string; method: string }>;
let failTV: boolean;
let nextTVSnapshot: ReturnType<typeof displaySnapshot>;
const item = { id: 'synthetic-schedule-recognition', recipient: 'Fictional recipient', message: 'A fictional thank you.', expressionIds: [1], firstPublishedAt: '2026-09-10T17:00:00Z', expiresAt: '2026-09-17T17:00:00Z' };
const payload = { serverTime: '2026-09-10T18:00:00Z', items: [item] };
let nextFeedPayload = payload;
const count = (path: string) => requests.filter((r) => r.path === path).length;
const advance = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const setTime = (iso: string) => vi.setSystemTime(new Date(iso));
const hide = async (hidden: boolean) => act(async () => {
  doc.hidden = hidden;
  doc.visibilityState = hidden ? 'hidden' : 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
});

async function mount(node: ReactNode) {
  const container = { nodeType: 1, nodeName: 'DIV', tagName: 'DIV', ownerDocument: doc, textContent: '', addEventListener() {}, removeEventListener() {} };
  const root = createRoot(container as unknown as Element);
  roots.push(root);
  await act(async () => { root.render(node); });
  await advance(0);
  return root;
}

beforeEach(() => {
  vi.useFakeTimers();
  setTime('2026-09-10T18:00:00Z'); // Thursday 11:00 Pacific: slow; matches the fixture clock
  roots = []; requests = []; failTV = false; nextTVSnapshot = displaySnapshot(); nextFeedPayload = payload;
  probes.renderer.mockClear(); probes.fallback.mockClear(); probes.phases.length = 0;
  doc = Object.assign(new EventTarget(), { hidden: false, visibilityState: 'visible', activeElement: null, body: null });
  page = Object.assign(new EventTarget(), {
    document: doc, HTMLIFrameElement: class {},
    setInterval, clearInterval, setTimeout, clearTimeout,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { search: '', reload: vi.fn() },
    sessionStorage: { getItem: vi.fn(() => null), setItem: vi.fn() },
  });
  vi.stubGlobal('document', doc); vi.stubGlobal('window', page);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const parsed = new URL(url, 'https://synthetic.invalid');
    const method = init?.method ?? 'GET';
    requests.push({ path: parsed.pathname, method });
    let body: unknown = { items: [] };
    let status = 200;
    if (parsed.pathname === '/api/feed') body = nextFeedPayload;
    if (parsed.pathname === '/api/display/color-polish') { body = nextTVSnapshot; if (failTV) status = 503; }
    if (parsed.pathname === '/api/display/snapshot') body = displaySnapshot();
    if (parsed.pathname === '/api/display/build') body = { build: 'synthetic-new-build' };
    if (parsed.pathname === '/api/reactions') body = { items: (parsed.searchParams.get('ids') ?? '').split(',').filter(Boolean).map((id) => ({ id, count: 1, liked: false })) };
    if (method === 'PUT') body = { id: parsed.pathname.split('/').at(-1), count: 2, liked: true };
    return { ok: status === 200, status, headers: new Headers({ 'content-type': 'application/json' }), json: async () => structuredClone(body) };
  }));
});
afterEach(async () => {
  await act(async () => { roots.forEach((root) => root.unmount()); });
  vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('TV scheduled retention and recovery', () => {
  it('verifies on a development remount even overnight', async () => {
    setTime('2026-09-11T09:00:00Z');
    const { StrictMode } = await import('react');
    await mount(createElement(StrictMode, null, createElement(ColorPolishHost)));
    expect(probes.renderer).toHaveBeenCalled();
    const initial = count('/api/display/color-polish');
    await advance(61_000);
    expect(count('/api/display/color-polish')).toBe(initial);
    expect(probes.fallback).not.toHaveBeenCalled();
  });

  it('defers a changed-pool reaction read until eligible without adding a recurring stream', async () => {
    setTime('2026-09-12T16:00:00Z');
    await mount(createElement(ColorPolishHost));
    expect(count('/api/reactions')).toBe(1);
    nextTVSnapshot.recognitions[0].id = '00000000-0000-4000-8000-000000000999';
    await advance(5_000);
    expect(count('/api/reactions')).toBe(1);
    await advance(5_000);
    expect(count('/api/reactions')).toBe(2);
    await advance(20_000);
    expect(count('/api/reactions')).toBe(2);
  });

  it('keeps actual V6 snapshot, daily and reaction readers slow, including remount-free recovery', async () => {
    const { V6DisplayExperience } = await vi.importActual<typeof import('@/components/display/V6DisplayExperience')>('@/components/display/V6DisplayExperience');
    await mount(createElement(V6DisplayExperience));
    expect(count('/api/display/snapshot')).toBe(1);
    expect(count('/api/display/daily')).toBe(1);
    expect(count('/api/reactions')).toBe(1);
    await advance(61_000);
    await hide(true); await hide(false);
    await advance(539_000);
    expect(count('/api/display/snapshot')).toBe(2);
    expect(count('/api/display/daily')).toBe(2);
    expect(count('/api/reactions')).toBe(2);
  });

  it('retains personal content between slow updates without starting fallback reads', async () => {
    await mount(createElement(ColorPolishHost));
    expect(probes.renderer).toHaveBeenCalled();
    expect(count('/api/display/color-polish')).toBe(1);
    await advance(60_001);
    expect(probes.phases).not.toContain('scheduled');
    expect(probes.fallback).not.toHaveBeenCalled();
    await advance(539_999);
    expect(count('/api/display/color-polish')).toBe(2);
    expect(count('/api/display/snapshot')).toBe(0);
    expect(count('/api/display/daily')).toBe(0);
    expect(count('/api/reactions')).toBe(1);
    expect(probes.fallback).not.toHaveBeenCalled();
  });

  it('clears retained TV content after a genuine scheduled refresh failure', async () => {
    await mount(createElement(ColorPolishHost));
    await advance(60_000);
    expect(probes.phases).not.toContain('unavailable');
    failTV = true;
    await advance(540_250);
    expect(probes.phases).toContain('unavailable');
    expect(probes.fallback).not.toHaveBeenCalled();
  });

  it('refreshes at fast-window entry and applies a newly received quiet mode', async () => {
    setTime('2026-09-12T15:59:00Z'); // Saturday 08:59
    await mount(createElement(ColorPolishHost));
    nextTVSnapshot.settings.mode = 'quiet';
    nextTVSnapshot.recognitions = [];
    nextTVSnapshot.arrivals = [];
    await advance(60_000);
    expect(count('/api/display/color-polish')).toBe(2);
    expect(probes.phases).toContain('quiet');
    expect(probes.fallback).not.toHaveBeenCalled();
  });

  it('does not start a faster fallback loop after an off-hours network failure', async () => {
    failTV = true;
    await mount(createElement(ColorPolishHost));
    expect(probes.phases).toContain('unavailable');
    await advance(599_999);
    expect(count('/api/display/color-polish')).toBe(1);
    expect(probes.fallback).not.toHaveBeenCalled();
    await advance(1);
    expect(count('/api/display/color-polish')).toBe(2);
  });

  it('retains an initial overnight verification without recovery requests', async () => {
    setTime('2026-09-11T09:00:00Z'); // 02:00 Friday
    await mount(createElement(ColorPolishHost));
    await advance(61_000);
    const initialReads = requests.length;
    await hide(true); await hide(false);
    await advance(60_000);
    expect(requests).toHaveLength(initialReads);
    expect(probes.phases).not.toContain('scheduled');
    expect(probes.fallback).not.toHaveBeenCalled();
  });

  it('retains the last TV frame through overnight sleep and coalesces 07:00 wake events', async () => {
    await mount(createElement(ColorPolishHost));
    const before = requests.length;
    setTime('2026-09-11T09:00:00Z'); // Wall clock advances while performance time is frozen.
    await act(async () => { page.dispatchEvent(new Event('pageshow')); });
    expect(probes.phases).not.toContain('scheduled');
    expect(requests).toHaveLength(before);
    expect(probes.fallback).not.toHaveBeenCalled();
    setTime('2026-09-11T14:00:00Z');
    await act(async () => {
      page.dispatchEvent(new Event('pageshow'));
      page.dispatchEvent(new Event('focus'));
    });
    expect(count('/api/display/color-polish')).toBe(2);
  });
});

describe('homepage refreshes and explicit user actions', () => {
  let feed: ReturnType<typeof usePublicFeed>;
  function Probe() { feed = usePublicFeed(); return null; }
  const openFeed = () => mount(<PublicFeedProvider><Probe /></PublicFeedProvider>);

  it('does not start linked automatic reads when an in-flight feed poll finishes after midnight', async () => {
    setTime('2026-09-11T06:49:59Z'); // Thursday 23:49:59 Pacific
    const originalFetch = fetch;
    let release: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (new URL(url, 'https://synthetic.invalid').pathname === '/api/feed' && count('/api/feed') === 1) {
        requests.push({ path: '/api/feed', method: 'GET' });
        return new Promise<Response>((resolve) => { release = resolve; });
      }
      return originalFetch(url, init);
    }));
    await openFeed();
    expect(count('/api/reactions')).toBe(1);
    await advance(600_000); // Last recurring poll starts just before midnight.
    expect(count('/api/feed')).toBe(2);
    await advance(2_000);
    await act(async () => {
      release?.({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => payload } as Response);
    });
    expect(count('/api/reactions')).toBe(1);
    await advance(300_000);
    expect(count('/api/feed')).toBe(2);
    expect(count('/api/reactions')).toBe(1);
    expect(feed.items).toHaveLength(1);
  });

  it('stops a multi-page automatic older refresh when the fast window ends', async () => {
    setTime('2026-09-13T04:59:49Z'); // Saturday 21:59:49 Pacific
    const items = (start: number) => Array.from({ length: 100 }, (_, n) => ({
      ...item, id: `synthetic-older-${start + n}`,
      firstPublishedAt: new Date(Date.parse(item.firstPublishedAt) - (start + n) * 1_000).toISOString(),
    }));
    nextFeedPayload = { ...payload, items: items(0) };
    const originalFetch = fetch;
    let olderReads = 0;
    let release: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (new URL(url, 'https://synthetic.invalid').pathname !== '/api/feed/older') return originalFetch(url, init);
      requests.push({ path: '/api/feed/older', method: 'GET' });
      olderReads++;
      if (olderReads === 3) return new Promise<Response>((resolve) => { release = resolve; });
      return Promise.resolve({ ok: true, status: 200, headers: new Headers(), json: async () => ({ ...payload, items: items(olderReads * 100) }) } as Response);
    }));
    await openFeed();
    await act(async () => { feed.loadOlder(); });
    await act(async () => { feed.loadOlder(); });
    expect(feed.olderItems).toHaveLength(200);
    await advance(10_000); // Automatic first page begins one second before 22:00.
    expect(olderReads).toBe(3);
    await advance(2_000);
    await act(async () => {
      release?.({ ok: true, status: 200, headers: new Headers(), json: async () => ({ ...payload, items: items(100) }) } as Response);
    });
    expect(olderReads).toBe(3); // No second automatic page after the boundary.
    expect(feed.olderItems).toHaveLength(200);
  });

  it('retains feed/reactions between scheduled rounds and across hidden off-hours', async () => {
    await openFeed();
    expect(feed.items).toHaveLength(1);
    expect(count('/api/feed')).toBe(1); expect(count('/api/reactions')).toBe(1);
    await advance(60_000);
    expect(feed.status).toBe('ready'); expect(feed.items).toHaveLength(1); expect(Object.keys(feed.reactions)).toHaveLength(1);
    await hide(true); await hide(false);
    expect(count('/api/feed')).toBe(1);
    await advance(540_000);
    expect(count('/api/feed')).toBe(2); expect(count('/api/reactions')).toBe(2);
    expect(feed.items).toHaveLength(1);
  });

  it('removes retained homepage content on the next authoritative scheduled refresh', async () => {
    await openFeed();
    await advance(599_999);
    expect(feed.items).toHaveLength(1);
    nextFeedPayload = { ...payload, items: [] };
    await advance(1);
    expect(feed.items).toEqual([]);
    expect(feed.reactions).toEqual({});
  });

  it('retains homepage content overnight and refreshes once at 07:00', async () => {
    setTime('2026-09-11T09:00:00Z');
    await openFeed();
    setTime('2026-09-11T13:59:59.999Z');
    await act(async () => { page.dispatchEvent(new Event('pageshow')); });
    expect(feed.items).toHaveLength(1);
    expect(count('/api/feed')).toBe(1);
    await advance(1);
    expect(count('/api/feed')).toBe(2);
  });

  it('expires retained homepage content after sleep without an overnight read', async () => {
    setTime('2026-09-11T09:00:00Z');
    nextFeedPayload = { ...payload, items: [{ ...item, expiresAt: '2026-09-10T18:01:00Z' }] };
    await openFeed();
    expect(feed.items).toHaveLength(1);
    setTime('2026-09-11T10:00:00Z');
    await act(async () => { page.dispatchEvent(new Event('pageshow')); });
    expect(feed.items).toEqual([]);
    expect(count('/api/feed')).toBe(1);
  });

  it('preserves manual refresh and like actions overnight without starting retry polling', async () => {
    setTime('2026-09-11T09:00:00Z');
    await openFeed(); await advance(61_000);
    const before = count('/api/feed');
    await act(async () => { feed.retry(); });
    expect(count('/api/feed')).toBe(before + 1); expect(feed.items).toHaveLength(1);
    await act(async () => { feed.toggleReaction(feed.items[0]); });
    expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(1);
    await advance(120_000);
    expect(count('/api/feed')).toBe(before + 1);
  });

  it('stops all recurring reads on unmount', async () => {
    const root = await openFeed();
    await act(async () => root.unmount()); roots = [];
    const before = requests.length;
    await advance(600_000);
    expect(requests).toHaveLength(before);
  });
});

it('build checks make no overnight requests and resume slowly at 07:00', async () => {
  setTime('2026-09-11T13:59:50Z');
  await mount(createElement(DisplayBuildWatch));
  expect(count('/api/display/build')).toBe(0);
  await advance(10_000);
  expect(count('/api/display/build')).toBe(1);
  await advance(600_000);
  expect(count('/api/display/build')).toBe(2);
});

it('bounds a slow build check and prevents overlapping requests or unmount retries', async () => {
  setTime('2026-09-12T16:00:00Z');
  let signal: AbortSignal | undefined | null;
  const pending = vi.fn((_url: string, init?: RequestInit) => {
    signal = init?.signal;
    return new Promise(() => {});
  });
  vi.stubGlobal('fetch', pending);
  const root = await mount(createElement(DisplayBuildWatch));
  await advance(300_000);
  expect(pending).toHaveBeenCalledTimes(1);
  await advance(9_000);
  expect(signal?.aborted).toBe(true);
  await advance(600_000);
  expect(pending).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount()); roots = [];
  await advance(300_000);
  expect(pending).toHaveBeenCalledTimes(1);
});
