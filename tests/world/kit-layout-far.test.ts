import { readFileSync } from "node:fs";
import path from "node:path";
import { CatmullRomCurve3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { ARRIVAL_VIEW, RECOGNITION_ZONES, ZONES, TOUR_ORDER, type ZoneId } from "@/components/display/world/world-data";
import {
  CALENDAR_GRID,
  COSMOS_CENTER,
  COSMOS_RINGS,
  COSMOS_SUN,
  FAR_ISLAND_RADIUS,
  FAR_ZONE_BORROWED,
  FAR_ZONE_DRESSING,
  FAR_ZONE_IDS,
  FAR_ZONE_LAYOUTS,
  FOUNTAIN_PEARLS,
  PROMISE_PORTAL,
  PROMISE_RIBBONS,
  calendarDayCell,
  calendarDayPlacements,
  cosmosPearlPose,
  cosmosPlanetPose,
  cosmosRingPoint,
  farZoneCommonLayouts,
  farZoneLayouts,
  fountainPearlPose,
  observatoryColumnScale,
  promiseRibbonYaw,
  readingKeepOut,
  type KitPlacement,
  type ZoneLayout,
} from "@/components/display/world/art/kit-layout-far";
import {
  CLOUD_VIEW_DISTANCE,
  CORRIDOR_KEEP,
  FRUSTUM_MARGIN,
  ISLET_BELOW_DECK,
  ISLET_COLOURS,
  ISLET_SIDE_OFFSET,
  ISLET_STATIONS,
  ISLET_VIEW_DISTANCE,
  KIT_ISLAND,
  LOD_NEAR,
  LONG_BRIDGE,
  LOW_TIER_VIEW,
  POST_FREE_ENDS,
  POST_SIDE_OFFSET,
  POST_VIEW_DISTANCE,
  SKY_LANES,
  SOFT_CLOUD,
  bridgeCurve,
  corridorBridges,
  corridorClouds,
  corridorIslets,
  corridorPosts,
  flightBetween,
  flightCurve,
  kitCorridorSites,
  readingArcEye,
  skyLaneStation,
  tourLegs,
} from "@/components/display/world/art/kit-corridors";
import { FAR_BUILDER_ZONES, FAR_DETAIL_DISTANCE, FAR_KEEP, farZonesEnabled } from "@/components/display/world/art/kit-far-zones";
import { SMALL_SITE_RADIUS, STUDY_CLOUD_TINTS, STUDY_COLLAR_TINTS, studyCloudLayout } from "@/components/display/world/art/study-clouds";
import { studyLandmarkCloudSites, studyLandmarkLayout } from "@/components/display/world/art/study-landmarks";

/* ------------------------------------------------------------------------------------------ */
/* The kit's own facts: ids, authored zones and exact bounds from the glTF accessors.           */
/* ------------------------------------------------------------------------------------------ */

const repo = path.resolve(new URL("../..", import.meta.url).pathname);
const kitBase = path.join(repo, "public/world-kit/v1");
type Entry = { id: string; file: string; zones: string[]; size: number; pivot: string };
const manifest = JSON.parse(readFileSync(path.join(kitBase, "manifest.json"), "utf8")) as { assets: Entry[] };
const entries = new Map(manifest.assets.map(entry => [entry.id, entry]));

type Box = { min: [number, number, number]; max: [number, number, number] };
const boxes = new Map<string, Box>();
/** The axis aligned bounds of a kit file from its POSITION accessors (present even under Draco). */
function assetBox(id: string): Box {
  const cached = boxes.get(id);
  if (cached) return cached;
  const entry = entries.get(id);
  if (!entry) throw new Error(`${id} is not in the manifest`);
  const bytes = readFileSync(path.join(kitBase, entry.file));
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")) as {
    accessors: Array<{ min?: number[]; max?: number[] }>;
    meshes: Array<{ primitives: Array<{ attributes: { POSITION: number } }> }>;
    nodes: Array<{ mesh?: number; translation?: number[]; scale?: number[] }>;
  };
  const box: Box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    const t = node.translation ?? [0, 0, 0], s = node.scale ?? [1, 1, 1];
    for (const primitive of json.meshes[node.mesh].primitives) {
      const accessor = json.accessors[primitive.attributes.POSITION];
      if (!accessor.min || !accessor.max) continue;
      for (let k = 0; k < 3; k++) {
        const low = accessor.min[k] * s[k] + t[k], high = accessor.max[k] * s[k] + t[k];
        box.min[k] = Math.min(box.min[k], low, high); box.max[k] = Math.max(box.max[k], low, high);
      }
    }
  }
  boxes.set(id, box);
  return box;
}

type Sphere = { center: [number, number, number]; radius: number };
/** A placement's bounding sphere, local: its box (yaw ignored, so the xz circle circumscribes it) scaled and lifted. */
function placementSphere(placement: KitPlacement): Sphere {
  const box = assetBox(placement.id), scale = placement.scale ?? 1;
  const w = box.max[0] - box.min[0], h = box.max[1] - box.min[1], d = box.max[2] - box.min[2];
  const midY = (box.min[1] + box.max[1]) / 2;
  return { center: [placement.position[0], placement.position[1] + midY * scale, placement.position[2]], radius: scale * Math.hypot(Math.hypot(w, d) / 2, h / 2) };
}
const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const flat = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const zone = (id: ZoneId) => ZONES.find(item => item.id === id)!;
const facingOf = (id: ZoneId) => { const z = zone(id); return Math.atan2(z.eye[0] - z.center[0], z.eye[2] - z.center[2]); };
/** District local to world. */
function toWorld(id: ZoneId, local: readonly number[]): [number, number, number] {
  const z = zone(id), f = facingOf(id);
  return [z.center[0] + local[0] * Math.cos(f) + local[2] * Math.sin(f), z.center[1] + local[1], z.center[2] - local[0] * Math.sin(f) + local[2] * Math.cos(f)];
}
/** World to district local. */
function toLocal(id: ZoneId, world: readonly number[]): [number, number, number] {
  const z = zone(id), f = facingOf(id);
  const x = world[0] - z.center[0], y = world[1] - z.center[1], w = world[2] - z.center[2];
  return [x * Math.cos(f) - w * Math.sin(f), y, x * Math.sin(f) + w * Math.cos(f)];
}
/** The parked camera at one point of its reading arc (camera-director.ts line 209), world space. */
function arcEye(id: ZoneId, angle: number, approach: number, bob: number): [number, number, number] {
  const z = zone(id), dx = z.eye[0] - z.target[0], dz = z.eye[2] - z.target[2];
  return [z.target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach, z.eye[1] + bob, z.target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach];
}
const ARC_ANGLES = Array.from({ length: 9 }, (_, i) => -.48 + (i / 8) * .96);
const ARC_SAMPLES = ARC_ANGLES.flatMap(angle => [.9, 1, 1.1].flatMap(approach => [-1.6, 0, 1.6].map(bob => ({ angle, approach, bob }))));
const START_ANGLES = [-.48, 0, .48];

/**
 * Every flight `CameraDirector.move` can make, sampled every 4 units along the raised
 * centripetal curve it builds (camera-director.ts lines 70 to 86), kept in a coarse grid so a
 * bounding sphere can be held clear of all of them at once:
 *
 * - the 13 tour legs from three departures each (the corridor of design 6.2);
 * - every ordered zone pair from every point of the reading arc, which is what a zone button
 *   press or a playlist subset flies (`visit` moves from wherever the camera is parked);
 * - the arrival flights: from every reading arc point of every zone, and from a few mid leg
 *   points, to `ARRIVAL_VIEW.eye` (`beginArrival`, 5 s) and back (`endArrival`, 6 s).
 */
