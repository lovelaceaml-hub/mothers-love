import * as T from "three";
import type { KitAsset } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { createKitRemap, kitMaterialWords, type MaterialRemap } from "../kit/kit-materials";
import type { DesignKitContext, DesignKitDistrict } from "./design-world";
import { decimatedKitGeometry } from "./kit-corridors";
import type { KitPlacement } from "./kit-layout-far";
import { studyGlass, studyRim } from "./study-materials";

/** The share of vertices each repeated piece keeps when decimated (see `decimatedKitGeometry`). */
export const FAR_KEEP: Readonly<Record<string, number>> = {
  "nature.rose-bush": .22, "nature.hydrangea-bush": .22, "nature.lily-pads": .3, "nature.stepping-stones": .3,
  "nature.crystal-pink": .5, "nature.crystal-lavender": .5, "nature.crystal-blue": .5,
  "nature.cloud-a": .3, "nature.cloud-b": .3, "nature.cloud-c": .3, "landmark.lantern-post": .18, "landmark.pearl-column": .35,
  "core.pearl": .3, "core.flower": .35,
};
/** The kit arch's authored size, kit units (the same bounds K3a's arch row uses). */
export const KIT_ARCH = { width: 3.89, height: 5.19 } as const;
type Stamp = (mesh: T.InstancedMesh, i: number, position: readonly number[], scale: readonly number[], rotation: T.Euler) => void;

/** The far builder's shared pieces: its materials, the baked and decimated geometry, and placement. */
export function farZonePieces(context: DesignKitContext, at: T.Vector3) {
  const { kit, palette } = context;

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

  return { instancedMesh, stamp, scaleOf, placeStatic, placeAnimated, placePiece, removeLandmark, replaceArchRow };
}
