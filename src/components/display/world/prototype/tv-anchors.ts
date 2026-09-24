import * as T from "three";
import { ZONES, type WorldZone, type ZoneId } from "../world-data";
import { studyCanopyPuffs } from "./study-canopy";
import { TV_FOV } from "./tv-bubbles";

/*
 * Where the TV page's recognition bubbles live (PLAN-01 Section 5, step 5, redone after
 * Anthony's review of 2026-09-24: "They're just put randomly and cover everything. They aren't
 * even connected to the 3d world scenes").
 *
 * Every bubble now rests on something real in its place, at the world's own designed spots:
 * the main bubble at the place's hero spot (for the Garden, over the pond, held up by a gold
 * stem from the lotus), the others on the rose bed, hanging from an arch, on a tree crown, on
 * a lantern, over a lily pad, or on a bridge rail. Each keeps a natural size in the world; the
 * camera flies close to the main bubble to read it (`tvReadingPose`).
 *
 * Anthony's choices (2026-09-24): bubbles on things in the scene; one big and three or four
 * small in view; the camera flies close to read; the Garden first.
 *
 * Coordinates are in a district's layout frame, exactly as the design world builds it
 * (`design-world.ts`): origin at the zone centre, turned by `facing` so +z points at the tour
 * eye and +x to its right; y is height above the zone centre.
 */

export type TvAnchorKind = "lotus" | "flowers" | "arch" | "crown" | "bench" | "lantern" | "pad" | "rail";
export type TvAnchorRole = "main" | "second" | "small";
export type TvAnchor = {
  role: TvAnchorRole;
  kind: TvAnchorKind;
  /** What the bubble rests on, in plain words. */
  on: string;
  /** The bubble's centre. */
  centre: readonly [number, number, number];
  radius: number;
  /** Where its tie to the scene starts: a stem's base, a chain's hook, or the resting point. */
  from: readonly [number, number, number];
  /** In the place's tour view as the camera arrives; the others show as the camera moves. */
  inView: boolean;
};

/** Top of a procedural blossom tree's cotton crown, layout frame (design-world `tree()`). */
export function studyCrownTop(x: number, z: number, size: number, seed: number): [number, number, number] {
  let best = { x: 0, y: -Infinity, z: 0 };
  for (const puff of studyCanopyPuffs(seed + 73)) {
    const top = puff.y + puff.r * puff.squash;
    if (top > best.y) best = { x: puff.x, y: top, z: puff.z };
  }
  return [x + best.x * size, 0.7 + best.y * size, z + best.z * size];
}

/**
 * The height of a procedural tree's cotton crown at a point (x, z), layout frame: the highest
 * puff surface above it (each puff an ellipsoid squashed in y), or -Infinity off the crown.
 */
export function studyCrownSurface(treeX: number, treeZ: number, size: number, seed: number, x: number, z: number) {
  let best = -Infinity;
  for (const puff of studyCanopyPuffs(seed + 73)) {
    const r = puff.r * size;
    const d = Math.hypot(x - (treeX + puff.x * size), z - (treeZ + puff.z * size));
    if (d < r) best = Math.max(best, 0.7 + puff.y * size + puff.r * puff.squash * size * Math.sqrt(1 - (d / r) ** 2));
  }
  return best;
}
/** The four procedural blossom trees of a large district, layout frame (design-world `tree()`). */
export const STUDY_LARGE_TREES = [
  { x: -12.4, z: -2.8, size: 1.16, seed: 900 },
  { x: 12.3, z: -6.9, size: 1.1, seed: 980 },
  { x: -9.4, z: -11.5, size: 0.91, seed: 1220 },
  { x: 14.1, z: 6.3, size: 0.94, seed: 1290 },
] as const;

/** A bubble of radius `r` resting on a point, sunk a little into what it rests on. */
const restingOn = (point: readonly [number, number, number], r: number, sink = 0.25): [number, number, number] =>
  [point[0], point[1] + r - sink, point[2]];

