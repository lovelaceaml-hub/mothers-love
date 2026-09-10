import { expect, test, type Page, type Route } from '@playwright/test';
import { studioSnapshot, studioSettings } from '../interview/studio-fixtures';

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


test('usable Color Polish TV and Studio', async ({ page }) => {
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  const fixture = (() => {
const settings = {
  version: 7,
  mode: "normal",
  motion: "standard",
  pauseArrivals: false,
  pauseRotation: false,
  collectionOpen: true,
  lowActivityMinutes: 20,
  readingSeconds: 20,
  maxBubbles: 4,
  showTrails: true,
  showConstellations: true,
};

const currentCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const currentAggregate = {
  periodStart: "2026-09-06",
  periodEnd: "2026-09-10",
  recognitions: 4,
  expressionCounts: currentCounts,
  expressionTotal: 36,
  revision: 6,
};
const monthAggregate = {
  periodStart: "2026-09-01",
  periodEnd: "2026-09-10",
  recognitions: 6,
  expressionCounts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  expressionTotal: 45,
  revision: 9,
};
const calendarAggregate = {
  periodStart: "2026-09-10",
  periodEnd: "2026-09-10",
  recognitions: 2,
  expressionCounts: [0, 1, 1, 0, 0, 0, 0, 0, 0],
  expressionTotal: 2,
  revision: 8,
};
const presentation = {
  version: "color-polish-v6",
  enabled: false,
  playlist: [
    ["welcome", 30],
    ["garden", 180],
    ["featured", 30],
    ["calendar", 30],
    ["peacemakers", 60],
    ["status", 30],
    ["expressions", 30],
    ["peace-in-practice", 60],
    ["orbit", 30],
    ["milestone", 30],
  ].map(([id, durationSeconds]) => ({ id, enabled: true, durationSeconds })),
};

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    serverTime: "2026-09-10T18:00:00.000Z",
    revision: 12,
    recognitions: [],
    aggregate: monthAggregate,
    settings,
    submissionUrl: "https://mothers-love.vercel.app/recognize",
    cursor: "12.1789063200",
    sync: "reset",
    arrivals: [],
    presentation,
    insights: {
      calendar: [calendarAggregate],
      currentWeek: currentAggregate,
      previousWeek: {
        periodStart: "2026-08-30",
        periodEnd: "2026-09-05",
        recognitions: 3,
        expressionCounts: [2, 2, 2, 2, 2, 2, 2, 2, 2],
        expressionTotal: 18,
        revision: 5,
      },
      month: monthAggregate,
      campaign: {
        periodStart: "2026-08-30",
        periodEnd: "2026-09-10",
        recognitions: 9,
        expressionCounts: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        expressionTotal: 54,
        revision: 10,
      },
      goal: {
        weekStart: "2026-09-06",
        weekEnd: "2026-09-12",
        expressionId: 1,
        value: 0,
        target: 6,
        achieved: false,
      },
    },
    ...overrides,
  };
}


return snapshot({presentation:{...presentation,enabled:true},recognitions:[{id:'00000000-0000-4000-8000-000000000001',recipient:'Synthetic Friend',message:'Thank you for helping today.',expressionIds:[2],createdAt:'2026-09-10T17:00:00Z',firstPublishedAt:'2026-09-10T17:00:00Z',expiresAt:'2026-09-17T17:00:00Z',version:1,status:'published',featured:false}]});
})();
  let quiet = false;
  await page.route('**/api/display/color-polish**', route => fulfillJson(route, quiet ? {...fixture,settings:{...fixture.settings,mode:'quiet'},recognitions:[]} : fixture));
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  await expect(page.frameLocator('iframe').getByText('Synthetic Friend').first()).toBeVisible();
  quiet = true;
  await expect(page.locator('[data-display-phase="quiet"]')).toBeVisible({timeout:12000});
  await expect(page.locator('iframe')).toHaveCount(0);
  await mockCommon(page);
  await signInAs(page);
  await page.goto('/admin/display');
  await expect(page.getByTestId('color-polish-studio')).toBeVisible();
  const selector=page.getByLabel('Color Polish preview scene');
  await expect(selector.locator('option')).toHaveCount(10);
  await selector.selectOption('garden');
  await expect(page.frameLocator('iframe').first().getByText('Appreciation, all around us.')).toBeVisible();
  await page.getByTestId('color-polish-studio').getByRole('button',{name:'Replay',exact:true}).click();
  await expect(selector).toHaveValue('garden');
});
