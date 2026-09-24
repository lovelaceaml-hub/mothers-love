import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import type { ArrivalState } from "./arrival-director";
import { messagePages, readingSeconds } from "./reading";
import { isWorldDesignStudy } from "./prototype/design-mode";
import {
  StudyPearlAssets,
  StudyPearlSkin,
  paintStudyPearl,
  type StudyPearlFrame,
} from "./prototype/pearl-skin";
import { StudyWaterHalo } from "./prototype/study-glory";
import { studyCanvasSize, type StudyTier } from "./prototype/study-budget";
import {
  RECOGNITION_ZONES,
  TOUR_ORDER,
  WORLD_EXPRESSIONS,
  ZONES,
  type ZoneId,
} from "./world-data";
import {
  TV_BUBBLE_PLACES,
  heldBig,
  planWorldBubbles,
  sampleHeartCount,
  studyTvPage,
  worldHoldSeconds,
  type WorldBubblePlan,
} from "./prototype/tv-page";
import {
  TV_BIG,
  TvBubbleDecor,
  TvDecorShared,
  canvasMeasure,
  paintTvBigFace,
  tvFitFlowDiameter,
  tvFlowStyle,
  tvScrollFraction,
  type TvBubbleRole,
  type TvFaceStyle,
} from "./prototype/tv-bubbles";
import {
  TV_FOCUS_DELAY,
  TV_FOCUS_IN,
  TV_FOCUS_OUT,
  TV_FLOW_MIN_DIAMETER,
  TV_MAIN_RADIUS,
  TV_MEDALLION_SCALE,
  TV_READ,
  TV_PLACES,
  tvFlowRadius,
  tvPlaceWorld,
  type TvPlaceWorld,
} from "./prototype/tv-places";
import {
  TV_FLOW_SETTLED,
  TvLeavePath,
  TvRisePath,
  TvSwap,
  tvArriving,
  tvFlowRecord,
  tvLeaving,
  tvRestBob,
  TvFlowTurn,
  type TvFlowPose,
} from "./prototype/tv-flow";

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

