import { RECOGNITION_ZONES, ZONES, type WorldZone, type ZoneId } from "../world-data";

/**
 * Placement tables for the near zones of the 3D Studio kit (WORLD-INTEGRATION section 6):
 * welcome, garden, featured, heart, expressions, peacemakers and practice. Lane K3a.
 *
 * Pure data and pure helpers, so `tests/world/kit-layout.test.ts` proves every placement
 * against the keep out volumes of design 6.2 in a plain Node test, and so the same tables
 * can be exported to Unreal (design 9). Nothing here touches three or the DOM.
 *
 * Frames (design 6.1): every position is in the zone's district local frame: origin at
 * `zone.center`, +y up, +z toward the tour eye, +x to the viewer's right. `design-world.ts`
 * builds that frame as `layout` (rotated by `facing`). A placement may opt into the
 * unrotated district `root` frame (the grove's columns live there) or the Sanctuary
 * `arcade` frame, whose rotation equals the Sanctuary's facing.
 *
 * Table format shared with lane K3b (`kit-layout-far.ts` declares the same shape): `id`,
 * `position`, `rotationY`, `scale`, `role`, `note`. Every other field is optional, so a K3b
 * table satisfies `ZoneLayout` unchanged and the coordinator adds `FAR_ZONE_LAYOUTS` with one
 * import in `kit-districts.ts`.
 */

export type KitPlacementRole = "static" | "instanced" | "animated";
export type KitPlacementFrame = "layout" | "root" | "arcade";
export type KitPlacementClip = {
  name: string;
  /** Scrub the clip to this fraction and hold it (a still frame is complete). */
  at?: number;
  /** Loop the clip on the world delta instead, at `rate` times its authored speed. */
  loop?: boolean;
  rate?: number;
};
export type KitPlacement = {
  /** A kit asset id from the manifest, `<feature>.<name>`. */
  id: string;
  /** District frame, relative to the zone centre. */
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  role?: KitPlacementRole;
  note?: string;
  /** A non uniform scale (the arch row keeps the procedural heights and spacing). */
  scaleXYZ?: [number, number, number];
  /** A per placement colour, multiplied into the baked vertex colour (the lavender tree). */
  tint?: string;
  /** Animated pieces: which clip, scrubbed or looping. */
  clip?: KitPlacementClip;
  /**
   * Which procedural piece this stands in for; the builder removes it only when the kit
   * piece exists. `column` is one of the grove's nine ivory columns (`column` below).
   */
  replaces?: "arch" | "landmark" | "column";
  /** With `replaces: "arch"`: the index in the district's arch list (or the Sanctuary arcade's). */
  arch?: number;
  /** With `replaces: "column"`: the grove site index. */
  column?: number;
  frame?: KitPlacementFrame;
  /**
   * Hidden beyond the tier's detail distance from the district centre (design 7.5); `near`
   * hides beyond 72 units like the neighbors (people, whose faces only read up close).
   */
  detail?: boolean | "near";
  /** A contact shadow of this width and depth on the terrace under the piece. */
  contact?: [number, number];
  /**
   * A round piece (pavilion, globe, gazebo, fountain): the layout test measures its reach and
   * its keep out clearance with a vertical cylinder instead of the corner of its box.
   */
  footprint?: "round";
  /** Sits under the hero pearl on purpose (the Garden lotus): proven by the pearl's bottom clearance instead. */
  under?: boolean;
  /**
   * Encloses the hero pearl on purpose (the Pavilion): the layout test proves the medallion
   * reach clear of its columns and its columns and roof (`pavilionParts`) clear of the residents.
   */
  encloses?: boolean;
  /** A soft additive glow on the radiance layer around the piece (the lit lotus, the selected piece). */
  halo?: { color: string; scale: number; opacity: number; lift?: number };
  /** Instanced pieces that float: a slow bob on the world clock. */
  bob?: { amplitude: number; rate: number; phase?: number };
  /**
   * Grove pieces: the expression id this piece stands for. The nine share one draw; the
   * selected one (`scene.userData.studyExpression`) rises .6 and turns (design 6.8).
   */
  slot?: number;
  /** A stele: the canonical icon disc of this expression id on the text face (design 6.10). */
  icon?: number;
  /** The owner's effect switch that hides this piece. */
  effect?: "sparkles" | "trails";
};
export type KeepOutSphere = { center: [number, number, number]; radius: number };
/** A procedural water disc the builder cuts into the terrace (the Garden's lily pond). */
export type LayoutPool = { center: [number, number, number]; radius: number; rim?: boolean };
/** A raised ivory terrace drum (the gate's platform, the practice levels), base at `center[1]`. */
export type LayoutPlatform = { center: [number, number, number]; radius: number; height: number };
/** Where people stand (the neighbors, the miniature figures): furniture and bushes keep clear. */
export type LayoutStand = { center: [number, number, number]; radius: number };
/** An animated curve the layout test samples (the Peace Promise ribbon knot, design 6.16). */
export type LayoutCurve = { id: string; point(u: number, t: number): [number, number, number] };
/** Instanced kit butterflies on a helix (the Butterfly Gate, design 6.4). */
export type LayoutSwarm = {
  id: string;
  count: number;
  center: [number, number, number];
  radius: [number, number];
  height: [number, number];
  turnSeconds: number;
  scale: number;
};
export type ZoneLayout = {
  zone: ZoneId;
  placements: KitPlacement[];
  /** Extra keep out spheres beyond the reading spheres of design 6.2, district frame. */
  keepOut?: KeepOutSphere[];
  pools?: LayoutPool[];
  platforms?: LayoutPlatform[];
  stands?: LayoutStand[];
  swarms?: LayoutSwarm[];
  /** Curves that must never touch each other (proven by the layout test). */
  curves?: LayoutCurve[];
  /** Hide the procedural disc flower clusters: the kit's rose and hydrangea bushes take the beds. */
  hideFlowers?: boolean;
  /** Take the procedural arch row out without a kit row (the practice terraces climb through it). */
  removeArchRow?: boolean;
};

