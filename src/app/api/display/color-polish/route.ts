import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectColorPolishSnapshot, queryColorPolishSnapshot } from "@/lib/server/color-polish";
import { validateColorPolishHeartbeat } from "@/lib/color-polish/validation";
import type { ApiResult } from "@/lib/server/types";
import { DISPLAY_RECORD_TOKEN, projectDisplayDelta } from "@/lib/color-polish/delta";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  if (request.signal.aborted) return errorResult(503, "UNAVAILABLE");
  const deltaRequested = request.nextUrl.searchParams.get("sync") === "2";
  const knownValue = request.nextUrl.searchParams.get("known") ?? "";
  const known = knownValue ? knownValue.split(".") : [];
  if (deltaRequested && (knownValue.length > 3299 || known.length > 100 || new Set(known).size !== known.length
    || known.some((token) => !DISPLAY_RECORD_TOKEN.test(token)))) return errorResult(400, "INVALID_INPUT");

  const admission = admitPublicDisplayRequest(request);
  if (!admission) {
    const response = errorResult(429, "TOO_MANY_REQUESTS");
    response.headers.set("Retry-After", "5");
    return response;
  }

  try {
    const after = request.nextUrl.searchParams.get("after");
    const rawTag = request.headers.get("if-none-match");
    const knownEtag = rawTag && /^"[a-f0-9]{32}"$/.test(rawTag) ? rawTag.slice(1, -1) : null;
    const result = await queryColorPolishSnapshot(
      after,
      request.signal,
      deltaRequested ? known : knownEtag,
    );
    if (result.error) return errorResult(503, "UNAVAILABLE");
    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      ...(result.etag ? { ETag: `"${result.etag}"` } : {}),
    };
    if (deltaRequested) {
      const delta = projectDisplayDelta(result.data, projectColorPolishSnapshot);
      if (!delta) return errorResult(503, "UNAVAILABLE");
      return jsonResult({ ok: true, ...delta } as unknown as ApiResult, { headers });
    }
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
