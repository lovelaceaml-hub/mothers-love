'use client';

import Link from 'next/link';
import { Component, createRef, useState, type CSSProperties, type ReactNode } from 'react';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, EXPRESSIONS, expressionById } from '@/lib/catalog';
import { ReactionButton, usePublicFeed, type PublicFeedStatus } from './PublicFeedProvider';
import type { PublicFeedItem } from './feed-types';
import { ExpressionDrift } from '@/components/campaign/ExpressionDrift';
import styles from './HomeExperience.module.css';

const ART = '/home-art';

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Medallion({ id, className = '' }: { id: number; className?: string }) {
  const expression = expressionById(id);
  return (
    <span className={`${styles.medallion} ${className}`} style={{ '--expression-color': expression?.color ?? '#e6ddca' } as CSSProperties} aria-hidden="true">
      {/* These are local, extracted campaign illustrations, not emoji. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}/icon${id}.webp`} width="48" height="48" alt="" draggable="false" />
    </span>
  );
}

function WelcomeArt() {
  return (
    <div className={styles.welcomeArt} aria-hidden="true">
      <div className={styles.arch} />
      <span className={`${styles.decorativeBubble} ${styles.bubbleOne}`} data-motion-element="decorative" />
      <span className={`${styles.decorativeBubble} ${styles.bubbleTwo}`} data-motion-element="decorative" />
      <Medallion id={2} className={styles.heroMedallionOne} />
      <Medallion id={8} className={styles.heroMedallionTwo} />
      <Medallion id={6} className={styles.heroMedallionThree} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.communityArt} src={`${ART}/community.webp`} width="1000" height="340" alt="" fetchPriority="high" draggable="false" />
    </div>
  );
}

function FeedCard({ item }: { item: PublicFeedItem }) {
  const { reactions, toggleReaction, retryReactions } = usePublicFeed();
  const expressions = item.expressionIds
    .map(expressionById)
    .filter((expression): expression is NonNullable<typeof expression> => Boolean(expression));

  return (
    <article className={styles.feedCard} data-recognition-id={item.id} aria-labelledby={`feed-recipient-${item.id}`}>
      <div className={styles.cardHeader}>
        {expressions[0] && <Medallion id={expressions[0].id} className={styles.recipientMedallion} />}
        <div className={styles.cardHeaderCopy}>
          <p className={styles.eyebrow}>A recognition for</p>
          <h3 id={`feed-recipient-${item.id}`}>{item.recipient}</h3>
        </div>
      </div>
      <p className={styles.message}>{item.message}</p>
      <div className={styles.cardFooter}>
        <ul className={styles.expressionList} aria-label="Selected expressions">
          {expressions.map((expression) => (
            <li key={expression.id} style={{ '--expression-color': expression.color } as CSSProperties}>
              <Medallion id={expression.id} className={styles.phraseMedallion} />
              <span>{expression.phrase}</span>
            </li>
          ))}
        </ul>
        <div className={styles.reactionRow}>
          <ReactionButton item={item} reaction={reactions[item.id]} onToggle={() => toggleReaction(item)} onRetry={retryReactions} />
        </div>
      </div>
    </article>
  );
}

function FeedStateCard({ status, onRetry }: { status: PublicFeedStatus; onRetry: () => void }) {
  if (status === 'loading' || status === 'hidden') {
    return (
      <section className={styles.stateCard} aria-live="polite" aria-busy="true">
        <span className={styles.loadingDots} aria-hidden="true"><i /><i /><i /></span>
        <h2>Loading recognitions</h2>
      </section>
    );
  }
  if (status === 'error') {
    return (
      <section className={styles.stateCard} role="alert">
        <span className={styles.stateMark} aria-hidden="true">!</span>
        <h2>Unable to load recognitions</h2>
        <button className={styles.secondaryAction} type="button" onClick={onRetry}>Try again<Arrow /></button>
      </section>
    );
  }
  return (
    <section className={styles.stateCard} aria-live="polite">
      <Medallion id={2} className={styles.emptyMedallion} />
      <h2>No recognitions yet</h2>
      <p>Be the first to share a kind word.</p>
      <Link className={styles.secondaryAction} href="/recognize">Share a recognition<Arrow /></Link>
    </section>
  );
}

type FeedViewportProps = { status: PublicFeedStatus; children: ReactNode };
type ReadingSnapshot = { atTop: boolean; anchors: Array<{ id: string; top: number }> };

// Measure the current DOM immediately before React changes it, not in a scroll
// listener that may still be queued when a poll arrives. Store no personal text.
class ReadingViewport extends Component<FeedViewportProps, Record<string, never>, ReadingSnapshot | null> {
  private viewportRef = createRef<HTMLDivElement>();

  getSnapshotBeforeUpdate(previous: Readonly<FeedViewportProps>): ReadingSnapshot | null {
    const viewport = this.viewportRef.current;
    if (!viewport || previous.status !== 'ready' || this.props.status !== 'ready') return null;
    const top = viewport.getBoundingClientRect().top;
    return {
      atTop: viewport.scrollTop < 2,
      anchors: Array.from(viewport.querySelectorAll<HTMLElement>('[data-recognition-id]'))
        .filter(node => node.getBoundingClientRect().bottom > top + 2)
        .map(node => ({ id: node.dataset.recognitionId!, top: node.getBoundingClientRect().top - top })),
    };
  }

  componentDidUpdate(_previous: Readonly<FeedViewportProps>, _state: Readonly<Record<string, never>>, snapshot: ReadingSnapshot | null) {
    const viewport = this.viewportRef.current;
    if (!viewport) return;
    if (!snapshot || snapshot.atTop) {
      viewport.scrollTop = 0;
      return;
    }
    const nodes = Array.from(viewport.querySelectorAll<HTMLElement>('[data-recognition-id]'));
    for (const anchor of snapshot.anchors) {
      const node = nodes.find(candidate => candidate.dataset.recognitionId === anchor.id);
      if (!node) continue;
      viewport.scrollTop += node.getBoundingClientRect().top - viewport.getBoundingClientRect().top - anchor.top;
      break;
    }
  }

  render() {
    return <div id="recent-recognitions" className={styles.feedViewport} role="region" tabIndex={0} aria-label="Recent recognitions" ref={this.viewportRef}>{this.props.children}</div>;
  }
}

export function FeedHome() {
  const { items, status, retry } = usePublicFeed();
  const [motionPaused, setMotionPaused] = useState(false);
  const titleBreak = CAMPAIGN_TITLE.indexOf("MOTHER");

  return (
    <main className={styles.page} data-home-experience="true" data-motion-paused={motionPaused}>
      <div className={styles.atmosphere} aria-hidden="true" data-motion-element="decorative" />
      <a className={styles.skipLink} href="#recent-recognitions">Skip to recognitions</a>
      <div className={styles.shell}>
        <nav className={styles.topbar} aria-label="Main navigation">
          <Link className={styles.wordmark} href="/"><Medallion id={8} />Mother&apos;s Love</Link>
          <div className={styles.topLinks}>
            <a href="#recent-recognitions" aria-current="page">Recognitions</a>
            <Link href="/expressions">Expressions</Link>
            <Link href="/privacy">Sharing guide</Link>
          </div>
        </nav>

        <header className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <p className={styles.eyebrow}>A living campaign of appreciation</p>
            <h1><span>{CAMPAIGN_TITLE.slice(0, titleBreak)}</span><span className={styles.titleAccent}>{CAMPAIGN_TITLE.slice(titleBreak)}</span></h1>
            <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
            <Link className={styles.primaryAction} href="/recognize">Share a recognition<Arrow diagonal /></Link>
          </div>
          <WelcomeArt />
          <ExpressionDrift className={styles.mobileExpressions} />
        </header>

        <div className={styles.contentLayout}>
          <section className={styles.feedSection}>
            <div className={styles.sectionHeader}>
              <div><p className={styles.eyebrow}>Newest first</p><h2 id="feed-section-heading">Recent recognitions</h2></div>
              <span className={styles.liveLabel} data-live={status === 'ready'}><i aria-hidden="true" />{status === 'ready' ? 'Live' : status === 'empty' ? 'Newest first' : status === 'error' ? 'Unavailable' : 'Updating'}</span>
            </div>
            <ReadingViewport status={status}>
              {status === 'ready' && items.length > 0 ? (
                <div className={styles.feedList}>{items.map((item) => <FeedCard key={item.id} item={item} />)}</div>
              ) : <FeedStateCard status={status} onRetry={retry} />}
            </ReadingViewport>
          </section>

          <aside className={styles.guidePanel} aria-labelledby="expression-guide-heading">
            <p className={styles.eyebrow}>Love in everyday words</p>
            <h2 id="expression-guide-heading">The nine<br className={styles.desktopBreak} /> expressions</h2>
            <div className={styles.expressionGarden} aria-hidden="true">
              {EXPRESSIONS.map((expression) => <Medallion key={expression.id} id={expression.id} />)}
            </div>
            <Link className={styles.guideLink} href="/expressions">Explore the nine expressions<Arrow /></Link>
            <div className={styles.guideDivider} />
            <Link className={styles.quietLink} href="/privacy">Read the sharing guide<Arrow /></Link>
          </aside>
        </div>

        <footer className={styles.footer}>
          <p>{CAMPAIGN_TAGLINE}</p>
          <nav className={styles.utilityLinks} aria-label="Campaign links">
            <Link href="/display"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="M8 21h8m-4-4v4" stroke="currentColor" strokeWidth="1.5" /></svg>TV View</Link>
            <Link href="/admin/login">Admin</Link>
            <button className={styles.motionToggle} type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused((paused) => !paused)}>
              <svg viewBox="0 0 20 20" aria-hidden="true" fill="currentColor">{motionPaused ? <path d="m6 3 10 7-10 7Z" /> : <path d="M5 3h3v14H5zm7 0h3v14h-3z" />}</svg>
              {motionPaused ? 'Resume animation' : 'Pause animation'}
            </button>
          </nav>
        </footer>
      </div>
    </main>
  );
}
