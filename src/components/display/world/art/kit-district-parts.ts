/** The district builder's parts: the kit's shared materials, halos, icon discs, the grove pivot patch, procedural replacements and the bake and cluster helpers. */
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { KitAsset } from "../kit/kit-loader";
import { createKitRemap, kitMaterialWords, type MaterialRemap } from "../kit/kit-materials";
import type { DesignKitContext, DesignKitDistrict } from "./design-world";
import { KIT_BOUNDS, type KitPlacement } from "./kit-layout-core";
import { studyGlass, studyGlow, studyRim } from "./study-materials";
import type { Role } from "./kit-district-measures";

/** The kit's own shared materials: one per role, registered with the world for disposal. */
export function kitMaterials(context: DesignKitContext) {
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
export function haloSprite(context: DesignKitContext, halo: NonNullable<KitPlacement["halo"]>, dot: T.Texture) {
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
export function iconDiscs(context: DesignKitContext, icons: Array<{ placement: KitPlacement; group: T.Group }>, material: T.Material) {
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
export function addPivot(geometry: T.BufferGeometry, position: readonly [number, number, number], slot: number) {
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

export function placementScale(placement: KitPlacement): [number, number, number] {
  return placement.scaleXYZ ?? [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1];
}

/** Bushes, stones, pads, crystals, people and the little core shapes repeat; the rest stands once. */
export function defaultRole(placement: KitPlacement): "static" | "animated" | "instanced" {
  if (placement.clip) return "animated";
  const id = placement.id;
  if (/^nature\.(rose|hydrangea|lily|stepping|crystal)/.test(id)) return "instanced";
  if (/^(core|people)\./.test(id)) return "instanced";
  return "static";
}

export const isCrystal = (id: string) => id.startsWith("nature.crystal");

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

export function materialNames(mesh: T.Mesh): string[] {
  return (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material.name);
}
export function isGlowName(names: string[]) {
  return names.some(name => { const words = new Set(kitMaterialWords(name)); return words.has("glow") || words.has("halo") || words.has("flame"); });
}

/**
 * The remap for animated clones (the lotus): the study's shared materials by role
 * (`kit-materials.ts`), the rose and blush accents on the kit's own shared tints so two
 * files never bring two materials for one colour, glass on the kit glass.
 */
export function animatedRemap(context: DesignKitContext, materials: ReturnType<typeof kitMaterials>): MaterialRemap {
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
export function removeLandmark(context: DesignKitContext, district: DesignKitDistrict) {
  for (const object of district.landmark.slice()) {
    const arch = district.arches.find(record => record.root === object);
    if (arch) dropCrown(context, arch);
    if ((object as T.Mesh).isMesh && district.falls.includes(object as T.Mesh)) { context.removeFall(object as T.Mesh); continue; }
    object.removeFromParent();
  }
  district.landmark.length = 0;
}

/** The district's procedural arch row (the arches in `layout`) goes without a kit row. */
export function removeArchRow(context: DesignKitContext, district: DesignKitDistrict) {
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
export function replaceArch(context: DesignKitContext, district: DesignKitDistrict, placement: KitPlacement, group: T.Group) {
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
export function hideFlowers(context: DesignKitContext, district: DesignKitDistrict) {
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
export function templateColours(asset: KitAsset | undefined): Map<string, T.Color> {
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
