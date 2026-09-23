import * as T from "three";
import { describe, expect, it } from "vitest";
import { WorldKit, type KitAsset, type KitModel } from "../../src/components/display/world/kit/kit-loader";
import type { KitAssetId, KitManifest, KitManifestEntry } from "../../src/components/display/world/kit/kit-manifest";
import { arrivalPose, type ArrivalPose } from "../../src/components/display/world/prototype/arrival-choreography";
import {
  ARRIVAL_EYE_LOCAL,
  ARRIVAL_PEARL,
  CONSTELLATION_LANDING,
  ENTRY_POSITION,
  RIBBON_SWAY,
  STAGE_KIT,
  STAGE_PLACEMENT,
  bloomStage,
  constellationStage,
  extractJointGeometry,
  pearlClearance,
  petalCoordinates,
  ribbonSilkCentre,
  ribbonStage,
  type StageContext,
} from "../../src/components/display/world/prototype/arrival-stages";
import { ARRIVAL_VIEW } from "../../src/components/display/world/world-data";

/**
 * The stages are plain Three.js construction on a fake kit, so they need no document,
 * canvas or WebGL context. The fake kit is a real `WorldKit` over hand built models with
 * the same skins and clips the studio files carry (names, bones, clip names).
 */

type Phase = "idle" | "approach" | "reveal" | "reading" | "settle" | "return";
function pose(phase: Phase, progress = 0): ArrivalPose {
  return arrivalPose({ phase, id: "sample", age: 0, progress, waveIndex: 1, waveSize: 1 });
}
const on = { sparkles: true, trails: true };

