import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { ArrivalState } from "../arrival-director";
import type { ZoneId } from "../world-data";
import { looping, scrubbed } from "../kit/kit-clips";
import type { KitAsset } from "../kit/kit-loader";
import { createKitRemap, kitMaterialWords, type MaterialRemap } from "../kit/kit-materials";
import type { DesignKitContext, DesignKitDistrict, KitBuilderHandle } from "./design-world";
import { CORE_ZONE_LAYOUTS, KIT_BOUNDS, type KitPlacement, type LayoutSwarm, type ZoneLayout } from "./kit-layout-core";
import { studyTerrace } from "./study-geometry";
import { studyGlass, studyGlow, studyRim } from "./study-materials";

/**
 * The thirteen districts dressed with the 3D Studio kit (WORLD-INTEGRATION section 6).
 *
 * Owned by lane K3a: the builder, with the near zone tables in `kit-layout-core.ts`. Lane
 * K3b's far zone tables (`kit-layout-far.ts`) use the same shape and join `KIT_ZONE_LAYOUTS`
 * below with one import once both lanes have landed.
 *
 * The design world calls `applyKitDistricts` once, with a kit, after every procedural piece
 * exists and before the falls merge and the static batch. Every placement comes from a table,
 * and the builder is sized against the measured budget of design 7.2 (K0's Garden main pass
 * is 340 calls and 1.29M triangles; the kit may add 40 calls and .2M triangles there, and
 * 53 calls across every pass, which the shadow pass makes a whole world figure):
 *
 * - `static` pieces are baked into vertex colours and merged per district into four buckets
 *   by material role: body (everything the file coloured), gold (the study's metal so the
 *   trim still shines), glass (the pearl glass of a dome) and glow (lamps, flames, the
 *   globe's sea, on the radiance layer). A district's whole static dressing is two to four
 *   draws whatever it holds, and only the body casts a shadow.
 * - `instanced` pieces share one `InstancedMesh` per asset per district, the heavy bushes
 *   clustered to a coarse grid, without shadows.
 * - Every merge and every instanced asset exists twice, a near and a far version clustered
 *   three times coarser, toggled by the camera's distance to the district centre, so the
 *   three districts inside the Garden frustum cost a fraction of their near triangles.
 * - `animated` pieces are clones on their own mixer: scrubbed to a fraction (a still frame is
 *   complete) or looping on the world delta (nothing moves in a still capture).
 * - The grove's nine expression pieces are one merged mesh whose vertex shader bobs each
 *   piece about its own pivot and lifts and turns the selected one (design 6.8).
 *
 * A placement whose kit id is missing (`kit.has(id)` false) is skipped and the procedural
 * piece it would replace stays, which is Plan 24 P2's fallback made concrete. Every geometry,
 * material and texture goes through the context registrars so the world's `dispose()` reaches
 * it. Kit assets carry no text: the only words in the world stay on the pearl's face disc.
 */

/** Every near zone table the builder places. The six far zones render through applyKitFarZones in kit-far-zones.ts (coordinator ruling at integration, 2026-09-23), so each zone renders exactly once. */
export const KIT_ZONE_LAYOUTS: readonly ZoneLayout[] = [...CORE_ZONE_LAYOUTS];

/** Kit detail groups hide past this distance from their district centre (design 7.2). */
export const KIT_DETAIL_DISTANCE = { high: 140, auto: 110, low: 70 } as const;
/** People (static Plan 01 figures) hide beyond the neighbors' distance (design 7.5). */
export const KIT_NEAR_DISTANCE = 72;
/** A district shows its far merges once the camera is this far from its centre (with hysteresis). */
export const KIT_LOD_DISTANCE = { far: 42, near: 38 } as const;
/** Far merges are clustered this many times coarser than the near ones. */
export const KIT_FAR_CELL_FACTOR = 3;

/**
 * Vertex clustering cell, kit units, per piece. From the tour eye a kit unit spans about 30
 * px at 1080p, so a cell of .05 is under two pixels; the clustered piece reads as the
 * authored one at a fraction of its triangles (measured: a rose bush 16k to 3k at .1, an
 * arch 17.5k to 4.6k at .07, the pavilion 46k to 24k at .05).
 */
