import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function orbitDistrict({ island, orb, rose, pearl, gold, ring, animated }: HeavenlyDistrictKit) {
  // Genuine XYZ orbital paths, with foreground and background pearls.
  const cosmos = island("orbit", 17),
    orbits = new T.Group();
  orbits.position.y = 7;
  cosmos.add(orbits);
  orb(orbits, rose, 0, 0, 0, 2.8);
  const planets: T.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    const p = orb(orbits, i % 3 ? pearl : gold, 0, 0, 0, 0.35 + (i % 3) * 0.22);
    planets.push(p);
  }
  for (let i = 0; i < 3; i++) {
    const r = ring(orbits, 6 + i * 2.2, 0, gold, 0.03);
    r.rotation.z = 0.25 + i * 0.33;
  }
  animated.push((t, z) => {
    if (z === "orbit" || t === 0)
      planets.forEach((p, i) => {
        const a = (i / 18) * Math.PI * 2 + t * (0.09 + (i % 3) * 0.015),
          r = 6 + (i % 3) * 2.2;
        p.position.set(
          Math.cos(a) * r,
          Math.sin(a * 0.7 + i) * 2.5,
          Math.sin(a) * r,
        );
      });
  });
  return { orbits };
}
