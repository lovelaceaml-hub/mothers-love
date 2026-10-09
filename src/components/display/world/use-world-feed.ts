"use client";
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
  // A poll's publish and the half second tick can both land before one render, and only the
  // last view is committed. So each view carries every arrival not yet committed, and the
  // store lets go of them here, during the commit itself: no later publish can build a view
  // in between, so a committed arrival is never carried into a second view and replayed.
  useLayoutEffect(() => {
    live.current?.confirmArrivals(feed.arrivals);
  }, [feed]);
  useEffect(() => {
    let alive = true,
      controller: AbortController | null = null;
    const store = new WorldFeedStore();
    const publish = () => {
      if (alive) setFeed(store.view(performance.now()));
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
        const response = await fetch(`/api/display/color-polish${query}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { accept: "application/json" },
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
          store.accept(payload, performance.now());
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
    // The full recognition snapshot is sizeable; a ten-second refresh preserves live updates
    // without continuously re-transferring it every five seconds.
    const poll = window.setInterval(() => void load(), 10_000);
    const visibility = () => {
      // Clear before the browser can display an old personal frame after a hidden gap.
      store.clear("connecting");
      controller?.abort();
      controller = null;
      publish();
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visibility);
    void load();
    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(tick);
      window.clearInterval(poll);
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
