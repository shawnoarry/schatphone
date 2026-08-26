# Map Calendar Reminders Product Boundary

Updated: 2026-08-17

This file defines ownership boundaries for Map, Calendar, Agenda Journey, Activity Session, Reminders, and Phone-like callback support.

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
- place-media selection, authenticity labeling, alt text, detail-sheet placement, and source/license attribution as a projection keyed by canonical Map place ID
- Event Surface Projection anchor validation, pin/card placement, clustering/stacking, selection, explicit expansion, and return context for the single approved Map host
- current-position provenance, explicit place sessions, Calendar departure estimates, and Map-owned `sourceCalendarEventId` journey lineage

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
- third-party copyright ownership, unreviewed source candidates, or authority to treat a photo as coordinate/place truth
- Music credentials, provider endpoints, audio URLs, local media IDs, playable-track resolution, queue/radio construction, audio runtime, or global floating-player ownership

Map may expose an immutable World Suite inspection projection over its own pack metadata and bounded cross-owner references, but this does not make World Suite a Map, Gallery, Event Runtime, or Chat owner. The projection may classify built-in, user custom, and explicitly Catalog-managed native identity; report active, historical, Gallery, capacity, and user-modification evidence; and project only stable reference IDs from persisted Event records and Chat location cards. It cannot copy chat/event bodies, activate a pack, bind a world, relocate the role, alter a place or Journey, or delete a Gallery asset. Catalog provenance/authored-place round-trip, structured Map write receipts, Gallery deletion/replacement hard-reference protection, current/historical Event/Chat inspection, rollback-safe native mutations, and the resolver-backed Owner Adapter are implemented. The Owner Adapter resolves content outside the manifest, accepts only trusted normalized canvas packs, consumes a pre-existing Gallery asset, preserves topology unless an explicit migration exists, and never crosses into activation or Gallery mutation. It remains unavailable to product callers until real Catalog and registry composition is separately registered.

Map may later request a Mini Scene from a confirmed trip/location event using canonical Map facts. Its per-module popup mode remains a user setting, and any interaction that requests a route/location change returns to Map validation.

Everyday place use does not mutate coordinates by dragging. Map Settings owns new-place creation, edit/delete management, category assignment, and explicit arbitrary-point coordinate creation/reselection for player pins; the everyday Map browses, filters, controls visibility, selects destinations, and links to that manager without hosting a second creation form. Map-pack places remain versioned read-only content. Address or description text is display/search metadata and never geocodes or places a marker. A canonical coordinate is required for rendered pins: geographic packs store provider-neutral latitude/longitude, while fictional/custom packs store normalized canvas coordinates. Coordinate creation/reselection is an exclusive interaction mode: saved markers become pointer-transparent until the new coordinate is accepted or cancelled, and label, description, category, and existing coordinate drafts remain editor-owned throughout the round trip. Seoul V1's curated real-place catalog is a dated local snapshot with stable Map IDs and provider-neutral coordinates, not a live POI mirror. `MapSceneCanvas` is the renderer seam: OpenFreeMap + MapLibre renders geographic packs, while `LocalMapCanvas` renders fictional/custom packs and the geographic fallback. External style, network, or WebGL startup failure before the first ready state cannot mutate saved place, trip, world-binding, or coordinate truth, and local interactions remain available through the fallback. The renderer cannot load POI, public-transit, or route services or make provider identifiers canonical Map identity. The old `/map/labs/kakao-compare` path is compatibility-only and redirects to `/map`.

Reality-anchored Food Delivery branches are still ordinary Map-owned pack places. Map owns their stable ID, bilingual public address, aliases/search terms, and reviewed coordinate; Food Delivery may reference that ID as its setting/source anchor but retains restaurant, menu, bag, order, and delivery-event truth. Public place evidence may establish a branch and coordinate, but Map must not infer an official menu, price, campaign, affiliation, or live-POI update from that evidence.

Place media is a separate read-only projection and never mutates the 106-place Seoul catalog or player-place persistence. A reviewed record must bind to `mapPackId + placeId`, use a verified public runtime derivative, disclose author/source/license and material changes, and present one truth grade: exact-place photo, real area atmosphere, generated reconstruction, or category fallback. Source candidates remain local audit inputs; Map cannot load them at runtime. Missing, rejected, revoked, or failed media returns to the category fallback without changing place identity, visibility, discovery, position, Journey, Event, or commerce state. Gallery remains the owner of user-retained media, and Image Generation remains the owner of temporary candidates/provider provenance.

