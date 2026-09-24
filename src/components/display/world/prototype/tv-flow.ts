import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import type { ZoneId } from "../world-data";
import type { WorldBubblePlan } from "./tv-page";
import { TV_FOCUS_OUT } from "./tv-places";

/*
 * How the TV page's bubbles flow (Anthony, 2026-09-24: "Recognition bubbles can also naturally
 * move and flow to show different recognitions at the same scene"; his choice: "Flow through
 * the scene"). Pure, so every rule is provable in plain Node.
 *
 * A bubble never jumps from one recognition to another. When a place's bubble is to show a
 * new recognition, the bubble showing the old one lifts off and floats up and away, fading as
 * it goes, while a new bubble buds from its lotus, rises and comes to rest where the old one
 * was. The flowing bubble changes as the camera arrives, so the swap is seen as the camera
 * glides in; the main bubble changes after the camera has left, so it never moves while read.
 */

export const TV_FLOW = {
  /** The old bubble lifts off this long after the swap begins, and is gone after `leave`. */
  leaveAt: 0.4,
  leave: 5.5,
  /** It fades out over the last part of its way. */
  fade: 1.8,
  /** The new bubble buds at its lotus this long after the swap begins, */
  budAt: 0.8,
  /** grows there for `bud` seconds, */
  bud: 1.5,
  /** then rises to rest over `rise` seconds. */
  rise: 4.2,
} as const;
/** When the new bubble comes to rest, seconds after its swap began. */
export const TV_FLOW_SETTLED = TV_FLOW.budAt + TV_FLOW.bud + TV_FLOW.rise;
/** The share of its full size a bubble has when it leaves its bud. */
export const TV_BUD_SCALE = 0.28;

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export type TvFlowPose = {
  /** Where along its way: 0 at the start of the path, 1 at its end. */
  u: number;
  /** A share of the bubble's full radius. */
  scale: number;
  opacity: number;
};

/** The new bubble `t` seconds after its swap began: budding, rising, then at rest (u 1). */
export function tvArriving(t: number, out: TvFlowPose = { u: 0, scale: 0, opacity: 0 }): TvFlowPose | null {
  if (t < TV_FLOW.budAt) return null;
  const bud = (t - TV_FLOW.budAt) / TV_FLOW.bud;
  if (bud < 1) {
    out.u = 0;
    out.scale = 0.04 + (TV_BUD_SCALE - 0.04) * smooth(bud);
    out.opacity = smooth(bud * 3);
    return out;
  }
  const rise = smooth((t - TV_FLOW.budAt - TV_FLOW.bud) / TV_FLOW.rise);
  out.u = rise;
  out.scale = TV_BUD_SCALE + (1 - TV_BUD_SCALE) * rise;
  out.opacity = 1;
  return out;
}

/** The old bubble `t` seconds after its swap began, on its way up and away, or null once gone. */
export function tvLeaving(t: number, out: TvFlowPose = { u: 0, scale: 1, opacity: 1 }): TvFlowPose | null {
  const age = t - TV_FLOW.leaveAt;
  if (age >= TV_FLOW.leave) return null;
  const u = Math.max(0, age) / TV_FLOW.leave;
  // Eased in only, so it drifts off gently and keeps going.
  out.u = u * u * (2 - u) * 0.5 + u * 0.5;
  out.scale = 1 - 0.18 * u;
  out.opacity = 1 - smooth((age - (TV_FLOW.leave - TV_FLOW.fade)) / TV_FLOW.fade);
  return out;
}

/** A gentle rise and fall at rest, so a resting bubble still breathes. */
export function tvRestBob(time: number, seed: number) {
  return Math.sin(time * 0.6 + seed * 1.7) * 0.12 + Math.sin(time * 0.23 + seed) * 0.08;
}

/**
 * A bubble's way in: from its bud above the lotus, first straight up, then curving over to its
 * resting place, with a soft sway that dies away as it arrives. World space.
 */
export class TvRisePath {
  private readonly curve: T.CubicBezierCurve3;
  private readonly side: T.Vector3;
  constructor(bud: T.Vector3, rest: T.Vector3) {
    const climb = Math.max(1, rest.y - bud.y);
    this.curve = new T.CubicBezierCurve3(
      bud.clone(),
      bud.clone().add(new T.Vector3(0, climb * 0.6, 0)),
      rest.clone().add(new T.Vector3(0, -climb * 0.3, 0)),
      rest.clone(),
    );
    const across = rest.clone().sub(bud).setY(0);
    this.side = across.lengthSq() > 1e-6 ? new T.Vector3(-across.z, 0, across.x).normalize() : new T.Vector3(1, 0, 0);
  }
  at(u: number, out = new T.Vector3()) {
    this.curve.getPoint(Math.min(1, Math.max(0, u)), out);
    return out.addScaledVector(this.side, Math.sin(u * Math.PI * 2) * 0.35 * (1 - u));
  }
}

