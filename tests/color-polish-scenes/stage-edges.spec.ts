import { expect, test, type Frame, type Page } from '@playwright/test';
import { SCENE_IDS, loadRenderer, type SceneSlug } from './helpers';

/**
 * Plan 17 Lane 5, Part A: the recognition area runs end to end.
 *
 * The stage box is inset 54 px from the left and right screen edges, and it used to carry
 * overflow:hidden, so every scene's glows, shadows and oversized cards were sliced by a hard
 * vertical line at x 54 and x 1866. These tests prove that scene content now paints out to the
 * real screen edges, that it still stops at the header rule and at the feed rail, and that no
 * scene element moved when the clipping changed.
 */

const TEN_SCENES: SceneSlug[] = [
  'welcome',
  'garden',
  'featured',
  'calendar',
  'status',
  'expressions',
  'peacemakers',
  'peace-in-practice',
  'orbit',
  'milestone',
];

// Fixed TV surface geometry, in the renderer's own 1920 x 1080 coordinate space.
const TV_WIDTH = 1920;
const STAGE_LEFT = 54;
const STAGE_RIGHT = 1866;
const STAGE_TOP = 126;
const STAGE_BOTTOM = 762;
const HEADER_RULE_Y = 102; // .tv-header top 31 + height 71
const FEED_RAIL_Y = 787; // .footer top

const WIDTHS = [1920, 3840];
const CHECKPOINT_MS = 6000;

type Box = { path: string; left: number; top: number; width: number; height: number };

type ClipReport = {
  stageRect: { left: number; top: number; right: number; bottom: number };
  clipPath: string;
  clip: { left: number; top: number; right: number; bottom: number } | null;
  stageOverflow: string;
  sceneOverflow: string;
  sceneClipMargin: string;
  zIndex: { stage: number; header: number; footer: number };
};

/**
 * Advances the already loaded renderer to another scene and freezes it at the checkpoint.
 */
async function gotoScene(frame: Frame, slug: SceneSlug, ms = CHECKPOINT_MS) {
  const id = SCENE_IDS[slug];
  await frame.evaluate((s) => (window as any).colorPolishRuntime.setScene(s), id);
  await frame.waitForFunction((s) => (window as any).colorPolishRuntime?.getState().scene === s, id);
  await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const transition = runtime.getState().transition;
    if (transition) runtime.step((transition.duration - transition.age) * 1000 + 40);
  });
  await frame.evaluate((checkpointMs) => {
    (window as any).colorPolishRuntime.step(checkpointMs);
    document.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = checkpointMs;
    });
  }, ms);
  await frame.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
}

/**
 * Reads the stage's effective clip rectangle, in TV coordinates, from computed style.
 */
async function readClip(frame: Frame): Promise<ClipReport> {
  return await frame.evaluate(() => {
    const tv = document.getElementById('tv') as HTMLElement;
    const stage = document.getElementById('stage') as HTMLElement;
    const header = document.querySelector('.tv-header') as HTMLElement;
    const footer = document.querySelector('.footer') as HTMLElement;
    const scenes = document.querySelectorAll('#stage .scene');
    const scene = scenes[scenes.length - 1] as HTMLElement | undefined;

    const tvRect = tv.getBoundingClientRect();
    const scale = tvRect.width / 1920;
    const raw = stage.getBoundingClientRect();
    const stageRect = {
      left: (raw.left - tvRect.left) / scale,
      top: (raw.top - tvRect.top) / scale,
      right: (raw.right - tvRect.left) / scale,
      bottom: (raw.bottom - tvRect.top) / scale,
    };

    const stageStyle = window.getComputedStyle(stage);
    const clipPath = stageStyle.clipPath;
    let clip: { left: number; top: number; right: number; bottom: number } | null = null;
    const inset = clipPath.match(/^inset\(([^)]*)\)$/);
    if (inset) {
      const parts = inset[1].trim().split(/\s+/).map((value) => parseFloat(value));
      const numeric = parts.filter((value) => !isNaN(value));
      if (numeric.length >= 1) {
        const top = numeric[0];
        const right = numeric.length > 1 ? numeric[1] : top;
        const bottom = numeric.length > 2 ? numeric[2] : top;
        const left = numeric.length > 3 ? numeric[3] : right;
        clip = {
          left: stageRect.left + left,
          top: stageRect.top + top,
          right: stageRect.right - right,
          bottom: stageRect.bottom - bottom,
        };
      }
    } else if (clipPath === 'none' && stageStyle.overflow === 'visible') {
      clip = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    } else if (clipPath === 'none') {
      clip = { ...stageRect };
    }

    const sceneStyle = scene ? window.getComputedStyle(scene) : null;
    const zOf = (el: HTMLElement) => {
      const value = parseInt(window.getComputedStyle(el).zIndex, 10);
      return isNaN(value) ? 0 : value;
    };

    return {
      stageRect,
      clipPath,
      clip,
      stageOverflow: stageStyle.overflow,
      sceneOverflow: sceneStyle ? sceneStyle.overflow : '',
      sceneClipMargin: sceneStyle ? sceneStyle.overflowClipMargin : '',
      zIndex: { stage: zOf(stage), header: zOf(header), footer: zOf(footer) },
    };
  });
}