The everyday Map surface uses progressive disclosure. The idle state keeps the map, destination search, a non-GPS canonical role-position focus plus explicit arbitrary-point role-position action, and independent Journey, Places, and Footprints buttons; each button opens only its focused drawer content, without a duplicate three-way navigation row inside the drawer. The Places drawer offers browsing and a single explicit link to the Settings-owned Places-and-Pins manager, where place creation and all detailed pin administration live. While traveling, the static coordinate focus is relabeled as the start position, role-position reselection is unavailable, and a persistent primary journey card shows route, phase, progress, remaining time, ETA, and pending route updates; this does not imply live position, route geometry, or movement tracking. Arrived journeys retain the card for settlement. A route card requires explicit destination intent, an active/arrived trip, or an explicit transit-app context. Journey start and destination accept free text or an explicit current-world place selection and become read-only once traveling or arrived. The top-level search remains available during traveling, paused, and arrived states for known-place discovery, coordinate focus, and read-only place detail; it cannot change the locked destination, start, or role position, and unmatched text cannot create a new plan in those states. Search is a current-world local-pin index over known positioned pack/player places; category controls wrap across search, Places, and Settings so every available option remains reachable; and ranked matching normalizes width, case, accents, punctuation, word order, broad-category semantics, stable icon-subtype semantics, optional aliases/search terms, and bounded Latin typos. Every new player place automatically participates through its standard name/address/category fields. Selecting a result focuses its canonical coordinate and opens place detail, and unmatched text remains an explicit free-form destination without invoking POI/geocoding services. Map visibility is a persisted presentation preference, not place knowledge: broad-category and individual-place controls affect rendered markers only, known-but-hidden places remain searchable and usable, and selecting a hidden place may reveal that marker for the active detail context. Category selection filters the Places catalog and never silently changes marker visibility. A blank map point may become the persisted role coordinate while idle, but this is authored world state rather than device location or geocoding. Place details require an explicit marker or search-result selection, and fictional faction legends start collapsed. Place taxonomy has two compatible levels: user-facing broad groups own browse, filter, visibility, and category-label semantics, while stable existing subtype IDs own the concrete icon/tone and persisted place value. Map Settings exposes all icon subtypes grouped beneath their broad label, and selecting an icon automatically determines that label without migrating existing category IDs. Store-level seeded trip defaults remain compatible but do not create visible destination intent by themselves.

During traveling and paused journey phases, Map may present one compact music/radio button and focused bottom panel. The panel consumes only Music's bounded now-playing, quick-track, and station projections; every play/radio action is an explicit user gesture delegated to Music. The Map panel stays above the Music-owned floating player while open. Closing the panel or ending the journey never stops Music, closes its floating player, or transfers queue/source ownership into Map.

Place knowledge is Map-owned, persisted per world and partitioned by map pack. Old saves and missing policy data normalize to `all_known`. In optional `footprint_gated` mode, eligible authored convenience stores and pharmacy districts are absent from markers, search, journey pickers, Places, and Settings until a completed journey resolves to a canonical destination coordinate within the deterministic discovery radius. Each reveal retains stable place ID, source trip ID, and discovery time. New journeys snapshot world/map-pack lineage for this purpose. Switching policy preserves discoveries. Manual role-position changes, cancelled journeys, and marker-visibility actions cannot reveal places. Event-based stable-place reveal, generated candidate places, keep/discard ownership, and active exploration remain separately gated.

The ordinary place-focus surface is one compact non-modal Map-owned overview/detail card anchored near the selected pin over existing truth. The overview identifies the place, gives a concise introduction and current-position relationship, and separates Journey intent from facility entry: an idle remote place offers Map Journey planning, a place viewed during a locked journey offers the existing journey without changing its destination, and a fixed entry slot remains present in every state. That slot is dim but focusable/clickable while remote and reports `当前不在设施附近` without emitting an entry request; exact stable current-position context activates `Enter`, and an inside session replaces it with `Leave`. Every overview has a stable image slot. Reviewed exact/area/generated media may support recognition, while category fallback remains explicitly non-evidentiary and cannot resemble verified place photography. The detail level remains about the place: fuller description, address, media truth/provenance/license, compact Share, reversible hidden-pin recovery, and a Settings handoff for player-owned management. It does not repeat Journey or entry actions. Map state, Footprints, global place-name language, arbitrary relocation, start-point mutation, and delete controls belong to Map Settings or their owning Map modules rather than the place card. Map persists explicit onsite/inside sessions, `manual` versus `journey_arrival` provenance, `Enter`/leave behavior, and bounded entry checkpoints without presenting those storage fields as place content. A place card shows no permanent Event entry, and distance cannot reclassify an onsite/interior template as remote.

