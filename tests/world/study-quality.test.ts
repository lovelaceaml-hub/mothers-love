import { describe, expect, it } from "vitest";
import { studyPixelRatio } from "../../src/components/display/world/prototype/study-lighting";
import { studyPetal, studyTerrace } from "../../src/components/display/world/prototype/study-geometry";

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
