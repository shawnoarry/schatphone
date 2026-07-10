# SchatPhone Project Module Audit

Updated: 2026-07-10

> **Candidate pool only / 仅候选池**
>
> This file compares module maturity and future opportunities. It is not an implementation source. Promote selected work into `TODO_ROADMAP.md` and the owning package handoff.

## 1. Audit Judgment

SchatPhone has an integrated local-first V1 with strong core loops and uneven finish.

Current product risks, in order:

1. credential/toolchain/release hardening;
2. large view/store hotspots;
3. true-device and end-to-end visual quality;
4. World Pack/runtime hardening;
5. shallow secondary-module loops;
6. content plans that are not yet mapped to the right product carriers.

Priority meanings:

- `P0`: security or release-confidence issue;
- `P1`: strong next candidate after promotion;
- `P2`: useful later deepening;
- `Watch`: preserve, no proactive feature push;
- `Decision`: cannot implement safely yet.

## 2. Module Candidate Audit

| Module / area | Current state | Main gap | Boundary risk | Candidate next move | Priority |
| --- | --- | --- | --- | --- | --- |
| Lock Screen | stable entry and notification surface | true-device/safe-area polish | parallel notification behavior | keep metadata and return paths aligned | Watch |
| Home | stable app/folder/widget shell, large view | editing/library complexity | becoming a control console | one named edit/library state seam | P1 |
| Settings | strong system hub | credential backup policy | owning domain records | exclude/warn for credentials; preserve migrations | P0 |
| Network & API | strong URL-first MVP | security guidance and provider QA | transport churn hidden in UI work | add sensitive-data guidance after policy | P1 |
| Chat | strongest immersive core, very large | group orchestration and real-device media QA | relationship/source truth drift | focused product seam or later group design | P1 |
| Chat Directory | real object/group/service manager | concept density | becoming role archive or source-record owner | separate one service/template management seam | P1 |
| Contacts | stable V2 baseline with ten read models | template-adaptation diff/richer authoring | destructive and relationship semantics | visual diff only after focused acceptance | P1 |
| Relationship Runtime | stable truth layer | new source chains only as needed | copied metrics/memories elsewhere | preserve; add adapters only for explicit events | Watch |
| Gallery | stable media owner | Photos-like collections/visual finish | forced memory/admin role | keep asset-first | P2 |
| Appearance | strong split ownership baseline | product-wide visual consistency | global pack absorbing app-owned layers | real-device authoring/recovery QA | P1 |
| App Store | integrated app/world/mini-app manager | growing catalog density | owning target-app business state | search/detail density review after phone test | P1 |
| Book | integrated V1 long-text library | content migration and phone hardening | becoming Files/reader/activation owner | K-pop built-in migration after decision | P1 decision |
| WorldBook | integrated V1, very large | Current World Pack panel density | universal control-console drift | extract one unrepeated pack display seam | P1 |
| World Pack | partial V1 acceptance | true-device product loop | generating arbitrary apps/rules | harden current four paths before another archetype | P1 |
| Map | stable MVP, broad store/view | final interaction/visual pass | absorbing schedule/order truth | true-device route/context polish | P1 |
| Calendar | stable confirmed-event owner | adapter depth and event-management polish | direct cross-store knowledge | deeper confirmed-event relationship interface | P1 |
| Reminders | stable raw-cue owner | future objective/task clarity | collapsing back into Calendar | refine only when a real cue family needs it | P2 |
| Phone | working callback support | shallow standalone fantasy | premature expansion | preserve as connector | Watch |
| Shopping | integrated commerce V1 | tracking/order share and polish | Chat/Wallet ownership leakage | source-owned share surface | P1 |
| Food Delivery | integrated commerce/event V1 | responsive/detail/template polish | platform aggregating peer-shop truth | true-device shop/order polish | P1 |
| Logistics | contextual tracking lane | full source-app share UI | becoming storefront | tracking share from source records | P2 |
| Wallet | stable downstream ledger | cleanup/rate UX | owning source orders | improve explainability only | P2 |
| Assets | persisted support MVP | convincing owned-object loop | overlap with Gallery/Wallet | one clearly owned use case | P2 |
| Stock | persisted support MVP | narrative/economy relevance | absorbing finance domains | defer until economy decision | P2 |
| Event Runtime | guarded foreground baseline | broader sources/scheduling | invisible high-impact mutation | expand only through review-first packs | P1 guarded |
| World Hub | completed review baseline, narrow controls | stronger control design | becoming required admin UI | wait for a specific review/control gap | P2 |
| Cheats | concept only | unlock/route/editor contract | duplicating World Hub | explicit product decision | Decision |
| Files | internal compatibility component | none for ordinary users | public file-manager drift | expand only for an internal consumer | Watch |
| Push relay | working local delivery helper | auth/tenancy/operations | being mistaken for backend autonomy | production-backend decision | Decision |
| QA / CI | strong local tests | no E2E/audit gate or coverage floor | build-only release confidence | add explicit gate policy | P0 |

## 3. Cross-Cutting Candidates

### Security And Release

- backup secret treatment;
- compatible Vite/transitive update;
- isolated Vitest migration;
- Playwright/audit CI policy;
- Pages release gating.

### Maintainability

- one `systemStore` facade;
- one large-view state seam;
- deeper Calendar relationship adapter;
- incremental contract types.

### Product Validation

- true-device World Pack loop;
- Chat rich media and service threads on real phones;
- app/scoped CSS recovery;
- shop/detail/checkout density;
- push/provider permission and failure paths.

### Content Governance

- approve K-pop carrier split;
- migrate built-in Book content first;
- keep profile/schedule/location/service/app/event carriers separate;
- do not execute the planning draft as one large package.

## 4. Recommended Candidate Order

1. backup/toolchain security and CI/release confidence;
2. one named architecture hotspot or adapter seam;
3. true-device World Pack product loop and focused fixes;
4. K-pop carrier decision and one migration slice;
5. source-owned tracking/share or focused commerce polish;
6. secondary modules and broader runtime only after explicit promotion.

## 5. Promotion Checklist

Before moving a candidate to the live roadmap:

1. identify the product owner and package;
2. state what data/behavior must not move;
3. define user-visible or semantic acceptance;
4. name targeted tests and full validation;
5. update package handoff and live roadmap together;
6. keep unrelated candidate ideas in this audit.

## 6. Read Next

- live board: `docs/roadmap/TODO_ROADMAP.md`
- maturity/engineering risk: `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`
- architecture evidence: `docs/architecture/ARCHITECTURE_DEBT_REVIEW.md`
- package routing: `docs/pm/TASK_PACKAGE_INDEX.md`
