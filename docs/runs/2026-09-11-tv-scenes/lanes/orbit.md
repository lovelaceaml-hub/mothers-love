---
lane: orbit
title: "Section 10, Expression Orbit slower, deeper, lit"
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-orbit
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T09:26Z
---
## Files
- public/color-polish/scenes/orbit.js: Updated planet orbital speed to 0.082 rad/s (was 0.102), increased depth blur to up to 1.8 px with 0 px in front, lowered back-side opacity floor to 0.72, added drop shadow keyed to scale, and preserved planet coordinate tracking (theta, z, scale, z-index).
- public/color-polish/scenes/orbit.css: Scoped CSS file retained with its header comment only. The initial record stated no stationary highlight existed, but an existing white radial highlight (at 26%, 16%) already ships on .orb::before in renderer.css, so the duplicate .orb::after rule was removed.
- tests/color-polish-scenes/orbit.spec.ts: Complete behavioral Playwright test spec covering 14 s circularity and overflow, 3D orbit and 0.082 rad/s rate verification from consecutive z samples, depth blur and drop-shadow checks at extreme z positions, circularity preservation across time checkpoints, and reduced motion still behavior.
- docs/runs/2026-09-11-tv-scenes/lanes/orbit.md: This lane record file.

## Gap report items closed
1. Speed: Planet angular rate changed from 0.102 to 0.082 rad/s (V.clock * 0.082). Moons retain their own orbital rates.
2. Depth: Blur formula updated to Math.min(1.8, Math.max(0, (-pos.z - 100) / 160)) px; opacity at back updated to 0.72 + 0.28 * (pos.z + 395) / 395; drop shadow added to the filter string via drop-shadow(0 ${(6 * pos.k).toFixed(1)}px ${(10 * pos.k).toFixed(1)}px #5C659240).
3. Lighting: Existing stationary white radial highlight at 26%, 16% on .orb::before in renderer.css provides the orb sheen, so no duplicate highlight rule is added to orbit.css.
4. Product invariants preserved: Four planets, moons, guide rings, back-side recognition swaps, and circular bubble geometry remain intact.

## Result
Expression Orbit runs slower, deeper, and with directional sun lighting. All changes are confined to the lane allowlist. Behavioral Playwright suite tests all acceptance criteria. Ready for coordinator verification and landing review.
Correction round r1 measures angular rate from consecutive z samples without relying on unexposed runtime properties, removes the duplicate orb::after highlight in favor of the shipped orb::before sheen, and clears all NaN test failures.
Round r2: rotates randomly through catalog expressions on each pass via ORBIT_BAG and orbitNextId without reading S.featured, falls back to any record when fewer than four match the expression, enables backside replacement fallback, and updates test suite with multi-open catalog variety and orb-slot structure assertions.
Round r3: preserves sun expression on keepAge remounts when S.sceneAge exceeds 0.5 seconds, removes dead V.orbitId assignment, widens rate test tolerance to 0.082 times 0.88 to 1.12, and notes wall-clock sampling.
Round r4: ports the 3D orbit rate test to the direct probe renderer harness to prevent Studio host snapshot remounts during multi-sample timelines, keeping 1000 to 26000 ms checkpoints in 5 s steps and restoring deterministic 0.082 tolerance of 0.92 to 1.08.


## Coordinator verification (Fable 5.1)
- typecheck, vitest, build pass; lint at the pre-existing 18; probe clean across six configs plus arrivals; Playwright on the production runner 12 of 13, the one failure being the usable spec's legacy fallback journey that fails identically on untouched tv/base under that runner. Round 1 measured the angular rate from z (visualState exposes no angle) and removed the highlight rule.
- Hygiene sweep clean. Review: Sonnet 5 (high): one should-fix, the CSS highlight duplicated the existing .orb::before sheen in renderer.css; removed in round 1 (the coordinator confirmed the CSS file holds only its header comment). Speed, blur, opacity and shadow formulas match the Decision; moons and the back swap untouched.
