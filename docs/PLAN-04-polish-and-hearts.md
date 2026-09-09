# Plan 04: Presentation, hearts and shared live feed

## Request and acceptance
Anthony requests prettier typography instead of heavy black headings, unique animation and fitting content for every rotating TV screen, warm coral/gold-like colors and effects, heart reactions with visible counts, a scrollable recent list bounded to30recognitions, and a live feed on every page. Preserve exact campaign wording and existing privacy/expiry/approval/TVpairing behavior. User explicitly authorizes this visual revision of the Bubble Board direction. Native heart emoji is explicitly requested, overriding the usual no-emoji interface preference for this control only.

## Model and lane choices
Runner: current root coordinator. All implementation uses gpt-5.6-luna xhigh in isolated disjoint worktrees. Root owns sharedcontracts, integration, Git, provider actions, QA and records. A bounded read-only Sol planner defines the anonymous-reaction contract alongside visual work. Native Sol high controller review plus independent Terra high public-write/privacy review before production migration. Existing Vercel and shared Supabase target only; no newservice, credential, paidresource or unrelatedresource mutation.

Baseline91b2c176c1e05929c06f87c494c9758c73892d82, clean. Anthony approved one toggleable like per browser without sign-in, with a feed on public pages and every TV screen. Admin and sign-in pages remain focused, without a feed. Existing neutral and privacy overrides still apply. Likes do not affect totals, order, feature priority or lifetime. No participant identity claim.

### Lane T: Typography
Own globals.css, admin.module.css, SubmissionForm.module.css, expressions.module.css and privacy.module.css. Define --font-display as Georgia/serif and --heading-ink warm plum; reduce heavy900weights, harshnegative spacing and black title treatment. Preserve bodyreadability, exact text and existingcontrols. Feed andTV owners apply sharedtokens in their ownfiles. Nofontdownloads or dependencies.

### Lane D: TV presentation
Own DisplayExperience.tsx/module.css and tests/display/display.e2e.spec.ts. Create distinct restrainedlayouts/motion for garden,featured,cluster,impact,expressions,arrival,milestone,fallback. Preserve the approved circular Bubble Board compositions and expressive motion. Long-message reading panels fit the full text without replacing the signature circles. Reserve room for a live-feed rail driven by the verified pairedsnapshot on everypersonal-content screen. Neutral/Quiet/expired/unpaired states never revealpersonalcontent. Honor existingmotionpresets, reducedmotion, fullverbatimreading, QRstability and timers. Preserve coordinatorlogic unless rootapproves specificfitcorrection.

### Lane B: Heart backend
After Solcontract: campaign-only additive reactiontable/functions and API. Hardened runtime-only grants, no unrelatedfunction changes, boundedrequests, originvalidation, rate limiting, idempotent desiredstate toggles, no hidden/expiredtarget mutations orpubliccounts. Reactions cascade on recognitionpurge/delete. Synthetic SQLconcurrency androutefixtures; no realproductionwrite tests.

### Lane F: Shared feed and heart interface
After contract: refactor existingfeed for a single sharedsnapshot provider on webpages; scrollable30recognition viewport, heartcontrols/counts, all-page compactfeed, exacterror/expiry/visibility/no-stale guarantees. Home avoidsduplicatefeed. TV uses pairedstate, not an independent publicfeed that could bypassneutral/pairing. Sharedlayout/rootprovider owned only bythislane. Typographytokens fromT, TVsource ownedD.

### Lane I: Integration and release
Root integratessequentially, verifieslongcontent/phone/desktop/1080p/4K/OSreducedmotion, keyboard/axe, preservedauth andprivacy, likesidempotency/concurrency/permission/rates/cleanup. AdditiveSQLpreflightagainstexistingobjectfingerprints andmigrationledger; testlocallybeforeproduction. PushprivateGitHub, deployexistingVercel, immediateprivacy-safe productionchecks andprivateDriveevidencebackup. Noarbitrarysoak.

## Build log
- Grounded in currentrepo, livefeed/TVcontrollerandsharedruntime APIs. Asked only like-identity and every-page-scope questions. Starting disjointtypography/TV work while reactioncontract is planned. No livepersonalcontent read ormutated.

- Userconfirmed one toggleablelikeperbrowser/no sign-in. Userconfirmed feedonpublicpages andeveryTVscreen, explicitlyexcludingadmin/sign-in. These replaceinitialdefaultscope.

- Integrated typography e261caf and TV presentation 3f9730c. Production build passed. Initial display checks: 14 passed, two new fixture/timing checks failed and returned to the TV lane for correction.
- Accepted Sol reaction critique: recognition-before-settings lock order, explicit table constraints, server-generated Secure cookies, and independent rate limits of 120 per IP and 30 per browser per minute.

- Anthony reconfirmed completion and deployment authority. Failure fallback per task: Luna first; after three failed task attempts, Terra implementation; after two failed Terra attempts, Sol implementation. Record evidence and ownership handoff before switching. Current TV correction is the first failed verification attempt, not three separate failures.

