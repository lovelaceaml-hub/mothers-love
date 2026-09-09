import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { projectPublicDisplaySnapshot, queryPublicDisplaySnapshot } from "@/lib/server/public-display";
import type { ApiResult } from "@/lib/server/types";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const result = await queryPublicDisplaySnapshot(request.nextUrl.searchParams.get("after"));
  if (result.error) return errorResult(503, "UNAVAILABLE");
  const snapshot = projectPublicDisplaySnapshot(result.data);
  if (!snapshot) return errorResult(503, "UNAVAILABLE");
  return jsonResult(snapshot as unknown as ApiResult, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
}
