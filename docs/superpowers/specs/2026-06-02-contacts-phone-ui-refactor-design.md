# Contacts Phone UI Refactor Design

Date: 2026-06-02

Status: `PENDING_USER_REVIEW`

## Goal

Make `通讯录 / Contacts` feel like a real phone Contacts app when the user first enters it, while keeping its deeper role-hub power available after the user opens a person.

User-facing outcome:

1. The first screen is for finding people, not managing backend-like profile modules.
2. `我的档案 / My Profile` appears directly below search.
3. `最近互动 / Recent interactions` is a horizontal avatar shortcut row below My Profile.
4. `主角色 / Main Roles` and `NPC / 世界角色` remain complete contact-list sections.
5. World fields, memories, relationship snapshots, Chat binding, and danger actions move into the selected contact detail flow.

This keeps the current product boundary: Contacts owns role profiles and concrete profile values; WorldBook owns reusable field templates; Chat Directory owns chat-side binding; relationship runtime owns current relationship truth and memories.

## Confirmed Direction

The selected direction is the "real phone Contacts" layout, not a management-console layout.

Confirmed first-screen order:

1. Title and add action.
2. Search.
3. My Profile.
4. Recent interactions as a horizontal avatar shortcut row.
5. Main Roles.
6. NPC / World Roles.

Important rule:

`最近互动 / Recent interactions` is a shortcut layer, not a category. A role or NPC shown there still appears in its normal full list below. It can mix Main Roles and NPCs, but it should not include My Profile because My Profile is not a contact target.

## Current IA Diagnosis

Current Contacts has useful behavior, but the first impression is too close to a role-management dashboard:

- the list page exposes boundary copy and profile-management framing before it feels like a native contact list;
- the selected contact detail can become a long stack of role hub, relationship, activity, world fields, preferences, memories, and destructive actions;
- powerful sections are useful but compete too early with the simple user intent: "find a person";
- phone screens need a stronger L0 -> L1 -> L2 split so the user is not forced to parse every management area at once.

The refactor should not delete these functions. It should change when they appear.

## Target Information Architecture

### L0: Contacts List

User question: "Who is in my contacts?"

Visible content:

- Search.
- My Profile card.
- Recent interaction avatars.
- Complete grouped contact lists.

Allowed actions:

- create a profile;
- search;
- tap a contact;
- tap a recent avatar shortcut.

Not allowed on L0:

- relationship reset;
- role delete;
- memory deletion;
- full world-field editing;
- long boundary explanations;
- source-audit or event-attached management.

### L1: Contact Detail

User question: "Who is this person, and what can I do with them?"

The detail page should read like a person profile first:

1. profile hero: avatar, display name, role ID, entity type;
2. quick actions: enter Chat when bound, bind in Chat Directory when eligible, edit profile;
3. compact role status: Chat state, relationship stage snapshot, memory count, world-field count;
4. task sections: World fields, relationship, memories, manual details, linked activity;
5. danger zone isolated at the bottom.

On phone, a task section should open as a focused sheet or sub-panel rather than stretching the main detail page into an endless management surface.

### L2: Task Management Panels

User question: "Let me edit or review this part."

Target panels:

- World profile fields.
- Profile basics.
- Manual detail groups.
- Relationship snapshot and classification audit.
- Memories and source review.
- Linked activity.

Each panel should use product-facing copy first. For example:

- "WorldBook defines these fields; Contacts saves this person's values."
- "This memory came from an event and cannot be edited as a manual note."
- "Chat binding is managed in Chat Directory."

### L3: Execution / Risk Actions

User question: "Help me do this safely."

Actions:

- AI-assisted world-field drafting;
- template-change review and save;
- reset relationship;
- delete memory group;
- delete role.

These must be visually separate from ordinary contact editing. AI drafts must not auto-save or overwrite manual values.

## Contacts List Design

### Header

Use a native phone-app header:

- title: `联系人 / Contacts`;
- add button as a plus icon;
- no dashboard-style summary counters in the header.

### Search

Search placeholder:

- Chinese: `搜索姓名、角色 ID、世界字段`
- English: `Search name, role ID, or world fields`

Search should filter the full list. The Recent interactions row can stay visible unless the search query is active.

### My Profile

Position:

- fixed below search;
- above Recent interactions.

Meaning:

- represents the user inside the world;
- can carry World profile fields;
- must not look like a chat/romance target;
- does not appear in Recent interactions.

### Recent Interactions

Position:

- below My Profile;
- above the full grouped lists.

Presentation:

- horizontal avatar row;
- small labels;
- optional tiny source hint such as Chat, Memory, or Event if available;
- tap opens the same Contact Detail as tapping the full list row.

Rules:

- includes Main Roles and NPCs;
- does not remove them from their normal sections;
- should stay short, approximately 6-10 entries;
- if no recent interactions exist, hide this row rather than showing an empty management card.

### Main Role And NPC Lists

These remain complete lists.

Rows should feel like contact rows:

- avatar;
- name;
- role ID in small secondary text;
- role/identity label;
- one short hint: Chat-bound, world fields filled, or memory count.

Avoid piling every available metric into the row.

## Contact Detail Design

The contact detail should become a person-first page, not a settings panel.

Recommended order:

1. hero profile block;
2. primary actions;
3. compact status chips;
4. section cards;
5. activity and memory previews;
6. danger zone.

Section cards should be scan-first:

- World fields: show filled count and first 1-2 visible values.
- Relationship: show current runtime snapshot and whether profile-side classification exists.
- Memories: show primary memory headline plus count.
- Manual details: show preference/life/social counts.
- Linked activity: show recent source owners without raw backend ids unless in review detail.

Each section can open a focused panel for deeper editing or review.

## World Fields Flow

The current ownership model stays:

- WorldBook defines field templates.
- Contacts stores concrete values for Self Profile, Main Role, and NPC.
- Chat consumes visibility-gated context; it does not become the authoring owner.

V1.1 improvements should fit inside the new detail flow:

- richer field widgets;
- template-change review;
- AI-assisted completion as draft only;
- clear save feedback.

No template change should silently delete out-of-template values.

## Visual Direction

Use a restrained native-phone contact style:

- white or very light neutral surface;
- rounded avatar shapes;
- list rows with thin separators or quiet cards;
- small system-blue actions where appropriate;
- no decorative dashboard cards;
- no dense admin counters on the first screen;
- no big marketing-style panels.

The first screen should feel closer to iOS Contacts or a clean chat contact list than to a CRM.

## Implementation Scope

This design is a UI/IA refactor, not a data-model rewrite.

Expected touched areas:

- `src/views/ContactsView.vue`
- Contacts UI tests
- Contacts E2E coverage
- Contacts and Visual handoff docs

Optional helper extraction is allowed only if it reduces the current Contacts view complexity without changing ownership boundaries.

## Validation Strategy

Focused tests:

- Contacts profile template view tests;
- profile entity store tests;
- WorldBook profile template handoff tests;
- new Contacts UI / recent-interaction tests if helper behavior is extracted.

E2E:

- Contacts first screen on mobile looks like a contact list;
- My Profile appears below search and above Recent interactions;
- Recent interactions open the same detail page as full list rows;
- Main Roles and NPCs still contain recent entries;
- WorldBook -> Contacts -> world fields flow still works;
- no horizontal overflow on phone viewport.

Broader validation after implementation:

```powershell
npm.cmd run test -- tests/worldbook-profile-template-view.test.js tests/contacts-profile-template-view.test.js tests/worldbook-functional-ia.test.js tests/contacts-profile-entities-store.test.js tests/profile-template-schema.test.js tests/worldbook-profile-templates-store.test.js
npm.cmd run test:e2e
npm.cmd run lint
npm.cmd run build
```

## Out Of Scope

- Changing role profile storage shape.
- Moving concrete profile values into WorldBook.
- Moving role profile editing into Chat Directory.
- Making Self Profile a chat target.
- Rewriting relationship runtime, memory runtime, or event gates.
- Adding a separate Contacts backend/admin route.
- Auto-saving AI-generated profile values.

## Open Review Points

Before implementation, confirm:

1. Contact detail should use focused sheets for deeper panels on phone, rather than a single long scroll.
2. Recent interactions should be computed from available Chat/memory/activity signals in V1, or start with a simpler recent-opened local UI signal.
3. The first implementation should prioritize mobile layout first, then desktop split layout.
