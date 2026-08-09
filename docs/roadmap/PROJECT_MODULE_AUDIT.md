# SchatPhone Project Module Audit

Updated: 2026-08-09

> **Candidate pool only / 仅候选池**
>
> This file compares module maturity and future opportunities. It is not an implementation source. Promote selected work into `TODO_ROADMAP.md` and the owning package handoff.

## 1. Audit Judgment

SchatPhone is in internal personal development with several strong integrated loops and substantial unfinished product/architecture work.

Current product risks, in order:

1. long-term persistence growth, capacity visibility, and post-preview data lifecycle beyond the completed release-local v3 recovery boundary;
2. core product definition and ownership-sensitive architecture;
3. large view/store hotspots;
4. later credential/toolchain/release hardening;
5. deferred device/content and shallow secondary-module loops.

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
| Settings | usable system hub with product-level persistence recovery and complete v3 local export/restore | whole-snapshot runtime persistence plus broader capacity/Repository/R2 work | owning domain records or becoming the database | preserve the completed local recovery owner; keep broader runtime cutover separate | P1 staged |
| Network & API | strong URL-first MVP | security guidance and provider QA | transport churn hidden in UI work | add sensitive-data guidance after policy | P1 |
| Chat | strongest immersive core, very large | group orchestration and real-device media QA | relationship/source truth drift | focused product seam or later group design | P1 |
| Chat Directory | real object/group/service manager | concept density | becoming role archive or source-record owner | separate one service/template management seam | P1 |
| Contacts | stable V2 baseline with ten read models | template-adaptation diff/richer authoring | destructive and relationship semantics | visual diff only after focused acceptance | P1 |
| Relationship Runtime | usable truth layer | 500-event truncation conflicts with long-term audit continuity | copied metrics/memories or lost evidence | define authoritative/audit retention before persistence migration | P0 decision |
| Gallery | stable media owner | Photos-like collections/visual finish | forced memory/admin role | keep asset-first | P2 |
| Camera / Image Generation | focused V1 with shared adapters, routing, candidates, and explicit Gallery keep | Gallery People truth, source callers, hosted proxy/provider and true-device proof | duplicated endpoint/credential fields, secret leakage, or automatic Gallery admission | preserve shared module and promote each caller separately | P1 partial |
| Music | focused installed-app first slice with generic JSON provider search and browser playback | real-provider/CORS smoke, true-device media behavior, and actual Chat/Map callers | provider secrets/stream URLs crossing owners or external direct-play authority | preserve the Music contract and promote provider/caller work one slice at a time | P2 partial |
| Appearance | strong split ownership baseline | product-wide visual consistency | global pack absorbing app-owned layers | real-device authoring/recovery QA | P1 |
| App Store | integrated app/world/mini-app manager | growing catalog density | owning target-app business state | search/detail density review after phone test | P1 |
| Book | integrated V1 long-text library; K-pop 2 + 6 + 1 landed | phone hardening and structured Mini Scene profile authoring | becoming Files/reader/runtime-activation owner | validate separate structured transform profiles only through the shared Mini Scene contract | P1 staged |
| WorldBook | integrated V1, very large | Optional capability Packs panel density | universal control-console drift | extract one unrepeated pack display seam | P1 |
| World Pack | partial V1 acceptance | true-device product loop | generating arbitrary apps/rules | harden current four paths before another archetype | P1 |
| Map | world-bound local-pack baseline; OpenFreeMap renderer integrated | true-device gestures/offline-cache proof, then later package authoring, PMTiles, transit adapters, and additional cities | provider identity or network renderer becoming canonical place truth | continue only from the Map handoff; preserve `MapSceneCanvas` and local fallback contracts | P1 partial |
| Calendar | stable confirmed-event owner | adapter depth and event-management polish | direct cross-store knowledge | deeper confirmed-event relationship interface | P1 |
| Reminders | stable raw-cue owner | future objective/task clarity | collapsing back into Calendar | refine only when a real cue family needs it | P2 |
| Phone | working callback support | shallow standalone fantasy | premature expansion | preserve as connector | Watch |
| Shopping | integrated commerce V1 | tracking/order share and polish | Chat/Wallet ownership leakage | source-owned share surface | P1 |
| Food Delivery | integrated commerce/event V1 with five independent shop facades | ordinary Wallet/Calendar/Chat/relationship consequence proof; later tracking/polish | platform aggregating peer-shop truth or facade work becoming a shadow queue | prove the roadmap-owned ordinary consequence flow before another shop framework | P1 |
| Logistics | contextual tracking lane | full source-app share UI | becoming storefront | tracking share from source records | P2 |
| Wallet | stable downstream ledger | cleanup/rate UX | owning source orders | improve explainability only | P2 |
| Assets | persisted support MVP | convincing owned-object loop | overlap with Gallery/Wallet | one clearly owned use case | P2 |
| Stock | persisted support MVP | narrative/economy relevance | absorbing finance domains | defer until economy decision | P2 |
| Event Runtime | guarded foreground baseline | broader sources/scheduling | invisible high-impact mutation | expand only through review-first packs | P1 guarded |
| Mini Scene | pure foundation landed, no runtime | persistence/policy, presenters, and source Adapters | module-specific regex/HTML copies, hidden activation, unsafe execution, or source-truth leakage | Book foundation prerequisite is complete; persistence/backup and later stages still require separate gates | P1 staged |
| World Hub | completed review baseline, narrow controls | stronger control design | becoming required admin UI | wait for a specific review/control gap | P2 |
| Cheats | concept only | unlock/route/editor contract | duplicating World Hub | explicit product decision | Decision |
| Files | internal compatibility component | none for ordinary users | public file-manager drift | expand only for an internal consumer | Watch |
| Push relay | working local delivery helper | auth/tenancy/operations | being mistaken for backend autonomy | production-backend decision | Decision |
| QA / CI | local gates and restricted-relay desktop/Pixel 5 evidence pass; remote Pages/direct-provider Chat plus Vercel/Cloudflare `a1418ed` dynamic-relay model/Chat smoke are proven | verify external protections, installed-PWA/true-device flows, independent audit availability, and a coverage floor | treating browser-origin checks or instance-local limits as abuse-proof infrastructure | preserve current gates and add only the missing external/device proof | P0 |

