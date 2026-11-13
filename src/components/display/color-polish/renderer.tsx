'use client';

import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COLOR_POLISH_SCENES,
  COLOR_POLISH_VERSION,
  type ColorPolishRendererProps,
  type ColorPolishScene,
  type ColorPolishSnapshot,
} from '@/lib/color-polish/contracts';
import {
  DISPLAY_EXTERNAL_URLS,
  type Aggregate,
  type DisplayEffects,
  type DisplayPlaylistEntry,
  type DisplaySettings,
  type DisplaySound,
  type Recognition,
} from '@/lib/contracts';
export type { ColorPolishRendererProps, ColorPolishSnapshot } from '@/lib/color-polish/contracts';

const RENDERER_URL = '/color-polish/renderer.html';
const RECOGNIZE_URL = 'https://mothers-love.vercel.app/recognize';
const PREVIEW_BUILD = process.env.COLOR_POLISH_PREVIEW_BUILD === 'true';
// The single preview-build gate. Exported so the display host can read the same
// value instead of testing the environment variable a second time.
export const COLOR_POLISH_PREVIEW_BUILD = PREVIEW_BUILD;
// The TV QR code opens the home page, not the recognition form.
const QR_TARGET_URL = 'https://mothers-love.vercel.app/';
const MAX_RECOGNITIONS = 1_000;
const MAX_ARRIVALS = 1_000;
const MAX_TEXT = 4_000;
const MAX_RECIPIENT = 512;
const MAX_CLOCK_MS = 86_400_000;

type BridgeChannel = {
  nonce: string;
  port: MessagePort;
  sequence: number;
  ready: boolean;
};

type BridgeControl = {
  nowMs: number;
  status: ColorPolishRendererProps['status'];
  source: ColorPolishRendererProps['source'];
  scene?: ColorPolishScene;
  replayKey?: number;
  playing: boolean;
  elapsedMs?: number;
  reactionCounts: Record<string, number>;
  reactionTotal: number | null;
  submissionUrl: string;
  qrDataUrl: string | null;
  welcomeId?: string;
};

// lvz.app's church display opens this TV with ?welcome=<recognition id> when a new recognition is
// published, so the renderer plays that recognition's arrival on first load (Anthony, 2026-11-13).
function welcomeIdFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const value = new URLSearchParams(window.location.search).get('welcome');
  return value && /^[A-Za-z0-9-]{8,128}$/.test(value) ? value : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function boundedNumber(value: unknown, fallback = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  return isFiniteNumber(value) ? Math.max(0, Math.min(maximum, value)) : fallback;
}

function boundedText(value: unknown, maximum = MAX_TEXT): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum ? value : null;
}

function validDateText(value: unknown): string | null {
  const text = boundedText(value, 64);
  if (!text || !Number.isFinite(Date.parse(text))) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const check = new Date(`${text}T12:00:00.000Z`);
    if (check.toISOString().slice(0, 10) !== text) return null;
  }
  return text;
}

function bridgeAggregate(value: Aggregate | null | undefined): Aggregate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const periodStart = validDateText(value.periodStart);
  const periodEnd = validDateText(value.periodEnd);
  if (!periodStart || !periodEnd || !Array.isArray(value.expressionCounts) || value.expressionCounts.length !== 9) return null;
  return {
    periodStart,
    periodEnd,
    recognitions: Math.floor(boundedNumber(value.recognitions, 0, 100_000_000)),
    expressionCounts: Array.from({ length: 9 }, (_, index) => Math.floor(boundedNumber(value.expressionCounts[index], 0, 100_000_000))),
    expressionTotal: Math.floor(boundedNumber(value.expressionTotal, 0, 100_000_000)),
    revision: Math.floor(boundedNumber(value.revision, 0, Number.MAX_SAFE_INTEGER)),
  };
}

