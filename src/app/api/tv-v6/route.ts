import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-static';

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    'prototypes',
    'tv-v6',
    'Mothers_Love_TV_Prototype_v6.html',
  );
  const html = await readFile(filePath, 'utf8');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
