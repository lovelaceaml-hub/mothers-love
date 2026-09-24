import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import { isWorldDesignStudy } from "./art/design-mode";
import { StudyPearlAssets, type StudyPearlFrame } from "./art/pearl-skin";
import { STUDY_TV_SPECKS, StudyWaterHalo } from "./art/study-glory";
import { RECOGNITION_ZONES, type ZoneId } from "./world-data";
import { TV_BUBBLE_PLACES, planWorldBubbles, studyTvPage, type WorldBubblePlan } from "./art/tv-page";
import { TV_BIG, TvBubbleDecor, TvDecorShared, type TvBubbleRole } from "./art/tv-bubbles";
import { TV_MEDALLION_SCALE, tvPlaceWorld } from "./art/tv-places";
import { TvLeavePath, TvRisePath, TvSwap, TvFlowTurn, type TvFlowPose } from "./art/tv-flow";
import {
  wrapBubbleText, type Input, type TvSlot, type TvSpot, type TvPlace, type Slot,
} from "./world-bubble-layout";
import { createBubbleSlot, assignBubbleSlots, paintBubble, paintTvBubble } from "./world-bubble-slots";
import {
  updateTvBubblePlace, tvBubbleSpot, showTvBubbleSlot, tvBubbleSkin, publishTvBubbleDiscs,
} from "./world-bubble-tv";
import { updateWorldBubbles, recedeBubbles, bubbleFrameFor, bubbleEffects } from "./world-bubble-frame";

export { wrapBubbleText, studyHeroPlacement, studyResidents } from "./world-bubble-layout";

/**
 * All recognition pixels belong to depth-tested scene objects, never the camera.
 *
 * Its longer methods live in world-bubble-frame.ts, world-bubble-slots.ts and world-bubble-tv.ts
 * and run with the bubbles as `this`, so the members they read carry no `private` modifier.
 */
