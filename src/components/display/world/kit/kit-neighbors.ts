import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { ArrivalState } from "../arrival-director";
import {
  NEIGHBOR_ABSORBED_AT,
  NEIGHBOR_BEATS,
  NEIGHBOR_CLIPS,
  NEIGHBOR_HANDOFF_AT,
  NEIGHBOR_HEART_START,
  NEIGHBOR_LOOPS,
  NEIGHBOR_STAGE_SECONDS,
  neighborSchedule,
  neighborWords,
  type NeighborBeat,
  type NeighborClip,
  type NeighborStaging,
} from "../neighbor-dialogue";
import { WORLD_EXPRESSIONS, ZONES, type ZoneId } from "../world-data";
import type { DesignKitContext, KitBuilderHandle } from "../prototype/design-world";
import { sparklePoints, studyRim } from "../prototype/study-materials";
import type { WorldKit } from "./kit-loader";
import type { KitAssetId } from "./kit-manifest";

/**
 * Rigged neighbors in the design world (WORLD-INTEGRATION section 5, coordinator ruling 2).
 *
 * Two actors per zone, 26 in all, cast so no zone repeats a person. One clock drives
 * everything: `neighborSchedule` in `neighbor-dialogue.ts` says, for the world time and a zone,
 * which beat the pair is in, what each actor plays, which card shows and where the heart is.
 * The actors' poses are a pure function of that beat (every clip time and blend weight is set
 * from the clock, then the mixer is evaluated at a zero delta), so a paused or reduced motion
 * world is one still, coherent moment and a scrubbed clock replays exactly. The speech cards
 * and the accessible sentence (`neighborDialogue`) read the same schedule, so they agree.
 *
 * Toy and hero. Every actor is built from the toy `neighbor.<name>` rig and has a hero slot:
 * a sculpted `neighbor-hero.<name>` (or `neighbor.hero-<name>`, which the current sync can
 * already name) with the same skeleton and clips takes over for close ups, when its pair is
 * the active one and the camera is near. Without a hero the toy plays every shot.
 *
 * Cost on a TV (design 5.3 and 7.2). Each rig is merged at load into one skinned mesh with its
 * materials baked into vertex attributes, all 26 actors share one material, so an actor is one
 * skinned draw. Only pairs in view and near the camera are shown, at most four (Low: the active
 * pair only); hidden pairs cost nothing. On Auto the pairs other than the active one pose on
 * alternate frames. Only the active pair casts a sun shadow.
 *
 * Owned by lane K4. The design world calls this once, with a kit, before the static batch.
 * Returning a handle means the neighbors stand in the world: the design world then marks
 * `scene.userData.studyNeighbors`, the engine reports `kitNeighbors`, and the host reads the
 * dialogue instead of the "Miniature figures" sentence. The static miniature figures they
 * replace are taken out here, before the batch. Returning `undefined` (a toy rig missing)
 * keeps the figures and the sentence, so nothing regresses.
 */
export type KitNeighbors = KitBuilderHandle & {
  /** Every frame the world updates: the world clock, the director's zone and the arrival state. */
  update(time: number, zone: ZoneId, arrival: ArrivalState | undefined): void;
  setEffects(sparkles: boolean, trails: boolean): void;
  dispose(): void;
};

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
const CARD_HEIGHT = NEIGHBOR_CARD.width * NEIGHBOR_CARD.canvasHeight / NEIGHBOR_CARD.canvasWidth;
/** Clip changes blend over this many seconds (design 5.3). */
export const NEIGHBOR_BLEND = 0.35;
/** Visible pairs per tier: High and Auto show the nearest four in view, Low the active pair only. */
export const NEIGHBOR_VISIBLE_PAIRS = { high: 4, auto: 4, low: 1 } as const;
/** Pairs farther than this from the camera are hidden (the Auto detail distance, design 7.2). */
export const NEIGHBOR_VIEW_DISTANCE = 115;
/** The hero rig plays when its pair is the active one and the camera is closer than this. */
export const NEIGHBOR_HERO_DISTANCE = 42;

/**
 * Where each zone's pair stands, in the district layout frame (design 6.1: origin at the zone
 * centre, +z toward the tour eye, +x to the viewer's right). `x, z` is the hand over point,
 * `walk` how far each actor walks out, `card` how far the speech card sits to the side of the
 * pair, away from the pearl being read. Chosen with the camera's reading arc, the hero pearl's
 * medallion reach, the page's own title and panels, the island edge, and the pieces section 6
 * places in each zone; `tests/world/kit-neighbors.test.ts` proves the rules that do not depend
 * on page layout.
 */
