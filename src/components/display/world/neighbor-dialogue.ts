import { WORLD_EXPRESSIONS, ZONES, type ZoneId } from "./world-data";

export function neighborMotion(time: number, index: number) {
  const phase = (time * 0.12 + Math.PI / 2 + index * 0.21) % (Math.PI * 2);
  const approaching = Math.max(0, Math.cos(phase));
  return { distance: 1.25 + approaching * 1.3, walking: approaching > 0.08 };
}

export function neighborWords(index: number) {
  return {
    greeting: WORLD_EXPRESSIONS[index % WORLD_EXPRESSIONS.length].phrase,
    response:
      index % 2
        ? "Thank you for being here."
        : "Your kindness makes a difference.",
  };
}

/**
 * Classic and cinematic only. Their procedural neighbors (`world-neighbors.ts`) alternate the
 * two cards on `sin(time * .4)` while the pair stands, so their accessible sentence keeps that
 * rule and stays in step with the cards those two art modes draw.
 */
export function legacyNeighborDialogue(
  time: number,
  zone: ZoneId,
  celebrating = false,
) {
  const index = ZONES.findIndex((item) => item.id === zone);
  if (celebrating || neighborMotion(time, index).walking) return null;
  const words = neighborWords(index);
  return Math.sin(time * 0.4) >= 0 ? words.greeting : words.response;
}

/*
 * The design world's neighbors (Plan 26, WORLD-INTEGRATION section 5.2): one clock and one
 * schedule that the rigged actors, their speech cards and the accessible sentence all read, so
 * the three agree on every frame and a frozen clock is one coherent moment.
 *
 * The cycle is `neighborMotion`'s own phase (52.36 s): the pair walks together while
 * `cos(phase) > .08` on the way in (approach, 12.42 s), stands together (meet, 27.52 s), and
 * walks apart (part, 12.42 s). The meet follows the design's beat table, corrected to the
 * delivered rigs: `give_heart` and `receive_heart` share one timeline and start together, the
 * heart changes hands at `handoffAt` (1.8 s, the studio manifest's `events.handover`), and the
 * receiver takes it to heart at 2.933 s (`events.receive_heart.heart_absorbed`), after which
 * a glowing heart floats between the two until they part.
 */

const SPEED = 0.12;
/** `cos(phase) > .08` is walking: the approach ends and the part begins at these phases. */
const WALK_PHASE = Math.acos(0.08);
export const NEIGHBOR_CYCLE_SECONDS = (Math.PI * 2) / SPEED;
export const NEIGHBOR_STAGE_SECONDS = {
  approach: WALK_PHASE / SPEED,
  meet: (Math.PI * 2 - WALK_PHASE * 2) / SPEED,
  part: WALK_PHASE / SPEED,
} as const;
/** Seconds into the meet when both heart clips start together. */
export const NEIGHBOR_HEART_START = 15.5;
/** Seconds into `give_heart` and `receive_heart` when the heart changes hands (studio manifest). */
export const NEIGHBOR_HANDOFF_AT = 1.8;
/** Seconds into `receive_heart` when the receiver has taken the heart to heart (studio manifest). */
export const NEIGHBOR_ABSORBED_AT = 2.933;

export const NEIGHBOR_CLIPS = [
  "idle", "walk", "talk", "listen", "wave", "bow", "comfort", "after_you",
  "encourage", "offer_hand", "cheer", "give_heart", "receive_heart",
] as const;
export type NeighborClip = (typeof NEIGHBOR_CLIPS)[number];
/** The loops; every other clip is a one shot that starts and ends in the rest pose. */
export const NEIGHBOR_LOOPS: ReadonlySet<NeighborClip> = new Set(["idle", "walk", "talk"]);

/** The gesture for each of the nine expressions, in catalog order (Plan 03, the rig's manifest). */
export const NEIGHBOR_EXPRESSION_GESTURES: readonly NeighborClip[] = [
  "wave", "bow", "comfort", "comfort", "after_you", "listen", "encourage", "offer_hand", "cheer",
];

