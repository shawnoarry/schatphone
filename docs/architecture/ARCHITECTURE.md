# SchatPhone Architecture

Updated: 2026-06-01

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

- Vue `^3.5.24` (locked `3.5.27`)
- Vue Router `^5.0.2` (locked `5.0.2`)
- Pinia `^3.0.4` (locked `3.0.4`)
- Vite `^7.2.4` (locked `7.3.1`)
- Tailwind CSS `^4.1.18` (locked `4.1.18`)
- Vitest `^1.6.0` (locked `1.6.1`)
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
  - appearance, including Chat-scoped appearance state and custom CSS
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
  - provider-aware transport behavior and URL normalization for Gemini native, OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, and Azure OpenAI endpoints, including base `/v1`, model-list, deployment, responses, and local/server-auth gateway shapes
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
  - shared active-world and WorldBook context seam for Chat prompt context, WorldBook overview, active Book source links, enabled World Pack metadata, and runtime worldview fallback
- `src/lib/world-pack-compatibility.js` and `src/lib/world-profile-analysis.js`
  - normalize AI world-profile analysis, score World Pack compatibility, group recommended/adaptable/unsupported packs, and keep AI recommendation advisory so users can still enable other supported packs
- `src/lib/world-pack-service-accounts.js`
  - maps enabled World Pack service-account templates into Chat-owned service-account payload candidates without creating source-module business records; Current World Pack shows availability only, while Chat Directory's `Services` management area owns user opt-in, editable/resettable built-in candidates, and idempotent add/create
- `src/lib/world-service-template-proposals.js`
  - normalizes AI/pasted World Pack service-account proposals for Chat Services review; low-confidence, duplicate, invalid-category, or unknown world-app-binding proposals are rejected, while confirmed proposals add templates only and do not create Chat subscriptions or source-module records
- `src/lib/service-account-source-plan.js`
  - derives descriptive source notification plans for Chat service/official accounts from source bindings; supported V1 rows cover Shopping orders, Shopping logistics tracking, and Food Delivery order/event pushes while keeping schedule ownership and source records in source modules
- `src/lib/world-pack-app-bindings.js`
  - maps enabled World Pack app bindings into launch rows, stable global `world_app_*` app-entry records for App Store/Home/App Library placement, source-module route context, and target-app UX context; current concrete consumers are Shopping marketplace filters, Food Delivery dispatch hero/banner/default-view context, Calendar reservation title/context presentation, and Map transit title/context presentation
- `src/lib/world-app-template-registry.js`
  - defines the guarded nonstandard-app template whitelist and AI extraction/review normalization; WorldBook's Current World Pack panel presents AI/pasted proposals with loading, empty, parse/API error, and rejected-state treatment for user review, and confirmed proposals become World Pack appBindings that then flow through the existing App Store/Home/target-app context seams while low-confidence, unsupported, or unknown proposals cannot create routes, stores, business records, event rules, or App Store entries
- `src/lib/chat-social-event-review.js`
  - evaluates generated Chat social proposals before communication state changes; low-risk role greetings may auto-apply with audit, while role refusal/block/restore/unblock proposals wait for World Hub review and then apply through Chat-owned actions
- `src/lib/chat-social-runtime-source.js`
  - selects conservative foreground/session tick role greeting candidates for stranger or declined role contacts, then hands them to Event Runtime review instead of mutating Chat directly
