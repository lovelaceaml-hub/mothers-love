'use client';

import { FormEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import QRCode from 'qrcode';

import { EXPRESSIONS, TAGLINE, TITLE } from '@/lib/catalog';
import type { DisplaySnapshot, Recognition } from '@/lib/contracts';
import { api } from '@/lib/client-api';

import {
  createInitialState,
  displayReducer,
  effectiveMotion,
  isGroupedArrival,
  selectCluster,
  selectEligible,
  selectFeatured,
  selectGarden,
  type PresentationState,
} from '@/lib/display/coordinator';

import styles from './DisplayExperience.module.css';

const expressionMap = new Map(EXPRESSIONS.map((expression) => [expression.id, expression]));

function expression(id: number) {
  return expressionMap.get(id) ?? EXPRESSIONS[0];
}

function QrImage({ src }: { src: string }) {
  // QR codes are generated as local data URLs, so Next image optimization does not apply.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" />;
}

function formatPeriod(periodStart?: string): string {
  if (!periodStart) return 'Current month';
  const date = new Date(periodStart);
  if (Number.isNaN(date.valueOf())) return 'Current month';
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

function shortExcerpt(message: string, limit = 150): { text: string; excerpt: boolean } {
  if (message.length <= limit) return { text: message, excerpt: false };
  return { text: `${message.slice(0, limit).trimEnd()}…`, excerpt: true };
}

function isUnauthorized(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; code?: string };
  return candidate.status === 401 || candidate.code === 'UNAUTHORIZED';
}

function snapshotRequestPath(cursor: string | null): string {
  return cursor ? `/api/display/snapshot?after=${encodeURIComponent(cursor)}` : '/api/display/snapshot';
}

function PairingPanel({ onPair, pending, error }: { onPair: (code: string) => void; pending: boolean; error: string }) {
  const [code, setCode] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onPair(code.trim());
  };
  return (
    <main className={styles.pairingPage} aria-labelledby="pairing-title">
      <div className={styles.pairingDecor} aria-hidden="true">
        <span className={styles.decorBubbleBlue} />
        <span className={styles.decorBubbleYellow} />
        <span className={styles.decorLeaf} />
      </div>
      <section className={styles.pairingCard}>
        <p className={styles.eyebrow}>THE WORDS OF MOTHER&apos;S LOVE</p>
        <h1 id="pairing-title">Bring the living wall to life.</h1>
        <p className={styles.tagline}>Where a mother&apos;s love resides, peace abides.</p>
        <p className={styles.pairingCopy}>
          Enter the one-time display code created by the campaign owner. This screen stays private until the display is paired.
        </p>
        <form className={styles.pairingForm} onSubmit={submit}>
          <label htmlFor="display-code">Display code</label>
          <input
            id="display-code"
            name="code"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^0-9A-HJKMNP-TV-Z]/g, '').slice(0, 8))}
            placeholder="Enter your code"
            aria-describedby={error ? 'pairing-error' : 'pairing-help'}
            disabled={pending}
          />
          <span id="pairing-help" className={styles.fieldHint}>The code expires after a short time.</span>
          {error ? <p id="pairing-error" className={styles.formError} role="alert">{error}</p> : null}
          <button type="submit" disabled={pending || code.trim().length !== 8}>
            {pending ? 'Connecting…' : 'Connect this display'}
          </button>
        </form>
      </section>
    </main>
  );
}

function ExpressionPill({ id }: { id: number }) {
  const item = expression(id);
  return <span className={styles.expressionPill} style={{ backgroundColor: item.color }}>{item.phrase}</span>;
}

