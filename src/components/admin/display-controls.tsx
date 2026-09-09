'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DisplaySettings } from '@/lib/contracts';
import { useAdminSession } from './admin-shell';
import { adminApi, adminJson, getAuthErrorMessage } from './admin-api';
import { displaySettingChanges } from './admin-utils';
import styles from './admin.module.css';

type Overview = { settings: DisplaySettings; aggregate: { recognitions: number; expressionTotal: number } };
export function DisplayControls() {
  const session = useAdminSession();
  const [settings, setSettings] = useState<DisplaySettings | null>(null);
  const [aggregate, setAggregate] = useState<Overview['aggregate'] | null>(null);
  const [draft, setDraft] = useState<Partial<DisplaySettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi<Overview>('/api/admin/overview');
      setSettings(response.settings);
      setAggregate(response.aggregate);
      setDraft({});
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const changes = useMemo(() => settings ? displaySettingChanges(settings, draft) : {}, [draft, settings]);

  const setValue = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!settings || !Object.keys(changes).length) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminJson<DisplaySettings>('/api/admin/settings', { expectedVersion: settings.version, changes });
      setSettings(updated);
      setDraft({});
      setNotice('Settings saved. Open TV View screens apply them when they refresh.');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const chooseMode = (mode: DisplaySettings['mode']) => setValue('mode', mode);

  if (loading) return <div className={styles.skeleton} aria-label="Loading display controls" />;
  if (error && !settings) return <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div>;
  if (!settings) return null;

  return (
    <>
      {notice ? <div className={styles.success} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <section className={styles.grid}>
        <article className={`${styles.card} ${styles.cardBlue} ${styles.col7}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Current display state</h2><p className={styles.cardDescription}>These are the current global settings for open TV View screens.</p></div><span className={styles.badge}>{settings.mode[0].toUpperCase() + settings.mode.slice(1)}</span></div>
          <div className={styles.grid}>
            <div className={styles.col6}><p className={styles.eyebrow}>Current mode</p><div className={styles.metric}><span className={styles.metricValue}>{settings.mode[0].toUpperCase() + settings.mode.slice(1)}</span></div><p className={styles.cardDescription}>{settings.pauseArrivals || settings.pauseRotation ? 'Some display updates are paused.' : 'Display arrivals and rotation are enabled.'}</p></div>
            <div className={styles.col6}><p className={styles.eyebrow}>Screen updates</p><p className={styles.cardTitle}>Open TV View screens refresh these settings.</p><p className={styles.cardDescription}>An offline screen keeps its last successful state.</p></div>
          </div>
          <div className={styles.preview} style={{ marginTop: 18 }}><p className={styles.previewKicker}>Campaign totals</p><h3 className={styles.previewTitle}>Mother&apos;s Love Living Wall</h3><p className={styles.previewMessage}>Current campaign totals</p><div className={styles.listItemMeta}><span className={styles.badge}>{aggregate?.recognitions ?? 0} recognitions</span><span className={styles.badge}>{aggregate?.expressionTotal ?? 0} expressions</span></div></div>
          <div className={styles.buttonRow} style={{ marginTop: 16 }}><button type="button" className={styles.buttonQuiet} onClick={() => void load()} disabled={loading}>Refresh global settings</button></div>
        </article>

        <article className={`${styles.card} ${styles.col5}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Display settings</h2><p className={styles.cardDescription}>Choose a mode and save your changes.</p></div></div>
          <div className={styles.tabs} role="group" aria-label="Display mode">
            {(['normal', 'quiet', 'neutral'] as const).map((mode) => <button key={mode} type="button" className={`${styles.tab} ${(draft.mode ?? settings.mode) === mode ? styles.tabActive : ''}`} onClick={() => chooseMode(mode)}>{mode[0].toUpperCase() + mode.slice(1)}</button>)}
          </div>
          <div className={styles.toggleRow}><div className={styles.toggleText}><p className={styles.toggleTitle}>Pause new arrivals</p><p className={styles.toggleHint}>Stops arrival interruptions while the campaign remains available.</p></div><button type="button" className={`${styles.switch} ${((draft.pauseArrivals ?? settings.pauseArrivals) ? styles.switchOn : '')}`} aria-label="Toggle pause new arrivals" aria-pressed={draft.pauseArrivals ?? settings.pauseArrivals} onClick={() => setValue('pauseArrivals', !(draft.pauseArrivals ?? settings.pauseArrivals))} /></div>
          <div className={styles.toggleRow}><div className={styles.toggleText}><p className={styles.toggleTitle}>Pause rotation</p><p className={styles.toggleHint}>Keeps the current display state from advancing.</p></div><button type="button" className={`${styles.switch} ${((draft.pauseRotation ?? settings.pauseRotation) ? styles.switchOn : '')}`} aria-label="Toggle pause rotation" aria-pressed={draft.pauseRotation ?? settings.pauseRotation} onClick={() => setValue('pauseRotation', !(draft.pauseRotation ?? settings.pauseRotation))} /></div>
          <div className={styles.toggleRow}><div className={styles.toggleText}><p className={styles.toggleTitle}>Show trails</p><p className={styles.toggleHint}>Decorative trails remain behind readable text.</p></div><button type="button" className={`${styles.switch} ${((draft.showTrails ?? settings.showTrails) ? styles.switchOn : '')}`} aria-label="Toggle show trails" aria-pressed={draft.showTrails ?? settings.showTrails} onClick={() => setValue('showTrails', !(draft.showTrails ?? settings.showTrails))} /></div>
          <div className={styles.toggleRow}><div className={styles.toggleText}><p className={styles.toggleTitle}>Show constellations</p><p className={styles.toggleHint}>Links correspond to shared expressions.</p></div><button type="button" className={`${styles.switch} ${((draft.showConstellations ?? settings.showConstellations) ? styles.switchOn : '')}`} aria-label="Toggle show constellations" aria-pressed={draft.showConstellations ?? settings.showConstellations} onClick={() => setValue('showConstellations', !(draft.showConstellations ?? settings.showConstellations))} /></div>
          <div className={styles.field} style={{ marginTop: 16 }}><label className={styles.label} htmlFor="display-motion">Motion preset</label><select id="display-motion" className={styles.select} value={draft.motion ?? settings.motion} onChange={(event) => setValue('motion', event.target.value as DisplaySettings['motion'])}><option value="calm">Calm</option><option value="standard">Standard</option><option value="lively">Lively</option><option value="still">Still</option></select></div>
          <div className={styles.grid}><div className={styles.col6}><label className={styles.label} htmlFor="display-reading">Reading seconds</label><input id="display-reading" className={styles.input} type="number" min={12} max={60} value={draft.readingSeconds ?? settings.readingSeconds} onChange={(event) => setValue('readingSeconds', Number(event.target.value))} /></div><div className={styles.col6}><label className={styles.label} htmlFor="display-bubbles">Max bubbles</label><input id="display-bubbles" className={styles.input} type="number" min={4} max={6} value={draft.maxBubbles ?? settings.maxBubbles} onChange={(event) => setValue('maxBubbles', Number(event.target.value))} /></div></div>
          <div className={styles.buttonRow} style={{ marginTop: 18 }}><button type="button" className={styles.button} onClick={() => void save()} disabled={saving || !Object.keys(changes).length}>{saving ? 'Saving...' : 'Save display settings'}</button><button type="button" className={styles.buttonQuiet} onClick={() => setDraft({})}>Cancel</button></div>
        </article>

        <article className={`${styles.card} ${styles.cardWarm} ${styles.col6}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Collection availability</h2><p className={styles.cardDescription}>This changes whether the public form is open.</p></div><span className={session?.role === 'owner' ? styles.badge : styles.badgeHeld}>{session?.role === 'owner' ? 'Owner only' : 'Owner required'}</span></div>
          <div className={styles.toggleRow}><div className={styles.toggleText}><p className={styles.toggleTitle}>{settings.collectionOpen ? 'Collection is open' : 'Collection is closed'}</p><p className={styles.toggleHint}>Missing configuration or an unhealthy cleanup service keeps collection closed.</p></div><button type="button" className={`${styles.switch} ${settings.collectionOpen ? styles.switchOn : ''}`} aria-label="Toggle collection availability" aria-pressed={settings.collectionOpen} disabled={session?.role !== 'owner'} onClick={() => setValue('collectionOpen', !settings.collectionOpen)} /></div>
          {session?.role !== 'owner' ? <p className={styles.fieldHint}>A moderator can operate display settings but cannot change collection availability.</p> : null}
        </article>
      </section>
    </>
  );
}
