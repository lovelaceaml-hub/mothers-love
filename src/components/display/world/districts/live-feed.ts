import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function liveFeedDistrict({ island, tube, glass, pearl, orb, rose }: HeavenlyDistrictKit) {
  // Recognition river: layered bridges and quiet floating pearls.
  const river = island("live-feed", 18);
  for (let i = 0; i < 4; i++) {
    const points = Array.from({ length: 24 }, (_, n) => {
      const x = (n / 23) * 27 - 13.5;
      return new T.Vector3(
        x,
        1 + i * 0.4,
        Math.sin(x * 0.15 + i) * 4 + (i - 1.5) * 3,
      );
    });
    tube(river, points, 0.35, i % 2 ? glass : pearl);
  }
  for (let i = 0; i < 14; i++)
    orb(
      river,
      i % 3 ? pearl : rose,
      ((i % 7) - 3) * 3.6,
      3 + Math.sin(i) * 1.2,
      (Math.floor(i / 7) - 0.5) * 7,
      0.65,
    );
}
