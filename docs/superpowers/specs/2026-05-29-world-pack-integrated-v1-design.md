# World Pack Integrated V1 Design

Updated: 2026-05-29

Status: `APPROVED_FOR_IMPLEMENTATION`

Implementation note:

- First block landed World Pack storage, activation review, and World Interface exposure.
- Second block landed user-approved generation from active-pack service-account templates into Chat Directory.

## Goal

Make WorldBook and World Pack usable as one complete setup flow, not as separate TODO fragments.

User-facing outcome:

1. Book stores long source text.
2. WorldBook activates whole documents or selected sections.
3. Changed Book sources can be reviewed with diff before acceptance.
4. World Pack stores a named world configuration.
5. Activating a World Pack shows a review of affected sources, knowledge, templates, app bindings, and service-account templates.
6. World Interface exposes the active pack to Chat/runtime.
7. Service-account template generation grows from the active pack, not from scattered one-off module logic.

## Product Boundary

WorldBook owns world meaning: source text links, global worldview, knowledge points, and role-profile templates.

World Pack owns assembly: which world configuration is active, which app bindings and service-account templates are suggested, and what must be reviewed before activation.

World Interface owns consumption: Chat, runtime, Map, Calendar, and other consumers read the same active world state.

Source modules still own business truth. A service template may suggest a sender identity and notification style, but Shopping, Food Delivery, Logistics, Calendar, Wallet, Map, and other modules keep their own records.

## V1 Scope

V1 uses one active world pack per save.

Included:

- built-in starter packs;
- persisted world-pack list;
- active world-pack id;
- activation review snapshot;
- app binding and service-account template registration inside packs;
- user-approved generation of active-pack service templates into Chat Directory;
- WorldBook UI for pack selection, review, and activation;
- World Interface exposure of the active pack;
- tests for schema, store, interface, and WorldBook UI.

Deferred:

- standalone world-store app;
- token, DLC, marketplace, or unlock economy;
- dynamic app engine;
- automatic creation of service accounts without user approval;
- regex-driven high-impact automation;
- concrete app-archetype behavior beyond safe module binding metadata;
- multi-world simultaneous mixing.

## Information Architecture

WorldBook keeps a progressive path:

- L0 overview: what world is active and what it affects.
- L1 current pack: choose a pack and review its effect.
- L2 source/knowledge/template management: edit the material behind the world.
- L3 future execution: generating service accounts or applying app templates.

For this first integrated slice, Current World Pack is the main interactive section. It must show:

- active pack;
- selectable candidate pack;
- activation state;
- review rows for Book sources, knowledge, templates, app bindings, and service templates;
- blockers if references are missing;
- a single confirm activation action.

## Acceptance

The feature is acceptable when:

- `systemStore.listWorldPacks()` returns default and built-in packs.
- `systemStore.buildWorldPackActivationReview(packId)` explains what activation affects.
- `systemStore.activateWorldPack(packId)` writes the active pack only when review has no blockers.
- `resolveActiveWorldOverview()` and `resolveWorldContextForConsumer()` expose the active pack and pack template counts.
- `CurrentWorldPackPanel` lets a user pick and activate a pack without leaving WorldBook.
- Existing Book source activation and diff review still work.
- Desktop and mobile WorldBook views remain readable.
