import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import { TOUR_ORDER, ZONES, type ZoneId } from "../world-data";
import type { WorldKit } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { studyRim } from "./study-materials";
import type { DesignKitContext, KitBuilderHandle } from "./design-world";
import { applyKitFarZones, farZonesEnabled } from "./kit-far-zones";

/**
 * The corridors between the thirteen districts (WORLD-INTEGRATION 6.17): lantern posts at the
 * bridge ends, islets beside the long bridges, and the sky lanes along the two fast legs.
 *
 * Owned by lane K3b. The tables are pure (no Three.js objects, only its curve maths), so
 * `tests/world/kit-layout-far.test.ts` proves every islet, post and cloud clear of the
 * districts, the arrival stage, every bridge deck and every flight the camera director can
 * make (the tour legs, every ordered zone pair from every point of the reading arc, and the
 * arrival flights to the arrival view and back) without a browser. Two entry points, both
 * called by the design world only with a kit:
 *
 * - `kitCorridorSites(kit)` runs first, before the clouds and the air are built: every islet
 *   the corridors will place, so it gets a cloud collar (`studyCloudLayout` extra sites) and a
 *   share of the drifting petals (`createStudyAir` centres) like every island.
 * - `applyKitCorridors(context)` runs with the district builder, before the static batch. It
 *   builds one instanced draw per piece per material world wide, decimated at load (below),
 *   and, unless `?far=off`, hands the six far districts to `applyKitFarZones` (K3b's own
 *   builder for its tables) so the far zones are dressed before the lanes merge.
 */

export type KitCorridorSite = { center: readonly [number, number, number]; radius: number };
type V3 = [number, number, number];

/** A bridge deck exactly as `design-world.ts` builds it: the same tree, insets and raised middle. */
export type CorridorBridge = {
  from: ZoneId;
  to: ZoneId;
  /** Deck control points, world space: the two island edges and the raised, sidestepped middle. */
  start: V3;
  middle: V3;
  end: V3;
  /** Centre to centre distance, the figure design 6.17 lists. */
  length: number;
  /** Over `LONG_BRIDGE` units: it earns an islet beside its middle. */
  long: boolean;
};
export type CorridorIslet = {
  /** The grass top, world space; the cloud collar site and the petal centre. */
  center: V3;
  /** Grass radius (the kit island is radius 4 at scale 1). */
  radius: number;
  scale: number;
  rotationY: number;
  tree: { position: V3; rotationY: number; scale: number };
  /** Which bridge or sky lane placed it. */
  reason: string;
};
export type CorridorPost = { position: V3; rotationY: number; bridge: string };
export type CorridorCloud = { position: V3; rotationY: number; scale: number; lane: string };
export type SkyLane = {
  from: ZoneId;
  to: ZoneId;
  /**
   * Fraction along the flight, a signed distance to the side of the flight line in xz (positive
   * to the flight's right), and a drop below the flight line at that station.
   */
  clouds: Array<{ t: number; side: number; drop: number; scale: number }>;
  /** Placed by hand beside the flight line (20 to 40 units off it in xz), world space grass top. */
  islets: Array<{ center: V3; scale: number }>;
};

/** Bridges longer than this get an islet (design 6.17 names eight; 52.4 unit heart to featured is not among them). */
export const LONG_BRIDGE = 53.5;
export const ISLET_SIDE_OFFSET = 22;
export const ISLET_BELOW_DECK = 4;
/**
 * Design 6.17 says 2.6, but the deck is 4.3 wide with its rails at 2.15, so a post there would
 * hang in the air beside the rail; 1.8 stands it on the deck just inside the rail.
 */
export const POST_SIDE_OFFSET = 1.8;
/** The kit island's grass sits about 2.5 above its centre pivot; its grass radius is 4. */
export const KIT_ISLAND = { grassAbovePivot: 2.5, grassRadius: 4 } as const;
/**
 * Corridor pieces are drawn only inside these distances from the camera (a post is small, an
 * islet is not), under the tier's kit detail distance of design 7.2. On the Low tier the sky
 * lane clouds hide and the islets stop at 90 units (design 7.6).
 */
