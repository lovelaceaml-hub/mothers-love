import { studyTerrace } from "../study-geometry";
import { createStudyLandmarks } from "../study-landmarks";
import type { DesignWorldBase } from "./base";
import type { StudyLandmarkSite } from "../study-landmarks";
import type { DesignBuilders } from "./builders";

/** The six far horizon islands. */
export function designHorizon({
  geometry, ivory, edge, gold, stone, cylinder, scene,
}: DesignWorldBase, {
  landmarkLayout, islandShapeFar, arch,
}: Pick<DesignBuilders, "islandShapeFar" | "arch"> & { landmarkLayout: StudyLandmarkSite[] }) {
  // A horizon that is not empty haze. Six far islands carrying domes, colonnades and arches sit
  // between 190 and 240 units out, past the fog far distance, so they read as pale silhouettes.
  // They are static, so the same batcher collapses the whole horizon to one call per material.
  const landmarks = createStudyLandmarks(landmarkLayout, {
    geometry, ivory, edge, gold, stone, cylinder,
    underside: islandShapeFar,
    terrace: (top, bottom, height, segments) => studyTerrace(top, bottom, height, segments),
    arch: (parent, x, y, z, width, height) => arch(parent, x, y, z, width, height, false, 28, false),
  });
  scene.add(landmarks);
  return { landmarks };
}
