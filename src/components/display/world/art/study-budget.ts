import type { StudyTier } from "./study-radiance";

export type { StudyTier } from "./study-radiance";

export function studyCanvasSize(focused: boolean, tier: StudyTier): number {
  if (focused) return tier === "high" ? 2048 : 1024;
  return tier === "high" ? 1024 : 512;
}

export const STUDY_DETAIL_DISTANCE: Record<StudyTier, number> = {
  high: 140,
  auto: 110,
  low: 70,
};

/**
 * TV page (clear air): the shortest distance a High or Auto detail cull may use. The study's
 * thick haze used to hide every piece that appeared at 70 to 110 units; in the TV page's
 * thinner fog (`STUDY_TV_FOG`) that is plain air, so a piece would visibly pop in. At 150 the
 * fog already takes about 12% (a smoothstep from 60 to 480), so a piece arrives softened.
 */
export const STUDY_TV_VIEW_DISTANCE = 150;

/**
 * A view or detail distance as the TV page uses it: never under `STUDY_TV_VIEW_DISTANCE` on the
 * High and Auto tiers. The Low tier, and every page without `?view=tv`, keep exactly `distance`.
 */
export function tvViewDistance(distance: number, tv: boolean, low = false): number {
  return tv && !low ? Math.max(distance, STUDY_TV_VIEW_DISTANCE) : distance;
}

export function studyDetailDistance(tier: StudyTier, tv = false): number {
  return tvViewDistance(STUDY_DETAIL_DISTANCE[tier], tv, tier === "low");
}

export type StudyDetailEntry = {
  object: { visible: boolean };
  centre: { x: number; y: number; z: number };
};

export function applyStudyDetail(
  entries: readonly StudyDetailEntry[],
  camera: { x: number; y: number; z: number },
  tier: StudyTier,
  tv = false,
): number {
  const limit = studyDetailDistance(tier, tv);
  let visible = 0;
  for (const entry of entries) {
    const dx = camera.x - entry.centre.x;
    const dy = camera.y - entry.centre.y;
    const dz = camera.z - entry.centre.z;
    entry.object.visible = Math.sqrt(dx * dx + dy * dy + dz * dz) <= limit;
    if (entry.object.visible) visible++;
  }
  return visible;
}
