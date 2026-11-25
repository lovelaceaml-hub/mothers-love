# Lane A: Admin copy cleanup

## Scope

Admin copy cleanup for the settings, sign-in, display, review, recognition, overview, and insights surfaces. The campaign catalog, Bubble Board styling, permissions, action controls, expiry enforcement, conflict handling, counts, and API behavior remain unchanged.

## Baseline

- Worktree: `$HOME/Projects/mothers-love-worktrees/copy-admin`
- Starting HEAD: `0565045c033458d6646f7a8bf1870c0c6438c78a`
- Starting worktree: clean

## Changes

- Shortened route descriptions and admin shell guidance.
- Removed routine expiry countdowns and retention details from overview, recognition list, review list, and recognition detail surfaces.
- Kept the cleanup health warning and made its action clear when cleanup is unavailable or stale.
- Simplified display status, TV preview, collection availability, and save feedback while keeping browser acknowledgement controls.
- Simplified action confirmations, preserving hide versus invalidate count consequences, restore behavior, destructive confirmation, and moderation reason guidance.
- Shortened settings copy, removed the sign-in and archive explanation panel, kept owner and moderator controls, and made TV pairing instructions direct.
- Simplified login and password setup guidance while keeping unavailable, expired-link, and password validation errors.
- Updated wording-dependent admin tests without weakening behavior checks.

## Verification

- `git diff --check` passed.
- Confirmed no em dash or en dash in owned source and tests.
- Confirmed removed copy selectors and `formatExpiry` references are absent from owned source and tests.
- Root will run the focused unit tests, all 23 admin journeys, production build, and isolated phone and desktop captures after integration.

## Intentional remaining explanations

- Expired-link, expired-recognition, unavailable-service, and collection-closed messages remain because they tell an operator what is unavailable or what to do next.
- Submitted-name labels, moderation reason categories, count effects, action consequences, and email/password setup instructions remain because they affect an operator decision or task.

## Readability repair

Root browser verification found the generic `.badge` text at 4.13:1 contrast on its existing background. The generic foreground is now `#565b67`, which meets the 4.5:1 target. Backgrounds, layout, and specialized status badge colors are unchanged. Root will rebuild and rerun the rendered checks.

## Native review corrections

- Restored account ID suffixes in member rows and revoke confirmation targeting.
- Restore guidance now distinguishes never-published review items from previously published hidden or invalid items.
- Display status and campaign total copy now describe connection and data state without claiming physical TV visibility.
- Added focused regressions for restore guidance and multiple-moderator targeting.
