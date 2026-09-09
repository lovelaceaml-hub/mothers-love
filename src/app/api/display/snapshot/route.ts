import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectPublicDisplaySnapshot, queryPublicDisplaySnapshot } from "@/lib/server/public-display";
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
    const result = await queryPublicDisplaySnapshot(request.nextUrl.searchParams.get("after"), request.signal);
    if (result.error) return errorResult(503, "UNAVAILABLE");
    const snapshot = projectPublicDisplaySnapshot(result.data);
    if (!snapshot) return errorResult(503, "UNAVAILABLE");
    return jsonResult(snapshot as unknown as ApiResult, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
  } finally {
    admission.release();
  }
}
