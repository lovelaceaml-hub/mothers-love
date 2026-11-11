import type { NextRequest } from "next/server";
import { parseContentEtag } from "@/lib/etag";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import {
  parsePublicFeedCursor,
  projectOlderPublicFeed,
  projectPublicFeedHeartbeat,
  queryOlderPublicFeed,
} from "@/lib/server/public-feed";

// The next 100 recognitions older than the cursor, for the home page's
// "Show older recognitions" button. Same public projection as /api/feed.
export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;

  const cursor = parsePublicFeedCursor(request.nextUrl.searchParams.get("before"), request.nextUrl.searchParams.get("id"));
  if (!cursor) return errorResult(400, "INVALID_REQUEST");

  const knownEtag = parseContentEtag(request.headers.get("if-none-match"));
  const result = await queryOlderPublicFeed(cursor, knownEtag);
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

  const snapshot = projectOlderPublicFeed(result.data, cursor);
  if (!snapshot) return errorResult(503, "UNAVAILABLE");
  return jsonResult(snapshot, { headers });
}