export const POST_VIEW_DISTANCE = 96;
export const ISLET_VIEW_DISTANCE = 150;
export const CLOUD_VIEW_DISTANCE = 170;
export const LOW_TIER_VIEW = { post: 70, islet: 90, cloud: 0 } as const;
/** An islet or its tree nearer than this uses its finer geometry; beyond it, the far level. */
export const LOD_NEAR = 80;
/**
 * A piece whose sphere lies this far outside the view is still drawn, so the frustum's sweep
 * between two recounts (two units of travel or two degrees of turn) never pops one in at the edge.
 */
export const FRUSTUM_MARGIN = 12;
/**
 * The share of each piece's vertices its instanced geometry keeps (see `decimatedKitGeometry`):
 * one level for the posts and clouds, a near and a far level for the islets and their trees.
 */
export const CORRIDOR_KEEP = { post: .18, islet: [.3, .1], tree: [.25, .1], cloud: .3 } as const;

const zone = (id: ZoneId) => ZONES.find(item => item.id === id)!;
const round = (value: number) => Math.round(value * 1000) / 1000;
const v3 = (v: T.Vector3): V3 => [round(v.x), round(v.y), round(v.z)];

/** The world's centre of mass in xz; an islet sits on the side of its bridge that faces away from it. */
export const WORLD_CENTRE: [number, number] = [
  round(ZONES.reduce((sum, item) => sum + item.center[0], 0) / ZONES.length),
  round(ZONES.reduce((sum, item) => sum + item.center[2], 0) / ZONES.length),
];

/** The thirteen bridges, recomputed the way the design world builds them. */
export function corridorBridges(): CorridorBridge[] {
  const connections: Array<[ZoneId, ZoneId]> = [["garden", "heart"], ["heart", "expressions"], ["garden", "expressions"]];
  const connected = new Set<ZoneId>(["garden", "heart", "expressions"]);
  while (connected.size < ZONES.length) {
    let best: [ZoneId, ZoneId] | undefined, distance = Infinity;
    for (const from of ZONES.filter(item => connected.has(item.id))) for (const to of ZONES.filter(item => !connected.has(item.id))) {
      const d = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
      if (d < distance) { distance = d; best = [from.id, to.id]; }
    }
    if (!best) break;
    connections.push(best); connected.add(best[1]);
  }
  return connections.map(([fromId, toId], i) => {
    const from = zone(fromId), to = zone(toId);
    const a = new T.Vector3(...from.center).add(new T.Vector3(0, .6, 0)), b = new T.Vector3(...to.center).add(new T.Vector3(0, .6, 0));
    const direction = b.clone().sub(a); direction.y = 0; direction.normalize();
    a.addScaledVector(direction, ZONES.indexOf(from) < 3 ? 16.2 : 12.2);
    b.addScaledVector(direction, ZONES.indexOf(to) < 3 ? -16.2 : -12.2);
    const mid = a.clone().lerp(b, .5); mid.y += 2.4; mid.x += (i % 2 ? 1 : -1) * 4;
    const length = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
    return { from: fromId, to: toId, start: v3(a), middle: v3(mid), end: v3(b), length: round(length), long: length > LONG_BRIDGE };
  });
}

/** The deck centre line of a bridge, the curve the design world extrudes the deck along. */
export function bridgeCurve(bridge: CorridorBridge) {
  return new T.CatmullRomCurve3([new T.Vector3(...bridge.start), new T.Vector3(...bridge.middle), new T.Vector3(...bridge.end)]);
}

/** The thirteen tour legs, eye to eye in `TOUR_ORDER`, closing back to the first stop. */
export function tourLegs(): Array<{ from: ZoneId; to: ZoneId }> {
  return TOUR_ORDER.map((from, i) => ({ from, to: TOUR_ORDER[(i + 1) % TOUR_ORDER.length] }));
}

/**
 * The curve `CameraDirector.move` flies between any two points: a centripetal spline through
 * the start, a middle raised 7 above the higher end, and the end. Every travel the director
 * makes is one of these, whether a tour leg, a zone button press from wherever the camera is
 * parked (or mid flight), an arrival flight to `ARRIVAL_VIEW.eye`, or the return from it.
 */
export function flightBetween(start: readonly [number, number, number], end: readonly [number, number, number]) {
  const a = new T.Vector3(...start), b = new T.Vector3(...end);
  const middle = a.clone().lerp(b, .5);
  middle.y = Math.max(a.y, b.y) + 7;
  return new T.CatmullRomCurve3([a, middle, b], false, "centripetal");
}

