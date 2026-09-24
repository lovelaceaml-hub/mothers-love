# Section 5 kickoff (cloud): the world page

This file stands alone. It is the execution envelope for a Claude Code **cloud** session
working in the GitHub repository `lovelaceaml-hub/mothers-love` on branch
`lane/painted-world/web`. The plan itself lives in another private repository
(`lovelaceaml-hub/mothers-love-world`, file `docs/PLAN-01-painted-world-and-hosts.md`);
everything this section needs from it is copied below, so the session works even if it
cannot open that repository.

Anthony chose to run Section 5 in the cloud alongside Section 3 on 2026-09-23 ("1").
Written by the Section 3 chat (Claude Opus 5.5).

## Goal line (Revision 2, 2026-09-24)

"the world page on the church TV and a roughly 90 second film are fully 3D in the world's
current look, packed with readable recognition bubbles and a live feed, and hosted by
Peace and Joy."

**Revision 2: everything stays 3D.** Anthony: "I want everything to be 3D." No painted
sky panoramas, painted layers, painted colour filter or matte paintings. The world keeps
its current 3D look (the current sky, clouds and grade stay) and all 13 places. Section
5 steps 1 and 2 (painted backdrop, painted filter) are removed.

## Setup line

frontier · high · Lane: Claude (cloud) · Agents: none · Review: controller
- Claude: Opus 5.5 · high (fallback: Opus 5.5 · high). The project allows Opus 5.5 and
  Fable only (the Mother's Love grant); at most 6 agents at once. No Haiku, Sonnet or
  Gemini: the writer does its own hygiene sweep before review.
- Reviewer: a fresh read-only Claude Opus 5.5 · high reviewer on landing (the writer
  never grades its own work). Anthony's visual gate: the Garden side by side (step 10).

## Execution envelope

- Project / unit: The painted Mother's Love world, hosted by Peace and Joy; Section 5:
  the world page.
- Lane: Claude, cloud session.
- Read first:
  1. this file;
  2. `AGENTS.md` at the repository root (the world repo's own rules);
  3. `src/components/display/world/` (start with `WorldContent.tsx`,
     `world-data.ts`, `recognition-director.ts`, `arrival-director.ts`,
     `kit/kit-manifest.ts`, `kit/kit-loader.ts`).
- Branch: `lane/painted-world/web`, cut from `feat/world-cinematic` at 78483e2. Commit
  and push to this branch only. **Never merge** (the coordinator merges into
  `feat/world-cinematic` after review; nothing goes to `main`).
- In scope (the web ownership allowlist; change nothing else):
  - `src/components/display/world/`, `src/app/display/world-preview/`;
  - `tests/world/`, `public/world/`, `scripts/world-*`;
  - `docs/`.
  Shared code outside those paths (`src/lib/*`,
  `src/components/display/use-display-chimes.ts`, `src/components/display/color-polish*`,
  `src/app/display/page.tsx`) is import only. Check before every push:
  `git diff --name-only origin/feat/world-cinematic...HEAD` lists nothing outside the
  allowlist.
- Protected / out of scope: the live TV View `/display` and
  `src/components/display/color-polish/` (never touch); `main`; production; any real
  recognition text (sample data only, `?source=sample`); accounts, tokens, passwords,
  purchases; painted backdrops or painted filters (removed by Revision 2).
- Data rule: the world page reads only `/api/display/color-polish` (same endpoint,
  records and fields the TV View already shows, polled every 5 s with the `after`
  cursor by `use-world-feed.ts`). No new query, field or endpoint. `?source=sample` uses
  `sampleWorldFeed()` and never calls the network. Every preview, capture and test uses
  sample mode.

## The work (plan Section 5, Revision 1 text; steps 1 and 2 removed)

**Cloud first, then two Mac-only steps.** Steps 0 and 11 need this Mac's Chrome and
Google Drive, which a cloud session cannot reach. Do not attempt them here: record them
as "pending, Mac" in the record file. They run later in a local chat against the same
`feat/world-cinematic` commit (78483e2), before landing. Because this lane works on its
own branch, that commit does not move meanwhile.

0. (Mac only) **Baselines**: `?art=classic` and `?art=cinematic` stills of
   `feat/world-cinematic` at 78483e2 with the review harness
   (`DESIGN_REVIEW_CHANNEL=chrome`, sample mode), plus `/display` in sample mode, to
   Drive `3D World/previews/baselines/<commit>/` with a `SHA256SUMS` file.
3. **Foreground restyle**: pearl white stone, gold filigree and pastel blossom in
   `prototype/study-materials.ts`; ringed pearls, drifting petals, denser blossom and
   waterfalls through `kit/kit-loader.ts`. (3D only, in the world's current look.)
4. **Bubbles and readability**:
   - thicker rainbow rim, inner glow, gold orbit rings, expression medallions and a heart
     count, building on `studyGlass()`, `paintStudyPearl` (`prototype/pearl-skin.ts`) and
     `world-recognitions.ts`;
   - big bubbles show the whole message as the TV View shows it (same text source, no
     new truncation);
   - at 1080p: big bubbles at least 34 px body text, small at least 22 px; contrast at
     least 4.5 to 1 against the bubble fill;
   - a message too long for 9 lines at 34 px scrolls slowly inside the bubble during the
     hold, never cut; emoji use the system emoji font; URLs show as plain text;
   - hold time 12 s, plus 1 s per 20 characters over 160, at most 20 s
     (`recognition-director.ts` and the `readingSeconds` use in `WorldContent.tsx`).
5. **Bubble placement and tour timing**:
   - per place 1 or 2 big and 4 to 8 small bubbles, plus bubbles along the corridors;
     the newest go into the big bubbles and the first places, repeating when there are
     few;
   - each visit holds on one big bubble; a place's second big bubble is held on the next
     loop, so one loop stays under about 6 minutes with 13 places;
   - new arrivals interrupt the tour at most once per 60 s; arrivals inside that window
     join the ticker at once and get their lotus presentation in order at the next
     allowed time; the queue keeps at most 10 (older stay in the ticker and bubbles);
     after 3 interruptions in a row the tour completes the next place before another.
6. **Live feed**:
   - a glass ticker along the whole bottom of the screen in `WorldContent.tsx`, fed by
     `use-world-feed.ts`;
   - a River of Recognitions stop: bubbles drift down the river in two columns (the
     idea of the TV's Live Recognitions screen, not its code);
   - tests in `tests/world/`, each with a sample fixture: 0, 1, 3, 100 and 150 records
     (at most 100 shown); a duplicate event; a malformed payload; offline then
     reconnecting; 12 arrivals in 10 s; a record that disappears from the snapshot is
     gone from every place within one poll.
7. **TV features carried over**: the QR code to `/recognize`; the nine expressions
   teaching at the Grove; monthly impact, this week's goal and the calendar (existing
   `Calendar` and insights code in `WorldContent.tsx`); chimes through
   `use-display-chimes.ts`, import only.
8. **Screen text and hosts**:
   - top left: heart logo, place title and a short line; top right: "Live
     recognitions"; the settings panel hidden; speed fixed at 2;
   - Peace and Joy fly just ahead of the camera; on a new arrival `arrival-director.ts`
     has them carry the bubble in as the lotus blooms (clip `carry_bubble`), then
     present it during the hold (`present_bubble`);
   - add the `host` budget class to `kit/kit-manifest.ts` (`KitBudgetName`,
     `KIT_BUDGETS`) at 20,000 vertices and 400 KB;
   - **until the lamb files are merged into 3D Studio `main`**, build against the
     placeholder (two pastel spheres with wings) behind `hostsReady=false`. The lamb
     contract, from Section 3 (details in 3D Studio `kit/world/hosts/manifest.json` on
     branch `lane/painted-world/hosts`): files `peace.glb`, `joy.glb` (Draco, about
     10,200 vertices and 265 KB each); glTF Y up, facing +Z, 0.9 m tall, soles at the
     origin; one skeleton under the node `host_rig` with bones `root, hips, spine, chest,
     neck, head, upper_arm_L/R, lower_arm_L/R, hand_L/R, upper_leg_L/R, lower_leg_L/R,
     foot_L/R, wing_L/R, ear_L/R, jaw, eye_L/R` plus the non-deforming node `bubble`
     (parent a recognition bubble of radius 0.12 m to it); clips `fly_idle` (loop,
     default), `fly_forward` (loop, in place), `turn_left`, `turn_right` (loops, bank
     while the object turns), `wave`, `point`, `bow`, `cheer`, `giggle`, `carry_bubble`
     (loop), `present_bubble` (from and back to the carry pose), and the mouth shapes
     `talk_a`, `talk_e`, `talk_o`, `talk_closed`, which animate only `jaw` and layer over
     any body clip. The sparkle trail is a separate effect, not a clip. After the merge,
     re-sync the kit with `node scripts/world-kit-sync.mjs` (it needs a 3D Studio
     checkout; if the cloud session cannot reach `lovelaceaml-hub/3d-studio`, leave the
     re-sync as "pending, Mac").
   - `tests/world/hosts-glb.test.ts` (already on this branch, from Section 3) loads the
     real lamb files and plays every clip. It skips when no lamb files are found; set
     `HOSTS_KIT_DIR` to a folder holding `peace.glb` and `joy.glb` to run it.
9. **Tiny family**: the existing rigged figures (W5 neighbors) walk, act out kindness and
   stop to look up at bubbles, restyled to the pastel palette.
10. **Order**: build the Garden first. Show Anthony the old Garden and the new Garden
    side by side on a Vercel **preview** link (sample mode). Do the other places only
    after his yes. (The painted target from Revision 1 is set aside by Revision 2.)
11. (Mac only, before landing) **Safety checks**: the allowlist diff check;
    `?art=classic` byte identical to the step 0 baselines on this Mac's Chrome channel;
    the TV View `/display` in sample mode captured before and after, pixel identical;
    `npx vitest run` (the whole suite, not only `tests/world`); the K5 rule stays (Auto
    drops a tier below 25 fps).
12. **Land**: the coordinator (not this session) merges `lane/painted-world/web` into
    `feat/world-cinematic` after the landing review.

Coordinator rulings Anthony may overrule at the Garden side by side: the hold time
formula, one arrival interruption per 60 s, and 5 to 13 places.

## Acceptance

Everything in steps 3 to 10 works in sample mode; `npx vitest run` and `npx tsc --noEmit`
pass; the allowlist check is clean; Anthony has said yes to the Garden side by side; steps
0 and 11 are listed as "pending, Mac" with the exact commands for the local chat.

## Verify (cloud)

`npm ci`, `npx tsc --noEmit`, `npx vitest run`, the allowlist diff check above, and
screenshots of `/display/world-preview?source=sample` from a headless browser for your
own look check (software WebGL is fine for layout; the Mac baselines are the authority).

## Gate and first checks (do these before any edit)

1. Confirm this branch's base is `feat/world-cinematic` 78483e2 and that the only commit
   on top is Section 3's test file (and this kickoff).
2. Say whether this session can read `lovelaceaml-hub/3d-studio` and
   `lovelaceaml-hub/mothers-love-world`, and whether pushing this branch produces a
   Vercel preview link on its own. Report those facts before building; if the preview
   link does not appear, say so plainly, do not add tokens or change Vercel settings.

## Completion output

Record progress and the final result in `docs/runs/painted-world-web/S5.md` on this
branch (what shipped, commits, check results, deviations, what is pending on the Mac,
whether the setup line was right). The coordinator copies it into the plan's Build log.
Push after every landed step. Reply to Anthony in plain language (he is not a
programmer; he has ADHD: outcome first, short, numbered steps, one small next action,
links for everything, no em or en dashes).
