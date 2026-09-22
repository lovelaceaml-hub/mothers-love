import * as T from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { STUDY_GLOW_PASS, STUDY_SUN_VIEW } from "./study-materials";
import { STUDY_SUN } from "./study-palette";

/**
 * Radiance for the sample-only design study: a glow layer, screen space god rays and a
 * protect mask that keeps both of them out of every visible pearl disc.
 *
 * The main pass stays exactly as it is today, direct to the canvas with MSAA and
 * NeutralToneMapping. Everything here happens after it, into its own render targets, and
 * arrives back on screen as one additive full screen quad.
 *
 * Layer map (three `Layers` bits):
 *   0  the ordinary world, the only layer the camera sees for the main pass
 *   1  the glow layer
 *   2  the god ray occluders and the rays sun sprite
 *   3  the protect mask, which only the pearl occluder discs join
 *
 * Verified against the installed three 0.180 sources:
 *  - `examples/jsm/postprocessing/UnrealBloomPass.js` L277-365: `render` reads only
 *    `readBuffer.texture`, never `writeBuffer`, and with `renderToScreen` false it ends by
 *    blending its composite into `readBuffer` and leaves that target bound. So the pass is
 *    driven standalone with the glow target passed as both buffers, and the composite is
 *    read from `renderTargetsHorizontal[0]` before the renderer is pointed back at the canvas.
 *  - same file L246-264: `setSize` halves the given size internally, and there are 5 mips,
 *    11 HalfFloat targets and 13 full screen quad draws per call.
 *  - `examples/jsm/shaders/LuminosityHighPassShader.js` calls `luminance()`, which
 *    `src/renderers/webgl/WebGLProgram.js` L155 defines in the fragment prefix, so the pass
 *    compiles in 0.180.
 *  - `src/renderers/WebGLRenderer.js` L1612: `render()` calls `info.reset()` only while
 *    `info.autoReset` is true, so the engine turns that off and this class resets once per
 *    presented frame. L1314 and L1332: lights are layer tested, so the glow camera on layer
 *    1 collects no lights and runs no shadow pass. L1987: `scene.overrideMaterial` replaces
 *    a material only when `material.allowOverride` is true, which is how the rays sun sprite
 *    stays bright inside the black mask pass.
 *  - `src/renderers/webgl/WebGLPrograms.js` L165-171 and L202: anything rendered into a
 *    render target compiles with `NoToneMapping` and a linear output color space, so the
 *    glow target holds linear radiance and the composite quad does the sRGB conversion
 *    itself with `#include <colorspace_fragment>`.
 *  - `src/renderers/webgl/WebGLBackground.js` L29-51: a null `scene.background` clears with
 *    the renderer clear color, which is how the aux targets are cleared to transparent black.
 */

export type StudyTier = "high" | "auto" | "low";

/**
 * Half of the drawing buffer, capped at 1920 wide and kept on the buffer's aspect.
 * Pure, so the sizing ladder is provable without a WebGL context.
 */
export function glowTargetSize(width: number, height: number) {
  const w = Math.max(1, Math.min(1920, Math.round(Math.max(1, width) / 2)));
  const h = Math.max(1, Math.round((w * Math.max(1, height)) / Math.max(1, width)));
  return { width: w, height: h };
}

/**
 * How much of the god rays this frame earns.
 *
 * `facing` is the camera forward direction dotted with the direction from the camera to the
 * sun: at or below zero the sun is behind the viewer and the rays are skipped outright.
 * Otherwise the weight falls off as the sun leaves the frame, so the shafts fade instead of
 * snapping off at the screen edge.
 */
export function sunScreenWeight(ndc: { x: number; y: number }, facing: number) {
  if (!(facing > 0)) return 0;
  const offset = Math.max(Math.abs(ndc.x), Math.abs(ndc.y));
  const t = Math.max(0, Math.min(1, (offset - 1) / 0.35));
  return 1 - t * t * (3 - 2 * t);
}

/** The single texture `UnrealBloomPass` leaves its five mip composite in. */
export function bloomTexture(pass: UnrealBloomPass) {
  return pass.renderTargetsHorizontal[0].texture;
}

