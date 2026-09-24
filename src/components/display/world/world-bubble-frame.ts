/** The world bubbles' per frame update: framing, effects and receding. WorldRecognitionBubbles calls these with itself as `this`. */
import * as T from "three";
import { readingSeconds } from "./reading";
import type { StudyPearlFrame } from "./art/pearl-skin";
import { RECOGNITION_ZONES, ZONES } from "./world-data";
import { worldHoldSeconds } from "./art/tv-page";
import { tvScrollFraction } from "./art/tv-bubbles";
import { TV_MEDALLION_SCALE } from "./art/tv-places";
import { TV_ARRIVAL_RADIUS, tvArrivalExit } from "./art/tv-arrival";
import { studyHeroPlacement, studyResidents, type Input, type Slot } from "./world-bubble-layout";
import type { WorldRecognitionBubbles } from "./world-recognitions";

export function updateWorldBubbles(this: WorldRecognitionBubbles, input: Input) {
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
    // The TV page reads it at the main bubbles' size (step 4); once read, it floats up and
    // away, dwindling, rather than sliding into the Garden's scenery (`tv-arrival.ts`).
    let exit = 1;
    if (this.tvPage && settle > 0) exit = tvArrivalExit(settle, arrivalSlot.root.position);
    else arrivalSlot.root.position.set(
      4.138 * emergence + 26 * settle,
      7 + reveal * 5 - settle * 7,
      10 + 9.104 * emergence + settle * 6,
    );
    arrivalSlot.radius =
      (this.tvPage ? TV_ARRIVAL_RADIUS * exit : 5.4 - settle * 2.7) *
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
    // On the TV page its medallions ride close round its rim, as the main bubbles' do, so the
    // lowest never slips under the ticker.
    if (arrivalSlot.tv) { arrivalFrame.lanes = false; arrivalFrame.orbitScale = TV_MEDALLION_SCALE; }
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
export function recedeBubbles(this: WorldRecognitionBubbles, slot: Slot) {
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
export function bubbleFrameFor(this: WorldRecognitionBubbles, slot: Slot, camera: T.PerspectiveCamera, sparkles: boolean, shield = false): StudyPearlFrame {
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

export function bubbleEffects(this: WorldRecognitionBubbles, slot: Slot, time: number, sparkles: boolean, trails: boolean) {
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
