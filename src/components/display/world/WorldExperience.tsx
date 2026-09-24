"use client";
import { ZONES, zoneIndex } from "./world-data";
import { legacyNeighborDialogue, neighborDialogue } from "./neighbor-dialogue";
import type { WorldSource } from "./world-feed";
import { RecognitionText } from "./WorldContent";
import styles from "./WorldExperience.module.css";
import { WorldTvOverlay } from "./WorldTvOverlay";
import { useWorldExperience } from "./use-world-experience";
import { renderReadingOverlay } from "./WorldReadingOverlay";
import { renderTourBar, renderWorldMap, renderRecognitionBrowser } from "./WorldControls";
import { renderSettingsPanel } from "./WorldSettingsPanel";

export function WorldExperience({
  initialSource = "live",
  design = false,
  designReview = false,
  initialStudyArrival,
  tvPage = false,
}: {
  initialSource?: WorldSource;
  /** The design look, the default at `/world` for live and sample (Plan 28 Section 5). */
  design?: boolean;
  /** The design review: the design look's explorer on fictional sample content only. */
  designReview?: boolean;
  initialStudyArrival?: string;
  /** The TV page, the design look's default view: screen text, ticker, speed 2, no settings. */
  tvPage?: boolean;
}) {
  const world = useWorldExperience({ initialSource, design, designReview, initialStudyArrival, tvPage });
  const {
    arrivalStudy, setArrivalStudy, neighborDescriptionId, recognitionDescriptionId, canvas, root,
    engine, status, ready, setReady, fallback, setFallback, retry, setRetry, paused, setPaused,
    reduced, still, quality, source, setSource, immersive, fullscreenMessage, expressionId,
    setHeld, feed, safe, ownerStill, arrival, arriving, zone, selected, arrivalRecord,
    sourceLabel, arrivalCue, fresh,
  } = world;
  return (
    <main
      ref={root}
      className={`${styles.world} ${arriving ? styles.arriving : ""}`}
      data-testid="world-preview"
      data-design={design || undefined}
      data-design-review={designReview || undefined}
      data-quality={quality}
      data-prototype-heart-ready={status.prototypeHeartReady}
      data-zone={status.zone}
      data-traveling={status.traveling}
      data-ready={ready}
      data-frames={status.frames}
      data-elapsed={status.elapsed.toFixed(2)}
      data-reading-remaining={status.readingRemaining.toFixed(2)}
      data-camera-position={status.cameraPosition
        ?.map((value) => value.toFixed(3))
        .join(",")}
      data-world-bubbles={status.worldBubbles?.count ?? 0}
      data-world-bubble-position={status.worldBubbles?.focused?.position
        .map((value) => value.toFixed(3))
        .join(",")}
      data-world-bubble-screen={status.worldBubbles?.focused?.screen
        .map((value) => value.toFixed(3))
        .join(",")}
      data-world-bubble-radius={status.worldBubbles?.focused?.radius.toFixed(3)}
      data-arrival-in-world={status.worldBubbles?.arrivalInWorld ?? false}
      data-world-textures={status.worldBubbles?.textures ?? 0}
      data-motion={paused || reduced || still || ownerStill ? "still" : "tour"}
      data-source={source}
      data-feed-phase={feed.phase}
      data-arrival={arrival.phase}
      data-kit={status.kit}
      data-kit-missing={status.kit ? status.kitMissing : undefined}
      data-tv-page={tvPage || undefined}
    >
      <p id={neighborDescriptionId} className={styles.screenReaderOnly}>
        Fictional neighbors illustrate words of kindness.{" "}
        {/* The design study's rigged neighbors read the same schedule as their speech cards;
            without them the study keeps its miniature figures. In the Grove they speak the
            expression the panel shows, as their card does. Classic and cinematic keep the
            rule their own procedural cards follow. */}
        {design
          ? status.kitNeighbors
            ? (neighborDialogue(status.elapsed, status.zone, arriving, expressionId) ??
              "They greet, walk together and share a heart.")
            : "Miniature figures provide scale in this visual study."
          : (legacyNeighborDialogue(status.elapsed, status.zone, arriving) ??
            "They greet and walk together.")}
      </p>
      <canvas
        key={retry}
        ref={canvas}
        className={styles.canvas}
        aria-label={design && !status.kitNeighbors ? "A continuous three-dimensional heavenly world celebrating Mother's Love, with miniature fictional figures" : "A continuous three-dimensional heavenly world celebrating Mother's Love, with animated fictional neighbors exchanging words of kindness"}
        role="img"
        aria-describedby={`${neighborDescriptionId} ${recognitionDescriptionId}`}
        hidden={fallback}
      />
      <section
        id={recognitionDescriptionId}
        className={styles.screenReaderOnly}
        aria-label="Recognition in the world"
      >
        {safe && !fallback && !arriving && selected && (
          <RecognitionText record={selected} />
        )}
      </section>
      {fallback && (
        <div className={styles.fallbackArt} aria-hidden="true">
          <div className={styles.fallbackHeart}>♡</div>
          <div className={styles.fallbackOrbits} />
        </div>
      )}
      <div className={styles.shade} aria-hidden="true" />
      {tvPage && (
        <WorldTvOverlay
          // Once the arriving bubble has gone, the title names where the camera is heading back to.
          zone={arrival.phase === "return" && status.traveling ? ZONES[zoneIndex(status.destination)] : zone}
          traveling={(status.traveling && !arriving) || arrival.phase === "return"}
          arriving={arriving && arrival.phase !== "return"}
          safe={safe}
          sample={source === "sample"}
          records={feed.records}
          fresh={fresh}
          reduced={reduced || still || ownerStill}
        />
      )}
      {!tvPage && <header className={styles.header}>
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
          <span>{designReview ? "Visual study 02 · For your review" : design ? "A heavenly journey" : "A heavenly journey · Preview"}</span>
        </div>
      </header>}
      {designReview && !tvPage && !immersive && (
        <aside className={styles.studyControls} aria-label="Arrival design studies">
          <span>ARRIVAL STUDIES</span>
          <div>
            {([
              ["constellation", "Pearl formation"],
              ["ribbon", "Silk unveiling"],
              ["bloom", "Petal bloom"],
            ] as const).map(([value, label]) => (
              <button key={value} aria-pressed={arrivalStudy === value} disabled={!ready || arriving}
                onClick={() => {
                  setArrivalStudy(value); setHeld(false); setPaused(false);
                  engine.current?.setPaused(false); engine.current?.holdReading(false);
                  engine.current?.previewStudyArrival(value);
                }}>{label}</button>
            ))}
            {arriving && <button onClick={() => engine.current?.finishStudyArrival()}>Back to world</button>}
          </div>
          {arriving && <span className={styles.studyCue}>{arrivalCue}</span>}
        </aside>
      )}
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
          {/* Never on the TV page: it has no Settings, so a tap would leave a live TV on
              fictional content until someone reloads it (Plan 28 Section 8). */}
          {!tvPage && (
            <button onClick={() => setSource("sample")}>
              Explore the sample world
            </button>
          )}
        </section>
      )}
      {renderReadingOverlay(world)}
      {safe && arriving && (
        <section
          className={styles.screenReaderOnly}
          aria-label="Recognition arrival"
        >
          {arrivalRecord && <RecognitionText record={arrivalRecord} />}
        </section>
      )}
      {safe && arriving && !immersive && !design && (
        <p className={styles.worldArrivalCue}>{arrivalCue}</p>
      )}
      {renderTourBar(world)}
      {renderSettingsPanel(world)}
      {renderWorldMap(world)}
      {renderRecognitionBrowser(world)}
      {fullscreenMessage && (
        <p className={styles.fullscreenMessage} role="status">
          {fullscreenMessage}
        </p>
      )}
    </main>
  );
}
