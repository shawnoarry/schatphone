# Functional Code Next Steps

Updated: 2026-08-09

> **Frozen execution status / 非执行看板**
>
> This is a candidate reference, not an active TODO. Promote a selected slice into `docs/roadmap/TODO_ROADMAP.md` and the matching package handoff before implementation.

## 1. Current Verdict

Do not restart completed Contacts 4.1, memory 4.2, World Hub 4.3, or service-account 4.4 work.

The best next work is:

1. preserve the completed non-active IndexedDB/Book Batch 2B foundation, active Book-only reference cutover, browser evidence, and unchanged legacy fallback;
2. keep Gallery/R2, dual write, legacy Book deletion, garbage collection, and every non-Book owner migration separately approved;
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
- `docs/architecture/PERSISTENCE_REPOSITORY_CONTRACT.md` is architecture-accepted; its exact non-active Batch 2B Repository schema/Adapter/Book fixture/staging slice and the separately approved Book-only cutover plus focused real-Chromium coverage completed on 2026-07-22;
- Book is the sole active Repository owner; neither contract approves dual write, R2, Gallery schema, legacy Book deletion, garbage collection, or any non-Book owner migration/activation.

Problem:

Most current stores write whole JSON snapshots to `localStorage` and mirror them to IndexedDB. Their normal startup still prefers valid `localStorage`, so the mirror does not remove the small synchronous quota or whole-store rewrite cost. Book is now the first active Repository exception; long Chat history, inline base64 media, Gallery binaries, and future archived-role continuity still need separately approved long-term storage contracts.

The root shell consumes structured layered-write and Book Repository failures as one product-level save-failed/read-only state with retry, confirmed reload-current-save, and complete-backup handoff. One page-level current-save writer keeps later same-container pages inspect-only/read-only across current durable carriers. The roadmap 4.9 release-local v3 backup path now adds required-section and binary integrity, Chat identity/avatar coverage, default-on complete Gallery material, durable metadata-plus-binary rollback checkpoints, and pre-mount crash recovery. Predictive capacity reporting, a cross-owner Repository root-generation switch, and remote transport remain separate architecture work.

Confirmed product boundary:

- ordinary browsers and installable PWAs remain complete first-class clients;
- one isolated browser/Web App storage container owns one current save;
- authoritative histories and accepted relationship evidence cannot be silently or irreversibly deleted; cold archival must remain reversible;
- committed content is durable whenever its owner publishes/confirms/applies it into revisitable or continuity-bearing history, including future social/forum/offline/narrative/performance/state records regardless of user/AI/system origin;
- complete AI prompts/raw responses, uncommitted drafts, and rebuildable projections are not retained by default; canonical content, authoritative state/facts, references, structured outcomes, and minimum provenance persist;
- IndexedDB-first structured persistence is the target direction;
- complete migration backup includes configured credentials and now presents a fixed danger warning before every local JSON export; cancellation creates no payload, download, or storage report;
- Gallery is the reusable local material library; generated image/media results require explicit user retention before durability, and `keep` never uploads or automatically enrolls material in backup;
- Camera is the visible owner of shared image-generation management, while provider protocols, public profiles/defaults/routing, device-local credentials, and bounded candidates remain separated behind the Image Generation Module;
- ordinary backup includes image-generation public configuration but excludes API keys, proxy tokens, and temporary candidates; older backups may omit the section without clearing current device-local secrets or review state;
- core data is always complete, while one default-on whole-Gallery choice includes all retained local binaries without per-item reselection; URL-backed items always preserve their original URL and minimum metadata rather than exact bytes;
- backup is for rollback/recovery rather than sync or local-space offload; manual backup is always available, automatic backup defaults off, and successful remote backup never releases local originals;
- keep multiple versions, but every local file and remote object must be a complete independently importable package; local export uses a user-editable product-name-plus-date default and the platform save/share flow;
- do not build an internal local backup library; local files return through explicit import, while a configured personal R2 must be listed and restored directly inside SchatPhone without a separate Cloudflare download;
- in-app deletion permanently deletes the selected connected-R2 backup and requires an unmistakable destructive confirmation; keep the row visible when the cloud deletion fails;
- never rotate or delete a cloud backup automatically; quota pressure may warn or block a new backup but every existing version remains until explicit user-confirmed deletion;
- a redacted/shareable export, native SQLite adapter, server sync, or encryption requires a separate contract.

Remaining planning before broader implementation:

- preserve the completed authoritative, audit, projection, binary, cache, diagnostic, and transient AI transport classification under the confirmed retention boundaries;
- preserve the implemented Repository stores/indexes, transactions, fixtures, staging, quota/persistence policy, multi-tab coordination, and active Book-only reference path;
- preserve the accepted backup-size/quota, creation-failure, standalone package, integrity, staged restore, binary completeness, local delivery, legacy import, and rollback acceptance;
- stop before dual write, legacy Book deletion, garbage collection, R2/Gallery schema work, or another owner migration/activation.

Do not start broad migration from this candidate. Its exact non-active Batch 2B foundation and separately approved Book-only cutover are complete, but every non-Book application import/cutover/activation remains unapproved.

## 4. Candidate B: Toolchain And CI Hardening

Current evidence:

- production audit: clean;
- full audit: clean after a normal-resolver compatible transitive lock refresh; no direct dependency, `package.json`, override/resolution, or major line changed;
- Vite 7.3.6 and its compatible root esbuild/Rollup refresh are complete;
- Vitest 4.1.10 now reuses root Vite 7.3.6, with the old nested Vite 5/esbuild chain removed;
- PR and main Pages workflow definitions now fail closed on full product E2E and separate production/full audits; the full suite contains the focused visual cases and is not run twice;
- Pages configure/upload/deploy requires the verified build job; remote Run #130 and the deployed `/schatphone/` base-path smoke are proven.
- Vercel serves the root app and commit `a1418ed` restricted relay Functions for per-user OpenAI-compatible URLs/keys/models while keeping Direct as default; production passed a no-secret upstream probe plus a real-provider 6-model/Chat-`OK` smoke from GitHub Pages.
- the third Git-connected Cloudflare Worker/static-assets root path shares the proxy core and is deployed at `https://schatphone.noarry.workers.dev`; commit `a1418ed` passed the root/static checks, a no-secret dynamic-target probe, and the same real-provider 6-model/Chat-`OK` GitHub Pages smoke.
- GitHub Pages has deployed-browser evidence for one direct user-configured provider: five models discovered, connection test `OK`, one real Chat reply, and message persistence after reload/reopen.

Safe sequence:

1. `DONE`: compatible Vite/transitive update;
2. `DONE`: isolated Vitest 4 migration plus full lint/unit/build/E2E validation;
3. `DONE 2026-07-22`: compatible transitive advisory refresh through normal npm resolution, with production/full audit at 0/0;
4. `WORKFLOW_IMPLEMENTED 2026-07-22`: gate PR and Pages build with audits plus one full E2E run, flaky rejection, skip ceiling, and failure diagnostics;
5. preserve the proven remote Pages direct-provider and Git-connected Vercel/Cloudflare root baselines, then deploy and smoke the restricted compatibility relay before confirming external required checks/environment policy, installed-PWA/relaunch, and named true-device evidence.

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

- Gallery People curation plus one separately promoted image-generation source caller;
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
