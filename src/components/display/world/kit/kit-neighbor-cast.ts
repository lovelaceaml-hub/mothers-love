/** Who stands where: the cast, their measures, the stages and the pure stroll, placement and blend rules (overview in kit-neighbors.ts). */
import {
  NEIGHBOR_BEATS, NEIGHBOR_LOOPS, NEIGHBOR_STAGE_SECONDS, type NeighborBeat, type NeighborClip,
  type NeighborStaging,
} from "../neighbor-dialogue";
import type { ZoneId } from "../world-data";
import { tvViewDistance } from "../art/study-budget";
import type { WorldKit } from "./kit-loader";
import type { KitAssetId } from "./kit-manifest";

export type NeighborPerson = "grandmother" | "grandfather" | "mother" | "father" | "teenager" | "child";
export const NEIGHBOR_PEOPLE: readonly NeighborPerson[] = ["grandmother", "grandfather", "mother", "father", "teenager", "child"];

/**
 * Design 5.1: the first actor speaks the zone's expression and gives the heart, the second
 * responds and receives it. Every person appears four or five times, never twice in one zone.
 */
export const NEIGHBOR_CAST: Readonly<Record<ZoneId, readonly [NeighborPerson, NeighborPerson]>> = {
  garden: ["mother", "child"],
  heart: ["grandmother", "grandfather"],
  expressions: ["teenager", "father"],
  welcome: ["child", "grandmother"],
  featured: ["mother", "father"],
  calendar: ["grandfather", "teenager"],
  peacemakers: ["father", "child"],
  status: ["grandmother", "mother"],
  orbit: ["teenager", "child"],
  milestone: ["father", "grandfather"],
  "live-feed": ["mother", "teenager"],
  practice: ["grandmother", "child"],
  promise: ["grandfather", "mother"],
};

/**
 * Per person facts from the studio's neighbor manifest (`kit/world/neighbors/manifest.json`,
 * 3D Studio commit 546ff10), which the world manifest does not carry: authored height, how far
 * in front of the root the heart is held at the hand over (`heart_reach`), and the walk's
 * stride per one second cycle (`walk_speed`). A world manifest that later carries `stride` on
 * the walk clip wins; a person not listed here (a hero with other proportions) is measured.
 */
export const NEIGHBOR_FACTS: Readonly<Record<NeighborPerson, { height: number; reach: number; stride: number }>> = {
  grandfather: { height: 1.5, reach: 0.3343, stride: 0.51 },
  grandmother: { height: 1.5, reach: 0.3153, stride: 0.51 },
  father: { height: 1.6, reach: 0.3511, stride: 0.544 },
  mother: { height: 1.6, reach: 0.3373, stride: 0.544 },
  teenager: { height: 1.4, reach: 0.2809, stride: 0.476 },
  child: { height: 1.0, reach: 0.1849, stride: 0.34 },
};

/** Kit units to world units: a 1.6 unit mother stands 2.4 tall, as tall as the study's figures read. */
export const NEIGHBOR_SCALE = 1.5;
/** The stance: each actor turned this far from the viewer toward the partner (design 5.1, 58 degrees). */
export const NEIGHBOR_STANCE = Math.PI * 0.32;
/** Speech card size in world units, and its canvas. */
export const NEIGHBOR_CARD = { width: 6.4, canvasWidth: 1024, canvasHeight: 384 } as const;
export const CARD_HEIGHT = NEIGHBOR_CARD.width * NEIGHBOR_CARD.canvasHeight / NEIGHBOR_CARD.canvasWidth;
/** Clip changes blend over this many seconds (design 5.3). */
export const NEIGHBOR_BLEND = 0.35;
/** Visible pairs per tier: High and Auto show the nearest four in view, Low the active pair only. */
export const NEIGHBOR_VISIBLE_PAIRS = { high: 4, auto: 4, low: 1 } as const;
/** Pairs farther than this from the camera are hidden (the Auto detail distance, design 7.2). */
export const NEIGHBOR_VIEW_DISTANCE = 115;
/**
 * How far a pair may be from the camera and still be shown. The TV page's clear air no longer
 * hides a family appearing at 115 units, so there High and Auto keep them in view out to
 * `STUDY_TV_VIEW_DISTANCE` (`NEIGHBOR_VISIBLE_PAIRS` still caps how many); Low, and every page
 * without `?view=tv`, keep `NEIGHBOR_VIEW_DISTANCE`.
 */
