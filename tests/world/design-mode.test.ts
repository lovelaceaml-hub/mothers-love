import { afterEach, describe, expect, it, vi } from "vitest";
import { isWorldDesignStudy } from "../../src/components/display/world/prototype/design-mode";

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
