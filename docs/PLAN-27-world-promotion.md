# Plan 27: Promote the heavenly world to the live Mother's Love app

Numbering and standing, added 2026-09-23: this plan was Plan 25 until Anthony ruled that plans renumber by date, which made it Plan 27. The text below keeps the number it was written under. [Plan 28](PLAN-28-repository-refactor.md) supersedes its gate G5 (the TV is never pointed at the world, which becomes its own surface at `/world`) and folds the rest of it into Plan 28's Section 5. Draft PR #8 named below was replaced by draft PR #10 on 2026-09-23.

Drafted 2026-09-22 by Fable after Anthony's ruling "1" on 2026-09-21: plan the promotion right after the visual sections land. Status: draft, awaiting Anthony's approval after Section 8 of Plan 24 pass D2 lands. Nothing in this plan runs until he approves it.

## Goal and authority

Goal: Put the finished heavenly world in front of real viewers on the TV, with live recognitions, at the same quality Anthony approved in the preview, without touching the current 2D TV screens, the database, the API, or anyone's privacy.

Authority: Plan 24 (approved 2026-09-21) sets the world's behavior contract and its release gates (P0 readiness, P6 performance, P7 completion review, Anthony's visual approval, no merge or production promotion without explicit authorization). Anthony's rulings on 2026-09-21: keep going and show after each section; plan the promotion after the visual sections; "Mostly Opus but Fable can be used" for the writer. The frozen wording layout on the pearl and the sample-only privacy rules stay in force.

## Where things stand (facts, 2026-09-22)

