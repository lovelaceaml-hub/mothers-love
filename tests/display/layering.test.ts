import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const displayCss = readFileSync(resolve(process.cwd(), 'src/components/display/DisplayExperience.module.css'), 'utf8');
const gardenCss = readFileSync(resolve(process.cwd(), 'src/components/display/garden/Garden.module.css'), 'utf8');

function declaration(css: string, selector: string, property: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1];
  expect(block, `Expected a CSS block for ${selector}`).toBeDefined();
  const value = block?.match(new RegExp(`${property}\\s*:\\s*([^;]+);`))?.[1].trim();
  expect(value, `Expected ${property} in ${selector}`).toBeDefined();
  return value ?? '';
}

describe('display decorative layering', () => {
  it('keeps app atmosphere above the opaque app background and below the display content', () => {
    expect(Number(declaration(displayCss, '.atmosphere', 'z-index'))).toBe(0);
    expect(Number(declaration(displayCss, '.stage', 'z-index'))).toBeGreaterThan(0);
    expect(Number(declaration(displayCss, '.displayHeader', 'z-index'))).toBeGreaterThan(Number(declaration(displayCss, '.atmosphere', 'z-index')));
    expect(displayCss).toMatch(/\.atmosphere\s*\{[\s\S]*?pointer-events:\s*none;/);
  });

  it('keeps Garden wash and effects behind readable cards', () => {
    const wash = Number(declaration(gardenCss, '.backgroundWash', 'z-index'));
    const sparkles = Number(declaration(gardenCss, '.sparkleField', 'z-index'));
    const constellation = Number(declaration(gardenCss, '.constellation', 'z-index'));
    const cards = Number(declaration(gardenCss, '.cards', 'z-index'));
    const waitingBuds = Number(declaration(gardenCss, '.waitingBuds', 'z-index'));

    expect(wash).toBeLessThan(sparkles);
    expect(sparkles).toBeLessThan(constellation);
    expect(constellation).toBeLessThan(cards);
    expect(cards).toBeLessThan(waitingBuds);
    expect(gardenCss).toMatch(/\.card\s*\{[\s\S]*?background:\s*rgba\(255, 253, 247, 0\.98\);/);
    expect(gardenCss).toContain('animation: backgroundBreathe var(--garden-background-duration, 16s) ease-in-out infinite;');
    expect(gardenCss).toContain('animation: sparkleTwinkle var(--garden-sparkle-duration, 6.5s) ease-in-out infinite;');
    expect(gardenCss).toContain('animation: budBreathe var(--garden-bud-duration, 5.5s) ease-in-out infinite;');
    expect(gardenCss).toContain('animation: gardenDrift var(--garden-drift-duration, 14s) ease-in-out infinite;');
  });

  it('retains the reduced-motion animation overrides for both contexts', () => {
    expect(displayCss).toMatch(/\.displayApp\.motionstill[\s\S]*?animation:\s*none\s*!important;/);
    expect(displayCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.displayApp \*[\s\S]*?animation:\s*none\s*!important;/);
    expect(gardenCss).toMatch(/\.reducedMotion \.backgroundWash[\s\S]*?animation:\s*none;/);
    expect(gardenCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.backgroundWash[\s\S]*?animation:\s*none;/);
  });
});
