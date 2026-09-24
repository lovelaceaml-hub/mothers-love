import { readFileSync } from "node:fs";
import { CatmullRomCurve3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  CORE_ZONE_LAYOUTS,
  ENTRY_STAGE,
  GROVE_PIECES,
  HERO_PEARL,
  INLAY_TOLERANCE,
  KIT_ARCH,
  KIT_BOUNDS,
  MEDALLION,
  PAVILION,
  TERRACE_TOP,
  archRow,
  boxDistance,
  coreZoneLayouts,
  cylinderDistance,
  districtRadius,
  figureStands,
  heroPearl,
  heroPearlAt,
  medallionSweep,
  placementBox,
  placementCylinder,
  pavilionParts,
  readingArc,
  readingKeepOut,
  toLocal,
  toWorld,
  zoneById,
  zoneFacing,
  type Cylinder,
  type KitBox,
  type KitPlacement,
  type MedallionLayout,
  type ZoneLayout,
} from "../../src/components/display/world/art/kit-layout-core";
import { KIT_CLUSTER_CELL, KIT_ZONE_LAYOUTS, staticRole } from "../../src/components/display/world/art/kit-districts";
import { petalField, risingCenters } from "../../src/components/display/world/art/study-air";
import { parseKitManifest } from "../../src/components/display/world/kit/kit-manifest";
import { RECOGNITION_ZONES, TOUR_ORDER, ZONES } from "../../src/components/display/world/world-data";

/**
 * Proves the kit placement tables against WORLD-INTEGRATION 6.2 without a browser: every
 * placement's authored box (scaled, turned, moved) stays out of the reading spheres, the
 * camera's reading arc, the thirteen travel corridors and the entry stage; every id is a
 * manifest id; the tables are deterministic; curves that must never touch never do; the
 * pavilion contains the hero pearl's medallion reach; nothing stands on the figures' feet.
 *
 * `LAYOUT_SETS` lists every table the builder places. Lane K3b's far zones join through
 * `KIT_ZONE_LAYOUTS` the moment the coordinator adds their import to `kit-districts.ts`.
 */
const LAYOUT_SETS: ReadonlyArray<readonly ZoneLayout[]> = [CORE_ZONE_LAYOUTS, KIT_ZONE_LAYOUTS];
const LAYOUTS: readonly ZoneLayout[] = KIT_ZONE_LAYOUTS;
const NEAR_ZONES = ["welcome", "garden", "featured", "heart", "expressions", "peacemakers", "practice"] as const;

const rawManifest = JSON.parse(readFileSync("public/world-kit/v1/manifest.json", "utf8"));
const manifest = parseKitManifest(rawManifest);
if (!manifest) throw new Error("public/world-kit/v1/manifest.json did not validate");
const entries = new Map(manifest.assets.map(entry => [entry.id as string, entry]));
const rawEntries = new Map<string, Record<string, unknown>>((rawManifest.assets as Array<Record<string, unknown>>).map(entry => [String(entry.id), entry]));
/** Source files whose numbers the layout tables copy; the tests pin the copies to them. */
const source = (file: string) => readFileSync(`src/components/display/world/${file}`, "utf8");
const LAYOUT_MODES = ["landscape", "portrait"] as const satisfies readonly MedallionLayout[];
/** The terrace top with the inlay allowance: a kit floor no higher than this is the terrace, not a step. */
const FLUSH = TERRACE_TOP + INLAY_TOLERANCE;

/**
 * The placement's axis aligned box in world space. The district frame and the placement turn
 * about y alike, so the authored box is turned once by both yaws together and then moved: an
 * exact box of the turned piece, not a box of a box.
 */
function worldBox(layout: ZoneLayout, placement: KitPlacement): KitBox {
  const zone = zoneById(layout.zone);
  const yaw = placement.frame === "root" ? 0 : zoneFacing(zone);
  const turned = placementBox({ ...placement, position: [0, 0, 0], rotationY: (placement.rotationY ?? 0) + yaw });
  const at = placement.frame === "root"
    ? [zone.center[0] + placement.position[0], zone.center[1] + placement.position[1], zone.center[2] + placement.position[2]]
    : toWorld(zone, placement.position);
  return {
    min: [turned.min[0] + at[0], turned.min[1] + at[1], turned.min[2] + at[2]],
    max: [turned.max[0] + at[0], turned.max[1] + at[1], turned.max[2] + at[2]],
  };
}
function label(layout: ZoneLayout, placement: KitPlacement) {
  return `${layout.zone} ${placement.id} at ${placement.position.map(v => Math.round(v * 100) / 100).join(",")}${placement.note ? ` (${placement.note})` : ""}`;
}
/**
 * The placement's box in the district frame. The arcade frame turns by the Sanctuary's own
 * facing (`atan2(14, 28)`, design-world.ts), which is the heart district's facing, so an
 * arcade placement is already in the district frame.
 */
