import * as T from "three";

/**
 * Small study material helpers. Nothing here touches the DOM at module level,
 * so the modules import cleanly in Node for the pure tests.
 */

/**
 * Every rim colour `studyRim` gave a material, the very object its shader uniform is bound to.
 * A WeakMap rather than the material's `userData`, which three copies as JSON on a clone.
 */
const rimColors = new WeakMap<T.Material, T.Color[]>();

/**
 * The TV page's clear air: the fresnel rims read as white halos round every silhouette in the
 * brighter light, so there each rim colour is scaled by this. The heart keeps its rim.
 */
export const STUDY_TV_RIM_SCALE = .6;

/**
 * Scales every rim `studyRim` put on `target` by `factor`, in place, and returns how many it
 * scaled. The uniform holds the same colour object, so this reaches the shader whether or not
 * the program has compiled yet. Call it once per material: the scale is not idempotent.
 */
export function scaleStudyRim(target: T.Material, factor: number) {
  const colors = rimColors.get(target);
  colors?.forEach(color => color.multiplyScalar(factor));
  return colors?.length ?? 0;
}

/**
 * A cheap fresnel rim, the fake glow the study is allowed to use.
 * It chains any hook the material already carries and keeps a distinct program key,
 * so two materials with different rims never share a compiled program.
 */
export function studyRim<M extends T.Material>(target: M, hex: string, power: number, strength: number) {
  const previousCompile = target.onBeforeCompile.bind(target);
  // Snapshot the previous key now: the default key reads onBeforeCompile, which is replaced below.
  const previousKey = target.customProgramCacheKey();
  const color = new T.Color(hex);
  // Recorded so the TV page can soften the rim (`scaleStudyRim`); nothing else reads it.
  rimColors.set(target, [...(rimColors.get(target) ?? []), color]);
  const key = `study-rim-${hex}-${power}-${strength}`;
  target.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.studyRimColor = { value: color };
    shader.fragmentShader = "uniform vec3 studyRimColor;\n" + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `outgoingLight += studyRimColor * pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), ${power.toFixed(2)}) * ${strength.toFixed(3)};
#include <opaque_fragment>`,
    );
  };
  target.customProgramCacheKey = () => `${previousKey}|${key}`;
  return target;
}

/**
 * Uniform objects shared by every study material that takes part in the radiance pass.
 *
 * `STUDY_GLOW_PASS` is 0 for the main pass and 1 while `StudyRadiance` renders the glow
 * layer, so one compiled program serves both passes. `STUDY_SUN_VIEW` carries the sun
 * direction in view space, refreshed once per frame.
 *
 * Verified against three 0.180 `WebGLRenderer.js` L2048-2091: `materialProperties.programs`
 * is a Map owned by each material and `materialProperties.uniforms` is assigned from the
 * object `onBeforeCompile` received, so assigning these shared objects reaches every
 * material that asks for them, and two materials may still share one program cache key.
 */
export const STUDY_GLOW_PASS = { value: 0 };
export const STUDY_SUN_VIEW = { value: new T.Vector3(1, 0, 0) };
/** 0 is the ordinary twinkle. Section 8 raises it to hush the sparkles during an arrival. */
export const STUDY_CALM = { value: 0 };
/**
 * Section 8: the study mood envelope, 1 parked and a little under one in flight.
 *
 * The sky and the cloud banks multiply their fragment output by it, so the whole backdrop
 * dips through a travel and lifts again on arrival with the tone mapping exposure the engine
 * sets from the same value. It is deliberately not bound to any material that draws a pearl's
 * words: the face, the finishing pass and the halo are all `toneMapped: false` and none of
 * them reads this uniform, so the wording is identical at every point of the envelope.
 */
export const STUDY_EXPOSURE = { value: 1 };
/**
 * The sculpted heart's five second breath, 0 to 1. Section 7 drives it from the shared study
 * clock so the emissive, the glow branch and the halo all swell on the same beat, and so a
 * still frame or a reduced motion frame resolves it exactly like any other frozen value.
 */
export const STUDY_HEART_PULSE = { value: 0 };

/**
 * What this material contributes to the glow layer.
 *
 * It chains any hook the material already carries, so it composes with `studyRim`,
 * `studyGlass`, `studySilk` and `studyStone`, and it reads whatever those patches left in
 * scope because it replaces the `#include <opaque_fragment>` they re-emitted.
 *
 * At `studyGlowPass` 0 the mix is exactly `outgoingLight`, so the main image is unchanged.
 *
 * All three shared study uniforms are bound here, whether or not the given expression reads
 * them, so any glow branch may use `studySunView` or `studyHeartPulse` without a second
 * helper. A uniform no expression mentions is dropped by the GLSL compiler.
 */
