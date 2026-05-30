# SchatPhone TODO Roadmap

Updated: 2026-05-30

This is the only live execution board for implementation order.

If any older planning or status document conflicts with this file, this file wins.

## 1. How To Use This Board

1. Use this file for current execution order and active status.
2. Use `docs/pm/TASK_PACKAGE_INDEX.md` to choose the correct task package before coding.
3. Use package `STATUS_AND_HANDOFF.md` files to understand current state, next slice, and do-not-do rules.
4. Keep this roadmap readable for product readers and actionable for AI engineers.
5. Do not turn this file into an archive of every historical subtask. Keep it current and concise.

## 2. Status Legend

- `TODO`: not started
- `IN_PROGRESS`: active development
- `PARTIAL_DONE`: baseline landed, closure still pending
- `DONE`: current acceptance reached
- `ON_HOLD`: intentionally deferred
- `DECISION`: blocked on product or technical decision

## 3. Current Project Snapshot

Current state:

1. the core phone shell is stable enough to support ongoing feature work;
2. Chat, role profiles, Chat-side binding, and relationship runtime baseline are already online;
3. Calendar and Reminders have a real product split baseline;
4. low-impact cross-module relationship facts are already working across several modules;
5. World Hub is online as an optional review/control surface;
6. visual quality is still functional scaffolding in many areas rather than final immersion.

Current project risk:

- new immersive features can still create ownership drift, UI confusion, or oversized hot files if added carelessly.

## 4. Current Execution Order

### 4.1 Contacts V2 Detail IA And Memory Presentation

Status: `DONE`

Why this is first:

- destructive actions, role ID rules, memory-group cleanup, and runtime ownership are already in place;
- the next missing piece is the front-end role detail experience;
- this is the best place to reduce ambiguity before adding more derived memory behavior.

Scope:

1. finish the Contacts detail information architecture;
2. separate static profile, relationship progress, memory groups, manual entries, and event-attached entries clearly;
3. make manual vs event-attached information visually distinct;
4. keep destructive actions isolated and readable.
5. land the V1 WorldBook-driven profile-template baseline for Self Profile, Main Role, NPC, and Chat context visibility.

Acceptance:

- a role detail page can present current relationship state and memory groups without semantic confusion;
- users can tell which items are manually entered and which came from events;
- Contacts remains distinct from Chat Directory.
- WorldBook owns template definitions, while Contacts owns concrete profile values.
- NPC -> Main Role upgrade preserves existing Chat binding and history.

Current implementation note:

- V1 profile-template schema, WorldBook preset/world-template storage, Contacts entity grouping, profile-value display, NPC upgrade, and Chat profile-context gates have landed.
- Contacts detail now covers grouped manual/event-attached sections, inline manual-detail editing, expanded linked-activity drill-down, memory source-audit, supporting-event drill-down, memory review filtering/sort, and lifecycle controls (`Pinned / Active / Archived` plus review note).
- 4.1 acceptance is considered reached; later memory dedupe/merge and further polish continue under 4.2 and later visual passes.

Primary references:

- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- `docs/pm/visual-and-ia-governance/STATUS_AND_HANDOFF.md`

### 4.2 Text-First Memory Dedupe And Recall Rules

Status: `DONE`

Why this is next:

- cross-module facts already exist;
- the next risk is duplicate or noisy memory recall;
- memory quality matters more now than adding more memory sources.

Scope:

1. tighten one-event-one-memory-group behavior;
2. keep source attachments without double-counting relationship growth;
3. improve Calendar memory review details after Contacts presentation is clearer.

Acceptance:

- the same life event does not appear as several competing top-level memories;
- supporting facts remain available without becoming duplicate primary memories;
- Chat and Contacts can consume cleaner memory summaries.

Current implementation note:

- the first 4.2 runtime tightening slice is now landed: Shopping gift memory and its downstream Calendar delivery follow-up now reuse one shared memory group instead of surfacing as two competing top-level memories;
- the next explicit-lineage merge is also landed: Map shared-route facts can pass their source trip id into Map-derived Calendar follow-ups, so the confirmed Calendar follow-up becomes supporting context inside the same `shared_route` memory group;
- Wallet order-support facts for Shopping gifts and Food Delivery shared meals are covered as supporting-only facts inside the upstream `shopping_gift` / `food_shared_meal` memory groups, preserving ledger traceability without stacking relationship metrics;
- source-level traceability remains intact because each module fact still keeps its own source module and source id entries inside the shared memory group;
- explicit-lineage coverage is now broad enough for the current adapter set: Phone callback, Shopping gift, Food Delivery shared meal, Wallet support, Map route, and Calendar follow-up chains all have regression coverage where source ids are explicit;
- Chat prompt context now consumes primary-led `recallSummary` text, while Contacts and World Hub consume UI-facing review summaries that keep the original life-event headline and only mention the related-record count;
- Calendar confirmed-event cards now expose a relationship review detail showing source lineage, target, memory role, and whether the Calendar fact applied growth or stayed supporting-only;
- current 4.2 acceptance is reached for explicit source-id chains and product-facing review copy across Calendar, Contacts, and World Hub;
- future dedupe work should only add another merge when a new explicit source-id chain appears, while fuzzy same-text merging remains out of scope.

