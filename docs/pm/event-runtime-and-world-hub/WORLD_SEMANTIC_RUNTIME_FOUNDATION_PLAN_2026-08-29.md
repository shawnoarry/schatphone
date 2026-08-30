# World Semantic Runtime Foundation Plan / 任意世界语义运行基座规划

Updated: 2026-08-29

Status: `ACCEPTED_DIRECTION / SETTINGS_PREVIEW_DONE / PROPOSAL_COMPILER_DONE / W2_PERSISTED_ACTIVATION_DONE / OWNER_NATIVE_PROOF_NEXT / W3_GATED`

## 1. Product Goal

SchatPhone must be playable after a user replaces the supplied setting with a substantially different authored world. The reusable product is not a modern K-pop world, a fantasy world, or a collection of genre branches. It is a foundation that can:

1. read user-authored terms without forcing them into one built-in genre;
2. preserve explicit uncertainty, contradiction, and missing information;
3. turn reviewed meaning into a versioned form that code can validate;
4. run eligibility, randomness, settlement, persistence, and replay deterministically;
5. let different model providers propose the same provider-neutral contract;
6. keep the result understandable and correctable from the user's point of view.

Modern K-pop realism remains useful as one detailed content and conformance fixture. It is never the definition of a complete engine.

## 2. The User-Facing Mental Model

Every AI-assisted world decision must answer three questions:

| Question | Product answer |
| --- | --- |
| What did AI say? | A temporary interpretation or structured proposal with evidence, confidence, unknowns, conflicts, provider/model, and request time. |
| What becomes true? | Nothing until a versioned schema validates it, code compiles it into allowed runtime meaning, and the required owner or user confirms it. |
| Who confirms it? | The user confirms authored semantic meaning; the relevant owner Module confirms domain facts and effects; Event Runtime only coordinates and audits. |

The first implemented user-facing slice follows this model in `Settings > World Setup`. It shows the current world's readable preparation state and allows one explicit configured-model check in ordinary language. The output is memory-only and cannot change world truth, events, or saves. World Hub remains hidden by default and is reserved for advanced usage evidence, lineage review, and correction rather than initial setup.

## 3. Truth Layers

The foundation keeps five layers separate:

1. **Authored source**: WorldBook text, encyclopedia entries, profile templates, capability Packs, and later persisted world identity.
2. **AI semantic proposal**: a bounded interpretation of custom concepts, capabilities, boundaries, unknowns, conflicts, evidence, and confidence.
3. **Reviewed semantic manifest**: a provider-neutral, versioned intermediate representation accepted by the user and validated by code.
4. **Compiled runtime manifest**: deterministic indexes, eligibility predicates, namespaces, owner references, capability bindings, and fail-closed rules produced from the reviewed manifest.
5. **Runtime truth**: owner-confirmed facts, persisted random decisions, Event Instances, effects, history, and replay evidence.

Text from layer 1 does not directly become runtime truth. AI output from layer 2 does not directly become layer 3. Event copy generated at runtime cannot rewrite layers 3 through 5.

## 4. Model And Code Cooperation

Both model use and code are needed, but at different moments.

### World initialization or deliberate recompile

AI may help interpret unfamiliar authored semantics. Code validates the response, presents differences and uncertainty, and compiles only reviewed meaning. This is the required semantic preparation step for a world that should participate fully in generic runtime behavior.

### Ordinary runtime

Code runs by default. It reads the compiled manifest and owner facts, checks eligibility, performs seeded or persisted random settlement, enforces cooldowns and caps, validates owner requests, writes audit evidence, and replays the same result without asking a model again.

### Explicit runtime checkpoints

AI may be called for bounded jobs such as optional event wording, a structured candidate, a role-appropriate response, or a new incident proposal. Each call has a declared input budget, schema, permission, cost/failure policy, provenance receipt, and local fallback. It cannot continuously operate as a hidden authority.

This means code and AI do cooperate, but AI is not the invisible engine running every tick. Code provides repeatability and boundaries; models provide interpretation and expressive variation inside those boundaries.