export type KitBox = { min: [number, number, number]; max: [number, number, number] };

/**
 * Authored bounds of every kit piece the near zones place, in kit units, read from the
 * position accessors of the files at the studio commit the manifest names
 * (`public/world-kit/v1/manifest.json`, `546ff103`). The layout test pins each entry's largest
 * side to the manifest's `size`, so this table cannot drift from the files unnoticed.
 */
export const KIT_BOUNDS: Readonly<Record<string, KitBox>> = {
  "landmark.pearl-arch": { min: [-1.945, 0, -0.525], max: [1.945, 5.19, 0.525] },
  "landmark.pearl-column": { min: [-0.436, 0, -0.436], max: [0.436, 4, 0.436] },
  "landmark.garden-bench": { min: [-0.75, 0, -0.35], max: [0.75, 1.025, 0.35] },
  "landmark.lantern-post": { min: [-0.278, 0, -0.278], max: [0.278, 2.79, 0.278] },
  "landmark.stone-tablet": { min: [-0.732, 0, -0.307], max: [0.732, 1.6, 0.307] },
  "landmark.pearl-stairs": { min: [-1.465, 0, -1.764], max: [1.465, 1.29, 1.764] },
  "landmark.pearl-pavilion-horseshoe": { min: [-3.35, 0, -3.35], max: [3.35, 7.663, 3.35] },
  "landmark.pearl-pavilion": { min: [-3.35, 0, -3.35], max: [3.35, 7.58, 3.35] },
  "landmark.gazebo-glass": { min: [-1.85, 0, -1.85], max: [1.85, 5.17, 1.85] },
  "landmark.peace-globe": { min: [-0.955, 0, -0.94], max: [0.955, 2.953, 0.94] },
  "landmark.filigree-railing": { min: [-1.075, 0, -0.085], max: [1.075, 0.905, 0.085] },
  "landmark.curved-ramp": { min: [-1.855, 0, -2.604], max: [1.855, 1.74, 2.604] },
  "landmark.pool-fountain": { min: [-1.077, 0, -1.077], max: [1.077, 1.52, 1.077] },
  "landmark.love-observatory": { min: [-2.75, 0, -2.75], max: [2.75, 6.808, 2.75] },
  "landmark.fountain-of-kindness": { min: [-2.3, 0, -2.3], max: [2.3, 4.01, 2.3] },
  "arrival.butterfly-gate": { min: [-2.11, 0, -0.56], max: [2.11, 6.14, 0.56] },
  "arrival.butterfly": { min: [-0.178, -0.034, -0.135], max: [0.178, 0.034, 0.135] },
  "arrival.lotus-bloom": { min: [-1.487, 0, -1.426], max: [1.487, 1.188, 1.426] },
  "arrival.ribbon-portal": { min: [-3.791, 0, -1.453], max: [3.791, 5.958, 1.453] },
  "nature.blossom-tree-a": { min: [-1.893, 0, -1.897], max: [1.893, 5, 1.897] },
  "nature.blossom-tree-b": { min: [-2.515, 0, -1.349], max: [2.515, 6, 1.349] },
  "nature.blossom-tree-c": { min: [-2.336, 0, -1.733], max: [2.336, 4, 1.733] },
  "nature.rose-bush": { min: [-0.725, 0, -0.65], max: [0.725, 1.13, 0.65] },
  "nature.hydrangea-bush": { min: [-0.8, 0, -0.668], max: [0.8, 1.13, 0.668] },
  "nature.lily-pads": { min: [-1.25, 0, -0.881], max: [1.25, 0.788, 0.881] },
  "nature.stepping-stones": { min: [-2.4, 0, -1.005], max: [2.4, 0.169, 1.005] },
  "nature.crystal-pink": { min: [-0.942, 0, -0.89], max: [0.942, 1.9, 0.89] },
  "nature.crystal-lavender": { min: [-0.85, 0, -0.83], max: [0.85, 1.6, 0.83] },
  "nature.crystal-blue": { min: [-0.551, 0, -0.622], max: [0.551, 1.3, 0.622] },
  "core.pearl": { min: [-0.425, -0.425, -0.425], max: [0.425, 0.425, 0.425] },
  "core.heart": { min: [-0.75, -0.678, -0.335], max: [0.75, 0.678, 0.335] },
  "core.flower": { min: [-0.575, -0.566, -0.334], max: [0.575, 0.566, 0.334] },
  "core.ribbon": { min: [-0.7, -0.576, -0.264], max: [0.7, 0.576, 0.264] },
  "expression.01-hello-bubble": { min: [-0.6, -0.588, -0.225], max: [0.6, 0.588, 0.225] },
  "expression.02-gift-box": { min: [-0.6, -0.557, -0.6], max: [0.6, 0.557, 0.6] },
  "expression.03-mended-heart": { min: [-0.6, -0.542, -0.286], max: [0.6, 0.542, 0.286] },
  "expression.04-comfort-cloud": { min: [-0.6, -0.37, -0.295], max: [0.6, 0.37, 0.295] },
  "expression.05-open-door": { min: [-0.6, -0.518, -0.327], max: [0.6, 0.518, 0.327] },
  "expression.06-teacup": { min: [-0.6, -0.46, -0.6], max: [0.6, 0.46, 0.6] },
  "expression.07-candle": { min: [-0.523, -0.6, -0.523], max: [0.523, 0.6, 0.523] },
  "expression.08-helping-hand": { min: [-0.453, -0.6, -0.475], max: [0.453, 0.6, 0.475] },
  "expression.09-star": { min: [-0.6, -0.577, -0.258], max: [0.6, 0.577, 0.258] },
  "people.child": { min: [-0.292, -0.5, -0.216], max: [0.292, 0.5, 0.216] },
  "people.father": { min: [-0.505, -0.8, -0.322], max: [0.505, 0.8, 0.322] },
  "people.grandfather": { min: [-0.433, -0.75, -0.322], max: [0.433, 0.75, 0.322] },
  "people.grandmother": { min: [-0.318, -0.75, -0.287], max: [0.318, 0.75, 0.287] },
  "people.mother": { min: [-0.408, -0.8, -0.325], max: [0.408, 0.8, 0.325] },
  "people.teenager": { min: [-0.395, -0.7, -0.258], max: [0.395, 0.7, 0.258] },
};

