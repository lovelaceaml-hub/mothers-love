'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  activeFeedItems,
  type PublicFeedItem,
  type VerifiedFeedSnapshot,
  verifyFeedSnapshot,
} from './feed-types';
import styles from './FeedHome.module.css';

export type ReactionItem = {
  id: string;
  count: number;
  liked: boolean;
};

type ReactionEntry = {
  item?: ReactionItem;
  status: 'loading' | 'ready' | 'unavailable' | 'error';
  pending: boolean;
  error?: string;
};

export type PublicFeedStatus = 'loading' | 'ready' | 'empty' | 'error' | 'hidden';

type PublicFeedContextValue = {
  items: PublicFeedItem[];
  status: PublicFeedStatus;
  retry: () => void;
  reactions: Readonly<Record<string, ReactionEntry>>;
  toggleReaction: (item: PublicFeedItem) => void;
  retryReactions: () => void;
};

const defaultContext: PublicFeedContextValue = {
  items: [],
  status: 'loading',
  retry: () => undefined,
  reactions: {},
  toggleReaction: () => undefined,
  retryReactions: () => undefined,
};

const PublicFeedContext = createContext<PublicFeedContextValue>(defaultContext);

const PUBLIC_PATHS = new Set(['/','/recognize','/expressions','/privacy']);

function isPublicPage(pathname: string | null) {
  return pathname !== null && PUBLIC_PATHS.has(pathname);
}

function monotonicNow() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeReactionPayload(value: unknown): ReactionItem[] | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > 30) return null;

  const seen = new Set<string>();
  const items: ReactionItem[] = [];
  for (const entry of value.items) {
    if (!isRecord(entry)) return null;
    const { id, count, liked } = entry;
    if (
      typeof id !== 'string' ||
      id.length === 0 ||
      seen.has(id) ||
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      typeof liked !== 'boolean'
    ) return null;
    seen.add(id);
    items.push({ id, count, liked });
  }
  return items;
}

function decodeReactionItem(value: unknown): ReactionItem | null {
  if (!isRecord(value)) return null;
  const { id, count, liked } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof count !== 'number' ||
    !Number.isSafeInteger(count) ||
    count < 0 ||
    typeof liked !== 'boolean'
  ) return null;
  return { id, count, liked };
}

export async function fetchReactionCounts(ids: readonly string[], signal?: AbortSignal) {
  const boundedIds = [...new Set(ids)].slice(0, 30);
  if (boundedIds.length === 0) return new Map<string, ReactionItem>();
  const response = await fetch(`/api/reactions?ids=${encodeURIComponent(boundedIds.join(','))}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Reaction request failed with status ${response.status}`);
  const payload = decodeReactionPayload(await response.json());
  if (!payload) throw new Error('Reaction response was not valid.');
  return new Map(payload.map((item) => [item.id, item]));
}

export function ReactionCount({ count }: { count: number }) {
  return <span className={styles.publicFeedCompanionCount}>{count} hearts</span>;
}

function FeedState({ compact = false }: { compact?: boolean }) {
  const { items, status, retry } = usePublicFeed();
  const heading = compact ? 'Recent recognitions' : 'Recent recognitions';

  if (status === 'loading' || status === 'hidden') {
    return (
      <div className={compact ? styles.companionState : styles.stateCard} aria-live="polite" aria-busy="true">
        <span aria-hidden="true">•••</span>
        <h2>{status === 'hidden' ? 'Loading recognitions' : 'Loading recognitions'}</h2>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={compact ? styles.companionState : styles.stateCard} role="alert">
        <span aria-hidden="true">!</span>
        <h2>Unable to load recognitions</h2>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    );
  }

  if (status === 'empty' || items.length === 0) {
    return (
      <div className={compact ? styles.companionState : styles.stateCard} aria-live="polite">
        <span aria-hidden="true">♡</span>
        <h2>{heading}</h2>
        <p>No recognitions yet.</p>
        <Link href="/recognize">Share a recognition</Link>
      </div>
    );
  }

  return null;
}

export function usePublicFeed() {
  return useContext(PublicFeedContext);
}

