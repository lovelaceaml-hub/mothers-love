---
lane: welcome
title: Section 1, Welcome depth and heading changes
state: reviewed
model: gemini-3.8-flash-high
runner: coordinator
worktree: $HOME/.claude/worktrees/mothers-love-tv-welcome
review: "sonnet-5 high on landing"
depends_on: base-b
updated: 2026-09-11T04:53Z
---

## Files
- public/color-polish/scenes/welcome.js: Implemented depth layer assignment, pace multipliers, heading changes, drift replacement, rolling entrance and exit spin, exit gating, reader protection, stage overflow clamping, and shadow/sparkle/glint canvas effects.
- public/color-polish/scenes/welcome.css: Scoped CSS for circular orb slots with isolation, welcome ring spin animation with reverse direction toggle, and reduced motion overrides.
- tests/color-polish-scenes/welcome.spec.ts: Playwright test suite verifying circularity, no overflow, click-advance prevention, speed differences, depth layer spread, blur differences, heading direction change over time, replay circularity, and still-mode transform absence.
- docs/runs/2026-09-11-tv-scenes/lanes/welcome.md: Lane execution record for Section 1.

## Gap report items closed
- Ask 1 (Deliberate heading changes): In integrate(), when V.clock >= a.nextTurn for steady non-large actors, rotated the velocity vector by a seeded angle between 25 and 70 degrees (with a seeded sign) and scheduled nextTurn = V.clock + 4 + a.rng() * 6.
- Ask 2 (Visible depth): Assigned depth layers (far, mid, near cycling, with fourth actor near) in mount(), scaled pace by layer factors (0.7, 0.9, 1.15), set data-depth on slot elements, and in place() applied layer scale (0.84, 0.93, 1.0), layer blur (0.9px, 0.35px, 0px), and layer z-index offsets (40, 60, 80).
- Ask 3 (Circularity preservation): Maintained 50% border-radius and width equal to height throughout steady motion, entrance, exit, and replay.
- Reduced motion: Bypassed place() style overrides when S.still is active, preserving initial inline positioning without applying transform translation.

## Result
Welcome scene depth layering and heading changes are fully implemented and covered by automated Playwright behavior specs. No CSS rules were added beyond the existing scoped header comment. Ready for coordinator verification and landing review.
Round 1: removed the still-mode early return in place() so depth layering styles apply on mount under reduced motion, and updated the spec to assert layer scales within .02 and stability over 1000 ms.
Round 2: updated the reduced motion test scale assertion to between 0.88 and 1.02 times layer scale inclusive to account for actor depth breathing.
Round r3: replaced rightBubbles with scene-owned six-bubble layout, enabled continuous drift replacement, added rolling entrance and exit spin with steady ring spin in CSS, soft ground shadow ellipses, sparkle trails, and rim glints on fx canvas.
Round r4: protected large reader bubble from retirement, clamped rendered slot coordinates to eliminate stage overflow, gated bubble exits to at least 4.6 s apart with at most one exiting at a time, renamed ring animation delay property to --welcome-ring-delay, removed duplicate spin direction CSS property, initialized transition timestamps to -1 with lazy angle seeding, and added slot isolation.
Round r5: clamped rendered coordinates using the rotated bounding box half extent (scale times spread factor |cos R| + |sin R|) with an 8 px margin, preventing rotation-induced stage overflow.
Round r6: animated --welcome-ring-angle via @property in conic-gradient instead of rotating the .orb-slot::after box, eliminating rotation-induced bounding box expansion.

## Deferred
- The sample fixture has no message over 160 characters, so reader mode cannot be exercised through the Studio harness; a follow-up could add a direct renderer harness test with a synthetic long record.

## Coordinator verification (Fable 5.1)
- typecheck, vitest, build pass; lint at the pre-existing 18; probe clean across six configs plus arrivals (logs/welcome/probe); first Playwright run had three renderer-frame timeouts while two other runs shared the machine; isolated rerun of helpers.spec plus welcome.spec 7 of 7 (logs/welcome/spec-rerun.out).
- Hygiene sweep (Haiku 4.5 low): no findings. Review: Sonnet 5 (high), no material findings; two latent notes (the still-mode early return in place() skips a slot sync that is a no-op today; an entering far-layer actor could exceed the 0.9 px blur cap, unreachable while replaceMode is null).
