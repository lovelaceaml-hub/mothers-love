import type { Recognition } from "@/lib/contracts";
import { readingSeconds } from "./world-feed";

/** How long a message is held, in seconds, given the owner's minimum. */
export type HoldSeconds = (message: string, minimum: number) => number;

export class RecognitionDirector {
  /** The TV page passes its own hold rule; every other page keeps `readingSeconds`. */
  constructor(private readonly holdFor: HoldSeconds = readingSeconds) {}
  id: string | null = null;
  age = 0;
  private shown = new Map<string, number>();
  private order = 0;
  private readingFingerprint: string | null = null;
  update(
    delta: number,
    records: readonly Recognition[],
    minimum: number,
    hold: boolean,
    visible = true,
    eligible: readonly Recognition[] = records,
  ) {
    const eligibleIds = new Set(eligible.map((record) => record.id));
    for (const id of this.shown.keys())
      if (!eligibleIds.has(id)) this.shown.delete(id);
    if (this.id && !eligibleIds.has(this.id)) {
      this.id = null;
      this.age = 0;
      this.readingFingerprint = null;
    }
    if (!visible) return;
    if (!records.length) {
      this.id = null;
      this.age = 0;
      this.readingFingerprint = null;
      return;
    }
    const current = records.find((record) => record.id === this.id);
    if (!current) {
      this.next(records);
      return;
    }
    const fingerprint = JSON.stringify([
      current.id,
      current.recipient,
      current.message,
      current.expressionIds,
      minimum,
    ]);
    if (
      this.readingFingerprint !== null &&
      this.readingFingerprint !== fingerprint
    )
      this.age = 0;
    this.readingFingerprint = fingerprint;
    if (!hold) this.age += delta;
    if (!hold && this.age >= this.holdFor(current.message, minimum))
      this.next(records);
  }
  noteCompletedArrival(id: string, records: readonly Recognition[]) {
    if (records.some((record) => record.id === id))
      this.shown.set(id, ++this.order);
  }
  finishReading() {
    this.id = null;
    this.age = 0;
    this.readingFingerprint = null;
  }
  select(id: string, records: readonly Recognition[]) {
    if (records.some((record) => record.id === id)) {
      this.id = id;
      this.age = 0;
      this.readingFingerprint = null;
      this.shown.set(id, ++this.order);
    }
  }
  next(records: readonly Recognition[]) {
    if (!records.length) {
      this.id = null;
      return;
    }
    const sorted = [...records].sort(
      (a, b) => (this.shown.get(a.id) ?? -1) - (this.shown.get(b.id) ?? -1),
    );
    this.select(sorted[0].id, records);
  }
  step(records: readonly Recognition[], direction: number) {
    if (!records.length) return;
    const index = records.findIndex((record) => record.id === this.id);
    this.select(
      records[(index + direction + records.length) % records.length].id,
      records,
    );
  }
  remaining(records: readonly Recognition[], minimum: number) {
    const current = records.find((record) => record.id === this.id);
    return current
      ? Math.max(0, this.holdFor(current.message, minimum) - this.age)
      : 0;
  }
}
