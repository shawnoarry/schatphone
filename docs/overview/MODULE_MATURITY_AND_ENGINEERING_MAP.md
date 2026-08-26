# SchatPhone Module Maturity And Engineering Map

Updated: 2026-08-26

Measurement baseline: integrated `f06a575`; current dirty-worktree changes are excluded.

Purpose: engineering handoff reference for module maturity, ownership risk, edit cost, and validation posture.

This file is not a task board. Promote concrete work into `docs/roadmap/TODO_ROADMAP.md` and the matching package handoff.

## 1. Current Judgment

SchatPhone is in:

> integrated product preview + durable continuity closure + release hardening

The strongest loops are real and test protected. The main risks are uneven finish, concentrated implementation cost, remaining Mini Scene retention/reuse work, and release claims that still lack installed-PWA and named physical-device proof.

The original four roadmap baselines remain complete. Since then the project has integrated the Camera/Image Generation and Music first slices, release-local recovery and Book Repository reference cutover, CMG shared-experience repairs through `CMG-07`, Event Runtime/Calendar collaborations, commerce checkout/support flows, Map media expansion, Appearance theme/icon foundations, and the thirteen-App S1 shell portfolio. The Mini Scene AI/text shell is landed, while `CMG-08` occurrence reuse/optional retention, dependent CMG reading/recovery closure, production triggers, profile binding, safe transforms, and HTML remain gated.

## 2. Maturity Tiers

### Tier A: Stable Foundations

| Area | Judgment | Engineering rule |
| --- | --- | --- |
| Lock / shell navigation | stable | preserve notification and lock-return contracts |
| Home entry system | stable but large | treat as shell infrastructure; avoid domain logic |
| Chat core | stable but very heavy | extract named seams before adding another side system |
| Contacts / relationship baseline | stable V2 baseline with CMG hardening partial | preserve Relationship Runtime as the one current truth; retain completed 500/300 cap and disclosure repairs while finishing dependent CMG reading/recovery work |
| Gallery | stable image-asset platform service; local material-library contract confirmed | keep one reusable-media owner, require explicit local retention, use one whole-library backup choice, preserve URLs as URLs, and do not turn backup into offload |
| Image Generation | shared first slice implemented; Camera is the visible owner | keep provider protocols behind the shared module, back up public configuration only, keep credentials/candidates device-local, and require explicit Gallery retention |
| persistence / backup / diagnostics | release-local v3 complete backup/recovery, product-level recovery, same-container one-writer/read-only-preview protection with automatic cooperative handoff, and Book-only Repository cutover browser-tested | keep one-container/one-save, complete versions, no sync/merge; preserve non-Book cutover gates and pursue capacity/root-generation/R2 work only as separate architecture slices |

### Tier B: Integrated V1

| Area | Judgment | Main remaining work |
| --- | --- | --- |
| Book / WorldBook | integrated V1, K-pop 2 + 6 + 1 content landed | phone hardening and later separate Mini Scene transform-profile authoring |
| World Pack / App Store / World Suite | integrated V1 Pack/App Store plus reusable Suite planning/inventory, production-backed Book/Gallery/Map Adapters, typed Catalog, and a real-Store installation runtime | reviewed K-pop Catalog/manifest, startup/product caller, later native Owner Adapters, activation UI, true-device loop, and target-app hardening |
| Map / Calendar / Reminders | Map journeys/media plus Calendar/Agenda/Activity and Mail/Work Hub handoffs integrated at scoped local baselines | preserve owner truth while completing source-conflict actions, remaining media decisions, later MJE gates, PWA, and true-device proof |
| Shopping / Food Delivery / Logistics | integrated V1 with eleven Shopping storefronts, fifteen Food Delivery entries, checkout/support flows, and ordinary consequence proof | refunds, tracking shares, later depth, and physical-device proof remain separate |
| Wallet | stable support with cards, Activity, statements, payees, receipts, and source sharing | refund/mixed-currency policy and later economy decisions |
| Appearance / Widgets / app identity | authored theme/icon/style-kit foundation integrated; owner split preserved | current unintegrated visual work, consistency, asset completion, and real-device authoring/recovery QA |
| Network | strong MVP | security guidance and provider-environment QA |
| Camera | focused installed-app V1 | Gallery People curation, source-module callers, hosted-provider smoke, and true-device QA |
| Music | focused installed-app first slice with Chat track-share and active-journey Map media callers | real-provider/CORS smoke, true-device media/PWA proof, Chat search, and external Map queue requests |
| S1 App Shell portfolio | thirteen installed S1 previews plus Notification Center integrated | each S2 owner and S3 event chain requires separate promotion |

### Tier C: Partial Or Guarded

