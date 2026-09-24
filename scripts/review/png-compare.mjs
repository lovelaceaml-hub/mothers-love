// Usage: node scripts/review/png-compare.mjs <dirA> <dirB>
// Compares every PNG in dirA with the file of the same name in dirB: byte identical first, then
// how many pixels differ, the largest channel difference and where (Plan 28 Section 5).
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const [a, b] = process.argv.slice(2);
let differing = 0;
for (const name of readdirSync(a).filter(n => n.endsWith('.png')).sort()) {
  const other = path.join(b, name);
  if (!existsSync(other)) { console.log(`MISSING ${name}`); differing++; continue; }
  const x = readFileSync(path.join(a, name)), y = readFileSync(other);
  if (Buffer.compare(x, y) === 0) { console.log(`BYTES-IDENTICAL ${name}`); continue; }
  const p = PNG.sync.read(x), q = PNG.sync.read(y);
  if (p.width !== q.width || p.height !== q.height) { console.log(`SIZE ${name} ${p.width}x${p.height} vs ${q.width}x${q.height}`); differing++; continue; }
  let count = 0, max = 0, box = null;
  for (let i = 0; i < p.data.length; i += 4) {
    const d = Math.max(Math.abs(p.data[i] - q.data[i]), Math.abs(p.data[i + 1] - q.data[i + 1]), Math.abs(p.data[i + 2] - q.data[i + 2]), Math.abs(p.data[i + 3] - q.data[i + 3]));
    if (d) {
      count++; max = Math.max(max, d);
      const px = (i / 4) % p.width, py = Math.floor(i / 4 / p.width);
      box = box ? [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)] : [px, py, px, py];
    }
  }
  if (count) differing++;
  console.log(`${count ? 'PIXELS-DIFFER' : 'PIXEL-IDENTICAL'} ${name} pixels=${count} maxChannelDelta=${max} box=${box ? box.join(',') : '-'}`);
}
console.log(`files with differing pixels: ${differing}`);
process.exitCode = differing ? 1 : 0;
