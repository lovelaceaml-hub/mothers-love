import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import type { WorldKit } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { studyRim } from "./study-materials";
import type { DesignKitContext, KitBuilderHandle } from "./design-world";
import { applyKitFarZones, farZonesEnabled } from "./kit-far-zones";
import { tvViewDistance } from "./study-budget";
import { studyTvPage } from "./tv-page";
import {
  type KitCorridorSite,
  type V3,
  type CorridorIslet,
  type CorridorPost,
  type CorridorCloud,
  KIT_ISLAND,
  POST_VIEW_DISTANCE,
  ISLET_VIEW_DISTANCE,
  CLOUD_VIEW_DISTANCE,
  LOW_TIER_VIEW,
  LOD_NEAR,
  FRUSTUM_MARGIN,
  CORRIDOR_KEEP,
  SOFT_CLOUD,
  TV_SOFT_CLOUD_OPACITY,
  corridorIslets,
  corridorPosts,
  corridorClouds,
} from "./kit-corridor-routes";

export {
  LONG_BRIDGE,
  ISLET_SIDE_OFFSET,
  ISLET_BELOW_DECK,
  POST_SIDE_OFFSET,
  KIT_ISLAND,
  POST_VIEW_DISTANCE,
  ISLET_VIEW_DISTANCE,
  CLOUD_VIEW_DISTANCE,
  LOW_TIER_VIEW,
  LOD_NEAR,
  FRUSTUM_MARGIN,
  CORRIDOR_KEEP,
  WORLD_CENTRE,
  corridorBridges,
  bridgeCurve,
  tourLegs,
  flightBetween,
  readingArcEye,
  flightCurve,
  SOFT_CLOUD,
  TV_SOFT_CLOUD_OPACITY,
  SKY_LANES,
  ISLET_STATIONS,
  POST_FREE_ENDS,
  corridorIslets,
  corridorPosts,
  skyLaneStation,
  corridorClouds,
} from "./kit-corridor-routes";
export type {
  KitCorridorSite,
  CorridorBridge,
  CorridorIslet,
  CorridorPost,
  CorridorCloud,
  SkyLane,
} from "./kit-corridor-routes";

/**
 * The corridors between the thirteen districts (WORLD-INTEGRATION 6.17): lantern posts at the
 * bridge ends, islets beside the long bridges, and the sky lanes along the two fast legs.
 *
 * Owned by lane K3b. The tables are pure (no Three.js objects, only its curve maths), so
 * `tests/world/kit-layout-far.test.ts` proves every islet, post and cloud clear of the
 * districts, the arrival stage, every bridge deck and every flight the camera director can
 * make (the tour legs, every ordered zone pair from every point of the reading arc, and the
 * arrival flights to the arrival view and back) without a browser. Two entry points, both
 * called by the design world only with a kit:
 *
 * - `kitCorridorSites(kit)` runs first, before the clouds and the air are built: every islet
 *   the corridors will place, so it gets a cloud collar (`studyCloudLayout` extra sites) and a
 *   share of the drifting petals (`createStudyAir` centres) like every island.
 * - `applyKitCorridors(context)` runs with the district builder, before the static batch. It
 *   builds one instanced draw per piece per material world wide, decimated at load (below),
 *   and, unless `?far=off`, hands the six far districts to `applyKitFarZones` (K3b's own
 *   builder for its tables) so the far zones are dressed before the lanes merge.
 */

/** The islets, as cloud collar sites, when the kit can place them at all. */
export function kitCorridorSites(kit: Pick<WorldKit, "has">): KitCorridorSite[] {
  if (!kit.has("nature.island-small")) return [];
  return corridorIslets().map(islet => ({ center: islet.center, radius: islet.radius }));
}

/* ------------------------------------------------------------------------------------------ */
/* The builder                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/**
 * A cheaper copy of a kit geometry for instancing dozens of times: each material group is
 * merged by position and reduced by edge collapse (three's `SimplifyModifier`, Melax 1998) to
 * `keep` of its vertices, then the groups are merged back in order so the material array still
 * applies. The W3 v2 nature files carry 7,000 to 14,000 triangles each, far more than a piece
 * seen from the travel altitude needs, and 52 posts or 13 islets at full detail would spend the
 * whole kit's triangle budget (design 7.2) on the corridors alone. A group too small to reduce,
 * or one the modifier cannot process, is kept as it is. Registered with the context, so the
 * world's `dispose()` releases it; the kit's own cached geometry is untouched.
 */
