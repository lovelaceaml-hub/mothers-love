# Final integration review, correction round 1

Independent gpt-5.6-terra high reviewer verified all140sealedfilehashes and returned CHANGES_REQUIRED. Findings: stale authenticator wording on settings; stale Owner AAL2 bootstrap instruction; Sign out handler referenced without invocation. Controller accepted all, identified the same defect in the second Sign out button, and assigned corrections to the original Luna xhigh writers in separate worktrees. Session-only logout avoids revoking sessions in other applications sharing Auth. No global provider policy change is involved.

The reviewer confirmed SQL003 removes only the campaign AAL2 requirement, server checks retain verified identity and current role membership, and setup requires a provider session before password update. These are partial findings, not whole-plan acceptance. A new complete sealed payload and re-review follow the corrections and affected verification.
