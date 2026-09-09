'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';

import { EXPRESSIONS, expressionById } from '@/lib/catalog';
import type { Aggregate, DisplayMotion, Recognition } from '@/lib/contracts';

import {
  connectedRecognitions,
  expressionColor,
  expressionCountsFor,
  formatImpactPeriod,
  INSIGHT_MOTION_CLASSES,
  insightStoryPhaseAt,
  normalizeElapsedMs,
  safeAggregateNumber,
  sharedExpressionId,
  type ImpactAggregate,
} from './insights-data';
import styles from './DisplayInsights.module.css';

export type InsightMotionProps = {
  className?: string;
  /** The display coordinator owns this clock. The view creates no timers. */
  elapsedMs?: number;
  /** Explicit owner motion setting. Lively is allowed to override OS preference. */
  motion?: DisplayMotion;
};

export type MonthlyImpactProps = InsightMotionProps & {
  aggregate: ImpactAggregate | null | undefined;
};

export type NineExpressionsProps = InsightMotionProps;

export type SharedExpressionProps = InsightMotionProps & {
  recognitions: readonly Recognition[] | null | undefined;
  expressionId?: number | null;
};

type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function styleVars(vars: Record<`--${string}`, string | number>): StyleWithVars {
  return vars as StyleWithVars;
}

function normalizedMotion(motion?: DisplayMotion): DisplayMotion {
  return motion && INSIGHT_MOTION_CLASSES[motion] ? motion : 'standard';
}

function screenClass(variant: 'impactScreen' | 'expressionsScreen' | 'sharedScreen', motion?: DisplayMotion, className?: string): string {
  const resolvedMotion = normalizedMotion(motion);
  return joinClasses(styles.screen, styles[variant], styles[INSIGHT_MOTION_CLASSES[resolvedMotion]], className);
}

function screenStyle(): StyleWithVars { return styleVars({ '--story-elapsed': '0ms' }); }

function useStoryClock(elapsedMs?: number) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (elapsedMs === undefined || !ref.current) return;
    for (const animation of ref.current.getAnimations({ subtree: true })) {
      // Synchronize narrative reveals without advancing the CSS clock twice.
      if ('animationName' in animation && /impactTotalLight|impactFlowReveal|impactRibbonDraw|radialFlowerExit|petalColorWave|expressionCardUnfold|connectedRecognitionArrive|sharedHeartReveal|sharedCircleReveal|heartRibbonWeave|sharedCopyReveal/.test(String(animation.animationName))) {
        animation.currentTime = normalizeElapsedMs(elapsedMs);
      }
    }
  }, [elapsedMs]);
  return ref;
}

function screenMotion(motion?: DisplayMotion): DisplayMotion {
  return normalizedMotion(motion);
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className={styles.emptyState} data-testid="insights-empty-state">
      <div className={styles.emptyStateInner}>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </div>
  );
}

