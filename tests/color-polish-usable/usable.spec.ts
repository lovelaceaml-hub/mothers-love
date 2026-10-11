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


function buildActiveDisplayFixture() {
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
}

test('usable Color Polish TV and Studio', async ({ page }) => {
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  const fixture = buildActiveDisplayFixture();
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
  // Ten original screens plus Live Recognitions (Plan 17 Lane 13).
  await expect(selector.locator('option')).toHaveCount(11);
  await expect(selector.locator('option').last()).toHaveText('Live Recognitions');
  await selector.selectOption('garden');
  await expect(page.frameLocator('iframe').first().getByText('Appreciation, all around us.')).toBeVisible();
  await page.getByTestId('color-polish-studio').getByRole('button',{name:'Replay',exact:true}).click();
  await expect(selector).toHaveValue('garden');
});

test('click or tap on the display advances to the next scene', async ({ page }) => {
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  const fixture = buildActiveDisplayFixture();
  await page.route('**/api/display/color-polish**', route => fulfillJson(route, fixture));
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();

  await expect.poll(() => page.frames().some(f => f.url().endsWith('/color-polish/renderer.html'))).toBe(true);
  const tvFrame = page.frames().find(f => f.url().endsWith('/color-polish/renderer.html'));
  if (!tvFrame) throw new Error('color-polish renderer frame not found on /display');
  await tvFrame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().mode === 'normal');

  // The mocked snapshot saves ten entries; the app appends Live Recognitions (12) last.
  const playlistOrder = [1, 2, 4, 5, 8, 6, 7, 9, 10, 11, 12];
  const currentScene = await tvFrame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  const expectedNextScene = playlistOrder[(playlistOrder.indexOf(currentScene) + 1) % playlistOrder.length];

  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.click(viewport.width / 2, viewport.height / 2);

  await tvFrame.waitForFunction(
    (expected) => (window as any).colorPolishRuntime.getState().scene === expected,
    expectedNextScene,
    { timeout: 3000 },
  );

  await mockCommon(page);
  await signInAs(page);
  await page.goto('/admin/display');
  await expect(page.getByTestId('color-polish-studio')).toBeVisible();
  const selector = page.getByLabel('Color Polish preview scene');
  await expect(selector).toHaveValue('welcome');

  await expect.poll(() => page.frames().some(f => f.url().endsWith('/color-polish/renderer.html'))).toBe(true);
  const studioFrame = page.frames().find(f => f.url().endsWith('/color-polish/renderer.html'));
  if (!studioFrame) throw new Error('color-polish renderer frame not found on /admin/display');
  await studioFrame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().mode === 'normal');
  const studioSceneBefore = await studioFrame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);

  await page.frameLocator('iframe').first().locator('body').click();
  await page.waitForTimeout(300);

  const studioSceneAfter = await studioFrame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  expect(studioSceneAfter).toBe(studioSceneBefore);
  await expect(selector).toHaveValue('welcome');
});

test('display falls back to the legacy renderer when color-polish stays unavailable', async ({ page }) => {
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  await page.route('**/api/display/color-polish**', route => fulfillJson(route, { error: 'unavailable' }, 503));
  await page.goto('/display');
  await expect(page.locator('[data-testid="color-polish-display"]')).toBeVisible({ timeout: 12000 });
  await expect(page.locator('[data-testid="color-polish-safe-state"]')).toHaveCount(0);
  await expect(page.getByText('temporarily unavailable')).toHaveCount(0);
});

test('visible TV polls stop in a hidden tab and refresh immediately when shown again', async ({ page }) => {
  test.setTimeout(45_000);
  const fixture = buildActiveDisplayFixture();
  let snapshotRequests = 0;
  let likesTotalRequests = 0;
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  await page.route('**/api/display/color-polish**', route => {
    snapshotRequests += 1;
    return fulfillJson(route, fixture);
  });
  await page.route('**/api/display/likes-total', route => {
    likesTotalRequests += 1;
    return fulfillJson(route, { total: 18 });
  });

  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  await expect.poll(() => likesTotalRequests).toBeGreaterThan(0);
  const beforeHidden = { snapshot: snapshotRequests, likes: likesTotalRequests };

  await page.evaluate(() => {
    const visibility = { hidden: true };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => visibility.hidden });
    (window as typeof window & { setTestVisibility: (hidden: boolean) => void }).setTestVisibility = (hidden) => {
      visibility.hidden = hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    (window as typeof window & { setTestVisibility: (hidden: boolean) => void }).setTestVisibility(true);
  });

  // A visible screen would make two more snapshot reads and one more likes read
  // over this interval. A hidden screen must issue none.
  await page.waitForTimeout(11_000);
  expect(snapshotRequests).toBe(beforeHidden.snapshot);
  expect(likesTotalRequests).toBe(beforeHidden.likes);

  await page.evaluate(() => {
    (window as typeof window & { setTestVisibility: (hidden: boolean) => void }).setTestVisibility(false);
  });
  await expect.poll(() => snapshotRequests, { timeout: 2_000 }).toBe(beforeHidden.snapshot + 1);
  await expect.poll(() => likesTotalRequests, { timeout: 2_000 }).toBe(beforeHidden.likes + 1);
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
});

