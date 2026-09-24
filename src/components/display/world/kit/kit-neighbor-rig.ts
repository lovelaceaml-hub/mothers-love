/** The neighbors' shared material, the rig merge and clone, and the speech card painter. */
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { studyRim } from "../art/study-materials";
import { NEIGHBOR_CARD } from "./kit-neighbor-cast";

/* ---------------------------------------------------------------------------------------- */

/** One shared material for every actor: colours, roughness and glow ride in vertex attributes. */
export function neighborMaterial() {
  const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: T.DoubleSide, dithering: true });
  material.name = "neighbor";
  material.onBeforeCompile = shader => {
    shader.vertexShader = "attribute vec4 kitSurface;\nvarying vec4 vKitSurface;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvKitSurface = kitSurface;",
    );
    shader.fragmentShader = "varying vec4 vKitSurface;\n" + shader.fragmentShader
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = vKitSurface.w;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vKitSurface.rgb;");
  };
  material.customProgramCacheKey = () => "kit-neighbor-v1";
  // The study's warm rim from the low sun, as the ivory architecture carries it.
  return studyRim(material, "#ffe6c9", 2.6, 0.16);
}

export type NeighborRig = {
  root: T.Object3D;
  mesh: T.SkinnedMesh;
  skeleton: T.Skeleton;
  clips: ReadonlyMap<string, T.AnimationClip>;
};

/**
 * Garments recoloured as they are baked, by the file's material name (sRGB). The grandfather's
 * mustard cardigan was the one garment outside the pearl pastels; in sage it sits beside the
 * lavender, coral and rose of the others. Every other material keeps the file's own colour, and
 * the kit's file is not changed (a later LW5 export in these colours makes the entry a no op).
 */
export const NEIGHBOR_GARMENTS: Readonly<Record<string, string>> = {
  grandfather_Top: "#a3c6a1",
};

/**
 * One skinned draw from a rigged kit file: every primitive of the skinned mesh merged into one
 * geometry, each primitive's colour, roughness and emission written into its vertices, bound
 * to the same skeleton. The kit's own geometry is never changed; the merged one is new.
 */
