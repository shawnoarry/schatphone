# SchatPhone Module Maturity And Engineering Map

Updated: 2026-08-09

Purpose: engineering handoff reference for module maturity, ownership risk, edit cost, and validation posture.

This file is not a task board. Promote concrete work into `docs/roadmap/TODO_ROADMAP.md` and the matching package handoff.

## 1. Current Judgment

SchatPhone is in:

> internal personal development + core-system deepening + evolvable architecture construction

The strongest loops are real and test protected. The main risk is uneven finish and concentrated implementation cost, not a missing framework.

Four narrow roadmap baselines are complete: Contacts IA, memory dedupe, World Hub review, and service-account continuity. The Camera/shared-image-generation and Music first slices, Music's Chat track-share and Map active-journey media callers, browser/PWA-first persistence foundation, release-local complete v3 recovery, Book-only reference cutover, and isolated Vite/Vitest toolchain migrations are complete at their named local boundaries, while Gallery People/source callers, Music real-provider/remaining-caller proof, and broader capacity/data-lifecycle work remain deferred. The later cross-module Mini Scene direction is architecture-accepted but remains behind its own staged security and persistence gates.

## 2. Maturity Tiers

### Tier A: Stable Foundations

| Area | Judgment | Engineering rule |
| --- | --- | --- |
| Lock / shell navigation | stable | preserve notification and lock-return contracts |
| Home entry system | stable but large | treat as shell infrastructure; avoid domain logic |
| Chat core | stable but very heavy | extract named seams before adding another side system |
| Contacts / relationship baseline | stable V2 baseline | preserve runtime truth and guarded cleanup ownership |
| Gallery | stable image-asset platform service; local material-library contract confirmed | keep one reusable-media owner, require explicit local retention, use one whole-library backup choice, preserve URLs as URLs, and do not turn backup into offload |
| Image Generation | shared first slice implemented; Camera is the visible owner | keep provider protocols behind the shared module, back up public configuration only, keep credentials/candidates device-local, and require explicit Gallery retention |
| persistence / backup / diagnostics | release-local v3 complete backup/recovery, product-level recovery, same-container one-writer/read-only-preview protection with automatic cooperative handoff, and Book-only Repository cutover browser-tested | keep one-container/one-save, complete versions, no sync/merge; preserve non-Book cutover gates and pursue capacity/root-generation/R2 work only as separate architecture slices |

### Tier B: Integrated V1

| Area | Judgment | Main remaining work |
| --- | --- | --- |
| Book / WorldBook | integrated V1, K-pop 2 + 6 + 1 content landed | phone hardening and later separate Mini Scene transform-profile authoring |
| World Pack / App Store | integrated V1, partial acceptance | true-device loop, target-app hardening, next archetype decision |
| Map / Calendar / Reminders | world-bound local-map baseline; OpenFreeMap renderer integrated | preserve local fictional/custom rendering while adding only separately approved true-device, offline-cache, authoring, PMTiles, transit, or broader real-life handoff slices |
| Shopping / Food Delivery / Logistics | integrated V1 with five independent shop facades | prove the ordinary cross-module consequence flow; keep facade polish subordinate to the live roadmap |
| Wallet | stable support | cleanup/explainability and later economy decisions |
| Appearance / Widgets / app identity | strong but split across owners | consistency and real-device authoring/recovery QA |
| Network | strong MVP | security guidance and provider-environment QA |
| Camera | focused installed-app V1 | Gallery People curation, source-module callers, hosted-provider smoke, and true-device QA |
| Music | focused installed-app first slice with Chat track-share and active-journey Map media callers | real-provider/CORS smoke, true-device media/PWA proof, Chat search, and external Map queue requests |

### Tier C: Partial Or Guarded

| Area | Judgment | Constraint |
| --- | --- | --- |
| Event Runtime | guarded foreground baseline | conservative event families only |
| Mini Scene | pure foundation landed, no runtime | persistence/policy, Text Presenter, HTML sandbox, and source Adapters remain staged; caller registry is empty |
| World Hub | narrow review baseline | no broad value/funds/unlock/freeform editor |
| Groups | target/member/reply-mode V1 | no full multi-speaker orchestration |
| Phone | working support loop | not a main fantasy lane |
| Assets | usable support MVP | deeper owned-object loop not proven |
| Stock | usable support MVP | secondary until economy direction hardens |
| Profile | useful identity context | only add fields consumed downstream |

### Tier D: Internal, Deferred, Or Decision