export function studyGlow<M extends T.Material>(target: M, key: string, colorGlsl: string, alphaGlsl?: string) {
  const previousCompile = target.onBeforeCompile.bind(target);
  const previousKey = target.customProgramCacheKey();
  target.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.studyGlowPass = STUDY_GLOW_PASS;
    shader.uniforms.studySunView = STUDY_SUN_VIEW;
    shader.uniforms.studyHeartPulse = STUDY_HEART_PULSE;
    shader.fragmentShader = "uniform float studyGlowPass, studyHeartPulse;\nuniform vec3 studySunView;\n" + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `outgoingLight = mix(outgoingLight, (${colorGlsl}), studyGlowPass);
${alphaGlsl ? `diffuseColor.a = mix(diffuseColor.a, (${alphaGlsl}), studyGlowPass);` : ""}
#include <opaque_fragment>`,
    );
  };
  target.customProgramCacheKey = () => `${previousKey}|study-glow-${key}`;
  return target;
}

/** A soft round dot built from plain bytes. No canvas, so it works anywhere the module loads. */
export function softDot(size = 32) {
  const data = new Uint8Array(size * size * 4), radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const distance = Math.sqrt((x - radius) * (x - radius) + (y - radius) * (y - radius));
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(Math.pow(Math.max(0, 1 - distance / radius), 1.7) * 255);
    }
  }
  const map = new T.DataTexture(data, size, size, T.RGBAFormat);
  map.colorSpace = T.SRGBColorSpace;
  map.magFilter = map.minFilter = T.LinearFilter;
  map.needsUpdate = true;
  return map;
}

/**
 * Glowing sparkle dots that breathe out of step with each other.
 * PointsMaterial keeps the renderer supplied size attenuation uniform, which a
 * raw ShaderMaterial would lose.
 *
 * `rate` scales the breathing speed. `STUDY_CALM` hushes the twinkle during an arrival,
 * and at the default 0 with `rate` 1 the formula is exactly the v1 one.
 *
 * Verified against three 0.180 `WebGLMaterials.js` L292-297 and `WebGLRenderer.js` L2534:
 * the point scale uniform is `_height * .5` with `_pixelRatio`, both the canvas values,
 * never the bound render target's, so a point drawn into the half size glow target covers
 * the same pixels and therefore twice the relative area. The glow pass damps it back.
 */