async function findRendererFrame(page: Page) {
  await expect.poll(() => page.frames().some(f => f.url().endsWith('/color-polish/renderer.html'))).toBe(true);
  const frame = page.frames().find(f => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('color-polish renderer frame not found');
  await frame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().mode === 'normal');
  return frame;
}

test('scene countdown ring counts down and resets on manual advance', async ({ page }) => {
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  const fixture = buildActiveDisplayFixture();
  await page.route('**/api/display/color-polish**', route => fulfillJson(route, fixture));
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();

  const tvFrame = await findRendererFrame(page);
  const countdown = tvFrame.locator('#scene-countdown');
  await expect(countdown).toBeVisible();

  const readCountdown = async () => {
    const state = await tvFrame.evaluate(() => (window as any).colorPolishRuntime.getState());
    const number = await tvFrame.locator('#scene-countdown-number').textContent();
    return { scene: state.scene as number, dwell: state.visual.dwell[state.scene] as number, number: Number(number) };
  };

  const before = await readCountdown();
  expect(Number.isFinite(before.number)).toBe(true);
  expect(before.number).toBeLessThanOrEqual(before.dwell);
  expect(before.number).toBeGreaterThanOrEqual(0);

  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  await tvFrame.waitForFunction(
    (previousScene) => (window as any).colorPolishRuntime.getState().scene !== previousScene,
    before.scene,
    { timeout: 3000 },
  );

  const after = await readCountdown();
  expect(after.scene).not.toBe(before.scene);
  expect(after.number).toBe(after.dwell);
});

test('stays visually stable through brief connecting glitches', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  const fixture = buildActiveDisplayFixture();
  let requestCount = 0;
  // Glitches only start once the display is confirmed active below. React's
  // development strict mode mounts this effect twice (mount, cleanup, mount
  // again) before the app settles, so an unconditional count from the very
  // first request would race that harmless double-mount and could land the
  // deliberately slow response on the request that decides initial activation
  // instead of on a later poll, which is what this test means to exercise.
  let glitchesEnabled = false;
  await page.route('**/api/display/color-polish**', async (route) => {
    if (!glitchesEnabled) {
      await fulfillJson(route, fixture);
      return;
    }
    requestCount += 1;
    const count = requestCount;
    // Every third poll fails outright, and one healthy poll answers slowly
    // (well past the old 5 s timeout, comfortably inside the new one).
    if (count % 3 === 0) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
      return;
    }
    if (count === 2) await new Promise((resolve) => setTimeout(resolve, 7_000));
    await fulfillJson(route, fixture);
  });
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();
  glitchesEnabled = true;

  await page.evaluate(() => {
    const target = document.querySelector('[data-testid="color-polish-display"] iframe');
    if (target instanceof HTMLElement) target.dataset.stableMountStamp = 'stable-mount';
    const history: string[] = [];
    (window as any).__phaseHistory = history;
    const record = (el: Element | null) => {
      const phase = el?.getAttribute('data-display-phase');
      if (phase) history.push(phase);
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          record(mutation.target as Element);
        } else {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            record(node);
            node.querySelectorAll('[data-display-phase]').forEach((nested) => record(nested));
          });
        }
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-display-phase'], childList: true });
  });

  // Cover several poll cycles: the slow-but-healthy read and at least one 503.
  await page.waitForTimeout(22_000);

  const phaseHistory = await page.evaluate(() => (window as any).__phaseHistory as string[]);
  expect(phaseHistory.filter((phase) => phase === 'unavailable' || phase === 'checking')).toEqual([]);
  await expect(page.getByText('temporarily unavailable')).toHaveCount(0);
  await expect(page.getByText('The display is connecting.')).toHaveCount(0);
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();

  const mountStable = await page.evaluate(() =>
    document.querySelector('[data-testid="color-polish-display"] iframe') instanceof HTMLElement &&
    (document.querySelector('[data-testid="color-polish-display"] iframe') as HTMLElement).dataset.stableMountStamp === 'stable-mount');
  expect(mountStable).toBe(true);

  const tvFrame = await findRendererFrame(page);
  const scene = await tvFrame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  expect(typeof scene).toBe('number');
});

test('falls back after the color-polish API stays down for more than 60 seconds', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/api/**', route => fulfillJson(route, { items: [] }));
  const fixture = buildActiveDisplayFixture();
  let outage = false;
  await page.route('**/api/display/color-polish**', route => {
    if (outage) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
    return fulfillJson(route, fixture);
  });
  await page.goto('/display');
  await expect(page.locator('[data-display-phase="active"]')).toBeVisible();

  outage = true;
  // The 60 s stale rule only fires once no poll has verified in that long;
  // wait comfortably past it for the existing fallback behavior to run.
  await expect(page.locator('[data-testid="color-polish-display"][data-display-phase="unavailable"]')).toBeVisible({ timeout: 75_000 });
  await expect(page.locator('[data-testid="color-polish-safe-state"]')).toHaveCount(0);
  await expect(page.getByText('temporarily unavailable')).toHaveCount(0);
});
