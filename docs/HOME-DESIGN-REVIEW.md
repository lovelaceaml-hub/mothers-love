# Home design review

Scope: `/` only. Base: `codex/mothers-love` at `ad1e6d5e8482746f9e84fa514b61d343ccba01e1`. Review branch: `codex/home-tv-family`. Do not merge or deploy without approval.

The current Home is recomposed around the V6 Welcome reference, with an integrated header, a compact introduction, campaign artwork in a pearl arch, circular expression medallions, static full-message reading panels and a quiet expression-guide panel. Responsive layouts preserve the primary action and existing destinations. The original shared feed stylesheet is deliberately untouched; `HomeExperience.module.css` is imported by Home alone.

All data still comes from the existing public provider. The existing ReactionButton retains its confirmed-state handling, errors and retry behavior. No submitted names, demo counts, sample messages or new goal calculations enter the app. Home's reading anchor remembers IDs and pixel offsets only; it never delays the removal of expired or hidden content. Pause stops decoration, not safety updates. New reading cards remain fully opaque when paused.

Artwork: only the community illustration and nine expression icons are extracted from the supplied V6 HTML (SHA-256 `9fd625cea86eebd6d8cf342b375cb86b65bb9466ec49726d55e208f78707d45e`). `scripts/review/extract-home-art.mjs` checks the source hash, parses its asset dictionary as JSON without evaluating JavaScript, and exports local WebP files. `public/home-art/provenance.json` records the outputs. No fonts, demonstration data, animation engines or other prototype logic are imported. No external image requests are required.

The dedicated workflow tests production builds with intercepted synthetic API responses. It also compares unchanged public pages, sign-in and the safe TV state against the original baseline. Browser evidence is captured into the workflow artifact. This is an isolated working review build, not a deployment or certification of real production services.

The branch-specific Vercel configuration disables automatic deployment for this review branch. The shared runtime, catalog, TV files, server handlers and database are not modified.
