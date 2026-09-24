import * as T from "three";
import { WORLD_EXPRESSIONS } from "../world-data";
import type { HeavenlyDistrictKit } from "./district-kit";

export function statusDistrict({ island, mesh, orb, pearl, gold, glass, animated }: HeavenlyDistrictKit) {
  // Observatory: nine living, colored columns beneath a suspended astrolabe.
  const observatory = island("status", 16);
  WORLD_EXPRESSIONS.forEach((e, i) => {
    const a = (i / 9) * Math.PI * 2,
      h = 2 + (i % 4) * 0.8;
    mesh(
      new T.CylinderGeometry(1, 1.4, h, 24),
      new T.MeshStandardMaterial({
        color: e.color,
        roughness: 0.3,
        metalness: 0.25,
      }),
      observatory,
      [Math.cos(a) * 9, h / 2 + 0.8, Math.sin(a) * 9],
    );
    orb(observatory, pearl, Math.cos(a) * 9, h + 1, Math.sin(a) * 9, 0.5);
  });
  const astrolabe = new T.Group();
  astrolabe.position.y = 8;
  observatory.add(astrolabe);
  for (let i = 0; i < 3; i++) {
    const ring = mesh(
      new T.TorusGeometry(4 + i * 0.4, 0.065, 8, 80),
      gold,
      astrolabe,
    );
    ring.rotation.set(i * 0.7, i * 0.8, 0);
  }
  orb(astrolabe, glass, 0, 0, 0, 2.2);
  animated.push((t, z) => {
    if (z === "status") astrolabe.rotation.y = t * 0.08;
  });
  return { astrolabe };
}
