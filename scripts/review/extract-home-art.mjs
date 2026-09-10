// One-time, reproducible extraction of artwork only. Never evaluate prototype JS.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
const source = process.argv[2] ? readFileSync(process.argv[2]) : execFileSync('git', ['show', '6a5da4d5abfb658c28a9814d585db4f288f797cf:prototypes/tv-v6/Mothers_Love_TV_Prototype_v6.html'], { maxBuffer: 10_000_000 });
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== '9fd625cea86eebd6d8cf342b375cb86b65bb9466ec49726d55e208f78707d45e') throw new Error('Wrong V6 visual reference');
const match = source.toString().match(/const ASSETS=(\{.*?\});/s);
if (!match) throw new Error('Artwork dictionary missing');
const assets = JSON.parse(match[1]);
mkdirSync('public/home-art', { recursive: true });
const manifest = { referenceSha256: hash, files: [] };
for (const name of ['community', ...Array.from({ length: 9 }, (_, i) => `icon${i + 1}`)]) {
  const uri = assets[name];
  if (typeof uri !== 'string' || !uri.startsWith('data:image/png;base64,')) throw new Error(`Missing artwork ${name}`);
  const bytes = await sharp(Buffer.from(uri.split(',')[1], 'base64')).resize({ width: name === 'community' ? 1000 : 96, withoutEnlargement: true }).webp({ quality: 85, alphaQuality: 100 }).toBuffer();
  const path = `public/home-art/${name}.webp`;
  writeFileSync(path, bytes);
  manifest.files.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
writeFileSync('public/home-art/provenance.json', JSON.stringify(manifest, null, 2) + '\n');
