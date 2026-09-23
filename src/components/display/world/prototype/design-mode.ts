/** Explicit, fictional design study. It never activates for a live feed URL. */
export function isWorldDesignStudy() {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  return query.getAll("art").length === 1 && query.getAll("source").length === 1
    && query.get("art") === "design" && query.get("source") === "sample";
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
