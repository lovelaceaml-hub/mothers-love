import * as T from "three";
import type { WorldKit } from "../kit/kit-loader";
import type { MaterialRemap } from "../kit/kit-materials";
import { ARRIVAL_VIEW } from "../world-data";
import type { ArrivalPose } from "./arrival-choreography";

/**
 * The three arrival studies, each a self contained stage on the entry platform.
 *
 * Every position here is local to the entry group. During reading the arrival
 * pearl sits at local (0, 11.4, 0) with radius 5.4, which is where the text
 * band lives, so each stage keeps its own geometry clear of that band: the bloom
 * beam is gated out of it, the silk orbits at radius 8.4 and the descending
 * string lands on the upper left of the pearl's own ring.
 *
 * Plan 26 (WORLD-INTEGRATION section 4): with the 3D Studio kit present each stage
 * dresses itself from it, the lotus that blooms, the ribbon portal, the kit
 * butterflies, the drifting kit petal, the constellation sparkle and the small pearls
 * that form on the ring. Every clip is driven by the pose or the world clock, never
 * wall time, so a frozen clock is a frozen stage and a reduced motion first frame is
 * the finished formation. Without a kit, or when a piece is missing, the procedural
 * piece below stands unchanged, which is what `?kit=off` draws.
 *
 * Polish round (visual director, K2 report): the stage's own kit materials ignore the
 * scene fog so the lotus, the arch and the butterflies keep their colour under the
 * arrival haze, the entrance light sprites and the beam run at about half their first
 * weights, and every placement below is measured against the fixed arrival camera by
 * `pearlClearance` and `arrivalScreen` in `tests/world/arrival-stages.test.ts`.
 */

export type StageEffects = { sparkles: boolean; trails: boolean };
export type ArrivalStage = {
  group: T.Group;
  update(pose: ArrivalPose, time: number, effects: StageEffects): void;
  /** Releases the kit mixers. Geometries, materials and textures go through the registrars. */
  dispose(): void;
};
export type StageContext = {
  geometry: <G extends T.BufferGeometry>(g: G) => G;
  material: <M extends T.Material>(m: M) => M;
  texture: <X extends T.Texture>(t: X) => X;
  instance: (parent: T.Object3D, g: T.BufferGeometry, m: T.Material, count: number, shadow?: boolean) => T.InstancedMesh;
  gold: T.Material;
  ivory: T.Material;
  farPetal: T.BufferGeometry;
  pollen: T.BufferGeometry;
  lotusShape: T.BufferGeometry;
  time: { value: number };
  seededRandom: (seed?: number) => () => number;
  /** The 3D Studio kit, when the study loaded one (Plan 26 K0). */
  kit?: WorldKit;
};

export const PEARL_Y = 11.4, PEARL_R = 5.4, BEAM_Y = 15.5;
export const UP = new T.Vector3(0, 1, 0), RIGHT = new T.Vector3(1, 0, 0);

/** The reading pearl in entry local space, for the clearance tests. */
export const ARRIVAL_PEARL = { y: PEARL_Y, radius: PEARL_R, clearance: 1.2 } as const;
/** Where `design-world.ts` places the entry stage group in the world. */
export const ENTRY_POSITION = new T.Vector3(4.138, .6, 19.104);
/** The fixed arrival camera, in entry local space: `ARRIVAL_VIEW` minus the stage position. */
export const ARRIVAL_EYE_LOCAL = new T.Vector3(...ARRIVAL_VIEW.eye).sub(ENTRY_POSITION);
export const PEARL_CENTRE = new T.Vector3(0, PEARL_Y, 0);
export const PEARL_VIEW = ARRIVAL_EYE_LOCAL.clone().sub(PEARL_CENTRE);
const PEARL_DISTANCE = PEARL_VIEW.length();
PEARL_VIEW.normalize();
/** The arrival camera's azimuth around the pearl, in the orbit parametrisation `(cos a, y, sin a)`. */
export const CAMERA_AZIMUTH = Math.atan2(ARRIVAL_EYE_LOCAL.z, ARRIVAL_EYE_LOCAL.x);
const clearanceOffset = new T.Vector3(), clearancePerp = new T.Vector3();
/**
 * How the arrival camera sees a local point against the reading pearl: `distance` is its
 * apparent offset from the pearl's centre in pearl plane units (perspective corrected, so a
 * nearer point counts as farther out), `front` is how far it sits in front of the disc
 * plane along the view (negative behind the pearl, where the opaque face hides it).
 */
