# Contacts Relationship V2 Implementation Workstreams / 通讯录关系系统 V2 实施工作流

Updated: 2026-05-20

This document translates the Contacts/relationship package into execution-ready workstreams.

## 1. Workstream A: Data Model And Ownership

Objective:

- make role identity, chat binding, relationship runtime, and memory groups impossible to confuse.

Main tasks:

1. keep visible `roleId` in role profile and preserve duplicate validation;
2. keep `profileId` as internal profile key only;
3. keep `entityKey` as runtime key only;
4. make memory-group APIs first-class in relationship runtime;
5. keep source-record cleanup metadata stable and explainable;
6. explicitly classify `relationshipLevel` and `relationshipNote` as:
   - legacy compatibility fields; or
   - chat-side manual annotation fields only.

Semantic traps to avoid:

- showing `profileId` or `entityKey` as if they were `roleId`;
- reading Chat-side compatibility fields as the live relationship truth;
- letting one event create several competing memories.

## 2. Workstream B: Delete / Reset / Memory Cleanup Orchestration

Objective:

- make destructive actions safe, explainable, and complete.

Main tasks:

1. hard delete orchestrator for role profile;
2. relationship reset orchestrator;
3. single memory-group delete orchestrator;
4. shared cleanup handlers for module-owned records;
5. impact-summary generation for dialogs;
6. recompute relationship state after memory deletion.

Semantic traps to avoid:

- deleting role archive without clearing relationship runtime;
- deleting memory summary only while leaving source records behind;
- auto-deleting ordinary free-text chat content during memory deletion.

## 3. Workstream C: Contacts Detail IA And Presentation

Objective:

- make Contacts feel like a role hub instead of a thin card list.

Current landed baseline:

- role detail starts with a Role Hub summary for entity type, Chat-bound state, manual/event-attached counts, WorldBook field count, memory count, and linked activity sources;
- role detail sections show manual and event-attached counts;
- role detail sections group manual and event-attached items separately;
- each item exposes a source chip and short source hint;
- event-attached entries are visibly locked from direct deletion and point users to memory deletion or relationship reset;
- event-attached entries with a memory key can open the linked memory detail directly;
- memory detail now exposes source-audit cards and supporting-event drill-down without moving source-record ownership away from the source modules;
- manual detail items now support inline editing, and linked activity expands into a source-aware event-attached list.
- the memory list now supports basic source filtering, sort mode, and selected-memory headline facts.
- memory lifecycle review is now user-manageable through `Pinned / Active / Archived` plus a review note.
- Contacts memory filtering now evaluates the full sorted runtime list before applying the visible-item cap, so source-filtered audit work does not lose off-screen matches.
- World Hub now mirrors primary memory lifecycle state and review note for the top shared memory summary instead of hiding that management signal inside Contacts only.
- runtime summary snapshots now provide canonical `primaryMemory`, memory-count totals, archive-only state, and source summary fields so Contacts/World Hub no longer need to rebuild those semantics separately.
- linked-activity source totals now dedupe runtime source refs against event-attached detail refs before counting, preventing one shared event from appearing as several source records.

Main tasks:

1. deepen role detail page sections and hierarchy below the Role Hub summary;
2. readable role ID presentation;
3. richer memory list and memory detail behavior;
4. after this completed baseline, move deeper memory dedupe/merge and recall rules into Workstream 4.2 instead of extending 4.1 further;
5. richer Chat-bound state and navigation hints;
6. danger-zone isolation and confirmation copy.

Semantic traps to avoid:

- blending normal edit actions with destructive actions;
- making event-attached items look like user-authored facts;
- hiding the Contacts vs Chat Directory distinction.

## 4. Workstream D: Documentation And Collaboration Guardrails

Objective:

- keep future engineers from reintroducing old semantics.

Main tasks:

1. keep this package updated when semantics change;
2. sync architecture docs when ownership changes;
3. sync PM status and roadmap when priority/status changes;
4. keep module naming aligned with `docs/pm/MODULE_NAME_GLOSSARY.md`;
5. keep workflow instructions aligned with `docs/process/AI_WORK_MODE.md` and the local workflow skill.

## 5. Semantic Drift Watchlist

Additional current guardrail:

- World Hub must not fabricate `roleId` from `profileId` or `entityKey`; missing role profiles should be labeled as runtime-only or missing-profile contexts.

Treat the following as bugs or review blockers:

1. `会话通讯录` shows "亲密度" using `relationshipLevel` while runtime says something else.
2. `世界中枢` displays internal runtime keys in the place where product-facing role ID should appear.
3. `通讯录` and `会话通讯录` both expose destructive role-management actions.
4. A deleted memory still appears through linked runtime/source data.
5. Event-attached role-detail items survive after the memory that created them is gone.

## 6. Validation Baseline

Minimum validation for meaningful changes here:

- `npm run lint`
- `npm run build`
- `npm run test` when behavior, orchestration, or state logic changes

Recommended review after implementation:

- check Contacts detail page
- check Chat Directory entry behavior
- check World Hub cleanup behavior
- check one role delete flow
- check one relationship reset flow
- check one memory-group delete flow

## 7. 4.2 Entry Slice

Current active 4.2 baseline:

1. start by tightening same-life-event memory-key reuse in the runtime and adapter layer before changing Contacts or Chat presentation again;
2. preserve source-record auditability and cleanup coverage while reducing duplicate top-level memories;
3. treat Shopping gift memory plus downstream Calendar delivery follow-up as the first canonical merge case.
4. keep review ordering and memory visibility behavior aligned between runtime, Contacts, and World Hub while 4.2 continues.
5. keep `summarizeEntityForTarget()` as the canonical read contract for headline memory, archive-only hinting, and source-summary totals instead of letting UI layers infer those fields independently.

Why this first:

- it is a real cross-module chain already present in the product;
- the user should remember "that gift/order" as one memory, not as a Shopping memory plus a second Calendar memory;
- Contacts detail and World Hub source audit already have the right surfaces to explain the merged result.
