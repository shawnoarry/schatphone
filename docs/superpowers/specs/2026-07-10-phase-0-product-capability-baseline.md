# SchatPhone Phase 0 Product Capability Baseline

Updated: 2026-07-14

Status: `WORKING_DRAFT`

Current coverage: `Journey 1 - identity, role, conversation, and relationship continuity`

This is an evidence-first Phase 0 working artifact. It records what current code and tests prove before the user confirms the final product target.

It is not a roadmap, not an architecture implementation plan, and not a declaration that the listed capabilities are product-complete.

Resume context:

- `docs/superpowers/plans/2026-07-10-phase-0-product-baseline-conversation-handoff.md`

## 1. Evaluation Method

Every capability is evaluated on three separate axes.

| Axis                 | Values                                                         | Question                                                     |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Implementation state | `Absent`, `Skeleton`, `Usable`, `Loop complete`, `Stable`      | What can the current product demonstrably do?                |
| Product completeness | `Undefined target`, `Early`, `Partial`, `Meets current target` | How much of the intended user outcome exists?                |
| Evolution readiness  | `Blocking debt`, `Coupled`, `Extendable`, `Guarded`            | Can the capability grow without compounding structural risk? |

Rules:

1. tests prove current behavior, not final product completeness;
2. a persisted field without a working user flow is `Skeleton`;
3. a complete narrow loop may still be `Partial` against the user's intended product;
4. product completeness remains `Undefined target` until the user confirms the target;
5. facts and inferences must remain visibly separate;
6. after every user-confirmed target boundary, update this file and the linked conversation handoff before asking the next question, because remote conversation compaction is not a reliable progress record.
7. before each product decision, brief the user as a project manager newly entering that unfinished area: explain current behavior, implemented evidence, prior design intent, missing behavior, ownership, contradictions, constraints, and risks before presenting options or a recommendation.

Planning-alignment rule:

- do not assume that a stored field, old design term, passing test, or completed narrow loop is already a user-understood product capability;
- distinguish `implemented now`, `documented intent`, `proposed target`, and `absent/incomplete` explicitly;
- define unfamiliar concepts through concrete examples and ask one bounded decision at a time;
- if the user says the premise was not explained adequately, reopen and revalidate the decision instead of continuing from it.

## 2. Journey 1 Definition

Current working journey:

```text
Create Self/Main Role/NPC
  -> maintain the role profile
  -> bind a role into Chat
  -> converse and exchange structured messages
  -> apply communication state and relationship facts
  -> aggregate and review memories
  -> reset, unbind, upgrade, or delete safely
```

Primary product owners:

- `Contacts`: global role archive and role-centered management;
- `Chat Directory`: Chat binding, groups, and service/official account membership;
- `Chat`: conversations, messages, thread behavior, and applied communication state;
- `Relationship Runtime`: relationship metrics, stage, milestones, facts, and memory groups;
- `Event Runtime`: generated-event eligibility, limits, audit, and pending proposals;
- `World Hub`: optional review plus limited commands.

Important implementation note:

- although Contacts is the product owner of the role archive, role profiles are physically stored inside `src/stores/chat.js` together with Chat contacts, conversations, and messages.

## 3. Current Capability Matrix

Product-completeness values intentionally remain `Undefined target` until user review.