/**
 * The parked camera at one point of its reading arc (camera-director.ts line 209): the eye
 * swung `angle` about the zone target, pushed in or out by `approach`, lifted by `bob`.
 */
export function readingArcEye(id: ZoneId, angle: number, approach = 1, bob = 0): V3 {
  const z = zone(id), dx = z.eye[0] - z.target[0], dz = z.eye[2] - z.target[2];
  return [
    z.target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach,
    z.eye[1] + bob,
    z.target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach,
  ];
}

/**
 * The camera's travel curve for a leg from the authored eyes. `startAngle` swings the start
 * eye about its target the way the reading arc does, so the corridor can be sampled from every
 * departure the director can make (up to 27.5 degrees).
 */
export function flightCurve(from: ZoneId, to: ZoneId, startAngle = 0) {
  return flightBetween(readingArcEye(from, startAngle), zone(to).eye);
}

/**
 * The two fast legs (149 and 197 units in 18 s) get a sky lane of sculpted `nature.cloud-c`
 * puffs at flight height, 9 to 13 units to the side of the flight line and their tops 1 to 3
 * units above it (scale 1.6 to 2.4, radius 4.8 to 7.2, dropped 4 to 5), so the camera passes
 * through cloud tops (design 6.17) rather than over pink smears 14 to 48 units below it, which
 * is what the first stations (kept 6 units clear of every flight in the world) read as.
 *
 * Sky lane clouds are soft: `SOFT_CLOUD` draws them at half opacity without depth writes, so
 * a flight that brushes one sees a pink wash for a moment and never a wall. That buys them
 * one relaxation of the keep out rule (6.2), decided by K3b after the director's note 3 and
 * stated here for the coordinator: a soft cloud keeps its CENTRE 6 units from the 13 tour
 * legs (from every departure) and from every arrival and return flight, keeps its whole
 * sphere clear of the districts, the arrival stage, the far landmarks, the islets and the
 * lantern posts, may hang over a bridge deck, and is exempt from the zone button pair flights,
 * which criss cross the middle of the world so densely that nothing at flight height clears
 * them (the round three tables proved that: every station within 6 of some pair flight).
 * Every station below came from a search over t, side, drop and scale under those rules
 * (`tests/world/kit-layout-far.test.ts` proves them), on the terrace to calendar leg six
 * puffs, on the fountain leg eight along the long descent.
 */
export const SOFT_CLOUD = { opacity: .5, centreClearance: 6, solidGap: 1, spacing: 16 } as const;
export const SKY_LANES: readonly SkyLane[] = [
  {
    from: "practice", to: "calendar",
    clouds: [
      { t: .12, side: -10, drop: 5, scale: 2.2 },
      { t: .4, side: 13, drop: 5, scale: 1.8 },
      { t: .72, side: 13, drop: 5, scale: 2 },
      { t: .76, side: -12, drop: 5, scale: 2 },
      { t: .92, side: 9, drop: 5, scale: 1.6 },
      { t: .94, side: -13, drop: 5, scale: 1.8 },
    ],
    // Two, not the design's three: the third's natural place, south of the leg's east half, is
    // already taken by the islet beside the Garden to Grove bridge, which the flight passes.
    // Both stand where the Pavilion's, the Sanctuary's and the Garden's cameras never fly.
    islets: [
      { center: [-16, -.6, 38], scale: 1.3 },
      { center: [11, .2, 44], scale: 1.2 },
    ],
  },
  {
    from: "milestone", to: "live-feed",
    clouds: [
      { t: .12, side: 12, drop: 5, scale: 2.4 },
      { t: .46, side: 13, drop: 5, scale: 2.4 },
      { t: .58, side: -13, drop: 5, scale: 2.4 },
      { t: .64, side: 13, drop: 5, scale: 2.4 },
      { t: .66, side: -13, drop: 5, scale: 2.4 },
      { t: .72, side: 13, drop: 4, scale: 2.4 },
      { t: .74, side: -13, drop: 4, scale: 2.4 },
      { t: .8, side: 13, drop: 5, scale: 2.4 },
    ],
    islets: [
      { center: [44.6, -.4, -38.5], scale: 1.3 },
      { center: [85.7, .1, 18.4], scale: 1.25 },
    ],
  },
];

