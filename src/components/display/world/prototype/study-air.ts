import * as T from "three";
import { ZONES, seededRandom } from "../world-data";
import { STUDY_GLOW_PASS, sparklePoints, studyRim } from "./study-materials";

/**
 * Living air for the design study: drifting petals, warm motes around the viewer, quiet
 * stars high in the sky and a few butterflies over the flower beds.
 *
 * Every layout below is pure and seeded, so the scatter is identical on every run and can
 * be proved in a plain Node test. The builders take the caller's registrars, so the design
 * world's single `dispose()` still covers every geometry, material and texture.
 *
 * Each of the four is one draw call. Petals and butterflies are trail-class, motes and
 * stars are sparkle-class, matching the owner's effect switches.
 */

/** The band each petal falls through, measured from the district terrace at y .7. */
export const PETAL_BAND = { low: .8, innerRadius: 9, outerRadius: 19, spanLow: 6, spanHigh: 9 };
/** The cube the motes wrap inside, centred on the camera every frame. */
export const MOTE_SPAN = 26;
/** Stars sit just inside the sky sphere at radius 400, above the horizon only. */
export const STAR_RADIUS = 380;

export type PetalSeed = {
  x: number; y: number; z: number; size: number;
  phase: number; fall: number; spin: number; span: number;
  tint: readonly [number, number, number];
};

const PETAL_TINTS = ["#f7b8cc", "#fbd3dc", "#e9a7c4"] as const;

/** How fast a rising petal climbs, units a second (WORLD-INTEGRATION 6.7: the Sanctuary lifts its petals). */
export const PETAL_RISE = .25;

/**
 * Petals scattered in an annulus around each supplied centre.
 *
 * The inner radius keeps them clear of the column of air each district's hero pearl
 * occupies, and the band is low enough that they read as blossom over the flower beds
 * rather than confetti across the message.
 *
 * `rising` names the centres (by index) whose petals climb instead of fall: their `fall` is
 * negative, which the vertex patch below reads as a reversed cycle. The random draws are the
 * same either way, so every other petal keeps its place.
 */
export function petalField(seed: number, count: number, centers: readonly (readonly [number, number, number])[], rising: ReadonlySet<number> = new Set()): PetalSeed[] {
  const random = seededRandom(seed);
  const petals: PetalSeed[] = [];
  const places = centers.length || 1;
  for (let i = 0; i < count; i++) {
    const center = centers[i % places] ?? [0, 0, 0];
    const angle = random() * Math.PI * 2;
    const radius = PETAL_BAND.innerRadius + random() * (PETAL_BAND.outerRadius - PETAL_BAND.innerRadius);
    const span = PETAL_BAND.spanLow + random() * (PETAL_BAND.spanHigh - PETAL_BAND.spanLow);
    const tint = new T.Color(PETAL_TINTS[i % PETAL_TINTS.length]);
    const size = .28 + random() * .27;
    const phase = random();
    const fallDraw = random();
    petals.push({
      x: center[0] + Math.cos(angle) * radius,
      y: center[1] + PETAL_BAND.low + span / 2,
      z: center[2] + Math.sin(angle) * radius,
      size,
      phase,
      fall: rising.has(i % places) ? -(PETAL_RISE + fallDraw * .08) : .25 + fallDraw * .30,
      spin: .4 + random() * .8,
      span,
      tint: [tint.r, tint.g, tint.b],
    });
  }
  return petals;
}

/**
 * Which of the supplied centres rise: the Heart Sanctuary's, once the kit dresses the world
 * (Plan 26 K3a). Without the kit the field is exactly the procedural study's.
 */
export function risingCenters(centers: readonly (readonly [number, number, number])[], kitOn: boolean): Set<number> {
  const out = new Set<number>();
  if (!kitOn) return out;
  const heart = ZONES.find(zone => zone.id === "heart");
  if (!heart) return out;
  centers.forEach((center, i) => {
    if (center[0] === heart.center[0] && center[1] === heart.center[1] && center[2] === heart.center[2]) out.add(i);
  });
  return out;
}

/** Mote starting places inside one `MOTE_SPAN` cube. The shader wraps them around the camera. */
export function moteCloud(seed: number, count: number) {
  const random = seededRandom(seed);
  const places = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) places[i] = random() * MOTE_SPAN;
  return places;
}

/** Stars on the inside of the sky, above the horizon, with a phase each so they breathe apart. */
export function skyStars(seed: number, count: number) {
  const random = seededRandom(seed);
  const places = new Float32Array(count * 3), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = .3 + random() * .65;
    const ring = Math.sqrt(Math.max(0, 1 - y * y)), angle = random() * Math.PI * 2;
    places[i * 3] = Math.cos(angle) * ring * STAR_RADIUS;
    places[i * 3 + 1] = y * STAR_RADIUS;
    places[i * 3 + 2] = Math.sin(angle) * ring * STAR_RADIUS;
    phases[i] = random();
  }
  return { places, phases };
}

