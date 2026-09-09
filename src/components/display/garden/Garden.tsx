'use client';

import { useMemo, useState, type CSSProperties } from 'react';

import { EXPRESSIONS, expressionById } from '@/lib/catalog';

import {
  adaptGardenDecoration,
  arrivalModeFor,
  detailTierFor,
  entryTreatmentFor,
  GARDEN_POOL_CAP,
  gardenMessagePreview,
  isNewestGardenCard,
  nextCollectiveMilestone,
  newestGardenId,
  resolveGardenAmount,
  selectFairGarden,
  splitGardenMessage,
  type GardenAggregate,
  type GardenDecoration,
  type GardenDecorationLevel,
  type GardenEntryTreatment,
  type GardenPoolState,
  type GardenReconnectMemory,
  type GardenRecognition,
} from './model';

import styles from './Garden.module.css';

const GARDEN_LAYOUTS = [
  { left: 16, top: 25, rotation: -7, delay: -1.2, duration: 15 },
  { left: 40, top: 29, rotation: 6, delay: -4.1, duration: 17 },
  { left: 77, top: 22, rotation: -3, delay: -6.4, duration: 14 },
  { left: 68, top: 70, rotation: 8, delay: -2.8, duration: 18 },
  { left: 24, top: 74, rotation: -5, delay: -8.2, duration: 16 },
  { left: 50, top: 77, rotation: 3, delay: -10.1, duration: 19 },
  { left: 9, top: 53, rotation: 4, delay: -5.2, duration: 16 },
  { left: 90, top: 52, rotation: -8, delay: -7.7, duration: 18 },
  { left: 34, top: 54, rotation: 10, delay: -3.5, duration: 15 },
  { left: 58, top: 47, rotation: -10, delay: -9.6, duration: 17 },
  { left: 13, top: 86, rotation: 7, delay: -11.5, duration: 19 },
  { left: 87, top: 84, rotation: -4, delay: -12.6, duration: 16 },
] as const;

const BUDS = [
  { rotation: -16, delay: '-0.7s' },
  { rotation: -7, delay: '-1.8s' },
  { rotation: 4, delay: '-3.1s' },
  { rotation: 12, delay: '-2.4s' },
  { rotation: 20, delay: '-4.2s' },
  { rotation: -23, delay: '-3.7s' },
  { rotation: 27, delay: '-1.2s' },
  { rotation: -2, delay: '-4.8s' },
  { rotation: 8, delay: '-2.9s' },
] as const;

function primaryColor(record: GardenRecognition): string {
  return expressionById(record.expressionIds[0] ?? 1)?.color ?? EXPRESSIONS[0].color;
}

function gardenCardSize(record: GardenRecognition, fresh: boolean): number {
  const tier = detailTierFor(record);
  const base = tier === 'compact' ? 16.4 : tier === 'standard' ? 18.2 : 20.1;
  return base + (fresh ? 4.1 : 0);
}

type GardenTempo = 'calm' | 'standard' | 'lively';
type GardenMotion = 'still' | 'calm' | 'standard' | 'lively';

function tempoTiming(tempo: GardenTempo): { cardMultiplier: number; sparkleDuration: string; backgroundDuration: string; budDuration: string } {
  if (tempo === 'calm') return { cardMultiplier: 1.55, sparkleDuration: '10s', backgroundDuration: '24s', budDuration: '8.5s' };
  if (tempo === 'lively') return { cardMultiplier: 0.56, sparkleDuration: '3.8s', backgroundDuration: '9s', budDuration: '3.4s' };
  return { cardMultiplier: 1, sparkleDuration: '6.5s', backgroundDuration: '16s', budDuration: '5.5s' };
}

function cardStyle(
  record: GardenRecognition,
  index: number,
  records: readonly GardenRecognition[],
  nowMs: number,
  tempo: GardenTempo,
): CSSProperties {
  const layout = GARDEN_LAYOUTS[index % GARDEN_LAYOUTS.length];
  const fresh = isNewestGardenCard(record, records, nowMs);
  return {
    '--garden-left': `${layout.left}%`,
    '--garden-top': `${layout.top}%`,
    '--garden-rotation': `${layout.rotation}deg`,
    '--garden-delay': `${layout.delay}s`,
    '--garden-drift-duration': `${layout.duration * tempoTiming(tempo).cardMultiplier}s`,
    '--garden-card-size': `${gardenCardSize(record, fresh)}vw`,
    '--garden-accent': primaryColor(record),
  } as CSSProperties;
}

function sharedExpression(left: GardenRecognition, right: GardenRecognition): number | null {
  return left.expressionIds.find((id) => right.expressionIds.includes(id)) ?? null;
}

