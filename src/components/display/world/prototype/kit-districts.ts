import type { DesignKitContext, KitBuilderHandle } from "./design-world";

/**
 * The thirteen districts dressed with the 3D Studio kit (WORLD-INTEGRATION section 6).
 *
 * Owned by lane K3a (the builder, with the placement tables in `kit-layout-core.ts` and
 * `kit-layout-far.ts`). The design world calls this once, with a kit, after every procedural
 * piece exists and before the falls merge and the static batch. A builder replaces a
 * procedural piece only when `context.kit.has(id)` is true for its kit piece, so every missing
 * id keeps its procedural piece (Plan 24 P2). Every geometry, material and texture it creates
 * goes through the context registrars so the world's `dispose()` reaches it. It may return a
 * handle for per frame work on the world clock, the owner's effect switches and disposal.
 *
 * K0 stub: no op. With it the kit dressed world draws exactly what `?kit=off` draws.
 */
export function applyKitDistricts(context: DesignKitContext): KitBuilderHandle | void {
  void context;
}
