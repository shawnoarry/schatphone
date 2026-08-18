# Player Context, World Evolution, And Information Propagation Architecture

Updated: 2026-08-18

Status: `PLAYER_CONTEXT_V1_FOUNDATION_IMPLEMENTED / WORLD_EVOLUTION_AND_INFORMATION_PROPAGATION_DOCUMENTATION_ONLY`

This document records the shared architecture direction for:

- events whose eligibility depends on the user's structured in-world identity, role, occupation, or other owned state;
- persistent world incidents and longer-running event arcs;
- forum, X/Weibo-like social media, subscription news, and other third-party information surfaces that show the world changing from outside the user's direct viewpoint;
- later clue, rumor, misinformation, and investigation flows that must distinguish truth from what an account claims.

It does not create a new roadmap stage, Event Surface host, Home app, Store, route, schema, migration, or implementation authorization. Roadmap 4.14 remains the only live Event execution lane, and EVE-5 remains separately gated.

## 1. Product Direction

SchatPhone's event ecosystem is not one card format. A causal chain may begin from a user action, an owner-confirmed fact, a world incident, a role/occupation condition, or an explicit schedule/journey checkpoint. It may continue through native messages, calls, posts, news, order state, Map activity, Calendar/Agenda behavior, or another owner-native record.

The two directions captured here are connected but not identical:

1. `player-context-conditioned events` decide whether an event family is applicable to this user in this world;
2. `world information propagation` decides how confirmed facts, unverified claims, and third-party interpretations become visible through formal media records.

The first is an event-eligibility input. The second is a future product Module with its own canonical records. Neither belongs inside a generic Event Card.

## 2. Existing Foundations

This direction builds on existing decisions rather than replacing them:

- `WorldBook` defines static world rules, narrative setting, and profile-template structure;
- `Contacts Self Profile` stores the user's concrete world-facing identity values and their visibility;
- domain owners such as Chat, Phone, Map, Calendar, Food Delivery, Shopping, Wallet, and Relationship Runtime own their canonical facts;
- `Event Runtime` owns eligibility, deterministic/random gates, cooldowns, caps, Event Instance progression, requests, provenance, and audit;
- owner Modules publish consequences through native messages, calls, posts, journeys, schedules, ledgers, and other records;
- committed social/forum/news records must be durable in their target owner, while prompts, raw provider responses, and uncommitted drafts remain transient.

Relevant earlier decisions already exist in:

