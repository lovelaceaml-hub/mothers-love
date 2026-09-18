'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import QRCode from 'qrcode';

import { EXPRESSIONS, TAGLINE, TITLE } from '@/lib/catalog';
import type { DisplaySnapshot, Recognition } from '@/lib/contracts';
import { api } from '@/lib/client-api';
import { fetchReactionCounts, type ReactionItem } from '@/components/feed/PublicFeedProvider';
import { useDisplayChimes } from './use-display-chimes';
import styles from './V6DisplayExperience.module.css';

const TIME_ZONE = 'America/Los_Angeles';
const SNAPSHOT_TIMEOUT_MS = 10_000;
const SNAPSHOT_POLL_MS = 4_000;
const STALE_HIDE_MS = 60_000;
const INDIVIDUAL_JOURNEY_MS = 3_600;
const GROUP_JOURNEY_MS = 4_800;
const INDIVIDUAL_READING_MS = 8_000;
const GROUP_READING_MS = 30_000;
const GROUP_OVERSIZE_READING_MS = 40_000;

export const V6_SCENES = [
  { id: 'welcome', sourceId: 'one-kind-word', durationMs: 30_000 },
  { id: 'garden', sourceId: 'garden', durationMs: 180_000 },
  { id: 'featured', sourceId: 'featured', durationMs: 30_000 },
  { id: 'calendar', sourceId: 'daily-practice', durationMs: 30_000 },
  { id: 'peacemakers', sourceId: 'everyday-peace', durationMs: 60_000 },
  { id: 'status', sourceId: 'impact', durationMs: 30_000 },
  { id: 'expressions', sourceId: 'expressions', durationMs: 30_000 },
  { id: 'peace', sourceId: 'peace-promise', durationMs: 60_000 },
  { id: 'orbit', sourceId: 'shared-expression', durationMs: 30_000 },
  { id: 'milestone', sourceId: 'spotlight', durationMs: 30_000 },
] as const;

type SceneId = (typeof V6_SCENES)[number]['id'];
type DisplayMotion = 'calm' | 'standard' | 'lively' | 'still';
type BubblePhase = 'steady' | 'burst' | 'grow';

type ArrivalPresentation = {
  ids: string[];
  grouped: boolean;
  startedAt: number;
  journeyMs: number;
  readingMs: number;
  style: number;
  oversize: boolean;
};

type DailyAggregate = {
  date: string;
  recognitions: number;
  expressionCounts: number[];
  expressionTotal: number;
};

type GardenSlot = {
  id: string;
  phase: BubblePhase;
  generation: number;
};

const EXPRESSION_NAMES = [
  'Greeting',
  'Gratitude',
  'Apology',
  'Inclusiveness',
  'Concession',
  'Respect',
  'Encouragement',
  'Consideration',
  'Compliment',
] as const;

const INDIVIDUAL_STYLES = ['depth', 'ribbon', 'particles', 'pop', 'spiral', 'converge'] as const;
const GROUP_STYLES = ['wave', 'cascade', 'double-spiral', 'constellation', 'heart-wave'] as const;

function expression(id: number) {
  return EXPRESSIONS[id - 1] ?? EXPRESSIONS[0];
}

function expressionName(id: number) {
  return EXPRESSION_NAMES[id - 1] ?? EXPRESSION_NAMES[0];
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function latestFirst(left: Recognition, right: Recognition): number {
  const leftTime = Date.parse(left.firstPublishedAt ?? left.createdAt);
  const rightTime = Date.parse(right.firstPublishedAt ?? right.createdAt);
  if (leftTime !== rightTime) return rightTime - leftTime;
  return right.id.localeCompare(left.id);
}

function eligibleRecognitions(snapshot: DisplaySnapshot | null, nowMs: number): Recognition[] {
  if (!snapshot) return [];
  return snapshot.recognitions
    .filter((item) => item.status === 'published' && Boolean(item.firstPublishedAt) && Date.parse(item.expiresAt) > nowMs)
    .sort(latestFirst);
}

export function splitMessage(message: string, limit = 145): string[] {
  const characters = Array.from(message);
  if (characters.length <= limit) return [message];
  const pages: string[] = [];
  let cursor = 0;
  while (cursor < characters.length) {
    let end = Math.min(characters.length, cursor + limit);
    if (end < characters.length) {
      const candidate = characters.slice(cursor, end).join('');
      const whitespace = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\n'));
      if (whitespace > Math.floor(limit * 0.58)) end = cursor + whitespace + 1;
    }
    pages.push(characters.slice(cursor, end).join(''));
    cursor = end;
  }
  return pages;
}

function screenElapsed(nowMs: number, startedAtMs: number, pausedAtMs: number | null) {
  return Math.max(0, (pausedAtMs ?? nowMs) - startedAtMs);
}

function localDateParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(lookup.year), month: Number(lookup.month), day: Number(lookup.day) };
}

function dayKey(timestamp: number) {
  const { year, month, day } = localDateParts(timestamp);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function pseudoDate(timestamp: number) {
  const { year, month, day } = localDateParts(timestamp);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function startOfWeekKey(timestamp: number) {
  const date = pseudoDate(timestamp);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return utcKey(date);
}

function addDays(key: string, days: number) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return utcKey(date);
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

function formatHeaderDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(timestamp));
}

