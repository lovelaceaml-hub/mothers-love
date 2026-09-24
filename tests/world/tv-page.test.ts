import { describe, expect, it } from "vitest";
import type { Recognition } from "@/lib/contracts";
import { WorldFeedStore } from "@/components/display/world/world-feed";
import { TOUR_ORDER } from "@/components/display/world/world-data";
import {
  ARRIVAL_INTERVAL,
  ArrivalPacer,
  heldBig,
  newestFirst,
  planWorldBubbles,
  sampleHeartCount,
  studyTvPage,
  tickerItems,
  tourLoopSeconds,
  tvRecords,
  worldHoldSeconds,
} from "@/components/display/world/art/tv-page";
import { snapshot } from "./fixtures";
import { tvPlaceHold } from "@/components/display/world/art/tv-places";

/** Fictional records only: numbered names and plain sample words. */
function records(count: number): Recognition[] {
  const base = Date.parse("2026-09-10T17:00:00.000Z");
  return Array.from({ length: count }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    recipient: `Sample ${i + 1}`,
    message: `Sample message number ${i + 1}. Thank you for your kindness.`,
    expressionIds: [(i % 9) + 1],
    createdAt: new Date(base - 86_400_000).toISOString(),
    // Record 1 is the newest.
    firstPublishedAt: new Date(base - i * 60_000).toISOString(),
    expiresAt: new Date(base + 7 * 86_400_000).toISOString(),
    version: 1,
    status: "published",
    featured: false,
  }));
}
const ids = (list: readonly { id: string }[]) => list.map((record) => record.id);
const everyShown = (plan: ReturnType<typeof planWorldBubbles>) =>
  [...plan.places.values()].flatMap((place) => [...place.big, ...place.small]);

describe("TV page gate", () => {
  it("is the design look's default view at /world, live and sample, unless view=explore (Plan 28 Section 5)", () => {
    expect(studyTvPage("")).toBe(true);
    expect(studyTvPage("?source=sample")).toBe(true);
    expect(studyTvPage("?art=design&source=sample&view=tv")).toBe(true);
    expect(studyTvPage("?art=design&source=live&view=tv")).toBe(true);
    expect(studyTvPage("?art=design&art=design&source=sample&view=tv")).toBe(true);
    expect(studyTvPage("?view=explore")).toBe(false);
    expect(studyTvPage("?art=design&source=sample&view=explore")).toBe(false);
    expect(studyTvPage("?art=classic&source=sample&view=tv")).toBe(false);
    expect(studyTvPage("?art=cinematic")).toBe(false);
  });
  it("is never on without a browser", () => {
    expect(studyTvPage()).toBe(false);
  });
});

describe("hold time", () => {
  it("is 12 s, plus 1 s per 20 characters over 160, at most 20 s", () => {
    expect(worldHoldSeconds("a".repeat(40))).toBe(12);
    expect(worldHoldSeconds("a".repeat(160))).toBe(12);
    expect(worldHoldSeconds("a".repeat(180))).toBe(13);
    expect(worldHoldSeconds("a".repeat(260))).toBe(17);
    expect(worldHoldSeconds("a".repeat(320))).toBe(20);
    expect(worldHoldSeconds("a".repeat(500))).toBe(20);
  });
  it("counts an emoji family once", () => {
    expect(worldHoldSeconds("a".repeat(160) + "👩‍👩‍👧‍👦".repeat(20))).toBe(13);
  });
  it("keeps one loop of 13 places under about 6 minutes, the camera's glide in and out included", () => {
    // Each place's own hold, the River's stream included.
    const everyday = records(13).map((record, i) => tvPlaceHold(record.message, TOUR_ORDER[i]));
    expect(tourLoopSeconds(everyday)).toBeLessThan(6 * 60);
    // Twelve 200 character messages and one at the 20 s cap stay about there.
    const long = TOUR_ORDER.map((place, i) => tvPlaceHold("a".repeat(i ? 200 : 500), place));
    expect(tourLoopSeconds(long)).toBeLessThan(6.5 * 60);
  });
});