/** `y` is the ground the pair stands on (the terrace top, .7, unless a zone says otherwise). */
export type NeighborStage = { x: number; z: number; walk: number; card: number; y?: number; yaw?: number };
export const NEIGHBOR_STAGES: Readonly<Record<ZoneId, NeighborStage>> = {
  garden: { x: -4.5, z: 8.2, walk: 1.6, card: -3.2 },
  // In the gap the rose ring leaves toward the camera, just clear of the lowest step (7.9):
  // the top step itself sits inside the silk ribbons' loop, which veils anyone on it.
  heart: { x: -2.8, z: 8.1, walk: 1.3, card: -1.3 },
  // Between the two front columns of the grove, so the card clears their icon discs.
  expressions: { x: -1.2, z: 5.6, walk: 1.6, card: 0 },
  welcome: { x: -3, z: 6.5, walk: 2, card: 0 },
  featured: { x: -5, z: 8.5, walk: 1.6, card: -3.2 },
  calendar: { x: -3, z: 9.5, walk: 2, card: 0 },
  peacemakers: { x: -3, z: 7, walk: 2, card: -2.6 },
  status: { x: 0, z: 6, walk: 1.6, card: 0 },
  orbit: { x: -4, z: 7.5, walk: 1.6, card: -3.2 },
  // The kit fountain scales to about 6.9 units across its base; the forecourt keeps clear of it.
  milestone: { x: -3.5, z: 7.6, walk: 1.4, card: 0 },
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

const smooth = (value: number) => {
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

/* ---------------------------------------------------------------------------------------- */

/** One shared material for every actor: colours, roughness and glow ride in vertex attributes. */
export function neighborMaterial() {
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: T.DoubleSide, dithering: true });
  material.name = "neighbor";
  material.onBeforeCompile = shader => {
    shader.vertexShader = "attribute vec4 kitSurface;\nvarying vec4 vKitSurface;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvKitSurface = kitSurface;",
    );
    shader.fragmentShader = "varying vec4 vKitSurface;\n" + shader.fragmentShader
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = vKitSurface.w;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vKitSurface.rgb;");
  };
  material.customProgramCacheKey = () => "kit-neighbor-v1";
  // The study's warm rim from the low sun, as the ivory architecture carries it.
  return studyRim(material, "#ffe6c9", 2.6, 0.16);
}

export type NeighborRig = {
  root: T.Object3D;
  mesh: T.SkinnedMesh;
  skeleton: T.Skeleton;
  clips: ReadonlyMap<string, T.AnimationClip>;
};

/**
 * One skinned draw from a rigged kit file: every primitive of the skinned mesh merged into one
 * geometry, each primitive's colour, roughness and emission written into its vertices, bound
 * to the same skeleton. The kit's own geometry is never changed; the merged one is new.
 */