| Capability                          | Current implementation fact                                                                                                                                                                                                      | Implementation                            | Product completeness | Evolution readiness                              | Current owner / main dependency                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Contacts entry and role list        | Home opens Contacts. The first screen groups My Profile, recent interactions, Main Roles, and NPC/world roles and supports profile search.                                                                                       | `Usable`                                  | `Undefined target`   | `Coupled`                                        | Contacts UI reads `chatStore.roleProfiles`.                                                                                      |
| Self/Main/NPC data model            | The schema stores all three entity types. Self cannot enter Chat; NPC and Main can.                                                                                                                                              | `Usable`                                  | `Undefined target`   | `Coupled`                                        | Profile schema plus Chat store.                                                                                                  |
| Self Profile creation               | Existing Self profiles are displayed and an empty-state prompt exists, but the create dialog exposes only Main Role and NPC.                                                                                                     | `Skeleton`                                | `Undefined target`   | `Coupled`                                        | Contacts UI / Chat store.                                                                                                        |
| Role profile editing                | Users can edit Role ID, name, role, biography, avatar, tags, details, template link, concrete world fields, visibility, knowledge links, assets, and relationship premise/classification fields.                                 | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Contacts coordinates System, Chat, Gallery, and WorldBook-derived data.                                                          |
| Role ID                             | Role IDs must start with digits, may use a letter suffix, and are checked for duplicates.                                                                                                                                        | `Loop complete`                           | `Undefined target`   | `Extendable`                                     | Chat store profile normalization.                                                                                                |
| World profile values                | WorldBook defines templates; Contacts selects a template and saves concrete per-person values and visibility into the role profile. AI can draft empty/adapted values but explicit save remains required.                        | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | WorldBook/System template state plus Contacts/Chat profile state.                                                                |
| NPC upgrade                         | NPC can be upgraded while preserving the same profile, values, Chat binding, and history. Current UI always upgrades with lightweight relationship capabilities.                                                                 | `Usable`                                  | `Undefined target`   | `Coupled`                                        | Contacts action / Chat store.                                                                                                    |
| Chat binding                        | Chat Directory lists bound and unbound role profiles, supports individual/batch bind and unbind, and filters by binding/social/type state.                                                                                       | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Chat Directory owns binding; role archive remains in the same physical store.                                                    |
| Direct Chat                         | Users can send text, manually invoke AI, configure per-thread reply/context/image/automation preferences, and view the world context used for the thread.                                                                        | `Loop complete`                           | `Undefined target`   | `Blocking debt`                                  | Chat view coordinates Chat, System, Book, World, Gallery, Map, Wallet, commerce, Calendar, Relationship Runtime, and Simulation. |
| Rich messages                       | Supported sends include Gallery/local image or GIF, external link, current location, transfer card, virtual voice card, and Shopping share. Source apps retain source truth.                                                     | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Chat plus Gallery/Map/Wallet/Shopping.                                                                                           |
| Message lifecycle                   | Users can quote, copy, save, edit, restore semantic text, reroll, recall, and delete. Delete is trace-free; recall keeps a notice and removes original content from later context/actions.                                       | `Loop complete`                           | `Undefined target`   | `Extendable`                                     | Chat store and focused message modules.                                                                                          |
| Chat social channel                 | Users can greet/request, accept/decline, block/unblock, and retain readable history while a thread is restricted. Generated greeting/refusal/block/restore/unblock events enter the runtime review path.                         | `Usable`                                  | `Undefined target`   | `Guarded`                                        | Chat owns applied state; Event Runtime owns generated proposal audit.                                                            |
| Group target setup                  | Users can select at least two bound roles and create/edit/delete a group with natural, mention, round-robin, or manual reply metadata.                                                                                           | `Skeleton`                                | `Undefined target`   | `Blocking debt`                                  | Chat owns group metadata and history.                                                                                            |
| Multi-role group conversation       | Group members and reply mode enter prompt context, but there is no multi-speaker scheduler or manual speaker picker.                                                                                                             | `Absent`                                  | `Undefined target`   | `Blocking debt`                                  | No complete owner exists yet.                                                                                                    |
| Relationship premise/classification | Contacts stores premise prose, initial seed fields, categories/modifiers, confidence/source metadata, and AI/user-confirmed classification. User-edited classification is protected from silent AI overwrite.                    | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Role profile owns premise/classification; Event Runtime may read saved category/modifier fields.                                 |
| Relationship truth                  | Relationship Runtime stores affinity, trust, intimacy, tension, dependency, stage, milestones, growth traits, facts, and pending effects. Low-impact facts can apply; major/confirm-gated facts wait.                            | `Usable`                                  | `Undefined target`   | `Guarded`                                        | Relationship Runtime.                                                                                                            |
| Cross-module relationship facts     | Shopping, Food Delivery, Wallet, Phone, Map, and confirmed Calendar actions submit compact facts without transferring source-record ownership.                                                                                   | `Loop complete` for named sources         | `Undefined target`   | `Extendable` but interface leaks store knowledge | Source app plus relationship fact adapter/runtime.                                                                               |
| Memory aggregation                  | Explicit `memoryKey`/source lineage groups several facts into one primary memory with supporting facts and separate prompt/review summaries.                                                                                     | `Loop complete` for explicit lineage      | `Undefined target`   | `Guarded`                                        | Relationship Runtime.                                                                                                            |
| Memory review                       | Contacts can filter/sort memories, inspect sources and supporting events, set Pinned/Active/Archived, add a review note, and delete one memory group. Archived memories leave default current summaries and Chat prompt context. | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Contacts UI plus Relationship Runtime.                                                                                           |
| Role proactive contact              | Foreground runtime can choose one eligible stranger/declined role and turn it into an incoming Chat request under cooldown/cap rules. It does not generate a natural role message or ongoing interaction.                        | `Skeleton`                                | `Undefined target`   | `Guarded`                                        | Event Runtime plus Chat social state.                                                                                            |
| Runtime review                      | World Hub filters event logs and relationship facts, explains selected items, approves/dismisses pending Chat social proposals and relationship effects, and can reset a relationship or delete one memory group.                | `Usable`                                  | `Undefined target`   | `Coupled`                                        | World Hub coordinates Simulation, Relationship Runtime, Chat, and source modules.                                                |
| Service/official accounts           | Chat supports account management, inbox grouping, unread/mute/fold state, source-linked commerce notifications, source-open actions, and Chat replies. Broader source plans remain descriptive.                                  | `Loop complete` for named commerce events | `Undefined target`   | `Coupled`                                        | Chat owns communication; source apps own business records.                                                                       |
| Unbind                              | Unbinding deletes the Chat target, its conversation object, and its message history but leaves the global role profile.                                                                                                          | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Chat Directory / Chat store.                                                                                                     |
| Relationship reset                  | Reset preserves the role profile and Chat binding but clears relationship runtime state, event-attached details, and Chat conversation history. Manual profile details remain.                                                   | `Loop complete`                           | `Undefined target`   | `Coupled`                                        | Contacts orchestrates Chat, Relationship Runtime, and cleanup adapters.                                                          |
| Role deletion                       | Hard delete removes the role profile, Chat bindings/history, and relationship runtime. It can optionally clean linked source records through owner-specific handlers.                                                            | `Loop complete`                           | `Undefined target`   | `Guarded`                                        | Contacts orchestration plus each source owner.                                                                                   |
| Local backup                        | Profiles, bindings, messages, and relationship runtime enter one Settings backup/restore workflow, but Chat-level nickname/avatar/anonymity fields are omitted and Gallery binaries are optional/capped.                         | `Usable` for structured state             | `Undefined target`   | `Coupled`                                        | Local archive workflow plus domain stores.                                                                                       |

