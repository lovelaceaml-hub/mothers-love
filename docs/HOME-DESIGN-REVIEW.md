# Home design review

Scope: `/` only. Base: `codex/mothers-love` at `ad1e6d5e8482746f9e84fa514b61d343ccba01e1`. Review branch: `codex/home-tv-family`. Do not merge or deploy without approval.

The current Home is recomposed around the V6 Welcome reference, with an integrated header, a compact introduction, campaign artwork in a pearl arch, circular expression medallions, static full-message reading panels and a quiet expression-guide panel. Responsive layouts preserve the primary action and existing destinations. The original shared feed stylesheet is deliberately untouched; `HomeExperience.module.css` is imported by Home alone.

All data still comes from the existing public provider. The existing ReactionButton retains its confirmed-state handling, errors and retry behavior. No submitted names, demo counts, sample messages or new goal calculations enter the app. Home's reading anchor remembers IDs and pixel offsets only; it never delays the removal of expired or hidden content. Pause stops decoration, not safety updates. New reading cards remain fully opaque when paused.

Artwork: only the community illustration and nine expression icons are extracted from the supplied V6 HTML (SHA-256 `9fd625cea86eebd6d8cf342b375cb86b65bb9466ec49726d55e208f78707d45e`). `scripts/review/extract-home-art.mjs` checks the source hash, parses its asset dictionary as JSON without evaluating JavaScript, and exports local WebP files. `public/home-art/provenance.json` records the outputs. No fonts, demonstration data, animation engines or other prototype logic are imported. No external image requests are required.

## Verification

The dedicated read-only workflow builds the application and original baseline without production credentials. It runs type checking, linting, the existing unit suite and all tests under `tests/feed`. Browser tests use intercepted synthetic responses, not production data. Desktop 1440, tablet 768, phone 390 and narrow phone 320 layouts are checked for content, navigation, overflow and automated accessibility issues. Long-name, 500-character message, all-nine-expression, paused and reduced-motion cases are included. Reaction tests preserve existing confirmed-count, retry, cookie, throttling, expiry and hidden-item checks.

Two existing feed tests now explicitly wait for the first request before advancing their clock or dispatching visibility events. This corrects a production-hydration race in the test setup without changing application timing or safety logic. The Home keyboard test waits for browser scrolling to settle.

Protected-route comparison captures both baseline and review images for `/recognize`, `/expressions`, `/privacy`, `/admin/login` and `/display`. Diagnostic captures showed 11-15 slightly different edge pixels, with RGB channel differences of at most 3, on otherwise unchanged public pages. The comparison records raw counts and accepts only a maximum 0.005% differing pixels with channel differences no greater than 4/255. This is a rasterization tolerance, not permission to change layouts. The exact results and screenshots are in the workflow artifact. The source diff does not modify these pages or their shared runtime/styles. Only the safe TV state is compared in this Home review, not a full physical-TV commissioning exercise.

## Boundaries and limitations

This is an isolated working branch build, not a hosted preview, deployment or certification of real production services. Browser evidence is captured into the workflow artifact. Review the latest run rather than assuming that the existence of this document proves a passing run.

The branch-specific Vercel configuration disables automatic deployment for this review branch. The shared runtime, catalog, TV files, server handlers, authentication and database are not modified.

The locked-dependency audit reported existing Vitest development-tool vulnerabilities (one moderate and one critical package entry). The audit JSON is included in the evidence. Dependencies and the lockfile were not upgraded as part of this Home-only design pass. Do not expose development test servers to the public network.
