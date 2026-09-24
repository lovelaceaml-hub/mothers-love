/** Building, assigning and painting the world bubbles' slots. WorldRecognitionBubbles calls these with itself as `this`. */
import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import { messagePages, readingSeconds } from "./reading";
import { StudyPearlSkin, paintStudyPearl } from "./art/pearl-skin";
import { studyCanvasSize, type StudyTier } from "./art/study-budget";
import { WORLD_EXPRESSIONS } from "./world-data";
import { sampleHeartCount } from "./art/tv-page";
import { TV_BIG, canvasMeasure, paintTvBigFace, tvFitFlowDiameter, tvFlowStyle } from "./art/tv-bubbles";
import { TV_FLOW_MIN_DIAMETER, TV_READ } from "./art/tv-places";
import { wrapBubbleText, type Slot } from "./world-bubble-layout";
import type { WorldRecognitionBubbles } from "./world-recognitions";

export function createBubbleSlot(this: WorldRecognitionBubbles, zone: Slot["zone"], index: number, skin = true): Slot {
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
  // On the TV page its halo fades out before the plane's edge (`PEARL_HALO_TV_FADE`).
  const study = this.studyAssets && skin
    ? new StudyPearlSkin(root, this.studyAssets, this.slots.length, () => this.hostScene.userData.studyKit, { tv: this.tvPage })
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

export function assignBubbleSlots(this: WorldRecognitionBubbles, slot: Slot, record: Recognition | undefined, time: number) {
  if (!this.designStudy && slot.record?.id === record?.id) return;
  const publishedTier = this.hostScene.userData.studyTier;
  const tier: StudyTier = publishedTier === "auto" || publishedTier === "low"
    ? publishedTier
    : "high";
  // On the TV page a main bubble is 650 px across and a flowing one at most 380 (`TV_READ`),
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

export function paintBubble(this: WorldRecognitionBubbles, slot: Slot, age: number, minimum: number) {
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
export function paintTvBubble(this: WorldRecognitionBubbles, slot: Slot, record: Recognition) {
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
