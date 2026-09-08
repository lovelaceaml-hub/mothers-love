import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../database/001_mothers_love.sql", import.meta.url), "utf8");

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
