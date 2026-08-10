# Event Runtime And World Hub Status And Handoff

Updated: 2026-08-10

This file is the handoff page for event runtime, relationship runtime, World Hub, and future Cheats work.

## 1. Current Status

Status: `PARTIAL_DONE / EVE-2B_DONE / EVE-2C_USER_ACCEPTANCE_REQUIRED`

Confirmed persistence dependency for future work:

- accepted relationship facts and the provenance needed to audit persistent relationship truth cannot be silently truncated or irreversibly deleted for capacity management;
- ephemeral eligibility checks, rebuildable projections, and explicitly classified operational logs may rotate, but that policy must not erase evidence for already-applied truth;
- reversible cold archival may remove old evidence from the hot runtime set while keeping World Hub review and restore semantics available;
- Event Runtime owns event/proposal definitions and provenance; Relationship Runtime remains the sole owner/writer of long-term relationship truth.
- normalized proposals, validation/review outcomes, and minimal provenance are durable; full AI prompts, raw responses, uncommitted candidates, and transport payloads remain temporary. Approved output that becomes a formal post, scene, long-form, performance, or state-history record is handed to and persisted by its target owner.

What is already landed:

1. shared event runtime foundation: logs, cooldowns, caps, trigger policy, and adapter seams;
2. low-impact relationship fact adapters across Shopping, Food Delivery, Phone, Map, Wallet, and confirmed Calendar events;
3. relationship runtime memory grouping and cleanup baseline;
4. World Hub read-only runtime review and narrow relationship cleanup/review actions;
5. World Hub now distinguishes visible role IDs from runtime entity keys; missing role profiles are labeled as missing/runtime-only contexts rather than fabricating a role ID.
6. relationship memory 4.2 has reached current acceptance for explicit-lineage dedupe and recall/review copy: Chat keeps source-aware recall text, Calendar shows source-audit review detail, and Contacts/World Hub show product-facing related-record summaries.
7. World Hub review quality 4.3 now has a filtered review-pack baseline: event logs can be filtered by module/status and inspected with trigger, reason, adapter, target, and world-variant explanations; relationship facts can be filtered by status/source and inspected with metric-delta, source-record, pending-effect, and supporting-only explanations.
8. Relationship classification Round 4 is landed at the event/runtime seam: low-impact relationship facts now persist `relationshipGate` audit metadata from saved profile category/modifier classification fields only. The pure helper supports high-risk block/confirm/allow decisions for future event packs and tests, but no new high-impact automation is enabled.
9. World Hub can review gate audit metadata read-only in relationship fact detail.
10. Cheats exists as a hidden-system product concept and placeholder, but not as a finished feature lane.
11. Named high-risk relationship gate presets are available in `src/lib/relationship-event-gating.js` for future event packs, so callers can reference preset ids instead of copying hard-gate category/modifier rules.
12. World Pack nonstandard-app template extraction is explicitly not an event/runtime lane in the current slice: the whitelist/review seam and WorldBook Optional capability Packs UI can propose/confirm appBindings only, confirmed entries reuse App Store/Home/target-app context seams, and the flow cannot create event rules, runtime mutations, or World Hub editor responsibilities.
13. Chat social-event review V1 is landed at the event/runtime seam: generated role greetings can become audited pending message requests, while role-initiated refusal, block, restore, and unblock proposals are stored as reviewable runtime proposals and require World Hub approval before Chat changes the communication state. Chat AI responses can now submit normalized `socialEvents`, and the foreground/session event tick can submit a conservative runtime greeting candidate for stranger or declined role contacts through the same review seam.
14. World Hub now explains generated Chat social proposal source and boundaries: reviewers can see whether a proposal came from Chat AI output or the foreground/session tick, inspect trigger policy, and read why Chat, Contacts, and Relationship Runtime stay separated.
15. Settings > AI Automation / 设置 > AI 自动响应 now explains `事件前台 Tick / Foreground event tick` in user-facing terms: users can see whether it is on, which safe checks are currently included, the latest related runtime result, and a direct review path to `世界中枢 / World Hub`.
16. Settings > AI Automation / 设置 > AI 自动响应 now also exposes `惊喜模式 / Surprise Mode` and `模块事件权限 / Module event permissions` for the current runtime pilot lanes: Chat role-contact events, Food Delivery safety events, and Map journey events.
17. Roadmap 4.8 now has an architecture-accepted Mini Scene collaboration contract. Event Runtime may later own trigger eligibility/cooldown/cap/review/provenance for a runtime-origin request, while the shared Mini Scene Module owns the artifact, world/profile transforms, presenter, fallback, and interaction audit. No runtime Mini Scene Adapter is implemented.
18. MJE-3's first Map journey checkpoint adapter and MJE-4 Footprints/place knowledge are user-accepted and integrated locally: completed `en_route` and `near_arrival` checkpoints can request one low-impact local world variant while Map is mounted; Event Runtime owns permission, Surprise Mode, deterministic random selection, cooldown/cap, persistent proposals, provenance, and audit; Map keeps pending review non-blocking, validates exact lineage, and applies only no ETA change or a bounded 120-second delay. Uneventful arrival, arrival dismissal, legacy V2 blocked-journey recovery, and missing/stale proposal recovery remain covered.
19. Roadmap 4.12 now accepts the documentation-only Calendar/Agenda Journey orchestration contract: Event Runtime may later evaluate bounded Agenda Journey and Activity Session snapshots at explicit checkpoints, while source owners retain journey, timer, Calendar, Map, and downstream value truth. Presentation `off` suppresses the popup without disabling eligibility, but only approved low-impact outcomes may auto-resolve. No CJA runtime, adapter, permission, timer, route, or persistence field is implemented.
20. Roadmap 4.14 accepts the cross-module Event Experience direction: no Event desktop app; EVE-2 is now staged as reusable K-pop-first contract/fixtures, separately accepted runtime foundation, then one separately accepted low-risk coordinate-anchored Map vertical slice with explicit expansion. EVE-3 remains a World Hub Event Notebook/review view over existing runtime truth. World Hub is the integrated hidden review entry, while Cheats retains separate privileged authority.
21. EVE-1 is landed in `src/lib/simulation/event-surface-projection.js` and `src/lib/simulation/event-surface-host-registry.js`: existing Map Journey and Chat social proposals can produce deterministic bounded surfaces with stable proposal/source/log references, ownership, state, risk/review, bilingual/accessibility copy, strict optional anchors, expansion targets, and allowlisted request descriptors. Current source records are supplied by their owners; stale sources, invalid anchors, unknown/unbound actions, unavailable states, and unregistered/unsupported hosts fail closed. The host registry starts empty, and the slice adds no route, UI, Store field, persistent projection, Adapter call, or event content.
22. The user-accepted refinement separates Map place focus, presence, and entry from event invitation/execution. Ordinary place-focus Stage 1 is implemented separately with current distance/journey context and no Event placeholder. EVE-2A now freezes the location-aware template and Map Place Session input meaning, but manual-versus-journey provenance fields, explicit place sessions, Event Runtime eligibility/invitations, and persistence remain unimplemented. Module permission, random-event intensity, and presentation mode stay independent, and this changes no EVE-1 code or Event-host registration status.
23. EVE-2A is frozen in `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`, Simulation Event Engine Section 14, and `tests/fixtures/events/kpop-realism-v1/`: the current 101-place Seoul inventory resolves through conservative legacy rules plus exact pack overrides; Event Template V2, Event Instance V1, variant/text/media/Map-session Interfaces and persistence rules are exact; the first reusable archetype is a production arrival briefing across 12 broadcast/agency/production places; and six local/AI/fallback/stale/media/reopen cases are immutable.
24. EVE-2B implements the reusable runtime foundation in `src/lib/simulation/event-contracts.js`, `event-registry.js`, `kpop-realism-event-pack.js`, `event-instance-materializer.js`, and `event-text-composer.js`. `store:simulation` is V2 with durable untruncated `eventInstances`, monotonic instance updates, independent default `local_only` text mode, V1 migration, invalid-restore reporting, and required backup/rollback participation. The optional Composer accepts an injected existing provider call shape, sends bounded safe context only after entry, validates exact choice/outcome/participant IDs, caches success or terminal local fallback, and performs no retry on reopen. This slice adds no Map field, host registration, UI, authored scene asset, or external value mutation.

