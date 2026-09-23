import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import type { WorldKit } from "../kit/kit-loader";
import type { KitAssetId } from "../kit/kit-manifest";
import { kitMaterialRole, kitMaterialWords } from "../kit/kit-materials";
import { WORLD_EXPRESSIONS, seededRandom } from "../world-data";
import { softDot, sparklePoints, studyGlass, studyGlow } from "./study-materials";

type Wrap = (measure: (text: string) => number, text: string, width: number) => string[];

/** What the host slot knows about this pearl's place on screen for the current frame. */
export type StudyPearlFrame = {
  sparkles: boolean;
  portrait: boolean;
  orbitScale: number;
  /**
   * False where the zone draws orbits of its own (the Expression Cosmos), so the pearl's two
   * gold lanes and their travelling beads stand down and the constellation reads as one orbit.
   * Absent means true.
   */
  lanes?: boolean;
  /**
   * True for the arriving pearl. Its kit rim, bead band, medallion orbs and bezels then join
   * the protect mask with the occluder, so the arrival's bloom and light column never wash
   * over the canonical symbols. Absent means false.
   */
  shield?: boolean;
};

export class StudyPearlAssets {
  private readonly textures = new Map<number, T.Texture>();
  private sparkleDot?: T.DataTexture;
  private disposed = false;
  constructor(private readonly invalidate: () => void) {}
  icon(id: number) {
    const existing = this.textures.get(id);
    if (existing) return existing;
    const map = new T.TextureLoader().load(`/home-art/icon${id}.webp`, () => { if (!this.disposed) this.invalidate(); });
    map.colorSpace = T.SRGBColorSpace; this.textures.set(id, map); return map;
  }
  /** One soft dot shared by every sparkle in the study. Built from plain bytes, so no canvas. */
  dot() { return (this.sparkleDot ??= softDot(32)); }
  private kitCache?: { kit: StudyPearlKit; parts: StudyPearlKitParts };
  /**
   * The kit pieces every pearl wears, built once from the kit and shared by all nineteen skins,
   * which is why they live here and are released with the assets rather than by any one skin.
   */
  kitParts(kit: StudyPearlKit): StudyPearlKitParts | undefined {
    if (this.disposed) return undefined;
    if (this.kitCache?.kit !== kit) {
      this.kitCache?.parts.dispose();
      this.kitCache = { kit, parts: buildPearlKitParts(kit) };
    }
    return this.kitCache.parts;
  }
  dispose() {
    this.disposed = true;
    this.textures.forEach(t => t.dispose()); this.textures.clear();
    this.sparkleDot?.dispose(); this.sparkleDot = undefined;
    this.kitCache?.parts.dispose(); this.kitCache = undefined;
  }
}

/** The face's two small caps lines, canvas pixels of the 1024 face: D2's 18 and 17, a fifth larger. */
export const STUDY_CAPTION_SIZE = { top: 21.6, bottom: 20.4 } as const;

/** Appearance study only. Pagination and reading age remain owned by the app. */
export function paintStudyPearl(
  canvas: HTMLCanvasElement,
  record: Recognition,
  message: string,
  page: number,
  pages: number,
  wrap: Wrap,
) {
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.scale(canvas.width / 1024, canvas.height / 1024);
  c.beginPath(); c.arc(512, 512, 502, 0, Math.PI * 2); c.clip();
  const ground = c.createRadialGradient(420, 310, 20, 510, 500, 540);
  ground.addColorStop(0, "#fffef5"); ground.addColorStop(.65, "#fffaf0");
  ground.addColorStop(.84, "#f6e1ec"); ground.addColorStop(.94, "#d1e5ef"); ground.addColorStop(1, "#f3d9b2");
  c.fillStyle = ground; c.fillRect(0, 0, 1024, 1024);
  const wash = c.createRadialGradient(185, 625, 5, 260, 575, 480);
  wash.addColorStop(0, "#f5bcd241"); wash.addColorStop(1, "#f5bcd200");
  c.fillStyle = wash; c.fillRect(0, 0, 1024, 1024);
  c.strokeStyle = "#e0cda199"; c.lineWidth = 1.7;
  c.beginPath(); c.arc(512, 512, 461, 0, Math.PI * 2); c.stroke();
  // Keep the approved text coordinates untouched. Fine engraved detail lives only in the outer annulus.
  c.save(); c.translate(512, 512);
  for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.strokeStyle = "#c7a66e80"; c.lineWidth = 1.1;
    for (let i = 0; i < 7; i++) {
      const a = -.43 + i * .14, r = 442;
      c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a);
      c.beginPath(); c.moveTo(0, -17); c.bezierCurveTo(17, -7, 17, 7, 0, 17); c.bezierCurveTo(-7, 5, -7, -5, 0, -17); c.stroke();
      c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 12); c.stroke(); c.restore();
    }
    c.restore();
  }
  c.strokeStyle = "#fffef6bb"; c.lineWidth = 3;
  c.beginPath(); c.arc(0, 0, 477, Math.PI * 1.12, Math.PI * 1.8); c.stroke();
  c.strokeStyle = "#ba95b349"; c.lineWidth = 1;
  c.beginPath(); c.arc(0, 0, 473, .12, 2.15); c.stroke();
  c.restore();
  c.textAlign = "center"; c.textBaseline = "top";
  c.font = "52px Georgia, serif"; c.fillStyle = "#b4897c"; c.fillText("♡", 512, 103);
  // The two small caps lines are a fifth larger than D2 drew them (visual review, 2026-09-23:
  // at 18 and 17 they were about 10 px on a 1080p TV). Size only: every position is the
  // approved layout's.
  c.font = `${STUDY_CAPTION_SIZE.top}px Arial, sans-serif`; c.fillStyle = "#92745e";
  c.fillText("A KINDNESS WORTH RECOGNIZING", 512, 169);
  c.font = "italic 63px Georgia, serif"; c.fillStyle = "#a56c82"; c.fillText("Thank you,", 512, 217);
  let nameSize = 75, names: string[] = [];
  do {
    c.font = `${nameSize}px Georgia, serif`;
    names = wrap(t => c.measureText(t).width, record.recipient, 680);
    if (names.length * nameSize * 1.07 <= 170) break;
    nameSize -= 3;
  } while (nameSize > 28);
  let y = 297;
  c.fillStyle = "#67465b";
  names.forEach(line => { c.fillText(line, 512, y); y += nameSize * 1.07; });
  y += 21;
  const divider = c.createLinearGradient(290, 0, 734, 0);
  divider.addColorStop(0, "#c8ac7b00"); divider.addColorStop(.5, "#c8ac7baa"); divider.addColorStop(1, "#c8ac7b00");
  c.fillStyle = divider; c.fillRect(290, y, 444, 2); y += 26;
  let bodySize = 52, lines: string[] = [];
  const height = Math.max(235, 799 - y);
  do {
    c.font = `${bodySize}px Georgia, serif`;
    lines = wrap(t => c.measureText(t).width, message, 700);
    if (lines.length * bodySize * 1.35 <= height) break;
    bodySize -= 1;
  } while (bodySize > 25);
  y += Math.max(0, (height - lines.length * bodySize * 1.35) / 2 - 12);
  c.fillStyle = "#455a52";
  lines.forEach(line => { c.fillText(line, 512, y); y += bodySize * 1.35; });
  c.font = "26px Georgia, serif"; c.fillStyle = "#b27b8c"; c.fillText("♡", 512, 844);
  c.font = `${STUDY_CAPTION_SIZE.bottom}px Arial, sans-serif`; c.fillStyle = "#8e765a";
  c.fillText(pages > 1 ? `${page + 1} OF ${pages}  ·  CONTINUED` : "RECOGNIZED WITH LOVE", 512, 889);
  c.restore();
}

/*
 * The 3D Studio kit on the pearl (Plan 26 K1, WORLD-INTEGRATION section 3).
 *
 * What the kit brings, all of it outside the words: the shell file's gold rim ring and its
 * bead band, thinned to every other bead and strung pearl, gold, pearl as target 01 strings
 * its orbit; a thin film of rainbow colour at the bubble's edge; the orbit ring's gold wire,
 * drawn as a hairline, laid on the two existing orbit lanes; each medallion's glass orb,
 * back bowl and gold bezel with its studs; and the four point star with its twinkle clip.
 *
 * Visual review (2026-09-23) asked for one bead element, not four: the band keeps its beads,
 * the wire loses its dots, and the ten travelling pearls stay as the orbit's few pearls.
 *
 * What it never touches: the face disc, `paintStudyPearl`, the occluder, the halo plane, the
 * finishing plane, the dust inside the glass and the layer rules. The glass shell over the
 * words stays the procedural sphere too. The kit's shell is the same sphere in the same
 * material (design 3.1 keeps `studyGlass`), so swapping it adds nothing a viewer could see,
 * while its different tessellation would move pixels over the words, which the text parity
 * rule forbids. The file's glass therefore only sets the scale every other shell piece is
 * normalized by, so the rim hugs the sphere exactly as authored.
 */

