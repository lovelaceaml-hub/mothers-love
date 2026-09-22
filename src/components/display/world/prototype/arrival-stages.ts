import * as T from "three";
import type { ArrivalPose } from "./arrival-choreography";
import { softDot, sparklePoints, studyGlow, studySilk } from "./study-materials";

/**
 * The three arrival studies, each a self contained stage on the entry platform.
 *
 * Every position here is local to the entry group. During reading the arrival
 * pearl sits at local (0, 11.4, 0) with radius 5.4, which is where the text
 * band lives, so each stage keeps its own geometry clear of that band: the bloom
 * beam is gated out of it, the silk orbits at radius 7.3 and the descending
 * string lands on the upper left of the pearl's own ring.
 */

export type StageEffects = { sparkles: boolean; trails: boolean };
export type ArrivalStage = {
  group: T.Group;
  update(pose: ArrivalPose, time: number, effects: StageEffects): void;
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
};

const PEARL_Y = 11.4, PEARL_R = 5.4, BEAM_Y = 15.5;
const UP = new T.Vector3(0, 1, 0), RIGHT = new T.Vector3(1, 0, 0);

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

/** Petal bloom: a large lit lotus under the pearl, a gated beam and rising petals. */
export function bloomStage(ctx: StageContext): ArrivalStage {
  const group = new T.Group();
  group.name = "Arrival study, petal bloom";
  group.userData.dynamic = true;

  const glow = { value: 0 };
  const lotus = new T.Group();
  lotus.userData.dynamic = true;
  group.add(lotus);
  const outer = ctx.instance(lotus, ctx.lotusShape, ctx.material(studyLotus("#f4b3c8", glow)), 10);
  const inner = ctx.instance(lotus, ctx.lotusShape, ctx.material(studyLotus("#f9d0da", glow)), 8);
  outer.receiveShadow = inner.receiveShadow = false;
  outer.frustumCulled = inner.frustumCulled = false;

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

  const driftCount = 40, driftFlow = flow();
  const driftMaterial = ctx.material(new T.MeshPhysicalMaterial({
    color: "#f7c2d4", roughness: .4, sheen: 1, sheenColor: new T.Color("#fff0df"),
    sheenRoughness: .4, side: T.DoubleSide, transparent: true, opacity: 0, depthWrite: false,
  }));
  const drift = ctx.instance(group, ctx.farPetal, driftMaterial, driftCount);
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
      const open = pose.form * (1 - pose.dissolve * .35);
      writeRing(outer, 10, 0, -.95 + open * 1.0, [3.9, 6.2, 7.3]);
      writeRing(inner, 8, Math.PI / 8, -.95 + open * .62, [2.9, 7.6, 5.2]);
      lotus.scale.setScalar(.15 + .85 * pose.gather);
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
          dummy.scale.setScalar(driftSize[i] * (1 - p * .4));
          dummy.updateMatrix();
          drift.setMatrixAt(i, dummy.matrix);
        }
        drift.instanceMatrix.needsUpdate = true;
        driftMaterial.opacity = pose.presence * pose.form;
      }
    },
  };
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
  // One broad loop, not a multi turn helix. Measured against the fixed arrival camera,
  // this keeps the silk's centre line at least 316 px from the pearl centre at 1920 by
  // 1080, so the ribbon reads around the pearl and never over its text.
  function silkAngle(s: number, turn: number) {
    return s * Math.PI * 2 + 5.3 + turn;
  }
  function silkCenter(s: number, turn: number, out: T.Vector3) {
    const a = silkAngle(s, turn), r = 7.3 + .9 * Math.sin(s * Math.PI * 4 + 1);
    return out.set(Math.cos(a) * r, PEARL_Y + (s - .5) * 20 + 1.1 * Math.sin(1.5 * a), Math.sin(a) * r);
  }

  const wings = 6;
  const butterflyMaterial = ctx.material(new T.MeshPhysicalMaterial({
    color: "#fff7f0", sheen: 1, sheenColor: new T.Color("#ffe9f2"),
    side: T.DoubleSide, transparent: true, opacity: .95, roughness: .5,
  }));
  const butterflies = ctx.instance(group, ctx.farPetal, butterflyMaterial, wings);
  butterflies.receiveShadow = false;
  butterflies.frustumCulled = false;
  const orbitFlow = flow(), flapFlow = flow();

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

      // A bounded sway, not an accumulating rotation: a rotation that kept adding up
      // would carry the ribbon across the pearl's text after a long unattended run.
      // Measured: the centre line holds 303 px or more from the pearl centre across it.
      const turn = .12 * Math.sin(silkFlow.advance(time, pose.calm ? .09 : .22));
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
      const flap = flapFlow.advance(time, pose.calm ? 5 : 7);
      const entering = (1 - pose.form) * 18 + 14 * pose.dissolve;
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
      glowSprite.material.opacity = .28 * pose.presence;
    },
  };
}

