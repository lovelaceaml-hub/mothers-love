# Plan 08: TV Garden and Submission Experience

## Goal

Deliver a Garden-led Mother’s Love TV display and matching expression-selection form that feel joyful, stay readable at distance, and protect the established moderation, privacy, campaign wording, direct-TV, quiet, neutral, and shared-database rules.

## Execution setup

- Coordinator: Terra high, non-editing, coordinating fresh worktree lanes.
- Writers: Luna xhigh, one fresh agent per lane and one writer per worktree.
- Advisor: Astra low only for difficult technical questions.
- Integration: Sol owns shared contracts, central display composition, documentation, Git, deployment, and rollback evidence.
- Review: Sol reviews each landed lane. A fresh Terra reviewer performs final privacy, performance, accessibility, and regression review.

## Frozen design targets

- Target: `ML-BUBBLE-APPROVED-V3-REFRESH-2026-09-09`.
- Approved direction: the existing Bubble Board and Living Wall direction in `docs/DESIGN.md`, extended by Anthony's completed TV Garden interview on September 9, 2026.
- Required states: 390 by 844 submission form; 1440 by 1000 display studio; 1920 by 1080 and 3840 by 2160 TV Garden, long-message reader, invitations, quiet, neutral, empty, reconnecting, standard, smooth, and reduced-motion states.
- Material updates: warm rainbow garden, free recognition drift, ribbon transitions, invitation screens, growing bouquet form cards, and gentle chimes. No external imagery, media, copied reviews, global external totals, or editable QR destinations.

## Public contract

- Replace `maxBubbles` with `gardenAmount`: `all-active` or a positive custom number. There is no user-facing maximum. A custom number above available active content renders the available fair rotation without allocating that number of browser nodes.
- Add a fixed display playlist: Garden, Featured, Monthly Impact, Nine Expressions, Shared Expression, Expression Spotlight, Daily Practice, One Kind Word, Everyday Peace, and Peace Promise. Owners can enable, remove, restore, reorder, preview, choose a global tempo, and set safe per-screen duration overrides. No schedule, Force Next, arbitrary screen builder, copy editor, or QR editor.
- Daily Practice QR always opens `https://heavenlymotherslove.org/en/checklist`. Peace Promise QR always opens `https://heavenlymotherslove.org/en/signature`. Both screens label the destination as an external official form and do not transfer local data.
- One Kind Word rotates only: “One Kind Word Heartfelt Change”; “May Mother’s love bring peace to the world”; and “Today, achieve peace through the ‘Words of Mother’s Love.’”

## Delivery order

### Lane F: Foundation and safe skeleton

Own contracts, server validation, migrations inside the dedicated `mothers_love` schema only, settings projection, and foundation tests. Preserve existing behavior until the compatibility skeleton passes and is released.

### Lane G: Garden engine

Own new Garden-only components, scoped styles, and Garden tests. Build pooled visual drift, fair rotation, long-message reader, waiting buds, arrival batching, every-25 milestone bloom, adaptive decoration, session-memory reconnect cache, and reduced-motion equivalent.

### Lane I: Impact and expressions

Own new Impact, Nine Expressions, and Shared Expression display components, scoped styles, and tests. Build total-first rainbow ribbons, color wave to flower wheel cards, and bubble-to-ribbon heart transition.

### Lane T: Teaching and invitation screens

Own new Expression Spotlight, Daily Practice, One Kind Word, Everyday Peace, and Peace Promise components, scoped styles, and tests. Use original visual scenes and exact approved copy only.

### Lane C: Display studio

Own display-controls UI components, scoped styles, and tests. Build visual playlist editing, safe and live preview modes, timing controls, Garden amount input, effects, smooth-mode status, sound volume, and independent arrival and milestone chimes.

### Lane S: Submission experience

Own submission form components, scoped styles, and tests. Build nine coordinated mini-scenes, Share Recognition selection treatment, growing bouquet feedback, and seed-to-garden receipt.

### Lane P: Performance and resilience evidence

Own isolated performance helpers, synthetic fixtures, tests, and benchmark documentation. Verify bounded DOM, one animation lifecycle, no overlapping reads, visibility-aware refresh, temporary reconnect behavior, and 1080p and 4K Chrome evidence.

### Lane V: Browser and accessibility coverage

Own new synthetic Playwright coverage, visual evidence scripts, and accessibility assertions. Cover every playlist screen, controls, long reading, QR labels, empty and offline states, burst arrivals, form selection, reduced motion, 1080p, and 4K.

### Lane R: Integration and release

Sol owns central display composition, shared imports, global styles, documentation, release evidence, reviews, commits, push, and deployment. Integrate only reviewed lane work, correct accepted findings, and perform production smoke checks.

## Experience defaults

- The Garden occupies about two-thirds of normal playlist time. New teaching and invitation screens begin enabled and use a 12-second reading floor.
- New recognitions enter at the next natural transition, normally around ten seconds. Bursts below ten arrive individually; ten or more are grouped before returning to fair readable turns.
- Sound is enabled at a gentle default level. Arrival and milestone chimes are independently controlled.
- Smooth mode reduces sparkles, trails, and background decoration before content or core transitions. The owner sees a quiet status badge.
- Current approved content remains in memory during a temporary connection loss. It is cleared on reload and never written as a persistent browser cache.

## Acceptance evidence

- Unit and contract coverage validates settings migration, fixed QR allowlisting, positive custom amount handling, playlist order, fair rotation, milestones, long reading, audio defaults, and no local-data transfer to official external destinations.
- Browser coverage validates participant, owner, moderator, public TV, quiet, neutral, empty, reconnecting, reduced-motion, and preview journeys with synthetic content only.
- Chrome checks at 1920 by 1080 and 3840 by 2160 demonstrate bounded rendered nodes, no overlapping refreshes, no normal-animation long tasks, and graceful decoration reduction when the frame budget is stressed.
- Production release includes typecheck, lint, tests, build, affected browser journeys, authorization checks, direct-display smoke, private backup, controller review, final independent Terra review, and rollback evidence.

## Build log

- 2026-09-09: Anthony approved this implementation plan after the completed product interview. Baseline commit and lane receipts are recorded in `docs/runs/2026-09-09-tv-garden-refresh/`.
