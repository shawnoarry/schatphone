# Contacts & Relationship System V2 Requirements

Updated: 2026-05-18

Audience: product managers, designers, engineers, QA, and future AI assistants.

## 1. Purpose

This document freezes the product requirement for the next major upgrade of Contacts and the relationship-memory system.

It exists to make four high-risk user actions unambiguous before implementation:

1. deleting a role profile;
2. resetting one role relationship while keeping the role profile;
3. deleting one memory group and its linked records;
4. upgrading Contacts from a simple archive list into a role-centric hub.

If any older note conflicts with this document, use this file as the current product requirement for Contacts/relationship-management behavior.

## 2. Product Naming And Scope

This requirement uses the current project naming rules from `docs/pm/MODULE_NAME_GLOSSARY.md`.

Important split:

- `Contacts / 通讯录` means the main Home-visible global role archive.
- `Chat Directory / 会话通讯录` means the Chat-side contact/binding surface for deciding who can become a chat object inside Chat.

They are not the same thing.

Product meaning:

- a role may exist in `Contacts / 通讯录` without becoming a Chat conversation target;
- some roles may remain active only in Phone, Map, Calendar, Reminders, Shopping, Food Delivery, Wallet, or event-driven life loops;
- `Contacts / 通讯录` owns the global role profile and role-centered management actions;
- `Chat Directory / 会话通讯录` owns Chat-side binding and thread entry only.

## 3. Core Concepts

### 3.1 Role Profile / 角色档案

The persistent role identity record.

Examples:

- role ID;
- name;
- avatar and visual bindings;
- profile introduction;
- preferences;
- life pattern;
- social-network definition;
- manually authored descriptive fields.

This is the "person still exists" layer.

### 3.2 Relationship Progress / 关系进度

The current run of user-to-role progress.

Examples:

- affinity/trust/intimacy/tension/dependency;
- relationship stage;
- milestones;
- growth traits;
- prompt-usable continuity state.

This is the "how far this route has progressed" layer.

### 3.3 Memory Group / 记忆组

One shared life event remembered by the system.

A memory group is not only one summary line. It includes:

- one primary memory meaning;
- zero or more supporting facts;
- linked structured records in other modules.

### 3.4 Structured Source Record / 结构化源记录

The original module-owned record that may feed a memory group.

Examples:

- Calendar confirmed event;
- Phone call log;
- Wallet transfer or expense;
- Shopping gift order;
- Food Delivery shared-meal order;
- Map shared route or trip.

### 3.5 Manual Entry vs Event-Attached Entry / 手动条目 vs 事件挂载条目

Future Contacts detail sections such as preferences, life pattern, and social graph may contain two kinds of information:

- `manual`: authored directly by the user;
- `event-attached`: derived or attached from events and related module development.

Rules:

- the UI must distinguish them clearly;
- the user must be able to understand which data came from direct input and which came from later event development;
- destructive actions must explain when event-attached entries will also be removed.

## 4. Role ID Requirement

Each role profile must have a visible role ID.

### 4.1 Format

- primary format: numeric;
- allowed extension: numeric plus letters;
- arbitrary free-form strings are not allowed.

Reason:

- avoid unreadable text or garbled identifiers;
- keep role IDs visually understandable;
- support later packaging into a phone-like identity metaphor such as a contact number or account number.

### 4.2 Product Behavior

- the role ID is visible in the role detail page;
- the role ID can be entered manually when the user creates or edits a role profile;
- if the entered role ID already exists, the system must block or interrupt save and show a clear duplicate warning;
- the role ID should be displayed in a phone-like, user-readable way rather than as a raw backend key.

## 5. Requirement A: Delete Role Profile

### 5.1 User Goal

The user no longer wants this role to exist in the current virtual-phone world.

### 5.2 Entry

Recommended path:

- `Contacts / 通讯录`
- open role detail page
- `Danger zone / 危险操作`
- `Delete role / 删除角色`

### 5.3 Product Decision

Deletion uses one unified flow with explicit options, not several disconnected delete entries.

The flow must remain understandable and not ambiguous.

### 5.4 Required Flow

The delete flow must support at least:

1. base delete of role profile and role-owned continuity;
2. optional checkbox to also remove cross-module linked records.

This is one flow, but the destructive scope must be made visible before confirmation.

### 5.5 Required Confirmation Design

Because this action is irreversible, it must use multiple confirmations.

Minimum requirement:

1. first confirmation: explain that this is irreversible;
2. second confirmation: show exactly which categories will be removed;
3. final typed confirmation: user must input a confirm string such as role name or role ID.

The system must not make this action look like a lightweight list delete.

### 5.6 What Must Always Be Deleted

Deleting a role profile must always delete:

1. the role profile itself;
2. the role's Contacts entry;
3. the role's relationship progress;
4. the role's memory groups;
5. the role's Chat-side bindings;
6. the role's chat conversations and messages.

### 5.7 Optional Checkbox Scope

The same delete flow must include a user-readable option such as:

- `Also delete linked cross-module records / 同时删除关联的跨模块记录`

When checked, the system also deletes linked structured source records, including when present:

- Calendar;
- Reminders;
- Phone;
- Wallet;
- Shopping;
- Food Delivery;
- Map;
- other future event-owned linked records.

### 5.8 Asset Rule

Deleting a role does not directly delete visual assets from Photos.

Required behavior:

1. unbind the role from its related assets;
2. keep the assets themselves;
3. show a follow-up explanation that visual assets can be deleted manually from `Photos / 相册` if the user also wants them gone.

This is intentional. Asset deletion should stay explicit and module-owned.

### 5.9 Acceptance

After base delete:

- the role no longer appears in Contacts;
- the role no longer appears in Chat Directory role bindings;
- the role's chat thread and messages no longer exist;
- the role no longer has relationship progress or memory summaries in Contacts, Chat, or World Hub.

After base delete plus linked-record delete:

- the role's linked records also disappear from their owning modules;
- the confirmation text must have told the user which linked categories would be removed.

## 6. Requirement B: Reset Relationship

### 6.1 User Goal

The user wants to keep the person, but restart the route from zero.

This is for "re-contact", "re-raise", or "re-run the route" behavior.

### 6.2 Entry

Recommended path:

- `Contacts / 通讯录`
- open role detail page
- `Danger zone / 危险操作`
- `Reset relationship / 重置关系`

### 6.3 What Must Be Preserved

Reset relationship keeps the role profile.

Preserved fields include:

- role ID;
- name;
- avatar and visual bindings;
- profile introduction;
- preferences;
- life pattern;
- social-network definition;
- manually authored role details.

### 6.4 What Must Be Cleared

Reset relationship clears:

1. relationship metrics and relationship stage;
2. milestones and growth traits;
3. all memory groups for this role;
4. all linked relationship facts;
5. all chat conversations and messages for this role;
6. all linked relationship-type structured event records for this role.

Examples:

- planned or completed date-style records;
- role-linked call logs;
- role-linked Wallet records;
- role-linked Shopping gift facts;
- role-linked Food Delivery shared-meal facts;
- role-linked Map shared-route facts.

### 6.5 Event-Attached Detail Cleanup

Reset relationship must also clear event-attached detail entries that were derived into Contacts sections.

Examples:

- event-derived preference hints;
- event-derived life-pattern hints;
- event-derived social-network notes.

Manual entries remain.

### 6.6 UI Clarity Rule

Contacts must visually distinguish:

- manual entries;
- event-attached entries.

So when the user resets relationship, the confirmation can clearly say what will be removed.

### 6.7 Acceptance

After reset relationship:

- the role still exists in Contacts;
- the role still keeps static profile fields;
- relationship progress returns to initial state;
- memory list is empty;
- event-attached details tied to relationship development are removed;
- chat history for that role is empty;
- future chat starts from a fresh route without old continuity.

## 7. Requirement C: Delete One Memory Group

### 7.1 User Goal

The user wants to keep the role and most of the relationship history, but remove one specific event.

### 7.2 Entry

Recommended path:

- `Contacts / 通讯录`
- role detail page
- `Memories / 记忆`
- memory detail
- `Delete memory / 删除记忆`

### 7.3 Delete Unit

The delete unit is one full memory group.

It must not be only a display summary line.

Deleting one memory group removes:

- the primary memory;
- supporting facts under that memory;
- the linked structured records that belong directly to that memory.

### 7.4 Chat Rule

Normal free-text chat messages are not automatically deleted by memory deletion.

Product explanation must tell the user:

- this action deletes the structured memory and linked records;
- if the user also wants to remove ordinary conversation text, they should delete it manually in `Chat / 聊天`.

This is a deliberate product boundary.

### 7.5 Required Delete Result

Deleting one memory group must:

1. remove the memory from Contacts detail;
2. remove its related relationship facts;
3. remove its influence from relationship progress by recompute or equivalent rollback;
4. remove linked structured records owned by source modules;
5. remove event-attached detail entries that were derived from that memory.

### 7.6 Required Confirmation Copy

Before delete, the system must show a readable impact list.

Example:

- this will also remove:
  - 1 Calendar event
  - 1 Wallet ledger item
  - 1 Shopping gift record
  - 2 event-attached life-pattern hints

The user must understand what "memory delete" really means.

### 7.7 Acceptance

After delete:

- the memory group no longer appears in Contacts;
- Chat prompt context no longer includes that memory;
- World Hub and relationship runtime no longer surface it;
- directly linked structured source records are gone;
- remaining relationship state is recalculated from surviving memory groups.

## 8. Requirement D: Contacts V2 Upgrade

### 8.1 Product Positioning

`Contacts / 通讯录` should become the role-centered hub, not just a simple list of lightweight profile cards.

It should become the main user-facing place to:

- create role profiles;
- review role details;
- understand relationship continuity;
- manage destructive actions safely;
- inspect what came from manual input and what came from events.

