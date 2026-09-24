/** The seven near zone placement tables: welcome, garden, featured, heart, expressions, peacemakers and practice. */
import {
  type KitPlacement,
  type ZoneLayout,
  type KitBox,
  KIT_BOUNDS,
  STAIR,
  PAVILION,
  TERRACE_TOP,
} from "./kit-layout-shapes";
import { figureStands, archRow, arcadeRow } from "./kit-layout-geometry";

const rose = (x: number, z: number, scale: number, spin: number, note?: string): KitPlacement => ({
  id: "nature.rose-bush", position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note,
});
const hydrangea = (x: number, z: number, scale: number, spin: number, note?: string): KitPlacement => ({
  id: "nature.hydrangea-bush", position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, note,
});
const lantern = (x: number, z: number, note?: string, y = 0.7): KitPlacement => ({
  id: "landmark.lantern-post", position: [x, y, z], scale: 1.15, role: "static", note,
});
const bench = (x: number, z: number, yaw: number, note?: string, y = 0.7): KitPlacement => ({
  id: "landmark.garden-bench", position: [x, y, z], rotationY: yaw, scale: 1.35, role: "static", note,
});
/** People stand on their base: the files are centred, so the position lifts them half their height. */
const person = (id: string, x: number, z: number, yaw: number, y = 0.7, note?: string): KitPlacement => ({
  id, position: [x, y - KIT_BOUNDS[id].min[1], z], rotationY: yaw, role: "instanced", detail: "near", note,
});
const degrees = (value: number) => (value * Math.PI) / 180;

/**
 * Butterfly Gate (design 6.4). The kit gate stands on a raised round platform reached by a
 * wide stair, as `zone-welcome.png` draws it, with pearl columns either side, crystal
 * clusters at the foot of the stairs in the frame's three colours (the W3 crystals exist, so
 * the stretched pearl stand in is not needed), blossom trees framing the gate from the front
 * corners (the design's spots coincide with the cotton trees, which stay), a blank tablet,
 * lantern posts, and twenty four kit butterflies on a helix that turns once a minute. The
 * gate file has no door clip, so the gate stands open and the butterflies stream through.
 */
function welcomeLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    ...archRow("welcome"),
    { id: "arrival.butterfly-gate", position: [0, 1.9, -6.3], scale: 13 / 6.14, role: "static", replaces: "landmark", contact: [9.5, 3.2], note: "the gate, 13 tall, on the platform, open side to the camera" },
    { id: "landmark.pearl-stairs", position: [0, 0.6, 1.1], scaleXYZ: [2, 1.3 / STAIR.tread, 1.1], role: "static", contact: [7, 4.4], note: "the fan of stairs up to the platform: its landing runs a unit into the drum at the platform's height (the stair climbs toward -z)" },
    { id: "landmark.pearl-column", position: [-7.2, 0.6, -3], scale: 1.5, role: "static", note: "column flanking the platform" },
    { id: "landmark.pearl-column", position: [7.2, 0.6, -3], scale: 1.5, role: "static", note: "column flanking the platform" },
    { id: "landmark.stone-tablet", position: [9.5, 0.7, 1], rotationY: -0.6, role: "static", note: "blank tablet; the tagline and count stay in the DOM card" },
    { id: "nature.blossom-tree-b", position: [-11.5, 0.7, 5], rotationY: 0.3, scale: 1.15, role: "static", contact: [7, 5.5], note: "front left corner tree" },
    { id: "nature.blossom-tree-a", position: [12, 0.7, 3], rotationY: -0.4, scale: 1.15, role: "static", contact: [6.5, 5.5], note: "front right corner tree" },
    lantern(-8.8, 7.2, "forecourt post"),
    lantern(8.8, 7.2, "forecourt post"),
  ];
  const crystals: Array<[string, number, number, number, number]> = [
    ["nature.crystal-pink", 5.6, 3.8, 1.2, 0.3], ["nature.crystal-blue", 4.6, 4.7, 0.9, 1.4], ["nature.crystal-lavender", 6.5, 4.8, 0.8, 2.6],
    ["nature.crystal-lavender", -5.5, 4.0, 1.1, 0.8], ["nature.crystal-pink", -4.5, 4.8, 0.8, 2.1], ["nature.crystal-blue", -6.4, 4.9, 0.75, 3.4],
    ["nature.crystal-pink", -8.2, -1.2, 1.0, 1.1], ["nature.crystal-lavender", -7.4, -0.2, 0.9, 2.9],
  ];
  crystals.forEach(([id, x, z, scale, spin], k) => placements.push({
    id, position: [x, 0.7, z], rotationY: spin, scale, role: "instanced", detail: true, effect: "sparkles", note: `crystal ${k + 1} of ${crystals.length}`,
  }));
  return {
    zone: "welcome",
    placements,
    platforms: [{ center: [0, 0.6, -5.5], radius: 5.6, height: 1.3 }],
    swarms: [{ id: "arrival.butterfly", count: 24, center: [0, 1.9, -6.3], radius: [2.2, 8], height: [3, 15], turnSeconds: 60, scale: 2 }],
  };
}

