import { describe, expect, it } from "vitest";
import {
  matchesDisplaySnapshotEtag,
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

  it("normalizes exact strong and weak content ETags and rejects malformed validators", () => {
    const tag = "a".repeat(32);
    expect(parseDisplaySnapshotEtag(`"${tag}"`)).toBe(tag);
    expect(parseDisplaySnapshotEtag(`W/"${tag}"`)).toBe(tag);
    expect(parseDisplaySnapshotEtag(tag)).toBeNull();
    expect(parseDisplaySnapshotEtag(`w/"${tag}"`)).toBeNull();
    expect(parseDisplaySnapshotEtag(`"${tag},${tag}"`)).toBeNull();
    expect(parseDisplaySnapshotEtag(`"${"A".repeat(32)}"`)).toBeNull();
    expect(parseDisplaySnapshotEtag(null)).toBeNull();
  });

  it("matches strong or weak response validators only to the expected digest", () => {
    const tag = "b".repeat(32);
    expect(matchesDisplaySnapshotEtag(`"${tag}"`, tag)).toBe(true);
    expect(matchesDisplaySnapshotEtag(`W/"${tag}"`, tag)).toBe(true);
    expect(matchesDisplaySnapshotEtag(`W/"${"c".repeat(32)}"`, tag)).toBe(false);
    expect(matchesDisplaySnapshotEtag(null, tag)).toBe(false);
    expect(matchesDisplaySnapshotEtag(`"${tag}"`, null)).toBe(false);
  });
});
