import * as T from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorldKit, type KitAsset } from "@/components/display/world/kit/kit-loader";
import { KIT_DECODER_FILES, type KitAssetId, type KitManifest, type KitManifestEntry } from "@/components/display/world/kit/kit-manifest";
import {
  NEIGHBOR_CARD_LABEL,
  NEIGHBOR_CAST,
  NEIGHBOR_EXCHANGE,
  NEIGHBOR_FACTS,
  NEIGHBOR_PEOPLE,
  NEIGHBOR_SCALE,
  NEIGHBOR_STAGES,
  NEIGHBOR_STANCE,
  castNeighbor,
  coversFocus,
  createKitNeighbors,
  mergeNeighborRig,
  neighborAssetIds,
  neighborMaterial,
  neighborPlacement,
  neighborStroll,
  neighborWeights,
  paintNeighborCard,
  type CardContext,
} from "@/components/display/world/kit/kit-neighbors";
import {
  NEIGHBOR_BEATS,
  NEIGHBOR_CLIPS,
  NEIGHBOR_CYCLE_SECONDS,
  neighborDialogue,
  neighborSchedule,
  neighborWords,
  type NeighborClip,
} from "@/components/display/world/neighbor-dialogue";
import { WORLD_EXPRESSIONS, ZONES, RECOGNITION_ZONES, type ZoneId } from "@/components/display/world/world-data";
import type { DesignKitContext } from "@/components/display/world/prototype/design-world";

afterEach(() => vi.unstubAllGlobals());

/* A rigged person as GLTFLoader delivers the studio's files: one node of three primitives, each
 * its own SkinnedMesh and material, bound to one 19 bone skeleton with the heart under hand_R. */
const BONES: Record<string, string | null> = {
  root: null, hips: "root", spine: "hips", chest: "spine", neck: "chest", head: "neck",
  upper_arm_L: "chest", lower_arm_L: "upper_arm_L", hand_L: "lower_arm_L",
  upper_arm_R: "chest", lower_arm_R: "upper_arm_R", hand_R: "lower_arm_R",
  upper_leg_L: "hips", lower_leg_L: "upper_leg_L", foot_L: "lower_leg_L",
  upper_leg_R: "hips", lower_leg_R: "upper_leg_R", foot_R: "lower_leg_R", heart: "hand_R",
};
const LENGTHS: Record<NeighborClip, number> = {
  idle: 4, walk: 1, talk: 3, listen: 3.2, wave: 2.4, bow: 2.8, comfort: 3.2, after_you: 2.8,
  encourage: 3, offer_hand: 2.8, cheer: 2.4, give_heart: 3.2, receive_heart: 3.2,
};
/** Each clip turns the hips by its own angle, so a test can read which clip is playing. */
const clipAngle = (clip: NeighborClip) => (NEIGHBOR_CLIPS.indexOf(clip) + 1) * 0.1;
function heartKeys(clip: NeighborClip): [number[], number[]] {
  if (clip === "give_heart") return [[0, 0.233, 0.4, 1.733, 1.933, 3.2], [0.001, 0.001, 1, 1, 0.001, 0.001]];
  if (clip === "receive_heart") return [[0, 1.767, 1.9, 2.667, 2.933, 3.2], [0.001, 0.001, 1, 1, 0.001, 0.001]];
  return [[0, LENGTHS[clip]], [0.001, 0.001]];
}
function riggedModel(person: string, height: number) {
  const scene = new T.Group();
  scene.name = `${person}_rig`;
  const bones = new Map<string, T.Bone>();
  for (const name of Object.keys(BONES)) { const bone = new T.Bone(); bone.name = name; bones.set(name, bone); }
  for (const [name, parent] of Object.entries(BONES)) if (parent) bones.get(parent)!.add(bones.get(name)!);
  bones.get("hips")!.position.y = height * 0.47;
  bones.get("head")!.position.y = height * 0.3;
  bones.get("hand_R")!.position.set(-0.2, -0.3, 0);
  const node = new T.Group();
  node.name = person;
  scene.add(node, bones.get("root")!);
  scene.updateMatrixWorld(true);
  const order = Object.keys(BONES);
  const skeleton = new T.Skeleton(order.map(name => bones.get(name)!));
  const part = (bone: string, size: number, material: T.MeshStandardMaterial) => {
    const geometry = new T.BoxGeometry(size, size, size);
    const count = geometry.getAttribute("position").count;
    const index = order.indexOf(bone);
    geometry.setAttribute("skinIndex", new T.Uint8BufferAttribute(Array.from({ length: count * 4 }, (_, i) => (i % 4 ? 0 : index)), 4));
    geometry.setAttribute("skinWeight", new T.Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => (i % 4 ? 0 : 1)), 4));
    const mesh = new T.SkinnedMesh(geometry, material);
    node.add(mesh);
    mesh.bind(skeleton, new T.Matrix4());
    return mesh;
  };
  part("hips", height * 0.5, new T.MeshStandardMaterial({ name: `${person}_Top`, color: "#ff6f5a", roughness: 0.65 }));
  part("head", height * 0.3, new T.MeshStandardMaterial({ name: `${person}_Skin`, color: "#6b3f2a", roughness: 0.5 }));
  part("heart", 0.1, new T.MeshStandardMaterial({ name: `${person}_Heart`, color: "#e04a6a", roughness: 0.3, emissive: "#4d1428" }));
  const animations = NEIGHBOR_CLIPS.map(clip => {
    const [times, values] = heartKeys(clip);
    const turn = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), clipAngle(clip)).toArray();
    return new T.AnimationClip(clip, LENGTHS[clip], [
      new T.QuaternionKeyframeTrack("hips.quaternion", [0, LENGTHS[clip]], [...turn, ...turn]),
      new T.VectorKeyframeTrack("heart.scale", times, values.flatMap(value => [value, value, value])),
    ]);
  });
  return { scene, animations };
}

