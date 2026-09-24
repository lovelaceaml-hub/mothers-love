/** The design world's contract with the kit builders, and its crown record. */
import * as T from "three";
import type { WorldZone, ZoneId } from "../world-data";
import type { ArrivalState } from "../arrival-director";
import type { WorldKit } from "../kit/kit-loader";

/**
 * What a kit builder may hand back: per frame work on the world clock, the owner's effect
 * switches, and its own disposal. The design world calls each part it finds.
 */
export type KitBuilderHandle = {
  update?(time: number, zone: ZoneId, arrival: ArrivalState | undefined): void;
  setEffects?(sparkles: boolean, trails: boolean): void;
  dispose?(): void;
};
/** One procedural arch as the study built it, so a builder can replace it in place. */
export type DesignKitArch = {
  root: T.Group;
  parent: T.Object3D;
  width: number;
  height: number;
  /** Its keystone lantern in `archCrowns`, or null where the arch opted out of lanterns. */
  crown: { root: T.Group; height: number } | null;
};
/** One of the thirteen districts, in the frame of section 6.1 of the design. */
export type DesignKitDistrict = {
  zone: WorldZone;
  /** Index in `ZONES`; the first three are the large islands. */
  index: number;
  /** At `zone.center`. */
  root: T.Group;
  /** The district local frame: `root` turned by `facing`, +z toward the tour eye, +x to its right. */
  layout: T.Group;
  radius: number;
  facing: number;
  /**
   * Every procedural arch in the district: the row at local z -9.3 in `layout` (three, five at
   * the grove, none at the Sanctuary, whose arcade is `sanctuary.arches`), then the welcome
   * portal or the featured ring of five, which `landmark` lists too.
   */
  arches: DesignKitArch[];
  /** Cotton crowned tree roots (trunks and branches; the crowns are one instanced draw per district). */
  trees: T.Group[];
  /** The two lawn bed arcs. */
  beds: T.Mesh[];
  /**
   * Waterfall planes in this district: the two off the back edge, then the milestone's five
   * tier falls (also in `landmark`). `removeFall` takes one out before the falls merge.
   */
  falls: T.Mesh[];
  /** The zone's own procedural landmark pieces (globe and rings, tiers, orbits, boxes, portal, pavilion arches, drums, slabs). */
  landmark: T.Object3D[];
  /** The two miniature figures (garden, heart and expressions only). */
  figures: T.Group[];
};
export type DesignKitBridge = {
  from: ZoneId;
  to: ZoneId;
  /** The deck centre line in world space, from `start` at the first island's edge to `end`. */
  curve: T.CatmullRomCurve3;
  start: T.Vector3;
  end: T.Vector3;
};
/**
 * Everything the design world hands the kit builders (Plan 26 lanes K3a, K3b and K4), so
 * they can place kit pieces, replace procedural ones in place and register every geometry,
 * material and texture for disposal, without editing this file. Builders run once, after the
 * whole procedural world exists and before the falls merge and the static batch, so whatever
 * they add is merged by material identity like the rest. They are called only with a kit;
 * with `?kit=off` or a failed kit none of this is built.
 */
export type DesignKitContext = {
  kit: WorldKit;
  scene: T.Scene;
  /** The shared study clock uniform. */
  time: { value: number };
  geometry: <G extends T.BufferGeometry>(g: G) => G;
  material: <M extends T.Material>(m: M) => M;
  texture: <X extends T.Texture>(t: X) => X;
  instance: (parent: T.Object3D, g: T.BufferGeometry, m: T.Material, count: number, shadow?: boolean) => T.InstancedMesh;
  stamp: (target: T.InstancedMesh, i: number, p: T.Vector3, s: number[], rotation: T.Euler, color?: T.Color | string) => void;
  finish: (o: T.InstancedMesh) => void;
  mesh: (parent: T.Object3D, g: T.BufferGeometry, m: T.Material, p?: number[], scale?: number[]) => T.Mesh;
  ring: (parent: T.Object3D, r: number, y: number, thickness?: number, m?: T.Material) => T.Mesh;
  tube: (parent: T.Object3D, points: T.Vector3[], r: number, m?: T.Material, segments?: number) => T.Mesh;
  /** A procedural arch, lantern crowned unless told otherwise. */
  arch: (parent: T.Object3D, x: number, y: number, z: number, width: number, height: number, contacts?: boolean, detail?: number, lanterns?: boolean) => T.Group;
  contact: (parent: T.Object3D, x: number, z: number, width: number, depth: number, y?: number) => void;
  /** A waterfall plane on the study shader; it joins the one merged falls mesh. */
  waterfall: (parent: T.Object3D, x: number, z: number, height: number, width: number, rotation: number) => void;
  /** Take a procedural waterfall plane out of the world before the merge. */
  removeFall: (plane: T.Mesh) => void;
  /** A per frame motion on the world clock, run once at 0 before batching. */
  motion: (fn: (time: number) => void) => void;
  /** The study's shared materials; the kit remap maps onto these (`kit-materials.ts`). */
  palette: {
    ivory: T.Material; edge: T.Material; gold: T.Material; rose: T.Material; roseGold: T.Material;
    leaf: T.Material; lawn: T.Material; stone: T.Material; bloom: T.Material; water: T.Material;
    silk: T.Material; cotton: T.Material; shadow: T.Material; fall: T.Material;
  };
  districts: ReadonlyMap<ZoneId, DesignKitDistrict>;
  /** Keystone lanterns, read after batching: push a crown for a new arch, splice out a removed one. */
  archCrowns: Array<{ root: T.Group; height: number }>;
  bridges: readonly DesignKitBridge[];
  /** The arrival stage platform at `(4.138, .6, 19.104)`. */
  entry: T.Group;
  /** The six far horizon islands. */
  landmarks: T.Group;
  grove: { root: T.Group; sites: ReadonlyArray<{ x: number; z: number; group: T.Group; column: T.Mesh }> };
  sanctuary: { root: T.Group; arcade: T.Group; arches: DesignKitArch[]; heart: T.Group };
  sparkleDot: T.Texture;
  farPetal: T.BufferGeometry;
};

/** One district shares a single cotton mesh, so every crown in it costs one draw call together. */
export type Crowns = { mesh: T.InstancedMesh; used: number };
