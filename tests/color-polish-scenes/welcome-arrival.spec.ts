import { expect, test } from '@playwright/test';
import { buildActiveDisplayFixture, loadRenderer } from './helpers';

// lvz.app's church display opens this TV with ?welcome=<id> the moment a recognition is published,
// and the renderer receives that id as control.welcomeId on its first snapshot (Anthony, 2026-11-13).
// Fictional fixture data only; the renderer files are served from this checkout.

test.describe.configure({ timeout: 120_000 });

function fixtureWithNewest(publishedMinutesAgo: number) {
  const base = buildActiveDisplayFixture() as any;
  const now = Date.parse(base.serverTime);
  const [first, ...rest] = base.recognitions;
  const published = new Date(now - publishedMinutesAgo * 60000).toISOString();
  return { fixture: { ...base, recognitions: [{ ...first, createdAt: published, firstPublishedAt: published }, ...rest] }, id: first.id as string };
}

test('a just-published recognition named by welcome plays its arrival on first load', async ({ page }) => {
  const { fixture, id } = fixtureWithNewest(1);
  const frame = await loadRenderer(page, { fixture, control: { welcomeId: id } });
  const state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
  expect(state.queueLength + (state.active?.ids.includes(id) ? 1 : 0)).toBeGreaterThan(0);
});

test('without welcome, or for an older recognition, the first load plays no arrival', async ({ page }) => {
  const plain = fixtureWithNewest(1);
  let frame = await loadRenderer(page, { fixture: plain.fixture });
  let state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
  expect(state.queueLength).toBe(0);
  expect(state.active).toBeNull();
  await page.close();
  const fresh = await page.context().newPage();
  const old = fixtureWithNewest(60);
  frame = await loadRenderer(fresh, { fixture: old.fixture, control: { welcomeId: old.id } });
  state = await frame.evaluate(() => (window as any).colorPolishRuntime.getState());
  expect(state.queueLength).toBe(0);
  expect(state.active).toBeNull();
});