export const KIT_CLUSTER_CELL: Readonly<Record<string, number>> = {
  "nature.rose-bush": 0.1,
  "nature.hydrangea-bush": 0.1,
  "nature.lily-pads": 0.1,
  "nature.stepping-stones": 0.07,
  "nature.blossom-tree-a": 0.1,
  "nature.blossom-tree-b": 0.1,
  "nature.blossom-tree-c": 0.1,
  "nature.crystal-pink": 0.05,
  "nature.crystal-lavender": 0.05,
  "nature.crystal-blue": 0.05,
  "landmark.pearl-arch": 0.07,
  "landmark.pearl-column": 0.05,
  "landmark.garden-bench": 0.05,
  "landmark.lantern-post": 0.05,
  "landmark.stone-tablet": 0.03,
  "landmark.pearl-stairs": 0.05,
  "landmark.pearl-pavilion-horseshoe": 0.05,
  "landmark.pearl-pavilion": 0.05,
  "landmark.gazebo-glass": 0.05,
  "landmark.peace-globe": 0.05,
  "landmark.filigree-railing": 0.05,
  "landmark.pool-fountain": 0.05,
  "arrival.butterfly-gate": 0.04,
  "core.heart": 0.07,
  "core.pearl": 0.07,
  "core.flower": 0.07,
  "expression.01-hello-bubble": 0.05,
  "expression.02-gift-box": 0.05,
  "expression.03-mended-heart": 0.05,
  "expression.04-comfort-cloud": 0.05,
  "expression.05-open-door": 0.05,
  "expression.06-teacup": 0.05,
  "expression.07-candle": 0.05,
  "expression.08-helping-hand": 0.05,
  "expression.09-star": 0.05,
  "people.child": 0.05,
  "people.mother": 0.05,
  "people.father": 0.05,
  "people.teenager": 0.05,
  "people.grandmother": 0.05,
  "people.grandfather": 0.05,
};

/** The pond's lily buds: two at rest, one more after every arrival, never more than seven. */
export const LILY_BUDS = { rest: 2, cap: 7 } as const;

export function applyKitDistricts(context: DesignKitContext): KitBuilderHandle | void {
  return applyKitLayouts(context, KIT_ZONE_LAYOUTS);
}

type Role = "body" | "gold" | "glass" | "glow" | "pieces";
type Lod = "near" | "far";
type FrameUpdate = (time: number, zone: ZoneId, arrival: ArrivalState | undefined) => void;
/** One object whose visibility the district state decides every frame. */
type LodItem = { object: T.Object3D; lod?: Lod; detail?: boolean | "near"; effect?: "sparkles" | "trails" };
type DistrictState = { center: T.Vector3; far: boolean; items: LodItem[] };
type Baked = { parts: Partial<Record<Role, T.BufferGeometry>> };
type InstancedBaked = { geometry: T.BufferGeometry; material: T.Material | T.Material[]; buds?: T.BufferGeometry };
type ZoneStats = { placed: number; skipped: string[]; draws: number; triangles: number; farTriangles: number };

