import { createHash } from "node:crypto";
import * as T from "three";
import { describe, expect, it } from "vitest";
import { ARRIVAL_VIEW, TOUR_ORDER, ZONES, type ZoneId } from "@/components/display/world/world-data";
import { CameraDirector } from "@/components/display/world/camera-director";
import {
  FINESSE_OFFSET_LIMIT, StudyCameraFinesse, studyTravelEase, type FinesseInput,
} from "@/components/display/world/art/camera-finesse";
import { STUDY_MOOD, studyHaze, studyHazeColor } from "@/components/display/world/art/study-mood";
import {
  STUDY_FOG, STUDY_SEA, STUDY_SKY, STUDY_SKY_RADIUS, STUDY_TONE, STUDY_TV_CAMERA_FAR, STUDY_TV_FOG, STUDY_TV_SEA_SCALE, STUDY_TV_TONE,
} from "@/components/display/world/art/study-palette";
import { studyLandmarkLayout } from "@/components/display/world/art/study-landmarks";
import { TV_ARC, TV_READ, tvFlowRadius, tvPlaceWorld, tvReadingFrame } from "@/components/display/world/art/tv-places";
import { TV_FOV } from "@/components/display/world/art/tv-bubbles";
import {
  STUDY_DETAIL_DISTANCE, STUDY_TV_VIEW_DISTANCE, applyStudyDetail, studyDetailDistance, tvViewDistance,
} from "@/components/display/world/art/study-budget";
import { StudyRadiance, studyCompositeFragment } from "@/components/display/world/art/study-radiance";
import { STUDY_TV_CLOUDS, createStudyClouds, studyCloudLayout } from "@/components/display/world/art/study-clouds";
import { STUDY_TV_SUN_HALO, studySkyFragment, studySunHalo } from "@/components/display/world/art/study-lighting";
import { STUDY_TV_SPECKS, StudyWaterHalo, WATER_HALO_OPACITY } from "@/components/display/world/art/study-glory";
import { STUDY_TV_RIM_SCALE, scaleStudyRim, softDot, studyRim } from "@/components/display/world/art/study-materials";
import { createStudyAir } from "@/components/display/world/art/study-air";
import { LOD_NEAR, SOFT_CLOUD, corridorSoftCloud } from "@/components/display/world/art/kit-corridors";
import { KIT_NEAR_DISTANCE, kitPeopleDistance } from "@/components/display/world/art/kit-districts";
import { NEIGHBOR_VIEW_DISTANCE, neighborViewDistance } from "@/components/display/world/kit/kit-neighbors";
import { PEARL_HALO_TV_FADE, StudyPearlAssets, StudyPearlSkin, pearlHaloFragment } from "@/components/display/world/art/pearl-skin";
import { TV_WATER, applyTvPalette, applyTvWaterEnvironment } from "@/components/display/world/art/tv-foreground";
import type { DesignKitContext } from "@/components/display/world/art/design-world";

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
/** GLSL's smoothstep, for the edges written into the TV page's shaders. */
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const zone = (id: ZoneId) => ZONES.find(item => item.id === id)!;

/**
 * The study's shader sources as they were before the TV page's clear air (commit f24afb1), by
 * their SHA-256: the sky dome's fragment as `design-world.ts` wrote it inline, and the pearl
 * halo's as `pearl-skin.ts` did. Without the TV page both must come back character for
 * character, so the study compiles exactly the programs it did.
 */
const STUDY_SKY_FRAGMENT_SHA256 = "89725d0a5e2c00fcecbb62cbd6d77cd594ac53ce62f1079763b1d7fa6a4644d0";
const STUDY_HALO_FRAGMENT_SHA256 = "6cc2b51a965c352517bf7e3c63a0217be2809209fd4259b1c624280a041bec35";

/** A camera pose: where the eye is and which way it faces (three's camera looks down its -z). */
type Pose = { eye: T.Vector3; quaternion: T.Quaternion };
const aim = new T.Matrix4(), UP = new T.Vector3(0, 1, 0);
/** The pose `camera.lookAt(target)` gives a camera at `eye`, as the engine builds its glide pose. */
function looking(eye: T.Vector3, target: T.Vector3): Pose {
  aim.lookAt(eye, target, UP);
  return { eye: eye.clone(), quaternion: new T.Quaternion().setFromRotationMatrix(aim) };
}
/** The two screens the TV page is framed for: a landscape TV and a portrait phone (`resize`). */
const SCREENS = [[16 / 9, TV_FOV], [9 / 16, 63]] as const;

