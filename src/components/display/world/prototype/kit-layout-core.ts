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
 * unrotated district `root` frame or the Sanctuary `arcade` frame.
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
  /** Instanced pieces: a per instance colour, multiplied into the baked vertex colour. */
  tint?: string;
  /** Animated pieces: which clip, scrubbed or looping. */
  clip?: KitPlacementClip;
  /** Which procedural piece this stands in for; the builder removes it only when the kit piece exists. */
  replaces?: "arch" | "landmark";
  /** With `replaces: "arch"`: the index in the district's arch list (or the Sanctuary arcade's). */
  arch?: number;
  frame?: KitPlacementFrame;
  /** Hidden beyond the tier's detail distance from the district centre (design 7.5). */
  detail?: boolean;
  /** A contact shadow of this width and depth on the terrace under the piece. */
  contact?: [number, number];
};
export type KeepOutSphere = { center: [number, number, number]; radius: number };
/** A procedural water disc the builder cuts into the terrace (the Garden's lily pond). */
export type LayoutPool = { center: [number, number, number]; radius: number; rim?: boolean };
/** An animated curve the layout test samples (the Peace Promise ribbon knot, design 6.16). */
export type LayoutCurve = { id: string; point(u: number, t: number): [number, number, number] };
export type ZoneLayout = {
  zone: ZoneId;
  placements: KitPlacement[];
  /** Extra keep out spheres beyond the reading spheres of design 6.2, district frame. */
  keepOut?: KeepOutSphere[];
  pools?: LayoutPool[];
  /** Curves that must never touch each other (proven by the layout test). */
  curves?: LayoutCurve[];
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

/** The entry stage reservation of design 6.2, world space: a cylinder to y 30. */
export const ENTRY_STAGE = { center: [4.138, 0, 19.104] as const, radius: 12, top: 30 };

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

/** Distance from a point to a box, zero inside. */
export function boxDistance(box: KitBox, point: readonly [number, number, number]) {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(box.min[k] - point[k], 0, point[k] - box.max[k]);
    sum += d * d;
  }
  return Math.sqrt(sum);
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

/**
 * Garden of Kindness (design 6.5). The lily pond sits at the island centre under the
 * arriving pearl's landing (world 26, 5, 16 is local 0, 5, 0), its pads on the far side so
 * none stands under the hero pearl's medallion reach; the open lotus floats a little to the
 * pond's far left for the same reason (the pearl still settles over the pond). Bushes stand
 * on the two bed arcs clear of the cotton tree trunks and the procedural flower clusters.
 *
 * The island's back left quarter lies inside the entry stage reservation (6.2: 12 units
 * around the arrival stage, which is 22 units from the Garden centre), so the kit blossom
 * tree the design put beside the cotton trees at (-13.5, .7, 1) stands at the front left
 * corner instead, shading the bench, and the left bed's bushes keep to its front half.
 */
function gardenLayout(): ZoneLayout {
  const pond: [number, number, number] = [-0.6, 0.7, -0.6];
  const placements: KitPlacement[] = [
    ...archRow("garden"),
    { id: "landmark.garden-bench", position: [-9, 0.7, 9], rotationY: 0.5, scale: 1.35, role: "static", note: "bench facing the pearl, under the blossom tree" },
    { id: "landmark.garden-bench", position: [11, 0.7, 10], rotationY: -0.6, scale: 1.35, role: "static" },
    { id: "landmark.lantern-post", position: [-11.5, 0.7, 11.6], scale: 1.15, role: "static", note: "forecourt post, moved in front of the blossom tree so its lamp shows from the tour eye" },
    { id: "landmark.lantern-post", position: [14, 0.7, 5], scale: 1.15, role: "static", note: "forecourt post" },
    { id: "nature.blossom-tree-c", position: [-12.5, 0.7, 9.5], rotationY: 0.4, scale: 1.2, role: "static", contact: [7, 5.5], note: "front left corner, framing the bench (moved out of the entry stage cap)" },
    { id: "nature.stepping-stones", position: [-3.6, 0.7, 13.4], rotationY: 0.45, role: "instanced", detail: true, note: "path from the forecourt" },
    { id: "nature.stepping-stones", position: [-0.9, 0.7, 9.9], rotationY: 0.55, role: "instanced", detail: true, note: "path to the pond" },
    { id: "arrival.lotus-bloom", position: [-1.3, 0.7, -1.3], rotationY: 0.6, scale: 1, role: "animated", clip: { name: "bloom", at: 1 }, note: "open lotus on the pond" },
  ];
  // Lily pads in a horseshoe on the far side of the pond (bearings from +x toward +z).
  for (let k = 0; k < 5; k++) {
    const bearing = (135 + k * 45) * Math.PI / 180;
    placements.push({
      id: "nature.lily-pads",
      position: [pond[0] + Math.cos(bearing) * 4.6, 0.71, pond[2] + Math.sin(bearing) * 4.6],
      rotationY: -bearing + Math.PI / 2 + (k % 2 ? 0.3 : -0.2),
      scale: 1.1,
      role: "instanced",
      detail: true,
      note: `lily pads ${k + 1} of 5`,
    });
  }
  const roses: Array<[number, number, number, number]> = [
    [9.6, 1.2, 1.6, 0.3], [9.6, 6.6, 1.5, 2.1], [12.8, 2.2, 1.4, 1.1],
    [-9.6, 3.0, 1.5, 0.8], [-10.8, 6.0, 1.4, 2.6], [-8.6, -1.2, 1.4, 1.7],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push({
    id: "nature.rose-bush", position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note: `rose bush ${k + 1} of ${roses.length}`,
  }));
  const hydrangeas: Array<[number, number, number, number]> = [
    [11.2, -2.6, 1.4, 0.5], [-7.9, 6.8, 1.3, 0.2], [9.4, -8.2, 1.3, 2.8],
  ];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push({
    id: "nature.hydrangea-bush", position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note: `hydrangea ${k + 1} of ${hydrangeas.length}`,
  }));
  return {
    zone: "garden",
    placements,
    pools: [{ center: pond, radius: 5.6, rim: true }],
  };
}

/** Builds the near zone tables. Pure: two calls give equal tables. */
export function coreZoneLayouts(): ZoneLayout[] {
  return [gardenLayout()];
}

export const CORE_ZONE_LAYOUTS: readonly ZoneLayout[] = coreZoneLayouts();
