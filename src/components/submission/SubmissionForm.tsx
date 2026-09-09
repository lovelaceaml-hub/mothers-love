'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';

import { api } from '@/lib/client-api';
import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, EXPRESSIONS } from '@/lib/catalog';
import { countGraphemes, isFirstNameLastInitial, MAX_NAME_GRAPHEMES } from '@/lib/name-validation';
import { CompactPublicFeed } from '@/components/feed/PublicFeedProvider';

import styles from './SubmissionForm.module.css';

export { countGraphemes, isFirstNameLastInitial };

type ConfigResponse = { collectionOpen: boolean; configured: boolean };
type ReceiptStatus = 'published' | 'held';
type ViewState = 'editing' | 'sending' | 'unconfirmed' | 'published' | 'held';
type FieldName = 'submitter' | 'recipient' | 'expressions' | 'message';

type FieldErrors = Partial<Record<FieldName, string>>;

type Draft = {
  submitter: string;
  recipient: string;
  message: string;
  expressionIds: number[];
};

type SubmitResponse = {
  id: string;
  status: ReceiptStatus;
  expiresAt: string;
};

type ApiLikeError = Error & {
  code?: string;
  status?: number;
};

const MAX_MESSAGE_GRAPHEMES = 500;

function makeRequestKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `recognition-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getValidationErrors(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};
  const submitter = draft.submitter.trim();
  const recipient = draft.recipient.trim();
  const message = draft.message.trim();

  if (!submitter) {
    errors.submitter = 'Enter your first name and last initial.';
  } else if (countGraphemes(submitter) > MAX_NAME_GRAPHEMES) {
    errors.submitter = `Your name must be ${MAX_NAME_GRAPHEMES} characters or fewer.`;
  } else if (!isFirstNameLastInitial(submitter)) {
    errors.submitter = 'Use your first name and last initial, such as Maya R.';
  }

  if (!recipient) {
    errors.recipient = 'Enter the recipient’s first name and last initial.';
  } else if (countGraphemes(recipient) > MAX_NAME_GRAPHEMES) {
    errors.recipient = `The recipient name must be ${MAX_NAME_GRAPHEMES} characters or fewer.`;
  } else if (!isFirstNameLastInitial(recipient)) {
    errors.recipient = 'Use a first name and last initial, such as Michelle R.';
  }

  if (draft.expressionIds.length === 0) {
    errors.expressions = 'Select at least one expression.';
  }

  if (!message) {
    errors.message = 'Write a message before sending your recognition.';
  } else if (countGraphemes(message) > MAX_MESSAGE_GRAPHEMES) {
    errors.message = `Your message must be ${MAX_MESSAGE_GRAPHEMES} characters or fewer.`;
  }

  return errors;
}

function errorStatus(error: unknown) {
  const candidate = error as ApiLikeError;
  return typeof candidate.status === 'number' ? candidate.status : undefined;
}

function errorCode(error: unknown) {
  const candidate = error as ApiLikeError;
  return typeof candidate.code === 'string' ? candidate.code.toLowerCase() : '';
}

function isCollectionUnavailable(error: unknown) {
  const status = errorStatus(error);
  const code = errorCode(error);
  return status === 503 || code === 'unavailable' || code === 'collection_closed';
}

function isUnconfirmed(error: unknown) {
  const status = errorStatus(error);
  const code = errorCode(error);
  return status === undefined || code === 'network_error' || code === 'timeout';
}

function statusLabel(viewState: ViewState) {
  switch (viewState) {
    case 'sending':
      return 'Sending your recognition…';
    case 'unconfirmed':
      return 'The response was not confirmed. Your entries are still here.';
    default:
      return '';
  }
}

function DecorativeGarden() {
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

function FieldMessage({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return <p className={styles.fieldError} id={id} role="alert">{children}</p>;
}

function ExpressionChoice({
  expression,
  selected,
  onToggle,
  error,
}: {
  expression: (typeof EXPRESSIONS)[number];
  selected: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <article className={`${styles.expressionCard} ${styles[`expression${expression.id}`]} ${selected ? styles.expressionSelected : ''}`}>
      <div className={styles.expressionHeader}>
        <div className={styles.expressionHeading}>
          <span className={styles.expressionNumber}>{String(expression.id).padStart(2, '0')}</span>
          <span className={styles.expressionPhrase}>“{expression.phrase}”</span>
        </div>
        <button
          className={styles.expressionSelect}
          type="button"
          aria-label={`${selected ? 'Selected' : 'Select'} expression ${String(expression.id).padStart(2, '0')}: “${expression.phrase}”`}
          aria-pressed={selected}
          aria-describedby={error ? 'expressions-error' : undefined}
          onClick={onToggle}
        >
          <span className={styles.expressionCheck} aria-hidden="true">{selected ? '✓' : ''}</span>
        </button>
      </div>
      <div className={styles.principleDetails}>
        <p className={styles.principle}>{expression.principle}</p>
        {expression.example && (
          <p className={styles.expressionExample}>{expression.example}</p>
        )}
      </div>
    </article>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <Link className={styles.backLink} href="/">Back to live recognitions</Link>
      <p className={styles.kicker}>A small word of encouragement</p>
      <h1>{CAMPAIGN_TITLE}</h1>
      <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
    </header>
  );
}

function ClosedState({ configured }: { configured: boolean }) {
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

function Preview({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const selected = EXPRESSIONS.filter((expression) => draft.expressionIds.includes(expression.id));

  return (
    <section className={styles.previewPanel} aria-labelledby="preview-title">
      <div className={styles.previewHeader}>
        <div>
          <p className={styles.cardEyebrow}>Public preview</p>
          <h2 id="preview-title">This is what people may see</h2>
        </div>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Close public preview">×</button>
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
  );
}

function Receipt({ status, onReset }: { status: ReceiptStatus; onReset: () => void }) {
  const held = status === 'held';

  return (
    <section className={`${styles.receiptCard} ${held ? styles.receiptHeld : styles.receiptPublished}`} aria-labelledby="receipt-title">
      <div className={styles.receiptFlower} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <b />
      </div>
      <p className={styles.cardEyebrow}>{held ? 'Received for review' : 'Recognition received'}</p>
      <h2 id="receipt-title">Thank you for sharing Mother&apos;s Love.</h2>
      <p>
        {held
          ? 'Your recognition has been received. Some messages are reviewed before appearing.'
          : 'Your recognition has been received and is ready to appear on the home page and TV.'}
      </p>
      <button className={styles.secondaryButton} type="button" onClick={onReset}>Recognize Someone Else</button>
    </section>
  );
}

export function SubmissionForm() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [configError, setConfigError] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('editing');
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus | null>(null);
  const [draft, setDraft] = useState<Draft>({ submitter: '', recipient: '', message: '', expressionIds: [] });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [requestKey, setRequestKey] = useState(makeRequestKey);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const submitterRef = useRef<HTMLInputElement>(null);
  const recipientRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    api<ConfigResponse>('/api/config')
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch(() => {
        if (active) setConfigError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [fieldErrors]);

  const selectedExpressions = useMemo(
    () => EXPRESSIONS.filter((expression) => draft.expressionIds.includes(expression.id)),
    [draft.expressionIds],
  );

  function updateDraft(field: 'submitter' | 'recipient' | 'message', value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmissionError('');
    if (viewState === 'unconfirmed') {
      setViewState('editing');
      setRequestKey(makeRequestKey());
    }
  }

  function toggleExpression(id: number) {
    setDraft((current) => {
      const expressionIds = current.expressionIds.includes(id)
        ? current.expressionIds.filter((expressionId) => expressionId !== id)
        : [...current.expressionIds, id].sort((a, b) => a - b);
      return { ...current, expressionIds };
    });
    setFieldErrors((current) => {
      if (!current.expressions) return current;
      const next = { ...current };
      delete next.expressions;
      return next;
    });
    setSubmissionError('');
    if (viewState === 'unconfirmed') {
      setViewState('editing');
      setRequestKey(makeRequestKey());
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (viewState === 'sending') return;

    const errors = getValidationErrors(draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShowPreview(false);
      return;
    }

    setFieldErrors({});
    setSubmissionError('');
    setViewState('sending');

    try {
      const result = await api<SubmitResponse>('/api/recognitions', {
        method: 'POST',
        body: JSON.stringify({
          submittedName: draft.submitter.trim(),
          recipient: draft.recipient.trim(),
          message: draft.message.trim(),
          expressionIds: draft.expressionIds,
          requestKey,
        }),
      });
      setReceiptStatus(result.status);
      setViewState(result.status);
    } catch (error) {
      if (isCollectionUnavailable(error)) {
        setSubmissionError('Recognition sharing is paused right now. Your entries are still here.');
        setViewState('unconfirmed');
      } else if (isUnconfirmed(error)) {
        setSubmissionError('We could not confirm the response. You can safely retry with the same entries.');
        setViewState('unconfirmed');
      } else {
        setSubmissionError(error instanceof Error ? error.message : 'We could not send your recognition. Please try again.');
        setViewState('editing');
      }
    }
  }

  function resetForm() {
    setDraft({ submitter: '', recipient: '', message: '', expressionIds: [] });
    setFieldErrors({});
    setSubmissionError('');
    setReceiptStatus(null);
    setViewState('editing');
    setShowPreview(false);
    setRequestKey(makeRequestKey());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function focusField(field: FieldName) {
    if (field === 'submitter') submitterRef.current?.focus();
    if (field === 'recipient') recipientRef.current?.focus();
    if (field === 'message') messageRef.current?.focus();
  }

  const formError = fieldErrors.submitter || fieldErrors.recipient || fieldErrors.expressions || fieldErrors.message;
  const showLoading = !config && !configError;
  const showClosed = configError || (config && (!config.configured || !config.collectionOpen));
  const showReceipt = receiptStatus && (viewState === 'published' || viewState === 'held');

  return (
    <main className={styles.page}>
      <DecorativeGarden />
      <div className={styles.shell}>
        <Header />
        <CompactPublicFeed />

        {showLoading && (
          <section className={styles.loadingCard} aria-live="polite" aria-busy="true">
            <span className={styles.loadingDot} />
            <p>Checking whether recognition sharing is open…</p>
          </section>
        )}

        {showClosed && <ClosedState configured={Boolean(config?.configured && !configError)} />}

        {showReceipt && receiptStatus && <Receipt status={receiptStatus} onReset={resetForm} />}

        {!showLoading && !showClosed && !showReceipt && (
          <>
            <form className={styles.formCard} onSubmit={submit} noValidate>
              <div className={styles.privateCallout}>
                <span className={styles.privateIcon} aria-hidden="true"><span /></span>
                <p><strong>Your name stays private.</strong> It is visible only to campaign administrators. The recipient, expressions, and message appear on the home page and TV.</p>
              </div>

              {formError && (
                <div className={styles.errorSummary} ref={errorSummaryRef} tabIndex={-1} role="alert" aria-live="assertive">
                  <strong>Check your recognition</strong>
                  <p>{formError}</p>
                  {fieldErrors.submitter && <button type="button" onClick={() => focusField('submitter')}>Go to your name</button>}
                  {!fieldErrors.submitter && fieldErrors.recipient && <button type="button" onClick={() => focusField('recipient')}>Go to recipient</button>}
                  {!fieldErrors.submitter && !fieldErrors.recipient && fieldErrors.message && <button type="button" onClick={() => focusField('message')}>Go to message</button>}
                </div>
              )}

              <div className={styles.formSection}>
                <label className={styles.label} htmlFor="submitter">Your name</label>
                <p className={styles.helper} id="submitter-help">First name and last initial.</p>
                <input
                  ref={submitterRef}
                  className={styles.textInput}
                  id="submitter"
                  name="submitter"
                  type="text"
                  autoComplete="name"
                  value={draft.submitter}
                  onChange={(event) => updateDraft('submitter', event.target.value)}
                  placeholder="First name + last initial"
                  aria-invalid={Boolean(fieldErrors.submitter)}
                  aria-describedby={fieldErrors.submitter ? 'submitter-help submitter-error' : 'submitter-help'}
                />
                <FieldMessage id="submitter-error">{fieldErrors.submitter}</FieldMessage>
              </div>

              <div className={styles.formSection}>
                <label className={styles.label} htmlFor="recipient">Who would you like to recognize?</label>
                <p className={styles.helper} id="recipient-help">Enter their first name and last initial.</p>
                <input
                  ref={recipientRef}
                  className={styles.textInput}
                  id="recipient"
                  name="recipient"
                  type="text"
                  value={draft.recipient}
                  onChange={(event) => updateDraft('recipient', event.target.value)}
                  placeholder="For example, Michelle R."
                  aria-invalid={Boolean(fieldErrors.recipient)}
                  aria-describedby={fieldErrors.recipient ? 'recipient-help recipient-error' : 'recipient-help'}
                />
                <FieldMessage id="recipient-error">{fieldErrors.recipient}</FieldMessage>
              </div>

              <fieldset className={`${styles.formSection} ${styles.expressionFieldset}`} aria-describedby={fieldErrors.expressions ? 'expressions-help expressions-error' : 'expressions-help'}>
                <legend className={styles.label}>Which expression(s) did they practice?</legend>
                <p className={styles.helper} id="expressions-help">Select one or more. Each phrase keeps its full meaning.</p>
                <div className={styles.expressionGrid}>
                  {EXPRESSIONS.map((expression) => (
                    <ExpressionChoice
                      key={expression.id}
                      expression={expression}
                      selected={draft.expressionIds.includes(expression.id)}
                      onToggle={() => toggleExpression(expression.id)}
                      error={fieldErrors.expressions}
                    />
                  ))}
                </div>
                <FieldMessage id="expressions-error">{fieldErrors.expressions}</FieldMessage>
                <p className={styles.selectionCount} aria-live="polite">{selectedExpressions.length} selected</p>
              </fieldset>

              <div className={styles.formSection}>
                <label className={styles.label} htmlFor="message">Share your appreciation</label>
                <p className={styles.helper} id="message-help">Write a message of thanks. Leave out contact information and private details.</p>
                <textarea
                  ref={messageRef}
                  className={styles.messageInput}
                  id="message"
                  name="message"
                  value={draft.message}
                  onChange={(event) => updateDraft('message', event.target.value)}
                  placeholder="What did they do, and how did it encourage you?"
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'message-help message-error message-count' : 'message-help message-count'}
                />
                <div className={styles.counter} id="message-count"><span>{countGraphemes(draft.message)}</span> / {MAX_MESSAGE_GRAPHEMES} characters</div>
                <FieldMessage id="message-error">{fieldErrors.message}</FieldMessage>
              </div>

              {submissionError && (
                <div className={styles.submissionError} role="alert" aria-live="assertive">
                  <strong>{viewState === 'unconfirmed' ? 'Your recognition is not confirmed yet.' : 'We could not send your recognition.'}</strong>
                  <p>{submissionError}</p>
                  {viewState === 'unconfirmed' && <p className={styles.retryHint}>Your entries stay here. Retry when you are ready.</p>}
                </div>
              )}

              <div className={styles.actions}>
                <button className={styles.previewButton} type="button" onClick={() => setShowPreview(true)} disabled={!draft.recipient.trim() || !draft.message.trim() || selectedExpressions.length === 0}>Preview public message</button>
                <button className={styles.submitButton} type="submit" disabled={viewState === 'sending'}>
                  {viewState === 'sending' ? 'Sending…' : viewState === 'unconfirmed' ? 'Retry recognition' : 'Send recognition'}
                  <span className={styles.submitHeart} aria-hidden="true" />
                </button>
              </div>

            </form>
            <div className={styles.footerLinks}>
              <Link href="/expressions">Explore the nine expressions and everyday examples</Link>
              <Link href="/privacy">Read the privacy details</Link>
            </div>
          </>
        )}

        {showPreview && !showReceipt && <Preview draft={draft} onClose={() => setShowPreview(false)} />}
        {viewState === 'sending' && <p className={styles.srOnly} role="status">{statusLabel(viewState)}</p>}
      </div>
    </main>
  );
}
