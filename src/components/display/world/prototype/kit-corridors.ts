import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import { TOUR_ORDER, ZONES, type ZoneId } from "../world-data";
import type { WorldKit } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { studyRim } from "./study-materials";
import type { DesignKitContext, KitBuilderHandle } from "./design-world";

/**
 * The corridors between the thirteen districts (WORLD-INTEGRATION 6.17): lantern posts at the
 * bridge ends, islets beside the long bridges, and the sky lanes along the two fast legs.
 *
 * Owned by lane K3b. The tables are pure (no Three.js objects, only its curve maths), so
 * `tests/world/kit-layout-far.test.ts` proves every islet, post and cloud clear of the
 * districts, the arrival stage, every bridge deck and the camera's travel corridor without a
 * browser. Two entry points, both called by the design world only with a kit:
 *
 * - `kitCorridorSites(kit)` runs first, before the clouds and the air are built: every islet
 *   the corridors will place, so it gets a cloud collar (`studyCloudLayout` extra sites) and a
 *   share of the drifting petals (`createStudyAir` centres) like every island.
 * - `applyKitCorridors(context)` runs with the district builder, before the static batch. It
 *   builds one instanced draw per piece per material world wide, decimated at load (below).
 */

export type KitCorridorSite = { center: readonly [number, number, number]; radius: number };
type V3 = [number, number, number];

/** A bridge deck exactly as `design-world.ts` builds it: the same tree, insets and raised middle. */
export type CorridorBridge = {
  from: ZoneId;
  to: ZoneId;
  /** Deck control points, world space: the two island edges and the raised, sidestepped middle. */
  start: V3;
  middle: V3;
  end: V3;
  /** Centre to centre distance, the figure design 6.17 lists. */
  length: number;
  /** Over `LONG_BRIDGE` units: it earns an islet beside its middle. */
  long: boolean;
};
export type CorridorIslet = {
  /** The grass top, world space; the cloud collar site and the petal centre. */
  center: V3;
  /** Grass radius (the kit island is radius 4 at scale 1). */
  radius: number;
  scale: number;
  rotationY: number;
  tree: { position: V3; rotationY: number; scale: number };
  /** Which bridge or sky lane placed it. */
  reason: string;
};
export type CorridorPost = { position: V3; rotationY: number; bridge: string };
export type CorridorCloud = { position: V3; rotationY: number; scale: number; lane: string };
export type SkyLane = {
  from: ZoneId;
  to: ZoneId;
  /** Fraction along the flight, and a world xz offset and a drop below the flight line. */
  clouds: Array<{ t: number; offset: [number, number]; drop: number; scale: number }>;
  /** Placed by hand beside the flight line (20 to 40 units off it in xz), world space grass top. */
  islets: Array<{ center: V3; scale: number }>;
};

/** Bridges longer than this get an islet (design 6.17 names eight; 52.4 unit heart to featured is not among them). */
export const LONG_BRIDGE = 53.5;
export const ISLET_SIDE_OFFSET = 22;
export const ISLET_BELOW_DECK = 4;
/**
 * Design 6.17 says 2.6, but the deck is 4.3 wide with its rails at 2.15, so a post there would
 * hang in the air beside the rail; 1.8 stands it on the deck just inside the rail.
 */
export const POST_SIDE_OFFSET = 1.8;
/** The kit island's grass sits about 2.5 above its centre pivot; its grass radius is 4. */
export const KIT_ISLAND = { grassAbovePivot: 2.5, grassRadius: 4 } as const;
/** Corridor lantern posts beyond this distance from the camera are not drawn. */
export const POST_VIEW_DISTANCE = 96;

const zone = (id: ZoneId) => ZONES.find(item => item.id === id)!;
const round = (value: number) => Math.round(value * 1000) / 1000;
const v3 = (v: T.Vector3): V3 => [round(v.x), round(v.y), round(v.z)];

