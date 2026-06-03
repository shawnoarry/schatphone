# Contacts Relationship V2 Implementation Workstreams / 通讯录关系系统 V2 实施工作流

Updated: 2026-06-02

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
7. keep profile-side relationship premise/classification fields on role profiles, separate from relationship runtime current values.
8. keep the AI classification seam limited to `src/lib/ai.js`, shared JSON parsing, registry normalization, and confidence/save-policy output.
9. keep Contacts relationship classification controls as profile-side editing only: runtime snapshot is read first, while event judgement remains outside Contacts.
10. allow Contacts to read/display Chat social-channel snapshots only; do not let Contacts decide or apply friend/block/refusal social events.

Semantic traps to avoid:

- showing `profileId` or `entityKey` as if they were `roleId`;
- reading Chat-side compatibility fields as the live relationship truth;
- reading raw relationship premise prose as an event condition instead of stored classification fields;
- allowing AI, confirmed AI, or world-template writes to silently overwrite a `user_edited` classification;
- treating Chat social-channel state as relationship truth or as a Contacts-authored event outcome;
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
- runtime memory-count totals are computed before applying the display-list cap, so summary callers can request a short list without losing full `totalMemoryCount`, `visibleMemoryCount`, or `archivedMemoryCount`.
- linked-activity source totals now dedupe runtime source refs against event-attached detail refs before counting, preventing one shared event from appearing as several source records.
- relationship classification Round 3 adds the role-control relationship surface: Contacts detail shows the current runtime snapshot first, then edits the profile-side relationship premise, seed values, category, modifier tags, classification audit, AI classify, confirmation, and manual save flows.
- Contacts Role Hub summary now includes a read-only Chat social-channel snapshot so users can understand communication reachability without editing Chat state from Contacts.
- Contacts World profile fields now support V1 concrete value authoring from WorldBook templates: choose a current-world template, fill role/self/NPC values, set visibility levels, and save `templateLink/profileValues` on the role profile.
- Contacts World profile fields now include AI draft assistance for empty editor fields only; the AI helper normalizes provider JSON against the chosen template and never saves or overwrites manual values without the user's Save action.
- Contacts World profile fields now include a current-world adaptation review for profiles using missing, outdated, or other-world templates. The review recommends a current-world template, shows reusable/custom-preserved counts, and can open the editor with AI-migrated draft values without saving.
- The WorldBook -> Contacts value-flow now has committed E2E coverage, so future work should not rebuild the basic handoff/value chain unless the product flow changes.
- Contacts first entry now feels like a phone contact list: Search -> My Profile -> Recent interactions -> Main Roles -> NPC / World Roles. Recent interactions is a shortcut layer and keeps full list membership intact.

Main tasks:

1. deepen role detail page sections and hierarchy below the Role Hub summary;
2. readable role ID presentation;
3. richer memory list and memory detail behavior;
4. after this completed baseline, move deeper memory dedupe/merge and recall rules into Workstream 4.2 instead of extending 4.1 further;
5. richer Chat-bound state and navigation hints;
6. danger-zone isolation and confirmation copy;
7. continue from the landed richer field widgets, template-change review, AI-assisted draft completion, and Contacts-side template adaptation by first turning adaptation review into a user-readable visual diff, then improving true template editing and eventual form-builder-quality WorldBook authoring.
8. later true-device polish for Contacts touch feel and detail-panel progressive disclosure.

Semantic traps to avoid:

- blending normal edit actions with destructive actions;
- making event-attached items look like user-authored facts;
- hiding the Contacts vs Chat Directory distinction.
- making the editable relationship premise look like authoritative current runtime metrics or event eligibility.
- making a friend/block/refusal status display look like Contacts is judging the social event.

## 4. Workstream D: Documentation And Collaboration Guardrails

Objective:

- keep future engineers from reintroducing old semantics.

Main tasks:

1. keep this package updated when semantics change;
2. sync architecture docs when ownership changes;
3. sync PM status and roadmap when priority/status changes;
4. keep module naming aligned with `docs/pm/MODULE_NAME_GLOSSARY.md`;
5. keep workflow instructions aligned with `docs/process/AI_WORK_MODE.md` and the local workflow skill.
6. when relationship classification changes, sync the profile-owner vs runtime-owner boundary in README, status, product boundary, workstreams, roadmap, PM status, and relationship-growth architecture docs.

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

## 7. 4.2 Closure Baseline

Current 4.2 baseline:

1. start by tightening same-life-event memory-key reuse in the runtime and adapter layer before changing Contacts or Chat presentation again;
2. preserve source-record auditability and cleanup coverage while reducing duplicate top-level memories;
3. treat Shopping gift memory plus downstream Calendar delivery follow-up as the first canonical merge case.
4. keep review ordering and memory visibility behavior aligned between runtime, Contacts, and World Hub.
5. keep `summarizeEntityForTarget()` as the canonical read contract for headline memory, archive-only hinting, and source-summary totals instead of letting UI layers infer those fields independently.
6. treat Map shared-route memory plus downstream Map-derived Calendar follow-up as the second explicit-lineage merge case when `sourceTripId` is present.
7. treat Wallet order-support facts for Shopping gifts and Food Delivery shared meals as supporting-only facts inside the upstream order memory, not as new relationship-growth memories.
8. use primary-led memory recall summaries in Chat, Contacts, and World Hub so supporting facts do not replace the original life-event headline.
9. show Calendar relationship review detail for confirmed events so users can see lineage, target, memory role, and duplicate-growth status.
10. Contacts and World Hub use product-facing related-record copy by default, while Calendar keeps source-audit review detail for confirmed-event relationship checks.
11. 4.2 is `DONE` for current explicit-lineage acceptance; future fuzzy same-text merging should start from a separate product decision.
12. runtime memory-count totals are full target-state counts, not capped by `memoryLimit`.
13. fuzzy same-text merging remains out of scope until a separate product decision promotes it.

Why this first:

- it is a real cross-module chain already present in the product;
- the user should remember "that gift/order" as one memory, not as a Shopping memory plus a second Calendar memory;
- Contacts detail and World Hub source audit already have the right surfaces to explain the merged result.
