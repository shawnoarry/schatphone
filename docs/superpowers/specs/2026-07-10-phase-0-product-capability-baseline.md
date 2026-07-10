# SchatPhone Phase 0 Product Capability Baseline

Updated: 2026-07-10

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
5. facts and inferences must remain visibly separate.

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

User answer: `3 + 1`.

Target meaning:

- `Main Role` and `NPC` remain meaningful identity labels and provide default capability presets;
- Main Role defaults to deeper relationship, memory, proactive behavior, and long-running story capabilities;
- NPC defaults to a lightweight capability set and can be upgraded;
- actual behavior is controlled by independently configurable capabilities, which a role or world template may override;
- identity type must not become a permanent hard-coded ceiling on what a role can do.

Still undecided within this contract:

- how explicit role overrides merge when an NPC is upgraded;
- whether Main Role can be downgraded;
- which capability changes require user confirmation;
- how Self Profile relates to per-world and Chat identities.

### Confirmed decision 2: one isolated desktop client runs one current save

Target meaning:

- one independently isolated desktop Web App or browser storage container owns one current SchatPhone save;
- SchatPhone does not provide internal save slots, multiple active worlds, or workspace switching;
- the user may operate several separately installed/exported desktop clients when their browser or operating system gives them isolated website-data containers;
- ordinary tabs or windows inside the same browser profile and origin are the same save, not independent worlds;
- complete local backup export/import remains the migration, clone, and restore mechanism for one desktop client;
- cross-save synchronization, conflict merging, and parallel-world runtime are outside the current target.

### Remaining questions

1. Confirm the narrowed Self Profile contract: one per-save identity truth shared by Settings and Contacts, with Chat-only presentation overrides and copy-not-sync reuse across saves.
2. What does a complete role lifecycle require: archive, disable, restore, downgrade, duplicate, or world migration?
3. Should `initialRelationshipSeed` initialize live Relationship Runtime metrics or remain profile-only premise context?
4. What should relationship reset preserve or remove, especially Chat history?
5. What should unbinding from Chat preserve if the role is later rebound?
6. Should users manually author/edit memories, or should memories remain event-derived with review controls only?
7. How autonomous should roles be: requests only, generated messages, schedules, ongoing activity, or full event-driven initiative?
8. What is the target group-chat speaking model?
9. Which relationship/social changes require World Hub review, and which should happen immersively without administration?

## 8. Current Question For User Review

The Main Role/NPC decision and the one-isolated-desktop-client/one-current-save decision are recorded above. The user's Self Profile intent is substantially narrowed, but the detailed ownership contract has not yet been explicitly confirmed.

Question:

> Should each current save have exactly one personal profile, with Settings and Contacts opening the same identity truth, while Chat nickname/avatar/anonymity and optional per-thread avatar remain presentation overrides rather than additional profiles?

Recommended target awaiting confirmation:

1. One save contains one obvious `Self Profile / Personal Profile`.
2. Settings personal profile and Contacts `My Profile` are two entry points to the same data owner.
3. Base identity and current-world extension fields belong to that one per-save profile.
4. Chat can override nickname, avatar, anonymity, and optionally the avatar for one thread without creating another identity entity.
5. Reusing a standard identity in another independently managed save copies the profile as a starting point; the two saves do not remain linked.
6. Complete backup must include the base profile and all Chat presentation overrides.

Reason: this preserves one understandable "me" inside the simulated phone, supports believable Chat presentation, and does not force every world or independently managed save to share one mutable identity.

## 9. Next Phase 0 Action

1. Ask only whether the Self Profile contract in section 8 is confirmed.
2. Record the user's answer without broadening to later questions.
3. Update the target definition for Self Profile and contextual identity layers.
4. Continue the remaining Journey 1 target questions one at a time.
5. Only after Journey 1 target review, derive its product gaps and architecture requirements.
