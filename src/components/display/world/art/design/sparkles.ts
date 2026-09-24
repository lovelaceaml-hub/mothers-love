import * as T from "three";
import { seededRandom } from "../../world-data";
import { STUDY_HEART_PULSE, softDot, sparklePoints } from "../study-materials";
import { STUDY_TV_SPECKS } from "../study-glory";
import type { DesignWorldBase } from "./base";

/** The sparkle field and the heart's glory: its halo and orbiting sparkles. */
export function designSparkles({ geometry, texture, material, time, tv, scene, motions, rose, gold }: DesignWorldBase, { heartRoot, sanctuary }: { heartRoot: T.Group; sanctuary: T.Group }) {
  // Soft glowing dots that breathe, in place of the old solid firefly cubes.
  const sparkleCount=140,sparklePlaces=new Float32Array(sparkleCount*3),sparklePhase=new Float32Array(sparkleCount);
  const rand=seededRandom(455);
  for(let i=0;i<sparkleCount;i++){
    sparklePlaces[i*3]=(rand()-.5)*125;sparklePlaces[i*3+1]=2+rand()*18;sparklePlaces[i*3+2]=(rand()-.5)*115-15;sparklePhase[i]=rand();
  }
  const sparkleGeometry=geometry(new T.BufferGeometry());
  sparkleGeometry.setAttribute("position",new T.BufferAttribute(sparklePlaces,3));
  sparkleGeometry.setAttribute("phase",new T.BufferAttribute(sparklePhase,1));
  const sparkleDot=texture(softDot(64));
  // Fainter on the TV page (`STUDY_TV_SPECKS`), so the field stops lifting the air toward white.
  const sparkleField=new T.Points(sparkleGeometry,material(sparklePoints(time,.55,"#fff0cf",tv?STUDY_TV_SPECKS.sparkles:.9,sparkleDot)));
  sparkleField.name="Study sparkles";sparkleField.frustumCulled=false;scene.add(sparkleField);

  // Section 7, heart glory. A wide soft halo that lives on the glow layer alone, so it never
  // appears in the main image and only reaches the eye as bloom behind the sculpted heart,
  // and twelve sparkles on two tilted rings around it.
  //
  // Corrected down from the design's local scale 5.2 at opacity .30 after the checkpoint
  // captures. The design did not account for heartRoot's own 3.25 scale, so 5.2 became a 17
  // unit sprite around a 5.3 unit heart and lifted the Sanctuary average luminance by 3.3,
  // past the 1.5 the radiance pass is allowed. 3.2 local is 10.4 units, about twice the heart.
  const heartHalo = new T.Sprite(material(new T.SpriteMaterial({
    map: sparkleDot, color: "#ffb3c6", transparent: true, opacity: .12,
    blending: T.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  })));
  heartHalo.name = "Study heart halo";
  heartHalo.position.set(0, 0, -.3);
  heartHalo.scale.set(3.2, 3.2, 1);
  heartHalo.layers.set(1);
  heartRoot.add(heartHalo);
  const heartSparkleCount = 12;
  const heartSparklePlaces = new Float32Array(heartSparkleCount * 3);
  const heartSparklePhase = new Float32Array(heartSparkleCount);
  for (let i = 0; i < heartSparkleCount; i++) heartSparklePhase[i] = i / heartSparkleCount;
  const heartSparkleGeometry = geometry(new T.BufferGeometry());
  heartSparkleGeometry.setAttribute("position", new T.BufferAttribute(heartSparklePlaces, 3));
  heartSparkleGeometry.setAttribute("phase", new T.BufferAttribute(heartSparklePhase, 1));
  const heartSparkles = new T.Points(heartSparkleGeometry, material(sparklePoints(time, .42, "#fff0d8", .6, sparkleDot)));
  heartSparkles.name = "Study heart sparkles"; heartSparkles.frustumCulled = false;
  heartSparkles.layers.enable(1); sanctuary.add(heartSparkles);
  motions.push(t => {
    // The heart's own five second breath, shared by its emissive, its glow branch and its halo.
    STUDY_HEART_PULSE.value = .5 + .5 * Math.sin(t * 1.2566);
    rose.emissiveIntensity = .05 + .13 * STUDY_HEART_PULSE.value;
    gold.emissiveIntensity = .12 + .06 * (.5 + .5 * Math.sin(t * .31));
    for (let i = 0; i < heartSparkleCount; i++) {
      const lane = i % 2, radius = lane ? 6.6 : 5.4, tilt = lane ? .42 : -.3;
      const a = t * (lane ? -.14 : .18) + (i / heartSparkleCount) * Math.PI * 2;
      heartSparklePlaces[i * 3] = Math.cos(a) * radius;
      heartSparklePlaces[i * 3 + 1] = 8.7 + Math.sin(a) * radius * Math.sin(tilt) + Math.sin(t * .6 + i) * .8;
      heartSparklePlaces[i * 3 + 2] = Math.sin(a) * radius * Math.cos(tilt);
    }
    heartSparkleGeometry.getAttribute("position").needsUpdate = true;
  });
  return { sparkleCount, sparkleGeometry, sparkleDot, sparkleField, heartSparkles };
}
