import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { ArrivalState } from "../arrival-director";
import type { ZoneId } from "../world-data";
import { looping, scrubbed } from "../kit/kit-clips";
import type { KitAsset } from "../kit/kit-loader";
import { createKitRemap, kitMaterialWords, type MaterialRemap } from "../kit/kit-materials";
import type { DesignKitContext, DesignKitDistrict, KitBuilderHandle } from "./design-world";
import { CORE_ZONE_LAYOUTS, KIT_BOUNDS, type KitPlacement, type ZoneLayout } from "./kit-layout-core";
import { studyGlass } from "./study-materials";

/**
 * The thirteen districts dressed with the 3D Studio kit (WORLD-INTEGRATION section 6).
 *
 * Owned by lane K3a: the builder, with the near zone tables in `kit-layout-core.ts`. Lane
 * K3b's far zone tables (`kit-layout-far.ts`) use the same shape and join `KIT_ZONE_LAYOUTS`
 * below with one import once both lanes have landed.
 *
 * The design world calls `applyKitDistricts` once, with a kit, after every procedural piece
 * exists and before the falls merge and the static batch. Every placement comes from a table:
 *
 * - `static` pieces are cloned, remapped to the study's shared materials and merged here, one
 *   mesh per material per district, under a group the study batcher leaves alone (it is marked
 *   `dynamic`), so a district's whole kit dressing costs a handful of draws and the detail
 *   groups can still be hidden by distance.
 * - `instanced` pieces share one `InstancedMesh` per asset per district. Flora has its
 *   authored material colours baked into one vertex colour attribute and, for the heavy
 *   bushes, its vertices clustered to a small grid at load, so a bed of rose bushes is one
 *   draw of a few thousand triangles instead of five draws of a hundred thousand.
 * - `animated` pieces are clones on their own mixer: scrubbed to a fraction (a still frame is
 *   complete) or looping on the world delta (nothing moves in a still capture).
 *
 * A placement whose kit id is missing (`kit.has(id)` false) is skipped and the procedural
 * piece it would replace stays, which is Plan 24 P2's fallback made concrete. Every geometry,
 * material and texture goes through the context registrars so the world's `dispose()` reaches
 * it. Kit assets carry no text: the only words in the world stay on the pearl's face disc.
 */

/** Every zone table the builder places. Lane K3b's far zones join here: `...FAR_ZONE_LAYOUTS`. */
export const KIT_ZONE_LAYOUTS: readonly ZoneLayout[] = [...CORE_ZONE_LAYOUTS];

/** Kit detail groups hide past this distance from their district centre (design 7.2). */
export const KIT_DETAIL_DISTANCE = { high: 140, auto: 110, low: 70 } as const;

/**
 * Vertex clustering cell, kit units, for pieces far too dense for a TV. From the tour eye a
 * kit unit spans about 30 px at 1080p, so a cell of .03 to .07 is one or two pixels; the
 * clustered piece reads as the authored one and costs a third to a half of its triangles.
 */
export const KIT_CLUSTER_CELL: Readonly<Record<string, number>> = {
  "nature.rose-bush": 0.07,
  "nature.hydrangea-bush": 0.07,
  "nature.lily-pads": 0.04,
  "nature.blossom-tree-a": 0.05,
  "nature.blossom-tree-b": 0.05,
  "nature.blossom-tree-c": 0.05,
  "landmark.pearl-arch": 0.03,
  "landmark.lantern-post": 0.02,
  "landmark.garden-bench": 0.02,
};

/** The pond's lily buds: two at rest, one more after every arrival, never more than seven. */
export const LILY_BUDS = { rest: 2, cap: 7 } as const;

export function applyKitDistricts(context: DesignKitContext): KitBuilderHandle | void {
  return applyKitLayouts(context, KIT_ZONE_LAYOUTS);
}

type Baked = { geometry: T.BufferGeometry; material: T.Material | T.Material[]; buds?: T.BufferGeometry };
type StaticBucket = { parent: T.Group; meshes: T.Mesh[] };
type FrameUpdate = (time: number, zone: ZoneId, arrival: ArrivalState | undefined) => void;

