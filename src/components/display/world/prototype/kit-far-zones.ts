import * as T from "three";
import type { ArrivalState } from "../arrival-director";
import type { ZoneId } from "../world-data";
import { scrubbed } from "../kit/kit-clips";
import type { KitAsset } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { createKitRemap, kitMaterialWords, type MaterialRemap } from "../kit/kit-materials";
import type { DesignKitContext, DesignKitDistrict, KitBuilderHandle } from "./design-world";
import { decimatedKitGeometry } from "./kit-corridors";
import {
  COSMOS_CENTER,
  COSMOS_RINGS,
  COSMOS_SUN,
  EXPRESSION_PIECES,
  FAR_ZONE_DRESSING,
  FAR_ZONE_IDS,
  FAR_ZONE_LAYOUTS,
  FOUNTAIN_PEARLS,
  RIVER_CANAL,
  TERRACE_Y,
  calendarDayPlacements,
  cosmosPearlPose,
  cosmosPlanetPose,
  farZoneCommonLayouts,
  fountainPearlPose,
  observatoryColumnScale,
  promiseRibbonYaw,
  type KitPlacement,
} from "./kit-layout-far";
import { studyGlass, studyRim } from "./study-materials";

/**
 * The six far districts dressed from K3b's tables (WORLD-INTEGRATION 6.11 to 6.16): the
 * Garden of Days, the Love Observatory, the Expression Cosmos, the Fountain of Kindness, the
 * River of Recognitions and the Peace Promise, plus the common replacements of 6.3 for them
 * (kit arches on the arch row, forecourt lantern posts, the bench, roses, hydrangeas).
 *
 * Owned by lane K3b. The design planned for K3a's district builder to consume these tables
 * after both lanes merge; until the coordinator wires that, `applyKitCorridors` calls this
 * builder so the far zones are dressed, judged and captured on this lane (the director's
 * note 1 on the round three captures: the far zones were still the procedural study).
 * `?far=off` keeps the far districts procedural while the corridors stay dressed, for A/B.
 * At integration the coordinator picks one of the two: this builder, called once from the
 * design world after `applyKitDistricts` (it carries the clock work the tables describe in
 * `FAR_ZONE_DRESSING`), or K3a's generic table renderer for the statics alone.
 *
 * Cost shape (design 7.2, 7.4): static pieces are clones on the study's shared materials
 * placed straight into the district frame, so the study batcher merges them per material
 * with the procedural ivory and gold; repeated pieces are one `InstancedMesh` per asset per
 * district, decimated at load and their colours baked into a vertex colour so each is one
 * draw; the clock driven pieces (helix and cosmos pearls, cosmos rings, the observatory
 * columns) are instanced meshes restamped on the world clock, the nine expression pieces of
 * each of the two zones are baked to one draw each, and the lotus and the two promise
 * ribbons are clones. Every geometry and material goes through the context registrars.
 */

/** `?far=off` keeps the six far districts procedural while the corridors stay dressed. */
export function farZonesEnabled(search: string): boolean {
  return !/[?&]far=off(?:&|$)/.test(search);
}

/** Repeated pieces hide past this distance from their district centre (design 7.2, 7.5). */
export const FAR_DETAIL_DISTANCE = { high: 140, auto: 110, low: 70 } as const;
/** The share of vertices each repeated piece keeps when decimated (see `decimatedKitGeometry`). */
export const FAR_KEEP: Readonly<Record<string, number>> = {
  "nature.rose-bush": .22, "nature.hydrangea-bush": .22, "nature.lily-pads": .3, "nature.stepping-stones": .3,
  "nature.crystal-pink": .5, "nature.crystal-lavender": .5, "nature.crystal-blue": .5,
  "nature.cloud-a": .3, "nature.cloud-b": .3, "nature.cloud-c": .3, "landmark.lantern-post": .18, "landmark.pearl-column": .35,
  "core.pearl": .3, "core.flower": .35,
};
/** The kit arch's authored size, kit units (the same bounds K3a's arch row uses). */
export const KIT_ARCH = { width: 3.89, height: 5.19 } as const;
/** The observatory columns ease toward their data height at this time constant (design 6.12). */
export const COLUMN_TAU = 1.2;
/** The cosmos sun (the selected expression) eases to its place over this long (design 6.13). */
export const SUN_EASE_SECONDS = 2;
/** The lotus opens or closes over this long (design 6.15). */
export const LOTUS_TAU = 1.5;

