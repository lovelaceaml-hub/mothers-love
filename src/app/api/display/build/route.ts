import { jsonResult } from "@/lib/server/response";
import { DISPLAY_BUILD } from "@/lib/display-build";

export const dynamic = "force-dynamic";

// The build this deployment runs, so an open TV page can tell a new version is
// live. Carries no personal data and touches no database.
export function GET() {
  return jsonResult({ build: DISPLAY_BUILD }, { headers: { "X-Robots-Tag": "noindex, nofollow" } });
}
