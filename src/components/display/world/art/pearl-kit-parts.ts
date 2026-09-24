/** Building the pearl's kit parts: rim, film, beads, orbit wire, medallions and stars. */
import * as T from "three";
import type { KitAssetId } from "../kit/kit-manifest";
import { kitMaterialRole, kitMaterialWords } from "../kit/kit-materials";
import {
  type StudyPearlKit, PEARL_KIT_PEARL, PEARL_KIT_ORBIT, PEARL_KIT_SPARKLE, PEARL_KIT_MEDALLIONS,
  PEARL_SHELL_RADIUS, MEDALLION_ORB_RADIUS, PEARL_RING_Z, PEARL_RIM_BEAD_STRIDE,
  PEARL_WIRE_RADIUS, ORBIT_LANES, type StudyPearlTwinkle, type StudyPearlKitParts,
} from "./pearl-skin-measures";

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
