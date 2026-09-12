#!/usr/bin/env node
// Check for duplicate top-level declarations across renderer scripts in renderer.html
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseVarNamesFromStatement(stmt) {
  const names = [];
  const m = stmt.match(/^(?:const|let|var)\s+/);
  if (!m) return names;
  let idx = m[0].length;

  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let lookingForIdent = true;

  while (idx < stmt.length) {
    const ch = stmt[idx];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === stringChar) {
        inString = false;
      }
      idx++;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      idx++;
      continue;
    }

    if (ch === '(') {
      openParens++;
      lookingForIdent = false;
    } else if (ch === ')') {
      openParens = Math.max(0, openParens - 1);
    } else if (ch === '{') {
      openBraces++;
    } else if (ch === '}') {
      openBraces = Math.max(0, openBraces - 1);
    } else if (ch === '[') {
      openBrackets++;
    } else if (ch === ']') {
      openBrackets = Math.max(0, openBrackets - 1);
    }

    if (openBraces === 0 && openParens === 0 && openBrackets === 0) {
      if (ch === ';') break;
      if (ch === ',') {
        lookingForIdent = true;
        idx++;
        continue;
      }
      if (lookingForIdent && /[a-zA-Z0-9_$]/.test(ch)) {
        const idMatch = stmt.slice(idx).match(/^[a-zA-Z0-9_$]+/);
        if (idMatch) {
          names.push(idMatch[0]);
          idx += idMatch[0].length;
          lookingForIdent = false;
          continue;
        }
      }
    }

    idx++;
  }
  return names;
}

function extractColumnZeroDeclarations(code) {
  const names = [];
  const lines = code.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fnMatch = line.match(/^(?:async\s+)?function(?:\s*\*|\*\s+|\s+)([a-zA-Z0-9_$]+)/);
    if (fnMatch) {
      names.push(fnMatch[1]);
      i++;
      continue;
    }
    const classMatch = line.match(/^class\s+([a-zA-Z0-9_$]+)/);
    if (classMatch) {
      names.push(classMatch[1]);
      i++;
      continue;
    }
    const varMatch = line.match(/^(const|let|var)\s+/);
    if (varMatch) {
      let stmt = '';
      let openBraces = 0;
      let openParens = 0;
      let openBrackets = 0;
      let inString = false;
      let stringChar = '';
      let escaped = false;
      let inLineComment = false;
      let inBlockComment = false;

      while (i < lines.length) {
        const curLine = lines[i];
        let j = 0;
        let lineComplete = false;
        while (j < curLine.length) {
          const ch = curLine[j];
          const nextCh = curLine[j + 1];

          if (inLineComment) {
            j++;
            continue;
          }
          if (inBlockComment) {
            if (ch === '*' && nextCh === '/') {
              inBlockComment = false;
              j += 2;
              continue;
            }
            j++;
            continue;
          }
          if (inString) {
            if (escaped) {
              escaped = false;
            } else if (ch === '\\') {
              escaped = true;
            } else if (ch === stringChar) {
              inString = false;
            }
            stmt += ch;
            j++;
            continue;
          }

          if (ch === '/' && nextCh === '/') {
            inLineComment = true;
            j += 2;
            continue;
          }
          if (ch === '/' && nextCh === '*') {
            inBlockComment = true;
            j += 2;
            continue;
          }
          if (ch === "'" || ch === '"' || ch === '`') {
            inString = true;
            stringChar = ch;
            stmt += ch;
            j++;
            continue;
          }

          if (ch === '{') openBraces++;
          else if (ch === '}') openBraces = Math.max(0, openBraces - 1);
          else if (ch === '(') openParens++;
          else if (ch === ')') openParens = Math.max(0, openParens - 1);
          else if (ch === '[') openBrackets++;
          else if (ch === ']') openBrackets = Math.max(0, openBrackets - 1);

          stmt += ch;

          if (openBraces === 0 && openParens === 0 && openBrackets === 0 && ch === ';') {
            lineComplete = true;
            break;
          }
          j++;
        }
        inLineComment = false;
        if (lineComplete) {
          i++;
          break;
        }
        stmt += '\n';
        i++;
      }

      const declNames = parseVarNamesFromStatement(stmt);
      names.push(...declNames);
      continue;
    }
    i++;
  }
  return names;
}

function extractScriptsFromHtml(htmlPath, rootDir) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptRegex = /<script\s+[^>]*src=["'](\/color-polish\/[^"']+)["'][^>]*>/g;
  const files = [];
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    let candidate = path.resolve(rootDir, 'public', src.replace(/^\//, ''));
    if (!fs.existsSync(candidate)) {
      candidate = path.resolve(rootDir, src.replace(/^\/color-polish\//, ''));
    }
    if (!fs.existsSync(candidate)) {
      candidate = path.resolve(rootDir, src.replace(/^\//, ''));
    }
    files.push(candidate);
  }
  return files;
}

const targetArg = process.argv[2];
let filesToScan = [];

if (targetArg) {
  const resolved = path.resolve(targetArg);
  if (!fs.existsSync(resolved)) {
    console.error(`Target path not found: ${resolved}`);
    process.exit(1);
  }
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const htmlPath = path.join(resolved, 'renderer.html');
    const nestedHtml = path.join(resolved, 'public/color-polish/renderer.html');
    if (fs.existsSync(htmlPath)) {
      filesToScan = extractScriptsFromHtml(htmlPath, resolved);
    } else if (fs.existsSync(nestedHtml)) {
      filesToScan = extractScriptsFromHtml(nestedHtml, resolved);
    } else {
      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      filesToScan = entries
        .filter((e) => e.isFile() && e.name.endsWith('.js'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => path.join(resolved, e.name));
    }
  } else if (stat.isFile()) {
    filesToScan = extractScriptsFromHtml(resolved, path.dirname(resolved));
  }
} else {
  const defaultHtml = path.resolve(process.cwd(), 'public/color-polish/renderer.html');
  filesToScan = extractScriptsFromHtml(defaultHtml, process.cwd());
}

if (filesToScan.length === 0) {
  console.error('No script files found to scan.');
  process.exit(1);
}

const nameToFirstFile = new Map();
const duplicates = [];
let totalNames = 0;

for (const filePath of filesToScan) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const code = fs.readFileSync(filePath, 'utf8');
  const names = extractColumnZeroDeclarations(code);
  totalNames += names.length;
  for (const name of names) {
    if (nameToFirstFile.has(name)) {
      const firstFile = nameToFirstFile.get(name);
      duplicates.push({
        name,
        file1: path.relative(process.cwd(), firstFile),
        file2: path.relative(process.cwd(), filePath),
      });
    } else {
      nameToFirstFile.set(name, filePath);
    }
  }
}

if (duplicates.length > 0) {
  console.error(`Global declaration collision detected (${duplicates.length} duplicate(s)):`);
  for (const d of duplicates) {
    console.error(`  "${d.name}" declared in both ${d.file1} and ${d.file2}`);
  }
  process.exit(1);
}

console.log(`Globals check passed: scanned ${filesToScan.length} files, collected ${totalNames} declarations. No duplicates found.`);
process.exit(0);
