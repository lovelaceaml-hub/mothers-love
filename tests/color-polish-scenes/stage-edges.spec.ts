import { expect, test, type Frame, type Page } from '@playwright/test';
import { SCENE_IDS, buildActiveDisplayFixture, loadRenderer, type SceneSlug } from './helpers';
import { parkedInCloud } from '../cloud-parked';

/**
 * Plan 17 Lane 5, Part A: the recognition area runs end to end.
 *
 * The stage box is inset 54 px from the left and right screen edges, and it used to carry
 * overflow:hidden, so every scene's glows, shadows and oversized cards were sliced by a hard
 * vertical line at x 54 and x 1866. These tests prove that scene content now paints out to the
 * real screen edges, that it still stops at the header rule and at the feed rail, and that no
 * scene element moved when the clipping changed.
 *
 * Review additions: real paint comparisons with the stage shown and hidden at every checkpoint
 * (including Words that bring peace during its glide and drift), a worst case full screen sheet
 * of scene paint, and the eleventh screen, Live Recognitions full screen (renderer id 12), whose
 * panel runs down to y 1055 on purpose and must not be cut at the feed rail line.
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

const LIVE_FEED_ID = 12;
const TV_HEIGHT = 1080;
const LIVE_FEED_PANEL_BOTTOM = 1055;

/**
 * The saved playlist with the eleventh screen, Live Recognitions full screen, switched on.
 */
function fixtureWithLiveFeed() {
  const base = buildActiveDisplayFixture() as any;
  const ids = ['welcome', 'garden', 'featured', 'calendar', 'peacemakers', 'status', 'expressions', 'peace-in-practice', 'orbit', 'milestone', 'live-feed'];
  return {
    ...base,
    presentation: {
      ...base.presentation,
      enabled: true,
      playlist: ids.map((id) => ({ id, enabled: true, durationSeconds: id === 'garden' ? 180 : 60 })),
    },
  };
}

/**
 * Moves to a scene by renderer id and freezes it at the checkpoint (same steps as gotoScene).
 */
