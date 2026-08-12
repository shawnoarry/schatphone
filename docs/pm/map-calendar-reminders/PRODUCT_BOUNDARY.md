# Map Calendar Reminders Product Boundary

Updated: 2026-08-10

This file defines ownership boundaries for Map, Calendar, future Agenda Journey/Activity Session, Reminders, and Phone-like callback support.

## 1. Map

Map owns:

- route
- trip
- Map-owned journey planning, transport snapshot, lifecycle, and checkpoint transitions as their staged runtime lands
- location
- ETA and travel context
- per-world local map-pack binding, recommendation fallback, and version identity
- custom map-pack metadata that references a Gallery-owned source image
- player-created places, detailed player-pin administration, and canonical real/fantasy coordinates
- deterministic local distance estimation when route planning is absent
- passive Footprints progression and later confirmed exploration/discovery records
- active-journey music/radio entry visibility, journey-context labeling, and focused Map panel presentation
- future Event Surface Projection anchor validation, pin/card placement, clustering/stacking, selection, explicit expansion, and return context for approved host cards

Map does not own:

- shopping orders
- food orders
- wallet ledgers
- confirmed schedule meaning
- relationship truth
- journey-event eligibility, random selection, cooldowns, caps, proposal review, or Event Runtime logs
- canonical event/proposal records, another Module's source records, or authority to apply an effect from a surface projection
- Mini Scene world-profile resolution, regex execution, artifacts, or presenters
- device-location truth, live traffic, navigation, or third-party POI truth
- commercial map-provider billing or provider-specific place identity
- Gallery asset bytes, image-generation credentials, or temporary generated candidates
- Music credentials, provider endpoints, audio URLs, local media IDs, playable-track resolution, queue/radio construction, audio runtime, or global floating-player ownership

Map may expose an immutable World Suite inspection projection over its own pack metadata and bounded cross-owner references, but this does not make World Suite a Map, Gallery, Event Runtime, or Chat owner. The projection may classify built-in, user custom, and explicitly Catalog-managed native identity; report active, historical, Gallery, capacity, and user-modification evidence; and project only stable reference IDs from persisted Event records and Chat location cards. It cannot copy chat/event bodies, activate a pack, bind a world, relocate the role, alter a place or Journey, or delete a Gallery asset. Catalog provenance/authored-place round-trip, structured Map write receipts, Gallery deletion/replacement hard-reference protection, current/historical Event/Chat inspection, rollback-safe native mutations, and the resolver-backed Owner Adapter are implemented. The Owner Adapter resolves content outside the manifest, accepts only trusted normalized canvas packs, consumes a pre-existing Gallery asset, preserves topology unless an explicit migration exists, and never crosses into activation or Gallery mutation. It remains unavailable to product callers until real Catalog and registry composition is separately registered.

Map may later request a Mini Scene from a confirmed trip/location event using canonical Map facts. Its per-module popup mode remains a user setting, and any interaction that requests a route/location change returns to Map validation.

Everyday place use does not mutate coordinates by dragging. Map Settings owns new-place creation, edit/delete management, category assignment, and explicit arbitrary-point coordinate creation/reselection for player pins; the everyday Map browses, filters, controls visibility, selects destinations, and links to that manager without hosting a second creation form. Map-pack places remain versioned read-only content. Address or description text is display/search metadata and never geocodes or places a marker. A canonical coordinate is required for rendered pins: geographic packs store provider-neutral latitude/longitude, while fictional/custom packs store normalized canvas coordinates. Coordinate creation/reselection is an exclusive interaction mode: saved markers become pointer-transparent until the new coordinate is accepted or cancelled, and label, description, category, and existing coordinate drafts remain editor-owned throughout the round trip. Seoul V1's curated real-place catalog is a dated local snapshot with stable Map IDs and provider-neutral coordinates, not a live POI mirror. `MapSceneCanvas` is the renderer seam: OpenFreeMap + MapLibre renders geographic packs, while `LocalMapCanvas` renders fictional/custom packs and the geographic fallback. External style, network, or WebGL startup failure before the first ready state cannot mutate saved place, trip, world-binding, or coordinate truth, and local interactions remain available through the fallback. The renderer cannot load POI, public-transit, or route services or make provider identifiers canonical Map identity. The old `/map/labs/kakao-compare` path is compatibility-only and redirects to `/map`.

