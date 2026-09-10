import type { Aggregate, DisplaySnapshot } from '../contracts';

export const COLOR_POLISH_VERSION = 'color-polish-v6' as const;
export const COLOR_POLISH_SCENES = ['welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone'] as const;
export type ColorPolishScene = typeof COLOR_POLISH_SCENES[number];
export const COLOR_POLISH_DURATIONS: Record<ColorPolishScene, number> = { welcome: 30, garden: 180, featured: 30, calendar: 30, peacemakers: 60, status: 30, expressions: 30, 'peace-in-practice': 60, orbit: 30, milestone: 30 };
export interface ColorPolishGoal { weekStart: string; weekEnd: string; expressionId: number; value: number; target: number; achieved: boolean }
export interface ColorPolishInsights { calendar: Aggregate[]; currentWeek: Aggregate; previousWeek: Aggregate; month: Aggregate; campaign: Aggregate; goal: ColorPolishGoal }
export interface ColorPolishPresentation { version: typeof COLOR_POLISH_VERSION; enabled: boolean; playlist: Array<{ id: ColorPolishScene; enabled: boolean; durationSeconds: number }> }
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
  className?: string;
  onReady?: () => void;
}
