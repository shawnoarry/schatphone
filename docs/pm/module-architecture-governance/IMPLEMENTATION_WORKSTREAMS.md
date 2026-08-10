# Module Architecture Governance Implementation Workstreams / 模块架构治理实施工作流

Updated: 2026-08-10

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
- treat Batch 2B as the completed foundation and the 2026-07-22 Book-only cutover as the first active reference migration; preserve explicit user initiation, legacy rollback bytes, atomic pointer/journal verification, and fail-closed conflicts, while keeping Gallery schema, provider code, other owners, dual write, and legacy deletion separately unapproved
- preserve one save per isolated storage container; same-container write coordination cannot become cross-container sync, silent merge, force takeover, or last-write-wins
- stage and verify Book assets plus WorldBook identity/activation references as one complete-backup graph; a failed or unresolved owner section cannot leave a partially activated world setting
- preserve the Image Generation Module's separate public-config, credential, and candidate carriers; ordinary backup restores only public profiles/defaults/routing and must not clear or export local secrets/candidates
- preserve Music's split carriers: public library/provider/integration state uses required `system-settings` backup coverage, while `schatphone:music:credentials` remains device-local and excluded
- keep one bounded internal App-to-Chat share draft excluded from backup; it may carry a normalized source snapshot and return route, but never provider credentials, stream URLs, source mutations, or a sent-message claim
- preserve TTS's separate device-local configuration and credential carriers; preview audio remains runtime-only until a separately approved durable-media/message contract exists

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
- keep provider errors and diagnostics redacted, and keep optional proxy deployment/security approval separate from direct-browser Camera availability
- keep Music provider credentials out of public profiles, static secret headers, cross-module payloads, and plaintext backup; direct browser playback remains subject to provider authorization, CORS, mixed-content, and stream-lifetime policy
- keep MiniMax TTS keys device-local and restricted to official endpoint hosts; keep the shared Cloudflare MeloTTS route bounded by origin, input, rate, output, and redacted-error controls, and do not describe it as an unlimited production gateway

## 6. Workstream F: CI And Release Confidence

- align CI with the required lint/test/build/E2E baseline
- decide dependency-audit policy
- keep Pages deployment gated by repository/workflow policy
- add coverage thresholds only after selecting meaningful critical-path metrics
- test supported Node versions intentionally

## 7. Workstream G: Cross-Module Mini Scene

- use `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` as the architecture-accepted Interface and security contract
- keep one deep Mini Scene Module behind a registered-caller Interface; source modules own trigger intent and source truth
- keep per-module user modes explicit: unconfigured/off, text, or interactive HTML, with user choice above caller/world suggestions
- keep Book narrative rules separate from structured `structured_json` transform profiles and keep WorldBook narrative activation separate from Mini Scene profile binding
- let World Pack reference a reviewed profile only as an optional grouped capability; custom worlds must work without a Pack
- require a bounded safe regex engine and a validated structured draft before transforms
- require both Text and sandboxed HTML Presenter Adapters, with a text fallback for every interactive artifact
- stage pure schemas first, persistence/backup ownership second, text runtime third, HTML security fourth, and source-module Adapters one at a time
- keep the first K-pop Calendar music-show-day integration an optional example rather than a global rule

## 8. Workstream H: World Setting Identity And Interface

- use `docs/architecture/WORLD_SETTING_ARCHITECTURE.md` as the world identity, ownership, consumer, backup, and migration contract
- keep one current world context inside one current save; do not create a save-slot or workspace-switching interpretation
- preserve the completed Stage W1 Interface with separate identity, narrative, structured encyclopedia, profile-template, Pack-capability, and diagnostic projections
- preserve stable `legacy_single_world` compatibility identity/scope independently from `activeWorldPackId`
- keep WorldBook and Contacts current-world reads on the shared Interface before adding persisted world definitions
- keep Book assets reusable and WorldBook source links explicit; any Book encyclopedia subset, including zero, remains valid
- keep Pack definitions capability-only for activation purposes; legacy content references are review evidence, not ownership or automatic binding
- require complete-backup cross-reference verification and atomic rollback before any persisted identity migration
- audit every world-sensitive owner before proposing multiple world definitions or runtime switching

## 9. Semantic Guardrails

Treat these as bugs:

1. one concept acquires several competing owners
2. docs and code disagree on who owns a field
3. refactors move fast but lose migration clarity
4. AI-proposed world app entries write appBindings without passing through the shared template registry and WorldBook confirmation seam
5. Settings -> WorldBook becomes the direct launcher or Chat Directory creator for world-pack outputs instead of handing off to App Store and Chat-owned flows
6. backup files are described as ordinary portable data while they contain credentials
7. a build-only deployment is described as fully validated
8. a production-only audit result is used to hide development-tool advisories
9. calling modules copy Mini Scene regex, world-profile resolution, HTML rendering, or fallback behavior into their own implementations
10. Book/WorldBook activation, World Pack activation, or catalog presence silently enables a Mini Scene popup
11. raw AI HTML or legacy Chat `htmlSnippet` is executed, or unbounded native regex runs on the UI thread
12. Mini Scene artifacts, profile bindings, or Settings policy are added to persistence Batch 2B without separate owner/backup approval
13. `activeWorldPackId` or the built-in `default_world` Pack is treated as canonical world identity
14. Pack activation changes Book source links, encyclopedia selection, profile-template selection, sensitive-content choices, or Mini Scene policy
15. a future world definition is implemented as an internal save slot, workspace switcher, cross-container discovery, sync, or merge feature
16. a consumer independently assembles world context or reads mutable owner arrays instead of using the shared World Setting Interface
17. Chat or Map receives a Music API key, provider endpoint/header, raw response, queue contents, or stream URL instead of a bounded Music reference/projection
18. an external Music deep link starts playback without an explicit user gesture or changes the queue without the Music integration policy and confirmation boundary
19. Chat or another caller sends provider-specific TTS payloads, persists preview blobs/raw audio encodings, copies credentials, or upgrades `voice_virtual` without an approved message/media contract
