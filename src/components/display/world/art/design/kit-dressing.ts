import type * as T from "three";
import type { ZoneId } from "../../world-data";
import type { WorldKit } from "../../kit/kit-loader";
import { applyKitDistricts } from "../kit-districts";
import { applyKitCorridors } from "../kit-corridors";
import { createKitNeighbors, type KitNeighbors } from "../../kit/kit-neighbors";
import { applyTvForeground, applyTvPalette } from "../tv-foreground";
import type {
  KitBuilderHandle, DesignKitContext, DesignKitArch, DesignKitBridge, DesignKitDistrict,
} from "../design-world-types";
import type { DesignWorldBase } from "./base";
import type { DesignBuilders } from "./builders";

/** The 3D Studio kit's builders, and the TV page's palette. */
export function designKitDressing({ scene, time, geometry, material, texture, instance, stamp, finish, mesh, ring, tube, motions, ivory, edge, gold, rose, roseGold, leaf, lawn, stone, bloom, cotton, farPetal, tv }: DesignWorldBase, { kit, arch, contact, waterfall, falls, districts, water, silkMat, shadow, fall, archCrowns, bridges, entry, landmarks, grove, groveSites, sanctuary, arcade, arcadeArches, heartRoot, sparkleDot }: Pick<DesignBuilders, "arch" | "contact" | "waterfall" | "falls" | "shadow" | "fall" | "archCrowns"> & {
  kit: WorldKit | undefined; districts: Map<ZoneId, DesignKitDistrict>; water: T.MeshPhysicalMaterial; silkMat: T.MeshPhysicalMaterial;
  bridges: DesignKitBridge[]; entry: T.Group; landmarks: T.Group; grove: T.Group; groveSites: Array<{ x: number; z: number; group: T.Group; column: T.Mesh }>;
  sanctuary: T.Group; arcade: T.Group; arcadeArches: DesignKitArch[]; heartRoot: T.Group; sparkleDot: T.DataTexture;
}) {
  // Plan 26: the 3D Studio kit dresses the world here, once every procedural piece exists and
  // before the falls merge and the static batch, so kit pieces merge by material identity like
  // the rest. Only with a kit: under `?kit=off`, or when the kit failed, nothing below runs and
  // the world is exactly the procedural study.
  const kitHandles: KitBuilderHandle[] = [];
  if (kit) {
    const kitContext: DesignKitContext = {
      kit, scene, time, geometry, material, texture, instance, stamp, finish, mesh, ring, tube, arch, contact,
      waterfall: (parent, x, z, height, width, rotation) => { waterfall(parent, x, z, height, width, rotation); },
      removeFall: plane => {
        const at = falls.indexOf(plane);
        if (at < 0) return;
        falls.splice(at, 1); plane.removeFromParent(); plane.geometry.dispose();
        districts.forEach(district => {
          for (const list of [district.falls, district.landmark]) { const own = list.indexOf(plane); if (own >= 0) list.splice(own, 1); }
        });
      },
      motion: fn => { motions.push(fn); },
      palette: { ivory, edge, gold, rose, roseGold, leaf, lawn, stone, bloom, water, silk: silkMat, cotton, shadow, fall },
      districts, archCrowns, bridges, entry, landmarks,
      grove: { root: grove, sites: groveSites },
      sanctuary: { root: sanctuary, arcade, arches: arcadeArches, heart: heartRoot },
      sparkleDot, farPetal,
    };
    const districtHandle = applyKitDistricts(kitContext);
    if (districtHandle) kitHandles.push(districtHandle);
    // Neighbors stand in for the miniature figures; the engine reports it so the host can
    // switch its accessible sentence from the figures to the dialogue.
    const neighbors: KitNeighbors | undefined = createKitNeighbors(kitContext);
    if (neighbors) { kitHandles.push(neighbors); scene.userData.studyNeighbors = true; }
    const corridorHandle = applyKitCorridors(kitContext);
    if (corridorHandle) kitHandles.push(corridorHandle);
    // PLAN-01 Section 5 step 3: the TV page's denser foreground, the Garden first.
    if (tv) {
      const tvHandle = applyTvForeground(kitContext);
      if (tvHandle) kitHandles.push(tvHandle);
    }
  }
  // The TV page's pearl white stone, gold and pastel blossom, on the shared materials.
  if (tv) applyTvPalette({ ivory, edge, gold, rose, roseGold, leaf, lawn, stone, bloom, water, silk: silkMat, cotton, shadow, fall });
  return { kitHandles };
}
