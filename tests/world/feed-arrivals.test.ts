import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useWorldFeed } from "@/components/display/world/use-world-feed";
import {
  STALE_MS,
  WorldFeedStore,
  sampleWorldFeed,
  type FeedPhase,
  type WorldFeed,
  type WorldSource,
} from "@/components/display/world/world-feed";
import { snapshot } from "./fixtures";

// Fictional records only: the sample recognitions the fixtures already use.
const records = sampleWorldFeed().records;
const arriving = records[0];
const arrival = (eventId: string, record = arriving) => ({
  eventId,
  recognitionId: record.id,
  publishedAt: record.firstPublishedAt!,
});
const delta = (overrides: Record<string, unknown> = {}) =>
  snapshot({ sync: "delta", ...overrides });

/*
 * The hook runs under React itself. Node has no DOM, so React is given the little it touches
 * for a component that renders nothing, and `act` holds every update until its scope ends,
 * exactly as a slow TV does when a poll and the half second tick both land before a render.
 */
type Harness = {
  committed: WorldFeed[];
  answer: (payload: unknown, status?: number) => void;
  setSource: (source: WorldSource) => Promise<void>;
  hide: (hidden: boolean) => Promise<void>;
  unmount: () => Promise<void>;
};
async function mountFeed(source: WorldSource = "live"): Promise<Harness> {
  const answers: Array<{ payload: unknown; status: number }> = [];
  const listeners = new Set<() => void>();
  const document = {
    hidden: false,
    activeElement: null,
    body: null,
    addEventListener: (type: string, listener: () => void) => {
      if (type === "visibilitychange") listeners.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === "visibilitychange") listeners.delete(listener);
    },
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", {
    document,
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (id: number) => clearInterval(id),
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (id: number) => clearTimeout(id),
    HTMLIFrameElement: class {},
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const next = answers.shift() ?? { payload: null, status: 503 };
      return {
        ok: next.status >= 200 && next.status < 300,
        status: next.status,
        headers: new Headers(),
        json: async () => structuredClone(next.payload),
      };
    }),
  );
  const committed: WorldFeed[] = [];
  // The engine takes each committed feed in an effect keyed on it; so does this probe.
  function Probe({ source }: { source: WorldSource }) {
    const feed = useWorldFeed(source);
    useEffect(() => {
      committed.push(feed);
    }, [feed]);
    return null;
  }
  const container = {
    nodeType: 1,
    nodeName: "DIV",
    tagName: "DIV",
    ownerDocument: document,
    textContent: "",
    addEventListener() {},
    removeEventListener() {},
  };
  let root: Root;
  answers.push({ payload: snapshot(), status: 200 });
  await act(async () => {
    root = createRoot(container as unknown as Element);
    root.render(createElement(Probe, { source }));
  });
  return {
    committed,
    answer: (payload, status = 200) => answers.push({ payload, status }),
    setSource: (next) =>
      act(async () => root.render(createElement(Probe, { source: next }))),
    hide: (hidden) =>
      act(async () => {
        document.hidden = hidden;
        listeners.forEach((listener) => listener());
      }),
    unmount: () => act(async () => root.unmount()),
  };
}
const last = (harness: Harness) => harness.committed[harness.committed.length - 1];
const delivered = (harness: Harness, id = arriving.id) =>
  harness.committed.filter((feed) => feed.arrivals.includes(id)).length;
/** One render after everything `run` publishes, as when React is slower than the feed. */
const beforeOneRender = (run: () => Promise<unknown>) => act(async () => void (await run()));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-10T16:00:00Z'));
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
});