function safeClassName(className: string | undefined): string {
  return className ? ` ${className}` : '';
}

export interface GardenCardProps {
  record: GardenRecognition;
  records?: readonly GardenRecognition[];
  index?: number;
  nowMs?: number;
  treatment?: GardenEntryTreatment;
  tempo?: GardenTempo;
  reducedMotion?: boolean;
  showTrail?: boolean;
}

export function GardenCard({
  record,
  records = [record],
  index = 0,
  nowMs = 0,
  treatment = entryTreatmentFor(index),
  tempo = 'standard',
  reducedMotion = false,
  showTrail = true,
}: GardenCardProps) {
  const detail = detailTierFor(record);
  const fresh = isNewestGardenCard(record, records, nowMs);
  const message = gardenMessagePreview(record, detail);
  return (
    <div
      className={`${styles.cardSlot} ${fresh ? styles.freshCard : ''}`}
      style={cardStyle(record, index, records, nowMs, tempo)}
      data-testid="garden-card-slot"
      data-fresh={fresh ? 'true' : 'false'}
      data-detail-tier={detail}
      data-entry-treatment={treatment}
    >
      <div className={`${styles.cardMotion} ${reducedMotion ? styles.reducedMotion : ''} ${styles[`entry${treatment[0].toUpperCase()}${treatment.slice(1)}`]}`}>
        {showTrail ? <span className={styles.cardTrail} aria-hidden="true" /> : null}
        <article className={`${styles.card} ${styles[`${detail}Card`]}`} data-testid="garden-card" data-fresh={fresh ? 'true' : 'false'} data-detail-tier={detail}>
          {fresh ? <span className={styles.newLabel}>New recognition</span> : null}
          <p className={styles.recipientLabel}>THANK YOU,</p>
          <h3>{record.recipient}</h3>
          <div className={styles.expressionList} aria-label="Expressions selected">
            {record.expressionIds.map((id) => (
              <span
                className={styles.expressionChip}
                key={id}
                style={{ backgroundColor: expressionById(id)?.color ?? EXPRESSIONS[0].color }}
                title={expressionById(id)?.phrase ?? `Expression ${id}`}
              >
                #{id}
              </span>
            ))}
          </div>
          <p className={styles.message}>{message}</p>
        </article>
      </div>
    </div>
  );
}

export interface GardenSceneProps {
  records: readonly GardenRecognition[];
  amount?: 'all-active' | number;
  pool?: GardenPoolState;
  nowMs?: number;
  decoration?: GardenDecorationLevel;
  tempo?: GardenTempo;
  motion?: GardenMotion;
  requestedDecoration?: GardenDecoration;
  reducedMotion?: boolean;
  className?: string;
}