describe("bubble placement", () => {
  it("shows nothing with no records", () => {
    const plan = planWorldBubbles([]);
    expect(everyShown(plan)).toEqual([]);
    expect(heldBig(plan, "garden", 0)).toBeUndefined();
  });
  it("repeats one record everywhere when it is the only one", () => {
    const plan = planWorldBubbles(records(1));
    for (const place of TOUR_ORDER) {
      expect(plan.places.get(place)!.big).toHaveLength(1);
      expect(plan.places.get(place)!.small).toHaveLength(4);
    }
    expect(new Set(ids(everyShown(plan)))).toEqual(new Set(ids(records(1))));
  });
  it("gives every place 2 big and 4 small bubbles with 3 records, the newest in the first places", () => {
    const list = records(3);
    const plan = planWorldBubbles([...list].reverse());
    const welcome = plan.places.get("welcome")!;
    expect(welcome.big[0].id).toBe(list[0].id);
    expect(plan.places.get(TOUR_ORDER[1])!.big[0].id).toBe(list[1].id);
    for (const place of TOUR_ORDER) {
      const item = plan.places.get(place)!;
      expect(item.big).toHaveLength(2);
      expect(item.small).toHaveLength(4);
      expect(item.big[0].id).not.toBe(item.big[1].id);
    }
  });
  it("uses the newest 100 of 100 and of 150, 2 big and 8 small per place, no repeat inside a place", () => {
    for (const count of [100, 150]) {
      const list = records(count);
      const plan = planWorldBubbles(list);
      const allowed = new Set(ids(list.slice(0, 100)));
      for (const record of everyShown(plan)) expect(allowed.has(record.id)).toBe(true);
      // The 26 big bubbles are the 26 newest records.
      const bigs = TOUR_ORDER.flatMap((place) => plan.places.get(place)!.big);
      expect(new Set(ids(bigs))).toEqual(new Set(ids(list.slice(0, 26))));
      for (const place of TOUR_ORDER) {
        const item = plan.places.get(place)!;
        expect(item.big).toHaveLength(2);
        expect(item.small).toHaveLength(8);
        const shown = ids([...item.big, ...item.small]);
        expect(new Set(shown).size).toBe(shown.length);
      }
      // Only the places hold bubbles: the corridors between them carry none.
      expect(Object.keys(plan)).toEqual(["places"]);
    }
  });
  it("holds the first big bubble on one loop and the second on the next", () => {
    const plan = planWorldBubbles(records(3));
    const garden = plan.places.get("garden")!;
    expect(heldBig(plan, "garden", 0)).toBe(garden.big[0]);
    expect(heldBig(plan, "garden", 1)).toBe(garden.big[1]);
    expect(heldBig(plan, "garden", 2)).toBe(garden.big[0]);
  });
  it("orders newest first and caps at 100 with each id once", () => {
    const list = records(150);
    expect(ids(newestFirst([...list].reverse()))).toEqual(ids(list));
    expect(tvRecords([...list, ...list])).toHaveLength(100);
  });
});

describe("arrival pacing", () => {
  it("lets one arrival interrupt per 60 s, in order, and keeps at most 10 waiting", () => {
    const pacer = new ArrivalPacer();
    const list = ids(records(12));
    pacer.offer(list);
    expect(pacer.pending).toEqual(list.slice(-10));
    expect(pacer.next(0)).toBe(list[2]);
    expect(pacer.next(30)).toBeNull();
    expect(pacer.next(ARRIVAL_INTERVAL - 0.01)).toBeNull();
    expect(pacer.next(ARRIVAL_INTERVAL)).toBe(list[3]);
  });
  it("after 3 interruptions in a row waits for the tour to complete a place", () => {
    const pacer = new ArrivalPacer();
    pacer.offer(ids(records(5)));
    expect(pacer.next(0)).not.toBeNull();
    expect(pacer.next(60)).not.toBeNull();
    expect(pacer.next(120)).not.toBeNull();
    expect(pacer.next(180)).toBeNull();
    expect(pacer.next(600)).toBeNull();
    pacer.placeCompleted();
    expect(pacer.next(600)).not.toBeNull();
  });
  it("keeps the 60 s spacing across a reconnect", () => {
    const pacer = new ArrivalPacer();
    pacer.offer(ids(records(3)));
    expect(pacer.next(0)).not.toBeNull();
    pacer.clear();
    pacer.offer(ids(records(3)).slice(1));
    expect(pacer.next(30)).toBeNull();
    expect(pacer.next(60)).not.toBeNull();
  });
  it("ends the streak after two quiet minutes while rotation is paused", () => {
    const pacer = new ArrivalPacer();
    pacer.offer(ids(records(5)));
    for (const at of [0, 60, 120]) expect(pacer.next(at, true)).not.toBeNull();
    expect(pacer.next(180, true)).toBeNull();
    expect(pacer.next(240, true)).not.toBeNull();
  });
  it("ignores a duplicate arrival event", () => {
    const pacer = new ArrivalPacer();
    const [one] = ids(records(1));
    pacer.offer([one, one]);
    expect(pacer.pending).toEqual([one]);
    expect(pacer.next(0)).toBe(one);
    pacer.offer([one]);
    expect(pacer.pending).toEqual([]);
  });
});

