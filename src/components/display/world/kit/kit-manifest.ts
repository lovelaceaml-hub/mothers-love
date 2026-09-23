import type { ZoneId } from "../world-data";

/**
 * The 3D Studio kit manifest: what `scripts/world-kit-sync.mjs` writes to
 * `public/world-kit/v1/manifest.json` and what the world validates before it loads a byte.
 *
 * Pure on purpose. The sync script imports this very file (Node strips the types), so the
 * schema and the Plan 03 budgets are written once and enforced at both ends: a manifest
 * that fails here is never written, and one that fails at load is never used.
 *
 * Nothing in the kit may carry a name, a message or a text texture. The manifest itself
 * holds only geometry facts, hashes and the studio commit it came from.
 */

export const KIT_VERSION = "v1";
/** Everything the kit fetches lives under this same origin path, never a CDN. */
export const KIT_ROOT = "/world-kit";
export const KIT_BASE = `${KIT_ROOT}/${KIT_VERSION}`;
/** The manifest records the decoder relative to its own folder: `/world-kit/v1/../draco/`. */
export const KIT_DECODER_RELATIVE = "../draco/";
export const KIT_DECODER_FILES = ["draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js"] as const;

/**
 * What an asset is for. The first seven are the design's list (WORLD-INTEGRATION 2.3);
 * `people` is the unrigged Plan 01 cast the design places in crowds (6.9, 6.10) as
 * `people.<name>`, kept apart from the rigged `neighbor.<name>` files so the two never collide.
 */
export const KIT_FEATURES = ["recognition", "arrival", "nature", "landmark", "neighbor", "expression", "core", "people"] as const;
export type KitFeature = (typeof KIT_FEATURES)[number];
/** Code binds to ids, never to file names: `<feature>.<name>`, for example `recognition.orbit-ring`. */
export type KitAssetId = `${KitFeature}.${string}`;

/** Loader order: the parts a partial load must keep first (design 10.1, risk 2). */
export const KIT_FEATURE_PRIORITY: readonly KitFeature[] = [
  "recognition", "arrival", "landmark", "nature", "neighbor", "expression", "core", "people",
];

export type KitBudgetName = "ordinary" | "landmark" | "character";
export type KitBudget = { verts: number; bytes: number };
/** Plan 03, for a TV browser. A kilobyte is 1,000 bytes, as the W1 manifest spells out (150,000). */
export const KIT_BUDGETS: Readonly<Record<KitBudgetName, KitBudget>> = {
  ordinary: { verts: 10_000, bytes: 150_000 },
  landmark: { verts: 25_000, bytes: 300_000 },
  character: { verts: 12_000, bytes: 250_000 },
};

/** The thirteen `ZoneId`s, spelled out so this file stays free of runtime imports. A test pins it to `ZONES`. */
export const KIT_ZONE_IDS: readonly ZoneId[] = [
  "garden", "heart", "expressions", "welcome", "featured", "calendar", "peacemakers",
  "status", "orbit", "milestone", "live-feed", "practice", "promise",
];

export type KitClip = {
  name: string;
  seconds: number;
  loop: boolean;
  /** Walk clips: world units covered by one cycle. */
  stride?: number;
  /** The heart hand off: seconds into `give_heart` when the prop changes hands. */
  handoffAt?: number;
};
export type KitPivot = "base" | "center";
export type KitLod = { far: KitAssetId; cullDistance: number };
export type KitVector3 = [number, number, number];
/** A blank face a builder may put the app's own canonical artwork on (the stone tablet). */
export type KitTextFace = { normal: KitVector3; centre: KitVector3; width: number; height: number };

export type KitManifestEntry = {
  id: KitAssetId;
  /** `<group>/<basename>.glb`, relative to the manifest's folder. */
  file: string;
  sha256: string;
  group: string;
  feature: KitFeature;
  /** Zones the asset was authored for. Informational: the layout test checks placements against it. */
  zones: ZoneId[];
  /** Largest side of the authored bounds, world units. */
  size: number;
  pivot: KitPivot;
  verts: number;
  tris: number;
  bytes: number;
  materials: string[];
  clips: KitClip[];
  lod: KitLod | null;
  budget: KitBudgetName;
  skinned?: boolean;
  bones?: number;
  hands?: string[];
  /** Petal uv orientation for the lotus glow patch (design 4.2). */
  uv?: "base-to-tip";
  textFace?: KitTextFace;
};

