/** The reading overlay: the place, the recognition being read and its reading controls. WorldExperience renders it in place. */
import { RECOGNITION_ZONES, zoneIndex } from "./world-data";
import { readingSeconds } from "./world-feed";
import { WorldContent } from "./WorldContent";
import styles from "./WorldExperience.module.css";
import tvStyles from "./WorldTv.module.css";
import type { WorldExperienceState } from "./use-world-experience";

export function renderReadingOverlay({
  safe, arriving, immersive, tvPage, status, zone, fallback, record, feed, expressionId,
  setExpressionId, engine, setHeld, held, source,
}: WorldExperienceState) {
  return (
    safe && !arriving && (
      <div
        className={`${styles.presentation} ${immersive ? styles.hidden : ""}`}
      >
        {!tvPage && <section className={styles.story} aria-label="Current world location">
          <div className={styles.eyebrow}>
            {status.traveling
              ? "JOURNEYING TO"
              : `${String(zoneIndex(zone.id) + 1).padStart(2, "0")} / A WORLD OF KINDNESS`}
          </div>
          <h1>{zone.name}</h1>
          <p className={styles.caption}>{zone.caption}</p>
        </section>}
        {(fallback || !RECOGNITION_ZONES.includes(status.zone)) && (
          <aside
            className={`${styles.reading} ${RECOGNITION_ZONES.includes(zone.id) ? styles.recognitionBubble : ""} ${status.traveling ? styles.inTransit : ""}${tvPage ? ` ${tvStyles.panel}` : ""}`}
            aria-label="World content"
          >
            <WorldContent
              tv={tvPage}
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
            {record && !tvPage &&
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
        )}
        {!fallback &&
          !tvPage &&
          !immersive &&
          !status.traveling &&
          RECOGNITION_ZONES.includes(status.zone) && (
            <div
              className={styles.worldReadingControls}
              aria-label="Recognition controls"
            >
              <button
                onClick={() => engine.current?.stepRecognition(-1)}
                aria-label="Previous recognition"
              >
                ←
              </button>
              <button onClick={() => setHeld(!held)} aria-pressed={held}>
                {held ? "Continue reading tour" : "Hold this recognition"}
              </button>
              <button
                onClick={() => engine.current?.stepRecognition(1)}
                aria-label="Next recognition"
              >
                →
              </button>
            </div>
          )}
      </div>
    )
  );
}
