# Work Hub First Event Production Plan After The Shell Portfolio / 壳子基座完成后的 Work Hub 优先事件生产规划

Updated: 2026-08-30

Status: `EVT-WORK-1_DONE_2026-08-29 / EVT-WORK-2_DONE_2026-08-29 / EVT-WORK-3_DONE_2026-08-30 / EVT-WORK-4_DONE_2026-08-30 / EVT-CHRONICLE-1_DONE_2026-08-30`

Supersession: this file preserves the 2026-08-24 `NEXT / 机会`-first career plan in repository history, but supersedes it as the default production recommendation. `NEXT` remains an external-opportunity product; it is not the normal work surface for a user who already belongs to a company, school, team, or other organization.

## 1. Accepted Product Boundary

- `Work Hub / 工作台` owns the user's work **inside an organization**: the user's active membership/workspace, channels, tasks, reporting, schedule proposals, approval requests, and credential/authorization projections. It is not an enrollment App that every Main Role or NPC must personally use.
- `NEXT / 机会` owns work **outside the current organization**: public jobs, external auditions, casting, headhunting, and cross-organization invitations.
- Calendar owns confirmed time commitments. Agenda Journey owns today/near-term execution. Map owns place, route, departure, arrival, and place-session truth. Activity Session owns the timed activity itself.
- `生活志 / Chronicle` projects personal continuity from confirmed owner facts while its separate Diary Owner persists only user-authored entries; it does not become a second schedule, event, work, Wallet, asset, or relationship owner.
- Messages/SMS remains conditional until a concrete phone-number or short-code flow cannot be represented honestly through Notification Center, Mail, Chat service accounts, or Phone.

Internal recording, music-show, radio, performance, rehearsal, class, assignment, and company schedule changes therefore begin in Work Hub or another organization owner. They do not begin in NEXT merely because they are career-related.

## 2. Accepted Production Order

1. Complete the Contacts V3 extensible profile card, persona confirmation, and bounded Event/Work Hub identity projections from `CONTACTS_V3_2A_EXECUTION_PLAN.md`. The bounded identity prerequisite is complete.
2. Correct and deepen Work Hub so its organization boundary, records, states, and actions are unambiguous. `EVT-WORK-1` is complete.
3. Establish one ordinary non-event organization work loop. `EVT-WORK-2` is complete.
4. Build the first Work Hub-native schedule-change event on top of that ordinary loop. `EVT-WORK-3` is complete.
5. Add revision-safe Agenda Journey/Map/Activity execution proof only under separately accepted `EVT-WORK-4`. This is complete.
6. Build `生活志 / Chronicle` after the owner-confirmed event chain produces meaningful canonical facts worth reviewing. `EVT-CHRONICLE-1` is complete.
7. Add Messages/SMS only when a concrete number/short-code scenario proves the missing product need.

This order does not declare any implementation complete or authorize a new production Store by itself.

Live dependency queue:

1. `EVENT-PREP-1 DONE 2026-08-27 / DOC_ONLY`: Contacts `CARD-2` has landed; the field-purpose, bounded-output, authority-separation, and fail-closed comparison is frozen in Section 2.1 below. This changes no runtime behavior and creates no event.
2. `EVENT-PROJECTION-1 READ_ONLY_DONE 2026-08-27`: the bounded confirmed-identity projection preserves stale/missing/cross-world/template/revision/visibility/purpose fail-closed behavior and creates no event or owner mutation.
3. `EVT-WORK-1 DONE 2026-08-29 / EVT-WORK-2 DONE 2026-08-29 / EVT-WORK-3 DONE 2026-08-30`: production organization authority, the ordinary non-event loop, and one Work Hub-native schedule-change event now exist without an AI dependency.
4. `EVT-WORK-4 DONE 2026-08-30`: the owner-confirmed Work Hub/Calendar/Agenda/Map/Activity chain now carries revision-safe execution proof without an AI dependency.
5. `EVT-CHRONICLE-1 DONE 2026-08-30`: the separate Diary Owner and finite deterministic owner projection are implemented without becoming a second source owner or requiring AI.

Event Runtime must not create a parallel identity form while Contacts work is active.

### 2.1 EVENT-PREP-1 — Contacts V3 identity-field comparison

This comparison remains the contract input for the landed read-only `EVENT-PROJECTION-1`; it is not a second event-owned identity schema. Player Context V1 keeps its frozen three-field K-pop allowlist and now applies the Contacts V3 purpose and revision gates below.

