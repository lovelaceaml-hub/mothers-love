import * as T from "three";
import { ZONES, seededRandom } from "../world-data";
import { STUDY_EXPOSURE } from "./study-materials";

/**
 * Soft pink cloud banks for the sample-only visual study.
 *
 * Two tiers, two draw calls. The sky tier rings the whole world near the
 * horizon; the island tier hugs each island rim just under the terrace, so the
 * terraces read as floating rather than cut off. The layout is pure data and
 * deterministic, so the tests can read it without a browser, and only
 * `studyCloudAtlas()` touches the DOM.
 */

/** One billboarded cloud puff. `tint` and `variant` index the palette and the atlas cell. */
export type StudyPuff = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  alpha: number;
  tint: 0 | 1 | 2;
  variant: 0 | 1 | 2;
  phase: number;
};

/** An extra island-like place that also deserves a cloud collar, such as a travel corridor landing. */
export type StudyCloudSite = { center: [number, number, number]; radius: number };
/** Sites under this radius (the corridor islets) take a collar scaled to their size. */
export const SMALL_SITE_RADIUS = 9;

export type StudyCloudLayout = { sky: StudyPuff[]; island: StudyPuff[] };

/**
 * Three soft pinks. The shader multiplies the near white atlas by one of these per
 * puff, so a tint is effectively the cloud colour. They sit deeper than the first
 * pass, which rendered at roughly #f1d7d1 and vanished into the golden hour sky.
 */
export const STUDY_CLOUD_TINTS = ["#edb9d0", "#f5d2dd", "#e5a9c6"] as const;
/**
 * The island tier's collar puffs, paler: each sky tint with a third of its saturation cut
 * (same hue and lightness), so the collars under the islands and the pale sculpted corridor
 * clouds read as one material (Plan 26 K3b, the director's note 6 on round three).
 */
export const STUDY_COLLAR_TINTS = ["#e5c3d2", "#f0d8df", "#dcb5c7"] as const;

/** The first three zones carry the wide terraces; every other island is the smaller size. */
function zoneRadius(index: number) {
  return index < 3 ? 17.8 : 13.8;
}

/**
 * Where every puff sits. DOM free and deterministic for a given seed, so two calls
 * return deep equal arrays and the island tier can be asserted against `ZONES`.
 */
export function studyCloudLayout(seed: number, extraSites: StudyCloudSite[] = []): StudyCloudLayout {
  const rand = seededRandom(seed);
  const third = () => Math.min(2, Math.floor(rand() * 3)) as 0 | 1 | 2;

  const sky: StudyPuff[] = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + (rand() - .5) * .16;
    const radius = 150 + rand() * 65;
    const width = 45 + rand() * 50;
    sky.push({
      x: Math.cos(angle) * radius,
      y: 10 + rand() * 38,
      z: Math.sin(angle) * radius,
      width,
      height: width * (.38 + rand() * .12),
      alpha: .55 + rand() * .20,
      tint: third(),
      variant: third(),
      phase: rand(),
    });
  }

  const island: StudyPuff[] = [];
  function collar(site: StudyCloudSite, count: number) {
    // Plan 26 K3b: a corridor islet (grass radius 5 to 6) takes a collar sized to it. The first
    // cut shrank the district recipe in proportion (puffs 4 to 7 wide, .6 to 1.7 out from the
    // rim) and the islet's own faceted underside hid every puff; the collar now stands 2.4 to
    // 4.6 units out and 2 to 4.4 under the grass, 7 to 11 wide, so it shows around the rock
    // like the district collars do. Every district and far landmark site is radius 9 or more
    // and keeps exactly the puffs it always had.
    const small = site.radius < SMALL_SITE_RADIUS;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (rand() - .5) * .6;
      const radius = site.radius + (small ? 2.4 + rand() * 2.2 : 1.5 + rand() * 2.5);
      const width = small ? 7 + rand() * 4 : 9 + rand() * 7;
      island.push({
        x: site.center[0] + Math.cos(angle) * radius,
        y: site.center[1] - (small ? 2 + rand() * 2.4 : 1.6 + rand() * 3),
        z: site.center[2] + Math.sin(angle) * radius,
        width,
        height: width * (.45 + rand() * .15),
        alpha: small ? .7 + rand() * .12 : .78 + rand() * .12,
        tint: third(),
        variant: third(),
        phase: rand(),
      });
    }
  }
  ZONES.forEach((zone, index) => collar({ center: [zone.center[0], zone.center[1], zone.center[2]], radius: zoneRadius(index) }, 7));
  for (const site of extraSites) collar(site, 3 + Math.floor(rand() * 2));

  return { sky, island };
}

