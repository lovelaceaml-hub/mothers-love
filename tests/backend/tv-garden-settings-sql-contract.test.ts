import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../database/008_tv_garden_settings.sql', import.meta.url), 'utf8');
const runtimeBridge = readFileSync(new URL('../../database/009_display_settings_runtime_bridge.sql', import.meta.url), 'utf8');
const productionWrapper = readFileSync(new URL('../../docs/runs/2026-09-09-tv-garden-refresh/research/production-migration.sql', import.meta.url), 'utf8');
const runtimeBridgeWrapper = readFileSync(new URL('../../docs/runs/2026-09-09-tv-garden-refresh/research/production-display-settings-bridge.sql', import.meta.url), 'utf8');

describe('TV Garden settings migration contract', () => {
  it('keeps the modern configuration inside the dedicated schema and preserves the legacy alias', () => {
    expect(migration).toContain('ALTER TABLE mothers_love.settings');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS display_config jsonb');
    expect(migration).toContain("'maxBubbles', s.max_bubbles");
    expect(migration).not.toMatch(/ALTER TABLE public\./u);
    expect(migration).not.toMatch(/CREATE TABLE public\./u);
  });

  it('persists the fixed screen registry, unlimited positive garden amount, tempo, effects, and sound', () => {
    for (const id of ['garden', 'featured', 'impact', 'expressions', 'shared-expression', 'spotlight', 'daily-practice', 'one-kind-word', 'everyday-peace', 'peace-promise']) {
      expect(migration).toContain(`'${id}'`);
    }
    expect(migration).toContain("'gardenAmount', 'all-active'");
    expect(migration).toContain("'tempo', 'standard'");
    expect(migration).toContain("'durationOverrides', '{}'::jsonb");
    expect(migration).toContain("'arrivalChime', true");
    expect(migration).toContain("'milestoneChime', true");
    expect(migration).toContain("'^[1-9][0-9]*$'");
  });

  it('returns fixed official destinations without accepting an arbitrary URL field', () => {
    expect(migration).toContain('https://heavenlymotherslove.org/en/checklist');
    expect(migration).toContain('https://heavenlymotherslove.org/en/signature');
    expect(migration).not.toContain('customUrl');
    expect(migration).toContain('REVOKE ALL ON FUNCTION mothers_love.ml_patch_display_settings(jsonb) FROM PUBLIC');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION mothers_love.ml_patch_display_settings(jsonb) TO mothers_love_runtime');
  });

  it('binds the production transaction to this reviewed source and preflights the prior campaign ledger', () => {
    const sourceHash = createHash('sha256').update(migration).digest('hex');
    expect(productionWrapper).toContain(`'008_tv_garden_settings', '${sourceHash}'`);
    expect(productionWrapper).toContain('\\ir ../../../../database/008_tv_garden_settings.sql');
    expect(productionWrapper).toContain("version = '007_public_display_revision'");
    expect(productionWrapper).toContain('Existing public and auth function fingerprint changed');
    expect(productionWrapper).toContain('Unexpected TV settings writer privilege');
  });

  it('keeps the runtime writer behind one explicitly granted public bridge without opening the private schema', () => {
    expect(runtimeBridge).toContain('CREATE OR REPLACE FUNCTION public.ml_display_settings_patch(payload jsonb)');
    expect(runtimeBridge).toContain('SELECT mothers_love.ml_patch_display_settings(payload)');
    expect(runtimeBridge).toContain('SECURITY DEFINER');
    expect(runtimeBridge).toContain("SET search_path = ''");
    expect(runtimeBridge).toContain('REVOKE ALL ON FUNCTION public.ml_display_settings_patch(jsonb) FROM PUBLIC');
    expect(runtimeBridge).toContain('GRANT EXECUTE ON FUNCTION public.ml_display_settings_patch(jsonb) TO mothers_love_runtime');
    expect(runtimeBridge).not.toContain('GRANT USAGE ON SCHEMA mothers_love');
    const bridgeHash = createHash('sha256').update(runtimeBridge).digest('hex');
    expect(runtimeBridgeWrapper).toContain(`'009_display_settings_runtime_bridge', '${bridgeHash}'`);
    expect(runtimeBridgeWrapper).toContain('\\ir ../../../../database/009_display_settings_runtime_bridge.sql');
    expect(runtimeBridgeWrapper).toContain("has_schema_privilege('mothers_love_runtime', 'mothers_love', 'USAGE')");
  });
});
