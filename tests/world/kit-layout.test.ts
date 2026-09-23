import { readFileSync } from "node:fs";
import { CatmullRomCurve3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  CORE_ZONE_LAYOUTS,
  ENTRY_STAGE,
  KIT_ARCH,
  KIT_BOUNDS,
  archRow,
  boxDistance,
  coreZoneLayouts,
  districtRadius,
  placementBox,
  readingKeepOut,
  toLocal,
  toWorld,
  zoneById,
  type KitBox,
  type KitPlacement,
  type ZoneLayout,
} from "../../src/components/display/world/prototype/kit-layout-core";
import { KIT_ZONE_LAYOUTS } from "../../src/components/display/world/prototype/kit-districts";
import { parseKitManifest } from "../../src/components/display/world/kit/kit-manifest";
import { RECOGNITION_ZONES, TOUR_ORDER, ZONES } from "../../src/components/display/world/world-data";

/**
 * Proves the kit placement tables against WORLD-INTEGRATION 6.2 without a browser: every
 * placement's authored box (scaled, turned, moved) stays out of the reading spheres, the
 * camera's reading arc, the thirteen travel corridors and the entry stage; every id is a
 * manifest id; the tables are deterministic; curves that must never touch never do.
 *
 * `LAYOUT_SETS` lists every table the builder places. Lane K3b's far zones join through
 * `KIT_ZONE_LAYOUTS` the moment the coordinator adds their import to `kit-districts.ts`.
 */
const LAYOUT_SETS: ReadonlyArray<readonly ZoneLayout[]> = [CORE_ZONE_LAYOUTS, KIT_ZONE_LAYOUTS];
const LAYOUTS: readonly ZoneLayout[] = KIT_ZONE_LAYOUTS;

const manifest = parseKitManifest(JSON.parse(readFileSync("public/world-kit/v1/manifest.json", "utf8")));
if (!manifest) throw new Error("public/world-kit/v1/manifest.json did not validate");
const entries = new Map(manifest.assets.map(entry => [entry.id as string, entry]));

/** The placement's box in world space (a conservative axis aligned box of the turned local box). */
function worldBox(layout: ZoneLayout, placement: KitPlacement): KitBox {
  const zone = zoneById(layout.zone);
  const local = placementBox(placement);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const x of [local.min[0], local.max[0]]) for (const y of [local.min[1], local.max[1]]) for (const z of [local.min[2], local.max[2]]) {
    const world = placement.frame === "root" ? [zone.center[0] + x, zone.center[1] + y, zone.center[2] + z] : toWorld(zone, [x, y, z]);
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], world[k]); max[k] = Math.max(max[k], world[k]); }
  }
  return { min, max };
}
function label(layout: ZoneLayout, placement: KitPlacement) {
  return `${layout.zone} ${placement.id} at ${placement.position.join(",")}${placement.note ? ` (${placement.note})` : ""}`;
}
/** Only the arcade frame (the Sanctuary's own rotation) is not a district frame; nothing uses it yet. */
function localBox(layout: ZoneLayout, placement: KitPlacement): KitBox {
  if (placement.frame === "root") {
    const zone = zoneById(layout.zone), box = worldBox(layout, placement);
    const a = toLocal(zone, box.min), b = toLocal(zone, box.max);
    return { min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])] };
  }
  return placementBox(placement);
}