/** The world's centre of mass in xz; an islet sits on the side of its bridge that faces away from it. */
export const WORLD_CENTRE: [number, number] = [
  round(ZONES.reduce((sum, item) => sum + item.center[0], 0) / ZONES.length),
  round(ZONES.reduce((sum, item) => sum + item.center[2], 0) / ZONES.length),
];

/** The thirteen bridges, recomputed the way the design world builds them. */
export function corridorBridges(): CorridorBridge[] {
  const connections: Array<[ZoneId, ZoneId]> = [["garden", "heart"], ["heart", "expressions"], ["garden", "expressions"]];
  const connected = new Set<ZoneId>(["garden", "heart", "expressions"]);
  while (connected.size < ZONES.length) {
    let best: [ZoneId, ZoneId] | undefined, distance = Infinity;
    for (const from of ZONES.filter(item => connected.has(item.id))) for (const to of ZONES.filter(item => !connected.has(item.id))) {
      const d = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
      if (d < distance) { distance = d; best = [from.id, to.id]; }
    }
    if (!best) break;
    connections.push(best); connected.add(best[1]);
  }
  return connections.map(([fromId, toId], i) => {
    const from = zone(fromId), to = zone(toId);
    const a = new T.Vector3(...from.center).add(new T.Vector3(0, .6, 0)), b = new T.Vector3(...to.center).add(new T.Vector3(0, .6, 0));
    const direction = b.clone().sub(a); direction.y = 0; direction.normalize();
    a.addScaledVector(direction, ZONES.indexOf(from) < 3 ? 16.2 : 12.2);
    b.addScaledVector(direction, ZONES.indexOf(to) < 3 ? -16.2 : -12.2);
    const mid = a.clone().lerp(b, .5); mid.y += 2.4; mid.x += (i % 2 ? 1 : -1) * 4;
    const length = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
    return { from: fromId, to: toId, start: v3(a), middle: v3(mid), end: v3(b), length: round(length), long: length > LONG_BRIDGE };
  });
}

/** The deck centre line of a bridge, the curve the design world extrudes the deck along. */
export function bridgeCurve(bridge: CorridorBridge) {
  return new T.CatmullRomCurve3([new T.Vector3(...bridge.start), new T.Vector3(...bridge.middle), new T.Vector3(...bridge.end)]);
}

/** The thirteen tour legs, eye to eye in `TOUR_ORDER`, closing back to the first stop. */
export function tourLegs(): Array<{ from: ZoneId; to: ZoneId }> {
  return TOUR_ORDER.map((from, i) => ({ from, to: TOUR_ORDER[(i + 1) % TOUR_ORDER.length] }));
}

/**
 * The camera's travel curve for a leg, as `CameraDirector.move` builds it from the authored
 * eyes: a centripetal spline through the start, a middle raised 7 above the higher eye, and the
 * end. `startAngle` swings the start eye about its target the way the reading arc does, so the
 * corridor can be sampled from every departure the director can make (up to 27.5 degrees).
 */
export function flightCurve(from: ZoneId, to: ZoneId, startAngle = 0) {
  const a = zone(from), b = zone(to);
  const dx = a.eye[0] - a.target[0], dz = a.eye[2] - a.target[2];
  const start = new T.Vector3(
    a.target[0] + dx * Math.cos(startAngle) - dz * Math.sin(startAngle),
    a.eye[1],
    a.target[2] + dx * Math.sin(startAngle) + dz * Math.cos(startAngle),
  );
  const end = new T.Vector3(...b.eye);
  const middle = start.clone().lerp(end, .5);
  middle.y = Math.max(start.y, end.y) + 7;
  return new T.CatmullRomCurve3([start, middle, end], false, "centripetal");
}

/**
 * The two fast legs (149 and 197 units in 18 s) get a sky lane. Every station was placed by
 * hand from the flight curve and checked (by the layout test) clear of the districts, the
 * arrival stage, the bridge decks and the travel corridor: the leg from the terrace to the
 * calendar crosses the whole connected world, so its four clouds sit only over the open water
 * of its first and last quarters and none over the Garden it passes; the leg from the fountain
 * descends from 40 to 12, so its clouds ride high over the middle of the world and step down.
 */
