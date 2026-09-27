# Handoff: The Words of Mother's Love

**Current state, 2026-09-26.** Production is the branch `main` at commit `ec4a7c1` (pull request #23, show older recognitions), served at https://mothers-love.vercel.app by Vercel deployment `dpl_7LbPtpZunGfqjMsVPHxcEwxrzF6m` (READY). Live today: the home page with the latest 100 recognitions and a Show older recognitions button that reaches every older one ([Plan 30](PLAN-30-older-recognitions.md), migration 017), the recognition form, the expression guide, the admin workspace listing every submission in the order it came in, the TV display at `/display` with eleven screens and the sculpted 3D heart, the open hands heart app icon (pull requests #20 and #22), Android install with a fullscreen TV kiosk mode, every recognition kept forever (Plan 18 Section B), and the 3D world at its own address, `/world`, beside the TV view (pull request #19, merged 2026-09-24). **Since 2026-09-23 every push to `main` is a production deployment**, so changes reach `main` only through a pull request Anthony merges.

Every release note, newest first, is in [HISTORY.md](HISTORY.md). Every plan, 01 to 30, is in this folder, listed in the [README](../README.md).

## What is live

| Surface | Link | Notes |
| --- | --- | --- |
| Home, live recognitions | https://mothers-love.vercel.app | Latest 100 published recognitions, then Show older recognitions adds 100 older ones per tap down to the first; hearts never flash; Share a recognition is the main action |
| Recognition form | https://mothers-love.vercel.app/recognize | The form only; the receipt screen after sending shows the recent recognitions |
| Expression guide | https://mothers-love.vercel.app/expressions | The nine expressions with everyday examples |
| TV display | https://mothers-love.vercel.app/display | Eleven screens including Live Recognitions; a click, tap, ArrowRight or Space advances; bubbles come in one at a time after each screen change |
| TV kiosk | https://mothers-love.vercel.app/display?kiosk=1 | Adds an Enter full screen button and keeps the screen awake where the browser allows; installing from `/display` on Android opens it fullscreen in landscape |
| Admin | https://mothers-love.vercel.app/admin/login | Email and password, no authenticator; the Recognitions list shows every submission oldest first, numbered, with the submitted name and full message |
| Display Studio | https://mothers-love.vercel.app/admin/display | Sample preview of all eleven screens and the TV settings |

## Production and rollback

- Live: `dpl_7LbPtpZunGfqjMsVPHxcEwxrzF6m`, commit `ec4a7c1` (pull request #23, show older recognitions), built from `main` on 2026-09-26 at 18:39 UTC.
- Rollback: never roll the code back alone past `43d801f` (Plan 18 Section B, keep forever); roll the database back first or roll forward. The previous production is `dpl_EJ3n1Mau36mrAzQwNXYLG5uDht19` (pull request #22); rolling back to it removes only the older recognitions button, and migration 017 can stay because the old code never calls it. Before that: `dpl_2x694rsojnvrwQ6nRHXjvGjmP3c9` (pull request #19, the world) and `dpl_HPhJRz7WuYzQwUb9EcH9iX7zx3Br` (pull request #20, before the world).
- Vercel builds production from `main` since 2026-09-23. `vercel.json` turns deployment off only for `codex/home-tv-family`, so every other branch pushed to GitHub gets a preview deployment.
- Database: Supabase project `cvuwdlmlukepwfffpgdu`, private schema `mothers_love`, restricted runtime login `mothers_love_runtime`. Migrations live in `database/`; applying one to the live database is Anthony's decision.

## Work in flight

| Work | Where | State |
| --- | --- | --- |
| [Plan 28](PLAN-28-repository-refactor.md), repository cleanup | One pull request per section into `main`; record in [runs/2026-09-22-repo-refactor/](runs/2026-09-22-repo-refactor/INDEX.md) | Sections 0 to 7 done (6 reviewed inside Section 8's completion review); Section 8's completion review of #19 passed and #19 merged on 2026-09-24 (deployment `dpl_2x694rsojnvrwQ6nRHXjvGjmP3c9`); Section 8's post merge checks are not recorded here |
| The 3D world: Plans [24](PLAN-24-world-visual-quality.md), [27](PLAN-27-world-promotion.md) and [29](PLAN-29-world-kit.md), the 3D Studio kit | `feat/world-surface`, pull request [#19](https://github.com/lovelaceaml-hub/mothers-love/pull/19) into `main`, which merges `feat/world-cinematic`, `feat/world-base` and production | Live since 2026-09-24. `/world` is its own page with the design look, live recognitions and Automatic quality by default; `/display/world-preview` redirects there. PLAN-01 Section 5 steps 0 and 11 passed on this Mac. Plan 28 Section 7 split its oversized files as pure moves (captures byte identical). Plan 28 Section 8's completion review passed after corrections: sample content reads "Sample recognitions", the TV page never offers the sample, the ticker hides in Still or reduced motion instead of cutting messages, and message text leaves every cache on withdrawal, expiry and every unsafe state. Merged on 2026-09-24 and live at `/world` |
| [Plan 25](PLAN-25-live-tv-pearl-study.md), live TV pearl design study | tag `archive/feat/tv-pearl-design` | Archived by Anthony's 2026-09-24 tidy decision; branch deleted on GitHub and on the Mac, working copy removed (Plan 28 Section 4) |
| [Plan 26](PLAN-26-pearl-sequence.md), Expression Cosmos prototype | tag `archive/feat/tv-pearl-sequence` | Archived the same way; its prototype art is in Drive under `2026-09-24-plan28-section-4-worktrees` |
| [Plan 18](PLAN-18-keep-forever-and-admin-details.md), keep every recognition | `main` | Sections A and B done: pull request #13 live 2026-09-24 (merge 43d801f) and migration 016 applied the same day; Sections C and D next |

## Open items

0. **Older recognitions (Plan 30, live 2026-09-26).** Migration 017 was applied at about 18:36 UTC and recorded in `mothers_love.schema_migrations` with its SHA-256; pull request #23 merged at 18:39 UTC and Anthony confirmed the button on the live home page. With 192 eligible recognitions, the page shows the newest 100 and the button adds the other 92. Nothing follows from it.
1. **Recognitions are kept forever (Plan 18 Section B, live 2026-09-24).** Pull request #13 merged (43d801f, deployment dpl_BrhaanCyzqbm3zUZDYdKkVDFfgf9) and migration 016 was applied at 11:27 UTC, recorded in `mothers_love.schema_migrations` with its SHA-256. A read-only check afterwards: all 189 recognitions expire in 2126, collection is healthy, new rows get 100 years while idempotency keys and display events keep 168 hours. Follow-ups: `ml_purge` is still active and can be paused again or moved to hourly (it still clears idempotency keys, display events and rate limits); admin screens show 2126 expiry dates until Section C. Never roll the code back alone past 43d801f.
2. **Migration 015** (`database/015_admin_list_order.sql`) lets the database sort the admin list oldest first. This repository does not record whether it was applied. If it was not, the Recognitions screen still lists everything and says "The database is still showing newest first. Apply database migration 015".
3. `database/014_color_polish_live_feed.sql` was never run and is not needed, because Live Recognitions uses its defaults. Its number collides with the applied `014_recognition_archive.sql`, so renumber it before it is ever run.
4. The saved TV playlist keeps its old durations. Plan 17's 60 seconds per screen (Garden unchanged) and Welcome's 40 seconds are code defaults that wait for Anthony to save them live.
5. Never checked on real hardware: the church TV at viewing distance, one real arrival on the church TV, a phone scanning the TV's QR code, a real Owner sign in, and the Android install and kiosk mode on a real device.
6. Known test debt, as last recorded: `npx eslint src` reports 16 errors and 3 warnings in `ColorPolishStudio.tsx`, `DisplayKioskControl.tsx`, `V6DisplayExperience.tsx` and `ColorPolishHost.tsx` (counted 2026-09-24), and 26 journeys in `tests/display/display.e2e.spec.ts` look for a legacy test id nothing renders any more (2026-09-10). The Linux CI readiness failure (Plan 24 P0) was diagnosed in Plan 28 Section 6: the review opened `127.0.0.1` while `next dev` serves `localhost`, so Next.js 16 refused its dev socket. The fix, [pull request #16](https://github.com/lovelaceaml-hub/mothers-love/pull/16) into `feat/world-cinematic`, merged and its CI check passed on 2026-09-24, which closes P0.

7. **Follow up from Plan 28 Section 8's completion review (deferred, not blocking):** on the 3D world's TV page an arrival can now and then be lost when a poll and the half second refresh land in one render (`src/components/display/world/use-world-feed.ts`, `publish` consumes arrivals at once). The recognition still appears in the pearls and the ticker, but with no entrance and no "New" mark. Fix: clear pending arrivals only after a view carrying them is committed, with tests that every unsafe state still clears them at once. Details in [lanes/S8.md](runs/2026-09-22-repo-refactor/lanes/S8.md).

## Where things are

- **Source:** https://github.com/lovelaceaml-hub/mothers-love, private. Production branch `main`; live work on `feat/<area>-<subject>` and `fix/<area>-<subject>`; retired branches are `archive/<old-name>` tags that restore in one command.
- **Documents:** this folder, and only this folder on `main`. Plans are numbered by the date of their first commit (Anthony, 2026-09-23); the next new plan takes 31, because 30 is the older recognitions button. Each plan has a Build log, and each run keeps its record in `docs/runs/<plan-id>/`. What still lives on other branches is listed in [HISTORY.md](HISTORY.md), part 3.
- **Rules of the product:** [CONTRACT.md](CONTRACT.md). **How people use it:** [USER-MANUAL.md](USER-MANUAL.md).
- **Evidence and finished media:** Drive, `Anthony Mac Storage/Project Outputs/The Words of Mother's Love`, https://drive.google.com/drive/folders/1JBeoaxaZ9ZMTIFMSmlKT5jn9rcdysnmw. Captures and probe output go there, not into Git.
- **Working copies:** the main checkout `/Users/anthony/Projects/mothers-love` stays on `main`. Other working copies go under `/Users/anthony/Projects/mothers-love-worktrees/`, one per live branch; since Plan 28 Section 4 that folder is empty. The world's copies live under `/Users/anthony/Projects/mothers-love-world/` and belong to the world plans.

## Rules that matter on the next change

- Never run a bare `git push` in the main checkout: it tracks `origin/main`, and a push to `main` deploys production.
- No real recognition, submitted name or other personal data in Git, fixtures, screenshots or logs. Tests use fictional records only.
- `/display` and its eleven screens stay the TV view. The 3D world becomes its own surface and never enters the TV playlist (Plan 28).
- Nothing written for Anthony contains an em or en dash.
