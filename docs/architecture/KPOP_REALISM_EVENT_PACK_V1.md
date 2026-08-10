# Default K-pop Realism Event Pack V1 Contract

Updated: 2026-08-10

Status: `EVE-2A CONTRACT_AND_FIXTURES_FROZEN / EVE-2B DONE / EVE-2C DONE 2026-08-10`

## 1. Purpose

This contract defines the first product-focused event pack for SchatPhone's default modern K-pop realism world. It turns the existing generic Event Runtime foundation into a reusable authored-template, optional text-generation, location-aware, host-presented event system without making each place or world implement a separate engine.

This document is a focused architecture and handoff contract. It is not a second roadmap. Live stage status remains in `docs/roadmap/TODO_ROADMAP.md`, and the current safe slice remains in `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`.

No code, route, Store field, persistent event-instance schema, Map host registration, AI request, or new event content is implemented merely because this contract exists.

## 2. Accepted Product Direction

The following direction is accepted for the first implementation:

1. SchatPhone remains local-first. Local code owns event eligibility, trigger checkpoints, deterministic randomness, cooldowns, caps, permissions, effect allowlists, Adapter validation, persistence, and audit.
2. The first product content target is the existing default modern K-pop realism world. The first implementation does not build parallel sci-fi, apocalypse, fantasy, or historical content packs.
3. Engine logic must remain world-neutral. K-pop terminology, copy, assets, role language, and panel presentation belong to the K-pop pack rather than conditional branches in Event Runtime.
4. Runtime AI is optional and text-only for V1. It may materialize richer event prose after a local event is eligible and the user chooses to enter the event surface. It does not generate images, audio, executable actions, effect identifiers, or unbounded numeric outcomes.
5. Ordinary eligibility checks, Map movement, distance updates, foreground ticks, and compact event invitations consume no model tokens.
6. Authored local copy is always available. Network or provider failure must fall back to local variants without blocking the base activity, journey, place entry, or event resolution path.
7. Location and scene imagery should primarily travel with the relevant Map pack or world asset pack. Event Runtime stores semantic media intent and stable asset references only; it does not own image binaries.
8. Later CG generation remains possible through a separate image-generation Module. V1 preserves a versioned media-intent extension point but does not add a CG provider, prompt, setting, visible placeholder, or automatic generation policy.
9. Event receives no normal Home app. Map, Chat, Calendar/Agenda Journey, notifications, and later registered hosts present event invitations and scenes; World Hub remains the hidden review/notebook entry.
10. Exact fully closed-page autonomous simulation remains deferred. Foreground execution and idempotent resume reconciliation are the first supported runtime modes.

## 3. Shared Vocabulary

Use these terms consistently in code, tests, and handoff documents:

| Term | Meaning | World-specific? |
| --- | --- | --- |
| Event archetype | Reusable interaction structure such as check-in, waiting delay, rehearsal interruption, unexpected invitation, or equipment issue | No |
| Event template | Functional trigger, activation scope, conditions, choice IDs, allowed effect requests, cooldown/cap, surfaces, and safety policy | No |
| Event variant | Authored or generated wording and presentation metadata for one template in one world context | Yes |
| Event variant pack | Versioned local library of variants for a world context or content pack | Yes |
| Event instance | One frozen occurrence with template/version, source facts, world/pack lineage, seed, selected variant, materialized text, media references, choices, lifecycle, and outcome references | Per occurrence |
| Place category | Stable place identity class such as broadcast station, entertainment agency, studio, school, hospital, or transit hub | Pack-mapped |
| Place capability | Reusable semantic affordance such as work, meet, record, rehearse, perform, wait, travel, rest, study, receive care, eat, or shop | No |
| Media intent | Semantic request for an authored or later generated background/CG slot; never an executable effect or provider prompt | Per occurrence |

An icon is presentation, not a logic key. Event matching uses stable place categories and capabilities. A building icon cannot distinguish a television station from a hospital, and a future world may use different imagery for the same capability.

## 4. Runtime Chain

The default runtime chain is:

```text
source checkpoint or explicit user action
-> bounded canonical context snapshot
-> local template registry lookup
-> activation/condition/permission/cooldown/cap evaluation
-> deterministic candidate and variant selection
-> zero-token compact invitation or no-event result
-> user chooses to enter the event
-> local Event Instance materialization
-> optional bounded text-generation request
-> schema/content validation and local fallback
-> Event Surface / later Presenter rendering
-> user selects an allowlisted choice ID
-> owning Module Adapter validates and applies the requested effect
-> Event Runtime records lifecycle, provenance, and outcome references
```

