import { RECOGNITION_ZONES, ZONES, seededRandom, type ZoneId } from "../world-data";
import type { KitAssetId } from "../kit/kit-manifest";
import { STUDY_SUN } from "./study-palette";

/**
 * The six far zones dressed with the 3D Studio kit (WORLD-INTEGRATION 6.11 to 6.16): the
 * Garden of Days, the Love Observatory, the Expression Cosmos, the Fountain of Kindness, the
 * River of Recognitions and the Peace Promise.
 *
 * Owned by lane K3b as pure tables. Lane K3a's district builder (`kit-districts.ts`) renders
 * them after both lanes merge, so nothing here touches Three.js or the DOM, and every number
 * is provable in a plain Node test (`tests/world/kit-layout-far.test.ts`).
 *
 * Frame (design 6.1): every position is in the zone's district local frame, the `layout`
 * group the design world builds: origin at `zone.center`, +y up, +z toward the tour camera,
 * +x to the viewer's right. The terrace top is at local y .7. The builder applies the design's
 * common replacements (6.3: kit arches in the arch row at z -9.3, the forecourt lantern posts
 * at (+-11.3, .7, 6), the bench at (-9.3, .7, -1), the bed roses) to every district itself;
 * these tables add only what each zone's own row in the design asks for, and every placement
 * below was checked against those common pieces, the procedural cotton trees at (-12.4, -2.8)
 * and (12.3, -6.9), the flower beds at (-10, 5) and (10.5, 5), and the waterfalls.
 *
 * Ids are the manifest's (`public/world-kit/v1/manifest.json`), which differ from the design's
 * shorthand in a few places: `nature.stepping-stones` is a set of six stones on a 4.8 unit
 * path, `nature.lily-pads` a cluster of six pads with one bud, `landmark.love-observatory` is
 * the design's observatory dome, `arrival.lotus-bloom` its lotus, `expression.0N-<name>` its
 * expression pieces. Where the design names an asset the studio did not author for that zone,
 * the borrowing is listed in `FAR_ZONE_BORROWED` with the design section that asks for it.
 */

/** Shared with lane K3a's `kit-layout-core.ts`: the same shape, defined structurally here. */
export type KitPlacementRole = "static" | "instanced" | "animated";
export type KitPlacement = {
  id: KitAssetId;
  /** District local, design 6.1. */
  position: [number, number, number];
  rotationY?: number;
  /** Uniform. Omitted means 1. */
  scale?: number;
  role?: KitPlacementRole;
  note?: string;
  /**
   * K3b extension, optional: a tilt about x then z applied before `rotationY`, for the cosmos
   * rings. A builder that ignores it draws the rings flat, which still reads as orbits.
   */
  tilt?: [number, number];
};
export type KeepOutSphere = { center: [number, number, number]; radius: number };
export type ZoneLayout = { zone: ZoneId; placements: KitPlacement[]; keepOut?: KeepOutSphere[] };

export const FAR_ZONE_IDS: readonly ZoneId[] = ["calendar", "status", "orbit", "milestone", "live-feed", "promise"];

/** The walkable terrace top of every district, local. */
export const TERRACE_Y = .7;
/** The wide terrace radius of the far districts (the first three zones are 17.8). */
export const FAR_ISLAND_RADIUS = 13.8;

/**
 * The reading spheres of design 6.2 for one zone, local: the hero pearl with its medallion
 * reach plus margin, and the two residents. Empty for a zone that shows no recognitions.
 */
export function readingKeepOut(zone: ZoneId): KeepOutSphere[] {
  if (!RECOGNITION_ZONES.includes(zone)) return [];
  const definition = ZONES.find(item => item.id === zone)!;
  const lift = definition.target[1] - definition.center[1];
  const side = zone === "heart" || zone === "peacemakers" ? 7 : 3;
  return [
    { center: [side, Math.max(lift + 3, 7.32), 5], radius: 7 },
    { center: [-10, lift + 6, 1], radius: 3.2 },
    { center: [11, lift + 9, -4], radius: 3 },
  ];
}

/**
 * Ids the design directs into a zone the studio manifest does not list them for. The layout
 * test accepts a placement only when the manifest authors the id for the zone, the id has no
 * zone list at all (the core and expression pieces), or the pair is listed here with its
 * reason; and it refuses an entry here the manifest already covers, so the list stays minimal.
 */
