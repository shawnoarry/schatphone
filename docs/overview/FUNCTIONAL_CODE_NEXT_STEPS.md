# Functional Code Next Steps

Updated: 2026-07-22

> **Frozen execution status / 非执行看板**
>
> This is a candidate reference, not an active TODO. Promote a selected slice into `docs/roadmap/TODO_ROADMAP.md` and the matching package handoff before implementation.

## 1. Current Verdict

Do not restart completed Contacts 4.1, memory 4.2, World Hub 4.3, or service-account 4.4 work.

The best next work is:

1. review the completed non-active IndexedDB/Book Batch 2B repository foundation and preserve its browser evidence;
2. keep Book runtime import/cutover/activation and later reference migrations separately approved;
3. security/toolchain hardening;
4. release-gate alignment and one measured architecture seam;
5. the roadmap 4.8 Mini Scene persistence/policy contract after its completed pure foundation, followed by separately approved presenter and source-Adapter stages;
6. later product/device/content work in dependency order.

## 2. Completed Enough To Stop Re-Listing

- Calendar / Reminders product split;
- Contacts V2 detail and cleanup baseline;
- relationship runtime and explicit-lineage memory dedupe;
- Calendar relationship review details;
- filtered World Hub event/relationship review;
- Chat generated social-event review V1;
- Shopping/logistics/Food Delivery service notifications;
- Book source library and WorldBook activation;
- compatible World Packs, App Store world entries, reviewed app/service proposals;
- Shopping/Food Delivery/Calendar/Map world-app context;
- global/scoped appearance ownership seams;
- Settings, Chat, Contacts, and WorldBook composable extraction batches already listed in architecture docs.

## 3. Candidate A: IndexedDB-First Persistence And Complete Backup Architecture

Current contract status:

- `docs/architecture/BACKUP_RECOVERY_ENGINEERING_CONTRACT.md` is accepted at architecture level;
- it freezes standalone package/manifest integrity, capacity and failure states, staged atomic activation, crash recovery, legacy degraded restore, exact local binary reuse, non-destructive Gallery preservation, migration, rollback, and the test matrix;
- `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md` is architecture-accepted, and its exact non-active Batch 2B Repository schema/Adapter/Book fixture/staging slice plus focused real-Chromium coverage completed on 2026-07-22;
- neither contract approves application Repository import, Book cutover/active-pointer activation, dual write, R2, Gallery schema, or later-owner migration.

Problem:

Current stores write whole JSON snapshots to `localStorage` and mirror them to IndexedDB. Normal startup still prefers valid `localStorage`, so the mirror does not remove the small synchronous quota or whole-store rewrite cost. Long Chat history, inline base64 media, Gallery binaries, Book text, and future archived-role continuity need explicit long-term storage contracts.

Confirmed product boundary:

- ordinary browsers and installable PWAs remain complete first-class clients;
- one isolated browser/Web App storage container owns one current save;
- authoritative histories and accepted relationship evidence cannot be silently or irreversibly deleted; cold archival must remain reversible;
- committed content is durable whenever its owner publishes/confirms/applies it into revisitable or continuity-bearing history, including future social/forum/offline/narrative/performance/state records regardless of user/AI/system origin;
- complete AI prompts/raw responses, uncommitted drafts, and rebuildable projections are not retained by default; canonical content, authoritative state/facts, references, structured outcomes, and minimum provenance persist;
- IndexedDB-first structured persistence is the target direction;
- complete migration backup includes configured credentials and must be presented as a sensitive local file;
- Gallery is the reusable local material library; generated image/media results require explicit user retention before durability, and `keep` never uploads or automatically enrolls material in backup;
- core data is always complete, while one default-on whole-Gallery choice includes all retained local binaries without per-item reselection; URL-backed items always preserve their original URL and minimum metadata rather than exact bytes;
- backup is for rollback/recovery rather than sync or local-space offload; manual backup is always available, automatic backup defaults off, and successful remote backup never releases local originals;
- keep multiple versions, but every local file and remote object must be a complete independently importable package; local export uses a user-editable product-name-plus-date default and the platform save/share flow;
- do not build an internal local backup library; local files return through explicit import, while a configured personal R2 must be listed and restored directly inside SchatPhone without a separate Cloudflare download;
- in-app deletion permanently deletes the selected connected-R2 backup and requires an unmistakable destructive confirmation; keep the row visible when the cloud deletion fails;
- never rotate or delete a cloud backup automatically; quota pressure may warn or block a new backup but every existing version remains until explicit user-confirmed deletion;
- a redacted/shareable export, native SQLite adapter, server sync, or encryption requires a separate contract.

