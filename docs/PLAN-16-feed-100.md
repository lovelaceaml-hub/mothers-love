# Plan 16: Latest 100 recognitions

## Outcome

The public recognition feed shows the latest 100 published, unexpired messages, newest first, while preserving the existing privacy, neutral-mode, cleanup-health, expiry, and heart controls.

## Setup

- Agent: Codex root controller, working solo
- Model: Sol controller
- Effort: current session setting
- Reviewer: controller review, proportional to this narrow feed change
- Release: production after database, application, and live smoke checks pass

## Acceptance criteria

1. The database returns at most 100 eligible public feed records.
2. The server and browser accept and display 100 records, and reject oversized responses.
3. Heart counts work across all 100 records through requests of no more than 30 IDs each.
4. The feed remains newest first, scrollable, keyboard reachable, privacy-safe, and expiration-safe.
5. The production database and website are updated, verified, committed, and backed up without touching unrelated work.

## Build log

- 2026-09-12: Recorded the existing 50-record database maximum and 30-record browser maximum. Began a narrow solo update because the backend, client, reactions, tests, and release are one tightly coupled feed boundary.
- 2026-09-12: Raised the database, server, and browser maximum to 100. Heart-count reads now load all visible items in 30-ID batches. Updated focused unit and browser coverage plus the public contract and user manual.
