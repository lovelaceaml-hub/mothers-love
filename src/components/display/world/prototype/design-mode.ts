/** Explicit, fictional design study. It never activates for a live feed URL. */
export function isWorldDesignStudy() {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  return query.getAll("art").length === 1 && query.getAll("source").length === 1
    && query.get("art") === "design" && query.get("source") === "sample";
}

export type StudyArrival = "bloom" | "ribbon" | "constellation";
export function studyArrival(value: unknown): StudyArrival {
  return value === "bloom" || value === "ribbon" ? value : "constellation";
}
