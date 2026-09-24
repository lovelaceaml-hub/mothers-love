import * as T from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { studyKit } from "@/components/display/world/prototype/design-mode";
import {
  KIT_TIMEOUT_MS,
  WorldKit,
  loadStudyKit,
  loadWorldKit,
  type KitIO,
  type KitModel,
} from "@/components/display/world/kit/kit-loader";
import { KIT_DECODER_FILES, kitState, type KitAssetId } from "@/components/display/world/kit/kit-manifest";
import { applyKitRemap, createKitRemap, kitMaterialRole } from "@/components/display/world/kit/kit-materials";
import { looping, scrubbed } from "@/components/display/world/kit/kit-clips";
import { kitCorridorSites } from "@/components/display/world/prototype/kit-corridors";

afterEach(() => vi.unstubAllGlobals());

function entry(id: string, group: string, file: string, feature: string) {
  return {
    id, file: `${group}/${file}.glb`, sha256: "a".repeat(64), group, feature, zones: [], size: 1, pivot: "center",
    verts: 24, tris: 12, bytes: 1000, materials: [], clips: [], lod: null, budget: feature === "people" ? "character" : "ordinary",
  };
}
const MANIFEST = {
  version: "v1",
  generatedAt: "2026-09-23T00:36:16-07:00",
  source: { repo: "3d-studio", commit: "b".repeat(40), plan: "docs/PLAN-03-world-kit.md" },
  decoder: { path: "../draco/", files: [...KIT_DECODER_FILES], three: "0.180.0", sha256: Object.fromEntries(KIT_DECODER_FILES.map(name => [name, "c".repeat(64)])) },
  assets: [
    entry("core.pearl", "core", "pearl", "core"),
    entry("landmark.pearl-arch", "landmarks", "pearl-arch", "landmark"),
    entry("people.mother", "people", "mother", "people"),
    entry("recognition.orbit-ring", "recognition", "orbit-ring", "recognition"),
  ],
};

/** A static model: one box per material name, side by side. */
function staticModel(names: string[]): KitModel {
  const scene = new T.Group();
  names.forEach((name, index) => {
    const mesh = new T.Mesh(new T.BoxGeometry(1, 2, 1), new T.MeshStandardMaterial({ name }));
    mesh.position.x = index * 2;
    scene.add(mesh);
  });
  return { scene, animations: [] };
}
/** A skinned model with a two bone skeleton, as a rigged neighbor file would load. */
function skinnedModel(): KitModel {
  const scene = new T.Group();
  const geometry = new T.BoxGeometry(.5, 1.6, .5);
  const count = geometry.getAttribute("position").count;
  geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  geometry.setAttribute("skinWeight", new T.Float32BufferAttribute(Float32Array.from({ length: count * 4 }, (_, i) => (i % 4 ? 0 : 1)), 4));
  const hips = new T.Bone(), hand = new T.Bone();
  hips.name = "hips"; hand.name = "hand.R"; hand.position.y = .8; hips.add(hand);
  const body = new T.SkinnedMesh(geometry, new T.MeshStandardMaterial({ name: "mother_Skin" }));
  body.add(hips);
  body.bind(new T.Skeleton([hips, hand]));
  scene.add(body);
  const clip = new T.AnimationClip("wave", 1, [new T.VectorKeyframeTrack("hand.R.position", [0, 1], [0, .8, 0, 0, 1.2, 0])]);
  return { scene, animations: [clip] };
}

type Plan = Partial<Record<string, KitModel | Error | { after: number; model: KitModel }>>;
function fakeIO(plan: Plan, json: unknown = MANIFEST) {
  const calls: string[] = [];
  const io: KitIO & { calls: string[]; disposed: number } = {
    calls,
    disposed: 0,
    async fetchJson(url) {
      calls.push(url);
      if (json instanceof Error) throw json;
      return JSON.parse(JSON.stringify(json));
    },
    loadModel(url) {
      calls.push(url);
      const step = plan[url.split("/").slice(-2).join("/")];
      if (!step) return Promise.reject(new Error(`404 ${url}`));
      if (step instanceof Error) return Promise.reject(step);
      if ("after" in step) return new Promise(resolve => setTimeout(() => resolve(step.model), step.after));
      return Promise.resolve(step);
    },
    dispose() { io.disposed++; },
  };
  return io;
}
const everything = (): Plan => ({
  "core/pearl.glb": staticModel(["PearlSkin"]),
  "landmarks/pearl-arch.glb": staticModel(["landmark_pearl", "landmark_gold", "landmark_rose"]),
  "people/mother.glb": skinnedModel(),
  "recognition/orbit-ring.glb": staticModel(["OrbitGold"]),
});

