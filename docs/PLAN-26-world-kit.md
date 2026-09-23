# Plan 26: the 3D Studio kit inside the heavenly world

**Goal:** the design world (`art=design`) is dressed with the 3D Studio kit: recognition
pearls ringed by expression medallions, lotus, ribbon portal and Butterfly Gate
arrivals, rigged neighbors who speak the nine expressions and hand over hearts, and all
thirteen locations and their corridors laid out from the concept frames, within a
living room TV's budgets, with every standing privacy and wording rule intact.

World goal it serves (Plan 24, quoted): "Upgrade all 13 connected locations and their
travel corridors toward the supplied artwork, reproducing the selected preview's pearl
and entrance appearance while preserving the app's reading, camera, arrival, and
privacy behavior."

## Authority

Anthony, 2026-09-23, to the 3D Studio coordinator: "i give you full creative design and
admin approvals for this 3d world project. I trusts you. take it as far and detailed and
amazing as it can go. Only using Opus 5.5 and Fable. Sol and Astra can also bve used
when available" (quoted verbatim). He also asked that everything serve this world: "live
feed, journey, displaying recognitions". Anthony's physical TV check (Plan 25 G2) stays
his.

## Finish line (Anthony, 2026-09-23)

"This is not for the TV View. It is for the 3d world" (quoted). The deliverable is the
finished 3D world page `/display/world-preview` on its own deployment link. The TV View
`/display` is untouched, and Plan 25's TV promotion is out of scope for this plan.
Anthony granted complete approval within the Mother's Love project, ultracode, up to 15
agents, Opus 5.5 and Fable, Sol and Astra when available, Gemini Flash as reviewer.

## Design and rulings

- Design (authoritative for this plan):
  `/Users/anthony/Projects/3d-studio/docs/design/WORLD-INTEGRATION.md` (lane D1, Fable).
- Coordinator rulings on its open questions:
  `/Users/anthony/Projects/3d-studio/docs/runs/2026-09-23-world-kit-v2/decisions/2026-09-23-D1-rulings.md`.
  Kit on by default under `art=design` with `kit=off`; neighbors return with
  "FICTIONAL NEIGHBORS" cards, active pair only; 18 s legs kept.
- Kit source: `/Users/anthony/Projects/3d-studio/kit/` on its `main` branch.
- Unchanged: the frozen wording layout with "Thank you," at the top; personal pixels only
  on the depth tested face; sample only previews, captures and tests; classic and
  cinematic byte identical; no build-polished-apps or Stitch; no real recognition data
  in agents, Git, fixtures, screenshots or logs.

## Model block

Writers: Claude Opus 5.5 (runtime) and Claude Fable (visual lanes and capture review).
Landing review: Opus 5.5 per lane. Completion review: Codex Sol when its pool has room,
else a fresh Opus 5.5. Runner: the 3D Studio coordinator chat.

## Lanes (section 8 of the design)

Each lane: its own worktree under `/Users/anthony/Projects/mothers-love-worktrees/`
branched from `feat/world-cinematic`, the exact file ownership in design section 8.1, the
acceptance in 8.2. Order: K0 alone first; then K1, K2, K3a, K3b, K4 in parallel; K5; K6.
Release: a new draft PR from `feat/world-cinematic` (draft PR #8 is closed), then Plan 25.

### Lane K0: sockets
Loader, Draco decoder served locally, manifest, sync script from the studio, no op stubs.

### Lane K1: pearl
Kit shell, rim, orbit ring and medallions inside the pearl skin; text parity zero pixels.

### Lane K2: arrivals
Lotus bloom, ribbon portal, constellation sparkle and Butterfly Gate synced to the arrival director.

### Lane K3a: near zones
Welcome, garden, featured, heart, expressions, peacemakers, practice; Garden checkpoint first.

### Lane K3b: far zones and corridors
Calendar, status, orbit, milestone, live-feed, promise, and the thirteen corridors.

### Lane K4: neighbors
Rigged characters, one schedule for clips, cards and accessible text, the heart hand off.

### Lane K5: performance
Canvas ladder, tier plumbing, memory rows, measured budgets on a quiet machine.

### Lane K6: integration
Coordinator: merges, docs, handoff, index, private push, new draft PR.

## Build log

- 2026-09-23: Plan written by the coordinator (Opus 5.5). Record tree
  `docs/runs/2026-09-23-world-kit-integration/`. K0 launching.
- 2026-09-23: K0 merged (7efdacd), kit re-synced twice (neighbors, nature v2), base 2ef8c41. Anthony asleep with ultracode and complete approval; finish line is the 3D world page, not the TV View. Workflow wf_590b2fe1-fe1 launched: K1 (Opus), K2, K3a, K3b (Fable), K4 (Opus) plus 3D Studio lane U0 (Unreal foundation), each with an Opus landing review, a Fable visual review, and a closing Flash second opinion into /Users/anthony/Projects/3d-studio/docs/runs/2026-09-23-night-log.md. Coordinator rulings: K1 may change one hunk of world-recognitions.ts for a lazy kit read; K3b writes tests/world/kit-layout-far.test.ts; K3a and K3b share a structural ZoneLayout table format and the coordinator wires FAR_ZONE_LAYOUTS into the builder at integration.
- 2026-09-23 (new coordinator chat, Opus 5.5): Anthony ruled at 09:12 that reviews happen only at the end of large sections and speed comes first; wave K's remaining polish and review rounds were stopped with no half written files. K2's record, K3a and K3b merged on `world-kit/int`; the far zones render through `kit-far-zones.ts` and the near zones through K3a's builder. Codex Sol wrote K5 (canvas ladder, `studyTier` on the scene so neighbors follow the chosen quality, detail distance, memory rows) and the integration fixes (K1 hero pearl mirror, sky lane clouds for the smaller cloud model). Typecheck clean, 397 world tests pass. Rulings: `docs/runs/2026-09-23-world-kit-integration/decisions/2026-09-23-integration-rulings.md`. Next: build and harness, preview deploy of `feat/world-cinematic`, hero class at K6 when the heroes land, one final review at the end of the section.