function localBox(layout: ZoneLayout, placement: KitPlacement): KitBox {
  if (placement.frame === "root") {
    const zone = zoneById(layout.zone), box = worldBox(layout, placement);
    const a = toLocal(zone, box.min), b = toLocal(zone, box.max);
    return { min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])] };
  }
  return placementBox(placement);
}
/** Distance from a district frame point to the placement: its cylinder when round, else its box. */
function localDistance(layout: ZoneLayout, placement: KitPlacement, point: readonly [number, number, number]) {
  if (placement.footprint === "round" && placement.frame !== "root") return cylinderDistance(placementCylinder(placement), point);
  return boxDistance(localBox(layout, placement), point);
}
/**
 * Distance from a world point to the placement: a round piece's vertical cylinder moved to
 * world space (its radius is the same in every frame), else the conservative world box.
 */
function worldDistance(layout: ZoneLayout, placement: KitPlacement, point: readonly [number, number, number]) {
  if (placement.footprint === "round" && placement.frame !== "root") {
    const zone = zoneById(layout.zone), local = placementCylinder(placement);
    const center = toWorld(zone, placement.position);
    return cylinderDistance({ center, radius: local.radius, minY: local.minY + zone.center[1], maxY: local.maxY + zone.center[1] }, point);
  }
  return boxDistance(worldBox(layout, placement), point);
}
const isFlat = (placement: KitPlacement) => /stepping|lily/.test(placement.id);
/** Every violation of a geometric rule, so one run lists them all instead of stopping at the first. */
function violations(collect: (fail: (message: string) => void) => void) {
  const list: string[] = [];
  collect(message => list.push(message));
  return list;
}
const unit = (a: readonly number[]) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const crossProduct = (a: readonly number[], b: readonly number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** The convex hull of projected points (Andrew's monotone chain), counter clockwise. */
function convexHull(points: number[][]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [], upper: number[][] = [];
  for (const p of sorted) { while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...sorted].reverse()) { while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
/** How deeply two convex polygons overlap on screen (separating axes), zero when apart. */
function overlapDepth(a: number[][], b: number[][]) {
  let depth = Infinity;
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const length = Math.hypot(q[1] - p[1], q[0] - p[0]);
    if (!length) continue;
    const axis = [-(q[1] - p[1]) / length, (q[0] - p[0]) / length];
    const pa = a.map(v => v[0] * axis[0] + v[1] * axis[1]), pb = b.map(v => v[0] * axis[0] + v[1] * axis[1]);
    const gap = Math.max(Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
    if (gap >= 0) return 0;
    depth = Math.min(depth, -gap);
  }
  return depth;
}

describe("near zone tables", () => {
  it("cover the seven near zones once each and the builder places every core table", () => {
    const ids = CORE_ZONE_LAYOUTS.map(layout => layout.zone);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(ZONES.some(zone => zone.id === id)).toBe(true);
    for (const layout of CORE_ZONE_LAYOUTS) expect(KIT_ZONE_LAYOUTS).toContain(layout);
    expect([...ids].sort()).toEqual([...NEAR_ZONES].sort());
  });

  it("is deterministic", () => {
    expect(coreZoneLayouts()).toEqual(coreZoneLayouts());
    expect(JSON.stringify(coreZoneLayouts())).toBe(JSON.stringify(CORE_ZONE_LAYOUTS));
  });

  it("names only manifest ids, with authored bounds that match the manifest sizes", () => {
    const ids = LAYOUTS.flatMap(layout => [...layout.placements.map(p => p.id), ...(layout.swarms ?? []).map(s => s.id)]);
    for (const id of new Set(ids)) {
      expect(entries.has(id), id).toBe(true);
      const bounds = KIT_BOUNDS[id];
      expect(bounds, `${id} has no authored bounds`).toBeDefined();
      const size = Math.max(...bounds.max.map((value, k) => value - bounds.min[k]));
      expect(Math.abs(size - entries.get(id)!.size) / entries.get(id)!.size, `${id} largest side`).toBeLessThan(0.02);
      if (entries.get(id)!.pivot === "base") expect(bounds.min[1], `${id} stands on y 0`).toBe(0);
      expect(KIT_CLUSTER_CELL[id] ?? (id.startsWith("arrival.") ? 0.04 : undefined), `${id} has a cluster cell`).toBeDefined();
    }
  });

  it("keeps single zone landmarks in the zone they were authored for", () => {
    for (const layout of LAYOUTS) for (const placement of layout.placements) {
      const entry = entries.get(placement.id)!;
      if (entry.feature === "landmark" && entry.zones.length === 1) expect(entry.zones[0], label(layout, placement)).toBe(layout.zone);
    }
  });

  it("stands every placement on its own island, on or above its terrace level", () => {
    const list = violations(fail => {
      for (const layout of LAYOUTS) for (const placement of layout.placements) {
        const box = localBox(layout, placement);
        // A canopy or the pavilion's roof may overhang the island; a round platform is
        // measured by its radius.
        const allowance = /tree|cloud|pavilion/.test(placement.id) ? 4 : 0.5;
        const reach = placement.footprint === "round" && placement.frame !== "root"
          ? Math.hypot(placement.position[0], placement.position[2]) + placementCylinder(placement).radius
          : Math.max(Math.hypot(box.min[0], box.min[2]), Math.hypot(box.max[0], box.max[2]), Math.hypot(box.min[0], box.max[2]), Math.hypot(box.max[0], box.min[2]));
        const limit = districtRadius(layout.zone) + allowance;
        if (reach > limit) fail(`${label(layout, placement)} reaches ${reach.toFixed(2)} past the island's ${limit}`);
        // The terrace top is .68; a raised platform lifts what stands on it. A piece that
        // encloses the pearl (the pavilion) is sunk on purpose so its own floor drum lies flush
        // with the terrace: the containment test proves where that floor's top is.
        if (placement.encloses) continue;
        const platform = (layout.platforms ?? []).find(item => Math.hypot(placement.position[0] - item.center[0], placement.position[2] - item.center[2]) < item.radius && placement.position[1] >= item.center[1] + item.height - 0.05);
        const floor = platform ? platform.center[1] + platform.height - 0.05 : 0.6;
        if (box.min[1] < floor) fail(`${label(layout, placement)} sinks to ${box.min[1].toFixed(2)} below its floor ${floor}`);
      }
    });
    expect(list).toEqual([]);
  });

  it("keeps every placement out of the reading spheres", () => {
    const list = violations(fail => {
      for (const layout of LAYOUTS) {
        const spheres = [...readingKeepOut(layout.zone), ...(layout.keepOut ?? [])];
        // The two resident spheres and any extra: the hero sphere reaches below the terrace
        // itself, so a floor flush with the terrace is measured by the sweep test instead.
        const residents = [...readingKeepOut(layout.zone).slice(1), ...(layout.keepOut ?? [])];
        const hero = heroPearl(layout.zone);
        for (const placement of layout.placements) {
          // A kit arch standing where the design keeps a procedural arch is not new dressing.
          if (placement.replaces === "arch") continue;
          if (placement.under && hero) {
            // Sits under the pearl by design: its top stays below the pearl's own bottom.
            const box = localBox(layout, placement);
            const ceiling = hero[1] - HERO_PEARL.radius - 0.25;
            if (box.max[1] >= ceiling) fail(`${label(layout, placement)} rises to ${box.max[1].toFixed(2)} under the hero pearl's ${ceiling.toFixed(2)}`);
            continue;
          }
          if (placement.encloses && hero) {
            // Encloses the hero pearl by design (the Pavilion): the containment and sweep tests
            // below prove the medallion ring clear of it; here its floor, columns, beam and
            // dome, measured as they stand, keep out of the two resident spheres.
            for (const sphere of residents) {
              const gap = Math.min(...pavilionParts(placement).map(part => cylinderDistance(part, sphere.center))) - sphere.radius;
              if (gap <= 0) fail(`${label(layout, placement)} enters the sphere at ${sphere.center.join(",")} r ${sphere.radius} by ${(-gap).toFixed(2)}`);
            }
            continue;
          }
          for (const sphere of spheres) {
            const gap = localDistance(layout, placement, sphere.center) - sphere.radius;
            if (gap <= 0) fail(`${label(layout, placement)} enters the sphere at ${sphere.center.join(",")} r ${sphere.radius} by ${(-gap).toFixed(2)}`);
          }
        }
      }
    });
    expect(list).toEqual([]);
  });

  it("contains the hero pearl's medallion reach inside the Pearl Pavilion (design 6.6)", () => {
    const featured = LAYOUTS.find(layout => layout.zone === "featured")!;
    const pavilion = featured.placements.find(placement => placement.id === "landmark.pearl-pavilion-horseshoe")!;
    expect(pavilion.footprint).toBe("round");
    expect(pavilion.encloses).toBe(true);
    expect(pavilion.rotationY ?? 0).toBe(0);
    const raw = rawEntries.get(pavilion.id)!.layout as { column_angles_from_open_centre_deg: number[] };
    expect(raw.column_angles_from_open_centre_deg).toEqual([...PAVILION.columns]);
    const hero = heroPearl("featured")!;
    const [scaleX, scaleY, scaleZ] = pavilion.scaleXYZ ?? [pavilion.scale ?? 1, pavilion.scale ?? 1, pavilion.scale ?? 1];
    expect(scaleX).toBe(scaleZ);
    const parts = pavilionParts(pavilion);
    const columns = parts.filter(part => part.kind === "column");
    expect(columns).toHaveLength(PAVILION.columns.length * 3);
    for (const column of columns) {
      const clearance = Math.hypot(hero[0] - column.center[0], hero[2] - column.center[2]) - column.radius;
      expect(clearance, `column at ${column.center.map(v => v.toFixed(2)).join(",")}`).toBeGreaterThan(HERO_PEARL.reach);
    }
    // The file's floor drum is the inlaid floor of design 6.6: its top lies on the terrace, no
    // higher than an inlay, because the medallions orbit down to .88 above the district (the
    // sweep test) and a raised floor would swallow them at the bottom of every orbit.
    const floor = parts.find(part => part.kind === "floor")!;
    expect(floor.maxY).toBeGreaterThanOrEqual(TERRACE_TOP);
    expect(floor.maxY).toBeLessThanOrEqual(FLUSH);
    expect(floor.maxY).toBeLessThan(Math.min(...medallionSweep("featured", "landscape").map(sphere => sphere.center[1] - sphere.radius)));
    // The pearl floats over the floor, its ring stays under the beam and the beam under the apex.
    expect(floor.maxY).toBeLessThan(hero[1] - HERO_PEARL.radius);
    const beam = pavilion.position[1] + PAVILION.beam * scaleY;
    for (const mode of LAYOUT_MODES) expect(beam, `${mode} ring under the beam`).toBeGreaterThan(Math.max(...medallionSweep("featured", mode).map(sphere => sphere.center[1] + sphere.radius)) + 0.5);
    expect(pavilion.position[1] + PAVILION.apex * scaleY).toBeGreaterThan(hero[1] + HERO_PEARL.reach);
    // The pearl itself sits inside the column ring, in both screen layouts.
    for (const mode of LAYOUT_MODES) {
      const at = heroPearlAt("featured", mode)!;
      const radius = MEDALLION[mode].pearl;
      expect(Math.hypot(at[0] - pavilion.position[0], at[2] - pavilion.position[2]) + radius, `${mode} pearl inside the ring`).toBeLessThan(PAVILION.columnRadius * scaleX);
    }
  });

  it("copies the medallion ring and the hero pearl's placement from the pearl's own files", () => {
    // pearl-skin.ts builds the medallion rim and pearl-skin-frame.ts moves the medallions;
    // world-bubble-frame.ts places and sizes the pearl, with the hero placement in world-bubble-layout.ts.
    const skin = source("art/pearl-skin.ts") + source("art/pearl-skin-frame.ts"), pearls = source("world-bubble-frame.ts") + source("world-bubble-layout.ts");
    expect(skin).toContain(`const radiusX = (frame.portrait ? ${MEDALLION.portrait.radiusX} : ${MEDALLION.landscape.radiusX}) * frame.orbitScale;`);
    expect(skin).toContain(`const radiusY = (frame.portrait ? ${MEDALLION.portrait.radiusY} : ${MEDALLION.landscape.radiusY}) * frame.orbitScale;`);
    expect(skin).toContain(`const size = frame.portrait ? ${String(MEDALLION.portrait.size).replace(/^0/, "")} : frame.orbitScale;`);
    expect(skin).toContain(`Math.sin(a) * radiusY, ${String(MEDALLION.wobble[0]).replace(/^0/, "")} + Math.sin(a * 2) * ${String(MEDALLION.wobble[1]).replace(/^0/, "")});`);
    expect(skin).toContain(`new T.TorusGeometry(${String(MEDALLION.rim).replace(/^0/, "")}, `);
    expect(pearls).toContain(`[${MEDALLION.landscape.pearl}, 3, 2.8][slot.index] * (mobile && slot.index === 0 ? ${MEDALLION.portrait.pearl / MEDALLION.landscape.pearl} : 1)`);
    expect(pearls).toContain(`definition.center[1] + ${String(MEDALLION.guard[0]).replace(/^0/, "")} + slot.radius * ${MEDALLION.guard[1]},`);
    expect(pearls).toContain(`Math.sin(phase) * (slot.index ? 0.65 : ${MEDALLION.sway}),`);
    expect(pearls).toContain(`Math.sin(phase * 0.8) * (slot.index ? 0.45 : ${MEDALLION.bob});`);
    expect(pearls).toContain("slot.root.position.y += [3, 6, 9][slot.index];");
    expect(pearls).toContain('const side = mobile ? 0 : zone === "heart" ? 10.5 : zone === "peacemakers" ? 11 : 3;');
    expect(pearls).toContain('return { side, outward: zone === "featured" ? 8 : 5 };');
    // The reading spheres of design 6.2 centre on the same pearl.
    for (const id of RECOGNITION_ZONES) expect(heroPearlAt(id, "landscape")).toEqual(heroPearl(id));
  });

  it("keeps the hero medallions clear of every piece under or around the pearl through the reading arc, on a TV and on a phone", () => {
    const list = violations(fail => {
      for (const layout of LAYOUTS) {
        if (!RECOGNITION_ZONES.includes(layout.zone)) continue;
        const pieces = layout.placements.filter(placement => placement.under || placement.encloses);
        for (const mode of LAYOUT_MODES) {
          const sweep = medallionSweep(layout.zone, mode);
          for (const placement of pieces) {
            // The solids the ring must miss: the pavilion's columns, beam and dome, or the lotus
            // (round) as a cylinder. A floor flush with the terrace is the terrace, and the
            // phone's ring already dips into that (the pearl's own guard is a landscape one).
            const solids: Cylinder[] = placement.encloses
              ? pavilionParts(placement).filter(part => part.kind !== "floor" || part.maxY > FLUSH)
              : placement.footprint === "round" ? [placementCylinder(placement)] : [];
            const box = placement.encloses || placement.footprint === "round" ? undefined : localBox(layout, placement);
            let nearest = Infinity;
            for (const sphere of sweep) {
              const gap = (box ? boxDistance(box, sphere.center) : Math.min(...solids.map(part => cylinderDistance(part, sphere.center)))) - sphere.radius;
              if (gap < nearest) nearest = gap;
            }
            if (nearest <= 0.1) fail(`${label(layout, placement)} comes within ${nearest.toFixed(2)} of a ${mode} medallion`);
            for (const part of placement.encloses ? pavilionParts(placement).filter(part => part.kind === "floor") : []) {
              if (part.maxY > FLUSH) fail(`${label(layout, placement)} floor top ${part.maxY.toFixed(2)} stands above the terrace`);
            }
          }
        }
      }
    });
    expect(list).toEqual([]);
    // The sweep itself: the landscape ring bottoms out above the terrace, the phone ring below it.
    expect(Math.min(...medallionSweep("featured", "landscape").map(sphere => sphere.center[1] - sphere.radius))).toBeGreaterThan(TERRACE_TOP + INLAY_TOLERANCE);
    expect(Math.min(...medallionSweep("featured", "portrait").map(sphere => sphere.center[1] - sphere.radius))).toBeLessThan(TERRACE_TOP);
    expect(medallionSweep("welcome", "landscape")).toEqual([]);
  });

  it("never lets a grove piece cover a canonical icon disc from anywhere on the reading arc (design 6.8, Plan 24)", () => {
    // The grove as design-world.ts builds it: columns at (cos a * 10.5, sin a * 9.3) for
    // a = -.9 pi + i / 8 * 1.6 pi, each icon disc of radius .96 at y 5.15 in a group turned
    // .48, .37 in front of the column axis; the piece bobs .15 and the selected one rises .6.
    const world = source("art/design/grove.ts"), builder = source("art/kit-district-parts.ts");
    expect(world).toContain("const a=-Math.PI*.9+i/8*Math.PI*1.6, x=Math.cos(a)*10.5,z=Math.sin(a)*9.3;");
    expect(world).toContain("const groveIcon = geometry(new T.CircleGeometry(.96, 48));");
    expect(world).toContain("group.position.set(x,5.15,z);group.rotation.y=.48;");
    expect(world).toContain("mesh(group,groveIcon,iconMat,[0,0,.37]);");
    expect(builder).toContain("kitLocal.y += sin(kitTime * .23 + kitPivot.w) * .15 + kitOn * .6;");
    const zone = zoneById("expressions");
    const grove = LAYOUTS.find(layout => layout.zone === "expressions")!;
    const pieces = grove.placements.filter(placement => placement.slot !== undefined);
    expect(pieces).toHaveLength(9);
    const discs = pieces.map(placement => {
      const yaw = 0.48, normal = [Math.sin(yaw), 0, Math.cos(yaw)], along = [Math.cos(yaw), 0, -Math.sin(yaw)];
      const centre = [zone.center[0] + placement.position[0] + normal[0] * 0.37, zone.center[1] + 5.15, zone.center[2] + placement.position[2] + normal[2] * 0.37];
      const rim: number[][] = [];
      for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; rim.push([centre[0] + along[0] * Math.cos(t) * 0.96, centre[1] + Math.sin(t) * 0.96, centre[2] + along[2] * Math.cos(t) * 0.96]); }
      return { slot: placement.slot!, centre, rim };
    });
    const target = zone.target;
    const list = violations(fail => {
      for (const eye of readingArc(zone)) {
        const forward = unit([target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
        const right = unit(crossProduct(forward, [0, 1, 0])), up = crossProduct(right, forward);
        const project = (p: readonly number[]) => {
          const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
          const depth = d[0] * forward[0] + d[1] * forward[1] + d[2] * forward[2];
          return { x: (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / depth, y: (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / depth, depth };
        };
        const shapes = discs.map(disc => ({ slot: disc.slot, depth: project(disc.centre).depth, hull: convexHull(disc.rim.map(p => { const q = project(p); return [q.x, q.y]; })) }));
        for (const placement of pieces) for (const lift of [-0.15, 0.15, 0.75]) {
          const box = worldBox(grove, { ...placement, position: [placement.position[0], placement.position[1] + lift, placement.position[2]] });
          const corners: number[][] = [];
          for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) { const q = project([x, y, z]); corners.push([q.x, q.y]); }
          const piece = { depth: project([zone.center[0] + placement.position[0], zone.center[1] + placement.position[1], zone.center[2] + placement.position[2]]).depth, hull: convexHull(corners) };
          for (const disc of shapes) {
            if (disc.slot === placement.slot || piece.depth >= disc.depth) continue;
            const depth = overlapDepth(piece.hull, disc.hull);
            if (depth > 0) fail(`piece ${placement.slot} covers disc ${disc.slot} by ${depth.toFixed(4)} from eye ${eye.map(v => v.toFixed(1)).join(",")} lift ${lift}`);
          }
        }
      }
    });
    expect(new Set(list.map(item => item.split(" from ")[0]))).toEqual(new Set());
    expect(pieces.every(placement => placement.position[1] === GROVE_PIECES.y && placement.scale === GROVE_PIECES.scale)).toBe(true);
  });

  it("keeps every new placement out of the entry stage cylinder", () => {
    const list = violations(fail => {
      for (const layout of LAYOUTS) for (const placement of layout.placements) {
        // A kit arch standing where the design keeps a procedural arch is not new dressing: the
        // Garden's leftmost arch has always stood 11.6 units from the stage centre.
        if (placement.replaces === "arch") continue;
        const box = worldBox(layout, placement);
        if (box.min[1] > ENTRY_STAGE.top) continue;
        // The stage is a cylinder to y 30: the distance is measured on the ground plane, at the
        // placement's own height inside the cylinder's range.
        const y = Math.min(Math.max(box.min[1], 0), ENTRY_STAGE.top);
        const gap = worldDistance(layout, placement, [ENTRY_STAGE.center[0], y, ENTRY_STAGE.center[2]]);
        if (gap <= ENTRY_STAGE.radius) fail(`${label(layout, placement)} comes within ${gap.toFixed(2)} of the entry stage centre`);
      }
    });
    expect(list).toEqual([]);
  });

  it("keeps every placement 5 units clear of the reading arc", () => {
    const list = violations(fail => {
      for (const layout of LAYOUTS) {
        const zone = zoneById(layout.zone);
        const samples = readingArc(zone);
        for (const placement of layout.placements) {
          const box = worldBox(layout, placement);
          if (box.max[1] <= 1.5 + zone.center[1]) continue;
          const nearest = Math.min(...samples.map(sample => worldDistance(layout, placement, sample)));
          if (nearest <= 5) fail(`${label(layout, placement)} comes within ${nearest.toFixed(2)} of the reading arc`);
        }
        for (const swarm of layout.swarms ?? []) {
          // The helix's outer reach, at every height it climbs through.
          const top = toWorld(zone, [swarm.center[0], swarm.center[1] + swarm.height[1], swarm.center[2]]);
          const nearest = Math.min(...samples.map(sample => Math.hypot(sample[0] - top[0], sample[2] - top[2]) - swarm.radius[1]));
          if (nearest <= 5) fail(`${layout.zone} butterfly helix comes within ${nearest.toFixed(2)} of the reading arc`);
        }
      }
    });
    expect(list).toEqual([]);
  });

  it("keeps every placement 6 units clear of the thirteen travel corridors", () => {
    // Kit arches standing where procedural arches stood are not new dressing (the arcade
    // already brushed the expressions to peacemakers leg at its procedural height).
    const pieces = LAYOUTS.flatMap(layout => layout.placements.filter(placement => placement.replaces !== "arch").map(placement => ({ layout, placement, name: label(layout, placement) })));
    const list = violations(fail => {
      for (let leg = 0; leg < TOUR_ORDER.length; leg++) {
        const from = zoneById(TOUR_ORDER[leg]), to = zoneById(TOUR_ORDER[(leg + 1) % TOUR_ORDER.length]);
        const start = new Vector3(...from.eye), end = new Vector3(...to.eye);
        const middle = start.clone().lerp(end, 0.5);
        middle.y = Math.max(start.y, end.y) + 7;
        const curve = new CatmullRomCurve3([start, middle, end], false, "centripetal");
        const points = curve.getSpacedPoints(Math.ceil(curve.getLength() / 4));
        for (const { layout, placement, name } of pieces) {
          const nearest = Math.min(...points.map(point => worldDistance(layout, placement, [point.x, point.y, point.z])));
          if (nearest <= 6) fail(`${name} comes within ${nearest.toFixed(2)} of the ${from.id} to ${to.id} leg`);
        }
      }
    });
    expect(list).toEqual([]);
  });

  it("keeps bushes and furniture off the neighbors' anchor and the miniature figures' feet", () => {
    const list = violations(fail => {
      for (const layout of LAYOUTS) {
        const onWater = (placement: KitPlacement) => (layout.pools ?? []).some(pool => Math.hypot(placement.position[0] - pool.center[0], placement.position[2] - pool.center[2]) < pool.radius);
        for (const stand of layout.stands ?? []) for (const placement of layout.placements) {
          // A kit arch or column standing where the procedural one stood is not new dressing,
          // and a piece floating on a pool (the lotus) is water, not furniture on the terrace.
          if (isFlat(placement) || onWater(placement) || placement.replaces === "arch" || placement.replaces === "column") continue;
          const box = localBox(layout, placement);
          if (box.max[1] - box.min[1] < 0.4) continue;
          const gap = localDistance(layout, placement, stand.center);
          if (gap <= stand.radius) fail(`${label(layout, placement)} comes within ${gap.toFixed(2)} of the stand at ${stand.center.map(v => v.toFixed(2)).join(",")} r ${stand.radius}`);
        }
      }
    });
    expect(list).toEqual([]);
    // The three figure zones declare their stands; the anchor of design 6.5 is among them.
    for (const id of ["garden", "heart", "expressions"] as const) {
      const layout = LAYOUTS.find(item => item.zone === id)!;
      expect(layout.stands).toEqual(figureStands(id));
      expect(layout.stands!.some(stand => stand.center[0] === -3 && stand.center[2] === 6.5)).toBe(true);
    }
  });

  it("stays within the per district variety and triangle budget that keeps the draw budget (design 7.2, 10.1 risk 5)", () => {
    for (const layout of LAYOUTS) {
      const roles = new Map<string, Set<string>>();
      let estimate = 0;
      for (const placement of layout.placements) {
        const role = placement.role ?? (placement.clip ? "animated" : /^(nature\.(rose|hydrangea|lily|stepping|crystal)|core\.|people\.)/.test(placement.id) ? "instanced" : "static");
        const set = roles.get(role) ?? new Set<string>();
        set.add(placement.id);
        roles.set(role, set);
        // Clustering measured on the files (kit-districts.ts): about .23 of the authored
        // triangles at the near cells, none for the animated lotus.
        estimate += entries.get(placement.id)!.tris * (role === "animated" ? 1 : 0.23);
      }
      expect((roles.get("instanced")?.size ?? 0), `${layout.zone} instanced geometries`).toBeLessThanOrEqual(8);
      // Statics merge into at most four draws whatever their count; the variety only bounds
      // the bake work at load.
      expect((roles.get("static")?.size ?? 0), `${layout.zone} static pieces`).toBeLessThanOrEqual(16);
      expect(estimate, `${layout.zone} estimated near triangles`).toBeLessThanOrEqual(180_000);
    }
  });

  it("replaces the procedural arch row in place at the procedural heights, or removes it on purpose", () => {
    for (const layout of LAYOUTS) {
      const row = layout.placements.filter(placement => placement.replaces === "arch" && placement.frame !== "arcade");
      if (!row.length) {
        // Only the Sanctuary has no row; the practice terraces remove theirs deliberately.
        expect(layout.zone === "heart" || layout.removeArchRow === true, `${layout.zone} has no arch row`).toBe(true);
        continue;
      }
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
    // The Sanctuary arcade: seven kit arches at the procedural arcade's places and height.
    const heart = LAYOUTS.find(layout => layout.zone === "heart")!;
    const arcade = heart.placements.filter(placement => placement.frame === "arcade");
    expect(arcade).toHaveLength(7);
    arcade.forEach((placement, i) => {
      const a = Math.PI * 0.05 + (i / 6) * Math.PI * 0.9;
      expect(placement.arch).toBe(i);
      expect(placement.position[0]).toBeCloseTo(Math.cos(a) * 12.8, 6);
      expect(placement.position[2]).toBeCloseTo(-Math.sin(a) * 12.8 - 1.5, 6);
      expect(placement.scaleXYZ![1] * KIT_ARCH.height).toBeCloseTo(11.8, 6);
    });
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

  it("puts the Garden's pond under the arriving pearl's landing, its lotus on the pond and its path at the rim", () => {
    const garden = LAYOUTS.find(layout => layout.zone === "garden")!;
    const pool = garden.pools![0];
    // The settle path ends at world (26, 5, 16), the Garden centre: local (0, 5, 0).
    expect(Math.hypot(pool.center[0], pool.center[2])).toBeLessThan(pool.radius);
    const lotus = garden.placements.find(placement => placement.id === "arrival.lotus-bloom")!;
    expect(lotus.clip).toEqual({ name: "bloom", at: 1 });
    expect(lotus.under).toBe(true);
    expect(lotus.halo).toBeDefined();
    expect(Math.hypot(lotus.position[0] - pool.center[0], lotus.position[2] - pool.center[2])).toBeLessThan(pool.radius - 1.5);
    const pads = garden.placements.filter(placement => placement.id === "nature.lily-pads");
    expect(pads).toHaveLength(6);
    // No pad under the lotus's petals.
    for (const pad of pads) expect(Math.hypot(pad.position[0] - lotus.position[0], pad.position[2] - lotus.position[2]), pad.note).toBeGreaterThan(placementCylinder(lotus).radius);
    for (const pad of pads) expect(Math.hypot(pad.position[0] - pool.center[0], pad.position[2] - pool.center[2])).toBeLessThan(pool.radius);
    // One continuous stone path: the end of the first run meets the start of the second, and
    // the path ends outside the pond rim, not in the water.
    const runs = garden.placements.filter(placement => placement.id === "nature.stepping-stones");
    expect(runs).toHaveLength(2);
    const ends = (run: KitPlacement) => {
      const a = run.rotationY ?? 0, half = 2.4;
      return [[run.position[0] - Math.cos(a) * half, run.position[2] + Math.sin(a) * half], [run.position[0] + Math.cos(a) * half, run.position[2] - Math.sin(a) * half]] as const;
    };
    const [first, second] = runs.map(ends);
    const joint = Math.min(...first.flatMap(p => second.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))));
    expect(joint, "the two runs meet").toBeLessThan(0.8);
    const nearestToPond = Math.min(...[...first, ...second].map(p => Math.hypot(p[0] - pool.center[0], p[1] - pool.center[2])));
    expect(nearestToPond).toBeGreaterThan(pool.radius + 0.12);
    expect(nearestToPond).toBeLessThan(pool.radius + 1.5);
    for (const run of runs) expect(run.position[1]).toBeLessThan(0.7);
    // The coordinator's counts: at least fourteen roses and five hydrangeas, hidden disc flowers.
    expect(garden.placements.filter(placement => placement.id === "nature.rose-bush").length).toBeGreaterThanOrEqual(14);
    expect(garden.placements.filter(placement => placement.id === "nature.hydrangea-bush").length).toBeGreaterThanOrEqual(5);
    expect(garden.hideFlowers).toBe(true);
  });

  it("dresses each near zone with the pieces its design section names", () => {
    const has = (zone: string, id: string) => LAYOUTS.find(layout => layout.zone === zone)!.placements.some(placement => placement.id === id);
    const welcome = LAYOUTS.find(layout => layout.zone === "welcome")!;
    expect(has("welcome", "arrival.butterfly-gate")).toBe(true);
    expect(welcome.platforms).toHaveLength(1);
    expect(welcome.swarms?.[0]).toMatchObject({ id: "arrival.butterfly", count: 24, turnSeconds: 60 });
    expect(new Set(welcome.placements.filter(p => p.id.startsWith("nature.crystal")).map(p => p.id)).size).toBe(3);
    expect(has("featured", "landmark.pearl-pavilion-horseshoe")).toBe(true);
    // The design's stair rose to a raised gazebo floor; the floor is flush, so there is none.
    expect(has("featured", "landmark.pearl-stairs")).toBe(false);
    expect(has("featured", "landmark.garden-bench")).toBe(true);
    expect(LAYOUTS.find(layout => layout.zone === "featured")!.placements.filter(placement => placement.id === "landmark.lantern-post")).toHaveLength(3);
    expect(has("heart", "core.heart")).toBe(true);
    const grove = LAYOUTS.find(layout => layout.zone === "expressions")!;
    const slots = grove.placements.filter(placement => placement.slot !== undefined).map(placement => placement.slot).sort();
    expect(slots).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(grove.placements.filter(placement => placement.replaces === "column").map(placement => placement.column).sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    for (const placement of grove.placements.filter(p => p.replaces === "column" || p.slot !== undefined)) expect(placement.frame).toBe("root");
    const peace = LAYOUTS.find(layout => layout.zone === "peacemakers")!;
    expect(has("peacemakers", "landmark.peace-globe")).toBe(true);
    expect(peace.placements.filter(placement => placement.id === "landmark.filigree-railing")).toHaveLength(22);
    const circle = peace.placements.filter(placement => placement.id.startsWith("people."));
    expect(circle).toHaveLength(12);
    expect(new Set(circle.map(placement => placement.id)).size).toBe(6);
    for (const placement of circle) expect(placement.detail).toBe("near");
    const practice = LAYOUTS.find(layout => layout.zone === "practice")!;
    expect(practice.placements.filter(placement => placement.icon !== undefined).map(placement => placement.icon).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(practice.platforms).toHaveLength(2);
    expect(has("practice", "landmark.gazebo-glass")).toBe(true);
    expect(has("practice", "landmark.pool-fountain")).toBe(true);
    expect(has("practice", "expression.06-teacup")).toBe(true);
    expect(has("practice", "expression.07-candle")).toBe(true);
  });

  it("sorts the kit's file materials into the four static buckets", () => {
    expect(staticRole("landmark.lantern-post", "landmark_glow")).toBe("glow");
    expect(staticRole("landmark.peace-globe", "landmark_globe_sea")).toBe("glow");
    expect(staticRole("landmark.peace-globe", "landmark_halo")).toBe("glass");
    expect(staticRole("landmark.pearl-pavilion-horseshoe", "landmark_pearl_glass")).toBe("glass");
    expect(staticRole("landmark.pearl-arch", "landmark_gold")).toBe("gold");
    expect(staticRole("expression.07-candle", "Flame")).toBe("glow");
    expect(staticRole("landmark.garden-bench", "landmark_rose")).toBe("body");
    expect(staticRole("nature.blossom-tree-a", "blossom-tree-a-bark")).toBe("body");
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

  it("lifts the Sanctuary's petals only once the kit is in (design 6.7)", () => {
    const centers = ZONES.map(zone => zone.center);
    expect(risingCenters(centers, false).size).toBe(0);
    const rising = risingCenters(centers, true);
    expect([...rising]).toEqual([ZONES.findIndex(zone => zone.id === "heart")]);
    const still = petalField(3313, 560, centers), lifted = petalField(3313, 560, centers, rising);
    still.forEach((petal, i) => {
      const other = lifted[i];
      expect([other.x, other.y, other.z, other.size, other.phase, other.spin, other.span]).toEqual([petal.x, petal.y, petal.z, petal.size, petal.phase, petal.spin, petal.span]);
      if (rising.has(i % centers.length)) { expect(other.fall).toBeLessThan(0); expect(Math.abs(other.fall)).toBeGreaterThanOrEqual(0.25); }
      else expect(other.fall).toBe(petal.fall);
    });
  });
});
