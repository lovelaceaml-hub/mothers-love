'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminRecognition, Expression } from '@/lib/contracts';
import { EXPRESSIONS } from '@/lib/catalog';
import { useAdminSession } from './admin-shell';
import { ActionDialog } from './action-dialog';
import { adminApi, adminJson, getAuthErrorMessage } from './admin-api';
import { formatDateTime, graphemeLength, isExpired, requiresReason, statusLabel, validateEditorDraft, type ActionKind } from './admin-utils';
import styles from './admin.module.css';
import { MAX_MESSAGE_GRAPHEMES } from "@/lib/contracts";

type EditableDraft = {
  recipient: string;
  submittedName: string;
  message: string;
  expressionIds: number[];
};

const expressionCatalog = EXPRESSIONS as Expression[];

export function RecognitionDetailPage({ id }: { id: string }) {
  const session = useAdminSession();
  const [recognition, setRecognition] = useState<AdminRecognition | null>(null);
  const [draft, setDraft] = useState<EditableDraft | null>(null);
  const [latest, setLatest] = useState<AdminRecognition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState('');

  const expireOpenRecognition = useCallback(() => {
    setExpired(true);
    setError(null);
    setRecognition(null);
    setDraft(null);
    setLatest(null);
    setAction(null);
    setReason('');
    setNotice('This recognition expired while it was open. Its personal fields were cleared and actions are disabled.');
  }, []);

  const adoptRecognition = useCallback((candidate: AdminRecognition | null, target: 'current' | 'latest' = 'current') => {
    if (!candidate) {
      setExpired(false);
      setRecognition(null);
      setDraft(null);
      setLatest(null);
      return false;
    }
    if (isExpired(candidate.expiresAt)) {
      expireOpenRecognition();
      return false;
    }
    if (target === 'latest') {
      setLatest(candidate);
      return true;
    }
    setExpired(false);
    setRecognition(candidate);
    setDraft(toDraft(candidate));
    setLatest(null);
    return true;
  }, [expireOpenRecognition]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const current = await adminApi<AdminRecognition>(`/api/admin/recognitions/${encodeURIComponent(id)}`);
      adoptRecognition(current);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [adoptRecognition, id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!recognition || expired) return;
    const remaining = Math.max(0, new Date(recognition.expiresAt).getTime() - Date.now());
    const expiryTimer = window.setTimeout(expireOpenRecognition, remaining);
    return () => {
      window.clearTimeout(expiryTimer);
    };
  }, [expired, expireOpenRecognition, recognition]);

  const fieldsChanged = useMemo(() => {
    if (!recognition || !draft) return false;
    return recognition.recipient !== draft.recipient || recognition.submittedName !== draft.submittedName || recognition.message !== draft.message || recognition.expressionIds.join(',') !== draft.expressionIds.join(',');
  }, [draft, recognition]);

  const updateDraft = <K extends keyof EditableDraft>(key: K, value: EditableDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const saveEdit = async () => {
    if (!recognition || !draft || expired) return;
    const errors = validateEditorDraft(draft);
    if (errors.length) {
      setError(errors.join(' '));
      return;
    }
    if (requiresReason('edit', fieldsChanged)) {
      setAction('edit');
      setReason('correction');
      return;
    }
    await commitAction('edit', null);
  };

  const commitAction = async (kind: ActionKind, actionReason: string | null) => {
    if (!recognition || expired) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const fields = kind === 'edit' && draft ? draft : undefined;
      const response = await adminJson<{ recognition: AdminRecognition | null }>(`/api/admin/recognitions/${encodeURIComponent(recognition.id)}`, {
        expectedVersion: recognition.version,
        action: kind,
        ...(fields ? { fields } : {}),
        ...(actionReason ? { reason: actionReason } : {}),
      });
      if (response.recognition) {
        if (!adoptRecognition(response.recognition)) return;
      } else {
        adoptRecognition(null);
      }
      setAction(null);
      setReason('');
      setNotice(kind === 'delete' ? 'Recognition permanently deleted.' : 'Changes saved.');
    } catch (cause) {
      const status = (cause as { status?: number; code?: string }).status;
      const code = (cause as { code?: string }).code;
      if (status === 409 || code === 'VERSION_CONFLICT') {
        try {
          const current = await adminApi<AdminRecognition>(`/api/admin/recognitions/${encodeURIComponent(recognition.id)}`);
          if (adoptRecognition(current, 'latest')) {
            setNotice('Another update was saved. Choose which copy to use before saving again.');
          }
        } catch (refreshCause) {
          setError(getAuthErrorMessage(refreshCause));
        }
      } else if (status === 410 || code === 'EXPIRED') {
        expireOpenRecognition();
      } else {
        setError(getAuthErrorMessage(cause));
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelAction = useCallback(() => {
    if (!saving) setAction(null);
  }, [saving]);

  if (loading) return <div className={styles.skeleton} aria-label="Loading recognition detail" />;
  if (error && !recognition) return <div className={styles.error} role="alert">{error} <button type="button" className={styles.authLink} onClick={() => void load()}>Try again</button></div>;
  if (!recognition) {
    if (expired) {
      return <><div className={styles.buttonRow} style={{ marginBottom: 16 }}><Link className={styles.buttonQuiet} href="/admin/recognitions">Back to recognitions</Link></div><div className={styles.error} role="alert"><strong>Expired.</strong> Personal recognition fields were cleared. Publish, restore, feature and edit are unavailable.</div></>;
    }
    return <div className={styles.empty}>This recognition is no longer available.</div>;
  }

  const currentStatusClass = recognition.status === 'published' ? styles.badgePublished : recognition.status === 'held' ? styles.badgeHeld : recognition.status === 'hidden' ? styles.badgeHidden : styles.badgeInvalid;

  return (
    <>
      <div className={styles.buttonRow} style={{ marginBottom: 16 }}><Link className={styles.buttonQuiet} href="/admin/recognitions">Back to recognitions</Link><span className={`${styles.badge} ${currentStatusClass}`}>{statusLabel(recognition.status)}</span>{recognition.featured ? <span className={`${styles.badge} ${styles.badgePending}`}>Featured</span> : null}</div>
      {notice ? <div className={styles.notice} role="status">{notice}</div> : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {expired ? <div className={styles.error} role="alert"><strong>Expired.</strong> Personal fields are cleared. Publish, restore and feature are unavailable.</div> : null}

      <section className={styles.grid}>
        <div className={`${styles.card} ${styles.col7}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Recognition fields</h2><p className={styles.cardDescription}>Edit the fields, then save. Some changes need a reason.</p></div></div>
          <div className={styles.field}><label className={styles.label} htmlFor="detail-recipient">Recipient</label><input id="detail-recipient" className={styles.input} value={draft?.recipient ?? ''} onChange={(event) => updateDraft('recipient', event.target.value)} disabled={expired} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="detail-submitted-name">Submitted name <span className={styles.privateLabel} style={{ display: 'inline', marginLeft: 6 }}>Admin only</span></label><input id="detail-submitted-name" className={styles.input} value={draft?.submittedName ?? ''} onChange={(event) => updateDraft('submittedName', event.target.value)} disabled={expired} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="detail-message">Message</label><textarea id="detail-message" className={styles.textarea} value={draft?.message ?? ''} onChange={(event) => updateDraft('message', event.target.value)} disabled={expired} /><p className={styles.fieldHint}>{graphemeLength(draft?.message ?? '')}/{MAX_MESSAGE_GRAPHEMES} characters</p></div>
          <fieldset className={styles.field} disabled={expired} style={{ border: 0, padding: 0, margin: 0 }}><legend className={styles.label}>Expressions</legend><div className={styles.expressionGrid}>{expressionCatalog.map((expression) => <label key={expression.id} className={styles.expressionChoice}><input className={styles.checkbox} type="checkbox" checked={draft?.expressionIds.includes(expression.id) ?? false} onChange={(event) => { const ids = new Set(draft?.expressionIds ?? []); if (event.target.checked) ids.add(expression.id); else ids.delete(expression.id); updateDraft('expressionIds', [...ids].sort((a, b) => a - b)); }} />{expression.phrase}</label>)}</div></fieldset>
          <div className={styles.buttonRow} style={{ marginTop: 18 }}><button className={styles.button} type="button" onClick={() => void saveEdit()} disabled={saving || expired || !fieldsChanged}>Save edit</button>{recognition.status === 'held' ? <button className={styles.buttonSecondary} type="button" onClick={() => { setAction('publish'); setReason(''); }} disabled={saving || expired}>Publish</button> : null}{recognition.status === 'hidden' || recognition.status === 'invalid' ? <button className={styles.buttonSecondary} type="button" onClick={() => { setAction('restore'); setReason(''); }} disabled={saving || expired}>Restore</button> : null}<button className={styles.buttonQuiet} type="button" onClick={() => { setAction(recognition.featured ? 'unfeature' : 'feature'); setReason(''); }} disabled={saving || expired}>{recognition.featured ? 'Remove feature' : 'Feature'}</button></div>
        </div>

        <div className={`${styles.card} ${styles.col5}`}>
          <div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Public preview</h2><p className={styles.cardDescription}>Preview the message shown on the display.</p></div></div>
          <div className={styles.preview}><p className={styles.previewKicker}>Recognized anonymously</p><h3 className={styles.previewTitle}>Thank you, {draft?.recipient || recognition.recipient}</h3><p className={styles.previewMessage}>{draft?.message || recognition.message || 'Message cleared after expiry.'}</p><div className={styles.listItemMeta}>{(draft?.expressionIds ?? recognition.expressionIds).map((expressionId) => <span key={expressionId} className={styles.badge}>{expressionCatalog.find((expression) => expression.id === expressionId)?.phrase ?? `Expression ${expressionId}`}</span>)}</div></div>
          <div style={{ marginTop: 16 }}><div className={styles.statLine}><span>Created</span><span className={styles.statValue}>{formatDateTime(recognition.createdAt)}</span></div><div className={styles.statLine}><span>First published</span><span className={styles.statValue}>{formatDateTime(recognition.firstPublishedAt)}</span></div><div className={styles.statLine}><span>Count effect</span><span className={styles.statValue}>{recognition.status === 'published' || recognition.status === 'hidden' ? 'Included' : 'None'}</span></div></div>
          <div className={styles.privatePanel} style={{ marginTop: 16 }}><p className={styles.privateLabel}>Private admin field</p><p style={{ margin: 0 }}>{recognition.submittedName || 'Cleared after expiry'}</p>{recognition.reason ? <p className={styles.fieldHint}>Hold reason: {recognition.reason}</p> : null}</div>
          <div className={styles.buttonRow} style={{ marginTop: 18 }}><button className={styles.buttonQuiet} type="button" onClick={() => { setAction('hide'); setReason(''); }} disabled={saving || expired || recognition.status === 'hidden' || recognition.status === 'invalid'}>Hide</button><button className={styles.buttonDanger} type="button" onClick={() => { setAction('invalidate'); setReason(''); }} disabled={saving || expired || recognition.status === 'invalid'}>Invalidate</button>{session?.role === 'owner' ? <button className={styles.buttonDanger} type="button" onClick={() => { setAction('delete'); setReason(''); }} disabled={saving || expired}>Permanent delete</button> : null}</div>
        </div>
      </section>

      {latest ? <section className={styles.card} style={{ marginTop: 16 }}><div className={styles.cardHeader}><div><h2 className={styles.cardTitle}>Another update needs your choice</h2><p className={styles.cardDescription}>A newer copy is available. Review it before saving.</p></div></div><div className={styles.grid}><div className={`${styles.card} ${styles.col6}`}><h3 className={styles.cardTitle}>Your unsaved draft</h3><p className={styles.listItemText}>{draft?.message}</p></div><div className={`${styles.card} ${styles.col6}`}><h3 className={styles.cardTitle}>Newer copy</h3><p className={styles.listItemText}>{latest.message}</p></div></div><div className={styles.buttonRow} style={{ marginTop: 16 }}><button className={styles.buttonSecondary} type="button" onClick={() => { if (adoptRecognition(latest)) setNotice('Loaded the newer copy. Review it, then save.'); }}>Use newer copy</button><button className={styles.button} type="button" onClick={() => { setRecognition((current) => current ? { ...current, version: latest.version } : current); setLatest(null); setNotice('Your draft is still visible. Review it, then save.'); }}>Keep my draft</button></div></section> : null}

      {action ? <ActionDialog action={action} recognition={recognition} reason={reason} onReasonChange={setReason} onCancel={cancelAction} onConfirm={() => void commitAction(action, reason || null)} busy={saving} /> : null}
    </>
  );
}

const toDraft = (recognition: AdminRecognition): EditableDraft => ({
  recipient: recognition.recipient,
  submittedName: recognition.submittedName,
  message: recognition.message,
  expressionIds: [...recognition.expressionIds],
});
