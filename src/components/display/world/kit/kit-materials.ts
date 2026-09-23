import * as T from "three";

/**
 * The remap from the kit's exported material names to the design world's own shared
 * materials (WORLD-INTEGRATION 2.4), so kit pieces adopt the golden hour look and the study
 * batcher can merge them with each other and with the procedural ivory and gold by identity.
 *
 * The file's own materials were tuned under Cycles for the film; in the world they are
 * placeholders the remap replaces. Whatever keeps its imported material (skin, hair, dress,
 * accent colours, emissive glows such as a candle flame) keeps the file's colour and its
 * `KHR_materials_emissive_strength`, shared by every instance of that file.
 */
export type KitMaterialRole =
  | "ivory" | "gold" | "stone" | "leaf" | "lawn" | "bloom" | "glass" | "silk" | "water" | "keep";

/** Split `landmark_pearl`, `PearlRimGold`, `Orb01Glass` or `petal-pearl` into lower case words. */
export function kitMaterialWords(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * The role a kit material plays, from its name alone. Ordered: glass before pearl (a pearl
 * glass is glass), anything that glows before gold (an emissive gold keeps its light), petal
 * before pearl (a pearl petal is a petal). Unknown names keep their imported material.
 */
export function kitMaterialRole(name: string): KitMaterialRole {
  const words = new Set(kitMaterialWords(name));
  const has = (...candidates: string[]) => candidates.some(word => words.has(word));
  if (has("glass")) return "glass";
  if (has("glow", "halo", "flame", "sparkle", "shine", "glint", "emissive", "lens", "window")) return "keep";
  if (has("gold", "bezel", "stud")) return "gold";
  if (has("silk", "ribbon")) return "silk";
  if (has("water", "pond", "pool")) return "water";
  if (has("petal", "blossom", "bloom")) return "bloom";
  if (has("pearl", "ivory", "marble")) return "ivory";
  if (has("stone", "rock", "cliff")) return "stone";
  if (has("lawn")) return "lawn";
  if (has("leaf", "leaves", "grass", "moss", "foliage")) return "leaf";
  return "keep";
}

/** The study's shared materials a builder hands the remap. Any role left out keeps the import. */
export type KitStudyPalette = Partial<Record<Exclude<KitMaterialRole, "glass" | "keep">, T.Material>> & {
  /** Glass is per opacity (`studyGlass(opacity)`), so the builder supplies a factory. */
  glass?: (imported: T.Material) => T.Material;
};

export type MaterialRemap = (name: string, imported: T.Material) => T.Material;

/** A remap from a palette: each role to the study's material, every other name to its import. */
export function createKitRemap(palette: KitStudyPalette): MaterialRemap {
  return (name, imported) => {
    const role = kitMaterialRole(name);
    if (role === "keep") return imported;
    if (role === "glass") return palette.glass ? palette.glass(imported) : imported;
    return palette[role] ?? imported;
  };
}

const usesVertexColors = (material: T.Material) =>
  (material as T.Material & { vertexColors?: boolean }).vertexColors === true;

/**
 * Apply a remap to every mesh under `root`. A study material that multiplies vertex colours
 * (`bloom`, the grove surround) would draw black on a mesh without a colour attribute, so a
 * white one is added to such a geometry once; it changes nothing for any other material.
 */
export function applyKitRemap(root: T.Object3D, remap: MaterialRemap) {
  root.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    const remapped = Array.isArray(object.material)
      ? object.material.map((material: T.Material) => remap(material.name, material))
      : remap((object.material as T.Material).name, object.material as T.Material);
    object.material = remapped;
    const list = Array.isArray(remapped) ? remapped : [remapped];
    const geometry = object.geometry as T.BufferGeometry;
    if (list.some(usesVertexColors) && !geometry.getAttribute("color")) {
      const count = geometry.getAttribute("position").count;
      geometry.setAttribute("color", new T.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    }
  });
  return root;
}
