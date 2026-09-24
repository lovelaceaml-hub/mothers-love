/** The TV page's bubble places: spots, showing a slot, its skin and the discs the cards avoid. WorldRecognitionBubbles calls these with itself as `this`. */
import * as T from "three";
import type { Recognition } from "@/lib/contracts";
import type { ZoneId } from "./world-data";
import { heldBig } from "./art/tv-page";
import { tvScrollFraction } from "./art/tv-bubbles";
import {
  TV_FOCUS_DELAY, TV_FOCUS_IN, TV_FOCUS_OUT, TV_MAIN_RADIUS, TV_MEDALLION_SCALE, TV_PLACES,
  tvFlowRadius,
} from "./art/tv-places";
import {
  TV_FLOW_SETTLED, tvArriving, tvFlowRecord, tvLeaving, tvRestBob, type TvFlowPose,
} from "./art/tv-flow";
import type { Input, TvSpot, TvPlace, Slot } from "./world-bubble-layout";
import type { WorldRecognitionBubbles } from "./world-recognitions";

/**
 * TV page: one place's two bubbles. The main bubble shows the record being read (or the
 * plan's main record for this loop); the flowing one, the place's next small record at every
 * arrival. When either is to show another recognition, the old bubble floats away and a new
 * one rises from its lotus (`tv-flow.ts`).
 */
export function updateTvBubblePlace(this: WorldRecognitionBubbles, place: ZoneId, state: TvPlace, input: Input, entranceActive: boolean, arrivalId: string | null) {
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
 * TV page: one spot. The slot already showing the wanted recognition keeps it; the other
 * takes the one leaving. A far place, or a still view, swaps with no journey.
 */
export function tvBubbleSpot(this: WorldRecognitionBubbles, place: ZoneId, state: TvPlace, spot: TvSpot, record: Recognition | undefined, input: Input, active: boolean) {
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

/** TV page: assign, paint, size, fade and decorate one bubble at the place its flow puts it (already set). */
export function showTvBubbleSlot(this: WorldRecognitionBubbles, slot: Slot, record: Recognition, input: Input, pose: TvFlowPose, bob: number, place: ZoneId, presence: number, swapAt: number, leaving: boolean) {
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
export function tvBubbleSkin(this: WorldRecognitionBubbles, slot: Slot, input: Input, place: ZoneId, resting: boolean, opacity: number) {
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

export function publishTvBubbleDiscs(this: WorldRecognitionBubbles) {
  if (!this.tvPage) return;
  while (this.tvDiscs.length < this.tvDiscList.length) this.tvDiscs.push({ position: [0, 0, 0], radius: 0 });
  this.tvDiscs.length = this.tvDiscList.length;
  this.tvDiscList.forEach((slot, i) => {
    slot.root.position.toArray(this.tvDiscs[i].position);
    this.tvDiscs[i].radius = slot.radius * 1.17;
  });
  this.hostScene.userData.tvDiscs = this.tvDiscs;
}