export function mergeNeighborRig(source: T.Object3D, material: T.Material): { root: T.Object3D; mesh: T.SkinnedMesh; geometry: T.BufferGeometry } | null {
  const root = cloneSkinned(source);
  const parts: T.SkinnedMesh[] = [];
  root.traverse(object => { if ((object as T.SkinnedMesh).isSkinnedMesh) parts.push(object as T.SkinnedMesh); });
  if (!parts.length) return null;
  const skeleton = parts[0].skeleton;
  if (parts.some(part => part.skeleton.bones.length !== skeleton.bones.length)) return null;
  root.updateMatrixWorld(true);
  const reference = parts[0];
  const toReference = reference.matrixWorld.clone().invert();
  const pieces: T.BufferGeometry[] = [];
  const release = () => { pieces.forEach(piece => piece.dispose()); return null; };
  for (const part of parts) {
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    const source = part.geometry as T.BufferGeometry;
    // GLTFLoader gives each primitive its own mesh and one material; a mesh with a material
    // array (not what the kit exports) is split by its groups.
    const groups = Array.isArray(part.material) && source.groups.length
      ? source.groups.map(group => ({ geometry: sliceGroup(source, group.start, group.count), material: materials[group.materialIndex ?? 0] }))
      : [{ geometry: source, material: materials[0] }];
    for (const { geometry, material: surface } of groups) {
      const piece = new T.BufferGeometry();
      const count = geometry.getAttribute("position")?.count ?? 0;
      for (const [name, Type] of [["position", Float32Array], ["normal", Float32Array], ["skinIndex", Uint16Array], ["skinWeight", Float32Array]] as const) {
        const attribute = geometry.getAttribute(name);
        if (!attribute) { if (geometry !== source) geometry.dispose(); piece.dispose(); return release(); }
        const size = attribute.itemSize;
        const values = new Type(count * size);
        for (let i = 0; i < count; i++) for (let k = 0; k < size; k++) values[i * size + k] = name === "skinIndex" ? Math.round(attribute.getComponent(i, k)) : attribute.getComponent(i, k);
        piece.setAttribute(name, new T.BufferAttribute(values, size));
      }
      // Indexed stays indexed: each vertex is skinned once however many triangles share it.
      if (geometry.index) piece.setIndex(Array.from(geometry.index.array as ArrayLike<number>));
      if (geometry !== source) geometry.dispose();
      const standard = surface as T.MeshStandardMaterial | undefined;
      const color = standard?.color ?? new T.Color(1, 1, 1);
      const emissive = (standard?.emissive ?? new T.Color(0, 0, 0)).clone().multiplyScalar(standard?.emissiveIntensity ?? 1);
      const roughness = standard?.roughness ?? 0.6;
      const colors = new Float32Array(count * 3), surfaces = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
        surfaces[i * 4] = emissive.r; surfaces[i * 4 + 1] = emissive.g; surfaces[i * 4 + 2] = emissive.b; surfaces[i * 4 + 3] = roughness;
      }
      piece.setAttribute("color", new T.BufferAttribute(colors, 3));
      piece.setAttribute("kitSurface", new T.BufferAttribute(surfaces, 4));
      // Every primitive of one glTF node shares the node's transform; this also covers a file
      // that splits a person into several nodes on one skeleton.
      if (part !== reference) piece.applyMatrix4(toReference.clone().multiply(part.matrixWorld));
      pieces.push(piece);
    }
  }
  const indexed = pieces.every(piece => piece.index);
  if (!indexed) pieces.forEach((piece, i) => { if (piece.index) { pieces[i] = piece.toNonIndexed(); piece.dispose(); } });
  const merged = mergeGeometries(pieces, false);
  pieces.forEach(piece => piece.dispose());
  if (!merged) return null;
  merged.computeBoundingBox();
  const sphere = merged.boundingBox!.getBoundingSphere(new T.Sphere());
  // Room for raised arms, a bow and a stride: the bind pose sphere, a little larger.
  sphere.radius *= 1.3;
  merged.boundingSphere = sphere;
  const mesh = new T.SkinnedMesh(merged, material);
  mesh.name = `${source.name || "neighbor"} merged`;
  mesh.position.copy(reference.position);
  mesh.quaternion.copy(reference.quaternion);
  mesh.scale.copy(reference.scale);
  reference.parent!.add(mesh);
  mesh.bind(skeleton, reference.bindMatrix);
  mesh.boundingSphere = sphere.clone();
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parts.forEach(part => part.removeFromParent());
  return { root, mesh, geometry: merged };
}

/** A standalone, non indexed copy of one draw group. */
function sliceGroup(source: T.BufferGeometry, start: number, count: number) {
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const out = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(flat.attributes)) {
    const size = attribute.itemSize;
    out.setAttribute(name, new T.BufferAttribute((attribute.array as Float32Array).slice(start * size, (start + count) * size), size, attribute.normalized));
  }
  flat.dispose();
  return out;
}

/** A fresh rig for one actor: its own bones, the person's merged geometry and the shared material. */
function cloneRig(template: { root: T.Object3D }, clips: ReadonlyMap<string, T.AnimationClip>): NeighborRig {
  const root = cloneSkinned(template.root);
  let mesh: T.SkinnedMesh | undefined;
  root.traverse(object => { if ((object as T.SkinnedMesh).isSkinnedMesh) mesh = object as T.SkinnedMesh; });
  return { root, mesh: mesh!, skeleton: mesh!.skeleton, clips };
}

/* ---------------------------------------------------------------------------------------- */

/**
 * The speech card, restyled to the study palette (design 5.3): an ivory card with a gold
 * hairline, the words in plum, and "FICTIONAL NEIGHBORS" printed above them on every card, as
 * Plan 21's review asked. The tail points down at whoever is speaking.
 */
export type CardContext = Pick<CanvasRenderingContext2D,
  "clearRect" | "beginPath" | "moveTo" | "lineTo" | "quadraticCurveTo" | "closePath" | "fill" | "stroke" | "fillText" | "measureText" | "arc"
> & { fillStyle: unknown; strokeStyle: unknown; lineWidth: number; font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline; globalAlpha: number };

