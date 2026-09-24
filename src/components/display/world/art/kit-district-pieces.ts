import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { kitMaterialWords } from "../kit/kit-materials";
import type { DesignKitContext } from "./design-world";
import type { KitPlacement, LayoutSwarm } from "./kit-layout-core";
import {
  KIT_FAR_CELL_FACTOR, KIT_CLUSTER_CELL, type Role, type Lod, type FrameUpdate, type Baked,
  type InstancedBaked,
} from "./kit-district-measures";
import {
  kitMaterials, placementScale, isCrystal, staticRole, templateColours, bakeGroups,
  clusterGeometry,
} from "./kit-district-parts";

/** The pieces the layout builder bakes, clusters and stamps, each built once for the whole world. */
export function kitLayoutPieces(context: DesignKitContext, materials: ReturnType<typeof kitMaterials>, updates: FrameUpdate[]) {
  const { kit } = context;
  // Baked role parts per static asset (and tint), clustered copies per part and cell, and
  // instanced pieces per asset: each built once for the whole world.
  const bakedStatics = new Map<string, Baked>();
  const clustered = new Map<string, T.BufferGeometry>();
  const bakedInstanced = new Map<string, InstancedBaked>();
  const cellOf = (id: string, lod: Lod) => {
    const cell = KIT_CLUSTER_CELL[id] ?? 0.04;
    return lod === "near" ? cell : cell * KIT_FAR_CELL_FACTOR;
  };
  return { place, instancedMesh, bakeStatic, bakedInstancedPiece, clusteredCopy, butterflySwarm, clustered, cellOf };

  /** A placed clone: position, yaw and scale from the table. */
  function place(node: T.Object3D, placement: KitPlacement) {
    node.position.fromArray(placement.position);
    node.rotation.y = placement.rotationY ?? 0;
    const [sx, sy, sz] = placementScale(placement);
    node.scale.set(sx, sy, sz);
  }

  /** One `InstancedMesh` stamped from a list of placements. */
  function instancedMesh(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material | T.Material[], placements: KitPlacement[], name: string) {
    const mesh = context.instance(parent, geometry, Array.isArray(material) ? material[0] : material, placements.length);
    if (Array.isArray(material)) mesh.material = material;
    mesh.name = name;
    const at = new T.Vector3(), spin = new T.Euler();
    placements.forEach((placement, i) => {
      spin.set(0, placement.rotationY ?? 0, 0);
      context.stamp(mesh, i, at.fromArray(placement.position), placementScale(placement), spin, placement.tint);
    });
    context.finish(mesh);
    return mesh;
  }

  /**
   * A static asset baked into role parts, kit units: the merged template geometry's material
   * groups become up to four vertex coloured geometries (body, gold, glass, glow), or one
   * pieces part carrying every group when the placement is a grove piece.
   */
  function bakeStatic(id: string, tint: string | undefined, pieces: boolean): Baked {
    const key = `${id}|${tint ?? ""}|${pieces ? "pieces" : ""}`;
    const cached = bakedStatics.get(key);
    if (cached) return cached;
    const asset = kit.asset(id as never);
    const source = kit.geometry(id as never);
    const names: string[] = source.userData.kitMaterials ?? [];
    const colours = templateColours(asset);
    const tintColour = tint ? new T.Color(tint) : undefined;
    const roleOf = (slot: number): Role => (pieces ? "pieces" : staticRole(id, names[slot] ?? ""));
    const parts: Baked["parts"] = {};
    for (const role of ["body", "gold", "glass", "glow", "pieces"] as const) {
      const part = bakeGroups(source, names, colours, slot => roleOf(slot) === role, tintColour);
      if (part) { part.computeBoundingSphere(); parts[role] = context.geometry(part); }
    }
    const baked: Baked = { parts };
    bakedStatics.set(key, baked);
    return baked;
  }

  /**
   * One geometry and material set per instanced asset and lod: material colours baked into a
   * vertex colour so the asset is one draw, the piece clustered, gold kept as its own group on
   * the study gold so it still shines (except the stepping stones, whose rim tucks into the
   * floor), the lily buds their own geometry so the pond can grow one per arrival.
   */
  function bakedInstancedPiece(id: string, lod: Lod): InstancedBaked {
    const key = `${id}|${lod}`;
    const cached = bakedInstanced.get(key);
    if (cached) return cached;
    const asset = kit.asset(id as never);
    const source = kit.geometry(id as never);
    const names: string[] = source.userData.kitMaterials ?? [];
    const colours = templateColours(asset);
    const slotsOf = (word: string) => new Set(names.map((name, i) => (kitMaterialWords(name).includes(word) ? i : -1)).filter(i => i >= 0));
    const goldSlots = id === "nature.stepping-stones" ? new Set<number>() : slotsOf("gold");
    const budSlots = id === "nature.lily-pads" ? slotsOf("petal") : new Set<number>();
    const cell = cellOf(id, lod);
    const parts: T.BufferGeometry[] = [];
    const list: T.Material[] = [];
    const bodyMaterial = isCrystal(id) ? materials.crystal : id.startsWith("nature.stepping") ? materials.inlay : id.startsWith("people.") ? materials.figure : /^(core|expression)\./.test(id) ? materials.piece : materials.flora;
    const body = bakeGroups(source, names, colours, i => !goldSlots.has(i) && !budSlots.has(i));
    if (body) { parts.push(clusterGeometry(body, cell)); body.dispose(); list.push(bodyMaterial); }
    if (goldSlots.size) {
      const gold = bakeGroups(source, names, colours, i => goldSlots.has(i));
      if (gold) { parts.push(clusterGeometry(gold, cell)); gold.dispose(); list.push(context.palette.gold); }
    }
    let geometry: T.BufferGeometry;
    if (parts.length === 1) geometry = parts[0];
    else {
      const merged = mergeGeometries(parts, true) ?? parts[0];
      merged.groups.forEach((group, i) => { group.materialIndex = i; });
      parts.forEach(part => { if (part !== merged) part.dispose(); });
      geometry = merged;
    }
    geometry.computeBoundingSphere();
    context.geometry(geometry);
    const piece: InstancedBaked = { geometry, material: list.length === 1 ? list[0] : list };
    if (budSlots.size) {
      const buds = bakeGroups(source, names, colours, i => budSlots.has(i));
      if (buds) { const small = clusterGeometry(buds, cell); buds.dispose(); small.computeBoundingSphere(); piece.buds = context.geometry(small); }
    }
    bakedInstanced.set(key, piece);
    return piece;
  }

  /** A fresh copy of a baked part clustered at `cell`, from a per part cache. */
  function clusteredCopy(geometry: T.BufferGeometry, cell: number) {
    const key = `${geometry.uuid}:${cell}`;
    let cached = clustered.get(key);
    if (!cached) { cached = clusterGeometry(geometry, cell); clustered.set(key, cached); }
    return cached.clone();
  }

  /**
   * Kit butterflies (a skinned file) as one rigid instanced piece at the bind pose on a helix
   * around the gate, turning once a minute, each wing folding on its own beat (design 6.4).
   */
  function butterflySwarm(swarm: LayoutSwarm, parent: T.Object3D): T.InstancedMesh | undefined {
    const asset = kit.asset(swarm.id as never);
    if (!asset) return undefined;
    const colours = templateColours(asset);
    const parts: T.BufferGeometry[] = [];
    asset.template.updateMatrixWorld(true);
    asset.template.traverse(object => {
      if (!(object as T.Mesh).isMesh) return;
      const mesh = object as T.Mesh;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const part = bakeGroups(mesh.geometry, [material.name], colours, () => true);
      if (part) { part.applyMatrix4(mesh.matrixWorld); parts.push(part); }
    });
    if (!parts.length) return undefined;
    const geometry = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!geometry) return undefined;
    geometry.computeBoundingSphere();
    context.geometry(geometry);
    const mesh = context.instance(parent, geometry, materials.wing, swarm.count);
    mesh.name = `Kit butterflies x${swarm.count}`;
    const at = new T.Vector3(), spin = new T.Euler(), size: [number, number, number] = [1, 1, 1];
    const stamp = (time: number) => {
      for (let i = 0; i < swarm.count; i++) {
        const u = i / swarm.count;
        const a = (u + time / swarm.turnSeconds) * Math.PI * 2 * 1.5;
        const r = swarm.radius[0] + (swarm.radius[1] - swarm.radius[0]) * (((i * 7) % swarm.count) / swarm.count);
        at.set(swarm.center[0] + Math.sin(a) * r, swarm.center[1] + swarm.height[0] + (swarm.height[1] - swarm.height[0]) * u + Math.sin(time * 1.3 + i) * 0.3, swarm.center[2] + Math.cos(a) * r);
        const fold = 0.45 + 0.55 * Math.abs(Math.cos(time * 9 + i * 1.7));
        size[0] = swarm.scale * fold; size[1] = swarm.scale; size[2] = swarm.scale;
        spin.set(0.35, a + Math.PI / 2, Math.sin(time * 2 + i) * 0.3);
        context.stamp(mesh, i, at, size, spin);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    stamp(0);
    context.finish(mesh);
    updates.push(stamp);
    return mesh;
  }
}
