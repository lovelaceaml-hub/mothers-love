import { randomBytes, createHash } from "node:crypto";
import { callDatabase, callDisplaySettingsPatch } from "./supabase";
import type { ApiResult, VerifiedActor } from "./types";

export async function databaseAction(action: string, payload: Record<string, unknown>): Promise<{ data: ApiResult | null; error: Error | null }> {
  const result = await callDatabase(action, payload);
  if (result.error) return { data: null, error: result.error };
  if (!result.data || typeof result.data !== "object") return { data: null, error: new Error("DATABASE_ERROR") };
  return { data: result.data as ApiResult, error: null };
}

export async function displaySettingsPatch(payload: Record<string, unknown>): Promise<{ data: ApiResult | null; error: Error | null }> {
  const result = await callDisplaySettingsPatch(payload);
  if (result.error) return { data: null, error: result.error };
  if (!result.data || typeof result.data !== "object") return { data: null, error: new Error("DATABASE_ERROR") };
  return { data: result.data as ApiResult, error: null };
}

export function actorPayload(actor: VerifiedActor): { userId: string; email: string | null; role: string; aal2: boolean } {
  return { userId: actor.userId, email: actor.email, role: actor.role, aal2: actor.aal2 };
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function randomPairCode(length = 10): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CROCKFORD[byte % CROCKFORD.length]).join("");
}

export function randomSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
