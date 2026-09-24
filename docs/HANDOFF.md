# Handoff: The Words of Mother's Love

**Current state, 2026-09-23.** Production is the branch `main` at commit `1b4c31a`, served at https://mothers-love.vercel.app by Vercel deployment `dpl_6LcL3K4yACzvRd799Lb63XjYvwZa` (READY). Live today: the home page with the latest 100 recognitions, the recognition form, the expression guide, the admin workspace listing every submission in the order it came in, the TV display at `/display` with eleven screens and the sculpted 3D heart, the butterfly heart app icon, and Android install with a fullscreen TV kiosk mode. The 3D world is not live: it is being built on `feat/world-cinematic` and will get its own address, `/world`, beside the TV view rather than replacing it. The repository cleanup, [Plan 28](PLAN-28-repository-refactor.md), has finished Sections 0 to 2, and Section 3, this documentation set, reaches `main` when Anthony merges its pull request, [#11](https://github.com/lovelaceaml-hub/mothers-love/pull/11). **Since 2026-09-23 every push to `main` is a production deployment**, so changes reach `main` only through a pull request Anthony merges.

Every release note, newest first, is in [HISTORY.md](HISTORY.md). Every plan, 01 to 28, is in this folder, listed in the [README](../README.md).

## What is live

| Surface | Link | Notes |
| --- | --- | --- |
| Home, live recognitions | https://mothers-love.vercel.app | Latest 100 published recognitions; hearts never flash; Share a recognition is the main action |
| Recognition form | https://mothers-love.vercel.app/recognize | The form only; the receipt screen after sending shows the recent recognitions |
| Expression guide | https://mothers-love.vercel.app/expressions | The nine expressions with everyday examples |
| TV display | https://mothers-love.vercel.app/display | Eleven screens including Live Recognitions; a click, tap, ArrowRight or Space advances; bubbles come in one at a time after each screen change |
| TV kiosk | https://mothers-love.vercel.app/display?kiosk=1 | Adds an Enter full screen button and keeps the screen awake where the browser allows; installing from `/display` on Android opens it fullscreen in landscape |
| Admin | https://mothers-love.vercel.app/admin/login | Email and password, no authenticator; the Recognitions list shows every submission oldest first, numbered, with the submitted name and full message |
| Display Studio | https://mothers-love.vercel.app/admin/display | Sample preview of all eleven screens and the TV settings |

## Production and rollback

