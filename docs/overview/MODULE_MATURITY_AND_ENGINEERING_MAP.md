# SchatPhone Module Maturity And Engineering Map

Updated: 2026-07-10

Purpose: engineering handoff reference for module maturity, ownership risk, edit cost, and validation posture.

This file is not a task board. Promote concrete work into `docs/roadmap/TODO_ROADMAP.md` and the matching package handoff.

## 1. Current Judgment

SchatPhone is in:

> integrated local-first V1 + architecture/security hardening + selective product validation

The strongest loops are real and test protected. The main risk is uneven finish and concentrated implementation cost, not a missing framework.

Four roadmap baselines are complete: Contacts IA, memory dedupe, World Hub review, and service-account continuity. Current engineering attention should move to credential/toolchain risk, release gates, named hotspots, and World Pack phone validation.

## 2. Maturity Tiers

### Tier A: Stable Foundations

| Area | Judgment | Engineering rule |
| --- | --- | --- |
| Lock / shell navigation | stable | preserve notification and lock-return contracts |
| Home entry system | stable but large | treat as shell infrastructure; avoid domain logic |
| Chat core | stable but very heavy | extract named seams before adding another side system |
| Contacts / relationship baseline | stable V2 baseline | preserve runtime truth and guarded cleanup ownership |
| Gallery | stable platform service | keep one media owner and explicit asset references |
| persistence / backup / diagnostics | stable infrastructure with credential-policy gap | preserve migration/rollback; fix secret export explicitly |

### Tier B: Integrated V1

| Area | Judgment | Main remaining work |
| --- | --- | --- |
| Book / WorldBook | integrated V1 | phone hardening and K-pop built-in content migration decision |
| World Pack / App Store | integrated V1, partial acceptance | true-device loop, target-app hardening, next archetype decision |
| Map / Calendar / Reminders | stable MVP | visual/detail polish and broader real-life handoff coverage |
| Shopping / Food Delivery / Logistics | integrated V1 | responsive/detail/checkout/tracking polish |
| Wallet | stable support | cleanup/explainability and later economy decisions |
| Appearance / Widgets / app identity | strong but split across owners | consistency and real-device authoring/recovery QA |
| Network | strong MVP | security guidance and provider-environment QA |

### Tier C: Partial Or Guarded

| Area | Judgment | Constraint |
| --- | --- | --- |
| Event Runtime | guarded foreground baseline | conservative event families only |
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

Verified on 2026-07-10:

- 30 route views;
- 16 Pinia stores;
- 36 components;
- 36 composables;
- 133 JavaScript files and 67 Vue files under `src`;
- zero TypeScript source files;
- about 104k source lines;
- 171 unit-test files / 1050 tests;
- 18 Playwright scenarios across desktop/mobile projects.

### Largest Views

| File | Lines | Risk |
| --- | ---: | --- |
| `ContactsView.vue` | 4754 | role/profile/memory/destructive-flow concentration |
| `ChatView.vue` | 4312 | messaging/AI/rich-card/service/runtime coordination |
| `WorldBookView.vue` | 4130 | source/pack/template/knowledge control density |
| `HomeView.vue` | 3920 | layout/edit/library/shell sensitivity |
| `ChatDirectoryView.vue` | 3802 | role/group/service/template concept density |
| `WidgetsView.vue` | 3617 | authoring/import/preview breadth |
| `AppStoreView.vue` | 3352 | app/world/mini-app/placement ownership |
| `FoodDeliveryView.vue` | 3161 | platform/shop/order/commerce presentation |

### Largest Stores

| File | Lines | Risk |
| --- | ---: | --- |
| `system.js` | 4186 | broad infrastructure/compatibility owner; 22/30 view imports |
| `chat.js` | 3062 | rich communication/profile domain |
| `map.js` | 2146 | broad simulation and route responsibilities |
| `gallery.js` | 1325 | asset ownership and binary lifecycle |
| `relationshipRuntime.js` | 1287 | cross-module truth layer |
| `foodDelivery.js` | 1222 | active commerce/event lane |
| `calendar.js` | 1014 | confirmed schedule, push, compatibility, relationship handoff |
| `shopping.js` | 943 | commerce/logistics/service handoff |

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
- CI omits Playwright and dependency audit;
- push/provider/permission flows are not end-to-end CI tested;
- real-device keyboard/touch/safe-area/media/weak-network checks are absent;
- full dependency audit reports development-tool advisories.

## 5. Module Engineering Guidance

### Shell / Home

Preserve app entry recovery and lock/notification semantics. A future Home cleanup should target one editor/library state seam, not redesign layout storage and UI together.

### Settings / System

The Settings view is smaller after workflow extraction, but `systemStore` remains the central hotspot. Next work should address backup credential policy or one facade such as Home placement, appearance, API settings, or automation. Preserve the storage key until a migration slice is explicit.

### Chat / Chat Directory

Fifteen Chat composable seams already exist. Do not repeat them. Next work should be product-driven: a retry/error seam only when needed, deeper group orchestration through an explicit design, or Chat Directory concept-density cleanup.

### Contacts / Relationship

Ten Contacts read-model seams already exist. Contacts 4.1 and relationship-memory 4.2 are complete. Future work is the template-adaptation visual diff, richer template authoring after a decision, or later polish. Do not reopen ownership or duplicate extracted models.

### Book / WorldBook / World Pack

Three WorldBook display models already exist. Current risks are Current World Pack panel density, end-to-end phone comprehension, and content-carrier governance. The K-pop plan should first promote a small built-in Book registration/migration slice if approved.

### Map / Calendar / Reminders

Preserve confirmed-event versus raw-cue ownership. The best architecture candidate is a deeper Calendar relationship-fact interface that hides concrete Chat/relationship store coordination.

### Commerce / Finance

Preserve source records and use Chat/Wallet/Map only through explicit handoffs. Product polish is more valuable than new cross-owner data copying. Assets/Stock should deepen only through named user loops.

### Runtime / World Hub / Push

Keep review-first semantics. The push relay must be described and deployed as a delivery helper until authentication, server state, and privacy are designed.

## 6. Current Engineering Order

1. backup credential decision and safe toolchain update;
2. CI/release gating alignment;
3. one named view/store hotspot seam;
4. one deeper cross-store adapter;
5. World Pack true-device findings and focused fixes;
6. incremental typing only for high-value contracts.

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
