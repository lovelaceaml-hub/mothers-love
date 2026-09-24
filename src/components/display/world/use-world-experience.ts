import { useEffect, useId, useMemo, useRef, useState } from "react";
import { RECOGNITION_ZONES, ZONES, zoneIndex, type Quality, type ZoneId } from "./world-data";
import { useWorldFeed } from "./use-world-feed";
import type { WorldSource } from "./world-feed";
import type { WorldEngine, WorldStatus } from "./world-engine";
import { TV_TOUR_SPEED } from "./art/tv-page";
import { useDisplayChimes } from "../use-display-chimes";
import {
  isWorldDesignStudy, studyArrival, studyKit, studyReviewFeed, type StudyArrival,
} from "./art/design-mode";

const INITIAL: WorldStatus = {
  zone: "garden",
  destination: "garden",
  traveling: false,
  elapsed: 0,
  fps: 0,
  calls: 0,
  triangles: 0,
  textures: 0,
  geometries: 0,
  quality: "High",
  frames: 0,
  arrival: {
    phase: "idle",
    id: null,
    age: 0,
    progress: 0,
    waveIndex: 0,
    waveSize: 0,
  },
  recognitionId: null,
  readingRemaining: 0,
};

/** The world page's state: the engine and its status, the feed, the owner's settings, the panels, and every handler the page's controls call. */
export function useWorldExperience({
  initialSource, design, designReview, initialStudyArrival, tvPage,
}: { initialSource: WorldSource; design: boolean; designReview: boolean; initialStudyArrival?: string; tvPage: boolean }) {
  const [arrivalStudy, setArrivalStudy] = useState<StudyArrival>(studyArrival(initialStudyArrival));
  const launchedStudy = useRef(false);
  const neighborDescriptionId = useId();
  const recognitionDescriptionId = useId();
  const canvas = useRef<HTMLCanvasElement>(null),
    root = useRef<HTMLElement>(null),
    engine = useRef<WorldEngine | null>(null);
  const [status, setStatus] = useState(INITIAL),
    [ready, setReady] = useState(false),
    [fallback, setFallback] = useState(false),
    [retry, setRetry] = useState(0);
  const [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [still, setStill] = useState(false),
    [speed, setSpeed] = useState(tvPage ? TV_TOUR_SPEED : 1),
    // Every view starts on Automatic, so a TV browser that cannot keep up steps down (K5);
    // High and Low stay in Settings (Plan 28 Section 5).
    [quality, setQuality] = useState<Quality>("auto");
  const [source, setSource] = useState<WorldSource>(initialSource),
    [panel, setPanel] = useState<"settings" | "map" | "recognitions" | null>(
      null,
    ),
    [immersive, setImmersive] = useState(false),
    [fullscreenMessage, setFullscreenMessage] = useState("");
  const [expressionId, setExpressionId] = useState(1),
    [held, setHeld] = useState(false),
    [filter, setFilter] = useState(0),
    [selectedFallback, setSelectedFallback] = useState<string | null>(null);
  const rawFeed = useWorldFeed(source);
  // Sample content on the design review only; a live feed is never rewritten.
  const feed = useMemo(() => studyReviewFeed(rawFeed, designReview), [designReview, rawFeed]);
  const feedRef = useRef(feed);
  useEffect(() => {
    if (designReview && initialStudyArrival && ready && feed.phase === "sample" && !launchedStudy.current) {
      launchedStudy.current = true;
      engine.current?.previewStudyArrival(studyArrival(initialStudyArrival));
    }
  }, [designReview, initialStudyArrival, ready, feed.phase]);
  const settings = useRef({
    paused,
    reduced: reduced || still,
    speed,
    quality,
  });
  useEffect(() => {
    settings.current = { paused, reduced: reduced || still, speed, quality };
  }, [paused, reduced, still, speed, quality]);
  useEffect(() => {
    feedRef.current = feed;
    engine.current?.setFeed(feed);
  }, [feed]);
  useEffect(() => {
    let cancelled = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)"),
      motion = () => setReduced(media.matches);
    queueMicrotask(() => {
      if (!cancelled) setReduced(media.matches);
    });
    media.addEventListener("change", motion);
    async function start() {
      try {
        // The design study loads the 3D Studio kit alongside the engine, so its first frame
        // is already dressed. Every other page skips the loader chunk and every kit request.
        const [{ WorldEngine }, kit] = await Promise.all([
          import("./world-engine"),
          isWorldDesignStudy() && studyKit()
            ? import("./kit/kit-loader").then((module) => module.loadStudyKit())
            : Promise.resolve(undefined),
        ]);
        if (cancelled || !canvas.current) {
          kit?.dispose();
          return;
        }
        const instance = new WorldEngine(canvas.current, {
          kit,
          reducedMotion: media.matches || settings.current.reduced,
          onSelection: () => setHeld(true),
          onStatus: (next) => {
            if (!cancelled) setStatus(next);
          },
          onFailure: () => {
            if (!cancelled) {
              engine.current?.dispose();
              engine.current = null;
              setStatus((previous) => ({
                ...previous,
                traveling: false,
                arrival: INITIAL.arrival,
              }));
              setFallback(true);
              setReady(false);
            }
          },
        });
        engine.current = instance;
        instance.setFeed(feedRef.current);
        instance.setPaused(settings.current.paused);
        instance.setSpeed(settings.current.speed);
        instance.setQuality(settings.current.quality);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setFallback(true);
          setReady(false);
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      media.removeEventListener("change", motion);
      engine.current?.dispose();
      engine.current = null;
    };
  }, [retry]);
  useEffect(() => {
    engine.current?.setReducedMotion(reduced || still);
  }, [reduced, still]);
  useEffect(() => {
    engine.current?.holdReading(held || panel === "recognitions");
  }, [held, panel]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setImmersive(false);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  const safe =
    feed.phase === "sample" ||
    feed.phase === "live" ||
    feed.phase === "reconnecting";
  const ownerStill = feed.snapshot?.settings.motion === "still",
    ownerPaused = feed.snapshot?.settings.pauseRotation === true;
  const arrival = safe && !fallback ? status.arrival : INITIAL.arrival;
  const arriving = arrival.phase !== "idle";
  const zone =
    ZONES[
      zoneIndex(
        status.traveling && !arriving ? status.destination : status.zone,
      )
    ];
  const selected = feed.records.find(
    (record) =>
      record.id === (fallback ? selectedFallback : status.recognitionId),
  );
  const featured = feed.records.filter((record) => record.featured);
  const candidates =
    zone.id === "featured"
      ? featured.length
        ? featured
        : feed.records
      : zone.id === "orbit"
        ? feed.records.filter((record) =>
            record.expressionIds.includes(expressionId),
          )
        : feed.records;
  const record =
    held && selected
      ? selected
      : zone.id === "featured" || zone.id === "orbit"
        ? (candidates.find((item) => item.id === selected?.id) ?? candidates[0])
        : (selected ?? feed.records[0]);
  const arrivalRecord = feed.records.find((item) => item.id === arrival.id);
  const enabled = new Set(
    feed.snapshot?.presentation.playlist
      .filter((item) => item.enabled)
      .map((item) => item.id),
  );
  const availableZones = ZONES.filter(
    (item) => !feed.snapshot || enabled.has(item.scene),
  );
  const readingDestination = availableZones.find((zone) =>
    RECOGNITION_ZONES.includes(zone.id),
  );
  const visibleRecords = feed.records.filter(
    (item) => !filter || item.expressionIds.includes(filter),
  );
  function visit(id: ZoneId) {
    if (arriving) return;
    setHeld(false);
    engine.current?.holdReading(false);
    setPanel(null);
    if (fallback)
      setStatus((previous) => ({
        ...previous,
        zone: id,
        destination: id,
        traveling: false,
      }));
    else engine.current?.visit(id);
  }
  function select(id: string) {
    if (!readingDestination || arriving) return;
    if (fallback)
      setStatus((previous) => ({
        ...previous,
        zone: readingDestination.id,
        destination: readingDestination.id,
        traveling: false,
      }));
    setSelectedFallback(id);
    engine.current?.selectRecognition(id);
    setHeld(true);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else
        setFullscreenMessage(
          "Use your browser fullscreen option for a larger view.",
        );
    } catch {
      setFullscreenMessage(
        "Use your browser fullscreen option for a larger view.",
      );
    }
  }
  function closePanel() {
    setPanel(null);
  }
  const sourceLabel =
    feed.phase === "sample"
      ? "Sample world"
      : feed.phase === "live"
        ? "Live recognitions"
        : feed.phase === "reconnecting"
          ? "Reconnecting"
          : feed.phase === "connecting"
            ? "Connecting"
            : "Quiet world";
  // One cue text, shown floating for classic and cinematic and inside the study
  // panel for the design review, where a floating line would cover the pearl.
  const arrivalCue = `${source === "sample" ? "SAMPLE ENTRANCE" : "A NEW LIGHT IN OUR WORLD"}${
    arrival.waveSize > 1 ? ` · ${arrival.waveIndex} of ${arrival.waveSize}` : ""
  }`;
  // TV page (step 7): the TV View's chimes, import only. Browsers need one gesture first.
  // One hook per kind, since each remembers only its own last key: the weekly goal chimes once,
  // however many arrivals chime around it.
  const goal = feed.snapshot?.insights.goal;
  const sound = tvPage && safe ? feed.snapshot?.settings.sound : undefined;
  const arrivalChime = useDisplayChimes(
    sound,
    arrival.phase === "approach" && arrival.id ? { key: `arrival:${arrival.id}`, kind: "arrival" } : null,
  );
  const goalChime = useDisplayChimes(
    sound,
    goal?.achieved ? { key: `goal:${goal.weekStart}`, kind: "milestone" } : null,
  );
  const enableArrival = arrivalChime.enable, enableGoal = goalChime.enable;
  const freshKey = (status.tvArrivals ?? []).join(",");
  const fresh = useMemo(() => (freshKey ? freshKey.split(",") : []), [freshKey]);
  useEffect(() => {
    if (!tvPage) return;
    const once = () => { enableArrival(); enableGoal(); };
    window.addEventListener("pointerdown", once, { once: true });
    window.addEventListener("keydown", once, { once: true });
    return () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
  }, [tvPage, enableArrival, enableGoal]);
  return {
    arrivalStudy, setArrivalStudy, launchedStudy, neighborDescriptionId, recognitionDescriptionId,
    canvas, root, engine, status, setStatus, ready, setReady, fallback, setFallback, retry,
    setRetry, paused, setPaused, reduced, setReduced, still, setStill, speed, setSpeed, quality,
    setQuality, source, setSource, panel, setPanel, immersive, setImmersive, fullscreenMessage,
    setFullscreenMessage, expressionId, setExpressionId, held, setHeld, filter, setFilter,
    selectedFallback, setSelectedFallback, rawFeed, feed, feedRef, settings, safe, ownerStill,
    ownerPaused, arrival, arriving, zone, selected, featured, candidates, record, arrivalRecord,
    enabled, availableZones, readingDestination, visibleRecords, visit, select, fullscreen,
    closePanel, sourceLabel, arrivalCue, goal, sound, arrivalChime, goalChime, enableArrival,
    enableGoal, freshKey, fresh, design, designReview, tvPage,
  };
}

/** Everything the world page and its panels read. */
export type WorldExperienceState = ReturnType<typeof useWorldExperience>;