Map Journey, Footprints, and Exploration have distinct meanings. A Map Journey goes to a known destination. Footprints passively summarize completed travel/exploration through history, familiarity, points, area activity, and optional nearby authored-place reveals. Active Exploration spends time in an area and may produce an explicitly accepted candidate discovery. The current Footprints dashboard is passive; unlocking an area or revealing a pre-authored nearby facility cannot imply that active exploration or generated discoveries already exist.

The Map Journey Runtime is a Map-owned domain Module, not the Agenda Journey app. Transport choice belongs to Map Journey planning, and Map Settings may later own versioned static transport modes/lines/stations/topology. MJE-2 keeps planning form state separate from persisted active-journey truth, adds only deterministic duration-based checkpoints, and keeps pause/resume/cancel validation in Map. MJE-3's bounded checkpoint adapter, exact lineage, no-event path, and recovery logic remain compatibility-tested, but production Map mounting disables its generic route-obstruction evaluation. If a later reviewed caller enables checkpoint evaluation, Event Runtime still owns eligibility, cooldown/cap, proposal/review, provenance, and logs while Map validates every result; proposal review never becomes journey truth or an automatic pause. An Agenda Journey travel step may request Map travel and retain stable evidence through `sourceAgendaJourneyStepId`, but cannot write Map Journey truth or make arrival prove completion of a non-travel activity. Destination change, event-driven cancellation, high-impact owner mutation, and active exploration remain unimplemented. A future Transit app may present the same static or live network only after it has independent utility and must consume, not duplicate, Map Journey truth.

Roadmap 4.14 keeps the large-map event-card lane separate from MJE-5. EVE-1 has landed the shared pure projection/explicit-host-registry Interface. EVE-2A froze the read-only current-place semantic overlay, `MapPlaceSessionCheckpointV1`, and a no-external-mutation validation Interface; EVE-2B completed Event-owned runtime/instance/text materialization; EVE-2C implemented Map provenance/session truth and exactly one registered host for the interior production-arrival-briefing archetype. Invalid/off-pack anchors remain reviewable without an invented position. `Expand event` is presentation/navigation only; every result returns through the source owner's Adapter. Authored scene images may be referenced from Map/world packs, but Map does not own optional event text generation or later CG candidates.

## 2. Calendar

Calendar owns:

- confirmed events
- real schedule/date meaning
- confirmed schedule-like reminders after handoff
- real push scheduling and event-time edits
- relationship-fact review for confirmed schedule events
- an optional stable Map-owned appointment `locationRef` as schedule destination identity, without copying coordinates or route state
- a bounded persisted schedule-handoff `sourceRef` on confirmed events, containing only source identity, revision, idempotency key, and safe return context

Calendar is a visible Home app, not only an internal scheduling concept. Its CJA-1 frontend provides Month, Week, and Agenda views over Calendar-owned occurrences, selected-day and selected-event detail, all-day and multi-day spans, recurrence, complete manual event authoring, reminder policy, and stable Map place selection. A location-bound occurrence may show a derived departure-readiness projection from current Map truth and selected transport. `日程 / Agenda` is a Calendar view, not another long-range planning app.

Calendar does not own:

- all cue queues
- logistics follow-ups
- callback backlog
- runtime-control semantics
- World Pack reservation rules or event judgment
- Mini Scene world-profile resolution, regex execution, artifacts, or presenters
- Agenda Journey execution state
- Map Journey or Activity Session truth
- current-position, distance, ETA-calculation, or route truth
- Schedule Orchestrator materialization state
- generic Event Runtime or Narrative Timeline records
- source Mail/Work Hub bodies, proposal truth, or authority to silently apply a changed/cancelled source revision

Mail and Work Hub may each expose one bounded source-owned `ScheduleHandoffDraftV1` projection through the shared resolver registry. Work Hub's S1 resolver additionally requires its exact proposal decision to be `accepted`; this is eligibility to review, not permission to write Calendar. Calendar alone creates the confirmed event after explicit Save and stores only the bounded `sourceRef`. Both sources may read that reference to present linked state, but neither source persists or mutates a `calendarEventId` copy.

