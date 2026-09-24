import * as T from "three";
import { describe, expect, it } from "vitest";
import { ZONES } from "@/components/display/world/world-data";
import { studyCanopyPuffs } from "@/components/display/world/prototype/study-canopy";
import {
  TV_ANCHORS,
  TV_FOCUS_DELAY,
  TV_FOCUS_IN,
  TV_FOCUS_OUT,
  STUDY_LARGE_TREES,
  studyBridges,
  studyCrownSurface,
  studyCrownTop,
  tvAnchorWorld,
  tvBridgeAnchors,
  tvFocusWeight,
  tvReadingPose,
} from "@/components/display/world/prototype/tv-anchors";
import { TV_BIG, TV_FOV, TV_SMALL, tvTourCamera } from "@/components/display/world/prototype/tv-bubbles";

const garden = ZONES.find((zone) => zone.id === "garden")!;
const anchors = TV_ANCHORS.garden!;
const placed = anchors.map((anchor) => ({ anchor, ...tvAnchorWorld(garden, anchor) }));
const main = placed.find((item) => item.anchor.role === "main")!;

/** A disc on a 1920 by 1080 screen: centre in pixels, radius in pixels, depth in world units. */
function onScreen(camera: T.PerspectiveCamera, position: T.Vector3, radius: number) {
  const depth = -position.clone().applyMatrix4(camera.matrixWorldInverse).z;
  const r = (radius / (depth * Math.tan((TV_FOV * Math.PI) / 360))) * 540;
  const p = position.clone().project(camera);
  return { x: (p.x + 1) * 960, y: (1 - p.y) * 540, r, depth };
}
/** The screen text the bubbles in view must leave clear (WorldTv.module.css at 1080p). */
const SCREEN_TEXT = [
  { name: "title", x0: 58, x1: 560, y0: 40, y1: 175 },
  { name: "live", x0: 1580, x1: 1862, y0: 40, y1: 122 },
  { name: "qr", x0: 58, x1: 404, y0: 835, y1: 967 },
  { name: "ticker", x0: 0, x1: 1920, y0: 991, y1: 1080 },
];
const hitsRect = (disc: { x: number; y: number; r: number }, rect: (typeof SCREEN_TEXT)[number]) =>
  Math.hypot(disc.x - Math.max(rect.x0, Math.min(rect.x1, disc.x)), disc.y - Math.max(rect.y0, Math.min(rect.y1, disc.y))) < disc.r;

/** The tour camera on the Garden's reading arc, as CameraDirector.update places it. */
function arcCamera(age: number) {
  const angle = Math.sin(age * 0.035) * 0.48, approach = 1 - Math.sin(age * 0.03) * 0.1;
  const dx = garden.eye[0] - garden.target[0], dz = garden.eye[2] - garden.target[2];
  return new T.Vector3(
    garden.target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach,
    garden.eye[1] + Math.sin(age * 0.045) * 1.6,
    garden.target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach,
  );
}

