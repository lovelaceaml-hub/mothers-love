/** The settings panel: content, tour speed, picture quality, still view, the demo arrivals and the rendering details. WorldExperience renders it in place. */
import type { Quality } from "./world-data";
import type { WorldSource } from "./world-feed";
import { WorldDialog } from "./WorldContent";
import styles from "./WorldExperience.module.css";
import type { WorldExperienceState } from "./use-world-experience";

export function renderSettingsPanel({
  panel, closePanel, source, designReview, setSource, setHeld, setSelectedFallback, speed,
  setSpeed, engine, quality, setQuality, design, still, setStill, reduced, ownerStill,
  ownerPaused, ready, paused, held, fallback, status,
}: WorldExperienceState) {
  return (
    panel === "settings" && (
      <WorldDialog title="World controls" onClose={closePanel}>
        <div className={styles.settingsBody}>
          <label>
            Content
            <select
              value={source}
              disabled={designReview}
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
              <option value="high">{design ? "High definition (up to 4K)" : "High"}</option>
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
              {design && (
                <>
                  <div>
                    <dt>Textures</dt>
                    <dd>{status.textures}</dd>
                  </div>
                  <div>
                    <dt>Geometries</dt>
                    <dd>{status.geometries}</dd>
                  </div>
                  <div>
                    <dt>Kit</dt>
                    <dd>
                      {status.kit ?? "off"}
                      {status.kitCounts
                        ? ` ${status.kitCounts.loaded} of ${status.kitCounts.total}`
                        : ""}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </details>
          <p>
            {source === "sample"
              ? "Sample names and messages are fictional."
              : "This world reads the same public recognitions and display settings as the current TV."}
          </p>
        </div>
      </WorldDialog>
    )
  );
}
