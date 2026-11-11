import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../database/021_admin_all_details.sql", import.meta.url), "utf8");
const first = readFileSync(new URL("../../database/001_mothers_love.sql", import.meta.url), "utf8");
const sql = migration.replace(/^--.*$/gm, "");

describe("migration 021 contract", () => {
  it("is one guarded transaction that replaces only the admin projection", () => {
    expect(migration).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(migration.trimEnd()).toMatch(/COMMIT;$/);
    expect(sql.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(1);
    expect(sql).toContain("CREATE OR REPLACE FUNCTION mothers_love.ml_admin_recognition(rec mothers_love.recognitions)");
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE|GRANT|REVOKE|ALTER|INSERT|UPDATE|DELETE|SECURITY DEFINER)\b|cron\.|auth\.|schema_migrations/i);
    expect(sql).not.toContain("public.ml_");
  });

  it("names its rollback, and the rollback is the definition it replaces", () => {
    const original = "SELECT mothers_love.ml_public_recognition(rec) || jsonb_build_object('submittedName', rec.submitted_name, 'reason', rec.reason_category)";
    expect(first).toContain(original);
    expect(migration).toContain(`--     ${original}`);
    expect(sql).toContain("NOT LIKE '%''submittedName'', rec.submitted_name, ''reason'', rec.reason_category%'");
  });

  it("keeps the existing fields and never projects an administrator identifier", () => {
    for (const field of ["'submittedName', rec.submitted_name", "'reason', rec.reason_category", "'updatedAt'", "'heartCount'", "'audit'", "'actorRole'"]) {
      expect(sql).toContain(field);
    }
    const projection = sql.split("jsonb_build_object(\n          'action'")[1]?.split(")")[0] ?? "";
    expect(projection).not.toMatch(/actor_user_id|user_id|metadata\b(?!->)/);
    expect(sql).toContain("LIMIT 50");
    expect(sql).toContain("WHERE audit.target_id = rec.id");
  });
});
