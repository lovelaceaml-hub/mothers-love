import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function peacemakersDistrict({ island, orb, glass, mesh, gold, ring, random, leaf, tube, glow, animated }: HeavenlyDistrictKit) {
  // Globe: luminous meridians and abstract land constellations. Not a geographic map.
  const globe = island("peacemakers", 16),
    earth = new T.Group();
  earth.position.y = 8;
  globe.add(earth);
  orb(earth, glass, 0, 0, 0, 6.5);
  for (let i = 0; i < 7; i++) {
    const r = mesh(new T.TorusGeometry(6.6, 0.026, 6, 80), gold, earth);
    r.rotation.y = (i * Math.PI) / 7;
  }
  for (let i = -2; i <= 2; i++) {
    const y = i * 1.9;
    ring(earth, Math.sqrt(6.6 * 6.6 - y * y), y, gold, 0.025);
  }
  for (let i = 0; i < 85; i++) {
    const phi = Math.acos(2 * random() - 1),
      theta = random() * Math.PI * 2;
    if (Math.sin(theta * 3 + phi * 2) > 0.05)
      orb(
        earth,
        leaf,
        6.55 * Math.sin(phi) * Math.cos(theta),
        6.55 * Math.cos(phi),
        6.55 * Math.sin(phi) * Math.sin(theta),
        0.18 + random() * 0.18,
      );
  }
  const arcPoints = Array.from({ length: 35 }, (_, i) => {
    const a = (i / 34) * Math.PI;
    return new T.Vector3(
      Math.cos(a) * 8.4,
      Math.sin(a) * 9 - 1,
      1.8 * Math.sin(a),
    );
  });
  tube(earth, arcPoints, 0.045, glow);
  animated.push((t, z) => {
    if (z === "peacemakers") earth.rotation.y = t * 0.035;
  });
  return { earth };
}