| Stable Contacts field | Event-purpose requirement | Accepted subject and meaning | Bounded Event output | Authority rule |
| --- | --- | --- | --- | --- |
| `occupation` | the current template field must explicitly include `event_eligibility`; an old field with an empty purpose list is not upgraded implicitly | Self Profile may establish the player's confirmed occupation for a named event-family policy. Main Role, Supporting Role, or World NPC values may be read only by a separately declared participant/issuer projection for a concrete event | one normalized scalar such as `identity.occupationId`; raw biography, field label, help text, and unrelated profile values stay out | occupation can satisfy identity eligibility; it cannot grant organization membership, issuer authority, publishing rights, attendance, or work completion |
| `affiliation` | the current template field must explicitly include `event_eligibility`; `work_hub_matching` alone is insufficient for Event Runtime | Self Profile provides a confirmed affiliation claim/reference for matching. A non-Self character may carry canonical character affiliation as Contacts-owned identity when a concrete event needs that participant or issuer | a bounded deduplicated affiliation-reference list such as `identity.affiliationIds`; no organization body, roster, credential, or free-text profile copy | Self Profile affiliation is never a Work Hub credential. Official organization actions require the organization owner to validate membership, role, issuer scope, world/profile binding, revision, expiry, and revocation |
| `public_identity` | the current template field must explicitly include `event_eligibility`; `public_content` alone does not authorize event use | Self Profile may establish the player's confirmed public/private identity mode for a named event-family policy. Other person types require a separately declared participant/publication use case | one normalized scalar such as `identity.publicIdentityMode`; no post body, rumor, reputation score, or audience inference | public identity may satisfy a bounded event condition; it does not prove that a publication occurred, that a claim is true, or that Community/Media may publish on the person's behalf |

Projection rules for `EVENT-PROJECTION-1`:

1. Contacts remains the sole owner of the profile, template, values, purpose flags, visibility, and confirmed profile revision. Event Runtime receives a read-only summary and stable references only.
2. Player eligibility uses exactly one unambiguous per-world Self Profile. Main Role, Supporting Role, and World NPC profiles are never substituted for the player. Their identity may cross only through a separately named participant/issuer projection with a concrete event need.
3. The exact world, template ID/version, profile ID/revision, and requested projection purpose must match at read time and again at event eligibility evaluation. A projection is evidence, not a durable second identity record.
4. A field must be present in the current linked template, support the requested subject type, carry `event_eligibility`, use an allowlisted field/value shape for that projection, and pass the projection's visibility policy. The broad list of field types capable of carrying an event-purpose marker does not make every such field valid for these three identity outputs.
5. Until a later contract explicitly broadens visibility, preserve Player Context V1's `public` and `world_specific` read boundary. `familiar`, `intimate`, `hidden`, or otherwise unauthorized values do not cross merely because the field has an event-purpose marker.
6. A Persona classifier result, AI suggestion, free-text import, template proposal, or unsaved edit is not identity evidence. After `PERSONA-2`, only the explicitly reviewed Contacts-owned saved profile revision may be projected; downstream consumers do not distinguish it from an equivalent confirmed manual save.
7. Producing a valid identity summary does not create an Event Instance, proposal, notification, Work Hub membership, Calendar item, Map state, Community post, or any owner mutation. A separately approved event recipe must still provide its trigger, owner facts, no-event path, cooldown/cap policy, native surface, and deterministic fixtures.

The projection must fail closed, or omit the individual field where the whole projection can remain unambiguous, for all of the following:

- missing, disabled, deleted, archived, unknown, duplicate, or ambiguous Self Profile;
- unconfirmed Persona draft, unsaved edit, template proposal, AI-only classification, or free prose without a confirmed Contacts value;
- missing `event_eligibility`, including legacy fields whose purpose list remains empty;
- field ID absent from the linked current template, unsupported subject type, unsupported field/value shape, invalid token/reference, duplicate conflicting value, or over-limit value list;
- missing or mismatched world, cross-world profile/template/value, template ID mismatch, template version mismatch, stale profile revision, or stale/conflicting owner reference;
- hidden/private visibility that the named projection is not authorized to read;
- a Self Profile that disallows world-event participation;
- `affiliation` presented without a separately valid organization-owner credential when the requested decision requires membership or issuer authority;
- a request that tries to treat identity output as proof of user intent, presence, attendance, work completion, publication, guilt, relationship truth, or another owner's canonical state.

