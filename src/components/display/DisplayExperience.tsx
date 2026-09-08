'use client';

import { FormEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';

import { EXPRESSIONS, TAGLINE, TITLE } from '@/lib/catalog';
import type { DisplaySnapshot, Recognition } from '@/lib/contracts';
import { api } from '@/lib/client-api';
import { fetchReactionCounts, ReactionCount, type ReactionItem } from '@/components/feed/PublicFeedProvider';

import {
  createInitialState,
  displayReducer,
  effectiveMotion,
  isGroupedArrival,
  recognitionReadingPageCount,
  selectCluster,
  selectEligible,
  selectFeatured,
  splitVerbatimMessage,
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

function isExpressionPage(recognition: Recognition, pageIndex: number): boolean {
  const messagePages = splitVerbatimMessage(recognition.message);
  return pageIndex >= messagePages.length && (messagePages.length > 1 || recognition.expressionIds.length > 4);
}

function readingPageLabel(pageIndex: number, pageCount: number): string | null {
  return pageCount > 1 ? `Reading ${pageIndex + 1} of ${pageCount}` : null;
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
        <h1 id="pairing-title">Connect this display.</h1>
        <p className={styles.tagline}>Where a mother&apos;s love resides, peace abides.</p>
        <p className={styles.pairingCopy}>
          Enter the 8-character display code from the campaign owner.
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
          <span id="pairing-help" className={styles.fieldHint}>Ask the campaign owner for a code if you need one.</span>
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

function ExpressionChip({ id }: { id: number }) {
  const item = expression(id);
  return <span className={styles.expressionChip} style={{ backgroundColor: item.color }} title={item.phrase} aria-label={`Expression ${id}: ${item.phrase}`}>#{id}</span>;
}

type RecognitionCardProps = {
  recognition: Recognition;
  detailed?: boolean;
  fresh?: boolean;
  compactExpressions?: boolean;
  reactionCounts?: ReadonlyMap<string, ReactionItem>;
  style?: CSSProperties;
  className?: string;
};

function RecognitionCard({ recognition, detailed = false, fresh = false, compactExpressions = false, reactionCounts, style, className = '' }: RecognitionCardProps) {
  const excerpt = shortExcerpt(recognition.message, detailed ? 650 : 150);
  const reaction = reactionCounts?.get(recognition.id);
  return (
    <article className={`${styles.recognitionCard} ${compactExpressions ? styles.compactRecognitionCard : ''} ${detailed ? styles.recognitionCardDetailed : ''} ${fresh ? styles.recognitionFresh : ''} ${className}`} style={style} data-testid="recognition-card">
      {fresh ? <span className={styles.freshLabel}>New recognition</span> : null}
      <p className={styles.recipientLabel}>THANK YOU,</p>
      <h3>{recognition.recipient}</h3>
      <div className={`${styles.expressionList} ${compactExpressions ? styles.compactExpressionList : ''}`} aria-label="Expressions selected">
        {recognition.expressionIds.map((id) => compactExpressions ? <ExpressionChip key={id} id={id} /> : <ExpressionPill key={id} id={id} />)}
      </div>
      <p className={styles.recognitionMessage}>{excerpt.text}</p>
      {excerpt.excerpt ? <p className={styles.excerptNote}>Message preview. Full message follows.</p> : null}
      {reaction ? <span className={styles.recognitionReaction} aria-label={`${reaction.count} hearts`}><span aria-hidden="true">♥</span> <ReactionCount count={reaction.count} /></span> : null}
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

const GARDEN_SLOTS = [
  { className: 'gardenPositionOne', x: 14, y: 24 },
  { className: 'gardenPositionTwo', x: 39, y: 31 },
  { className: 'gardenPositionThree', x: 87, y: 20 },
  { className: 'gardenPositionFour', x: 75, y: 79 },
  { className: 'gardenPositionFive', x: 20, y: 78 },
  { className: 'gardenPositionSix', x: 51, y: 73 },
] as const;

function primaryAccent(recognition: Recognition): string {
  return expression(recognition.expressionIds[0] ?? 1).color;
}

function newestFirst(left: Recognition, right: Recognition): number {
  const leftPublished = Date.parse(left.firstPublishedAt ?? left.createdAt);
  const rightPublished = Date.parse(right.firstPublishedAt ?? right.createdAt);
  if (leftPublished !== rightPublished) return rightPublished - leftPublished;
  return right.id.localeCompare(left.id);
}

function bubbleSize(recognition: Recognition, count: number): number {
  const messageWeight = recognition.message.length > 360 ? 18 : recognition.message.length > 180 ? 16.5 : 15.5;
  const densityAdjustment = count > 4 ? -1.5 : 0;
  const expressionAdjustment = recognition.expressionIds.length > 4 ? 0.8 : 0;
  return Math.max(12.8, Math.min(18.5, messageWeight + densityAdjustment + expressionAdjustment));
}

function sharedExpressionIds(left: Recognition, right: Recognition): number[] {
  return left.expressionIds.filter((id) => right.expressionIds.includes(id));
}

type ScreenProps = { state: PresentationState; reactionCounts: ReadonlyMap<string, ReactionItem> };

function GardenScreen({ state, reactionCounts }: ScreenProps) {
  const records = selectGarden(state);
  const connections = records.flatMap((left, leftIndex) => records.slice(leftIndex + 1).flatMap((right, rightIndex) => {
    const shared = sharedExpressionIds(left, right);
    if (!shared.length) return [];
    const rightIndexInRecords = leftIndex + 1 + rightIndex;
    return [{ leftIndex, rightIndex: rightIndexInRecords, expressionId: shared[0] }];
  }));
  const showConnections = state.settings.showConstellations && connections.length > 0;
  const showTrails = state.settings.showTrails && records.length > 0;
  return (
    <section className={`${styles.screen} ${styles.gardenScreen}`} aria-labelledby="garden-title" data-motion-key="garden-drift">
      <div className={styles.screenHeading}>
        <p className={styles.eyebrow}>A GARDEN OF APPRECIATION</p>
        <h2 id="garden-title">Recognition Garden</h2>
      </div>
      <div className={styles.gardenBoard} data-testid="garden-board" data-connection-count={showConnections ? connections.length : 0} data-trail-count={showTrails ? records.length : 0}>
        {showConnections ? (
          <svg className={styles.constellationSvg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {connections.map((connection) => {
              const from = GARDEN_SLOTS[connection.leftIndex];
              const to = GARDEN_SLOTS[connection.rightIndex];
              return <line key={`${connection.leftIndex}-${connection.rightIndex}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={expression(connection.expressionId).color} />;
            })}
          </svg>
        ) : null}
        {records.map((recognition, index) => (
          <div
            key={recognition.id}
            className={`${styles.gardenBubble} ${styles[GARDEN_SLOTS[index % GARDEN_SLOTS.length].className]}`}
            data-testid="garden-bubble"
            style={{ '--bubble-size': `${bubbleSize(recognition, records.length)}vw`, '--bubble-delay': `${-index * 1.8}s`, '--bubble-accent': primaryAccent(recognition) } as CSSProperties}
          >
            <div className={styles.bubbleDrift}>
              {showTrails ? <span className={styles.bubbleTrail} aria-hidden="true" /> : null}
              <div className={styles.bubbleBreath}>
                <RecognitionCard
                  recognition={recognition}
                  compactExpressions
                  reactionCounts={reactionCounts}
                  fresh={state.queue.some((item) => item.id === recognition.id)}
                  style={{ '--bubble-accent': primaryAccent(recognition) } as CSSProperties}
                />
              </div>
            </div>
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

function FeaturedScreen({ state, reactionCounts }: ScreenProps) {
  const recognition = selectFeatured(state);
  if (!recognition) return <FallbackScreen />;
  const primary = expression(recognition.expressionIds[0]);
  const messagePages = splitVerbatimMessage(recognition.message);
  const pageCount = recognitionReadingPageCount(recognition);
  const pageIndex = Math.min(state.readingPageIndex, pageCount - 1);
  const expressionPage = isExpressionPage(recognition, pageIndex);
  const pageLabel = readingPageLabel(pageIndex, pageCount);
  return (
    <section className={`${styles.screen} ${styles.featuredScreen}`} aria-labelledby="featured-title" data-motion-key="featured-shimmer">
      <div className={styles.featureExpression} style={{ backgroundColor: primary.color }}>
        <p className={styles.eyebrow}>AN EXPRESSION OF MOTHER&apos;S LOVE</p>
        <span className={styles.featureNumber}>{String(primary.id).padStart(2, '0')}</span>
        <h2>{primary.phrase}</h2>
        <p>{primary.principle}</p>
      </div>
      <div
        className={`${styles.featureReading} ${expressionPage ? styles.continuationPage : ''}`}
        data-testid="featured-reading"
        data-page-index={pageIndex}
        data-page-count={pageCount}
      >
        <p className={styles.eyebrow}>FULL RECOGNITION</p>
        <h2 id="featured-title">Thank you, {recognition.recipient}.</h2>
        {expressionPage ? <p className={styles.continuationHeading}>Associated expressions</p> : <p className={styles.fullMessage} data-testid="featured-message-segment">{messagePages[pageIndex]}</p>}
        {!expressionPage && pageCount === 1 ? (
          <div className={styles.expressionList} aria-label="All associated expressions" data-testid="featured-expressions">
            {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
          </div>
        ) : null}
        {expressionPage ? (
          <div className={styles.expressionList} aria-label="All associated expressions" data-testid="featured-expressions">
            {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
          </div>
        ) : null}
        {reactionCounts.has(recognition.id) ? <div className={styles.featureReaction} aria-label={`${reactionCounts.get(recognition.id)?.count ?? 0} hearts`}><span aria-hidden="true">♥</span> <ReactionCount count={reactionCounts.get(recognition.id)?.count ?? 0} /></div> : null}
        {pageLabel ? <p className={styles.continuationLabel} aria-live="polite">{pageLabel}</p> : null}
      </div>
    </section>
  );
}

function ClusterScreen({ state, reactionCounts }: ScreenProps) {
  const matches = selectCluster(state);
  const clusterExpression = state.clusterExpressionId ? expression(state.clusterExpressionId) : null;
  if (!clusterExpression || !matches.length) return <FallbackScreen />;
  return (
    <section className={`${styles.screen} ${styles.clusterScreen}`} aria-labelledby="cluster-title" data-motion-key="cluster-orbit">
      <div className={styles.clusterBoard}>
        <div className={styles.clusterCore} style={{ backgroundColor: clusterExpression.color }}>
          <p className={styles.eyebrow}>MOTHER&apos;S LOVE IN ACTION</p>
          <span className={styles.clusterNumber}>{String(clusterExpression.id).padStart(2, '0')}</span>
          <h2 id="cluster-title">{clusterExpression.phrase}</h2>
          <p>{clusterExpression.principle}</p>
        </div>
        <div className={styles.clusterCards}>
          {matches.map((recognition) => <RecognitionCard key={recognition.id} recognition={recognition} compactExpressions reactionCounts={reactionCounts} />)}
        </div>
      </div>
    </section>
  );
}

function ImpactScreen({ snapshot }: { snapshot: DisplaySnapshot | null }) {
  if (!snapshot) return <FallbackScreen />;
  const { aggregate } = snapshot;
  return (
    <section className={`${styles.screen} ${styles.impactScreen}`} aria-labelledby="impact-title" data-motion-key="impact-spark">
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
    </section>
  );
}

function ExpressionsScreen() {
  return (
    <section className={`${styles.screen} ${styles.expressionsScreen}`} aria-labelledby="expressions-title" data-motion-key="expressions-reveal">
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

function ArrivalScreen({ state, reactionCounts }: ScreenProps) {
  const recognition = state.activeArrival ? selectEligible(state).find((item) => item.id === state.activeArrival?.id) : null;
  if (!recognition) return <FallbackScreen />;
  if (isGroupedArrival(state)) {
    return (
      <section className={`${styles.arrivalScreen} ${styles.arrivalGroupScreen}`} aria-live="polite" aria-labelledby="arrival-title" data-motion-key="arrival-gather">
        <div className={`${styles.arrivalOrb} ${state.activeArrival?.phase === 'reading' ? styles.arrivalOrbLanded : ''}`} style={{ backgroundColor: '#a5c9ff' }} aria-hidden="true" />
        <p className={styles.eyebrow}>A FEW RECOGNITIONS HAVE ARRIVED</p>
        <h2 id="arrival-title">The garden has new gratitude.</h2>
        <p className={styles.fullMessage}>Each recognition will make room in the garden in a fair rotation.</p>
        <p className={styles.arrivalGroupNote}>The display is welcoming a small group of new recognitions.</p>
      </section>
    );
  }
  const messagePages = splitVerbatimMessage(recognition.message);
  const pageCount = recognitionReadingPageCount(recognition);
  const pageIndex = Math.min(state.activeArrival?.readingPageIndex ?? 0, pageCount - 1);
  const expressionPage = isExpressionPage(recognition, pageIndex);
  const pageLabel = readingPageLabel(pageIndex, pageCount);
  return (
    <section
      className={`${styles.arrivalScreen} ${styles.arrivalPersonalScreen}`}
      aria-live="polite"
      aria-labelledby="arrival-title"
      data-testid="arrival-reading"
      data-page-index={pageIndex}
      data-page-count={pageCount}
      data-motion-key="arrival-land"
    >
      <div className={`${styles.arrivalOrb} ${state.activeArrival?.phase === 'reading' ? styles.arrivalOrbLanded : ''}`} style={{ backgroundColor: expression(recognition.expressionIds[0]).color }} aria-hidden="true" />
      <p className={styles.eyebrow}>{isGroupedArrival(state) ? 'A FEW RECOGNITIONS HAVE ARRIVED' : 'A NEW RECOGNITION HAS ARRIVED'}</p>
      <h2 id="arrival-title">Thank you, {recognition.recipient}.</h2>
      {expressionPage ? <p className={styles.continuationHeading}>Associated expressions</p> : <p className={styles.fullMessage} data-testid="arrival-message-segment">{messagePages[pageIndex]}</p>}
      {!expressionPage && pageCount === 1 ? (
        <div className={styles.expressionList} aria-label="All associated expressions" data-testid="arrival-expressions">
          {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
        </div>
      ) : null}
      {expressionPage ? (
        <div className={styles.expressionList} aria-label="All associated expressions" data-testid="arrival-expressions">
          {recognition.expressionIds.map((id) => <ExpressionPill key={id} id={id} />)}
        </div>
      ) : null}
      {reactionCounts.has(recognition.id) ? <div className={styles.arrivalReaction} aria-label={`${reactionCounts.get(recognition.id)?.count ?? 0} hearts`}><span aria-hidden="true">♥</span> <ReactionCount count={reactionCounts.get(recognition.id)?.count ?? 0} /></div> : null}
      {pageLabel ? <p className={styles.continuationLabel} aria-live="polite">{pageLabel}</p> : null}
      {isGroupedArrival(state) ? <p className={styles.arrivalGroupNote}>Each recognition remains in the garden for a fair rotation.</p> : null}
    </section>
  );
}

function MilestoneScreen({ state }: { state: PresentationState }) {
  return (
    <section className={styles.milestoneScreen} aria-live="polite" aria-labelledby="milestone-title" data-motion-key="milestone-glow">
      <p className={styles.eyebrow}>A SHARED MILESTONE</p>
      <p className={styles.milestoneNumber}>{state.pendingMilestone ?? ''}</p>
      <h2 id="milestone-title">Expressions of Mother&apos;s Love recognized together</h2>
      <p>Every small expression helps peace make room for another.</p>
    </section>
  );
}

function QuietScreen({ neutral = false }: { neutral?: boolean }) {
  return (
    <section className={styles.quietScreen} aria-labelledby="quiet-title" data-motion-key={neutral ? 'neutral-still' : 'quiet-breathe'}>
      <span className={styles.quietFlower} aria-hidden="true" />
      <p className={styles.eyebrow}>{neutral ? 'DISPLAY SAFETY MODE' : 'A QUIET MOMENT'}</p>
      <h2 id="quiet-title">{neutral ? 'Messages are hidden on this display.' : 'Mother&apos;s Love is still here.'}</h2>
      <p>{neutral ? 'The nine campaign expressions remain visible.' : 'The wall will return when Quiet mode ends.'}</p>
      <div className={styles.quietExpressions}>
        {EXPRESSIONS.map((item) => <span key={item.id} style={{ backgroundColor: item.color }}>{item.phrase}</span>)}
      </div>
    </section>
  );
}

function FallbackScreen() {
  return (
    <section className={styles.fallbackScreen} aria-labelledby="fallback-title" data-motion-key="fallback-warmth">
      <span className={styles.fallbackFlower} aria-hidden="true" />
      <p className={styles.eyebrow}>THE RECOGNITION GARDEN</p>
      <h2 id="fallback-title">There is room for your expression of love.</h2>
      <p>Scan below to recognize someone who encouraged you.</p>
    </section>
  );
}

function LiveRail({ items, reactionCounts }: { items: Recognition[]; reactionCounts: ReadonlyMap<string, ReactionItem> }) {
  if (!items.length) return null;
  return (
    <aside className={styles.liveRail} aria-label="Live recognitions" data-testid="live-rail" data-live-count={items.length}>
      <div className={styles.liveRailHeader}>
        <span className={styles.liveIndicator} aria-hidden="true" />
        <strong>LIVE</strong>
        <span className={styles.liveRailMeta}>Recent recognitions</span>
      </div>
      <div className={styles.liveRailViewport}>
        {items.map((recognition, index) => {
          const excerpt = shortExcerpt(recognition.message, 110);
          return (
            <article className={styles.liveRailItem} key={recognition.id} data-testid="live-recognition" data-live-index={index}>
              <p className={styles.liveRailRecipient}>{recognition.recipient}</p>
              <p className={styles.liveRailMessage}>{excerpt.text}</p>
              {reactionCounts.has(recognition.id) ? <span className={styles.liveRailReaction} aria-label={`${reactionCounts.get(recognition.id)?.count ?? 0} hearts`}><span aria-hidden="true">♥</span> <ReactionCount count={reactionCounts.get(recognition.id)?.count ?? 0} /></span> : null}
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function Screen({ state, reactionCounts }: ScreenProps) {
  switch (state.screen) {
    case 'garden': return <GardenScreen state={state} reactionCounts={reactionCounts} />;
    case 'featured': return <FeaturedScreen state={state} reactionCounts={reactionCounts} />;
    case 'cluster': return <ClusterScreen state={state} reactionCounts={reactionCounts} />;
    case 'impact': return <ImpactScreen snapshot={state.snapshot} />;
    case 'all-nine': return <ExpressionsScreen />;
    case 'arrival': return <ArrivalScreen state={state} reactionCounts={reactionCounts} />;
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
  const reactionControllerRef = useRef<AbortController | null>(null);
  const reactionGenerationRef = useRef(0);

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
      snapshotRequestGeneration.current += 1;
      snapshotRequestInFlight.current = false;
      dispatch({ type: 'PAIRING_SUCCEEDED' });
      setPairingPending(false);
      window.setTimeout(() => void loadSnapshot(true), 0);
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
  const personalContentVisible = state.paired && state.phase === 'ready' && !state.quiet && !state.neutral && !state.offlineSafe && !state.stale && !state.unauthorized;
  const eligibleCount = useMemo(() => personalContentVisible ? selectEligible(state).length : 0, [personalContentVisible, state]);
  const liveRailItems = useMemo(() => personalContentVisible ? selectEligible(state).sort(newestFirst).slice(0, 30) : [], [personalContentVisible, state]);
  const reactionEligibleKey = useMemo(
    () => personalContentVisible ? selectEligible(state).map((recognition) => recognition.id).slice(0, 30).join('\u001f') : '',
    [personalContentVisible, state.snapshot],
  );
  const [reactionCounts, setReactionCounts] = useState<ReadonlyMap<string, ReactionItem>>(() => new Map());
  const visibleReactionCounts = useMemo(() => {
    if (!personalContentVisible || !reactionEligibleKey) return new Map<string, ReactionItem>();
    const eligible = new Set(reactionEligibleKey.split('\u001f'));
    return new Map([...reactionCounts].filter(([id]) => eligible.has(id)));
  }, [personalContentVisible, reactionEligibleKey, reactionCounts]);

  useEffect(() => {
    reactionControllerRef.current?.abort();
    reactionControllerRef.current = null;
    reactionGenerationRef.current += 1;
    const generation = reactionGenerationRef.current;
    const eligibleIds = reactionEligibleKey ? reactionEligibleKey.split('\u001f') : [];
    let active = true;

    if (!personalContentVisible || eligibleIds.length === 0) {
      setReactionCounts(new Map());
      return () => {
        active = false;
      };
    }

    const load = async () => {
      const controller = new AbortController();
      reactionControllerRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const next = await fetchReactionCounts(eligibleIds, controller.signal);
        if (!active || generation !== reactionGenerationRef.current) return;
        const eligible = new Set(eligibleIds);
        setReactionCounts(new Map([...next].filter(([id]) => eligible.has(id))));
      } catch {
        if (active && generation === reactionGenerationRef.current) setReactionCounts(new Map());
      } finally {
        window.clearTimeout(timeoutId);
        if (reactionControllerRef.current === controller) reactionControllerRef.current = null;
      }
    };

    void load();
    const pollTimer = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(pollTimer);
      reactionControllerRef.current?.abort();
      reactionControllerRef.current = null;
    };
  }, [personalContentVisible, reactionEligibleKey]);
  if (!state.paired && state.phase !== 'loading') {
    return <PairingPanel onPair={pairDisplay} pending={pairingPending} error={pairingError} />;
  }
  return (
    <main
      className={`${styles.displayApp} ${styles[`motion${motion}`]} ${state.lowActivity ? styles.lowActivity : ''} ${state.stale ? styles.stale : ''}`}
      data-testid="display-app"
      data-screen={state.screen}
      data-motion={motion}
      data-eligible-count={eligibleCount}
      data-rail-count={liveRailItems.length}
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
      <div className={styles.stage}><Screen state={state} reactionCounts={visibleReactionCounts} /></div>
      {personalContentVisible ? <LiveRail items={liveRailItems} reactionCounts={visibleReactionCounts} /> : null}
      {state.snapshot?.submissionUrl ? <QrDock url={state.snapshot.submissionUrl} inviting={state.screen === 'fallback' || state.screen === 'quiet'} /> : null}
      <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: state.nextTransitionAtMs ? `${Math.max(0, Math.min(100, ((state.nowMs - state.screenStartedAtMs) / Math.max(1, state.nextTransitionAtMs - state.screenStartedAtMs)) * 100))}%` : '0%' }} /></div>
    </main>
  );
}
