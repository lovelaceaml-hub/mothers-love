/** Pure frame and distance helpers for the near zone placement tables (kit-layout-shapes.ts explains the frames). */
import { RECOGNITION_ZONES, ZONES, type WorldZone, type ZoneId } from "../world-data";
import {
  type KitPlacement,
  type KeepOutSphere,
  type LayoutStand,
  type KitBox,
  KIT_BOUNDS,
  KIT_ARCH,
  PAVILION,
  MEDALLION,
  type MedallionLayout,
  type Sphere,
} from "./kit-layout-shapes";

export function zoneById(id: ZoneId): WorldZone {
  const zone = ZONES.find(item => item.id === id);
  if (!zone) throw new Error(`Unknown zone ${id}`);
  return zone;
}

/** `facing` as `design-world.ts` computes it: the district frame's rotation about y. */
export function zoneFacing(zone: WorldZone) {
  return Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
}

/** A district frame point to world space. */
export function toWorld(zone: WorldZone, local: readonly [number, number, number]): [number, number, number] {
  const facing = zoneFacing(zone), c = Math.cos(facing), s = Math.sin(facing);
  return [
    zone.center[0] + local[0] * c + local[2] * s,
    zone.center[1] + local[1],
    zone.center[2] - local[0] * s + local[2] * c,
  ];
}

/** A world space point into a district frame. */
export function toLocal(zone: WorldZone, world: readonly [number, number, number]): [number, number, number] {
  const facing = zoneFacing(zone), c = Math.cos(facing), s = Math.sin(facing);
  const x = world[0] - zone.center[0], y = world[1] - zone.center[1], z = world[2] - zone.center[2];
  return [x * c - z * s, y, x * s + z * c];
}

/** The island radius the study gives each district: the first three are the large islands. */
export function districtRadius(id: ZoneId) {
  return ZONES.findIndex(zone => zone.id === id) < 3 ? 17.8 : 13.8;
}

/**
 * The reading spheres of design 6.2 for a recognition zone, district frame: the hero pearl
 * with its medallion reach, and the two resident pearls with their rings. Empty elsewhere.
 */
export function readingKeepOut(id: ZoneId): KeepOutSphere[] {
  if (!RECOGNITION_ZONES.includes(id)) return [];
  const zone = zoneById(id);
  const lift = zone.target[1] - zone.center[1];
  const side = id === "heart" ? 10.5 : id === "peacemakers" ? 11 : 3;
  const outward = id === "featured" ? 8 : 5;
  return [
    { center: [side, Math.max(lift + 3, MEDALLION.guard[0] + MEDALLION.guard[1] * MEDALLION.landscape.pearl), outward], radius: 7 },
    { center: [-10, lift + 6, 1], radius: 3.2 },
    { center: [11, lift + 9, -4], radius: 3 },
  ];
}

/** The hero pearl's centre in a recognition zone's district frame, or undefined. */
export function heroPearl(id: ZoneId): [number, number, number] | undefined {
  return readingKeepOut(id)[0]?.center;
}

/** The entry stage reservation of design 6.2, world space: a cylinder to y 30. */
export const ENTRY_STAGE = { center: [4.138, 0, 19.104] as const, radius: 12, top: 30 };

/**
 * The procedural miniature figures of `design-world.ts` (garden, heart, expressions), in the
 * district frame: they stand at root (-5, 8) and (-3.8, 8.5), so the kit keeps its bushes
 * and furniture off their feet, together with the neighbors' forecourt anchor of design 6.5.
 */
export function figureStands(id: ZoneId): LayoutStand[] {
  const zone = zoneById(id);
  const facing = zoneFacing(zone), c = Math.cos(facing), s = Math.sin(facing);
  const local = (x: number, z: number): [number, number, number] => [x * c - z * s, 0.7, x * s + z * c];
  return [
    { center: local(-5, 8), radius: 1.9 },
    { center: local(-3.8, 8.5), radius: 1.9 },
    { center: [-3, 0.63, 6.5], radius: 2.5 },
  ];
}

/** The placement's axis aligned box in its own frame after scale, rotation and translation. */
export function placementBox(placement: KitPlacement, bounds: KitBox = KIT_BOUNDS[placement.id]): KitBox {
  if (!bounds) throw new Error(`No authored bounds for ${placement.id}`);
  const [sx, sy, sz] = placement.scaleXYZ ?? [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];
  const angle = placement.rotationY ?? 0, c = Math.cos(angle), s = Math.sin(angle);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const x of [bounds.min[0] * sx, bounds.max[0] * sx]) for (const z of [bounds.min[2] * sz, bounds.max[2] * sz]) {
    const rx = x * c + z * s, rz = -x * s + z * c;
    min[0] = Math.min(min[0], rx); max[0] = Math.max(max[0], rx);
    min[2] = Math.min(min[2], rz); max[2] = Math.max(max[2], rz);
  }
  min[1] = bounds.min[1] * sy; max[1] = bounds.max[1] * sy;
  return {
    min: [min[0] + placement.position[0], min[1] + placement.position[1], min[2] + placement.position[2]],
    max: [max[0] + placement.position[0], max[1] + placement.position[1], max[2] + placement.position[2]],
  };
}

