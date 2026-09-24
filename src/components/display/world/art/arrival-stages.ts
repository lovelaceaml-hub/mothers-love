import * as T from "three";
import type { WorldKit } from "../kit/kit-loader";
import { looping, scrubbed, type ScrubbedClip } from "../kit/kit-clips";
import { kitMaterialWords, type MaterialRemap } from "../kit/kit-materials";
import { ARRIVAL_VIEW } from "../world-data";
import { bloomFraction, type ArrivalPose } from "./arrival-choreography";
import { softDot, sparklePoints, studyGlow, studySilk } from "./study-materials";

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

const PEARL_Y = 11.4, PEARL_R = 5.4, BEAM_Y = 15.5;
const UP = new T.Vector3(0, 1, 0), RIGHT = new T.Vector3(1, 0, 0);

/** The reading pearl in entry local space, for the clearance tests. */
export const ARRIVAL_PEARL = { y: PEARL_Y, radius: PEARL_R, clearance: 1.2 } as const;
/** Where `design-world.ts` places the entry stage group in the world. */
export const ENTRY_POSITION = new T.Vector3(4.138, .6, 19.104);
/** The fixed arrival camera, in entry local space: `ARRIVAL_VIEW` minus the stage position. */
export const ARRIVAL_EYE_LOCAL = new T.Vector3(...ARRIVAL_VIEW.eye).sub(ENTRY_POSITION);
const PEARL_CENTRE = new T.Vector3(0, PEARL_Y, 0);
const PEARL_VIEW = ARRIVAL_EYE_LOCAL.clone().sub(PEARL_CENTRE);
const PEARL_DISTANCE = PEARL_VIEW.length();
PEARL_VIEW.normalize();
/** The arrival camera's azimuth around the pearl, in the orbit parametrisation `(cos a, y, sin a)`. */
const CAMERA_AZIMUTH = Math.atan2(ARRIVAL_EYE_LOCAL.z, ARRIVAL_EYE_LOCAL.x);
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