## 4. Verified End-To-End Paths

### 4.1 Role to conversation

```text
Contacts creates Main/NPC profile
  -> Chat Directory binds profile
  -> Chat target and conversation are created
  -> Chat reads role/world/relationship context
  -> user and AI exchange messages
```

This path is implemented. It does not prove that role behavior, proactive contact, or group behavior meets the intended target.

### 4.2 Cross-module memory

```text
User confirms an action in a source app
  -> source app keeps its own record
  -> relationship adapter submits a compact fact
  -> Relationship Runtime applies or holds the effect
  -> facts sharing explicit lineage form one memory
  -> Contacts reviews the memory
  -> Chat can receive the compact recall summary
```

This path is implemented for named low-impact sources. Semantic/fuzzy dedupe is not implemented.

### 4.3 Generated social proposal

```text
Chat AI output or foreground tick proposes a role-side social event
  -> Event Runtime validates target, state transition, limits, and risk
  -> low-risk greeting becomes an audited incoming request
  -> refusal/block/restore/unblock waits for World Hub review
  -> approved result changes Chat communication state
```

This path is narrow. Approval currently does not also create a Relationship Runtime fact or memory.

### 4.4 Destructive lifecycle

```text
Contacts previews impact
  -> user confirms a scoped operation
  -> owner-specific records are cleared or retained according to operation
  -> remaining state is recomputed or removed
```

Three operations have different current semantics:

- unbind: keep profile, remove Chat target and history;
- reset relationship: keep profile and binding, clear Chat history plus dynamic relationship/event state;
- delete role: remove profile, Chat target/history, runtime state, and optionally linked source records.

