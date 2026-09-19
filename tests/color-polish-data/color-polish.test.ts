import { describe, expect, it } from "vitest";
import {
  buildColorPolishGoal,
  calculateColorPolishGoal,
  projectColorPolishPresentationChanges,
  projectColorPolishSnapshot,
  selectLeastUsedExpression,
} from "@/lib/server/color-polish";
import { COLOR_POLISH_DURATIONS, COLOR_POLISH_SCENES, normalizeColorPolishPlaylist } from "@/lib/color-polish/contracts";
import { validateColorPolishPresentationChanges, validateColorPolishSnapshot } from "@/lib/color-polish/validation";

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

const liveFeedDefault = { id: "live-feed", enabled: true, durationSeconds: 60 };

describe("Color Polish projection", () => {
  it("projects only the versioned preset and anonymous insights", () => {
    const projected = projectColorPolishSnapshot(snapshot({
      privateAudit: "drop",
      presentation,
    }));

    // The saved ten entry playlist is projected with the optional live-feed screen
    // appended at its default (Plan 17 Lane 13); the ten saved entries are untouched.
    expect(projected).toEqual(expect.objectContaining({
      submissionUrl: "https://mothers-love.vercel.app/recognize",
      presentation: { ...presentation, playlist: [...presentation.playlist, liveFeedDefault] },
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

// Plan 17 Lane 13: the optional eleventh screen, slug live-feed. These are the
// compatibility proofs for database/014_color_polish_live_feed.sql.
describe("Color Polish live-feed playlist compatibility", () => {
  const ten = presentation.playlist;

  it("knows eleven screens with live-feed last at 60 seconds", () => {
    expect(COLOR_POLISH_SCENES).toHaveLength(11);
    expect(COLOR_POLISH_SCENES[10]).toBe("live-feed");
    expect(COLOR_POLISH_DURATIONS["live-feed"]).toBe(60);
  });

  it("proof (a), before the SQL runs: a saved ten entry playlist gains live-feed enabled, 60 seconds, last, on the server and in the browser", () => {
    const server = projectColorPolishSnapshot(snapshot({ presentation }));
    expect(server?.presentation.playlist).toHaveLength(11);
    expect(server?.presentation.playlist.slice(0, 10)).toEqual(ten);
    expect(server?.presentation.playlist[10]).toEqual(liveFeedDefault);

    // The browser validates what the server sent (eleven entries) and also a raw ten
    // entry payload, for instance one cached from before the release.
    expect(validateColorPolishSnapshot(server)?.presentation.playlist).toEqual([...ten, liveFeedDefault]);
    expect(validateColorPolishSnapshot(snapshot({ presentation }))?.presentation.playlist).toEqual([...ten, liveFeedDefault]);
  });

  it("proof (b), after the SQL runs: a saved eleven entry playlist keeps live-feed's own place, flag and duration", () => {
    const saved = [ten[0], { id: "live-feed", enabled: false, durationSeconds: 45 }, ...ten.slice(1)];
    const server = projectColorPolishSnapshot(snapshot({ presentation: { ...presentation, playlist: saved } }));
    expect(server?.presentation.playlist).toEqual(saved);
    expect(validateColorPolishSnapshot(server)?.presentation.playlist).toEqual(saved);
    // Ten entries stay valid after the SQL as well.
    expect(projectColorPolishSnapshot(snapshot({ presentation }))?.presentation.playlist).toHaveLength(11);
  });

  it("still requires all ten original screens and refuses duplicates, unknown screens and a twelfth entry", () => {
    const withLiveFeed = [...ten, liveFeedDefault];
    const project = (playlist: unknown) => projectColorPolishSnapshot(snapshot({ presentation: { ...presentation, playlist } }));
    const validate = (playlist: unknown) => validateColorPolishSnapshot(snapshot({ presentation: { ...presentation, playlist } }));
    const cases: unknown[] = [
      ten.slice(0, 9),
      [...ten.slice(0, 9), liveFeedDefault],
      [...withLiveFeed, liveFeedDefault],
      [...ten, { id: "unknown-screen", enabled: true, durationSeconds: 60 }],
      [...ten, { ...liveFeedDefault, durationSeconds: 11 }],
      [...ten, { ...liveFeedDefault, durationSeconds: 181 }],
      [...ten, { ...liveFeedDefault, extra: true }],
      withLiveFeed.map((item) => ({ ...item, enabled: false })),
    ];
    for (const playlist of cases) {
      expect(project(playlist)).toBeNull();
      expect(validate(playlist)).toBeNull();
    }
    expect(project(withLiveFeed)).not.toBeNull();
    expect(validate(withLiveFeed)).not.toBeNull();
  });

  it("stores a change request exactly as sent, so ten entries still save against the old validator", () => {
    expect(projectColorPolishPresentationChanges({ playlist: ten })).toEqual({ playlist: ten });
    expect(projectColorPolishPresentationChanges({ playlist: [...ten, liveFeedDefault] })).toEqual({ playlist: [...ten, liveFeedDefault] });
    expect(validateColorPolishPresentationChanges({ playlist: ten })).toEqual(ten);
    expect(validateColorPolishPresentationChanges({ playlist: [...ten, liveFeedDefault] })).toEqual([...ten, liveFeedDefault]);
  });

  it("normalizes without changing the saved entries or their order", () => {
    const reordered = [...ten].reverse();
    expect(normalizeColorPolishPlaylist(reordered as never)).toEqual([...reordered, liveFeedDefault]);
    const already = [liveFeedDefault, ...ten];
    expect(normalizeColorPolishPlaylist(already as never)).toEqual(already);
  });

  it("the old production build's rule (exactly ten, known ids only) refuses eleven entries: the reason rollback returns the playlist to ten first", () => {
    // Copied from b7d92a0 src/lib/server/color-polish.ts projectPresentation and
    // src/lib/color-polish/validation.ts presentation: length must equal 10 and every
    // id must be one of the ten. Either check alone answers null, which the old
    // route turns into 503 UNAVAILABLE.
    const oldScenes = ["welcome", "garden", "featured", "calendar", "peacemakers", "status", "expressions", "peace-in-practice", "orbit", "milestone"];
    const oldBuildAccepts = (playlist: Array<{ id: unknown }>) => playlist.length === oldScenes.length && playlist.every((item) => typeof item.id === "string" && oldScenes.includes(item.id));
    expect(oldBuildAccepts(ten)).toBe(true);
    expect(oldBuildAccepts([...ten, liveFeedDefault])).toBe(false);
  });
});