function bridgeRecognition(value: Recognition): Recognition | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = boundedText(value.id, 128);
  const recipient = boundedText(value.recipient, MAX_RECIPIENT);
  const message = boundedText(value.message, MAX_TEXT);
  const createdAt = validDateText(value.createdAt);
  const firstPublishedAt = validDateText(value.firstPublishedAt);
  const expiresAt = validDateText(value.expiresAt);
  const expressionIds = Array.isArray(value.expressionIds)
    ? [...new Set(value.expressionIds.filter((id) => Number.isSafeInteger(id) && id >= 1 && id <= 9))]
    : [];
  if (!id || !recipient || !message || !createdAt || !firstPublishedAt || !expiresAt || value.status !== 'published' || !Array.isArray(value.expressionIds) || expressionIds.length !== value.expressionIds.length || expressionIds.length < 1 || expressionIds.length > 9) return null;
  return {
    id,
    recipient,
    message,
    expressionIds,
    createdAt,
    firstPublishedAt,
    expiresAt,
    version: Math.max(1, Math.floor(boundedNumber(value.version, 1, 1000))),
    status: 'published',
    featured: value.featured === true,
  };
}

function bridgeSettings(value: DisplaySettings): DisplaySettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !['normal', 'quiet', 'neutral'].includes(value.mode) || !['calm', 'standard', 'lively', 'still'].includes(value.motion)) return null;
  const playlist: DisplayPlaylistEntry[] | undefined = Array.isArray(value.playlist)
    ? value.playlist.slice(0, COLOR_POLISH_SCENES.length).flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
        const id = boundedText(entry.id, 64);
        if (!id || typeof entry.enabled !== 'boolean') return [];
        return [{ id: id as DisplayPlaylistEntry['id'], enabled: entry.enabled, ...(isFiniteNumber(entry.durationSeconds) ? { durationSeconds: Math.floor(Math.max(12, Math.min(180, entry.durationSeconds))) } : {}) }];
      })
    : undefined;
  const effects: DisplayEffects | undefined = value.effects && typeof value.effects === 'object' && !Array.isArray(value.effects)
    ? {
        trails: value.effects.trails === true,
        constellations: value.effects.constellations === true,
        ...(value.effects.sparkles === undefined ? {} : { sparkles: value.effects.sparkles === true }),
        ...(value.effects.background === undefined ? {} : { background: value.effects.background === true }),
      }
    : undefined;
  const sound: DisplaySound | undefined = value.sound && typeof value.sound === 'object' && !Array.isArray(value.sound)
    ? {
        enabled: value.sound.enabled === true,
        volume: Math.max(0, Math.min(0.4, boundedNumber(value.sound.volume))),
        arrivalChime: value.sound.arrivalChime === true,
        milestoneChime: value.sound.milestoneChime === true,
      }
    : undefined;
  return {
    version: Math.max(1, Math.floor(boundedNumber(value.version, 1, 1000))),
    mode: value.mode,
    motion: value.motion,
    pauseArrivals: value.pauseArrivals === true,
    pauseRotation: value.pauseRotation === true,
    collectionOpen: value.collectionOpen === true,
    lowActivityMinutes: Math.floor(boundedNumber(value.lowActivityMinutes, 1, 180)),
    readingSeconds: Math.floor(boundedNumber(value.readingSeconds, 8, 60)),
    maxBubbles: Math.floor(boundedNumber(value.maxBubbles, 1, 1000)),
    showTrails: value.showTrails === true,
    showConstellations: value.showConstellations === true,
    ...(value.gardenAmount === undefined ? {} : { gardenAmount: value.gardenAmount }),
    ...(playlist ? { playlist } : {}),
    ...(value.tempo ? { tempo: value.tempo } : {}),
    ...(value.durationOverrides ? { durationOverrides: { ...value.durationOverrides } } : {}),
    ...(effects ? { effects } : {}),
    ...(sound ? { sound } : {}),
    externalUrls: DISPLAY_EXTERNAL_URLS,
  };
}

function bridgePresentation(value: ColorPolishSnapshot['presentation'] | null | undefined): ColorPolishSnapshot['presentation'] {
  const source = value && typeof value === 'object' ? value : ({} as ColorPolishSnapshot['presentation']);
  return {
    version: COLOR_POLISH_VERSION,
    enabled: source.enabled === true,
    playlist: Array.isArray(source.playlist)
      ? source.playlist.slice(0, COLOR_POLISH_SCENES.length).flatMap((entry) => {
          if (!entry || !COLOR_POLISH_SCENES.includes(entry.id) || typeof entry.enabled !== 'boolean' || !isFiniteNumber(entry.durationSeconds)) return [];
          return [{ id: entry.id, enabled: entry.enabled, durationSeconds: Math.floor(Math.max(12, Math.min(180, entry.durationSeconds))) }];
        })
      : [],
  };
}