export type NeighborStage = "approach" | "meet" | "part";
export type NeighborHeart = "none" | "giving" | "handed" | "floating";
export type NeighborCard = "greeting" | "response" | null;
/** Where the pair stands and which way each actor faces, resolved per actor by the builder. */
export type NeighborStaging =
  | "apart"      // at the far point, facing the partner
  | "walk-in"    // walking toward the partner
  | "settle"     // at the meeting spot, turning from the partner into the three quarter stance
  | "stance"     // at the meeting spot, turned a little toward the viewer
  | "exchange"   // at the meeting spot, turned further toward each other to pass the heart
  | "turn-away"  // at the meeting spot, turning away through the viewer
  | "walk-out"   // walking away from the partner
  | "turn-back"; // at the far point, turning back through the viewer

/** `gesture` resolves to the zone's expression gesture, `thanks` to bow (odd zones) or cheer (even). */
type NeighborAct = NeighborClip | "gesture" | "thanks";
export type NeighborBeatRow = {
  stage: NeighborStage;
  /** Seconds into the stage. Each row runs to the next row's start, or to the stage's end. */
  start: number;
  acts: readonly [NeighborAct, NeighborAct];
  staging: NeighborStaging;
  card?: "greeting" | "response";
  speaker?: 0 | 1;
};

/** The whole cycle, in order. Every instant of it falls in exactly one row. */
export const NEIGHBOR_BEATS: readonly NeighborBeatRow[] = [
  // They notice each other across the terrace, wave, and walk together.
  { stage: "approach", start: 0, acts: ["idle", "idle"], staging: "apart" },
  { stage: "approach", start: 5.2, acts: ["wave", "wave"], staging: "apart" },
  { stage: "approach", start: 7.6, acts: ["walk", "walk"], staging: "walk-in" },
  { stage: "approach", start: 11.8, acts: ["idle", "idle"], staging: "settle" },
  // The design's meet table (section 5.2), with the heart clips as the rigs deliver them. The
  // listener's `listen` is a 3.2 s one shot that starts with the other's talk and runs into the
  // gesture, then rests; a second `listen` straight after would restart the nod mid blend.
  { stage: "meet", start: 0, acts: ["idle", "idle"], staging: "stance" },
  { stage: "meet", start: 1.5, acts: ["talk", "listen"], staging: "stance", card: "greeting", speaker: 0 },
  { stage: "meet", start: 4.5, acts: ["gesture", "idle"], staging: "stance", card: "greeting", speaker: 0 },
  { stage: "meet", start: 8.5, acts: ["listen", "talk"], staging: "stance", card: "response", speaker: 1 },
  { stage: "meet", start: 11.5, acts: ["idle", "thanks"], staging: "stance", card: "response", speaker: 1 },
  { stage: "meet", start: NEIGHBOR_HEART_START, acts: ["give_heart", "receive_heart"], staging: "exchange" },
  { stage: "meet", start: 18.7, acts: ["idle", "idle"], staging: "stance" },
  // A goodbye wave before they part, the bookend of the hello.
  { stage: "meet", start: 25.1, acts: ["wave", "wave"], staging: "stance" },
  { stage: "part", start: 0, acts: ["idle", "idle"], staging: "turn-away" },
  { stage: "part", start: 0.8, acts: ["walk", "walk"], staging: "walk-out" },
  { stage: "part", start: 5.0, acts: ["idle", "idle"], staging: "turn-back" },
  { stage: "part", start: 5.8, acts: ["idle", "idle"], staging: "apart" },
];

export type NeighborBeat = {
  stage: NeighborStage;
  /** Seconds into the stage. */
  age: number;
  /** Index of the row in `NEIGHBOR_BEATS`. */
  beat: number;
  /** Seconds into the row. */
  beatAge: number;
  /** Seconds the row lasts. */
  beatLength: number;
  /** Who is speaking or giving: 0 the first actor, 1 the second. */
  speaker: 0 | 1 | null;
  /** The clip on the speaker, or the heart clips while the heart is being given. */
  gesture: NeighborClip | null;
  heart: NeighborHeart;
  card: NeighborCard;
  staging: NeighborStaging;
  /** The clip each actor plays in this row. */
  acts: readonly [NeighborClip, NeighborClip];
  /** The clip each actor played in the row before, which this row blends in from. */
  previous: readonly [NeighborClip, NeighborClip];
};