/** The kit arch's authored width and height (its top is where the keystone lantern hangs). */
export const KIT_ARCH = { width: 3.89, height: 5.19 } as const;

/**
 * The horseshoe pavilion as delivered (`landmark.pearl-pavilion-horseshoe`), in kit units,
 * measured from its vertices: six columns of half width .25 standing at radius 2.62 at the
 * manifest's bearings from the open side (85, 123, 161 degrees either way), the floor .44
 * up, the ring beam's underside at 4.613, the glass apex at 6.803. The layout test proves
 * the hero pearl's medallion reach clear of every column and under the apex (design 6.6).
 */
export const PAVILION = { columnRadius: 2.62, columnHalfWidth: 0.25, floor: 0.44, beam: 4.613, apex: 6.803, columns: [85, 123, 161, 199, 237, 275] } as const;

/** The hero pearl's radius and the reach of its medallion ring, world units (design 6.2). */
export const HERO_PEARL = { radius: 4.4, reach: 6.9 } as const;

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
  const side = id === "heart" || id === "peacemakers" ? 7 : 3;
  return [
    { center: [side, Math.max(lift + 3, 7.32), 5], radius: 7 },
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

/**
 * The horseshoe pavilion as it stands, in its own frame: six column cylinders from the base
 * to the ring beam, then the roof (beam to apex) as one cylinder of the file's full reach.
 * The layout test measures the residents' clearance against these, not the bounding cylinder,
 * because the pavilion surrounds the hero pearl by design.
 */
export function pavilionParts(placement: KitPlacement) {
  const scale = placement.scale ?? 1, yaw = placement.rotationY ?? 0;
  const [x, y, z] = placement.position;
  const parts: Array<{ center: readonly [number, number, number]; radius: number; minY: number; maxY: number }> = [];
  for (const angle of PAVILION.columns) {
    const a = (angle * Math.PI) / 180 + yaw;
    parts.push({ center: [x + Math.sin(a) * PAVILION.columnRadius * scale, y, z + Math.cos(a) * PAVILION.columnRadius * scale], radius: PAVILION.columnHalfWidth * scale, minY: y, maxY: y + PAVILION.beam * scale });
  }
  const bounds = KIT_BOUNDS["landmark.pearl-pavilion-horseshoe"];
  parts.push({ center: [x, y, z], radius: Math.max(bounds.max[0], bounds.max[2]) * scale, minY: y + PAVILION.beam * scale, maxY: y + PAVILION.apex * scale });
  return parts;
}

/** Distance from a point to a box, zero inside. */
export function boxDistance(box: KitBox, point: readonly [number, number, number]) {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(box.min[k] - point[k], 0, point[k] - box.max[k]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Distance from a point to a vertical cylinder, zero inside. */
export function cylinderDistance(cylinder: { center: readonly [number, number, number]; radius: number; minY: number; maxY: number }, point: readonly [number, number, number]) {
  const horizontal = Math.max(0, Math.hypot(point[0] - cylinder.center[0], point[2] - cylinder.center[2]) - cylinder.radius);
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

const rose = (x: number, z: number, scale: number, spin: number, note?: string): KitPlacement => ({
  id: "nature.rose-bush", position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note,
});
const hydrangea = (x: number, z: number, scale: number, spin: number, note?: string): KitPlacement => ({
  id: "nature.hydrangea-bush", position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note,
});
const lantern = (x: number, z: number, note?: string, y = 0.7): KitPlacement => ({
  id: "landmark.lantern-post", position: [x, y, z], scale: 1.15, role: "static", note,
});
const bench = (x: number, z: number, yaw: number, note?: string, y = 0.7): KitPlacement => ({
  id: "landmark.garden-bench", position: [x, y, z], rotationY: yaw, scale: 1.35, role: "static", note,
});
/** People stand on their base: the files are centred, so the position lifts them half their height. */
const person = (id: string, x: number, z: number, yaw: number, y = 0.7, note?: string): KitPlacement => ({
  id, position: [x, y - KIT_BOUNDS[id].min[1], z], rotationY: yaw, role: "instanced", detail: "near", note,
});
const degrees = (value: number) => (value * Math.PI) / 180;

/**
 * Butterfly Gate (design 6.4). The kit gate stands on a raised round platform reached by a
 * wide stair, as `zone-welcome.png` draws it, with pearl columns either side, crystal
 * clusters at the foot of the stairs in the frame's three colours (the W3 crystals exist, so
 * the stretched pearl stand in is not needed), blossom trees framing the gate from the front
 * corners (the design's spots coincide with the cotton trees, which stay), a blank tablet,
 * lantern posts, and twenty four kit butterflies on a helix that turns once a minute. The
 * gate file has no door clip, so the gate stands open and the butterflies stream through.
 */
function welcomeLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    ...archRow("welcome"),
    { id: "arrival.butterfly-gate", position: [0, 1.9, -6.3], scale: 13 / 6.14, role: "static", replaces: "landmark", contact: [9.5, 3.2], note: "the gate, 13 tall, on the platform, open side to the camera" },
    { id: "landmark.pearl-stairs", position: [0, 0.6, 1.3], scaleXYZ: [1.7, 1, 1], role: "static", contact: [5.4, 4], note: "the fan of stairs up to the platform (the stair climbs toward -z)" },
    { id: "landmark.pearl-column", position: [-7.2, 0.6, -3], scale: 1.5, role: "static", note: "column flanking the platform" },
    { id: "landmark.pearl-column", position: [7.2, 0.6, -3], scale: 1.5, role: "static", note: "column flanking the platform" },
    { id: "landmark.stone-tablet", position: [9.5, 0.7, 1], rotationY: -0.6, role: "static", note: "blank tablet; the tagline and count stay in the DOM card" },
    { id: "nature.blossom-tree-b", position: [-11.5, 0.7, 5], rotationY: 0.3, scale: 1.15, role: "static", contact: [7, 5.5], note: "front left corner tree" },
    { id: "nature.blossom-tree-a", position: [12, 0.7, 3], rotationY: -0.4, scale: 1.15, role: "static", contact: [6.5, 5.5], note: "front right corner tree" },
    lantern(-8.8, 7.2, "forecourt post"),
    lantern(8.8, 7.2, "forecourt post"),
  ];
  const crystals: Array<[string, number, number, number, number]> = [
    ["nature.crystal-pink", 5.6, 3.8, 1.2, 0.3], ["nature.crystal-blue", 4.6, 4.7, 0.9, 1.4], ["nature.crystal-lavender", 6.5, 4.8, 0.8, 2.6],
    ["nature.crystal-lavender", -5.5, 4.0, 1.1, 0.8], ["nature.crystal-pink", -4.5, 4.8, 0.8, 2.1], ["nature.crystal-blue", -6.4, 4.9, 0.75, 3.4],
    ["nature.crystal-pink", -8.2, -1.2, 1.0, 1.1], ["nature.crystal-lavender", -7.4, -0.2, 0.9, 2.9],
  ];
  crystals.forEach(([id, x, z, scale, spin], k) => placements.push({
    id, position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, effect: "sparkles", note: `crystal ${k + 1} of ${crystals.length}`,
  }));
  return {
    zone: "welcome",
    placements,
    platforms: [{ center: [0, 0.6, -5.5], radius: 5.6, height: 1.3 }],
    swarms: [{ id: "arrival.butterfly", count: 24, center: [0, 1.9, -6.3], radius: [2.2, 8], height: [3, 15], turnSeconds: 60, scale: 1.4 }],
  };
}

/**
 * Garden of Kindness (design 6.5), after the coordinator's checkpoint notes. The lily pond
 * sits at the island centre under the arriving pearl's landing (world 26, 5, 16 is local 0,
 * 5, 0) with a large lit lotus just under the pearl's bottom edge and pads around it; one
 * continuous stone path leads from the front left forecourt to the pond rim; the blossom
 * tree climbs the far left edge so only its crown overhangs the headline; both benches face
 * the pond; rose bushes fill both bed arcs and a low hedge frames the pond from below, with
 * the procedural disc flowers hidden so one flower vocabulary reads. Bushes and furniture
 * stay 2.5 units off the neighbors' anchor and off the miniature figures' feet.
 *
 * The island's back left quarter lies inside the entry stage reservation (6.2: 12 units
 * around the arrival stage, which is 22 units from the Garden centre), so the tree stands at
 * the front left edge rather than the design's (-13.5, .7, 1), and the left bed keeps to the
 * front half.
 */
function gardenLayout(): ZoneLayout {
  const pond: [number, number, number] = [-0.6, 0.7, -0.6];
  const placements: KitPlacement[] = [
    ...archRow("garden"),
    bench(-5.8, 9.6, 0.9, "left bench, in front of the figures and right of the headline, facing the pond"),
    bench(9.5, 7.5, -1.0, "right bench, angled to the pond, clear of the control cluster"),
    lantern(-6.3, 13.3, "forecourt post, left of the stone path"),
    lantern(14, 5, "forecourt post"),
    { id: "nature.blossom-tree-c", position: [-14.6, 0.7, 7], rotationY: 0.4, scale: 1, role: "static", contact: [6.5, 5], note: "far left edge at scale 1, so the trunk climbs the frame edge and only the crown overhangs the headline (checkpoint note 1; the suggested spot enters the entry stage cap)" },
    { id: "nature.stepping-stones", position: [-3.65, 0.62, 12.66], rotationY: 1.2, role: "instanced", detail: true, note: "path from the forecourt, rims sunk into the floor" },
    { id: "nature.stepping-stones", position: [-2.5, 0.62, 8.0], rotationY: 1.45, role: "instanced", detail: true, note: "path to the pond rim (ends about -2.2, 5.6)" },
    { id: "arrival.lotus-bloom", position: [0.5, 0.7, 0.8], rotationY: 0.6, scale: 1.6, role: "animated", clip: { name: "bloom", at: 1 }, under: true, footprint: "round", halo: { color: "#ffd2a4", scale: 5.5, opacity: 0.4, lift: 0.5 }, note: "open lotus under the pearl's bottom edge, lit from below" },
  ];
  // Lily pads around the pond (bearings from +x toward +z, so 90 faces the camera): the far
  // side, the right, and the near left, where the medallion reach allows them (the layout
  // test governs); the near right is the pearl's own water.
  for (const [k, bearingDegrees] of [114, 148, 186, 226, 268, 310, 350].entries()) {
    const bearing = degrees(bearingDegrees);
    placements.push({
      id: "nature.lily-pads",
      position: [pond[0] + Math.cos(bearing) * 4.6, 0.71, pond[2] + Math.sin(bearing) * 4.6],
      rotationY: -bearing + Math.PI / 2 + (k % 2 ? 0.3 : -0.2),
      scale: 0.9,
      tint: "#e8f2c9",
      role: "instanced",
      detail: true,
      note: `lily pads ${k + 1} of 7`,
    });
  }
  const roses: Array<[number, number, number, number]> = [
    // Right arc.
    [13, -5, 1.4, 0.3], [12.5, 0.5, 1.5, 2.1], [12.8, 2.2, 1.4, 1.1], [10.5, 4, 1.4, 0.6], [9.6, 1.2, 1.6, 0.3], [8, 10.8, 1.3, 1.9], [9.4, 12.6, 1.3, 2.7],
    // Left arc: the back left quarter is the entry stage's, and the figures stand at the
    // front, so the arc runs from the front left edge in to the lawn behind the tree.
    [-10, 0, 1.4, 0.4], [-12, 3.8, 1.4, 2.6], [-7.6, -1.8, 1.4, 1.7], [-12.4, 7, 1.3, 1.5], [-8.3, 9.3, 1.3, 2.2], [-10.6, 9.6, 1.3, 0.9],
    // The low hedge along the near edge, either side of the stone path.
    [4.4, 13.2, 0.9, 0.5], [6.2, 13.9, 0.9, 1.7], [8.0, 13.0, 0.9, 2.9], [-9.6, 12.4, 0.9, 1.2], [-8.2, 13.6, 0.9, 2.4], [-11, 11, 0.9, 0.2],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [
    [11.2, -2.6, 1.4, 0.5], [9.4, -8.2, 1.3, 2.8], [12.2, 7.2, 1.3, 1.6], [-7.2, -4.2, 1.3, 0.9], [-13.5, 9.5, 1.3, 0.2],
  ];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return {
    zone: "garden",
    placements,
    pools: [{ center: pond, radius: 5.6, rim: true }],
    stands: figureStands("garden"),
    hideFlowers: true,
  };
}

/**
 * Pearl Pavilion (design 6.6, horseshoe rule). The delivered file is the horseshoe (its
 * manifest entry lists the column bearings), so the fallback ring placement is not built.
 * The pavilion is scaled to the design's column ring radius of 9 (3.4 times the file: 23
 * tall, the ring beam at 15.7, the floor 1.5 up) and stands on the hero pearl's ground
 * point, nudged a unit toward the front left so its roof eave clears the back right resident
 * pearl's ring while every column keeps clear of the medallion reach and the pearl floats
 * inside the gazebo; its roof overhangs the island's front edge like a canopy. The stair
 * climbs to the pavilion floor from the front left forecourt (the front centre is off the
 * island); the five procedural ring arches go. The practice zone's eye sits 17 units off the
 * back right edge at y 11, so nothing tall stands there.
 */
function featuredLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    ...archRow("featured"),
    { id: "landmark.pearl-pavilion-horseshoe", position: [2.4, 0.6, 5.6], scale: 3.4, role: "static", replaces: "landmark", footprint: "round", encloses: true, note: "the gazebo around the hero pearl, open side to the camera, columns at radius 9" },
    { id: "landmark.pearl-stairs", position: [-6, 0.6, 8.6], rotationY: -Math.PI / 3, scaleXYZ: [1.3, 1.16, 1], role: "static", note: "stair from the front left forecourt up to the pavilion floor" },
    lantern(-8.6, 10.2, "post at the stair foot"),
    lantern(-4.2, 12.4, "post at the stair foot"),
    bench(-10.2, 1.5, 1.4, "bench at the left, facing the pearl"),
    { id: "nature.blossom-tree-a", position: [-11.8, 0.7, 5.8], rotationY: 0.5, scale: 1.1, role: "static", contact: [6.5, 5.5], note: "front left corner tree, under the eave" },
    { id: "nature.blossom-tree-a", position: [13, 0.7, 3.5], rotationY: -0.6, scale: 1.1, role: "static", contact: [6.5, 5.5], note: "front right corner tree, under the eave, clear of the hero sphere" },
  ];
  const roses: Array<[number, number, number, number]> = [
    [-11, 0, 1.4, 0.3], [-10.5, -2.8, 1.4, 1.2], [-11.4, 3.2, 1.3, 2.4], [-10.8, -5.5, 1.3, 0.7], [-8.5, -8, 1.3, 1.9],
    [11.5, -5, 1.4, 0.4], [10, -7.5, 1.3, 1.6], [8.6, 8.6, 1.3, 2.8], [7.4, 9.8, 1.2, 0.9], [-6.4, 10.8, 1.2, 2.1],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[-11.6, 1.6, 1.3, 0.5], [-9.6, -4.2, 1.3, 2.2], [12.4, -2.3, 1.3, 1.1], [10.2, 6.8, 1.2, 2.9]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return { zone: "featured", placements, hideFlowers: true };
}

/**
 * Heart Sanctuary (design 6.7). The supplied original heart, the silk ribbons, the terraces,
 * the halo and the sparkles stay; the seven procedural arcade arches become kit arches in
 * the arcade frame; roses ring the terraces with a gap toward the camera; two lantern posts
 * and a bench dress the forecourt; five small kit hearts float on slow bobs, sparkle class.
 * The petals rise here instead of falling (`study-air.ts`).
 */
function heartLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    ...arcadeRow(),
    lantern(-11, 7, "forecourt post"),
    lantern(11, 7, "forecourt post"),
    bench(-10.5, 9, 0.5, "bench at the left of the forecourt"),
  ];
  // The ring keeps a 60 degree gap toward the camera; the two front left bushes step out to
  // radius 13 because the miniature figures stand at the front left of the terraces.
  for (const [k, [bearingDegrees, radius]] of ([[47, 10.2], [70, 10.2], [93, 10.2], [116, 10.2], [139, 10.2], [162, 10.2], [-50, 13], [-74, 13], [-93, 10.2], [-116, 10.2], [-139, 10.2], [-162, 10.2]] as const).entries()) {
    const bearing = degrees(bearingDegrees);
    placements.push(rose(Math.sin(bearing) * radius, Math.cos(bearing) * radius, 1.3 + (k % 3) * 0.1, k * 0.9, `rose bush ${k + 1} of 12 on the terrace ring`));
  }
  const hearts: Array<[number, number, number]> = [[-8, 7, 3], [-9.5, 8.5, 5.5], [-7, 6, -2], [9.5, 6, -3], [10.5, 6.5, -1.5]];
  hearts.forEach(([x, y, z], k) => placements.push({
    id: "core.heart", position: [x, y, z], rotationY: k * 1.3, scale: 0.6, role: "instanced", effect: "sparkles", bob: { amplitude: 0.35, rate: 0.5 + k * 0.07, phase: k * 1.7 }, note: `floating heart ${k + 1} of 5`,
  }));
  return { zone: "heart", placements, stands: figureStands("heart"), hideFlowers: true };
}

