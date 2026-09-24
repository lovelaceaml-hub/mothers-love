import { afterEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Scene, Vector3 } from "three";
import {
  WorldRecognitionBubbles,
  wrapBubbleText,
} from "@/components/display/world/world-recognitions";
import { sampleWorldFeed } from "@/components/display/world/world-feed";
import { ARRIVAL_VIEW, ZONES } from "@/components/display/world/world-data";
import type { ArrivalState } from "@/components/display/world/arrival-director";

function setup() {
  const gradient = { addColorStop() {} };
  const context = {
    clearRect() {},
    save() {},
    scale() {},
    restore() {},
    beginPath() {},
    arc() {},
    clip() {},
    fillRect() {},
    stroke() {},
    ellipse() {},
    fillText() {},
    createRadialGradient: () => gradient,
    measureText: (text: string) => ({ width: [...text].length * 25 }),
  };
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  });
  const scene = new Scene();
  const bubbles = new WorldRecognitionBubbles(scene);
  const camera = new PerspectiveCamera(43, 16 / 9, 0.1, 450);
  camera.position.fromArray(ZONES[0].eye);
  camera.lookAt(new Vector3(...ZONES[0].target));
  camera.updateMatrixWorld();
  const records = sampleWorldFeed().records;
  bubbles.setRecords(records);
  const arrival: ArrivalState = {
    phase: "idle",
    id: null,
    age: 0,
    progress: 0,
    waveIndex: 0,
    waveSize: 0,
  };
  const input = {
    time: 0,
    camera,
    zone: "garden" as const,
    selectedId: records[0].id,
    readingAge: 0,
    arrival,
    minimum: 20,
    expressionId: 1,
    still: true,
    sparkles: true,
    trails: true,
  };
  return { scene, bubbles, camera, records, input };
}
afterEach(() => vi.unstubAllGlobals());

describe("recognition objects in the environment", () => {
  it("retains all Unicode text when wrapping, including long unbroken names", () => {
    const text = "A long fictional name 👨‍👩‍👧‍👦 and é " + "遠".repeat(80);
    const lines = wrapBubbleText(
      (value) =>
        [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            value,
          ),
        ].length,
      text,
      12,
    );
    expect(lines.join("")).toBe(text);
    expect(lines.some((line) => line.includes("👨‍👩‍👧‍👦"))).toBe(true);
  });
  it("retains right to left and mixed direction text when wrapping (Plan 24 P7)", () => {
    // Fictional words only: "a good neighbour" and "thank you for your kindness" in Hebrew
    // and Arabic, and an English line that carries both.
    const count = (value: string) =>
      [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].length;
    for (const text of [
      "שכנה טובה, תודה רבה על החסד שלך",
      "جار طيب، شكرا لك على لطفك",
      "Thank you, שכנה טובה, for 3 warm meals and جار طيب too",
    ]) {
      const lines = wrapBubbleText(count, text, 12);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.join("")).toBe(text);
    }
  });
  it("keeps world anchors while camera perspective moves, with depth-tested geometry", () => {
    const { bubbles, camera, input } = setup();
    bubbles.update(input);
    const initial = bubbles.inspect();
    expect(initial.count).toBeGreaterThan(3);
    expect(initial.textures).toBeLessThanOrEqual(19);
    camera.position.x += 4;
    camera.lookAt(new Vector3(...ZONES[0].target));
    camera.updateMatrixWorld();
    bubbles.update(input);
    expect(bubbles.inspect().focused!.position).toEqual(
      initial.focused!.position,
    );
    expect(bubbles.inspect().focused!.screen).not.toEqual(
      initial.focused!.screen,
    );
    const visible = bubbles.hitTargets.filter((face) => face.visible);
    expect(
      visible.every(
        (face) =>
          !Array.isArray(face.material) &&
          face.material.depthTest &&
          face.material.depthWrite,
      ),
    ).toBe(true);
    bubbles.dispose();
  });
  it("uses the portal for arrivals and clears pixels, references and textures on withdrawal", () => {
    const { scene, bubbles, camera, records, input } = setup();
    camera.position.fromArray(ARRIVAL_VIEW.eye);
    camera.lookAt(new Vector3(...ARRIVAL_VIEW.target));
    camera.updateMatrixWorld();
    bubbles.update({
      ...input,
      arrival: {
        ...input.arrival,
        phase: "reading",
        id: records[0].id,
        waveSize: 1,
      },
    });
    expect(bubbles.inspect().arrivalInWorld).toBe(true);
    expect(bubbles.inspect().focused!.position).toEqual([4.138, 12, 19.104]);
    expect(
      bubbles.hitTargets.filter(
        (face) => face.visible && face.userData.recognitionId === records[0].id,
      ),
    ).toHaveLength(1);
    bubbles.update({
      ...input,
      arrival: { ...input.arrival, phase: "return", id: records[0].id },
    });
    expect(bubbles.inspect().arrivalInWorld).toBe(false);
    expect(
      bubbles.hitTargets.some(
        (face) => face.visible && face.userData.recognitionId === records[0].id,
      ),
    ).toBe(true);
    const targets = [...bubbles.hitTargets];
    bubbles.setRecords([]);
    expect(bubbles.inspect().count).toBe(0);
    expect(bubbles.inspect().textures).toBe(0);
    expect(
      targets.every(
        (face) =>
          !face.visible &&
          !face.userData.recognitionId &&
          !Array.isArray(face.material) &&
          !(face.material as { map?: unknown }).map,
      ),
    ).toBe(true);
    bubbles.dispose();
    expect(scene.children).toHaveLength(0);
    expect(bubbles.hitTargets).toHaveLength(0);
  });
});