/**
 * Where a long bridge's islet stands: `along` is the fraction of the deck (the middle by
 * default), `side` its distance off the deck centre line (`ISLET_SIDE_OFFSET` by default),
 * `flip` swaps the side. The side is away from the world's centre, except the Garden to
 * Sanctuary bridge, whose outer side is the arrival stage's reserved cylinder; its islet sits in
 * the lagoon between the three first districts instead. Two islets leave the middle: the Grove
 * camera's reading arc parks over the middle of the Garden to Grove bridge and the Garden
 * camera's over the middle of the Garden to River bridge, so those islets stand nearer the
 * Garden end and a little farther out, where every flight clears them by 6 units.
 */
export const ISLET_STATIONS: Readonly<Partial<Record<string, { along?: number; side?: number; flip?: boolean }>>> = {
  "garden>heart": { flip: true },
  "garden>expressions": { along: .2, side: 26 },
  "garden>live-feed": { along: .55, side: 26 },
};

/**
 * Two bridge ends carry no lantern posts: a neighbouring zone's parked camera swings over each
 * on its reading arc (the terrace camera over the Pavilion end of the Pavilion to terrace
 * bridge, the Pavilion camera over the Promise end of the Pavilion to Promise bridge), within
 * 5.6 and 5 units of a post's top, and no station along that deck clears the arc by the 6
 * units every flight must keep until the deck's middle. The rail lanterns light those ends.
 */
export const POST_FREE_ENDS: Readonly<Partial<Record<string, "start" | "end">>> = {
  "featured>practice": "start",
  "featured>promise": "end",
};

function laneKey(lane: { from: ZoneId; to: ZoneId }) { return `${lane.from}>${lane.to}`; }

/** Every islet: one beside each long bridge, plus the sky lane islets. Pure and deterministic. */
export function corridorIslets(): CorridorIslet[] {
  const islets: CorridorIslet[] = [];
  const point = new T.Vector3(), tangent = new T.Vector3();
  corridorBridges().forEach((bridge, i) => {
    if (!bridge.long) return;
    const station = ISLET_STATIONS[laneKey(bridge)] ?? {};
    const curve = bridgeCurve(bridge);
    curve.getPoint(station.along ?? .5, point); curve.getTangent(station.along ?? .5, tangent);
    const side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
    const away = Math.sign(side.x * (point.x - WORLD_CENTRE[0]) + side.z * (point.z - WORLD_CENTRE[1])) || 1;
    side.multiplyScalar(away * (station.flip ? -1 : 1) * (station.side ?? ISLET_SIDE_OFFSET));
    const scale = 1.5;
    const center: V3 = [round(point.x + side.x), round(point.y - ISLET_BELOW_DECK), round(point.z + side.z)];
    islets.push({
      center, radius: KIT_ISLAND.grassRadius * scale, scale, rotationY: round((i * 2.399) % (Math.PI * 2)),
      tree: { position: [round(center[0] + 1.2), center[1], round(center[2] - .8)], rotationY: round((i * 1.7) % (Math.PI * 2)), scale: 1.15 },
      reason: `bridge ${laneKey(bridge)}`,
    });
  });
  SKY_LANES.forEach((lane, l) => {
    lane.islets.forEach((spec, i) => {
      const center: V3 = spec.center;
      islets.push({
        center, radius: KIT_ISLAND.grassRadius * spec.scale, scale: spec.scale, rotationY: round(((l * 3 + i) * 1.9) % (Math.PI * 2)),
        tree: { position: [round(center[0] - 1), center[1], round(center[2] + .9)], rotationY: round(((l * 3 + i) * 2.3) % (Math.PI * 2)), scale: 1.1 },
        reason: `sky lane ${laneKey(lane)}`,
      });
    });
  });
  return islets;
}

/** Two lantern posts at each end of every bridge (`POST_FREE_ENDS` aside), on the deck just inside the rail. */
export function corridorPosts(): CorridorPost[] {
  const posts: CorridorPost[] = [];
  const point = new T.Vector3(), tangent = new T.Vector3();
  for (const bridge of corridorBridges()) {
    const curve = bridgeCurve(bridge);
    const free = POST_FREE_ENDS[laneKey(bridge)];
    for (const t of [.03, .97]) {
      if ((t < .5 && free === "start") || (t > .5 && free === "end")) continue;
      curve.getPoint(t, point); curve.getTangent(t, tangent);
      const side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
      const yaw = Math.atan2(tangent.x, tangent.z);
      for (const sign of [-1, 1]) posts.push({ position: [round(point.x + side.x * POST_SIDE_OFFSET * sign), round(point.y + .02), round(point.z + side.z * POST_SIDE_OFFSET * sign)], rotationY: round(yaw), bridge: laneKey(bridge) });
    }
  }
  return posts;
}

