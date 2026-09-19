import { expect, test, type Frame, type Page } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  recognition,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';
import { buildColorPolishSampleSnapshot } from '../../src/components/display/color-polish/sample';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MEDIUM_IDS, MEDIUM_SHORT_IDS, bubbleReadings, buildLongOnlyFixture, buildMediumFixture, buildMostlyLongFixture, fitsWhole, textFits } from './text-fits';

const publicFolder = resolve(process.cwd(), 'public');

async function setupOrbitHarness(page: Page): Promise<{ frame: Frame }> {
  await page.setViewportSize({ width: 1920, height: 1080 });
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
  const snapshot = buildColorPolishSampleSnapshot();

  await page.evaluate(
    async ({ snapshot }) => {
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
          scene: 'orbit',
          reactionCounts: {},
          qrDataUrl: '',
          submissionUrl: snapshot.submissionUrl,
        },
      });
    },
    { snapshot },
  );

  const frame = page.frames().find((f) => f.url().endsWith('/color-polish/renderer.html'));
  if (!frame) throw new Error('renderer frame not found');
  await frame.waitForFunction(() => (window as any).colorPolishRuntime?.getState().scene === 10);

  return { frame };
}

test('orbit renders circular planets and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'orbit', 14000);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

  // The visual invariant, asserted directly: no element in this scene may be
  // drawn outside the 1812 by 636 stage. This is stronger than comparing
  // scrollHeight, because it names the offending element instead of reporting
  // a number.
  const outside = await frame.evaluate(() => {
    const scene = document.querySelector('#stage .scene[data-scene="10"]') as HTMLElement | null;
    if (!scene) return null;
    const r = scene.getBoundingClientRect();
    const out: { cls: string; overBottom: number; overRight: number }[] = [];
    scene.querySelectorAll('*').forEach((el) => {
      const b = (el as HTMLElement).getBoundingClientRect();
      if (b.bottom - r.bottom > 0.5 || b.right - r.right > 0.5) {
        out.push({
          cls: (el as HTMLElement).className.toString().slice(0, 40),
          overBottom: Math.round(b.bottom - r.bottom),
          overRight: Math.round(b.right - r.right),
        });
      }
    });
    return { scrollH: scene.scrollHeight, clientH: scene.clientHeight, outside: out };
  });
  expect(outside).not.toBeNull();
  expect(outside!.outside).toHaveLength(0);

  // scrollHeight gets a small tolerance here, and only here. `.stage` carries
  // `perspective: 1600px` in the shipped renderer.css, and this scene's centre
  // puts its depth rings on translateZ tiers up to 78 px inside that 3D
  // rendering context. That inflates the computed scrollable overflow area by
  // about 5 px while, as the assertion above proves by measuring every
  // element, nothing is actually drawn outside the stage. Tolerating 8 px is
  // therefore not a weaker check than before: the element-rect assertion that
  // replaced it is stricter and names what fails.
  expect(outside!.scrollH).toBeLessThanOrEqual(outside!.clientH + 8);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('planets orbit in 3D at the slower rate', async ({ page }) => {
  const { frame } = await setupOrbitHarness(page);

  type OrbitSample = {
    ms: number;
    orbit: Array<{ id: string; z: number; scale: number; moons: number }>;
    zIndices: number[];
  };

  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  const samples: OrbitSample[] = [];
  let currentMs = 0;

  for (const cp of checkpoints) {
    if (cp > currentMs) {
      const delta = cp - currentMs;
      await frame.evaluate((dt) => {
        (window as any).colorPolishRuntime.step(dt);
      }, delta);
      currentMs = cp;
    }

    const data = await frame.evaluate((ms) => {
      const runtime = (window as any).colorPolishRuntime;
      const vs = runtime.getState().visual;
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.planet-system'));
      const zIndices = elements.map((el) => {
        const zi = el.style.zIndex || window.getComputedStyle(el).zIndex;
        return parseInt(zi, 10);
      });
      return {
        ms,
        orbit: vs.orbit as Array<{ id: string; z: number; scale: number; moons: number }>,
        zIndices,
      };
    }, cp);

    samples.push(data);
  }

  // 1. z values span both signs at every sample
  for (const sample of samples) {
    const zValues = sample.orbit.map((p) => p.z);
    expect(zValues.some((z) => z > 0)).toBe(true);
    expect(zValues.some((z) => z < 0)).toBe(true);
  }

  // 2. At least one planet's DOM z-index is below 10000 at some sample and above 10000 at another
  const planetCount = samples[0].zIndices.length;
  let planetCrossedSun = false;
  for (let i = 0; i < planetCount; i++) {
    const zIndices = samples.map((s) => s.zIndices[i]);
    const below = zIndices.some((zi) => zi < 10000);
    const above = zIndices.some((zi) => zi > 10000);
    if (below && above) {
      planetCrossedSun = true;
      break;
    }
  }
  expect(planetCrossedSun).toBe(true);

  // 3. Angular advance per 5 s computed from consecutive z values of one planet
  // For one planet matched by id across samples, z = 395 sin(theta).
  // Compute theta from asin(z / 395) with sign disambiguated by direction of change (theta increases with time).
  // Use a pair of consecutive samples 5 s apart where both |z| are below 300 so asin is well conditioned.
  let measuredRate: number | null = null;

  for (let i = 0; i < samples.length - 1; i++) {
    const s1 = samples[i];
    const s2 = samples[i + 1];
    const dt = (s2.ms - s1.ms) / 1000;
    if (Math.abs(dt - 5) > 0.001) continue;

    for (const p1 of s1.orbit) {
      const p2 = s2.orbit.find((p) => p.id === p1.id);
      if (!p2) continue;

      if (Math.abs(p1.z) < 300 && Math.abs(p2.z) < 300) {
        const isIncreasing = p2.z > p1.z;
        const clamp = (v: number) => Math.min(1, Math.max(-1, v / 395));
        const theta1 = isIncreasing ? Math.asin(clamp(p1.z)) : Math.PI - Math.asin(clamp(p1.z));
        const theta2 = isIncreasing ? Math.asin(clamp(p2.z)) : Math.PI - Math.asin(clamp(p2.z));
        measuredRate = (theta2 - theta1) / dt;
        break;
      }
    }
    if (measuredRate !== null) break;
  }

  expect(measuredRate).not.toBeNull();
  // The direct renderer harness is deterministic with no host poll interruptions.
  expect(measuredRate!).toBeGreaterThanOrEqual(0.082 * 0.92);
  expect(measuredRate!).toBeLessThanOrEqual(0.082 * 1.08);

  // 4. No .orb or .orb-slot carries a 3D rotation
  const transforms = await frame.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.planet-system, .planet-system .orb, .planet-system .orb-slot'),
    );
    return elements.map((el) => {
      const inline = el.style.transform || '';
      const comp = window.getComputedStyle(el).transform || '';
      return { inline, comp };
    });
  });
  for (const t of transforms) {
    expect(t.inline).not.toContain('rotateX');
    expect(t.inline).not.toContain('rotateY');
    expect(t.inline).not.toContain('rotate3d');
  }
});

