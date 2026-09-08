import { describe, expect, it } from "vitest";
import type {
  Aggregate,
  DisplaySettings,
  DisplaySnapshot,
  Recognition,
  RecognitionInput,
} from "@/lib/contracts";

describe("shared contract shapes", () => {
  it("keeps the input field names stable", () => {
    const input: RecognitionInput = {
      submittedName: "Ava R.",
      recipient: "Mina K.",
      message: "Thank you for your kindness.",
      expressionIds: [2, 6, 8],
      requestKey: "synthetic-request-key",
    };

    expect(Object.keys(input)).toEqual(["submittedName", "recipient", "message", "expressionIds", "requestKey"]);
  });

  it("represents the nine-position aggregate contract", () => {
    const aggregate: Aggregate = {
      periodStart: "2026-09-06T07:00:00.000Z",
      periodEnd: "2026-10-04T06:59:59.999Z",
      recognitions: 0,
      expressionCounts: Array.from({ length: 9 }, () => 0),
      expressionTotal: 0,
      revision: 1,
    };

    expect(aggregate.expressionCounts).toHaveLength(9);
  });

  it("keeps display settings and recognition status typed", () => {
    const settings: DisplaySettings = {
      version: 1,
      mode: "neutral",
      motion: "still",
      pauseArrivals: true,
      pauseRotation: true,
      collectionOpen: false,
      lowActivityMinutes: 20,
      readingSeconds: 20,
      maxBubbles: 4,
      showTrails: false,
      showConstellations: false,
    };
    const recognition: Recognition = {
      id: "synthetic-recognition",
      recipient: "Mina K.",
      message: "A synthetic fixture.",
      expressionIds: [1],
      createdAt: "2026-09-07T00:00:00.000Z",
      firstPublishedAt: null,
      expiresAt: "2026-09-14T00:00:00.000Z",
      version: 1,
      status: "held",
      featured: false,
    };

    expect(settings.mode).toBe("neutral");
    expect(recognition.status).toBe("held");
  });

  it("keeps display sync and device-facing fields explicit", () => {
    const snapshot: Pick<DisplaySnapshot, "cursor" | "sync" | "arrivals"> = {
      cursor: "synthetic-cursor",
      sync: "reset",
      arrivals: [],
    };

    expect(snapshot).toEqual({ cursor: "synthetic-cursor", sync: "reset", arrivals: [] });
  });
});
