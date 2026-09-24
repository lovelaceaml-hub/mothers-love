import * as T from "three";
import { RECOGNITION_ZONES, TOUR_ORDER, ZONES, type WorldZone, type ZoneId } from "../world-data";
import { TV_FOV } from "./tv-bubbles";
import { worldHoldSeconds } from "./tv-page";

/*
 * Where the TV page's recognition bubbles live at each of the thirteen places (PLAN-01
 * Section 5, step 5), after Anthony's reviews of 2026-09-24:
 *
 * - "They're just put randomly and cover everything. They aren't even connected to the 3d
 *   world scenes": every bubble now comes from something real in its place. The main bubble
 *   rests in the gold calyx of a stem that rises from a lotus; the flowing bubble buds from a
 *   lotus of its own and rises to rest beside it.
 * - "The bubbles need the actual recognition text showing" and "Recognition bubbles can also
 *   naturally move and flow to show different recognitions at the same scene": both bubbles
 *   show the whole message, and they flow (`tv-flow.ts`): as the camera arrives, the flowing
 *   bubble it saw last time floats away and a new one rises with another recognition.
 * - Anthony's choices: whole message, bigger bubbles; flow through the scene; the camera flies
 *   close to read; all thirteen places.
 *
 * Coordinates are in a district's layout frame, exactly as the design world builds it
 * (`design-world.ts`): origin at the zone centre, turned by `facing` so +z points at the tour
 * eye and +x to its right; y is height above the zone centre.
 */

/** The places whose feature panel shows on the left of the TV page: every place without recognitions. */
export const TV_PANEL_PLACES: readonly ZoneId[] = TOUR_ORDER.filter((id) => !RECOGNITION_ZONES.includes(id));

/** The turn of a district's layout frame, as `design-world.ts` computes it. */
export function districtFacing(zone: Pick<WorldZone, "center" | "eye">) {
  return Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
}
const UP = new T.Vector3(0, 1, 0);
/** A layout frame point in world space. */
export function layoutToWorld(zone: Pick<WorldZone, "center" | "eye">, point: readonly [number, number, number], out = new T.Vector3()) {
  return out.set(point[0], point[1], point[2]).applyAxisAngle(UP, districtFacing(zone)).add(new T.Vector3(...zone.center));
}
/** A world space point in a district's layout frame. */
export function worldToLayout(zone: Pick<WorldZone, "center" | "eye">, point: T.Vector3, out = new T.Vector3()) {
  return out.copy(point).sub(new T.Vector3(...zone.center)).applyAxisAngle(UP, -districtFacing(zone));
}
export const zoneOf = (id: ZoneId) => ZONES.find((zone) => zone.id === id)!;

/*
 * The reading framing (Anthony: "the camera flies close"). The camera glides from the place's
 * tour view to a framing that holds both of the place's bubbles at reading size on a 1920 by
 * 1080 screen: the main bubble on the right, its words (50 of a 1024 face) at 35.6 px, and the
 * flowing bubble on the left, its words at 22 px or more, each clear of the other, of the title,
 * the live badge, the QR card, the ticker and, at a panel place, the feature panel.
 */
export const TV_SCREEN = { width: 1920, height: 1080 } as const;
export const TV_READ = {
  /** The main bubble's diameter on screen, px: its words, 56 of a 1024 face, at 35.5 px. */
  diameter: 650,
  /** Where its centre sits across the screen, NDC (x 1470 px). */
  across: 0.531,
  /**
   * The flowing bubble's resting centre on screen and its largest diameter, px. The same at
   * every place: its rim clears the feature panel of a panel place and the main bubble's
   * expression medallions, so the two bubbles share the right two thirds of the screen and the
   * left third keeps the title, the panel and the QR card.
   */
  flow: { x: 800, y: 580, max: 400 },
} as const;
/**
 * The main bubble's expression medallions ride close round its rim on the TV page: the study
 * skin's ring (1.36 by 1.28 radii, medallions .205) at .85 of its size, on the gold orbit ring,
 * so the outermost medallion reaches 1.335 radii and never touches the flowing bubble.
 */
export const TV_MEDALLION_SCALE = 0.85;
/** The smallest diameter a flowing bubble takes on screen, px. */
export const TV_FLOW_MIN_DIAMETER = 300;

/**
 * On arrival the whole place shows for `TV_FOCUS_DELAY` seconds, then the camera glides in over
 * `TV_FOCUS_IN`, reads, and pulls back out over `TV_FOCUS_OUT`; all three are added to the hold.
 */