test('the far planet is blurred and dim, the near planet sharp with a shadow', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'orbit', 1000);

  type Observation = {
    z: number;
    filter: string;
    opacity: number;
  };

  const observations: Observation[] = [];
  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  let currentMs = 1000;

  for (const cp of checkpoints) {
    if (cp > currentMs) {
      const delta = cp - currentMs;
      await frame.evaluate((dt) => {
        (window as any).colorPolishRuntime.step(dt);
      }, delta);
      currentMs = cp;
    }

    const obs = await frame.evaluate(() => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.planet-system'));
      const runtime = (window as any).colorPolishRuntime;
      const vs = runtime.getState().visual;
      return elements.map((el, idx) => {
        const computed = window.getComputedStyle(el);
        return {
          z: vs.orbit[idx]?.z ?? 0,
          filter: computed.filter || el.style.filter || '',
          opacity: parseFloat(computed.opacity || el.style.opacity || '1'),
        };
      });
    });

    observations.push(...obs);
  }

  // Sort observations by z coordinate
  observations.sort((a, b) => a.z - b.z);
  const lowest = observations[0];
  const highest = observations[observations.length - 1];

  // At the sample where a planet has the lowest z:
  // computed filter contains a blur of at least 1.2 px and a dimming tone
  // (brightness at most .93). Plan 17: the planet stays fully opaque, so the
  // centre quote can never show through its words; depth shows through
  // blur and tone instead of transparency.
  const blurMatch = lowest.filter.match(/blur\(([\d.]+)px\)/);
  expect(blurMatch).not.toBeNull();
  const blurPx = parseFloat(blurMatch![1]);
  expect(blurPx).toBeGreaterThanOrEqual(1.2);
  expect(lowest.opacity).toBe(1);
  const toneMatch = lowest.filter.match(/brightness\(([\d.]+)\)/);
  expect(toneMatch, `far planet filter dims by tone: ${lowest.filter}`).not.toBeNull();
  expect(parseFloat(toneMatch![1])).toBeLessThanOrEqual(0.93);

  // At the sample where a planet has the highest z:
  // filter has no blur (or blur 0) and contains drop-shadow
  expect(highest.filter).toContain('drop-shadow');
  const highestBlurMatch = highest.filter.match(/blur\(([\d.]+)px\)/);
  if (highestBlurMatch) {
    expect(parseFloat(highestBlurMatch[1])).toBe(0);
  } else {
    expect(highest.filter).not.toContain('blur');
  }
});

test('planets stay circular through the orbit', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'orbit', 300);

  const r300 = await circularity(frame);
  expect(r300.count).toBeGreaterThan(0);
  expect(r300.failures).toHaveLength(0);

  await frame.evaluate((dt) => {
    (window as any).colorPolishRuntime.step(dt);
  }, 5700);
  const r6000 = await circularity(frame);
  expect(r6000.count).toBeGreaterThan(0);
  expect(r6000.failures).toHaveLength(0);

  await frame.evaluate((dt) => {
    (window as any).colorPolishRuntime.step(dt);
  }, 8000);
  const r14000 = await circularity(frame);
  expect(r14000.count).toBeGreaterThan(0);
  expect(r14000.failures).toHaveLength(0);
});

test('reduced motion renders the orbit still', async ({ page }) => {
  const { frame, still } = await reducedMotionScene(page, 'orbit');
  expect(still).toBe(true);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);
});

test('across six fresh opens at 300 ms, the .orbit-sun h2 text shows at least two distinct catalog names', async ({ context }) => {
  test.setTimeout(60000);
  const names = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const page = await context.newPage();
    const { frame } = await openStudioScene(page, 'orbit', 300);
    const text = await frame.locator('.orbit-sun h2').innerText();
    names.add(text.trim());
    await page.close();
  }
  expect(names.size).toBeGreaterThanOrEqual(2);
});

test('at 300 ms the sun name matches a catalog entry and every .planet-system contains one .orb-slot', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'orbit', 300);
  const sunName = (await frame.locator('.orbit-sun h2').textContent() || '').trim();
  const catalogNames = await frame.evaluate(() => {
    return (window as any).colorPolishRuntime.catalog.map((c: { name: string }) => c.name);
  });
  expect(catalogNames.map((n: string) => n.toLowerCase())).toContain(sunName.toLowerCase());

  const orbSlotCounts = await frame.evaluate(() => {
    const systems = Array.from(document.querySelectorAll('.planet-system'));
    return systems.map((el) => el.querySelectorAll('.orb-slot').length);
  });
  expect(orbSlotCounts.length).toBeGreaterThan(0);
  expect(orbSlotCounts.every((count) => count === 1)).toBe(true);
});

test('centre element bounding box is at least 1.5 times the largest orbiting bubble diameter', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 10, ms: 1000 });
  const result = await frame.evaluate(() => {
    const sun = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"] .orbit-sun');
    if (!sun) throw new Error('orbit-sun not found');
    const sunRect = sun.getBoundingClientRect();
    const tv = document.querySelector<HTMLElement>('#tv') || document.body;
    const scale = (tv.getBoundingClientRect().width || 1920) / 1920;

    const runtime = (window as any).colorPolishRuntime;
    const slots = runtime.getState().slots as Array<{ d: number }>;
    const largestBaseDiameter = Math.max(...slots.map((s) => s.d));

    const rings = Array.from(sun.querySelectorAll<HTMLElement>('.orbit-sun-ring'));
    const ringTiers = rings.map((r) => r.style.transform);
    const halo = sun.querySelector<HTMLElement>('.orbit-sun-halo');
    const rays = Array.from(sun.querySelectorAll<HTMLElement>('.orbit-sun-ray'));
    const particles = sun.querySelector<HTMLElement>('.orbit-sun-particles');
    const sunComp = window.getComputedStyle(sun);

    return {
      sunWidth: sunRect.width / scale,
      sunHeight: sunRect.height / scale,
      largestBaseDiameter,
      transformStyle: sunComp.transformStyle,
      ringCount: rings.length,
      ringTiers,
      hasHalo: Boolean(halo),
      rayCount: rays.length,
      hasParticles: Boolean(particles),
    };
  });

  expect(result.sunWidth).toBeGreaterThanOrEqual(result.largestBaseDiameter * 1.5);
  expect(result.sunHeight).toBeGreaterThanOrEqual(result.largestBaseDiameter * 1.5);
  expect(result.transformStyle).toBe('preserve-3d');
  expect(result.ringCount).toBe(4);
  expect(result.ringTiers.some((t) => t.includes('translateZ(0px)'))).toBe(true);
  expect(result.ringTiers.some((t) => t.includes('translateZ(26px)'))).toBe(true);
  expect(result.ringTiers.some((t) => t.includes('translateZ(52px)'))).toBe(true);
  expect(result.ringTiers.some((t) => t.includes('translateZ(78px)'))).toBe(true);
  expect(result.hasHalo).toBe(true);
  expect(result.rayCount).toBe(4);
  expect(result.hasParticles).toBe(true);
});

