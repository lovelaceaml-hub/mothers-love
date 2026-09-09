import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = resolve(scriptPath, "..", "..");
const runId = process.env.RUN_ID ?? "2026-09-09-tv-garden-refresh";
const runRoot = join(projectRoot, "docs", "runs", runId);
const indexPath = join(runRoot, "INDEX.md");
const boardRoot = join(runRoot, "board");
const boardPath = join(boardRoot, "index.html");
const publicBoardRoot = join(projectRoot, "public", "run-board");
const publicBoardPath = join(publicBoardRoot, "index.html");

function escapeHtml(value) {
  return String(value)
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

function parseLaneRows(markdown) {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex((line) => line.trim() === "| Lane | Owner/model | State | Dependency |");
  if (headerIndex < 0) {
    return [];
  }

  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
      break;
    }
    const columns = trimmed
      .slice(1, -1)
      .split("|")
      .map((column) => column.trim());
    if (columns.length !== 4 || columns.every((column) => /^-+$/.test(column))) {
      continue;
    }
    rows.push({ lane: columns[0], owner: columns[1], state: columns[2], dependency: columns[3] });
  }
  return rows;
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

function laneTable(lanes, includePrivateColumns) {
  const headings = includePrivateColumns ? ["Lane", "Owner/model", "State", "Dependency"] : ["Lane", "State"];
  const rows = lanes
    .map((lane) => {
      const columns = includePrivateColumns
        ? [lane.lane, lane.owner, lane.state, lane.dependency]
        : [lane.lane, lane.state];
      return `<tr>${columns.map((column) => `<td>${escapeHtml(column)}</td>`).join("")}</tr>`;
    })
    .join("\n");
  return `<table><thead><tr>${headings.map((heading) => `<th scope="col">${escapeHtml(heading)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

const indexMarkdown = readFileSync(indexPath, "utf8");
const lanes = parseLaneRows(indexMarkdown);
const generatedAt = new Date().toISOString();
const sections = [
  ["Research", "research"],
  ["Decisions", "decisions"],
  ["Logs", "logs"],
];
const sectionMarkup = sections
  .map(([heading, folder]) => {
    const cards = markdownFiles(join(runRoot, folder)).map(recordCard).join("\n");
    return `<section><h2>${escapeHtml(heading)}</h2>${cards ? `<div class="records">${cards}</div>` : '<p class="empty">No records published.</p>'}</section>`;
  })
  .join("\n");

const sharedStyles = `
    :root { color-scheme: light; --ink: #303342; --muted: #626674; --cream: #fff6dc; --paper: #fffdf6; --line: rgba(48,51,66,.14); }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 2rem; color: var(--ink); background: var(--cream); font-family: system-ui, -apple-system, sans-serif; }
    main { width: min(100%, 76rem); margin: 0 auto; }
    header { margin-bottom: 2rem; }
    h1 { margin: 0; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -.04em; }
    header p { color: var(--muted); }
    section { margin: 1.5rem 0; }
    h2 { margin: 0 0 .75rem; font-size: 1rem; letter-spacing: .12em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border: 1px solid var(--line); border-radius: 1rem; background: var(--paper); }
    th, td { padding: .8rem 1rem; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
    th { color: var(--muted); font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    .records { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .85rem; }
    .record { padding: 1rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--paper); }
    .record h3 { margin: 0; font-size: 1rem; }
    .record p { margin: .65rem 0; color: var(--muted); line-height: 1.45; }
    .record small { color: var(--muted); overflow-wrap: anywhere; }
    .empty { color: var(--muted); }
    @media (max-width: 700px) { body { padding: 1rem; } th, td { padding: .65rem .5rem; font-size: .86rem; } }
`;

const internalHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mother's Love run board</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <main>
    <header>
      <h1>The Words of Mother's Love</h1>
      <p>Facts-only implementation board for ${escapeHtml(runId)}. Generated ${escapeHtml(generatedAt)}.</p>
    </header>
    <section><h2>Current lanes</h2>${laneTable(lanes, true)}</section>
    ${sectionMarkup}
  </main>
</body>
</html>
`;

const publicHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Mother's Love campaign board</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <main>
    <header>
      <h1>The Words of Mother's Love</h1>
      <p>Current implementation lane states. Generated ${escapeHtml(generatedAt)}.</p>
    </header>
    <section><h2>Current lanes</h2>${laneTable(lanes, false)}</section>
  </main>
</body>
</html>
`;

mkdirSync(boardRoot, { recursive: true });
mkdirSync(publicBoardRoot, { recursive: true });
writeFileSync(boardPath, internalHtml, "utf8");
writeFileSync(publicBoardPath, publicHtml, "utf8");
process.stdout.write(`Rendered ${relative(projectRoot, boardPath)} and ${relative(projectRoot, publicBoardPath)}\n`);
