import type { WorldFeed } from "../world-feed";

/*
 * The world's address, `/world` (Plan 28 Section 5). Every rule is pure when a search string
 * is supplied, so the server page and the browser read one URL the same way, provably in Node.
 *
 * - `art`: the design look is the default for live and sample content; `?art=classic` and
 *   `?art=cinematic` stay as explicit fallbacks. The first `art` value decides.
 * - `source`: live recognitions by default; exactly one `?source=sample` shows the fictional
 *   demonstration instead.
 * - `view`: the design look opens the TV page (PLAN-01 Section 5) by default; `?view=explore`
 *   opens the interactive explorer with the world map and Settings. Classic and cinematic
 *   always use the explorer, as they always did.
 */
export type WorldArt = "design" | "cinematic" | "classic";
export type WorldView = "tv" | "explore";

const read = (search?: string) =>
  new URLSearchParams(search ?? (typeof window === "undefined" ? "" : window.location.search));

export function worldArt(search?: string): WorldArt {
  const art = read(search).get("art");
  return art === "classic" || art === "cinematic" ? art : "design";
}

/** Exactly one `source=sample`; anything else is live, as the page has always read it. */
export function worldSampleSource(search?: string) {
  const query = read(search);
  return query.getAll("source").length === 1 && query.get("source") === "sample";
}

export function worldView(search?: string): WorldView {
  return worldArt(search) === "design" && read(search).get("view") !== "explore" ? "tv" : "explore";
}

/**
 * The design look (the study's name for it is kept, because every study module is named for
 * it). Since Plan 28 Section 5 it is the default for live and sample content alike; it is off
 * only for the explicit `?art=classic` and `?art=cinematic` fallbacks. Never true on a server.
 */
export function isWorldDesignStudy() {
  if (typeof window === "undefined") return false;
  return worldArt() === "design";
}

/**
 * The design review: the design look in the explorer on fictional sample content, with the
 * arrival study buttons and the pinned first pearl below. It never activates for live content.
 */
export function worldDesignReview(search?: string) {
  return worldArt(search) === "design" && worldView(search) === "explore" && worldSampleSource(search);
}

/**
 * The design review pins the first fictional pearl to three expressions, so its medallion ring
 * is always reviewed full. Only a sample feed on the review is ever rewritten; a live feed, and
 * every feed outside the review, is returned as it came.
 */
export function studyReviewFeed(feed: WorldFeed, review: boolean): WorldFeed {
  if (!review || feed.phase !== "sample") return feed;
  return { ...feed, records: feed.records.map((record, index) => index === 0 ? { ...record, expressionIds: [2, 7, 8] } : record) };
}

/**
 * The radiance pass (glow, god rays and the protect mask) is on by default in the study.
 * `?radiance=off` returns the study to the single direct pass it had before Section 6,
 * which is what the A/B captures and the pearl text parity check compare against.
 *
 * Pure when a search string is supplied, so the boundary is provable in a plain Node test.
 */
export function studyRadiance(search?: string) {
  const source = search ?? (typeof window === "undefined" ? "" : window.location.search);
  return new URLSearchParams(source).get("radiance") !== "off";
}

/**
 * The 3D Studio kit dresses the study by default (Plan 26, ruling D1.1). `?kit=off` returns
 * the study to its fully procedural world, byte for byte, for A/B captures and the pearl text
 * parity check, the way `?radiance=off` does for the glow. Read once, like the study gate.
 *
 * Pure when a search string is supplied, so the boundary is provable in a plain Node test.
 */
export function studyKit(search?: string) {
  const source = search ?? (typeof window === "undefined" ? "" : window.location.search);
  return new URLSearchParams(source).get("kit") !== "off";
}

export type StudyArrival = "bloom" | "ribbon" | "constellation";
export function studyArrival(value: unknown): StudyArrival {
  return value === "bloom" || value === "ribbon" ? value : "constellation";
}
