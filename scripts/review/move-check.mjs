// Usage: node scripts/review/move-check.mjs <repo> <baseRef> <oldPath> <newPath>... [--head=<ref>]
// Plan 28 Section 7: the move proof for every split, for its landing and completion reviews.
// Proves a split is a move. Every non-import line of <oldPath> at <baseRef> must reappear in the
// union of the new files (compared after trimming indentation, with an added leading `export `
// or a dropped `private` ignored), as many times as it appeared. Every new line that did not exist before is listed,
// so the reviewer reads only the scaffolding: imports, re-exports and extraction wrappers.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const head = args.find(a => a.startsWith('--head='))?.slice(7);
const [repo, base, oldPath, ...newPaths] = args.filter(a => !a.startsWith('--'));
const show = (ref, p) => execFileSync('git', ['-C', repo, 'show', `${ref}:${p}`], { encoding: 'utf8', maxBuffer: 50e6 });
const read = p => head ? show(head, p) : fs.readFileSync(path.join(repo, p), 'utf8');

function codeLines(src) {
  const out = [];
  let inImport = false;
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (inImport) { if (/^}\s*from\s+['"].*['"];?$/.test(line) || /from\s+['"].*['"];?$/.test(line)) inImport = false; continue; }
    if (/^import\s/.test(line)) { if (!/from\s+['"].*['"];?$/.test(line) && !/^import\s+['"].*['"];?$/.test(line)) inImport = true; continue; }
    out.push(line);
  }
  return out;
}
// An added `export`, or a `private` the class tool dropped, is not a change of code.
const key = l => l.replace(/^export\s+(?!\{|\*|type\s*\{|default)/, '').replace(/^private\s+/, '');
const oldLines = codeLines(show(base, oldPath));
const pool = new Map();
for (const l of oldLines) pool.set(key(l), (pool.get(key(l)) ?? 0) + 1);
const added = [];
let newCount = 0;
for (const p of newPaths) {
  const lines = codeLines(read(p));
  newCount += lines.length;
  for (const l of lines) {
    const k = key(l);
    if (pool.get(k)) pool.set(k, pool.get(k) - 1);
    else added.push(`${p}: ${l}`);
  }
}
const missing = [...pool.entries()].filter(([, n]) => n > 0).flatMap(([l, n]) => Array(n).fill(l));
console.log(`old ${oldPath}@${base}: ${oldLines.length} code lines; new files: ${newCount} code lines`);
console.log(`moved: ${oldLines.length - missing.length}; missing from the new files: ${missing.length}; lines that did not exist before: ${added.length}`);
for (const l of missing) console.log(`MISSING ${l}`);
for (const l of added) console.log(`ADDED ${l}`);
process.exitCode = missing.length ? 1 : 0;
