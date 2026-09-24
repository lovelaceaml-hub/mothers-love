import { RECOGNITION_ZONES, ZONES, type ZoneId } from "../world-data";
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
export function onTiltedRing(radius: number, angle: number, tilt: [number, number], rotationY: number, center: [number, number, number]): [number, number, number] {
  let x = Math.cos(angle) * radius, y = 0, z = Math.sin(angle) * radius;
  const [tx, tz] = tilt;
  [x, y] = [x * Math.cos(tz) - y * Math.sin(tz), x * Math.sin(tz) + y * Math.cos(tz)];
  [x, z] = [x * Math.cos(rotationY) + z * Math.sin(rotationY), -x * Math.sin(rotationY) + z * Math.cos(rotationY)];
  [y, z] = [y * Math.cos(tx) - z * Math.sin(tx), y * Math.sin(tx) + z * Math.cos(tx)];
  return [center[0] + x, center[1] + y, center[2] + z];
}

export const round = (value: number) => { const out = Math.round(value * 1000) / 1000; return out === 0 ? 0 : out; };
export const at = (x: number, y: number, z: number): [number, number, number] => [round(x), round(y), round(z)];