/*
 * The Garden of Kindness (design WORLD-INTEGRATION 6.5 and the Garden kit layout):
 * - pond centre (-0.6, 0.7, -0.6), radius 5.6; the lotus at (-3.5, 0.66, 1.0), scale 1.6,
 *   under the hero spot's lower left rim; lily pads at radius 4.6 round the pond;
 * - the hero spot (3, 7.3, 5), radius 4.4, kept clear by the layout test (6.2);
 * - the arch row at z -9.3, x -5.28, 0 and 5.28, heights 10.3, 11.5 and 10.3 (keystone
 *   underside 0.31 below the top); roses on the left bed round (-10.5, 1);
 * - procedural trees (-12.4, -2.8) 1.16, (12.3, -6.9) 1.10, (-9.4, -11.5) 0.91 and
 *   (14.1, 6.3) 0.94, seeds 900, 980, 1220 and 1290;
 * - benches at (-5.8, 9.6) and (9.3, 6.8), seat about 1.3 up (kit file 1.02 tall at scale 1.35);
 *   the right lantern post at (14, 5) stands inside the front right tree's crown, so no bubble
 *   rests on it.
 */
const GARDEN_ARCH_UNDERSIDE = 0.65 + 10.3 - 0.31;
/** The right bench's seat: the kit bench is 1.02 tall to its back, seat about .45, at scale 1.35. */
const GARDEN_BENCH_SEAT = 0.7 + 0.45 * 1.35;
/** On the back right tree's crown, a step right of its top so it stands clear of the main bubble. */
const gardenCrownSpot: [number, number, number] = (() => {
  const top = studyCrownTop(12.3, -6.9, 1.1, 980);
  const x = top[0] + 1.5, z = top[2];
  return [x, studyCrownSurface(12.3, -6.9, 1.1, 980, x, z), z];
})();
const pond = [-0.6, 0.71, -0.6] as const;
const pad = (degrees: number): [number, number, number] => {
  const a = (degrees * Math.PI) / 180;
  return [pond[0] + Math.cos(a) * 4.6, pond[1], pond[2] + Math.sin(a) * 4.6];
};
const gardenPadBackRight = pad(310), gardenPadRight = pad(350);

export const TV_ANCHORS: Partial<Record<ZoneId, readonly TvAnchor[]>> = {
  garden: [
    {
      role: "main", kind: "lotus", on: "the pond, held up by a gold stem from the lotus",
      centre: [3, 7.3, 5], radius: 4.4, from: [-3.5, 1.4, 1.0], inView: true,
    },
    {
      role: "second", kind: "flowers", on: "a stem rising from the left rose bed",
      centre: [-9.4, 7.4, 4.0], radius: 2.0, from: [-9.9, 2.2, 3.0], inView: true,
    },
    {
      // Hung a step in front of the arch, from its front face, so the columns never cut the words.
      role: "small", kind: "arch", on: "a gold chain from the left arch",
      centre: [-5.28, GARDEN_ARCH_UNDERSIDE - 0.55 - 2.05, -7.9], radius: 2.05,
      from: [-5.28, GARDEN_ARCH_UNDERSIDE, -8.95], inView: true,
    },
    {
      role: "small", kind: "crown", on: "the crown of the back right blossom tree",
      centre: restingOn(gardenCrownSpot, 2.0), radius: 2.0, from: gardenCrownSpot, inView: true,
    },
    {
      role: "small", kind: "bench", on: "the seat of the right bench, a kind word left there",
      centre: [9.3, GARDEN_BENCH_SEAT + 1.3 - 0.1, 6.8], radius: 1.3, from: [9.3, GARDEN_BENCH_SEAT, 6.8], inView: true,
    },
    {
      role: "small", kind: "arch", on: "a gold chain from the right arch",
      centre: [5.28, GARDEN_ARCH_UNDERSIDE - 0.55 - 2.0, -9.3], radius: 2.0,
      from: [5.28, GARDEN_ARCH_UNDERSIDE, -9.3], inView: false,
    },
    {
      role: "small", kind: "pad", on: "a lily pad at the back of the pond",
      centre: [gardenPadBackRight[0], gardenPadBackRight[1] + 0.45 + 1.3, gardenPadBackRight[2]], radius: 1.3,
      from: [gardenPadBackRight[0], gardenPadBackRight[1] + 0.05, gardenPadBackRight[2]], inView: false,
    },
    {
      role: "small", kind: "pad", on: "a lily pad at the right of the pond",
      centre: [gardenPadRight[0], gardenPadRight[1] + 0.45 + 1.2, gardenPadRight[2]], radius: 1.2,
      from: [gardenPadRight[0], gardenPadRight[1] + 0.05, gardenPadRight[2]], inView: false,
    },
  ],
};

/** The places whose bubbles are anchored so far: the Garden first (step 10). */
export const TV_ANCHORED_PLACES = Object.keys(TV_ANCHORS) as ZoneId[];