/** Builds every layout it is given. Exported so a test or the coordinator can pass another set. */
export function applyKitLayouts(context: DesignKitContext, layouts: readonly ZoneLayout[]): KitBuilderHandle | void {
  const { kit, scene } = context;
  const { remap, glass } = districtRemap(context);
  const flora = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .62, sheen: .28, sheenColor: new T.Color("#ffe6ec"), dithering: true }));
  flora.name = "kit flora";
  const inlay = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .32, metalness: .05, clearcoat: .5, clearcoatRoughness: .3, dithering: true }));
  inlay.name = "kit inlay";
  const baked = new Map<string, Baked>();
  const updates: FrameUpdate[] = [];
  const disposers: Array<() => void> = [];
  const details: Array<{ group: T.Group; center: T.Vector3 }> = [];
  const effectObjects: Array<{ object: T.Object3D; kind: "sparkles" | "trails" }> = [];
  const stats: Record<string, { placed: number; skipped: string[]; draws: number; triangles: number }> = {};
  // Clustered copies of a template mesh's geometry, once per geometry and cell.
  const clustered = new Map<string, T.BufferGeometry>();
  const triangles = (geometry: T.BufferGeometry, instances = 1) => ((geometry.index ? geometry.index.count : geometry.getAttribute("position").count) / 3) * instances;

  for (const layout of layouts) {
    const district = context.districts.get(layout.zone);
    if (!district) continue;
    const zoneStats = { placed: 0, skipped: [] as string[], draws: 0, triangles: 0 };
    stats[layout.zone] = zoneStats;
    const frames = new Map<string, T.Group>();
    const frameGroup = (frame: KitPlacement["frame"] = "layout") => {
      let group = frames.get(frame);
      if (group) return group;
      group = new T.Group();
      group.name = `Kit ${layout.zone} ${frame}`;
      // The study batcher skips this subtree: its statics are merged here already.
      group.userData.dynamic = true;
      const parent = frame === "root" ? district.root : frame === "arcade" ? context.sanctuary.arcade : district.layout;
      parent.add(group);
      frames.set(frame, group);
      return group;
    };
    let detail: T.Group | undefined;
    const detailGroup = () => {
      if (detail) return detail;
      detail = new T.Group();
      detail.name = `Kit ${layout.zone} detail`;
      frameGroup("layout").add(detail);
      details.push({ group: detail, center: new T.Vector3().fromArray(district.zone.center) });
      return detail;
    };
    const statics = new Map<string, StaticBucket>();
    const instanced = new Map<string, KitPlacement[]>();
    let landmarkRemoved = false;

    for (const placement of layout.placements) {
      if (!kit.has(placement.id as never)) { zoneStats.skipped.push(placement.id); continue; }
      zoneStats.placed++;
      const role = placement.role ?? defaultRole(placement);
      if (placement.replaces === "landmark" && !landmarkRemoved) {
        landmarkRemoved = true;
        removeLandmark(context, district);
      }
      if (role === "instanced") {
        const list = instanced.get(placement.id) ?? [];
        list.push(placement);
        instanced.set(placement.id, list);
        continue;
      }
      const parent = placement.detail ? detailGroup() : frameGroup(placement.frame);
      const node = kit.instance(placement.id as never, remap);
      node.name = `Kit ${placement.id}`;
      place(node, placement);
      parent.add(node);
      if (placement.contact) context.contact(district.layout, placement.position[0], placement.position[2], placement.contact[0], placement.contact[1]);
      if (placement.replaces === "arch") replaceArch(context, district, placement, node);
      if (role === "animated") {
        node.userData.dynamic = true;
        node.traverse(object => {
          if (!(object as T.Mesh).isMesh) return;
          const mesh = object as T.Mesh;
          mesh.castShadow = true;
          mesh.frustumCulled = false;
          if (isGlowName(materialNames(mesh))) mesh.layers.enable(1);
          zoneStats.draws += Array.isArray(mesh.material) ? mesh.material.length : 1;
          zoneStats.triangles += triangles(mesh.geometry);
        });
        const asset = kit.asset(placement.id as never);
        const clip = placement.clip && asset ? asset.clips.get(placement.clip.name) : undefined;
        if (clip && placement.clip) {
          if (placement.clip.loop) {
            const mixer = looping(node, clip, placement.clip.rate ?? 1);
            let last = 0;
            updates.push(time => { mixer.update(Math.max(0, time - last)); last = time; });
            disposers.push(() => { mixer.stopAllAction(); mixer.uncacheRoot(node); });
          } else {
            const scrub = scrubbed(node, clip);
            scrub.set(placement.clip.at ?? 1);
            disposers.push(() => scrub.dispose());
          }
        }
        continue;
      }
      // Static: collect the clone's meshes for the per material merge below.
      node.traverse(object => {
        if (!(object as T.Mesh).isMesh || (object as T.SkinnedMesh).isSkinnedMesh) return;
        const mesh = object as T.Mesh;
        mesh.userData.kitCell = KIT_CLUSTER_CELL[placement.id];
        const key = `${parent.uuid}:${materialKey(mesh.material)}:${Object.keys(mesh.geometry.attributes).sort().join()}`;
        const bucket = statics.get(key) ?? { parent, meshes: [] };
        bucket.meshes.push(mesh);
        statics.set(key, bucket);
      });
    }

    // Instanced pieces: one mesh per asset per district, baked and clustered once per asset.
    for (const [id, placements] of instanced) {
      const piece = bakedPiece(id);
      const parent = placements.some(p => p.detail) ? detailGroup() : frameGroup("layout");
      const mesh = instancedMesh(parent, piece.geometry, piece.material, placements, `Kit ${layout.zone} ${id} x${placements.length}`);
      zoneStats.draws += Array.isArray(piece.material) ? piece.material.length : 1;
      zoneStats.triangles += triangles(piece.geometry, placements.length);
      if (piece.buds) {
        const buds = instancedMesh(parent, piece.buds, flora, placements, `Kit ${layout.zone} ${id} buds`);
        buds.count = Math.min(LILY_BUDS.rest, placements.length);
        zoneStats.draws++;
        zoneStats.triangles += triangles(piece.buds, buds.count);
        scene.userData.studyLilyBuds = buds.count;
        let phase: ArrivalState["phase"] = "idle";
        updates.push((_time, _zone, arrival) => {
          const stored = typeof scene.userData.studyLilyBuds === "number" ? scene.userData.studyLilyBuds : LILY_BUDS.rest;
          let count = Math.min(LILY_BUDS.cap, Math.max(0, Math.floor(stored)));
          const next = arrival?.phase ?? "idle";
          if (next === "settle" && phase !== "settle") count = Math.min(LILY_BUDS.cap, count + 1);
          phase = next;
          scene.userData.studyLilyBuds = count;
          buds.count = Math.min(count, placements.length);
        });
      }
      void mesh;
    }

    // Statics: merge per material into the group they were placed in.
    district.root.updateMatrixWorld(true);
    for (const bucket of statics.values()) {
      const merged = mergeStatics(bucket, layout.zone);
      if (merged) { zoneStats.draws++; zoneStats.triangles += triangles(merged.geometry); }
    }

    // Pools: a shallow disc of the study water on the terrace top, with a thin gold rim.
    for (const pool of layout.pools ?? []) {
      const disc = context.mesh(district.layout, context.geometry(new T.CircleGeometry(pool.radius, 72)), context.palette.water, [pool.center[0], pool.center[1], pool.center[2]]);
      disc.rotation.x = -Math.PI / 2;
      disc.name = `Kit ${layout.zone} pool`;
      disc.layers.enable(1);
      zoneStats.draws++;
      if (pool.rim) {
        const rim = context.ring(district.layout, pool.radius + 0.12, pool.center[1] + 0.02, 0.05);
        rim.position.x = pool.center[0]; rim.position.z = pool.center[2];
      }
    }
  }

  // Per district counts of what the kit added (placements, main pass draws and triangles),
  // for the performance lane's rendering details and for a capture script to read.
  scene.userData.kitDistricts = stats;
  const cameraAt = new T.Vector3();
  return {
    update(time, zone, arrival) {
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      const lowTier = scene.userData.lowTier === true;
      if (camera) {
        cameraAt.copy(camera.position);
        const limit = lowTier ? KIT_DETAIL_DISTANCE.low : scene.userData.studyTier === "high" ? KIT_DETAIL_DISTANCE.high : KIT_DETAIL_DISTANCE.auto;
        for (const item of details) item.group.visible = cameraAt.distanceTo(item.center) < limit;
      }
      for (const fn of updates) fn(time, zone, arrival);
    },
    setEffects(sparkles, trails) {
      for (const item of effectObjects) item.object.visible = item.kind === "sparkles" ? sparkles : trails;
    },
    dispose() {
      disposers.forEach(fn => fn());
      disposers.length = 0;
    },
  };

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
   * One geometry and material set per instanced asset: material colours baked into a vertex
   * colour so the asset is one draw, the heavy pieces clustered, gold kept as its own group on
   * the study gold so it still shines, glass on the study glass.
   */
  function bakedPiece(id: string): Baked {
    const cached = baked.get(id);
    if (cached) return cached;
    const asset = kit.asset(id as never);
    const source = kit.geometry(id as never);
    const names: string[] = source.userData.kitMaterials ?? [];
    const colours = templateColours(asset);
    const slotsOf = (word: string) => new Set(names.map((name, i) => (kitMaterialWords(name).includes(word) ? i : -1)).filter(i => i >= 0));
    const goldSlots = slotsOf("gold"), glassSlots = slotsOf("glass");
    // The lily pads' buds are their own instanced draw, so the pond can grow one per arrival.
    const budSlots = id === "nature.lily-pads" ? slotsOf("petal") : new Set<number>();
    const cell = KIT_CLUSTER_CELL[id];
    const parts: T.BufferGeometry[] = [];
    const materials: T.Material[] = [];
    const body = bakeGroups(source, names, colours, i => !goldSlots.has(i) && !glassSlots.has(i) && !budSlots.has(i));
    if (body) {
      parts.push(cell ? clusterGeometry(body, cell) : body);
      if (cell) body.dispose();
      materials.push(id.startsWith("nature.stepping") ? inlay : flora);
    }
    if (goldSlots.size) {
      const gold = bakeGroups(source, names, colours, i => goldSlots.has(i));
      if (gold) { parts.push(gold); materials.push(context.palette.gold); }
    }
    if (glassSlots.size) {
      const glassPart = bakeGroups(source, names, colours, i => glassSlots.has(i));
      if (glassPart) { parts.push(glassPart); materials.push(glass); }
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
    const piece: Baked = { geometry, material: materials.length === 1 ? materials[0] : materials };
    if (budSlots.size) {
      const buds = bakeGroups(source, names, colours, i => budSlots.has(i));
      if (buds) { buds.computeBoundingSphere(); piece.buds = context.geometry(buds); }
    }
    baked.set(id, piece);
    return piece;
  }

  /** Statics of one material and attribute set become one mesh in their group. */
  function mergeStatics(bucket: StaticBucket, zone: ZoneId): T.Mesh | null {
    const { parent, meshes } = bucket;
    if (!meshes.length) return null;
    const inverse = parent.matrixWorld.clone().invert();
    const copies = meshes.map(mesh => {
      const cell = mesh.userData.kitCell as number | undefined;
      const copy = cell ? clusteredCopy(mesh.geometry, cell) : mesh.geometry.clone();
      copy.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      return copy;
    });
    const merged = mergeGeometries(copies, false);
    copies.forEach(copy => copy.dispose());
    meshes.forEach(mesh => mesh.removeFromParent());
    if (!merged) return null;
    const material = meshes[0].material as T.Material;
    const out = new T.Mesh(context.geometry(merged), material);
    out.name = `Kit ${zone} merged ${material.name || material.type}`;
    out.castShadow = true;
    out.receiveShadow = !material.transparent;
    if (isGlowName([material.name])) out.layers.enable(1);
    parent.add(out);
    return out;
  }

  /** A fresh copy of a template geometry clustered at `cell`, from a per geometry cache. */
  function clusteredCopy(geometry: T.BufferGeometry, cell: number) {
    const key = `${geometry.uuid}:${cell}`;
    let cached = clustered.get(key);
    if (!cached) { cached = clusterGeometry(geometry, cell); clustered.set(key, cached); disposers.push(() => cached!.dispose()); }
    return cached.clone();
  }
}

