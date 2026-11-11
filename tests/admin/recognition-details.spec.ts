import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Plan 18 Section C: an administrator sees every detail of a recognition. Synthetic data and
// a stand-in server only; the real fields come from database migration 021.
const recognition = (overrides: Record<string, unknown> = {}) => ({
  id: 'synthetic-recognition',
  recipient: 'Example Friend',
  message: 'Thank you for being there.',
  expressionIds: [2, 8],
  createdAt: '2026-09-08T08:00:00.000Z',
  firstPublishedAt: '2026-09-08T08:05:00.000Z',
  expiresAt: '2126-09-08T08:00:00.000Z',
  version: 4,
  status: 'hidden',
  featured: false,
  submittedName: 'Example Sender',
  reason: 'recipient_request',
  ...overrides,
});

const fulfillJson = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function signIn(page: Page, role: 'owner' | 'moderator' = 'moderator') {
  const user = { id: `synthetic-${role}`, aud: 'authenticated', role: 'authenticated', email: `${role}@synthetic.test` };
  const session = { access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
  await page.route('**/auth/v1/token*', (route) => fulfillJson(route, session));
  await page.route('**/auth/v1/user*', (route) => fulfillJson(route, user));
  await page.route('**/auth/v1/factors*', (route) => fulfillJson(route, { all: [], totp: [] }));
  await page.route('**/api/admin/session', (route) => fulfillJson(route, { id: user.id, role, needsMfa: false }));
  await page.route('**/api/admin/overview', (route) => fulfillJson(route, {
    heldCount: 0, nearestExpiry: null, lastCleanupAt: new Date().toISOString(), overduePurgeCount: 0,
    aggregate: { periodStart: '2026-09-01T07:00:00.000Z', periodEnd: '2026-10-01T06:59:59.999Z', recognitions: 1, expressionCounts: [0, 1, 0, 0, 0, 0, 0, 1, 0], expressionTotal: 2, revision: 1 },
    settings: { version: 5, mode: 'normal', motion: 'standard', pauseArrivals: false, pauseRotation: false, collectionOpen: true, lowActivityMinutes: 20, readingSeconds: 20, maxBubbles: 4, showTrails: true, showConstellations: true },
  }));
  await page.route('**/api/admin/members', (route) => fulfillJson(route, { items: [] }));
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(`${role}@synthetic.test`);
  await page.getByLabel('Password').fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin(?:\/?$)/);
}

test('the detail page shows likes, the last change and the history of admin actions', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/admin/recognitions/synthetic-recognition', (route) => fulfillJson(route, recognition({
    updatedAt: '2026-11-02T18:30:00.000Z',
    heartCount: 12,
    audit: [
      { action: 'hide', reason: 'recipient_request', outcome: 'success', at: '2026-11-02T18:30:00.000Z', version: 4, actorRole: 'owner' },
      { action: 'edit', reason: 'correction', outcome: 'success', at: '2026-11-01T17:00:00.000Z', version: 3, actorRole: 'moderator' },
      { action: 'publish', reason: null, outcome: 'success', at: '2026-10-30T16:00:00.000Z', version: 2, actorRole: null },
    ],
  })));
  await page.goto('/admin/recognitions/synthetic-recognition');
  await expect(page.getByTestId('detail-likes')).toHaveText('12');
  await expect(page.getByText('Last changed')).toBeVisible();
  await expect(page.getByText('Reason: Recipient request').first()).toBeVisible();

  const history = page.getByTestId('detail-history');
  const entries = history.getByRole('listitem');
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText('Hidden from display by the Owner');
  await expect(entries.nth(0)).toContainText('Reason: Recipient request');
  await expect(entries.nth(1)).toContainText('Edited by a Moderator');
  await expect(entries.nth(1)).toContainText('Reason: Correction');
  await expect(entries.nth(2)).toContainText('Published by an administrator no longer listed');
  await expect(history).not.toContainText('synthetic-owner');

  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations).toEqual([]);
});

test('a recognition with no actions on record says so', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/admin/recognitions/synthetic-recognition', (route) => fulfillJson(route, recognition({
    status: 'published', reason: null, updatedAt: '2026-09-08T08:05:00.000Z', heartCount: 0, audit: [],
  })));
  await page.goto('/admin/recognitions/synthetic-recognition');
  await expect(page.getByTestId('detail-likes')).toHaveText('0');
  await expect(page.getByTestId('detail-history')).toContainText('No admin actions are on record for this recognition.');
  await expect(page.getByTestId('detail-history').getByRole('listitem')).toHaveCount(0);
});

test('before database migration 021 the page still works and says what is missing', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/admin/recognitions/synthetic-recognition', (route) => fulfillJson(route, recognition()));
  await page.goto('/admin/recognitions/synthetic-recognition');
  await expect(page.getByLabel('Recipient')).toHaveValue('Example Friend');
  await expect(page.getByTestId('detail-likes')).toHaveText('Not available yet');
  await expect(page.getByTestId('detail-history')).toContainText('once database migration 021 is applied');
  await expect(page.getByText('Last changed')).toHaveCount(0);
});

test('the list shows each recognition\'s likes, whatever its status', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/admin/recognitions?*', (route) => fulfillJson(route, {
    ok: true,
    total: 3,
    sort: 'oldest',
    items: [
      recognition({ id: 'synthetic-1', recipient: 'Example One', status: 'published', reason: null, heartCount: 7 }),
      recognition({ id: 'synthetic-2', recipient: 'Example Two', status: 'hidden', heartCount: 1 }),
      recognition({ id: 'synthetic-3', recipient: 'Example Three', status: 'invalid', reason: 'spam', heartCount: 0 }),
    ],
  }));
  await page.goto('/admin/recognitions');
  await expect(page.getByRole('columnheader', { name: 'Likes' })).toBeVisible();
  const rows = page.getByRole('row');
  await expect(rows.filter({ hasText: 'Example One' }).getByRole('cell').nth(6)).toHaveText('7');
  await expect(rows.filter({ hasText: 'Example Two' }).getByRole('cell').nth(6)).toHaveText('1');
  await expect(rows.filter({ hasText: 'Example Three' }).getByRole('cell').nth(6)).toHaveText('0');
});

test('an unauthenticated request for a recognition is refused and never cached', async ({ request }) => {
  const response = await request.get('/api/admin/recognitions/00000000-0000-4000-8000-000000000301');
  expect([401, 503]).toContain(response.status());
  expect(response.headers()['cache-control'] ?? '').toContain('no-store');
});
