import * as T from "three";
import { describe, expect, it } from "vitest";
import { ARRIVAL_VIEW } from "@/components/display/world/world-data";
import { TV_BIG, TV_FOV } from "@/components/display/world/art/tv-bubbles";
import { TV_MEDALLION_SCALE, TV_READ } from "@/components/display/world/art/tv-places";
import { TV_ARRIVAL_AT, TV_ARRIVAL_RADIUS, tvArrivalExit } from "@/components/display/world/art/tv-arrival";

/** The fixed arrival camera on a 1920 by 1080 screen. */
const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, 450);
camera.position.set(...ARRIVAL_VIEW.eye);
camera.lookAt(...ARRIVAL_VIEW.target);
camera.updateMatrixWorld();

/** A billboard disc on screen: centre and radius in pixels. */
function onScreen(position: T.Vector3, radius: number) {
  const depth = -position.clone().applyMatrix4(camera.matrixWorldInverse).z;
  const p = position.clone().project(camera);
  return { x: (p.x + 1) * 960, y: (1 - p.y) * 540, r: (radius / (depth * Math.tan((TV_FOV * Math.PI) / 360))) * 540 };
}
type Rect = { name: string; x0: number; x1: number; y0: number; y1: number };
/** The TV page's screen text at 1080p (`WorldTv.module.css`), each at its widest. */
const SCREEN_TEXT: Rect[] = [
  { name: "title", x0: 58, x1: 650, y0: 40, y1: 175 },
  { name: "live badge", x0: 1580, x1: 1862, y0: 40, y1: 122 },
  { name: "QR card", x0: 58, x1: 467, y0: 780, y1: 967 },
  { name: "ticker", x0: 0, x1: 1920, y0: 991, y1: 1080 },
];
/** Its farthest reach in radii: the medallions riding the ring (1.36 by 1.28, medallions .205) at the TV scale. */
const REACH = (1.36 + 0.205) * TV_MEDALLION_SCALE;

describe("the arriving bubble on the TV page", () => {
  it("is read at the main bubbles' size, its words 35 px or more", () => {
    const disc = onScreen(TV_ARRIVAL_AT, TV_ARRIVAL_RADIUS);
    expect(disc.r * 2).toBeCloseTo(TV_READ.diameter, 0);
    expect((TV_BIG.body / TV_BIG.canvas) * disc.r * 2).toBeGreaterThanOrEqual(35);
  });
  it("starts its way out where it was read and dwindles to almost nothing", () => {
    const at = new T.Vector3();
    expect(tvArrivalExit(0, at)).toBe(1);
    expect(at.distanceTo(TV_ARRIVAL_AT)).toBeLessThan(1e-9);
    expect(tvArrivalExit(1, at)).toBeLessThan(0.05);
    let last = { scale: 1, y: at.y };
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const scale = tvArrivalExit(s, at);
      expect(scale).toBeLessThanOrEqual(last.scale + 1e-9);
      if (s > 0) expect(at.y).toBeGreaterThanOrEqual(TV_ARRIVAL_AT.y);
      last = { scale, y: at.y };
    }
  });
  it("stays clear of the screen text while read and all the way out", () => {
    const at = new T.Vector3();
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const scale = tvArrivalExit(s, at);
      const disc = onScreen(at, TV_ARRIVAL_RADIUS * scale);
      const reach = disc.r * REACH;
      expect(disc.y - reach, `top at ${s.toFixed(2)}`).toBeGreaterThanOrEqual(0);
      for (const rect of SCREEN_TEXT) {
        const nx = Math.max(rect.x0, Math.min(rect.x1, disc.x)), ny = Math.max(rect.y0, Math.min(rect.y1, disc.y));
        expect(Math.hypot(nx - disc.x, ny - disc.y) - reach, `${rect.name} at ${s.toFixed(2)}`).toBeGreaterThan(0);
      }
    }
  });
});