/**
 * Garden of Kindness (design 6.5), after the coordinator's checkpoint notes. The lily pond
 * sits at the island centre under the arriving pearl's landing (world 26, 5, 16 is local 0,
 * 5, 0) with a large lit lotus at its left, under the pearl's lower left rim, and pads
 * around it (the medallion ring sweeps the water under the pearl itself); one
 * continuous stone path leads from the front left forecourt to the pond rim; the blossom
 * tree climbs the far left edge so only its crown overhangs the headline; both benches face
 * the pond; rose bushes fill both bed arcs and a low hedge frames the pond from below, with
 * the procedural disc flowers hidden so one flower vocabulary reads. Bushes and furniture
 * stay 2.5 units off the neighbors' anchor and off the miniature figures' feet, and no bush
 * stands behind the headline column from the tour eye (the kit off lawn read cleanly there).
 *
 * The island's back left quarter lies inside the entry stage reservation (6.2: 12 units
 * around the arrival stage, which is 22 units from the Garden centre), so the tree stands at
 * the front left edge rather than the design's (-13.5, .7, 1), and the left bed keeps to the
 * strip of lawn between the stage's cylinder and the figures.
 */
function gardenLayout(): ZoneLayout {
  const pond: [number, number, number] = [-0.6, 0.7, -0.6];
  const placements: KitPlacement[] = [
    ...archRow("garden"),
    bench(-5.8, 9.6, 0.9, "left bench, in front of the figures and right of the headline, facing the pond"),
    bench(9.3, 6.8, -1.0, "right bench, angled to the pond, its seat above 1080p y 740 and clear of the control cluster"),
    lantern(-6.3, 13.3, "forecourt post, left of the stone path"),
    lantern(14, 5, "forecourt post"),
    { id: "nature.blossom-tree-c", position: [-14.6, 0.7, 7], rotationY: 0.4, scale: 1, role: "static", contact: [6.5, 5], note: "far left edge at scale 1, so the trunk climbs the frame edge and only the crown overhangs the headline (checkpoint note 1; the suggested spot enters the entry stage cap)" },
    { id: "nature.stepping-stones", position: [-3.65, 0.62, 12.66], rotationY: 1.2, role: "instanced", detail: true, note: "path from the forecourt, rims sunk into the floor" },
    { id: "nature.stepping-stones", position: [-2.5, 0.62, 8.0], rotationY: 1.45, role: "instanced", detail: true, note: "path to the pond rim (ends about -2.2, 5.6)" },
    { id: "arrival.lotus-bloom", position: [-3.5, 0.66, 1.0], rotationY: 0.6, scale: 1.6, role: "animated", clip: { name: "bloom", at: 1 }, under: true, footprint: "round", halo: { color: "#ffd2a4", scale: 5.5, opacity: 0.4, lift: 0.5 }, note: "open lotus on the left of the pond, its petals reaching to the hero disc's lower left rim from the tour eye, lit from below; the medallion ring sweeps down to .88 a unit right of it (the layout test governs)" },
  ];
  // Lily pads around the pond (bearings from +x toward +z, so 90 faces the camera): the far
  // side, the right, and the left, where the medallion reach allows them (the layout test
  // governs); the near right is the pearl's own water and the lotus takes the near left.
  for (const [k, bearingDegrees] of [114, 186, 226, 268, 310, 350].entries()) {
    const bearing = degrees(bearingDegrees);
    placements.push({
      id: "nature.lily-pads",
      position: [pond[0] + Math.cos(bearing) * 4.6, 0.71, pond[2] + Math.sin(bearing) * 4.6],
      rotationY: -bearing + Math.PI / 2 + (k % 2 ? 0.3 : -0.2),
      scale: 0.9,
      tint: "#e8f2c9",
      role: "instanced",
      detail: true,
      note: `lily pads ${k + 1} of 6`,
    });
  }
  const roses: Array<[number, number, number, number]> = [
    // Right arc.
    [13, -5, 1.4, 0.3], [12.5, 0.5, 1.5, 2.1], [12.8, 2.2, 1.4, 1.1], [10.5, 4, 1.4, 0.6], [9.6, 1.2, 1.6, 0.3], [8, 10.8, 1.3, 1.9], [9.4, 12.6, 1.3, 2.7],
    // Left arc: the back left quarter is the entry stage's, the figures stand at the front,
    // and the headline column (1080p x 60 to 460, y 700 to 930 from the tour eye) stays
    // clear of bushes, so the bed sits on the back left lawn above the eyebrow line (local z
    // under 2.5 there), one bush right of the title beside the figures, and two along the
    // far edge of the pond.
    [-10, 0, 1.4, 0.4], [-12.4, 2.4, 1.4, 2.6], [-7.6, -1.8, 1.4, 1.7], [-10.9, 1.4, 1.3, 1.5], [-8.3, 9.3, 1.3, 2.2], [-3.6, -7.0, 1.3, 0.9],
    // The low hedge along the near edge, either side of the stone path; the left three land
    // below the subtitle line, behind the navigation row's scrim.
    [4.4, 13.2, 0.9, 0.5], [6.2, 13.9, 0.9, 1.7], [8.0, 13.0, 0.9, 2.9], [-10.2, 13.4, 0.9, 1.2], [-8.2, 13.6, 0.9, 2.4], [-12.0, 12.2, 0.9, 0.2],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [
    [11.2, -2.6, 1.4, 0.5], [9.4, -8.2, 1.3, 2.8], [12.2, 7.2, 1.3, 1.6], [-7.2, -4.2, 1.3, 0.9], [-5.4, -6.4, 1.3, 0.2],
  ];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return {
    zone: "garden",
    placements,
    pools: [{ center: pond, radius: 5.6, rim: true }],
    stands: figureStands("garden"),
    hideFlowers: true,
  };
}

/**
 * Pearl Pavilion (design 6.6, horseshoe rule). The delivered file is the horseshoe (its
 * manifest entry lists the column bearings), so the fallback ring placement is not built.
 * The pavilion stands on the hero pearl's ground point, nudged toward the front left, with
 * its column ring at the design's radius 9 (3.5 times the file) and its height stretched to
 * 3.9 times (the ring beam's underside at 17, the glass apex at 25.5, the concept frame's
 * tall bullet dome), the two numbers that let its six columns keep clear of the medallion
 * reach on a TV and on a phone while its beam clears the back right resident pearl's ring.
 *
 * The file brings its own floor, a stepped drum .44 up (radius 3.35, 3.04 at its top) with
 * gold rings and a blush inlay on top: the pavilion is sunk so that top lies .04 above the
 * terrace, the design's inlaid floor, and the drum's sides hide inside the island. The hero
 * pearl's medallions orbit down to .88 above the district in landscape, so no floor may
 * rise higher than the terrace it replaces (the layout test sweeps the ring through the
 * whole reading arc in both screen layouts). With the floor flush there is no rise for the
 * design's stair, so it is not placed; the bench sits on the floor at the front left facing
 * the pearl, lantern posts flank the forecourt, and the beds and trees keep to the crescent
 * of terrace outside the floor. The practice zone's eye sits 17 units off the back right
 * edge at y 11, so nothing tall stands there. The five procedural ring arches go.
 */
export const PAVILION_FLOOR = { base: 3.35, top: 3.04 } as const;
/** The pavilion's placement: column ring radius 9.2, height 3.9 times the file, floor top .04 above the terrace. */
export const PAVILION_PLACEMENT = { x: 2.1, z: 5.6, scaleXZ: 3.5, scaleY: 3.9, floorTop: TERRACE_TOP + 0.04 } as const;
function featuredLayout(): ZoneLayout {
  const { x, z, scaleXZ, scaleY, floorTop } = PAVILION_PLACEMENT;
  const pavilion: KitPlacement = {
    id: "landmark.pearl-pavilion-horseshoe",
    position: [x, floorTop - PAVILION.floor * scaleY, z],
    scaleXYZ: [scaleXZ, scaleY, scaleXZ],
    role: "static",
    replaces: "landmark",
    footprint: "round",
    encloses: true,
    note: "the gazebo around the hero pearl, open side to the camera, columns at radius 9.2, sunk so its floor drum's top is the inlaid floor .04 above the terrace",
  };
  const placements: KitPlacement[] = [
    ...archRow("featured"),
    pavilion,
    lantern(-11, 7.8, "forecourt post, left"),
    lantern(-11.3, 3.0, "forecourt post, left, at the floor's edge"),
    lantern(11.4, 7.6, "forecourt post, right"),
    bench(-8.4, 9.2, 1.2, "bench on the pavilion floor at the front left, facing the pearl", floorTop),
    { id: "nature.blossom-tree-a", position: [-12, 0.7, -2.5], rotationY: 0.5, scale: 1.1, role: "static", contact: [6.5, 5.5], note: "left corner tree (design 6.6)" },
    { id: "nature.blossom-tree-a", position: [12.5, 0.7, -1], rotationY: -0.6, scale: 1.1, role: "static", contact: [6.5, 5.5], note: "right corner tree, on the crescent outside the floor, clear of the practice eye" },
  ];
  const roses: Array<[number, number, number, number]> = [
    [-11.4, 3.4, 1.3, 0.3], [-11.8, -3.6, 1.4, 1.2], [-10.6, -6.2, 1.3, 2.4], [-8.2, -8.6, 1.3, 0.7], [-4, -7.6, 1.2, 1.9],
    [4, -7.6, 1.2, 0.4], [8.4, -9, 1.3, 1.6], [11, -5, 1.4, 2.8], [12, -3, 1.3, 0.9], [-11.4, 5.4, 1.2, 2.1],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[-12.4, 1, 1.3, 0.5], [-9.6, -4.4, 1.3, 2.2], [10.2, -6.9, 1.3, 1.1], [-6.4, -9, 1.2, 2.9]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return { zone: "featured", placements, hideFlowers: true };
}

/**
 * Heart Sanctuary (design 6.7). The supplied original heart, the silk ribbons, the terraces,
 * the halo and the sparkles stay; the seven procedural arcade arches become kit arches in
 * the arcade frame; roses ring the terraces with a gap toward the camera; two lantern posts
 * and a bench dress the forecourt; five small kit hearts float on slow bobs, sparkle class.
 * The petals rise here instead of falling (`study-air.ts`).
 */
function heartLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    ...arcadeRow(),
    lantern(-12.5, 3, "forecourt post, left, above the headline"),
    lantern(11, 9, "forecourt post"),
    bench(10, 9.5, -0.7, "bench at the right of the forecourt (the left is the headline's)"),
  ];
  // The ring keeps a 60 degree gap toward the camera; the two front left bushes step out to
  // radius 13 because the miniature figures stand at the front left of the terraces.
  for (const [k, [bearingDegrees, radius]] of ([[47, 10.2], [70, 10.2], [93, 10.2], [116, 10.2], [139, 10.2], [162, 10.2], [-50, 13], [-74, 13], [-93, 10.2], [-116, 10.2], [-139, 10.2], [-162, 10.2]] as const).entries()) {
    const bearing = degrees(bearingDegrees);
    placements.push(rose(Math.sin(bearing) * radius, Math.cos(bearing) * radius, 1.3 + (k % 3) * 0.1, k * 0.9, `rose bush ${k + 1} of 12 on the terrace ring`));
  }
  const hearts: Array<[number, number, number]> = [[-8, 7, 3], [-9.5, 8.5, 5.5], [-7, 6, -2], [9.5, 6, -3], [10.5, 6.5, -2]];
  hearts.forEach(([x, y, z], k) => placements.push({
    id: "core.heart", position: [x, y, z], rotationY: k * 1.3, scale: 0.6, role: "instanced", effect: "sparkles", bob: { amplitude: 0.35, rate: 0.5 + k * 0.07, phase: k * 1.7 }, note: `floating heart ${k + 1} of 5`,
  }));
  return { zone: "heart", placements, stands: figureStands("heart"), hideFlowers: true };
}

