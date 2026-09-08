import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { requireConfigured } from "@/lib/server/http";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor) return errorResult(verified.result?.status || 401, verified.result?.code || "UNAUTHENTICATED");
  const { id } = await context.params;
  const result = await databaseAction("admin_device_revoke", { actor: actorPayload(verified.actor), id });
  return databaseResult(result.data, result.error);
}