export function MonthlyImpact({ aggregate, className, elapsedMs, motion = 'standard' }: MonthlyImpactProps) {
  const counts = expressionCountsFor(aggregate);
  const resolvedMotion = screenMotion(motion);
  const normalizedElapsed = normalizeElapsedMs(elapsedMs);
  const storyRef = useStoryClock(elapsedMs);

  return (
    <section
      className={screenClass('impactScreen', resolvedMotion, className)}
      style={screenStyle()}
      ref={storyRef}
      aria-labelledby="monthly-impact-title"
      data-testid="monthly-impact"
      data-scope="local-month"
      data-motion={resolvedMotion}
      data-elapsed-ms={normalizedElapsed}
      data-story-phase={insightStoryPhaseAt('impact', normalizedElapsed)}
    >
      <header className={styles.screenHeader}>
        <p className={styles.eyebrow}>THIS MONTH&apos;S SHARED MOMENT</p>
        <h2 id="monthly-impact-title">Expressions of Mother&apos;s Love Recognized</h2>
        {aggregate ? (
          <p className={styles.subline}>
            {safeAggregateNumber(aggregate.recognitions)} recognitions shared in {formatImpactPeriod(aggregate.periodStart)}
          </p>
        ) : null}
      </header>

      {aggregate ? (
        <div className={styles.impactStoryboard} data-testid="monthly-impact-storyboard">
          <div className={styles.impactTotal} data-testid="monthly-impact-total">
            <span className={styles.impactTotalNumber}>{safeAggregateNumber(aggregate.expressionTotal)}</span>
            <span className={styles.impactTotalLabel}>shared local expressions</span>
          </div>

          <div className={styles.impactRibbonField} aria-hidden="true">
            {EXPRESSIONS.map((item, index) => (
              <span
                className={styles.impactFlowRibbon}
                key={item.id}
                style={styleVars({ '--ribbon-color': item.color, '--wave-index': index })}
                data-testid="monthly-impact-flow-ribbon"
                data-expression-id={item.id}
              />
            ))}
          </div>

          <ol className={styles.ribbonList} aria-label="Monthly expression counts">
            {EXPRESSIONS.map((item, index) => (
              <li className={styles.ribbonItem} key={item.id}>
                <div
                  className={styles.ribbon}
                  style={styleVars({ '--ribbon-color': item.color, '--wave-index': index })}
                  data-testid="monthly-impact-ribbon"
                  data-expression-id={item.id}
                >
                  <span className={styles.ribbonNumber} aria-hidden="true">{String(item.id).padStart(2, '0')}</span>
                  <span className={styles.ribbonPhrase}>{item.phrase}</span>
                  <span className={styles.ribbonCount} aria-label={`${counts[index]} recognitions`}>{counts[index]}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <EmptyState title="Monthly impact is ready." message="Shared totals will appear after the next verified snapshot." />
      )}
    </section>
  );
}

export function NineExpressions({ className, elapsedMs, motion = 'standard' }: NineExpressionsProps) {
  const resolvedMotion = screenMotion(motion);
  const normalizedElapsed = normalizeElapsedMs(elapsedMs);
  const storyRef = useStoryClock(elapsedMs);

  return (
    <section
      className={screenClass('expressionsScreen', resolvedMotion, className)}
      style={screenStyle()}
      ref={storyRef}
      aria-labelledby="nine-expressions-title"
      data-testid="nine-expressions"
      data-motion={resolvedMotion}
      data-elapsed-ms={normalizedElapsed}
      data-story-phase={insightStoryPhaseAt('nine', normalizedElapsed)}
    >
      <header className={styles.screenHeader}>
        <p className={styles.eyebrow}>THE NINE EXPRESSIONS</p>
        <h2 id="nine-expressions-title">Words that make room for peace</h2>
        <p className={styles.subline}>Official order</p>
      </header>

      <div className={styles.nineStoryboard} data-testid="nine-expressions-storyboard">
        <div className={styles.radialFlower} aria-hidden="true" data-testid="nine-radial-flower">
          <span className={styles.flowerCenter}>THE NINE<span>EXPRESSIONS</span></span>
          {EXPRESSIONS.map((item, index) => (
            <span
              className={styles.radialPetal}
              key={item.id}
              style={styleVars({
                '--petal-angle': `${index * 40 - 90}deg`,
                '--wave-color': item.color,
                '--wave-index': index,
              })}
              data-testid="expression-wave-step"
              data-story-role="radial-petal"
              data-expression-id={item.id}
            >
              <span className={styles.radialPetalNumber}>{String(item.id).padStart(2, '0')}</span>
            </span>
          ))}
        </div>

        <ol className={styles.expressionCards} aria-label="Nine expression cards" data-testid="nine-expression-cards">
          {EXPRESSIONS.map((item, index) => (
            <li key={item.id} style={styleVars({ '--wave-index': index })}>
              <article
                className={styles.flowerCard}
                style={styleVars({
                  '--flower-color': item.color,
                  '--wave-index': index,
                  '--card-depth': `${Math.min(18, 6 + (index % 3) * 6)}px`,
                  '--card-lift': `${[6, 0, 10][index % 3]}px`,
                  '--card-tilt': `${[-0.8, 0.35, 0.8, 0, -0.65, 0.55][index % 6]}deg`,
                })}
                data-testid="flower-expression-card"
                data-expression-id={item.id}
              >
                <span className={styles.flowerCardAura} aria-hidden="true" />
                <span className={styles.flowerCardSweep} aria-hidden="true" />
                <span className={styles.flowerCardEdge} aria-hidden="true" />
                <span className={styles.flowerNumber}>{String(item.id).padStart(2, '0')}</span>
                <strong className={styles.flowerPhrase}>{item.phrase}</strong>
                <p className={styles.flowerPrinciple}>{item.principle}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function primaryRecognitionColor(recognition: Recognition, fallbackId: number): string {
  return expressionColor(recognition.expressionIds[0] ?? fallbackId);
}

export function SharedExpression({ recognitions, expressionId, className, elapsedMs, motion = 'standard' }: SharedExpressionProps) {
  const selectedId = sharedExpressionId(recognitions, expressionId);
  const connected = connectedRecognitions(recognitions, expressionId);
  const shared = selectedId == null ? null : expressionById(selectedId);
  const hasConnection = Boolean(shared && connected.length > 0);
  const resolvedMotion = screenMotion(motion);
  const normalizedElapsed = normalizeElapsedMs(elapsedMs);
  const storyRef = useStoryClock(elapsedMs);

  return (
    <section
      className={screenClass('sharedScreen', resolvedMotion, className)}
      style={screenStyle()}
      ref={storyRef}
      aria-labelledby="shared-expression-title"
      data-testid="shared-expression"
      data-expression-id={selectedId ?? undefined}
      data-motion={resolvedMotion}
      data-elapsed-ms={normalizedElapsed}
      data-story-phase={insightStoryPhaseAt('shared', normalizedElapsed)}
    >
      <header className={styles.screenHeader}>
        <p className={styles.eyebrow}>SHARED EXPRESSION</p>
        <h2 id="shared-expression-title">Words that connect us</h2>
        <p className={styles.subline}>Connected recognitions</p>
      </header>

      {hasConnection && shared ? (
        <div className={styles.connectedLayout} data-testid="shared-expression-storyboard">
          <ol className={styles.connectedList} aria-label="Connected recognitions">
            {connected.map((recognition, index) => (
              <li className={styles.connectedItem} key={recognition.id}>
                <article
                  className={styles.connectedBubble}
                  style={styleVars({
                    '--connected-color': primaryRecognitionColor(recognition, shared.id),
                    '--wave-index': index,
                    '--message-size': `${recognition.message.length > 300 ? 11 : recognition.message.length > 150 ? 14 : 19}px`,
                    '--circle-depth': `${Math.min(16, 4 + (index % 3) * 6)}px`,
                  })}
                  data-testid="connected-recognition"
                  data-recognition-id={recognition.id}
                >
                  <span className={styles.connectedBubbleHalo} aria-hidden="true" />
                  <span className={styles.connectedBubbleSweep} aria-hidden="true" />
                  <div className={styles.connectedBubbleContent}>
                    <h3 className={styles.connectedRecipient}>{recognition.recipient}</h3>
                    <p className={styles.connectedMessage}>{recognition.message}</p>
                  </div>
                </article>
              </li>
            ))}
          </ol>

          <div className={styles.heartReveal} data-testid="heart-phrase-reveal">
            <div className={styles.heartRibbonStage} data-testid="ribbon-heart" aria-hidden="true">
              {connected.map((recognition, index) => (
                <span
                  className={styles.heartRibbonStrand}
                  key={recognition.id}
                  style={styleVars({
                    '--ribbon-color': primaryRecognitionColor(recognition, shared.id),
                    '--strand-angle': `${-38 + (index % 6) * 15}deg`,
                    '--wave-index': index,
                  })}
                  data-testid="heart-ribbon-strand"
                  data-recognition-id={recognition.id}
                />
              ))}
              <span className={styles.heartCenterGlow} style={styleVars({ '--heart-color': shared.color })} />
            </div>

            <div className={styles.heartCopy}>
              <p className={styles.heartLabel}>A phrase held in common</p>
              <h3>{shared.phrase}</h3>
              <p className={styles.heartPrinciple}>{shared.principle}</p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="A shared expression will bloom here." message="The next verified snapshot will bring connected recognitions into view." />
      )}
    </section>
  );
}

export type DisplayInsightsProps = InsightMotionProps & {
  aggregate: Aggregate | null | undefined;
  recognitions: readonly Recognition[] | null | undefined;
  expressionId?: number | null;
  screen?: DisplayInsightScreen;
};

export type DisplayInsightScreen = 'impact' | 'expressions' | 'shared-expression';

export function DisplayInsights({ aggregate, recognitions, expressionId, screen = 'impact', className, elapsedMs, motion = 'standard' }: DisplayInsightsProps) {
  return (
    <div className={joinClasses(styles.insights, className)} data-testid="display-insights">
      {screen === 'impact' ? <MonthlyImpact aggregate={aggregate} elapsedMs={elapsedMs} motion={motion} /> : null}
      {screen === 'expressions' ? <NineExpressions elapsedMs={elapsedMs} motion={motion} /> : null}
      {screen === 'shared-expression' ? <SharedExpression recognitions={recognitions} expressionId={expressionId} elapsedMs={elapsedMs} motion={motion} /> : null}
    </div>
  );
}
