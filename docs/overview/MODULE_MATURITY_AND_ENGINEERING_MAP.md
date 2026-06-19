# SchatPhone Module Maturity And Engineering Map

Updated: 2026-06-19

Purpose: this is a handoff-oriented engineering reference for future developers and AI assistants.

It translates the current roadmap, PM status, module ownership, file-size hotspots, and test posture into a practical map for deciding:

- where new work is cheapest;
- where edit risk is highest;
- which modules are mature enough to expand;
- which ones need boundary protection before more features.

Authority:

- this file is a current engineering-reference document, not a live task board;
- active work with status still belongs in `docs/roadmap/TODO_ROADMAP.md`;
- use this file to judge maturity, ownership clarity, and engineering risk;
- use task packages and workflow docs for the actual execution path.

Main references:

- `docs/overview/PROJECT_MASTER_GUIDE.md`
- `docs/pm/TODO_PM_STATUS_REPORT.md`
- `docs/roadmap/TODO_ROADMAP.md`
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`
- `docs/process/AI_WORK_MODE.md`
- current route/store/view scan

## 1. Quick Judgment

SchatPhone is no longer in the "can it run?" stage.

It is now in:

> stable baseline + selective P1 expansion + ownership cleanup

The biggest engineering risk is no longer missing architecture. It is:

1. maturity imbalance across modules;
2. oversized views/stores that continue absorbing product growth;
3. old compatibility fields or ownership seams drifting back into product truth.

The strongest current user-visible loops are:

1. Lock -> Home -> Chat -> notification feedback
2. WorldBook / Book -> Chat prompt context
3. Map / Reminders / Calendar / push handoff
4. Gallery asset references across multiple modules
5. Shopping / Food Delivery / Wallet / relationship-memory continuity

## 2. Current Maturity Tiers

### Tier A: stable core loops

These are active foundations, not placeholders:

| Module | Maturity | Why |
| --- | --- | --- |
| Lock Screen | stable | default entry, lock guard, notification tap-through all exist |
| Home | stable | protected app entries, page shell, edit gating, and folder model are in place |
| Chat | stable but heavy | strongest gameplay loop, but still one of the biggest engineering hotspots |
| Gallery | stable | real cross-module asset hub with meaningful ownership |
| WorldBook | stable integrated V1 | shared world-context layer, Book source activation, and World Pack activation are now consumed through one path |
| Book | trial-ready V1 | reusable long-text source storage now exists, with export, section activation, and WorldBook activation links |
| Map | stable baseline + active expansion | route/trip/reward/context loop is real and already integrated outward |
| Calendar | stable MVP | confirmed schedule/date behavior is meaningful and connected to push |
| Reminders | stable MVP | cross-module cue queue has its own visible product identity now |
| Persistence / backup / diagnostics | stable infrastructure | backup, restore, diagnostics, and storage checks are real system foundations |

### Tier B: usable but structurally heavy

These modules are useful now, but feature growth without cleanup will get expensive:

| Module | Maturity | Main risk |
| --- | --- | --- |
| Settings | usable, recently decomposed | core backup, storage diagnostics, and push workflows now sit behind composable Interfaces; avoid new pile-up |
| Chat Directory | strong internal tool | concept density is high: role/service/template/binding semantics |
| Contacts | active growth area | now product-critical, but large and semantically dense |
| Map | feature-rich | still concentrated despite previous extraction work |
| World Hub | narrow baseline | runtime review is useful, but detail quality must improve before stronger controls |

### Tier C: MVP present, long-term role still controlled

These modules are real, but their long-term product role is still intentionally constrained:

| Module | Maturity | Open constraint |
| --- | --- | --- |
| Network | strong MVP | provider setup could become more guided, but transport semantics should stay stable |
| Appearance | strong MVP | visual lane is parked; do not casually reopen larger style direction |
| Profile | useful support surface | mostly a prompt/context-facing identity layer, not a deep standalone loop yet |
| Files | internal component | hidden as a standalone app; only expand when another module needs an internal metadata bridge |
| More | lightweight utility/labs surface | let existing toggles mature before adding more ownership there |
| Assets | meaningful support module | product loops still lighter than Chat/Map/Shopping/Food Delivery |
| Stock | working support loop | useful, but should not compete with primary immersion loops yet |
| Phone | working support loop | useful, but still a support lane rather than a top-level fantasy anchor |
| Wallet | working support loop | real downstream ledger, but broader economy simulation stays controlled |

## 3. Engineering Hotspots Right Now

### Largest views

Current approximate sizes:

| File | Approx. lines | Meaning |
| --- | ---: | --- |
| `src/views/ChatView.vue` | 6300 | still the largest maintainability hotspot; active-thread, service-thread display, message-edit display-state, message action-sheet display-state, and `+` panel-state seams are now extracted |
| `src/views/ContactsView.vue` | 5863 | major product-critical surface; needs careful IA and ownership protection |
| `src/views/WorldBookView.vue` | 5036 | source links, profile templates, and World Pack review UI are dense; extract panels before another major feature slice |
| `src/views/HomeView.vue` | 4355 | Home layout/editing/library UI is large and visually sensitive |
| `src/views/ChatDirectoryView.vue` | 4122 | concept-heavy management surface |
| `src/views/WidgetsView.vue` | 4050 | widget authoring and preview logic are broad |
| `src/views/AppStoreView.vue` | 3635 | app discovery, install, world-app entry, and Home wiring are concentrated |
| `src/views/FoodDeliveryView.vue` | 3260 | commerce UI and service-notification integration remain large |
| `src/views/BookView.vue` | 2347 | text-library app; keep future editor/source-picker growth modular |
| `src/views/AppearanceView.vue` | 2107 | visual configuration surface; avoid mixing visual polish with ownership changes |
| `src/views/SettingsView.vue` | 1295 | improved after backup, storage diagnostics, and push workflow orchestration were extracted |

### Largest stores

Current approximate sizes:

| File | Approx. lines | Meaning |
| --- | ---: | --- |
| `src/stores/system.js` | 4581 | central infrastructure store; change carefully and avoid adding new domain ownership |
| `src/stores/chat.js` | 3411 | rich domain logic with high coordination responsibility |
| `src/stores/map.js` | 2332 | broad product logic; prefer improving seams before deep redesign |
| `src/stores/gallery.js` | 1471 | important asset rules live here; avoid casual contract churn |
| `src/stores/relationshipRuntime.js` | 1397 | real cross-module truth layer; deserves stricter semantic protection |
| `src/stores/foodDelivery.js` | 1328 | active commerce/event lane |
| `src/stores/calendar.js` | 1116 | compatibility, schedule, reminder, and push responsibilities still need adapter care |
| `src/stores/shopping.js` | 1043 | active commerce/event lane |
| `src/stores/simulation.js` | 888 | runtime/event lane with increasing diagnostic responsibility |
| `src/stores/reminders.js` | 735 | key ownership seam for cross-module cue handling |

## 4. Practical Engineering Rules

Prefer this order when improving maintainability:

1. extract display and interaction panels from oversized views first;
2. improve semantics and ownership boundaries second;
3. touch store/domain contracts only when product behavior truly changes.

More guardrails:

1. do not rewrite data contracts and do component extraction in the same slice unless absolutely necessary;
2. if a slice touches ownership or runtime truth, update docs in the same round;
3. if the task is visual, do not smuggle in functional ownership changes;
4. if the task is event/runtime, do not move module-owned records into a review/control surface.

## 5. Test Coverage Signals

The current repo has meaningful protection around core domain stores and important cross-module loops.

Stronger defended areas include:

- system and persistence
- chat behavior and prompt assembly
- map route/trip/world-context behavior
- calendar event and world-context behavior
- gallery asset logic
- relationship runtime and fact adapters
- control-center/world-hub review behavior
- shopping / food-delivery / wallet connectors

Engineering meaning:

1. store refactors are possible, but validation is more expensive than view-level cleanup;
2. view extraction and ownership clarification are still the cheapest maintainability investments;
3. relationship/runtime changes should be deliberate because multiple surfaces now consume them.

## 6. Module-By-Module Notes

### Lock Screen

- product state: stable
- engineering note: reuse existing notification metadata path; do not invent parallel lock behavior
- recommendation: no proactive refactor needed

### Home

- product state: stable shell
- engineering note: layout editing stays intentionally gated
- recommendation: treat as shell infrastructure, not a general experimentation surface

### Settings

- product state: strong configuration center
- engineering note: no longer a top large-view hotspot after display-only extractions plus `src/composables/useSettingsBackupWorkflow.js`, `src/composables/useSettingsStorageDiagnosticsWorkflow.js`, and `src/composables/useSettingsPushWorkflow.js`
- recommendation: avoid deep behavior rewrites; continue Settings only for named bugs or a narrow subdomain Interface that preserves storage, restore, push, and report semantics. For general architecture cleanup, move next to Chat/Contacts/WorldBook/Home view seams or a narrow `systemStore` facade.

### Network

- product state: technically usable
- engineering note: provider setup is still more "technical" than "guided"
- recommendation: if revisited, prefer guided copy, examples, and diagnostics clarity over transport-layer churn

### Chat

- product state: strongest gameplay module
- engineering note: still the single biggest maintainability hotspot; `src/composables/useChatActiveThreadModel.js` owns active-thread reading, `src/composables/useChatServiceThreadDisplayModel.js` owns service-thread display reading, `src/composables/useChatMessageEditDisplayModel.js` owns edit-modal display/validation state, `src/composables/useChatMessageActionSheetModel.js` owns message action-sheet display state, and `src/composables/useChatUserActionPanelModel.js` owns composer `+` panel display/draft state
- recommendation: prefer extraction and IA cleanup before more thread-side feature growth

### Chat Directory

- product state: real management tool
- engineering note: concept density is a bigger problem than raw capability
- recommendation: keep product meaning narrow and plain-language before adding more management power

### Contacts

- product state: active strategic module
- engineering note: large, semantically important, and now part of destructive flows / role-hub direction
- recommendation: current best investment is Contacts detail IA and manual-vs-event-attached presentation, not field sprawl

### Gallery

- product state: real platform-level asset hub
- engineering note: must not turn into a second admin console
- recommendation: keep it asset/atmosphere-first for now; do not force relationship-memory authoring into it yet

### Appearance

- product state: strong MVP
- engineering note: visual lane is separate; Appearance packs and scoped CSS are user override layers, not source-record owners
- recommendation: user-test portable Appearance pack import/export and scoped CSS recovery before adding finer hooks

### WorldBook

- product state: real cross-module world kernel with integrated World Pack V1 activation
- engineering note: readability matters more than piling on more features, especially now that it links Book sources, active pack state, appBindings, and reviewed template proposals
- recommendation: extract WorldBook panels before the next major behavior slice; the next product step should user-test and harden the landed template review UI, not copy business records into WorldBook

### Book

- product state: trial-ready V1 text-source library baseline
- engineering note: owns reusable long-form source text, while WorldBook owns activation
- recommendation: phone-test Book import/export, section activation, and changed-source diff review as part of the full WorldBook setup loop without turning Book into Files or a reader app

### Map

- product state: active expansion core
- engineering note: product depth is rising quickly, so boundaries matter; `transit -> Map` World Pack context is presentation only
- recommendation: keep Map as context/progression/trip owner; do not let it re-absorb reminders, event judgment, or other modules' records

### Calendar

- product state: meaningful schedule/date app
- engineering note: no longer a placeholder; ownership matters
- recommendation: continue schedule/date semantics, not raw cue-inbox regression

### Reminders

- product state: meaningful cross-module cue surface
- engineering note: key ownership seam that protects Calendar from inbox drift
- recommendation: keep raw cues and follow-up flows here

### Files

- product state: internal metadata/index component
- engineering note: hidden as a standalone app by decision
- recommendation: only expand when another module needs an internal bridge

### More

- product state: utility/labs surface
- engineering note: existing toggles now have some UI consumers
- recommendation: let current toggles mature before adding more control ownership

### Phone

- product state: working support loop
- engineering note: useful for logs, callbacks, and relationship facts, but not yet a primary fantasy anchor
- recommendation: keep it support-focused for now

### Wallet

- product state: working downstream ledger
- engineering note: now important because of order/relationship continuity
- recommendation: preserve downstream-ledger semantics before expanding into deeper economy systems

### Stock

- product state: support module with real baseline
- engineering note: useful connector, but not a mainline product fantasy yet
- recommendation: keep it secondary until broader economy/gameplay decisions harden

### World Hub

- product state: narrow optional runtime review app
- engineering note: now a genuine engineering hotspot because it reads multiple truth layers
- recommendation: improve review quality and filtering before exposing stronger mutation controls

## 7. Recommended Near-Term Engineering Order

Best immediate work:

1. Contacts detail IA and memory-management presentation
2. text/event-first relationship-memory dedupe, merge, and recall cleanup
3. World Hub review/detail readability
4. Chat/Contacts/Chat Directory semantic cleanup where old compatibility fields can still confuse truth ownership
5. only then consider the next cross-module expansion slice

Work to avoid right now:

1. major Chat store redesign
2. broad new Phone/Wallet/Stock fantasy tracks
3. renewed WorldBook feature sprawl without readability protection
4. moving reminder ownership back from Reminders/Calendar boundaries
5. broad value-editing controls in World Hub before review quality is strong enough

## 8. Reading Path For Future Contributors

If you are taking over implementation work, read:

1. `docs/README.md`
2. `docs/overview/PROJECT_MASTER_GUIDE.md`
3. `docs/roadmap/TODO_ROADMAP.md`
4. `docs/pm/TASK_PACKAGE_INDEX.md`
5. the matching package `README.md`
6. the matching package `STATUS_AND_HANDOFF.md`
7. this file

If you are deciding what to build next:

1. check `docs/roadmap/TODO_ROADMAP.md` for active execution order;
2. use this file to judge engineering risk and maturity;
3. use `docs/roadmap/PROJECT_MODULE_AUDIT.md` for candidate discovery only.

## 9. Change Log

1. 2026-05-02: created as a dedicated handoff reference linking roadmap, module audit, hotspots, and test-coverage signals.
2. 2026-05-03 to 2026-05-04: accumulated many extraction and connector notes.
3. 2026-05-19: condensed historical mixed-encoding and long log-style content into a current-state engineering map, refreshed hotspot sizes, and added Contacts / Reminders / World Hub as first-class engineering guidance targets.
