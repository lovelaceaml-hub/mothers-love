# Plan 33: polish, speed and cleanup (November 2026)

Anthony's request, 2026-11-10: "completely enhance, review, research, revise, suggestions, additions, streamline, effectiveness, smoothness, refine, refactor mothers words of love". He chose "Go ahead on your own" and "Everything, safest first": the security update, then smoother and faster phone pages and TV, then cleanup behind the scenes and current documents, then a list of suggested additions for him to pick from.

Branch `feat/app-polish-2026-11`, pull request [#52](https://github.com/lovelaceaml-hub/mothers-love/pull/52) into `main`. It is built on the 2026-11-03 review branch, so it contains pull request [#51](https://github.com/lovelaceaml-hub/mothers-love/pull/51) (the security update) and pull request [#46](https://github.com/lovelaceaml-hub/mothers-love/pull/46) (offscreen feed cards). **Live since 2026-11-11**, when Anthony merged #52 (see the Build log).

## What the review found (measured on the live site, 2026-11-11)

| Finding | Evidence | Effect |
| --- | --- | --- |
| The live site still runs Next.js 16.3.4 | `npm audit --omit=dev` on `main`: 1 critical (remote code execution), 2 high | The fix has waited in #51 since 2026-11-04 |
| The server runs on the East Coast, the database in California | Response header `x-vercel-id: sfo1::iad1::...`; database host `aws-0-us-west-1` | Every database step crosses the country and back. `/api/feed` took 0.50 to 0.55 s warm and 1.35 s cold; `/api/display/color-polish` 1.1 s; `/api/display/likes-total` 1.0 s; a route with no database (`/api/display/build`) took 0.2 s |
| The home page never uses its "nothing changed" shortcut | With compression the tag arrives as `W/"..."`; the page accepted only `"..."`, so it never sent a conditional request | Every refresh downloads the whole list again (about 15 KB compressed, 45 KB raw, every 10 seconds per open phone in the fast windows), and so does every older page a visitor opened |
| A matching conditional request gets an empty 304 from the host | `curl` with `If-None-Match`: `304`, 0 bytes, on `/api/feed`, `/api/display/snapshot` and `/api/display/color-polish` | The server's small "unchanged" reply never reaches a browser; code that expected it would have failed. The TV's fallback view (V6) had exactly this fault: after its first read every refresh failed and the view went stale |
| The public form and the TV download the admin sign-in library | `/recognize` loads 268 KB of scripts (compressed) against 197 KB for the home page; one 65 KB file is the Supabase sign-in code | About a quarter of the form's code is never used there |
| Four automated jobs could never run | They fired only on `codex/home-tv-family` and `codex/mothers-love`, which no longer exist; one pushed commits | Dead weight, and no check at all ran on a pull request into `main` |
| Many browser tests depend on the time of day | Since Plan 32 the pages refresh every 10 seconds only on Saturday 9:00 to 22:00 and Tuesday 18:00 to 22:00 Pacific; specs such as `tests/feed/older-recognitions.spec.ts` and `tests/receipt-feed/receipt-feed.spec.ts` wait for a refresh on the real clock | A large share of the "failing browser suite" of 2026-11-04 is the hour the suite ran, not the app |
| Migrations 018 and 020 are in place | 2026-11-11: `/api/display/likes-total` answered 200 (018) and `/api/display/color-polish?sync=2` answered 200 with a delta (020) | Their functions exist live. Whether each has a row in `mothers_love.schema_migrations` was not read |

## What this plan changes

Section A, security (from #51, unchanged): Next.js 16.4.5, React 19.3.1, supabase-js 2.118.0, Vitest 4.1.12 and patch updates; `npm audit --omit=dev` reports 0. The WebGL, wake lock, rate key and screenshot path fixes of the 2026-11-03 review.

Section B, speed people can feel:

1. `vercel.json` pins the functions to `sfo1`, beside the database. Expected: the feed, hearts, the form's open check, sending a recognition, admin and every TV read answer several tenths of a second sooner. Measure after release (see Release).
2. The home page remembers weak tags and treats the host's empty 304 as the unchanged heartbeat, for the live list and for older pages (`src/components/feed/PublicFeedProvider.tsx`, `src/lib/etag.ts`). The server time for that reply comes from its `Date` header, never earlier than the page's own estimate. If a conditional read ever fails for any reason, the page reads the whole list once more before it would show an error, so the shortcut cannot be the reason a list is lost.
3. The TV's fallback view (V6) accepts the 304 the same way, so it no longer goes stale after its first read.
4. The sign-in library loads only when an admin request needs it (`src/lib/client-api.ts`); the form's two public requests say `auth: false`.
5. Feed cards from the third on are skipped by the browser until they scroll near (`content-visibility`, from #46).
6. On the expressions guide, the heading of the red card ("Please, after you.") takes that card's own dark ink. The page's heading green read 3.6 to 1 on the red, under the 4.5 to 1 the accessibility check asks for; the card's body text already used the darker ink.

Section C, behind the scenes:

1. One guarded read for every TV database read (`src/lib/server/public-display-read.ts`) replaces four copies. Statements, their order, deadlines and error codes are unchanged.
2. One content tag parser (`src/lib/etag.ts`) and one UUID pattern (`src/lib/uuid.ts`) replace ten copies. The three public read routes now accept a tag in either form.
3. `.github/workflows/checks.yml`: types and a production build on every pull request into `main`. Tests never start by themselves: a pull request may name the test files tied to its change in its description (files only, at most 12 per kind), and the complete suites run only by manual dispatch with `full_suite_approved`, which defaults to false (Anthony's rule of 2026-10-17).
4. The four dead workflows are removed (`color-polish-review`, `home-design-review`, `mobile-recognition-review`, `promote-tv-color-polish`). `cinematic-world-review` stays.
5. Tests: new journeys for the weak tag and the empty 304 (`tests/feed/not-modified.spec.ts`) and unit tests for the tag helpers. One heart journey that waited on the real clock now runs on a fixed Saturday morning clock. One heart journey is marked as waiting for a rewrite (`test.fixme` in `tests/feed/reactions.spec.ts`): it needs a refresh to land while a write is pending, which the 10 second schedule no longer allows because a write gives up after 8 seconds.
6. `@axe-core/playwright` returns to 4.11.0 (the version on `main`, dev only). 4.14 turns on a rule that flags the approved heart button (suggestion 9 below).

Section D, documents: this plan, the handoff, the README and the history entry.

## Left alone on purpose

- `AGENTS.md`: agent files stay in review (Anthony, 2026-11-03). Two lines in it are out of date: "PR #30 is not live" and "(next: 31)". The proposed wording is in Section 11 of the [2026-11-03 review](reviews/2026-11-03-review.md); the next plan number is now 34.
- The 3D world's feed (`use-world-feed.ts`) still accepts only strong tags, so it re-reads the whole snapshot on every refresh. It works; fixing it needs the same 304 handling and a world review, so it stays a later step.
- The long components (`PublicFeedProvider.tsx`, `SubmissionForm.tsx`, `V6DisplayExperience.tsx`), the unused legacy `DisplayExperience` component and its stylesheet, the shared scene text fitting, one settings schema, and the per-route admin checks. The admin routes are short and explicit, and a wrapper would save little for a real risk to authorization. The others need a complete browser run to change safely.
- `three`, Playwright and the major upgrades listed in the 2026-11-03 review.
- The repository size (286 MB, almost all screenshots): shrinking it needs a history rewrite, which is Anthony's decision.

## Suggested additions (Anthony picks)

1. **A backup of the recognitions.** They are kept forever, yet the database plan has no scheduled backups and the shared church backup leaves campaign rows out. A weekly encrypted copy to Drive would protect them.
2. **A practice database for previews.** Previews have no database, so no change can be tried with data before it is live. A second free database with fictional records would let every future change be tried first.
3. **Keep a half-written recognition.** The form holds the text only in memory; a call, a switch to another app or a reload loses it. Saving it on the person's own phone until it is sent would prevent that.
4. **Show recognitions sooner.** The list appears only after the page's code loads and asks for it. Sending the hearts together with the list, and the open check together with the form, would remove one wait each.
5. **Fix the clock in the browser tests** that wait on the real time of day, so the complete suite means something at any hour.
6. **Tidy GitHub.** About 20 merged branches are still there; the project rule turns them into `archive/` tags.
7. **Finish Plan 18** Sections C and D (the admin sees every detail).
8. **The real hardware checks** that were never recorded: the church TV at viewing distance, a phone scanning its QR code, and the Android kiosk.
9. **The heart button's spoken name.** A newer accessibility checker (axe 4.14) wants the visible count to be part of the button's name; today the name is "Like recognition for ..." and the count is its description. Changing it means changing the approved wording and its tests, so the checker stays at 4.11 until Anthony decides.

## Release

1. Anthony merges #52. Vercel deploys `main`; every open TV reloads once by itself.
2. Check, in this order: the home page lists recognitions; a heart fills and its count returns; `/display` shows recognitions; `/admin/login` signs in.
3. Measure: `curl -s -o /dev/null -D - https://mothers-love.vercel.app/api/feed` should show `x-vercel-id: sfo1::sfo1::...`, and the same request with `-w "%{time_starttransfer}"` should take well under the 0.5 s measured before.
4. Rollback: Vercel, Deployments, the previous production deployment, Promote. Nothing in this plan touches the database, so no database step is needed either way.

## Build log

- 2026-11-11. Review from the live site and the code; findings in the table above. Branch made from `origin/claude/eager-cori-wlho8e` (#51) in `/Users/anthony/Projects/mothers-love-worktrees/app-polish-2026-11`; #46's commit picked onto it. The Mac was busy (load above 20, other programs), so every check ran in the cloud: GitHub Actions for types, the production build and the named tests, Vercel for the preview build.
- 2026-11-11. Cloud results on commit `d3fd95e`: types and the production build pass; the 12 named unit files pass (106 tests); the 4 named browser files pass (32 journeys, 1 marked as waiting for a rewrite). On the way there the first browser run failed three older journeys for reasons outside this plan: the stricter accessibility checker (heart button name), the red guide card's heading contrast, and two heart journeys tied to the time of day or to a refresh that can no longer happen. Each is handled above.
- 2026-11-11. Preview of this branch, read through the Vercel CLI: `/api/display/build` answered from `sfo1::sfo1`; `/recognize` loads 205 KB of scripts (268 KB live) and `/display` 231 KB (294 KB live), with no file containing the sign-in library. The preview has no database, so the feed, hearts and sending were not exercised on a hosted copy.
- 2026-11-11. Added after those results: a failed conditional read is repeated as a whole read, and after two failures in a row the page stops sending conditional reads; one more journey covers it. The checks for the final commit are on the pull request.
- Not run: the complete unit and browser suites (they need Anthony's explicit approval for the run). Not done: release. Anthony merges #52.
- 2026-11-11, release. Anthony merged #52 at 18:16 UTC (10:16 in Las Vegas, a Wednesday morning, outside the TV's service hours). Merge `65f8a5080a9d965169e2abb52d5fdf667d98feea`, deployment `dpl_BFoKZfmc7H73i1ARwSCRHJnXc7G3` (READY). The live build address reported the merge commit about one minute later, from `sfo1::sfo1`.
- 2026-11-11, after the release. Pages `/`, `/recognize`, `/expressions`, `/privacy`, `/display`, `/world` and `/admin/login` answered 200. Five feed reads took 0.16 to 0.28 s (0.44 to 1.2 s just before the merge); the TV's delta read 0.20 to 0.32 s (1.1 to 1.4 s); the likes total 0.15 to 0.29 s (1.0 s); the open check 0.14 to 0.18 s. A conditional feed read came back 304 with 0 bytes and a `Date` header. `/recognize` loads 205 KB of scripts and `/display` 231 KB, with no file holding the sign-in library. In Chrome on the live site: 100 recognitions with 100 enabled hearts and no error heading; the third card is deferred; the browser saw the weak tag and the 304; the form showed its three fields; `/display` reached the `active` phase. Checked by attributes and counts only; no record was read out or captured.
- Not checked after the release: a real admin sign in, a heart tap or a sent recognition (nothing is ever written to production for a test), an iPhone, and the church TV. GitHub marked #51 merged; Anthony closed #46 the same day.
