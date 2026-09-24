import * as THREE from "three";
import { seededRandom } from "../world-data";

/** The classic scene's base: the scene and its lights, the disposal lists, the seeded random, the shared materials and the mesh helpers. */
export function legacySceneKit() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#d2e2e8");
  scene.fog = new THREE.FogExp2("#e1dcf0", 0.003);
  scene.add(new THREE.HemisphereLight("#fff5e8", "#73909a", 1.15));
  const sun = new THREE.DirectionalLight("#ffe8c3", 2.1);
  sun.position.set(-30, 70, 25);
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#c3d8ff", 0.9);
  rim.position.set(35, 30, -50);
  scene.add(rim);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const random = seededRandom();
  const mat = (color: string, metalness = 0.15, roughness = 0.35) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(m);
    return m;
  };
  const pearl = mat("#fff7e7", 0.28, 0.24),
    gold = mat("#d6ad69", 0.65, 0.26),
    mint = mat("#85b5a0", 0.08, 0.7);
  const pink = mat("#ee648f", 0.35, 0.23),
    ground = mat("#a3c0ad", 0.02, 0.92);
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.push(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  geometries.push(sphere);
  const orb = (
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    scale: number,
  ) => {
    const o = new THREE.Mesh(sphere, material);
    o.position.set(x, y, z);
    o.scale.setScalar(scale);
    parent.add(o);
    return o;
  };
  return { scene, sun, rim, materials, geometries, textures, random, mat, pearl, gold, mint, pink, ground, mesh, sphere, orb };
}

/** What every part of the classic scene receives. */
export type LegacySceneKit = ReturnType<typeof legacySceneKit>;