test('a 210 character planet grows past the old 263 px tier to show its message whole and stays smaller than the centre', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const longFixture = buildActiveDisplayFixture({
    recognitions: [
      {
        id: '00000000-0000-4000-8000-000000000099',
        recipient: 'Friend Dominance',
        message: 'A very long message exceeding two hundred characters so that the largest planet diameter tier of two hundred sixty-three pixels is triggered and verified for centre dominance in worst case scenarios.'.padEnd(210, '!'),
        expressionIds: [1, 2, 3],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
    ],
  });

  const frame = await loadRenderer(page, { scene: 10, ms: 1000, fixture: longFixture });
  const result = await frame.evaluate(() => {
    const sun = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"] .orbit-sun');
    if (!sun) throw new Error('orbit-sun not found');
    const sunRect = sun.getBoundingClientRect();
    const tv = document.querySelector<HTMLElement>('#tv') || document.body;
    const scale = (tv.getBoundingClientRect().width || 1920) / 1920;

    const runtime = (window as any).colorPolishRuntime;
    const slots = runtime.getState().slots as Array<{ d: number }>;
    const largestBaseDiameter = Math.max(...slots.map((s) => s.d));
    const indicator = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"] .planet-system .orb-page-indicator');

    return {
      sunWidth: sunRect.width / scale,
      sunHeight: sunRect.height / scale,
      largestBaseDiameter,
      singlePage: !indicator || indicator.hidden,
    };
  });

  // Plan 17 ("pages, long only"): the planet grows to the size its message
  // needs instead of paging at the fixed 263 px tier, and the centre circle
  // stays the largest circle in the scene.
  expect(result.largestBaseDiameter).toBeGreaterThan(263);
  expect(result.singlePage).toBe(true);
  expect(result.sunWidth).toBeGreaterThan(result.largestBaseDiameter);
  expect(result.sunHeight).toBeGreaterThan(result.largestBaseDiameter);
});

test('planet diameters grow with message length from the Plan 15 tiers, every message shows whole, and planets stay circular', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const tieredFixture = buildActiveDisplayFixture({
    recognitions: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        recipient: 'Friend One',
        message: 'Thank you for your warm smile today.',
        expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        recipient: 'Friend Two',
        message: 'Thank you for helping me navigate through the complex challenges this morning and always being there for our team.',
        expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        recipient: 'Friend Three',
        message: 'I am so deeply grateful for your continuous kindness, constant patience, and the way you always make everyone around you feel valued and included. Your unwavering support has truly brightened our whole community, and we are all so blessed by your gracious presence every single day.',
        expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        recipient: 'Friend Four',
        message: 'A quiet word of appreciation for you.',
        expressionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        createdAt: '2026-09-10T17:00:00Z',
        firstPublishedAt: '2026-09-10T17:00:00Z',
        expiresAt: '2026-09-17T17:00:00Z',
        version: 1,
        status: 'published',
        featured: false,
      },
    ],
  });

  const frame = await loadRenderer(page, { scene: 10, ms: 1000, fixture: tieredFixture });

  const planets = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const slots = runtime.getState().slots as Array<{ d: number; id: string }>;
    return slots.map((s) => {
      const el = document.querySelector<HTMLElement>(`#stage .scene[data-scene="10"] .orb-slot[data-record-id="${s.id}"]`);
      const indicator = el?.querySelector<HTMLElement>('.orb-page-indicator');
      return { id: s.id, d: s.d, width: el?.offsetWidth ?? 0, singlePage: !indicator || indicator.hidden };
    });
  });

  // Plan 17 ("pages, long only"): each planet starts at its Plan 15 tier
  // (195, 227 or 263 px) and grows to the size its message needs, so every
  // one of these messages shows whole and a longer message gets a larger
  // planet.
  const byId = new Map(planets.map((p) => [p.id, p]));
  const d = (n: number) => byId.get(`00000000-0000-4000-8000-00000000000${n}`)!.d;
  expect(d(1)).toBeGreaterThanOrEqual(195);
  expect(d(4)).toBeGreaterThanOrEqual(195);
  expect(d(2)).toBeGreaterThanOrEqual(227);
  expect(d(3)).toBeGreaterThanOrEqual(263);
  expect(d(2)).toBeGreaterThan(Math.max(d(1), d(4)));
  expect(d(3)).toBeGreaterThan(d(2));
  for (const planet of planets) {
    expect(planet.singlePage, `${planet.id} shows whole`).toBe(true);
    expect(planet.width, `${planet.id} bubble matches its planet`).toBe(planet.d);
  }

  // Step past transition so only scene 10 remains in stage
  await frame.evaluate(() => {
    (window as any).colorPolishRuntime.step(3000);
  });
  await frame.waitForFunction(() => {
    const scenes = document.querySelectorAll('#stage .scene');
    return scenes.length === 1 && (scenes[0] as HTMLElement).dataset.scene === '10';
  });

  // Verify exactly 4 planet systems exist and each planet orb-slot is circular
  const planetCheck = await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"]');
    if (!scene) throw new Error('Scene 10 root not found');
    const planets = Array.from(scene.querySelectorAll<HTMLElement>('.planet-system'));
    const failures: Array<{ width: number; height: number }> = [];
    for (const p of planets) {
      const slot = p.querySelector<HTMLElement>('.orb-slot');
      if (!slot) {
        failures.push({ width: 0, height: 0 });
        continue;
      }
      const rect = slot.getBoundingClientRect();
      if (Math.abs(rect.width - rect.height) > 1) {
        failures.push({ width: rect.width, height: rect.height });
      }
    }
    return {
      count: planets.length,
      failures,
    };
  });
  expect(planetCheck.count).toBe(4);
  expect(planetCheck.failures).toHaveLength(0);

  const circleResult = await circularity(frame);
  expect(circleResult.failures).toHaveLength(0);
});

test("phrase computed font size in the centre is larger than the expression name font size", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 10, ms: 1000 });
  const sizes = await frame.evaluate(() => {
    const sun = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"] .orbit-sun');
    if (!sun) throw new Error('orbit-sun not found');
    const nameEl = sun.querySelector<HTMLElement>('h2, .orbit-sun-name');
    const phraseEl = sun.querySelector<HTMLElement>('p, .orbit-sun-phrase');
    if (!nameEl || !phraseEl) throw new Error('name or phrase element not found');
    const nameStyle = window.getComputedStyle(nameEl);
    const phraseStyle = window.getComputedStyle(phraseEl);
    return {
      nameFontSize: parseFloat(nameStyle.fontSize),
      phraseFontSize: parseFloat(phraseStyle.fontSize),
    };
  });
  expect(sizes.phraseFontSize).toBeGreaterThan(sizes.nameFontSize);
});

