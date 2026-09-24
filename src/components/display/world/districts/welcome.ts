import * as T from "three";
import type { HeavenlyDistrictKit } from "./district-kit";

export function welcomeDistrict({ island, mesh, gold, pearl, random, orb, rose, animated }: HeavenlyDistrictKit) {
  // Welcome: layered pearl arch with petal-shaped butterfly forms.
  const welcome = island("welcome", 17);
  for (let n = 0; n < 3; n++) {
    const arch = mesh(
      new T.TorusGeometry(7.5 + n * 0.7, 0.16, 10, 80, Math.PI),
      n === 1 ? gold : pearl,
      welcome,
      [0, 3, -n * 0.8],
    );
    for (const side of [-1, 1])
      mesh(new T.CylinderGeometry(0.16, 0.3, 3, 10), pearl, welcome, [
        side * (7.5 + n * 0.7),
        1.5,
        -n * 0.8,
      ]);
    arch.rotation.y = 0.08;
  }
  const butterflies = new T.Group();
  welcome.add(butterflies);
  for (let i = 0; i < 14; i++) {
    const b = new T.Group();
    const a = i * 2.4;
    b.position.set(
      Math.cos(a) * (4 + random() * 4),
      3 + random() * 7,
      Math.sin(a) * 4,
    );
    b.rotation.z = random() - 0.5;
    butterflies.add(b);
    for (const side of [-1, 1]) {
      const wing = orb(b, i % 2 ? rose : gold, side * 0.34, 0, 0, 0.55);
      wing.scale.set(0.5, 0.7, 0.075);
      wing.rotation.z = -side * 0.5;
    }
  }
  animated.push((t) => {
    butterflies.rotation.y = Math.sin(t * 0.1) * 0.12;
  });
  return { butterflies };
}
