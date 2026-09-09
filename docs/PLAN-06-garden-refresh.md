# Plan 06: Recognition Garden live refresh

## Result and authority
User reports that new recognitions are not added automatically. Existing authorization covers correction, private backup and deployment. Preserve circles, movement, direct TV access and all public data restrictions. No production example submissions, credentials, data exports or shared schema changes.

## Model and lane choices
Root coordinates and integrates. G uses Luna xhigh in its isolated worktree for coordinator selection and regression tests. R uses Luna xhigh for independently evidenced stalled TV-read recovery, with disjoint server/test ownership. Native Sol high controller review covers the cumulative correction. Existing fallback: three Luna failures, two Terra failures, then Sol. No model switch is needed yet.

## Acceptance
New eligible records appear in Garden after the next successful five-second snapshot poll, including paused rotation and reconnect. Garden capacity, unchanged snapshot stability, hidden/expired clearing, arrival deduplication and approved motion remain. A stalled TV read must release admission and recover without terminating unrelated writes. All provider operations remain root-owned and read-only except publishing the app.

## Build log
- Clean baselinee0d32df. Root found the retained Garden ID list omits additions. Live static display200, config reads timed out and TV reads429; direct database metadata shows healthy cleanup, six eligible records and no active blocked runtime query. This distinguishes a cached app-read stall from a database outage; exact root cause within the runtime remains under investigation.

- G runtime4811300integrated. New snapshots prioritize newly eligible records, preserve retained order and fill/cap remaining slots.19coordinator tests and focused new-poll browser regression pass. No visual CSS change. Temporary process recycle restored live config/feed/snapshot200; R corrects the unbounded shared-read dependency permanently.

- R runtime668f45b integrated.109unit tests, typecheck, lint and production build pass. Real silent TCP protocol test settled and closed the socket after8007ms. TV pool is isolated from mutation pool and generation-safe eviction permits recovery. Root deploys and runs the cumulative native review in parallel with production checks.

- Integration complete: native Sol high review passed,81deployed browser checks and safe live API/fresh-browser checks passed. Private evidence verified by provider metadata and mounted hash. Root publishes source and final board; closure records exact receipts. No remaining code or database change.

Implemented-by: Codex/Luna xhigh. Reviewed-by: native Sol high.
