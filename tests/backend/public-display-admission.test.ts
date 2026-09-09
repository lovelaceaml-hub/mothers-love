import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { PublicDisplayAdmissionGuard } from "@/lib/server/public-display-admission";

function request(ip = "198.51.100.20") {
  return new NextRequest("https://mothers-love.example/api/display/snapshot", {
    headers: { "x-vercel-forwarded-for": ip },
  });
}

describe("public display admission", () => {
  it("allows normal five-second polling while bounding each Vercel client burst", () => {
    let now = 0;
    const guard = new PublicDisplayAdmissionGuard({
      now: () => now,
      requestsPerMinute: 150,
      burstRequests: 3,
      maxInFlight: 10,
      isVercel: () => true,
    });
    for (let index = 0; index < 3; index += 1) {
      const admission = guard.admit(request());
      expect(admission).not.toBeNull();
      admission?.release();
    }
    expect(guard.admit(request())).toBeNull();
    now += 5_000;
    const pollingAdmission = guard.admit(request());
    expect(pollingAdmission).not.toBeNull();
    pollingAdmission?.release();
  });

  it("allows simultaneous normal TV polls while capping per-instance database work", () => {
    const guard = new PublicDisplayAdmissionGuard({ maxInFlight: 12, burstRequests: 24, isVercel: () => true });
    const admissions = Array.from({ length: 12 }, (_, index) => guard.admit(request(`198.51.100.${index + 1}`)));
    expect(admissions.every((admission) => admission !== null)).toBe(true);
    expect(guard.admit(request("198.51.100.99"))).toBeNull();
    admissions[0]?.release();
    admissions[0]?.release();
    expect(guard.snapshotForTests().inFlight).toBe(11);
    const thirteenth = guard.admit(request("198.51.100.99"));
    expect(thirteenth).not.toBeNull();
    for (const admission of admissions.slice(1)) admission?.release();
    thirteenth?.release();
    expect(guard.snapshotForTests().inFlight).toBe(0);
  });

  it("refills a token bucket and keeps hashed client state bounded and short lived", () => {
    let now = 0;
    const guard = new PublicDisplayAdmissionGuard({
      now: () => now,
      requestsPerMinute: 60,
      burstRequests: 1,
      maxInFlight: 10,
      maxEntries: 2,
      entryTtlMs: 1_000,
      isVercel: () => true,
    });
    const first = guard.admit(request("198.51.100.1"));
    first?.release();
    expect(guard.admit(request("198.51.100.1"))).toBeNull();
    now += 1_000;
    const refilled = guard.admit(request("198.51.100.1"));
    expect(refilled).not.toBeNull();
    refilled?.release();
    const second = guard.admit(request("198.51.100.2"));
    second?.release();
    const third = guard.admit(request("198.51.100.3"));
    third?.release();
    expect(guard.snapshotForTests().entries).toBe(2);
    now += 1_000;
    const afterExpiry = guard.admit(request("198.51.100.4"));
    afterExpiry?.release();
    expect(guard.snapshotForTests().entries).toBe(1);
  });

  it("does not trust a Vercel-only client key outside Vercel", () => {
    const guard = new PublicDisplayAdmissionGuard({ burstRequests: 1, maxInFlight: 10, isVercel: () => false });
    const first = guard.admit(request("198.51.100.1"));
    first?.release();
    expect(guard.admit(request("198.51.100.2"))).toBeNull();
  });

  it("uses the final Vercel forwarded address instead of a client-prepended value", () => {
    const guard = new PublicDisplayAdmissionGuard({ burstRequests: 1, maxInFlight: 10, isVercel: () => true });
    const first = new NextRequest("https://mothers-love.example/api/display/snapshot", {
      headers: { "x-forwarded-for": "203.0.113.99, 198.51.100.4" },
    });
    const second = new NextRequest("https://mothers-love.example/api/display/snapshot", {
      headers: { "x-forwarded-for": "203.0.113.98, 198.51.100.4" },
    });
    const admission = guard.admit(first);
    admission?.release();
    expect(guard.admit(second)).toBeNull();
  });
});