- Live: `dpl_6LcL3K4yACzvRd799Lb63XjYvwZa`, commit `1b4c31a` (pull request #9, Android install and kiosk mode), built on 2026-09-21 from the branch's old name `codex/mothers-love`.
- Rollback: `npx vercel rollback dpl_HgDcpWFQUWscSQp4Qy89xX8DV5N5`, the app icon release at commit `f7552e4`. Neither release changed the database.
- Vercel builds production from `main` since 2026-09-23. `vercel.json` turns deployment off only for `codex/home-tv-family`, so every other branch pushed to GitHub gets a preview deployment.
- Database: Supabase project `cvuwdlmlukepwfffpgdu`, private schema `mothers_love`, restricted runtime login `mothers_love_runtime`. Migrations live in `database/`; applying one to the live database is Anthony's decision.

## Work in flight

| Work | Where | State |
| --- | --- | --- |
| [Plan 28](PLAN-28-repository-refactor.md), repository cleanup | One pull request per section into `main`; record in [runs/2026-09-22-repo-refactor/](runs/2026-09-22-repo-refactor/INDEX.md) | Sections 0 to 2 done; Section 3 waits for Anthony's merge; Sections 4 to 8 follow, one chat each |
| The 3D world: Plans [24](PLAN-24-world-visual-quality.md), [27](PLAN-27-world-promotion.md) and 29, the 3D Studio kit | `feat/world-cinematic`, draft pull request #10 into `feat/world-base`; the kit's lanes on `world-kit/*` | Not live. Pass D2 is done and the kit's coordinator is writing on the branch under Anthony's grant; Plan 28 Section 5 moves the world to `/world` |
| [Plan 25](PLAN-25-live-tv-pearl-study.md), live TV pearl design study | `feat/tv-pearl-design` | Sample only preview, waiting for Anthony's visual approval |
| [Plan 26](PLAN-26-pearl-sequence.md), Expression Cosmos prototype | `feat/tv-pearl-sequence` | Prototype built, not live |
| [Plan 18](PLAN-18-keep-forever-and-admin-details.md), keep every recognition | `change/never-expire`, pull request #13 into `main` | Approved 2026-09-23; Section A done (forever, TV draws from the latest 100); Section B in pull request #13 |

## Open items

1. **Recognitions are kept forever (Plan 18, approved 2026-09-23), but the server change is not live yet.** As a bridge on 2026-09-23 every recognition got an expiry at least 21 days out (earliest 2026-10-15 00:39 UTC). New recognitions still get 168 hours until migration 016 is applied. A read-only check on 2026-09-24 11:12 UTC found the cleanup job `ml_purge` active again and collection healthy, so an expiring row is copied into `mothers_love.recognitions_archive` and leaves public view rather than closing collection; migration 016 brings archived rows back. Deadline for Plan 18 Section B ([pull request #13](https://github.com/lovelaceaml-hub/mothers-love/pull/13), code first, then migration 016): 2026-10-15, or 7 days after the next new recognition, whichever comes first. Never set an expiry more than about 24 days ahead until the Section B server clamp is live.
2. **Migration 015** (`database/015_admin_list_order.sql`) lets the database sort the admin list oldest first. This repository does not record whether it was applied. If it was not, the Recognitions screen still lists everything and says "The database is still showing newest first. Apply database migration 015".
3. `database/014_color_polish_live_feed.sql` was never run and is not needed, because Live Recognitions uses its defaults. Its number collides with the applied `014_recognition_archive.sql`, so renumber it before it is ever run.
4. The saved TV playlist keeps its old durations. Plan 17's 60 seconds per screen (Garden unchanged) and Welcome's 40 seconds are code defaults that wait for Anthony to save them live.
5. Never checked on real hardware: the church TV at viewing distance, one real arrival on the church TV, a phone scanning the TV's QR code, a real Owner sign in, and the Android install and kiosk mode on a real device.
6. Known test debt, as last recorded: one lint error in `src/components/admin/color-polish/ColorPolishStudio.tsx` (2026-09-20), and 26 journeys in `tests/display/display.e2e.spec.ts` that look for a legacy test id nothing renders any more (2026-09-10). Plan 28 Section 6 fixes the Linux CI readiness failure.

## Where things are

- **Source:** https://github.com/lovelaceaml-hub/mothers-love, private. Production branch `main`; live work on `feat/<area>-<subject>` and `fix/<area>-<subject>`; retired branches are `archive/<old-name>` tags that restore in one command.
- **Documents:** this folder, and only this folder on `main`. Plans are numbered by the date of their first commit (Anthony, 2026-09-23); the next new plan takes 30, because 29 is the 3D Studio kit. Each plan has a Build log, and each run keeps its record in `docs/runs/<plan-id>/`. What still lives on other branches is listed in [HISTORY.md](HISTORY.md), part 3.
- **Rules of the product:** [CONTRACT.md](CONTRACT.md). **How people use it:** [USER-MANUAL.md](USER-MANUAL.md).
- **Evidence and finished media:** Drive, `Anthony Mac Storage/Project Outputs/The Words of Mother's Love`, https://drive.google.com/drive/folders/1JBeoaxaZ9ZMTIFMSmlKT5jn9rcdysnmw. Captures and probe output go there, not into Git.
- **Working copies:** the main checkout `/Users/anthony/Projects/mothers-love` stays on `main`. Other working copies sit under `/Users/anthony/Projects/mothers-love-worktrees/` and two under `/Users/anthony/Documents/Codex/2026-09-20/`; Plan 28 Section 4 brings them to one per live branch.

## Rules that matter on the next change

- Never run a bare `git push` in the main checkout: it tracks `origin/main`, and a push to `main` deploys production.
- No real recognition, submitted name or other personal data in Git, fixtures, screenshots or logs. Tests use fictional records only.
- `/display` and its eleven screens stay the TV view. The 3D world becomes its own surface and never enters the TV playlist (Plan 28).
- Nothing written for Anthony contains an em or en dash.
