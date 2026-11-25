import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { homedir } from "node:os";
import * as T from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { beforeAll, describe, expect, it } from "vitest";

/* Plan 01 Section 3: the two lamb hosts, Peace and Joy, as the 3D Studio writes them
 * (scripts/pieces/hosts.py). This loads the real files with three's own GLTFLoader and Draco
 * decoder, and plays every clip through an AnimationMixer. Section 5 copies them into
 * public/world-kit/v1/hosts/ and adds the `host` budget class; until then the test reads them
 * from the studio (HOSTS_KIT_DIR overrides). */

const CLIPS = [
  "fly_idle", "fly_forward", "turn_left", "turn_right", "wave", "point", "bow", "cheer", "giggle",
  "carry_bubble", "present_bubble", "talk_a", "talk_e", "talk_o", "talk_closed",
] as const;
const TALK = new Set<string>(["talk_a", "talk_e", "talk_o", "talk_closed"]);
const BONES = [
  "root", "hips", "spine", "chest", "neck", "head",
  "upper_arm_L", "lower_arm_L", "hand_L", "upper_arm_R", "lower_arm_R", "hand_R",
  "upper_leg_L", "lower_leg_L", "foot_L", "upper_leg_R", "lower_leg_R", "foot_R",
  "wing_L", "wing_R", "ear_L", "ear_R", "jaw", "eye_L", "eye_R",
];
const BUDGET = { vertices: 20_000, bytes: 400_000 };
const HEIGHT = 0.9;

const CANDIDATES = [
  process.env.HOSTS_KIT_DIR,
  path.resolve("public/world-kit/v1/hosts"),
  path.join(homedir(), "Projects/mothers-love-world/studio/kit/world/hosts"),
  path.join(homedir(), "Projects/mothers-love-world/lanes/hosts/kit/world/hosts"),
].filter((dir): dir is string => !!dir);
const KIT = CANDIDATES.find(dir => existsSync(path.join(dir, "peace.glb")) && existsSync(path.join(dir, "joy.glb")));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** three's DRACOLoader decodes in a Web Worker; this runs the same decode in process with the
 * asm.js decoder three ships, so Node can read the kit's Draco meshes. */
class NodeDracoLoader extends DRACOLoader {
  constructor(private draco: Loose) { super(); }
  preload() { return this; }
  decodeGeometry(buffer: ArrayBuffer, taskConfig: Loose): Promise<T.BufferGeometry> {
    const draco = this.draco;
    const decoder = new draco.Decoder();
    const array = new Int8Array(buffer);
    const mesh = new draco.Mesh();
    const status = decoder.DecodeArrayToMesh(array, array.byteLength, mesh);
    if (!status.ok() || mesh.ptr === 0) throw new Error(`Draco decode failed: ${status.error_msg()}`);
    const types: Record<string, number> = {
      Float32Array: draco.DT_FLOAT32, Int8Array: draco.DT_INT8, Int16Array: draco.DT_INT16, Int32Array: draco.DT_INT32,
      Uint8Array: draco.DT_UINT8, Uint16Array: draco.DT_UINT16, Uint32Array: draco.DT_UINT32,
    };
    const geometry: { index: { array: Uint32Array; itemSize: number } | null; attributes: Loose[] } = { index: null, attributes: [] };
    for (const name in taskConfig.attributeIDs) {
      const typeName: string = taskConfig.attributeTypes[name];
      const Type = (globalThis as Loose)[typeName];
      const attribute = decoder.GetAttributeByUniqueId(mesh, taskConfig.attributeIDs[name]);
      const components = attribute.num_components();
      const count = mesh.num_points() * components;
      const bytes = count * Type.BYTES_PER_ELEMENT;
      const ptr = draco._malloc(bytes);
      decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, types[typeName], bytes, ptr);
      const out: Loose = { name, array: new Type(draco.HEAPF32.buffer, ptr, count).slice(), itemSize: components };
      if (name === "color") out.vertexColorSpace = taskConfig.vertexColorSpace;
      draco._free(ptr);
      geometry.attributes.push(out);
    }
    const faces = mesh.num_faces() * 3;
    const ptr = draco._malloc(faces * 4);
    decoder.GetTrianglesUInt32Array(mesh, faces * 4, ptr);
    geometry.index = { array: new Uint32Array(draco.HEAPF32.buffer, ptr, faces).slice(), itemSize: 1 };
    draco._free(ptr);
    draco.destroy(mesh);
    draco.destroy(decoder);
    return Promise.resolve((this as Loose)._createGeometry(geometry));
  }
}

async function dracoModule(): Promise<Loose> {
  // The decoder is a CommonJS script inside three's ES module package, so evaluate it as one.
  const require = createRequire(import.meta.url);
  const file = require.resolve("three/examples/jsm/libs/draco/gltf/draco_decoder.js");
  const commonjs = { exports: {} as Loose };
  new Function("module", "exports", "require", "__filename", "__dirname", readFileSync(file, "utf8"))(
    commonjs, commonjs.exports, require, file, path.dirname(file));
  const factory = commonjs.exports;
  return new Promise(resolve => { factory({ onModuleLoaded: (module: Loose) => resolve(module) }); });
}

async function load(file: string, draco: Loose): Promise<GLTF> {
  const bytes = readFileSync(file);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const loader = new GLTFLoader();
  loader.setDRACOLoader(new NodeDracoLoader(draco));
  return new Promise((resolve, reject) => loader.parse(buffer, "", resolve, reject));
}

