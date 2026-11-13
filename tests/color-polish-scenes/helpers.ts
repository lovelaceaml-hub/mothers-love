import { expect, type Frame, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const publicFolder = resolve(process.cwd(), 'public');
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

// Selecting a Studio scene replaces its preview iframe. Wait on the current
// frame, rather than holding the outgoing frame during that replacement.
export async function readyStudioFrame(page: Page, expectedSceneId: number, acceptedSceneId?: number): Promise<Frame> {
  let ready: Frame | undefined;
  await expect.poll(async () => {
    const frame = page.frames().find((item) => item.url().endsWith('/color-polish/renderer.html'));
    if (!frame) return false;
    try {
      const matches = await frame.evaluate((acceptedScenes) => {
        const runtime = (window as any).colorPolishRuntime;
        const state = runtime?.getState();
        return state?.mode === 'normal' && acceptedScenes.includes(state?.scene);
      }, acceptedSceneId === undefined ? [expectedSceneId] : [expectedSceneId, acceptedSceneId]);
      if (matches && !frame.isDetached()) ready = frame;
      return Boolean(ready);
    } catch (error) {
      if (frame.isDetached()) return false;
      throw error;
    }
    // A fresh Studio preview can take longer than the default 5 s to come up
    // on a busy machine.
  }, { timeout: 15000 }).toBe(true);
  return ready!;
}

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

  const expectedSceneId = slug === 'arrival' ? SCENE_IDS.welcome : SCENE_IDS[slug];
  const directSceneId = SCENE_IDS[slug];
  const frame = await readyStudioFrame(
    page,
    expectedSceneId,
    directSceneId === expectedSceneId ? undefined : directSceneId,
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

export const CIRCULARITY_EXEMPT: Partial<Record<SceneSlug, string[]>> = {
  peacemakers: ['.puzzle-card'],
  'peace-in-practice': ['.heart-card'],
};

/**
 * Evaluates width/height equality and border-radius 50% for orbs in frame.
 * Exempt selectors for the current scene are skipped.
 * Called by all color polish scene specs.
 */
export async function circularity(frame: Frame): Promise<CircularityResult> {
  return await frame.evaluate(
    ({ exemptMap, sceneIds }) => {
      const runtime = (window as any).colorPolishRuntime;
      const sceneId = runtime?.getState()?.scene;
      let currentSlug: string | null = null;
      for (const [slug, id] of Object.entries(sceneIds)) {
        if (id === sceneId) {
          currentSlug = slug;
          break;
        }
      }
      const exemptSelectors: string[] = (currentSlug && (exemptMap as any)[currentSlug]) || [];

      const elements = Array.from(document.querySelectorAll<HTMLElement>('.orb-slot, .orb, .event-orb'));
      let count = 0;
      let hidden = 0;
      const failures: Array<{ selector: string; width: number; height: number; radius: string }> = [];

      for (const el of elements) {
        if (exemptSelectors.some((sel) => el.matches(sel))) {
          continue;
        }

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
    },
    { exemptMap: CIRCULARITY_EXEMPT, sceneIds: SCENE_IDS },
  );
}

/**
 * Asserts card shape rules for non-circular card elements.
 * Called by peacemakers and peace-in-practice specs.
 */
export async function cardShape(
  frame: Frame,
  selector: string,
  kind: 'puzzle' | 'heart',
): Promise<CircularityResult> {
  return await frame.evaluate(
    ({ sel, cardKind }) => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(sel));
      let count = 0;
      let hidden = 0;
      const failures: Array<{ selector: string; width: number; height: number; radius: string }> = [];

      for (const el of elements) {
        count++;
        const rect = el.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const style = window.getComputedStyle(el);
        const radius = style.borderRadius || '';

        const selectorStr = el.id
          ? '#' + el.id
          : el.className
          ? '.' + el.className.trim().split(/\s+/).join('.')
          : el.tagName.toLowerCase();

        if (width === 0 || height === 0) {
          failures.push({ selector: selectorStr, width, height, radius });
          continue;
        }

        if (radius.includes('50%')) {
          failures.push({ selector: selectorStr, width, height, radius });
          continue;
        }

        const sceneRoot = el.closest<HTMLElement>('.scene') || document.querySelector<HTMLElement>('#stage .scene');
        if (sceneRoot) {
          const rootRect = sceneRoot.getBoundingClientRect();
          const inside =
            rect.left >= rootRect.left - 1 &&
            rect.right <= rootRect.right + 1 &&
            rect.top >= rootRect.top - 1 &&
            rect.bottom <= rootRect.bottom + 1;
          if (!inside) {
            failures.push({ selector: selectorStr, width, height, radius });
            continue;
          }
        }

        const ratio = width / height;
        const ratioOk = cardKind === 'heart' ? ratio >= 0.8 && ratio <= 1.25 : ratio >= 0.7 && ratio <= 1.4;

        if (!ratioOk) {
          failures.push({ selector: selectorStr, width, height, radius });
        }
      }

      return { count, hidden, failures };
    },
    { sel: selector, cardKind: kind },
  );
}

/**
 * Makes WebGL 2 unavailable in every frame of the page, the way an old TV
 * browser or a display without graphics acceleration reports it, so a scene
 * shows what it falls back to. Call before loadRenderer.
 * Called by the Peace in Practice specs.
 */
export async function withoutWebGL2(page: Page) {
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function (kind: string, ...rest: unknown[]) {
      return kind === 'webgl2' ? null : (real as any).call(this, kind, ...rest);
    };
  });
}

