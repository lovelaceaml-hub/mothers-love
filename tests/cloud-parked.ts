import { test } from '@playwright/test';

/**
 * Parks one journey in the cloud checks only (Plan 35). It still runs on a developer's
 * machine. Each use says what the complete cloud run of 2026-11-12 (run 43133697086) showed,
 * so the journey can be picked up again; remove the call once it passes in the cloud.
 */
export function parkedInCloud(finding: string): void {
  test.skip(Boolean(process.env.CI), `Parked in the cloud checks (Plan 35): ${finding}`);
}
