import { describe, expect, it } from "vitest";
import {
  TV_BIG,
  TV_FILL,
  TV_SMALL,
  TV_TEXT,
  contrastRatio,
  heartLabel,
  tvScrollFraction,
} from "@/components/display/world/prototype/tv-bubbles";

describe("TV bubble faces", () => {
  it("fits 9 lines at the body size in the main bubble's message window", () => {
    expect(Math.floor((TV_BIG.windowBottom - TV_BIG.windowTop) / TV_BIG.line)).toBeGreaterThanOrEqual(9);
    // The window's corners stay inside the face, clear of the rainbow rim.
    const corner = Math.hypot(TV_BIG.windowWidth / 2, TV_BIG.windowBottom - 512) / 512;
    expect(corner).toBeLessThan(0.95);
  });
  it("paints a small bubble's words at 22 px or more once it is its smallest size in view", () => {
    const smallest = Math.min(TV_SMALL.thanks, TV_SMALL.nameMin, TV_SMALL.heart);
    expect((smallest / TV_SMALL.canvas) * TV_SMALL.minDiameter).toBeGreaterThanOrEqual(22);
  });
});

describe("TV bubble text", () => {
  it("has contrast of 4.5 to 1 or more against the bubble fill", () => {
    for (const color of Object.values(TV_TEXT))
      for (const fill of TV_FILL) expect(contrastRatio(color, fill), `${color} on ${fill}`).toBeGreaterThanOrEqual(4.5);
  });
  it("scrolls a long message only between 2 s in and 2 s before the end", () => {
    expect(tvScrollFraction(0, 20)).toBe(0);
    expect(tvScrollFraction(2, 20)).toBe(0);
    expect(tvScrollFraction(10, 20)).toBeCloseTo(0.5);
    expect(tvScrollFraction(18, 20)).toBe(1);
    expect(tvScrollFraction(20, 20)).toBe(1);
  });
  it("labels hearts only when a count is known", () => {
    expect(heartLabel(24)).toBe("♥ 24");
    expect(heartLabel(1200)).toBe("♥ 1,200");
    expect(heartLabel(null)).toBe("");
  });
});