/**
 * Lists every scene descendant whose painted box crosses the stage's left or right edge,
 * together with whether the stage's clip region still cuts it.
 */
async function edgeCrossers(frame: Frame) {
  return await frame.evaluate(
    ({ stageLeft, stageRight }) => {
      const tv = document.getElementById('tv') as HTMLElement;
      const tvRect = tv.getBoundingClientRect();
      const scale = tvRect.width / 1920;
      const scenes = document.querySelectorAll('#stage .scene');
      const root = scenes[scenes.length - 1] as HTMLElement | undefined;
      if (!root) return { crossers: [] as Array<{ selector: string; left: number; right: number }>, total: 0 };

      const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
      const crossers: Array<{ selector: string; left: number; right: number }> = [];
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const left = (r.left - tvRect.left) / scale;
        const right = (r.right - tvRect.left) / scale;
        if (left < stageLeft - 0.5 || right > stageRight + 0.5) {
          const selector = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).join('.')
            : el.tagName.toLowerCase();
          crossers.push({ selector, left: +left.toFixed(2), right: +right.toFixed(2) });
        }
      }
      return { crossers, total: all.length };
    },
    { stageLeft: STAGE_LEFT, stageRight: STAGE_RIGHT },
  );
}

/**
 * Collects every scene descendant's box in TV coordinates, keyed by its position in the tree.
 */
async function sceneBoxes(frame: Frame): Promise<Box[]> {
  return await frame.evaluate(() => {
    const tv = document.getElementById('tv') as HTMLElement;
    const tvRect = tv.getBoundingClientRect();
    const scale = tvRect.width / 1920;
    const scenes = document.querySelectorAll('#stage .scene');
    const root = scenes[scenes.length - 1] as HTMLElement | undefined;
    const out: Box[] = [];
    const walk = (el: HTMLElement, path: string) => {
      const r = el.getBoundingClientRect();
      out.push({
        path,
        left: +((r.left - tvRect.left) / scale).toFixed(2),
        top: +((r.top - tvRect.top) / scale).toFixed(2),
        width: +(r.width / scale).toFixed(2),
        height: +(r.height / scale).toFixed(2),
      });
      Array.from(el.children).forEach((child, index) => {
        const cls = child.className && typeof child.className === 'string'
          ? '.' + child.className.trim().split(/\s+/).join('.')
          : '';
        walk(child as HTMLElement, path + '>' + child.tagName.toLowerCase() + cls + '[' + index + ']');
      });
    };
    if (root) walk(root, 'scene');
    return out;
  });
}

/**
 * Adds magenta paint probes to the live scene, in scene local coordinates.
 * Each probe reaches past one edge of the stage box.
 */