export function sparklePoints(clock: { value: number }, size: number, color: string, opacity: number, map: T.Texture, rate = 1) {
  const dots = new T.PointsMaterial({
    size, sizeAttenuation: true, map, color: new T.Color(color),
    transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  dots.onBeforeCompile = shader => {
    shader.uniforms.pearlTime = clock;
    shader.uniforms.sparkleRate = { value: rate };
    shader.uniforms.studyCalm = STUDY_CALM;
    shader.uniforms.studyGlowPass = STUDY_GLOW_PASS;
    shader.vertexShader = "attribute float phase;\nuniform float pearlTime, sparkleRate, studyCalm, studyGlowPass;\nvarying float twinkle;\n" + shader.vertexShader.replace(
      "gl_PointSize = size;",
      `twinkle = (.35 + .30 * studyCalm) + (.65 - .40 * studyCalm) * pow(.5 + .5 * sin(pearlTime * 1.6 * sparkleRate * (1. - .5 * studyCalm) + phase * 6.2832), 2.);
gl_PointSize = size * (.6 + .4 * twinkle) * mix(1., .6, studyGlowPass);`,
    );
    shader.fragmentShader = "varying float twinkle;\n" + shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      "vec4 diffuseColor = vec4( diffuse, opacity ) * twinkle;",
    );
  };
  dots.customProgramCacheKey = () => "study-sparkle-v2";
  return dots;
}

/**
 * The glass of the study pearl and of its canonical medallions.
 *
 * It stays a lit physical material rather than a raw ShaderMaterial so it keeps
 * sampling `scene.environment` through the ordinary pipeline, which is where the
 * broad curved reflections come from. Only the coloured fresnel rim and the
 * rim-driven opacity are added on top.
 *
 * Verified against three 0.180 `ShaderLib/meshphysical.glsl.js`: at
 * `#include <opaque_fragment>` the shader already has `vViewPosition` (declared
 * unconditionally in the fragment head), the view space `vec3 normal` from
 * `<normal_fragment_begin>`, `outgoingLight`, `totalSpecular`, `diffuseColor`
 * and the `opacity` uniform, plus the `saturate` macro from `<common>`.
 * Three 0.180 ships no `luminance()` helper in any shader chunk, so the
 * specular weight below uses the Rec. 709 coefficients directly.
 */
export function studyGlass(opacity: number) {
  const glass = new T.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: .07,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: .08,
    iridescence: 1,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [140, 520],
    envMapIntensity: 1.6,
    specularIntensity: 1,
    transparent: true,
    opacity,
    depthWrite: false,
    side: T.FrontSide,
  });
  glass.onBeforeCompile = shader => {
    shader.uniforms.pearlSunView = STUDY_SUN_VIEW;
    shader.fragmentShader = "uniform vec3 pearlSunView;\n" + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float pearlNv = saturate(dot(normalize(vViewPosition), normal));
float pearlRim = pow(1.0 - pearlNv, 2.6);
vec3 pearlTint = mix(vec3(.97,.55,.74), vec3(.68,.60,.94), smoothstep(-.5,.7,normal.y));
pearlTint = mix(pearlTint, vec3(1.,.87,.60), smoothstep(.15,.95,normal.x) * .55);
// Section 7: the side of the sphere the low sun is on takes the warm key. Both the normal
// and the sun direction are in view space, so the warm edge stays put as the camera travels
// instead of sliding around the pearl. It only reaches the image through pearlRim below,
// which is near zero across the middle of the sphere, so the words keep their own contrast.
pearlTint = mix(pearlTint, vec3(1.,.87,.60), smoothstep(-.1,.8, dot(normal, pearlSunView)) * .6);
// The lit sphere is already near white at grazing angles, so the tint has to colour that
// specular as well as add to it, or the rim tone maps back to plain white.
outgoingLight = mix(outgoingLight, outgoingLight * pearlTint, pearlRim * .85);
outgoingLight += pearlTint * pearlRim * 1.35;
diffuseColor.a = clamp(opacity + pearlRim * .82 + dot(totalSpecular, vec3(.2126, .7152, .0722)) * .35, 0., 1.);
#include <opaque_fragment>`,
    );
  };
  // clone() drops the patch above, so the key names this exact recipe.
  glass.customProgramCacheKey = () => `study-glass-v2-${opacity}`;
  return glass;
}

/**
 * Translucent pink silk, shared by the Sanctuary ribbons and by the arrival
 * ribbon study. It stays a lit physical material so the sheen and the clearcoat
 * still read as cloth; only a grazing-angle lift and a matching alpha falloff
 * are added, which is what gives a broad ribbon its lit folded edges.
 *
 * Verified against three 0.180 `ShaderLib/meshphysical.glsl.js`: at
 * `#include <opaque_fragment>` the shader already carries `vViewPosition`, the
 * view space `vec3 normal` from `<normal_fragment_begin>`, `outgoingLight`,
 * `diffuseColor` and the `saturate` macro from `<common>`.
 */
export function studySilk() {
  const silk = new T.MeshPhysicalMaterial({
    color: "#f7bfd3",
    transparent: true,
    opacity: .64,
    side: T.DoubleSide,
    depthWrite: false,
    roughness: .42,
    clearcoat: .35,
    clearcoatRoughness: .5,
    sheen: 1,
    sheenColor: new T.Color("#ffe6ee"),
    sheenRoughness: .35,
    emissive: new T.Color("#ff9ec0"),
    emissiveIntensity: .07,
    dithering: true,
  });
  silk.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float silkF = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.0);
outgoingLight += vec3(1., .86, .92) * silkF * .35;
diffuseColor.a *= 1.0 - silkF * .25;
#include <opaque_fragment>`,
    );
  };
  silk.customProgramCacheKey = () => "study-silk-v1";
  return silk;
}

