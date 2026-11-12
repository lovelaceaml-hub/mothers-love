'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';

import { api } from '@/lib/client-api';
import { EXPRESSIONS } from '@/lib/catalog';
import { takeEarlyRead } from '@/lib/early-read';
import { countGraphemes, hasVisibleNameContent, MAX_NAME_GRAPHEMES } from '@/lib/name-validation';
import {
  clearRecognitionDraft,
  loadRecognitionDraft,
  recognitionDraftStorage,
  saveRecognitionDraft,
} from '@/lib/recognition-draft';

import { RecentRecognitions } from '@/components/feed/FeedHome';
import {
  ClosedState,
  DecorativeGarden,
  ExpressionChoice,
  FieldMessage,
  GrowingBouquet,
  Header,
  Preview,
  Receipt,
  styles,
} from './SubmissionFormParts';
import type { Draft, ReceiptStatus } from './SubmissionFormParts';

export { countGraphemes, hasVisibleNameContent };

type ConfigResponse = { collectionOpen: boolean; configured: boolean };
type ViewState = 'editing' | 'sending' | 'unconfirmed' | 'published' | 'held';
type FieldName = 'submitter' | 'recipient' | 'expressions' | 'message';

type FieldErrors = Partial<Record<FieldName, string>>;

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
const EXPRESSION_IDS = EXPRESSIONS.map((expression) => expression.id);
const UNCONFIRMED_MESSAGE = 'We could not confirm the response. You can safely retry with the same entries.';

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

  if (!hasVisibleNameContent(submitter)) {
    errors.submitter = 'Enter your name.';
  } else if (countGraphemes(submitter) > MAX_NAME_GRAPHEMES) {
    errors.submitter = `Your name must be ${MAX_NAME_GRAPHEMES} characters or fewer.`;
  }

  if (!hasVisibleNameContent(recipient)) {
    errors.recipient = 'Enter the recipient name.';
  } else if (countGraphemes(recipient) > MAX_NAME_GRAPHEMES) {
    errors.recipient = `The recipient name must be ${MAX_NAME_GRAPHEMES} characters or fewer.`;
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

function isConfigResponse(value: unknown): value is ConfigResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.collectionOpen === 'boolean' && typeof candidate.configured === 'boolean';
}

