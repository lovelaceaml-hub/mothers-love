import * as T from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { isWorldDesignStudy, studyKit } from "../prototype/design-mode";
import {
  KIT_BASE,
  isSameOriginKitBase,
  kitDecoderPath,
  kitLoadOrder,
  parseKitManifest,
  type KitAssetId,
  type KitManifest,
  type KitManifestEntry,
} from "./kit-manifest";
import { applyKitRemap, type MaterialRemap } from "./kit-materials";

export type { MaterialRemap } from "./kit-materials";

/**
 * The world's one door to the 3D Studio kit (WORLD-INTEGRATION 2.2 and 2.4).
 *
 * Same origin only: the manifest, every model and the Draco decoder come from `/world-kit/`,
 * never a CDN. The kit loads before the engine is built, so the design world batches its
 * scenery with kit pieces already in hand and the first presented frame is complete. Any
 * failure is local: an asset that does not arrive is listed in `missing` and its builder keeps
 * the procedural piece; a manifest, decoder or timeout failure yields no kit at all and the
 * whole procedural world stands, exactly as `?kit=off` draws it.
 */

export type KitAsset = {
  id: KitAssetId;
  entry: KitManifestEntry;
  /** Never added to a scene; every placement is a clone from `instance()`. */
  template: T.Object3D;
  clips: ReadonlyMap<string, T.AnimationClip>;
  skinned: boolean;
  /** Bounding sphere radius of the template, kit units. */
  radius: number;
  /** Bounding box height of the template, kit units. */
  height: number;
};

export type KitModel = { scene: T.Object3D; animations: T.AnimationClip[] };
/** Everything the loader needs from outside, so a Node test can stand in for the browser. */
export type KitIO = {
  fetchJson(url: string): Promise<unknown>;
  loadModel(url: string): Promise<KitModel>;
  /** Release the decoder workers. */
  dispose(): void;
};
export type KitLoadOptions = { timeoutMs?: number; ids?: readonly KitAssetId[] };

/** Past this the world stops waiting and draws whatever arrived (design 2.4). */
export const KIT_TIMEOUT_MS = 15_000;

function disposeObject(root: T.Object3D) {
  root.traverse(object => {
    const mesh = object as T.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as T.Material | T.Material[] | undefined;
    if (material) (Array.isArray(material) ? material : [material]).forEach(item => item.dispose());
  });
}

function prepare(entry: KitManifestEntry, model: KitModel): KitAsset {
  const template = model.scene;
  template.name = entry.id;
  template.userData.kitId = entry.id;
  template.updateMatrixWorld(true);
  let skinned = false;
  template.traverse(object => {
    if ((object as T.SkinnedMesh).isSkinnedMesh) skinned = true;
  });
  const box = new T.Box3().setFromObject(template);
  const sphere = box.isEmpty() ? new T.Sphere() : box.getBoundingSphere(new T.Sphere());
  return {
    id: entry.id,
    entry,
    template,
    clips: new Map(model.animations.map(clip => [clip.name, clip])),
    skinned,
    radius: sphere.radius,
    height: box.isEmpty() ? 0 : box.max.y - box.min.y,
  };
}

export class WorldKit {
  private readonly assets: ReadonlyMap<KitAssetId, KitAsset>;
  private readonly merged = new Map<KitAssetId, T.BufferGeometry>();
  private disposed = false;

  /** Loads the manifest, then every listed asset (or `ids`), recognition and arrival first. */
  static async load(base: string = KIT_BASE, options: KitLoadOptions = {}): Promise<WorldKit | undefined> {
    if (!isSameOriginKitBase(base)) return undefined;
    return loadWorldKit(base.replace(/\/+$/, ""), options, browserKitIO(kitDecoderPath(base)));
  }

  constructor(
    readonly manifest: KitManifest,
    assets: ReadonlyMap<KitAssetId, KitAsset>,
    /** Ids that were asked for and did not arrive; the world keeps a procedural piece for each. */
    readonly missing: readonly KitAssetId[],
    private readonly io?: Pick<KitIO, "dispose">,
  ) {
    this.assets = assets;
  }

