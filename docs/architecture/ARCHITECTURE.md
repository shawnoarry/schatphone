# SchatPhone Architecture

Updated: 2026-05-29

## 1. Architecture Goals

SchatPhone follows a layered architecture built around:

1. a phone-like shell;
2. domain-owned module records;
3. shared service seams for AI, persistence, media references, and runtime coordination.

Primary goals:

- keep the Lock / Home / Chat / Settings main path stable;
- let new modules grow without rewriting the shell;
- preserve local-first behavior and backup safety;
- keep AI usage explicit, controlled, and replaceable;
- avoid several competing owners for the same product concept.

## 2. Tech Stack

- Vue `3.5.24`
- Vue Router `5.0.2`
- Pinia `3.0.4`
- Vite `7.2.4`
- Tailwind CSS `4.1.18`
- Vitest `1.6.0`
- ESLint 9 and Prettier 3

## 3. Layered Design

### 3.1 App Shell Layer

Responsibilities:

- root route switching;
- lock-state guarding;
- Home entry navigation;
- shell-level appearance and global layout behavior.

Primary files:

- `src/App.vue`
- `src/main.js`
- `src/router/index.js`

### 3.2 State Layer

Responsibilities:

- keep domain state in domain stores;
- avoid one oversized global store;
- preserve one clear owner per concept.

Main stores:

- `src/stores/system.js`
  - settings
  - appearance
  - notifications
  - user profile, worldview settings, WorldBook source links, and World Pack activation state
- `src/stores/chat.js`
  - role profiles
  - Chat Directory contacts
  - service accounts
  - conversations
  - messages
  - service notification rich messages with source references
  - thread-level AI prefs
- `src/stores/relationshipRuntime.js`
  - entity snapshots
  - metrics such as affinity, trust, intimacy, tension, dependency
  - memory groups
  - milestones
  - pending confirmation events
- `src/stores/simulation.js`
  - event logs
  - cooldowns
  - caps
  - runtime enablement and execution metadata
- `src/stores/reminders.js`
  - cross-module cue queues
- `src/stores/map.js`
  - local trip and location simulation
- `src/stores/book.js`
  - reusable long-form text assets for worldbook documents, knowledge notes, rules, glossary text, and references
  - remains separate from `Files`, because Files is an internal metadata/index bridge

Important semantic notes:

- `roleId` belongs to the role profile as a user-visible identifier.
- `profileId` is an internal role-profile key.
- `entityKey` is a runtime key used by relationship runtime.
- `relationshipLevel` and `relationshipNote` inside Chat-side structures are compatibility or annotation fields only, not the truth layer for current relationship progress.

### 3.3 Service And Utility Layer

Responsibilities:

- AI provider integration;
- persistence abstraction;
- shared parsing, formatting, and contract helpers.

Important files:

- `src/lib/ai.js`
  - unified AI entry point
  - provider-aware transport behavior
  - error normalization
- `src/lib/persistence.js`
  - storage helpers
  - migration helpers
  - diagnostics hooks
- `src/lib/chat-response.js`
  - assistant payload parsing
  - fallback extraction
- `src/lib/relationship-fact-adapters.js`
  - cross-module fact adapters into relationship runtime
- `src/lib/world-interface.js`
  - shared active-world and WorldBook context seam for Chat prompt context, WorldBook overview, active Book source links, active World Pack metadata, and runtime worldview fallback
- `src/lib/world-pack-service-accounts.js`
  - maps active World Pack service-account templates into user-approved Chat Directory contact payloads without creating source-module business records
- `src/lib/world-pack-app-bindings.js`
  - maps active World Pack app bindings into launch rows and source-module context, with the V1 Shopping marketplace rule limited to route context and default filters

Rule: UI components must not bypass these shared seams for core cross-module concerns.

### 3.4 View Layer

Responsibilities:

- screen orchestration;
- user interaction;
- presenting store state;
- calling store actions and shared service seams.

Views should not become the permanent home of:

- AI provider logic;
- relationship-truth computation;
- storage migration logic.

## 4. Core Product-Semantic Ownership

This table matters as much as the code layout.