function placementScale(placement: KitPlacement): [number, number, number] {
  return placement.scaleXYZ ?? [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];
}

/** Bushes, stones, pads, crystals, pieces and the little core shapes repeat; the rest stands once. */
function defaultRole(placement: KitPlacement): "static" | "animated" | "instanced" {
  if (placement.clip) return "animated";
  const id = placement.id;
  if (/^nature\.(rose|hydrangea|lily|stepping|crystal)/.test(id)) return "instanced";
  if (/^(core|expression|people)\./.test(id)) return "instanced";
  return "static";
}

function materialNames(mesh: T.Mesh): string[] {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material.name);
}
function materialKey(material: T.Material | T.Material[]) {
  return (Array.isArray(material) ? material : [material]).map(item => item.uuid).join("+");
}
function isGlowName(names: string[]) {
  return names.some(name => { const words = new Set(kitMaterialWords(name)); return words.has("glow") || words.has("halo") || words.has("flame"); });
}

/**
 * The remap for district pieces: the study's shared materials by role (`kit-materials.ts`),
 * bark and trunks on the study's rose gold like the cotton trees, glass on the study glass.
 */
function districtRemap(context: DesignKitContext): { remap: MaterialRemap; glass: T.Material } {
  const { palette } = context;
  const glass = context.material(studyGlass(.3));
  glass.name = "kit glass";
  const base = createKitRemap({
    ivory: palette.ivory, gold: palette.gold, stone: palette.stone, leaf: palette.leaf, lawn: palette.lawn,
    bloom: palette.bloom, silk: palette.silk, water: palette.water, glass: () => glass,
  });
  const remap: MaterialRemap = (name, imported) => {
    const words = kitMaterialWords(name);
    if (words.includes("bark") || words.includes("trunk")) return palette.roseGold;
    return base(name, imported);
  };
  return { remap, glass };
}