MJE-3 validation is complete for the non-blocking pending-update revision: the focused Journey/Event/Map-view set passes 5 files / 64 tests; the full Vitest suite passes 200 files / 1363 tests; lint, production build, governance (2 files / 12 tests), and `git diff --check` pass; and the focused Map E2E passes 12/12 across desktop Chromium and Pixel 5.

EVE-1 and its Map/Chat/Simulation neighbors pass 4 focused files / 24 tests; lint, production build, governance at 2 files / 13 tests, and `git diff --check` also pass. The first full-suite run passed its then-current 221 files / 1598 tests. Parallel feature work subsequently expanded the shared tree to 224 files / 1611 tests; the latest full rerun reaches 223 files / 1610 tests and stops outside EVE-1 because `planned-module-registry.test.js` still expects four Shopping presets while the concurrent registry change now exposes six. No E2E was required because EVE-1 adds no route or UI.

EVE-2A documentation/fixture validation is complete: all three fixture JSON files parse; a source-driven Vite check matched the current 101 places, 26 used categories, every category count/icon set and exact override, 12 eligible first-template places, three choice/outcome bindings, and six instance cases; governance passes 2 files / 13 tests and `git diff --check` passes. No runtime or E2E suite was required because this stage adds no behavior or UI.

EVE-2B runtime validation is complete: the focused Event/Simulation set passes 2 files / 16 tests; the expanded persistence set passes 4 files / 52 tests; the bounded-concurrency full Vitest suite passes 226 files / 1647 tests; full lint, production build, governance at 2 files / 13 tests, and `git diff --check` pass. Default full-suite concurrency can expose a pre-existing fixed-40ms IndexedDB mirror timing sensitivity in `persistence-write-result.test.js`; that isolated test passes 13/13, and the full suite passes with four workers. No E2E was required because EVE-2B adds no route or user-facing surface.