function skinnedMeshes(root: T.Object3D) {
  const out: T.SkinnedMesh[] = [];
  root.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) out.push(o as T.SkinnedMesh); });
  return out;
}

/** Every bone's local transform, flattened, to tell whether a clip moved anything. */
function pose(bones: T.Object3D[]) {
  return bones.flatMap(b => [...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()]);
}

describe.skipIf(!KIT)("the lamb hosts, Peace and Joy (Plan 01 Section 3)", () => {
  const lambs = new Map<string, GLTF>();
  beforeAll(async () => {
    const draco = await dracoModule();
    for (const name of ["peace", "joy"]) lambs.set(name, await load(path.join(KIT!, `${name}.glb`), draco));
  }, 60_000);

  for (const name of ["peace", "joy"]) {
    it(`${name}: fits the host budget, one skeleton with every host bone, 0.9 m tall`, () => {
      const gltf = lambs.get(name)!;
      const bytes = statSync(path.join(KIT!, `${name}.glb`)).size;
      const meshes = skinnedMeshes(gltf.scene);
      const vertices = meshes.reduce((sum, mesh) => sum + mesh.geometry.getAttribute("position").count, 0);
      console.log(`HOSTS_GLB ${name} vertices=${vertices}/${BUDGET.vertices} bytes=${bytes}/${BUDGET.bytes} from ${KIT}`);
      expect(meshes.length).toBeGreaterThan(0);
      expect(vertices).toBeLessThanOrEqual(BUDGET.vertices);
      expect(bytes).toBeLessThanOrEqual(BUDGET.bytes);
      expect(gltf.scene.getObjectByName("host_rig")).toBeDefined();
      const skeletons = new Set(meshes.map(mesh => mesh.skeleton));
      expect(skeletons.size).toBe(1);
      const bones = [...skeletons][0].bones.map(b => b.name);
      for (const bone of BONES) expect(bones).toContain(bone);
      // The bubble socket does not deform, so it is a plain node under the root.
      expect(gltf.scene.getObjectByName("bubble")).toBeDefined();
      // The bind pose stands 0.9 m tall, soles on the ground (glTF is Y up).
      gltf.scene.updateMatrixWorld(true);
      const box = new T.Box3();
      for (const mesh of meshes) {
        mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld));
      }
      expect(box.max.y - box.min.y).toBeCloseTo(HEIGHT, 2);
      expect(box.min.y).toBeCloseTo(0, 2);
      // The skin carries its cream and the blush as vertex colours.
      expect(meshes.some(mesh => mesh.geometry.getAttribute("color"))).toBe(true);
    });

    it(`${name}: has every clip by its fixed name, and the mixer plays each one`, () => {
      const gltf = lambs.get(name)!;
      expect(gltf.animations.map(clip => clip.name).sort()).toEqual([...CLIPS].sort());
      const nodes: T.Object3D[] = [];
      gltf.scene.traverse(o => { if (BONES.includes(o.name) || o.name === "bubble") nodes.push(o); });
      const mixer = new T.AnimationMixer(gltf.scene);
      for (const clip of gltf.animations) {
        mixer.stopAllAction();
        const action = mixer.clipAction(clip);
        action.reset().play();
        const samples: number[][] = [];
        for (const t of [0, 0.25, 0.5, 0.75, 1].map(f => f * clip.duration * 0.999)) {
          mixer.setTime(t);
          gltf.scene.updateMatrixWorld(true);
          samples.push(pose(nodes));
        }
        for (const sample of samples) expect(sample.every(Number.isFinite), `${clip.name} gives finite bones`).toBe(true);
        if (TALK.has(clip.name)) {
          // A talk shape is a held mouth: the jaw differs from the bind pose all through it.
          const jaw = gltf.scene.getObjectByName("jaw")!;
          expect(Math.abs(jaw.scale.z - 1) > 0.02 || Math.abs(jaw.scale.x - 1) > 0.02, `${clip.name} shapes the mouth`).toBe(true);
        } else {
          const moved = samples.some(sample => sample.some((value, i) => Math.abs(value - samples[0][i]) > 1e-4));
          expect(moved, `${clip.name} moves the lamb`).toBe(true);
        }
        action.stop();
        mixer.uncacheAction(clip);
      }
    });

    it(`${name}: layers a talk shape over a flying clip (talk clips touch only the jaw)`, () => {
      const gltf = lambs.get(name)!;
      const byName = new Map(gltf.animations.map(clip => [clip.name, clip]));
      for (const clip of TALK) {
        const tracks = byName.get(clip)!.tracks.map(track => track.name.split(".")[0]);
        expect(new Set(tracks)).toEqual(new Set(["jaw"]));
      }
      for (const clip of CLIPS.filter(c => !TALK.has(c))) {
        expect(byName.get(clip)!.tracks.some(track => track.name.startsWith("jaw."))).toBe(false);
      }
      const mixer = new T.AnimationMixer(gltf.scene);
      mixer.clipAction(byName.get("fly_idle")!).play();
      mixer.clipAction(byName.get("talk_a")!).play();
      mixer.setTime(0.3);
      const jaw = gltf.scene.getObjectByName("jaw")!;
      const wing = gltf.scene.getObjectByName("wing_L")!;
      expect(jaw.scale.z).toBeGreaterThan(1.2);
      const flapping = wing.quaternion.clone();
      mixer.setTime(0.5);
      expect(wing.quaternion.angleTo(flapping)).toBeGreaterThan(0.01);
      mixer.stopAllAction();
    });
  }
});
