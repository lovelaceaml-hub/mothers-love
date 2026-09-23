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
import {
  RECOGNITION_ZONES,
  WORLD_EXPRESSIONS,
  ZONES,
  type ZoneId,
} from "./world-data";

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
};
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
  };
  // Reused every frame so the detailed slots never allocate.
  private readonly detailedFrame: StudyPearlFrame = {
    sparkles: false,
    portrait: false,
    orbitScale: 1,
  };

  /**
   * Study only: how far the world has stepped back for an entrance, 0 to 1, published on the
   * scene by the engine each frame. It is read once per update rather than per slot.
   */
  private hush = 0;

  constructor(private readonly hostScene: T.Scene) {
    const scene = hostScene;
    if (this.designStudy) this.studyAssets = new StudyPearlAssets(() => scene.userData.invalidate?.());
    if (this.designStudy) this.waterHalo = new StudyWaterHalo(scene);
    this.root.name = "Recognition bubbles in the world";
    scene.add(this.root);
    for (const zone of RECOGNITION_ZONES)
      for (let index = 0; index < 3; index++) this.create(zone, index);
    this.create("arrival", 0);
  }
  private create(zone: Slot["zone"], index: number) {
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
    const study = this.studyAssets
      ? new StudyPearlSkin(root, this.studyAssets, this.slots.length, () => this.hostScene.userData.studyKit)
      : undefined;
    root.visible = face.visible = false;
    this.root.add(root);
    this.slots.push({
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
    });
    this.hitTargets.push(face);
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
  }
  setRecords(records: readonly Recognition[]) {
    this.records = new Map(records.map((record) => [record.id, record]));
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
    if (slot.record?.id === record?.id) return;
    this.clear(slot);
    if (!record) return;
    slot.record = record;
    slot.fingerprint = this.fingerprint(record);
    slot.born = time;
    slot.face.userData.recognitionId = record.id;
    slot.canvas = document.createElement("canvas");
    slot.canvas.width = slot.canvas.height = isWorldDesignStudy() ? (slot.index === 0 ? 2048 : 1024) : (slot.index === 0 ? 1024 : 512);
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
    const pages = messagePages(record.message);
    const page = Math.min(
      pages.length - 1,
      Math.floor(
        Math.max(0, age) /
          (readingSeconds(record.message, minimum) / pages.length),
      ),
    );
    const key = `${page}:${minimum}`;
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
    for (const place of RECOGNITION_ZONES) {
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
      const remaining = pool.filter((record) => record.id !== main?.id);
      for (const slot of slots) {
        const record =
          slot.index === 0
            ? main
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
        const side =
          slot.index === 0
            ? mobile
              ? 0
              : place === "heart" || place === "peacemakers"
                ? 7
                : 3
            : slot.index === 1
              ? -10
              : 11;
        slot.root.position
          .fromArray(definition.target)
          .addScaledVector(outward, [5, 1, -4][slot.index])
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
      arrivalSlot.radius =
        (5.4 - settle * 2.7) *
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
      this.effects(arrivalSlot, time, input.sparkles, input.trails);
      this.recede(arrivalSlot);
      arrivalSlot.study?.update(
        time,
        arrivalSlot.record.expressionIds,
        true,
        this.frameFor(arrivalSlot, camera, input.sparkles),
      );
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