Remaining planning before implementation:

- classify authoritative, audit, projection, binary, cache, diagnostic, and transient AI transport data under the confirmed retention boundaries;
- implement the exact accepted repository stores/indexes, transactions, fixtures, staging, quota/persistence policy, and multi-tab coordination behind unreferenced/test Adapters only;
- preserve the accepted backup-size/quota, creation-failure, standalone package, integrity, staged restore, binary completeness, local delivery, legacy import, and rollback acceptance;
- stop before application import, Book cutover/activation, dual write, or another owner.

Do not start broad migration from this candidate. Its exact non-active Batch 2B foundation is complete, but application import/cutover/activation is still not approved.

## 4. Candidate B: Toolchain And CI Hardening

Current evidence:

- production audit: clean;
- full audit: development/tool advisories, including direct Vite/Vitest findings;
- Vite has a compatible 7.x update available;
- Vitest remediation is a major migration;
- CI omits Playwright and audit;
- Pages deployment is build-only.

Safe sequence:

1. compatible Vite/transitive update;
2. full validation;
3. isolated Vitest migration plan;
4. add a Playwright browser job and audit policy;
5. gate deployment through repository/workflow policy.

## 5. Candidate C: One Named Hotspot Seam

Choose one, not several:

- Optional capability Pack review/display state from `WorldBookView.vue` / the legacy-named `CurrentWorldPackPanel.vue` implementation;
- one Home edit/library state seam from `HomeView.vue`;
- one Chat Directory service/template management seam;
- one `systemStore` facade for API settings, Home placement, appearance, or automation;
- Contacts template-adaptation visual diff as a product slice, not another duplicate read model.

Acceptance:

- storage and route behavior unchanged;
- visible behavior unchanged unless the slice explicitly includes UX acceptance;
- focused tests cover the extracted interface;
- file/fan-out measurement is updated.

## 6. Candidate D: Deeper Calendar Relationship Adapter

Current issue:

Calendar uses the shared fact adapter but still passes concrete Chat and relationship-runtime stores.

Desired direction:

- Calendar submits a confirmed-event domain payload;
- a neutral relationship service resolves target/context and writes runtime state;
- Calendar does not need concrete relationship-owner knowledge;
- existing memory lineage and review behavior remain identical.

This is a good ownership improvement after security/toolchain work.

## 7. Candidate E: World Pack Phone Validation

Run the real product loop:

1. Book import/edit/export;
2. WorldBook activation and changed-source review;
3. compatible pack recommendation/enablement;
4. App Store world entry placement and launch;
5. Shopping/Food Delivery/Calendar/Map target context;
6. Chat Services candidate review/join;
7. recovery after invalid CSS, missing source, or rejected proposal.

Promote only the concrete failures found during testing. Do not broaden archetypes first.

## 8. Candidate F: Cross-Module Mini Scene Next Gate

Current contract status:

- `docs/architecture/MINI_SCENE_MODULE_CONTRACT.md` is architecture-accepted and Stage 1 is done;
- the K-pop 2 + 6 + 1 Book/WorldBook content slice is already landed, and its music-show-day prose rule remains narrative input rather than executable configuration;
- pure request/draft/artifact/policy schemas, an empty-by-default module registry, Book structured-profile/regex validation, deterministic world/profile resolution, and 22 focused tests are landed;
- no shared runtime, popup, safe regex execution engine, built-in structured transform profile, persistence, or source Adapter is implemented.

The Book Repository foundation prerequisite is complete. The next Mini Scene gate remains a separately approved persistence and policy architecture slice:

- add `mini_scene.artifact`, profile binding, content-dimension choice, and registered-module policy ownership to persistence/backup contracts;
- freeze compatibility, restore order, migration default, and repository fixture requirements;
- keep the caller registry empty and do not create a Store or runtime import in the contract round.

Do not add regex execution, a Store, route, Settings UI, popup, iframe, AI call, or Calendar/Map/Chat trigger in the persistence/policy contract slice. Those remain separate stages.

## 9. Later Product Candidates

- explicit group multi-speaker orchestration;
- tracking/order share surfaces from source apps;
- deeper Assets and Stock loops;
- Reminders objective/task presentation;
- stronger Map visual/interaction pass;
- another World Pack archetype;
- broader runtime event families after review safety;
- production backend/autonomy only after a separate architecture decision.

## 10. Avoid

- broad Chat/store redesign;
- whole-app TypeScript migration;
- fuzzy memory merging without a product decision;
- Gallery-first relationship-memory mainline;
- automatic subscription/source-record creation;
- hiding security debt behind a production-only audit result;
- treating `docs/superpowers/**` checklists as executable status.