test('two probe runs with the same seed produce the same focused expression', async ({ context }) => {
  const page1 = await context.newPage();
  const { frame: frame1 } = await setupOrbitHarness(page1);
  const name1 = (await frame1.locator('.orbit-sun h2').innerText()).trim();
  await page1.close();

  const page2 = await context.newPage();
  const { frame: frame2 } = await setupOrbitHarness(page2);
  const name2 = (await frame2.locator('.orbit-sun h2').innerText()).trim();
  await page2.close();

  expect(name1).toBe(name2);
});

test('centre circle fits the name, full quote and description with a rim margin for all nine catalog expressions at 1920 and 3840 wide', async ({ page }) => {
  test.setTimeout(120000);
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(size);
    const frame = await loadRenderer(page, { scene: 10, ms: 1000 });
    for (let id = 1; id <= 9; id++) {
      // Force the centre expression: the next pass draws from the bag.
      await frame.evaluate((expressionId) => {
        (0, eval)(`ORBIT_BAG = [${expressionId}]; ORBIT_PASS_TOKEN = 0; renderNow(10);`);
      }, id);
      const shown = await frame.evaluate(() => ({
        name: document.querySelector('#stage .scene[data-scene="10"] .orbit-sun h2')?.textContent?.trim(),
        catalog: (window as any).colorPolishRuntime.catalog.map((e: { name: string }) => e.name),
      }));
      expect(shown.name, `centre shows expression ${id}`).toBe(shown.catalog[id - 1]);

      // A real margin: every line at least 4 percent of the circle's
      // diameter (about 19 px at 1920) inside its rim.
      const failures = await textFits(frame, '#stage .scene[data-scene="10"] .orbit-sun', { rimMargin: 0.04 });
      expect(failures, `centre expression ${id} at ${size.width} wide: ${JSON.stringify(failures)}`).toHaveLength(0);
    }
  }
});

const ORBIT_SIZES = [
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
];
const ORBIT_ROOT = '#stage .scene[data-scene="10"]';
const ORBIT_MOSTLY_IDS = ['mostly-short-1', 'mostly-short-2', 'mostly-emoji', 'mostly-250', 'mostly-400', 'mostly-500'];

// Plan 17 Lane 1, Orbit. A planet is drawn at 0.782 of its layout size at
// the back of the orbit and larger at the front, so the drawn message size is
// what the floor applies to. The largest planet the layout can give is the
// one drawn as tall as the room under the scene title all the way round,
// which holds the 500 grapheme product maximum whole: nothing pages.

/** Title bottom (layout px) and the room under it to the stage bottom, from the DOM. */
async function orbitRoom(frame: Frame) {
  return await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"]')!;
    const sceneRect = scene.getBoundingClientRect();
    const s = sceneRect.width / 1812;
    const title = scene.querySelector<HTMLElement>('.heading')!;
    const range = document.createRange();
    range.selectNodeContents(title);
    const t = range.getBoundingClientRect();
    const titleBottom = (t.bottom - sceneRect.top) / s;
    const titleRight = (t.right - sceneRect.left) / s;
    return { titleBottom, titleRight, cap: 636 - 4 - (titleBottom + 8) };
  });
}

/** Per planet: drawn diameter, drawn message font, top and left (layout px), all at this moment. */
async function orbitPlanets(frame: Frame) {
  return await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"]')!;
    const sceneRect = scene.getBoundingClientRect();
    const s = sceneRect.width / 1812;
    return Array.from(scene.querySelectorAll<HTMLElement>('.planet-system')).map((p) => {
      const slot = p.querySelector<HTMLElement>('.orb-slot')!;
      const msg = slot.querySelector<HTMLElement>('.message')!;
      const r = slot.getBoundingClientRect();
      const k = r.width / slot.offsetWidth;
      return { id: slot.dataset.recordId || '', drawn: r.width / s, drawnFont: (parseFloat(getComputedStyle(msg).fontSize) * k) / s, top: (r.top - sceneRect.top) / s, left: (r.left - sceneRect.left) / s, layout: slot.offsetWidth };
    });
  });
}

test('mostly-long fixture: every planet shows its message whole with a rim margin, drawn at the floor or larger, at 0, 6, 14 and 21 s at 1920 and 3840 wide', async ({ page }) => {
  test.setTimeout(240000);
  const fixture = buildMostlyLongFixture();
  for (const size of ORBIT_SIZES) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 10, ms, fixture });
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const where = `${size.width} wide at ${ms} ms`;
      const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: ORBIT_MOSTLY_IDS });
      expect(failures, `orbit text-fit failures at ${where}: ${JSON.stringify(failures)}`).toHaveLength(0);
      const readings = await bubbleReadings(frame, ORBIT_ROOT);
      expect(readings).toHaveLength(4);
      for (const reading of readings) {
        expect(reading.pages, `${reading.id} shows whole, ${where}`).toBe(1);
        expect(reading.drawnFont, `${reading.id} drawn size, ${where}`).toBeGreaterThanOrEqual(18 * (size.width / 1920) - 0.05);
      }
      await testPage.close();
    }
  }
});

test('over a full orbit every planet keeps its words at the drawn floor, never rises over the title, and never exceeds the room under it', async ({ page }) => {
  test.setTimeout(180000);
  for (const size of ORBIT_SIZES) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize(size);
    const frame = await loadRenderer(testPage, { scene: 10, ms: 0, fixture: buildLongOnlyFixture() });
    const room = await orbitRoom(frame);
    let minFont = Infinity, maxDrawn = 0, minTopOverTitle = Infinity;
    for (let t = 0; t < 80; t++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
      for (const p of await orbitPlanets(frame)) {
        minFont = Math.min(minFont, p.drawnFont);
        maxDrawn = Math.max(maxDrawn, p.drawn);
        if (p.left < room.titleRight) minTopOverTitle = Math.min(minTopOverTitle, p.top);
      }
    }
    const where = `${size.width} wide`;
    expect(minFont, `smallest drawn message size over 80 s, ${where}`).toBeGreaterThanOrEqual(18 - 0.05);
    expect(maxDrawn, `largest drawn planet stays inside the room under the title (${room.cap.toFixed(0)} px), ${where}`).toBeLessThanOrEqual(room.cap + 1);
    expect(minTopOverTitle, `a planet over the title's words stays below the title (bottom ${room.titleBottom.toFixed(0)}), ${where}`).toBeGreaterThanOrEqual(room.titleBottom + 4);
    await testPage.close();
  }
});

