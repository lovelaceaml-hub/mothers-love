# Coordinator ruling: lanes LC and LH spill from Gemini 3.8 Flash to Sonnet 5

Date: 2026-09-10, 5:05 PM PDT. Coordinator: Fable 5.1.

Context: earlier the same day, lane LF hit the Antigravity headless gate's command allow-list and produced nothing, recorded at decisions/2026-09-10T22-55Z-LF-gemini-gate-unmet.md. Anthony then widened the gate, adding bash, python3 and psql to /Users/anthony/.gemini/antigravity-cli/settings.json (recorded at /Users/anthony/Projects/docs/runs/2026-09-10-workflow-prune-2/decisions/2026-09-10T23-45Z-anthony-widened-agy-gate.md), so lanes LC and LH were launched on Gemini 3.8 Flash through agy under the widened gate.

What happened: both lanes still failed, in two different ways. LC's agy print mode launched the renderer probe script as a background task, then the session ended while "standing by," waiting on that task's completion notification, with no edits made. LH's agy reported that a tool required the "command" permission, that headless mode cannot prompt for it, and that it was auto-denied; the logs do not record which command triggered the denial. Both attempts are recorded in the orchestrator ledger as agy-LC-20260910 (fail) and agy-LH-20260910 (blocked).

Ruling: the gate is still unmet for both lanes, even widened. Under the routing table's spill order (Gemini refuses, then Sonnet 5, never Opus or Fable), LC and LH both ran as Claude Sonnet 5 helpers, same worktrees, same branches, same orders. Not taken: --dangerously-skip-permissions for agy, which would broaden a permission without Anthony's say. Fable does not write the code itself.

Follow-up question for Anthony: keep routing implementation lanes to Gemini through agy until the headless denial is understood, since the widened gate did not fix it and the LH denial does not even name the blocked command, or route implementation lanes elsewhere by default and treat agy as read-only or review-only until this is diagnosed.