- `src/lib/chat-ai-social-proposals.js`
  - normalizes optional `socialEvents` returned by Chat AI responses so malformed or unsupported role social proposals are ignored before reaching Event Runtime

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
| confirmed Chat social/channel state | Chat / Chat Directory | who can message, pending friend state, blocked, or blocked-by-role status after a direct user action or confirmed event |
| generated social-event review | `simulationStore` / event runtime | Chat AI and foreground/session runtime greeting proposals require audit/review before mutating Chat channel state; World Hub explains source/policy/ownership; refusal/block/restore/unblock stay high-risk review-first |
| cross-module cue queues | `reminders.js` / Reminders | not Calendar |
| confirmed schedule/date meaning | Calendar | not Reminders |
| event logs and runtime metadata | `simulationStore` | not module business records |
| optional runtime review | World Hub | not the main data-entry surface |
| reusable long-form text source assets | `Book` / `bookStore` | visible text-library app; not Files, not a novel reader, not a world-store shell |
| world meaning and prompt-facing world context | WorldBook activation via `systemStore` plus `src/lib/world-interface.js` | WorldBook stays under Settings/context links; Book stores long source text, WorldBook activates whole documents or selected sections; World Pack stores the legacy active-pack activation review plus additive enabled expansion packs and AI world-profile analysis |
| Chat service-account entries from a world template | Chat Directory contacts in `chat.js` plus `src/lib/service-account-source-plan.js` | World Pack suggests templates from every enabled compatible pack and WorldBook may show availability, but edit/reset/AI-review/confirm/add actions belong in Chat Directory's `Services` management area; user candidate overrides and confirmed AI/pasted candidates stay on World Pack template metadata, joined entries are Chat-owned subscription accounts, source notification plans are descriptive, and source modules keep business records |
| world app binding launch context | `src/lib/world-pack-app-bindings.js` plus the target source module view | World Pack provides app name, route, stable `world_app_*` entry id, and safe defaults; the target module keeps business state. V1 maps `marketplace -> Shopping` as `补给站` / Daily Fresh / Grocery context, maps any confirmed `dispatch -> Food Delivery` binding as hero/banner plus Nearby default context, maps `reservation -> Calendar` as title/context treatment, maps `transit -> Map` as title/context treatment, and exposes enabled bindings through App Store/Home/App Library placement |
| World Pack global UX effects | `src/lib/world-pack-app-bindings.js` plus target app presentation context | activation/review stays in WorldBook, but active-pack UI/UX changes should appear in the target app through labels, terminology, accents, context banners, and safe variants without moving source-module ownership |
| World Pack app UI theme package gate | `src/lib/world-pack-app-bindings.js` plus normalized app bindings | A World Pack app binding is entry/launch context by default. A target app should change its own UI only when the binding explicitly includes `uiThemePackage.enabled=true`; otherwise the app keeps its original UI, defaults, and terminology. |
| world currency declarations and finance rates | WorldBook `Current World Pack` economy settings plus Wallet store currency registry | World Pack can declare custom currencies for the current world, but Wallet owns the primary-currency selection, the shared currency registry, and editable USD/CNY-centered reference exchange rates. Chat transfer cards and commerce displays consume Wallet currency options; World Pack must not create ledger records or bypass Wallet rate controls. |
| user-authored appearance overrides | `Appearance` global CSS, Chat Appearance CSS, `src/lib/app-shell-scope.js`, `src/lib/appearance-scoped-css.js`, and `src/lib/appearance-pack.js` | user CSS is an explicit override above system and World Pack defaults; app/world-app scoped CSS is stored in `settings.appearance.scopedCustomCss`, the editor can choose active World Pack entries for world-app targets, preview exact selectors, pause/clear scoped layers for recovery, compiled CSS targets stable `data-app`, `data-route-scope`, `data-world-pack`, and `data-world-app` attributes, world-app scoped CSS is narrower and emitted after app-scoped CSS for intentional per-world overrides, and Appearance pack import/export moves only portable visual layers rather than Home layout, widgets, or Chat appearance |
| AI-proposed world-specific app entries | `src/lib/world-app-template-registry.js` plus WorldBook Current World Pack confirmation | AI may read active WorldBook context and propose entries only from a built-in nonstandard-app template registry; the Current World Pack panel can review AI or pasted JSON proposals with loading/error/empty/rejected states; confirmed suggestions become appBindings, while mismatched, unsupported, or low-confidence suggestions stay out of App Store and cannot create code modules, event rules, or business stores. Current dynamic coverage includes `transit_pass -> Map`, `reservation_board -> Calendar`, and `dispatch_board -> Food Delivery`; `black_market` is blocked as `needs_dedicated_app` and does not map onto Shopping |

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
- Chat-local appearance preferences live under `systemStore.settings.appearance.chat`, because they are UI presentation preferences rather than conversation content.
- Chat Settings owns Chat appearance, default-behavior entry points, and maintenance diagnostics; Chat Me owns user identity/anonymity and recent social-presence data.
- Friend/block/refusal social events separate channel state from relationship truth: Chat applies confirmed social/channel state, Contacts may display snapshots, event runtime reviews generated proposals, World Hub reviews high-risk proposals, and relationship runtime records only confirmed continuity facts.

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
