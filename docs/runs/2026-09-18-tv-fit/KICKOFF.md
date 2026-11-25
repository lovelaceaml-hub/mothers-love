# Plan 17 kickoff envelope

## Execution envelope
- Project / unit: Plan 17, TV text fit and Plan 15 release; Parallel mode, Lanes 0 to 3 then Section Z
- Lane: Codex lane (Gemini 3.8 Flash (High) via agy while Codex primary is at or above 80 percent, Luna via codex-dispatch once below); Claude Opus 5 (high) is coordinator only and authors no scene code
- Read first: $HOME/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md (including its Build log); $HOME/Projects/mothers-love/docs/runs/2026-09-18-tv-fit/INDEX.md; $HOME/Projects/mothers-love/docs/HANDOFF.md
- In scope: the scene files each lane owns in the plan, their scene specs, lane record files, probe captures under the run tree logs
- Protected / out of scope: production (https://mothers-love.vercel.app) until Anthony approves the new preview on the TV and answers the live-app-release question; the shared Supabase database (no database change in this plan); Featured, Garden, Status and Calendar scenes; header, feed rail, QR, durations, playlist order; any other worktree or branch not named in the plan; real recognition data (fictional sample data only)
- Acceptance: as written per lane in the plan; Section Z confirms the QR decodes to https://mothers-love.vercel.app/ and the 100-record feed survives the merge of production b7d92a0
- Verify: npm run typecheck; npm test; npm run build; npx playwright test tests/color-polish-scenes; node scripts/color-polish-renderer-probe.mjs <worktree> <out> at --width=1920 and --width=3840 and each --ms checkpoint. Use npm_config_cache=/tmp/npm-cache. Give each worktree its own npm ci (a symlinked node_modules breaks the Turbopack build).
- Completion output: Build log facts, changed files, verification evidence, commit and push status, limitations, preview link plus live versus new side-by-side for Anthony
- Record file: docs/runs/2026-09-18-tv-fit/lanes/<L0|L1|L2|L3|SZ>.md
- Board: pending
- Critique: Lane 0, $HOME/Projects/mothers-love/docs/PLAN-17-tv-fit-and-release.md (gpt-5.6-sol high read-only; Gemini 3.8 Flash (High) read-only while Codex primary is exhausted)

## Safety facts
- Preview deploys: from the tv17/pick worktree, copy $HOME/Projects/mothers-love/.vercel into it and run `npx vercel deploy --yes` (NO --prod). Production deploy is `npx vercel deploy --prod --yes` and only after Anthony approves.
- Production today: commit b7d92a0 on branch change/tv-qr-home, pushed as codex/mothers-love, deployment dpl_DEwMhtevRw9uf1WyuSFPUGotNm27 (rollback target if a later promote misbehaves).
- The main checkout $HOME/Projects/mothers-love is on codex/color-polish-v6 with untracked evidence folders; do not clean or reset it.
- Credentials: Vercel CLI login and the .vercel project link only; no keys go in the repo, docs or logs.
- Gate: the plan's Build log must show the 2026-09-18 "Plan written" entry; if missing, stop and report.
