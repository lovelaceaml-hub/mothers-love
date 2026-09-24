import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function featuredDistrict({ island, mesh, pearl, orb, gold, glass, ring, rose }: HeavenlyDistrictKit) {
  // Featured pavilion: a pearl canopy and illuminated central jewel.
  const pavilion = island("featured", 14);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mesh(new T.CylinderGeometry(0.2, 0.35, 7, 12), pearl, pavilion, [
      Math.cos(a) * 7,
      4,
      Math.sin(a) * 7,
    ]);
    orb(pavilion, gold, Math.cos(a) * 7, 7.7, Math.sin(a) * 7, 0.3);
  }
  const canopy = mesh(
    new T.SphereGeometry(8, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
    pavilion,
    [0, 7.6, 0],
  );
  canopy.scale.y = 0.38;
  ring(pavilion, 8, 7.6);
  orb(pavilion, rose, 0, 4, 0, 2);
  ring(pavilion, 3.2, 1.1);
}
