import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const prototypePath = path.join(
    process.cwd(),
    'prototypes',
    'tv-v6',
    'Mothers_Love_TV_Prototype_v6.html',
  );

  const html = await readFile(prototypePath, 'utf8');

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
