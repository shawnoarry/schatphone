# Event Runtime And World Hub Implementation Workstreams / 事件运行时与世界中枢实施工作流

Updated: 2026-07-31

## 1. Workstream A: Event Engine Foundation

- event registry
- deterministic random helper
- condition evaluator
- simulation store
- adapter seams
- landed Chat social-event review seam for role-initiated greeting, refusal, block, restore, and unblock proposals, including Chat AI output and the narrow foreground/session runtime greeting source

## 2. Workstream B: Relationship Runtime

- low-impact fact adapters
- memory-group governance
- pending confirmation logic
- cleanup and recall rules

Current landed guardrail:

- 4.2 relationship-memory cleanup has reached current explicit-lineage acceptance. Chat should consume source-aware `recallSummary` text for prompt context, while World Hub should use UI-facing related-record summaries and reserve source-audit detail for focused review surfaces.
- Relationship classification Round 4 adds `relationshipGate` audit metadata to current low-impact facts. The metadata is built from saved role-profile category/modifier classification fields only, not raw relationship label/note prose. High-risk hard-gate helper behavior exists for future event packs and tests, but no new high-impact automation is enabled in this workstream.
- High-risk gate presets now live at the relationship-event gating seam, so future event packs should reference preset ids instead of copying category/modifier rule objects into module adapters.
- Generated social/channel events must not bypass relationship classification and review policy: low-risk greetings may auto-apply with audit from Chat AI or the foreground/session runtime source, while friend/block/refusal state changes need explicit review or hard gates before Chat applies them.

## 3. Workstream C: World Hub

- runtime review
- pending-effect review
- filtered details
- narrow mutation controls

Current landed guardrail:

- World Hub relationship rows and cleanup dialogs show product-facing `roleId` only when a Contacts role profile exists.
- Missing-profile or runtime-only relationship targets are labeled by runtime key, so `profileId` / `entityKey` are not mistaken for the user's role number.
- The 4.3 review-pack baseline adds filtered event-log and relationship-fact detail views with product-facing explanations, while still deferring broad value, funds, unlock, and freeform override controls.
- Relationship fact detail may show gate audit metadata read-only; World Hub must not become the main relationship classification editor.
- World Hub now reviews pending generated Chat social proposals before high-risk communication states are applied in Chat.
- World Pack nonstandard-app proposal review remains a WorldBook/appBinding seam; it must not create runtime triggers, event rules, or World Hub editing responsibilities.

## 4. Workstream D: Cheats / 金手指

- unlock source
- visibility/install rule
- route design
- stronger override surface
- explicit safety boundary

## 5. Workstream E: Mini Scene Trigger Collaboration

- begin only when a concrete runtime event family is separately promoted under `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md`
- keep eligibility, cooldown/cap, review, and provenance in Event Runtime
- call the shared Mini Scene Interface with canonical source facts; do not copy world-profile, regex, artifact, or presenter logic into runtime adapters
- treat interaction commands as requests that still pass the owning module's validation and any required runtime review

## 6. Workstream F: Map Journey Checkpoint Collaboration

- MJE-3's first adapter is implemented in the current uncommitted tree and awaits user review; do not widen it or begin MJE-4
- receive bounded canonical Map facts only for completed `en_route` and `near_arrival` checkpoints while Map is mounted; do not evaluate on each animation tick
- keep permission, Surprise Mode, eligibility, deterministic/random gate, cooldown/cap, persistent proposal review, provenance, and logs in Event Runtime
- return only no ETA change or a bounded 120-second delay through the Map adapter and let Map validate exact proposal/event/journey/checkpoint lineage
- keep proposals pending without pausing Map Journey or opening detail automatically; preserve tested no-event, adapter-failure, legacy blocked-journey recovery, arrival dismissal, and missing/stale-proposal paths
- keep destination change, event-driven cancellation, relationship, money, asset, identity, schedule, active exploration, and Agenda Journey effects unimplemented

## 7. Workstream G: Agenda Journey And Activity Session Collaboration

- status is `ARCHITECTURE_ACCEPTED / DOCUMENTATION_ONLY`; follow roadmap 4.12 CJA gates and do not infer implementation authorization from this package
- receive bounded canonical Agenda Journey or Activity Session facts only at explicit start, milestone, completion, or deadline checkpoints; never evaluate on each countdown tick
- keep eligibility, deterministic/random gate, cooldown/cap, module permission, presentation mode, automatic-resolution policy, proposal/review, provenance, and logs in Event Runtime
- keep Agenda Journey state, Activity Session timestamps, Calendar commitments, Map arrival, and all downstream domain truth in their owning modules
- treat `off` as popup suppression rather than event-system disablement, while allowing only owner-approved low-impact automatic outcomes
- reconcile overdue checkpoints idempotently after resume and do not promise exact interactive delivery while a browser/PWA is fully closed or OS-suspended
- implement nothing until the matching CJA stage receives separate user acceptance and persistence/compatibility review

## 8. Semantic Guardrails

Treat these as bugs:

1. World Hub becomes the normal data-entry surface
2. Cheats appears as a default user path
3. runtime layers start owning module-native records
4. high-impact automation is enabled before review surfaces are stable
5. raw `relationshipLabelText` or `relationshipLabelNote` are used as event-decision inputs instead of saved classification fields
6. high-risk gate rules are duplicated in module adapters instead of using the preset seam
7. generated friend/block/refusal social events directly mutate Chat, Contacts, or relationship runtime without the event-runtime audit/review path
8. World Pack app proposal review creates event rules or runtime mutations instead of confirmed appBindings
9. Event Runtime starts owning Mini Scene artifacts/presenters or lets a scene interaction bypass source-module validation/review
10. a Map checkpoint adapter mutates journey, transport, pin, place, arrival, or cancellation truth directly
11. journey eligibility runs on every animation tick or makes an event mandatory for completion
12. MJE-1 transport planning is treated as authorization for the later Map event adapter
13. Agenda Journey or Activity Session eligibility runs on every countdown tick
14. elapsed time or Map arrival is treated as proof that a non-travel activity completed
15. popup mode `off` disables event eligibility or silently auto-applies a high-impact outcome
16. CJA documentation acceptance is treated as authorization to add a route, store, timer, adapter, permission, persistence field, or migration
