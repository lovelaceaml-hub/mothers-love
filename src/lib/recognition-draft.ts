/**
 * Keeps a half-written recognition on the person's own device, so a phone call, a switch to
 * another app or a reload does not lose it (Plan 34 Section B).
 *
 * It lives in the tab's session storage, never on the server: it survives a reload of the
 * same tab and is gone when that tab closes, so the next person to open the form on a shared
 * device never sees it. It is removed when the recognition is sent or the person starts over,
 * and it is ignored once it is a day old.
 */

export type RecognitionDraft = {
  submitter: string;
  recipient: string;
  message: string;
  expressionIds: number[];
};

export type StoredRecognitionDraft = {
  draft: RecognitionDraft;
  /** The duplicate-send guard that belongs to these entries. */
  requestKey: string;
  /** A send had started and its answer was never confirmed. */
  sendAttempted: boolean;
};

export const RECOGNITION_DRAFT_STORAGE_KEY = 'mothers-love:recognition-draft:v1';
export const RECOGNITION_DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Far above any valid entry; only stops a damaged or hostile value from being restored. */
const MAX_STORED_TEXT_LENGTH = 6000;
const REQUEST_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isEmptyRecognitionDraft(draft: RecognitionDraft): boolean {
  return !draft.submitter.trim() && !draft.recipient.trim() && !draft.message.trim()
    && draft.expressionIds.length === 0;
}

/** The text to store, or null when there is nothing worth keeping. */
export function encodeRecognitionDraft(value: StoredRecognitionDraft, nowMs: number): string | null {
  if (isEmptyRecognitionDraft(value.draft)) return null;
  return JSON.stringify({
    version: 1,
    savedAt: nowMs,
    submitter: value.draft.submitter,
    recipient: value.draft.recipient,
    message: value.draft.message,
    expressionIds: value.draft.expressionIds,
    requestKey: value.requestKey,
    sendAttempted: value.sendAttempted,
  });
}

function storedText(value: unknown): string | null {
  return typeof value === 'string' && value.length <= MAX_STORED_TEXT_LENGTH ? value : null;
}

/**
 * Reads a stored value back. Anything damaged, from another version, a day old, from the
 * future or empty counts as no draft at all.
 */
export function decodeRecognitionDraft(
  raw: string | null | undefined,
  nowMs: number,
  validExpressionIds: readonly number[],
): StoredRecognitionDraft | null {
  if (typeof raw !== 'string' || !raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) return null;
  const savedAt = record.savedAt;
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null;
  if (savedAt > nowMs + 60_000 || nowMs - savedAt > RECOGNITION_DRAFT_LIFETIME_MS) return null;

  const submitter = storedText(record.submitter);
  const recipient = storedText(record.recipient);
  const message = storedText(record.message);
  if (submitter === null || recipient === null || message === null) return null;
  if (!Array.isArray(record.expressionIds)) return null;
  const expressionIds = [...new Set(record.expressionIds)]
    .filter((id): id is number => typeof id === 'number' && validExpressionIds.includes(id))
    .sort((a, b) => a - b);
  if (typeof record.requestKey !== 'string' || !REQUEST_KEY_PATTERN.test(record.requestKey)) return null;

  const draft = { submitter, recipient, message, expressionIds };
  if (isEmptyRecognitionDraft(draft)) return null;
  return { draft, requestKey: record.requestKey, sendAttempted: record.sendAttempted === true };
}

/** The tab's own storage, or null where the browser refuses it (private modes, blocked data). */
export function recognitionDraftStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadRecognitionDraft(
  storage: DraftStorage | null,
  nowMs: number,
  validExpressionIds: readonly number[],
): StoredRecognitionDraft | null {
  if (!storage) return null;
  try {
    const stored = decodeRecognitionDraft(storage.getItem(RECOGNITION_DRAFT_STORAGE_KEY), nowMs, validExpressionIds);
    if (!stored) storage.removeItem(RECOGNITION_DRAFT_STORAGE_KEY);
    return stored;
  } catch {
    return null;
  }
}

/** Stores the entries, or removes the stored copy when they are empty. Never throws. */
export function saveRecognitionDraft(storage: DraftStorage | null, value: StoredRecognitionDraft, nowMs: number): void {
  if (!storage) return;
  try {
    const encoded = encodeRecognitionDraft(value, nowMs);
    if (encoded === null) storage.removeItem(RECOGNITION_DRAFT_STORAGE_KEY);
    else storage.setItem(RECOGNITION_DRAFT_STORAGE_KEY, encoded);
  } catch {
    // A full or blocked store only means the entries are not kept; the form still works.
  }
}

export function clearRecognitionDraft(storage: DraftStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(RECOGNITION_DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to do: the stored copy expires by itself.
  }
}