type Input = {
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
type TvSlot = {
  role: TvBubbleRole;
  place: ZoneId | "arrival";
  decor: TvBubbleDecor;
  windowTop: number;
  style: TvFaceStyle;
  /** A flowing bubble's diameter on screen at rest, px, which its face was painted for. */
  diameter: number;
};
/** TV page only: one bubble spot of a place, its two slots (one arriving, one leaving) and its ways in and out. */
type TvSpot = { swap: TvSwap; slots: [Slot, Slot]; rise: TvRisePath; leave: TvLeavePath };
type TvPlace = { world: TvPlaceWorld; main: TvSpot; flow: TvSpot; seed: number; presence: number; turn: TvFlowTurn };
type Slot = {
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

/** All recognition pixels belong to depth-tested scene objects, never the camera. */
export class WorldRecognitionBubbles {
  readonly hitTargets: T.Mesh[] = [];
  private readonly root = new T.Group();
  private readonly disc = new T.CircleGeometry(1, isWorldDesignStudy() ? 192 : 72);
  private readonly rim = new T.TorusGeometry(1, 0.012, 6, 72);
  private readonly dot = new T.SphereGeometry(0.026, 6, 4);
  private readonly rimMaterial = new T.MeshBasicMaterial({
    color: "#fff5d9",
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  private readonly lightMaterial = new T.MeshBasicMaterial({
    color: "#fff6c7",
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  private readonly slots: Slot[] = [];
  private readonly dummy = new T.Object3D();
  private records = new Map<string, Recognition>();
  private focused?: Slot;
  private projection = new T.Vector3();
  private arrivalInWorld = false;
  private readonly designStudy = isWorldDesignStudy();
  private readonly studyAssets?: StudyPearlAssets;
  /**
   * Study only: the reflection the pearl being read lays on the sea. It lives here because
   * this is the only place that knows which pearl that is, and it follows that pearl's world
   * place rather than the camera, so it stays a property of the world and not of the screen.
   */
  private readonly waterHalo?: StudyWaterHalo;
  private readonly frameScratch = new T.Vector3();
  private readonly plainFrame: StudyPearlFrame = {
    sparkles: false,
    portrait: false,
    orbitScale: 1,
    lanes: true,
    shield: false,
  };
  // Reused every frame so the detailed slots never allocate.
  private readonly detailedFrame: StudyPearlFrame = {
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
  private hush = 0;
  /** TV page only (`?view=tv`): every place's main and flowing bubbles (`tv-places.ts`, `tv-flow.ts`). */
  private readonly tvPage = studyTvPage();
  private readonly tvShared?: TvDecorShared;
  private readonly tvPlaces = new Map<ZoneId, TvPlace>();
  private tvPlan?: WorldBubblePlan;
  private tvSample = false;

  constructor(private readonly hostScene: T.Scene) {
    const scene = hostScene;
    if (this.designStudy) this.studyAssets = new StudyPearlAssets(() => scene.userData.invalidate?.());
    if (this.designStudy) this.waterHalo = new StudyWaterHalo(scene);
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
  private create(zone: Slot["zone"], index: number, skin = true): Slot {
    const root = new T.Group();
    const material = new T.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.03,
      depthTest: true,
      depthWrite: true,
      toneMapped: false,
      side: T.DoubleSide,
    });
    const face = new T.Mesh(this.disc, material);
    const ring = new T.Mesh(this.rim, this.rimMaterial);
    ring.position.z = 0.018;
    const lights = new T.InstancedMesh(this.dot, this.lightMaterial, 10);
    lights.frustumCulled = false;
    root.add(face, ring, lights);
    // The slot ordinal seeds this pearl, so its sparkle scatter is stable and unlike its neighbours.
    // The skin reads the 3D Studio kit off the scene lazily, on its first update (Plan 26 K1).
    const study = this.studyAssets && skin
      ? new StudyPearlSkin(root, this.studyAssets, this.slots.length, () => this.hostScene.userData.studyKit)
      : undefined;
    root.visible = face.visible = false;
    this.root.add(root);
    const slot: Slot = {
      zone,
      index,
      root,
      face,
      ring,
      lights,
      fingerprint: "",
      pageKey: "",
      born: 0,
      radius: 0,
      study,
    };
    this.slots.push(slot);
    this.hitTargets.push(face);
    return slot;
  }
  private clear(slot: Slot) {
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
  private fingerprint(record: Recognition) {
    return JSON.stringify([
      record.id,
      record.recipient,
      record.message,
      record.expressionIds,
    ]);
  }
  private assign(slot: Slot, record: Recognition | undefined, time: number) {
    if (!this.designStudy && slot.record?.id === record?.id) return;
    const publishedTier = this.hostScene.userData.studyTier;
    const tier: StudyTier = publishedTier === "auto" || publishedTier === "low"
      ? publishedTier
      : "high";
    // On the TV page a main bubble is 650 px across and a flowing one at most 400 (`TV_READ`),
    // so 1024 and 512 faces are drawn a little over one texel to the pixel; the arriving one
    // keeps the study's hero size.
    const canvasSize = slot.tv
      ? slot.tv.place === "arrival" ? studyCanvasSize(true, tier) : slot.tv.role === "main" ? 1024 : 512
      : this.designStudy
        ? studyCanvasSize(slot.index === 0, tier)
        : (slot.index === 0 ? 1024 : 512);
    if (
      this.designStudy &&
      slot.record?.id === record?.id &&
      (!record || slot.canvas?.width === canvasSize)
    ) return;
    this.clear(slot);
    if (!record) return;
    slot.record = record;
    slot.fingerprint = this.fingerprint(record);
    slot.born = time;
    slot.face.userData.recognitionId = record.id;
    slot.canvas = document.createElement("canvas");
    slot.canvas.width = slot.canvas.height = canvasSize;
    slot.texture = new T.CanvasTexture(slot.canvas);
    slot.texture.colorSpace = T.SRGBColorSpace;
    slot.texture.generateMipmaps = true;
    slot.texture.minFilter = T.LinearMipmapLinearFilter;
    slot.face.material.map = slot.texture;
    slot.face.material.needsUpdate = true;
  }
  private paint(slot: Slot, age: number, minimum: number) {
    const record = slot.record;
    if (!record || !slot.canvas || !slot.texture) return false;
    // The TV faces paint once per record, so they never page (nor segment the message every frame).
    if (slot.tv) return this.paintTv(slot, record);
    const pages = messagePages(record.message);
    const page = Math.min(
      pages.length - 1,
      Math.floor(
        Math.max(0, age) /
          (readingSeconds(record.message, minimum) / pages.length),
      ),
    );
    const key = this.designStudy
      ? `${page}:${minimum}:${slot.canvas.width}`
      : `${page}:${minimum}`;
    if (slot.pageKey === key) return false;
    slot.pageKey = key;
    if (this.designStudy) {
      paintStudyPearl(slot.canvas, record, pages[page], page, pages.length, wrapBubbleText);
      slot.texture.needsUpdate = true;
      return true;
    }
    const c = slot.canvas.getContext("2d")!;
    const color =
      WORLD_EXPRESSIONS.find(
        (expression) => expression.id === record.expressionIds[0],
      )?.color ?? "#dfa3be";
    c.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
    c.save();
    c.scale(slot.canvas.width / 1024, slot.canvas.height / 1024);
    c.beginPath();
    c.arc(512, 512, 507, 0, Math.PI * 2);
    c.clip();
    const pearl = c.createRadialGradient(355, 240, 20, 530, 500, 670);
    pearl.addColorStop(0, "#fffef8");
    pearl.addColorStop(0.5, "#fffaf4");
    pearl.addColorStop(0.78, "#f1dfef");
    pearl.addColorStop(1, color);
    c.fillStyle = pearl;
    c.fillRect(0, 0, 1024, 1024);
    const tint = c.createRadialGradient(780, 720, 10, 650, 650, 470);
    tint.addColorStop(0, "#bde5e766");
    tint.addColorStop(1, "#c4dfe800");
    c.fillStyle = tint;
    c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = "#ffffffee";
    c.lineWidth = 12;
    c.beginPath();
    c.arc(512, 512, 496, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = "#ffffffc9";
    c.lineWidth = 19;
    c.beginPath();
    c.ellipse(405, 153, 175, 46, -0.38, Math.PI, Math.PI * 2);
    c.stroke();
    c.textAlign = "center";
    c.textBaseline = "top";
    let nameSize = 68,
      names: string[] = [];
    do {
      c.font = `${nameSize}px Georgia, serif`;
      names = wrapBubbleText(
        (t) => c.measureText(t).width,
        record.recipient,
        690,
      );
      if (names.length * nameSize * 1.12 <= 185) break;
      nameSize -= 4;
    } while (nameSize > 28);
    let bodySize = 48,
      lines: string[] = [];
    do {
      c.font = `${bodySize}px Arial, sans-serif`;
      lines = wrapBubbleText((t) => c.measureText(t).width, pages[page], 710);
      if (lines.length * bodySize * 1.3 <= 310) break;
      bodySize -= 2;
    } while (bodySize > 28);
    const nameHeight = names.length * nameSize * 1.12,
      bodyHeight = lines.length * bodySize * 1.3;
    let y = 505 - (nameHeight + 28 + bodyHeight + 54) / 2;
    c.font = `${nameSize}px Georgia, serif`;
    c.fillStyle = "#713b59";
    names.forEach((line) => {
      c.fillText(line, 512, y);
      y += nameSize * 1.12;
    });
    y += 28;
    c.font = `${bodySize}px Arial, sans-serif`;
    c.fillStyle = "#44354b";
    lines.forEach((line) => {
      c.fillText(line, 512, y);
      y += bodySize * 1.3;
    });
    y += 26;
    c.font = "25px Arial, sans-serif";
    c.fillStyle = "#856579";
    c.fillText(
      pages.length > 1
        ? `${page + 1} of ${pages.length}`
        : record.expressionIds.join(" · "),
      512,
      y,
    );
    c.restore();
    slot.texture.needsUpdate = true;
    return true;
  }
  /**
   * TV page: the face once per record and canvas, and the whole message in its window. A main
   * bubble reads at the main size; a flowing one is as large as its message needs (up to the
   * layout's largest) and its words are sized to it, 23.5 px at rest whatever its diameter.
   */
  private paintTv(slot: Slot, record: Recognition) {
    const tv = slot.tv!, canvas = slot.canvas!, texture = slot.texture!;
    const heart = sampleHeartCount(record, this.tvSample);
    const key = `tv:${canvas.width}:${heart}`;
    if (slot.pageKey === key) return false;
    slot.pageKey = key;
    tv.diameter = tv.role === "flow"
      ? tvFitFlowDiameter(canvasMeasure(canvas.getContext("2d")!), record, wrapBubbleText, TV_FLOW_MIN_DIAMETER, TV_READ.flow.max, canvas.width / 1024)
      : 0;
    tv.style = tv.role === "flow" ? tvFlowStyle(tv.diameter) : TV_BIG;
    tv.windowTop = paintTvBigFace(canvas, record, heart, wrapBubbleText, tv.style).windowTop;
    tv.decor.setMessage(record.message, tv.windowTop, canvas.width / 1024, wrapBubbleText, tv.style);
    texture.needsUpdate = true;
    return true;
  }
  /**
   * TV page: one place's two bubbles. The main bubble shows the record being read (or the
   * plan's main record for this loop); the flowing one, the place's next small record at every
   * arrival. When either is to show another recognition, the old bubble floats away and a new
   * one rises from its lotus (`tv-flow.ts`).
   */
  private updateTvPlace(place: ZoneId, state: TvPlace, input: Input, entranceActive: boolean, arrivalId: string | null) {
    const active = this.tvPlaceShown(place, state, input);
    const plan = this.tvPlan;
    const selected = place === input.zone && input.selectedId ? this.records.get(input.selectedId) : undefined;
    const main = selected ?? (plan ? heldBig(plan, place, input.tvLoop?.(place) ?? 0) : undefined);
    const turn = state.turn.update(input.tvArrivals?.(place) ?? 0, place === input.zone, input.readingAge, TV_PLACES[place].stream);
    const flow = tvFlowRecord(plan, place, turn, main?.id);
    // The recognition presented at the arrival stage is not shown twice while it is there.
    const shown = (record?: Recognition) => (record && entranceActive && record.id === arrivalId ? undefined : record);
    let changed = this.tvSpot(place, state, state.main, shown(main), input, active);
    changed = this.tvSpot(place, state, state.flow, shown(flow), input, active) || changed;
    if (place === input.zone) {
      const reading = state.main.slots.find((slot) => slot.root.visible && slot.record?.id === state.main.swap.current);
      if (reading) this.focused = reading;
    }
    return changed;
  }
  /**
   * TV page: a place shows its bubbles only while the camera is there or flying between it and
   * the next place, so every view reads one place's recognitions and no far bubble clutters it
   * (textures and all are released elsewhere). A place fades in and out over about a second.
   */
  private tvLastTime = 0;
  private tvStarted = false;
  private tvPlaceShown(place: ZoneId, state: TvPlace, input: Input) {
    const shown = place === input.zone || place === input.destination;
    const dt = Math.max(0, Math.min(0.25, input.time - this.tvLastTime));
    // The first frame opens on the place as it is; after that a place fades in and out.
    state.presence = input.still || !this.tvStarted ? (shown ? 1 : 0)
      : state.presence + ((shown ? 1 : 0) - state.presence) * (1 - Math.exp(-dt / 0.35));
    return shown || state.presence > 0.01;
  }
  private hideTv(slot: Slot) {
    if (slot.record) this.clear(slot);
    slot.root.visible = slot.face.visible = false;
    slot.tv?.decor && (slot.tv.decor.visible = false);
  }
  private readonly tvPose: TvFlowPose = { u: 0, scale: 1, opacity: 1 };
  private readonly tvPlainFrame: StudyPearlFrame = { sparkles: false, portrait: false, orbitScale: TV_MEDALLION_SCALE, lanes: false, shield: false };
  private readonly tvLeavePose: TvFlowPose = { u: 0, scale: 1, opacity: 1 };
  /**
   * TV page: one spot. The slot already showing the wanted recognition keeps it; the other
   * takes the one leaving. A far place, or a still view, swaps with no journey.
   */
  private tvSpot(place: ZoneId, state: TvPlace, spot: TvSpot, record: Recognition | undefined, input: Input, active: boolean) {
    const { time } = input;
    const swap = spot.swap;
    // A recognition that left the snapshot goes at once; it never floats away with its words.
    if (swap.previous !== undefined && !this.records.has(swap.previous)) swap.drop(swap.previous);
    if (swap.current !== undefined && !this.records.has(swap.current)) swap.vanish();
    // Still or reduced motion ends a journey where it was going; an owner's pause only holds it.
    if (input.still && !input.paused) swap.settleNow();
    // A new recognition waits for the journey under way to finish, so no bubble ever jumps.
    if (!swap.busy(time) || input.still || !active) swap.want(record?.id, time, input.still || !active, spot === state.flow);
    swap.settle(time);
    const [a, b] = spot.slots;
    const holds = (slot: Slot, id?: string) => id !== undefined && slot.record?.id === id;
    const current = holds(a, swap.current) ? a : holds(b, swap.current) ? b : holds(a, swap.previous) ? b : a;
    const leaving = current === a ? b : a;
    if (!active) {
      this.hideTv(current);
      this.hideTv(leaving);
      return false;
    }
    const role = current.tv!.role;
    const bob = role === "flow" ? tvRestBob(time, state.seed) : 0;
    let changed = false;
    // The arriving (or resting) bubble.
    const arriving = swap.current === undefined ? null
      : swap.at === -Infinity ? this.restPose()
      : tvArriving(time - swap.at, this.tvPose);
    const next = swap.current === undefined ? undefined : this.records.get(swap.current);
    if (!next || !arriving) {
      // Nothing to show yet, or not yet budded: its face is painted ahead, out of sight.
      this.assign(current, next, time);
      if (current.record) changed = this.paint(current, 0, input.minimum) || changed;
      current.root.visible = current.face.visible = false;
      if (current.tv) current.tv.decor.visible = false;
    } else {
      spot.rise.at(arriving.u, current.root.position);
      // The breath of a resting bubble comes in as it arrives, so it never steps when it settles.
      changed = this.showTvSlot(current, next, input, arriving, bob * T.MathUtils.smoothstep(arriving.u, 0, 1), place, state.presence, swap.at, false) || changed;
    }
    // The leaving one.
    const gone = swap.previous === undefined ? null : tvLeaving(time - swap.at, this.tvLeavePose);
    const old = swap.previous === undefined ? undefined : this.records.get(swap.previous);
    if (!old || !gone) this.hideTv(leaving);
    else {
      spot.leave.at(gone.u, leaving.root.position);
      changed = this.showTvSlot(leaving, old, input, gone, bob * (1 - gone.u), place, state.presence, swap.at, true) || changed;
    }
    return changed;
  }
  private restPose() {
    const pose = this.tvPose;
    pose.u = 1; pose.scale = 1; pose.opacity = 1;
    return pose;
  }
  /** TV page: assign, paint, size, fade and decorate one bubble at the place its flow puts it (already set). */
  private showTvSlot(slot: Slot, record: Recognition, input: Input, pose: TvFlowPose, bob: number, place: ZoneId, presence: number, swapAt: number, leaving: boolean) {
    const tv = slot.tv!;
    this.assign(slot, record, input.time);
    if (!slot.record) { this.hideTv(slot); return false; }
    const changed = this.paint(slot, 0, input.minimum);
    slot.root.position.y += bob;
    const full = tv.role === "main" ? TV_MAIN_RADIUS : tvFlowRadius(place, tv.diameter);
    slot.radius = full * pose.scale;
    slot.root.scale.setScalar(Math.max(0.01, slot.radius));
    slot.root.quaternion.copy(input.camera.quaternion);
    slot.root.visible = slot.face.visible = true;
    const opacity = pose.opacity * presence;
    slot.face.material.opacity = opacity;
    slot.face.material.color.set("#ffffff");
    this.effects(slot, input.time, input.sparkles, input.trails);
    tv.decor.visible = true;
    tv.decor.update(input.time, opacity);
    // Only a bubble at rest at the place the camera is parked at guards the protect mask: one
    // behind scenery during a flight would cut its disc out of the glow on what stands in front.
    tv.decor.guard(place === input.zone && place === input.destination && pose.u >= 1 && !leaving);
    this.tvDiscList.push(slot);
    // A leaving bubble keeps its words where they were as it floats away.
    if (leaving) { this.tvSkin(slot, input, place, false, 0); return changed; }
    // Words scroll only while the camera reads this place: the main one from the glide in to the
    // pull back, the flowing one once it has come to rest, each ending 2 s before the pull back.
    const here = place === input.zone && pose.u >= 1 && tv.decor.scrollable;
    const held = here ? this.tvHoldRecord(place, input) : undefined;
    const hold = held && input.hold ? input.hold(held.message, input.minimum) : 20;
    if (tv.role === "main") {
      const lead = TV_FOCUS_DELAY + TV_FOCUS_IN;
      tv.decor.scroll(here && slot.record.id === input.selectedId ? tvScrollFraction(input.readingAge - lead, hold - lead - TV_FOCUS_OUT) : 0);
    } else {
      // From the moment it came to rest (or the visit's start, when it was already resting) to
      // the River's next turn or the camera's pull back, whichever comes first.
      const rested = swapAt === -Infinity ? Math.max(TV_FLOW_SETTLED, TV_FOCUS_DELAY + TV_FOCUS_IN) : input.readingAge - (input.time - swapAt) + TV_FLOW_SETTLED;
      const stream = TV_PLACES[place].stream;
      const next = stream ? (Math.floor(Math.max(0, rested - TV_FLOW_SETTLED) / stream.every) + 1) * stream.every : Infinity;
      const until = Math.min(hold - TV_FOCUS_OUT, next + TV_FLOW_SETTLED <= hold - TV_FOCUS_OUT ? next : Infinity);
      tv.decor.scroll(here ? tvScrollFraction(input.readingAge - rested, until - rested) : 0);
    }
    this.tvSkin(slot, input, place, pose.u >= 1, opacity);
    return changed;
  }
  /**
   * The main bubble's glass skin shows only while it rests whole (its shell and gold ring do not
   * fade), and the one being read wears its expression medallions, set close round its rim so they
   * never reach the flowing bubble beside it (`TV_MEDALLION_SCALE`).
   */
  private tvSkin(slot: Slot, input: Input, place: ZoneId, resting: boolean, opacity: number) {
    if (!slot.study || !slot.record) return;
    const whole = resting && opacity >= 0.99;
    slot.study.visible = whole;
    if (!whole) return;
    const detailed = slot.tv?.role === "main" && place === input.zone && slot.record.id === input.selectedId;
    const frame = detailed ? this.frameFor(slot, input.camera, input.sparkles) : this.tvPlainFrame;
    // The study's orbit lanes would cross the whole view at this size; the decor's gold ring stands in.
    frame.lanes = false;
    frame.orbitScale = TV_MEDALLION_SCALE;
    slot.study.update(input.time, slot.record.expressionIds, detailed, frame);
  }
  /**
   * TV page: every TV bubble on show this frame, published on the scene for the neighbors'
   * speech cards, which step aside rather than cover one (`kit-neighbors.ts`).
   */
  private readonly tvDiscList: Slot[] = [];
  private readonly tvDiscs: Array<{ position: number[]; radius: number }> = [];
  private publishTvDiscs() {
    if (!this.tvPage) return;
    while (this.tvDiscs.length < this.tvDiscList.length) this.tvDiscs.push({ position: [0, 0, 0], radius: 0 });
    this.tvDiscs.length = this.tvDiscList.length;
    this.tvDiscList.forEach((slot, i) => {
      slot.root.position.toArray(this.tvDiscs[i].position);
      this.tvDiscs[i].radius = slot.radius * 1.17;
    });
    this.hostScene.userData.tvDiscs = this.tvDiscs;
  }
  /** The record the camera holds on at a place: its main bubble's. */
  private tvHoldRecord(place: ZoneId, input: Input) {
    const id = this.tvPlaces.get(place)?.main.swap.current ?? input.selectedId;
    return id ? this.records.get(id) : undefined;
  }
  update(input: Input) {
    const {
      time,
      camera,
      zone,
      selectedId,
      readingAge,
      arrival,
      minimum,
      still,
    } = input;
    let changed = false;
    this.focused = undefined;
    this.arrivalInWorld = false;
    const publishedHush = this.hostScene.userData.studyHush;
    this.hush =
      this.designStudy && typeof publishedHush === "number"
        ? Math.max(0, Math.min(1, publishedHush))
        : 0;
    const entranceActive =
      arrival.phase !== "idle" && arrival.phase !== "return";
    const records = [...this.records.values()].filter(
      (record) => !entranceActive || record.id !== arrival.id,
    );
    this.tvDiscList.length = 0;
    for (const [place, state] of this.tvPlaces) changed = this.updateTvPlace(place, state, input, entranceActive, arrival.id) || changed;
    this.tvLastTime = time;
    this.tvStarted = this.tvPlaces.size > 0;
    this.publishTvDiscs();
    const plans = RECOGNITION_ZONES.filter((place) => !this.tvPlaces.has(place)).map((place) => {
      let pool = records;
      if (place === "featured") {
        const featured = records.filter((r) => r.featured);
        if (featured.length) pool = featured;
      }
      if (place === "orbit")
        pool = records.filter((r) =>
          r.expressionIds.includes(input.expressionId),
        );
      const slots = this.slots.filter((slot) => slot.zone === place);
      const selected =
        place === zone
          ? pool.find((record) => record.id === selectedId)
          : undefined;
      const main =
        selected ??
        pool.find((record) => record.id === slots[0].record?.id) ??
        pool[RECOGNITION_ZONES.indexOf(place) % Math.max(1, pool.length)];
      const current = [slots[1]?.record?.id, slots[2]?.record?.id] as const;
      return { place, pool, main, slots, current };
    });
    // The design study keeps the same words from standing twice in one view (visual review).
    const residents = this.designStudy ? studyResidents(plans) : undefined;
    for (const { place, pool, main, slots } of plans) {
      const remaining = pool.filter((record) => record.id !== main?.id);
      for (const slot of slots) {
        const record =
          slot.index === 0
            ? main
            : residents
              ? residents.get(place)?.[slot.index - 1]
              : remaining[(slot.index - 1) % Math.max(1, remaining.length)];
        this.assign(slot, record, time);
        if (!slot.record) continue;
        const definition = ZONES.find((item) => item.id === place)!;
        const outward = new T.Vector3(
          definition.eye[0] - definition.target[0],
          0,
          definition.eye[2] - definition.target[2],
        ).normalize();
        const right = new T.Vector3(outward.z, 0, -outward.x);
        const mobile = camera.aspect < 1;
        const hero = this.designStudy ? studyHeroPlacement(place, mobile) : undefined;
        const side =
          slot.index === 0
            ? hero
              ? hero.side
              : mobile
                ? 0
                : place === "heart" || place === "peacemakers"
                  ? 7
                  : 3
            : slot.index === 1
              ? -10
              : 11;
        slot.root.position
          .fromArray(definition.target)
          .addScaledVector(outward, slot.index === 0 && hero ? hero.outward : [5, 1, -4][slot.index])
          .addScaledVector(right, side);
        slot.root.position.y += [3, 6, 9][slot.index];
        // Movement is shared by the circle, its text, its rim and its sparks.
        const phase = time * 0.24 + slot.index * 2.2;
        slot.root.position.addScaledVector(
          right,
          Math.sin(phase) * (slot.index ? 0.65 : 0.22),
        );
        slot.root.position.y +=
          Math.sin(phase * 0.8) * (slot.index ? 0.45 : 0.18);
        if ((place === "orbit" || place === "peacemakers") && slot.index) {
          slot.root.position.addScaledVector(
            outward,
            Math.sin(time * 0.14 + slot.index * 3) * 2.3,
          );
          slot.root.position.addScaledVector(
            right,
            Math.cos(time * 0.14 + slot.index * 3) * 1.5,
          );
        }
        if (place === "live-feed")
          slot.root.position.addScaledVector(
            right,
            Math.sin(time * 0.1 + slot.index) * 1.5,
          );
        slot.radius =
          [4.4, 3, 2.8][slot.index] * (mobile && slot.index === 0 ? 1.06 : 1);
        if (this.designStudy && slot.index > 0) slot.radius *= .64;
        if (this.designStudy && slot.index === 0) {
          // Keep the exterior symbol orbit above the terrace, with depth testing intact.
          slot.root.position.y = Math.max(
            slot.root.position.y,
            definition.center[1] + .9 + slot.radius * 1.46,
          );
        }
        const grow =
          still || slot.index === 0
            ? 1
            : T.MathUtils.smoothstep(
                time - slot.born - slot.index * 0.35,
                0,
                1.8,
              );
        slot.root.scale.setScalar(slot.radius * Math.max(0.01, grow));
        slot.root.quaternion.copy(camera.quaternion);
        slot.root.visible = slot.face.visible = true;
        const active =
          place === zone && slot.index === 0 && record?.id === selectedId;
        changed =
          this.paint(
            slot,
            active
              ? readingAge
              : time % readingSeconds(slot.record.message, minimum),
            minimum,
          ) || changed;
        this.effects(slot, time, input.sparkles, input.trails);
        this.recede(slot);
        // While an entrance is running the arrival pearl is the only detailed one.
        const detailed =
          place === zone && slot.index === 0 && !entranceActive;
        slot.study?.update(
          time,
          slot.record.expressionIds,
          detailed,
          detailed ? this.frameFor(slot, camera, input.sparkles) : this.plainFrame,
        );
        if (place === zone && slot.index === 0) this.focused = slot;
      }
    }
    const arrivalSlot = this.slots[this.slots.length - 1];
    const arriving = ["reveal", "reading", "settle"].includes(arrival.phase);
    this.assign(
      arrivalSlot,
      arriving && arrival.id ? this.records.get(arrival.id) : undefined,
      time,
    );
    if (arrivalSlot.record) {
      const reveal = arrival.phase === "reveal" ? arrival.progress : 1;
      const settle = arrival.phase === "settle" ? arrival.progress : 0;
      // The bubble emerges out of the portal, in front of its arches and light rays.
      // This remains a fixed world path, independent of the camera position.
      const emergence = reveal * (1 - settle);
      arrivalSlot.root.position.set(
        4.138 * emergence + 26 * settle,
        7 + reveal * 5 - settle * 7,
        10 + 9.104 * emergence + settle * 6,
      );
      // The TV page reads the arriving bubble at the main bubble's size (step 4).
      arrivalSlot.radius =
        (this.tvPage ? 7.3 - settle * 3.6 : 5.4 - settle * 2.7) *
        Math.max(0.08, T.MathUtils.smoothstep(reveal, 0, 1));
      arrivalSlot.root.scale.setScalar(arrivalSlot.radius);
      arrivalSlot.root.quaternion.copy(camera.quaternion);
      arrivalSlot.root.visible = arrivalSlot.face.visible = true;
      const age =
        arrival.phase === "reading"
          ? arrival.age
          : arrival.phase === "settle"
            ? readingSeconds(arrivalSlot.record.message, minimum) - 0.001
            : 0;
      changed = this.paint(arrivalSlot, age, minimum) || changed;
      if (arrivalSlot.tv) {
        arrivalSlot.tv.decor.visible = true;
        arrivalSlot.tv.decor.update(time);
        // The arriving bubble always reads by the TV rule, wherever the tour happens to be.
        arrivalSlot.tv.decor.scroll(arrival.phase === "reading" && arrivalSlot.tv.decor.scrollable
          ? tvScrollFraction(arrival.age, worldHoldSeconds(arrivalSlot.record.message))
          : arrival.phase === "settle" ? 1 : 0);
      }
      this.effects(arrivalSlot, time, input.sparkles, input.trails);
      this.recede(arrivalSlot);
      // While its words are readable, the arriving pearl's setting and symbols join the
      // protect mask, so the bloom and the light column never wash over them.
      const arrivalFrame = this.frameFor(arrivalSlot, camera, input.sparkles,
        arrival.phase === "reading" || arrival.phase === "settle");
      if (arrivalSlot.tv) arrivalFrame.lanes = false;
      arrivalSlot.study?.update(time, arrivalSlot.record.expressionIds, true, arrivalFrame);
      this.focused = arrivalSlot;
      this.arrivalInWorld = true;
    }
    if (this.focused)
      this.projection.copy(this.focused.root.position).project(camera);
    this.waterHalo?.update(
      this.focused?.root.visible ? this.focused.root.position : undefined,
      camera,
      time,
    );
    return changed;
  }
  /**
   * The hero pearl reads at full strength. Residents step back into the scenery,
   * paler and a little warmer, so one message at a time carries the eye.
   * Slots are reused, so the hero values are restored every frame.
   *
   * Section 8 rides the entrance hush through this same channel: while an arrival approaches,
   * the residents fade a little further back, and they fill in again over the first seconds
   * of reading. At hush 0, which is every parked and every still frame, this is unchanged.
   */
  private recede(slot: Slot) {
    if (!this.designStudy) return;
    const material = slot.face.material;
    if (slot.index > 0) {
      // Nearly opaque: residents can overlap, and text showing through text reads as a defect.
      material.opacity = 0.9 - 0.12 * this.hush;
      material.color.set("#f3e6ea");
    } else {
      material.opacity = 1;
      material.color.set("#ffffff");
    }
  }
  /**
   * How much room this pearl and its symbol ring have on screen right now.
   * `reach` is the orbit radius plus a symbol radius, in world units.
   */
  private frameFor(
    slot: Slot,
    camera: T.PerspectiveCamera,
    sparkles: boolean,
    shield = false,
  ): StudyPearlFrame {
    const reach = slot.radius * (1.36 + 0.21);
    const distance = camera.position.distanceTo(slot.root.position);
    const ndcY =
      reach /
      Math.max(0.001, distance * Math.tan((camera.fov * Math.PI) / 360));
    const ndcX = ndcY / camera.aspect;
    const p = this.frameScratch.copy(slot.root.position).project(camera);
    const overflow = Math.max(
      0,
      Math.abs(p.x) + ndcX - 0.96,
      Math.abs(p.y) + ndcY - 0.92,
    );
    const frame = this.detailedFrame;
    frame.sparkles = sparkles;
    frame.portrait = camera.aspect < 1;
    frame.orbitScale = T.MathUtils.clamp(1 - overflow * 1.6, 0.94, 1);
    // The Expression Cosmos draws its own orbits round the pearl, so the pearl's lanes stand
    // down there. Only the arriving pearl, while it is read, shields its setting from the glow.
    frame.lanes = slot.zone !== "orbit";
    frame.shield = shield;
    return frame;
  }
  private effects(
    slot: Slot,
    time: number,
    sparkles: boolean,
    trails: boolean,
  ) {
    slot.lights.visible = sparkles || trails;
    slot.ring.visible = !this.designStudy;
    if (this.designStudy) slot.lights.visible = false;
    for (let i = 0; i < 10; i++) {
      const angle = time * 0.17 + (i * Math.PI * 2) / 10;
      this.dummy.position.set(
        Math.cos(angle) * 1.07,
        Math.sin(angle) * 1.07,
        0.03,
      );
      if (trails && i > 6) this.dummy.position.y -= (i - 6) * 0.12;
      this.dummy.scale.setScalar(
        sparkles ? 0.65 + Math.sin(time * 1.8 + i) * 0.3 : 0.55,
      );
      this.dummy.updateMatrix();
      slot.lights.setMatrixAt(i, this.dummy.matrix);
    }
    slot.lights.instanceMatrix.needsUpdate = true;
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
