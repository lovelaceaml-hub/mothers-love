# The Words of Mother's Love — Start Here

**Package version:** 1.0 • **Prepared:** September 7, 2026  
**Current mode:** Planning and specification only  
**Future implementation:** Codex, with Claude available as a second implementer or reviewer

## What this package is

A self-contained handoff of the campaign decisions, approved visual direction, proposed improvements, open questions, operational design, and future implementation tests. No prior chat history is required to understand the project.

This package does **not** authorize building, installing dependencies, changing application code, provisioning accounts, applying migrations, purchasing a domain, or deploying. The owner's latest direction was to plan the rest of the product first. A later explicit instruction can authorize a specific implementation task; deployment remains a separate permission.

## Start in this order

1. Read [AGENTS.md](AGENTS.md), then [01_PROJECT_BRIEF.md](01_PROJECT_BRIEF.md).
2. Read [02_DECISION_REGISTER.md](02_DECISION_REGISTER.md). Separate approved decisions from proposals; no new proposal has been approved merely by being packaged here.
3. Read the relevant phase specifications, particularly [09_PHASE_4_ADMIN.md](09_PHASE_4_ADMIN.md), the next recommended planning focus.
4. Inspect the preserved visual references and [13_PROTOTYPE_AUDIT_AND_SOURCES.md](13_PROTOTYPE_AUDIT_AND_SOURCES.md). Do not mistake prototype logic for a production contract.
5. Use Prompt A in [12_CODEX_AND_CLAUDE_PROMPTS.md](12_CODEX_AND_CLAUDE_PROMPTS.md) for the first Codex conversation.

## File map

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Compact agent instructions, permissions, reading order, and scope protection. |
| [CLAUDE.md](CLAUDE.md) | Companion entry point for Claude; points to the same requirements. |
| [01_PROJECT_BRIEF.md](01_PROJECT_BRIEF.md) | Mission, current status, approved scope, audiences, and exclusions. |
| [02_DECISION_REGISTER.md](02_DECISION_REGISTER.md) | Approved decisions, pending decisions, dependencies, and approval procedure. |
| [03_CONTENT_AND_DESIGN.md](03_CONTENT_AND_DESIGN.md) | All nine exact phrases and principles, branding, colors, copy, visual hierarchy. |
| [04_PHASE_1_SUBMISSION.md](04_PHASE_1_SUBMISSION.md) | Mobile form, validation, preview proposal, privacy, confirmation and error states. |
| [05_PHASE_2_DISPLAY.md](05_PHASE_2_DISPLAY.md) | Living Wall screens, readable content, movement, density, clusters, milestones. |
| [06_DISPLAY_ENGINE_AND_QUEUE.md](06_DISPLAY_ENGINE_AND_QUEUE.md) | Proposed presentation states, arrival queue, pauses, deduplication, recovery. |
| [07_PHASE_3_DATA_AND_API.md](07_PHASE_3_DATA_AND_API.md) | Candidate architecture, conceptual entities, publication and counting, API contracts. |
| [08_SECURITY_PRIVACY_AND_RETENTION.md](08_SECURITY_PRIVACY_AND_RETENTION.md) | Identity limits, permissions, moderation, seven-day lifetime, caches and backups. |
| [09_PHASE_4_ADMIN.md](09_PHASE_4_ADMIN.md) | Screen-by-screen administrative design, roles, actions, previews, TV controls. |
| [10_PHASE_5_ACCEPTANCE_TESTS.md](10_PHASE_5_ACCEPTANCE_TESTS.md) | Traceable acceptance cases, evidence requirements, operations and launch gates. |
| [11_BACKLOG_AND_BUILD_ORDER.md](11_BACKLOG_AND_BUILD_ORDER.md) | Planning tasks now; dependency-ordered implementation tasks for later authorization. |
| [12_CODEX_AND_CLAUDE_PROMPTS.md](12_CODEX_AND_CLAUDE_PROMPTS.md) | Copy/paste intake, planning, review, and explicitly gated future coding prompts. |
| [13_PROTOTYPE_AUDIT_AND_SOURCES.md](13_PROTOTYPE_AUDIT_AND_SOURCES.md) | Known prototype defects, source provenance, official technical references. |
| [14_PROJECT_STATUS.md](14_PROJECT_STATUS.md) | Starting status, approval log and handoff/checkpoint templates. |
| [references/README.md](references/README.md) | Preserved source inventory and rules for using historical material. |

The full archive includes the existing Phase 1 HTML, latest Phase 2 V3 HTML, original campaign artwork, two previously supplied review screenshots, and both earlier Markdown documents. They are copied as references, not repaired, executed, deployed, or promoted to finished production code.

The Markdown-only archive omits HTML and images. Its source inventory still describes those assets. Use the full package for visual work.

## Authority and conflict rules

Within this project, the owner's latest explicit decisions outrank this package. Next come the **APPROVED** decisions in `02_DECISION_REGISTER.md`, the approved catalog and identity, then the phase requirements. **PROPOSED** material remains a draft even when it uses precise language or acceptance tests. Original prototypes and historical documents are evidence, not permission to override later decisions.

If an old document says “will appear” for all submissions but the product also allows moderation holds, flag the contradiction and use the open decision register. Do not silently adopt inaccurate copy or silently choose a new policy.

## Meaning of status labels

- **APPROVED:** Explicitly selected in the owner's interview or subsequent feature requests.
- **DERIVED:** A logical consequence of approved requirements, such as a typed name not being verified identity.
- **PROPOSED:** Recommended detail awaiting owner approval. Includes new defaults, roles, access flows, and safety behavior beyond the existing selections.
- **KNOWN ISSUE:** Evidence about an existing prototype; not a claim that a replacement has been tested.
- **OUT OF SCOPE:** Do not add without a separate request.

The detailed engineering mechanisms in this package are proposals unless clearly labeled otherwise. They are intended to make review efficient, not to manufacture agreement.

## First Codex message

> Read AGENTS.md, README.md, 01_PROJECT_BRIEF.md, 02_DECISION_REGISTER.md, 09_PHASE_4_ADMIN.md, 13_PROTOTYPE_AUDIT_AND_SOURCES.md, and 14_PROJECT_STATUS.md. We are in planning-only mode. Summarize what is approved, identify contradictions or missing contracts, and propose the smallest set of grouped decisions needed to finalize the admin experience and data rules. Do not build, install, modify application code, provision services, migrate, or deploy. Keep the approved Bubble Board visual direction and exact campaign wording. Do not ask me to repeat decisions already documented. Begin with the highest-impact unresolved decisions, not cosmetic questions.