function RecognitionCard({ recognition, detailed = false, fresh = false }: { recognition: Recognition; detailed?: boolean; fresh?: boolean }) {
  const excerpt = shortExcerpt(recognition.message, detailed ? 650 : 150);
  return (
    <article className={`${styles.recognitionCard} ${detailed ? styles.recognitionCardDetailed : ''} ${fresh ? styles.recognitionFresh : ''}`}>
      {fresh ? <span className={styles.freshLabel}>New recognition</span> : null}
      <p className={styles.recipientLabel}>THANK YOU,</p>
      <h3>{recognition.recipient}</h3>
      <div className={styles.expressionList} aria-label="Expressions selected">
        {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
      </div>
      <p className={styles.recognitionMessage}>{excerpt.text}</p>
      {excerpt.excerpt ? <p className={styles.excerptNote}>Garden excerpt, full message follows in the reading view.</p> : null}
    </article>
  );
}

function Atmosphere() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <span className={styles.atmosphereOrbOne} />
      <span className={styles.atmosphereOrbTwo} />
      <span className={styles.atmosphereOrbThree} />
      <span className={styles.atmosphereDaisy} />
    </div>
  );
}

function QrDock({ url, inviting }: { url: string; inviting: boolean }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(url, { margin: 1, width: 180, color: { dark: '#303342', light: '#fffdf6' } })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [url]);
  const qrImage = qrDataUrl ? <QrImage src={qrDataUrl} /> : <span className={styles.qrLoading}>QR</span>;
  return (
    <aside className={`${styles.qrDock} ${inviting ? styles.qrInviting : ''}`} aria-label="Share a recognition">
      <div className={styles.qrGraphic}>{qrImage}</div>
      <div className={styles.qrCopy}>
        {inviting ? <p className={styles.qrQuestion}>Who encouraged you today?</p> : null}
        <strong>Recognize someone</strong>
        <span>Scan to share Mother&apos;s Love</span>
      </div>
    </aside>
  );
}

function GardenScreen({ state, inviting }: { state: PresentationState; inviting: boolean }) {
  const records = selectGarden(state);
  const positions = ['gardenPositionOne', 'gardenPositionTwo', 'gardenPositionThree', 'gardenPositionFour', 'gardenPositionFive', 'gardenPositionSix'];
  return (
    <section className={styles.screen} aria-labelledby="garden-title">
      <div className={styles.screenHeading}>
        <p className={styles.eyebrow}>A GARDEN OF APPRECIATION</p>
        <h2 id="garden-title">Recognition Garden</h2>
      </div>
      <div className={styles.gardenBoard}>
        <div className={styles.constellationLines} aria-hidden="true" />
        {records.map((recognition, index) => (
          <div key={recognition.id} className={`${styles.gardenBubble} ${styles[positions[index % positions.length]]}`}>
            <RecognitionCard recognition={recognition} fresh={state.queue.some((item) => item.id === recognition.id)} />
          </div>
        ))}
        {!records.length ? <EmptyGarden /> : null}
        <p className={styles.gardenNote}>Every expression makes room for peace.</p>
      </div>
    </section>
  );
}

function EmptyGarden() {
  return (
    <div className={styles.emptyGarden}>
      <span className={styles.emptyDaisy} aria-hidden="true" />
      <h3>The garden is ready.</h3>
      <p>Share a recognition to help a new expression of love arrive.</p>
    </div>
  );
}

