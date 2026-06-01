# Event Runtime And World Hub Status And Handoff

Updated: 2026-06-01

This file is the handoff page for event runtime, relationship runtime, World Hub, and future Cheats work.

## 1. Current Status

Status: `PARTIAL_DONE`

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
12. World Pack nonstandard-app template extraction is explicitly not an event/runtime lane in the current slice: the whitelist/review seam and WorldBook Current World Pack UI can propose/confirm appBindings only, confirmed entries reuse App Store/Home/target-app context seams, and the flow cannot create event rules, runtime mutations, or World Hub editor responsibilities.
13. Chat social-event review V1 is landed at the event/runtime seam: generated role greetings can become audited pending message requests, while role-initiated refusal, block, restore, and unblock proposals are stored as reviewable runtime proposals and require World Hub approval before Chat changes the communication state. Chat AI responses are now the first concrete source for those proposals through normalized `socialEvents` output.

Still incomplete:

1. broad affinity/funds/unlock/freeform override controls remain deferred;
2. Cheats still has no frozen unlock source, route shape, or editing surface;
3. high-impact romance/conflict automation remains intentionally deferred.
4. the named high-risk relationship gate presets are now consumed by the Chat social-event review policy for relationship-aware audit/review decisions; broader high-impact romance/conflict automation is still deferred.
5. deeper generated social behavior is still incomplete: background/runtime trigger wiring, broader social-event types, scheduling, and cooldown tuning should build on the landed review seam instead of writing directly to Chat or relationship runtime.

## 2. Recommended Next Slice

1. Move to service-account continuity unless product review identifies another concrete read-only World Hub explanation gap.
2. Keep runtime-trigger explanation readable in product language as new event adapters are added.
3. Freeze Cheats only after World Hub review surfaces are trusted enough.
4. Deepen the landed Chat social-event review seam: connect background/runtime proposal sources, tune cooldown/cap policy, and keep high-risk role-initiated friend/block/refusal changes review-first in World Hub.

## 3. Do Not Do

1. Do not make runtime layers own module-native records.
2. Do not make World Hub the normal data-entry surface.
3. Do not expose Cheats as a default user path.
4. Do not enable high-impact automatic relationship events before review surfaces are stable.
5. Do not gate event decisions on raw `relationshipLabelText` or `relationshipLabelNote`; use saved category/modifier classification fields.
6. Do not copy high-risk romance/conflict gate rules into module adapters; use the named preset seam.
7. Do not let generated friend/block/refusal social events mutate Chat channel state, Contacts display state, or relationship runtime facts outside the landed social-event review seam.

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