/**
 * Nine Expressions Grove (design 6.8). Each ivory column becomes a kit pearl column 4.25
 * tall in the grove's root frame, with the canonical icon disc kept at y 5.15 on its front
 * (Plan 24 protects the disc) and the Plan 01 expression piece above it. The nine pieces
 * share one draw; the selected one rises and turns and carries a halo. The five arches stay
 * as kit arches; the grove's four cotton trees are its trees.
 *
 * The pieces float at y 11.4 at scale 1.4 rather than the design's 6.9 at 1.6: from the
 * tour eye the grove reads in perspective, so a piece just above a front column projected
 * over the discs of the columns behind it (the design's own numbers cover three discs, the
 * first of them the default expression's). At 11.4 every piece clears every disc for every
 * reading arc camera, including its own bob and the selected piece's rise, which the
 * layout test proves by projection (`GROVE_PIECES`).
 */
export const GROVE_PIECES = { y: 11.4, scale: 1.4, yaw: 0.48 } as const;
function expressionsLayout(): ZoneLayout {
  const placements: KitPlacement[] = [...archRow("expressions")];
  const pieces = ["expression.01-hello-bubble", "expression.02-gift-box", "expression.03-mended-heart", "expression.04-comfort-cloud", "expression.05-open-door", "expression.06-teacup", "expression.07-candle", "expression.08-helping-hand", "expression.09-star"];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 1.6, x = Math.cos(a) * 10.5, z = Math.sin(a) * 9.3;
    placements.push({ id: "landmark.pearl-column", position: [x, 0.675, z], scaleXYZ: [1.1, 4.25 / 4, 1.1], role: "static", replaces: "column", column: i, frame: "root", note: `grove column ${i + 1} of 9` });
    placements.push({ id: pieces[i], position: [x, GROVE_PIECES.y, z], rotationY: GROVE_PIECES.yaw, scale: GROVE_PIECES.scale, role: "static", frame: "root", slot: i + 1, halo: { color: "#ffe2b0", scale: 4.2, opacity: 0.45 }, note: `expression piece ${i + 1} above its column` });
  }
  placements.push(lantern(-13, 9, "forecourt post"), lantern(13, 9, "forecourt post"));
  // The common bed dressing (design 6.3): roses along the lawn ring outside the columns,
  // hydrangeas at the bed ends, the procedural disc flowers hidden for one flower vocabulary.
  const roses: Array<[number, number, number, number]> = [
    [13.5, 2, 1.4, 0.3], [14, -2.5, 1.4, 1.5], [12.8, 6, 1.3, 2.6], [11, 10.5, 1.3, 0.9], [-13.5, 2, 1.4, 2.1], [-14, -2.5, 1.4, 0.6], [-12.8, 6, 1.3, 1.8], [-11, 10.5, 1.3, 2.9], [7, 12.8, 1.2, 1.1], [-7, 12.8, 1.2, 2.3],
  ];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[14.2, -6, 1.3, 0.4], [-14.2, -6, 1.3, 1.9], [9.5, 12, 1.2, 2.7], [-9.5, 12, 1.2, 0.8]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return { zone: "expressions", placements, stands: figureStands("expressions"), hideFlowers: true };
}

