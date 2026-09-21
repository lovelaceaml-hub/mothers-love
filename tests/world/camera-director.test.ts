import { describe, expect, it } from "vitest";
import { CameraDirector } from "@/components/display/world/camera-director";
import {
  seededRandom,
  ZONES,
  TOUR_ORDER,
} from "@/components/display/world/world-data";

describe("persistent world camera", () => {
  it("tours every zone and returns to the garden with no jumps", () => {
    const camera = new CameraDirector();
    const visited = new Set([camera.zone]);
    let maximumStep = 0;
    for (let n = 0; n < 800 * 60; n++) {
      const before = camera.position.clone();
      camera.update(1 / 60);
      maximumStep = Math.max(maximumStep, before.distanceTo(camera.position));
      visited.add(camera.zone);
      expect(Number.isFinite(camera.position.length())).toBe(true);
    }
    expect([...visited].sort()).toEqual(TOUR_ORDER.slice().sort());
    expect(maximumStep).toBeLessThan(0.4);
  });
  it("manual travel starts from the current position, including interrupted travel", () => {
    const camera = new CameraDirector();
    camera.update(9);
    const before = camera.position.clone();
    camera.visit("heart");
    expect(camera.position.equals(before)).toBe(true);
    camera.update(7);
    const between = camera.position.clone();
    camera.visit("expressions");
    expect(camera.position.equals(between)).toBe(true);
    camera.update(20);
    expect(camera.zone).toBe("expressions");
    camera.position
      .toArray()
      .forEach((value, i) => expect(value).toBeCloseTo(ZONES[2].eye[i], 8));
  });
  it("still navigation moves directly to a chosen viewpoint without travel", () => {
    const camera = new CameraDirector();
    camera.visit("heart", true);
    expect(camera.zone).toBe("heart");
    expect(camera.traveling).toBe(false);
    expect(camera.position.toArray()).toEqual([...ZONES[1].eye]);
  });
  it("arrival restores the precise interrupted route and continues it", () => {
    const camera = new CameraDirector();
    camera.visit("orbit");
    camera.update(7);
    const before = camera.position.clone();
    camera.beginArrival(false);
    camera.update(5);
    expect(camera.position.distanceTo(before)).toBeGreaterThan(1);
    camera.endArrival(false);
    camera.update(6);
    expect(camera.position.distanceTo(before)).toBeLessThan(0.0001);
    expect(camera.destination).toBe("orbit");
    expect(camera.traveling).toBe(true);
    camera.update(11);
    expect(camera.zone).toBe("orbit");
  });
  it("a privacy cancellation can interrupt the return route immediately", () => {
    const camera = new CameraDirector();
    const before = camera.position.clone();
    camera.beginArrival(false);
    camera.update(5);
    camera.endArrival(false);
    camera.update(2);
    camera.endArrival(true);
    expect(camera.position.equals(before)).toBe(true);
    expect(camera.traveling).toBe(false);
  });
  it("holds departure until a full reading interval is complete", () => {
    const camera = new CameraDirector();
    camera.update(100, true, false, false);
    expect(camera.traveling).toBe(false);
    camera.update(0.1, true, false, true);
    expect(camera.traveling).toBe(true);
  });
  it("procedural layouts are repeatable", () => {
    const a = seededRandom(),
      b = seededRandom();
    expect(Array.from({ length: 100 }, a)).toEqual(
      Array.from({ length: 100 }, b),
    );
  });
});

it("settles a normal move and preserves the active arrival return state in still mode", () => {
  const camera = new CameraDirector();
  camera.visit("orbit");
  camera.update(3);
  camera.settleForStill();
  expect(camera.zone).toBe("orbit");
  expect(camera.traveling).toBe(false);
  camera.visit("garden");
  camera.update(3);
  camera.beginArrival(false);
  camera.update(2);
  camera.settleForStill();
  expect(camera.traveling).toBe(false);
  camera.endArrival(true);
  camera.settleForStill();
  expect(camera.zone).toBe("garden");
  expect(camera.traveling).toBe(false);
});

it("restores only a route allowed by the latest owner playlist", () => {
  for (const traveling of [false, true]) {
    const director = new CameraDirector();
    if (traveling) director.visit("expressions");
    director.beginArrival(false);
    director.setPlaylist(traveling ? ["heart", "expressions"] : ["heart"]);
    director.endArrival(true);
    expect(director.zone).toBe(traveling ? "expressions" : "heart");
    expect(director.destination).toBe(director.zone);
    expect(director.traveling).toBe(false);
  }
});

it("returns smoothly to an enabled viewpoint when the playlist changes before or during return", () => {
  for (const duringReturn of [false, true]) {
    const camera = new CameraDirector();
    camera.beginArrival(false);
    camera.update(5);
    if (duringReturn) {
      camera.endArrival(false);
      camera.update(2);
    }
    const before = camera.position.clone();
    camera.setPlaylist(["heart"]);
    expect(camera.position.equals(before)).toBe(true);
    camera.endArrival(false);
    let maximumStep = 0;
    for (let frame = 0; frame < 361; frame++) {
      const previous = camera.position.clone();
      camera.update(1 / 60, false);
      maximumStep = Math.max(maximumStep, previous.distanceTo(camera.position));
    }
    expect(maximumStep).toBeLessThan(0.5);
    expect(camera.zone).toBe("heart");
    expect(camera.position.toArray()).toEqual([...ZONES[1].eye]);
    expect(camera.traveling).toBe(false);
  }
});
