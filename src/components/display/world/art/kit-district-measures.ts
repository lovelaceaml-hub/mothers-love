/** The district builder's tables, distances and record types (overview in kit-districts.ts). */
import * as T from "three";
import type { ArrivalState } from "../arrival-director";
import type { ZoneId } from "../world-data";
import { CORE_ZONE_LAYOUTS, type ZoneLayout } from "./kit-layout-core";
import { tvViewDistance } from "./study-budget";

/** Every near zone table the builder places. The six far zones render through applyKitFarZones in kit-far-zones.ts (coordinator ruling at integration, 2026-09-23), so each zone renders exactly once. */
export const KIT_ZONE_LAYOUTS: readonly ZoneLayout[] = [...CORE_ZONE_LAYOUTS];

/** Kit detail groups hide past this distance from their district centre (design 7.2). */
export const KIT_DETAIL_DISTANCE = { high: 140, auto: 110, low: 70 } as const;
/** People (static Plan 01 figures) hide beyond the neighbors' distance (design 7.5). */
export const KIT_NEAR_DISTANCE = 72;
/** A district shows its far merges once the camera is this far from its centre (with hysteresis). */
export const KIT_LOD_DISTANCE = { far: 42, near: 38 } as const;
/** Far merges are clustered this many times coarser than the near ones. */
export const KIT_FAR_CELL_FACTOR = 3;

/**
 * How far the people stay in view. The TV page raises them to `STUDY_TV_VIEW_DISTANCE` on the
 * High tier only: they are small at that range, and the TV page runs Auto, where every extra
 * figure costs frames the auto lower to Low (which is sticky) would take back from everything.
 * Auto and Low, and every page without `?view=tv`, keep `KIT_NEAR_DISTANCE`.
 */
export function kitPeopleDistance(tv: boolean, tier: "high" | "auto" | "low") {
  return tier === "high" ? tvViewDistance(KIT_NEAR_DISTANCE, tv) : KIT_NEAR_DISTANCE;
}

/**
 * Vertex clustering cell, kit units, per piece. From the tour eye a kit unit spans about 30
 * px at 1080p, so a cell of .05 is under two pixels; the clustered piece reads as the
 * authored one at a fraction of its triangles (measured: a rose bush 16k to 3k at .1, an
 * arch 17.5k to 4.6k at .07, the pavilion 46k to 24k at .05).
 */
export const KIT_CLUSTER_CELL: Readonly<Record<string, number>> = {
  "nature.rose-bush": 0.1,
  "nature.hydrangea-bush": 0.1,
  "nature.lily-pads": 0.1,
  "nature.stepping-stones": 0.07,
  "nature.blossom-tree-a": 0.1,
  "nature.blossom-tree-b": 0.1,
  "nature.blossom-tree-c": 0.1,
  "nature.crystal-pink": 0.05,
  "nature.crystal-lavender": 0.05,
  "nature.crystal-blue": 0.05,
  "landmark.pearl-arch": 0.07,
  "landmark.pearl-column": 0.05,
  "landmark.garden-bench": 0.05,
  "landmark.lantern-post": 0.05,
  "landmark.stone-tablet": 0.03,
  "landmark.pearl-stairs": 0.05,
  "landmark.pearl-pavilion-horseshoe": 0.05,
  "landmark.pearl-pavilion": 0.05,
  "landmark.gazebo-glass": 0.05,
  "landmark.peace-globe": 0.05,
  "landmark.filigree-railing": 0.05,
  "landmark.pool-fountain": 0.05,
  "arrival.butterfly-gate": 0.04,
  "core.heart": 0.07,
  "core.pearl": 0.07,
  "core.flower": 0.07,
  "expression.01-hello-bubble": 0.05,
  "expression.02-gift-box": 0.05,
  "expression.03-mended-heart": 0.05,
  "expression.04-comfort-cloud": 0.05,
  "expression.05-open-door": 0.05,
  "expression.06-teacup": 0.05,
  "expression.07-candle": 0.05,
  "expression.08-helping-hand": 0.05,
  "expression.09-star": 0.05,
  "people.child": 0.05,
  "people.mother": 0.05,
  "people.father": 0.05,
  "people.teenager": 0.05,
  "people.grandmother": 0.05,
  "people.grandfather": 0.05,
};

/** The pond's lily buds: two at rest, one more after every arrival, never more than seven. */
export const LILY_BUDS = { rest: 2, cap: 7 } as const;

export type Role = "body" | "gold" | "glass" | "glow" | "pieces";
export type Lod = "near" | "far";
export type FrameUpdate = (time: number, zone: ZoneId, arrival: ArrivalState | undefined) => void;
/** One object whose visibility the district state decides every frame. */
export type LodItem = { object: T.Object3D; lod?: Lod; detail?: boolean | "near"; effect?: "sparkles" | "trails" };
export type DistrictState = { center: T.Vector3; far: boolean; items: LodItem[] };
export type Baked = { parts: Partial<Record<Role, T.BufferGeometry>> };
export type InstancedBaked = { geometry: T.BufferGeometry; material: T.Material | T.Material[]; buds?: T.BufferGeometry };
export type ZoneStats = { placed: number; skipped: string[]; draws: number; triangles: number; farTriangles: number };
