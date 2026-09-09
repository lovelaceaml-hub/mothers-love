# Mother's Love TV: local design handoff

**Checkpoint date:** September 9, 2026. **Status:** Held at Anthony's request. This is an experimental local design checkpoint, not a production release or final design approval.

## 1. What this package preserves

This package preserves the next visual design of The Words of Mother's Love TV, Anthony's feedback during its development, implementation details, verification evidence, and instructions for continuing. The working preview uses synthetic recognitions. It does not submit examples to production or load real recognitions.

Anthony's latest instruction is to hold and save the work. Do not continue designing, publish, merge, push, deploy, or change production simply because this package is opened. Read the conversation record before proposing the next change.

## 2. Read in this order

1. [Conversation and requirements](01-CONVERSATION-AND-REQUIREMENTS.md): the request history, decisions, and limits of the conversation capture.
2. [Detailed screen guide](02-SCREEN-BY-SCREEN.md): the intent and implementation of each display section.
3. [Technical architecture](03-TECHNICAL-ARCHITECTURE.md): how the preview, events, animations, and source files fit together.
4. [Verification and limitations](04-VERIFICATION-AND-LIMITATIONS.md): observed evidence and work that has not been verified.
5. [Resume and sharing guide](05-RESUME-AND-SHARING.md): local startup, portable source, troubleshooting, and continuation prompt.
6. [Decision log and next review](06-DECISIONS-AND-NEXT-REVIEW.md): what should be preserved and the next useful review questions.

## 3. Where the saved work lives

- Preview: http://127.0.0.1:3210/design-preview. This address works only on the Mac running the development server. It is not a public sharing link.
- Canonical working copy: `/Users/anthony/Projects/mothers-love-worktrees/local-3d-preview`.
- Local branch: `codex/local-3d-preview`.
- Baseline before this local design: `ad1e6d5e8482746f9e84fa514b61d343ccba01e1`.
- Primary app checkout: `/Users/anthony/Projects/mothers-love`. The local design was isolated from this checkout.
- This handoff: `/Users/anthony/Projects/mothers-love-worktrees/local-3d-preview/docs/handoffs/2026-09-09-local-design/00-START-HERE.md`.

The shareable ZIP includes these Markdown files, selected synthetic screenshots, an application source snapshot, a patch relative to the baseline, a checkpoint receipt, and a SHA-256 manifest. Dependencies, build caches, environment files, browser sessions, and credentials are excluded. See the receipt for the exact saved commit and archive content.

## 4. Current experience

The preview opens on Recognition Garden. Click a noninteractive part of the display, press Right Arrow or Space, or use Next display to advance. Use the screen picker to jump directly to a scene. Pause and Full screen are available. A large purple **Preview new arrival** button sits above the bottom toolbar. It injects a synthetic recognition into the actual presentation sequence, then the recognition joins the garden.

Navigation inserts Garden between story screens according to the existing scheduler. Use the picker when reviewing all ten distinct screens in succession.

## 5. Models and review

- Coordinator and integration: current Codex root assistant. Local configuration at handoff reports `gpt-6-astra`, medium effort; this is configuration evidence, not a retrospective token-level execution audit.
- Delegated visual work: Luna, max effort.
- Root was explicitly authorized to implement and correct mistakes.
- Terra: explicitly excluded by Anthony and not used for this local design.
- Review: root code inspection, typecheck, scoped lint, and focused headless-browser walkthroughs. No fresh independent completion review for this experimental checkpoint.

The initial atmosphere lane was stopped before a usable implementation; root implemented the overlay. The insights refinement lane supplied markup changes but was interrupted before completed styling; root finished and integrated the CSS. The circle lane supplied CSS that root corrected and integrated. Do not attribute all work to completed agent lanes.

## Handoff storage

[Managed Drive root](https://drive.google.com/drive/folders/1rwJkIJ6hn8zNxh5DsYloB4DNFfuHGTz1). Exact mounted archive folder: `/Users/anthony/Library/CloudStorage/GoogleDrive-lovelace.aml@gmail.com/My Drive/Anthony Mac Storage/Project Outputs/Mothers Love TV/2026-09-09 Local Design Handoff`. The archive copy was verified locally by SHA-256. Cloud synchronization and other people's access were not verified.