- `docs/pm/contacts-relationship-system-v2/ROLE_PROFILE_TEMPLATE_DECISION_LOG.md`, especially `User Self Profile` and `canAppearInWorldEvents` / `canAppearInSocialFeed`;
- `docs/architecture/WORLD_CONTEXT_EVENT_VARIANT_STANDARD.md` for local-first world-aware variants;
- `docs/architecture/SIMULATION_EVENT_ENGINE.md` for Runtime and owner Adapter responsibilities;
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md` for owner facts and relationship mutation safety;
- `docs/architecture/CALENDAR_AGENDA_JOURNEY_EVENT_ORCHESTRATION_ARCHITECTURE.md` for future occupation-aware execution context and checkpoint rules.

The missing piece was one shared contract connecting those decisions to dynamic world state and formal information propagation.

Role continuity is the primary product consumer of these sources. Event Runtime does not write Chat history, role memory, or relationship truth. A confirmed local event may expose a bounded, role-scoped memory candidate through an existing Owner Adapter, but Relationship Runtime decides whether it becomes durable role memory. A public world evolution may instead produce a world-scoped public-knowledge projection that same-world roles can retrieve when relevant; that projection is not copied into every role memory or injected into every Chat prompt.

## 3. Ownership Model

One concept keeps one primary owner.

| Concept | Owner | Meaning |
| --- | --- | --- |
| static world rules and template structure | WorldBook | what is possible in the world and which structured profile fields exist |
| concrete stable user identity | Contacts Self Profile | who the user is in this world, including user-confirmed occupation, affiliation, public identity, and profile values |
| domain fact | the domain Module that performed or confirmed it | an order, call, trip, schedule, payment, relationship fact, message, or other canonical result |
| dynamic player state with an existing natural owner | that existing owner | current values such as schedule load, Wallet balance, relationship state, Map presence, or an active order |
| cross-module dynamic player state with no existing owner | future minimal Player State Module, only if proven necessary | durable user-centered values such as public reputation, media attention, occupational pressure, or exposure risk that cannot honestly belong elsewhere |
| ownerless dynamic world fact or long-running world arc | future World State And Arc Ledger, only if proven necessary | world-native facts, incident state, unresolved hooks, and arc lineage that must outlive one Event Instance and have no existing domain owner |
| event eligibility and progression | Event Runtime | reads references/snapshots, persists decisions and progression, requests owner actions, and audits results |
| published forum/social/news content | future Community/Media Module | accounts, channels, posts, replies, reposts, subscriptions, read state, moderation state, and committed publication bodies |
| public world knowledge projection | future accepted world-history/knowledge owner, using confirmed world facts and publication references | same-world retrieval of bounded public facts/claims/publications; not a copy of every role's memory and not a universal Event Runtime awareness graph |
| collected clues, deductions, and case notes | future Investigation/Knowledge owner | user-retained clue references and conclusions; Community/Media does not become the investigation notebook |

### 3.1 Self Profile Boundary

Contacts Self Profile may own stable structured identity such as:

- occupation or in-world role;
- agency, company, team, school, faction, or organization affiliation;
- public-facing identity and stage/professional name;
- world-specific capabilities, permissions, and visibility-scoped profile values;
- explicit links to relevant owned profiles where the product later defines them.

Contacts must not become the owner of volatile simulation values merely because they describe the user. Reputation, media heat, fatigue, active assignment pressure, legal risk, and similar changing values belong to their natural owner or a future minimal Player State Module.

Free-text biography or role prose is not sufficient by itself to authorize an event. Runtime eligibility reads saved structured fields and source revisions through a bounded projection.

### 3.2 Dynamic State Boundary

Before adding a Player State field, apply the deletion test:

1. if deleting the proposed Player State Module would leave the value naturally owned by an existing Module, keep it there;
2. if deleting it would force the same cross-module state and validation rules into several callers, a small dedicated owner may provide real locality and leverage;
3. do not create a universal stats Store for values that are merely convenient to query together.

The same rule applies to a future World State And Arc Ledger. It exists only for durable world-native truth or arc state that has no honest existing owner. Event Runtime is not automatically that owner.

### 3.3 Current Chat Me Projection

The current lightweight derived social-feed items in Chat `Me` remain a Chat-owned summary/projection of user identity and recent interaction data. They are not the future Community/Media owner, do not create canonical public posts or claims, and must not become the persistence shortcut for world publications.

## 4. Player Context Snapshot

`PlayerContextSnapshot` is a conceptual read-only Interface, not a frozen implementation schema.

The first bounded production foundation is now implemented in `src/lib/simulation/player-context-projection.js`. Contacts role profiles persist a monotonic `revision` through the existing `store:chat` envelope; legacy profiles normalize to revision `1`, and every profile-owned write seam increments it. `buildKpopPlayerContextSnapshotV1()` accepts only a Self Profile that explicitly allows world-event participation, an exact world/template/version match, an expected profile revision, and revision-matched owner references.

The frozen K-pop V1 identity allowlist is deliberately small:

- `occupation` -> `identity.occupationId`;
- `affiliation` -> `identity.affiliationIds`;
- `public_identity` -> `identity.publicIdentityMode`.

Only template-declared Self Profile fields with `public` or matching-world `world_specific` visibility and `manual` source kind enter the snapshot. Biography, role prose, relationship text, hidden/familiar/intimate fields, event-attached values, unknown custom fields, and copied owner bodies are excluded. The local evaluator proves only two family gates: `manager` for a manager incident, and `idol + public_figure` for an idol public-incident family. It creates no Event Instance, random incident, owner fact, post, state mutation, route, Store, or visible surface.

It should expose only bounded, structured, revision-aware inputs required by one eligibility decision:

```js
{
  schemaVersion: 1,
  selfProfileRef: {
    profileId: 'self-profile-1',
    revision: 12,
    worldId: 'modern-seoul',
    templateId: 'kpop-idol-profile-v1'
  },
  identity: {
    occupationId: 'idol',
    affiliationIds: ['agency-aurora'],
    publicIdentityMode: 'public_figure'
  },
  stateRefs: [
    { owner: 'calendar', kind: 'confirmed_event', id: 'calendar-123', revision: 3 },
    { owner: 'relationship_runtime', kind: 'relationship_snapshot', id: 'role-456', revision: 9 }
  ],
  boundedState: {
    mediaAttentionBand: 'elevated',
    occupationalPressureBand: 'normal'
  },
  capturedAt: 1786752000000
}
```

Rules:

1. the snapshot contains references and normalized fields, not copied owner records;
2. each sensitive field must respect Self Profile visibility and the consuming Module's approved purpose;
3. Runtime stores only the minimum frozen eligibility evidence needed for audit;
4. stale, missing, mismatched-world, or unsupported profile/state references fail closed;
5. a snapshot may prove eligibility, but it does not itself create an incident or mutate state.

## 5. Continuity Routing Matrix

The same user-visible situation can cross several modules, but it must not become several competing memory systems. Route each source through its natural owner first, then decide whether it deserves a role-scoped continuity effect.

| Source | Canonical owner | Default visibility | Role-memory behavior | Chat behavior |
| --- | --- | --- | --- | --- |
| explicit user action and the resulting domain record | the module that accepted the action | user plus the owner-defined participants/receivers | may produce a candidate only after the owner confirms a result; the candidate is evaluated per affected role | Chat may show a notification or receive a user disclosure, but does not inherit raw event logs |
| Chat message, promise, confession, apology, preference, or relationship disclosure | Chat for the message; Relationship Runtime for accepted relationship meaning | the addressed role(s) and any explicit recipients | can be more important than a low-impact formal event; Relationship Runtime may create or merge a memory group from the conversation | remains in Chat history and enters prompt context only through bounded role-continuity recall |
| confirmed local module fact (call, order, trip, calendar occurrence, payment, etc.) | the module that confirmed it | participants, owner, and explicit downstream receivers | optional role-scoped candidate; supporting facts may merge under an existing `memoryKey` | consuming Chat turns may retrieve the accepted memory projection, not the entire source record |
| public world fact | world-history/knowledge owner when one exists | world scope, subject to publication and visibility rules | no personal memory by default; a role may later receive a candidate only after experiencing, receiving, or discussing it | retrieve only when the current turn makes it relevant |
| claim or committed post/news item | Community/Media or future publication owner | channel, followers, subscriptions, or other publication scope | existence is public knowledge only within that scope; truth status and personal relevance stay separate | Chat may mention it when the role has a valid exposure path or the user tells the role |
| Event Runtime lifecycle, audit, cooldown, and provenance metadata | Event Runtime | internal tooling/World Hub review | never a role memory by itself | never inject raw runtime metadata into a normal Chat prompt |

The default local-event rule is therefore: `participant/receiver scope first, role-memory decision second, prompt recall last`. A public-world path is different: `confirmed fact/claim/post -> public knowledge projection -> relevant role retrieval -> optional role-memory candidate if personally experienced`. Neither path requires a universal role-awareness graph.

### 5.1 Candidate Lifecycle

The first implementation seam, when separately accepted, should be a narrow source-linked request rather than a new memory store:

```text
owner-confirmed source record
  -> bounded candidate { roleRef, sourceRef, memoryKey?, relevance, visibility }
  -> Relationship Runtime accepts | merges | keeps supporting-only | rejects
  -> role-continuity projection
  -> bounded Chat recall for the addressed role