Primary references:

- `docs/pm/contacts-relationship-system-v2/STATUS_AND_HANDOFF.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`

### 4.3 World Hub Review Quality Before Stronger Controls

Status: `DONE`

Why this is next:

- World Hub already exists and can review runtime state;
- the safer path is to improve review quality before enabling stronger overrides;
- Cheats should not be frozen until this lane is clearer.

Scope:

1. improve event and relationship review details in World Hub;
2. make automatic runtime behavior easier to explain;
3. keep value editing, funds editing, unlock editing, and other high-power controls deferred until the review surface is trusted.

Acceptance:

- World Hub is readable enough for PM, QA, and advanced users to understand why a runtime effect happened;
- pending relationship effects are easier to inspect before approval or dismissal;
- Cheats remains a future lane, not a default user path.

Current implementation note:

- World Hub event logs now support module/status filters, selected-log detail, trigger-source/reason/target review, adapter-boundary notes, and world-variant context where present.
- World Hub relationship facts now support status/source filters, selected-fact detail, metric-delta review, source-record visibility, pending-effect explanations, and supporting-only duplicate-growth explanations.
- Review actions remain narrow: pending relationship facts can still be approved or dismissed, and relationship cleanup remains guarded; broad affinity, funds, unlock, or freeform override editing stays deferred.

Primary references:

- `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`

### 4.4 Service-Account Continuity For Shopping / Logistics / Food Delivery

Status: `DONE`

Why this matters:

- Chat already has service-account style capability;
- Shopping, logistics, and Food Delivery are natural sources of believable in-phone communication;
- this deepens immersion without requiring high-risk runtime automation.

Scope:

1. deepen Shopping/logistics service-account pushes in Chat;
2. deepen Food Delivery service-account pushes in Chat;
3. preserve ownership boundaries between orders, logistics, Wallet records, and route context.

Acceptance:

- service-account communications feel more like real app notifications or brand messages;
- Chat receives richer module context without absorbing module business state.

Current implementation note:

- Chat now has a reusable `service_notification` rich message surface with source module, source record id, optional source event id, service label, status, amount, route actions, unread behavior, and source-level dedupe.
- Shopping checkout can push order notifications into matching Shopping service-account threads, while Shopping remains the owner of products, cart, checkout, order status, and Calendar delivery cues.
- Shopping logistics events can push tracking notifications into matching Logistics service-account threads, while logistics remains a tracking-facing communication lane and does not become a storefront.
- Food Delivery checkout and order events can push order/update notifications into the Food Delivery Dispatch service-account thread, while restaurants, menus, order state, delivery fulfillment, Wallet expenses, and Map route context remain owned by their source modules.
- Service-account pushes only target existing Chat Directory service accounts; source modules do not auto-create service identities.

Primary references:

- `docs/pm/chat-and-chat-directory/STATUS_AND_HANDOFF.md`
- `docs/pm/commerce-finance-and-assets/STATUS_AND_HANDOFF.md`

### 4.5 Architecture Cleanup In Safe Batches

Status: `IN_PROGRESS`

Why this remains ongoing:

- historical encoding and semantic debt still exists in some documents and hot files;
- the project is now big enough that ownership drift can become expensive quickly.

Scope:

1. keep cleaning one-owner-per-concept semantics;
2. continue low-risk decomposition of oversized views and files;
3. clean stale compatibility layers and historical doc noise in batches.

Acceptance:

- docs and code agree on field and ownership meaning;
- new work does not reintroduce parallel owners for the same concept;
- hot files stop being the default place to pile on new behavior.

Primary references:

- `docs/pm/module-architecture-governance/STATUS_AND_HANDOFF.md`
- `docs/process/AI_WORK_MODE.md`

### 4.6 World Pack / App Archetype / Service Template System

Status: `PARTIAL_DONE`

V1 WorldBook baseline landed:

- `Settings -> WorldBook` now leads with an active-world overview and a usable `Current World Pack / 当前设定包` activation panel;
- `src/lib/world-interface.js` is the shared world-context seam for Chat prompt context, Chat thread WorldBook summary, active WorldBook overview, active Book source links, active World Pack metadata, and runtime worldview fallback; active Book source injection is now covered through Chat and runtime tests;
- World Pack V1 storage and activation review are in place with one active pack per save; active-pack service-account templates can now be generated into Chat Directory after user confirmation; the first concrete app-binding V1 is live for `marketplace -> Shopping`, where `survival_city` opens Shopping as `补给站` with active world context and a safe Daily Fresh / Grocery filter.
- Book text-library V1 is trial-ready: `/book`, `bookStore`, Book schema helpers, import/create/edit/read/export flows, App Store/Home recovery entry, Settings backup/restore integration, WorldBook source picker, section-level activation, changed-source warnings, visual diff review, and reviewed source-link refresh are in place.
- Book / WorldBook IA is being tightened around a first-use source setup path: system fallback stays outside Book until copied, Book import/export uses confirmation surfaces, and active Book usage is shown from the text library detail view.