export type ButterflyRoute = {
  center: readonly [number, number, number];
  radius: number; lift: number; rise: number;
  speed: number; phase: number; sway: number;
};

/**
 * Eight butterflies on slow Lissajous routes over the three flower bed districts.
 * The routes stay out over the beds, well away from the hero pearl's column of air.
 */
export function butterflyRoutes(): ButterflyRoute[] {
  const beds: Array<readonly [number, number, number]> = [[26, 0, 16], [-27, 0, -9], [14, 0, -45]];
  const routes: ButterflyRoute[] = [];
  for (let i = 0; i < 8; i++) {
    const bed = beds[i % beds.length];
    routes.push({
      center: bed,
      radius: 8.4 + (i % 4) * 1.35,
      // .9 to 2.25 above the terrace at y .7, so a butterfly reads over the flower bed
      // and never climbs into the column of air the district's hero pearl occupies.
      lift: .9 + (i % 3) * .35,
      rise: .35 + (i % 2) * .3,
      speed: .16 + (i % 5) * .022,
      phase: i * 2.399,
      sway: 1.15 + (i % 3) * .21,
    });
  }
  return routes;
}

export type AirContext = {
  geometry: <G extends T.BufferGeometry>(g: G) => G;
  material: <M extends T.Material>(m: M) => M;
  farPetal: T.BufferGeometry;
  dot: T.Texture;
  time: { value: number };
};

/** Where the focal pearl is right now, so no petal is allowed to drift across its words. */
export type AirFocus = { position: readonly number[]; radius: number } | undefined;

export type StudyAir = {
  update(time: number, camera: T.Camera, lowTier: boolean, focus: AirFocus): void;
  setEffects(sparkles: boolean, trails: boolean): void;
  dispose(): void;
};

const PETAL_COUNT = 560, LOW_PETAL_COUNT = 160, MOTE_COUNT = 200, STAR_COUNT = 300;

/**
 * Builds the four air objects and adds them to the scene.
 *
 * The petal patch is written against three 0.180 `ShaderLib/meshphysical.glsl.js`:
 * `<beginnormal_vertex>` runs before `<begin_vertex>` in the same `main()`, so the tumble
 * is resolved once there and reused for the position and for the world drift. The replaced
 * `<project_vertex>` reproduces the stock chunk (the mesh sits on the scene with an identity
 * transform, so instance space is world space) and adds the drift and the distance shrink.
 * `uniform vec3 cameraPosition` comes from the vertex prefix, `WebGLProgram.js` L664.
 */