/**
 * Plan 28 Section 5: the design look is now the default for live recognitions, so its pearl
 * skins and the TV page's main and flowing bubbles must clear as immediately as the classic
 * faces do. Every privacy state (quiet, neutral, disabled, expired, stale, a source switch)
 * reaches the bubbles as an empty record list (`world-engine.ts` `setFeed`).
 */
describe("design look clears every pearl and skin on the privacy path", () => {
  function designSetup(search: string) {
    // A canvas that accepts every drawing call, since the study skin paints far more than the classic face.
    const gradient = { addColorStop() {} };
    const context: Record<string | symbol, unknown> = new Proxy({}, {
      get(target: Record<string | symbol, unknown>, key) {
        if (key in target) return target[key];
        if (key === "measureText") return (text: string) => ({ width: [...text].length * 25, actualBoundingBoxAscent: 20, actualBoundingBoxDescent: 6 });
        if (key === "getImageData") return (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
        if (typeof key === "string" && key.startsWith("create")) return () => gradient;
        return () => undefined;
      },
      set(target: Record<string | symbol, unknown>, key, value) { target[key] = value; return true; },
    });
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => context }),
      // The skin's medallion icons load as images; in Node they simply never arrive.
      createElementNS: () => ({ style: {}, addEventListener() {}, removeEventListener() {} }),
    });
    vi.stubGlobal("window", { location: { search } });
    const scene = new Scene();
    const bubbles = new WorldRecognitionBubbles(scene);
    const camera = new PerspectiveCamera(43, 16 / 9, 0.1, 450);
    camera.position.fromArray(ZONES[0].eye);
    camera.lookAt(new Vector3(...ZONES[0].target));
    camera.updateMatrixWorld();
    const records = sampleWorldFeed().records;
    const arrival: ArrivalState = { phase: "idle", id: null, age: 0, progress: 0, waveIndex: 0, waveSize: 0 };
    const input = {
      time: 0, camera, zone: "garden" as const, selectedId: records[0].id, readingAge: 0, arrival,
      minimum: 20, expressionId: 1, still: true, sparkles: true, trails: true,
      tvLoop: () => 0, tvArrivals: () => 0, destination: "garden" as const, paused: false,
      hold: () => 12,
    };
    return { scene, bubbles, records, input };
  }
  it.each([
    ["the TV page, the /world default", ""],
    ["the explorer", "?view=explore"],
  ])("%s shows live-shaped records, then clears them", (_label, search) => {
    const { scene, bubbles, records, input } = designSetup(search);
    bubbles.setRecords(records, false);
    for (let step = 0; step < 4; step++) bubbles.update({ ...input, time: step * 0.5 });
    expect(bubbles.inspect().count).toBeGreaterThan(0);
    const targets = [...bubbles.hitTargets];
    bubbles.setRecords([], false);
    bubbles.update({ ...input, time: 3 });
    const after = bubbles.inspect();
    expect(after.count).toBe(0);
    expect(after.textures).toBe(0);
    expect(after.focused).toBeUndefined();
    expect(targets.every((face) => !face.visible && !face.userData.recognitionId)).toBe(true);
    // No object anywhere in the scene still names a recognition once the list is empty.
    const named: string[] = [];
    scene.traverse((object) => {
      if (object.visible && object.userData.recognitionId) named.push(object.name || object.type);
    });
    expect(named).toEqual([]);
    bubbles.dispose();
  });
});
