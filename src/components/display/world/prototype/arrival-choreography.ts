import type { ArrivalState } from "../arrival-director";

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
