import type { NextRequest } from "next/server";
import type { VerifiedActor } from "./types";
import { authClient, callDatabase } from "./supabase";

export function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header || !/^Bearer\s+/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

/**
 * The second argument remains for call-site compatibility. Campaign access
 * requires a verified token, confirmed email, and fresh membership only.
 */
export async function verifyAdmin(request: NextRequest, _requireAal2 = false): Promise<{ actor: VerifiedActor | null; result?: { status: number; code: string } }> {
  const token = bearerToken(request);
  const client = authClient();
  if (!token || !client) return { actor: null, result: { status: client ? 401 : 503, code: client ? "UNAUTHENTICATED" : "UNAVAILABLE" } };
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { actor: null, result: { status: 401, code: "UNAUTHENTICATED" } };
  if (!data.user.email || !data.user.email_confirmed_at) return { actor: null, result: { status: 403, code: "EMAIL_UNVERIFIED" } };
  const claimsResult = await client.auth.getClaims(token);
  const claims = claimsResult.data?.claims as Record<string, unknown> | undefined;
  if (claimsResult.error || !claims || claims.sub !== data.user.id) return { actor: null, result: { status: 401, code: "UNAUTHENTICATED" } };
  const aal2 = claims.aal === "aal2";
  const membership = await callDatabase("admin_session", { actor: { userId: data.user.id, email: data.user.email ?? null, aal2 } });
  if (membership.error || !membership.data || typeof membership.data !== "object") return { actor: null, result: { status: 503, code: "UNAVAILABLE" } };
  const result = membership.data as Record<string, unknown>;
  if (result.ok !== true || typeof result.role !== "string") return { actor: null, result: { status: Number(result.status) || 403, code: String(result.code || "FORBIDDEN") } };
  const role = result.role === "owner" ? "owner" : result.role === "moderator" ? "moderator" : null;
  if (!role) return { actor: null, result: { status: 403, code: "FORBIDDEN" } };
  return { actor: { userId: data.user.id, email: data.user.email ?? null, role, aal2 } };
}

export async function verifyDisplaySession(tokenHash: string | null): Promise<{ tokenHash: string } | { status: number; code: string }> {
  if (!tokenHash) return { status: 401, code: "UNAUTHENTICATED" };
  return { tokenHash };
}
