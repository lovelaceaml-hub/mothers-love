'use client';

// The pieces the recognition form is drawn from: its decorations, the expression cards, the
// bouquet, the closed notice, the public preview and the receipt. Moved out of
// SubmissionForm.tsx unchanged (Plan 35); the form itself and its rules stay there.
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, EXPRESSIONS } from '@/lib/catalog';

import baseStyles from './SubmissionForm.module.css';
import experienceStyles from './SubmissionExperience.module.css';
import { ExpressionDrift } from '@/components/campaign/ExpressionDrift';

// Retain existing bouquet and receipt animation classes.
export const styles = { ...baseStyles, ...experienceStyles };

export type ReceiptStatus = 'published' | 'held';

export type Draft = {
  submitter: string;
  recipient: string;
  message: string;
  expressionIds: number[];
};

export function DecorativeGarden() {
  return (
    <div className={styles.decorativeGarden} aria-hidden="true">
      <span className={`${styles.bubble} ${styles.bubbleBlue}`} />
      <span className={`${styles.bubble} ${styles.bubbleLavender}`} />
      <span className={`${styles.bubble} ${styles.bubbleLime}`} />
      <span className={`${styles.bubble} ${styles.bubbleCoral}`} />
      <svg className={styles.leafTop} viewBox="0 0 90 90" focusable="false">
        <path d="M78 12C47 15 23 34 19 65c21-1 42-14 59-53Z" fill="currentColor" />
        <path d="M19 65c16-13 28-24 43-39" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className={styles.leafBottom} viewBox="0 0 90 90" focusable="false">
        <path d="M12 78C15 46 34 23 65 19c-1 21-14 42-53 59Z" fill="currentColor" />
        <path d="M65 19C52 35 40 47 21 63" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={`${styles.daisy} ${styles.daisyTop}`}>
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        <b />
      </span>
      <span className={`${styles.daisy} ${styles.daisyBottom}`}>
        {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        <b />
      </span>
    </div>
  );
}

export function ExpressionScene({ id }: { id: number }) {
  return (
    <span className={styles.expressionScene} data-testid="expression-scene" data-scene-id={id} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/home-art/icon${id}.webp`} width="56" height="56" alt="" draggable="false" />
    </span>
  );
}

export function ExpressionCluster() {
  return (
    <span className={styles.expressionCluster} data-testid="expression-cluster" aria-hidden="true">
      <i />
      <b />
      <em />
      <small />
    </span>
  );
}

export function GrowingBouquet({ selected }: { selected: (typeof EXPRESSIONS)[number][] }) {
  const firstColor = selected[0]?.color ?? '#ff8e86';
  const lastColor = selected[selected.length - 1]?.color ?? '#ffd86a';
  const bouquetStyle = {
    '--bouquet-start': firstColor,
    '--bouquet-end': lastColor,
  } as CSSProperties;

  return (
    <div className={styles.bouquetWrap} data-selected-count={selected.length}>
      <div
        className={`${styles.bouquet} ${selected.length > 0 ? styles.bouquetGrowing : ''}`}
        data-testid="growing-bouquet"
        data-selected-count={selected.length}
        style={bouquetStyle}
        key={selected.map((expression) => expression.id).join('-') || 'empty'}
        aria-hidden="true"
      >
        <span className={styles.bouquetGround} />
        {selected.map((expression, index) => (
          <span
            className={`${styles.bouquetStem} ${styles[`bouquetStem${index + 1}`]}`}
            key={expression.id}
          >
            <span className={`${styles.bouquetBloom} ${styles[`bouquetBloom${expression.id}`]}`}>
              <i />
            </span>
          </span>
        ))}
      </div>
      <p className={styles.selectionCount} aria-live="polite">
        <span>{selected.length} selected</span>
        <span className={styles.bouquetStatus}>
          {selected.length > 0 ? 'Bouquet growing' : 'Your bouquet will grow here'}
        </span>
      </p>
    </div>
  );
}

export function FieldMessage({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return <p className={styles.fieldError} id={id} role="alert">{children}</p>;
}

export function ExpressionChoice({
  expression,
  selected,
  onToggle,
  error,
  disabled,
}: {
  expression: (typeof EXPRESSIONS)[number];
  selected: boolean;
  onToggle: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <article
      className={`${styles.expressionCard} ${styles[`expression${expression.id}`]} ${selected ? styles.expressionSelected : ''}`}
      data-testid={`expression-card-${expression.id}`}
    >
      <button
        className={styles.expressionSelect}
        type="button"
        // The button is named by what it shows (number, phrase, meaning and example), so a
        // person who speaks what they see names it correctly; aria-pressed carries the choice.
        aria-pressed={selected}
        aria-describedby={error ? 'expressions-error' : undefined}
        onClick={onToggle}
        disabled={disabled}
      >
        <ExpressionCluster />
        <ExpressionScene id={expression.id} />
        <span className={styles.expressionContent}>
          <span className={styles.expressionHeader}>
            <span className={styles.expressionHeading}>
              <span className={styles.expressionNumber}>{String(expression.id).padStart(2, '0')}</span>
              <span className={styles.expressionPhrase}>“{expression.phrase}”</span>
            </span>
          </span>
          <span className={styles.principleDetails} id={`expression-details-${expression.id}`}>
            <span className={styles.principle}>{expression.principle}</span>
            {expression.example && (
              <span className={styles.expressionExample}>{expression.example}</span>
            )}
          </span>
        </span>
        <span className={styles.expressionCheck} aria-hidden="true">{selected ? '✓' : ''}</span>
      </button>
    </article>
  );
}

export function Header() {
  return (
    <header className={styles.header}>
      <h1>{CAMPAIGN_TITLE}</h1>
      <h2 className={styles.pageTitle}>Share a<br className={styles.desktopBreak} /> recognition</h2>
      <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
      <ExpressionDrift className={styles.headerExpressions} />
      <div className={styles.headerArt} aria-hidden="true">
        <span />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home-art/community.webp" alt="" width="1000" height="340" draggable="false" />
      </div>
      <p className={styles.invitation}>A small word of encouragement.</p>
    </header>
  );
}

export function ClosedState({ configured }: { configured: boolean }) {
  return (
    <section className={styles.closedCard} aria-labelledby="collection-closed-title">
      <div className={styles.closedMark} aria-hidden="true">
        <span />
        <span />
      </div>
      <p className={styles.cardEyebrow}>Mother’s Love</p>
      <h2 id="collection-closed-title">Recognition sharing is paused</h2>
      <p>
        {configured
          ? 'The campaign is taking a quiet moment. Please check back soon to share your recognition.'
          : 'This campaign is not ready to receive recognitions yet. Please check back soon.'}
      </p>
      <div className={styles.guideLinks}>
        <Link className={styles.textLink} href="/expressions">Explore the nine expressions and everyday examples</Link>
        <Link className={styles.textLink} href="/privacy">Read how recognition sharing works</Link>
      </div>
    </section>
  );
}

export function Preview({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  // Close the native modal while it is still connected. Removing an open
  // dialog first leaves the browser unable to restore focus to its trigger.
  function dismissPreview() {
    dialogRef.current?.close();
    onClose();
  }
  const selected = EXPRESSIONS.filter((expression) => draft.expressionIds.includes(expression.id));

  return (
    <dialog ref={dialogRef} className={styles.previewPanel} aria-labelledby="preview-title" onCancel={(event) => { event.preventDefault(); dismissPreview(); }}>
      <section role="region" aria-labelledby="preview-title">
      <div className={styles.previewHeader}>
        <div>
          <p className={styles.cardEyebrow}>Public preview</p>
          <h2 id="preview-title">This is what people may see</h2>
        </div>
        <button className={styles.closeButton} type="button" onClick={dismissPreview} aria-label="Close public preview">×</button>
      </div>
      <div className={styles.previewBubble}>
        <p className={styles.previewRecipient}>THANK YOU, {draft.recipient.trim()}</p>
        <p className={styles.previewMessage}>{draft.message.trim()}</p>
        <ul className={styles.previewExpressions} aria-label="Selected expressions">
          {selected.map((expression) => <li key={expression.id}>{expression.phrase}</li>)}
        </ul>
        <p className={styles.previewNote}>Your name is not shown here.</p>
      </div>
      </section>
    </dialog>
  );
}

export function Receipt({ status, onReset }: { status: ReceiptStatus; onReset: () => void }) {
  const held = status === 'held';
  const receiptRef = useRef<HTMLElement>(null);
  useEffect(() => { receiptRef.current?.focus(); }, []);

  return (
    <section className={`${styles.receiptCard} ${held ? styles.receiptHeld : styles.receiptPublished}`} aria-labelledby="receipt-title" data-testid="submission-receipt" ref={receiptRef} tabIndex={-1}>
      <div className={styles.seedJourney} data-testid="seed-journey" aria-hidden="true">
        <span className={styles.seedOrbit} data-testid="seed-orbit">
          <span className={styles.seed} />
          <span className={styles.seedLeaf} />
        </span>
        <span className={styles.seedTrail} data-testid="seed-trail" />
        <span className={styles.seedGarden} data-testid="seed-garden">
          <i />
          <b />
        </span>
      </div>
      <p className={styles.cardEyebrow}>{held ? 'Received for review' : 'Recognition received'}</p>
      <h2 id="receipt-title">Thank you for sharing Mother&apos;s Love.</h2>
      <p>
        {held
          ? 'Your recognition has been received. Some messages are reviewed before appearing. It is not on the home page or TV yet.'
          : 'Your recognition has been received and is ready to appear on the home page and TV.'}
      </p>
      <p className={styles.receiptJourneyNote}>
        {held
          ? 'Your thank-you seed is resting safely while it is reviewed.'
          : 'Your thank-you seed is floating toward the recognition garden.'}
      </p>
      <button className={styles.secondaryButton} type="button" onClick={onReset}>Recognize Someone Else</button>
    </section>
  );
}