describe("live feed through the store", () => {
  const eventFor = (record: Recognition, n: number) => ({
    eventId: String(1000 + n),
    recognitionId: record.id,
    publishedAt: "2026-09-10T17:59:00.000Z",
  });

  it("shows 0, 1, 3, 100 and 150 records, at most 100", () => {
    for (const count of [0, 1, 3, 100, 150]) {
      const store = new WorldFeedStore();
      expect(store.accept(snapshot({ recognitions: records(count) }), 0)).toBe(true);
      const view = store.view(0);
      expect(tickerItems(view.records)).toHaveLength(Math.min(100, count));
      expect(new Set(ids(everyShown(planWorldBubbles(view.records)))).size).toBe(Math.min(100, count));
    }
  });

  it("puts 12 arrivals in 10 s in the ticker at once and presents them one per minute", () => {
    const list = records(20);
    const store = new WorldFeedStore();
    const pacer = new ArrivalPacer();
    store.accept(snapshot({ recognitions: list }), 0);
    store.consumeArrivals();
    // Two polls, five seconds apart, carry six new arrivals each.
    for (const [poll, at] of [[0, 5000], [1, 10000]] as const) {
      const batch = list.slice(poll * 6, poll * 6 + 6);
      store.accept(snapshot({ recognitions: list, sync: "delta", arrivals: batch.map((r, i) => eventFor(r, poll * 6 + i)) }), at);
      const view = store.view(at);
      pacer.offer(view.arrivals);
      store.consumeArrivals();
      for (const record of batch) expect(ids(tickerItems(view.records))).toContain(record.id);
    }
    expect(pacer.pending).toHaveLength(10);
    const shown: string[] = [];
    for (let second = 0; second <= 600; second++) {
      const next = pacer.next(second);
      if (next) shown.push(next);
      if (shown.length % 3 === 0) pacer.placeCompleted();
    }
    expect(shown).toEqual(ids(list.slice(2, 12)));
  });

  it("ignores a duplicate arrival event", () => {
    const list = records(3);
    const store = new WorldFeedStore();
    const pacer = new ArrivalPacer();
    store.accept(snapshot({ recognitions: list }), 0);
    const event = eventFor(list[0], 1);
    for (const at of [5000, 10000]) {
      store.accept(snapshot({ recognitions: list, sync: "delta", arrivals: [event] }), at);
      pacer.offer(store.view(at).arrivals);
      store.consumeArrivals();
    }
    expect(pacer.pending).toEqual([list[0].id]);
  });

  it("clears on a malformed payload", () => {
    const store = new WorldFeedStore();
    store.accept(snapshot({ recognitions: records(3) }), 0);
    expect(store.accept({ ok: true, recognitions: "not a list" }, 1)).toBe(false);
    const view = store.view(1);
    expect(view.phase).toBe("unavailable");
    expect(tickerItems(view.records)).toEqual([]);
    expect(everyShown(planWorldBubbles(view.records))).toEqual([]);
  });

  it("keeps the last good records while offline under 60 s, then reconnects", () => {
    const list = records(3);
    const store = new WorldFeedStore();
    store.accept(snapshot({ recognitions: list }), 0);
    store.failure();
    let view = store.view(30_000);
    expect(view.phase).toBe("reconnecting");
    expect(tickerItems(view.records)).toHaveLength(3);
    store.accept(snapshot({ recognitions: list }), 35_000);
    view = store.view(35_000);
    expect(view.phase).toBe("live");
    expect(tickerItems(view.records)).toHaveLength(3);
    // Offline past 60 s clears every personal record.
    store.failure();
    view = store.view(96_000);
    expect(view.phase).toBe("unavailable");
    expect(tickerItems(view.records)).toEqual([]);
  });

  it("removes a record that leaves the snapshot from every place within one poll", () => {
    const list = records(12);
    const gone = list[0];
    const store = new WorldFeedStore();
    const pacer = new ArrivalPacer();
    store.accept(snapshot({ recognitions: list }), 0);
    store.accept(snapshot({ recognitions: list, sync: "delta", arrivals: [eventFor(gone, 1)] }), 5000);
    pacer.offer(store.view(5000).arrivals);
    store.consumeArrivals();
    expect(ids(everyShown(planWorldBubbles(store.view(5000).records)))).toContain(gone.id);
    store.accept(snapshot({ recognitions: list.slice(1), sync: "delta" }), 10_000);
    const view = store.view(10_000);
    pacer.prune(new Set(ids(view.records)));
    expect(ids(everyShown(planWorldBubbles(view.records)))).not.toContain(gone.id);
    expect(ids(tickerItems(view.records))).not.toContain(gone.id);
    expect(pacer.pending).not.toContain(gone.id);
  });
});

describe("heart count", () => {
  it("is fictional and stable in sample mode and absent live", () => {
    const [record] = records(1);
    expect(sampleHeartCount(record, true)).toBe(sampleHeartCount(record, true));
    expect(sampleHeartCount(record, true)).toBeGreaterThan(0);
    expect(sampleHeartCount(record, false)).toBeNull();
  });
});