export function pearlClearance(point: T.Vector3, out = { distance: 0, front: 0 }) {
  const offset = clearanceOffset.copy(point).sub(PEARL_CENTRE);
  const along = offset.dot(PEARL_VIEW);
  const perpendicular = clearancePerp.copy(offset).addScaledVector(PEARL_VIEW, -along).length();
  const depth = PEARL_DISTANCE - along;
  out.distance = depth > .5 ? perpendicular * PEARL_DISTANCE / depth : Infinity;
  out.front = along;
  return out;
}

/**
 * Where the fixed arrival camera draws a local point on a 1920 by 1080 frame, as normalised
 * device coordinates (x and y in -1 to 1, y up), through the engine's own landscape lens
 * (`PerspectiveCamera(43, ...)` parked at `ARRIVAL_VIEW` with a plain `lookAt`). The framing
 * rules below (the arch above the pearl, butterflies out of the top of the frame) are
 * measured with it.
 */
const screenCamera = new T.PerspectiveCamera(43, 16 / 9, .1, 450);
screenCamera.position.set(...ARRIVAL_VIEW.eye);
screenCamera.lookAt(new T.Vector3(...ARRIVAL_VIEW.target));
screenCamera.updateMatrixWorld(true);
screenCamera.updateProjectionMatrix();
const screenPoint = new T.Vector3();
export function arrivalScreen(point: T.Vector3, out = { x: 0, y: 0 }) {
  screenPoint.copy(point).add(ENTRY_POSITION).project(screenCamera);
  out.x = screenPoint.x;
  out.y = screenPoint.y;
  return out;
}
/** The top of the reading disc as the arrival camera sees it, for the framing tests. */
export function pearlTopLocal(out = new T.Vector3()) {
  out.copy(UP).addScaledVector(PEARL_VIEW, -UP.dot(PEARL_VIEW)).normalize().multiplyScalar(PEARL_R).add(PEARL_CENTRE);
  return out;
}

/** Kit ids the stages look for; a missing one keeps its procedural piece. */
export const STAGE_KIT = {
  lotus: "arrival.lotus-bloom",
  portal: "arrival.ribbon-portal",
  butterfly: "arrival.butterfly",
  petals: "arrival.petal-drift",
  sparkle: "recognition.constellation-sparkle",
  pearl: "core.pearl",
} as const;

/**
 * Placement, decided by eye against the approved targets and re measured after the visual
 * director's polish notes (report of lane K2).
 *
 * Lotus: the file spans 2.975 across when open; 3.7 makes the open flower 11 across, wider
 * than the pearl as `02_Arrival_Bloom_Target.jpeg` shows it, with the petal tips (file
 * height 1.188) reaching about y 4.8, over a unit under the pearl's bottom edge (6.0) so the
 * glowing core reads below the disc, and the lower petals clearing the button row at 1080p.
 * `tilt` leans the flower toward the arrival camera (about 12 degrees) so its open face and
 * seed pod show.
 *
 * Portal: the file's clear opening is 3.21 by 4.47 of its 7.58 by 5.96 frame. At 4.4 the
 * opening is 14.1 wide and 19.7 tall, so the 10.8 pearl floats inside it with the gold band
 * framing it above and the pillars to both sides, as `03_Ribbon_Portal_Target.jpeg` shows.
 * The arch stands `behind` units behind the pearl along the camera's own line and faces the
 * camera squarely (the camera sits 24 degrees off the entry's z axis; an arch on that axis
 * drew its left pillar 70 px inside the disc and its right one 120 px outside). Measured on
 * the file's decoded vertices: the nearest point the camera sees in front of the disc is
 * 8.6 units out, and the opening's edges draw 71 and 95 px outside the disc at 1080p.
 * Butterflies fly a wider orbit at 11 so they clear the medallion ring, dipping low in front
 * of the pearl and rising behind it (`dip`), which keeps them out of the words and out of
 * the top of the frame; the file's wingspan is .356.
 *
 * Constellation: the kit star on every third light at full size, and eight small kit
 * pearls that form on the pearl's ring as the string lands.
 */
export const STAGE_PLACEMENT = {
  lotus: { y: .4, scale: 3.7, tilt: .2 },
  portal: { behind: 3.5, scale: 4.4 },
  butterfly: { scale: 4.2, radius: 11, height: 12.8, dip: 4.5 },
  sparkle: { scale: 3.2, outward: .4 },
  lightSparkle: 1,
  ringPearl: { count: 8, scale: .5, radius: 7.45, lift: .3 },
} as const;

