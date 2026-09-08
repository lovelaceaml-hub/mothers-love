# Lane P: public and display copy cleanup

Status: ready for integration

## Changes

- Shortened the public form guidance while keeping required fields, name formatting, private-name labeling, public-display labeling, and retry/error recovery behavior.
- Removed age-specific wording and the redundant privacy reminder from the form.
- Replaced the long privacy page with a short sharing guide covering fields, private name visibility, public-message boundaries, and review handling. Removed all information-duration and provider-detail explanations.
- Tightened expressions-page metadata and surrounding guidance while preserving every catalog phrase, principle, and everyday example.
- Simplified display pairing instructions, excerpt labeling, and status language. Removed revision narration and kept campaign recognition content unchanged.
- Updated only selectors that depended on changed visible wording in the assigned submission and display tests.

## Verification

- `git diff --check`: passed.
- Checked assigned copy for age-specific wording, retention explanations, provider or backup explanations, and em or en dashes: none remain in visible copy.
- `npm run typecheck`: could not run because this worktree has no installed `tsc` dependency. Root will run the authoritative build and browser checks with existing dependencies.

## Retained

- Exact campaign title and tagline.
- All nine catalog expressions, principles, phrases, and everyday examples.
- Submission, review, pairing, display, authentication, timing, and API behavior.
- Truthful private-name and public-display labels, useful validation errors, and retry guidance.
