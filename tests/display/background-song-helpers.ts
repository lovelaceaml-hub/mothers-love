import { expect, type Page, type Route } from '@playwright/test';
import { buildActiveDisplayFixture } from '../color-polish-scenes/helpers';

// The campaign song behind the TV view, played here as a synthetic one second
// tone so no real audio is needed.
export function toneWav(): Buffer {
  const rate = 8000, samples = rate;
  const data = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

export async function openDisplay(page: Page, options: { mode?: () => string; song?: boolean; expectPhase?: string } = {}) {
  const fixture = buildActiveDisplayFixture() as Record<string, any>;
  await page.route('**/api/**', (route) => json(route, { items: [] }));
  await page.route('**/api/display/color-polish**', (route) => {
    const mode = options.mode?.() ?? 'normal';
    return json(route, mode === 'normal' ? fixture : { ...fixture, settings: { ...fixture.settings, mode }, recognitions: [] });
  });
  await page.route('**/display/campaign-song.mp3', (route) =>
    options.song === false ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ status: 200, contentType: 'audio/wav', body: toneWav() }),
  );
  await page.goto('/display');
  await expect(page.locator(`[data-display-phase="${options.expectPhase ?? 'active'}"]`)).toBeVisible();
}

export const audioState = (page: Page) =>
  page.getByTestId('display-song').evaluate((audio: HTMLAudioElement) => ({ paused: audio.paused, loop: audio.loop, volume: audio.volume }));