Reality-anchored Food Delivery branches are still ordinary Map-owned pack places. Map owns their stable ID, bilingual public address, aliases/search terms, and reviewed coordinate; Food Delivery may reference that ID as its setting/source anchor but retains restaurant, menu, bag, order, and delivery-event truth. Public place evidence may establish a branch and coordinate, but Map must not infer an official menu, price, campaign, affiliation, or live-POI update from that evidence.

The everyday Map surface uses progressive disclosure. The idle state keeps the map, destination search, a non-GPS canonical role-position focus plus explicit arbitrary-point role-position action, and independent Journey, Places, and Footprints buttons; each button opens only its focused drawer content, without a duplicate three-way navigation row inside the drawer. The Places drawer offers browsing and a single explicit link to the Settings-owned Places-and-Pins manager, where place creation and all detailed pin administration live. While traveling, the static coordinate focus is relabeled as the start position, role-position reselection is unavailable, and a persistent primary journey card shows route, phase, progress, remaining time, ETA, and pending route updates; this does not imply live position, route geometry, or movement tracking. Arrived journeys retain the card for settlement. A route card requires explicit destination intent, an active/arrived trip, or an explicit transit-app context. Journey start and destination accept free text or an explicit current-world place selection and become read-only once traveling or arrived. The top-level search remains available during traveling, paused, and arrived states for known-place discovery, coordinate focus, and read-only place detail; it cannot change the locked destination, start, or role position, and unmatched text cannot create a new plan in those states. Search is a current-world local-pin index over known positioned pack/player places; category controls wrap across search, Places, and Settings so every available option remains reachable; and ranked matching normalizes width, case, accents, punctuation, word order, broad-category semantics, stable icon-subtype semantics, optional aliases/search terms, and bounded Latin typos. Every new player place automatically participates through its standard name/address/category fields. Selecting a result focuses its canonical coordinate and opens place detail, and unmatched text remains an explicit free-form destination without invoking POI/geocoding services. Map visibility is a persisted presentation preference, not place knowledge: broad-category and individual-place controls affect rendered markers only, known-but-hidden places remain searchable and usable, and selecting a hidden place may reveal that marker for the active detail context. Category selection filters the Places catalog and never silently changes marker visibility. A blank map point may become the persisted role coordinate while idle, but this is authored world state rather than device location or geocoding. Place details require an explicit marker or search-result selection, and fictional faction legends start collapsed. Place taxonomy has two compatible levels: user-facing broad groups own browse, filter, visibility, and category-label semantics, while stable existing subtype IDs own the concrete icon/tone and persisted place value. Map Settings exposes all icon subtypes grouped beneath their broad label, and selecting an icon automatically determines that label without migrating existing category IDs. Store-level seeded trip defaults remain compatible but do not create visible destination intent by themselves.

During traveling and paused journey phases, Map may present one compact music/radio button and focused bottom panel. The panel consumes only Music's bounded now-playing, quick-track, and station projections; every play/radio action is an explicit user gesture delegated to Music. The Map panel stays above the Music-owned floating player while open. Closing the panel or ending the journey never stops Music, closes its floating player, or transfers queue/source ownership into Map.

Place knowledge is Map-owned, persisted per world and partitioned by map pack. Old saves and missing policy data normalize to `all_known`. In optional `footprint_gated` mode, eligible authored convenience stores and pharmacy districts are absent from markers, search, journey pickers, Places, and Settings until a completed journey resolves to a canonical destination coordinate within the deterministic discovery radius. Each reveal retains stable place ID, source trip ID, and discovery time. New journeys snapshot world/map-pack lineage for this purpose. Switching policy preserves discoveries. Manual role-position changes, cancelled journeys, and marker-visibility actions cannot reveal places. Event-based stable-place reveal, generated candidate places, keep/discard ownership, and active exploration remain separately gated.

