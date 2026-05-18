# Contacts & Relationship System V2 Implementation Breakdown

Updated: 2026-05-18

Audience: product managers, engineers, QA, and future AI assistants.

This document breaks the frozen requirement in `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_REQUIREMENTS.md` into three execution-ready workstreams:

1. data-structure refactor;
2. delete/reset/memory-removal interfaces;
3. Contacts detail information architecture and UI upgrade.

This is not the live roadmap. It is the implementation breakdown that should be used when turning the requirement into code tasks.

## 1. Workstream Map

### A. Data Structure Refactor / 数据结构改造

Goal:

- make role identity, relationship progress, memory groups, and module-owned source records separable and addressable;
- support role deletion, relationship reset, and single memory-group deletion without hidden ambiguity.

Primary code areas:

- `src/stores/chat.js`
- `src/stores/relationshipRuntime.js`
- `src/lib/relationship-fact-adapters.js`
- module stores that own structured source records:
  - `src/stores/calendar.js`
  - `src/stores/phone.js`
  - `src/stores/wallet.js`
  - `src/stores/shopping.js`
  - `src/stores/foodDelivery.js`
  - `src/stores/map.js`
- backup and restore paths:
  - `src/views/SettingsView.vue`

### B. Delete/Reset Interfaces / 删除与重置接口

Goal:

- expose one safe destructive-action layer that can:
  - delete a role;
  - optionally delete linked cross-module records;
  - reset one role relationship;
  - delete one memory group.

Primary code areas:

- `src/views/ContactsView.vue`
- `src/stores/chat.js`
- `src/stores/relationshipRuntime.js`
- module stores and adapters that need cleanup seams
- shared dialog path and confirmation-copy generation

### C. Contacts Detail IA Upgrade / 通讯录详情 IA 升级

Goal:

- turn Contacts from a simple archive list into a role-centered hub;
- expose clear separation between static profile, relationship progress, memory, and event-attached details.

Primary code areas:

- `src/views/ContactsView.vue`
- future extracted components under `src/components/contacts/`
- supporting selectors/helpers in `src/lib/`

## 2. Workstream A: Data Structure Refactor

### A1. Introduce Visible Role ID Schema

Objective:

- make role identity stable and user-visible.

Tasks:

1. Add `roleId` to role profile shape in `src/stores/chat.js`.
2. Keep `id` as internal numeric profile key for current code compatibility unless a larger migration is justified later.
3. Add role-ID normalization rule:
   - numeric only is valid;
   - numeric + letters is valid;
   - any other characters are rejected.
4. Add duplicate detection on create/edit.
5. Add restore/backward-compat migration for old profiles with no `roleId`.

Suggested implementation rule:

- if old data has no `roleId`, auto-seed one from profile numeric id or a deterministic fallback.

Tests:

- role create with valid numeric role ID;
- role create with valid numeric+letter role ID;
- invalid characters rejected;
- duplicate role ID rejected;
- old backup restored with seeded role IDs.

Done when:

- every role profile has a stable visible `roleId`;
- save/restore paths preserve it;
- UI can display it safely.

### A2. Separate Static Role Profile From Relationship Progress

Objective:

- make "person exists" and "current route progress" two different layers.

Current issue:

- Chat store still carries some relationship-looking fields on contacts such as `relationshipLevel` and `relationshipNote`;
- relationship runtime carries another truth layer.

Tasks:

1. Audit which fields in `src/stores/chat.js` are:
   - static profile fields;
   - Chat-binding fields;
   - relationship-progress fields.
2. Freeze the ownership rule:
   - static role profile stays in `chat.js` roleProfiles;
   - Chat-side binding stays in `chat.js` contacts/conversations;
   - relationship progress stays in `relationshipRuntime.js`.
3. Decide whether `relationshipLevel` and `relationshipNote` remain:
   - as Chat-only compatibility fields;
   - or are redefined as non-runtime manual notes.
4. Document any compatibility layer so later UI does not read mixed truth sources.

Tests:

- Contacts and Chat snapshots read from the intended source;
- deleting/resetting relationship does not accidentally delete static profile fields.

Done when:

- engineers can point to one owner for identity, one owner for Chat binding, and one owner for relationship progress.

