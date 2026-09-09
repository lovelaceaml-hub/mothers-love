'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'qrcode';

import { EXPRESSIONS, TAGLINE, TITLE } from '@/lib/catalog';
import type { DisplaySnapshot, Recognition } from '@/lib/contracts';
import { api } from '@/lib/client-api';
import { fetchReactionCounts, ReactionCount, type ReactionItem } from '@/components/feed/PublicFeedProvider';
import {
  GardenArrivalScene,
  GardenMilestoneScene,
  GardenReconnectNotice,
  GardenScene,
  projectGardenAggregate,
} from '@/components/display/garden';
import { MonthlyImpact, NineExpressions, SharedExpression } from '@/components/display/insights';
import { DailyPractice, EverydayPeace, ExpressionSpotlight, OneKindWord, PeacePromise } from '@/components/display/teaching/TeachingScreens';
import { useDisplayChimes } from './use-display-chimes';
import {
  createAdaptiveQualityState,
  createRequestInFlightGuard,
  createVolatileReconnectCache,
  observeFrame,
  planDisplayRefresh,
  type AdaptiveQualityState,
} from '@/lib/display-performance';

import {
  createInitialState,
  storyIndexFor,
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
  type DisplayScreen,
} from '@/lib/display/coordinator';

import styles from './DisplayExperience.module.css';
import { ExpressiveMotion } from './expressive/ExpressiveMotion';
import expressive from './expressive/ExpressiveMotion.module.css';

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

function graphemeUnits(text: string): string[] {
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (locales?: string | string[], options?: { granularity: 'grapheme' }) => { segment(input: string): Iterable<{ segment: string }> };
  }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment);
  return Array.from(text);
}

