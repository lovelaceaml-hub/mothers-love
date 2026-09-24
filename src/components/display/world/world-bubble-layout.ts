/** The world bubbles' text wrapping, the design study's hero and resident placement, and the slot records. */
import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import type { ArrivalState } from "./arrival-director";
import { StudyPearlSkin } from "./art/pearl-skin";
import type { ZoneId } from "./world-data";
import { TvBubbleDecor, type TvBubbleRole, type TvFaceStyle } from "./art/tv-bubbles";
import type { TvPlaceWorld } from "./art/tv-places";
import { TvLeavePath, TvRisePath, TvSwap, TvFlowTurn } from "./art/tv-flow";

export function wrapBubbleText(
  measure: (text: string) => number,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const paragraph of text.split("\n")) {
    for (const word of paragraph.split(/(\s+)/u)) {
      if (line && measure(line + word) > width) {
        lines.push(line);
        line = "";
      }
      for (const { segment } of new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      }).segment(word)) {
        if (line && measure(line + segment) > width) {
          lines.push(line);
          line = "";
        }
        line += segment;
      }
    }
    lines.push(line);
    line = "";
  }
  return lines.length ? lines : [""];
}

/**
 * Design study only: where a zone's hero pearl stands, in the zone's frame (`outward` toward
 * the tour eye, `side` to its right). Classic and cinematic keep side 3 (7 at the Sanctuary
 * and the Peace Globe, 0 on phones) and outward 5.
 *
 * Visual review of the kit captures (Plan 26 K1, 2026-09-23) moved three of them:
 *  - Pearl Pavilion: outward 8, so the face stands in front of the pavilion's arch ring
 *    (radius 7 plus the columns' .32) and no column crosses the words from the tour eye.
 *  - Heart Sanctuary and Peace Globe: side 10.5 and 11, so the sculpted heart and the globe
 *    stand beside the pearl and its medallion ring, never through it (target 03 and the board).
 * Phones keep side 0: the portrait frame has no room beside the landmark.
 */
export function studyHeroPlacement(zone: ZoneId, mobile: boolean) {
  const side = mobile ? 0 : zone === "heart" ? 10.5 : zone === "peacemakers" ? 11 : 3;
  return { side, outward: zone === "featured" ? 8 : 5 };
}

type ResidentPlan = {
  place: ZoneId;
  pool: readonly Recognition[];
  main?: Recognition;
  /** The records the zone's two resident slots show now, if any. */
  current: readonly [string | undefined, string | undefined];
};

/**
 * Design study only: which record each zone's two resident pearls show.
 *
 * A resident never repeats its own zone's hero or the other resident, so no record stands
 * twice in one zone. Otherwise it takes the record shown least so far across the world,
 * preferring, at equal use, one that is no zone's hero, starting from a different place in
 * the pool for every zone. So the pool is spread evenly over the world instead of every zone
 * showing its first two records (visual review, 2026-09-23: two identical residents side by
 * side). A resident keeps its record while that record stays allowed, so nothing repaints
 * unless it has to. With too few records a slot stays empty rather than repeat one.
 */
export function studyResidents(plans: readonly ResidentPlan[]) {
  const heroes = new Set(plans.map((plan) => plan.main?.id).filter(Boolean));
  const used = new Map<string, number>();
  const result = new Map<ZoneId, [Recognition | undefined, Recognition | undefined]>();
  const score = (record: Recognition) => (used.get(record.id) ?? 0) * 2 + (heroes.has(record.id) ? 1 : 0);
  plans.forEach((plan, zoneIndex) => {
    const chosen: [Recognition | undefined, Recognition | undefined] = [undefined, undefined];
    const taken = new Set<string>(plan.main ? [plan.main.id] : []);
    // Keep what is already showing, while it is allowed.
    plan.current.forEach((id, k) => {
      const record = id ? plan.pool.find((item) => item.id === id) : undefined;
      if (record && !taken.has(record.id)) { chosen[k] = record; taken.add(record.id); }
    });
    for (let k = 0; k < 2; k++) {
      if (chosen[k] || !plan.pool.length) continue;
      const start = (zoneIndex * 2 + k) % plan.pool.length;
      let best: Recognition | undefined;
      for (let i = 0; i < plan.pool.length; i++) {
        const record = plan.pool[(start + i) % plan.pool.length];
        if (!taken.has(record.id) && (!best || score(record) < score(best))) best = record;
      }
      if (best) { chosen[k] = best; taken.add(best.id); }
    }
    for (const record of chosen) if (record) used.set(record.id, (used.get(record.id) ?? 0) + 1);
    result.set(plan.place, chosen);
  });
  return result;
}

export type Input = {
  time: number;
  camera: T.PerspectiveCamera;
  zone: ZoneId;
  selectedId: string | null;
  readingAge: number;
  arrival: ArrivalState;
  minimum: number;
  expressionId: number;
  still: boolean;
  sparkles: boolean;
  trails: boolean;
  /** TV page only: how many times the tour has left a place, which picks its main bubble. */
  tvLoop?: (place: ZoneId) => number;
  /** TV page only: how many times the tour has arrived at a place, which picks its flowing bubble. */
  tvArrivals?: (place: ZoneId) => number;
  /** TV page only: where the camera is flying to, so that place's bubbles are ready on arrival. */
  destination?: ZoneId;
  /** TV page only: the owner paused the world (as opposed to a still view), so a journey waits. */
  paused?: boolean;
  /** TV page only: the hold rule, for the main bubble's scroll. */
  hold?: (message: string, minimum: number) => number;
};
/** TV page only: a bubble's role and place, its decoration and how its face was painted. */
export type TvSlot = {
  role: TvBubbleRole;
  place: ZoneId | "arrival";
  decor: TvBubbleDecor;
  windowTop: number;
  style: TvFaceStyle;
  /** A flowing bubble's diameter on screen at rest, px, which its face was painted for. */
  diameter: number;
};
/** TV page only: one bubble spot of a place, its two slots (one arriving, one leaving) and its ways in and out. */
export type TvSpot = { swap: TvSwap; slots: [Slot, Slot]; rise: TvRisePath; leave: TvLeavePath };
export type TvPlace = { world: TvPlaceWorld; main: TvSpot; flow: TvSpot; seed: number; presence: number; turn: TvFlowTurn };
export type Slot = {
  zone: ZoneId | "arrival";
  index: number;
  root: T.Group;
  face: T.Mesh<T.CircleGeometry, T.MeshBasicMaterial>;
  ring: T.Mesh;
  lights: T.InstancedMesh;
  record?: Recognition;
  fingerprint: string;
  pageKey: string;
  canvas?: HTMLCanvasElement;
  texture?: T.CanvasTexture;
  born: number;
  radius: number;
  study?: StudyPearlSkin;
  tv?: TvSlot;
};
