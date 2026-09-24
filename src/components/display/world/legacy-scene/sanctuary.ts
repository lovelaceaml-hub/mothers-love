import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { LegacySceneKit } from "./scene-kit";

/** The Sanctuary: its terraces, the heart and its light, the silk ribbons and the columns. */
export function legacySanctuary({
  mesh, pearl, pink, materials, orb, gold,
}: LegacySceneKit, {
  platform,
}: { platform: (index: number, radius: number) => THREE.Group }) {
  const sanctuary = platform(1, 17);
  for (let i = 0; i < 3; i++)
    mesh(
      new THREE.CylinderGeometry(8 - i * 1.3, 8.3 - i * 1.3, 0.42, 80),
      pearl,
      sanctuary,
      0,
      0.65 + i * 0.42,
    );
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -3.5);
  heartShape.bezierCurveTo(-1.2, -2.1, -5.1, 0.15, -4.8, 2.55);
  heartShape.bezierCurveTo(-4.5, 5.7, -0.75, 5.5, 0, 3.25);
  heartShape.bezierCurveTo(0.75, 5.5, 4.5, 5.7, 4.8, 2.55);
  heartShape.bezierCurveTo(5.1, 0.15, 1.2, -2.1, 0, -3.5);
  const rawHeartGeometry = new THREE.ExtrudeGeometry(heartShape, {
    depth: 1.4,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.9,
    bevelThickness: 1.15,
    curveSegments: 36,
  });
  rawHeartGeometry.translate(0, 0, -0.7);
  rawHeartGeometry.deleteAttribute("normal");
  rawHeartGeometry.deleteAttribute("uv");
  const heartGeometry = mergeVertices(rawHeartGeometry);
  rawHeartGeometry.dispose();
  heartGeometry.computeVertexNormals();
  const heart = mesh(heartGeometry, pink, sanctuary, 0, 8.3);
  heart.rotation.y = 0.2;
  heart.userData.dynamic = true;
  const heartLight = new THREE.PointLight("#ffb6c9", 45, 28, 2);
  heartLight.position.set(0, 11, 5);
  sanctuary.add(heartLight);
  const ribbonMaterial = new THREE.MeshPhysicalMaterial({
    color: "#fff1d5",
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
    metalness: 0.32,
    roughness: 0.28,
    depthWrite: false,
  });
  materials.push(ribbonMaterial);
  const ribbons: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 3; r++) {
    const geo = new THREE.PlaneGeometry(1, 1, 100, 6);
    ribbons.push(geo);
    mesh(geo, ribbonMaterial, sanctuary).userData.dynamic = true;
  }
  function updateSilk(time: number) {
    ribbons.forEach((geometry, r) => {
      const positions = geometry.attributes.position;
      for (let j = 0; j <= 6; j++)
        for (let i = 0; i <= 100; i++) {
          const u = i / 100,
            a = u * Math.PI * 2.15 + r * 2.1 + time * 0.085;
          const rad =
            7.2 +
            Math.sin(u * Math.PI) * 1.4 +
            Math.sin(a * 2 + time * 0.4) * 0.4;
          const width =
            Math.pow(Math.sin(u * Math.PI), 0.7) * 0.95 * (j / 3 - 1);
          positions.setXYZ(
            j * 101 + i,
            Math.cos(a) * (rad + width * 0.3),
            4.4 +
              u * 8 +
              Math.sin(a + time * 0.22) * 1.3 +
              width +
              Math.sin(u * 19 + j * 0.4 + time * 0.6) * 0.13,
            Math.sin(a) * (rad + width * 0.3),
          );
        }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const column = mesh(
      new THREE.CylinderGeometry(0.25, 0.4, 4.5, 12),
      pearl,
      sanctuary,
      Math.cos(a) * 14.4,
      2.7,
      Math.sin(a) * 14.4,
    );
    orb(column, gold, 0, 2.35, 0, 0.4);
  }
  return { heart, ribbonMaterial, updateSilk };
}