export function mergeNeighborRig(source: T.Object3D, material: T.Material): { root: T.Object3D; mesh: T.SkinnedMesh; geometry: T.BufferGeometry } | null {
  const root = cloneSkinned(source);
  const parts: T.SkinnedMesh[] = [];
  root.traverse(object => { if ((object as T.SkinnedMesh).isSkinnedMesh) parts.push(object as T.SkinnedMesh); });
  if (!parts.length) return null;
  const skeleton = parts[0].skeleton;
  if (parts.some(part => part.skeleton.bones.length !== skeleton.bones.length)) return null;
  root.updateMatrixWorld(true);
  const reference = parts[0];
  const toReference = reference.matrixWorld.clone().invert();
  const pieces: T.BufferGeometry[] = [];
  const release = () => { pieces.forEach(piece => piece.dispose()); return null; };
  for (const part of parts) {
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    const source = part.geometry as T.BufferGeometry;
    // GLTFLoader gives each primitive its own mesh and one material; a mesh with a material
    // array (not what the kit exports) is split by its groups.
    const groups = Array.isArray(part.material) && source.groups.length
      ? source.groups.map(group => ({ geometry: sliceGroup(source, group.start, group.count), material: materials[group.materialIndex ?? 0] }))
      : [{ geometry: source, material: materials[0] }];
    for (const { geometry, material: surface } of groups) {
      const piece = new T.BufferGeometry();
      const count = geometry.getAttribute("position")?.count ?? 0;
      for (const [name, Type] of [["position", Float32Array], ["normal", Float32Array], ["skinIndex", Uint16Array], ["skinWeight", Float32Array]] as const) {
        const attribute = geometry.getAttribute(name);
        if (!attribute) { if (geometry !== source) geometry.dispose(); piece.dispose(); return release(); }
        const size = attribute.itemSize;
        const values = new Type(count * size);
        for (let i = 0; i < count; i++) for (let k = 0; k < size; k++) values[i * size + k] = name === "skinIndex" ? Math.round(attribute.getComponent(i, k)) : attribute.getComponent(i, k);
        piece.setAttribute(name, new T.BufferAttribute(values, size));
      }
      // Indexed stays indexed: each vertex is skinned once however many triangles share it.
      if (geometry.index) piece.setIndex(Array.from(geometry.index.array as ArrayLike<number>));
      if (geometry !== source) geometry.dispose();
      const standard = surface as T.MeshStandardMaterial | undefined;
      const garment = standard ? NEIGHBOR_GARMENTS[standard.name] : undefined;
      const color = garment ? new T.Color(garment) : standard?.color ?? new T.Color(1, 1, 1);
      const emissive = (standard?.emissive ?? new T.Color(0, 0, 0)).clone().multiplyScalar(standard?.emissiveIntensity ?? 1);
      const roughness = standard?.roughness ?? 0.6;
      const colors = new Float32Array(count * 3), surfaces = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
        surfaces[i * 4] = emissive.r; surfaces[i * 4 + 1] = emissive.g; surfaces[i * 4 + 2] = emissive.b; surfaces[i * 4 + 3] = roughness;
      }
      piece.setAttribute("color", new T.BufferAttribute(colors, 3));
      piece.setAttribute("kitSurface", new T.BufferAttribute(surfaces, 4));
      // Every primitive of one glTF node shares the node's transform; this also covers a file
      // that splits a person into several nodes on one skeleton.
      if (part !== reference) piece.applyMatrix4(toReference.clone().multiply(part.matrixWorld));
      pieces.push(piece);
    }
  }
  const indexed = pieces.every(piece => piece.index);
  if (!indexed) pieces.forEach((piece, i) => { if (piece.index) { pieces[i] = piece.toNonIndexed(); piece.dispose(); } });
  const merged = mergeGeometries(pieces, false);
  pieces.forEach(piece => piece.dispose());
  if (!merged) return null;
  merged.computeBoundingBox();
  const sphere = merged.boundingBox!.getBoundingSphere(new T.Sphere());
  // Room for raised arms, a bow and a stride: the bind pose sphere, a little larger.
  sphere.radius *= 1.3;
  merged.boundingSphere = sphere;
  const mesh = new T.SkinnedMesh(merged, material);
  mesh.name = `${source.name || "neighbor"} merged`;
  mesh.position.copy(reference.position);
  mesh.quaternion.copy(reference.quaternion);
  mesh.scale.copy(reference.scale);
  reference.parent!.add(mesh);
  mesh.bind(skeleton, reference.bindMatrix);
  mesh.boundingSphere = sphere.clone();
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parts.forEach(part => part.removeFromParent());
  return { root, mesh, geometry: merged };
}

/** A standalone, non indexed copy of one draw group. */
function sliceGroup(source: T.BufferGeometry, start: number, count: number) {
  const flat = source.index ? source.toNonIndexed() : source.clone();
  const out = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(flat.attributes)) {
    const size = attribute.itemSize;
    out.setAttribute(name, new T.BufferAttribute((attribute.array as Float32Array).slice(start * size, (start + count) * size), size, attribute.normalized));
  }
  flat.dispose();
  return out;
}

/** A fresh rig for one actor: its own bones, the person's merged geometry and the shared material. */
export function cloneRig(template: { root: T.Object3D }, clips: ReadonlyMap<string, T.AnimationClip>): NeighborRig {
  const root = cloneSkinned(template.root);
  let mesh: T.SkinnedMesh | undefined;
  root.traverse(object => { if ((object as T.SkinnedMesh).isSkinnedMesh) mesh = object as T.SkinnedMesh; });
  return { root, mesh: mesh!, skeleton: mesh!.skeleton, clips };
}

/* ---------------------------------------------------------------------------------------- */

/**
 * The speech card, restyled to the study palette (design 5.3): an ivory card with a gold
 * hairline, the words in plum, and "FICTIONAL NEIGHBORS" printed above them on every card, as
 * Plan 21's review asked. The tail points down at whoever is speaking.
 */
export type CardContext = Pick<CanvasRenderingContext2D,
  "clearRect" | "beginPath" | "moveTo" | "lineTo" | "quadraticCurveTo" | "closePath" | "fill" | "stroke" | "fillText" | "measureText" | "arc"
> & { fillStyle: unknown; strokeStyle: unknown; lineWidth: number; font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline; globalAlpha: number };

export const NEIGHBOR_CARD_LABEL = "FICTIONAL NEIGHBORS";