type FlightSample = { flight: string; x: number; y: number; z: number };
type FlightSet = "tour" | "pairs" | "arrival";
const FLIGHT_CELL = 12;
class FlightField {
  readonly cells = new Map<string, FlightSample[]>();
  readonly curves: Record<FlightSet, number> = { tour: 0, pairs: 0, arrival: 0 };
  samples = 0;
  add(set: FlightSet, name: string, curve: CatmullRomCurve3) {
    this.curves[set]++;
    for (const point of curve.getSpacedPoints(Math.ceil(curve.getLength() / 4))) {
      const key = `${set}:${Math.floor(point.x / FLIGHT_CELL)},${Math.floor(point.y / FLIGHT_CELL)},${Math.floor(point.z / FLIGHT_CELL)}`;
      let cell = this.cells.get(key);
      if (!cell) this.cells.set(key, cell = []);
      cell.push({ flight: name, x: point.x, y: point.y, z: point.z });
      this.samples++;
    }
  }
  /** The smallest gap between a sphere and any sample of the sets, and the flight that sets it (exact for gaps under 8). */
  clearance(center: readonly number[], radius: number, sets: readonly FlightSet[] = ["tour", "pairs", "arrival"]) {
    const span = Math.ceil((radius + 8) / FLIGHT_CELL);
    const cx = Math.floor(center[0] / FLIGHT_CELL), cy = Math.floor(center[1] / FLIGHT_CELL), cz = Math.floor(center[2] / FLIGHT_CELL);
    let best = Infinity, flight = "none within reach";
    for (const set of sets) for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) for (let k = -span; k <= span; k++) {
      const cell = this.cells.get(`${set}:${cx + i},${cy + j},${cz + k}`);
      if (!cell) continue;
      for (const sample of cell) {
        const gap = Math.hypot(sample.x - center[0], sample.y - center[1], sample.z - center[2]) - radius;
        if (gap < best) { best = gap; flight = sample.flight; }
      }
    }
    return { clearance: best, flight };
  }
}
function flightField() {
  const field = new FlightField();
  for (const leg of tourLegs()) for (const angle of START_ANGLES) field.add("tour", `tour leg ${leg.from}>${leg.to} from arc angle ${angle}`, flightCurve(leg.from, leg.to, angle));
  for (const from of ZONES) for (const to of ZONES) {
    if (from.id === to.id) continue;
    for (const s of ARC_SAMPLES) field.add("pairs", `${from.id}>${to.id} from arc angle ${s.angle.toFixed(2)} approach ${s.approach} bob ${s.bob}`, flightBetween(arcEye(from.id, s.angle, s.approach, s.bob), to.eye));
  }
  const starts: Array<{ name: string; point: [number, number, number] }> = [];
  for (const z of ZONES) for (const s of ARC_SAMPLES) starts.push({ name: `${z.id} arc angle ${s.angle.toFixed(2)} approach ${s.approach} bob ${s.bob}`, point: arcEye(z.id, s.angle, s.approach, s.bob) });
  for (const leg of tourLegs()) for (const t of [.25, .5, .75]) { const p = flightCurve(leg.from, leg.to).getPoint(t); starts.push({ name: `mid leg ${leg.from}>${leg.to} at ${t}`, point: [p.x, p.y, p.z] }); }
  for (const start of starts) {
    field.add("arrival", `arrival flight from ${start.name}`, flightBetween(start.point, ARRIVAL_VIEW.eye));
    field.add("arrival", `return flight to ${start.name}`, flightBetween(ARRIVAL_VIEW.eye, start.point));
  }
  return field;
}
const FLIGHTS = flightField();
/** The gap a piece keeps from every flight of the sets; the message names the nearest flight. */
function flightGap(what: string, center: readonly number[], radius: number, sets?: readonly FlightSet[]) {
  const { clearance, flight } = FLIGHTS.clearance(center, radius, sets);
  return { gap: clearance, message: `${what} against the ${flight} flight (gap ${clearance.toFixed(2)})` };
}
const islandRadius = (id: ZoneId) => (ZONES.indexOf(zone(id)) < 3 ? 17.8 : FAR_ISLAND_RADIUS);
const ENTRY = { center: [4.138, 0, 19.104], radius: 12, top: 30 };
const ALL_FAR: ZoneLayout[] = [...FAR_ZONE_LAYOUTS, ...farZoneCommonLayouts()];
const label = (layout: ZoneLayout, placement: KitPlacement) => `${layout.zone} ${placement.id} at ${placement.position.join(",")}${placement.note ? ` (${placement.note})` : ""}`;

/* ------------------------------------------------------------------------------------------ */

describe("far zone layouts: shape and determinism", () => {
  it("covers the six far zones once each, in the design's order, and is deterministic", () => {
    expect(FAR_ZONE_LAYOUTS.map(layout => layout.zone)).toEqual(["calendar", "status", "orbit", "milestone", "live-feed", "promise"]);
    expect(FAR_ZONE_IDS).toEqual(["calendar", "status", "orbit", "milestone", "live-feed", "promise"]);
    expect(farZoneLayouts()).toEqual(FAR_ZONE_LAYOUTS);
    expect(farZoneLayouts()).toEqual(farZoneLayouts());
    expect(farZoneCommonLayouts()).toEqual(farZoneCommonLayouts());
    expect(JSON.parse(JSON.stringify(FAR_ZONE_LAYOUTS))).toEqual(FAR_ZONE_LAYOUTS);
  });

  it("uses only kit ids that exist, with finite numbers and the shared field set", () => {
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      expect(entries.has(placement.id), label(layout, placement)).toBe(true);
      expect(placement.position.every(Number.isFinite), label(layout, placement)).toBe(true);
      expect(placement.scale === undefined || (placement.scale > 0 && placement.scale <= 3.5), label(layout, placement)).toBe(true);
      for (const key of Object.keys(placement)) expect(["id", "position", "rotationY", "scale", "role", "note", "tilt"]).toContain(key);
    }
  });

  it("places every id in a zone the studio authored it for, or borrows it with a design reason", () => {
    // The common table follows design 6.3 for every district instead, so only the zone tables are held to the manifest's zones.
    for (const layout of FAR_ZONE_LAYOUTS) for (const placement of layout.placements) {
      const authored = entries.get(placement.id)!.zones;
      const allowed = authored.length === 0 || authored.includes(layout.zone) || FAR_ZONE_BORROWED.some(row => row.zone === layout.zone && row.id === placement.id);
      expect(allowed, `${label(layout, placement)}: authored for ${authored.join(", ") || "every zone"}`).toBe(true);
    }
    for (const row of FAR_ZONE_BORROWED) {
      const authored = entries.get(row.id)!.zones;
      expect(authored.length > 0 && !authored.includes(row.zone), `${row.zone} ${row.id} needs no borrowing`).toBe(true);
      expect(row.reason).toMatch(/^design 6\.1[1-6]/);
    }
  });

  it("keeps every placement on its island, except the sculpted clouds under the two floating rims and the cosmos pieces on their rings", () => {
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      const radial = Math.hypot(placement.position[0], placement.position[2]);
      const cloud = placement.id.startsWith("nature.cloud-");
      const cosmos = layout.zone === "orbit" && (placement.id.startsWith("expression.") || placement.id === "core.pearl");
      expect(radial, label(layout, placement)).toBeLessThanOrEqual(cloud || cosmos ? 20 : FAR_ISLAND_RADIUS - .4);
      if (cloud) expect(placement.position[1], label(layout, placement)).toBeLessThan(-4);
      else expect(placement.position[1], label(layout, placement)).toBeGreaterThanOrEqual(.3);
    }
  });

  it("stays inside the per district merge and instance counts of design 10.1 risk 5", () => {
    for (const layout of ALL_FAR) {
      const ids = (role: string) => new Set(layout.placements.filter(p => (p.role ?? "static") === role).map(p => p.id));
      expect(ids("static").size, `${layout.zone} static ids`).toBeLessThanOrEqual(12);
      expect(ids("instanced").size, `${layout.zone} instanced ids`).toBeLessThanOrEqual(8);
    }
  });

  it("documents the builder's removals and clock work for every far zone", () => {
    expect(FAR_ZONE_DRESSING.map(row => row.zone)).toEqual([...FAR_ZONE_IDS]);
    for (const row of FAR_ZONE_DRESSING) { expect(row.remove.length).toBeGreaterThan(8); expect(row.dynamic.length).toBeGreaterThan(0); }
  });
});

