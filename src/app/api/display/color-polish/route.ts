import { NextRequest } from "next/server";
import { projectDisplayDelta, DISPLAY_RECORD_TOKEN } from "@/lib/color-polish/delta";
import { validateColorPolishHeartbeat } from "@/lib/color-polish/validation";
import { parseDisplaySnapshotEtag } from "@/lib/display/snapshot-heartbeat";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectColorPolishSnapshot, queryColorPolishSnapshot } from "@/lib/server/color-polish";
import { projectReactionTotal, queryReactionTotal } from "@/lib/server/reactions";
import { recordDatabaseResultBytes } from "@/lib/server/database-result-metrics";
import type { ApiResult } from "@/lib/server/types";

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
    const rawTag = request.headers.get("if-none-match");
    const knownEtag = parseDisplaySnapshotEtag(rawTag);
    const validatorPresent = rawTag !== null;
    const validatorValid = knownEtag !== null;
    const includeLikesTotal = request.nextUrl.searchParams.get("includeLikesTotal") === "1";
    const likesTotalPromise = includeLikesTotal
      ? queryReactionTotal(request.signal).catch(() => ({ data: null, error: new Error("DATABASE_ERROR") }))
      : Promise.resolve(null);
    const [result, likesResult] = await Promise.all([
      queryColorPolishSnapshot(
        request.nextUrl.searchParams.get("after"),
        request.signal,
        deltaRequested ? known : knownEtag,
      ),
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

    if (deltaRequested) {
      const delta = projectDisplayDelta(result.data, projectColorPolishSnapshot);
      recordDatabaseResultBytes("display.color-polish", result.data, {
        validatorPresent,
        validatorValid,
        validatorMatched: false,
        projectionOK: delta !== null,
      });
      if (!delta) return errorResult(503, "UNAVAILABLE");
      const canShowTotal = delta.unchanged || (delta.snapshot.settings.mode === "normal" && delta.snapshot.presentation.enabled);
      return jsonResult({ ok: true, ...delta } as unknown as ApiResult, { headers: withLikesTotal(includeLikesTotal && canShowTotal) });
    }

    const heartbeat = validateColorPolishHeartbeat(result.data);
    // A compact 200 response carries fresh serverTime for the 60-second
    // privacy/staleness timer. The legacy ETag remains compatible with /world.
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
    return jsonResult(snapshot as unknown as ApiResult, { headers: withLikesTotal(includeLikesTotal && canShowTotal) });
  } finally {
    admission.release();
  }
}
