import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";
import { validateSettingsChanges } from "@/lib/server/validation";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const result = await databaseAction("admin_settings_get", { actor: actorPayload(verified.actor) });
  if (result.error || !result.data || result.data.ok !== true || !result.data.settings || typeof result.data.settings !== "object") return databaseResult(result.data, result.error);
  return databaseResult({ ok: true, ...(result.data.settings as Record<string, unknown>) });
}

export async function PATCH(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const body = await readJson(request);
  if (body.error) return body.error;
  if (!body.value || typeof body.value !== "object") return errorResult(400, "INVALID_REQUEST");
  const record = body.value as Record<string, unknown>;
  if (!Number.isInteger(record.expectedVersion) || !validateSettingsChanges(record.changes)) return errorResult(400, "INVALID_REQUEST");
  const result = await databaseAction("admin_settings_patch", { actor: actorPayload(verified.actor), expectedVersion: record.expectedVersion, changes: record.changes });
  if (result.error || !result.data || result.data.ok !== true || !result.data.settings || typeof result.data.settings !== "object") return databaseResult(result.data, result.error);
  return databaseResult({ ok: true, ...(result.data.settings as Record<string, unknown>) });
}
