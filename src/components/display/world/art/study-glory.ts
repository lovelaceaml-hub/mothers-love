import * as T from "three";

/**
 * Two Section 7 pieces that belong to no single builder.
 *
 * `StudyWaterHalo` is the soft reflection the focal pearl lays on the sea, stretched along
 * the line from the pearl to the viewer the way a real light path is. The recognition
 * manager owns it, because only that manager knows which pearl is being read.
 *
 * `lanternLayout` is the pure placement of the architecture lights, so the layout can be
 * proved in a plain Node test without a browser or a WebGL context.
 */

/** The sea sits at y -5, so the halo floats just above it and never fights it for depth. */
export const WATER_HALO_Y = -4.97;
/** Across the swell, and along the line from the pearl to the viewer. */
export const WATER_HALO_SPAN = { across: 9, along: 14 };
/**
 * Corrected down from the design's .3 after the checkpoint captures, to hold the whole
 * radiance pass inside the 1.5 average luminance the section is allowed. Reached over about
 * .6 s and released the same way.
 */
export const WATER_HALO_OPACITY = .18;
const WATER_HALO_TAU = .6;

/**
 * The TV page's clear air (Anthony, 2026-09-24: "Can you remove the haze foggy look"). Every
 * additive speck adds light on top of the picture, and hundreds of them together (lanterns on
 * every rail and keystone, the sparkle field, the motes round the camera) lift the whole frame
 * toward white, which reads as haze. On the TV they are fewer in strength, not in number: the
 * lanterns from .58, the sparkle field from .9, the motes from .28, and the water halo under
 * the bubble being read from `WATER_HALO_OPACITY`. The stars also leave the glow layer there.
 */
export const STUDY_TV_SPECKS = { lanterns: .4, sparkles: .55, motes: .12, waterHalo: .08 } as const;

const HALO_VERTEX = `varying vec2 haloUv;
void main(){ haloUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const HALO_FRAGMENT = `varying vec2 haloUv;
uniform float haloOpacity, haloTime;
void main(){
  vec2 q = haloUv - .5;
  // A light reflected off moving water is a narrow streak drawn toward the viewer, not a disc.
  float across = exp(-abs(q.x) * 6.);
  float along = exp(-pow(q.y * 2.6, 2.));
  float core = pow(max(0., 1. - length(vec2(q.x * 2.9, q.y * 1.6)) * 2.), 2.2);
  float ripple = .74 + .26 * sin(q.y * 54. - haloTime * 1.6 + sin(q.x * 13. + haloTime * .5) * 1.2);
  float glow = (across * along * .62 + core * .74) * ripple;
  vec3 rgb = mix(vec3(1., .91, .82), vec3(1., .80, .87), smoothstep(.1, .8, abs(q.y) * 2.)) * glow;
  gl_FragColor = vec4(rgb, clamp(glow * haloOpacity, 0., 1.));
  #include <colorspace_fragment>
}`;

export class StudyWaterHalo {
  private readonly plane = new T.PlaneGeometry(1, 1);
  private readonly uniforms = { haloOpacity: { value: 0 }, haloTime: { value: 0 } };
  private readonly material: T.ShaderMaterial;
  private readonly mesh: T.Mesh;
  private lastTime = 0;

  /** `peak` is the opacity the halo fades up to: the study's own unless the TV page hands in its lighter one. */
  constructor(scene: T.Scene, private readonly peak = WATER_HALO_OPACITY) {
    this.material = new T.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: HALO_VERTEX,
      fragmentShader: HALO_FRAGMENT,
      transparent: true, depthWrite: false, depthTest: true,
      blending: T.AdditiveBlending, toneMapped: false, fog: false,
    });
    this.material.customProgramCacheKey = () => "study-water-halo-v1";
    this.mesh = new T.Mesh(this.plane, this.material);
    this.mesh.name = "Study water halo";
    // YXZ so the yaw below is a plain turn about world up, applied after the plane lies flat.
    this.mesh.rotation.order = "YXZ";
    this.mesh.scale.set(WATER_HALO_SPAN.across, WATER_HALO_SPAN.along, 1);
    this.mesh.renderOrder = -40;
    this.mesh.frustumCulled = false;
    this.mesh.layers.enable(1);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /**
   * `focus` is the world place of the pearl being read, or undefined while none is.
   *
   * A still frame and a reduced motion frame never advance the clock, so the fade snaps to
   * its target rather than leaving a capture half way through it.
   */
  update(focus: T.Vector3 | undefined, camera: T.Camera, time: number) {
    const dt = time - this.lastTime;
    this.lastTime = time;
    const target = focus ? this.peak : 0;
    const blend = dt > 0 ? 1 - Math.exp(-dt / WATER_HALO_TAU) : 1;
    this.uniforms.haloOpacity.value += (target - this.uniforms.haloOpacity.value) * blend;
    this.uniforms.haloTime.value = time;
    if (focus) {
      this.mesh.position.set(focus.x, WATER_HALO_Y, focus.z);
      const dx = camera.position.x - focus.x, dz = camera.position.z - focus.z;
      const length = Math.hypot(dx, dz) || 1;
      // The plane's long axis is world -Z once it lies flat, so this turns that axis onto
      // the horizontal line from the pearl out to the camera.
      this.mesh.rotation.set(-Math.PI / 2, Math.atan2(-dx / length, -dz / length), 0);
    }
    this.mesh.visible = this.uniforms.haloOpacity.value > .002;
  }

  /** Test and report seam: the opacity the halo is presenting this frame. */
  opacity() { return this.uniforms.haloOpacity.value; }

  dispose() {
    this.mesh.removeFromParent();
    this.plane.dispose();
    this.material.dispose();
  }
}

/** Every sixth sample along a bridge rail carries a lantern. */
export const LANTERN_RAIL_STRIDE = 6;
/** How far above the rail a lantern floats. */
export const LANTERN_RAIL_LIFT = .35;

export type LanternPoint = readonly [number, number, number];

/**
 * Where the architecture lights sit: a steady lamp every sixth sample along every bridge
 * rail, and one at the keystone of every arch in the connected world.
 *
 * Pure and order preserving, so the resulting buffer is identical on every run and the
 * count and the lift are provable without a browser.
 */
export function lanternLayout(
  rails: readonly (readonly LanternPoint[])[],
  keystones: readonly LanternPoint[],
) {
  const places: number[] = [];
  for (const rail of rails)
    for (let i = 0; i < rail.length; i += LANTERN_RAIL_STRIDE)
      places.push(rail[i][0], rail[i][1] + LANTERN_RAIL_LIFT, rail[i][2]);
  for (const keystone of keystones) places.push(keystone[0], keystone[1], keystone[2]);
  return new Float32Array(places);
}