These semantics are implemented but still require explicit product-target confirmation in Phase 0.

## 5. Confirmed Gaps And Code/Document Mismatches

These are current implementation facts, not proposed solutions.

### 5.1 Role archive and lifecycle

1. Contacts cannot create Self Profile through its current create dialog.
2. The Contacts section labeled `Recent interactions` is not ordered by a last-interaction timestamp; its current score uses Chat binding, memory count, and event-detail count.
3. There is no role-level Archived, Disabled, or Restored lifecycle.
4. There is no dedicated Main Role to NPC downgrade.
5. NPC upgrade UI always chooses lightweight relationship capability.
6. There is no later product control for switching a role between lightweight and full relationship capability.
7. Capability flags such as `canUseFullRelationshipProgress` are stored, but Relationship Runtime does not enforce them when facts are recorded.
8. `initialRelationshipSeed` is stored in the role profile but is not applied when Relationship Runtime creates a new entity.

### 5.1.1 Self identity and save container

1. Settings user profile and Contacts Self Profile are separate persisted records with overlapping identity meaning.
2. The store can hold more than one `self_profile`, while Chat prompt assembly reads only the first one and does not select by current world.
3. Chat-level nickname, avatar, and anonymity plus per-thread avatar overrides exist as separate presentation layers.
4. Anonymous prompt handling hides the Settings profile summary but does not remove visible Self Profile world fields or relationship context from other prompt blocks.
5. Settings backup omits Chat `moduleIdentity` and `moduleAvatarOverrides`, so Chat-level identity settings are not part of a reliable complete restore.
6. The app uses one fixed persistence namespace per browser/Web App storage container. Ordinary same-origin tabs share that persisted state and are not independent saves.

### 5.2 Chat and group behavior

1. Group member/mode storage exists, but multi-role speaking does not.
2. Manual group mode promises user speaker selection without a speaker-picker implementation.
3. Thread defaults shown from Chat Settings do not currently form a full default-policy editor; meaningful settings are mostly per-thread.
4. Rich-media code paths have automated coverage, but physical device media-picker behavior remains a later validation item.

### 5.3 Relationship and memory

1. Contacts cannot manually create, merge, split, or rewrite a structured relationship memory.
2. Memory dedupe requires explicit source lineage; no fuzzy text/semantic merge exists.
3. Relationship Runtime caps entities at 300 and events at 500.
4. Old events are truncated without recomputing already-applied metrics, so a long-running save can retain effects whose original audit event has disappeared.
5. Approved Chat social proposals change Chat state but do not create a relationship fact/memory.

### 5.4 Event Runtime and World Hub

1. Foreground role initiative is only an incoming-request pilot, not autonomous role conversation.
2. It runs only while the app is visible, unlocked, foregrounded, and enabled.
3. High-risk relationship-gate presets are defined and tested but are not currently wired into production proposal submission.
4. Current docs overstate that Chat review policy consumes those presets.
5. World Hub is not purely read-only: it has limited apply, dismiss, reset, and delete-memory commands.
6. Event logs and relationship facts live in separate stores without one shared event-to-relationship transaction/trace contract.
7. No World Hub-specific Playwright flow was found; current evidence is primarily Vitest-level.

### 5.5 Architecture/evolution

1. Contacts is the semantic role owner, but the Chat store is the physical role archive.
2. ChatView directly coordinates many product owners and the ordered AI-turn workflow.
3. ContactsView and ControlCenterView similarly coordinate many stores and cleanup actions.
4. Several extracted display composables have wide interfaces and one caller, so moving more presentation code alone will not create durable module depth.

## 6. Evidence Index

Primary current code:

- `src/views/ContactsView.vue`
- `src/views/ChatDirectoryView.vue`
- `src/views/ChatGroupsView.vue`
- `src/views/ChatView.vue`
- `src/views/ControlCenterView.vue`
- `src/stores/chat.js`
- `src/stores/relationshipRuntime.js`
- `src/stores/simulation.js`
- `src/lib/contacts-relationship-actions.js`
- `src/lib/relationship-fact-adapters.js`
- `src/lib/chat-social-event-review.js`
- `src/lib/chat-social-runtime-source.js`
- `src/lib/simulation/foreground-session-tick-lifecycle.js`

