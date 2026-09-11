import { expect, test } from '@playwright/test';
import {
  circularity,
  noOverflow,
  openStudioScene,
  reducedMotionScene,
  studioClickDoesNotAdvance,
} from './helpers';

test('orbit renders circular planets and no overflow at 14 s', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'orbit', 14000);

  const circleResult = await circularity(frame);
  expect(circleResult.count).toBeGreaterThan(0);
  expect(circleResult.failures).toHaveLength(0);

  const overflow = await noOverflow(frame);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight);

  const clickResult = await studioClickDoesNotAdvance(page, frame);
  expect(clickResult.before).toBe(clickResult.after);
});

test('planets orbit in 3D at the slower rate', async ({ page }) => {
  const { frame } = await openStudioScene(page, 'orbit', 1000);

  type OrbitSample = {
    ms: number;
    orbit: Array<{ id: string; z: number; scale: number; moons: number }>;
    zIndices: number[];
  };

  const checkpoints = [1000, 6000, 11000, 16000, 21000, 26000];
  const samples: OrbitSample[] = [];
  let currentMs = 1000;

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
  expect(measuredRate!).toBeGreaterThanOrEqual(0.082 * 0.92);
  expect(measuredRate!).toBeLessThanOrEqual(0.082 * 1.08);
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
