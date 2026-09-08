'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { CAMPAIGN_TAGLINE, CAMPAIGN_TITLE, expressionById } from '@/lib/catalog';

import styles from './FeedHome.module.css';
import {
  activeFeedItems,
  type PublicFeedItem,
  type VerifiedFeedSnapshot,
  verifyFeedSnapshot,
} from './feed-types';

type FeedStatus = 'loading' | 'ready' | 'empty' | 'error' | 'hidden';

type FeedState = {
  status: FeedStatus;
  snapshot: VerifiedFeedSnapshot | null;
};

function monotonicNow() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

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

function FeedStateCard({ status, onRetry }: { status: FeedStatus; onRetry: () => void }) {
  if (status === 'loading') {
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

  if (status === 'hidden') {
    return (
      <section className={styles.stateCard} aria-live="polite">
        <span className={styles.stateMark} aria-hidden="true">•</span>
        <h2>Loading recognitions</h2>
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
  const [state, setState] = useState<FeedState>({ status: 'loading', snapshot: null });
  const [motionPaused, setMotionPaused] = useState(false);
  const requestSerialRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const expiryTimerRef = useRef<number | null>(null);
  const applyVisibleItemsRef = useRef<(snapshot: VerifiedFeedSnapshot) => void>(() => undefined);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== null) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const applyVisibleItems = useCallback((snapshot: VerifiedFeedSnapshot) => {
    const items = activeFeedItems(snapshot, monotonicNow());
    setState({ status: items.length > 0 ? 'ready' : 'empty', snapshot });

    clearExpiryTimer();
    if (items.length === 0) return;

    const remainingMs = Math.min(...items.map((item) => {
      const elapsedMs = Math.max(0, monotonicNow() - snapshot.verifiedMonotonicMs);
      return Date.parse(item.expiresAt) - (snapshot.verifiedServerTimeMs + elapsedMs);
    }));
    expiryTimerRef.current = window.setTimeout(() => {
      applyVisibleItemsRef.current(snapshot);
    }, Math.max(20, remainingMs + 5));
  }, [clearExpiryTimer]);

  useEffect(() => {
    applyVisibleItemsRef.current = applyVisibleItems;
  }, [applyVisibleItems]);

  const fetchFeed = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const serial = requestSerialRef.current + 1;
    requestSerialRef.current = serial;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestStartedAt = monotonicNow();
    let timedOut = false;
    const deadline = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8_000);

    try {
      const response = await fetch('/api/feed', {
        cache: 'no-store',
        credentials: 'include',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`);
      const payload: unknown = await response.json();
      const snapshot = verifyFeedSnapshot(payload, requestStartedAt);
      if (!snapshot) throw new Error('Feed response was not valid.');
      if (serial !== requestSerialRef.current || controller.signal.aborted) return;
      applyVisibleItems(snapshot);
    } catch {
      if ((!timedOut && controller.signal.aborted) || serial !== requestSerialRef.current) return;
      clearExpiryTimer();
      setState({ status: 'error', snapshot: null });
    } finally {
      window.clearTimeout(deadline);
    }
  }, [applyVisibleItems, clearExpiryTimer]);

  useEffect(() => {
    const initialRequest = window.setTimeout(() => { void fetchFeed(); }, 0);
    const interval = window.setInterval(() => { void fetchFeed(); }, 10_000);

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        requestSerialRef.current += 1;
        controllerRef.current?.abort();
        clearExpiryTimer();
        setState({ status: 'hidden', snapshot: null });
        return;
      }

      setState({ status: 'loading', snapshot: null });
      void fetchFeed();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controllerRef.current?.abort();
      clearExpiryTimer();
    };
  }, [clearExpiryTimer, fetchFeed]);

  const items = state.snapshot ? activeFeedItems(state.snapshot, monotonicNow()) : [];
  const status = state.status === 'ready' && items.length === 0 ? 'empty' : state.status;

  return (
    <main className={`${styles.page}${motionPaused ? ` ${styles.motionPaused}` : ''}`}>
      <FeedDecorations />
      <div className={styles.shell}>
        <Header />

        <section className={styles.feedSection} aria-labelledby="recent-recognitions-title">
          <div className={styles.sectionHeader}>
            <div>
              <h2 id="recent-recognitions-title">Recent recognitions</h2>
            </div>
          </div>

          {status === 'ready' && items.length > 0 ? (
            <div className={styles.feedList}>
              {items.map((item) => <FeedCard key={item.id} item={item} />)}
            </div>
          ) : (
            <FeedStateCard status={status} onRetry={() => { setState({ status: 'loading', snapshot: null }); void fetchFeed(); }} />
          )}
        </section>

        <footer className={styles.footer}>
          <nav className={styles.footerLinks} aria-label="Campaign links">
            <Link href="/expressions">Explore the nine expressions</Link>
            <Link href="/privacy">Sharing guide</Link>
            <span className={styles.footerUtilityLinks}>
              <Link href="/admin/login">Admin</Link>
              <Link href="/display">TV View</Link>
            </span>
          </nav>
          <button
            className={styles.motionToggle}
            type="button"
            onClick={() => setMotionPaused((paused) => !paused)}
          >
            {motionPaused ? 'Resume animation' : 'Pause animation'}
          </button>
        </footer>
      </div>
    </main>
  );
}
