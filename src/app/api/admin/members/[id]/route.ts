import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor || verified.actor.role !== "owner") return errorResult(verified.result?.status || 403, verified.result?.code || "OWNER_REQUIRED");
  const body = await readJson(request);
  if (body.error) return body.error;
  const value = body.value && typeof body.value === "object" ? body.value as Record<string, unknown> : null;
  if (!value || typeof value.active !== "boolean") return errorResult(400, "INVALID_REQUEST");
  const { id } = await context.params;
  const result = await databaseAction("admin_member_patch", { actor: actorPayload(verified.actor), id, active: value.active });
  return databaseResult(result.data, result.error);
}

