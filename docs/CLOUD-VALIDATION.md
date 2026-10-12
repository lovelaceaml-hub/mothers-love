# Cloud validation

The saved workspace can run the project with Node 24, npm 11 and the pinned
`package-lock.json`. Use the npm cache below. Tests use fictional records; do not
copy a production `.env` or point these commands at Supabase.

```sh
export npm_config_cache=/tmp/npm-cache
export NEXT_TELEMETRY_DISABLED=1
npm ci
npm run typecheck
npm test -- --maxWorkers=2
npm run build
```

The cloud has Docker 28 and a cached PostgreSQL 16.15 image. Prepare the image
explicitly on a fresh Linux workspace, then run the efficiency checks:

```sh
docker pull postgres:16
npm run check:display-efficiency
```

The command runs the relevant unit guards and the actual SQL fixtures. It starts
its own disposable database, applies the numbered migrations there and removes
the database on exit. Docker runs with no network and mounts the repository read
only, copying just the test inputs into its temporary container. It never reads
a configured database URL. On a Mac, local `initdb`, `pg_ctl` and `psql` can run
the same fixture directly; the Docker fallback uses the Linux host Node binary.

The fixtures enforce unchanged responses at most 200 JSON bytes/180 gzip bytes,
a single arrival at most 14,000 JSON bytes and the known-record token list at
most 3,299 characters. They also check cleanup heartbeat stability and fresh
connection JSONB compatibility without type-catalog discovery. These are
repeatable fixture limits, not provider billing or a Free-plan guarantee.
The [Postgres.js type-discovery option](https://github.com/porsager/postgres#fetch-types)
is used only with the current JSONB runtime contracts; native array/custom-type
result columns would need a fresh compatibility review.

Playwright's browser download is blocked by this workspace's network policy
(`cdn.playwright.dev` returns 403). Installed `/usr/bin/chromium` works:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
NEXT_PUBLIC_SUPABASE_URL=https://synthetic.supabase.invalid \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=synthetic-public-test-key \
NEXT_PUBLIC_APP_URL=http://127.0.0.1:32753 npm run build
npm run start -- --hostname 127.0.0.1 --port 32753
```

In another terminal with the same browser-path variable, run the focused TV
checks against that local server:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:32753 npm run test:e2e -- \
  tests/color-polish-usable/display-cache.spec.ts \
  tests/color-polish-scenes/likes-total.spec.ts tests/color-polish-scenes/garden.spec.ts \
  tests/color-polish-scenes/live-feed.spec.ts \
  --grep 'unchanged polls|next five.second poll|disabled Color Polish reuses|cached delta starts|slow likes|unavailable-preset fallback|header|garden renders circular|reduced motion renders the garden still|Studio lists Live' \
  --workers=1
```

Studio authentication/API responses in these specs are mocked. System Chromium
may render differently from Playwright's pinned Chromium. Existing broad lint
and arrival geometry failures must be reported separately; a focused pass does
not prove every scene or a physical TV.

Migration 020 is required for the new opt-in TV bridge before app rollout. Its
latest-records index must be built separately with `CREATE INDEX CONCURRENTLY`
in autocommit mode before the transactional migration. The cloud checks apply
both only to a disposable fixture. Production SQL, publishing and deployment
remain subject to the backup/restore and safe-preview gates in Plan 31.
