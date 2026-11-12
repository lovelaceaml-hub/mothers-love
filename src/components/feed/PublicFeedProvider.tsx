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
import { clearSafeTimeout, setSafeTimeout, type SafeTimerHandle } from '@/lib/safe-timer';
import { startVisiblePoll } from '@/lib/visible-poll';
import { claimPollingRead, createPollingState, nextPollingBoundary, pollingInterval, pollingMode, snapshotFreshnessRequired } from '@/lib/polling-schedule';
import { MAX_REACTION_BATCH_SIZE } from '@/lib/reaction-contract';
import { notModifiedServerTimeMs, parseContentEtag } from '@/lib/etag';
import { EarlyReadTimeoutError, awaitEarlyRead, takeEarlyRead } from '@/lib/early-read';

import {
  activeFeedItems,
  MAX_PUBLIC_FEED_ITEMS,
  type PublicFeedItem,
  type VerifiedFeedSnapshot,
  verifyFeedHeartbeat,
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

export type PublicFeedStatus = 'loading' | 'ready' | 'empty' | 'error' | 'hidden' | 'scheduled';

// 'idle' means another older page may exist; 'end' means none is left; 'limit'
// means the page holds as many older pages as it keeps refreshed.
export type OlderFeedStatus = 'idle' | 'loading' | 'error' | 'end' | 'limit';

type PublicFeedContextValue = {
  items: PublicFeedItem[];
  status: PublicFeedStatus;
  olderItems: PublicFeedItem[];
  olderStatus: OlderFeedStatus;
  loadOlder: () => void;
  retry: () => void;
  refresh: () => void;
  reactions: Readonly<Record<string, ReactionEntry>>;
  toggleReaction: (item: PublicFeedItem) => void;
  retryReactions: () => void;
};

const defaultContext: PublicFeedContextValue = {
  items: [],
  status: 'loading',
  olderItems: [],
  olderStatus: 'idle',
  loadOlder: () => undefined,
  retry: () => undefined,
  refresh: () => undefined,
  reactions: {},
  toggleReaction: () => undefined,
  retryReactions: () => undefined,
};

const PublicFeedContext = createContext<PublicFeedContextValue>(defaultContext);

const DEFAULT_RETRY_AFTER_MS = 60_000;
const MAX_RETRY_AFTER_MS = 5 * 60_000;
const REACTION_BATCH_SIZE = MAX_REACTION_BATCH_SIZE;
// Older pages are re-read on every refresh so a hidden recognition leaves them
// too; this caps that work at 1,000 older recognitions on one open page.
export const MAX_OLDER_FEED_PAGES = 10;
const FEED_READ_DEADLINE_MS = 8_000;

type CachedOlderFeedPage = { etag: string; items: PublicFeedItem[] };
type OlderFeedPage = { etag: string | null; items: PublicFeedItem[] };

function olderPageKey(after: PublicFeedItem) {
  return `${after.firstPublishedAt}|${after.id.toLowerCase()}`;
}

function readFeedEtag(response: Response) {
  return parseContentEtag(response.headers.get('etag'));
}

// Conditional reads are a shortcut, never a requirement. A failed one is repeated as a
// whole read, and after two failures in a row this page stops sending them, so a browser
// or network that mishandles them costs at most two extra requests.
let conditionalReadFailures = 0;
const conditionalReadsAllowed = () => conditionalReadFailures < 2;

async function fetchOlderFeedPage(
  after: PublicFeedItem,
  signal: AbortSignal,
  cached?: CachedOlderFeedPage,
): Promise<OlderFeedPage> {
  const known = conditionalReadsAllowed() ? cached : undefined;
  try {
    const page = await readOlderFeedPage(after, signal, known);
    if (known) conditionalReadFailures = 0;
    return page;
  } catch (error) {
    // A conditional read that fails for any reason is tried once more as a whole read.
    if (!known || signal.aborted) throw error;
    conditionalReadFailures += 1;
    return readOlderFeedPage(after, signal);
  }
}

async function readOlderFeedPage(
  after: PublicFeedItem,
  signal: AbortSignal,
  cached?: CachedOlderFeedPage,
): Promise<OlderFeedPage> {
  const query = new URLSearchParams({ before: after.firstPublishedAt, id: after.id });
  const requestStartedAt = monotonicNow();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (cached) headers['If-None-Match'] = `"${cached.etag}"`;
  const response = await fetch(`/api/feed/older?${query}`, {
    cache: 'no-store',
    credentials: 'include',
    headers,
    signal,
  });
  if (response.status === 304) {
    // The host answers a matching conditional request itself, with no body: the
    // cached page is still the current one.
    const tag = readFeedEtag(response);
    if (!cached || (tag !== null && tag !== cached.etag)) throw new Error('Older feed reply was Not Modified without a matching cached page.');
    return { etag: cached.etag, items: cached.items };
  }
  if (!response.ok) throw new Error(`Older feed request failed with status ${response.status}`);
  const payload: unknown = await response.json();
  const etag = readFeedEtag(response);
  const heartbeat = verifyFeedHeartbeat(payload, requestStartedAt);
  if (heartbeat) {
    if (!cached || etag !== cached.etag) throw new Error('Older feed heartbeat did not match its cached page.');
    return { etag, items: cached.items };
  }
  const page = verifyFeedSnapshot(payload, requestStartedAt);
  if (!page) throw new Error('Older feed response was not valid.');
  return { etag, items: page.items };
}

// Older items continue the live list: never repeat one of its items and never
// sort ahead of its last item.
function olderAfter(items: PublicFeedItem[], older: PublicFeedItem[]) {
  const last = items[items.length - 1];
  if (!last) return [];
  const ids = new Set(items.map((item) => item.id));
  const lastTime = Date.parse(last.firstPublishedAt);
  return older.filter((item) => {
    if (ids.has(item.id)) return false;
    const time = Date.parse(item.firstPublishedAt);
    return time < lastTime || (time === lastTime && item.id < last.id);
  });
}

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

function isHomePage(pathname: string | null) {
  return pathname === '/';
}

function monotonicNow() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeReactionPayload(value: unknown): ReactionItem[] | null {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > MAX_REACTION_BATCH_SIZE) return null;

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
  const boundedIds = [...new Set(ids)].slice(0, MAX_REACTION_BATCH_SIZE);
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
  const heading = 'Recent recognitions';

  if (status === 'loading' || status === 'hidden') {
    return (
      <div className={compact ? styles.companionState : styles.stateCard} aria-live="polite" aria-busy="true">
        <span aria-hidden="true">•••</span>
        <h2>{status === 'hidden' ? 'Loading recognitions' : 'Loading recognitions'}</h2>
      </div>
    );
  }

  if (status === 'scheduled') {
    return <div className={compact ? styles.companionState : styles.stateCard} aria-live="polite"><h2>Recognitions refresh on a schedule</h2><button type="button" onClick={retry}>Refresh now</button></div>;
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
  const homePage = isHomePage(pathname);
  const [snapshot, setSnapshot] = useState<VerifiedFeedSnapshot | null>(null);
  const [status, setStatus] = useState<PublicFeedStatus>('loading');
  const [, setClockVersion] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionEntry>>({});
  const [olderItems, setOlderItems] = useState<PublicFeedItem[]>([]);
  const [olderStatus, setOlderStatus] = useState<OlderFeedStatus>('idle');
  const olderItemsRef = useRef<PublicFeedItem[]>([]);
  const olderPagesRef = useRef(0);
  const olderPageCacheRef = useRef(new Map<string, CachedOlderFeedPage>());
  const olderSerialRef = useRef(0);
  const olderControllerRef = useRef<AbortController | null>(null);
  const requestSerialRef = useRef(0);
  const feedEtagRef = useRef<string | null>(null);
  const feedControllerRef = useRef<AbortController | null>(null);
  const feedDeadlineRef = useRef<number | null>(null);
  const snapshotWallTimesRef = useRef(new WeakMap<VerifiedFeedSnapshot, { wallMs: number; elapsedMs: number }>());
  const staleTimerRef = useRef<number | null>(null);
  const lastVerifiedAtRef = useRef<number | null>(null);
  const pollStateRef = useRef(createPollingState());
  const pollPathRef = useRef(pathname);
  const reactionPollStateRef = useRef(createPollingState());
  const olderPollStateRef = useRef(createPollingState());
  const deferredReactionReadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredOlderReadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<SafeTimerHandle | null>(null);
  const reactionSerialRef = useRef(0);
  const reactionReadRequestsRef = useRef(new Map<number, { controller: AbortController; generation: number; ids: string[] }>());
  const reactionReadOwnersRef = useRef(new Map<string, number>());
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
      clearSafeTimeout(expiryTimerRef.current);
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
    if (deferredReactionReadRef.current !== null) clearTimeout(deferredReactionReadRef.current);
    deferredReactionReadRef.current = null;
    reactionReadRequestsRef.current.forEach(({ controller }) => controller.abort());
    reactionReadRequestsRef.current.clear();
    reactionReadOwnersRef.current.clear();
    reactionMutationControllersRef.current.forEach((controller) => controller.abort());
    reactionMutationControllersRef.current.clear();
    reactionInFlightRef.current.clear();
    reactionSerialRef.current += 1;
    commitReactions({});
  }, [commitReactions]);

  const pruneReactionTargets = useCallback((validIds: ReadonlySet<string>) => {
    reactionReadRequestsRef.current.forEach((request, requestId) => {
      if (request.ids.every((id) => validIds.has(id))) return;
      request.controller.abort();
      reactionReadRequestsRef.current.delete(requestId);
      request.ids.forEach((id) => {
        if (reactionReadOwnersRef.current.get(id) === requestId) reactionReadOwnersRef.current.delete(id);
      });
    });
    for (const id of reactionTargetTokensRef.current.keys()) {
      if (validIds.has(id)) continue;
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
    commitReactions((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => validIds.has(id)),
    ));
  }, [commitReactions]);

  const snapshotClock = useCallback((value: VerifiedFeedSnapshot) => {
    const clock = snapshotWallTimesRef.current.get(value);
    const elapsed = Math.max(clock?.elapsedMs ?? 0, monotonicNow() - value.verifiedMonotonicMs, clock === undefined ? 0 : Date.now() - clock.wallMs);
    if (clock) clock.elapsedMs = elapsed;
    return value.verifiedMonotonicMs + elapsed;
  }, []);

  // Every item on screen: the live list, then any older pages beneath it.
  const currentItems = useCallback((candidate: VerifiedFeedSnapshot | null = snapshotRef.current) => {
    if (!candidate) return [];
    const items = activeFeedItems(candidate, snapshotClock(candidate));
    return [...items, ...olderAfter(items, olderItemsRef.current)];
  }, [snapshotClock]);

  const commitOlder = useCallback((items: PublicFeedItem[], pages: number, nextStatus: OlderFeedStatus) => {
    olderItemsRef.current = items;
    olderPagesRef.current = pages;
    setOlderItems(items);
    setOlderStatus(nextStatus);
  }, []);

  const clearOlder = useCallback((nextStatus: OlderFeedStatus = 'idle') => {
    if (deferredOlderReadRef.current !== null) clearTimeout(deferredOlderReadRef.current);
    deferredOlderReadRef.current = null;
    olderSerialRef.current += 1;
    olderControllerRef.current?.abort();
    olderControllerRef.current = null;
    olderPageCacheRef.current.clear();
    commitOlder([], 0, nextStatus);
  }, [commitOlder]);

  const clearFeed = useCallback((nextStatus: PublicFeedStatus) => {
    requestSerialRef.current += 1;
    feedControllerRef.current?.abort();
    feedControllerRef.current = null;
    if (feedDeadlineRef.current !== null) window.clearTimeout(feedDeadlineRef.current);
    feedDeadlineRef.current = null;
    clearExpiryTimer();
    if (staleTimerRef.current !== null) window.clearTimeout(staleTimerRef.current);
    staleTimerRef.current = null;
    lastVerifiedAtRef.current = null;
    feedEtagRef.current = null;
    reactionTargetTokensRef.current.clear();
    reactionWriteVersionsRef.current.clear();
    reactionRecoveryTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    reactionRecoveryTimersRef.current.clear();
    reactionRecoveryRef.current.clear();
    feedGenerationRef.current += 1;
    clearOlder();
    snapshotRef.current = null;
    setSnapshot(null);
    setStatus(nextStatus);
    setClockVersion((version) => version + 1);
    clearReactions();
  }, [clearExpiryTimer, clearOlder, clearReactions]);

  const loadReactions = useCallback(async function scheduledReactions(
    items: PublicFeedItem[],
    generation: number,
    forceRecoveryCheck = false,
    onlyMissing = false,
    automatic = false,
  ): Promise<void> {
    const allIds = [...new Set(items.map((item) => item.id))];
    const allIdSet = new Set(allIds);
    // Carry reads across a snapshot revision when all their targets are still
    // visible. Abort mixed or removed-target reads so moderated/expired items
    // cannot block the current page's refresh.
    if (!onlyMissing) {
      reactionReadRequestsRef.current.forEach((request, requestId) => {
        if (request.generation === generation) return;
        if (request.ids.every((id) => allIdSet.has(id))) {
          request.generation = generation;
          return;
        }
        request.controller.abort();
        reactionReadRequestsRef.current.delete(requestId);
        request.ids.forEach((id) => {
          if (reactionReadOwnersRef.current.get(id) === requestId) reactionReadOwnersRef.current.delete(id);
        });
      });
    }

    const clearRecovery = (id: string) => {
      const timer = reactionRecoveryTimersRef.current.get(id);
      if (timer !== undefined) window.clearTimeout(timer);
      reactionRecoveryTimersRef.current.delete(id);
      reactionRecoveryRef.current.delete(id);
    };
    const now = monotonicNow();
    if (forceRecoveryCheck) {
      allIds.forEach((id) => {
        const recovery = reactionRecoveryRef.current.get(id);
        if (recovery?.kind === 'cookies' || (recovery?.retryAt !== undefined && recovery.retryAt <= now)) {
          clearRecovery(id);
        }
      });
    }

    const ids = allIds.filter((id) => (
      !reactionReadOwnersRef.current.has(id) && (!onlyMissing || !reactionEntriesRef.current[id]?.item)
    ));
    if (ids.length === 0) {
      if (!onlyMissing) {
        commitReactions((current) => Object.fromEntries(
          Object.entries(current).filter(([id]) => reactionTargetTokensRef.current.has(id)),
        ));
      }
      return;
    }

    if (deferredReactionReadRef.current !== null) clearTimeout(deferredReactionReadRef.current);
    deferredReactionReadRef.current = null;
    const wallNow = Date.now();
    if (automatic) {
      if (document.hidden || document.visibilityState === 'hidden' || pollingMode(wallNow) === 'paused') return;
      if (!claimPollingRead(reactionPollStateRef.current, 10_000, wallNow)) {
        const interval = pollingInterval(10_000, wallNow)!;
        const due = Math.min(nextPollingBoundary(wallNow), (reactionPollStateRef.current.lastStartedAt ?? wallNow) + interval);
        deferredReactionReadRef.current = setTimeout(() => {
          deferredReactionReadRef.current = null;
          if (snapshotRef.current) void scheduledReactions(currentItems(), feedGenerationRef.current, false, false, true);
        }, Math.max(1, due - wallNow));
        return;
      }
    } else {
      reactionPollStateRef.current = { lastStartedAt: wallNow, initialPending: false, mode: pollingMode(wallNow) };
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
    const requestId = reactionSerialRef.current + 1;
    reactionSerialRef.current = requestId;
    const controller = new AbortController();
    reactionReadRequestsRef.current.set(requestId, { controller, generation, ids });
    ids.forEach((id) => reactionReadOwnersRef.current.set(id, requestId));
    commitReactions((current) => {
      const retained = onlyMissing
        ? current
        : Object.fromEntries(Object.entries(current).filter(([id]) => reactionTargetTokensRef.current.has(id)));
      return { ...retained, ...loadingEntries };
    });

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
      const request = reactionReadRequestsRef.current.get(requestId);
      if (!request || controller.signal.aborted || request.generation !== feedGenerationRef.current) return;

      const activeIds = ids.filter((id) => reactionTargetTokensRef.current.has(id));
      const next = Object.fromEntries(activeIds.map((id) => {
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
      commitReactions((current) => {
        const retained = onlyMissing
          ? current
          : Object.fromEntries(Object.entries(current).filter(([id]) => reactionTargetTokensRef.current.has(id)));
        const stillActive = Object.fromEntries(
          Object.entries(next).filter(([id]) => reactionTargetTokensRef.current.has(id)),
        );
        return { ...retained, ...stillActive };
      });
    } catch {
      const request = reactionReadRequestsRef.current.get(requestId);
      if (!request || request.generation !== feedGenerationRef.current) return;
      const failed = Object.fromEntries(ids.filter((id) => reactionTargetTokensRef.current.has(id)).map((id) => {
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
      })) as Record<string, ReactionEntry>;
      commitReactions((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(failed).filter(([id]) => reactionTargetTokensRef.current.has(id))),
      }));
    } finally {
      window.clearTimeout(deadline);
      reactionReadRequestsRef.current.delete(requestId);
      ids.forEach((id) => {
        if (reactionReadOwnersRef.current.get(id) === requestId) reactionReadOwnersRef.current.delete(id);
      });
    }
  }, [commitReactions, currentItems]);

  // After each live refresh, read the older pages again from the new end of the
  // live list, so nothing falls into a gap between them and a recognition hidden
  // since the last read disappears. A failed read clears them rather than keep
  // stale records on screen.
  const refreshOlder = useCallback(async function scheduledOlder(baseSnapshot: VerifiedFeedSnapshot, automatic = false): Promise<void> {
    const pages = olderPagesRef.current;
    const base = activeFeedItems(baseSnapshot, snapshotClock(baseSnapshot));
    if (pages === 0 || base.length === 0) return;
    if (deferredOlderReadRef.current !== null) clearTimeout(deferredOlderReadRef.current);
    deferredOlderReadRef.current = null;
    const startedAt = Date.now();
    const startedMode = pollingMode(startedAt);
    if (automatic) {
      if (document.hidden || document.visibilityState === 'hidden' || startedMode === 'paused') return;
      if (!claimPollingRead(olderPollStateRef.current, 10_000, startedAt)) {
        const due = Math.min(nextPollingBoundary(startedAt), (olderPollStateRef.current.lastStartedAt ?? startedAt) + pollingInterval(10_000, startedAt)!);
        deferredOlderReadRef.current = setTimeout(() => {
          deferredOlderReadRef.current = null;
          if (snapshotRef.current) void scheduledOlder(snapshotRef.current, true);
        }, Math.max(1, due - startedAt));
        return;
      }
    } else {
      olderPollStateRef.current = { lastStartedAt: startedAt, initialPending: false, mode: startedMode };
    }

    const serial = olderSerialRef.current + 1;
    olderSerialRef.current = serial;
    olderControllerRef.current?.abort();
    const controller = new AbortController();
    olderControllerRef.current = controller;
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const collected: PublicFeedItem[] = [];
      const refreshedPageCache = new Map<string, CachedOlderFeedPage>();
      const previousPageCache = olderPageCacheRef.current;
      let lastPageFull = true;
      for (let page = 0; page < pages && lastPageFull; page += 1) {
        if (automatic && (document.hidden || pollingMode() === 'paused' || (startedMode === 'fast' && pollingMode() === 'slow'))) return;
        const after = collected[collected.length - 1] ?? base[base.length - 1];
        const result = await fetchOlderFeedPage(after, controller.signal, previousPageCache.get(olderPageKey(after)));
        const items = result.items;
        if (result.etag) refreshedPageCache.set(olderPageKey(after), { etag: result.etag, items });
        collected.push(...items);
        lastPageFull = items.length === MAX_PUBLIC_FEED_ITEMS;
      }
      if (serial !== olderSerialRef.current) return;
      olderPageCacheRef.current = refreshedPageCache;
      const previousItems = olderItemsRef.current;
      const previousIds = previousItems.map((item) => item.id).join();
      const previousIdSet = new Set(previousItems.map((item) => item.id));
      const nextStatus: OlderFeedStatus = !lastPageFull ? 'end' : pages >= MAX_OLDER_FEED_PAGES ? 'limit' : 'idle';
      commitOlder(collected, pages, nextStatus);
      if (collected.map((item) => item.id).join() !== previousIds) {
        const newlyAdded = collected.filter((item) => !previousIdSet.has(item.id));
        const shown = currentItems(baseSnapshot);
        shown.forEach((item) => {
          if (!reactionTargetTokensRef.current.has(item.id)) reactionTargetTokensRef.current.set(item.id, {});
        });
        pruneReactionTargets(new Set(shown.map((item) => item.id)));
        void loadReactions(newlyAdded, feedGenerationRef.current, false, true, automatic);
      }
    } catch {
      if (serial !== olderSerialRef.current) return;
      clearOlder('error');
    } finally {
      window.clearTimeout(deadline);
      if (olderControllerRef.current === controller) olderControllerRef.current = null;
    }
  }, [clearOlder, commitOlder, currentItems, loadReactions, pruneReactionTargets, snapshotClock]);

  const loadOlder = useCallback(async () => {
    const baseSnapshot = snapshotRef.current;
    if (!baseSnapshot) return;
    const base = activeFeedItems(baseSnapshot, snapshotClock(baseSnapshot));
    if (base.length < MAX_PUBLIC_FEED_ITEMS || olderPagesRef.current >= MAX_OLDER_FEED_PAGES) return;
    const shownBefore = currentItems(baseSnapshot);
    const after = shownBefore[shownBefore.length - 1];
    const serial = olderSerialRef.current + 1;
    olderSerialRef.current = serial;
    olderControllerRef.current?.abort();
    const controller = new AbortController();
    olderControllerRef.current = controller;
    setOlderStatus('loading');
    const deadline = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const result = await fetchOlderFeedPage(after, controller.signal);
      const items = result.items;
      const latestSnapshot = snapshotRef.current;
      if (serial !== olderSerialRef.current || !latestSnapshot) return;
      // A live refresh may have landed meanwhile; place the page after the
      // current live list. The next refresh re-reads any gap it left.
      const latestBase = activeFeedItems(latestSnapshot, snapshotClock(latestSnapshot));
      const pages = olderPagesRef.current + 1;
      const known = new Set(shownBefore.map((item) => item.id));
      const nextOlder = [...olderAfter(latestBase, olderItemsRef.current), ...items.filter((item) => !known.has(item.id))];
      const nextStatus: OlderFeedStatus = items.length < MAX_PUBLIC_FEED_ITEMS ? 'end' : pages >= MAX_OLDER_FEED_PAGES ? 'limit' : 'idle';
      if (result.etag) {
        olderPageCacheRef.current.set(olderPageKey(after), { etag: result.etag, items });
      }
      commitOlder(nextOlder, pages, nextStatus);
      const previouslyShownIds = new Set(shownBefore.map((item) => item.id));
      const newlyShown = nextOlder.filter((item) => !previouslyShownIds.has(item.id));
      const shown = currentItems(latestSnapshot);
      shown.forEach((item) => {
        if (!reactionTargetTokensRef.current.has(item.id)) reactionTargetTokensRef.current.set(item.id, {});
      });
      pruneReactionTargets(new Set(shown.map((item) => item.id)));
      void loadReactions(newlyShown, feedGenerationRef.current, false, true);
    } catch {
      if (serial !== olderSerialRef.current) return;
      setOlderStatus('error');
    } finally {
      window.clearTimeout(deadline);
      if (olderControllerRef.current === controller) olderControllerRef.current = null;
    }
  }, [commitOlder, currentItems, loadReactions, pruneReactionTargets, snapshotClock]);

  const applySnapshot = useCallback((nextSnapshot: VerifiedFeedSnapshot, automatic = false) => {
    snapshotWallTimesRef.current.set(nextSnapshot, { wallMs: Date.now(), elapsedMs: 0 });
    const visibleItems = activeFeedItems(nextSnapshot, snapshotClock(nextSnapshot));
    const shownItems = [...visibleItems, ...olderAfter(visibleItems, olderItemsRef.current)];
    const nextIds = new Set(shownItems.map((item) => item.id));
    pruneReactionTargets(nextIds);
    shownItems.forEach((item) => {
      if (!reactionTargetTokensRef.current.has(item.id)) reactionTargetTokensRef.current.set(item.id, {});
    });
    const generation = feedGenerationRef.current + 1;
    feedGenerationRef.current = generation;
    snapshotRef.current = nextSnapshot;
    lastVerifiedAtRef.current = Date.now();
    if (staleTimerRef.current !== null) window.clearTimeout(staleTimerRef.current);
    const checkFreshness = () => {
      if (!snapshotRef.current) return;
      setClockVersion((version) => version + 1);
      const retained = activeFeedItems(snapshotRef.current, snapshotClock(snapshotRef.current));
      setStatus(retained.length ? 'ready' : 'empty');
      if (snapshotFreshnessRequired() && lastVerifiedAtRef.current !== null && Date.now() - lastVerifiedAtRef.current >= 60_000) { clearFeed('error'); return; }
      staleTimerRef.current = window.setTimeout(checkFreshness, Math.min(60_000, nextPollingBoundary() - Date.now()));
    };
    staleTimerRef.current = window.setTimeout(checkFreshness, 60_000);
    setSnapshot(nextSnapshot);
    setStatus(visibleItems.length > 0 ? 'ready' : 'empty');
    setClockVersion((version) => version + 1);

    clearExpiryTimer();
    const scheduleExpiry = () => {
      const current = snapshotRef.current;
      if (!current) return;
      const freshItems = activeFeedItems(current, snapshotClock(current));
      const freshIds = new Set([...freshItems, ...olderAfter(freshItems, olderItemsRef.current)].map((item) => item.id));
      pruneReactionTargets(freshIds);
      feedGenerationRef.current += 1;
      setClockVersion((version) => version + 1);
      setStatus(freshItems.length > 0 ? 'ready' : 'empty');
      if (freshItems.length > 0) {
        const elapsedMs = Math.max(0, snapshotClock(current) - current.verifiedMonotonicMs);
        const remainingMs = Math.min(...freshItems.map((item) => (
          Date.parse(item.expiresAt) - (current.verifiedServerTimeMs + elapsedMs)
        )));
        expiryTimerRef.current = setSafeTimeout(scheduleExpiry, Math.max(20, remainingMs + 5));
      } else {
        expiryTimerRef.current = null;
      }
    };
    if (visibleItems.length > 0) {
      const elapsedMs = Math.max(0, snapshotClock(nextSnapshot) - nextSnapshot.verifiedMonotonicMs);
      const remainingMs = Math.min(...visibleItems.map((item) => (
        Date.parse(item.expiresAt) - (nextSnapshot.verifiedServerTimeMs + elapsedMs)
      )));
      expiryTimerRef.current = setSafeTimeout(scheduleExpiry, Math.max(20, remainingMs + 5));
    }

    void loadReactions(shownItems, generation, false, false, automatic);
    if (olderPagesRef.current > 0) void refreshOlder(nextSnapshot, automatic);
  }, [clearExpiryTimer, clearFeed, loadReactions, pruneReactionTargets, refreshOlder, snapshotClock]);

  const fetchFeed = useCallback(async (manual = false) => {
    if (manual) {
      pollStateRef.current.lastStartedAt = Date.now();
      pollStateRef.current.initialPending = false;
      pollStateRef.current.mode = pollingMode();
    }
    if (!active || document.visibilityState === 'hidden') return;
    const serial = requestSerialRef.current + 1;
    requestSerialRef.current = serial;
    feedControllerRef.current?.abort();
    const controller = new AbortController();
    feedControllerRef.current = controller;
    const requestStartedAt = monotonicNow();
    const deadline = window.setTimeout(() => controller.abort(), FEED_READ_DEADLINE_MS);
    feedDeadlineRef.current = deadline;
    // One read of the list. A conditional read sends the remembered tag, so an
    // unchanged list costs no download.
    const read = async (conditional: boolean): Promise<void> => {
      const headers: Record<string, string> = { accept: 'application/json' };
      const sentTag = conditional && snapshotRef.current && feedEtagRef.current ? feedEtagRef.current : null;
      if (sentTag) headers['If-None-Match'] = `"${sentTag}"`;
      // The page's HTML may already have started this very read (src/lib/early-read.ts).
      // A whole read takes that answer once; its age counts from when it really started.
      let startedAt = requestStartedAt;
      let response: Response | null = null;
      const early = sentTag ? null : takeEarlyRead('feed', monotonicNow());
      if (early) {
        try {
          // Its deadline counts from its real start, so a read that hung before the page's
          // code loaded is not given a second full wait.
          response = await awaitEarlyRead(early, controller.signal, FEED_READ_DEADLINE_MS - (monotonicNow() - early.startedAt));
          startedAt = early.startedAt;
        } catch (error) {
          if (controller.signal.aborted || error instanceof EarlyReadTimeoutError) throw error;
          response = null;
        }
      }
      if (!response) {
        response = await fetch('/api/feed', {
          cache: 'no-store',
          credentials: 'include',
          headers,
          signal: controller.signal,
        });
      }
      const responseTag = readFeedEtag(response);
      if (response.status === 304) {
        // The host answers a matching conditional request itself, with no body. It
        // stands for the server's unchanged heartbeat; the time comes from its Date.
        if (serial !== requestSerialRef.current || controller.signal.aborted) return;
        const current = snapshotRef.current;
        if (!current || !sentTag || feedEtagRef.current !== sentTag || (responseTag !== null && responseTag !== sentTag)) {
          throw new Error('Feed reply was Not Modified without a matching snapshot.');
        }
        const verifiedServerTimeMs = notModifiedServerTimeMs(
          response.headers.get('date'),
          current.verifiedServerTimeMs + Math.max(0, startedAt - current.verifiedMonotonicMs),
        );
        applySnapshot({
          ...current,
          serverTime: new Date(verifiedServerTimeMs).toISOString(),
          verifiedServerTimeMs,
          verifiedMonotonicMs: startedAt,
        }, !manual);
        return;
      }
      if (!response.ok) throw new Error(`Feed request failed with status ${response.status}`);
      const payload: unknown = await response.json();
      const heartbeat = verifyFeedHeartbeat(payload, startedAt);
      if (heartbeat) {
        const current = snapshotRef.current;
        if (!current || !feedEtagRef.current || responseTag !== feedEtagRef.current) throw new Error('Feed heartbeat did not match the current snapshot.');
        if (serial !== requestSerialRef.current || controller.signal.aborted) return;
        applySnapshot({
          ...current,
          serverTime: heartbeat.serverTime,
          verifiedServerTimeMs: heartbeat.verifiedServerTimeMs,
          verifiedMonotonicMs: heartbeat.verifiedMonotonicMs,
        }, !manual);
        return;
      }
      const nextSnapshot = verifyFeedSnapshot(payload, startedAt);
      if (!nextSnapshot) throw new Error('Feed response was not valid.');
      if (serial !== requestSerialRef.current || controller.signal.aborted) return;
      feedEtagRef.current = responseTag;
      applySnapshot(nextSnapshot, !manual);
    };
    try {
      const conditional = conditionalReadsAllowed() && Boolean(snapshotRef.current && feedEtagRef.current);
      try {
        await read(conditional);
        if (conditional && serial === requestSerialRef.current && !controller.signal.aborted) conditionalReadFailures = 0;
      } catch (error) {
        // A conditional read that fails for any reason is tried once more as a whole
        // read, so the shortcut can never be the reason the list is lost.
        if (!conditional || serial !== requestSerialRef.current || controller.signal.aborted) throw error;
        conditionalReadFailures += 1;
        await read(false);
      }
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
      void fetchFeed(true);
    };
    // Refetch without showing the loading state, so the list never blinks.
    refreshRef.current = () => { void fetchFeed(true); };
    retryReactionsRef.current = () => {
      const current = snapshotRef.current;
      if (!current) return;
      void loadReactions(currentItems(current), feedGenerationRef.current, true);
    };
  }, [currentItems, fetchFeed, loadReactions]);

  useEffect(() => {
    // A navigation is a new user-opened view, not an automatic catch-up poll.
    if (pollPathRef.current !== pathname) {
      pollPathRef.current = pathname;
      pollStateRef.current = createPollingState();
    }
    if (!active || pathname === '/recognize') {
      return;
    }

    let stopPolling: (() => void) | undefined;
    const onVisibilityChange = () => {
      if (snapshotFreshnessRequired()) {
        if (document.visibilityState === 'hidden' || document.hidden) clearFeed('hidden');
        else if (!snapshotRef.current) setStatus('scheduled');
      }
    };
    if (homePage) document.addEventListener('visibilitychange', onVisibilityChange);
    const initialRequest = window.setTimeout(() => {
      if (homePage) {
        stopPolling = startVisiblePoll((initialRead) => { void fetchFeed(initialRead); }, 10_000, () => {
          setClockVersion((version) => version + 1);
          if (snapshotFreshnessRequired() && lastVerifiedAtRef.current !== null && Date.now() - lastVerifiedAtRef.current >= 60_000) clearFeed('scheduled');
        }, { state: pollStateRef.current });
      } else {
        void fetchFeed(true);
      }
    }, 0);
    return () => {
      window.clearTimeout(initialRequest);
      stopPolling?.();
      if (homePage) document.removeEventListener('visibilitychange', onVisibilityChange);
      clearFeed('loading');
    };
  }, [active, clearFeed, fetchFeed, homePage, pathname]);

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

  const liveItems = snapshot ? activeFeedItems(snapshot, snapshotClock(snapshot)) : [];
  const context: PublicFeedContextValue = {
    items: liveItems,
    status,
    olderItems: status === 'ready' ? olderAfter(liveItems, olderItems) : [],
    olderStatus,
    loadOlder: () => { void loadOlder(); },
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

/** The count as a screen reader says it, so the button's name holds its visible number. */
function spokenLikes(count: number) {
  return `${count} ${count === 1 ? 'like' : 'likes'}`;
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
    ? `Like recognition for ${item.recipient}, ${spokenLikes(reactionItem.count)}`
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
          aria-label={`Hearts paused for ${item.recipient}, ${spokenLikes(confirmedItem.count)}. ${reaction.recovery.message}`}
          aria-describedby={recoveryId}
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
          aria-label={reaction.item
            ? `Enable cookies, then retry hearts for ${item.recipient}, ${spokenLikes(reaction.item.count)}`
            : `Enable cookies, then retry hearts for ${item.recipient}`}
          aria-describedby={recoveryId}
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