export const FAR_ZONE_BORROWED: ReadonlyArray<{ zone: ZoneId; id: KitAssetId; reason: string }> = [
  { zone: "calendar", id: "nature.stepping-stones", reason: "design 6.11: the days of the month are stepping stones" },
  { zone: "promise", id: "arrival.ribbon-portal", reason: "design 6.16: the ribbon portal is the promise sculpture" },
  { zone: "promise", id: "landmark.garden-bench", reason: "design 6.16: a bench facing the sculpture" },
];

/** The sun's azimuth in a district's local frame, from +z toward +x, so a piece can face it. */
export function localSunAzimuth(zone: ZoneId) {
  const definition = ZONES.find(item => item.id === zone)!;
  const facing = Math.atan2(definition.eye[0] - definition.center[0], definition.eye[2] - definition.center[2]);
  const [x, , z] = STUDY_SUN.direction;
  const localX = x * Math.cos(facing) - z * Math.sin(facing);
  const localZ = x * Math.sin(facing) + z * Math.cos(facing);
  return Math.atan2(localX, localZ);
}

/**
 * A point on a circle of `radius` in the xz plane about `center`, turned the way the builder
 * turns a cosmos ring: `object.rotation.set(tilt[0], rotationY, tilt[1])` in three's default
 * XYZ order, which is the legacy `rotation.set(k * .55, .4 + k * .37, 0)`. Three applies that
 * Euler as Rx(Ry(Rz(v))): the z tilt first, then the yaw, then the x tilt.
 */
function onTiltedRing(radius: number, angle: number, tilt: [number, number], rotationY: number, center: [number, number, number]): [number, number, number] {
  let x = Math.cos(angle) * radius, y = 0, z = Math.sin(angle) * radius;
  const [tx, tz] = tilt;
  [x, y] = [x * Math.cos(tz) - y * Math.sin(tz), x * Math.sin(tz) + y * Math.cos(tz)];
  [x, z] = [x * Math.cos(rotationY) + z * Math.sin(rotationY), -x * Math.sin(rotationY) + z * Math.cos(rotationY)];
  [y, z] = [y * Math.cos(tx) - z * Math.sin(tx), y * Math.sin(tx) + z * Math.cos(tx)];
  return [center[0] + x, center[1] + y, center[2] + z];
}

const round = (value: number) => { const out = Math.round(value * 1000) / 1000; return out === 0 ? 0 : out; };
const at = (x: number, y: number, z: number): [number, number, number] => [round(x), round(y), round(z)];

/* ------------------------------------------------------------------------------------------ */
/* 6.11 Garden of Days                                                                          */
/* ------------------------------------------------------------------------------------------ */

/** Seven columns, one per weekday, at this pitch; the rows are the weeks. */
export const CALENDAR_GRID = { columns: 7, rows: 5, pitchX: 2.3, pitchZ: 2.5, offsetZ: 1.4, days: 31 } as const;

/** The centre of day `index` (0 based) on the terrace. The last, partial row stays left aligned. */
export function calendarDayCell(index: number): [number, number, number] {
  const column = index % CALENDAR_GRID.columns, row = Math.floor(index / CALENDAR_GRID.columns);
  return at((column - 3) * CALENDAR_GRID.pitchX, TERRACE_Y, (row - 2) * CALENDAR_GRID.pitchZ + CALENDAR_GRID.offsetZ);
}

/**
 * Data driven dressing for the Garden of Days (design 6.11), from the public insights only:
 * one floating `core.pearl` over every day that had recognitions, sized by the count, and one
 * `core.flower` on that day's stone. Aggregate counts only, no personal content; the builder
 * clears them with the feed. The pearls bob on the world clock (role animated).
 */