/**
 * The sculpted rock of every floating island: warm ivory at the walkable rim,
 * deepening to a rose shadow under the keel, with a slow vertical ripple so the
 * lathe reads as carved stone rather than a smooth cone.
 *
 * Verified against three 0.180 `ShaderLib/meshphysical.glsl.js`, which
 * MeshStandardMaterial also compiles: `vec4 diffuseColor` is declared before
 * `<map_fragment>` and `<color_fragment>`, so the tint multiply goes after
 * `<color_fragment>`, where diffuse is final. `#include <begin_vertex>` is the
 * first place the vertex stage has run, and `position` is still object space
 * there, so `studyLocalY` spans the lathe profile (-5.9 to 0).
 *
 * Section 6 and 7 chain further `onBeforeCompile` patches onto this material,
 * so it is built by a factory and keeps a distinct program key.
 */
export function studyStone() {
  const stone = new T.MeshStandardMaterial({ color: "#f3e3da", roughness: .86, dithering: true });
  stone.onBeforeCompile = shader => {
    shader.vertexShader = "varying float studyLocalY;\nvarying vec2 vStoneXZ;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
studyLocalY = position.y;
vStoneXZ = position.xz;`,
    );
    shader.fragmentShader = "varying float studyLocalY;\nvarying vec2 vStoneXZ;\n" + shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
// The epsilon keeps atan defined at the single lathe vertex on the axis, where x and z are both zero.
diffuseColor.rgb *= mix(vec3(.87,.70,.72), vec3(1.), smoothstep(-5.9,-1.2,studyLocalY)) * (.94 + .06*sin(studyLocalY*3.1 + atan(vStoneXZ.y, vStoneXZ.x + 1e-5)*6.));`,
    );
  };
  stone.customProgramCacheKey = () => "study-stone-v1";
  return studyRim(stone, "#ffe1cf", 3, .25);
}

/**
 * Section 7: light thrown back off the sea, playing across the keel of every island.
 *
 * It chains onto `studyStone`, so `studyLocalY` (the lathe profile, -5.9 to 0 in object
 * space, before the per island y scale) is already declared by that patch and the band below
 * reads it directly. The noise is sampled in world space instead, through a varying computed
 * from `modelMatrix`, because the lathe's own xz only spans a unit circle and every island
 * would otherwise carry the identical pattern. The islands are not batched, so `modelMatrix`
 * is the real per island transform.
 *
 * Verified against three 0.180 `ShaderLib/meshphysical.glsl.js`: `position` is still object
 * space at `#include <begin_vertex>`, and at `#include <opaque_fragment>` the fragment stage
 * carries `outgoingLight` and the `saturate` macro from `<common>`.
 */
export function studyStoneCaustic<M extends T.Material>(target: M, clock: { value: number }) {
  const previousCompile = target.onBeforeCompile.bind(target);
  const previousKey = target.customProgramCacheKey();
  target.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.studyCausticTime = clock;
    shader.vertexShader = "varying vec3 studyStoneWorld;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
studyStoneWorld = (modelMatrix * vec4(position, 1.)).xyz;`,
    );
    shader.fragmentShader = `varying vec3 studyStoneWorld;
uniform float studyCausticTime;
float studyCausticHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float studyCausticNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(studyCausticHash(i), studyCausticHash(i + vec2(1., 0.)), f.x),
             mix(studyCausticHash(i + vec2(0., 1.)), studyCausticHash(i + 1.), f.x), f.y);
}
` + shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      // The band is raised from the design's -3.2 to -2.6 window. A debug capture with the band
// written out as flat colour showed that window landing on the last few pixels of the keel:
// every study camera looks down at an island from above its terrace, so the only part of the
// lathe a viewer ever sees is its widest bulge, about -1.9 to 0 in object space. The window
// below covers that bulge and fades out before the walkable rim.
`float studyCausticBand = smoothstep(-2.6, -1.9, studyLocalY) * (1. - smoothstep(-.9, -.35, studyLocalY));
vec2 studyCausticP = studyStoneWorld.xz;
// A higher gain and exponent than the design's 2.2 and 2.5: it keeps the mean light added
// about the same, which the luminance ceiling needs, while raising the peaks so the result
// reads as moving light play rather than a flat wash over the rock.
float studyCaustic = pow(saturate(
  studyCausticNoise(studyCausticP * .55 + studyCausticTime * .06)
  * studyCausticNoise(studyCausticP * .9 - studyCausticTime * .045) * 2.6), 3.2);
outgoingLight += vec3(.55, .88, .92) * studyCaustic * studyCausticBand * .45;
#include <opaque_fragment>`,
    );
  };
  target.customProgramCacheKey = () => `${previousKey}|study-stone-caustic-v1`;
  return target;
}