describe("world kit loader", () => {
  it("loads every asset from its own origin, recognition first, and reports ready", async () => {
    const io = fakeIO(everything());
    const kit = await loadWorldKit("/world-kit/v1", {}, io);
    expect(kit).toBeInstanceOf(WorldKit);
    expect(io.calls[0]).toBe("/world-kit/v1/manifest.json");
    expect(io.calls.slice(1)).toEqual([
      "/world-kit/v1/recognition/orbit-ring.glb", "/world-kit/v1/landmarks/pearl-arch.glb",
      "/world-kit/v1/core/pearl.glb", "/world-kit/v1/people/mother.glb",
    ]);
    expect(kit!.missing).toEqual([]);
    expect(kit!.loaded).toBe(4);
    expect(kitState(true, kit)).toBe("ready");
    expect(kit!.ids()).toEqual(["recognition.orbit-ring", "landmark.pearl-arch", "core.pearl", "people.mother"]);
    const arch = kit!.asset("landmark.pearl-arch")!;
    expect(arch.skinned).toBe(false);
    expect(arch.height).toBeCloseTo(2, 5);
    expect(kit!.asset("people.mother")!.skinned).toBe(true);
    expect(kit!.asset("people.mother")!.clips.get("wave")?.duration).toBe(1);
  });

  it("keeps a procedural piece for each missing asset: partial", async () => {
    const plan = everything();
    delete plan["landmarks/pearl-arch.glb"];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const kit = await loadWorldKit("/world-kit/v1", {}, fakeIO(plan));
    expect(kit!.missing).toEqual(["landmark.pearl-arch"]);
    expect(kit!.has("landmark.pearl-arch")).toBe(false);
    expect(kit!.has("core.pearl")).toBe(true);
    expect(kitState(true, kit)).toBe("partial");
    expect(() => kit!.instance("landmark.pearl-arch")).toThrow(/not loaded/);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/1 of 4 assets missing \(landmark\.pearl-arch\)/));
  });

  it("yields no kit at all when the decoder fails every asset: failed", async () => {
    const decoder = new Error("THREE.DRACOLoader: decoder did not load");
    const plan: Plan = Object.fromEntries(Object.keys(everything()).map(key => [key, decoder]));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const io = fakeIO(plan);
    const kit = await loadWorldKit("/world-kit/v1", {}, io);
    expect(kit).toBeUndefined();
    expect(kitState(true, kit)).toBe("failed");
    expect(io.disposed).toBe(1);
  });

  it("yields no kit when the manifest is missing or invalid, without loading a model", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const json of [new Error("404"), { ...MANIFEST, assets: [{ ...MANIFEST.assets[0], budget: undefined }] }, { ...MANIFEST, decoder: { ...MANIFEST.decoder, path: "https://www.gstatic.com/draco/" } }]) {
      const io = fakeIO(everything(), json);
      expect(await loadWorldKit("/world-kit/v1", {}, io)).toBeUndefined();
      expect(io.calls).toEqual(["/world-kit/v1/manifest.json"]);
      expect(io.disposed).toBe(1);
    }
  });

  it("stops waiting at the deadline and disposes whatever lands later", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const plan = everything();
    const late = staticModel(["PearlSkin"]);
    const dispose = vi.spyOn((late.scene.children[0] as T.Mesh).geometry, "dispose");
    plan["core/pearl.glb"] = { after: 120, model: late };
    const kit = await loadWorldKit("/world-kit/v1", { timeoutMs: 40 }, fakeIO(plan));
    expect(kit!.missing).toEqual(["core.pearl"]);
    expect(kitState(true, kit)).toBe("partial");
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(dispose).toHaveBeenCalled();
    expect(kit!.has("core.pearl")).toBe(false);
    expect(KIT_TIMEOUT_MS).toBe(15_000);
  });

  it("loads only the ids asked for, and lists an unknown id as missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const io = fakeIO(everything());
    const kit = await loadWorldKit("/world-kit/v1", { ids: ["core.pearl", "nature.rose-bush" as KitAssetId] }, io);
    expect(io.calls.slice(1)).toEqual(["/world-kit/v1/core/pearl.glb"]);
    expect(kit!.ids()).toEqual(["core.pearl"]);
    expect(kit!.missing).toEqual(["nature.rose-bush"]);
  });

  it("refuses any base that is not a same origin path, before fetching anything", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const base of ["//cdn.example/world-kit/v1", "https://cdn.example/world-kit/v1", "world-kit/v1"])
      expect(await WorldKit.load(base), base).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("world kit placements", () => {
  it("instances share geometry with the template and take the remap's materials", async () => {
    const kit = (await loadWorldKit("/world-kit/v1", {}, fakeIO(everything())))!;
    const template = kit.asset("landmark.pearl-arch")!.template;
    const plain = kit.instance("landmark.pearl-arch");
    expect(plain).not.toBe(template);
    expect(plain.userData.kitId).toBe("landmark.pearl-arch");
    const [first] = plain.children as T.Mesh[];
    expect(first.geometry).toBe((template.children[0] as T.Mesh).geometry);
    const ivory = new T.MeshStandardMaterial({ name: "ivory" }), gold = new T.MeshStandardMaterial({ name: "gold" });
    const dressed = kit.instance("landmark.pearl-arch", createKitRemap({ ivory, gold }));
    expect((dressed.children as T.Mesh[]).map(mesh => (mesh.material as T.Material).name)).toEqual(["ivory", "gold", "landmark_rose"]);
    // The template is never touched by a remap.
    expect((template.children[0] as T.Mesh).material).not.toBe(ivory);
  });

  it("clones a skinned asset with its own skeleton", async () => {
    const kit = (await loadWorldKit("/world-kit/v1", {}, fakeIO(everything())))!;
    const original = kit.asset("people.mother")!.template.children[0] as T.SkinnedMesh;
    const clone = kit.instance("people.mother").children[0] as T.SkinnedMesh;
    expect(clone.isSkinnedMesh).toBe(true);
    expect(clone.skeleton).not.toBe(original.skeleton);
    expect(clone.skeleton.bones[1].name).toBe("hand.R");
    expect(clone.skeleton.bones[1]).not.toBe(original.skeleton.bones[1]);
  });

  it("merges a static asset into one cached geometry with a group per material", async () => {
    const kit = (await loadWorldKit("/world-kit/v1", {}, fakeIO(everything())))!;
    const merged = kit.geometry("landmark.pearl-arch");
    expect(kit.geometry("landmark.pearl-arch")).toBe(merged);
    expect(merged.userData.kitMaterials).toEqual(["landmark_pearl", "landmark_gold", "landmark_rose"]);
    expect(merged.groups.map(group => group.materialIndex)).toEqual([0, 1, 2]);
    merged.computeBoundingBox();
    // Three unit boxes two apart, baked into the template's space.
    expect(merged.boundingBox!.min.x).toBeCloseTo(-.5, 5);
    expect(merged.boundingBox!.max.x).toBeCloseTo(4.5, 5);
  });

  it("disposes geometry, imported materials, merges and the decoder once", async () => {
    const io = fakeIO(everything());
    const kit = (await loadWorldKit("/world-kit/v1", {}, io))!;
    const mesh = kit.asset("core.pearl")!.template.children[0] as T.Mesh;
    const geometry = vi.spyOn(mesh.geometry, "dispose"), material = vi.spyOn(mesh.material as T.Material, "dispose");
    const merged = vi.spyOn(kit.geometry("core.pearl"), "dispose");
    kit.dispose();
    kit.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
    expect(merged).toHaveBeenCalledTimes(1);
    expect(io.disposed).toBe(1);
    expect(kit.has("core.pearl")).toBe(false);
  });
});

