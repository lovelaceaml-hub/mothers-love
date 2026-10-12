"use client";
import { createPollingState, snapshotFreshnessRequired } from "@/lib/polling-schedule";
import { startVisiblePoll } from "@/lib/visible-poll";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  emptyFeed,
  sampleWorldFeed,
  WorldFeedStore,
  type WorldFeed,
  type WorldSource,
} from "./world-feed";

export function useWorldFeed(source: WorldSource): WorldFeed {
  const [feed, setFeed] = useState<WorldFeed>(() => sampleWorldFeed());
  const live = useRef<WorldFeedStore | null>(null);
  const pollStateRef = useRef(createPollingState());
  const previousSourceRef = useRef(source);
  // A poll's publish and the half second tick can both land before one render, and only the
  // last view is committed. So each view carries every arrival not yet committed, and the
  // store lets go of them here, during the commit itself: no later publish can build a view
  // in between, so a committed arrival is never carried into a second view and replayed.
  useLayoutEffect(() => {
    live.current?.confirmArrivals(feed.arrivals);
  }, [feed]);
  useEffect(() => {
    // Explicit source selection gets its own initial read, including overnight.
    if (previousSourceRef.current !== source) {
      previousSourceRef.current = source;
      pollStateRef.current = createPollingState();
    }
    let alive = true,
      controller: AbortController | null = null;
    const store = new WorldFeedStore();
    let lastVerifiedWallMs: number | null = null;
    let lastVerifiedMonotonicMs = 0;
    const publish = () => {
      if (!alive) return;
      const localNow = Math.max(performance.now(), lastVerifiedWallMs === null ? 0 : lastVerifiedMonotonicMs + Math.max(0, Date.now() - lastVerifiedWallMs));
      let view = store.view(localNow, !snapshotFreshnessRequired());
      if ((snapshotFreshnessRequired() || view.phase === "reconnecting") && lastVerifiedWallMs !== null && Date.now() - lastVerifiedWallMs >= 60_000 && view.records.length) {
        store.clear('unavailable');
        view = store.view(performance.now(), !snapshotFreshnessRequired());
      }
      setFeed(view);
    };
    if (source === "sample") {
      queueMicrotask(() => {
        if (alive) setFeed(sampleWorldFeed());
      });
      return () => {
        alive = false;
      };
    }
    live.current = store;
    queueMicrotask(() => {
      if (alive) setFeed(emptyFeed());
    });
    async function load() {
      if (!alive || document.hidden || controller) return;
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 9000);
      try {
        const query = store.cursor
          ? `?after=${encodeURIComponent(store.cursor)}`
          : "";
        const headers: Record<string, string> = { accept: "application/json" };
        if (store.hash && store.cursor) headers["If-None-Match"] = `"${store.hash}"`;
        const response = await fetch(`/api/display/color-polish${query}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers,
          signal: request.signal,
        });
        if (!alive || controller !== request) return;
        if (!response.ok) {
          store.failure(response.status === 401 || response.status === 403);
        } else {
          let payload: unknown;
          try {
            payload = await response.json();
          } catch {
            if (alive && controller === request) store.failure(true);
            return;
          }
          if (!alive || controller !== request) return;
          const isHeartbeat = typeof payload === "object" && payload !== null && "unchanged" in payload;
          const accepted = isHeartbeat
            ? store.acceptHeartbeat(payload, performance.now())
            : store.accept(payload, performance.now());
          if (accepted) { lastVerifiedWallMs = Date.now(); lastVerifiedMonotonicMs = performance.now(); }
          if (accepted && store.cursor) {
            const tag = /^"([a-f0-9]{32})"$/.exec(response.headers.get("etag") ?? "");
            store.hash = tag?.[1] ?? null;
          }
        }
      } catch {
        if (alive && controller === request) store.failure();
      } finally {
        window.clearTimeout(timeout);
        if (controller === request) controller = null;
        publish();
      }
    }
    const tick = window.setInterval(publish, 500);
    const visibility = () => {
      // Clear before the browser can display an old personal frame after a hidden gap.
      if (snapshotFreshnessRequired()) store.clear("connecting");
      controller?.abort();
      controller = null;
      publish();
    };
    document.addEventListener("visibilitychange", visibility);
    const stopPolling = startVisiblePoll(() => void load(), 5_000, publish, { state: pollStateRef.current });
    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(tick);
      stopPolling();
      if (lastVerifiedWallMs === null) pollStateRef.current = createPollingState();
      document.removeEventListener("visibilitychange", visibility);
      if (live.current === store) live.current = null;
      store.clear();
    };
  }, [source]);
  // The render during a source switch must never reuse personal/sample content from the previous source.
  if (source === "live" && feed.phase === "sample") return emptyFeed();
  if (source === "sample" && feed.phase !== "sample") return sampleWorldFeed();
  return feed;
}
