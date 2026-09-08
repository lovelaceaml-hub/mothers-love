import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction, randomPairCode, sha256 } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const result = await databaseAction("admin_devices_list", { actor: actorPayload(verified.actor) });
  return databaseResult(result.data, result.error);
}

export async function POST(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const body = await readJson(request);
  if (body.error) return body.error;
  const label = body.value && typeof body.value === "object" && typeof (body.value as Record<string, unknown>).label === "string" ? ((body.value as Record<string, unknown>).label as string).trim() : "Display";
  const code = randomPairCode(8);
  const result = await databaseAction("admin_device_create", { actor: actorPayload(verified.actor), label, codeHash: sha256(code) });
  if (result.error || !result.data || result.data.ok !== true) return databaseResult(result.data, result.error);
  return databaseResult({ ok: true, code, expiresAt: result.data.expiresAt }, null, 201);
}
