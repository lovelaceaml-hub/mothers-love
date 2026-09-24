import * as T from "three";
import { describe, expect, it } from "vitest";
import { TOUR_ORDER, ZONES } from "@/components/display/world/world-data";
import { TV_BIG, TV_FLOW_MIN_PX, TV_FLOW_PX, TV_FOV } from "@/components/display/world/prototype/tv-bubbles";
import { studyRibbonPoint } from "@/components/display/world/prototype/study-geometry";
import {
  TV_BASIN,
  TV_FOCUS_DELAY,
  TV_FOCUS_IN,
  TV_FOCUS_OUT,
  TV_MAIN_RADIUS,
  TV_MEDALLION_SCALE,
  TV_PANEL_PLACES,
  TV_PLACES,
  TV_READ,
  districtFacing,
  districtRadius,
  layoutToWorld,
  tvFlowRadius,
  tvFocusWeight,
  tvPlaceWorld,
  tvReadingFrame,
  tvReadingPose,
  worldToLayout,
  zoneOf,
  TV_BREATH,
} from "@/components/display/world/prototype/tv-places";

/** A billboard disc (it faces the camera) on a 1920 by 1080 screen: centre and radius in pixels. */
function onScreen(camera: T.PerspectiveCamera, position: T.Vector3, radius: number) {
  const depth = -position.clone().applyMatrix4(camera.matrixWorldInverse).z;
  const p = position.clone().project(camera);
  return { x: (p.x + 1) * 960, y: (1 - p.y) * 540, r: (radius / (depth * Math.tan((camera.fov * Math.PI) / 360))) * 540, depth };
}
type Rect = { name: string; x0: number; x1: number; y0: number; y1: number };
/** The TV page's screen text at 1080p (`WorldTv.module.css`), each at its widest. */
const SCREEN_TEXT: Rect[] = [
  { name: "title", x0: 58, x1: 650, y0: 40, y1: 175 },
  { name: "live badge", x0: 1580, x1: 1862, y0: 40, y1: 122 },
  { name: "QR card", x0: 58, x1: 467, y0: 780, y1: 967 },
  { name: "ticker", x0: 0, x1: 1920, y0: 991, y1: 1080 },
];
const PANEL: Rect = { name: "panel", x0: 58, x1: 557, y0: 205, y1: 820 };
/** How far a disc stands clear of a rectangle, px (negative when it overlaps). */
const clearOf = (disc: { x: number; y: number; r: number }, rect: Rect) =>
  Math.hypot(disc.x - Math.max(rect.x0, Math.min(rect.x1, disc.x)), disc.y - Math.max(rect.y0, Math.min(rect.y1, disc.y))) - disc.r;

/** The camera in the reading framing at world time `time`, breathing in and out. */
function readingCamera(place: (typeof TOUR_ORDER)[number], time: number) {
  const pose = tvReadingFrame(place, time);
  const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, 450);
  camera.position.copy(pose.eye);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  return camera;
}
/** A whole breath, in and out. */
const AGES = Array.from({ length: 31 }, (_, k) => (k / 30) * ((2 * Math.PI) / TV_BREATH.rate));
/**
 * The main bubble's reach toward a direction on screen, in its radii: the rainbow rim (1.17),
 * or the expression medallions riding the study skin's ring (an ellipse 1.36 by 1.28 radii,
 * medallions .205) at the TV scale, whichever is farther.
 */
function reachToward(angle: number) {
  const a = 1.36 * TV_MEDALLION_SCALE, b = 1.28 * TV_MEDALLION_SCALE;
  const ring = (a * b) / Math.hypot(b * Math.cos(angle), a * Math.sin(angle));
  return Math.max(1.17, ring + 0.205 * TV_MEDALLION_SCALE);
}
const REACH = reachToward(0);
/** How far the main bubble's reach stands clear of a rectangle, px. */
function mainClearOf(main: { x: number; y: number; r: number }, rect: Rect) {
  const nx = Math.max(rect.x0, Math.min(rect.x1, main.x)), ny = Math.max(rect.y0, Math.min(rect.y1, main.y));
  return Math.hypot(nx - main.x, ny - main.y) - main.r * reachToward(Math.atan2(ny - main.y, nx - main.x));
}

describe("every place's two bubbles in the reading framing", () => {
  it("covers all thirteen places", () => {
    expect(Object.keys(TV_PLACES).sort()).toEqual([...TOUR_ORDER].sort());
  });

  for (const place of TOUR_ORDER) {
    it(`${place}: the main bubble reads at 35 px, the flowing one at 22 px or more, all clear of each other and the screen text`, () => {
      const world = tvPlaceWorld(place);
      const texts = TV_PANEL_PLACES.includes(place) ? [...SCREEN_TEXT, PANEL] : SCREEN_TEXT;
      for (const age of AGES) {
        const camera = readingCamera(place, age);
        const main = onScreen(camera, world.main.centre, world.main.radius);
        // The words: body 56 of a 1024 face across the bubble's diameter.
        expect((TV_BIG.body / TV_BIG.canvas) * main.r * 2, `${place} main words at age ${age}`).toBeGreaterThanOrEqual(35);
        expect(main.x + main.r * reachToward(0), `${place} main reach right at age ${age}`).toBeLessThanOrEqual(1920);
        expect(main.y - main.r * reachToward(Math.PI / 2), `${place} main reach top at age ${age}`).toBeGreaterThanOrEqual(0);
        for (const rect of texts) expect(mainClearOf(main, rect), `${place} main under the ${rect.name} at age ${age}`).toBeGreaterThan(0);
        // The flowing bubble at its largest.
        const flow = onScreen(camera, world.flow.rest, tvFlowRadius(place, TV_READ.flow.max));
        const rim = { ...flow, r: flow.r * 1.17 };
        for (const rect of texts) expect(clearOf(rim, rect), `${place} flowing bubble under the ${rect.name} at age ${age}`).toBeGreaterThan(0);
        const toward = Math.atan2(rim.y - main.y, rim.x - main.x);
        expect(Math.hypot(rim.x - main.x, rim.y - main.y) - rim.r - main.r * reachToward(toward), `${place} bubbles apart at age ${age}`).toBeGreaterThan(0);
        // Its words were sized for 23.5 px at the arc's rest; the swing keeps them at 22 or more.
        expect(TV_FLOW_PX * (flow.r * 2) / TV_READ.flow.max, `${place} flowing words at age ${age}`).toBeGreaterThanOrEqual(TV_FLOW_MIN_PX);
        // Both are in front of the camera, the flowing one never behind the main one.
        expect(flow.depth).toBeGreaterThan(1);
      }
    });
  }
});

