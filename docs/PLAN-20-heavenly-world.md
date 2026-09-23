# Plan 20: Mother's Love, a heavenly world

Goal: Create an exceptionally beautiful, colorful heavenly journey through every current Mother's Love TV experience, with readable recognitions and glorious entrances for newly published recognitions, and deliver the complete working world on a preview URL.

## Authority and delivery
Anthony expanded World Prototype 01 on September 20, 2026: "fully plan out and make this entire project extremely heavenly, as if we're journeying through colorful love heaven and able to see the recognitions"; "When the new ones first come, they should have a glorious and grand entrance"; "Based on the current app I want you to implement all of those ones into this one that you're building"; "Do it from start to finish: extremely detailed, extremely beautiful, with beautiful effects."

This plan supersedes the three-zone-only scope of Plan 19. The existing prototype is the foundation, not completion of this larger request. Delivery remains a separate preview at `/display/world-preview`. Existing production `/display`, admin behavior, database schemas, published content, settings, and production aliases remain protected. No production replacement is authorized by inference. Live mode is read-only and uses the existing explicitly public display endpoint. No recognition is created to demonstrate an arrival in live mode.

## Models, effort, agents, review
- Implementation and integration: current Codex controller session, solo, on the existing isolated branch. No delegated implementation lanes.
- Controller review: native Codex review, gpt-5.6-sol, high, read-only.
- Additional privacy review: warranted by newly displaying real recognition data; bounded read-only review of sample-only source/evidence, no production records.
- Design references: private Stitch project, only fictional content. Existing canonical app words/colors remain authoritative.
- Root owns source, provider actions, evidence, source backup, and final report. Historical implementation-role instructions apply to delegated lanes, which this plan does not launch.

## Product brief and first successful moment
People in a church room glance up at a shared TV and see an unmistakably peaceful, colorful world. They recognize the current Mother's Love identity, see an act of kindness become part of that world, and can read its full message without following fast-moving text. The world invites attention without demanding continuous attention or resembling a game.

The signature moment is a distant light opening into an immense luminous portal, a pearl arriving on a trail of petals and gold, the camera settling, the recipient's name and complete recognition receiving a generous quiet reading interval, and the pearl becoming a lasting ambient part of the garden while the journey resumes.

## Art direction
- Adjectives: radiant, abundant, tender.
- Materials: pearl porcelain, translucent champagne silk, rose crystal, clear water, gold filigree, soft flower petals and mint foliage.
- Color: warm ivory light with all nine canonical expression colors. Color changes by location and recognition expression, not random flashes.
- Composition: the world occupies most of the TV; large reading areas use strong plum text on stable light surfaces. A new arrival receives the dominant area. Controls are unobtrusive and can be hidden.
- Typography: expressive serif headings for identity; clear sans-serif names/messages where appropriate; no condensed or tiny recognition text.
- Motion: slow camera dolly/crane moves, dwell periods for reading, layered ambient drifting, foreground and background occlusion, flowing ribbons, particles that gather and settle. No abrupt camera jumps in touring mode, no camera roll, no strobe, no aggressive zoom.
- Anti-goals: generic dashboard, neon game world, empty gray geometry, decorative text that is impossible to read, angel/wing/cross/church imagery, real people's data in design tooling.
- Phone: intentional view with world art above a readable content region and accessible map/control panels. Landscape TV is the primary art canvas.
- Direction choice: asked Anthony whether radiant pearl, evolving daylight, or celestial twilight should lead. Record his answer in the Build log; Anthony selected radiant pearl heaven; this is the final direction.