export function decimatedKitGeometry(kit: WorldKit, id: KitAssetId, keep: number, register: <G extends T.BufferGeometry>(g: G) => G): T.BufferGeometry {
  const source = kit.geometry(id);
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const groups = flat.groups.length ? flat.groups : [{ start: 0, count: flat.getAttribute("position").count, materialIndex: 0 }];
  const parts: T.BufferGeometry[] = [];
  for (const group of groups) {
    const part = new T.BufferGeometry();
    const positions = flat.getAttribute("position");
    part.setAttribute("position", new T.BufferAttribute((positions.array as Float32Array).slice(group.start * 3, (group.start + group.count) * 3), 3));
    let reduced: T.BufferGeometry;
    try {
      const merged = mergeVertices(part, 1e-4);
      const unique = merged.getAttribute("position").count;
      const remove = Math.floor(unique * (1 - keep));
      reduced = unique > 60 && remove > 0 ? new SimplifyModifier().modify(merged, remove) : merged;
      if (reduced !== merged) merged.dispose();
      if (!reduced.getAttribute("position") || reduced.getAttribute("position").count < 3) { reduced.dispose(); reduced = part; }
    } catch {
      reduced = part;
    }
    const plain = reduced.index ? reduced.toNonIndexed() : reduced;
    if (plain !== reduced) reduced.dispose();
    plain.deleteAttribute("normal"); plain.deleteAttribute("uv");
    plain.computeVertexNormals();
    parts.push(plain);
    if (plain !== part) part.dispose();
  }
  if (flat !== source) flat.dispose();
  const result = mergeGeometries(parts, true) ?? parts[0];
  parts.forEach(part => { if (part !== result) part.dispose(); });
  result.groups.forEach((group, index) => { group.materialIndex = groups[index]?.materialIndex ?? index; });
  result.userData.kitMaterials = source.userData.kitMaterials;
  result.userData.kitId = id;
  result.computeBoundingSphere();
  return register(result);
}

/** The imported materials of a kit template by name, for the roles the remap keeps. */
function importedMaterials(kit: WorldKit, id: KitAssetId) {
  const byName = new Map<string, T.Material>();
  kit.asset(id)?.template.traverse(object => {
    const mesh = object as T.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!byName.has(material.name)) byName.set(material.name, material);
  });
  return byName;
}

type CorridorPalette = { ivory: T.Material; gold: T.Material; lawn: T.Material; stone: T.Material; roseGold: T.Material; blossom: T.Material; cloud: T.Material };

/**
 * Corridor pieces map onto the study's shared materials by the word their exported name ends
 * in: grass becomes the lawn, rock the carved stone, bark the rose gold trunks, blossom and
 * petal the corridor blossom pink, gold the gold, pearl the ivory, cotton the cloud material.
 * Anything else (the lantern's emissive glow) keeps the material the file brought. A piece may
 * pass `overrides` by the same last word, which win: the islet's own cap, rock and bush.
 */
export function corridorMaterialFor(name: string, palette: CorridorPalette, imported: T.Material | undefined, overrides: Partial<Record<string, T.Material>> = {}) {
  const word = name.toLowerCase().split(/[^a-z]+/).filter(Boolean).pop() ?? "";
  const table: Record<string, T.Material> = {
    grass: palette.lawn, lawn: palette.lawn, rock: palette.stone, stone: palette.stone, bark: palette.roseGold,
    blossom: palette.blossom, petal: palette.blossom, gold: palette.gold, pearl: palette.ivory, cotton: palette.cloud,
  };
  return overrides[word] ?? table[word] ?? imported ?? palette.ivory;
}