function entry(id: string, feature: "neighbor" | "core", size: number): KitManifestEntry {
  const group = feature === "neighbor" ? "neighbors" : "core";
  return {
    id: id as KitAssetId, file: `${group}/${id.split(".")[1]}.glb`, sha256: "a".repeat(64), group, feature, zones: [], size,
    pivot: "base", verts: 100, tris: 100, bytes: 1000, materials: [], lod: null, budget: feature === "neighbor" ? "character" : "ordinary",
    clips: feature === "neighbor" ? NEIGHBOR_CLIPS.map(name => ({ name, seconds: LENGTHS[name], loop: name === "idle" || name === "walk" || name === "talk" })) : [],
    ...(feature === "neighbor" ? { skinned: true, bones: 19 } : {}),
  };
}
function kitWith(ids: string[]): WorldKit {
  const entries = ids.map(id => entry(id, id.startsWith("core.") ? "core" : "neighbor", 1.6));
  const manifest: KitManifest = {
    version: "v1", generatedAt: "2026-09-23T00:00:00Z", source: { repo: "3d-studio", commit: "b".repeat(40), plan: "docs/PLAN-03-world-kit.md" },
    decoder: { path: "../draco/", files: [...KIT_DECODER_FILES], three: "0.180.0", sha256: {} }, assets: entries,
  };
  const assets = new Map<KitAssetId, KitAsset>();
  for (const item of entries) {
    const person = item.id.split(".")[1].replace(/^hero-/, "");
    const height = NEIGHBOR_FACTS[person as keyof typeof NEIGHBOR_FACTS]?.height ?? 1;
    const model = item.feature === "core"
      ? { scene: new T.Mesh(new T.SphereGeometry(0.75, 8, 6), new T.MeshStandardMaterial({ name: "Rose" })), animations: [] }
      : riggedModel(person, height);
    // The loader names every template after its id (kit-loader.ts `prepare`).
    model.scene.name = item.id;
    assets.set(item.id, {
      id: item.id, entry: item, template: model.scene, clips: new Map(model.animations.map(clip => [clip.name, clip])),
      skinned: item.feature === "neighbor", radius: 1, height,
    });
  }
  return new WorldKit(manifest, assets, []);
}
const TOYS = NEIGHBOR_PEOPLE.map(person => `neighbor.${person}`);