/** Builds every layout it is given. Exported so a test or the coordinator can pass another set. */
export function applyKitLayouts(context: DesignKitContext, layouts: readonly ZoneLayout[]): KitBuilderHandle | void {
  const { kit, scene } = context;
  const materials = kitMaterials(context);
  const remap = animatedRemap(context, materials);
  const updates: FrameUpdate[] = [];
  const disposers: Array<() => void> = [];
  const states: DistrictState[] = [];
  const stats: Record<string, ZoneStats> = {};
  const effects = { sparkles: true, trails: true };
  // Baked role parts per static asset (and tint), clustered copies per part and cell, and
  // instanced pieces per asset: each built once for the whole world.
  const bakedStatics = new Map<string, Baked>();
  const clustered = new Map<string, T.BufferGeometry>();
  const bakedInstanced = new Map<string, InstancedBaked>();
  const triangles = (geometry: T.BufferGeometry, instances = 1) => ((geometry.index ? geometry.index.count : geometry.getAttribute("position").count) / 3) * instances;
  const cellOf = (id: string, lod: Lod) => {
    const cell = KIT_CLUSTER_CELL[id] ?? 0.04;
    return lod === "near" ? cell : cell * KIT_FAR_CELL_FACTOR;
  };
  const selected = () => (typeof scene.userData.studyExpression === "number" ? (scene.userData.studyExpression as number) : -1);
  const invalidate = () => scene.userData.invalidate?.();

  for (const layout of layouts) {
    const district = context.districts.get(layout.zone);
    if (!district) continue;
    const zoneStats: ZoneStats = { placed: 0, skipped: [], draws: 0, triangles: 0, farTriangles: 0 };
    stats[layout.zone] = zoneStats;
    const state: DistrictState = { center: new T.Vector3().fromArray(district.zone.center), far: false, items: [] };
    states.push(state);
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
    // Static parts per frame, role and lod, already in the frame's own space.
    const buckets = new Map<string, { group: T.Group; role: Role; lod: Lod; detail?: boolean | "near"; parts: T.BufferGeometry[] }>();
    const bucket = (group: T.Group, role: Role, lod: Lod, detail?: boolean | "near") => {
      const key = `${group.uuid}:${role}:${lod}:${detail ?? ""}`;
      let item = buckets.get(key);
      if (!item) { item = { group, role, lod, detail, parts: [] }; buckets.set(key, item); }
      return item;
    };
    const instanced = new Map<string, { group: T.Group; placements: KitPlacement[] }>();
    const icons: Array<{ placement: KitPlacement; group: T.Group }> = [];
    const pivots: Array<{ slot: number; at: T.Vector3; group: T.Group; halo?: KitPlacement["halo"] }> = [];
    let landmarkRemoved = false;
    const matrix = new T.Matrix4(), quaternion = new T.Quaternion(), scale3 = new T.Vector3(), euler = new T.Euler();
    const placementMatrix = (placement: KitPlacement) => {
      const [sx, sy, sz] = placementScale(placement);
      quaternion.setFromEuler(euler.set(0, placement.rotationY ?? 0, 0));
      return matrix.compose(new T.Vector3().fromArray(placement.position), quaternion, scale3.set(sx, sy, sz));
    };

    if (layout.removeArchRow) removeArchRow(context, district);
    if (layout.hideFlowers) hideFlowers(context, district);

    for (const placement of layout.placements) {
      if (!kit.has(placement.id as never)) { zoneStats.skipped.push(placement.id); continue; }
      zoneStats.placed++;
      const role = placement.role ?? defaultRole(placement);
      const group = frameGroup(placement.frame);
      if (placement.replaces === "landmark" && !landmarkRemoved) {
        landmarkRemoved = true;
        removeLandmark(context, district);
      }
      if (placement.replaces === "arch") replaceArch(context, district, placement, group);
      if (placement.replaces === "column") context.grove.sites[placement.column ?? -1]?.column.removeFromParent();
      if (placement.contact) context.contact(group.parent ?? district.layout, placement.position[0], placement.position[2], placement.contact[0], placement.contact[1]);
      if (placement.halo && placement.slot === undefined) {
        const halo = haloSprite(context, placement.halo, materials.dot);
        halo.position.fromArray(placement.position).y += placement.halo.lift ?? 0;
        group.add(halo);
        state.items.push({ object: halo, effect: "sparkles" });
        zoneStats.draws++;
      }
      if (role === "instanced") {
        const list = instanced.get(placement.id) ?? { group, placements: [] };
        list.placements.push(placement);
        instanced.set(placement.id, list);
        continue;
      }
      if (role === "animated") {
        const node = kit.instance(placement.id as never, remap);
        node.name = `Kit ${placement.id}`;
        node.userData.dynamic = true;
        place(node, placement);
        group.add(node);
        node.traverse(object => {
          if (!(object as T.Mesh).isMesh) return;
          const mesh = object as T.Mesh;
          // The lotus casts no shadow: five extra shadow draws for a flower on the water.
          mesh.castShadow = false;
          mesh.frustumCulled = false;
          if (isGlowName(materialNames(mesh))) mesh.layers.enable(1);
          zoneStats.draws += Array.isArray(mesh.material) ? mesh.material.length : 1;
          zoneStats.triangles += triangles(mesh.geometry);
          zoneStats.farTriangles += triangles(mesh.geometry);
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
        if (placement.effect) state.items.push({ object: node, effect: placement.effect });
        continue;
      }
      // Static: bake once per asset, cluster per lod, and drop the transformed parts into the
      // frame's buckets. Grove pieces (`slot`) all go to the pieces bucket with their pivot.
      const baked = bakeStatic(placement.id, placement.tint, placement.slot !== undefined);
      const local = placementMatrix(placement);
      for (const lod of ["near", "far"] as const) {
        for (const [roleName, part] of Object.entries(baked.parts) as Array<[Role, T.BufferGeometry]>) {
          const copy = clusteredCopy(part, cellOf(placement.id, lod));
          copy.applyMatrix4(local);
          if (placement.slot !== undefined) addPivot(copy, placement.position, placement.slot);
          bucket(group, roleName, lod, placement.detail).parts.push(copy);
        }
      }
      if (placement.slot !== undefined) pivots.push({ slot: placement.slot, at: new T.Vector3().fromArray(placement.position), group, halo: placement.halo });
      if (placement.icon !== undefined) icons.push({ placement, group });
    }

    // Instanced pieces: one near and one far mesh per asset per district, stamped alike.
    for (const [id, { group, placements }] of instanced) {
      const detail = placements.some(p => p.detail === "near") ? "near" : placements.some(p => p.detail) ? true : undefined;
      const effect = placements.find(p => p.effect)?.effect;
      const meshes: T.InstancedMesh[] = [];
      for (const lod of ["near", "far"] as const) {
        const piece = bakedInstancedPiece(id, lod);
        const mesh = instancedMesh(group, piece.geometry, piece.material, placements, `Kit ${layout.zone} ${id} ${lod} x${placements.length}`);
        if (isCrystal(id)) mesh.layers.enable(1);
        state.items.push({ object: mesh, lod, detail, effect });
        meshes.push(mesh);
        if (lod === "near") { zoneStats.draws += Array.isArray(piece.material) ? piece.material.length : 1; zoneStats.triangles += triangles(piece.geometry, placements.length); }
        else zoneStats.farTriangles += triangles(piece.geometry, placements.length);
        if (piece.buds) {
          const buds = instancedMesh(group, piece.buds, materials.flora, placements, `Kit ${layout.zone} ${id} buds ${lod}`);
          buds.count = Math.min(LILY_BUDS.rest, placements.length);
          state.items.push({ object: buds, lod, detail, effect });
          if (lod === "near") { zoneStats.draws++; zoneStats.triangles += triangles(piece.buds, buds.count); }
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
      }
      if (placements.some(p => p.bob)) {
        const at = new T.Vector3(), spin = new T.Euler();
        updates.push(time => {
          placements.forEach((placement, i) => {
            const bob = placement.bob;
            if (!bob) return;
            at.fromArray(placement.position);
            at.y += Math.sin(time * bob.rate + (bob.phase ?? 0)) * bob.amplitude;
            spin.set(0, (placement.rotationY ?? 0) + time * 0.12, 0);
            for (const mesh of meshes) context.stamp(mesh, i, at, placementScale(placement), spin);
          });
          for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
        });
      }
    }

    // Statics: one mesh per frame, role and lod; the body casts the shadow, glow and glass
    // join the radiance layer, and the far merge waits for the camera to leave.
    for (const item of buckets.values()) {
      const merged = mergeGeometries(item.parts, false);
      item.parts.forEach(part => part.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const material = item.role === "pieces" ? materials.pieces : item.role === "gold" ? context.palette.gold : item.role === "glass" ? materials.glass : item.role === "glow" ? materials.glow : materials.body;
      const mesh = new T.Mesh(context.geometry(merged), material);
      mesh.name = `Kit ${layout.zone} ${item.role} ${item.lod}`;
      mesh.castShadow = item.role === "body";
      mesh.receiveShadow = !material.transparent;
      if (item.role === "glow" || item.role === "glass") mesh.layers.enable(1);
      item.group.add(mesh);
      state.items.push({ object: mesh, lod: item.lod, detail: item.detail });
      if (item.lod === "near") { zoneStats.draws++; zoneStats.triangles += triangles(merged); } else zoneStats.farTriangles += triangles(merged);
    }

    // The grove: a halo follows the selected piece, which the vertex shader lifts and turns.
    if (pivots.length) {
      const first = pivots[0];
      const halo = haloSprite(context, first.halo ?? { color: "#ffe2b0", scale: 4, opacity: 0.4 }, materials.dot);
      halo.visible = false;
      first.group.add(halo);
      state.items.push({ object: halo, effect: "sparkles" });
      zoneStats.draws++;
      updates.push(time => {
        const id = selected();
        const pivot = pivots.find(item => item.slot === id);
        halo.visible = !!pivot;
        if (pivot) halo.position.copy(pivot.at).y += 1.35 + Math.sin(time * 0.23 + id) * 0.15;
      });
    }

    // Steles: the canonical icon discs on the text faces, one atlas, one draw (design 6.10).
    if (icons.length) {
      const disc = iconDiscs(context, icons, materials.iconAtlas());
      zoneStats.draws++;
      state.items.push({ object: disc, lod: "near" });
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
    // Platforms: raised ivory drums with a gold ring at the top edge, merged by the study batcher.
    for (const platform of layout.platforms ?? []) {
      const drum = context.mesh(district.layout, context.geometry(studyTerrace(platform.radius, platform.radius + 0.2, platform.height, 96)), context.palette.ivory, [platform.center[0], platform.center[1] + platform.height / 2, platform.center[2]]);
      drum.name = `Kit ${layout.zone} platform`;
      const ring = context.ring(district.layout, platform.radius - 0.28, platform.center[1] + platform.height + 0.012, 0.021);
      ring.position.x = platform.center[0]; ring.position.z = platform.center[2];
    }
    // Swarms: kit butterflies on a helix, one instanced draw, trail class.
    for (const swarm of layout.swarms ?? []) {
      if (!kit.has(swarm.id as never)) { zoneStats.skipped.push(swarm.id); continue; }
      const mesh = butterflySwarm(swarm, frameGroup("layout"));
      if (!mesh) continue;
      state.items.push({ object: mesh, effect: "trails" });
      zoneStats.draws++;
      zoneStats.triangles += triangles(mesh.geometry, swarm.count);
    }
  }

  // Per district counts of what the kit added (placements, near draws and triangles), for
  // the performance lane's rendering details and for a capture script to read.
  scene.userData.kitDistricts = stats;
  console.debug("kit districts", JSON.stringify(stats));

  const cameraAt = new T.Vector3();
  return {
    update(time, zone, arrival) {
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      const lowTier = scene.userData.lowTier === true;
      materials.glow.emissiveIntensity = 0.7 + 0.15 * Math.sin(time * 7.3) * Math.sin(time * 3.1);
      materials.selected.value = selected();
      if (camera) {
        cameraAt.copy(camera.position);
        const limit = lowTier ? KIT_DETAIL_DISTANCE.low : scene.userData.studyTier === "high" ? KIT_DETAIL_DISTANCE.high : KIT_DETAIL_DISTANCE.auto;
        for (const state of states) {
          const distance = cameraAt.distanceTo(state.center);
          if (distance > KIT_LOD_DISTANCE.far) state.far = true;
          else if (distance < KIT_LOD_DISTANCE.near) state.far = false;
          const detail = distance < limit, near = distance < KIT_NEAR_DISTANCE;
          for (const item of state.items) {
            let visible = !item.lod || (item.lod === "far") === state.far;
            if (item.detail === "near") visible &&= near; else if (item.detail) visible &&= detail;
            if (item.effect) visible &&= effects[item.effect];
            item.object.visible = visible;
          }
        }
      }
      for (const fn of updates) fn(time, zone, arrival);
    },
    setEffects(sparkles, trails) {
      effects.sparkles = sparkles; effects.trails = trails;
    },
    dispose() {
      disposers.forEach(fn => fn());
      disposers.length = 0;
      clustered.forEach(geometry => geometry.dispose());
      clustered.clear();
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

/** The kit's own shared materials: one per role, registered with the world for disposal. */
function kitMaterials(context: DesignKitContext) {
  const body = studyRim(context.material(new T.MeshPhysicalMaterial({ vertexColors: true, color: "#ffffff", roughness: .3, metalness: .03, clearcoat: .42, clearcoatRoughness: .25, dithering: true })), "#ffe6c9", 3, .22);
  body.name = "kit body";
  const selected = { value: -1 };
  // The grove pieces: the body recipe plus the per piece bob, rise and turn (design 6.8).
  const pieces = studyRim(context.material(new T.MeshPhysicalMaterial({ vertexColors: true, color: "#ffffff", roughness: .3, metalness: .03, clearcoat: .42, clearcoatRoughness: .25, dithering: true })), "#ffe6c9", 3, .22);
  pieces.name = "kit pieces";
  chainPivotPatch(pieces, context.time, selected);
  const glass = studyGlow(context.material(studyGlass(.3)), "kit-dome", "vec3(1., .86, .74) * .10 * studyHeartPulse");
  glass.name = "kit glass";
  // Lamps, flames and the globe's sea: the emissive takes the vertex colour, so one material
  // lights a warm lamp and a teal sea alike; the intensity flickers on the world clock.
  const glow = context.material(new T.MeshStandardMaterial({ vertexColors: true, color: "#ffffff", emissive: new T.Color("#ffffff"), emissiveIntensity: .7, roughness: .5, metalness: 0 }));
  glow.name = "kit glow";
  glow.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;");
  };
  glow.customProgramCacheKey = () => "kit-glow-v1";
  const flora = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .62, sheen: .28, sheenColor: new T.Color("#ffe6ec"), dithering: true }));
  flora.name = "kit flora";
  const inlay = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .32, metalness: .05, clearcoat: .5, clearcoatRoughness: .3, dithering: true }));
  inlay.name = "kit inlay";
  const figure = context.material(new T.MeshStandardMaterial({ vertexColors: true, roughness: .65, metalness: 0 }));
  figure.name = "kit figure";
  const piece = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .35, metalness: .04, clearcoat: .5, clearcoatRoughness: .3 }));
  piece.name = "kit piece";
  const crystal = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .1, metalness: .05, clearcoat: 1, clearcoatRoughness: .08, emissive: new T.Color("#ffffff"), emissiveIntensity: .12, transparent: true, opacity: .86, depthWrite: true, dithering: true }));
  crystal.name = "kit crystal";
  const wing = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .45, sheen: .8, sheenColor: new T.Color("#ffe9f2") }));
  wing.name = "kit wing";
  let atlas: T.Material | undefined;
  const iconAtlas = () => {
    if (atlas) return atlas;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 768;
    const paint = canvas.getContext("2d");
    const map = context.texture(new T.CanvasTexture(canvas));
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    const loader = new T.ImageLoader();
    for (let id = 1; id <= 9; id++) {
      loader.load(`/home-art/icon${id}.webp`, image => {
        if (!paint) return;
        const k = id - 1;
        paint.drawImage(image, (k % 3) * 256, Math.floor(k / 3) * 256, 256, 256);
        map.needsUpdate = true;
        context.scene.userData.invalidate?.();
      });
    }
    atlas = context.material(new T.MeshBasicMaterial({ map, transparent: true, toneMapped: false, depthWrite: false }));
    atlas.name = "kit icons";
    return atlas;
  };
  return { body, pieces, glass, glow, flora, inlay, figure, piece, crystal, wing, selected, iconAtlas, dot: context.sparkleDot };
}