/** A round placement's vertical cylinder in its own frame: centre, horizontal radius, y range. */
export function placementCylinder(placement: KitPlacement, bounds: KitBox = KIT_BOUNDS[placement.id]) {
  if (!bounds) throw new Error(`No authored bounds for ${placement.id}`);
  const [sx, sy, sz] = placement.scaleXYZ ?? [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];
  const radius = Math.max(Math.abs(bounds.min[0]) * sx, Math.abs(bounds.max[0]) * sx, Math.abs(bounds.min[2]) * sz, Math.abs(bounds.max[2]) * sz);
  return { center: placement.position, radius, minY: placement.position[1] + bounds.min[1] * sy, maxY: placement.position[1] + bounds.max[1] * sy };
}

/** A vertical cylinder, hollow inside `inner` when that is set (a ring beam, a dome shell). */
export type Cylinder = { center: readonly [number, number, number]; radius: number; minY: number; maxY: number; inner?: number };
export type PavilionPart = Cylinder & { kind: "floor" | "column" | "roof" };

/**
 * The horseshoe pavilion as it stands, in its own frame: the floor drum, six column cylinders
 * (plinths and capitals a little wider) from the floor to the beam, then the ring beam and
 * the dome shell as the measured hollow bands. The layout test measures the residents' and
 * the medallions' clearance against these, not a bounding cylinder, because the pavilion
 * surrounds the hero pearl by design. A non uniform scale is honoured (`scaleXYZ`).
 */
export function pavilionParts(placement: KitPlacement): PavilionPart[] {
  const [sx, sy, sz] = placement.scaleXYZ ?? [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];
  const s = Math.max(sx, sz), yaw = placement.rotationY ?? 0;
  const [x, y, z] = placement.position;
  const parts: PavilionPart[] = [{ kind: "floor", center: [x, y, z], radius: PAVILION.floorRadius * s, minY: y, maxY: y + PAVILION.floor * sy }];
  for (const angle of PAVILION.columns) {
    const a = (angle * Math.PI) / 180 + yaw;
    const center: [number, number, number] = [x + Math.sin(a) * PAVILION.columnRadius * s, y, z + Math.cos(a) * PAVILION.columnRadius * s];
    parts.push({ kind: "column", center, radius: PAVILION.plinthHalfWidth * s, minY: y + PAVILION.floor * sy, maxY: y + PAVILION.plinthTop * sy });
    parts.push({ kind: "column", center, radius: PAVILION.columnHalfWidth * s, minY: y + PAVILION.plinthTop * sy, maxY: y + PAVILION.capitals * sy });
    parts.push({ kind: "column", center, radius: PAVILION.capitalHalfWidth * s, minY: y + PAVILION.capitals * sy, maxY: y + PAVILION.roof[0][0] * sy });
  }
  for (const [from, to, inner, outer] of PAVILION.roof) parts.push({ kind: "roof", center: [x, y, z], radius: outer * s, inner: inner * s, minY: y + from * sy, maxY: y + to * sy });
  return parts;
}

/**
 * The reading arc of design 6.2 as `camera-director.ts` flies it: the eye swung up to 27.5
 * degrees either side of the authored eye about the target, approach .9 to 1.1, bob 1.6,
 * sampled at 9 angles. World space.
 */
export function readingArc(zone: WorldZone): Array<[number, number, number]> {
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
  return samples;
}

/** The hero pearl's centre in a recognition zone's district frame for one screen layout, with its sway and bob. */
export function heroPearlAt(id: ZoneId, layout: MedallionLayout, sway = 0, bob = 0): [number, number, number] | undefined {
  if (!RECOGNITION_ZONES.includes(id)) return undefined;
  const zone = zoneById(id);
  const lift = zone.target[1] - zone.center[1];
  const side = layout === "portrait" ? 0 : id === "heart" ? 10.5 : id === "peacemakers" ? 11 : 3;
  const outward = id === "featured" ? 8 : 5;
  const pearl = MEDALLION[layout].pearl;
  return [side + sway, Math.max(lift + 3 + bob, MEDALLION.guard[0] + MEDALLION.guard[1] * pearl), outward];
}

