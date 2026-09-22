import * as T from "three";
import { describe, expect, it } from "vitest";
import {
  StudyPearlAssets,
  StudyPearlSkin,
  type StudyPearlFrame,
} from "../../src/components/display/world/prototype/pearl-skin";

/**
 * The study pearl skin is plain Three.js object construction, so it needs no
 * document, no canvas and no WebGL context. Only the two texture sources are faked.
 */
function studyAssets() {
  return {
    icon: () => new T.Texture(),
    dot: () => new T.DataTexture(new Uint8Array(4), 1, 1),
    dispose() {},
  } as unknown as StudyPearlAssets;
}
const wide: StudyPearlFrame = { sparkles: true, portrait: false, orbitScale: 1 };

function build() {
  const parent = new T.Group();
  const skin = new StudyPearlSkin(parent, studyAssets(), 0);
  const named = (name: string) => {
    let found: T.Object3D | undefined;
    parent.traverse((object) => {
      if (object.name === name) found = object;
    });
    if (!found) throw new Error(`no study object named ${name}`);
    return found;
  };
  const medallions = () => {
    const found: T.Object3D[] = [];
    parent.traverse((object) => {
      if (object.name.startsWith("pearl medallion ")) found.push(object);
    });
    return found;
  };
  const shown = () =>
    medallions()
      .filter((medallion) => medallion.visible)
      .map((medallion) => Number(medallion.name.split(" ")[2]))
      .sort((a, b) => a - b);
  return { parent, skin, named, medallions, shown };
}

describe("study pearl skin", () => {
  it("shows no canonical symbol when the recognition selected none", () => {
    const { skin, shown, medallions } = build();
    skin.update(0, [], true, wide);
    expect(medallions()).toHaveLength(9);
    expect(shown()).toEqual([]);
    skin.dispose();
  });
  it("shows exactly the canonical symbols the recognition selected", () => {
    const { skin, shown } = build();
    skin.update(3, [2, 7, 8], true, wide);
    expect(shown()).toEqual([2, 7, 8]);
    skin.dispose();
  });
  it("leaves a resident pearl its glass shell and one gold ring", () => {
    const { skin, named, shown } = build();
    skin.update(3, [2, 7, 8], false, wide);
    expect(named("pearl finishing").visible).toBe(false);
    expect(named("pearl halo").visible).toBe(false);
    expect(named("pearl sparkles").visible).toBe(false);
    expect(named("pearl orbits").visible).toBe(false);
    expect(shown()).toEqual([]);
    expect(named("pearl glass").visible).toBe(true);
    expect(named("pearl ring 0").visible).toBe(true);
    expect(named("pearl ring 1").visible).toBe(false);
    expect(named("pearl ring 2").visible).toBe(false);
    skin.dispose();
  });
  it("hides the sparkles when the sparkle effect is off", () => {
    const { skin, named } = build();
    skin.update(3, [1], true, { ...wide, sparkles: false });
    expect(named("pearl sparkles").visible).toBe(false);
    skin.update(3, [1], true, wide);
    expect(named("pearl sparkles").visible).toBe(true);
    skin.dispose();
  });
  it("keeps every symbol inside the frame on a portrait viewport", () => {
    const { skin, medallions } = build();
    // .9 is deliberately below the .94 floor the host clamps to, so this is the harsh case.
    const portrait: StudyPearlFrame = { sparkles: true, portrait: true, orbitScale: 0.9 };
    for (let time = 0; time < 60; time += 1.3) {
      skin.update(time, [1, 2, 3, 4, 5, 6, 7, 8, 9], true, portrait);
      for (const medallion of medallions()) {
        expect(medallion.visible).toBe(true);
        expect(Math.abs(medallion.position.x)).toBeLessThanOrEqual(1.06 * 0.9 + 0.01);
      }
    }
    skin.dispose();
  });
  it("returns the parent group to empty on disposal", () => {
    const { parent, skin } = build();
    skin.update(0, [1], true, wide);
    expect(parent.children.length).toBeGreaterThan(0);
    skin.dispose();
    expect(parent.children).toHaveLength(0);
  });
});

/**
 * Layer membership is what keeps the radiance pass away from the words. The text face itself
 * lives in the host slot and is never touched here, so these assertions cover the skin: the
 * occluder disc is the only object on the protect layer, and nothing that draws over the text
 * ever joins the glow layer.
 */
describe("study pearl radiance layers", () => {
  const ONLY_WORLD = 0b0001;
  const WORLD_AND_GLOW = 0b0011;
  const ONLY_GLOW = 0b0010;
  const GLOW_AND_PROTECT = 0b1010;
  it("keeps the occluder disc off the world layer and off the protect layer until it is read", () => {
    const { skin } = build();
    expect(skin.layerMask("pearl occluder")).toBe(ONLY_GLOW);
    skin.dispose();
  });
  /**
   * The protect pass renders layer 3 alone, so it carries no scene depth. A resident pearl
   * standing behind solid scenery would paint its disc straight through that scenery and cut
   * a blotch out of the glow, so only the pearl being read may join the mask.
   */
  it("admits only the pearl being read to the protect mask", () => {
    const { skin } = build();
    skin.update(3, [1], true, wide);
    expect(skin.layerMask("pearl occluder")).toBe(GLOW_AND_PROTECT);
    skin.update(3, [1], false, wide);
    expect(skin.layerMask("pearl occluder")).toBe(ONLY_GLOW);
    skin.clear();
    expect(skin.layerMask("pearl occluder")).toBe(ONLY_GLOW);
    skin.dispose();
  });
  it("keeps the occluder disc inside the pearl's own rim ring", () => {
    const { skin } = build();
    skin.update(0, [], true, wide);
    expect(skin.radius("pearl occluder")).toBeCloseTo(0.985, 5);
    skin.dispose();
  });
  it("leaves every object that draws over the text on the world layer alone", () => {
    const { skin } = build();
    for (const name of ["pearl finishing", "pearl ring 0", "pearl ring 1", "pearl ring 2", "pearl orbits"]) {
      expect(skin.layerMask(name)).toBe(ONLY_WORLD);
    }
    skin.dispose();
  });
  it("lifts the rim, the halo and the sparkles into the glow layer without leaving the world", () => {
    const { skin } = build();
    for (const name of ["pearl glass", "pearl halo", "pearl sparkles"]) {
      expect(skin.layerMask(name)).toBe(WORLD_AND_GLOW);
    }
    skin.dispose();
  });
  it("drops a resident out of the glow layer and puts the hero back into it", () => {
    const { skin } = build();
    skin.update(3, [1], false, wide);
    expect(skin.layerMask("pearl glass")).toBe(ONLY_WORLD);
    skin.update(3, [1], true, wide);
    expect(skin.layerMask("pearl glass")).toBe(WORLD_AND_GLOW);
    skin.dispose();
  });
  it("keeps the occluder with the face rather than with the detail level", () => {
    const { skin, named } = build();
    skin.update(3, [1], false, wide);
    expect(named("pearl occluder").visible).toBe(true);
    skin.update(3, [1], true, wide);
    expect(named("pearl occluder").visible).toBe(true);
    skin.dispose();
  });
});
