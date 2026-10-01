import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectReactionTotal, queryReactionTotal } from "@/lib/server/reactions";

// Every like on every published recognition, for the TV header. The TV itself
// only holds the latest 100, so it cannot add this up on its own.
export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;

  const admission = admitPublicDisplayRequest(request);
  if (!admission) {
    const response = errorResult(429, "TOO_MANY_REQUESTS");
    response.headers.set("Retry-After", "5");
    return response;
  }

  try {
    const result = await queryReactionTotal();
    if (result.error) return errorResult(503, "UNAVAILABLE");
    const total = projectReactionTotal(result.data);
    if (!total) return errorResult(503, "UNAVAILABLE");
    return jsonResult(total, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
  } finally {
    admission.release();
  }
}