## 3. Cross-Cutting Candidates

### Security And Release

- `DONE 2026-07-22`: complete-backup sensitive-file warning with unchanged credential-bearing payload;
- `DONE 2026-07-21`: compatible Vite/transitive update;
- `DONE 2026-07-22`: isolated Vitest 4 migration, nested Vite 5/esbuild removal, and critical-advisory closure;
- `DONE 2026-07-22`: normal-resolver compatible transitive lock refresh, with production/full audit at 0/0 and no direct, override/resolution, or major change;
- `WORKFLOW_IMPLEMENTED 2026-07-22`: one full Playwright run plus separate production/full audits for PR and main Pages build;
- `DONE 2026-08-07`: remote Pages gate and deployed `/schatphone/` base-path smoke;
- `PARTIAL_DONE 2026-08-09`: Git-connected Vercel root-path app and restricted dynamic relay are deployed from `a1418ed`; GitHub Pages direct-provider model/connection/real-Chat/reload proof and real-provider model-list/Chat smoke through Vercel both pass. PWA/relaunch, external protection, and true-device evidence remain.
- `DEPLOYED_BASELINE 2026-08-09`: Git-connected Cloudflare Worker/static-assets root path is live at `https://schatphone.noarry.workers.dev`; shared proxy-core tests, root build, Wrangler dry-run, automatic Workers Build, root/static smoke, no-secret dynamic-target probe, and GitHub Pages real-provider 6-model/Chat-`OK` relay proof pass for `a1418ed`.

### Persistence And Recovery

- browser/PWA-first IndexedDB repository contract;
- authoritative/audit/projection/binary/cache/log classification;
- explicit user deletion for authoritative history/evidence, with reversible cold archival instead of silent truncation;
- durable committed content from any future module when formally published/confirmed/applied, regardless of user/AI/system origin;
- transient full AI prompts/responses, uncommitted drafts, and rebuildable projections, with canonical content, authoritative state/facts, references, structured outcomes, and minimum provenance retained;
- Chat, relationship-evidence, Book, and Gallery growth policy;
- generated-media local retention, one default-on whole-Gallery backup choice, URL/source-only backup, recovery-only R2 placement, and default-off automation;
- quota visibility, persistent-storage request, and multi-tab coordination;
- `DONE 2026-08-07`: one root-shell save-failed/read-only state consumes layered and Book results with retry, confirmed reload, and Settings complete-backup handoff;
- `DONE 2026-08-07`: one page-level writer is acquired before reconciliation and Store mount; later same-container pages inspect without repair and fail closed across layered, Book, Gallery binary, and image-generation device-local writes until retry succeeds;
- `DONE 2026-08-09`: schema v3 complete local backup requires all current sections, Chat identity/avatar state, canonical section/payload/binary integrity, and default-on whole-Gallery material; import verifies before mutation, preserves current-only retained material, journals a full rollback snapshot, and recovers interrupted restores before mount;
- Music public library/provider/integration state is required through `system-settings`, while `schatphone:music:credentials` is a separately inventoried device-local secret excluded from plaintext backup and cross-module projections;
- accepted contract for multiple independently importable complete sensitive backups with editable/default naming, platform-owned local files, direct in-app personal-R2 listing/restore, manifest, integrity, capacity/failure states, staged restore, exact local-material reuse, non-destructive Gallery preservation, missing-media placeholders, legacy migration, and rollback;
- confirmed explicit in-app R2 deletion with prominent cloud warning and cloud-success gating; no local or cloud backup may be rotated or deleted automatically, and quota pressure must warn or block rather than remove recovery points.

### Cross-Module Mini Scene

- one shared request/artifact Interface for registered Calendar, Map, Chat, and future callers;
- explicit Settings mode per module: unconfigured/off, text, or interactive HTML;
- world-specific Book narrative rules and separate structured transform profiles, with profile binding independent from WorldBook activation;
- optional reviewed World Pack profile references without requiring a Pack or auto-enabling Book content;
- bounded safe regex only after structured validation;
- Text and sandboxed HTML Presenter Adapters with visible fallback;
- separate persistence/backup approval after the Book Repository foundation pilot;
- first optional source Adapter planned for a confirmed K-pop Calendar music-show-day event.

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
- Music real-provider/CORS, audio interruption/media controls, mini-player clearance, PWA relaunch, and bounded Chat/Map caller paths.

### Content Governance

- approve K-pop carrier split;
- migrate built-in Book content first;
- keep profile/schedule/location/service/app/event carriers separate;
- do not execute the planning draft as one large package.

## 4. Recommended Candidate Order

1. preserve the accepted complete-backup/recovery contract, completed non-active IndexedDB Repository/Book foundation, and active Book-only reference cutover while keeping every non-Book migration and later data-lifecycle work separately gated;
2. use the completed Book cutover, fixtures, and rollback proof as the reference boundary; do not begin another owner migration without separate approval;
3. preserve the deployed Pages, Vercel, and Git-triggered Cloudflare infrastructure baselines while completing remaining provider/PWA/external-protection/true-device proof;
4. one named architecture hotspot or adapter seam;
5. later device, content, commerce, secondary-module, and broader-runtime work only after explicit promotion.

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
