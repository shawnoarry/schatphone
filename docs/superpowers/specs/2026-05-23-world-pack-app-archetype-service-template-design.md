# World Pack, App Archetype, And Service Account Template Design

Updated: 2026-05-23

Status: `REVIEW_READY`

## 1. Goal

Design a reusable world-driven template system that lets SchatPhone support built-in worldviews, world-specific app variants, user-created service accounts, and future domain patterns without writing a custom data chain for every new account or app name.

The target outcome:

- users can select or create a world pack;
- a world pack can expose world-specific apps and service accounts;
- the same functional app archetype can appear as different in-world apps;
- user-created service accounts and subscription accounts can be configured through templates;
- source modules keep authoritative business state.

Product rule:

> WorldBook defines meaning. World Pack assembles defaults. App archetypes define reusable behavior. World app bindings rename and constrain that behavior. Service-account templates define communication. Source modules keep truth.

## 2. Current Context

SchatPhone already has several foundations that should be preserved:

- WorldBook stores global worldview text, knowledge points, and role-profile template rules.
- Contacts stores concrete role, self-profile, and NPC values.
- Chat Directory owns Chat-side role binding and service-account entries.
- Chat owns messages, rich message display, and service-account notification history.
- Shopping, Logistics, Food Delivery, Calendar, Map, Wallet, Assets, and Stock own their own records.
- Service notifications already prove the desired boundary: Chat stores display copy and source links; source modules own orders, logistics, wallet entries, routes, and fulfillment state.

Missing product layer:

- there is no registry that says which app archetypes a world can use;
- there is no template layer for world-specific app names, copy, rules, or service-account personalities;
- user-created service accounts do not yet have reusable category templates, push policies, or safe rule parsing;
- future app modes such as hospitals, flights, subscriptions, auctions, or black markets would currently risk becoming one-off implementations.

## 3. Layer Model

### 3.1 WorldBook

Owns:

- global worldview and knowledge points;
- terminology and lore references;
- role-profile template rules;
- Chat, Map, Calendar, and role-context references.

Does not own:

- app business records;
- order, bid, appointment, flight, subscription, or wallet truth;
- service-account message history.

### 3.2 World Pack

Owns:

- a named preset or user-created world configuration;
- enabled app bindings for that world;
- default service-account templates;
- terminology map, tone, risk language, and default module visibility;
- references to WorldBook knowledge points and templates.

Does not own:

- raw WorldBook knowledge text copied into another truth layer;
- module-owned business state.

Example world packs:

- modern parallel world;
- post-disaster survival world;
- idol or fandom parallel world.

These are content presets, not code forks.

### 3.3 App Archetype

Owns:

- reusable product behavior shape;
- state-machine category;
- required source-module capabilities;
- allowed notification event types;
- expected routes and source references.

Examples:

- marketplace or store;
- auction or bidding;
- reservation or slot booking;
- transit or trip;
- subscription or entitlement;
- dispatch or delivery;
- publication or subscription feed;
- task, bounty, or request board.

An archetype is not a visible app by itself. It is the reusable skeleton.

### 3.4 World App Binding

Owns:

- how an archetype appears inside one world pack;
- app name, icon, route label, category, copy, default service accounts, and terminology;
- which features of the archetype are enabled in that world;
- safe event and notification bindings.

Example:

- `auction` archetype + survival world = black market.
- `auction` archetype + idol/fandom world = collectible auction house.

The underlying concepts can still be item, listing, bid, settlement, payment, delivery, notification, and review.

### 3.5 Service Account Template

Owns:

- service-account identity defaults;
- account category;
- tone, language style, and message format;
- push policy;
- event subscriptions;
- action routes back to source modules;
- optional advanced parsing rules.

Does not own:

- authoritative order, appointment, subscription, or wallet state;
- role relationship truth unless explicitly bound through Contacts and Relationship Runtime.

### 3.6 Source Module

Owns:

- business records;
- validation and state transitions;
- event emission;
- route targets;
- storage and migration for its domain.

Examples:

- Shopping owns products, cart, order state, and checkout.
- Food Delivery owns restaurants, menu items, cart, order state, and fulfillment.
- Calendar owns confirmed schedule events.
- Wallet owns ledger entries.
- Map owns trips, routes, and location context.

## 4. Existing App Mapping

Existing apps can enter this system by registration, not rewrite.

| Existing module | Proposed archetype role | World-mappable? | Boundary |
| --- | --- | --- | --- |
| Chat | communication host | yes | owns messages, not source truth |
| Chat Directory | identity and entry manager | yes | owns Chat-side service account entries |
| WorldBook | world meaning layer | core | should not become business-record storage |
| Contacts | role archive | yes | owns concrete person values |
| Shopping | marketplace, store, auction candidate | yes | owns product, cart, and order records |
| Logistics | delivery or tracking | yes | owns tracking-facing communication, not storefront records |
| Food Delivery | dispatch or local service | yes | owns restaurants, menus, carts, and delivery orders |
| Calendar | reservation, appointment, schedule | yes | owns confirmed date and schedule meaning |
| Reminders | cue queue | infrastructure | owns raw cues and follow-ups |
| Map | route, trip, territory, itinerary | yes | owns route and location records |
| Wallet | ledger, funds, subscription payments | yes | owns downstream ledger records |
| Assets | inventory, collection, resource vault | yes, future | needs deeper loop before heavy template use |
| Stock | market, exchange, resource index | yes, future | needs deeper loop before heavy template use |
| World Hub | runtime review | no ordinary world app | optional control/review surface |
| Cheats | stronger override lane | no ordinary world app | future guarded control surface |
| Settings, Network, Backup | platform apps | no deep world mapping | may expose labels or visibility only |