/**
 * Peace Globe (design 6.9). The kit globe on its filigree stand, 11 tall, replaces the
 * procedural glass globe and its rings; the gold railed terrace of `zone-peacemakers.png` is
 * a ring of kit filigree railing segments (the W4 gap is filled) with a three segment gap
 * toward the camera; twelve static Plan 01 people hold the circle at radius 6.2, facing the
 * globe, hidden beyond 72 units; lantern posts flank the entrance; blossom trees, roses and
 * hydrangeas dress the sides. The two rigged neighbors stand in the forecourt (lane K4).
 */
function peacemakersLayout(): ZoneLayout {
  const globe: [number, number] = [-2, -1];
  const placements: KitPlacement[] = [
    ...archRow("peacemakers"),
    { id: "landmark.peace-globe", position: [globe[0], 0.6, globe[1]], scale: 11 / 2.953, role: "static", replaces: "landmark", footprint: "round", note: "the globe on its stand, 11 tall, centre at y 8" },
    lantern(globe[0] - 3.6, 7.4, "post at the railing entrance"),
    lantern(globe[0] + 3.6, 7.4, "post at the railing entrance"),
    { id: "nature.blossom-tree-b", position: [-12, 0.7, 6], rotationY: 0.3, scale: 1.05, role: "static", contact: [7, 5.5], note: "front left tree" },
    { id: "nature.blossom-tree-b", position: [-12.2, 0.7, -5.6], rotationY: 0.8, scale: 1.05, role: "static", contact: [7, 5.5], note: "back left tree (design 6.9; the right of the frame is the hero pearl's, which sits at side 11 here)" },
  ];
  // Twenty five segments of pitch 2 close a ring of radius 8 (chord 2.005); three stay out
  // at the front as the entrance.
  for (let k = 0; k < 25; k++) {
    if (k === 0 || k === 1 || k === 24) continue;
    const a = (k / 25) * Math.PI * 2;
    placements.push({ id: "landmark.filigree-railing", position: [globe[0] + Math.sin(a) * 8, 0.7, globe[1] + Math.cos(a) * 8], rotationY: a, role: "static", note: `railing segment ${k} of 25` });
  }
  const people = ["people.child", "people.mother", "people.father", "people.teenager", "people.grandmother", "people.grandfather"];
  for (let k = 0; k < 12; k++) {
    const a = degrees(15 + k * 30);
    placements.push(person(people[k % 6], globe[0] + Math.sin(a) * 6.2, globe[1] + Math.cos(a) * 6.2, a + Math.PI, 0.7, `circle ${k + 1} of 12, facing the globe`));
  }
  const roses: Array<[number, number, number, number]> = [[10, 3, 1.4, 0.3], [10.5, -2, 1.4, 1.5], [9.8, -6, 1.3, 2.6], [9.5, 6, 1.3, 0.9], [-10, 3, 1.4, 2.1], [-10.5, -2, 1.4, 0.6], [-9.8, -6, 1.3, 1.8], [-9.5, 6.2, 1.3, 2.9]];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[11, 0.5, 1.3, 0.4], [-11, 0.5, 1.3, 1.9], [10.3, -4.2, 1.3, 2.7], [-10.6, -4.2, 1.3, 0.8], [9.8, 7.4, 1.2, 1.3], [-9.8, 7.4, 1.2, 2.4]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return { zone: "peacemakers", placements, hideFlowers: true };
}