`No event` is a complete result. Optional event failure cannot block a Map Journey, place entry, scheduled activity, safety notice, or deterministic source action.

## 5. Local Runtime And Text Generation

### 5.1 Local authoritative work

Local Modules own:

- source checkpoint validity and bounded context collection;
- authored activation scope: `remote`, `nearby`, `onsite`, `interior`, `journey_checkpoint`, or `activity_checkpoint`;
- discoverability and locked-teaser policy;
- condition evaluation, deterministic seed, probability, cooldown, daily cap, module permission, intensity, and presentation policy;
- participant/source/place references and accepted position provenance;
- allowlisted choice IDs, effect request types, numeric bounds, confirmation/review policy, and reversibility;
- instance lifecycle, persistence, reopen behavior, audit, and fallback;
- all final domain mutations through owning Module Adapters.

### 5.2 Optional Event Text Composer

The EVE-2B Event Text Composer receives only a bounded, privacy-reviewed payload containing:

- template and choice IDs plus safe display summaries;
- compact K-pop world-context digest and tone tags;
- current place category/capabilities and scene key;
- relevant participant display facts explicitly allowed for this event;
- bounded schedule, relationship, funds, fatigue, or other facts required by the selected template;
- locally precomputed effect summaries needed to keep prose consistent with allowed outcomes.

It may return:

- title, opening narration, environment description, and bounded dialogue;
- display wording for existing allowlisted choices;
- short consequence prose consistent with precomputed outcomes;
- semantic presentation tags that the local asset resolver may ignore or validate.

It must not return or control:

- executable Adapter keys, new choice IDs, arbitrary commands, code, HTML, or navigation;
- canonical money, relationship, schedule, place, identity, asset, journey, or activity mutations;
- unbounded numeric values or effect ranges;
- external media URLs, generated images, audio, or provider-specific persistence fields;
- new authoritative participants, places, or source records.

The Composer output is untrusted material until normalized against the instance contract. Invalid output falls back to the selected local variant.

## 6. Token And Network Policy

V1 must minimize user token use:

1. never call a model during ordinary Tick evaluation, map pan, distance recalculation, place focus, eligibility filtering, or compact invitation rendering;
2. default to at most one text materialization request per event instance, made only after explicit event entry or another separately approved presentation checkpoint;
3. persist/cache the accepted normalized text with the event instance so reopen, route return, and review do not regenerate it;
4. send a compact world-context digest and event-specific facts, never the full WorldBook, complete Chat history, unrelated role records, or raw Store snapshots;
5. cap participant count, scene beats, dialogue count, choice wording, and total output length in the contract before implementation;
6. use authored local K-pop copy for invitations, low-salience events, offline mode, provider failure, user-disabled generation, and budget exhaustion;
7. keep any optional selected-branch follow-up generation separately gated rather than silently issuing a second request;
8. record minimum provider/model/request provenance needed for diagnostics without persisting full prompts or raw responses by default.

AI event text mode, random-event intensity, module event permission, and presentation mode remain separate controls. Disabling AI text must not disable events.

## 7. K-pop Realism Pack Responsibilities

The first K-pop event pack owns content and presentation data, not engine behavior:

- world/tone vocabulary for contemporary Korean entertainment, production, performance, media, education, travel, retail, health, and ordinary daily life;
- K-pop-specific event variants over generic templates;
- role and workplace display language such as producer, artist, trainee, manager, stylist, writer, director, staff, reporter, security, fan, or guest when the source data supports it;
- scene keys and stable authored asset references;
- background/material selection rules for television stations, entertainment agencies, recording studios, practice rooms, venues, airports/transit, residences, schools, hospitals/clinics, restaurants/cafes, and retail places;
- localized labels and presentation metadata for available value panels;
- local fallback text for every shipped template.

It must not:

- redefine Event Runtime eligibility or persistence;
- write Map, Calendar, Agenda Journey, Activity Session, Wallet, relationship, Chat, Gallery, Music, or role truth directly;
- assume every user role is an idol or every entertainment location exposes the same capabilities;
- fabricate real-person participation, private facts, current schedules, or real venue claims;
- make a specific Seoul place ID the only way to use a generic template.

