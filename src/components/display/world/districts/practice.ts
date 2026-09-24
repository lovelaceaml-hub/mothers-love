import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function practiceDistrict({ island, mesh, pearl, orb, leaf, rose, random }: HeavenlyDistrictKit) {
  // Practice terrace and promise sculpture give the campaign's actions real homes.
  const practice = island("practice", 13);
  for (let i = 0; i < 5; i++) {
    mesh(new T.BoxGeometry(14 - i * 1.5, 0.45, 8 - i * 0.6), pearl, practice, [
      0,
      0.8 + i * 0.45,
      -i * 0.5,
    ]);
  }
  for (let i = 0; i < 9; i++)
    orb(
      practice,
      i % 2 ? leaf : rose,
      Math.cos(i) * 7,
      2 + random() * 3,
      Math.sin(i) * 7,
      0.8,
    );
}
