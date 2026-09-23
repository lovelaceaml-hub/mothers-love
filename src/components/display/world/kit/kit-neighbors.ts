import type { ArrivalState } from "../arrival-director";
import type { ZoneId } from "../world-data";
import type { DesignKitContext, KitBuilderHandle } from "../prototype/design-world";

/**
 * Rigged neighbors in the design world (WORLD-INTEGRATION section 5): two actors per zone,
 * one clock and one schedule shared with the accessible sentence (`neighborSchedule` in
 * `neighbor-dialogue.ts`), the heart hand off, and one `AnimationMixer` per actor advanced by
 * the world delta (zero while paused, under reduced motion or in Still).
 *
 * Owned by lane K4. The design world calls this once, with a kit, before the static batch.
 * Returning a handle means the neighbors stand in the world: the design world then marks
 * `scene.userData.studyNeighbors`, the engine reports `kitNeighbors`, and the builder should
 * remove the static miniature figures it replaces (`context.districts.get(id).figures`)
 * before the batch. Returning `undefined` (any neighbor asset missing, design 5.3) keeps the
 * figures and the "Miniature figures" sentence, so nothing regresses.
 *
 * K0 stub: no neighbors.
 */
export type KitNeighbors = KitBuilderHandle & {
  /** Every frame the world updates: the world clock, the director's zone and the arrival state. */
  update(time: number, zone: ZoneId, arrival: ArrivalState | undefined): void;
  setEffects(sparkles: boolean, trails: boolean): void;
  dispose(): void;
};

export function createKitNeighbors(context: DesignKitContext): KitNeighbors | undefined {
  void context;
  return undefined;
}
