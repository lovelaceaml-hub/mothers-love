# Approved TV access

Anthony explicitly requested removing the TV code requirement so the display opens with its link. This supersedes paired-only TV access and device revocation/acknowledgement UI. Existing admin login and permissions remain. Global privacy and display controls remain.

## Bounded technical decisions
Public read response has an explicit field allowlist, at most1000eligible recognitions, no device/session writes and runtime-only database execution. More than1000eligible arrival events triggers a quiet reset rather than silent partial delta or an unbounded replay. Legacy pairing bridges remain secured and unused; no destructive schema cleanup. Snapshot requests time out after10seconds and retry automatically. These implementation choices use Anthony's best-judgment authority and preserve the approved product behavior.
