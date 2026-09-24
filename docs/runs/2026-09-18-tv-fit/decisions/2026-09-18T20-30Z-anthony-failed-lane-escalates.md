# Anthony ruling: a failed lane escalates to a fresh, higher writer (2026-09-18 about 20:30Z)

Anthony, in the kickoff chat: "if a lane fails review it should not be sent back to the same writer. it should be escallated to a higher model"

Ruling applied:
- A lane whose landing review returns a blocking or major finding goes to a fresh writer one model higher, with the base order plus the accepted findings. Test-only minor fixes were the occasion of the earlier same-writer rounds; from now on none go back to the same writer.
- Here: writers were Claude Sonnet 5, so L1 and L2 corrections go to a fresh Claude Opus 5 writer. This overrides Plan 17's "Never Opus or Fable for implementation" line by Anthony's explicit instruction (routing rule 5). Fable is still never a writer.
- L2: the first writer's correction run was stopped mid-round; the worktree was restored byte-for-byte to the reviewed diff (scratchpad L2.diff) and handed to a fresh Opus 5 writer at about 20:32Z.
- Before this ruling, L3 (round 1 and a test-only confirmation fix) and L4 (a test-only minor fix) were corrected by their original Sonnet 5 writers; both then passed Opus 5 review and are committed (b84c0a9, bf2a6d6). Recorded, not redone.
- Open: review of Opus-written corrections. Terra (the routine reviewer for Claude-written code) is on the Codex primary pool at 100 percent until Sat 2:07 AM; the fallback is a fresh Opus 5 instance with a verdict-free payload. Asked Anthony.

## Anthony answers (about 20:35Z)

- Review of Opus-written corrections: a fresh Claude Opus 5 instance with a verdict-free payload.
- Add this rule to the shared policy after the run (instruction-maintenance), so Codex and Antigravity coordinators follow it too. Tracked as a Section Z follow-up.

## Anthony addendum (about 21:10Z)

"it can be escalated to FAble". Escalation ladder for failed writer rounds: Sonnet 5, then Opus 5, then Fable 5.1 (explicit override of the shared adapter rule that Fable never authors code, for escalation writing only). L2 round 3 moved from a fresh Opus 5 writer (stopped minutes after launch; worktree restored byte-for-byte to the reviewed round 2 diff) to Fable. Fable weekly pool read 80 percent at session start. Reviewer of Fable-written code: fresh Opus 5 instance.
