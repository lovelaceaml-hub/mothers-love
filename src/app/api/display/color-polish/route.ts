import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectColorPolishSnapshot, queryColorPolishSnapshot } from "@/lib/server/color-polish";
import { validateColorPolishHeartbeat } from "@/lib/color-polish/validation";
import type { ApiResult } from "@/lib/server/types";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  if (request.signal.aborted) return errorResult(503, "UNAVAILABLE");

  const admission = admitPublicDisplayRequest(request);
  if (!admission) {
    const response = errorResult(429, "TOO_MANY_REQUESTS");
    response.headers.set("Retry-After", "5");
    return response;
  }

  try {
    const rawTag = request.headers.get("if-none-match");
    const knownEtag = rawTag && /^"[a-f0-9]{32}"$/.test(rawTag) ? rawTag.slice(1, -1) : null;
    const result = await queryColorPolishSnapshot(request.nextUrl.searchParams.get("after"), request.signal, knownEtag);
    if (result.error) return errorResult(503, "UNAVAILABLE");
    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      ...(result.etag ? { ETag: `"${result.etag}"` } : {}),
    };
    const heartbeat = validateColorPolishHeartbeat(result.data);
    // A compact 200 response (rather than 304) carries fresh serverTime for
    // the existing 60-second privacy/staleness timer.
    if (heartbeat) return jsonResult(heartbeat, { headers });
    const snapshot = projectColorPolishSnapshot(result.data);
    if (!snapshot) return errorResult(503, "UNAVAILABLE");
    return jsonResult(snapshot as unknown as ApiResult, { headers });
  } finally {
    admission.release();
  }
}