const RAY_VERTEX = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const RAY_FRAGMENT = `uniform sampler2D maskTexture;
uniform vec2 sunUv;
uniform float density, decay, weight, exposure;
varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  vec2 walk = (uv - sunUv) * (density / float(SAMPLES));
  float illumination = 1.;
  vec3 sum = vec3(0.);
  for (int i = 0; i < SAMPLES; i++) {
    uv -= walk;
    // Sampling past the edge would smear the clamped border pixel down the whole shaft.
    vec2 inside = step(vec2(0.), uv) * step(uv, vec2(1.));
    sum += texture2D(maskTexture, uv).rgb * illumination * weight * inside.x * inside.y;
    illumination *= decay;
  }
  gl_FragColor = vec4(sum * exposure, 1.);
}`;

const COMPOSITE_FRAGMENT = `uniform sampler2D bloomTexture, raysTexture, protectTexture;
uniform vec3 glowTint, rayTint;
uniform float glowStrength, rayStrength, sunWeight;
varying vec2 vUv;
void main(){
  vec3 glow = texture2D(bloomTexture, vUv).rgb * glowTint * glowStrength;
  vec3 rays = texture2D(raysTexture, vUv).rgb * rayTint * rayStrength * sunWeight;
  // The protect mask is white over every pearl disc being read. Nothing this pass produces
  // is allowed to touch those pixels, so the text stays exactly as the main pass drew it.
  // The mask is a quarter of the glow target's dimensions, so the sampled edge is a short
  // bilinear ramp; the smoothstep turns that ramp into a soft join instead of a cut line.
  float protect = smoothstep(.15, .85, clamp(texture2D(protectTexture, vUv).r, 0., 1.));
  gl_FragColor = vec4(clamp((glow + rays) * (1. - protect), 0., 1.), 1.);
  #include <colorspace_fragment>
}`;

export class StudyRadiance {
  /** Undefined when the context cannot render to a half float target. The study then keeps its single pass. */
  static create(renderer: T.WebGLRenderer) {
    const float = renderer.extensions.has("EXT_color_buffer_float");
    const half = renderer.extensions.has("EXT_color_buffer_half_float");
    if (!float && !half) return undefined;
    return new StudyRadiance(renderer);
  }

