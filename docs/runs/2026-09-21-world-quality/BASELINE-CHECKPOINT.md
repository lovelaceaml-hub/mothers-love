# P0 local baseline checkpoint

Goal: Upgrade all 13 connected locations and their travel corridors toward the supplied artwork, reproducing the selected preview's pearl and entrance appearance while preserving the app's reading, camera, arrival, and privacy behavior.

Status: partial P0 evidence. Application code is unchanged. Claude implementation is blocked by an expired login. The historical CI readiness failure is still unexplained, startup instrumentation is not implemented, and P0 is not complete.

## Source and environment

- Tested source: `9a6bbf8bf34f04b5885b6ede39732f026baab488`.
- Application code is unchanged from `b324b81cabe947592f6723425c58f14307b58083`; the intervening commit contains the approved plan and reference bundle.
- Runtime: macOS, Node 24.14.1, npm 11.11.0, Playwright Chromium 145.0.7632.6, headless, 1920 x 1080, device scale 1, reduced motion.
- Requested rendering flags: ANGLE with SwiftShader, unsafe SwiftShader enabled, GPU blocklist ignored. Actual GPU renderer identity was not independently queried.
- Optimized server: loopback port 32741. Development server: loopback port 32742. Both were stopped after the checks; those URLs are no longer served.
- App captures use explicit `source=sample`. API requests were blocked. The separate scene harness contains no recognition feed or React host.

## Results

| Case | Ready elapsed | Result |
| --- | --- | --- |
| Optimized classic | 7,072 ms | Ready, two reported frames, 14 fictional recognition bubbles |
| Optimized cinematic | 6,714 ms | Ready, two reported frames, 14 fictional recognition bubbles |
| Development classic | 8,655 ms | Ready, two reported frames, 14 fictional recognition bubbles |
| Development cinematic | 6,927 ms | Ready, two reported frames, 14 fictional recognition bubbles |
| No-data classic | 3,489 ms | Actual render, 269 calls, 434,252 triangles |
| No-data cinematic | 5,675 ms | Actual render, 397 calls, 884,308 triangles |

No page errors or failed requests were captured. Classic app captures emitted GPU readback stall warnings, preserved in the raw reports. No warning was hidden or treated as proof of initialized output. All six screenshots were visually inspected.

The lockfile installation, TypeScript check, optimized build, and all 40 world unit tests passed. The original dev CI workflow was not fixed or rerun during this checkpoint. This is a macOS headless result, not an exact reproduction of the historical Linux headed Xvfb configuration. The early reported frames prove a rendered app baseline, not sustained performance, long reading behavior, arrival correctness, or physical-TV commissioning.

## Visual findings

Both app modes render complete sample recognitions within the world. The cinematic decorator changes trees, arches, flowers, and water, but the resulting scene remains visibly below the supplied target. Trees read as repeated flat petal clusters, surfaces lack differentiated lighting and contact depth, architecture is sparse, and the hero pearl remains a simple reading disc. The supplied original heart and exact pearl appearance have not been integrated. These are baseline gaps for the approved phases, not newly introduced changes.

All app cases used the same Garden camera `41.000,11.000,40.000`, reported elapsed time `0.00`, reading remaining `19.00`, and identical sample record positions. The scene-only harness intentionally uses time 10 and omits the recognition layer, so it must not be presented as a pixel-equivalent app frame.

## Evidence and recovery

- [Optimized raw report](BASELINE-OPTIMIZED.json)
- [Development and no-data raw report](BASELINE-DEV-HARNESS.json)
- [Development and harness probe](baseline-probe.mjs)
- [Verified recovery manifest](BASELINE-RECOVERY-MANIFEST.json)
- Cinematic app capture (`2026-09-21-world-quality-baseline-9a6bbf8/optimized/cinematic.png` in Drive)
- Same-build classic capture (`2026-09-21-world-quality-baseline-9a6bbf8/optimized/classic.png` in Drive)

Eleven output files were copied into the configured project Drive output folder and individually verified by SHA-256. Originals remain in `/private/tmp`. The local mounted copies are verified; remote Drive synchronization was not independently queried.

## Required next work

Restore Claude authentication and resume the same Opus P0 capsule. Preserve these results, instrument startup and failure cleanup, exercise the actual CI environment, and diagnose any difference before declaring a fixed baseline. Do not replace that work with a longer timeout or this passing local report. P1 through P7 remain queued under the approved model ownership.
