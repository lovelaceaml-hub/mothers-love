import { describe, expect, it } from "vitest";
import { screenRecognition } from "@/lib/server/filter";
import { addVectors, expressionTotal, vectorDiff, vectorForExpressions, zeroVector } from "@/lib/server/vectors";
import { graphemeLength, startOfLosAngelesWeek } from "@/lib/server/time";
import { validateEditablePatch, validateRecognitionInput } from "@/lib/server/validation";

describe("backend input validation", () => {
  const base = { submittedName: "Sender A.", recipient: "Friend M.", message: "Thank you for your kindness.", expressionIds: [2, 6, 8], requestKey: "request-1234" };

  it("accepts the 500 grapheme boundary and rejects 501", () => {
    expect(validateRecognitionInput({ ...base, message: "🙂".repeat(500) }).issues).toHaveLength(0);
    expect(validateRecognitionInput({ ...base, message: "🙂".repeat(501) }).issues.some((issue) => issue.field === "message")).toBe(true);
  });

  it("counts combining and emoji text by grapheme", () => {
    expect(graphemeLength("e\u0301")).toBe(1);
    expect(graphemeLength("👩‍👩‍👧‍👦")).toBe(1);
  });

  it("keeps the public name shape aligned with the browser for Unicode names", () => {
    expect(validateRecognitionInput({ ...base, submittedName: "Mary Jane O.", recipient: "Jean-Luc E\u0301." }).issues).toEqual([]);
    expect(validateRecognitionInput({ ...base, submittedName: "张 伟", recipient: "Friend M." }).issues).toEqual([]);
    expect(validateRecognitionInput({ ...base, submittedName: "Maya Rodriguez" }).issues).toContainEqual({ field: "submittedName", code: "invalid_format" });
    expect(validateRecognitionInput({ ...base, recipient: "hello" }).issues).toContainEqual({ field: "recipient", code: "invalid_format" });
  });

  it("keeps the 80-grapheme name boundary and rejects 81", () => {
    const nameAtLimit = `${"a".repeat(78)} B`;
    const nameOverLimit = `${"a".repeat(79)} B`;
    expect(validateRecognitionInput({ ...base, submittedName: nameAtLimit }).issues).toEqual([]);
    expect(validateRecognitionInput({ ...base, submittedName: nameOverLimit }).issues).toContainEqual({ field: "submittedName", code: "too_long" });
  });

  it("applies the same name shape to editable fields and preserves trimmed values", () => {
    expect(validateEditablePatch({ submittedName: " Sender A. ", recipient: " Friend M. " }).value).toEqual({ submittedName: "Sender A.", recipient: "Friend M." });
    expect(validateEditablePatch({ submittedName: "Sender Fullname" }).issues).toContainEqual({ field: "submittedName", code: "invalid_format" });
    expect(validateEditablePatch({ recipient: "Friend Fullname" }).issues).toContainEqual({ field: "recipient", code: "invalid_format" });
  });

  it("keeps editable requestKey immutable while accepting partial fields", () => {
    expect(validateEditablePatch({ message: "A corrected message", requestKey: "ignored" }).value).toEqual({ message: "A corrected message" });
  });

  it("holds explicit unsafe categories and publishes ordinary thanks", () => {
    expect(screenRecognition(base.submittedName, base.recipient, base.message).disposition).toBe("publish");
    expect(screenRecognition(base.submittedName, base.recipient, "Please call me at 555-555-5555").categories).toContain("private_contact");
    expect(screenRecognition(base.submittedName, base.recipient, "The hospital diagnosis was difficult").categories).toContain("health_detail");
    expect(screenRecognition(base.submittedName, base.recipient, "Please keep this private matter between us").categories).toContain("private_disagreement");
  });
});

describe("contribution vectors", () => {
  it("calculates first publication, edit deltas and totals", () => {
    const original = vectorForExpressions([2, 6, 8]);
    const edited = vectorForExpressions([2, 8]);
    expect(original[0]).toBe(1);
    expect(expressionTotal(original)).toBe(3);
    expect(vectorDiff(edited, original)).toEqual([0, 0, 0, 0, 0, 0, -1, 0, 0, 0]);
    expect(addVectors(original, vectorDiff(edited, original))).toEqual(edited);
    expect(zeroVector()).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("reporting time", () => {
  it("uses Sunday-start Los Angeles weeks", () => {
    expect(startOfLosAngelesWeek(new Date("2026-09-07T12:00:00Z"))).toMatch(/^2026-09-0[67]$/);
  });
});
