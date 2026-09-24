/** The engine's lifecycle edges: a lost context, a hidden page, and disposal. WorldEngine calls these with itself as `this`. */
import type { WorldEngine } from "./world-engine";

export function engineContextLost(this: WorldEngine, event: Event) {
  event.preventDefault();
  this.failed = true;
  this.renderer.setAnimationLoop(null);
  this.options.onFailure();
}

export function engineVisibilityChanged(this: WorldEngine) {
  this.last = 0;
  this.reportAt = 0;
  this.windowFrames = 0;
  if (this.alive && !this.failed)
    this.renderer.setAnimationLoop(document.hidden ? null : this.tick);
}

export function disposeEngine(this: WorldEngine) {
  this.alive = false;
  this.renderer.setAnimationLoop(null);
  this.observer.disconnect();
  document.removeEventListener("visibilitychange", this.visibilityChanged);
  this.canvas.removeEventListener("webglcontextlost", this.contextLost);
  this.canvas.removeEventListener("click", this.selectPearl);
  this.radiance?.dispose();
  this.hosts?.dispose();
  this.world.dispose();
  this.bubbles.dispose();
  // After the world: its placements share the kit's geometry, and the kit ends the decoder.
  this.kit?.dispose();
  this.environment.dispose();
  this.renderer.dispose();
  this.renderer.forceContextLoss();
}
