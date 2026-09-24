import * as THREE from "three";
import type { LegacySceneKit } from "./scene-kit";

/** The drifting light motes over the three islands. */
export function legacyMotes({ textures, random, geometries, materials, scene }: LegacySceneKit) {
  // Soft point texture avoids square particles and uses no remote asset.
  const lightCanvas = document.createElement("canvas");
  lightCanvas.width = 32;
  lightCanvas.height = 32;
  const lightCtx = lightCanvas.getContext("2d");
  if (lightCtx) {
    const gradient = lightCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "#fff9db");
    gradient.addColorStop(0.2, "#fff4dbaa");
    gradient.addColorStop(1, "#fff4db00");
    lightCtx.fillStyle = gradient;
    lightCtx.fillRect(0, 0, 32, 32);
  }
  const lightTexture = new THREE.CanvasTexture(lightCanvas);
  textures.push(lightTexture);
  const particleGeo = new THREE.BufferGeometry(),
    positions = new Float32Array(200 * 3);
  for (let i = 0; i < 200; i++) {
    positions[i * 3] = (random() - 0.5) * 110;
    positions[i * 3 + 1] = random() * 24 + 1;
    positions[i * 3 + 2] = (random() - 0.5) * 100 - 15;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometries.push(particleGeo);
  const particleMat = new THREE.PointsMaterial({
    map: lightTexture,
    color: "#ffe8ac",
    size: 0.5,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  materials.push(particleMat);
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
  return { particles };
}