async function addPaintProbes(frame: Frame) {
  await frame.evaluate(() => {
    const scenes = document.querySelectorAll('#stage .scene');
    const root = scenes[scenes.length - 1] as HTMLElement | undefined;
    if (!root) throw new Error('no scene root for paint probes');
    const make = (name: string, css: string) => {
      const el = document.createElement('div');
      el.dataset.edgeProbe = name;
      el.style.cssText = 'position:absolute;background:#ff00ff;z-index:2147483000;pointer-events:none;' + css;
      root.append(el);
    };
    // Scene local origin is TV (54, 126). Scene box is 1812 x 636.
    make('left', 'left:-48px;top:250px;width:40px;height:40px');
    make('right', 'left:1820px;top:250px;width:40px;height:40px');
    make('top', 'left:860px;top:-70px;width:120px;height:80px');
    make('bottom', 'left:860px;top:630px;width:120px;height:66px');
  });
}

async function removePaintProbes(frame: Frame) {
  await frame.evaluate(() => {
    document.querySelectorAll('[data-edge-probe]').forEach((el) => el.remove());
  });
}

/**
 * Screenshots the probe page and reads pixels at the given TV coordinates.
 */
async function samplePixels(
  page: Page,
  points: Array<[number, number]>,
  scale: number,
): Promise<Array<[number, number, number]>> {
  const shot = await page.screenshot();
  const dataUrl = 'data:image/png;base64,' + shot.toString('base64');
  return await page.evaluate(
    async ({ dataUrl, points, scale }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no 2d context for pixel sampling');
      context.drawImage(image, 0, 0);
      return points.map(([x, y]) => {
        const data = context.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data;
        return [data[0], data[1], data[2]] as [number, number, number];
      });
    },
    { dataUrl, points, scale },
  );
}

const isMagenta = (pixel: [number, number, number]) =>
  pixel[0] > 200 && pixel[1] < 90 && pixel[2] > 200;

