/** The rotation schedule: eligibility, fair order, the playlist, screen durations and clusters. */
import {
  DEFAULT_DISPLAY_GARDEN_AMOUNT,
  DEFAULT_DISPLAY_PLAYLIST,
  DEFAULT_DISPLAY_TEMPO,
  type DisplayScreenId,
  type DisplaySettings,
  type DisplaySnapshot,
  type Recognition,
} from '@/lib/contracts';
import { EXPRESSIONS } from '@/lib/catalog';
import { planGardenRender } from '@/lib/display-performance';
import type { DisplayScreen, PresentationState } from './coordinator-types';
import { readingTotalDuration } from './coordinator-reading';

export const ORDINARY_GAP_MS = 10_000;
const LEGACY_PLAYLIST: DisplayScreen[] = ['garden', 'featured', 'garden', 'impact', 'all-nine', 'cluster'];
const MILESTONE_INTERVAL = 25;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  version: 0,
  mode: 'normal',
  motion: 'standard',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: false,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
};

export function settingsWithDefaults(settings?: Partial<DisplaySettings>): DisplaySettings {
  return { ...DEFAULT_DISPLAY_SETTINGS, ...settings };
}

export function publicationKey(recognition: Recognition): string {
  return `${recognition.id}:${recognition.firstPublishedAt ?? recognition.createdAt}`;
}

export function periodKey(snapshot: DisplaySnapshot): string {
  return snapshot.aggregate.periodStart.slice(0, 7);
}

function isEligible(recognition: Recognition, nowServerMs: number): boolean {
  return (
    recognition.status === 'published' &&
    Date.parse(recognition.expiresAt) > nowServerMs &&
    Boolean(recognition.firstPublishedAt)
  );
}

export function eligible(snapshot: DisplaySnapshot | null, nowMs: number, offsetMs: number): Recognition[] {
  if (!snapshot) return [];
  const nowServerMs = nowMs + offsetMs;
  return snapshot.recognitions.filter((recognition) => isEligible(recognition, nowServerMs));
}

export function byId(items: Recognition[], id: string | null): Recognition | undefined {
  return id ? items.find((item) => item.id === id) : undefined;
}

export function fairSort(items: Recognition[], history: Record<string, number>): Recognition[] {
  return [...items].sort((left, right) => {
    const leftPresented = history[left.id] ?? -1;
    const rightPresented = history[right.id] ?? -1;
    if (leftPresented !== rightPresented) return leftPresented - rightPresented;
    const leftPublished = Date.parse(left.firstPublishedAt ?? left.createdAt);
    const rightPublished = Date.parse(right.firstPublishedAt ?? right.createdAt);
    if (leftPublished !== rightPublished) return rightPublished - leftPublished;
    return left.id.localeCompare(right.id);
  });
}

export function gardenNodeCount(settings: DisplaySettings, availableCount: number): number {
  const gardenAmount = settings.gardenAmount ?? settings.maxBubbles ?? DEFAULT_DISPLAY_GARDEN_AMOUNT;
  return planGardenRender({ availableCount, gardenAmount }).renderedCount;
}

export function nextMilestone(total: number, celebrated: number[]): number | null {
  const candidates = milestoneThresholds(total);
  const crossed = candidates.filter((threshold) => threshold <= total && !celebrated.includes(threshold));
  return crossed.length ? Math.max(...crossed) : null;
}

export function milestoneThresholds(total: number): number[] {
  const safeTotal = Math.max(0, Math.floor(total));
  return Array.from({ length: Math.floor(safeTotal / MILESTONE_INTERVAL) }, (_, index) => (index + 1) * MILESTONE_INTERVAL);
}

function playlistScreen(id: DisplayScreenId): DisplayScreen {
  if (id === 'expressions') return 'all-nine';
  if (id === 'shared-expression') return 'cluster';
  return id;
}

function tempoMultiplier(tempo: DisplaySettings['tempo']): number {
  if (tempo === 'calm' || tempo === 'slow' || tempo === 'gentle') return 1.25;
  if (tempo === 'lively' || tempo === 'fast') return 0.85;
  return 1;
}

export function hasModernPlaylist(settings: DisplaySettings): boolean {
  return Array.isArray(settings.playlist) && settings.playlist.length > 0;
}

export function scheduledPlaylist(settings: DisplaySettings): DisplayScreen[] {
  if (!hasModernPlaylist(settings)) return LEGACY_PLAYLIST;
  const enabled = (settings.playlist ?? DEFAULT_DISPLAY_PLAYLIST).filter((entry) => entry.enabled);
  const garden = enabled.find((entry) => entry.id === 'garden');
  const otherScreens = enabled.filter((entry) => entry.id !== 'garden').map((entry) => playlistScreen(entry.id));
  if (!garden) return otherScreens.length ? otherScreens : ['garden'];
  if (!otherScreens.length) return ['garden'];
  const ordered = enabled.map((entry) => playlistScreen(entry.id));
  return ordered.flatMap((screen, index) => {
    const following = ordered[(index + 1) % ordered.length];
    return screen !== 'garden' && following !== 'garden' ? [screen, 'garden' as DisplayScreen] : [screen];
  });
}

