import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(scriptPath, "..", "..");
const runRoot = join(projectRoot, "docs", "runs", "2026-09-08-full-app");
const boardRoot = join(runRoot, "board");
const boardPath = join(boardRoot, "index.html");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownFiles(folder) {
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(folder, entry.name))
    .sort();
}

function recordCard(filePath) {
  const text = readFileSync(filePath, "utf8");
  const title = text.match(/^#\s+(.+)$/m)?.[1] ?? relative(runRoot, filePath);
  const firstParagraph = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s+/gm, "").replace(/[*`]/g, "").trim())
    .find((part) => part && !part.startsWith("---"))
    ?.slice(0, 240) ?? "No summary recorded yet.";

  return `<article class="record"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(firstParagraph)}</p><small>${escapeHtml(relative(projectRoot, filePath))}</small></article>`;
}

const sections = [
  ["Lanes", "lanes"],
  ["Research", "research"],
  ["Decisions", "decisions"],
  ["Logs", "logs"],
];

const sectionMarkup = sections
  .map(([heading, folder]) => {
    const cards = markdownFiles(join(runRoot, folder)).map(recordCard).join("\n");
    return `<section><h2>${escapeHtml(heading)}</h2>${cards || '<p class="empty">No records published.</p>'}</section>`;
  })
  .join("\n");

const generatedAt = new Date().toISOString();
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mother's Love run board</title>
  <style>
    :root { color-scheme: light; --ink: #303342; --muted: #626674; --cream: #fff6dc; --paper: #fffdf6; --line: rgba(48,51,66,.14); }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 2rem; color: var(--ink); background: var(--cream); font-family: system-ui, -apple-system, sans-serif; }
    main { width: min(100%, 72rem); margin: 0 auto; }
    header { margin-bottom: 2rem; }
    h1 { margin: 0; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -.04em; }
    header p { color: var(--muted); }
    section { margin: 1.5rem 0; }
    h2 { margin: 0 0 .75rem; font-size: 1rem; letter-spacing: .12em; text-transform: uppercase; }
    .records { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .85rem; }
    .record { padding: 1rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--paper); }
    .record h3 { margin: 0; font-size: 1rem; }
    .record p { margin: .65rem 0; color: var(--muted); line-height: 1.45; }
    .record small { color: var(--muted); overflow-wrap: anywhere; }
    .empty { color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>The Words of Mother's Love</h1>
      <p>Facts-only implementation board for the 2026-09-08 full app run. Generated ${escapeHtml(generatedAt)}.</p>
    </header>
    ${sectionMarkup}
  </main>
</body>
</html>
`;

mkdirSync(boardRoot, { recursive: true });
writeFileSync(boardPath, html, "utf8");
process.stdout.write(`Rendered ${relative(projectRoot, boardPath)}\n`);