/**
 * Direct-renderer harness for color-polish tests.
 * Called by scene specs to test the renderer directly through /probe.
 */
export async function loadRenderer(
  page: Page,
  options?: { ms?: number; scene?: number; fixture?: Record<string, unknown>; control?: Record<string, unknown> },
): Promise<Frame> {
  await page.addInitScript(() => {
    let seed = 7301;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    window.requestAnimationFrame = () => 0;
  });

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/probe') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<html><body style="margin:0"><iframe title="Probe" sandbox="allow-scripts" referrerpolicy="no-referrer" src="/color-polish/renderer.html" style="width:100vw;height:100vh;border:0"></iframe></body></html>',
      });
    }
    if (!url.pathname.startsWith('/color-polish/') || url.pathname.includes('..')) {
      return route.abort();
    }
    const file = resolve(publicFolder, '.' + url.pathname);
    const type = file.endsWith('.js')
      ? 'text/javascript'
      : file.endsWith('.css')
      ? 'text/css'
      : file.endsWith('.html')
      ? 'text/html'
      : file.endsWith('.svg')
      ? 'image/svg+xml'
      : 'image/png';
    try {
      const body = await readFile(file);
      await route.fulfill({ contentType: type, body });
    } catch {
      await route.abort();
    }
  });

  await page.goto('/probe');
  const snapshot = (options?.fixture ?? buildActiveDisplayFixture()) as any;
  const dummyQr =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const reactionCounts: Record<string, number> = snapshot.recognitions?.[0]?.id
    ? { [snapshot.recognitions[0].id]: 0 }
    : {};

  await page.evaluate(
    async ({ snapshot, qr, reactionCounts, extraControl }) => {
      const frame = document.querySelector('iframe');
      if (!frame || !frame.contentWindow) throw new Error('iframe not found');
      const channel = new MessageChannel();
      const nonce = crypto.randomUUID();
      await new Promise<void>((resolve) => {
        channel.port1.onmessage = (event) => {
          if (event.data.type === 'color-polish:ready') resolve();
        };
        channel.port1.start();
        frame.contentWindow!.postMessage(
          { version: 'color-polish-v6', type: 'color-polish:bootstrap', nonce, sequence: 0 },
          '*',
          [channel.port2],
        );
      });
      (window as any).probePort = channel.port1;
      (window as any).probeNonce = nonce;
      channel.port1.postMessage({
        version: 'color-polish-v6',
        type: 'color-polish:update',
        nonce,
        sequence: 1,
        snapshot,
        control: {
          nowMs: Date.parse(snapshot.serverTime),
          status: 'ready',
          source: 'sample',
          playing: true,
          scene: 'welcome',
          reactionCounts,
          qrDataUrl: qr,
          submissionUrl: snapshot.submissionUrl,
          ...extraControl,
        },
      });
    },
    { snapshot, qr: dummyQr, reactionCounts, extraControl: options?.control ?? {} },
  );

  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('color-polish renderer frame not found');

  await frame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().mode === 'normal');

  if (options?.scene !== undefined) {
    await frame.evaluate((s) => (window as any).colorPolishRuntime.setScene(s), options.scene);
    await frame.waitForFunction((s) => (window as any).colorPolishRuntime?.getState().scene === s, options.scene);
    // Scene checkpoints measure time in the requested scene, after its entrance.
    await frame.evaluate(() => {
      const runtime = (window as any).colorPolishRuntime;
      const transition = runtime.getState().transition;
      if (transition) runtime.step((transition.duration - transition.age) * 1000 + 40);
    });
  }

  if (options?.ms && options.ms > 0) {
    await frame.evaluate((checkpointMs) => {
      (window as any).colorPolishRuntime.step(checkpointMs);
      document.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = checkpointMs;
      });
    }, options.ms);
  }

  return frame;
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