/** The zone's expression gesture: zone index modulo nine, as `neighborWords` picks the phrase. */
export function neighborGesture(index: number): NeighborClip {
  return NEIGHBOR_EXPRESSION_GESTURES[((index % 9) + 9) % 9];
}

function resolveAct(act: NeighborAct, index: number): NeighborClip {
  if (act === "gesture") return neighborGesture(index);
  if (act === "thanks") return index % 2 ? "bow" : "cheer";
  return act;
}

/** The stage and the seconds into it, from exactly the rule `neighborMotion` walks by. */
export function neighborStage(time: number, index: number): { stage: NeighborStage; age: number } {
  const tau = Math.PI * 2;
  const phase = (((time * SPEED + Math.PI / 2 + index * 0.21) % tau) + tau) % tau;
  const walking = Math.cos(phase) > 0.08;
  if (walking && phase < Math.PI) return { stage: "approach", age: phase / SPEED };
  if (walking) return { stage: "part", age: Math.max(0, (phase - (tau - WALK_PHASE)) / SPEED) };
  return { stage: "meet", age: Math.max(0, (phase - WALK_PHASE) / SPEED) };
}

function heartAt(stage: NeighborStage, age: number, handoffAt: number): NeighborHeart {
  if (stage !== "meet" || age < NEIGHBOR_HEART_START) return "none";
  const into = age - NEIGHBOR_HEART_START;
  if (into < handoffAt) return "giving";
  if (into < NEIGHBOR_ABSORBED_AT) return "handed";
  return "floating";
}

/**
 * The one schedule. Pure: the same `time` and `index` always give the same beat, so a paused
 * clock is a still moment and a scrubbed clock replays exactly.
 */
export function neighborSchedule(
  time: number,
  index: number,
  handoffAt: number = NEIGHBOR_HANDOFF_AT,
): NeighborBeat {
  const { stage, age } = neighborStage(time, index);
  let row = 0;
  for (let i = 0; i < NEIGHBOR_BEATS.length; i++) {
    const candidate = NEIGHBOR_BEATS[i];
    if (candidate.stage === stage && candidate.start <= age) row = i;
  }
  const current = NEIGHBOR_BEATS[row];
  const next = NEIGHBOR_BEATS[row + 1];
  const end = next && next.stage === stage ? next.start : NEIGHBOR_STAGE_SECONDS[stage];
  const before = NEIGHBOR_BEATS[(row + NEIGHBOR_BEATS.length - 1) % NEIGHBOR_BEATS.length];
  const acts = [resolveAct(current.acts[0], index), resolveAct(current.acts[1], index)] as const;
  const heart = heartAt(stage, age, handoffAt);
  const speaker = current.speaker ?? (heart === "giving" ? 0 : null);
  return {
    stage,
    age,
    beat: row,
    beatAge: age - current.start,
    beatLength: end - current.start,
    speaker,
    gesture: speaker === null ? null : acts[speaker],
    heart,
    card: current.card ?? null,
    staging: current.staging,
    acts,
    previous: [resolveAct(before.acts[0], index), resolveAct(before.acts[1], index)],
  };
}

/**
 * What the design world's neighbors are saying right now, for the accessible sentence: the
 * greeting while the greeting card shows, the response while the response card shows, else
 * null. Arrivals take the stage, so a celebrating world has no dialogue, and no card shows.
 */
export function neighborDialogue(
  time: number,
  zone: ZoneId,
  celebrating = false,
) {
  if (celebrating) return null;
  const index = ZONES.findIndex((item) => item.id === zone);
  if (index < 0) return null;
  const { card } = neighborSchedule(time, index);
  if (!card) return null;
  const words = neighborWords(index);
  return card === "greeting" ? words.greeting : words.response;
}
