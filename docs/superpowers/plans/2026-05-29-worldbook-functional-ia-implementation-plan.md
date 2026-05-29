# WorldBook Functional IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WorldBook understandable from `Settings -> WorldBook`, and make the selected worldview reliably feed Chat and other AI/runtime context readers through one shared world interface.

**Architecture:** Keep storage and entry ownership stable for this slice. Add a pure `world-interface` seam over existing `systemStore` and `chatStore` data, then make Chat and WorldBook UI consume that seam. WorldBook remains a Settings-owned feature in V1; no standalone World Dock app, game-store shell, token economy, or editable World Pack marketplace is added in this implementation round.

**Tech Stack:** Vue 3, Pinia, Vue Router, Vitest, Vue Test Utils, existing CSS variables and local component styles.

**Implementation Status:** `IMPLEMENTED_V1_BASELINE` on 2026-05-29, followed by `WORLD_PACK_V1_ACTIVATION` and `WORLD_PACK_SERVICE_ACCOUNT_GENERATION_V1` on 2026-05-29. The completed slices added `src/lib/world-interface.js`, Chat prompt/thread-panel integration, WorldBook active overview, Book source activation, changed-source diff review, a usable Current World Pack selector/review/activation panel, user-approved service-account generation into Chat Directory, focused tests, e2e coverage, and documentation sync. User-created pack editing, subscription generation beyond the current service-account V1, and concrete app-archetype behavior remain future work.

---

## Required Reading

Before editing code, read:

1. `docs/superpowers/specs/2026-05-29-worldbook-functional-ia-and-world-interface-design.md`
2. `src/views/WorldBookView.vue`
3. `src/views/ChatView.vue`
4. `src/components/chat/ChatThreadMenuPanel.vue`
5. `src/stores/system.js`
6. `src/stores/chat.js`
7. `src/lib/simulation/world-context.js`
8. `src/lib/worldbook-navigation.js`
9. `tests/worldbook-view-filters.test.js`
10. `tests/worldbook-profile-template-view.test.js`
11. `tests/chat-worldbook-binding-visibility.test.js`
12. `tests/chat-role-knowledge-binding.test.js`
13. `tests/simulation-world-context.test.js`

## Product Decisions Locked For This Round

- The user-facing entry stays inside `Settings`.
- A future standalone shortcut/app may route to the same feature later, but this round must not create one.
- WorldBook is the authoring surface for worldview, knowledge points, and world profile templates.
- World Pack remains inside WorldBook for V1 and now supports one active pack, built-in pack selection, activation review, and active-pack metadata.
- Chat, Map, Calendar, Contacts, and runtime should read world context through shared helpers rather than each creating separate ad hoc summaries.
- Existing app records, chat history, role profile values, map records, and calendar records must not be rewritten when WorldBook is edited.
- Visible Chinese copy must be readable; corrupted development-era mojibake must not remain in the touched WorldBook/Chat surfaces.

## File Map

Create:

- `src/lib/world-interface.js`
  - Pure helper seam for active world overview, consumer summaries, role-bound knowledge resolution, and prompt-ready world context.
- `tests/world-interface.test.js`
  - Unit tests for the shared seam, including global worldview fallback, role-bound enabled/disabled/missing counts, and prompt block output.
- `src/components/worldbook/WorldBookOverview.vue`
  - Compact state-first overview for active world, worldview status, knowledge count, template count, and consumers.
- `src/components/worldbook/CurrentWorldPackPanel.vue`
  - Usable built-in pack selector, activation review, blockers, and confirm activation; no pack marketplace.
- `tests/worldbook-functional-ia.test.js`
  - Focused UI tests for WorldBook overview, current pack shell, and readable zh-CN copy.

Modify:

- `src/views/WorldBookView.vue`
  - Import overview/current-pack components and `world-interface` helpers.
  - Place state overview before editing sections.
  - Keep existing editor, knowledge list, deep-link filters, and template actions working.
- `src/views/ChatView.vue`
  - Replace local duplicated world summary logic with `world-interface` helpers.
  - Ensure system prompt and thread WorldBook drawer read the same context object.
