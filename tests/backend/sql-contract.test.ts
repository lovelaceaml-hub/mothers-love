import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../database/001_mothers_love.sql", import.meta.url), "utf8");
const orderMigration = readFileSync(new URL("../../database/015_admin_list_order.sql", import.meta.url), "utf8");
const reactionBatchMigration = readFileSync(new URL("../../database/019_reaction_read_batch_100.sql", import.meta.url), "utf8");
const displayNewestMigration = readFileSync(new URL("../../database/020_display_newest_100_before_featured.sql", import.meta.url), "utf8");
const publicDisplaySnapshot = readFileSync(new URL("../../database/007_public_display_revision.sql", import.meta.url), "utf8");

describe("reviewed database boundary", () => {
  it("creates only the campaign namespace and explicit bridge functions", () => {
    expect(migration).toContain("CREATE SCHEMA IF NOT EXISTS mothers_love");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.ml_api");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.ml_purge");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.ml_api(text, jsonb) FROM PUBLIC");
  });

  it("preserves anonymous daily aggregates and minute purge identity", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS mothers_love.daily_aggregates");
    expect(migration).toContain("cron.schedule(''ml_purge'', ''* * * * *'");
    expect(migration).toContain("DELETE FROM mothers_love.recognitions WHERE expires_at <= now_value");
  });
});

describe("migration 015 admin list order", () => {
  it("only rewrites the admin_list block of ml_api behind exact preconditions", () => {
    expect(orderMigration).toContain("pg_catalog.pg_get_functiondef('public.ml_api(text, jsonb)'::regprocedure)");
    expect(orderMigration).toContain("RAISE EXCEPTION 'admin_list aggregate order precondition changed'");
    expect(orderMigration).toContain("RAISE EXCEPTION 'admin_list page order precondition changed'");
    expect(orderMigration).toContain("RAISE EXCEPTION 'admin_list return precondition changed'");
    expect(orderMigration).not.toContain("CREATE TABLE");
    expect(orderMigration).not.toContain("GRANT ");
    expect(orderMigration).not.toContain("expires_at");
  });

  it("matches the admin_list text that migration 001 defines", () => {
    expect(migration).toContain("jsonb_agg(mothers_love.ml_admin_recognition(page_rec) ORDER BY page_rec.created_at DESC)");
    expect(migration).toMatch(/ORDER BY r\.created_at DESC\s+OFFSET page_number \* page_size LIMIT page_size/);
    expect(migration).toContain("RETURN jsonb_build_object('ok', true, 'items', items, 'total', total_count);");
  });

  it("orders oldest first only when asked and echoes the order it used", () => {
    expect(orderMigration).toContain("CASE WHEN (payload->>''sort'') = ''oldest'' THEN r.created_at END ASC, r.created_at DESC, r.id");
    expect(orderMigration).toContain("''sort'', CASE WHEN (payload->>''sort'') = ''oldest'' THEN ''oldest'' ELSE ''newest'' END");
  });
});

describe("reviewed read-efficiency migrations", () => {
  it("raises only the reaction getter's bounded cap behind security and drift checks", () => {
    expect(reactionBatchMigration).toContain("pg_get_functiondef('public.ml_reactions_get(jsonb,text)'::pg_catalog.regprocedure)");
    expect(reactionBatchMigration).toContain("NOT BETWEEN 1 AND 30");
    expect(reactionBatchMigration).toContain("NOT BETWEEN 1 AND 100");
    expect(reactionBatchMigration).toContain("reaction getter security precondition changed");
    expect(reactionBatchMigration).toContain("reaction getter batch cap precondition changed");
    expect(reactionBatchMigration).not.toMatch(/\b(CREATE|ALTER) TABLE\b/i);
    expect(reactionBatchMigration).not.toMatch(/\b(GRANT|REVOKE)\b/i);
  });

  it("limits display candidates to newest 100 before featured ordering for items and arrivals", () => {
    const executable = displayNewestMigration.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
    expect((publicDisplaySnapshot.match(/LIMIT 1000/g) ?? [])).toHaveLength(2);
    expect(displayNewestMigration).toContain("selection_pattern");
    expect(displayNewestMigration).toContain("LIMIT 1000");
    expect(displayNewestMigration).toContain("ORDER BY r.first_published_at DESC, r.id DESC LIMIT 100");
    expect(displayNewestMigration).toContain("ORDER BY selected\\.featured DESC");
    expect(displayNewestMigration).toContain("public.ml_color_polish_snapshot(text)");
    expect(displayNewestMigration).toContain("color polish snapshot dependency precondition changed");
    expect(displayNewestMigration).toContain("public display newest/featured selection precondition changed");
    expect(displayNewestMigration).toContain("use the same newest-100 set");
    expect(executable).not.toMatch(/\b(CREATE|ALTER) TABLE\b/i);
    expect(executable).not.toMatch(/\b(GRANT|REVOKE)\b/i);
  });
});
