# WorldBook Functional IA And World Interface Design

Updated: 2026-05-29

Status: `IMPLEMENTED_V1_BASELINE`

Implementation note:

- V1 keeps the entry at `Settings -> WorldBook`.
- `src/lib/world-interface.js` now provides the shared world-context seam for active world overview, Chat prompt context, and runtime worldview fallback.
- WorldBook now leads with active-world overview and a lightweight `Current World Pack / 当前设定包` panel.
- Full World Pack storage, activation review, app archetypes, service-account templates, and standalone shortcuts remain future work.

## 1. Goal

Refine WorldBook from a long settings form into a functional world-kernel management surface that users can understand and that the rest of SchatPhone can safely consume.

This design follows the selected B direction:

- keep the old entry model: `Settings -> WorldBook`;
- do not create a standalone world store, Steam-like shell, DLC storefront, token economy, or separate World Library app for V1;
- improve WorldBook information architecture and shared world-reading seams before large visual polish;
- prepare a lightweight `Current World Pack / 当前设定包` area inside WorldBook without building the full World Pack system in one slice.

## 2. Product Boundary

WorldBook is the world meaning layer.

WorldBook owns:

- global worldview text;
- reusable knowledge points;
- terminology and lore references when they are expressed as world context;
- role-profile template rules;
- references consumed by Chat, Contacts, Map, Calendar, and runtime world-context generation.

WorldBook does not own:

- app business records;
- orders, bids, appointments, subscriptions, wallet truth, route truth, or delivery state;
- service-account message history;
- relationship-runtime truth;
- World Hub review/control data.

World Pack is the default-assembly layer.

World Pack owns:

- a named world configuration;
- references to WorldBook knowledge points and templates;
- enabled world app bindings;
- default service-account templates;
- terminology map, tone, risk language, and default module visibility;
- activation review state.

World Pack does not own:

- copied raw WorldBook text as a second lore source;
- source-module records;
- World Hub or Cheats controls.

World Hub and Cheats remain in the hidden runtime-control lane. They may review runtime effects that used world context, but they are not the authoring or activation surface for WorldBook or World Pack.

## 3. Current Functional Assessment

The current implementation already works as a V1 world source:

- `systemStore.user.globalWorldview` is the base worldview text.
- `systemStore.user.knowledgePoints` stores reusable knowledge points.
- `systemStore.user.profileTemplates` stores global preset and world-specific role-profile templates.
- Chat reads global worldview and role-bound enabled knowledge points.
- Chat thread settings expose a current WorldBook summary.
- Map and Calendar find related knowledge points through `findRelevantKnowledgePoints`.
- event runtime can resolve a compact world context through `resolveWorldContextFromSystemStore`.

The current gaps are functional, not only visual:

- the WorldBook page mixes overview, authoring, filtering, deep-link scope, and template management in one long scroll;
- no explicit active world state exists, so users cannot see what is currently in effect;
- there is no World Pack storage or activation review seam;
- consumers read world data through several different paths, which will be fragile once World Pack starts affecting defaults;
- Chinese UI copy has visible corrupted text in several WorldBook-related surfaces and must be audited before visual polish is considered complete;
- `WorldBookView.vue` is large enough that adding World Pack behavior directly would reduce locality.

## 4. User Mental Model

The user should understand WorldBook in three questions:

1. What world is active right now?
2. What material defines that world?
3. Where will this material take effect?

The page should therefore lead with state before editing.

Expected user path:

1. Open `Settings`.
2. Open `WorldBook`.
3. See a world overview: current pack, worldview status, enabled knowledge count, template count, and consuming modules.
4. Review or change the `Current World Pack`.
5. Edit global worldview if needed.
6. Add or adjust knowledge points.
7. Copy or review role-profile templates.
8. Return to Chat, Map, Calendar, Contacts, or Settings with existing return-context behavior.

## 5. Information Architecture

### 5.1 Overview

The top of WorldBook should become an L0 overview.

It shows:

- active World Pack name or `Default world`;
- activation state: default, reviewed, changed, or needs review;
- global worldview character count and last saved state;
- enabled knowledge points count;
- role-profile template count;
- consuming modules: Chat, Contacts, Map, Calendar, Event Runtime.

Allowed actions:

- open Current World Pack section;
- save if there are unsaved worldview or pack-activation changes;
- return to the entry source.

The overview must not expose low-level IDs by default.

### 5.2 Current World Pack

This section is L1/L2 depending on state.

V1 should support a lightweight shell:

- show the active pack;
- show available built-in pack candidates;
- show what a pack would affect before activation;
- activate one pack only after review;
- leave user-created pack creation for a later implementation slice.

Pack review shows:

- referenced WorldBook knowledge points;
- referenced role-profile templates;
- default terminology;
- suggested app bindings;
- suggested service-account templates;
- default Home visibility changes.

Activation rules:

- activation stores references and configuration, not copied source-module records;
- existing app records and historical Chat messages are not rewritten;
- if a referenced knowledge point or template is missing, activation blocks with a readable explanation;
- if the active pack changes, consumers should resolve future defaults through the shared world interface, not by re-reading scattered raw fields.

### 5.3 World Kernel

This section owns the base worldview.

It should contain:

- global worldview editor;
- save state;
- count and validation;
- short explanation of which modules consume it.

Functional rule:

- editing the global worldview changes future prompt/runtime context, but should not rewrite historical messages or event logs.

### 5.4 Knowledge Points

This section owns reusable knowledge entries.

It should be split into:

- create/edit form;
- filters and deep-link scope;
- result list;
- usage summary per point.

Each point should show:

- enabled/disabled state;
- title;
- compact content preview;
- tags;
- bound role count;
- active Chat injection count;
- whether it is referenced by the active World Pack.

User actions:

- create;
- edit;
- enable or disable;
- delete after confirmation;
- clear module deep-link scope.

Functional rule:

- disabled points are retained as records but excluded from normal prompt/runtime injection;
- deleting a point should not delete role profiles, contacts, messages, maps, calendar events, or runtime logs;
- when a deleted point is referenced by a profile or pack, the UI must show a missing-reference warning in the relevant consumer surface.

### 5.5 Role-Profile Templates

This section owns template definitions, not profile values.

It should show:

- global preset templates;
- current-world templates;
- copy-from-preset action;
- version;
- field count;
- whether a template is referenced by the active World Pack.

Functional rule:

- Contacts owns concrete profile values;
- WorldBook owns template rules;
- changing a template version should not silently rewrite existing Contacts profile values.

## 6. World Interface Seam

Before adding large World Pack behavior, create a small world interface seam that consumers can read.

Recommended module:

- `src/lib/world-interface.js`

Recommended responsibilities:

- normalize active world state from `systemStore`;
- return active world overview;
- resolve active worldview text;
- resolve active knowledge points for a consumer;
- resolve active role-profile templates;
- expose pack reference status without source-module records.

Initial interface shape:

```js
resolveActiveWorldOverview(systemStore)
resolveWorldKernel(systemStore)
resolveWorldContextForConsumer(systemStore, { consumer, sourceScope, contact, item })
resolveWorldPackActivationPreview(systemStore, packId)
```

Consumer categories:

- `chat`
- `contacts`
- `map`
- `calendar`
- `event_runtime`
- `settings`

This seam gives leverage because Chat, Map, Calendar, event runtime, and future World Pack activation can share one interpretation of active world data. It improves locality because pack activation changes concentrate behind one interface instead of spreading through views.

## 7. Data Model Direction

V1 may continue storing base world data under `systemStore.user`, but pack state should be normalized separately inside system settings or a dedicated user-world slice.

Recommended fields:

```js
user.worldPacks = []
user.activeWorldPackId = ''
user.worldPackActivationReviews = []
```

World Pack record:

```js
{
  id: 'pack_modern_default',
  title: 'Modern Parallel',
  summary: 'A grounded contemporary world baseline.',
  status: 'built_in',
  knowledgePointIds: [],
  profileTemplateIds: [],
  appBindings: [],
  serviceAccountTemplateIds: [],
  terminology: {},
  defaultHomeVisibility: {},
  version: 1,
  updatedAt: 0
}
```

Activation review record:

```js
{
  id: 'review_pack_modern_default_1',
  packId: 'pack_modern_default',
  reviewedAt: 0,
  acceptedAt: 0,
  affectedKnowledgePointIds: [],
  affectedProfileTemplateIds: [],
  affectedAppBindings: [],
  warnings: []
}
```

The exact storage location can be finalized in the implementation plan after checking migration cost in `systemStore`.

## 8. User Experience Principles

WorldBook should feel like a native system management surface, not an installed app skin.

Principles:

- state first, editing second;
- visible impact before activation;
- no storefront language in V1;
- no hidden destructive side effects;
- no developer-facing IDs in default copy;
- all visible Chinese and English copy must be human-readable and free of corrupted encoding;
- deep links from Chat, Map, and Calendar should preserve host context and explain why the user landed in a scoped WorldBook view.

## 9. Implementation Slices

### Slice 1: Copy And IA Stabilization

Goal:

- make existing WorldBook understandable before adding Pack behavior.

Deliverables:

- fix corrupted visible Chinese copy in WorldBook and related embedded WorldBook summaries;
- add overview section;
- clarify impact copy for Chat, Contacts, Map, Calendar, and runtime;
- keep current data model unchanged.

Validation:

- add a zh-CN rendering test that catches corrupted visible copy in WorldBook;
- keep existing WorldBook filter and template tests passing.

### Slice 2: World Interface Seam

Goal:

- give consumers one way to resolve active world data.

Deliverables:

- add `src/lib/world-interface.js`;
- move world overview and consumer context resolution into this seam;
- adapt Chat, Map, Calendar, and runtime callers only where the interface reduces duplication;
- keep behavior compatible with existing tests.

Validation:

- unit tests for active overview, enabled/disabled knowledge handling, role-bound chat context, and missing references;
- existing Chat/Map/Calendar WorldBook tests still pass.

### Slice 3: Current World Pack Shell

Goal:

- show World Pack as a lightweight selectable current-world configuration inside WorldBook.

Deliverables:

- add built-in pack metadata;
- add active pack state;
- add activation preview;
- add review-and-activate interaction;
- no user-created pack editor yet.

Validation:

- tests for pack list, activation preview, activation state, missing-reference warnings, and no source-record mutation.

### Slice 4: Page Decomposition And Visual Polish

Goal:

- reduce `WorldBookView.vue` growth and improve maintainability.

Deliverables:

- extract Overview, Current World Pack, World Kernel, Knowledge Points, and Profile Templates into focused components;
- keep the route and return behavior unchanged;
- apply native-system visual styling after IA is stable.

Validation:

- component tests for extracted sections;
- route return tests remain stable;
- visual smoke test after implementation.

## 10. Non-Goals

Do not include in this planning round:

- standalone WorldBook Home app;
- standalone World Library or world store;
- Steam-like storefront;
- token economy;
- DLC or paid-content metaphors;
- full user-created app engine;
- World Hub or Cheats redesign;
- source-module record migration into WorldBook;
- automatic rewriting of historical Chat messages, Calendar events, orders, wallet records, or runtime logs.

## 11. Acceptance Criteria

The B direction is ready for implementation planning when:

1. the team accepts that WorldBook remains under Settings/context entry for V1;
2. the team accepts that `Current World Pack` lives inside WorldBook;
3. the first implementation slice is limited to IA/copy stabilization plus a world-interface seam;
4. World Hub and Cheats remain separate from WorldBook/World Pack activation;
5. tests include at least one zh-CN visible-copy guard;
6. consumers have a path toward reading active world data through one seam before full Pack behavior is built.
