# Database release receipt

Applied on 2026-09-09 to the existing Mother’s Love production project, using the reviewable transaction wrapper in `production-migration.sql` and the exact source file `database/008_tv_garden_settings.sql`.

The initial migration call stopped at SQL parse time because a replacement-string transport collapsed bare dollar delimiters. A read-only preflight immediately confirmed that the writer function and 008 ledger entry were both absent. The retry inserted the source through a literal replacement callback, preserving the exact function bodies, and completed successfully.

Postflight returned only structural assertions, never recognition rows or identities:

- `008_tv_garden_settings` ledger version and SHA-256 `0cf72b526fd6c61c11565b96b731dddf7d1d41784ad1bdff9c5951087386863e` are present.
- The display settings writer is a security-definer function with `search_path=""`, which is PostgreSQL’s stored form of the declared empty search path.
- `mothers_love_runtime` alone has execute access among the tested runtime roles. `anon` and `authenticated` are denied.
- The projected invitation URLs remain exactly `https://heavenlymotherslove.org/en/checklist` and `https://heavenlymotherslove.org/en/signature`.
- The default sound setting is enabled at its gentle configured level.

No shared schema, public bridge, campaign recognition row, Owner account, secret, or outside application was changed.
