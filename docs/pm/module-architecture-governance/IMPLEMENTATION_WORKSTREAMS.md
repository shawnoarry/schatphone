# Module Architecture Governance Implementation Workstreams / 模块架构治理实施工作流

Updated: 2026-07-21

## 1. Workstream A: Ownership Closure

- clarify one owner per concept
- remove semantic drift
- keep runtime vs module data boundaries explicit

## 2. Workstream B: Refactor And Decomposition

- split overgrown files
- isolate contracts
- preserve tests while decomposing
- mark one explicit slice as `IN_PROGRESS` before implementation and `DONE` only after validation and docs sync

## 3. Workstream C: Storage And Migration

- persistence shape
- backup/restore implications
- compatibility and migration safety
- Book text-library storage must stay separate from WorldBook activation and hidden Files indexing
- use `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md` as the accepted backup/recovery acceptance boundary
- preserve immutable source packages, staged version-to-version migration, separate-generation activation, metadata/binary rollback unity, and crash-journal recovery
- reuse exact local Gallery binaries and retain current-only kept material during older restores; never match by filename, label, prompt, or URL alone
- classify legacy missing media as unresolved references with type-appropriate derived placeholders, not fabricated recovered assets
- treat the exact IndexedDB v1/Book foundation contract as architecture-accepted and Batch 2B as an approved non-active Adapter/fixture/staging slice with focused real-browser IndexedDB/coordination coverage; keep application runtime wiring, Gallery schema, provider code, other owners, Book cutover, dual write, and activation separately unapproved
- preserve one save per isolated storage container; same-container write coordination cannot become cross-container sync, silent merge, force takeover, or last-write-wins

## 4. Workstream D: Cleanup Debt

- remove stale or unused code
- identify obsolete docs or compatibility layers
- keep archive boundaries clean
- keep generated specs/plans/content under `docs/superpowers/**` as reference material unless promoted by the live roadmap/package handoff
- record known validation debt in active package handoffs instead of burying it inside old plan checklists

## 5. Workstream E: Security And Credential Boundaries

- define whether backup exports API credentials
- keep local browser storage and exported JSON sensitivity explicit
- treat the current push relay as development/single-operator infrastructure
- separate production dependency results from development-tool audit results
- isolate security/toolchain updates from product features

## 6. Workstream F: CI And Release Confidence

- align CI with the required lint/test/build/E2E baseline
- decide dependency-audit policy
- keep Pages deployment gated by repository/workflow policy
- add coverage thresholds only after selecting meaningful critical-path metrics
- test supported Node versions intentionally

## 7. Semantic Guardrails

Treat these as bugs:

1. one concept acquires several competing owners
2. docs and code disagree on who owns a field
3. refactors move fast but lose migration clarity
4. AI-proposed world app entries write appBindings without passing through the shared template registry and WorldBook confirmation seam
5. Settings -> WorldBook becomes the direct launcher or Chat Directory creator for world-pack outputs instead of handing off to App Store and Chat-owned flows
6. backup files are described as ordinary portable data while they contain credentials
7. a build-only deployment is described as fully validated
8. a production-only audit result is used to hide development-tool advisories