/** The procedural landmark pieces of a district go, with their waterfalls and any arch crown. */
function removeLandmark(context: DesignKitContext, district: DesignKitDistrict) {
  for (const object of district.landmark.slice()) {
    const arch = district.arches.find(record => record.root === object);
    if (arch?.crown) {
      const at = context.archCrowns.indexOf(arch.crown);
      if (at >= 0) context.archCrowns.splice(at, 1);
      arch.crown = null;
    }
    if ((object as T.Mesh).isMesh && district.falls.includes(object as T.Mesh)) { context.removeFall(object as T.Mesh); continue; }
    object.removeFromParent();
  }
  district.landmark.length = 0;
}

/** A kit arch stands where a procedural one stood; the keystone lantern moves with it. */
function replaceArch(context: DesignKitContext, district: DesignKitDistrict, placement: KitPlacement, node: T.Object3D) {
  const list = placement.frame === "arcade" ? context.sanctuary.arches : district.arches;
  const record = list[placement.arch ?? -1];
  if (!record) return;
  record.root.removeFromParent();
  if (record.crown) {
    record.crown.root = node as T.Group;
    // In the node's own units: the scale on the node lifts it to the placed height.
    record.crown.height = KIT_BOUNDS[placement.id]?.max[1] ?? record.crown.height;
  }
  const at = district.landmark.indexOf(record.root);
  if (at >= 0) district.landmark.splice(at, 1);
}