export function GardenScene({
  records,
  amount = 'all-active',
  pool,
  nowMs = 0,
  decoration = 'full',
  tempo = 'standard',
  motion = 'standard',
  requestedDecoration,
  reducedMotion = false,
  className,
}: GardenSceneProps) {
  const visibleRecords = useMemo(() => {
    const boundedCount = resolveGardenAmount(amount, records.length);
    if (!pool?.activeIds.length) return selectFairGarden(records, amount, pool?.presentationHistory);
    const byId = new Map(records.map((record) => [record.id, record]));
    const retained = pool.activeIds.map((id) => byId.get(id)).filter((record): record is GardenRecognition => Boolean(record));
    return retained.length >= boundedCount
      ? retained.slice(0, boundedCount)
      : retained.concat(selectFairGarden(records, amount, pool.presentationHistory).filter((record) => !pool.activeIds.includes(record.id))).slice(0, boundedCount);
  }, [amount, pool, records]);
  const effects = adaptGardenDecoration(decoration, requestedDecoration);
  const newestId = newestGardenId(visibleRecords);
  const timing = tempoTiming(tempo);
  const connections = visibleRecords.flatMap((left, leftIndex) => visibleRecords.slice(leftIndex + 1).flatMap((right, rightIndex) => {
    const expressionId = sharedExpression(left, right);
    if (expressionId === null) return [];
    return [{ leftIndex, rightIndex: leftIndex + rightIndex + 1, expressionId }];
  }));
  return (
    <section
      className={`${styles.scene}${safeClassName(className)} ${reducedMotion ? styles.reducedMotion : ''}`}
      aria-label="Recognition Garden"
      data-testid="recognition-garden"
      data-garden-count={visibleRecords.length}
      data-garden-cap={GARDEN_POOL_CAP}
      data-decoration={decoration}
      data-tempo={tempo}
      data-newest-id={newestId ?? ''}
      data-motion={motion}
      style={{
        '--garden-sparkle-duration': timing.sparkleDuration,
        '--garden-background-duration': timing.backgroundDuration,
        '--garden-bud-duration': timing.budDuration,
      } as CSSProperties}
    >
      <div className={styles.board} data-testid="garden-board" data-decoration={decoration}>
        {effects.background ? <div className={styles.backgroundWash} aria-hidden="true" /> : null}
        {effects.sparkles ? (
          <div className={styles.sparkleField} aria-hidden="true">
            <span className={`${styles.sparkle} ${styles.sparkleOne}`} />
            <span className={`${styles.sparkle} ${styles.sparkleTwo}`} />
            <span className={`${styles.sparkle} ${styles.sparkleThree}`} />
            <span className={`${styles.sparkle} ${styles.sparkleFour}`} />
          </div>
        ) : null}
        {effects.constellations && connections.length ? (
          <svg className={styles.constellation} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {connections.map(({ leftIndex, rightIndex, expressionId }) => {
              const left = GARDEN_LAYOUTS[leftIndex % GARDEN_LAYOUTS.length];
              const right = GARDEN_LAYOUTS[rightIndex % GARDEN_LAYOUTS.length];
              return <line key={`${leftIndex}-${rightIndex}`} x1={left.left} y1={left.top} x2={right.left} y2={right.top} stroke={expressionById(expressionId)?.color ?? EXPRESSIONS[0].color} />;
            })}
          </svg>
        ) : null}
        {visibleRecords.length ? (
          <div className={styles.cards} data-testid="garden-cards">
            {visibleRecords.map((record, index) => (
              <GardenCard
                key={record.id}
                record={record}
                records={visibleRecords}
                index={index}
                nowMs={nowMs}
                treatment={entryTreatmentFor(index, pool?.rotation ?? 0)}
                tempo={tempo}
                reducedMotion={reducedMotion}
                showTrail={effects.trails}
              />
            ))}
          </div>
        ) : <WaitingBudsScene reducedMotion={reducedMotion} />}
      </div>
    </section>
  );
}

export interface WaitingBudsSceneProps {
  reducedMotion?: boolean;
  className?: string;
}

export function WaitingBudsScene({ reducedMotion = false, className }: WaitingBudsSceneProps) {
  return (
    <div className={`${styles.waitingBuds}${safeClassName(className)} ${reducedMotion ? styles.reducedMotion : ''}`} data-testid="waiting-buds" aria-live="polite">
      <div className={styles.budField} aria-hidden="true">
        {BUDS.map((bud, index) => <span key={index} className={styles.bud} style={{ '--bud-rotation': `${bud.rotation}deg`, '--bud-delay': bud.delay } as CSSProperties} />)}
      </div>
      <h2>The garden is ready.</h2>
      <p>Share a recognition to help a new expression of love arrive.</p>
    </div>
  );
}

export const GardenEmptyScene = WaitingBudsScene;

export interface GardenArrivalSceneProps {
  arrivals: readonly GardenRecognition[];
  rotation?: number;
  reducedMotion?: boolean;
  className?: string;
}

