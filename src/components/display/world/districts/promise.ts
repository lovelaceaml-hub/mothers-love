import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function promiseDistrict({ island, mesh, rose, gold, animated }: HeavenlyDistrictKit) {
  const promise = island("promise", 14);
  for (let i = 0; i < 2; i++) {
    const ribbon = mesh(
      new T.TorusKnotGeometry(3.6, 0.16, 140, 10, 2, 3),
      i ? rose : gold,
      promise,
      [0, 6, 0],
    );
    ribbon.rotation.y = (i * Math.PI) / 2;
    ribbon.scale.y = 1.35;
    animated.push((t, z) => {
      if (z === "promise") ribbon.rotation.y = (i * Math.PI) / 2 + t * 0.025;
    });
  }
  return { promise };
}
