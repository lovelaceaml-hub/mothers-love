import { NextRequest } from "next/server";
import { parseContentEtag } from "@/lib/etag";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { projectPublicFeed, projectPublicFeedHeartbeat, queryPublicFeed } from "@/lib/server/public-feed";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;

  const knownEtag = parseContentEtag(request.headers.get("if-none-match"));
  const result = await queryPublicFeed(knownEtag);
  if (result.error) return errorResult(503, "UNAVAILABLE");

  const headers = {
    "X-Robots-Tag": "noindex, nofollow",
    ...(result.etag ? { ETag: `"${result.etag}"` } : {}),
  };
  const heartbeat = projectPublicFeedHeartbeat(result.data);
  if (heartbeat) {
    if (!knownEtag || result.etag !== knownEtag) return errorResult(503, "UNAVAILABLE");
    return jsonResult(heartbeat, { headers });
  }

  const snapshot = projectPublicFeed(result.data);
  if (!snapshot) return errorResult(503, "UNAVAILABLE");
  return jsonResult(snapshot, { headers });
}
