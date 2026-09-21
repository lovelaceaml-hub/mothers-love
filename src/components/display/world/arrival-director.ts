import { readingSeconds } from "./world-feed";
import type { Recognition } from "@/lib/contracts";
export type ArrivalPhase =
  | "idle"
  | "approach"
  | "reveal"
  | "reading"
  | "settle"
  | "return";
export type ArrivalState = {
  phase: ArrivalPhase;
  id: string | null;
  age: number;
  progress: number;
  waveIndex: number;
  waveSize: number;
};
export class ArrivalDirector {
  private queue: string[] = [];
  private wave: string[] = [];
  private index = 0;
  private phase: ArrivalPhase = "idle";
  private age = 0;
  private duration = 0;
  private readingFingerprint: string | null = null;
  enqueue(ids: readonly string[]) {
    this.queue = [
      ...new Set([
        ...this.queue,
        ...ids.filter((id) => !this.wave.includes(id)),
      ]),
    ].slice(0, 100);
  }
  cancel() {
    this.queue = [];
    this.wave = [];
    this.index = 0;
    this.phase = "idle";
    this.age = 0;
    this.readingFingerprint = null;
  }
  reduceMotion(records: readonly Recognition[], minimumReading: number) {
    if (this.phase === "approach" || this.phase === "reveal") {
      const current = records.find(
        (record) => record.id === this.wave[this.index],
      );
      if (current)
        this.begin("reading", readingSeconds(current.message, minimumReading));
      else {
        this.preserveRemaining(records);
        this.begin("return", 0.1);
      }
    } else if (this.phase === "settle" || this.phase === "return") {
      this.duration = this.age + 0.1;
    }
  }
  state(): ArrivalState {
    return {
      phase: this.phase,
      id: this.wave[this.index] ?? null,
      age: this.age,
      progress: this.duration ? Math.min(1, this.age / this.duration) : 0,
      waveIndex: Math.min(this.index + 1, this.wave.length),
      waveSize: this.wave.length,
    };
  }
  update(
    delta: number,
    records: readonly Recognition[],
    enabled: boolean,
    minimumReading: number,
    reduced: boolean,
    canStart = true,
  ): ArrivalState {
    const available = new Map(records.map((record) => [record.id, record]));
    this.queue = this.queue.filter((id) => available.has(id));
    this.wave = [
      ...this.wave.slice(0, this.index + 1),
      ...this.wave.slice(this.index + 1).filter((id) => available.has(id)),
    ];
    if (!enabled) {
      this.cancel();
      return this.state();
    }
    if (
      this.phase !== "idle" &&
      this.phase !== "return" &&
      !available.has(this.wave[this.index])
    ) {
      this.preserveRemaining(records);
      this.begin("return", reduced ? 0.1 : 6);
    }
    this.refreshReading(available.get(this.wave[this.index]), minimumReading);
    if (this.phase === "idle" && this.queue.length && canStart && delta > 0) {
      this.wave = this.queue.splice(0, 5);
      this.index = 0;
      this.begin(
        reduced ? "reading" : "approach",
        reduced
          ? readingSeconds(available.get(this.wave[0])!.message, minimumReading)
          : 5,
      );
    } else if (this.phase !== "idle") {
      this.age += Math.max(0, delta);
      if (this.age >= this.duration) {
        if (this.phase === "approach") this.begin("reveal", 5);
        else if (this.phase === "reveal")
          this.begin(
            "reading",
            readingSeconds(
              available.get(this.wave[this.index])?.message ?? "",
              minimumReading,
            ),
          );
        else if (this.phase === "reading")
          this.begin("settle", reduced ? 0.1 : 4);
        else if (this.phase === "settle") {
          do {
            this.index++;
          } while (
            this.index < this.wave.length &&
            !available.has(this.wave[this.index])
          );
          if (this.index < this.wave.length)
            this.begin(
              reduced ? "reading" : "reveal",
              reduced
                ? readingSeconds(
                    available.get(this.wave[this.index])!.message,
                    minimumReading,
                  )
                : 5,
            );
          else this.begin("return", reduced ? 0.1 : 6);
        } else if (this.phase === "return") {
          this.wave = [];
          this.phase = "idle";
          this.age = 0;
        }
      }
    }
    this.refreshReading(available.get(this.wave[this.index]), minimumReading);
    return this.state();
  }
  private refreshReading(record: Recognition | undefined, minimum: number) {
    if ((this.phase !== "reading" && this.phase !== "settle") || !record)
      return;
    const fingerprint = JSON.stringify([
      record.recipient,
      record.message,
      record.expressionIds,
      minimum,
    ]);
    const changed =
      this.readingFingerprint !== null &&
      this.readingFingerprint !== fingerprint;
    if (changed) {
      this.phase = "reading";
      this.age = 0;
    }
    this.readingFingerprint = fingerprint;
    if (this.phase === "reading")
      this.duration = readingSeconds(record.message, minimum);
  }
  private preserveRemaining(records: readonly Recognition[]) {
    const eligible = new Set(records.map((record) => record.id));
    const remaining = this.wave
      .slice(this.index + 1)
      .filter((id) => eligible.has(id));
    this.queue = [...new Set([...remaining, ...this.queue])].slice(0, 100);
    this.wave = [];
    this.index = 0;
  }
  private begin(phase: ArrivalPhase, duration: number) {
    this.phase = phase;
    if (phase !== "settle") this.readingFingerprint = null;
    this.age = 0;
    this.duration = duration;
  }
}
