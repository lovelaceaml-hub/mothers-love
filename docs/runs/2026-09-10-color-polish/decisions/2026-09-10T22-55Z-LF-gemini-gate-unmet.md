# Coordinator ruling: lane LF spills from Gemini 3.8 Flash to Sonnet 5

Date: 2026-09-10, 15:55 PDT. Coordinator: Fable 5.1 (Claude Desktop session on the mothers-love project).

Context: Codex primary is at 100 percent until 2026-09-16, so the completion fixes lane (LF, order at docs/runs/2026-09-10-color-polish/orders/LF.md) was routed to Gemini 3.8 Flash through the agy CLI, the routing table's implementation alternate. A throwaway probe call returned OK, so the pool was live.

What happened: the headless launch (agy -p, model gemini-3.8-flash-high, mode accept-edits, worktree $HOME/.claude/worktrees/mothers-love-color-polish-fixes) ended with no output and no edits. agy reported that a tool required the "command" permission that headless mode cannot prompt for and was auto-denied. The Antigravity gate at $HOME/.gemini/antigravity-cli/settings.json allows only ls, cat, pwd, find, grep, node, npm, git status and git diff as whole command strings, so the environment-prefixed npm commands and the psql check in the order could not run. This is the same gate-unmet case recorded earlier today in the Workflow Prune 2 run.

Ruling: the gate is unmet for LF. Under the routing table's spill order (Gemini refuses, then Sonnet 5, never Opus or Fable), LF runs as a Claude Sonnet 5 helper with the same order and the same worktree. Not taken: --dangerously-skip-permissions for agy, which would broaden a permission without Anthony's say. Fable does not write the code itself.

Follow-up for Anthony, not this plan: either add bash, python3 and psql to the gate's command rules (a permission broadening, his call) or accept that Antigravity lanes cannot run shell verification and route such lanes elsewhere at planning time.