function formatMonth(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, month: 'long', year: 'numeric' }).format(new Date(timestamp));
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function useReactionCounts(ids: string[]) {
  const [counts, setCounts] = useState<ReadonlyMap<string, ReactionItem>>(() => new Map());
  const signature = ids.join('\u001f');
  useEffect(() => {
    if (!ids.length) {
      setCounts(new Map());
      return undefined;
    }
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 8_000);
      try {
        const chunks = Array.from({ length: Math.ceil(ids.length / 30) }, (_, index) => ids.slice(index * 30, index * 30 + 30));
        const responses = await Promise.all(chunks.map((chunk) => fetchReactionCounts(chunk, controller!.signal)));
        if (!active) return;
        const next = new Map<string, ReactionItem>();
        for (const response of responses) for (const [id, item] of response) next.set(id, item);
        setCounts(next);
      } catch {
        if (active) setCounts(new Map());
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      controller?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return counts;
}

function QrCode({ url }: { url: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let mounted = true;
    void QRCode.toDataURL(url, { margin: 1, width: 190, color: { dark: '#31463e', light: '#fffdf8' } })
      .then((value) => mounted && setSrc(value))
      .catch(() => mounted && setSrc(''));
    return () => { mounted = false; };
  }, [url]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className={styles.qrImage} src={src} alt="QR code to share a recognition" /> : <span className={styles.qrFallback}>QR</span>;
}

function ExpressionIcon({ id, className = '' }: { id: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`${styles.expressionIcon} ${className}`} src={`/home-art/icon${id}.webp`} alt="" aria-hidden="true" />;
}

function BubbleChips({ ids }: { ids: number[] }) {
  return (
    <div className={styles.bubbleChips} aria-label="Expressions">
      {ids.slice(0, 3).map((id) => (
        <span key={id}><ExpressionIcon id={id} />{expressionName(id)}</span>
      ))}
      {ids.length > 3 ? <span className={styles.moreChip}>+{ids.length - 3}</span> : null}
    </div>
  );
}

function RecognitionBubble({
  recognition,
  reaction,
  size = 'medium',
  phase = 'steady',
  elapsedMs = 0,
  className = '',
  style,
  messagePage,
  nameOnly = false,
}: {
  recognition: Recognition;
  reaction?: ReactionItem;
  size?: 'small' | 'medium' | 'large' | 'hero' | 'tribute';
  phase?: BubblePhase;
  elapsedMs?: number;
  className?: string;
  style?: CSSProperties;
  messagePage?: number;
  nameOnly?: boolean;
}) {
  const pages = splitMessage(recognition.message, size === 'hero' || size === 'large' ? 185 : size === 'small' ? 105 : 135);
  const automaticPage = pages.length > 1 ? Math.floor((elapsedMs / 5_000 + (stableNumber(recognition.id) % pages.length)) % pages.length) : 0;
  const page = Math.min(messagePage ?? automaticPage, pages.length - 1);
  const accent = expression(recognition.expressionIds[0] ?? 1).color;
  const motionSeed = stableNumber(recognition.id);
  const driftVariant = motionSeed % 5;
  const bubbleStyle = {
    '--bubble-accent': accent,
    '--motion-delay': `${-((motionSeed % 1700) / 100)}s`,
    '--motion-duration': `${13 + (motionSeed % 11)}s`,
    '--motion-x': `${-13 + (motionSeed % 27)}px`,
    '--motion-y': `${-14 + ((motionSeed >>> 4) % 25)}px`,
    ...style,
  } as CSSProperties;
  return (
    <article
      className={`${styles.recognitionBubble} ${styles[`drift${driftVariant}`]} ${styles[`bubble${size[0].toUpperCase()}${size.slice(1)}`]} ${styles[`bubble${phase[0].toUpperCase()}${phase.slice(1)}`]} ${className}`}
      style={bubbleStyle}
      data-recognition-id={recognition.id}
      data-shape="circle"
    >
      <div className={styles.bubbleInner}>
        <p className={styles.thankYou}>THANK YOU,</p>
        <h3>{recognition.recipient}</h3>
        {nameOnly ? <BubbleChips ids={recognition.expressionIds.slice(0, 1)} /> : (
          <>
            <p className={styles.bubbleMessage}>{pages[page]}</p>
            {pages.length > 1 ? <span className={styles.pageMarker}>{page + 1}/{pages.length}</span> : null}
            <BubbleChips ids={recognition.expressionIds} />
            {reaction ? <span className={styles.reactionCount} aria-label={`${reaction.count} hearts`}>♡ {reaction.count}</span> : null}
          </>
        )}
      </div>
      <span className={styles.bubbleSheen} aria-hidden="true" />
    </article>
  );
}

function EmptyScene({ title = 'The garden is ready.' }: { title?: string }) {
  return (
    <div className={styles.emptyScene}>
      <span className={styles.emptyFlower} aria-hidden="true">✿</span>
      <h2>{title}</h2>
      <p>Share a recognition to help another expression of Mother&apos;s Love appear here.</p>
    </div>
  );
}

type FieldSlot = {
  current: Recognition;
  previous: Recognition | null;
  transitioning: boolean;
};

export function fieldSlots(records: Recognition[], count: number, elapsedMs: number, intervalMs: number, firstChangeMs = 8_000): FieldSlot[] {
  const usable = records.slice(0, Math.max(count, Math.min(records.length, count * 5)));
  const slotCount = Math.min(count, usable.length);
  if (!slotCount) return [];
  const stagger = intervalMs / slotCount;
  return Array.from({ length: slotCount }, (_, slot) => {
    const local = elapsedMs - (firstChangeMs + slot * stagger);
    const cycle = local >= 0 ? Math.floor(local / intervalMs) + 1 : 0;
    const current = usable[(slot + cycle * slotCount) % usable.length];
    const previousCandidate = cycle > 0 ? usable[(slot + (cycle - 1) * slotCount) % usable.length] : null;
    const transitioning = cycle > 0 && local % intervalMs < 2_500 && previousCandidate?.id !== current.id;
    return { current, previous: transitioning ? previousCandidate : null, transitioning };
  });
}

function WelcomeScene({ records, reactions, elapsedMs }: SceneProps) {
  const bubbles = fieldSlots(records, 4, elapsedMs, 16_000, 7_500);
  return (
    <section className={`${styles.scene} ${styles.welcomeScene}`} data-v6-scene="welcome">
      <div className={styles.welcomeCopy}>
        <p className={styles.eyebrow}>A LIVING CAMPAIGN OF APPRECIATION</p>
        <h2>The Words of<br/><span>Mother&apos;s Love</span></h2>
        <p className={styles.serifLead}>Where a mother&apos;s love resides,<br/>peace abides.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.communityArt} src="/home-art/community.webp" alt="" aria-hidden="true" />
      </div>
      <div className={styles.fieldRight}>
        {bubbles.map((slot, index) => (
          <div key={index} className={styles.fieldSlot}>
            {slot.previous ? <RecognitionBubble key={`leaving:${slot.previous.id}`} recognition={slot.previous} reaction={reactions.get(slot.previous.id)} elapsedMs={elapsedMs} size={index === 1 ? 'large' : 'medium'} className={`${styles[`fieldPosition${index + 1}`]} ${styles.fieldLeaving}`} /> : null}
            <RecognitionBubble key={`current:${slot.current.id}`} recognition={slot.current} reaction={reactions.get(slot.current.id)} elapsedMs={elapsedMs} size={index === 1 ? 'large' : 'medium'} className={`${styles[`fieldPosition${index + 1}`]} ${slot.transitioning ? styles.fieldEntering : ''}`} />
          </div>
        ))}
      </div>
      {!bubbles.length ? <EmptyScene /> : null}
    </section>
  );
}

type SceneProps = {
  records: Recognition[];
  reactions: ReadonlyMap<string, ReactionItem>;
  elapsedMs: number;
  snapshot: DisplaySnapshot | null;
  nowServerMs: number;
  motion: DisplayMotion;
  storyVisit: number;
  dailyAggregates: DailyAggregate[];
};

function GardenScene({ records, reactions, elapsedMs, motion }: SceneProps) {
  const signature = records.map((record) => record.id).join('|');
  const [slots, setSlots] = useState<GardenSlot[]>(() => records.slice(0, 5).map((record) => ({ id: record.id, phase: 'grow', generation: 0 })));
  const [flowers, setFlowers] = useState(0);
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const cursorRef = useRef(5);
  const slotRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const seenRef = useRef(new Set(records.map((record) => record.id)));

  useEffect(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setSlots((previous) => {
      const available = new Map(records.map((record) => [record.id, record]));
      const retained = previous.filter((slot) => available.has(slot.id)).slice(0, 5);
      const used = new Set(retained.map((slot) => slot.id));
      const newlyEligible = records.filter((record) => !seenRef.current.has(record.id));
      for (const record of records) {
        if (retained.length >= 5) break;
        if (!used.has(record.id)) {
          retained.push({ id: record.id, phase: 'grow', generation: 0 });
          used.add(record.id);
        }
      }
      if (retained.length >= 5) {
        const incoming = newlyEligible.find((record) => !used.has(record.id));
        if (incoming) {
          const targetIndex = slotRef.current % 5;
          slotRef.current += 1;
          retained[targetIndex] = { id: incoming.id, phase: 'grow', generation: retained[targetIndex].generation + 1 };
        }
      }
      return retained;
    });
    seenRef.current = new Set(records.map((record) => record.id));
    cursorRef.current = 5;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (motion === 'still' || recordsRef.current.length <= 5 || !slots.length) return undefined;
    const interval = window.setInterval(() => {
      const targetIndex = slotRef.current % Math.max(1, Math.min(5, slots.length));
      slotRef.current += 1;
      setSlots((current) => current.map((slot, index) => index === targetIndex ? { ...slot, phase: 'burst' } : slot));
      const replaceTimer = window.setTimeout(() => {
        setSlots((current) => {
          const currentIds = new Set(current.map((slot) => slot.id));
          let replacement: Recognition | undefined;
          const pool = recordsRef.current;
          for (let attempt = 0; attempt < pool.length; attempt += 1) {
            const candidate = pool[(cursorRef.current + attempt) % pool.length];
            if (candidate && !currentIds.has(candidate.id)) {
              replacement = candidate;
              cursorRef.current = (cursorRef.current + attempt + 1) % pool.length;
              break;
            }
          }
          if (!replacement) return current.map((slot, index) => index === targetIndex ? { ...slot, phase: 'steady' } : slot);
          setFlowers((value) => Math.min(36, value + 1));
          return current.map((slot, index) => index === targetIndex ? { id: replacement!.id, phase: 'grow', generation: slot.generation + 1 } : slot);
        });
      }, 900);
      const settleTimer = window.setTimeout(() => {
        setSlots((current) => current.map((slot, index) => index === targetIndex ? { ...slot, phase: 'steady' } : slot));
      }, 2_400);
      timersRef.current.push(replaceTimer, settleTimer);
    }, 7_000);
    return () => window.clearInterval(interval);
  }, [motion, signature, slots.length]);

  const byId = new Map(records.map((record) => [record.id, record]));
  return (
    <section className={`${styles.scene} ${styles.gardenScene}`} data-v6-scene="garden">
      <div className={styles.sceneHeading}>
        <p className={styles.eyebrow}>RECOGNITION GARDEN</p>
        <h2>Appreciation, all around us.</h2>
      </div>
      <div className={styles.gardenLight} aria-hidden="true" />
      <div className={styles.gardenBed} aria-hidden="true">
        {Array.from({ length: 20 + flowers }, (_, index) => (
          <span key={index} className={styles.gardenPlant} style={{ '--plant-i': index, '--plant-height': `${2.4 + (index % 5) * .55}rem`, '--plant-phase': `${-(index % 9)}s` } as CSSProperties}>
            <i /><b />
          </span>
        ))}
      </div>
      <div className={styles.gardenField}>
        {slots.map((slot, index) => {
          const record = byId.get(slot.id);
          if (!record) return null;
          return (
            <div key={`${index}:${slot.id}:${slot.generation}`} className={`${styles.gardenBubbleSlot} ${styles[`gardenSlot${index + 1}`]}`}>
              <RecognitionBubble recognition={record} reaction={reactions.get(record.id)} elapsedMs={elapsedMs} phase={slot.phase} size="medium" />
              {slot.phase === 'burst' ? <><PetalBurst /><span className={styles.gardenEnergyTrail} aria-hidden="true" /></> : null}
              {slot.phase === 'grow' ? <span className={styles.growStem} aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
      {!slots.length ? <EmptyScene /> : null}
      <p className={styles.gardenMeaning}>Every expression of Mother&apos;s Love helps the garden grow.</p>
    </section>
  );
}

function PetalBurst() {
  return <span className={styles.petalBurst} aria-hidden="true">{Array.from({ length: 32 }, (_, index) => {
    const angle = index / 32 * Math.PI * 2;
    const distance = 5 + (index % 7) * 1.15;
    return <i key={index} style={{ '--petal-i': index, '--petal-x': `${Math.cos(angle) * distance + 5}rem`, '--petal-y': `${Math.sin(angle) * distance - 4 - (index % 4)}rem`, '--petal-rot': `${140 + index * 37}deg` } as CSSProperties} />;
  })}</span>;
}

function FeaturedScene({ records, reactions, elapsedMs, storyVisit }: SceneProps) {
  if (!records.length) return <section className={styles.scene}><EmptyScene /></section>;
  const featured = records[storyVisit % records.length];
  const expressionId = featured.expressionIds[storyVisit % featured.expressionIds.length] ?? featured.expressionIds[0] ?? 1;
  const item = expression(expressionId);
  const matching = records.filter((record) => record.expressionIds.includes(expressionId));
  const examples = fieldSlots(matching.length ? matching : records, 2, elapsedMs, 12_000, 7_000);
  return (
    <section className={`${styles.scene} ${styles.featuredScene}`} data-v6-scene="featured">
      <div className={styles.featureExpressionPanel} style={{ '--panel-accent': item.color } as CSSProperties}>
        <p className={styles.eyebrow}>FEATURED RECOGNITION · EXPRESSION {String(expressionId).padStart(2, '0')} / 09</p>
        <div className={styles.featureMedallion}><ExpressionIcon id={expressionId} /></div>
        <h2>{expressionName(expressionId)}</h2>
        <p>{item.principle}</p>
        <blockquote>“{item.phrase}”</blockquote>
        <span>Recognitions selecting this expression</span>
      </div>
      <div className={styles.featureBubbles}>
        {examples.map((slot, index) => (
          <div key={index} className={styles.featureBubbleSlot}>
            {slot.previous ? <RecognitionBubble key={`leaving:${slot.previous.id}`} recognition={slot.previous} reaction={reactions.get(slot.previous.id)} size="hero" elapsedMs={elapsedMs} className={`${styles[`featureBubble${index + 1}`]} ${styles.fieldLeaving}`} /> : null}
            <RecognitionBubble key={`current:${slot.current.id}`} recognition={slot.current} reaction={reactions.get(slot.current.id)} size="hero" elapsedMs={elapsedMs} className={`${styles[`featureBubble${index + 1}`]} ${slot.transitioning ? styles.fieldEntering : ''}`} />
          </div>
        ))}
      </div>
    </section>
  );
}

function calendarData(records: Recognition[], dailyAggregates: DailyAggregate[], nowServerMs: number) {
  const { year, month, day } = localDateParts(nowServerMs);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDay = first.getUTCDay();
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  const counts = new Map<number, number>();
  const expressionCounts = Array.from({ length: 9 }, () => 0);
  const daily = dailyAggregates;
  if (daily.length) {
    for (const aggregate of daily) {
      if (!aggregate.date.startsWith(prefix)) continue;
      const recordDay = Number(aggregate.date.slice(-2));
      counts.set(recordDay, aggregate.recognitions);
      if (recordDay === day) aggregate.expressionCounts.forEach((value, index) => { expressionCounts[index] = value; });
    }
  } else {
    for (const record of records) {
      const key = dayKey(Date.parse(record.createdAt));
      if (!key.startsWith(prefix)) continue;
      const recordDay = Number(key.slice(-2));
      counts.set(recordDay, (counts.get(recordDay) ?? 0) + 1);
      if (recordDay === day) for (const id of record.expressionIds) expressionCounts[id - 1] += 1;
    }
  }
  return { year, month, day, daysInMonth, firstDay, counts, expressionCounts };
}

function CalendarScene({ records, dailyAggregates, nowServerMs }: SceneProps) {
  const data = calendarData(records, dailyAggregates, nowServerMs);
  const todayCount = data.counts.get(data.day) ?? 0;
  const cells = Array.from({ length: data.firstDay + data.daysInMonth }, (_, index) => index < data.firstDay ? null : index - data.firstDay + 1);
  return (
    <section className={`${styles.scene} ${styles.calendarScene}`} data-v6-scene="calendar">
      <div className={styles.calendarSide}>
        <p className={styles.eyebrow}>RECOGNITION CALENDAR</p>
        <h2>Every day, a little love.</h2>
        <div className={styles.calendarTodayPanel}>
          <p>{formatHeaderDate(nowServerMs)} · Today</p>
          <strong>{todayCount}</strong>
          <span>Recognitions shared</span>
          <div className={styles.todayExpressions}>
            {EXPRESSIONS.map((item, index) => (
              <div key={item.id}><ExpressionIcon id={item.id} /><b>{data.expressionCounts[index]}</b><span>{expressionName(item.id)}</span></div>
            ))}
          </div>
          <small>Original recognition submission date.</small>
        </div>
      </div>
      <div className={styles.calendarBoard}>
        <div className={styles.calendarBoardTop}><h3>{formatMonth(nowServerMs)}</h3><span>Original submission date</span></div>
        <div className={styles.weekdays}>{['SUN','MON','TUE','WED','THU','FRI','SAT'].map((name) => <span key={name}>{name}</span>)}</div>
        <div className={styles.calendarGrid}>
          {cells.map((cell, index) => cell === null ? <span key={`blank-${index}`} className={styles.calendarBlank} /> : (
            <div key={cell} className={`${styles.calendarCell} ${cell < data.day ? styles.calendarPast : ''} ${cell === data.day ? styles.calendarCurrent : ''} ${cell > data.day ? styles.calendarFuture : ''}`}>
              <span className={styles.calendarDate}>{cell}</span>
              <strong>{data.counts.get(cell) ?? 0}</strong>
            </div>
          ))}
        </div>
        <div className={styles.calendarLegend}><span>Sunday to Saturday · original submission dates</span><span>Future dates have no counts</span></div>
      </div>
    </section>
  );
}

function PeacemakersScene({ records, reactions, elapsedMs }: SceneProps) {
  const bubbles = fieldSlots(records, 4, elapsedMs, 15_000, 7_000);
  return (
    <section className={`${styles.scene} ${styles.peacemakersScene}`} data-v6-scene="peacemakers">
      <div className={styles.peaceCommunityCopy}>
        <p className={styles.eyebrow}>MOTHER&apos;S LOVE IN OUR COMMUNITY</p>
        <h2>We Are<br/><span>Peacemakers</span></h2>
        <p>Recognize the kindness<br/>you see around you.</p>
        <div className={styles.globeArt} aria-hidden="true">
          <div className={styles.globe}><i /><b /><em /></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/home-art/community.webp" alt="" />
        </div>
      </div>
      <div className={styles.fieldRight}>
        {bubbles.map((slot, index) => <div key={index} className={styles.fieldSlot}>
          {slot.previous ? <RecognitionBubble key={`leaving:${slot.previous.id}`} recognition={slot.previous} reaction={reactions.get(slot.previous.id)} elapsedMs={elapsedMs} size={index === 1 ? 'large' : 'medium'} className={`${styles[`fieldPosition${index + 1}`]} ${styles.fieldLeaving}`} /> : null}
          <RecognitionBubble key={`current:${slot.current.id}`} recognition={slot.current} reaction={reactions.get(slot.current.id)} elapsedMs={elapsedMs} size={index === 1 ? 'large' : 'medium'} className={`${styles[`fieldPosition${index + 1}`]} ${slot.transitioning ? styles.fieldEntering : ''}`} />
        </div>)}
      </div>
      {!bubbles.length ? <EmptyScene /> : null}
    </section>
  );
}

function StatusScene({ records, snapshot, dailyAggregates, nowServerMs }: SceneProps) {
  const aggregate = snapshot?.aggregate;
  const today = dayKey(nowServerMs);
  const todayRecords = records.filter((record) => dayKey(Date.parse(record.createdAt)) === today);
  const dailyToday = dailyAggregates.find((item) => item.date === today);
  const todayRecognitionCount = dailyToday?.recognitions ?? todayRecords.length;
  const todayExpressions = dailyToday?.expressionTotal ?? todayRecords.reduce((sum, record) => sum + record.expressionIds.length, 0);
  const counts = aggregate?.expressionCounts ?? Array.from({ length: 9 }, () => 0);
  return (
    <section className={`${styles.scene} ${styles.statusScene}`} data-v6-scene="status">
      <div className={styles.sceneHeading}>
        <p className={styles.eyebrow}>PARTICIPATION STATUS</p>
        <h2>Mother&apos;s Love, recognized.</h2>
      </div>
      <div className={styles.statusHero}>
        <div><span>Expressions of Mother&apos;s Love<br/>Recognized This Month</span><strong>{aggregate?.expressionTotal ?? 0}</strong><small>{formatMonth(nowServerMs)}</small></div>
        <div><strong>{aggregate?.recognitions ?? 0}</strong><span>Recognitions shared<br/>this month</span></div>
        <span className={styles.puzzleMark} aria-hidden="true"><i /><b /></span>
      </div>
      <div className={styles.statusBody}>
        <div className={styles.expressionStats}>
          {EXPRESSIONS.map((item, index) => (
            <div key={item.id} className={styles.expressionStat} style={{ '--stat-delay': `${-index * 1.35}s` } as CSSProperties}>
              <span className={styles.statIcon}><ExpressionIcon id={item.id} /></span>
              <div><h3>{expressionName(item.id)}</h3><strong>{counts[index] ?? 0}</strong></div>
            </div>
          ))}
        </div>
        <div className={styles.periodStats}>
          <div><p>TODAY</p><strong>{todayRecognitionCount}</strong><span>Recognitions</span><strong>{todayExpressions}</strong><span>Expressions</span></div>
          <div><p>CURRENT MONTH</p><strong>{aggregate?.recognitions ?? 0}</strong><span>Recognitions</span><strong>{aggregate?.expressionTotal ?? 0}</strong><span>Expressions</span></div>
        </div>
      </div>
      <p className={styles.statusFoot}>All nine expressions · same period · equal appreciation</p>
    </section>
  );
}

function ExpressionsScene({ elapsedMs, storyVisit }: SceneProps) {
  const focus = elapsedMs >= 11_000;
  const focusIndex = storyVisit % 9;
  if (!focus) {
    return (
      <section className={`${styles.scene} ${styles.expressionsScene}`} data-v6-scene="expressions" data-expression-mode="overview">
        <div className={styles.sceneHeading}><p className={styles.eyebrow}>THE NINE EXPRESSIONS</p><h2>Words that bring peace.</h2></div>
        <span className={styles.expressionStep}>01 to 09 · THE COMPLETE PHRASES</span>
        <div className={styles.expressionGrid}>
          {EXPRESSIONS.map((item) => (
            <article key={item.id} className={styles.expressionCard} style={{ '--card-accent': item.color } as CSSProperties}>
              <div className={styles.expressionCardTop}><span><ExpressionIcon id={item.id} /></span><div><h3>{expressionName(item.id)}</h3><small>{String(item.id).padStart(2, '0')} / 09</small></div></div>
              <blockquote>“{item.phrase}”</blockquote>
            </article>
          ))}
        </div>
      </section>
    );
  }
  const item = EXPRESSIONS[focusIndex];
  return (
    <section className={`${styles.scene} ${styles.expressionsScene} ${styles.expressionFocusScene}`} data-v6-scene="expressions" data-expression-mode="focus">
      <div className={styles.sceneHeading}><p className={styles.eyebrow}>THE NINE EXPRESSIONS</p><h2>Words that bring peace.</h2></div>
      <span className={styles.expressionStep}>IN FOCUS · {expressionName(item.id).toUpperCase()} · {String(item.id).padStart(2, '0')}/09</span>
      <article className={styles.expressionFocus} style={{ '--card-accent': item.color } as CSSProperties}>
        <div className={styles.expressionFocusTitle}><span><ExpressionIcon id={item.id} /></span><div><small>EXPRESSION {String(item.id).padStart(2, '0')} OF 09</small><h3>{expressionName(item.id)}</h3></div></div>
        <blockquote>“{item.phrase}”</blockquote>
        <h4>{item.principle}</h4>
        <p>{item.example}</p>
        <small>One expression blooms into focus on each visit.</small>
      </article>
      <div className={styles.expressionMiniGrid}>
        {EXPRESSIONS.filter((candidate) => candidate.id !== item.id).map((candidate) => (
          <article key={candidate.id}><span><ExpressionIcon id={candidate.id} /></span><div><h3>{expressionName(candidate.id)}</h3><p>“{candidate.phrase}”</p></div></article>
        ))}
      </div>
    </section>
  );
}

function PeaceInPracticeScene({ records, reactions, elapsedMs }: SceneProps) {
  const bubbles = fieldSlots(records, 4, elapsedMs, 13_000, 7_500);
  return (
    <section className={`${styles.scene} ${styles.peaceInPracticeScene}`} data-v6-scene="peace">
      <div className={styles.peacePracticeCopy}>
        <p className={styles.eyebrow}>PEACE IN PRACTICE</p>
        <h2>May Mother&apos;s <span>love</span><br/>bring <span>peace</span> to the world!</h2>
        <p>Love expressed through words and actions.</p>
        <div className={styles.heartGarden} aria-hidden="true">
          <span className={styles.heroHeart} />
          {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ '--heart-i': index, '--heart-row': index % 4, '--heart-size': `${1 + (index % 4) * .35}rem`, '--heart-speed': `${5 + (index % 5) * .8}s` } as CSSProperties} />)}
          <b /><em /><strong />
        </div>
      </div>
      <div className={styles.fieldRight}>
        {bubbles.map((slot, index) => (
          <div key={index} className={`${styles.peaceBubbleWrap} ${styles[`fieldPosition${index + 1}`]}`}>
            {slot.previous ? <><RecognitionBubble key={`leaving:${slot.previous.id}`} recognition={slot.previous} reaction={reactions.get(slot.previous.id)} elapsedMs={elapsedMs} size={index === 1 ? 'large' : 'medium'} phase="burst" className={styles.peaceBubbleRelative} /><HeartBurst /></> : null}
            <RecognitionBubble key={`current:${slot.current.id}`} recognition={slot.current} reaction={reactions.get(slot.current.id)} elapsedMs={elapsedMs} size={index === 1 ? 'large' : 'medium'} className={`${styles.peaceBubbleRelative} ${slot.transitioning ? styles.fieldEntering : ''}`} />
          </div>
        ))}
      </div>
      {!bubbles.length ? <EmptyScene /> : null}
    </section>
  );
}

function HeartBurst() {
  return <span className={styles.heartBurst} aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <i key={index} style={{ '--burst-i': index } as CSSProperties}>♥</i>)}</span>;
}

