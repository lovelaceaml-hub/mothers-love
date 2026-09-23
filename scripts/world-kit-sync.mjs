#!/usr/bin/env node
// Copies the 3D Studio kit into this repository as `public/world-kit/v1/**`, with the Draco
// decoder from the installed three in `public/world-kit/draco/`, and writes one merged
// manifest (WORLD-INTEGRATION 2.1 and 2.3).
//
//   node scripts/world-kit-sync.mjs [--studio <3d-studio checkout>] [--out <dir>]
//   node scripts/world-kit-sync.mjs --check [--out <dir>]
//
// Sync reads the kit exactly as the studio's HEAD commit has it. Every file's working copy
// must hash to that commit's blob, so the commit recorded in the manifest is the truth about
// every byte; a modified, uncommitted or unlisted file stops the run. Every copy is re-read
// and its SHA-256 compared. Budgets and the schema come from the same `kit-manifest.ts` the
// world validates with at load. Re-runnable: groups that land later (world/arrival,
// world/nature, world/neighbors) are picked up the moment their manifest.json is committed,
// and files that left the kit are removed from the copy.
//
// --check touches nothing: it re-hashes the copied files and the decoder against the written
// manifest and the installed three, and fails on any mismatch or stray file.
//
// Copies, never symlinks. No network. Exits non zero on any problem.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The schema and budgets are the world's own `kit-manifest.ts`, loaded through Node's type
// stripping. The repository has no package `type`, so Node would print a one line notice that
// it re-read the file as a module; that notice, and only that one, is kept off the console.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) => {
  const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
  if (code === "MODULE_TYPELESS_PACKAGE_JSON") return;
  return emitWarning.call(process, warning, ...rest);
};
const {
  KIT_BUDGETS, KIT_DECODER_FILES, KIT_DECODER_RELATIVE, KIT_FEATURE_PRIORITY, KIT_VERSION, KIT_ZONE_IDS,
  budgetProblem, parseKitManifest,
} = await import("../src/components/display/world/kit/kit-manifest.ts");
process.emitWarning = emitWarning;

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const checkOnly = args.includes("--check");
const studio = path.resolve(option("--studio", process.env.WORLD_KIT_STUDIO || "/Users/anthony/Projects/3d-studio"));
const out = path.resolve(option("--out", path.join(repo, "public", "world-kit")));
const threeDir = path.resolve(option("--three", path.join(repo, "node_modules", "three")));
const versionDir = path.join(out, KIT_VERSION);
const decoderDir = path.join(out, "draco");