export function neighborViewDistance(tvPage: boolean, tier: "high" | "auto" | "low") {
  return tvViewDistance(NEIGHBOR_VIEW_DISTANCE, tvPage, tier === "low");
}
/** The hero rig plays when its pair is the active one and the camera is closer than this. */
export const NEIGHBOR_HERO_DISTANCE = 42;
/**
 * The floating heart's rest height as a share of the pair's mean height (before the .45 lift),
 * and how far in front of the pair it floats, world units: a mother and child share a heart
 * centred about 1.6 units up, between them and clear of their hair.
 */
export const NEIGHBOR_HEART_HEIGHT = 0.6;
export const NEIGHBOR_HEART_FORWARD = 0.6;

/**
 * Where each zone's pair stands, in the district layout frame (design 6.1: origin at the zone
 * centre, +z toward the tour eye, +x to the viewer's right). `x, z` is the hand over point,
 * `walk` how far each actor walks out, `card` how far the speech card sits to the side of the
 * pair, away from the pearl being read. Chosen with the camera's reading arc, the hero pearl's
 * medallion reach, the page's own title and panels, the island edge, and the pieces section 6
 * places in each zone; `tests/world/kit-neighbors.test.ts` proves the rules that do not depend
 * on page layout.
 */
/**
 * `y` is the ground the pair stands on (the terrace top, .7, unless a zone says otherwise).
 * `cardLift`, when set, puts the card beside the pair at that height above its ground, with
 * the tail pointing sideways at the speakers, for a zone whose air above the pair is taken.
 * `portrait`, when set, is how far (x, z) the pair steps toward the middle of a portrait
 * screen (camera aspect under `NEIGHBOR_PORTRAIT_ASPECT`): a phone centres the pearl and sees
 * much less to either side, so a pair set wide of the pearl for a TV would stand on the frame's
 * edge. It also lifts the pair clear of the location caption the phone sets below the pearl.
 */
export type NeighborStage = {
  x: number; z: number; walk: number; card: number; y?: number; yaw?: number; cardLift?: number;
  portrait?: readonly [number, number];
};
/** Below this camera aspect a pair takes its `portrait` step (a phone held upright, 390 by 844, is .46). */
export const NEIGHBOR_PORTRAIT_ASPECT = 0.8;
export const NEIGHBOR_STAGES: Readonly<Record<ZoneId, NeighborStage>> = {
  garden: { x: -4.5, z: 8.2, walk: 1.6, card: -3.2, portrait: [1.5, -1.5] },
  // In the gap the rose ring leaves toward the camera, just clear of the lowest step (7.9):
  // the top step itself sits inside the silk ribbons' loop, which veils anyone on it.
  heart: { x: -2.8, z: 8.1, walk: 1.3, card: -1.3 },
  // In front of the grove's column arc, the card beside the pair at body height: the nine
  // canonical icon discs ring the air above the pair at card height, and none may be covered.
  expressions: { x: -3, z: 10, walk: 1.4, card: 4.4, cardLift: 0.8 },
  welcome: { x: -3, z: 6.5, walk: 2, card: 0 },
  featured: { x: -5, z: 8.5, walk: 1.6, card: -3.2, portrait: [1.5, -1.5] },
  calendar: { x: -3, z: 9.5, walk: 2, card: 0 },
  peacemakers: { x: -3, z: 7, walk: 2, card: -2.6 },
  status: { x: 0, z: 6, walk: 1.6, card: 0 },
  // The Cosmos camera sets its pair lower on a phone, so it steps further back to clear the caption.
  orbit: { x: -4, z: 7.5, walk: 1.6, card: -3.2, portrait: [1.5, -2.5] },
  // Up the forecourt on the terrace in front of the tiers, not on the frame's bottom edge. The
  // walk keeps outside both fountains: the kit fountain (about 3.5 units in radius at its base,
  // K3b) and the five procedural tiers it replaces (6.3), which stand while that lane is apart
  // or its piece is missing, so no foot ever steps into a basin.
  milestone: { x: -3.5, z: 6.2, walk: 1.3, card: 0 },
  // Between the stepping piers (design 6.15) and behind the canal the front third becomes.
  "live-feed": { x: -3.6, z: 3, walk: 0.7, card: -3.2 },
  practice: { x: -2.5, z: 6.2, walk: 1.6, card: 0 },
  promise: { x: -3, z: 6.5, walk: 2, card: 0 },
};

