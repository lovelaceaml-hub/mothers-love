import * as THREE from "three";
import type { Recognition } from "@/lib/contracts";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CameraDirector } from "./camera-director";
import { createWorldScene } from "./world-scene";
import { WorldRecognitionBubbles } from "./world-recognitions";
import { ArrivalDirector, type ArrivalState } from "./arrival-director";
import { RecognitionDirector } from "./recognition-director";
import { isWorldDesignStudy, studyKit, studyRadiance, type StudyArrival } from "./prototype/design-mode";
import { arrivalAdmitted, arrivalStyleAt, arrivalStyleCycles } from "./prototype/arrival-choreography";
import { resolveStudyTier, StudyRadiance } from "./prototype/study-radiance";
import { applyStudyDetail, type StudyDetailEntry } from "./prototype/study-budget";
import { StudyCameraFinesse, studyTravelEase, type FinesseInput } from "./prototype/camera-finesse";
import {
  StudyMood,
  studyHaze,
  type MoodInput,
  type StudyHaze,
} from "./prototype/study-mood";
import { STUDY_CALM, STUDY_EXPOSURE } from "./prototype/study-materials";
import { studyEnvironment, studyPixelRatio } from "./prototype/study-lighting";
import { STUDY_FOG, STUDY_TONE } from "./prototype/study-palette";
import { emptyFeed, readingSeconds, type WorldFeed } from "./world-feed";
import type { WorldKit } from "./kit/kit-loader";
import { kitState, type KitState } from "./kit/kit-manifest";
import {
  ArrivalPacer,
  TV_BUBBLE_PLACES,
  heldBig,
  planWorldBubbles,
  studyTvPage,
  tvRecords,
  tvStartPlace,
  worldHoldSeconds,
  type WorldBubblePlan,
} from "./prototype/tv-page";
import { TV_ARC, TV_FOCUS_IN, tvFocusWeight, tvPlaceHold, tvReadingFrame } from "./prototype/tv-places";
import { TvHosts } from "./prototype/tv-hosts";
import type { HoldSeconds } from "./recognition-director";

/** The TV page's hold rule (step 4). It sets its own floor, so the owner minimum is not read. */
const tvHold: HoldSeconds = (message) => worldHoldSeconds(message);
/**
 * The TV page reads a place with the new rule only where its bubbles scroll the whole message
 * (`TV_BUBBLE_PLACES`, every place); any other keeps paging by `readingSeconds`, so no page is
 * ever skipped. The hold also covers the camera's glide in to the main bubble and its pull back
 * out, so the message itself is held the full rule.
 */
const placeHold = (director: CameraDirector): HoldSeconds => (message, minimum) =>
  TV_BUBBLE_PLACES.includes(director.zone)
    ? tvPlaceHold(message, director.zone)
    : readingSeconds(message, minimum);
