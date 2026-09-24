import { kitCorridorSites } from "../kit-corridors";
import { createStudyClouds, studyCloudAtlas, studyCloudLayout } from "../study-clouds";
import { studyLandmarkCloudSites, studyLandmarkLayout } from "../study-landmarks";
import type { DesignWorldBase } from "./base";
import type { WorldKit } from "../../kit/kit-loader";

/** The horizon cloud ring and the island collars. */
export function designClouds({ texture, time, tv, geometry, material, instances, scene }: DesignWorldBase, { kit }: { kit: WorldKit | undefined }) {
  // Soft pink air: a drifting ring of cloud near the horizon, and a collar of puffs
  // under every island rim so the terraces read as floating rather than cut off.
  const landmarkLayout = studyLandmarkLayout();
  // The corridor islets (K3b) earn cloud collars and petals like every island. Empty without a kit.
  const corridorSites = kit ? kitCorridorSites(kit) : [];
  const cloudSites = studyLandmarkCloudSites(landmarkLayout);
  cloudSites.push(...corridorSites.map(site => ({ center: [...site.center] as [number, number, number], radius: site.radius })));
  // The TV page lightens the sky ring and the collars (`STUDY_TV_CLOUDS`); the layout is the same.
  const clouds = createStudyClouds(studyCloudLayout(777, cloudSites), texture(studyCloudAtlas()), time, tv);
  clouds.geometries.forEach(geometry); clouds.materials.forEach(material);
  clouds.meshes.forEach(o => { instances.add(o); scene.add(o); });
  return { landmarkLayout, corridorSites, clouds };
}
