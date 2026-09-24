import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ZONES, WORLD_EXPRESSIONS } from "../world-data";
import type { WorldScene } from "../world-scene-legacy";
import type { WorldKit } from "../kit/kit-loader";
import { studyArrival } from "./design-mode";
import { arrivalPose } from "./arrival-choreography";
import { studyRibbonPoint, studyTerrace } from "./study-geometry";
import { STUDY_SUN_VIEW, STUDY_TV_RIM_SCALE, scaleStudyRim, studySilk } from "./study-materials";
import { STUDY_TV_SPECKS, lanternLayout, type LanternPoint } from "./study-glory";
import { createStudyAir, type AirFocus } from "./study-air";
import { STUDY_SUN } from "./study-palette";
import type { DesignKitArch } from "./design-world-types";
import { designWorldBase } from "./design/base";
import { designLight } from "./design/light";
import { designSea } from "./design/sea";
import { designClouds } from "./design/clouds";
import { designBuilders } from "./design/builders";
import { designDistricts } from "./design/districts";
import { designBridges } from "./design/bridges";
import { designHorizon } from "./design/horizon";
import { designGrove } from "./design/grove";
import { designDistrictLandmarks } from "./design/district-landmarks";
import { designEntry } from "./design/entry";
import { designFigures } from "./design/figures";
import { designSparkles } from "./design/sparkles";
import { designKitDressing } from "./design/kit-dressing";

export type {
  KitBuilderHandle, DesignKitArch, DesignKitDistrict, DesignKitBridge, DesignKitContext,
} from "./design-world-types";