export function smooth(x: number, low: number, high: number) {
  const n = Math.max(0, Math.min(1, (x - low) / (high - low)));
  return n * n * (3 - 2 * n);
}
export function frac(x: number) {
  return x - Math.floor(x);
}
/** A material of the stage's own that ignores the scene fog, so it keeps its colour under the arrival haze. */
export function unfogged<M extends T.Material>(material: M): M {
  (material as T.Material & { fog?: boolean }).fog = false;
  return material;
}

/**
 * An integrated clock.
 *
 * Every drift below changes speed when the pose turns calm. Multiplying the
 * absolute clock by the new speed would teleport the pattern at that instant,
 * which lands exactly on the reveal to reading boundary the viewer is watching,
 * so the rate is integrated instead. In steady state this equals time * rate.
 */
export function flow() {
  let value = 0, last = -1;
  return {
    get value() { return value; },
    advance(time: number, rate: number) {
      const step = last < 0 ? 0 : Math.min(.25, Math.max(0, time - last));
      last = time;
      value += step * rate;
      return value;
    },
  };
}
/** The world clock's step since the last frame, 0 on the first frame and whenever the clock stands still. */
export function ticker() {
  let last = -1;
  return (time: number) => {
    const step = last < 0 ? 0 : Math.min(.25, Math.max(0, time - last));
    last = time;
    return step;
  };
}

/**
 * A sculpted lotus petal that carries its own warm light at the base; `strength` scales
 * that light (.45 for the study's cheap petals, .9 for the kit lotus after the polish round).
 *
 * Verified against three 0.180 `ShaderLib/meshphysical.glsl.js`: `attribute vec2 uv`
 * is declared unconditionally in the vertex prefix, `#include <uv_vertex>` opens
 * `main()`, and `vec3 totalEmissiveRadiance` exists before `<emissivemap_fragment>`
 * and is still summed into `outgoingLight` afterwards.
 */