function FeaturedScreen({ state }: { state: PresentationState }) {
  const recognition = selectFeatured(state);
  if (!recognition) return <FallbackScreen />;
  const primary = expression(recognition.expressionIds[0]);
  return (
    <section className={styles.screen} aria-labelledby="featured-title">
      <div className={styles.featureExpression} style={{ backgroundColor: primary.color }}>
        <p className={styles.eyebrow}>AN EXPRESSION OF MOTHER&apos;S LOVE</p>
        <span className={styles.featureNumber}>{String(primary.id).padStart(2, '0')}</span>
        <h2>{primary.phrase}</h2>
        <p>{primary.principle}</p>
      </div>
      <div className={styles.featureReading}>
        <p className={styles.eyebrow}>FULL RECOGNITION</p>
        <h2 id="featured-title">Thank you, {recognition.recipient}.</h2>
        <p className={styles.fullMessage}>{recognition.message}</p>
        <div className={styles.expressionList} aria-label="All associated expressions">
          {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
        </div>
      </div>
    </section>
  );
}

function ClusterScreen({ state }: { state: PresentationState }) {
  const matches = selectCluster(state);
  const clusterExpression = state.clusterExpressionId ? expression(state.clusterExpressionId) : null;
  if (!clusterExpression || !matches.length) return <FallbackScreen />;
  return (
    <section className={styles.screen} aria-labelledby="cluster-title">
      <div className={styles.clusterBoard}>
        <div className={styles.clusterCore} style={{ backgroundColor: clusterExpression.color }}>
          <p className={styles.eyebrow}>MOTHER&apos;S LOVE IN ACTION</p>
          <span className={styles.clusterNumber}>{String(clusterExpression.id).padStart(2, '0')}</span>
          <h2 id="cluster-title">{clusterExpression.phrase}</h2>
          <p>{clusterExpression.principle}</p>
        </div>
        <div className={styles.clusterCards}>
          {matches.map((recognition) => <RecognitionCard key={recognition.id} recognition={recognition} />)}
        </div>
      </div>
    </section>
  );
}

function ImpactScreen({ snapshot }: { snapshot: DisplaySnapshot | null }) {
  if (!snapshot) return <FallbackScreen />;
  const { aggregate } = snapshot;
  return (
    <section className={styles.screen} aria-labelledby="impact-title">
      <div className={styles.impactMain}>
        <p className={styles.eyebrow}>THIS MONTH&apos;S SHARED MOMENT</p>
        <p className={styles.impactNumber}>{aggregate.expressionTotal}</p>
        <h2 id="impact-title">Expressions of Mother&apos;s Love Recognized</h2>
        <p className={styles.impactSubline}>{aggregate.recognitions} recognitions shared in {formatPeriod(aggregate.periodStart)}</p>
      </div>
      <div className={styles.impactGrid} aria-label="Expression totals">
        {EXPRESSIONS.map((item, index) => (
          <div className={styles.impactBubble} style={{ backgroundColor: item.color }} key={item.id}>
            <span className={styles.impactCount}>{aggregate.expressionCounts[index] ?? 0}</span>
            <span className={styles.impactPhrase}>{item.phrase}</span>
          </div>
        ))}
      </div>
      <p className={styles.revisionNote}>All totals share revision {aggregate.revision}.</p>
    </section>
  );
}

function ExpressionsScreen() {
  return (
    <section className={styles.screen} aria-labelledby="expressions-title">
      <div className={styles.screenHeading}>
        <p className={styles.eyebrow}>PRACTICE MOTHER&apos;S LOVE</p>
        <h2 id="expressions-title">The 9 Expressions</h2>
      </div>
      <div className={styles.expressionGrid}>
        {EXPRESSIONS.map((item) => (
          <article className={styles.expressionCard} style={{ backgroundColor: item.color }} key={item.id}>
            <span className={styles.expressionNumber}>{String(item.id).padStart(2, '0')}</span>
            <p>{item.principle}</p>
            <strong>{item.phrase}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function ArrivalScreen({ state }: { state: PresentationState }) {
  const recognition = state.activeArrival ? selectEligible(state).find((item) => item.id === state.activeArrival?.id) : null;
  if (!recognition) return <FallbackScreen />;
  return (
    <section className={styles.arrivalScreen} aria-live="polite" aria-labelledby="arrival-title">
      <div className={`${styles.arrivalOrb} ${state.activeArrival?.phase === 'reading' ? styles.arrivalOrbLanded : ''}`} style={{ backgroundColor: expression(recognition.expressionIds[0]).color }} aria-hidden="true" />
      <p className={styles.eyebrow}>{isGroupedArrival(state) ? 'A FEW RECOGNITIONS HAVE ARRIVED' : 'A NEW RECOGNITION HAS ARRIVED'}</p>
      <h2 id="arrival-title">Thank you, {recognition.recipient}.</h2>
      <p className={styles.fullMessage}>{recognition.message}</p>
      <div className={styles.expressionList} aria-label="All associated expressions">
        {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
      </div>
      {isGroupedArrival(state) ? <p className={styles.arrivalGroupNote}>Each recognition remains in the garden for a fair rotation.</p> : null}
    </section>
  );
}

function MilestoneScreen({ state }: { state: PresentationState }) {
  return (
    <section className={styles.milestoneScreen} aria-live="polite" aria-labelledby="milestone-title">
      <p className={styles.eyebrow}>A SHARED MILESTONE</p>
      <p className={styles.milestoneNumber}>{state.pendingMilestone ?? ''}</p>
      <h2 id="milestone-title">Expressions of Mother&apos;s Love recognized together</h2>
      <p>Every small expression helps peace make room for another.</p>
    </section>
  );
}

function QuietScreen({ neutral = false }: { neutral?: boolean }) {
  return (
    <section className={styles.quietScreen} aria-labelledby="quiet-title">
      <span className={styles.quietFlower} aria-hidden="true" />
      <p className={styles.eyebrow}>{neutral ? 'DISPLAY SAFETY MODE' : 'A QUIET MOMENT'}</p>
      <h2 id="quiet-title">{neutral ? 'The living wall is resyncing.' : 'Mother&apos;s Love is still here.'}</h2>
      <p>{neutral ? 'Only the nine campaign expressions remain visible until this display is verified again.' : 'The wall will return when the campaign owner releases Quiet mode.'}</p>
      <div className={styles.quietExpressions}>
        {EXPRESSIONS.map((item) => <span key={item.id} style={{ backgroundColor: item.color }}>{item.phrase}</span>)}
      </div>
    </section>
  );
}

function FallbackScreen() {
  return (
    <section className={styles.fallbackScreen} aria-labelledby="fallback-title">
      <span className={styles.fallbackFlower} aria-hidden="true" />
      <p className={styles.eyebrow}>THE RECOGNITION GARDEN</p>
      <h2 id="fallback-title">There is room for your expression of love.</h2>
      <p>Scan below to recognize someone who encouraged you.</p>
    </section>
  );
}

function Screen({ state }: { state: PresentationState }) {
  switch (state.screen) {
    case 'garden': return <GardenScreen state={state} inviting={false} />;
    case 'featured': return <FeaturedScreen state={state} />;
    case 'cluster': return <ClusterScreen state={state} />;
    case 'impact': return <ImpactScreen snapshot={state.snapshot} />;
    case 'all-nine': return <ExpressionsScreen />;
    case 'arrival': return <ArrivalScreen state={state} />;
    case 'milestone': return <MilestoneScreen state={state} />;
    case 'quiet': return <QuietScreen />;
    case 'neutral': return <QuietScreen neutral />;
    case 'fallback': return <FallbackScreen />;
    default: return <FallbackScreen />;
  }
}

export function DisplayExperience() {
  const [state, dispatch] = useReducer(displayReducer, undefined, createInitialState);
  const [pairingPending, setPairingPending] = useState(false);
  const [pairingError, setPairingError] = useState('');
  const stateRef = useRef<PresentationState | null>(null);
  const displayOpenedAt = useRef<number | null>(null);
  const snapshotRequestInFlight = useRef(false);
  const snapshotRequestGeneration = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    displayOpenedAt.current = typeof performance === 'undefined' ? Date.now() : performance.now();
  }, []);

  const monotonicNow = useCallback(() => {
    const current = typeof performance === 'undefined' ? Date.now() : performance.now();
    return current - (displayOpenedAt.current ?? current);
  }, []);

  const loadSnapshot = useCallback(async (probe = false) => {
    const currentState = stateRef.current;
    if (!probe && !currentState?.paired) return;
    if (snapshotRequestInFlight.current) return;
    snapshotRequestInFlight.current = true;
    const requestGeneration = snapshotRequestGeneration.current + 1;
    snapshotRequestGeneration.current = requestGeneration;
    const requestCursor = probe ? null : currentState?.cursor ?? null;
    try {
      const snapshot = await api<DisplaySnapshot>(snapshotRequestPath(requestCursor), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (requestGeneration !== snapshotRequestGeneration.current) return;
      dispatch({ type: 'SNAPSHOT_RECEIVED', snapshot, receivedAtMs: monotonicNow() });
    } catch (error) {
      if (requestGeneration !== snapshotRequestGeneration.current) return;
      dispatch({ type: 'SNAPSHOT_UNAVAILABLE', receivedAtMs: monotonicNow(), unauthorized: isUnauthorized(error) });
    } finally {
      if (requestGeneration === snapshotRequestGeneration.current) snapshotRequestInFlight.current = false;
    }
  }, [monotonicNow]);

  useEffect(() => {
    void loadSnapshot(true);
  }, [loadSnapshot]);

  const pairDisplay = useCallback(async (code: string) => {
    if (!code) return;
    setPairingPending(true);
    setPairingError('');
    dispatch({ type: 'PAIRING_STARTED' });
    try {
      await api<{ paired: boolean }>('/api/display/pair', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      dispatch({ type: 'PAIRING_SUCCEEDED' });
      setPairingPending(false);
      window.setTimeout(() => void loadSnapshot(), 0);
    } catch (error) {
      setPairingPending(false);
      setPairingError(isUnauthorized(error) ? 'That code is no longer valid. Ask the campaign owner for a new code.' : 'The display could not connect. Check the code and try again.');
      dispatch({ type: 'PAIRING_REQUIRED' });
    }
  }, [loadSnapshot]);

  useEffect(() => {
    if (!state.paired) return;
    const tickTimer = window.setInterval(() => dispatch({ type: 'TICK', nowMs: monotonicNow() }), 500);
    const pollTimer = window.setInterval(() => void loadSnapshot(), 5_000);
    return () => {
      window.clearInterval(tickTimer);
      window.clearInterval(pollTimer);
    };
  }, [loadSnapshot, monotonicNow, state.paired]);

  useEffect(() => {
    if (!state.paired) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => dispatch({ type: 'SET_REDUCED_MOTION', reduced: media.matches });
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, [state.paired]);

  useEffect(() => {
    if (!state.snapshot || !state.paired || state.unauthorized) return;
    void api('/api/display/ack', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settingsVersion: state.settings.version, snapshotRevision: state.snapshot.revision }),
    }).catch(() => undefined);
  }, [state.paired, state.settings.version, state.snapshot, state.unauthorized]);

  const motion = effectiveMotion(state);
  const eligibleCount = useMemo(() => selectEligible(state).length, [state]);
  if (!state.paired && state.phase !== 'loading') {
    return <PairingPanel onPair={pairDisplay} pending={pairingPending} error={pairingError} />;
  }
  return (
    <main
      className={`${styles.displayApp} ${styles[`motion${motion}`]} ${state.lowActivity ? styles.lowActivity : ''} ${state.stale ? styles.stale : ''}`}
      data-testid="display-app"
      data-screen={state.screen}
      data-eligible-count={eligibleCount}
      data-cursor={state.cursor ?? ''}
    >
      <Atmosphere />
      <header className={styles.displayHeader}>
        <div>
          <h1>{TITLE}</h1>
          <p className={styles.headerTagline}>{TAGLINE}</p>
        </div>
        <div className={styles.statusCluster} aria-live="polite">
          {state.stale ? <span className={styles.staleStatus}>Reconnecting</span> : null}
          {state.lowActivity ? <span className={styles.lowActivityStatus}>Low activity</span> : null}
          {state.queue.length ? <span>{state.queue.length} waiting</span> : null}
        </div>
      </header>
      <div className={styles.stage}><Screen state={state} /></div>
      {state.snapshot?.submissionUrl ? <QrDock url={state.snapshot.submissionUrl} inviting={state.screen === 'fallback' || state.screen === 'quiet'} /> : null}
      <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: state.nextTransitionAtMs ? `${Math.max(0, Math.min(100, ((state.nowMs - state.screenStartedAtMs) / Math.max(1, state.nextTransitionAtMs - state.screenStartedAtMs)) * 100))}%` : '0%' }} /></div>
    </main>
  );
}
