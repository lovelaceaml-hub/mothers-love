import { afterEach, describe, expect, it, vi } from "vitest";
import { isWorldDesignStudy } from "../../src/components/display/world/prototype/design-mode";
import { isCosmosPrototypePath } from "../../src/components/display/world/prototype/cosmos-mode";

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

describe("isolated Cosmos route", () => {
  it.each(["/display/cosmos-prototype", "/display/cosmos-prototype/"])("enables only the dedicated fictional scene at %s", (pathname) => {
    vi.stubGlobal("window", { location: { pathname, search: "?source=live&art=classic" } });
    expect(isWorldDesignStudy()).toBe(true);
    expect(isCosmosPrototypePath(pathname)).toBe(true);
  });
  it.each(["/display", "/display/world-preview", "/display/cosmos-prototype-extra"])("leaves the existing renderer at %s alone", (pathname) => {
    vi.stubGlobal("window", { location: { pathname, search: "?source=live" } });
    expect(isWorldDesignStudy()).toBe(false);
    expect(isCosmosPrototypePath(pathname)).toBe(false);
  });
});