| Area | State |
| --- | --- |
| Files | internal metadata/index compatibility surface |
| Cheats | decision; no frozen product contract |
| Gallery-first relationship memory | on hold |
| high-impact automatic relationship events | on hold |
| closed-page autonomous event generation | backend/privacy decision |
| broad K-pop system rollout | decision; planning draft is not executable |

## 3. Measured Engineering Baseline

Measured on 2026-08-09:

- 41 route views;
- 18 Pinia stores;
- 51 components;
- 37 composables;
- 173 JavaScript files and 93 Vue files under `src`;
- zero TypeScript source files;
- 171,987 source lines;
- 214 static unit-test files;
- the current Music plus active-journey Map media worktree passes lint, 217 Vitest files / 1556 tests, production build, governance, and 10 focused desktop/Pixel 5 Music and Map/Music cases; the prior 12-case default/zen system visual gate remains green.

### Largest Views

| File | Lines | Risk |
| --- | ---: | --- |
| `FoodDeliveryView.vue` | 12195 | platform/shop/order/commerce presentation |
| `ContactsView.vue` | 5233 | role/profile/memory/destructive-flow concentration |
| `ChatView.vue` | 4960 | messaging/AI/rich-card/service/runtime coordination |
| `HomeView.vue` | 4456 | layout/edit/library/shell sensitivity |
| `WorldBookView.vue` | 4104 | source/pack/template/knowledge control density |
| `WidgetsView.vue` | 4050 | authoring/import/preview breadth |
| `ChatDirectoryView.vue` | 3916 | role/group/service/template concept density |
| `AppStoreView.vue` | 3699 | app/world/mini-app/placement ownership |
| `MusicView.vue` | 2783 | listening/library/provider/settings presentation in one installed-app route |

### Largest Stores

| File | Lines | Risk |
| --- | ---: | --- |
| `system.js` | 4808 | broad infrastructure/compatibility owner; 25/41 view imports, including Music's public compatibility carrier |
| `foodDelivery.js` | 4313 | shared platform/shop commerce and event runtime |
| `map.js` | 3778 | map packs, pins, trips, renderer-facing state, and route responsibilities |
| `chat.js` | 3436 | rich communication/profile domain |
| `gallery.js` | 1533 | asset ownership and binary lifecycle |
| `relationshipRuntime.js` | 1397 | cross-module truth layer |
| `wallet.js` | 1327 | ledger, accounts/cards, quotes, receipts, payees, activity, and statements |
| `calendar.js` | 1116 | confirmed schedule, push, compatibility, relationship handoff |
| `shopping.js` | 1068 | commerce/logistics/service handoff |

Line counts are signals, not goals. A file becomes a priority when size combines with mixed responsibilities, frequent feature growth, cross-owner knowledge, or weak test locality.

## 4. Test And Release Posture

Strongly defended areas:

- persistence, hydration, backup rollback, and diagnostics;
- Chat store, response parsing, rich actions, service accounts, social review, and extracted models;
- relationship runtime, gating, cleanup, and cross-module adapters;
- WorldBook/Book/World Pack/App Store contracts;
- Map/Calendar/Reminders and commerce/Wallet handoffs;
- core Home/App Store/Contacts/WorldBook browser paths.

Gaps:

- no coverage threshold;
- PR and main Pages workflow definitions include full product E2E plus separate production/full audits; remote Run #130 and the deployed `/schatphone/` smoke are proven, while external required-check/environment enforcement remains unverified;
- Vercel root/optional-proxy and the third Git-connected Cloudflare Worker/static-assets root path are deployed at `ced45db`; the current local tree prepares a restricted dynamic relay but is not pushed. Cloudflare root/manifest/hash-route/static-asset/fail-closed checks and GitHub Pages direct configured-provider Chat/reload proof pass;
- push/provider/permission flows are not end-to-end CI tested;
- real-device keyboard/touch/safe-area/media/weak-network checks are absent;
- Music's generic provider seam has simulated-browser coverage but no opt-in real-provider/CORS or true-device audio-focus/interruption proof;
- production and full dependency audits are both clean after a compatible transitive lock refresh with no direct, override/resolution, or major changes; local and remote workflow evidence enforce that baseline, while independently rerunnable audit proof remains separate.
- product-level save-failed/read-only recovery, same-container writer protection with calm active-writer previews and automatic cooperative handoff, and the release-local complete v3 package/rollback/crash-recovery boundary are implemented. Predictive capacity reporting, cross-owner atomic Repository activation, legacy unavailable-media presentation, and personal R2 transport remain separate work.

## 5. Module Engineering Guidance

### Shell / Home

Preserve app entry recovery and lock/notification semantics. A future Home cleanup should target one editor/library state seam, not redesign layout storage and UI together.