export function availableProgramScreen(settings: DisplaySettings, hasRecognitions: boolean): DisplayScreen {
  const choices = scheduledPlaylist(settings);
  return choices.find((screen) => hasRecognitions || screen !== 'featured') ?? 'fallback';
}

function playlistEntry(settings: DisplaySettings, screen: DisplayScreen) {
  const id: DisplayScreenId | null = screen === 'all-nine'
    ? 'expressions'
    : screen === 'cluster'
      ? 'shared-expression'
      : screen === 'garden' || screen === 'featured' || screen === 'impact' || screen === 'spotlight' || screen === 'daily-practice' || screen === 'one-kind-word' || screen === 'everyday-peace' || screen === 'peace-promise'
        ? screen
        : null;
  return id ? settings.playlist?.find((entry) => entry.id === id) : undefined;
}

export function durationFor(screen: DisplayScreen, settings: DisplaySettings, selected?: Recognition): number {
  const baseSeconds = screen === 'garden' ? (hasModernPlaylist(settings) ? 24 : 20) : screen === 'fallback' ? 20 : screen === 'milestone' ? 8 : 12;
  const entry = playlistEntry(settings, screen);
  const overrideSeconds = entry?.durationSeconds
    ?? (screen === 'all-nine' ? settings.durationOverrides?.expressions : screen === 'cluster' ? settings.durationOverrides?.['shared-expression'] : settings.durationOverrides?.[screen as DisplayScreenId]);
  const gardenDefault = screen === 'garden' && hasModernPlaylist(settings) && overrideSeconds === undefined
    ? (() => {
      const stories = scheduledPlaylist(settings).filter(item => item !== 'garden');
      return stories.length ? Math.max(baseSeconds, 2 * stories.reduce((sum, item) => sum + durationFor(item, settings), 0) / stories.length / 1_000 / tempoMultiplier(settings.tempo ?? DEFAULT_DISPLAY_TEMPO)) : baseSeconds;
    })() : baseSeconds;
  const baseMs = Math.max(12_000, (overrideSeconds ?? gardenDefault) * 1_000 * tempoMultiplier(settings.tempo ?? DEFAULT_DISPLAY_TEMPO));
  if (screen === 'featured') {
    return selected ? Math.max(baseMs, readingTotalDuration(selected)) : baseMs;
  }
  const readingFloor = screen === 'all-nine'
    ? Math.ceil(EXPRESSIONS.map(item => `${item.phrase} ${item.principle}`).join(' ').split(/\s+/).length / 3) * 1_000 + 4_000
    : screen === 'spotlight'
      ? Math.max(...EXPRESSIONS.map(item => Math.ceil(`${item.phrase} ${item.principle} ${item.example ?? ''}`.split(/\s+/).length / 3))) * 1_000 + 4_000
      : screen === 'everyday-peace' ? 24_000
        : screen === 'peace-promise' || screen === 'daily-practice' ? 18_000
          : screen === 'cluster' ? 22_000 : 12_000;
  return Math.round(Math.max(baseMs, readingFloor));
}

export function recognitionForCluster(items: Recognition[], expressionId: number): Recognition[] {
  return items.filter((item) => item.expressionIds.includes(expressionId));
}

export function chooseCluster(items: Recognition[], previousExpressionId: number | null): { expressionId: number | null; ids: string[] } {
  const counts = new Map<number, Recognition[]>();
  for (const item of items) {
    for (const expressionId of item.expressionIds) {
      const current = counts.get(expressionId) ?? [];
      if (!current.some((candidate) => candidate.id === item.id)) current.push(item);
      counts.set(expressionId, current);
    }
  }
  const options = [...counts.entries()]
    .filter(([, matches]) => matches.length >= 1)
    .sort((left, right) => {
      const previous = previousExpressionId ?? 0;
      const leftDistance = (left[0] - previous + 8) % 9;
      const rightDistance = (right[0] - previous + 8) % 9;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left[0] - right[0];
    });
  if (!options.length) return { expressionId: null, ids: [] };
  const [expressionId, matches] = options[0];
  return { expressionId, ids: matches.slice(0, 4).map((match) => match.id) };
}

export function markPresented(state: PresentationState, ids: string[], atMs: number): Record<string, number> {
  const history = { ...state.presentationHistory };
  for (const id of ids) history[id] = atMs;
  return history;
}
