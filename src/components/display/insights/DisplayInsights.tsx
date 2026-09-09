import type { CSSProperties } from 'react';

import { EXPRESSIONS, expressionById } from '@/lib/catalog';
import type { Aggregate, Recognition } from '@/lib/contracts';

import {
  connectedRecognitions,
  expressionColor,
  expressionCountsFor,
  formatImpactPeriod,
  safeAggregateNumber,
  sharedExpressionId,
  type ImpactAggregate,
} from './insights-data';
import styles from './DisplayInsights.module.css';

export type MonthlyImpactProps = {
  aggregate: ImpactAggregate | null | undefined;
  className?: string;
};

export type NineExpressionsProps = {
  className?: string;
};

export type SharedExpressionProps = {
  recognitions: readonly Recognition[] | null | undefined;
  expressionId?: number | null;
  className?: string;
};

type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function styleVars(vars: Record<`--${string}`, string | number>): StyleWithVars {
  return vars as StyleWithVars;
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

export function MonthlyImpact({ aggregate, className }: MonthlyImpactProps) {
  const counts = expressionCountsFor(aggregate);

  return (
    <section
      className={joinClasses(styles.screen, styles.impactScreen, className)}
      aria-labelledby="monthly-impact-title"
      data-testid="monthly-impact"
      data-scope="local-month"
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
        <>
          <div className={styles.impactTotal} data-testid="monthly-impact-total">
            <span className={styles.impactTotalNumber}>{safeAggregateNumber(aggregate.expressionTotal)}</span>
            <span className={styles.impactTotalLabel}>shared local expressions</span>
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
        </>
      ) : (
        <EmptyState title="Monthly impact is ready." message="Shared totals will appear after the next verified snapshot." />
      )}
    </section>
  );
}

export function NineExpressions({ className }: NineExpressionsProps) {
  return (
    <section
      className={joinClasses(styles.screen, styles.expressionsScreen, className)}
      aria-labelledby="nine-expressions-title"
      data-testid="nine-expressions"
    >
      <header className={styles.screenHeader}>
        <p className={styles.eyebrow}>THE NINE EXPRESSIONS</p>
        <h2 id="nine-expressions-title">Words that make room for peace</h2>
        <p className={styles.subline}>Official order</p>
      </header>

      <div className={styles.expressionLayout}>
        <ol className={styles.expressionWave} aria-label="Official expression order">
          {EXPRESSIONS.map((item, index) => (
            <li key={item.id}>
              <div
                className={styles.waveBar}
                style={styleVars({ '--wave-color': item.color, '--wave-index': index })}
                data-testid="expression-wave-step"
                data-expression-id={item.id}
              >
                <span className={styles.waveNumber}>{String(item.id).padStart(2, '0')}</span>
                <span className={styles.waveCaption}>Expression {item.id}</span>
              </div>
            </li>
          ))}
        </ol>

        <ol className={styles.flowerWheel} aria-label="Nine expression cards">
          {EXPRESSIONS.map((item, index) => (
            <li key={item.id}>
              <article
                className={styles.flowerCard}
                style={styleVars({ '--flower-color': item.color, '--wave-index': index })}
                data-testid="flower-expression-card"
                data-expression-id={item.id}
              >
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

export function SharedExpression({ recognitions, expressionId, className }: SharedExpressionProps) {
  const selectedId = sharedExpressionId(recognitions, expressionId);
  const connected = connectedRecognitions(recognitions, expressionId);
  const shared = selectedId == null ? null : expressionById(selectedId);
  const hasConnection = Boolean(shared && connected.length > 0);

  return (
    <section
      className={joinClasses(styles.screen, styles.sharedScreen, className)}
      aria-labelledby="shared-expression-title"
      data-testid="shared-expression"
      data-expression-id={selectedId ?? undefined}
    >
      <header className={styles.screenHeader}>
        <p className={styles.eyebrow}>SHARED EXPRESSION</p>
        <h2 id="shared-expression-title">Words that connect us</h2>
        <p className={styles.subline}>Connected recognitions</p>
      </header>

      {hasConnection && shared ? (
        <div className={styles.connectedLayout}>
          <ol className={styles.connectedList} aria-label="Connected recognitions">
            {connected.map((recognition, index) => (
              <li className={styles.connectedItem} key={recognition.id}>
                <article
                  className={styles.connectedBubble}
                  style={styleVars({ '--connected-color': expressionColor(shared.id), '--wave-index': index })}
                  data-testid="connected-recognition"
                  data-recognition-id={recognition.id}
                >
                  <h3 className={styles.connectedRecipient}>{recognition.recipient}</h3>
                  <p className={styles.connectedMessage}>{recognition.message}</p>
                </article>
              </li>
            ))}
          </ol>

          <div className={styles.heartReveal} data-testid="heart-phrase-reveal">
            <span className={styles.heartBubble} style={styleVars({ '--heart-color': shared.color })} aria-hidden="true">♥</span>
            <span className={styles.heartRibbon} style={styleVars({ '--heart-color': shared.color })} aria-hidden="true" />
            <p className={styles.heartLabel}>A phrase held in common</p>
            <h3>{shared.phrase}</h3>
            <p className={styles.heartPrinciple}>{shared.principle}</p>
          </div>
        </div>
      ) : (
        <EmptyState title="A shared expression will bloom here." message="The next verified snapshot will bring connected recognitions into view." />
      )}
    </section>
  );
}

export type DisplayInsightsProps = {
  aggregate: Aggregate | null | undefined;
  recognitions: readonly Recognition[] | null | undefined;
  expressionId?: number | null;
  screen?: DisplayInsightScreen;
};

export type DisplayInsightScreen = 'impact' | 'expressions' | 'shared-expression';

export function DisplayInsights({ aggregate, recognitions, expressionId, screen = 'impact' }: DisplayInsightsProps) {
  return (
    <div className={styles.insights} data-testid="display-insights">
      {screen === 'impact' ? <MonthlyImpact aggregate={aggregate} /> : null}
      {screen === 'expressions' ? <NineExpressions /> : null}
      {screen === 'shared-expression' ? <SharedExpression recognitions={recognitions} expressionId={expressionId} /> : null}
    </div>
  );
}
