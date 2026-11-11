import { NextRequest } from "next/server";
import { parseContentEtag } from "@/lib/etag";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import {
  projectPublicDisplaySnapshot,
  projectPublicDisplaySnapshotHeartbeat,
  queryPublicDisplaySnapshot,
} from "@/lib/server/public-display";
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
    const knownEtag = parseContentEtag(request.headers.get("if-none-match"));
    const result = await queryPublicDisplaySnapshot(
      request.nextUrl.searchParams.get("after"),
      request.signal,
      knownEtag,
    );
    if (result.error) return errorResult(503, "UNAVAILABLE");

    const headers = {
      "X-Robots-Tag": "noindex, nofollow",
      ...(result.etag ? { ETag: `"${result.etag}"` } : {}),
    };
    const heartbeat = projectPublicDisplaySnapshotHeartbeat(result.data);
    if (heartbeat) {
      if (!knownEtag || result.etag !== knownEtag) return errorResult(503, "UNAVAILABLE");
      return jsonResult(heartbeat, { headers });
    }

    const snapshot = projectPublicDisplaySnapshot(result.data);
    if (!snapshot) return errorResult(503, "UNAVAILABLE");
    return jsonResult(snapshot as unknown as ApiResult, { headers });
  } finally {
    admission.release();
  }
}
