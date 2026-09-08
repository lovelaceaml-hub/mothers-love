'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { AdminRecognition, Expression } from '@/lib/contracts';
import { EXPRESSIONS } from '@/lib/catalog';
import { ActionDialog } from './action-dialog';
import { adminApi, adminJson, getAuthErrorMessage } from './admin-api';
import { formatDateTime, formatExpiry, isExpired, statusLabel, type ActionKind } from './admin-utils';
import styles from './admin.module.css';

type RecognitionResponse = { items: AdminRecognition[]; total: number };
const expressionCatalog = EXPRESSIONS as Expression[];

export function ReviewInbox() {
  const [items, setItems] = useState<AdminRecognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminRecognition | null>(null);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi<RecognitionResponse>('/api/admin/recognitions?status=held&page=1');
      setItems(response.items);
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

  const commit = async () => {
    if (!selected || !action) return;
    setBusy(true);
    setError(null);
    try {
      const result = await adminJson<{ recognition: AdminRecognition | null }>(`/api/admin/recognitions/${encodeURIComponent(selected.id)}`, {
        expectedVersion: selected.version,
        action,
        ...(reason ? { reason } : {}),
      });
      setItems((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      setAction(null);
      setReason('');
      setNotice(result.recognition ? `${statusLabel(result.recognition.status)} saved. The held queue has been refreshed.` : 'The recognition was removed from the held queue.');
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
      if ((cause as { status?: number }).status === 409) setNotice('Another admin updated this held record. Refresh before making a new decision.');
    } finally {
      setBusy(false);
    }
  };

  const cancelAction = useCallback(() => {
    if (!busy) {
      setSelected(null);
      setAction(null);
    }
  }, [busy]);

  if (loading) return <div className={styles.skeleton} aria-label="Loading review inbox" />;
  if (error && !items.length) return <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div>;

  return (
    <>
      {notice ? <div className={styles.success} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <section className={styles.card}>
        <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Held submissions</h2><p className={styles.cardDescription}>A hold reason is an administrative category, not public copy. Publishing reruns validation and counts once.</p></div><span className={styles.badgeHeld}>{items.length} waiting</span></div>
        {!items.length ? <div className={styles.empty}>No held submissions need a decision. New held content will appear here after the next refresh.</div> : <div className={styles.list}>{items.map((item) => <article className={styles.listItem} key={item.id}>
          <div><p className={styles.listItemTitle}>{item.recipient}</p><p className={styles.listItemText}>{item.message}</p><div className={styles.listItemMeta}><span className={`${styles.badge} ${styles.badgeHeld}`}>{statusLabel(item.status)}</span><span>Submitted {formatDateTime(item.createdAt)}</span><span>{formatExpiry(item.expiresAt)}</span><span>Reason: {item.reason ?? 'Content check'}</span></div><p className={styles.fieldHint}>Private submitted name: {item.submittedName}</p><div className={styles.listItemMeta}>{item.expressionIds.map((expressionId) => <span key={expressionId} className={styles.badge}>{expressionCatalog.find((expression) => expression.id === expressionId)?.phrase ?? `Expression ${expressionId}`}</span>)}</div></div>
          <div className={styles.buttonRow} style={{ alignSelf: 'center', justifyContent: 'flex-end' }}><Link className={styles.buttonQuiet} href={`/admin/recognitions/${encodeURIComponent(item.id)}`}>Edit then publish</Link><button type="button" className={styles.button} onClick={() => { setSelected(item); setAction('publish'); setReason(''); }} disabled={isExpired(item.expiresAt)}>Publish</button><button type="button" className={styles.buttonQuiet} onClick={() => { setSelected(item); setAction('hide'); setReason(''); }}>Keep hidden</button><button type="button" className={styles.buttonDanger} onClick={() => { setSelected(item); setAction('invalidate'); setReason(''); }}>Remove as invalid</button></div>
        </article>)}</div>}
      </section>
      {selected && action ? <ActionDialog action={action} recognition={selected} reason={reason} onReasonChange={setReason} onCancel={cancelAction} onConfirm={() => void commit()} busy={busy} /> : null}
    </>
  );
}
