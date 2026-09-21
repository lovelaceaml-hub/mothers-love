import { createWorldScene as createLegacyWorldScene } from "./world-scene-legacy";
import { attachCinematicArt } from "./world-cinematic-art";
import { isWorldDesignStudy } from "./prototype/design-mode";
import { createDesignWorld } from "./prototype/design-world";
export type { WorldScene } from "./world-scene-legacy";

/** Preview-only art pass. The existing public data, camera and reading contracts are unchanged. */
export function createWorldScene() {
  if (isWorldDesignStudy()) return createDesignWorld();
  const world = createLegacyWorldScene();
  // Simple, explicit visual rollback for comparison on the preview branch.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("art") === "classic") return world;
  let art: ReturnType<typeof attachCinematicArt>;
  try {
    art = attachCinematicArt(world.scene);
  } catch (error) {
    console.error("Cinematic art initialization failed", error);
    world.dispose();
    throw error;
  }
  return {
    ...world,
    update(...args: Parameters<typeof world.update>) {
      world.update(...args);
      art.update(args[0], args[1]);
    },
    setEffects(sparkles: boolean, trails: boolean) {
      world.setEffects(sparkles, trails);
      art.setEffects(sparkles, trails);
    },
    dispose() {
      art.dispose();
      world.dispose();
    },
  };
}