## 3. Required Foundation Before The Event

### 3.1 Organization owner and authority

The production Work Hub owner must provide at least:

- stable `Organization`, `Membership`, `RoleAssignment`, `Team` and `Channel` identities;
- versioned membership and credential state with explicit issuer, scope, expiry, revocation, and world/profile binding;
- organization-owned `WorkNotice`, `Task`, `StatusReport`, `ScheduleProposal`, `ApprovalRequest`, and durable receipts;
- stale, deleted, revoked, duplicate, cross-world, cross-profile, and revision-conflict behavior;
- migration, backup/restore, write-failure rollback, and stable-ID dedupe.

Self Profile prose, an App display name, a local organization alias, fixture membership, coordinates, or model inference cannot grant the user's affiliation authority. A confirmed Main Role or NPC may already have stable Contacts-owned affiliation and position as character identity and does not need to apply through Work Hub. When such a role issues an official organization record, the organization owner validates its stable role reference and issuer relation. The same user authority model must support artist, manager, assistant, producer, employee, student, and teacher templates without hard-coding UI text as permission.

### 3.2 Ordinary non-event organization loop

Before Event Runtime participates, a user must be able to complete a normal organization workflow:

`organization work notice/proposal -> Work Hub review and explicit decision -> Calendar review and explicit Save when time is involved -> Work Hub receipt/status -> Agenda Journey/Map/Activity only when their own materialization conditions are met`

The first ordinary loop should prove:

- an authorized organization source can create a work notice or schedule proposal;
- Work Hub presents the source, revision, deadline, affected work, and available actions;
- accepting a proposal does not silently create Calendar truth;
- Calendar receives a structured handoff and only explicit Save creates or updates the canonical event;
- Work Hub derives the linked state from Calendar instead of storing a second event;
- declining, cancelling, leaving, closing, invalid source, or failed write shows no fake success.

## 4. First Work Hub-Native Event Family

Event family ID candidate:

`organization.work_schedule_change.v1`

First product case:

`existing organization work -> institution changes a confirmed or proposed schedule -> user handles the change in Work Hub -> Calendar confirms the resulting commitment -> Agenda Journey -> Map/Activity execution`

The K-pop example may be a recording, music-show, radio, rehearsal, performance, or company call-time change. The contract must also support a class change, assignment deadline, shift, client meeting, or ordinary company task.

### 4.1 Trigger

All of the following are required:

1. an active owner-confirmed organization membership and permitted issuer;
2. a stable work record and a current schedule proposal or Calendar-linked commitment;
3. an explicit organization-owned change request with revision and deadline;
4. Event Runtime eligibility, cooldown/cap, world/profile binding, and one-time decision gates;
5. exact lineage back to the organization record. Runtime does not invent the schedule change.

### 4.2 Native presentation

The event does not create an Event Home, a generic event card host, or a second event record.

- Notification Center may surface a bounded alert and deep-link to the exact Work Hub record.
- Work Hub shows the organization-native notice, affected task/activity, old/new values, deadline, source, and actions.
- Mail is an optional formal projection when the organization workflow calls for it; it does not own the work decision.
- Calendar shows only the review/update flow for time commitments and remains the canonical schedule owner.
- Agenda Journey, Map, and Activity Session participate only after their existing owner conditions are satisfied.
- Chronicle later shows a read-only summary of confirmed facts and stable owner links.

### 4.3 User actions and no-response

The first family should use a small allowlist appropriate to the organization request, for example:

1. `Accept / 接受`
2. `Request adjustment / 申请调整`
3. `Decline / 拒绝`

The request must state whether the old arrangement remains valid, is replaced, or was cancelled. No click is not acceptance, refusal, attendance, absence, lateness, or work completion. On timeout, the organization owner records an explicit expired/unresolved receipt; Event Runtime may coordinate the deadline but cannot invent a disciplinary, relationship, payment, or public consequence.

## 5. NEXT Participation Rule

`NEXT / 机会` participates only when the user is discovering or responding to an opportunity outside the current organization, including:

- public job applications;
- external auditions or casting;
- headhunting;
- invitations issued by another organization;
- the pre-affiliation path that may later produce a verified organization membership.

If an external opportunity succeeds and affiliation is formally created, subsequent internal work moves to Work Hub. NEXT remains useful, but it is not promoted as the default event hub for an already signed artist, enrolled student, or employed user.

## 6. Delivery Slices

### EVT-WORK-1 — Work Hub owner correction — `DONE 2026-08-29`