/**
 * Nine Expressions Grove (design 6.8). Each ivory column becomes a kit pearl column 4.25
 * tall in the grove's root frame, with the canonical icon disc kept at y 5.15 on its front
 * (Plan 24 protects the disc) and the Plan 01 expression piece above it. The nine pieces
 * share one draw; the selected one rises and turns and carries a halo. The five arches stay
 * as kit arches; the grove's four cotton trees are its trees.
 */
function expressionsLayout(): ZoneLayout {
  const placements: KitPlacement[] = [...archRow("expressions")];
  const pieces = ["expression.01-hello-bubble", "expression.02-gift-box", "expression.03-mended-heart", "expression.04-comfort-cloud", "expression.05-open-door", "expression.06-teacup", "expression.07-candle", "expression.08-helping-hand", "expression.09-star"];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 1.6, x = Math.cos(a) * 10.5, z = Math.sin(a) * 9.3;
    placements.push({ id: "landmark.pearl-column", position: [x, 0.675, z], scaleXYZ: [1.1, 4.25 / 4, 1.1], role: "static", replaces: "column", column: i, frame: "root", note: `grove column ${i + 1} of 9` });
    placements.push({ id: pieces[i], position: [x, 7.15, z], rotationY: 0.48, scale: 1.6, role: "static", frame: "root", slot: i + 1, halo: { color: "#ffe2b0", scale: 4.2, opacity: 0.45 }, note: `expression piece ${i + 1} on its column` });
  }
  placements.push(lantern(-13, 9, "forecourt post"), lantern(13, 9, "forecourt post"));
  // The common bed dressing (design 6.3): roses along the lawn ring outside the columns,
  // hydrangeas at the bed ends, the procedural disc flowers hidden for one flower vocabulary.
  const roses: Array<[number, number, number, number]> = [
    [13.5, 2, 1.4, 0.3], [14, -2.5, 1.4, 1.5], [12.8, 6, 1.3, 2.6], [11, 10.5, 1.3, 0.9], [-13.5, 2, 1.4, 2.1], [-14, -2.5, 1.4, 0.6], [-12.8, 6, 1.3, 1.8], [-11, 10.5, 1.3, 2.9], [7, 12.8, 1.2, 1.1], [-7, 12.8, 1.2, 2.3],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[14.2, -6, 1.3, 0.4], [-14.2, -6, 1.3, 1.9], [9.5, 12, 1.2, 2.7], [-9.5, 12, 1.2, 0.8]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return { zone: "expressions", placements, stands: figureStands("expressions"), hideFlowers: true };
}

