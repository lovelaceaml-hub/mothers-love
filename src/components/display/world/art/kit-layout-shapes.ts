import type { ZoneId } from "../world-data";

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

/**
 * The kit stair as delivered, kit units: a curved fan 2.2 wide at the foot, climbing toward
 * -z from y 0 to its top landing at y 1.0 (the landing spans z -1.76 to 0); the gold rails
 * rise to 1.29 above it. A stair's y scale is `rise / STAIR.tread` so the landing meets the
 * floor it serves.
 */
export const STAIR = { tread: 1.0, landing: 1.76 } as const;

/** The kit arch's authored width and height (its top is where the keystone lantern hangs). */
export const KIT_ARCH = { width: 3.89, height: 5.19 } as const;

/**
 * The horseshoe pavilion as delivered (`landmark.pearl-pavilion-horseshoe`), in kit units,
 * measured from its vertices by .1 bands: a stepped floor drum of radius 3.35 (3.04 at its
 * top) up to .44, six columns of half width .25 (plinths .29 to .9) standing on the floor at
 * radius 2.62 at the manifest's bearings from the open side (85, 123, 161 degrees either
 * way), the capitals from 3.3, the ring beam (underside 4.613, inner radius 2.3, rim 3.04),
 * the glass dome shell narrowing to the apex at 6.803 and the finial to 7.663. `roof` lists
 * the beam and the dome as hollow bands so the layout test measures the residents' clearance
 * from the outside and the medallions' from the inside of the roof as it stands.
 */
export const PAVILION = {
  columnRadius: 2.62,
  columnHalfWidth: 0.25,
  plinthHalfWidth: 0.29,
  plinthTop: 0.9,
  capitalHalfWidth: 0.3,
  floor: 0.44,
  floorRadius: 3.35,
  capitals: 3.3,
  beam: 4.613,
  apex: 6.803,
  top: 7.663,
  columns: [85, 123, 161, 199, 237, 275],
  /** The ring beam and the dome shell as bands `[from, to, inner, outer]`, kit units. */
  roof: [
    [4.1, 4.95, 2.3, 3.04], [4.95, 5.2, 2.84, 3.03], [5.2, 5.5, 2.74, 2.9], [5.5, 5.8, 2.63, 2.86], [5.8, 6.0, 2.35, 2.72],
    [6.0, 6.2, 2.05, 2.47], [6.2, 6.4, 1.66, 2.2], [6.4, 6.6, 1.2, 1.98], [6.6, 6.8, 0, 1.5], [6.8, 7.663, 0, 0.65],
  ],
} as const;

/** The hero pearl's radius and the reach of its medallion ring, world units (design 6.2). */
export const HERO_PEARL = { radius: 4.4, reach: 6.9 } as const;

/** The top of every district's terrace (`design-world.ts`: the third ivory drum's top face). */
export const TERRACE_TOP = 0.68;
/** A kit floor this close above the terrace is an inlay on it, not a step (the pavilion's drum). */
export const INLAY_TOLERANCE = 0.05;

/**
 * The hero pearl's expression medallions as `pearl-skin.ts` moves them and `world-recognitions.ts`
 * places the pearl (the layout test pins every number here to those two files' source): the
 * ring is an ellipse in the pearl's billboard plane, radii in pearl radii, with a wobble toward
 * the camera; each medallion's rim is .205 pearl radii times its size. The pearl's radius is 4.4
 * (1.06 times that on a phone), its centre `target + 3` lifted to at least `.9 + 1.46 r` above
 * the district, with a .22 sway and a .18 bob, and on a phone it sits at side 0.
 */
export const MEDALLION = {
  landscape: { radiusX: 1.36, radiusY: 1.28, size: 1, pearl: 4.4 },
  portrait: { radiusX: 1.06, radiusY: 1.44, size: 0.9, pearl: 4.4 * 1.06 },
  rim: 0.205,
  wobble: [0.09, 0.055],
  guard: [0.9, 1.46],
  sway: 0.22,
  bob: 0.18,
} as const;
export type MedallionLayout = keyof Pick<typeof MEDALLION, "landscape" | "portrait">;
export type Sphere = { center: [number, number, number]; radius: number };