test('long-only fixture: 250, 400 and 500 grapheme planets show whole, and the 500 grapheme planet is drawn at the smallest circle its words fit', async ({ page }) => {
  test.setTimeout(120000);
  for (const size of ORBIT_SIZES) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize(size);
    const frame = await loadRenderer(testPage, { scene: 10, ms: 0, fixture: buildLongOnlyFixture() });
    const room = await orbitRoom(frame);
    let largest = 0;
    for (let t = 0; t < 40; t++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
      const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: ['mostly-emoji', 'mostly-250', 'mostly-400', 'mostly-500'] });
      expect(failures, `${size.width} wide at ${t} s: ${JSON.stringify(failures)}`).toHaveLength(0);
      for (const p of await orbitPlanets(frame)) if (p.id === 'mostly-500') largest = Math.max(largest, p.drawn);
    }
    const readings = await bubbleReadings(frame, ORBIT_ROOT);
    expect(new Set(readings.map((r) => r.id))).toEqual(new Set(['mostly-250', 'mostly-400', 'mostly-500', 'mostly-emoji']));
    for (const r of readings) expect(r.pages, `${r.id} shows whole`).toBe(1);
    // Plan 17 Lane 6 (Anthony, September 19, item 8): the product maximum
    // is the one message that cannot show whole inside the soft cap, so it
    // is the one planet allowed past it, and even then it is never
    // magnified: it is drawn at its layout size times the back-pass scale,
    // the smallest circle that still shows those words at the 18 px floor,
    // and it stays inside the room under the title.
    const five = readings.find((r) => r.id === 'mostly-500')!;
    expect(largest, `the 500 grapheme planet stays inside the room under the title (${room.cap.toFixed(0)} px)`).toBeLessThanOrEqual(room.cap + 1);
    expect(largest, 'the 500 grapheme planet needs more room than the soft cap').toBeGreaterThan(ORBIT_SOFT_CAP);
    expect(
      Math.abs(largest - five.diameter * ORBIT_K_MIN),
      `the 500 grapheme planet is never magnified: drawn ${largest.toFixed(1)} px against ${five.diameter} px of layout`,
    ).toBeLessThanOrEqual(3);
    console.log(`orbit ${size.width} wide: ${JSON.stringify(readings.map((r) => ({ id: r.id, diameter: r.diameter, pages: r.pages, font: r.font })))}`);
    await testPage.close();
  }
});

test('medium messages (120 to 220 characters) show whole in Orbit, drawn at the floor or larger, at 1920 and 3840 wide', async ({ page }) => {
  test.setTimeout(120000);
  for (const size of ORBIT_SIZES) {
    for (const ms of [0, 14000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 10, ms, fixture: buildMediumFixture() });
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1500));
      const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: [...MEDIUM_IDS, ...MEDIUM_SHORT_IDS] });
      expect(failures, `${size.width} wide at ${ms} ms: ${JSON.stringify(failures)}`).toHaveLength(0);
      const readings = await bubbleReadings(frame, ORBIT_ROOT);
      expect(readings).toHaveLength(4);
      for (const r of readings) {
        expect([...MEDIUM_IDS, ...MEDIUM_SHORT_IDS]).toContain(r.id);
        expect(r.pages, `${r.id} shows whole`).toBe(1);
      }
      await testPage.close();
    }
  }
});

test('a planet replaced on the far side is sized for its new message and still fits its rim', async ({ page }) => {
  test.setTimeout(120000);
  const base = buildMostlyLongFixture() as { recognitions: Array<Record<string, unknown>> };
  const extra = [
    ['orbit-90', 'Thank you for noticing when I was tired and quietly taking the heavy boxes out to the car for me.'],
    ['orbit-200', 'Thank you for staying late to help set up the hall, for greeting every family at the door with a warm smile, and for checking that the youngest children found a seat near their parents before it all began.'],
  ].map(([id, message]) =>
    recognition({ id, message, recipient: 'Kind Friend', expressionIds: [3], createdAt: '2026-09-10T16:00:00Z', firstPublishedAt: '2026-09-10T16:00:00Z', expiresAt: '2026-09-17T16:00:00Z' }),
  );
  const fixture = buildActiveDisplayFixture({
    recognitions: [...base.recognitions, ...extra],
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'orbit', enabled: true, durationSeconds: 600 }] },
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 10, fixture });
  for (let second = 10; second <= 120; second += 10) {
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(10000));
    const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: [...ORBIT_MOSTLY_IDS, 'orbit-90', 'orbit-200'] });
    expect(failures, `at ${second} s: ${JSON.stringify(failures)}`).toHaveLength(0);
  }
  const log = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().log as Array<{ type: string; id?: string }>);
  const replaced = log.filter((e) => e.type === 'orbit_backside_replace').map((e) => e.id);
  expect(replaced.length, 'at least one far-side replacement happened').toBeGreaterThan(0);
  for (const id of replaced) {
    expect(log.some((e) => e.type === 'orbit_bubble_fit' && e.id === id), `replacement ${id} was measured`).toBe(true);
  }
});

test('orbit bubble sizing re-measures once a still-loading document.fonts.ready resolves', async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 7301;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    window.requestAnimationFrame = () => 0;

    // Simulates the slow-font-load case the re-measure hook targets:
    // document.fonts.status is 'loading' at mount time, so orbit.js's hook
    // must register the re-measure rather than skip it (it skips when
    // status is already 'loaded', to avoid a redundant, log-duplicating
    // second pass in the ordinary already-loaded case).
    let resolveReady: () => void = () => {};
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const fakeFonts = { status: 'loading', ready: readyPromise };
    Object.defineProperty(document, 'fonts', { value: fakeFonts, configurable: true });
    (window as any).__resolveFontsReady = () => {
      fakeFonts.status = 'loaded';
      resolveReady();
    };
  });

  const fixture = buildMostlyLongFixture();
  const frame = await loadRenderer(page, { fixture });

  const fitCallCount = await frame.evaluate(async () => {
    const win = window as any;
    let calls = 0;
    const original = win.checkFullFits;
    win.checkFullFits = (...args: unknown[]) => {
      calls++;
      return original(...args);
    };
    // Triggers a fresh mount of scene 10 while fonts are still "loading":
    // core's postRender calls checkFullFits synchronously (one call), and
    // because document.fonts.status is 'loading', orbit.js's own hook
    // registers a second, deferred call for when fonts become ready.
    win.colorPolishRuntime.setScene(10);
    win.__resolveFontsReady();
    await win.document.fonts.ready;
    await Promise.resolve();
    await Promise.resolve();
    win.checkFullFits = original;
    return calls;
  });

  expect(fitCallCount).toBeGreaterThanOrEqual(2);
});


