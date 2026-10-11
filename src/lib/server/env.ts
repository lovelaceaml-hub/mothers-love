import { X509Certificate } from "node:crypto";

export type ServerConfig = {
  url: string;
  databaseUrl: string;
  databaseSsl: { ca: string; rejectUnauthorized: true };
  publishableKey: string;
  appUrl: string | null;
};

const DATABASE_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const PEM_BEGIN = "-----BEGIN CERTIFICATE-----";
const PEM_END = "-----END CERTIFICATE-----";
const PEM_CERTIFICATE = /-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/g;

let hasCachedCertificate = false;
let cachedRawCertificate: string | undefined;
let cachedNormalizedCertificate: string | null = null;

function normalizeCaCertificateUncached(value: string | undefined): string | null {
  if (!value) return null;

  const normalized = value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return null;

  const blocks: string[] = [];
  let cursor = 0;
  for (const match of normalized.matchAll(PEM_CERTIFICATE)) {
    const gap = normalized.slice(cursor, match.index ?? 0).trim();
    if (gap) return null;

    const body = match[1].replace(/\s/g, "");
    if (!body || body.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return null;

    const lines = body.match(/.{1,64}/g)?.join("\n");
    if (!lines) return null;
    const block = `${PEM_BEGIN}\n${lines}\n${PEM_END}`;
    try {
      if (!new X509Certificate(block).ca) return null;
    } catch {
      return null;
    }
    blocks.push(block);
    cursor = (match.index ?? 0) + match[0].length;
  }

  if (!blocks.length || normalized.slice(cursor).trim()) return null;
  return `${blocks.join("\n")}\n`;
}

export function normalizeCaCertificate(value: string | undefined): string | null {
  if (hasCachedCertificate && value === cachedRawCertificate) return cachedNormalizedCertificate;
  const normalized = normalizeCaCertificateUncached(value);
  hasCachedCertificate = true;
  cachedRawCertificate = value;
  cachedNormalizedCertificate = normalized;
  return normalized;
}

function isDatabaseUrl(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    return DATABASE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function getServerConfig(): ServerConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const publishableKey = process.env.PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !databaseUrl || !publishableKey) return null;
  if (!isDatabaseUrl(databaseUrl)) return null;

  const rawCaCertificate = process.env.DATABASE_CA_CERT;
  const caCertificate = normalizeCaCertificate(rawCaCertificate);
  if (!caCertificate) return null;

  return {
    url,
    databaseUrl,
    databaseSsl: { ca: caCertificate, rejectUnauthorized: true },
    publishableKey,
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
  };
}

export function isConfigured(): boolean {
  return getServerConfig() !== null;
}
