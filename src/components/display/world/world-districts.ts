import * as T from "three";
import { batchScenery } from "./static-batch";
import type { ZoneId } from "./world-data";
import type { ArrivalState } from "./arrival-director";
import { heavenlyDistrictKit } from "./districts/district-kit";
import { districtSky } from "./districts/sky";
import { welcomeDistrict } from "./districts/welcome";
import { featuredDistrict } from "./districts/featured";
import { calendarDistrict } from "./districts/calendar";
import { peacemakersDistrict } from "./districts/peacemakers";
import { statusDistrict } from "./districts/status";
import { orbitDistrict } from "./districts/orbit";
import { milestoneDistrict } from "./districts/milestone";
import { liveFeedDistrict } from "./districts/live-feed";
import { practiceDistrict } from "./districts/practice";
import { promiseDistrict } from "./districts/promise";
import { arrivalPortal } from "./districts/portal";

export function createHeavenlyDistricts(scene: T.Scene) {
  const kit = heavenlyDistrictKit(scene);
  const { root, animated } = kit;
  const { sky, cloudTexture, dummy } = districtSky(kit);
  const { butterflies } = welcomeDistrict(kit);
  featuredDistrict(kit);
  calendarDistrict(kit);
  const { earth } = peacemakersDistrict(kit);
  const { astrolabe } = statusDistrict(kit);
  const { orbits } = orbitDistrict(kit);
  const { vortex } = milestoneDistrict(kit);
  liveFeedDistrict(kit);
  practiceDistrict(kit);
  const { promise } = promiseDistrict(kit);
  const { portal, arches, arrivalPearl, shower, beams } = arrivalPortal(kit);
  for (const group of [
    butterflies,
    earth,
    astrolabe,
    orbits,
    vortex,
    promise,
    portal,
  ])
    group.userData.dynamic = true;
  const releaseBatch = batchScenery(root);
  animated.forEach((fn) => fn(0, "garden"));
  return {
    update(time: number, zone: ZoneId, arrival?: ArrivalState) {
      sky.uniforms.time.value = time;
      animated.forEach((fn) => fn(time, zone));
      portal.visible =
        !!arrival && arrival.phase !== "idle" && arrival.phase !== "return";
      if (!portal.visible || !arrival) return;
      // The readable world bubble takes over from the small incoming light.
      arrivalPearl.visible = arrival.phase === "approach";
      const opening = arrival.phase === "approach" ? arrival.progress : 1;
      arches.forEach((a, i) =>
        a.scale.setScalar(
          0.9 + opening * 0.1 + Math.sin(time * 0.4 + i) * 0.01,
        ),
      );
      arrivalPearl.position.y =
        arrival.phase === "settle"
          ? 8 - arrival.progress * 6
          : 8 + Math.sin(time * 0.6) * 0.2;
      arrivalPearl.scale.setScalar(
        arrival.phase === "reveal"
          ? 0.2 + arrival.progress * 2
          : arrival.phase === "settle"
            ? 2.2 - arrival.progress * 1.6
            : 2.2,
      );
      for (let i = 0; i < 160; i++) {
        const u = (i / 160 + time * 0.035) % 1,
          a = i * 2.399 + time * 0.15,
          r = 3 + u * 9;
        dummy.position.set(Math.cos(a) * r, 3 + u * 17, Math.sin(a) * r);
        dummy.rotation.set(a, a * 0.4, time * 0.2 + i);
        dummy.scale.set(0.12, 0.04, 0.25);
        dummy.updateMatrix();
        shower.setMatrixAt(i, dummy.matrix);
      }
      shower.instanceMatrix.needsUpdate = true;
      beams.forEach((b, i) => {
        (b.material as T.MeshBasicMaterial).opacity =
          arrival.phase === "reading" ? 0.025 : 0.08;
        b.rotation.z = Math.sin(time * 0.2 + i) * 0.15;
      });
    },
    dispose() {
      releaseBatch();
      const geometries = new Set<T.BufferGeometry>(),
        materials = new Set<T.Material>();
      root.traverse((obj) => {
        const o = obj as T.Mesh;
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            materials.add(m),
          );
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      cloudTexture.dispose();
      scene.remove(root);
    },
  };
}
