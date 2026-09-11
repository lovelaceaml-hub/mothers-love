import { expect, type Frame, type Page, type Route } from '@playwright/test';

const syntheticToken = 'synthetic-access-token';

/**
 * Builds display settings fixture with optional overrides.
 * Called by scene and display specs.
 */
export const settings = (overrides: Record<string, unknown> = {}) => ({
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

/**
 * Builds admin overview fixture with optional overrides.
 * Called by scene and admin display specs.
 */
export const overview = (overrides: Record<string, unknown> = {}) => ({
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

/**
 * Builds synthetic recognition record with optional overrides.
 * Called by scene and display specs.
 */
export const recognition = (overrides: Record<string, unknown> = {}) => ({
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

/**
 * Fulfills a Playwright route with JSON payload and HTTP status code.
 * Called by scene and display specs.
 */
export const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

/**
 * Builds synthetic auth session object for given user role.
 * Called by scene and admin display specs.
 */
export const authSession = (role: 'owner' | 'moderator') => ({
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

export type CommonOptions = {
  role?: 'owner' | 'moderator';
  needsMfa?: boolean;
  overviewBody?: Record<string, unknown>;
};

/**
 * Mocks admin authentication and session endpoints for Color Polish tests.
 * Called by scene and admin display specs.
 */
export async function mockCommon(page: Page, options: CommonOptions = {}) {
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

/**
 * Signs in as an admin user (owner or moderator) on /admin/login.
 * Called by scene and admin display specs.
 */
export async function signInAs(page: Page, role: 'owner' | 'moderator' = 'owner') {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(`${role}@synthetic.test`);
  await page.getByLabel('Password').fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin(?:\/?$)/);
}

/**
 * Builds full active Color Polish display snapshot fixture with optional overrides.
 * Called by scene and display specs.
 */
export function buildActiveDisplayFixture(overrides: Record<string, unknown> = {}) {
  const settingsFixture = {
    version: 7,
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
  };

  const currentCounts = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const currentAggregate = {
    periodStart: '2026-09-06',
    periodEnd: '2026-09-10',
    recognitions: 4,
    expressionCounts: currentCounts,
    expressionTotal: 36,
    revision: 6,
  };
  const monthAggregate = {
    periodStart: '2026-09-01',
    periodEnd: '2026-09-10',
    recognitions: 6,
    expressionCounts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    expressionTotal: 45,
    revision: 9,
  };
  const calendarAggregate = {
    periodStart: '2026-09-10',
    periodEnd: '2026-09-10',
    recognitions: 2,
    expressionCounts: [0, 1, 1, 0, 0, 0, 0, 0, 0],
    expressionTotal: 2,
    revision: 8,
  };
  const presentation = {
    version: 'color-polish-v6',
    enabled: false,
    playlist: [
      ['welcome', 30],
      ['garden', 180],
      ['featured', 30],
      ['calendar', 30],
      ['peacemakers', 60],
      ['status', 30],
      ['expressions', 30],
      ['peace-in-practice', 60],
      ['orbit', 30],
      ['milestone', 30],
    ].map(([id, durationSeconds]) => ({ id, enabled: true, durationSeconds })),
  };

  function snapshot(snapshotOverrides: Record<string, unknown> = {}) {
    return {
      ok: true,
      serverTime: '2026-09-10T18:00:00.000Z',
      revision: 12,
      recognitions: [],
      aggregate: monthAggregate,
      settings: settingsFixture,
      submissionUrl: 'https://mothers-love.vercel.app/recognize',
      cursor: '12.1789063200',
      sync: 'reset',
      arrivals: [],
      presentation,
      insights: {
        calendar: [calendarAggregate],
        currentWeek: currentAggregate,
        previousWeek: {
          periodStart: '2026-08-30',
          periodEnd: '2026-09-05',
          recognitions: 3,
          expressionCounts: [2, 2, 2, 2, 2, 2, 2, 2, 2],
          expressionTotal: 18,
          revision: 5,
        },
        month: monthAggregate,
        campaign: {
          periodStart: '2026-08-30',
          periodEnd: '2026-09-10',
          recognitions: 9,
          expressionCounts: [2, 3, 4, 5, 6, 7, 8, 9, 10],
          expressionTotal: 54,
          revision: 10,
        },
        goal: {
          weekStart: '2026-09-06',
          weekEnd: '2026-09-12',
          expressionId: 1,
          value: 0,
          target: 6,
          achieved: false,
        },
      },
      ...snapshotOverrides,
    };
  }

  return snapshot({
    presentation: { ...presentation, enabled: true },
    recognitions: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        recipient: 'Synthetic Friend',
        message: 'Thank you for helping today.',
        expressionIds: [2],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
    ],
    ...overrides,
  });
}

export const SCENE_IDS = {
  welcome: 1,
  garden: 2,
  arrival: 3,
  featured: 4,
  calendar: 5,
  status: 6,
  expressions: 7,
  peacemakers: 8,
  'peace-in-practice': 9,
  orbit: 10,
  milestone: 11,
} as const;

export type SceneSlug = keyof typeof SCENE_IDS;

/**
 * Navigates to Studio, selects scene (or welcome for arrival), advances time, and pauses animations.
 * Called by all color polish scene specs.
 */
export async function openStudioScene(
  page: Page,
  slug: SceneSlug,
  ms = 14000,
): Promise<{ frame: Frame; page: Page }> {
  await page.route('**/api/**', (route) => fulfillJson(route, { items: [] }));
  const fixture = buildActiveDisplayFixture();
  await page.route('**/api/display/color-polish**', (route) => fulfillJson(route, fixture));
  await mockCommon(page);
  await signInAs(page);
  await page.goto('/admin/display');
  await expect(page.getByTestId('color-polish-studio')).toBeVisible();

  // The select option values match the scene slugs. Arrival has no dropdown option, so select welcome instead.
  const selector = page.getByLabel('Color Polish preview scene');
  const optionValue = slug === 'arrival' ? 'welcome' : slug;
  await selector.selectOption(optionValue);

  await expect.poll(() => page.frames().some((f) => f.url().endsWith('/color-polish/renderer.html'))).toBe(true);
  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('color-polish renderer frame not found on /admin/display');

  const expectedSceneId = slug === 'arrival' ? SCENE_IDS.welcome : SCENE_IDS[slug];
  await frame.waitForFunction(
    ({ expected, directId }) => {
      const runtime = (window as any).colorPolishRuntime;
      const state = runtime?.getState();
      return state?.mode === 'normal' && (state?.scene === expected || state?.scene === directId);
    },
    { expected: expectedSceneId, directId: SCENE_IDS[slug] },
  );

  await frame.evaluate((checkpointMs) => {
    (window as any).colorPolishRuntime.step(checkpointMs);
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = checkpointMs;
    });
  }, ms);

  return { frame, page };
}

export type CircularityFailure = {
  selector: string;
  width: number;
  height: number;
  radius: string;
};

export type CircularityResult = {
  count: number;
  hidden: number;
  failures: CircularityFailure[];
};

/**
 * Evaluates width/height equality and border-radius 50% for orbs in frame.
 * Called by all color polish scene specs.
 */
export async function circularity(frame: Frame): Promise<CircularityResult> {
  return await frame.evaluate(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.orb-slot, .orb, .event-orb'));
    let count = 0;
    let hidden = 0;
    const failures: Array<{ selector: string; width: number; height: number; radius: string }> = [];

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) {
        hidden++;
        continue;
      }

      count++;
      const widthHeightOk = Math.abs(width - height) <= 1;

      const style = window.getComputedStyle(el);
      let radius = style.borderRadius;
      if ((!radius || radius === '0px') && el.matches('.orb-slot, .event-orb')) {
        const beforeRadius = window.getComputedStyle(el, '::before').borderRadius;
        const inner = el.querySelector<HTMLElement>('.orb, .orb-life, .orb-breath');
        const innerRadius = inner ? window.getComputedStyle(inner).borderRadius : '';
        if (beforeRadius && beforeRadius !== '0px') {
          radius = beforeRadius;
        } else if (innerRadius && innerRadius !== '0px') {
          radius = innerRadius;
        }
      }

      const halfWidth = width / 2;
      const isPercent = radius.includes('50%');
      const numericParts = radius
        .split(/\s+/)
        .map((p) => parseFloat(p))
        .filter((p) => !isNaN(p));
      const isNumericHalf = numericParts.length > 0 && numericParts.every((p) => Math.abs(p - halfWidth) <= 1);
      const topLeft = parseFloat(style.borderTopLeftRadius);
      const isTopLeftHalf = !isNaN(topLeft) && Math.abs(topLeft - halfWidth) <= 1;

      const radiusOk = isPercent || isNumericHalf || isTopLeftHalf;

      if (!widthHeightOk || !radiusOk) {
        const selector = el.id
          ? '#' + el.id
          : el.className
          ? '.' + el.className.trim().split(/\s+/).join('.')
          : el.tagName.toLowerCase();
        failures.push({
          selector,
          width,
          height,
          radius,
        });
      }
    }

    return { count, hidden, failures };
  });
}

/**
 * Measures scroll and client dimensions of the active scene element.
 * Called by all color polish scene specs.
 */
export async function noOverflow(frame: Frame): Promise<{
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}> {
  return await frame.evaluate(() => {
    const scenes = document.querySelectorAll('#stage .scene');
    const el = scenes[scenes.length - 1] as HTMLElement | undefined;
    if (!el) {
      return { scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0 };
    }
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    };
  });
}

/**
 * Verifies clicking Studio iframe body does not advance the current scene.
 * Called by all color polish scene specs.
 */
export async function studioClickDoesNotAdvance(
  page: Page,
  frame: Frame,
): Promise<{ before: number; after: number }> {
  const before = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  await frame.locator('body').click();
  await page.waitForTimeout(300);
  const after = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().scene);
  return { before, after };
}

/**
 * Loads Studio scene with reduced motion media query enabled to verify still mode.
 * Called by all color polish scene specs.
 */
export async function reducedMotionScene(
  page: Page,
  slug: SceneSlug,
  ms = 14000,
): Promise<{ frame: Frame; still: boolean }> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { frame } = await openStudioScene(page, slug, ms);
  const still = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().still === true);
  return { frame, still };
}