describe("far zone layouts: keep out volumes (design 6.2)", () => {
  it("derives the reading spheres of the recognition zones and none for the others", () => {
    expect(readingKeepOut("orbit")).toEqual([{ center: [3, 9, 5], radius: 7 }, { center: [-10, 12, 1], radius: 3.2 }, { center: [11, 15, -4], radius: 3 }]);
    expect(readingKeepOut("live-feed")).toEqual([{ center: [3, 7.32, 5], radius: 7 }, { center: [-10, 10, 1], radius: 3.2 }, { center: [11, 13, -4], radius: 3 }]);
    expect(readingKeepOut("heart")[0]).toEqual({ center: [7, 10, 5], radius: 7 });
    for (const id of FAR_ZONE_IDS) expect(readingKeepOut(id).length > 0).toBe(RECOGNITION_ZONES.includes(id));
    for (const layout of FAR_ZONE_LAYOUTS) expect(layout.keepOut).toEqual(readingKeepOut(layout.zone));
  });

  /** The cosmos pieces are thin rings and moving beads: proven point by point and by the cone test below, not by a bounding sphere. */
  const encircles = (layout: ZoneLayout, placement: KitPlacement) =>
    layout.zone === "orbit" && (placement.id === "recognition.orbit-ring" || placement.id.startsWith("expression.") || placement.id === "core.pearl");

  it("stands the cosmos rings behind the hero pearl: every ring point outside the reading spheres, behind the disc plane, above the terrace, off the arches", () => {
    const [hero, ...residents] = readingKeepOut("orbit");
    expect(COSMOS_CENTER).toEqual([0, 10, -7]);
    const arches = [-5.28, 0, 5.28].map(x => ({ x, z: -9.3, halfWidth: 2.75, height: 8.7 }));
    let heroGap = Infinity, frontZ = -Infinity, low = Infinity, archGap = Infinity, residentGap = Infinity;
    for (let k = 0; k < 4; k++) for (let i = 0; i < 720; i++) {
      const p = cosmosRingPoint(k, (i / 720) * Math.PI * 2);
      heroGap = Math.min(heroGap, distance(p, hero.center) - hero.radius);
      for (const keep of residents) residentGap = Math.min(residentGap, distance(p, keep.center) - keep.radius);
      frontZ = Math.max(frontZ, p[2]);
      low = Math.min(low, p[1]);
      for (const arch of arches) archGap = Math.min(archGap, Math.hypot(Math.max(Math.abs(p[0] - arch.x) - arch.halfWidth, 0), Math.max(p[1] - arch.height, 0), Math.max(Math.abs(p[2] - arch.z) - .6, 0)));
    }
    expect(heroGap).toBeGreaterThanOrEqual(0);
    expect(residentGap).toBeGreaterThanOrEqual(0);
    // The disc stands at z 5; the ring system's nearest point stays 7 units behind that plane.
    expect(frontZ).toBeLessThanOrEqual(hero.center[2] - 7);
    expect(low).toBeGreaterThanOrEqual(1.4);
    expect(archGap).toBeGreaterThanOrEqual(.8);
    // The sun's place is the apex of the system, in view above the pearl, and outside its reading sphere.
    expect(distance(COSMOS_SUN, hero.center) - hero.radius - 1.1 * .6).toBeGreaterThanOrEqual(0);
    expect(COSMOS_SUN[1]).toBeGreaterThan(hero.center[1] + hero.radius);
    for (const ring of FAR_ZONE_LAYOUTS[2].placements.filter(p => p.id === "recognition.orbit-ring")) expect(ring.position).toEqual(COSMOS_CENTER);
  });

  it("keeps every other bounding sphere out of the hero and resident reading spheres", () => {
    let checked = 0;
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      if (encircles(layout, placement)) continue;
      const sphere = placementSphere(placement);
      for (const keep of readingKeepOut(layout.zone)) {
        checked++;
        expect(distance(sphere.center, keep.center) - sphere.radius - keep.radius, `${label(layout, placement)} against the reading sphere at ${keep.center.join(",")}`).toBeGreaterThanOrEqual(0);
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it("keeps the cosmos planets and pearls out of the hero pearl's cone from every reading angle and clock", () => {
    const hero = readingKeepOut("orbit")[0], reach = 4.4 * 1.57;
    const times = [0, 3, 7.5, 13, 21, 29, 37, 47, 61, 90, 120];
    for (const sample of ARC_SAMPLES) {
      const eye = toLocal("orbit", arcEye("orbit", sample.angle, sample.approach, sample.bob));
      const toHero = new Vector3(...hero.center).sub(new Vector3(...eye));
      const heroAngle = Math.asin(Math.min(1, reach / toHero.length()));
      for (const t of times) for (let i = 0; i < 9; i++) {
        for (const [what, position, radius] of [["planet", cosmosPlanetPose(i, t).position, .6 * .7], ["pearl", cosmosPearlPose(i, t), .42 * .35]] as const) {
          const toPiece = new Vector3(...position).sub(new Vector3(...eye));
          // A piece farther away than the pearl is behind it: hidden by the depth tested face, never over the words.
          if (toPiece.length() >= toHero.length()) continue;
          const gap = toHero.angleTo(toPiece) - heroAngle - Math.asin(Math.min(1, radius / toPiece.length()));
          expect(gap, `${what} ${i} at t ${t} from arc angle ${sample.angle.toFixed(2)}`).toBeGreaterThan(.02);
        }
      }
    }
    // And they stay on the back arc, behind the pearl's plane, at every clock.
    for (const t of times) for (let i = 0; i < 9; i++) {
      expect(cosmosPlanetPose(i, t).position[2]).toBeLessThan(0);
      expect(cosmosPearlPose(i, t)[2]).toBeLessThan(0);
      expect(distance(cosmosPlanetPose(i, t).position, COSMOS_CENTER)).toBeCloseTo(COSMOS_RINGS[cosmosPlanetPose(i, t).ring].radius, 1);
    }
  });

  it("keeps every far placement 5 units clear of the parked camera's reading arc above y 1.5", () => {
    for (const layout of ALL_FAR) {
      const eyes = ARC_SAMPLES.map(sample => toLocal(layout.zone, arcEye(layout.zone, sample.angle, sample.approach, sample.bob)));
      for (const placement of layout.placements) {
        const sphere = placementSphere(placement);
        if (sphere.center[1] + sphere.radius <= 1.5) continue;
        for (const eye of eyes) expect(distance(eye, sphere.center) - sphere.radius, `${label(layout, placement)} against the camera at ${eye.map(v => v.toFixed(1)).join(",")}`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("keeps every far placement 6 units clear of the tour legs from every departure", () => {
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      const sphere = placementSphere(placement);
      const { gap, message } = flightGap(label(layout, placement), toWorld(layout.zone, sphere.center), sphere.radius, ["tour"]);
      expect(gap, message).toBeGreaterThanOrEqual(6);
    }
  });

  it("keeps every far placement 6 units clear of every zone pair, arrival and return flight, except the known Pavilion departures over the Promise", () => {
    // The Pavilion's authored eye (-46, 10, 52) parks 5 units off the Promise island's rim, so a
    // flight from its reading arc (swung toward the Promise, approach 1.1, bob -1.6) to the
    // River, the gate, the Promise or the arrival view crosses the back of the Promise island at
    // y 9 to 12: through the island's arch row (which the design world builds today, kit or not)
    // and, on the flight to the River, the top of the 10.7 tall ribbon portal (box clearance 0).
    // The eyes are design 6.1 facts outside this lane, so those three pieces are pinned here with
    // their numbers and reported as an open issue; every other far placement holds the 6 units
    // against every one of these flights, and nothing else may join this list.
    const known = new Map<string, number>([
      ["promise arrival.ribbon-portal at 0,0.6,-5", -2.6],
      ["promise core.ribbon at 1,7.4,-5.4", 2.44],
      ["promise nature.blossom-tree-a at 11.4,0.7,-1.5", 4.72],
    ]);
    const failures = new Map<string, { gap: number; flight: string }>();
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      const sphere = placementSphere(placement);
      const key = `${layout.zone} ${placement.id} at ${placement.position.join(",")}`;
      const { clearance, flight } = FLIGHTS.clearance(toWorld(layout.zone, sphere.center), sphere.radius, ["pairs", "arrival"]);
      if (clearance < 6) failures.set(key, { gap: clearance, flight });
    }
    expect([...failures.keys()].sort()).toEqual([...known.keys()].sort());
    for (const [key, { gap, flight }] of failures) {
      expect(gap, key).toBeCloseTo(known.get(key)!, 1);
      expect(flight, key).toMatch(/^(featured>(live-feed|welcome|promise)|arrival flight from featured arc angle|return flight to featured arc angle) .*approach 1\.1 bob -1\.6$/);
    }
    // And even there the arrival flights themselves pass above the portal's bounding sphere's top by more than 2 units.
    const portal = FAR_ZONE_LAYOUTS[5].placements.find(p => p.id === "arrival.ribbon-portal")!;
    const sphere = placementSphere(portal);
    expect(FLIGHTS.clearance(toWorld("promise", sphere.center), sphere.radius, ["arrival"]).clearance).toBeGreaterThan(2);
  });
});

describe("far zone layouts: each zone's own rules", () => {
  it("lays the Garden of Days out as seven stone paths of 31 days that never overlap", () => {
    const calendar = FAR_ZONE_LAYOUTS[0];
    const stones = calendar.placements.filter(p => p.id === "nature.stepping-stones");
    expect(stones).toHaveLength(CALENDAR_GRID.days);
    expect(calendarDayCell(0)).toEqual([-6.9, .7, -3.6]);
    expect(calendarDayCell(30)).toEqual([-2.3, .7, 6.4]);
    const box = assetBox("nature.stepping-stones"), scale = stones[0].scale!;
    // Stood on end (yaw a quarter turn) the set's 4.8 length runs along z and its 2 width along x.
    const along = (box.max[0] - box.min[0]) * scale, across = (box.max[2] - box.min[2]) * scale;
    expect(along).toBeLessThan(CALENDAR_GRID.pitchZ);
    expect(across).toBeLessThan(CALENDAR_GRID.pitchX);
    for (const stone of stones) expect(Math.abs(Math.abs(stone.rotationY!) - Math.PI / 2)).toBeLessThan(1e-3);
    const days = calendarDayPlacements([{ periodStart: "2026-09-03", recognitions: 2 }, { periodStart: "2026-09-31", recognitions: 1 }, { periodStart: "2026-09-12", recognitions: 0 }, { periodStart: "2026-09-40", recognitions: 3 }]);
    expect(days.map(p => p.id)).toEqual(["core.pearl", "core.flower", "core.pearl", "core.flower"]);
    expect(days[0].position.slice(0, 1)).toEqual([calendarDayCell(2)[0]]);
    expect(days[0].scale).toBeCloseTo(.69, 5);
    expect(days[2].position[2]).toBe(calendarDayCell(30)[2]);
  });

  it("stands the observatory clear of its nine columns, whose heights follow the counts", () => {
    const status = FAR_ZONE_LAYOUTS[1];
    const dome = status.placements.find(p => p.id === "landmark.love-observatory")!;
    const domeBox = assetBox(dome.id), footprint = Math.max(domeBox.max[0] - domeBox.min[0], domeBox.max[2] - domeBox.min[2]) / 2 * dome.scale!;
    const columns = status.placements.filter(p => p.id === "landmark.pearl-column");
    expect(columns).toHaveLength(9);
    for (const column of columns) expect(flat(column.position, dome.position) - footprint - .44, `column at ${column.position.join(",")}`).toBeGreaterThan(0);
    // The front, where the camera stands, stays open: no column within 40 degrees of the camera line.
    for (const column of columns) expect(Math.abs(Math.atan2(column.position[0], column.position[2]))).toBeGreaterThan(Math.PI * 40 / 180);
    expect(observatoryColumnScale(0, 9)).toBeCloseTo(.4, 5);
    expect(observatoryColumnScale(9, 9)).toBe(1);
    expect(observatoryColumnScale(3, 0)).toBeCloseTo(.4, 5);
    expect(status.placements.filter(p => p.id.startsWith("expression.")).map(p => p.id)).toHaveLength(9);
  });

  it("scales the four cosmos rings to the radii of the procedural orbits, spun on the clock", () => {
    const rings = FAR_ZONE_LAYOUTS[2].placements.filter(p => p.id === "recognition.orbit-ring");
    rings.map(r => (r.scale ?? 1) * 2.5).forEach((radius, k) => expect(radius).toBeCloseTo([5, 5.7, 6.4, 7.1][k], 2));
    expect(rings.map(r => r.role)).toEqual(["animated", "animated", "animated", "animated"]);
    expect(rings.map(r => r.tilt![0])).toEqual([0, .55, 1.1, 1.65]);
  });

  it("rises the fountain's pearls only as far as the goal", () => {
    expect(FAR_ZONE_LAYOUTS[3].placements.filter(p => p.id === "core.pearl")).toHaveLength(FOUNTAIN_PEARLS);
    const top = (progress: number) => Math.max(...Array.from({ length: FOUNTAIN_PEARLS }, (_, i) => fountainPearlPose(i, 0, progress)[1]));
    expect(top(1)).toBeCloseTo(1 + 18 * (64 / 65), 3);
    expect(top(.5)).toBeLessThan(top(1));
    expect(top(0)).toBeLessThan(top(.5));
    expect(top(0)).toBeGreaterThan(1);
    for (let i = 0; i < FOUNTAIN_PEARLS; i++) {
      const [x, y, z] = fountainPearlPose(i, 37, .3);
      expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(2 - 1e-9);
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(9 + 1e-9);
      expect(y).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it("keeps the two promise ribbons apart and inside the portal's clear opening at every clock", () => {
    const ribbon = assetBox("core.ribbon"), scale = 1.7;
    const radius = scale * Math.hypot(Math.hypot(ribbon.max[0] - ribbon.min[0], ribbon.max[2] - ribbon.min[2]) / 2, (ribbon.max[1] - ribbon.min[1]) / 2);
    const [px, py, pz] = PROMISE_PORTAL.position, [ox, oy] = PROMISE_PORTAL.openingCenterKit, [width, height] = PROMISE_PORTAL.clearOpeningKit;
    const centre = [px + ox * PROMISE_PORTAL.scale, py + oy * PROMISE_PORTAL.scale, pz];
    const portal = assetBox("arrival.ribbon-portal");
    for (let sample = 0; sample < 20; sample++) {
      const t = sample * 9.7;
      const a = PROMISE_RIBBONS[0].position, b = PROMISE_RIBBONS[1].position;
      expect(distance(a, b) - 2 * radius, `clock ${t}`).toBeGreaterThan(.3);
      for (const [index, position] of [[0, a], [1, b]] as const) {
        expect(Number.isFinite(promiseRibbonYaw(index, t))).toBe(true);
        expect(Math.abs(position[0] - centre[0]) + radius).toBeLessThan(width * PROMISE_PORTAL.scale / 2);
        expect(Math.abs(position[1] - centre[1]) + radius).toBeLessThan(height * PROMISE_PORTAL.scale / 2);
        expect(Math.abs(position[2] - centre[2]) + radius * .3).toBeLessThan(portal.max[2] * PROMISE_PORTAL.scale);
      }
    }
    expect(promiseRibbonYaw(0, 10)).toBeGreaterThan(promiseRibbonYaw(0, 0));
    expect(promiseRibbonYaw(1, 10)).toBeLessThan(promiseRibbonYaw(1, 0));
  });

  it("keeps the river's stones, pads and lotus off the six procedural piers", () => {
    const river = FAR_ZONE_LAYOUTS[4];
    const f = facingOf("live-feed");
    const piers = Array.from({ length: 6 }, (_, k) => { const a = k * .72, x = Math.cos(a) * 8, z = Math.sin(a) * 6; return [x * Math.cos(f) - z * Math.sin(f), 1 + k * .22, x * Math.sin(f) + z * Math.cos(f)]; });
    for (const placement of river.placements) {
      if (placement.id.startsWith("nature.blossom")) continue;
      const sphere = placementSphere(placement);
      for (const pier of piers) expect(flat(sphere.center, pier) - sphere.radius - 1.5, `${label(river, placement)} against the pier at ${pier.map(v => v.toFixed(1)).join(",")}`).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------------------------------ */

describe("corridors: bridges and legs", () => {
  it("recomputes the thirteen bridges of the design world with the design's lengths and eight long ones", () => {
    const bridges = corridorBridges();
    expect(bridges.map(b => `${b.from}>${b.to}`)).toEqual([
      "garden>heart", "heart>expressions", "garden>expressions", "heart>featured", "featured>practice", "practice>peacemakers",
      "featured>promise", "promise>welcome", "garden>live-feed", "garden>calendar", "peacemakers>milestone", "milestone>orbit", "calendar>status",
    ]);
    expect(bridges.map(b => Math.round(b.length * 10) / 10)).toEqual([58.6, 54.6, 62.2, 52.4, 45.2, 46.8, 51.9, 37.7, 54.4, 56.2, 59.7, 54, 60]);
    expect(bridges.filter(b => b.long).map(b => `${b.from}>${b.to}`)).toEqual([
      "garden>heart", "heart>expressions", "garden>expressions", "garden>live-feed", "garden>calendar", "peacemakers>milestone", "milestone>orbit", "calendar>status",
    ]);
    expect(LONG_BRIDGE).toBe(53.5);
    // The deck's raised middle and its four unit sidestep, alternating by bridge index.
    expect(bridges[0].middle[1]).toBeCloseTo((bridges[0].start[1] + bridges[0].end[1]) / 2 + 2.4, 3);
    expect(bridges[0].middle[0]).toBeCloseTo((bridges[0].start[0] + bridges[0].end[0]) / 2 - 4, 3);
    expect(bridges[1].middle[0]).toBeCloseTo((bridges[1].start[0] + bridges[1].end[0]) / 2 + 4, 3);
    expect(corridorBridges()).toEqual(bridges);
  });

  it("flies the thirteen tour legs eye to eye with the design's lengths, closing on the gate", () => {
    const legs = tourLegs();
    expect(legs).toHaveLength(13);
    expect(legs[0]).toEqual({ from: "welcome", to: "garden" });
    expect(legs[12]).toEqual({ from: "promise", to: "welcome" });
    const straight = legs.map(leg => new Vector3(...zone(leg.from).eye).distanceTo(new Vector3(...zone(leg.to).eye)));
    [55.5, 87.8, 46.7, 56.9, 79.2, 43.3, 149.1, 64.3, 74.7, 52, 197, 109.5, 32.6].forEach((design, i) => expect(straight[i], `leg ${i}`).toBeCloseTo(design, 0));
    const curve = flightCurve("practice", "calendar");
    curve.getPoint(0).toArray().forEach((v, k) => expect(v).toBeCloseTo(zone("practice").eye[k], 6));
    curve.getPoint(1).toArray().forEach((v, k) => expect(v).toBeCloseTo(zone("calendar").eye[k], 6));
    expect(curve.getPoint(.5).y).toBeCloseTo(Math.max(11, 15) + 7, 1);
    // A departure swung 27.5 degrees round the target starts elsewhere but lands on the same eye.
    expect(flightCurve("practice", "calendar", .48).getPoint(0).distanceTo(curve.getPoint(0))).toBeGreaterThan(10);
    flightCurve("practice", "calendar", .48).getPoint(1).toArray().forEach((v, k) => expect(v).toBeCloseTo(zone("calendar").eye[k], 6));
  });
});

describe("corridors: islets", () => {
  const islets = corridorIslets();
  const bridges = corridorBridges();
  const deckSamples = bridges.flatMap(bridge => bridgeCurve(bridge).getSpacedPoints(24).map(point => ({ bridge: `${bridge.from}>${bridge.to}`, point })));
  const treeBox = assetBox("nature.blossom-tree-a");
  /** The islet's body and its tree crown, two spheres, world space. */
  function isletSpheres(islet: (typeof islets)[number]): Sphere[] {
    const body = assetBox("nature.island-small");
    const pivotY = islet.center[1] - KIT_ISLAND.grassAbovePivot * islet.scale;
    const bodyRadius = islet.scale * Math.hypot(Math.hypot(body.max[0] - body.min[0], body.max[2] - body.min[2]) / 2, (body.max[1] - body.min[1]) / 2);
    const crownY = islet.tree.position[1] + (treeBox.min[1] + treeBox.max[1]) / 2 * islet.tree.scale;
    const crownRadius = islet.tree.scale * Math.hypot(Math.hypot(treeBox.max[0] - treeBox.min[0], treeBox.max[2] - treeBox.min[2]) / 2, (treeBox.max[1] - treeBox.min[1]) / 2);
    return [{ center: [islet.center[0], pivotY, islet.center[2]], radius: bodyRadius }, { center: [islet.tree.position[0], crownY, islet.tree.position[2]], radius: crownRadius }];
  }

  it("places one islet beside each of the eight long bridges at its station, 4 below the deck, plus four along the sky lanes", () => {
    expect(islets).toHaveLength(12);
    expect(corridorIslets()).toEqual(islets);
    const long = bridges.filter(b => b.long);
    long.forEach((bridge, i) => {
      const islet = islets[i];
      expect(islet.reason).toBe(`bridge ${bridge.from}>${bridge.to}`);
      const station = ISLET_STATIONS[`${bridge.from}>${bridge.to}`] ?? {};
      const point = bridgeCurve(bridge).getPoint(station.along ?? .5);
      expect(Math.hypot(islet.center[0] - point.x, islet.center[2] - point.z)).toBeCloseTo(station.side ?? ISLET_SIDE_OFFSET, 2);
      expect(islet.center[1]).toBeCloseTo(point.y - ISLET_BELOW_DECK, 2);
      expect(islet.radius).toBeCloseTo(KIT_ISLAND.grassRadius * islet.scale, 5);
    });
    // Six islets keep the design's middle of the bridge and 22 units; the two under a parked camera's arc move, never off the bridge's flank.
    expect(Object.keys(ISLET_STATIONS).sort()).toEqual(["garden>expressions", "garden>heart", "garden>live-feed"]);
    for (const [bridge, station] of Object.entries(ISLET_STATIONS)) {
      expect(long.some(b => `${b.from}>${b.to}` === bridge), bridge).toBe(true);
      if (station?.along !== undefined) expect(station.along).toBeGreaterThanOrEqual(.2);
      if (station?.along !== undefined) expect(station.along).toBeLessThanOrEqual(.8);
      if (station?.side !== undefined) expect(station.side).toBeLessThanOrEqual(ISLET_SIDE_OFFSET + 4);
    }
    expect(islets.slice(8).map(islet => islet.reason)).toEqual(["sky lane practice>calendar", "sky lane practice>calendar", "sky lane milestone>live-feed", "sky lane milestone>live-feed"]);
    for (const islet of islets) expect(Math.hypot(islet.tree.position[0] - islet.center[0], islet.tree.position[2] - islet.center[2])).toBeLessThan(islet.radius * .5);
  });

  it("keeps every islet clear of the thirteen districts, the arrival stage, the far landmarks and each other", () => {
    const landmarks = studyLandmarkLayout();
    for (const islet of islets) {
      for (const district of ZONES) expect(flat(islet.center, district.center) - islandRadius(district.id) - islet.radius, `${islet.reason} islet at ${islet.center.join(",")} against ${district.id}`).toBeGreaterThanOrEqual(2);
      if (islet.center[1] < ENTRY.top) expect(flat(islet.center, ENTRY.center) - ENTRY.radius - islet.radius, `${islet.reason} islet against the arrival stage`).toBeGreaterThanOrEqual(0);
      for (const site of landmarks) expect(flat(islet.center, site.center) - site.radius - islet.radius).toBeGreaterThanOrEqual(2);
      for (const other of islets) if (other !== islet) expect(distance(islet.center, other.center) - islet.radius - other.radius, `${islet.reason} against ${other.reason}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps every islet and its tree clear of every bridge deck and rail", () => {
    for (const islet of islets) for (const sample of deckSamples) {
      expect(flat(islet.center, [sample.point.x, 0, sample.point.z]) - islet.radius - POST_SIDE_OFFSET, `${islet.reason} islet against the ${sample.bridge} deck`).toBeGreaterThanOrEqual(1);
      for (const sphere of isletSpheres(islet)) expect(distance(sphere.center, [sample.point.x, sample.point.y, sample.point.z]) - sphere.radius, `${islet.reason} islet against the ${sample.bridge} deck`).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps every islet and its tree 6 units clear of every flight the director can make", () => {
    for (const islet of islets) for (const [part, sphere] of isletSpheres(islet).map((sphere, k) => [k ? "crown" : "body", sphere] as const)) {
      const { gap, message } = flightGap(`${islet.reason} islet ${part} at ${islet.center.join(",")}`, sphere.center, sphere.radius);
      expect(gap, message).toBeGreaterThanOrEqual(6);
    }
  });

  it("offers the islets as cloud collar sites only when the kit has the island, and leaves every existing puff unchanged", () => {
    expect(kitCorridorSites({ has: () => false })).toEqual([]);
    const sites = kitCorridorSites({ has: id => id === "nature.island-small" });
    expect(sites).toHaveLength(12);
    expect(sites.map(site => site.center)).toEqual(islets.map(islet => islet.center));
    for (const site of sites) expect(site.radius).toBeLessThan(SMALL_SITE_RADIUS);
    const landmarkSites = studyLandmarkCloudSites(studyLandmarkLayout());
    const before = studyCloudLayout(777, landmarkSites);
    const after = studyCloudLayout(777, [...landmarkSites, ...sites.map(site => ({ center: [...site.center] as [number, number, number], radius: site.radius }))]);
    expect(after.sky).toEqual(before.sky);
    expect(after.island.slice(0, before.island.length)).toEqual(before.island);
    const collars = after.island.slice(before.island.length);
    expect(collars.length).toBeGreaterThanOrEqual(sites.length * 3);
    expect(collars.length).toBeLessThanOrEqual(sites.length * 4);
    for (const puff of collars) {
      // Out from the rock and under the grass far enough to show beside the kit island's own
      // faceted underside: some islet owns the puff within these bounds (two islets neighbour).
      expect(puff.width).toBeLessThanOrEqual(11 + 1e-9);
      expect(puff.width).toBeGreaterThanOrEqual(7 - 1e-9);
      expect(puff.alpha).toBeLessThanOrEqual(.82 + 1e-9);
      const owner = sites.find(site => {
        const out = flat([puff.x, 0, puff.z], site.center);
        return out >= site.radius + 2.4 - 1e-9 && out <= site.radius + 4.6 + 1e-9 && puff.y < site.center[1] - 1.9 && puff.y > site.center[1] - 4.5;
      });
      expect(owner, `collar puff at ${puff.x.toFixed(1)},${puff.z.toFixed(1)}`).toBeDefined();
    }
    // A district or far landmark site is never shrunk: the same call without corridor sites is byte for byte the old layout.
    expect(studyCloudLayout(777, landmarkSites)).toEqual(before);
    expect(before.island.filter(puff => puff.width < 9)).toHaveLength(0);
  });
});

describe("corridors: lantern posts", () => {
  const posts = corridorPosts();
  const bridges = corridorBridges();

  it("stands two posts at each end of every bridge, on the deck, just inside the rail, except the two ends under a parked camera", () => {
    expect(Object.entries(POST_FREE_ENDS)).toEqual([["featured>practice", "start"], ["featured>promise", "end"]]);
    expect(posts).toHaveLength(bridges.length * 4 - 4);
    expect(corridorPosts()).toEqual(posts);
    for (const bridge of bridges) {
      const own = posts.filter(post => post.bridge === `${bridge.from}>${bridge.to}`);
      const free = POST_FREE_ENDS[`${bridge.from}>${bridge.to}`];
      expect(own).toHaveLength(free ? 2 : 4);
      const at = (end: [number, number, number]) => own.filter(post => Math.hypot(post.position[0] - end[0], post.position[2] - end[2]) < 5).length;
      expect(at(bridge.start)).toBe(free === "start" ? 0 : 2);
      expect(at(bridge.end)).toBe(free === "end" ? 0 : 2);
      const samples = bridgeCurve(bridge).getSpacedPoints(400);
      for (const post of own) {
        const nearest = samples.reduce((best, point) => Math.min(best, Math.hypot(point.x - post.position[0], point.z - post.position[2])), Infinity);
        expect(nearest).toBeCloseTo(POST_SIDE_OFFSET, 1);
        const deckY = samples.reduce((best, point) => (Math.hypot(point.x - post.position[0], point.z - post.position[2]) < Math.hypot(best.x - post.position[0], best.z - post.position[2]) ? point : best)).y;
        expect(Math.abs(post.position[1] - deckY)).toBeLessThan(.15);
        expect(Math.hypot(post.position[0] - bridge.start[0], post.position[2] - bridge.start[2]) < 5 || Math.hypot(post.position[0] - bridge.end[0], post.position[2] - bridge.end[2]) < 5).toBe(true);
      }
    }
  });

  it("keeps every post 6 units clear of every flight the director can make, and could not at the two free ends", () => {
    const box = assetBox("landmark.lantern-post");
    const radius = 1.1 * Math.hypot(Math.hypot(box.max[0] - box.min[0], box.max[2] - box.min[2]) / 2, (box.max[1] - box.min[1]) / 2);
    const center = (position: readonly number[]) => [position[0], position[1] + (box.max[1] + box.min[1]) / 2 * 1.1, position[2]];
    for (const post of posts) {
      const { gap, message } = flightGap(`post on ${post.bridge} at ${post.position.join(",")}`, center(post.position), radius);
      expect(gap, message).toBeGreaterThanOrEqual(6);
    }
    // The omitted pairs would stand under the terrace and Pavilion cameras' reading arcs: the
    // arc itself is the start of every flight from there, and it comes within 5.6 units.
    for (const [key, end] of Object.entries(POST_FREE_ENDS)) {
      const bridge = bridges.find(b => `${b.from}>${b.to}` === key)!;
      const curve = bridgeCurve(bridge), t = end === "start" ? .03 : .97;
      const point = curve.getPoint(t), tangent = curve.getTangent(t);
      const side = new Vector3(tangent.z, 0, -tangent.x).normalize();
      const gaps = [-1, 1].map(sign => flightGap(key, center([point.x + side.x * POST_SIDE_OFFSET * sign, point.y + .02, point.z + side.z * POST_SIDE_OFFSET * sign]), radius).gap);
      expect(Math.min(...gaps), `${key} ${end}`).toBeLessThan(6);
      expect(Math.min(...gaps), `${key} ${end}`).toBeGreaterThan(4.5);
    }
  });
});

describe("corridors: sky lanes", () => {
  const clouds = corridorClouds();
  const cloudBox = assetBox("nature.cloud-c");
  const deckSamples = corridorBridges().flatMap(bridge => bridgeCurve(bridge).getSpacedPoints(24).map(point => ({ bridge: `${bridge.from}>${bridge.to}`, point })));

  it("dresses the two fast legs with six and eight soft clouds at flight height, beside the line, their tops above it", () => {
    expect(SKY_LANES.map(lane => `${lane.from}>${lane.to}`)).toEqual(["practice>calendar", "milestone>live-feed"]);
    expect(clouds.filter(cloud => cloud.lane === "practice>calendar")).toHaveLength(6);
    expect(clouds.filter(cloud => cloud.lane === "milestone>live-feed")).toHaveLength(8);
    expect(corridorClouds()).toEqual(clouds);
    expect(SOFT_CLOUD.opacity).toBeLessThanOrEqual(.5);
    for (const lane of SKY_LANES) {
      const curve = flightCurve(lane.from, lane.to);
      for (const spec of lane.clouds) {
        const station = curve.getPoint(spec.t);
        const cloud = clouds.find(c => c.lane === `${lane.from}>${lane.to}` && c.position.every((v, k) => Math.abs(v - skyLaneStation(lane, spec)[k]) < 1e-9))!;
        expect(cloud, `${lane.from}>${lane.to} station ${spec.t}`).toBeDefined();
        expect(station.y - cloud.position[1]).toBeCloseTo(spec.drop, 2);
        expect(Math.hypot(cloud.position[0] - station.x, cloud.position[2] - station.z)).toBeCloseTo(Math.abs(spec.side), 2);
        // Beside the line, outside the leg's own 6 unit corridor, and the puff's top reaches above the line.
        expect(Math.abs(spec.side)).toBeGreaterThanOrEqual(9);
        expect(Math.abs(spec.side)).toBeLessThanOrEqual(13);
        expect(spec.drop).toBeGreaterThanOrEqual(2);
        expect(spec.drop).toBeLessThanOrEqual(3);
        expect(spec.scale * cloudBox.max[1] - spec.drop, `${lane.from}>${lane.to} station ${spec.t} top above the line`).toBeGreaterThan(0);
        expect(spec.scale).toBeGreaterThanOrEqual(1.6);
        expect(spec.scale).toBeLessThanOrEqual(2.4);
      }
      expect([...lane.clouds.map(c => c.t)]).toEqual([...lane.clouds.map(c => c.t)].sort((a, b) => a - b));
    }
  });

  const cloudSphere = (cloud: (typeof clouds)[number]): Sphere => ({
    center: [cloud.position[0], cloud.position[1] + (cloudBox.min[1] + cloudBox.max[1]) / 2 * cloud.scale, cloud.position[2]],
    radius: cloud.scale * Math.hypot(Math.hypot(cloudBox.max[0] - cloudBox.min[0], cloudBox.max[2] - cloudBox.min[2]) / 2, (cloudBox.max[1] - cloudBox.min[1]) / 2),
  });

  it("keeps every cloud clear of the districts, the arrival stage, the far landmarks, the islets, the posts and each other (a soft cloud may hang over a deck)", () => {
    const islets = corridorIslets();
    const posts = corridorPosts();
    const treeBox = assetBox("nature.blossom-tree-a"), body = assetBox("nature.island-small"), postBox = assetBox("landmark.lantern-post");
    const landmarks = studyLandmarkLayout();
    for (const cloud of clouds) {
      const { center, radius } = cloudSphere(cloud);
      const name = `${cloud.lane} cloud at ${cloud.position.join(",")}`;
      for (const district of ZONES) {
        const dy = center[1] - district.center[1];
        const horizontal = flat(cloud.position, district.center) - islandRadius(district.id) - 2 - radius;
        const vertical = dy > 14 ? dy - 14 - radius : dy < -6 ? -6 - dy - radius : -Infinity;
        expect(Math.max(horizontal, vertical), `${name} against ${district.id}`).toBeGreaterThanOrEqual(SOFT_CLOUD.solidGap);
      }
      if (center[1] < ENTRY.top + radius) expect(flat(cloud.position, ENTRY.center) - ENTRY.radius - radius, `${name} against the arrival stage`).toBeGreaterThanOrEqual(SOFT_CLOUD.solidGap);
      for (const site of landmarks) expect(flat(cloud.position, site.center) - site.radius - radius, `${name} against a far landmark`).toBeGreaterThanOrEqual(SOFT_CLOUD.solidGap);
      for (const islet of islets) {
        const pivotY = islet.center[1] - KIT_ISLAND.grassAbovePivot * islet.scale;
        const bodyRadius = islet.scale * Math.hypot(Math.hypot(body.max[0] - body.min[0], body.max[2] - body.min[2]) / 2, (body.max[1] - body.min[1]) / 2);
        const crownY = islet.tree.position[1] + (treeBox.min[1] + treeBox.max[1]) / 2 * islet.tree.scale;
        const crownRadius = islet.tree.scale * Math.hypot(Math.hypot(treeBox.max[0] - treeBox.min[0], treeBox.max[2] - treeBox.min[2]) / 2, (treeBox.max[1] - treeBox.min[1]) / 2);
        expect(distance(center, [islet.center[0], pivotY, islet.center[2]]) - radius - bodyRadius, `${name} against the ${islet.reason} islet`).toBeGreaterThanOrEqual(SOFT_CLOUD.solidGap);
        expect(distance(center, [islet.tree.position[0], crownY, islet.tree.position[2]]) - radius - crownRadius, `${name} against the ${islet.reason} islet's tree`).toBeGreaterThanOrEqual(SOFT_CLOUD.solidGap);
      }
      for (const post of posts) {
        const postRadius = 1.1 * Math.hypot(Math.hypot(postBox.max[0] - postBox.min[0], postBox.max[2] - postBox.min[2]) / 2, (postBox.max[1] - postBox.min[1]) / 2);
        expect(distance(center, [post.position[0], post.position[1] + (postBox.min[1] + postBox.max[1]) / 2 * 1.1, post.position[2]]) - radius - postRadius, `${name} against a ${post.bridge} post`).toBeGreaterThanOrEqual(SOFT_CLOUD.solidGap);
      }
      for (const other of clouds) if (other !== cloud) expect(distance(center, cloudSphere(other).center), `${name} against the cloud at ${other.position.join(",")}`).toBeGreaterThanOrEqual(SOFT_CLOUD.spacing);
      expect(cloud.position[1]).toBeGreaterThan(-1.5);
    }
  });

  it("keeps every cloud's centre 6 units from the tour legs and every arrival and return flight (soft clouds are exempt from the zone button pair flights, and say so)", () => {
    for (const cloud of clouds) {
      const { gap, message } = flightGap(`${cloud.lane} cloud at ${cloud.position.join(",")}`, cloud.position, 0, ["tour", "arrival"]);
      expect(gap, message).toBeGreaterThanOrEqual(SOFT_CLOUD.centreClearance);
    }
    // The relaxation is real and stated: some pair flight passes inside a soft cloud's sphere.
    const pairGaps = clouds.map(cloud => FLIGHTS.clearance(cloud.position, 0, ["pairs"]).clearance);
    expect(Math.min(...pairGaps)).toBeLessThan(SOFT_CLOUD.centreClearance);
    const source = readFileSync(path.resolve(repo, "src/components/display/world/art/kit-corridor-routes.ts"), "utf8");
    expect(source).toContain("exempt from the zone button pair flights");
  });

  it("keeps every cloud's centre 6 units from the arrival flight from the Garden of Days, and its tops in the two fast legs' view", () => {
    for (const s of ARC_SAMPLES) {
      const curve = flightBetween(arcEye("calendar", s.angle, s.approach, s.bob), ARRIVAL_VIEW.eye);
      for (const point of curve.getSpacedPoints(Math.ceil(curve.getLength() / 2))) for (const cloud of clouds) {
        expect(distance(cloud.position, [point.x, point.y, point.z]), `${cloud.lane} cloud at ${cloud.position.join(",")} on the calendar arc ${s.angle.toFixed(2)} arrival flight`).toBeGreaterThanOrEqual(SOFT_CLOUD.centreClearance);
      }
    }
    // On its own leg every cloud passes within 20 units of the camera at some point: cloud tops, not distant smears.
    for (const lane of SKY_LANES) {
      const samples = flightCurve(lane.from, lane.to).getSpacedPoints(300);
      for (const cloud of clouds.filter(c => c.lane === `${lane.from}>${lane.to}`)) {
        const nearest = samples.reduce((best, point) => Math.min(best, distance(cloud.position, [point.x, point.y, point.z])), Infinity);
        expect(nearest, `${cloud.lane} cloud at ${cloud.position.join(",")}`).toBeLessThanOrEqual(20);
        expect(nearest).toBeGreaterThanOrEqual(SOFT_CLOUD.centreClearance);
      }
    }
  });

  it("sits its islets beside the flight, 20 to 40 units off the line, none over a district", () => {
    const laneIslets = corridorIslets().filter(islet => islet.reason.startsWith("sky lane"));
    expect(laneIslets).toHaveLength(4);
    for (const lane of SKY_LANES) {
      const samples = flightCurve(lane.from, lane.to).getSpacedPoints(200);
      for (const spec of lane.islets) {
        const nearest = samples.reduce((best, point) => Math.min(best, Math.hypot(point.x - spec.center[0], point.z - spec.center[2])), Infinity);
        expect(nearest, `${lane.from}>${lane.to} islet at ${spec.center.join(",")}`).toBeGreaterThanOrEqual(20);
        expect(nearest, `${lane.from}>${lane.to} islet at ${spec.center.join(",")}`).toBeLessThanOrEqual(40);
      }
    }
    for (const islet of laneIslets) expect(islet.center[1]).toBeGreaterThan(-1);
  });
});

describe("corridors: view distances, tiers and the triangle budget (design 7.2, 7.5, 7.6)", () => {
  type Tris = { id: string; tris: number };
  const tris = (id: string) => (manifest.assets as unknown as Tris[]).find(entry => entry.id === id)!.tris;

  it("draws corridor pieces inside the Auto detail distance, hides the clouds and stops the islets at 90 on Low", () => {
    expect(POST_VIEW_DISTANCE).toBeLessThanOrEqual(110);
    expect(LOW_TIER_VIEW.post).toBeLessThanOrEqual(70);
    expect(LOW_TIER_VIEW.islet).toBe(90);
    expect(LOW_TIER_VIEW.cloud).toBe(0);
    expect(LOD_NEAR).toBeLessThan(ISLET_VIEW_DISTANCE);
    // Between two recounts the camera moves two units or turns two degrees: the margin covers that sweep at the farthest piece.
    expect(FRUSTUM_MARGIN).toBeGreaterThanOrEqual(2 + .035 * CLOUD_VIEW_DISTANCE);
    expect(CORRIDOR_KEEP.islet[1]).toBeLessThan(CORRIDOR_KEEP.islet[0]);
    expect(CORRIDOR_KEEP.tree[1]).toBeLessThan(CORRIDOR_KEEP.tree[0]);
  });

  it("keeps the corridor triangles in range of every parked camera under 200k before the frustum test", () => {
    // The decimated geometry keeps about `keep` of the file's triangles. Counting every piece in
    // range, whether or not it is on screen, bounds what the main pass can draw at a parked zone;
    // the frustum test then removes the pieces behind and beside the camera.
    const posts = corridorPosts(), islets = corridorIslets(), clouds = corridorClouds();
    for (const zone of ZONES) {
      const eye = zone.eye;
      const near = (point: readonly number[]) => Math.hypot(point[0] - eye[0], point[1] - eye[1], point[2] - eye[2]);
      let total = 0;
      for (const post of posts) if (near(post.position) <= POST_VIEW_DISTANCE) total += tris("landmark.lantern-post") * CORRIDOR_KEEP.post;
      for (const islet of islets) {
        const d = near(islet.center);
        if (d > ISLET_VIEW_DISTANCE) continue;
        const level = d > LOD_NEAR ? 1 : 0;
        total += tris("nature.island-small") * CORRIDOR_KEEP.islet[level] + tris("nature.blossom-tree-a") * CORRIDOR_KEEP.tree[level];
      }
      for (const cloud of clouds) if (near(cloud.position) <= CLOUD_VIEW_DISTANCE) total += tris("nature.cloud-c") * CORRIDOR_KEEP.cloud;
      expect(total, `${zone.id}: ${Math.round(total)} triangles in range`).toBeLessThan(200000);
    }
  });
});

describe("corridors: every flight the director makes (camera-director.ts move, visit, beginArrival, endArrival)", () => {
  it("builds the flights the way the director does: a centripetal curve through the start, a middle raised 7 above the higher end, and the end", () => {
    const start: [number, number, number] = [88, 15, 11], end = ARRIVAL_VIEW.eye;
    const curve = flightBetween(start, end);
    expect(curve.curveType).toBe("centripetal");
    expect(curve.closed).toBe(false);
    curve.getPoint(0).toArray().forEach((v, k) => expect(v).toBeCloseTo(start[k], 6));
    curve.getPoint(1).toArray().forEach((v, k) => expect(v).toBeCloseTo(end[k], 6));
    expect(curve.points[1].toArray()).toEqual([(88 + 15) / 2, Math.max(15, 17) + 7, (11 + 43) / 2]);
    // The reviewer's trace: the flight from the calendar eye to the arrival view passes near (51.5, 24, 27).
    const nearest = curve.getSpacedPoints(200).reduce((best, point) => Math.min(best, point.distanceTo(new Vector3(51.5, 24, 27))), Infinity);
    expect(nearest).toBeLessThan(1);
  });

  it("mirrors the director's reading arc for every sample and covers the tour, every ordered pair and the arrivals", () => {
    for (const zone of ZONES) for (const s of ARC_SAMPLES) readingArcEye(zone.id, s.angle, s.approach, s.bob).forEach((v, k) => expect(v).toBeCloseTo(arcEye(zone.id, s.angle, s.approach, s.bob)[k], 9));
    expect(FLIGHTS.curves).toEqual({ tour: 13 * START_ANGLES.length, pairs: 13 * 12 * ARC_SAMPLES.length, arrival: 2 * (13 * ARC_SAMPLES.length + 13 * 3) });
    expect(ARC_SAMPLES).toHaveLength(81);
    expect(FLIGHTS.samples).toBeGreaterThan(300000);
    // A sphere on the arrival view itself is reached by an arrival flight; one far above the world by nothing.
    expect(FLIGHTS.clearance(ARRIVAL_VIEW.eye, 1).clearance).toBeLessThan(0);
    expect(FLIGHTS.clearance(ARRIVAL_VIEW.eye, 1, ["arrival"]).flight).toMatch(/arrival flight|return flight/);
    expect(FLIGHTS.clearance(ARRIVAL_VIEW.eye, 1, ["tour"]).clearance).toBeGreaterThan(0);
    expect(FLIGHTS.clearance([0, 200, 0], 1).clearance).toBe(Infinity);
  });
});

describe("corridors: the tour", () => {
  it("keeps the tour order the camera director flies", () => {
    expect(TOUR_ORDER).toEqual(["welcome", "garden", "featured", "heart", "expressions", "peacemakers", "practice", "calendar", "status", "orbit", "milestone", "live-feed", "promise"]);
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(1, 7, 0), new Vector3(2, 0, 0)], false, "centripetal");
    expect(curve.getPoint(.5).y).toBeGreaterThan(5);
  });
});

describe("the islet look, the collar tints and the far zone builder (round four polish)", () => {
  it("colours the islet like the districts: lawn cap, rose bushes, saucer pink rock, a gold rim", () => {
    expect(ISLET_COLOURS.cap).toBe("#c9dfb5");
    expect(ISLET_COLOURS.bush).toBe("#e7a3c0");
    expect(ISLET_COLOURS.rim).toBe("gold");
    const source = readFileSync(path.resolve(repo, "src/components/display/world/art/kit-corridors.ts"), "utf8");
    expect(source).toContain("Kit corridor islet rims");
  });

  it("tints the island collar paler than the sky ring, toward the kit cloud's pale rose", () => {
    const saturation = (hex: string) => {
      const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      return max === min ? 0 : (max - min) / (1 - Math.abs(max + min - 1));
    };
    expect(STUDY_COLLAR_TINTS).toHaveLength(3);
    STUDY_COLLAR_TINTS.forEach((tint, i) => {
      // A third of the saturation cut, the hue and lightness kept (the same HSL model as three's Color).
      expect(saturation(tint)).toBeLessThanOrEqual(saturation(STUDY_CLOUD_TINTS[i]) * .7);
      expect(saturation(tint)).toBeGreaterThanOrEqual(saturation(STUDY_CLOUD_TINTS[i]) * .6);
    });
  });

  it("gates the far zones on ?far=off only, dresses the six far zones and decimates every repeated piece it places", () => {
    expect(farZonesEnabled("")).toBe(true);
    expect(farZonesEnabled("?source=sample&art=design")).toBe(true);
    expect(farZonesEnabled("?source=sample&art=design&far=off")).toBe(false);
    expect(farZonesEnabled("?far=off&source=sample")).toBe(false);
    expect(farZonesEnabled("?far=offline")).toBe(true);
    expect([...FAR_BUILDER_ZONES]).toEqual([...FAR_ZONE_IDS]);
    expect(FAR_DETAIL_DISTANCE).toEqual({ high: 140, auto: 110, low: 70 });
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      if (placement.role !== "instanced" || placement.id.startsWith("expression.")) continue;
      expect(FAR_KEEP[placement.id], `${layout.zone} ${placement.id} has a decimation share`).toBeGreaterThan(0);
      expect(FAR_KEEP[placement.id]).toBeLessThanOrEqual(.5);
    }
    expect(FAR_KEEP["core.pearl"]).toBeGreaterThan(0);
    expect(FAR_KEEP["landmark.pearl-column"]).toBeGreaterThan(0);
  });
});
