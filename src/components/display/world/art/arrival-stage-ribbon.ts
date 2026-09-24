/** The ribbon arrival: the silk that orbits the pearl and the ribbon portal (shared stage pieces in arrival-stage-common.ts). */
import * as T from "three";
import { looping } from "../kit/kit-clips";
import { kitMaterialWords } from "../kit/kit-materials";
import { softDot, studyGlow, studySilk } from "./study-materials";
import {
  type StageEffects,
  type ArrivalStage,
  type StageContext,
  PEARL_Y,
  PEARL_R,
  BEAM_Y,
  CAMERA_AZIMUTH,
  STAGE_KIT,
  STAGE_PLACEMENT,
  smooth,
  unfogged,
  flow,
  ticker,
  settleKitMeshes,
  type Fading,
  fadeAll,
  fadingCopy,
  cachedRemap,
} from "./arrival-stage-common";

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