- Backend security gate passed after corrections; additive005 applied and unchanged existing function metadata, restricted grants and cleanup health verified. Core84 unit tests and real isolated lock-contention runner pass.
- Terra completed the concurrency runner after three Luna attempts. TV transferred to Terra after its third Luna verification failure; hook cleanup and deterministic safety/motion fixtures were corrected. Public feed integration passed47 browser journeys and8 phone/desktop axe/bounds views. Final expanded race and TV tests remain in integration.

- Full integration browser suite passed72 tests with3 optional screenshot cases skipped after the response-anchored expiry correction. Public phone/desktop captures passed8 axe and overflow checks; TV impact passed3 size-specific axe/grid checks. The runner cleanup correction passed two immediate PostgreSQL runs. TV older-stage heart coverage and720p long-arrival fit remain in final correction.

- Final TV corrections passed the three targeted browser checks on root a33f604. Production frontend deployment started to the existing Vercel project. No new service, credentials or production recognition writes.

- Sol completed test-only fallback f6e3809. Both repaired fixtures passed16 stress cases at8 workers; full suite passed74 with3 optional capture skips. All app changes are deployed and verified. Private Drive evidence and mounted SHA match. Final native controller review and private source push remain.

- New user correction: smaller heart in the top-right of public recognition cards. A bounded Luna xhigh lane owns the public card layout only, with existing behavior preserved. This is included in the final release and review payload.

- Heart-position follow-up integratedac43554.16 affected journeys and12 measured/accessibility views passed. Only JSX arrangement and CSS changed; final deployment is processing.

- Smaller top-right hearts are live as dpl_Ci5ecMuBhRWbBRtv9pLyrFh9Rknu.16 deployed affected journeys and12 deployed measured/accessibility views passed. New evidence archive is private and its mounted SHA matches. All runtime work is complete; final review covers the cumulative baseline-to-current source and records.

- Anthony corrected the form and TV direction: expressions stack one per row at every width; selection uses a visible check indicator; submit is gold with shimmer; a compact scrollable feed sits below form titles and above fields. Restore the approved circular Bubble Board, expressive movement, sparkle and bounce. Put TV screen titles in the top-right header area instead of a second stacked heading. Text-heavy reading panels must still fit, with exact words, privacy overrides and reduced motion preserved. Two new isolated Luna xhigh lanes implement form and TV changes in parallel. The earlier final review is superseded by this new scope; integration will review the corrected cumulative payload.

- Immediate user clarification supersedes the gold-submit interpretation: selected expression cards turn gold and shimmer, with a checkmark indicator. Existing submit-button styling stays.

- Anthony removes the duplicate live rail from Recognition Garden only. Garden itself is the live feed and regains the content area. Other eligible TV screens retain their rail; active garden bubbles retain heart counts and all privacy controls. This supersedes the earlier literal every-TV-screen rail requirement.

- F2 integrated through1807380: one-column expression cards, gold selected fill/shimmer/checkmarks, compact above-form feed with keyboard-focusable scroll viewport, and truthful429/428 reaction recovery. Root typecheck, lint,84 unit tests, first build and eight public axe/bounds views pass. Expanded focused browser checks follow the current build.

- Compact form deployed asdpl_HABtjzRrQNc4VfusXaMAszaqt8Yb and verified with30deployed browser journeys and6deployed form views. TVrestorationdb79240 passed80local browser journeys including screenshots and3garden motion/geometry/axe views. Render review found clipped bubble rims duringdrift, a body-sized milestone count, missing glints and low-contrast colored-circle labels. D2 owns these bounded corrections before final release.

- Final D2 correction integrated as e63ddc4: Monthly Impact uses one total circle and nine separate circular counters in a three-by-three group. Production build, 24 TV journeys and six motion/geometry/accessibility checks passed at 1280, 1920 and 3840 widths. Three optional captures were excluded from the focused journey run; a separate milestone/arrival capture follows. The earlier complete 80-test run remains valid for unchanged behavior. An initial local-server sandbox bind denial caused connection failures only; the same checks passed after the server was started through the permitted boundary.

- Restored runtime e63ddc4 is READY on the production alias. All 24 deployed TV journeys, six deployed TV visual checks and immediate live service checks passed. The latest private evidence archive has 62 members with verified CRC/member hashes; provider permissions and mounted SHA match. Source and records are frozen for replacement native Sol high review.

- Final native Sol high controller review passed the complete 152-file sealed payload with exit 0 and no discrete issue. All 151 live source hashes still matched. Independent Terra high reaction privacy gate remains passed. Current changes after this point are factual completion records and the sanitized lane board; runtime and tests stay unchanged. Private push and final status publication follow.

- All reviewed source and corrected records were committed as 2e03a750e3d180aa81451dc62140d32984b8ecff and pushed to the verified private repository. Remote HEAD matches, root worktree is clean, and post-commit hashes match the post-validation manifest. Runtime acceptance, privacy review, controller review, evidence backup and task cleanup are complete. The completed status board is the final static publication.
