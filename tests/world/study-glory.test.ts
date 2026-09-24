import * as T from "three";
import { describe, expect, it } from "vitest";
import {
  LANTERN_RAIL_LIFT,
  LANTERN_RAIL_STRIDE,
  StudyWaterHalo,
  WATER_HALO_OPACITY,
  WATER_HALO_SPAN,
  WATER_HALO_Y,
  lanternLayout,
  type LanternPoint,
} from "../../src/components/display/world/art/study-glory";

/** One bridge rail as the world builds it: 49 samples along the curve. */
function rail(offset: number): LanternPoint[] {
  return Array.from({ length: 49 }, (_, i) => [offset + i, 2 + i * 0.05, -i] as LanternPoint);
}

describe("lantern layout", () => {
  it("hangs a lantern on every sixth rail sample and lifts it off the rail", () => {
    const places = lanternLayout([rail(0)], []);
    expect(places).toHaveLength(9 * 3);
    expect(LANTERN_RAIL_STRIDE).toBe(6);
    for (let i = 0; i < 9; i++) {
      const sample = i * LANTERN_RAIL_STRIDE;
      expect(places[i * 3]).toBeCloseTo(sample, 6);
      expect(places[i * 3 + 1]).toBeCloseTo(2 + sample * 0.05 + LANTERN_RAIL_LIFT, 6);
      expect(places[i * 3 + 2]).toBeCloseTo(-sample, 6);
    }
  });
  it("adds every arch keystone unchanged, after the rails", () => {
    const keystones: LanternPoint[] = [[1, 10, 2], [-3, 8.4, 5]];
    const places = lanternLayout([rail(0)], keystones);
    expect(places).toHaveLength((9 + 2) * 3);
    // The buffer is Float32, so the keystones are compared at that precision.
    [1, 10, 2, -3, 8.4, 5].forEach((value, i) => {
      expect(places[27 + i]).toBeCloseTo(value, 5);
    });
  });
  it("lays out the connected world's 26 rails and 51 keystones in one buffer", () => {
    const rails = Array.from({ length: 26 }, (_, i) => rail(i * 100));
    const keystones = Array.from({ length: 51 }, (_, i) => [i, 9, i] as LanternPoint);
    const places = lanternLayout(rails, keystones);
    expect(places).toHaveLength((26 * 9 + 51) * 3);
    expect(places).toHaveLength(285 * 3);
  });
  it("is pure: the same input gives the same buffer every time", () => {
    const rails = [rail(0), rail(40)];
    const keystones: LanternPoint[] = [[0, 1, 2]];
    expect(Array.from(lanternLayout(rails, keystones)))
      .toEqual(Array.from(lanternLayout(rails, keystones)));
  });
  it("returns an empty buffer when there is nothing to light", () => {
    expect(lanternLayout([], [])).toHaveLength(0);
  });
});

function halo() {
  const scene = new T.Scene();
  const instance = new StudyWaterHalo(scene);
  const mesh = scene.getObjectByName("Study water halo")!;
  const camera = new T.PerspectiveCamera();
  return { scene, instance, mesh, camera };
}

describe("water halo under the focal pearl", () => {
  it("joins the world and the glow layers and floats just above the sea", () => {
    const { instance, mesh, camera } = halo();
    expect(mesh.layers.mask).toBe(0b0011);
    instance.update(new T.Vector3(31, 7.3, 18.7), camera, 1);
    expect(mesh.position.y).toBeCloseTo(WATER_HALO_Y, 6);
    expect(WATER_HALO_Y).toBeGreaterThan(-5);
    expect(mesh.position.x).toBeCloseTo(31, 6);
    expect(mesh.position.z).toBeCloseTo(18.7, 6);
    expect(mesh.scale.x).toBe(WATER_HALO_SPAN.across);
    expect(mesh.scale.y).toBe(WATER_HALO_SPAN.along);
    instance.dispose();
  });
  it("stretches its long axis along the line from the pearl out to the viewer", () => {
    const { instance, mesh, camera } = halo();
    const focus = new T.Vector3(0, 7, 0);
    camera.position.set(0, 11, 40);
    instance.update(focus, camera, 1);
    mesh.updateMatrixWorld(true);
    // The plane's local +Y is its long axis; it should point at the camera in plan.
    const along = new T.Vector3(0, 1, 0).transformDirection(mesh.matrixWorld);
    expect(along.y).toBeCloseTo(0, 5);
    expect(along.z).toBeCloseTo(1, 5);
    camera.position.set(-40, 11, 0);
    instance.update(focus, camera, 2);
    mesh.updateMatrixWorld(true);
    along.set(0, 1, 0).transformDirection(mesh.matrixWorld);
    expect(along.x).toBeCloseTo(-1, 5);
    expect(along.y).toBeCloseTo(0, 5);
    instance.dispose();
  });
  it("snaps to its target while the clock is frozen, so a still frame is complete", () => {
    const { instance, mesh, camera } = halo();
    const focus = new T.Vector3(10, 7, -4);
    instance.update(focus, camera, 12);
    instance.update(focus, camera, 12);
    expect(instance.opacity()).toBeCloseTo(WATER_HALO_OPACITY, 6);
    expect(mesh.visible).toBe(true);
    instance.update(undefined, camera, 12);
    expect(instance.opacity()).toBeCloseTo(0, 6);
    expect(mesh.visible).toBe(false);
    instance.dispose();
  });
  it("fades in and out over about six tenths of a second while the clock runs", () => {
    const { instance, camera } = halo();
    const focus = new T.Vector3(0, 7, 0);
    let time = 0;
    instance.update(undefined, camera, time);
    for (let i = 0; i < 6; i++) instance.update(focus, camera, (time += 0.1));
    // Six tenths of a second is one time constant: about 63 percent of the way there.
    expect(instance.opacity()).toBeGreaterThan(WATER_HALO_OPACITY * 0.55);
    expect(instance.opacity()).toBeLessThan(WATER_HALO_OPACITY * 0.72);
    // The fade is exponential, so it approaches its target rather than arriving at it.
    for (let i = 0; i < 30; i++) instance.update(focus, camera, (time += 0.1));
    expect(instance.opacity()).toBeGreaterThan(WATER_HALO_OPACITY * 0.99);
    expect(instance.opacity()).toBeLessThanOrEqual(WATER_HALO_OPACITY);
    instance.dispose();
  });
  it("leaves the scene empty on disposal", () => {
    const { scene, instance } = halo();
    expect(scene.children).toHaveLength(1);
    instance.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