// The page's HTML may already have asked whether sharing is open (src/lib/early-read.ts).
// That answer is used once when it is a clear yes or no; anything else asks again as before.
async function readConfig(): Promise<ConfigResponse> {
  const early = takeEarlyRead('config', typeof performance === 'undefined' ? 0 : performance.now());
  if (early) {
    try {
      const response = await early.response;
      if (response.ok) {
        const value: unknown = await response.json();
        if (isConfigResponse(value)) return value;
      }
    } catch {
      // Fall through to a normal read.
    }
  }
  return api<ConfigResponse>('/api/config', { auth: false });
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

export function SubmissionForm() {
  const [motionPaused, setMotionPaused] = useState(false);
  const sendingRef = useRef(false);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [configError, setConfigError] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('editing');
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus | null>(null);
  const [draft, setDraft] = useState<Draft>({ submitter: '', recipient: '', message: '', expressionIds: [] });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [requestKey, setRequestKey] = useState(makeRequestKey);
  // Unfinished entries are kept in this tab until they are sent (src/lib/recognition-draft.ts).
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const submitterRef = useRef<HTMLInputElement>(null);
  const recipientRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let active = true;
    readConfig()
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

  // After the first render (so the server's page and the browser's agree), bring back what
  // this person was writing in this tab. A send whose answer never arrived comes back as
  // "not confirmed" with its own duplicate guard, so a retry cannot publish it twice.
  useEffect(() => {
    const stored = loadRecognitionDraft(recognitionDraftStorage(), Date.now(), EXPRESSION_IDS);
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved draft is restored after the first render, so server and browser draw the same first page
      setDraft(stored.draft);
      setRequestKey(stored.requestKey);
      setDraftRestored(true);
      if (stored.sendAttempted) {
        setSubmissionError(UNCONFIRMED_MESSAGE);
        setViewState('unconfirmed');
      }
    }
    setDraftStorageReady(true);
  }, []);

  useEffect(() => {
    if (!draftStorageReady) return;
    const storage = recognitionDraftStorage();
    if (viewState === 'published' || viewState === 'held') {
      clearRecognitionDraft(storage);
      return;
    }
    saveRecognitionDraft(storage, {
      draft,
      requestKey,
      sendAttempted: viewState === 'sending' || viewState === 'unconfirmed',
    }, Date.now());
  }, [draft, draftStorageReady, requestKey, viewState]);

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
    if (sendingRef.current || viewState === 'sending') return;

    const errors = getValidationErrors(draft);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShowPreview(false);
      return;
    }

    setFieldErrors({});
    setSubmissionError('');
    sendingRef.current = true;
    setViewState('sending');

    try {
      const result = await api<SubmitResponse>('/api/recognitions', {
        method: 'POST',
        // Sharing needs no account; without this the form would download the sign-in library.
        auth: false,
        body: JSON.stringify({
          submittedName: draft.submitter.trim(),
          recipient: draft.recipient.trim(),
          message: draft.message.trim(),
          expressionIds: draft.expressionIds,
          requestKey,
        }),
      });
      // HTTP success alone is not confirmation of receipt or publication.
      if (!result || typeof result.id !== 'string' || !result.id ||
          !['published', 'held'].includes(result.status) ||
          typeof result.expiresAt !== 'string' || !Number.isFinite(Date.parse(result.expiresAt))) {
        throw new Error('We could not confirm the response.');
      }
      setShowPreview(false);
      setDraftRestored(false);
      setReceiptStatus(result.status);
      setViewState(result.status);
    } catch (error) {
      if (isCollectionUnavailable(error)) {
        setSubmissionError('Recognition sharing is paused right now. Your entries are still here.');
        setViewState('unconfirmed');
      } else if (isUnconfirmed(error)) {
        setSubmissionError(UNCONFIRMED_MESSAGE);
        setViewState('unconfirmed');
      } else {
        setSubmissionError(error instanceof Error ? error.message : 'We could not send your recognition. Please try again.');
        setViewState('editing');
      }
    } finally {
      sendingRef.current = false;
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
    setDraftRestored(false);
    clearRecognitionDraft(recognitionDraftStorage());
    window.scrollTo({ top: 0, behavior: motionPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function closePreview() {
    setShowPreview(false);
    // Explicitly return to the trigger for pointer users as well as keyboards.
    previewTriggerRef.current?.focus({ preventScroll: true });
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
    <main className={styles.page} data-submission-experience data-motion-paused={motionPaused}>
      <DecorativeGarden />
      <nav className={styles.topbar} aria-label="Recognition navigation">
        <Link className={styles.backLink} href="/"><span aria-hidden="true">←</span>Back to live recognitions</Link>
        <button className={styles.motionToggle} type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>{motionPaused ? 'Resume animation' : 'Pause animation'}</button>
      </nav>
      <div className={styles.shell}>
        <Header />
        <div className={styles.formColumn}>

        {showLoading && (
          <section className={styles.loadingCard} aria-live="polite" aria-busy="true">
            <span className={styles.loadingDot} />
            <p>Checking whether recognition sharing is open…</p>
          </section>
        )}

        {showClosed && <ClosedState configured={Boolean(config?.configured && !configError)} />}

        {showReceipt && receiptStatus && (
          <>
            <Receipt status={receiptStatus} onReset={resetForm} />
            <RecentRecognitions embedded />
          </>
        )}

        {!showLoading && !showClosed && !showReceipt && (
          <>
            <form className={styles.formCard} onSubmit={submit} noValidate aria-busy={viewState === 'sending'}>
              <div className={styles.sectionIntro}><span>01</span><h2>A kindness worth recognizing</h2></div>
              <div className={styles.privateCallout}>
                <span className={styles.privateIcon} aria-hidden="true"><span /></span>
                <p><strong>Your name stays private.</strong> It is visible only to campaign administrators. The recipient, expressions, and message appear on the home page and TV.</p>
              </div>

              {draftRestored && (
                <div className={styles.draftNote} role="status" data-testid="draft-restored">
                  <p>Your unfinished recognition is still here.</p>
                  <button type="button" onClick={resetForm} disabled={viewState === 'sending'}>Start over</button>
                </div>
              )}

              {formError && (
                <div className={styles.errorSummary} ref={errorSummaryRef} tabIndex={-1} role="alert" aria-live="assertive">
                  <strong>Check your recognition</strong>
                  <p>{formError}</p>
                  {fieldErrors.submitter && <button type="button" onClick={() => focusField('submitter')}>Go to your name</button>}
                  {!fieldErrors.submitter && fieldErrors.recipient && <button type="button" onClick={() => focusField('recipient')}>Go to recipient</button>}
                  {!fieldErrors.submitter && !fieldErrors.recipient && fieldErrors.message && <button type="button" onClick={() => focusField('message')}>Go to message</button>}
                </div>
              )}

              <div className={styles.nameFields}>
              <div className={styles.formSection}>
                <label className={styles.label} htmlFor="submitter">Your name</label>
                <input
                  ref={submitterRef}
                  className={styles.textInput}
                  id="submitter"
                  name="submitter"
                  type="text"
                  disabled={viewState === 'sending'}
                  autoComplete="name"
                  value={draft.submitter}
                  onChange={(event) => updateDraft('submitter', event.target.value)}
                  placeholder="For example, Michelle, Maya Rodriguez, Mo, B. Daniel, S. Grace L., or D. Kim"
                  aria-invalid={Boolean(fieldErrors.submitter)}
                  aria-describedby={fieldErrors.submitter ? 'submitter-error' : undefined}
                />
                <FieldMessage id="submitter-error">{fieldErrors.submitter}</FieldMessage>
              </div>

              <div className={styles.formSection}>
                <label className={styles.label} htmlFor="recipient">Who would you like to recognize?</label>
                <input
                  ref={recipientRef}
                  className={styles.textInput}
                  id="recipient"
                  name="recipient"
                  type="text"
                  disabled={viewState === 'sending'}
                  value={draft.recipient}
                  onChange={(event) => updateDraft('recipient', event.target.value)}
                  placeholder="For example, Michelle, Maya Rodriguez, Mo, B. Daniel, S. Grace L., or D. Kim"
                  aria-invalid={Boolean(fieldErrors.recipient)}
                  aria-describedby={fieldErrors.recipient ? 'recipient-error' : undefined}
                />
                <FieldMessage id="recipient-error">{fieldErrors.recipient}</FieldMessage>
              </div>

              </div>
              <fieldset className={`${styles.formSection} ${styles.expressionFieldset}`} aria-describedby={fieldErrors.expressions ? 'expressions-help expressions-error' : 'expressions-help'}>
                <legend className={styles.label}><span className={styles.sectionNumber}>02</span>Which expression(s) did they practice?</legend>
                <p className={styles.helper} id="expressions-help">Select one or more. Each phrase keeps its full meaning.</p>
                <div className={styles.expressionGrid} data-testid="expression-grid">
                  {EXPRESSIONS.map((expression) => (
                    <ExpressionChoice
                      key={expression.id}
                      expression={expression}
                      selected={draft.expressionIds.includes(expression.id)}
                      onToggle={() => toggleExpression(expression.id)}
                      error={fieldErrors.expressions}
                      disabled={viewState === 'sending'}
                    />
                  ))}
                </div>
                <FieldMessage id="expressions-error">{fieldErrors.expressions}</FieldMessage>
                <GrowingBouquet selected={selectedExpressions} />
              </fieldset>

              <div className={styles.formSection}>
                <label className={styles.label} htmlFor="message"><span className={styles.sectionNumber} aria-hidden="true">03</span>Share your appreciation</label>
                <p className={styles.helper} id="message-help">Write a message of thanks. Leave out contact information and private details.</p>
                <textarea
                  ref={messageRef}
                  className={styles.messageInput}
                  id="message"
                  name="message"
                  disabled={viewState === 'sending'}
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
                <button ref={previewTriggerRef} className={styles.previewButton} type="button" onClick={() => setShowPreview(true)} disabled={viewState === 'sending' || !draft.recipient.trim() || !draft.message.trim() || selectedExpressions.length === 0}>Preview public message</button>
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

        {showPreview && !showReceipt && <Preview draft={draft} onClose={closePreview} />}
        {viewState === 'sending' && <p className={styles.srOnly} role="status">{statusLabel(viewState)}</p>}
        </div>
      </div>
    </main>
  );
}