/** The read only part of the kit the skin uses, so a test can hand it a real kit loaded in Node. */
export type StudyPearlKit = Pick<WorldKit, "has" | "asset" | "geometry">;
/**
 * Where a skin finds the kit. It is read once, on the skin's first update: the skin is built
 * before its slot joins the scene, so the host hands over a getter for
 * `scene.userData.studyKit` rather than the kit itself (coordinator ruling on K1).
 */
export type StudyPearlKitSource = () => StudyPearlKit | undefined;

export const PEARL_KIT_PEARL: KitAssetId = "recognition.recognition-pearl";
export const PEARL_KIT_ORBIT: KitAssetId = "recognition.orbit-ring";
export const PEARL_KIT_SPARKLE: KitAssetId = "recognition.constellation-sparkle";
/** The nine medallion files share one bezel; any one of them supplies the orb and its setting. */
export const PEARL_KIT_MEDALLIONS: readonly KitAssetId[] = WORLD_EXPRESSIONS.map(
  expression => `recognition.medallion-${String(expression.id).padStart(2, "0")}` as KitAssetId,
);

/** Slot space, where the face disc has radius 1: the glass shell's radius, today and in the kit. */
export const PEARL_SHELL_RADIUS = 1.02;
/** A medallion's glass orb, in medallion space before the orbit's own scale. */
export const MEDALLION_ORB_RADIUS = .196;
/** The plane the gold rings sit in, just in front of the face. */
const PEARL_RING_Z = .045;
/**
 * The bead band keeps one bead in this many, so the setting reads as a string of pearls
 * rather than a marquee (visual review: the full band of eighty was busy at every size).
 */
export const PEARL_RIM_BEAD_STRIDE = 2;
/** The orbit wire's radius on the lane, slot space: a hairline, as target 01 draws its orbits. */
export const PEARL_WIRE_RADIUS = .0032;
/**
 * The thin film at the bubble's edge, slot space. Its inner edge stays outside .955 of the
 * face radius, so the words and the engraved frame around them are never touched (the text
 * parity rule is checked inside .95); it fades out by the outer edge, over the scenery.
 */
export const PEARL_FILM_INNER = .955;
export const PEARL_FILM_OUTER = 1.16;
/**
 * The film's strength: its alpha is `base` plus `fringe` times the travelling fringe (0 to 1).
 * Visual review asked for target 01's strength, where lavender, mint and peach read at the rim;
 * the first pass (.30 plus .28) was lost against the pastel sky.
 */
export const PEARL_FILM_ALPHA = { base: .46, fringe: .34 } as const;
/**
 * The medallion orb's glass over the canonical icon, kit only: a pastel veil strong enough to
 * take about forty percent of the saturation out of the flat campaign icons, so their blue
 * and teal sit inside the pastel world. The icon disc itself is untouched (design 3.1).
 */
export const MEDALLION_VEIL_OPACITY = .55;
/** The two orbit lanes, exactly the procedural tubes' and the travelling beads': radii, saddle phase, roll. */
const ORBIT_LANES = [
  { rx: 1.37, ry: 1.26, phase: 0, roll: .38 },
  { rx: 1.48, ry: 1.315, phase: 1, roll: -.46 },
] as const;

export type StudyPearlTwinkle = (time: number, rotation: T.Quaternion, scale: T.Vector3) => void;
/** Shared by every skin; built once per kit by `StudyPearlAssets.kitParts`. */
export type StudyPearlKitParts = {
  /** The shell file's gold rim ring and the band's gold beads, slot space, at the ring plane. One gold draw. */
  rim?: T.BufferGeometry;
  /** The band's pearl beads, alternating with the gold ones round the ring. One pearl draw. */
  rimPearls?: T.BufferGeometry;
  /** Both orbit lanes in one geometry: the kit's gold wire and dots on the procedural lanes. */
  orbit?: T.BufferGeometry;
  /** One kit medallion's orb glass, back bowl and gold bezel with studs, medallion space. */
  medallion?: { glass: T.BufferGeometry; back: T.BufferGeometry; bezel: T.BufferGeometry };
  /** The kit's four point star at radius 1, and its twinkle sampled from the file's own clip. */
  star?: { geometry: T.BufferGeometry; twinkle: StudyPearlTwinkle };
  /**
   * The kit ring's own pearl and gold bead radii, slot space, laid on the inner lane. The
   * travelling beads take these sizes, which is how the ring's pearls survive on the orbit.
   */
  beads?: { pearl: number; gold: number };
  /** What normalization measured, for the tests and the lane report. */
  facts: {
    shellScale?: number;
    shellRadius?: number;
    rimInner?: number;
    rimOuter?: number;
    /** Beads in the file's band, and how many the setting keeps as pearls and as gold. */
    rimBeadsInFile?: number;
    rimPearlBeads?: number;
    rimGoldBeads?: number;
    orbitCentre?: number;
    /** The wire's own radius on the lane before and after it is drawn as a hairline. */
    wireRadiusInFile?: number;
    wireRadius?: number;
    beadPearlRadius?: number;
    beadGoldRadius?: number;
    medallionScale?: number;
    orbRadius?: number;
  };
  dispose(): void;
};

type KitGroups = { geometry: T.BufferGeometry; names: readonly string[] };

/** The kit's merged geometry for one id, with its draw groups' material names. */
function kitGroups(kit: StudyPearlKit, id: KitAssetId): KitGroups | undefined {
  if (!kit.has(id)) return undefined;
  try {
    const geometry = kit.geometry(id);
    return { geometry, names: (geometry.userData.kitMaterials as string[] | undefined) ?? [] };
  } catch {
    return undefined;
  }
}

/** Positions and normals of the draw groups whose material name passes `keep`, as one compact indexed geometry. */
function kitPiece(source: KitGroups, keep: (name: string) => boolean) {
  const { geometry, names } = source;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const index = geometry.index;
  if (!position) return undefined;
  const groups = geometry.groups.length
    ? geometry.groups
    : [{ start: 0, count: index ? index.count : position.count, materialIndex: 0 }];
  const remap = new Map<number, number>();
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  for (const group of groups) {
    if (!keep(names[group.materialIndex ?? 0] ?? "")) continue;
    for (let i = group.start; i < group.start + group.count; i++) {
      const vertex = index ? index.getX(i) : i;
      let target = remap.get(vertex);
      if (target === undefined) {
        target = remap.size;
        remap.set(vertex, target);
        positions.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
        if (normal) normals.push(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex));
      }
      indices.push(target);
    }
  }
  if (!indices.length) return undefined;
  const piece = new T.BufferGeometry();
  piece.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  piece.setIndex(indices);
  if (normal) piece.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  else piece.computeVertexNormals();
  return piece;
}

