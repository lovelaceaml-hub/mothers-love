import * as T from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { describe, expect, it } from "vitest";
import {
  bloomTexture,
  glowTargetSize,
  sunScreenWeight,
} from "../../src/components/display/world/prototype/study-radiance";

/**
 * The radiance pass needs a WebGL context, so only its pure parts are proved here, plus the
 * two facts about the installed `UnrealBloomPass` the standalone route depends on. The
 * rendered result is checked by the design harness captures and the text parity comparison.
 */
describe("glow target sizing", () => {
  it("halves the drawing buffer", () => {
    expect(glowTargetSize(1920, 1080)).toEqual({ width: 960, height: 540 });
  });
  it("caps a 4K buffer at 1920 wide and keeps its aspect", () => {
    expect(glowTargetSize(3840, 2160)).toEqual({ width: 1920, height: 1080 });
  });
  it("keeps a portrait phone buffer on its own aspect", () => {
    const size = glowTargetSize(780, 1688);
    expect(size.width).toBe(390);
    expect(size.height / size.width).toBeCloseTo(1688 / 780, 2);
  });
  it("never returns a zero dimension", () => {
    expect(glowTargetSize(1, 1)).toEqual({ width: 1, height: 1 });
    expect(glowTargetSize(0, 0)).toEqual({ width: 1, height: 1 });
  });
});

describe("god ray weight", () => {
  it("is zero when the sun is behind the viewer", () => {
    expect(sunScreenWeight({ x: 0, y: 0 }, -0.2)).toBe(0);
    expect(sunScreenWeight({ x: 0, y: 0 }, 0)).toBe(0);
  });
  it("is full while the sun is inside the frame", () => {
    expect(sunScreenWeight({ x: 0, y: 0 }, 1)).toBe(1);
    expect(sunScreenWeight({ x: 0.8, y: -0.4 }, 0.9)).toBe(1);
  });
  it("fades out instead of snapping off as the sun leaves the frame", () => {
    const inside = sunScreenWeight({ x: 1.1, y: 0 }, 1);
    const further = sunScreenWeight({ x: 1.25, y: 0 }, 1);
    expect(inside).toBeGreaterThan(further);
    expect(further).toBeGreaterThan(0);
    expect(sunScreenWeight({ x: 1.4, y: 0 }, 1)).toBe(0);
    expect(sunScreenWeight({ x: 0, y: -2 }, 1)).toBe(0);
  });
});

describe("the installed UnrealBloomPass the study drives standalone", () => {
  it("leaves its five mip composite in the first horizontal target", () => {
    const pass = new UnrealBloomPass(new T.Vector2(64, 32), 1, 0.6, 0);
    expect(bloomTexture(pass)).toBe(pass.renderTargetsHorizontal[0].texture);
    expect(pass.nMips).toBe(5);
    pass.dispose();
  });
  it("halves the size it is given, so the study passes the glow target dimensions", () => {
    const pass = new UnrealBloomPass(new T.Vector2(64, 32), 1, 0.6, 0);
    pass.setSize(1920, 1080);
    expect(pass.renderTargetsHorizontal[0].width).toBe(960);
    expect(pass.renderTargetsHorizontal[0].height).toBe(540);
    expect(pass.renderTargetBright.width).toBe(960);
    pass.dispose();
  });
});
