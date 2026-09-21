import type { ColorPolishSnapshot } from "@/lib/color-polish/contracts";
import { sampleWorldFeed } from "@/components/display/world/world-feed";
const settings = {
  version: 7,
  mode: "normal",
  motion: "standard",
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
};

const currentCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const currentAggregate = {
  periodStart: "2026-09-06",
  periodEnd: "2026-09-10",
  recognitions: 4,
  expressionCounts: currentCounts,
  expressionTotal: 36,
  revision: 6,
};
const monthAggregate = {
  periodStart: "2026-09-01",
  periodEnd: "2026-09-10",
  recognitions: 6,
  expressionCounts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  expressionTotal: 45,
  revision: 9,
};
const calendarAggregate = {
  periodStart: "2026-09-10",
  periodEnd: "2026-09-10",
  recognitions: 2,
  expressionCounts: [0, 1, 1, 0, 0, 0, 0, 0, 0],
  expressionTotal: 2,
  revision: 8,
};
const presentation = {
  version: "color-polish-v6",
  enabled: true,
  playlist: [
    ["welcome", 30],
    ["garden", 180],
    ["featured", 30],
    ["calendar", 30],
    ["peacemakers", 60],
    ["status", 30],
    ["expressions", 30],
    ["peace-in-practice", 60],
    ["orbit", 30],
    ["milestone", 30],
  ].map(([id, durationSeconds]) => ({ id, enabled: true, durationSeconds })),
};

export function snapshot(overrides: Record<string, unknown> = {}) {
  return structuredClone({
    ok: true,
    serverTime: "2026-09-10T18:00:00.000Z",
    revision: 12,
    recognitions: sampleWorldFeed().records,
    aggregate: monthAggregate,
    settings,
    submissionUrl: "https://mothers-love.vercel.app/recognize",
    cursor: "12.1789063200",
    sync: "reset",
    arrivals: [],
    presentation,
    insights: {
      calendar: [calendarAggregate],
      currentWeek: currentAggregate,
      previousWeek: {
        periodStart: "2026-08-30",
        periodEnd: "2026-09-05",
        recognitions: 3,
        expressionCounts: [2, 2, 2, 2, 2, 2, 2, 2, 2],
        expressionTotal: 18,
        revision: 5,
      },
      month: monthAggregate,
      campaign: {
        periodStart: "2026-08-30",
        periodEnd: "2026-09-10",
        recognitions: 9,
        expressionCounts: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        expressionTotal: 54,
        revision: 10,
      },
      goal: {
        weekStart: "2026-09-06",
        weekEnd: "2026-09-12",
        expressionId: 1,
        value: 0,
        target: 6,
        achieved: false,
      },
    },
    ...overrides,
  }) as ColorPolishSnapshot;
}
