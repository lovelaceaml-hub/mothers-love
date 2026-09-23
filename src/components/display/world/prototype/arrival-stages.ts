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
 * beam is gated out of it, the silk orbits at radius 7.3 and the descending
 * string lands on the upper left of the pearl's own ring.
 *
 * Plan 26 (WORLD-INTEGRATION section 4): with the 3D Studio kit present each stage
 * dresses itself from it, the lotus that blooms, the ribbon portal, the kit
 * butterflies, the drifting kit petal and the constellation sparkle. Every clip is
 * driven by the pose or the world clock, never wall time, so a frozen clock is a
 * frozen stage and a reduced motion first frame is the finished formation. Without
 * a kit, or when a piece is missing, the procedural piece below stands unchanged,
 * which is what `?kit=off` draws.
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

/** Kit ids the stages look for; a missing one keeps its procedural piece. */
export const STAGE_KIT = {
  lotus: "arrival.lotus-bloom",
  portal: "arrival.ribbon-portal",
  butterfly: "arrival.butterfly",
  petals: "arrival.petal-drift",
  sparkle: "recognition.constellation-sparkle",
} as const;

/**
 * Placement, decided by eye against the approved targets (report of lane K2).
 *
 * Lotus: the file spans 2.975 across when open; 4.3 makes the open flower 12.8 across, a
 * little wider than the pearl as `02_Arrival_Bloom_Target.jpeg` shows it, with the petal
 * tips (file height 1.188) reaching y 5.5, half a unit under the pearl's bottom edge (6.0).
 *
 * Portal: the file's clear opening is 3.21 of its 7.58 width, so no scale both keeps the
 * design's 16.2 height and lets the 10.8 pearl float inside the opening; the arch stands
 * behind the pearl instead, its front face a full pearl clearance behind the disc plane,
 * and the silk winds around the pearl in front of it as the target shows. Butterflies fly
 * the existing orbit at 9.2; the file's wingspan is .356.
 */
export const STAGE_PLACEMENT = {
  lotus: { y: .4, scale: 4.3 },
  portal: { z: -9.2, scale: 2.7, yaw: 0 },
  butterfly: { scale: 4.2, radius: 9.2 },
  sparkle: { scale: 3.2, outward: .4 },
  lightSparkle: .6,
} as const;