export function PublicFeedProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = isPublicPage(pathname);
  const [snapshot, setSnapshot] = useState<VerifiedFeedSnapshot | null>(null);
  const [status, setStatus] = useState<PublicFeedStatus>('loading');
  const [, setClockVersion] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionEntry>>({});
  const requestSerialRef = useRef(0);
  const feedControllerRef = useRef<AbortController | null>(null);
  const feedDeadlineRef = useRef<number | null>(null);
  const expiryTimerRef = useRef<number | null>(null);
  const reactionControllerRef = useRef<AbortController | null>(null);
  const reactionSerialRef = useRef(0);
  const reactionEntriesRef = useRef<Record<string, ReactionEntry>>({});
  const reactionWriteVersionsRef = useRef(new Map<string, number>());
  const reactionInFlightRef = useRef(new Set<string>());
  const reactionMutationControllersRef = useRef(new Map<string, AbortController>());
  const reactionTargetEpochRef = useRef(new Map<string, number>());
  const feedGenerationRef = useRef(0);
  const snapshotRef = useRef<VerifiedFeedSnapshot | null>(null);
  const retryRef = useRef<() => void>(() => undefined);
  const retryReactionsRef = useRef<() => void>(() => undefined);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== null) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const commitReactions = useCallback((
    update: Record<string, ReactionEntry> | ((current: Record<string, ReactionEntry>) => Record<string, ReactionEntry>),
  ) => {
    setReactions((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      reactionEntriesRef.current = next;
      return next;
    });
  }, []);

  const clearReactions = useCallback(() => {
    reactionControllerRef.current?.abort();
    reactionControllerRef.current = null;
    reactionMutationControllersRef.current.forEach((controller) => controller.abort());
    reactionMutationControllersRef.current.clear();
    reactionInFlightRef.current.clear();
    reactionSerialRef.current += 1;
    commitReactions({});
  }, [commitReactions]);

  const currentItems = useCallback((candidate: VerifiedFeedSnapshot | null = snapshotRef.current) => {
    return candidate ? activeFeedItems(candidate, monotonicNow()) : [];
  }, []);

  const clearFeed = useCallback((nextStatus: PublicFeedStatus) => {
    requestSerialRef.current += 1;
    feedControllerRef.current?.abort();
    feedControllerRef.current = null;
    if (feedDeadlineRef.current !== null) window.clearTimeout(feedDeadlineRef.current);
    feedDeadlineRef.current = null;
    clearExpiryTimer();
    currentItems(snapshotRef.current).forEach((item) => {
      reactionTargetEpochRef.current.set(item.id, (reactionTargetEpochRef.current.get(item.id) ?? 0) + 1);
    });
    feedGenerationRef.current += 1;
    snapshotRef.current = null;
    setSnapshot(null);
    setStatus(nextStatus);
    setClockVersion((version) => version + 1);
    clearReactions();
  }, [clearExpiryTimer, clearReactions, currentItems]);

  const loadReactions = useCallback(async (items: PublicFeedItem[], generation: number) => {
    reactionControllerRef.current?.abort();
    const serial = reactionSerialRef.current + 1;
    reactionSerialRef.current = serial;
    const ids = items.map((item) => item.id).slice(0, 30);
    if (ids.length === 0) {
      commitReactions({});
      return;
    }

    const readWriteVersions = new Map(ids.map((id) => [id, reactionWriteVersionsRef.current.get(id) ?? 0]));
    const loadingEntries = Object.fromEntries(ids.map((id) => {
      const current = reactionEntriesRef.current[id];
      if (reactionInFlightRef.current.has(id) && current) return [id, { ...current, pending: true }];
      return [id, { status: 'loading' as const, pending: false }];
    })) as Record<string, ReactionEntry>;
    commitReactions(loadingEntries);

    const controller = new AbortController();
    reactionControllerRef.current = controller;
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const payloadById = await fetchReactionCounts(ids, controller.signal);
      if (serial !== reactionSerialRef.current || generation !== feedGenerationRef.current) return;

      const next = Object.fromEntries(ids.map((id) => {
        const current = reactionEntriesRef.current[id];
        const writeChanged = (reactionWriteVersionsRef.current.get(id) ?? 0) !== (readWriteVersions.get(id) ?? 0);
        if (writeChanged || reactionInFlightRef.current.has(id)) {
          return [id, current ?? { status: 'loading' as const, pending: true }];
        }
        const item = payloadById.get(id);
        return [id, item ? { item, status: 'ready' as const, pending: false } : {
          status: 'unavailable' as const,
          pending: false,
        }];
      })) as Record<string, ReactionEntry>;
      commitReactions(next);
    } catch {
      if (serial !== reactionSerialRef.current || generation !== feedGenerationRef.current) return;
      commitReactions(Object.fromEntries(ids.map((id) => {
        const current = reactionEntriesRef.current[id];
        const writeChanged = (reactionWriteVersionsRef.current.get(id) ?? 0) !== (readWriteVersions.get(id) ?? 0);
        if (writeChanged || reactionInFlightRef.current.has(id)) {
          return [id, current ?? { status: 'loading' as const, pending: true }];
        }
        return [id, { status: 'unavailable' as const, pending: false }];
      })) as Record<string, ReactionEntry>);
    } finally {
      window.clearTimeout(deadline);
    }
  }, [commitReactions]);

  const applySnapshot = useCallback((nextSnapshot: VerifiedFeedSnapshot) => {
    const visibleItems = activeFeedItems(nextSnapshot, monotonicNow());
    const previousIds = new Set(currentItems(snapshotRef.current).map((item) => item.id));
    const nextIds = new Set(visibleItems.map((item) => item.id));
    for (const id of new Set([...previousIds, ...nextIds])) {
      if (previousIds.has(id) !== nextIds.has(id)) {
        reactionTargetEpochRef.current.set(id, (reactionTargetEpochRef.current.get(id) ?? 0) + 1);
        if (previousIds.has(id) && !nextIds.has(id)) {
          reactionMutationControllersRef.current.get(id)?.abort();
          reactionMutationControllersRef.current.delete(id);
          reactionInFlightRef.current.delete(id);
        }
      }
    }
    const generation = feedGenerationRef.current + 1;
    feedGenerationRef.current = generation;
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
    setStatus(visibleItems.length > 0 ? 'ready' : 'empty');
    setClockVersion((version) => version + 1);

    clearExpiryTimer();
    const scheduleExpiry = () => {
      const current = snapshotRef.current;
      if (!current) return;
      const freshItems = activeFeedItems(current, monotonicNow());
      const freshIds = new Set(freshItems.map((item) => item.id));
      for (const item of current.items) {
        if (!freshIds.has(item.id)) {
          reactionTargetEpochRef.current.set(item.id, (reactionTargetEpochRef.current.get(item.id) ?? 0) + 1);
          reactionMutationControllersRef.current.get(item.id)?.abort();
          reactionMutationControllersRef.current.delete(item.id);
          reactionInFlightRef.current.delete(item.id);
        }
      }
      feedGenerationRef.current += 1;
      setClockVersion((version) => version + 1);
      setStatus(freshItems.length > 0 ? 'ready' : 'empty');
      commitReactions((entries) => Object.fromEntries(
        Object.entries(entries).filter(([id]) => freshIds.has(id)),
      ));
      if (freshItems.length > 0) {
        const elapsedMs = Math.max(0, monotonicNow() - current.verifiedMonotonicMs);
        const remainingMs = Math.min(...freshItems.map((item) => (
          Date.parse(item.expiresAt) - (current.verifiedServerTimeMs + elapsedMs)
        )));
        expiryTimerRef.current = window.setTimeout(scheduleExpiry, Math.max(20, remainingMs + 5));
      } else {
        expiryTimerRef.current = null;
      }
    };
    if (visibleItems.length > 0) {
      const elapsedMs = Math.max(0, monotonicNow() - nextSnapshot.verifiedMonotonicMs);
      const remainingMs = Math.min(...visibleItems.map((item) => (
        Date.parse(item.expiresAt) - (nextSnapshot.verifiedServerTimeMs + elapsedMs)
      )));
      expiryTimerRef.current = window.setTimeout(scheduleExpiry, Math.max(20, remainingMs + 5));
    }

    void loadReactions(visibleItems, generation);
  }, [clearExpiryTimer, commitReactions, currentItems, loadReactions]);

  const fetchFeed = useCallback(async () => {
    if (!active || document.visibilityState === 'hidden') return;
    const serial = requestSerialRef.current + 1;
    requestSerialRef.current = serial;
    feedControllerRef.current?.abort();
    const controller = new AbortController();
    feedControllerRef.current = controller;
    const requestStartedAt = monotonicNow();
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    feedDeadlineRef.current = deadline;
    try {
      const response = await fetch('/api/feed', {
        cache: 'no-store',
        credentials: 'include',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`);
      const nextSnapshot = verifyFeedSnapshot(await response.json(), requestStartedAt);
      if (!nextSnapshot) throw new Error('Feed response was not valid.');
      if (serial !== requestSerialRef.current || controller.signal.aborted) return;
      applySnapshot(nextSnapshot);
    } catch {
      if (serial !== requestSerialRef.current) return;
      clearFeed('error');
    } finally {
      window.clearTimeout(deadline);
      if (feedDeadlineRef.current === deadline) feedDeadlineRef.current = null;
    }
  }, [active, applySnapshot, clearFeed]);

  useEffect(() => {
    retryRef.current = () => {
      setStatus('loading');
      void fetchFeed();
    };
    retryReactionsRef.current = () => {
      const current = snapshotRef.current;
      if (!current) return;
      void loadReactions(currentItems(current), feedGenerationRef.current);
    };
  }, [currentItems, fetchFeed, loadReactions]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const initialRequest = window.setTimeout(() => { void fetchFeed(); }, 0);
    const interval = window.setInterval(() => { void fetchFeed(); }, 10_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearFeed('hidden');
        return;
      }
      setStatus('loading');
      void fetchFeed();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearFeed('loading');
    };
  }, [active, clearFeed, fetchFeed]);

  const toggleReaction = useCallback((item: PublicFeedItem) => {
    const entry = reactions[item.id];
    if (!entry || entry.status !== 'ready' || !entry.item || entry.pending || reactionInFlightRef.current.has(item.id)) return;
    const desiredLiked = !entry.item.liked;
    const targetEpoch = reactionTargetEpochRef.current.get(item.id) ?? 0;
    const writeVersion = (reactionWriteVersionsRef.current.get(item.id) ?? 0) + 1;
    reactionWriteVersionsRef.current.set(item.id, writeVersion);
    reactionInFlightRef.current.add(item.id);
    const controller = new AbortController();
    reactionMutationControllersRef.current.set(item.id, controller);
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    commitReactions((current) => ({
      ...current,
      [item.id]: { ...entry, pending: true, error: undefined },
    }));

    void (async () => {
      try {
        const response = await fetch(`/api/reactions/${encodeURIComponent(item.id)}`, {
          method: 'PUT',
          cache: 'no-store',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ liked: desiredLiked }),
        });
        if (!response.ok) throw new Error(`Reaction update failed with status ${response.status}`);
        const updated = decodeReactionItem(await response.json());
        if (!updated || updated.id !== item.id) throw new Error('Reaction update was not valid.');
        const stillVisible = currentItems().some((candidate) => candidate.id === item.id);
        const stillCurrent = (reactionWriteVersionsRef.current.get(item.id) ?? 0) === writeVersion
          && (reactionTargetEpochRef.current.get(item.id) ?? 0) === targetEpoch;
        if (!stillCurrent || !stillVisible) return;
        reactionInFlightRef.current.delete(item.id);
        reactionMutationControllersRef.current.delete(item.id);
        commitReactions((current) => ({
          ...current,
          [item.id]: { item: updated, status: 'ready', pending: false },
        }));
      } catch {
        const stillVisible = currentItems().some((candidate) => candidate.id === item.id);
        const stillCurrent = (reactionWriteVersionsRef.current.get(item.id) ?? 0) === writeVersion
          && (reactionTargetEpochRef.current.get(item.id) ?? 0) === targetEpoch;
        if (!stillCurrent || !stillVisible) return;
        reactionInFlightRef.current.delete(item.id);
        reactionMutationControllersRef.current.delete(item.id);
        commitReactions((current) => ({
          ...current,
          [item.id]: { ...current[item.id], status: 'error', pending: false, error: 'Could not save heart.' },
        }));
      } finally {
        window.clearTimeout(deadline);
        if (reactionMutationControllersRef.current.get(item.id) === controller) {
          reactionMutationControllersRef.current.delete(item.id);
          reactionInFlightRef.current.delete(item.id);
        }
      }
    })();
  }, [commitReactions, currentItems, reactions]);

  const context: PublicFeedContextValue = {
    items: snapshot ? activeFeedItems(snapshot, monotonicNow()) : [],
    status,
    retry: () => retryRef.current(),
    reactions,
    toggleReaction,
    retryReactions: () => retryReactionsRef.current(),
  };

  return <PublicFeedContext.Provider value={context}>{children}</PublicFeedContext.Provider>;
}

export function PublicFeedFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { items, status } = usePublicFeed();
  if (!isPublicPage(pathname) || pathname === '/') return <>{children}</>;

  return (
    <div className={styles.publicFeedFrame}>
      <div className={styles.publicFeedContent}>{children}</div>
      <aside
        className={styles.publicFeedCompanion}
        role="region"
        aria-labelledby="public-feed-companion-title"
        tabIndex={0}
      >
        <div className={styles.publicFeedCompanionHeading}>
          <p>Live from the campaign</p>
          <h2 id="public-feed-companion-title">Recent recognitions</h2>
        </div>
        <div className={styles.publicFeedCompanionViewport}>
          {status === 'ready' && items.length > 0 ? <FeedCompanionList items={items} /> : <FeedState compact />}
        </div>
      </aside>
    </div>
  );
}

function FeedCompanionList({ items }: { items: PublicFeedItem[] }) {
  return (
    <div className={styles.publicFeedCompanionList}>
      {items.map((item) => <FeedCompanionCard key={item.id} item={item} />)}
    </div>
  );
}

function FeedCompanionCard({ item }: { item: PublicFeedItem }) {
  const { reactions, toggleReaction, retryReactions } = usePublicFeed();
  const reaction = reactions[item.id];
  const reactionReady = reaction?.status === 'ready' && reaction.item;
  return (
    <article className={styles.publicFeedCompanionCard}>
      <p className={styles.publicFeedCompanionRecipient}>For {item.recipient}</p>
      <p className={styles.publicFeedCompanionMessage}>{item.message}</p>
      <ReactionButton
        item={item}
        reaction={reaction}
        onToggle={() => toggleReaction(item)}
        onRetry={retryReactions}
      />
      {reactionReady && reaction.item ? <ReactionCount count={reaction.item.count} /> : null}
    </article>
  );
}

export function ReactionButton({
  item,
  reaction,
  onToggle,
  onRetry,
}: {
  item: PublicFeedItem;
  reaction?: ReactionEntry;
  onToggle: () => void;
  onRetry: () => void;
}) {
  const reactionItem = reaction?.status === 'ready' ? reaction.item : undefined;
  const countId = `reaction-count-${item.id}`;
  const label = reactionItem
    ? `Like recognition for ${item.recipient}`
    : reaction?.status === 'error' ? 'Try loading hearts again' : `Hearts unavailable for ${item.recipient}`;
  if (reaction?.status === 'error') {
    return <button className={styles.reactionRetry} type="button" onClick={onRetry}>{label}</button>;
  }
  return (
    <button
      className={styles.reactionButton}
      type="button"
      aria-pressed={reactionItem?.liked ?? false}
      aria-label={label}
      aria-describedby={reactionItem ? countId : undefined}
      disabled={!reactionItem || Boolean(reaction?.pending)}
      onClick={onToggle}
    >
      <span aria-hidden="true">{reactionItem?.liked ? '❤️' : '🤍'}</span>
      <span id={reactionItem ? countId : undefined}>{reactionItem ? reactionItem.count : 'Hearts unavailable'}</span>
    </button>
  );
}