Primary test evidence:

- `tests/contacts-profile-entities-store.test.js`
- `tests/contacts-profile-template-view.test.js`
- `tests/contacts-relationship-actions.test.js`
- `tests/contacts-relationship-backup-restore.test.js`
- `tests/chat-store-model.test.js`
- `tests/chat-social-state.test.js`
- `tests/chat-social-event-review.test.js`
- `tests/chat-ai-social-proposal-entry.test.js`
- `tests/chat-service-subscriptions.test.js`
- `tests/relationship-runtime-store.test.js`
- `tests/relationship-fact-adapters.test.js`
- `tests/control-center-view.test.js`
- `e2e/contacts-phone-ui.spec.js`
- `e2e/worldbook-contacts-profile-fields.spec.js`

## 7. User Target Decisions Needed

These questions must be answered one at a time. Do not infer the answers from current code.

### Confirmed decision 1: Main Role and NPC use configurable capabilities with defaults

User answer: option `B`, re-confirmed on 2026-07-13 after reviewing the current implementation and the difference between labels, stored capability fields, and enforced product behavior.

Target meaning:

- `Main Role` and `NPC` remain meaningful narrative/identity labels and provide different default depth presets;
- Main Role defaults to deeper relationship, memory, proactive behavior, and long-running story capabilities;
- NPC defaults to a lightweight world-person experience but may opt into individual deeper capabilities without first becoming a Main Role;
- a Main Role is not forced to use every deep capability, and may keep selected areas lightweight;
- identity type is neither a hard permission tier nor a permanent ceiling on what a role can do;
- actual behavior must eventually be controlled by explicit, user-understandable capability contracts rather than by the type label alone;
- role or world templates may propose capability defaults, but the ownership, override, and confirmation rules still require separate review.

Current implementation warning:

- the product currently stores six capability booleans, but exposes no user-facing capability editor or default-versus-override provenance;
- only Chat Directory eligibility is directly enforced as a broad product gate; the relationship, memory, route, world-event, and social-feed fields are incomplete or mostly descriptive;
- the current NPC-to-Main action defaults to lightweight relationship mode, so its `unlock main-role capabilities` copy overstates the effective behavior;
- option `B` is therefore the confirmed target direction, not a claim that the current capability system already implements it.

Still undecided within this contract:

- the user-visible capability families and the concrete experience each one enables;
- which capabilities should be independent and which must share one continuity contract;
- where role-level choices live and how world-template recommendations interact with them;
- how explicit role overrides merge during Main Role/NPC type conversion;
- which capability changes require user confirmation;
- how existing records are handled when a capability is later disabled.

### Confirmed decision 2: one isolated desktop client runs one current save

Target meaning:

- one independently isolated desktop Web App or browser storage container owns one current SchatPhone save;
- SchatPhone does not provide internal save slots, multiple active worlds, or workspace switching;
- the user may operate several separately installed/exported desktop clients when their browser or operating system gives them isolated website-data containers;
- ordinary tabs or windows inside the same browser profile and origin are the same save, not independent worlds;
- complete local backup export/import remains one whole-product archive of all settings and data for migration and restore;
- no separate identity-copy, cross-save synchronization, or workspace layer is needed;
- cross-save synchronization, conflict merging, and parallel-world runtime are outside the current target.

### Confirmed decision 3: Settings owns one active global profile plus optional profile documents

Target meaning:

- one current save has one globally unique active user-profile slot;
- Settings is the sole input, detailed editing, deletion/reset, application, and reusable-document management surface;
- Contacts renders a special-format projection aligned with its role directory, but does not own or independently edit another Self Profile record;
- the Contacts projection is not a Main Role/NPC-style context source and must not itself enter Chat conversation context;
- each feature may own feature-specific avatar, nickname, anonymity, and detail-guidance settings as presentation/privacy overrides without creating another user profile;
- Chat may use the global user profile only when the current Chat mode permits it; anonymous mode must prevent all user-profile context from being sent with a conversation request;
- Settings may save multiple optional user-profile documents as reusable templates. These documents are inert and are not additional active identities;
- `Apply globally` copies one optional document into the active global slot. Later edits to either record do not silently change the other;
- `Save as optional profile` stores current profile content as a reusable document without applying it globally;
- optional documents do not appear as Contacts identities and cannot enter feature or Chat context until explicitly applied;
- deleting the active profile clears it to an empty/unconfigured slot while preserving optional documents;
- complete backup includes the active slot, all optional documents, and every feature-owned override through the existing whole-product export/import flow.