/**
 * Every camera pose the TV page's tour takes: a whole tour loop on the TV page's narrow arc
 * (every parked swing and every travel between two places), both as the director authors it
 * and as the study's finesse presents it (its dolly, its trailing aim and its lean); an arrival
 * flight from every place and the return to it; the arrival view; every place's tour eye and
 * reading framing over a full breath on both screens; and the glide in to read between the
 * two, which the engine blends by position and rotation. Poses without the finesse get its
 * largest offset as a margin in the callers.
 */
function tvCameraPoses() {
  const poses: Pose[] = [];
  const director = new CameraDirector();
  director.arc = { ...TV_ARC };
  director.ease = studyTravelEase;
  const finesse = new StudyCameraFinesse(), presented = new T.PerspectiveCamera();
  const input: FinesseInput = {
    dt: 0.25, moving: true, traveling: false, arrivalPhase: "idle", reading: false,
    position: director.position, target: director.target, elapsed: 0,
  };
  for (let t = 0; t < TOUR_ORDER.length * (18 + 40) + 60; t += 0.25) {
    director.update(0.25);
    poses.push(looking(director.position, director.target));
    input.traveling = director.traveling;
    input.elapsed = t;
    finesse.apply(presented, input);
    poses.push({ eye: presented.position.clone(), quaternion: presented.quaternion.clone() });
  }
  for (const id of TOUR_ORDER) {
    const flight = new CameraDirector();
    flight.arc = { ...TV_ARC };
    flight.ease = studyTravelEase;
    flight.visit(id, true);
    flight.update(7);
    flight.beginArrival(false);
    for (let t = 0; t < 5.2; t += 0.1) { flight.update(0.1); poses.push(looking(flight.position, flight.target)); }
    flight.endArrival(false);
    for (let t = 0; t < 6.2; t += 0.1) { flight.update(0.1); poses.push(looking(flight.position, flight.target)); }
  }
  poses.push(looking(new T.Vector3(...ARRIVAL_VIEW.eye), new T.Vector3(...ARRIVAL_VIEW.target)));
  for (const id of TOUR_ORDER) {
    const tour = looking(new T.Vector3(...zone(id).eye), new T.Vector3(...zone(id).target));
    const place = tvPlaceWorld(id);
    poses.push(tour, looking(place.eye, place.main.centre), looking(place.pose.eye, place.pose.target));
    for (const [aspect, fov] of SCREENS)
      for (let time = 0; time < 30; time += 1.5) {
        const frame = tvReadingFrame(id, time, aspect, fov);
        const read = looking(frame.eye, frame.target);
        poses.push(read);
        for (const weight of [0.25, 0.5, 0.75])
          poses.push({ eye: tour.eye.clone().lerp(read.eye, weight), quaternion: tour.quaternion.clone().slerp(read.quaternion, weight) });
      }
  }
  return poses;
}
const poses = tvCameraPoses();
const cameras = poses.map(pose => pose.eye);

/**
 * The sea disc's rim as three draws it: the `CircleGeometry(radius, 96)` polygon at sea level,
 * sampled densely along each of its 96 edges, at the TV page's scale unless another is given.
 */
function seaRim(scale = STUDY_TV_SEA_SCALE) {
  const points: T.Vector3[] = [], radius = STUDY_SEA.radius * scale, [cx, cy, cz] = STUDY_SEA.center;
  for (let segment = 0; segment < 96; segment++) {
    const a = (segment / 96) * Math.PI * 2, b = ((segment + 1) / 96) * Math.PI * 2;
    for (let step = 0; step < 16; step++) {
      const t = step / 16;
      const x = Math.cos(a) * (1 - t) + Math.cos(b) * t, y = Math.sin(a) * (1 - t) + Math.sin(b) * t;
      // The disc is laid flat by a -90 degree turn about x: its local y becomes world -z.
      points.push(new T.Vector3(cx + x * radius, cy, cz - y * radius));
    }
  }
  return points;
}

/**
 * The shallowest view depth (three's fog depth, `-mvPosition.z`) of any rim point inside the
 * pose's view frustum on the given screen, or Infinity when none of the rim is in view.
 */