## 5. User-Created Service And Subscription Accounts

Users should not need a developer to add a chain for each custom account.

V1 templates should support:

- account name;
- avatar or icon reference;
- category: publication, service notification, system assistant, role/organization proxy, or custom experimental;
- linked world pack;
- linked app binding or source module, when applicable;
- tone and language style;
- push frequency;
- quiet hours;
- digest mode;
- importance threshold;
- event subscriptions;
- action route targets;
- safe keyword rules;
- optional regex extraction rules.

Regex should be an advanced feature, not the main user path.

Recommended rule hierarchy:

1. structured event bindings first;
2. keyword matching second;
3. regex extraction third;
4. freeform AI interpretation only behind explicit preview and confirmation.

## 6. Event And Notification Flow

Recommended flow:

1. A source module creates or updates a domain record.
2. The source module emits a domain event with source module, source id, optional source event id, and status metadata.
3. The world app binding resolves world-specific copy, terminology, and enabled notification rules.
4. The service-account template resolves sender identity, tone, push policy, and action routes.
5. Chat appends a service notification message if an eligible service account exists.
6. The message stores display snapshot and source references only.
7. Opening the action route returns to the owning module for authoritative state.

This is the same boundary that the current service-notification work already uses.

## 7. World Pack App Creation Flow

V1 should support two creation modes.

### 7.1 Preset World Pack

The user selects a built-in pack. The pack can install suggested:

- WorldBook knowledge points;
- role-profile templates;
- app bindings;
- service-account templates;
- default terminology;
- default Home visibility.

The user reviews before activation.

### 7.2 User-Created World App

The user creates a world-specific app by choosing:

1. world pack;
2. app archetype;
3. app name and description;
4. terminology overrides;
5. service-account templates;
6. push and event rules;
7. safe route/action targets;
8. preview data.

The created app binding should reference an existing module/archetype unless the product has approved a new archetype.

## 8. Template Versioning And Review

World packs, app bindings, and service-account templates must be versioned.

When a template changes:

- existing records are not silently rewritten;
- source module records remain authoritative;
- service-account message history remains historical;
- users can review whether to apply new labels, routes, notification rules, or service-account copy;
- old bindings can remain active until the user migrates them.

Hard rule:

> Template updates may change future generation and display defaults, but must not silently rewrite user-created records or historical messages.

## 9. Scope Decision For V1

Recommended V1 scope:

- one primary active world pack per save or profile context;
- multiple WorldBook knowledge points can supplement context;
- app bindings carry `worldPackId`;
- service accounts carry `worldPackId` and optional `worldAppBindingId`;
- domain records can carry optional world/source references when needed;
- cross-world mixing stays future and must use explicit scoping.

Reason:

- multiple active worlds create prompt, terminology, routing, and event-rule conflicts;
- V1 should prioritize understandable ownership over maximum flexibility;
- future multi-world mode can be added through explicit `worldScope` fields.

## 10. Safety Rules

1. World Pack must not duplicate WorldBook as a second lore truth layer.
2. WorldBook must not store ordinary app business records.
3. App bindings must not mutate source module state by copy or side effect.
4. Service-account templates may create messages, but not domain truth.
5. Regex rules must not directly trigger high-impact business state changes.
6. AI-generated interpretation must preview before it creates durable records.
7. High-impact actions such as payments, relationship changes, unlocks, or destructive updates require source-module confirmation or a reviewed runtime adapter.
8. Chat service notifications should only target existing or user-approved service accounts.
9. World Hub and Cheats remain review/control surfaces, not everyday world apps.

## 11. Implementation Planning Units

This design is larger than one coding slice. It should be decomposed before implementation.

Recommended plan order:

1. registry-only foundation for app archetypes and world app bindings;
2. world pack storage and activation review;
3. service-account template schema and editor baseline;
4. adapt existing Shopping, Logistics, and Food Delivery notifications to consume binding/template copy;
5. add a first reusable marketplace/auction binding;
6. add reservation, transit, and subscription archetypes only when a source module needs them;
7. add import/export or shareable packs after local ownership is stable.

## 12. Non-Goals For V1

Do not include in V1:

- fully dynamic app engine that can invent new source-module state machines;
- multi-world simultaneous mixing without explicit scope;
- regex-driven high-impact automation;
- automatic creation of service accounts without user approval;
- automatic rewriting of historical app records or messages after template edits;
- visual redesign of every mapped app;
- backend closed-page event processing.

## 13. Product Decisions Needed

Before implementation planning, confirm:

1. whether V1 uses one active world pack per save, or one active world pack per profile/thread;
2. the three built-in world pack themes and their first app bindings;
3. which archetype should be implemented first beyond current service notifications;
4. whether user-created apps can appear on Home in V1 or stay as template/config entries first;
5. how much regex power is acceptable in V1.

Recommended answers:

1. one active world pack per save for V1, with scoped fields prepared for future expansion;
2. modern parallel, post-disaster survival, and idol/fandom parallel as initial content candidates;
3. marketplace/auction first because Shopping, Logistics, Food Delivery, Wallet, and Chat service notifications already support much of the chain;
4. allow Home entries only after a binding has a real source module route;
5. regex can extract and classify, but cannot perform high-impact writes by itself.

## 14. Acceptance Criteria

This design is ready for implementation planning when:

1. WorldBook and World Pack ownership are accepted as separate but connected layers.
2. Existing apps are mapped through registration, not rewritten.
3. Service-account templates preserve the current Chat/source-module boundary.
4. At least one V1 world-pack scope rule is selected.
5. The first archetype implementation target is selected.
6. PM accepts that this is a multi-slice architecture lane, not a single small UI task.
