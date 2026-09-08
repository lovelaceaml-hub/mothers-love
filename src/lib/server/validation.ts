import { graphemeLength, isIsoDate, isMonthBoundary } from "./time";
import type { EditableRecognitionFields, MutationAction, RecognitionInput } from "./types";

const REQUEST_KEY_RE = /^[A-Za-z0-9._:-]{8,128}$/;
const REASONS = new Set(["privacy", "recipient_request", "spam", "duplicate", "test", "safety", "correction", "other"]);
const ACTIONS = new Set<MutationAction>(["edit", "publish", "hide", "restore", "invalidate", "feature", "unfeature", "delete"]);

export type ValidationIssue = { field: string; code: string };

export type ValidationResult<T> = { value: T; issues: [] } | { value: null; issues: ValidationIssue[] };

function cleanString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export function validateRecognitionInput(input: unknown): ValidationResult<RecognitionInput> {
  if (!input || typeof input !== "object") return { value: null, issues: [{ field: "body", code: "invalid" }] };
  const body = input as Record<string, unknown>;
  const submittedName = cleanString(body.submittedName);
  const recipient = cleanString(body.recipient);
  const message = cleanString(body.message);
  const requestKey = typeof body.requestKey === "string" ? body.requestKey.trim() : null;
  const rawIds = body.expressionIds;
  const expressionIds = Array.isArray(rawIds) && rawIds.every((id) => Number.isInteger(id)) ? [...new Set(rawIds as number[])].sort((a, b) => a - b) : null;
  const issues: ValidationIssue[] = [];
  if (!submittedName) issues.push({ field: "submittedName", code: "required" });
  else if (graphemeLength(submittedName) > 80) issues.push({ field: "submittedName", code: "too_long" });
  if (!recipient) issues.push({ field: "recipient", code: "required" });
  else if (graphemeLength(recipient) > 80) issues.push({ field: "recipient", code: "too_long" });
  if (!message) issues.push({ field: "message", code: "required" });
  else if (graphemeLength(message) > 500) issues.push({ field: "message", code: "too_long" });
  if (!expressionIds || expressionIds.length < 1 || expressionIds.length > 9 || expressionIds.some((id) => id < 1 || id > 9)) issues.push({ field: "expressionIds", code: "invalid" });
  if (!requestKey || !REQUEST_KEY_RE.test(requestKey)) issues.push({ field: "requestKey", code: "invalid" });
  const encoded = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (encoded > 16 * 1024) issues.push({ field: "body", code: "too_large" });
  if (issues.length) return { value: null, issues };
  return { value: { submittedName: submittedName!, recipient: recipient!, message: message!, expressionIds: expressionIds!, requestKey: requestKey! }, issues: [] };
}

export function validateMutation(input: unknown): ValidationResult<{ expectedVersion: number; action: MutationAction; fields?: Partial<EditableRecognitionFields>; reason?: string }> {
  if (!input || typeof input !== "object") return { value: null, issues: [{ field: "body", code: "invalid" }] };
  const body = input as Record<string, unknown>;
  const expectedVersion = body.expectedVersion;
  const action = body.action;
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(expectedVersion) || Number(expectedVersion) < 1) issues.push({ field: "expectedVersion", code: "invalid" });
  if (typeof action !== "string" || !ACTIONS.has(action as MutationAction)) issues.push({ field: "action", code: "invalid" });
  let fields: Partial<EditableRecognitionFields> | undefined;
  if (body.fields !== undefined) {
    const result = validateEditablePatch(body.fields);
    if (result.issues.length) issues.push(...result.issues.map((issue) => ({ field: `fields.${issue.field}`, code: issue.code })));
    else if (result.value) fields = result.value;
  }
  const reason = body.reason === undefined ? undefined : cleanString(body.reason);
  if (reason !== undefined && (!reason || !REASONS.has(reason))) issues.push({ field: "reason", code: "invalid" });
  if (["hide", "restore", "invalidate"].includes(String(action)) && !reason) issues.push({ field: "reason", code: "required" });
  if (action === "edit" && !fields) issues.push({ field: "fields", code: "required" });
  if (issues.length) return { value: null, issues };
  return { value: { expectedVersion: Number(expectedVersion), action: action as MutationAction, fields: fields ?? undefined, reason: reason ?? undefined }, issues: [] };
}

export function validateEditableFields(input: unknown): ValidationResult<EditableRecognitionFields> {
  const result = validateEditablePatch(input);
  if (result.issues.length || !result.value || Object.keys(result.value).length !== 4) return { value: null, issues: result.issues.length ? result.issues : [{ field: "fields", code: "required" }] };
  return { value: result.value as EditableRecognitionFields, issues: [] };
}

export function validateEditablePatch(input: unknown): ValidationResult<Partial<EditableRecognitionFields>> {
  if (!input || typeof input !== "object") return { value: null, issues: [{ field: "fields", code: "invalid" }] };
  const body = input as Record<string, unknown>;
  const submittedName = body.submittedName === undefined ? undefined : cleanString(body.submittedName);
  const recipient = body.recipient === undefined ? undefined : cleanString(body.recipient);
  const message = body.message === undefined ? undefined : cleanString(body.message);
  const rawIds = body.expressionIds;
  const expressionIds = rawIds === undefined ? undefined : Array.isArray(rawIds) && rawIds.every((id) => Number.isInteger(id)) ? [...new Set(rawIds as number[])].sort((a, b) => a - b) : null;
  const issues: ValidationIssue[] = [];
  if (submittedName === null || submittedName === "") issues.push({ field: "submittedName", code: "required" });
  else if (submittedName !== undefined && graphemeLength(submittedName) > 80) issues.push({ field: "submittedName", code: "too_long" });
  if (recipient === null || recipient === "") issues.push({ field: "recipient", code: "required" });
  else if (recipient !== undefined && graphemeLength(recipient) > 80) issues.push({ field: "recipient", code: "too_long" });
  if (message === null || message === "") issues.push({ field: "message", code: "required" });
  else if (message !== undefined && graphemeLength(message) > 500) issues.push({ field: "message", code: "too_long" });
  if (expressionIds !== undefined && (!expressionIds || expressionIds.length < 1 || expressionIds.length > 9 || expressionIds.some((id) => id < 1 || id > 9))) issues.push({ field: "expressionIds", code: "invalid" });
  if (submittedName === undefined && recipient === undefined && message === undefined && expressionIds === undefined) issues.push({ field: "fields", code: "required" });
  const encoded = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (encoded > 16 * 1024) issues.push({ field: "fields", code: "too_large" });
  if (issues.length) return { value: null, issues };
  return { value: { ...(submittedName !== undefined ? { submittedName: submittedName! } : {}), ...(recipient !== undefined ? { recipient: recipient! } : {}), ...(message !== undefined ? { message: message! } : {}), ...(expressionIds !== undefined ? { expressionIds: expressionIds! } : {}) }, issues: [] };
}

export function validateReportQuery(period: string | null, from: string | null, to: string | null): { period: "week" | "month" | "all" | "custom"; from?: string; to?: string } | null {
  if (period !== "week" && period !== "month" && period !== "all" && period !== "custom") return null;
  if (period !== "custom") return { period };
  if (!from || !to || !isIsoDate(from) || !isIsoDate(to) || !isMonthBoundary(from) || !isMonthBoundary(to) || from > to) return null;
  return { period, from, to };
}

export function validReason(value: unknown): value is string {
  return typeof value === "string" && REASONS.has(value);
}

export function validRequestKey(value: string): boolean {
  return REQUEST_KEY_RE.test(value);
}
