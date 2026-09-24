import * as THREE from "three";
import { ZONES } from "../world-data";
import type { LegacySceneKit } from "./scene-kit";

/** The island platforms, and the Garden: its flowers, recognition pearls and arches. */
export function legacyGarden({ scene, mesh, pearl, gold, mint, mat, geometries, random, materials, orb }: LegacySceneKit) {
  function platform(index: number, radius: number) {
    const group = new THREE.Group();
    group.position.fromArray(ZONES[index].center);
    scene.add(group);
    mesh(
      new THREE.CylinderGeometry(radius, radius + 1.2, 0.8, 80),
      pearl,
      group,
      0,
      0.05,
    );
    mesh(
      new THREE.TorusGeometry(radius - 0.25, 0.065, 8, 96),
      gold,
      group,
      0,
      0.5,
    ).rotation.x = Math.PI / 2;
    return group;
  }
  const garden = platform(0, 16);
  mesh(new THREE.CylinderGeometry(13.8, 14, 0.18, 64), mint, garden, 0, 0.52);
  const flowerColors = ["#ffc970", "#f28bac", "#c6a4de", "#ffebbd", "#efa280"];
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.06, 1, 5),
    mat("#6f9982", 0.05, 0.85),
    150,
  );
  geometries.push(stems.geometry);
  garden.add(stems);
  const petalMaterial = mat("#ffffff", 0.18, 0.35);
  const flowerSphere = new THREE.SphereGeometry(1, 10, 7);
  geometries.push(flowerSphere);
  const petals = new THREE.InstancedMesh(flowerSphere, petalMaterial, 150 * 5);
  garden.add(petals);
  const centers = new THREE.InstancedMesh(flowerSphere, gold, 150);
  garden.add(centers);
  const leaves = new THREE.InstancedMesh(flowerSphere, mint, 300);
  garden.add(leaves);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 150; i++) {
    const angle = random() * Math.PI * 2,
      radius = 4 + Math.sqrt(random()) * 9;
    const x = Math.cos(angle) * radius,
      rawZ = Math.sin(angle) * radius,
      z = x > -8 && x < 2 && rawZ > 4 && rawZ < 9 ? rawZ - 5.5 : rawZ,
      h = 0.8 + random() * 2.4;
    dummy.position.set(x, 0.65 + h / 2, z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    for (let leaf = 0; leaf < 2; leaf++) {
      dummy.position.set(
        x + (leaf ? 0.18 : -0.18),
        0.65 + h * (leaf ? 0.55 : 0.3),
        z,
      );
      dummy.scale.set(0.38, 0.07, 0.16);
      dummy.rotation.set(0, angle, leaf ? -0.5 : 0.5);
      dummy.updateMatrix();
      leaves.setMatrixAt(i * 2 + leaf, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    dummy.position.set(x, h + 0.7, z);
    dummy.scale.setScalar(0.19);
    dummy.updateMatrix();
    centers.setMatrixAt(i, dummy.matrix);
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI * 2) / 5;
      dummy.position.set(
        x + Math.cos(a) * 0.29,
        h + 0.65,
        z + Math.sin(a) * 0.29,
      );
      dummy.scale.set(0.44, 0.13, 0.22);
      dummy.rotation.set(0, -a, -0.16);
      dummy.updateMatrix();
      petals.setMatrixAt(i * 5 + j, dummy.matrix);
      petals.setColorAt(
        i * 5 + j,
        new THREE.Color(flowerColors[i % flowerColors.length]),
      );
    }
  }
  const pearls: THREE.Mesh[] = [];
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#fff0ee",
    metalness: 0.1,
    roughness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.72,
  });
  materials.push(glass);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      r = i % 2 ? 9.5 : 6;
    const pearlGlass = glass.clone();
    materials.push(pearlGlass);
    const p = orb(
      garden,
      pearlGlass,
      Math.cos(a) * r,
      4 + (i % 3) * 1.1,
      Math.sin(a) * r,
      0.6 + (i % 3) * 0.23,
    );
    pearls.push(p);
    p.userData.dynamic = true;
    const ring = mesh(
      new THREE.TorusGeometry(0.65 + (i % 3) * 0.23, 0.025, 6, 40),
      gold,
      p,
    );
    ring.scale.setScalar(1 / p.scale.x);
  }
  // Slender garden arches give the camera a readable human scale.
  for (let i = 0; i < 3; i++) {
    const arch = mesh(
      new THREE.TorusGeometry(4.1, 0.17, 10, 56, Math.PI),
      pearl,
      garden,
      (i - 1) * 6,
      2,
      -8 - i * 1.5,
    );
    arch.rotation.y = -0.15;
    for (const side of [-1, 1])
      mesh(
        new THREE.CylinderGeometry(0.17, 0.22, 2, 10),
        gold,
        garden,
        (i - 1) * 6 + side * 4.1,
        1,
        -8 - i * 1.5,
      );
  }
  return { platform, pearls };
}