/**
 * Every place a hero medallion can be, district frame, throughout the reading arc: the ring
 * ellipse in the billboard plane of each arc camera (which looks at the zone target), the
 * pearl's sway and bob, 36 ring angles. Empty outside the recognition zones.
 */
export function medallionSweep(id: ZoneId, layout: MedallionLayout): Sphere[] {
  if (!RECOGNITION_ZONES.includes(id)) return [];
  const zone = zoneById(id);
  const ring = MEDALLION[layout];
  const radius = MEDALLION.rim * ring.size * ring.pearl;
  const spheres: Sphere[] = [];
  const target = toLocal(zone, zone.target);
  for (const eye of readingArc(zone).map(sample => toLocal(zone, sample))) {
    const f = normalize([target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]);
    const r = normalize(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    for (const sway of [-MEDALLION.sway, MEDALLION.sway]) for (const bob of [-MEDALLION.bob, MEDALLION.bob]) {
      const hero = heroPearlAt(id, layout, sway, bob)!;
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        const x = Math.cos(a) * ring.radiusX * ring.pearl, y = Math.sin(a) * ring.radiusY * ring.pearl;
        const back = (MEDALLION.wobble[0] + Math.sin(a * 2) * MEDALLION.wobble[1]) * ring.pearl;
        spheres.push({
          center: [hero[0] + r[0] * x + u[0] * y - f[0] * back, hero[1] + r[1] * x + u[1] * y - f[1] * back, hero[2] + r[2] * x + u[2] * y - f[2] * back],
          radius,
        });
      }
    }
  }
  return spheres;
}
const cross = (a: readonly number[], b: readonly number[]): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: readonly number[]): [number, number, number] => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Distance from a point to a box, zero inside. */
export function boxDistance(box: KitBox, point: readonly [number, number, number]) {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(box.min[k] - point[k], 0, point[k] - box.max[k]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Distance from a point to a vertical cylinder (or its hollow wall), zero inside the solid. */
export function cylinderDistance(cylinder: Cylinder, point: readonly [number, number, number]) {
  const r = Math.hypot(point[0] - cylinder.center[0], point[2] - cylinder.center[2]);
  const horizontal = Math.max(0, r - cylinder.radius, cylinder.inner ? cylinder.inner - r : 0);
  const vertical = Math.max(cylinder.minY - point[1], 0, point[1] - cylinder.maxY);
  return Math.hypot(horizontal, vertical);
}

/**
 * The common replacement of design 6.3: the district's row of procedural arches at local
 * z -9.3 becomes kit arches at the same places, keeping the procedural spacing and heights
 * (the x and z scale fit the arch to the spacing so the three columns are shared, the y
 * scale keeps the authored height). The Sanctuary has no row; its arcade is placed in 6.7.
 */
export function archRow(id: ZoneId): KitPlacement[] {
  if (id === "heart") return [];
  const index = ZONES.findIndex(zone => zone.id === id);
  const count = id === "expressions" ? 5 : 3, width = id === "expressions" ? 3.8 : 4.8;
  const spacing = width * 1.1;
  const row: KitPlacement[] = [];
  for (let k = 0; k < count; k++) {
    const height = index < 3 ? 10.3 + (k === 1 ? 1.2 : 0) : 8.4;
    row.push({
      id: "landmark.pearl-arch",
      position: [(k - (count - 1) / 2) * spacing, 0.65, -9.3],
      scaleXYZ: [spacing / KIT_ARCH.width, height / KIT_ARCH.height, spacing / KIT_ARCH.width],
      role: "static",
      replaces: "arch",
      arch: k,
      note: `arch row ${k + 1} of ${count}, procedural height ${height}`,
    });
  }
  return row;
}

/** The Sanctuary arcade of design 6.7: seven kit arches where the procedural ones stand. */
export function arcadeRow(): KitPlacement[] {
  const row: KitPlacement[] = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.05 + (i / 6) * Math.PI * 0.9;
    // The procedural arcade arch is 5.15 wide and 11.8 tall; neighbours on the 12.8 radius
    // are 6 apart, so the kit arch fills the bay and the arcade reads as one colonnade.
    row.push({
      id: "landmark.pearl-arch",
      position: [Math.cos(a) * 12.8, 0.65, -Math.sin(a) * 12.8 - 1.5],
      rotationY: Math.PI / 2 - a,
      scaleXYZ: [1.5, 11.8 / KIT_ARCH.height, 1.5],
      role: "static",
      replaces: "arch",
      arch: i,
      frame: "arcade",
      note: `arcade arch ${i + 1} of 7`,
    });
  }
  return row;
}