// ---------------------------------------------------------------------------
// Plan 17 Lane 6. Anthony's church TV watch, September 19, item 8:
// "Expression Orbit: the orbiting bubbles need to be smaller. The expression
// symbols and images need to revolve around the recognition; right now they
// go behind it."
// ---------------------------------------------------------------------------

/** The gold centre circle, the size orbit.css gives it. */
const ORBIT_SUN_DIAMETER = 480;
/** The soft cap orbit.js states: 70 percent of the centre circle, so the centre stays the dominant element. */
const ORBIT_SOFT_CAP = Math.round(ORBIT_SUN_DIAMETER * 0.7);
/** The hard cap orbit.js states: the room between the scene title and the bottom of the 636 px stage. */
const ORBIT_ROOM_CAP = 636 - 4 - 88;
/** The softened draw scale at the back of the ring, and the layout font floor that rests on it. */
const ORBIT_K_MIN = 1 + (1420 / 1815 - 1) * 0.35;
const ORBIT_FONT_FLOOR = Math.ceil((18 / ORBIT_K_MIN) * 10) / 10;
/** The largest layout diameter that is still drawn inside the soft cap. */
const ORBIT_SOFT_CAP_LAYOUT = Math.floor(ORBIT_SOFT_CAP / ORBIT_K_MIN);

/**
 * The layout font floor of tv17/fit 71bf3f8, the build Anthony watched on
 * the church TV: it drew a planet at 0.782 of its layout size at the back of
 * the ring, so its words needed 18 / 0.782 = 23.1 layout px, and every
 * planet had to be large enough to hold its message at that size. A planet
 * that cannot hold its own message at 23.1 px today is therefore strictly
 * smaller than the same record's planet in that build.
 */
const ORBIT_OLD_FONT_FLOOR = 23.1;
/**
 * Measured on tv17/fit 71bf3f8 with the sample snapshot (messages of 53 to
 * 90 characters) at 1920 and 3840 wide and at 0, 6, 14 and 21 s: planets
 * were 261 to 291 layout px and were drawn up to 399 px wide against the
 * 480 px centre circle.
 */
const ORBIT_OLD_MAX_DRAWN = 399;

type OrbitPlanetReading = {
  /** Position of this planet in the scene, stable for the whole showing even as records move between planets. */
  index: number;
  id: string;
  layout: number;
  drawn: number;
  long: boolean;
  slotZ: number;
  centre: { x: number; y: number };
  textRects: Array<{ left: number; top: number; right: number; bottom: number }>;
  moons: Array<{
    zIndex: number;
    rect: { left: number; top: number; right: number; bottom: number };
    /** Centre distance from the planet's centre, in stage layout px. */
    distance: number;
  }>;
};

/**
 * Per planet: its layout and drawn diameter (stage layout px), whether the
 * renderer marked it long, the computed z-index of its bubble, the rendered
 * rectangles of the recipient name and message lines, and every medallion's
 * rectangle, computed z-index and distance from the planet's centre.
 * Everything is read from the DOM, never from what orbit.js recorded.
 */
async function orbitPlanetReadings(frame: Frame): Promise<OrbitPlanetReading[]> {
  return await frame.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('#stage .scene[data-scene="10"]');
    if (!scene) return [];
    const sceneRect = scene.getBoundingClientRect();
    const s = sceneRect.width / 1812;
    const box = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    return Array.from(scene.querySelectorAll<HTMLElement>('.planet-system')).map((planet, index) => {
      const slot = planet.querySelector<HTMLElement>('.orb-slot')!;
      const rect = slot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const textRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
      slot.querySelectorAll<HTMLElement>('.recipient, .message').forEach((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        for (const r of Array.from(range.getClientRects())) if (r.width > 0 && r.height > 0) textRects.push(box(r));
      });
      const moons = Array.from(planet.querySelectorAll<HTMLElement>('.orbit-moon')).map((moon) => {
        const r = moon.getBoundingClientRect();
        return {
          zIndex: parseInt(window.getComputedStyle(moon).zIndex || '0', 10),
          rect: box(r),
          distance: Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy) / s,
        };
      });
      return {
        index,
        id: slot.dataset.recordId || '',
        layout: slot.offsetWidth,
        drawn: rect.width / s,
        long: slot.dataset.long === 'true',
        slotZ: parseInt(window.getComputedStyle(slot).zIndex || '0', 10),
        centre: { x: cx, y: cy },
        textRects,
        moons,
      };
    });
  });
}

const rectsOverlap = (
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  tolerance = 0.5,
) => a.left < b.right - tolerance && a.right > b.left + tolerance && a.top < b.bottom - tolerance && a.bottom > b.top + tolerance;

test('the orbiting bubbles are smaller than the build Anthony watched and the gold centre stays the dominant circle', async ({ page }) => {
  test.setTimeout(180000);
  const sample = buildColorPolishSampleSnapshot() as unknown as Record<string, unknown>;
  for (const size of ORBIT_SIZES) {
    for (const ms of [0, 6000, 14000, 21000]) {
      const testPage = await page.context().newPage();
      await testPage.setViewportSize(size);
      const frame = await loadRenderer(testPage, { scene: 10, ms, fixture: sample });
      const where = `${size.width} wide at ${ms} ms`;
      const planets = await orbitPlanetReadings(frame);
      expect(planets, where).toHaveLength(4);
      for (const planet of planets) {
        expect(planet.drawn, `${planet.id} stays inside the soft cap, ${where}`).toBeLessThanOrEqual(ORBIT_SOFT_CAP + 1);
        expect(planet.drawn, `${planet.id} drawn well below the old ${ORBIT_OLD_MAX_DRAWN} px peak, ${where}`).toBeLessThanOrEqual(ORBIT_OLD_MAX_DRAWN * 0.85);
        expect(planet.drawn, `${planet.id} against the ${ORBIT_SUN_DIAMETER} px centre, ${where}`).toBeLessThan(ORBIT_SUN_DIAMETER);
        // Strictly smaller than the same record's planet in the build
        // Anthony watched: its message does not fit this circle at the old
        // 23.1 px layout floor, so that build had to draw it larger.
        expect(
          await fitsWhole(frame, planet.id, planet.layout, ORBIT_OLD_FONT_FLOOR),
          `${planet.id} at ${planet.layout} px is smaller than the old build's planet for the same record, ${where}`,
        ).toBe(false);
      }
      // Every message still shows whole, at the drawn floor or larger.
      const failures = await textFits(frame, ORBIT_ROOT);
      expect(failures, `orbit text-fit failures at ${where}: ${JSON.stringify(failures)}`).toHaveLength(0);
      for (const reading of await bubbleReadings(frame, ORBIT_ROOT)) {
        expect(reading.pages, `${reading.id} shows whole, ${where}`).toBe(1);
        expect(reading.drawnFont, `${reading.id} drawn size, ${where}`).toBeGreaterThanOrEqual(18 * (size.width / 1920) - 0.05);
      }
      await testPage.close();
    }
  }
});

