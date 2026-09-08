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
  const result = await databaseAction("admin_overview", { actor: actorPayload(verified.actor) });
  return databaseResult(result.data, result.error);
}