/** Linear base colours of a template's materials, by name. */
function templateColours(asset: KitAsset | undefined): Map<string, T.Color> {
  const out = new Map<string, T.Color>();
  asset?.template.traverse(object => {
    if (!(object as T.Mesh).isMesh) return;
    const material = (object as T.Mesh).material;
    for (const item of Array.isArray(material) ? material : [material]) {
      const colour = (item as T.MeshStandardMaterial).color;
      out.set(item.name, colour ? colour.clone() : new T.Color(1, 1, 1));
    }
  });
  return out;
}

/**
 * The picked groups of a merged kit geometry as one indexed geometry with a `color`
 * attribute: the file's vertex colour (or white) times the material's base colour, so one
 * `vertexColors` material draws what several materials drew.
 */
export function bakeGroups(source: T.BufferGeometry, names: string[], colours: Map<string, T.Color>, pick: (slot: number) => boolean): T.BufferGeometry | null {
  const position = source.getAttribute("position"), normal = source.getAttribute("normal"), colour = source.getAttribute("color");
  const index = source.index;
  if (!index || !position) return null;
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], indices: number[] = [];
  const groups = source.groups.length ? source.groups : [{ start: 0, count: index.count, materialIndex: 0 }];
  for (const group of groups) {
    const slot = group.materialIndex ?? 0;
    if (!pick(slot)) continue;
    const tint = colours.get(names[slot]) ?? new T.Color(1, 1, 1);
    const map = new Map<number, number>();
    const end = Number.isFinite(group.count) ? group.start + group.count : index.count;
    for (let i = group.start; i < end; i++) {
      const vertex = index.getX(i);
      let next = map.get(vertex);
      if (next === undefined) {
        next = positions.length / 3;
        map.set(vertex, next);
        positions.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
        if (normal) normals.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
        const r = colour ? colour.getX(vertex) : 1, g = colour ? colour.getY(vertex) : 1, b = colour ? colour.getZ(vertex) : 1;
        colors.push(r * tint.r, g * tint.g, b * tint.b);
      }
      indices.push(next);
    }
  }
  if (!indices.length) return null;
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  if (normals.length) out.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  out.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  out.setIndex(indices);
  if (!normals.length) out.computeVertexNormals();
  return out;
}

