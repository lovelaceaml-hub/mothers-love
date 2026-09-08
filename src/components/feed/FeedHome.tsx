'use client';

import Link from 'next/link';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, expressionById } from '@/lib/catalog';

import styles from './FeedHome.module.css';
import { ReactionButton, usePublicFeed, type PublicFeedStatus } from './PublicFeedProvider';
import type { PublicFeedItem } from './feed-types';

function FeedDecorations() {
  return (
    <div className={styles.decorations} aria-hidden="true">
      <span className={`${styles.bubble} ${styles.bubbleBlue}`} data-motion-element="decorative" />
      <span className={`${styles.bubble} ${styles.bubbleLavender}`} data-motion-element="decorative" />
      <span className={`${styles.bubble} ${styles.bubbleLime}`} data-motion-element="decorative" />
      <span className={`${styles.bubble} ${styles.bubbleCoral}`} data-motion-element="decorative" />
      <svg className={styles.leafTop} data-motion-element="decorative" viewBox="0 0 90 90" focusable="false">
        <path d="M78 12C47 15 23 34 19 65c21-1 42-14 59-53Z" fill="currentColor" />
        <path d="M19 65c16-13 28-24 43-39" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className={styles.leafBottom} data-motion-element="decorative" viewBox="0 0 90 90" focusable="false">
        <path d="M12 78C15 46 34 23 65 19c-1 21-14 42-53 59Z" fill="currentColor" />
        <path d="M65 19C52 35 40 47 21 63" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FeedCard({ item }: { item: PublicFeedItem }) {
  const { reactions, toggleReaction, retryReactions } = usePublicFeed();
  const expressions = item.expressionIds
    .map((expressionId) => expressionById(expressionId))
    .filter((expression): expression is NonNullable<typeof expression> => Boolean(expression));

  return (
    <article className={styles.feedCard} aria-labelledby={`feed-recipient-${item.id}`}>
      <div className={styles.cardAccent} aria-hidden="true" />
      <div className={styles.cardHeader}>
        <p className={styles.cardEyebrow}>A recognition for</p>
        <h3 id={`feed-recipient-${item.id}`}>{item.recipient}</h3>
      </div>
      <p className={styles.message}>{item.message}</p>
      <ul className={styles.expressionList} aria-label="Selected expressions">
        {expressions.map((expression) => (
          <li key={expression.id}>{expression.phrase}</li>
        ))}
      </ul>
      <div className={styles.reactionRow}>
        <ReactionButton
          item={item}
          reaction={reactions[item.id]}
          onToggle={() => toggleReaction(item)}
          onRetry={retryReactions}
        />
      </div>
    </article>
  );
}

function Header() {
  return (
    <header className={styles.header}>
      <h1>{CAMPAIGN_TITLE}</h1>
      <p className={styles.tagline}>{CAMPAIGN_TAGLINE}</p>
      <Link className={styles.primaryAction} href="/recognize" data-motion-element="attention">
        Share a recognition
        <span aria-hidden="true">↗</span>
      </Link>
    </header>
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
        <button className={styles.secondaryAction} type="button" onClick={onRetry}>Try again</button>
      </section>
    );
  }

  return (
    <section className={styles.stateCard} aria-live="polite">
      <span className={styles.stateMark} aria-hidden="true">♡</span>
      <h2>No recognitions yet</h2>
      <p>Be the first to share a kind word.</p>
      <Link className={styles.secondaryAction} href="/recognize">Share a recognition</Link>
    </section>
  );
}

export function FeedHome() {
  const { items, status, retry } = usePublicFeed();

  return (
    <main className={styles.page}>
      <FeedDecorations />
      <div className={styles.shell}>
        <Header />

        <div className={styles.feedSection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.cardEyebrow}>Live, newest first</p>
              <h2 id="recent-recognitions-title">Recent recognitions</h2>
            </div>
          </div>

          <div
            className={styles.feedViewport}
            role="region"
            tabIndex={0}
            aria-labelledby="recent-recognitions-title"
          >
            {status === 'ready' && items.length > 0 ? (
              <div className={styles.feedList}>
                {items.map((item) => <FeedCard key={item.id} item={item} />)}
              </div>
            ) : (
              <FeedStateCard status={status} onRetry={retry} />
            )}
          </div>
        </div>

        <footer className={styles.footer}>
          <nav className={styles.footerLinks} aria-label="Campaign links">
            <Link href="/expressions">Explore the nine expressions</Link>
            <Link href="/privacy">Sharing guide</Link>
            <span className={styles.footerUtilityLinks}>
              <Link href="/admin/login">Admin</Link>
              <Link href="/display">TV View</Link>
            </span>
          </nav>
        </footer>
      </div>
    </main>
  );
}