## 8. Frozen Place Categories And Capabilities

### 8.1 Current-source inventory

The inventory was derived from the current `src/lib/map-packs.js`, `src/lib/seoul-map-places.js`, `src/lib/seoul-map-everyday-places.js`, `src/lib/seoul-map-community-places.js`, and `src/lib/map-place-categories.js` Modules on 2026-08-10.

The default `real-seoul-v1` Map pack has:

- version `1` and 101 read-only positioned places;
- 14 broad taxonomy groups and 31 supported persisted icon-type categories;
- 26 persisted category IDs actually used by the current 101 places;
- 46 distinct current `category + icon` presentation pairs;
- 17 `work` places represented by five different icons, proving that neither `work` nor an icon is precise enough for event eligibility.

The immutable source inventory and complete conservative fallback mapping are in `tests/fixtures/events/kpop-realism-v1/place-semantics-v1.json`.

### 8.2 Resolver contract

The semantic resolver order is:

```text
explicit semantic fields on a future place record
-> exact versioned Map-pack place override
-> conservative legacy category rule
-> unknown category with zero capabilities
```

Names and icons are never logic inputs. Unknown/missing capability data fails closed. This stage does not rewrite the 101 current place records or player pins.

The current K-pop-relevant exact overrides include:

| Semantic category | Current exact places | Capabilities |
| --- | ---: | --- |
| `entertainment_agency` | 7 | `work`, `meet`, `wait` |
| `broadcast_station` | 4 | `work`, `meet`, `wait`, `record`, `perform` |
| `production_center` | 1 | `work`, `meet`, `wait`, `record`, `perform` |
| `news_media_center` | 1 | `work`, `meet`, `wait`, `record` |
| `performance_venue` | 3 | `perform`, `rehearse`, `meet`, `wait`, with `train` only where authored |
| `beauty_service` | 3 | `prepare`, `meet`, `wait` |

The seven agency overrides are SM, HYBE, JYP, YG, Cube, Starship, and FNC headquarters; the four broadcast overrides are KBS, MBC, SBS, and JTBC; CJ ENM is the first `production_center`. These labels are inventory facts, not claims about private rooms, real schedules, or real-person availability. Agency capabilities deliberately omit `record` and `rehearse` until a pack explicitly authors those affordances.

### 8.3 First-template coverage

The selected first template requires category `broadcast_station`, `entertainment_agency`, or `production_center` plus capabilities `work` and `wait`. It therefore reuses one generic template across 12 current places without checking a Seoul ID inside Event Runtime. A different world pack can expose the same categories/capabilities with different names, copy, coordinates, and assets.

## 9. Media And Future CG

V1 scene presentation resolves authored material in this order:

```text
exact Map-pack scene asset
-> place-category asset in the active Map/world pack
-> approved user/Gallery asset reference
-> system generic background
-> text-only scene
```

`MediaIntentV1` is frozen in `docs/architecture/SIMULATION_EVENT_ENGINE.md`, Section 14. It stores one semantic slot/scene key, normalized category/capability/tone tags, and whether media is required. The instance stores only an optional stable resolved reference, resolution reason, and render mode.

The current repository contains overview Map assets but no authored workplace-scene background. EVE-2A therefore treats `workplace.arrival_briefing.lobby` as a semantic key and freezes a complete text-only fallback; it does not claim that a background file already exists. An authored asset may be added with the relevant Map/world pack during a separately accepted presentation slice.

Future CG generation remains another media-resolution Adapter after event text and local outcomes are frozen. It must have independent permission, cost/quota, privacy, safety, candidate/keep/discard, and failure policy. No empty `Generate CG` control, provider selection, automatic generation, prompt, or durable image payload belongs to V1.

## 10. Frozen Contracts, Persistence, And Reopen

The generic exact Interfaces are frozen in `docs/architecture/SIMULATION_EVENT_ENGINE.md`, Section 14. The accepted fixture records are:

- `tests/fixtures/events/kpop-realism-v1/place-semantics-v1.json`;
- `tests/fixtures/events/kpop-realism-v1/template-and-variant-pack-v1.json`;
- `tests/fixtures/events/kpop-realism-v1/instance-cases-v1.json`.

