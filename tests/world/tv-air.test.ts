import * as T from "three";
import { describe, expect, it } from "vitest";
import { ARRIVAL_VIEW, TOUR_ORDER, ZONES, type ZoneId } from "@/components/display/world/world-data";
import { CameraDirector } from "@/components/display/world/camera-director";
import { FINESSE_OFFSET_LIMIT, studyTravelEase } from "@/components/display/world/prototype/camera-finesse";
import { STUDY_MOOD, studyHaze } from "@/components/display/world/prototype/study-mood";
import {
  STUDY_FOG, STUDY_SEA, STUDY_SKY, STUDY_SKY_RADIUS, STUDY_TONE, STUDY_TV_CAMERA_FAR, STUDY_TV_FOG, STUDY_TV_SEA_SCALE, STUDY_TV_TONE,
} from "@/components/display/world/prototype/study-palette";
import { studyLandmarkLayout } from "@/components/display/world/prototype/study-landmarks";
import { TV_ARC, TV_READ, tvFlowRadius, tvPlaceWorld, tvReadingFrame } from "@/components/display/world/prototype/tv-places";
import { TV_FOV } from "@/components/display/world/prototype/tv-bubbles";
import {
  STUDY_DETAIL_DISTANCE, STUDY_TV_VIEW_DISTANCE, applyStudyDetail, studyDetailDistance, tvViewDistance,
} from "@/components/display/world/prototype/study-budget";
import { STUDY_TV_RADIANCE, studyCompositeFragment } from "@/components/display/world/prototype/study-radiance";
import { STUDY_TV_CLOUDS, createStudyClouds, studyCloudLayout } from "@/components/display/world/prototype/study-clouds";
import { STUDY_TV_SUN_HALO, studySunHalo } from "@/components/display/world/prototype/study-lighting";
import { STUDY_TV_SPECKS, StudyWaterHalo, WATER_HALO_OPACITY } from "@/components/display/world/prototype/study-glory";
import { STUDY_TV_RIM_SCALE, scaleStudyRim, softDot, studyRim } from "@/components/display/world/prototype/study-materials";
import { createStudyAir } from "@/components/display/world/prototype/study-air";
import { SOFT_CLOUD, TV_SOFT_CLOUD_OPACITY } from "@/components/display/world/prototype/kit-corridors";

/*
 * The TV page's clear air (Anthony, 2026-09-24: "Can you remove the haze foggy look"; his
 * choice: crisp, rich colours up close, only the farthest islands fading a little). Everything
 * here is TV page only, so the other half of every test is that the study's own values, which
 * the rest of the suite pins, come back exactly when the TV page is not asking.
 */

/** Three's linear fog: a smoothstep from near to far on the view depth (`fog_fragment.glsl.js`). */
function fogAmount(depth: number, fog: { near: number; far: number }) {
  const t = Math.min(1, Math.max(0, (depth - fog.near) / (fog.far - fog.near)));
  return t * t * (3 - 2 * t);
}
const zone = (id: ZoneId) => ZONES.find(item => item.id === id)!;

/**
 * Every camera position the TV page's tour takes: a whole tour loop on the TV page's narrow arc
 * (every parked swing and every travel between two places), an arrival flight from every place
 * and the return to it, the arrival view, and every place's reading framing over a full breath,
 * on a landscape and a portrait screen. The glide in to read blends a tour pose toward a reading
 * pose, so its positions lie on segments between these, which the distances below are convex or
 * concave along; the finesse's own offset is added as a margin by the callers.
 */
function tvCameraPositions() {
  const positions: T.Vector3[] = [];
  const director = new CameraDirector();
  director.arc = { ...TV_ARC };
  director.ease = studyTravelEase;
  for (let t = 0; t < TOUR_ORDER.length * (18 + 40) + 60; t += 0.25) {
    director.update(0.25);
    positions.push(director.position.clone());
  }
  for (const id of TOUR_ORDER) {
    const flight = new CameraDirector();
    flight.arc = { ...TV_ARC };
    flight.ease = studyTravelEase;
    flight.visit(id, true);
    flight.update(7);
    flight.beginArrival(false);
    for (let t = 0; t < 5.2; t += 0.1) { flight.update(0.1); positions.push(flight.position.clone()); }
    flight.endArrival(false);
    for (let t = 0; t < 6.2; t += 0.1) { flight.update(0.1); positions.push(flight.position.clone()); }
  }
  positions.push(new T.Vector3(...ARRIVAL_VIEW.eye));
  for (const id of TOUR_ORDER) {
    positions.push(new T.Vector3(...zone(id).eye), tvPlaceWorld(id).eye.clone(), tvPlaceWorld(id).pose.eye.clone());
    for (const [aspect, fov] of [[16 / 9, TV_FOV], [9 / 16, 63]] as const)
      for (let time = 0; time < 30; time += 1.5) positions.push(tvReadingFrame(id, time, aspect, fov).eye.clone());
  }
  return positions;
}
const cameras = tvCameraPositions();