class SyncError extends Error {}
const fail = message => { throw new SyncError(message); };
const warnings = [];
const warn = message => { warnings.push(message); console.warn(`world-kit-sync: warning: ${message}`); };
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const gitBlob = bytes => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const git = (...command) => execFileSync("git", ["-C", studio, ...command], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

// Plan 01 groups carry no manifest; Plan 03 groups under kit/world each carry one.
const PLAN01_GROUPS = [
  { dir: "kit/core", group: "core", feature: "core", budget: "ordinary" },
  { dir: "kit/expressions", group: "expressions", feature: "expression", budget: "ordinary" },
  { dir: "kit/people", group: "people", feature: "people", budget: "character" },
];
const WORLD_FEATURES = { recognition: "recognition", arrival: "arrival", nature: "nature", landmarks: "landmark", neighbors: "neighbor" };
// Clips that play once. Everything else defaults to a loop; a lane that means otherwise
// writes the clip as an object with its own `loop`.
const ONE_SHOT_CLIPS = new Set(["bloom", "open", "close", "give_heart", "receive_heart", "wave", "bow", "comfort", "after_you", "offer_hand", "cheer", "encourage", "sit_down", "stand_up"]);
// GLTFLoader handles these without any decoder but the Draco one this script ships.
const SUPPORTED_REQUIRED = new Set([
  "KHR_draco_mesh_compression", "KHR_mesh_quantization", "KHR_texture_transform", "KHR_materials_unlit",
  "KHR_materials_clearcoat", "KHR_materials_emissive_strength", "KHR_materials_ior", "KHR_materials_sheen",
  "KHR_materials_specular", "KHR_materials_transmission", "KHR_materials_volume", "KHR_materials_iridescence",
  "KHR_materials_anisotropy", "KHR_materials_dispersion", "EXT_materials_bump",
]);
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/* ---------- glTF binary facts, read without three ---------- */

function readGlb(bytes, label) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) fail(`${label}: not a binary glTF file`);
  if (bytes.readUInt32LE(4) !== 2) fail(`${label}: glTF version ${bytes.readUInt32LE(4)}, expected 2`);
  if (bytes.readUInt32LE(8) !== bytes.length) fail(`${label}: header length ${bytes.readUInt32LE(8)} does not match ${bytes.length} bytes`);
  const length = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) fail(`${label}: first chunk is not JSON`);
  try {
    return JSON.parse(bytes.subarray(20, 20 + length).toString("utf8"));
  } catch {
    return fail(`${label}: unreadable JSON chunk`);
  }
}

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const m = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++)
    for (let k = 0; k < 4; k++) m[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return m;
}
function compose(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.slice();
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * sx, 2 * (xy + wz) * sx, 2 * (xz - wy) * sx, 0,
    2 * (xy - wz) * sy, (1 - 2 * (xx + zz)) * sy, 2 * (yz + wx) * sy, 0,
    2 * (xz + wy) * sz, 2 * (yz - wx) * sz, (1 - 2 * (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const transform = (m, [x, y, z]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

/** Vertex, triangle, material, clip, skin and bounds facts from one file's JSON chunk. */
function glbFacts(json, label) {
  const required = json.extensionsRequired ?? [];
  const unsupported = required.filter(name => !SUPPORTED_REQUIRED.has(name));
  if (unsupported.length) fail(`${label}: requires ${unsupported.join(", ")}, which the world cannot decode`);
  // Kit assets never carry text, so they carry no pictures at all.
  if ((json.images ?? []).length || (json.textures ?? []).length) fail(`${label}: carries ${(json.images ?? []).length} images and ${(json.textures ?? []).length} textures; the kit must be untextured`);
  const accessors = json.accessors ?? [];
  const meshes = json.meshes ?? [];
  const nodes = json.nodes ?? [];
  const positions = new Set();
  let tris = 0;
  for (const mesh of meshes) for (const primitive of mesh.primitives ?? []) {
    const position = primitive.attributes?.POSITION;
    if (position === undefined || !accessors[position]) fail(`${label}: a primitive has no POSITION accessor`);
    positions.add(position);
    const mode = primitive.mode ?? 4;
    if (mode !== 4) continue;
    const count = primitive.indices !== undefined ? accessors[primitive.indices]?.count : accessors[position].count;
    tris += Math.floor((count ?? 0) / 3);
  }
  const verts = [...positions].reduce((sum, index) => sum + accessors[index].count, 0);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const visit = (index, parent, depth) => {
    if (depth > 64 || !nodes[index]) return;
    const node = nodes[index], world = multiply(parent, compose(node));
    if (node.mesh !== undefined) for (const primitive of meshes[node.mesh]?.primitives ?? []) {
      const accessor = accessors[primitive.attributes.POSITION];
      if (!Array.isArray(accessor?.min) || !Array.isArray(accessor?.max)) fail(`${label}: a POSITION accessor has no bounds`);
      for (let corner = 0; corner < 8; corner++) {
        const point = transform(world, [0, 1, 2].map(axis => (corner >> axis) & 1 ? accessor.max[axis] : accessor.min[axis]));
        point.forEach((value, axis) => { min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); });
      }
    }
    for (const child of node.children ?? []) visit(child, world, depth + 1);
  };
  const scene = (json.scenes ?? [])[json.scene ?? 0];
  for (const root of scene?.nodes ?? []) visit(root, identity(), 0);
  if (!Number.isFinite(min[0])) fail(`${label}: no mesh in its default scene`);
  const clips = (json.animations ?? []).map((animation, index) => {
    const seconds = Math.max(0, ...(animation.channels ?? []).map(channel => {
      const input = accessors[animation.samplers?.[channel.sampler]?.input];
      return Array.isArray(input?.max) ? input.max[0] : 0;
    }));
    return { name: animation.name || `clip-${index}`, seconds: Math.round(seconds * 1000) / 1000 };
  });
  const skins = json.skins ?? [];
  return {
    verts, tris, clips,
    materials: (json.materials ?? []).map((material, index) => material.name || `material-${index}`),
    skinned: skins.length > 0,
    bones: skins.length ? Math.max(...skins.map(skin => (skin.joints ?? []).length)) : 0,
    min, max,
  };
}

/* ---------- one kit entry ---------- */

const round = value => Math.round(value * 1000) / 1000;
function clipList(facts, declared, label) {
  const byName = new Map();
  for (const clip of declared ?? []) {
    const described = typeof clip === "string" ? { name: clip } : clip;
    if (!described || typeof described.name !== "string") fail(`${label}: a clip in its manifest has no name`);
    byName.set(described.name, described);
  }
  for (const name of byName.keys()) if (!facts.clips.some(clip => clip.name === name)) fail(`${label}: manifest lists clip "${name}", which the file does not contain`);
  return facts.clips.map(({ name, seconds }) => {
    const described = byName.get(name);
    if (declared && !described) warn(`${label}: clip "${name}" is in the file but not in its manifest`);
    const clip = { name, seconds, loop: typeof described?.loop === "boolean" ? described.loop : !ONE_SHOT_CLIPS.has(name) };
    if (described?.stride !== undefined) clip.stride = described.stride;
    if (described?.handoffAt !== undefined) clip.handoffAt = described.handoffAt;
    return clip;
  });
}

function budgetFor(piece, groupManifest, fallback) {
  if (typeof piece?.budget === "string") return piece.budget;
  const limits = groupManifest?.budget;
  if (limits && typeof limits === "object") {
    const verts = limits.vertices ?? limits.verts, bytes = limits.bytes ?? (limits.kb ? limits.kb * 1000 : undefined);
    const match = Object.entries(KIT_BUDGETS).find(([, budget]) => budget.verts === verts && budget.bytes === bytes);
    if (match) return match[0];
    fail(`${groupManifest.group ?? "a group"}: its budget ${JSON.stringify(limits)} matches no Plan 03 budget`);
  }
  return fallback;
}

function entryFor({ file, bytes, group, feature, budget, piece, groupManifest }) {
  const label = `${group}/${file}`;
  const basename = file.replace(/\.glb$/, "");
  if (!SLUG.test(basename)) fail(`${label}: the file name must be lower case letters, digits and hyphens`);
  const json = readGlb(bytes, label);
  const facts = glbFacts(json, label);
  const height = facts.max[1] - facts.min[1];
  const size = round(Math.max(...facts.max.map((value, axis) => value - facts.min[axis])));
  const pivot = Math.abs(facts.min[1]) <= Math.max(1e-3, height * .01) ? "base" : "center";
  if (piece?.grounded === true && pivot !== "base") warn(`${label}: manifest says grounded but its lowest point is y ${round(facts.min[1])}`);
  const zones = piece?.zones ?? piece?.locations ?? [];
  const unknownZones = zones.filter(zone => !KIT_ZONE_IDS.includes(zone));
  if (unknownZones.length) fail(`${label}: unknown zones ${unknownZones.join(", ")}`);
  const declaredVerts = piece?.gltf_vertices ?? piece?.vertices;
  if (typeof declaredVerts === "number" && declaredVerts !== facts.verts) warn(`${label}: manifest says ${declaredVerts} vertices, the file has ${facts.verts}; the file's count is used`);
  if (typeof piece?.bytes === "number" && piece.bytes !== bytes.length) warn(`${label}: manifest says ${piece.bytes} bytes, the file has ${bytes.length}`);
  const hash = sha256(bytes);
  if (typeof piece?.sha256 === "string" && piece.sha256 !== hash) fail(`hash mismatch: ${label} hashes to ${hash}, its manifest says ${piece.sha256}`);
  const entry = {
    id: `${feature}.${basename}`,
    file: `${group}/${file}`,
    sha256: hash,
    group,
    feature,
    zones: [...zones],
    size,
    pivot,
    verts: facts.verts,
    tris: facts.tris,
    bytes: bytes.length,
    materials: facts.materials,
    clips: clipList(facts, groupManifest ? piece?.clips ?? [] : undefined, label),
    lod: null,
    budget: budgetFor(piece, groupManifest, budget),
  };
  if (!Object.hasOwn(KIT_BUDGETS, entry.budget)) fail(`${label}: unknown budget "${entry.budget}"`);
  if (facts.skinned) { entry.skinned = true; entry.bones = facts.bones; }
  if (piece?.lod) {
    const far = String(piece.lod.far ?? "").replace(/\.glb$/, "");
    entry.lod = { far: far.includes(".") ? far : `${feature}.${far}`, cullDistance: piece.lod.cullDistance ?? piece.lod.cull_distance };
  }
  if (Array.isArray(piece?.hands)) entry.hands = [...piece.hands];
  if (piece?.uv !== undefined) entry.uv = piece.uv;
  const face = piece?.textFace ?? piece?.text_face;
  if (face) entry.textFace = { normal: face.normal, centre: face.centre ?? face.center, width: face.width, height: face.height };
  const problem = budgetProblem(entry);
  if (problem) fail(`over budget: ${problem}`);
  return entry;
}

/* ---------- the studio at HEAD ---------- */

function studioTree() {
  if (!existsSync(studio)) fail(`studio checkout not found: ${studio}`);
  const commit = git("rev-parse", "HEAD");
  const generatedAt = git("log", "-1", "--format=%cI", "HEAD");
  const tree = new Map();
  for (const line of git("ls-tree", "-r", "--full-tree", "HEAD", "--", "kit").split("\n").filter(Boolean)) {
    const [meta, file] = line.split("\t");
    const [, type, blob] = meta.split(" ");
    if (type === "blob") tree.set(file, blob);
  }
  return { commit, generatedAt, tree };
}

/** The working copy of a file the commit tracks, refused unless it is byte for byte that blob. */
function committedBytes(tree, file) {
  const blob = tree.get(file);
  if (!blob) fail(`${file} is not in the studio commit`);
  const absolute = path.join(studio, file);
  if (!existsSync(absolute)) fail(`${file} is in the studio commit but missing from its working tree`);
  const bytes = readFileSync(absolute);
  if (gitBlob(bytes) !== blob) fail(`hash mismatch: ${file} in the studio working tree differs from commit ${git("rev-parse", "--short", "HEAD")}; commit or restore it first`);
  return bytes;
}

const childrenOf = (tree, dir, suffix) => [...tree.keys()]
  .filter(file => path.posix.dirname(file) === dir && file.endsWith(suffix))
  .map(file => path.posix.basename(file))
  .sort();

function collect() {
  const { commit, generatedAt, tree } = studioTree();
  const entries = [];
  const add = entry => entries.push(entry);
  for (const spec of PLAN01_GROUPS) {
    const files = childrenOf(tree, spec.dir, ".glb");
    if (!files.length) warn(`${spec.dir} has no .glb files at HEAD`);
    for (const file of files) add(entryFor({ file, bytes: committedBytes(tree, `${spec.dir}/${file}`), group: spec.group, feature: spec.feature, budget: spec.budget }));
  }
  const worldGroups = [...new Set([...tree.keys()].filter(file => file.startsWith("kit/world/")).map(file => file.split("/")[2]))].sort();
  for (const group of worldGroups) {
    const dir = `kit/world/${group}`;
    const glbs = childrenOf(tree, dir, ".glb");
    if (!tree.has(`${dir}/manifest.json`)) {
      if (glbs.length) warn(`${dir} has ${glbs.length} files but no manifest.json at HEAD; skipped until its lane commits one`);
      continue;
    }
    const feature = WORLD_FEATURES[group];
    if (!feature) fail(`${dir}: no world feature is known for group "${group}"`);
    let groupManifest;
    try {
      groupManifest = JSON.parse(committedBytes(tree, `${dir}/manifest.json`).toString("utf8"));
    } catch (error) {
      if (error instanceof SyncError) throw error;
      fail(`${dir}/manifest.json is not valid JSON`);
    }
    const pieces = groupManifest.pieces ?? groupManifest.assets ?? groupManifest.files;
    if (!Array.isArray(pieces)) fail(`${dir}/manifest.json lists no pieces`);
    const listed = new Set();
    for (const piece of pieces) {
      const file = typeof piece?.file === "string" ? path.posix.basename(piece.file) : "";
      if (!file.endsWith(".glb")) fail(`${dir}/manifest.json has a piece without a .glb file`);
      if (listed.has(file)) fail(`${dir}/manifest.json lists ${file} twice`);
      listed.add(file);
      add(entryFor({ file, bytes: committedBytes(tree, `${dir}/${file}`), group, feature, budget: feature === "neighbor" ? "character" : "ordinary", piece, groupManifest }));
    }
    const unlisted = glbs.filter(file => !listed.has(file));
    if (unlisted.length) fail(`${dir} has files its manifest.json does not list: ${unlisted.join(", ")}`);
  }
  const ids = new Map();
  for (const entry of entries) {
    if (ids.has(entry.id)) fail(`two files claim the id ${entry.id}: ${ids.get(entry.id)} and ${entry.file}`);
    ids.set(entry.id, entry.file);
  }
  const rank = entry => KIT_FEATURE_PRIORITY.indexOf(entry.feature);
  entries.sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1));
  return { commit, generatedAt, entries, tree };
}

/* ---------- the decoder from the installed three ---------- */

function decoderFiles() {
  const installed = JSON.parse(readFileSync(path.join(threeDir, "package.json"), "utf8")).version;
  const pinned = JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")).dependencies?.three;
  if (pinned && pinned !== installed) fail(`three ${installed} is installed but package.json pins ${pinned}; run npm ci first`);
  const source = path.join(threeDir, "examples", "jsm", "libs", "draco", "gltf");
  const files = KIT_DECODER_FILES.map(name => {
    const file = path.join(source, name);
    if (!existsSync(file)) fail(`the installed three has no ${name} at ${source}`);
    const bytes = readFileSync(file);
    return { name, file, bytes, sha256: sha256(bytes) };
  });
  return { three: installed, files };
}

/* ---------- write, verify, check ---------- */

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map(name => String(name))
    .filter(name => statSync(path.join(dir, name)).isFile())
    .map(name => name.split(path.sep).join("/"))
    .sort();
}

