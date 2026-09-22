import { describe, expect, it } from "vitest";
import { cosmosPearlPosition } from "../../src/components/display/world/prototype/cosmos-motion";

describe("Cosmos pearl drift", () => {
  it("moves visibly through space within one reading interval", () => {
    const start = cosmosPearlPosition(0, 0, false);
    const later = cosmosPearlPosition(8, 0, false);
    expect(later[0] - start[0]).toBeGreaterThan(3);
    expect(later[1]).not.toBe(start[1]);
    expect(later[2]).not.toBe(start[2]);
  });
  it("keeps TV and phone motion within their reading frame", () => {
    for (const portrait of [false, true]) {
      for (let t = 0; t < 600; t += .5) {
        const p = cosmosPearlPosition(t, 0, portrait);
        expect(Math.abs(p[0])).toBeLessThanOrEqual(portrait ? 1.15 : 4.1);
        expect(p[1]).toBeGreaterThanOrEqual(8.62);
        expect(p[1]).toBeLessThanOrEqual(10.62);
        expect(p[2]).toBeGreaterThanOrEqual(.8);
        expect(p[2]).toBeLessThanOrEqual(3);
      }
    }
  });
  it("has no jumps and stays stationary when the scene clock is held", () => {
    for (let t = 0; t < 120; t++) {
      const p = cosmosPearlPosition(t, 0, false);
      expect(cosmosPearlPosition(t, 0, false)).toEqual(p);
      const next = cosmosPearlPosition(t + 1 / 60, 0, false);
      expect(Math.hypot(...p.map((v, i) => next[i] - v))).toBeLessThan(.015);
    }
  });
});