function lcg(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function context(kit?: WorldKit): StageContext & { geometries: Set<T.BufferGeometry>; materials: Set<T.Material> } {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
  return {
    geometries, materials,
    geometry: g => { geometries.add(g); return g; },
    material: m => { materials.add(m); return m; },
    texture: t => t,
    instance: (parent, g, m, count) => { const o = new T.InstancedMesh(g, m, count); parent.add(o); return o; },
    gold: new T.MeshStandardMaterial({ name: "gold", color: "#e0b060" }),
    ivory: new T.MeshStandardMaterial({ name: "ivory", color: "#fff4e4" }),
    farPetal: new T.PlaneGeometry(.9, 1, 2, 2),
    pollen: new T.SphereGeometry(1, 6, 4),
    lotusShape: new T.PlaneGeometry(1, 1, 2, 2),
    time: { value: 0 },
    seededRandom: lcg,
    kit,
  };
}

/** A skinned strip: `segments` quads along +y from the base bone, every vertex on `bone`. */
function skinnedStrip(materialName: string, bones: T.Bone[], assign: (y: number) => number, length = 1, segments = 4) {
  const geometry = new T.PlaneGeometry(.3, length, 1, segments).toNonIndexed();
  geometry.translate(0, length / 2, 0);
  // The studio files carry no uv, which is what the lotus helper has to cope with.
  geometry.deleteAttribute("uv");
  const position = geometry.getAttribute("position"), count = position.count;
  const index = new Uint16Array(count * 4), weight = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { index[i * 4] = assign(position.getY(i)); weight[i * 4] = 1; }
  geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(index, 4));
  geometry.setAttribute("skinWeight", new T.Float32BufferAttribute(weight, 4));
  const mesh = new T.SkinnedMesh(geometry, new T.MeshStandardMaterial({ name: materialName }));
  mesh.add(bones[0]);
  mesh.bind(new T.Skeleton(bones));
  return mesh;
}
function lotusModel(): KitModel {
  const rig = new T.Group(); rig.name = "lotus-bloom-rig";
  const lotus = new T.Bone(); lotus.name = "lotus";
  const petal = new T.Bone(); petal.name = "petal_0_0"; petal.position.set(0, .1, 0); lotus.add(petal);
  const mesh = skinnedStrip("Petal", [lotus, petal], y => (y > .1 ? 1 : 0), 1.2);
  mesh.name = "lotus-bloom"; rig.add(mesh);
  const clip = new T.AnimationClip("bloom", 2.5, [
    new T.VectorKeyframeTrack("petal_0_0.scale", [0, 2.5], [.5, .5, .5, 1, 1, 1]),
    new T.VectorKeyframeTrack("lotus.scale", [0, 2.5], [.88, .88, .88, 1, 1, 1]),
  ]);
  return { scene: rig, animations: [clip] };
}
function petalsModel(): KitModel {
  const rig = new T.Group(); rig.name = "petal-drift-rig";
  const a = new T.Bone(); a.name = "petal_0"; a.position.set(-.2, .2, 0);
  const b = new T.Bone(); b.name = "petal_1"; b.position.set(.25, 0, .1); a.add(b);
  const mesh = skinnedStrip("Petal", [a, b], y => (y > .5 ? 1 : 0), 1, 2);
  mesh.name = "petal-drift"; rig.add(mesh);
  return { scene: rig, animations: [new T.AnimationClip("drift", 4, [new T.VectorKeyframeTrack("petal_0.position", [0, 4], [-.2, .2, 0, -.2, .3, 0])])] };
}
function butterflyModel(): KitModel {
  const rig = new T.Group(); rig.name = "butterfly-rig";
  const body = new T.Bone(); body.name = "body";
  const left = new T.Bone(); left.name = "wing_L"; left.position.x = .012; body.add(left);
  const right = new T.Bone(); right.name = "wing_R"; right.position.x = -.012; body.add(right);
  const mesh = skinnedStrip("Wing", [body, left, right], () => 1, .3, 1);
  mesh.name = "butterfly"; rig.add(mesh);
  const gold = new T.Mesh(new T.BoxGeometry(.02, .02, .1), new T.MeshStandardMaterial({ name: "Gold" })); rig.add(gold);
  const clip = new T.AnimationClip("flap", .5, [
    new T.QuaternionKeyframeTrack("wing_L.quaternion", [0, .25, .5], [0, 0, 0, 1, 0, 0, .383, .924, 0, 0, 0, 1]),
  ]);
  return { scene: rig, animations: [clip] };
}
function portalModel(): KitModel {
  const scene = new T.Group(); scene.name = "ribbon-portal";
  for (const [name, x] of [["Gold", -3], ["Silk", -1], ["GoldGlow", 1], ["Pearl", 3]] as const) {
    const mesh = new T.Mesh(new T.BoxGeometry(1, 5.96, 1), new T.MeshStandardMaterial({ name }));
    mesh.position.set(x, 2.98, 0); scene.add(mesh);
  }
  return { scene, animations: [] };
}
function sparkleModel(): KitModel {
  const scene = new T.Group();
  const geometry = new T.BoxGeometry(.4, .4, .08);
  geometry.clearGroups();
  const triangles = geometry.index ? geometry.index.count : geometry.getAttribute("position").count;
  geometry.addGroup(0, triangles / 2, 0);
  geometry.addGroup(triangles / 2, triangles / 2, 1);
  const mesh = new T.Mesh(geometry, [
    new T.MeshStandardMaterial({ name: "SparkleGlow" }),
    new T.MeshStandardMaterial({ name: "SparkleHalo", transparent: true, opacity: .9 }),
  ]);
  mesh.name = "ConstellationSparkle"; scene.add(mesh);
  const clip = new T.AnimationClip("twinkle", 2, [new T.VectorKeyframeTrack("ConstellationSparkle.scale", [0, 1, 2], [1, 1, 1, 1.3, 1.3, 1.3, 1, 1, 1])]);
  return { scene, animations: [clip] };
}
function asset(id: KitAssetId, model: KitModel): KitAsset {
  model.scene.name = id;
  model.scene.updateMatrixWorld(true);
  let skinned = false;
  model.scene.traverse(o => { if ((o as T.SkinnedMesh).isSkinnedMesh) skinned = true; });
  const box = new T.Box3().setFromObject(model.scene);
  const entry = { id, file: `${id}.glb`, group: id.split(".")[0], feature: id.split(".")[0], clips: model.animations.map(clip => ({ name: clip.name, seconds: clip.duration, loop: clip.duration === .5 })) } as unknown as KitManifestEntry;
  return { id, entry, template: model.scene, clips: new Map(model.animations.map(clip => [clip.name, clip])), skinned, radius: box.getBoundingSphere(new T.Sphere()).radius, height: box.max.y - box.min.y };
}
function fakeKit(ids: KitAssetId[] = Object.values(STAGE_KIT)): WorldKit {
  const models: Record<string, () => KitModel> = {
    [STAGE_KIT.lotus]: lotusModel, [STAGE_KIT.portal]: portalModel, [STAGE_KIT.butterfly]: butterflyModel,
    [STAGE_KIT.petals]: petalsModel, [STAGE_KIT.sparkle]: sparkleModel,
  };
  const assets = new Map<KitAssetId, KitAsset>();
  for (const id of ids) assets.set(id, asset(id, models[id]()));
  return new WorldKit({ version: "v1", assets: [] } as unknown as KitManifest, assets, []);
}
function named(root: T.Object3D, name: string) {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`no object named ${name}`);
  return found;
}
function instancedMeshes(root: T.Object3D) {
  const found: T.InstancedMesh[] = [];
  root.traverse(o => { if ((o as T.InstancedMesh).isInstancedMesh) found.push(o as T.InstancedMesh); });
  return found;
}
const matrix = new T.Matrix4(), position = new T.Vector3(), quaternion = new T.Quaternion(), scale = new T.Vector3();
function instanceAt(mesh: T.InstancedMesh, i: number) {
  mesh.getMatrixAt(i, matrix);
  matrix.decompose(position, quaternion, scale);
  return { position: position.clone(), scale: scale.x };
}