/** An opt-in visual study on the real world engine, camera, data fixture and clock. */
export function createDesignWorld(kit?: WorldKit): WorldScene {
  const base = designWorldBase(kit);
  const { scene, tv, geometries, materials, textures, instances, motions, time, geometry, material, ivory, gold, rose, stone, farPetal, mesh, ring, batch } = base;
  let disposed = false, sparkles = true, trails = true;
  const invalidate = () => { if (!disposed) scene.userData.invalidate?.(); };

  const { sun, halo, haloScale } = designLight(base);
  const { water } = designSea(base);

  const { landmarkLayout, corridorSites, clouds } = designClouds(base, { kit });

  const { shadowCanvas, shadow, contact, flowers, tree, archCrowns, arch, islandShape, islandShapeFar, falls, fall, waterfall, archRecord } = designBuilders(base);

  const { districtRoots, districts } = designDistricts(base, { islandShape, archRecord, arch, tree, flowers, waterfall });

  const { railSamples, bridges } = designBridges(base);

  const { landmarks } = designHorizon(base, { landmarkLayout, islandShapeFar, arch });

  // Sanctuary silhouette: curved ivory arcade, original sculpted heart, independent silk.
  const sanctuary = districtRoots.get("heart")!;
  const arcade = new T.Group(); arcade.rotation.y = Math.atan2(14,28); sanctuary.add(arcade);
  const arcadeArches: DesignKitArch[] = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * .05 + i / 6 * Math.PI * .90;
    const arc = arch(arcade, Math.cos(a) * 12.8, .65, -Math.sin(a) * 12.8 - 1.5, 5.15, 11.8);
    arc.rotation.y = Math.PI / 2 - a;
    arcadeArches.push(archRecord(arc, 5.15, 11.8));
  }
  for (let i = 0; i < 4; i++) { mesh(sanctuary,geometry(studyTerrace(7.6-i*.8,7.9-i*.8,.28)),ivory,[0,.88+i*.28,0]);ring(sanctuary,7.6-i*.8,1.03+i*.28,.018); }
  const heartRoot = new T.Group(); heartRoot.name = "Supplied original sculpted heart"; heartRoot.userData.dynamic = true; heartRoot.position.set(0, 8.7, 0); heartRoot.rotation.y = .25; heartRoot.scale.setScalar(3.25); sanctuary.add(heartRoot);
  new GLTFLoader().load("/world-prototype/original-heart.glb", gltf => {
    // Section 7: the sculpted heart joins the glow layer here, where its meshes first exist,
    // so the warm pulse in the rose glow branch reaches the bloom.
    gltf.scene.traverse(o => { if (o instanceof T.Mesh) { geometries.add(o.geometry); const old = Array.isArray(o.material) ? o.material : [o.material]; old.forEach(m => m.dispose()); o.material = rose; o.castShadow = true; o.layers.enable(1); } });
    if (disposed) { gltf.scene.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); return; }
    heartRoot.add(gltf.scene); scene.userData.prototypeHeartReady = true; invalidate();
  }, undefined, error => { if (!disposed) { scene.userData.prototypeHeartError = "Original heart did not load"; console.error("Design study original heart", error); invalidate(); } });
  // One silk recipe now serves the Sanctuary ribbons and the arrival ribbon study.
  const silkMat = material(studySilk()); silkMat.color.set("#f9cfd6");
  const ribbons: T.Mesh[] = [];
  // The four ribbons used to orbit at radius 5.7 while the heart is 4.5 half-wide, so from the
  // paused Sanctuary framing they crossed the heart as four broad horizontal bands. They now
  // clear the heart by a wide margin and climb away from it, and the phase offsets were chosen
  // numerically so that at the still clock every ribbon passes clear of the heart silhouette,
  // two to each side. The minimum radius, 8.0 - .7 - .15 = 7.15, keeps every vertex outside the
  // heart's scaled, swaying footprint (5.3 wide by 4.2 deep), whose far corner sits 6.76 units out.
  // The path itself lives in study-geometry, so a plain Node test proves it clear of the heart.
  const ribbonPoint = new T.Vector3();
  for (let index = 0; index < 4; index++) {
    const g = geometry(new T.PlaneGeometry(1,1,100,6)), o = mesh(sanctuary,g,silkMat);o.userData.dynamic=true;ribbons.push(o);
    motions.push(t=>{
      const p=g.getAttribute("position");
      for(let j=0;j<=6;j++)for(let i=0;i<=100;i++){
        studyRibbonPoint(index,i/100,j/6-.5,t,ribbonPoint);
        p.setXYZ(j*101+i,ribbonPoint.x,ribbonPoint.y,ribbonPoint.z);
      }p.needsUpdate=true;g.computeVertexNormals();
    });
  }
  motions.push(t=>{heartRoot.rotation.y=.25+Math.sin(t*.13)*.10;heartRoot.position.y=8.7+Math.sin(t*.36)*.07;});

  const { grove, groveSites } = designGrove(base, { districtRoots, invalidate });

  designDistrictLandmarks(base, { districtRoots, districts, waterfall, arch, archRecord });

  const { entry, stages, stageStyles, stageEffects } = designEntry(base, { kit });

  designFigures(base, { contact, districtRoots, districts });

  const { sparkleCount, sparkleGeometry, sparkleDot, sparkleField, heartSparkles } = designSparkles(base, { heartRoot, sanctuary });

  const { kitHandles } = designKitDressing(base, { kit, arch, contact, waterfall, falls, districts, water, silkMat, shadow, fall, archCrowns, bridges, entry, landmarks, grove, groveSites, sanctuary, arcade, arcadeArches, heartRoot, sparkleDot });

  // Section 7: the 31 waterfall planes become one mesh. Their world transforms are baked in,
  // and the shader reads only uv, so nothing moves. The material writes no depth, so losing
  // the per plane sort order cannot change what is in front of what.
  scene.updateMatrixWorld(true);
  const fallParts = falls.map(o => { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
  const mergedFalls = mergeGeometries(fallParts, false);
  fallParts.forEach(g => g.dispose());
  // Same guard: the 31 planes leave their own geometries registered if the merge ever fails.
  if (!mergedFalls) falls.forEach(o => geometry(o.geometry));
  if (mergedFalls) {
    falls.forEach(o => { o.removeFromParent(); o.geometry.dispose(); });
    falls.length = 0;
    const sheet = mesh(scene, geometry(mergedFalls), fall);
    sheet.name = "Study waterfalls";
    falls.push(sheet);
  }

  // The landmarks opt out of shadow casting: the sun shadow box covers the connected world only.
  motions.forEach(fn=>fn(0));districtRoots.forEach(root=>batch(root));batch(entry);batch(landmarks,false);

  // Section 6 layer membership, resolved after batching so the merged meshes are the ones flagged.
  // Layer 1 is the glow layer. Only the breaking crest of a fall reaches it, through the shader
  // branch above. Layer 2 is the god ray occluder set: the carved rock, the ivory architecture,
  // the bridge decks and the entry terrace, all of them by material identity. The cotton crowns
  // stay out of it on purpose, so the rays sift through the canopies instead of being blocked.
  falls.forEach(o => o.layers.enable(1));
  // The carved rock and the ivory architecture already give each district its silhouette, so the
  // thin edge bands are left out: they cost a merged draw per district and change no shaft.
  //
  // Section 7 adds the gold to the glow layer on the same sweep, by material identity, so the
  // merged gold of each district lights up along the rails and the arches. Instanced meshes are
  // skipped as before, which leaves the flower cores out of the glow: they are a fraction of a
  // pixel each and would cost an instanced draw in the glow pass for nothing.
  const rayOccluders = new Set<T.Material>([ivory, stone]);
  scene.traverse(object => {
    if (!(object instanceof T.Mesh) || object instanceof T.InstancedMesh) return;
    const m = object.material;
    if (Array.isArray(m)) return;
    if (rayOccluders.has(m)) object.layers.enable(2);
    if (m === gold) object.layers.enable(1);
  });

  // Section 7, lanterns: one steady warm light every sixth sample along every bridge rail and
  // one at every arch keystone in the connected world, all in a single Points draw. They are
  // not sparkle class and not trail class, because a lantern is a lamp, not an effect.
  const keystone = new T.Vector3();
  const lanternKeystones: LanternPoint[] = archCrowns.map(({ root, height }) => {
    keystone.set(0, height, 0).applyMatrix4(root.matrixWorld);
    return [keystone.x, keystone.y, keystone.z] as LanternPoint;
  });
  const lanternGeometry = geometry(new T.BufferGeometry());
  lanternGeometry.setAttribute("position", new T.BufferAttribute(lanternLayout(railSamples, lanternKeystones), 3));
  // Opacity corrected down from the design's .9 after the checkpoint captures: about 285 of
  // them are additive and on the glow layer, so as a set they are a broad lift, not a point.
  // A second round took it to .58: the Sanctuary frame has the arcade keystones and several
  // converging bridges in it at once, which is the densest lantern view in the world. The TV
  // page's clear air takes them lower again (`STUDY_TV_SPECKS`).
  const lanterns = new T.Points(lanternGeometry, material(new T.PointsMaterial({
    size: .55, sizeAttenuation: true, map: sparkleDot, color: new T.Color("#ffd9a0"),
    transparent: true, opacity: tv ? STUDY_TV_SPECKS.lanterns : .58, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false,
  })));
  lanterns.name = "Study lanterns"; lanterns.frustumCulled = false;
  lanterns.layers.enable(1); scene.add(lanterns);

  // Living air. Four objects, one draw call each, all seeded. The TV page's motes and stars are
  // quieter (`AirContext.tv`).
  const air = createStudyAir(scene, { geometry, material, farPetal, dot: sparkleDot, time, tv }, [...ZONES.map(zone => zone.center), ...corridorSites.map(site => site.center)]);

  // TV page: the fresnel rims read as white halos round every silhouette in the clearer light,
  // so every rim this world's materials carry (the architecture, the stone, the cotton crowns,
  // the kit pieces, the neighbors, the petals) is softened to `STUDY_TV_RIM_SCALE`, once, now
  // that every builder has registered its materials. The sculpted heart keeps its rim.
  if (tv) materials.forEach(m => { if (m !== rose) scaleStudyRim(m, STUDY_TV_RIM_SCALE); });
  return {
    scene, anchors: WORLD_EXPRESSIONS.map((_,i)=>new T.Vector3(14+Math.cos(i)*10,5,-45+Math.sin(i)*10)), recognitionPearls: [],
    setRecognitions() { /* The unchanged world-space recognition manager owns all records. */ },
    setEffects(s, t) { sparkles=s;trails=t;air.setEffects(s,t);kitHandles.forEach(handle=>handle.setEffects?.(s,t)); },
    update(t,_zone,arrival){
      time.value=t;motions.forEach(fn=>fn(t));clouds.update(t);ribbons.forEach(o=>{o.visible=trails;});sparkleField.visible=sparkles;sparkleField.rotation.y=Math.sin(t*.016)*.04;
      heartSparkles.visible=sparkles;
      // The engine resolves the picture quality tier and publishes it on the scene in resize().
      // Low drops the sky cloud ring, which is pure overdraw near the horizon, and halves the sparkles.
      const lowTier=scene.userData.lowTier===true;
      // Section 8, haze during travel: the engine publishes a smoothed 0 to 1 travel amount,
      // and the low sun swells a little inside the thicker air. Parked it is 0 and the two
      // sprites are exactly their authored size, so a still capture is unchanged.
      const travel=typeof scene.userData.studyTravel==="number"?scene.userData.studyTravel:0;
      // The TV page's air does not thicken in flight, so its sun does not swell either.
      const swell=tv?1:1+.12*travel;
      halo.sprites.forEach((sprite,i)=>sprite.scale.set(haloScale[i]*swell,haloScale[i]*swell,1));
      // The engine publishes its camera on the scene under the study gate, so the motes can
      // wrap around the viewer without changing the shared WorldScene update signature.
      const viewer=scene.userData.studyCamera as T.Camera|undefined;
      // The sun in view space. StudyRadiance refreshes this too, but the water glitter and the
      // pearl's sun side rim are ordinary main pass shading, so they must also be right when
      // the radiance pass is absent: on Low, and under ?radiance=off, which is what the text
      // parity comparison captures. Refreshing it here keeps that A/B honest.
      if(viewer)STUDY_SUN_VIEW.value.set(...STUDY_SUN.direction).transformDirection(viewer.matrixWorldInverse);
      if(viewer)air.update(t,viewer,lowTier,scene.userData.studyFocus as AirFocus);
      clouds.meshes[0].visible=!lowTier;
      sparkleGeometry.setDrawRange(0,lowTier?Math.floor(sparkleCount/2):sparkleCount);
      const pose=arrivalPose(arrival);
      scene.userData.studyArrivalPose=pose;
      const style=studyArrival(scene.userData.studyArrival);
      stageEffects.sparkles=sparkles;stageEffects.trails=trails;
      for(const key of stageStyles){
        const visible=pose.active&&style===key;
        stages[key].group.visible=visible;
        if(visible)stages[key].update(pose,t,stageEffects);
      }
      for(const handle of kitHandles)handle.update?.(t,_zone,arrival);
    },
    dispose(){disposed=true;kitHandles.forEach(handle=>handle.dispose?.());air.dispose();instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.map?.dispose();shadowCanvas.width=shadowCanvas.height=1;scene.clear();},
  };
}