export function GardenArrivalScene({ arrivals, rotation = 0, reducedMotion = false, className }: GardenArrivalSceneProps) {
  const mode = arrivalModeFor(arrivals.length);
  const boundedArrivals = arrivals.slice(0, 12);
  if (mode === 'grouped') {
    return (
      <section className={`${styles.arrival}${safeClassName(className)} ${reducedMotion ? styles.reducedMotion : ''}`} aria-live="polite" data-testid="garden-arrival" data-arrival-mode="grouped" data-arrival-count={arrivals.length}>
        <div className={styles.groupedArrival}>
          <span className={styles.groupedBadge}>A group is growing</span>
          <h2>{arrivals.length} new recognitions are growing together.</h2>
          <p>The garden will make room for each one in a fair readable rotation.</p>
          <div className={styles.arrivalCards} aria-label="New recognition recipients">
            {boundedArrivals.slice(0, 6).map((record, index) => <ArrivalCard key={record.id} record={record} index={index} treatment={entryTreatmentFor(index, rotation)} />)}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={`${styles.arrival}${safeClassName(className)} ${reducedMotion ? styles.reducedMotion : ''}`} aria-live="polite" data-testid="garden-arrival" data-arrival-mode="individual" data-arrival-count={arrivals.length}>
      <div>
        <span className={styles.groupedBadge}>A new recognition is growing</span>
        <h2>Welcome a new expression of love.</h2>
        <div className={styles.arrivalCards} aria-label="New recognitions">
          {boundedArrivals.map((record, index) => <ArrivalCard key={record.id} record={record} index={index} treatment={entryTreatmentFor(index, rotation)} />)}
        </div>
      </div>
    </section>
  );
}

function ArrivalCard({ record, index, treatment }: { record: GardenRecognition; index: number; treatment: GardenEntryTreatment }) {
  return (
    <article className={`${styles.arrivalCard} ${styles[`entry${treatment[0].toUpperCase()}${treatment.slice(1)}`]}`} style={{ '--garden-accent': primaryColor(record), '--arrival-delay': `${index * 90}ms` } as CSSProperties} data-testid="garden-arrival-card" data-entry-treatment={treatment}>
      <strong>{record.recipient}</strong>
      <small>{record.expressionIds.length} expressions selected</small>
    </article>
  );
}

export interface GardenMessageReaderProps {
  message: string;
  recipient?: string;
  pageIndex?: number;
  onPageChange?: (pageIndex: number, pageCount: number) => void;
  reducedMotion?: boolean;
  className?: string;
}

export function GardenMessageReader({ message, recipient, pageIndex, onPageChange, reducedMotion = false, className }: GardenMessageReaderProps) {
  const pages = useMemo(() => splitGardenMessage(message), [message]);
  const [internalState, setInternalState] = useState(() => ({ message, page: 0 }));
  const controlled = pageIndex !== undefined;
  const internalPage = internalState.message === message ? internalState.page : 0;
  const currentPage = Math.min(Math.max(0, controlled ? pageIndex : internalPage), pages.length - 1);

  const changePage = (nextPage: number) => {
    const safePage = Math.min(Math.max(0, nextPage), pages.length - 1);
    if (!controlled) setInternalState({ message, page: safePage });
    onPageChange?.(safePage, pages.length);
  };

  return (
    <section className={`${styles.messageReader}${safeClassName(className)} ${reducedMotion ? styles.reducedMotion : ''}`} data-testid="garden-message-reader" data-page-index={currentPage} data-page-count={pages.length} aria-label={recipient ? `Full message for ${recipient}` : 'Full recognition message'}>
      <p className={styles.readerEyebrow}>FULL RECOGNITION</p>
      {recipient ? <h2 className={styles.readerRecipient}>Thank you, {recipient}.</h2> : null}
      <p className={styles.readerMessage} aria-live="polite">{pages[currentPage]}</p>
      {pages.length > 1 ? (
        <div className={styles.readerControls}>
          <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 0}>Previous</button>
          <span className={styles.readerLabel}>Reading {currentPage + 1} of {pages.length}</span>
          <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pages.length - 1}>Next</button>
        </div>
      ) : null}
    </section>
  );
}

export interface GardenMilestoneSceneProps {
  aggregate: GardenAggregate;
  approvalTotal?: number;
  celebrated?: readonly number[];
  reducedMotion?: boolean;
  className?: string;
}

export function GardenMilestoneScene({ aggregate, approvalTotal = aggregate.recognitions, celebrated = [], reducedMotion = false, className }: GardenMilestoneSceneProps) {
  const milestone = nextCollectiveMilestone(approvalTotal, celebrated);
  if (milestone === null) return null;
  return (
    <section className={`${styles.milestone}${safeClassName(className)} ${reducedMotion ? styles.reducedMotion : ''}`} aria-live="polite" data-testid="garden-milestone" data-milestone={milestone}>
      <span className={styles.milestoneFlower} aria-hidden="true" />
      <p className={styles.readerEyebrow}>A SHARED MILESTONE</p>
      <h2>{milestone} recognitions have grown together.</h2>
      <p>{aggregate.expressionTotal} expressions of Mother&apos;s Love are making room for peace.</p>
    </section>
  );
}

export interface GardenReconnectNoticeProps {
  memory: GardenReconnectMemory;
  className?: string;
}

export function GardenReconnectNotice({ memory, className }: GardenReconnectNoticeProps) {
  if (memory.status === 'connected') return null;
  const retained = memory.records.length > 0;
  return (
    <aside className={`${styles.groupedArrival}${safeClassName(className)}`} data-testid="garden-reconnect" data-reconnect-status={memory.status} aria-live="polite">
      <span className={styles.groupedBadge}>{memory.status === 'reconnecting' ? 'Checking the connection' : 'Display safety mode'}</span>
      <h2>{retained ? 'The garden is holding its last safe view.' : 'Messages are hidden for now.'}</h2>
      <p>{retained ? 'The current public view remains in memory while the connection is checked.' : 'The garden will return when a safe public view is available.'}</p>
    </aside>
  );
}
