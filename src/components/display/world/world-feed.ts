import type { Aggregate, Recognition } from "@/lib/contracts";
import type { ColorPolishSnapshot } from "@/lib/color-polish/contracts";
import { validateColorPolishSnapshot } from "@/lib/color-polish/validation";
import { buildColorPolishSampleSnapshot } from "../color-polish/sample";
import { SAMPLE_RECOGNITIONS } from "./world-data";

export type WorldSource = "sample" | "live";
export type FeedPhase =
  | "sample"
  | "connecting"
  | "live"
  | "reconnecting"
  | "quiet"
  | "neutral"
  | "disabled"
  | "unavailable";
export type WorldFeed = {
  phase: FeedPhase;
  snapshot: ColorPolishSnapshot | null;
  records: Recognition[];
  arrivals: string[];
  now: number;
};
export const STALE_MS = 60_000;
export const emptyFeed = (phase: FeedPhase = "connecting"): WorldFeed => ({
  phase,
  snapshot: null,
  records: [],
  arrivals: [],
  now: 0,
});
export { readingSeconds } from "./reading";

export class WorldFeedStore {
  private snapshot: ColorPolishSnapshot | null = null;
  private verifiedAt = -Infinity;
  private serverAt = 0;
  private highestTime = 0;
  private phase: FeedPhase = "connecting";
  private seen = new Set<string>();
  private pending: string[] = [];
  cursor: string | null = null;
  accept(payload: unknown, monotonic: number): boolean {
    const next = validateColorPolishSnapshot(payload);
    if (!next) {
      this.clear("unavailable");
      return false;
    }
    if (this.snapshot && next.revision < this.snapshot.revision) return false;
    const hadBaseline = this.cursor !== null;
    this.verifiedAt = monotonic;
    this.serverAt = Date.parse(next.serverTime);
    this.highestTime = Math.max(this.highestTime, this.serverAt);
    this.cursor = next.cursor;
    if (next.settings.mode !== "normal" || !next.presentation.enabled) {
      this.clear(
        next.settings.mode === "quiet"
          ? "quiet"
          : next.settings.mode === "neutral"
            ? "neutral"
            : "disabled",
      );
      return true;
    }
    this.snapshot = next;
    this.phase = "live";
    const eligible = new Set(
      next.recognitions
        .filter((record) => Date.parse(record.expiresAt) > this.highestTime)
        .map((record) => record.id),
    );
    this.pending = this.pending.filter((id) => eligible.has(id));
    if (!next.settings.pauseArrivals && hadBaseline && next.sync === "delta") {
      for (const event of next.arrivals) {
        if (!this.seen.has(event.eventId) && eligible.has(event.recognitionId))
          this.pending.push(event.recognitionId);
        this.seen.add(event.eventId);
      }
    } else {
      next.arrivals.forEach((event) => this.seen.add(event.eventId));
      if (next.settings.pauseArrivals || next.sync === "reset")
        this.pending = [];
    }
    this.pending = [...new Set(this.pending)].slice(-100);
    if (this.seen.size > 2048) this.seen = new Set([...this.seen].slice(-1024));
    return true;
  }
  failure(immediate = false) {
    if (immediate || !this.snapshot) this.clear("unavailable");
    else this.phase = "reconnecting";
  }
  clear(phase: FeedPhase = "connecting") {
    this.snapshot = null;
    this.pending = [];
    this.cursor = null;
    this.seen.clear();
    this.phase = phase;
    this.verifiedAt = -Infinity;
  }
  view(monotonic: number): WorldFeed {
    if (this.snapshot && monotonic - this.verifiedAt >= STALE_MS)
      this.clear("unavailable");
    this.highestTime = Math.max(
      this.highestTime,
      this.serverAt +
        Math.max(
          0,
          monotonic -
            (Number.isFinite(this.verifiedAt) ? this.verifiedAt : monotonic),
        ),
    );
    const records =
      this.snapshot?.recognitions.filter(
        (record) =>
          record.status === "published" &&
          Date.parse(record.expiresAt) > this.highestTime,
      ) ?? [];
    const ids = new Set(records.map((record) => record.id));
    this.pending = this.pending.filter((id) => ids.has(id));
    return {
      phase: this.phase,
      snapshot: this.snapshot,
      records,
      arrivals: [...this.pending],
      now: this.highestTime,
    };
  }
  /**
   * An arrival leaves the queue only once a view carrying it has been committed, so a view
   * that React batches away never takes an entrance with it (Plan 28 Section 8 follow up).
   * Every unsafe state still empties the queue at once, through `clear`, and `view` drops a
   * withdrawn or expired record's arrival before any later view can carry it.
   */
  confirmArrivals(delivered: readonly string[]) {
    if (!delivered.length || !this.pending.length) return;
    const done = new Set(delivered);
    this.pending = this.pending.filter((id) => !done.has(id));
  }
}
export function sampleWorldFeed(): WorldFeed {
  const snapshot = buildColorPolishSampleSnapshot();
  const now = Date.parse(snapshot.serverTime);
  const records: Recognition[] = SAMPLE_RECOGNITIONS.map((sample, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    recipient: sample.name,
    message: sample.message,
    expressionIds: [sample.expressionId],
    createdAt: new Date(now - 86400000).toISOString(),
    firstPublishedAt: new Date(now - 3600000 * (index + 1)).toISOString(),
    expiresAt: new Date(now + 7 * 86400000).toISOString(),
    version: 1,
    status: "published",
    featured: index === 0,
  }));
  const dayOf = (time: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(time));
  const today = dayOf(snapshot.serverTime);
  const aggregate = (start: string, end: string): Aggregate => {
    const matching = records.filter((record) => {
      const day = dayOf(record.firstPublishedAt!);
      return day >= start && day <= end;
    });
    const expressionCounts = Array.from(
      { length: 9 },
      (_, i) =>
        matching.filter((record) => record.expressionIds.includes(i + 1))
          .length,
    );
    return {
      periodStart: start,
      periodEnd: end,
      recognitions: matching.length,
      expressionCounts,
      expressionTotal: expressionCounts.reduce((a, b) => a + b, 0),
      revision: 1,
    };
  };
  const month = aggregate(today.slice(0, 7) + "-01", today);
  const currentWeek = aggregate(
    snapshot.insights.currentWeek.periodStart,
    today,
  );
  const counts = currentWeek.expressionCounts,
    expressionId = counts.indexOf(Math.min(...counts)) + 1;
  const target = Math.max(
    1,
    counts.filter((_, i) => i !== expressionId - 1).sort((a, b) => b - a)[3] +
      1,
  );
  const insights = {
    ...snapshot.insights,
    month,
    currentWeek,
    campaign: aggregate(today.slice(0, 7) + "-01", today),
    calendar: [
      ...new Set(records.map((record) => dayOf(record.firstPublishedAt!))),
    ]
      .sort()
      .map((day) => aggregate(day, day)),
    goal: {
      ...snapshot.insights.goal,
      expressionId,
      value: counts[expressionId - 1],
      target,
      achieved: counts[expressionId - 1] >= target,
    },
  };
  return {
    phase: "sample",
    snapshot: {
      ...snapshot,
      aggregate: month,
      insights,
      recognitions: records,
    },
    records,
    arrivals: [],
    now,
  };
}