| Area | Judgment | Constraint |
| --- | --- | --- |
| Event Runtime | guarded foreground baseline with Event Instance retention repair and EVE/CJA slices integrated | conservative event families only; `CMG-08` remains the next Mini Scene governance dependency |
| Mini Scene | AI-required text shell landed; production triggers still gated | make request reuse deterministic and committed-artifact retention durable before another trigger; HTML and broader source Adapters remain staged |
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
| broader K-pop world/runtime expansion | current 2 + 6 + 1 content and Player Context slices are scoped; broader rollout remains separately gated |

## 3. Measured Engineering Baseline

Measured from integrated baseline `f06a575` on 2026-08-26:

- 58 route views;
- 24 Pinia store files;
- 144 Vue components under `src/components`;
- 49 top-level JavaScript composables;
- 291 JavaScript files and 203 Vue files under `src`;
- zero TypeScript source files;
- 328 static unit/component test files;
- 72 Playwright spec files;
- passing test counts and build sizes remain attached to their named roadmap/package validation records rather than being inferred from static inventory.

### Largest Views

| File | Lines | Risk |
| --- | ---: | --- |
| `FoodDeliveryView.vue` | 12716 | platform/shop/order/commerce presentation |
| `ContactsView.vue` | 6096 | role/profile/memory/destructive-flow concentration |
| `ChatView.vue` | 5175 | messaging/AI/rich-card/service/runtime coordination |
| `HomeView.vue` | 5175 | layout/edit/library/shell sensitivity |
| `WorldBookView.vue` | 4410 | source/pack/template/knowledge control density |
| `ChatDirectoryView.vue` | 3915 | role/group/service/template concept density |

### Largest Stores

| File | Lines | Risk |
| --- | ---: | --- |
| `foodDelivery.js` | 6771 | shared platform/shop commerce, checkout, support, and event coordination |
| `system.js` | 5361 | broad infrastructure/compatibility owner; direct use appears in 42/58 route views |
| `map.js` | 5263 | map packs, places/media, pins, trips, renderer-facing state, and route responsibilities |
| `chat.js` | 3465 | rich communication/profile domain |
| `shopping.js` | 2468 | storefront commerce, checkout, logistics, and service handoff |
| `simulation.js` | 1886 | Event Runtime instances, logs, permissions, and orchestration state |
| `gallery.js` | 1800 | asset ownership and binary lifecycle |
| `wallet.js` | 1592 | ledger, accounts/cards, quotes, receipts, payees, activity, and statements |
| `relationshipRuntime.js` | 1587 | cross-module relationship truth and memory layer |
| `music.js` | 1509 | listening library, provider, playback, and integration state |
| `calendar.js` | 1381 | confirmed schedule, storage V4, push, and source handoffs |

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
- repository-owned artwork externalization is complete at the current boundary: the registry contains 843 verified objects split between public runtime artwork and protected masters/sources/candidates; batch publishing, centralized runtime URLs, cross-PC fallback, device-local copy/verify archives, and the initial three-host proof are established. New visual work uses a confirmed asset upload list (`素材上传清单`), which authorizes transfer without declaring the artwork final; audit and test evidence is excluded from image-bed payloads.

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

Three WorldBook display models already exist. Current risks are Optional capability Packs panel density, end-to-end phone comprehension, and content-carrier governance. The K-pop 2 + 6 + 1 Book/WorldBook content slice is landed; its prose rule remains separate from the future structured Mini Scene transform profile. The shared World Suite plan/inventory/execution Modules, Book/Gallery/Map Owner Adapters, typed/versioned Catalog, and explicitly constructed real-Store installation runtime are landed. Book Catalog/Suite paths share one persisted asset with collision, modification, WorldBook-reference, capacity/read-only, and rollback protection. Gallery owns stable asset folders and native-use protection; Map consumes Gallery IDs, preserves normalized authored places/provenance, and blocks current/history/topology risks. System checkpoints require successful persistence and retry from Owner truth. The default standalone Map inspection remains read-only; a reviewed K-pop Catalog/manifest, startup/product caller, later Owner Adapters, UI, activation, and true-device proof remain separate product slices.

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

1. complete `CMG-08` occurrence/request reuse, optional full-scene retention, retained-scene management, and removal of silent 120-artifact truncation;
2. complete dependent `CMG-09` bounded reads/prompts and `CMG-10` migration/recovery proof without deleting owner history;
3. preserve the accepted complete-backup, same-container writer, Book Repository, and rollback boundaries while keeping non-Book/R2 migration separately approved;
4. finish external protection, installed-PWA/relaunch, backup round trip, and named true-device proof over the existing hosted baselines;
5. run World Pack device validation only where it overlaps that release matrix;
6. keep hotspot decomposition, cross-store depth, and incremental typing on hold until the product-preview gate or an explicit user promotion.

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
