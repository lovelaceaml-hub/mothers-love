"use client";
import { useEffect, useState } from "react";
import {
  emptyFeed,
  sampleWorldFeed,
  WorldFeedStore,
  type WorldFeed,
  type WorldSource,
} from "./world-feed";

export function useWorldFeed(source: WorldSource): WorldFeed {
  const [feed, setFeed] = useState<WorldFeed>(() => sampleWorldFeed());
  useEffect(() => {
    let alive = true,
      controller: AbortController | null = null;
    const store = new WorldFeedStore();
    const publish = () => {
      if (alive) {
        setFeed(store.view(performance.now()));
        store.consumeArrivals();
      }
    };
    if (source === "sample") {
      queueMicrotask(() => {
        if (alive) setFeed(sampleWorldFeed());
      });
      return () => {
        alive = false;
      };
    }
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
    const poll = window.setInterval(() => void load(), 5000);
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
      store.clear();
    };
  }, [source]);
  // The render during a source switch must never reuse personal/sample content from the previous source.
  if (source === "live" && feed.phase === "sample") return emptyFeed();
  if (source === "sample" && feed.phase !== "sample") return sampleWorldFeed();
  return feed;
}
