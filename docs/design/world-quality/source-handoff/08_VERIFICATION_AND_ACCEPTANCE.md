# Verification plan and acceptance gates

## Evidence classes

Keep **observed source**, **configured check**, **executed result**, **browser render**, **physical-device measurement**, and **user visual approval** separate. A Vercel READY state or a TypeScript pass is not a 3D runtime pass. A local prototype's old 90/62/55 test report is not evidence about the current PR. A generated concept picture is not a screen capture.

The latest imported app evidence is a failure: `github_state/ci_failure_run_35648481429/report.json`. It must remain labeled as failure. Do not delete it to make the handoff look green. P0 should create new evidence in a separate run directory tied to the corrected SHA.

## P0 diagnostic gate

Use explicit fictional mode and block only requests consistent with the actual sample app. Verify that the guard does not interfere with required static chunks or hydration. No live records should enter screenshots, trace payloads or artifacts.

Record initialization milestones before the 60-second readiness assertion: document load, React mount, dynamic world import, scene creation, context creation, first shader/render completion, first frame, ready state. Catch and report constructor/import errors without sensitive values. Compare dev and optimized local builds, cinematic and classic, and the separate no-data harness. Record the **actual cause** before making a correction. Repeated HMR errors alone do not prove what blocked rendering.

Do not raise the timeout or ignore console output as the sole fix. If shader/geometry initialization legitimately needs time, measure and optimize it, provide progress/failure feedback, and set a justified bound. The desired result is both a working scene and truthful failure behavior.

## Functional checks to retain and extend

| Area | Required scenarios |
| --- | --- |
| Startup | Sample cinematic and same-build classic; WebGL failure; retry; no duplicate loop after recovery |
| Tour | All 13 enabled destinations; no clicks required; camera and resident projections change; enabled playlist changes respected |
| Reading | Complete short/long names and messages; paragraphs, graphemes, emoji, RTL, max permitted length; every page gets time; accessible full text |
| Bubbles | True world-space grouping; 0/1/9 expression cases; valid distinct symbols only; moving-camera clearance for icon bounds and reading disk |
| Arrivals | Each of three styles; at most one active appearance; queue doesn't steal reading; reaction refresh doesn't replay; residency and return correct |
| Privacy | Active and queued withdrawal, quiet/neutral, stale/offline threshold, sample/live switch, expiry and disposal clear content and textures immediately |
| Settings | Owner pause/arrival pause, rotation pause, reading hold, motion, effect toggles, reduced/still behavior and configured automatic cuts |
| Resizing | Desktop, phone portrait/landscape, tablet, fullscreen, CSS resize and DPR changes; no one-frame old-layout clearance errors |
| Resources | Reentry/loops, material restore/disposal, stable pool sizes, bounded arrivals/particles/textures, no growing listeners |

Discover the current test suite and run the relevant existing tests as well as targeted additions. Do not invent commands, test names or passing totals. The repository scripts include typecheck, tests, build and end-to-end checks at the inspected snapshot; verify current `package.json` and lockfile first.

## Visual review matrix

Capture identical source, sample record, timestamp, camera pose, viewport, render scale and art mode for comparisons. Include near hero, wide establishing, travel connector, active reading and one arrival stage. Compare all 13 destinations, not just the prettiest sanctuary angle.

Save the four supplied references next to matching runtime crops, identifying generated targets and browser captures explicitly. Annotate remaining mismatches in silhouette, surface, light, depth layering, detail, typography and movement. A rendered screenshot with no runtime error can still fail the visual gate.

**Hard visual gates:** recognizable original-heart shape; no decorative wire/icon/particle over required words; complete circular recognition content; clear expression identity; non-placeholder near plants/architecture; meaningful warm/cool form shading; readable foreground over far scenery; no severe clipping/inside-object shots; a distinct reveal and payoff for arrivals.

User evaluation decides whether fidelity is good enough. Do not turn a self-assigned score or "90% similar" claim into acceptance.

## Performance and durability

Proposed target: stable 30 FPS or better on the actual TV playback device, with smoother high-end operation where feasible. This is a target, not a promised result. Record the actual hardware driving the TV, not only the panel model; a browser on a connected laptop, streaming box or smart TV may have different limits.

Measure warm and cold startup, median/p95/p99 frame times, stutter periods, draw calls/triangles, texture/geometry counts, render dimensions, visible/active zone counts and queue lengths. Display the chosen quality settings beside results. A 4K viewport using a downscaled 3D buffer should be described accurately.

Suggested staged runs: 30 minutes during development, two hours before serious preview sign-off, and an overnight/device run before production consideration. These are planned tests; none was performed during handoff packaging. Do not promise unattended monitoring without actually running a tool/process with an observed result.

Keep owner-approved visuals and readable text intact when tuning quality. Prefer shared resources, instancing, compatible batching, near/far detail, bounded transparent effects and selective lighting before dropping the entire world to flat low-resolution shapes.

## Preview release gate

An isolated review delivery includes exact head SHA, build/deployment ID, sample URL and same-build classic URL; typecheck/build results; focused behavior checks; a real 3D readiness result; source/asset provenance; screenshots of all zones; a genuine moving connected passage; remaining visual differences; and untested physical-device/accessibility cases.

Keep the PR draft until review requirements are met. Do not automatically promote or merge. A later production action needs explicit authorization and the verified fallback/rollback route. Never replace private app records with fixtures to stage a nicer video.
