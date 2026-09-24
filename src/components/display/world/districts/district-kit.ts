import * as T from "three";
import { seededRandom, ZONES, zoneIndex, type ZoneId } from "../world-data";

/** What every classic district is built from: the root group, the seeded random, the animation list, the shared materials and the mesh helpers. */
export function heavenlyDistrictKit(scene: T.Scene) {
  const root = new T.Group();
  scene.add(root);
  const random = seededRandom(92),
    animated: Array<(time: number, zone: ZoneId) => void> = [];
  const pearl = new T.MeshStandardMaterial({
    color: "#fff0d6",
    roughness: 0.3,
    metalness: 0.15,
  });
  const gold = new T.MeshStandardMaterial({
    color: "#e9b969",
    roughness: 0.3,
    metalness: 0.65,
  });
  const leaf = new T.MeshStandardMaterial({
    color: "#85baab",
    roughness: 0.65,
  });
  const rose = new T.MeshStandardMaterial({
    color: "#f28da6",
    roughness: 0.32,
    metalness: 0.15,
  });
  const glow = new T.MeshBasicMaterial({ color: "#ffe6a5", toneMapped: false });
  const glass = new T.MeshPhysicalMaterial({
    color: "#ace3e7",
    transparent: true,
    opacity: 0.35,
    roughness: 0.12,
    metalness: 0.25,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const sphere = new T.SphereGeometry(1, 18, 12);
  function mesh(
    geo: T.BufferGeometry,
    mat: T.Material,
    parent: T.Object3D,
    pos: [number, number, number] = [0, 0, 0],
  ) {
    const object = new T.Mesh(geo, mat);
    object.position.set(...pos);
    parent.add(object);
    return object;
  }
  function orb(
    parent: T.Object3D,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
  ) {
    const o = mesh(sphere, mat, parent, [x, y, z]);
    o.scale.setScalar(r);
    return o;
  }
  function ring(
    parent: T.Object3D,
    r: number,
    y: number,
    material: T.Material = gold,
    tube = 0.06,
  ) {
    const o = mesh(new T.TorusGeometry(r, tube, 8, 80), material, parent, [
      0,
      y,
      0,
    ]);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  function tube(
    parent: T.Object3D,
    points: T.Vector3[],
    radius: number,
    material: T.Material = gold,
  ) {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 60, radius, 6, false),
      material,
      parent,
    );
  }
  function island(id: ZoneId, radius = 15) {
    const zone = ZONES[zoneIndex(id)],
      group = new T.Group();
    group.position.fromArray(zone.center);
    root.add(group);
    mesh(
      new T.CylinderGeometry(radius, radius + 0.6, 0.8, 64),
      pearl,
      group,
      [0, 0.1, 0],
    );
    mesh(
      new T.ConeGeometry(radius, 9, 24),
      new T.MeshStandardMaterial({
        color: "#aacdc2",
        roughness: 0.9,
        flatShading: true,
      }),
      group,
      [0, -4.7, 0],
    ).rotation.z = Math.PI;
    ring(group, radius - 0.3, 0.6);
    return group;
  }
  return { root, random, animated, pearl, gold, leaf, rose, glow, glass, sphere, mesh, orb, ring, tube, island, scene };
}

/** The one district type every classic district module receives. */
export type HeavenlyDistrictKit = ReturnType<typeof heavenlyDistrictKit>;
