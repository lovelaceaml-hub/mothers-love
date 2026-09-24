import * as T from "three";
import { seededRandom } from "../../world-data";
import type { WorldKit } from "../../kit/kit-loader";
import { bloomStage, constellationStage, ribbonStage, type StageContext } from "../arrival-stages";
import { studyTerrace } from "../study-geometry";
import type { DesignWorldBase } from "./base";

/** The arrival stage on the entry platform and its three studies. */
export function designEntry({
  scene, mesh, geometry, ivory, ring, petalGeometry, material, texture, instance, gold, farPetal,
  pollen, time,
}: DesignWorldBase, {
  kit,
}: { kit: WorldKit | undefined }) {
  // Arrival forms share the existing director phases and complete reading interval.
  const entry = new T.Group(); entry.name="Design study arrival stage";entry.position.set(4.138,.6,19.104);scene.add(entry);
  mesh(entry,geometry(studyTerrace(10.8,11,.65)),ivory);ring(entry,10.2,.35,.03);ring(entry,9.9,.36,.009);
  // Each study is an independent stage on the entry platform, built from the shared
  // registrars so dispose() still covers every geometry, material and texture.
  const lotusShape=petalGeometry(40,24);
  // The kit rides along for the arrival lane (K2), which adds `kit` to StageContext itself.
  const stageContext:StageContext&{kit?:WorldKit}={geometry,material,texture,instance,gold,ivory,farPetal,pollen,lotusShape,time,seededRandom,kit};
  const stages={bloom:bloomStage(stageContext),ribbon:ribbonStage(stageContext),constellation:constellationStage(stageContext)} as const;
  const stageStyles=["bloom","ribbon","constellation"] as const;
  for(const key of stageStyles){stages[key].group.visible=false;entry.add(stages[key].group);}
  const stageEffects={sparkles:true,trails:true};
  return { entry, stages, stageStyles, stageEffects };
}
