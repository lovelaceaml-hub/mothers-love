import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { ArrivalState } from "../arrival-director";
import { looping, scrubbed } from "../kit/kit-clips";
import type { DesignKitContext, KitBuilderHandle } from "./design-world";
import type { KitPlacement, ZoneLayout } from "./kit-layout-core";
import { tvViewDistance } from "./study-budget";
import { studyTerrace } from "./study-geometry";
import { studyTvPage } from "./tv-page";
import {
  KIT_ZONE_LAYOUTS, KIT_DETAIL_DISTANCE, KIT_LOD_DISTANCE, kitPeopleDistance, LILY_BUDS,
  type Role, type Lod, type FrameUpdate, type LodItem, type DistrictState, type Baked,
  type InstancedBaked, type ZoneStats,
} from "./kit-district-measures";
import { kitLayoutPieces } from "./kit-district-pieces";
import {
  kitMaterials, haloSprite, iconDiscs, addPivot, placementScale, defaultRole, isCrystal,
  materialNames, isGlowName, animatedRemap, removeLandmark, removeArchRow, replaceArch,
  hideFlowers,
} from "./kit-district-parts";

export {
  KIT_ZONE_LAYOUTS, KIT_DETAIL_DISTANCE, KIT_NEAR_DISTANCE, KIT_LOD_DISTANCE, KIT_FAR_CELL_FACTOR,
  kitPeopleDistance, KIT_CLUSTER_CELL, LILY_BUDS,
} from "./kit-district-measures";
export { kitLayoutPieces } from "./kit-district-pieces";
export { staticRole, bakeGroups, clusterGeometry } from "./kit-district-parts";

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


export function applyKitDistricts(context: DesignKitContext): KitBuilderHandle | void {
  return applyKitLayouts(context, KIT_ZONE_LAYOUTS);
}

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
  const { place, instancedMesh, bakeStatic, bakedInstancedPiece, clusteredCopy, butterflySwarm, clustered, cellOf } = kitLayoutPieces(context, materials, updates);
  const triangles = (geometry: T.BufferGeometry, instances = 1) => ((geometry.index ? geometry.index.count : geometry.getAttribute("position").count) / 3) * instances;
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
  // The TV page's clear air shows what the study's haze hid, so there the detail groups stay in
  // view out to `STUDY_TV_VIEW_DISTANCE` (Low keeps its own distances), and on High the people
  // too (`kitPeopleDistance`). Resolved once, like every other page gate. The near and far
  // merge swap is left as it is.
  const tv = studyTvPage();
  return {
    update(time, zone, arrival) {
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      const lowTier = scene.userData.lowTier === true;
      materials.glow.emissiveIntensity = 0.7 + 0.15 * Math.sin(time * 7.3) * Math.sin(time * 3.1);
      materials.selected.value = selected();
      if (camera) {
        cameraAt.copy(camera.position);
        const tier = lowTier ? "low" : scene.userData.studyTier === "high" ? "high" : "auto";
        const limit = tvViewDistance(KIT_DETAIL_DISTANCE[tier], tv, lowTier);
        const nearLimit = kitPeopleDistance(tv, tier);
        for (const state of states) {
          const distance = cameraAt.distanceTo(state.center);
          if (distance > KIT_LOD_DISTANCE.far) state.far = true;
          else if (distance < KIT_LOD_DISTANCE.near) state.far = false;
          const detail = distance < limit, near = distance < nearLimit;
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
}
