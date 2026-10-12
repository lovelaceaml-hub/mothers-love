export type DisplaySnapshotHeartbeat = {
  unchanged: true;
  serverTime: string;
};

export function projectDisplaySnapshotHeartbeat(value: unknown): DisplaySnapshotHeartbeat | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || record.unchanged !== true) return null;
  if (typeof record.serverTime !== "string" || record.serverTime.length > 64 || !Number.isFinite(Date.parse(record.serverTime))) return null;
  return { unchanged: true, serverTime: record.serverTime };
}

export function parseDisplaySnapshotEtag(value: string | null): string | null {
  return /^(?:W\/)?"([a-f0-9]{32})"$/.exec(value ?? "")?.[1] ?? null;
}

export function matchesDisplaySnapshotEtag(value: string | null, expected: string | null): boolean {
  return expected !== null && /^[a-f0-9]{32}$/.test(expected) && parseDisplaySnapshotEtag(value) === expected;
}