export const TV_FOCUS_DELAY = 1.5;
export const TV_FOCUS_IN = 2.2;
export const TV_FOCUS_OUT = 2.2;
/**
 * A TV visit's hold: the message's own hold (step 4) and the camera's glide in and out round it;
 * at the River, long enough for its stream.
 */
export const tvPlaceHold = (message: string, place?: ZoneId) =>
  Math.max(worldHoldSeconds(message) + TV_FOCUS_DELAY + TV_FOCUS_IN + TV_FOCUS_OUT, (place && TV_PLACES[place].stream?.hold) || 0);

export type TvPose = { eye: T.Vector3; target: T.Vector3 };
const scratch = { back: new T.Vector3(), forward: new T.Vector3(), right: new T.Vector3() };

/**
 * The reading pose for a place's main bubble, seen from the side the camera is on now
 * (`from`): the main bubble's centre at `TV_READ.across` and its diameter `TV_READ.diameter`,
 * with a gentle look down whatever the tour camera's height, so the pose never dives or climbs.
 * Allocates nothing.
 */
export function tvReadingPose(
  centre: T.Vector3,
  radius: number,
  from: T.Vector3,
  aspect = 16 / 9,
  out: TvPose = { eye: new T.Vector3(), target: new T.Vector3() },
  fov = TV_FOV,
) {
  const tan = Math.tan((fov * Math.PI) / 360);
  const depth = (radius * TV_SCREEN.height) / (TV_READ.diameter * tan);
  const { back, forward, right } = scratch;
  back.copy(from).sub(centre);
  let flat = Math.hypot(back.x, back.z);
  // Straight above the bubble: read it from the district's own front instead.
  if (flat < 1e-3) { back.set(0, back.y, 1); flat = 1; }
  back.y = Math.max(0.12, Math.min(0.3, back.y / flat)) * flat;
  forward.copy(back).normalize().negate();
  right.copy(forward).cross(UP).normalize();
  // A narrow screen (a phone) centres the bubble instead.
  const lateral = (aspect >= 1.2 ? TV_READ.across : 0) * depth * tan * aspect;
  out.eye.copy(centre).addScaledVector(forward, -depth).addScaledVector(right, -lateral);
  out.target.copy(out.eye).addScaledVector(forward, depth);
  return out;
}

/** A point of a pose's view at NDC (x, y) and `depth` along its forward axis. */
export function tvViewPoint(pose: TvPose, ndcX: number, ndcY: number, depth: number, aspect = 16 / 9, fov = TV_FOV, out = new T.Vector3()) {
  const tan = Math.tan((fov * Math.PI) / 360);
  const forward = new T.Vector3().copy(pose.target).sub(pose.eye).normalize();
  const right = new T.Vector3().copy(forward).cross(UP).normalize();
  const up = new T.Vector3().copy(right).cross(forward).normalize();
  return out.copy(pose.eye).addScaledVector(forward, depth)
    .addScaledVector(right, ndcX * depth * tan * aspect)
    .addScaledVector(up, ndcY * depth * tan);
}

/** How far the camera has glided in to read: 0 in the tour view, 1 in the reading framing. */
export function tvFocusWeight(age: number, hold: number, still: boolean) {
  if (still) return age >= TV_FOCUS_DELAY && age < hold ? 1 : 0;
  const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
  return smooth((age - TV_FOCUS_DELAY) / TV_FOCUS_IN) * (1 - smooth((age - (hold - TV_FOCUS_OUT)) / TV_FOCUS_OUT));
}

/*
 * Each place's two bubble spots, layout frame, chosen with the clearance probe against the
 * real scene (every tree, arch, landmark and kit piece) and the screen layout above.
 */
