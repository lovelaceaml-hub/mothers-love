import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { errorResult, jsonResult } from "@/lib/server/response";

export async function GET(request: NextRequest) {
  const result = await verifyAdmin(request, false);
  if (!result.actor) return errorResult(result.result?.status || 401, result.result?.code || "UNAUTHENTICATED");
  return jsonResult({ id: result.actor.userId, role: result.actor.role, needsMfa: result.actor.role === "owner" && !result.actor.aal2 });
}