Current product direction:

- use the older, lower-complexity entry model first;
- `WorldBook` remains reachable from `Settings` and contextual links, not as a new default Home app;
- `World Pack` activation belongs inside the full `WorldBook` management page as a `Current World Pack / 当前设定包` area;
- do not build a standalone world-store, Steam-like shell, DLC storefront, or token economy for V1;
- `Book` exists as a separate text-library app because it owns source text editing, not world activation or storefront behavior;
- keep `World Hub` and future `Cheats` in the hidden runtime-control lane, separate from WorldBook/World Pack authoring and activation.

Why this may become a main lane:

- WorldBook, service accounts, Shopping, Logistics, Food Delivery, Calendar, Map, Wallet, Assets, and Stock are now mature enough to need a reusable world-driven extension model;
- future modes such as black markets, auction houses, hospitals, flights, subscriptions, task boards, and publication accounts should not become one-off custom data chains;
- the current service-notification boundary already proves the right direction: Chat owns communication history, while source modules own business truth.

Remaining task structure:

1. run phone-device user testing on the Book import/export -> WorldBook source activation -> changed-source diff review -> World Pack activation -> Chat/runtime context loop;
2. user-test the WorldBook -> `补给站` -> Shopping filter path on phone-sized devices;
3. broaden service/subscription template generation beyond the current active-pack service-account V1;
4. define and land the next concrete archetype target beyond the current Shopping marketplace V1.
5. revisit App Store detail presentation if the app library grows beyond the V1 same-screen list/detail/action layout; long app lists should move detail into a drawer, modal detail, or route instead of stretching the main screen.

Current design reference:

- `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`
- `docs/superpowers/plans/2026-05-29-book-text-library-worldbook-plan.md`
- `docs/superpowers/specs/2026-05-23-world-pack-app-archetype-service-template-design.md`
- `docs/superpowers/specs/2026-05-29-worldbook-functional-ia-and-world-interface-design.md`
- `docs/superpowers/specs/2026-05-29-world-pack-shopping-archetype-v1-design.md`
- `docs/superpowers/plans/2026-05-29-world-pack-shopping-archetype-v1-plan.md`

Decision note:

- this is intentionally not implemented directly from conversation notes;
- the V1 entry shell is now decided and implemented as a baseline: stay inside `Settings -> WorldBook`;
- `Book` is a text-source library, not a replacement for WorldBook, Files, World Hub, or a world-store shell;
- the wider 4.6 lane is now partially implemented, but still guarded: broaden only after phone-sized user testing confirms the Book/WorldBook/World Pack/Shopping path is understandable.

## 5. Deferred Or Guarded Directions

These are known directions, but should not jump ahead of the current work.

### 5.1 Gallery-Driven Relationship Memory

Status: `ON_HOLD`

Reason:

- current image sources are still too manual;
- forcing users to structure memories around photos would add friction and hurt immersion.

Current rule:

- relationship memory should stay text-first and event-first for now;
- Gallery remains primarily an asset and atmosphere surface.

### 5.2 High-Impact Automatic Relationship Events

Status: `ON_HOLD`

Reason:

- low-impact explicit facts are already the right current lane;
- high-impact romance/conflict automation still needs safer review and control surfaces.

### 5.3 Cheats As A Finished Product Surface

Status: `DECISION`

Reason:

- Cheats still has no frozen unlock source, route shape, or editing surface;
- World Hub should mature first.

## 6. Recently Landed Baselines Worth Preserving

These are already usable and should be treated as current foundation, not active open questions.

1. Calendar vs Reminders split baseline.
2. Relationship runtime baseline with memory groups and cleanup seams.
3. Contacts role delete, relationship reset, and single-memory delete baseline.
4. Shopping, Food Delivery, Phone, Map, Wallet, and Calendar low-impact relationship fact adapters.
5. World Hub read-only runtime review plus pending-relationship review path.
6. Delivery route context visible in Food Delivery and Shopping surfaces.
7. Task-package system, workflow docs, and package handoff pages.
8. Core overview and architecture docs have been refreshed to current semantics.

## 7. Validation Rule

For any meaningful code round:

1. run `npm run lint`;
2. run `npm run build`;
3. run `npm run test` when behavior changed;
4. sync the required docs in `docs/process/AI_WORK_MODE.md` in the same round.

## 8. Read Next

After this roadmap:

1. `docs/pm/TASK_PACKAGE_INDEX.md`
2. the matching package `README.md`
3. the matching package `STATUS_AND_HANDOFF.md`
4. `docs/process/AI_WORK_MODE.md`