```

`relevance` is a relationship-memory signal, not Event Runtime severity. `visibility` is a delivery/knowledge boundary, not permission for unrelated roles to read the source. The first implementation should reuse the existing Relationship Runtime `recordRelationshipFact(input)` seam from an owner/Relationship Adapter rather than add a parallel candidate Store/API. Until that Adapter seam is explicitly promoted for a source, existing adapters may submit their already-accepted owner or relationship facts only; they must not write Chat memory or broadcast context.

## 6. Fact, Claim, And Publication Separation

World information features require three different meanings.

### 5.1 World Fact

A `World Fact` is canonical truth confirmed by its owner.

Examples:

- a Calendar appearance was completed;
- a Phone call occurred;
- an order was delivered;
- a company issued an official statement;
- a Map Journey arrived;
- a relationship owner accepted a relationship fact.

A fact carries stable owner, record, revision, time, subject, and evidence references. Event Runtime may consume or reference it but cannot invent owner confirmation.

### 5.2 Claim

A `Claim` records that an account, person, organization, or publication asserted something.

Its relation to world truth may be:

- `confirmed`;
- `partially_confirmed`;
- `unverified`;
- `contradicted`;
- `unknown`.

The existence of a claim is a fact. The content of the claim is not automatically true.

This distinction permits rumors, propaganda, mistaken witnesses, anonymous tips, satire, unreliable narrators, and deliberate misinformation without corrupting canonical world state.

### 5.3 Post Or News Record

A `Post` is the committed content the user can actually read in a forum, social feed, or news channel. It belongs to the future Community/Media Module and may reference zero or more facts and claims.

The Module owns:

- publishing account and channel identity;
- post body and media references;
- publication/edit/delete or tombstone state;
- replies, reposts, subscriptions, bookmarks, and read state;
- references to supporting facts or claims where the product exposes them.

A post is not a second Event Instance, and an Event Surface projection is not a post.

## 7. Event Families And Trigger Rules

This direction supports several reusable event families.

### 6.1 Identity-Conditioned Incident

Eligibility includes structured Self Profile identity.

Examples:

- a manager receives an artist-management incident;
- an idol receives a public-figure or schedule-related incident;
- a detective receives a case-related lead;
- a faction officer receives a political or military request.

Occupation alone is usually only an eligibility gate. It must not fabricate a specific user action, failure, relationship, crime, or public fact.

### 6.2 Owner-Fact-Conditioned Incident

Eligibility depends on one or more confirmed owner facts.

Examples:

- a completed public schedule creates an opportunity for media coverage;
- a confirmed missed call creates a follow-up condition;
- a delivered order permits a user-initiated quality or surprise interaction;
- a completed trip permits an onsite or arrival-dependent incident.

### 6.3 World Incident

A world incident may happen without being caused by the user. Its canonical facts must belong to an existing owner or the future World State And Arc Ledger.

Runtime may select when and how the incident enters an event chain, but it must not use an unreviewed model response as the sole durable truth source.

### 6.4 Information Propagation Event

An owner fact or claim becomes visible through one or more publication requests:

```text
owner fact or claim
-> Event Runtime eligibility / progression
-> Community/Media publication request
-> Community/Media validation and committed post
-> notification, feed, search, subscription, or linked native follow-up
```

Runtime stores the request, decision, and publication reference. Community/Media stores the post body and publication state.

### 6.5 User-Initiated Follow-Up

Reading a post may lead the user into another real capability such as replying, contacting a role, calling, opening Map, reviewing an order, or collecting a clue. The action starts in the owner surface and uses that owner's Interface. A generic event choice must not impersonate an unavailable capability.

## 8. World Incidents And Long-Running Arcs

One Event Instance represents one bounded occurrence. A longer narrative may need several occurrences, pauses, owner facts, and publications.

A future `World Arc` may contain:

- stable arc identity and world scope;
- initiating incident or claim references;
- participating subject references;
- current stage and unresolved hooks;
- linked Event Instance, owner fact, request, and publication references;
- deterministic decisions already made;
- terminal, suspended, contradicted, or expired state;
- minimum provenance and review history.

Rules:

1. an arc coordinates references; it does not copy posts, calls, schedules, relationship facts, or other owner records;
2. Event Runtime advances only after correlated owner facts confirm required outcomes;
3. one-time random decisions are persisted and never rerolled on refresh;
4. a stale or missing owner reference stops the affected branch safely instead of inventing continuity;
5. an arc can end with no dramatic consequence;
6. the product must not run a text model on every Tick to simulate an invisible world.

Before implementation, the project must decide whether Event Instance V2 can provide enough arc progression with references or whether a separate World State And Arc Ledger is justified. This document does not preselect a Store shape.

## 9. API Role

AI may help produce bounded candidates, but it is not a truth owner.

Allowed future uses include:

- drafting local event variants from approved world/profile fields;
- proposing several incident or claim candidates for deterministic validation;
- writing alternate post/news wording for already selected facts or claims;
- summarizing multiple perspectives for a committed publication request;
- producing a bounded Phone or conversation summary that remains a proposal until the source owner confirms the result.

AI must not:

- infer the user's occupation or identity from free text when a structured field is required;
- create a canonical user action, crime, relationship, payment, schedule, location, or business result;
- directly change reputation, media attention, relationship values, Wallet values, or world facts;
- publish directly into Community/Media without target-owner validation;
- turn a claim into a fact;
- run on every Tick, feed refresh, distance update, or eligibility check;
- make network availability a requirement for ordinary no-event or local fallback paths.

Any accepted generated copy is normalized, bounded, and persisted by the owner of the committed record. Raw prompts, responses, discarded candidates, and transport payloads remain transient by default.

## 10. Native Presentation

Event progression is mostly invisible. The user sees owner-native consequences.

Possible presentation forms include:

- Community/Media feed post, reply, repost, trend, or subscription news;
- system notification or notification-center entry;
- Chat role or service-account message;
- Phone incoming call, missed call, transcript, or follow-up;
- Map pin, place, journey, or Event Surface only when that host is separately registered;
- Calendar or Agenda Journey record only through its owner;
- World Hub audit and explanation;
- later Mini Scene presentation after its separate gates.

No presentation form is universal. A formal post should appear as a post, a call as a call, an order issue in the commerce owner, and a Map encounter in Map. Event Runtime does not require a Home card or Event app.

## 11. Reference K-Pop Chains

### 10.1 Manager Incident

```text
Contacts Self Profile: occupation = manager
+ owned artist/assignment reference
+ confirmed schedule or artist-state fact
-> Runtime eligibility and one persisted incident decision
-> Phone/Chat/company-native contact
-> user action in the real owner surface
-> correlated owner fact
-> optional Community/Media publication or private resolution
-> owner-validated relationship, schedule, or reputation consequence
```

The Runtime may select an applicable incident family. It cannot invent that the managed artist committed a specific action unless an owner-confirmed world incident or an explicitly modeled unverified claim exists.

### 10.2 Idol Rumor Or Scandal Arc

Two safe paths exist:

1. `fact-backed coverage`: an owner-confirmed public action or schedule fact exists, and later claims interpret it;
2. `unverified rumor`: the canonical event is that an anonymous account published a claim, not that the claim content is true.

```text
Contacts Self Profile: occupation = idol / public figure
+ eligible public context or approved rumor family
-> persisted Runtime decision
-> anonymous Claim
-> Community/Media post
-> optional entertainment-news follow-up
-> company contacts user through Chat/Phone
-> user responds through real owner capabilities
-> owner facts confirm statement, refusal, call result, schedule change, or no response
-> later posts and owner-validated state changes
```

The user may cooperate, ignore the issue, argue, make an unexpected statement, or contact someone else. Model conversation is not constrained to one scripted answer; event progression waits for structured owner facts rather than treating arbitrary summary text as canonical truth.

## 12. Fantasy, Mystery, And Investigation Use

The same fact/claim/post split supports other worlds:

- a fantasy gazette may publish a kingdom's official claim while the true cause remains hidden;
- a supernatural forum may mix real sightings, hoaxes, and misunderstood evidence;
- a detective feed may expose witness claims without revealing whether they are correct;
- subscription news may reveal world-scale changes before the user encounters them directly.

If the user saves a post as a clue, the future Investigation/Knowledge owner stores a reference to the post/claim/fact and the user's note. It must not copy the whole Community/Media database or silently mark the claim true.

## 13. Persistence, Retention, And Backup

Durability follows ownership:

- Contacts persists stable Self Profile values and revisions;
- domain Modules persist their canonical facts;
- Event Runtime persists Event Instances, decisions, deadlines, requests, references, and audit provenance;
- a future Player State owner persists only approved cross-module user-state values;
- a future World State And Arc Ledger persists only ownerless dynamic world facts and arc state;
- Community/Media persists committed accounts, posts, replies, reposts, subscriptions, and publication state;
- Investigation/Knowledge persists retained clue references and user-authored deductions.

Authoritative facts, accepted arc decisions, committed publications, and required provenance must not be silently or irreversibly truncated. Rebuildable feed projections, rankings, caches, and diagnostic logs may be bounded separately. Backup/restore must preserve stable references or report broken lineage honestly.

## 14. Failure And Safety Rules

1. Missing or stale Self Profile/context references fail closed for identity-conditioned eligibility.
2. A missing Community/Media Module means no publication request is executed; Runtime may keep a reviewable pending/failed result without fabricating a post.
3. A failed publication does not roll back an already confirmed domain fact.
4. A deleted or retracted post does not rewrite the original fact; its owner records the publication state and preserves required audit lineage.
5. High-impact identity, reputation, relationship, funds, schedule, legal, or safety effects require the existing owner confirmation/review policy.
6. Optional event permission can suppress optional incidents, but it cannot disable ordinary owner capabilities or required safety behavior.
7. World Hub may explain an arc but cannot become the normal authoring surface for Self Profile, posts, facts, or clues.

## 15. Implementation Gates

Implementation requires separate user acceptance for each stage. The 2026-08-15 Player Context V1 foundation completes the first named-family field/visibility freeze and focused deterministic unit foundation only; the remaining gates stay closed:

1. `DONE 2026-08-15 / PLAYER_CONTEXT_V1`: freeze the minimal structured Self Profile fields and visibility rules needed by the first K-pop identity families;
2. inventory every dynamic state input and assign an existing owner before considering a Player State Module;
3. prove whether Event Instance V2 is sufficient for the first long-running arc before adding a World State And Arc Ledger;
4. define the Community/Media product owner, account/post/claim Interfaces, retention, moderation, search/feed behavior, backup, and migration;
5. freeze one local-first K-pop fixture family with deterministic no-event, fact-backed, unverified-claim, stale-reference, provider-failure, and user-ignore paths;
6. `DONE 2026-08-15 / PLAYER_CONTEXT_V1`: implement focused unit tests before randomness or AI enrichment;
7. add user-facing E2E and visual evidence only when the matching native surface is promoted.

No further step is authorized merely because the read-only foundation is implemented. World evolution, dynamic Player State, world arcs, Community/Media, investigation/clues, random incidents, model enrichment, and user-facing native surfaces remain separately gated.

## 16. Explicit Do-Not-Do Rules

1. Do not store volatile player stats in Contacts Self Profile for convenience.
2. Do not treat WorldBook as dynamic world-state storage.
3. Do not make Event Runtime the canonical owner of every world fact.
4. Do not treat a post, claim, model output, Phone summary, or Event Surface projection as proof of truth.
5. Do not create a universal feed inside World Hub or Chat Me and call it the Community/Media owner.
6. Do not infer user intent, occupation, guilt, location, relationship, or public behavior from coordinates, free text, or model classification alone.
7. Do not publish or mutate state directly from generated text.
8. Do not require a generic card, popup, or choice list for event participation.
9. Do not create a new event route, EVE stage, Calendar/Agenda Journey effect, Mini Scene, or CG/media implementation from this document.
10. Do not promise closed-page autonomous world evolution without a separate identity, privacy, storage, conflict, and backend decision.