export type KitDecoder = {
  path: string;
  files: string[];
  /** The three release the decoder was copied from; it must match the runtime's own. */
  three: string;
  sha256: Record<string, string>;
};
export type KitManifest = {
  version: string;
  generatedAt: string;
  source: { repo: string; commit: string; plan: string };
  decoder: KitDecoder;
  assets: KitManifestEntry[];
};

/** What the host publishes as `data-kit`. */
export type KitState = "ready" | "partial" | "off" | "failed";

export function assetBudget(entry: Pick<KitManifestEntry, "budget">): KitBudget {
  return KIT_BUDGETS[entry.budget];
}

/** Why an entry breaks its budget, or null when it fits. */
export function budgetProblem(entry: Pick<KitManifestEntry, "id" | "budget" | "verts" | "bytes">): string | null {
  const budget = KIT_BUDGETS[entry.budget];
  if (!budget) return `${entry.id}: unknown budget`;
  if (entry.verts > budget.verts) return `${entry.id}: ${entry.verts} vertices over the ${entry.budget} budget of ${budget.verts}`;
  if (entry.bytes > budget.bytes) return `${entry.id}: ${entry.bytes} bytes over the ${entry.budget} budget of ${budget.bytes}`;
  return null;
}

/**
 * `data-kit` from what was asked for and what arrived: off when the gate is off, failed when
 * it was asked for and nothing usable came back, partial when some ids are missing.
 */
export function kitState(requested: boolean, kit: { readonly loaded: number; readonly missing: readonly string[] } | undefined): KitState {
  if (!requested) return "off";
  if (!kit || kit.loaded === 0) return "failed";
  return kit.missing.length ? "partial" : "ready";
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0);
const isVector3 = (value: unknown): value is KitVector3 =>
  Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);

/** A feature and slug pair, `recognition.orbit-ring`. */
export function isKitAssetId(value: unknown): value is KitAssetId {
  if (typeof value !== "string") return false;
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  return (KIT_FEATURES as readonly string[]).includes(value.slice(0, dot)) && SLUG.test(value.slice(dot + 1));
}

function parseClip(value: unknown): KitClip | null {
  if (!isObject(value)) return null;
  const { name, seconds, loop, stride, handoffAt } = value;
  if (typeof name !== "string" || !name || !isFiniteNumber(seconds) || seconds < 0 || typeof loop !== "boolean") return null;
  const clip: KitClip = { name, seconds, loop };
  if (stride !== undefined) {
    if (!isFiniteNumber(stride) || stride <= 0) return null;
    clip.stride = stride;
  }
  if (handoffAt !== undefined) {
    if (!isFiniteNumber(handoffAt) || handoffAt < 0 || handoffAt > seconds) return null;
    clip.handoffAt = handoffAt;
  }
  return clip;
}

function parseEntry(value: unknown): KitManifestEntry | null {
  if (!isObject(value)) return null;
  const { id, file, sha256, group, feature, zones, size, pivot, verts, tris, bytes, materials, clips, lod, budget } = value;
  if (!isKitAssetId(id)) return null;
  if (typeof feature !== "string" || !(KIT_FEATURES as readonly string[]).includes(feature)) return null;
  if (!id.startsWith(`${feature}.`)) return null;
  if (typeof group !== "string" || !SLUG.test(group)) return null;
  // Same origin, one folder deep, a .glb and nothing else: no scheme, no parent step, no query.
  if (typeof file !== "string" || !new RegExp(`^${group}/[a-z0-9][a-z0-9-]*\\.glb$`).test(file)) return null;
  if (typeof sha256 !== "string" || !SHA256.test(sha256)) return null;
  if (!Array.isArray(zones) || !zones.every(zone => (KIT_ZONE_IDS as readonly unknown[]).includes(zone))) return null;
  if (!isFiniteNumber(size) || size <= 0) return null;
  if (pivot !== "base" && pivot !== "center") return null;
  if (!isCount(verts) || !isCount(tris) || !isCount(bytes) || verts === 0 || bytes === 0) return null;
  if (!isStringArray(materials)) return null;
  if (!Array.isArray(clips)) return null;
  const parsedClips = clips.map(parseClip);
  if (parsedClips.some(clip => clip === null)) return null;
  if (new Set(parsedClips.map(clip => clip!.name)).size !== parsedClips.length) return null;
  // A missing or unknown budget is a rejection, never a default.
  if (typeof budget !== "string" || !Object.hasOwn(KIT_BUDGETS, budget)) return null;
  let parsedLod: KitLod | null = null;
  if (lod !== null) {
    if (!isObject(lod) || !isKitAssetId(lod.far) || !isFiniteNumber(lod.cullDistance) || lod.cullDistance <= 0) return null;
    parsedLod = { far: lod.far, cullDistance: lod.cullDistance };
  }
  const entry: KitManifestEntry = {
    id, file, sha256, group, feature: feature as KitFeature, zones: [...zones] as ZoneId[], size, pivot,
    verts, tris, bytes, materials: [...materials], clips: parsedClips as KitClip[], lod: parsedLod,
    budget: budget as KitBudgetName,
  };
  if (value.skinned !== undefined) {
    if (typeof value.skinned !== "boolean") return null;
    entry.skinned = value.skinned;
  }
  if (value.bones !== undefined) {
    if (!isCount(value.bones)) return null;
    entry.bones = value.bones;
  }
  if (value.hands !== undefined) {
    if (!isStringArray(value.hands)) return null;
    entry.hands = [...value.hands];
  }
  if (value.uv !== undefined) {
    if (value.uv !== "base-to-tip") return null;
    entry.uv = value.uv;
  }
  if (value.textFace !== undefined) {
    const face = value.textFace;
    if (!isObject(face) || !isVector3(face.normal) || !isVector3(face.centre) || !isFiniteNumber(face.width) || !isFiniteNumber(face.height) || face.width <= 0 || face.height <= 0) return null;
    entry.textFace = { normal: [...face.normal], centre: [...face.centre], width: face.width, height: face.height };
  }
  return entry;
}