export type TvPlaceSpots = {
  /** The main bubble's centre; its lotus stands on the terrace below, in a basin. */
  main: readonly [number, number, number];
  /** Where the main bubble's lotus stands, x and z; it rises on a gold stem to the bubble. */
  lotus: readonly [number, number];
  /** How deep the flowing bubble rests, as a share of the main bubble's depth in the reading framing. */
  flowDepth: number;
  /** Where the flowing bubble's lotus stands, x and z; by default the terrace under its resting place. */
  flowLotus?: readonly [number, number];
  /** Lotuses that float on the place's own water (the Garden pond, the River canal), with no basin. */
  onWater?: { main?: boolean; flow?: boolean };
  /**
   * Where the flowing bubbles bud when the place already has its own lotus for them (the
   * Garden's lit lotus on the pond, the River's lotus on the canal), so no second one is built.
   */
  flowBud?: readonly [number, number, number];
  /**
   * The River of Recognitions only (step 6, "a flowing story of kindness"): a new flowing
   * bubble every `every` seconds of the visit, each floating on downstream along the canal
   * (`away`, layout frame), and a visit (`hold`) long enough to read two of them.
   */
  stream?: { every: number; away: readonly [number, number, number]; hold: number };
  /**
   * Which way a leaving bubble drifts as it floats up, layout frame (zero: straight up), where
   * the default, away from the camera, would take it through the place's own architecture: out
   * of the Pearl Pavilion's open front, clear of the grove's floating expression pieces.
   */
  leave?: { main?: readonly [number, number, number]; flow?: readonly [number, number, number] };
};

/** The main bubble's radius in the world (the design's hero pearl, `HERO_PEARL`). */
export const TV_MAIN_RADIUS = 4.4;
/** The terrace top every lotus stands on, and the water a floating lotus rests on. */
export const TV_TERRACE_TOP = 0.68;
export const TV_WATER_TOP = 0.72;
/** A basin's height; its lotus floats on the basin's water. */
export const TV_BASIN = { main: { radius: 1.7, height: 0.5 }, flow: { radius: 1.25, height: 0.42 } } as const;

/*
 * The spots. The probe measured each against the real scene (trees, arches, landmarks, kit
 * pieces, the Sanctuary's ribbons over ten minutes of their sweep) and the tour view's
 * composition (the place's landmark left in view, the screen text clear).
 */
export const TV_PLACES: Readonly<Record<ZoneId, TvPlaceSpots>> = {
  welcome: { main: [6, 9.5, 8], lotus: [6.4, 8.6], flowDepth: 0.8 },
  garden: { main: [6, 7.5, 4], lotus: [6.4, 4.6], flowDepth: 1, flowBud: [-3.5, 2.1, 1.0] },
  featured: { main: [0, 8.5, 4], lotus: [0.4, 4.6], flowDepth: 0.62, leave: { main: [0, 0, 0], flow: [-1, 0, 1] } },
  heart: { main: [8, 10, 13], lotus: [7, 11.5], flowDepth: 0.62 },
  // Low enough that the grove's floating expression pieces (y 11.4) never cross either bubble.
  expressions: { main: [4, 7.5, 0], lotus: [4.4, 0.6], flowDepth: 0.8, leave: { main: [0, 0, 0] } },
  peacemakers: { main: [9.5, 10.5, 4], lotus: [9.9, 4.6], flowDepth: 0.8 },
  practice: { main: [6, 8.5, 8], lotus: [5, 8], flowDepth: 1 },
  calendar: { main: [6, 7.5, 8], lotus: [6.4, 8.6], flowDepth: 0.8 },
  status: { main: [8, 8.5, 6], lotus: [8.4, 6.6], flowDepth: 0.8 },
  orbit: { main: [6, 10.5, 4], lotus: [6.4, 4.6], flowDepth: 0.8 },
  milestone: { main: [8, 13.5, 6], lotus: [8.4, 6.6], flowDepth: 0.8 },
  "live-feed": {
    main: [6, 9.5, 8], lotus: [6.4, 8.2], flowDepth: 0.8, onWater: { main: true }, flowBud: [-3, 1.75, 10],
    stream: { every: 12.5, away: [-1, 0, 0.15], hold: 28 },
  },
  promise: { main: [8, 8.5, 6], lotus: [8.4, 6.6], flowDepth: 0.8 },
};

/**
 * The camera's slow swing round a place on the TV page, in the tour view: narrow. In the
 * reading framing the camera holds still instead, only breathing a quarter unit in and out
 * along its view (`tvReadingFrame`), so the two bubbles never drift into each other.
 */
export const TV_ARC = { swing: 0.1, approach: 0.03 } as const;
export const TV_BREATH = { distance: 0.22, rate: 0.21 } as const;

