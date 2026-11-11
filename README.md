# The Words of Mother's Love

A live appreciation campaign: people share recognitions on a public page, administrators review them, and a TV in the church shows them. Live at https://mothers-love.vercel.app.

`main` is at merge `81a73fe` (pull request [#50](https://github.com/lovelaceaml-hub/mothers-love/pull/50), 2026-10-29); a push to `main` deploys production. The last production deployment recorded in these documents is commit `29da0dd7aa1c5497765809692c7d40c8cb8abd09`, Vercel deployment `dpl_DNb1ULXANYHiKbqNgVVZQazoPWuy` (READY, 2026-10-12); later merges are listed in [docs/HANDOFF.md](docs/HANDOFF.md). Pull request [#30](https://github.com/lovelaceaml-hub/mothers-love/pull/30) (TV display efficiency) merged on 2026-10-12 together with its current-main integration, pull request [#39](https://github.com/lovelaceaml-hub/mothers-love/pull/39). Whether migration `database/020_display_delta.sql` was applied to the live database is not recorded in this repository.

## Quick links

- **Website:** [Live recognitions](https://mothers-love.vercel.app), [Share a recognition](https://mothers-love.vercel.app/recognize), [Expression guide](https://mothers-love.vercel.app/expressions).
- **TV:** [TV display](https://mothers-love.vercel.app/display), opens directly without a code; [kiosk mode](https://mothers-love.vercel.app/display?kiosk=1) for a dedicated screen; the [Live Recognitions screen](https://mothers-love.vercel.app/display?scene=live-feed).
- **3D world:** [/world](https://mothers-love.vercel.app/world), its own page beside the TV display, never in the TV program; [sample](https://mothers-love.vercel.app/world?source=sample) and [explorer with Settings](https://mothers-love.vercel.app/world?view=explore). Live since 2026-09-24 (pull request [#19](https://github.com/lovelaceaml-hub/mothers-love/pull/19)).
- **Admin:** [Sign in](https://mothers-love.vercel.app/admin/login) with email and password, no authenticator; [Display Studio](https://mothers-love.vercel.app/admin/display).
- **Handoff:** [docs/HANDOFF.md](docs/HANDOFF.md), the current state on one page.
- **History:** [docs/HISTORY.md](docs/HISTORY.md), every release note, newest first, and what still lives outside `main`.
- **Waiting for release:** [Plan 33, security update, speed and cleanup](docs/PLAN-33-polish-and-speed.md), pull request [#52](https://github.com/lovelaceaml-hub/mothers-love/pull/52). Until it merges the live site runs a Next.js version with a critical advisory.
- **Current plans:** [Plan 32, scheduled public polling](docs/PLAN-32-polling-schedule.md), merged in pull request #40 on 2026-10-12, and [Plan 31, TV display efficiency](docs/PLAN-31-display-efficiency.md), merged through pull requests #30 and #39 on 2026-10-12. The live status of migration 020 is not recorded. [Plan 18](docs/PLAN-18-keep-forever-and-admin-details.md) Sections C and D remain future work.
- **User manual:** [docs/USER-MANUAL.md](docs/USER-MANUAL.md).
- **Product contract:** [docs/CONTRACT.md](docs/CONTRACT.md).
- **Storage:** [The Words of Mother's Love in Drive](https://drive.google.com/drive/folders/1JBeoaxaZ9ZMTIFMSmlKT5jn9rcdysnmw), run evidence, verification captures and finished media. Mounted path: `/Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Projects/Mother's Love/The Words of Mother's Love`.
- **Source:** [Private repository](https://github.com/lovelaceaml-hub/mothers-love), production branch `main`.
- **Deployments:** [Vercel project](https://vercel.com/lvzion/mothers-love).

## Plans

Every plan lives in `docs/`. Plans are numbered by the date each was first committed (Anthony's ruling, 2026-09-23); Plan 33 is the newest plan, so the next new plan takes 34.

| Plan | Subject | Where it stands |
| --- | --- | --- |
| [01](docs/PLAN-01-full-app.md) | Full app and deployment | Complete, live |
| [02](docs/PLAN-02-copy-cleanup.md) | Simple app instructions | Complete, live |
| [03](docs/PLAN-03-live-feed.md) | Live recognition home page | Complete, live |
| [04](docs/PLAN-04-polish-and-hearts.md) | Presentation, hearts and shared live feed | Complete, live |
| [05](docs/PLAN-05-direct-tv.md) | Open TV View directly | Complete, live |
| [06](docs/PLAN-06-garden-refresh.md) | Recognition Garden live refresh | Complete, live |
| [07](docs/PLAN-07-flexible-names.md) | Flexible name input | Complete, live |
| [08](docs/PLAN-08-tv-garden-and-submission.md) | TV Garden and submission experience | Complete, live |
| [09](docs/PLAN-09-interview-completion.md) | Complete the approved interview experience | Complete, live |
| [10](docs/PLAN-10-color-polish.md) | Match the TV to Color Polish | Complete, live |
| [11](docs/PLAN-11-tv-click-and-home-polish.md) | TV click advance and home polish | Complete, live |
| [12](docs/PLAN-12-tv-stability-countdown-and-home-action.md) | TV stability, scene countdown, home action | Complete, live |
| [13](docs/PLAN-13-tv-scene-refactor.md) | TV scene review and refactor | Closed without promotion; its split scene structure went live with Plan 17 |
| [14](docs/PLAN-14-commercial-video.md) | Campaign commercial video | Built 2026-09-11, files in Drive under `Commercial`; Anthony's viewing not recorded |
| [15](docs/PLAN-15-tv-next-level.md) | TV next level pass | Released through Plan 17 |
| [16](docs/PLAN-16-feed-100.md) | Latest 100 recognitions | Complete, live |
| [17](docs/PLAN-17-tv-fit-and-release.md) | TV text fit and Plan 15 release | Live since 2026-09-19 |
| [18](docs/PLAN-18-keep-forever-and-admin-details.md) | Keep every recognition, admin details | Approved 2026-09-23; Sections A and B live 2026-09-24 (every recognition kept forever, migration 016); Sections C and D next. The admin list fix it led to went live 2026-09-20 |
| [19](docs/PLAN-19-world-prototype-01.md) | World prototype 01 | Part of the 3D world, live at `/world` since 2026-09-24 (pull request #19) |
| [20](docs/PLAN-20-heavenly-world.md) | A heavenly world | Part of the 3D world, live at `/world` since 2026-09-24 (pull request #19) |
| [21](docs/PLAN-21-living-heaven.md) | A living heaven of kindness | Part of the 3D world, live at `/world` since 2026-09-24 (pull request #19) |
| [22](docs/PLAN-22-tv-bubbles-and-autoplay.md) | Recognition bubbles and hands free touring | Part of the 3D world, live at `/world` since 2026-09-24 (pull request #19) |
| [23](docs/PLAN-23-recognitions-in-the-world.md) | Fly among recognitions | Part of the 3D world, live at `/world` since 2026-09-24 (pull request #19) |
| [24](docs/PLAN-24-world-visual-quality.md) | Whole world visual upgrade | Pass D2 done; P0 closed by pull request #16; reached `main` with the world in pull request #19, 2026-09-24 |
| [25](docs/PLAN-25-live-tv-pearl-study.md) | Live TV pearl design study | Archived 2026-09-24 as tag `archive/feat/tv-pearl-design`, not live |
| [26](docs/PLAN-26-pearl-sequence.md) | Expression Cosmos prototype | Archived 2026-09-24 as tag `archive/feat/tv-pearl-sequence`, not live |
| [27](docs/PLAN-27-world-promotion.md) | Promote the heavenly world (was 25) | G5 superseded; G1 done by Plan 28 Section 5 (pull request #19); the completion review passed in Plan 28 Section 8; #19 merged 2026-09-24. Anthony's TV check is not recorded |
| [28](docs/PLAN-28-repository-refactor.md) | Clean up and refactor the repository (was 26) | Sections 0 to 7 done; Section 8's review passed and pull request #19 merged 2026-09-24, so the world is live at `/world`. Closing entry 2026-10-02 in its Build log, with what is left |
| [29](docs/PLAN-29-world-kit.md) | The 3D Studio kit inside the heavenly world (was 26) | Integrated into the world; live at `/world` since 2026-09-24 (pull request #19) |
| [30](docs/PLAN-30-older-recognitions.md) | Show older recognitions | Complete, live 2026-09-26 |
| [31](docs/PLAN-31-display-efficiency.md) | TV display efficiency | Merged 2026-10-12 through pull requests #30 and #39; the live status of migration 020 is not recorded in this repository |
| [32](docs/PLAN-32-polling-schedule.md) | Scheduled public polling (Pacific time) | Merged 2026-10-12 in pull request #40 |
| [33](docs/PLAN-33-polish-and-speed.md) | Security update, speed and cleanup | Complete in pull request #52, checked in the cloud; waits for Anthony's merge (2026-11-11) |

## Other documents

- [Product brief](docs/PRODUCT-BRIEF.md), [clickable journeys](docs/USER-JOURNEYS.md), [design](docs/DESIGN.md), [hosting decision](docs/HOSTING-DECISION.md), [asset sources](docs/ASSET-SOURCES.md).
- Reviews: [UI quality report](docs/UI-QUALITY-REPORT.md), [Color Polish review](docs/COLOR-POLISH-REVIEW.md), [home design review](docs/HOME-DESIGN-REVIEW.md), [retrospective](docs/RETRO.md).
- TV: [V6 real TV migration](docs/V6_REAL_TV_MIGRATION.md), [Color Polish live deploy](docs/color-polish-live-deploy.md), [approved visual references](docs/source-handoff/references/README.md).
- [Release records](docs/releases/), [commercial script](docs/video/SCRIPT.md), and every run's record under [docs/runs/](docs/runs/).

Code and fictional fixtures may be privately backed up; live personal recognitions never belong in this repository. Existing database resources outside the campaign namespace are protected.