export const SKY_LANES: readonly SkyLane[] = [
  {
    from: "practice", to: "calendar",
    clouds: [
      // The Sanctuary to Pavilion bridge crosses this leg's first quarter at z 10: both puffs sit south of it.
      { t: .03, offset: [0, -9], drop: 14, scale: 1.5 },
      { t: .075, offset: [0, -9], drop: 14, scale: 1.7 },
      // Nothing in the middle third: the flight passes the Sanctuary's parked camera, the
      // arrival stage and the Garden there, and the Garden's own cloud collar is the cloud.
      { t: .75, offset: [0, 0], drop: 14, scale: 1.6 },
      { t: .92, offset: [0, 0], drop: 14, scale: 1.5 },
    ],
    // Two, not the design's three: the third's natural place, south of the leg's east half, is
    // already taken by the islet beside the Garden to Grove bridge, which the flight passes.
    islets: [
      { center: [-45, -.6, 38], scale: 1.3 },
      { center: [16, .2, 44], scale: 1.2 },
    ],
  },
  {
    from: "milestone", to: "live-feed",
    clouds: [
      { t: .08, offset: [0, 0], drop: 14, scale: 1.7 },
      { t: .2, offset: [-14, 0], drop: 14, scale: 1.6 },
      { t: .32, offset: [22, 4], drop: 14, scale: 1.5 },
      { t: .44, offset: [0, 0], drop: 14, scale: 1.7 },
      { t: .56, offset: [10, -8], drop: 14, scale: 1.6 },
      { t: .68, offset: [0, 0], drop: 14, scale: 1.5 },
      { t: .8, offset: [-18, 12], drop: 14, scale: 1.6 },
    ],
    islets: [
      { center: [44.6, -.4, -38.5], scale: 1.3 },
      { center: [85.7, .1, 18.4], scale: 1.25 },
    ],
  },
];

/**
 * Which side of its bridge a long bridge's islet takes: away from the world's centre, except
 * the Garden to Sanctuary bridge, whose outer side is the arrival stage's reserved cylinder;
 * its islet sits in the lagoon between the three first districts instead.
 */
const ISLET_SIDE: Partial<Record<string, 1 | -1>> = { "garden>heart": -1 };

function laneKey(lane: { from: ZoneId; to: ZoneId }) { return `${lane.from}>${lane.to}`; }

/** Every islet: one beside each long bridge, plus the sky lane islets. Pure and deterministic. */
export function corridorIslets(): CorridorIslet[] {
  const islets: CorridorIslet[] = [];
  const point = new T.Vector3(), tangent = new T.Vector3();
  corridorBridges().forEach((bridge, i) => {
    if (!bridge.long) return;
    const curve = bridgeCurve(bridge);
    curve.getPoint(.5, point); curve.getTangent(.5, tangent);
    const side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
    const away = Math.sign(side.x * (point.x - WORLD_CENTRE[0]) + side.z * (point.z - WORLD_CENTRE[1])) || 1;
    side.multiplyScalar(away * (ISLET_SIDE[laneKey(bridge)] ?? 1) * ISLET_SIDE_OFFSET);
    const scale = 1.5;
    const center: V3 = [round(point.x + side.x), round(point.y - ISLET_BELOW_DECK), round(point.z + side.z)];
    islets.push({
      center, radius: KIT_ISLAND.grassRadius * scale, scale, rotationY: round((i * 2.399) % (Math.PI * 2)),
      tree: { position: [round(center[0] + 1.2), center[1], round(center[2] - .8)], rotationY: round((i * 1.7) % (Math.PI * 2)), scale: 1.15 },
      reason: `bridge ${laneKey(bridge)}`,
    });
  });
  SKY_LANES.forEach((lane, l) => {
    lane.islets.forEach((spec, i) => {
      const center: V3 = spec.center;
      islets.push({
        center, radius: KIT_ISLAND.grassRadius * spec.scale, scale: spec.scale, rotationY: round(((l * 3 + i) * 1.9) % (Math.PI * 2)),
        tree: { position: [round(center[0] - 1), center[1], round(center[2] + .9)], rotationY: round(((l * 3 + i) * 2.3) % (Math.PI * 2)), scale: 1.1 },
        reason: `sky lane ${laneKey(lane)}`,
      });
    });
  });
  return islets;
}