export function calendarDayPlacements(calendar: ReadonlyArray<{ periodStart: string; recognitions: number }>): KitPlacement[] {
  const placements: KitPlacement[] = [];
  for (const day of calendar) {
    const index = Number(day.periodStart.slice(-2)) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= CALENDAR_GRID.days || day.recognitions <= 0) continue;
    const [x, , z] = calendarDayCell(index);
    placements.push({ id: "core.pearl", position: at(x, 2.5, z), scale: round(.55 + .07 * Math.min(5, day.recognitions)), role: "animated", note: `day ${index + 1}: ${day.recognitions} recognitions, bobs on the clock` });
    placements.push({ id: "core.flower", position: at(x, TERRACE_Y + .5, z), rotationY: round((index % 5) * 1.256), scale: .5, role: "instanced", note: `day ${index + 1} bloomed` });
  }
  return placements;
}

function calendarLayout(): ZoneLayout {
  const placements: KitPlacement[] = [];
  for (let index = 0; index < CALENDAR_GRID.days; index++) {
    const row = Math.floor(index / CALENDAR_GRID.columns);
    placements.push({
      id: "nature.stepping-stones", position: calendarDayCell(index),
      // Across the rows the sets stand on end, so the seven columns read as seven stone paths.
      rotationY: round(row % 2 ? -Math.PI / 2 : Math.PI / 2), scale: .48, role: "instanced",
      note: `day ${index + 1}${index === 0 ? "; the current day's set glows warm (studyGlow .12) at run time" : ""}`,
    });
  }
  // The border: four hydrangeas at the head of the grid, four on the lawns beside it.
  for (const x of [-6.9, -2.3, 2.3, 6.9]) placements.push({ id: "nature.hydrangea-bush", position: at(x, TERRACE_Y, -5.9), rotationY: round(x * .7), scale: 1.1, role: "instanced", note: "border, head of the calendar" });
  for (const side of [-1, 1]) for (const z of [2.6, -3.4]) placements.push({ id: "nature.hydrangea-bush", position: at(side * 9.8, TERRACE_Y, z), rotationY: round(side * z * .3), scale: 1, role: "instanced", note: "border, lawn side" });
  // A second bench mirrors the builder's common bench at (-9.3, .7, -1), so the pair flanks the grid.
  placements.push({ id: "landmark.garden-bench", position: at(9.3, TERRACE_Y, -1), rotationY: round(-Math.PI / 2), scale: 1.2, role: "static", note: "faces the calendar across from the common bench" });
  return { zone: "calendar", placements, keepOut: readingKeepOut("calendar") };
}

/* ------------------------------------------------------------------------------------------ */
/* 6.12 Love Observatory                                                                        */
/* ------------------------------------------------------------------------------------------ */

/** Nine columns on a ring of this radius, the front left open toward the camera. */
export const OBSERVATORY_RING = { radius: 9, firstDegrees: 150, stepDegrees: 30 } as const;
export const OBSERVATORY_COLUMN_HEIGHT = { least: 1.6, most: 4 } as const;
/** The kit column is 4 units tall; this is its uniform scale for a count against the largest. */
export function observatoryColumnScale(count: number, max: number) {
  const share = max > 0 ? Math.max(0, Math.min(1, count / max)) : 0;
  return round((OBSERVATORY_COLUMN_HEIGHT.least + (OBSERVATORY_COLUMN_HEIGHT.most - OBSERVATORY_COLUMN_HEIGHT.least) * share) / 4);
}
export function observatoryColumnCell(expression: number): [number, number, number] {
  const angle = (OBSERVATORY_RING.firstDegrees + (expression - 1) * OBSERVATORY_RING.stepDegrees) * Math.PI / 180;
  return at(Math.cos(angle) * OBSERVATORY_RING.radius, TERRACE_Y, Math.sin(angle) * OBSERVATORY_RING.radius);
}
/** The observatory turns its lens (authored at azimuth .518 to the right of its front) toward the sun. */
export function observatoryYaw() {
  return round(localSunAzimuth("status") - .518);
}

const EXPRESSION_PIECES: readonly KitAssetId[] = [
  "expression.01-hello-bubble", "expression.02-gift-box", "expression.03-mended-heart", "expression.04-comfort-cloud",
  "expression.05-open-door", "expression.06-teacup", "expression.07-candle", "expression.08-helping-hand", "expression.09-star",
];

function statusLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "landmark.love-observatory", position: at(0, .6, -4.5), rotationY: observatoryYaw(), scale: 1.32, role: "static", note: "9 tall; replaces the procedural glass globe and its ten rings; the lens faces the sun" },
  ];
  for (let expression = 1; expression <= 9; expression++) {
    const [x, , z] = observatoryColumnCell(expression);
    placements.push({ id: "landmark.pearl-column", position: at(x, TERRACE_Y, z), scale: 1, role: "static", note: `expression ${expression} column; height scales with insights.month.expressionCounts (observatoryColumnScale), eased at tau 1.2 s` });
    placements.push({ id: EXPRESSION_PIECES[expression - 1], position: at(x, TERRACE_Y + 4 + .75, z), rotationY: round(Math.atan2(-x, -z)), scale: .55, role: "animated", note: `caps expression ${expression} column, .75 above its top, turned to the centre` });
  }
  placements.push({ id: "nature.crystal-lavender", position: at(-3.4, TERRACE_Y, -.2), rotationY: .4, scale: 1.1, role: "instanced", note: "sparkle class" });
  placements.push({ id: "nature.crystal-blue", position: at(4.2, TERRACE_Y, -1.6), rotationY: -1.1, scale: .9, role: "instanced", note: "sparkle class" });
  placements.push({ id: "nature.crystal-blue", position: at(2.6, TERRACE_Y, .9), rotationY: 2.2, scale: .7, role: "instanced", note: "sparkle class" });
  for (const side of [-1, 1]) {
    placements.push({ id: "nature.blossom-tree-a", position: at(side * 12.6, TERRACE_Y, .2), rotationY: round(side * 1.3), scale: 1, role: "static" });
    placements.push({ id: "nature.hydrangea-bush", position: at(side * 8.8, TERRACE_Y, 6.4), rotationY: round(side * .5), scale: 1, role: "instanced" });
    placements.push({ id: "nature.hydrangea-bush", position: at(side * 11.6, TERRACE_Y, -2.4), rotationY: round(side * 1.9), scale: .9, role: "instanced" });
  }
  return { zone: "status", placements, keepOut: readingKeepOut("status") };
}

/* ------------------------------------------------------------------------------------------ */
/* 6.13 Expression Cosmos                                                                       */
/* ------------------------------------------------------------------------------------------ */

export const COSMOS_CENTER: [number, number, number] = [0, 7, 0];
/** The four rings, radii 5 to 7.1 like the procedural ones (the kit ring is radius 2.5). */
export const COSMOS_RINGS = [0, 1, 2, 3].map(k => ({ k, radius: round(5 + k * .7), scale: round((5 + k * .7) / 2.5), tilt: [round(k * .55), 0] as [number, number], rotationY: round(.4 + k * .37) }));
/**
 * The arc of ring `k` that lies behind the ring centre's plane, seen from the tour camera at
 * +z: with the yaw `b` and the x tilt `a`, a ring point at parameter `f` has local
 * z = radius * cos(a) * sin(f - b), so the deep back arc is where sin(f - b) is at most -.4.
 * The fourth ring stands nearly upright facing the camera (tilt 1.65) and has no back arc
 * worth the name, so the planets ride the first three.
 */
export function cosmosBackArc(k: number): { start: number; span: number } {
  const ring = COSMOS_RINGS[k];
  const inset = Math.asin(.4);
  return { start: ring.rotationY + Math.PI + inset, span: Math.PI - 2 * inset };
}
/**
 * Where planet `i` (0 to 8) rides at clock `t`: three per ring on the first three rings, on
 * the back arc only, swinging gently there. The pearl is read from the front, so no planet
 * ever crosses its words (`tests/world/kit-layout-far.test.ts` proves the cone).
 */
export function cosmosPlanetPose(i: number, t: number): { position: [number, number, number]; ring: number; angle: number } {
  const slot = i % 3, ring = Math.floor(i / 3);
  const arc = cosmosBackArc(ring), rate = .09 + ring * .015;
  const angle = arc.start + arc.span * (.15 + .35 * slot) + .22 * Math.sin(t * rate + slot * 2.1);
  const spec = COSMOS_RINGS[ring];
  return { position: onTiltedRing(spec.radius, angle, spec.tilt, spec.rotationY, COSMOS_CENTER), ring, angle };
}
/** The small pearls between the planets, on the same back arcs. */
export function cosmosPearlPose(i: number, t: number): [number, number, number] {
  const slot = i % 3, ring = Math.floor(i / 3);
  const arc = cosmosBackArc(ring);
  const angle = arc.start + arc.span * (.02 + .35 * slot) + .16 * Math.sin(t * (.11 + ring * .01) + slot);
  const spec = COSMOS_RINGS[ring];
  return onTiltedRing(spec.radius, angle, spec.tilt, spec.rotationY, COSMOS_CENTER);
}

