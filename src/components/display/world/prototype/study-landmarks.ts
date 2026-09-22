import * as T from "three";
import { seededRandom } from "../world-data";
import type { StudyCloudSite } from "./study-clouds";

/**
 * Far landmark islands for the sample-only visual study.
 *
 * The reference artwork never shows an empty horizon: past the connected world
 * there are more terraces, domes and arches, dissolved into the haze. Each one sits
 * as close to the origin as the 70 unit clearance from every district allows, between
 * 158 and 193 units, because the study's linear fog reaches its far distance at 250
 * and a landmark placed further out is erased rather than hazed from the nearer
 * cameras. Nothing here touches the DOM and the layout is a pure function, so the
 * tests read it without a browser.
 */

export type StudyLandmarkSite = {
  center: [number, number, number];
  radius: number;
  domeRadius: number;
  columns: number;
  arches: number;
};

/** Distance from the origin, heading in xz, and height. Headings are normalised below. */
const PLACES: Array<[number, [number, number], number]> = [
  [193, [-.35, -.94], 18],
  [180, [-.62, -.78], 34],
  [185, [.05, -1], 30],
  [158, [-.85, -.5], 12],
  [159, [.45, -.9], 44],
  [182, [-.2, -.98], 52],
];

/** Deterministic: two calls return deep equal arrays, so a test can assert the placement. */
export function studyLandmarkLayout(): StudyLandmarkSite[] {
  const rand = seededRandom(3307);
  return PLACES.map(([distance, heading, height]) => {
    const length = Math.sqrt(heading[0] * heading[0] + heading[1] * heading[1]);
    return {
      center: [heading[0] / length * distance, height, heading[1] / length * distance] as [number, number, number],
      radius: 9 + rand() * 7,
      domeRadius: 4 + rand() * 3,
      columns: 4 + Math.min(2, Math.floor(rand() * 3)),
      arches: 1 + Math.min(1, Math.floor(rand() * 2)),
    };
  });
}

/** Each landmark also earns a cloud collar, so it floats like every nearer island. */
export function studyLandmarkCloudSites(layout: StudyLandmarkSite[]): StudyCloudSite[] {
  return layout.map(site => ({ center: site.center, radius: site.radius }));
}

/**
 * Everything the builder borrows from the study world, so this module owns no
 * materials of its own and every geometry still reaches the world's `dispose()`.
 */
export type StudyLandmarkKit = {
  geometry: <G extends T.BufferGeometry>(g: G) => G;
  ivory: T.Material;
  edge: T.Material;
  gold: T.Material;
  stone: T.Material;
  /** The shared unit cylinder, scaled per column and per drum. */
  cylinder: T.BufferGeometry;
  /** A coarse island keel: these are never seen closer than 190 units. */
  underside: T.BufferGeometry;
  terrace: (top: number, bottom: number, height: number, segments?: number) => T.BufferGeometry;
  arch: (parent: T.Object3D, x: number, y: number, z: number, width: number, height: number) => T.Object3D;
};

/**
 * One group holding every landmark. The caller adds it to the scene and runs the
 * world's static batcher over it, which collapses the whole horizon into one draw
 * call per material. Nothing here casts or receives a shadow: the sun's shadow
 * camera covers the connected world only, and a silhouette in the haze has no
 * shadow to show.
 */
export function createStudyLandmarks(layout: StudyLandmarkSite[], kit: StudyLandmarkKit) {
  const group = new T.Group();
  group.name = "Study landmarks";
  const rand = seededRandom(5521);

  function piece(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, position: number[], scale?: number[]) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = mesh.receiveShadow = false;
    parent.add(mesh);
    return mesh;
  }

  for (const site of layout) {
    const root = new T.Group();
    root.name = `Study landmark at ${site.center.map(value => Math.round(value)).join(", ")}`;
    root.position.fromArray(site.center);
    root.rotation.y = rand() * Math.PI * 2;
    group.add(root);

    // The keel, then the floating terrace disc it hangs from.
    // The stone shader reads local y, so the keel must stay out of the static batch
    // (batching bakes the site's world transform into the vertex positions).
    const keel = piece(root, kit.underside, kit.stone, [0, -.9, 0], [site.radius * 1.01, 1.05 + rand() * .45, site.radius * .97]);
    keel.userData.dynamic = true;
    piece(root, kit.geometry(kit.terrace(site.radius, site.radius + .3, .55, 48)), kit.ivory, [0, 0, 0]);
    piece(root, kit.geometry(new T.TorusGeometry(site.radius - .35, .07, 6, 72)), kit.gold, [0, .32, 0]).rotation.x = -Math.PI / 2;

    // A colonnade ringing the drum, the drum, and the dome it carries.
    const columnHeight = 4.6 + rand() * 2.8, ring = site.domeRadius + 1.5;
    for (let i = 0; i < site.columns; i++) {
      const angle = i / site.columns * Math.PI * 2;
      piece(root, kit.cylinder, kit.ivory, [Math.cos(angle) * ring, .28 + columnHeight / 2, Math.sin(angle) * ring], [.52, columnHeight, .52]);
      piece(root, kit.cylinder, kit.edge, [Math.cos(angle) * ring, .28 + columnHeight, Math.sin(angle) * ring], [.72, .22, .72]);
    }
    const drumHeight = 2.6 + rand() * 1.8;
    piece(root, kit.cylinder, kit.ivory, [0, .28 + drumHeight / 2, 0], [site.domeRadius * .96, drumHeight, site.domeRadius * .96]);
    piece(root, kit.geometry(new T.SphereGeometry(site.domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), kit.ivory, [0, .28 + drumHeight, 0]);
    piece(root, kit.cylinder, kit.gold, [0, .28 + drumHeight + site.domeRadius + .35, 0], [.16, .9, .16]);

    // One or two arches facing outward, the silhouette the reference reads by.
    for (let i = 0; i < site.arches; i++) {
      const angle = Math.PI * .25 + i * Math.PI * .9;
      const width = 4.6 + rand() * 1.8, height = 9 + rand() * 4;
      const at = site.radius - 3.2;
      const built = kit.arch(root, Math.cos(angle) * at, .3, Math.sin(angle) * at, width, height);
      built.rotation.y = -angle;
    }
  }
  return group;
}
