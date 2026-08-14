# Event Runtime And World Hub Status And Handoff

Updated: 2026-08-14

This file is the handoff page for event runtime, relationship runtime, World Hub, and future Cheats work.

## 1. Current Status

Status: `PARTIAL_DONE / EVE-4A_TECHNICAL_SPIKE_COMPLETE / PRODUCT_ACCEPTANCE_WITHDRAWN / EVE-4B_OWNER_NATIVE_FOOD_CHAIN_IMPLEMENTED 2026-08-14`

Confirmed persistence dependency for future work:

- accepted relationship facts and the provenance needed to audit persistent relationship truth cannot be silently truncated or irreversibly deleted for capacity management;
- ephemeral eligibility checks, rebuildable projections, and explicitly classified operational logs may rotate, but that policy must not erase evidence for already-applied truth;
- reversible cold archival may remove old evidence from the hot runtime set while keeping World Hub review and restore semantics available;
- Event Runtime owns event/proposal definitions and provenance; Relationship Runtime remains the sole owner/writer of long-term relationship truth.
- normalized proposals, validation/review outcomes, and minimal provenance are durable; full AI prompts, raw responses, uncommitted candidates, and transport payloads remain temporary. Approved output that becomes a formal post, scene, long-form, performance, or state-history record is handed to and persisted by its target owner.
- Map World Suite inspection consumes `src/lib/simulation/map-pack-reference-projection.js` as a body-free external reference projection. Active Event Instances and pending Map Journey proposals count as current use; terminal instances and reviewed/applied/dismissed proposals remain historical protection. Only stable reference IDs and `mapPackId` cross the seam.

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
20. Roadmap 4.14 accepts the cross-module Event Experience direction: no Event desktop app; EVE-2 landed the reusable K-pop-first contracts, runtime, and one low-risk Map vertical slice; EVE-3 now lands the World Hub Event Notebook over existing runtime truth. World Hub is the integrated hidden review entry, while Cheats retains separate privileged authority.
21. EVE-1 is landed in `src/lib/simulation/event-surface-projection.js` and `src/lib/simulation/event-surface-host-registry.js`: existing Map Journey and Chat social proposals can produce deterministic bounded surfaces with stable proposal/source/log references, ownership, state, risk/review, bilingual/accessibility copy, strict optional anchors, expansion targets, and allowlisted request descriptors. Current source records are supplied by their owners; stale sources, invalid anchors, unknown/unbound actions, unavailable states, and unregistered/unsupported hosts fail closed. The host registry starts empty, and the slice adds no route, UI, Store field, persistent projection, Adapter call, or event content.
22. The user-accepted refinement separates Map place focus, presence, and entry from event invitation/execution. Ordinary place-focus Stage 1 remains distinct, and EVE-2C has now implemented manual-versus-journey provenance, explicit place sessions, eligible-only invitations, and exactly one registered Map host. Module permission, random-event intensity, and presentation mode remain independent.
23. EVE-2A is frozen in `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`, Simulation Event Engine Section 14, and `tests/fixtures/events/kpop-realism-v1/`: the current 101-place Seoul inventory resolves through conservative legacy rules plus exact pack overrides; Event Template V2, Event Instance V1, variant/text/media/Map-session Interfaces and persistence rules are exact; the first reusable archetype is a production arrival briefing across 12 broadcast/agency/production places; and six local/AI/fallback/stale/media/reopen cases are immutable.
24. EVE-2B implements the reusable runtime foundation in `src/lib/simulation/event-contracts.js`, `event-registry.js`, `kpop-realism-event-pack.js`, `event-instance-materializer.js`, and `event-text-composer.js`. Durable untruncated `eventInstances`, monotonic instance updates, independent default `local_only` text mode, invalid-restore reporting, and required backup/rollback participation remain intact. The optional Composer accepts an injected existing provider call shape, sends bounded safe context only after entry, validates exact choice/outcome/participant IDs, caches success or terminal local fallback, and performs no retry on reopen.
25. EVE-2C is complete with Map V3 position provenance/place sessions, exactly one Map host, zero-token invitation/no-event behavior, explicit `Enter` and expansion, three Map-validated `canonicalMutation: none` choices, fail-closed anchors, clustering/stacking, layer coexistence, and return context.
26. EVE-3 is complete in `src/lib/simulation/event-notebook.js`, `src/stores/simulation.js`, and `src/views/ControlCenterView.vue`: one deterministic read model merges explicitly linked runtime truth without duplicating it; `store:simulation` V3 persists stable event-scoped review notes with V1/V2 migration and backup/restore; World Hub provides counts, source/module/status filters, selected-event lineage and stale-source detail, plus add/edit/delete note actions. Notes survive event-log rotation and cannot be moved across event references. Notebook interaction does not execute Adapters, retrigger events, mutate logs/proposals/instances, create Reminders/Calendar plans, or grant Cheats authority.
27. EVE-4A is retained only as a completed technical spike; product acceptance is withdrawn. The generic Food Delivery host, order-card `Dispatch brief`, local expansion/acknowledgement, and manual update action that manufactured a delay are removed. The valuable seam remains: Food Delivery's owner action stores only an exact successful Runtime log reference, rejects injection/rebinding/log reuse, writes `rider_delay` / `eta_update` into canonical `order.etaMinutes` plus the native order timeline, and uses the existing Chat dispatch notification. Event Runtime coordinates the cause and audit; Food Delivery owns the business mutation and presentation.
28. Foreground event ticks now resolve the current Book-backed world context on every execution. Changing or relinking active setting text takes effect on the next tick without rebuilding the controller, and compatibility fallback text is not mixed into a readable active Book setting.

