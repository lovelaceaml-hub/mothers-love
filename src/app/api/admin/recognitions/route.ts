import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const params = request.nextUrl.searchParams;
  const page = Math.max(0, Math.min(100000, Number(params.get("page") || 0) || 0));
  const result = await databaseAction("admin_list", {
    actor: actorPayload(verified.actor),
    page,
    pageSize: 50,
    status: params.get("status") || null,
    search: params.get("search") || null,
    expression: params.get("expression") || null,
    from: params.get("from") || null,
    to: params.get("to") || null,
  });
  return databaseResult(result.data, result.error);
}

