"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  RECOGNITION_ZONES,
  ZONES,
  zoneIndex,
  type Quality,
  type ZoneId,
} from "./world-data";
import { neighborDialogue } from "./neighbor-dialogue";
import { useWorldFeed } from "./use-world-feed";
import { readingSeconds, type WorldSource } from "./world-feed";
import { RecognitionText, WorldContent, WorldDialog } from "./WorldContent";
import type { WorldEngine, WorldStatus } from "./world-engine";
import styles from "./WorldExperience.module.css";

const INITIAL: WorldStatus = {
  zone: "garden",
  destination: "garden",
  traveling: false,
  elapsed: 0,
  fps: 0,
  calls: 0,
  triangles: 0,
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
export function WorldExperience({
  initialSource = "live",
}: {
  initialSource?: WorldSource;
}) {
  const neighborDescriptionId = useId();
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
    [speed, setSpeed] = useState(1),
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
  const feed = useWorldFeed(source),
    feedRef = useRef(feed);
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
        const { WorldEngine } = await import("./world-engine");
        if (cancelled || !canvas.current) return;
        const instance = new WorldEngine(canvas.current, {
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
  return (
    <main
      ref={root}
      className={`${styles.world} ${arriving ? styles.arriving : ""}`}
      data-testid="world-preview"
      data-zone={status.zone}
      data-traveling={status.traveling}
      data-ready={ready}
      data-frames={status.frames}
      data-elapsed={status.elapsed.toFixed(2)}
      data-reading-remaining={status.readingRemaining.toFixed(2)}
      data-motion={paused || reduced || still || ownerStill ? "still" : "tour"}
      data-source={source}
      data-feed-phase={feed.phase}
      data-arrival={arrival.phase}
    >
      <p id={neighborDescriptionId} className={styles.screenReaderOnly}>
        Fictional neighbors illustrate words of kindness.{" "}
        {neighborDialogue(status.elapsed, status.zone, arriving) ??
          "They greet and walk together."}
      </p>
      <canvas
        key={retry}
        ref={canvas}
        className={styles.canvas}
        aria-label="A continuous three-dimensional heavenly world celebrating Mother's Love, with animated fictional neighbors exchanging words of kindness"
        role="img"
        aria-describedby={neighborDescriptionId}
        hidden={fallback}
      />
      {fallback && (
        <div className={styles.fallbackArt} aria-hidden="true">
          <div className={styles.fallbackHeart}>♡</div>
          <div className={styles.fallbackOrbits} />
        </div>
      )}
      <div className={styles.shade} aria-hidden="true" />
      <header className={styles.header}>
        <a
          className={styles.brand}
          href="https://mothers-love.vercel.app/display"
        >
          <span className={styles.brandMark} aria-hidden="true">
            ♡
          </span>
          <span>
            THE WORDS OF<strong>Mother&apos;s Love</strong>
          </span>
        </a>
        <div className={styles.preview}>
          <span className={styles.statusDot} />
          {sourceLabel}
          <span>A heavenly journey · Preview</span>
        </div>
      </header>
      {!ready && !fallback && (
        <p className={styles.notice} role="status">
          Opening your world...
        </p>
      )}
      {fallback && (
        <div className={styles.notice} role="status">
          <strong>Still world preview</strong>
          <span>
            3D is unavailable in this browser. You can still read recognitions
            and explore every location.
          </span>
          <button
            onClick={() => {
              setFallback(false);
              setReady(false);
              setRetry((n) => n + 1);
            }}
          >
            Try 3D again
          </button>
        </div>
      )}
      {!safe && (
        <section className={styles.safeState} role="status">
          <p>THE WORDS OF MOTHER&apos;S LOVE</p>
          <h1>
            {feed.phase === "connecting"
              ? "Connecting to the world..."
              : feed.phase === "quiet" ||
                  feed.phase === "neutral" ||
                  feed.phase === "disabled"
                ? "A quiet moment."
                : "We will be back soon."}
          </h1>
          <p>
            {feed.phase === "unavailable"
              ? "The live view will return after the connection is verified."
              : "The world is resting. Thank you for sharing kindness."}
          </p>
          <button onClick={() => setSource("sample")}>
            Explore the sample world
          </button>
        </section>
      )}
      {safe && !arriving && (
        <div
          className={`${styles.presentation} ${immersive ? styles.hidden : ""}`}
        >
          <section className={styles.story} aria-label="Current world location">
            <div className={styles.eyebrow}>
              {status.traveling
                ? "JOURNEYING TO"
                : `${String(zoneIndex(zone.id) + 1).padStart(2, "0")} / A WORLD OF KINDNESS`}
            </div>
            <h1>{zone.name}</h1>
            <p className={styles.caption}>{zone.caption}</p>
          </section>
          <aside
            className={`${styles.reading} ${record && record.message.length > 260 ? styles.longReading : ""}`}
            aria-label="World content"
          >
            <WorldContent
              elapsed={
                record
                  ? Math.max(
                      0,
                      readingSeconds(
                        record.message,
                        feed.snapshot?.settings.readingSeconds ?? 24,
                      ) - status.readingRemaining,
                    )
                  : 0
              }
              zone={zone.id}
              feed={feed}
              record={record}
              expressionId={expressionId}
              onExpression={(id) => {
                setExpressionId(id);
                engine.current?.setExpression(id);
              }}
            />
            {record &&
              [
                "garden",
                "heart",
                "featured",
                "orbit",
                "peacemakers",
                "live-feed",
              ].includes(zone.id) && (
                <div className={styles.readingControls}>
                  <button
                    onClick={() => engine.current?.stepRecognition(-1)}
                    disabled={fallback}
                    aria-label="Previous recognition"
                  >
                    ←
                  </button>
                  <button onClick={() => setHeld(!held)} aria-pressed={held}>
                    {held ? "Continue reading tour" : "Hold this recognition"}
                  </button>
                  <button
                    onClick={() => engine.current?.stepRecognition(1)}
                    disabled={fallback}
                    aria-label="Next recognition"
                  >
                    →
                  </button>
                </div>
              )}
            {source === "sample" && (
              <span className={styles.sampleNote}>
                Fictional sample content
              </span>
            )}
          </aside>
        </div>
      )}
      {safe && arriving && (
        <section
          className={styles.arrivalOverlay}
          aria-label="Recognition arrival"
        >
          <div className={styles.arrivalLight} aria-hidden="true" />
          <p className={styles.arrivalEyebrow}>
            {source === "sample"
              ? "SAMPLE ENTRANCE"
              : "A NEW LIGHT IN OUR WORLD"}
            {arrival.waveSize > 1
              ? ` · ${arrival.waveIndex} of ${arrival.waveSize}`
              : ""}
          </p>
          {arrival.phase === "approach" ? (
            <h1>A kindness is arriving.</h1>
          ) : arrival.phase === "return" ? (
            <h1>Love becomes part of our world.</h1>
          ) : arrivalRecord ? (
            <div
              className={`${styles.arrivalCard} ${arrival.phase === "reading" ? styles.arrivalRead : ""}`}
            >
              <RecognitionText
                record={arrivalRecord}
                large
                elapsed={
                  arrival.phase === "reading"
                    ? arrival.age
                    : arrival.phase === "settle"
                      ? 90
                      : 0
                }
                minimum={feed.snapshot?.settings.readingSeconds ?? 24}
              />
              <div className={styles.arrivalProgress}>
                <span
                  style={{
                    width: `${arrival.phase === "reading" ? arrival.progress * 100 : 0}%`,
                  }}
                />
              </div>
              <span className={styles.cardFoot}>
                {arrival.phase === "settle"
                  ? "A new bloom in our garden."
                  : "A moment to celebrate and read."}
              </span>
            </div>
          ) : (
            <h1>Love is all around us.</h1>
          )}
        </section>
      )}
      <footer className={styles.footer}>
        {!immersive && (
          <nav className={styles.tour} aria-label="World locations">
            {ZONES.slice(0, 3).map((item, i) => (
              <button
                key={item.id}
                onClick={() => visit(item.id)}
                disabled={
                  arriving ||
                  (!ready && !fallback) ||
                  !availableZones.some((zone) => zone.id === item.id)
                }
                aria-pressed={zone.id === item.id}
              >
                <span className={styles.stopNumber}>0{i + 1}</span>
                {item.short}
                <span className={styles.stopLine} />
              </button>
            ))}
            <button onClick={() => setPanel("map")}>
              World map
              <span className={styles.stopLine} />
            </button>
          </nav>
        )}
        <div className={styles.controls}>
          {!immersive && (
            <>
              <button onClick={() => setPanel("recognitions")} disabled={!safe}>
                Read recognitions
              </button>
              <button
                onClick={() => {
                  setPaused(!paused);
                  engine.current?.setPaused(!paused);
                }}
                disabled={!ready || fallback}
                aria-label={paused ? "Resume tour" : "Pause tour"}
              >
                {paused
                  ? "Resume tour"
                  : reduced || still || ownerStill
                    ? "Pause reading"
                    : "Pause tour"}
              </button>
              <button onClick={() => setPanel("settings")}>Settings</button>
              <button onClick={fullscreen}>Fullscreen</button>
            </>
          )}
          <button onClick={() => setImmersive(!immersive)}>
            {immersive ? "Show details" : "Hide details"}
          </button>
        </div>
      </footer>
      {panel === "settings" && (
        <WorldDialog title="World controls" onClose={closePanel}>
          <div className={styles.settingsBody}>
            <label>
              Content
              <select
                value={source}
                onChange={(event) => {
                  setSource(event.target.value as WorldSource);
                  setHeld(false);
                  setSelectedFallback(null);
                }}
              >
                <option value="sample">Sample world</option>
                <option value="live">Live recognitions</option>
              </select>
            </label>
            <label>
              Tour speed
              <select
                value={speed}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSpeed(value);
                  engine.current?.setSpeed(value);
                }}
              >
                <option value={0.5}>Slow</option>
                <option value={1}>Gentle</option>
                <option value={2}>Explore faster</option>
              </select>
            </label>
            <label>
              Picture quality
              <select
                value={quality}
                onChange={(event) => {
                  const value = event.target.value as Quality;
                  setQuality(value);
                  engine.current?.setQuality(value);
                }}
              >
                <option value="auto">Automatic</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={still}
                onChange={(event) => setStill(event.target.checked)}
              />
              Still view
            </label>
            {(reduced || ownerStill || ownerPaused) && (
              <p>
                {reduced
                  ? "Your device requests reduced motion."
                  : ownerStill
                    ? "The owner has selected still mode."
                    : "The owner has paused automatic scene rotation."}
              </p>
            )}
            {source === "sample" && (
              <div className={styles.demoButtons}>
                <button
                  onClick={() => {
                    engine.current?.demonstrateArrival(1);
                    closePanel();
                  }}
                  disabled={!ready || paused || held}
                >
                  Preview grand entrance
                </button>
                <button
                  onClick={() => {
                    engine.current?.demonstrateArrival(5);
                    closePanel();
                  }}
                  disabled={!ready || paused || held}
                >
                  Preview five arrivals
                </button>
              </div>
            )}
            <details>
              <summary>Rendering details</summary>
              <dl>
                <div>
                  <dt>Renderer</dt>
                  <dd>{fallback ? "Still fallback" : "WebGL 2"}</dd>
                </div>
                <div>
                  <dt>Frame rate</dt>
                  <dd>{status.fps} fps</dd>
                </div>
                <div>
                  <dt>Quality</dt>
                  <dd>{status.quality}</dd>
                </div>
                <div>
                  <dt>Draw calls</dt>
                  <dd>{status.calls}</dd>
                </div>
                <div>
                  <dt>Triangles</dt>
                  <dd>{status.triangles.toLocaleString()}</dd>
                </div>
              </dl>
            </details>
            <p>
              {source === "sample"
                ? "Sample names and messages are fictional."
                : "This world reads the same public recognitions and display settings as the current TV."}
            </p>
          </div>
        </WorldDialog>
      )}
      {panel === "map" && (
        <WorldDialog title="A world of kindness" onClose={closePanel} wide>
          <p className={styles.dialogIntro}>
            Follow the journey, or choose a place to linger.
          </p>
          <div className={styles.worldMap}>
            {ZONES.map((item, i) => (
              <button
                key={item.id}
                onClick={() => visit(item.id)}
                disabled={
                  arriving ||
                  !availableZones.some((zone) => zone.id === item.id)
                }
                aria-pressed={zone.id === item.id}
              >
                <span
                  className={styles.mapGem}
                  style={{ background: item.color }}
                />
                <span>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <strong>{item.name}</strong>
                  <span>{item.caption}</span>
                </span>
              </button>
            ))}
          </div>
        </WorldDialog>
      )}
      {panel === "recognitions" && (
        <WorldDialog
          title="Words worth lingering over"
          onClose={closePanel}
          wide
        >
          <label className={styles.filterLabel}>
            Expression
            <select
              value={filter}
              onChange={(event) => setFilter(Number(event.target.value))}
            >
              <option value={0}>All expressions</option>
              {Array.from({ length: 9 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Expression {i + 1}
                </option>
              ))}
            </select>
          </label>
          {!safe ? (
            <p>
              The live view is resting. Recognitions will return after
              verification.
            </p>
          ) : visibleRecords.length ? (
            <div className={styles.recognitionBrowser}>
              {visibleRecords.map((item) => (
                <article key={item.id}>
                  <RecognitionText record={item} />
                  <button
                    disabled={!readingDestination || arriving}
                    onClick={() => {
                      select(item.id);
                      setPanel(null);
                    }}
                  >
                    Linger with this recognition
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p>No recognitions are available for this expression yet.</p>
          )}
        </WorldDialog>
      )}
      {fullscreenMessage && (
        <p className={styles.fullscreenMessage} role="status">
          {fullscreenMessage}
        </p>
      )}
    </main>
  );
}