They freeze `EventTemplateV2`, `EventVariantPackV1`, `EventInstanceV1`, `TextMaterializationResultV1`, `MediaIntentV1`, `MapPlaceSessionCheckpointV1`, and `MapPlaceSessionEventResolutionRequestV1` meaning.

Event Runtime remains the persistence owner. EVE-2B adds `eventInstances` to `store:simulation`, increments the Simulation storage version from `1` to `2`, and includes the normalized instances in the required `simulation` backup/restore/rollback section. Migration initializes an empty array for V1 saves and preserves existing logs, cooldowns, daily counters, Chat social proposals, Map Journey proposals, and settings.

Instances are durable authoritative records with no automatic V1 truncation. Reopen uses the stored normalized text and selected outcome without a provider call. Missing source/pack/asset records remain reviewable; stale source disables new choice execution, while missing optional media falls back to text-only. Prompts, raw responses, transport payloads, credentials, temporary media candidates, and copied Map/domain records are excluded.

## 11. Runtime Controls

The following controls remain independent:

1. module event permission: the first template uses the `map` permission;
2. random-event intensity: the first optional template is suppressed at `off` and enabled at low/balanced/high while retaining its cap/cooldown;
3. presentation mode: silent/audited, text, or later richer scene presentation;
4. event text mode: local-only or optional AI-enhanced;
5. future CG mode: independent and absent from V1;
6. source-owner confirmation/review: mandatory for high-impact effects regardless of other settings.

The first archetype is condition-triggered with probability `1` after all controls and eligibility checks pass. Its no-event path remains complete when permission/intensity, capability, active session, cooldown, or cap suppresses it. Map entry itself always proceeds independently.

## 12. Implementation Stages And Current TODO

### EVE-2A: Contract And Fixtures

Status: `DONE 2026-08-10 / NO RUNTIME WRITES`.

Completed:

1. inventoried the 101-place default Map and froze category/capability resolution without mutating Map records;
2. froze all versioned template/variant/instance/text/media and Map input/Adapter Interfaces;
3. froze text limits, one-call/no-retry policy, local-first behavior, cache/reopen, persistence, backup/restore, migration, and retention;
4. selected one reusable low-risk K-pop archetype and completed the Event Entry Audit;
5. added six immutable cases: local-only, AI-enhanced, provider fallback, stale source, missing asset, and reopen without regeneration;
6. kept Store fields, Map host registration/UI, provider calls, and authored scene assets unimplemented.

### EVE-2B: Reusable Runtime Foundation

Status: `DONE 2026-08-10 / NO MAP OR UI WRITES`.

Completed:

1. added strict pure normalizers for `EventTemplateV2`, `EventVariantPackV1`, `EventInstanceV1`, `TextMaterializationResultV1`, and `MediaIntentV1`, plus template and variant-pack registries;
2. added the built-in local K-pop pack and deterministic local Event Instance materializer for `workplace.arrival_briefing` without checking a Seoul place ID;
3. added a provider-neutral Event Text Composer that renders local copy first, permits at most one request, rejects unknown choice/outcome/participant IDs and HTML, bounds context/output, caches accepted or terminal-fallback text, and never retries a reopened instance;
4. upgraded `store:simulation` to version `2` with durable untruncated `eventInstances`, monotonic updates, `local_only` default text mode, V1 migration, restore rejection reports, backup, and rollback participation;
5. added fixture-driven runtime, persistence, migration, backup, no-truncation, AI success, invalid-schema, provider-failure, stale-context, and reopen tests;
6. kept Map provenance, Map Place Session, `Enter`, host registration, event cards/detail UI, authored scene assets, and all external domain mutations absent.

### EVE-2C: First Map/K-pop Vertical Slice

Status: `DONE 2026-08-10 / FIRST MAP K-POP VERTICAL SLICE`.

Completed:

1. upgraded `store:map` to version `3` with Map-owned `manual` versus internally authorized `journey_arrival` position evidence, stable destination-place lineage, durable `inside` / `left` place sessions, and V2 migration;
2. registered exactly one Map Event Surface host and bounded it to the frozen `production-arrival-briefing` K-pop archetype;
3. kept no-event and compact invitation checks local and zero-token, required explicit `Enter` and `Expand event`, and reused local or cached optional text after expansion;
4. exposed exactly three allowlisted choices and required Map owner validation against the active session, revision, place, choice, and outcome; every accepted result reports `canonicalMutation: none`;
5. derived event projections and pins from Event Runtime truth instead of persisting a second Map event record;
6. supported geographic and fictional/custom anchors, fail-closed stale/off-pack instances, stable clustering/stacking, Map-layer coexistence, and return to the owning place;
7. kept coordinates presentation-only: they cannot create a place, move the role, reveal knowledge, or create journey effects.