### 8.2 Top-Level Boundary

Contacts owns:

- global role profile archive;
- role detail display;
- relationship reset/delete actions;
- memory review and memory deletion;
- role-centered overview of linked continuity.

Chat Directory owns:

- whether the role becomes a chat target;
- chat-specific bindings and thread-side management;
- service/public account management.

### 8.3 Required Role Detail Sections

Each role should have its own detail page.

Minimum required sections:

1. `Profile / 人物简介`
2. `Preferences / 喜好`
3. `Life Pattern / 生活规律`
4. `Memories / 记忆`
5. `Social Graph / 人物关系网`

### 8.4 Profile / 人物简介

Must support:

- role ID;
- name;
- avatar;
- basic introduction;
- identity summary;
- current relationship snapshot.

### 8.5 Preferences / 喜好

Must support:

- manual user-authored preference entries as primary flow;
- later event-attached hints as secondary support;
- clear distinction between manual and event-attached items.

Future-compatible examples:

- favorite foods;
- gift preference;
- preferred daily activities;
- taboo/dislike hints.

### 8.6 Life Pattern / 生活规律

Must support:

- manual user-authored entries;
- event-attached time-based or behavior-based hints later;
- relation to time or schedule context.

Examples:

- active time;
- common routine window;
- sleep/wake tendency;
- recurring habit notes.

### 8.7 Memories / 记忆

Must support:

- memory-group list;
- memory detail view;
- source-module visibility;
- delete-one-memory-group action.

### 8.8 Social Graph / 人物关系网

Must support:

- manual user-authored relationship definitions as primary flow;
- event-attached social hints later;
- user-readable distinction between manual and event-attached items.

### 8.9 Entry-Level Management Actions

Role detail should also expose:

- chat entry when available;
- reset relationship;
- delete role;
- role asset bindings;
- linked continuity overview.

## 9. UI Clarity Rules

### 9.1 Dangerous Action Rules

Deleting role, deleting memory, and resetting relationship are all destructive operations.

Rules:

- use shared in-app dialog flows, not lightweight inline actions only;
- use multiple confirmations for irreversible actions;
- show clear impact scope in plain language;
- do not hide the scope behind technical IDs only.

### 9.2 Manual vs Event-Attached Distinction

For preferences, life pattern, social graph, and future similar sections:

- manual entries and event-attached entries must be visually distinct;
- labels or chips should help the user identify source type;
- destructive confirmations must name both kinds when both are affected.

Example source labels:

- `Manual / 手动录入`
- `Event-derived / 事件挂载`

## 10. Ownership Rules

Core product rule:

- Contacts owns role-centered review and management.
- Source modules still own their original structured data.

Meaning:

- Contacts may trigger delete/reset flows;
- but Calendar, Wallet, Shopping, Food Delivery, Map, Phone, and other modules still own the underlying record models;
- those modules must expose callable delete/reset seams for role-linked and memory-linked cleanup.

This keeps Contacts as the management hub without collapsing all module ownership into one store.

## 11. Data And Behavior Constraints

### 11.1 No Free-Form ID Strings

Role ID must not allow arbitrary strings because of readability and text-safety concerns.

### 11.2 No Silent Asset Deletion

Role delete/reset does not silently remove Photos assets.

### 11.3 No Semantic Chat Purge In V1

Deleting one memory does not attempt to find and erase every free-text mention across Chat.

### 11.4 Reset Must Remove Event-Attached Derived Entries

If a preference, life-pattern hint, or social-graph note exists only because of deleted or reset relationship events, it must be removed together with the underlying continuity cleanup.

## 12. Acceptance Summary

This requirement is considered implemented only when all of the following are true:

1. Contacts and Chat Directory boundaries are explicit in product behavior.
2. A role profile can be deleted through one safe multi-confirm flow.
3. The delete-role flow can optionally include linked cross-module record deletion.
4. A role relationship can be reset while preserving static role profile information.
5. A single memory group can be deleted as one unit, including its linked structured records.
6. Contacts detail can distinguish manual entries from event-attached entries.
7. Event-attached derived entries are cleaned correctly during reset and memory delete.
8. Role ID is visible, user-editable, duplicate-checked, and restricted to numeric or numeric-plus-letter format.
9. Users are clearly told when chat free text requires separate deletion inside Chat.

## 13. Recommended Implementation Order

### Phase 1

1. role ID schema and duplicate validation
2. Contacts vs Chat Directory boundary cleanup in product copy and navigation
3. role delete flow
4. relationship reset flow

### Phase 2

1. memory-group management model
2. single memory-group delete
3. relationship recompute path

### Phase 3

1. Contacts detail-page redesign
2. preferences / life pattern / social graph sections
3. manual vs event-attached visual distinction

## 14. Related Documents

- `docs/pm/MODULE_NAME_GLOSSARY.md`
- `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
- `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_IMPLEMENTATION_BREAKDOWN.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/strategy/PROJECT_ITERATION_PLAN.md`