/** A bubble's way out: up from where it rested, drifting `away` (horizontal; zero rises straight up), curving as it goes. */
export class TvLeavePath {
  private readonly curve: T.CubicBezierCurve3;
  constructor(rest: T.Vector3, away: T.Vector3) {
    const back = away.clone().setY(0).normalize();
    this.curve = new T.CubicBezierCurve3(
      rest.clone(),
      rest.clone().add(new T.Vector3(0, 3.2, 0)),
      rest.clone().addScaledVector(back, 3.5).add(new T.Vector3(0, 7, 0)),
      rest.clone().addScaledVector(back, 6).add(new T.Vector3(0, 10, 0)),
    );
  }
  at(u: number, out = new T.Vector3()) {
    return this.curve.getPoint(Math.min(1, Math.max(0, u)), out);
  }
}

let segmenter: Intl.Segmenter | undefined;
const lengths = new Map<string, number>();
/** A message's length in graphemes, measured once (bounded, oldest out first). */
function graphemes(text: string) {
  const known = lengths.get(text);
  if (known !== undefined) return known;
  segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let count = 0;
  for (const _ of segmenter.segment(text)) count++;
  if (lengths.size >= 256) lengths.delete(lengths.keys().next().value!);
  lengths.set(text, count);
  return count;
}
/**
 * The longest message a flowing bubble takes, graphemes: about what its largest size holds whole
 * at 23.5 px. A longer one would have to scroll faster than it can be read in a flowing turn, so
 * it waits for its turn in a main bubble (which holds it up to 20 s) and always runs in the ticker.
 */
export const TV_FLOW_MAX_GRAPHEMES = 130;

/**
 * The flowing bubble's recognition at a place on its `turn` (`TvFlowTurn`): the place's small
 * records one after another, each in turn, skipping the one the main bubble shows and any too
 * long to read in a flowing turn. Undefined when there is none.
 */
export function tvFlowRecord(plan: WorldBubblePlan | undefined, place: ZoneId, turn: number, mainId?: string): Recognition | undefined {
  const small = plan?.places.get(place)?.small ?? [];
  for (let k = 0; k < small.length; k++) {
    const record = small[(((turn + k) % small.length) + small.length) % small.length];
    if (record.id !== mainId && graphemes(record.message) <= TV_FLOW_MAX_GRAPHEMES) return record;
  }
  return undefined;
}
/** A visit turns the flowing bubble at most this many times (the River's stream). */
export const TV_STREAM_STEPS = 4;
/** Which step of its stream a place's visit is at, `age` seconds in: 0 anywhere without a stream. */
export function tvStreamStep(every: number | undefined, age: number) {
  return every ? Math.min(TV_STREAM_STEPS - 1, Math.max(0, Math.floor(age / every))) : 0;
}
/**
 * A place's flowing turn: one more at every arrival and, along the River's stream, at every step
 * of the visit. A step only ever moves forward within a visit (the reading age starts again when
 * the camera leaves, and the River must not ask for its first record again as it goes), and never
 * so late that the new bubble could not come to rest before the camera pulls back.
 */
export class TvFlowTurn {
  turn = 0;
  private seen?: number;
  private step = 0;
  update(arrivals: number, here: boolean, age: number, stream?: { every: number; hold: number }) {
    if (this.seen === undefined) { this.seen = arrivals; this.turn = arrivals; }
    else if (arrivals !== this.seen) { this.seen = arrivals; this.turn += 1; this.step = 0; }
    if (stream && here) {
      const step = tvStreamStep(stream.every, age);
      if (step > this.step && step * stream.every + TV_FLOW_SETTLED <= stream.hold - TV_FOCUS_OUT) {
        this.turn += step - this.step;
        this.step = step;
      }
    }
    return this.turn;
  }
}

/**
 * One bubble spot's swap state: the recognition it shows, the one leaving it, and when the
 * swap began (world clock). A spot's first recognition is simply there, unless the spot is in
 * view and `rise` asks for it to rise from its lotus (a flowing bubble the camera arrives to).
 */
export class TvSwap {
  current?: string;
  previous?: string;
  at = -Infinity;
  private started = false;
  /** Asks for `id`; returns true when a journey begins. A still view, or a spot out of sight, swaps without one. */
  want(id: string | undefined, time: number, still: boolean, rise = false) {
    if (id === this.current && this.started) return false;
    const first = !this.started;
    this.started = true;
    const journey = !still && (!first || (rise && id !== undefined));
    this.previous = journey && !first ? this.current : undefined;
    this.current = id;
    this.at = journey ? time : -Infinity;
    return journey;
  }
  /** The leaving recognition is no longer allowed on screen: it goes at once, never floats away. */
  drop(id: string) {
    if (this.previous === id) this.previous = undefined;
  }
  /** The recognition showing (or rising) is no longer allowed on screen: it goes at once. */
  vanish() {
    this.current = undefined;
    this.at = -Infinity;
  }
  /** A journey is under way: a new recognition waits for it, so no bubble ever jumps. */
  busy(time: number) {
    return this.at !== -Infinity && time - this.at < TV_FLOW_SETTLED;
  }
  /** Still or reduced motion: whatever journey was under way ends where it was going. */
  settleNow() {
    this.previous = undefined;
    this.at = -Infinity;
  }
  /** The swap's journey is over: forget the leaving one. */
  settle(time: number) {
    if (this.previous !== undefined && time - this.at >= TV_FLOW.leaveAt + TV_FLOW.leave) this.previous = undefined;
  }
}
