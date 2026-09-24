import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as T from "three";
import type { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadWorldKit, type KitIO, type WorldKit } from "../../src/components/display/world/kit/kit-loader";
import type { KitAssetId } from "../../src/components/display/world/kit/kit-manifest";
import {
  MEDALLION_ORB_RADIUS,
  MEDALLION_VEIL_OPACITY,
  PEARL_FILM_INNER,
  PEARL_FILM_OUTER,
  PEARL_KIT_MEDALLIONS,
  PEARL_KIT_ORBIT,
  PEARL_KIT_PEARL,
  PEARL_KIT_SPARKLE,
  PEARL_RIM_BEAD_STRIDE,
  PEARL_SHELL_RADIUS,
  PEARL_STAR_AIR,
  PEARL_WIRE_RADIUS,
  STUDY_CAPTION_SIZE,
  StudyPearlAssets,
  StudyPearlSkin,
  buildPearlKitParts,
  paintStudyPearl,
  type StudyPearlFrame,
  type StudyPearlKit,
} from "../../src/components/display/world/art/pearl-skin";
import { SAMPLE_RECOGNITIONS, WORLD_EXPRESSIONS } from "../../src/components/display/world/world-data";
import { wrapBubbleText } from "../../src/components/display/world/world-recognitions";
import type { Recognition } from "@/lib/contracts";

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
  it("hides the ring bead and every medallion glint when the sparkle effect is off", () => {
    const { skin, named } = build();
    skin.update(3, [1, 2], true, { ...wide, sparkles: false });
    expect(named("pearl bead").visible).toBe(false);
    for (const id of [1, 2, 9]) expect(named(`pearl glint ${id}`).visible).toBe(false);
    skin.update(3, [1, 2], true, wide);
    expect(named("pearl bead").visible).toBe(true);
    for (const id of [1, 2, 9]) expect(named(`pearl glint ${id}`).visible).toBe(true);
    skin.dispose();
  });
  it("leaves the ring bead to a resident, and travels it around the gold ring", () => {
    const { skin, named } = build();
    skin.update(3, [1], false, wide);
    expect(named("pearl bead").visible).toBe(false);
    skin.update(0, [1], true, wide);
    const bead = named("pearl bead") as T.Points;
    const start = Array.from(
      (bead.geometry.getAttribute("position") as T.BufferAttribute).array,
    );
    skin.update(4, [1], true, wide);
    const later = Array.from(
      (bead.geometry.getAttribute("position") as T.BufferAttribute).array,
    );
    expect(later).not.toEqual(start);
    // Five points, all of them on the outer orbit lane, so none crosses the wording.
    expect(start).toHaveLength(15);
    for (let i = 0; i < 5; i++) {
      const radius = Math.hypot(later[i * 3], later[i * 3 + 1]);
      expect(radius).toBeGreaterThan(1.2);
      expect(radius).toBeLessThan(1.45);
    }
    // The same clock gives the same places, so a still frame is reproducible.
    skin.update(4, [1], true, wide);
    expect(
      Array.from((bead.geometry.getAttribute("position") as T.BufferAttribute).array),
    ).toEqual(later);
    skin.dispose();
  });
  it("flashes each medallion glint briefly and out of step with its neighbours", () => {
    const { skin, named } = build();
    const opacities = new Set<number>();
    let bright = 0, dim = 0;
    for (let time = 0; time < 40; time += 0.25) {
      skin.update(time, [1, 2, 3], true, wide);
      const glint = named("pearl glint 1") as T.Sprite;
      opacities.add(glint.material.opacity);
      if (glint.material.opacity > 0.4) bright++; else dim++;
      expect(glint.material.opacity).toBeLessThanOrEqual(0.9);
      expect(glint.material.opacity).toBeGreaterThanOrEqual(0);
    }
    expect(bright).toBeGreaterThan(0);
    // A catch of light, not a lamp: the glint is dark for most of its cycle.
    expect(dim).toBeGreaterThan(bright * 5);
    skin.update(2, [1, 2, 3], true, wide);
    const one = (named("pearl glint 1") as T.Sprite).material.opacity;
    const two = (named("pearl glint 2") as T.Sprite).material.opacity;
    expect(one).not.toBe(two);
    expect(opacities.size).toBeGreaterThan(10);
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
  it("lifts the rim, the halo, the sparkles, the bead and the glints into the glow layer without leaving the world", () => {
    const { skin } = build();
    for (const name of ["pearl glass", "pearl halo", "pearl sparkles", "pearl bead", "pearl glint 1", "pearl glint 9"]) {
      expect(skin.layerMask(name)).toBe(WORLD_AND_GLOW);
    }
    skin.dispose();
  });
  /**
   * The words themselves live on the host slot's face mesh, which the skin is handed as a
   * sibling. Nothing the skin does may ever move that mesh onto the glow layer, or the
   * radiance pass would blur the wording.
   */
  it("never touches the host slot's text face", () => {
    const parent = new T.Group();
    const face = new T.Mesh(new T.CircleGeometry(1, 8), new T.MeshBasicMaterial());
    face.name = "slot face";
    parent.add(face);
    const skin = new StudyPearlSkin(parent, studyAssets(), 2);
    for (const time of [0, 2.5, 9]) {
      skin.update(time, [1, 2, 3], true, wide);
      expect(face.layers.mask).toBe(ONLY_WORLD);
      skin.update(time, [1, 2, 3], false, wide);
      expect(face.layers.mask).toBe(ONLY_WORLD);
    }
    skin.clear();
    expect(face.layers.mask).toBe(ONLY_WORLD);
    skin.dispose();
    expect(parent.children).toEqual([face]);
    face.geometry.dispose();
    face.material.dispose();
  });
  /** The protect mask is the pearl being read and nothing else, at layers 1 and 3 exactly. */
  it("puts the occluder on the glow and protect layers only, and only while it is read", () => {
    const { skin } = build();
    skin.update(1, [4], true, wide);
    expect(skin.layerMask("pearl occluder")).toBe(GLOW_AND_PROTECT);
    skin.update(1, [4], false, wide);
    expect(skin.layerMask("pearl occluder")).toBe(ONLY_GLOW);
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

/**
 * The face painter against a recording 2D context: every string it writes, with its font and
 * place. Only sizes may change on the frozen layout, never where a line stands.
 */
function paintedFace(message: string, pages = 1, page = 0) {
  const writes: { text: string; font: string; x: number; y: number }[] = [];
  let font = "";
  const gradient = { addColorStop() {} };
  const context = new Proxy({} as Record<string, unknown>, {
    get(_, key) {
      if (key === "font") return font;
      if (key === "fillText") return (text: string, x: number, y: number) => writes.push({ text, font, x, y });
      if (key === "measureText") return (text: string) => ({ width: text.length * (Number(/(\d+(\.\d+)?)px/.exec(font)?.[1]) || 10) * .5 });
      if (key === "createRadialGradient" || key === "createLinearGradient") return () => gradient;
      return () => undefined;
    },
    set(_, key, value) { if (key === "font") font = value; return true; },
  });
  const canvas = { width: 2048, height: 2048, getContext: () => context } as unknown as HTMLCanvasElement;
  // A fictional sample record, shaped as the app hands it to the painter.
  const record = { id: "sample-face", recipient: SAMPLE_RECOGNITIONS[0].name, message, expressionIds: [SAMPLE_RECOGNITIONS[0].expressionId] } as unknown as Recognition;
  paintStudyPearl(canvas, record, message, page, pages, wrapBubbleText);
  return { writes, record };
}

describe("study pearl face", () => {
  it("keeps the frozen layout: the heart, the caption, Thank you, at the top, then the name and the words", () => {
    const { writes, record } = paintedFace(SAMPLE_RECOGNITIONS[0].message);
    const at = (text: string) => writes.find(item => item.text === text)!;
    expect(writes[0].text).toBe("\u2661");
    expect(at("A KINDNESS WORTH RECOGNIZING").y).toBe(169);
    expect(at("Thank you,").y).toBe(217);
    expect(writes.findIndex(item => item.text === "Thank you,")).toBe(2);
    expect(writes[3].text.length).toBeGreaterThan(0);
    expect(record.recipient.startsWith(writes[3].text)).toBe(true);
    expect(at("Thank you,").y).toBeLessThan(writes[3].y);
    expect(at("RECOGNIZED WITH LOVE").y).toBe(889);
    for (const item of writes) expect(item.x).toBe(512);
  });
  it("draws the two small caps lines a fifth larger than D2's 18 and 17, and nothing else larger", () => {
    expect(STUDY_CAPTION_SIZE.top).toBeCloseTo(18 * 1.2, 6);
    expect(STUDY_CAPTION_SIZE.bottom).toBeCloseTo(17 * 1.2, 6);
    const single = paintedFace(SAMPLE_RECOGNITIONS[0].message).writes;
    expect(single.find(item => item.text === "A KINDNESS WORTH RECOGNIZING")!.font).toBe(`${STUDY_CAPTION_SIZE.top}px Arial, sans-serif`);
    expect(single.find(item => item.text === "RECOGNIZED WITH LOVE")!.font).toBe(`${STUDY_CAPTION_SIZE.bottom}px Arial, sans-serif`);
    expect(single.find(item => item.text === "Thank you,")!.font).toBe("italic 63px Georgia, serif");
    const paged = paintedFace(SAMPLE_RECOGNITIONS[0].message, 3, 1).writes;
    const footer = paged[paged.length - 1];
    expect(footer.text.startsWith("2 OF 3")).toBe(true);
    expect(footer.font).toBe(`${STUDY_CAPTION_SIZE.bottom}px Arial, sans-serif`);
    expect(footer.y).toBe(889);
  });
});

/*
 * Plan 26 K1: the 3D Studio kit on the pearl, proven on the real kit files.
 *
 * The kit is loaded here exactly as the browser loads it (the same manifest, the same
 * `loadWorldKit`, the same GLTFLoader), with one stand in: the Draco decode runs on the
 * decoder the sync script copied into `public/world-kit/draco/`, called directly in Node,
 * because DRACOLoader needs Web Workers.
 */
const KIT_BASE_DIR = new URL("../../public/world-kit/v1/", import.meta.url).pathname;
const DRACO_DECODER = new URL("../../public/world-kit/draco/draco_decoder.js", import.meta.url).pathname;
const RECOGNITION_IDS = [
  PEARL_KIT_PEARL, PEARL_KIT_ORBIT, PEARL_KIT_SPARKLE, ...PEARL_KIT_MEDALLIONS,
] as KitAssetId[];

type DracoModule = Record<string, any>;
let dracoModule: Promise<DracoModule> | undefined;
function nodeDraco() {
  dracoModule ??= (createRequire(import.meta.url)(DRACO_DECODER) as () => Promise<DracoModule>)();
  return dracoModule;
}
/** The one DRACOLoader method GLTFLoader calls, decoded synchronously in Node. */
function nodeDracoLoader(draco: DracoModule) {
  return {
    preload() { return this; },
    dispose() {},
    decodeDracoFile(buffer: ArrayBuffer, done: (geometry: T.BufferGeometry) => void, ids: Record<string, number>, _types: unknown, _space: unknown, fail?: (error: unknown) => void) {
      const decoder = new draco.Decoder(), input = new draco.DecoderBuffer(), mesh = new draco.Mesh();
      try {
        const bytes = new Int8Array(buffer);
        input.Init(bytes, bytes.byteLength);
        const status = decoder.DecodeBufferToMesh(input, mesh);
        if (!status.ok()) throw new Error(status.error_msg());
        const geometry = new T.BufferGeometry();
        const faces = mesh.num_faces(), face = new draco.DracoInt32Array();
        const index = new Uint32Array(faces * 3);
        for (let f = 0; f < faces; f++) {
          decoder.GetFaceFromMesh(mesh, f, face);
          index[f * 3] = face.GetValue(0); index[f * 3 + 1] = face.GetValue(1); index[f * 3 + 2] = face.GetValue(2);
        }
        draco.destroy(face);
        geometry.setIndex(new T.BufferAttribute(index, 1));
        for (const [name, id] of Object.entries(ids)) {
          const attribute = decoder.GetAttributeByUniqueId(mesh, id);
          const size = attribute.num_components(), count = mesh.num_points();
          const values = new draco.DracoFloat32Array();
          decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
          const array = new Float32Array(count * size);
          for (let i = 0; i < array.length; i++) array[i] = values.GetValue(i);
          draco.destroy(values);
          geometry.setAttribute(name, new T.BufferAttribute(array, size));
        }
        done(geometry);
      } catch (error) {
        fail?.(error);
      } finally {
        draco.destroy(mesh); draco.destroy(input); draco.destroy(decoder);
      }
    },
  };
}
/** The kit's recognition pieces from `public/world-kit/v1`, through the app's own loader. */
async function realKit(ids: readonly KitAssetId[] = RECOGNITION_IDS) {
  const draco = await nodeDraco();
  const gltf = new GLTFLoader().setDRACOLoader(nodeDracoLoader(draco) as unknown as DRACOLoader);
  const io: KitIO = {
    async fetchJson() { return JSON.parse(readFileSync(`${KIT_BASE_DIR}manifest.json`, "utf8")); },
    async loadModel(url) {
      const bytes = readFileSync(`${KIT_BASE_DIR}${url.replace(/^\/world-kit\/v1\//, "")}`);
      const model = await gltf.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
      return { scene: model.scene, animations: model.animations };
    },
    dispose() {},
  };
  const kit = await loadWorldKit("/world-kit/v1", { ids }, io);
  if (!kit) throw new Error("the real kit did not load");
  return kit;
}

class NodeAssets extends StudyPearlAssets {
  constructor() { super(() => undefined); }
  override icon() { return new T.Texture(); }
}
function dressed(kit: StudyPearlKit | undefined, assets: StudyPearlAssets = new NodeAssets()) {
  const parent = new T.Group();
  const face = new T.Mesh(new T.CircleGeometry(1, 8), new T.MeshBasicMaterial());
  face.name = "slot face";
  parent.add(face);
  let reads = 0;
  const skin = new StudyPearlSkin(parent, assets, 0, () => { reads++; return kit; });
  const named = (name: string) => {
    let found: T.Object3D | undefined;
    parent.traverse((object) => { if (object.name === name) found = object; });
    return found;
  };
  return { parent, face, skin, assets, named, reads: () => reads };
}
/**
 * The draws this pearl adds to the main pass, counted the way three 0.180 decides them:
 * visible down the whole chain, on the camera's layer 0, one per draw group for a material
 * array, nothing for an instanced draw with no instances, and two for a transparent double
 * sided material unless it forces a single pass (`WebGLRenderer.renderObject`).
 */
function mainPassDraws(root: T.Object3D, skip?: T.Object3D) {
  let draws = 0;
  const cost = (material: T.Material) =>
    material.transparent && material.side === T.DoubleSide && !material.forceSinglePass ? 2 : 1;
  const visit = (object: T.Object3D) => {
    if (!object.visible || object === skip) return;
    const drawable = object as T.Mesh & T.InstancedMesh;
    if ((drawable.isMesh || (object as T.Points).isPoints || (object as T.Sprite).isSprite) && object.layers.isEnabled(0)) {
      if (!(drawable.isInstancedMesh && drawable.count === 0)) {
        draws += Array.isArray(drawable.material)
          ? drawable.geometry.groups.reduce((sum, group) => sum + cost((drawable.material as T.Material[])[group.materialIndex ?? 0]), 0)
          : cost(drawable.material as T.Material);
      }
    }
    object.children.forEach(visit);
  };
  visit(root);
  return draws;
}
function planarRadii(geometry: T.BufferGeometry) {
  const p = geometry.getAttribute("position");
  let low = Infinity, high = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i));
    low = Math.min(low, r); high = Math.max(high, r);
  }
  return { low, high };
}

describe("study pearl skin dressed with the 3D Studio kit", () => {
  let kit: WorldKit;
  beforeAll(async () => { kit = await realKit(); }, 60_000);
  afterAll(() => kit?.dispose());

  it("loads every recognition piece it wears from the synced kit", () => {
    expect(kit.missing).toEqual([]);
    for (const id of RECOGNITION_IDS) expect(kit.has(id)).toBe(true);
  });
  it("normalizes the kit shell to the procedural shell's radius, within one percent", () => {
    const parts = buildPearlKitParts(kit);
    expect(parts.facts.shellRadius).toBeDefined();
    expect(Math.abs(parts.facts.shellRadius! - PEARL_SHELL_RADIUS) / PEARL_SHELL_RADIUS).toBeLessThan(.01);
    // The rim and bead band frame the pearl from outside the face: nothing of it lies over the words.
    const rim = planarRadii(parts.rim!);
    expect(rim.low).toBeGreaterThan(1);
    expect(rim.low).toBeCloseTo(parts.facts.rimInner!, 6);
    expect(rim.high).toBeLessThan(1.2);
    parts.dispose();
  });
  it("normalizes the kit medallion orb to the procedural orb radius .196, within one percent", () => {
    const parts = buildPearlKitParts(kit);
    expect(Math.abs(parts.facts.orbRadius! - MEDALLION_ORB_RADIUS) / MEDALLION_ORB_RADIUS).toBeLessThan(.01);
    parts.medallion!.glass.computeBoundingSphere();
    expect(parts.medallion!.glass.boundingSphere!.radius).toBeCloseTo(MEDALLION_ORB_RADIUS, 2);
    parts.dispose();
  });
  it("lays the kit wire on the two procedural lanes, so the travelling beads ride on it", () => {
    const parts = buildPearlKitParts(kit);
    const orbit = parts.orbit!;
    const p = orbit.getAttribute("position");
    // Every wire vertex sits within the wire's own thickness of one of the two lane curves.
    const lanes = [[1.37, 1.26, 0, .38], [1.48, 1.315, 1, -.46]];
    const curve = lanes.map(([rx, ry, phase, roll]) => Array.from({ length: 720 }, (_, j) => {
      const a = (j / 720) * Math.PI * 2;
      return new T.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, Math.sin(a * 2 + phase) * .12 - .08)
        .applyAxisAngle(new T.Vector3(0, 0, 1), roll);
    }));
    const point = new T.Vector3();
    let worst = 0;
    for (let i = 0; i < p.count; i += 7) {
      point.fromBufferAttribute(p, i);
      const nearest = Math.min(...curve.map(lane => Math.min(...lane.map(c => c.distanceTo(point)))));
      worst = Math.max(worst, nearest);
    }
    // The wire is drawn as a hairline and carries no dots (visual review: one bead element per
    // pearl), so every vertex is within the hairline plus the sampled curve's own chord error.
    expect(worst).toBeLessThan(PEARL_WIRE_RADIUS + .008);
    expect(parts.facts.wireRadius).toBeLessThanOrEqual(PEARL_WIRE_RADIUS * 1.0001);
    expect(parts.facts.wireRadiusInFile).toBeGreaterThanOrEqual(parts.facts.wireRadius!);
    // And nothing of the orbit comes near the face.
    expect(planarRadii(orbit).low).toBeGreaterThan(1.1);
    parts.dispose();
  });
  it("gives the travelling beads the kit ring's own pearl and bead sizes, and keeps them clear of the face", () => {
    const parts = buildPearlKitParts(kit);
    // The ring's pearls are .075 and its gold beads .058 kit units, laid at the inner lane's scale.
    const scale = (1.37 + 1.26) / 2 / parts.facts.orbitCentre!;
    expect(parts.beads!.pearl).toBeCloseTo(.075 * scale, 3);
    expect(parts.beads!.gold).toBeCloseTo(.058 * scale, 3);
    parts.dispose();
    const { skin, named } = dressed(kit);
    const scales = (name: string) => {
      const beads = named(name) as T.InstancedMesh;
      const matrix = new T.Matrix4(), place = new T.Vector3(), turn = new T.Quaternion(), size = new T.Vector3();
      return Array.from({ length: beads.count }, (_, slot) => {
        beads.getMatrixAt(slot, matrix);
        matrix.decompose(place, turn, size);
        return { size: size.x * .024, reach: Math.hypot(place.x, place.y) - size.x * .024 };
      });
    };
    for (const time of [0, 11, 40]) {
      skin.update(time, [1], true, wide);
      for (const bead of scales("pearl orbit pearl beads")) {
        expect(bead.size).toBeCloseTo(.075 * scale, 3);
        expect(bead.reach).toBeGreaterThan(1.1);
      }
      for (const bead of scales("pearl orbit gold beads")) expect(bead.size).toBeCloseTo(.058 * scale, 3);
    }
    skin.dispose();
  });
  it("reads the kit once, on the first update, never while the skin is built", () => {
    const { skin, reads } = dressed(kit);
    expect(reads()).toBe(0);
    skin.update(0, [2, 7, 8], true, wide);
    skin.update(1, [2, 7, 8], true, wide);
    skin.update(2, [2, 7, 8], false, wide);
    expect(reads()).toBe(1);
    skin.dispose();
  });
  it("replaces rings 1 and 2, the orbit tubes and the procedural medallion parts, and keeps ring 0", () => {
    const { skin, named, parent } = dressed(kit);
    skin.update(3, [2, 7, 8], true, wide);
    expect(named("pearl kit rim band")!.visible).toBe(true);
    expect(named("pearl ring 0")!.visible).toBe(true);
    expect(named("pearl ring 1")!.visible).toBe(false);
    expect(named("pearl ring 2")!.visible).toBe(false);
    const orbits = named("pearl orbits")!;
    expect(orbits.children.map(child => child.name).sort()).toEqual(
      ["pearl kit orbit", "pearl orbit gold beads", "pearl orbit pearl beads"],
    );
    for (const id of [2, 7, 8]) {
      const medallion = named(`pearl medallion ${id}`)!;
      // The canonical icon disc and the glint stay; the kit supplies the orb and its setting.
      expect(medallion.children.map(child => (child as T.Mesh).isMesh ? "mesh" : "sprite")).toEqual(["mesh", "sprite"]);
      const icon = medallion.children[0] as T.Mesh<T.CircleGeometry, T.MeshBasicMaterial>;
      expect(icon.geometry.parameters.radius).toBeCloseTo(.148, 5);
      expect(icon.position.z).toBeCloseTo(.05, 5);
      expect(icon.material.map).toBeInstanceOf(T.Texture);
    }
    // Rim band, rim pearls, film, orbit, medallion backs, orbs, bezels and stars.
    let meshes = 0;
    parent.traverse(object => { if (object.name.startsWith("pearl kit")) meshes++; });
    expect(meshes).toBe(8);
    skin.dispose();
  });
  it("shows exactly the selected medallions as kit instances, and none when none was selected", () => {
    const { skin, named, parent } = dressed(kit);
    const instances = () => ["pearl kit medallion backs", "pearl kit medallion orbs", "pearl kit medallion bezels"]
      .map(name => { const mesh = named(name) as T.InstancedMesh; return mesh.visible ? mesh.count : 0; });
    skin.update(3, [], true, wide);
    expect(instances()).toEqual([0, 0, 0]);
    skin.update(3, [2, 7, 8], true, wide);
    expect(instances()).toEqual([3, 3, 3]);
    // Each instance sits exactly where its medallion root is, at the root's size.
    const orbs = named("pearl kit medallion orbs") as T.InstancedMesh;
    const matrix = new T.Matrix4(), place = new T.Vector3(), turn = new T.Quaternion(), size = new T.Vector3();
    [2, 7, 8].forEach((id, slot) => {
      orbs.getMatrixAt(slot, matrix);
      matrix.decompose(place, turn, size);
      const root = named(`pearl medallion ${id}`)!;
      expect(place.distanceTo(root.position)).toBeLessThan(1e-6);
      expect(size.x).toBeCloseTo(root.scale.x, 6);
    });
    // Each back takes its expression's canonical tint.
    const backs = named("pearl kit medallion backs") as T.InstancedMesh;
    const tint = new T.Color();
    backs.getColorAt(1, tint);
    const expected = new T.Color(WORLD_EXPRESSIONS.find(item => item.id === 7)!.color).lerp(new T.Color("#fff8ef"), .55);
    expect(tint.getHex()).toBe(expected.getHex());
    skin.update(3, [2, 7, 8], false, wide);
    expect(instances()).toEqual([0, 0, 0]);
    skin.clear();
    expect(instances()).toEqual([0, 0, 0]);
    expect(parent.children.length).toBeGreaterThan(0);
    skin.dispose();
  });
  it("draws a detailed pearl in 15 to 23 main pass calls for one to three medallions", () => {
    const { skin, parent, face } = dressed(kit);
    const counts = [[1], [1, 2], [2, 7, 8]].map(ids => {
      skin.update(3, ids, true, wide);
      return mainPassDraws(parent, face);
    });
    // The rim's pearl beads and the thin film are one draw each since visual review.
    expect(counts).toEqual([18, 20, 22]);
    for (const count of counts) {
      expect(count).toBeGreaterThanOrEqual(15);
      expect(count).toBeLessThanOrEqual(23);
    }
    // A resident is its shell and one gold ring, as before: with the face, three draws.
    skin.update(3, [2, 7, 8], false, wide);
    expect(mainPassDraws(parent, face)).toBe(2);
    expect(mainPassDraws(parent)).toBe(3);
    skin.dispose();
  });
  it("costs fewer draws than the procedural pearl it replaces", () => {
    const plain = dressed(undefined);
    plain.skin.update(3, [2, 7, 8], true, wide);
    const procedural = mainPassDraws(plain.parent, plain.face);
    const kitted = dressed(kit);
    kitted.skin.update(3, [2, 7, 8], true, wide);
    expect(procedural).toBe(27);
    expect(mainPassDraws(kitted.parent, kitted.face)).toBeLessThan(procedural);
    plain.skin.dispose(); kitted.skin.dispose();
  });
  it("strings the rim band as the pearl's one bead element: every other bead, pearl and gold in turn", () => {
    const parts = buildPearlKitParts(kit);
    const { rimBeadsInFile, rimPearlBeads, rimGoldBeads } = parts.facts;
    expect(rimBeadsInFile).toBeGreaterThan(20);
    expect(rimPearlBeads! + rimGoldBeads!).toBe(Math.ceil(rimBeadsInFile! / PEARL_RIM_BEAD_STRIDE));
    expect(Math.abs(rimPearlBeads! - rimGoldBeads!)).toBeLessThanOrEqual(1);
    // The pearls lie in the gold band's own ring, outside the face.
    const pearls = planarRadii(parts.rimPearls!);
    expect(pearls.low).toBeGreaterThan(1);
    expect(pearls.high).toBeLessThan(1.2);
    parts.dispose();
    const { skin, named } = dressed(kit);
    skin.update(3, [2], true, wide);
    const pearlBand = named("pearl kit rim pearls") as T.Mesh;
    const goldBand = named("pearl kit rim band") as T.Mesh;
    // The band's pearls wear the travelling pearls' white pearl, with its specular.
    expect(pearlBand.material).toBe((named("pearl orbit pearl beads") as T.Mesh).material);
    // The gold is solid polished metal, not the translucent medallion rim recipe.
    const gold = goldBand.material as T.MeshPhysicalMaterial;
    expect(gold.metalness).toBe(1);
    expect(gold.roughness).toBeLessThan(.25);
    expect(gold.transparent).toBe(false);
    expect(pearlBand.visible && goldBand.visible).toBe(true);
    skin.update(3, [2], false, wide);
    expect(pearlBand.visible || goldBand.visible).toBe(false);
    skin.dispose();
  });
  it("lays the thin film outside the words, in front of the face and behind the gold setting", () => {
    const { skin, named } = dressed(kit);
    skin.update(3, [2, 7, 8], true, wide);
    const film = named("pearl kit film") as T.Mesh<T.RingGeometry, T.ShaderMaterial>;
    // The words are checked for parity inside .95 of the face radius; the film starts beyond it.
    expect(PEARL_FILM_INNER).toBeGreaterThan(.95);
    expect(film.geometry.parameters.innerRadius).toBe(PEARL_FILM_INNER);
    expect(film.geometry.parameters.outerRadius).toBe(PEARL_FILM_OUTER);
    expect(planarRadii(film.geometry).low).toBeCloseTo(PEARL_FILM_INNER, 6);
    expect(film.position.z).toBeGreaterThan(0);
    // The gold setting's plane is .045 in front of the face.
    expect(film.position.z).toBeLessThan(.045);
    expect(film.material.transparent && !film.material.depthWrite).toBe(true);
    expect(film.layers.mask).toBe(0b0001);
    expect(film.visible).toBe(true);
    skin.update(3, [2, 7, 8], false, wide);
    expect(film.visible).toBe(false);
    skin.dispose();
  });
  it("sees the canonical icon through a pastel veil on the kit orb, and leaves the icon disc as it is", () => {
    const { skin, named } = dressed(kit);
    skin.update(3, [2, 7, 8], true, wide);
    const orbs = named("pearl kit medallion orbs") as T.InstancedMesh;
    const veil = orbs.material as T.MeshPhysicalMaterial;
    expect(veil.opacity).toBe(MEDALLION_VEIL_OPACITY);
    expect(veil.opacity).toBeGreaterThan(.4);
    // A pale warm pastel, so the symbol's own hue still reads through it.
    const hsl = veil.color.getHSL({ h: 0, s: 0, l: 0 });
    expect(hsl.l).toBeGreaterThan(.8);
    const icon = named("pearl medallion 7")!.children[0] as T.Mesh<T.CircleGeometry, T.MeshBasicMaterial>;
    expect(icon.geometry.parameters.radius).toBeCloseTo(.148, 5);
    expect(icon.position.z).toBeCloseTo(.05, 5);
    expect(icon.material.map).toBeInstanceOf(T.Texture);
    skin.dispose();
  });
  it("stands the two lanes and their beads down where the zone draws its own orbits", () => {
    for (const source of [kit, undefined]) {
      const { skin, named } = dressed(source);
      skin.update(3, [2, 7, 8], true, { ...wide, lanes: false });
      expect(named("pearl orbits")!.visible).toBe(false);
      // The medallions and the setting stay.
      expect(named("pearl medallion 7")!.visible).toBe(true);
      if (source) expect(named("pearl kit rim band")!.visible).toBe(true);
      skin.update(3, [2, 7, 8], true, wide);
      expect(named("pearl orbits")!.visible).toBe(true);
      skin.dispose();
    }
  });
  it("shields the arriving pearl's setting and symbols from the glow while it is read, and nothing else", () => {
    const { skin, face, named } = dressed(kit);
    const shielded = ["pearl kit rim band", "pearl kit rim pearls", "pearl kit medallion orbs", "pearl kit medallion bezels"];
    const open = ["pearl kit film", "pearl kit orbit", "pearl kit medallion backs", "pearl kit stars"];
    skin.update(3, [2, 7, 8], true, { ...wide, shield: true });
    for (const name of shielded) expect(named(name)!.layers.isEnabled(3), name).toBe(true);
    for (const name of open) expect(named(name)!.layers.isEnabled(3), name).toBe(false);
    expect(skin.layerMask("pearl occluder")).toBe(0b1010);
    expect(face.layers.mask).toBe(0b0001);
    // The same pearl without the shield, as a resident, and after it is cleared.
    skin.update(4, [2, 7, 8], true, wide);
    for (const name of shielded) expect(named(name)!.layers.isEnabled(3), name).toBe(false);
    skin.update(5, [2, 7, 8], true, { ...wide, shield: true });
    skin.update(6, [2, 7, 8], false, { ...wide, shield: true });
    for (const name of shielded) expect(named(name)!.layers.isEnabled(3), name).toBe(false);
    skin.update(7, [2, 7, 8], true, { ...wide, shield: true });
    skin.clear();
    for (const name of shielded) expect(named(name)!.layers.isEnabled(3), name).toBe(false);
    expect(face.layers.mask).toBe(0b0001);
    skin.dispose();
  });
  it("keeps the layer rules: the face alone, the occluder on 1 and 3 only while read, no kit piece on the protect layer", () => {
    const { skin, face, named, parent } = dressed(kit);
    for (const time of [0, 2.5, 9]) {
      skin.update(time, [1, 2, 3], true, wide);
      expect(face.layers.mask).toBe(0b0001);
      expect(skin.layerMask("pearl occluder")).toBe(0b1010);
      skin.update(time, [1, 2, 3], false, wide);
      expect(face.layers.mask).toBe(0b0001);
      expect(skin.layerMask("pearl occluder")).toBe(0b0010);
    }
    parent.traverse(object => {
      if (object.name.startsWith("pearl kit")) expect(object.layers.isEnabled(3)).toBe(false);
    });
    // The rim band and the orbit wire stay in the world; the orbs, bezels and stars glow, as
    // the procedural balls, rims and bead did.
    expect(named("pearl kit rim band")!.layers.mask).toBe(0b0001);
    expect(named("pearl kit orbit")!.layers.mask).toBe(0b0001);
    for (const name of ["pearl kit medallion orbs", "pearl kit medallion bezels", "pearl kit stars"]) {
      expect(named(name)!.layers.mask).toBe(0b0011);
    }
    expect(named("pearl kit medallion backs")!.layers.mask).toBe(0b0001);
    skin.dispose();
    expect(parent.children).toEqual([face]);
    face.geometry.dispose(); face.material.dispose();
  });
  it("hides the kit stars with the other sparkles, and twinkles them from the clock alone", () => {
    const { skin, named } = dressed(kit);
    const stars = named("pearl kit stars") as T.InstancedMesh | undefined;
    skin.update(3, [1, 2], true, { ...wide, sparkles: false });
    expect(named("pearl kit stars")!.visible).toBe(false);
    skin.update(3, [1, 2], true, wide);
    const lit = named("pearl kit stars") as T.InstancedMesh;
    expect(stars ?? lit).toBe(lit);
    expect(lit.visible).toBe(true);
    const first = Array.from(lit.instanceMatrix.array);
    skin.update(3.4, [1, 2], true, wide);
    expect(Array.from(lit.instanceMatrix.array)).not.toEqual(first);
    skin.update(3, [1, 2], true, wide);
    expect(Array.from(lit.instanceMatrix.array)).toEqual(first);
    // The head of the shimmer is the star now, so the points draw only the four trailing.
    const bead = named("pearl bead") as T.Points;
    expect(bead.geometry.drawRange).toEqual({ start: 1, count: 4 });
    expect((bead.geometry.getAttribute("position") as T.BufferAttribute).count).toBe(5);
    // The head star rides the outer gold ring at the shimmer's own place.
    const head = new T.Matrix4(), place = new T.Vector3();
    lit.getMatrixAt(0, head);
    place.setFromMatrixPosition(head);
    expect(place.x).toBeCloseTo(bead.geometry.getAttribute("position").getX(0), 5);
    expect(place.y).toBeCloseTo(bead.geometry.getAttribute("position").getY(0), 5);
    // Every star stays outside the face.
    for (let k = 0; k < lit.count; k++) {
      lit.getMatrixAt(k, head);
      place.setFromMatrixPosition(head);
      expect(Math.hypot(place.x, place.y)).toBeGreaterThan(1.1);
    }
    skin.update(3, [1, 2], false, wide);
    expect(lit.visible).toBe(false);
    skin.dispose();
  });
  it("keeps every kit star off the canonical symbols for one to nine expressions, landscape and portrait", () => {
    // The live contract allows one to nine expressions (validation.ts, public-feed.ts). The
    // symbols ride their ellipse 360/n degrees apart; the stars must never sit on one.
    const frames: StudyPearlFrame[] = [
      wide, { ...wide, orbitScale: .94 },
      { sparkles: true, portrait: true, orbitScale: 1 }, { sparkles: true, portrait: true, orbitScale: .94 },
    ];
    // Sixty seconds is one whole turn of the ring and three of the head star's lap round it.
    const clocks = Array.from({ length: 240 }, (_, i) => i * .25);
    const matrix = new T.Matrix4(), place = new T.Vector3(), turn = new T.Quaternion(), scale = new T.Vector3(), corner = new T.Vector3();
    const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
    for (const frame of frames) {
      // The ring's ellipse as `update` lays it out, to read each piece's angle on it.
      const rx = (frame.portrait ? 1.06 : 1.36) * frame.orbitScale, ry = (frame.portrait ? 1.44 : 1.28) * frame.orbitScale;
      const angleOf = (x: number, y: number) => Math.atan2(y / ry, x / rx);
      // Four symbols leave every gap star far from any orb, so their sizes there are the unclipped ones.
      const reference = new Map<number, number[]>();
      for (let n = 1; n <= 9; n++) {
        const label = `${frame.portrait ? "portrait" : "landscape"} ${frame.orbitScale}, ${n} symbols`;
        const ids = WORLD_EXPRESSIONS.slice(0, n).map(item => item.id);
        const { skin, named } = dressed(kit);
        // The kit dresses the skin on its first update.
        skin.update(0, ids, true, frame);
        const stars = named("pearl kit stars") as T.InstancedMesh;
        const vertices = stars.geometry.getAttribute("position");
        // The worst of each measure over the whole sweep, in medallion units.
        let headShown = 0, clearance = Infinity, vertexClearance = Infinity, largest = 0, gapRoomAtFour = Infinity;
        let midpointError = 0, sizeDrift = 0, gapsMissed = 0;
        const counts = new Set<number>();
        for (const [sample, time] of clocks.entries()) {
          skin.update(time, ids, true, frame);
          expect(stars.visible).toBe(true);
          counts.add(stars.count);
          const roots = ids.map(id => named(`pearl medallion ${id}`)!);
          const size = roots[0].scale.x;
          const medallionAngles = roots.map(root => angleOf(root.position.x, root.position.y));
          const nearestOrb = (x: number, y: number) =>
            Math.min(...roots.map(root => Math.hypot(x - root.position.x, y - root.position.y))) / size;
          const gaps = new Set<number>();
          const halves: number[] = [];
          for (let k = 0; k < stars.count; k++) {
            stars.getMatrixAt(k, matrix);
            matrix.decompose(place, turn, scale);
            const half = Math.max(scale.x, scale.y) / size;
            halves.push(half);
            largest = Math.max(largest, half);
            if (half > 1e-9) {
              if (k === 0) headShown++;
              // Every star that shows clears every shown orb by its own half size.
              clearance = Math.min(clearance, nearestOrb(place.x, place.y) - MEDALLION_ORB_RADIUS - half);
              // And so does every vertex of it, with the air besides, on a sample of the sweep.
              if (sample % 8 === 0) {
                for (let v = 0; v < vertices.count; v++) {
                  corner.fromBufferAttribute(vertices, v).applyMatrix4(matrix);
                  vertexClearance = Math.min(vertexClearance, nearestOrb(corner.x, corner.y) - MEDALLION_ORB_RADIUS - PEARL_STAR_AIR);
                }
              }
            }
            if (k === 0) continue;
            // A gap star sits exactly halfway between two neighbouring symbols, one star to a gap.
            const offsets = medallionAngles.map(angle => wrap(angleOf(place.x, place.y) - angle));
            midpointError = Math.max(midpointError, Math.abs(Math.min(...offsets.map(Math.abs)) - Math.PI / n));
            const gap = offsets.findIndex(offset => Math.abs(wrap(offset - Math.PI / n)) < 1e-6);
            if (gap < 0) gapsMissed++; else gaps.add(gap);
            if (n === 4) gapRoomAtFour = Math.min(gapRoomAtFour, nearestOrb(place.x, place.y) - MEDALLION_ORB_RADIUS - PEARL_STAR_AIR);
          }
          if (gaps.size !== stars.count - 1) gapsMissed++;
          // A gap star is never clipped: it shows at the size it has with only four symbols.
          if (n === 4) reference.set(sample, halves);
          else if (n > 4) halves.slice(1).forEach((half, k) => { sizeDrift = Math.max(sizeDrift, Math.abs(half - reference.get(sample)![k + 1])); });
        }
        // The head star, and one star per gap up to four.
        expect([...counts], label).toEqual([1 + Math.min(4, n)]);
        expect(largest, label).toBeLessThan(.1);
        expect(clearance, label).toBeGreaterThanOrEqual(0);
        expect(vertexClearance, label).toBeGreaterThanOrEqual(-1e-9);
        expect(midpointError, label).toBeLessThan(1e-6);
        expect(gapsMissed, label).toBe(0);
        expect(sizeDrift, label).toBeLessThan(1e-9);
        // With four symbols no gap star comes near enough to an orb for its size to be touched.
        if (n === 4) expect(gapRoomAtFour, label).toBeGreaterThan(1.5 * .1);
        // The head star dips behind each symbol it passes, but it is not lost behind them.
        expect(headShown / clocks.length, label).toBeGreaterThan(n === 1 ? .9 : .3);
        skin.dispose();
      }
    }
  }, 60_000);
  it("never names a kit object after anything in a recognition; the skin only ever receives ids", () => {
    const { skin, parent } = dressed(kit);
    skin.update(3, [2, 7, 8], true, wide);
    const names: string[] = [];
    parent.traverse(object => names.push(object.name));
    for (const name of names) {
      expect(name === "slot face" || name === "" || /^(pearl |Design study pearl)/.test(name)).toBe(true);
      for (const sample of SAMPLE_RECOGNITIONS) expect(name).not.toContain(sample.name);
    }
    // The whole API surface: a parent, the assets, a seed and a kit getter; then a clock,
    // expression ids, a detail flag and a frame. No record, no name, no message.
    expect(StudyPearlSkin.length).toBe(4);
    expect(skin.update.length).toBe(4);
    skin.dispose();
  });
  it("keeps the procedural piece for whatever the kit lacks", async () => {
    const partial = await realKit([PEARL_KIT_ORBIT, "recognition.medallion-05"]);
    const { skin, named } = dressed(partial);
    skin.update(3, [5], true, wide);
    expect(named("pearl kit rim band")).toBeUndefined();
    expect(named("pearl ring 1")!.visible).toBe(true);
    expect(named("pearl kit orbit")).toBeDefined();
    expect(named("pearl kit medallion orbs")).toBeDefined();
    expect(named("pearl kit stars")).toBeUndefined();
    expect((named("pearl bead") as T.Points).geometry.drawRange.count).toBe(Infinity);
    skin.dispose();
    partial.dispose();
  }, 60_000);
  it("is exactly the procedural skin when the page has no kit", () => {
    const { skin, named, reads } = dressed(undefined);
    skin.update(3, [2, 7, 8], true, wide);
    expect(reads()).toBe(1);
    for (const name of ["pearl kit rim band", "pearl kit orbit", "pearl kit stars", "pearl kit medallion orbs"]) {
      expect(named(name)).toBeUndefined();
    }
    expect(named("pearl ring 2")!.visible).toBe(true);
    expect(named("pearl orbits")!.children).toHaveLength(4);
    expect(named("pearl medallion 7")!.children).toHaveLength(5);
    skin.dispose();
  });
  it("shares the kit geometry between skins and releases it with the assets, not with a skin", () => {
    const assets = new NodeAssets();
    const one = dressed(kit, assets), two = dressed(kit, assets);
    one.skin.update(0, [1], true, wide); two.skin.update(0, [1], true, wide);
    const orbit = (one.named("pearl kit orbit") as T.Mesh).geometry;
    expect((two.named("pearl kit orbit") as T.Mesh).geometry).toBe(orbit);
    let released = 0;
    orbit.addEventListener("dispose", () => released++);
    one.skin.dispose(); two.skin.dispose();
    expect(released).toBe(0);
    assets.dispose();
    expect(released).toBe(1);
  });
  it("places every pose from the clock, so a still frame is reproducible", () => {
    const a = dressed(kit), b = dressed(kit);
    for (const time of [0, 7.25, 31]) {
      a.skin.update(time, [2, 7, 8], true, wide);
      b.skin.update(time, [2, 7, 8], true, wide);
      for (const name of ["pearl kit medallion orbs", "pearl kit stars"]) {
        const left = a.named(name) as T.InstancedMesh, right = b.named(name) as T.InstancedMesh;
        expect(Array.from(left.instanceMatrix.array)).toEqual(Array.from(right.instanceMatrix.array));
      }
    }
    a.skin.dispose(); b.skin.dispose();
  });
});