export class WorldRecognitionBubbles {
  readonly hitTargets: T.Mesh[] = [];
  readonly root = new T.Group();
  readonly disc = new T.CircleGeometry(1, isWorldDesignStudy() ? 192 : 72);
  readonly rim = new T.TorusGeometry(1, 0.012, 6, 72);
  readonly dot = new T.SphereGeometry(0.026, 6, 4);
  readonly rimMaterial = new T.MeshBasicMaterial({
    color: "#fff5d9",
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  readonly lightMaterial = new T.MeshBasicMaterial({
    color: "#fff6c7",
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  readonly slots: Slot[] = [];
  readonly dummy = new T.Object3D();
  records = new Map<string, Recognition>();
  focused?: Slot;
  projection = new T.Vector3();
  arrivalInWorld = false;
  readonly designStudy = isWorldDesignStudy();
  readonly studyAssets?: StudyPearlAssets;
  /**
   * Study only: the reflection the pearl being read lays on the sea. It lives here because
   * this is the only place that knows which pearl that is, and it follows that pearl's world
   * place rather than the camera, so it stays a property of the world and not of the screen.
   */
  readonly waterHalo?: StudyWaterHalo;
  readonly frameScratch = new T.Vector3();
  readonly plainFrame: StudyPearlFrame = {
    sparkles: false,
    portrait: false,
    orbitScale: 1,
    lanes: true,
    shield: false,
  };
  // Reused every frame so the detailed slots never allocate.
  readonly detailedFrame: StudyPearlFrame = {
    sparkles: false,
    portrait: false,
    orbitScale: 1,
    lanes: true,
    shield: false,
  };

  /**
   * Study only: how far the world has stepped back for an entrance, 0 to 1, published on the
   * scene by the engine each frame. It is read once per update rather than per slot.
   */
  hush = 0;
  /** TV page only (`?view=tv`): every place's main and flowing bubbles (`tv-places.ts`, `tv-flow.ts`). */
  readonly tvPage = studyTvPage();
  private readonly tvShared?: TvDecorShared;
  readonly tvPlaces = new Map<ZoneId, TvPlace>();
  tvPlan?: WorldBubblePlan;
  tvSample = false;

  constructor(readonly hostScene: T.Scene) {
    const scene = hostScene;
    if (this.designStudy) this.studyAssets = new StudyPearlAssets(() => scene.userData.invalidate?.());
    // The TV page's clear air lays a fainter light on the sea under the bubble being read.
    if (this.designStudy) this.waterHalo = this.tvPage ? new StudyWaterHalo(scene, STUDY_TV_SPECKS.waterHalo) : new StudyWaterHalo(scene);
    this.root.name = "Recognition bubbles in the world";
    scene.add(this.root);
    if (this.tvPage) {
      this.tvShared = new TvDecorShared();
      const lift = new T.Vector3(0, 0.55, 0);
      TV_BUBBLE_PLACES.forEach((place, seed) => {
        const world = tvPlaceWorld(place);
        // Only the main bubble wears the study's glass skin and its expression medallions.
        const make = (role: TvBubbleRole, index: number) => {
          const slot = this.create(place, index, role === "main");
          this.makeTv(slot, role, place);
          return slot;
        };
        this.tvPlaces.set(place, {
          world,
          seed,
          presence: 0,
          turn: new TvFlowTurn(),
          main: {
            swap: new TvSwap(), slots: [make("main", 0), make("main", 1)],
            rise: new TvRisePath(world.main.lotus.clone().add(lift), world.main.centre),
            leave: new TvLeavePath(world.main.centre, world.main.away),
          },
          flow: {
            swap: new TvSwap(), slots: [make("flow", 2), make("flow", 3)],
            rise: new TvRisePath(world.flow.lotus.clone().add(lift), world.flow.rest),
            leave: new TvLeavePath(world.flow.rest, world.flow.away),
          },
        });
      });
    }
    // Every other recognition place keeps its three study pearls.
    for (const zone of RECOGNITION_ZONES.filter((item) => !this.tvPlaces.has(item)))
      for (let index = 0; index < 3; index++) this.create(zone, index);
    const arrival = this.create("arrival", 0);
    // The arriving bubble reads like a main one: the same face, window and body size.
    if (this.tvPage) this.makeTv(arrival, "main", "arrival");
  }
  private makeTv(slot: Slot, role: TvBubbleRole, place: TvSlot["place"]) {
    slot.tv = { role, place, decor: new TvBubbleDecor(slot.root, this.tvShared!), windowTop: 0, style: TV_BIG, diameter: 0 };
  }
  /** In world-bubble-slots.ts. */
  private create(zone: Slot["zone"], index: number, skin = true): Slot {
    return createBubbleSlot.call(this, zone, index, skin);
  }
  clear(slot: Slot) {
    slot.root.visible = slot.face.visible = false;
    slot.study?.clear();
    slot.face.userData = {};
    slot.record = undefined;
    slot.fingerprint = slot.pageKey = "";
    slot.texture?.dispose();
    slot.texture = undefined;
    if (slot.canvas) {
      slot.canvas.width = slot.canvas.height = 1;
      slot.canvas = undefined;
    }
    slot.face.material.map = null;
    slot.face.material.needsUpdate = true;
    slot.tv?.decor.setMessage(undefined, 0, 1, wrapBubbleText);
  }
  /** `sample` lets the TV page show fictional heart counts; live pages have none to show. */
  setRecords(records: readonly Recognition[], sample = false) {
    this.records = new Map(records.map((record) => [record.id, record]));
    if (this.tvPage) {
      this.tvPlan = planWorldBubbles(records);
      this.tvSample = sample;
    }
    for (const slot of this.slots) {
      if (!slot.record) continue;
      const next = this.records.get(slot.record.id);
      if (!next || this.fingerprint(next) !== slot.fingerprint)
        this.clear(slot);
      else slot.record = next;
    }
    if (!records.length) {
      this.focused = undefined;
      this.arrivalInWorld = false;
    }
  }
  fingerprint(record: Recognition) {
    return JSON.stringify([
      record.id,
      record.recipient,
      record.message,
      record.expressionIds,
    ]);
  }
  /** In world-bubble-slots.ts. */
  assign(slot: Slot, record: Recognition | undefined, time: number) {
    return assignBubbleSlots.call(this, slot, record, time);
  }
  /** In world-bubble-slots.ts. */
  paint(slot: Slot, age: number, minimum: number) {
    return paintBubble.call(this, slot, age, minimum);
  }
  /** In world-bubble-slots.ts. */
  paintTv(slot: Slot, record: Recognition) { return paintTvBubble.call(this, slot, record); }
  /** In world-bubble-tv.ts. */
  updateTvPlace(place: ZoneId, state: TvPlace, input: Input, entranceActive: boolean, arrivalId: string | null) {
    return updateTvBubblePlace.call(this, place, state, input, entranceActive, arrivalId);
  }
  /**
   * TV page: a place shows its bubbles only while the camera is there or flying between it and
   * the next place, so every view reads one place's recognitions and no far bubble clutters it
   * (textures and all are released elsewhere). A place fades in and out over about a second.
   */
  tvLastTime = 0;
  tvStarted = false;
  tvPlaceShown(place: ZoneId, state: TvPlace, input: Input) {
    const shown = place === input.zone || place === input.destination;
    const dt = Math.max(0, Math.min(0.25, input.time - this.tvLastTime));
    // The first frame opens on the place as it is; after that a place fades in and out.
    state.presence = input.still || !this.tvStarted ? (shown ? 1 : 0)
      : state.presence + ((shown ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / 0.35));
    return shown || state.presence > 0.01;
  }
  hideTv(slot: Slot) {
    if (slot.record) this.clear(slot);
    slot.root.visible = slot.face.visible = false;
    slot.tv?.decor && (slot.tv.decor.visible = false);
  }
  readonly tvPose: TvFlowPose = { u: 0, scale: 1, opacity: 1 };
  readonly tvPlainFrame: StudyPearlFrame = { sparkles: false, portrait: false, orbitScale: TV_MEDALLION_SCALE, lanes: false, shield: false };
  readonly tvLeavePose: TvFlowPose = { u: 0, scale: 1, opacity: 1 };
  /** In world-bubble-tv.ts. */
  tvSpot(place: ZoneId, state: TvPlace, spot: TvSpot, record: Recognition | undefined, input: Input, active: boolean) {
    return tvBubbleSpot.call(this, place, state, spot, record, input, active);
  }
  restPose() {
    const pose = this.tvPose;
    pose.u = 1; pose.scale = 1; pose.opacity = 1;
    return pose;
  }
  /** In world-bubble-tv.ts. */
  showTvSlot(slot: Slot, record: Recognition, input: Input, pose: TvFlowPose, bob: number, place: ZoneId, presence: number, swapAt: number, leaving: boolean) {
    return showTvBubbleSlot.call(this, slot, record, input, pose, bob, place, presence, swapAt, leaving);
  }
  /** In world-bubble-tv.ts. */
  tvSkin(slot: Slot, input: Input, place: ZoneId, resting: boolean, opacity: number) {
    return tvBubbleSkin.call(this, slot, input, place, resting, opacity);
  }
  /**
   * TV page: every TV bubble on show this frame, published on the scene for the neighbors'
   * speech cards, which step aside rather than cover one (`kit-neighbors.ts`).
   */
  readonly tvDiscList: Slot[] = [];
  readonly tvDiscs: Array<{ position: number[]; radius: number }> = [];
  /** In world-bubble-tv.ts. */
  publishTvDiscs() { return publishTvBubbleDiscs.call(this); }
  /** The record the camera holds on at a place: its main bubble's. */
  tvHoldRecord(place: ZoneId, input: Input) {
    const id = this.tvPlaces.get(place)?.main.swap.current ?? input.selectedId;
    return id ? this.records.get(id) : undefined;
  }
  /** In world-bubble-frame.ts. */
  update(input: Input) { return updateWorldBubbles.call(this, input); }
  /** In world-bubble-frame.ts. */
  recede(slot: Slot) { return recedeBubbles.call(this, slot); }
  /** In world-bubble-frame.ts. */
  frameFor(slot: Slot, camera: T.PerspectiveCamera, sparkles: boolean, shield = false): StudyPearlFrame {
    return bubbleFrameFor.call(this, slot, camera, sparkles, shield);
  }
  /** In world-bubble-frame.ts. */
  effects(slot: Slot, time: number, sparkles: boolean, trails: boolean) {
    return bubbleEffects.call(this, slot, time, sparkles, trails);
  }
  /** TV page: the arriving bubble's world place and size while it shows, for the hosts. */
  arrivalBubble(): { position: T.Vector3; radius: number } | undefined {
    const slot = this.slots[this.slots.length - 1];
    if (!slot?.root.visible) return undefined;
    this.arrivalScratch.position.copy(slot.root.position);
    this.arrivalScratch.radius = slot.radius;
    return this.arrivalScratch;
  }
  private readonly arrivalScratch = { position: new T.Vector3(), radius: 0 };
  inspect() {
    return {
      count: this.slots.filter((slot) => slot.root.visible).length,
      focused: this.focused?.root.visible
        ? {
            position: this.focused.root.position.toArray(),
            screen: this.projection.toArray(),
            radius: this.focused.radius,
          }
        : undefined,
      arrivalInWorld: this.arrivalInWorld,
      textures: this.slots.filter((slot) => slot.texture).length,
    };
  }
  dispose() {
    this.slots.forEach((slot) => {
      this.clear(slot);
      slot.face.material.dispose();
      slot.lights.dispose();
      slot.study?.dispose();
    });
    this.records.clear();
    this.waterHalo?.dispose();
    this.slots.forEach((slot) => slot.tv?.decor.dispose());
    this.tvPlaces.clear();
    this.tvShared?.dispose();
    this.studyAssets?.dispose();
    this.focused = undefined;
    this.hitTargets.length = 0;
    this.disc.dispose();
    this.rim.dispose();
    this.dot.dispose();
    this.rimMaterial.dispose();
    this.lightMaterial.dispose();
    this.root.removeFromParent();
    this.root.clear();
  }
}
