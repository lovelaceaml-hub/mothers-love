import * as THREE from "three";
import { WORLD_EXPRESSIONS, ZONES } from "../world-data";
import type { LegacySceneKit } from "./scene-kit";

/** The Grove: the nine expression monuments and their reading anchors. */
export function legacyGrove({
  mesh, gold, pearl, mat, orb, textures, materials, mint,
}: LegacySceneKit, {
  platform,
}: { platform: (index: number, radius: number) => THREE.Group }) {
  const grove = platform(2, 18),
    anchors: THREE.Vector3[] = [];
  WORLD_EXPRESSIONS.forEach((expression, i) => {
    const a = -Math.PI + (i / 8) * Math.PI * 1.7;
    const x = Math.cos(a) * 11.5,
      z = Math.sin(a) * 10;
    const monument = new THREE.Group();
    monument.position.set(x, 0, z);
    grove.add(monument);
    mesh(
      new THREE.CylinderGeometry(1.65, 1.95, 0.5, 32),
      gold,
      monument,
      0,
      0.85,
    );
    mesh(
      new THREE.CylinderGeometry(1.3, 1.55, 2.8, 32),
      pearl,
      monument,
      0,
      2.4,
    );
    const color = mat(expression.color, 0.3, 0.24);
    const jewel = orb(monument, color, 0, 5.1, 0, 1.55);
    const halo = mesh(
      new THREE.TorusGeometry(1.95, 0.055, 8, 56),
      gold,
      monument,
      0,
      5.1,
    );
    halo.rotation.y = 0.2;
    // The canonical number is a locally drawn, camera-facing marker, not an image download.
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#49364b";
      ctx.font = "500 76px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(expression.id), 64, 65);
    }
    const texture = new THREE.CanvasTexture(canvas);
    textures.push(texture);
    const labelMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: true,
    });
    materials.push(labelMat);
    const label = new THREE.Sprite(labelMat);
    label.position.set(0, 5.1, 1.6);
    label.scale.set(1.7, 1.7, 1);
    monument.add(label);
    jewel.userData.expressionId = expression.id;
    anchors.push(
      new THREE.Vector3(x + ZONES[2].center[0], 5.1, z + ZONES[2].center[2]),
    );
    for (let n = 0; n < 5; n++) {
      const leaf = orb(
        monument,
        mint,
        Math.cos(n * 1.2) * 2.2,
        1 + n * 0.6,
        Math.sin(n * 1.2) * 2,
        0.9,
      );
      leaf.scale.set(0.45, 1.1, 0.5);
      leaf.rotation.z = n * 0.4;
    }
  });
  return { anchors };
}