/** A soft additive disc on the radiance layer only: it reaches the eye as bloom. */
function haloSprite(context: DesignKitContext, halo: NonNullable<KitPlacement["halo"]>, dot: T.Texture) {
  const sprite = new T.Sprite(context.material(new T.SpriteMaterial({
    map: dot, color: halo.color, transparent: true, opacity: halo.opacity,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  sprite.name = "Kit halo";
  sprite.scale.set(halo.scale, halo.scale, 1);
  sprite.layers.set(1);
  return sprite;
}

/** The nine icon discs on the steles' text faces as one mesh over a 3 by 3 atlas. */
function iconDiscs(context: DesignKitContext, icons: Array<{ placement: KitPlacement; group: T.Group }>, material: T.Material) {
  const parts: T.BufferGeometry[] = [];
  const matrix = new T.Matrix4(), quaternion = new T.Quaternion(), euler = new T.Euler();
  for (const { placement } of icons) {
    const disc = new T.CircleGeometry(0.42, 40);
    const uv = disc.getAttribute("uv");
    const k = (placement.icon ?? 1) - 1, ox = (k % 3) / 3, oy = 1 - (Math.floor(k / 3) + 1) / 3;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ox + uv.getX(i) / 3, oy + uv.getY(i) / 3);
    const [sx, sy, sz] = placementScale(placement);
    quaternion.setFromEuler(euler.set(0, placement.rotationY ?? 0, 0));
    // The text face of the tablet: centre (0, .82, .125) facing +z in kit units (manifest).
    disc.applyMatrix4(matrix.compose(new T.Vector3(0, 0.82 * sy, 0.125 * sz + 0.02), new T.Quaternion(), new T.Vector3(sx, sy, 1)));
    disc.applyMatrix4(matrix.compose(new T.Vector3().fromArray(placement.position), quaternion, new T.Vector3(1, 1, 1)));
    parts.push(disc);
  }
  const merged = mergeGeometries(parts, false) ?? parts[0];
  parts.forEach(part => { if (part !== merged) part.dispose(); });
  merged.computeBoundingSphere();
  const mesh = new T.Mesh(context.geometry(merged), material);
  mesh.name = "Kit stele icons";
  mesh.castShadow = false;
  icons[0].group.add(mesh);
  return mesh;
}

/** The per vertex pivot of a grove piece: its column top and its expression id. */
function addPivot(geometry: T.BufferGeometry, position: readonly [number, number, number], slot: number) {
  const count = geometry.getAttribute("position").count;
  const pivot = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { pivot[i * 4] = position[0]; pivot[i * 4 + 1] = position[1]; pivot[i * 4 + 2] = position[2]; pivot[i * 4 + 3] = slot; }
  geometry.setAttribute("kitPivot", new T.BufferAttribute(pivot, 4));
}

/**
 * The grove pieces' vertex patch, chained after `studyRim`: every piece bobs about its own
 * pivot on the world clock, and the selected one rises .6 and turns at .3 rad per second.
 */
function chainPivotPatch(target: T.Material, clock: { value: number }, selected: { value: number }) {
  const previousCompile = target.onBeforeCompile.bind(target);
  const previousKey = target.customProgramCacheKey();
  target.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.kitTime = clock;
    shader.uniforms.kitSelected = selected;
    shader.vertexShader = `attribute vec4 kitPivot;
uniform float kitTime, kitSelected;
` + shader.vertexShader
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
float kitOn = step(abs(kitPivot.w - kitSelected), .5);
float kitAngle = kitOn * kitTime * .3;
float kitC = cos(kitAngle), kitS = sin(kitAngle);
objectNormal = vec3(objectNormal.x * kitC + objectNormal.z * kitS, objectNormal.y, -objectNormal.x * kitS + objectNormal.z * kitC);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vec3 kitLocal = transformed - kitPivot.xyz;
kitLocal = vec3(kitLocal.x * kitC + kitLocal.z * kitS, kitLocal.y, -kitLocal.x * kitS + kitLocal.z * kitC);
kitLocal.y += sin(kitTime * .23 + kitPivot.w) * .15 + kitOn * .6;
transformed = kitLocal + kitPivot.xyz;`);
  };
  target.customProgramCacheKey = () => `${previousKey}|kit-pivot-v1`;
  return target;
}

function placementScale(placement: KitPlacement): [number, number, number] {
  return placement.scaleXYZ ?? [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];
}

/** Bushes, stones, pads, crystals, people and the little core shapes repeat; the rest stands once. */
function defaultRole(placement: KitPlacement): "static" | "animated" | "instanced" {
  if (placement.clip) return "animated";
  const id = placement.id;
  if (/^nature\.(rose|hydrangea|lily|stepping|crystal)/.test(id)) return "instanced";
  if (/^(core|people)\./.test(id)) return "instanced";
  return "static";
}

const isCrystal = (id: string) => id.startsWith("nature.crystal");

/** Which bucket a static file's material lands in, by the words in its name. */
export function staticRole(id: string, name: string): Role {
  const words = new Set(kitMaterialWords(name));
  const has = (...candidates: string[]) => candidates.some(word => words.has(word));
  if (has("glass")) return "glass";
  // The globe's halo is a translucent shell: glass gives it the pearl iridescence.
  if (has("halo")) return "glass";
  if (has("glow", "flame", "sparkle", "shine", "glint", "emissive", "steam") || (id === "landmark.peace-globe" && has("sea"))) return "glow";
  if (has("gold", "bezel", "stud")) return "gold";
  return "body";
}

function materialNames(mesh: T.Mesh): string[] {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material.name);
}
function isGlowName(names: string[]) {
  return names.some(name => { const words = new Set(kitMaterialWords(name)); return words.has("glow") || words.has("halo") || words.has("flame"); });
}

/**
 * The remap for animated clones (the lotus): the study's shared materials by role
 * (`kit-materials.ts`), the rose and blush accents on the kit's own shared tints so two
 * files never bring two materials for one colour, glass on the kit glass.
 */
function animatedRemap(context: DesignKitContext, materials: ReturnType<typeof kitMaterials>): MaterialRemap {
  const { palette } = context;
  const rose = context.material(new T.MeshPhysicalMaterial({ color: "#f28da6", roughness: .4, clearcoat: .4, sheen: .3, sheenColor: new T.Color("#ffd1dd") }));
  rose.name = "kit rose";
  const base = createKitRemap({
    ivory: palette.ivory, gold: palette.gold, stone: palette.stone, leaf: palette.leaf, lawn: palette.lawn,
    bloom: palette.bloom, silk: palette.silk, water: palette.water, glass: () => materials.glass,
  });
  return (name, imported) => {
    const words = kitMaterialWords(name);
    if (words.includes("rose") || words.includes("blush")) return rose;
    if (words.includes("bark") || words.includes("trunk")) return palette.roseGold;
    return base(name, imported);
  };
}

/** The procedural landmark pieces of a district go, with their waterfalls and any arch crown. */
function removeLandmark(context: DesignKitContext, district: DesignKitDistrict) {
  for (const object of district.landmark.slice()) {
    const arch = district.arches.find(record => record.root === object);
    if (arch) dropCrown(context, arch);
    if ((object as T.Mesh).isMesh && district.falls.includes(object as T.Mesh)) { context.removeFall(object as T.Mesh); continue; }
    object.removeFromParent();
  }
  district.landmark.length = 0;
}

/** The district's procedural arch row (the arches in `layout`) goes without a kit row. */
function removeArchRow(context: DesignKitContext, district: DesignKitDistrict) {
  for (const record of district.arches) {
    if (record.parent !== district.layout) continue;
    dropCrown(context, record);
    record.root.removeFromParent();
    const at = district.landmark.indexOf(record.root);
    if (at >= 0) district.landmark.splice(at, 1);
  }
}

function dropCrown(context: DesignKitContext, arch: DesignKitDistrict["arches"][number]) {
  if (!arch.crown) return;
  const at = context.archCrowns.indexOf(arch.crown);
  if (at >= 0) context.archCrowns.splice(at, 1);
  arch.crown = null;
}

/**
 * A kit arch stands where a procedural one stood; the keystone lantern moves with it, hung
 * from an empty anchor at the placement's transform (the arch itself is merged away).
 */
function replaceArch(context: DesignKitContext, district: DesignKitDistrict, placement: KitPlacement, group: T.Group) {
  const list = placement.frame === "arcade" ? context.sanctuary.arches : district.arches;
  const record = list[placement.arch ?? -1];
  if (!record) return;
  record.root.removeFromParent();
  if (record.crown) {
    const anchor = new T.Group();
    anchor.name = `Kit arch anchor ${placement.arch}`;
    anchor.position.fromArray(placement.position);
    anchor.rotation.y = placement.rotationY ?? 0;
    const [sx, sy, sz] = placementScale(placement);
    anchor.scale.set(sx, sy, sz);
    group.add(anchor);
    record.crown.root = anchor;
    // In the anchor's own units: the scale on the anchor lifts it to the placed height.
    record.crown.height = KIT_BOUNDS[placement.id]?.max[1] ?? record.crown.height;
  }
  const at = district.landmark.indexOf(record.root);
  if (at >= 0) district.landmark.splice(at, 1);
}

/**
 * The procedural disc flower clusters of a district (petals on the study bloom, gold pollen
 * cores, leaf stems) are hidden where the kit's bushes take the beds; the lawn foliage and
 * the cotton crowns stay.
 */
function hideFlowers(context: DesignKitContext, district: DesignKitDistrict) {
  for (const child of district.layout.children) {
    if (!(child instanceof T.InstancedMesh)) continue;
    const material = child.material as T.Material;
    const flower = material === context.palette.bloom
      || (material === context.palette.gold && child.geometry.type === "SphereGeometry")
      || (material === context.palette.leaf && child.geometry.type === "CylinderGeometry");
    if (flower) child.visible = false;
  }
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
 * attribute: the file's vertex colour (or white) times the material's base colour (and a
 * placement tint), so one `vertexColors` material draws what several materials drew.
 */
export function bakeGroups(source: T.BufferGeometry, names: string[], colours: Map<string, T.Color>, pick: (slot: number) => boolean, tint?: T.Color): T.BufferGeometry | null {
  const position = source.getAttribute("position"), normal = source.getAttribute("normal"), colour = source.getAttribute("color");
  const index = source.index;
  if (!index || !position) return null;
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], indices: number[] = [];
  const groups = source.groups.length ? source.groups : [{ start: 0, count: index.count, materialIndex: 0 }];
  for (const group of groups) {
    const slot = group.materialIndex ?? 0;
    if (!pick(slot)) continue;
    const base = colours.get(names[slot]) ?? new T.Color(1, 1, 1);
    const shade = tint ? base.clone().multiply(tint) : base;
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
        colors.push(r * shade.r, g * shade.g, b * shade.b);
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