function smooth(x: number, low: number, high: number) {
  const n = Math.max(0, Math.min(1, (x - low) / (high - low)));
  return n * n * (3 - 2 * n);
}
function frac(x: number) {
  return x - Math.floor(x);
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
 * A sculpted lotus petal that carries its own warm light at the base.
 *
 * Verified against three 0.180 `ShaderLib/meshphysical.glsl.js`: `attribute vec2 uv`
 * is declared unconditionally in the vertex prefix, `#include <uv_vertex>` opens
 * `main()`, and `vec3 totalEmissiveRadiance` exists before `<emissivemap_fragment>`
 * and is still summed into `outgoingLight` afterwards.
 */
function studyLotus(color: string, glow: { value: number }) {
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
totalEmissiveRadiance += vec3(1., .62, .74) * lotusGlow * pow(1. - petalU, 2.2) * .45;`,
    );
  };
  petal.customProgramCacheKey = () => "study-lotus-glow-v1";
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
/** A copy of an imported kit material the stage owns, made transparent so it can fade. */
function fadingCopy(ctx: StageContext, source: T.Material, fading: Fading[]) {
  const copy = ctx.material(source.clone());
  copy.transparent = true;
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
  // petal, the gold keeps the study gold, the glowing seed pod keeps its own light, and the
  // `bloom` clip is scrubbed by the pose so the last frame lands exactly when reading begins.
  let kitLotus: { root: T.Object3D; clip: ScrubbedClip } | undefined;
  const kit = ctx.kit;
  const lotusClip = kit?.has(STAGE_KIT.lotus) ? kit.asset(STAGE_KIT.lotus)?.clips.get("bloom") : undefined;
  if (kit && lotusClip) {
    const tints: Record<string, string> = { petal: "#f4b3c8", petalpearl: "#f9d0da", petalinnerglow: "#ffdccb" };
    const remap = cachedRemap((name, imported) => {
      const words = kitMaterialWords(name);
      if (words.includes("petal")) return ctx.material(studyLotus(tints[words.join("")] ?? tints.petal, glow));
      if (words.includes("gold") && words.includes("glow")) {
        const kept = ctx.material(imported.clone()) as T.MeshStandardMaterial;
        if (typeof kept.emissiveIntensity === "number") kept.emissiveIntensity = Math.min(kept.emissiveIntensity, 2.5);
        return kept;
      }
      if (words.includes("gold")) return ctx.gold;
      return ctx.material(imported.clone());
    });
    const root = kit.instance(STAGE_KIT.lotus, remap);
    root.traverse(object => {
      const skinned = object as T.SkinnedMesh;
      if (skinned.isSkinnedMesh) skinned.geometry = ctx.geometry(petalCoordinates(skinned));
    });
    settleKitMeshes(root);
    root.position.set(0, STAGE_PLACEMENT.lotus.y, 0);
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
          gl_FragColor = vec4(color * shaft * vertical * streaks * gate * form * presence * .20, 1.);
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
      halo.material.opacity = .22 * pose.presence * (.3 + .7 * pose.form);
      core.material.opacity = .32 * pose.presence * pose.form;
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
        driftMaterial.opacity = pose.presence * pose.form;
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

  // The kit ribbon portal (WORLD-INTEGRATION 4.3) stands behind the pearl: its gold takes
  // the study gold, its pearl the study ivory, its silk tails the study silk, and the glowing
  // finials keep their own light. Every material is the stage's own transparent copy so the
  // whole arch fades with presence while it scales up from its base with gather.
  const kit = ctx.kit;
  const fading: Fading[] = [];
  let arch: T.Object3D | undefined;
  if (kit?.has(STAGE_KIT.portal)) {
    const remap = cachedRemap((name, imported) => {
      const words = kitMaterialWords(name);
      if (words.includes("gold") && words.includes("glow")) return fadingCopy(ctx, imported, fading);
      if (words.includes("gold")) return fadingCopy(ctx, ctx.gold, fading);
      if (words.includes("silk") || words.includes("ribbon")) return fadingCopy(ctx, studySilk(), fading);
      if (words.includes("pearl") || words.includes("ivory")) return fadingCopy(ctx, ctx.ivory, fading);
      return fadingCopy(ctx, imported, fading);
    });
    arch = kit.instance(STAGE_KIT.portal, remap);
    settleKitMeshes(arch);
    arch.position.set(0, 0, STAGE_PLACEMENT.portal.z);
    arch.rotation.y = STAGE_PLACEMENT.portal.yaw;
    group.add(arch);
  }

  const columns = 241, rows = 11;
  const silkGeometry = ctx.geometry(new T.PlaneGeometry(1, 1, columns - 1, rows - 1));
  // `silkF` is the grazing angle term studySilk leaves in scope, so the glow layer receives the
  // lit folded edges of the ribbon and not its broad face.
  const silk = new T.Mesh(silkGeometry, ctx.material(
    studyGlow(studySilk(), "silk", "vec3(1., .80, .88) * silkF * .55", "silkF * .6"),
  ));
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
  // its own mixer advanced by the world clock (6 Hz in flight, .55 of that at calm); else
  // three pairs of the study's cheap petal wings.
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
        widths[i] = 2.05 * Math.pow(Math.max(0, Math.sin(Math.PI * s)), .55)
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
          const lift = .07 * Math.sin(s * 140 + v * 9 + fold) * (1 - pose.form * .45)
            + .18 * Math.sin(s * 22 + time * .3) * v;
          const w = v * widths[i], k = i * 3;
          position.setXYZ(
            j * columns + i,
            centers[k] + widthAxis[k] * w + foldAxis[k] * lift,
            centers[k + 1] + widthAxis[k + 1] * w + foldAxis[k + 1] * lift,
            centers[k + 2] + widthAxis[k + 2] * w + foldAxis[k + 2] * lift,
          );
        }
      }
      position.needsUpdate = true;
      silkGeometry.computeVertexNormals();

      const orbit = orbitFlow.advance(time, pose.calm ? .08 : .16);
      const entering = (1 - pose.form) * 18 + 14 * pose.dissolve;
      if (flyers.length) {
        const step = tick(time) * (pose.calm ? 1.65 : 3);
        const radius = STAGE_PLACEMENT.butterfly.radius;
        flyers.forEach((flyer, k) => {
          flyer.root.visible = effects.trails && pose.presence > 0;
          const b = orbit + k * Math.PI * 2 / wings;
          const cy = PEARL_Y + 7.5 + 2.5 * Math.sin(k * 2.1) + .6 * Math.sin(time * .9 + k) + entering;
          flyer.root.position.set(Math.cos(b) * radius, cy, Math.sin(b) * radius);
          // The head points +z in the file, so looking a little ahead along the orbit flies it forward.
          ahead.set(Math.cos(b + .05) * radius, cy + .4 * Math.cos(time * .9 + k), Math.sin(b + .05) * radius);
          flyer.root.lookAt(ahead);
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
      glowSprite.material.opacity = .28 * pose.presence;
    },
    dispose() {
      for (const flyer of flyers) { flyer.mixer.stopAllAction(); flyer.mixer.uncacheRoot(flyer.root); }
    },
  };
}

/** Where the string of lights lands: the upper left of the pearl's own ring, outside the words. */
export const CONSTELLATION_LANDING = new T.Vector3(-5.534, 16.07, 1.525);

/** Pearl formation: a string of small lights descending from the sky into the pearl's ring. */
export function constellationStage(ctx: StageContext): ArrivalStage {
  const group = new T.Group();
  group.name = "Arrival study, pearl formation";
  group.userData.dynamic = true;

  // Measured against the fixed arrival camera at 1920 by 1080: the string enters
  // beyond the top left corner, descends across the sky and lands on the upper
  // left of the pearl's own ring, never inside the pearl's text band.
  const points: T.Vector3[] = [];
  const landing = CONSTELLATION_LANDING.clone();
  for (let k = 0; k < 10; k++) {
    const s = k / 9, y = 26 - s * (26 - landing.y), r = 16 - s * 8.6, a = s * Math.PI * 2 * .9 + 2.4;
    points.push(new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  points[9].copy(landing);
  const curve = new T.CatmullRomCurve3(points);

  const count = 96;
  const kit = ctx.kit;
  // The kit sparkle (WORLD-INTEGRATION 4.4): every third light, the gold one, becomes the
  // kit's star on its own instanced mesh (one draw per material), and the landing flash
  // gains the same star on its `twinkle` loop. The string itself stays points of light.
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
        color: "#ffffff", toneMapped: false,
        ...(halo ? { transparent: true, opacity: .45, depthWrite: false } : {}),
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
    sizes[i] = isStar(i) ? STAGE_PLACEMENT.lightSparkle : i % 3 === 0 ? .075 : .055;
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
  const glow = new T.Points(glowGeometry, ctx.material(sparklePoints(ctx.time, .9, "#fff0cc", .55, dot)));
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
        // Turns on with the flash and stays at .35 through the reading.
        const strength = pose.calm
          ? .35 * settled + (1 - settled) * Math.max(0, Math.min(1, (pose.form - .85) / .15))
          : pose.dissolve > 0
            ? .35 * (1 - pose.dissolve)
            : Math.max(0, Math.min(1, (pose.form - .85) / .15));
        landingStar.root.visible = strength > .001;
        landingStar.root.scale.setScalar(STAGE_PLACEMENT.sparkle.scale * (.45 + .55 * strength));
        fadeAll(starFading, strength);
        const step = tick(time) * (pose.calm ? .55 : 1);
        if (step > 0 && landingStar.root.visible) landingStar.mixer.update(step);
      } else tick(time);
    },
    dispose() {
      if (landingStar) { landingStar.mixer.stopAllAction(); landingStar.mixer.uncacheRoot(landingStar.root); }
    },
  };
}
