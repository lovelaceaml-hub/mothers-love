'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Aggregate, Expression } from '@/lib/contracts';
import { EXPRESSIONS } from '@/lib/catalog';
import { adminApi, getAuthErrorMessage } from './admin-api';
import { makeAggregateCsv, periodLabel } from './admin-utils';
import styles from './admin.module.css';

type Period = 'week' | 'month' | 'all' | 'custom';
const expressionCatalog = EXPRESSIONS as Expression[];

export function Insights() {
  const [period, setPeriod] = useState<Period>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = new URLSearchParams({ period });
    if (period === 'custom' && from) query.set('from', from);
    if (period === 'custom' && to) query.set('to', to);
    try {
      setAggregate(await adminApi<Aggregate>(`/api/admin/reports?${query.toString()}`));
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [from, period, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const maxCount = useMemo(() => Math.max(1, ...(aggregate?.expressionCounts ?? [0])), [aggregate]);

  const exportAggregate = async () => {
    if (!aggregate) return;
    setNotice(null);
    try {
      let csv = '';
      try {
        const response = await adminApi<{ csv?: string }>(`/api/admin/reports/export?period=${period}${from ? `&from=${encodeURIComponent(from)}` : ''}${to ? `&to=${encodeURIComponent(to)}` : ''}`);
        csv = response.csv ?? '';
      } catch {
        csv = '';
      }
      if (!csv) csv = makeAggregateCsv(aggregate);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mothers-love-aggregate-${period}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('Aggregate-only CSV downloaded. It contains no recipients, messages, submitted names or raw records.');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    }
  };

  return (
    <>
      <section className={styles.card}>
        <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Reporting period</h2><p className={styles.cardDescription}>Week means Sunday through Saturday in America/Los_Angeles. Counts come from durable aggregates.</p></div><button type="button" className={styles.buttonSecondary} onClick={() => void exportAggregate()} disabled={!aggregate}>Export aggregate CSV</button></div>
        <div className={styles.tabs} role="tablist" aria-label="Reporting period">
          {(['week', 'month', 'all', 'custom'] as Period[]).map((option) => <button key={option} type="button" role="tab" aria-selected={period === option} className={`${styles.tab} ${period === option ? styles.tabActive : ''}`} onClick={() => { setPeriod(option); if (option !== 'custom') { setFrom(''); setTo(''); } }}>{periodLabel(option)}</button>)}
        </div>
        {period === 'custom' ? <div className={styles.grid} style={{ marginBottom: 18 }}><div className={styles.col4}><label className={styles.label} htmlFor="report-from">Month start</label><input id="report-from" className={styles.input} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div className={styles.col4}><label className={styles.label} htmlFor="report-to">Month end</label><input id="report-to" className={styles.input} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div><div className={styles.col4} style={{ alignSelf: 'end' }}><button type="button" className={styles.button} onClick={() => void load()} disabled={!from || !to}>Load custom month</button></div></div> : null}
        {notice ? <div className={styles.success} role="status">{notice}</div> : null}
        {error ? <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div> : null}
        {loading ? <div className={styles.skeleton} aria-label="Loading report" /> : null}
        {!loading && aggregate ? <>
          <div className={styles.grid}>
            <article className={`${styles.card} ${styles.cardWarm} ${styles.col4}`}><p className={styles.eyebrow}>Recognitions</p><div className={styles.metric}><span className={styles.metricValue}>{aggregate.recognitions}</span></div><p className={styles.cardDescription}>{aggregate.periodStart} to {aggregate.periodEnd}</p></article>
            <article className={`${styles.card} ${styles.cardBlue} ${styles.col4}`}><p className={styles.eyebrow}>Selected expressions</p><div className={styles.metric}><span className={styles.metricValue}>{aggregate.expressionTotal}</span></div><p className={styles.cardDescription}>All nine expressions are retained in canonical order.</p></article>
            <article className={`${styles.card} ${styles.cardGreen} ${styles.col4}`}><p className={styles.eyebrow}>Data as of</p><div className={styles.metric}><span className={styles.metricValue} style={{ fontSize: '1.25rem' }}>{aggregate.revision}</span><span className={styles.metricLabel}>aggregate revision</span></div><p className={styles.cardDescription}>Aggregate revision identifies the server snapshot used.</p></article>
          </div>
          <div className={styles.sectionHeader}><div><h2 className={styles.sectionTitle}>Expression counts</h2><p className={styles.sectionHint}>These totals never imply unique people, rankings or sender activity.</p></div></div>
          <div className={styles.card}>
            {expressionCatalog.map((expression, index) => { const count = aggregate.expressionCounts[index] ?? 0; return <div className={styles.statLine} key={expression.id}><span style={{ minWidth: 180 }}>{expression.id}. {expression.phrase}</span><div style={{ flex: 1 }}><div className={styles.bar}><div className={styles.barFill} style={{ width: `${Math.round((count / maxCount) * 100)}%`, background: expression.color }} /></div></div><span className={styles.statValue}>{count}</span></div>; })}
          </div>
        </> : null}
      </section>
    </>
  );
}
