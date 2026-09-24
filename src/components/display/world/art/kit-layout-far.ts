import { seededRandom, type ZoneId } from "../world-data";
import {
  type KitPlacement,
  type ZoneLayout,
  FAR_ZONE_IDS,
  TERRACE_Y,
  FAR_ISLAND_RADIUS,
  readingKeepOut,
  round,
  at,
} from "./kit-layout-far-shapes";
import {
  calendarLayout,
  statusLayout,
  orbitLayout,
  milestoneLayout,
  liveFeedLayout,
  promiseLayout,
} from "./kit-layout-far-zones";

export {
  FAR_ZONE_IDS,
  TERRACE_Y,
  FAR_ISLAND_RADIUS,
  readingKeepOut,
  FAR_ZONE_BORROWED,
  localSunAzimuth,
} from "./kit-layout-far-shapes";
export type { KitPlacementRole, KitPlacement, KeepOutSphere, ZoneLayout } from "./kit-layout-far-shapes";
export {
  CALENDAR_GRID,
  calendarDayCell,
  calendarDayPlacements,
  OBSERVATORY_RING,
  OBSERVATORY_COLUMN_HEIGHT,
  observatoryColumnScale,
  observatoryColumnCell,
  observatoryYaw,
  EXPRESSION_PIECES,
  COSMOS_CENTER,
  COSMOS_SUN,
  COSMOS_RINGS,
  cosmosRingPoint,
  cosmosBackArc,
  cosmosPlanetPose,
  cosmosPearlPose,
  FOUNTAIN_PEARLS,
  fountainPearlPose,
  RIVER_CANAL,
  PROMISE_PORTAL,
  PROMISE_RIBBONS,
  promiseRibbonYaw,
  promiseRoses,
} from "./kit-layout-far-zones";

/* ------------------------------------------------------------------------------------------ */

/** Pure and deterministic: two calls return deep equal tables. */
export function farZoneLayouts(): ZoneLayout[] {
  return [calendarLayout(), statusLayout(), orbitLayout(), milestoneLayout(), liveFeedLayout(), promiseLayout()];
}
export const FAR_ZONE_LAYOUTS: ZoneLayout[] = farZoneLayouts();

/**
 * The common replacements of design 6.3 for the six far districts, as the builder would place
 * them: forecourt lantern posts, the bench facing the pearl, roses along the lawn ring and
 * hydrangeas at the bed ends. `FAR_ZONE_LAYOUTS` assumes the builder applies these to every
 * district itself; merge this table in only if it does not.
 */
export function farZoneCommonLayouts(): ZoneLayout[] {
  return FAR_ZONE_IDS.map((zone, index) => {
    const rand = seededRandom(6300 + index * 7);
    const placements: KitPlacement[] = [];
    for (const side of [-1, 1]) placements.push({ id: "landmark.lantern-post", position: at(side * (FAR_ISLAND_RADIUS - 2.5), TERRACE_Y, 6), scale: 1.15, role: "instanced", note: "forecourt (design 6.3)" });
    placements.push({ id: "landmark.garden-bench", position: at(-FAR_ISLAND_RADIUS + 4.5, TERRACE_Y, -1), rotationY: round(Math.PI / 2), scale: 1.2, role: "static", note: "faces the pearl (design 6.3)" });
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1, angle = (rand() - .5) * 1.2, radius = 9.2 + rand() * 1.8;
      placements.push({ id: "nature.rose-bush", position: at(side * Math.cos(angle) * radius, TERRACE_Y, -Math.sin(angle) * radius - 2), rotationY: round(rand() * Math.PI * 2), scale: round(.9 + rand() * .3), role: "instanced", note: "lawn ring (design 6.3)" });
    }
    for (const side of [-1, 1]) for (const z of [-7.4, 7.4]) placements.push({ id: "nature.hydrangea-bush", position: at(side * 9.6, TERRACE_Y, z), rotationY: round(side * z * .1), scale: 1, role: "instanced", note: "bed end (design 6.3)" });
    return { zone, placements, keepOut: readingKeepOut(zone) };
  });
}

/**
 * What the builder does around the tables for each far zone (design 6.11 to 6.16): which
 * procedural landmark pieces in `district.landmark` it removes before the batch, the study
 * material features it builds itself, and the per frame work on the world clock.
 */
export const FAR_ZONE_DRESSING: ReadonlyArray<{ zone: ZoneId; remove: string; features: string[]; dynamic: string[] }> = [
  {
    zone: "calendar",
    remove: "the seven procedural ivory boxes at (k - 3) * 2.3 in the district root",
    features: [],
    dynamic: [
      "calendarDayPlacements(insights.calendar): a core.pearl bobbing sin(t * .5 + day) * .12 over each day with recognitions and a core.flower on its stones; rebuilt when the feed changes, cleared with the feed",
      "the current day's stone set glows warm (studyGlow .12) so the calendar reads at a glance",
    ],
  },
  {
    zone: "status",
    remove: "the procedural glass globe, five meridian rings and five latitude rings at (0, 7, 0)",
    features: [],
    dynamic: [
      "each column's y scale eases toward observatoryColumnScale(insights.month.expressionCounts[i], max) at tau 1.2 s; its piece rides .75 above the column top",
      "the pieces bob sin(t * .23 + i) * .15; the piece of scene.userData.studyExpression turns at .3 rad a second",
    ],
  },
  {
    zone: "orbit",
    remove: "the four procedural gold torus orbits at (0, 7, 0)",
    features: ["the procedural island lathe keel stays (the kit island base is not placed: it would interleave with the keel)"],
    dynamic: [
      "the four rings spin on the clock (rotation about their own tilted axis at .06 + k * .01 rad a second)",
      "planets follow cosmosPlanetPose(i, t), the pearls cosmosPearlPose(i, t); the selected expression (scene.userData.studyExpression) moves to COSMOS_SUN at 1.1 scale over a 2 s ease and the other eight keep orbiting",
    ],
  },
  {
    zone: "milestone",
    remove: "the five procedural cylinder tiers, their five rings and their five tier falls (context.removeFall); the two back edge falls stay",
    features: ["the procedural island lathe keel stays (the kit island base is not placed)"],
    dynamic: [
      "helix pearls follow fountainPearlPose(i, t, insights.goal.value / insights.goal.target)",
      "when insights.goal.achieved is true on arrival or flips true, 160 kit petals (the arrival petal geometry, instanced) burst from the fountain top over 4 s on the world clock and fade, trail class, once per visit",
    ],
  },
  {
    zone: "live-feed",
    remove: "nothing: the six procedural ivory drums stay as the stepping piers",
    features: ["RIVER_CANAL: an ellipse of the study water material (radiusX 9.6, radiusZ 3.2) at (0, .735, 7.4), the terrace's front third"],
    dynamic: ["arrival.lotus-bloom scrubbed to 1 while a recognition is being read in this zone, 0 otherwise, eased over 1.5 s on the clock"],
  },
  {
    zone: "promise",
    remove: "the two procedural ivory box slabs at (+-5, 1.45, 1) in the district root",
    features: [],
    dynamic: ["the two core.ribbon pieces turn about y at promiseRibbonYaw(index, t); they never touch and stay inside the loop (proved by the layout test)"],
  },
];