### Settings / System

The Settings view is smaller after workflow extraction, but `systemStore` remains the central hotspot. The browser/PWA-first complete-backup/recovery contracts are accepted, the exact non-active Repository/Book foundation is implemented and tested, and the separately approved Book-only runtime cutover is active. Preserve every non-Book application storage key and shape until that owner receives its own migration/cutover approval.

### Chat / Chat Directory

Fifteen Chat composable seams already exist. Do not repeat them. Next work should be product-driven: a retry/error seam only when needed, deeper group orchestration through an explicit design, or Chat Directory concept-density cleanup.

### Contacts / Relationship

Ten Contacts read-model seams already exist. Contacts 4.1 and relationship-memory 4.2 are complete. Future work is the template-adaptation visual diff, richer template authoring after a decision, or later polish. Do not reopen ownership or duplicate extracted models.

### Book / WorldBook / World Pack

Three WorldBook display models already exist. Current risks are Optional capability Packs panel density, end-to-end phone comprehension, and content-carrier governance. The K-pop 2 + 6 + 1 Book/WorldBook content slice is landed; its prose rule remains separate from the future structured Mini Scene transform profile.

### Map / Calendar / Reminders

Preserve confirmed-event versus raw-cue ownership. The best architecture candidate is a deeper Calendar relationship-fact interface that hides concrete Chat/relationship store coordination.

Map geographic packs route through `MapSceneCanvas.vue` to the integrated `OpenFreeMapCanvas.vue`, while fictional/custom canvas packs and geographic startup failure use `LocalMapCanvas.vue`. Focused unit/E2E, fallback, bundle, attribution, real-network desktop/mobile visual, and controller interaction checks are complete; named physical-device gestures/offline-cache and deployed-network proof remain separate release evidence.

Calendar and Map are also future Mini Scene callers, but each must use a focused request Adapter after the shared Module exists. They retain source truth and never copy world-profile, regex, artifact, or presenter logic.

### Commerce / Finance

Preserve source records and use Chat/Wallet/Map only through explicit handoffs. Food Delivery now has five independent shop facades over one shared runtime; the live roadmap's next commerce-relevant target is the ordinary Food Delivery/Shopping consequence proof, not an implicit asset or facade queue. Assets/Stock should deepen only through named user loops.

### Music

Preserve the listening-first app, Music-owned global floating player, and active-journey Map panel split. Keep generic provider search, browser playback, radio queues, persistence, credentials, and Chat/Map projections behind the Music contract. Public library/provider state may remain compatibility-carried by System until a separately approved migration; API keys stay device-local and excluded. Promote real-provider or remaining caller work one bounded slice at a time, and do not let Chat/Map receive stream URLs, raw queues, or audio-runtime ownership.

### Runtime / World Hub / Push

Keep review-first semantics. The push relay must be described and deployed as a delivery helper until authentication, server state, and privacy are designed.

## 6. Current Engineering Order

1. preserve the accepted standalone complete-backup, integrity, capacity/failure, staged-restore, legacy missing-media, exact local-material reuse, migration, crash-recovery, and rollback contract;
2. preserve the completed non-active IndexedDB/Book Batch 2B foundation and active Book-only reference cutover, including its browser evidence and unchanged legacy fallback;
3. keep Gallery/R2, dual write, legacy Book deletion, garbage collection, and every non-Book owner migration/cutover separately approved;
4. preserve the proven remote Pages/base-path/direct-provider and Git-connected Vercel/Cloudflare root baselines, then deploy/smoke the restricted relay and finish external required-check/environment verification, installed-PWA/relaunch, and named true-device proof;
5. roadmap 4.8 Mini Scene Stage 2 persistence/policy approval now that the Book foundation prerequisite is complete; Stage 1 pure schemas/registry/profile validation/resolution are complete;
6. one named view/store hotspot seam or deeper cross-store adapter;
7. later device findings and incremental typing only where dependencies justify them.

## 7. Work To Avoid

- framework rewrite or whole-app TypeScript migration;
- broad `systemStore` split without storage migration design;
- feature and refactor mixed in one large slice;
- more hidden automation before review/ownership clarity;
- treating a planning draft as a live backlog;
- broad visual restyling while changing data ownership;
- production claims based only on a green static build.

## 8. Reading Path

1. `docs/roadmap/TODO_ROADMAP.md`
2. `docs/overview/PROJECT_MASTER_GUIDE.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/architecture/ARCHITECTURE_DEBT_REVIEW.md`
5. matching task package handoff
6. `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` for roadmap 4.8 work
