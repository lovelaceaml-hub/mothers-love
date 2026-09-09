import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

const REQUESTS_PER_MINUTE = 180;
const BURST_REQUESTS = 24;
const MAX_IN_FLIGHT = 12;
const ENTRY_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 512;

export type PublicDisplayAdmission = {
  release: () => void;
};

export type PublicDisplayAdmissionOptions = {
  now?: () => number;
  requestsPerMinute?: number;
  burstRequests?: number;
  maxInFlight?: number;
  entryTtlMs?: number;
  maxEntries?: number;
  isVercel?: () => boolean;
};

type Entry = {
  tokens: number;
  updatedAt: number;
  lastSeenAt: number;
};

function boundedPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0 ? value : fallback;
}

function clientKey(request: NextRequest, isVercel: boolean): string {
  // Vercel sets this header at its edge. Outside Vercel, all callers share one
  // bucket because ordinary forwarding headers are user controlled.
  const forwardedIp = isVercel ? request.headers.get("x-vercel-forwarded-for")?.trim().slice(0, 128) : null;
  const source = forwardedIp || "shared";
  return createHash("sha256").update(source).digest("base64url");
}

export class PublicDisplayAdmissionGuard {
  private readonly now: () => number;
  private readonly requestsPerMinute: number;
  private readonly burstRequests: number;
  private readonly maxInFlight: number;
  private readonly entryTtlMs: number;
  private readonly maxEntries: number;
  private readonly isVercel: () => boolean;
  private readonly entries = new Map<string, Entry>();
  private inFlight = 0;

  constructor(options: PublicDisplayAdmissionOptions = {}) {
    this.now = options.now ?? Date.now;
    this.requestsPerMinute = boundedPositiveInteger(options.requestsPerMinute, REQUESTS_PER_MINUTE);
    this.burstRequests = boundedPositiveInteger(options.burstRequests, BURST_REQUESTS);
    this.maxInFlight = boundedPositiveInteger(options.maxInFlight, MAX_IN_FLIGHT);
    this.entryTtlMs = boundedPositiveInteger(options.entryTtlMs, ENTRY_TTL_MS);
    this.maxEntries = boundedPositiveInteger(options.maxEntries, MAX_ENTRIES);
    this.isVercel = options.isVercel ?? (() => process.env.VERCEL === "1");
  }

  admit(request: NextRequest): PublicDisplayAdmission | null {
    const now = this.now();
    this.prune(now);
    if (this.inFlight >= this.maxInFlight) return null;

    const key = clientKey(request, this.isVercel());
    let entry = this.entries.get(key);
    if (!entry) {
      this.evictOldestIfFull();
      entry = { tokens: this.burstRequests, updatedAt: now, lastSeenAt: now };
      this.entries.set(key, entry);
    }

    const elapsed = Math.max(0, now - entry.updatedAt);
    entry.tokens = Math.min(this.burstRequests, entry.tokens + (elapsed * this.requestsPerMinute) / 60_000);
    entry.updatedAt = now;
    entry.lastSeenAt = now;
    if (entry.tokens < 1) return null;

    entry.tokens -= 1;
    this.inFlight += 1;
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        this.inFlight = Math.max(0, this.inFlight - 1);
      },
    };
  }

  snapshotForTests(): { entries: number; inFlight: number } {
    return { entries: this.entries.size, inFlight: this.inFlight };
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (now - entry.lastSeenAt >= this.entryTtlMs) this.entries.delete(key);
    }
  }

  private evictOldestIfFull(): void {
    if (this.entries.size < this.maxEntries) return;
    let oldestKey: string | null = null;
    let oldestSeenAt = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.entries) {
      if (entry.lastSeenAt < oldestSeenAt) {
        oldestKey = key;
        oldestSeenAt = entry.lastSeenAt;
      }
    }
    if (oldestKey) this.entries.delete(oldestKey);
  }
}

const guard = new PublicDisplayAdmissionGuard();

// This guard is intentionally process local. It bounds one server instance's
// database pressure, while Vercel instances do not share quota state.
export function admitPublicDisplayRequest(request: NextRequest): PublicDisplayAdmission | null {
  return guard.admit(request);
}