function bridgeSnapshot(value: ColorPolishSnapshot | null): ColorPolishSnapshot | null {
  if (!value || typeof value !== 'object' || !value.presentation || value.presentation.version !== COLOR_POLISH_VERSION || !value.presentation.enabled || !value.settings || !value.aggregate || !value.insights) return null;
  const recognitions = Array.isArray(value.recognitions)
    ? value.recognitions.slice(0, MAX_RECOGNITIONS).flatMap((entry) => {
        const bridged = bridgeRecognition(entry);
        return bridged ? [bridged] : [];
      })
    : [];
  const presentation = bridgePresentation(value.presentation);
  const aggregate = bridgeAggregate(value.aggregate);
  const settings = bridgeSettings(value.settings);
  const insights = value.insights && typeof value.insights === 'object' && !Array.isArray(value.insights) ? value.insights : null;
  const goal = insights?.goal && typeof insights.goal === 'object' && !Array.isArray(insights.goal) ? insights.goal : null;
  const currentWeek = bridgeAggregate(insights?.currentWeek as Aggregate | undefined);
  const previousWeek = bridgeAggregate(insights?.previousWeek as Aggregate | undefined);
  const month = bridgeAggregate(insights?.month as Aggregate | undefined);
  const campaign = bridgeAggregate(insights?.campaign as Aggregate | undefined);
  const serverTime = validDateText(value.serverTime);
  if (!presentation.enabled || presentation.playlist.length === 0 || !aggregate || !settings || !insights || !goal || !currentWeek || !previousWeek || !month || !campaign || !serverTime) return null;
  return {
    serverTime,
    revision: Math.floor(boundedNumber(value.revision, 0, Number.MAX_SAFE_INTEGER)),
    recognitions,
    aggregate,
    settings,
    submissionUrl: typeof value.submissionUrl === 'string' ? value.submissionUrl.slice(0, 256) : '',
    cursor: typeof value.cursor === 'string' ? value.cursor.slice(0, 256) : '',
    sync: value.sync === 'delta' ? 'delta' : 'reset',
    arrivals: Array.isArray(value.arrivals)
      ? value.arrivals.slice(0, MAX_ARRIVALS).flatMap((arrival) => {
          const eventId = boundedText(arrival.eventId, 128);
          const recognitionId = boundedText(arrival.recognitionId, 128);
          const publishedAt = validDateText(arrival.publishedAt);
          return eventId && recognitionId && publishedAt ? [{ eventId, recognitionId, publishedAt }] : [];
        })
      : [],
    presentation,
    insights: {
      calendar: Array.isArray(insights.calendar) ? insights.calendar.slice(0, 366).flatMap((entry) => { const bridged = bridgeAggregate(entry as Aggregate); return bridged ? [bridged] : []; }) : [],
      currentWeek,
      previousWeek,
      month,
      campaign,
      goal: {
        weekStart: boundedText(goal.weekStart, 32) ?? '',
        weekEnd: boundedText(goal.weekEnd, 32) ?? '',
        expressionId: Math.max(1, Math.min(9, Math.floor(boundedNumber(goal.expressionId, 1, 9)))),
        value: Math.floor(boundedNumber(goal.value, 0, 100_000_000)),
        target: Math.max(1, Math.floor(boundedNumber(goal.target, 1, 100_000_000))),
        achieved: goal.achieved === true,
      },
    },
  };
}

function createNonce(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(24);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure channel unavailable');
}

function buildQrDataUrl(url: string): Promise<string | null> {
  if (url !== RECOGNIZE_URL) return Promise.resolve(null);
  return QRCode.toDataURL(QR_TARGET_URL, { margin: 1, width: 180, color: { dark: '#303342', light: '#fffdf6' } })
    .then((value) => value.startsWith('data:image/png;base64,') ? value : null)
    .catch(() => null);
}

