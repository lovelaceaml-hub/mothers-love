import * as THREE from "three";
import type { Recognition } from "@/lib/contracts";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CameraDirector } from "./camera-director";
import { createWorldScene } from "./world-scene";
import { WorldRecognitionBubbles } from "./world-recognitions";
import { ArrivalDirector, type ArrivalState } from "./arrival-director";
import { RecognitionDirector } from "./recognition-director";
import { isWorldDesignStudy, studyKit, studyRadiance, type StudyArrival } from "./art/design-mode";
import { arrivalStyleAt, arrivalStyleCycles } from "./art/arrival-choreography";
import { resolveStudyTier, StudyRadiance } from "./art/study-radiance";
import { StudyCameraFinesse, studyTravelEase, type FinesseInput } from "./art/camera-finesse";
import { StudyMood, type MoodInput, type StudyHaze } from "./art/study-mood";
import { studyEnvironment } from "./art/study-lighting";
import { STUDY_FOG, STUDY_TONE, STUDY_TV_CAMERA_FAR, STUDY_TV_FOG, STUDY_TV_TONE } from "./art/study-palette";
import { emptyFeed, readingSeconds, type WorldFeed } from "./world-feed";
import type { WorldKit } from "./kit/kit-loader";
import { kitState, type KitState } from "./kit/kit-manifest";
import {
  ArrivalPacer, TV_BUBBLE_PLACES, studyTvPage, tvStartPlace, type WorldBubblePlan,
} from "./art/tv-page";
import { TV_ARC } from "./art/tv-places";
import { TvHosts } from "./art/tv-hosts";
import { applyTvWaterEnvironment } from "./art/tv-foreground";
import type { HoldSeconds } from "./recognition-director";
import { RECOGNITION_ZONES, type Quality, type ZoneId } from "./world-data";
import { tvHold, placeHold, SAMPLE_ARRIVAL_FIRST, type EngineOptions } from "./world-engine-options";
import { selectEnginePearl, resizeEngine, applyEngineStudyTier } from "./world-engine-view";
import { engineContextLost, engineVisibilityChanged, disposeEngine } from "./world-engine-dispose";
import {
  engineTick, applyEngineStudyMood, reportEngineStatus, engineTvFocus, engineTvPacing,
  noteEngineFresh,
} from "./world-engine-frame";
import {
  setEngineFeed, engineReadingComplete, engineReadingPool, engineFeedRecord, setEngineExpression,
  selectEngineRecognition,
} from "./world-engine-reading";

export type { WorldStatus, EngineOptions } from "./world-engine-options";

/**
 * Its longer methods live in world-engine-frame.ts (the frame loop), world-engine-reading.ts,
 * world-engine-view.ts and world-engine-dispose.ts and run with the engine as `this`, so the
 * members they read carry no `private` modifier. The constructor builds the scene here.
 */
