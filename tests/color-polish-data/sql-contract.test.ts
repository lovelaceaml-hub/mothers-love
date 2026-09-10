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
