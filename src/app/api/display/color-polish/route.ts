import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectColorPolishSnapshot, queryColorPolishSnapshot } from "@/lib/server/color-polish";
import { projectReactionTotal, queryReactionTotal } from "@/lib/server/reactions";
import { validateColorPolishHeartbeat } from "@/lib/color-polish/validation";
import { parseDisplaySnapshotEtag } from "@/lib/display/snapshot-heartbeat";
import { recordDatabaseResultBytes } from "@/lib/server/database-result-metrics";
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
    const knownEtag = parseDisplaySnapshotEtag(rawTag);
    const validatorPresent = rawTag !== null;
    const validatorValid = knownEtag !== null;
    const includeLikesTotal = request.nextUrl.searchParams.get("includeLikesTotal") === "1";
    const likesTotalPromise = includeLikesTotal
      ? queryReactionTotal().catch(() => ({ data: null, error: new Error("DATABASE_ERROR") }))
      : Promise.resolve(null);
    const [result, likesResult] = await Promise.all([
      queryColorPolishSnapshot(request.nextUrl.searchParams.get("after"), request.signal, knownEtag),
      likesTotalPromise,
    ]);
    if (result.error) return errorResult(503, "UNAVAILABLE");
    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      ...(result.etag ? { ETag: `"${result.etag}"` } : {}),
    };
    const likesTotal = likesResult && !likesResult.error ? projectReactionTotal(likesResult.data) : null;
    const withLikesTotal = (include: boolean) => ({
      ...headers,
      ...(include && likesTotal ? { "X-Likes-Total": String(likesTotal.total) } : {}),
    });
    const heartbeat = validateColorPolishHeartbeat(result.data);
    // A compact 200 response (rather than 304) carries fresh serverTime for
    // the existing 60-second privacy/staleness timer.
    const validatorMatched = knownEtag !== null && result.etag === knownEtag;
    if (heartbeat) {
      recordDatabaseResultBytes("display.color-polish", result.data, {
        validatorPresent,
        validatorValid,
        validatorMatched,
        projectionOK: validatorMatched,
      });
      if (!validatorMatched) return errorResult(503, "UNAVAILABLE");
      return jsonResult(heartbeat, { headers: withLikesTotal(includeLikesTotal) });
    }
    const snapshot = projectColorPolishSnapshot(result.data);
    recordDatabaseResultBytes("display.color-polish", result.data, {
      validatorPresent,
      validatorValid,
      validatorMatched,
      projectionOK: snapshot !== null,
    });
    if (!snapshot) return errorResult(503, "UNAVAILABLE");
    const canShowTotal = snapshot.settings.mode === "normal" && snapshot.presentation.enabled;
    return jsonResult(snapshot as unknown as ApiResult, { headers: withLikesTotal(canShowTotal) });
  } finally {
    admission.release();
  }
}
