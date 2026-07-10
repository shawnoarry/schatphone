# SchatPhone Product Manager Brief

Updated: 2026-07-10

Purpose: one-page product brief for current direction, delivered baseline, and next decisions.

## 1. Product

SchatPhone is a local-first immersive virtual phone where AI chat, roles, world context, relationship continuity, media, schedules, locations, commerce, finance, and optional runtime systems behave as one product.

It is currently an integrated V1: substantial enough for continued product trials, but not yet a production-hardened or visually final release.

## 2. Frozen Boundaries

1. Contacts owns the global role archive; Chat Directory owns Chat binding.
2. Chat owns messages and applied channel state; relationship runtime owns current relationship truth and memory.
3. Book owns long text; WorldBook owns activation; World Pack owns reviewed capability bundles.
4. Calendar owns confirmed schedules; Reminders owns raw cues; Map owns route/location truth.
5. source commerce apps own orders; Wallet owns downstream ledger records; Chat stores notification references only.
6. World Hub is optional review; Cheats is not a finished product.
7. Files is internal, not a normal user-facing file manager.

## 3. Delivered Baseline

- stable Lock/Home/app shell, notifications, app-entry management, widgets, appearance, backup/restore, storage diagnostics, and URL-first AI setup;
- mature Chat core with rich messages, groups V1, service subscriptions, source-linked notifications, Chat appearance, and reviewed generated social proposals;
- Contacts V2 baseline with role types, WorldBook profile values, relationship classification/snapshot, memory review/source audit, and guarded destructive flows;
- Book/WorldBook integrated source activation plus World Pack V1 app/service/currency capability flow;
- Map/Calendar/Reminders/Phone ownership split and cross-module continuity;
- Shopping/Food Delivery/Wallet/Gallery integrated support loops;
- foreground event runtime and narrow World Hub review;
- green lint, 1050 unit tests, production build, and 18 desktop/mobile E2E scenarios.

## 4. Completion Judgment

| State | Areas |
| --- | --- |
| Stable core | shell, Chat, Contacts/relationship baseline, persistence/backup, Gallery |
| Integrated V1 | Book/WorldBook, World Pack/App Store, Map/Calendar/Reminders, commerce/service notifications, Wallet |
| Partial/guarded | event runtime, World Hub, full visual system, group orchestration |
| Usable but shallow | Assets, Stock, several support-module loops |
| Decision/deferred | Cheats, closed-page autonomy, high-impact automatic relationship events, K-pop carrier migration |

The roadmap has four completed delivery lanes, one active maintenance lane, and one partially completed World Pack lane. This is more useful than a single percentage because final visual, security, and production readiness lag behind functional breadth.

## 5. Main Problems

1. backup exports the full settings snapshot, including the configured AI API key;
2. development/tooling dependencies have active advisories even though production dependencies audit clean;
3. the push relay is development-grade, unauthenticated, and not deployed with the static client;
4. several route views are 3k-4.8k lines and `systemStore` is a 4.2k-line cross-product hotspot;
5. CI omits Playwright and dependency audit; real-device QA is still missing;
6. visual finish and secondary-module depth are uneven;
7. the latest K-pop system plan is still a planning draft, while built-in Book assets continue to use older source drafts.

## 6. Next Order

1. security/toolchain and backup credential policy;
2. CI/release gating plus one named architecture hotspot slice;
3. true-device World Pack loop validation and focused fixes;
4. approve or reject the K-pop carrier split, then promote one concrete migration slice;
5. only then broaden runtime, app archetypes, or secondary modules.

## 7. Read Next

- PM status detail: `docs/pm/TODO_PM_STATUS_REPORT.md`
- live board: `docs/roadmap/TODO_ROADMAP.md`
- project detail: `docs/overview/PROJECT_MASTER_GUIDE.md`
- module catalog: `docs/pm/PRODUCT_MODULE_FEATURE_CATALOG.md`
