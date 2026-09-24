import { createWorldScene as createLegacyWorldScene } from "./world-scene-legacy";
import { attachCinematicArt } from "./world-cinematic-art";
import { isWorldDesignStudy, worldArt } from "./prototype/design-mode";
import { createDesignWorld } from "./prototype/design-world";
import type { WorldKit } from "./kit/kit-loader";
export type { WorldScene } from "./world-scene-legacy";

/**
 * The world's three looks. The design look is the default (Plan 28 Section 5); the existing
 * public data, camera and reading contracts are unchanged. The 3D Studio kit only ever reaches
 * the design look; classic and cinematic never see it.
 */
export function createWorldScene(kit?: WorldKit) {
  if (isWorldDesignStudy()) return createDesignWorld(kit);
  const world = createLegacyWorldScene();
  // Explicit fallbacks: `?art=classic` is the plain world, `?art=cinematic` adds the art pass.
  if (typeof window !== "undefined" && worldArt() === "classic") return world;
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