## Full scene parity map
| Existing TV experience | World location | Content and signature |
| --- | --- | --- |
| Welcome | Butterfly Gate | Butterfly silhouettes, pearl arch, title/tagline, invitation, current recognition count, submission link/QR |
| Recognition Garden | Garden of Kindness | Dense flowers and foliage, hovering recognition pearls, full readable stories, fair rotation |
| Featured Recognition | Pearl Pavilion | Jewel canopy, one prominently featured or fairly selected recognition, its expressions, quiet reading |
| Recognition Calendar | Garden of Days | Raised pearl calendar steps, real current-month daily totals, selected day and its recognitions |
| Participation Status | Love Observatory | Floating expression medallions, current week/month/campaign totals, all nine expression counts |
| Nine Expressions | Nine Expressions Grove | Nine colored monuments, exact phrases and principles, selected expression examples |
| We Are Peacemakers | Peace Globe | Translucent luminous globe, golden connection arcs, messages and peace theme |
| Peace in Practice | Heart Sanctuary | Inflated rose heart, dimensional flowing silk, ambient hearts, exact existing peace message and recognitions |
| Expression Orbit | Expression Cosmos | Real orbiting pearl forms and expression cores, selected expression and corresponding recognitions |
| Weekly Goal / Milestone | Fountain of Kindness | Volumetric rising pearls/ribbons, authoritative current-week goal/value/target, achieved state |
| Live Recognitions | River of Recognitions | Layered pearl waterway, calm ordered feed, stable full-message reading instead of unreadable moving text |
| Existing external daily-practice journey | Daily Practice Terrace | Canonical expression example and existing trusted daily-practice URL/QR |
| Existing peace-promise journey | Peace Promise | Sculptural intertwined ribbons, invitation and existing trusted peace-promise URL/QR |
| Single/group recognition arrival | Gate of Light | Separate event choreography that interrupts and then returns to the previous tour viewpoint |

All locations inhabit one coordinate system, scene, renderer, camera and clock. Zones remain resident; nearby/distant geometry still gives physical continuity. No iframe playlist or canvas replacement on a zone change.

## Architecture and bounded ownership
All runtime changes live under `src/components/display/world/` and `src/app/display/world-preview/`. New tests live under `tests/world/`. Existing public API contracts/catalog are imported without edits. Dependencies, explicit preview metadata, and status documents are the only shared files in scope.

Systems:
1. World model: zone IDs, scene parity, coordinates, shots, material palette, canonical expression catalog.
2. World engine: Three.js renderer, environment, lights, fog/sky, quality cap, optional bloom, master clock, resize, visibility, resource disposal.
3. Procedural environment: connected islands, bridges, water, layered clouds, flowers, distinct architectural landmarks, local textures; deterministic seeds.
4. Camera director: establishing view, slow move, reading dwell, zone travel, manual visit, event capture and smooth return, playlist selection.
5. Public data lifecycle: existing validator, single in-flight bounded request, monotonic server clock, authoritative replacement, stale and mode safeguards, no persistent cache.
6. Recognition director: eligibility, fair scheduling, complete messages, reading-time budget, previous/next/pause, selection retention only while eligible.
7. Arrival director: baseline suppression, deduplicated delta events, bounded queue, grouped waves, phase timing, settling and return; events reference current eligible records rather than frozen copies.
8. HTML overlay: clear source state, title, full message, expression text, metrics/calendar, map, controls and error/empty/recovery UI.

## Data, safety and settings contract
- Sample mode never reads live APIs, never writes data, always says Sample world. Its demonstration entrances are explicitly labeled and operate only on fictional data.
- Live mode uses `GET /api/display/color-polish`, validated by `validateColorPolishSnapshot`. No admin endpoint, elevated key, private submitted name or moderation field is imported.
- Each response replaces the authoritative public pool. Hidden, invalid, removed and expired recognitions disappear from every card, arrival queue, reading selection, and visible label.
- Only delta arrivals after a verified baseline become new entrances. Initial/reset/reconnect snapshots do not replay the existing pool. Event IDs are deduplicated and memory is bounded.
- Quiet, neutral, disabled presentation, unauthorized response, invalid payload and stale verification fail closed. Personal content and pending arrivals clear. A failed poll may retain the last verified view only within the existing 60-second grace; expiry still applies during that grace.
- Server time plus monotonic browser time determines expiry. Local wall-clock changes cannot extend personal lifetime.
- Hidden tabs stop rendering and reverify on return; a hidden gap cannot produce a camera jump or disclose stale cached personal data on return.
- Requests time out after 9 seconds. A five-second poll never aborts a healthy in-flight request. Cleanup aborts only its own work; switching source invalidates old callbacks.
- Respect mode, motion/still, pauseRotation, pauseArrivals, saved scene enabled flags and readingSeconds. Local controls cannot override a privacy state or an owner's pause. They may further reduce motion.
- Current backend retention behavior remains authoritative. This work adds no retention, archive, purge, counts or migration policy.
- Existing insights supply metrics, calendar and weekly goal; do not infer campaign totals from the visible pool or substitute sample numbers in live mode.
- Rendering uses React text nodes and local geometry only. No HTML interpolation of names/messages. No real records in logs, screenshots, Git, test fixtures, external visual tools or reviewer payloads.