EVE-3 World Hub Event Notebook, EVE-4 additional templates/hosts/value effects, EVE-5 Mini Scene/CG-rich presentation, Calendar/Agenda Journey implementation, and closed-page backend simulation remain separate later stages.

## 13. Selected First Archetype And Event Entry Audit

Event name: `Production arrival briefing`.

| Audit item | Frozen decision |
| --- | --- |
| Event archetype | generic `arrival_briefing`; K-pop variant `production arrival briefing` |
| Trigger source | condition checkpoint `map.place_session.entered.v1` |
| Source owner | Map owns current position, place relation, provenance, and place session |
| Event owner | Event Runtime owns eligibility, proposal, instance, text state, lifecycle, and logs |
| Adapter action | `map.place_session.validate_event_resolution` |
| Adapter mutation | none; validates active session/revision/place/choice/outcome and returns an acknowledgement |
| Activation scope | `interior` |
| Discoverability | `hidden_until_eligible`; no remote/onsite locked teaser in the first slice |
| Accepted provenance | `manual` or `journey_arrival`, both with stable place/session evidence |
| Place requirements | `broadcast_station`, `entertainment_agency`, or `production_center`; capabilities `work` + `wait` |
| Probability/cap | condition probability `1`; six-hour per-place cooldown; one per place/day |
| Controls | Map module permission, intensity not `off`, presentation mode, independent text mode |
| Surfaces | zero-token compact Map invitation, then explicit Map host detail after entry |
| Choices | `review_brief`, `check_equipment`, `wait_for_staff` |
| Outcomes | `brief_reviewed`, `equipment_checked`, `wait_acknowledged` |
| Text | complete local bilingual variant; optional one-call AI enhancement only after entry |
| Media | semantic lobby background intent; current complete fallback is text-only |
| Side effects | selected choice/outcome and audit references inside the Event Instance only |
| Excluded effects | funds, inventory, relationship, fatigue, identity, schedule, place, position, journey, and asset mutation |
| Dismissal/reversibility | invitation/active event may be dismissed; resolved outcome is immutable; no external mutation needs undo |
| No-event path | place entry remains successful when permission/intensity/cooldown/cap/eligibility suppresses the event |
| Relationship/social gates | none |
| Persistence | current `store:simulation.eventInstances`; required `simulation` backup section |
| Deterministic fixtures | six cases in `instance-cases-v1.json`, plus fixed seed and exact IDs in the template fixture |

Why this is first: it proves location entry, reusable capabilities, local/AI text materialization, three choices, owner validation, persistence, fallback, and reopen without introducing a new value system or coupling the engine to one Seoul place. Later events may request money, relationship, fatigue, schedule, or inventory effects only through separately accepted owner Adapters.

## 14. Acceptance And Validation

EVE-2A closure requires:

- JSON parsing for all three fixture files;
- source inventory matching the current Map pack/taxonomy counts;
- `git diff --check`;
- `npm.cmd run governance:check`;
- no runtime Store, provider, host registration, Map route, or UI change.

Closure result on 2026-08-10: all three JSON files parse; a source-driven Vite check matched 101 places, 26 used legacy categories, every category count/icon set, every exact override ID, 12 eligible first-template places, three choice/outcome bindings, and all six cases; `git diff --check` passed; governance passed 2 files / 13 tests. No runtime or E2E suite was required because EVE-2A changes only contracts, handoffs, and inert fixtures.

EVE-2B behavior requires targeted deterministic normalizer/registry/materializer/store tests plus full lint, unit, build, governance, persistence, backup/restore, and migration checks.

EVE-2B implementation files are `src/lib/simulation/event-contracts.js`, `event-registry.js`, `kpop-realism-event-pack.js`, `event-instance-materializer.js`, `event-text-composer.js`, and `src/stores/simulation.js`. Deterministic coverage is in `tests/simulation-event-runtime-foundation.test.js` plus the existing Simulation and persistence suites. No E2E is required because EVE-2B adds no route or user-facing surface.