/** The ids an actor may be built from: the hero candidates first, then the toy. */
export function neighborAssetIds(person: string) {
  return {
    heroes: [`neighbor-hero.${person}`, `neighbor.hero-${person}`] as KitAssetId[],
    toy: `neighbor.${person}` as KitAssetId,
  };
}

/** Which rig plays each role for a person: the toy is required, the hero optional. */
export function castNeighbor(kit: Pick<WorldKit, "has" | "asset">, person: string) {
  const { heroes, toy } = neighborAssetIds(person);
  const rigged = (id: KitAssetId) => kit.has(id) && kit.asset(id)?.skinned === true && kit.asset(id)!.clips.has("idle");
  return { toy: rigged(toy) ? toy : null, hero: heroes.find(rigged) ?? null };
}

/**
 * A walk of `length` at `speed` with a gentle start and stop (.6 s each way, less for a very
 * short walk), as the fraction walked at `age` seconds and the pace as a fraction of `speed`.
 */
export function neighborStroll(age: number, length: number, speed: number) {
  if (length <= 0 || speed <= 0) return { walked: 1, pace: 0 };
  const cruise = length / speed;
  const ramp = Math.min(0.6, cruise / 2);
  const total = cruise + ramp;
  const t = Math.min(total, Math.max(0, age));
  const top = 1 / cruise;
  if (t < ramp) return { walked: 0.5 * top * t * t / ramp, pace: t / ramp };
  if (t > total - ramp) return { walked: 1 - 0.5 * top * (total - t) * (total - t) / ramp, pace: (total - t) / ramp };
  return { walked: top * (t - ramp / 2), pace: 1 };
}
/** Seconds a stroll takes, start to stop. */
export function neighborStrollSeconds(length: number, speed: number) {
  if (length <= 0 || speed <= 0) return 0;
  const cruise = length / speed;
  return cruise + Math.min(0.6, cruise / 2);
}

export const smooth = (value: number) => {
  const n = Math.min(1, Math.max(0, value));
  return n * n * (3 - 2 * n);
};

/** The heart is passed turned this far toward each other, so the two hands line up (design 5.2). */
export const NEIGHBOR_EXCHANGE = Math.PI * 0.42;
export type NeighborWalk = { length: number; speed: number };

/**
 * Where an actor stands and which way it faces: `apart` is 0 at the meeting spot and 1 at the
 * far point; `heading` is the turn about y in the pair frame (0 faces the viewer); `walked` is
 * the fraction of the walk behind it (the walk clip's phase follows it, so feet never slide);
 * `pace` its speed as a fraction of its cruising speed. `side` is -1 for the first actor (on
 * the viewer's left) and 1 for the second. Each walks at its own pace, the walk in timed to
 * arrive as the row ends; every turn goes through the viewer, so the faces stay in the picture.
 */
