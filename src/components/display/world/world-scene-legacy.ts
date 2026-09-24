import * as THREE from "three";
import { batchScenery } from "./static-batch";
import { createWorldNeighbors } from "./world-neighbors";
import { createHeavenlyDistricts } from "./world-districts";
import type { ArrivalState } from "./arrival-director";
import type { Recognition } from "@/lib/contracts";
import type { ZoneId } from "./world-data";
import { WORLD_EXPRESSIONS } from "./world-data";
import { legacySceneKit } from "./legacy-scene/scene-kit";
import { legacyTerrain } from "./legacy-scene/terrain";
import { legacyGarden } from "./legacy-scene/garden";
import { legacySanctuary } from "./legacy-scene/sanctuary";
import { legacyGrove } from "./legacy-scene/grove";
import { legacyMotes } from "./legacy-scene/motes";

export type WorldScene = {
  scene: THREE.Scene;
  update: (time: number, zone: ZoneId, arrival?: ArrivalState) => void;
  dispose: () => void;
  anchors: THREE.Vector3[];
  recognitionPearls: THREE.Mesh[];
  setRecognitions: (records: readonly Recognition[]) => void;
  setEffects: (sparkles: boolean, trails: boolean) => void;
};
export function createWorldScene(): WorldScene {
  const kit = legacySceneKit();
  const { scene, materials, geometries, textures } = kit;
  const { water } = legacyTerrain(kit);
  const { platform, pearls } = legacyGarden(kit);
  const { heart, ribbonMaterial, updateSilk } = legacySanctuary(kit, { platform });
  const { anchors } = legacyGrove(kit, { platform });
  const { particles } = legacyMotes(kit);
  const initialPearlY = pearls.map((p) => p.position.y);
  updateSilk(0);
  const releaseBatch = batchScenery(scene);
  const districts = createHeavenlyDistricts(scene);
  const neighbors = createWorldNeighbors(scene);
  return {
    scene,
    anchors,
    recognitionPearls: pearls,
    setRecognitions(records) {
      pearls.forEach((pearl, index) => {
        const record = records[index];
        pearl.visible = !!record;
        pearl.userData.recognitionId = record?.id;
        if (record)
          (pearl.material as THREE.MeshPhysicalMaterial).color.set(
            WORLD_EXPRESSIONS[record.expressionIds[0] - 1].color,
          );
      });
    },
    setEffects(sparkles, trails) {
      particles.visible = sparkles;
      neighbors.setEffects(sparkles);
      ribbonMaterial.visible = trails;
    },
    update(time, zone, arrival) {
      water.uniforms.time.value = time;
      districts.update(time, zone, arrival);
      neighbors.update(time, zone, !!arrival && arrival.phase !== "idle");
      pearls.forEach((p, i) => {
        p.position.y = initialPearlY[i] + Math.sin(time * 0.4 + i) * 0.24;
      });
      heart.scale.setScalar(1 + Math.sin(time * 0.65) * 0.018);
      particles.rotation.y = Math.sin(time * 0.018) * 0.1;
      if (zone === "heart" || zone === "garden") updateSilk(time);
    },
    dispose() {
      releaseBatch();
      districts.dispose();
      neighbors.dispose();
      new Set(geometries).forEach((g) => g.dispose());
      new Set(materials).forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      scene.clear();
    },
  };
}