/** The distance from a point to the nearest point of the TV page's sea rim, a circle at sea level. */
function seaRimDistance(p: T.Vector3) {
  const rim = STUDY_SEA.radius * STUDY_TV_SEA_SCALE;
  const across = Math.hypot(p.x - STUDY_SEA.center[0], p.z - STUDY_SEA.center[2]);
  return Math.hypot(rim - across, p.y - STUDY_SEA.center[1]);
}

describe("the TV page's fog", () => {
  it("is thinner than the study's, in the same colour as the horizon", () => {
    expect(STUDY_TV_FOG).toEqual({ color: STUDY_FOG.color, near: 60, far: 480 });
    expect(STUDY_TV_FOG.color).toBe(STUDY_SKY.horizon);
    // The study keeps its own haze.
    expect(STUDY_FOG).toEqual({ color: "#f8ded6", near: 22, far: 250 });
  });
  it("leaves studyHaze exactly as it was when nothing more is asked", () => {
    expect(studyHaze(0)).toEqual({ near: 22, far: 250 });
    expect(studyHaze(1)).toEqual({ near: STUDY_MOOD.travelFogNear, far: STUDY_MOOD.travelFogFar });
    expect(studyHaze(0.5)).toEqual({ near: 20, far: 232.5 });
    expect(studyHaze(-4)).toEqual({ near: 22, far: 250 });
  });
  it("does not close in during a flight on the TV page", () => {
    for (const travel of [0, 0.25, 0.5, 1, 3]) {
      const out = { near: 0, far: 0 };
      expect(studyHaze(travel, out, STUDY_TV_FOG, STUDY_TV_FOG)).toBe(out);
      expect(out).toEqual({ near: STUDY_TV_FOG.near, far: STUDY_TV_FOG.far });
    }
  });
  it("puts no haze at all on the bubbles being read", () => {
    for (const place of TOUR_ORDER) {
      const world = tvPlaceWorld(place);
      const flowRadius = tvFlowRadius(place, TV_READ.flow.max);
      for (const [aspect, fov] of [[16 / 9, TV_FOV], [9 / 16, 63]] as const) {
        for (let time = 0; time < 30; time += 1.5) {
          const eye = tvReadingFrame(place, time, aspect, fov).eye;
          const main = eye.distanceTo(world.main.centre) + world.main.radius + FINESSE_OFFSET_LIMIT;
          const flow = eye.distanceTo(world.flow.rest) + flowRadius + FINESSE_OFFSET_LIMIT;
          expect(fogAmount(main, STUDY_TV_FOG), `${place} main`).toBe(0);
          expect(fogAmount(flow, STUDY_TV_FOG), `${place} flowing`).toBe(0);
        }
      }
    }
  });
  it("puts no haze on the island the tour stands at, seen from its tour eye", () => {
    ZONES.forEach((item, index) => {
      const radius = index < 3 ? 17.8 : 13.8;
      const far = new T.Vector3(...item.eye).distanceTo(new T.Vector3(...item.center)) + radius;
      expect(far, item.id).toBeLessThan(STUDY_TV_FOG.near);
      const main = new T.Vector3(...item.eye).distanceTo(tvPlaceWorld(item.id).main.centre) + tvPlaceWorld(item.id).main.radius;
      expect(fogAmount(main, STUDY_TV_FOG), item.id).toBe(0);
    });
  });
  it("fades the six far landmark islands a little, never away", () => {
    const eyes = ZONES.map(item => new T.Vector3(...item.eye));
    let erasedBefore = 0;
    for (const site of studyLandmarkLayout()) {
      const centre = new T.Vector3(...site.center);
      // The distance bounds the view depth three fogs by, so this is the most any tour eye sees.
      const amounts = eyes.map(eye => fogAmount(eye.distanceTo(centre), STUDY_TV_FOG));
      const mean = amounts.reduce((sum, value) => sum + value, 0) / amounts.length;
      expect(Math.max(...amounts), site.center.join()).toBeLessThanOrEqual(0.7);
      expect(mean, site.center.join()).toBeGreaterThanOrEqual(0.1);
      expect(mean, site.center.join()).toBeLessThanOrEqual(0.7);
      erasedBefore += eyes.filter(eye => fogAmount(eye.distanceTo(centre), STUDY_FOG) >= 1).length;
    }
    // Under the study's haze the farther places lost them entirely, which is the look he asked to lose.
    expect(erasedBefore).toBeGreaterThan(0);
  });
});

