import { NextRequest } from "next/server";
import { databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";
import { sha256 } from "@/lib/server/operations";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const token = request.cookies.get("ml_display_session")?.value || null;
  const result = await databaseAction("display_snapshot", { tokenHash: token ? sha256(token) : null, after: request.nextUrl.searchParams.get("after") || null });
  const response = databaseResult(result.data, result.error);
  if (result.data?.code === "UNAUTHENTICATED" || result.error) response.cookies.set("ml_display_session", "", { httpOnly: true, secure: true, sameSite: "strict", maxAge: 0, path: "/" });
  return response;
}