test('a planet is drawn wider than the soft cap only when its own message cannot show whole any smaller', async ({ page }) => {
  test.setTimeout(180000);
  for (const fixture of [buildMostlyLongFixture(), buildLongOnlyFixture(), buildMediumFixture()]) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(testPage, { scene: 10, ms: 0, fixture });
    for (let t = 0; t < 30; t++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));
      for (const planet of await orbitPlanetReadings(frame)) {
        expect(planet.drawn, `${planet.id} stays inside the room under the title at ${t * 2} s`).toBeLessThanOrEqual(ORBIT_ROOM_CAP + 1);
        if (planet.drawn <= ORBIT_SOFT_CAP + 1) continue;
        // Judged by text-fits.ts's own geometry, not by anything orbit.js
        // wrote: this record really could not have shown whole inside the
        // soft cap at the layout font floor.
        const couldFit = await fitsWhole(frame, planet.id, ORBIT_SOFT_CAP_LAYOUT, ORBIT_FONT_FLOOR);
        expect(
          couldFit,
          `${planet.id} is drawn ${planet.drawn.toFixed(0)} px, past the ${ORBIT_SOFT_CAP} px soft cap, at ${t * 2} s, so its message must not fit whole at ${ORBIT_SOFT_CAP_LAYOUT} px`,
        ).toBe(false);
      }
    }
    await testPage.close();
  }
});

test('orbit.js states the soft cap and the hard cap it measures against', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 10, ms: 1000, fixture: buildMostlyLongFixture() });
  const fits = await frame.evaluate(() =>
    ((window as any).colorPolishRuntime.getState().log as Array<Record<string, unknown>>).filter((e) => e.type === 'orbit_bubble_fit'),
  );
  expect(fits.length).toBeGreaterThan(0);
  for (const entry of fits) {
    expect(entry.softCap, 'stated soft cap').toBe(ORBIT_SOFT_CAP);
    expect(entry.drawnCap, 'stated hard cap').toBe(ORBIT_ROOM_CAP);
    expect(entry.font as number, 'layout font floor or larger').toBeGreaterThanOrEqual(ORBIT_FONT_FLOOR);
    expect(entry.verbatim, `${entry.id} keeps every word`).toBe(true);
  }
});

test('the expression medallions revolve around their recognition: in front on the near half, behind on the far half, never over the name or the message', async ({ page }) => {
  test.setTimeout(300000);
  // The mostly-long fixture puts a record too long for smallFits() on screen,
  // so the data-long layer that used to bury every medallion is exercised.
  for (const fixture of [buildMostlyLongFixture()]) {
    const testPage = await page.context().newPage();
    await testPage.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(testPage, { scene: 10, ms: 0, fixture });
    const front = new Map<string, boolean>();
    const behind = new Map<string, boolean>();
    let sawLongPlanet = false;
    let moonSamples = 0;

    // A medallion completes its ring in 9 to 19 s, so 30 one-second steps
    // carry every one of them all the way round at least once.
    for (let t = 0; t < 30; t++) {
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(1000));
      for (const planet of await orbitPlanetReadings(frame)) {
        // renderer.css lifts a bubble holding a long message to z-index 940,
        // which would bury every medallion behind it; inside a planet the
        // bubble must stay on layer 2, between the far and near medallion.
        expect(planet.slotZ, `${planet.id} bubble layer at ${t} s`).toBe(2);
        if (planet.long) sawLongPlanet = true;
        expect(planet.moons.length, `${planet.id} has medallions`).toBeGreaterThan(0);
        planet.moons.forEach((moon, index) => {
          // Keyed by the planet's position, not by the record it happens to
          // hold: a far-side replacement moves records between planets.
          const key = `planet ${planet.index} medallion ${index}`;
          moonSamples++;
          if (moon.zIndex > planet.slotZ) {
            front.set(key, true);
            // A medallion painted in front of the bubble must pass around
            // its rim, never across the recipient name or the message.
            expect(
              moon.distance,
              `${key} passes outside the rim while in front at ${t} s (${moon.distance.toFixed(1)} vs radius ${(planet.drawn / 2).toFixed(1)})`,
            ).toBeGreaterThanOrEqual(planet.drawn / 2 - 1);
            for (const textRect of planet.textRects) {
              expect(
                rectsOverlap(moon.rect, textRect),
                `${key} covers words of ${planet.id} at ${t} s`,
              ).toBe(false);
            }
          } else if (moon.zIndex < planet.slotZ) {
            behind.set(key, true);
          }
        });
      }
    }

    expect(moonSamples, 'medallions were sampled').toBeGreaterThan(0);
    expect(sawLongPlanet, 'a planet holding a long message was on screen').toBe(true);
    const keys = new Set([...front.keys(), ...behind.keys()]);
    expect(keys.size, 'medallions seen').toBeGreaterThan(0);
    for (const key of keys) {
      expect(front.get(key) === true, `${key} passed in front of its bubble`).toBe(true);
      expect(behind.get(key) === true, `${key} passed behind its bubble`).toBe(true);
    }
    await testPage.close();
  }
});

test('orbit holds through a full showing at both the 30 and the 60 second dwell', async ({ page }) => {
  test.setTimeout(240000);
  for (const dwell of [30, 60]) {
    const fixture = buildMostlyLongFixture({
      presentation: {
        version: 'color-polish-v6',
        enabled: true,
        playlist: [{ id: 'orbit', enabled: true, durationSeconds: dwell }],
      },
    });
    const testPage = await page.context().newPage();
    await testPage.setViewportSize({ width: 1920, height: 1080 });
    const frame = await loadRenderer(testPage, { scene: 10, ms: 0, fixture });
    const runtimeDwell = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().visual.dwell[10] as number);
    expect(runtimeDwell, 'the scene reads its dwell from the snapshot').toBe(dwell);

    const positions: Array<{ second: number; planets: Array<{ x: number; y: number }>; moons: Array<{ x: number; y: number }> }> = [];
    for (let second = 0; second <= dwell; second += 5) {
      const where = `dwell ${dwell} s at ${second} s`;
      const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: ORBIT_MOSTLY_IDS });
      expect(failures, `${where}: ${JSON.stringify(failures)}`).toHaveLength(0);
      const planets = await orbitPlanetReadings(frame);
      expect(planets, `${where}: four planets`).toHaveLength(4);
      for (const planet of planets) {
        expect(planet.id, `${where}: every planet still holds a record`).not.toBe('');
        expect(planet.drawn, `${where}: ${planet.id} inside the room under the title`).toBeLessThanOrEqual(ORBIT_ROOM_CAP + 1);
      }
      positions.push({
        second,
        planets: planets.map((p) => p.centre),
        moons: planets.flatMap((p) => p.moons.map((m) => ({ x: (m.rect.left + m.rect.right) / 2, y: (m.rect.top + m.rect.bottom) / 2 }))),
      });
      for (const reading of await bubbleReadings(frame, ORBIT_ROOT)) {
        expect(reading.drawnFont, `${where}: ${reading.id} drawn size`).toBeGreaterThanOrEqual(18 - 0.05);
      }
      await frame.evaluate(() => (window as any).colorPolishRuntime.step(5000));
    }

    // Nothing stops partway through the showing: both the planets and their
    // medallions are still travelling in the last third of the dwell.
    const late = positions.filter((p) => p.second >= Math.floor(dwell * 0.6));
    expect(late.length, `dwell ${dwell} s: samples in the last third`).toBeGreaterThanOrEqual(2);
    const first = late[0];
    const last = late[late.length - 1];
    const planetTravel = Math.max(...first.planets.map((p, i) => Math.hypot(p.x - last.planets[i].x, p.y - last.planets[i].y)));
    const moonTravel = Math.max(...first.moons.map((m, i) => Math.hypot(m.x - last.moons[i].x, m.y - last.moons[i].y)));
    expect(planetTravel, `dwell ${dwell} s: planets still moving between ${first.second} s and ${last.second} s`).toBeGreaterThan(20);
    expect(moonTravel, `dwell ${dwell} s: medallions still revolving between ${first.second} s and ${last.second} s`).toBeGreaterThan(20);
    await testPage.close();
  }
});

