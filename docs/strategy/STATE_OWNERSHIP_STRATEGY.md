# SchatPhone State Ownership Strategy

Updated: 2026-05-19

Purpose: define which parts of SchatPhone should be user-defined, system-owned, AI-assisted, or directly AI-generated.

Core rule:

> anything that affects continuity, save integrity, cross-provider consistency, or cross-module truth must not rely on the model as the only source of truth.

Use this file together with:

- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/RELATIONSHIP_GROWTH_EVENT_SYSTEM.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/FILES_INTERNAL_STORAGE_ROLE.md`
- `docs/process/AI_WORK_MODE.md`

## 1. Four Ownership Categories

### 1.1 User-defined core

These are root product settings and should not be silently rewritten by AI:

- player identity
- player boundaries and preferences
- global worldview baseline
- knowledge-point library
- primary role definitions
- important role-facing defaults or permissions
- automation switches and permissions
- major destructive-action confirmations

AI may read these, but should not rewrite them on its own.

### 1.2 AI-assisted but user-editable

These are good candidates for AI drafting, but users should be able to review and edit them:

- extended role-profile copy
- relationship summaries
- memory summary drafts
- event templates
- service-account templates
- public-post or forum drafts
- mini-scene copy
- suggestions for preference/life-pattern/social-graph entries

AI can speed up creation here, but the accepted result should still be saved by the project.

### 1.3 System-owned truth

These values must be stored and updated by project logic:

- relationship progress, metrics, stages, milestones, and memory groups
- event state
- task/objective state
- transaction and ledger state
- balances
- trip, place, and itinerary state
- confirmed schedule/date state
- raw reminder/cue state
- notification state
- delivered/read/unread state
- scheduler timestamps
- active feature-toggle/runtime-control state
- last-active and restore-settlement state

This layer must remain stable even if the user changes AI providers from one turn to another.

### 1.4 AI-generated presentation

These are outputs, not truth:

- reply text
- multi-message sequences
- virtual-voice wording
- image descriptions
- module-link descriptions
- transfer-card wording
- mini HTML interaction content
- event/explanation phrasing

These can be regenerated later and should not be the only place where continuity lives.

## 2. Ownership Rules For Current Strategic Boundaries

### Contacts / Chat Directory / Chat / relationship runtime

- `Contacts` owns the global role archive and role-centered management.
- `Chat Directory` owns Chat-side binding and service-account entry management.
- `Chat` owns ordinary message history and manual chat deletion.
- `relationship runtime` owns relationship truth:
  - metrics
  - stages
  - milestones
  - memory groups
  - relationship facts

Important compatibility rule:

- `relationshipLevel` and `relationshipNote` may still exist in Chat-side structures, but they are compatibility or annotation fields only unless a future product decision explicitly redefines them.

### Calendar / Reminders

- `Calendar` owns confirmed schedule/date meaning.
- `Reminders` owns raw cues, callbacks, follow-ups, logistics reminders, and future objective/task-like prompts.

Important rule:

- raw reminder cues must not directly act as relationship-memory truth;
- they must first become confirmed Calendar events if they are going to carry schedule/date meaning into relationship continuity.

### World Hub / Cheats

- `World Hub` owns optional runtime review and narrow control.
- future `Cheats` belongs to the same family, but is a separate, stronger override lane.

Important rule:

- neither of them should become the main authoring surface for ordinary module records.

### Files / Gallery

- `Files` remains an internal metadata/index/bridge component.
- `Gallery` owns user-facing media assets and related visible asset workflows.

Important rule:

- Files must not become the user-facing owner of role profiles, relationship truth, Calendar state, reminder state, or Gallery media.

## 3. Relationship Ownership Rule

Relationship values belong to the system, not to the model.

Current practical structure includes:

- affinity
- trust
- intimacy
- tension
- dependency
- relationship stage
- milestones
- growth traits
- compact memory groups

Rule:

- the system updates these values or queues pending effects;
- AI reads them to generate tone, continuity, and reaction;
- modules submit compact facts through adapters rather than editing relationship metrics directly.

## 4. Memory Ownership Rule

Memory should not be a single giant prompt blob.

Recommended layered model:

### 4.1 Raw persistent layer

Structured truth saved by the project:

- role archives
- relationship runtime state
- source records
- event history
- wallet and itinerary state
- notification history

### 4.2 Summary memory layer

Compact summaries derived from the raw layer:

- recent important interactions
- current role impression of the player
- current sensitive topics
- current relationship direction
- primary memory summary plus supporting anchors

This layer may be AI-assisted, but the accepted summary still belongs to the project.

### 4.3 Prompt assembly layer

Each AI call should assemble only the necessary pieces from saved layers:

- current conversation context
- user identity
- role profile
- global worldview baseline
- role-bound knowledge points
- relationship snapshot
- memory summary
- time/context state

## 5. Cross-Provider Rule

AI providers may change from turn to turn.

Therefore:

- save truth locally;
- pass needed state into each call;
- never treat provider memory as the archive.

This is essential for continuity.

## 6. Decision Heuristic

When deciding whether something should be stored by the system or generated by AI, ask:

1. Does it affect long-term continuity?
2. Does it affect cross-module consistency?
3. Would it drift if the AI provider changed?
4. Would deleting or resetting it need product-grade review or recovery rules?

If the answer is yes, it should be system-owned or explicitly user-defined.

If the answer is no, it is usually safe to let AI generate it as presentation or draft.

## 7. Practical Rule For Future Work

Before adding a new field or workflow, decide all three:

1. who is the product owner of this concept;
2. where its truth is stored;
3. whether AI is drafting it, presenting it, or actually owning it.

If those answers are unclear, the feature is not ready to implement cleanly.

## 8. Change Log

1. 2026-04-12: created as the ownership-strategy baseline.
2. 2026-05-19: rewritten to align with current Contacts/Chat Directory boundaries, Calendar/Reminders split, World Hub optional-control model, Files internal role, and relationship-runtime truth ownership.
