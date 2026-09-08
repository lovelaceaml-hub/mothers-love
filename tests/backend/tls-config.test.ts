import { beforeEach, describe, expect, it, vi } from "vitest";

const TEST_CA = `-----BEGIN CERTIFICATE-----
MIIDHTCCAgWgAwIBAgIUPT71Xde/02d7VIATeT4/HpE0/x4wDQYJKoZIhvcNAQEL
BQAwHjEcMBoGA1UEAwwTTW90aGVyIExvdmUgVGVzdCBDQTAeFw0yNjA5MDgwMjQ0
NTNaFw0yNjA5MDkwMjQ0NTNaMB4xHDAaBgNVBAMME01vdGhlciBMb3ZlIFRlc3Qg
Q0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDFTJvaXWWDbpl/Kevu
8rp3suT5X/cexz1SzmAxDNrKgq68bxrnqfH52mTL7ntuBKCshx8xq2i4DXgN6c3m
Jew7f++hPLcOJS1Li7GH9O24kie18DGqHfpovjJO/Wc3xSHlwNdtt/Rq87pFkr/u
erjLgyGRHEipy/P6T44tcDkuX6Tv90hsJBRp/MB5nnII1F880zH5KF82B7+CPpYK
kKqPS6yi9qUfoxEk3T3grEF9Zmtx4qXDhUIfWcqUpJXiT4qDQ4T+/kpN18vnNcAb
5RTec6WwHzMlVBFp7io4R2JjEowUKxXJzAJiqfp5JqedJ2CevpHjcfwIh5V7ZQzY
eHAJAgMBAAGjUzBRMB0GA1UdDgQWBBQXKf2zPkIfmEZBklgblTKywu7LPzAfBgNV
HSMEGDAWgBQXKf2zPkIfmEZBklgblTKywu7LPzAPBgNVHRMBAf8EBTADAQH/MA0G
CSqGSIb3DQEBCwUAA4IBAQBYyQXIlWldXvbJX/q49+T4LLinCXcu2VORCcKaDM+C
cFhTD1ih2nZyTgylMJhAgTQgAv17YXM3rfsbOFarCWPrnVG1kxF4Mo5YYjLtoe11
8Hb2ctjMyj6MvXrScJzizZwM2fWATgTe4A01J/mljBkI5Lo5QL6QX8spMs15B/ry
Je9unjTSWvfFpJRwzDWQJL701khGYcEr/dmNZsefGHIjitCEe9deXxxwpDlaz96a
SMyRobIcK/WnAgmwAvckF569Ti4ir7cMiKmnSPWNp2LyrhR9tAsyBXOdZknFWSEW
0yjfz829GiuEt4G/tvg+zaoffsLsGdx13Yw22ZbalDBt
-----END CERTIFICATE-----
`;

const CONFIG_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "DATABASE_CA_CERT",
] as const;

function configure(overrides: Partial<Record<(typeof CONFIG_KEYS)[number], string>> = {}) {
  for (const key of CONFIG_KEYS) delete process.env[key];
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: "https://mothers-love.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    DATABASE_URL: "postgresql://mothers_love_runtime@example.test:6543/postgres",
    ...overrides,
  });
}

beforeEach(() => {
  vi.resetModules();
  configure();
});

describe("server database TLS configuration", () => {
  it("fails closed when a configured database has no CA certificate", async () => {
    const { getServerConfig, isConfigured } = await import("@/lib/server/env");

    expect(getServerConfig()).toBeNull();
    expect(isConfigured()).toBe(false);
  });

  it("fails closed for a certificate-shaped value that is not an X509 CA", async () => {
    configure({ DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\\nAAAA\\n-----END CERTIFICATE-----" });
    const { getServerConfig } = await import("@/lib/server/env");

    expect(getServerConfig()).toBeNull();
  });

  it("normalizes literal and escaped newlines into a strict CA configuration", async () => {
    configure({ DATABASE_CA_CERT: TEST_CA.replace(/\n/g, "\\n") });
    const { getServerConfig, normalizeCaCertificate } = await import("@/lib/server/env");

    expect(normalizeCaCertificate(TEST_CA.replace(/\n/g, "\\n"))).toBe(TEST_CA);
    expect(getServerConfig()?.databaseSsl).toEqual({ ca: TEST_CA, rejectUnauthorized: true });
  });

  it.each(["disable", "require"])("keeps strict SSL when DATABASE_URL requests sslmode=%s", async (sslmode) => {
    configure({
      DATABASE_URL: `postgresql://mothers_love_runtime@example.test:6543/postgres?sslmode=${sslmode}`,
      DATABASE_CA_CERT: TEST_CA,
    });
    const { databaseClient } = await import("@/lib/server/supabase");
    const client = databaseClient();

    expect(client?.options.ssl).toEqual({ ca: TEST_CA, rejectUnauthorized: true });
    await client?.end({ timeout: 0 });
  });
});
