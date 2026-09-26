import type { NextRequest } from "next/server";
import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { parsePublicFeedCursor, projectOlderPublicFeed, queryOlderPublicFeed } from "@/lib/server/public-feed";

// The next 100 recognitions older than the cursor, for the home page's
// "Show older recognitions" button. Same public projection as /api/feed.
export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;

  const cursor = parsePublicFeedCursor(request.nextUrl.searchParams.get("before"), request.nextUrl.searchParams.get("id"));
  if (!cursor) return errorResult(400, "INVALID_REQUEST");

  const result = await queryOlderPublicFeed(cursor);
  if (result.error) return errorResult(503, "UNAVAILABLE");

  const snapshot = projectOlderPublicFeed(result.data, cursor);
  if (!snapshot) return errorResult(503, "UNAVAILABLE");
  return jsonResult(snapshot, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
}