describe("the lotuses the bubbles come from", () => {
  for (const place of TOUR_ORDER) {
    it(`${place}: each lotus stands on its island, under the bubble it holds or feeds`, () => {
      const zone = zoneOf(place), spots = TV_PLACES[place], world = tvPlaceWorld(place);
      const island = districtRadius(place);
      // The main bubble's lotus, a stem's length below it and a basin's width inside the island.
      expect(Math.hypot(spots.lotus[0], spots.lotus[1]) + TV_BASIN.main.radius, `${place} main lotus`).toBeLessThan(island - 0.5);
      expect(Math.hypot(spots.lotus[0] - spots.main[0], spots.lotus[1] - spots.main[2]), `${place} stem lean`).toBeLessThan(2);
      expect(spots.main[1] - TV_MAIN_RADIUS, `${place} calyx above the lotus`).toBeGreaterThan(1.5);
      // The flowing bubble's bud, on the island too, below where it rests.
      const bud = worldToLayout(zone, world.flow.lotus), rest = worldToLayout(zone, world.flow.rest);
      expect(Math.hypot(bud.x, bud.z), `${place} flowing lotus`).toBeLessThan(island - 1);
      expect(rest.y - bud.y, `${place} the flowing bubble rises`).toBeGreaterThan(3);
    });
  }
});

describe("the Heart Sanctuary's silk ribbons", () => {
  it("never pass through the Sanctuary's bubbles, wherever their ten minute sweep takes them", () => {
    const zone = zoneOf("heart"), world = tvPlaceWorld("heart");
    const facing = districtFacing(zone), centre = new T.Vector3(...zone.center);
    // The ribbons are built in the district's unturned frame.
    const inRoot = (p: T.Vector3) => p.clone().sub(centre);
    const main = inRoot(world.main.centre), flow = inRoot(world.flow.rest);
    const mainReach = TV_MAIN_RADIUS * REACH, flowReach = tvFlowRadius("heart", TV_READ.flow.max) * 1.17;
    const point = new T.Vector3();
    let nearest = Infinity;
    for (let t = 0; t < 600; t += 2) for (let i = 0; i < 4; i++) for (let u = 0; u <= 1; u += 0.02) for (const v of [-0.5, 0, 0.5]) {
      studyRibbonPoint(i, u, v, t, point);
      nearest = Math.min(nearest, point.distanceTo(main) - mainReach, point.distanceTo(flow) - flowReach);
    }
    expect(nearest).toBeGreaterThan(0.3);
    expect(facing).toBeCloseTo(Math.atan2(14, 28), 6);
  });
});

describe("the camera's reading move", () => {
  it("shows the place, glides in, holds, and pulls back out", () => {
    const hold = 12 + TV_FOCUS_DELAY + TV_FOCUS_IN + TV_FOCUS_OUT;
    expect(tvFocusWeight(0, hold, false)).toBe(0);
    expect(tvFocusWeight(TV_FOCUS_DELAY, hold, false)).toBe(0);
    expect(tvFocusWeight(TV_FOCUS_DELAY + TV_FOCUS_IN, hold, false)).toBe(1);
    expect(tvFocusWeight(hold / 2, hold, false)).toBe(1);
    expect(tvFocusWeight(hold - TV_FOCUS_OUT, hold, false)).toBe(1);
    expect(tvFocusWeight(hold, hold, false)).toBe(0);
    // A still view cuts in and out instead.
    expect(tvFocusWeight(0, hold, true)).toBe(0);
    expect(tvFocusWeight(TV_FOCUS_DELAY, hold, true)).toBe(1);
    expect(tvFocusWeight(hold, hold, true)).toBe(0);
  });
  it("reads from the district's front when the camera is straight above the bubble", () => {
    const centre = new T.Vector3(3, 7, 2);
    const pose = tvReadingPose(centre, TV_MAIN_RADIUS, centre.clone().add(new T.Vector3(0, 20, 0)));
    expect(Number.isFinite(pose.eye.x) && pose.eye.distanceTo(centre)).toBeGreaterThan(10);
  });
  it("keeps the layout frame and world space in step", () => {
    for (const zone of ZONES) {
      const p = layoutToWorld(zone, [1, 2, 3]);
      const back = worldToLayout(zone, p);
      expect(back.x).toBeCloseTo(1, 6); expect(back.y).toBeCloseTo(2, 6); expect(back.z).toBeCloseTo(3, 6);
    }
  });
});