function orbitLayout(): ZoneLayout {
  const placements: KitPlacement[] = [];
  for (const ring of COSMOS_RINGS) placements.push({
    id: "recognition.orbit-ring", position: [...COSMOS_CENTER], rotationY: ring.rotationY, tilt: ring.tilt, scale: ring.scale, role: "animated",
    note: `cosmos ring ${ring.k}, radius ${ring.radius}; encircles the hero pearl by design 6.13 (the D2 composition), exempt from the reading sphere; spins on the clock`,
  });
  for (let i = 0; i < 9; i++) {
    const pose = cosmosPlanetPose(i, 0);
    placements.push({ id: EXPRESSION_PIECES[i], position: pose.position.map(round) as [number, number, number], scale: .7, role: "animated", note: `planet on ring ${pose.ring}, back arc (cosmosPlanetPose); the selected expression moves to the centre at 1.1 as the sun` });
  }
  for (let i = 0; i < 9; i++) placements.push({ id: "core.pearl", position: cosmosPearlPose(i, 0).map(round) as [number, number, number], scale: .35, role: "animated", note: "between the planets (cosmosPearlPose)" });
  // Sculpted puffs 6 to 12 units under the island rim, among the study cloud collar.
  const rand = seededRandom(6130);
  const puffs: KitAssetId[] = ["nature.cloud-a", "nature.cloud-b", "nature.cloud-c"];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (rand() - .5) * .5, radius = 13 + rand() * 4;
    placements.push({ id: puffs[i % 3], position: at(Math.cos(angle) * radius, -6 - rand() * 6, Math.sin(angle) * radius), rotationY: round(rand() * Math.PI * 2), scale: round(1.2 + rand() * .6), role: "instanced", note: "under the rim" });
  }
  placements.push({ id: "nature.crystal-pink", position: at(8.5, TERRACE_Y, 7.5), rotationY: .3, scale: 1.3, role: "instanced", note: "sparkle class" });
  placements.push({ id: "nature.crystal-lavender", position: at(-8.5, TERRACE_Y, 7.5), rotationY: -.8, scale: 1.3, role: "instanced", note: "sparkle class" });
  placements.push({ id: "nature.crystal-pink", position: at(-7.2, TERRACE_Y, 9.6), rotationY: 1.9, scale: 1, role: "instanced", note: "sparkle class" });
  return { zone: "orbit", placements, keepOut: readingKeepOut("orbit") };
}

/* ------------------------------------------------------------------------------------------ */
/* 6.14 Fountain of Kindness                                                                    */
/* ------------------------------------------------------------------------------------------ */

export const FOUNTAIN_PEARLS = 65;
/**
 * Pearl `i` on the helix at clock `t`, rising only as far as the week's progress (0 to 1 from
 * `insights.goal.value / target`): the fountain's height is the progress.
 */
export function fountainPearlPose(i: number, t: number, progress: number): [number, number, number] {
  const cap = .2 + .8 * Math.max(0, Math.min(1, progress));
  const u = (((i / FOUNTAIN_PEARLS + t * .013) % 1) + 1) % 1 * cap;
  const angle = i * 2.4 + t * .22, radius = 2 + u * 7;
  return at(Math.cos(angle) * radius, 1 + u * 18, Math.sin(angle) * radius);
}

function milestoneLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "landmark.fountain-of-kindness", position: at(0, .6, 0), scale: 3, role: "static", note: "12 tall; replaces the five procedural tiers and their five falls (the two back edge falls stay)" },
  ];
  for (let i = 0; i < FOUNTAIN_PEARLS; i++) placements.push({ id: "core.pearl", position: fountainPearlPose(i, 0, 1), scale: .45, role: "animated", note: i === 0 ? "helix pearl; rises with insights.goal progress (fountainPearlPose); 160 kit petals burst from the top once per visit when goal.achieved" : "helix pearl" });
  placements.push({ id: "landmark.pool-fountain", position: at(0, TERRACE_Y, 9.6), scale: 1.3, role: "static", note: "catches the overflow at the forecourt" });
  for (const side of [-1, 1]) placements.push({ id: "nature.crystal-blue", position: at(side * 8.2, TERRACE_Y, 6.6), rotationY: round(side * .9), scale: 1.2, role: "instanced", note: "sparkle class" });
  placements.push({ id: "nature.crystal-lavender", position: at(-9.4, TERRACE_Y, -4.2), rotationY: 2.4, scale: 1, role: "instanced", note: "sparkle class" });
  const rand = seededRandom(6140);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + .4 + (rand() - .5) * .5, radius = 14 + rand() * 3;
    placements.push({ id: "nature.cloud-b", position: at(Math.cos(angle) * radius, -5 - rand() * 6, Math.sin(angle) * radius), rotationY: round(rand() * Math.PI * 2), scale: round(1.1 + rand() * .6), role: "instanced", note: "under the rim" });
  }
  return { zone: "milestone", placements, keepOut: readingKeepOut("milestone") };
}

/* ------------------------------------------------------------------------------------------ */
/* 6.15 River of Recognitions                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** The canal across the island's front third: an ellipse of the study water at y .735, local. */
export const RIVER_CANAL = { center: [0, .735, 7.4] as [number, number, number], radiusX: 9.6, radiusZ: 3.2 };

function liveFeedLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "nature.stepping-stones", position: at(-8.4, .78, 7.2), rotationY: round(Math.PI / 2), scale: .75, role: "instanced", note: "crosses the canal on the left; the six procedural piers stay as stepping piers" },
    { id: "nature.lily-pads", position: at(-5.8, .75, 4.4), rotationY: .6, scale: .9, role: "instanced", note: "six pads with a bud" },
    { id: "nature.lily-pads", position: at(1.2, .75, 11.4), rotationY: -1.4, scale: .8, role: "instanced", note: "six pads with a bud" },
    { id: "arrival.lotus-bloom", position: at(-3, .76, 10), rotationY: .2, scale: 1.2, role: "animated", note: "scrubbed to 1 (open) while a recognition is read here, a bud otherwise; the newest recognition is the open flower" },
    { id: "nature.blossom-tree-b", position: at(-10.2, TERRACE_Y, -8.2), rotationY: .9, scale: 1, role: "static" },
    { id: "nature.blossom-tree-c", position: at(11.6, TERRACE_Y, .4), rotationY: -2.1, scale: .9, role: "static", note: "the smaller tree: the hero pearl's reading sphere reaches this side" },
  ];
  return { zone: "live-feed", placements, keepOut: readingKeepOut("live-feed") };
}

/* ------------------------------------------------------------------------------------------ */
/* 6.16 Peace Promise                                                                           */
/* ------------------------------------------------------------------------------------------ */

export const PROMISE_PORTAL = { position: [0, .6, -5] as [number, number, number], scale: 1.7, openingCenterKit: [0, 2.95, 0] as [number, number, number], clearOpeningKit: [3.21, 4.47] as [number, number] };
/** The two ribbon pieces inside the loop: their places, and the slow turn each makes on the clock. */
export const PROMISE_RIBBONS = [
  { position: [-1, 4.3, -4.6] as [number, number, number], yaw: .6, rate: .025 },
  { position: [1, 7.4, -5.4] as [number, number, number], yaw: -.5, rate: -.025 },
] as const;
export function promiseRibbonYaw(index: 0 | 1, t: number) {
  return PROMISE_RIBBONS[index].yaw + t * PROMISE_RIBBONS[index].rate;
}