describe("the TV page's horizon has no seam", () => {
  it("samples a real tour", () => {
    expect(cameras.length).toBeGreaterThan(3000);
  });
  it("completes the fog before the far plane, and the far plane before the sea rim", () => {
    const nearestRim = Math.min(...cameras.map(seaRimDistance)) - FINESSE_OFFSET_LIMIT;
    expect(STUDY_TV_FOG.far).toBeLessThan(STUDY_TV_CAMERA_FAR);
    expect(STUDY_TV_CAMERA_FAR).toBeLessThan(nearestRim);
    expect(STUDY_TV_CAMERA_FAR).toBe(600);
    expect(STUDY_SEA.radius * STUDY_TV_SEA_SCALE).toBe(800);
  });
  it("keeps the whole sky dome inside the far plane from every camera", () => {
    const farthest = Math.max(...cameras.map(p => p.length())) + FINESSE_OFFSET_LIMIT;
    expect(farthest).toBeLessThan(130);
    expect(STUDY_SKY_RADIUS + farthest).toBeLessThan(STUDY_TV_CAMERA_FAR);
  });
  it("was a seam in the study's own sea, which is why the TV page's grows", () => {
    // The study's 320 disc ends inside 480 units of the farther tour eyes.
    const study = Math.min(...ZONES.map(item => {
      const p = new T.Vector3(...item.eye);
      return Math.hypot(STUDY_SEA.radius - Math.hypot(p.x - STUDY_SEA.center[0], p.z - STUDY_SEA.center[2]), p.y - STUDY_SEA.center[1]);
    }));
    expect(study).toBeLessThan(STUDY_TV_FOG.far);
  });
});

describe("the TV page's view distances", () => {
  it("brings High and Auto detail out to where the fog is about 12%", () => {
    expect(fogAmount(STUDY_TV_VIEW_DISTANCE, STUDY_TV_FOG)).toBeGreaterThan(0.1);
    expect(fogAmount(STUDY_TV_VIEW_DISTANCE, STUDY_TV_FOG)).toBeLessThan(0.13);
    expect(studyDetailDistance("auto", true)).toBe(150);
    expect(studyDetailDistance("high", true)).toBe(150);
    expect(studyDetailDistance("low", true)).toBe(STUDY_DETAIL_DISTANCE.low);
  });
  it("keeps every page but the TV page, and the Low tier, exactly as they were", () => {
    for (const tier of ["high", "auto", "low"] as const) expect(studyDetailDistance(tier)).toBe(STUDY_DETAIL_DISTANCE[tier]);
    expect(STUDY_DETAIL_DISTANCE).toEqual({ high: 140, auto: 110, low: 70 });
    for (const distance of [70, 80, 96, 110, 140, 170]) {
      expect(tvViewDistance(distance, false)).toBe(distance);
      expect(tvViewDistance(distance, true, true)).toBe(distance);
    }
  });
  it("only ever raises a distance, never lowers one", () => {
    expect(tvViewDistance(96, true)).toBe(150);
    expect(tvViewDistance(80, true)).toBe(150);
    expect(tvViewDistance(150, true)).toBe(150);
    expect(tvViewDistance(170, true)).toBe(170);
  });
  it("shows an Auto detail at 140 units on the TV page and hides it elsewhere", () => {
    const entry = { object: { visible: false }, centre: { x: 140, y: 0, z: 0 } };
    expect(applyStudyDetail([entry], { x: 0, y: 0, z: 0 }, "auto", true)).toBe(1);
    expect(applyStudyDetail([entry], { x: 0, y: 0, z: 0 }, "auto")).toBe(0);
    expect(applyStudyDetail([entry], { x: 0, y: 0, z: 0 }, "low", true)).toBe(0);
  });
});

