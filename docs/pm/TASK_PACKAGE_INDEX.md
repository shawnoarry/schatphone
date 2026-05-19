# SchatPhone Task Package Index

Updated: 2026-05-19

This file is the PM-facing and handoff-facing index for all current task packages.

Use it when the team needs to know:

- which package a task belongs to;
- what should be read first;
- which package owns the current product meaning for that lane;
- where the current status and next safe slice are recorded.

## 1. Standard Package Structure

Every package should expose the same four core files:

1. `README.md`
2. `STATUS_AND_HANDOFF.md`
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`

Some packages can add one extra focused file when needed, such as:

- `DESTRUCTIVE_ACTIONS.md`
- `ROLE_HUB_INFORMATION_ARCHITECTURE.md`
- `WORLD_HUB_AND_CHEATS.md`

## 2. Package List

### 1. Contacts / Relationship System

Path:

- `docs/pm/contacts-relationship-system-v2/README.md`

Use for:

- Contacts
- Chat Directory boundary
- visible role ID
- relationship reset/delete
- one memory-group delete
- role detail IA
- World Hub cleanup semantics tied to one role

Current handoff page:

- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`

### 2. Chat / Chat Directory / Service Accounts

Path:

- `docs/pm/chat-and-chat-directory/README.md`

Use for:

- Chat thread behavior
- Chat list
- Chat Directory
- service accounts
- role binding into Chat
- rich message surfaces

Current handoff page:

- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`

### 3. Event Runtime / World Hub / Cheats

Path:

- `docs/pm/event-runtime-and-world-hub/README.md`

Use for:

- simulation event engine
- runtime review
- World Hub
- Cheats planning
- runtime-control unlock and override concepts

Current handoff page:

- `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`

### 4. Map / Calendar / Reminders

Path:

- `docs/pm/map-calendar-reminders/README.md`

Use for:

- Map
- Calendar
- Reminders
- route/date/callback/follow-up boundaries
- trip and schedule handoff rules

Current handoff page:

- `docs/pm/map-calendar-reminders/STATUS_AND_HANDOFF.md`

### 5. Commerce / Logistics / Food / Wallet / Assets

Path:

- `docs/pm/commerce-finance-and-assets/README.md`

Use for:

- Shopping
- Logistics
- Food Delivery
- Wallet
- Assets
- Stock
- downstream ledger and ownership loops

Current handoff page:

- `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`

### 6. Visual / IA Governance

Path:

- `docs/pm/visual-and-ia-governance/README.md`

Use for:

- shell IA
- visual rebuild direction
- entry ownership
- page hierarchy
- interaction consistency

Current handoff page:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### 7. Module Architecture / Technical Governance

Path:

- `docs/pm/module-architecture-governance/README.md`

Use for:

- state ownership
- storage direction
- cleanup and refactor planning
- module maturity
- engineering decomposition
- long-lived code quality governance

Current handoff page:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

## 3. Default Reading Shortcut

If you do not know where to start:

1. `docs/README.md`
2. `docs/process/AI_WORK_MODE.md`
3. this file
4. the matching package `README.md`
5. the matching package `STATUS_AND_HANDOFF.md`

## 4. Workflow Rule

Task packages define product meaning and implementation grouping.

Process rules still belong to:

- `docs/process/AI_WORK_MODE.md`
- `.agents/skills/schatphone-workflow/SKILL.md`

Skill-family details are intentionally not repeated in every package. Use:

- `docs/process/EVENT_WORKFLOW.md` for event/runtime lane skill routing;
- `docs/process/VISUAL_WORKFLOW.md` for visual/IA lane skill routing;
- `docs/process/DEVELOPMENT_TOOLING.md` for project-local skill inventory and setup assumptions.
