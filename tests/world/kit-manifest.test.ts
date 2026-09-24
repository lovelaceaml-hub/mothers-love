import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ZONES } from "@/components/display/world/world-data";
import {
  KIT_BASE,
  KIT_BUDGETS,
  KIT_DECODER_FILES,
  KIT_ZONE_IDS,
  assetBudget,
  budgetProblem,
  isKitAssetId,
  isSameOriginKitBase,
  kitDecoderPath,
  kitLoadOrder,
  kitState,
  parseKitManifest,
  type KitManifestEntry,
} from "@/components/display/world/kit/kit-manifest";

const repo = path.resolve(new URL("../..", import.meta.url).pathname);
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "landmark.pearl-arch", file: "landmarks/pearl-arch.glb", sha256: "a".repeat(64),
    group: "landmarks", feature: "landmark", zones: ["garden", "welcome"], size: 5.19, pivot: "base",
    verts: 9004, tris: 17528, bytes: 45616, materials: ["landmark_pearl", "landmark_gold"],
    clips: [], lod: null, budget: "ordinary",
    ...overrides,
  };
}
function manifest(assets: unknown[] = [entry()], overrides: Record<string, unknown> = {}) {
  return {
    version: "v1",
    generatedAt: "2026-09-23T00:36:16-07:00",
    source: { repo: "3d-studio", commit: "b".repeat(40), plan: "docs/PLAN-03-world-kit.md" },
    decoder: {
      path: "../draco/", files: [...KIT_DECODER_FILES], three: "0.180.0",
      sha256: Object.fromEntries(KIT_DECODER_FILES.map(name => [name, "c".repeat(64)])),
    },
    assets,
    ...overrides,
  };
}

