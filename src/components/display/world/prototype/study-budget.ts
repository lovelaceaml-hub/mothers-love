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

export function studyDetailDistance(tier: StudyTier): number {
  return STUDY_DETAIL_DISTANCE[tier];
}

export type StudyDetailEntry = {
  object: { visible: boolean };
  centre: { x: number; y: number; z: number };
};

export function applyStudyDetail(
  entries: readonly StudyDetailEntry[],
  camera: { x: number; y: number; z: number },
  tier: StudyTier,
): number {
  const limit = studyDetailDistance(tier);
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