/** TV page, sample mode: a fictional arrival every 90 s after the first 45, to show the pacing. */
const SAMPLE_ARRIVAL_FIRST = 45;
const SAMPLE_ARRIVAL_EVERY = 90;
/** How long an arrival stays marked new in the ticker. */
const FRESH_SECONDS = 90;
import {
  RECOGNITION_ZONES,
  TOUR_ORDER,
  ZONES,
  type Quality,
  type ZoneId,
} from "./world-data";

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
export class WorldEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly director = new CameraDirector();
  readonly arrivals = new ArrivalDirector(studyTvPage() ? tvHold : undefined);
  readonly recognitions = new RecognitionDirector(studyTvPage() ? placeHold(this.director) : undefined);
  private feed: WorldFeed = emptyFeed();
  private readingHeld = false;
  private lastReadingZone: ZoneId = "garden";
  private rotationPaused = false;
  private sourceStill = false;
  private expressionId = 1;
  private demoRequested = false;
  private ownerTempo = 1;
  private arrivalState: ArrivalState = this.arrivals.state();
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 450);
  /**
   * Built first thing in the constructor, in the same order the field initializers used, so
   * the scene can receive the kit from the options. Nothing created between the camera and
   * the world allocates a scene object, so every id and draw order is unchanged.
   */
  private readonly world: ReturnType<typeof createWorldScene>;
  private readonly bubbles: WorldRecognitionBubbles;
  private readonly observer: ResizeObserver;
  private readonly environment: THREE.WebGLRenderTarget;
  /** Resolved once: the tick runs sixty times a second and must not reparse the URL. */
  private readonly study = isWorldDesignStudy();
  /** Resolved once: the TV page (`?view=tv`) inside the study. */
  private readonly tv = studyTvPage();
  /** Where the tour stops to read: every place on the TV page (step 5), the six recognition places elsewhere. */
  private readonly readingZones: readonly ZoneId[] = this.tv
    ? [...new Set([...RECOGNITION_ZONES, ...TV_BUBBLE_PLACES])]
    : RECOGNITION_ZONES;
  private readonly holdFor: HoldSeconds = this.tv ? placeHold(this.director) : readingSeconds;
  private readonly pacer = new ArrivalPacer();
  private tvPlan?: WorldBubblePlan;
  /** How many times the tour has left each place: picks the place's main bubble. */
  private readonly tvVisits = new Map<ZoneId, number>();
  /** How many times the tour has arrived at each place: picks its flowing bubble, so it changes as the camera arrives. */
  private readonly tvArrivalCounts = new Map<ZoneId, number>();
  private tvFresh: Array<{ id: string; at: number }> = [];
  private tvClock = 0;
  private tvStart = -1;
  private tvWasTraveling = false;
  /** The place the tour last settled at; leaving it for the next one counts a visit. */
  private tvSettledZone: ZoneId | null = null;
  /** TV page: how far the camera has glided in to read the main bubble, eased (0 to 1). */
  private focusWeight = 0;
  private readonly focusPose = { eye: new THREE.Vector3(), target: new THREE.Vector3() };
  private readonly focusMatrix = new THREE.Matrix4();
  private readonly focusQuaternion = new THREE.Quaternion();
  /** TV page: the one record a visit holds on, reused so the per frame pool allocates nothing. */
  private readonly tvPool: Recognition[] = [];
  private sampleArrivalAt = SAMPLE_ARRIVAL_FIRST;
  private sampleArrivalIndex = 0;
  /** Bound once, so the per frame bubble update allocates no closure. */
  private readonly tvLoop = (place: ZoneId) => this.tvVisits.get(place) ?? 0;
  private readonly tvArrivals = (place: ZoneId) => this.tvArrivalCounts.get(place) ?? 0;
  /** TV page: Peace and Joy (the placeholder until the lamb files land, `HOSTS_READY`). */
  private hosts?: TvHosts;
  /** Resolved once with the study gate: whether this page asked for the kit at all. */
  private readonly kitRequested = this.study && studyKit();
  private readonly kit?: WorldKit;
  private readonly kitStatus: KitState;
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
  private radiance?: StudyRadiance;
  /**
   * Study only. The finesse places the camera after the director, without changing what the
   * director thinks the pose is; the mood carries the light between one place and the next.
   * Both are the identity whenever the world is not moving, so every still capture is today's.
   */
  private readonly finesse?: StudyCameraFinesse;
  private readonly mood?: StudyMood;
  /** Reused every frame, so neither study hook allocates in the tick. */
  private readonly finesseInput: FinesseInput = {
    dt: 0,
    moving: false,
    traveling: false,
    arrivalPhase: "idle",
    reading: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    elapsed: 0,
  };
  private readonly moodInput: MoodInput = {
    dt: 0,
    moving: false,
    traveling: false,
    arrivalPhase: "idle",
  };
  private readonly haze: StudyHaze = { near: STUDY_FOG.near, far: STUDY_FOG.far };
  private readonly bufferSize = new THREE.Vector2();
  private elapsed = 0;
  private last = 0;
  private reportAt = 0;
  private frameCount = 0;
  private windowFrames = 0;
  private fps = 0;
  private alive = true;
  private failed = false;
  private dirty = true;
  private paused = false;
  private reduced: boolean;
  private speed = 1;
  private quality: Quality = "auto";
  private lowered = false;
  private slowWindows = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: EngineOptions,
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
        this.radiance = StudyRadiance.create(this.renderer);
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
      if (isWorldDesignStudy()) this.world.scene.environmentIntensity = STUDY_TONE.environmentIntensity;
    } catch (error) {
      this.radiance?.dispose();
      this.bubbles.dispose();
      this.world.dispose();
      this.kit?.dispose();
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

  private selectPearl = (event: MouseEvent) => {
    // The TV page has no controls to let go of a held bubble, so a tap (the one that turns the
    // chimes on) never holds one: the tour keeps playing.
    if (this.tv) return;
    if (this.arrivalState.phase !== "idle" || this.director.traveling) return;
    const rect = this.canvas.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = ray.intersectObjects(
      [...this.bubbles.hitTargets, ...this.world.recognitionPearls].filter(
        (pearl) => pearl.visible,
      ),
      false,
    )[0];
    const id = hit?.object.userData.recognitionId;
    if (
      typeof id === "string" &&
      this.feed.records.some((record) => record.id === id)
    ) {
      this.recognitions.select(id, this.feed.records);
      this.readingHeld = true;
      this.options.onSelection?.();
      this.report();
    }
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.failed = true;
    this.renderer.setAnimationLoop(null);
    this.options.onFailure();
  };
  private visibilityChanged = () => {
    this.last = 0;
    this.reportAt = 0;
    this.windowFrames = 0;
    if (this.alive && !this.failed)
      this.renderer.setAnimationLoop(document.hidden ? null : this.tick);
  };
  private resize = () => {
    if (!this.alive || this.failed) return;
    const width = Math.max(1, this.canvas.clientWidth),
      height = Math.max(1, this.canvas.clientHeight);
    const tier = resolveStudyTier(this.quality, this.lowered);
    const low = tier === "low";
    if (isWorldDesignStudy()) {
      this.world.scene.userData.studyTier = tier;
      this.studyTier(low);
    }
    const pixels = low ? 1_050_000 : 2_600_000;
    const ratio = isWorldDesignStudy() ? studyPixelRatio(width, height, window.devicePixelRatio, this.quality, this.lowered) : Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(pixels / (width * height)),
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    if (this.radiance) {
      this.radiance.setTier(tier);
      this.renderer.getDrawingBufferSize(this.bufferSize);
      this.radiance.resize(this.bufferSize.x, this.bufferSize.y);
    }
    this.camera.aspect = width / height;
    this.camera.fov = width < height ? 63 : 43;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  };
  /**
   * Study only: publish the resolved picture quality tier on the scene, so the study
   * world can drop work on Low, and give Low a cheaper, wider shadow filter.
   *
   * three allocates the shadow render target once and only re-reads the orthographic
   * frustum when it allocates, so changing the map size means disposing the old target.
   */
  private studyTier(low: boolean) {
    this.world.scene.userData.lowTier = low;
    const type = low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (this.renderer.shadowMap.type !== type) {
      this.renderer.shadowMap.type = type;
      // The shadow filter is baked into every compiled program, so every material
      // must recompile, or the scene keeps the old filter after a tier change.
      this.world.scene.traverse((object) => {
        const material = (object as THREE.Mesh).material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (!material) return;
        (Array.isArray(material) ? material : [material]).forEach((m) => {
          m.needsUpdate = true;
        });
      });
    }
    const sun = this.world.scene.userData.studySun as
      | THREE.DirectionalLight
      | undefined;
    if (!sun) return;
    // Low takes the 1024 map the design's drop order names, with the wider, cheaper filter
    // below. The shadow is softer there by intent, not by accident.
    const size = low ? 1024 : 2048;
    if (sun.shadow.mapSize.width !== size) {
      sun.shadow.mapSize.set(size, size);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    sun.shadow.radius = low ? 3 : 1;
    this.renderer.shadowMap.needsUpdate = true;
  }
  private tick = (now: number) => {
    if (!this.alive || this.failed || document.hidden) return;
    const delta = this.last ? Math.min((now - this.last) / 1000, 1) : 0;
    this.last = now;
    const moving = !this.paused && !this.reduced && !this.sourceStill;
    const safe =
      this.feed.phase === "sample" ||
      this.feed.phase === "live" ||
      this.feed.phase === "reconnecting";
    const minimum = this.feed.snapshot?.settings.readingSeconds ?? 24;
    if (this.tv) this.tvPacing(now, safe);
    const previousArrival = this.arrivalState;
    const before = previousArrival.phase;
    const canStart =
      !this.paused &&
      !this.readingHeld &&
      (this.rotationPaused ||
        this.demoRequested ||
        this.isReadingComplete(delta, minimum));
    // TV page: at most one arrival interrupts the tour per minute (step 5).
    if (this.tv && canStart && previousArrival.phase === "idle" && safe && !this.feed.snapshot?.settings.pauseArrivals) {
      const id = this.pacer.next(this.tvClock, this.rotationPaused);
      if (id) this.arrivals.enqueue([id]);
    }
    this.arrivalState = this.arrivals.update(
      this.paused ? 0 : delta,
      this.feed.records,
      safe && !this.feed.snapshot?.settings.pauseArrivals,
      minimum,
      this.reduced || this.sourceStill,
      canStart,
    );
    if (
      before === "reading" &&
      this.arrivalState.phase === "settle" &&
      previousArrival.id
    )
      this.recognitions.noteCompletedArrival(
        previousArrival.id,
        this.feed.records,
      );
    if (arrivalAdmitted(before, this.arrivalState.phase)) {
      this.demoRequested = false;
      this.cycleStudyArrival();
      this.director.beginArrival(this.reduced || this.sourceStill);
    }
    if (this.arrivalState.phase === "return" && before !== "return")
      this.finishArrival(this.reduced || this.sourceStill);
    if (before !== "idle" && this.arrivalState.phase === "idle")
      this.finishArrival(true);
    const arriving = this.arrivalState.phase !== "idle";
    const readingBeforeCamera =
      this.readingZones.includes(this.director.zone) &&
      !this.director.traveling;
    if (readingBeforeCamera && !arriving)
      this.recognitions.update(
        0,
        this.readingPool(),
        minimum,
        true,
        true,
        this.feed.records,
      );
    const canDepart = this.isReadingComplete(delta, minimum);
    const departingZone = this.director.zone;
    if (!this.paused) {
      if (moving) this.elapsed += delta;
      const previousZone = this.director.zone;
      this.director.update(
        arriving ? delta : delta * this.speed * this.ownerTempo,
        !this.rotationPaused && !arriving,
        !arriving && (this.readingHeld || this.rotationPaused),
        canDepart,
        !moving,
      );
      if (previousZone !== this.director.zone) this.dirty = true;
    }
    // TV page: a departure after a full hold completes the place. The visit is counted once the
    // tour settles at the next place, so a place keeps its bubbles while the camera flies away.
    if (this.tv) {
      if (!this.tvWasTraveling && this.director.traveling && !arriving) this.pacer.placeCompleted();
      this.tvWasTraveling = this.director.traveling;
      if (!this.director.traveling && !arriving && this.director.zone !== this.tvSettledZone) {
        if (this.tvSettledZone) this.tvVisits.set(this.tvSettledZone, (this.tvVisits.get(this.tvSettledZone) ?? 0) + 1);
        this.tvSettledZone = this.director.zone;
        this.tvArrivalCounts.set(this.director.zone, (this.tvArrivalCounts.get(this.director.zone) ?? 0) + 1);
      }
    }
    if (this.mood) this.applyStudyMood(this.paused ? 0 : delta, moving);
    if (moving || arriving || before !== "idle") {
      this.world.update(this.elapsed, this.director.zone, this.arrivalState);
      this.dirty = true;
    }
    if (
      readingBeforeCamera &&
      (this.director.traveling || this.director.zone !== departingZone) &&
      !arriving &&
      canDepart
    )
      this.recognitions.finishReading();
    const readingVisible =
      this.readingZones.includes(this.director.zone) &&
      !this.director.traveling &&
      !arriving;
    const changedZone = this.director.zone !== this.lastReadingZone;
    if (changedZone) {
      this.recognitions.age = 0;
      this.lastReadingZone = this.director.zone;
    }
    const readingPaused =
      this.paused || this.rotationPaused || this.readingHeld || !readingVisible;
    // Resolve camera departure first so an unseen next story is never marked read.
    this.recognitions.update(
      readingPaused || changedZone ? 0 : delta,
      this.readingPool(),
      minimum,
      readingPaused,
      readingVisible,
      this.feed.records,
    );
    this.camera.position.copy(this.director.position);
    this.camera.lookAt(this.director.target);
    if (this.finesse) {
      const input = this.finesseInput;
      input.dt = this.paused ? 0 : delta;
      input.moving = moving;
      input.traveling = this.director.traveling;
      input.arrivalPhase = this.arrivalState.phase;
      input.reading = readingVisible && this.recognitions.id !== null;
      input.position = this.director.position;
      input.target = this.director.target;
      input.elapsed = this.elapsed;
      this.finesse.apply(this.camera, input);
    }
    // TV page: the camera glides in to read the place's bubbles, then back out. The glide blends
    // the finished tour pose (the finesse's breath included) toward the reading framing, so the
    // finesse's aim never trails it.
    if (this.tv) {
      this.tvFocus(delta, moving, readingVisible, minimum);
      this.world.scene.userData.tvReading = this.focusWeight;
    }
    // Everything downstream, the world bubbles included, reads the finished pose.
    this.camera.updateMatrixWorld();
    this.dirty =
      this.bubbles.update({
        time: this.elapsed,
        camera: this.camera,
        zone: this.director.zone,
        selectedId: this.recognitions.id,
        readingAge: this.recognitions.age,
        arrival: this.arrivalState,
        minimum,
        expressionId: this.expressionId,
        still: !moving,
        sparkles: this.feed.snapshot?.settings.effects?.sparkles !== false,
        trails:
          this.feed.snapshot?.settings.effects?.trails ??
          this.feed.snapshot?.settings.showTrails ??
          true,
        tvLoop: this.tv ? this.tvLoop : undefined,
        tvArrivals: this.tv ? this.tvArrivals : undefined,
        paused: this.paused,
        destination: this.director.destination,
        hold: this.holdFor,
      }) || this.dirty;
    if (this.hosts) {
      this.hosts.update({
        time: this.elapsed,
        dt: this.paused ? 0 : delta,
        camera: this.camera,
        phase: this.arrivalState.phase,
        traveling: this.director.traveling,
        bubble: this.bubbles.arrivalBubble(),
        still: !moving,
      });
    }
    // Study only: the focal pearl's place in the world, so the drifting petals can keep clear
    // of the words. Read on the next frame, which at these speeds is well inside the guard's margin.
    if (this.study)
      this.world.scene.userData.studyFocus = this.bubbles.inspect().focused;
    if (moving || this.dirty) {
      if (!moving)
        this.world.update(this.elapsed, this.director.zone, this.arrivalState);
      // One sun shadow refresh in six moving frames, and one on every dirty still frame, so
      // a paused capture always carries a fresh map and is the deterministic worst case.
      //
      // A flag already standing is kept rather than overwritten: `studyTier` raises it after
      // disposing the shadow map on a tier change, and dropping that would leave the world
      // sampling a null map for up to five frames. Only the main pass clears it, because
      // three returns from the shadow pass before clearing when the camera's layer collects
      // no lights, which is every auxiliary pass of the radiance frame.
      if (this.study)
        this.renderer.shadowMap.needsUpdate =
          this.renderer.shadowMap.needsUpdate ||
          !moving ||
          this.frameCount % 6 === 0;
      if (this.study) {
        const entries = this.world.scene.userData.studyDetailGroups;
        if (Array.isArray(entries))
          applyStudyDetail(
            entries as StudyDetailEntry[],
            this.camera.position,
            resolveStudyTier(this.quality, this.lowered),
          );
      }
      if (this.radiance) this.radiance.render(this.world.scene, this.camera);
      else this.renderer.render(this.world.scene, this.camera);
      this.frameCount++;
      this.windowFrames++;
      this.dirty = false;
    }
    if (!this.reportAt) this.reportAt = now;
    if (now - this.reportAt >= 1000) {
      this.fps = moving
        ? Math.round((this.windowFrames * 1000) / (now - this.reportAt))
        : 0;
      if (moving && this.fps < 25) this.slowWindows++;
      else this.slowWindows = 0;
      if (this.quality === "auto" && !this.lowered && this.slowWindows >= 3) {
        this.lowered = true;
        if (this.study) this.world.scene.userData.studyTier = "low";
        this.resize();
      }
      this.reportAt = now;
      this.windowFrames = 0;
      this.report();
    }
  };
  /**
   * Study only: what the light does between one place and the next.
   *
   * One smoothed envelope is spent four ways, and none of them can reach a pearl's words.
   * The tone mapping exposure never touches the face, the finishing pass or the halo, all of
   * which are `toneMapped: false`; the shared uniform is bound only to the sky and the cloud
   * banks; the glow strength belongs to the radiance composite, which is already multiplied
   * by one minus the protect mask over the pearl being read. The haze and the hush are the
   * world stepping back, not the message.
   *
   * With `moving` false the mood resolves to its parked values on the frame it is asked, so
   * a paused, reduced motion or Still capture renders at exactly today's exposure, haze and
   * twinkle, and two captures of it are identical.
   */
  private applyStudyMood(delta: number, moving: boolean) {
    const mood = this.mood;
    if (!mood) return;
    const input = this.moodInput;
    input.dt = delta;
    input.moving = moving;
    input.traveling = this.director.traveling;
    input.arrivalPhase = this.arrivalState.phase;
    mood.update(input);
    STUDY_EXPOSURE.value = mood.exposure;
    STUDY_CALM.value = mood.hush;
    this.renderer.toneMappingExposure = STUDY_TONE.exposure * mood.exposure;
    this.radiance?.setMood(mood.exposure);
    const scene = this.world.scene;
    scene.userData.studyHush = mood.hush;
    scene.userData.studyTravel = mood.travel;
    if (scene.fog instanceof THREE.Fog) {
      studyHaze(mood.travel, this.haze);
      scene.fog.near = this.haze.near;
      scene.fog.far = this.haze.far;
    }
  }
  private report() {
    this.options.onStatus({
      zone: this.director.zone,
      cameraPosition: this.director.position.toArray(),
      prototypeHeartReady: this.world.scene.userData.prototypeHeartReady,
      worldBubbles: this.bubbles.inspect(),
      destination: this.director.destination,
      traveling: this.director.traveling,
      elapsed: this.elapsed,
      fps: this.fps,
      frames: this.frameCount,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      textures: this.renderer.info.memory.textures,
      geometries: this.renderer.info.memory.geometries,
      quality:
        this.quality === "low" || (this.lowered && this.quality === "auto")
          ? "Low"
          : "High",
      arrival: this.arrivalState,
      recognitionId: this.recognitions.id,
      readingRemaining: this.recognitions.remaining(
        this.feed.records,
        this.feed.snapshot?.settings.readingSeconds ?? 24,
      ),
      kit: this.kitStatus,
      kitMissing: this.kit?.missing.length ?? 0,
      kitLoaded: this.kit?.loaded ?? 0,
      kitCounts: this.kit
        ? { loaded: this.kit.loaded, total: this.kit.loaded + this.kit.missing.length }
        : undefined,
      kitNeighbors: this.world.scene.userData.studyNeighbors === true,
      tvArrivals: this.tv ? this.tvFresh.map((item) => item.id) : undefined,
    });
  }
  /**
   * TV page: the camera's reading move (Anthony, 2026-09-24: "the camera flies close"). The
   * weight follows `tvFocusWeight` over the hold, but never faster than a full glide in 1.6 s,
   * so an arrival, a changed record or an owner's hold turns into a glide rather than a jump; a
   * pause holds it where it is, and a still view (reduced motion, Still) cuts instead.
   */
  private tvFocus(delta: number, moving: boolean, readingVisible: boolean, minimum: number) {
    const zone = this.director.zone;
    const current = this.readingPool().find((record) => record.id === this.recognitions.id);
    const wanted = TV_BUBBLE_PLACES.includes(zone) && current && readingVisible && this.arrivalState.phase === "idle"
      ? tvFocusWeight(this.recognitions.age, this.holdFor(current.message, minimum), !moving)
      : 0;
    if (!moving && !this.paused) this.focusWeight = wanted;
    else if (!this.paused) {
      const step = (Math.max(0, delta) * 1.6) / TV_FOCUS_IN;
      this.focusWeight += Math.max(-step, Math.min(step, wanted - this.focusWeight));
    }
    if (this.focusWeight < 1e-4) return;
    tvReadingFrame(zone, this.elapsed, this.camera.aspect, this.camera.fov, this.focusPose);
    this.focusMatrix.lookAt(this.focusPose.eye, this.focusPose.target, this.camera.up);
    this.focusQuaternion.setFromRotationMatrix(this.focusMatrix);
    this.camera.position.lerp(this.focusPose.eye, this.focusWeight);
    this.camera.quaternion.slerp(this.focusQuaternion, this.focusWeight);
  }
  /**
   * TV page: the pacing clock, the fresh marks for the ticker and, in sample mode, a
   * fictional arrival now and then so the lotus, the hosts and the pacing can be seen.
   */
  private tvPacing(now: number, safe: boolean) {
    if (this.tvStart < 0) this.tvStart = now;
    this.tvClock = (now - this.tvStart) / 1000;
    if (this.tvFresh.length && this.tvClock - this.tvFresh[0].at >= FRESH_SECONDS)
      this.tvFresh = this.tvFresh.filter((item) => this.tvClock - item.at < FRESH_SECONDS);
    if (!safe || this.feed.phase !== "sample" || this.tvClock < this.sampleArrivalAt) return;
    this.sampleArrivalAt += SAMPLE_ARRIVAL_EVERY;
    const pool = tvRecords(this.feed.records);
    if (!pool.length) return;
    const id = pool[this.sampleArrivalIndex++ % pool.length].id;
    this.pacer.forget(id);
    this.pacer.offer([id]);
    this.noteFresh([id]);
  }
  private noteFresh(ids: readonly string[]) {
    for (const id of ids) {
      this.tvFresh = this.tvFresh.filter((item) => item.id !== id);
      this.tvFresh.push({ id, at: this.tvClock });
    }
  }
  setFeed(feed: WorldFeed) {
    if ((feed.phase === "sample") !== (this.feed.phase === "sample")) {
      this.arrivals.cancel();
      this.finishArrival(true);
      this.arrivalState = this.arrivals.state();
      this.readingHeld = false;
    }
    this.feed = feed;
    const safe =
      feed.phase === "sample" ||
      feed.phase === "live" ||
      feed.phase === "reconnecting";
    const settings = feed.snapshot?.settings;
    this.ownerTempo =
      settings?.motion === "calm" ||
      ["slow", "calm", "gentle"].includes(settings?.tempo ?? "")
        ? 0.7
        : settings?.motion === "lively" ||
            ["fast", "lively"].includes(settings?.tempo ?? "")
          ? 1.2
          : 1;
    // Readable world bubbles replace the old empty Garden markers.
    this.world.setRecognitions([]);
    // Study only: the public aggregate insights (counts, never a name or a message) for the
    // kit's data driven dressing, cleared with every unsafe state exactly as the records are.
    if (this.study)
      this.world.scene.userData.studyInsights = safe
        ? (feed.snapshot?.insights ?? null)
        : null;
    this.bubbles.setRecords(safe ? feed.records : [], feed.phase === "sample");
    if (this.tv) this.tvPlan = planWorldBubbles(safe ? feed.records : []);
    this.world.setEffects(
      settings?.effects?.sparkles !== false,
      settings?.effects?.trails ?? settings?.showTrails ?? true,
    );
    this.rotationPaused = settings?.pauseRotation === true;
    const wasStill = this.sourceStill;
    this.sourceStill = settings?.motion === "still";
    if (this.sourceStill && !wasStill) this.settleMotion();
    const enabled = new Set(
      feed.snapshot?.presentation.playlist
        .filter((item) => item.enabled)
        .map((item) => item.id),
    );
    const ids = TOUR_ORDER.filter(
      (id) =>
        !feed.snapshot ||
        enabled.has(ZONES.find((zone) => zone.id === id)!.scene),
    );
    // Flat-screen playlist durations can park Garden for several minutes.
    // This world has its own TV touring pace and still waits for complete reading.
    const dwells = new Map<ZoneId, number>(ids.map((id) => [id, 20]));
    this.director.setPlaylist(ids, dwells);
    if (!safe || settings?.pauseArrivals) {
      this.arrivals.cancel();
      this.finishArrival(true);
      this.arrivalState = this.arrivals.state();
      this.pacer.clear();
      if (!safe) this.tvFresh = [];
    } else if (this.tv) {
      // New arrivals join the ticker at once; their lotus waits for the pacer.
      this.pacer.prune(new Set(feed.records.map((record) => record.id)));
      this.pacer.offer(feed.arrivals);
      this.noteFresh(feed.arrivals);
      const ids = new Set(feed.records.map((record) => record.id));
      this.tvFresh = this.tvFresh.filter((item) => ids.has(item.id));
    } else this.arrivals.enqueue(feed.arrivals);
    this.recognitions.update(
      0,
      this.readingPool(),
      settings?.readingSeconds ?? 24,
      true,
      this.readingZones.includes(this.director.zone) &&
        !this.director.traveling &&
        this.arrivalState.phase === "idle",
      feed.records,
    );
    this.dirty = true;
    this.report();
  }
  private isReadingComplete(delta: number, minimum: number) {
    if (
      !this.readingZones.includes(this.director.zone) ||
      this.director.traveling
    )
      return true;
    const current = this.readingPool().find(
      (record) => record.id === this.recognitions.id,
    );
    return (
      !current ||
      this.recognitions.age + delta >= this.holdFor(current.message, minimum)
    );
  }
  private readingPool(includeHeld = true) {
    const held = this.feed.records.find(
      (record) => record.id === this.recognitions.id,
    );
    if (includeHeld && this.readingHeld && held) return [held];
    const zone = this.director.zone;
    // TV page: each visit holds on the place's main bubble for this loop (step 5).
    if (this.tv && this.tvPlan && TV_BUBBLE_PLACES.includes(zone)) {
      const record = heldBig(this.tvPlan, zone, this.tvVisits.get(zone) ?? 0);
      this.tvPool.length = 0;
      if (record) this.tvPool.push(record);
      return this.tvPool;
    }
    if (zone === "featured") {
      const featured = this.feed.records.filter((record) => record.featured);
      return featured.length ? featured : this.feed.records;
    }
    if (zone === "orbit")
      return this.feed.records.filter((record) =>
        record.expressionIds.includes(this.expressionId),
      );
    return this.feed.records;
  }
  setExpression(id: number) {
    this.expressionId = id;
    if (this.study) {
      this.world.scene.userData.studyExpression = id;
      // A kit piece may follow the selected expression, so a paused world redraws once.
      if (this.kit) this.dirty = true;
    }
    this.recognitions.update(
      0,
      this.readingPool(),
      24,
      true,
      this.readingZones.includes(this.director.zone),
      this.feed.records,
    );
    this.report();
  }
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
  private cycleStudyArrival() {
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
  selectRecognition(id: string) {
    const enabled = new Set(
      this.feed.snapshot?.presentation.playlist
        .filter((item) => item.enabled)
        .map((item) => item.id),
    );
    const destination = ZONES.find(
      (zone) =>
        this.readingZones.includes(zone.id) &&
        (!this.feed.snapshot || enabled.has(zone.scene)),
    );
    if (
      !destination ||
      this.arrivalState.phase !== "idle" ||
      !this.feed.records.some((record) => record.id === id)
    )
      return;
    this.director.visit(destination.id, true);
    this.recognitions.select(id, this.feed.records);
    this.dirty = true;
    this.readingHeld = true;
    this.report();
  }
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
  private finishArrival(instant: boolean) {
    this.director.endArrival(instant);
    if (instant && (this.reduced || this.sourceStill))
      this.director.settleForStill();
  }
  private settleMotion() {
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
  dispose() {
    this.alive = false;
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.visibilityChanged);
    this.canvas.removeEventListener("webglcontextlost", this.contextLost);
    this.canvas.removeEventListener("click", this.selectPearl);
    this.radiance?.dispose();
    this.hosts?.dispose();
    this.world.dispose();
    this.bubbles.dispose();
    // After the world: its placements share the kit's geometry, and the kit ends the decoder.
    this.kit?.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