// ---------------------------------------------------------------------------
// Plan 17 Lane 6 review (coordinator direction, September 19): a message that
// cannot show whole inside the soft cap is not chosen for Orbit while the
// pool still holds messages that do; only a pool with too few of those shows
// a longer one, in one planet, at the smallest circle its words fit.
// ---------------------------------------------------------------------------

test('with enough fitting messages in the pool, no planet ever holds one too long for the soft cap, through a 60 second showing with far-side replacements', async ({ page }) => {
  test.setTimeout(300000);
  const long = buildMostlyLongFixture() as { recognitions: Array<Record<string, unknown>> };
  const medium = buildMediumFixture() as { recognitions: Array<Record<string, unknown>> };
  // Nine long records (250, 400 and 500 graphemes, three copies each under
  // their own ids) against the fitting ones, so a chooser that ignores the
  // rule puts a long one on screen at once.
  const longIds = ['mostly-250', 'mostly-400', 'mostly-500'];
  const copies = [1, 2].flatMap((n) =>
    long.recognitions.filter((r) => longIds.includes(r.id as string)).map((r) => ({ ...r, id: `${r.id}-copy-${n}` })),
  );
  const tooLong = [...longIds, ...copies.map((r) => r.id as string)];
  const fixture = buildActiveDisplayFixture({
    recognitions: [...long.recognitions, ...copies, ...medium.recognitions],
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'orbit', enabled: true, durationSeconds: 60 }] },
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 10, ms: 0, fixture });
  // The pool really does hold messages too long for the soft cap, judged by
  // text-fits.ts's own geometry, so the rule has something to refuse.
  for (const id of tooLong) {
    expect(await fitsWhole(frame, id, ORBIT_SOFT_CAP_LAYOUT, ORBIT_FONT_FLOOR), `${id} cannot fit the soft cap`).toBe(false);
  }
  const seen = new Set<string>();
  for (let second = 0; second <= 60; second += 2) {
    const planets = await orbitPlanetReadings(frame);
    expect(planets, `four planets at ${second} s`).toHaveLength(4);
    for (const planet of planets) {
      seen.add(planet.id);
      expect(tooLong, `${planet.id} on screen at ${second} s`).not.toContain(planet.id);
      expect(planet.drawn, `${planet.id} drawn inside the soft cap at ${second} s`).toBeLessThanOrEqual(ORBIT_SOFT_CAP + 1);
      expect(
        await fitsWhole(frame, planet.id, ORBIT_SOFT_CAP_LAYOUT, ORBIT_FONT_FLOOR) || await fitsWhole(frame, planet.id, 334, ORBIT_FONT_FLOOR),
        `${planet.id} fits whole inside the soft cap at ${second} s`,
      ).toBe(true);
    }
    const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: [...seen] });
    expect(failures, `at ${second} s: ${JSON.stringify(failures)}`).toHaveLength(0);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(2000));
  }
  const log = await frame.evaluate(() => (window as any).colorPolishRuntime.getState().log as Array<{ type: string; id?: string }>);
  expect(log.filter((e) => e.type === 'orbit_backside_replace').length, 'far-side replacements happened').toBeGreaterThan(0);
  expect(seen.size, 'more than the first four records were shown').toBeGreaterThan(4);
});

test('with too few fitting messages, exactly one planet holds a longer one, never magnified, and the fitting planets keep fitting records', async ({ page }) => {
  test.setTimeout(300000);
  // Three records fit the soft cap (two short, the emoji one); 250, 400 and
  // 500 graphemes do not. Four planets, so one of them must take a long one.
  const fixture = buildMostlyLongFixture({
    presentation: { version: 'color-polish-v6', enabled: true, playlist: [{ id: 'orbit', enabled: true, durationSeconds: 90 }] },
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const frame = await loadRenderer(page, { scene: 10, ms: 0, fixture });
  const longIds = ['mostly-250', 'mostly-400', 'mostly-500'];
  for (let second = 0; second <= 90; second += 3) {
    const planets = await orbitPlanetReadings(frame);
    expect(planets, `four planets at ${second} s`).toHaveLength(4);
    const longOnes = planets.filter((p) => longIds.includes(p.id));
    expect(longOnes.map((p) => p.id), `exactly one longer message on screen at ${second} s`).toHaveLength(1);
    expect(new Set(planets.map((p) => p.id)).size, `no record twice at ${second} s`).toBe(4);
    for (const planet of planets) {
      if (longIds.includes(planet.id)) {
        expect(
          Math.abs(planet.drawn - planet.layout * ORBIT_K_MIN),
          `${planet.id} is never magnified at ${second} s: drawn ${planet.drawn.toFixed(1)} px against ${planet.layout} px of layout`,
        ).toBeLessThanOrEqual(3);
        expect(planet.drawn, `${planet.id} inside the room under the title`).toBeLessThanOrEqual(ORBIT_ROOM_CAP + 1);
      } else {
        expect(planet.drawn, `${planet.id} drawn inside the soft cap at ${second} s`).toBeLessThanOrEqual(ORBIT_SOFT_CAP + 1);
      }
    }
    const failures = await textFits(frame, ORBIT_ROOT, { singlePageIds: ORBIT_MOSTLY_IDS });
    expect(failures, `at ${second} s: ${JSON.stringify(failures)}`).toHaveLength(0);
    await frame.evaluate(() => (window as any).colorPolishRuntime.step(3000));
  }
});