/**
 * Daily Practice Terrace (design 6.10, `zone-practice.png`). Two raised ivory levels climb
 * from the terrace behind the forecourt, joined by kit stairs and edged with kit filigree
 * railing; the domed hall at the top is the kit glass gazebo (the W4 gap is filled, so the
 * observatory stand in is not used); the procedural arch row goes because the levels climb
 * through it. Nine kit steles carry the canonical icon discs, one per expression, along the
 * level one crescent and the level two rim; two benches face each other on the lawn with the
 * teacup and the candle; the pool with the kit fountain sits on the right lawn; a lavender
 * and a pink blossom tree stand at the front corners; four static people stand on the levels,
 * hidden beyond 72 units. The neighbors (lane K4) stand beside the benches.
 */
function practiceLayout(): ZoneLayout {
  const placements: KitPlacement[] = [
    { id: "landmark.pearl-stairs", position: [-5.2, 0.6, 1.5], scaleXYZ: [1.1, 1.7 / STAIR.tread, 1.1], role: "static", note: "left stair to level two (landing at 2.3)" },
    { id: "landmark.pearl-stairs", position: [5.2, 0.6, 1.5], scaleXYZ: [1.1, 1.7 / STAIR.tread, 1.1], role: "static", note: "right stair to level two (landing at 2.3)" },
    { id: "landmark.pearl-stairs", position: [0, 2.3, -3.3], scaleXYZ: [1, 1.6 / STAIR.tread, 1], role: "static", note: "stair from level two to level three (landing at 3.9)" },
    { id: "landmark.gazebo-glass", position: [0, 3.9, -8], scale: 1.15, role: "static", footprint: "round", note: "the domed hall on level three" },
    lantern(-2.3, -2.5, "post flanking the upper stair", 2.3),
    lantern(2.3, -2.5, "post flanking the upper stair", 2.3),
    { ...bench(-7.5, 4, 1.1, "left bench, facing the right one (replaces the two procedural slabs)", 0.7), replaces: "landmark" },
    bench(7.5, 4, -1.1, "right bench, facing the left one", 0.7),
    { id: "expression.06-teacup", position: [-7.5, 1.85, 4], rotationY: 1.1, scale: 0.9, role: "static", note: "teacup on the left bench" },
    { id: "expression.07-candle", position: [7.5, 1.95, 4], rotationY: -1.1, scale: 0.9, role: "static", note: "candle on the right bench, flame kept lit" },
    { id: "landmark.pool-fountain", position: [9, 0.7, -1], scale: 1.3, role: "static", footprint: "round", note: "fountain in the pool" },
    { id: "nature.blossom-tree-b", position: [-11, 0.7, 6], rotationY: 0.2, scale: 1.05, tint: "#c9a6e0", role: "static", contact: [7, 5.5], note: "lavender tree, front left" },
    { id: "nature.blossom-tree-c", position: [11.5, 0.7, 5], rotationY: -0.5, scale: 1.1, role: "static", contact: [6.5, 5], note: "pink tree, front right" },
    person("people.father", -3.2, 3.5, 0.4, 0.7, "waving beside the left stair"),
    person("people.mother", 3.2, 3.5, -0.4, 0.7, "beside the right stair"),
    person("people.teenager", 2.6, -1.2, 0.2, 2.3, "on level two"),
    person("people.grandfather", -3.2, -2.2, -0.3, 2.3, "on level two"),
  ];
  // Railing along the level two rim (radius 7.2 about (0, -5), between the two stairs) and
  // the level three rim (radius 3.5 about (0, -8), either side of the upper stair).
  for (const b of [-40, -24, -8, 8, 24, 40]) {
    const a = degrees(b);
    placements.push({ id: "landmark.filigree-railing", position: [Math.sin(a) * 7.2, 2.3, -5 + Math.cos(a) * 7.2], rotationY: a, role: "static", note: "level two railing" });
  }
  for (const b of [-78, -45, 45, 78]) {
    const a = degrees(b);
    placements.push({ id: "landmark.filigree-railing", position: [Math.sin(a) * 3.5, 3.9, -8 + Math.cos(a) * 3.5], rotationY: a, role: "static", note: "level three railing" });
  }
  // Nine steles, one per expression, level one crescent then level two rim, left to right.
  const steles: Array<[number, number, number, number]> = [
    [Math.sin(degrees(-75)) * 10.6, 0.7, Math.cos(degrees(-75)) * 10.6, degrees(38)],
    [Math.sin(degrees(-45)) * 10.6, 0.7, Math.cos(degrees(-45)) * 10.6, degrees(22)],
    [Math.sin(degrees(-15)) * 10.6, 0.7, Math.cos(degrees(-15)) * 10.6, degrees(8)],
    [Math.sin(degrees(15)) * 10.6, 0.7, Math.cos(degrees(15)) * 10.6, degrees(-8)],
    [Math.sin(degrees(45)) * 10.6, 0.7, Math.cos(degrees(45)) * 10.6, degrees(-22)],
    [Math.sin(degrees(75)) * 10.6, 0.7, Math.cos(degrees(75)) * 10.6, degrees(-38)],
    [-6, 2.3, -3.5, degrees(25)], [0, 2.3, 1.0, 0], [6, 2.3, -3.5, degrees(-25)],
  ];
  steles.forEach(([x, y, z, yaw], k) => placements.push({ id: "landmark.stone-tablet", position: [x, y, z], rotationY: yaw, scale: 1.15, role: "static", icon: k + 1, note: `stele ${k + 1} of 9, expression ${k + 1}` }));
  // Between the steles at radius 11.6 (bearings 30, 60 and 88 either side), never in front of an icon.
  const roses: Array<[number, number, number, number]> = [[10, 5.8, 1.3, 0.3], [-10, 5.8, 1.3, 1.5], [5.8, 10, 1.2, 2.6], [-5.8, 10, 1.2, 0.9], [11.6, 0.4, 1.3, 2.1], [-11.6, 0.4, 1.3, 0.6], [8.4, -8, 1.2, 1.8], [-8.4, -8, 1.2, 2.9]];
  roses.forEach(([x, z, scale, spin], k) => placements.push(rose(x, z, scale, spin, `rose bush ${k + 1} of ${roses.length}`)));
  const hydrangeas: Array<[number, number, number, number]> = [[11.4, -4.5, 1.2, 0.4], [-11.2, -1, 1.3, 1.9], [-9, -6, 1.2, 2.7], [10, -7, 1.2, 0.8]];
  hydrangeas.forEach(([x, z, scale, spin], k) => placements.push(hydrangea(x, z, scale, spin, `hydrangea ${k + 1} of ${hydrangeas.length}`)));
  return {
    zone: "practice",
    placements,
    platforms: [{ center: [0, 0.7, -5], radius: 7.2, height: 1.6 }, { center: [0, 2.3, -8], radius: 3.5, height: 1.6 }],
    pools: [{ center: [9, 0.7, -1], radius: 2.6, rim: true }],
    hideFlowers: true,
    removeArchRow: true,
  };
}

/** Builds the near zone tables. Pure: two calls give equal tables. */
export function coreZoneLayouts(): ZoneLayout[] {
  return [welcomeLayout(), gardenLayout(), featuredLayout(), heartLayout(), expressionsLayout(), peacemakersLayout(), practiceLayout()];
}

export const CORE_ZONE_LAYOUTS: readonly ZoneLayout[] = coreZoneLayouts();