/** Ten rose bushes on the two lawn arcs, clear of everything else on the island. Seeded, so stable. */
export function promiseRoses(): KitPlacement[] {
  const rand = seededRandom(6160);
  const taken: Array<[number, number, number]> = [
    [-10, 5, 2.4], [10.5, 5, 2.4], [-8, 4, 1.6], [8, 2, 1.3], [-9.3, -1, 1.6], [-11.3, 6, .9], [11.3, 6, .9],
    [-12.4, -2.8, 1.6], [12.3, -6.9, 1.6], [-8.6, 8.6, 1.4], [11.4, -1.5, 1.4], [-5.4, -1.2, 1.2], [5.4, -1.2, 1.2],
  ];
  const roses: KitPlacement[] = [];
  let guard = 0;
  while (roses.length < 10 && guard++ < 400) {
    const side = roses.length % 2 ? 1 : -1;
    const angle = (rand() - .5) * 1.1, radius = 8.3 + rand() * 2.6;
    const x = side * Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    if (x * x + z * z > 12.2 * 12.2) continue;
    if (taken.some(([tx, tz, clearance]) => Math.hypot(tx - x, tz - z) < clearance + .75)) continue;
    taken.push([x, z, .8]);
    roses.push({ id: "nature.rose-bush", position: at(x, TERRACE_Y, z), rotationY: round(rand() * Math.PI * 2), scale: round(.9 + rand() * .3), role: "instanced" });
  }
  return roses;
}

function promiseLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "arrival.ribbon-portal", position: PROMISE_PORTAL.position, scale: PROMISE_PORTAL.scale, role: "static", note: "the sculpture, about 10 tall; replaces the two procedural box slabs" },
    { id: "core.ribbon", position: PROMISE_RIBBONS[0].position, rotationY: PROMISE_RIBBONS[0].yaw, scale: 1.7, role: "animated", note: "inside the loop, low left; turns .025 rad a second (promiseRibbonYaw)" },
    { id: "core.ribbon", position: PROMISE_RIBBONS[1].position, rotationY: PROMISE_RIBBONS[1].yaw, scale: 1.7, role: "animated", note: "inside the loop, high right; turns the other way (promiseRibbonYaw)" },
    { id: "landmark.stone-tablet", position: at(8, TERRACE_Y, 2), scale: 1.3, role: "static", note: "blank, face toward the camera" },
    { id: "landmark.garden-bench", position: at(-8, TERRACE_Y, 4), rotationY: .6, scale: 1.3, role: "static", note: "faces the sculpture" },
    { id: "nature.blossom-tree-c", position: at(-8.6, TERRACE_Y, 8.6), rotationY: 2.3, scale: 1, role: "static" },
    { id: "nature.blossom-tree-a", position: at(11.4, TERRACE_Y, -1.5), rotationY: -.4, scale: 1.05, role: "static" },
    { id: "nature.crystal-pink", position: at(-5.4, TERRACE_Y, -1.2), rotationY: .7, scale: 1.2, role: "instanced", note: "at the sculpture's foot, sparkle class" },
    { id: "nature.crystal-pink", position: at(5.4, TERRACE_Y, -1.2), rotationY: -2.2, scale: 1.1, role: "instanced", note: "at the sculpture's foot, sparkle class" },
    ...promiseRoses(),
  ];
  return { zone: "promise", placements, keepOut: readingKeepOut("promise") };
}

/* ------------------------------------------------------------------------------------------ */

/** Pure and deterministic: two calls return deep equal tables. */
export function farZoneLayouts(): ZoneLayout[] {
  return [calendarLayout(), statusLayout(), orbitLayout(), milestoneLayout(), liveFeedLayout(), promiseLayout()];
}
export const FAR_ZONE_LAYOUTS: ZoneLayout[] = farZoneLayouts();

/**
 * The common replacements of design 6.3 for the six far districts, as the builder would place
 * them: forecourt lantern posts, the bench facing the pearl, roses along the lawn ring and
 * hydrangeas at the bed ends. `FAR_ZONE_LAYOUTS` assumes the builder applies these to every
 * district itself; merge this table in only if it does not.
 */