## Reading experience
- Camera stops its large movement while a recognition is featured. Message text stays anchored to a stable panel, even as ambient light continues.
- Messages render fully with preserved line breaks and Unicode. Use a large full reading surface for long messages; never silently truncate.
- Reading duration is the greater of configured readingSeconds and a content-length-based allowance. Arrival reading has its own real-time budget and is not accelerated by the tour-speed control.
- Viewers can pause/read, go to the previous/next recognition, browse the full eligible pool, filter by expression or day, and return to the tour.
- The recognizable public name and selected expression phrase are clear. Source labeling distinguishes live data, samples, reconnecting, empty, and unavailable states.
- On TV, 500-grapheme messages must fit/read at 1920x1080 and 4K. Phone content may scroll in a deliberate reading region; keyboard focus and controls remain reachable.

## Grand entrance story
1. Notice: a quiet horizon glow and light trail hint at the event, while the current reading interval finishes unless a privacy change preempts it.
2. Approach: camera travels to the Gate of Light without snapping.
3. Reveal: nested translucent light arches, gold filaments and colorful petals open outward. One luminous recognition pearl moves from depth into the foreground.
4. Read: a large stable name and complete message hold in front of a calm luminous background. Ambient effects reduce behind text.
5. Settle: the pearl descends into the garden; petals become ambient flowers/light.
6. Return: the camera travels back to its saved tour position and resumes, without immediately repeating the same recognition.
7. Burst handling: combine arrivals into waves of up to five, but each recognition gets a full readable moment. Never squash five long messages into unreadably small type. Show wave progress; queue remains bounded and authoritatively filtered.
8. Reduced-motion/still: use a stable luminous composition and clear New recognition heading without camera travel, flashes, or zooms. Owner pauseArrivals suppresses the entrance entirely.

## Section 1: Finish and preserve the prototype foundation
Setup: current controller, solo; native Sol high review at the final integration boundary; no agents.
- Correct camera-clock behavior on slow renderers, retry lifecycle, and mobile long-text layout.
- Keep a truthful prototype checkpoint and its earlier evidence, without calling the expanded world complete.

## Section 2: Build the complete world and art pass
Setup: current controller, solo; native Sol high review at final integration; no agents.
- Generate private fictional art-direction references; record source and selection.
- Build all locations in the parity map, coherent terrain/bridges, sky/water/cloud depth, materials, cinematic lighting and restrained luminous materials.
- Add shot variety, active-zone animation budgets, map and navigation. Preserve cross-zone landmarks.
- Show a usable expanded preview before final polish.

## Section 3: Add reading, data and entrance directors
Setup: current controller, solo; native Sol high plus bounded privacy review; no implementation agents.
- Add sample/live source lifecycle and privacy-safe read-only adapter.
- Implement full message display, fair selection, reading pause/browser, insights, calendar, goals, canonical teaching/QR journeys.
- Implement single/group entrance phase machine, pooling, deduplication, interruption and return, and sample-only replay controls.

## Section 4: Verify and deliver
Setup: current controller, solo; native Sol high review and declared privacy review; no implementation agents.
- Focused unit tests: complete route continuity, event phases, dedup/reset/backpressure, expiry, stale clearing, mode overrides, full-message reading budgets, fair selection.
- Synthetic browser tests: all zones, one renderer, source switching, new/deduplicated/group arrivals, long recognition, removal mid-arrival, quiet/neutral/stale/invalid states, disabled scene handling, retry, reduced motion, tab hide/resume, 1920/4K/phone bounds, keyboard and axe, fallback and navigation cleanup.
- Typecheck, focused lint, production build. Capture only fictional content. Inspect full-size screenshots, not just test assertions.
- Deployed smoke on the exact built preview, no production writes. Verify Vercel access; provide permanent deployment URL and an expiring share link when needed.
- Final source diff, all applicable documentation, read-only reviews and corrections, private commit/push verification. Keep production unchanged and state physical-TV limits honestly.