describe("an arrival reaches the engine once, even when two publishes share a render", () => {
  it("allows explicit live-source selection overnight without starting recurring polling", async () => {
    vi.setSystemTime(new Date('2026-10-13T09:00:00Z'));
    const harness = await mountFeed('sample');
    expect(fetch).not.toHaveBeenCalled();
    await harness.setSource('live');
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(last(harness).records).not.toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await harness.setSource('sample');
    harness.answer(snapshot());
    await harness.setSource('live');
    expect(fetch).toHaveBeenCalledTimes(2);
    await harness.unmount();
  });

  it("keeps the entrance when a poll and the half second tick land before one render", async () => {
    const harness = await mountFeed();
    expect(last(harness).phase).toBe("live");
    expect(last(harness).arrivals).toEqual([]);
    harness.answer(delta({ arrivals: [arrival("101")] }));
    await beforeOneRender(async () => {
      // The poll at 5 s publishes a view carrying the arrival, then the tick publishes again.
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(last(harness).arrivals).toEqual([arriving.id]);
    expect(delivered(harness)).toBe(1);
    // Later ticks and polls never replay it.
    harness.answer(delta({ arrivals: [arrival("101")] }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(6000)));
    expect(last(harness).arrivals).toEqual([]);
    expect(delivered(harness)).toBe(1);
    await harness.unmount();
  });

  it("delivers an arrival committed at once exactly once, with every later view empty", async () => {
    const harness = await mountFeed();
    harness.answer(delta({ arrivals: [arrival("102")] }));
    await act(async () => void (await vi.advanceTimersByTimeAsync(5000)));
    expect(delivered(harness)).toBe(1);
    for (let tick = 0; tick < 4; tick++)
      await act(async () => void (await vi.advanceTimersByTimeAsync(500)));
    expect(delivered(harness)).toBe(1);
    expect(last(harness).arrivals).toEqual([]);
    await harness.unmount();
  });

  it("drops an uncommitted arrival when quiet lands before the render, and never replays it", async () => {
    const harness = await mountFeed();
    harness.answer(delta({ arrivals: [arrival("103")] }));
    const quiet = delta({ recognitions: [], arrivals: [] });
    harness.answer({ ...quiet, settings: { ...quiet.settings, mode: "quiet" } });
    await beforeOneRender(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(last(harness).phase).toBe("quiet");
    expect(last(harness).records).toEqual([]);
    expect(last(harness).arrivals).toEqual([]);
    // Back to normal: a fresh baseline, and the old arrival is not replayed.
    harness.answer(snapshot());
    harness.answer(delta());
    await act(async () => void (await vi.advanceTimersByTimeAsync(10_000)));
    expect(last(harness).phase).toBe("live");
    expect(delivered(harness)).toBe(0);
    await harness.unmount();
  });

  it("drops an uncommitted arrival whose record is withdrawn before the render", async () => {
    const harness = await mountFeed();
    harness.answer(delta({ arrivals: [arrival("104")] }));
    harness.answer(delta({ recognitions: records.slice(1) }));
    await beforeOneRender(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(last(harness).records.map((record) => record.id)).not.toContain(arriving.id);
    expect(last(harness).arrivals).toEqual([]);
    // The record comes back with no new arrival event: its old entrance stays gone.
    harness.answer(delta());
    await act(async () => void (await vi.advanceTimersByTimeAsync(5000)));
    expect(last(harness).records.map((record) => record.id)).toContain(arriving.id);
    expect(delivered(harness)).toBe(0);
    await harness.unmount();
  });

  it("drops an uncommitted arrival when the page is hidden before the render", async () => {
    const harness = await mountFeed();
    harness.answer(delta({ arrivals: [arrival("105")] }));
    await beforeOneRender(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await harness.hide(true);
    });
    expect(last(harness).phase).toBe("connecting");
    expect(last(harness).records).toEqual([]);
    expect(delivered(harness)).toBe(0);
    await harness.unmount();
  });

  it("drops an uncommitted arrival on a switch to the sample source", async () => {
    const harness = await mountFeed();
    harness.answer(delta({ arrivals: [arrival("106")] }));
    await beforeOneRender(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await harness.setSource("sample");
    });
    expect(last(harness).phase).toBe("sample");
    expect(last(harness).arrivals).toEqual([]);
    expect(delivered(harness)).toBe(0);
    // Back to live starts from a new baseline with nothing carried over.
    harness.answer(snapshot());
    harness.answer(delta());
    await harness.setSource("live");
    await act(async () => void (await vi.advanceTimersByTimeAsync(5500)));
    expect(last(harness).phase).toBe("live");
    expect(delivered(harness)).toBe(0);
    await harness.unmount();
  });
});

describe("the store lets an arrival go only once a committed view carried it", () => {
  /** A store with one fresh arrival handed out in a view that React has not committed. */
  function handedOut() {
    const store = new WorldFeedStore();
    store.accept(snapshot(), 0);
    store.accept(delta({ arrivals: [arrival("201")] }), 5000);
    expect(store.view(5000).arrivals).toEqual([arriving.id]);
    return store;
  }

  it("carries it into every later view until it is confirmed, then never again", () => {
    const store = handedOut();
    expect(store.view(5500).arrivals).toEqual([arriving.id]);
    store.confirmArrivals(store.view(6000).arrivals);
    expect(store.view(6500).arrivals).toEqual([]);
    store.accept(delta({ arrivals: [arrival("201")] }), 10_000);
    expect(store.view(10_000).arrivals).toEqual([]);
  });

  it("confirms only what the committed view carried", () => {
    const store = handedOut();
    const committed = store.view(5500);
    store.accept(delta({ arrivals: [arrival("202", records[1])] }), 6000);
    store.confirmArrivals(committed.arrivals);
    expect(store.view(6000).arrivals).toEqual([records[1].id]);
  });

  /** Straight back to a normal answer carrying every record, with no view in between. */
  function backWithoutAView(store: WorldFeedStore, at: number) {
    store.accept(delta(), at);
    const view = store.view(at);
    expect(view.phase).toBe("live");
    expect(view.records.map((record) => record.id)).toContain(arriving.id);
    return view;
  }

  it("clears it at once for quiet, neutral and disabled", () => {
    for (const mode of ["quiet", "neutral", "disabled"] as const) {
      const value = delta({ recognitions: [], arrivals: [] });
      const unsafe =
        mode === "disabled"
          ? { ...value, presentation: { ...value.presentation, enabled: false } }
          : { ...value, settings: { ...value.settings, mode } };
      const store = handedOut();
      store.accept(unsafe, 6000);
      const view = store.view(6000);
      expect(view.phase).toBe(mode);
      expect(view.records).toEqual([]);
      expect(view.arrivals).toEqual([]);
      // The unsafe answer itself lets go of it, not only the next view.
      const next = handedOut();
      next.accept(unsafe, 6000);
      expect(backWithoutAView(next, 7000).arrivals).toEqual([]);
    }
  });

  it("clears it at once when the feed is unavailable, connecting or switched away", () => {
    const unsafe: Array<[FeedPhase, (store: WorldFeedStore) => void]> = [
      ["unavailable", (store) => store.accept({ invalid: true }, 6000)],
      ["unavailable", (store) => store.failure(true)],
      // The page was hidden.
      ["connecting", (store) => store.clear("connecting")],
      // A source switch or the page closing.
      ["connecting", (store) => store.clear()],
    ];
    for (const [phase, leave] of unsafe) {
      const store = handedOut();
      leave(store);
      const view = store.view(6000);
      expect(view.phase).toBe(phase);
      expect(view.records).toEqual([]);
      expect(view.arrivals).toEqual([]);
      const next = handedOut();
      leave(next);
      expect(backWithoutAView(next, 7000).arrivals).toEqual([]);
    }
  });

  it("keeps it through a short outage and clears it once the last good answer is stale", () => {
    const store = handedOut();
    store.failure();
    expect(store.view(5000 + STALE_MS - 1).phase).toBe("reconnecting");
    expect(store.view(5000 + STALE_MS - 1).arrivals).toEqual([arriving.id]);
    const view = store.view(5000 + STALE_MS);
    expect(view.phase).toBe("unavailable");
    expect(view.records).toEqual([]);
    expect(view.arrivals).toEqual([]);
    expect(backWithoutAView(store, 5000 + STALE_MS).arrivals).toEqual([]);
  });

  it("drops it when its record is withdrawn or expires, and a returning record never replays it", () => {
    const store = handedOut();
    store.accept(delta({ recognitions: records.slice(1) }), 6000);
    expect(store.view(6000).arrivals).toEqual([]);
    store.accept(delta(), 7000);
    expect(store.view(7000).records.map((record) => record.id)).toContain(arriving.id);
    expect(store.view(7000).arrivals).toEqual([]);

    const expiring = handedOut();
    const value = delta();
    expiring.accept(
      {
        ...value,
        recognitions: value.recognitions.map((record) =>
          record.id === arriving.id
            ? { ...record, expiresAt: new Date(Date.parse(value.serverTime) + 1000).toISOString() }
            : record,
        ),
      },
      6000,
    );
    expect(expiring.view(8000).records.map((record) => record.id)).not.toContain(arriving.id);
    expect(expiring.view(8000).arrivals).toEqual([]);
  });

  it("drops it when arrivals are paused or the server resets the feed", () => {
    const paused = handedOut();
    const value = delta();
    paused.accept({ ...value, settings: { ...value.settings, pauseArrivals: true } }, 6000);
    expect(paused.view(6000).arrivals).toEqual([]);
    const reset = handedOut();
    reset.accept(snapshot(), 6000);
    expect(reset.view(6000).arrivals).toEqual([]);
  });
});
