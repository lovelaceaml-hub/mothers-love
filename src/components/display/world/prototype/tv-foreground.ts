import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { seededRandom, type ZoneId } from "../world-data";
import type { DesignKitContext, DesignKitDistrict, KitBuilderHandle } from "./design-world";
import { applyKitLayouts } from "./kit-districts";
import type { KitPlacement, ZoneLayout } from "./kit-layout-core";
import { TV_BUBBLE_PLACES } from "./tv-page";
import { TV_BASIN, TV_MAIN_RADIUS, TV_PLACES, TV_TERRACE_TOP, TV_WATER_TOP, tvPlaceWorld, worldToLayout, zoneOf } from "./tv-places";

/*
 * The TV page's foreground restyle (PLAN-01 Section 5, step 3), everything still 3D and in
 * the world's current look: denser blossom through the kit layouts, ringed pearls floating
 * round the island, pastel petals drifting through the air, more waterfalls off the edge, and
 * the lotuses the bubbles come from: at every place a lotus in an ivory basin whose gold stem
 * holds the main bubble, and a second lotus the flowing bubbles bud from.
 *
 * Built only on the TV page and only with a kit, like every other kit builder.
 */

/** Extra blossom for the Garden, all on the island's far half so the bubbles stay clear. */
export function tvGardenBlossom(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "nature.blossom-tree-a", position: [13.5, 0.7, -9.5], rotationY: 1.1, scale: 0.95, role: "static", contact: [6, 5], note: "TV page: back right blossom" },
    { id: "nature.blossom-tree-b", position: [5.5, 0.7, -14], rotationY: 2.2, scale: 0.85, role: "static", contact: [5.5, 4.5], note: "TV page: back blossom behind the pond" },
  ];
  const bushes: Array<[string, number, number, number, number]> = [
    ["nature.hydrangea-bush", 15.2, -4.2, 1.3, 0.4],
    ["nature.rose-bush", 10.8, -12.2, 1.3, 1.9],
    ["nature.hydrangea-bush", 2.2, -12.8, 1.2, 2.6],
    ["nature.rose-bush", 15.6, 1.2, 1.2, 0.8],
    ["nature.hydrangea-bush", 7.6, -5.2, 1.1, 1.3],
    ["nature.rose-bush", -1.4, -11.2, 1.2, 0.2],
  ];
  bushes.forEach(([id, x, z, scale, spin], k) =>
    placements.push({ id, position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note: `TV page: blossom bush ${k + 1} of ${bushes.length}` }),
  );
  return { zone: "garden", placements };
}

const LAYOUTS: Partial<Record<ZoneId, () => ZoneLayout>> = { garden: tvGardenBlossom };

/** Ringed pearls per place, and drifting petals per place. */
export const TV_PEARLS = 9;
export const TV_PETALS = 60;
const PETAL_COLORS = ["#ffd6e4", "#f9c6dc", "#e9d8ff", "#fff1c9", "#d8f1e6", "#ffe0d0"];

