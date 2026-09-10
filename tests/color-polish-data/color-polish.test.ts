import { describe, expect, it } from "vitest";
import {
  buildColorPolishGoal,
  calculateColorPolishGoal,
  projectColorPolishPresentationChanges,
  projectColorPolishSnapshot,
  selectLeastUsedExpression,
} from "@/lib/server/color-polish";

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
  enabled: false,
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

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    serverTime: "2026-09-10T18:00:00.000Z",
    revision: 12,
    recognitions: [],
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
  };
}

describe("Color Polish weekly goal", () => {
  it("chooses the first expression for an official-order tie", () => {
    expect(selectLeastUsedExpression([4, 4, 4, 4, 4, 4, 4, 4, 4])).toBe(1);
    expect(selectLeastUsedExpression([5, 2, 2, 3, 4, 5, 6, 7, 8])).toBe(2);
  });

  it("uses zero as the fourth-highest comparison when every other count is zero", () => {
    expect(calculateColorPolishGoal(1, [0, 0, 0, 0, 0, 0, 0, 0, 0], "2026-09-06", "2026-09-12")).toEqual({
      weekStart: "2026-09-06",
      weekEnd: "2026-09-12",
      expressionId: 1,
      value: 0,
      target: 1,
      achieved: false,
    });
    expect(() => calculateColorPolishGoal(1, [0, 0, 0, 0, 0, 0, 0, 0, 0], "2026-09-06", "2026-09-13")).toThrow(TypeError);
  });

  it("keeps focus frozen while the target uses live current-week counts", () => {
    expect(buildColorPolishGoal([2, 2, 2, 2, 2, 2, 2, 2, 2], currentCounts, "2026-09-06", "2026-09-12")).toEqual({
      weekStart: "2026-09-06",
      weekEnd: "2026-09-12",
      expressionId: 1,
      value: 0,
      target: 6,
      achieved: false,
    });
  });
});

describe("Color Polish projection", () => {
  it("projects only the versioned preset and anonymous insights", () => {
    const projected = projectColorPolishSnapshot(snapshot({
      privateAudit: "drop",
      presentation,
    }));

    expect(projected).toEqual(expect.objectContaining({
      submissionUrl: "https://mothers-love.vercel.app/recognize",
      presentation,
    }));
    expect(projected).not.toHaveProperty("privateAudit");
  });

  it("rejects a legacy URL, count mismatch, future calendar day, and an invalid goal", () => {
    expect(projectColorPolishSnapshot(snapshot({ submissionUrl: "https://mothers-love.example/recognize" }))).toBeNull();
    expect(projectColorPolishSnapshot(snapshot({ aggregate: { ...monthAggregate, expressionTotal: 44 } }))).toBeNull();
    expect(projectColorPolishSnapshot(snapshot({ insights: { ...snapshot().insights, calendar: [{ ...monthAggregate, periodStart: "2026-09-11", periodEnd: "2026-09-11" }] } }))).toBeNull();
    expect(projectColorPolishSnapshot(snapshot({ insights: { ...snapshot().insights, goal: { ...snapshot().insights.goal, target: 1 } } }))).toBeNull();
  });

  it("accepts an empty current month calendar while preserving aggregate bounds", () => {
    const value = snapshot({ insights: { ...snapshot().insights, calendar: [] } });
    expect(projectColorPolishSnapshot(value)?.insights.calendar).toEqual([]);
  });
});

describe("Color Polish presentation patch projection", () => {
  it("accepts only allowlisted patch fields and the 180 second Garden preset", () => {
    expect(projectColorPolishPresentationChanges({ playlist: presentation.playlist })).toEqual({ playlist: presentation.playlist });
    expect(projectColorPolishPresentationChanges({ enabled: true })).toBeNull();
    expect(projectColorPolishPresentationChanges({ internalSecret: "drop" })).toBeNull();
    expect(projectColorPolishPresentationChanges({ playlist: presentation.playlist.map((item) => ({ ...item, durationSeconds: 11 })) })).toBeNull();
    expect(projectColorPolishPresentationChanges({ playlist: presentation.playlist.map((item) => ({ ...item, durationSeconds: 181 })) })).toBeNull();
  });
});