| Concept | Owner | Notes |
| --- | --- | --- |
| global role archive | `Contacts` + role-profile storage in `chat.js` | user-facing role identity lives here |
| Chat-side bindability | `Chat Directory` | can bind/unbind without deleting the role archive |
| ordinary message history | `Chat` | includes manual chat-message deletion |
| current relationship progress | `relationshipRuntimeStore` | the truth layer for relationship state |
| cross-module cue queues | `reminders.js` / Reminders | not Calendar |
| confirmed schedule/date meaning | Calendar | not Reminders |
| event logs and runtime metadata | `simulationStore` | not module business records |
| optional runtime review | World Hub | not the main data-entry surface |
| reusable long-form text source assets | `Book` / `bookStore` | visible text-library app; not Files, not a novel reader, not a world-store shell |
| world meaning and prompt-facing world context | WorldBook activation via `systemStore` plus `src/lib/world-interface.js` | WorldBook stays under Settings/context links; Book stores long source text, WorldBook activates whole documents or selected sections; World Pack stores one active world configuration and activation review state |
| Chat service-account entries generated from a world template | Chat Directory contacts in `chat.js` | World Pack suggests the template; Chat Directory owns the generated entry; source modules keep business records |
| world app binding launch context | `src/lib/world-pack-app-bindings.js` plus the target source module view | World Pack provides app name, route, and safe defaults; the target module keeps business state. V1 only maps `marketplace -> Shopping` as `补给站` / Daily Fresh / Grocery context |

## 5. Lock And Notification Architecture

### 5.1 Lock Flow

- default route redirects to `/lock`;
- when the device is locked, non-lock routes are blocked;
- unlock returns the user to the target route when appropriate.

### 5.2 Notification Flow

- notifications are persisted locally;
- lock screen can show and route through them;
- system notifications and in-app notification behavior must stay aligned with shell ownership.

## 6. Chat Domain Architecture

### 6.1 Chat Data Shapes

High-level data families:

- role profiles
- Chat Directory contacts
- conversations
- messages
- thread-level AI prefs

Chat-side contact entries can include:

- `id`
- `name`
- `kind`
- `profileId`
- `serviceTemplate`
- `worldPackId`
- `worldServiceTemplateId`
- `worldAppBindingId`
- `relationshipLevel`
- `relationshipNote`

Important rule:

- if a product-facing surface needs the current live relationship state, it must also read relationship runtime instead of trusting `relationshipLevel` or `relationshipNote`.

### 6.2 Chat Interaction Model

- user send and AI invoke are decoupled;
- manual AI trigger remains explicit;
- rich message surfaces are supported;
- service-account notification rich messages may keep source module, source record id, optional source event id, and route actions, but they must not copy or own Shopping, Logistics, Food Delivery, Wallet, or Map business state;
- thread-level preferences control prompt behavior;
- Chat prompt assembly can read role, worldview, and relationship-runtime summaries, but Chat does not own the relationship truth itself.

### 6.3 Role Binding Contract

Cross-module role-context consumption should use the contract documented in:

- `docs/architecture/ROLE_BINDING_CONTRACT.md`

This keeps avatar selection, profile metadata, and Chat-side binding semantics reusable without letting each module invent a new interpretation.

## 7. Home Layout And Entry Architecture

Home owns:

- app-entry visibility and placement behavior;
- widget entry behavior;
- hidden or optional app entry integration.

Important rules:

- `app_*` Home entries should not be casually removed;
- optional apps such as World Hub must remain compatible with toggle-based visibility;
- shell-level entry behavior should stay distinct from module-owned business state.

## 8. Data And Security Boundaries

- persistence is local-first by default;
- backup/import must remain rollback-safe;
- context should be sent to AI only through approved seams;
- deleting a role, memory group, or record must follow the correct owner and cleanup rules rather than a loose UI-only delete.

## 9. Extension Rules

When adding or changing features:

1. keep one owner per concept;
2. put business records in domain stores, not shell stores;
3. route AI calls through `src/lib/ai.js`;
4. update docs in the same round when route/schema/core semantics change;
5. prefer adding shared seams when several modules need the same concept, rather than duplicating logic;
6. keep long text source storage (`Book`) separate from world activation (`WorldBook`) and hidden file indexing (`Files`).

## 10. Documents To Read With This One

- `docs/overview/PROJECT_MASTER_GUIDE.md`
- `docs/process/AI_WORK_MODE.md`
- `docs/pm/TASK_PACKAGE_INDEX.md`
- `docs/architecture/ROLE_BINDING_CONTRACT.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
