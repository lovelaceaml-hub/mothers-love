/** The bloom arrival: the lotus that blooms and its beam (shared stage pieces in arrival-stage-common.ts). */
import * as T from "three";
import { scrubbed, type ScrubbedClip } from "../kit/kit-clips";
import { kitMaterialWords } from "../kit/kit-materials";
import { bloomFraction } from "./arrival-choreography";
import { softDot } from "./study-materials";
import {
  type StageEffects,
  type ArrivalStage,
  type StageContext,
  PEARL_Y,
  PEARL_R,
  BEAM_Y,
  UP,
  RIGHT,
  ARRIVAL_PEARL,
  ARRIVAL_EYE_LOCAL,
  pearlClearance,
  STAGE_KIT,
  STAGE_PLACEMENT,
  smooth,
  frac,
  unfogged,
  flow,
  studyLotus,
  petalCoordinates,
  extractJointGeometry,
  settleKitMeshes,
  cachedRemap,
} from "./arrival-stage-common";

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