/** A recording 2D context, so the cards can be painted without a browser. */
function recordingCanvas() {
  const texts: string[] = [];
  const context = {
    texts, font: "10px serif", fillStyle: "", strokeStyle: "", lineWidth: 1, textAlign: "left", textBaseline: "alphabetic", globalAlpha: 1, letterSpacing: "0px",
    clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, fill() {}, stroke() {}, arc() {},
    fillText(text: string) { texts.push(text); },
    measureText(text: string) { const size = Number(/(\d+)px/.exec(context.font)?.[1] ?? 10); return { width: text.length * size * 0.5 }; },
  };
  return context;
}
function stubDocument() {
  const canvases: Array<ReturnType<typeof recordingCanvas>> = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const context = recordingCanvas();
      canvases.push(context);
      return { width: 0, height: 0, getContext: () => context };
    },
  });
  return canvases;
}

function fakeContext(kit: WorldKit) {
  const scene = new T.Scene();
  const shadow = new T.MeshBasicMaterial({ name: "shadow", transparent: true });
  const districts = new Map();
  const figures: T.Object3D[] = [], contacts: T.Object3D[] = [];
  ZONES.forEach((zone, index) => {
    const root = new T.Group();
    root.position.fromArray(zone.center);
    scene.add(root);
    const layout = new T.Group();
    layout.rotation.y = Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
    root.add(layout);
    const own: T.Group[] = [];
    if (index < 3) for (const [x, z] of [[-5, 8], [-3.8, 8.5]]) {
      const figure = new T.Group(); figure.position.set(x, 0.72, z); root.add(figure); own.push(figure); figures.push(figure);
      const contact = new T.Mesh(new T.PlaneGeometry(1, 1), shadow); contact.position.set(x, 0.72, z); root.add(contact); contacts.push(contact);
    }
    districts.set(zone.id, { zone, index, root, layout, radius: index < 3 ? 17.8 : 13.8, facing: layout.rotation.y, arches: [], trees: [], beds: [], falls: [], landmark: [], figures: own });
  });
  const registered = { geometries: new Set<T.BufferGeometry>(), materials: new Set<T.Material>(), textures: new Set<T.Texture>() };
  const context = {
    kit, scene, time: { value: 0 },
    geometry: <G extends T.BufferGeometry>(g: G) => { registered.geometries.add(g); return g; },
    material: <M extends T.Material>(m: M) => { registered.materials.add(m); return m; },
    texture: <X extends T.Texture>(t: X) => { registered.textures.add(t); return t; },
    palette: { shadow, rose: new T.MeshStandardMaterial({ name: "rose" }) },
    districts, sparkleDot: new T.Texture(),
  } as unknown as DesignKitContext;
  return { context, scene, figures, contacts, registered };
}

/** The camera where the tour parks for a zone, optionally swung along the reading arc. */
function zoneCamera(zone: ZoneId, aspect = 16 / 9, angle = 0, approach = 1, bob = 0) {
  const { eye, target } = ZONES.find(item => item.id === zone)!;
  const camera = new T.PerspectiveCamera(aspect < 1 ? 63 : 43, aspect, 0.1, 450);
  const dx = eye[0] - target[0], dz = eye[2] - target[2];
  camera.position.set(target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * approach, eye[1] + bob, target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * approach);
  camera.lookAt(new T.Vector3(...target));
  camera.updateMatrixWorld();
  return camera;
}
/** The hero pearl of a reading zone, where `world-recognitions.ts` puts it on a wide screen. */
function heroFocus(zone: ZoneId) {
  const { eye, target, center } = ZONES.find(item => item.id === zone)!;
  const outward = new T.Vector3(eye[0] - target[0], 0, eye[2] - target[2]).normalize();
  const right = new T.Vector3(outward.z, 0, -outward.x);
  const side = zone === "heart" || zone === "peacemakers" ? 7 : 3;
  const position = new T.Vector3(...target).addScaledVector(outward, 5).addScaledVector(right, side);
  position.y = Math.max(target[1] + 3, center[1] + 0.9 + 4.4 * 1.46);
  return { position: position.toArray(), radius: 4.4 };
}
function meetTime(index: number, age: number) {
  const start = (Math.acos(0.08) - Math.PI / 2 - index * 0.21) / 0.12;
  return ((start + age) % NEIGHBOR_CYCLE_SECONDS + NEIGHBOR_CYCLE_SECONDS) % NEIGHBOR_CYCLE_SECONDS;
}
function build(ids = TOYS) {
  const canvases = stubDocument();
  const kit = kitWith(ids);
  const fake = fakeContext(kit);
  const neighbors = createKitNeighbors(fake.context)!;
  const group = fake.scene.getObjectByName("Kit neighbors")!;
  const pair = (zone: ZoneId) => group.getObjectByName(`Neighbors: ${zone}`)!;
  const card = (kind: "greeting" | "response") => group.getObjectByName(`Neighbor ${kind} card`) as T.Mesh;
  const skinned = (root: T.Object3D) => { const out: T.SkinnedMesh[] = []; root.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) out.push(o as T.SkinnedMesh); }); return out; };
  const shown = () => { const out: T.SkinnedMesh[] = []; group.traverseVisible(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) out.push(o as T.SkinnedMesh); }); return out; };
  return { ...fake, kit, neighbors, group, pair, card, skinned, shown, canvases };
}
const hipsAngle = (actor: T.Object3D) => {
  const hips = actor.getObjectByName("hips")!;
  return 2 * Math.atan2(hips.quaternion.y, hips.quaternion.w);
};
const heartScale = (actor: T.Object3D) => actor.getObjectByName("heart")!.scale.x;

