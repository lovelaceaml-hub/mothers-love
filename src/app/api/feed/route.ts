import { errorResult, jsonResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { projectPublicFeed, queryPublicFeed } from "@/lib/server/public-feed";

export async function GET() {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;

  const result = await queryPublicFeed();
  if (result.error) return errorResult(503, "UNAVAILABLE");

  const snapshot = projectPublicFeed(result.data);
  if (!snapshot) return errorResult(503, "UNAVAILABLE");
  return jsonResult(snapshot, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
}
