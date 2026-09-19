/** Generate static icons from Anthony's approved butterfly-and-heart artwork. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Next.js already installs sharp for its image pipeline; no new dependency.
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await readFile(path.join(root, 'assets/app-icon/butterfly-heart-v1.avif'));
const expected = 'da7eae2d8b7f13554932b619ea673e16d69c6ea0209fe6332e7b17c3be1b26ef';
if (createHash('sha256').update(source).digest('hex') !== expected) {
  throw new Error('Approved app-icon source checksum does not match.');
}
const metadata = await sharp(source).metadata();
if (metadata.width !== 512 || metadata.height !== 512) {
  throw new Error('The approved app-icon source must be 512 by 512.');
}
const destination = path.join(root, 'public/icons');
await mkdir(destination, { recursive: true });
for (const size of [16, 32, 48, 64, 180, 192, 512]) {
  const png = await sharp(source)
    .resize(size, size, { fit: 'contain', kernel: 'lanczos3' })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(destination, `butterfly-heart-v1-${size}.png`), png);
  if (size === 180) {
    await writeFile(path.join(root, 'public/apple-touch-icon.png'), png);
  }
}
// A real multi-resolution ICO supports browsers that request /favicon.ico.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size =>
  sharp(source).resize(size, size).ensureAlpha().png().toBuffer()
));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i += 1) {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[i].length;
}
await writeFile(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...images]));
console.log('Generated static butterfly-heart app icons.');