const VERTEX = `attribute vec3 puffTint;
attribute float puffAlpha;
attribute float puffVariant;
attribute float puffPhase;
attribute vec2 puffSize;
uniform float time;
uniform float tier;
varying vec3 vPuffTint;
varying float vPuffAlpha;
varying float vPuffVariant;
varying vec2 vPuffUv;
#include <fog_pars_vertex>
void main() {
  vPuffTint = puffTint;
  vPuffAlpha = puffAlpha;
  vPuffVariant = puffVariant;
  vPuffUv = uv;
  float wave = puffPhase * 6.2831853;
  vec3 drift = tier < .5
    ? vec3(sin(time * .05 + wave) * 2.5, 0., 0.)
    : vec3(0., sin(time * .4 + wave) * .15, 0.);
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(drift, 1.);
  mvPosition.xy += position.xy * puffSize;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAGMENT = `uniform sampler2D atlas;
uniform float fogRelief;
uniform float studyExposure;
varying vec3 vPuffTint;
varying float vPuffAlpha;
varying float vPuffVariant;
varying vec2 vPuffUv;
#include <fog_pars_fragment>
void main() {
  vec4 texel = texture2D(atlas, vec2((vPuffUv.x + vPuffVariant) / 3., vPuffUv.y));
  float alpha = texel.a * vPuffAlpha;
  if (alpha < .004) discard;
  // A brighter crown and a deeper underside, so a puff reads as a volume, not a decal.
  // Section 8 multiplies the study mood envelope in here, exactly as the sky does, so the
  // cloud banks dip and lift with the backdrop they sit in front of. Parked it is 1.
  gl_FragColor = vec4(texel.rgb * vPuffTint * (.9 + .2 * vPuffUv.y) * studyExposure, alpha);
  #include <colorspace_fragment>
  vec3 unhazed = gl_FragColor.rgb;
  #include <fog_fragment>
  // The sky ring sits past 150 units, where the scene haze would erase it completely.
  gl_FragColor.rgb = mix(gl_FragColor.rgb, unhazed, fogRelief);
}`;

/**
 * The TV page's clear air (Anthony, 2026-09-24: "Can you remove the haze foggy look"). The sky
 * ring's puffs are fainter and keep more of their own colour through the thinner fog (a pale
 * wall of pink round the horizon was half of the milky look), and the island collars are a
 * little lighter but still there, so every island still reads as floating. Applied to the
 * per puff alpha attribute and the relief uniform only: the layout and the shader are the same.
 */
export const STUDY_TV_CLOUDS = { skyAlpha: .6, islandAlpha: .8, skyRelief: .9 } as const;

/**
 * Two instanced billboards, one per tier. The quad is expanded in view space so a
 * puff always faces the camera without a per frame CPU pass, and the shared study
 * clock drives the drift, so a frozen clock still renders every cloud in place.
 *
 * `tv` is the TV page (`?view=tv`), which scales the alphas by `STUDY_TV_CLOUDS`; without it
 * every value is exactly the study's.
 */
export function createStudyClouds(layout: StudyCloudLayout, atlas: T.Texture, time: { value: number }, tv = false) {
  const palettes = { sky: STUDY_CLOUD_TINTS.map(hex => new T.Color(hex)), island: STUDY_COLLAR_TINTS.map(hex => new T.Color(hex)) };
  const meshes: T.InstancedMesh[] = [];
  const materials: T.ShaderMaterial[] = [];
  const geometries: T.BufferGeometry[] = [];
  const matrix = new T.Matrix4();

  const tiers: Array<[number, StudyPuff[], string]> = [[0, layout.sky, "sky"], [1, layout.island, "island"]];
  for (const [tier, puffs, name] of tiers) {
    const palette = tier < .5 ? palettes.sky : palettes.island;
    const geometry = new T.PlaneGeometry(1, 1);
    const count = puffs.length;
    const tints = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const variants = new Float32Array(count);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count * 2);

    const uniforms = T.UniformsUtils.merge([T.UniformsLib.fog]);
    uniforms.atlas = { value: atlas };
    uniforms.tier = { value: tier };
    uniforms.fogRelief = { value: tier < .5 ? (tv ? STUDY_TV_CLOUDS.skyRelief : .6) : 0 };
    const alphaScale = tv ? (tier < .5 ? STUDY_TV_CLOUDS.skyAlpha : STUDY_TV_CLOUDS.islandAlpha) : 1;
    // The study clock is shared by reference, so nothing here needs its own frame hook.
    uniforms.time = time;
    // Shared by reference too, so the engine's one write reaches both cloud tiers.
    uniforms.studyExposure = STUDY_EXPOSURE;
    const material = new T.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: T.DoubleSide,
      fog: true,
    });
    material.customProgramCacheKey = () => `study-cloud-v2-${name}`;

    const mesh = new T.InstancedMesh(geometry, material, count);
    mesh.name = `Study clouds, ${name} tier`;
    mesh.renderOrder = -20;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    puffs.forEach((puff, i) => {
      mesh.setMatrixAt(i, matrix.makeTranslation(puff.x, puff.y, puff.z));
      palette[puff.tint].toArray(tints, i * 3);
      alphas[i] = tv ? puff.alpha * alphaScale : puff.alpha;
      variants[i] = puff.variant;
      phases[i] = puff.phase;
      sizes[i * 2] = puff.width;
      sizes[i * 2 + 1] = puff.height;
    });
    mesh.instanceMatrix.needsUpdate = true;
    geometry.setAttribute("puffTint", new T.InstancedBufferAttribute(tints, 3));
    geometry.setAttribute("puffAlpha", new T.InstancedBufferAttribute(alphas, 1));
    geometry.setAttribute("puffVariant", new T.InstancedBufferAttribute(variants, 1));
    geometry.setAttribute("puffPhase", new T.InstancedBufferAttribute(phases, 1));
    geometry.setAttribute("puffSize", new T.InstancedBufferAttribute(sizes, 2));

    meshes.push(mesh);
    materials.push(material);
    geometries.push(geometry);
  }

  return {
    meshes,
    materials,
    geometries,
    update(value: number) {
      for (const material of materials) (material.uniforms.time as { value: number }).value = value;
    },
  };
}

/**
 * Three soft cloud silhouettes in one 384 by 128 atlas. White, so the per puff tint
 * carries the colour. The only DOM use in this module lives here.
 */
export function studyCloudAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const rand = seededRandom(4021);
    for (let cell = 0; cell < 3; cell++) {
      const left = cell * 128;
      const count = 5 + Math.floor(rand() * 3);
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? .5 : i / (count - 1);
        const mound = Math.sin(t * Math.PI);
        const x = left + 44 + t * 40 + (rand() - .5) * 8;
        const y = 76 - mound * 14 + (rand() - .5) * 6;
        const radius = 18 + mound * 12 + rand() * 4;
        const gradient = context.createRadialGradient(x, y, radius * .1, x, y, radius);
        // A gentler falloff than the legacy sprite, so the puffs read as air, not as discs.
        gradient.addColorStop(0, "#fffaf4f0");
        gradient.addColorStop(.38, "#fff7f0a6");
        gradient.addColorStop(.72, "#fff4ec44");
        gradient.addColorStop(1, "#fff4ec00");
        context.fillStyle = gradient;
        context.fillRect(left, 0, 128, 128);
      }
    }
  }
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.ClampToEdgeWrapping;
  map.needsUpdate = true;
  return map;
}
