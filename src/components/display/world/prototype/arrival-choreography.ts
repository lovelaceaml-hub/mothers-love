import type { ArrivalPhase, ArrivalState } from "../arrival-director";
import type { FeedPhase } from "../world-feed";
import type { StudyArrival } from "./design-mode";

/**
 * The single shape every arrival study reads.
 *
 * It is a pure translation of the unchanged director phases, so the three
 * studies cannot drift apart and none of them can invent its own timing.
 * `form` reaches 1 before the director enters `reading`, which is what keeps
 * the formation finished for the whole reading interval. Reduced motion enters
 * at `reading`, so the very first frame already carries the completed pose and
 * a Still capture shows a finished formation.
 */
export type ArrivalPose = {
  active: boolean;
  gather: number;
  form: number;
  dissolve: number;
  calm: boolean;
  presence: number;
};

/** Local, so this module stays free of the world data tables and of the DOM. */
function smoothstep(t: number) {
  const n = Math.max(0, Math.min(1, t));
  return n * n * (3 - 2 * n);
}

function resting(): ArrivalPose {
  return { active: false, gather: 0, form: 0, dissolve: 1, calm: false, presence: 0 };
}

export function arrivalPose(arrival?: ArrivalState | null): ArrivalPose {
  if (!arrival) return resting();
  if (arrival.phase === "approach") {
    const gather = smoothstep(arrival.progress);
    return { active: true, gather, form: 0, dissolve: 0, calm: false, presence: gather };
  }
  if (arrival.phase === "reveal") {
    return { active: true, gather: 1, form: smoothstep(arrival.progress), dissolve: 0, calm: false, presence: 1 };
  }
  if (arrival.phase === "reading") {
    return { active: true, gather: 1, form: 1, dissolve: 0, calm: true, presence: 1 };
  }
  if (arrival.phase === "settle") {
    const dissolve = smoothstep(arrival.progress);
    return { active: true, gather: 1, form: 1, dissolve, calm: false, presence: 1 - dissolve };
  }
  return resting();
}

/**
 * How far the kit lotus `bloom` clip is scrubbed (WORLD-INTEGRATION 4.2): the bud stays
 * closed through the approach, opens with `form` through the reveal so the clip's last
 * frame lands exactly when reading begins, and stays open through reading and settle.
 * It is `form` by construction; naming it keeps the pose table test honest about the
 * clip and lets the stage read one word instead of a rule.
 */
export function bloomFraction(pose: ArrivalPose) {
  return pose.form;
}

/**
 * Style cycling for live arrivals (Plan 24 P4, WORLD-INTEGRATION 4.6).
 *
 * The three studies take turns over newly admitted arrivals: the first arrival keeps
 * today's default, the pearl formation, then the bloom, then the silk, and around again.
 * An arrival keeps its style for its whole lifetime because the engine only consults
 * this on the one edge where the director leaves `idle`. Reaction refreshes and feed
 * reconnects never enter the director, so that edge never fires for them and the cycle
 * never advances (proven in `tests/world/arrival-choreography.test.ts`).
 */
export const ARRIVAL_STYLE_CYCLE: readonly StudyArrival[] = ["constellation", "bloom", "ribbon"];

/** The style of the n-th admitted arrival, n counted from 0. */
export function arrivalStyleAt(index: number): StudyArrival {
  const n = Math.floor(Number.isFinite(index) ? index : 0);
  return ARRIVAL_STYLE_CYCLE[((n % 3) + 3) % 3];
}

/** True exactly when the director has just left `idle`: the one moment a style may change. */
export function arrivalAdmitted(before: ArrivalPhase, after: ArrivalPhase) {
  return before === "idle" && after !== "idle";
}

/**
 * Whether the cycle drives this feed at all (WORLD-INTEGRATION 4.6). It serves live feeds;
 * sample keeps the explicit `?entrance=` choice and the three study buttons, whose pressed
 * state is the style on screen, and a fixed entrance keeps its style on every feed.
 */
export function arrivalStyleCycles(study: boolean, entranceFixed: boolean, phase: FeedPhase) {
  return study && !entranceFixed && phase !== "sample";
}