describe("the TV page's glow", () => {
  it("keeps the study's composite program character for character", () => {
    const study = studyCompositeFragment();
    expect(study).toBe(studyCompositeFragment(false));
    expect(study).toContain("gl_FragColor = vec4(clamp((glow + rays) * (1. - protect), 0., 1.), 1.);");
    expect(study).not.toContain("peak");
  });
  it("adds the soft knee before the encoding on the TV page", () => {
    const tv = studyCompositeFragment(true);
    expect(tv).not.toBe(studyCompositeFragment());
    expect(tv).toContain("float peak = max(lit.r, max(lit.g, lit.b));");
    expect(tv).toContain("lit *= smoothstep(0.006, 0.03, peak);");
    expect(tv.indexOf("smoothstep(0.006")).toBeLessThan(tv.indexOf("#include <colorspace_fragment>"));
    expect(tv).not.toContain("clamp((glow + rays)");
  });
  it("is tighter, weaker and quieter", () => {
    expect(STUDY_TV_RADIANCE).toEqual({
      bloomStrength: 0.6, bloomRadius: 0.2, bloomThreshold: 0.05, glowStrength: 0.1, rayStrength: 0.05, knee: [0.006, 0.03],
    });
  });
});

describe("the TV page's sky, sun and light", () => {
  it("shrinks and fades the sun's two sprites", () => {
    const study = studySunHalo(), tv = studySunHalo(true);
    expect(study.sprites.map(sprite => sprite.scale.x)).toEqual([150, 60]);
    expect(study.materials.map(material => material.opacity)).toEqual([0.5, 0.45]);
    expect(tv.sprites.map(sprite => sprite.scale.x)).toEqual(STUDY_TV_SUN_HALO.map(([size]) => size));
    expect(tv.materials.map(material => material.opacity)).toEqual(STUDY_TV_SUN_HALO.map(([, opacity]) => opacity));
    expect(tv.materials.map(material => material.color.getHexString())).toEqual(study.materials.map(material => material.color.getHexString()));
    for (const halo of [study, tv]) { halo.materials.forEach(material => material.dispose()); halo.map.dispose(); }
  });
  it("balances the light toward the sun without touching the exposure", () => {
    expect(STUDY_TV_TONE).toEqual({ environmentIntensity: 0.7, hemisphere: 0.35, sun: 2.5, shadowIntensity: 0.75, fill: 0.85 });
    expect(STUDY_TONE).toEqual({ exposure: 1, environmentIntensity: 0.9, shadowIntensity: 0.6 });
  });
});

