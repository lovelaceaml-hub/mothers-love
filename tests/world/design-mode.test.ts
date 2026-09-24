import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isWorldDesignStudy,
  studyRadiance,
  studyReviewFeed,
  worldArt,
  worldDesignReview,
  worldSampleSource,
  worldView,
} from "../../src/components/display/world/prototype/design-mode";
import { emptyFeed, sampleWorldFeed } from "../../src/components/display/world/world-feed";

afterEach(() => vi.unstubAllGlobals());
describe("the design look is the default at /world (Plan 28 Section 5)", () => {
  it.each([
    ["", true],
    ["?source=sample", true],
    ["?art=design&source=sample", true],
    ["?art=design&source=live", true],
    ["?art=design&source=sample&entrance=ribbon", true],
    ["?art=unknown", true],
    ["?art=design&art=classic&source=sample", true],
    ["?art=classic&source=sample", false],
    ["?art=cinematic&source=sample", false],
    ["?art=classic", false],
    ["?art=classic&art=design", false],
  ])("%s shows the design look: %s", (search, expected) => {
    vi.stubGlobal("window", { location: { search } });
    expect(isWorldDesignStudy()).toBe(expected);
    expect(worldArt(search) === "design").toBe(expected);
  });
  it("keeps classic and cinematic as explicit fallbacks", () => {
    expect(worldArt("?art=classic")).toBe("classic");
    expect(worldArt("?art=cinematic&source=live")).toBe("cinematic");
  });
  it("is never on without a browser", () => {
    expect(isWorldDesignStudy()).toBe(false);
  });
});

describe("source and view", () => {
  it.each([
    ["", false],
    ["?source=live", false],
    ["?source=sample", true],
    ["?source=sample&source=live", false],
    ["?source=sample&source=sample", false],
  ])("%s is the fictional sample: %s", (search, expected) => {
    expect(worldSampleSource(search)).toBe(expected);
  });
  it.each([
    ["", "tv"],
    ["?source=sample", "tv"],
    ["?view=tv", "tv"],
    ["?view=explore", "explore"],
    ["?art=classic", "explore"],
    ["?art=cinematic&view=tv", "explore"],
  ])("%s opens the %s view", (search, expected) => {
    expect(worldView(search)).toBe(expected);
  });
});

describe("the design review is fictional only", () => {
  it.each([
    ["?art=design&source=sample&view=explore", true],
    ["?source=sample&view=explore", true],
    ["?source=sample", false],
    ["?art=design&source=sample", false],
    ["?view=explore", false],
    ["?art=design&source=live&view=explore", false],
    ["?source=sample&source=live&view=explore", false],
    ["?art=classic&source=sample&view=explore", false],
  ])("%s is the review: %s", (search, expected) => {
    expect(worldDesignReview(search)).toBe(expected);
  });
  it("pins the first pearl's expressions on the review's sample feed only, never on a live feed", () => {
    const sample = sampleWorldFeed();
    const reviewed = studyReviewFeed(sample, true);
    expect(reviewed.records[0].expressionIds).toEqual([2, 7, 8]);
    expect(reviewed.records.slice(1)).toEqual(sample.records.slice(1));
    expect(sample.records[0].expressionIds).not.toEqual([2, 7, 8]);
    expect(studyReviewFeed(sample, false)).toBe(sample);
    const live = { ...emptyFeed("live"), records: sample.records };
    expect(studyReviewFeed(live, true)).toBe(live);
    for (const phase of ["connecting", "reconnecting", "quiet", "neutral", "disabled", "unavailable"] as const) {
      const feed = { ...emptyFeed(phase), records: sample.records };
      expect(studyReviewFeed(feed, true)).toBe(feed);
    }
  });
});

describe("radiance switch", () => {
  it.each([
    ["?art=design&source=sample", true],
    ["?art=design&source=sample&radiance=on", true],
    ["?art=design&source=sample&radiance=", true],
    ["?art=design&source=sample&radiance=off", false],
  ])("%s keeps the radiance pass: %s", (search, expected) => {
    expect(studyRadiance(search)).toBe(expected);
  });
  it("reads the live location when no search string is supplied", () => {
    vi.stubGlobal("window", { location: { search: "?art=design&source=sample&radiance=off" } });
    expect(studyRadiance()).toBe(false);
    vi.stubGlobal("window", { location: { search: "?art=design&source=sample" } });
    expect(studyRadiance()).toBe(true);
  });
});
