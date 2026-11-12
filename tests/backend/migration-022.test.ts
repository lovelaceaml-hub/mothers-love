import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../database/022_keep_admin_history.sql", import.meta.url), "utf8");
const sql = migration.replace(/^--.*$/gm, "");

describe("migration 022 contract", () => {
  it("is one guarded transaction that only changes how long admin history is kept", () => {
    expect(migration).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
    expect(sql.match(/ALTER TABLE/g)).toHaveLength(1);
    expect(sql).toContain("ALTER COLUMN expires_at SET DEFAULT (now() + interval '100 years')");
    expect(sql.match(/\bUPDATE\b/g)).toHaveLength(1);
    expect(sql).toContain("UPDATE mothers_love.admin_audit");
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE|GRANT|REVOKE|INSERT|CREATE)\b|DELETE\s+FROM|cron\.|auth\.|schema_migrations|public\.ml_/i);
    const tables = [...sql.matchAll(/mothers_love\.([a-z_]+)/g)].map((match) => match[1]);
    expect(new Set(tables)).toEqual(new Set(["admin_audit"]));
  });

  it("names its rollback and refuses a second run", () => {
    expect(migration).toContain("--   ALTER TABLE mothers_love.admin_audit ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');");
    expect(sql).toContain("migration 022 is already applied");
    expect(sql).toContain("NOT LIKE '%30 days%'");
  });
});
