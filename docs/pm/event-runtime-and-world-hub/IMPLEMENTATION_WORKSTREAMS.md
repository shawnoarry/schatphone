# Event Runtime And World Hub Implementation Workstreams / 事件运行时与世界中枢实施工作流

Updated: 2026-06-01

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

## 5. Semantic Guardrails

Treat these as bugs:

1. World Hub becomes the normal data-entry surface
2. Cheats appears as a default user path
3. runtime layers start owning module-native records
4. high-impact automation is enabled before review surfaces are stable
5. raw `relationshipLabelText` or `relationshipLabelNote` are used as event-decision inputs instead of saved classification fields
6. high-risk gate rules are duplicated in module adapters instead of using the preset seam
7. generated friend/block/refusal social events directly mutate Chat, Contacts, or relationship runtime without the event-runtime audit/review path
8. World Pack app proposal review creates event rules or runtime mutations instead of confirmed appBindings