### A3. Add Memory Group As First-Class Runtime Concept

Objective:

- make single-memory deletion feasible and explainable.

Current issue:

- relationship runtime already has `memoryKey` and aggregate summaries;
- but there is no first-class delete/manage API at memory-group level.

Tasks:

1. Extend `src/stores/relationshipRuntime.js` with explicit memory-group operations:
   - list memory groups by target;
   - get one memory group detail;
   - remove one memory group;
   - recompute entity snapshot after memory-group removal.
2. Preserve the current `primary` vs `supporting` distinction.
3. Ensure one memory-group delete removes:
   - aggregate visibility;
   - underlying relationship events belonging to that memory key and target.
4. Add memory-group impact summary builder for confirmation UI.

Tests:

- one memory group with one primary fact;
- one memory group with multiple supporting facts;
- deleting one memory group removes only that group;
- remaining memory groups still compute correctly.

Done when:

- the runtime can manage one memory group as a unit instead of only showing aggregate summaries.

### A4. Add Source-Record Cleanup Metadata

Objective:

- allow Contacts to ask source modules to clean up linked records safely.

Current issue:

- relationship facts know `sourceModule`, `sourceId`, `memoryKey`;
- but source-record cleanup contracts are not yet formalized.

Tasks:

1. Standardize linked cleanup metadata on relationship facts:
   - `sourceModule`
   - `sourceId`
   - `entityKey`
   - `memoryKey`
2. Add helper rules in `src/lib/relationship-fact-adapters.js` so module facts carry enough cleanup information.
3. Audit current adapters:
   - Shopping gift
   - Food Delivery shared meal
   - Wallet order support
   - Wallet shared transfer
   - Phone call
   - Map shared route
   - Calendar confirmed event
4. Ensure each adapter's `sourceId` maps back to one module-owned record or one explicit cleanup path.

Tests:

- every current adapter fact can be traced back to an owning source record;
- no cleanup path depends on parsing summary text.

Done when:

- one memory group can tell the system which module-owned records are directly attached to it.

### A5. Add Manual vs Event-Attached Detail Data Shape

Objective:

- prepare Contacts detail sections for mixed-origin data.

Tasks:

1. Define a reusable item shape for future sections like preferences, life pattern, social graph:
   - `id`
   - `type` or `section`
   - `sourceKind`: `manual` or `event_attached`
   - `label`
   - `detail`
   - `linkedMemoryKey` or `linkedSourceRef` when event-attached
   - timestamps
2. Decide whether to store these in:
   - role profile nested arrays;
   - a dedicated contacts-detail helper structure;
   - or another role-centered store slice.
3. Require event-attached items to be removable by:
   - relationship reset;
   - memory-group delete;
   - role delete.

Tests:

- manual items survive relationship reset;
- event-attached items do not;
- deleting one memory group removes only event-attached items tied to it.

Done when:

- the data model can represent "user wrote this" and "the system learned this from events" separately.

### A6. Backup, Restore, and Migration Coverage

Objective:

- ensure the new model survives import/export.

Tasks:

1. Extend backup snapshot structure in `SettingsView.vue`.
2. Add restore compatibility for older payloads.
3. Define rollback behavior if one part of Contacts/relationship restore fails.
4. Update any storage diagnostics labels if needed.

Tests:

- export/import with role IDs;
- export/import with memory groups;
- export/import with mixed manual and event-attached detail items;
- rollback still works on malformed input.

Done when:

- no new Contacts/relationship structure breaks backup or restore.

## 3. Workstream B: Delete/Reset Interfaces

### B1. Role Delete Orchestrator

Objective:

- create one authoritative delete-role flow.

Tasks:

1. Add a delete-role orchestrator seam, likely centered in Contacts orchestration but calling:
   - `chat.js` for role profile/chat binding/chat history removal;
   - `relationshipRuntime.js` for relationship-state removal;
   - module cleanup APIs for linked structured records when checkbox is on.
2. Support one flow with:
   - base delete;
   - optional checkbox for linked cross-module delete.
3. Build user-readable impact summary before final confirmation.

Required output summary examples:

- role profile
- chat thread count
- memory group count
- linked module record counts by module

Done when:

- one user action can consistently remove the role and all selected linked scope.

