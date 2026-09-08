import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";
import { validateMutation } from "@/lib/server/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const { id } = await context.params;
  const result = await databaseAction("admin_get", { actor: actorPayload(verified.actor), id });
  if (result.error || !result.data || result.data.ok !== true || !result.data.recognition || typeof result.data.recognition !== "object") return databaseResult(result.data, result.error);
  return databaseResult({ ok: true, ...(result.data.recognition as Record<string, unknown>) });
}

export async function PATCH(request: NextRequest, context: Context) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const body = await readJson(request);
  if (body.error) return body.error;
  const validation = validateMutation(body.value);
  if (validation.issues.length || !validation.value) return errorResult(400, "INVALID_REQUEST");
  if (validation.value.action === "delete" && verified.actor.role !== "owner") return errorResult(403, "OWNER_REQUIRED");
  const { id } = await context.params;
  const result = await databaseAction("admin_mutate", { actor: actorPayload(verified.actor), id, expectedVersion: validation.value.expectedVersion, mutation: validation.value.action, fields: validation.value.fields || null, reason: validation.value.reason || null });
  return databaseResult(result.data, result.error);
}
