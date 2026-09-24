import * as T from "three";
import { describe, expect, it } from "vitest";
import { ZONES } from "@/components/display/world/world-data";
import {
  TV_ARC,
  TV_BIG,
  TV_FILL,
  TV_FOV,
  TV_PLACE_LAYOUT,
  TV_SCREEN_HEIGHT,
  TV_SMALL,
  TV_TEXT,
  contrastRatio,
  heartLabel,
  tvBubblePlacement,
  tvCorridorLegs,
  tvScrollFraction,
} from "@/components/display/world/prototype/tv-bubbles";
import { ARRIVAL_VIEW, TOUR_ORDER } from "@/components/display/world/world-data";

const garden = ZONES.find((zone) => zone.id === "garden")!;

/** The camera as CameraDirector.update places it during a hold, with the TV page's arc. */
function holdCamera(age: number) {
  const angle = Math.sin(age * 0.035) * TV_ARC.swing;
  const approach = 1 - Math.sin(age * 0.03) * TV_ARC.approach;
  const dx = garden.eye[0] - garden.target[0], dz = garden.eye[2] - garden.target[2];
  const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, 450);
  camera.position.set(
    garden.target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach,
    garden.eye[1] + Math.sin(age * 0.045) * 1.6,
    garden.target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach,
  );
  camera.lookAt(new T.Vector3(...garden.target));
  camera.updateMatrixWorld();
  return camera;
}

/** Projected diameter in pixels of a 1080 line screen, and the centre in NDC. */
function onScreen(camera: T.PerspectiveCamera, position: T.Vector3, radius: number) {
  const view = position.clone().applyMatrix4(camera.matrixWorldInverse);
  const depth = -view.z;
  const diameter = (radius / (depth * Math.tan((TV_FOV * Math.PI) / 360))) * TV_SCREEN_HEIGHT;
  const ndc = position.clone().project(camera);
  return { diameter, ndc };
}

describe("TV bubble layout in the Garden", () => {
  const placements = TV_PLACE_LAYOUT.map((spec) => ({ spec, ...tvBubblePlacement(garden, spec) }));

  it("has 2 big and 8 small bubbles", () => {
    expect(TV_PLACE_LAYOUT.filter((spec) => spec.role !== "small")).toHaveLength(2);
    expect(TV_PLACE_LAYOUT.filter((spec) => spec.role === "small")).toHaveLength(8);
  });

  it("lands every bubble where its spec says in the parked tour view", () => {
    const camera = holdCamera(0);
    for (const { spec, position, radius } of placements) {
      const seen = onScreen(camera, position, radius);
      expect(seen.ndc.x).toBeCloseTo(spec.ndc[0], 3);
      expect(seen.ndc.y).toBeCloseTo(spec.ndc[1], 3);
      expect(seen.diameter).toBeCloseTo(spec.diameter, 0);
    }
  });

  it("keeps the held bubble's body at 34 px or more and the whole bubble in frame through a 20 s hold", () => {
    const held = placements.find((item) => item.spec.role === "held")!;
    // Every hold starts somewhere along the arc, so sample the whole arc's first two minutes.
    for (let age = 0; age <= 120; age += 0.5) {
      const seen = onScreen(holdCamera(age), held.position, held.radius);
      expect((TV_BIG.body / TV_BIG.canvas) * seen.diameter).toBeGreaterThanOrEqual(34);
      const half = seen.diameter / TV_SCREEN_HEIGHT;
      expect(seen.ndc.y + half).toBeLessThan(1);
      expect(seen.ndc.y - half).toBeGreaterThan(-1);
      expect(seen.ndc.x + half * (9 / 16)).toBeLessThan(1);
    }
  });

  it("keeps small bubble words at 22 px or more in the tour view", () => {
    const camera = holdCamera(0);
    for (const { spec, position, radius } of placements.filter((item) => item.spec.role === "small")) {
      const { diameter } = onScreen(camera, position, radius);
      const smallest = Math.min(TV_SMALL.body, TV_SMALL.heart, TV_SMALL.nameMin);
      expect((smallest / TV_SMALL.canvas) * diameter, `small at ${spec.ndc}`).toBeGreaterThanOrEqual(22);
    }
  });

  it("keeps every Garden bubble well away from every camera eye", () => {
    const eyes = [ARRIVAL_VIEW.eye, ...ZONES.map((zone) => zone.eye)].map((eye) => new T.Vector3(...eye));
    for (const { spec, position, radius } of placements)
      for (const eye of eyes) expect(position.distanceTo(eye) - radius, `${spec.role} at ${spec.ndc}`).toBeGreaterThan(8);
  });

  it("fits 9 lines at the body size in the message window", () => {
    expect(Math.floor((TV_BIG.windowBottom - TV_BIG.windowTop) / TV_BIG.line)).toBeGreaterThanOrEqual(9);
    // The window's corners stay inside the face, clear of the rainbow rim.
    const corner = Math.hypot(TV_BIG.windowWidth / 2, TV_BIG.windowBottom - 512) / 512;
    expect(corner).toBeLessThan(0.95);
  });
});

describe("TV bubble text", () => {
  it("has contrast of 4.5 to 1 or more against the bubble fill", () => {
    for (const color of Object.values(TV_TEXT))
      for (const fill of TV_FILL) expect(contrastRatio(color, fill), `${color} on ${fill}`).toBeGreaterThanOrEqual(4.5);
  });
  it("scrolls a long message only between 2 s in and 2 s before the end", () => {
    expect(tvScrollFraction(0, 20)).toBe(0);
    expect(tvScrollFraction(2, 20)).toBe(0);
    expect(tvScrollFraction(10, 20)).toBeCloseTo(0.5);
    expect(tvScrollFraction(18, 20)).toBe(1);
    expect(tvScrollFraction(20, 20)).toBe(1);
  });
  it("labels hearts only when a count is known", () => {
    expect(heartLabel(24)).toBe("♥ 24");
    expect(heartLabel(1200)).toBe("♥ 1,200");
    expect(heartLabel(null)).toBe("");
  });
  it("puts corridor bubbles on the legs into and out of the Garden", () => {
    expect(tvCorridorLegs(TOUR_ORDER, ["garden"])).toEqual([["welcome", "garden"], ["garden", "featured"]]);
  });
});