/** A sky lane cloud's place, world space: the station on the leg's flight line, off to the side, dropped. */
export function skyLaneStation(lane: SkyLane, spec: SkyLane["clouds"][number]): V3 {
  const curve = flightCurve(lane.from, lane.to);
  const point = curve.getPoint(spec.t), tangent = curve.getTangent(spec.t);
  const side = new T.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(spec.side);
  return [round(point.x + side.x), round(point.y - spec.drop), round(point.z + side.z)];
}

/** The sky lane clouds, world space. */
export function corridorClouds(): CorridorCloud[] {
  const clouds: CorridorCloud[] = [];
  SKY_LANES.forEach((lane, l) => {
    lane.clouds.forEach((spec, i) => {
      clouds.push({ position: skyLaneStation(lane, spec), rotationY: round(((l * 7 + i) * 1.3) % (Math.PI * 2)), scale: spec.scale, lane: laneKey(lane) });
    });
  });
  return clouds;
}

/** The islets, as cloud collar sites, when the kit can place them at all. */
export function kitCorridorSites(kit: Pick<WorldKit, "has">): KitCorridorSite[] {
  if (!kit.has("nature.island-small")) return [];
  return corridorIslets().map(islet => ({ center: islet.center, radius: islet.radius }));
}

/* ------------------------------------------------------------------------------------------ */
/* The builder                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/**
 * A cheaper copy of a kit geometry for instancing dozens of times: each material group is
 * merged by position and reduced by edge collapse (three's `SimplifyModifier`, Melax 1998) to
 * `keep` of its vertices, then the groups are merged back in order so the material array still
 * applies. The W3 v2 nature files carry 7,000 to 14,000 triangles each, far more than a piece
 * seen from the travel altitude needs, and 52 posts or 13 islets at full detail would spend the
 * whole kit's triangle budget (design 7.2) on the corridors alone. A group too small to reduce,
 * or one the modifier cannot process, is kept as it is. Registered with the context, so the
 * world's `dispose()` releases it; the kit's own cached geometry is untouched.
 */
export function decimatedKitGeometry(kit: WorldKit, id: KitAssetId, keep: number, register: <G extends T.BufferGeometry>(g: G) => G): T.BufferGeometry {
  const source = kit.geometry(id);
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const groups = flat.groups.length ? flat.groups : [{ start: 0, count: flat.getAttribute("position").count, materialIndex: 0 }];
  const parts: T.BufferGeometry[] = [];
  for (const group of groups) {
    const part = new T.BufferGeometry();
    const positions = flat.getAttribute("position");
    part.setAttribute("position", new T.BufferAttribute((positions.array as Float32Array).slice(group.start * 3, (group.start + group.count) * 3), 3));
    let reduced: T.BufferGeometry;
    try {
      const merged = mergeVertices(part, 1e-4);
      const unique = merged.getAttribute("position").count;
      const remove = Math.floor(unique * (1 - keep));
      reduced = unique > 60 && remove > 0 ? new SimplifyModifier().modify(merged, remove) : merged;
      if (reduced !== merged) merged.dispose();
      if (!reduced.getAttribute("position") || reduced.getAttribute("position").count < 3) { reduced.dispose(); reduced = part; }
    } catch {
      reduced = part;
    }
    const plain = reduced.index ? reduced.toNonIndexed() : reduced;
    if (plain !== reduced) reduced.dispose();
    plain.deleteAttribute("normal"); plain.deleteAttribute("uv");
    plain.computeVertexNormals();
    parts.push(plain);
    if (plain !== part) part.dispose();
  }
  if (flat !== source) flat.dispose();
  const result = mergeGeometries(parts, true) ?? parts[0];
  parts.forEach(part => { if (part !== result) part.dispose(); });
  result.groups.forEach((group, index) => { group.materialIndex = groups[index]?.materialIndex ?? index; });
  result.userData.kitMaterials = source.userData.kitMaterials;
  result.userData.kitId = id;
  result.computeBoundingSphere();
  return register(result);
}

