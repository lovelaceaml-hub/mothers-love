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