function OrbitScene({ records, reactions, elapsedMs, storyVisit }: SceneProps) {
  if (!records.length) return <section className={styles.scene}><EmptyScene /></section>;
  const expressionId = ((storyVisit % 9) + 1);
  const matches = records.filter((record) => record.expressionIds.includes(expressionId));
  const planets = (matches.length ? matches : records).slice(0, 4);
  const item = expression(expressionId);
  const t = elapsedMs / 1000;
  return (
    <section className={`${styles.scene} ${styles.orbitScene}`} data-v6-scene="orbit">
      <div className={styles.sceneHeading}><p className={styles.eyebrow}>EXPRESSION CONSTELLATION</p><h2>A shared expression. Many kind words.</h2></div>
      <div className={styles.orbitSystem}>
        <span className={`${styles.orbitRing} ${styles.orbitRingOne}`} /><span className={`${styles.orbitRing} ${styles.orbitRingTwo}`} /><span className={`${styles.orbitRing} ${styles.orbitRingThree}`} />
        <div className={styles.orbitSun} style={{ '--sun-accent': item.color } as CSSProperties}>
          <div className={styles.featureMedallion}><ExpressionIcon id={expressionId} /></div>
          <h3>{expressionName(expressionId)}</h3>
          <blockquote>“{item.phrase}”</blockquote>
          <p>{item.principle}</p>
        </div>
        {planets.map((record, index) => {
          const angle = t * (Math.PI * 2 / (96 + index * 4)) + index * (Math.PI * 2 / Math.max(1, planets.length)) + 0.35;
          const z = Math.sin(angle);
          const x = 50 + Math.cos(angle) * 34;
          const y = 52 + Math.sin(angle) * 10;
          const scale = 0.76 + (z + 1) * 0.17;
          const planetStyle = { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${scale})`, zIndex: Math.round(100 + z * 60), opacity: 0.76 + (z + 1) * 0.12, filter: `blur(${z < -0.45 ? Math.abs(z) * 0.8 : 0}px)` } as CSSProperties;
          return (
            <div key={record.id} className={styles.orbitPlanet} style={planetStyle} data-depth={z.toFixed(3)}>
              <RecognitionBubble recognition={record} reaction={reactions.get(record.id)} size="medium" elapsedMs={elapsedMs} />
              {record.expressionIds.slice(0, 2).map((id, moonIndex) => {
                const moonAngle = t * (Math.PI * 2 / (15 + moonIndex * 4)) + moonIndex * Math.PI;
                return <span key={id} className={styles.orbitMoon} style={{ transform: `rotate(${moonAngle}rad) translateX(${150 + moonIndex * 14}px) rotate(${-moonAngle}rad)` } as CSSProperties}><ExpressionIcon id={id} /></span>;
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function weeklyGoal(records: Recognition[], dailyAggregates: DailyAggregate[], nowServerMs: number) {
  const thisWeekStart = startOfWeekKey(nowServerMs);
  const nextWeekStart = addDays(thisWeekStart, 7);
  const priorWeekStart = addDays(thisWeekStart, -7);
  const current = Array.from({ length: 9 }, () => 0);
  const prior = Array.from({ length: 9 }, () => 0);
  const daily = dailyAggregates;
  if (daily.length) {
    for (const aggregate of daily) {
      const target = aggregate.date >= thisWeekStart && aggregate.date < nextWeekStart ? current : aggregate.date >= priorWeekStart && aggregate.date < thisWeekStart ? prior : null;
      if (!target) continue;
      aggregate.expressionCounts.forEach((value, index) => { target[index] += value; });
    }
  } else {
    for (const record of records) {
      const key = dayKey(Date.parse(record.createdAt));
      const target = key >= thisWeekStart && key < nextWeekStart ? current : key >= priorWeekStart && key < thisWeekStart ? prior : null;
      if (!target) continue;
      for (const id of record.expressionIds) target[id - 1] += 1;
    }
  }
  const priorHasData = prior.some((value) => value > 0);
  const source = priorHasData ? prior : current;
  const minimum = Math.min(...source);
  const expressionIndex = Math.max(0, source.findIndex((value) => value === minimum));
  const others = current.filter((_, index) => index !== expressionIndex).sort((left, right) => right - left);
  const target = Math.max(1, (others[3] ?? 0) + 1);
  const value = current[expressionIndex] ?? 0;
  const rank = 1 + current.filter((count) => count > value).length;
  return { expressionId: expressionIndex + 1, value, target, rank, thisWeekStart, nextWeekStart };
}

function MilestoneGoalScene({ records, snapshot, dailyAggregates, nowServerMs, elapsedMs }: SceneProps) {
  const expressionTotal = snapshot?.aggregate.expressionTotal ?? 0;
  const reached = Math.floor(expressionTotal / 250) * 250;
  const hasMilestone = reached >= 250;
  const next = Math.max(250, Math.ceil((expressionTotal + 1) / 250) * 250);
  const progress = Math.min(100, (expressionTotal / next) * 100);
  const goal = weeklyGoal(records, dailyAggregates, nowServerMs);
  const tributes = records.slice(0, 20);
  const t = elapsedMs / 1000;
  return (
    <section className={`${styles.scene} ${styles.milestoneScene}`} data-v6-scene="milestone">
      <div className={styles.milestoneEditorial}>
        <p className={styles.eyebrow}>A SHARED ACHIEVEMENT</p>
        <h2>Every kind word<br/>brought us<br/><span>here.</span></h2>
        <p>Many expressions.<br/>One growing community<br/>of Mother&apos;s Love.</p>
        <blockquote>Every expression matters.</blockquote>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/home-art/community.webp" alt="" aria-hidden="true" />
      </div>
      <div className={styles.achievementWorld}>
        <aside className={styles.achievementRail}>
          <div className={styles.achievementMilestone}>
            <p className={styles.eyebrow}>{hasMilestone ? 'MILESTONE REACHED' : 'MILESTONE PROGRESS'}</p>
            <strong>{hasMilestone ? reached : expressionTotal}</strong>
            <h3>{hasMilestone ? <>Expressions of Mother&apos;s Love<br/>recognized this month</> : <>Expressions shared toward<br/>the first milestone</>}</h3>
            <p>{formatMonth(nowServerMs)}<br/><b>{expressionTotal}</b> now · next milestone <b>{next}</b></p>
            <Progress value={progress} />
          </div>
          <div className={styles.achievementGoal}>
            <p className={styles.eyebrow}>THIS WEEK&apos;S EXPRESSION GOAL</p>
            <div className={styles.goalName}><span><ExpressionIcon id={goal.expressionId} /></span><h3>{expressionName(goal.expressionId)}</h3></div>
            <strong>{goal.value} <small>/ {goal.target}</small></strong>
            <Progress value={Math.min(100, goal.value / goal.target * 100)} />
            <p>Now #{goal.rank} · expression, not people<br/>{goal.thisWeekStart} to {addDays(goal.nextWeekStart, -1)}</p>
          </div>
        </aside>
        <p className={styles.currentLabel}>A RISING CURRENT OF APPRECIATION</p>
        <div className={styles.recognitionCurrent}>
          <span className={styles.currentGlow} aria-hidden="true" />
          {tributes.map((record, index) => {
            const seed = stableNumber(record.id);
            const phase = (seed % 1000) / 1000 * Math.PI * 2;
            const speed = 20 + (seed % 17);
            const normalizedY = ((650 - (t * speed + index * 47)) % 760 + 760) % 760;
            const angle = phase + t * (0.16 + (seed % 9) / 100);
            const z = Math.sin(angle);
            const x = 54 + Math.cos(angle) * (22 + (seed % 12));
            const y = normalizedY / 760 * 105 - 5;
            const scale = 0.62 + (z + 1) * 0.24;
            const style = { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${scale})`, zIndex: Math.round(100 + z * 70), opacity: 0.5 + (z + 1) * 0.24, filter: `blur(${z < -0.45 ? Math.abs(z) * 1.2 : 0}px)` } as CSSProperties;
            return <RecognitionBubble key={record.id} recognition={record} size="tribute" elapsedMs={elapsedMs} style={style} className={styles.currentTribute} nameOnly />;
          })}
          {Array.from({ length: 13 }, (_, index) => {
            const id = index % 9 + 1;
            const y = ((690 - (t * (17 + index % 6) + index * 71)) % 760 + 760) % 760 / 760 * 105 - 5;
            const x = 50 + Math.sin(t * (0.14 + index * .006) + index) * (28 + index % 9);
            return <span key={index} className={styles.currentExpressionIcon} style={{ left: `${x}%`, top: `${y}%` } as CSSProperties}><ExpressionIcon id={id} /></span>;
          })}
        </div>
      </div>
    </section>
  );
}