- define canonical organization, membership, role, team, channel, work-record, proposal, and receipt contracts;
- reconcile the current S1 fixture/local-preview state without silently upgrading it to authority;
- keep user membership/authority confirmation separate from Main Role/NPC character affiliation; organization rosters and issuers reference existing Contacts profile IDs instead of making every role complete a Work Hub application;
- add revision, revocation, stale-source, migration, backup, rollback, and dedupe rules;
- preserve Calendar as schedule owner and Map as place/journey owner.

### EVT-WORK-2 — Ordinary organization work loop — `DONE 2026-08-29`

- authorized work notice/proposal creation;
- Work Hub native review, accept/request-adjustment/decline, and durable owner receipt;
- shared Calendar handoff with explicit Save and stable return context;
- linked state derived from Calendar after reload;
- no Event Runtime dependency.

### EVT-WORK-3 — Work schedule-change event — `DONE 2026-08-30`

- Event Runtime eligibility, one-time request, deadline, lineage, and audit;
- Work Hub-native change handling;
- accepted, adjustment-requested, declined, expired, stale, revoked, and write-failure results;
- no hidden decision from silence or model output.

### EVT-WORK-4 — Execution handoff and proof — `DONE 2026-08-30`

- production-only proof requires the exact accepted Work Hub authority, Event Instance, owner fact, receipt, Calendar time, source revision, and prior-source lineage;
- Schedule Orchestrator and Agenda Journey preserve stable logical identity, execution revision, prior/pending proof history, and review-required source changes;
- Map participates only after explicit departure and persists the Agenda execution revision through arrival/cancellation/history/backup;
- Activity Session begins only after eligible arrival and an explicit user start, then carries the same execution revision in completion evidence;
- Notification Center emits one exact Agenda deep link per execution revision and rolls back partial cross-store writes;
- manual and S1 preview schedules remain usable without production execution proof;
- focused unit plus full lint/test/build/governance/diff and desktop/simulated Pixel 5 E2E, including day/night, zh/en, accessibility, reload, failure paths, and zero horizontal overflow.

### EVT-CHRONICLE-1 — First personal continuity projection

- completed after the Work Hub chain yielded owner-confirmed facts;
- establishes the schema-V1 Diary Owner and a non-persisted finite Chronicle projection according to the Map/Calendar package contract;
- cannot edit Work Hub, Calendar, Agenda Journey, Map, Activity, Wallet, Assets, relationship, world, or public truth;
- uses no model for ordinary reads or writes and does not implement AI recall, automatic diary generation, free-text fact extraction, or downstream consequences.

## 7. AI Boundary

The first loop and first event must work without AI.

- structured owner records determine authority, eligibility, actions, deadlines, and completion;
- AI may draft optional organization wording or an adjustment message;
- AI cannot grant membership, infer the user's occupation from prose, choose for the user, write Calendar, decide attendance/completion, or create downstream consequences;
- any future Phone or free-dialogue summary is only a proposal that the responsible owner must validate into a structured receipt.

## 8. Explicit Exclusions

- no Event Home App or generic event-card-first presentation;
- no promotion of NEXT into the internal organization work surface;
- no duplicate Calendar, journey, task, work, or event record inside a projection;
- no attendance, discovery, place, journey, or work completion inferred from coordinates or passive presence;
- no automatic contract, salary, Wallet, public-news, fandom, relationship, punishment, or reward consequence;
- no EVE-5, CG, Mini Scene, Community/Media propagation, or Narrative Timeline implementation in this slice;
- no Messages/SMS shell without a proven number/short-code requirement.

## 9. Acceptance Gate

The pre-event foundation gate is met: production organization authority and the ordinary Work Hub -> Calendar explicit-Save loop are implemented and validated. The first Work Hub event chain is not implemented.

The first Work Hub event chain is complete only when:

1. the ordinary non-event organization loop works first;
2. organization authority cannot be self-granted by profile text, local naming, fixtures, coordinates, or AI;
3. Work Hub owns the work decision while Calendar owns the confirmed time;
4. Runtime creates at most one correlated request and preserves exact source lineage;
5. every allowed action, timeout, stale source, revocation, and write failure has an explicit owner result without fake success;
6. Agenda Journey, Map, and Activity consume only confirmed owner facts;
7. Chronicle and SMS are not treated as prerequisites;
8. the required automated and visual evidence passes, with no physical-device claim unless real evidence exists.
