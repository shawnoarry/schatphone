# SchatPhone Project Iteration Plan

Updated: 2026-05-19

> **Strategy reference / 战略参考**
>
> This file is not an active task board or implementation source. Use it for overall project direction and sequencing only. Any concrete task must be promoted into `docs/roadmap/TODO_ROADMAP.md` before implementation.

Audience: product, design, engineering, QA, and future AI assistants.

## 1. Purpose

This document is the project-level iteration plan for SchatPhone. It describes overall direction, sequencing, and exit gates for the whole product.

It is intentionally different from these documents:

- `docs/roadmap/TODO_ROADMAP.md`: live execution board for concrete implementation work.
- `docs/overview/IMMERSIVE_EVENT_TODO.md`: event-specialist history and runtime handoff notes.
- `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md`: parked visual rebuild scope.
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`: module maturity audit and candidate pool.
- `docs/product-decisions/*.md`: topic-level product decisions.

Use this file to answer:

> What kind of work should the project prioritize next, and why?

Do not use this file as a second task board. When a direction becomes active implementation work, summarize the concrete slice in `docs/roadmap/TODO_ROADMAP.md`.

## 2. Status Meanings

- `NOW`: current project-level focus.
- `NEXT`: should start after the current focus reaches exit criteria.
- `LATER`: known direction, not yet ready for active scheduling.
- `PARKED`: intentionally deferred until explicitly reactivated.
- `DECISION`: needs a product or technical decision before implementation.
- `DONE`: reached the current exit criteria.

## 3. Current Project Thesis

SchatPhone is no longer just a chat shell. It is now a local-first virtual phone with app-like modules, shared media/storage, AI role/world context, relationship continuity, push delivery, and optional game-like runtime.

The main near-term risk is not "missing one more feature." The real risk is that immersive features keep piling into large views and central stores until ownership becomes unclear again.

Therefore the project-level direction is:

1. Close product ownership splits before expanding new loops.
2. Keep runtime systems safe, explainable, and opt-in.
3. Convert explicit user actions into cross-module memory before enabling hidden automation.
4. Improve architecture depth and test coverage around existing hot spots.
5. Re-enter visual rebuild only after functional ownership is stable.

## 4. Iteration Map

| Phase | Status | Goal | Exit criteria |
| --- | --- | --- | --- |
| `I0 Governance Reset` | `DONE` | Make docs, CI, and dependency posture trustworthy. | Core docs align; CI catches test regressions; dependency-update policy is recorded. |
| `I1 Ownership Closure` | `NOW` | Finish product ownership splits that block later growth. | Calendar/Reminders split is stable; Reminders is visible on Home; Files remains internal; World Hub remains optional. |
| `I2 Architecture Deepening` | `NEXT` | Reduce large-view/store risk before adding more behavior. | Hot spots have smaller interfaces, focused tests, and clearer ownership notes. |
| `I3 Cross-Module Memory Loops` | `NEXT` | Turn explicit user actions into stable relationship/world memories. | Text/event-first memories dedupe and merge cleanly; Calendar and selected modules submit safe facts through shared adapters; media-driven memory inputs stay optional until low-friction. |
| `I4 Runtime Expansion` | `LATER` | Expand events, tasks, and World Hub controls without making normal use feel technical. | Event explanations are user-facing; World Hub stays filtered and narrow; high-impact automation remains guarded. |
| `I5 Background Autonomy Decision` | `DECISION` | Decide whether closed-page autonomous event generation is worth backend complexity. | A written product decision exists for delivery-only push vs backend orchestration. |
| `I6 Visual Rebuild Return` | `PARKED` | Rebuild toward believable phone immersion after functional ownership stabilizes. | Visual rebuild is promoted from deferred docs into the live roadmap with a focused scope. |

## 5. Project-Level Workstreams

### I1. Ownership Closure

Status: `NOW`

Goal:

Close the ownership splits that still block event, relationship, and UX work.

Project-level work:

1. Finish the Calendar / Reminders split.
   - `Reminders` owns raw cues, follow-ups, callbacks, logistics reminders, stock review cues, and future world/task objectives.
   - `Calendar` owns confirmed schedule/date events and push scheduling for real events.
   - Calendar relationship facts start only from confirmed schedule/date events after explicit contact selection.
2. Keep `Files` internal.
   - `/files` may remain as a compatibility or developer route.
   - Home, More, onboarding, and icon customization should not promote Files as a normal app.
3. Keep `World Hub` optional.
   - Normal modules remain immersive and distributed.
   - World Hub reviews runtime state and pending effects.
   - Freeform value, funds, affinity, or unlock editing stays out until explicitly designed.
4. Preserve module ownership in cross-module handoffs.
   - Shopping and Food Delivery own orders.
   - Wallet owns ledger records.
   - Map explains route/location context.
   - relationship runtime owns relationship facts only.

Exit criteria:

- Future contributors can answer "which module owns this data?" without reading several giant views.
- Calendar and Reminders can evolve independently.
- Relationship facts can expand without making Calendar or World Hub absorb unrelated data entry.

### I2. Architecture Deepening

Status: `NEXT`

Goal:

Improve locality and leverage around the largest modules before adding more product surface.

Project-level work:

1. Continue decomposing large views by behavior surface, not visual decoration.
   - `Chat`: message list/action orchestration, AI status, thread preferences, service/product context, scheduled push hints.
   - `Settings`: backup, push, and automation orchestration behind smaller interfaces where safe.
   - `Map`: route context, rewards, event explanations, trip lifecycle, and visual settings remain separated.
   - `Chat Directory`: role/service/template management becomes easier to understand and test.
2. Split central runtime responsibilities only when there is a real second adapter or real hidden complexity.
3. Create focused test seams for:
   - Calendar/Reminders cue ownership;
   - relationship fact adapters;
   - event runtime explanations;
   - notification and push scheduling;
   - Home entry normalization.
4. Keep store migration backward-compatible.
   - legacy `worldBook` alias remains compatibility only;
   - old Home entries such as `app_files` remain normalized away;
   - persisted data changes need restore/import coverage.

Exit criteria:

- Hot files stop being the default place for every new feature.
- New behavior can be tested through stable interfaces instead of mounting whole pages.
- Small product loops no longer sharply raise regression cost.

### I3. Cross-Module Memory Loops

Status: `NEXT`

Goal:

Make the virtual phone feel continuous by turning explicit user actions into safe shared memories.

Project-level work:

1. Tighten memory dedupe and merge rules for text/event-first relationship facts.
   - One life event should not become multiple top-level memories.
   - Source-level attachments can exist without multiplying relationship growth.
   - Recall should prefer one primary memory plus optional supporting anchors.
2. Expand Calendar relationship facts only on top of the ownership-closed model.
   - scheduled dates;
   - anniversaries;
   - missed plans;
   - recurring reminders.
   - current baseline: confirmed events can record low-impact scheduled-event facts after explicit Chat-contact selection.
3. Keep Gallery/media-driven relationship facts deferred until image sources become natural and low-friction.
   - user-supplied images alone should not create mandatory memory-structuring work;
   - Gallery remains an asset/atmosphere surface before becoming a core memory-entry surface.
4. Continue safe adapters before hidden mutation.
   - low-impact, explicit, deduped facts first;
   - high-impact romance/conflict effects remain pending-confirmation or deferred.
5. Improve user-facing memory review.
   - Contacts shows compact relationship snapshots and memory groups.
   - Chat consumes compact relationship context.
   - World Hub reviews pending effects without becoming the normal data-entry surface.
6. Keep Chat free.
   - relationship facts provide context;
   - they do not hard-lock conversation behavior.

Exit criteria:

- Cross-module memories come from clear user actions and have source-level dedupe.
- Contacts and Chat benefit from shared continuity without owning every source.
- Users can review sensitive changes before they affect high-impact relationship state.

### I4. Runtime Expansion

Status: `LATER`

Goal:

Grow event and task systems while keeping them understandable, optional, and immersive.

Project-level work:

1. Add user-facing event explanations.
   - why an event triggered;
   - why a tick skipped;
   - which module owns the result;
   - what the user can safely ignore.
2. Expand event adapters only after explanation and dismissal rules exist.
   - Shopping/logistics random execution remains disabled until then.
3. Add world-aware event packs.
   - daily life;
   - campus;
   - fantasy;
   - sci-fi;
   - apocalypse.
4. Add task/unlock concepts behind World Hub.
   - review first;
   - narrow controls second;
   - broad editing later.
5. Keep foreground runtime opt-in.
   - no surprise hidden mutation by default;
   - safe lists before destructive events;
   - diagnostics remain visible.

Exit criteria:

- PM, QA, and users can understand runtime behavior from UI plus diagnostics.
- Runtime expansion does not turn ordinary modules into backend consoles.
- High-impact changes remain reviewable.

### I5. Background Autonomy Decision

Status: `DECISION`

Goal:

Decide whether the product truly needs closed-page autonomous event generation.

Project-level work:

1. Clarify product expectation.
   - delivery-only push already exists;
   - closed-page event creation requires backend orchestration.
2. Compare two paths.
   - Path A: keep push delivery-only and continue foreground/local-first runtime.
   - Path B: add backend orchestration for off-page event generation.
3. If choosing Path B, define:
   - auth;
   - storage ownership;
   - conflict policy;
   - event receipt/proof model;
   - server scheduling and failure recovery;
   - privacy boundary for AI context.
4. Do not start backend automation until this decision is explicit.

Exit criteria:

- The project has a written decision on delivery-only push vs backend orchestration.
- If backend work begins, it has architecture requirements and privacy boundaries.

### I6. Visual Rebuild Return

Status: `PARKED`

Goal:

Return to visual work only after functional ownership and runtime safety are stable.

Project-level work:

1. Do not resume broad visual rebuild during `I1-I2` unless explicitly requested.
2. When reactivated, promote only one focused visual scope at a time:
   - global shell and lock/home/dock;
   - Chat;
   - Map;
   - Gallery;
   - Shopping/Food Delivery Home-folder presentation.
3. Keep visual ownership rules.
   - surfaces opened inside an app keep that app's immersive logic;
   - system-owned full pages can use system visual language.
4. Avoid mixing visual rebuild with data-ownership migrations.

Exit criteria:

- Visual work has a focused scope and does not reopen unresolved ownership questions.
- Each visual phase can be validated independently.

## 6. Promotion Rules

Use these rules to decide when a project-level direction becomes concrete execution work:

1. If it changes data ownership, create or update a product-decision doc first.
2. If it changes runtime behavior, update architecture/process docs and add tests.
3. If it changes a route, store shape, backup/import behavior, or user-visible module ownership, update PM status and module catalog docs.
4. If it is a concrete implementation slice, put it in `docs/roadmap/TODO_ROADMAP.md`.
5. If it is a visual-only future scope, keep it in `docs/overview/DEFERRED_VISUAL_REBUILD_TODO.md` until explicitly promoted.
6. If it needs backend work or major dependency upgrades, isolate it from ordinary product-feature work.

## 7. Recommended Near-Term Sequence

1. Continue `I1 Ownership Closure`.
2. Move into `I2 Architecture Deepening` around Calendar/Reminders, Chat, Settings, Map, and runtime hot spots.
3. Continue `I3` with text/event-first memory dedupe plus ownership-safe Calendar relationship facts.
4. Enter `I4` only after user-facing event explanations and review controls are strong enough.
5. Make the `I5` backend-autonomy decision before promising true off-page runtime autonomy.
6. Return to `I6` visual rebuild only when functional ownership is stable enough not to churn again.

## 8. Workflow And Skill Reminder

This plan describes sequencing, not per-task procedure.

For execution rules and installed-skill routing, read:

- `docs/process/AI_WORK_MODE.md`
- `docs/process/DEVELOPMENT_TOOLING.md`
- `docs/process/EVENT_WORKFLOW.md`
- `docs/process/VISUAL_WORKFLOW.md`

## 9. Change Log

1. 2026-05-18: created as the project-level iteration plan after the full project review.
2. 2026-05-18: updated `I1` after Reminders became a visible Home app with source/status management.
3. 2026-05-18: updated `I1/I3` wording after Calendar confirmed-event relationship facts landed as the first safe schedule/date memory slice.
4. 2026-05-18: de-prioritized Gallery relationship facts as a near-term mainline task in favor of text/event-first memory dedupe, merge, and recall rules.
5. 2026-05-19: cleaned historical mixed-encoding content and aligned workflow references with the new task-package and skill-routing system.
