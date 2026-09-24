/** The corridor tables: bridges, flights, sky lanes, islets, posts and clouds, pure data proven in tests/world/kit-layout-far.test.ts (overview in kit-corridors.ts). */
import * as T from "three";
import { TOUR_ORDER, ZONES, type ZoneId } from "../world-data";

export type KitCorridorSite = { center: readonly [number, number, number]; radius: number };
export type V3 = [number, number, number];

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
 * puffs at flight height, 9 to 13 units to the side of the flight line and their tops just
 * above it (scale 1.6 to 2.4, radius 4.8 to 7.2, dropped 2 to 3), so the camera passes
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
export const SOFT_CLOUD = { opacity: .5, centreClearance: 6, solidGap: 1, spacing: 9 } as const;
/** TV page only: the sky lane clouds' opacity in the clear air (the material, never the table). */
export const TV_SOFT_CLOUD_OPACITY = .25;
export const SKY_LANES: readonly SkyLane[] = [
  {
    from: "practice", to: "calendar",
    clouds: [
      { t: .125, side: -13, drop: 2, scale: 1.6 },
      { t: .185, side: -13, drop: 2, scale: 1.6 },
      { t: .735, side: 13, drop: 2, scale: 1.6 },
      { t: .79, side: 9, drop: 2, scale: 1.6 },
      { t: .95, side: 10, drop: 2, scale: 1.6 },
      { t: .96, side: -13, drop: 2, scale: 1.6 },
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
      { t: .17, side: 9, drop: 2, scale: 1.6 },
      { t: .585, side: 13, drop: 2, scale: 1.6 },
      { t: .59, side: -13, drop: 2, scale: 1.6 },
      { t: .63, side: 12, drop: 2, scale: 1.6 },
      { t: .635, side: -13, drop: 2, scale: 1.6 },
      { t: .675, side: 11.5, drop: 2, scale: 1.6 },
      { t: .68, side: -13, drop: 2, scale: 1.6 },
      { t: .72, side: 11, drop: 2, scale: 1.6 },
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