## 5. Provider-Neutral Semantic Contract

The formal contract should be a versioned semantic intermediate representation rather than provider-specific prompts or one genre taxonomy. Its first design pass should cover:

- stable custom concept IDs and display terms;
- concept kind plus user-defined namespace;
- aliases, evidence references, confidence, unknowns, and conflicts;
- actor, institution, place, resource, rule, and system relationships;
- capability declarations such as communication, travel, exchange, scheduling, work, performance, investigation, or user-defined actions;
- explicit prohibitions and permission requirements;
- state/fact ownership and the Module allowed to confirm it;
- bridges from custom meaning to generic runtime capabilities;
- source fingerprint and manifest version;
- compiler version and deterministic compilation receipt.

The generic runtime should understand capabilities and ownership, not require every world to use words such as idol, manager, spell, credit, school, or corporation.

### Custom namespaces and bridges

A world may define `tide_contract:chant_namer` without pretending it is a K-pop role or a fantasy class. A reviewed bridge may state that this role can participate in generic capabilities such as `public_naming`, `institution_message`, or `restricted_place_access`. The custom identity remains intact while reusable event archetypes can test declared capabilities.

No bridge is inferred into truth merely because one model considers two concepts similar.

## 6. Multi-Model Agreement

The contract must allow OpenAI-compatible, Gemini, Anthropic, local, or later providers to return the same normalized proposal shape.

For important compilations, the product may later support multiple proposal receipts:

- each receipt records provider, model, schema version, source fingerprint, request ID, generation time, and normalized proposal hash;
- matching proposals can raise review confidence but do not auto-confirm truth;
- disagreements remain visible field by field;
- one model cannot silently overwrite another proposal;
- switching providers does not change the persisted reviewed manifest unless the user accepts a new revision.

Multi-model support is a protocol property, not a requirement to pay for several calls during ordinary play.

## 7. Deterministic Runtime And Randomness

Code can produce meaningful randomness without imitating model free-form behavior. It does so by selecting among authored or compiled possibilities after eligibility is known.

Every meaningful random decision should have:

- a stable occurrence ID;
- declared candidate set and weights;
- seed or persisted roll evidence;
- selected candidate/result ID;
- owner-validated effects;
- cooldown and cap evidence;
- one-time settlement and replay behavior.

AI may propose new candidate content at an approved checkpoint, but code validates it against allowed capabilities and effect schemas before it can join a later candidate set. A refresh, retry, reopen, or model change cannot reroll an already settled occurrence.

## 8. Playability Layer

A correct semantic engine is not automatically fun. The reusable playability layer should therefore work with world-neutral archetypes and a bounded director rather than genre scripts.

The director may balance:

- quiet time versus interruption;
- novelty versus repetition;
- unresolved threads versus new opportunities;
- relationship, work, travel, discovery, risk, and recovery beats;
- player-selected intensity and Module permissions;
- current schedules, locations, capabilities, and owner-confirmed consequences.

An archetype describes a playable shape such as arrival briefing, schedule change, contested access, resource shortage, public claim, relationship invitation, discovery, or recovery. A world makes an archetype eligible through reviewed capability bridges. The archetype never imports another world's names, organizations, roles, places, or assumptions.

## 9. Implementation Phases

### Phase 0: Settings world preparation and diagnostic preview - implemented in this slice

- `Settings > World Setup` is the ordinary entry for the active world's readable preparation state, simple counts, user-facing warnings, editing handoff, and one optional model check.
- One explicit button uses the existing `Settings > Network & API` provider configuration; opening Settings or World Setup performs no provider call.
- The response is schema-normalized, evidence-bearing, transient, and explained only as a check that has not changed any setting.
- World Hub exposes no initial semantic-check button. It remains an advanced audit surface for world usage evidence, event lineage, history, and bounded correction.

### Phase 1: Formal semantic proposal contract - implemented as a pure boundary

