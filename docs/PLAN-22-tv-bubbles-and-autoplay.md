# Plan 22: Recognition bubbles and hands-free TV touring

Goal: Show recognitions in beautiful circular bubbles and keep the heavenly world moving automatically on a continuously running TV, without requiring clicks.

## Authority and boundaries

Anthony's September 21 correction identifies a large square recognition blocking the view and a camera that appeared stationary until clicked. This bounded correction supersedes the rectangular presentation and inherited scene dwell. The radiant pearl direction, thirteen locations, grand entrances and complete recognition reading remain. Delivery stays on the existing feature preview. Production display, public API, database and original checkout are outside edit scope. Personal content never enters fixtures, logs, agents or saved images.

## Models, effort, agents, review

- Implementation and integration: current controller session, sole writer in this feature worktree.
- Investigation: existing explorer, read-only, limited to timing and nonpersonal public settings.
- Review: one native Codex read-only review, Sol high. Correct accepted findings directly without a second review round.
- Verification: focused typecheck/lint, camera and text safety tests, two hands-free browser journeys and hosted visual smoke. No broad repeat suite or fixed soak.

## Required behavior

1. Ordinary and arrival recognitions use round pearl bubbles. The world remains visible around them; ordinary bubbles fade away during travel.
2. The camera glides gently during reading and automatically moves between locations. World stops use a 20-second minimum, extended until the full message has received its reading time, instead of inheriting the old 180-second Garden dwell.
3. Reduced motion and Still view automatically change locations with immediate cuts. Explicit user pause/hold and owner pause remain honored.
4. Long messages page automatically inside bubbles. Overflow gently advances through each page, with time at its beginning and end. Full recognition browser text remains available.
5. Deploy the corrected preview, verify hands-free movement and circular layout, and back up the exact source checkpoint privately.

## Build log

- Baseline: 91e61760a46b41194ed9b2b0a8db8c4abfb397a9 on feature/tv-3d-world-prototype-01. Six world files changed; original checkout remains untouched.
- Root causes: rectangular recognition/arrival overlays; old Garden dwell inherited at 180 seconds; reduced/still mode skipped camera-director advancement entirely. The live settings are normal/lively with rotation and arrivals unpaused, so the apparent freeze was not an owner pause.
- Implemented circular overlays, shorter automatic pages, a gentle reading glide, 20-second world stops and automatic still cuts. Camera departure finishes the visible recognition fairly before selecting the next one, including immediate cuts. Owner and explicit reader holds remain effective.
- Initial typecheck, focused lint and existing 35 camera/text-safety tests passed. Focused regression cases now exercise no-click automatic normal and reduced-motion progression against the old 180-second fixture, plus circle geometry and fair recognition replacement.

- The sole native Sol high review found two issues: an old long-message test expected three pages and the previous label, and the fade could disappear when leaving a recognition location for an information location. Updated the assertion from the actual grapheme page count and placed the opacity transition on the base content container, with reduced-motion transition suppression. No second review was launched.
- Current camera/text safety checks pass: 36 tests. Typecheck and focused lint passed. An exact hosted live-data smoke proved camera motion and automatic scene change with no click, with zero page errors and aggregate-only output. Hosted fictional desktop and phone views show circular reading and arrival bubbles.
- Local dev serving stalled before page compilation under both development bundlers. Hosted optimized build succeeded, so browser verification uses the exact configured preview instead. Early test setup assumed the wrong next location and a multi-record Featured pool; corrected these fictional fixture assumptions before final verification. No personal data or backend configuration was copied.

## Final delivery

[Corrected preview](https://mothers-love-fzpf184o3-lvzion.vercel.app/display/world-preview), deployment `dpl_2d4mnuhiNsSw8GuBngUjEEXXypo7`, reached READY with an optimized build and TypeScript check. Three focused hosted browser journeys passed: no-click normal tour, no-click reduced-motion tour, and complete long Unicode reading. Circle geometry and fair next-recognition selection passed in both tour modes. The final release adds the reviewed departure-fade correction; source logic is otherwise identical to the hosted automatic-tour proof.

The private feature branch remains the backup destination. The source manifest records exact deployable world file hashes; the output delivery receipt records the verified commit and remote branch hash. Original checkout baseline e5ffa3ac95b9d977eefead42a4adaee26f821a5f and its unrelated untracked artifacts are unchanged. No production, schema, catalog, authentication or public API changes.

Physical TV performance and room-distance readability still require observation on the actual TV. Software verification proves automatic behavior without user input; it does not claim physical-device commissioning.