/**
 * The islet's own colours (director's note 2 on round three: the kit island read as another
 * game's asset beside the pearl saucers). Its cap takes the district lawn, its faceted
 * bushes the bed rose pink with a soft sheen so they read as bushes and not crystal, and its
 * rock the pearl saucer pink of the district keels: the study stone shader takes that pink
 * from the lathe's local depth, which the kit island's own coordinates never reach, so the
 * rock carries it as a plain colour instead.
 */
export const ISLET_COLOURS = { cap: "#c9dfb5", bush: "#e7a3c0", rock: "#ecc4bf", rim: "gold" } as const;

const dummy = new T.Object3D();

/**
 * The sky lane clouds' material (`SOFT_CLOUD`). The TV page's clear air: a flight through a sky
 * lane passes a lighter veil, `TV_SOFT_CLOUD_OPACITY`. Set on the material, so the table, the
 * constant and every other page keep `SOFT_CLOUD.opacity`; the rim and the program are the same.
 */
export function corridorSoftCloud(tv = false) {
  const softCloud = studyRim(new T.MeshPhysicalMaterial({ color: "#f8dde6", roughness: .96, sheen: 1, sheenColor: new T.Color("#fff6f8"), sheenRoughness: .7, dithering: true, transparent: true, opacity: SOFT_CLOUD.opacity, depthWrite: false }), "#fff4ea", 2.2, .34);
  softCloud.name = "corridor soft cloud";
  if (tv) softCloud.opacity = TV_SOFT_CLOUD_OPACITY;
  return softCloud;
}