export const NEIGHBOR_CARD_LABEL = "FICTIONAL NEIGHBORS";

export function paintNeighborCard(context: CardContext, text: string, accent: string, tail: number) {
  const width = NEIGHBOR_CARD.canvasWidth, height = NEIGHBOR_CARD.canvasHeight;
  const left = 10, top = 10, right = width - 10, bottom = height - 64, radius = 58;
  const tip = Math.min(right - radius - 40, Math.max(left + radius + 40, tail * width));
  context.clearRect(0, 0, width, height);
  const outline = () => {
    context.beginPath();
    context.moveTo(left + radius, top);
    context.lineTo(right - radius, top);
    context.quadraticCurveTo(right, top, right, top + radius);
    context.lineTo(right, bottom - radius);
    context.quadraticCurveTo(right, bottom, right - radius, bottom);
    context.lineTo(tip + 34, bottom);
    context.lineTo(tip, height - 8);
    context.lineTo(tip - 34, bottom);
    context.lineTo(left + radius, bottom);
    context.quadraticCurveTo(left, bottom, left, bottom - radius);
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
  };
  context.globalAlpha = 1;
  outline();
  context.fillStyle = "#fffaf3";
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = "#d8b06a";
  context.stroke();
  // A quiet second hairline inside the gold one, as the pearl's own rings are drawn.
  context.globalAlpha = 0.55;
  context.lineWidth = 2;
  context.strokeStyle = "#efd9ae";
  context.beginPath();
  context.moveTo(left + radius, top + 14);
  context.lineTo(right - radius, top + 14);
  context.stroke();
  context.globalAlpha = 1;
  // The label, with the expression's own colour as a small bead before it.
  context.font = "600 25px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  // Tracked out where the browser can (an older TV browser simply sets it tight).
  const spaced = context as CardContext & { letterSpacing?: string };
  if ("letterSpacing" in spaced) spaced.letterSpacing = "4px";
  const labelWidth = context.measureText(NEIGHBOR_CARD_LABEL).width;
  context.fillStyle = "#8b6a80";
  context.fillText(NEIGHBOR_CARD_LABEL, width / 2 + 12, 56);
  if ("letterSpacing" in spaced) spaced.letterSpacing = "0px";
  context.fillStyle = accent;
  context.beginPath();
  context.arc(width / 2 - labelWidth / 2 - 10, 56, 8, 0, Math.PI * 2);
  context.fill();
  // The words: Georgia as the pearl sets them, as large as two balanced lines allow.
  const words = text.split(/\s+/).filter(Boolean);
  const room = width - 150;
  const measure = (line: string) => context.measureText(line).width;
  const layout = (size: number): string[] | null => {
    context.font = `500 ${size}px Georgia, "Times New Roman", serif`;
    const whole = words.join(" ");
    if (measure(whole) <= room) return [whole];
    let best: string[] | null = null, widest = Infinity;
    for (let cut = 1; cut < words.length; cut++) {
      const pair = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
      const w = Math.max(measure(pair[0]), measure(pair[1]));
      if (w <= room && w < widest) { best = pair; widest = w; }
    }
    return best;
  };
  let size = 74, set = layout(size);
  while (!set && size > 44) set = layout(size -= 4);
  if (!set) {
    // Three lines at the smallest size, greedily: no canonical phrase needs it today.
    set = [];
    let line = "";
    for (const word of words) {
      const proposed = line ? `${line} ${word}` : word;
      if (line && measure(proposed) > room) { set.push(line); line = word; } else line = proposed;
    }
    if (line) set.push(line);
  }
  context.fillStyle = "#4e2f48";
  const middle = (bottom + 84) / 2;
  set.forEach((line, i) => context.fillText(line, width / 2, middle + (i - (set.length - 1) / 2) * size * 1.12));
}

function cardCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = NEIGHBOR_CARD.canvasWidth;
  canvas.height = NEIGHBOR_CARD.canvasHeight;
  const context = canvas.getContext("2d");
  return context ? { canvas, context } : null;
}

/* ---------------------------------------------------------------------------------------- */

