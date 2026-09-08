import { NextRequest } from "next/server";
import { verifyAdmin } from "@/lib/server/auth";
import { actorPayload, databaseAction } from "@/lib/server/operations";
import { authClient } from "@/lib/server/supabase";
import { getServerConfig } from "@/lib/server/env";
import { databaseResult, errorResult, requireTrustedOrigin } from "@/lib/server/response";
import { readJson, requireConfigured } from "@/lib/server/http";

export async function GET(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor || verified.actor.role !== "owner") return errorResult(verified.result?.status || 403, verified.result?.code || "OWNER_REQUIRED");
  const result = await databaseAction("admin_members_list", { actor: actorPayload(verified.actor) });
  return databaseResult(result.data, result.error);
}

export async function POST(request: NextRequest) {
  const unavailable = requireConfigured();
  if (unavailable) return unavailable;
  const csrf = requireTrustedOrigin(request);
  if (csrf) return csrf;
  const verified = await verifyAdmin(request, true);
  if (!verified.actor || verified.actor.role !== "owner") return errorResult(verified.result?.status || 403, verified.result?.code || "OWNER_REQUIRED");
  const body = await readJson(request);
  if (body.error) return body.error;
  const value = body.value && typeof body.value === "object" ? body.value as Record<string, unknown> : null;
  if (!value || typeof value.email !== "string" || value.role !== "moderator") return errorResult(400, "INVALID_REQUEST");
  const email = value.email.trim().toLowerCase();
  const pending = await databaseAction("member_invite_pending", { actor: actorPayload(verified.actor), email });
  const existingInvitationRetry = pending.error === null
    && pending.data?.ok === false
    && pending.data.status === 409
    && pending.data.code === "INVITATION_EXISTS";
  if (!existingInvitationRetry && (pending.error || !pending.data || pending.data.ok !== true)) {
    return databaseResult(pending.data, pending.error);
  }
  const client = authClient();
  if (!client) return errorResult(503, "UNAVAILABLE");
  const config = getServerConfig();
  const redirectTo = config?.appUrl ? `${config.appUrl.replace(/\/$/, "")}/admin/login` : undefined;
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) } });
  if (error) return errorResult(503, "INVITATION_UNAVAILABLE");
  const response = existingInvitationRetry
    ? { ok: true, invited: true }
    : { ok: true, invited: true, expiresAt: pending.data?.expiresAt };
  return databaseResult(response, null, 201);
}
