import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../database/011_color_polish.sql", import.meta.url), "utf8");

describe("Color Polish migration contract", () => {
  it("adds only campaign tables and the write-capable public snapshot bridge", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS mothers_love.color_polish_presentation");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS mothers_love.color_polish_weekly_focus");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.ml_color_polish_snapshot(after_cursor text)");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("VOLATILE");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("ON CONFLICT (week_start) DO NOTHING");
    expect(migration).toContain("AT TIME ZONE 'America/Los_Angeles'");
    expect(migration).toContain("mothers_love.daily_aggregates");
    expect(migration).not.toContain("jsonb_object_length");
    expect(migration).toContain("current_week_start date");
    expect(migration).toContain("current_week_end date");
    expect(migration).toContain("legacy_value := mothers_love.ml_aggregate_json(period_from, period_to)");
    expect(migration).not.toMatch(/ALTER TABLE public\./u);
  });

  it("keeps the preset disabled by default and supports the approved 180 second Garden duration", () => {
    expect(migration).toContain("enabled boolean NOT NULL DEFAULT false");
    expect(migration).toContain("'id', 'garden', 'enabled', true, 'durationSeconds', 180");
    expect(migration).toContain("'color-polish-v6'");
    expect(migration).toContain("expectedSettingsVersion");
    expect(migration).toContain("SET version = version + 1");
    expect(migration).toContain("RAISE EXCEPTION 'legacy aggregate mismatch'");
    expect(migration).toContain("RAISE EXCEPTION 'invalid color polish aggregate'");
    expect(migration).toContain("action_value IS NULL OR action_value NOT IN ('activate', 'rollback')");
    expect(migration).toContain("jsonb_object_keys(changes) AS key_name WHERE key_name <> 'playlist'");
  });

  it("revokes direct public access and grants only the restricted runtime", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.ml_color_polish_snapshot(text) FROM PUBLIC");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_patch(jsonb) FROM PUBLIC");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.ml_color_polish_presentation_activate(jsonb) FROM PUBLIC");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.ml_color_polish_snapshot(text) TO mothers_love_runtime");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.ml_color_polish_presentation_patch(jsonb) TO mothers_love_runtime");
    expect(migration).not.toContain("GRANT USAGE ON SCHEMA mothers_love");
  });
});

// Plan 17 Lane 13: database/013_color_polish_live_feed.sql and its two operator files.
// Static contract only: no test here or anywhere else connects to a database.
describe("Color Polish live-feed validator migration contract", () => {
  const liveFeed = readFileSync(new URL("../../database/013_color_polish_live_feed.sql", import.meta.url), "utf8");
  const stripComments = (sql: string) => sql.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
  const statements = stripComments(liveFeed);
  const originalValidator = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_valid_playlist(playlist_value jsonb)"),
    migration.indexOf("CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_presentation_json()"),
  ).trim();

  it("replaces exactly one function and touches nothing else", () => {
    expect(statements.match(/CREATE OR REPLACE FUNCTION/gu)).toHaveLength(1);
    expect(statements).toContain("CREATE OR REPLACE FUNCTION mothers_love.ml_color_polish_valid_playlist(playlist_value jsonb)");
    expect(statements).toContain("RETURNS boolean");
    expect(statements).toContain("IMMUTABLE");
    expect(statements).toContain("SET search_path = ''");
    expect(statements).not.toMatch(/\b(ALTER|DROP|TRUNCATE|GRANT|REVOKE|INSERT|UPDATE|DELETE|CREATE TABLE|CREATE INDEX|CREATE SCHEMA)\b/u);
    expect(statements).not.toMatch(/\bpublic\./u);
    expect(statements).not.toMatch(/\bauth\./u);
    // Idempotent by construction: CREATE OR REPLACE only, nothing that fails on a second run.
    expect(statements).not.toMatch(/CREATE FUNCTION/u);
  });

  it("accepts ten or eleven entries, live-feed optional, the ten originals required, durations 12 to 180", () => {
    expect(statements).toContain("pg_catalog.jsonb_array_length(playlist_value) NOT BETWEEN 10 AND 11");
    expect(statements).toContain("'peace-in-practice', 'orbit', 'milestone', 'live-feed') OR item_id = ANY(seen_ids)");
    expect(statements).toContain("RETURN pg_catalog.cardinality(seen_ids) BETWEEN 10 AND 11");
    expect(statements).toContain("AND (pg_catalog.cardinality(seen_ids) = 10 OR 'live-feed' = ANY(seen_ids))");
    for (const id of ["welcome", "garden", "featured", "calendar", "peacemakers", "status", "expressions", "peace-in-practice", "orbit", "milestone"]) {
      expect(statements).toContain(`AND '${id}' = ANY(seen_ids)`);
    }
    expect(statements).toContain("(item->>'durationSeconds')::numeric NOT BETWEEN 12 AND 180");
    expect(statements).toContain("AND has_enabled;");
  });

  it("differs from the 011 validator only on the four live-feed lines", () => {
    const next = statements.trim().split("\n");
    const before = originalValidator.split("\n");
    const removed = before.filter((line) => !next.includes(line));
    const added = next.filter((line) => !before.includes(line));
    expect(removed).toHaveLength(3);
    expect(added).toHaveLength(4);
  });

  it("writes no em dash or en dash", () => {
    expect(liveFeed).not.toMatch(/[\u2013\u2014]/u);
  });
});
