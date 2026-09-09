import { describe, expect, it } from "vitest";
import { DISPLAY_EXTERNAL_URLS, DISPLAY_SCREEN_IDS } from "@/lib/contracts";
import { projectPublicDisplaySnapshot } from "@/lib/server/public-display";
import { normalizeSettingsChanges } from "@/lib/server/validation";

const recognition = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient: "A synthetic recipient",
  message: "A synthetic display message.",
  expressionIds: [1],
  createdAt: "2026-09-08T10:00:00.000Z",
  firstPublishedAt: "2026-09-08T10:00:00.000Z",
  expiresAt: "2026-09-15T10:00:00.000Z",
  version: 1,
  status: "published" as const,
  featured: false,
};

const aggregate = {
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  recognitions: 1,
  expressionCounts: [1, 0, 0, 0, 0, 0, 0, 0, 0],
  expressionTotal: 1,
  revision: 1,
};

const legacySettings = {
  version: 4,
  mode: "normal" as const,
  motion: "standard" as const,
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
};

const playlist = DISPLAY_SCREEN_IDS.map((id) => ({ id, enabled: true }));

const modernSettings = {
  ...legacySettings,
  gardenAmount: "all-active" as const,
  playlist,
  tempo: "standard" as const,
  durationOverrides: { garden: 20, "daily-practice": 12 },
  effects: { trails: true, constellations: true, sparkles: true, background: false },
  sound: { enabled: true, volume: 0.2, arrivalChime: true, milestoneChime: false },
  externalUrls: DISPLAY_EXTERNAL_URLS,
};

function snapshot(settings: unknown = modernSettings) {
  return {
    ok: true,
    serverTime: "2026-09-08T10:01:00.000Z",
    revision: 4,
    recognitions: [recognition],
    aggregate,
    settings,
    submissionUrl: "https://mothers-love.example/recognize",
    cursor: "12.1788861660",
    sync: "reset" as const,
    arrivals: [],
  };
}

describe("display settings contract", () => {
  it("accepts all-active and custom amounts above the legacy display cap", () => {
    expect(normalizeSettingsChanges({ gardenAmount: "all-active" })).toEqual({ gardenAmount: "all-active" });
    expect(normalizeSettingsChanges({ gardenAmount: 999 })).toEqual({ gardenAmount: 999 });
    expect(normalizeSettingsChanges({ gardenAmount: 0 })).toBeNull();
    expect(normalizeSettingsChanges({ gardenAmount: 1.5 })).toBeNull();
    expect(normalizeSettingsChanges({ gardenAmount: Number.MAX_SAFE_INTEGER + 1 })).toBeNull();
  });

  it("accepts the fixed ordered playlist and safe timing, effects, and audio values", () => {
    const changes = normalizeSettingsChanges({
      playlist: [
        { screenId: "garden", enabled: true, durationSeconds: 20 },
        { id: "daily-practice", enabled: false, durationSeconds: 12 },
      ],
      tempo: "standard",
      durationOverrides: { "peace-promise": 15 },
      effects: { trails: true, constellations: false, sparkles: true },
      sound: { enabled: true, volume: 0.2, arrivalChime: true, milestoneChime: false },
      externalUrls: DISPLAY_EXTERNAL_URLS,
    });

    expect(changes).toMatchObject({
      playlist: [
        { id: "garden", enabled: true, durationSeconds: 20 },
        { id: "daily-practice", enabled: false, durationSeconds: 12 },
      ],
      durationOverrides: { "peace-promise": 15 },
    });
  });

  it("rejects unknown screens, duplicate entries, unsafe URLs, and loud audio", () => {
    expect(normalizeSettingsChanges({ playlist: [{ id: "unknown", enabled: true }] })).toBeNull();
    expect(normalizeSettingsChanges({ playlist: [{ id: "garden", enabled: true }, { id: "garden", enabled: true }] })).toBeNull();
    expect(normalizeSettingsChanges({ playlist: [{ id: "garden", enabled: true, url: "https://example.test" }] })).toBeNull();
    expect(normalizeSettingsChanges({ sound: { enabled: true, volume: 0.41, arrivalChime: true, milestoneChime: true } })).toBeNull();
    expect(normalizeSettingsChanges({ externalUrls: { dailyPractice: "https://example.test", peacePromise: DISPLAY_EXTERNAL_URLS.peacePromise } })).toBeNull();
  });

  it("rejects prototype pollution and strips untrusted nested keys", () => {
    const polluted = Object.create(null) as Record<string, unknown>;
    polluted["__proto__"] = { polluted: true };
    expect(normalizeSettingsChanges(polluted)).toBeNull();

    const effects = { trails: true, constellations: true, __proto__: { polluted: true } };
    expect(normalizeSettingsChanges({ effects })).toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("projects modern settings while preserving a bounded legacy maxBubbles alias", () => {
    const projected = projectPublicDisplaySnapshot(snapshot());
    expect(projected?.settings).toEqual(modernSettings);
    expect(projected?.settings.gardenAmount).toBe("all-active");
    expect(projected?.settings.playlist?.map((entry) => entry.id)).toEqual([...DISPLAY_SCREEN_IDS]);
    expect(projected?.settings.maxBubbles).toBe(4);
  });

  it("fails closed for malformed modern settings and still accepts legacy snapshots", () => {
    expect(projectPublicDisplaySnapshot(snapshot({ ...modernSettings, gardenAmount: 0 }))).toBeNull();
    expect(projectPublicDisplaySnapshot(snapshot({ ...modernSettings, playlist: [{ id: "unknown", enabled: true }] }))).toBeNull();
    expect(projectPublicDisplaySnapshot(snapshot({ ...modernSettings, sound: { ...modernSettings.sound, volume: 0.5 } }))).toBeNull();
    expect(projectPublicDisplaySnapshot(snapshot(legacySettings))?.settings).toEqual(legacySettings);
  });
});
