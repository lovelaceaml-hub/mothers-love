import * as T from "three";
import { seededRandom } from "../world-data";
import { studyRim } from "./study-materials";

/**
 * Cotton candy tree crowns for the sample-only visual study.
 *
 * The approved references show rounded, fluffy canopies, not petal clusters, so a
 * crown is a small cluster of squashed spheres stamped into one instanced mesh per
 * district. `studyCanopyPuffs` is pure data with no DOM and no Three.js objects.
 */

/** One squashed sphere in a crown, in tree local space before the tree scale. */
export type StudyCanopyPuff = { x: number; y: number; z: number; r: number; squash: number };

/**
 * Thirteen to fifteen puffs: one wide core, a ring of eight around it and four
 * smaller ones riding on top, with an occasional filler so no two crowns match.
 * Every puff centre stays within 2.6 of the crown centre at (0, 4.9, 0).
 */
export function studyCanopyPuffs(seed: number): StudyCanopyPuff[] {
  const rand = seededRandom(seed);
  const squash = () => .8 + rand() * .15;
  const puffs: StudyCanopyPuff[] = [{ x: 0, y: 4.9, z: 0, r: 1.9, squash: squash() }];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (rand() - .5) * .34;
    const radius = 1.6 + rand() * .7;
    puffs.push({ x: Math.cos(angle) * radius, y: 4.3 + rand() * 1.3, z: Math.sin(angle) * radius, r: 1.15 + rand() * .45, squash: squash() });
  }
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + .6 + (rand() - .5) * .4;
    const radius = .5 + rand() * .6;
    puffs.push({ x: Math.cos(angle) * radius, y: 5.9 + rand() * .7, z: Math.sin(angle) * radius, r: .9 + rand() * .3, squash: squash() });
  }
  const filler = Math.min(2, Math.floor(rand() * 3));
  for (let i = 0; i < filler; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = .9 + rand() * .9;
    puffs.push({ x: Math.cos(angle) * radius, y: 4.6 + rand() * 1.1, z: Math.sin(angle) * radius, r: 1 + rand() * .4, squash: squash() });
  }
  return puffs;
}

/**
 * The cotton crown surface: a sheened physical pink with the study rim, plus a low
 * frequency world space noise that darkens the diffuse a little so a crown reads as
 * a volume instead of a flat pink blob. The noise is chained onto the rim hook the
 * same way `studyRim` chains, and the cache key names both stages.
 */
export function studyCottonMaterial() {
  const cotton = studyRim(new T.MeshPhysicalMaterial({
    color: "#f7cfdd",
    roughness: .78,
    sheen: .8,
    sheenColor: new T.Color("#ffe4ec"),
    sheenRoughness: .55,
    dithering: true,
  }), "#fff0e0", 2.2, .35);
  const previousCompile = cotton.onBeforeCompile.bind(cotton);
  const previousKey = cotton.customProgramCacheKey();
  cotton.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.vertexShader = "varying vec3 vWorldPosition;\n" + shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
#ifdef USE_INSTANCING
  vWorldPosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`,
    );
    shader.fragmentShader = `varying vec3 vWorldPosition;
float studyCottonHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
float studyCottonNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(studyCottonHash(i), studyCottonHash(i + vec3(1,0,0)), f.x), mix(studyCottonHash(i + vec3(0,1,0)), studyCottonHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(studyCottonHash(i + vec3(0,0,1)), studyCottonHash(i + vec3(1,0,1)), f.x), mix(studyCottonHash(i + vec3(0,1,1)), studyCottonHash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
` + shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
diffuseColor.rgb *= (0.86 + 0.14 * studyCottonNoise(vWorldPosition * 0.7));`,
    );
  };
  cotton.customProgramCacheKey = () => `${previousKey}|study-cotton-volume-v1`;
  return cotton;
}