function smooth(x: number, low: number, high: number) {
  const n = Math.max(0, Math.min(1, (x - low) / (high - low)));
  return n * n * (3 - 2 * n);
}
function frac(x: number) {
  return x - Math.floor(x);
}
/** A material of the stage's own that ignores the scene fog, so it keeps its colour under the arrival haze. */
function unfogged<M extends T.Material>(material: M): M {
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
function flow() {
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
function ticker() {
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
function studyLotus(color: string, glow: { value: number }, strength = .45) {
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
function settleKitMeshes(root: T.Object3D) {
  root.traverse(object => {
    const mesh = object as T.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}
/** Materials that fade with `presence`: each keeps its authored opacity as the ceiling. */
type Fading = { material: T.Material; base: number };
function fadeAll(list: Fading[], presence: number) {
  for (const { material, base } of list) material.opacity = base * presence;
}
/** A copy of an imported kit material the stage owns, made transparent so it can fade, unfogged. */
function fadingCopy(ctx: StageContext, source: T.Material, fading: Fading[], ceiling?: number) {
  const copy = unfogged(ctx.material(source.clone()));
  copy.transparent = true;
  if (ceiling !== undefined) copy.opacity = ceiling;
  fading.push({ material: copy, base: copy.opacity });
  return copy;
}
/** A remap that builds each material once and hands the same one to every clone. */
function cachedRemap(build: (name: string, imported: T.Material) => T.Material): MaterialRemap {
  const cache = new Map<string, T.Material>();
  return (name, imported) => {
    let made = cache.get(name);
    if (!made) { made = build(name, imported); cache.set(name, made); }
    return made;
  };
}

/** Petal bloom: a large lit lotus under the pearl, a gated beam and rising petals. */
export function bloomStage(ctx: StageContext): ArrivalStage {
  const group = new T.Group();
  group.name = "Arrival study, petal bloom";
  group.userData.dynamic = true;

  const glow = { value: 0 };
  const lotus = new T.Group();
  lotus.userData.dynamic = true;
  group.add(lotus);

  // The kit lotus (WORLD-INTEGRATION 4.2): every petal material becomes the study's lit
  // petal at the polish round's deeper tints and doubled base light, the gold keeps the
  // study gold, the glowing seed pod keeps the light the file authored (emissive strength
  // 4, no clamp), and the `bloom` clip is scrubbed by the pose so the last frame lands
  // exactly when reading begins. Nothing of it takes the scene fog.
  let kitLotus: { root: T.Object3D; clip: ScrubbedClip } | undefined;
  const kit = ctx.kit;
  const lotusClip = kit?.has(STAGE_KIT.lotus) ? kit.asset(STAGE_KIT.lotus)?.clips.get("bloom") : undefined;
  if (kit && lotusClip) {
    const tints: Record<string, string> = { petal: "#f09ab8", petalpearl: "#f5c3d3", petalinnerglow: "#ffd1bd" };
    const remap = cachedRemap((name, imported) => {
      const words = kitMaterialWords(name);
      if (words.includes("petal")) return unfogged(ctx.material(studyLotus(tints[words.join("")] ?? tints.petal, glow, .9)));
      if (words.includes("gold") && words.includes("glow")) return unfogged(ctx.material(imported.clone()));
      if (words.includes("gold")) return unfogged(ctx.material(ctx.gold.clone()));
      return unfogged(ctx.material(imported.clone()));
    });
    const root = kit.instance(STAGE_KIT.lotus, remap);
    root.traverse(object => {
      const skinned = object as T.SkinnedMesh;
      if (skinned.isSkinnedMesh) skinned.geometry = ctx.geometry(petalCoordinates(skinned));
    });
    settleKitMeshes(root);
    root.position.set(0, STAGE_PLACEMENT.lotus.y, 0);
    // Leaned toward the arrival camera about the horizontal axis square to it, so the open
    // face and the seed pod read below the disc instead of hiding behind it.
    const toward = new T.Vector3(ARRIVAL_EYE_LOCAL.x, 0, ARRIVAL_EYE_LOCAL.z).normalize();
    root.quaternion.setFromAxisAngle(new T.Vector3(toward.z, 0, -toward.x), STAGE_PLACEMENT.lotus.tilt);
    lotus.add(root);
    kitLotus = { root, clip: scrubbed(root, lotusClip) };
    kitLotus.clip.set(0);
  }
  const outer = kitLotus ? undefined : ctx.instance(lotus, ctx.lotusShape, ctx.material(studyLotus("#f4b3c8", glow)), 10);
  const inner = kitLotus ? undefined : ctx.instance(lotus, ctx.lotusShape, ctx.material(studyLotus("#f9d0da", glow)), 8);
  if (outer && inner) {
    outer.receiveShadow = inner.receiveShadow = false;
    outer.frustumCulled = inner.frustumCulled = false;
  }

  const dot = ctx.texture(softDot(64));
  function coreSprite(scale: number, color: string) {
    const sprite = new T.Sprite(ctx.material(new T.SpriteMaterial({
      map: dot, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
      color: new T.Color(color), opacity: 0,
    })));
    sprite.scale.setScalar(scale);
    sprite.position.set(0, 2.6, 0);
    // Section 6: the entrance light is the brightest thing in the study, so it joins the glow layer.
    sprite.layers.enable(1);
    group.add(sprite);
    return sprite;
  }
  const halo = coreSprite(7.5, "#ffd2a6"), core = coreSprite(3.5, "#fff3dc");

  // The gate keeps the beam off the pearl's text band, above and below it only.
  const beamFlow = flow();
  const beamUniforms = {
    flow: { value: 0 }, form: { value: 0 }, presence: { value: 0 },
    pearlY: { value: PEARL_Y }, pearlR: { value: PEARL_R }, baseY: { value: BEAM_Y },
  };
  const beam = new T.Mesh(
    ctx.geometry(new T.CylinderGeometry(.75, 2.7, 27, 32, 1, true)),
    ctx.material(new T.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide,
      blending: T.AdditiveBlending, fog: false, uniforms: beamUniforms,
      vertexShader: `varying vec2 beamUv; varying vec3 beamNormal, beamView; varying float beamY; uniform float baseY;
        void main(){ beamUv = uv; beamNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.); beamView = -mv.xyz; beamY = position.y + baseY;
        gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 beamUv; varying vec3 beamNormal, beamView; varying float beamY;
        uniform float flow, form, presence, pearlY, pearlR;
        void main(){
          // The chord through an open cone peaks on its axis, so the shaft is brightest
          // down the middle and fades out at its own silhouette instead of outlining a tube.
          float shaft = pow(abs(dot(normalize(beamNormal), normalize(beamView))), 1.6);
          float vertical = smoothstep(0., .05, beamUv.y) * (1. - smoothstep(.48, .92, beamUv.y));
          float streaks = .75 + .25 * sin(beamUv.y * 38. - flow + beamUv.x * 12.6);
          float gate = smoothstep(0., 1.6, abs(beamY - pearlY) - pearlR * .90);
          vec3 color = mix(vec3(1., .93, .80), vec3(1., .76, .86), beamUv.y);
          gl_FragColor = vec4(color * shaft * vertical * streaks * gate * form * presence * .12, 1.);
          #include <colorspace_fragment>
        }`,
    })),
  );
  beam.position.set(0, BEAM_Y, 0);
  beam.frustumCulled = false;
  beam.layers.enable(1);
  group.add(beam);

  // Drifting petals: the kit's single petal when the cluster file is present (WORLD-INTEGRATION
  // 4.2, one draw on the same drift maths), else the study's cheap petal. The kit petal is
  // scaled so it fills the same silhouette the cheap petal did.
  const driftCount = 40, driftFlow = flow();
  const driftMaterial = ctx.material(new T.MeshPhysicalMaterial({
    color: "#f7c2d4", roughness: .4, sheen: 1, sheenColor: new T.Color("#fff0df"),
    sheenRoughness: .4, side: T.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
  }));
  let driftGeometry: T.BufferGeometry = ctx.farPetal, driftScale = 1;
  if (kit?.has(STAGE_KIT.petals)) {
    let skinned: T.SkinnedMesh | undefined;
    kit.asset(STAGE_KIT.petals)?.template.traverse(object => {
      if (!skinned && (object as T.SkinnedMesh).isSkinnedMesh) skinned = object as T.SkinnedMesh;
    });
    const single = skinned ? extractJointGeometry(skinned, 0) : null;
    if (single) {
      ctx.farPetal.computeBoundingSphere();
      const own = ctx.farPetal.boundingSphere?.radius ?? 1, theirs = single.boundingSphere?.radius ?? 1;
      driftGeometry = ctx.geometry(single);
      driftScale = theirs > 0 ? own / theirs : 1;
    }
  }
  const kitPetals = driftGeometry !== ctx.farPetal;
  if (kitPetals) unfogged(driftMaterial);
  const drift = ctx.instance(group, driftGeometry, driftMaterial, driftCount);
  drift.receiveShadow = false;
  drift.frustumCulled = false;
  const driftRandom = ctx.seededRandom(3307);
  const driftAngle = new Float32Array(driftCount), driftPhase = new Float32Array(driftCount);
  const driftSpeed = new Float32Array(driftCount), driftSize = new Float32Array(driftCount);
  const driftSpin = new Float32Array(driftCount);
  for (let i = 0; i < driftCount; i++) {
    driftAngle[i] = driftRandom() * Math.PI * 2;
    driftPhase[i] = driftRandom();
    driftSpeed[i] = .05 + driftRandom() * .04;
    driftSize[i] = .55 + driftRandom() * .45;
    driftSpin[i] = driftRandom() * Math.PI * 2;
  }
  const clearance = { distance: 0, front: 0 };

  const dummy = new T.Object3D(), spin = new T.Quaternion(), pitch = new T.Quaternion();
  function writeRing(target: T.InstancedMesh, count: number, offset: number, tilt: number, scale: number[]) {
    for (let i = 0; i < count; i++) {
      const fan = i * Math.PI * 2 / count + offset;
      // Spun last, so every petal pitches within its own radial frame and the lotus stays round.
      dummy.quaternion.copy(spin.setFromAxisAngle(UP, fan)).multiply(pitch.setFromAxisAngle(RIGHT, tilt));
      dummy.position.set(0, .4, 0);
      dummy.scale.set(scale[0], scale[1], scale[2]);
      dummy.updateMatrix();
      target.setMatrixAt(i, dummy.matrix);
    }
    target.instanceMatrix.needsUpdate = true;
  }

  return {
    group,
    update(pose, time, effects) {
      if (kitLotus) {
        // Closed bud rising through the approach, opening through the reveal, open for reading,
        // and sinking back still open while the light dissolves.
        kitLotus.clip.set(bloomFraction(pose));
        kitLotus.root.scale.setScalar(STAGE_PLACEMENT.lotus.scale * (.15 + .85 * pose.gather * (1 - pose.dissolve)));
      } else if (outer && inner) {
        const open = pose.form * (1 - pose.dissolve * .35);
        writeRing(outer, 10, 0, -.95 + open * 1.0, [3.9, 6.2, 7.3]);
        writeRing(inner, 8, Math.PI / 8, -.95 + open * .62, [2.9, 7.6, 5.2]);
        lotus.scale.setScalar(.15 + .85 * pose.gather);
      }
      glow.value = (.25 * pose.gather + .75 * pose.form) * (1 - pose.dissolve);
      halo.material.opacity = .12 * pose.presence * (.3 + .7 * pose.form);
      core.material.opacity = .18 * pose.presence * pose.form;
      beamUniforms.flow.value = beamFlow.advance(time, pose.calm ? .35 : 1.2);
      beamUniforms.form.value = pose.form;
      beamUniforms.presence.value = pose.presence;

      drift.visible = effects.trails;
      if (drift.visible) {
        const rate = pose.calm ? .35 : pose.dissolve > 0 ? 1.8 : 1;
        const carried = driftFlow.advance(time, rate);
        for (let i = 0; i < driftCount; i++) {
          const p = frac(driftPhase[i] + carried * driftSpeed[i]);
          const angle = driftAngle[i] + p * 1.4, r = 2.5 + p * 5;
          dummy.position.set(Math.cos(angle) * r, 3 + p * 24, Math.sin(angle) * r);
          dummy.quaternion.identity();
          dummy.rotation.set(p * 6 + driftSpin[i], angle, p * 3);
          let size = driftSize[i] * (1 - p * .4);
          if (kitPetals) {
            // The kit petal is a real shape, so it never crosses the words: a petal rising in
            // front of the disc thins to nothing inside the pearl's clearance ring.
            pearlClearance(dummy.position, clearance);
            if (clearance.front > -.6) size *= smooth(clearance.distance, PEARL_R + .2, PEARL_R + ARRIVAL_PEARL.clearance);
            size *= driftScale;
          }
          dummy.scale.setScalar(Math.max(.0001, size));
          dummy.updateMatrix();
          drift.setMatrixAt(i, dummy.matrix);
        }
        drift.instanceMatrix.needsUpdate = true;
        // The petals begin to rise about two seconds before the reveal (gather .6 is three
        // seconds into the five second approach) so the air above the opening bud is not
        // empty, then fill in with the bloom.
        driftMaterial.opacity = pose.presence * Math.min(1, .6 * smooth(pose.gather, .6, 1) + .4 * pose.form);
      }
    },
    dispose() {
      kitLotus?.clip.dispose();
    },
  };
}

/**
 * The silk's centre line: one broad loop around the pearl, exported for the clearance test.
 *
 * Plan 26: the loop widened from 7.3 (plus .9 of breathing) to 8.4 (plus .6) so that every
 * point the arrival camera sees in front of the disc keeps the full 1.2 unit clearance
 * outside the pearl's radius at 1920 by 1080 (WORLD-INTEGRATION 4.3); the nearest such point
 * of the old loop came within .5 of the radius. Measured by `tests/world/arrival-stages.test.ts`.
 */
export function ribbonSilkAngle(s: number, turn: number) {
  return s * Math.PI * 2 + 5.3 + turn;
}
export function ribbonSilkCentre(s: number, turn: number, out: T.Vector3) {
  const a = ribbonSilkAngle(s, turn), r = 8.4 + .6 * Math.sin(s * Math.PI * 4 + 1);
  return out.set(Math.cos(a) * r, PEARL_Y + (s - .5) * 20 + 1.1 * Math.sin(1.5 * a), Math.sin(a) * r);
}
/** The bounded sway: `turn` never leaves this range, so the loop never accumulates onto the words. */
export const RIBBON_SWAY = .12;
/** The silk's half width at its broadest, thinned about 30 percent in the polish round (was 2.05). */
export const RIBBON_WIDTH = 1.45;

/**
 * The study silk with a fold highlight on its broad face: the `fold` attribute (0 to 1,
 * the crest of each fold the stage writes with the positions) lifts a soft ivory light on
 * the crests, so the folds read on the face and not only at the grazing edges `studySilk`
 * already lights. Inserted before the glow pass mix `studyGlow` adds afterwards, so the
 * glow layer is unchanged.
 */
function foldedSilk() {
  const silk = studySilk();
  const previous = silk.onBeforeCompile.bind(silk), key = silk.customProgramCacheKey();
  silk.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.vertexShader = "attribute float fold;\nvarying float silkFold;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nsilkFold = fold;",
    );
    shader.fragmentShader = "varying float silkFold;\n" + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      "outgoingLight += vec3(1., .94, .97) * pow(silkFold, 3.) * .34;\n#include <opaque_fragment>",
    );
  };
  silk.customProgramCacheKey = () => `${key}|silk-fold-v1`;
  return silk;
}

/** Silk unveiling: one broad tapered ribbon, a thin gold ring and a few butterflies. */
export function ribbonStage(ctx: StageContext): ArrivalStage {
  const group = new T.Group();
  group.name = "Arrival study, silk unveiling";
  group.userData.dynamic = true;

  const ringMaterial = ctx.material(ctx.gold.clone());
  ringMaterial.transparent = true;
  const faintMaterial = ctx.material(ctx.gold.clone());
  faintMaterial.transparent = true;
  const ring = new T.Mesh(ctx.geometry(new T.TorusGeometry(7.55, .04, 8, 200)), ringMaterial);
  ring.position.set(0, PEARL_Y, 0);
  ring.rotation.set(.09, -.2, -.14);
  const faint = new T.Mesh(ctx.geometry(new T.TorusGeometry(8.35, .014, 6, 200)), faintMaterial);
  faint.position.set(0, PEARL_Y, 0);
  faint.rotation.set(-.06, .35, .1);
  group.add(ring, faint);

  // The kit ribbon portal (WORLD-INTEGRATION 4.3) frames the pearl from behind: its gold
  // takes the study gold, its pearl the study ivory, its satin tails the study silk with the
  // file's own two tones (COLOR_0, pink and white) showing through at an .85 ceiling, and
  // the glowing finials keep their own light. Every material is the stage's own transparent,
  // unfogged copy so the whole arch fades with presence while it scales up from its base
  // with gather.
  const kit = ctx.kit;
  const fading: Fading[] = [];
  let arch: T.Object3D | undefined;
  if (kit?.has(STAGE_KIT.portal)) {
    const remap = cachedRemap((name, imported) => {
      const words = kitMaterialWords(name);
      if (words.includes("gold") && words.includes("glow")) return fadingCopy(ctx, imported, fading);
      if (words.includes("gold")) return fadingCopy(ctx, ctx.gold, fading);
      if (words.includes("silk") || words.includes("ribbon")) {
        const satin = studySilk();
        satin.vertexColors = true;
        satin.color.set("#fff2f6");
        satin.emissive.set("#f6b6cc");
        satin.emissiveIntensity = .1;
        return fadingCopy(ctx, satin, fading, .85);
      }
      if (words.includes("pearl") || words.includes("ivory")) return fadingCopy(ctx, ctx.ivory, fading);
      return fadingCopy(ctx, imported, fading);
    });
    arch = kit.instance(STAGE_KIT.portal, remap);
    settleKitMeshes(arch);
    // Behind the pearl along the camera's line, its face (the file's +z) turned to the camera.
    arch.position.set(-Math.cos(CAMERA_AZIMUTH) * STAGE_PLACEMENT.portal.behind, 0, -Math.sin(CAMERA_AZIMUTH) * STAGE_PLACEMENT.portal.behind);
    arch.rotation.y = Math.PI / 2 - CAMERA_AZIMUTH;
    group.add(arch);
  }

  const columns = 241, rows = 11;
  const silkGeometry = ctx.geometry(new T.PlaneGeometry(1, 1, columns - 1, rows - 1));
  const foldAttribute = new T.BufferAttribute(new Float32Array(columns * rows), 1);
  foldAttribute.setUsage(T.DynamicDrawUsage);
  silkGeometry.setAttribute("fold", foldAttribute);
  // `silkF` is the grazing angle term studySilk leaves in scope, so the glow layer receives the
  // lit folded edges of the ribbon and not its broad face; the fold crests light the face itself.
  const silk = new T.Mesh(silkGeometry, unfogged(ctx.material(
    studyGlow(foldedSilk(), "silk", "vec3(1., .80, .88) * silkF * .55", "silkF * .6"),
  )));
  silk.userData.dynamic = true;
  silk.frustumCulled = false;
  silk.layers.enable(1);
  group.add(silk);
  const silkFlow = flow(), foldFlow = flow();
  const centers = new Float32Array(columns * 3), widthAxis = new Float32Array(columns * 3);
  const foldAxis = new Float32Array(columns * 3), widths = new Float32Array(columns);
  const c0 = new T.Vector3(), c1 = new T.Vector3(), c2 = new T.Vector3();
  const tangent = new T.Vector3(), up = new T.Vector3(), across = new T.Vector3(), normal = new T.Vector3();
  // One broad loop, not a multi turn helix, so the ribbon reads around the pearl and never
  // over its text (the loop and its clearance are defined and measured above).
  const silkAngle = ribbonSilkAngle, silkCenter = ribbonSilkCentre;

  // Butterflies: six kit butterflies on their `flap` loop when the file is present, each on
  // its own mixer advanced by the world clock (6 Hz in flight, .55 of that at calm), pale
  // pink wings with the file's gold edge; else three pairs of the study's cheap petal wings.
  const wings = 6;
  const butterflyMaterial = ctx.material(new T.MeshPhysicalMaterial({
    color: "#fff7f0", sheen: 1, sheenColor: new T.Color("#ffe9f2"),
    side: T.DoubleSide, transparent: true, opacity: .95, roughness: .5,
  }));
  type Flyer = { root: T.Object3D; mixer: T.AnimationMixer };
  const flyers: Flyer[] = [];
  const flapClip = kit?.has(STAGE_KIT.butterfly) ? kit.asset(STAGE_KIT.butterfly)?.clips.get("flap") : undefined;
  if (kit && flapClip) {
    const remap = cachedRemap((name, imported) => {
      const words = kitMaterialWords(name);
      if (words.includes("gold")) return fadingCopy(ctx, ctx.gold, fading);
      if (words.includes("wing")) {
        // The file's wing is a flat lavender through COLOR_0; the board's butterflies are pale
        // pink with a gold edge, so the copy drops the vertex tint for its own.
        const wing = fadingCopy(ctx, imported, fading) as T.MeshStandardMaterial;
        wing.vertexColors = false;
        wing.color.set("#fbe9f4");
        wing.emissive.set("#f7d6ea");
        wing.emissiveIntensity = .3;
        return wing;
      }
      return fadingCopy(ctx, imported, fading);
    });
    for (let k = 0; k < wings; k++) {
      const root = kit.instance(STAGE_KIT.butterfly, remap);
      settleKitMeshes(root);
      root.scale.setScalar(STAGE_PLACEMENT.butterfly.scale);
      group.add(root);
      flyers.push({ root, mixer: looping(root, flapClip, 1) });
    }
  }
  const butterflies = flyers.length ? undefined : ctx.instance(group, ctx.farPetal, butterflyMaterial, wings);
  if (butterflies) {
    butterflies.receiveShadow = false;
    butterflies.frustumCulled = false;
  }
  const orbitFlow = flow(), flapFlow = flow(), tick = ticker();
  const ahead = new T.Vector3();
  /**
   * A kit butterfly's place on the orbit: radius 11 around the pearl, low where the orbit
   * passes in front of the pearl and high behind it (`dip`), so that at reading no flyer
   * ever enters the pearl's clearance ring or the top 15 percent of the frame; each has its
   * own height and a small bob, and `entering` lifts the whole flock during the approach.
   */
  function flyerPlace(b: number, k: number, time: number, entering: number, out: T.Vector3) {
    const { radius, height, dip } = STAGE_PLACEMENT.butterfly;
    const y = height - dip * Math.cos(b - CAMERA_AZIMUTH) + .5 * Math.sin(k * 2.1) + .3 * Math.sin(time * .9 + k) + entering;
    return out.set(Math.cos(b) * radius, y, Math.sin(b) * radius);
  }

  const glowSprite = new T.Sprite(ctx.material(new T.SpriteMaterial({
    map: ctx.texture(softDot(64)), blending: T.AdditiveBlending, depthWrite: false,
    transparent: true, toneMapped: false, color: new T.Color("#ffe4ec"), opacity: 0,
  })));
  glowSprite.scale.setScalar(22);
  glowSprite.position.set(0, PEARL_Y, -2.5);
  glowSprite.layers.enable(1);
  group.add(glowSprite);

  const dummy = new T.Object3D();
  return {
    group,
    update(pose, time, effects) {
      const scale = .72 + .28 * pose.gather;
      ring.scale.setScalar(scale);
      faint.scale.setScalar(scale);
      ringMaterial.opacity = pose.presence;
      faintMaterial.opacity = .55 * pose.presence;
      if (arch) {
        arch.scale.setScalar(STAGE_PLACEMENT.portal.scale * scale);
        arch.visible = pose.presence > 0;
      }
      fadeAll(fading, pose.presence);

      // A bounded sway, not an accumulating rotation: a rotation that kept adding up
      // would carry the ribbon across the pearl's text after a long unattended run.
      const turn = RIBBON_SWAY * Math.sin(silkFlow.advance(time, pose.calm ? .09 : .22));
      const fold = foldFlow.advance(time, pose.calm ? .4 : 1.2);
      for (let i = 0; i < columns; i++) {
        const u = i / (columns - 1);
        const s = Math.max(Math.min(u, pose.gather * 1.02), pose.dissolve);
        widths[i] = RIBBON_WIDTH * Math.pow(Math.max(0, Math.sin(Math.PI * s)), .55)
          * (1 - smooth(u, pose.gather - .08, pose.gather)) * smooth(u, pose.dissolve, pose.dissolve + .08);
        silkCenter(s, turn, c0);
        silkCenter(s + .0015, turn, c1);
        silkCenter(s - .0015, turn, c2);
        tangent.subVectors(c1, c2).normalize();
        const a = silkAngle(s, turn);
        up.set(Math.cos(a) * .35, 1, Math.sin(a) * .35).normalize();
        across.copy(up).addScaledVector(tangent, -up.dot(tangent)).normalize();
        normal.crossVectors(tangent, across);
        centers[i * 3] = c0.x; centers[i * 3 + 1] = c0.y; centers[i * 3 + 2] = c0.z;
        widthAxis[i * 3] = across.x; widthAxis[i * 3 + 1] = across.y; widthAxis[i * 3 + 2] = across.z;
        foldAxis[i * 3] = normal.x; foldAxis[i * 3 + 1] = normal.y; foldAxis[i * 3 + 2] = normal.z;
      }
      const position = silkGeometry.getAttribute("position");
      for (let j = 0; j < rows; j++) {
        const v = j / (rows - 1) - .5;
        for (let i = 0; i < columns; i++) {
          const u = i / (columns - 1);
          const s = Math.max(Math.min(u, pose.gather * 1.02), pose.dissolve);
          const crest = Math.sin(s * 140 + v * 9 + fold);
          const lift = .07 * crest * (1 - pose.form * .45)
            + .18 * Math.sin(s * 22 + time * .3) * v;
          const w = v * widths[i], k = i * 3;
          position.setXYZ(
            j * columns + i,
            centers[k] + widthAxis[k] * w + foldAxis[k] * lift,
            centers[k + 1] + widthAxis[k + 1] * w + foldAxis[k + 1] * lift,
            centers[k + 2] + widthAxis[k + 2] * w + foldAxis[k + 2] * lift,
          );
          foldAttribute.setX(j * columns + i, Math.max(0, crest));
        }
      }
      position.needsUpdate = true;
      foldAttribute.needsUpdate = true;
      silkGeometry.computeVertexNormals();

      const orbit = orbitFlow.advance(time, pose.calm ? .08 : .16);
      const entering = (1 - pose.form) * 18 + 14 * pose.dissolve;
      if (flyers.length) {
        const step = tick(time) * (pose.calm ? 1.65 : 3);
        flyers.forEach((flyer, k) => {
          flyer.root.visible = effects.trails && pose.presence > 0;
          const b = orbit + k * Math.PI * 2 / wings;
          flyerPlace(b, k, time, entering, flyer.root.position);
          // The head points +z in the file, so looking a little ahead along the orbit flies it forward.
          // `ahead` is in the stage's own frame and lookAt takes a world point, so the stage group
          // (which sits under the entry group, well away from the world origin) converts it first.
          flyerPlace(b + .05, k, time, entering, ahead);
          flyer.root.lookAt(group.localToWorld(ahead));
          if (step > 0) flyer.mixer.update(step);
        });
      } else if (butterflies) {
        const flap = flapFlow.advance(time, pose.calm ? 5 : 7);
        for (let k = 0; k < 3; k++) {
          const b = orbit + k * 2.09;
          const f = .3 + .6 * Math.abs(Math.sin(flap + k));
          const cx = Math.cos(b) * 9.2, cz = Math.sin(b) * 9.2;
          const cy = PEARL_Y + 7.5 + 2.5 * Math.sin(k * 2.1) + .6 * Math.sin(time * .9 + k) + entering;
          for (const side of [-1, 1]) {
            dummy.position.set(cx + Math.cos(b) * .28 * side, cy, cz + Math.sin(b) * .28 * side);
            dummy.quaternion.identity();
            dummy.rotation.set(-Math.PI / 2 + .2, f * side, -b);
            dummy.scale.setScalar(.85);
            dummy.updateMatrix();
            butterflies.setMatrixAt(k * 2 + (side === -1 ? 0 : 1), dummy.matrix);
          }
        }
        butterflies.instanceMatrix.needsUpdate = true;
        butterflyMaterial.opacity = .95 * pose.presence;
        butterflies.visible = effects.trails;
      }
      // Capped at .15 so the arch's interior is a glow, not a white blowout, through the reveal.
      glowSprite.material.opacity = .15 * pose.presence;
    },
    dispose() {
      for (const flyer of flyers) { flyer.mixer.stopAllAction(); flyer.mixer.uncacheRoot(flyer.root); }
    },
  };
}

/** Where the string of lights lands: the upper left of the pearl's own ring, outside the words. */
export const CONSTELLATION_LANDING = new T.Vector3(-5.534, 16.07, 1.525);
const LANDING_AZIMUTH = Math.atan2(CONSTELLATION_LANDING.z, CONSTELLATION_LANDING.x);
const LANDING_RADIUS = Math.hypot(CONSTELLATION_LANDING.x, CONSTELLATION_LANDING.z);
/**
 * The string's path (polish round): a helix of one and a quarter turns that starts 30 units
 * above the pearl's centre at radius 12 and tightens onto the landing, arcing over the front
 * of the pearl high in the frame, swinging right and behind it on a four unit plateau (the
 * pass directly behind the pearl lies on the camera's line of sight, so only height keeps it
 * clear of the disc), then dropping along the ring's upper left into the landing. `s` 0 is
 * the top, 1 the landing. Measured against the words by the test: every point the camera
 * sees in front of the disc keeps the full clearance, no point, even behind, reaches the
 * disc itself, and about half of the string is inside the 1080p frame while reading.
 */
export function constellationPoint(s: number, out: T.Vector3) {
  const remaining = 1 - s;
  const a = LANDING_AZIMUTH + 2.5 * Math.PI * remaining;
  const r = LANDING_RADIUS + (12 - LANDING_RADIUS) * Math.pow(remaining, .35);
  const y = CONSTELLATION_LANDING.y + 25 * Math.pow(remaining, 2.5) + 4 * smooth(s, .5, .7) * (1 - smooth(s, .86, 1));
  return out.set(Math.cos(a) * r, y, Math.sin(a) * r);
}

/** Pearl formation: a string of small lights descending from the sky into the pearl's ring. */
export function constellationStage(ctx: StageContext): ArrivalStage {
  const group = new T.Group();
  group.name = "Arrival study, pearl formation";
  group.userData.dynamic = true;

  // Sampled evenly along the helix's arc so the lights sit at one spacing from the top of
  // the frame to the landing, which the analytic parameter alone would not give.
  const landing = CONSTELLATION_LANDING.clone();
  const samples = Array.from({ length: 96 }, (_, i) => constellationPoint(i / 95, new T.Vector3()));
  samples[samples.length - 1].copy(landing);
  const curve = new T.CatmullRomCurve3(samples);

  const count = 200;
  const kit = ctx.kit;
  // The kit sparkle (WORLD-INTEGRATION 4.4): every third light, the gold one, becomes the
  // kit's star on its own instanced mesh (one draw per material), additive so the string
  // glows, and the landing flash gains the same star on its `twinkle` loop. The string
  // itself stays points of light.
  const sparkleGeometry = kit?.has(STAGE_KIT.sparkle) ? kit.geometry(STAGE_KIT.sparkle) : undefined;
  const starred = !!sparkleGeometry && sparkleGeometry.getAttribute("position")?.count > 0;
  const isStar = (i: number) => starred && i % 3 === 0;
  const dotCount = starred ? count - Math.ceil(count / 3) : count, starCount = count - dotCount;
  const lights = ctx.instance(group, ctx.pollen, ctx.material(new T.MeshBasicMaterial({
    color: "#ffffff", toneMapped: false,
  })), dotCount);
  lights.receiveShadow = false;
  lights.frustumCulled = false;
  lights.layers.enable(1);
  let stars: T.InstancedMesh | undefined;
  if (starred && sparkleGeometry) {
    const names: string[] = sparkleGeometry.userData.kitMaterials ?? [];
    const materials = names.map(name => {
      const halo = kitMaterialWords(name).includes("halo");
      return ctx.material(new T.MeshBasicMaterial({
        color: "#fff1cf", toneMapped: false, transparent: true, depthWrite: false,
        blending: T.AdditiveBlending, opacity: halo ? .45 : 1,
      }));
    });
    stars = ctx.instance(group, sparkleGeometry, materials[0], starCount);
    // One draw per kit material: the merged geometry carries a group per material slot.
    if (materials.length > 1) stars.material = materials;
    stars.receiveShadow = false;
    stars.frustumCulled = false;
    stars.layers.enable(1);
  }
  const slot = new Int32Array(count);
  {
    let dot = 0, star = 0;
    for (let i = 0; i < count; i++) slot[i] = isStar(i) ? star++ : dot++;
  }
  const places = new Float32Array(count * 3), phases = new Float32Array(count);
  const sizes = new Float32Array(count), base: T.Color[] = [];
  const random = ctx.seededRandom(5101);
  const dummy = new T.Object3D(), tint = new T.Color(), gold = new T.Color("#e6c07a"), pearl = new T.Color("#fff3df");
  const point = new T.Vector3();
  for (let i = 0; i < count; i++) {
    curve.getPointAt(i / (count - 1), point);
    places[i * 3] = point.x; places[i * 3 + 1] = point.y; places[i * 3 + 2] = point.z;
    phases[i] = random();
    sizes[i] = isStar(i) ? STAGE_PLACEMENT.lightSparkle : i % 3 === 0 ? .1 : .075;
    base.push((i % 3 === 0 ? gold : pearl).clone());
    // Written for every instance in the builder, so instanceColor exists before the first update.
    (isStar(i) ? stars! : lights).setColorAt(slot[i], base[i]);
  }
  lights.instanceColor!.needsUpdate = true;
  if (stars?.instanceColor) stars.instanceColor.needsUpdate = true;

  const glowGeometry = ctx.geometry(new T.BufferGeometry());
  glowGeometry.setAttribute("position", new T.BufferAttribute(places, 3));
  glowGeometry.setAttribute("phase", new T.BufferAttribute(phases, 1));
  const dot = ctx.texture(softDot(32));
  const glow = new T.Points(glowGeometry, ctx.material(sparklePoints(ctx.time, 1.5, "#fff0cc", .85, dot)));
  glow.frustumCulled = false;
  glow.layers.enable(1);
  group.add(glow);

  const flash = new T.Sprite(ctx.material(new T.SpriteMaterial({
    map: dot, blending: T.AdditiveBlending, depthWrite: false, transparent: true,
    toneMapped: false, color: new T.Color("#fff2d8"), opacity: 0,
  })));
  flash.scale.setScalar(4);
  flash.position.set(places[(count - 1) * 3], places[(count - 1) * 3 + 1], places[(count - 1) * 3 + 2]);
  flash.layers.enable(1);
  group.add(flash);

  // The landing star: the kit sparkle on its `twinkle` loop, sitting a little outside the
  // landing so its points stay clear of the pearl's clearance ring.
  let landingStar: { root: T.Object3D; mixer: T.AnimationMixer } | undefined;
  const starFading: Fading[] = [];
  const twinkle = kit?.has(STAGE_KIT.sparkle) ? kit.asset(STAGE_KIT.sparkle)?.clips.get("twinkle") : undefined;
  if (kit && twinkle) {
    const remap = cachedRemap((_name, imported) => fadingCopy(ctx, imported, starFading));
    const root = kit.instance(STAGE_KIT.sparkle, remap);
    settleKitMeshes(root);
    const outward = landing.clone().sub(PEARL_CENTRE).normalize().multiplyScalar(STAGE_PLACEMENT.sparkle.outward);
    root.position.copy(landing).add(outward);
    root.scale.setScalar(STAGE_PLACEMENT.sparkle.scale);
    root.visible = false;
    group.add(root);
    landingStar = { root, mixer: looping(root, twinkle, 1) };
  }

  // Pearls forming on the ring (polish round): eight small kit pearls on the circle the
  // landing lies on, in the plane facing the arrival camera, a little in front of it so they
  // sit on the orbit, growing in one after another as the pulse runs down the string and
  // holding through the reading. The ring's radius keeps them outside the clearance ring.
  const ringPearls = kit?.has(STAGE_KIT.pearl) ? (() => {
    const { count: pearls, radius } = STAGE_PLACEMENT.ringPearl;
    const geometry = kit.geometry(STAGE_KIT.pearl);
    if (!(geometry.getAttribute("position")?.count > 0)) return undefined;
    const material = unfogged(ctx.material(new T.MeshPhysicalMaterial({
      color: "#fff4e8", roughness: .14, metalness: .06, clearcoat: 1, clearcoatRoughness: .12,
      iridescence: .45, iridescenceIOR: 1.3, sheen: .4, sheenColor: new T.Color("#ffd9e6"),
      emissive: new T.Color("#ffe8f0"), emissiveIntensity: .08,
    })));
    const mesh = ctx.instance(group, geometry, material, pearls);
    mesh.name = "ring pearls";
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const u = landing.clone().sub(PEARL_CENTRE);
    u.addScaledVector(PEARL_VIEW, -u.dot(PEARL_VIEW)).normalize();
    const v = new T.Vector3().crossVectors(PEARL_VIEW, u);
    const at: T.Vector3[] = [];
    for (let k = 0; k < pearls; k++) {
      const theta = (k + .5) * Math.PI * 2 / pearls;
      at.push(PEARL_CENTRE.clone().addScaledVector(u, Math.cos(theta) * radius).addScaledVector(v, Math.sin(theta) * radius)
        .addScaledVector(PEARL_VIEW, STAGE_PLACEMENT.ringPearl.lift));
    }
    return { mesh, at };
  })() : undefined;
  const tick = ticker();

  // Reading starts with the last reveal pulse still fading, so the calm twinkle is
  // blended in over 1.5 s instead of switching formulas on one frame. Reduced motion
  // enters at reading with no reveal frame behind it, so it starts fully calm.
  let calmSince: number | undefined, sawReveal = false;
  return {
    group,
    update(pose, time, effects) {
      if (!pose.calm) { calmSince = undefined; sawReveal = pose.active; }
      else if (calmSince === undefined) calmSince = sawReveal ? time : time - 2;
      const settled = pose.calm ? Math.max(0, Math.min(1, (time - (calmSince ?? time)) / 1.5)) : 0;
      for (let i = 0; i < count; i++) {
        const s = i / (count - 1);
        let scale = sizes[i] * smooth(pose.gather * 1.08, s - .06, s + .02);
        if (pose.dissolve > 0) scale *= 1 - smooth(pose.dissolve * 1.1, s - .05, s + .05);
        dummy.position.set(places[i * 3], places[i * 3 + 1], places[i * 3 + 2]);
        dummy.quaternion.identity();
        if (isStar(i)) dummy.rotation.set(0, 0, phases[i] * Math.PI);
        dummy.scale.setScalar(Math.max(.0001, scale));
        dummy.updateMatrix();
        const target = isStar(i) ? stars! : lights;
        target.setMatrixAt(slot[i], dummy.matrix);
        const pulse = .55 + .45 * Math.pow(Math.max(0, Math.cos((s - pose.form * 1.15) * 5.5)), 3);
        const twinkleLight = .8 + .1 * Math.sin(time * 1.3 + i);
        const bright = pulse + (twinkleLight - pulse) * settled;
        target.setColorAt(slot[i], tint.copy(base[i]).multiplyScalar(bright));
      }
      lights.instanceMatrix.needsUpdate = true;
      lights.instanceColor!.needsUpdate = true;
      if (stars) { stars.instanceMatrix.needsUpdate = true; if (stars.instanceColor) stars.instanceColor.needsUpdate = true; }
      glow.visible = effects.sparkles;
      const flashing = pose.calm
        ? .12 * settled
        : pose.dissolve > 0
          ? 0
          : Math.sin(Math.PI * Math.max(0, Math.min(1, (pose.form - .85) / .15)));
      flash.material.opacity = flashing;
      if (landingStar) {
        // Turns on with the flash and holds at full strength through the reading, its slow
        // twinkle (the clip at .55 speed) the only motion.
        const strength = pose.calm
          ? 1
          : pose.dissolve > 0
            ? 1 - pose.dissolve
            : Math.max(0, Math.min(1, (pose.form - .85) / .15));
        landingStar.root.visible = strength > .001;
        landingStar.root.scale.setScalar(STAGE_PLACEMENT.sparkle.scale * (.45 + .55 * strength));
        fadeAll(starFading, strength);
        const step = tick(time) * (pose.calm ? .55 : 1);
        if (step > 0 && landingStar.root.visible) landingStar.mixer.update(step);
      } else tick(time);
      if (ringPearls) {
        const { count: pearls, scale: full } = STAGE_PLACEMENT.ringPearl;
        for (let k = 0; k < pearls; k++) {
          const start = k / pearls * .55;
          const formed = pose.calm ? 1 : smooth(pose.form, start, start + .45);
          const size = full * formed * (1 - smooth(pose.dissolve, 0, .6)) * (1 + .05 * Math.sin(time * 1.1 + k));
          dummy.position.copy(ringPearls.at[k]);
          dummy.quaternion.identity();
          dummy.scale.setScalar(Math.max(.0001, size));
          dummy.updateMatrix();
          ringPearls.mesh.setMatrixAt(k, dummy.matrix);
        }
        ringPearls.mesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      if (landingStar) { landingStar.mixer.stopAllAction(); landingStar.mixer.uncacheRoot(landingStar.root); }
    },
  };
}
