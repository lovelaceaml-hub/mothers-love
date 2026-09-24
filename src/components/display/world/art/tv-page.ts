import type { Recognition } from "@/lib/contracts";
import { TOUR_ORDER, type ZoneId } from "../world-data";
import { worldView } from "./design-mode";

/*
 * The world page for the church TV (PLAN-01 Section 5), built on the design study.
 *
 * Since Plan 28 Section 5 it is the default at `/world` for live and sample content alike
 * (it was opt in with `?view=tv` on the fictional sample only). `?view=explore` opens the
 * design study's explorer exactly as it was, so its review harness and captures, and
 * `?art=classic` / cinematic, never see any of this. Everything here is pure, so the rules
 * are provable in plain Node.
 */

/** Pure when a search string is supplied. The design look, unless `?view=explore`. Never on a server. */
export function studyTvPage(search?: string) {
  if (search === undefined && typeof window === "undefined") return false;
  return worldView(search) === "tv";
}

/**
 * Review aid, TV page only: `&place=<id>` starts the tour at that place instead of the Garden,
 * so each place can be opened directly on a preview link. Unknown ids are ignored.
 */
export function tvStartPlace(search?: string): ZoneId | undefined {
  const source = search ?? (typeof window === "undefined" ? "" : window.location.search);
  const place = new URLSearchParams(source).get("place");
  return TOUR_ORDER.find((id) => id === place);
}

/** Step 8: the TV tour runs at the settings panel's fastest speed, and the panel is hidden. */
export const TV_TOUR_SPEED = 2;
/**
 * Step 5: the places that show the TV page's bubbles, every one of the thirteen (Anthony,
 * 2026-09-24: "All 13 places now"): a main bubble on its lotus and a flowing one beside it
 * (`tv-places.ts`, `tv-flow.ts`).
 */
export const TV_BUBBLE_PLACES: readonly ZoneId[] = TOUR_ORDER;
/** The TV draws from the latest 100 (AGENTS.md product invariants). */
export const TV_RECORD_LIMIT = 100;

let segmenter: Intl.Segmenter | undefined;
const graphemes = (text: string) => {
  segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let count = 0;
  for (const _ of segmenter.segment(text)) count++;
  return count;
};
/** The engine asks every frame, so each message is measured once (bounded, oldest out first). */
const holdCache = new Map<string, number>();

/**
 * Step 4 hold time: 12 seconds, plus 1 second for every 20 characters past 160, at most 20.
 * A character is a grapheme, so an emoji family counts once, as the TV View counts it.
 */
export function worldHoldSeconds(message: string) {
  const cached = holdCache.get(message);
  if (cached !== undefined) return cached;
  const hold = Math.min(20, 12 + Math.max(0, graphemes(message) - 160) / 20);
  if (holdCache.size >= 256) holdCache.delete(holdCache.keys().next().value!);
  holdCache.set(message, hold);
  return hold;
}

/** The cache holds message text, so an unsafe feed, a source switch and disposal empty it. */
export function forgetWorldHolds() {
  holdCache.clear();
}
/** Keeps only the messages still in the feed, so a withdrawn, expired or edited one goes at once. */
export function keepWorldHolds(messages: ReadonlySet<string>) {
  for (const message of holdCache.keys()) if (!messages.has(message)) holdCache.delete(message);
}
/** Whether the hold cache still holds a message, for the privacy tests. */
export const worldHoldKept = (message: string) => holdCache.has(message);

/**
 * One tour loop, in seconds, for the hold at each place: the camera director's 18 s travel
 * and 20 s dwell both run at the tour speed, and a place is left only once its hold is done.
 */
export function tourLoopSeconds(holds: readonly number[], speed = TV_TOUR_SPEED) {
  return holds.reduce((total, hold) => total + 18 / speed + Math.max(20 / speed, hold), 0);
}

const published = (record: Recognition) => Date.parse(record.firstPublishedAt ?? record.createdAt) || 0;

