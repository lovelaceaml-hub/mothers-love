import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, rename, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { FEED_ITEMS, REACTION_COUNTS, buildDisplayFixture, RECEIPT } from './fixtures.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CLIPS_DIR = resolve(ROOT, 'docs/private/video/clips');
const TMP_DIR = resolve(CLIPS_DIR, 'tmp');
const SHEETS_DIR = resolve(CLIPS_DIR, 'sheets');

function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function smoothScroll(page, px, ms) {
  const steps = 60;
  const delta = px / steps;
  const stepMs = ms / steps;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'instant' }), delta);
    await pause(stepMs);
  }
}

async function isServerRunning(url) {
  try {
    const res = await fetch(url);
    return res.status === 200;
  } catch {
    return false;
  }
}

function getContextOptions(variant, tmpDir) {
  if (variant === '16x9') {
    return {
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
      colorScheme: 'light',
      recordVideo: {
        dir: tmpDir,
        size: { width: 1920, height: 1080 },
      },
    };
  }
  return {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
    colorScheme: 'light',
    recordVideo: {
      dir: tmpDir,
      size: { width: 1080, height: 1920 },
    },
  };
}

async function setupRoutes(context) {
  await context.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'video fixture', code: 'unavailable' }),
    });
  });

  await context.route('**/api/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ collectionOpen: true, configured: true }),
    });
  });

  await context.route('**/api/feed**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'cache-control': 'no-store' },
      contentType: 'application/json',
      body: JSON.stringify({ serverTime: new Date().toISOString(), items: FEED_ITEMS }),
    });
  });

  await context.route('**/api/reactions**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const url = new URL(route.request().url());
      const ids = url.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
      await route.fulfill({
        status: 200,
        headers: { 'cache-control': 'no-store' },
        contentType: 'application/json',
        body: JSON.stringify({
          items: ids.map((id) => ({
            id,
            count: REACTION_COUNTS[id] ?? 3,
            liked: false,
          })),
        }),
      });
      return;
    }

    const url = new URL(route.request().url());
    const pathParts = url.pathname.split('/');
    const id = decodeURIComponent(pathParts[pathParts.length - 1]);
    const currentCount = REACTION_COUNTS[id] ?? 3;
    await route.fulfill({
      status: 200,
      headers: { 'cache-control': 'no-store' },
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        id,
        count: currentCount + 1,
        liked: true,
      }),
    });
  });

  await context.route('**/api/recognitions', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(RECEIPT),
    });
  });

  await context.route('**/api/display/color-polish**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'cache-control': 'no-store' },
      contentType: 'application/json',
      body: JSON.stringify(buildDisplayFixture()),
    });
  });
}

