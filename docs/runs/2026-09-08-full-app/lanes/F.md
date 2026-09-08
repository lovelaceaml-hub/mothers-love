# Lane F: foundation and shared contract

## Scope

Foundation files for the approved `ML-BUBBLE-APPROVED-V3` target: pinned Next App Router setup, root shell and opening page, canonical expression catalog, exact cross-lane contracts, browser auth/client helpers, test configuration, synthetic foundation tests, and run-board rendering.

## Ownership

This lane owns `package.json`, `package-lock.json`, TypeScript and Next configuration, ESLint configuration, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/lib/catalog.ts`, `src/lib/contracts.ts`, `src/lib/client-api.ts`, `src/lib/auth-client.ts`, Playwright/Vitest configuration, `tests/foundation/`, `scripts/render-board.mjs`, and this lane record. Root owns provider setup, shared plan/status records, integration, Git and deployment. Other lane files are protected.

## Implementation

- Next `16.3.4` App Router with React `19.2.0` and TypeScript.
- `postgres` `3.4.9` is pinned for the later server lane's dedicated restricted database connection. No database connection is opened by the foundation.
- Supabase browser client is lazy and returns `null` without public URL/key configuration.
- The API helper sends cookies, supports explicit bearer tokens, obtains the current browser session token when requested, and exposes structured `ApiClientError` values without logging request content.
- The opening page truthfully says the campaign is opening soon and confirms that no recognition was saved.
- The catalog preserves the exact title, tagline, nine IDs, phrases, principles, and reference colors.
- Shared types include `EditableRecognitionFields`, immutable `requestKey`, display `cursor`/`sync`/`arrivals`, and device `appliedSnapshotRevision` fields from the current contract.
- Foundation tests use synthetic values only.

## Verification

Passed with `npm_config_cache=/tmp/npm-cache`: `npm run typecheck`, `npm test` (9 tests), `npm run lint`, `npm run build`, and `npm run board`. Production dependency audit passed with `npm audit --omit=dev --audit-level=high`. The full end-to-end suite remains a later integration gate because submission, display, and backend routes are owned by later lanes.

## Remaining gaps

The foundation does not open collection, create API routes, connect a database, authenticate an admin, or render real recognitions. Later lanes replace the placeholder home page and add those capabilities after shared contracts are frozen.