export function applyKitCorridors(context: DesignKitContext): KitBuilderHandle | void {
  const { kit, scene } = context;
  const meshes: T.InstancedMesh[] = [];
  const palette: CorridorPalette = {
    ivory: context.palette.ivory, gold: context.palette.gold, lawn: context.palette.lawn, stone: context.palette.stone, roseGold: context.palette.roseGold,
    blossom: context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f0a8b8", roughness: .52, sheen: .8, sheenColor: new T.Color("#ffe4ec"), sheenRoughness: .5, dithering: true }), "#fff0e0", 2.2, .3)),
    cloud: context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f8dde6", roughness: .96, sheen: 1, sheenColor: new T.Color("#fff6f8"), sheenRoughness: .7, dithering: true }), "#fff4ea", 2.2, .34)),
  };
  palette.blossom.name = "corridor blossom"; palette.cloud.name = "corridor cloud";
  // Sky lane clouds are soft (SOFT_CLOUD): the camera may brush them, so they draw at half
  // opacity without writing depth; the rim is kept, the sheen softened. Lighter on the TV page.
  const tv = studyTvPage();
  const softCloud = context.material(corridorSoftCloud(tv));
  const islet: Partial<Record<string, T.Material>> = {
    grass: context.material(new T.MeshStandardMaterial({ color: ISLET_COLOURS.cap, roughness: .92, metalness: 0, dithering: true })),
    petal: context.material(new T.MeshPhysicalMaterial({ color: ISLET_COLOURS.bush, roughness: .7, sheen: .5, sheenColor: new T.Color("#ffe0ea"), sheenRoughness: .6, dithering: true })),
    rock: context.material(studyRim(new T.MeshStandardMaterial({ color: ISLET_COLOURS.rock, roughness: .86, dithering: true }), "#ffe1cf", 3, .25)),
  };
  islet.grass!.name = "islet cap"; islet.petal!.name = "islet bush"; islet.rock!.name = "islet rock";

  function instanced(id: KitAssetId, keep: number, name: string, count: number, shadow: boolean, overrides: Partial<Record<string, T.Material>> = {}) {
    const geometry = decimatedKitGeometry(kit, id, keep, context.geometry);
    const imported = importedMaterials(kit, id);
    const names = (geometry.userData.kitMaterials as string[] | undefined) ?? [];
    const materials = names.length ? names.map(material => corridorMaterialFor(material, palette, imported.get(material), overrides)) : [palette.ivory];
    const mesh = new T.InstancedMesh(geometry, materials.length === 1 ? materials[0] : materials, count);
    mesh.name = name;
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    // Never merged by the static batch: it is instanced, and it keeps its own matrices.
    mesh.userData.dynamic = true;
    meshes.push(mesh); scene.add(mesh);
    return mesh;
  }
  function placeAt(mesh: T.InstancedMesh, i: number, position: V3, rotationY: number, scale: number) {
    dummy.position.set(position[0], position[1], position[2]);
    dummy.rotation.set(0, rotationY, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  function finish(mesh: T.InstancedMesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  /**
   * One piece world wide: an instanced mesh per level of detail and the table of its places.
   * An instanced mesh has one bounding sphere for all its instances, so left alone every islet
   * in the world is drawn whenever any of them is on screen. Each recount therefore keeps only
   * the places inside `range` of the camera whose own sphere, widened by `FRUSTUM_MARGIN`,
   * meets the view frustum; of those, the ones nearer than `LOD_NEAR` fill the near mesh and
   * the rest the far mesh when the piece has one. `count` cuts the others, and a mesh whose
   * count is 0 costs no draw. The meshes never rely on three's own frustum test, which would
   * see only the sphere of the instances currently placed.
   */
  type Piece = { position: V3; rotationY: number; scale: number };
  type Culled = { near: T.InstancedMesh; far?: T.InstancedMesh; places: Piece[]; radius: number; centerY: number; range: (low: boolean) => number };
  const culled: Culled[] = [];
  function cullable(near: T.InstancedMesh, far: T.InstancedMesh | undefined, range: (low: boolean) => number, places: Piece[]) {
    // Until the first recount (which the first frame with a camera makes) everything is placed
    // in the near mesh, so a world without a published camera is complete.
    places.forEach((place, i) => placeAt(near, i, place.position, place.rotationY, place.scale));
    finish(near);
    near.frustumCulled = false;
    if (far) { far.count = 0; far.frustumCulled = false; }
    const sphere = near.geometry.boundingSphere ?? new T.Sphere(new T.Vector3(), 1);
    culled.push({ near, far, places, radius: sphere.radius, centerY: sphere.center.y, range });
  }

  // Lantern posts: four per bridge. On the TV page the clear air would show a post appearing at
  // 96 units, so there they reach `STUDY_TV_VIEW_DISTANCE` (Low keeps its 70).
  const postTable = corridorPosts();
  if (kit.has("landmark.lantern-post") && postTable.length) {
    cullable(instanced("landmark.lantern-post", CORRIDOR_KEEP.post, "Kit corridor lantern posts", postTable.length, false), undefined,
      low => (low ? LOW_TIER_VIEW.post : tvViewDistance(POST_VIEW_DISTANCE, tv)),
      postTable.map(post => ({ position: post.position, rotationY: post.rotationY, scale: 1.1 })));
  }

  // Islets beside the long bridges and along the sky lanes, each with a blossom tree. The far
  // level keeps a tenth of the surface and casts no shadow: past 80 units its shadow is a speck.
  const islets = corridorIslets();
  if (kit.has("nature.island-small") && islets.length) {
    cullable(
      instanced("nature.island-small", CORRIDOR_KEEP.islet[0], "Kit corridor islets", islets.length, true, islet),
      instanced("nature.island-small", CORRIDOR_KEEP.islet[1], "Kit corridor islets, far", islets.length, false, islet),
      low => (low ? LOW_TIER_VIEW.islet : ISLET_VIEW_DISTANCE),
      islets.map(islet => ({ position: [islet.center[0], islet.center[1] - KIT_ISLAND.grassAbovePivot * islet.scale, islet.center[2]] as V3, rotationY: islet.rotationY, scale: islet.scale })));
    // A gold rim at every islet's grass edge, like the terrace rings: one torus, one draw.
    const rimGeometry = context.geometry(new T.TorusGeometry(1, .014, 6, 72));
    rimGeometry.rotateX(-Math.PI / 2);
    const rim = new T.InstancedMesh(rimGeometry, palette.gold, islets.length);
    rim.name = "Kit corridor islet rims"; rim.userData.dynamic = true; rim.receiveShadow = false; rim.layers.enable(1);
    meshes.push(rim); scene.add(rim);
    cullable(rim, undefined, low => (low ? LOW_TIER_VIEW.islet : ISLET_VIEW_DISTANCE),
      islets.map(islet => ({ position: [islet.center[0], islet.center[1] - .05, islet.center[2]] as V3, rotationY: 0, scale: KIT_ISLAND.grassRadius * islet.scale })));
    if (kit.has("nature.blossom-tree-a")) {
      cullable(
        instanced("nature.blossom-tree-a", CORRIDOR_KEEP.tree[0], "Kit corridor islet trees", islets.length, true),
        instanced("nature.blossom-tree-a", CORRIDOR_KEEP.tree[1], "Kit corridor islet trees, far", islets.length, false),
        low => (low ? LOW_TIER_VIEW.islet : ISLET_VIEW_DISTANCE),
        islets.map(islet => ({ position: islet.tree.position, rotationY: islet.tree.rotationY, scale: islet.tree.scale })));
    }
  }

  // The sky lane clouds: soft sculpted puffs the camera passes through the tops of on the two
  // long legs. They keep more of their surface than the posts, because the camera comes
  // within a few units.
  const clouds = corridorClouds();
  if (kit.has("nature.cloud-c") && clouds.length) {
    cullable(instanced("nature.cloud-c", CORRIDOR_KEEP.cloud, "Kit corridor sky lane clouds", clouds.length, false, { cotton: softCloud }), undefined,
      low => (low ? LOW_TIER_VIEW.cloud : CLOUD_VIEW_DISTANCE),
      clouds.map(cloud => ({ position: cloud.position, rotationY: cloud.rotationY, scale: cloud.scale })));
  }

  // A recount happens when the camera has moved two units or turned two degrees, or the tier
  // changed. A still frame after a jump always has, and the engine runs this update after the
  // camera's matrices are final on a still frame, so a capture is the recounted world.
  const lastCamera = new T.Vector3(Number.NaN, 0, 0), lastForward = new T.Vector3(), forward = new T.Vector3();
  let lastLow: boolean | undefined;
  const frustum = new T.Frustum(), projected = new T.Matrix4(), sphere = new T.Sphere();
  function recount(camera: T.Camera, low: boolean) {
    projected.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projected);
    const eye = camera.position;
    for (const piece of culled) {
      const range = piece.range(low);
      let near = 0, far = 0;
      for (const place of piece.places) {
        const distance = Math.hypot(place.position[0] - eye.x, place.position[1] - eye.y, place.position[2] - eye.z);
        if (distance > range) continue;
        sphere.center.set(place.position[0], place.position[1] + piece.centerY * place.scale, place.position[2]);
        sphere.radius = piece.radius * place.scale + FRUSTUM_MARGIN;
        if (!frustum.intersectsSphere(sphere)) continue;
        if (piece.far && distance > LOD_NEAR) placeAt(piece.far, far++, place.position, place.rotationY, place.scale);
        else placeAt(piece.near, near++, place.position, place.rotationY, place.scale);
      }
      piece.near.count = near; piece.near.instanceMatrix.needsUpdate = true;
      if (piece.far) { piece.far.count = far; piece.far.instanceMatrix.needsUpdate = true; }
    }
  }
  // The six far districts (K3b's tables) are dressed here until the coordinator wires the
  // far builder into the design world itself; `?far=off` keeps them procedural for A/B.
  const far = farZonesEnabled(typeof location === "undefined" ? "" : location.search) ? applyKitFarZones(context) : undefined;

  return {
    update(time, zone, arrival) {
      far?.update?.(time, zone, arrival);
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      if (!camera) return;
      const low = scene.userData.lowTier === true;
      camera.getWorldDirection(forward);
      if (low === lastLow && camera.position.distanceToSquared(lastCamera) < 4 && forward.angleTo(lastForward) < .035) return;
      lastCamera.copy(camera.position); lastForward.copy(forward); lastLow = low;
      recount(camera, low);
    },
    setEffects(sparkles, trails) {
      far?.setEffects?.(sparkles, trails);
    },
    dispose() {
      far?.dispose?.();
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); }
      meshes.length = 0;
    },
  };
}