MJE-3 validation is complete for the non-blocking pending-update revision: the focused Journey/Event/Map-view set passes 5 files / 64 tests; the full Vitest suite passes 200 files / 1363 tests; lint, production build, governance (2 files / 12 tests), and `git diff --check` pass; and the focused Map E2E passes 12/12 across desktop Chromium and Pixel 5.

EVE-1 and its Map/Chat/Simulation neighbors pass 4 focused files / 24 tests; lint, production build, governance at 2 files / 13 tests, and `git diff --check` also pass. The first full-suite run passed its then-current 221 files / 1598 tests. Parallel feature work subsequently expanded the shared tree to 224 files / 1611 tests; the latest full rerun reaches 223 files / 1610 tests and stops outside EVE-1 because `planned-module-registry.test.js` still expects four Shopping presets while the concurrent registry change now exposes six. No E2E was required because EVE-1 adds no route or UI.

EVE-2A documentation/fixture validation is complete: all three fixture JSON files parse; a source-driven Vite check matched the current 101 places, 26 used categories, every category count/icon set and exact override, 12 eligible first-template places, three choice/outcome bindings, and six instance cases; governance passes 2 files / 13 tests and `git diff --check` passes. No runtime or E2E suite was required because this stage adds no behavior or UI.

EVE-2B runtime validation is complete: the focused Event/Simulation set passes 2 files / 16 tests; the expanded persistence set passes 4 files / 52 tests; the bounded-concurrency full Vitest suite passes 226 files / 1647 tests; full lint, production build, governance at 2 files / 13 tests, and `git diff --check` pass. Default full-suite concurrency can expose a pre-existing fixed-40ms IndexedDB mirror timing sensitivity in `persistence-write-result.test.js`; that isolated test passes 13/13, and the full suite passes with four workers. No E2E was required because EVE-2B adds no route or user-facing surface.

EVE-2C validation is complete: the focused Map/Event set passes 8 files / 109 tests and the full Vitest suite passes 228 files / 1671 tests. Full lint and production build pass; the dedicated user-facing flow passes 6/6 across desktop Chromium and simulated Pixel 5 with accessibility, page-error, layer-coexistence, and zero-horizontal-overflow checks. Eight screenshots cover invitation, expanded event, journey arrival, and off-pack no-event states. This is not physical-device evidence.

EVE-3 validation is complete: the focused Notebook/Simulation/World Hub/persistence set passes 4 files / 37 tests; the bounded-worker full Vitest suite passes 239 files / 1767 tests; full lint, production build, governance at 2 files / 13 tests, and dedicated Playwright pass. The browser flow passes 2/2 across desktop Chromium and simulated Pixel 5 with critical Axe, page/console-error, source-immutability, reopen, and zero-horizontal-overflow checks. Four screenshots cover note-present and note-empty states. This is not physical-device evidence. Default high-concurrency Vitest exposed one unrelated 5-second image-bed fixture timeout; the file passes 12/12 alone and the complete suite passes with two workers.

The original EVE-4A card validation remains historical spike evidence only and no longer establishes product acceptance. The correction removes those dedicated surface tests/screenshots and replaces them with focused owner-chain coverage for canonical ETA, native timeline, Chat notification, exact lineage, backup compatibility, injection/rebinding/log-reuse rejection, and absence of the manual trigger/`Dispatch brief`. Final correction validation passes 6 focused files / 143 tests; the complete Vitest suite passes 245 files / 1821 tests with two workers; lint, production build, governance at 2 files / 14 tests, and `git diff --check` pass. The owner-native Moon Bistro and Jade Hearth flows pass 4/4 across desktop Chromium and simulated Pixel 5, including absence of the withdrawn Surface/manual trigger, minimum control sizing, real keyboard focus visibility, reduced-motion behavior, critical accessibility checks where covered, page-error checks, and zero horizontal overflow where covered. The default high-concurrency full run first reached 243 files / 1819 tests and hit unrelated fixed-five-second timeouts in image-bed fixture and persistence bootstrap tests; both files passed independently before the bounded-worker full suite passed. This is not physical-device evidence, and the withdrawn surface screenshots must not be reused as current product proof.

