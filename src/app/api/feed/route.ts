import { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { projectPublicFeed, projectPublicFeedHeartbeat, queryPublicFeed } from "@/lib/server/public-feed";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;

  const rawTag = request.headers.get("if-none-match");
  const knownEtag = rawTag && /^"[a-f0-9]{32}"$/.test(rawTag) ? rawTag.slice(1, -1) : null;
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