export class WorldEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly director = new CameraDirector();
  readonly arrivals = new ArrivalDirector(studyTvPage() ? tvHold : undefined);
  readonly recognitions = new RecognitionDirector(studyTvPage() ? placeHold(this.director) : undefined);
  feed: WorldFeed = emptyFeed();
  readingHeld = false;
  lastReadingZone: ZoneId = "garden";
  rotationPaused = false;
  sourceStill = false;
  expressionId = 1;
  demoRequested = false;
  ownerTempo = 1;
  arrivalState: ArrivalState = this.arrivals.state();
  readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 450);
  /**
   * Built first thing in the constructor, in the same order the field initializers used, so
   * the scene can receive the kit from the options. Nothing created between the camera and
   * the world allocates a scene object, so every id and draw order is unchanged.
   */
  readonly world: ReturnType<typeof createWorldScene>;
  readonly bubbles: WorldRecognitionBubbles;
  readonly observer: ResizeObserver;
  readonly environment: THREE.WebGLRenderTarget;
  /** Resolved once: the tick runs sixty times a second and must not reparse the URL. */
  readonly study = isWorldDesignStudy();
  /** Resolved once: the TV page (`?view=tv`) inside the study. */
  readonly tv = studyTvPage();
  /** Where the tour stops to read: every place on the TV page (step 5), the six recognition places elsewhere. */
  readonly readingZones: readonly ZoneId[] = this.tv
    ? [...new Set([...RECOGNITION_ZONES, ...TV_BUBBLE_PLACES])]
    : RECOGNITION_ZONES;
  readonly holdFor: HoldSeconds = this.tv ? placeHold(this.director) : readingSeconds;
  readonly pacer = new ArrivalPacer();
  tvPlan?: WorldBubblePlan;
  /** How many times the tour has left each place: picks the place's main bubble. */
  readonly tvVisits = new Map<ZoneId, number>();
  /** How many times the tour has arrived at each place: picks its flowing bubble, so it changes as the camera arrives. */
  readonly tvArrivalCounts = new Map<ZoneId, number>();
  tvFresh: Array<{ id: string; at: number }> = [];
  tvClock = 0;
  tvStart = -1;
  tvWasTraveling = false;
  /** The place the tour last settled at; leaving it for the next one counts a visit. */
  tvSettledZone: ZoneId | null = null;
  /** TV page: how far the camera has glided in to read the main bubble, eased (0 to 1). */
  focusWeight = 0;
  readonly focusPose = { eye: new THREE.Vector3(), target: new THREE.Vector3() };
  readonly focusMatrix = new THREE.Matrix4();
  readonly focusQuaternion = new THREE.Quaternion();
  /** TV page: the one record a visit holds on, reused so the per frame pool allocates nothing. */
  readonly tvPool: Recognition[] = [];
  /**
   * TV page: the place and visit the pool's record was picked for, and its id. Later frames of
   * the same visit keep it while it stays in the snapshot, so a new snapshot (a new plan) never
   * swaps the bubble being read and the camera never glides out and back in mid read.
   */
  tvPickedZone: ZoneId | null = null;
  tvPickedVisit = -1;
  tvPickedId?: string;
  sampleArrivalAt = SAMPLE_ARRIVAL_FIRST;
  sampleArrivalIndex = 0;
  /** Bound once, so the per frame bubble update allocates no closure. */
  readonly tvLoop = (place: ZoneId) => this.tvVisits.get(place) ?? 0;
  readonly tvArrivals = (place: ZoneId) => this.tvArrivalCounts.get(place) ?? 0;
  /** TV page: Peace and Joy (the placeholder until the lamb files land, `HOSTS_READY`). */
  hosts?: TvHosts;
  /** Resolved once with the study gate: whether this page asked for the kit at all. */
  private readonly kitRequested = this.study && studyKit();
  readonly kit?: WorldKit;
  readonly kitStatus: KitState;
  /**
   * Plan 26 K2, style cycling for live (WORLD-INTEGRATION 4.6): on a live feed every admitted
   * arrival takes the next study style in turn unless `?entrance=` fixed one for the page.
   * Sample never cycles: it keeps the entrance or the study button choice, so the pressed
   * button is always the style on screen. Resolved once, like the study gate.
   */
  private readonly entranceFixed = this.study && ["bloom", "ribbon", "constellation"]
    .includes(new URLSearchParams(window.location.search).get("entrance") ?? "");
  private arrivalsAdmitted = 0;
  /** Study only, and only when the context can render to a half float target. */
  radiance?: StudyRadiance;
  /**
   * Study only. The finesse places the camera after the director, without changing what the
   * director thinks the pose is; the mood carries the light between one place and the next.
   * Both are the identity whenever the world is not moving, so every still capture is today's.
   */
  readonly finesse?: StudyCameraFinesse;
  readonly mood?: StudyMood;
  /** Reused every frame, so neither study hook allocates in the tick. */
  readonly finesseInput: FinesseInput = {
    dt: 0,
    moving: false,
    traveling: false,
    arrivalPhase: "idle",
    reading: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    elapsed: 0,
  };
  readonly moodInput: MoodInput = {
    dt: 0,
    moving: false,
    traveling: false,
    arrivalPhase: "idle",
  };
  /** The TV page starts, and stays, in its clear air (`STUDY_TV_FOG`). */
  readonly haze: StudyHaze = this.tv
    ? { near: STUDY_TV_FOG.near, far: STUDY_TV_FOG.far }
    : { near: STUDY_FOG.near, far: STUDY_FOG.far };
  /**
   * TV page: the fog colour at a mood exposure of 1, in the linear working space `T.Fog` holds
   * it in (`new T.Fog(STUDY_TV_FOG.color, ...)` in the design world), for `studyHazeColor`.
   */
  readonly tvHazeBase = new THREE.Color(STUDY_TV_FOG.color);
  readonly bufferSize = new THREE.Vector2();
  elapsed = 0;
  last = 0;
  reportAt = 0;
  frameCount = 0;
  windowFrames = 0;
  fps = 0;
  alive = true;
  failed = false;
  dirty = true;
  paused = false;
  reduced: boolean;
  speed = 1;
  quality: Quality = "auto";
  lowered = false;
  slowWindows = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly options: EngineOptions,
  ) {
    this.kit = options.kit;
    this.kitStatus = kitState(this.kitRequested, this.kit);
    try {
      this.world = createWorldScene(this.kit);
      this.bubbles = new WorldRecognitionBubbles(this.world.scene);
    } catch (error) {
      this.kit?.dispose();
      throw error;
    }
    // Study only: the expression the DOM picker shows, for the grove and the terrace steles.
    if (this.study) this.world.scene.userData.studyExpression = this.expressionId;
    if (this.tv) {
      // A narrow swing, so both bubbles keep their reading size wherever the camera is on it.
      this.director.arc = { ...TV_ARC };
      const start = tvStartPlace();
      if (start) this.director.visit(start, true);
      this.hosts = new TvHosts(this.world.scene);
      // The clear air's seam rule (`STUDY_TV_CAMERA_FAR`): the fog is complete before the far
      // plane, and wherever the TV page's larger sea disc ends in view it is deeper than the
      // fog's far end, so the sea is fully fogged before it ends and meets the sky in the
      // horizon colour. resize() keeps it.
      this.camera.far = STUDY_TV_CAMERA_FAR;
      this.camera.updateProjectionMatrix();
    }
    this.reduced = options.reducedMotion;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: isWorldDesignStudy() ? "high-performance" : "low-power",
      });
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.82;
      if (isWorldDesignStudy()) {
        this.renderer.toneMapping = THREE.NeutralToneMapping;
        this.renderer.toneMappingExposure = STUDY_TONE.exposure;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // The shadow cadence in tick() owns this from here: one refresh in six moving frames
        // and one on every dirty still frame. Only the sculpted heart bobs, so nothing the
        // sun casts moves fast enough for an amortised map to slip visibly.
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.finesse = new StudyCameraFinesse();
        this.mood = new StudyMood();
        // The one line the camera director takes part in: its public pacing field, which
        // defaults to the app's own smoothstep everywhere else and is never read by anything
        // but its own travel. Classic and cinematic keep the default untouched.
        this.director.ease = studyTravelEase;
        this.world.scene.userData.invalidate = () => { this.dirty = true; };
      }
      if (isWorldDesignStudy()) {
        this.environment = studyEnvironment(this.renderer);
      } else {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const room = new RoomEnvironment();
        this.environment = pmrem.fromScene(room, 0.04);
        room.dispose(); pmrem.dispose();
      }
      if (isWorldDesignStudy() && studyRadiance()) {
        this.radiance = StudyRadiance.create(this.renderer, { tv: this.tv });
        if (this.radiance) {
          // Every pass of one presented frame is counted together, so the reset moves into
          // StudyRadiance.render and happens exactly once per frame it presents.
          this.renderer.info.autoReset = false;
          this.world.scene.userData.studyRadiance = true;
        }
      }
      // The study world wraps the motes around the viewer, so it needs the live camera.
      if (isWorldDesignStudy()) this.world.scene.userData.studyCamera = this.camera;
      this.world.scene.environment = this.environment.texture;
      this.world.scene.environmentIntensity = 0.55;
      // The TV page's clearer day takes a little less environment fill (`STUDY_TV_TONE`).
      if (isWorldDesignStudy()) this.world.scene.environmentIntensity = this.tv ? STUDY_TV_TONE.environmentIntensity : STUDY_TONE.environmentIntensity;
      // TV page: the sea takes that environment as its own (`TV_WATER`), so its reflection keeps
      // the pastel light instead of following the lower fill.
      if (this.tv) applyTvWaterEnvironment(this.world.scene);
    } catch (error) {
      this.radiance?.dispose();
      this.bubbles.dispose();
      this.world.dispose();
      this.kit?.dispose();
      // A renderer made before the failure would otherwise keep its WebGL context alive,
      // and repeated failed starts could use up the browser's context limit.
      try {
        const partial = this as unknown as { renderer?: THREE.WebGLRenderer; environment?: THREE.WebGLRenderTarget };
        partial.environment?.dispose();
        partial.renderer?.dispose();
        partial.renderer?.forceContextLoss();
      } catch {
        // Cleanup is best effort; the original error is the one worth reporting.
      }
      throw error;
    }
    canvas.addEventListener("webglcontextlost", this.contextLost);
    canvas.addEventListener("click", this.selectPearl);
    document.addEventListener("visibilitychange", this.visibilityChanged);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(this.tick);
  }

  /** In world-engine-view.ts. */
  selectPearl = (event: MouseEvent) => selectEnginePearl.call(this, event);
  /** In world-engine-dispose.ts. */
  contextLost = (event: Event) => engineContextLost.call(this, event);
  /** In world-engine-dispose.ts. */
  visibilityChanged = () => engineVisibilityChanged.call(this);
  /** In world-engine-view.ts. */
  resize = () => resizeEngine.call(this);
  /** In world-engine-view.ts. */
  studyTier(low: boolean) { return applyEngineStudyTier.call(this, low); }
  /** In world-engine-frame.ts. */
  tick = (now: number) => engineTick.call(this, now);
  /** In world-engine-frame.ts. */
  applyStudyMood(delta: number, moving: boolean) {
    return applyEngineStudyMood.call(this, delta, moving);
  }
  /** In world-engine-frame.ts. */
  report() { return reportEngineStatus.call(this); }
  /** In world-engine-frame.ts. */
  tvFocus(delta: number, moving: boolean, readingVisible: boolean, minimum: number) {
    return engineTvFocus.call(this, delta, moving, readingVisible, minimum);
  }
  /** In world-engine-frame.ts. */
  tvPacing(now: number, safe: boolean) { return engineTvPacing.call(this, now, safe); }
  /** In world-engine-frame.ts. */
  noteFresh(ids: readonly string[]) { return noteEngineFresh.call(this, ids); }
  /** In world-engine-reading.ts. */
  setFeed(feed: WorldFeed) { return setEngineFeed.call(this, feed); }
  /** In world-engine-reading.ts. */
  isReadingComplete(delta: number, minimum: number) {
    return engineReadingComplete.call(this, delta, minimum);
  }
  /** In world-engine-reading.ts. */
  readingPool(includeHeld = true) { return engineReadingPool.call(this, includeHeld); }
  /** In world-engine-reading.ts. */
  feedRecord(id: string | undefined) { return engineFeedRecord.call(this, id); }
  /** In world-engine-reading.ts. */
  setExpression(id: number) { return setEngineExpression.call(this, id); }
  demonstrateArrival(size: number) {
    if (this.feed.phase === "sample") {
      this.demoRequested = true;
      this.arrivals.enqueue(
        this.feed.records.slice(0, size).map((record) => record.id),
      );
    }
  }
  /**
   * The one place a live arrival's style can change: the edge where the director leaves
   * `idle`. Reaction refreshes and feed reconnects never cross that edge, so they never
   * advance the cycle, and an arrival keeps its style for its whole lifetime. Sample feeds
   * never reach the cycle, so the study buttons keep their choice exactly as before.
   */
  cycleStudyArrival() {
    if (!arrivalStyleCycles(this.study, this.entranceFixed, this.feed.phase)) return;
    this.world.scene.userData.studyArrival = arrivalStyleAt(this.arrivalsAdmitted++);
  }
  previewStudyArrival(style: StudyArrival) {
    if (!isWorldDesignStudy() || this.feed.phase !== "sample" || this.arrivalState.phase !== "idle") return;
    this.world.scene.userData.studyArrival = style;
    this.demonstrateArrival(1);
  }
  finishStudyArrival() {
    if (!isWorldDesignStudy() || this.feed.phase !== "sample") return;
    this.arrivals.cancel(); this.arrivalState = this.arrivals.state();
    this.director.endArrival(true); this.dirty = true; this.report();
  }
  /** In world-engine-reading.ts. */
  selectRecognition(id: string) { return selectEngineRecognition.call(this, id); }
  stepRecognition(direction: number) {
    this.recognitions.step(this.readingPool(false), direction);
    this.report();
  }
  holdReading(hold: boolean) {
    this.readingHeld = hold;
  }
  visit(zone: ZoneId) {
    if (this.arrivalState.phase !== "idle") return;
    this.director.visit(
      zone,
      this.paused || this.rotationPaused || this.reduced || this.sourceStill,
    );
    this.dirty = true;
    this.report();
  }
  setPaused(paused: boolean) {
    this.paused = paused;
    this.last = 0;
    this.report();
  }
  finishArrival(instant: boolean) {
    this.director.endArrival(instant);
    if (instant && (this.reduced || this.sourceStill))
      this.director.settleForStill();
  }
  settleMotion() {
    this.arrivals.reduceMotion(
      this.feed.records,
      this.feed.snapshot?.settings.readingSeconds ?? 24,
    );
    this.arrivalState = this.arrivals.state();
    this.director.settleForStill();
    this.world.update(this.elapsed, this.director.zone, this.arrivalState);
    this.dirty = true;
  }
  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    this.last = 0;
    if (reduced) this.settleMotion();
    this.dirty = true;
    this.report();
  }
  setSpeed(speed: number) {
    this.speed = Math.max(0.5, Math.min(2, speed));
  }
  setQuality(quality: Quality) {
    this.quality = quality;
    this.lowered = false;
    this.slowWindows = 0;
    if (this.study)
      this.world.scene.userData.studyTier = resolveStudyTier(quality, false);
    this.resize();
    this.report();
  }
  /** In world-engine-dispose.ts. */
  dispose() { return disposeEngine.call(this); }
}