/** The imported materials of a kit template by name, for the roles the remap keeps. */
function importedMaterials(kit: WorldKit, id: KitAssetId) {
  const byName = new Map<string, T.Material>();
  kit.asset(id)?.template.traverse(object => {
    const mesh = object as T.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!byName.has(material.name)) byName.set(material.name, material);
  });
  return byName;
}

type CorridorPalette = { ivory: T.Material; gold: T.Material; lawn: T.Material; stone: T.Material; roseGold: T.Material; blossom: T.Material; cloud: T.Material };

/**
 * Corridor pieces map onto the study's shared materials by the word their exported name ends
 * in: grass becomes the lawn, rock the carved stone, bark the rose gold trunks, blossom and
 * petal the corridor blossom pink, gold the gold, pearl the ivory, cotton the cloud material.
 * Anything else (the lantern's emissive glow) keeps the material the file brought. A piece may
 * pass `overrides` by the same last word, which win: the islet's own cap, rock and bush.
 */
export function corridorMaterialFor(name: string, palette: CorridorPalette, imported: T.Material | undefined, overrides: Partial<Record<string, T.Material>> = {}) {
  const word = name.toLowerCase().split(/[^a-z]+/).filter(Boolean).pop() ?? "";
  const table: Record<string, T.Material> = {
    grass: palette.lawn, lawn: palette.lawn, rock: palette.stone, stone: palette.stone, bark: palette.roseGold,
    blossom: palette.blossom, petal: palette.blossom, gold: palette.gold, pearl: palette.ivory, cotton: palette.cloud,
  };
  return overrides[word] ?? table[word] ?? imported ?? palette.ivory;
}

/**
 * The islet's own colours (director's note 2 on round three: the kit island read as another
 * game's asset beside the pearl saucers). Its cap takes the district lawn, its faceted
 * bushes the bed rose pink with a soft sheen so they read as bushes and not crystal, and its
 * rock the pearl saucer pink of the district keels: the study stone shader takes that pink
 * from the lathe's local depth, which the kit island's own coordinates never reach, so the
 * rock carries it as a plain colour instead.
 */
export const ISLET_COLOURS = { cap: "#c9dfb5", bush: "#e7a3c0", rock: "#ecc4bf", rim: "gold" } as const;

const dummy = new T.Object3D();