async function recordClip(beat, variant, browser) {
  const context = await browser.newContext(getContextOptions(variant, TMP_DIR));
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none!important}';
    document.documentElement.appendChild(style);
  });
  await setupRoutes(context);
  const page = await context.newPage();
  const t0 = Date.now();

  let inSeconds = 0;
  let inPointMs = Date.now();

  if (beat.slug === 'why') {
    await page.goto('/expressions');
    await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
    await pause(1500);
    inSeconds = (Date.now() - t0) / 1000;
    inPointMs = Date.now();
    await smoothScroll(page, 480, 5000);
    await pause(3000);
  } else if (beat.slug === 'nine-words') {
    await page.goto('/expressions');
    await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
    await pause(1000);
    inSeconds = (Date.now() - t0) / 1000;
    inPointMs = Date.now();
    const scrollDistance = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const ninth = articles[8];
      if (!ninth) return 2000;
      const rect = ninth.getBoundingClientRect();
      return Math.max(0, rect.bottom - window.innerHeight + 30);
    });
    await smoothScroll(page, scrollDistance, beat.targetSeconds * 1000);
    await pause(2500);
  } else if (beat.slug === 'feed') {
    await page.goto('/');
    await page.getByRole('article').first().waitFor({ state: 'visible' });
    await pause(2000);
    inSeconds = (Date.now() - t0) / 1000;
    inPointMs = Date.now();
    await smoothScroll(page, 260, 3000);
    const likeBtn = page.getByRole('button', { name: 'Like recognition for David K.' });
    await likeBtn.scrollIntoViewIfNeeded();
    await pause(600);
    await likeBtn.click();
    await pause(4000);
  } else if (beat.slug === 'share') {
    await page.goto('/recognize');
    await page.getByRole('heading', { name: "THE WORDS OF MOTHER'S LOVE" }).waitFor({ state: 'visible' });
    await pause(1000);
    inSeconds = (Date.now() - t0) / 1000;
    inPointMs = Date.now();

    const yourNameInput = page.getByLabel('Your name');
    await yourNameInput.pressSequentially('Hannah P.', { delay: 55 });
    await pause(500);

    const recipientInput = page.getByLabel('Who would you like to recognize?');
    await recipientInput.pressSequentially(beat.share.recipient, { delay: 55 });
    await pause(700);

    for (const expId of beat.share.expressionIds) {
      const paddedId = String(expId).padStart(2, '0');
      const expBtn = page.getByRole('button', { name: new RegExp(`^Select expression ${paddedId}:`) });
      await expBtn.scrollIntoViewIfNeeded();
      await pause(400);
      await expBtn.click();
      await pause(900);
    }

    const messageInput = page.getByLabel('Share your appreciation');
    await messageInput.pressSequentially(beat.share.message, { delay: 40 });
    await pause(900);

    const sendBtn = page.getByRole('button', { name: 'Send recognition' });
    await sendBtn.scrollIntoViewIfNeeded();
    await sendBtn.click();

    await page.getByTestId('submission-receipt').waitFor({ state: 'visible' });
    await pause(3500);
  } else if (beat.slug === 'tv') {
    await page.goto('/display');
    await page.locator('[data-display-phase="active"]').waitFor({ state: 'visible' });

    let tvFrame = null;
    const pollStart = Date.now();
    while (Date.now() - pollStart < 15000) {
      tvFrame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
      if (tvFrame) break;
      await pause(200);
    }
    if (!tvFrame) throw new Error('Color polish renderer frame not found on /display');

    await tvFrame.waitForFunction(() => window.colorPolishRuntime?.getState().mode === 'normal');

    let attempts = 0;
    while ((await tvFrame.evaluate(() => window.colorPolishRuntime.getState().scene)) !== 2 && attempts < 10) {
      await page.mouse.click(960, 540);
      await pause(900);
      attempts++;
    }

    await pause(2500);
    inSeconds = (Date.now() - t0) / 1000;
    inPointMs = Date.now();

    await pause(7000);
    await page.mouse.click(960, 540);
    await tvFrame.waitForFunction(() => window.colorPolishRuntime.getState().scene !== 2, undefined, { timeout: 3000 });
    await pause(3500);
  }

  const elapsedAfterIn = (Date.now() - inPointMs) / 1000;
  const targetAfterIn = beat.targetSeconds + 2.6;
  if (elapsedAfterIn < targetAfterIn) {
    await pause((targetAfterIn - elapsedAfterIn) * 1000);
  }

  const video = page.video();
  await context.close();
  const tempPath = await video.path();

  const targetFile = resolve(CLIPS_DIR, `${beat.n}-${beat.slug}-${variant}.webm`);
  await rename(tempPath, targetFile);

  const probeRaw = execFileSync('/opt/homebrew/bin/ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height:format=duration',
    '-of', 'json',
    targetFile,
  ], { encoding: 'utf8' });
  const probe = JSON.parse(probeRaw);
  const width = probe.streams[0].width;
  const height = probe.streams[0].height;
  const durationSeconds = parseFloat(probe.format.duration);

  const sheetFile = resolve(SHEETS_DIR, `${beat.n}-${beat.slug}-${variant}.png`);
  execFileSync('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-v', 'error',
    '-i', targetFile,
    '-vf', `fps=6/${durationSeconds},scale=320:-1,tile=6x1`,
    '-frames:v', '1',
    sheetFile,
  ]);

  return {
    n: beat.n,
    slug: beat.slug,
    variant,
    file: targetFile,
    width,
    height,
    durationSeconds,
    inSeconds,
    targetSeconds: beat.targetSeconds,
    portrait: beat.portrait,
  };
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(SHEETS_DIR, { recursive: true });

  const narrationPath = resolve(ROOT, 'docs/video/narration.json');
  const narration = JSON.parse(await readFile(narrationPath, 'utf8'));

  let devChild = null;
  let desktopBrowser = null;
  let phoneBrowser = null;
  let cleanupPromise = null;

  async function cleanup() {
    if (cleanupPromise) return cleanupPromise;
    cleanupPromise = (async () => {
      if (desktopBrowser) {
        await desktopBrowser.close().catch(() => {});
        desktopBrowser = null;
      }
      if (phoneBrowser) {
        await phoneBrowser.close().catch(() => {});
        phoneBrowser = null;
      }
      if (devChild) {
        try {
          process.kill(-devChild.pid, 'SIGTERM');
        } catch {}
        await pause(2000);
        if (await isServerRunning('http://127.0.0.1:3100/')) {
          try {
            process.kill(-devChild.pid, 'SIGKILL');
          } catch {}
        }
        devChild = null;
      }
    })();
    return cleanupPromise;
  }

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(130);
  });

  try {
    const serverReady = await isServerRunning('http://127.0.0.1:3100/');
    if (!serverReady) {
      console.log('Starting dev server on port 3100...');
      devChild = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', '3100'], {
        cwd: ROOT,
        env: { ...process.env, npm_config_cache: '/tmp/npm-cache' },
        stdio: 'inherit',
        detached: true,
      });

      const startTime = Date.now();
      let online = false;
      while (Date.now() - startTime < 120_000) {
        if (await isServerRunning('http://127.0.0.1:3100/')) {
          online = true;
          break;
        }
        await pause(1000);
      }

      if (!online) {
        throw new Error('Dev server failed to start within 120s on http://127.0.0.1:3100/');
      }
      console.log('Dev server is up.');
    }

    const clips = [];
    desktopBrowser = await chromium.launch();
    phoneBrowser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });

    const routeBeats = narration.beats.filter((b) => b.clip === 'route');

    for (const beat of routeBeats) {
      const variants = beat.portrait === 'phone' ? ['16x9', '9x16'] : ['16x9'];
      for (const variant of variants) {
        console.log(`Recording beat ${beat.n} (${beat.slug}) [${variant}]...`);
        const browser = variant === '16x9' ? desktopBrowser : phoneBrowser;
        const clip = await recordClip(beat, variant, browser);
        clips.push(clip);
      }
    }

    const clipsJsonPath = resolve(CLIPS_DIR, 'clips.json');
    await writeFile(clipsJsonPath, JSON.stringify(clips, null, 2) + '\n');

    // Self checks
    for (const beat of routeBeats) {
      const desktopClip = clips.find((c) => c.n === beat.n && c.variant === '16x9');
      if (!desktopClip) {
        console.error(`Missing desktop clip for beat ${beat.n} (${beat.slug})`);
        await cleanup();
        process.exit(1);
      }
      if (beat.portrait === 'phone') {
        const phoneClip = clips.find((c) => c.n === beat.n && c.variant === '9x16');
        if (!phoneClip) {
          console.error(`Missing phone clip for beat ${beat.n} (${beat.slug})`);
          await cleanup();
          process.exit(1);
        }
      }
    }

    for (const clip of clips) {
      const validDimensions =
        (clip.width === 1920 && clip.height === 1080) ||
        (clip.width === 1080 && clip.height === 1920);
      if (!validDimensions) {
        console.error(`Invalid dimensions for ${clip.slug} ${clip.variant}: ${clip.width}x${clip.height}`);
        await cleanup();
        process.exit(1);
      }

      const netDuration = clip.durationSeconds - clip.inSeconds;
      if (netDuration < clip.targetSeconds + 2) {
        console.error(
          `Clip ${clip.slug} ${clip.variant} duration after inPoint (${netDuration.toFixed(2)}s) is less than targetSeconds + 2 (${clip.targetSeconds + 2}s)`,
        );
        await cleanup();
        process.exit(1);
      }
    }

    for (const clip of clips) {
      console.log(
        `${clip.n} ${clip.slug} ${clip.variant} ${clip.width}x${clip.height} ${clip.durationSeconds.toFixed(1)}s (in: ${clip.inSeconds.toFixed(1)}s, target: ${clip.targetSeconds}s)`
      );
    }
    console.log('CAPTURE OK');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