/** The farthest vertex from the origin, in space or in the xy plane only. */
function farthest(geometry: T.BufferGeometry, planar = false) {
  const p = geometry.getAttribute("position");
  let radius = 0;
  for (let i = 0; i < p.count; i++) {
    radius = Math.max(radius, planar ? Math.hypot(p.getX(i), p.getY(i)) : Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  }
  return radius;
}
/** The nearest vertex to the axis in the xy plane: how close a ring comes to the words. */
function nearestPlanar(geometry: T.BufferGeometry) {
  const p = geometry.getAttribute("position");
  let radius = Infinity;
  for (let i = 0; i < p.count; i++) radius = Math.min(radius, Math.hypot(p.getX(i), p.getY(i)));
  return radius;
}
const named = (name: string, ...words: string[]) => {
  const own = kitMaterialWords(name);
  return words.some(word => own.includes(word));
};

/** Indexed geometries with positions and normals, joined into one. */
function joined(parts: readonly T.BufferGeometry[]) {
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  for (const part of parts) {
    const p = part.getAttribute("position"), n = part.getAttribute("normal"), index = part.index!;
    const base = positions.length / 3;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    for (let i = 0; i < index.count; i++) indices.push(index.getX(i) + base);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * A band of separate beads, split into its beads (connected pieces), ordered round the ring
 * by the angle of each bead's centre, then dealt out by `deal(ordinal)`: 0 and 1 name the two
 * geometries a bead joins, anything else leaves it out. Both results are compact and indexed.
 */
function dealBeads(band: T.BufferGeometry, deal: (ordinal: number) => number) {
  const p = band.getAttribute("position"), n = band.getAttribute("normal"), index = band.index!;
  const parent = Array.from({ length: p.count }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
  for (let i = 0; i < index.count; i += 3) {
    const a = find(index.getX(i));
    parent[find(index.getX(i + 1))] = a;
    parent[find(index.getX(i + 2))] = a;
  }
  const beads = new Map<number, { x: number; y: number; triangles: number[] }>();
  for (let i = 0; i < index.count; i += 3) {
    const root = find(index.getX(i));
    let bead = beads.get(root);
    if (!bead) beads.set(root, bead = { x: 0, y: 0, triangles: [] });
    bead.triangles.push(i);
  }
  for (let v = 0; v < p.count; v++) {
    const bead = beads.get(find(v));
    if (bead) { bead.x += p.getX(v); bead.y += p.getY(v); }
  }
  const ordered = [...beads.values()].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  const build = (pick: number) => {
    const remap = new Map<number, number>();
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    let count = 0;
    ordered.forEach((bead, ordinal) => {
      if (deal(ordinal) !== pick) return;
      count++;
      for (const t of bead.triangles) for (let k = 0; k < 3; k++) {
        const vertex = index.getX(t + k);
        let target = remap.get(vertex);
        if (target === undefined) {
          target = remap.size; remap.set(vertex, target);
          positions.push(p.getX(vertex), p.getY(vertex), p.getZ(vertex));
          normals.push(n.getX(vertex), n.getY(vertex), n.getZ(vertex));
        }
        indices.push(target);
      }
    });
    if (!count) return undefined;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    return { geometry, count };
  };
  return { beads: ordered.length, first: build(0), second: build(1) };
}

/**
 * The kit ring's wire, laid onto both procedural lanes.
 *
 * Every vertex keeps its place in the wire's cross section (its radial and axial offset from
 * the wire's centre line) and its angle round the ring; the centre line itself becomes the
 * procedural tube's curve, saddle included. So the travelling beads, which follow that same
 * curve, ride exactly on the kit wire, and the cross section keeps the file's proportions.
 */
function layOrbit(wire: T.BufferGeometry, facts: StudyPearlKitParts["facts"]) {
  wire.computeBoundingBox();
  const extent = wire.boundingBox!.getSize(new T.Vector3()).toArray();
  // The ring's axis is its thinnest extent; the other two span its plane, in cyclic order so
  // the laid wire keeps its winding and its faces stay outward.
  const axis = extent.indexOf(Math.min(...extent));
  const u = (axis + 1) % 3, v = (axis + 2) % 3;
  const p = wire.getAttribute("position"), q = wire.getAttribute("normal"), index = wire.index;
  if (!index || !q) return undefined;
  let low = Infinity, high = 0;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getComponent(i, u), p.getComponent(i, v));
    low = Math.min(low, r); high = Math.max(high, r);
  }
  const centre = (low + high) / 2;
  if (!(centre > 0)) return undefined;
  facts.orbitCentre = centre;
  // The file's wire, laid at the inner lane's scale, is a little heavier than target 01's
  // hairline orbits, so its cross section is drawn thinner; its path is unchanged.
  const radius = (high - low) / 2 * ((ORBIT_LANES[0].rx + ORBIT_LANES[0].ry) / 2 / centre);
  const thin = radius > 0 ? Math.min(1, PEARL_WIRE_RADIUS / radius) : 1;
  facts.wireRadiusInFile = radius;
  facts.wireRadius = radius * thin;
  const count = p.count, lanes = ORBIT_LANES.length;
  const positions = new Float32Array(count * 3 * lanes), normals = new Float32Array(count * 3 * lanes);
  const indices = new (count * lanes > 65535 ? Uint32Array : Uint16Array)(index.count * lanes);
  ORBIT_LANES.forEach((lane, l) => {
    const k = (lane.rx + lane.ry) / 2 / centre * thin;
    const cos = Math.cos(lane.roll), sin = Math.sin(lane.roll);
    for (let i = 0; i < count; i++) {
      const a0 = p.getComponent(i, u), b0 = p.getComponent(i, v), w = p.getComponent(i, axis);
      const angle = Math.atan2(b0, a0), offset = Math.hypot(a0, b0) - centre;
      const ca = Math.cos(angle), sa = Math.sin(angle);
      // The outward normal of the lane's ellipse, and its tangent with the saddle's rise.
      let ox = ca * lane.ry, oy = sa * lane.rx;
      const ol = Math.hypot(ox, oy); ox /= ol; oy /= ol;
      let tx = -sa * lane.rx, ty = ca * lane.ry, tz = Math.cos(angle * 2 + lane.phase) * .24;
      const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
      const x = ca * lane.rx + ox * offset * k;
      const y = sa * lane.ry + oy * offset * k;
      const z = Math.sin(angle * 2 + lane.phase) * .12 - .08 + w * k;
      // The file's normal in the wire's own frame (outward, along, axis), carried onto the lane's.
      const nu = q.getComponent(i, u), nv = q.getComponent(i, v), nw = q.getComponent(i, axis);
      const outward = nu * ca + nv * sa, along = -nu * sa + nv * ca;
      let mx = outward * ox + along * tx, my = outward * oy + along * ty, mz = along * tz + nw;
      const ml = Math.hypot(mx, my, mz) || 1; mx /= ml; my /= ml; mz /= ml;
      // The lane's roll in its own plane, as the procedural tube's rotation.z.
      const o = (l * count + i) * 3;
      positions[o] = x * cos - y * sin; positions[o + 1] = x * sin + y * cos; positions[o + 2] = z;
      normals[o] = mx * cos - my * sin; normals[o + 1] = mx * sin + my * cos; normals[o + 2] = mz;
    }
    for (let j = 0; j < index.count; j++) indices[l * index.count + j] = index.getX(j) + l * count;
  });
  const orbit = new T.BufferGeometry();
  orbit.setAttribute("position", new T.BufferAttribute(positions, 3));
  orbit.setAttribute("normal", new T.BufferAttribute(normals, 3));
  orbit.setIndex(new T.BufferAttribute(indices, 1));
  orbit.computeBoundingSphere();
  return orbit;
}

/** The file's twinkle clip as a pure function of the clock, so a still frame is complete. */
function twinkleFrom(clips?: ReadonlyMap<string, T.AnimationClip>): StudyPearlTwinkle {
  const clip = clips?.get("twinkle") ?? clips?.values().next().value;
  const duration = clip && clip.duration > 0 ? clip.duration : 0;
  type Sampler = { evaluate(time: number): ArrayLike<number> };
  const sampler = (suffix: string) => {
    const track = clip?.tracks.find(item => item.name.endsWith(suffix));
    return track ? (track as unknown as { createInterpolant(): Sampler }).createInterpolant() : undefined;
  };
  const turning = duration ? sampler(".quaternion") : undefined;
  const growing = duration ? sampler(".scale") : undefined;
  return (time, rotation, scale) => {
    const t = duration ? ((time % duration) + duration) % duration : 0;
    if (turning) rotation.fromArray(Array.from(turning.evaluate(t))).normalize(); else rotation.identity();
    if (growing) scale.fromArray(Array.from(growing.evaluate(t))); else scale.set(1, 1, 1);
  };
}

/**
 * Normalize the kit's recognition pieces into slot space. Pure apart from reading the kit, and
 * tolerant of any piece being missing: whatever is absent stays procedural on every skin.
 */
export function buildPearlKitParts(kit: StudyPearlKit): StudyPearlKitParts {
  const owned: T.BufferGeometry[] = [];
  const keep = <G extends T.BufferGeometry | undefined>(g: G) => { if (g) owned.push(g); return g; };
  const parts: StudyPearlKitParts = {
    facts: {},
    dispose() { owned.forEach(g => g.dispose()); owned.length = 0; },
  };
  const pearl = kitGroups(kit, PEARL_KIT_PEARL);
  if (pearl) {
    const glass = kitPiece(pearl, name => kitMaterialRole(name) === "glass");
    const ring = kitPiece(pearl, name => kitMaterialRole(name) === "gold" && !named(name, "bead"));
    const band = kitPiece(pearl, name => kitMaterialRole(name) === "gold" && named(name, "bead"));
    const radius = glass ? farthest(glass) : 0;
    if ((ring || band) && radius > 0) {
      const scale = PEARL_SHELL_RADIUS / radius;
      for (const g of [ring, band]) g?.scale(scale, scale, scale).translate(0, 0, PEARL_RING_Z);
      // Every other bead of the band is kept; of those, the first is a pearl, the next gold,
      // and so on round the ring. The gold ones join the rim ring's draw.
      const dealt = band
        ? dealBeads(band, ordinal => ordinal % PEARL_RIM_BEAD_STRIDE ? -1 : (ordinal / PEARL_RIM_BEAD_STRIDE) % 2)
        : undefined;
      const gold = joined([ring, dealt?.second?.geometry].filter((g): g is T.BufferGeometry => !!g));
      const pearls = dealt?.first?.geometry;
      dealt?.second?.geometry.dispose();
      const inner = Math.min(nearestPlanar(gold), pearls ? nearestPlanar(pearls) : Infinity);
      // The words are sacred ground: a rim that would reach inside the face is not worn at all.
      if (inner > 1 && gold.getAttribute("position").count) {
        parts.rim = keep(gold);
        if (pearls) parts.rimPearls = keep(pearls);
        Object.assign(parts.facts, {
          shellScale: scale, shellRadius: radius * scale, rimInner: inner,
          rimOuter: Math.max(farthest(gold, true), pearls ? farthest(pearls, true) : 0),
          rimBeadsInFile: dealt?.beads ?? 0, rimPearlBeads: dealt?.first?.count ?? 0, rimGoldBeads: dealt?.second?.count ?? 0,
        });
      } else { gold.dispose(); pearls?.dispose(); }
    }
    ring?.dispose(); band?.dispose(); glass?.dispose();
  }
  const ring = kitGroups(kit, PEARL_KIT_ORBIT);
  if (ring) {
    // The wire alone. Its small dots stay out since visual review (one bead element per pearl:
    // the rim band keeps its beads), and so do the ring's own pearls and larger gold beads: the
    // two travelling instanced bead draws are this orbit's pearls, and a bead fixed to the wire
    // would collide with them as they pass.
    const wire = kitPiece(ring, name => kitMaterialRole(name) === "gold" && !named(name, "bead", "dot"));
    if (wire) {
      parts.orbit = keep(layOrbit(wire, parts.facts));
      wire.dispose();
    }
    // The ring's pearls and gold beads give the travelling beads their size instead: each is
    // a sphere, so half its extent along the thinnest axis is its radius. Laid at the inner
    // lane's scale, and held to a sane band so a future file can never swamp the words.
    const centre = parts.facts.orbitCentre;
    const lane = ORBIT_LANES[0];
    const radiusOf = (keepName: (name: string) => boolean) => {
      const piece = kitPiece(ring, keepName);
      if (!piece || !centre) { piece?.dispose(); return undefined; }
      piece.computeBoundingBox();
      const extent = piece.boundingBox!.getSize(new T.Vector3()).toArray();
      piece.dispose();
      return T.MathUtils.clamp((Math.min(...extent) / 2) * ((lane.rx + lane.ry) / 2 / centre), .015, .06);
    };
    const pearl = radiusOf(name => kitMaterialRole(name) !== "gold" && named(name, "pearl"));
    const gold = radiusOf(name => kitMaterialRole(name) === "gold" && named(name, "bead"));
    if (pearl && gold) {
      parts.beads = { pearl, gold };
      Object.assign(parts.facts, { beadPearlRadius: pearl, beadGoldRadius: gold });
    }
  }
  for (const id of PEARL_KIT_MEDALLIONS) {
    const file = kitGroups(kit, id);
    if (!file) continue;
    // The orb and its setting only. The file's own sculpted symbol is not the canonical
    // artwork, so it never shows: the app's icon disc sits inside the kit orb instead.
    const glass = kitPiece(file, name => kitMaterialRole(name) === "glass");
    const back = kitPiece(file, name => named(name, "back"));
    const bezel = kitPiece(file, name => kitMaterialRole(name) === "gold" && named(name, "bezel", "stud"));
    const radius = glass ? farthest(glass) : 0;
    if (glass && back && bezel && radius > 0) {
      const scale = MEDALLION_ORB_RADIUS / radius;
      for (const g of [glass, back, bezel]) g.scale(scale, scale, scale);
      parts.medallion = { glass: keep(glass), back: keep(back), bezel: keep(bezel) };
      Object.assign(parts.facts, { medallionScale: scale, orbRadius: radius * scale });
      break;
    }
    glass?.dispose(); back?.dispose(); bezel?.dispose();
  }
  const sparkle = kitGroups(kit, PEARL_KIT_SPARKLE);
  if (sparkle) {
    const star = kitPiece(sparkle, name => named(name, "glow")) ?? kitPiece(sparkle, () => true);
    const radius = star ? farthest(star, true) : 0;
    if (star && radius > 0) {
      star.scale(1 / radius, 1 / radius, 1 / radius);
      parts.star = { geometry: keep(star), twinkle: twinkleFrom(kit.asset(PEARL_KIT_SPARKLE)?.clips) };
    } else star?.dispose();
  }
  return parts;
}

/** The travelling bead plus the four points trailing it around the gold ring. */
const SHIMMER_BEAD_COUNT = 5;
/** The shimmer's head star, and up to four more, each in its own gap between the medallions shown. */
const PEARL_STAR_COUNT = 5;
/**
 * Clear air every kit star keeps outside each shown medallion's orb, in medallion units. The
 * head star's lane runs up to .31 behind a medallion's icon disc where it crosses the ring. A
 * hero is read from about 6.7 slot radii (the Garden eye, design 3.2), and the ring only fits
 * the frame from about 4.3 (`frameFor`), so perspective pulls the star at most about .1 towards
 * the icon on screen. The icon disc sits .048 inside the orb, so .08 of air keeps even that
 * worst case off the artwork.
 */
export const PEARL_STAR_AIR = .08;
/** Where medallion `slot` of `count` shown sits on its ellipse: one formula for the medallions and the stars between them. */
const medallionAngle = (time: number, slot: number, count: number) => time * .105 + slot * Math.PI * 2 / count + .8;
/** The travelling beads' unit sphere, slot space; each draw scales it per instance. */
const PEARL_BEAD_RADIUS = .024;

type PearlMedallion = { id: number; root: T.Group; glint: T.Sprite; tint: T.Color; procedural: T.Object3D[] };

type PearlKitDressing = {
  rim?: T.Mesh;
  rimPearls?: T.Mesh;
  film?: T.Mesh;
  orbit?: T.Mesh;
  medallions?: { backs: T.InstancedMesh; orbs: T.InstancedMesh; bezels: T.InstancedMesh };
  stars?: T.InstancedMesh;
  twinkle?: StudyPearlTwinkle;
};

/** No recognition strings are retained here. The existing slot owns every personal pixel. */
export class StudyPearlSkin {
  private readonly root = new T.Group();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly materials = new Set<T.Material>();
  private readonly orbits = new T.Group();
  /**
   * `tint` is the canonical colour the kit's back bowl takes; `procedural` lists the pieces
   * the kit replaces (tint disc, glass ball, rim torus), taken out once the kit dresses the skin.
   */
  private readonly medallions: PearlMedallion[] = [];
  private readonly clock = { value: 0 };
  /** Two draws: the pearl beads, then the gold ones. */
  private readonly orbitBeads: T.InstancedMesh[] = [];
  /** Which of the ten authored bead ordinals each instance stands in for. */
  private readonly orbitBeadIndices: number[][] = [];
  private readonly beadDummy = new T.Object3D();
  private readonly orbitAxis = new T.Vector3(0, 0, 1);
  private readonly rings: T.Mesh[] = [];
  private readonly shell: T.Mesh;
  private readonly finish: T.Mesh;
  private readonly halo: T.Mesh;
  private readonly sparkles: T.Points;
  private readonly occluder: T.Mesh;
  private readonly shimmer: T.Points;
  private readonly shimmerPlaces = new Float32Array(SHIMMER_BEAD_COUNT * 3);
  private readonly shimmerScratch = new T.Vector3();
  /** The two procedural orbit tubes, which the kit wire replaces. */
  private readonly orbitTubes: T.Mesh[] = [];
  /** The medallion rim recipe: the orbit tubes, the beads, the medallion rims and every kit gold. */
  private readonly gold: T.Material;
  private readonly medallionGlass: T.Material;
  /** The travelling pearl beads' white pearl; the rim band's pearls wear it too. */
  private readonly beadPearl: T.Material;
  private readonly assets: StudyPearlAssets;
  private readonly kitSource?: StudyPearlKitSource;
  private kitResolved = false;
  private dressing?: PearlKitDressing;
  /** Per star: radius in slot units, twinkle phase in seconds, and a resting roll. Seeded per pearl. */
  private readonly starSizes: number[] = [];
  private readonly starPhases: number[] = [];
  private readonly starRolls: T.Quaternion[] = [];
  private readonly placeScratch = new T.Vector3();
  private readonly turnScratch = new T.Quaternion();
  private readonly sizeScratch = new T.Vector3();
  private readonly matrixScratch = new T.Matrix4();
  private readonly noTurn = new T.Quaternion();
  /** Instance scale of the pearl beads and of the gold beads on the unit bead sphere (.024). */
  private beadScales: [number, number] = [.9, 1.22];

  /**
   * `kitSource` is read once, on the first update, and only by the design study host. Without
   * it, or when it yields no kit, the skin is exactly the procedural one.
   */
  constructor(parent: T.Group, assets: StudyPearlAssets, seed: number, kitSource?: StudyPearlKitSource) {
    this.assets = assets;
    this.kitSource = kitSource;
    this.root.name = "Design study pearl glass, halo and exterior canonical symbols";
    parent.add(this.root);
    this.root.add(this.orbits);
    this.orbits.name = "pearl orbits";
    // The halo sits behind the depth writing face, so only the glow outside the disc reaches the eye.
    this.halo = new T.Mesh(this.geometry(new T.PlaneGeometry(3.6, 3.6)), this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 haloUv;void main(){haloUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 haloUv;uniform float time;
        void main(){float d=length(haloUv-.5)*3.6;
          // Section 7: a six second breath, so the pearl feels alive while it is being read.
          // It reads the same frozen clock as everything else, so a still frame is complete.
          float breath=.85+.15*(.5+.5*sin(time*1.0472));
          float core=pow(max(0.,1.-d/1.75),2.4);
          float outer=exp(-pow((d-1.18)*2.2,2.));
          vec3 rgb=(mix(vec3(1.,.90,.80),vec3(1.,.78,.86),smoothstep(.6,1.6,d))*core*.55+vec3(.80,.86,1.)*outer*.16)*breath;
          gl_FragColor=vec4(rgb,clamp(dot(rgb,vec3(.2126,.7152,.0722)),0.,1.));
          #include <colorspace_fragment>
        }`,
    })));
    this.halo.name = "pearl halo"; this.halo.position.z = -.4; this.halo.renderOrder = 2;
    this.halo.layers.enable(1); this.root.add(this.halo);
    // The guard that makes the radiance pass safe for the words.
    //
    // It is never on layer 0, so it is invisible in the main image. On layer 1 it writes depth
    // at the disc's own plane, which clips the halo, the back of the glass shell and anything
    // else behind it out of the glow. `update` adds it to layer 3 for the protect pass, and the
    // radiance composite multiplies by (1 - protect), so no glow and no god ray light can land
    // on a single pixel of the pearl face being read. `?radiance=off` proves it pixel for pixel.
    //
    // Layer 3 is granted only while this pearl is the one being read. The protect pass renders
    // layer 3 alone, so nothing else in the world writes depth into it: a resident bubble
    // standing behind the sculpted heart would otherwise paint its disc straight through the
    // heart and cut a blotch out of the glow there.
    //
    // .985 rather than 1: the edge then lands just inside the pearl's own rim ring, so the mask
    // ends under the rim instead of on the scenery beside it.
    this.occluder = new T.Mesh(
      this.geometry(new T.CircleGeometry(.985, 64)),
      this.material(new T.MeshBasicMaterial({ color: 0x000000, fog: false, toneMapped: false })),
    );
    this.occluder.name = "pearl occluder";
    this.occluder.renderOrder = 1;
    this.occluder.layers.set(1);
    this.root.add(this.occluder);
    // A real sphere, so the pearl reads the same under every billboard rotation and the text never turns.
    // Rim only: `pearlRim` is already in scope from studyGlass's own patch, and it is near zero
    // across the middle of the sphere, so the glow layer receives the lit edge and nothing else.
    this.shell = new T.Mesh(this.geometry(new T.SphereGeometry(1.02, 48, 24)), this.material(
      studyGlow(studyGlass(.16), "pearl", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9"),
    ));
    this.shell.name = "pearl glass"; this.shell.scale.z = .84; this.shell.position.z = 0; this.shell.renderOrder = 3;
    this.shell.layers.enable(1);
    this.root.add(this.shell);
    const finishing = this.material(new T.ShaderMaterial({
      transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
      uniforms: { time: this.clock },
      vertexShader: "varying vec2 pearlUv;void main(){pearlUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 pearlUv;uniform float time;
        float pearlHash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
        float pearlNoise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
          return mix(mix(pearlHash(i),pearlHash(i+vec2(1.,0.)),f.x),mix(pearlHash(i+vec2(0.,1.)),pearlHash(i+1.),f.x),f.y);}
        void main(){vec2 p=(pearlUv-.5)*2.18;float r=length(p),a=atan(p.y,p.x);
          float rim=exp(-pow((r-.998)*170.,2.));float inner=exp(-pow((r-.968)*190.,2.));
          float arc=pow(max(0.,cos(a-2.1+sin(time*.12)*.08)),10.);
          float reflection=exp(-pow((r-.923)*38.,2.))*arc;
          float lower=exp(-pow((r-.979)*90.,2.))*pow(max(0.,cos(a+1.1)),6.);
          vec3 prismatic=.73+.27*cos(vec3(0.,2.1,4.2)+a*2.5+time*.075);
          vec3 c=mix(prismatic,vec3(1.,.96,.82),.45);
          float sparkle=0.;for(int i=0;i<12;i++){float k=float(i);float theta=k*2.399+sin(k)*.12;
            vec2 q=p-vec2(cos(theta),sin(theta))*(1.013+sin(k*2.)*.012);
            float pulse=.3+.7*pow(.5+.5*sin(time*.7+k*3.),3.);
            sparkle+=pulse*(exp(-length(q)*220.)+exp(-abs(q.x)*1200.-abs(q.y)*100.)*.6+exp(-abs(q.y)*1200.-abs(q.x)*100.)*.6);}
          // Section 7: a slow light play inside the glass, turning about a degree a second.
          // It is gated to the outer annulus, r .84 to .96. The outermost text pixel sits at
          // r .81, so no part of the wording is ever touched, and the gate caps the added
          // alpha at .07 in a pale warm white. The gate and the colour are the whole of the
          // change: nothing here is conditional on the radiance pass, so the words are
          // identical with and without it.
          float causticTurn=time*.05;
          vec2 causticP=mat2(cos(causticTurn),-sin(causticTurn),sin(causticTurn),cos(causticTurn))*p*5.5;
          float caustic=pearlNoise(causticP+time*.07)*pearlNoise(causticP*1.7-time*.05)*2.1;
          caustic=pow(clamp(caustic,0.,1.),2.)*smoothstep(.84,.90,r)*(1.-smoothstep(.96,1.,r));
          float alpha=clamp(rim*.92+inner*.32+reflection*.52+lower*.7+sparkle+caustic*.07,0.,1.);
          vec3 finalColor=mix(c,vec3(1.,.985,.93),clamp(reflection+sparkle,0.,1.));
          finalColor=mix(finalColor,vec3(1.,.973,.902),clamp(caustic,0.,1.)*.6);
          // A soft pink, lavender and blue wash inside the glass. The centre, r below .36, is left
          // untouched so the approved wording keeps its contrast.
          float washA=smoothstep(.36,.99,r)*.16;
          vec3 washCol=mix(mix(vec3(.97,.78,.87),vec3(.85,.80,.96),smoothstep(-.6,.6,p.y)),vec3(.81,.88,.97),smoothstep(.1,.9,p.x)*.6);
          gl_FragColor=vec4((washCol*washA+finalColor*alpha)/max(.001,washA+alpha),clamp(washA+alpha,0.,1.));
          #include <colorspace_fragment>
        }`,
    }));
    this.finish = new T.Mesh(this.geometry(new T.PlaneGeometry(2.18, 2.18)), finishing);
    this.finish.name = "pearl finishing"; this.finish.position.z = .065; this.finish.renderOrder = 4;
    this.root.add(this.finish);
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(this.geometry(new T.TorusGeometry(1.005 + i * .016, i ? .0025 : .006, 6, 128)), this.material(new T.MeshBasicMaterial({ color: ["#e8c78e", "#d6b483", "#e2afca"][i], transparent: true, opacity: i ? .48 : .78, depthWrite: false })));
      ring.name = `pearl ring ${i}`;
      ring.position.z = .045; this.root.add(ring); this.rings.push(ring);
    }
    // The orbit tubes and beads share this material but stay off layer 1, so only the
    // medallion rims carry it into the glow.
    const gold = this.gold = this.material(studyGlow(
      new T.MeshStandardMaterial({ color: "#dfbd79", metalness: .8, roughness: .22, transparent: true, opacity: .83, depthWrite: false }),
      "medallion-rim", "vec3(1., .84, .58) * .95",
    ));
    for (let i = 0; i < 2; i++) {
      const points = Array.from({ length: 129 }, (_, j) => { const a=j/128*Math.PI*2;return new T.Vector3(Math.cos(a)*(1.37+i*.11),Math.sin(a)*(1.26+i*.055),Math.sin(a*2+i)*.12-.08); });
      const orbit = new T.Mesh(this.geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points), 128, .0027, 4, false)), gold);
      orbit.rotation.z = i ? -.46 : .38; this.orbits.add(orbit); this.orbitTubes.push(orbit);
    }
    const beadGeometry = this.geometry(new T.SphereGeometry(PEARL_BEAD_RADIUS, 20, 12));
    const beadPearl = this.beadPearl = this.material(new T.MeshPhysicalMaterial({ color: "#fff0dc", roughness: .2, metalness: .18, clearcoat: 1, clearcoatRoughness: .15, iridescence: .35, iridescenceIOR: 1.3 }));
    // Section 8: the ten beads travelling the two gold orbits become two instanced draws,
    // one for the six pearl beads and one for the four gold ones, in place of ten meshes.
    // Each instance keeps the ordinal it stands in for, so its lane, phase and size are
    // exactly the ones that bead had as a mesh of its own.
    const pearlBeads: number[] = [], goldBeads: number[] = [];
    for (let i = 0; i < 10; i++) (i % 3 ? pearlBeads : goldBeads).push(i);
    this.orbitBeadIndices.push(pearlBeads, goldBeads);
    [beadPearl, gold].forEach((beadMaterial, group) => {
      const beads = new T.InstancedMesh(beadGeometry, beadMaterial, this.orbitBeadIndices[group].length);
      beads.name = group ? "pearl orbit gold beads" : "pearl orbit pearl beads";
      beads.frustumCulled = false;
      this.orbits.add(beads); this.orbitBeads.push(beads);
    });
    // Warm dust inside the glass and a looser drift around it. Seeded, so every pearl is stable.
    const random = seededRandom(1201 + seed);
    const positions = new Float32Array(56 * 3), phases = new Float32Array(56);
    for (let i = 0; i < 56; i++) {
      const inside = i < 36, u = random(), angle = random() * Math.PI * 2, lift = random();
      const r = inside ? .2 + .72 * Math.sqrt(u) : 1.08 + .42 * u;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(angle) * r;
      positions[i * 3 + 2] = inside ? .06 + lift * .5 * Math.sqrt(Math.max(0, 1 - r * r)) : -.1 + lift * .35;
      phases[i] = random();
    }
    const dust = this.geometry(new T.BufferGeometry());
    dust.setAttribute("position", new T.BufferAttribute(positions, 3));
    dust.setAttribute("phase", new T.BufferAttribute(phases, 1));
    this.sparkles = new T.Points(dust, this.material(sparklePoints(this.clock, .13, "#fff2d8", 1, assets.dot())));
    this.sparkles.name = "pearl sparkles"; this.sparkles.renderOrder = 5; this.sparkles.frustumCulled = false;
    this.sparkles.layers.enable(1);
    this.root.add(this.sparkles);
    // One bright bead travelling the outer gold ring, with four points trailing it. The
    // places are rewritten each frame from the shared clock, so a still frame is complete.
    const shimmer = this.geometry(new T.BufferGeometry());
    const shimmerPhase = new Float32Array(SHIMMER_BEAD_COUNT);
    for (let i = 0; i < SHIMMER_BEAD_COUNT; i++) shimmerPhase[i] = i / SHIMMER_BEAD_COUNT;
    shimmer.setAttribute("position", new T.BufferAttribute(this.shimmerPlaces, 3));
    shimmer.setAttribute("phase", new T.BufferAttribute(shimmerPhase, 1));
    this.shimmer = new T.Points(shimmer, this.material(sparklePoints(this.clock, .10, "#fff1c8", .95, assets.dot())));
    this.shimmer.name = "pearl bead"; this.shimmer.renderOrder = 5; this.shimmer.frustumCulled = false;
    this.shimmer.layers.enable(1);
    this.root.add(this.shimmer);
    // Every canonical symbol sits inside its own little glass sphere over a tinted disc.
    const tintDisc = this.geometry(new T.CircleGeometry(.178, 40));
    const iconDisc = this.geometry(new T.CircleGeometry(.148));
    const medallionGlass = this.geometry(new T.SphereGeometry(.196, 40, 24));
    const medallionRim = this.geometry(new T.TorusGeometry(.205, .0042, 6, 56));
    const glass = this.medallionGlass = this.material(studyGlow(studyGlass(.24), "medallion", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9"));
    for (const expression of WORLD_EXPRESSIONS) {
      const root = new T.Group(); root.visible = false; root.name = `pearl medallion ${expression.id}`;
      const tintColor = new T.Color(expression.color).lerp(new T.Color("#fff8ef"), .55);
      const tint = new T.Mesh(tintDisc, this.material(new T.MeshBasicMaterial({ color: tintColor, toneMapped: false, transparent: true, opacity: .96, depthWrite: false })));
      tint.position.z = -.02; tint.renderOrder = 3; root.add(tint);
      const map = assets.icon(expression.id);
      const icon = new T.Mesh(iconDisc, this.material(new T.MeshBasicMaterial({ map, transparent: true, depthTest: true, depthWrite: false, toneMapped: false })));
      icon.position.z = .05; icon.renderOrder = 4; root.add(icon);
      const ball = new T.Mesh(medallionGlass, glass); ball.renderOrder = 5; ball.layers.enable(1); root.add(ball);
      const rim = new T.Mesh(medallionRim, gold); rim.layers.enable(1); root.add(rim);
      // An occasional catch of light off the medallion's own glass, on the upper right of the
      // little sphere. Its opacity is driven from the shared clock in update(), so it sits
      // still in a still frame, and it is sparkle class: the owner's switch hides it.
      const glint = new T.Sprite(this.material(new T.SpriteMaterial({
        map: assets.dot(), color: "#fffaf0", transparent: true, opacity: 0,
        blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
      })));
      glint.name = `pearl glint ${expression.id}`;
      glint.position.set(.07, .09, .12);
      glint.scale.set(.16, .16, 1);
      glint.renderOrder = 6;
      glint.layers.enable(1);
      root.add(glint);
      this.root.add(root); this.medallions.push({ id: expression.id, root, glint, tint: tintColor, procedural: [tint, ball, rim] });
    }
    // The kit stars' own seed, apart from the dust's, so the dust scatter is exactly as before.
    const starRandom = seededRandom(1301 + seed);
    for (let k = 0; k < PEARL_STAR_COUNT; k++) {
      this.starSizes.push(k ? .052 + starRandom() * .022 : .05);
      this.starPhases.push(starRandom() * 2);
      this.starRolls.push(new T.Quaternion().setFromAxisAngle(this.orbitAxis, (starRandom() - .5) * .7));
    }
  }
  /**
   * Put the kit on this pearl, once, on the first update. Each piece is independent: whatever
   * the kit lacks stays procedural, and without a kit nothing here runs at all.
   */
  private dress() {
    this.kitResolved = true;
    const kit = this.kitSource?.();
    const parts = kit ? this.assets.kitParts(kit) : undefined;
    if (!parts) return;
    const dressing: PearlKitDressing = {};
    if (parts.rim) {
      // The shell file's gold rim ring and bead band: a setting for the pearl, outside the face.
      // Rings 1 and 2 give way to it; ring 0 stays, since a resident shows it alone.
      //
      // Visual review found the band dull khaki and flat lit in the translucent medallion rim
      // gold, so the setting is solid: a polished gold that takes the environment's light, and
      // the travelling pearls' own white pearl for every other bead.
      const rimGold = this.material(new T.MeshPhysicalMaterial({
        color: "#f2cb80", metalness: 1, roughness: .17, clearcoat: .6, clearcoatRoughness: .12, envMapIntensity: 1.45,
      }));
      const rim = new T.Mesh(parts.rim, rimGold);
      rim.name = "pearl kit rim band"; rim.visible = false;
      this.root.add(rim); dressing.rim = rim;
      if (parts.rimPearls) {
        const pearls = new T.Mesh(parts.rimPearls, this.beadPearl);
        pearls.name = "pearl kit rim pearls"; pearls.visible = false;
        this.root.add(pearls); dressing.rimPearls = pearls;
      }
      // The thin film at the edge of the bubble: blue violet at ten o'clock, mint below it,
      // peach at four and rose above it, in fine fringes that drift with the clock. It lies
      // between the face and the gold setting, so the beads sit on it, and it never reaches
      // inside PEARL_FILM_INNER of the face, so no pixel of the words or their frame changes.
      const film = new T.Mesh(this.geometry(new T.RingGeometry(PEARL_FILM_INNER, PEARL_FILM_OUTER, 160, 3)), this.material(new T.ShaderMaterial({
        transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
        uniforms: { time: this.clock },
        vertexShader: "varying vec2 filmP;void main(){filmP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `varying vec2 filmP;uniform float time;
          float filmLobe(float t, float at){return pow(max(0., cos(t - at)), 2.);}
          void main(){float r=length(filmP),a=atan(filmP.y,filmP.x);
            float inside=smoothstep(${PEARL_FILM_INNER.toFixed(3)},.995,r);
            float outside=1.-smoothstep(1.02,${PEARL_FILM_OUTER.toFixed(3)},r);
            float t=a+sin((r-1.)*38.+time*.12)*.45;
            float violet=filmLobe(t,2.618),mint=filmLobe(t,4.189),peach=filmLobe(t,-.524),rose=filmLobe(t,1.047);
            vec3 film=(vec3(.40,.36,1.)*violet+vec3(.28,.88,.58)*mint+vec3(1.,.54,.28)*peach+vec3(1.,.40,.70)*rose)
              /max(.001,violet+mint+peach+rose);
            float fringe=.5+.5*sin((r-1.)*70.-time*.4+sin(a*3.+time*.1)*.8);
            gl_FragColor=vec4(film,inside*outside*(${PEARL_FILM_ALPHA.base.toFixed(2)}+${PEARL_FILM_ALPHA.fringe.toFixed(2)}*fringe));
            #include <colorspace_fragment>
          }`,
      })));
      film.name = "pearl kit film"; film.position.z = .02; film.renderOrder = 4; film.visible = false;
      this.root.add(film); dressing.film = film;
    }
    if (parts.orbit) {
      // The kit wire and its dots on both lanes, one draw in place of the two tubes.
      this.orbitTubes.forEach(tube => this.orbits.remove(tube));
      const orbit = new T.Mesh(parts.orbit, this.gold);
      orbit.name = "pearl kit orbit";
      this.orbits.add(orbit); dressing.orbit = orbit;
    }
    if (parts.medallion) {
      // One instanced draw each for the backs, the orbs and the bezels of every medallion shown,
      // placed where the medallion roots are. The canonical icon disc and the glint stay in
      // each root; the tint disc, glass ball and rim torus they replace come out.
      // The bowl is seen from inside, so both faces draw; `forceSinglePass` keeps that one draw,
      // where three would otherwise split a transparent double sided material into two.
      const backs = new T.InstancedMesh(parts.medallion.back, this.material(new T.MeshBasicMaterial({
        color: "#ffffff", toneMapped: false, transparent: true, opacity: .96, depthWrite: false, side: T.DoubleSide,
        forceSinglePass: true,
      })), WORLD_EXPRESSIONS.length);
      backs.name = "pearl kit medallion backs"; backs.renderOrder = 3;
      this.medallions.forEach((item, slot) => backs.setColorAt(slot, item.tint));
      // The orb glass over the canonical icon is a pastel veil (visual review: the flat campaign
      // icons read as hard emoji on the pearl orbs), so the icon is seen through tinted glass.
      const veil = studyGlow(studyGlass(MEDALLION_VEIL_OPACITY), "medallion", "vec3(1., .93, .86) * pearlRim * 1.15", "pearlRim * .9");
      veil.color.set("#f6e7f1");
      const orbs = new T.InstancedMesh(parts.medallion.glass, this.material(veil), WORLD_EXPRESSIONS.length);
      orbs.name = "pearl kit medallion orbs"; orbs.renderOrder = 5; orbs.layers.enable(1);
      const bezels = new T.InstancedMesh(parts.medallion.bezel, this.gold, WORLD_EXPRESSIONS.length);
      bezels.name = "pearl kit medallion bezels"; bezels.layers.enable(1);
      for (const mesh of [backs, orbs, bezels]) {
        mesh.frustumCulled = false; mesh.visible = false; mesh.count = 0;
        this.root.add(mesh);
      }
      this.medallions.forEach(item => item.procedural.forEach(part => item.root.remove(part)));
      dressing.medallions = { backs, orbs, bezels };
    }
    if (parts.star) {
      // The head of the shimmer becomes the kit's star; the four trailing points stay points.
      const stars = new T.InstancedMesh(parts.star.geometry, this.material(new T.MeshBasicMaterial({
        color: "#fff3d6", transparent: true, opacity: .95, depthWrite: false, fog: false, toneMapped: false,
      })), PEARL_STAR_COUNT);
      stars.name = "pearl kit stars"; stars.renderOrder = 5; stars.frustumCulled = false; stars.visible = false;
      stars.layers.enable(1);
      this.root.add(stars);
      this.shimmer.geometry.setDrawRange(1, SHIMMER_BEAD_COUNT - 1);
      dressing.stars = stars; dressing.twinkle = parts.star.twinkle;
    }
    if (parts.beads) {
      // The travelling beads take the kit ring's own pearl and bead sizes; the two draws and
      // their CPU motion are unchanged.
      this.beadScales = [parts.beads.pearl / PEARL_BEAD_RADIUS, parts.beads.gold / PEARL_BEAD_RADIUS];
    }
    this.dressing = dressing;
  }
  private geometry<G extends T.BufferGeometry>(g: G) { this.geometries.add(g); return g; }
  private material<M extends T.Material>(m: M) { this.materials.add(m); return m; }
  update(time: number, ids: readonly number[], detailed: boolean, frame: StudyPearlFrame) {
    if (!this.kitResolved) this.dress();
    this.clock.value = time;
    // A resident pearl keeps only its glass shell and one gold ring: two extra draws.
    this.finish.visible = this.halo.visible = detailed;
    // Where the zone draws its own orbits, the pearl's lanes and their beads stand down.
    this.orbits.visible = detailed && frame.lanes !== false;
    // The occluder always blocks the glow layer behind this disc. Only the pearl being read
    // joins the protect mask, which carries no scene depth of its own.
    this.occluder.visible = true;
    if (detailed) this.occluder.layers.enable(3); else this.occluder.layers.disable(3);
    // A resident steps back into the scenery, so it keeps its shell but leaves the glow layer.
    // One message at a time carries the eye, and the glow pass drops a dozen draws with it.
    if (detailed) this.shell.layers.enable(1); else this.shell.layers.disable(1);
    this.sparkles.visible = detailed && frame.sparkles;
    // Sparkle class, like the dust: the bead and the medallion glints follow the owner's switch.
    this.shimmer.visible = detailed && frame.sparkles;
    if (this.shimmer.visible) {
      for (let i = 0; i < SHIMMER_BEAD_COUNT; i++) {
        const a = time * .42 - i * .06;
        this.shimmerScratch.set(Math.cos(a) * 1.37, Math.sin(a) * 1.26, Math.sin(a * 2) * .12 - .08);
        this.shimmerScratch.applyAxisAngle(this.orbitAxis, .38);
        this.shimmerPlaces[i * 3] = this.shimmerScratch.x;
        this.shimmerPlaces[i * 3 + 1] = this.shimmerScratch.y;
        this.shimmerPlaces[i * 3 + 2] = this.shimmerScratch.z;
      }
      this.shimmer.geometry.getAttribute("position").needsUpdate = true;
    }
    const dressing = this.dressing;
    this.rings.forEach((ring, index) => { ring.visible = index === 0 || (detailed && !dressing?.rim); });
    for (const part of [dressing?.rim, dressing?.rimPearls, dressing?.film]) if (part) part.visible = detailed;
    // The arriving pearl's setting and symbols join the protect mask with its occluder, so the
    // arrival's glow never lands on them. Every other pearl keeps them off that layer.
    const shield = detailed && frame.shield === true;
    const shielded = [dressing?.rim, dressing?.rimPearls, dressing?.medallions?.orbs, dressing?.medallions?.bezels];
    for (const part of shielded) if (part) { if (shield) part.layers.enable(3); else part.layers.disable(3); }
    this.orbitBeads.forEach((beads, group) => {
      const size = this.beadScales[group];
      this.orbitBeadIndices[group].forEach((i, slot) => {
        const lane = i % 2, a = i * 2.399 + time * .035;
        this.beadDummy.position
          .set(Math.cos(a) * (1.37 + lane * .11), Math.sin(a) * (1.26 + lane * .055), Math.sin(a * 2 + lane) * .12 - .08)
          .applyAxisAngle(this.orbitAxis, lane ? -.46 : .38);
        this.beadDummy.scale.setScalar(size);
        this.beadDummy.updateMatrix();
        beads.setMatrixAt(slot, this.beadDummy.matrix);
      });
      beads.instanceMatrix.needsUpdate = true;
    });
    const selected = this.medallions.filter(item => ids.includes(item.id));
    this.medallions.forEach(item => {
      item.root.visible = detailed && ids.includes(item.id);
      item.glint.visible = frame.sparkles;
      // A narrow power keeps each glint to a brief catch of light rather than a steady lamp,
      // and the per symbol phase means no two of them flash together.
      item.glint.material.opacity = Math.pow(Math.max(0, Math.sin(time * .55 + item.id * 1.3)), 30) * .9;
    });
    // A narrow viewport pulls the ring in and shrinks the symbols, so none of them leaves the frame.
    const radiusX = (frame.portrait ? 1.06 : 1.36) * frame.orbitScale;
    const radiusY = (frame.portrait ? 1.44 : 1.28) * frame.orbitScale;
    const size = frame.portrait ? .9 : frame.orbitScale;
    selected.forEach((item, i) => {
      const a = medallionAngle(time, i, selected.length);
      item.root.position.set(Math.cos(a) * radiusX, Math.sin(a) * radiusY, .09 + Math.sin(a * 2) * .055);
      item.root.scale.setScalar(size);
    });
    if (dressing?.medallions) this.placeKitMedallions(dressing.medallions, detailed ? selected : []);
    if (dressing?.stars) this.placeKitStars(dressing.stars, dressing.twinkle, time, detailed && frame.sparkles, detailed ? selected : [], radiusX, radiusY, size);
  }
  /** Every medallion shown takes the next instance of each kit draw, at its root's place and size. */
  private placeKitMedallions(kit: NonNullable<PearlKitDressing["medallions"]>, shown: readonly PearlMedallion[]) {
    const { backs, orbs, bezels } = kit;
    shown.forEach((item, slot) => {
      this.matrixScratch.compose(item.root.position, this.noTurn, item.root.scale);
      backs.setMatrixAt(slot, this.matrixScratch);
      orbs.setMatrixAt(slot, this.matrixScratch);
      bezels.setMatrixAt(slot, this.matrixScratch);
      backs.setColorAt(slot, item.tint);
    });
    for (const mesh of [backs, orbs, bezels]) {
      mesh.count = shown.length;
      mesh.visible = shown.length > 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (backs.instanceColor) backs.instanceColor.needsUpdate = true;
  }
  /**
   * The head star rides the shimmer's place on the outer gold ring. The others ride the
   * medallion ellipse a little further out, each at the midpoint of a gap between two
   * neighbouring medallions shown, with the medallions' own angle formula, so they turn with
   * the ring and keep their gaps for the whole reading. There are as many as there are gaps,
   * up to four, spread evenly over the gaps when there are more.
   *
   * No star ever paints over a canonical symbol (design 3.1). Neither the stars nor the icon
   * disc writes depth, and the stars draw after it, so the guarantee is geometric: each star
   * shrinks to keep its whole extent outside every shown orb plus `PEARL_STAR_AIR`, and is
   * gone while it passes one. The gap stars always clear at full size; only the head star,
   * whose lane crosses the medallion ring, ever dips, and it does so smoothly. Every pose is
   * a function of the clock.
   */
  private placeKitStars(
    stars: T.InstancedMesh, twinkle: StudyPearlTwinkle | undefined, time: number, shown: boolean,
    medallions: readonly PearlMedallion[], radiusX: number, radiusY: number, size: number,
  ) {
    stars.visible = shown;
    if (!shown) return;
    const count = medallions.length;
    const gapStars = Math.min(PEARL_STAR_COUNT - 1, count);
    stars.count = 1 + gapStars;
    for (let k = 0; k <= gapStars; k++) {
      if (k === 0) {
        const a = time * .42;
        this.placeScratch.set(Math.cos(a) * 1.37, Math.sin(a) * 1.26, Math.sin(a * 2) * .12 - .08).applyAxisAngle(this.orbitAxis, .38);
      } else {
        // The gap after medallion `gap`, halfway to the next one round the ring.
        const gap = Math.floor((k - 1) * count / gapStars);
        const a = medallionAngle(time, gap + .5, count);
        this.placeScratch.set(Math.cos(a) * radiusX * 1.07, Math.sin(a) * radiusY * 1.07, .09);
      }
      if (twinkle) twinkle(time + this.starPhases[k], this.turnScratch, this.sizeScratch);
      else { this.turnScratch.identity(); this.sizeScratch.set(1, 1, 1); }
      this.turnScratch.premultiply(this.starRolls[k]);
      this.sizeScratch.multiplyScalar(this.starSizes[k] * (k ? size : 1));
      // The star's geometry has planar radius 1 and the twinkle and roll turn it about the view
      // axis only, so its half extent on the pearl's plane is its largest planar scale.
      const half = Math.max(this.sizeScratch.x, this.sizeScratch.y);
      let room = Infinity;
      for (const item of medallions) {
        const reach = (MEDALLION_ORB_RADIUS + PEARL_STAR_AIR) * item.root.scale.x;
        room = Math.min(room, Math.hypot(this.placeScratch.x - item.root.position.x, this.placeScratch.y - item.root.position.y) - reach);
      }
      // Full size from one and a half extents of room, nothing at none. Smoothstep's slope never
      // passes 1.5, so the shrinking star never outgrows the room it has.
      if (room < 1.5 * half) this.sizeScratch.multiplyScalar(T.MathUtils.smoothstep(room, 0, 1.5 * half));
      this.matrixScratch.compose(this.placeScratch, this.turnScratch, this.sizeScratch);
      stars.setMatrixAt(k, this.matrixScratch);
    }
    stars.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.medallions.forEach(item => { item.root.visible = false; });
    this.halo.visible = this.sparkles.visible = this.shimmer.visible = false;
    this.occluder.layers.disable(3);
    const kit = this.dressing?.medallions;
    if (kit) for (const mesh of [kit.backs, kit.orbs, kit.bezels]) { mesh.visible = false; mesh.count = 0; mesh.layers.disable(3); }
    if (this.dressing?.stars) this.dressing.stars.visible = false;
    for (const part of [this.dressing?.rim, this.dressing?.rimPearls]) part?.layers.disable(3);
  }
  /** Test seam: the exact layer mask of one named study object. */
  layerMask(name: string) {
    let mask: number | undefined;
    this.root.traverse(object => { if (object.name === name) mask = object.layers.mask; });
    return mask;
  }
  /** Test seam: the authored radius of one named circular study object. */
  radius(name: string) {
    let value: number | undefined;
    this.root.traverse(object => {
      const geometry = (object as T.Mesh).geometry as T.CircleGeometry | undefined;
      if (object.name === name && geometry?.parameters) value = geometry.parameters.radius;
    });
    return value;
  }
  dispose() {
    this.root.removeFromParent(); this.root.clear();
    // The two instanced beads own per instance buffers the geometry registrar cannot reach.
    this.orbitBeads.forEach(beads => beads.dispose());
    // So do the kit's instanced draws. Their geometry is shared by every skin and belongs to
    // the assets, which release it with the rest of the study.
    const kit = this.dressing;
    if (kit?.medallions) [kit.medallions.backs, kit.medallions.orbs, kit.medallions.bezels].forEach(mesh => mesh.dispose());
    kit?.stars?.dispose();
    this.dressing = undefined;
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose());
    this.geometries.clear(); this.materials.clear();
    this.medallions.length = 0; this.orbitBeads.length = 0; this.rings.length = 0;
    this.orbitBeadIndices.length = 0; this.orbitTubes.length = 0;
  }
}