- `src/lib/simulation/world-semantic-contract.js` versions the provider-neutral proposal, separate model receipt, exact source/proposal fingerprints, and user-confirmation boundary;
- `src/lib/simulation/world-semantic-compiler.js` validates a versioned runtime registry and produces immutable deterministic indexes and receipts;
- invalid IDs, duplicates, dangling references/bridges, unsupported runtime capabilities, ownerless or unsupported effects, blocking unknowns, and unresolved conflicts fail closed;
- equal modern K-pop, magic academy, and Tide Contract City fixtures compile through the same generic capability registry with no genre branch;
- no Store, persistence, activation, world switching, or provider field is introduced.

### Phase 2: Persisted world identity W2 - implemented

- one canonical `world_local_primary` identity is persisted through the existing System user carrier and complete-backup section;
- source snapshots, reviewed/compiled versions, active/previous/candidate pointers, and activation history bind to that stable ID;
- known `default_world`, `legacy_single_world`, and Pack-shaped profile-template aliases migrate deterministically, while legacy/stub resolver fallback remains private.

### Phase 3: Reviewed and compiled semantic manifest - implemented

- Settings requires explicit `Use this version` confirmation after the transient model check;
- accepted semantics compile into immutable runtime indexes and version evidence;
- missing sources, stale fingerprints, conflicts, unsupported bridges, ownerless effects, invalid pointers, or compiler/runtime mismatch fail closed;
- every accepted update creates a new revision, keeps the previous rollback target, and leaves already-started Event Instances on their original binding.

### Phase 4: Owner-native event proof

- select one generic archetype whose owner Modules already have real native behavior;
- prove the same archetype through at least three radically different worlds;
- persist eligibility, random settlement, requests, owner confirmations, and replay independently of generated wording;
- keep no-event and provider-failure paths complete and playable.

### Phase 5: World switching W3

- switch active world only after world identity, semantic manifest, profile scope, owner-record scope, runtime suspension, and return behavior are accepted;
- prevent old-world events, roles, locations, and facts from leaking into the new world;
- preserve historical records under their original world identity.

### Phase 6: Optional runtime AI checkpoints and playability director

- add named, permissioned proposal/text checkpoints one family at a time;
- add repetition, pacing, unresolved-thread, and intensity policies to the deterministic director;
- measure provider cost, latency, fallback quality, and user acceptance without making ordinary ticks provider-dependent.

## 10. Conformance Fixtures

Every semantic contract and generic archetype must be tested equally against:

1. **Modern K-pop realism**: detailed organizations, schedules, public identity, production work, fandom/publication boundaries, and current owner Modules.
2. **Magic academy**: custom institutions, access rules, rituals, non-modern resources, and concepts that must not be reduced to modern job titles.
3. **Radically different authored world**: for example the Tide Contract City, where public naming, tide phases, and contract-bound passage use custom terminology with no required K-pop, fantasy, sci-fi, or modern label.

A generic feature passes only when no fixture requires changing the engine to add its genre name, and when unsupported meaning fails visibly rather than borrowing another fixture's assumptions.

## 11. Current Stop Line

This plan authorizes the landed Settings flow, provider-neutral proposal/review/compiler boundary, W2 persisted identity/version activation, rollback, and Event Instance version binding. It does not authorize:

- automatic world recompilation;
- multiple-world persistence or switching;
- autonomous background model calls;
- model-authored numeric effects, event truth, owner facts, identities, permissions, or publication authority;
- replacing existing Event Runtime, owner Stores, or WorldBook ownership.

The next implementation gate is Phase 4: one owner-native event proof that consumes only reviewed generic capability bridges, preserves deterministic settlement and no-event/provider-failure playability, and passes the same behavior against at least three radically different world fixtures. It must not add a genre branch, let a model mutate owner truth, or widen into W3 switching.

The confirmation, activation, staleness, and rollback rules are frozen in `WORLD_SEMANTIC_CONFIRMATION_VERSIONING_ROLLBACK_CONTRACT_2026-08-29.md`.