describe("kit materials", () => {
  it.each([
    ["landmark_pearl", "ivory"], ["OrbitPearl", "ivory"], ["landmark_gold", "gold"], ["Bezel01Gold", "gold"],
    ["PearlRimGold", "gold"], ["Stud09Gold", "gold"], ["PearlGlass", "glass"], ["Orb03Glass", "glass"],
    ["GoldGlow", "keep"], ["PearlHalo", "keep"], ["SparkleGlow", "keep"], ["Flame", "keep"], ["landmark_window", "keep"],
    ["Silk", "silk"], ["landmark_water", "water"], ["PetalPearl", "bloom"], ["Petal", "bloom"],
    ["mother_Skin", "keep"], ["landmark_rose", "keep"], ["stone_base", "stone"], ["leaf_dark", "leaf"], ["lawn", "lawn"],
  ])("%s plays the %s role", (name, role) => {
    expect(kitMaterialRole(name)).toBe(role);
  });

  it("gives a vertex coloured study material a white colour attribute to multiply", () => {
    const root = new T.Group();
    const mesh = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial({ name: "Petal" }));
    root.add(mesh);
    const bloom = new T.MeshPhysicalMaterial({ vertexColors: true });
    applyKitRemap(root, createKitRemap({ bloom }));
    expect(mesh.material).toBe(bloom);
    const color = mesh.geometry.getAttribute("color");
    expect(color.count).toBe(mesh.geometry.getAttribute("position").count);
    expect(Array.from(color.array as Float32Array).every(value => value === 1)).toBe(true);
  });

  it("builds glass per imported material through the palette factory", () => {
    const made: string[] = [];
    const remap = createKitRemap({ glass: imported => { made.push(imported.name); return new T.MeshBasicMaterial({ name: "study glass" }); } });
    expect(remap("PearlGlass", new T.MeshStandardMaterial({ name: "PearlGlass" })).name).toBe("study glass");
    expect(made).toEqual(["PearlGlass"]);
  });
});