export function applyTvForeground(context: DesignKitContext): KitBuilderHandle | undefined {
  const handles: KitBuilderHandle[] = [];
  const layouts = TV_BUBBLE_PLACES.map((place) => LAYOUTS[place]?.()).filter((layout): layout is ZoneLayout => !!layout);
  const blossom = applyKitLayouts(context, layouts);
  if (blossom) handles.push(blossom);

  const pearlGeometry = context.kit.has("core.pearl")
    ? context.kit.geometry("core.pearl")
    : context.geometry(new T.SphereGeometry(0.5, 24, 16));
  pearlGeometry.computeBoundingSphere();
  const pearlSize = 0.55 / Math.max(0.01, pearlGeometry.boundingSphere?.radius ?? 0.5);
  const pearlMaterial = context.material(new T.MeshPhysicalMaterial({
    color: "#fff7ee", roughness: 0.18, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12,
    iridescence: 0.55, iridescenceIOR: 1.35, sheen: 0.4, sheenColor: new T.Color("#ffe3ef"),
  }));
  const ringGeometry = context.geometry(new T.TorusGeometry(0.95, 0.045, 8, 48));
  const petalMaterial = context.material(new T.MeshPhysicalMaterial({
    color: "#ffffff", roughness: 0.5, sheen: 0.6, sheenColor: new T.Color("#ffe8ef"), side: T.DoubleSide,
  }));

  for (const place of TV_BUBBLE_PLACES) {
    const district = context.districts.get(place);
    if (!district) continue;
    buildTvLotuses(context, district, place);
    const random = seededRandom(5101 + district.index);
    const group = new T.Group();
    group.name = `TV foreground ${place}`;
    group.userData.dynamic = true;
    district.layout.add(group);

    // Two more falls off the island's back edge, either side of the two it has.
    const R = district.radius;
    for (const angle of [-0.75, 0.8]) {
      const height = Math.max(5.6, district.zone.center[1] + 5.3);
      context.waterfall(district.layout, Math.sin(angle) * (R - 0.6), -Math.cos(angle) * (R - 0.6), height, 2.6, -angle * 0.6);
    }

    // Ringed pearls: each a pearl in its own tilted gold ring, bobbing round the far rim.
    const pearls = context.instance(group, pearlGeometry, pearlMaterial, TV_PEARLS, false);
    const rings = context.instance(group, ringGeometry, context.palette.gold, TV_PEARLS, false);
    pearls.name = `TV ringed pearls ${place}`; rings.name = `TV pearl rings ${place}`;
    pearls.frustumCulled = rings.frustumCulled = false;
    const pearlSites = Array.from({ length: TV_PEARLS }, (_, i) => {
      // The far half and the two sides (layout +z faces the tour eye), never the near rim.
      const angle = Math.PI * (-0.1 + (1.2 * i) / (TV_PEARLS - 1)) + (random() - 0.5) * 0.15;
      return {
        x: Math.cos(angle) * (R + 1.5), z: -Math.sin(angle) * (R + 1.5),
        y: 3 + random() * 5, phase: random() * Math.PI * 2, scale: 0.8 + random() * 0.6, tilt: (random() - 0.5) * 1.2,
        // Built once, so the per frame pose allocates nothing.
        pearl: [0, 0, 0], ring: [0, 0, 0],
      };
    });
    pearlSites.forEach((site) => {
      site.pearl.fill(site.scale * pearlSize);
      site.ring.fill(site.scale);
    });
    const place3 = new T.Vector3(), euler = new T.Euler();
    const pose = (time: number) => {
      pearlSites.forEach((site, i) => {
        place3.set(site.x, site.y + Math.sin(time * 0.5 + site.phase) * 0.45, site.z);
        context.stamp(pearls, i, place3, site.pearl, euler.set(0, 0, 0));
        context.stamp(rings, i, place3, site.ring, euler.set(1.2 + site.tilt, time * 0.2 + site.phase, site.tilt));
      });
      pearls.instanceMatrix.needsUpdate = true;
      rings.instanceMatrix.needsUpdate = true;
    };

    // Drifting petals: pastel, falling slowly in a wide swirl round the island, wrapping at the water.
    const petals = context.instance(group, context.farPetal, petalMaterial, TV_PETALS, false);
    petals.name = `TV drifting petals ${place}`;
    petals.frustumCulled = false;
    const petalSites = Array.from({ length: TV_PETALS }, (_, i) => ({
      // The far half only (layout -z), behind the bubbles from the tour eye, so no petal
      // ever drifts across the words being read.
      radius: 3 + random() * (R - 1), angle: 0.15 * Math.PI + random() * 0.7 * Math.PI, top: 6 + random() * 10,
      speed: 0.25 + random() * 0.35, spin: random() * 6, size: 0.2 + random() * 0.16, color: PETAL_COLORS[i % PETAL_COLORS.length],
      scale: [0, 0, 0],
    }));
    petalSites.forEach((site) => site.scale.fill(site.size));
    petalSites.forEach((site, i) => petals.setColorAt(i, new T.Color(site.color)));
    const drift = (time: number) => {
      petalSites.forEach((site, i) => {
        const fall = (time * site.speed + site.spin) % site.top;
        const a = site.angle + Math.sin(time * 0.05 + site.spin) * 0.25;
        place3.set(Math.cos(a) * site.radius, site.top + 0.8 - fall, -Math.sin(a) * site.radius);
        context.stamp(petals, i, place3, site.scale, euler.set(time * 0.7 + site.spin, time * 0.5 + i, site.spin));
      });
      petals.instanceMatrix.needsUpdate = true;
    };
    const motion = (time: number) => { pose(time); drift(time); };
    motion(0);
    context.finish(pearls); context.finish(rings); context.finish(petals);
    handles.push({
      update: (time) => motion(time),
      setEffects: (sparkles) => { petals.visible = sparkles; },
    });
  }
  return {
    update: (time, zone, arrival) => handles.forEach((handle) => handle.update?.(time, zone, arrival)),
    setEffects: (sparkles, trails) => handles.forEach((handle) => handle.setEffects?.(sparkles, trails)),
    dispose: () => handles.forEach((handle) => handle.dispose?.()),
  };
}

