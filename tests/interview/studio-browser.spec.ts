import { expect, test, type Page, type Route } from '@playwright/test';
import { studioSnapshot, studioSettings } from './studio-fixtures';
import { parkedInCloud } from '../cloud-parked';

const syntheticSupabaseUrl = 'https://synthetic.supabase.invalid';
const syntheticToken = 'synthetic-access-token';

const settings = (overrides: Record<string, unknown> = {}) => ({
  version: 5,
  mode: 'normal',
  motion: 'standard',
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
  ...overrides,
});

const overview = (overrides: Record<string, unknown> = {}) => ({
  heldCount: 0,
  nearestExpiry: null,
  lastCleanupAt: '2026-09-08T07:55:00.000Z',
  overduePurgeCount: 0,
  aggregate: {
    periodStart: '2026-09-01T07:00:00.000Z',
    periodEnd: '2026-10-01T06:59:59.999Z',
    recognitions: 4,
    expressionCounts: [1, 2, 0, 0, 0, 0, 0, 1, 0],
    expressionTotal: 4,
    revision: 8,
  },
  settings: settings(),
  ...overrides,
});

const recognition = (overrides: Record<string, unknown> = {}) => ({
  id: 'synthetic-recognition',
  recipient: 'Mina K.',
  message: 'Thank you for being there.',
  expressionIds: [2, 8],
  createdAt: '2026-09-08T08:00:00.000Z',
  firstPublishedAt: '2026-09-08T08:00:00.000Z',
  expiresAt: '2026-09-15T08:00:00.000Z',
  version: 3,
  status: 'published',
  featured: false,
  submittedName: 'Synthetic Sender',
  reason: null,
  ...overrides,
});

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

const authSession = (role: 'owner' | 'moderator') => ({
  access_token: syntheticToken,
  refresh_token: 'synthetic-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: role === 'owner' ? 'synthetic-owner' : 'synthetic-moderator',
    aud: 'authenticated',
    role: 'authenticated',
    email: `${role}@synthetic.test`,
  },
});

type CommonOptions = {
  role?: 'owner' | 'moderator';
  needsMfa?: boolean;
  overviewBody?: Record<string, unknown>;
};

async function mockCommon(page: Page, options: CommonOptions = {}) {
  const role = options.role ?? 'owner';
  await page.route('**/auth/v1/token*', (route) => fulfillJson(route, authSession(role)));
  await page.route('**/auth/v1/user*', (route) => fulfillJson(route, authSession(role).user));
  await page.route('**/auth/v1/factors*', (route) => fulfillJson(route, { all: [], totp: [] }));
  await page.route('**/api/admin/session', (route) => fulfillJson(route, {
    id: role === 'owner' ? 'synthetic-owner' : 'synthetic-moderator',
    role,
    needsMfa: options.needsMfa ?? false,
  }));
  await page.route('**/api/admin/overview', (route) => fulfillJson(route, options.overviewBody ?? overview()));
  await page.route('**/api/admin/members', (route) => fulfillJson(route, { items: [] }));
}

async function signInAs(page: Page, role: 'owner' | 'moderator' = 'owner') {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(`${role}@synthetic.test`);
  await page.getByLabel('Password').fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin(?:\/?$)/);
}

test('studio renders real sample and approved previews and saves settings', async ({ page }, info) => {
  parkedInCloud('it failed in the complete cloud run of 2026-11-12 and the cause is not found yet.');
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  await mockCommon(page, { overviewBody: overview({ settings: studioSettings() }) });
  await page.route('**/api/display/snapshot**', route => fulfillJson(route, studioSnapshot({ serverTime: new Date().toISOString() })));
  let saves = 0;
  await page.route('**/api/admin/settings', async route => { saves++; await fulfillJson(route, { settings: studioSettings({ version: 13 }) }); });
  await signInAs(page);
  await page.goto('/admin/display');
  await expect(page.getByTestId('preview-canvas')).toBeVisible();
  for (const label of ['Recognition Garden', 'Featured Recognition', 'Monthly Impact', 'Nine Expressions', 'Shared Expression', 'Expression Spotlight', 'Daily Practice', 'One Kind Word', 'Everyday Peace', 'Peace Promise']) {
    await page.getByRole('tab', { name: label, exact: false }).click();
    await expect(page.frameLocator('iframe[title="TV screen preview"]').locator('body')).not.toBeEmpty();
  }
  await page.getByRole('button', { name: 'Current approved', exact: true }).click();
  await page.getByRole('tab', { name: 'Featured Recognition', exact: false }).click();
  await expect(page.frameLocator('iframe[title="TV screen preview"]').getByTestId('featured-reading')).toContainText('Synthetic recipient A');
  await expect.poll(() => page.frameLocator('iframe[title="TV screen preview"]').getByTestId('featured-reading').evaluate(node => { let opacity = 1; for (let el: Element | null = node; el; el = el.parentElement) opacity *= Number(getComputedStyle(el).opacity); return opacity; })).toBeGreaterThan(0.9);
  await page.screenshot({ path: info.outputPath('studio-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('preview-canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByTestId('preview-canvas').screenshot({ path: info.outputPath('preview-phone.png') });
  await page.screenshot({ path: info.outputPath('studio-phone.png'), fullPage: true });
  expect(saves).toBe(0);
  await page.getByRole('group', { name: 'Global tempo' }).getByRole('button', { name: /Lively/ }).click();
  await page.getByRole('button', { name: 'Save display settings', exact: true }).click();
  await expect.poll(() => saves).toBe(1);
});
