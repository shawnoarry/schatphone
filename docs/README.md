# SchatPhone Documentation Map

Updated: 2026-08-28

This is the top-level map for project documents. If two documents seem to overlap, use this file to decide which one is current.

## 1. Fast Reading Order For AI Engineers

If you are taking over implementation work:

1. root `AGENTS.md` for the stable bootstrap
2. `docs/process/AI_WORK_MODE.md` for execution rules
3. `docs/roadmap/TODO_ROADMAP.md` for live priority
4. `docs/pm/TASK_PACKAGE_INDEX.md` when task ownership is unclear
5. the matching package `README.md` and `STATUS_AND_HANDOFF.md`
6. only the focused package, architecture, or product-decision files required by the change
7. `docs/overview/PROJECT_MASTER_GUIDE.md` when whole-project context is necessary

Current alignment note:

- integrated whole-project baseline: `98f1250` on 2026-08-28; excluded local cache and QA/visual artifacts remain outside capability claims;
- roadmap 4.5-CMG is complete through `CMG-10`: legacy relationship restore diagnostics, combined long-history backup/reopen proof, and restored gift continuity are integrated without guessed links or recovery claims for already discarded rows;
- the initial S1 App Shell portfolio, Calendar Mail/Work Hub handoffs, Event reason-feedback maintenance, commerce checkout/support flows, and current Appearance theme/icon foundations are integrated at their named scoped baselines;
- installed-PWA/relaunch, backup round trip, external protections, true-device proof, and several provider/module depth gates remain open;
- package handoffs retain detailed milestone evidence and are not replaced by this map or another whole-project rollup.
- the superseded 2026-08-20 ranked module audit is explicitly archived; the active `PROJECT_MODULE_AUDIT.md` is now a compact non-executable candidate intake with no competing P0/P1 queue.

## 2. Fast Reading Order For PM Or Design Review

If you are reviewing product direction rather than coding:

1. `docs/pm/TODO_PM_STATUS_REPORT.md`
2. `docs/pm/PRODUCT_MANAGER_PROJECT_BRIEF.md`
3. `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
   - then open the matching split category doc under `docs/pm/product-module-feature-catalog/`
4. `docs/pm/TASK_PACKAGE_INDEX.md`
5. `docs/strategy/PROJECT_ITERATION_PLAN.md`
6. `docs/process/DOCUMENT_GOVERNANCE.md` when reviewing document ownership or status alignment

## 3. Current Task Packages

Main package index:

- `docs/pm/TASK_PACKAGE_INDEX.md`

Every task package should contain:

1. `README.md`
2. `STATUS_AND_HANDOFF.md`
3. `PRODUCT_BOUNDARY.md`
4. `IMPLEMENTATION_WORKSTREAMS.md`

Current packages:

1. `docs/pm/contacts-relationship-system-v2/README.md`
2. `docs/pm/chat-and-chat-directory/README.md`
3. `docs/pm/event-runtime-and-world-hub/README.md`
4. `docs/pm/map-calendar-reminders/README.md`
5. `docs/pm/commerce-finance-and-assets/README.md`
6. `docs/pm/visual-and-ia-governance/README.md`
7. `docs/pm/module-architecture-governance/README.md`

Compatibility entry docs still exist:

- `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_REQUIREMENTS.md`
- `docs/pm/CONTACTS_RELATIONSHIP_SYSTEM_V2_IMPLEMENTATION_BREAKDOWN.md`

## 4. Functional Categories

| Category | Folder | Purpose |
| --- | --- | --- |
| PM status and product overview | `docs/pm/` | PM status, brief, feature catalog, task packages |
| Roadmap and task pool | `docs/roadmap/` | `TODO_ROADMAP.md` is the only live execution board; `PROJECT_MODULE_AUDIT.md` is a candidate pool; other roadmap notes are frozen unless promoted |
| Project overview | `docs/overview/` | whole-project guide plus engineering, event, and visual handoff references |
| Process and workflow | `docs/process/` | AI workflow, document governance, validation flow, specialist workflows, operation guide |
| Architecture contracts | `docs/architecture/` | architecture boundaries and cross-module contracts |
| QA and acceptance | `docs/qa/` | short user-facing acceptance checklists and runnable validation notes |
| Product decisions | `docs/product-decisions/` | topic-level current decisions, not live task boards |
| Strategy | `docs/strategy/` | long-range project and technical direction |
| Design | `docs/design/` | visual ownership and style references |
| Templates | `docs/templates/` | reusable prompt, requirement, and audit templates |
| Superpowers working artifacts | `docs/superpowers/` | agent-assisted specs, plans, handoffs, and content drafts; reference only unless promoted |
| Archive | `docs/archive/` | historical or obsolete docs only |

## 5. Key Workflow Documents

- root `AGENTS.md`
  - stable agent bootstrap
  - authority order and independent workflow/skill audit rule
- `docs/process/AI_WORK_MODE.md`
  - thin cross-task execution contract
  - authority, routing, worktree safety, and minimum validation rules
  - delegates domain execution and documentation sync to task packages
- `docs/process/DOCUMENT_GOVERNANCE.md`
  - defines integrated/working/proposed status, document roles, alignment headers, archive intake, and conflict resolution
  - prevents whole-project summaries from erasing scoped package or work-item progress
- `docs/process/WORKTREE_INTEGRATION_PROTOCOL.md`
  - cross-worktree protection, handoff, review, local integration, synchronization, and push authorization
  - keeps product approval with the user and Git coordination with the integration controller
- `docs/process/OPERATION_GUIDE.md`
  - commands and release flow
- `docs/process/DEVELOPMENT_TOOLING.md`
  - local tooling assumptions
  - project-local skill inventory
  - cross-PC setup and install notes
- `docs/process/ELEVENLABS_AUDIO_SKILLS_CROSS_PC_SETUP.md`
  - project-local ElevenLabs TTS, music, and sound-effect Skill setup
  - secure cross-PC Key handling, verification, first smoke, update, and handoff rules
- `docs/process/TTS_PROVIDER_SETUP.md`
  - runtime Cloudflare MeloTTS and MiniMax setup on another PC
  - device-local Key handling, Worker binding/deployment, and mock/real smoke boundaries
- `docs/process/CODEX_FAST_SERVICE_TIER_TROUBLESHOOTING.md`
  - machine-local Codex Fast / service-tier billing troubleshooting
  - VS Code persisted-state check and backup-edit procedure
- `docs/process/EVENT_WORKFLOW.md`
  - event-specialist process
  - event/runtime skill invocation matrix
  - current EVE-2/default K-pop content handoff: `docs/architecture/KPOP_REALISM_EVENT_PACK_V1.md`
- `docs/process/VISUAL_WORKFLOW.md`
  - visual-only workflow
  - visual/IA skill invocation matrix
- `docs/process/RUNTIME_CONTROL_AND_CHEATS_PACK_PLAN.md`
  - planning entry for the future World Hub / Cheats formal task package
- `docs/superpowers/README.md`
  - authority and promotion rules for old specs, plans, handoffs, and content drafts

## 6. Frozen TODO / PLAN Rule

Only these documents can drive current implementation:

1. `docs/roadmap/TODO_ROADMAP.md`
   - the only live execution board;
   - the only place where concrete implementation order and active status can be trusted.
2. `docs/roadmap/PROJECT_MODULE_AUDIT.md`
   - candidate pool only;
   - use it for discovery and sorting, then promote the selected slice into `TODO_ROADMAP.md`.
3. package `STATUS_AND_HANDOFF.md` files
   - current package handoff only;
   - use them for context, next safe slice, and do-not-do rules, not as independent roadmaps.

Any other file whose name contains `TODO`, `NEXT`, `PLAN`, `ROADMAP`, `STATUS`, or `HANDOFF` is non-executable unless it is explicitly listed above or linked from the live roadmap for the current task.

Files under `docs/superpowers/**` follow the same rule even when they contain status labels, approval labels, or unchecked task boxes.

If an older note contains a useful idea, do not implement from that note directly. First promote the concrete slice into `docs/roadmap/TODO_ROADMAP.md` and the matching task package handoff.

## 7. Archive Rule

- If a document is current, it must belong to one of the functional folders above.
- If a document is superseded, move it to `docs/archive/` and add an `Obsolete archive` note.
- Archived docs must not be used as active roadmaps, status reports, or implementation sources.
- Historical status reports may be archived during alignment only when the old file is preserved and a new current file replaces the active path.

## 8. External Assessment Intake

Model-generated diagnoses, audits, priority proposals, maturity rankings, and governance checklists are review inputs, not project authorities.

1. Treat every external assessment as `proposal` until repository evidence has been checked.
2. Verify factual claims against the current code, CI configuration, live roadmap, and owning package rather than trusting the assessment's quoted metrics or document dates.
3. Promote useful content item by item into the existing owner. Do not keep a second P0/P1 list, Sprint plan, quality gate, or package-independent checklist.
4. If all useful content already exists in active authorities, archive the assessment instead of linking it as another current summary.
5. Every archived assessment must begin with an explicit archive notice naming the review date, rejection or limitation reason, any reference-worthy content, replacement authorities, and a statement that it cannot authorize work.
6. Static-signal visual audits are not visual acceptance evidence. Rendered desktop/mobile inspection and the visual workflow's Playwright checks remain required for visual claims.
7. An assessment batch must include an archive index recording what was promoted, what was rejected, and why.

The current reviewed batch is `docs/archive/2026-08-26-external-model-assessments/`.

## 9. Naming And Runtime Reminder

Current naming/runtime references:

- `docs/pm/MODULE_NAME_GLOSSARY.md`
- `docs/product-decisions/CALENDAR_REMINDERS_SPLIT.md`
- `docs/product-decisions/OPTIONAL_RUNTIME_CONTROL_WORLD_HUB_APP.md`
- `docs/superpowers/specs/2026-05-29-book-text-library-worldbook-design.md`

Execution reminder:

- use package docs before coding;
- use `AI_WORK_MODE.md` for the cross-task execution contract;
- use `WORKTREE_INTEGRATION_PROTOCOL.md` when separate worktrees must be protected, reviewed, integrated, or synchronized;
- use `TODO_ROADMAP.md` as the only live execution board.