- `src/components/chat/ChatThreadMenuPanel.vue`
  - Keep the current panel behavior but repair visible copy and align labels with the shared world context fields.
- `src/lib/simulation/world-context.js`
  - Optional in this slice: wrap or align with `world-interface` naming if it can be done without changing runtime semantics.
- Existing tests:
  - `tests/chat-worldbook-binding-visibility.test.js`
  - `tests/chat-role-knowledge-binding.test.js`
  - `tests/worldbook-view-filters.test.js`
  - `tests/worldbook-profile-template-view.test.js`
  - Update only if needed to reflect the new shared seam and readable copy.
- Documentation after code:
  - `docs/superpowers/specs/2026-05-29-worldbook-functional-ia-and-world-interface-design.md`
  - `docs/roadmap/TODO_ROADMAP.md`
  - `docs/pm/TODO_PM_STATUS_REPORT.md`

---

## Task 1: Add The Shared World Interface Seam

**Files:**

- Create: `src/lib/world-interface.js`
- Create: `tests/world-interface.test.js`

- [ ] Add constants for supported consumers:

```js
export const WORLD_INTERFACE_CONSUMERS = Object.freeze([
  { key: 'chat', label: 'Chat', consumesPromptContext: true },
  { key: 'contacts', label: 'Contacts', consumesPromptContext: false },
  { key: 'map', label: 'Map', consumesPromptContext: true },
  { key: 'calendar', label: 'Calendar', consumesPromptContext: true },
  { key: 'runtime', label: 'Event Runtime', consumesPromptContext: true },
])
```

- [ ] Add a default-world pack descriptor without introducing real pack storage:

```js
export const DEFAULT_WORLD_PACK = Object.freeze({
  id: 'default_world',
  name: 'Default world',
  state: 'active',
  source: 'worldbook',
})
```

- [ ] Implement `resolveWorldviewText(systemStore)`:
  - Prefer `systemStore.user.globalWorldview`.
  - Fall back to legacy `systemStore.user.worldBook`.
  - Return trimmed text.

- [ ] Implement `resolveRoleKnowledgeState({ systemStore, chatStore, contact, limit = 8 })`:
  - Only role contacts can resolve role-bound knowledge.
  - Read `contact.profileId`, then `chatStore.getRoleProfileById(profileId)`.
  - Compare `profile.knowledgePointIds` against `systemStore.user.knowledgePoints`.
  - Return:

```js
{
  roleBound: true,
  profileName: '...',
  configuredCount: 3,
  enabledPoints: [],
  injectedPoints: [],
  disabledCount: 0,
  missingCount: 0,
  overflowCount: 0,
}
```

- [ ] Implement `resolveWorldContextForConsumer({ systemStore, chatStore, contact, consumer = 'chat' })`:
  - Include `worldview`, `worldviewCharCount`, `hasWorldview`, `activePack`, `consumers`, and role knowledge state.
  - Keep disabled and missing knowledge excluded from `injectedPoints`.
  - Keep overflow count stable when enabled points exceed prompt limit.

- [ ] Implement `buildWorldPromptBlock(worldContext)`:
  - Return prompt text with the same semantic meaning as current Chat prompt:
    - primary worldview rules;
    - role-bound knowledge point summaries;
    - disabled/missing references do not enter prompt text.
  - Do not include UI-only labels or development notes.

- [ ] Implement `resolveActiveWorldOverview({ systemStore, chatStore })`:
  - Return active pack name/state.
  - Return worldview char count and `hasWorldview`.
  - Return total and enabled knowledge counts.
  - Return world profile template count for `default_world`.
  - Return consumer list from `WORLD_INTERFACE_CONSUMERS`.

- [ ] Add unit tests:
  - global worldview fallback works;
  - empty world returns safe default overview;
  - enabled role-bound knowledge enters `injectedPoints`;
  - disabled knowledge is counted but excluded;
  - missing knowledge is counted but excluded;
  - more than 8 enabled points reports overflow;
  - prompt block includes worldview and enabled knowledge only.