- Production runs from branch `codex/mothers-love` at 1b4c31a (PWA kiosk fix, butterfly icon, the 3D heart on the Peace in Practice 2D screen, admin ordering). The live TV is `/display` (the eleven 2D Color Polish screens). Deployment: production target on the Vercel project `mothers-love` (team `lvzion`).
- The world lives on its own route, `/display/world-preview`, on branch `feature/world-cinematic-art-pass` (draft PR #8, base `feature/tv-3d-world-prototype-01`, which itself branched from `tv17/pick`). The two branches share no code files with production since they split, only `AGENTS.md` and `docs/HANDOFF.md`.
- The new look is locked behind a URL gate: `isWorldDesignStudy()` requires `?source=sample&art=design`. With `source=live` the page shows the older cinematic world. The design study defaults to the High picture tier.
- Plan 24 P0 (the historical Linux CI readiness failure for the cinematic review workflow) is still open. The six local baseline cases pass; only the GitHub Actions run has failed.
- Verified on every section: classic and cinematic captures byte-identical to Codex's D1, pearl text pixel-identical with the glow on and off, zero API requests from the sample harness.

## Models, effort, agents, review

| Role | Model and effort | Notes |
| --- | --- | --- |
| Coordinator | Fable 5.1 (this chat) | Work orders, diff and capture review, commits, the merge request staging, reporting. |
| Writer, G1 and P0 | Claude Opus 5, high, one subagent at a time | Same worktree and rules as pass D2. |
| Landing review per gate | Sonnet 5, high, read-only | Findings corrected before the gate closes. |
| Completion review (Plan 24 P7) | Fresh nonauthor Claude Opus 5, high, read-only | Complete diff of PR #8 against its production base, privacy, behavior, acceptance report. Required before the merge. |
| Decisions and hands | Anthony | The TV check, the merge click, the TV URL switch. |

Agents: no fan-out. Pool note: verify the usage dashboard before dispatching; treat stale data as unknown.

## Gates, in order

### G1: Make the new look the world page's default with live recognitions (Opus, about 1 hour)

- Replace the URL gate with a default: `/display/world-preview` renders the design world for both `source=live` and `source=sample`; `art=classic` and `art=cinematic` stay available as explicit fallbacks; `?source=sample` stays the fictional demonstration, clearly labeled, with the three arrival study buttons. Remove the design-review-only sample override that forces the first sample record's expressions to `[2, 7, 8]` from any live path (it must never touch live records).
- Picture quality defaults to Auto on the world page (today the study forces High); High and Low stay in Settings. Auto starts at the 4.15M pixel budget and drops radiance, then shadows, then pixels after three slow windows, as Section 8 built.
- Live data path check: the world reads only the existing public TV projection endpoint through the existing client helper; no new fields, no submitted names, no reaction mutations; privacy states (quiet, neutral, expired, stale, source switch) clear every pearl and every skin object immediately (the existing world-safety tests plus a new test for the design skin on the clearing path).
- Verification: typecheck, tests, build, the harness in stills, quality and tour modes, the text parity check, and a live-mode browser run against the preview deployment (no screenshots of real records are stored; the run asserts attributes only).
- Output: a preview deployment of the world page with live data, URL recorded here.

### G2: Anthony's 10 minute check on the real TV (Anthony)

- Open the G1 preview URL fullscreen on the actual TV for ten minutes, once at the default Auto tier and once with High selected in Settings.
- Judge three things from the sofa: can you read a full recognition at the normal distance, does the camera feel smooth, does anything stutter or wash out.
- Report the TV's make and the browser it uses (built in, Chromecast, Apple TV, a stick), so the tier defaults can be tuned to it. Section 8's timing harness records what a good laptop does; the TV number comes only from this check.
- If Low is the only smooth tier on the TV, G1 gets a follow-up to make Low the TV default and to trim what Low shows.

### G3: Close the Plan 24 gates (Opus writer plus a fresh Opus reviewer, about 2 to 3 hours of agent time)

- P0: diagnose and fix the Linux CI readiness failure in `.github/workflows/cinematic-world-review.yml` and `scripts/review-cinematic-world.mjs` as Plan 24 P0 specifies (instrument mount, import, scene construction, renderer creation, first rendered frame; fix the demonstrated cause; no timeout inflation). Closes only with a passing CI run on the fixed head.
- Completion review (Plan 24 P7): a fresh nonauthor Opus 5 reviews the whole PR #8 diff against `codex/mothers-love`: privacy (no personal pixels outside the depth-tested slot, nothing personal in the glow, protect or rays targets, no real-data fixtures), behavior (reading, paging, arrivals, holds, reduced motion, Still, tiers, disposal), and the acceptance list in Plan 24. Findings corrected, affected checks rerun, one more review round only for a blocking-class finding.
- Documentation: `docs/HANDOFF.md`, `AGENTS.md`, `README.md` quick links, `USER-MANUAL.md` (the world page for the TV operator: URL, Settings, what Auto does, how to switch back), the Projects index line.

### G4: Merge (Fable stages, Anthony clicks, about 15 minutes)

- Retarget PR #8's base to `codex/mothers-love` so one merge lands the whole world branch (its current base branch has never been merged to production). Resolve the two document conflicts (`AGENTS.md`, `docs/HANDOFF.md`) on the world branch first, keeping both histories.
- Fable stages the PR: title, description with the preview URL, the evidence links, the rollback line, and the completion review verdict. Anthony clicks Merge (Auto mode blocks production merges from this chat).
- Vercel builds production from the merge automatically. Fable verifies the production world page, the untouched 2D TV at `/display`, the home page and the admin sign-in, and records the production deployment ID here.
- Rollback: one click on the previous production deployment in Vercel (recorded here before the merge), or simply switching the TV back to `/display`, which is unchanged either way.

### G5: Point the TV at the world (Anthony or the TV operator, 2 minutes)

- Open `https://mothers-love.vercel.app/display/world-preview` on the TV. The 2D TV at `https://mothers-love.vercel.app/display` keeps working exactly as before, so switching back is only a URL change.
- Later, optional and separate: add the world as a scene inside the 2D playlist so the operator never changes URLs. Not part of this plan.

## Interfaces and acceptance

- No database, API, auth, catalog or public contract change. No new public fields. Submitted names stay private. Reaction counts unchanged.
- The world page with live data shows only published, unexpired recognitions from the public projection; every privacy state clears pixels immediately.
- Classic and cinematic art modes remain byte-identical to D1 until Anthony retires them.
- Completion requires: G1 preview verified, Anthony's TV check recorded with the TV type, P0 green, the completion review passed with findings corrected, docs updated, PR merged by Anthony, production world page verified, rollback recorded.

## What Anthony must do

1. Approve this plan (reply with "approve Plan 25" or the changes you want).
2. The 10 minute TV check at G2, and tell me the TV type.
3. Click Merge on PR #8 at G4.
4. Change the TV's URL at G5, or tell me who does.

## Build log

- 2026-09-22: Draft written by Fable while Section 8 of pass D2 finished. Not yet approved.