export function createStudyAir(scene: T.Scene, ctx: AirContext, centers: readonly (readonly [number, number, number])[]): StudyAir {
  const clock = ctx.time;

  // Petals. The Sanctuary's rise once the kit is in (the design world publishes it on the scene).
  const petals = petalField(3313, PETAL_COUNT, centers, risingCenters(centers, !!scene.userData.studyKit));
  // farPetal is shared with the arrival studies, so the instanced seed attribute goes on a copy.
  const petalGeometry = ctx.geometry(ctx.farPetal.clone());
  const seeds = new Float32Array(PETAL_COUNT * 4);
  petals.forEach((petal, i) => {
    seeds[i * 4] = petal.phase; seeds[i * 4 + 1] = petal.fall;
    seeds[i * 4 + 2] = petal.spin; seeds[i * 4 + 3] = petal.span;
  });
  petalGeometry.setAttribute("petalSeed", new T.InstancedBufferAttribute(seeds, 4));
  const petalMaterial = studyRim(ctx.material(new T.MeshPhysicalMaterial({
    vertexColors: true, sheen: 1, sheenColor: new T.Color("#fff0df"), roughness: .4, side: T.DoubleSide,
  })), "#fff0e0", 2.5, .3);
  // w is the pearl's world radius, or 0 for no guard at all.
  const petalGuard = { value: new T.Vector4(0, 0, 0, 0) };
  chainPetalPatch(petalMaterial, clock, petalGuard);
  const petalMesh = new T.InstancedMesh(petalGeometry, petalMaterial, PETAL_COUNT);
  petalMesh.name = "Study petal field";
  petalMesh.frustumCulled = false;
  petalMesh.castShadow = petalMesh.receiveShadow = false;
  const dummy = new T.Object3D(), tint = new T.Color();
  petals.forEach((petal, i) => {
    dummy.position.set(petal.x, petal.y, petal.z);
    dummy.rotation.set(0, petal.phase * Math.PI * 2, 0);
    dummy.scale.setScalar(petal.size);
    dummy.updateMatrix();
    petalMesh.setMatrixAt(i, dummy.matrix);
    petalMesh.setColorAt(i, tint.setRGB(petal.tint[0], petal.tint[1], petal.tint[2]));
  });
  petalMesh.instanceMatrix.needsUpdate = true;
  petalMesh.instanceColor!.needsUpdate = true;
  scene.add(petalMesh);

  // Motes.
  const moteGeometry = ctx.geometry(new T.BufferGeometry());
  moteGeometry.setAttribute("position", new T.BufferAttribute(moteCloud(611, MOTE_COUNT), 3));
  const moteCenter = { value: new T.Vector3() };
  const moteMaterial = ctx.material(new T.PointsMaterial({
    size: .07, sizeAttenuation: true, map: ctx.dot, color: new T.Color("#fff3dc"),
    transparent: true, opacity: .28, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  moteMaterial.onBeforeCompile = shader => {
    shader.uniforms.studyMoteTime = clock;
    shader.uniforms.studyMoteCenter = moteCenter;
    shader.uniforms.studyGlowPass = STUDY_GLOW_PASS;
    shader.vertexShader = "uniform float studyMoteTime, studyGlowPass;\nuniform vec3 studyMoteCenter;\n" + shader.vertexShader
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vec3 studyMoteDrift = vec3(.08, -.25, .05) * studyMoteTime;
float studyMoteHalf = ${(MOTE_SPAN / 2).toFixed(1)};
transformed = studyMoteCenter + mod(transformed + studyMoteDrift - studyMoteCenter + studyMoteHalf, ${MOTE_SPAN.toFixed(1)}) - studyMoteHalf;`)
      // A mote that wraps in close would otherwise cover the screen with one soft disc.
      .replace("#include <logdepthbuf_vertex>", `gl_PointSize = min(gl_PointSize, 7.) * mix(1., .6, studyGlowPass);
#include <logdepthbuf_vertex>`);
  };
  moteMaterial.customProgramCacheKey = () => "study-mote-drift-v1";
  const moteMesh = new T.Points(moteGeometry, moteMaterial);
  moteMesh.name = "Study motes";
  moteMesh.frustumCulled = false;
  moteMesh.layers.enable(1);
  scene.add(moteMesh);

  // Stars.
  const star = skyStars(913, STAR_COUNT);
  const starGeometry = ctx.geometry(new T.BufferGeometry());
  starGeometry.setAttribute("position", new T.BufferAttribute(star.places, 3));
  starGeometry.setAttribute("phase", new T.BufferAttribute(star.phases, 1));
  // Stars breathe a little slower than the close sparkles and ignore the haze.
  const starMaterial = ctx.material(sparklePoints(clock, 3.2, "#fff6e6", .55, ctx.dot, .7));
  starMaterial.fog = false;
  const starMesh = new T.Points(starGeometry, starMaterial);
  starMesh.name = "Study sky stars";
  starMesh.frustumCulled = false;
  starMesh.layers.enable(1);
  scene.add(starMesh);

  // Butterflies.
  const routes = butterflyRoutes();
  const butterflyMaterial = ctx.material(new T.MeshPhysicalMaterial({
    color: "#fff7f0", sheen: 1, sheenColor: new T.Color("#ffe9f2"),
    side: T.DoubleSide, roughness: .5,
  }));
  const butterflies = new T.InstancedMesh(ctx.farPetal, butterflyMaterial, routes.length * 2);
  butterflies.name = "Study butterflies";
  butterflies.frustumCulled = false;
  butterflies.castShadow = butterflies.receiveShadow = false;
  scene.add(butterflies);

  let sparkles = true, trails = true;
  const wing = new T.Object3D(), here = new T.Vector3(), ahead = new T.Vector3();
  function place(route: ButterflyRoute, t: number, out: T.Vector3) {
    const a = t * route.speed * Math.PI * 2 + route.phase;
    return out.set(
      route.center[0] + Math.cos(a) * route.radius,
      route.center[1] + .7 + route.lift + route.rise * (.5 + .5 * Math.sin(a * route.sway + route.phase)),
      route.center[2] + Math.sin(a * 1.31 + route.phase) * route.radius,
    );
  }
  return {
    setEffects(nextSparkles, nextTrails) { sparkles = nextSparkles; trails = nextTrails; },
    update(time, camera, lowTier, focus) {
      if (focus) petalGuard.value.set(focus.position[0], focus.position[1], focus.position[2], focus.radius);
      else petalGuard.value.w = 0;
      petalMesh.visible = trails;
      petalMesh.count = lowTier ? LOW_PETAL_COUNT : PETAL_COUNT;
      moteMesh.visible = sparkles && !lowTier;
      starMesh.visible = sparkles;
      moteCenter.value.copy(camera.position);
      butterflies.visible = trails;
      if (!butterflies.visible) return;
      const flap = .3 + .6 * Math.abs(Math.sin(time * Math.PI * 12));
      routes.forEach((route, k) => {
        place(route, time, here);
        place(route, time + .05, ahead);
        const heading = Math.atan2(ahead.x - here.x, ahead.z - here.z);
        for (const side of [-1, 1]) {
          wing.position.copy(here);
          wing.quaternion.identity();
          wing.rotation.set(-Math.PI / 2 + .2, flap * side, heading);
          wing.scale.setScalar(.42);
          wing.updateMatrix();
          butterflies.setMatrixAt(k * 2 + (side === -1 ? 0 : 1), wing.matrix);
        }
      });
      butterflies.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      petalMesh.dispose(); butterflies.dispose();
      petalMesh.removeFromParent(); moteMesh.removeFromParent();
      starMesh.removeFromParent(); butterflies.removeFromParent();
    },
  };
}

/**
 * Tumble, world drift and distance shrink for the petal field, chained after `studyRim`.
 */
function chainPetalPatch(target: T.MeshPhysicalMaterial, clock: { value: number }, guard: { value: T.Vector4 }) {
  const previousCompile = target.onBeforeCompile.bind(target);
  const previousKey = target.customProgramCacheKey();
  target.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.studyPetalTime = clock;
    shader.uniforms.studyPetalGuard = guard;
    shader.vertexShader = `attribute vec4 petalSeed;
uniform float studyPetalTime;
uniform vec4 studyPetalGuard;
vec3 studySpin(vec3 v, vec3 axis, float c, float s) {
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1. - c);
}
` + shader.vertexShader
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
float studyPetalCycle = fract(petalSeed.x + studyPetalTime * petalSeed.y / max(.001, petalSeed.w));
vec3 studyPetalDrift = vec3(
  sin(studyPetalTime * .33 + petalSeed.x * 6.2832) * .9,
  petalSeed.w * (1. - studyPetalCycle) - petalSeed.w * .5,
  cos(studyPetalTime * .27 + petalSeed.x * 6.2832) * .9);
float studyPetalAngle = studyPetalTime * petalSeed.z + petalSeed.x * 6.2832;
vec3 studyPetalAxis = normalize(vec3(sin(petalSeed.x * 12.9898), .55, cos(petalSeed.x * 78.233)));
float studyPetalC = cos(studyPetalAngle), studyPetalS = sin(studyPetalAngle);
objectNormal = studySpin(objectNormal, studyPetalAxis, studyPetalC, studyPetalS);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
transformed = studySpin(transformed - vec3(0., 0., .5), studyPetalAxis, studyPetalC, studyPetalS) + vec3(0., 0., .5);`)
      .replace("#include <project_vertex>", `vec4 studyPetalWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  studyPetalWorld = instanceMatrix * studyPetalWorld;
#endif
vec3 studyPetalOrigin = vec3(0.);
#ifdef USE_INSTANCING
  studyPetalOrigin = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
#endif
studyPetalWorld.xyz += studyPetalDrift;
studyPetalOrigin += studyPetalDrift;
// A petal past the haze shrinks to nothing instead of flickering as a lone lit speck.
float studyPetalKeep = 1. - smoothstep(55., 85., distance(cameraPosition, studyPetalOrigin));
// Nothing drifts across the words. A petal nearer than the focal pearl and inside the cone
// that pearl subtends is shrunk away, so the message is never covered from any viewpoint.
if (studyPetalGuard.w > 0.) {
  vec3 studyGuardRay = studyPetalGuard.xyz - cameraPosition;
  float studyGuardRange = max(.001, length(studyGuardRay));
  vec3 studyGuardDir = studyGuardRay / studyGuardRange;
  vec3 studyPetalRay = studyPetalOrigin - cameraPosition;
  float studyPetalAlong = dot(studyPetalRay, studyGuardDir);
  float studyPetalLateral = length(studyPetalRay - studyGuardDir * studyPetalAlong);
  float studyCover = studyPetalGuard.w * max(0., studyPetalAlong) / studyGuardRange;
  // The edges are floored so the smoothstep never degenerates when the petal sits on the
  // guard ray, where studyCover reaches zero and both edges would otherwise be equal.
  studyPetalKeep *= studyPetalAlong > studyGuardRange
    ? 1.
    : smoothstep(max(studyCover * 1.05, 1e-4), max(studyCover * 1.55, 2e-4), studyPetalLateral);
}
vec4 mvPosition = modelViewMatrix * vec4(mix(studyPetalOrigin, studyPetalWorld.xyz, studyPetalKeep), 1.0);
gl_Position = projectionMatrix * mvPosition;`);
  };
  target.customProgramCacheKey = () => `${previousKey}|study-petal-field-v1`;
  return target;
}
