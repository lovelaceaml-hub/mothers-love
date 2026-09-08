# RP correction event: server name validation parity

Date: 2026-09-08

The accepted RP finding was corrected in the ready-public worktree. A new browser/server-neutral `src/lib/name-validation.ts` now owns the existing grapheme counter and first-name plus last-initial predicate. The public submission validator and admin edit validator use the same helper, preserving trimmed values, the 80-grapheme cap, Unicode, accents, apostrophes, hyphens, and multiword first names.

Validation coverage now includes decomposed Unicode, non-Latin names, 80 versus 81 grapheme boundaries, malformed public names, and malformed admin submitted names and recipients. Malformed route payloads return 400 before `databaseAction` is called.

Evidence: focused tests 22 passed, full Vitest 71 passed, typecheck passed, lint passed, and `git diff --check` passed. The production build was attempted but remains a root integration verification item because the permitted external dependency symlink triggers a Turbopack boundary error and the webpack retry reaches the existing unowned `src/components/display/DisplayExperience.module.css:1142` selector error. No public wording, design, SQL, migration, provider, or Auth files changed.