/** The turn of a district's layout frame, as `design-world.ts` computes it. */
export function districtFacing(zone: Pick<WorldZone, "center" | "eye">) {
  return Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
}
const UP = new T.Vector3(0, 1, 0);
/** A layout frame point in world space. */
export function layoutToWorld(zone: Pick<WorldZone, "center" | "eye">, point: readonly [number, number, number], out = new T.Vector3()) {
  return out.set(point[0], point[1], point[2]).applyAxisAngle(UP, districtFacing(zone)).add(new T.Vector3(...zone.center));
}
/** An anchor in world space. */
export function tvAnchorWorld(zone: Pick<WorldZone, "center" | "eye">, anchor: TvAnchor) {
  return { centre: layoutToWorld(zone, anchor.centre), from: layoutToWorld(zone, anchor.from), radius: anchor.radius };
}

/*
 * The bridges, exactly as `design-world.ts` builds them (connections, ends and the Catmull
 * curve), so bubbles can rest on their gold rails. Pure, so the tests can use it too.
 */
export type StudyBridge = { from: ZoneId; to: ZoneId; curve: T.CatmullRomCurve3 };
export function studyBridges(): StudyBridge[] {
  const connections: Array<[ZoneId, ZoneId]> = [["garden", "heart"], ["heart", "expressions"], ["garden", "expressions"]];
  const connected = new Set<ZoneId>(["garden", "heart", "expressions"]);
  while (connected.size < ZONES.length) {
    let best: [ZoneId, ZoneId] | undefined, distance = Infinity;
    for (const from of ZONES.filter((z) => connected.has(z.id))) for (const to of ZONES.filter((z) => !connected.has(z.id))) {
      const d = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
      if (d < distance) { distance = d; best = [from.id, to.id]; }
    }
    if (!best) break;
    connections.push(best); connected.add(best[1]);
  }
  return connections.map(([fromId, toId], i) => {
    const from = ZONES.find((z) => z.id === fromId)!, to = ZONES.find((z) => z.id === toId)!;
    const a = new T.Vector3(...from.center).add(new T.Vector3(0, 0.6, 0)), b = new T.Vector3(...to.center).add(new T.Vector3(0, 0.6, 0));
    const direction = b.clone().sub(a); direction.y = 0; direction.normalize();
    a.addScaledVector(direction, ZONES.indexOf(from) < 3 ? 16.2 : 12.2);
    b.addScaledVector(direction, ZONES.indexOf(to) < 3 ? -16.2 : -12.2);
    const mid = a.clone().lerp(b, 0.5); mid.y += 2.4; mid.x += (i % 2 ? 1 : -1) * 4;
    return { from: fromId, to: toId, curve: new T.CatmullRomCurve3([a, mid, b]) };
  });
}

/** Bridge bubbles near each anchored place: two per bridge, one on each rail, resting on the gold. */
export const TV_BRIDGE_RADIUS = 1.2;
export function tvBridgeAnchors(places: readonly ZoneId[] = TV_ANCHORED_PLACES) {
  const out: Array<{ bridge: string; centre: T.Vector3; from: T.Vector3; radius: number }> = [];
  for (const bridge of studyBridges()) {
    const near = places.includes(bridge.from) ? "from" : places.includes(bridge.to) ? "to" : null;
    if (!near) continue;
    [0.22, 0.42].forEach((along, k) => {
      const t = near === "from" ? along : 1 - along;
      const p = bridge.curve.getPoint(t), tangent = bridge.curve.getTangent(t);
      const side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
      const rail = p.clone().addScaledVector(side, 2.15 * (k ? 1 : -1)).add(new T.Vector3(0, 0.22 + 0.045, 0));
      out.push({ bridge: `${bridge.from}-${bridge.to}`, from: rail, centre: rail.clone().add(new T.Vector3(0, TV_BRIDGE_RADIUS - 0.1, 0)), radius: TV_BRIDGE_RADIUS });
    });
  }
  return out;
}

/*
 * Reading close up (Anthony: "the camera flies close"). The camera glides from the place's
 * tour arc to a pose in front of the main bubble, where the bubble is about 780 px tall on a
 * 1080 line screen and sits a little right of centre, so what holds it (the lotus, the pond)
 * shows to its left. It holds there for the message, then pulls back to show the place.
 */
export const TV_READ_DIAMETER = 780;
/** Where the bubble's centre sits across the screen in the reading pose, NDC. */
export const TV_READ_ACROSS = 0.28;
/**
 * On arrival the whole place shows for `TV_FOCUS_DELAY` seconds, then the camera glides in over
 * `TV_FOCUS_IN`, reads, and pulls back out over `TV_FOCUS_OUT`; all three are added to the hold.
 */