## Task 2: Route Chat World Context Through The Shared Seam

**Files:**

- Modify: `src/views/ChatView.vue`
- Modify: `src/components/chat/ChatThreadMenuPanel.vue`
- Update: `tests/chat-worldbook-binding-visibility.test.js`
- Update: `tests/chat-role-knowledge-binding.test.js`

- [ ] Import `resolveWorldContextForConsumer` and `buildWorldPromptBlock` from `src/lib/world-interface.js`.

- [ ] Replace local duplicate logic in `ChatView.vue`:
  - `getGlobalWorldviewText`
  - `resolveKnowledgePointBindingStateForContact`
  - `resolveBoundKnowledgePointsForContact`
  - the world-related part of `buildWorldKernelPromptBlock`

- [ ] Keep `buildWorldKernelPromptBlock(contact)` as the single Chat-local assembly point for:
  - shared world context from `world-interface`;
  - role profile values from `chatStore`;
  - visible self-profile values from `chatStore`.

- [ ] Keep existing prompt wording for role profile and self profile values unless tests show a regression.

- [ ] Make `activeThreadWorldKernelState` consume `resolveWorldContextForConsumer({ systemStore, chatStore, contact: activeChat.value, consumer: 'chat' })`.

- [ ] Keep `openWorldBookFromThreadContext` deep-link behavior:
  - direct point id opens that point;
  - otherwise injected point ids are passed;
  - `source=chat` remains.

- [ ] Repair visible copy in `ChatThreadMenuPanel.vue`:
  - summary labels should be readable in zh-CN and English fallback;
  - no mojibake or development notes should render.

- [ ] Run or update focused Chat tests so they assert:
  - Chat prompt includes global worldview;
  - Chat prompt includes enabled role-bound knowledge;
  - disabled role-bound knowledge does not enter prompt;
  - missing point warning/count still appears in the thread panel;
  - WorldBook deep-link from Chat still passes point ids.

## Task 3: Add A State-First WorldBook Overview

**Files:**

- Create: `src/components/worldbook/WorldBookOverview.vue`
- Modify: `src/views/WorldBookView.vue`
- Create/Update: `tests/worldbook-functional-ia.test.js`

- [ ] Build `WorldBookOverview.vue` with props:

```js
defineProps({
  overview: {
    type: Object,
    required: true,
  },
  saved: {
    type: Boolean,
    default: false,
  },
})
```

- [ ] Render these data points with stable test ids:
  - `worldbook-overview`
  - `worldbook-overview-pack`
  - `worldbook-overview-worldview`
  - `worldbook-overview-knowledge`
  - `worldbook-overview-templates`
  - `worldbook-overview-consumers`

- [ ] Overview should answer three user questions at a glance:
  - current world in effect;
  - material defining it;
  - modules consuming it.

- [ ] In `WorldBookView.vue`, compute:

```js
const worldOverview = computed(() =>
  resolveActiveWorldOverview({
    systemStore,
    chatStore,
  }),
)
```

- [ ] Place overview above the existing world kernel editor.

- [ ] Keep return button behavior using `pushReturnTarget` and `resolveReturnLabel`.

- [ ] Keep existing `knowledgeDeepLinkPointIds`, `knowledgeDeepLinkSource`, and filter behavior unchanged.

- [ ] Add focused UI tests:
  - WorldBook renders overview first;
  - overview counts worldview, enabled knowledge, and templates;
  - consumer list includes Chat and Event Runtime;
  - deep-linked knowledge still highlights/filters as before.

## Task 4: Add Lightweight Current World Pack Panel

**Files:**

- Create: `src/components/worldbook/CurrentWorldPackPanel.vue`
- Modify: `src/views/WorldBookView.vue`
- Create/Update: `tests/worldbook-functional-ia.test.js`

- [ ] Build a default-world shell with stable test ids:
  - `worldbook-current-pack`
  - `worldbook-current-pack-name`
  - `worldbook-current-pack-state`
  - `worldbook-current-pack-effects`

