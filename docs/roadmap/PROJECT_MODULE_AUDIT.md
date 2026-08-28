# SchatPhone Project Module Candidate Pool

Updated: 2026-08-28

Integrated baseline: `98f1250`

Document state: `CANDIDATE_POOL / NON_EXECUTABLE`

Purpose: retain unpromoted module-deepening ideas without creating a second roadmap, maturity ranking, or package status report.

## 1. Authority Boundary

- `docs/roadmap/TODO_ROADMAP.md` is the only live execution board.
- Package `STATUS_AND_HANDOFF.md` files own detailed domain progress, evidence, exclusions, and the next safe slice.
- This file records candidate themes only. It does not assign P0/P1, `IN_PROGRESS`, or `DONE`.
- A candidate becomes executable only after the user or live roadmap promotes one exact scope and the owning package records it.
- Current accepted work such as completed `CMG-08` through `CMG-10`, installed-PWA/relaunch proof, backup round trip, external protections, and named true-device proof stays in the roadmap and is not duplicated here.

## 2. Current Candidate Themes

| Candidate theme | Owning package or authority | Promotion condition | Current disposition |
| --- | --- | --- | --- |
| Promote one S1 App preview to an S2 canonical owner | `visual-and-ia-governance` plus the future canonical owner | one named user loop, owner Store/persistence boundary, failure semantics, and explicit S1 exclusions | unpromoted |
| Add one S3 Event Runtime chain to an owned App | `event-runtime-and-world-hub` plus the source owner | the S2 owner exists first; event causality, validation, presentation, and rollback are accepted separately | unpromoted |
| Deepen Assets or Stock | `commerce-finance-and-assets` | one concrete user loop with canonical ownership and downstream boundaries | unpromoted |
| Add commerce refunds/cancellation settlement or source-owned tracking shares | `commerce-finance-and-assets` | one exact order lifecycle, Wallet snapshot, retry/idempotency, and return-path contract | unpromoted |
| Add Gallery People or a new Camera/Image Generation caller | `module-architecture-governance` plus the visible source owner | identity/source ownership, credential boundary, retention choice, backup scope, and provider/device proof | unpromoted |
| Deepen Music provider/caller behavior | `module-architecture-governance` plus Chat/Map only for an approved caller | real provider/CORS evidence, bounded projection, no credential/stream leakage, and true-device media checks | unpromoted |
| Extend Map exploration, transport, or world content | `map-calendar-reminders` | the exact MJE/world stage is promoted and preserves Map place/journey truth | unpromoted |
| Add world evolution or information propagation | `event-runtime-and-world-hub` plus Contacts/world owners | canonical fact owner, information reach, review, rollback, and user-visible consequence are frozen | unpromoted |
| Implement personal R2/Worker backup or another Repository owner cutover | `module-architecture-governance` | live roadmap releases the current hold and the accepted security/migration/rollback gates are met | on hold in roadmap |
| Decompose a hotspot, deepen an adapter seam, or add incremental typing/coverage gates | `module-architecture-governance` | product-preview evidence identifies one measured problem and the live roadmap promotes one bounded seam | on hold in roadmap |

These rows intentionally omit implementation status and detailed task history. Read the owning package before proposing or promoting a slice.

## 3. Candidate Intake Rule

Before adding or promoting a candidate, record:

1. the current repository evidence and integrated baseline;
2. the user-visible problem or product loop;
3. one owning package and any secondary owners;
4. prerequisites, exclusions, persisted-data impact, and rollback needs;
5. proportional unit, build, E2E, provider, PWA, or true-device acceptance;
6. why the candidate should displace the current roadmap order, if it would.

Do not add a candidate merely because a view is large, a technology is fashionable, or an external model assigned it a priority.

## 4. Promotion And History

- On promotion, put the exact task ID, order, dependency, and status in `TODO_ROADMAP.md`.
- Put implementation detail and completion evidence in the owning package handoff.
- Keep this file as a compact discovery list; remove or reduce promoted rows instead of copying their growing histories here.
- The superseded 2026-08-20 ranked audit is explicitly archived at `docs/archive/2026-08-26-document-alignment/PROJECT_MODULE_AUDIT_2026-08-20.md`.