### B2. Multi-Step Confirmation Layer

Objective:

- prevent accidental destructive actions.

Tasks:

1. Reuse shared in-app dialog path already used in views.
2. For role delete:
   - confirmation 1: irreversible warning;
   - confirmation 2: scope summary;
   - confirmation 3: typed confirmation.
3. For relationship reset:
   - confirmation 1: what stays vs what clears;
   - confirmation 2: typed or explicit final confirm.
4. For memory-group delete:
   - confirmation 1: scope summary;
   - confirmation 2: final confirm.

Done when:

- no destructive path is a single-click action.

### B3. Relationship Reset Orchestrator

Objective:

- clear route progress without deleting the person.

Tasks:

1. Add one reset API that accepts a role target.
2. Remove:
   - runtime relationship entity state;
   - runtime events and memory groups for that target;
   - chat conversation and messages for that role;
   - linked relationship-type source records;
   - event-attached detail items.
3. Preserve:
   - static role profile fields;
   - manual detail items;
   - role ID and visual bindings.
4. Build reset summary text so the user sees exactly what will be cleared.

Tests:

- reset keeps static profile;
- reset clears runtime continuity;
- reset clears role chat history;
- reset clears event-attached items but not manual ones.

Done when:

- the role remains in Contacts but behaves like a fresh route.

### B4. Single Memory-Group Delete Orchestrator

Objective:

- delete one event-history unit cleanly.

Tasks:

1. Add API to delete one memory group by:
   - target;
   - memory key.
2. Remove linked relationship facts in runtime.
3. Ask source modules to remove directly attached structured records.
4. Recompute resulting relationship state.
5. Remove event-attached detail items linked to that memory.
6. Do not delete normal free-text Chat content.
7. Return a user-readable "go to Chat if you also want to delete conversation text" hint.

Tests:

- deleting one memory group leaves other groups intact;
- deleting memory updates Contacts summary and prompt context;
- Chat raw messages remain untouched.

Done when:

- "delete memory" behaves like removing one whole event group, not only hiding one line.

### B5. Module Cleanup Seams

Objective:

- let Contacts trigger source-record deletion without taking over module ownership.

Tasks by module:

1. Calendar:
   - delete event by linked relationship source or event ID;
   - if needed handle linked reminder ownership carefully.
2. Phone:
   - delete call log by source ID.
3. Wallet:
   - delete transaction by source ID.
4. Shopping:
   - delete or neutralize relationship-linked gift/order record as defined by product.
5. Food Delivery:
   - delete shared-meal-linked record as defined by product.
6. Map:
   - delete shared-route/trip-linked continuity record as defined by product.

Important rule:

- Contacts calls these seams;
- module stores remain the source-of-truth owners.

Done when:

- role delete, relationship reset, and memory-group delete all have callable module cleanup paths.

### B6. Runtime and Prompt Consistency After Cleanup

Objective:

- avoid stale memory or relationship text appearing after destructive operations.

Tasks:

1. Ensure `relationshipRuntimeStore.buildPromptContextForTarget(...)` reflects cleanup immediately.
2. Ensure Contacts summary updates immediately.
3. Ensure World Hub review no longer shows deleted role/memory data.

Tests:

- delete role then inspect Contacts / Chat / World Hub;
- reset relationship then inspect Contacts / Chat prompt context;
- delete memory then inspect Contacts / Chat prompt context / World Hub.

Done when:

- no stale deleted continuity still shows up in the front end.

## 4. Workstream C: Contacts Detail IA Upgrade

### C1. Split Contacts Into List Surface And Detail Surface

Objective:

- stop overloading the list view with summary-only cards.

Tasks:

1. Keep `Contacts / 通讯录` list as archive/index page.
2. Add role detail subpage or detail panel as the real role-centered management surface.
3. Reduce list-page responsibility to:
   - browse roles;
   - search/filter;
   - open detail;
   - create role.

Done when:

- destructive actions and deep role sections live in role detail, not only in row-level actions.

### C2. Role Detail IA

Objective:

- define the section order and meaning.

Required sections:

1. `Profile / 人物简介`
2. `Preferences / 喜好`
3. `Life Pattern / 生活规律`
4. `Memories / 记忆`
5. `Social Graph / 人物关系网`
6. `Danger Zone / 危险操作`