export const TV_FOCUS_DELAY = 2;
export const TV_FOCUS_IN = 2.5;
export const TV_FOCUS_OUT = 2.5;

/** The reading pose for a bubble, seen from the side the camera is on now. */
export function tvReadingPose(
  centre: T.Vector3,
  radius: number,
  from: T.Vector3,
  aspect = 16 / 9,
  out = { eye: new T.Vector3(), target: new T.Vector3() },
) {
  const tan = Math.tan((TV_FOV * Math.PI) / 360);
  const distance = radius / (tan * (TV_READ_DIAMETER / 1080));
  const back = new T.Vector3().copy(from).sub(centre);
  // A gentle look down, whatever the tour camera's height, so the pose never dives or climbs.
  back.y = Math.max(0.12, Math.min(0.3, back.y / Math.max(1e-6, Math.hypot(back.x, back.z)))) * Math.hypot(back.x, back.z);
  back.normalize();
  out.eye.copy(centre).addScaledVector(back, distance);
  const forward = centre.clone().sub(out.eye).normalize();
  const right = forward.clone().cross(UP).normalize();
  out.target.copy(centre).addScaledVector(right, -distance * TV_READ_ACROSS * tan * aspect);
  return out;
}

/** How far the camera has glided in to read: 0 on the tour arc, 1 in the reading pose. */
export function tvFocusWeight(age: number, hold: number, still: boolean) {
  if (still) return age >= TV_FOCUS_DELAY && age < hold ? 1 : 0;
  const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
  return smooth((age - TV_FOCUS_DELAY) / TV_FOCUS_IN) * (1 - smooth((age - (hold - TV_FOCUS_OUT)) / TV_FOCUS_OUT));
}

/**
 * The tie between a bubble and what it rests on, in world space: a gold stem with a calyx
 * cradling the bubble (lotus, flowers, lantern, lily pad), a gold chain from an arch, or a
 * calyx ring where it sits on a tree crown or a bridge rail. The caller owns the returned
 * geometries and disposes them; the material is shared.
 */
export function buildTvTether(kind: TvAnchorKind, from: T.Vector3, centre: T.Vector3, radius: number, gold: T.Material) {
  const group = new T.Group();
  group.name = `tv tether ${kind}`;
  const geometries: T.BufferGeometry[] = [];
  const add = (geometry: T.BufferGeometry, at?: T.Vector3, turn?: T.Euler) => {
    geometries.push(geometry);
    const mesh = new T.Mesh(geometry, gold);
    if (at) mesh.position.copy(at);
    if (turn) mesh.rotation.copy(turn);
    mesh.castShadow = false;
    group.add(mesh);
    return mesh;
  };
  const flat = new T.Euler(Math.PI / 2, 0, 0);
  const bottom = centre.clone().add(new T.Vector3(0, -radius * 0.96, 0));
  const top = centre.clone().add(new T.Vector3(0, radius * 0.96, 0));
  if (kind === "arch") {
    // A fine chain from the arch's keystone to the top of the bubble, with three pearls on it.
    add(new T.TubeGeometry(new T.LineCurve3(from, top), 8, 0.05, 6, false));
    for (const t of [0.25, 0.5, 0.75]) add(new T.SphereGeometry(0.09, 10, 8), from.clone().lerp(top, t));
    add(new T.TorusGeometry(0.22, 0.04, 6, 24), top.clone().add(new T.Vector3(0, 0.12, 0)));
  } else if (kind === "crown" || kind === "rail" || kind === "bench") {
    // A gold calyx where the bubble rests.
    add(new T.TorusGeometry(radius * 0.42, Math.max(0.04, radius * 0.03), 8, 40), bottom.clone().add(new T.Vector3(0, 0.12, 0)), flat);
  } else {
    // A stem that rises from what holds the bubble and bends to cradle it from below.
    const bend = new T.Vector3(from.x, from.y + (bottom.y - from.y) * 0.62, from.z);
    const curve = new T.QuadraticBezierCurve3(from, bend, bottom);
    const thick = kind === "lotus" ? 0.1 : 0.07;
    add(new T.TubeGeometry(curve, 36, thick, 8, false));
    add(new T.TorusGeometry(radius * 0.3, thick * 0.9, 8, 40), bottom.clone().add(new T.Vector3(0, 0.05, 0)), flat);
    add(new T.SphereGeometry(thick * 2.2, 12, 10), bottom);
  }
  return { group, geometries };
}