  /** How many assets arrived. */
  get loaded() {
    return this.assets.size;
  }
  has(id: KitAssetId): boolean {
    return !this.disposed && this.assets.has(id);
  }
  asset(id: KitAssetId): KitAsset | undefined {
    return this.disposed ? undefined : this.assets.get(id);
  }
  ids(): KitAssetId[] {
    return [...this.assets.keys()];
  }

  /**
   * A placement: `SkeletonUtils.clone` for skinned assets, `Object3D.clone(true)` otherwise.
   * Geometry is shared with the template. Without `remap` the imported materials are shared
   * too; with it each mesh takes whatever the remap returns, which the caller owns.
   * Call `has(id)` first: a missing id throws, because its builder should have kept the
   * procedural piece instead.
   */
  instance(id: KitAssetId, remap?: MaterialRemap): T.Object3D {
    const asset = this.asset(id);
    if (!asset) throw new Error(`World kit asset ${id} is not loaded`);
    const root = asset.skinned ? cloneSkinned(asset.template) : asset.template.clone(true);
    root.userData = { kitId: id };
    if (remap) applyKitRemap(root, remap);
    return root;
  }

  /**
   * One static geometry for `InstancedMesh` use: every non skinned mesh of the template, in
   * the template's own space, merged with one group per source material. The group order is
   * `geometry.userData.kitMaterials` (material names), so a caller can build the matching
   * material array through its remap. Cached; owned and disposed by the kit.
   */
  geometry(id: KitAssetId): T.BufferGeometry {
    const cached = this.merged.get(id);
    if (cached) return cached;
    const asset = this.asset(id);
    if (!asset) throw new Error(`World kit asset ${id} is not loaded`);
    const root = asset.template;
    root.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    const parts: T.BufferGeometry[] = [];
    const names: string[] = [];
    const slots: number[] = [];
    root.traverse(object => {
      const mesh = object as T.Mesh;
      if (!mesh.isMesh || (mesh as T.SkinnedMesh).isSkinnedMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const source = mesh.geometry as T.BufferGeometry;
      const pieces = Array.isArray(mesh.material) && source.groups.length
        ? source.groups.map(group => ({ geometry: subGeometry(source, group.start, group.count), material: materials[group.materialIndex ?? 0] }))
        : [{ geometry: source.clone(), material: materials[0] }];
      for (const piece of pieces) {
        piece.geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
        const name = piece.material?.name || `material-${names.length}`;
        let slot = names.indexOf(name);
        if (slot < 0) { slot = names.length; names.push(name); }
        parts.push(piece.geometry);
        slots.push(slot);
      }
    });
    const merged = mergeParts(parts, slots) ?? new T.BufferGeometry();
    parts.forEach(part => part.dispose());
    merged.userData.kitMaterials = names;
    merged.userData.kitId = id;
    this.merged.set(id, merged);
    return merged;
  }

  /** Geometries, imported materials, cached merges and the decoder workers. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.assets.forEach(asset => disposeObject(asset.template));
    this.merged.forEach(geometry => geometry.dispose());
    this.merged.clear();
    this.io?.dispose();
  }
}

/** A standalone copy of one draw group of an indexed or non indexed geometry. */
function subGeometry(source: T.BufferGeometry, start: number, count: number) {
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const out = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(flat.attributes)) {
    const size = attribute.itemSize;
    const array = (attribute.array as Float32Array).slice(start * size, (start + count) * size);
    out.setAttribute(name, new T.BufferAttribute(array, size, attribute.normalized));
  }
  flat.dispose();
  return out;
}

/** Merge with one group per material slot. Attributes are reduced to the ones every part has. */
function mergeParts(parts: T.BufferGeometry[], slots: number[]) {
  if (!parts.length) return null;
  const shared = Object.keys(parts[0].attributes).filter(name => parts.every(part => part.getAttribute(name)));
  const indexed = parts.every(part => part.index);
  const ready = parts.map(part => {
    const copy = indexed ? part : part.index ? part.toNonIndexed() : part;
    for (const name of Object.keys(copy.attributes)) if (!shared.includes(name)) copy.deleteAttribute(name);
    copy.morphAttributes = {};
    return copy;
  });
  const merged = mergeGeometries(ready, true);
  ready.forEach((copy, index) => { if (copy !== parts[index]) copy.dispose(); });
  if (!merged) return null;
  merged.groups.forEach((group, index) => { group.materialIndex = slots[index]; });
  merged.computeBoundingSphere();
  return merged;
}

/**
 * The loader proper. Resolves `undefined` when the manifest is unreadable, invalid, late, or
 * when not one asset arrived (a decoder that cannot load fails every asset). Otherwise every
 * asset that arrived before the deadline, with the rest in `missing`; anything that lands
 * after the deadline is disposed on arrival.
 */
export async function loadWorldKit(base: string, options: KitLoadOptions, io: KitIO): Promise<WorldKit | undefined> {
  const timeoutMs = options.timeoutMs ?? KIT_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">(resolve => { timer = setTimeout(() => resolve("timeout"), timeoutMs); });
  const stop = () => { if (timer !== undefined) clearTimeout(timer); };
  const json = await Promise.race([io.fetchJson(`${base}/manifest.json`).catch(() => null), deadline]);
  const manifest = json === "timeout" ? null : parseKitManifest(json);
  if (!manifest) {
    stop();
    io.dispose();
    console.warn("World kit unavailable: the manifest did not load or did not validate. The procedural world stands in.");
    return undefined;
  }
  const requested = options.ids ? new Set<string>(options.ids) : null;
  const order = kitLoadOrder(requested ? manifest.assets.filter(entry => requested.has(entry.id)) : manifest.assets);
  const unknown = requested ? [...requested].filter(id => !manifest.assets.some(entry => entry.id === id)) as KitAssetId[] : [];
  const arrived = new Map<KitAssetId, KitAsset>();
  let settled = false;
  const jobs = order.map(entry => io.loadModel(`${base}/${entry.file}`).then(
    model => {
      if (settled) { disposeObject(model.scene); return; }
      try {
        arrived.set(entry.id, prepare(entry, model));
      } catch {
        disposeObject(model.scene);
      }
    },
    () => undefined,
  ));
  await Promise.race([Promise.all(jobs), deadline]);
  settled = true;
  stop();
  const missing = [...order.filter(entry => !arrived.has(entry.id)).map(entry => entry.id), ...unknown];
  if (!arrived.size) {
    io.dispose();
    console.warn("World kit unavailable: no asset arrived. The procedural world stands in.");
    return undefined;
  }
  // Insertion order follows the load order, not arrival, so every walk over the kit is stable.
  const assets = new Map<KitAssetId, KitAsset>();
  for (const entry of order) {
    const asset = arrived.get(entry.id);
    if (asset) assets.set(entry.id, asset);
  }
  if (missing.length) console.warn(`World kit partial: ${missing.length} of ${order.length + unknown.length} assets missing (${missing.join(", ")}). Their procedural pieces stand in.`);
  return new WorldKit(manifest, assets, missing, io);
}

/** The browser IO: one shared Draco decoder served from this origin, two workers, wasm only. */
function browserKitIO(decoderPath: string): KitIO {
  const draco = new DRACOLoader();
  draco.setDecoderPath(decoderPath);
  // The JS fallback is 512 KB and slow on a TV; a TV has few cores to spare for workers.
  draco.setDecoderConfig({ type: "wasm" });
  draco.setWorkerLimit(2);
  // Fetch the decoder while the manifest loads. A decoder that cannot load fails each asset
  // through its own promise; the shared one is observed here so it never goes unhandled.
  draco.preload();
  (draco as unknown as { decoderPending?: Promise<unknown> }).decoderPending?.catch(() => undefined);
  const gltf = new GLTFLoader().setDRACOLoader(draco);
  return {
    async fetchJson(url) {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`World kit manifest ${response.status}`);
      return response.json();
    },
    async loadModel(url) {
      const model = await gltf.loadAsync(url);
      return { scene: model.scene, animations: model.animations };
    },
    dispose() {
      draco.dispose();
    },
  };
}

/**
 * The kit for the design world, or `undefined` whenever it should not or could not load:
 * outside the fictional study, under `?kit=off`, after the timeout, or on any manifest or
 * decoder failure. Never throws.
 */
export async function loadStudyKit(options?: KitLoadOptions): Promise<WorldKit | undefined> {
  if (!isWorldDesignStudy() || !studyKit()) return undefined;
  try {
    return await WorldKit.load(KIT_BASE, options);
  } catch (error) {
    console.warn("World kit unavailable", error);
    return undefined;
  }
}
