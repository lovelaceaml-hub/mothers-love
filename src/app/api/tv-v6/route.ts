import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { LATEST_TV_COLOR_POLISH } from './latest-color-polish';

export const dynamic = 'force-static';

const COLOR_POLISH_TAG = `<style id="color-polish">${LATEST_TV_COLOR_POLISH}</style>`;
const EXISTING_COLOR_POLISH = /<style\s+id=["']color-polish["'][^>]*>[\s\S]*?<\/style>/i;

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    'prototypes',
    'tv-v6',
    'Mothers_Love_TV_Prototype_v6.html',
  );
  const source = await readFile(filePath, 'utf8');

  // The production V6 prototype remains the behavioral/layout source of truth.
  // Always replace any older color pass with the exact latest reviewed pass.
  const withoutPreviousPolish = source.replace(EXISTING_COLOR_POLISH, '');
  const html = withoutPreviousPolish.replace(
    '</head>',
    `${COLOR_POLISH_TAG}<meta name="mothers-love-tv-version" content="20260910-1006-color-material" /></head>`,
  );

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'X-Mothers-Love-TV-Version': '20260910-1006-color-material',
    },
  });
}