export function farZoneCommonLayouts(): ZoneLayout[] {
  return FAR_ZONE_IDS.map((zone, index) => {
    const rand = seededRandom(6300 + index * 7);
    const placements: KitPlacement[] = [];
    for (const side of [-1, 1]) placements.push({ id: "landmark.lantern-post", position: at(side * (FAR_ISLAND_RADIUS - 2.5), TERRACE_Y, 6), scale: 1.15, role: "instanced", note: "forecourt (design 6.3)" });
    placements.push({ id: "landmark.garden-bench", position: at(-FAR_ISLAND_RADIUS + 4.5, TERRACE_Y, -1), rotationY: round(Math.PI / 2), scale: 1.2, role: "static", note: "faces the pearl (design 6.3)" });
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1, angle = (rand() - .5) * 1.2, radius = 9.2 + rand() * 1.8;
      placements.push({ id: "nature.rose-bush", position: at(side * Math.cos(angle) * radius, TERRACE_Y, -Math.sin(angle) * radius - 2), rotationY: round(rand() * Math.PI * 2), scale: round(.9 + rand() * .3), role: "instanced", note: "lawn ring (design 6.3)" });
    }
    for (const side of [-1, 1]) for (const z of [-7.4, 7.4]) placements.push({ id: "nature.hydrangea-bush", position: at(side * 9.6, TERRACE_Y, z), rotationY: round(side * z * .1), scale: 1, role: "instanced", note: "bed end (design 6.3)" });
    return { zone, placements, keepOut: readingKeepOut(zone) };
  });
}

/**
 * What the builder does around the tables for each far zone (design 6.11 to 6.16): which
 * procedural landmark pieces in `district.landmark` it removes before the batch, the study
 * material features it builds itself, and the per frame work on the world clock.
 */
export const FAR_ZONE_DRESSING: ReadonlyArray<{ zone: ZoneId; remove: string; features: string[]; dynamic: string[] }> = [
  {
    zone: "calendar",
    remove: "the seven procedural ivory boxes at (k - 3) * 2.3 in the district root",
    features: [],
    dynamic: [
      "calendarDayPlacements(insights.calendar): a core.pearl bobbing sin(t * .5 + day) * .12 over each day with recognitions and a core.flower on its stones; rebuilt when the feed changes, cleared with the feed",
      "the current day's stone set glows warm (studyGlow .12) so the calendar reads at a glance",
    ],
  },
  {
    zone: "status",
    remove: "the procedural glass globe, five meridian rings and five latitude rings at (0, 7, 0)",
    features: [],
    dynamic: [
      "each column's y scale eases toward observatoryColumnScale(insights.month.expressionCounts[i], max) at tau 1.2 s; its piece rides .75 above the column top",
      "the pieces bob sin(t * .23 + i) * .15; the piece of scene.userData.studyExpression turns at .3 rad a second",
    ],
  },
  {
    zone: "orbit",
    remove: "the four procedural gold torus orbits at (0, 7, 0)",
    features: ["the procedural island lathe keel stays (the kit island base is not placed: it would interleave with the keel)"],
    dynamic: [
      "the four rings spin on the clock (the kit spin clip, or rotation about their tilted axis at .06 + k * .01 rad a second)",
      "planets follow cosmosPlanetPose(i, t), the pearls cosmosPearlPose(i, t); the selected expression (scene.userData.studyExpression) moves to COSMOS_CENTER at 1.1 scale with studyGlow .16 over a 2 s ease and the other eight keep orbiting",
    ],
  },
  {
    zone: "milestone",
    remove: "the five procedural cylinder tiers, their five rings and their five tier falls (context.removeFall); the two back edge falls stay",
    features: ["the procedural island lathe keel stays (the kit island base is not placed)"],
    dynamic: [
      "helix pearls follow fountainPearlPose(i, t, insights.goal.value / insights.goal.target)",
      "when insights.goal.achieved is true on arrival or flips true, 160 kit petals (the arrival petal geometry, instanced) burst from the fountain top over 4 s on the world clock and fade, trail class, once per visit",
    ],
  },
  {
    zone: "live-feed",
    remove: "nothing: the six procedural ivory drums stay as the stepping piers",
    features: ["RIVER_CANAL: an ellipse of the study water material (radiusX 9.6, radiusZ 3.2) at (0, .735, 7.4), the terrace's front third"],
    dynamic: ["arrival.lotus-bloom scrubbed to 1 while a recognition is being read in this zone, 0 otherwise, eased over 1.5 s on the clock"],
  },
  {
    zone: "promise",
    remove: "the two procedural ivory box slabs at (+-5, 1.45, 1) in the district root",
    features: [],
    dynamic: ["the two core.ribbon pieces turn about y at promiseRibbonYaw(index, t); they never touch and stay inside the loop (proved by the layout test)"],
  },
];
