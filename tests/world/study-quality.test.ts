import * as T from "three";
import { describe, expect, it } from "vitest";
import { studyPixelRatio } from "../../src/components/display/world/prototype/study-lighting";
import { studyPetal, studyTerrace } from "../../src/components/display/world/prototype/study-geometry";
import { softDot } from "../../src/components/display/world/prototype/study-materials";
import { STUDY_FOG, STUDY_SKY, STUDY_SUN, STUDY_TONE } from "../../src/components/display/world/prototype/study-palette";

describe("sample study quality", () => {
  it("allows a native 4K image in High", () => {
    expect(studyPixelRatio(3840, 2160, 1, "high", false)).toBe(1);
  });
  it("retains the low pixel budget after automatic downshifting", () => {
    const ratio = studyPixelRatio(3840, 2160, 2, "auto", true);
    expect(3840 * 2160 * ratio * ratio).toBeCloseTo(1_050_000);
  });
  it("limits high-density displays while preserving native phone scale", () => {
    expect(studyPixelRatio(390, 844, 3, "high", false)).toBe(2);
    expect(studyPixelRatio(1920, 1080, 1, "high", false)).toBe(1);
  });
  it("exports usable normals and UVs at every authored petal detail level", () => {
    for (const [columns, rows] of [[20, 12], [10, 6], [6, 4]]) {
      const geometry = studyPetal(columns, rows);
      for (const name of ["position", "normal", "uv", "color"]) {
        expect([...geometry.getAttribute(name).array].every(Number.isFinite)).toBe(true);
      }
      expect(geometry.boundingSphere!.radius).toBeGreaterThan(.5);
      geometry.dispose();
    }
  });
  it("keeps a rounded terrace inside its intended footprint and height", () => {
    const geometry = studyTerrace(10, 10.2, .4);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeCloseTo(.2);
    expect(geometry.boundingBox!.min.y).toBeCloseTo(-.2);
    expect(geometry.boundingBox!.max.x).toBeCloseTo(10.2);
    geometry.dispose();
  });
});

describe("golden hour study palette", () => {
  it("states every sky, fog and sun color as a readable color", () => {
    const hexes = [STUDY_SKY.zenith, STUDY_SKY.mid, STUDY_SKY.horizon, STUDY_FOG.color, STUDY_SUN.color, STUDY_SUN.glow];
    for (const hex of hexes) {
      const color = new T.Color(hex);
      expect([color.r, color.g, color.b].every(Number.isFinite)).toBe(true);
      expect(color.getHexString()).toBe(hex.slice(1));
    }
  });
  it("keeps the haze in front of its far distance", () => {
    expect(STUDY_FOG.near).toBeLessThan(STUDY_FOG.far);
    expect(STUDY_FOG.near).toBeGreaterThan(0);
  });
  it("points the sun along a unit direction that stays above the horizon", () => {
    const [x, y, z] = STUDY_SUN.direction;
    expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(1, 6);
    expect(y).toBeGreaterThan(0);
    expect(STUDY_TONE.exposure).toBeGreaterThan(0);
  });
});

describe("study sparkle dot", () => {
  it("fades from a solid center to nothing at the corner", () => {
    const map = softDot(64);
    expect(map.image.width).toBe(64);
    expect(map.image.height).toBe(64);
    const data = map.image.data as Uint8Array;
    expect(data.length).toBe(64 * 64 * 4);
    expect(data[(32 * 64 + 32) * 4 + 3]).toBe(255);
    expect(data[3]).toBe(0);
    expect(data[(63 * 64 + 63) * 4 + 3]).toBe(0);
    expect([...data].every(Number.isFinite)).toBe(true);
    map.dispose();
  });
  it("uses the requested size", () => {
    const map = softDot();
    expect(map.image.width).toBe(32);
    expect(map.image.data.length).toBe(32 * 32 * 4);
    map.dispose();
  });
});