function copyVerified(bytes, hash, destination, label) {
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  const copied = sha256(readFileSync(destination));
  if (copied !== hash) fail(`hash mismatch: the copy of ${label} hashes to ${copied}, expected ${hash}`);
}

function sync() {
  const { commit, generatedAt, entries, tree } = collect();
  const decoder = decoderFiles();
  const manifest = {
    version: KIT_VERSION,
    generatedAt,
    source: { repo: "3d-studio", commit, plan: "docs/PLAN-03-world-kit.md" },
    decoder: {
      path: KIT_DECODER_RELATIVE,
      files: [...KIT_DECODER_FILES],
      three: decoder.three,
      sha256: Object.fromEntries(decoder.files.map(file => [file.name, file.sha256])),
    },
    assets: entries,
  };
  // The exact validator the world runs at load. A manifest it would reject is never written.
  if (!parseKitManifest(JSON.parse(JSON.stringify(manifest)))) fail("the merged manifest does not pass parseKitManifest");
  const studioPath = entry => {
    const plan01 = PLAN01_GROUPS.find(spec => spec.group === entry.group);
    return `${plan01 ? plan01.dir : `kit/world/${entry.group}`}/${path.posix.basename(entry.file)}`;
  };
  for (const entry of entries) copyVerified(committedBytes(tree, studioPath(entry)), entry.sha256, path.join(versionDir, entry.file), entry.file);
  for (const file of decoder.files) copyVerified(file.bytes, file.sha256, path.join(decoderDir, file.name), `draco/${file.name}`);
  writeFileSync(path.join(versionDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  // Files that left the kit leave the copy too; nothing else is ever deleted.
  const keep = new Set([...entries.map(entry => entry.file), "manifest.json"]);
  const removed = [];
  for (const file of listFiles(versionDir)) if (!keep.has(file)) { rmSync(path.join(versionDir, file)); removed.push(file); }
  for (const file of listFiles(decoderDir)) if (!KIT_DECODER_FILES.includes(file)) { rmSync(path.join(decoderDir, file)); removed.push(`draco/${file}`); }
  for (const dir of readdirSync(versionDir)) {
    const full = path.join(versionDir, dir);
    if (statSync(full).isDirectory() && !readdirSync(full).length) rmSync(full, { recursive: true });
  }
  const groups = {};
  for (const entry of entries) groups[entry.group] = (groups[entry.group] ?? 0) + 1;
  console.log(JSON.stringify({
    synced: entries.length, groups, studio, commit, generatedAt,
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), decoder: { three: decoder.three },
    removed, warnings, out: path.relative(repo, out) || out,
  }, null, 2));
}

function check() {
  const problems = [];
  const manifestFile = path.join(versionDir, "manifest.json");
  if (!existsSync(manifestFile)) fail(`no manifest at ${manifestFile}`);
  const manifest = parseKitManifest(JSON.parse(readFileSync(manifestFile, "utf8")));
  if (!manifest) fail(`${manifestFile} does not pass parseKitManifest`);
  for (const entry of manifest.assets) {
    const file = path.join(versionDir, entry.file);
    if (!existsSync(file)) { problems.push(`missing: ${entry.file}`); continue; }
    const bytes = readFileSync(file);
    const hash = sha256(bytes);
    if (hash !== entry.sha256) problems.push(`hash mismatch: ${entry.file} hashes to ${hash}, the manifest says ${entry.sha256}`);
    if (bytes.length !== entry.bytes) problems.push(`size mismatch: ${entry.file} is ${bytes.length} bytes, the manifest says ${entry.bytes}`);
  }
  const decoder = decoderFiles();
  if (decoder.three !== manifest.decoder.three) problems.push(`decoder copied from three ${manifest.decoder.three}, three ${decoder.three} is installed`);
  for (const file of decoder.files) {
    const copy = path.join(decoderDir, file.name);
    const hash = existsSync(copy) ? sha256(readFileSync(copy)) : "missing";
    if (hash !== manifest.decoder.sha256[file.name]) problems.push(`hash mismatch: draco/${file.name} is ${hash}, the manifest says ${manifest.decoder.sha256[file.name]}`);
    if (file.sha256 !== manifest.decoder.sha256[file.name]) problems.push(`hash mismatch: draco/${file.name} in the installed three is ${file.sha256}, the manifest says ${manifest.decoder.sha256[file.name]}`);
  }
  const listed = new Set([...manifest.assets.map(entry => entry.file), "manifest.json"]);
  for (const file of listFiles(versionDir)) if (!listed.has(file)) problems.push(`not in the manifest: ${KIT_VERSION}/${file}`);
  for (const file of listFiles(decoderDir)) if (!KIT_DECODER_FILES.includes(file)) problems.push(`not a decoder file: draco/${file}`);
  if (problems.length) fail(problems.join("\n"));
  console.log(JSON.stringify({ checked: manifest.assets.length, commit: manifest.source.commit, three: manifest.decoder.three, ok: true }));
}

try {
  if (checkOnly) check(); else sync();
} catch (error) {
  console.error(`world-kit-sync: ${error instanceof SyncError ? error.message : error?.stack ?? error}`);
  process.exitCode = 1;
}
