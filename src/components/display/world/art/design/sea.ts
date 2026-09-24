import * as T from "three";
import { studyGlow } from "../study-materials";
import { STUDY_SEA, STUDY_SUN, STUDY_TV_SEA_SCALE } from "../study-palette";
import type { DesignWorldBase } from "./base";

/** The sea and its water material. */
export function designSea({ material, time, ivory, edge, gold, stone, lawn, leaf, rose, roseGold, bloom, mesh, scene, geometry, tv }: DesignWorldBase) {
  // Turquoise, glossier, with a second high frequency ripple and a tight sun glitter path.
  // Verified against three 0.180 meshphysical: at `#include <lights_fragment_end>` the shader
  // carries `reflectedLight`, the perturbed view space `normal` and `vViewPosition`, and the
  // fragment prefix declares `viewMatrix`, so the world space sun folds into view space here.
  // Section 7, water glory: a higher environment intensity and metalness turn the sea into a
  // mirror of the golden hour sky rather than a tinted sheet, and the lower roughness with the
  // stronger clearcoat keeps the reflection sharp enough to read as water. Plan 26 visual
  // review deepened the body colour one step (D2 #6ec9cf) toward the board's turquoise.
  const water = material(new T.MeshPhysicalMaterial({ color: "#57bfd0", roughness: .12, metalness: .22, clearcoat: .85, clearcoatRoughness: .12, envMapIntensity: 1.35, dithering: true }));
  water.onBeforeCompile = shader => {
    shader.uniforms.studyTime = time;
    shader.uniforms.studySunWorld = { value: new T.Vector3(...STUDY_SUN.direction) };
    shader.vertexShader = "varying vec3 waterPosition;\n" + shader.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nwaterPosition=(modelMatrix*vec4(position,1.)).xyz;");
    shader.fragmentShader = "varying vec3 waterPosition;uniform float studyTime;uniform vec3 studySunWorld;\n" + shader.fragmentShader
      .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>
      vec2 q=waterPosition.xz;float dx=.034*cos(q.x*.33+q.y*.18+studyTime*.32)+.017*cos(q.x*.9-q.y*.4-studyTime*.23)+.010*sin(q.x*6.7+studyTime*1.3)*cos(q.y*5.3-studyTime*.9);
      float dz=.028*cos(q.y*.44-q.x*.13-studyTime*.28)+.009*sin(q.x*.55+q.y*.7+studyTime*.18)+.008*cos(q.x*9.1-studyTime*1.1);
      normal=normalize(mat3(viewMatrix)*vec3(-dx,1.,-dz));`)
      .replace("#include <opaque_fragment>", `vec3 studyV = normalize(vViewPosition);
      vec3 studyR = reflect(-studyV, normal);
      vec3 studyS = normalize((viewMatrix * vec4(studySunWorld, 0.)).xyz);
      // The sun path adds straight to outgoingLight. Added to reflectedLight.directSpecular
      // instead, the clearcoat block below <lights_fragment_end> scales it by (1 - clearcoat * Fcc),
      // which at the grazing angles a sea is seen from erases most of the glitter.
      outgoingLight += vec3(1.,.9,.72) * pow(max(0., dot(studyR, studyS)), 320.) * 2.2;
#include <opaque_fragment>`);
  };
  water.customProgramCacheKey = () => "study-outdoor-water-v2";
  // The sun path is the only part of the sea that reaches the glow layer, so the bloom gives
  // the glitter its soft tails without lifting the whole surface into a bright wash.
  //
  // Corrected down from the design's .6 after the checkpoint captures isolated the glow
  // composite per view. The sea fills the lower frame and the low sun draws its path straight
  // at the viewer, so this one term was the largest single new contributor at the Sanctuary,
  // more than the whole of the heart glory. At .3 the path still reads and the ceiling holds.
  studyGlow(water, "glitter",
    "vec3(1.,.93,.78) * pow(max(0., dot(reflect(-normalize(vViewPosition), normal), studySunView)), 320.) * .3");
  // Named so every merged mesh below carries a readable name a later pass can find.
  ivory.name = "ivory"; edge.name = "edge"; gold.name = "gold"; stone.name = "stone"; lawn.name = "lawn";
  leaf.name = "leaf"; rose.name = "rose"; roseGold.name = "rose gold"; bloom.name = "bloom"; water.name = "water";
  const sea = mesh(scene, geometry(new T.CircleGeometry(STUDY_SEA.radius, 96)), water, STUDY_SEA.center); sea.rotation.x = -Math.PI / 2;
  sea.name = "Study sea"; sea.layers.enable(1);
  // The TV page's thinner fog would show the disc's rim, so there it reaches 800: wherever the
  // rim is in view it is deeper than the fog's far end, so the sea is fully fogged before it
  // ends (the rule on `STUDY_TV_CAMERA_FAR`). The ripples read world space, so they keep their size.
  if (tv) sea.scale.setScalar(STUDY_TV_SEA_SCALE);
  // TV page: the engine gives the sea its own environment once it has built one
  // (`applyTvWaterEnvironment`), so its reflection no longer follows the scene's lower fill.
  if (tv) scene.userData.studyTvWater = water;
  return { water };
}