/**
 * Peace Globe (design 6.9). The kit globe on its filigree stand, 11 tall, replaces the
 * procedural glass globe and its rings; the gold railed terrace of `zone-peacemakers.png` is
 * a ring of kit filigree railing segments (the W4 gap is filled) with a three segment gap
 * toward the camera; twelve static Plan 01 people hold the circle at radius 6.2, facing the
 * globe, hidden beyond 72 units; lantern posts flank the entrance; blossom trees, roses and
 * hydrangeas dress the sides. The two rigged neighbors stand in the forecourt (lane K4).
 */
function peacemakersLayout(): ZoneLayout {
  const globe: [number, number] = [-2, -1];
  const placements: KitPlacement[] = [
    ...archRow("peacemakers"),
    { id: "landmark.peace-globe", position: [globe[0], 0.6, globe[1]], scale: 11 / 2.953, role: "static", replaces: "landmark", footprint: "round", note: "the globe on its stand, 11 tall, centre at y 8" },
    lantern(globe[0] - 3.6, 7.4, "post at the railing entrance"),
    lantern(globe[0] + 3.6, 7.4, "post at the railing entrance"),
    { id: "nature.blossom-tree-b", position: [-12, 0.7, 6], rotationY: 0.3, scale: 1.05, role: "static", contact: [7, 5.5], note: "front left tree" },
    { id: "nature.blossom-tree-b", position: [12.5, 0.7, -4], rotationY: -0.3, scale: 1.05, role: "static", contact: [7, 5.5], note: "right tree, behind the hero pearl's sphere (the pearl sits at the right here)" },
  ];
  // Twenty five segments of pitch 2 close a ring of radius 8 (chord 2.005); three stay out
  // at the front as the entrance.
  for (let k = 0; k < 25; k++) {
    if (k === 0 || k === 1 || k === 24) continue;
    const a = (k / 25) * Math.PI * 2;
    placements.push({ id: "landmark.filigree-railing", position: [globe[0] + Math.sin(a) * 8, 0.7, globe[1] + Math.cos(a) * 8], rotationY: a, role: "static", note: `railing segment ${k} of 25` });
  }
  const people = ["people.child", "people.mother", "people.father", "people.teenager", "people.grandmother", "people.grandfather"];
  for (let k = 0; k < 12; k++) {
    const a = degrees(15 + k * 30);
    placements.push(person(people[k % 6], globe[0] + Math.sin(a) * 6.2, globe[1] + Math.cos(a) * 6.2, a + Math.PI, 0.7, `circle ${k + 1} of 12, facing the globe`));
  }
  const roses: Array<[number, number, number, number]> = [[10, 3, 1.4, 0.3], [10.5, -2, 1.4, 1.5], [9.8, -6, 1.3, 2.6], [9.5, 6, 1.3, 0.9], [-10, 3, 1.4, 2.1], [-10.5, -2, 1.4, 0.6], [-9.8, -6, 1.3, 1.8], [-9.5, 6.2, 1.3, 2.9]];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[11, 0.5, 1.3, 0.4], [-11, 0.5, 1.3, 1.9], [10.3, -4.2, 1.3, 2.7], [-10.6, -4.2, 1.3, 0.8], [9.8, 7.4, 1.2, 1.3], [-9.8, 7.4, 1.2, 2.4]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return { zone: "peacemakers", placements, hideFlowers: true };
}