describe("kit manifest schema", () => {
  it("accepts a well formed manifest and rebuilds it from known fields only", () => {
    const parsed = parseKitManifest(manifest([entry({ note: "ignored", textFace: { normal: [0, 0, 1], centre: [0, .82, .125], width: .96, height: 1.04 } })], { extra: true }));
    expect(parsed).not.toBeNull();
    expect(parsed!.assets[0]).not.toHaveProperty("note");
    expect(parsed).not.toHaveProperty("extra");
    expect(parsed!.assets[0].textFace?.width).toBe(.96);
    expect(parsed!.decoder.path).toBe("../draco/");
  });

  it("rejects a manifest with any asset over its Plan 03 budget", () => {
    for (const [budget, limit] of Object.entries(KIT_BUDGETS)) {
      expect(parseKitManifest(manifest([entry({ budget, verts: limit.verts, bytes: limit.bytes })]))).not.toBeNull();
      expect(parseKitManifest(manifest([entry({ budget, verts: limit.verts + 1, bytes: limit.bytes })]))).toBeNull();
      expect(parseKitManifest(manifest([entry({ budget, verts: limit.verts, bytes: limit.bytes + 1 })]))).toBeNull();
    }
    // One over budget asset among good ones still rejects the whole manifest.
    expect(parseKitManifest(manifest([entry(), entry({ id: "landmark.pearl-column", file: "landmarks/pearl-column.glb", verts: 10_001 })]))).toBeNull();
    expect(budgetProblem({ id: "core.pearl", budget: "ordinary", verts: 10_001, bytes: 1 })).toMatch(/over the ordinary budget/);
    expect(assetBudget({ budget: "landmark" })).toEqual({ verts: 25_000, bytes: 300_000 });
  });

  it("rejects a missing or unknown budget and an unknown feature", () => {
    const { budget: _budget, ...withoutBudget } = entry();
    void _budget;
    expect(parseKitManifest(manifest([withoutBudget]))).toBeNull();
    expect(parseKitManifest(manifest([entry({ budget: "huge" })]))).toBeNull();
    expect(parseKitManifest(manifest([entry({ feature: "weather", id: "weather.cloud" })]))).toBeNull();
    // The id's prefix must be the entry's own feature.
    expect(parseKitManifest(manifest([entry({ id: "nature.pearl-arch" })]))).toBeNull();
    expect(parseKitManifest(manifest([entry({ id: "people.mother", feature: "people", group: "people", file: "people/mother.glb", budget: "character", verts: 9604 })]))).not.toBeNull();
  });

  it("keeps every file same origin, one folder deep, a .glb", () => {
    for (const file of ["../landmarks/pearl-arch.glb", "https://cdn.example/pearl-arch.glb", "//cdn.example/pearl-arch.glb", "landmarks/pearl-arch.png", "nature/pearl-arch.glb", "landmarks/deep/pearl-arch.glb", "landmarks/pearl-arch.glb?x=1", "/world-kit/v1/landmarks/pearl-arch.glb"])
      expect(parseKitManifest(manifest([entry({ file })])), file).toBeNull();
  });

  it("refuses a decoder anywhere but next to the kit", () => {
    for (const decoderPath of ["https://www.gstatic.com/draco/versioned/decoders/1.5.7/", "/world-kit/draco/", "draco/", ""]) {
      const value = manifest();
      (value.decoder as { path: string }).path = decoderPath;
      expect(parseKitManifest(value), decoderPath).toBeNull();
    }
    const missingFile = manifest();
    missingFile.decoder.files = ["draco_decoder.js", "draco_wasm_wrapper.js"];
    expect(parseKitManifest(missingFile)).toBeNull();
    const badHash = manifest();
    badHash.decoder.sha256["draco_decoder.wasm"] = "nope";
    expect(parseKitManifest(badHash)).toBeNull();
  });

  it("rejects malformed hashes, zones, duplicates, lods and clips", () => {
    const rejects = [
      manifest([entry({ sha256: "A".repeat(64) })]),
      manifest([entry({ zones: ["garden", "moon"] })]),
      manifest([entry(), entry()]),
      manifest([entry(), entry({ id: "landmark.other" })]),
      manifest([entry({ lod: { far: "landmark.pearl-arch-far", cullDistance: 190 } })]),
      manifest([entry({ lod: { far: "landmark.pearl-arch", cullDistance: 190 } })]),
      manifest([entry({ clips: [{ name: "give_heart", seconds: 4, loop: false, handoffAt: 4.5 }] })]),
      manifest([entry({ clips: [{ name: "walk", seconds: 1.2, loop: true }, { name: "walk", seconds: 1, loop: true }] })]),
      manifest([entry({ clips: ["bloom"] })]),
      manifest([entry({ pivot: "top" })]),
      manifest([entry({ verts: 0 })]),
      manifest([entry()], { source: { repo: "3d-studio", commit: "short", plan: "p" } }),
      manifest([entry()], { version: "1" }),
      manifest([entry()], { generatedAt: "yesterday" }),
      null, [], "{}",
    ];
    rejects.forEach((value, index) => expect(parseKitManifest(value), `case ${index}`).toBeNull());
    const far = entry({ id: "landmark.pearl-arch-far", file: "landmarks/pearl-arch-far.glb" });
    expect(parseKitManifest(manifest([entry({ lod: { far: "landmark.pearl-arch-far", cullDistance: 190 } }), far]))).not.toBeNull();
    expect(parseKitManifest(manifest([entry({ clips: [{ name: "give_heart", seconds: 4, loop: false, handoffAt: 2.4 }], skinned: true, bones: 22, hands: ["hand.L", "hand.R"] })]))!.assets[0].clips[0].handoffAt).toBe(2.4);
  });

  it("carries authored placement facts as plain data, and nothing else", () => {
    const hero = { hero_slot: { centre: [0, 2.526, 0], free_radius: 2.086, note: "Where the hero pearl floats." }, column_angles_from_open_centre_deg: [85, 123, 161, 199, 237, 275] };
    expect(parseKitManifest(manifest([entry({ layout: hero })]))!.assets[0].layout).toEqual(hero);
    for (const layout of [
      { description: "not a placement key" },
      { hero_slot: { centre: [0, Number.NaN, 0] } },
      { hero_slot: { Centre: [0, 1, 0] } },
      { tiling: { note: "x".repeat(501) } },
      { anchors: { a: { b: { c: { d: { e: 1 } } } } } },
      { clear_opening: [3.21, null] },
      "hero",
    ]) expect(parseKitManifest(manifest([entry({ layout })])), JSON.stringify(layout).slice(0, 60)).toBeNull();
  });

  it("names the thirteen zones exactly as the world does", () => {
    expect([...KIT_ZONE_IDS].sort()).toEqual(ZONES.map(zone => zone.id).sort());
  });

  it("reports ready, partial, off and failed", () => {
    expect(kitState(false, undefined)).toBe("off");
    expect(kitState(false, { loaded: 5, missing: [] })).toBe("off");
    expect(kitState(true, undefined)).toBe("failed");
    expect(kitState(true, { loaded: 0, missing: ["core.pearl"] })).toBe("failed");
    expect(kitState(true, { loaded: 45, missing: ["core.pearl"] })).toBe("partial");
    expect(kitState(true, { loaded: 46, missing: [] })).toBe("ready");
  });

  it("serves the decoder beside the versioned kit and nowhere else", () => {
    expect(KIT_BASE).toBe("/world-kit/v1");
    expect(kitDecoderPath()).toBe("/world-kit/draco/");
    expect(kitDecoderPath("/world-kit/v2/")).toBe("/world-kit/draco/");
    for (const base of ["/world-kit/v1", "/world-kit/v1/"]) expect(isSameOriginKitBase(base), base).toBe(true);
    for (const base of ["//cdn.example/world-kit/v1", "https://cdn.example/world-kit/v1", "world-kit/v1", "/world-kit/../v1", "/world-kit/v1?x"]) expect(isSameOriginKitBase(base), base).toBe(false);
  });

  it("loads recognition and arrival first", () => {
    const order = kitLoadOrder([
      entry({ id: "core.pearl", feature: "core", group: "core", file: "core/pearl.glb" }),
      entry({ id: "arrival.lotus-bloom", feature: "arrival", group: "arrival", file: "arrival/lotus-bloom.glb" }),
      entry(),
      entry({ id: "recognition.orbit-ring", feature: "recognition", group: "recognition", file: "recognition/orbit-ring.glb" }),
    ] as KitManifestEntry[]);
    expect(order.map(item => item.id)).toEqual(["recognition.orbit-ring", "arrival.lotus-bloom", "landmark.pearl-arch", "core.pearl"]);
    expect(isKitAssetId("recognition.medallion-01")).toBe(true);
    expect(isKitAssetId("recognition.Medallion")).toBe(false);
    expect(isKitAssetId("medallion-01")).toBe(false);
  });
});

