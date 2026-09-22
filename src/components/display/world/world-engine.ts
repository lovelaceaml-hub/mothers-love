import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CameraDirector } from "./camera-director";
import { createWorldScene } from "./world-scene";
import { WorldRecognitionBubbles } from "./world-recognitions";
import { ArrivalDirector, type ArrivalState } from "./arrival-director";
import { RecognitionDirector } from "./recognition-director";
import { isWorldDesignStudy, type StudyArrival } from "./prototype/design-mode";
import { studyEnvironment, studyPixelRatio } from "./prototype/study-lighting";
import { STUDY_TONE } from "./prototype/study-palette";
import { emptyFeed, readingSeconds, type WorldFeed } from "./world-feed";
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
  quality: string;
  frames: number;
  arrival: ArrivalState;
  recognitionId: string | null;
  readingRemaining: number;
  cameraPosition?: number[];
  worldBubbles?: ReturnType<WorldRecognitionBubbles["inspect"]>;
  prototypeHeartReady?: boolean;
};
export type EngineOptions = {
  onStatus: (status: WorldStatus) => void;
  onFailure: () => void;
  reducedMotion: boolean;
  onSelection?: () => void;
};
export class WorldEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly director = new CameraDirector();
  readonly arrivals = new ArrivalDirector();
  readonly recognitions = new RecognitionDirector();
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
  private readonly world = createWorldScene();
  private readonly bubbles = new WorldRecognitionBubbles(this.world.scene);
  private readonly observer: ResizeObserver;
  private readonly environment: THREE.WebGLRenderTarget;
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
      this.world.scene.environment = this.environment.texture;
      this.world.scene.environmentIntensity = 0.55;
      if (isWorldDesignStudy()) this.world.scene.environmentIntensity = STUDY_TONE.environmentIntensity;
    } catch (error) {
      this.bubbles.dispose();
      this.world.dispose();
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
    const low =
      this.quality === "low" || (this.quality === "auto" && this.lowered);
    if (isWorldDesignStudy()) this.studyTier(low);
    const pixels = low ? 1_050_000 : 2_600_000;
    const ratio = isWorldDesignStudy() ? studyPixelRatio(width, height, window.devicePixelRatio, this.quality, this.lowered) : Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(pixels / (width * height)),
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
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
    const size = low ? 1536 : 2048;
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
    const previousArrival = this.arrivalState;
    const before = previousArrival.phase;
    const canStart =
      !this.paused &&
      !this.readingHeld &&
      (this.rotationPaused ||
        this.demoRequested ||
        this.isReadingComplete(delta, minimum));
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
    if (before === "idle" && this.arrivalState.phase !== "idle") {
      this.demoRequested = false;
      this.director.beginArrival(this.reduced || this.sourceStill);
    }
    if (this.arrivalState.phase === "return" && before !== "return")
      this.finishArrival(this.reduced || this.sourceStill);
    if (before !== "idle" && this.arrivalState.phase === "idle")
      this.finishArrival(true);
    const arriving = this.arrivalState.phase !== "idle";
    const readingBeforeCamera =
      RECOGNITION_ZONES.includes(this.director.zone) &&
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
      RECOGNITION_ZONES.includes(this.director.zone) &&
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
      }) || this.dirty;
    if (moving || this.dirty) {
      if (!moving)
        this.world.update(this.elapsed, this.director.zone, this.arrivalState);
      this.renderer.render(this.world.scene, this.camera);
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
        this.resize();
      }
      this.reportAt = now;
      this.windowFrames = 0;
      this.report();
    }
  };
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
    });
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
    this.bubbles.setRecords(safe ? feed.records : []);
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
    } else this.arrivals.enqueue(feed.arrivals);
    this.recognitions.update(
      0,
      this.readingPool(),
      settings?.readingSeconds ?? 24,
      true,
      RECOGNITION_ZONES.includes(this.director.zone) &&
        !this.director.traveling &&
        this.arrivalState.phase === "idle",
      feed.records,
    );
    this.dirty = true;
    this.report();
  }
  private isReadingComplete(delta: number, minimum: number) {
    if (
      !RECOGNITION_ZONES.includes(this.director.zone) ||
      this.director.traveling
    )
      return true;
    const current = this.readingPool().find(
      (record) => record.id === this.recognitions.id,
    );
    return (
      !current ||
      this.recognitions.age + delta >= readingSeconds(current.message, minimum)
    );
  }
  private readingPool(includeHeld = true) {
    const held = this.feed.records.find(
      (record) => record.id === this.recognitions.id,
    );
    if (includeHeld && this.readingHeld && held) return [held];
    const zone = this.director.zone;
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
    this.recognitions.update(
      0,
      this.readingPool(),
      24,
      true,
      RECOGNITION_ZONES.includes(this.director.zone),
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
        RECOGNITION_ZONES.includes(zone.id) &&
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
    this.world.dispose();
    this.bubbles.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