/**
 * Daily Practice Terrace (design 6.10, `zone-practice.png`). Two raised ivory levels climb
 * from the terrace behind the forecourt, joined by kit stairs and edged with kit filigree
 * railing; the domed hall at the top is the kit glass gazebo (the W4 gap is filled, so the
 * observatory stand in is not used); the procedural arch row goes because the levels climb
 * through it. Nine kit steles carry the canonical icon discs, one per expression, along the
 * level one crescent and the level two rim; two benches face each other on the lawn with the
 * teacup and the candle; the pool with the kit fountain sits on the right lawn; a lavender
 * and a pink blossom tree stand at the front corners; four static people stand on the levels,
 * hidden beyond 72 units. The neighbors (lane K4) stand beside the benches.
 */
function practiceLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "landmark.pearl-stairs", position: [-5.2, 0.6, 1.5], scaleXYZ: [1.1, 1.24, 1.1], role: "static", note: "left stair to level two" },
    { id: "landmark.pearl-stairs", position: [5.2, 0.6, 1.5], scaleXYZ: [1.1, 1.24, 1.1], role: "static", note: "right stair to level two" },
    { id: "landmark.pearl-stairs", position: [0, 2.3, -3.3], scaleXYZ: [1, 1.24, 1], role: "static", note: "stair from level two to level three" },
    { id: "landmark.gazebo-glass", position: [0, 3.9, -8], scale: 1.15, role: "static", footprint: "round", note: "the domed hall on level three" },
    lantern(-2.3, -2.5, "post flanking the upper stair", 2.3),
    lantern(2.3, -2.5, "post flanking the upper stair", 2.3),
    bench(-7.5, 4, 1.1, "left bench, facing the right one", 0.7),
    bench(7.5, 4, -1.1, "right bench, facing the left one", 0.7),
    { id: "expression.06-teacup", position: [-7.5, 1.85, 4], rotationY: 1.1, scale: 0.9, role: "static", note: "teacup on the left bench" },
    { id: "expression.07-candle", position: [7.5, 1.95, 4], rotationY: -1.1, scale: 0.9, role: "static", note: "candle on the right bench, flame kept lit" },
    { id: "landmark.pool-fountain", position: [9, 0.7, -1], scale: 1.3, role: "static", footprint: "round", note: "fountain in the pool" },
    { id: "nature.blossom-tree-b", position: [-11, 0.7, 6], rotationY: 0.2, scale: 1.05, tint: "#c9a6e0", role: "static", contact: [7, 5.5], note: "lavender tree, front left" },
    { id: "nature.blossom-tree-c", position: [11.5, 0.7, 5], rotationY: -0.5, scale: 1.1, role: "static", contact: [6.5, 5], note: "pink tree, front right" },
    person("people.father", -3.2, 3.5, 0.4, 0.7, "waving beside the left stair"),
    person("people.mother", 3.2, 3.5, -0.4, 0.7, "beside the right stair"),
    person("people.teenager", 2.6, -1.2, 0.2, 2.3, "on level two"),
    person("people.grandfather", -3.2, -2.2, -0.3, 2.3, "on level two"),
  ];
  // Railing along the level two rim (radius 7.2 about (0, -5), between the two stairs) and
  // the level three rim (radius 3.5 about (0, -8), either side of the upper stair).
  for (const b of [-40, -24, -8, 8, 24, 40]) {
    const a = degrees(b);
    placements.push({ id: "landmark.filigree-railing", position: [Math.sin(a) * 7.2, 2.3, -5 + Math.cos(a) * 7.2], rotationY: a, role: "static", note: "level two railing" });
  }
  for (const b of [-78, -45, 45, 78]) {
    const a = degrees(b);
    placements.push({ id: "landmark.filigree-railing", position: [Math.sin(a) * 3.5, 3.9, -8 + Math.cos(a) * 3.5], rotationY: a, role: "static", note: "level three railing" });
  }
  // Nine steles, one per expression, level one crescent then level two rim, left to right.
  const steles: Array<[number, number, number, number]> = [
    [Math.sin(degrees(-75)) * 10.6, 0.7, Math.cos(degrees(-75)) * 10.6, degrees(38)],
    [Math.sin(degrees(-45)) * 10.6, 0.7, Math.cos(degrees(-45)) * 10.6, degrees(22)],
    [Math.sin(degrees(-15)) * 10.6, 0.7, Math.cos(degrees(-15)) * 10.6, degrees(8)],
    [Math.sin(degrees(15)) * 10.6, 0.7, Math.cos(degrees(15)) * 10.6, degrees(-8)],
    [Math.sin(degrees(45)) * 10.6, 0.7, Math.cos(degrees(45)) * 10.6, degrees(-22)],
    [Math.sin(degrees(75)) * 10.6, 0.7, Math.cos(degrees(75)) * 10.6, degrees(-38)],
    [-6, 2.3, -3.5, degrees(25)], [0, 2.3, 1.0, 0], [6, 2.3, -3.5, degrees(-25)],
  ];
  steles.forEach(([x, y, z, yaw], k) => placements.push({ id: "landmark.stone-tablet", position: [x, y, z], rotationY: yaw, scale: 1.15, role: "static", icon: k + 1, note: `stele ${k + 1} of 9, expression ${k + 1}` }));
  const roses: Array<[number, number, number, number]> = [[9.8, 6.5, 1.3, 0.3], [-9.8, 6.5, 1.3, 1.5], [11, 3, 1.3, 2.6], [-11, 3, 1.3, 0.9], [7, 9, 1.2, 2.1], [-7, 9, 1.2, 0.6], [4.5, 10.5, 1.1, 1.8], [-4.5, 10.5, 1.1, 2.9]];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[11.4, -4.5, 1.2, 0.4], [-11.2, -1, 1.3, 1.9], [-9, -6, 1.2, 2.7], [10, -7, 1.2, 0.8]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return {
    zone: "practice",
    placements,
    platforms: [{ center: [0, 0.7, -5], radius: 7.2, height: 1.6 }, { center: [0, 2.3, -8], radius: 3.5, height: 1.6 }],
    pools: [{ center: [9, 0.7, -1], radius: 2.6, rim: true }],
    hideFlowers: true,
    removeArchRow: true,
  };
}

/** Builds the near zone tables. Pure: two calls give equal tables. */
export function coreZoneLayouts(): ZoneLayout[] {
  return [welcomeLayout(), gardenLayout(), featuredLayout(), heartLayout(), expressionsLayout(), peacemakersLayout(), practiceLayout()];
}

export const CORE_ZONE_LAYOUTS: readonly ZoneLayout[] = coreZoneLayouts();
