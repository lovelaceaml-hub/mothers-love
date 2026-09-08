# Copy/paste prompts for Codex and Claude

**Current mode:** Planning. Prompts A–C are available now. Prompt D is a template for a later explicitly authorized coding task, not authorization granted by this file. Prompt E is a review template.

Use the same package for both agents. Do not rely on them remembering the prior chat. Keep root `AGENTS.md` small and use the file index for detailed contracts. Official AGENTS.md behavior is referenced in source S01 of the audit document; confirm the actual installed environment before assuming all files are loaded.

## Prompt A — First handoff / intake (use now)

```text
This folder is the handoff for The Words of Mother's Love campaign.

Read AGENTS.md, README.md, 01_PROJECT_BRIEF.md, 02_DECISION_REGISTER.md,
09_PHASE_4_ADMIN.md, 13_PROTOTYPE_AUDIT_AND_SOURCES.md, and
14_PROJECT_STATUS.md. Read other specifications as needed.

We are in planning-only mode. Do not build the app, install dependencies,
change existing HTML, provision services, create credentials, run migrations,
purchase a domain, deploy, or start collecting real submissions.

Preserve the approved Bubble Board visual direction, exact nine phrases and
principles, bottom-left QR, private submitted name, multiple expression
selection, one recipient and one message, seven-day personal-data lifetime,
and aggregate history. Do not treat proposed defaults as approved.

Return:
1. A concise summary of the current product and approved scope.
2. Contradictions or missing requirements with decision/file references.
3. The smallest grouped set of owner decisions needed next, with your
   recommended options and tradeoffs.
4. A proposed next planning task focused on the admin workflow and data rules.

Do not ask me to repeat the interview. Do not claim prototypes passed runtime
or security tests just because they were visually approved. Stop before coding.
```

## Prompt B — Plan Phase 4 in detail (use after intake)

```text
Continue planning only. Review 09_PHASE_4_ADMIN.md with
02_DECISION_REGISTER.md, 07_PHASE_3_DATA_AND_API.md,
08_SECURITY_PRIVACY_AND_RETENTION.md, and the acceptance tests.

Prepare a refined screen-by-screen admin specification covering Overview,
Recognition Manager, Detail/Editor, Review Inbox, Display Controls, Insights,
and Settings/Access. For each screen specify fields, actions, empty/loading/
error/expired states, permissions, confirmation dialogs, and acceptance cases.

Resolve contradictions in the proposal by explaining alternatives; do not mark
any policy approved without my choice. Focus on hide vs invalidate and counts,
original expiry, concurrency, private submitted names, role boundaries,
TV acknowledgement, Quiet/Still behavior, and emergency neutral state.

Do not create UI code, install tools, change prototypes, or provision services.
Documentation edits are allowed if you show which decisions remain pending.
```

## Prompt C — Independent planning review (Codex or Claude)

```text
Act as independent reviewer of this planning package, not as implementer.
Read AGENTS.md and the decision register, then inspect the relevant specs and
preserved references. No application edits or deployment.

Identify contradictions, unapproved scope, privacy/counting ambiguities,
missing failure states and acceptance-test gaps. Check that every approved
feature is still represented and every proposed detail is labeled honestly.

Pay special attention to anonymous-on-screen vs verified identity, held-content
confirmation, seven-day backups/caches/audits, counting independent of TV,
full nine-expression text, readably handling 500 characters plus nine selections,
queue/slideshow coordination, hidden content removal, and role revocation.

Return findings by severity with exact file/section references, recommended
resolution and affected tests. Do not redescribe the whole project, add new
features or assume that a proposed default has owner approval.
```

## Prompt D — Scoped implementation template (NOT authorized yet)

Replace the bracketed fields only when the owner actually authorizes coding. Leaving a bracket unresolved is not permission to guess a policy.

```text
I authorize local implementation of [BUILD task ID and precise scope] only.
This does not authorize production deployment, service provisioning, purchases,
real member data use, or unrelated rewrites.

Read AGENTS.md, the relevant phase specs, the current decision register and
14_PROJECT_STATUS.md. Owner-approved decision IDs for this task are [IDs].
Still-pending decisions are [IDs]; do not encode them as production policy.

Preserve the selected visual direction and exact canonical content. Treat HTML
references as visual evidence, not verified production logic. Use synthetic data.

Before edits, state the scoped plan, dependencies and applicable test IDs.
Implement only the agreed scope, add the required tests, and report actual
checks/results and remaining gaps. Stop and ask if a policy/security decision
blocks the task. Do not declare completion from syntax checks alone.
```

## Prompt E — Review a later implementation task

```text
Review [task/commit/files] against the approved decision register and acceptance
cases. You are reviewer; do not edit implementation unless separately asked.

Check authorization, private-field isolation, server validation, safe text output,
counting idempotency/concurrency, original expiry and purging, removal/reconnect,
queue/pause priority, full-message readability, catalog fidelity, and scope creep.

Separate confirmed defects, risks needing a test, and optional suggestions.
For each finding include reproduction or code evidence and affected requirement/
test IDs. List tests actually run versus tests still required. No deployment.
```

## Prompt F — Document a checkpoint

```text
Update the requested project documentation only. Record the approved decisions,
current task state, changed files, actual test evidence and remaining blockers in
14_PROJECT_STATUS.md. Do not retroactively mark proposed policy as approved,
claim tests passed, or change the current authorization boundary.

Leave a short next-agent note with the exact next scoped task and files to read.
```

## Model/tool selection

No specific model, effort level, autonomous mode or subscription is required by this handoff. Do not add an OpenAI/Anthropic API dependency to the campaign just because these tools are used to write code. Architecture and privacy decisions remain the owner's, not model-dependent defaults.