/**
 * Vertex clustering: every vertex snaps to the average of its grid cell and triangles that
 * collapse are dropped. Linear time and deterministic; at the size a bush has on a TV from
 * the tour eye the result reads as the authored mesh.
 */
export function clusterGeometry(source: T.BufferGeometry, cell: number): T.BufferGeometry {
  const position = source.getAttribute("position"), normal = source.getAttribute("normal"), colour = source.getAttribute("color");
  const index = source.index;
  const count = position.count;
  const cells = new Map<string, number>();
  const cellOf = new Int32Array(count);
  const sums: number[] = [], counts: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const key = `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    let id = cells.get(key);
    if (id === undefined) { id = counts.length; cells.set(key, id); counts.push(0); for (let k = 0; k < 9; k++) sums.push(0); }
    cellOf[i] = id;
    counts[id]++;
    const o = id * 9;
    sums[o] += x; sums[o + 1] += y; sums[o + 2] += z;
    if (normal) { sums[o + 3] += normal.getX(i); sums[o + 4] += normal.getY(i); sums[o + 5] += normal.getZ(i); }
    if (colour) { sums[o + 6] += colour.getX(i); sums[o + 7] += colour.getY(i); sums[o + 8] += colour.getZ(i); }
  }
  const positions = new Float32Array(counts.length * 3), normals = new Float32Array(counts.length * 3), colors = new Float32Array(counts.length * 3);
  for (let id = 0; id < counts.length; id++) {
    const n = counts[id], o = id * 9;
    positions[id * 3] = sums[o] / n; positions[id * 3 + 1] = sums[o + 1] / n; positions[id * 3 + 2] = sums[o + 2] / n;
    const nx = sums[o + 3], ny = sums[o + 4], nz = sums[o + 5], length = Math.hypot(nx, ny, nz) || 1;
    normals[id * 3] = nx / length; normals[id * 3 + 1] = ny / length; normals[id * 3 + 2] = nz / length;
    colors[id * 3] = sums[o + 6] / n; colors[id * 3 + 1] = sums[o + 7] / n; colors[id * 3 + 2] = sums[o + 8] / n;
  }
  const triangles = index ? index.count / 3 : Math.floor(count / 3);
  const indices: number[] = [];
  const read = (i: number) => (index ? index.getX(i) : i);
  for (let t = 0; t < triangles; t++) {
    const a = cellOf[read(t * 3)], b = cellOf[read(t * 3 + 1)], c = cellOf[read(t * 3 + 2)];
    if (a === b || b === c || a === c) continue;
    indices.push(a, b, c);
  }
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(positions, 3));
  if (normal) out.setAttribute("normal", new T.BufferAttribute(normals, 3));
  if (colour) out.setAttribute("color", new T.BufferAttribute(colors, 3));
  out.setIndex(indices);
  if (!normal) out.computeVertexNormals();
  return out;
}
