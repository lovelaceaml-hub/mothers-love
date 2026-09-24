import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ZONES, type ZoneId } from "../../world-data";
import type { LanternPoint } from "../study-glory";
import type { DesignKitBridge } from "../design-world-types";
import type { DesignWorldBase } from "./base";

/** The bridges between the districts, merged into one deck and one rail draw. */
export function designBridges({ geometry, mesh, scene, ivory, gold }: DesignWorldBase) {
  // Wide, continuously connected bridges, with a flat surface and thin metal rails.
  const connections: Array<[ZoneId, ZoneId]> = [["garden","heart"],["heart","expressions"],["garden","expressions"]];
  const connected = new Set<ZoneId>(["garden","heart","expressions"]);
  while (connected.size < ZONES.length) {
    let best: [ZoneId,ZoneId] | undefined, distance = Infinity;
    for (const from of ZONES.filter(z=>connected.has(z.id))) for (const to of ZONES.filter(z=>!connected.has(z.id))) {
      const d = new T.Vector3(...from.center).distanceTo(new T.Vector3(...to.center));
      if (d < distance) { distance=d; best=[from.id,to.id]; }
    }
    if (!best) break; connections.push(best); connected.add(best[1]);
  }
  // Section 7: the 13 decks become one mesh and the 26 rail tubes become one, so a corridor
  // costs two draw calls in total instead of 39. Both are already built in world space on a
  // scene with an identity transform, so no matrix is baked and no vertex moves.
  const deckParts: T.BufferGeometry[] = [], railParts: T.BufferGeometry[] = [];
  const railSamples: LanternPoint[][] = [];
  const bridges: DesignKitBridge[] = [];
  for (let i = 0; i < connections.length; i++) {
    const from = ZONES.find(z => z.id === connections[i][0])!, to = ZONES.find(z => z.id === connections[i][1])!;
    const a = new T.Vector3(...from.center).add(new T.Vector3(0, .6, 0)), b = new T.Vector3(...to.center).add(new T.Vector3(0, .6, 0));
    const direction = b.clone().sub(a); direction.y = 0; direction.normalize();
    a.addScaledVector(direction, ZONES.indexOf(from) < 3 ? 16.2 : 12.2);
    b.addScaledVector(direction, ZONES.indexOf(to) < 3 ? -16.2 : -12.2);
    const mid = a.clone().lerp(b, .5); mid.y += 2.4; mid.x += (i % 2 ? 1 : -1) * 4;
    const curve = new T.CatmullRomCurve3([a, mid, b]), positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    bridges.push({ from: from.id, to: to.id, curve, start: a, end: b });
    const rails: T.Vector3[][] = [[], []];
    for (let j = 0; j <= 48; j++) {
      const p = curve.getPoint(j / 48), tangent = curve.getTangent(j / 48), side = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
      for (const sign of [-1, 1]) { const q = p.clone().addScaledVector(side, 2.15 * sign); positions.push(q.x, q.y, q.z); normals.push(0,1,0); uvs.push(j / 48, sign === 1 ? 1 : 0); rails[sign === 1 ? 1 : 0].push(q.clone().add(new T.Vector3(0, .22, 0))); }
      if (j < 48) { const n=j*2;indices.push(n,n+2,n+1,n+1,n+2,n+3); }
    }
    const g = new T.BufferGeometry(); g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("normal",new T.Float32BufferAttribute(normals,3));g.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
    deckParts.push(g);
    rails.forEach(points => {
      railParts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points), 48, .045, 8, false));
      railSamples.push(points.map(p => [p.x, p.y, p.z] as LanternPoint));
    });
  }
  const mergedDecks = mergeGeometries(deckParts, false);
  // The merge can only fail on mismatched attributes, which 13 copies of one builder cannot
  // have, but the sources are registered rather than dropped if it ever does.
  if (mergedDecks) deckParts.forEach(g => g.dispose()); else deckParts.forEach(g => { geometry(g); mesh(scene, g, ivory); });
  if (mergedDecks) {
    const deck = mesh(scene, geometry(mergedDecks), ivory);
    // Named and put on the ray occluder layer here rather than by the material sweep below,
    // so the corridor keeps blocking shafts exactly as the 13 separate decks did.
    deck.name = "Study bridge decks"; deck.layers.enable(2);
  }
  const mergedRails = mergeGeometries(railParts, false);
  if (mergedRails) railParts.forEach(g => g.dispose()); else railParts.forEach(g => { geometry(g); mesh(scene, g, gold); });
  if (mergedRails) {
    const rail = mesh(scene, geometry(mergedRails), gold);
    rail.name = "Study bridge rails"; rail.layers.enable(1);
  }
  return { railSamples, bridges };
}
