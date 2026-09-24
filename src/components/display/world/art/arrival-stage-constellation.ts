/** The constellation arrival: the descending string that lands on the pearl's ring (shared stage pieces in arrival-stage-common.ts). */
import * as T from "three";
import { looping } from "../kit/kit-clips";
import { kitMaterialWords } from "../kit/kit-materials";
import { softDot, sparklePoints } from "./study-materials";
import {
  type StageEffects,
  type ArrivalStage,
  type StageContext,
  PEARL_CENTRE,
  PEARL_VIEW,
  STAGE_KIT,
  STAGE_PLACEMENT,
  smooth,
  unfogged,
  ticker,
  settleKitMeshes,
  type Fading,
  fadeAll,
  fadingCopy,
  cachedRemap,
} from "./arrival-stage-common";

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