function Progress({ value }: { value: number }) {
  return <div className={styles.progressBar}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }}><i>✦</i></span></div>;
}

function SafeScene({ neutral, stale }: { neutral: boolean; stale: boolean }) {
  return (
    <section className={`${styles.scene} ${styles.safeScene}`} data-v6-scene="safe">
      <div className={styles.safeCard}>
        <span className={styles.emptyFlower} aria-hidden="true">✿</span>
        <p className={styles.eyebrow}>{neutral ? 'DISPLAY SAFETY MODE' : stale ? 'RECONNECTING' : 'A QUIET MOMENT'}</p>
        <h2>{neutral ? 'Messages are hidden on this display.' : stale ? 'The display is reconnecting.' : "Mother's Love is still here."}</h2>
        <p>{neutral ? 'The nine campaign expressions remain visible.' : stale ? 'Personal recognition content will return after the connection is verified.' : 'The wall will return when Quiet mode ends.'}</p>
        <div className={styles.safeExpressions}>{EXPRESSIONS.map((item) => <span key={item.id} style={{ '--safe-accent': item.color } as CSSProperties}><ExpressionIcon id={item.id} />{expressionName(item.id)}</span>)}</div>
      </div>
    </section>
  );
}

function ArrivalScene({ active, records, reactions, nowMs }: { active: ArrivalPresentation; records: Recognition[]; reactions: ReadonlyMap<string, ReactionItem>; nowMs: number }) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const items = active.ids.map((id) => byId.get(id)).filter((record): record is Recognition => Boolean(record));
  const elapsed = nowMs - active.startedAt;
  const journey = elapsed < active.journeyMs;
  const readingElapsed = Math.max(0, elapsed - active.journeyMs);
  if (active.grouped) {
    const styleName = GROUP_STYLES[active.style % GROUP_STYLES.length];
    const pairMode = active.oversize;
    const pairIndex = pairMode ? Math.min(4, Math.floor(readingElapsed / Math.max(1, active.readingMs / 5))) : 0;
    const visible = pairMode && !journey ? items.slice(pairIndex * 2, pairIndex * 2 + 2) : items;
    return (
      <section className={`${styles.scene} ${styles.arrivalScene} ${styles.groupArrival}`} data-v6-scene="arrival" data-arrival-kind="group" data-arrival-style={styleName}>
        <div className={styles.arrivalWash} aria-hidden="true" />
        <div className={styles.groupArrivalTop}><h2>A new wave of Mother&apos;s Love.</h2><span>{pairMode && !journey ? `FULL-MESSAGE PAIR ${pairIndex + 1}/5` : 'GRAND CELEBRATION · 30 SECOND SHARED MOMENT'}</span></div>
        <div className={`${styles.groupBubbleGrid} ${pairMode && !journey ? styles.groupPairGrid : ''}`}>
          {visible.map((record, index) => (
            <div key={record.id} className={`${styles.groupArrivalItem} ${journey ? styles[`groupEntry${active.style % 5}`] : styles.arrivalLanded}`} style={{ '--group-i': pairMode ? index : items.indexOf(record), '--group-side': ((pairMode ? index : items.indexOf(record)) % 2 === 0 ? -1 : 1), '--group-band': ((pairMode ? index : items.indexOf(record)) % 5) } as CSSProperties}>
              <RecognitionBubble recognition={record} reaction={reactions.get(record.id)} size={pairMode && !journey ? 'large' : 'small'} elapsedMs={readingElapsed} />
            </div>
          ))}
        </div>
        <span className={styles.groupParticles} aria-hidden="true">{Array.from({ length: 36 }, (_, index) => <i key={index} style={{ '--particle-i': index, '--particle-x': `${5 + ((index * 37) % 91)}%`, '--particle-y': `${7 + ((index * 53) % 84)}%` } as CSSProperties} />)}</span>
      </section>
    );
  }
  const record = items[0];
  if (!record) return <section className={styles.scene}><EmptyScene /></section>;
  const styleName = INDIVIDUAL_STYLES[active.style % INDIVIDUAL_STYLES.length];
  const pages = splitMessage(record.message, 185);
  const readingPage = Math.min(pages.length - 1, Math.floor(readingElapsed / Math.max(1, active.readingMs / pages.length)));
  return (
    <section className={`${styles.scene} ${styles.arrivalScene} ${styles.individualArrival}`} data-v6-scene="arrival" data-arrival-kind="individual" data-arrival-style={styleName}>
      <div className={styles.arrivalWash} aria-hidden="true" />
      <div className={styles.individualArrivalCopy}><p className={styles.eyebrow}>ARRIVAL DESIGN · MOTHER&apos;S LOVE, SHARED</p><h2>A little kindness,<br/><span>a moment for you.</span></h2><p>A new recognition has arrived.</p></div>
      <div className={`${styles.individualArrivalBubble} ${journey ? styles[`individualEntry${active.style % 6}`] : styles.arrivalLanded}`}>
        <RecognitionBubble recognition={record} reaction={reactions.get(record.id)} size="hero" elapsedMs={readingElapsed} messagePage={readingPage} />
      </div>
      <span className={styles.arrivalParticles} aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ '--particle-i': index, '--particle-x': `${10 + ((index * 31) % 80)}%`, '--particle-y': `${8 + ((index * 47) % 84)}%`, '--particle-dx': `${((index * 19) % 25) - 12}rem`, '--particle-dy': `${-3 - ((index * 13) % 11)}rem` } as CSSProperties} />)}</span>
      <span className={styles.arrivalTrail} aria-hidden="true" />
    </section>
  );
}