/**
 * Pearl white stone, gold filigree and pastel blossom: the TV page's palette on the study's
 * own shared materials, so every district and every kit piece mapped onto them follows.
 */
export function applyTvPalette(palette: DesignKitContext["palette"]) {
  const set = (material: T.Material, color: string) => {
    if ("color" in material && material.color instanceof T.Color) material.color.set(color);
  };
  set(palette.stone, "#fbf2ec");
  set(palette.edge, "#f8ece6");
  set(palette.lawn, "#cfe4bd");
  set(palette.leaf, "#a8cfa3");
  set(palette.cotton, "#ffd9e6");
  const gold = palette.gold as T.MeshStandardMaterial;
  if (gold.isMeshStandardMaterial) {
    gold.color.set("#f0cd86");
    gold.roughness = 0.2;
  }
}

/*
 * The lotuses. Built once per place, in its layout frame, as one mesh per shared study material
 * (ivory basin, gold rim and stem, water, leaf pads, blossom petals), so the static batch
 * folds them into the district's own draws.
 */
const UP = new T.Vector3(0, 1, 0);
/** One petal: an almond, its base at the origin, pointing along +z; blush at the base, white at the tip. */
function petal(length: number, width: number, lean: number, turn: number, lift: number, base: T.Color, tip: T.Color) {
  const g = new T.SphereGeometry(1, 14, 8);
  g.scale(width, 0.07, length);
  g.translate(0, 0, length);
  const position = g.getAttribute("position");
  const colors = new Float32Array(position.count * 3), color = new T.Color();
  for (let i = 0; i < position.count; i++) {
    color.copy(base).lerp(tip, Math.min(1, position.getZ(i) / (2 * length)));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  g.setAttribute("color", new T.BufferAttribute(colors, 3));
  g.rotateX(-lean);
  g.rotateY(turn);
  g.translate(0, lift, 0);
  return g;
}
/** A lotus in bloom, about 1.2 across at scale 1: two rings of petals round a gold seed pod. */
function lotus(at: T.Vector3, scale: number, turn: number, petals: T.BufferGeometry[], gold: T.BufferGeometry[]) {
  const blush = new T.Color("#f3a9c4"), white = new T.Color("#fff6f8"), inner = new T.Color("#f7c3d4");
  const parts: T.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) parts.push(petal(0.3, 0.2, 0.42, turn + (i / 8) * Math.PI * 2, 0, blush, white));
  for (let i = 0; i < 6; i++) parts.push(petal(0.23, 0.16, 0.95, turn + ((i + 0.5) / 6) * Math.PI * 2, 0.04, inner, white));
  for (const part of parts) { part.scale(scale, scale, scale); part.translate(at.x, at.y, at.z); petals.push(part); }
  const pod = new T.CylinderGeometry(0.13, 0.1, 0.12, 18);
  pod.scale(scale, scale, scale); pod.translate(at.x, at.y + 0.1 * scale, at.z);
  gold.push(pod);
}
/** An ivory basin with a gold rim, its water and three lily pads; returns where its water is. */
function basin(at: T.Vector3, radius: number, height: number, ivory: T.BufferGeometry[], gold: T.BufferGeometry[], water: T.BufferGeometry[], leaves: T.BufferGeometry[], seed: number) {
  const profile = [[0.84, 0], [1, 0.16], [1, 0.84], [0.97, 1], [0.9, 1], [0.88, 0.8]].map(([r, y]) => new T.Vector2(r * radius, y * height));
  const wall = new T.LatheGeometry(profile, 56);
  wall.translate(at.x, at.y, at.z);
  ivory.push(wall);
  const rim = new T.TorusGeometry(radius * 0.935, 0.045, 8, 72);
  rim.rotateX(Math.PI / 2); rim.translate(at.x, at.y + height, at.z);
  gold.push(rim);
  const surface = new T.CircleGeometry(radius * 0.885, 48);
  surface.rotateX(-Math.PI / 2); surface.translate(at.x, at.y + height * 0.8, at.z);
  water.push(surface);
  padsOn(new T.Vector3(at.x, at.y + height * 0.8 + 0.01, at.z), radius * 0.6, radius * 0.2, leaves, seed);
  return at.y + height * 0.8;
}
/** Three lily pads round a point on the water. */
function padsOn(at: T.Vector3, reach: number, size: number, leaves: T.BufferGeometry[], seed: number) {
  const random = seededRandom(seed);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + random() * 0.8;
    const pad = new T.CylinderGeometry(size, size, 0.02, 22, 1, false, 0.3, Math.PI * 2 - 0.6);
    pad.rotateY(random() * Math.PI * 2);
    pad.translate(at.x + Math.cos(a) * reach, at.y, at.z + Math.sin(a) * reach);
    leaves.push(pad);
  }
}
/**
 * A place's two lotuses and the main bubble's stem: from the main lotus's seed pod a gold stem
 * rises, then curves in under the bubble, where a gold calyx of six sepals cradles it.
 */