/**
 * holdInput is a preview-build only affordance for the one screen preview links
 * (/display?scene=...). When it is on, the iframe stops receiving pointer events
 * and leaves the tab order, so the click, tap, ArrowRight and Space handlers that
 * live inside the renderer document never fire and the held screen stays put.
 * It is ignored on production builds, where the gate below is false.
 */
export type ColorPolishRendererHostProps = ColorPolishRendererProps & { holdInput?: boolean };

export function ColorPolishRenderer({
  snapshot,
  nowMs,
  status,
  source,
  scene,
  replayKey,
  playing = true,
  elapsedMs,
  reactionCounts = {},
  reactionTotal = null,
  className,
  onReady,
  holdInput = false,
}: ColorPolishRendererHostProps) {
  const inputHeld = PREVIEW_BUILD && holdInput === true;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const channelRef = useRef<BridgeChannel | null>(null);
  const readyCallbackRef = useRef(onReady);
  const bootstrapCleanupRef = useRef<{ listener: (event: MessageEvent) => void; timeoutId: number } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const safeMode = status !== 'ready' || snapshot === null;
  // Keyed on source only: a status change (ready to unavailable and back) is
  // carried to the child through the postMessage control below, never by
  // remounting the iframe. Remounting would drop the bootstrap handshake and
  // force a fresh blank state, which is exactly the flash this avoids.
  const frameKey = source;
  const bridgedSnapshot = useMemo(() => bridgeSnapshot(snapshot), [snapshot]);

  useEffect(() => {
    readyCallbackRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let mounted = true;
    void buildQrDataUrl(snapshot?.submissionUrl ?? '').then((value) => {
      if (mounted) setQrDataUrl(value);
    });
    return () => {
      mounted = false;
    };
  }, [snapshot?.submissionUrl]);

  useEffect(() => {
    return () => {
      const channel = channelRef.current;
      channelRef.current = null;
      channel?.port.close();
      const bootstrapCleanup = bootstrapCleanupRef.current;
      if (bootstrapCleanup) {
        bootstrapCleanupRef.current = null;
        window.clearTimeout(bootstrapCleanup.timeoutId);
        window.removeEventListener('message', bootstrapCleanup.listener);
      }
    };
  }, [frameKey]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const channel = channelRef.current;
    if (!iframe || !channel?.ready || !channel.port) return;
    const sequence = channel.sequence + 1;
    if (sequence > 2_000_000_000) return;
    channel.sequence = sequence;
    const control: BridgeControl = {
      nowMs: boundedNumber(nowMs, 0, Number.MAX_SAFE_INTEGER),
      status,
      source,
      ...(scene === undefined ? {} : { scene }),
      ...(replayKey === undefined ? {} : { replayKey: Math.floor(boundedNumber(replayKey, 0, Number.MAX_SAFE_INTEGER)) }),
      playing: playing === true,
      ...(elapsedMs === undefined ? {} : { elapsedMs: boundedNumber(elapsedMs, 0, MAX_CLOCK_MS) }),
      reactionCounts: Object.fromEntries(Object.entries(reactionCounts).slice(0, MAX_RECOGNITIONS).flatMap(([id, count]) => boundedText(id, 128) && isFiniteNumber(count) ? [[id, Math.floor(boundedNumber(count, 0, 100_000_000))]] : [])),
      reactionTotal: safeMode || !isFiniteNumber(reactionTotal) ? null : Math.floor(boundedNumber(reactionTotal, 0, Number.MAX_SAFE_INTEGER)),
      submissionUrl: snapshot?.submissionUrl ?? '',
      qrDataUrl,
      ...(welcomeIdFromUrl() ? { welcomeId: welcomeIdFromUrl() } : {}),
    };
    channel.port.postMessage({
      version: COLOR_POLISH_VERSION,
      type: 'color-polish:update',
      nonce: channel.nonce,
      sequence,
      snapshot: safeMode ? null : bridgedSnapshot,
      control,
    });
  }, [bridgedSnapshot, elapsedMs, nowMs, playing, qrDataUrl, reactionCounts, reactionTotal, replayKey, safeMode, scene, snapshot, source, status]);

  function handleLoad(event: React.SyntheticEvent<HTMLIFrameElement>) {
    const iframe = event.currentTarget;
    const previous = channelRef.current;
    previous?.port.close();
    const previousBootstrapCleanup = bootstrapCleanupRef.current;
    if (previousBootstrapCleanup) {
      bootstrapCleanupRef.current = null;
      window.clearTimeout(previousBootstrapCleanup.timeoutId);
      window.removeEventListener('message', previousBootstrapCleanup.listener);
    }
    const nonce = createNonce();
    const messageChannel = new MessageChannel();
    const channel: BridgeChannel = { nonce, port: messageChannel.port1, sequence: 0, ready: false };
    channelRef.current = channel;
    const markReady = (value: unknown) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const message = value as Record<string, unknown>;
      if (message.version !== COLOR_POLISH_VERSION || message.type !== 'color-polish:ready' || message.nonce !== nonce || message.sequence !== 0) return;
      if (!channel.ready) {
        channel.ready = true;
        readyCallbackRef.current?.();
      }
      const current = channelRef.current;
      if (current === channel) {
        const sequence = current.sequence + 1;
        if (sequence <= 2_000_000_000) {
          current.sequence = sequence;
          current.port.postMessage({
            version: COLOR_POLISH_VERSION,
            type: 'color-polish:update',
            nonce,
            sequence,
            snapshot: safeMode ? null : bridgedSnapshot,
            control: {
              nowMs: boundedNumber(nowMs, 0, Number.MAX_SAFE_INTEGER),
              status,
              source,
              ...(scene === undefined ? {} : { scene }),
              ...(replayKey === undefined ? {} : { replayKey: Math.floor(boundedNumber(replayKey, 0, Number.MAX_SAFE_INTEGER)) }),
              playing: playing === true,
              ...(elapsedMs === undefined ? {} : { elapsedMs: boundedNumber(elapsedMs, 0, MAX_CLOCK_MS) }),
              reactionCounts: Object.fromEntries(Object.entries(reactionCounts).slice(0, MAX_RECOGNITIONS).flatMap(([id, count]) => boundedText(id, 128) && isFiniteNumber(count) ? [[id, Math.floor(boundedNumber(count, 0, 100_000_000))]] : [])),
              reactionTotal: safeMode || !isFiniteNumber(reactionTotal) ? null : Math.floor(boundedNumber(reactionTotal, 0, Number.MAX_SAFE_INTEGER)),
              submissionUrl: snapshot?.submissionUrl ?? '',
              qrDataUrl,
              ...(welcomeIdFromUrl() ? { welcomeId: welcomeIdFromUrl() } : {}),
            } satisfies BridgeControl,
          });
        }
      }
    };
    const onWindowMessage = (messageEvent: MessageEvent) => {
      const expectedOrigin = PREVIEW_BUILD ? window.location.origin : 'null';
      if (messageEvent.source !== iframe.contentWindow || messageEvent.origin !== expectedOrigin) return;
      markReady(messageEvent.data);
    };
    window.addEventListener('message', onWindowMessage);
    messageChannel.port1.onmessage = (messageEvent) => markReady(messageEvent.data);
    messageChannel.port1.start();
    iframe.contentWindow?.postMessage({ version: COLOR_POLISH_VERSION, type: 'color-polish:bootstrap', nonce, sequence: 0 }, '*', [messageChannel.port2]);
    const timeoutId = window.setTimeout(() => {
      bootstrapCleanupRef.current = null;
      window.removeEventListener('message', onWindowMessage);
    }, 10_000);
    bootstrapCleanupRef.current = { listener: onWindowMessage, timeoutId };
  }

  return (
    <iframe
      key={frameKey}
      ref={iframeRef}
      title="Mother's Love color polish display"
      src={RENDERER_URL}
      referrerPolicy="no-referrer"
      loading="eager"
      aria-label="Mother's Love color polish display"
      className={className}
      onLoad={handleLoad}
      sandbox={PREVIEW_BUILD ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
      {...(inputHeld ? { tabIndex: -1 } : {})}
      style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff9ed', ...(inputHeld ? { pointerEvents: 'none' as const } : {}) }}
    />
  );
}
