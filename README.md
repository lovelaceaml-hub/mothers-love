# The Words of Mother's Love

A live appreciation campaign: people share recognitions on a public page, administrators review them, and a TV in the church shows them. Live at https://mothers-love.vercel.app.

**Now (2026-09-24):** production is `main`, with eleven TV screens, the sculpted 3D heart, the open hands app icon, an admin list of every submission in arrival order, and Android install with a fullscreen TV kiosk mode. The 3D world has its own address, `/world`, beside the TV display; it goes live when pull request [#19](https://github.com/lovelaceaml-hub/mothers-love/pull/19) merges (Plan 28 Section 5, 2026-09-24). The current state and open items are on one page: [docs/HANDOFF.md](docs/HANDOFF.md).

## Quick links

- **Website:** [Live recognitions](https://mothers-love.vercel.app), [Share a recognition](https://mothers-love.vercel.app/recognize), [Expression guide](https://mothers-love.vercel.app/expressions).
- **TV:** [TV display](https://mothers-love.vercel.app/display), opens directly without a code; [kiosk mode](https://mothers-love.vercel.app/display?kiosk=1) for a dedicated screen; the [Live Recognitions screen](https://mothers-love.vercel.app/display?scene=live-feed).
- **3D world:** [/world](https://mothers-love.vercel.app/world), its own page beside the TV display, never in the TV program; [sample](https://mothers-love.vercel.app/world?source=sample) and [explorer with Settings](https://mothers-love.vercel.app/world?view=explore). Live once pull request [#19](https://github.com/lovelaceaml-hub/mothers-love/pull/19) merges; until then its [preview](https://mothers-love-git-feat-world-surface-lvzion.vercel.app/world) needs a Vercel sign in.
- **Admin:** [Sign in](https://mothers-love.vercel.app/admin/login) with email and password, no authenticator; [Display Studio](https://mothers-love.vercel.app/admin/display).
- **Handoff:** [docs/HANDOFF.md](docs/HANDOFF.md), the current state on one page.
- **History:** [docs/HISTORY.md](docs/HISTORY.md), every release note, newest first, and what still lives outside `main`.
- **Current plan:** [Plan 28, clean up and refactor the repository](docs/PLAN-28-repository-refactor.md), with its [run record](docs/runs/2026-09-22-repo-refactor/INDEX.md).
- **User manual:** [docs/USER-MANUAL.md](docs/USER-MANUAL.md).
- **Product contract:** [docs/CONTRACT.md](docs/CONTRACT.md).
- **Storage:** [The Words of Mother's Love in Drive](https://drive.google.com/drive/folders/1JBeoaxaZ9ZMTIFMSmlKT5jn9rcdysnmw), run evidence, verification captures and finished media. Mounted path: `/Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Anthony Mac Storage/Project Outputs/The Words of Mother's Love`.
- **Source:** [Private repository](https://github.com/lovelaceaml-hub/mothers-love), production branch `main`.
- **Deployments:** [Vercel project](https://vercel.com/lvzion/mothers-love).

## Plans

Every plan lives in `docs/`. Plans are numbered by the date each was first committed (Anthony's ruling, 2026-09-23); the next new plan takes number 30.

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
| [18](docs/PLAN-18-keep-forever-and-admin-details.md) | Keep every recognition, admin details | Draft; the admin list fix it led to went live 2026-09-20 |
| [19](docs/PLAN-19-world-prototype-01.md) | World prototype 01 | Part of the 3D world branch, not live |
| [20](docs/PLAN-20-heavenly-world.md) | A heavenly world | Part of the 3D world branch, not live |
| [21](docs/PLAN-21-living-heaven.md) | A living heaven of kindness | Part of the 3D world branch, not live |
| [22](docs/PLAN-22-tv-bubbles-and-autoplay.md) | Recognition bubbles and hands free touring | Part of the 3D world branch, not live |
| [23](docs/PLAN-23-recognitions-in-the-world.md) | Fly among recognitions | Part of the 3D world branch, not live |
| [24](docs/PLAN-24-world-visual-quality.md) | Whole world visual upgrade | Pass D2 done; P0 closed by pull request #16; reaches `main` with the world in pull request #19 |
| [25](docs/PLAN-25-live-tv-pearl-study.md) | Live TV pearl design study | Archived 2026-09-24 as tag `archive/feat/tv-pearl-design`, not live |
| [26](docs/PLAN-26-pearl-sequence.md) | Expression Cosmos prototype | Archived 2026-09-24 as tag `archive/feat/tv-pearl-sequence`, not live |
| [27](docs/PLAN-27-world-promotion.md) | Promote the heavenly world (was 25) | G5 superseded; G1 done by Plan 28 Section 5 (pull request #19); the completion review passed in Plan 28 Section 8; the TV check and merge follow |
| [28](docs/PLAN-28-repository-refactor.md) | Clean up and refactor the repository (was 26) | Sections 0 to 7 done; Section 8's completion review passed, pull request #19 waits for the TV check and merge |
| [29](docs/PLAN-29-world-kit.md) | The 3D Studio kit inside the heavenly world (was 26) | Integrated into the world; its file reaches `main` with pull request #19 |
| [30](docs/PLAN-30-older-recognitions.md) | Show older recognitions | Complete, live 2026-09-26 |

## Other documents

- [Product brief](docs/PRODUCT-BRIEF.md), [clickable journeys](docs/USER-JOURNEYS.md), [design](docs/DESIGN.md), [hosting decision](docs/HOSTING-DECISION.md), [asset sources](docs/ASSET-SOURCES.md).
- Reviews: [UI quality report](docs/UI-QUALITY-REPORT.md), [Color Polish review](docs/COLOR-POLISH-REVIEW.md), [home design review](docs/HOME-DESIGN-REVIEW.md), [retrospective](docs/RETRO.md).
- TV: [V6 real TV migration](docs/V6_REAL_TV_MIGRATION.md), [Color Polish live deploy](docs/color-polish-live-deploy.md), [approved visual references](docs/source-handoff/references/README.md).
- [Release records](docs/releases/), [commercial script](docs/video/SCRIPT.md), and every run's record under [docs/runs/](docs/runs/).

Code and fictional fixtures may be privately backed up; live personal recognitions never belong in this repository. Existing database resources outside the campaign namespace are protected.