describe("kit neighbors (Plan 26 K4)", () => {
  it("casts the six toys, and prefers a sculpted hero with the same rig when one is in the kit", () => {
    const kit = kitWith([...TOYS, "neighbor.hero-mother"]);
    expect(castNeighbor(kit, "mother")).toEqual({ toy: "neighbor.mother", hero: "neighbor.hero-mother" });
    expect(castNeighbor(kit, "father")).toEqual({ toy: "neighbor.father", hero: null });
    expect(castNeighbor(kitWith(TOYS.slice(1)), NEIGHBOR_PEOPLE[0]).toy).toBeNull();
    expect(neighborAssetIds("child")).toEqual({ heroes: ["neighbor-hero.child", "neighbor.hero-child"], toy: "neighbor.child" });
    // Every person is cast four or five times and never twice in one zone.
    const counts = new Map<string, number>();
    for (const [a, b] of Object.values(NEIGHBOR_CAST)) { expect(a).not.toBe(b); counts.set(a, (counts.get(a) ?? 0) + 1); counts.set(b, (counts.get(b) ?? 0) + 1); }
    for (const person of NEIGHBOR_PEOPLE) expect([4, 5]).toContain(counts.get(person));
  });

  it("merges a rig into one skinned draw with its materials in the vertices, leaving the kit's own file untouched", () => {
    const kit = kitWith(["neighbor.mother"]);
    const template = kit.asset("neighbor.mother" as KitAssetId)!.template;
    const before = new Set<T.BufferGeometry>();
    template.traverse(o => { if ((o as T.Mesh).isMesh) before.add((o as T.Mesh).geometry); });
    const material = neighborMaterial();
    const merged = mergeNeighborRig(template, material)!;
    const meshes: T.SkinnedMesh[] = [];
    merged.root.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) meshes.push(o as T.SkinnedMesh); });
    expect(meshes).toHaveLength(1);
    const [mesh] = meshes;
    expect(mesh.material).toBe(material);
    expect(mesh.skeleton.bones).toHaveLength(19);
    const geometry = mesh.geometry;
    expect(geometry.index).not.toBeNull();
    expect(geometry.getAttribute("position").count).toBe(3 * 24);
    expect(geometry.getAttribute("skinIndex").array).toBeInstanceOf(Uint16Array);
    // The top's coral, the skin's brown and the heart's rose, each on its own vertices, in the linear working space.
    const color = geometry.getAttribute("color");
    const near = (at: number, hex: string) => new T.Color(hex).toArray().forEach((value, k) => expect(color.getComponent(at, k)).toBeCloseTo(value, 6));
    near(0, "#ff6f5a");
    near(24, "#6b3f2a");
    const surface = geometry.getAttribute("kitSurface");
    expect(surface.getW(0)).toBeCloseTo(0.65, 6);
    expect(surface.getX(48)).toBeCloseTo(new T.Color("#4d1428").r, 6);
    expect(mesh.boundingSphere).not.toBeNull();
    // The kit's template still has its three primitives and their geometry.
    const after = new Set<T.BufferGeometry>();
    template.traverse(o => { if ((o as T.Mesh).isMesh) after.add((o as T.Mesh).geometry); });
    expect([...after]).toEqual([...before]);
  });

  it("stands 26 actors, one skinned draw each, and takes the miniature figures and their shadows away", () => {
    const world = build();
    expect(world.neighbors).toBeDefined();
    expect(world.figures.every(figure => figure.parent === null)).toBe(true);
    expect(world.contacts.every(contact => contact.parent === null)).toBe(true);
    for (const zone of ZONES) {
      const pair = world.pair(zone.id);
      const people = pair.children.filter(child => child.name.startsWith("Neighbor "));
      expect(people.map(child => child.name)).toEqual(NEIGHBOR_CAST[zone.id].map(person => `Neighbor ${person}`));
      for (const person of people) {
        expect(world.skinned(person)).toHaveLength(1);
        expect(person.scale.x).toBe(NEIGHBOR_SCALE);
      }
    }
    // One material for every actor, registered for the world's disposal.
    const materials = new Set(world.skinned(world.group).map(mesh => mesh.material));
    expect(materials.size).toBe(1);
    expect(world.registered.materials.has([...materials][0] as T.Material)).toBe(true);
  });

  it("keeps the figures and stands nothing when a toy rig is missing", () => {
    stubDocument();
    const fake = fakeContext(kitWith(TOYS.filter(id => id !== "neighbor.teenager")));
    expect(createKitNeighbors(fake.context)).toBeUndefined();
    expect(fake.figures.every(figure => figure.parent !== null)).toBe(true);
    expect(fake.scene.getObjectByName("Kit neighbors")).toBeUndefined();
  });

  it("plays each actor's clip from the one clock, and passes the heart at 15.5 + handoffAt", () => {
    const world = build();
    world.scene.userData.studyCamera = zoneCamera("garden");
    const [mother, child] = world.pair("garden").children.filter(child => child.name.startsWith("Neighbor "));
    const at = (age: number) => world.neighbors.update(meetTime(0, age), "garden", undefined);
    at(3);
    // Three seconds into the meet: the mother talks, the child listens.
    expect(hipsAngle(mother)).toBeCloseTo(clipAngle("talk"), 4);
    expect(hipsAngle(child)).toBeCloseTo(clipAngle("listen"), 4);
    at(6);
    // The Garden speaks expression 1, "How Are You?", with a wave.
    expect(hipsAngle(mother)).toBeCloseTo(clipAngle("wave"), 4);
    at(16.5);
    expect(heartScale(mother)).toBeCloseTo(1, 3);
    expect(heartScale(child)).toBeCloseTo(0.001, 3);
    at(15.5 + 1.8 + 0.3);
    expect(heartScale(mother)).toBeCloseTo(0.001, 3);
    expect(heartScale(child)).toBeCloseTo(1, 3);
    at(20);
    expect(heartScale(mother)).toBeCloseTo(0.001, 3);
    expect(heartScale(child)).toBeCloseTo(0.001, 3);
    const hearts = world.group.getObjectByName("Neighbor floating hearts") as T.InstancedMesh;
    expect(hearts.count).toBeGreaterThanOrEqual(1);
    // A frozen clock is a frozen pose: the same second twice gives the same bones.
    at(9.25);
    const first = mother.getObjectByName("hips")!.quaternion.clone();
    at(9.25);
    expect(mother.getObjectByName("hips")!.quaternion.equals(first)).toBe(true);
  });

  it("shows the card the schedule names, printed FICTIONAL NEIGHBORS, and the dialogue matches it", () => {
    const world = build();
    world.scene.userData.studyCamera = zoneCamera("garden");
    const words = neighborWords(0);
    for (const age of [0.5, 3, 7, 10, 13, 16, 20, 26]) {
      const time = meetTime(0, age);
      world.neighbors.update(time, "garden", undefined);
      const { card } = neighborSchedule(time, 0);
      expect(world.card("greeting").visible).toBe(card === "greeting");
      expect(world.card("response").visible).toBe(card === "response");
      expect(neighborDialogue(time, "garden")).toBe(card === "greeting" ? words.greeting : card === "response" ? words.response : null);
    }
    // An arrival takes the stage: no card at all.
    world.neighbors.update(meetTime(0, 3), "garden", { phase: "reading", id: "sample", age: 1, progress: 0.5, waveIndex: 1, waveSize: 1 });
    expect(world.card("greeting").visible).toBe(false);
    // Both cards were painted for the Garden, each with the label and the canonical words.
    const painted = world.canvases.filter(canvas => canvas.texts.length);
    expect(painted).toHaveLength(2);
    for (const canvas of painted) expect(canvas.texts[0]).toBe(NEIGHBOR_CARD_LABEL);
    expect(painted[0].texts.slice(1).join(" ")).toBe(words.greeting);
    expect(painted[1].texts.slice(1).join(" ")).toBe(words.response);
    expect(NEIGHBOR_CARD_LABEL).toBe("FICTIONAL NEIGHBORS");
  });

  it("prints FICTIONAL NEIGHBORS on every card of every zone, the words in at most two lines", () => {
    for (const [index] of ZONES.entries()) {
      const words = neighborWords(index);
      for (const text of [words.greeting, words.response]) {
        const context = recordingCanvas();
        paintNeighborCard(context as unknown as CardContext, text, WORLD_EXPRESSIONS[index % 9].color, 0.5);
        expect(context.texts[0]).toBe("FICTIONAL NEIGHBORS");
        expect(context.texts.length - 1).toBeLessThanOrEqual(2);
        expect(context.texts.slice(1).join(" ")).toBe(text);
      }
    }
  });

  it("sets the Grove's card beside the pair, clear of the icon discs above it, still printed FICTIONAL NEIGHBORS", () => {
    const world = build();
    world.scene.userData.studyCamera = zoneCamera("expressions");
    world.neighbors.update(meetTime(2, 3), "expressions", undefined);
    const card = world.card("greeting");
    expect(card.visible).toBe(true);
    // Its bottom at the stage's lift above the ground, so its centre sits below the discs at 5.15.
    const local = world.pair("expressions").worldToLocal(card.position.clone());
    expect(local.y).toBeLessThan(5.15 - 0.96 - 1.2);
    for (const side of ["left", "right"] as const) {
      const context = recordingCanvas();
      paintNeighborCard(context as unknown as CardContext, neighborWords(2).greeting, WORLD_EXPRESSIONS[2].color, 0.6, side);
      expect(context.texts[0]).toBe(NEIGHBOR_CARD_LABEL);
      expect(context.texts.slice(1).join(" ")).toBe(neighborWords(2).greeting);
    }
  });

  it("repaints its two cards per zone, never more textures than two", () => {
    const world = build();
    const cardTextures = [...world.registered.textures].filter(texture => texture instanceof T.CanvasTexture);
    expect(cardTextures).toHaveLength(2);
    for (const zone of ["garden", "heart", "welcome"] as const) {
      world.scene.userData.studyCamera = zoneCamera(zone);
      const index = ZONES.findIndex(item => item.id === zone);
      world.neighbors.update(meetTime(index, 3), zone, undefined);
      expect(world.card("greeting").visible).toBe(true);
    }
    expect([...world.registered.textures].filter(texture => texture instanceof T.CanvasTexture)).toHaveLength(2);
    // The cards are the only thing the protect mask keeps glow off, like the pearl's words.
    expect(world.card("greeting").layers.isEnabled(3)).toBe(true);
  });

  it("draws at most four pairs (eight skinned meshes) at High, the active pair alone on Low, and only it casts a shadow", () => {
    const world = build();
    for (const [index, zone] of ZONES.entries()) {
      world.scene.userData.studyCamera = zoneCamera(zone.id);
      world.scene.userData.lowTier = false;
      world.neighbors.update(meetTime(index, 5), zone.id, undefined);
      const high = world.shown();
      expect(high.length).toBeLessThanOrEqual(8);
      expect(high.length % 2).toBe(0);
      const active = world.skinned(world.pair(zone.id));
      for (const mesh of active) expect(high).toContain(mesh);
      for (const mesh of high) expect(mesh.castShadow).toBe(active.includes(mesh));
      world.scene.userData.lowTier = true;
      world.neighbors.update(meetTime(0, 5), zone.id, undefined);
      expect(world.shown()).toEqual(expect.arrayContaining(active));
      expect(world.shown()).toHaveLength(2);
    }
  });

  it("plays the hero rig for close ups and the toy from afar", () => {
    const world = build([...TOYS, "neighbor.hero-mother"]);
    const mother = world.pair("garden").children.find(child => child.name === "Neighbor mother")!;
    expect(world.skinned(mother)).toHaveLength(2);
    world.scene.userData.studyCamera = zoneCamera("garden");
    world.neighbors.update(meetTime(0, 3), "garden", undefined);
    const visible = world.skinned(mother).filter(mesh => { let on = true; mesh.traverseAncestors(a => { if (!a.visible) on = false; }); return on && mesh.visible; });
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toMatch(/hero-mother/);
    // Parked far away, the same actor plays its toy.
    const far = zoneCamera("garden", 16 / 9, 0, 3);
    world.scene.userData.studyCamera = far;
    world.neighbors.update(meetTime(0, 3), "garden", undefined);
    const again = world.skinned(mother).filter(mesh => { let on = true; mesh.traverseAncestors(a => { if (!a.visible) on = false; }); return on && mesh.visible; });
    expect(again).toHaveLength(1);
    expect(again[0].name).not.toMatch(/hero/);
  });

  it("never lets a speech card cover the words of the pearl being read, along the whole reading arc", () => {
    const world = build();
    // The authored eye, the swing a twenty second stop sweeps (sin(20 * .035) * .48 = .31), and
    // the arc's extremes, which only a long read reaches, with its approach and bob.
    const arc = [[0, 1, 0], [0.31, 1, 0], [-0.31, 1, 0], [0.31, 0.95, 1.6], [-0.31, 1.05, -1.6], [0.48, 0.9, 1.6], [-0.48, 0.9, -1.6], [0.48, 1.1, -1.6], [-0.48, 1.1, 1.6]];
    const hidden: string[] = [];
    for (const zone of RECOGNITION_ZONES) {
      const index = ZONES.findIndex(item => item.id === zone);
      const focus = heroFocus(zone);
      world.scene.userData.studyFocus = focus;
      for (const [angle, approach, bob] of arc) {
        const camera = zoneCamera(zone, 16 / 9, angle, approach, bob);
        world.scene.userData.studyCamera = camera;
        for (const [age, kind] of [[3, "greeting"], [10, "response"]] as const) {
          world.neighbors.update(meetTime(index, age), zone, undefined);
          const card = world.card(kind);
          // Whatever the guard decides, a card that shows never covers the face.
          if (card.visible) expect(coversFocus(card, camera, focus)).toBe(false);
          else hidden.push(`${zone} ${angle} ${kind}`);
          // Along the swing an ordinary stop sweeps, every card shows.
          if (Math.abs(angle) <= 0.31) expect({ zone, angle, kind, visible: card.visible }).toEqual({ zone, angle, kind, visible: true });
        }
      }
    }
    // Only a long read's extreme swing ever asks the guard to step in (the River, looking from the left).
    for (const entry of hidden) expect(entry).toMatch(/ -?0\.48 /);
    // And the guard does hide one: a pearl placed right behind the card.
    world.scene.userData.studyCamera = zoneCamera("garden");
    world.neighbors.update(meetTime(0, 3), "garden", undefined);
    world.scene.userData.studyFocus = { position: world.card("greeting").position.toArray(), radius: 3 };
    world.neighbors.update(meetTime(0, 3), "garden", undefined);
    expect(world.card("greeting").visible).toBe(false);
  });

  it("stands every pair on its island, clear of the reading pearls, the lawn beds and flower patches", () => {
    for (const zone of ZONES) {
      const stage = NEIGHBOR_STAGES[zone.id];
      const radius = ZONES.indexOf(zone) < 3 ? 17.8 : 13.8;
      const [first, second] = NEIGHBOR_CAST[zone.id].map(person => NEIGHBOR_FACTS[person]);
      const gap = 0.15 * first.height;
      const reach = [(first.reach + gap / 2) * NEIGHBOR_SCALE + stage.walk, (second.reach + gap / 2) * NEIGHBOR_SCALE + stage.walk];
      const ends = [stage.x - reach[0], stage.x, stage.x + reach[1]];
      const beds = ZONES.indexOf(zone) < 3 ? 14.7 : 11.5;
      for (const x of ends) {
        const r = Math.hypot(x, stage.z);
        expect(r).toBeLessThan(radius - 2);
        // The two lawn beds are ring arcs 1.5 rad wide on either side (design-world.ts);
        // their foliage and the kit's bushes start at radius 9.
        const fromSide = Math.min(Math.abs(Math.atan2(-stage.z, x)), Math.PI - Math.abs(Math.atan2(-stage.z, x)));
        expect({ zone: zone.id, x, inBedFoliage: r > 9 && r < beds && fromSide < 0.75 }).toEqual({ zone: zone.id, x, inBedFoliage: false });
        for (const [fx, fz] of [[-10, 5], [10.5, 5]]) expect(Math.hypot(x - fx, stage.z - fz)).toBeGreaterThan(2.5);
      }
      if (!RECOGNITION_ZONES.includes(zone.id)) continue;
      // Section 6.2: the hero reading sphere and the two resident spheres, against a 2.4 unit person.
      const side = zone.id === "heart" || zone.id === "peacemakers" ? 7 : 3;
      const yHero = Math.max(zone.target[1] - zone.center[1] + 3, 7.32);
      const spheres: Array<[number, number, number, number]> = [
        [side, yHero, 5, 7], [-10, zone.target[1] - zone.center[1] + 6, 1, 3.2], [11, zone.target[1] - zone.center[1] + 9, -4, 3],
      ];
      for (const x of ends) for (const y of [0.7, 1.9, 3.1]) for (const [sx, sy, sz, sr] of spheres) {
        expect(Math.hypot(x - sx, y - sy, stage.z - sz)).toBeGreaterThan(sr);
      }
    }
  });
});

