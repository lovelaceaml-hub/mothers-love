import { describe, expect, it } from "vitest";
import {
  TV_BIG,
  TV_FILL,
  TV_FLOW_PX,
  TV_TEXT,
  contrastRatio,
  heartLabel,
  tvFaceLayout,
  tvFitFlowDiameter,
  tvFlowStyle,
  tvMessageFits,
  paintTvMessage,
  tvScrollFraction,
} from "@/components/display/world/art/tv-bubbles";
import { wrapBubbleText } from "@/components/display/world/world-recognitions";
import { TV_FLOW_MIN_DIAMETER, TV_READ } from "@/components/display/world/art/tv-places";

describe("TV bubble faces", () => {
  it("fits 9 lines at the body size in the main bubble's message window, below a one line name", () => {
    // Where a one line name leaves the window's top (`tvFaceLayout`), and the rule
    // `paintTvMessage` paints by: the lines and 20 of padding within the window, or it scrolls.
    const windowTop = Math.max(TV_BIG.windowTop, Math.max(158, 100 + TV_BIG.thanks * 1.18) + TV_BIG.name * 1.08 + 30);
    const measure = (text: string, px: number) => [...text].length * px * 0.5;
    expect(tvFaceLayout(measure, "Neighbor 3", TV_BIG, wrapBubbleText).windowTop).toBeCloseTo(windowTop, 9);
    expect(9 * TV_BIG.line + 20).toBeLessThanOrEqual(TV_BIG.windowBottom - windowTop);
    // The painter's own test agrees: nine lines (one 20 character word each) fit whole, ten scroll.
    const lines = (count: number) => Array.from({ length: count }, (_, i) => `${"kindness".repeat(2)}${String(i).padStart(4, "0")}`).join(" ");
    expect(wrapBubbleText((text) => measure(text, TV_BIG.body), lines(9), TV_BIG.windowWidth)).toHaveLength(9);
    expect(tvMessageFits(measure, lines(9), TV_BIG, windowTop, wrapBubbleText)).toBe(true);
    expect(tvMessageFits(measure, lines(10), TV_BIG, windowTop, wrapBubbleText)).toBe(false);
    // The window's corners stay inside the face, clear of the rainbow rim.
    const corner = Math.hypot(TV_BIG.windowWidth / 2, TV_BIG.windowBottom - 512) / 512;
    expect(corner).toBeLessThan(0.95);
  });
  it("reads the main bubble's words at 34 px or more at its reading size", () => {
    expect((TV_BIG.body / TV_BIG.canvas) * TV_READ.diameter).toBeGreaterThanOrEqual(35);
  });
  it("sizes every word of a flowing bubble to 23.5 px at rest, whatever its diameter", () => {
    for (let diameter = TV_FLOW_MIN_DIAMETER; diameter <= TV_READ.flow.max; diameter += 5) {
      const style = tvFlowStyle(diameter);
      const smallest = Math.min(style.thanks, style.nameMin, style.body, style.heart);
      expect((smallest / 1024) * diameter, `${diameter} px`).toBeGreaterThanOrEqual(TV_FLOW_PX);
      // Its window keeps the main one's shape, so its corners stay clear of the rim.
      expect(Math.hypot(style.windowWidth / 2, style.windowBottom - 512) / 512).toBeLessThan(0.95);
    }
  });
});

describe("a flowing bubble's size", () => {
  // A serif's average glyph is about half its size; close enough to prove the rule.
  const measure = (text: string, px: number) => [...text].length * px * 0.5;
  const record = (message: string) => ({ recipient: "Neighbor 3", message });
  it("grows just enough for its whole message, in 10 px steps", () => {
    const short = tvFitFlowDiameter(measure, record("Thank you for your kindness."), wrapBubbleText, TV_FLOW_MIN_DIAMETER, TV_READ.flow.max);
    expect(short).toBe(TV_FLOW_MIN_DIAMETER);
    const message = "You chose patience when the day was busy. Your thoughtful words helped us find peace together.";
    const fitted = tvFitFlowDiameter(measure, record(message), wrapBubbleText, TV_FLOW_MIN_DIAMETER, TV_READ.flow.max);
    const style = tvFlowStyle(fitted);
    expect(tvMessageFits(measure, message, style, tvFaceLayout(measure, "Neighbor 3", style, wrapBubbleText).windowTop, wrapBubbleText)).toBe(true);
    if (fitted > TV_FLOW_MIN_DIAMETER) {
      const smaller = tvFlowStyle(fitted - 10);
      expect(tvMessageFits(measure, message, smaller, tvFaceLayout(measure, "Neighbor 3", smaller, wrapBubbleText).windowTop, wrapBubbleText)).toBe(false);
    }
  });
  it("never scrolls a message that fits, whatever the rounding of its window", () => {
    // A stand in canvas: glyphs half their size wide, as the measure above.
    const context = {
      font: "", textAlign: "", textBaseline: "", fillStyle: "",
      measureText(text: string) { return { width: [...text].length * Number.parseFloat(this.font) * 0.5 }; },
      clearRect() {}, fillText() {},
    };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const style = tvFlowStyle(360);
    // A fractional window, as a name's height leaves it.
    const painted = paintTvMessage(canvas, "A short kind word.", 584.37, 0.5, wrapBubbleText, style);
    expect(painted.overflow).toBe(0);
    const long = paintTvMessage(canvas, "kind words ".repeat(60), 584.37, 0.5, wrapBubbleText, style);
    expect(long.overflow).toBeGreaterThan(0);
  });
  it("stops at the largest size; a longer message scrolls there", () => {
    expect(tvFitFlowDiameter(measure, record("kind words ".repeat(40)), wrapBubbleText, TV_FLOW_MIN_DIAMETER, TV_READ.flow.max)).toBe(TV_READ.flow.max);
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