export function neighborPlacement(
  staging: NeighborStaging,
  beatAge: number,
  beatLength: number,
  side: -1 | 1,
  walk: NeighborWalk = { length: 1, speed: 1 },
  previous?: NeighborStaging,
) {
  const partner = -side * Math.PI / 2, away = side * Math.PI / 2;
  const stance = -side * NEIGHBOR_STANCE, exchange = -side * NEIGHBOR_EXCHANGE;
  const turn = (from: number, to: number, seconds = beatLength) => from + (to - from) * smooth(beatAge / Math.max(1e-6, seconds));
  const still = { walked: 0, pace: 0 };
  switch (staging) {
    case "apart": return { apart: 1, heading: partner, ...still };
    case "walk-in": {
      const lead = Math.max(0, beatLength - Math.min(beatLength, neighborStrollSeconds(walk.length, walk.speed)));
      const speed = Math.max(walk.speed, walk.length / Math.max(0.1, beatLength - 0.6));
      const { walked, pace } = neighborStroll(beatAge - lead, walk.length, speed);
      return { apart: 1 - walked, heading: partner, walked, pace };
    }
    case "settle": return { apart: 0, heading: turn(partner, stance), walked: 1, pace: 0 };
    case "stance": return { apart: 0, heading: previous === "exchange" ? turn(exchange, stance, 0.7) : stance, ...still };
    case "exchange": return { apart: 0, heading: turn(stance, exchange, 0.5), ...still };
    case "turn-away": return { apart: 0, heading: turn(stance, away), ...still };
    case "walk-out": {
      const speed = Math.max(walk.speed, walk.length / Math.max(0.1, beatLength - 0.6));
      const { walked, pace } = neighborStroll(beatAge, walk.length, speed);
      return { apart: walked, heading: away, walked, pace };
    }
    case "turn-back": return { apart: 1, heading: turn(away, partner), walked: 1, pace: 0 };
  }
}

/** The length of a row of `NEIGHBOR_BEATS`, in seconds. */
export function neighborBeatLength(row: number) {
  const current = NEIGHBOR_BEATS[row];
  const next = NEIGHBOR_BEATS[row + 1];
  return (next && next.stage === current.stage ? next.start : NEIGHBOR_STAGE_SECONDS[current.stage]) - current.start;
}

export type NeighborWeight = { clip: NeighborClip; time: number; weight: number };
export type NeighborClipLengths = Readonly<Partial<Record<NeighborClip, number>>>;

/**
 * The blend an actor plays at one instant, as clip times and weights that sum to one (a rig
 * left partly in its bind pose would show the heart beside the hand). One shots play once from
 * the start of their row and then rest in `idle`; `idle` itself runs on the world clock so it
 * never jumps; the walk's clip time comes from the distance walked, so the feet never slide.
 */
export function neighborWeights(
  beat: Pick<NeighborBeat, "beat" | "beatAge" | "acts" | "previous">,
  slot: 0 | 1,
  lengths: NeighborClipLengths,
  idleTime: number,
  walkTime: (traveledFraction: number) => number,
  traveled: { now: number; before: number; pace?: number },
): NeighborWeight[] {
  const out: NeighborWeight[] = [];
  const add = (clip: NeighborClip, time: number, weight: number) => {
    if (weight <= 0) return;
    const same = out.find(item => item.clip === clip);
    if (same) same.weight += weight;
    else out.push({ clip, time, weight });
  };
  const idleLength = lengths.idle ?? 4;
  const act = (clip: NeighborClip, age: number, weight: number, walked: number, speed: number) => {
    const length = lengths[clip];
    if (clip === "idle" || length === undefined) return add("idle", idleTime % idleLength, weight);
    if (clip === "walk") {
      // Legs follow the speed: idle while standing, the full walk at cruising pace.
      const pace = smooth(Math.min(1, speed * 1.6));
      add("walk", walkTime(walked), weight * pace);
      return add("idle", idleTime % idleLength, weight * (1 - pace));
    }
    if (NEIGHBOR_LOOPS.has(clip)) return add(clip, age % length, weight);
    if (age <= length) return add(clip, age, weight);
    const rest = smooth((age - length) / NEIGHBOR_BLEND);
    add(clip, length, weight * (1 - rest));
    add("idle", idleTime % idleLength, weight * rest);
  };
  const fade = smooth(beat.beatAge / NEIGHBOR_BLEND);
  act(beat.acts[slot], beat.beatAge, fade, traveled.now, traveled.pace ?? 1);
  if (fade < 1) {
    const before = (beat.beat + NEIGHBOR_BEATS.length - 1) % NEIGHBOR_BEATS.length;
    // A walk that ended its row had come to a stop.
    act(beat.previous[slot], neighborBeatLength(before) + beat.beatAge, 1 - fade, traveled.before, 0);
  }
  return out;
}