Calendar may later request a Mini Scene from a confirmed event using canonical schedule, time, place, participant, and push-state facts. Generation or presentation failure cannot change the confirmed event, and an interaction that requests an event edit returns to Calendar validation.

## 3. Agenda Journey, Schedule Orchestrator, And Activity Session

Agenda Journey owns short-range day/near-term journey instances, ordered travel/activity steps, execution state, completion/miss/skip/cancel state, evidence references, and outcome summaries. CJA-3 accepts manual plans within the next 14 days and idempotently materializes eligible Calendar occurrences without becoming another long-range planner.

The hidden Schedule Orchestrator owns only idempotent Calendar-to-Agenda materialization decisions and deadline coordination. Its schema-V1 records use deterministic Calendar-event-plus-occurrence identity, retain bounded timing/fingerprint/request evidence and a stable Agenda Journey link after acknowledgement, refresh on Calendar revision, retire removed or replaced occurrences, and reconcile after startup or resume. It does not become a Home app and cannot copy or mutate Calendar, Agenda Journey execution, Map, Event Runtime, relationship, Wallet, Assets, profile, or world truth.

Activity Session owns timestamp-based duration, pause policy, deterministic session checkpoints, completion policy, and suspend/reopen reconciliation for one Agenda Journey activity step. Its CJA-4 schema uses one deterministic session ID per stable step ID and returns bounded completion evidence to Agenda Journey validation rather than writing the step directly. A minimized session and in-app navigation continue against absolute timestamps; an OS-suspended or closed browser/PWA cannot promise an exact interactive popup.

The landed direct Calendar-to-Map vertical keeps appointment time and stable destination reference in Calendar, lets Map recalculate recommended departure from the canonical current position and selected transport, and creates or reuses one Map Journey only after explicit user action. This direct path does not create an Agenda Journey step or infer activity completion. In the CJA-3 flow, Agenda Journey owns desired arrival plus separate travel/activity steps, asks Map to create or reuse one journey for the stable travel-step ID, and consumes Map arrival or cancellation only as travel evidence. Validated arrival unlocks the activity but cannot complete it or auto-enter a place.

Activity Session also owns explicit completion policy. The CJA-4 Focus Companion baseline follows the Agenda step duration, offers `duration_sufficient` or `user_confirmation`, supports bounded pause/resume or continuous timing, and uses one built-in quiet scene. CJA-5 adds one midpoint-only Event Runtime collaboration while Activity Session retains timestamp/checkpoint truth and validates only the approved 0/2-minute timer result. Later Pomodoro/custom modes plus stable Gallery background, Music/ambient, and decorative companion references remain separate extensions. Activity Session owns no media binaries, playback queue, event eligibility, Map Journey clock, relationship state, or broad values. Optional event permission/intensity/presentation cannot remove the base activity path.

Agenda Journey schema V1 and `/agenda-journey` are implemented with a separate persistence owner and nested Calendar backup child. Activity Session schema V2 is implemented as a separate time-only persistence owner with V1 migration and nested Calendar backup child; its Focus Companion remains embedded in Agenda Journey rather than registered as another Home app. Simulation V6 introduced the CJA-5 event records and presentation policy, and the current V7 carrier preserves them without copying the Activity Session. CJA-6A documents a bounded, read-only, source-linked Narrative Timeline contract with typed `sourceRefs` and fail-closed invalid-source behavior, but creates no Timeline record, store, route, backup child, or visible App. CJA-6B projection implementation, broader event families, appointment auto-entry, media callers, richer companion state, and interactive HTML remain unimplemented. The Schedule Orchestrator stays hidden and stores coordination state only; Calendar V3 owns schedule fields and optional `locationRef`, while Map Journey owns travel truth and may retain either `sourceCalendarEventId` for the direct Calendar path or `sourceAgendaJourneyStepId` for the Agenda Journey path as stable source lineage.

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
- the Schedule Orchestrator exposes Agenda Journey materialization/deadline requests and acknowledgement seams using stable IDs; Calendar remains planned truth and Agenda Journey remains execution truth.
- an Agenda Journey may consume Map arrival/cancellation as evidence and Activity Session duration as time evidence; it must validate completion through its own step contract.
- Event Runtime owns event eligibility and audit, while Agenda Journey, Map, Calendar, and downstream owners validate their own requested transitions or effects.
