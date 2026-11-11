import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { requestRateKeys } from "@/lib/server/response";

function request(headers: Record<string, string>) {
  return new NextRequest("https://mothers-love.example/api/recognitions", { headers });
}

describe("requestRateKeys", () => {
  it("prefers the Vercel forwarded address", () => {
    expect(requestRateKeys(request({ "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "203.0.113.1" })).ip)
      .toBe("198.51.100.7");
  });

  it("uses the final forwarded address, not a client-prepended one", () => {
    expect(requestRateKeys(request({ "x-forwarded-for": "203.0.113.99, 198.51.100.4" })).ip).toBe("198.51.100.4");
  });

  it("falls back to x-real-ip, then a shared unknown key", () => {
    expect(requestRateKeys(request({ "x-real-ip": "192.0.2.5" })).ip).toBe("192.0.2.5");
    expect(requestRateKeys(request({})).ip).toBe("unknown");
  });

  it("keeps the request context header, trimmed and bounded", () => {
    expect(requestRateKeys(request({ "x-ml-request-context": "  tv  " })).context).toBe("tv");
    expect(requestRateKeys(request({})).context).toBeNull();
  });
});
