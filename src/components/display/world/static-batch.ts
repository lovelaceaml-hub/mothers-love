import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Merge resident opaque scenery by material. Animated roots and transparent surfaces
// keep their own transforms and sorting. This cuts GPU submissions during the tour.
export function batchScenery(root: T.Object3D) {
  root.updateMatrixWorld(true);
  const groups = new Map<T.Material, T.Mesh[]>();
  const inverse = root.matrixWorld.clone().invert();
  const walk = (node: T.Object3D) => {
    if (node.userData.dynamic) return;
    node.children.slice().forEach(walk);
    if (
      !(node instanceof T.Mesh) ||
      node instanceof T.InstancedMesh ||
      Array.isArray(node.material) ||
      node.material.transparent ||
      node.children.length
    )
      return;
    const group = groups.get(node.material) ?? [];
    group.push(node);
    groups.set(node.material, group);
  };
  root.children.slice().forEach(walk);
  const created: T.BufferGeometry[] = [],
    originals = new Set<T.BufferGeometry>();
  groups.forEach((meshes, material) => {
    if (meshes.length < 3) return;
    const geometries = meshes.map((mesh) => {
      const source = mesh.geometry.index
        ? mesh.geometry.toNonIndexed()
        : mesh.geometry.clone();
      source.deleteAttribute("uv");
      source.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      return source;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    meshes.forEach((mesh) => {
      originals.add(mesh.geometry);
      mesh.removeFromParent();
    });
    root.add(new T.Mesh(merged, material));
    created.push(merged);
  });
  return () => {
    created.forEach((geometry) => geometry.dispose());
    originals.forEach((geometry) => geometry.dispose());
  };
}