describe("near zone tables", () => {
  it("cover distinct valid zones and the builder places every core table", () => {
    const ids = CORE_ZONE_LAYOUTS.map(layout => layout.zone);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(ZONES.some(zone => zone.id === id)).toBe(true);
    for (const layout of CORE_ZONE_LAYOUTS) expect(KIT_ZONE_LAYOUTS).toContain(layout);
    expect(ids).toContain("garden");
  });

  it("is deterministic", () => {
    expect(coreZoneLayouts()).toEqual(coreZoneLayouts());
    expect(JSON.stringify(coreZoneLayouts())).toBe(JSON.stringify(CORE_ZONE_LAYOUTS));
  });

  it("names only manifest ids, with authored bounds that match the manifest sizes", () => {
    for (const layout of LAYOUTS) for (const placement of layout.placements) {
      expect(entries.has(placement.id), label(layout, placement)).toBe(true);
      const bounds = KIT_BOUNDS[placement.id];
      expect(bounds, `${placement.id} has no authored bounds`).toBeDefined();
      const size = Math.max(...bounds.max.map((value, k) => value - bounds.min[k]));
      expect(Math.abs(size - entries.get(placement.id)!.size) / entries.get(placement.id)!.size, `${placement.id} largest side`).toBeLessThan(0.02);
      if (entries.get(placement.id)!.pivot === "base") expect(bounds.min[1], `${placement.id} stands on y 0`).toBe(0);
    }
  });

  it("keeps single zone landmarks in the zone they were authored for", () => {
    for (const layout of LAYOUTS) for (const placement of layout.placements) {
      const entry = entries.get(placement.id)!;
      if (entry.feature === "landmark" && entry.zones.length === 1) expect(entry.zones[0], label(layout, placement)).toBe(layout.zone);
    }
  });

  it("stands every placement on its own island", () => {
    for (const layout of LAYOUTS) for (const placement of layout.placements) {
      const box = localBox(layout, placement);
      const reach = Math.max(Math.hypot(box.min[0], box.min[2]), Math.hypot(box.max[0], box.max[2]), Math.hypot(box.min[0], box.max[2]), Math.hypot(box.max[0], box.min[2]));
      // The terrace top is the island radius less the three steps; a canopy may overhang it.
      const allowance = /tree|cloud/.test(placement.id) ? 4 : 0.5;
      expect(reach, label(layout, placement)).toBeLessThanOrEqual(districtRadius(layout.zone) + allowance);
      expect(box.min[1], `${label(layout, placement)} rests on or above the terrace`).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("keeps every placement out of the reading spheres", () => {
    for (const layout of LAYOUTS) {
      const spheres = [...readingKeepOut(layout.zone), ...(layout.keepOut ?? [])];
      for (const placement of layout.placements) {
        const box = localBox(layout, placement);
        for (const sphere of spheres) {
          const gap = boxDistance(box, sphere.center) - sphere.radius;
          expect(gap, `${label(layout, placement)} against the sphere at ${sphere.center.join(",")} r ${sphere.radius}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps every new placement out of the entry stage cylinder", () => {
    for (const layout of LAYOUTS) for (const placement of layout.placements) {
      // A kit arch standing where the design keeps a procedural arch is not new dressing: the
      // Garden's leftmost arch has always stood 11.6 units from the stage centre.
      if (placement.replaces === "arch") continue;
      const box = worldBox(layout, placement);
      if (box.min[1] > ENTRY_STAGE.top) continue;
      const dx = Math.max(box.min[0] - ENTRY_STAGE.center[0], 0, ENTRY_STAGE.center[0] - box.max[0]);
      const dz = Math.max(box.min[2] - ENTRY_STAGE.center[2], 0, ENTRY_STAGE.center[2] - box.max[2]);
      expect(Math.hypot(dx, dz), label(layout, placement)).toBeGreaterThan(ENTRY_STAGE.radius);
    }
  });

  it("keeps every placement 5 units clear of the reading arc", () => {
    for (const layout of LAYOUTS) {
      const zone = zoneById(layout.zone);
      const samples: Array<[number, number, number]> = [];
      const dx = zone.eye[0] - zone.target[0], dz = zone.eye[2] - zone.target[2];
      for (let i = 0; i < 9; i++) {
        const angle = -0.48 + (0.96 * i) / 8;
        for (const approach of [0.9, 1, 1.1]) for (const bob of [-1.6, 1.6]) samples.push([
          zone.target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach,
          zone.eye[1] + bob,
          zone.target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach,
        ]);
      }
      for (const placement of layout.placements) {
        const box = worldBox(layout, placement);
        if (box.max[1] <= 1.5 + zone.center[1]) continue;
        for (const sample of samples) expect(boxDistance(box, sample), `${label(layout, placement)} against the reading arc`).toBeGreaterThan(5);
      }
    }
  });

  it("keeps every placement 6 units clear of the thirteen travel corridors", () => {
    const boxes = LAYOUTS.flatMap(layout => layout.placements.map(placement => ({ box: worldBox(layout, placement), name: label(layout, placement) })));
    for (let leg = 0; leg < TOUR_ORDER.length; leg++) {
      const from = zoneById(TOUR_ORDER[leg]), to = zoneById(TOUR_ORDER[(leg + 1) % TOUR_ORDER.length]);
      const start = new Vector3(...from.eye), end = new Vector3(...to.eye);
      const middle = start.clone().lerp(end, 0.5);
      middle.y = Math.max(start.y, end.y) + 7;
      const curve = new CatmullRomCurve3([start, middle, end], false, "centripetal");
      const points = curve.getSpacedPoints(Math.ceil(curve.getLength() / 4));
      for (const point of points) for (const { box, name } of boxes) {
        expect(boxDistance(box, [point.x, point.y, point.z]), `${name} against the ${from.id} to ${to.id} leg`).toBeGreaterThan(6);
      }
    }
  });

  it("stays within the per district variety that keeps the draw budget (design 10.1 risk 5)", () => {
    for (const layout of LAYOUTS) {
      const roles = new Map<string, Set<string>>();
      for (const placement of layout.placements) {
        const role = placement.role ?? (placement.clip ? "animated" : /^(nature\.(rose|hydrangea|lily|stepping|crystal)|core\.|expression\.|people\.)/.test(placement.id) ? "instanced" : "static");
        const set = roles.get(role) ?? new Set<string>();
        set.add(placement.id);
        roles.set(role, set);
      }
      expect((roles.get("instanced")?.size ?? 0), `${layout.zone} instanced geometries`).toBeLessThanOrEqual(8);
      expect((roles.get("static")?.size ?? 0), `${layout.zone} static pieces`).toBeLessThanOrEqual(12);
      const authored = layout.placements.reduce((sum, placement) => sum + entries.get(placement.id)!.tris, 0);
      expect(authored, `${layout.zone} authored triangles before clustering`).toBeLessThanOrEqual(420_000);
    }
  });

  it("replaces the procedural arch row in place at the procedural heights", () => {
    for (const layout of LAYOUTS) {
      const row = layout.placements.filter(placement => placement.replaces === "arch" && placement.frame !== "arcade");
      if (!row.length) continue;
      const expected = archRow(layout.zone);
      expect(row.length).toBe(expected.length);
      const index = ZONES.findIndex(zone => zone.id === layout.zone);
      const count = layout.zone === "expressions" ? 5 : 3, width = layout.zone === "expressions" ? 3.8 : 4.8;
      row.forEach((placement, k) => {
        expect(placement.arch).toBe(k);
        expect(placement.position[0]).toBeCloseTo((k - (count - 1) / 2) * width * 1.1, 6);
        expect(placement.position[2]).toBe(-9.3);
        const height = index < 3 ? 10.3 + (k === 1 ? 1.2 : 0) : 8.4;
        expect(placement.scaleXYZ![1] * KIT_ARCH.height).toBeCloseTo(height, 6);
      });
    }
  });

  it("never lets two declared curves touch (the Peace Promise ribbon knot)", () => {
    for (const layout of LAYOUTS) {
      const curves = layout.curves ?? [];
      for (let a = 0; a < curves.length; a++) for (let b = a + 1; b < curves.length; b++) {
        for (const t of [0, 7.5, 31, 100.25]) {
          let nearest = Infinity;
          for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
            const p = curves[a].point(i / 20, t), q = curves[b].point(j / 20, t);
            nearest = Math.min(nearest, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
          }
          expect(nearest, `${layout.zone} ${curves[a].id} and ${curves[b].id} at t ${t}`).toBeGreaterThan(0.5);
        }
      }
    }
  });

  it("puts the Garden's pond under the arriving pearl's landing and its lotus on the pond", () => {
    const garden = LAYOUTS.find(layout => layout.zone === "garden")!;
    const pool = garden.pools![0];
    // The settle path ends at world (26, 5, 16), the Garden centre: local (0, 5, 0).
    expect(Math.hypot(pool.center[0], pool.center[2])).toBeLessThan(pool.radius);
    const lotus = garden.placements.find(placement => placement.id === "arrival.lotus-bloom")!;
    expect(lotus.clip).toEqual({ name: "bloom", at: 1 });
    expect(Math.hypot(lotus.position[0] - pool.center[0], lotus.position[2] - pool.center[2])).toBeLessThan(pool.radius - 1.5);
    for (const pad of garden.placements.filter(placement => placement.id === "nature.lily-pads")) {
      expect(Math.hypot(pad.position[0] - pool.center[0], pad.position[2] - pool.center[2])).toBeLessThan(pool.radius);
    }
  });

  it("agrees with the reading spheres the world places pearls in", () => {
    // Garden hero at local (3, 7.32, 5): the K0 capture reports world 31.194, 7.324, 18.650.
    const garden = zoneById("garden");
    const [hero] = readingKeepOut("garden");
    const world = toWorld(garden, hero.center);
    expect(world[0]).toBeCloseTo(31.194, 2);
    expect(world[1]).toBeCloseTo(7.324, 2);
    expect(world[2]).toBeCloseTo(18.65, 2);
    for (const id of RECOGNITION_ZONES) expect(readingKeepOut(id)).toHaveLength(3);
    expect(readingKeepOut("welcome")).toHaveLength(0);
    expect(LAYOUT_SETS.every(set => set.length > 0)).toBe(true);
  });
});