function V6Scene({ scene, records, reactions, snapshot, elapsedMs, nowServerMs, motion, storyVisit, dailyAggregates }: { scene: SceneId; records: Recognition[]; reactions: ReadonlyMap<string, ReactionItem>; snapshot: DisplaySnapshot | null; elapsedMs: number; nowServerMs: number; motion: DisplayMotion; storyVisit: number; dailyAggregates: DailyAggregate[] }) {
  const props = { records, reactions, elapsedMs, snapshot, nowServerMs, motion, storyVisit, dailyAggregates };
  switch (scene) {
    case 'welcome': return <WelcomeScene {...props} />;
    case 'garden': return <GardenScene {...props} />;
    case 'featured': return <FeaturedScene {...props} />;
    case 'calendar': return <CalendarScene {...props} />;
    case 'peacemakers': return <PeacemakersScene {...props} />;
    case 'status': return <StatusScene {...props} />;
    case 'expressions': return <ExpressionsScene {...props} />;
    case 'peace': return <PeaceInPracticeScene {...props} />;
    case 'orbit': return <OrbitScene {...props} />;
    case 'milestone': return <MilestoneGoalScene {...props} />;
    default: return <WelcomeScene {...props} />;
  }
}

function Feed({ items, reactions, nowMs }: { items: Recognition[]; reactions: ReadonlyMap<string, ReactionItem>; nowMs: number }) {
  const visible = items.slice(0, 8);
  const columns = [visible.filter((_, index) => index % 2 === 0), visible.filter((_, index) => index % 2 === 1)];
  return (
    <div className={styles.feedRegion} data-testid="v6-live-feed">
      <div className={styles.feedHeading}><span><i /> LIVE RECOGNITIONS</span><small>ORIGINAL SUBMISSION TIMES</small></div>
      <div className={styles.feedColumns}>
        {columns.map((column, columnIndex) => (
          <div className={styles.feedColumn} key={columnIndex}>
            {column.map((record, itemIndex) => {
              const pages = splitMessage(record.message, 90);
              const pageIndex = pages.length > 1 ? Math.floor((nowMs / 5_000 + itemIndex + columnIndex) % pages.length) : 0;
              return (
                <article key={record.id} className={styles.feedItem}>
                  <span className={styles.feedAvatar}><ExpressionIcon id={record.expressionIds[0] ?? 1} /></span>
                  <div><div className={styles.feedItemTop}><strong>{record.recipient}</strong><time>{formatTime(record.firstPublishedAt ?? record.createdAt)}</time></div><p>{pages[pageIndex]}</p><div className={styles.feedItemFoot}><span>{record.expressionIds.slice(0, 2).map((id) => expressionName(id)).join(' · ')}{pages.length > 1 ? ` · ${pageIndex + 1}/${pages.length}` : ''}</span>{reactions.has(record.id) ? <b>♡ {reactions.get(record.id)?.count ?? 0}</b> : null}</div></div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Shell({ children, snapshot, nowServerMs, nowMs, queueCount, arrival, feedItems, reactions, stale, lowActivity }: { children: ReactNode; snapshot: DisplaySnapshot | null; nowServerMs: number; nowMs: number; queueCount: number; arrival: ArrivalPresentation | null; feedItems: Recognition[]; reactions: ReadonlyMap<string, ReactionItem>; stale: boolean; lowActivity: boolean }) {
  const reactionTotal = [...reactions.values()].reduce((sum, item) => sum + item.count, 0);
  return (
    <main className={`${styles.display} ${stale ? styles.stale : ''} ${lowActivity ? styles.lowActivity : ''}`} data-testid="display-v6">
      <div className={styles.background} aria-hidden="true"><span /><i /><b /></div>
      <header className={styles.header}>
        <div><h1>{TITLE}</h1><p>{TAGLINE}</p></div>
        <div className={styles.headerRight}>
          <span className={styles.likesPill}>♡ <strong>{reactionTotal}</strong> visible hearts</span>
          <div><strong>{formatHeaderDate(nowServerMs)}</strong><small>{stale ? 'RECONNECTING · LAST VERIFIED DATA' : 'LIVE TV DISPLAY'}</small></div>
        </div>
      </header>
      {queueCount || arrival ? <div className={styles.queueDock}><b>{queueCount}</b><span>{arrival?.grouped ? 'group on screen' : 'waiting'}</span><i /><i /><i /><i /><small>{arrival ? Math.max(0, Math.ceil((arrival.journeyMs + arrival.readingMs - (nowMs - arrival.startedAt)) / 1000)) : ''}s</small></div> : null}
      <div className={styles.content}>{children}</div>
      <footer className={styles.footer}>
        <aside className={styles.qrDock}>
          {snapshot?.submissionUrl ? <QrCode url="https://mothers-love.vercel.app/" /> : <span className={styles.qrFallback}>QR</span>}
          <div><strong>Recognize<br/>Someone</strong><p>Who encouraged<br/>you today?</p></div>
          <small>{snapshot?.submissionUrl ? 'Scan to share Mother\'s Love' : 'Recognition link unavailable'}</small>
        </aside>
        <Feed items={feedItems} reactions={reactions} nowMs={nowMs} />
      </footer>
    </main>
  );
}

export function V6DisplayExperience() {
  const reducedMotion = useReducedMotion();
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);
  const [dailyAggregates, setDailyAggregates] = useState<DailyAggregate[]>([]);
  const [stale, setStale] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneStartedAt, setSceneStartedAt] = useState(() => Date.now());
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [storyVisits, setStoryVisits] = useState<Partial<Record<SceneId, number>>>({});
  const [queue, setQueue] = useState<string[]>([]);
  const [activeArrival, setActiveArrival] = useState<ArrivalPresentation | null>(null);
  const knownEventsRef = useRef(new Set<string>());
  const initialSnapshotRef = useRef(true);
  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const individualStyleRef = useRef(0);
  const groupStyleRef = useRef(0);
  const mountedAtRef = useRef(Date.now());

  const loadSnapshot = useCallback(async () => {
    if (inFlightRef.current || document.visibilityState === 'hidden') return;
    inFlightRef.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), SNAPSHOT_TIMEOUT_MS);
    try {
      const path = cursorRef.current ? `/api/display/snapshot?after=${encodeURIComponent(cursorRef.current)}` : '/api/display/snapshot';
      const next = await api<DisplaySnapshot>(path, { method: 'GET', auth: false, cache: 'no-store', signal: controller.signal });
      const receivedAt = Date.now();
      setSnapshot(next);
      setServerOffsetMs(Date.parse(next.serverTime) - receivedAt);
      setLastVerifiedAt(receivedAt);
      setStale(false);
      setUnavailable(false);
      cursorRef.current = next.cursor;
      const arrivals = next.arrivals ?? [];
      if (initialSnapshotRef.current) {
        for (const arrival of arrivals) knownEventsRef.current.add(arrival.eventId);
        initialSnapshotRef.current = false;
      } else {
        const freshIds: string[] = [];
        for (const arrival of arrivals) {
          if (knownEventsRef.current.has(arrival.eventId)) continue;
          knownEventsRef.current.add(arrival.eventId);
          freshIds.push(arrival.recognitionId);
        }
        if (freshIds.length) setQueue((current) => [...current, ...freshIds.filter((id) => !current.includes(id))]);
      }
    } catch {
      setStale(true);
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
      inFlightRef.current = false;
    }
  }, []);

  const loadDailyAggregates = useCallback(async () => {
    try {
      const response = await api<{ ok?: boolean; items: DailyAggregate[] }>('/api/display/daily', { method: 'GET', auth: false, cache: 'no-store' });
      if (Array.isArray(response.items)) setDailyAggregates(response.items);
    } catch {
      // The V6 UI falls back to the currently retained recognition records until
      // the additive anonymous-aggregate migration is available.
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    void loadDailyAggregates();
    const poll = window.setInterval(() => void loadSnapshot(), SNAPSHOT_POLL_MS);
    const dailyPoll = window.setInterval(() => void loadDailyAggregates(), 30_000);
    const visibility = () => { if (document.visibilityState === 'visible') void loadSnapshot(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(dailyPoll);
      document.removeEventListener('visibilitychange', visibility);
      controllerRef.current?.abort();
    };
  }, [loadDailyAggregates, loadSnapshot]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const reference = lastVerifiedAt ?? mountedAtRef.current;
    if (nowMs - reference >= STALE_HIDE_MS) setUnavailable(true);
  }, [lastVerifiedAt, nowMs]);

  const nowServerMs = nowMs + serverOffsetMs;
  const allRecords = useMemo(() => eligibleRecognitions(snapshot, nowServerMs), [snapshot, nowServerMs]);
  const latest = allRecords.slice(0, 30);
  const reactionIds = latest.map((record) => record.id);
  const reactions = useReactionCounts(reactionIds);
  const settings = snapshot?.settings;
  const mode = settings?.mode ?? 'normal';
  const pauseRotation = Boolean(settings?.pauseRotation);
  const pauseArrivals = Boolean(settings?.pauseArrivals);
  const requestedMotion = (settings?.motion ?? 'standard') as DisplayMotion;
  const motion: DisplayMotion = reducedMotion && requestedMotion !== 'lively' ? 'still' : requestedMotion;
  const personalContentVisible = Boolean(snapshot) && !unavailable && mode === 'normal';
  const scene = V6_SCENES[sceneIndex];
  const elapsedMs = screenElapsed(nowMs, sceneStartedAt, pausedAt);

  useEffect(() => {
    if (mode === 'normal' && !unavailable) return;
    setQueue([]);
    setActiveArrival(null);
    if (pausedAt !== null) {
      setSceneStartedAt((started) => started + (Date.now() - pausedAt));
      setPausedAt(null);
    }
  }, [mode, pausedAt, unavailable]);

  useEffect(() => {
    if (pauseRotation && pausedAt === null) setPausedAt(Date.now());
    if (!pauseRotation && pausedAt !== null && !activeArrival) {
      setSceneStartedAt((started) => started + (Date.now() - pausedAt));
      setPausedAt(null);
    }
  }, [activeArrival, pauseRotation, pausedAt]);

  const beginArrival = useCallback((ids: string[], grouped: boolean, atMs: number) => {
    const records = ids.map((id) => allRecords.find((record) => record.id === id)).filter((record): record is Recognition => Boolean(record));
    if (!records.length) return;
    const oversize = grouped && records.some((record) => record.message.length > 190 || record.expressionIds.length > 4);
    const style = grouped ? groupStyleRef.current++ % GROUP_STYLES.length : individualStyleRef.current++ % INDIVIDUAL_STYLES.length;
    setActiveArrival({
      ids: records.map((record) => record.id),
      grouped,
      startedAt: atMs,
      journeyMs: grouped ? GROUP_JOURNEY_MS : INDIVIDUAL_JOURNEY_MS,
      readingMs: grouped ? (oversize ? GROUP_OVERSIZE_READING_MS : GROUP_READING_MS) : Math.max(INDIVIDUAL_READING_MS, Math.ceil(records[0].message.length / 170) * INDIVIDUAL_READING_MS),
      style,
      oversize,
    });
    setPausedAt((value) => value ?? atMs);
  }, [allRecords]);

  useEffect(() => {
    if (!activeArrival) return;
    const eligibleIds = new Set(allRecords.map((record) => record.id));
    if (activeArrival.ids.every((id) => eligibleIds.has(id))) return;
    const surviving = activeArrival.ids.filter((id) => eligibleIds.has(id));
    setActiveArrival(null);
    setQueue((current) => current.filter((id) => !activeArrival.ids.includes(id) || surviving.includes(id)));
    if (pausedAt !== null && !pauseRotation) {
      setSceneStartedAt((started) => started + (Date.now() - pausedAt));
      setPausedAt(null);
    }
  }, [activeArrival, allRecords, pauseRotation, pausedAt]);

  useEffect(() => {
    if (!personalContentVisible || pauseArrivals || activeArrival || !queue.length) return;
    const availableQueue = queue.filter((id) => allRecords.some((record) => record.id === id));
    if (!availableQueue.length) {
      setQueue([]);
      return;
    }
    const grouped = availableQueue.length >= 10;
    beginArrival(availableQueue.slice(0, grouped ? 10 : 1), grouped, Date.now());
  }, [activeArrival, allRecords, beginArrival, pauseArrivals, personalContentVisible, queue]);

  useEffect(() => {
    if (!activeArrival || pauseRotation) return;
    const total = activeArrival.journeyMs + activeArrival.readingMs;
    if (nowMs - activeArrival.startedAt < total) return;
    const completed = new Set(activeArrival.ids);
    const remaining = queue.filter((id) => !completed.has(id) && allRecords.some((record) => record.id === id));
    setQueue(remaining);
    setActiveArrival(null);
    if (!remaining.length && pausedAt !== null) {
      setSceneStartedAt((started) => started + (Date.now() - pausedAt));
      setPausedAt(null);
    }
  }, [activeArrival, allRecords, nowMs, pauseRotation, pausedAt, queue]);

  useEffect(() => {
    if (!personalContentVisible || pauseRotation || activeArrival || pausedAt !== null) return;
    if (elapsedMs < scene.durationMs) return;
    setStoryVisits((current) => ({ ...current, [scene.id]: (current[scene.id] ?? 0) + 1 }));
    setSceneIndex((index) => (index + 1) % V6_SCENES.length);
    setSceneStartedAt(Date.now());
  }, [activeArrival, elapsedMs, pauseRotation, pausedAt, personalContentVisible, scene.durationMs, scene.id]);

  const milestoneEventKey = snapshot ? `${snapshot.aggregate.periodStart}:${Math.floor(snapshot.aggregate.expressionTotal / 250) * 250}` : '';
  useDisplayChimes(settings?.sound,
    activeArrival ? { key: `v6-arrival:${activeArrival.ids.join(':')}:${activeArrival.startedAt}`, kind: 'arrival' }
      : milestoneEventKey && snapshot && snapshot.aggregate.expressionTotal >= 250 ? { key: `v6-milestone:${milestoneEventKey}`, kind: 'milestone' }
        : null);

  if (!snapshot && !unavailable) {
    return <Shell snapshot={snapshot} nowServerMs={nowServerMs} nowMs={nowMs} queueCount={0} arrival={null} feedItems={[]} reactions={new Map()} stale={stale} lowActivity={false}><section className={`${styles.scene} ${styles.safeScene}`}><div className={styles.safeCard}><span className={styles.emptyFlower}>✿</span><p className={styles.eyebrow}>THE WORDS OF MOTHER&apos;S LOVE</p><h2>The display is connecting.</h2><p>Your live campaign view will appear here.</p></div></section></Shell>;
  }

  const safe = !personalContentVisible;
  const activeRecords = personalContentVisible ? allRecords : [];
  const lowActivity = activeRecords.length < 3;
  const storyVisit = storyVisits[scene.id] ?? 0;
  return (
    <Shell snapshot={snapshot} nowServerMs={nowServerMs} nowMs={nowMs} queueCount={queue.length} arrival={activeArrival} feedItems={personalContentVisible ? latest : []} reactions={reactions} stale={stale} lowActivity={lowActivity}>
      {safe ? <SafeScene neutral={mode === 'neutral' || unavailable} stale={stale || unavailable} />
        : activeArrival ? <ArrivalScene active={activeArrival} records={allRecords} reactions={reactions} nowMs={nowMs} />
          : <V6Scene scene={scene.id} records={activeRecords} reactions={reactions} snapshot={snapshot} elapsedMs={elapsedMs} nowServerMs={nowServerMs} motion={motion} storyVisit={storyVisit} dailyAggregates={dailyAggregates} />}
    </Shell>
  );
}
