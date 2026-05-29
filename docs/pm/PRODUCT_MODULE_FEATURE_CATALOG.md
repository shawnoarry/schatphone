# SchatPhone Product Module Feature Catalog

Updated: 2026-05-29

Purpose: this is the PM-facing module dictionary for SchatPhone.

Use it to answer:

- what each module is called in product language;
- where users enter it;
- whether it is a normal Home app, a contextual surface, or an internal surface;
- which split feature-catalog document explains it in more detail.

This file is the entry page for the split catalog under:

- `docs/pm/product-module-feature-catalog/`

Use the split docs because the old single-file catalog had become too long, too historical, and too noisy for handoff.

## 1. Source Of Truth Reminder

Before reading module details, keep these references in mind:

- naming source: `docs/pm/MODULE_NAME_GLOSSARY.md`
- current PM status: `docs/pm/TODO_PM_STATUS_REPORT.md`
- live execution order: `docs/roadmap/TODO_ROADMAP.md`
- package ownership: `docs/pm/TASK_PACKAGE_INDEX.md`

If this catalog conflicts with those docs, treat those docs as the current truth.

## 2. Split Catalog Map

Read the matching category doc below:

1. `docs/pm/product-module-feature-catalog/SHELL_AND_SYSTEM.md`
   - Lock Screen, Home, Settings, Appearance, App Store, Network & API, Profile
2. `docs/pm/product-module-feature-catalog/ROLE_CHAT_AND_WORLD.md`
   - Chat, Chat Directory, Contacts, WorldBook, Book, World Hub, future Cheats lane
3. `docs/pm/product-module-feature-catalog/MAP_CALENDAR_AND_REMINDERS.md`
   - Map, Calendar, Reminders, Phone, location/date/callback handoff
4. `docs/pm/product-module-feature-catalog/COMMERCE_ASSETS_AND_SUPPORT.md`
   - Photos, Shopping, Logistics, Food Delivery, Wallet, Stock, Assets, Files

## 3. Quick Module Index

For exact Chinese labels, use `docs/pm/MODULE_NAME_GLOSSARY.md`.

| English | Route | Visibility | Main detail doc |
| --- | --- | --- | --- |
| Lock Screen | `/lock` | shell default surface | `SHELL_AND_SYSTEM.md` |
| Home | `/home` | shell default surface | `SHELL_AND_SYSTEM.md` |
| Settings | `/settings` | Home app | `SHELL_AND_SYSTEM.md` |
| Appearance | `/appearance` | Home app | `SHELL_AND_SYSTEM.md` |
| Network & API | `/network` | Home app | `SHELL_AND_SYSTEM.md` |
| App Store | `/app-store` | Home app | `SHELL_AND_SYSTEM.md` |
| Profile | `/profile` | Settings entry | `SHELL_AND_SYSTEM.md` |
| Chat | `/chat`, `/chat/:id` | Home app | `ROLE_CHAT_AND_WORLD.md` |
| Chat Directory | `/chat-contacts` | Chat/context entry | `ROLE_CHAT_AND_WORLD.md` |
| Contacts | `/contacts` | Home app | `ROLE_CHAT_AND_WORLD.md` |
| WorldBook | `/worldbook` | Settings/context entry | `ROLE_CHAT_AND_WORLD.md` |
| Book | `/book` | planned Home/App Store app | `ROLE_CHAT_AND_WORLD.md` |
| World Hub | `/control-center` | optional hidden app | `ROLE_CHAT_AND_WORLD.md` |
| Cheats | not frozen yet | future hidden surface | `ROLE_CHAT_AND_WORLD.md` |
| Map | `/map` | Home app | `MAP_CALENDAR_AND_REMINDERS.md` |
| Calendar | `/calendar` | Home app | `MAP_CALENDAR_AND_REMINDERS.md` |
| Reminders | `/reminders` | Home app | `MAP_CALENDAR_AND_REMINDERS.md` |
| Phone | `/phone` | Home app | `MAP_CALENDAR_AND_REMINDERS.md` |
| Photos | `/gallery` | Home app | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Shopping | `/shopping` | Home app | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Logistics | inside Shopping / Chat service account | contextual surface | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Food Delivery | `/food-delivery` | Home app | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Wallet | `/wallet` | Home app | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Stock | `/stock` | Home app | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Assets | `/assets` | Home app | `COMMERCE_ASSETS_AND_SUPPORT.md` |
| Files | `/files` | hidden/internal | `COMMERCE_ASSETS_AND_SUPPORT.md` |

## 4. Product Boundary Reminder

Keep these distinctions clear while reading:

1. `Contacts` is not `Chat Directory`.
2. `Calendar` is not `Reminders`.
3. `World Hub` is not `Cheats`.
4. `Files` is not a normal public file-manager app.
5. `Photos` is currently an asset center first, not the mainline relationship-memory intake surface.
6. `Book` is the planned reusable text library; it is not WorldBook activation, not Files, and not a novel/fanfic reader.

## 5. Change Log

1. 2026-05-18: long single-file module catalog continued accumulating current and historical notes.
2. 2026-05-19: rewritten as a compact entry page and split into category docs for better PM, design, and QA handoff.
3. 2026-05-29: added planned `Book` text-library module for WorldBook source documents and reusable knowledge/reference text.
