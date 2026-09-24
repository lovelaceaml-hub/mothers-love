import { describe, expect, it } from "vitest";
import {
  MOTE_SPAN,
  PETAL_BAND,
  STAR_RADIUS,
  butterflyRoutes,
  moteCloud,
  petalField,
  skyStars,
} from "../../src/components/display/world/art/study-air";
import { ZONES } from "../../src/components/display/world/world-data";

const centers = ZONES.map((zone) => zone.center);

describe("drifting petal field", () => {
  it("is deterministic for one seed", () => {
    expect(petalField(3313, 24, centers)).toEqual(petalField(3313, 24, centers));
  });
  it("differs between seeds", () => {
    expect(petalField(3313, 24, centers)[0]).not.toEqual(petalField(77, 24, centers)[0]);
  });
  it("keeps every petal in the annulus around its own district", () => {
    for (const [index, petal] of petalField(3313, 560, centers).entries()) {
      const center = centers[index % centers.length];
      const radius = Math.hypot(petal.x - center[0], petal.z - center[2]);
      expect(radius).toBeGreaterThanOrEqual(PETAL_BAND.innerRadius - 1e-6);
      expect(radius).toBeLessThanOrEqual(PETAL_BAND.outerRadius + 1e-6);
    }
  });
  it("keeps the fall band low enough to read as blossom over the beds", () => {
    for (const [index, petal] of petalField(3313, 560, centers).entries()) {
      const center = centers[index % centers.length];
      const low = petal.y - center[1] - petal.span / 2, high = petal.y - center[1] + petal.span / 2;
      expect(low).toBeGreaterThanOrEqual(PETAL_BAND.low - 1e-6);
      expect(high).toBeLessThanOrEqual(PETAL_BAND.low + PETAL_BAND.spanHigh + 1e-6);
      expect(petal.fall).toBeGreaterThan(0);
      expect(petal.span).toBeGreaterThan(0);
      expect(petal.size).toBeLessThan(0.6);
    }
  });
  it("gives every petal a finite seed vector and tint", () => {
    for (const petal of petalField(3313, 64, centers)) {
      expect([petal.phase, petal.fall, petal.spin, petal.span].every(Number.isFinite)).toBe(true);
      expect(petal.tint.every((channel) => channel >= 0 && channel <= 1)).toBe(true);
    }
  });
});

describe("motes and stars", () => {
  it("seeds motes inside one wrap cube", () => {
    const places = moteCloud(611, 200);
    expect(places).toHaveLength(600);
    for (const value of places) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(MOTE_SPAN);
    }
    expect([...moteCloud(611, 8)]).toEqual([...moteCloud(611, 8)]);
  });
  it("places every star on the sky shell above the horizon", () => {
    const { places, phases } = skyStars(913, 300);
    expect(phases).toHaveLength(300);
    for (let i = 0; i < 300; i++) {
      const x = places[i * 3], y = places[i * 3 + 1], z = places[i * 3 + 2];
      expect(Math.hypot(x, y, z)).toBeCloseTo(STAR_RADIUS, 3);
      expect(y).toBeGreaterThanOrEqual(0.3 * STAR_RADIUS);
    }
  });
});

describe("butterfly routes", () => {
  it("keeps eight routes out over the three flower bed districts", () => {
    const routes = butterflyRoutes();
    expect(routes).toHaveLength(8);
    const beds = new Set(["26,0,16", "-27,0,-9", "14,0,-45"]);
    for (const route of routes) {
      expect(beds.has(route.center.join(","))).toBe(true);
      expect(route.radius).toBeGreaterThanOrEqual(8);
      expect(route.speed).toBeGreaterThan(0);
    }
  });
  it("stays low over the terrace", () => {
    for (const route of butterflyRoutes()) {
      expect(route.lift).toBeGreaterThanOrEqual(0.9);
      expect(route.lift + route.rise).toBeLessThanOrEqual(2.4);
      expect(route.center[1] + 0.7 + route.lift).toBeGreaterThan(1.5);
    }
  });
});
