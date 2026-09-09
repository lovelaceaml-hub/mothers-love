# Flexible name input

Read first: /Users/anthony/Projects/mothers-love/AGENTS.md. Clean baselinea6c5c33. User explicitly removes the required first-name/last-initial format. Accept single names, full names, nicknames and Unicode names without that shape check, for submitted and recipient names. Preserve required nonblank and80grapheme limits, moderation, safe rendering and private submitted names. Public feed and TV must accept the same names. No database migration needed: current SQL validates nonempty length only.

Runner: root integration. U Luna xhigh owns browser copy/validation and submission tests. S Luna xhigh owns shared name helper, server validators/public feed/display projections and backend tests. Separate worktrees, no overlapping writers. Native Sol high controller review. Root runs full checks, deployment, private backup and records. User fallback remains3Luna attempts,2Terra,then Sol. No production test writes or real recognition content.

| Lane | Owner/model | State | Dependency |
|---|---|---|---|
| U browser input | Luna xhigh | Integrated, focused checks passed | None |
| S server parity | Luna xhigh | Integrated, focused checks passed | None |
| V visibly nonblank | Luna xhigh | Integrated, 41 focused checks passed | U,S |
| I integration | Root | Complete, verification and native Sol review passed | U,S |
