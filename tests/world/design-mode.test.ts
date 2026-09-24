import { afterEach, describe, expect, it, vi } from "vitest";
import { isWorldDesignStudy, studyRadiance } from "../../src/components/display/world/prototype/design-mode";

afterEach(() => vi.unstubAllGlobals());
describe("fictional design study URL boundary", () => {
  it.each([
    ["?art=design&source=sample", true],
    ["?art=design&source=sample&entrance=ribbon", true],
    ["?art=design&source=live", false],
    ["?art=design", false],
    ["?art=classic&source=sample", false],
    ["?art=design&source=sample&source=live", false],
    ["?art=design&art=classic&source=sample", false],
  ])("%s activates: %s", (search, expected) => {
    vi.stubGlobal("window", { location: { search } });
    expect(isWorldDesignStudy()).toBe(expected);
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