/** A place's bubbles in world space, derived once from its spots and the reading framing. */
export type TvPlaceWorld = {
  place: ZoneId;
  /** The place's tour eye, the side the reading framing looks from. */
  eye: T.Vector3;
  /** `away`: the way a leaving bubble drifts as it rises, horizontal (zero: straight up). */
  main: { centre: T.Vector3; radius: number; lotus: T.Vector3; away: T.Vector3 };
  flow: { rest: T.Vector3; depth: number; lotus: T.Vector3; away: T.Vector3 };
  /** The reading pose from the place's own tour eye, the arc at rest. */
  pose: TvPose;
};
const worlds = new Map<ZoneId, TvPlaceWorld>();
/** The main bubble's depth in the reading framing. */
export const tvMainDepth = (fov = TV_FOV) => (TV_MAIN_RADIUS * TV_SCREEN.height) / (TV_READ.diameter * Math.tan((fov * Math.PI) / 360));
/** Where a flowing bubble's lotus stands when a place names none: the terrace under its resting place, kept on the island. */
export function tvFlowLotusDefault(place: ZoneId, rest: T.Vector3) {
  const zone = zoneOf(place);
  const local = worldToLayout(zone, rest);
  const reach = Math.hypot(local.x, local.z), keep = districtRadius(place) - 2.2;
  const scale = reach > keep ? keep / reach : 1;
  return [local.x * scale, local.z * scale] as const;
}
/** The island radius the design world gives each district: the first three are the large islands. */
export const districtRadius = (id: ZoneId) => (ZONES.findIndex((zone) => zone.id === id) < 3 ? 17.8 : 13.8);

export function tvPlaceWorld(place: ZoneId): TvPlaceWorld {
  const cached = worlds.get(place);
  if (cached) return cached;
  const zone = zoneOf(place), spots = TV_PLACES[place];
  const centre = layoutToWorld(zone, spots.main);
  const lotusY = (onWater?: boolean) => (onWater ? TV_WATER_TOP : TV_TERRACE_TOP + TV_BASIN.main.height);
  const lotus = layoutToWorld(zone, [spots.lotus[0], lotusY(spots.onWater?.main), spots.lotus[1]]);
  const pose = tvReadingPose(centre, TV_MAIN_RADIUS, new T.Vector3(...zone.eye));
  const depth = tvMainDepth() * spots.flowDepth;
  const rest = tvViewPoint(pose, (TV_READ.flow.x - 960) / 960, (540 - TV_READ.flow.y) / 540, depth);
  const [fx, fz] = spots.flowLotus ?? tvFlowLotusDefault(place, rest);
  const flowLotus = spots.flowBud
    ? layoutToWorld(zone, spots.flowBud)
    : layoutToWorld(zone, [fx, spots.onWater?.flow ? TV_WATER_TOP : TV_TERRACE_TOP + TV_BASIN.flow.height, fz]);
  // Leaving bubbles drift away from the camera unless the place says otherwise.
  const origin = layoutToWorld(zone, [0, 0, 0]);
  const drift = (direction?: readonly [number, number, number]) => direction
    ? layoutToWorld(zone, direction).sub(origin).setY(0).normalize()
    : new T.Vector3().copy(pose.target).sub(pose.eye).setY(0).normalize();
  const world: TvPlaceWorld = {
    place, eye: new T.Vector3(...zone.eye), pose,
    main: { centre, radius: TV_MAIN_RADIUS, lotus, away: drift(spots.leave?.main) },
    flow: { rest, depth, lotus: flowLotus, away: drift(spots.stream?.away ?? spots.leave?.flow) },
  };
  worlds.set(place, world);
  return world;
}
/** A flowing bubble's radius in the world for its diameter on screen at rest. */
export function tvFlowRadius(place: ZoneId, diameter: number, fov = TV_FOV) {
  return (diameter / TV_SCREEN.height) * tvPlaceWorld(place).flow.depth * Math.tan((fov * Math.PI) / 360);
}

const breathForward = new T.Vector3();
/** The reading framing at a place at world time `time`: the reading pose from its tour eye, breathing. Allocates nothing. */
export function tvReadingFrame(place: ZoneId, time: number, aspect = 16 / 9, fov = TV_FOV, out: TvPose = { eye: new T.Vector3(), target: new T.Vector3() }) {
  const world = tvPlaceWorld(place);
  tvReadingPose(world.main.centre, world.main.radius, world.eye, aspect, out, fov);
  breathForward.copy(out.target).sub(out.eye).normalize();
  const breath = Math.sin(time * TV_BREATH.rate) * TV_BREATH.distance;
  out.eye.addScaledVector(breathForward, breath);
  out.target.addScaledVector(breathForward, breath);
  return out;
}
