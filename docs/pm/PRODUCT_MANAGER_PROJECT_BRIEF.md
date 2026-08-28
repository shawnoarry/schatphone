# SchatPhone Product Manager Brief

Updated: 2026-08-28

Integrated baseline: `3126c1c`

## 1. Product

SchatPhone is a local-first immersive virtual phone and AI life-simulation product. The experience combines a believable phone shell, persistent roles and relationships, world context, communication, schedule/location continuity, media, commerce/finance, and optional runtime review.

## 2. Current Stage

The project is an integrated V1 in product-preview and release-hardening work. The core architecture and many user loops are real; the remaining release claim depends more on continuity closure, PWA/true-device proof, and focused product depth than on adding another broad feature family.

## 3. What Is Established

- Contacts, Chat Directory, Chat, and Relationship Runtime have explicit ownership boundaries.
- Book, WorldBook, World Pack, source Apps, Wallet, Calendar, Reminders, and Map retain separate canonical truth.
- release-local backup/recovery, same-container writer protection, and a Book Repository reference cutover are integrated;
- Chat, commerce, schedule, Map, Music, Camera/image generation, TTS preview, Event Runtime, World Hub, and the S1 App Shell portfolio have named integrated slices;
- CI and Pages workflows run lint, unit, build, both audit scopes, and full Playwright.

## 4. Current Priority

Follow the roadmap exactly:

1. execute `CMG-10` migration/recovery proof after integrated `CMG-08` and `CMG-09`;
2. preserve the bounded continuity-reading contract during that recovery work;
3. installed-PWA/relaunch, backup round trip, external protection, and true-device proof;
4. World Pack device validation where it overlaps that release matrix.

## 5. Important Holds

Do not infer authorization for production push, personal R2 implementation, broad non-Book migration, World Setting W2, hotspot rewrites, full TypeScript migration, broad secondary-module expansion, closed-page autonomy, Cheats, or EVE-5.

## 6. How To Read Progress

`TODO_ROADMAP.md` owns order. Package handoffs preserve detailed feature and work-item progress. This brief is only a whole-project summary and must never collapse a scoped status such as `Career S1 DONE` into an unscoped claim that Career is finished.

## 7. Read Next

1. `docs/pm/TODO_PM_STATUS_REPORT.md`
2. `docs/roadmap/TODO_ROADMAP.md`
3. `docs/pm/TASK_PACKAGE_INDEX.md`
4. owning package handoff
5. `docs/process/DOCUMENT_GOVERNANCE.md`