describe("the synced kit in public/world-kit", () => {
  const manifestFile = path.join(repo, "public/world-kit/v1/manifest.json");
  const parsed = parseKitManifest(JSON.parse(readFileSync(manifestFile, "utf8")));

  it("passes the loader's own validation", () => {
    expect(parsed).not.toBeNull();
    expect(parsed!.source.repo).toBe("3d-studio");
    expect(parsed!.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(parsed!.assets.length).toBeGreaterThanOrEqual(19);
  });

  it("matches every recorded SHA-256 and byte count", () => {
    for (const asset of parsed!.assets) {
      const bytes = readFileSync(path.join(repo, "public/world-kit/v1", asset.file));
      expect(sha(bytes), asset.file).toBe(asset.sha256);
      expect(bytes.length, asset.file).toBe(asset.bytes);
    }
  });

  it("ships the Draco decoder of the pinned three, byte for byte", () => {
    const pinned = JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")).dependencies.three;
    expect(parsed!.decoder.three).toBe(pinned);
    for (const name of KIT_DECODER_FILES) {
      const served = readFileSync(path.join(repo, "public/world-kit/draco", name));
      const installed = readFileSync(path.join(repo, "node_modules/three/examples/jsm/libs/draco/gltf", name));
      expect(sha(served), name).toBe(parsed!.decoder.sha256[name]);
      expect(sha(installed), name).toBe(parsed!.decoder.sha256[name]);
    }
  });

  it("carries the pieces the next lanes bind to", () => {
    const ids = new Set(parsed!.assets.map(asset => asset.id));
    for (const id of ["recognition.recognition-pearl", "recognition.orbit-ring", "recognition.medallion-01", "recognition.medallion-09", "recognition.constellation-sparkle", "landmark.pearl-arch", "core.pearl", "expression.01-hello-bubble", "people.mother"])
      expect(ids.has(id as never), id).toBe(true);
    // The horseshoe pavilion's hero slot is what the featured zone's containment rule reads (design 6.6).
    const horseshoe = parsed!.assets.find(asset => asset.id === "landmark.pearl-pavilion-horseshoe");
    if (horseshoe) expect((horseshoe.layout?.hero_slot as { centre: number[] }).centre).toHaveLength(3);
  });
});

describe("world-kit-sync", () => {
  const root = mkdtempSync(path.join(tmpdir(), "world-kit-sync-"));
  const studio = path.join(root, "studio");
  const out = path.join(root, "out");
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const gitIn = (...args: string[]) => execFileSync("git", ["-C", studio, "-c", "user.name=Kit Test", "-c", "user.email=kit-test@example.invalid", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { encoding: "utf8" });
  const run = (...args: string[]) => spawnSync(process.execPath, [path.join(repo, "scripts/world-kit-sync.mjs"), ...args], { cwd: repo, encoding: "utf8" });

  /** The smallest binary glTF the script can read: a JSON chunk with one mesh and one material. */
  function glb(count: number, material: string) {
    const json = {
      asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: "Piece" }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0, mode: 4 }] }],
      accessors: [{ componentType: 5126, count, type: "VEC3", min: [-1, 0, -1], max: [1, 2, 1] }],
      materials: [{ name: material }],
    };
    let text = JSON.stringify(json);
    while (text.length % 4) text += " ";
    const body = Buffer.from(text);
    const header = Buffer.alloc(20);
    header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + body.length, 8);
    header.writeUInt32LE(body.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
    return Buffer.concat([header, body]);
  }
  function write(file: string, bytes: Buffer | string) {
    mkdirSync(path.dirname(path.join(studio, file)), { recursive: true });
    writeFileSync(path.join(studio, file), bytes);
  }
  const landmarks = (pieces: unknown[]) => JSON.stringify({ group: "landmarks", pieces }, null, 2);

  it("copies a committed studio kit and records its commit and hashes", () => {
    mkdirSync(studio, { recursive: true });
    gitIn("init", "-q");
    write("kit/core/pearl.glb", glb(300, "PearlSkin"));
    write("kit/world/landmarks/pearl-arch.glb", glb(900, "landmark_pearl"));
    write("kit/world/landmarks/manifest.json", landmarks([{ file: "pearl-arch.glb", zones: ["garden"], budget: "ordinary", grounded: true }]));
    // A lane still at work: files but no manifest yet. It is skipped, not half copied.
    write("kit/world/nature/rose-bush.glb", glb(100, "leaf"));
    gitIn("add", "-A");
    gitIn("commit", "-qm", "kit");
    const result = run("--studio", studio, "--out", out);
    expect(result.status, result.stderr).toBe(0);
    const written = parseKitManifest(JSON.parse(readFileSync(path.join(out, "v1/manifest.json"), "utf8")));
    expect(written!.source.commit).toBe(gitIn("rev-parse", "HEAD").trim());
    expect(written!.assets.map(asset => asset.id)).toEqual(["landmark.pearl-arch", "core.pearl"]);
    expect(written!.assets[0]).toMatchObject({ pivot: "base", size: 2, verts: 900, tris: 300, zones: ["garden"] });
    expect(result.stderr).toMatch(/kit\/world\/nature has 1 files but no manifest\.json/);
    expect(existsSync(path.join(out, "v1/nature"))).toBe(false);
    for (const name of KIT_DECODER_FILES) expect(existsSync(path.join(out, "draco", name))).toBe(true);
    expect(run("--check", "--out", out).status).toBe(0);
  });

  it("fails --check on a copied file whose hash no longer matches", () => {
    const copy = path.join(out, "v1/core/pearl.glb");
    const original = readFileSync(copy);
    appendFileSync(copy, Buffer.from([0]));
    const result = run("--check", "--out", out);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/hash mismatch: core\/pearl\.glb/);
    writeFileSync(copy, original);
    expect(run("--check", "--out", out).status).toBe(0);
  });

  it("fails when a studio file differs from the commit it would record", () => {
    const file = path.join(studio, "kit/core/pearl.glb");
    const original = readFileSync(file);
    writeFileSync(file, glb(301, "PearlSkin"));
    const result = run("--studio", studio, "--out", out);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/hash mismatch: kit\/core\/pearl\.glb/);
    writeFileSync(file, original);
  });

  it("fails when a studio manifest's own hash disagrees with the file", () => {
    write("kit/world/landmarks/manifest.json", landmarks([{ file: "pearl-arch.glb", budget: "ordinary", sha256: "0".repeat(64) }]));
    gitIn("commit", "-qam", "wrong hash");
    const result = run("--studio", studio, "--out", out);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/hash mismatch: landmarks\/pearl-arch\.glb/);
  });

  it("fails on a piece over its budget and leaves the last good copy alone", () => {
    const before = readFileSync(path.join(out, "v1/manifest.json"), "utf8");
    write("kit/world/landmarks/manifest.json", landmarks([{ file: "pearl-arch.glb", budget: "ordinary" }]));
    write("kit/world/landmarks/pearl-arch.glb", glb(10_001, "landmark_pearl"));
    gitIn("commit", "-qam", "too heavy");
    const result = run("--studio", studio, "--out", out);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/over budget: landmark\.pearl-arch: 10001 vertices over the ordinary budget of 10000/);
    expect(readFileSync(path.join(out, "v1/manifest.json"), "utf8")).toBe(before);
  });

  it("fails on a file its group manifest does not list", () => {
    write("kit/world/landmarks/pearl-arch.glb", glb(900, "landmark_pearl"));
    write("kit/world/landmarks/lantern-post.glb", glb(400, "landmark_gold"));
    gitIn("add", "-A");
    gitIn("commit", "-qm", "unlisted");
    const result = run("--studio", studio, "--out", out);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/does not list: lantern-post\.glb/);
  });
});