export function applyKitCorridors(context: DesignKitContext): KitBuilderHandle | void {
  const { kit, scene } = context;
  const meshes: T.InstancedMesh[] = [];
  const palette: CorridorPalette = {
    ivory: context.palette.ivory, gold: context.palette.gold, lawn: context.palette.lawn, stone: context.palette.stone, roseGold: context.palette.roseGold,
    blossom: context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f0a8b8", roughness: .52, sheen: .8, sheenColor: new T.Color("#ffe4ec"), sheenRoughness: .5, dithering: true }), "#fff0e0", 2.2, .3)),
    cloud: context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f8dde6", roughness: .96, sheen: 1, sheenColor: new T.Color("#fff6f8"), sheenRoughness: .7, dithering: true }), "#fff4ea", 2.2, .34)),
  };
  palette.blossom.name = "corridor blossom"; palette.cloud.name = "corridor cloud";
  // Sky lane clouds are soft (SOFT_CLOUD): the camera may brush them, so they draw at half
  // opacity without writing depth; the rim is kept, the sheen softened.
  const softCloud = context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f8dde6", roughness: .96, sheen: 1, sheenColor: new T.Color("#fff6f8"), sheenRoughness: .7, dithering: true, transparent: true, opacity: SOFT_CLOUD.opacity, depthWrite: false }), "#fff4ea", 2.2, .34));
  softCloud.name = "corridor soft cloud";
  const islet: Partial<Record<string, T.Material>> = {
    grass: context.material(new T.MeshStandardMaterial({ color: ISLET_COLOURS.cap, roughness: .92, metalness: 0, dithering: true })),
    petal: context.material(new T.MeshPhysicalMaterial({ color: ISLET_COLOURS.bush, roughness: .7, sheen: .5, sheenColor: new T.Color("#ffe0ea"), sheenRoughness: .6, dithering: true })),
    rock: context.material(studyRim(new T.MeshStandardMaterial({ color: ISLET_COLOURS.rock, roughness: .86, dithering: true }), "#ffe1cf", 3, .25)),
  };
  islet.grass!.name = "islet cap"; islet.petal!.name = "islet bush"; islet.rock!.name = "islet rock";

  function instanced(id: KitAssetId, keep: number, name: string, count: number, shadow: boolean, overrides: Partial<Record<string, T.Material>> = {}) {
    const geometry = decimatedKitGeometry(kit, id, keep, context.geometry);
    const imported = importedMaterials(kit, id);
    const names = (geometry.userData.kitMaterials as string[] | undefined) ?? [];
    const materials = names.length ? names.map(material => corridorMaterialFor(material, palette, imported.get(material), overrides)) : [palette.ivory];
    const mesh = new T.InstancedMesh(geometry, materials.length === 1 ? materials[0] : materials, count);
    mesh.name = name;
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    // Never merged by the static batch: it is instanced, and it keeps its own matrices.
    mesh.userData.dynamic = true;
    meshes.push(mesh); scene.add(mesh);
    return mesh;
  }
  function placeAt(mesh: T.InstancedMesh, i: number, position: V3, rotationY: number, scale: number) {
    dummy.position.set(position[0], position[1], position[2]);
    dummy.rotation.set(0, rotationY, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  function finish(mesh: T.InstancedMesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  /**
   * One piece world wide: an instanced mesh per level of detail and the table of its places.
   * An instanced mesh has one bounding sphere for all its instances, so left alone every islet
   * in the world is drawn whenever any of them is on screen. Each recount therefore keeps only
   * the places inside `range` of the camera whose own sphere, widened by `FRUSTUM_MARGIN`,
   * meets the view frustum; of those, the ones nearer than `LOD_NEAR` fill the near mesh and
   * the rest the far mesh when the piece has one. `count` cuts the others, and a mesh whose
   * count is 0 costs no draw. The meshes never rely on three's own frustum test, which would
   * see only the sphere of the instances currently placed.
   */
  type Piece = { position: V3; rotationY: number; scale: number };
  type Culled = { near: T.InstancedMesh; far?: T.InstancedMesh; places: Piece[]; radius: number; centerY: number; range: (low: boolean) => number };
  const culled: Culled[] = [];
  function cullable(near: T.InstancedMesh, far: T.InstancedMesh | undefined, range: (low: boolean) => number, places: Piece[]) {
    // Until the first recount (which the first frame with a camera makes) everything is placed
    // in the near mesh, so a world without a published camera is complete.
    places.forEach((place, i) => placeAt(near, i, place.position, place.rotationY, place.scale));
    finish(near);
    near.frustumCulled = false;
    if (far) { far.count = 0; far.frustumCulled = false; }
    const sphere = near.geometry.boundingSphere ?? new T.Sphere(new T.Vector3(), 1);
    culled.push({ near, far, places, radius: sphere.radius, centerY: sphere.center.y, range });
  }

  // Lantern posts: four per bridge.
  const postTable = corridorPosts();
  if (kit.has("landmark.lantern-post") && postTable.length) {
    cullable(instanced("landmark.lantern-post", CORRIDOR_KEEP.post, "Kit corridor lantern posts", postTable.length, false), undefined,
      low => (low ? LOW_TIER_VIEW.post : POST_VIEW_DISTANCE),
      postTable.map(post => ({ position: post.position, rotationY: post.rotationY, scale: 1.1 })));
  }

  // Islets beside the long bridges and along the sky lanes, each with a blossom tree. The far
  // level keeps a tenth of the surface and casts no shadow: past 80 units its shadow is a speck.
  const islets = corridorIslets();
  if (kit.has("nature.island-small") && islets.length) {
    cullable(
      instanced("nature.island-small", CORRIDOR_KEEP.islet[0], "Kit corridor islets", islets.length, true, islet),
      instanced("nature.island-small", CORRIDOR_KEEP.islet[1], "Kit corridor islets, far", islets.length, false, islet),
      low => (low ? LOW_TIER_VIEW.islet : ISLET_VIEW_DISTANCE),
      islets.map(islet => ({ position: [islet.center[0], islet.center[1] - KIT_ISLAND.grassAbovePivot * islet.scale, islet.center[2]] as V3, rotationY: islet.rotationY, scale: islet.scale })));
    // A gold rim at every islet's grass edge, like the terrace rings: one torus, one draw.
    const rimGeometry = context.geometry(new T.TorusGeometry(1, .014, 6, 72));
    rimGeometry.rotateX(-Math.PI / 2);
    const rim = new T.InstancedMesh(rimGeometry, palette.gold, islets.length);
    rim.name = "Kit corridor islet rims"; rim.userData.dynamic = true; rim.receiveShadow = false; rim.layers.enable(1);
    meshes.push(rim); scene.add(rim);
    cullable(rim, undefined, low => (low ? LOW_TIER_VIEW.islet : ISLET_VIEW_DISTANCE),
      islets.map(islet => ({ position: [islet.center[0], islet.center[1] - .05, islet.center[2]] as V3, rotationY: 0, scale: KIT_ISLAND.grassRadius * islet.scale })));
    if (kit.has("nature.blossom-tree-a")) {
      cullable(
        instanced("nature.blossom-tree-a", CORRIDOR_KEEP.tree[0], "Kit corridor islet trees", islets.length, true),
        instanced("nature.blossom-tree-a", CORRIDOR_KEEP.tree[1], "Kit corridor islet trees, far", islets.length, false),
        low => (low ? LOW_TIER_VIEW.islet : ISLET_VIEW_DISTANCE),
        islets.map(islet => ({ position: islet.tree.position, rotationY: islet.tree.rotationY, scale: islet.tree.scale })));
    }
  }

  // The sky lane clouds: soft sculpted puffs the camera passes through the tops of on the two
  // long legs. They keep more of their surface than the posts, because the camera comes
  // within a few units.
  const clouds = corridorClouds();
  if (kit.has("nature.cloud-c") && clouds.length) {
    cullable(instanced("nature.cloud-c", CORRIDOR_KEEP.cloud, "Kit corridor sky lane clouds", clouds.length, false, { cotton: softCloud }), undefined,
      low => (low ? LOW_TIER_VIEW.cloud : CLOUD_VIEW_DISTANCE),
      clouds.map(cloud => ({ position: cloud.position, rotationY: cloud.rotationY, scale: cloud.scale })));
  }

  // A recount happens when the camera has moved two units or turned two degrees, or the tier
  // changed. A still frame after a jump always has, and the engine runs this update after the
  // camera's matrices are final on a still frame, so a capture is the recounted world.
  const lastCamera = new T.Vector3(Number.NaN, 0, 0), lastForward = new T.Vector3(), forward = new T.Vector3();
  let lastLow: boolean | undefined;
  const frustum = new T.Frustum(), projected = new T.Matrix4(), sphere = new T.Sphere();
  function recount(camera: T.Camera, low: boolean) {
    projected.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projected);
    const eye = camera.position;
    for (const piece of culled) {
      const range = piece.range(low);
      let near = 0, far = 0;
      for (const place of piece.places) {
        const distance = Math.hypot(place.position[0] - eye.x, place.position[1] - eye.y, place.position[2] - eye.z);
        if (distance > range) continue;
        sphere.center.set(place.position[0], place.position[1] + piece.centerY * place.scale, place.position[2]);
        sphere.radius = piece.radius * place.scale + FRUSTUM_MARGIN;
        if (!frustum.intersectsSphere(sphere)) continue;
        if (piece.far && distance > LOD_NEAR) placeAt(piece.far, far++, place.position, place.rotationY, place.scale);
        else placeAt(piece.near, near++, place.position, place.rotationY, place.scale);
      }
      piece.near.count = near; piece.near.instanceMatrix.needsUpdate = true;
      if (piece.far) { piece.far.count = far; piece.far.instanceMatrix.needsUpdate = true; }
    }
  }
  // The six far districts (K3b's tables) are dressed here until the coordinator wires the
  // far builder into the design world itself; `?far=off` keeps them procedural for A/B.
  const far = farZonesEnabled(typeof location === "undefined" ? "" : location.search) ? applyKitFarZones(context) : undefined;

  return {
    update(time, zone, arrival) {
      far?.update?.(time, zone, arrival);
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      if (!camera) return;
      const low = scene.userData.lowTier === true;
      camera.getWorldDirection(forward);
      if (low === lastLow && camera.position.distanceToSquared(lastCamera) < 4 && forward.angleTo(lastForward) < .035) return;
      lastCamera.copy(camera.position); lastForward.copy(forward); lastLow = low;
      recount(camera, low);
    },
    setEffects(sparkles, trails) {
      far?.setEffects?.(sparkles, trails);
    },
    dispose() {
      far?.dispose?.();
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); }
      meshes.length = 0;
    },
  };
}
