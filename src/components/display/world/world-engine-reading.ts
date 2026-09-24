/** The engine's feed and reading: taking a new feed, the reading pool and hold, and selecting a recognition or an expression. WorldEngine calls these with itself as `this`. */
import type { WorldFeed } from "./world-feed";
import { TV_BUBBLE_PLACES, heldBig, planWorldBubbles } from "./art/tv-page";
import { TOUR_ORDER, ZONES, type ZoneId } from "./world-data";
import type { WorldEngine } from "./world-engine";

export function setEngineFeed(this: WorldEngine, feed: WorldFeed) {
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
  // Study only: the public aggregate insights (counts, never a name or a message) for the
  // kit's data driven dressing, cleared with every unsafe state exactly as the records are.
  if (this.study)
    this.world.scene.userData.studyInsights = safe
      ? (feed.snapshot?.insights ?? null)
      : null;
  this.bubbles.setRecords(safe ? feed.records : [], feed.phase === "sample");
  if (this.tv) this.tvPlan = planWorldBubbles(safe ? feed.records : []);
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
    this.pacer.clear();
    if (!safe) this.tvFresh = [];
  } else if (this.tv) {
    // New arrivals join the ticker at once; their lotus waits for the pacer.
    this.pacer.prune(new Set(feed.records.map((record) => record.id)));
    this.pacer.offer(feed.arrivals);
    this.noteFresh(feed.arrivals);
    const ids = new Set(feed.records.map((record) => record.id));
    this.tvFresh = this.tvFresh.filter((item) => ids.has(item.id));
  } else this.arrivals.enqueue(feed.arrivals);
  this.recognitions.update(
    0,
    this.readingPool(),
    settings?.readingSeconds ?? 24,
    true,
    this.readingZones.includes(this.director.zone) &&
      !this.director.traveling &&
      this.arrivalState.phase === "idle",
    feed.records,
  );
  this.dirty = true;
  this.report();
}

export function engineReadingComplete(this: WorldEngine, delta: number, minimum: number) {
  if (
    !this.readingZones.includes(this.director.zone) ||
    this.director.traveling
  )
    return true;
  const current = this.readingPool().find(
    (record) => record.id === this.recognitions.id,
  );
  return (
    !current ||
    this.recognitions.age + delta >= this.holdFor(current.message, minimum)
  );
}

export function engineReadingPool(this: WorldEngine, includeHeld = true) {
  const held = this.feed.records.find(
    (record) => record.id === this.recognitions.id,
  );
  if (includeHeld && this.readingHeld && held) return [held];
  const zone = this.director.zone;
  // TV page: each visit holds on the place's main bubble for this loop (step 5). It is picked
  // once, as the visit begins, and kept to the visit's end while it stays in the snapshot; it
  // is picked again only at a new place or visit, or once it has left the snapshot.
  if (this.tv && this.tvPlan && TV_BUBBLE_PLACES.includes(zone)) {
    const visit = this.tvVisits.get(zone) ?? 0;
    const kept = zone === this.tvPickedZone && visit === this.tvPickedVisit ? this.feedRecord(this.tvPickedId) : undefined;
    const record = kept ?? heldBig(this.tvPlan, zone, visit);
    this.tvPickedZone = zone;
    this.tvPickedVisit = visit;
    this.tvPickedId = record?.id;
    this.tvPool.length = 0;
    if (record) this.tvPool.push(record);
    return this.tvPool;
  }
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

/**
 * TV page: the snapshot's own copy of the record with this id (a new snapshot brings new
 * objects), or undefined once it has left. A plain loop, so the per frame pool allocates nothing.
 */
export function engineFeedRecord(this: WorldEngine, id: string | undefined) {
  if (id === undefined) return undefined;
  const records = this.feed.records;
  for (let i = 0; i < records.length; i++) if (records[i].id === id) return records[i];
  return undefined;
}

export function setEngineExpression(this: WorldEngine, id: number) {
  this.expressionId = id;
  if (this.study) {
    this.world.scene.userData.studyExpression = id;
    // A kit piece may follow the selected expression, so a paused world redraws once.
    if (this.kit) this.dirty = true;
  }
  this.recognitions.update(
    0,
    this.readingPool(),
    24,
    true,
    this.readingZones.includes(this.director.zone),
    this.feed.records,
  );
  this.report();
}

export function selectEngineRecognition(this: WorldEngine, id: string) {
  const enabled = new Set(
    this.feed.snapshot?.presentation.playlist
      .filter((item) => item.enabled)
      .map((item) => item.id),
  );
  const destination = ZONES.find(
    (zone) =>
      this.readingZones.includes(zone.id) &&
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