Closure result on 2026-08-10: the EVE-2B plus Simulation Store set passes 2 files / 16 tests; the expanded Simulation/persistence-owner/layer set passes 4 files / 52 tests; the full Vitest suite passes 226 files / 1647 tests with four workers. Full lint, production build, governance at 2 files / 13 tests, and `git diff --check` pass. Default full-suite concurrency also passed before the final test-only lifecycle assertion, but can expose an unrelated existing fixed-40ms IndexedDB mirror timing sensitivity under high load; the isolated persistence test and bounded-concurrency full suite pass. The build retains the repository's existing large-chunk warning, and jsdom retains its non-failing MapLibre canvas warnings; neither is introduced by the headless Event Runtime slice.

EVE-2C user-facing flow additionally requires desktop and Pixel 5 Playwright for invitation/no-event, remote disabled `Enter`, manual/journey arrival, place session entry/leave, local-only, mocked AI success, provider fallback, reopen, stale source/anchor, missing asset, choice validation, clustering/stacking, layer coexistence, accessibility, page errors, and zero horizontal overflow.

EVE-2C closure result on 2026-08-10: the focused Map/Event unit and integration set passes 8 files / 109 tests; the full Vitest suite passes 228 files / 1671 tests; full lint and production build pass, with only the existing large-chunk warning. The dedicated Playwright flow passes 6/6 across desktop Chromium and simulated Pixel 5 and records invitation, expanded detail, journey arrival, and off-pack no-event screenshots for both viewports. It covers manual and real-Journey arrival provenance, explicit entry/leave, local text, three-choice resolution/reopen/return, stale/off-pack fail-closed behavior, event stacking with ordinary Map markers, critical Axe checks, page errors, and zero horizontal overflow. This is simulated mobile evidence, not named physical-device proof. Governance and final diff checks are recorded with the implementation handoff.

No live provider smoke is required for deterministic CI. A separately authorized smoke may verify the provider-neutral text Adapter without exposing credentials or making runtime network-dependent.

## 15. Cross-Machine Handoff

On another machine, start in this order:

1. root `AGENTS.md`;
2. `docs/process/AI_WORK_MODE.md`;
3. `docs/roadmap/TODO_ROADMAP.md`, section 4.14;
4. `docs/pm/event-runtime-and-world-hub/README.md`;
5. `docs/pm/event-runtime-and-world-hub/STATUS_AND_HANDOFF.md`;
6. this contract;
7. `docs/architecture/SIMULATION_EVENT_ENGINE.md`, especially Section 14;
8. the three JSON files under `tests/fixtures/events/kpop-realism-v1/`;
9. `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md`;
10. the EVE-2B runtime files and `tests/simulation-event-runtime-foundation.test.js`;
11. the EVE-2C Map adapter, store, surface components, and focused tests when reviewing the completed first UI slice.

Before editing, inspect `git status`, preserve unrelated worktree changes, and verify the current roadmap state. EVE-2C completion does not authorize EVE-3, EVE-4, EVE-5, MJE-5, Mini Scene, CG, Calendar, or Agenda Journey work. Accepted fixtures are immutable: add a new schema/fixture version when meaning changes.

## 16. Resolved Decisions And Remaining Gates

EVE-2A resolved every former open decision:

1. first archetype: Map-sourced production arrival briefing;
2. place semantics: exact pack overrides, conservative legacy fallback, icon/name never used;
3. exact versioned shapes: frozen in Simulation Event Engine Section 14 and fixtures;
4. text: fixed limits, one call, no retry/follow-up, provider-neutral failure codes;
5. persistence: Event Runtime in `store:simulation`, required backup, no automatic instance truncation;
6. media: Map/world pack first, Gallery stable refs optional, text-only fallback, no current authored scene claim;
7. value panel: none in the first slice; no downstream value mutation.

The remaining gates are approvals beyond the completed EVE-2 slice:

1. separate EVE-3 acceptance before adding the World Hub Event Notebook;
2. separate EVE-4 content/Adapter acceptance before adding another host, archetype, content pack, or mutation of a value owned by another Module;
3. separate EVE-5 and media acceptance before adding Mini Scene presentation, authored workplace backgrounds, or future CG.
