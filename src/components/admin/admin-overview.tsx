'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Aggregate, Device, DisplaySettings } from '@/lib/contracts';
import { adminApi, getAuthErrorMessage } from './admin-api';
import { formatDateTime, formatExpiry, periodLabel } from './admin-utils';
import styles from './admin.module.css';

type OverviewResponse = {
  heldCount: number;
  nearestExpiry: string | null;
  lastCleanupAt: string | null;
  overduePurgeCount: number;
  devices: Device[];
  aggregate: Aggregate;
  settings: DisplaySettings;
};

const CLEANUP_HEALTH_WINDOW_MS = 120_000;

export function AdminOverview() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const refreshInFlight = useRef(false);

  const load = useCallback(async (background = false) => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (!background) {
      setLoading(true);
      setError(null);
    }
    setNow(Date.now());
    try {
      const refreshed = await adminApi<OverviewResponse>('/api/admin/overview');
      setData(refreshed);
      setError(null);
      setNow(Date.now());
    } catch (cause) {
      if (!background) setError(getAuthErrorMessage(cause));
    } finally {
      refreshInFlight.current = false;
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void load(true);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading) return <div className={styles.skeleton} aria-label="Loading overview" />;
  if (error) return <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div>;
  if (!data) return null;

  const activeDevice = data.devices.find((device) => !device.revoked);
  const heartbeat = activeDevice?.lastSeenAt ? `Browser last connected ${formatDateTime(activeDevice.lastSeenAt)}` : 'No paired browser has connected yet';
  const modeLabel = data.settings.mode[0].toUpperCase() + data.settings.mode.slice(1);
  const lastCleanupTime = data.lastCleanupAt ? new Date(data.lastCleanupAt).getTime() : Number.NaN;
  const cleanupNeverRan = !data.lastCleanupAt;
  const cleanupStale = cleanupNeverRan || !Number.isFinite(lastCleanupTime) || now - lastCleanupTime > CLEANUP_HEALTH_WINDOW_MS;
  const retentionNeedsAttention = data.overduePurgeCount > 0 || cleanupStale;
  const cleanupStatus = cleanupNeverRan
    ? 'Cleanup has not run yet. Retention health will show Attention until the first cleanup completes.'
    : cleanupStale
      ? `Cleanup is stale. The latest run was more than ${CLEANUP_HEALTH_WINDOW_MS / 60_000} minutes ago.`
      : `Last cleanup: ${formatDateTime(data.lastCleanupAt)}`;

  return (
    <>
      <section className={styles.grid} aria-label="Campaign status">
        <article className={`${styles.card} ${styles.cardWarm} ${styles.col3}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Needs review</h2><p className={styles.cardDescription}>Held submissions stay private.</p></div><span className={styles.badgeHeld}>Review</span></div>
          <div className={styles.metric}><span className={styles.metricValue}>{data.heldCount}</span><span className={styles.metricLabel}>held now</span></div>
          <p className={styles.cardDescription}>{data.nearestExpiry ? `Nearest expiry ${formatExpiry(data.nearestExpiry)}` : 'No held record is approaching expiry.'}</p>
          <Link className={styles.buttonSecondary} href="/admin/review" style={{ marginTop: 14 }}>Open review inbox</Link>
        </article>

        <article className={`${styles.card} ${styles.cardBlue} ${styles.col3}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Display mode</h2><p className={styles.cardDescription}>Server setting for the paired browser.</p></div><span className={styles.badge}>{modeLabel}</span></div>
          <div className={styles.metric}><span className={styles.metricValue}>{data.settings.pauseArrivals || data.settings.pauseRotation ? 'Paused' : 'Ready'}</span></div>
          <p className={styles.cardDescription}>{heartbeat}. This does not confirm that a physical TV is powered on.</p>
          <Link className={styles.buttonSecondary} href="/admin/display" style={{ marginTop: 14 }}>Open display controls</Link>
        </article>

        <article className={`${styles.card} ${styles.cardGreen} ${styles.col3}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Retention health</h2><p className={styles.cardDescription}>Personal data follows original expiry.</p></div><span className={retentionNeedsAttention ? styles.badgeInvalid : styles.badgePublished}>{retentionNeedsAttention ? 'Attention' : 'Healthy'}</span></div>
          <div className={styles.metric}><span className={styles.metricValue}>{data.overduePurgeCount}</span><span className={styles.metricLabel}>overdue purges</span></div>
          <p className={styles.cardDescription}>{cleanupStatus}{data.overduePurgeCount ? ` ${data.overduePurgeCount} overdue purge${data.overduePurgeCount === 1 ? '' : 's'} remain.` : ''}</p>
        </article>

        <article className={`${styles.card} ${styles.cardLavender} ${styles.col3}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>This month</h2><p className={styles.cardDescription}>Aggregate counts only.</p></div><span className={styles.badge}>{periodLabel('month')}</span></div>
          <div className={styles.metric}><span className={styles.metricValue}>{data.aggregate.recognitions}</span><span className={styles.metricLabel}>recognitions</span></div>
          <p className={styles.cardDescription}>{data.aggregate.expressionTotal} selected expressions in the same reporting period.</p>
          <Link className={styles.buttonSecondary} href="/admin/insights" style={{ marginTop: 14 }}>View insights</Link>
        </article>
      </section>

      <section className={styles.sectionHeader}>
        <div><h2 className={styles.sectionTitle}>Common actions</h2><p className={styles.sectionHint}>Use one deliberate action at a time. Preview tools never touch counts.</p></div>
      </section>
      <section className={styles.grid} aria-label="Common actions">
        <article className={`${styles.card} ${styles.col4}`}><h2 className={styles.cardTitle}>Manage recognitions</h2><p className={styles.cardDescription}>Filter the current personal records, inspect private submitted names and make a version checked change.</p><Link className={styles.button} href="/admin/recognitions" style={{ marginTop: 16 }}>Open recognition manager</Link></article>
        <article className={`${styles.card} ${styles.col4}`}><h2 className={styles.cardTitle}>Emergency neutral</h2><p className={styles.cardDescription}>Use display controls to remove personal content from the paired browser and stop queued arrivals. The browser must acknowledge the change.</p><Link className={styles.buttonDanger} href="/admin/display" style={{ marginTop: 16 }}>Open neutral control</Link></article>
        <article className={`${styles.card} ${styles.col4}`}><h2 className={styles.cardTitle}>Access and devices</h2><p className={styles.cardDescription}>Owner access can invite or revoke moderators and pair a browser with a one time code.</p><Link className={styles.buttonSecondary} href="/admin/settings" style={{ marginTop: 16 }}>Open settings</Link></article>
      </section>
    </>
  );
}