function shallowestRimInView(pose: Pose, aspect: number, fov: number, rim: readonly T.Vector3[]) {
  const camera = new T.PerspectiveCamera(fov, aspect, 0.1, STUDY_TV_CAMERA_FAR);
  camera.position.copy(pose.eye);
  camera.quaternion.copy(pose.quaternion);
  camera.updateMatrixWorld();
  const frustum = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const view = new T.Vector3();
  let shallowest = Infinity;
  for (const point of rim)
    if (frustum.containsPoint(point)) shallowest = Math.min(shallowest, -view.copy(point).applyMatrix4(camera.matrixWorldInverse).z);
  return shallowest;
}

describe("the TV page's fog", () => {
  it("is thinner than the study's, in the same colour as the horizon", () => {
    expect(STUDY_TV_FOG.color).toBe(STUDY_FOG.color);
    expect(STUDY_TV_FOG.color).toBe(STUDY_SKY.horizon);
    expect(STUDY_TV_FOG.near).toBeGreaterThan(STUDY_FOG.near);
    expect(STUDY_TV_FOG.far).toBeGreaterThan(STUDY_FOG.far);
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
      for (const [aspect, fov] of SCREENS) {
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

describe("the TV page's fog colour in flight", () => {
  const base = new T.Color(STUDY_TV_FOG.color);
  it("is exactly the fog colour parked", () => {
    const out = new T.Color();
    expect(studyHazeColor(base, 1, out)).toBe(out);
    expect(out.equals(base)).toBe(true);
    expect(out.getHexString()).toBe(STUDY_TV_FOG.color.slice(1));
  });
  it("dips with the sky dome's own horizon, which is its linear colour times the exposure", () => {
    // Below the horizon the sky's fragment is `min(horizon,1.)*studyExposure`, before the
    // encoding, so that is the colour the fully fogged sea has to meet.
    const horizon = new T.Color(STUDY_SKY.horizon), out = new T.Color();
    for (const exposure of [STUDY_MOOD.parked, 0.97, 0.94, 0.9, 0.8]) {
      studyHazeColor(base, exposure, out);
      const sky = horizon.clone().multiplyScalar(exposure);
      expect(out.r).toBeCloseTo(sky.r, 12);
      expect(out.g).toBeCloseTo(sky.g, 12);
      expect(out.b).toBeCloseTo(sky.b, 12);
    }
    // Written into the colour it is handed, never the base, so a frame allocates nothing.
    expect(base.getHexString()).toBe(STUDY_TV_FOG.color.slice(1));
  });
});

describe("the TV page's horizon has no seam", () => {
  const rim = seaRim();
  it("samples a real tour", () => {
    expect(poses.length).toBeGreaterThan(6000);
  });
  it("completes the fog before the far plane, so the sea is never clipped half fogged", () => {
    expect(STUDY_TV_FOG.far).toBeLessThan(STUDY_TV_CAMERA_FAR);
  });
  it("has the sea fully fogged before it ends, wherever its rim is in view, on both screens", () => {
    let seen = 0, shallowest = Infinity;
    for (const pose of poses)
      for (const [aspect, fov] of SCREENS) {
        const depth = shallowestRimInView(pose, aspect, fov, rim);
        if (depth === Infinity) continue;
        seen++;
        shallowest = Math.min(shallowest, depth);
      }
    // The rim really is in view from some poses, toward the frustum's edges, drawn inside the
    // far plane rather than clipped away: it is the fog, not the far plane, that hides it.
    expect(seen).toBeGreaterThan(0);
    expect(shallowest).toBeLessThan(STUDY_TV_CAMERA_FAR);
    // And there it is at least the fog's far end deep, even with the finesse's largest offset
    // (it measures about 590), so it is the horizon colour, the same as the sky behind it.
    expect(shallowest - FINESSE_OFFSET_LIMIT).toBeGreaterThanOrEqual(STUDY_TV_FOG.far);
    expect(fogAmount(shallowest - FINESSE_OFFSET_LIMIT, STUDY_TV_FOG)).toBe(1);
  });
  it("keeps the whole sky dome inside the far plane from every camera", () => {
    const farthest = Math.max(...cameras.map(p => p.length())) + FINESSE_OFFSET_LIMIT;
    expect(farthest).toBeLessThan(130);
    expect(STUDY_SKY_RADIUS + farthest).toBeLessThan(STUDY_TV_CAMERA_FAR);
  });
  it("was a seam in the study's own sea, which is why the TV page's grows", () => {
    // The same check on the study's 320 disc: its rim is in view well inside the fog's far end.
    const study = seaRim(1);
    const shallowest = Math.min(...ZONES.map(item => looking(new T.Vector3(...item.eye), new T.Vector3(...item.target)))
      .map(pose => shallowestRimInView(pose, 16 / 9, TV_FOV, study)));
    expect(shallowest).toBeLessThan(STUDY_TV_FOG.far);
  });
});

describe("the TV page's view distances", () => {
  it("brings High and Auto detail out to where the fog is about 12%", () => {
    expect(fogAmount(STUDY_TV_VIEW_DISTANCE, STUDY_TV_FOG)).toBeGreaterThan(0.1);
    expect(fogAmount(STUDY_TV_VIEW_DISTANCE, STUDY_TV_FOG)).toBeLessThan(0.13);
    expect(studyDetailDistance("auto", true)).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(studyDetailDistance("high", true)).toBe(STUDY_TV_VIEW_DISTANCE);
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
    expect(tvViewDistance(96, true)).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(tvViewDistance(80, true)).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(tvViewDistance(STUDY_TV_VIEW_DISTANCE, true)).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(tvViewDistance(170, true)).toBe(170);
  });
  it("shows an Auto detail at 140 units on the TV page and hides it elsewhere", () => {
    const entry = { object: { visible: false }, centre: { x: 140, y: 0, z: 0 } };
    expect(applyStudyDetail([entry], { x: 0, y: 0, z: 0 }, "auto", true)).toBe(1);
    expect(applyStudyDetail([entry], { x: 0, y: 0, z: 0 }, "auto")).toBe(0);
    expect(applyStudyDetail([entry], { x: 0, y: 0, z: 0 }, "low", true)).toBe(0);
  });
  it("keeps the animated neighbor pairs in view out to the same distance on High and Auto", () => {
    expect(neighborViewDistance(true, "high")).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(neighborViewDistance(true, "auto")).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(neighborViewDistance(true, "low")).toBe(NEIGHBOR_VIEW_DISTANCE);
    for (const tier of ["high", "auto", "low"] as const) expect(neighborViewDistance(false, tier)).toBe(NEIGHBOR_VIEW_DISTANCE);
    expect(NEIGHBOR_VIEW_DISTANCE).toBe(115);
  });
  it("raises the kit people on the TV page's High tier only, where the frames are there to spend", () => {
    expect(kitPeopleDistance(true, "high")).toBe(STUDY_TV_VIEW_DISTANCE);
    expect(kitPeopleDistance(true, "auto")).toBe(KIT_NEAR_DISTANCE);
    expect(kitPeopleDistance(true, "low")).toBe(KIT_NEAR_DISTANCE);
    for (const tier of ["high", "auto", "low"] as const) expect(kitPeopleDistance(false, tier)).toBe(KIT_NEAR_DISTANCE);
    expect(KIT_NEAR_DISTANCE).toBe(72);
    // The islet level swap stays where it was on every page.
    expect(LOD_NEAR).toBe(80);
  });
});

/**
 * A renderer that records instead of drawing: just the calls `StudyRadiance` and the installed
 * `UnrealBloomPass` make. Every render of the world itself records the fog's distances and
 * colour and the camera's layer mask at that moment; the bloom's own quads are not the scene.
 */
function recordingRenderer() {
  const renders: Array<{ near: number; far: number; mask: number; color: string }> = [];
  const clear = new T.Color(0x123456);
  const renderer = {
    extensions: { has: () => true },
    getDrawingBufferSize: (target: T.Vector2) => target.set(1920, 1080),
    info: { reset() {} },
    autoClear: true,
    setRenderTarget() {},
    clear() {},
    getClearColor: (target: T.Color) => target.copy(clear),
    getClearAlpha: () => 1,
    setClearColor() {},
    render(scene: T.Object3D, camera: T.Camera) {
      if (!(scene instanceof T.Scene)) return;
      const fog = scene.fog as T.Fog;
      renders.push({ near: fog.near, far: fog.far, mask: camera.layers.mask, color: fog.color.getHexString() });
    },
  };
  return { renderer: renderer as unknown as T.WebGLRenderer, renders };
}

/** A scene in the TV page's fog, dipped to a flight's exposure (a colour no hex holds), and a camera facing the sun. */
function glowScene(glowFog?: { near: number; far: number }) {
  const scene = new T.Scene();
  scene.fog = new T.Fog(STUDY_TV_FOG.color, STUDY_TV_FOG.near, STUDY_TV_FOG.far);
  studyHazeColor(new T.Color(STUDY_TV_FOG.color), 0.94, scene.fog.color);
  scene.background = scene.fog.color.clone();
  if (glowFog) scene.userData.studyGlowFog = glowFog;
  const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, STUDY_TV_CAMERA_FAR);
  camera.position.set(0, 12, 40);
  camera.lookAt(0, 8, -200);
  camera.updateMatrixWorld();
  return { scene, camera };
}
/** Layer masks: 0 the main pass, 1 the glow layer, 2 the rays mask, 3 the protect mask. */
const MAIN = 1 << 0, GLOW = 1 << 1, PROTECT = 1 << 3;

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
  it("draws only the glow layer through the study's haze on the TV page, and puts the clear air back", () => {
    const { renderer, renders } = recordingRenderer();
    const radiance = StudyRadiance.create(renderer, { tv: true })!;
    const { scene, camera } = glowScene({ near: STUDY_FOG.near, far: STUDY_FOG.far });
    const color = scene.fog!.color.clone(), background = scene.background;
    radiance.render(scene, camera);
    const fogged = scene.fog!.color.getHexString();
    expect(renders[0]).toEqual({ near: STUDY_TV_FOG.near, far: STUDY_TV_FOG.far, mask: MAIN, color: fogged });
    const glow = renders.filter(render => render.mask === GLOW);
    expect(glow).toEqual([{ near: STUDY_FOG.near, far: STUDY_FOG.far, mask: GLOW, color: "000000" }]);
    for (const render of renders.filter(item => item.mask !== GLOW)) expect([render.near, render.far]).toEqual([STUDY_TV_FOG.near, STUDY_TV_FOG.far]);
    expect(renders.some(render => render.mask === PROTECT)).toBe(true);
    // Everything comes back as it was, the dipped colour exactly, not rounded through a hex.
    const fog = scene.fog as T.Fog;
    expect([fog.near, fog.far]).toEqual([STUDY_TV_FOG.near, STUDY_TV_FOG.far]);
    expect(fog.color.equals(color)).toBe(true);
    expect(scene.background).toBe(background);
    expect(camera.layers.mask).toBe(MAIN);
    radiance.dispose();
  });
  it("never touches the fog's distances without the TV page, whatever the scene carries", () => {
    const { renderer, renders } = recordingRenderer();
    const radiance = StudyRadiance.create(renderer)!;
    const { scene, camera } = glowScene({ near: STUDY_FOG.near, far: STUDY_FOG.far });
    const color = scene.fog!.color.clone();
    radiance.render(scene, camera);
    expect(renders.length).toBeGreaterThanOrEqual(3);
    for (const render of renders) expect([render.near, render.far]).toEqual([STUDY_TV_FOG.near, STUDY_TV_FOG.far]);
    expect(renders.find(render => render.mask === GLOW)!.color).toBe("000000");
    expect((scene.fog as T.Fog).color.equals(color)).toBe(true);
    radiance.dispose();
  });
  it("holds the TV page's glow strength on every tier, and the study's own tiers elsewhere", () => {
    const tv = StudyRadiance.create(recordingRenderer().renderer, { tv: true })!;
    const study = StudyRadiance.create(recordingRenderer().renderer)!;
    expect(tv.glowStrength).toBeCloseTo(0.1, 12);
    expect(study.glowStrength).toBeCloseTo(0.22, 12);
    for (const tier of ["high", "auto"] as const) {
      tv.setTier(tier);
      expect(tv.glowStrength, tier).toBeCloseTo(0.1, 12);
    }
    study.setTier("high");
    expect(study.glowStrength).toBeCloseTo(0.22, 12);
    study.setTier("auto");
    expect(study.glowStrength).toBeCloseTo(0.16, 12);
    // The mood still dips each one by a tenth of its envelope.
    tv.setMood(0.9);
    expect(tv.glowStrength).toBeCloseTo(0.1 * 0.99, 12);
    // The TV page's bloom is tighter, weaker and cut above the faintest tail.
    const bloom = (radiance: StudyRadiance) => (radiance as unknown as { bloom: { strength: number; radius: number; threshold: number } }).bloom;
    expect(bloom(tv).radius).toBeLessThan(bloom(study).radius);
    expect(bloom(tv).strength).toBeLessThan(bloom(study).strength);
    expect(bloom(tv).threshold).toBeGreaterThan(bloom(study).threshold);
    expect(bloom(study)).toMatchObject({ strength: 0.8, radius: 0.55, threshold: 0 });
    expect(tv.rayStrength).toBeLessThan(study.rayStrength);
    tv.dispose(); study.dispose();
  });
});

describe("the TV page's sky, sun and light", () => {
  it("keeps the study's sky program character for character", () => {
    const study = studySkyFragment();
    expect(study).toBe(studySkyFragment(false));
    expect(sha256(study)).toBe(STUDY_SKY_FRAGMENT_SHA256);
    expect(study).toContain("cloud*.55*lift");
    expect(study).toContain("(pow(key,5.)*.20+pow(key,60.)*.5)*lift");
  });
  it("softens the sun's glow and core and the cloud band on the TV page, and nothing else", () => {
    const tv = studySkyFragment(true);
    expect(tv).toContain("cloud*.30*lift");
    expect(tv).toContain("(pow(key,5.)*.08+pow(key,60.)*.32)*lift");
    // Put the study's three numbers back and it is the study's source again.
    expect(tv.replace("cloud*.30*lift", "cloud*.55*lift").replace("*.08+pow(key,60.)*.32)", "*.20+pow(key,60.)*.5)")).toBe(studySkyFragment());
  });
  it("shrinks and fades the sun's two sprites", () => {
    const study = studySunHalo(), tv = studySunHalo(true);
    expect(study.sprites.map(sprite => sprite.scale.x)).toEqual([150, 60]);
    expect(study.materials.map(material => material.opacity)).toEqual([0.5, 0.45]);
    expect(tv.sprites.map(sprite => sprite.scale.x)).toEqual(STUDY_TV_SUN_HALO.map(([size]) => size));
    expect(tv.materials.map(material => material.opacity)).toEqual(STUDY_TV_SUN_HALO.map(([, opacity]) => opacity));
    tv.sprites.forEach((sprite, i) => {
      expect(sprite.scale.x).toBeLessThan(study.sprites[i].scale.x);
      expect(tv.materials[i].opacity).toBeLessThan(study.materials[i].opacity);
    });
    expect(tv.materials.map(material => material.color.getHexString())).toEqual(study.materials.map(material => material.color.getHexString()));
    for (const halo of [study, tv]) { halo.materials.forEach(material => material.dispose()); halo.map.dispose(); }
  });
  it("balances the light toward the sun without touching the exposure", () => {
    // Less of the soft fill, more sun and a firmer shadow; the tone has no exposure of its own.
    expect(STUDY_TV_TONE.environmentIntensity).toBeLessThan(STUDY_TONE.environmentIntensity);
    expect(STUDY_TV_TONE.hemisphere).toBeLessThan(0.55);
    expect(STUDY_TV_TONE.sun).toBeGreaterThan(2.3);
    expect(STUDY_TV_TONE.shadowIntensity).toBeGreaterThan(STUDY_TONE.shadowIntensity);
    expect("exposure" in STUDY_TV_TONE).toBe(false);
    expect(STUDY_TONE).toEqual({ exposure: 1, environmentIntensity: 0.9, shadowIntensity: 0.6 });
  });
});

describe("the TV page's sea", () => {
  it("gives the sea its own environment on the TV page, once there is one", () => {
    const scene = new T.Scene(), water = new T.MeshPhysicalMaterial({ envMapIntensity: 1.35 });
    // Without the TV page the design world publishes no water, so nothing happens.
    scene.environment = new T.Texture();
    expect(applyTvWaterEnvironment(scene)).toBe(false);
    scene.environment = null;
    scene.userData.studyTvWater = water;
    expect(applyTvWaterEnvironment(scene)).toBe(false);
    expect(water.envMap).toBeNull();
    const environment = new T.Texture(), version = water.version;
    scene.environment = environment;
    scene.environmentIntensity = STUDY_TV_TONE.environmentIntensity;
    expect(applyTvWaterEnvironment(scene)).toBe(true);
    // Its own map, so three lights it by its own intensity rather than the scene's lower one.
    expect(water.envMap).toBe(environment);
    expect(water.envMapIntensity).toBe(TV_WATER.envMapIntensity);
    expect(water.envMapIntensity).toBeGreaterThan(scene.environmentIntensity);
    expect(water.version).toBeGreaterThan(version);
  });
  it("lightens the TV page's water to a pastel, and only the water of the materials it is handed", () => {
    const palette = Object.fromEntries(
      ["ivory", "edge", "gold", "rose", "roseGold", "leaf", "lawn", "stone", "bloom", "water", "silk", "cotton", "shadow", "fall"]
        .map(name => [name, new T.MeshStandardMaterial({ color: "#57bfd0" })]),
    ) as unknown as DesignKitContext["palette"];
    applyTvPalette(palette);
    const water = (palette.water as T.MeshStandardMaterial).color;
    expect(water.getHexString()).toBe(TV_WATER.color.slice(1));
    const study = new T.Color("#57bfd0"), hsl = { h: 0, s: 0, l: 0 }, before = { h: 0, s: 0, l: 0 };
    water.getHSL(hsl); study.getHSL(before);
    expect(hsl.l).toBeGreaterThan(before.l);
    expect(Math.abs(hsl.h - before.h)).toBeLessThan(0.02);
    expect((palette.rose as T.MeshStandardMaterial).color.getHexString()).toBe("57bfd0");
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
    expect(tv.materials.map(material => material.uniforms.fogRelief.value)).toEqual([STUDY_TV_CLOUDS.skyRelief, 0]);
    // The collars stay well visible, so the islands still read as floating.
    expect(Math.min(...alphas(tv.meshes[1]))).toBeGreaterThan(0.5);
    for (let i = 0; i < 2; i++) expect(tv.meshes[i].count).toBe(study.meshes[i].count);
    for (const clouds of [study, tv]) { clouds.materials.forEach(m => m.dispose()); clouds.geometries.forEach(g => g.dispose()); }
  });
  it("draws the sky lane clouds lighter on the TV page, never through the table", () => {
    const study = corridorSoftCloud(), tv = corridorSoftCloud(true);
    expect(study.opacity).toBe(SOFT_CLOUD.opacity);
    expect(study.opacity).toBe(0.5);
    expect(tv.opacity).toBe(0.25);
    expect(SOFT_CLOUD.opacity).toBe(0.5);
    // The same material otherwise: the same soft draw and the same compiled rim.
    expect(tv.transparent && !tv.depthWrite).toBe(true);
    expect(tv.customProgramCacheKey()).toBe(study.customProgramCacheKey());
    study.dispose(); tv.dispose();
  });
  it("fades the water halo to its own lighter peak on the TV page", () => {
    const camera = new T.PerspectiveCamera();
    camera.position.set(0, 10, 30);
    const study = new StudyWaterHalo(new T.Scene()), tv = new StudyWaterHalo(new T.Scene(), STUDY_TV_SPECKS.waterHalo);
    study.update(new T.Vector3(), camera, 0);
    tv.update(new T.Vector3(), camera, 0);
    expect(study.opacity()).toBeCloseTo(WATER_HALO_OPACITY, 6);
    expect(tv.opacity()).toBeCloseTo(STUDY_TV_SPECKS.waterHalo, 6);
    expect(tv.opacity()).toBeLessThan(study.opacity());
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
    expect((tv.motes.material as T.PointsMaterial).opacity).toBeLessThan(0.28);
    expect(study.stars.layers.isEnabled(1)).toBe(true);
    expect(tv.stars.layers.isEnabled(1)).toBe(false);
    expect(tv.stars.layers.isEnabled(0)).toBe(true);
    // The motes stay glow layer members on both, only fainter.
    expect(tv.motes.layers.isEnabled(1)).toBe(true);
    study.air.dispose(); tv.air.dispose();
    // Every speck is fainter than the study's, none gone: the lanterns (.58), the sparkle field
    // (.9) and the water halo.
    expect(STUDY_TV_SPECKS.lanterns).toBeLessThan(0.58);
    expect(STUDY_TV_SPECKS.sparkles).toBeLessThan(0.9);
    expect(STUDY_TV_SPECKS.waterHalo).toBeLessThan(WATER_HALO_OPACITY);
    for (const value of Object.values(STUDY_TV_SPECKS)) expect(value).toBeGreaterThan(0);
  });
});

describe("the TV page's pearl halo", () => {
  const assets = () => ({
    icon: () => new T.Texture(),
    dot: () => new T.DataTexture(new Uint8Array(4), 1, 1),
    dispose() {},
  }) as unknown as StudyPearlAssets;
  const halo = (tv?: boolean) => {
    const parent = new T.Group();
    new StudyPearlSkin(parent, assets(), 0, undefined, tv === undefined ? undefined : { tv });
    return parent.getObjectByName("pearl halo") as T.Mesh<T.PlaneGeometry, T.ShaderMaterial>;
  };
  it("keeps the study's halo program character for character", () => {
    expect(sha256(pearlHaloFragment())).toBe(STUDY_HALO_FRAGMENT_SHA256);
    expect(halo().material.fragmentShader).toBe(pearlHaloFragment());
    expect(halo(false).material.fragmentShader).toBe(pearlHaloFragment());
  });
  it("fades to nothing before the plane's edge on the TV page", () => {
    const mesh = halo(true), source = mesh.material.fragmentShader;
    expect(source).not.toBe(pearlHaloFragment());
    const line = `rgb*=1.-smoothstep(${PEARL_HALO_TV_FADE[0]},${PEARL_HALO_TV_FADE[1]},d);`;
    expect(line).toBe("rgb*=1.-smoothstep(1.5,1.78,d);");
    // After the light is summed, before it is written, and otherwise the study's own source.
    expect(source.indexOf(line)).toBeGreaterThan(source.indexOf("vec3 rgb="));
    expect(source.indexOf(line)).toBeLessThan(source.indexOf("gl_FragColor="));
    expect(source.replace(`\n          ${line}`, "")).toBe(pearlHaloFragment());
    // `d` is the uv's distance from the centre times 3.6, so the nearest edge of the square
    // plane (half its uv) is at 1.8, and its corners further out.
    expect(source).toContain("float d=length(haloUv-.5)*3.6;");
    const { width, height } = mesh.geometry.parameters;
    expect([width, height]).toEqual([3.6, 3.6]);
    const edge = 0.5 * 3.6;
    const fade = (d: number) => 1 - smoothstep(PEARL_HALO_TV_FADE[0], PEARL_HALO_TV_FADE[1], d);
    // The study's outer ring still lights the edge, which was the straight line beside the bubble.
    const ring = (d: number) => Math.exp(-(((d - 1.18) * 2.2) ** 2)) * 0.16;
    expect(ring(edge)).toBeGreaterThan(0.02);
    for (const d of [edge, 2, Math.SQRT1_2 * 3.6]) expect(ring(d) * fade(d), `${d}`).toBe(0);
    // The ring's bright middle, and everything inside it, is untouched.
    for (const d of [0, 0.6, 1.18, 1.5]) expect(fade(d)).toBe(1);
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
    expect(compile(before).getHex()).toBe(new T.Color("#ffe6c9").multiplyScalar(STUDY_TV_RIM_SCALE).getHex());
    const after = studyRim(new T.MeshStandardMaterial(), "#fff0e0", 2.2, .3);
    const uniform = compile(after);
    scaleStudyRim(after, STUDY_TV_RIM_SCALE);
    expect(uniform.getHex()).toBe(new T.Color("#fff0e0").multiplyScalar(STUDY_TV_RIM_SCALE).getHex());
  });
  it("leaves a rim alone unless it is asked, and a material without a rim untouched", () => {
    const rim = studyRim(new T.MeshStandardMaterial(), "#ffb6c8", 2.5, .3);
    expect(compile(rim).getHex()).toBe(new T.Color("#ffb6c8").getHex());
    expect(scaleStudyRim(new T.MeshStandardMaterial(), STUDY_TV_RIM_SCALE)).toBe(0);
    // Softened, never put out.
    expect(STUDY_TV_RIM_SCALE).toBeGreaterThan(0);
    expect(STUDY_TV_RIM_SCALE).toBeLessThan(1);
  });
  it("keeps the program key, so the study and the TV page share one compiled rim", () => {
    const study = studyRim(new T.MeshStandardMaterial(), "#ffe6c9", 3, .22);
    const tv = studyRim(new T.MeshStandardMaterial(), "#ffe6c9", 3, .22);
    scaleStudyRim(tv, STUDY_TV_RIM_SCALE);
    expect(tv.customProgramCacheKey()).toBe(study.customProgramCacheKey());
  });
});