Still incomplete:

1. broad affinity/funds/unlock/freeform override controls remain deferred;
2. Cheats still has no frozen unlock source, route shape, or editing surface;
3. high-impact romance/conflict automation remains intentionally deferred.
4. the named high-risk relationship gate presets are now consumed by the Chat social-event review policy for relationship-aware audit/review decisions; broader high-impact romance/conflict automation is still deferred.
5. deeper generated social behavior is still incomplete: broader social-event types, richer scheduling, and relationship-stage effects should build on the landed review seam instead of writing directly to Chat or relationship runtime.
6. Mini Scene trigger integration remains unimplemented; the shared pure foundation is ready, but a named event family and the later persistence/presenter/source-Adapter prerequisites must still be promoted.
7. no host is registered or rendered by default: large-map coordinate cards, event-card clustering, the World Hub Event Notebook, and runtime event presentation remain unimplemented. EVE-2B runtime is complete; EVE-2C Map/UI requires separate implementation acceptance.
8. Destination change, event-driven cancellation, high-impact outcomes, active exploration events, generic popup infrastructure, and Agenda Journey scheduling remain unimplemented.
9. Agenda Journey, Activity Session, Schedule Orchestrator, their Event Runtime adapters, automatic-resolution implementation, and Narrative Timeline remain unimplemented; the accepted CJA contract is documentation only.
10. no location-aware place-entry family, activation-scope schema, locked-teaser projection, Focus Companion runtime, or Activity Session media caller is implemented by the documentation refinement.
11. EVE-2C remains absent: no Map provenance/place session, `Enter`, Map host registration, invitation/detail UI, authored workplace scene asset, or Map Adapter execution exists yet.

## 2. Recommended Next Slice

Roadmap 4.3 review quality and 4.4 service-account continuity are complete. Do not restart either lane from this handoff.

Current safe sequence after the user's event-lane reprioritization:

1. keep landed EVE-1 pure and empty-by-default; do not add persistence, effect authority, implicit host activation, or UI to the projection Modules.
2. preserve the frozen EVE-2A Interfaces/fixtures and selected production-arrival-briefing archetype; change meaning only through a new schema/fixture version.
3. preserve the landed EVE-2B runtime contracts, Simulation V2 migration, one-call/no-retry Composer policy, durable instance retention, and local K-pop fallback; change frozen meaning only through a new schema/fixture version.
4. obtain separate EVE-2C acceptance before adding Map provenance/place-session fields, host registration, `Enter`, cards, detail UI, or scene work. Ordinary place focus and event selection remain separate.
5. keep runtime-trigger explanation readable whenever a new Adapter is explicitly promoted.
6. add the EVE-3 Event Notebook inside World Hub only after its read model and note ownership are frozen; do not turn it into Reminders or Cheats.
7. deepen Chat social scheduling only through the existing audit/review seam and with visible cooldown/cap policy.
8. keep Cheats, CG generation, additional world packs, and closed-page autonomy as separate decisions.
9. when roadmap 4.8 reaches a source-Adapter stage, keep Event Runtime limited to eligibility/provenance and call the shared Interface rather than adding runtime-owned regex or HTML.
10. keep CJA work at documentation-only until the user separately accepts the matching roadmap stage.

## 3. Do Not Do

1. Do not make runtime layers own module-native records.
2. Do not make World Hub the normal data-entry surface.
3. Do not expose Cheats as a default user path.
4. Do not enable high-impact automatic relationship events before review surfaces are stable.
5. Do not gate event decisions on raw `relationshipLabelText` or `relationshipLabelNote`; use saved category/modifier classification fields.
6. Do not copy high-risk romance/conflict gate rules into module adapters; use the named preset seam.
7. Do not let generated friend/block/refusal social events mutate Chat channel state, Contacts display state, or relationship runtime facts outside the landed social-event review seam.
8. Do not let Mini Scene interactions bypass Event Runtime review or source-module validation, and do not make Event Runtime own Mini Scene artifacts or presenters.
9. Do not let a Map journey event run on every timer tick, mutate Map journey truth directly, or start before the roadmap MJE-2 acceptance gate.
10. Do not let Agenda Journey or Activity Session events run on every countdown tick, infer non-travel completion from time/arrival, or bypass the source owner's result validation.
11. Do not interpret Mini Scene mode `off` as disabling event eligibility or as permission to auto-apply a high-impact outcome.
12. Do not create a normal Event Home app or a second event store for host-card projections.
13. Do not let a Map coordinate anchor create a place, alter discovery/visibility, move a role/journey, or authorize an effect.
14. Do not let World Hub event notes become general reminders, or let a World Hub session inherit Cheats authority.
15. Do not call a text model during ordinary ticks, distance updates, place focus, eligibility filtering, or compact invitation rendering; optional text materialization begins only at an approved event-entry/presentation checkpoint and must have a local fallback.
16. Do not put K-pop terminology, place IDs, provider fields, image payloads, or CG policy into the generic Event Runtime engine.

## 4. Must Sync When Working Here

At the end of a meaningful round, check and update:

1. `README.md`
2. this file
3. `PRODUCT_BOUNDARY.md`
4. `WORLD_HUB_AND_CHEATS.md` when World Hub or Cheats meaning changed
5. `IMPLEMENTATION_WORKSTREAMS.md`
6. `docs/process/EVENT_WORKFLOW.md`
7. `docs/architecture/SIMULATION_EVENT_ENGINE.md`
8. `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` when relationship-runtime meaning changed
9. `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
10. `docs/process/RUNTIME_CONTROL_AND_CHEATS_PACK_PLAN.md` when Cheats scope changed
11. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` when Mini Scene trigger/provenance meaning changes
12. `docs/architecture/MAP_JOURNEY_FOOTPRINTS_EXPLORATION_ARCHITECTURE.md` and the Map package when journey checkpoint collaboration changes
13. `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md` and the Map/Calendar package when Calendar, Agenda Journey, Activity Session, Schedule Orchestrator, or Narrative Timeline collaboration changes
14. `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md` when default K-pop content, text generation, place capabilities, media intent, or EVE-2A/2B/2C meaning changes
