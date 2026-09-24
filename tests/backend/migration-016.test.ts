import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../database/016_never_expire.sql", import.meta.url), "utf8");
const liveFile = "/private/tmp/claude-501/-Users-anthony-Projects-mothers-love/412110c9-c142-448b-aff5-86d01eb560bd/scratchpad/live/public.ml_api.sql";
const recognitionAnchor = "CASE WHEN hold THEN NULL ELSE now_value END, expires_value)";
const eventAnchor = "mothers_love.ml_public_recognition(rec), rec.expires_at);";
const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("migration 016 contract", () => {
  it("uses a guarded transaction and changes only the specified bridge and rows", () => {
    expect(migration).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
    expect(migration).toContain(recognitionAnchor);
    expect(migration).toContain(eventAnchor);
    expect(migration).toContain("CASE WHEN hold THEN NULL ELSE now_value END, now_value + interval '100 years')");
    expect(migration).toContain("LEAST(rec.expires_at, now_value + interval '168 hours')");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION mothers_love.ml_purge_healthy");
    const healthyBody = migration.split("CREATE OR REPLACE FUNCTION mothers_love.ml_purge_healthy")[1]?.split("$$;")[0];
    expect(healthyBody).not.toContain("last_cleanup_at");
    expect(migration).not.toMatch(/\b(DROP|TRUNCATE|GRANT|REVOKE|ALTER ROLE)\b|DELETE\s+FROM|cron\.|auth\.|INSERT\s+INTO\s+mothers_love\.schema_migrations/i);
    const sql = migration.replace(/^--.*$/gm, "");
    const namespaces = [...sql.matchAll(/\b([a-z_]+)\./g)].map((match) => match[1]);
    expect(namespaces.every((name) => ["mothers_love", "public", "pg_catalog", "a", "r", "rec", "restored", "expression_id"].includes(name))).toBe(true);
    expect(migration).not.toContain("public.ml_public_display_snapshot");
    expect(migration).not.toContain("updated_at =");
  });

  it.skipIf(!existsSync(liveFile))("matches each live function anchor exactly once", () => {
    const live = readFileSync(liveFile, "utf8");
    expect(occurrences(live, recognitionAnchor)).toBe(1);
    expect(occurrences(live, eventAnchor)).toBe(1);
  });
});