## Completion conditions
All mapped zones and primary read/arrival journeys work on the deployed preview. There are no unresolved material privacy or functional findings. The source is safely backed up in the existing private repository. The final handoff links the world and complete plan and names actual verification plus any physical-TV limitations. No arbitrary soak period is required; long-run readiness may not be claimed from a short browser test.

## Build log
- September 20: Anthony expanded the in-progress three-zone prototype to the complete heavenly world. Existing eleven TV scenes were enumerated from the actual renderer contracts; daily-practice and peace-promise trusted URLs were verified from existing application constants. No production data was read.
- The three-zone first preview is READY, with working sample navigation, TV/4K/phone rendering, context-loss/no-WebGL fallback, and accessibility checks. Automatic tour browser timing exposed an overly aggressive elapsed-time cap under slow software rendering; this must be corrected, not concealed as a passing test.
- Created private Stitch project `1310611511399850675` for fictional visual references. Direction generation is in progress. Artistic preference question is pending while independent architecture/data work continues.

- Anthony explicitly selected Radiant pearl heaven: bright skies, rose and gold light, colorful gardens, flowing silk, grand luminous arrivals. This is the selected visual direction for the expanded preview.

- All thirteen locations, read-only feed adapter, fair reading director, portal entrance director, long-message pages, calendar stories, map, complete reading browser, source controls and fallback are implemented. Static scenery batching reduces draw calls; water uses a local animated shader. Sound is intentionally absent in this visual preview. No production renderer or database file changed.
- The native controller review uses the configured Sol review model; the separate privacy review uses the existing isolated tool-free Claude launcher. Source-only payloads contain fictional fixtures, never live recognition records.

- Expanded Vercel preview is READY at https://mothers-love-fleez6q3r-lvzion.vercel.app/display/world-preview (dpl_HresvgTptzd6EVDzLLNn6ZF2Ews1). Hosted sample render and map navigation passed. The public API is available. Nine browser journeys, 46 unit/contract checks, typecheck, focused lint and production build passed. Additional privacy review is pending Claude authentication, verified through the escalated boundary. Native controller review and private backup remain in progress.

- Follow-up checks: both browser regressions for mid-arrival reduced motion, mid-travel owner still mode and malformed successful JSON pass. The broader nine browser journeys previously passed. Follow-up native review, final deployment receipt and private checkpoint backup remain in progress. The extra privacy review is pending Claude sign-in, not a passing verdict.

- Second review corrections: owner pause holds ordinary reading and tour movement; arrivals retain their separate control. Full-reader selection uses only enabled recognition locations. Unseen locations do not consume reading time or fairness history. Long names wrap. Sample counts/calendar derive from the same nine fictional records. Third native review and final verification are pending.

- Third native review corrected manual map movement under owner rotation pause and fallback navigation after context loss during an arrival. Camera departure now resolves before choosing another recognition, preserving unseen-story priority. Fifty unit/contract checks and all thirteen browser checks had passed before these final corrections; focused reruns and fourth review are in progress. Additional privacy review still awaits Claude sign-in or Anthony's explicit deferral.

- Corrected preview https://mothers-love-lmvh6djt0-lvzion.vercel.app/display/world-preview is READY (dpl_9KSfGkEQ4UszizpCWesacs2NyWao). All five affected browser checks pass, including the two new navigation regressions; typecheck, focused lint and 24 world unit checks pass again. Fifteen distinct browser journeys now have passing evidence, with the original thirteen run together and five affected checks rerun. Fourth native review, hosted smoke and private backup are being finalized.

- Fourth review identified loss of remaining eligible members after an arrival withdrawal and live feed reports overriding fallback navigation. The arrival director now preserves the unshown eligible remainder in both normal and still conversion paths; a failed WebGL engine is disposed and disconnected while the safe React fallback continues receiving live data. Unit/browser regressions and fifth review are pending.

