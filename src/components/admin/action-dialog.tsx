'use client';

import { useEffect, useRef } from 'react';
import type { AdminRecognition } from '@/lib/contracts';
import { actionExplanation, actionLabel, type ActionKind, countImpact } from './admin-utils';
import styles from './admin.module.css';

type ActionDialogProps = {
  action: ActionKind;
  recognition: AdminRecognition;
  reason: string;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function ActionDialog({ action, recognition, reason, onReasonChange, onCancel, onConfirm, busy = false }: ActionDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const reasonRequired = action === 'invalidate' || action === 'edit' || action === 'hide' || action === 'restore';

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onCancel]);

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <div className={styles.dialogHeader}>
          <div><p className={styles.eyebrow}>Confirm action</p><h2 id="action-dialog-title" className={styles.cardTitle}>{actionLabel(action)}</h2></div>
          <button ref={closeRef} type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close action dialog">×</button>
        </div>
        <p className={styles.sectionHint}>{actionExplanation(action, recognition)}</p>
        <div className={styles.notice}>{countImpact(recognition)}</div>
        {reasonRequired ? <div className={styles.field}><label className={styles.label} htmlFor={`${action}-reason`}>{action === 'edit' ? 'Why was this substantive edit made?' : 'Reason category'}</label><select id={`${action}-reason`} className={styles.select} value={reason} onChange={(event) => onReasonChange(event.target.value)}><option value="">Choose a reason category</option><option value="correction">Correction</option><option value="recipient_request">Recipient request</option><option value="privacy">Privacy concern</option><option value="safety">Safety concern</option><option value="spam">Spam or automated content</option><option value="duplicate">Duplicate recognition</option><option value="test">Test content</option><option value="other">Other approved moderation reason</option></select><p className={styles.fieldHint}>Choose a category only. Do not put the personal message in an admin action reason.</p></div> : null}
        {action === 'delete' ? <div className={styles.error}>Permanent deletion cannot be undone. It is separate from hiding and does not claim to erase provider backups.</div> : null}
        <div className={styles.buttonRow} style={{ justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" className={styles.buttonQuiet} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={action === 'delete' || action === 'invalidate' ? styles.buttonDanger : styles.button} onClick={onConfirm} disabled={busy || (reasonRequired && !reason.trim())}>{busy ? 'Saving...' : actionLabel(action)}</button>
        </div>
      </section>
    </div>
  );
}
