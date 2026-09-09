# Production publication receipt

Source commit `d7b51ddd74bc5ed9781018ff5c1df3e643026937` is deployed as Vercel deployment `dpl_3cRXt4eyfV5v24KW7w8V7cFqDhYr`.

- Target: production
- Status: READY
- Deployment URL: https://mothers-love-8wt5ay1zl-lvzion.vercel.app
- Production alias: https://mothers-love.vercel.app
- Private Git branch: https://github.com/lovelaceaml-hub/mothers-love/tree/codex/mothers-love

The deployment completed Vercel’s production build successfully. Immediately afterward, the full 11-case Plan 08 Chromium suite passed against the production alias. It used synthetic snapshots and intercepted every application API request before navigation, so it did not retrieve or submit live recognition data. Status-only checks also returned 200 for the public TV and form routes, 200 for public configuration, and 401 for the protected admin-settings route.

The only checks that cannot be automated safely are physical TV readability, actual audio hardware, phone QR scanning, and a real Owner sign-in.

## Live motion and Studio-save repair

After the reported live regression, commits `66ff4fa`, `fcff843`, and `98f06cc` were published in sequence. The final source commit `98f06cc` is deployed as Vercel production deployment `dpl_GHX7pC61f94emNrjfkM2wqihKq3g`, READY with the same production alias.

The final production Chromium suite passed 12 synthetic browser journeys. It explicitly proves that owner-selected Lively motion keeps Garden animation active when the browser requests reduced motion and Studio tempo remains Standard. The suite still proves Standard reduced-motion behavior, bounded high-density rendering, reconnect behavior, empty Garden handling, fixed invitation destinations, and 1080p and 4K bounds. All application API responses were intercepted with synthetic content.
