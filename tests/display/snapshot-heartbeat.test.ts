import { describe, expect, it } from "vitest";
import {
  parseDisplaySnapshotEtag,
  projectDisplaySnapshotHeartbeat,
} from "@/lib/display/snapshot-heartbeat";

describe("display snapshot conditional response", () => {
  it("accepts only the compact heartbeat body", () => {
    const heartbeat = { unchanged: true, serverTime: "2026-10-12T12:00:00.000Z" };
    expect(projectDisplaySnapshotHeartbeat(heartbeat)).toEqual(heartbeat);
    expect(projectDisplaySnapshotHeartbeat({ ...heartbeat, recognitions: [] })).toBeNull();
    expect(projectDisplaySnapshotHeartbeat({ ...heartbeat, unchanged: false })).toBeNull();
    expect(projectDisplaySnapshotHeartbeat({ unchanged: true, serverTime: "invalid" })).toBeNull();
    expect(projectDisplaySnapshotHeartbeat(null)).toBeNull();
  });

  it("accepts only the exact content ETag format", () => {
    const tag = "a".repeat(32);
    expect(parseDisplaySnapshotEtag(`"${tag}"`)).toBe(tag);
    expect(parseDisplaySnapshotEtag(tag)).toBeNull();
    expect(parseDisplaySnapshotEtag(`W/"${tag}"`)).toBeNull();
    expect(parseDisplaySnapshotEtag(null)).toBeNull();
  });
});
