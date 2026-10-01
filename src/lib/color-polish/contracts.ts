import type { Aggregate, DisplaySnapshot } from '../contracts';

export const COLOR_POLISH_VERSION = 'color-polish-v6' as const;
// The ten original screens are always required in a saved playlist. The optional
// screens may be absent from a saved playlist (one saved before they existed);
// normalizeColorPolishPlaylist then appends each with its default entry: enabled,
// default duration, last in the rotation.
export const COLOR_POLISH_REQUIRED_SCENES = ['welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone'] as const;
export const COLOR_POLISH_OPTIONAL_SCENES = ['live-feed'] as const;
export const COLOR_POLISH_SCENES = [...COLOR_POLISH_REQUIRED_SCENES, ...COLOR_POLISH_OPTIONAL_SCENES] as const;
export type ColorPolishScene = typeof COLOR_POLISH_SCENES[number];
export const COLOR_POLISH_DURATIONS: Record<ColorPolishScene, number> = { welcome: 60, garden: 180, featured: 60, calendar: 60, peacemakers: 60, status: 60, expressions: 60, 'peace-in-practice': 60, orbit: 60, milestone: 60, 'live-feed': 60 };
export type ColorPolishPlaylistEntry = { id: ColorPolishScene; enabled: boolean; durationSeconds: number };
/**
 * Returns the playlist with every optional screen present. A saved playlist that
 * predates an optional screen keeps its ten entries untouched and gains the
 * optional screen's default entry at the end. A playlist that already names the
 * optional screen is returned as saved (its place, enabled flag and duration win).
 */
export function normalizeColorPolishPlaylist(playlist: readonly ColorPolishPlaylistEntry[]): ColorPolishPlaylistEntry[] {
  const result = playlist.map((entry) => ({ id: entry.id, enabled: entry.enabled, durationSeconds: entry.durationSeconds }));
  for (const id of COLOR_POLISH_OPTIONAL_SCENES) {
    if (!result.some((entry) => entry.id === id)) result.push({ id, enabled: true, durationSeconds: COLOR_POLISH_DURATIONS[id] });
  }
  return result;
}
export interface ColorPolishGoal { weekStart: string; weekEnd: string; expressionId: number; value: number; target: number; achieved: boolean }
export interface ColorPolishInsights { calendar: Aggregate[]; currentWeek: Aggregate; previousWeek: Aggregate; month: Aggregate; campaign: Aggregate; goal: ColorPolishGoal }
export interface ColorPolishPresentation { version: typeof COLOR_POLISH_VERSION; enabled: boolean; playlist: ColorPolishPlaylistEntry[] }
export interface ColorPolishSnapshot extends DisplaySnapshot { presentation: ColorPolishPresentation; insights: ColorPolishInsights }
export type ColorPolishStatus = 'ready' | 'checking' | 'unavailable' | 'quiet' | 'neutral';
export interface ColorPolishRendererProps {
  snapshot: ColorPolishSnapshot | null;
  nowMs: number;
  status: ColorPolishStatus;
  source: 'sample' | 'live';
  scene?: ColorPolishScene;
  replayKey?: number;
  playing?: boolean;
  elapsedMs?: number;
  reactionCounts?: Record<string, number>;
  reactionTotal?: number | null;
  className?: string;
  onReady?: () => void;
}
