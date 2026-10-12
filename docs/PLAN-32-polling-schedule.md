# Plan 32: scheduled public polling

Status: implemented locally on `fix/tv-polling-schedule`, based on main `4274474c74bf2679107ebc46da76cd6769d1d09d`. Prepared for authorized release. Anthony chose last-content retention and authorized deployment on October 12.

## Requested schedule

All times use `America/Los_Angeles` (Las Vegas/Pacific), including DST. Start boundaries are inclusive; end boundaries are exclusive.

| Local time | Automatic read cadence |
| --- | --- |
| Saturday 09:00–22:00 | Existing fast cadence |
| Tuesday 18:00–22:00 | Existing fast cadence |
| All other 07:00–24:00 times | At most once every ten minutes per read stream |
| Every day 00:00–07:00 | No recurring automatic reads |

The shared scheduler pauses while hidden, uses one timeout for the next due read or mode boundary, and coalesces delayed timers, focus, pageshow and visibility events. It does not replay missed polls. A user-opened page gets one initial verification even overnight. Navigation, manual Refresh now/Try again, Show older recognitions, receipt refresh after submission and manual like/submission writes stay available; they are not recurring polling. Home manual refresh postpones its next automatic read to avoid an immediate duplicate. Source selection gets one explicit initial read. In-flight requests may finish or time out after a boundary; no new recurring request starts overnight.

## Last-content retention

Anthony explicitly chose “last content” on October 12. During planned ten-minute intervals and overnight suspension, the last successfully fetched content remains visible. It is not newly verified: original verification timestamps remain unchanged, and off-hours home/V6 labels identify scheduled updates. A newly removed record disappears on the next authoritative refresh, including the 07:00 resume after overnight suspension. Known local expiry and explicitly received quiet, neutral or moderation changes take effect immediately.

This is a narrow exception to the existing 60-second freshness contract for intentional slow/paused intervals. Genuine failed scheduled refreshes and fast-window freshness still use the existing privacy limit; failures cannot silently extend retained content. V6 fallback and every dependent reaction/recovery read use the same schedule. No backend migration, credentials, paid resource or security change is needed. Deployment was explicitly authorized after checks.

## Remaining request sources and expected impact

These are steady-state model counts per continuously visible client for a normal 168-hour week: 17 fast hours, 102 slow hours and 49 paused hours. Fake-clock scheduler tests count the resulting requests. Initial/manual reads, boundaries near a page mount, request failures/latency and multiple clients are excluded from this idealized model. Hidden time can reduce counts further. A DST week has 167 or 169 actual hours; the clock change occurs during the paused interval, so the scheduled active windows remain the same.

| Stream | Fast cadence | Prior 24/7 requests/week | Scheduled model/week | Reduction |
| --- | ---: | ---: | ---: | ---: |
| Color Polish snapshot and live world | 5 s | 120,960 | 12,852 | 89.375% |
| Standalone V6 snapshot fallback | 4 s | 151,200 | 15,912 | 89.476% |
| Homepage feed, recurring V6 reaction reads | 10 s | 60,480 | 6,732 | 88.869% |
| V6 anonymous daily aggregates | 30 s | 20,160 | 2,652 | 86.845% |
| Build version check | 5 min | 2,016 | 816 | 59.524% |
| Approved Studio preview | 7.5 s | 80,640 | 8,772 | 89.122% |

Color Polish's campaign likes total remains a database subquery folded into an eligible snapshot HTTP request, rather than a separate likes HTTP loop. During fast mode its existing ten-second rate remains; a slow-mode verification can include it once. Pool reaction counts remain event-driven (pool changes/visibility, bounded by the schedule), not a fixed five/ten-second TV loop.

One homepage round can issue one feed request plus reaction reads batched at 100 IDs and re-reads of up to ten manually loaded older pages, with their associated reaction reads. Genuine failure and fast-window hidden clearing drop those personal caches and reset the loaded older pages; a user can load older pages again. No automatic reaction recovery timer issues a network request; existing recovery timers update the UI for an explicit retry. Form configuration is an initial read. Framework navigation/prefetch, static assets/3D kit assets, user-initiated mutations/retries, and authenticated session maintenance are additional sources; admin Auth/security behavior is unchanged. Local display clocks, animation/expiry timers and request-abort timers do not issue periodic network reads. Other clients, old loaded bundles until refresh, shared-project apps and provider/background work remain outside this client schedule.

If the baseline already paused every night and ran a five-second stream only 07:00–24:00, the comparable reduction is about 85%, rather than 89.375%. Request reduction is not proportional CPU/billing savings and does not reset or lift an existing service quota restriction.

## Build log

- 2026-10-12: schedule implemented locally with one Pacific-time policy, explicit planned-pause retention, gated recovery/deferred reaction reads, bounded build checks and lifecycle cleanup. Timezone/DST/boundaries, one-week request counts, hidden/wake/mount/unmount, manual actions and actual main/TV/V6 request paths have fake-clock coverage. Fast-window browser journeys are pinned to Saturday to verify retained behavior. Verification uses synthetic data only; release verification is recorded below.

- Final preparation: full unit suite 1,031 passed and 7 skipped with two workers and a 15-second test deadline on the constrained executor. The earlier default-deadline run passed 1,027/7 before the final lifecycle/expiry tests; concurrent browser/build pressure caused unrelated geometry-test timeout failures in intervening runs. Typecheck, production build and scoped lint pass. Focused schedule/readers/world checks passed 103 tests before the additional sleep-expiry case, and that case passed with the actual feed hook. No database, dependency, auth, security, hosting configuration or paid-resource changes. Browser verification uses the production build with all API calls mocked to fictional records.

- Production-build browser evidence: all eight TV journeys passed in the final combined run, including slow retention and midnight/07:00 resume. That run had 16/17 pass because one home fake-clock initial timer had not advanced before assertion; after explicitly advancing that timer, all nine home journeys passed together in the targeted rerun. App code was unchanged between these browser runs. Code changes include retrying an aborted initial development-remount verification, preserving retained older pages when an automatic refresh stops at a schedule boundary, and using elapsed wall/performance time so sleep cannot extend known expiry.
