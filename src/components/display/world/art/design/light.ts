import * as T from "three";
import { studySkyFragment, studySunHalo } from "../study-lighting";
import { STUDY_EXPOSURE } from "../study-materials";
import { STUDY_SKY, STUDY_SKY_RADIUS, STUDY_SUN, STUDY_TONE, STUDY_TV_TONE } from "../study-palette";
import type { DesignWorldBase } from "./base";

/** The lights, the sky dome, the sun sprites and the sky glow band. */
export function designLight({ scene, tv, material, time, mesh, geometry, texture }: DesignWorldBase) {
  // The TV page's clearer day (`STUDY_TV_TONE`): less soft sky fill, more sun, a firmer shadow
  // and a touch more warm fill, in the same colours.
  scene.add(new T.HemisphereLight("#f7dbe0", "#cfa79d", tv ? STUDY_TV_TONE.hemisphere : .55));
  const sun = new T.DirectionalLight(STUDY_SUN.color, tv ? STUDY_TV_TONE.sun : 2.3);
  // STUDY_SUN fixes the direction; the distance only decides where the orthographic shadow
  // box sits along that ray. At the authored length the two high districts at z -112 (orbit
  // and milestone) sat behind the shadow camera near plane and received no shadow at all, so
  // the light is pushed out along the same direction. Shadow angles are unchanged.
  sun.position.set(...STUDY_SUN.lightPosition).setLength(180);
  sun.castShadow = true; sun.shadow.intensity = tv ? STUDY_TV_TONE.shadowIntensity : STUDY_TONE.shadowIntensity; sun.shadow.mapSize.set(2048, 2048);
  // Bounds measured in light space over all 13 district footprints and the arrival platform, and
  // left asymmetric so the box stays tight: 227 by 125 units is a finer texel on a 2048 map than
  // the old symmetric 240 by 240 box, and the worst remaining district margin is about 10 units.
  sun.shadow.camera.left = -126; sun.shadow.camera.right = 101;
  sun.shadow.camera.bottom = -60; sun.shadow.camera.top = 65;
  sun.shadow.camera.near = 20; sun.shadow.camera.far = 290;
  sun.shadow.normalBias = .06; sun.shadow.bias = -.0002; scene.add(sun);
  scene.userData.studySun = sun;
  const fill = new T.DirectionalLight("#ffd0c8", tv ? STUDY_TV_TONE.fill : .75); fill.position.set(70, 38, 95); scene.add(fill);
  // A quiet lavender bounce from the cool side of the sky, in place of the old pink rim light.
  const cool = new T.DirectionalLight("#c9c3ff", .35); cool.position.set(80, 30, -40); scene.add(cool);
  // Section 8: the sky carries the study mood envelope, so the whole backdrop dips a little
  // through a travel and lifts again on arrival, together with the tone mapping exposure the
  // engine sets from the same value. Parked, the uniform is exactly 1 and this is unchanged.
  //
  // The TV page's clear air softens three terms of the sky (`STUDY_TV_SKY`): the wide warm glow
  // round the sun, the painted cloud band and the tight sun core. `studySkyFragment` writes them
  // into the source, so without the TV page the program is character for character the study's.
  const sky = material(new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { time, studyExposure: STUDY_EXPOSURE, top: { value: new T.Color(STUDY_SKY.zenith) }, mid: { value: new T.Color(STUDY_SKY.mid) }, horizon: { value: new T.Color(STUDY_SKY.horizon) }, sun: { value: new T.Vector3(...STUDY_SUN.direction) } },
    vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: studySkyFragment(tv) }));
  mesh(scene, geometry(new T.SphereGeometry(STUDY_SKY_RADIUS, 32, 16)), sky).renderOrder = -100;
  // The TV page's sun is a smaller, fainter pair of sprites (`STUDY_TV_SUN_HALO`).
  const halo = studySunHalo(tv);
  // Section 6: the two visible sun sprites stay off the glow layer. They are already large and
  // additive, so blooming them doubled the sun and washed out the top of the frame; only the
  // wide band below feeds the bloom. A third sprite lives on the rays layer alone, where it is
  // the one bright thing in the black occluder mask. `allowOverride` false exempts it from that
  // pass's override material (three 0.180 WebGLRenderer.js L1987).
  halo.sprites.forEach(sprite => scene.add(sprite));
  halo.materials.forEach(material); texture(halo.map);
  // Section 8: the authored sizes, so the travel swell below is applied to them rather than
  // compounded frame on frame. Parked, the sprites are exactly the size they are today.
  const haloScale = halo.sprites.map(sprite => sprite.scale.x);
  const sunAt = new T.Vector3(...STUDY_SUN.direction).multiplyScalar(330);
  const skyBand = new T.Sprite(material(new T.SpriteMaterial({
    // Corrected down from the design's .14 after the checkpoint captures.
    map: halo.map, color: "#ffd9b8", transparent: true, opacity: .05,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  skyBand.name = "Study sky glow band"; skyBand.position.copy(sunAt);
  skyBand.scale.set(420, 140, 1); skyBand.renderOrder = -60;
  // Not on the TV page: its 420 unit bloom across the horizon is exactly the veil the clear air
  // takes away. Its material stays registered, so disposal is the same either way.
  skyBand.layers.set(1); if (!tv) scene.add(skyBand);
  const raysSun = new T.Sprite(material(new T.SpriteMaterial({
    map: halo.map, color: "#ffe9cc", transparent: true, opacity: 1,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  raysSun.material.allowOverride = false;
  raysSun.name = "Study rays sun"; raysSun.position.copy(sunAt);
  raysSun.scale.set(64, 64, 1); raysSun.layers.set(2); scene.add(raysSun);
  return { sun, halo, haloScale };
}