describe("the TV page's clouds and specks", () => {
  const layout = studyCloudLayout(777);
  const alphas = (mesh: T.InstancedMesh) => Array.from(mesh.geometry.getAttribute("puffAlpha").array as Float32Array);
  const f32 = (values: number[]) => Array.from(new Float32Array(values));
  it("lightens the sky ring and the collars on the TV page only, over the same layout", () => {
    const atlas = new T.Texture(), time = { value: 0 };
    const study = createStudyClouds(layout, atlas, time), tv = createStudyClouds(layout, atlas, time, true);
    expect(alphas(study.meshes[0])).toEqual(f32(layout.sky.map(puff => puff.alpha)));
    expect(alphas(study.meshes[1])).toEqual(f32(layout.island.map(puff => puff.alpha)));
    expect(alphas(tv.meshes[0])).toEqual(f32(layout.sky.map(puff => puff.alpha * STUDY_TV_CLOUDS.skyAlpha)));
    expect(alphas(tv.meshes[1])).toEqual(f32(layout.island.map(puff => puff.alpha * STUDY_TV_CLOUDS.islandAlpha)));
    expect(study.materials.map(material => material.uniforms.fogRelief.value)).toEqual([0.6, 0]);
    expect(tv.materials.map(material => material.uniforms.fogRelief.value)).toEqual([0.9, 0]);
    // The collars stay well visible, so the islands still read as floating.
    expect(Math.min(...alphas(tv.meshes[1]))).toBeGreaterThan(0.5);
    for (let i = 0; i < 2; i++) expect(tv.meshes[i].count).toBe(study.meshes[i].count);
    for (const clouds of [study, tv]) { clouds.materials.forEach(m => m.dispose()); clouds.geometries.forEach(g => g.dispose()); }
  });
  it("draws the sky lane clouds lighter on the TV page, never through the table", () => {
    expect(SOFT_CLOUD.opacity).toBe(0.5);
    expect(TV_SOFT_CLOUD_OPACITY).toBe(0.25);
  });
  it("fades the water halo to its own lighter peak on the TV page", () => {
    const camera = new T.PerspectiveCamera();
    camera.position.set(0, 10, 30);
    const study = new StudyWaterHalo(new T.Scene()), tv = new StudyWaterHalo(new T.Scene(), STUDY_TV_SPECKS.waterHalo);
    study.update(new T.Vector3(), camera, 0);
    tv.update(new T.Vector3(), camera, 0);
    expect(study.opacity()).toBeCloseTo(WATER_HALO_OPACITY, 6);
    expect(tv.opacity()).toBeCloseTo(0.08, 6);
    study.dispose(); tv.dispose();
  });
  it("quiets the motes and keeps the stars off the glow layer on the TV page", () => {
    const build = (tv?: boolean) => {
      const scene = new T.Scene();
      const air = createStudyAir(scene, { geometry: g => g, material: m => m, farPetal: new T.PlaneGeometry(1, 1), dot: softDot(8), time: { value: 0 }, tv },
        ZONES.map(item => item.center));
      const motes = scene.getObjectByName("Study motes") as T.Points, stars = scene.getObjectByName("Study sky stars") as T.Points;
      return { air, motes, stars };
    };
    const study = build(), tv = build(true);
    expect((study.motes.material as T.PointsMaterial).opacity).toBe(0.28);
    expect((tv.motes.material as T.PointsMaterial).opacity).toBe(STUDY_TV_SPECKS.motes);
    expect(study.stars.layers.isEnabled(1)).toBe(true);
    expect(tv.stars.layers.isEnabled(1)).toBe(false);
    expect(tv.stars.layers.isEnabled(0)).toBe(true);
    // The motes stay glow layer members on both, only fainter.
    expect(tv.motes.layers.isEnabled(1)).toBe(true);
    study.air.dispose(); tv.air.dispose();
    expect(STUDY_TV_SPECKS).toEqual({ lanterns: 0.4, sparkles: 0.55, motes: 0.12, waterHalo: 0.08 });
  });
});

describe("the TV page's softer rims", () => {
  const compile = (material: T.Material) => {
    const shader = { uniforms: {} as Record<string, { value: unknown }>, vertexShader: "", fragmentShader: "#include <opaque_fragment>" };
    material.onBeforeCompile(shader as unknown as T.WebGLProgramParametersWithUniforms, {} as T.WebGLRenderer);
    return shader.uniforms.studyRimColor.value as T.Color;
  };
  it("scales the very colour the rim's shader reads, before or after it compiles", () => {
    const before = studyRim(new T.MeshStandardMaterial(), "#ffe6c9", 3, .22);
    expect(scaleStudyRim(before, STUDY_TV_RIM_SCALE)).toBe(1);
    expect(compile(before).getHex()).toBe(new T.Color("#ffe6c9").multiplyScalar(0.6).getHex());
    const after = studyRim(new T.MeshStandardMaterial(), "#fff0e0", 2.2, .3);
    const uniform = compile(after);
    scaleStudyRim(after, STUDY_TV_RIM_SCALE);
    expect(uniform.getHex()).toBe(new T.Color("#fff0e0").multiplyScalar(0.6).getHex());
  });
  it("leaves a rim alone unless it is asked, and a material without a rim untouched", () => {
    const rim = studyRim(new T.MeshStandardMaterial(), "#ffb6c8", 2.5, .3);
    expect(compile(rim).getHex()).toBe(new T.Color("#ffb6c8").getHex());
    expect(scaleStudyRim(new T.MeshStandardMaterial(), STUDY_TV_RIM_SCALE)).toBe(0);
    expect(STUDY_TV_RIM_SCALE).toBe(0.6);
  });
  it("keeps the program key, so the study and the TV page share one compiled rim", () => {
    const study = studyRim(new T.MeshStandardMaterial(), "#ffe6c9", 3, .22);
    const tv = studyRim(new T.MeshStandardMaterial(), "#ffe6c9", 3, .22);
    scaleStudyRim(tv, STUDY_TV_RIM_SCALE);
    expect(tv.customProgramCacheKey()).toBe(study.customProgramCacheKey());
  });
});