describe("arrival stage geometry helpers", () => {
  it("derives a base to tip uv from the skin for the lotus petals", () => {
    const model = lotusModel();
    const mesh = named(model.scene, "lotus-bloom") as T.SkinnedMesh;
    const geometry = petalCoordinates(mesh);
    const uv = geometry.getAttribute("uv"), positionAttribute = geometry.getAttribute("position");
    expect(uv.count).toBe(positionAttribute.count);
    // The petal bone sits at y .1; its vertices run from y .3 (base of the petal strip) to 1.2 (tip).
    let lowest = 2, highest = -1;
    for (let i = 0; i < uv.count; i++) {
      const y = positionAttribute.getY(i);
      if (y > .1) { lowest = Math.min(lowest, uv.getY(i)); highest = Math.max(highest, uv.getY(i)); }
    }
    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(lowest).toBeLessThan(.3);
    expect(highest).toBeCloseTo(1, 6);
    // The template's own geometry is untouched.
    expect(mesh.geometry.getAttribute("uv")).toBeUndefined();
  });

  it("extracts one petal of the cluster into its own bone frame", () => {
    const model = petalsModel();
    const mesh = named(model.scene, "petal-drift") as T.SkinnedMesh;
    const single = extractJointGeometry(mesh, 0);
    expect(single).not.toBeNull();
    const positionAttribute = single!.getAttribute("position");
    // Bone 0 owns the lower quad of the strip: two triangles, six vertices, centred on its origin.
    expect(positionAttribute.count).toBe(6);
    const box = new T.Box3().setFromBufferAttribute(positionAttribute as T.BufferAttribute);
    expect(box.min.x).toBeCloseTo(.2 - .15, 5);
    expect(box.max.x).toBeCloseTo(.2 + .15, 5);
    expect(box.min.y).toBeCloseTo(-.2, 5);
    expect(box.max.y).toBeCloseTo(.3, 5);
    expect(extractJointGeometry(mesh, 7)).toBeNull();
  });

  it("measures clearance against the arrival camera the world uses", () => {
    expect(ARRIVAL_EYE_LOCAL.toArray()).toEqual([ARRIVAL_VIEW.eye[0] - ENTRY_POSITION.x, ARRIVAL_VIEW.eye[1] - ENTRY_POSITION.y, ARRIVAL_VIEW.eye[2] - ENTRY_POSITION.z]);
    const centre = pearlClearance(new T.Vector3(0, ARRIVAL_PEARL.y, 0));
    expect(centre.distance).toBeCloseTo(0, 9);
    const rim = pearlClearance(new T.Vector3(ARRIVAL_PEARL.radius, ARRIVAL_PEARL.y, 0));
    expect(rim.distance).toBeGreaterThan(ARRIVAL_PEARL.radius * .9);
    const behind = pearlClearance(new T.Vector3(0, ARRIVAL_PEARL.y, -8));
    expect(behind.front).toBeLessThan(0);
    const inFront = pearlClearance(ARRIVAL_EYE_LOCAL.clone().lerp(new T.Vector3(0, ARRIVAL_PEARL.y, 0), .7));
    expect(inFront.front).toBeGreaterThan(0);
  });
});

