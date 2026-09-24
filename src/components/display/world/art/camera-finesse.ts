import * as T from "three";

/**
 * Camera finesse for the sample-only design study.
 *
 * `CameraDirector` keeps its authored pose exactly as it is: this class runs after it, in
 * the engine's study branch only, and adds the small human touches a hand held cinema camera
 * has. Nothing here changes where the director thinks the camera is, so `report()` still
 * publishes `director.position` and `data-camera-position` is unchanged.
 *
 * Four touches, all resolved from the director pose plus the shared study clock:
 *
 *  - a look at lag, so the aim trails the director's target instead of snapping to it. The
 *    lag is much longer while a recognition is being read, which is what holds the pearl
 *    steady in the frame during the reading glide.
 *  - a breathing dolly, a fraction of a unit along the view and across it.
 *  - a roll taken from the yaw rate, so a turn leans into itself. It is clamped hard: a
 *    degree and a half is at the edge of noticing, which is the whole intent.
 *  - an anticipation push back on the frame travel begins, and a short damped settle
 *    forward when it ends.
 *
 * The identity rule is the important one. When `moving` is false, which covers a paused
 * tour, reduced motion and the owner's Still setting, this copies the director pose exactly
 * and forgets every piece of state, so every still capture in the harness frames exactly as
 * it does today and two captures of the same moment are identical.
 *
 * Pure Three math with no DOM and no renderer, so the whole of it is provable in Node.
 */

export type FinesseInput = {
  /** Seconds since the previous frame. Zero or less contributes no motion. */
  dt: number;
  /** False for a paused tour, reduced motion or Still. The finesse is then the identity. */
  moving: boolean;
  traveling: boolean;
  /** The arrival director's phase. Anything but "idle" halves the dolly and tightens the roll. */
  arrivalPhase: string;
  /** True while a recognition is being read at a parked viewpoint. */
  reading: boolean;
  /** The director's authored eye and aim for this frame. Neither is modified. */
  position: T.Vector3;
  target: T.Vector3;
  /** The shared study clock, so a frozen clock resolves the dolly to a fixed place. */
  elapsed: number;
};

/** Every authored constant of the finesse, so a test reads the same numbers the engine does. */
export const STUDY_FINESSE = {
  /** Look at lag time constants, in seconds. */
  lagTau: 1.1,
  readingLagTau: 2.5,
  /** Breathing dolly: amplitude in world units and rate in radians a second. */
  dollyForward: 0.1,
  dollyForwardRate: 0.7,
  dollyUp: 0.04,
  dollyUpRate: 0.47,
  /** Roll: seconds of yaw turned into radians of lean, then smoothed and clamped. */
  rollGain: 0.3,
  rollTau: 0.4,
  rollLimit: (1.5 * Math.PI) / 180,
  arrivalRollLimit: (0.8 * Math.PI) / 180,
  /** Anticipation on the travel rising edge: one half sine backwards over this span. */
  anticipation: -0.45,
  anticipationSpan: 1.2,
  /** Settle on the falling edge: a damped forward oscillation, quiet well inside four seconds. */
  settle: 0.28,
  settleDecay: 1.9,
  settleRate: 2.4,
} as const;

/**
 * The largest distance the finesse may ever move the eye from the director pose.
 * The dolly and the anticipation are the only two that can add together, and the dolly's
 * two axes are perpendicular, so this is the exact bound rather than a guess.
 */
export const FINESSE_OFFSET_LIMIT = Math.hypot(
  STUDY_FINESSE.dollyForward - STUDY_FINESSE.anticipation,
  STUDY_FINESSE.dollyUp,
);

/**
 * The study's travel pacing, handed to `CameraDirector.ease` under the study gate only.
 *
 * The director's own default stays the app's `smoothstep`, so classic, cinematic and every
 * camera director test are untouched. This is an ease in out cubic: over the same eighteen
 * seconds it leaves and arrives more gently, which is what the anticipation push and the
 * settle at either end of a travel are shaped around. Clamped exactly as `smoothstep` is.
 */
export function studyTravelEase(t: number) {
  const n = Math.max(0, Math.min(1, t));
  return n < 0.5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2;
}

const WORLD_UP = new T.Vector3(0, 1, 0);
const FALLBACK_FORWARD = new T.Vector3(0, 0, -1);
const FALLBACK_RIGHT = new T.Vector3(1, 0, 0);

/** The shortest signed way round from one heading to another. */
function wrapPi(angle: number) {
  return angle - Math.PI * 2 * Math.round(angle / (Math.PI * 2));
}

function clamp(value: number, limit: number) {
  return Math.max(-limit, Math.min(limit, value));
}

