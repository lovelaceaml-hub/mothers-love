import * as T from "three";
import { ZONES, seededRandom, type ZoneId } from "../../world-data";
import { studyTerrace } from "../study-geometry";
import type { DesignKitDistrict, Crowns } from "../design-world-types";
import type { DesignWorldBase } from "./base";
import type { DesignBuilders } from "./builders";

/** The thirteen district islands: keel, terraces, arch row, beds, trees, flowers and falls. */
export function designDistricts({ scene, mesh, stone, geometry, ivory, edge, ring, instance, cottonSphere, cotton, lawn, midPetal, leaf, stamp, finish }: DesignWorldBase, { islandShape, archRecord, arch, tree, flowers, waterfall }: Pick<DesignBuilders, "islandShape" | "archRecord" | "arch" | "tree" | "flowers" | "waterfall">) {
  const districtRoots = new Map<ZoneId, T.Group>();
  const districts = new Map<ZoneId, DesignKitDistrict>();
  ZONES.forEach((zone, i) => {
    const root = new T.Group(); root.name = `Design district: ${zone.id}`; root.position.fromArray(zone.center); scene.add(root); districtRoots.set(zone.id, root);
    const radius = i < 3 ? 17.8 : 13.8;
    mesh(root, islandShape, stone, [0, -.9, 0], [radius * 1.01, 1.25 + i % 3 * .2, radius * .97]);
    for (let layer = 0; layer < 3; layer++) {
      mesh(root, geometry(studyTerrace(radius - layer * .65, radius - layer * .65 + .2, .38)), layer === 2 ? ivory : edge, [0, -.35 + layer * .42, 0]);
      ring(root, radius - layer * .65 - .12, -.14 + layer * .42, .018);
    }
    ring(root, radius - 2.1, .69, .021); ring(root, radius - 2.4, .691, .009);
    const facing = Math.atan2(zone.eye[0] - zone.center[0], zone.eye[2] - zone.center[2]);
    const layout = new T.Group(); layout.rotation.y = facing; root.add(layout);
    const district: DesignKitDistrict = { zone, index: i, root, layout, radius, facing, arches: [], trees: [], beds: [], falls: [], landmark: [], figures: [] };
    districts.set(zone.id, district);
    if (zone.id !== "heart") {
      const arches = zone.id === "expressions" ? 5 : 3, width = zone.id === "expressions" ? 3.8 : 4.8;
      for (let k = 0; k < arches; k++) {
        const height = i < 3 ? 10.3 + (k === 1 ? 1.2 : 0) : 8.4;
        district.arches.push(archRecord(arch(layout, (k - (arches - 1) / 2) * width * 1.1, .65, -9.3, width, height), width, height));
      }
    }
    // One step deeper than D2's crowns (#e893b9, #f0a8b8, #bc92d9, #edb4ba), visual review 2026-09-23.
    const color = ["#e07fb0", "#ea96ad", "#b27fd4", "#e6a0b0"][i % 4];
    const crowns: Crowns = { mesh: instance(layout, cottonSphere, cotton, (i < 3 ? 4 : 2) * 15, true), used: 0 };
    for (const side of [-1, 1]) {
      // The lawn sits .01 above the ivory terrace top (y .68). At .68 exactly the two were
      // coplanar and fought for depth, which read as horizontal streaks through every bed.
      const bed = mesh(layout, geometry(new T.RingGeometry(7.6, i < 3 ? 14.7 : 11.5, 64, 2, side === 1 ? -.75 : Math.PI - .75, 1.50)), lawn, [0, .69, 0]);
      bed.rotation.x = -Math.PI / 2; district.beds.push(bed);
      const foliage = instance(layout, midPetal, leaf, 48);
      const random = seededRandom(i * 12 + side + 50);
      for (let j = 0; j < 48; j++) {
        const a = (side === 1 ? -.75 : Math.PI - .75) + random() * 1.5, r = 9 + random() * (i < 3 ? 4.8 : 2);
        stamp(foliage, j, new T.Vector3(Math.cos(a)*r, .69, -Math.sin(a)*r), [.52, .75, 1.05], new T.Euler(.45, random()*Math.PI*2, .08));
      } finish(foliage);
    }
    district.trees.push(tree(layout, -12.4, -2.8, i < 3 ? 1.16 : .95, 900 + i * 11, color, crowns));
    district.trees.push(tree(layout, 12.3, -6.9, i < 3 ? 1.10 : .92, 980 + i * 19, color, crowns));
    if (i < 3) {
      district.trees.push(tree(layout, -9.4, -11.5, .91, 1220 + i, "#f8dbd6", crowns));
      district.trees.push(tree(layout, 14.1, 6.3, .94, 1290 + i, color, crowns));
    }
    for (let k = 0; k < (i < 3 ? 4 : 2); k++) {
      const x = (k % 2 ? 1 : -1) * (10 + k * .5), z = 5 - Math.floor(k / 2) * 11;
      flowers(layout, i < 3 ? 26 : 15, 1440 + i * 17 + k, new T.Vector3(x, .68, z), 2.1, k % 2 ? "#dcbde3" : "#f4b9c9");
    }
    district.falls.push(waterfall(layout, -4.8, -radius + .35, Math.max(5.6, zone.center[1] + 5.3), 3.6, 0));
    district.falls.push(waterfall(layout, 6.7, -radius + 1.4, Math.max(5.6, zone.center[1] + 5.3), 2.1, -.15));
  });
  return { districtRoots, districts };
}