for (const width of WIDTHS) {
  const height = Math.round((width * 9) / 16);
  const scale = width / TV_WIDTH;

  test.describe(`stage edges at ${width}`, () => {
    test.use({ viewport: { width, height } });

    test(`the stage clip reaches both screen edges and stops at the header rule and the feed rail at ${width}`, async ({ page }) => {
      test.setTimeout(180_000);
      const frame = await loadRenderer(page, { ms: CHECKPOINT_MS, scene: SCENE_IDS.welcome });

      const seen: Record<string, { crossers: number; total: number }> = {};

      for (const slug of TEN_SCENES) {
        await gotoScene(frame, slug);

        const report = await readClip(frame);
        expect(report.clip, `scene ${slug}: stage clip could not be read from ${report.clipPath}`).not.toBeNull();

        // Edge to edge: the clip must reach the real screen edges on the left and the right.
        expect(report.clip!.left, `scene ${slug}: clip left`).toBeLessThanOrEqual(0);
        expect(report.clip!.right, `scene ${slug}: clip right`).toBeGreaterThanOrEqual(TV_WIDTH);

        // The clip must still stop at the header rule above and the feed rail below.
        expect(report.clip!.top, `scene ${slug}: clip top`).toBeGreaterThanOrEqual(HEADER_RULE_Y);
        expect(report.clip!.top, `scene ${slug}: clip top`).toBeLessThanOrEqual(STAGE_TOP);
        expect(report.clip!.bottom, `scene ${slug}: clip bottom`).toBeLessThanOrEqual(FEED_RAIL_Y);
        expect(report.clip!.bottom, `scene ${slug}: clip bottom`).toBeGreaterThanOrEqual(STAGE_BOTTOM);

        // The scene must not clip earlier than the stage does.
        if (report.sceneOverflow !== 'visible') {
          const margin = parseFloat(report.sceneClipMargin);
          expect(report.sceneOverflow, `scene ${slug}: scene overflow`).toBe('clip');
          expect(margin, `scene ${slug}: overflow-clip-margin`).toBeGreaterThanOrEqual(STAGE_LEFT);
        }

        // Ordinary scene content stays behind the header and the feed rail.
        expect(report.zIndex.stage, `scene ${slug}: stage vs header z-index`).toBeLessThan(report.zIndex.header);
        expect(report.zIndex.stage, `scene ${slug}: stage vs footer z-index`).toBeLessThan(report.zIndex.footer);

        // Every element that crosses the stage's left or right edge keeps the whole part of
        // itself that lies on the screen. Only the screen edge may cut it, never the stage box.
        const { crossers, total } = await edgeCrossers(frame);
        for (const crosser of crossers) {
          const visibleLeft = Math.max(0, crosser.left);
          const visibleRight = Math.min(TV_WIDTH, crosser.right);
          if (visibleRight <= visibleLeft) continue;
          expect(report.clip!.left, `scene ${slug}: ${crosser.selector} cut at the left edge`).toBeLessThanOrEqual(visibleLeft);
          expect(report.clip!.right, `scene ${slug}: ${crosser.selector} cut at the right edge`).toBeGreaterThanOrEqual(visibleRight);
        }
        seen[slug] = { crossers: crossers.length, total };

        // Paint probes: magenta must reach the screen edges, and must not reach the header band
        // or the feed rail band.
        await addPaintProbes(frame);
        const [leftPixel, rightPixel, aboveRule, belowRule, aboveRail, railBand] = await samplePixels(
          page,
          [
            [26, 396],
            [1894, 396],
            [960, 70],
            [960, 112],
            [960, 775],
            [960, 800],
          ],
          scale,
        );
        await removePaintProbes(frame);

        expect(isMagenta(leftPixel), `scene ${slug}: probe at TV x 26 was cut, pixel ${leftPixel}`).toBe(true);
        expect(isMagenta(rightPixel), `scene ${slug}: probe at TV x 1894 was cut, pixel ${rightPixel}`).toBe(true);
        expect(isMagenta(belowRule), `scene ${slug}: probe below the header rule missing, pixel ${belowRule}`).toBe(true);
        expect(isMagenta(aboveRail), `scene ${slug}: probe above the feed rail missing, pixel ${aboveRail}`).toBe(true);
        expect(isMagenta(aboveRule), `scene ${slug}: scene paint reached the header band, pixel ${aboveRule}`).toBe(false);
        expect(aboveRule[1], `scene ${slug}: header band is not light, pixel ${aboveRule}`).toBeGreaterThanOrEqual(180);
        expect(isMagenta(railBand), `scene ${slug}: scene paint reached the feed rail, pixel ${railBand}`).toBe(false);
        expect(railBand[1], `scene ${slug}: feed rail band is not light, pixel ${railBand}`).toBeGreaterThanOrEqual(180);
      }

      // Recorded counts for the lane record. Every scene must have been measured.
      expect(Object.keys(seen)).toHaveLength(TEN_SCENES.length);
      // eslint-disable-next-line no-console
      console.log(`stage-edges ${width} crossers`, JSON.stringify(seen));
    });

    test(`scene element boxes are identical with and without the edge to edge clip at ${width}`, async ({ page }) => {
      test.setTimeout(180_000);
      const frame = await loadRenderer(page, { ms: CHECKPOINT_MS, scene: SCENE_IDS.welcome });

      const counts: Record<string, number> = {};

      for (const slug of TEN_SCENES) {
        await gotoScene(frame, slug);
        const after = await sceneBoxes(frame);

        // Restore the tv17/pick clipping at runtime and measure again. Paint only changes must
        // leave every box untouched.
        await frame.evaluate(() => {
          const style = document.createElement('style');
          style.id = 'stage-edges-baseline';
          style.textContent =
            '#tv .stage{overflow:hidden!important;clip-path:none!important}' +
            '#tv .scene{overflow:hidden!important;overflow-clip-margin:0px!important}';
          document.head.append(style);
          document.getElementById('stage')!.getBoundingClientRect();
        });
        const before = await sceneBoxes(frame);
        await frame.evaluate(() => document.getElementById('stage-edges-baseline')?.remove());

        expect(before.length, `scene ${slug}: element count`).toBe(after.length);
        expect(before.length, `scene ${slug}: measured no elements`).toBeGreaterThan(0);
        const differences = before.filter((box, index) => {
          const other = after[index];
          return (
            box.path !== other.path ||
            Math.abs(box.left - other.left) > 0.01 ||
            Math.abs(box.top - other.top) > 0.01 ||
            Math.abs(box.width - other.width) > 0.01 ||
            Math.abs(box.height - other.height) > 0.01
          );
        });
        expect(differences, `scene ${slug}: boxes moved`).toHaveLength(0);
        counts[slug] = after.length;
      }

      expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log(`stage-edges ${width} element counts`, JSON.stringify(counts));
    });
  });
}