Suggested section responsibilities:

- Profile:
  - role ID
  - avatar
  - intro
  - identity tags
  - relationship snapshot
- Preferences:
  - manual items first
  - event-attached hints second
- Life Pattern:
  - time/routine related info
- Memories:
  - memory groups
  - source module chips
  - delete action
- Social Graph:
  - role-to-role or role-to-user relation definitions
- Danger Zone:
  - reset relationship
  - delete role

Done when:

- each section has a single clear semantic job.

### C3. Manual vs Event-Attached Visual Language

Objective:

- make source type visible.

Tasks:

1. Create a shared badge/chip language for:
   - manual
   - event-attached
2. Reuse across preferences, life pattern, and social graph sections.
3. Ensure destructive dialogs reuse the same terms.

Done when:

- users can tell at a glance what they authored vs what emerged from events.

### C4. Role ID Presentation

Objective:

- make role ID visible without feeling like backend debug text.

Tasks:

1. Choose one phone-like presentation:
   - contact number
   - profile number
   - account number
2. Allow edit in create/edit flow.
3. Show duplicate warning near save.

Done when:

- role ID is understandable and product-facing.

### C5. Memory Section Behavior

Objective:

- make memory management a first-class feature.

Tasks:

1. Show memory group list with:
   - summary;
   - date;
   - source modules;
   - maybe supporting count.
2. Let users open one memory detail.
3. Let users delete one memory group from there.
4. Show impact preview before deletion.
5. Show hint that free-text chat is managed separately in Chat.

Done when:

- Contacts becomes the natural place to inspect and prune one shared memory.

### C6. Danger Zone UX

Objective:

- avoid mixing destructive actions with ordinary edit actions.

Tasks:

1. Move reset/delete actions out of ordinary list rows and basic edit form areas.
2. Put them in a dedicated danger section inside role detail.
3. Make:
   - reset relationship clearly distinct from delete role;
   - linked-record delete option visible only inside the delete-role flow.

Done when:

- users are less likely to confuse "reboot the route" with "erase the person."

### C7. Navigation And Boundary Copy

Objective:

- make Contacts vs Chat Directory understandable in the UI.

Tasks:

1. In Contacts:
   - describe it as role archive / role hub.
2. In Chat Directory:
   - describe it as who can enter Chat.
3. Add lightweight helper copy so users understand a role may exist without having a Chat thread.

Done when:

- the two modules no longer feel like duplicates.

## 5. Suggested File-Level Execution Map

### Store Layer

- `src/stores/chat.js`
  - role ID
  - static profile cleanup
  - chat-thread cleanup
- `src/stores/relationshipRuntime.js`
  - memory-group delete APIs
  - role-level reset/delete APIs
  - recompute helpers
- module stores:
  - cleanup seams by source record

### View Layer

- `src/views/ContactsView.vue`
  - list/detail split
  - danger zone
  - role ID input/display
  - memory detail/delete UI
  - manual vs event-attached distinction

### Helper Layer

- `src/lib/relationship-fact-adapters.js`
  - cleanup-traceable source metadata
- likely new helpers under `src/lib/contacts-*`
  - role ID validation
  - delete/reset impact summary building
  - detail item normalization

### Tests

- role ID validation tests
- role delete integration tests
- relationship reset integration tests
- memory-group delete integration tests
- Contacts detail rendering tests
- backup/restore migration tests

## 6. Recommended Implementation Sequence

### Sequence 1: Foundation

1. role ID schema
2. relationship/runtime ownership cleanup
3. memory-group APIs
4. module cleanup seams

### Sequence 2: Destructive Actions

1. role delete orchestrator
2. relationship reset orchestrator
3. memory-group delete orchestrator
4. confirmation flows

### Sequence 3: Contacts UI

1. list/detail split
2. role detail sections
3. memory management UI
4. manual vs event-attached visual language
5. danger zone polish

## 7. Completion Definition

This breakdown is complete when future implementation work can be taken from here and turned directly into:

- roadmap tasks;
- engineering slices;
- test plans;
- UI tickets.

Related frozen requirement:

- `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_REQUIREMENTS.md`