Rejected alternatives:

- no live link between an optional document and the active global profile;
- no multiple switchable active user profiles or internal identity/save-slot system.

### Confirmed decision 4: role pause and archive form a reversible depth hierarchy

Target meaning:

- this lifecycle applies to Main Roles and NPCs, not to the global user personal profile;
- `Active` roles appear in ordinary Contacts and Chat surfaces and may participate in allowed conversation/runtime activity;
- `Paused` roles remain visible in ordinary Contacts and Chat lists for profile/history review, while all role-profile-sourced world activity stops: no new reply, proactive contact, scheduled action, background/runtime participation, AI ecosystem movement, alternate-account attempt, or role-directed proxy contact may originate from that profile;
- `Archived` is a deeper level that implies pause and removes the role from ordinary Contacts lists, Chat lists, and runtime/event candidate pools;
- archiving preserves the role profile, original Chat thread/history, relationship state, and memories;
- Contacts owns `Archived Roles` as the sole restore entry. Chat does not restore archived roles;
- archived role detail remains reviewable in Contacts, including profile, relationship/memory review, and a Chat-history summary;
- restoring returns the role to ordinary Contacts and its original Chat thread/history, but keeps the role paused and read-only until explicitly resumed;
- restore must not create a new role/thread or reset relationship and memory state.

Rejected boundary:

- pause must not merely disable role-initiated messages and background/runtime activity while ordinary user-initiated conversation remains available, because that duplicates the existing proactive-activity and background-activity switches for active roles.

### Confirmed decision 5: pause is a global role/world-activity gate, not a Chat state

Target meaning:

- every event, message, request, alternate account, proxy route, or AI-generated ecosystem action attributable to a paused role profile is blocked before it reaches another feature;
- a paused role cannot bypass the gate through another communication method, a newly generated account, a relative/friend account acting on its behalf, or a temporary conversation request;
- a different active role may independently mention the paused role, but that remains the active role's action and does not become activity by the paused role;
- public or ambient content may still contain the same name when AI-model knowledge or world content independently knows the real, historical, fictional, K-pop, or other prototype;
- same-name ambient content is not automatically bound to the SchatPhone role profile and cannot resume it, create Chat requests, advance relationship state, create memories, or enter role-runtime history without explicit provenance linkage;
- Chat block and Chat contact deletion simulate communication-app state. They do not pause or delete the global role;
- an active role may later support other-channel contact, new friend requests, alternate accounts, or relationship-network contact attempts after Chat block/delete;
- those bypass behaviors are target semantics and may not be implemented today;
- pause overrides all current and future channel-bypass behavior until explicit resume.

### Confirmed decision 6: paused Chat threads remain visible but read-only

Target meaning:

- a paused role remains visible in ordinary Contacts and Chat lists with a clear paused-state indicator;
- its original Chat thread and history remain available for review, but the thread is read-only while the role is paused;
- Chat disables message composition, AI reply generation, friend-request actions, and role-driven shortcuts for that thread;
- the paused-state notice routes lifecycle management to the Contacts role detail;
- Contacts continues to allow profile, history, relationship, and memory review for the paused role;
- Contacts is the only ordinary management surface that can resume the global role lifecycle. Chat does not own a separate resume toggle.

Rejected alternatives:

- do not hide paused threads from Chat, because hiding belongs to the deeper Archived state;
- do not expose a Chat-owned resume action, because Chat owns communication state rather than the global role lifecycle.

### Confirmed decision 7: hidden relationship truth provides continuity while AI provides interpretation and expression

Target meaning:

