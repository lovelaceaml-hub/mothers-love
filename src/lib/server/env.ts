export type ServerConfig = {
  url: string;
  databaseUrl: string;
  publishableKey: string;
  appUrl: string | null;
};

export function getServerConfig(): ServerConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const publishableKey = process.env.PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !databaseUrl || !publishableKey) return null;
  return {
    url,
    databaseUrl,
    publishableKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
  };
}

export function isConfigured(): boolean {
  return getServerConfig() !== null;
}
