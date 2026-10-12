import { Buffer } from "node:buffer";

export type DatabaseResultFamily =
  | "display.color-polish"
  | "display.snapshot"
  | "feed.home"
  | "feed.older";

export type ColorPolishResultDiagnostics = {
  validatorPresent: boolean;
  validatorValid: boolean;
  validatorMatched: boolean;
  projectionOK: boolean;
};

const SAMPLE_INTERVAL_MS = 60_000;
const FAMILIES = new Set<DatabaseResultFamily>([
  "display.color-polish",
  "display.snapshot",
  "feed.home",
  "feed.older",
]);

// At most one log per query family and result kind per warm process per minute.
// The family union keeps this map bounded to eight entries.
const lastSampledAt = new Map<string, number>();

function resultKind(value: unknown): "full" | "heartbeat" {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as Record<string, unknown>).unchanged === true
    ? "heartbeat"
    : "full";
}

/**
 * Sample the UTF-8 byte length of a JSON database result without retaining or
 * logging its content. This is the serialized result value, not wire framing.
 */
export function recordDatabaseResultBytes(
  family: DatabaseResultFamily,
  value: unknown,
  diagnostics?: ColorPolishResultDiagnostics,
): void {
  if (!FAMILIES.has(family)) return;
  const kind = resultKind(value);
  const key = family + ":" + kind;
  const now = Date.now();
  const previous = lastSampledAt.get(key);
  if (previous !== undefined && now - previous < SAMPLE_INTERVAL_MS) return;

  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return;
  }
  if (serialized === undefined) return;

  lastSampledAt.set(key, now);
  console.info(JSON.stringify({
    event: "database_result_bytes",
    family,
    resultKind: kind,
    utf8Bytes: Buffer.byteLength(serialized, "utf8"),
    ...(family === "display.color-polish" && diagnostics ? diagnostics : {}),
  }));
}
