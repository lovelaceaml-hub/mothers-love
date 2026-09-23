# Anthony's ruling: a failing unit escalates to Opus, then to Fable

Recorded 2026-09-12T04:55Z by the coordinator (Opus 5 high), from Anthony's message in the Plan 15 run chat: "If something is failing, it should be escalated up to Opus, and then, if that one fails, it should be escalated up to Fable."

## What this replaces

The shared policy's writer-escalation ladder for this run was: three Luna failures move the unit to `gpt-5.6-terra`, two more to `gpt-5.6-sol`, then Anthony. The routing table also says implementation never runs on Opus 5 or Fable, and the spill rule's last step before `blocked` is Sonnet 5.

**Anthony's instruction overrides both for this run.** The ladder for a failing unit is now:

1. The lane's declared writer, Gemini 3.8 Flash (High) via agy (Codex primary is at 100 percent, so Luna is unavailable).
2. **Opus 5 (high)** when that writer keeps failing.
3. **Fable 5.1** when Opus also fails.

## How the coordinator applies it

"Failing" means the same unit has not produced a correct result after **three** dispatch attempts, counting a transport error, a quota refusal or an empty run as an attempt, since from the lane's point of view all three are the same outcome: no progress. A lane that is simply mid-correction, having produced work and received review findings, is not failing; that is the normal loop.

At step 2 the coordinator implements the unit itself, in that lane's worktree, under the same allowlist and the same hard rules the work order carried. The unit still gets its landing review, and the reviewer is still a fresh Sonnet 5 subagent, never the coordinator, so the never-grade-your-own-work rule holds.

## Two things Anthony should know, stated rather than assumed

**Fable's weekly pool is at 95 percent** (live reading 2026-09-12T04:37Z, resets Tuesday about 11:00 PM Pacific). So step 3 has very little room left. If a unit reaches Fable there may not be enough quota to finish it, and the honest outcome would then be to report the unit blocked with its reset time rather than to keep retrying. The coordinator will say so plainly if that happens rather than burning the remainder silently.

**Claude's weekly is at 74 percent** and is shared by this coordinator chat, every Sonnet landing review and the Opus completion review in Section Z. Escalating implementation onto Opus spends that same pool, so each escalation is a real trade against the reviews still to come. The coordinator will escalate when a unit has genuinely stalled, not to save a ninety-second quota wait, and will name the cost in the progress report.

## First application

The orbit lane (Section 8) is the first candidate. Its correction round has failed twice: attempt o2 died on `RESOURCE_EXHAUSTED (429)` after six internal retries, and attempt o3 exited having written nothing at all to stdout, stderr or the worktree. Attempt o4 is in flight. If o4 does not produce the correction, the unit escalates to Opus 5 under this ruling.
