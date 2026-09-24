import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function milestoneDistrict({ island, orb, pearl, gold, tube, glow, animated }: HeavenlyDistrictKit) {
  // Milestone fountain: a true rising helix of pearls and champagne filaments.
  const fountain = island("milestone", 17),
    vortex = new T.Group();
  fountain.add(vortex);
  const vortexPearls: T.Mesh[] = [];
  for (let i = 0; i < 65; i++)
    vortexPearls.push(
      orb(vortex, i % 5 ? pearl : gold, 0, 0, 0, 0.18 + (i % 6) * 0.1),
    );
  for (let n = 0; n < 4; n++) {
    const points = Array.from({ length: 100 }, (_, i) => {
      const u = i / 99,
        a = u * Math.PI * 5 + (n * Math.PI) / 2,
        r = 2 + u * 7;
      return new T.Vector3(Math.cos(a) * r, 1 + u * 18, Math.sin(a) * r);
    });
    tube(vortex, points, 0.05, n % 2 ? gold : glow);
  }
  animated.push((t, z) => {
    if (z === "milestone" || t === 0)
      vortexPearls.forEach((p, i) => {
        const u = (i / 65 + t * 0.013) % 1,
          a = i * 2.4 + t * 0.22,
          r = 2 + u * 7;
        p.position.set(Math.cos(a) * r, 1 + u * 18, Math.sin(a) * r);
      });
  });
  return { vortex };
}
