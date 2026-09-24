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
  TV_RIVER_SECONDS,
  isRiverSpec,
  tvCorridorLegs,
  tvLayoutFor,
  tvRiverAt,
  tvRiverPath,
  tvTourCamera,
  tvScrollFraction,
} from "@/components/display/world/prototype/tv-bubbles";
import { TV_PANEL_PLACES } from "@/components/display/world/prototype/tv-page";
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

  it("keeps every other bubble's words (the second big one wears the small face) at 22 px or more", () => {
    const camera = holdCamera(0);
    // Every role but the held one is painted with the small face.
    expect(placements.filter((item) => item.spec.role !== "held").length).toBe(TV_PLACE_LAYOUT.length - 1);
    for (const { spec, position, radius } of placements.filter((item) => item.spec.role !== "held")) {
      const { diameter } = onScreen(camera, position, radius);
      const smallest = Math.min(TV_SMALL.body, TV_SMALL.heart, TV_SMALL.nameMin);
      expect((smallest / TV_SMALL.canvas) * diameter, `small at ${spec.ndc}`).toBeGreaterThanOrEqual(22);
    }
  });

  it("reads the arriving bubble at 34 px or more from the arrival view", () => {
    // world-recognitions: the arriving bubble reads at (4.138, 12, 19.104), radius 7.3 on the TV page.
    const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, 450);
    camera.position.set(...ARRIVAL_VIEW.eye);
    camera.lookAt(new T.Vector3(...ARRIVAL_VIEW.target));
    camera.updateMatrixWorld();
    const seen = onScreen(camera, new T.Vector3(4.138, 12, 19.104), 7.3);
    expect((TV_BIG.body / TV_BIG.canvas) * seen.diameter).toBeGreaterThanOrEqual(34);
    expect(Math.abs(seen.ndc.y) + seen.diameter / TV_SCREEN_HEIGHT).toBeLessThan(1.02);
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

describe("TV bubbles at all thirteen places", () => {
  /** The hold camera at any place, with the TV page's arc. */
  function placeCamera(zone: (typeof ZONES)[number], age: number) {
    const angle = Math.sin(age * 0.035) * TV_ARC.swing;
    const approach = 1 - Math.sin(age * 0.03) * TV_ARC.approach;
    const dx = zone.eye[0] - zone.target[0], dz = zone.eye[2] - zone.target[2];
    const camera = new T.PerspectiveCamera(TV_FOV, 16 / 9, 0.1, 450);
    camera.position.set(
      zone.target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach,
      zone.eye[1] + Math.sin(age * 0.045) * 1.6,
      zone.target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach,
    );
    camera.lookAt(new T.Vector3(...zone.target));
    camera.updateMatrixWorld();
    return camera;
  }
  const eyes = [ARRIVAL_VIEW.eye, ...ZONES.map((zone) => zone.eye)].map((eye) => new T.Vector3(...eye));

  for (const place of TOUR_ORDER) {
    const zone = ZONES.find((item) => item.id === place)!;
    const layout = tvLayoutFor(place, TV_PANEL_PLACES);
    // A river bubble is checked at the top, the middle and the end of its run.
    const points = layout.flatMap((spec) => {
      const from = tvBubblePlacement(zone, spec);
      if (!isRiverSpec(spec)) return [{ spec, ...from }];
      void from;
      return tvRiverPath(zone, spec, 9).map((point) => ({ spec, ...point }));
    });

    it(`${place}: 1 held and 1 second big bubble and 8 small ones`, () => {
      expect(layout.filter((spec) => spec.role === "held")).toHaveLength(1);
      expect(layout.filter((spec) => spec.role === "second")).toHaveLength(1);
      expect(layout.filter((spec) => spec.role === "small")).toHaveLength(8);
    });

    it(`${place}: held body 34 px or more through the arc, every other in frame word 22 px or more`, () => {
      const held = points.find((item) => item.spec.role === "held")!;
      for (let age = 0; age <= 120; age += 2) {
        const seen = onScreen(placeCamera(zone, age), held.position, held.radius);
        expect((TV_BIG.body / TV_BIG.canvas) * seen.diameter).toBeGreaterThanOrEqual(34);
      }
      const camera = placeCamera(zone, 0);
      const smallest = Math.min(TV_SMALL.body, TV_SMALL.heart, TV_SMALL.nameMin);
      for (const { spec, position, radius } of points.filter((item) => item.spec.role !== "held")) {
        const seen = onScreen(camera, position, radius);
        if (Math.abs(seen.ndc.x) > 1.1 || Math.abs(seen.ndc.y) > 1.1) continue;
        expect((smallest / TV_SMALL.canvas) * seen.diameter, `${spec.role} at ${spec.ndc}`).toBeGreaterThanOrEqual(22);
      }
    });

    it(`${place}: every bubble stays clear of every camera eye`, () => {
      for (const { spec, position, radius } of points)
        for (const eye of eyes) expect(position.distanceTo(eye) - radius, `${spec.role} at ${spec.ndc}`).toBeGreaterThan(6);
    });

    if (TV_PANEL_PLACES.includes(place))
      it(`${place}: bubbles in view leave the feature panel on the left clear`, () => {
        // The panel on a 1920 by 1080 screen: x 58 to 576, y 190 to 820 (WorldTv.module.css).
        const camera = placeCamera(zone, 0);
        for (const { spec, position, radius } of points) {
          const seen = onScreen(camera, position, radius);
          const cx = (seen.ndc.x + 1) * 960, cy = (1 - seen.ndc.y) * 540, r = seen.diameter / 2;
          const nx = Math.max(58, Math.min(576, cx)), ny = Math.max(190, Math.min(820, cy));
          expect(Math.hypot(cx - nx, cy - ny), `${spec.role} at ${spec.ndc}`).toBeGreaterThan(r);
        }
      });
  }
});

describe("the River of Recognitions", () => {
  it("keeps the river bubbles in view from overlapping, in two columns, as they drift", () => {
    const zone = ZONES.find((item) => item.id === "live-feed")!;
    const layout = tvLayoutFor("live-feed", TV_PANEL_PLACES).filter(isRiverSpec);
    expect(new Set(layout.map((spec) => spec.ndc[0])).size).toBe(2);
    const camera = tvTourCamera(zone);
    const runs = layout.map((spec) => ({ spec, path: tvRiverPath(zone, spec) }));
    const out = new T.Vector3();
    for (let time = 0; time < TV_RIVER_SECONDS; time += 0.5) {
      const shown = runs.map(({ spec, path }) => {
        const run = tvRiverAt(path, spec.offset, time, out);
        const seen = onScreen(camera, out, run.radius);
        return { x: (seen.ndc.x + 1) * 960, y: (1 - seen.ndc.y) * 540, r: (seen.diameter / 2) * run.presence };
      }).filter((item) => item.y + item.r > 0 && item.y - item.r < 1080 && item.r > 1);
      for (let i = 0; i < shown.length; i++)
        for (let j = i + 1; j < shown.length; j++) {
          const a = shown[i], b = shown[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y), `t ${time}`).toBeGreaterThan((a.r + b.r) * 0.9);
        }
    }
  });
});
