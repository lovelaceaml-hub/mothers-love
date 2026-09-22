import * as T from "three";
import { describe, expect, it } from "vitest";
import { studyPixelRatio } from "../../src/components/display/world/prototype/study-lighting";
import { STUDY_RIBBON_PHASE, studyPetal, studyRibbonPoint, studyTerrace } from "../../src/components/display/world/prototype/study-geometry";
import { softDot, studySilk, studyStone } from "../../src/components/display/world/prototype/study-materials";
import { studyLandmarkCloudSites, studyLandmarkLayout } from "../../src/components/display/world/prototype/study-landmarks";
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

describe("study landmark horizon", () => {
  it("lays out the same six landmarks on every call", () => {
    expect(studyLandmarkLayout()).toEqual(studyLandmarkLayout());
    expect(studyLandmarkLayout().length).toBe(6);
  });
  it("keeps every landmark past the connected world, inside the sky, and off every district", () => {
    for (const site of studyLandmarkLayout()) {
      const [x, y, z] = site.center;
      expect(Math.sqrt(x * x + z * z)).toBeGreaterThanOrEqual(150);
      expect(Math.sqrt(x * x + z * z)).toBeLessThanOrEqual(260);
      expect(Math.sqrt(x * x + y * y + z * z)).toBeLessThan(400);
      for (const zone of ZONES) {
        const gap = new T.Vector3(x, y, z).distanceTo(new T.Vector3(zone.center[0], zone.center[1], zone.center[2]));
        expect(gap).toBeGreaterThanOrEqual(70);
      }
      expect(site.radius).toBeGreaterThanOrEqual(9);
      expect(site.radius).toBeLessThanOrEqual(16);
      expect(site.domeRadius).toBeGreaterThanOrEqual(4);
      expect(site.domeRadius).toBeLessThanOrEqual(7);
      expect(site.columns).toBeGreaterThanOrEqual(4);
      expect(site.columns).toBeLessThanOrEqual(6);
      expect(site.arches).toBeGreaterThanOrEqual(1);
      expect(site.arches).toBeLessThanOrEqual(2);
    }
  });
  it("gives every landmark its own cloud collar without disturbing the district collars", () => {
    const layout = studyLandmarkLayout();
    const withLandmarks = studyCloudLayout(777, studyLandmarkCloudSites(layout));
    const plain = studyCloudLayout(777);
    expect(withLandmarks.sky).toEqual(plain.sky);
    expect(withLandmarks.island.slice(0, ZONES.length * 7)).toEqual(plain.island);
    const extra = withLandmarks.island.length - ZONES.length * 7;
    expect(extra).toBeGreaterThanOrEqual(layout.length * 3);
    expect(extra).toBeLessThanOrEqual(layout.length * 4);
  });
});

describe("study island stone and Sanctuary silk", () => {
  it("builds both materials outside a browser, with distinct program keys", () => {
    const stone = studyStone(), silk = studySilk();
    expect(stone).toBeInstanceOf(T.MeshStandardMaterial);
    expect(silk).toBeInstanceOf(T.MeshPhysicalMaterial);
    expect(stone.color.getHexString()).toBe("f3e3da");
    expect(stone.roughness).toBeCloseTo(.86);
    expect(stone.customProgramCacheKey()).toContain("study-stone-v1");
    expect(stone.customProgramCacheKey()).not.toBe(silk.customProgramCacheKey());
    stone.dispose();
    silk.dispose();
  });
  it("injects the underside gradient and the rim into the compiled stone shader", () => {
    const stone = studyStone();
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: "#include <begin_vertex>",
      fragmentShader: "#include <color_fragment>\n#include <opaque_fragment>",
    };
    stone.onBeforeCompile(shader as never, null as never);
    expect(shader.vertexShader).toContain("studyLocalY = position.y");
    expect(shader.vertexShader).toContain("vStoneXZ = position.xz");
    expect(shader.fragmentShader).toContain("smoothstep(-5.9,-1.2,studyLocalY)");
    expect(shader.fragmentShader).toContain("studyRimColor");
    expect(shader.uniforms.studyRimColor).toBeDefined();
    stone.dispose();
  });
});

describe("Sanctuary silk clears the sculpted heart", () => {
  // The heart root sits at (0, 8.7, 0) in the Sanctuary's local space at scale 3.25.
  // The supplied GLB spans x 1.389, y -1.181 to 1.508 and z .827 before that scale, and the
  // root sways up to .35 rad about y, so its axis-aligned footprint reaches about 5.16 wide,
  // 4.9 tall and 4.1 deep. The box below is a conservative superset of that footprint.
  const CENTRE = new T.Vector3(0, 8.7, 0), HALF = new T.Vector3(5.3, 5.0, 4.2), TIMES = [0, 10, 60, 300];
  it("never puts a ribbon vertex inside the heart's bounding box", () => {
    const point = new T.Vector3();
    let closest = Infinity;
    for (const t of TIMES) {
      for (let index = 0; index < 4; index++) {
        for (let i = 0; i <= 400; i++) {
          for (let j = 0; j <= 6; j++) {
            studyRibbonPoint(index, i / 400, j / 6 - .5, t, point);
            expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true);
            closest = Math.min(closest, Math.max(
              Math.abs(point.x - CENTRE.x) - HALF.x,
              Math.abs(point.y - CENTRE.y) - HALF.y,
              Math.abs(point.z - CENTRE.z) - HALF.z,
            ));
          }
        }
      }
    }
    expect(closest).toBeGreaterThan(.2);
  });
  it("starts every ribbon below the heart and ends it above", () => {
    const point = new T.Vector3();
    expect(new Set(STUDY_RIBBON_PHASE).size).toBe(4);
    for (const t of TIMES) {
      for (let index = 0; index < 4; index++) {
        // The heart itself spans y 4.86 to 13.6 in this space (GLB extents at scale 3.25).
        expect(studyRibbonPoint(index, 0, 0, t, point).y).toBeLessThan(4.7);
        expect(studyRibbonPoint(index, 1, 0, t, point).y).toBeGreaterThan(13.7);
      }
    }
  });
});
