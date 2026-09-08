import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let authClient: SupabaseClient | null | undefined;

export function getAuthClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (authClient !== undefined) {
    return authClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    authClient = null;
    return authClient;
  }

  authClient = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return authClient;
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const client = getAuthClient();
  if (!client) {
    return null;
  }

  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
