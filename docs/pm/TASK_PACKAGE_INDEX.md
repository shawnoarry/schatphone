# SchatPhone Task Package Index

Updated: 2026-08-23

This file is the PM-facing and handoff-facing index for all current task packages.

Use it when the team needs to know:

- which package a task belongs to;
- what should be read first;
- which package owns the current product meaning for that lane;
- where the current status and next safe slice are recorded.

Current routing note:

- roadmap 4.5 security/toolchain/architecture work belongs to `module-architecture-governance`;
- roadmap 4.6 World Pack hardening can span visual/IA, Chat/service accounts, commerce, and map/date packages, but the live roadmap owns priority;
- roadmap 4.7 Modern Seoul K-pop carrier governance is `PARTIAL_DONE`: the independent Book/WorldBook 2 + 6 + 1 content slice belongs to `visual-and-ia-governance`; its prose rule is a future input, not an implemented popup or executable profile;
- roadmap 4.8 cross-module Mini Scene architecture belongs primarily to `module-architecture-governance`. Engage `visual-and-ia-governance` for Settings/Book/presenters, `event-runtime-and-world-hub` for runtime-trigger policy, `map-calendar-reminders` for Calendar/Map request Adapters, and `chat-and-chat-directory` for Chat compatibility only when the corresponding stage is promoted.
- roadmap 4.9 remains product-control work led by `visual-and-ia-governance`; engage `commerce-finance-and-assets` only for the named ordinary Food Delivery/Shopping consequence proof, not for an open-ended shop-polish queue;
- roadmap 4.10 shared image-generation contracts, persistence, credentials, backup, and adapters belong to `module-architecture-governance`, while Camera entry/capture/settings IA belongs to `visual-and-ia-governance`; Gallery People and source callers remain separately gated;
- roadmap 4.11 Map renderer, packs, places, pins, trips, and validation belong only to `map-calendar-reminders`; the functional group remains Map-only.
- the accepted Calendar/Agenda Journey orchestration direction belongs primarily to `map-calendar-reminders` for Calendar, Agenda Journey, Activity Session, and schedule handoffs. Engage `event-runtime-and-world-hub` only for eligibility/randomness/review/log semantics, `module-architecture-governance` for the hidden Schedule Orchestrator and persistence Interfaces, and `visual-and-ia-governance` when the Calendar or Agenda Journey frontend slice is promoted. This direction does not change roadmap 4.11 Map ownership.
- roadmap 4.13 Music belongs to `visual-and-ia-governance` for installed-app identity, Home/App Store entry, Now Playing, and mini-player acceptance, and to `module-architecture-governance` for provider/playback contracts, persistence, credentials, backup, and bounded Chat/Map Interfaces. Chat and Map packages are engaged only when an actual caller is separately promoted.
- roadmap 4.14 cross-module Event Experience belongs primarily to `event-runtime-and-world-hub` for the Event Surface Projection, host registration, event review/notebook semantics, and World Hub/Cheats separation. Engage `map-calendar-reminders` only for EVE-2 Map anchor/card rendering and Map-owned interaction, `module-architecture-governance` only when shared persistence or Mini Scene Interfaces change, and a source package only when its event family is explicitly promoted.
- the landed Player Context V1 eligibility seam and the still-documentation-only world-evolution/information-propagation direction route first to `event-runtime-and-world-hub`; engage `contacts-relationship-system-v2` for the Contacts-owned Self Profile revision and stable identity meaning. A future Community/Media or Investigation owner must receive its own accepted product package before routes, Stores, posts, feeds, or clues are implemented.
- roadmap 4.15 shared runtime TTS belongs primarily to `module-architecture-governance` for provider Adapters, Cloudflare Worker behavior, persistence, credentials, preview-media lifecycle, and future caller contracts. Engage `chat-and-chat-directory` for the current Settings entry and any later read-aloud/voice-message behavior; development-time ElevenLabs Skills remain tooling rather than runtime ownership.
- roadmap 4.16 app shell previews belong to `visual-and-ia-governance` for S1 fixture shells, entry/IA, and visual identity acceptance. Engage `module-architecture-governance` only when a shell is promoted from S1 fixture preview to S2 owner implementation, and `event-runtime-and-world-hub` only when a shell is promoted to an S3 event chain; a future shell's canonical owner must receive its own accepted product package before production routes, Stores, or schemas are implemented.

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
- Chat Settings entry and later approved caller behavior for the shared TTS Module

Current handoff page:

- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`

### 3. Event Runtime / World Hub / Cheats

Path:

- `docs/pm/event-runtime-and-world-hub/README.md`

Use for:

- simulation event engine
- Event Surface Projection and registered host contracts
- event-card review/notebook semantics
- runtime review
- World Hub
- Cheats planning
- runtime-control unlock and override concepts
- player-context-conditioned event contracts, world-arc ownership decisions, and future information-propagation semantics

Current handoff page:

- `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`

### 4. Map / Calendar / Reminders

Path:

- `docs/pm/map-calendar-reminders/README.md`

Use for:

- Map
- Calendar
- Agenda Journey and future Activity Session
- Reminders
- route/date/callback/follow-up boundaries
- Calendar-to-Agenda materialization, trip evidence, and schedule handoff rules

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
- Music installed-app identity and shell/entry presentation

Current handoff page:

- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### 7. Module Architecture / Technical Governance

Path:

- `docs/pm/module-architecture-governance/README.md`

Use for:

- state ownership
- storage direction
- shared Mini Scene Interfaces, world/profile resolution, presenter seams, and persistence ownership
- cleanup and refactor planning
- module maturity
- engineering decomposition
- long-lived code quality governance
- Music provider/playback Interfaces, persistence, credentials, and backup boundaries
- TTS provider/Worker Interfaces, persistence, credentials, preview-media lifecycle, and caller boundaries

Current handoff page:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`

## 3. Default Reading Shortcut

If you do not know where to start:

1. root `AGENTS.md`
2. `docs/process/AI_WORK_MODE.md`
3. `docs/roadmap/TODO_ROADMAP.md`
4. this file when ownership is unclear
5. the matching package `README.md` and `STATUS_AND_HANDOFF.md`

## 4. Workflow Ownership

Task packages define product meaning and own the execution detail for their lane:

- `README.md` owns the package reading path;
- `STATUS_AND_HANDOFF.md` owns current status, next safe slice, do-not-do rules, validation, and documentation sync;
- `PRODUCT_BOUNDARY.md` owns domain boundaries;
- `IMPLEMENTATION_WORKSTREAMS.md` owns stable domain workstreams.

Cross-task rules still belong to:

- root `AGENTS.md` for the stable bootstrap;
- `docs/process/AI_WORK_MODE.md` for the thin project execution contract.
- `docs/process/WORKTREE_INTEGRATION_PROTOCOL.md` for cross-worktree protection, user gates, controller-owned integration, synchronization, and push authorization.

Specialist skill-family details remain outside the cross-task contract. Use:

- `docs/process/EVENT_WORKFLOW.md` for event/runtime lane skill routing;
- `docs/process/VISUAL_WORKFLOW.md` for visual/IA lane skill routing;
- `docs/process/DEVELOPMENT_TOOLING.md` for project-local skill inventory and setup assumptions.

Do not create a persistent workflow for a one-off task. Add a workflow only for a stable task family with repeated rules that the package quartet does not already express.