- [ ] The V1 panel should display:
  - `Default world`;
  - active state;
  - worldview as base rule source;
  - enabled knowledge points as optional supplements;
  - role profile templates as contact/profile structure references;
  - consumers affected by future context resolution.

- [ ] Do not build:
  - pack marketplace;
  - token unlocks;
  - Steam-like package browsing;
  - user-created pack editor;
  - activation of multiple pack candidates.

- [ ] Add a disabled or informational review affordance only if it helps explain future expansion. It must not look like a broken action.

- [ ] Add tests:
  - current pack panel appears after overview;
  - it says the active pack is default/current;
  - it does not expose raw internal ids as primary user-facing text.

## Task 5: Repair Touched Visible Copy

**Files:**

- Modify: `src/views/WorldBookView.vue`
- Modify: `src/components/chat/ChatThreadMenuPanel.vue`
- New components from Tasks 3 and 4

- [ ] Replace corrupted visible zh-CN strings in touched WorldBook and Chat WorldBook surfaces.

- [ ] Keep English fallback strings readable.

- [ ] Do not render development notes, implementation explanations, test labels, or route/query names as user-facing copy.

- [ ] Run a targeted copy scan:

```powershell
rg -n "涓|璁|妯|鍦|鏃|鑱|淇|锛|�" src/views/WorldBookView.vue src/components/chat/ChatThreadMenuPanel.vue src/components/worldbook
```

- [ ] Inspect every match manually. Matches inside intentional source comments or old untouched tests do not block this task; visible UI strings in touched files do.

## Task 6: Align Runtime Context Naming Without Changing Semantics

**Files:**

- Modify if low risk: `src/lib/simulation/world-context.js`
- Update if changed: `tests/simulation-world-context.test.js`

- [ ] Compare `resolveWorldContextFromSystemStore` output with the new `world-interface` concepts.

- [ ] If the runtime helper can call `resolveWorldviewText(systemStore)` without changing output, do that.

- [ ] If deeper runtime migration would require broad test churn, leave runtime unchanged and document it as next slice.

- [ ] Ensure existing runtime tests still pass.

## Task 7: Validation

**Commands:**

```powershell
npm.cmd test -- tests/world-interface.test.js tests/worldbook-functional-ia.test.js tests/worldbook-view-filters.test.js tests/worldbook-profile-template-view.test.js tests/chat-worldbook-binding-visibility.test.js tests/chat-role-knowledge-binding.test.js tests/simulation-world-context.test.js
npm.cmd run lint
npm.cmd run build
```

- [ ] Run focused tests.
- [ ] Run lint.
- [ ] Run production build.
- [ ] If any command fails from an unrelated existing issue, record the exact failure and keep the WorldBook-specific test results clear.

## Task 8: Documentation Sync

**Files:**

- Modify: `docs/superpowers/specs/2026-05-29-worldbook-functional-ia-and-world-interface-design.md`
- Modify: `docs/roadmap/TODO_ROADMAP.md`
- Modify: `docs/pm/TODO_PM_STATUS_REPORT.md`

- [ ] Update the design spec status from review-ready to implementation progress/completed state.
- [ ] Record that V1 keeps WorldBook in Settings.
- [ ] Record that shared `world-interface` now anchors Chat context.
- [ ] Record remaining future work:
  - optional standalone shortcut/app entry;
  - subscription generation beyond the current service-account V1;
  - concrete app-archetype behavior beyond metadata;
  - user-created pack editing;
  - runtime-wide migration if Task 6 stays partial.

---

## Acceptance Criteria

- Opening `Settings -> WorldBook` shows active world status before editing controls.
- Users can tell which world is active, what material defines it, and which modules consume it.
- Chat prompt assembly and Chat thread WorldBook summary read the same world context seam.
- Enabled role-bound knowledge can affect future AI prompt context.
- Disabled and missing role-bound knowledge do not silently enter prompt text.
- The page still supports existing global worldview editing, knowledge creation/editing, filters, deep links, and profile template copying.
- Touched user-facing zh-CN/English copy is readable and free of development notes.
- Focused tests, lint, and build pass or failures are documented with exact command output.