function shortExcerpt(message: string, limit = 150): { text: string; excerpt: boolean } {
  const units = graphemeUnits(message);
  if (units.length <= limit) return { text: message, excerpt: false };
  return { text: `${units.slice(0, limit).join('').trimEnd()}…`, excerpt: true };
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

const DISPLAY_SNAPSHOT_TIMEOUT_MS = 10_000;

function displayVisibility(): 'visible' | 'hidden' {
  if (typeof document === 'undefined') return 'visible';
  return document.visibilityState === 'hidden' ? 'hidden' : 'visible';
}

type RequestedDisplayEffects = {
  background: boolean;
  sparkles: boolean;
  trails: boolean;
  constellations: boolean;
};

type DisplayVisualQuality = {
  decoration: 'full';
  effects: RequestedDisplayEffects;
};

// Frame quality remains a status signal. It never overrides owner-selected effects.
export function resolveDisplayVisualQuality(requestedEffects: RequestedDisplayEffects): DisplayVisualQuality {
  return {
    decoration: 'full',
    effects: { ...requestedEffects },
  };
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

function Atmosphere({ background = true, sparkles = true }: { background?: boolean; sparkles?: boolean }) {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      {background ? <><span className={styles.atmosphereOrbOne} /><span className={styles.atmosphereOrbTwo} /><span className={styles.atmosphereOrbThree} /><span className={styles.atmosphereDaisy} /></> : null}
      {sparkles ? <><span className={`${styles.atmosphereSparkle} ${styles.atmosphereSparkleOne}`} /><span className={`${styles.atmosphereSparkle} ${styles.atmosphereSparkleTwo}`} /><span className={`${styles.atmosphereSparkle} ${styles.atmosphereSparkleThree}`} /></> : null}
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

function activeStageRecognitions(state: PresentationState): Recognition[] {
  switch (state.screen) {
    case 'garden':
      return selectGarden(state);
    case 'featured': {
      const recognition = selectFeatured(state);
      return recognition ? [recognition] : [];
    }
    case 'cluster':
      return selectCluster(state);
    case 'arrival': {
      if (isGroupedArrival(state)) return [];
      const recognition = state.activeArrival
        ? selectEligible(state).find((item) => item.id === state.activeArrival?.id)
        : undefined;
      return recognition ? [recognition] : [];
    }
    default:
      return [];
  }
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

type ScreenProps = {
  state: PresentationState;
  reactionCounts: ReadonlyMap<string, ReactionItem>;
  quality: AdaptiveQualityState;
};

function GardenScreen({ state }: ScreenProps) {
  const records = selectGarden(state);
  const visualQuality = resolveDisplayVisualQuality({
    trails: state.settings.effects?.trails ?? state.settings.showTrails,
    constellations: state.settings.effects?.constellations ?? state.settings.showConstellations,
    sparkles: state.settings.effects?.sparkles ?? true,
    background: state.settings.effects?.background ?? true,
  });
  const gardenTempo = state.settings.tempo === 'calm' || state.settings.tempo === 'slow' || state.settings.tempo === 'gentle'
    ? 'calm'
    : state.settings.tempo === 'lively' || state.settings.tempo === 'fast'
      ? 'lively'
      : 'standard';
  const gardenMotion = effectiveMotion(state);
  return (
    <div className={`${styles.screen} ${styles.gardenScreen}`} data-motion-key="garden-drift">
      <GardenScene
        records={records}
        amount={state.settings.gardenAmount ?? state.settings.maxBubbles}
        pool={{ activeIds: state.gardenIds, presentationHistory: state.presentationHistory, rotation: state.playlistIndex }}
        nowMs={state.nowMs + state.serverOffsetMs}
        introducedAt={state.gardenIntroducedAt}
        decoration={visualQuality.decoration}
        tempo={gardenTempo}
        motion={gardenMotion}
        requestedDecoration={visualQuality.effects}
        reducedMotion={gardenMotion === 'still'}
      />
      {state.stale ? <GardenReconnectNotice memory={{ status: 'reconnecting', records, lastSuccessfulAtMs: state.lastSuccessfulVerificationMs }} /> : null}
    </div>
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
  return <FeaturedRecognitionView recognition={recognition} readingPageIndex={state.readingPageIndex} reactionCount={reactionCounts.get(recognition.id)?.count} />;
}

export function FeaturedRecognitionView({ recognition, readingPageIndex = 0, reactionCount }: { recognition: Recognition; readingPageIndex?: number; reactionCount?: number }) {
  const primary = expression(recognition.expressionIds[0]);
  const messagePages = splitVerbatimMessage(recognition.message);
  const pageCount = recognitionReadingPageCount(recognition);
  const pageIndex = Math.min(readingPageIndex, pageCount - 1);
  const expressionPage = isExpressionPage(recognition, pageIndex);
  const pageLabel = readingPageLabel(pageIndex, pageCount);
  return (
    <section className={`${styles.screen} ${styles.featuredScreen}`} aria-labelledby="featured-title" data-motion-key="featured-shimmer">
      <div className={styles.featureExpression} style={{ backgroundColor: primary.color }}><div className={styles.featureOrbits} aria-hidden="true"><i /><i /><i /><span>♥</span></div>
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
        {expressionPage ? <p className={styles.continuationHeading}>Associated expressions</p> : (
          <p className={styles.fullMessage} data-testid="featured-message-segment">{messagePages[pageIndex]}</p>
        )}
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
        {reactionCount !== undefined ? <div className={styles.featureReaction} aria-label={`${reactionCount ?? 0} hearts`}><span aria-hidden="true">♥</span> <ReactionCount count={reactionCount ?? 0} /></div> : null}
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
    <section className={`${styles.screen} ${styles.clusterScreen}`} aria-labelledby="display-screen-heading" data-motion-key="cluster-orbit">
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

function ImpactScreen({ state }: { state: PresentationState }) {
  return <MonthlyImpact aggregate={state.snapshot?.aggregate} motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
}

function ExpressionsScreen({ state }: { state: PresentationState }) {
  return <NineExpressions motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
}

function SharedExpressionScreen({ state }: { state: PresentationState }) {
  return <SharedExpression recognitions={selectEligible(state)} expressionId={state.clusterExpressionId} motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
}

function ArrivalScreen({ state, reactionCounts }: ScreenProps) {
  const recognition = state.activeArrival ? selectEligible(state).find((item) => item.id === state.activeArrival?.id) : null;
  if (!recognition) return <FallbackScreen />;
  if (isGroupedArrival(state)) {
    return <GardenArrivalScene arrivals={selectEligible(state).filter(item => state.queue.some(queued => queued.id === item.id))} rotation={state.introducedPublicationKeys.length} reducedMotion={effectiveMotion(state) === 'still'} />;
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
      aria-labelledby="display-screen-heading"
      data-testid="arrival-reading"
      data-entry-treatment={['seed', 'ribbon', 'bloom'][state.introducedPublicationKeys.length % 3]}
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
    <section className={styles.milestoneScreen} aria-live="polite" aria-labelledby="display-screen-heading" data-motion-key="milestone-glow">
      <p className={styles.eyebrow}>A SHARED MILESTONE</p>
      <p className={styles.milestoneNumber}>{state.pendingMilestone ?? ''}</p>
      <h2 id="milestone-title">Expressions of Mother&apos;s Love recognized together</h2>
      <p>Every small expression helps peace make room for another.</p>
    </section>
  );
}

function QuietScreen({ neutral = false }: { neutral?: boolean }) {
  return (
    <section className={styles.quietScreen} aria-labelledby="display-screen-heading" data-motion-key={neutral ? 'neutral-still' : 'quiet-breathe'}>
      <span className={styles.quietFlower} aria-hidden="true" />
      <p className={styles.eyebrow}>{neutral ? 'DISPLAY SAFETY MODE' : 'A QUIET MOMENT'}</p>
      <h2 id="quiet-title">{neutral ? 'Messages are hidden on this display.' : "Mother's Love is still here."}</h2>
      <p>{neutral ? 'The nine campaign expressions remain visible.' : 'The wall will return when Quiet mode ends.'}</p>
      <div className={styles.quietExpressions}>
        {EXPRESSIONS.map((item) => <span key={item.id} style={{ backgroundColor: item.color }}>{item.phrase}</span>)}
      </div>
    </section>
  );
}

function FallbackScreen() {
  return (
    <section className={styles.fallbackScreen} aria-labelledby="display-screen-heading" data-motion-key="fallback-warmth">
      <span className={styles.fallbackFlower} aria-hidden="true" />
      <p className={styles.eyebrow}>THE RECOGNITION GARDEN</p>
      <h2 id="fallback-title">There is room for your expression of love.</h2>
      <p>Scan below to recognize someone who encouraged you.</p>
    </section>
  );
}

function StartupScreen({ unavailable }: { unavailable: boolean }) {
  return (
    <section className={styles.startupScreen} aria-live="polite" aria-labelledby="display-startup-title">
      <div className={styles.startupCard}>
        <span className={styles.startupFlower} aria-hidden="true" />
        <p className={styles.eyebrow}>{unavailable ? 'DISPLAY UNAVAILABLE' : 'THE RECOGNITION GARDEN'}</p>
        <h2 id="display-startup-title">{unavailable ? 'The display is temporarily unavailable.' : 'The display is connecting.'}</h2>
        <p>{unavailable ? 'It will keep trying automatically.' : 'Your campaign view will appear here.'}</p>
      </div>
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

const SCREEN_HEADINGS: Record<PresentationState['screen'], { eyebrow: string; title: string }> = {
  garden: { eyebrow: 'A GARDEN OF APPRECIATION', title: 'Recognition Garden' },
  featured: { eyebrow: 'A MOMENT OF GRATITUDE', title: 'Featured Recognition' },
  cluster: { eyebrow: 'MOTHER\'S LOVE IN ACTION', title: 'Shared Expression' },
  impact: { eyebrow: 'THIS MONTH\'S SHARED MOMENT', title: 'Monthly Impact' },
  'all-nine': { eyebrow: 'PRACTICE MOTHER\'S LOVE', title: 'The 9 Expressions' },
  spotlight: { eyebrow: 'PRACTICE MOTHER\'S LOVE', title: 'Expression Spotlight' },
  'daily-practice': { eyebrow: 'A DAILY PRACTICE', title: 'Practice Mother\'s Love Today' },
  'one-kind-word': { eyebrow: 'ONE KIND WORD', title: 'Heartfelt Change' },
  'everyday-peace': { eyebrow: 'EVERYDAY PEACE', title: 'Small Moments of Peace' },
  'peace-promise': { eyebrow: 'A PEACE PROMISE', title: 'Add Your Promise' },
  arrival: { eyebrow: 'A NEW MOMENT HAS ARRIVED', title: 'New Recognition' },
  milestone: { eyebrow: 'A SHARED MILESTONE', title: 'Milestone' },
  quiet: { eyebrow: 'A QUIET MOMENT', title: 'Quiet Moment' },
  neutral: { eyebrow: 'DISPLAY SAFETY MODE', title: 'Messages Hidden' },
  fallback: { eyebrow: 'THE RECOGNITION GARDEN', title: 'Make Room for Love' },
};

const EMPTY_REACTION_COUNTS: ReadonlyMap<string, ReactionItem> = new Map();

function ReactionCounts({ eligibleIds, children }: { eligibleIds: readonly string[]; children: (reactionCounts: ReadonlyMap<string, ReactionItem>) => ReactNode }) {
  const [reactionCounts, setReactionCounts] = useState<ReadonlyMap<string, ReactionItem>>(() => new Map());
  const controllerRef = useRef<AbortController | null>(null);
  const requestSerialRef = useRef(0);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    let active = true;

    if (eligibleIds.length === 0) {
      return () => {
        active = false;
      };
    }

    const load = async () => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      const controller = new AbortController();
      const requestSerial = requestSerialRef.current + 1;
      requestSerialRef.current = requestSerial;
      controllerRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 8_000);
      try {
        const reactionChunks = Array.from(
          { length: Math.ceil(eligibleIds.length / 30) },
          (_, index) => eligibleIds.slice(index * 30, index * 30 + 30),
        );
        const responses = await Promise.all(reactionChunks.map((ids) => fetchReactionCounts(ids, controller.signal)));
        const next = new Map<string, ReactionItem>();
        for (const response of responses) {
          for (const [id, reaction] of response) next.set(id, reaction);
        }
        if (!active || controller.signal.aborted || requestSerial !== requestSerialRef.current) return;
        setReactionCounts(next);
      } catch {
        if (active && !controller.signal.aborted && requestSerial === requestSerialRef.current) setReactionCounts(EMPTY_REACTION_COUNTS);
      } finally {
        window.clearTimeout(timeoutId);
        if (controllerRef.current === controller) controllerRef.current = null;
        requestInFlightRef.current = false;
      }
    };

    void load();
    const pollTimer = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(pollTimer);
      controllerRef.current?.abort();
      controllerRef.current = null;
      requestInFlightRef.current = false;
    };
  }, [eligibleIds]);

  return children(reactionCounts);
}

function DisplayStage({ state, personalContentVisible, liveRailItems, reactionCounts, quality }: {
  state: PresentationState;
  personalContentVisible: boolean;
  liveRailItems: Recognition[];
  reactionCounts: ReadonlyMap<string, ReactionItem>;
  quality: AdaptiveQualityState;
}) {
  return (
    <>
      <div className={`${styles.stage} ${state.screen === 'garden' ? styles.gardenStage : ''}`}><Screen state={state} reactionCounts={reactionCounts} quality={quality} /></div>
      {personalContentVisible && state.screen !== 'garden' ? <LiveRail items={liveRailItems} reactionCounts={reactionCounts} /> : null}
    </>
  );
}

function storyElapsed(state: PresentationState) { return Math.max(0, (state.pauseStartedAtMs ?? state.nowMs) - state.screenStartedAtMs); }

function Screen({ state, reactionCounts, quality }: ScreenProps) {
  switch (state.screen) {
    case 'garden': return <GardenScreen state={state} reactionCounts={reactionCounts} quality={quality} />;
    case 'featured': return <FeaturedScreen state={state} reactionCounts={reactionCounts} quality={quality} />;
    case 'cluster': return <SharedExpressionScreen state={state} />;
    case 'impact': return <ImpactScreen state={state} />;
    case 'all-nine': return <ExpressionsScreen state={state} />;
    case 'spotlight': return <ExpressionSpotlight expressionIndex={storyIndexFor(state, state.screen)} motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
    case 'daily-practice': return <DailyPractice expressionIndex={storyIndexFor(state, state.screen)} motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
    case 'one-kind-word': return <OneKindWord wordIndex={storyIndexFor(state, state.screen)} motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
    case 'everyday-peace': return <EverydayPeace motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
    case 'peace-promise': return <PeacePromise motion={effectiveMotion(state)} elapsedMs={storyElapsed(state)} />;
    case 'arrival': return <ArrivalScreen state={state} reactionCounts={reactionCounts} quality={quality} />;
    case 'milestone': return state.snapshot ? <GardenMilestoneScene aggregate={projectGardenAggregate(state.snapshot.aggregate)} approvalTotal={state.snapshot.aggregate.recognitions} celebrated={state.celebratedMilestones[state.snapshot.aggregate.periodStart.slice(0, 7)] ?? []} reducedMotion={effectiveMotion(state) === 'still'} /> : <MilestoneScreen state={state} />;
    case 'quiet': return <QuietScreen />;
    case 'neutral': return <QuietScreen neutral />;
    case 'fallback': return <FallbackScreen />;
    default: return <FallbackScreen />;
  }
}

export function DisplayExperience({ previewSnapshot, onNewRecognition }: { previewSnapshot?: DisplaySnapshot; onNewRecognition?: () => void }) {
  const [state, dispatch] = useReducer(displayReducer, undefined, createInitialState);
  const [quality, setQuality] = useState<AdaptiveQualityState>(() => createAdaptiveQualityState());
  const chimes = useDisplayChimes(state.settings.sound,
    state.screen === 'milestone' ? { key: `milestone:${state.snapshot?.aggregate.periodStart}:${state.pendingMilestone}`, kind: 'milestone' }
      : state.screen === 'arrival' && state.activeArrival?.phase === 'journey' ? { key: `arrival:${state.activeArrival.id}`, kind: 'arrival' } : null);
  const stateRef = useRef<PresentationState | null>(null);
  const qualityRef = useRef<AdaptiveQualityState>(quality);
  const displayOpenedAt = useRef<number | null>(null);
  const snapshotRequestGuard = useRef(createRequestInFlightGuard());
  const snapshotRequestGeneration = useRef(0);
  const snapshotControllerRef = useRef<AbortController | null>(null);
  const snapshotTimeoutRef = useRef<number | null>(null);
  const lastSnapshotAttemptAtRef = useRef<number | null>(null);
  const reconnectCache = useRef(createVolatileReconnectCache<DisplaySnapshot>());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);

  useEffect(() => {
    displayOpenedAt.current = typeof performance === 'undefined' ? Date.now() : performance.now();
  }, []);

  const monotonicNow = useCallback(() => {
    const current = typeof performance === 'undefined' ? Date.now() : performance.now();
    return current - (displayOpenedAt.current ?? current);
  }, []);

  const loadSnapshot = useCallback(async (probe = false) => {
    const currentState = stateRef.current;
    const lease = snapshotRequestGuard.current.begin();
    if (!lease) return;
    const requestedAtMs = monotonicNow();
    lastSnapshotAttemptAtRef.current = requestedAtMs;
    const requestGeneration = snapshotRequestGeneration.current + 1;
    snapshotRequestGeneration.current = requestGeneration;
    const requestCursor = probe ? null : currentState?.cursor ?? null;
    const controller = new AbortController();
    snapshotControllerRef.current = controller;
    snapshotTimeoutRef.current = window.setTimeout(() => controller.abort(), DISPLAY_SNAPSHOT_TIMEOUT_MS);
    try {
      const snapshot: DisplaySnapshot = previewSnapshot ? { ...previewSnapshot, settings: currentState?.snapshot ? { ...currentState.settings, pauseRotation: currentState.pauseRotation } : previewSnapshot.settings, serverTime: new Date().toISOString(), sync: currentState?.snapshot ? 'delta' : 'reset' } : await api<DisplaySnapshot>(snapshotRequestPath(requestCursor), {
        method: 'GET',
        auth: false,
        cache: 'no-store',
        signal: controller.signal,
      });
      if (requestGeneration !== snapshotRequestGeneration.current || !snapshotRequestGuard.current.isCurrent(lease)) return;
      const receivedAtMs = monotonicNow();
      reconnectCache.current.set(snapshot, receivedAtMs);
      dispatch({ type: 'SNAPSHOT_RECEIVED', snapshot, receivedAtMs });
    } catch (error) {
      if (requestGeneration !== snapshotRequestGeneration.current || !snapshotRequestGuard.current.isCurrent(lease)) return;
      const receivedAtMs = monotonicNow();
      const cached = reconnectCache.current.get(receivedAtMs);
      if (cached && !currentState?.snapshot && !isUnauthorized(error)) {
        dispatch({ type: 'SNAPSHOT_RECEIVED', snapshot: cached, receivedAtMs });
      }
      dispatch({ type: 'SNAPSHOT_UNAVAILABLE', receivedAtMs, unauthorized: isUnauthorized(error) });
    } finally {
      snapshotRequestGuard.current.finish(lease);
      if (snapshotControllerRef.current === controller) {
        snapshotControllerRef.current = null;
        if (snapshotTimeoutRef.current !== null) {
          window.clearTimeout(snapshotTimeoutRef.current);
          snapshotTimeoutRef.current = null;
        }
      }
    }
  }, [monotonicNow, previewSnapshot]);

  useEffect(() => {
    dispatch({ type: 'PAIRING_SUCCEEDED' });
    void loadSnapshot(true);
  }, [loadSnapshot]);

  useEffect(() => {
    const startupGuard = window.setTimeout(() => {
      const current = stateRef.current;
      if (!current?.snapshot) dispatch({ type: 'SNAPSHOT_UNAVAILABLE', receivedAtMs: monotonicNow() });
    }, 2_000);
    return () => window.clearTimeout(startupGuard);
  }, [monotonicNow]);

  useEffect(() => {
    const tickTimer = window.setInterval(() => dispatch({ type: 'TICK', nowMs: monotonicNow() }), 500);
    const refresh = () => {
      const refreshPlan = planDisplayRefresh({
        nowMs: monotonicNow(),
        visibility: displayVisibility(),
        lastAttemptAtMs: lastSnapshotAttemptAtRef.current,
        inFlight: snapshotRequestGuard.current.inFlight,
        pauseWhenHidden: true,
      });
      if (refreshPlan.shouldRefresh) void loadSnapshot();
    };
    const pollTimer = window.setInterval(refresh, 1_000);
    const onVisibilityChange = () => refresh();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(tickTimer);
      window.clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadSnapshot, monotonicNow]);

  useEffect(() => {
    let animationFrame = 0;
    let previousFrameMs: number | null = null;
    const measure = (frameMs: number) => {
      if (previousFrameMs !== null) {
        const nextQuality = observeFrame(qualityRef.current, frameMs - previousFrameMs, frameMs);
        qualityRef.current = nextQuality;
        if (nextQuality.level !== quality.level) setQuality(nextQuality);
      }
      previousFrameMs = frameMs;
      animationFrame = window.requestAnimationFrame(measure);
    };
    animationFrame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [quality.level]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => dispatch({ type: 'SET_REDUCED_MOTION', reduced: media.matches });
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => () => {
    snapshotRequestGeneration.current += 1;
    snapshotRequestGuard.current.invalidate();
    snapshotControllerRef.current?.abort();
    snapshotControllerRef.current = null;
    if (snapshotTimeoutRef.current !== null) {
      window.clearTimeout(snapshotTimeoutRef.current);
      snapshotTimeoutRef.current = null;
    }
  }, []);

  const motion = effectiveMotion(state);
  const personalContentVisible = state.paired && state.phase === 'ready' && !state.quiet && !state.neutral && !state.offlineSafe && !state.unauthorized;
  const eligibleCount = useMemo(() => personalContentVisible ? selectEligible(state).length : 0, [personalContentVisible, state]);
  const liveRailItems = useMemo(() => personalContentVisible ? selectEligible(state).sort(newestFirst).slice(0, 30) : [], [personalContentVisible, state]);
  const railVisible = personalContentVisible && state.screen !== 'garden';
  const reactionEligibleKey = useMemo(() => {
    if (!personalContentVisible) return '';
    const eligibleIds = new Set(selectEligible(state).map((recognition) => recognition.id));
    const visibleIds = [
      ...liveRailItems.map((recognition) => recognition.id),
      ...activeStageRecognitions(state).map((recognition) => recognition.id),
    ];
    return [...new Set(visibleIds)].filter((id) => eligibleIds.has(id)).join('\u001f');
  }, [liveRailItems, personalContentVisible, state]);
  const reactionEligibleIds = useMemo(
    () => reactionEligibleKey ? reactionEligibleKey.split('\u001f') : [],
    [reactionEligibleKey],
  );
  const requestedEffects = {
    trails: state.settings.effects?.trails ?? state.settings.showTrails,
    constellations: state.settings.effects?.constellations ?? state.settings.showConstellations,
    sparkles: state.settings.effects?.sparkles ?? true,
    background: state.settings.effects?.background ?? true,
  };
  const visualQuality = resolveDisplayVisualQuality(requestedEffects);
  const advance = () => dispatch({ type: 'MANUAL_SCREEN' });
  useEffect(() => {
    if (!previewSnapshot) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
      if (event.code === 'ArrowRight' || event.code === 'Space') {
        event.preventDefault();
        dispatch({ type: 'MANUAL_SCREEN' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewSnapshot]);
  useEffect(() => {
    if (previewSnapshot && state.queue.length && !state.activeArrival && !state.pauseRotation) dispatch({ type: 'PREVIEW_SHOW_ARRIVAL' });
  }, [previewSnapshot, state.queue.length, state.activeArrival, state.pauseRotation]);
  const showSubmissionDock = state.screen !== 'daily-practice' && state.screen !== 'peace-promise';
  return (
    <main
      className={`${previewSnapshot ? expressive.expressiveSurface : ''} ${styles.displayApp} ${styles[`motion${motion}`]} ${state.lowActivity ? styles.lowActivity : ''} ${state.stale ? styles.stale : ''}`}
      onClick={(event) => {
        if (!previewSnapshot || (event.target as HTMLElement).closest('button, a, input, select, textarea')) return;
        if (window.getSelection()?.toString()) return;
        advance();
      }}
      onPointerMove={(event) => {
        if (!previewSnapshot || motion === 'still' || state.pauseRotation) return;
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--view-tilt', `${((event.clientX - box.left) / box.width - .5) * 5}deg`);
      }}
      onPointerLeave={(event) => event.currentTarget.style.setProperty('--view-tilt', '0deg')}
      data-testid="display-app"
      data-screen={state.screen}
      data-motion={motion}
      data-paused={state.pauseRotation}
      data-quality={quality.level}
      data-eligible-count={eligibleCount}
      data-rail-count={railVisible ? liveRailItems.length : 0}
      data-cursor={state.cursor ?? ''}
    >
      {previewSnapshot ? <nav aria-label="Design preview controls" className={styles.previewControls}>
        <span>Local preview · Sample content</span>
        <select aria-label="Choose display" value={state.screen} onChange={(event) => dispatch({ type: 'MANUAL_SCREEN', screen: event.target.value as DisplayScreen })}>
          {state.screen === 'arrival' ? <option value="arrival">New Recognition</option> : null}
          {['garden', 'featured', 'cluster', 'impact', 'all-nine', 'spotlight', 'daily-practice', 'one-kind-word', 'everyday-peace', 'peace-promise'].map((screen) => <option key={screen} value={screen}>{SCREEN_HEADINGS[screen as DisplayScreen].title}</option>)}
        </select>
        <button onClick={() => dispatch({ type: 'SET_PAUSE_ROTATION', paused: !state.pauseRotation })}>{state.pauseRotation ? 'Play' : 'Pause'}</button>
        <button className={styles.previewArrivalButton} disabled={Boolean(state.activeArrival) || state.phase !== 'ready'} onClick={() => { dispatch({ type: 'SET_PAUSE_ROTATION', paused: false }); onNewRecognition?.(); }}>{state.activeArrival ? 'Arrival playing...' : '✦ Preview new arrival'}</button>
        <button onClick={advance}>Next display →</button>
        <button onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); }}>Full screen</button>
        <small>Click anywhere or press →</small>
      </nav> : null}
      {previewSnapshot ? <ExpressiveMotion motion={motion} screen={state.screen} eventKey={`${state.screen}:${state.screenStartedAtMs}`} /> : null}
      <Atmosphere background={visualQuality.effects.background} sparkles={!previewSnapshot && visualQuality.effects.sparkles} />
      <header className={styles.displayHeader}>
        <div>
          <h1>{TITLE}</h1>
          <p className={styles.headerTagline}>{TAGLINE}</p>
        </div>
        <div className={styles.displayScreenHeading} data-testid="display-screen-heading" aria-live="polite">
          <p className={styles.eyebrow}>{SCREEN_HEADINGS[state.screen].eyebrow}</p>
          <h2 id="display-screen-heading">{SCREEN_HEADINGS[state.screen].title}</h2>
        </div>
        <div className={styles.statusCluster} aria-live="polite">
          {state.settings.sound?.enabled && !chimes.ready && !chimes.unsupported ? <button type="button" className={styles.chimeEnable} onClick={chimes.enable}>Enable chimes on this screen</button> : null}
          {state.stale ? <span className={styles.staleStatus}>Reconnecting</span> : null}
          {state.lowActivity ? <span className={styles.lowActivityStatus}>Low activity</span> : null}
          {state.queue.length ? <span>{state.queue.length} waiting</span> : null}
        </div>
      </header>
      {state.phase !== 'ready' || (!state.snapshot && !state.offlineSafe) ? <StartupScreen unavailable={state.stale || state.unauthorized} /> : personalContentVisible ? (
        <ReactionCounts key={reactionEligibleKey} eligibleIds={previewSnapshot ? [] : reactionEligibleIds}>
          {(reactionCounts) => <DisplayStage state={state} personalContentVisible={personalContentVisible} liveRailItems={liveRailItems} reactionCounts={reactionCounts} quality={quality} />}
        </ReactionCounts>
      ) : <DisplayStage state={state} personalContentVisible={false} liveRailItems={[]} reactionCounts={EMPTY_REACTION_COUNTS} quality={quality} />}
      {state.snapshot?.submissionUrl && showSubmissionDock ? <QrDock url={state.snapshot.submissionUrl} inviting={state.screen === 'fallback' || state.screen === 'quiet'} /> : null}
      <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: state.nextTransitionAtMs ? `${Math.max(0, Math.min(100, ((state.nowMs - state.screenStartedAtMs) / Math.max(1, state.nextTransitionAtMs - state.screenStartedAtMs)) * 100))}%` : '0%' }} /></div>
    </main>
  );
}
