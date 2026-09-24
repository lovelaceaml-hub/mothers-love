/** The engine's status and options types, and its reading hold rules for the TV page. */
import { CameraDirector } from "./camera-director";
import { WorldRecognitionBubbles } from "./world-recognitions";
import type { ArrivalState } from "./arrival-director";
import { readingSeconds } from "./world-feed";
import type { WorldKit } from "./kit/kit-loader";
import type { KitState } from "./kit/kit-manifest";
import { TV_BUBBLE_PLACES, worldHoldSeconds } from "./art/tv-page";
import { tvPlaceHold } from "./art/tv-places";
import type { HoldSeconds } from "./recognition-director";
import type { ZoneId } from "./world-data";

/** The TV page's hold rule (step 4). It sets its own floor, so the owner minimum is not read. */
export const tvHold: HoldSeconds = (message) => worldHoldSeconds(message);
/**
 * The TV page reads a place with the new rule only where its bubbles scroll the whole message
 * (`TV_BUBBLE_PLACES`, every place); any other keeps paging by `readingSeconds`, so no page is
 * ever skipped. The hold also covers the camera's glide in to the main bubble and its pull back
 * out, so the message itself is held the full rule.
 */
export const placeHold = (director: CameraDirector): HoldSeconds => (message, minimum) =>
  TV_BUBBLE_PLACES.includes(director.zone)
    ? tvPlaceHold(message, director.zone)
    : readingSeconds(message, minimum);
/** TV page, sample mode: a fictional arrival every 90 s after the first 45, to show the pacing. */
export const SAMPLE_ARRIVAL_FIRST = 45;
export const SAMPLE_ARRIVAL_EVERY = 90;
/** How long an arrival stays marked new in the ticker. */
export const FRESH_SECONDS = 90;

export type WorldStatus = {
  zone: ZoneId;
  destination: ZoneId;
  traveling: boolean;
  elapsed: number;
  fps: number;
  calls: number;
  triangles: number;
  textures: number;
  geometries: number;
  quality: string;
  frames: number;
  arrival: ArrivalState;
  recognitionId: string | null;
  readingRemaining: number;
  cameraPosition?: number[];
  worldBubbles?: ReturnType<WorldRecognitionBubbles["inspect"]>;
  prototypeHeartReady?: boolean;
  /** `off` outside the study or under `?kit=off`; `ready`, `partial` or `failed` inside it. */
  kit?: KitState;
  /** Kit ids that did not arrive; each keeps its procedural piece. */
  kitMissing?: number;
  /** Kit assets that arrived. */
  kitLoaded?: number;
  /** Kit assets loaded and requested, when a kit object is present. */
  kitCounts?: { loaded: number; total: number };
  /** True once kit neighbors stand in the design world in place of the miniature figures. */
  kitNeighbors?: boolean;
  /** TV page: records that arrived in the last 90 s, newest last, for the ticker. */
  tvArrivals?: string[];
};
export type EngineOptions = {
  onStatus: (status: WorldStatus) => void;
  onFailure: () => void;
  reducedMotion: boolean;
  onSelection?: () => void;
  /**
   * The 3D Studio kit, loaded before the engine by `loadStudyKit()`; the engine owns it from
   * here and disposes it with the world. Only the design study ever passes one.
   */
  kit?: WorldKit;
};
