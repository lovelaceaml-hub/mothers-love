import * as T from "three";
import { describe, expect, it } from "vitest";
import { studyPixelRatio } from "../../src/components/display/world/prototype/study-lighting";
import { studyPetal, studyTerrace } from "../../src/components/display/world/prototype/study-geometry";
import { softDot } from "../../src/components/display/world/prototype/study-materials";
import { studyCanopyPuffs } from "../../src/components/display/world/prototype/study-canopy";
import { studyCloudLayout } from "../../src/components/display/world/prototype/study-clouds";
import { ZONES } from "../../src/components/display/world/world-data";
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

describe("study clouds", () => {
  it("lays out the same clouds on every call", () => {
    const first = studyCloudLayout(777), second = studyCloudLayout(777);
    expect(first.sky).toEqual(second.sky);
    expect(first.island).toEqual(second.island);
  });
  it("keeps every island collar puff below its own terrace", () => {
    const { island } = studyCloudLayout(777);
    expect(island.length).toBe(ZONES.length * 7);
    island.forEach((puff, i) => {
      const zone = ZONES[Math.floor(i / 7)];
      expect(puff.y).toBeLessThan(zone.center[1] - 1);
      expect([puff.x, puff.y, puff.z, puff.width, puff.height, puff.alpha, puff.phase].every(Number.isFinite)).toBe(true);
    });
  });
  it("rings the sky tier around the world at the intended distance", () => {
    const { sky } = studyCloudLayout(777);
    expect(sky.length).toBe(28);
    for (const puff of sky) {
      const radius = Math.sqrt(puff.x * puff.x + puff.z * puff.z);
      expect(radius).toBeGreaterThanOrEqual(150);
      expect(radius).toBeLessThanOrEqual(215);
    }
  });
  it("adds a smaller collar for an extra site", () => {
    const { island } = studyCloudLayout(777, [{ center: [4, 2, -8], radius: 9 }]);
    const extra = island.length - ZONES.length * 7;
    expect(extra).toBeGreaterThanOrEqual(3);
    expect(extra).toBeLessThanOrEqual(4);
  });
});

describe("study cotton canopy", () => {
  it("builds a rounded cluster with no stray puff", () => {
    const puffs = studyCanopyPuffs(5);
    expect(puffs.length).toBeGreaterThanOrEqual(13);
    expect(puffs.length).toBeLessThanOrEqual(15);
    for (const puff of puffs) {
      const distance = Math.sqrt(puff.x * puff.x + (puff.y - 4.9) * (puff.y - 4.9) + puff.z * puff.z);
      expect(distance).toBeLessThanOrEqual(2.6);
      expect([puff.x, puff.y, puff.z, puff.r, puff.squash].every(Number.isFinite)).toBe(true);
      expect(puff.r).toBeGreaterThan(0);
      expect(puff.squash).toBeGreaterThanOrEqual(.8);
      expect(puff.squash).toBeLessThanOrEqual(.95);
    }
  });
  it("stays deterministic per seed and differs between seeds", () => {
    expect(studyCanopyPuffs(5)).toEqual(studyCanopyPuffs(5));
    expect(studyCanopyPuffs(5)).not.toEqual(studyCanopyPuffs(6));
  });
});
