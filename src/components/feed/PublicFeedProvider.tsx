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
  status: 'loading' | 'ready' | 'unavailable' | 'error' | 'throttled' | 'cookies';
  pending: boolean;
  error?: string;
  recovery?: ReactionRecovery;
};

type ReactionRecovery = {
  kind: 'throttled' | 'cookies';
  targetToken: object;
  writeVersion: number;
  retryAt?: number;
  message: string;
};

type ReactionRequestError = Error & {
  status?: number;
  retryAfterMs?: number;
};

export type PublicFeedStatus = 'loading' | 'ready' | 'empty' | 'error' | 'hidden';

type PublicFeedContextValue = {
  items: PublicFeedItem[];
  status: PublicFeedStatus;
  retry: () => void;
  refresh: () => void;
  reactions: Readonly<Record<string, ReactionEntry>>;
  toggleReaction: (item: PublicFeedItem) => void;
  retryReactions: () => void;
};

const defaultContext: PublicFeedContextValue = {
  items: [],
  status: 'loading',
  retry: () => undefined,
  refresh: () => undefined,
  reactions: {},
  toggleReaction: () => undefined,
  retryReactions: () => undefined,
};

const PublicFeedContext = createContext<PublicFeedContextValue>(defaultContext);

const DEFAULT_RETRY_AFTER_MS = 60_000;
const MAX_RETRY_AFTER_MS = 5 * 60_000;
const REACTION_BATCH_SIZE = 30;

function parseRetryAfterMs(value: string | null) {
  if (!value) return undefined;
  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.ceil(seconds * 1_000));
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, timestamp - Date.now()));
}

function reactionRequestError(response: Response, message: string): ReactionRequestError {
  const error = new Error(message) as ReactionRequestError;
  error.status = response.status;
  error.retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
  return error;
}