describe("petal bloom stage", () => {
  it("keeps the procedural lotus, petals and beam without a kit or without the lotus file", () => {
    for (const ctx of [context(), context(fakeKit([STAGE_KIT.sparkle]))]) {
      const stage = bloomStage(ctx);
      const instanced = instancedMeshes(stage.group);
      expect(instanced.map(o => o.count).sort((a, b) => a - b)).toEqual([8, 10, 40]);
      expect(instanced.find(o => o.count === 40)!.geometry).toBe(ctx.farPetal);
      expect(stage.group.getObjectByName(STAGE_KIT.lotus)).toBeUndefined();
      stage.update(pose("reading"), 0, on);
      stage.dispose();
    }
  });

  it("scrubs the kit bloom clip by the pose: closed through approach, open when reading begins", () => {
    const ctx = context(fakeKit());
    const stage = bloomStage(ctx);
    const petal = named(stage.group, "petal_0_0");
    expect(stage.group.getObjectByName(STAGE_KIT.lotus)).toBeDefined();
    expect(instancedMeshes(stage.group).map(o => o.count)).toEqual([40]);
    const scrubbedTo = () => (petal.scale.x - .5) / .5;
    stage.update(pose("approach", .5), 1, on);
    expect(scrubbedTo()).toBeCloseTo(0, 6);
    stage.update(pose("approach", 1), 2, on);
    expect(scrubbedTo()).toBeCloseTo(0, 6);
    stage.update(pose("reveal", .5), 3, on);
    expect(scrubbedTo()).toBeCloseTo(.5, 6);
    stage.update(pose("reveal", .25), 3, on);
    expect(scrubbedTo()).toBeCloseTo(.15625, 6);
    stage.update(pose("reveal", 1), 4, on);
    expect(scrubbedTo()).toBeCloseTo(1, 6);
    stage.update(pose("reading"), 5, on);
    expect(scrubbedTo()).toBeCloseTo(1, 6);
    stage.update(pose("settle", .5), 6, on);
    expect(scrubbedTo()).toBeCloseTo(1, 6);
    stage.dispose();
  });

  it("shows the open flower on a reduced motion first frame and a frozen clock keeps it", () => {
    const ctx = context(fakeKit());
    const stage = bloomStage(ctx);
    const petal = named(stage.group, "petal_0_0");
    const root = named(stage.group, STAGE_KIT.lotus);
    stage.update(pose("reading"), 0, on);
    expect(petal.scale.x).toBeCloseTo(1, 6);
    expect(root.scale.x).toBeCloseTo(STAGE_PLACEMENT.lotus.scale, 6);
    const drift = instancedMeshes(stage.group)[0];
    const before = Array.from(drift.instanceMatrix.array);
    stage.update(pose("reading"), 0, on);
    stage.update(pose("reading"), 0, on);
    expect(Array.from(drift.instanceMatrix.array)).toEqual(before);
    expect(petal.scale.x).toBeCloseTo(1, 6);
    stage.dispose();
  });

  it("rises with gather and sinks while it dissolves, still open", () => {
    const ctx = context(fakeKit());
    const stage = bloomStage(ctx);
    const root = named(stage.group, STAGE_KIT.lotus), petal = named(stage.group, "petal_0_0");
    stage.update(pose("approach", 0), 0, on);
    expect(root.scale.x).toBeCloseTo(STAGE_PLACEMENT.lotus.scale * .15, 6);
    stage.update(pose("approach", 1), 1, on);
    expect(root.scale.x).toBeCloseTo(STAGE_PLACEMENT.lotus.scale, 6);
    stage.update(pose("settle", 1), 2, on);
    expect(root.scale.x).toBeCloseTo(STAGE_PLACEMENT.lotus.scale * .15, 6);
    expect(petal.scale.x).toBeCloseTo(1, 6);
    expect(root.position.y).toBeCloseTo(STAGE_PLACEMENT.lotus.y, 6);
    stage.dispose();
  });

  it("never lets a kit petal drift across the words", () => {
    const ctx = context(fakeKit());
    const stage = bloomStage(ctx);
    const drift = instancedMeshes(stage.group)[0];
    expect(drift.geometry).not.toBe(ctx.farPetal);
    let guarded = 0, inFront = 0;
    for (let time = 0; time < 60; time += .5) {
      stage.update(pose("reading"), time, on);
      for (let i = 0; i < drift.count; i++) {
        const { position: at, scale: size } = instanceAt(drift, i);
        const clearance = pearlClearance(at);
        if (clearance.front > -.6) {
          inFront++;
          if (clearance.distance < ARRIVAL_PEARL.radius + .2) { guarded++; expect(size).toBeLessThanOrEqual(.0002); }
        }
      }
    }
    expect(inFront).toBeGreaterThan(0);
    expect(guarded).toBeGreaterThan(0);
    stage.dispose();
  });
});