- The final wave/fallback correction build is READY at https://mothers-love-8cqduhjtp-lvzion.vercel.app/display/world-preview, deployment dpl_BFSTNkVxB4yRpFvXRDoQK4Qy3tHm. All 25 world unit checks, typecheck and focused lint pass. Five affected browser checks pass across the main run and an isolated fixture correction. Sixteen distinct browser journeys now have passing evidence. The fifth native review and final backup remain pending; the additional Claude privacy review remains blocked on sign-in.

- Fifth review found pending wave members surviving withdrawal and stale reading durations after live content/settings changes. Unshown wave members are now permanently reconciled against authoritative records, and both arrival and ordinary reading restart a full interval when displayed content or its reading minimum changes. Three new unit regressions pass, bringing world units to 28. The review gate remains open under the shared blocking-journey exception because publication eligibility and complete reading are core acceptance criteria; no finding is deferred. Affected browser checks and a sixth cumulative review are running.

- Frozen correction build: https://mothers-love-4xyg6r6b8-lvzion.vercel.app/display/world-preview, dpl_3qNJgPtmfMfgp1CnNr9qAN8A7ahC, READY. All 29 world units and five latest affected browser journeys pass. Reading trackers clear alongside removed personal content. Typecheck, focused lint and hosted production build pass. Final native review and private checkpoint backup remain in progress.

- Sixth cumulative review isolated two remaining arrival timing defects: changes during visible settlement did not restart reading, and shortened content/minimum retained the old duration. Both are corrected. Final verification is a bounded continuation covering the changed arrival/ordinary reading directors and their unit regressions, plus current delivery status; the remaining cumulative source was reviewed in the preceding full rounds. No other runtime source is changing.

- Final timing-correction preview: https://mothers-love-k8d6sjqij-lvzion.vercel.app/display/world-preview, dpl_GD8v2udVELBxQSKVHVUhhzWDTwyU, READY. All 31 world unit checks and both affected entrance browser journeys pass, with typecheck, focused lint and the hosted production build passing. Bounded final director review and private source backup remain pending.

- The bounded director review found one P1 handoff issue: a long completed story could repeat because camera departure hid reading before its next selection. The engine now releases a completed story on automatic departure without marking an unseen replacement, then selects fairly at the next visible reading stop. A unit regression and a real sixty-second browser journey cover this correction. Final review is bounded to this handoff and its unchanged arrival integration.

- Both automatic-tour browser regressions passed together, including a full sixty-second reading that advances to another recognition. All 32 world unit checks, typecheck and focused lint pass. The bounded final handoff review is running; the original production renderer and checkout remain unchanged.

- The handoff review identified stale pre-arrival camera visibility during restoration. Departure now recomputes visibility and reading readiness after arrival restoration, first reconciling the currently visible content without advancing its selection. This also preserves unfinished reading when a camera returns from an interruption. A full arrival-interrupt/return browser regression joins the sixty-second normal-tour regression; runtime is frozen for the bounded restoration review.

- The restoration review also required reconciling a saved route with current enabled locations and counting fully read arrivals in ordinary fairness history. Restoration now selects an enabled destination; completed arrival readings update history without changing the currently selected ordinary story. The full return test now prepends the incoming record to match newest-first ordering. The one-line automatic-departure gate received a no-material-findings native verdict. All 60 world/public-projection units pass together; final follow-up covers only the two latest corrections.

- Final source correction: owner playlist changes now reconcile the saved viewpoint before an animated return begins and smoothly retarget a return already in progress. Native review 12 found no material defect; review 11 had confirmed completed-arrival fairness. All 61 unit/contract checks, typecheck and focused lint pass. Eighteen distinct browser journeys have passing evidence, including full-duration ordinary reading and newest-first arrival return.
- Final preview receipt: [Heavenly World](https://mothers-love-ricohxk3e-lvzion.vercel.app/display/world-preview), deployment `dpl_4MkK2NREp6veK1evFWEePMAzNMH5`, READY. Final hosted sample renderer, grand-entrance reading, switch to live and ready state all passed without capturing personal content. No production alias or database was changed.
- Source checkpoint is prepared on the existing private feature branch with exact owned-path and post-commit hash verification. The delivery receipt records the remote checkpoint hash. Native controller findings are resolved. Full-plan completion remains pending the separately declared Claude privacy review, blocked on confirmed sign-out. Physical-TV smoothness and one real new recognition entrance remain unverified commissioning checks.