export function studyLotus(color: string, glow: { value: number }, strength = .45) {
  const petal = new T.MeshPhysicalMaterial({
    color, roughness: .38, sheen: 1, sheenColor: new T.Color("#fff0df"),
    sheenRoughness: .4, clearcoat: .25, side: T.DoubleSide,
  });
  petal.onBeforeCompile = shader => {
    shader.uniforms.lotusGlow = glow;
    shader.vertexShader = "varying float petalU;\n" + shader.vertexShader.replace(
      "#include <uv_vertex>",
      "#include <uv_vertex>\npetalU = uv.y;",
    );
    shader.fragmentShader = "varying float petalU;\nuniform float lotusGlow;\n" + shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1., .62, .74) * lotusGlow * pow(1. - petalU, 2.2) * ${strength.toFixed(3)};`,
    );
  };
  petal.customProgramCacheKey = () => `study-lotus-glow-v2-${strength.toFixed(3)}`;
  return petal;
}

/** The dominant joint of one skinned vertex. */
function dominantJoint(index: T.BufferAttribute | T.InterleavedBufferAttribute, weight: T.BufferAttribute | T.InterleavedBufferAttribute, i: number) {
  let best = 0, bestWeight = -1;
  for (let k = 0; k < 4; k++) {
    const w = weight.getComponent(i, k);
    if (w > bestWeight) { bestWeight = w; best = index.getComponent(i, k); }
  }
  return best;
}
/** Each bone's rest origin in the mesh's own space, from the skin's inverse bind matrices. */
function boneOrigins(mesh: T.SkinnedMesh) {
  const rest = new T.Matrix4();
  return mesh.skeleton.boneInverses.map(inverse =>
    new T.Vector3().setFromMatrixPosition(rest.copy(inverse).invert()).applyMatrix4(mesh.bindMatrixInverse));
}

/**
 * The kit lotus carries no uv (WORLD-INTEGRATION 4.2 asked LW2 for a base to tip `v`;
 * the file exports COLOR_0, JOINTS_0, NORMAL, POSITION and WEIGHTS_0 only), so the study
 * derives one from the skin: every petal is its own bone, so a vertex's distance from its
 * bone's rest origin, over the farthest vertex of that bone, runs 0 at the base and 1 at
 * the tip. Written as `uv.y` on a copy of the geometry so the shared `studyLotus` patch
 * reads it unchanged. The copy is the caller's to register.
 */
export function petalCoordinates(mesh: T.SkinnedMesh): T.BufferGeometry {
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute("position");
  const index = geometry.getAttribute("skinIndex"), weight = geometry.getAttribute("skinWeight");
  const count = position.count;
  const uv = new Float32Array(count * 2);
  if (index && weight) {
    const origins = boneOrigins(mesh);
    const joint = new Int32Array(count), distance = new Float32Array(count), reach = new Map<number, number>();
    const point = new T.Vector3();
    for (let i = 0; i < count; i++) {
      const bone = dominantJoint(index, weight, i);
      joint[i] = bone;
      point.fromBufferAttribute(position, i);
      distance[i] = origins[bone] ? point.distanceTo(origins[bone]) : 0;
      reach.set(bone, Math.max(reach.get(bone) ?? 0, distance[i]));
    }
    for (let i = 0; i < count; i++) {
      const far = reach.get(joint[i]) ?? 0;
      uv[i * 2 + 1] = far > 0 ? distance[i] / far : 0;
    }
  }
  geometry.setAttribute("uv", new T.BufferAttribute(uv, 2));
  return geometry;
}

/**
 * One petal out of the kit's skinned petal cluster (`arrival.petal-drift` is nine petals on
 * nine bones with a `drift` loop): the triangles that belong to `joint`, moved into that
 * bone's own frame so the petal is centred on its origin and can be instanced forty times
 * on the existing drift maths, one draw. Null when the mesh has no skin or the bone owns
 * no whole triangle. The result is the caller's to register.
 */
export function extractJointGeometry(mesh: T.SkinnedMesh, joint: number): T.BufferGeometry | null {
  const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const position = source.getAttribute("position"), normal = source.getAttribute("normal");
  const index = source.getAttribute("skinIndex"), weight = source.getAttribute("skinWeight");
  if (!index || !weight || !mesh.skeleton.boneInverses[joint]) { source.dispose(); return null; }
  const keep: number[] = [];
  for (let t = 0; t + 2 < position.count; t += 3) {
    if (dominantJoint(index, weight, t) === joint && dominantJoint(index, weight, t + 1) === joint && dominantJoint(index, weight, t + 2) === joint) keep.push(t, t + 1, t + 2);
  }
  if (!keep.length) { source.dispose(); return null; }
  const positions = new Float32Array(keep.length * 3), normals = normal ? new Float32Array(keep.length * 3) : null;
  keep.forEach((v, n) => {
    positions[n * 3] = position.getX(v); positions[n * 3 + 1] = position.getY(v); positions[n * 3 + 2] = position.getZ(v);
    if (normals && normal) { normals[n * 3] = normal.getX(v); normals[n * 3 + 1] = normal.getY(v); normals[n * 3 + 2] = normal.getZ(v); }
  });
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(positions, 3));
  if (normals) out.setAttribute("normal", new T.BufferAttribute(normals, 3));
  // Mesh space to bind space to the bone's own frame.
  out.applyMatrix4(mesh.skeleton.boneInverses[joint].clone().multiply(mesh.bindMatrix));
  source.dispose();
  out.computeBoundingSphere();
  return out;
}

/** Every mesh under a kit clone: never culled while its bones move, never in the shadow pass. */
export function settleKitMeshes(root: T.Object3D) {
  root.traverse(object => {
    const mesh = object as T.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}
/** Materials that fade with `presence`: each keeps its authored opacity as the ceiling. */
export type Fading = { material: T.Material; base: number };
export function fadeAll(list: Fading[], presence: number) {
  for (const { material, base } of list) material.opacity = base * presence;
}
/** A copy of an imported kit material the stage owns, made transparent so it can fade, unfogged. */
export function fadingCopy(ctx: StageContext, source: T.Material, fading: Fading[], ceiling?: number) {
  const copy = unfogged(ctx.material(source.clone()));
  copy.transparent = true;
  if (ceiling !== undefined) copy.opacity = ceiling;
  fading.push({ material: copy, base: copy.opacity });
  return copy;
}
/** A remap that builds each material once and hands the same one to every clone. */
export function cachedRemap(build: (name: string, imported: T.Material) => T.Material): MaterialRemap {
  const cache = new Map<string, T.Material>();
  return (name, imported) => {
    let made = cache.get(name);
    if (!made) { made = build(name, imported); cache.set(name, made); }
    return made;
  };
}
