import * as T from "three";

/**
 * Kit animation, driven by the world's own clock (WORLD-INTEGRATION 2.4, 4.2, 5.3).
 *
 * A clip is never left to play on wall time. A one shot clip (the lotus `bloom`, a gate
 * opening, a gesture held as a pose) is scrubbed to a fraction the caller computes from the
 * director state, so a frozen clock is a frozen pose and a still capture is complete. A
 * looping clip (wings, a walk, an orbit spin) advances only by the delta the caller passes,
 * which is the world delta: zero while paused, under reduced motion or in Still.
 */

export type ScrubbedClip = {
  readonly mixer: T.AnimationMixer;
  readonly action: T.AnimationAction;
  /** Pose the root at `fraction` of the clip, clamped to 0 to 1. Repeating a value is free. */
  set(fraction: number): void;
  dispose(): void;
};

export function scrubbed(root: T.Object3D, clip: T.AnimationClip): ScrubbedClip {
  const mixer = new T.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  action.paused = true;
  let last = Number.NaN;
  return {
    mixer,
    action,
    set(fraction) {
      const value = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
      if (value === last) return;
      last = value;
      action.time = value * clip.duration;
      mixer.update(0);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}

/**
 * A looping clip on its own mixer. The caller advances it with `mixer.update(delta)` using
 * the world delta, so nothing moves in a still capture. `timeScale` sets the rate, for
 * example a walk's `speed / stride`.
 */
export function looping(root: T.Object3D, clip: T.AnimationClip, timeScale = 1): T.AnimationMixer {
  const mixer = new T.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.setLoop(T.LoopRepeat, Infinity);
  action.timeScale = timeScale;
  action.play();
  mixer.update(0);
  return mixer;
}