- SchatPhone keeps a persistent, auditable relationship truth layer so long-term relationships do not depend on one model call or the current Chat context window;
- this truth includes confirmed facts and memories plus slow-changing relationship state; it is not ordinary user-facing game score;
- AI interprets a confirmed event through the role's identity, values, history, current situation, and relationship state, then expresses emotion, intention, hesitation, initiative, or restraint in natural language and behavior;
- AI may propose structured appraisal, short-term emotion, intention, memory importance, and bounded relationship effects, but it cannot silently rewrite confirmed facts or directly set arbitrary long-term values;
- deterministic validation, limits, ownership rules, persistence, and audit decide which proposed effects become relationship truth;
- short-term emotion and open intentions/unfinished matters are separate from slow relationship state, so a temporary mood can decay without erasing lasting trust damage or a remembered event;
- ordinary Chat and phone-life surfaces communicate relationship change through behavior and natural-language summaries rather than visible numeric meters;
- optional special-control surfaces may reveal the underlying values for review or control, but their read/write hierarchy remains a separate decision.

Rejected extremes:

- do not make fixed numeric thresholds directly script ordinary dialogue or expose the product as a conventional affection-meter game;
- do not delegate persistent relationship truth entirely to AI-generated prose or model memory, because that cannot reliably preserve continuity, ownership, or auditability.

### Confirmed decision 8: World Hub inspects relationship values; Cheats performs explicit overrides

Target meaning:

- ordinary Chat and Contacts summaries remain non-numeric and communicate relationship change through behavior and natural language;
- World Hub may reveal hidden relationship values, stages, trends, contributing events, uncertainty, and pending effects for review and explanation;
- World Hub does not provide broad direct numeric editing, but retains bounded commands such as approve/dismiss, relationship reset, and memory-group deletion;
- future Cheats is separately enabled and owns explicit numeric or state overrides;
- every Cheats override records before/after state, time, reason, and manual-intervention provenance, and supports preview, safe undo, and downstream recomputation where applicable;
- a manual override must not fabricate a natural relationship event or shared memory that never happened;
- the current product already has part of the World Hub numeric review baseline, while the Cheats editor remains a future product surface.

Rejected alternatives:

- do not hide all numeric evidence from World Hub, because that makes relationship behavior difficult to explain or audit;
- do not place broad freeform value editing in World Hub, because that would turn an optional review surface into an everyday administration console and blur its boundary with Cheats.

### Confirmed decision 9: every active AI role has a minimum personhood and continuity baseline

Target meaning:

- every active Main Role and NPC receives a non-disableable baseline of stable identity/boundaries, current world/time awareness, communication and lifecycle state, recent-interaction continuity, lightweight relationship state, minimal salient memory, and transient emotion/intention;
- `Active` here excludes paused and archived roles, whose previously confirmed lifecycle gate still blocks new role-profile-sourced activity;
- the baseline preserves believable personhood; it does not imply full background autonomy, unlimited memory, detailed numeric simulation, or a long-running story route for every NPC;
- Main Role/NPC presets and per-role settings scale relationship resolution, memory horizon, autonomous-agency scope, continuous-story complexity, update frequency, and context/resource budgets above the baseline;
- an NPC may deepen one dimension without changing identity type, and a Main Role may keep one dimension lightweight;
- user personal profiles, service/official accounts, and non-character system actors use separate contracts rather than inheriting this AI-role baseline.

Rejected alternatives:

- do not allow capability switches to remove basic memory, emotion, or relationship continuity from an otherwise active AI role, because that produces fluent but hollow characters;
- do not run every role at full deep-simulation scope, because that creates excessive context cost, background noise, low-value records, and uncontrolled ecosystem activity.

### Confirmed decision 10: program-owned six-dimensional truth is projected to AI through a constrained interface

Target meaning:

