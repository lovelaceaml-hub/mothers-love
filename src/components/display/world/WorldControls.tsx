/** The explorer's controls: the tour and control bar, the world map and the recognition browser. WorldExperience renders them in place. */
import { ZONES } from "./world-data";
import { RecognitionText, WorldDialog } from "./WorldContent";
import styles from "./WorldExperience.module.css";
import type { WorldExperienceState } from "./use-world-experience";

export function renderTourBar({
  tvPage, immersive, visit, arriving, ready, fallback, availableZones, zone, setPanel, safe,
  setPaused, paused, engine, reduced, still, ownerStill, fullscreen, setImmersive,
}: WorldExperienceState) {
  return (
    !tvPage && <footer className={styles.footer}>
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
  );
}

export function renderWorldMap({
  panel, closePanel, visit, arriving, availableZones, zone,
}: WorldExperienceState) {
  return (
    panel === "map" && (
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
    )
  );
}

export function renderRecognitionBrowser({
  panel, closePanel, filter, setFilter, safe, visibleRecords, readingDestination, arriving,
  select, setPanel,
}: WorldExperienceState) {
  return (
    panel === "recognitions" && (
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
    )
  );
}