describe("the Garden's bubbles rest on real things in the scene", () => {
  it("has one main bubble, a second one and six small ones", () => {
    expect(anchors.filter((a) => a.role === "main")).toHaveLength(1);
    expect(anchors.filter((a) => a.role === "second")).toHaveLength(1);
    const small = anchors.filter((a) => a.role === "small").length;
    expect(small).toBeGreaterThanOrEqual(4);
    expect(small).toBeLessThanOrEqual(8);
  });

  it("ties every bubble to what holds it: stems from below, chains from above, calyx on crowns", () => {
    for (const { anchor, centre, from, radius } of placed) {
      if (anchor.kind === "arch") expect(from.y, anchor.on).toBeGreaterThan(centre.y + radius);
      else expect(from.y, anchor.on).toBeLessThan(centre.y - radius + 0.3);
      expect(from.distanceTo(centre) - radius, anchor.on).toBeLessThan(8);
    }
    // The crown bubble sits on the crown's actual surface (design-world tree seed 980).
    const crown = anchors.find((a) => a.on.includes("back right blossom"))!;
    expect(crown.from[1]).toBeCloseTo(studyCrownSurface(12.3, -6.9, 1.1, 980, crown.from[0], crown.from[2]), 6);
    expect(crown.from[1]).toBeLessThanOrEqual(studyCrownTop(12.3, -6.9, 1.1, 980)[1]);
  });

  it("never pushes a bubble into a tree crown it does not rest on", () => {
    for (const { anchor } of placed)
      for (const tree of STUDY_LARGE_TREES) {
        if (anchor.kind === "crown" && Math.hypot(anchor.from[0] - tree.x, anchor.from[2] - tree.z) < 3) continue;
        // Clear of every cotton puff of the crown, each a sphere as design-world stamps it.
        for (const puff of studyCanopyPuffs(tree.seed + 73)) {
          const centre = new T.Vector3(tree.x + puff.x * tree.size, 0.7 + puff.y * tree.size, tree.z + puff.z * tree.size);
          expect(new T.Vector3(...anchor.centre).distanceTo(centre), `${anchor.on} in tree ${tree.seed}`)
            .toBeGreaterThan(puff.r * tree.size + anchor.radius + 0.1);
        }
      }
  });

  it("keeps the bubbles apart in the world", () => {
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++)
        expect(placed[i].centre.distanceTo(placed[j].centre), `${placed[i].anchor.on} / ${placed[j].anchor.on}`)
          .toBeGreaterThan(placed[i].radius + placed[j].radius + 0.5);
  });

  it("shows one big bubble and three or four small ones in the tour view, readable and clear of each other and the screen text", () => {
    const camera = tvTourCamera(garden);
    const inView = placed.filter((item) => item.anchor.inView).map((item) => ({ ...item, disc: onScreen(camera, item.centre, item.radius) }));
    const small = inView.filter((item) => item.anchor.role !== "main");
    expect(small.length).toBeGreaterThanOrEqual(3);
    expect(small.length).toBeLessThanOrEqual(4);
    for (const { anchor, disc } of inView) {
      expect(disc.x - disc.r, anchor.on).toBeGreaterThan(0);
      expect(disc.x + disc.r, anchor.on).toBeLessThan(1920);
      expect(disc.y - disc.r, anchor.on).toBeGreaterThan(0);
      for (const rect of SCREEN_TEXT) expect(hitsRect(disc, rect), `${anchor.on} under the ${rect.name}`).toBe(false);
      if (anchor.role !== "main") expect(disc.r * 2, anchor.on).toBeGreaterThanOrEqual(TV_SMALL.minDiameter);
    }
    for (let i = 0; i < inView.length; i++)
      for (let j = i + 1; j < inView.length; j++) {
        const a = inView[i].disc, b = inView[j].disc;
        // The main bubble's gold ring sits at 1.16 of its radius; small bubbles stay outside it.
        const reach = (item: (typeof inView)[number]) => item.disc.r * (item.anchor.role === "main" ? 1.2 : 1);
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${inView[i].anchor.on} / ${inView[j].anchor.on}`)
          .toBeGreaterThan(reach(inView[i]) + reach(inView[j]));
      }
  });

  it("keeps the others out of the tour view, or wholly behind the main bubble", () => {
    const camera = tvTourCamera(garden);
    const front = onScreen(camera, main.centre, main.radius);
    for (const item of placed.filter((p) => !p.anchor.inView)) {
      const disc = onScreen(camera, item.centre, item.radius);
      const offFrame = disc.x + disc.r < 0 || disc.x - disc.r > 1920 || disc.y + disc.r < 0 || disc.y - disc.r > 1080;
      const behindMain = disc.depth > front.depth && Math.hypot(disc.x - front.x, disc.y - front.y) + disc.r < front.r;
      expect(offFrame || behindMain, item.anchor.on).toBe(true);
    }
  });

  it("reads the main message at 34 px or more when the camera flies close, from anywhere on the arc", () => {
    const pose = { eye: new T.Vector3(), target: new T.Vector3() };
    for (let age = 0; age <= 120; age += 2) {
      tvReadingPose(main.centre, main.radius, arcCamera(age), 16 / 9, pose);
      const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, 450);
      camera.position.copy(pose.eye);
      camera.lookAt(pose.target);
      camera.updateMatrixWorld();
      const disc = onScreen(camera, main.centre, main.radius);
      // 2 px of margin for the study's breathing dolly.
      expect((TV_BIG.body / TV_BIG.canvas) * disc.r * 2).toBeGreaterThanOrEqual(36);
      // The whole bubble is on screen, right of centre, clear of the title and the ticker.
      expect(disc.x).toBeGreaterThan(960);
      expect(disc.x + disc.r).toBeLessThan(1920);
      expect(disc.y - disc.r).toBeGreaterThan(0);
      expect(disc.y + disc.r).toBeLessThan(991);
      for (const rect of SCREEN_TEXT) expect(hitsRect(disc, rect), `main under the ${rect.name} at age ${age}`).toBe(false);
      // What holds it, the lotus, stays in the picture.
      const lotus = main.from.clone().project(camera);
      expect(Math.abs(lotus.x)).toBeLessThan(1);
      expect(Math.abs(lotus.y)).toBeLessThan(1);
    }
  });
});

describe("the camera's reading move", () => {
  it("shows the place, glides in, holds, and pulls back out", () => {
    const hold = 12 + TV_FOCUS_DELAY + TV_FOCUS_IN + TV_FOCUS_OUT;
    expect(tvFocusWeight(0, hold, false)).toBe(0);
    expect(tvFocusWeight(TV_FOCUS_DELAY, hold, false)).toBe(0);
    expect(tvFocusWeight(TV_FOCUS_DELAY + TV_FOCUS_IN, hold, false)).toBe(1);
    expect(tvFocusWeight(hold / 2, hold, false)).toBe(1);
    expect(tvFocusWeight(hold - TV_FOCUS_OUT, hold, false)).toBe(1);
    expect(tvFocusWeight(hold, hold, false)).toBe(0);
    // A still view cuts in and out instead.
    expect(tvFocusWeight(0, hold, true)).toBe(0);
    expect(tvFocusWeight(TV_FOCUS_DELAY, hold, true)).toBe(1);
    expect(tvFocusWeight(hold, hold, true)).toBe(0);
  });
});

describe("bubbles on the bridges", () => {
  it("builds the thirteen bridges the design world builds", () => {
    expect(studyBridges()).toHaveLength(13);
  });
  it("rests two bubbles on the rails of every bridge out of the Garden", () => {
    const gardenBridges = studyBridges().filter((bridge) => bridge.from === "garden" || bridge.to === "garden");
    const bubbles = tvBridgeAnchors(["garden"]);
    expect(bubbles).toHaveLength(gardenBridges.length * 2);
    for (const bubble of bubbles) expect(bubble.centre.y).toBeGreaterThan(bubble.from.y);
  });
});