describe("silk unveiling stage", () => {
  it("keeps the silk centre line clear of the words across the whole sway at 1080p", () => {
    const point = new T.Vector3();
    let nearestInFront = Infinity, nearestAnywhere = Infinity;
    for (let turn = -RIBBON_SWAY; turn <= RIBBON_SWAY + 1e-9; turn += RIBBON_SWAY / 12) {
      for (let s = 0; s <= 1; s += 1 / 480) {
        const clearance = pearlClearance(ribbonSilkCentre(s, turn, point));
        nearestAnywhere = Math.min(nearestAnywhere, clearance.distance);
        if (clearance.front >= 0) nearestInFront = Math.min(nearestInFront, clearance.distance);
      }
    }
    // Every point of the loop that is not hidden behind the pearl keeps the full clearance.
    expect(nearestInFront).toBeGreaterThanOrEqual(ARRIVAL_PEARL.radius + ARRIVAL_PEARL.clearance);
    // And nothing, even behind, ever reaches the disc itself.
    expect(nearestAnywhere).toBeGreaterThan(ARRIVAL_PEARL.radius);
  });

  it("stands the kit portal behind the pearl, scaled from its base with gather and fading with presence", () => {
    const ctx = context(fakeKit());
    const stage = ribbonStage(ctx);
    const arch = named(stage.group, STAGE_KIT.portal);
    expect(arch.position.z).toBe(STAGE_PLACEMENT.portal.z);
    // No point of the arch approaches the words from the front: whatever the camera sees ahead
    // of the disc plane keeps the full clearance, and the opening's own edges sit behind the pearl.
    const half = { x: 3.791, z: 1.453, y: 5.958 }, opening = { x: 1.605, y: 4.47 };
    let nearestInFront = Infinity;
    for (const x of [-half.x, -opening.x, 0, opening.x, half.x]) for (const y of [0, 2.2, opening.y, half.y]) for (const z of [-half.z, 0, half.z]) {
      const point = new T.Vector3(x, y, z).multiplyScalar(STAGE_PLACEMENT.portal.scale).add(arch.position);
      const clearance = pearlClearance(point);
      if (clearance.front >= 0) nearestInFront = Math.min(nearestInFront, clearance.distance);
      if (Math.abs(x) === opening.x) expect(clearance.front).toBeLessThan(0);
    }
    expect(nearestInFront).toBeGreaterThanOrEqual(ARRIVAL_PEARL.radius + ARRIVAL_PEARL.clearance);
    stage.update(pose("approach", 0), 0, on);
    expect(arch.scale.x).toBeCloseTo(STAGE_PLACEMENT.portal.scale * .72, 6);
    stage.update(pose("reading"), 1, on);
    expect(arch.scale.x).toBeCloseTo(STAGE_PLACEMENT.portal.scale, 6);
    const materials = new Set<T.Material>();
    arch.traverse(o => { const m = (o as T.Mesh).material as T.Material | undefined; if (m) materials.add(m); });
    expect(materials.size).toBe(4);
    for (const m of materials) { expect(m.transparent).toBe(true); expect(m.opacity).toBeGreaterThan(0); }
    // The kit's own imported materials were never handed out: every one is the stage's copy.
    for (const m of materials) expect(ctx.materials.has(m)).toBe(true);
    stage.update(pose("settle", 1), 2, on);
    for (const m of materials) expect(m.opacity).toBe(0);
    expect(arch.visible).toBe(false);
    stage.dispose();
  });

  it("flies six kit butterflies whose wings move only when the clock does", () => {
    const ctx = context(fakeKit());
    const stage = ribbonStage(ctx);
    const flyers = stage.group.children.filter(o => o.name === STAGE_KIT.butterfly);
    expect(flyers).toHaveLength(6);
    expect(instancedMeshes(stage.group)).toHaveLength(0);
    const wing = named(flyers[0], "wing_L");
    stage.update(pose("reading"), 0, on);
    const rest = wing.quaternion.clone();
    stage.update(pose("reading"), 0, on);
    expect(wing.quaternion.equals(rest)).toBe(true);
    stage.update(pose("reading"), .1, on);
    expect(wing.quaternion.equals(rest)).toBe(false);
    // On the orbit, outside the pearl's clearance, and hidden with trails off.
    for (const flyer of flyers) expect(Math.hypot(flyer.position.x, flyer.position.z)).toBeCloseTo(STAGE_PLACEMENT.butterfly.radius, 6);
    stage.update(pose("reading"), .2, { sparkles: true, trails: false });
    for (const flyer of flyers) expect(flyer.visible).toBe(false);
    stage.dispose();
  });

  it("flies every kit butterfly forward along its orbit from the entry group's own place in the world", () => {
    // The world parents the stage under the entry group at ENTRY_POSITION, far from the origin;
    // a heading computed in stage space would aim every butterfly at a point about 20 units
    // off and half the flock would fly backward or sideways.
    const forward = new T.Vector3(), tangent = new T.Vector3();
    for (const offset of [ENTRY_POSITION, new T.Vector3(0, 0, 0)]) {
      const ctx = context(fakeKit());
      const stage = ribbonStage(ctx);
      const entry = new T.Group();
      entry.position.copy(offset);
      entry.add(stage.group);
      stage.update(pose("reading"), .1, on);
      entry.updateMatrixWorld(true);
      const flyers = stage.group.children.filter(o => o.name === STAGE_KIT.butterfly);
      expect(flyers).toHaveLength(6);
      for (const flyer of flyers) {
        // The orbit tangent at the flyer's angle b is (-sin b, 0, cos b), read off its own position.
        tangent.set(-flyer.position.z, 0, flyer.position.x).normalize();
        flyer.getWorldDirection(forward);
        expect(forward.dot(tangent)).toBeGreaterThan(.7);
      }
      stage.dispose();
    }
  });

  it("keeps the procedural wings and no arch without the kit", () => {
    const ctx = context();
    const stage = ribbonStage(ctx);
    expect(stage.group.getObjectByName(STAGE_KIT.portal)).toBeUndefined();
    expect(instancedMeshes(stage.group).map(o => o.count)).toEqual([6]);
    stage.update(pose("reveal", .5), 0, on);
    stage.dispose();
  });
});

