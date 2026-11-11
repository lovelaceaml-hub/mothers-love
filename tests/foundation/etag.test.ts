import { describe, expect, it } from "vitest";
import { CONTENT_TAG_PATTERN, notModifiedServerTimeMs, parseContentEtag } from "@/lib/etag";

const tag = "a".repeat(32);

describe("content tags", () => {
  it("reads the tag from a strong or a weak header value", () => {
    expect(parseContentEtag(`"${tag}"`)).toBe(tag);
    // The host marks the tag weak whenever it compresses the response.
    expect(parseContentEtag(`W/"${tag}"`)).toBe(tag);
  });

  it("rejects anything that is not exactly one quoted tag", () => {
    for (const value of [null, undefined, "", tag, `"${tag}`, `w/"${tag}"`, `W/"${tag}" extra`, `"${"A".repeat(32)}"`, `"${"a".repeat(31)}"`, `"${tag}", "${tag}"`]) {
      expect(parseContentEtag(value)).toBeNull();
    }
  });

  it("matches only 32 lowercase hex characters", () => {
    expect(CONTENT_TAG_PATTERN.test(tag)).toBe(true);
    expect(CONTENT_TAG_PATTERN.test(tag.toUpperCase())).toBe(false);
    expect(CONTENT_TAG_PATTERN.test(`${tag}0`)).toBe(false);
  });
});

describe("server time for a Not Modified reply", () => {
  const estimate = Date.parse("2030-01-01T12:00:10.400Z");

  it("uses the Date header when it is ahead of the estimate", () => {
    expect(notModifiedServerTimeMs("Tue, 01 Jan 2030 12:00:12 GMT", estimate)).toBe(Date.parse("2030-01-01T12:00:12.000Z"));
  });

  it("never runs backwards: a Date header cut to the second keeps the estimate", () => {
    expect(notModifiedServerTimeMs("Tue, 01 Jan 2030 12:00:10 GMT", estimate)).toBe(estimate);
  });

  it("falls back to the estimate when the header is missing or unreadable", () => {
    expect(notModifiedServerTimeMs(null, estimate)).toBe(estimate);
    expect(notModifiedServerTimeMs(undefined, estimate)).toBe(estimate);
    expect(notModifiedServerTimeMs("not a date", estimate)).toBe(estimate);
  });
});