export class StudyCameraFinesse {
  private readonly lagTarget = new T.Vector3();
  private readonly forward = new T.Vector3();
  private readonly right = new T.Vector3();
  private readonly up = new T.Vector3();
  private lagReady = false;
  private yaw = 0;
  private yawReady = false;
  private roll = 0;
  private wasTraveling = false;
  private edge: "none" | "anticipate" | "settle" = "none";
  private edgeAge = 0;

  /** Test and report seam: the lean this frame is presenting, in radians. */
  rollRadians() {
    return this.roll;
  }

  /** Forget every smoothed value, so the next moving frame starts from the director pose. */
  private forget(traveling: boolean) {
    this.lagReady = false;
    this.yawReady = false;
    this.roll = 0;
    this.edge = "none";
    this.edgeAge = 0;
    this.wasTraveling = traveling;
  }

  /**
   * Places the camera for this frame. The director pose is read, never written.
   *
   * The caller still owns `updateMatrixWorld()`, because everything downstream of the
   * engine's camera block, the world bubbles included, must see the final pose.
   */
  apply(camera: T.Camera, input: FinesseInput) {
    if (!input.moving) {
      this.forget(input.traveling);
      camera.position.copy(input.position);
      camera.lookAt(input.target);
      return;
    }
    const dt = Math.max(0, input.dt);
    if (input.traveling !== this.wasTraveling) {
      this.edge = input.traveling ? "anticipate" : "settle";
      this.edgeAge = 0;
      this.wasTraveling = input.traveling;
    } else if (this.edge !== "none") this.edgeAge += dt;

    // The aim trails the director's target. A first moving frame has nothing to trail from,
    // so it adopts the target outright rather than swinging in from wherever it left off.
    const tau = input.reading
      ? STUDY_FINESSE.readingLagTau
      : STUDY_FINESSE.lagTau;
    if (!this.lagReady) {
      this.lagTarget.copy(input.target);
      this.lagReady = true;
    } else this.lagTarget.lerp(input.target, dt > 0 ? 1 - Math.exp(-dt / tau) : 0);

    // The same basis `lookAt` is about to build, resolved here so the dolly can use it.
    this.forward.copy(this.lagTarget).sub(input.position);
    if (this.forward.lengthSq() < 1e-12) this.forward.copy(FALLBACK_FORWARD);
    else this.forward.normalize();
    this.right.copy(this.forward).cross(WORLD_UP);
    if (this.right.lengthSq() < 1e-12) this.right.copy(FALLBACK_RIGHT);
    else this.right.normalize();
    this.up.copy(this.right).cross(this.forward).normalize();

    const arriving = input.arrivalPhase !== "idle";
    // An entrance already carries its own motion, so the breath steps back out of its way.
    const breath = arriving ? 0.5 : 1;
    let along =
      STUDY_FINESSE.dollyForward *
      Math.sin(input.elapsed * STUDY_FINESSE.dollyForwardRate) *
      breath;
    const lift =
      STUDY_FINESSE.dollyUp *
      Math.sin(input.elapsed * STUDY_FINESSE.dollyUpRate) *
      breath;
    if (this.edge === "anticipate")
      along +=
        STUDY_FINESSE.anticipation *
        Math.sin(
          Math.PI *
            Math.min(1, this.edgeAge / STUDY_FINESSE.anticipationSpan),
        );
    else if (this.edge === "settle")
      along +=
        STUDY_FINESSE.settle *
        Math.exp(-STUDY_FINESSE.settleDecay * this.edgeAge) *
        Math.sin(STUDY_FINESSE.settleRate * this.edgeAge);
    camera.position
      .copy(input.position)
      .addScaledVector(this.forward, along)
      .addScaledVector(this.up, lift);
    camera.lookAt(this.lagTarget);

    // The lean follows how fast the view is turning, not how far it has turned, so a long
    // straight glide sits level and only the corner of a travel leans.
    const yaw = Math.atan2(this.forward.x, this.forward.z);
    const rate =
      this.yawReady && dt > 1e-4 ? wrapPi(yaw - this.yaw) / dt : 0;
    this.yaw = yaw;
    this.yawReady = true;
    const limit = arriving
      ? STUDY_FINESSE.arrivalRollLimit
      : STUDY_FINESSE.rollLimit;
    const target = clamp(-rate * STUDY_FINESSE.rollGain, limit);
    this.roll +=
      (target - this.roll) *
      (dt > 0 ? 1 - Math.exp(-dt / STUDY_FINESSE.rollTau) : 0);
    // Clamped again after smoothing, so an entrance beginning mid lean is inside its own
    // tighter limit on the very first frame rather than decaying into it.
    this.roll = clamp(this.roll, limit);
    if (this.roll) camera.rotateZ(this.roll);
  }
}
