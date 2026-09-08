import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

const device = (overrides: Record<string, unknown> = {}) => ({
  id: 'synthetic-device',
  label: 'Synthetic display browser',
  lastSeenAt: '2026-09-08T08:00:00.000Z',
  appliedVersion: 5,
  appliedSnapshotRevision: 5,
  revoked: false,
  ...overrides,
});

const overview = (overrides: Record<string, unknown> = {}) => ({
  heldCount: 0,
  nearestExpiry: null,
  lastCleanupAt: '2026-09-08T07:55:00.000Z',
  overduePurgeCount: 0,
  devices: [device()],
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
  await page.route('**/api/admin/devices', (route) => fulfillJson(route, { items: [device()] }));
  await page.route('**/api/admin/members', (route) => fulfillJson(route, { items: [] }));
}

async function signInAs(page: Page, role: 'owner' | 'moderator' = 'owner') {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(`${role}@synthetic.test`);
  await page.getByLabel('Password').fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin(?:\/?$)/);
}

test.describe('synthetic admin browser workflows', () => {
  test('mobile login is accessible and owner sign in enters admin without an authenticator step', async ({ page }) => {
    await mockCommon(page, { role: 'owner', needsMfa: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/login');

    const accessibility = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] }).analyze();
    expect(accessibility.violations).toEqual([]);

    await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await page.getByLabel('Email address').fill('owner@synthetic.test');
    await page.getByLabel('Password').fill('synthetic-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin(?:\/?$)/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await page.goto('/admin/mfa');
    await expect(page).toHaveURL(/\/admin(?:\/?$)/);
    await expect(page.getByText('Show enrollment QR', { exact: true })).toHaveCount(0);
  });

  test('invitation magic link keeps password setup after Supabase clears the callback hash', async ({ page }) => {
    await mockCommon(page);
    await page.goto(`/admin/login#access_token=${syntheticToken}&refresh_token=synthetic-refresh-token&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=magiclink`);
    await expect(page).toHaveURL(/\/admin\/set-password#?$/);
    await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save password' })).toBeVisible();
    await expect(page.getByText('Verified email:', { exact: false })).toBeVisible();
    await expect(page.locator('#admin-password')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
    await page.reload();
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
  });

  test('setup page waits for a provider session before enabling password save', async ({ page }) => {
    await mockCommon(page);
    await page.unroute('**/auth/v1/user*');
    await page.route('**/auth/v1/user*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await fulfillJson(route, authSession('owner').user);
    });
    await page.goto(`/admin/set-password#access_token=${syntheticToken}&refresh_token=synthetic-refresh-token&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=invite`);
    await expect(page.getByLabel('Checking setup link')).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible({ timeout: 3_000 });
  });

  test('invalid setup link gives recovery guidance without a password form', async ({ page }) => {
    await mockCommon(page);
    await page.goto('/admin/set-password?type=invite');
    await expect(page.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    await expect(page.getByText('missing, expired or already used', { exact: false })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request a fresh setup link' })).toHaveAttribute('href', '/admin/login?setup=1');
  });

  test('error callback does not fall back to a different persisted account session', async ({ page }) => {
    await mockCommon(page);
    await page.goto(`/admin/set-password#access_token=${syntheticToken}&refresh_token=synthetic-refresh-token&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=magiclink`);
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();

    await page.goto('/admin/login#type=invite&error=access_denied&error_code=otp_expired&error_description=Setup%20link%20expired');
    await expect(page).toHaveURL(/\/admin\/set-password#type=invite&error=access_denied&error_code=otp_expired/);
    await expect(page.getByText('missing, expired or already used', { exact: false })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request a fresh setup link' })).toBeVisible();
  });

  test('setup page keeps password save disabled when getUser rejects the session', async ({ page }) => {
    await mockCommon(page);
    await page.goto(`/admin/set-password#access_token=${syntheticToken}&refresh_token=synthetic-refresh-token&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=invite`);
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible();
    await page.unroute('**/auth/v1/user*');
    await page.route('**/auth/v1/user*', (route) => fulfillJson(route, {
      error: 'invalid_token',
      error_description: 'The setup session is no longer valid.',
    }, 401));
    await page.goto('/admin/set-password?type=invite');
    await expect(page.getByText('could not verify the account', { exact: false })).toBeVisible();
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Request a fresh setup link' })).toBeVisible();
  });

  test('password setup updates the provider and enters admin after campaign verification', async ({ page }) => {
    await mockCommon(page);
    await page.unroute('**/auth/v1/user*');
    await page.route('**/auth/v1/user*', async (route) => {
      if (route.request().method() === 'PUT') {
        await fulfillJson(route, { user: authSession('owner').user, session: authSession('owner') });
        return;
      }
      await fulfillJson(route, authSession('owner').user);
    });
    await page.goto(`/admin/set-password#access_token=${syntheticToken}&refresh_token=synthetic-refresh-token&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=magiclink`);
    await page.getByLabel('New password', { exact: true }).fill('synthetic-password-new');
    await page.getByLabel('Confirm new password').fill('synthetic-password-new');
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(page).toHaveURL(/\/admin(?:\/?$)/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  });

  test('login makes invited account recovery explicit', async ({ page }) => {
    await mockCommon(page);
    let redirectTo = '';
    await page.route('**/auth/v1/recover*', async (route) => {
      redirectTo = new URL(route.request().url()).searchParams.get('redirect_to') ?? '';
      await fulfillJson(route, {});
    });
    await page.goto('/admin/login');
    await page.getByRole('button', { name: 'Set up an invited account' }).click();
    await expect(page.getByRole('heading', { name: 'Set up an invited account' })).toBeVisible();
    await page.getByLabel('Email address').fill('moderator@synthetic.test');
    await page.getByRole('button', { name: 'Send password setup link' }).click();
    await expect(page.getByText('password setup link will arrive', { exact: false })).toBeVisible();
    expect(redirectTo).toBe('https://mothers-love.vercel.app/admin/set-password');
  });

  test('moderator sees permission limits for invitations, pairing and collection control', async ({ page }) => {
    await mockCommon(page, { role: 'moderator' });
    await signInAs(page, 'moderator');

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Settings and access' })).toBeVisible();
    await expect(page.getByText('Read only', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create one time pairing code' })).toHaveCount(0);
    await expect(page.getByLabel('Moderator email')).toHaveCount(0);

    await page.goto('/admin/display');
    const collectionToggle = page.getByRole('button', { name: 'Toggle collection availability' });
    await expect(collectionToggle).toBeDisabled();
    await expect(page.getByText('Owner required', { exact: true })).toBeVisible();
  });

  test('retention health turns attention when cleanup becomes stale while open', async ({ page }) => {
    const cleanupAt = new Date().toISOString();
    await mockCommon(page, { overviewBody: overview({ lastCleanupAt: cleanupAt, overduePurgeCount: 0 }) });
    await page.clock.install({ time: cleanupAt });
    await signInAs(page);
    await page.goto('/admin');
    await expect(page.getByText('Healthy', { exact: true })).toBeVisible();
    await page.clock.fastForward(121_000);
    await expect(page.getByText('Attention', { exact: true })).toBeVisible();
    await expect(page.getByText('Cleanup is stale. The latest run was more than 2 minutes ago.', { exact: true })).toBeVisible();
  });

  test('retention health stays healthy when a background refresh advances cleanup', async ({ page }) => {
    const cleanupAt = new Date().toISOString();
    const refreshedCleanupAt = new Date(Date.now() + 121_000).toISOString();
    let overviewRequests = 0;
    await mockCommon(page, { overviewBody: overview({ lastCleanupAt: cleanupAt, overduePurgeCount: 0 }) });
    await page.unroute('**/api/admin/overview');
    await page.route('**/api/admin/overview', (route) => {
      overviewRequests += 1;
      return fulfillJson(route, overview({ lastCleanupAt: overviewRequests === 1 ? cleanupAt : refreshedCleanupAt, overduePurgeCount: 0 }));
    });
    await page.clock.install({ time: cleanupAt });
    await signInAs(page);
    await page.goto('/admin');
    await expect(page.getByText('Healthy', { exact: true })).toBeVisible();
    await page.clock.fastForward(121_000);
    await expect.poll(() => overviewRequests).toBeGreaterThan(1);
    await expect(page.getByText('Healthy', { exact: true })).toBeVisible();
    await expect(page.getByText('Attention', { exact: true })).toHaveCount(0);
  });

  test('retention health explains when cleanup has never run', async ({ page }) => {
    await mockCommon(page, { overviewBody: overview({ lastCleanupAt: null, overduePurgeCount: 0 }) });
    await signInAs(page);
    await page.goto('/admin');
    await expect(page.getByText('Attention', { exact: true })).toBeVisible();
    await expect(page.getByText('Cleanup has not run yet. Retention health will show Attention until the first cleanup completes.', { exact: true })).toBeVisible();
  });

  test('editor reconciles a 409 with the latest server version before saving', async ({ page }) => {
    let patchAttempts = 0;
    let submittedReason = '';
    const latest = recognition({ version: 4, message: 'Latest server copy.' });
    await mockCommon(page);
    await page.route('**/api/admin/recognitions/synthetic-recognition', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, patchAttempts === 0 ? recognition() : latest);
        return;
      }
      patchAttempts += 1;
      const body = route.request().postDataJSON() as { reason?: string; fields?: { message?: string } };
      submittedReason = body.reason ?? '';
      if (patchAttempts === 1) {
        await fulfillJson(route, { error: 'Version conflict', code: 'VERSION_CONFLICT' }, 409);
        return;
      }
      await fulfillJson(route, { recognition: { ...latest, version: 5, message: body.fields?.message ?? latest.message } });
    });
    await signInAs(page);
    await page.goto('/admin/recognitions/synthetic-recognition');
    await page.locator('#detail-message').fill('Local edited copy.');
    await page.getByRole('button', { name: 'Save edit' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Why was this substantive edit made?')).toHaveValue('correction');
    await page.getByRole('dialog').getByRole('button', { name: 'Save edit' }).click();
    await expect(page.getByRole('heading', { name: 'Version conflict needs a decision' })).toBeVisible();
    await expect(page.getByText('Latest server copy.', { exact: true })).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Keep my draft and review' }).click();
    await page.getByRole('button', { name: 'Save edit' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save edit' }).click();
    await expect(page.getByText('Edit saved. The server returned the new version.', { exact: true })).toBeVisible();
    expect(patchAttempts).toBe(2);
    expect(submittedReason).toBe('correction');
  });

  test('editor clears personal fields when the recognition expires while open', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/admin/recognitions/synthetic-recognition', (route) => fulfillJson(route, recognition({ expiresAt: new Date(Date.now() + 400).toISOString() })));
    await signInAs(page);
    await page.goto('/admin/recognitions/synthetic-recognition');
    await expect(page.locator('#detail-message')).toHaveValue('Thank you for being there.');
    await expect(page.locator('#detail-submitted-name')).toHaveValue('Synthetic Sender');
    await expect(page.getByText('Personal recognition fields were cleared.', { exact: false })).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('#detail-message')).toHaveCount(0);
    await expect(page.locator('#detail-submitted-name')).toHaveCount(0);
    await expect(page.getByText('Mina K.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Synthetic Sender', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Personal recognition fields were cleared.', { exact: false })).toBeVisible();
  });

  test('already expired GET is cleared before private fields render', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/admin/recognitions/synthetic-recognition', (route) => fulfillJson(route, recognition({
      recipient: 'Expired Recipient',
      submittedName: 'Expired Sender',
      message: 'Expired private message.',
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    })));
    await signInAs(page);
    await page.goto('/admin/recognitions/synthetic-recognition');
    await expect(page.getByText('Personal recognition fields were cleared.', { exact: false })).toBeVisible();
    await expect(page.getByText('Expired Recipient', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Expired Sender', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Expired private message.', { exact: true })).toHaveCount(0);
  });

  test('expired conflict response clears the open editor before adoption', async ({ page }) => {
    let patchAttempts = 0;
    await mockCommon(page);
    await page.route('**/api/admin/recognitions/synthetic-recognition', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, recognition({
          recipient: 'Late Conflict Recipient',
          submittedName: 'Late Conflict Sender',
          message: 'Late conflict private message.',
          expiresAt: patchAttempts ? new Date(Date.now() - 1_000).toISOString() : new Date(Date.now() + 15_000).toISOString(),
        }));
        return;
      }
      patchAttempts += 1;
      await fulfillJson(route, { error: 'Version conflict', code: 'VERSION_CONFLICT' }, 409);
    });
    await signInAs(page);
    await page.goto('/admin/recognitions/synthetic-recognition');
    await page.locator('#detail-message').fill('Conflict draft.');
    await page.getByRole('button', { name: 'Save edit' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save edit' }).click();
    await expect(page.getByText('Personal recognition fields were cleared.', { exact: false })).toBeVisible();
    await expect(page.getByText('Late Conflict Recipient', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Late Conflict Sender', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Late conflict private message.', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Version conflict needs a decision' })).toHaveCount(0);
  });

  test('expired PATCH response clears the editor before private fields render', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/admin/recognitions/synthetic-recognition', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, recognition());
        return;
      }
      await fulfillJson(route, { recognition: recognition({
        recipient: 'Late Patch Recipient',
        submittedName: 'Late Patch Sender',
        message: 'Late patch private message.',
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
      }) });
    });
    await signInAs(page);
    await page.goto('/admin/recognitions/synthetic-recognition');
    await page.locator('#detail-message').fill('Patch draft.');
    await page.getByRole('button', { name: 'Save edit' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save edit' }).click();
    await expect(page.getByText('Personal recognition fields were cleared.', { exact: false })).toBeVisible();
    await expect(page.getByText('Late Patch Recipient', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Late Patch Sender', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Late patch private message.', { exact: true })).toHaveCount(0);
    await expect(page.locator('#detail-message')).toHaveCount(0);
  });

  test('display settings show saved, pending and browser applied acknowledgement', async ({ page }) => {
    let saved = false;
    await mockCommon(page, { overviewBody: overview({ settings: settings({ version: 5 }), devices: [device({ appliedVersion: 4, appliedSnapshotRevision: 4 })] }) });
    await page.unroute('**/api/admin/overview');
    await page.route('**/api/admin/overview', (route) => fulfillJson(route, overview({ settings: settings({ version: saved ? 6 : 5 }), devices: [device({ appliedVersion: saved ? 6 : 4, appliedSnapshotRevision: 4 })] })));
    await page.route('**/api/admin/settings', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON() as { expectedVersion: number; changes: Record<string, unknown> };
        expect(body.expectedVersion).toBe(5);
        expect(body.changes).toEqual({ pauseArrivals: true });
        saved = true;
        await fulfillJson(route, settings({ version: 6, pauseArrivals: true }));
        return;
      }
      await fulfillJson(route, settings());
    });
    await signInAs(page);
    await page.goto('/admin/display');
    await expect(page.getByText('Saved in server', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Toggle pause new arrivals' }).click();
    await page.getByRole('button', { name: 'Save display settings' }).click();
    await expect(page.getByText('Pending delivery', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh browser acknowledgement' }).click();
    await expect(page.getByText('Applied by browser', { exact: true })).toBeVisible();
    await expect(page.getByText('Applied settings version 6; applied snapshot revision 4.', { exact: true })).toBeVisible();
  });

  test('aggregate export downloads server CSV without personal fields', async ({ page }) => {
    let exportAuthorization = '';
    await mockCommon(page);
    await page.route('**/api/admin/reports?*', (route) => fulfillJson(route, overview().aggregate));
    await page.route('**/api/admin/reports/export?*', async (route) => {
      exportAuthorization = route.request().headers().authorization ?? '';
      await route.fulfill({ status: 200, contentType: 'text/csv', body: 'period_start,period_end,recognitions,expression_total\n2026-09-01,2026-09-30,4,4\n' });
    });
    await signInAs(page);
    await page.goto('/admin/insights');
    await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export aggregate CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('mothers-love-aggregate-month.csv');
    expect(exportAuthorization).toBe(`Bearer ${syntheticToken}`);
  });
});
