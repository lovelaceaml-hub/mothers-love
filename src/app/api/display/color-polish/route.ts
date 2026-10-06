import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { admitPublicDisplayRequest } from "@/lib/server/public-display-admission";
import { projectColorPolishSnapshot, queryColorPolishSnapshot } from "@/lib/server/color-polish";
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
    const result = deltaRequested
      ? await queryColorPolishSnapshot(after, request.signal, known)
      : await queryColorPolishSnapshot(after, request.signal);
    if (result.error) return errorResult(503, "UNAVAILABLE");
    const snapshot = deltaRequested ? projectDisplayDelta(result.data, projectColorPolishSnapshot) : projectColorPolishSnapshot(result.data);
    if (!snapshot) return errorResult(503, "UNAVAILABLE");
    return jsonResult((deltaRequested ? { ok: true, ...snapshot } : snapshot) as unknown as ApiResult, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
  } finally {
    admission.release();
  }
}