export function paintNeighborCard(context: CardContext, text: string, accent: string, tail: number, side: "down" | "left" | "right" = "down") {
  const width = NEIGHBOR_CARD.canvasWidth, height = NEIGHBOR_CARD.canvasHeight;
  const radius = 58;
  // Room for the tail on the side it points from: below the card, or at its left or right edge.
  const left = side === "left" ? 64 : 10, right = side === "right" ? width - 64 : width - 10;
  const top = side === "down" ? 10 : 34, bottom = side === "down" ? height - 64 : height - 30;
  const tip = Math.min(right - radius - 40, Math.max(left + radius + 40, tail * width));
  const level = Math.min(bottom - radius - 30, Math.max(top + radius + 30, tail * height));
  context.clearRect(0, 0, width, height);
  const outline = () => {
    context.beginPath();
    context.moveTo(left + radius, top);
    context.lineTo(right - radius, top);
    context.quadraticCurveTo(right, top, right, top + radius);
    if (side === "right") { context.lineTo(right, level - 30); context.lineTo(width - 8, level); context.lineTo(right, level + 30); }
    context.lineTo(right, bottom - radius);
    context.quadraticCurveTo(right, bottom, right - radius, bottom);
    if (side === "down") { context.lineTo(tip + 34, bottom); context.lineTo(tip, height - 8); context.lineTo(tip - 34, bottom); }
    context.lineTo(left + radius, bottom);
    context.quadraticCurveTo(left, bottom, left, bottom - radius);
    if (side === "left") { context.lineTo(left, level + 30); context.lineTo(8, level); context.lineTo(left, level - 30); }
    context.lineTo(left, top + radius);
    context.quadraticCurveTo(left, top, left + radius, top);
    context.closePath();
  };
  context.globalAlpha = 1;
  outline();
  context.fillStyle = "#fffaf3";
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = "#d8b06a";
  context.stroke();
  // A quiet second hairline inside the gold one, as the pearl's own rings are drawn.
  context.globalAlpha = 0.55;
  context.lineWidth = 2;
  context.strokeStyle = "#efd9ae";
  context.beginPath();
  context.moveTo(left + radius, top + 14);
  context.lineTo(right - radius, top + 14);
  context.stroke();
  context.globalAlpha = 1;
  // The label, with the expression's own colour as a small bead before it.
  context.font = "600 25px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  // Tracked out where the browser can (an older TV browser simply sets it tight).
  const spaced = context as CardContext & { letterSpacing?: string };
  if ("letterSpacing" in spaced) spaced.letterSpacing = "4px";
  const labelWidth = context.measureText(NEIGHBOR_CARD_LABEL).width;
  const centre = (left + right) / 2, labelY = top + 46;
  context.fillStyle = "#8b6a80";
  context.fillText(NEIGHBOR_CARD_LABEL, centre + 12, labelY);
  if ("letterSpacing" in spaced) spaced.letterSpacing = "0px";
  context.fillStyle = accent;
  context.beginPath();
  context.arc(centre - labelWidth / 2 - 10, labelY, 8, 0, Math.PI * 2);
  context.fill();
  // The words: Georgia as the pearl sets them, as large as two balanced lines allow.
  const words = text.split(/\s+/).filter(Boolean);
  const room = right - left - 130;
  const measure = (line: string) => context.measureText(line).width;
  const layout = (size: number): string[] | null => {
    context.font = `500 ${size}px Georgia, "Times New Roman", serif`;
    const whole = words.join(" ");
    if (measure(whole) <= room) return [whole];
    let best: string[] | null = null, widest = Infinity;
    for (let cut = 1; cut < words.length; cut++) {
      const pair = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
      const w = Math.max(measure(pair[0]), measure(pair[1]));
      if (w <= room && w < widest) { best = pair; widest = w; }
    }
    return best;
  };
  let size = 74, set = layout(size);
  while (!set && size > 44) set = layout(size -= 4);
  if (!set) {
    // Three lines at the smallest size, greedily: no canonical phrase needs it today.
    set = [];
    let line = "";
    for (const word of words) {
      const proposed = line ? `${line} ${word}` : word;
      if (line && measure(proposed) > room) { set.push(line); line = word; } else line = proposed;
    }
    if (line) set.push(line);
  }
  context.fillStyle = "#4e2f48";
  const middle = (bottom + top + 74) / 2;
  set.forEach((line, i) => context.fillText(line, centre, middle + (i - (set.length - 1) / 2) * size * 1.12));
}

export function cardCanvas(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = NEIGHBOR_CARD.canvasWidth;
  canvas.height = NEIGHBOR_CARD.canvasHeight;
  const context = canvas.getContext("2d");
  return context ? { canvas, context } : null;
}