/** Newest first by first publication, then by id so equal times keep one stable order. */
export function newestFirst(records: readonly Recognition[]): Recognition[] {
  return [...records].sort((a, b) => published(b) - published(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The records the TV page may show at all: the newest 100, each id once. */
export function tvRecords(records: readonly Recognition[]): Recognition[] {
  const seen = new Set<string>();
  return newestFirst(records).filter((record) => !seen.has(record.id) && seen.add(record.id)).slice(0, TV_RECORD_LIMIT);
}

export type PlaceBubbles = { big: Recognition[]; small: Recognition[] };
export type WorldBubblePlan = {
  places: ReadonlyMap<ZoneId, PlaceBubbles>;
};

export const SMALL_MIN = 4;
export const SMALL_MAX = 8;

/**
 * Step 5 placement. Every place gets 1 or 2 big bubbles and 4 to 8 small ones. The newest
 * records fill the big bubbles first, in tour order, so the newest of all is the first place's
 * big bubble; the small bubbles take the rest. With few records the list repeats from the
 * newest, but one place never shows the same record twice while it has enough to choose from.
 */
export function planWorldBubbles(
  records: readonly Recognition[],
  places: readonly ZoneId[] = TOUR_ORDER,
): WorldBubblePlan {
  const pool = tvRecords(records);
  const result = new Map<ZoneId, PlaceBubbles>(places.map((place) => [place, { big: [], small: [] }]));
  if (!pool.length) return { places: result };
  let cursor = 0;
  const take = (avoid: ReadonlySet<string>) => {
    for (let tries = 0; tries < pool.length; tries++) {
      const record = pool[(cursor + tries) % pool.length];
      if (!avoid.has(record.id)) {
        cursor = (cursor + tries + 1) % pool.length;
        return record;
      }
    }
    const record = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    return record;
  };
  const shown = (place: ZoneId) => {
    const item = result.get(place)!;
    return new Set([...item.big, ...item.small].map((record) => record.id));
  };
  const bigCount = pool.length >= 2 ? 2 : 1;
  for (let round = 0; round < bigCount; round++)
    for (const place of places) result.get(place)!.big.push(take(shown(place)));
  const smallCount = Math.max(SMALL_MIN, Math.min(SMALL_MAX, pool.length - bigCount));
  for (const place of places)
    for (let i = 0; i < smallCount; i++) result.get(place)!.small.push(take(shown(place)));
  return { places: result };
}

/** Step 5: each visit holds one big bubble; a place's second big bubble is held on the next loop. */
export function heldBig(plan: WorldBubblePlan, place: ZoneId, loop: number): Recognition | undefined {
  const big = plan.places.get(place)?.big ?? [];
  return big.length ? big[((loop % big.length) + big.length) % big.length] : undefined;
}

export const ARRIVAL_INTERVAL = 60;
export const ARRIVAL_QUEUE = 10;
export const ARRIVAL_STREAK = 3;

/**
 * Step 5 arrival pacing. New arrivals join the ticker at once (they are records already);
 * their lotus presentations wait here. At most one interrupts the tour per 60 seconds, in the
 * order they came; the queue keeps the newest 10 (older ones stay in the ticker and the
 * bubbles); and after 3 interruptions in a row the tour must complete a place first.
 */
export class ArrivalPacer {
  private queue: string[] = [];
  private presented = new Set<string>();
  private last = -Infinity;
  private streak = 0;
  offer(ids: readonly string[]) {
    for (const id of ids) {
      if (this.queue.includes(id) || this.presented.has(id)) continue;
      this.queue.push(id);
    }
    if (this.queue.length > ARRIVAL_QUEUE) this.queue = this.queue.slice(-ARRIVAL_QUEUE);
  }
  /** Drop queued ids that left the snapshot. */
  prune(eligible: ReadonlySet<string>) {
    this.queue = this.queue.filter((id) => eligible.has(id));
  }
  /**
   * The next arrival allowed to interrupt at `now` seconds, or null. While the owner has
   * paused rotation no place can complete, so two quiet minutes end the streak instead.
   */
  next(now: number, rotationPaused = false): string | null {
    if (rotationPaused && now - this.last >= 2 * ARRIVAL_INTERVAL) this.streak = 0;
    if (!this.queue.length || now - this.last < ARRIVAL_INTERVAL || this.streak >= ARRIVAL_STREAK) return null;
    const id = this.queue.shift()!;
    this.last = now;
    this.streak++;
    this.presented.add(id);
    if (this.presented.size > 512) this.presented = new Set([...this.presented].slice(-256));
    return id;
  }
  /** Sample mode only: let a fictional record arrive again. */
  forget(id: string) {
    this.presented.delete(id);
  }
  /** The tour finished a place on its own, so the interruption streak starts over. */
  placeCompleted() {
    this.streak = 0;
  }
  /** Drops what is waiting. The last interruption's time is kept, so a reconnect cannot bring two inside 60 s. */
  clear() {
    this.queue = [];
    this.streak = 0;
  }
  get pending(): readonly string[] {
    return this.queue;
  }
}

export type TickerItem = { id: string; recipient: string; message: string };
/** Step 6: the ticker reads the same records, newest first, at most 100, each id once. */
export function tickerItems(records: readonly Recognition[]): TickerItem[] {
  return tvRecords(records).map(({ id, recipient, message }) => ({ id, recipient, message }));
}

/**
 * The heart count a bubble shows. The public TV snapshot carries no reaction counts and the
 * world page may not call another endpoint, so live bubbles show no number. Sample bubbles
 * show a fictional count derived from the fictional id, the same on every render.
 */
export function sampleHeartCount(record: Pick<Recognition, "id">, sample: boolean): number | null {
  if (!sample) return null;
  let hash = 7;
  for (const char of record.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 3 + (hash % 38);
}
