import { readFileSync } from "node:fs";
import path from "node:path";
import { CatmullRomCurve3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { RECOGNITION_ZONES, ZONES, TOUR_ORDER, type ZoneId } from "@/components/display/world/world-data";
import {
  CALENDAR_GRID,
  COSMOS_CENTER,
  COSMOS_RINGS,
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
  farZoneCommonLayouts,
  farZoneLayouts,
  fountainPearlPose,
  observatoryColumnScale,
  promiseRibbonYaw,
  readingKeepOut,
  type KitPlacement,
  type ZoneLayout,
} from "@/components/display/world/prototype/kit-layout-far";
import {
  ISLET_BELOW_DECK,
  ISLET_SIDE_OFFSET,
  KIT_ISLAND,
  LONG_BRIDGE,
  POST_SIDE_OFFSET,
  SKY_LANES,
  bridgeCurve,
  corridorBridges,
  corridorClouds,
  corridorIslets,
  corridorPosts,
  flightCurve,
  kitCorridorSites,
  tourLegs,
} from "@/components/display/world/prototype/kit-corridors";
import { SMALL_SITE_RADIUS, studyCloudLayout } from "@/components/display/world/prototype/study-clouds";
import { studyLandmarkCloudSites, studyLandmarkLayout } from "@/components/display/world/prototype/study-landmarks";

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
/** Every travel corridor sample: the 13 legs from three departures each, every 4 units. */
function travelSamples() {
  const samples: Array<{ leg: string; point: Vector3 }> = [];
  for (const leg of tourLegs()) for (const angle of START_ANGLES) {
    const curve = flightCurve(leg.from, leg.to, angle);
    for (const point of curve.getSpacedPoints(Math.ceil(curve.getLength() / 4))) samples.push({ leg: `${leg.from}>${leg.to}`, point });
  }
  return samples;
}
const TRAVEL = travelSamples();
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

  it("keeps every placement on its island, except the sculpted clouds under the two floating rims", () => {
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      const radial = Math.hypot(placement.position[0], placement.position[2]);
      const cloud = placement.id.startsWith("nature.cloud-");
      expect(radial, label(layout, placement)).toBeLessThanOrEqual(cloud ? 20 : FAR_ISLAND_RADIUS - .4);
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

  /** The cosmos encircles the hero pearl by design (6.13); those pieces are proven by the cone test below instead. */
  const encircles = (layout: ZoneLayout, placement: KitPlacement) =>
    layout.zone === "orbit" && (placement.id === "recognition.orbit-ring" || placement.id.startsWith("expression.") || placement.id === "core.pearl");

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

  it("keeps every far placement 6 units clear of every travel corridor sample", () => {
    for (const layout of ALL_FAR) for (const placement of layout.placements) {
      const sphere = placementSphere(placement);
      const world = toWorld(layout.zone, sphere.center);
      for (const sample of TRAVEL) expect(distance(world, [sample.point.x, sample.point.y, sample.point.z]) - sphere.radius, `${label(layout, placement)} against the ${sample.leg} corridor`).toBeGreaterThanOrEqual(6);
    }
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

  it("places one islet beside each of the eight long bridges, 22 to the side and 4 below the deck, plus four along the sky lanes", () => {
    expect(islets).toHaveLength(12);
    expect(corridorIslets()).toEqual(islets);
    const long = bridges.filter(b => b.long);
    long.forEach((bridge, i) => {
      const islet = islets[i];
      expect(islet.reason).toBe(`bridge ${bridge.from}>${bridge.to}`);
      const mid = bridgeCurve(bridge).getPoint(.5);
      expect(Math.hypot(islet.center[0] - mid.x, islet.center[2] - mid.z)).toBeCloseTo(ISLET_SIDE_OFFSET, 2);
      expect(islet.center[1]).toBeCloseTo(mid.y - ISLET_BELOW_DECK, 2);
      expect(islet.radius).toBeCloseTo(KIT_ISLAND.grassRadius * islet.scale, 5);
    });
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

  it("keeps every islet and its tree 6 units clear of every travel corridor sample", () => {
    for (const islet of islets) for (const sphere of isletSpheres(islet)) for (const sample of TRAVEL)
      expect(distance(sphere.center, [sample.point.x, sample.point.y, sample.point.z]) - sphere.radius, `${islet.reason} islet at ${islet.center.join(",")} against the ${sample.leg} corridor`).toBeGreaterThanOrEqual(6);
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
      const site = sites.reduce((best, candidate) => (flat([puff.x, 0, puff.z], candidate.center) < flat([puff.x, 0, puff.z], best.center) ? candidate : best));
      const shrink = site.radius / 13.8;
      expect(puff.width).toBeLessThanOrEqual(16 * shrink + 1e-9);
      expect(puff.width).toBeGreaterThanOrEqual(9 * shrink - 1e-9);
      expect(flat([puff.x, 0, puff.z], site.center)).toBeLessThanOrEqual(site.radius + 4 * shrink + 1e-9);
      expect(puff.y).toBeLessThan(site.center[1] - 1.5);
      expect(puff.y).toBeGreaterThan(site.center[1] - 4.7);
    }
    // A district or far landmark site is never shrunk: the same call without corridor sites is byte for byte the old layout.
    expect(studyCloudLayout(777, landmarkSites)).toEqual(before);
    expect(before.island.filter(puff => puff.width < 9)).toHaveLength(0);
  });
});

describe("corridors: lantern posts", () => {
  const posts = corridorPosts();
  const bridges = corridorBridges();

  it("stands two posts at each end of every bridge, on the deck, 2.6 off its centre line", () => {
    expect(posts).toHaveLength(bridges.length * 4);
    expect(corridorPosts()).toEqual(posts);
    for (const bridge of bridges) {
      const own = posts.filter(post => post.bridge === `${bridge.from}>${bridge.to}`);
      expect(own).toHaveLength(4);
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

  it("keeps every post 6 units clear of every travel corridor sample", () => {
    const box = assetBox("landmark.lantern-post");
    const radius = 1.1 * Math.hypot(Math.hypot(box.max[0] - box.min[0], box.max[2] - box.min[2]) / 2, (box.max[1] - box.min[1]) / 2);
    for (const post of posts) {
      const center = [post.position[0], post.position[1] + (box.max[1] + box.min[1]) / 2 * 1.1, post.position[2]];
      for (const sample of TRAVEL) expect(distance(center, [sample.point.x, sample.point.y, sample.point.z]) - radius, `post on ${post.bridge} at ${post.position.join(",")} against the ${sample.leg} corridor`).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("corridors: sky lanes", () => {
  const clouds = corridorClouds();
  const cloudBox = assetBox("nature.cloud-c");
  const deckSamples = corridorBridges().flatMap(bridge => bridgeCurve(bridge).getSpacedPoints(24).map(point => ({ bridge: `${bridge.from}>${bridge.to}`, point })));

  it("dresses the two fast legs with four and seven clouds under the flight line", () => {
    expect(SKY_LANES.map(lane => `${lane.from}>${lane.to}`)).toEqual(["practice>calendar", "milestone>live-feed"]);
    expect(clouds.filter(cloud => cloud.lane === "practice>calendar")).toHaveLength(4);
    expect(clouds.filter(cloud => cloud.lane === "milestone>live-feed")).toHaveLength(7);
    expect(corridorClouds()).toEqual(clouds);
    for (const lane of SKY_LANES) {
      const curve = flightCurve(lane.from, lane.to);
      for (const spec of lane.clouds) {
        const station = curve.getPoint(spec.t);
        const cloud = clouds.find(c => c.lane === `${lane.from}>${lane.to}` && Math.abs(c.position[0] - station.x - spec.offset[0]) < 1e-2)!;
        expect(cloud, `${lane.from}>${lane.to} station ${spec.t}`).toBeDefined();
        expect(station.y - cloud.position[1]).toBeCloseTo(spec.drop, 2);
        expect(spec.drop).toBeGreaterThanOrEqual(14);
      }
      expect([...lane.clouds.map(c => c.t)]).toEqual([...lane.clouds.map(c => c.t)].sort((a, b) => a - b));
    }
  });

  it("keeps every cloud clear of the districts, the arrival stage, the decks and every travel corridor", () => {
    for (const cloud of clouds) {
      const radius = cloud.scale * Math.hypot(Math.hypot(cloudBox.max[0] - cloudBox.min[0], cloudBox.max[2] - cloudBox.min[2]) / 2, (cloudBox.max[1] - cloudBox.min[1]) / 2);
      for (const district of ZONES) expect(flat(cloud.position, district.center) - islandRadius(district.id) - radius, `${cloud.lane} cloud at ${cloud.position.join(",")} against ${district.id}`).toBeGreaterThanOrEqual(1);
      if (cloud.position[1] < ENTRY.top) expect(flat(cloud.position, ENTRY.center) - ENTRY.radius - radius, `${cloud.lane} cloud against the arrival stage`).toBeGreaterThanOrEqual(0);
      if (cloud.position[1] < 12) for (const sample of deckSamples) expect(flat(cloud.position, [sample.point.x, 0, sample.point.z]) - radius - POST_SIDE_OFFSET, `${cloud.lane} cloud against the ${sample.bridge} deck`).toBeGreaterThanOrEqual(1);
      for (const sample of TRAVEL) expect(distance(cloud.position, [sample.point.x, sample.point.y, sample.point.z]) - radius, `${cloud.lane} cloud at ${cloud.position.join(",")} against the ${sample.leg} corridor`).toBeGreaterThanOrEqual(6);
      expect(cloud.position[1]).toBeGreaterThan(-4);
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

describe("corridors: the tour", () => {
  it("keeps the tour order the camera director flies", () => {
    expect(TOUR_ORDER).toEqual(["welcome", "garden", "featured", "heart", "expressions", "peacemakers", "practice", "calendar", "status", "orbit", "milestone", "live-feed", "promise"]);
    const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(1, 7, 0), new Vector3(2, 0, 0)], false, "centripetal");
    expect(curve.getPoint(.5).y).toBeGreaterThan(5);
  });
});