/** Pearl formation: a string of small lights descending from the sky into the pearl's ring. */
export function constellationStage(ctx: StageContext): ArrivalStage {
  const group = new T.Group();
  group.name = "Arrival study, pearl formation";
  group.userData.dynamic = true;

  // Measured against the fixed arrival camera at 1920 by 1080: the string enters
  // beyond the top left corner, descends across the sky and lands on the upper
  // left of the pearl's own ring, never inside the pearl's text band.
  const points: T.Vector3[] = [];
  const landing = new T.Vector3(-5.534, 16.07, 1.525);
  for (let k = 0; k < 10; k++) {
    const s = k / 9, y = 26 - s * (26 - landing.y), r = 16 - s * 8.6, a = s * Math.PI * 2 * .9 + 2.4;
    points.push(new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  points[9].copy(landing);
  const curve = new T.CatmullRomCurve3(points);

  const count = 96;
  const lights = ctx.instance(group, ctx.pollen, ctx.material(new T.MeshBasicMaterial({
    color: "#ffffff", toneMapped: false,
  })), count);
  lights.receiveShadow = false;
  lights.frustumCulled = false;
  lights.layers.enable(1);
  const places = new Float32Array(count * 3), phases = new Float32Array(count);
  const sizes = new Float32Array(count), base: T.Color[] = [];
  const random = ctx.seededRandom(5101);
  const dummy = new T.Object3D(), tint = new T.Color(), gold = new T.Color("#e6c07a"), pearl = new T.Color("#fff3df");
  const point = new T.Vector3();
  for (let i = 0; i < count; i++) {
    curve.getPointAt(i / (count - 1), point);
    places[i * 3] = point.x; places[i * 3 + 1] = point.y; places[i * 3 + 2] = point.z;
    phases[i] = random();
    sizes[i] = i % 3 === 0 ? .075 : .055;
    base.push((i % 3 === 0 ? gold : pearl).clone());
    // Written for every instance in the builder, so instanceColor exists before the first update.
    lights.setColorAt(i, base[i]);
  }
  lights.instanceColor!.needsUpdate = true;

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
        dummy.scale.setScalar(Math.max(.0001, scale));
        dummy.updateMatrix();
        lights.setMatrixAt(i, dummy.matrix);
        const pulse = .55 + .45 * Math.pow(Math.max(0, Math.cos((s - pose.form * 1.15) * 5.5)), 3);
        const twinkle = .8 + .1 * Math.sin(time * 1.3 + i);
        const bright = pulse + (twinkle - pulse) * settled;
        lights.setColorAt(i, tint.copy(base[i]).multiplyScalar(bright));
      }
      lights.instanceMatrix.needsUpdate = true;
      lights.instanceColor!.needsUpdate = true;
      glow.visible = effects.sparkles;
      flash.material.opacity = pose.calm
        ? .12 * settled
        : pose.dissolve > 0
          ? 0
          : Math.sin(Math.PI * Math.max(0, Math.min(1, (pose.form - .85) / .15)));
    },
  };
}