describe("kit clips on the world clock", () => {
  const clip = () => new T.AnimationClip("bloom", 2, [new T.VectorKeyframeTrack(".position", [0, 2], [0, 0, 0, 0, 4, 0])]);

  it("scrubs a one shot clip to a fraction, so a frozen clock is a frozen pose", () => {
    const root = new T.Object3D();
    const bloom = scrubbed(root, clip());
    bloom.set(.5);
    expect(root.position.y).toBeCloseTo(2, 5);
    bloom.set(1);
    expect(root.position.y).toBeCloseTo(4, 5);
    bloom.set(-3);
    expect(root.position.y).toBeCloseTo(0, 5);
    bloom.set(Number.NaN);
    expect(root.position.y).toBeCloseTo(0, 5);
    bloom.dispose();
  });

  it("advances a looping clip only by the delta it is given", () => {
    const root = new T.Object3D();
    const mixer = looping(root, clip(), .5);
    expect(root.position.y).toBeCloseTo(0, 5);
    mixer.update(0);
    expect(root.position.y).toBeCloseTo(0, 5);
    mixer.update(1);
    expect(root.position.y).toBeCloseTo(1, 5);
  });
});

describe("kit gate", () => {
  it.each([
    ["?art=design&source=sample", true],
    ["?art=design&source=sample&kit=on", true],
    ["?art=design&source=sample&kit=", true],
    ["?art=design&source=sample&kit=off", false],
  ])("%s dresses the study: %s", (search, expected) => {
    expect(studyKit(search)).toBe(expected);
  });

  it("never loads outside the fictional study or under kit=off", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const search of ["?art=design&source=sample&kit=off", "?art=classic&source=sample", "?art=design&source=live", "?source=sample"]) {
      vi.stubGlobal("window", { location: { search } });
      expect(await loadStudyKit(), search).toBeUndefined();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks this origin for the manifest inside the study, and falls back quietly when it cannot", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => { void input; return new Response("missing", { status: 404 }); });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("window", { location: { search: "?art=design&source=sample" } });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await loadStudyKit({ timeoutMs: 2000 })).toBeUndefined();
    expect(fetch.mock.calls.map(call => String(call[0]))).toContain("/world-kit/v1/manifest.json");
  });

  it("corridor islets exist only when the kit can place them, so a kit without the island leaves the procedural world unchanged", () => {
    expect(kitCorridorSites({ has: () => false })).toEqual([]);
    expect(kitCorridorSites({ has: () => true })).toHaveLength(12);
  });
});
