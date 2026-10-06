import postgres, { type Sql } from "postgres";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerConfig } from "./env";

let cachedAuth: SupabaseClient | null = null;
let cachedDatabase: Sql | null = null;

export function databaseClient(): Sql | null {
  const config = getServerConfig();
  if (!config) return null;
  if (!cachedDatabase) {
    cachedDatabase = postgres(config.databaseUrl, {
      max: 1,
      prepare: false,
      // Runtime bridges return JSONB and accept scalar/JSONB parameters. Native
      // array/custom-type discovery adds a catalog read on every connection.
      fetch_types: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: config.databaseSsl,
    });
  }
  return cachedDatabase;
}

export async function callDatabase(
  action: string,
  payload: Record<string, unknown>,
): Promise<{ data: unknown; error: Error | null }> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_api(${action}, ${client.json(payload as never)}::jsonb) as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}

/**
 * The TV studio has a dedicated, allowlisted settings writer. It is kept
 * separate from the legacy action bridge so modern fields cannot be silently
 * accepted and then discarded by the original settings patch branch.
 */
export async function callDisplaySettingsPatch(
  payload: Record<string, unknown>,
): Promise<{ data: unknown; error: Error | null }> {
  const client = databaseClient();
  if (!client) return { data: null, error: new Error("UNAVAILABLE") };
  try {
    const rows = await client`select public.ml_display_settings_patch(${client.json(payload as never)}::jsonb) as result`;
    return { data: rows[0]?.result ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("DATABASE_ERROR") };
  }
}

export function authClient(): SupabaseClient | null {
  const config = getServerConfig();
  if (!config) return null;
  if (!cachedAuth) {
    cachedAuth = createClient(config.url, config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cachedAuth;
}
