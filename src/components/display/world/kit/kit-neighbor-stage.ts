/** The per frame pieces of the neighbors: actor and pair records, scratch objects, standing, posing and the card guard. */
import * as T from "three";
import { NEIGHBOR_CLIPS, type NeighborClip } from "../neighbor-dialogue";
import type { ZoneId } from "../world-data";
import type { NeighborStage, NeighborWeight, NeighborClipLengths } from "./kit-neighbor-cast";
import type { NeighborRig } from "./kit-neighbor-rig";

/* ---------------------------------------------------------------------------------------- */

export type Actor = {
  person: string;
  slot: 0 | 1;
  side: -1 | 1;
  holder: T.Group;
  toy: NeighborRig;
  hero: NeighborRig | null;
  shown: NeighborRig;
  mixers: Map<NeighborRig, { mixer: T.AnimationMixer; actions: Map<NeighborClip, T.AnimationAction> }>;
  lengths: NeighborClipLengths;
  /** Half the pair's spacing at the meeting spot, this actor's side, world units. */
  meet: number;
  /** World units per walk cycle. */
  stride: number;
  height: number;
};
export type Pair = {
  zone: ZoneId;
  index: number;
  root: T.Group;
  stage: NeighborStage;
  actors: [Actor, Actor];
  handoffAt: number;
  centre: T.Vector3;
  /** The district's layout frame, which the stage's `x, z` (and its portrait step) are in. */
  layout: T.Matrix4;
  /** Whether the pair stands at its portrait step now. */
  portrait: boolean;
  /** Kit units: the taller of the two, for the card. */
  top: number;
  /** Kit units: the mean height of the two, for the heart they share. */
  mean: number;
  /** The frame this pair was last posed, for the Auto cadence. */
  posed: number;
};

export const _frustum = new T.Frustum();
export const _matrix = new T.Matrix4();
export const _sphere = new T.Sphere();
export const _vector = new T.Vector3();
export const _corner = new T.Vector3();
export const _dummy = new T.Object3D();

/** Where a stage puts its pair in the district's layout frame, with its portrait step or without. */
export function neighborStagePoint(stage: NeighborStage, portrait: boolean) {
  const [dx, dz] = portrait && stage.portrait ? stage.portrait : [0, 0];
  return { x: stage.x + dx, y: stage.y ?? 0.7, z: stage.z + dz };
}

export function standAt(root: T.Object3D, stage: NeighborStage, layout: T.Matrix4, portrait: boolean) {
  const point = neighborStagePoint(stage, portrait);
  root.position.set(point.x, point.y, point.z).applyMatrix4(layout);
}

// One mixer per rig, created when the rig first plays, with every clip ready to weigh.
const mixerFor = (actor: Actor, rig: NeighborRig) => {
  let entry = actor.mixers.get(rig);
  if (!entry) {
    const mixer = new T.AnimationMixer(rig.root);
    const actions = new Map<NeighborClip, T.AnimationAction>();
    for (const name of NEIGHBOR_CLIPS) {
      const clip = rig.clips.get(name);
      if (!clip) continue;
      const action = mixer.clipAction(clip);
      action.setLoop(T.LoopRepeat, Infinity);
      action.play();
      action.setEffectiveWeight(0);
      actions.set(name, action);
    }
    entry = { mixer, actions };
    actor.mixers.set(rig, entry);
  }
  return entry;
};
export const pose = (actor: Actor, rig: NeighborRig, weights: NeighborWeight[]) => {
  const { mixer, actions } = mixerFor(actor, rig);
  actions.forEach(action => action.setEffectiveWeight(0));
  for (const { clip, time, weight } of weights) {
    const action = actions.get(clip) ?? actions.get("idle");
    if (!action) continue;
    action.time = time;
    action.setEffectiveWeight(action.getEffectiveWeight() + weight);
  }
  mixer.update(0);
};

export type FocusLike = { position: readonly number[]; radius: number } | undefined;

/**
 * Whether a card would cover the focused pearl's face on screen, with a margin. The face disc
 * is the only thing that carries a recognition; the card yields to it on any screen shape.
 */
export function coversFocus(card: T.Mesh, camera: T.Camera, focus: FocusLike) {
  if (!focus) return false;
  const centre = _vector.set(focus.position[0], focus.position[1], focus.position[2]);
  const up = _corner.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(focus.radius * 1.12).add(centre);
  const c = centre.clone().project(camera), e = up.project(camera);
  if (c.z > 1) return false;
  const aspect = (camera as T.PerspectiveCamera).aspect ?? 1;
  const radius = Math.hypot((e.x - c.x) * aspect, e.y - c.y);
  const geometry = card.geometry as T.PlaneGeometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of [[box.min.x, box.min.y], [box.max.x, box.min.y], [box.max.x, box.max.y], [box.min.x, box.max.y]]) {
    const p = new T.Vector3(x, y, 0).applyMatrix4(card.matrixWorld).project(camera);
    minX = Math.min(minX, p.x * aspect); maxX = Math.max(maxX, p.x * aspect);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const nx = Math.max(minX, Math.min(c.x * aspect, maxX)), ny = Math.max(minY, Math.min(c.y, maxY));
  return Math.hypot(nx - c.x * aspect, ny - c.y) < radius;
}