/** Two lantern posts at each end of every bridge, 2.6 off the deck centre line, on the deck. */
export function corridorPosts(): CorridorPost[] {
  const posts: CorridorPost[] = [];
  const point = new T.Vector3(), tangent = new T.Vector3();
  for (const bridge of corridorBridges()) {
    const curve = bridgeCurve(bridge);
    for (const t of [.03, .97]) {
      curve.getPoint(t, point); curve.getTangent(t, tangent);
      const side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
      const yaw = Math.atan2(tangent.x, tangent.z);
      for (const sign of [-1, 1]) posts.push({ position: [round(point.x + side.x * POST_SIDE_OFFSET * sign), round(point.y + .02), round(point.z + side.z * POST_SIDE_OFFSET * sign)], rotationY: round(yaw), bridge: laneKey(bridge) });
    }
  }
  return posts;
}

/** The sky lane clouds, world space, each 14 below the flight line at its station. */
export function corridorClouds(): CorridorCloud[] {
  const clouds: CorridorCloud[] = [];
  const point = new T.Vector3();
  SKY_LANES.forEach((lane, l) => {
    const curve = flightCurve(lane.from, lane.to);
    lane.clouds.forEach((spec, i) => {
      curve.getPoint(spec.t, point);
      clouds.push({ position: [round(point.x + spec.offset[0]), round(point.y - spec.drop), round(point.z + spec.offset[1])], rotationY: round(((l * 7 + i) * 1.3) % (Math.PI * 2)), scale: spec.scale, lane: laneKey(lane) });
    });
  });
  return clouds;
}

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
 * Anything else (the lantern's emissive glow) keeps the material the file brought.
 */
export function corridorMaterialFor(name: string, palette: CorridorPalette, imported: T.Material | undefined) {
  const word = name.toLowerCase().split(/[^a-z]+/).filter(Boolean).pop() ?? "";
  const table: Record<string, T.Material> = {
    grass: palette.lawn, lawn: palette.lawn, rock: palette.stone, stone: palette.stone, bark: palette.roseGold,
    blossom: palette.blossom, petal: palette.blossom, gold: palette.gold, pearl: palette.ivory, cotton: palette.cloud,
  };
  return table[word] ?? imported ?? palette.ivory;
}

const dummy = new T.Object3D();

export function applyKitCorridors(context: DesignKitContext): KitBuilderHandle | void {
  const { kit, scene } = context;
  const meshes: T.InstancedMesh[] = [];
  const palette: CorridorPalette = {
    ivory: context.palette.ivory, gold: context.palette.gold, lawn: context.palette.lawn, stone: context.palette.stone, roseGold: context.palette.roseGold,
    blossom: context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f0a8b8", roughness: .52, sheen: .8, sheenColor: new T.Color("#ffe4ec"), sheenRoughness: .5, dithering: true }), "#fff0e0", 2.2, .3)),
    cloud: context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f6d4df", roughness: .92, sheen: .5, sheenColor: new T.Color("#fff3f6"), sheenRoughness: .6, dithering: true }), "#fff4ea", 2.4, .28)),
  };
  palette.blossom.name = "corridor blossom"; palette.cloud.name = "corridor cloud";

  function instanced(id: KitAssetId, keep: number, name: string, count: number, shadow: boolean) {
    const geometry = decimatedKitGeometry(kit, id, keep, context.geometry);
    const imported = importedMaterials(kit, id);
    const names = (geometry.userData.kitMaterials as string[] | undefined) ?? [];
    const materials = names.length ? names.map(material => corridorMaterialFor(material, palette, imported.get(material))) : [palette.ivory];
    const mesh = new T.InstancedMesh(geometry, materials.length === 1 ? materials[0] : materials, count);
    mesh.name = name;
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    // Never merged by the static batch: it is instanced, and it keeps its own matrices.
    mesh.userData.dynamic = true;
    meshes.push(mesh); scene.add(mesh);
    return mesh;
  }
  function place(mesh: T.InstancedMesh, i: number, position: V3, rotationY: number, scale: number) {
    dummy.position.set(position[0], position[1], position[2]);
    dummy.rotation.set(0, rotationY, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  function finish(mesh: T.InstancedMesh) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  // Lantern posts: four per bridge, one draw per material world wide, culled by distance below.
  let posts: T.InstancedMesh | undefined;
  const postTable = corridorPosts();
  const postOrder = postTable.map((_, i) => i);
  const postDistance = new Float32Array(postTable.length);
  if (kit.has("landmark.lantern-post") && postTable.length) {
    posts = instanced("landmark.lantern-post", .22, "Kit corridor lantern posts", postTable.length, false);
    postTable.forEach((post, i) => place(posts!, i, post.position, post.rotationY, 1.1));
    finish(posts);
  }

  // Islets beside the long bridges and along the sky lanes, each with a blossom tree.
  const islets = corridorIslets();
  if (kit.has("nature.island-small") && islets.length) {
    const mesh = instanced("nature.island-small", .3, "Kit corridor islets", islets.length, true);
    islets.forEach((islet, i) => place(mesh, i, [islet.center[0], islet.center[1] - KIT_ISLAND.grassAbovePivot * islet.scale, islet.center[2]], islet.rotationY, islet.scale));
    finish(mesh);
    if (kit.has("nature.blossom-tree-a")) {
      const trees = instanced("nature.blossom-tree-a", .28, "Kit corridor islet trees", islets.length, true);
      islets.forEach((islet, i) => place(trees, i, islet.tree.position, islet.tree.rotationY, islet.tree.scale));
      finish(trees);
    }
  }

  // The sky lane clouds: sculpted puffs the camera passes over on the two long legs.
  const clouds = corridorClouds();
  if (kit.has("nature.cloud-c") && clouds.length) {
    const mesh = instanced("nature.cloud-c", .14, "Kit corridor sky lane clouds", clouds.length, false);
    clouds.forEach((cloud, i) => place(mesh, i, cloud.position, cloud.rotationY, cloud.scale));
    finish(mesh);
  }

  const lastCamera = new T.Vector3(Number.NaN, 0, 0);
  return {
    update() {
      // Posts are drawn nearest first, and only within POST_VIEW_DISTANCE of the camera: the
      // instance list is reordered so `count` cuts the far ones. Re sorted when the camera has
      // moved two units, which a still frame after a jump always has.
      if (!posts) return;
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      if (!camera || camera.position.distanceToSquared(lastCamera) < 4) return;
      lastCamera.copy(camera.position);
      postTable.forEach((post, i) => { postDistance[i] = Math.hypot(post.position[0] - camera.position.x, post.position[1] - camera.position.y, post.position[2] - camera.position.z); });
      postOrder.sort((a, b) => postDistance[a] - postDistance[b]);
      let near = 0;
      postOrder.forEach((index, slot) => {
        const post = postTable[index];
        place(posts!, slot, post.position, post.rotationY, 1.1);
        if (postDistance[index] <= POST_VIEW_DISTANCE) near = slot + 1;
      });
      posts.count = near;
      posts.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const mesh of meshes) { mesh.removeFromParent(); mesh.dispose(); }
      meshes.length = 0;
    },
  };
}