describe("the neighbors' poses and steps", () => {
  const lengths = LENGTHS;
  it("blends clips with weights that always sum to one, so the bind pose never shows", () => {
    for (let index = 0; index < ZONES.length; index++) {
      for (let time = 0; time < NEIGHBOR_CYCLE_SECONDS; time += 0.05) {
        const beat = neighborSchedule(time, index);
        for (const slot of [0, 1] as const) {
          const weights = neighborWeights(beat, slot, lengths, time, fraction => fraction, { now: 0.5, before: 1, pace: 0.7 });
          const total = weights.reduce((sum, item) => sum + item.weight, 0);
          expect(total).toBeCloseTo(1, 9);
          for (const item of weights) {
            expect(item.weight).toBeGreaterThanOrEqual(0);
            expect(item.time).toBeGreaterThanOrEqual(0);
            expect(item.time).toBeLessThanOrEqual(lengths[item.clip] + 1e-9);
          }
        }
      }
    }
  });

  it("walks each actor at its own pace to arrive as the row ends, feet on the ground", () => {
    const row = NEIGHBOR_BEATS.findIndex(item => item.staging === "walk-in");
    const length = NEIGHBOR_BEATS[row + 1].start - NEIGHBOR_BEATS[row].start;
    for (const person of NEIGHBOR_PEOPLE) {
      const speed = NEIGHBOR_FACTS[person].stride * NEIGHBOR_SCALE;
      let last = -1;
      for (let age = 0; age <= length + 1e-9; age += 0.05) {
        const place = neighborPlacement("walk-in", age, length, -1, { length: 2, speed });
        expect(1 - place.apart).toBeGreaterThanOrEqual(last - 1e-9);
        last = 1 - place.apart;
      }
      expect(neighborPlacement("walk-in", length, length, -1, { length: 2, speed }).apart).toBeCloseTo(0, 6);
      expect(neighborPlacement("walk-out", length, length, 1, { length: 2, speed }).apart).toBeCloseTo(1, 6);
    }
    const stroll = neighborStroll(0.3, 2, 0.8);
    expect(stroll.pace).toBeGreaterThan(0);
    expect(stroll.pace).toBeLessThan(1);
    expect(neighborStroll(10, 2, 0.8)).toEqual({ walked: 1, pace: 0 });
  });

  it("turns through the viewer, and further toward each other to pass the heart", () => {
    for (const side of [-1, 1] as const) {
      const away = neighborPlacement("turn-away", 0.4, 0.8, side);
      expect(Math.abs(away.heading)).toBeLessThan(Math.PI / 2);
      const back = neighborPlacement("turn-back", 0.4, 0.8, side);
      expect(Math.abs(back.heading)).toBeLessThan(0.2);
      expect(neighborPlacement("stance", 1, 3, side).heading).toBeCloseTo(-side * NEIGHBOR_STANCE, 9);
      expect(neighborPlacement("exchange", 1, 3, side).heading).toBeCloseTo(-side * NEIGHBOR_EXCHANGE, 9);
      expect(neighborPlacement("stance", 0, 3, side, undefined, "exchange").heading).toBeCloseTo(-side * NEIGHBOR_EXCHANGE, 9);
    }
  });
});