  /** Tuned down from the design's .62 and .5 after the checkpoint captures. See the uniforms below. */
  glowStrength = 0.22;
  rayStrength = 0.12;
  private tier: StudyTier = "auto";
  private readonly glowRT: T.WebGLRenderTarget;
  private readonly protectRT: T.WebGLRenderTarget;
  private readonly maskRT: T.WebGLRenderTarget;
  private readonly raysRT: T.WebGLRenderTarget;
  private readonly bloom: UnrealBloomPass;
  private readonly rayMaterials = new Map<number, T.ShaderMaterial>();
  private readonly rayUniforms = {
    maskTexture: { value: null as T.Texture | null },
    sunUv: { value: new T.Vector2(.5, .5) },
    density: { value: .92 },
    decay: { value: .968 },
    // Tuned down from RADIANCE-DESIGN.md's .32 after the checkpoint captures: this is a
    // deliberate correction to the wash, not drift from the design.
    exposure: { value: .20 },
    weight: { value: .045 },
  };
  private readonly compositeUniforms = {
    bloomTexture: { value: null as T.Texture | null },
    raysTexture: { value: null as T.Texture | null },
    protectTexture: { value: null as T.Texture | null },
    // Warm, not white. Linear multipliers, so they are given as numbers rather than hex:
    // three's Color(r, g, b) already treats three numbers as working (linear) space values.
    glowTint: { value: new T.Color(1.0, .88, .84) },
    rayTint: { value: new T.Color(1.0, .87, .74) },
    // Tuned down from RADIANCE-DESIGN.md (.62 glow, .5 rays) after the checkpoint captures
    // showed the pale pastel palette washing to white. A deliberate correction, not drift.
    glowStrength: { value: .22 },
    rayStrength: { value: .12 },
    sunWeight: { value: 0 },
  };
  private readonly compositeMaterial: T.ShaderMaterial;
  private readonly compositeQuad: FullScreenQuad;
  private readonly rayQuad: FullScreenQuad;
  private readonly whiteBasic = new T.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  private readonly blackBasic = new T.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false });
  private readonly clearColor = new T.Color();
  private readonly sunWorld = new T.Vector3(...STUDY_SUN.direction).multiplyScalar(330);
  private readonly sunNdc = new T.Vector3();
  private readonly toSun = new T.Vector3();
  private readonly forward = new T.Vector3();
  private readonly sunDirection = new T.Vector3(...STUDY_SUN.direction);
  private readonly scratch = new T.Vector3();
  private disposed = false;

  private constructor(private readonly renderer: T.WebGLRenderer) {
    const buffer = renderer.getDrawingBufferSize(new T.Vector2());
    const glow = glowTargetSize(buffer.x, buffer.y);
    const aux = { width: Math.max(1, Math.round(glow.width / 2)), height: Math.max(1, Math.round(glow.height / 2)) };
    this.glowRT = new T.WebGLRenderTarget(glow.width, glow.height, { type: T.HalfFloatType, depthBuffer: true });
    this.glowRT.texture.name = "study glow";
    this.glowRT.texture.generateMipmaps = false;
    this.raysRT = new T.WebGLRenderTarget(aux.width, aux.height, { type: T.HalfFloatType, depthBuffer: false });
    this.raysRT.texture.generateMipmaps = false;
    // Explicitly linear: the mask is a quarter of the glow target's dimensions, and a
    // point sampled disc edge would magnify into the stair stepped cut the checkpoint showed.
    this.protectRT = new T.WebGLRenderTarget(aux.width, aux.height, {
      depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter,
    });
    this.protectRT.texture.generateMipmaps = false;
    this.maskRT = new T.WebGLRenderTarget(aux.width, aux.height, { depthBuffer: true });
    this.maskRT.texture.generateMipmaps = false;
    // Threshold 0: the glow layer already contains only what is meant to glow, so a
    // luminance cut would only throw away the soft tails this pass exists for.
    this.bloom = new UnrealBloomPass(new T.Vector2(glow.width, glow.height), .8, .55, 0);
    this.bloom.renderToScreen = false;
    this.bloom.setSize(glow.width, glow.height);
    this.compositeMaterial = new T.ShaderMaterial({
      uniforms: this.compositeUniforms,
      vertexShader: RAY_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      // Screen blending, not additive: out = dst + src * (1 - dst), so however bright the
      // glow is it can never push a pixel past white. On a palette that already sits near
      // .9 this is the difference between radiance and a flat wash.
      blending: T.CustomBlending,
      blendEquation: T.AddEquation,
      blendSrc: T.OneMinusDstColorFactor,
      blendDst: T.OneFactor,
      blendEquationAlpha: T.AddEquation,
      blendSrcAlpha: T.OneFactor,
      blendDstAlpha: T.ZeroFactor,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    this.compositeMaterial.customProgramCacheKey = () => "study-radiance-composite-v2";
    this.compositeUniforms.bloomTexture.value = bloomTexture(this.bloom);
    this.compositeUniforms.raysTexture.value = this.raysRT.texture;
    this.compositeUniforms.protectTexture.value = this.protectRT.texture;
    this.rayUniforms.maskTexture.value = this.maskRT.texture;
    this.compositeQuad = new FullScreenQuad(this.compositeMaterial);
    this.rayQuad = new FullScreenQuad(this.rayMaterial(48));
  }

  private rayMaterial(samples: number) {
    const existing = this.rayMaterials.get(samples);
    if (existing) return existing;
    const material = new T.ShaderMaterial({
      uniforms: this.rayUniforms,
      defines: { SAMPLES: samples },
      vertexShader: RAY_VERTEX,
      fragmentShader: RAY_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    material.customProgramCacheKey = () => `study-radiance-rays-v1-${samples}`;
    this.rayMaterials.set(samples, material);
    return material;
  }

  setTier(tier: StudyTier) {
    this.tier = tier;
    if (tier === "low") return;
    this.rayQuad.material = this.rayMaterial(tier === "high" ? 48 : 32);
    // Corrected from the design's .62 High and .45 Auto after the checkpoint captures.
    this.glowStrength = tier === "high" ? .22 : .16;
  }

  resize(width: number, height: number) {
    const glow = glowTargetSize(width, height);
    const aux = { width: Math.max(1, Math.round(glow.width / 2)), height: Math.max(1, Math.round(glow.height / 2)) };
    this.glowRT.setSize(glow.width, glow.height);
    this.raysRT.setSize(aux.width, aux.height);
    this.protectRT.setSize(aux.width, aux.height);
    this.maskRT.setSize(aux.width, aux.height);
    this.bloom.setSize(glow.width, glow.height);
    // setSize allocates new textures on the bloom's own targets, so the composite has to
    // re-read the one it samples or it would keep the disposed texture from before.
    this.compositeUniforms.bloomTexture.value = bloomTexture(this.bloom);
  }

  /**
   * One presented frame: the main image, then the aux passes, then one additive composite.
   * Every renderer setting this touches is restored before it returns.
   */
  render(scene: T.Scene, camera: T.PerspectiveCamera) {
    const renderer = this.renderer;
    renderer.info.reset();
    // The sun in view space, for the study materials that light their rim from it.
    STUDY_SUN_VIEW.value.copy(this.sunDirection).transformDirection(camera.matrixWorldInverse);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    if (this.tier === "low" || this.disposed) return;

    this.toSun.copy(this.sunWorld).sub(camera.position);
    camera.getWorldDirection(this.forward);
    const facing = this.forward.dot(this.scratch.copy(this.toSun).normalize());
    this.sunNdc.copy(this.sunWorld).project(camera);
    const weight = sunScreenWeight(this.sunNdc, facing);

    const background = scene.background;
    const fog = scene.fog instanceof T.Fog ? scene.fog : null;
    const fogColor = fog ? fog.color.getHex() : 0;
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;

    scene.background = null;
    if (fog) fog.color.setHex(0x000000);
    STUDY_GLOW_PASS.value = 1;
    renderer.setClearColor(0x000000, 0);

    camera.layers.set(1);
    renderer.setRenderTarget(this.glowRT);
    renderer.render(scene, camera);

    camera.layers.set(3);
    scene.overrideMaterial = this.whiteBasic;
    renderer.setRenderTarget(this.protectRT);
    renderer.render(scene, camera);

    if (weight > 0) {
      camera.layers.set(2);
      scene.overrideMaterial = this.blackBasic;
      renderer.setRenderTarget(this.maskRT);
      renderer.render(scene, camera);
    }

    scene.overrideMaterial = null;
    camera.layers.set(0);
    scene.background = background;
    if (fog) fog.color.setHex(fogColor);
    STUDY_GLOW_PASS.value = 0;

    this.bloom.render(renderer, this.glowRT, this.glowRT, 0, false);

    renderer.autoClear = false;
    if (weight > 0) {
      this.rayUniforms.sunUv.value.set(this.sunNdc.x * .5 + .5, this.sunNdc.y * .5 + .5);
      renderer.setRenderTarget(this.raysRT);
      this.rayQuad.render(renderer);
    }
    this.compositeUniforms.sunWeight.value = weight;
    this.compositeUniforms.glowStrength.value = this.glowStrength;
    this.compositeUniforms.rayStrength.value = this.rayStrength;
    renderer.setRenderTarget(null);
    this.compositeQuad.render(renderer);

    renderer.autoClear = autoClear;
    renderer.setClearColor(this.clearColor, clearAlpha);
  }

  dispose() {
    this.disposed = true;
    this.bloom.dispose();
    this.glowRT.dispose();
    this.protectRT.dispose();
    this.maskRT.dispose();
    this.raysRT.dispose();
    this.compositeMaterial.dispose();
    this.rayMaterials.forEach(material => material.dispose());
    this.rayMaterials.clear();
    this.whiteBasic.dispose();
    this.blackBasic.dispose();
    // Every FullScreenQuad shares one module level geometry in three 0.180, so the two
    // quads here and the bloom's own quad all release the same buffers. Disposing it is
    // safe and idempotent: a later use simply re-uploads the three vertices.
    this.compositeQuad.dispose();
    this.rayQuad.dispose();
  }
}