export function buildTvLotuses(context: DesignKitContext, district: DesignKitDistrict, place: ZoneId) {
  const spots = TV_PLACES[place], zone = zoneOf(place), world = tvPlaceWorld(place);
  const ivory: T.BufferGeometry[] = [], gold: T.BufferGeometry[] = [], water: T.BufferGeometry[] = [], leaves: T.BufferGeometry[] = [], petals: T.BufferGeometry[] = [];
  const stand = (x: number, z: number, onWater: boolean | undefined, size: { radius: number; height: number }, scale: number, seed: number) => {
    const at = new T.Vector3(x, TV_TERRACE_TOP, z);
    let top = TV_WATER_TOP;
    if (onWater) padsOn(new T.Vector3(x, TV_WATER_TOP + 0.01, z), size.radius * 0.7, size.radius * 0.22, leaves, seed);
    else top = basin(at, size.radius, size.height, ivory, gold, water, leaves, seed);
    const flower = new T.Vector3(x, top + 0.02, z);
    lotus(flower, scale, seed * 0.37, petals, gold);
    return flower;
  };
  const main = stand(spots.lotus[0], spots.lotus[1], spots.onWater?.main, TV_BASIN.main, 1.55, district.index * 7 + 1);
  if (!spots.flowBud) {
    const flowAt = worldToLayout(zone, world.flow.lotus);
    stand(flowAt.x, flowAt.z, spots.onWater?.flow, TV_BASIN.flow, 1.1, district.index * 7 + 4);
  }
  // The stem: up from the seed pod, then over to the calyx under the bubble.
  const [cx, cy, cz] = spots.main;
  const calyx = new T.Vector3(cx, cy - TV_MAIN_RADIUS * 0.96, cz);
  const from = main.clone().add(new T.Vector3(0, 0.16, 0));
  const climb = calyx.y - from.y;
  const stem = new T.CubicBezierCurve3(from, from.clone().addScaledVector(UP, climb * 0.55), calyx.clone().addScaledVector(UP, -climb * 0.3), calyx);
  gold.push(new T.TubeGeometry(stem, 48, 0.085, 10, false));
  const cup = new T.TorusGeometry(TV_MAIN_RADIUS * 0.28, 0.07, 8, 56);
  cup.rotateX(Math.PI / 2); cup.translate(calyx.x, calyx.y + 0.06, calyx.z);
  gold.push(cup);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const sepal = new T.SphereGeometry(1, 10, 8);
    sepal.scale(0.13, 0.5, 0.05);
    sepal.translate(0, 0.42, 0);
    sepal.rotateX(0.62);
    sepal.rotateY(a);
    sepal.translate(calyx.x + Math.sin(a) * TV_MAIN_RADIUS * 0.27, calyx.y, calyx.z + Math.cos(a) * TV_MAIN_RADIUS * 0.27);
    gold.push(sepal);
  }
  const add = (parts: T.BufferGeometry[], material: T.Material, name: string) => {
    if (!parts.length) return;
    // One attribute set for the merge: the lathe, circle and tube carry uvs like the rest.
    const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)), false);
    parts.forEach((part) => part.dispose());
    if (!merged) return;
    const mesh = context.mesh(district.layout, context.geometry(merged), material);
    mesh.name = `TV lotus ${name} ${place}`;
    mesh.castShadow = name !== "water";
  };
  add(ivory, context.palette.ivory, "basin");
  add(gold, context.palette.gold, "gold");
  add(water, context.palette.water, "water");
  add(leaves, context.palette.leaf, "pads");
  add(petals, context.palette.bloom, "petals");
}
