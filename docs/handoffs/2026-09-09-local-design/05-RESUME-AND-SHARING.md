# Resume and sharing guide

## 1. Resume on Anthony's Mac

Read `/Users/anthony/Projects/mothers-love-worktrees/local-3d-preview/docs/handoffs/2026-09-09-local-design/00-START-HERE.md` first. Check the branch and local changes before editing. The saved checkpoint branch is `codex/local-3d-preview`; the receipt identifies its exact commit.

If the local preview is unavailable, run:

```sh
cd /Users/anthony/Projects/mothers-love-worktrees/local-3d-preview
npm run dev -- --webpack --hostname 127.0.0.1 --port 3210
```

Then open http://127.0.0.1:3210/design-preview. If that port is occupied, inspect the existing process before starting another server. Do not kill an unrelated process. A missing node_modules symlink can be replaced by a normal dependency install using the included lockfile, but never copy environment files or production data merely to make this preview run.

## 2. What to click

Use the lower toolbar to choose a display, pause, advance, or enter full screen. The larger purple Preview new arrival button sits above the toolbar toward its right side. It creates a sample recognition only. It becomes disabled while that arrival is playing. Refresh if the browser still shows an older hot-reload state.

## 3. Share with another person

Share the ZIP, not the localhost link. The ZIP has no environment credentials, dependency cache, Git history, or real submitted recognitions. It includes local filesystem paths and a curated record of Anthony's design feedback; those are intentionally part of the handoff. No email, public upload, or recipient message was sent as part of packaging.

The source snapshot is provided for technical collaborators. Nontechnical reviewers can begin with the Markdown files and screenshots. The Drive copy is placed under the project's authorized managed storage; copying to the mounted folder is not evidence that cloud synchronization or recipient access has completed.

## 4. Run the portable snapshot

One concrete Mac/Linux destination is `/private/tmp/mothers-love-preview-share`. Extract the archive there, preserving its source folder. Then run:

```sh
cd /private/tmp/mothers-love-preview-share/source
npm ci --cache /private/tmp/mothers-love-npm-cache
npm run dev -- --webpack --hostname 127.0.0.1 --port 3210
```

This path is a portable example, not the canonical saved working copy. For a lasting installation, choose a durable absolute folder before extracting. The recipient needs a suitable Node.js installation; Node 24.14.1 was observed in the local browser-check environment. Dependency installation needs network access. No production database or .env file should be required to use the sample preview.

## 5. Patch use

The source-changes.patch file represents the local design changes relative to baseline ad1e6d5e8482746f9e84fa514b61d343ccba01e1. Apply it only to a compatible clean baseline and inspect conflicts. Prefer the complete source snapshot for visual review without merge work. A patch is not an instruction to push, merge, or deploy.

## 6. Continuation prompt

```text
Resume the held Mother's Love TV local design checkpoint. Read /Users/anthony/Projects/mothers-love-worktrees/local-3d-preview/docs/handoffs/2026-09-09-local-design/00-START-HERE.md, /Users/anthony/Projects/mothers-love-worktrees/local-3d-preview/docs/handoffs/2026-09-09-local-design/01-CONVERSATION-AND-REQUIREMENTS.md, /Users/anthony/Projects/mothers-love-worktrees/local-3d-preview/docs/handoffs/2026-09-09-local-design/04-VERIFICATION-AND-LIMITATIONS.md, and /Users/anthony/Projects/mothers-love-worktrees/local-3d-preview/AGENTS.md. Work only in /Users/anthony/Projects/mothers-love-worktrees/local-3d-preview. Preserve the saved checkpoint and unrelated edits. The preview is http://127.0.0.1:3210/design-preview. Do not deploy, push, merge, or use production data. If delegation is useful, use Luna max with disjoint ownership; no Terra. Root may implement and correct. The latest instruction was hold and save, so wait for my new direction before further design changes. First report the saved state and any mismatch you actually observe.
```

## Handoff storage

[Managed Drive root](https://drive.google.com/drive/folders/1rwJkIJ6hn8zNxh5DsYloB4DNFfuHGTz1). Exact mounted archive folder: `/Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Anthony Mac Storage/Project Outputs/Mothers Love TV/2026-09-09 Local Design Handoff`. The archive copy was verified locally by SHA-256. Cloud synchronization and other people's access were not verified.