function formatRetryWait(milliseconds: number) {
  const seconds = Math.max(1, Math.ceil(milliseconds / 1_000));
  if (seconds >= 60) return `Try again in ${Math.ceil(seconds / 60)} min.`;
  return `Try again in ${seconds} sec.`;
}

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
  const boundedIds = [...new Set(ids)].slice(0, REACTION_BATCH_SIZE);
  if (boundedIds.length === 0) return new Map<string, ReactionItem>();
  const response = await fetch(`/api/reactions?ids=${encodeURIComponent(boundedIds.join(','))}`, {
    cache: 'no-store',
    credentials: 'include',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw reactionRequestError(response, `Reaction request failed with status ${response.status}`);
  const payload = decodeReactionPayload(await response.json());
  if (!payload) throw new Error('Reaction response was not valid.');
  const requestedIds = new Set(boundedIds);
  if (payload.some((item) => !requestedIds.has(item.id))) throw new Error('Reaction response included an unrequested item.');
  return new Map(payload.map((item) => [item.id, item]));
}

export function ReactionCount({ count }: { count: number }) {
  return <span className={styles.publicFeedCompanionCount}>{count} {count === 1 ? 'heart' : 'hearts'}</span>;
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
  const reactionTargetTokensRef = useRef(new Map<string, object>());
  const reactionRecoveryRef = useRef(new Map<string, ReactionRecovery>());
  const reactionRecoveryTimersRef = useRef(new Map<string, number>());
  const feedGenerationRef = useRef(0);
  const snapshotRef = useRef<VerifiedFeedSnapshot | null>(null);
  const retryRef = useRef<() => void>(() => undefined);
  const refreshRef = useRef<() => void>(() => undefined);
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
    reactionTargetTokensRef.current.clear();
    reactionWriteVersionsRef.current.clear();
    reactionRecoveryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    reactionRecoveryTimersRef.current.clear();
    reactionRecoveryRef.current.clear();
    feedGenerationRef.current += 1;
    snapshotRef.current = null;
    setSnapshot(null);
    setStatus(nextStatus);
    setClockVersion((version) => version + 1);
    clearReactions();
  }, [clearExpiryTimer, clearReactions]);

  const loadReactions = useCallback(async (items: PublicFeedItem[], generation: number, forceRecoveryCheck = false) => {
    reactionControllerRef.current?.abort();
    const serial = reactionSerialRef.current + 1;
    reactionSerialRef.current = serial;
    const ids = items.map((item) => item.id);
    if (ids.length === 0) {
      commitReactions({});
      return;
    }

    const clearRecovery = (id: string) => {
      const timer = reactionRecoveryTimersRef.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      reactionRecoveryTimersRef.current.delete(id);
      reactionRecoveryRef.current.delete(id);
    };
    const now = monotonicNow();
    if (forceRecoveryCheck) {
      ids.forEach((id) => {
        const recovery = reactionRecoveryRef.current.get(id);
        if (recovery?.kind === 'cookies' || (recovery?.retryAt !== undefined && recovery.retryAt <= now)) {
          clearRecovery(id);
        }
      });
    }
    const activeRecovery = (id: string) => {
      const recovery = reactionRecoveryRef.current.get(id);
      const targetToken = reactionTargetTokensRef.current.get(id);
      const writeVersion = reactionWriteVersionsRef.current.get(id) ?? 0;
      if (!recovery || !targetToken || recovery.targetToken !== targetToken || recovery.writeVersion !== writeVersion) {
        if (recovery) clearRecovery(id);
        return undefined;
      }
      if (recovery.retryAt !== undefined && recovery.retryAt <= monotonicNow()) {
        clearRecovery(id);
        return undefined;
      }
      return recovery;
    };
    const recoveryEntry = (current: ReactionEntry | undefined, recovery: ReactionRecovery): ReactionEntry => ({
      ...(current ?? { status: 'unavailable' as const, pending: false }),
      status: recovery.kind,
      pending: false,
      error: recovery.message,
      recovery,
    });

    const readWriteVersions = new Map(ids.map((id) => [id, reactionWriteVersionsRef.current.get(id) ?? 0]));
    const loadingEntries = Object.fromEntries(ids.map((id) => {
      const current = reactionEntriesRef.current[id];
      const recovery = activeRecovery(id);
      if (recovery) return [id, recoveryEntry(current, recovery)];
      if (reactionInFlightRef.current.has(id) && current) return [id, { ...current, pending: true }];
      // A heart that is already confirmed stays exactly as it is while the
      // refresh reads new counts; only a heart never loaded shows loading.
      if (current?.status === 'ready' && current.item) return [id, current];
      return [id, { status: 'loading' as const, pending: false }];
    })) as Record<string, ReactionEntry>;
    commitReactions(loadingEntries);

    const controller = new AbortController();
    reactionControllerRef.current = controller;
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const batches = Array.from(
        { length: Math.ceil(ids.length / REACTION_BATCH_SIZE) },
        (_, index) => ids.slice(index * REACTION_BATCH_SIZE, (index + 1) * REACTION_BATCH_SIZE),
      );
      const batchResults = await Promise.all(
        batches.map((batch) => fetchReactionCounts(batch, controller.signal)),
      );
      const payloadById = new Map(batchResults.flatMap((batch) => [...batch.entries()]));
      if (serial !== reactionSerialRef.current || generation !== feedGenerationRef.current) return;

      const next = Object.fromEntries(ids.map((id) => {
        const current = reactionEntriesRef.current[id];
        const recovery = activeRecovery(id);
        const item = payloadById.get(id);
        if (recovery) {
          const preserved = recoveryEntry(current, recovery);
          return [id, item ? { ...preserved, item } : preserved];
        }
        const writeChanged = (reactionWriteVersionsRef.current.get(id) ?? 0) !== (readWriteVersions.get(id) ?? 0);
        if (writeChanged || reactionInFlightRef.current.has(id)) {
          return [id, current ?? { status: 'loading' as const, pending: true }];
        }
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
        const recovery = activeRecovery(id);
        if (recovery) return [id, recoveryEntry(current, recovery)];
        const writeChanged = (reactionWriteVersionsRef.current.get(id) ?? 0) !== (readWriteVersions.get(id) ?? 0);
        if (writeChanged || reactionInFlightRef.current.has(id)) {
          return [id, current ?? { status: 'loading' as const, pending: true }];
        }
        // One failed refresh keeps the last confirmed heart instead of blanking it.
        if (current?.status === 'ready' && current.item) return [id, current];
        return [id, { status: 'unavailable' as const, pending: false }];
      })) as Record<string, ReactionEntry>);
    } finally {
      window.clearTimeout(deadline);
    }
  }, [commitReactions]);

  const applySnapshot = useCallback((nextSnapshot: VerifiedFeedSnapshot) => {
    const visibleItems = activeFeedItems(nextSnapshot, monotonicNow());
    const nextIds = new Set(visibleItems.map((item) => item.id));
    for (const id of reactionTargetTokensRef.current.keys()) {
      if (!nextIds.has(id)) {
        reactionMutationControllersRef.current.get(id)?.abort();
        reactionMutationControllersRef.current.delete(id);
        reactionInFlightRef.current.delete(id);
        reactionTargetTokensRef.current.delete(id);
        reactionWriteVersionsRef.current.delete(id);
        const recoveryTimer = reactionRecoveryTimersRef.current.get(id);
        if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
        reactionRecoveryTimersRef.current.delete(id);
        reactionRecoveryRef.current.delete(id);
      }
    }
    visibleItems.forEach((item) => {
      if (!reactionTargetTokensRef.current.has(item.id)) reactionTargetTokensRef.current.set(item.id, {});
    });
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
          reactionMutationControllersRef.current.get(item.id)?.abort();
          reactionMutationControllersRef.current.delete(item.id);
          reactionInFlightRef.current.delete(item.id);
          reactionTargetTokensRef.current.delete(item.id);
          reactionWriteVersionsRef.current.delete(item.id);
          const recoveryTimer = reactionRecoveryTimersRef.current.get(item.id);
          if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
          reactionRecoveryTimersRef.current.delete(item.id);
          reactionRecoveryRef.current.delete(item.id);
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
  }, [clearExpiryTimer, commitReactions, loadReactions]);

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
    // Refetch without showing the loading state, so the list never blinks.
    refreshRef.current = () => { void fetchFeed(); };
    retryReactionsRef.current = () => {
      const current = snapshotRef.current;
      if (!current) return;
      void loadReactions(currentItems(current), feedGenerationRef.current, true);
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
    const entry = reactionEntriesRef.current[item.id];
    if (!entry || entry.status !== 'ready' || !entry.item || entry.pending || reactionInFlightRef.current.has(item.id)) return;
    const desiredLiked = !entry.item.liked;
    const targetToken = reactionTargetTokensRef.current.get(item.id);
    if (!targetToken) return;
    const writeVersion = (reactionWriteVersionsRef.current.get(item.id) ?? 0) + 1;
    reactionWriteVersionsRef.current.set(item.id, writeVersion);
    reactionInFlightRef.current.add(item.id);
    const controller = new AbortController();
    reactionMutationControllersRef.current.set(item.id, controller);
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    // Show the tap immediately. The server reply then replaces this with the
    // confirmed count, and any failure below restores the confirmed entry.
    const confirmed = entry.item;
    const optimistic: ReactionItem = {
      id: confirmed.id,
      liked: desiredLiked,
      count: Math.max(0, confirmed.count + (desiredLiked ? 1 : -1)),
    };
    commitReactions((current) => ({
      ...current,
      [item.id]: { item: optimistic, status: 'ready', pending: true },
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
        if (!response.ok) throw reactionRequestError(response, `Reaction update failed with status ${response.status}`);
        const updated = decodeReactionItem(await response.json());
        if (!updated || updated.id !== item.id) throw new Error('Reaction update was not valid.');
        const stillVisible = currentItems().some((candidate) => candidate.id === item.id);
        const stillCurrent = (reactionWriteVersionsRef.current.get(item.id) ?? 0) === writeVersion
          && reactionTargetTokensRef.current.get(item.id) === targetToken;
        if (!stillCurrent || !stillVisible) return;
        reactionInFlightRef.current.delete(item.id);
        reactionMutationControllersRef.current.delete(item.id);
        reactionWriteVersionsRef.current.set(item.id, writeVersion + 1);
        const recoveryTimer = reactionRecoveryTimersRef.current.get(item.id);
        if (recoveryTimer !== undefined) window.clearTimeout(recoveryTimer);
        reactionRecoveryTimersRef.current.delete(item.id);
        reactionRecoveryRef.current.delete(item.id);
        commitReactions((current) => ({
          ...current,
          [item.id]: { item: updated, status: 'ready', pending: false },
        }));
      } catch (error) {
        const stillVisible = currentItems().some((candidate) => candidate.id === item.id);
        const stillCurrent = (reactionWriteVersionsRef.current.get(item.id) ?? 0) === writeVersion
          && reactionTargetTokensRef.current.get(item.id) === targetToken;
        if (!stillCurrent || !stillVisible) return;
        reactionInFlightRef.current.delete(item.id);
        reactionMutationControllersRef.current.delete(item.id);
        const nextWriteVersion = writeVersion + 1;
        reactionWriteVersionsRef.current.set(item.id, nextWriteVersion);
        const requestError = error as ReactionRequestError;
        if (requestError.status === 429) {
          const waitMs = Math.min(MAX_RETRY_AFTER_MS, Math.max(0, requestError.retryAfterMs ?? DEFAULT_RETRY_AFTER_MS));
          const recovery: ReactionRecovery = {
            kind: 'throttled',
            targetToken,
            writeVersion: nextWriteVersion,
            retryAt: monotonicNow() + waitMs,
            message: formatRetryWait(waitMs),
          };
          reactionRecoveryRef.current.set(item.id, recovery);
          const previousTimer = reactionRecoveryTimersRef.current.get(item.id);
          if (previousTimer !== undefined) window.clearTimeout(previousTimer);
          const timer = window.setTimeout(() => {
            const currentRecovery = reactionRecoveryRef.current.get(item.id);
            if (
              currentRecovery !== recovery
              || reactionTargetTokensRef.current.get(item.id) !== targetToken
              || (reactionWriteVersionsRef.current.get(item.id) ?? 0) !== nextWriteVersion
            ) return;
            reactionRecoveryRef.current.delete(item.id);
            reactionRecoveryTimersRef.current.delete(item.id);
            commitReactions((current) => {
              const existing = current[item.id];
              if (!existing || existing.recovery !== recovery) return current;
              const next = { ...existing, status: 'error' as const, pending: false, error: 'You can try again now.' };
              delete next.recovery;
              return { ...current, [item.id]: next };
            });
          }, Math.max(0, (recovery.retryAt ?? monotonicNow()) - monotonicNow()) + 5);
          reactionRecoveryTimersRef.current.set(item.id, timer);
          commitReactions((current) => ({
            ...current,
            [item.id]: {
              ...(current[item.id] ?? entry),
              item: confirmed,
              status: 'throttled',
              pending: false,
              error: recovery.message,
              recovery,
            },
          }));
        } else if (requestError.status === 428) {
          const recovery: ReactionRecovery = {
            kind: 'cookies',
            targetToken,
            writeVersion: nextWriteVersion,
            message: 'Enable cookies, then retry.',
          };
          reactionRecoveryRef.current.set(item.id, recovery);
          commitReactions((current) => ({
            ...current,
            [item.id]: {
              ...(current[item.id] ?? entry),
              item: confirmed,
              status: 'cookies',
              pending: false,
              error: recovery.message,
              recovery,
            },
          }));
        } else {
          commitReactions((current) => ({
            ...current,
            [item.id]: { ...current[item.id], item: confirmed, status: 'error', pending: false, error: 'Could not save heart.' },
          }));
        }
      } finally {
        window.clearTimeout(deadline);
        if (reactionMutationControllersRef.current.get(item.id) === controller) {
          reactionMutationControllersRef.current.delete(item.id);
          reactionInFlightRef.current.delete(item.id);
        }
      }
    })();
  }, [commitReactions, currentItems]);

  const context: PublicFeedContextValue = {
    items: snapshot ? activeFeedItems(snapshot, monotonicNow()) : [],
    status,
    retry: () => retryRef.current(),
    refresh: () => refreshRef.current(),
    reactions,
    toggleReaction,
    retryReactions: () => retryReactionsRef.current(),
  };

  return <PublicFeedContext.Provider value={context}>{children}</PublicFeedContext.Provider>;
}

