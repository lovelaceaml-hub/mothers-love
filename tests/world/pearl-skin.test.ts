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
