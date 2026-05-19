# Event Runtime And World Hub Implementation Workstreams / 事件运行时与世界中枢实施工作流

Updated: 2026-05-19

## 1. Workstream A: Event Engine Foundation

- event registry
- deterministic random helper
- condition evaluator
- simulation store
- adapter seams

## 2. Workstream B: Relationship Runtime

- low-impact fact adapters
- memory-group governance
- pending confirmation logic
- cleanup and recall rules

## 3. Workstream C: World Hub

- runtime review
- pending-effect review
- filtered details
- narrow mutation controls

Current landed guardrail:

- World Hub relationship rows and cleanup dialogs show product-facing `roleId` only when a Contacts role profile exists.
- Missing-profile or runtime-only relationship targets are labeled by runtime key, so `profileId` / `entityKey` are not mistaken for the user's role number.

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