- Relationship Runtime is the sole owner and writer of the complete six-dimensional long-term relationship state; the exact six dimension names and semantics remain to be frozen;
- complete numeric state, provenance, evidence, lenses, facets, memories, and audit history remain program-internal and are not copied wholesale into every AI prompt;
- a deterministic context projector selects only the current role/event-relevant state and renders it as qualitative relationship guidance, relevant evidence, current emotion/intention, unresolved matters, and behavioral constraints;
- AI receives that bounded projection, generates natural expression, and may return a schema-constrained proposal for appraisal, transient emotion, intention, memory importance, and categorical relationship effects;
- AI does not perform relationship arithmetic, create arbitrary dimensions/lenses/facets, or directly mutate persistent truth;
- a deterministic validator checks event provenance, role lifecycle, dedupe, allowed enums, per-event bounds, cooldowns/caps, lens applicability, and review requirements before applying, rejecting, or holding a proposal;
- relationship lenses are persistent records with source/confidence metadata: user-confirmed premise and world/template definitions have priority, accumulated evidence may create candidates, and AI may suggest but not silently replace them;
- World Hub/Cheats may inspect numeric truth under the already confirmed hierarchy; ordinary AI prompts normally receive qualitative bands and causal summaries rather than raw values.

Rejected alternatives:

- do not let each model call reinterpret the complete relationship schema or select a new relationship lens from free text;
- do not treat AI-generated prose as an implicit state mutation;
- do not send the full numeric/audit/memory graph on every request, because it increases token cost and semantic confusion without improving the current response.

### Confirmed review scope: type conversion first, duplication second, world migration in Journey 2

- review Main Role/NPC type conversion next as part of Journey 1 role lifecycle;
- treat the existing NPC-to-Main upgrade and the proposed Main-to-NPC downgrade as two directions of one role type-conversion contract rather than unrelated actions;
- review role duplication after type conversion because duplication creates a new identity and needs separate preservation rules;
- defer world migration to Journey 2, where current-world ownership, world templates, and cross-world field mapping can be defined first;
- this review order does not pre-confirm the detailed preservation behavior of type conversion or duplication.

### Remaining questions

1. Which relationship processing must always be deterministic/local, and when may AI appraisal participate in the same Chat call or an optional separate call?
2. What are the exact six universal relationship dimensions and their non-overlapping semantics?
3. Which controlled lenses/facets exist, and what evidence/review changes them?
4. What depth controls define memory horizon, autonomous agency, and continuous-story complexity?
5. After those capabilities are defined, how should role-level overrides and type conversion work?
6. Which role data may be copied into a new identity during role duplication?
7. Should `initialRelationshipSeed` initialize live Relationship Runtime metrics or remain profile-only premise context?
8. What should relationship reset preserve or remove, especially Chat history?
9. What should unbinding from Chat preserve if the role is later rebound?
10. Should users manually author/edit memories, or should memories remain event-derived with review controls only?
11. What is the target group-chat speaking model?
12. Which relationship/social changes require World Hub review, and which should happen immersively without administration?

## 8. Current Question For User Review

The ownership/projection boundary is confirmed. The next architecture decision is the runtime split between built-in deterministic processing and bounded AI appraisal, including whether routine relationship processing requires additional model calls.

Question:

> Should relationship processing use a local deterministic core for facts, six-dimensional state, memory selection, decay, validation, persistence, and audit; fold subjective appraisal into the existing Chat response call when Chat already invokes AI; process objective/routine cross-module events with built-in rules; and reserve optional separate AI appraisal calls for ambiguous or high-salience events rather than every event?

Recommended target: yes. This keeps normal local computation cheap and reproducible, avoids doubling Chat latency/cost, and still lets AI interpret sarcasm, apology, perceived intent, mixed emotion, and memory importance where fixed rules are weak. If AI metadata is absent or invalid, the message may still succeed while no unverified relationship mutation occurs.

Alternative 1 uses rules only; it is cheap and stable but misses subjective interpretation. Alternative 2 calls AI for every event; it is expressive but adds latency, cost, model variability, offline failure, and excessive background requests.

## 9. Next Phase 0 Action

1. Confirm the deterministic-core plus bounded/optional AI-appraisal runtime split.
2. Freeze the six dimensions and relationship-lens/facet registry after the processing boundary is accepted.
3. Define lightweight/deep update frequency, context budgets, decay, and fallback behavior.
4. Continue with memory horizon, autonomous agency, and continuous-story complexity one at a time.
5. Only after capability meanings are confirmed, return to Main Role/NPC type-conversion defaults and override rules.
6. Review role duplication next; defer world migration until Journey 2.
7. Continue the remaining Journey 1 target questions one at a time.
8. Only after Journey 1 target review, derive its product gaps and architecture requirements.
