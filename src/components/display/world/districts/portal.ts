import * as T from "three";
import { WORLD_EXPRESSIONS, ZONES, zoneIndex } from "../world-data";
import type { HeavenlyDistrictKit } from "./district-kit";

/** The bridges to the centre, the arrival portal and the falling streams. */
export function arrivalPortal({ tube, root, pearl, mesh, gold, glow, orb, glass }: HeavenlyDistrictKit) {
  // Connect every district to the same central world, with bright arched bridges.
  for (const zone of ZONES.slice(3)) {
    const start = new T.Vector3(...zone.center),
      end = new T.Vector3(zone.center[0] * 0.3, 0, zone.center[2] * 0.3),
      mid = start.clone().lerp(end, 0.5);
    mid.y += 3;
    const bridge = tube(root, [start, mid, end], 0.7, pearl);
    bridge.scale.y = 1;
  }
  // New recognition portal: all geometry preallocated, only its state changes.
  const portal = new T.Group();
  portal.position.set(0, 0, 10);
  root.add(portal);
  portal.visible = false;
  const arches: T.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const a = mesh(
      new T.TorusGeometry(8 + i * 0.4, 0.06 + i * 0.015, 8, 100, Math.PI),
      i % 2 ? gold : glow,
      portal,
      [0, 4, -i * 0.6],
    );
    arches.push(a);
    for (const side of [-1, 1])
      mesh(new T.CylinderGeometry(0.055, 0.1, 4, 8), glow, portal, [
        side * (8 + i * 0.4),
        2,
        -i * 0.6,
      ]);
  }
  const arrivalPearl = orb(
    portal,
    new T.MeshPhysicalMaterial({
      color: "#ffacc8",
      roughness: 0.16,
      metalness: 0.25,
      clearcoat: 1,
      emissive: "#c55c84",
      emissiveIntensity: 0.14,
    }),
    0,
    8,
    0,
    2.2,
  );
  const petalGeo = new T.SphereGeometry(1, 8, 5),
    petalMat = new T.MeshStandardMaterial({
      color: "#fff0d0",
      roughness: 0.4,
      metalness: 0.2,
    });
  const shower = new T.InstancedMesh(petalGeo, petalMat, 160);
  portal.add(shower);
  const beams: T.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const material = new T.MeshBasicMaterial({
      color: WORLD_EXPRESSIONS[i].color,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
    });
    const beam = mesh(
      new T.ConeGeometry(0.6, 26, 8, 1, true),
      material,
      portal,
      [Math.cos(i) * 6, 14, Math.sin(i) * 5],
    );
    beam.rotation.z = Math.sin(i) * 0.25;
    beams.push(beam);
  }
  // Cascading streams descend from the floating upper gardens.
  for (const id of ["orbit", "milestone"] as const) {
    const zone = ZONES[zoneIndex(id)];
    for (let n = 0; n < 3; n++) {
      const stream = mesh(
        new T.CylinderGeometry(0.18, 0.7, 25, 10, 1, true),
        glass,
        root,
        [zone.center[0] + 11 + n * 0.5, 12, zone.center[2] + 3],
      );
      stream.rotation.z = 0.08 + n * 0.015;
    }
  }
  return { portal, arches, arrivalPearl, shower, beams };
}