async function gotoSceneId(frame: Frame, id: number, ms = CHECKPOINT_MS) {
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
 * Screenshots the frozen page twice, once as it is and once with the whole stage made
 * invisible, and counts the pixels that really differ inside each band of TV rows. A band the
 * stage never paints into has zero such pixels.
 */
async function stagePaintInBands(
  page: Page,
  frame: Frame,
  bands: Array<{ name: string; fromY: number; toY: number }>,
  scale: number,
): Promise<Record<string, number>> {
  const shown = await page.screenshot();
  await frame.evaluate(() => {
    const style = document.createElement('style');
    style.id = 'stage-edges-hide-stage';
    style.textContent = '#tv #stage{visibility:hidden!important}#tv #stage *{visibility:hidden!important}';
    document.head.append(style);
    document.getElementById('stage')!.getBoundingClientRect();
  });
  const hidden = await page.screenshot();
  await frame.evaluate(() => document.getElementById('stage-edges-hide-stage')?.remove());
  return await page.evaluate(
    async ({ a, b, bands, scale }) => {
      const load = async (src: string) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('no 2d context for band comparison');
        context.drawImage(image, 0, 0);
        return { context, width: canvas.width };
      };
      const first = await load(a);
      const second = await load(b);
      const out: Record<string, number> = {};
      for (const band of bands) {
        const y = Math.round(band.fromY * scale);
        const h = Math.round(band.toY * scale) - y;
        const one = first.context.getImageData(0, y, first.width, h).data;
        const two = second.context.getImageData(0, y, second.width, h).data;
        // Headless Chromium rasterizes the page background a level or two differently when the
        // layer tree changes, and it draws the screen's four rounded corners differently too.
        // Neither is stage paint, so a pixel counts only when a channel moves by more than 8
        // levels and it lies outside the 16 px corner squares. Real content moves a channel by
        // far more than that (text, borders and glows measured 180 to 240 levels).
        let differing = 0;
        const width = first.width;
        const corner = Math.round(16 * scale);
        const screenHeight = Math.round(1080 * scale);
        for (let i = 0; i < one.length; i += 4) {
          const delta = Math.max(Math.abs(one[i] - two[i]), Math.abs(one[i + 1] - two[i + 1]), Math.abs(one[i + 2] - two[i + 2]));
          if (delta <= 8) continue;
          const px = (i / 4) % width;
          const py = y + Math.floor(i / 4 / width);
          const inCorner = (px < corner || px >= width - corner) && (py < corner || py >= screenHeight - corner);
          if (!inCorner) differing += 1;
        }
        out[band.name] = differing;
      }
      return out;
    },
    {
      a: 'data:image/png;base64,' + shown.toString('base64'),
      b: 'data:image/png;base64,' + hidden.toString('base64'),
      bands,
      scale,
    },
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

        // The scene itself never clips. The stage's clip-path is the only paint limit, so a
        // browser without overflow-clip-margin support cannot fall back to cutting at the scene box.
        expect(report.sceneOverflow, `scene ${slug}: scene overflow`).toBe('visible');
        expect(report.stageOverflow, `scene ${slug}: stage overflow`).toBe('visible');

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
            '#tv .scene{overflow:hidden!important}';
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
    test(`the stage never paints a pixel of the header band or the feed rail band, at every checkpoint, at ${width}`, async ({ page }) => {
      if (width === 3840) parkedInCloud('at this width it exceeded its time limit in the complete cloud run of 2026-11-12.');
      test.setTimeout(300_000);
      const frame = await loadRenderer(page, { ms: CHECKPOINT_MS, scene: SCENE_IDS.welcome });
      const bands = [
        { name: 'header', fromY: 0, toY: HEADER_RULE_Y },
        { name: 'rail', fromY: FEED_RAIL_Y, toY: TV_HEIGHT },
        { name: 'stage', fromY: STAGE_TOP, toY: STAGE_BOTTOM },
      ];
      // Words that bring peace is also checked through its glide between views (the first
      // switch starts at 6 s and takes 1.1 s, the next one at 16 s) and during the drift.
      const checkpoints: Array<[SceneSlug, number]> = [
        ...TEN_SCENES.map((slug): [SceneSlug, number] => [slug, CHECKPOINT_MS]),
        ['expressions', 0],
        ['expressions', 6300],
        ['expressions', 6600],
        ['expressions', 7000],
        ['expressions', 12000],
        ['expressions', 16500],
        ['welcome', 0],
        ['orbit', 14000],
        ['milestone', 14000],
      ];
      const recorded: Record<string, Record<string, number>> = {};
      for (const [slug, ms] of checkpoints) {
        await gotoScene(frame, slug, ms);
        const differing = await stagePaintInBands(page, frame, bands, scale);
        recorded[`${slug}@${ms}`] = differing;
        expect(differing.header, `scene ${slug} at ${ms} ms: stage paint inside the header band`).toBe(0);
        expect(differing.rail, `scene ${slug} at ${ms} ms: stage paint inside the feed rail band`).toBe(0);
        // The comparison can fail: hiding the stage must change the stage's own rows.
        expect(differing.stage, `scene ${slug} at ${ms} ms: hiding the stage changed nothing`).toBeGreaterThan(1000);
      }
      // eslint-disable-next-line no-console
      console.log(`stage-edges ${width} stage paint per band`, JSON.stringify(recorded));
    });

    test(`a full screen sheet of scene paint is cut exactly at the header rule and the feed rail, and nowhere else, at ${width}`, async ({ page }) => {
      test.setTimeout(240_000);
      const frame = await loadRenderer(page, { ms: CHECKPOINT_MS, scene: SCENE_IDS.welcome });
      // The worst case a scene could ever paint: one magenta sheet far larger than the screen,
      // above everything else in the scene. Words that bring peace is checked mid glide too.
      const checkpoints: Array<[SceneSlug, number]> = [
        ...TEN_SCENES.map((slug): [SceneSlug, number] => [slug, CHECKPOINT_MS]),
        ['expressions', 6500],
        ['expressions', 16500],
      ];
      for (const [slug, ms] of checkpoints) {
        await gotoScene(frame, slug, ms);
        await frame.evaluate(() => {
          const scenes = document.querySelectorAll('#stage .scene');
          const root = scenes[scenes.length - 1] as HTMLElement;
          const el = document.createElement('div');
          el.dataset.edgeProbe = 'sheet';
          el.style.cssText = 'position:absolute;background:#ff00ff;z-index:2147483000;pointer-events:none;left:-600px;top:-600px;width:3200px;height:2400px';
          root.append(el);
        });
        const shot = await page.screenshot();
        await removePaintProbes(frame);
        const counts = await page.evaluate(
          async ({ src, scale, headerY, railY }) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true })!;
            context.drawImage(image, 0, 0);
            const magentaIn = (x0: number, y0: number, x1: number, y1: number) => {
              const x = Math.round(x0 * scale);
              const y = Math.round(y0 * scale);
              const w = Math.round(x1 * scale) - x;
              const h = Math.round(y1 * scale) - y;
              const data = context.getImageData(x, y, w, h).data;
              let count = 0;
              for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] < 90 && data[i + 2] > 200) count += 1;
              return { count, total: w * h };
            };
            return {
              header: magentaIn(0, 0, 1920, headerY),
              rail: magentaIn(0, railY, 1920, 1080),
              leftMargin: magentaIn(0, headerY + 1, 54, railY - 1),
              rightMargin: magentaIn(1866, headerY + 1, 1920, railY - 1),
              between: magentaIn(0, headerY + 1, 1920, railY - 1),
            };
          },
          { src: 'data:image/png;base64,' + shot.toString('base64'), scale, headerY: HEADER_RULE_Y, railY: FEED_RAIL_Y },
        );
        expect(counts.header.count, `scene ${slug} at ${ms} ms: scene paint inside the header band`).toBe(0);
        expect(counts.rail.count, `scene ${slug} at ${ms} ms: scene paint at or below the feed rail line`).toBe(0);
        // Both 54 px side margins are painted in full, right out to the screen edges.
        expect(counts.leftMargin.count, `scene ${slug} at ${ms} ms: left margin cut`).toBe(counts.leftMargin.total);
        expect(counts.rightMargin.count, `scene ${slug} at ${ms} ms: right margin cut`).toBe(counts.rightMargin.total);
        // Only the small countdown ring, which sits above the stage on purpose, covers any of it.
        expect(counts.between.count / counts.between.total, `scene ${slug} at ${ms} ms: sheet coverage`).toBeGreaterThan(0.99);
      }
    });

    test(`Live Recognitions full screen is not cut by the stage clip and still stays under the header at ${width}`, async ({ page }) => {
      test.setTimeout(180_000);
      const frame = await loadRenderer(page, { ms: CHECKPOINT_MS, scene: SCENE_IDS.welcome, fixture: fixtureWithLiveFeed() });
      await gotoSceneId(frame, LIVE_FEED_ID);

      const report = await readClip(frame);
      expect(report.clip, `live feed: stage clip could not be read from ${report.clipPath}`).not.toBeNull();
      expect(report.clip!.left, 'live feed: clip left').toBeLessThanOrEqual(0);
      expect(report.clip!.right, 'live feed: clip right').toBeGreaterThanOrEqual(TV_WIDTH);
      expect(report.clip!.top, 'live feed: clip top').toBeGreaterThanOrEqual(HEADER_RULE_Y);
      expect(report.clip!.bottom, 'live feed: clip bottom').toBeGreaterThanOrEqual(TV_HEIGHT);

      // The panel's whole box, shadow included, lies inside the clip.
      const panel = await frame.evaluate(() => {
        const tv = document.getElementById('tv') as HTMLElement;
        const tvRect = tv.getBoundingClientRect();
        const s = tvRect.width / 1920;
        const el = document.querySelector('#stage .scene[data-scene="12"] .lf-panel') as HTMLElement | null;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: (r.left - tvRect.left) / s, top: (r.top - tvRect.top) / s, right: (r.right - tvRect.left) / s, bottom: (r.bottom - tvRect.top) / s };
      });
      expect(panel, 'live feed: panel not found').not.toBeNull();
      expect(panel!.bottom, 'live feed: panel bottom').toBeGreaterThan(LIVE_FEED_PANEL_BOTTOM - 1);
      expect(report.clip!.top, 'live feed: panel cut at the top').toBeLessThanOrEqual(panel!.top);
      expect(report.clip!.bottom, 'live feed: panel cut at the bottom').toBeGreaterThanOrEqual(panel!.bottom);

      // Real paint: hiding the stage must change the rows below the old rail line (the panel
      // paints there), and must not change one pixel of the header band.
      const differing = await stagePaintInBands(
        page,
        frame,
        [
          { name: 'header', fromY: 0, toY: HEADER_RULE_Y },
          { name: 'belowRailLine', fromY: FEED_RAIL_Y + 10, toY: LIVE_FEED_PANEL_BOTTOM - 10 },
        ],
        scale,
      );
      expect(differing.header, 'live feed: stage paint inside the header band').toBe(0);
      expect(differing.belowRailLine, 'live feed: the panel is cut at the feed rail line').toBeGreaterThan(100_000 * scale * scale);

      // A probe placed near the panel's bottom edge is painted, not cut.
      await frame.evaluate(() => {
        const root = document.querySelector('#stage .scene[data-scene="12"]') as HTMLElement;
        const el = document.createElement('div');
        el.dataset.edgeProbe = 'live-feed-bottom';
        el.style.cssText = 'position:absolute;background:#ff00ff;z-index:2147483000;pointer-events:none;left:860px;top:880px;width:120px;height:40px';
        root.append(el);
      });
      const [low] = await samplePixels(page, [[960, 126 + 900]], scale);
      await removePaintProbes(frame);
      expect(isMagenta(low), `live feed: probe at TV y 1026 was cut, pixel ${low}`).toBe(true);

      // Leaving the screen restores the ordinary clip, so the next scene stops at the rail again.
      await gotoScene(frame, 'welcome');
      const after = await readClip(frame);
      expect(after.clip!.bottom, 'after live feed: clip bottom').toBeLessThanOrEqual(FEED_RAIL_Y);
    });
  });
}
