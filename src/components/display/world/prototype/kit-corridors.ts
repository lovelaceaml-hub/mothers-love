import type { WorldKit } from "../kit/kit-loader";
import type { DesignKitContext, KitBuilderHandle } from "./design-world";

/**
 * The corridors between the thirteen districts (WORLD-INTEGRATION 6.17): lantern posts at the
 * bridge ends, islets beside the long bridges, and the sky lanes along the two fast legs.
 *
 * Owned by lane K3b, as pure tables. Two entry points, both called by the design world only
 * with a kit:
 *
 * - `kitCorridorSites(kit)` runs first, before the clouds and the air are built: every islet
 *   the corridors will place, so it gets a cloud collar (`studyCloudLayout` extra sites) and a
 *   share of the drifting petals (`createStudyAir` centres) like every island.
 * - `applyKitCorridors(context)` runs with the district builder, before the static batch.
 *   `context.bridges` carries each bridge's deck curve.
 *
 * K0 stubs: no islets and no dressing, so the world is exactly the procedural study.
 */
export type KitCorridorSite = { center: readonly [number, number, number]; radius: number };

export function kitCorridorSites(kit: Pick<WorldKit, "has">): KitCorridorSite[] {
  void kit;
  return [];
}

export function applyKitCorridors(context: DesignKitContext): KitBuilderHandle | void {
  void context;
}