export function CompactPublicFeed() {
  const { items, status } = usePublicFeed();

  return (
    <section
      className={styles.publicFeedCompact}
      role="region"
      aria-label="Live campaign"
      data-testid="submission-live-feed"
    >
      <div className={styles.publicFeedCompactHeading}>
        <p>Live from the campaign</p>
        <h2>Latest recognitions</h2>
      </div>
      <div className={styles.publicFeedCompactViewport} role="region" aria-label="Latest recognitions" tabIndex={0}>
        {status === 'ready' && items.length > 0 ? <FeedCompanionList items={items} /> : <FeedState compact />}
      </div>
    </section>
  );
}

export function PublicFeedFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { items, status } = usePublicFeed();
  if (!isPublicPage(pathname) || pathname === '/' || pathname === '/recognize') return <>{children}</>;

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
  return (
    <article className={styles.publicFeedCompanionCard}>
      <div className={styles.publicFeedCompanionHeader}>
        <p className={styles.publicFeedCompanionRecipient}>For {item.recipient}</p>
        <ReactionButton
          item={item}
          reaction={reaction}
          onToggle={() => toggleReaction(item)}
          onRetry={retryReactions}
        />
      </div>
      <p className={styles.publicFeedCompanionMessage}>{item.message}</p>
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
  const confirmedItem = reaction?.item;
  const reactionItem = reaction?.status === 'ready' ? confirmedItem : undefined;
  // Loading and saving keep the normal heart look: no grey flash, no text swap.
  const loading = !reaction || reaction.status === 'loading';
  const settling = loading || Boolean(reactionItem && reaction?.pending);
  const countId = `reaction-count-${item.id}`;
  const recoveryId = `reaction-recovery-${item.id}`;
  const label = reactionItem
    ? `Like recognition for ${item.recipient}`
    : reaction?.status === 'error' ? 'Try loading hearts again' : `Hearts unavailable for ${item.recipient}`;
  if (reaction?.status === 'error') {
    return <button className={styles.reactionRetry} type="button" onClick={onRetry}>{label}</button>;
  }
  if (reaction?.status === 'throttled' && confirmedItem && reaction.recovery) {
    return (
      <div className={styles.reactionRecovery}>
        <button
          className={styles.reactionButton}
          type="button"
          aria-pressed={confirmedItem.liked}
          aria-label={`Hearts paused for ${item.recipient}. ${reaction.recovery.message}`}
          aria-describedby={`${countId} ${recoveryId}`}
          disabled
        >
          <span aria-hidden="true">{confirmedItem.liked ? '❤️' : '🤍'}</span>
          <span id={countId}>{confirmedItem.count}</span>
        </button>
        <span className={styles.reactionRecoveryMessage} id={recoveryId}>{reaction.recovery.message}</span>
      </div>
    );
  }
  if (reaction?.status === 'cookies') {
    return (
      <div className={styles.reactionRecovery}>
        <button
          className={styles.reactionRetry}
          type="button"
          aria-label={`Enable cookies, then retry hearts for ${item.recipient}`}
          aria-describedby={reaction.item ? `${countId} ${recoveryId}` : recoveryId}
          onClick={onRetry}
        >
          <span aria-hidden="true">{confirmedItem?.liked ? '❤️' : '🤍'}</span>
          <span id={confirmedItem ? countId : undefined}>{reaction.item ? reaction.item.count : 'Retry hearts'}</span>
        </button>
        <span className={styles.reactionRecoveryMessage} id={recoveryId}>Enable cookies, then retry.</span>
      </div>
    );
  }
  return (
    <button
      className={styles.reactionButton}
      type="button"
      aria-pressed={reactionItem?.liked ?? false}
      aria-label={label}
      aria-describedby={reactionItem ? countId : undefined}
      disabled={!reactionItem || Boolean(reaction?.pending)}
      data-settling={settling ? 'true' : undefined}
      onClick={onToggle}
    >
      <span aria-hidden="true">{reactionItem?.liked ? '❤️' : '🤍'}</span>
      {reactionItem ? <span id={countId}>{reactionItem.count}</span> : loading ? (
        <>
          {/* Figure space holds the count's width so the button does not resize. */}
          <span aria-hidden="true">{'\u2007'}</span>
          <span className={styles.reactionQuietText}>Hearts unavailable</span>
        </>
      ) : <span>Hearts unavailable</span>}
    </button>
  );
}