type Insights = {
  calendar?: ReadonlyArray<{ periodStart: string; recognitions: number }>;
  month?: { expressionCounts?: number[] };
  goal?: { value?: number; target?: number; achieved?: boolean };
};
type FrameUpdate = (time: number, zone: ZoneId, arrival: ArrivalState | undefined) => void;
type Stamp = (mesh: T.InstancedMesh, i: number, position: readonly number[], scale: readonly number[], rotation: T.Euler) => void;

export function applyKitFarZones(context: DesignKitContext): KitBuilderHandle | void {
  const { kit, scene, palette } = context;
  const updates: FrameUpdate[] = [];
  const disposers: Array<() => void> = [];
  const detailGroups: Array<{ center: T.Vector3; group: T.Group }> = [];
  const stats: Record<string, { placed: number; skipped: string[]; instanced: number; animated: number; statics: number }> = {};
  const dummy = new T.Object3D(), at = new T.Vector3(), spin = new T.Euler();

  /* ---------------------------------------------------------------------------------------- */
  /* Materials                                                                                */
  /* ---------------------------------------------------------------------------------------- */

  const glass = context.material(studyGlass(.3));
  glass.name = "kit far glass";
  const rose = context.material(new T.MeshPhysicalMaterial({ color: "#f28da6", roughness: .4, clearcoat: .4, sheen: .3, sheenColor: new T.Color("#ffd1dd"), dithering: true }));
  rose.name = "kit far rose";
  const baseRemap = createKitRemap({
    ivory: palette.ivory, gold: palette.gold, stone: palette.stone, leaf: palette.leaf, lawn: palette.lawn,
    bloom: palette.bloom, silk: palette.silk, water: palette.water, glass: () => glass,
  });
  /** Statics and animated clones: the study's materials by role, rose and blush on one kit rose, bark on the rose gold. */
  const remap: MaterialRemap = (name, imported) => {
    const words = kitMaterialWords(name);
    if (words.includes("rose") || words.includes("blush")) return rose;
    if (words.includes("bark") || words.includes("trunk")) return palette.roseGold;
    return baseRemap(name, imported);
  };
  /** Baked pieces: one `vertexColors` material per class, the file's colours in the vertices. */
  const flora = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .62, sheen: .28, sheenColor: new T.Color("#ffe6ec"), dithering: true }));
  flora.name = "kit far flora";
  const piece = studyRim(context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .35, metalness: .04, clearcoat: .5, clearcoatRoughness: .3, dithering: true })), "#ffe6c9", 3, .22);
  piece.name = "kit far piece";
  const crystal = context.material(new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .1, metalness: .05, clearcoat: 1, clearcoatRoughness: .08, emissive: new T.Color("#ffffff"), emissiveIntensity: .12, transparent: true, opacity: .86, dithering: true }));
  crystal.name = "kit far crystal";
  const cloud = context.material(studyRim(new T.MeshPhysicalMaterial({ color: "#f8dde6", roughness: .96, sheen: 1, sheenColor: new T.Color("#fff6f8"), sheenRoughness: .7, dithering: true }), "#fff4ea", 2.2, .34));
  cloud.name = "kit far cloud";

  /* ---------------------------------------------------------------------------------------- */
  /* Geometry                                                                                 */
  /* ---------------------------------------------------------------------------------------- */

  const importedByName = new Map<KitAssetId, Map<string, T.Material>>();
  function imported(id: KitAssetId) {
    let map = importedByName.get(id);
    if (map) return map;
    map = new Map<string, T.Material>();
    kit.asset(id)?.template.traverse(object => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!map!.has(material.name)) map!.set(material.name, material);
    });
    importedByName.set(id, map);
    return map;
  }
  /** Linear base colours of a template's materials, by name. */
  function templateColours(asset: KitAsset | undefined) {
    const out = new Map<string, T.Color>();
    asset?.template.traverse(object => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const colour = (material as T.MeshStandardMaterial).color;
        out.set(material.name, colour ? colour.clone() : new T.Color(1, 1, 1));
      }
    });
    return out;
  }
  /**
   * A geometry's material groups baked into a vertex colour (the file's colour, times any
   * colour attribute it carries), so one `vertexColors` material draws it in one call.
   */
  function bakeColours(geometry: T.BufferGeometry, id: KitAssetId) {
    const names = (geometry.userData.kitMaterials as string[] | undefined) ?? [];
    const colours = templateColours(kit.asset(id));
    const count = geometry.getAttribute("position").count;
    const existing = geometry.getAttribute("color");
    const out = new Float32Array(count * 3).fill(1);
    const groups = geometry.groups.length ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    for (const group of groups) {
      const colour = colours.get(names[group.materialIndex ?? 0]) ?? new T.Color(1, 1, 1);
      for (let i = group.start; i < Math.min(count, group.start + group.count); i++) {
        out[i * 3] = colour.r * (existing ? existing.getX(i) : 1);
        out[i * 3 + 1] = colour.g * (existing ? existing.getY(i) : 1);
        out[i * 3 + 2] = colour.b * (existing ? existing.getZ(i) : 1);
      }
    }
    geometry.setAttribute("color", new T.BufferAttribute(out, 3));
    geometry.clearGroups();
    return geometry;
  }
  const decimated = new Map<string, T.BufferGeometry>();
  /** The decimated copy of a kit piece for instancing, cached per id. */
  function lighter(id: KitAssetId) {
    let geometry = decimated.get(id);
    if (!geometry) { geometry = decimatedKitGeometry(kit, id, FAR_KEEP[id] ?? .35, context.geometry); decimated.set(id, geometry); }
    return geometry;
  }
  const baked = new Map<string, T.BufferGeometry>();
  /** A one draw geometry: decimated when the piece repeats, the template's full detail otherwise. */
  function bakedGeometry(id: KitAssetId, light: boolean) {
    const key = `${id}|${light ? "light" : "full"}`;
    let geometry = baked.get(key);
    if (geometry) return geometry;
    if (light) geometry = bakeColours(lighter(id), id);
    else {
      const source = kit.geometry(id);
      geometry = bakeColours(source.index ? source.toNonIndexed() : source.clone(), id);
      geometry.computeBoundingSphere();
      context.geometry(geometry);
    }
    baked.set(key, geometry);
    return geometry;
  }
  /** The materials of a decimated piece, one per group, through the remap (with `overrides` by the name's last word). */
  function groupMaterials(geometry: T.BufferGeometry, id: KitAssetId, overrides: Partial<Record<string, T.Material>> = {}) {
    const names = (geometry.userData.kitMaterials as string[] | undefined) ?? [];
    const own = imported(id);
    const list = names.map(name => {
      const word = name.toLowerCase().split(/[^a-z]+/).filter(Boolean).pop() ?? "";
      return overrides[word] ?? remap(name, own.get(name) ?? palette.ivory);
    });
    return list.length === 1 ? list[0] : list.length ? list : palette.ivory;
  }
  const isCrystal = (id: string) => id.startsWith("nature.crystal");
  const isFlora = (id: string) => /^nature\.(rose|hydrangea|lily|stepping)/.test(id);
  /** One instanced mesh for a repeated piece: baked flora, crystals and pieces; remapped materials otherwise. */
  function instancedMesh(parent: T.Object3D, id: KitAssetId, count: number, name: string, shadow = false) {
    let geometry: T.BufferGeometry, material: T.Material | T.Material[];
    if (isCrystal(id)) { geometry = bakedGeometry(id, true); material = crystal; }
    else if (isFlora(id)) { geometry = bakedGeometry(id, true); material = flora; }
    else if (id.startsWith("expression.") || id === "core.flower") { geometry = bakedGeometry(id, true); material = piece; }
    else { geometry = lighter(id); material = groupMaterials(geometry, id, { cotton: cloud }); }
    const mesh = context.instance(parent, geometry, Array.isArray(material) ? material[0] : material, count, shadow);
    if (Array.isArray(material)) mesh.material = material;
    mesh.name = name;
    if (isCrystal(id)) mesh.layers.enable(1);
    return mesh;
  }
  const stamp: Stamp = (mesh, i, position, scale, rotation) => {
    at.set(position[0], position[1], position[2]);
    context.stamp(mesh, i, at, scale as number[], rotation);
  };
  const scaleOf = (placement: KitPlacement): [number, number, number] => [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];

  /* ---------------------------------------------------------------------------------------- */
  /* Placement                                                                                */
  /* ---------------------------------------------------------------------------------------- */

  /** A static clone in the district frame: the study batcher merges its meshes by material. */
  function placeStatic(parent: T.Object3D, placement: KitPlacement, scale: [number, number, number] = scaleOf(placement)) {
    const node = kit.instance(placement.id, remap);
    node.name = `Kit far ${placement.id}`;
    node.position.fromArray(placement.position);
    node.rotation.set(placement.tilt?.[0] ?? 0, placement.rotationY ?? 0, placement.tilt?.[1] ?? 0);
    node.scale.set(scale[0], scale[1], scale[2]);
    node.traverse(object => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh) return;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      mesh.castShadow = !material.transparent;
      mesh.receiveShadow = true;
    });
    parent.add(node);
    return node;
  }
  /** An animated clone: never merged, updated on the clock by its zone. */
  function placeAnimated(parent: T.Object3D, placement: KitPlacement) {
    const node = placeStatic(parent, placement);
    node.userData.dynamic = true;
    node.traverse(object => { const mesh = object as T.Mesh; if (mesh.isMesh) { mesh.castShadow = false; mesh.frustumCulled = false; } });
    return node;
  }
  /** A baked expression piece as one mesh, so its per frame motion costs one draw. */
  function placePiece(parent: T.Object3D, placement: KitPlacement) {
    const mesh = new T.Mesh(bakedGeometry(placement.id, false), piece);
    mesh.name = `Kit far ${placement.id}`;
    mesh.userData.dynamic = true;
    mesh.position.fromArray(placement.position);
    mesh.rotation.y = placement.rotationY ?? 0;
    mesh.scale.setScalar(placement.scale ?? 1);
    mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false;
    parent.add(mesh);
    return mesh;
  }

  /** The procedural landmark pieces of a far district go (design 6.11 to 6.16), the tier falls through `removeFall`. */
  function removeLandmark(district: DesignKitDistrict) {
    for (const object of district.landmark.slice()) {
      if ((object as T.Mesh).isMesh && district.falls.includes(object as T.Mesh)) { context.removeFall(object as T.Mesh); continue; }
      object.removeFromParent();
    }
    district.landmark.length = 0;
  }
  /** The common replacement of 6.3: kit arches where the procedural row stands, the keystone lanterns rehung on anchors. */
  function replaceArchRow(district: DesignKitDistrict, group: T.Group) {
    if (!kit.has("landmark.pearl-arch")) return 0;
    const count = district.arches.filter(record => record.parent === district.layout).length;
    const width = 4.8, spacing = width * 1.1;
    let k = 0;
    for (const record of district.arches) {
      if (record.parent !== district.layout) continue;
      const height = record.height;
      const placement: KitPlacement = { id: "landmark.pearl-arch", position: [(k - (count - 1) / 2) * spacing, .65, -9.3], role: "static", note: `arch row ${k + 1} of ${count}` };
      record.root.removeFromParent();
      const node = placeStatic(district.layout, placement, [spacing / KIT_ARCH.width, height / KIT_ARCH.height, spacing / KIT_ARCH.width]);
      if (record.crown) {
        const anchor = new T.Group();
        anchor.name = `Kit far arch anchor ${k}`;
        anchor.position.copy(node.position); anchor.scale.copy(node.scale);
        group.add(anchor);
        record.crown.root = anchor;
        record.crown.height = KIT_ARCH.height;
      }
      const index = district.landmark.indexOf(record.root);
      if (index >= 0) district.landmark.splice(index, 1);
      k++;
    }
    return k;
  }

  const selected = () => (typeof scene.userData.studyExpression === "number" ? (scene.userData.studyExpression as number) : -1);
  const insights = (): Insights => (scene.userData.studyInsights && typeof scene.userData.studyInsights === "object" ? (scene.userData.studyInsights as Insights) : {});

  /* ---------------------------------------------------------------------------------------- */
  /* The six zones                                                                            */
  /* ---------------------------------------------------------------------------------------- */

  const common = new Map(farZoneCommonLayouts().map(layout => [layout.zone, layout]));
  for (const layout of FAR_ZONE_LAYOUTS) {
    const district = context.districts.get(layout.zone);
    if (!district) continue;
    const zoneStats = { placed: 0, skipped: [] as string[], instanced: 0, animated: 0, statics: 0 };
    stats[layout.zone] = zoneStats;
    // Everything that moves or repeats lives here, skipped by the batcher and hidden past the detail distance.
    const dynamic = new T.Group();
    dynamic.name = `Kit far ${layout.zone} dynamic`;
    dynamic.userData.dynamic = true;
    district.layout.add(dynamic);
    detailGroups.push({ center: new T.Vector3().fromArray(district.zone.center), group: dynamic });

    if (FAR_ZONE_DRESSING.find(row => row.zone === layout.zone)?.remove.startsWith("nothing") !== true) removeLandmark(district);
    zoneStats.statics += replaceArchRow(district, dynamic);

    const instancedByAsset = new Map<KitAssetId, KitPlacement[]>();
    const pieces: Array<{ placement: KitPlacement; mesh: T.Mesh; index: number }> = [];
    const animated: Array<{ placement: KitPlacement; node: T.Object3D }> = [];
    const rings: KitPlacement[] = [], columns: KitPlacement[] = [], helix: KitPlacement[] = [], cosmosPearls: KitPlacement[] = [];
    const placements: KitPlacement[] = [...layout.placements, ...(common.get(layout.zone)?.placements ?? [])];
    for (const placement of placements) {
      if (!kit.has(placement.id)) { zoneStats.skipped.push(placement.id); continue; }
      zoneStats.placed++;
      const id = placement.id;
      // The zone's clock driven sets are gathered, not placed one by one.
      if (layout.zone === "orbit" && id === "recognition.orbit-ring") { rings.push(placement); continue; }
      if (layout.zone === "status" && id === "landmark.pearl-column") { columns.push(placement); continue; }
      if (layout.zone === "milestone" && id === "core.pearl") { helix.push(placement); continue; }
      if (layout.zone === "orbit" && id === "core.pearl") { cosmosPearls.push(placement); continue; }
      if (id.startsWith("expression.")) { pieces.push({ placement, mesh: placePiece(dynamic, placement), index: EXPRESSION_PIECES.indexOf(id) }); zoneStats.animated++; continue; }
      const role = placement.role ?? "static";
      if (role === "instanced") {
        const list = instancedByAsset.get(id) ?? [];
        list.push(placement);
        instancedByAsset.set(id, list);
        continue;
      }
      if (role === "animated") { animated.push({ placement, node: placeAnimated(dynamic, placement) }); zoneStats.animated++; continue; }
      placeStatic(district.layout, placement);
      zoneStats.statics++;
    }
    for (const [id, list] of instancedByAsset) {
      const mesh = instancedMesh(dynamic, id, list.length, `Kit far ${layout.zone} ${id} x${list.length}`, id === "landmark.lantern-post");
      list.forEach((placement, i) => { spin.set(placement.tilt?.[0] ?? 0, placement.rotationY ?? 0, placement.tilt?.[1] ?? 0); stamp(mesh, i, placement.position, scaleOf(placement), spin); });
      context.finish(mesh);
      zoneStats.instanced++;
    }

    switch (layout.zone) {
      case "calendar": {
        // Day pearls and flowers from the public aggregate calendar, rebuilt when it changes,
        // cleared with the feed; the pearls bob on the clock (design 6.11).
        const capacity = 31;
        const pearls = instancedMesh(dynamic, "core.pearl", capacity, "Kit far calendar day pearls");
        const flowers = kit.has("core.flower") ? instancedMesh(dynamic, "core.flower", capacity, "Kit far calendar day flowers") : undefined;
        pearls.count = 0; if (flowers) flowers.count = 0;
        pearls.frustumCulled = false; if (flowers) flowers.frustumCulled = false;
        let signature = "";
        let days: KitPlacement[] = [];
        updates.push(time => {
          const calendar = insights().calendar ?? [];
          const next = calendar.map(day => `${day.periodStart}:${day.recognitions}`).join("|");
          if (next !== signature) {
            signature = next;
            days = calendarDayPlacements(calendar);
            const flowerDays = days.filter(day => day.id === "core.flower");
            if (flowers) {
              flowerDays.slice(0, capacity).forEach((day, i) => { spin.set(0, day.rotationY ?? 0, 0); stamp(flowers, i, day.position, scaleOf(day), spin); });
              flowers.count = Math.min(capacity, flowerDays.length);
              context.finish(flowers);
            }
          }
          const pearlDays = days.filter(day => day.id === "core.pearl").slice(0, capacity);
          pearlDays.forEach((day, i) => {
            at.set(day.position[0], day.position[1] + Math.sin(time * .5 + i) * .12, day.position[2]);
            spin.set(0, time * .2 + i, 0);
            context.stamp(pearls, i, at, scaleOf(day), spin);
          });
          pearls.count = pearlDays.length;
          pearls.instanceMatrix.needsUpdate = true;
        });
        break;
      }
      case "status": {
        // Nine columns, one instanced mesh, each easing toward its count's height; a piece
        // rides .75 above each column top, bobbing, the selected one turning (design 6.12).
        if (columns.length) {
          const mesh = instancedMesh(dynamic, "landmark.pearl-column", columns.length, `Kit far status columns x${columns.length}`, true);
          mesh.frustumCulled = false;
          const heights = columns.map(() => observatoryColumnScale(1, 1));
          let last = 0;
          updates.push(time => {
            const counts = insights().month?.expressionCounts ?? [];
            const max = Math.max(1, ...counts);
            const blend = 1 - Math.exp(-Math.max(0, time - last) / COLUMN_TAU);
            last = time;
            columns.forEach((column, i) => {
              const target = observatoryColumnScale(counts[i] ?? 0, counts.length ? max : 0) || observatoryColumnScale(1, 1);
              heights[i] += (target - heights[i]) * blend;
              spin.set(0, column.rotationY ?? 0, 0);
              stamp(mesh, i, column.position, [1, heights[i], 1], spin);
            });
            mesh.instanceMatrix.needsUpdate = true;
            for (const item of pieces) {
              const i = item.index;
              const top = TERRACE_Y + 4 * (heights[i] ?? 1);
              item.mesh.position.set(item.placement.position[0], top + .75 + Math.sin(time * .23 + i) * .15, item.placement.position[2]);
              item.mesh.rotation.y = (item.placement.rotationY ?? 0) + (selected() === i + 1 ? time * .3 : 0);
            }
          });
          zoneStats.instanced++;
        }
        break;
      }
      case "orbit": {
        // Four rings spinning about their own tilted axes, nine planets and nine pearls on
        // the back arcs, the selected expression easing to the apex as the sun (design 6.13).
        if (rings.length) {
          const mesh = instancedMesh(dynamic, "recognition.orbit-ring", rings.length, `Kit far cosmos rings x${rings.length}`);
          mesh.frustumCulled = false;
          mesh.layers.enable(1);
          updates.push(time => {
            rings.forEach((ring, i) => {
              const spec = COSMOS_RINGS[i] ?? COSMOS_RINGS[0];
              dummy.position.fromArray(ring.position);
              dummy.rotation.set(ring.tilt?.[0] ?? 0, ring.rotationY ?? 0, ring.tilt?.[1] ?? 0);
              dummy.rotateY(time * (.06 + spec.k * .01));
              dummy.scale.setScalar(ring.scale ?? 1);
              dummy.updateMatrix();
              mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
          });
          zoneStats.instanced++;
        }
        if (cosmosPearls.length) {
          const mesh = instancedMesh(dynamic, "core.pearl", cosmosPearls.length, `Kit far cosmos pearls x${cosmosPearls.length}`);
          mesh.frustumCulled = false;
          const size = scaleOf(cosmosPearls[0]);
          updates.push(time => {
            cosmosPearls.forEach((_, i) => { spin.set(0, time * .3 + i, 0); stamp(mesh, i, cosmosPearlPose(i, time), size, spin); });
            mesh.instanceMatrix.needsUpdate = true;
          });
          zoneStats.instanced++;
        }
        const sunBlend = pieces.map(() => 0);
        let last = 0;
        updates.push(time => {
          const delta = Math.max(0, time - last); last = time;
          for (const item of pieces) {
            const i = item.index;
            const target = selected() === i + 1 ? 1 : 0;
            sunBlend[i] = Math.max(0, Math.min(1, sunBlend[i] + (target ? delta : -delta) / SUN_EASE_SECONDS));
            const ease = sunBlend[i] * sunBlend[i] * (3 - 2 * sunBlend[i]);
            const pose = cosmosPlanetPose(i, time).position;
            item.mesh.position.set(
              pose[0] + (COSMOS_SUN[0] - pose[0]) * ease,
              pose[1] + (COSMOS_SUN[1] - pose[1]) * ease + Math.sin(time * .4 + i) * .1 * ease,
              pose[2] + (COSMOS_SUN[2] - pose[2]) * ease,
            );
            item.mesh.scale.setScalar((item.placement.scale ?? .7) + (1.1 - (item.placement.scale ?? .7)) * ease);
            item.mesh.rotation.y = time * (.25 + .35 * ease) + i;
          }
        });
        break;
      }
      case "milestone": {
        // The helix pearls rise only as far as the week's goal progress (design 6.14).
        if (helix.length) {
          const mesh = instancedMesh(dynamic, "core.pearl", helix.length, `Kit far fountain pearls x${helix.length}`);
          mesh.frustumCulled = false;
          const size = scaleOf(helix[0]);
          updates.push(time => {
            const goal = insights().goal;
            const progress = goal && typeof goal.value === "number" && typeof goal.target === "number" && goal.target > 0 ? goal.value / goal.target : 1;
            for (let i = 0; i < helix.length && i < FOUNTAIN_PEARLS; i++) { spin.set(0, time * .5 + i, 0); stamp(mesh, i, fountainPearlPose(i, time, progress), size, spin); }
            mesh.instanceMatrix.needsUpdate = true;
          });
          zoneStats.instanced++;
        }
        break;
      }
      case "live-feed": {
        // The canal: an ellipse of the study water across the island's front third (design 6.15).
        const canal = context.mesh(district.layout, context.geometry(new T.CircleGeometry(1, 72)), palette.water, [...RIVER_CANAL.center], [RIVER_CANAL.radiusX, RIVER_CANAL.radiusZ, 1]);
        canal.rotation.x = -Math.PI / 2;
        canal.name = "Kit far river canal";
        canal.receiveShadow = true;
        canal.layers.enable(1);
        zoneStats.statics++;
        // The lotus opens while a recognition is read here and closes again, over 1.5 s.
        const lotus = animated.find(item => item.placement.id === "arrival.lotus-bloom");
        const clip = lotus && kit.asset("arrival.lotus-bloom")?.clips.get("bloom");
        if (lotus && clip) {
          const scrub = scrubbed(lotus.node, clip);
          scrub.set(0);
          disposers.push(() => scrub.dispose());
          let open = 0, last = 0;
          updates.push((time, zone) => {
            const blend = 1 - Math.exp(-Math.max(0, time - last) / LOTUS_TAU);
            last = time;
            open += ((zone === "live-feed" ? 1 : 0) - open) * blend;
            scrub.set(open);
          });
        }
        break;
      }
      case "promise": {
        // The two ribbons turn about y on the clock, each its own way (design 6.16).
        const ribbons = animated.filter(item => item.placement.id === "core.ribbon");
        updates.push(time => {
          ribbons.forEach((item, i) => { item.node.rotation.y = promiseRibbonYaw(i as 0 | 1, time); });
        });
        break;
      }
      default:
        break;
    }
  }

  scene.userData.kitFarZones = stats;
  console.debug("kit far zones", JSON.stringify(stats));

  // The first pose, before the batch, so a still frame before any update is complete.
  for (const fn of updates) fn(0, FAR_ZONE_IDS[0], undefined);

  const cameraAt = new T.Vector3();
  return {
    update(time, zone, arrival) {
      const camera = scene.userData.studyCamera as T.Camera | undefined;
      if (camera) {
        cameraAt.copy(camera.position);
        const lowTier = scene.userData.lowTier === true;
        const limit = lowTier ? FAR_DETAIL_DISTANCE.low : scene.userData.studyTier === "high" ? FAR_DETAIL_DISTANCE.high : FAR_DETAIL_DISTANCE.auto;
        for (const item of detailGroups) item.group.visible = cameraAt.distanceTo(item.center) < limit;
      }
      for (const fn of updates) fn(time, zone, arrival);
    },
    dispose() {
      disposers.forEach(fn => fn());
      disposers.length = 0;
    },
  };
}

/** For the layout test: the far zone ids this builder dresses, in the tables' order. */
export const FAR_BUILDER_ZONES: readonly ZoneId[] = FAR_ZONE_LAYOUTS.map(layout => layout.zone);