The current ordinary place-focus Stage 1 provides one Map-owned overview/detail sheet over existing truth: an idle remote place offers Map Journey planning, a place viewed during a locked journey offers the existing journey without changing its destination, exact current-position context suppresses redundant travel, and deeper language/placement controls replace rather than nest over the overview. Immediate relocation remains a secondary sandbox action and creates no Map Journey. This Stage 1 adds no provenance or place-session schema. The accepted later target adds explicit Map-owned onsite/inside sessions, `manual` versus `journey_arrival` provenance, `Enter`/leave behavior, and bounded entry checkpoints. Event Runtime may then evaluate eligibility, but a place card still shows no permanent Event entry and distance cannot reclassify an onsite/interior template as remote.

Map Journey, Footprints, and Exploration have distinct meanings. A Map Journey goes to a known destination. Footprints passively summarize completed travel/exploration through history, familiarity, points, area activity, and optional nearby authored-place reveals. Active Exploration spends time in an area and may produce an explicitly accepted candidate discovery. The current Footprints dashboard is passive; unlocking an area or revealing a pre-authored nearby facility cannot imply that active exploration or generated discoveries already exist.

The Map Journey Runtime is a Map-owned domain Module, not the future Agenda Journey app. Transport choice belongs to Map Journey planning, and Map Settings may later own versioned static transport modes/lines/stations/topology. MJE-2 keeps planning form state separate from persisted active-journey truth, adds only deterministic duration-based checkpoints, and keeps pause/resume/cancel validation in Map; it is user-accepted and integrated locally. MJE-3 evaluates a bounded Map snapshot only when a completed `en_route` or `near_arrival` checkpoint is observed while Map is mounted. Event Runtime owns eligibility, cooldown/cap, proposal/review, provenance, and logs; Map validates exact result lineage and currently applies only no ETA change or a bounded 120-second delay. A pending proposal is reviewable but never pauses Map Journey, stops automatic arrival, or opens detail automatically. Map persists only evaluated checkpoint IDs, one pending-review compatibility reference, and cumulative event-delay seconds; Event Runtime proposal copy/audit do not become Map truth. Journey schema V3 migrates V2 event-blocked journeys back to active timing without losing remaining time or proposal lineage. A future Agenda Journey step may request Map travel and retain stable evidence, but cannot write Map Journey truth or make arrival prove completion of a non-travel activity. Destination change, event-driven cancellation, high-impact owner mutation, and active exploration remain unimplemented. A future Transit app may present the same static or live network only after it has independent utility and must consume, not duplicate, Map Journey truth.

Roadmap 4.14 keeps the future large-map event-card lane separate from MJE-5. EVE-1 has landed the shared pure projection/empty-host-registry Interface without registering Map or changing Map state. EVE-2A has frozen a read-only current-place semantic overlay, `MapPlaceSessionCheckpointV1`, and a no-external-mutation resolution-validation Interface for one interior production-arrival-briefing archetype; none is implemented in Map yet. EVE-2B has completed Event-owned runtime/instance/text-materialization work without Map writes. Only EVE-2C may add Map-owned provenance/session truth and render the approved slice at a valid geographic or fictional/custom coordinate/place. Invalid/off-pack anchors remain reviewable without an invented position. `Expand event` is presentation/navigation only; every result returns through the source owner's Adapter. Authored scene images may be referenced from Map/world packs, but Map does not own optional event text generation or later CG candidates.

## 2. Calendar

Calendar owns:

- confirmed events
- real schedule/date meaning
- confirmed schedule-like reminders after handoff
- real push scheduling and event-time edits
- relationship-fact review for confirmed schedule events

Calendar is a visible Home app, not only an internal scheduling concept. Its current frontend is a list-first confirmed-event surface. The accepted target adds Month, Week, Agenda, selected-day, multi-day-span, and event-authoring information architecture only through a later user-approved CJA-1 slice. `日程 / Agenda` is a Calendar view, not another long-range planning app.

Calendar does not own:

- all cue queues
- logistics follow-ups
- callback backlog
- runtime-control semantics
- World Pack reservation rules or event judgment
- Mini Scene world-profile resolution, regex execution, artifacts, or presenters
- Agenda Journey execution state
- Map Journey or Activity Session truth
- Schedule Orchestrator materialization state
- generic Event Runtime or Narrative Timeline records

Calendar may later request a Mini Scene from a confirmed event using canonical schedule, time, place, participant, and push-state facts. Generation or presentation failure cannot change the confirmed event, and an interaction that requests an event edit returns to Calendar validation.

## 3. Agenda Journey, Schedule Orchestrator, And Activity Session

Agenda Journey later owns short-range day/near-term journey instances, ordered or flexible activity steps, execution state, completion/miss/skip/cancel state, evidence references, and outcome summaries.

The hidden Schedule Orchestrator later owns only idempotent Calendar-to-Agenda materialization and deadline coordination. It does not become a Home app and cannot copy or mutate Calendar, Map, Event Runtime, relationship, Wallet, Assets, profile, or world truth.

Activity Session later owns timestamp-based duration, pause policy, session checkpoints, and suspend/reopen reconciliation for one Agenda Journey step. It does not select events or write broad values. A minimized session continues; an OS-suspended or closed browser/PWA cannot promise an exact interactive popup.

For a linked location-bound activity, Calendar keeps appointment truth, Agenda Journey keeps desired arrival and separate travel/activity steps, and Map recalculates recommended departure from the canonical current position. Explicit confirmation creates one Map Journey; opening Map reuses it. A validated linked arrival may apply an approved outside/automatic-entry policy, but arrival or inside presence only satisfies travel/presence evidence and never proves the activity completed.

Activity Session also owns explicit completion policy. A Focus Companion surface may present Pomodoro/continuous/custom modes plus stable Gallery background, Music/ambient, and decorative companion references, but it owns no media binaries, playback queue, event eligibility, Map Journey clock, relationship state, or broad values. Optional event permission/intensity/presentation cannot remove the base activity path.

No Agenda Journey route/store, Schedule Orchestrator implementation, Activity Session, Narrative Timeline store, persistence field, or migration is implemented by this accepted documentation direction.

## 4. Reminders

Reminders owns:

- callbacks
- follow-ups
- logistics reminders
- cross-module cue queues
- world/task objectives when needed

Reminders does not own:

- confirmed schedule/date identity
- runtime-control semantics

## 5. Phone

Phone owns:

- call logs
- call-facing interaction history
- missed-call continuity that may later feed Reminders

Phone does not own:

- Calendar schedule truth
- relationship truth

## 6. Handoff Rule

- Reminders can promote something into Calendar when it becomes a real confirmed schedule/date item.
- Map can provide route/location context, but does not absorb schedule ownership.
- Map-derived cues should pass explicit trip lineage into Calendar when available, while Calendar remains the owner of the confirmed event.
- Map may expose one bounded place snapshot to Chat, but Map keeps place/trip truth; Chat owns the pending recipient/send workflow and message history, while card return is detail-only and cannot set location or journey endpoints.
- Phone can generate callback context, but callback scheduling belongs to Reminders until it becomes a real Calendar item.
- World Pack can provide `reservation -> Calendar` labels/context for Calendar, including confirmed `reservation_board` appBindings, but it cannot move schedule records or push decisions out of Calendar.
- the active world identifies which per-world Map binding to resolve; Map owns that binding and falls back to its reviewed recommendation table when no override exists.
- Mini Scene request Adapters may hand canonical Map/Calendar facts to the shared Module, but popup presentation never becomes schedule/route truth and cannot bypass existing confirmation or edit rules.
- the Schedule Orchestrator may later link a confirmed Calendar event to an Agenda Journey by stable IDs; Calendar remains planned truth and Agenda Journey remains execution truth.
- an Agenda Journey may consume Map arrival/cancellation as evidence and Activity Session duration as time evidence; it must validate completion through its own step contract.
- Event Runtime owns event eligibility and audit, while Agenda Journey, Map, Calendar, and downstream owners validate their own requested transitions or effects.