describe("pearl formation stage", () => {
  it("lands outside the words", () => {
    const clearance = pearlClearance(CONSTELLATION_LANDING);
    expect(clearance.distance).toBeGreaterThanOrEqual(ARRIVAL_PEARL.radius + ARRIVAL_PEARL.clearance);
  });

  it("keeps 96 points of light without the kit", () => {
    const ctx = context();
    const stage = constellationStage(ctx);
    expect(instancedMeshes(stage.group).map(o => o.count)).toEqual([96]);
    stage.update(pose("reading"), 0, on);
    stage.dispose();
  });

  it("gives every third light the kit star and turns the landing star on with the flash", () => {
    const ctx = context(fakeKit());
    const stage = constellationStage(ctx);
    const counts = instancedMeshes(stage.group).map(o => o.count).sort((a, b) => a - b);
    expect(counts).toEqual([32, 64]);
    const star = named(stage.group, STAGE_KIT.sparkle);
    stage.update(pose("approach", .5), 0, on);
    expect(star.visible).toBe(false);
    stage.update(pose("reveal", .99), 1, on);
    expect(star.visible).toBe(true);
    stage.update(pose("reading"), 2, on);
    stage.update(pose("reading"), 4, on);
    expect(star.visible).toBe(true);
    expect(star.scale.x).toBeCloseTo(STAGE_PLACEMENT.sparkle.scale * (.45 + .55 * .35), 6);
    const clearance = pearlClearance(star.position);
    expect(clearance.distance).toBeGreaterThanOrEqual(ARRIVAL_PEARL.radius + ARRIVAL_PEARL.clearance);
    // Its twinkle only advances with the clock.
    const mesh = named(star, "ConstellationSparkle");
    const held = mesh.scale.x;
    stage.update(pose("reading"), 4, on);
    expect(mesh.scale.x).toBe(held);
    stage.update(pose("reading"), 4.3, on);
    expect(mesh.scale.x).not.toBe(held);
    stage.update(pose("settle", 1), 6, on);
    expect(star.visible).toBe(false);
    stage.dispose();
  });
});
