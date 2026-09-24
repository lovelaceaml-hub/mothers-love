/** The engine's view: resizing and the study's quality tier, and picking a pearl with a tap. WorldEngine calls these with itself as `this`. */
import * as THREE from "three";
import { isWorldDesignStudy } from "./art/design-mode";
import { resolveStudyTier } from "./art/study-radiance";
import { studyPixelRatio } from "./art/study-lighting";
import type { WorldEngine } from "./world-engine";

export function selectEnginePearl(this: WorldEngine, event: MouseEvent) {
  // The TV page has no controls to let go of a held bubble, so a tap (the one that turns the
  // chimes on) never holds one: the tour keeps playing.
  if (this.tv) return;
  if (this.arrivalState.phase !== "idle" || this.director.traveling) return;
  const rect = this.canvas.getBoundingClientRect(),
    ray = new THREE.Raycaster();
  ray.setFromCamera(
    new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    ),
    this.camera,
  );
  const hit = ray.intersectObjects(
    [...this.bubbles.hitTargets, ...this.world.recognitionPearls].filter(
      (pearl) => pearl.visible,
    ),
    false,
  )[0];
  const id = hit?.object.userData.recognitionId;
  if (
    typeof id === "string" &&
    this.feed.records.some((record) => record.id === id)
  ) {
    this.recognitions.select(id, this.feed.records);
    this.readingHeld = true;
    this.options.onSelection?.();
    this.report();
  }
}

export function resizeEngine(this: WorldEngine) {
  if (!this.alive || this.failed) return;
  const width = Math.max(1, this.canvas.clientWidth),
    height = Math.max(1, this.canvas.clientHeight);
  const tier = resolveStudyTier(this.quality, this.lowered);
  const low = tier === "low";
  if (isWorldDesignStudy()) {
    this.world.scene.userData.studyTier = tier;
    this.studyTier(low);
  }
  const pixels = low ? 1_050_000 : 2_600_000;
  const ratio = isWorldDesignStudy() ? studyPixelRatio(width, height, window.devicePixelRatio, this.quality, this.lowered) : Math.min(
    window.devicePixelRatio || 1,
    1.5,
    Math.sqrt(pixels / (width * height)),
  );
  this.renderer.setPixelRatio(ratio);
  this.renderer.setSize(width, height, false);
  if (this.radiance) {
    this.radiance.setTier(tier);
    this.renderer.getDrawingBufferSize(this.bufferSize);
    this.radiance.resize(this.bufferSize.x, this.bufferSize.y);
  }
  this.camera.aspect = width / height;
  this.camera.fov = width < height ? 63 : 43;
  this.camera.updateProjectionMatrix();
  this.dirty = true;
}

/**
 * Study only: publish the resolved picture quality tier on the scene, so the study
 * world can drop work on Low, and give Low a cheaper, wider shadow filter.
 *
 * three allocates the shadow render target once and only re-reads the orthographic
 * frustum when it allocates, so changing the map size means disposing the old target.
 */
export function applyEngineStudyTier(this: WorldEngine, low: boolean) {
  this.world.scene.userData.lowTier = low;
  const type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  if (this.renderer.shadowMap.type !== type) {
    this.renderer.shadowMap.type = type;
    // The shadow filter is baked into every compiled program, so every material
    // must recompile, or the scene keeps the old filter after a tier change.
    this.world.scene.traverse((object) => {
      const material = (object as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (!material) return;
      (Array.isArray(material) ? material : [material]).forEach((m) => {
        m.needsUpdate = true;
      });
    });
  }
  const sun = this.world.scene.userData.studySun as
    | THREE.DirectionalLight
    | undefined;
  if (!sun) return;
  // Low takes the 1024 map the design's drop order names, with the wider, cheaper filter
  // below. The shadow is softer there by intent, not by accident.
  const size = low ? 1024 : 2048;
  if (sun.shadow.mapSize.width !== size) {
    sun.shadow.mapSize.set(size, size);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
  sun.shadow.radius = low ? 3 : 1;
  this.renderer.shadowMap.needsUpdate = true;
}