/**
 * Strict: any malformed field, unknown feature, missing or exceeded budget, duplicate id or
 * file, dangling lod reference or foreign decoder path rejects the whole manifest. The result
 * is rebuilt from known fields only, so nothing unexpected rides through to the loader.
 */
export function parseKitManifest(json: unknown): KitManifest | null {
  if (!isObject(json)) return null;
  const { version, generatedAt, source, decoder, assets } = json;
  if (typeof version !== "string" || !/^v\d+$/.test(version)) return null;
  if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) return null;
  if (!isObject(source) || typeof source.repo !== "string" || !source.repo || typeof source.commit !== "string" || !COMMIT.test(source.commit) || typeof source.plan !== "string") return null;
  if (!isObject(decoder) || decoder.path !== KIT_DECODER_RELATIVE || typeof decoder.three !== "string" || !decoder.three) return null;
  if (!isStringArray(decoder.files) || decoder.files.length !== KIT_DECODER_FILES.length || !KIT_DECODER_FILES.every(name => (decoder.files as string[]).includes(name))) return null;
  if (!isObject(decoder.sha256)) return null;
  const decoderHashes: Record<string, string> = {};
  for (const name of KIT_DECODER_FILES) {
    const hash = decoder.sha256[name];
    if (typeof hash !== "string" || !SHA256.test(hash)) return null;
    decoderHashes[name] = hash;
  }
  if (!Array.isArray(assets)) return null;
  const entries: KitManifestEntry[] = [];
  const ids = new Set<string>(), files = new Set<string>();
  for (const item of assets) {
    const entry = parseEntry(item);
    if (!entry || ids.has(entry.id) || files.has(entry.file) || budgetProblem(entry)) return null;
    ids.add(entry.id); files.add(entry.file); entries.push(entry);
  }
  if (entries.some(entry => entry.lod && (!ids.has(entry.lod.far) || entry.lod.far === entry.id))) return null;
  return {
    version,
    generatedAt,
    source: { repo: source.repo, commit: source.commit, plan: source.plan },
    decoder: { path: KIT_DECODER_RELATIVE, files: [...KIT_DECODER_FILES], three: decoder.three, sha256: decoderHashes },
    assets: entries,
  };
}

/** Loader order for a set of entries: recognition and arrival first, then the rest by id. */
export function kitLoadOrder(entries: readonly KitManifestEntry[]): KitManifestEntry[] {
  const rank = (entry: KitManifestEntry) => KIT_FEATURE_PRIORITY.indexOf(entry.feature);
  return [...entries].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The decoder folder for a kit base: `/world-kit/v1` to `/world-kit/draco/`. */
export function kitDecoderPath(base: string = KIT_BASE): string {
  const trimmed = base.replace(/\/+$/, "");
  const parent = trimmed.slice(0, trimmed.lastIndexOf("/"));
  return `${parent}/draco/`;
}

/** Only a same origin absolute path is a kit base: `/world-kit/v1`, never `//host` or `https:`. */
export function isSameOriginKitBase(base: string): boolean {
  return /^\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/.test(base);
}
