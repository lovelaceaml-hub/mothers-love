/** The engine's frame loop: the tick, the study mood, the TV page's reading glide and pacing, and the status report. WorldEngine calls these with itself as `this`. */
import * as THREE from "three";
import { arrivalAdmitted } from "./art/arrival-choreography";
import { resolveStudyTier } from "./art/study-radiance";
import { applyStudyDetail, type StudyDetailEntry } from "./art/study-budget";
import { studyHaze, studyHazeColor } from "./art/study-mood";
import { STUDY_CALM, STUDY_EXPOSURE } from "./art/study-materials";
import { STUDY_TONE, STUDY_TV_FOG } from "./art/study-palette";
import { TV_BUBBLE_PLACES, tvRecords } from "./art/tv-page";
import { TV_FOCUS_DELAY, TV_FOCUS_IN, tvFocusWeight, tvReadingFrame } from "./art/tv-places";
import { SAMPLE_ARRIVAL_EVERY, FRESH_SECONDS } from "./world-engine-options";
import type { WorldEngine } from "./world-engine";

export function engineTick(this: WorldEngine, now: number) {
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
          this.tv,
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
}

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
export function applyEngineStudyMood(this: WorldEngine, delta: number, moving: boolean) {
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
    // The TV page's clear air never closes in: its flight haze is its parked haze.
    if (this.tv) studyHaze(mood.travel, this.haze, STUDY_TV_FOG, STUDY_TV_FOG);
    else studyHaze(mood.travel, this.haze);
    scene.fog.near = this.haze.near;
    scene.fog.far = this.haze.far;
    // TV page: the fog and the background dip with the sky (`studyHazeColor`), so the fully
    // fogged sea meets the sky's horizon in one colour through a flight too. The radiance
    // pass blacks the fog out for its glow layer and puts this exact colour back after.
    if (this.tv) {
      studyHazeColor(this.tvHazeBase, mood.exposure, scene.fog.color);
      if (scene.background instanceof THREE.Color) scene.background.copy(scene.fog.color);
    }
  }
}

export function reportEngineStatus(this: WorldEngine) {
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
 * weight follows `tvFocusWeight` over the hold, but never faster than a full glide in about
 * 1.4 s (`TV_FOCUS_IN` / 1.6), so an arrival, a changed record or an owner's hold turns into a
 * glide rather than a jump; a pause holds it where it is, and a still view (reduced motion,
 * Still) cuts instead. While the owner has paused rotation the reading age stands still, so
 * once the place has had its first look the camera reads in the full framing, never frozen
 * half way through a glide in or out.
 */
export function engineTvFocus(this: WorldEngine, delta: number, moving: boolean, readingVisible: boolean, minimum: number) {
  const zone = this.director.zone, age = this.recognitions.age;
  const current = this.readingPool().find((record) => record.id === this.recognitions.id);
  const wanted = TV_BUBBLE_PLACES.includes(zone) && current && readingVisible && this.arrivalState.phase === "idle"
    ? (this.rotationPaused && age > TV_FOCUS_DELAY ? 1 : tvFocusWeight(age, this.holdFor(current.message, minimum), !moving))
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
export function engineTvPacing(this: WorldEngine, now: number, safe: boolean) {
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

export function noteEngineFresh(this: WorldEngine, ids: readonly string[]) {
  for (const id of ids) {
    this.tvFresh = this.tvFresh.filter((item) => item.id !== id);
    this.tvFresh.push({ id, at: this.tvClock });
  }
}