EVE-4B is implemented as the first accepted owner-native causal chain: paid Food Delivery checkout creates the Wallet commerce payment and Map-owned courier journey; a deterministic Runtime gate records either a durable no-event path or the `food_delivery.delivery_address_change_escalation.v1` lineage; Food Delivery owns the native order conversation and timeout state; Phone owns the text-call shell and transcript; Food Delivery validates the address revision and Map reroute; delivery completion closes the chain. `store:simulation` V4 persists only owner references and audit checkpoints (`canonicalMutation: none`) and does not register a Food Delivery Event Surface or copy order/payment/message/transcript/route bodies. Focused owner/runtime tests pass; the full Vitest suite passes 262 files / 1928 tests; lint, build, governance, and `git diff --check` pass. The direct Moon Bistro owner-native browser flow passes on desktop Chromium and simulated Pixel 5; a full Playwright run was bounded separately and is not claimed as complete. This is not physical-device evidence.

Still incomplete:

1. broad affinity/funds/unlock/freeform override controls remain deferred;
2. Cheats still has no frozen unlock source, route shape, or editing surface;
3. high-impact romance/conflict automation remains intentionally deferred.
4. the named high-risk relationship gate presets are now consumed by the Chat social-event review policy for relationship-aware audit/review decisions; broader high-impact romance/conflict automation is still deferred.
5. deeper generated social behavior is still incomplete: broader social-event types, richer scheduling, and relationship-stage effects should build on the landed review seam instead of writing directly to Chat or relationship runtime.
6. Mini Scene trigger integration remains unimplemented; the shared pure foundation is ready, but a named event family and the later persistence/presenter/source-Adapter prerequisites must still be promoted.
7. exactly one production Event Surface host remains registered: Map for the frozen production-arrival-briefing archetype. Food Delivery now participates through the EVE-4B owner-native order conversation, system notification, text-call shell, Wallet payment reference, and Map courier reroute without a Surface. Additional hosts and event families remain unimplemented and separately gated under EVE-4.
8. Destination change, event-driven cancellation, high-impact outcomes, active exploration events, generic popup infrastructure, and Agenda Journey scheduling remain unimplemented.
9. Agenda Journey, Activity Session, Schedule Orchestrator, their Event Runtime adapters, automatic-resolution implementation, and Narrative Timeline remain unimplemented; the accepted CJA contract is documentation only.
10. no locked-teaser family, Focus Companion runtime, or Activity Session media caller is implemented; the completed location-aware family remains limited to interior production arrival briefing.
11. EVE-2C adds no authored workplace scene asset: Map/world media remains optional and the current text-only fallback is complete.

## 2. Recommended Next Slice

Roadmap 4.3 review quality and 4.4 service-account continuity are complete. Do not restart either lane from this handoff.

Current safe sequence after the user's event-lane reprioritization:

1. keep landed EVE-1 pure and empty-by-default; do not add persistence, effect authority, implicit host activation, or UI to the projection Modules.
2. preserve the frozen EVE-2A Interfaces/fixtures and selected production-arrival-briefing archetype; change meaning only through a new schema/fixture version.
3. preserve the landed EVE-2B runtime contracts, Simulation V3 migration chain, one-call/no-retry Composer policy, durable instance retention, durable review notes, and local K-pop fallback; change frozen meaning only through a new schema/fixture version.
4. preserve the completed EVE-2C Map V3 provenance/place-session boundary, single explicit host, ordinary-place/event selection split, zero-token no-event path, and no-external-mutation owner validation.
5. keep runtime-trigger explanation readable whenever a new Adapter is explicitly promoted.
6. preserve the completed EVE-3 Notebook as a read model over owner truth: keep notes event-scoped, durable, and independently deletable; do not turn it into Reminders, Calendar planning, source mutation, or Cheats.
7. preserve the EVE-4A lineage and the accepted EVE-4B Food Delivery owner-native chain, but do not restore the withdrawn host/card/manual-trigger product slice. Any later EVE-4 work must be separately accepted with named participating Modules, trigger/checkpoints, owner truth, Adapter requests, native presentation, real user/system behavior, downstream conditions, side effects, reversibility, persistence, fallback, and tests.
8. deepen Chat social scheduling only through the existing audit/review seam and with visible cooldown/cap policy.
9. keep Cheats, CG generation, additional world packs, and closed-page autonomy as separate decisions.
10. when roadmap 4.8 reaches a source-Adapter stage, keep Event Runtime limited to eligibility/provenance and call the shared Interface rather than adding runtime-owned regex or HTML.
11. keep CJA work at documentation-only until the user separately accepts the matching roadmap stage.

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
17. Do not let a host accept a projection whose `host_detail.hostKey` points at another host, and do not treat a source-created or duplicated runtime-log ID as valid lineage.

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