type Actor = {
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
type Pair = {
  zone: ZoneId;
  index: number;
  root: T.Group;
  stage: NeighborStage;
  actors: [Actor, Actor];
  handoffAt: number;
  centre: T.Vector3;
  /** Kit units: the taller of the two, for the card and the floating heart. */
  top: number;
  /** The frame this pair was last posed, for the Auto cadence. */
  posed: number;
};

const _frustum = new T.Frustum();
const _matrix = new T.Matrix4();
const _sphere = new T.Sphere();
const _vector = new T.Vector3();
const _corner = new T.Vector3();
const _dummy = new T.Object3D();

export function createKitNeighbors(context: DesignKitContext): KitNeighbors | undefined {
  const { kit, scene } = context;
  const casting = new Map(NEIGHBOR_PEOPLE.map(person => [person, castNeighbor(kit, person)]));
  if ([...casting.values()].some(cast => !cast.toy)) return undefined;

  const material = context.material(neighborMaterial());
  const templates = new Map<KitAssetId, { root: T.Object3D; clips: ReadonlyMap<string, T.AnimationClip> }>();
  const template = (id: KitAssetId) => {
    const cached = templates.get(id);
    if (cached) return cached;
    const asset = kit.asset(id)!;
    const merged = mergeNeighborRig(asset.template, material);
    if (!merged) return null;
    context.geometry(merged.geometry);
    const built = { root: merged.root, clips: asset.clips };
    templates.set(id, built);
    return built;
  };
  for (const cast of casting.values()) if (!template(cast.toy!)) return undefined;

  const group = new T.Group();
  group.name = "Kit neighbors";
  // Nothing here may be merged by the study's static batcher: the actors move every frame.
  group.userData.dynamic = true;
  scene.add(group);

  const pairs: Pair[] = ZONES.map((zone, index) => {
    const district = context.districts.get(zone.id)!;
    const stage = NEIGHBOR_STAGES[zone.id];
    const cast = NEIGHBOR_CAST[zone.id];
    district.layout.updateWorldMatrix(true, false);
    const root = new T.Group();
    root.name = `Neighbors: ${zone.id}`;
    root.position.set(stage.x, stage.y ?? 0.7, stage.z).applyMatrix4(district.layout.matrixWorld);
    root.quaternion.setFromRotationMatrix(district.layout.matrixWorld).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), stage.yaw ?? 0));
    root.visible = false;
    group.add(root);
    const facts = cast.map(person => NEIGHBOR_FACTS[person]);
    const giver = facts[0];
    // The studio's spacing: the roots `heart_reach` + `heart_reach` + .15 of the giver's
    // height apart, so the two big heads never touch; the pair turns further toward each other
    // (NEIGHBOR_EXCHANGE) to pass the heart, which lines the two hands up again.
    const gap = 0.15 * giver.height;
    const actors = cast.map((person, slot) => {
      const own = casting.get(person)!;
      const toyTemplate = template(own.toy!)!;
      const toy = cloneRig(toyTemplate, toyTemplate.clips);
      const heroTemplate = own.hero ? template(own.hero) : null;
      const hero = heroTemplate ? cloneRig(heroTemplate, new Map([...toyTemplate.clips, ...heroTemplate.clips])) : null;
      const holder = new T.Group();
      holder.name = `Neighbor ${person}`;
      holder.scale.setScalar(NEIGHBOR_SCALE);
      holder.add(toy.root);
      if (hero) { hero.root.visible = false; holder.add(hero.root); }
      root.add(holder);
      const walkClip = kit.asset(own.toy!)!.entry.clips.find(clip => clip.name === "walk");
      const lengths: Partial<Record<NeighborClip, number>> = {};
      for (const name of NEIGHBOR_CLIPS) { const clip = toyTemplate.clips.get(name); if (clip) lengths[name] = clip.duration; }
      const personal = facts[slot];
      return {
        person, slot: slot as 0 | 1, side: (slot ? 1 : -1) as -1 | 1, holder, toy, hero, shown: toy, mixers: new Map(), lengths,
        meet: (personal.reach + gap / 2) * NEIGHBOR_SCALE,
        stride: (walkClip?.stride ?? personal.stride) * NEIGHBOR_SCALE,
        height: personal.height,
      } satisfies Actor;
    }) as [Actor, Actor];
    const give = kit.asset(casting.get(cast[0])!.toy!)!.entry.clips.find(clip => clip.name === "give_heart");
    return {
      zone: zone.id, index, root, stage, actors,
      handoffAt: give?.handoffAt ?? NEIGHBOR_HANDOFF_AT,
      centre: root.position.clone(),
      top: Math.max(facts[0].height, facts[1].height),
      posed: -Infinity,
    };
  });

  // The miniature figures step aside for the neighbors, with the soft contact shadow each one
  // stood on, before the static batch merges them away.
  const shadowMaterial = context.palette.shadow;
  context.districts.forEach(district => {
    for (const figure of district.figures) {
      const parent = figure.parent;
      figure.removeFromParent();
      parent?.children.slice().forEach(child => {
        const mesh = child as T.Mesh;
        if (mesh.isMesh && mesh.material === shadowMaterial && Math.abs(mesh.position.x - figure.position.x) < 1e-6 && Math.abs(mesh.position.z - figure.position.z) < 1e-6) mesh.removeFromParent();
      });
    }
    district.figures.length = 0;
  });

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
  const pose = (actor: Actor, rig: NeighborRig, weights: NeighborWeight[]) => {
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

  // Contact shadows: one soft disc under every shown actor, one draw for all of them.
  const maxActors = NEIGHBOR_VISIBLE_PAIRS.high * 2;
  const contactGeometry = context.geometry(new T.PlaneGeometry(1, 1));
  contactGeometry.rotateX(-Math.PI / 2);
  const contacts = new T.InstancedMesh(contactGeometry, shadowMaterial, maxActors);
  contacts.name = "Neighbor contact shadows";
  contacts.frustumCulled = false;
  contacts.count = 0;
  group.add(contacts);

  // The floating heart after the hand over (design 5.2): the kit's sculpted heart in the
  // study's own rose, which breathes on the Sanctuary's beat and reaches the glow layer, with
  // six sparkles around it.
  const heartGeometry = kit.has("core.heart" as KitAssetId)
    ? kit.geometry("core.heart" as KitAssetId)
    : context.geometry(new T.SphereGeometry(0.5, 16, 12));
  heartGeometry.computeBoundingBox();
  const heartBox = heartGeometry.boundingBox!;
  const heartSize = Math.max(heartBox.max.x - heartBox.min.x, heartBox.max.y - heartBox.min.y, 1e-3);
  const heartCentre = heartBox.getCenter(new T.Vector3());
  const hearts = new T.InstancedMesh(heartGeometry, context.palette.rose, NEIGHBOR_VISIBLE_PAIRS.high);
  hearts.name = "Neighbor floating hearts";
  hearts.frustumCulled = false;
  hearts.count = 0;
  hearts.layers.enable(1);
  group.add(hearts);
  const sparkleCount = NEIGHBOR_VISIBLE_PAIRS.high * 6;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleGeometry = context.geometry(new T.BufferGeometry());
  sparkleGeometry.setAttribute("position", new T.BufferAttribute(sparklePositions, 3));
  sparkleGeometry.setAttribute("phase", new T.BufferAttribute(Float32Array.from({ length: sparkleCount }, (_, i) => (i % 6) / 6), 1));
  sparkleGeometry.setDrawRange(0, 0);
  const sparkleMaterial = context.material(sparklePoints(context.time, 0.34, "#fff0d6", 0.85, context.sparkleDot));
  const sparkles = new T.Points(sparkleGeometry, sparkleMaterial);
  sparkles.name = "Neighbor heart sparkles";
  sparkles.frustumCulled = false;
  group.add(sparkles);
  let sparklesOn = true;

  // Two speech cards shared by every zone, repainted when the active zone changes, so the
  // world holds two card textures however long the tour runs.
  const cards = (["greeting", "response"] as const).map(kind => {
    const painted = cardCanvas();
    const texture = painted ? context.texture(new T.CanvasTexture(painted.canvas)) : null;
    if (texture) { texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4; }
    // Drawn over the scenery, like the words on a pearl: a drifting petal or a branch never
    // crosses the phrase. The guard below keeps it off the pearl being read.
    const cardMaterial = context.material(new T.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false,
    }));
    const mesh = new T.Mesh(context.geometry(new T.PlaneGeometry(NEIGHBOR_CARD.width, CARD_HEIGHT)), cardMaterial);
    mesh.name = `Neighbor ${kind} card`;
    mesh.renderOrder = 24;
    mesh.visible = false;
    // The protect mask keeps the bloom off the words, as it does for the pearl being read.
    mesh.layers.enable(3);
    group.add(mesh);
    return { kind, mesh, painted, texture, zone: null as ZoneId | null };
  });
  const paintCards = (pair: Pair) => {
    const words = neighborWords(pair.index);
    const accent = WORLD_EXPRESSIONS[pair.index % WORLD_EXPRESSIONS.length].color;
    for (const card of cards) {
      if (card.zone === pair.zone) continue;
      card.zone = pair.zone;
      if (!card.painted || !card.texture) continue;
      const speaker = card.kind === "greeting" ? pair.actors[0] : pair.actors[1];
      const tail = 0.5 + (speaker.side * (speaker.meet + 0.2) - pair.stage.card) / NEIGHBOR_CARD.width;
      paintNeighborCard(card.painted.context as unknown as CardContext, card.kind === "greeting" ? words.greeting : words.response, card.kind === "greeting" ? accent : "#d1aa6c", tail);
      card.texture.needsUpdate = true;
    }
  };

  let frame = 0;
  const visibleNow: Pair[] = [];
  const cameraAt = new T.Vector3();

  function update(time: number, zone: ZoneId, arrival: ArrivalState | undefined) {
    frame++;
    const camera = scene.userData.studyCamera as T.PerspectiveCamera | undefined;
    const tier = (scene.userData.studyTier as "high" | "auto" | "low" | undefined) ?? (scene.userData.lowTier === true ? "low" : "high");
    const celebrating = !!arrival && arrival.phase !== "idle";
    const activeIndex = Math.max(0, ZONES.findIndex(item => item.id === zone));
    const active = pairs[activeIndex];

    // Which pairs to show: in view, near enough, the active one first, then the nearest.
    visibleNow.length = 0;
    if (camera) {
      camera.updateMatrixWorld();
      _frustum.setFromProjectionMatrix(_matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      camera.getWorldPosition(cameraAt);
    }
    const inView = (pair: Pair) => {
      if (!camera) return pair === active;
      if (pair.centre.distanceTo(cameraAt) > NEIGHBOR_VIEW_DISTANCE) return false;
      _sphere.center.copy(pair.centre).setY(pair.centre.y + 1.4);
      _sphere.radius = pair.stage.walk + 3;
      return _frustum.intersectsSphere(_sphere);
    };
    const limit = NEIGHBOR_VISIBLE_PAIRS[tier];
    if (inView(active)) visibleNow.push(active);
    if (tier !== "low") {
      const others = pairs.filter(pair => pair !== active && inView(pair));
      others.sort((a, b) => a.centre.distanceToSquared(cameraAt) - b.centre.distanceToSquared(cameraAt));
      for (const pair of others) { if (visibleNow.length >= limit) break; visibleNow.push(pair); }
    }
    for (const pair of pairs) pair.root.visible = visibleNow.includes(pair);

    let contactCount = 0, heartCount = 0, sparkleUsed = 0;
    for (const pair of visibleNow) {
      const beat = neighborSchedule(time, pair.index, pair.handoffAt);
      const isActive = pair === active;
      // Auto: the active pair every frame, the rest on alternate frames (design 5.3); a pair
      // that has just come into view is posed at once.
      const posing = isActive || tier !== "auto" || frame - pair.posed >= 2;
      if (posing) pair.posed = frame;
      const close = isActive && !!camera && pair.centre.distanceTo(cameraAt) < NEIGHBOR_HERO_DISTANCE;
      const previousRow = (beat.beat + NEIGHBOR_BEATS.length - 1) % NEIGHBOR_BEATS.length;
      const previousStaging = NEIGHBOR_BEATS[previousRow].staging;
      const earlierStaging = NEIGHBOR_BEATS[(previousRow + NEIGHBOR_BEATS.length - 1) % NEIGHBOR_BEATS.length].staging;
      for (const actor of pair.actors) {
        const walk = { length: pair.stage.walk, speed: actor.stride / (actor.lengths.walk ?? 1) };
        const place = neighborPlacement(beat.staging, beat.beatAge, beat.beatLength, actor.side, walk, previousStaging);
        const before = neighborPlacement(previousStaging, neighborBeatLength(previousRow), neighborBeatLength(previousRow), actor.side, walk, earlierStaging);
        const walked = pair.stage.walk;
        actor.holder.position.set(actor.side * (actor.meet + place.apart * walked), 0, 0);
        actor.holder.rotation.y = place.heading;
        const rig = close && actor.hero ? actor.hero : actor.toy;
        if (rig !== actor.shown) { actor.shown.root.visible = false; rig.root.visible = true; actor.shown = rig; }
        rig.mesh.castShadow = isActive;
        if (posing) {
          const walkLength = actor.lengths.walk ?? 1;
          const walkTime = (fraction: number) => ((fraction * walked / actor.stride) % 1) * walkLength;
          const idleTime = time + actor.slot * 1.7 + pair.index * 0.9;
          pose(actor, rig, neighborWeights(beat, actor.slot, actor.lengths, idleTime, walkTime, { now: place.walked, before: before.walked, pace: place.pace }));
        }
        if (contactCount < maxActors) {
          _vector.copy(actor.holder.position);
          pair.root.localToWorld(_vector);
          _dummy.position.set(_vector.x, _vector.y + 0.03, _vector.z);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(0.95 * NEIGHBOR_SCALE, 1, 0.6 * NEIGHBOR_SCALE);
          _dummy.updateMatrix();
          contacts.setMatrixAt(contactCount++, _dummy.matrix);
        }
      }
      // The heart the pair shared, rising between them once it has been taken to heart, and
      // fading as they part.
      const into = beat.stage === "meet" ? beat.age - NEIGHBOR_HEART_START - NEIGHBOR_ABSORBED_AT : -1;
      const leaving = beat.stage === "part" ? beat.age : -1;
      const grow = beat.heart === "floating" ? smooth(into / 0.8) : leaving >= 0 ? 1 - smooth(leaving / 0.9) : 0;
      if (grow > 0.001 && heartCount < NEIGHBOR_VISIBLE_PAIRS.high) {
        const rise = beat.stage === "part" ? leaving * 0.6 : 0;
        const base = (pair.top * 0.72 + 0.1) * NEIGHBOR_SCALE;
        const lift = beat.stage === "part" ? 1 : smooth(into / 1.4);
        _vector.set(Math.sin(time * 0.8 + pair.index) * 0.22, base + 0.45 * lift + Math.sin(time * 1.4 + pair.index) * 0.1 + rise, 0.35);
        pair.root.localToWorld(_vector);
        const size = (0.85 / heartSize) * grow;
        _dummy.position.copy(_vector).sub(_corner.copy(heartCentre).multiplyScalar(size));
        _dummy.rotation.set(0, time * 0.5 + pair.index, 0);
        _dummy.scale.setScalar(size);
        _dummy.updateMatrix();
        hearts.setMatrixAt(heartCount++, _dummy.matrix);
        if (sparklesOn) for (let i = 0; i < 6 && sparkleUsed < sparkleCount; i++) {
          const a = time * 0.65 + i * 1.047 + pair.index;
          _corner.set(Math.cos(a) * 0.75, ((time * 0.35 + i / 3) % 1.4) - 0.3, Math.sin(a) * 0.45).multiplyScalar(grow).add(_vector);
          sparklePositions.set([_corner.x, _corner.y, _corner.z], sparkleUsed * 3);
          sparkleUsed++;
        }
      }
    }
    contacts.count = contactCount;
    contacts.instanceMatrix.needsUpdate = true;
    hearts.count = heartCount;
    hearts.instanceMatrix.needsUpdate = true;
    sparkleGeometry.setDrawRange(0, sparkleUsed);
    sparkleGeometry.getAttribute("position").needsUpdate = true;
    sparkles.visible = sparklesOn && sparkleUsed > 0;

    // The speech card: the active pair only, while its schedule says someone is speaking.
    const beat = neighborSchedule(time, active.index, active.handoffAt);
    const speaking = !celebrating && active.root.visible && beat.card !== null;
    if (speaking) paintCards(active);
    for (const card of cards) {
      const on = speaking && card.kind === beat.card && !!card.texture;
      card.mesh.visible = on;
      if (!on || !camera) continue;
      const lift = (active.top * NEIGHBOR_SCALE) + 0.3 + CARD_HEIGHT / 2;
      card.mesh.position.set(active.stage.card, lift, 0);
      active.root.localToWorld(card.mesh.position);
      card.mesh.quaternion.copy(camera.quaternion);
      card.mesh.updateMatrixWorld();
      // Nothing may cover the words: a card that would overlap the pearl being read steps aside.
      card.mesh.visible = !coversFocus(card.mesh, camera, scene.userData.studyFocus as FocusLike);
    }
  }

  return {
    update,
    setEffects(sparkleSetting: boolean) {
      sparklesOn = sparkleSetting;
      sparkles.visible = sparklesOn && sparkles.visible;
    },
    dispose() {
      for (const pair of pairs) for (const actor of pair.actors) {
        actor.mixers.forEach(({ mixer }, rig) => { mixer.stopAllAction(); mixer.uncacheRoot(rig.root); });
        actor.mixers.clear();
        actor.toy.skeleton.dispose();
        actor.hero?.skeleton.dispose();
      }
      contacts.dispose();
      hearts.dispose();
      group.removeFromParent();
    },
  };
}

type FocusLike = { position: readonly number[]; radius: number } | undefined;

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
  geometry.computeBoundingBox();
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
