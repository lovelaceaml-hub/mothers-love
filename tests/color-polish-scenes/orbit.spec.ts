import { expect, test, type Frame, type Page } from '@playwright/test';
import {
  buildActiveDisplayFixture,
  circularity,
  loadRenderer,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';
import { buildColorPolishSampleSnapshot } from '../../src/components/display/color-polish/sample';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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
  // computed filter contains a blur of at least 1.2 px and its opacity is at most .75
  const blurMatch = lowest.filter.match(/blur\(([\d.]+)px\)/);
  expect(blurMatch).not.toBeNull();
  const blurPx = parseFloat(blurMatch![1]);
  expect(blurPx).toBeGreaterThanOrEqual(1.2);
  expect(lowest.opacity).toBeLessThanOrEqual(0.75);

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

test('centre element bounding box is at least 1.5 times the true largest tier (263 px) with a long message', async ({ page }) => {
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

    return {
      sunWidth: sunRect.width / scale,
      sunHeight: sunRect.height / scale,
      largestBaseDiameter,
    };
  });

  expect(result.largestBaseDiameter).toBe(263);
  expect(result.sunWidth).toBeGreaterThanOrEqual(263 * 1.5);
  expect(result.sunHeight).toBeGreaterThanOrEqual(263 * 1.5);
});

test('three distinct orbiting bubble diameters appear for short, medium and long messages and stay circular', async ({ page }) => {
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

  const diameters = await frame.evaluate(() => {
    const runtime = (window as any).colorPolishRuntime;
    const slots = runtime.getState().slots as Array<{ d: number }>;
    return slots.map((s) => s.d);
  });

  const uniqueDiameters = Array.from(new Set(diameters)).sort((a, b) => a - b);
  expect(uniqueDiameters).toEqual([195, 227, 263]);

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

