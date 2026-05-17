# SchatPhone Module Name Glossary / 模块中英对照表

Updated: 2026-05-17

Audience: product managers, designers, engineers, QA, non-technical collaborators, users who need a plain-language map, and future AI assistants.

This document is the current naming source for SchatPhone modules. Use it when the team needs to confirm what an entry is called, whether it is visible on Home, and which code route or internal id maps to it.

## 1. Naming Rules

- Product-facing Chinese names should prioritize immersive phone language.
- Product-facing English names should match the app-like label users see or should see.
- Code names and routes can remain technical for compatibility, but PM docs should preserve product meaning.
- Hidden/internal services can be important without becoming visible Home apps.
- If a module has a historical or technical name, record it as a compatibility note instead of using it as the primary product name.

## 2. Main Shell And App Glossary

| Chinese name | English name | Current route | App id / code name | User visibility | Product note |
| --- | --- | --- | --- | --- | --- |
| 锁屏 | Lock Screen | `/lock` | shell route | Default shell | Phone entry, lock state, notification return path. |
| 主屏 / 桌面 | Home | `/home` | Home shell | Main shell | App grid, widgets, folders, immersive phone entry point. |
| 设置 | Settings | `/settings` | `app_settings` | Home app | System settings, backup, restore, push, automation, diagnostics. |
| 外观 | Themes / Appearance | `/appearance` | `app_themes` | Home app | Theme, wallpaper, icon, font, widget appearance controls. |
| 组件 | Widgets | `/widgets` | `app_widgets` | Home app / Appearance entry | Widget management and Home widget editing support. |
| 网络与 API / 网络 | Network & API | `/network` | `app_network` | Home app | API provider setup, model selection, diagnostics. |
| 聊天 | Chat | `/chat`, `/chat/:id` | `app_chat` | Home app | AI relationship chat, service accounts, rich messages. |
| 会话通讯录 | Chat Directory | `/chat-contacts` | route only | Chat/settings context | Role binding, service-account binding, chat templates. |
| Chat 管理项 | Chat Tools | `/chat-feature/:feature` | route only | Chat context | Batch templates, chat identity, experimental chat tools. |
| 联系人 / 通讯录 | Contacts | `/contacts` | `app_contacts` | Home app | Global role/contact archive and relationship snapshots. |
| 世界书 | WorldBook | `/worldbook` | route only | Settings/context entry | Global worldview and reusable knowledge points. |
| 个人资料 | Profile | `/profile` | route only | Settings entry | User identity/profile and AI context preview. |
| 相册 | Photos | `/gallery` | `app_gallery` | Home app | Shared media center; code may still use `Gallery`. |
| 电话 | Phone | `/phone` | `app_phone` | Home app | Local role call logs, missed/completed call cues. |
| 地图 | Map | `/map` | `app_map` | Home app | Map-first trip, location, exploration, route context surface. |
| 日历 | Calendar | `/calendar` | `app_calendar` | Home app | Target: real schedule/date app. Current code still also contains cue confirmation. |
| 提醒事项 | Reminders | `/reminders` | route only | Calendar/Shopping/context entry | First seam for callbacks, follow-ups, logistics reminders, stock review cues, and world/task cues. Not a Home app yet. |
| 钱包 | Wallet | `/wallet` | `app_wallet` | Home app | Virtual ledger, transfers, order expense records. |
| 股票 / 股市 | Stock | `/stock` | `app_stock` | Home app | Simulated market, watchlist, holdings, market review cues. |
| 购物 | Shopping | `/shopping` | `app_shopping` | Home app / folder-capable | Product browsing, store concepts, orders, logistics peer entry. |
| 物流 | Logistics | inside Shopping | shopping sub-entry | Shopping peer entry / Chat service account | Delivery, courier, tracking, pickup, after-sales follow-up. |
| 外卖 | Food Delivery | `/food-delivery` | `app_food_delivery` | Home app / folder-capable | Restaurant categories, menus, cart/order flow, delivery events. |
| 资产 | Assets | `/assets` | `app_assets` | Home app | Real estate, investment, vehicles, special assets. |
| 世界中枢 | World Hub | `/control-center` | `app_control_center` / `control_center` | Optional hidden app | Optional runtime review/control surface; future GM or cheat-like app. |
| 文件 | Files | `/files` | `app_files` | Hidden/internal | Internal storage/index coordination; should not be a normal Home app. |
| 更多 | More | `/more` | `app_more` | Home app | Secondary entries, labs/toggles, optional app visibility. |

## 3. Home Widget Glossary

| Chinese name | English name | Code variant | Product note |
| --- | --- | --- | --- |
| 天气 | Weather | `weather` | Phone-like ambient information widget. |
| 日历 | Calendar | `calendar` | Should eventually show schedule/date highlights, not raw cue queues. |
| 音乐 | Music | `music` | Decorative/immersive phone-life widget. |
| 系统 | System | `system` | System status widget. |
| 快捷爱心 | Quick Heart | `heart` | Lightweight emotional shortcut widget. |
| 快捷唱片 | Quick Disc | `disc` | Lightweight music/aesthetic shortcut widget. |

## 4. Shopping Folder And Service Names

Shopping is a normal product module, but it can use a Home folder-style visual pattern to feel like multiple shopping apps.

| Chinese name | English name | Type | Product note |
| --- | --- | --- | --- |
| 综合购物 | Mall | Shopping category | General shopping marketplace. |
| 服饰 | Fashion | Shopping category | Clothing and styling products. |
| 美妆 | Beauty | Shopping category | Cosmetics and beauty products. |
| 数码 | Digital | Shopping category | Electronics and devices. |
| 生鲜 | Grocery | Shopping category | Fresh food and groceries. |
| 家居 | Home | Shopping category | Home goods. |
| 奢侈品 | Luxury | Shopping category | Luxury goods. |
| 礼物 | Gifts | Shopping category | Gift purchase flow and relationship fact source. |
| 物流 | Logistics | Shopping peer entry | Package and delivery follow-up. |
| Schat Mall | Schat Mall | Store/service preset | General shopping service. |
| Style Cloud | Style Cloud | Store/service preset | Fashion shopping service. |
| Nova Digital | Nova Digital | Store/service preset | Digital product service. |
| Daily Fresh | Daily Fresh | Store/service preset | Grocery shopping service. |
| 同城急送 | Local Express | Logistics service account | Local urgent delivery. |
| 普通快递 | Standard Courier | Logistics service account | Normal parcel delivery. |
| 国际物流 | International Logistics | Logistics service account | Cross-border shipment tracking. |

## 5. Food Delivery Folder And Service Names

Food Delivery can also use folder-style Home presentation, but its product role is different from Shopping.

| Chinese name | English name | Type | Product note |
| --- | --- | --- | --- |
| 餐厅 | Restaurants | Food category | Restaurant directory. |
| 附近 | Nearby | Food category | Nearby delivery options. |
| 快餐 | Fast Food | Food category | Fast meals. |
| 咖啡茶饮 | Cafe & Drinks | Food category | Drinks and cafe orders. |
| 甜品 | Dessert | Food category | Dessert orders. |
| 生鲜速达 | Grocery Delivery | Food category | Rapid grocery delivery. |
| 外卖通知 | Food Delivery Dispatch | Service account | Unified food-delivery status push identity in Chat. |

## 6. Assets Category Names

| Chinese name | English name | Type | Product note |
| --- | --- | --- | --- |
| 不动产 | Real Estate | Asset category | Homes, rooms, properties, bases, world locations with ownership meaning. |
| 投资 | Investment | Asset category | Investments that may later connect to Stock or simulated economy. |
| 交通工具 | Vehicles | Asset category | Cars, bikes, rides, ships, mounts, or world-specific travel assets. |
| 特殊资产 | Special Assets | Asset category | Rare items, magical objects, sci-fi devices, collectibles, licenses. |

## 7. Internal Runtime And Coordination Names

| Chinese name | English name | Current code/docs | User visibility | Product note |
| --- | --- | --- | --- | --- |
| 事件运行时 | Event Runtime | `simulationStore`, event engine docs | Internal / World Hub visible | Shared condition/random/scheduled event infrastructure. |
| 关系运行时 | Relationship Runtime | `relationshipRuntimeStore` | Internal / Contacts / Chat / World Hub visible | Shared relationship facts, metrics, stages, growth traits. |
| 世界观事件变体 | World Context Event Variants | architecture docs | Internal | Makes event packs adapt to sci-fi, apocalypse, campus, fantasy, etc. |
| 前台会话触发器 | Foreground Session Tick | simulation lifecycle code | Settings/Network visible | Optional event ticking while the app is open and unlocked. |
| 真实推送 | Real Push | push settings/calendar scheduling | Settings/Calendar visible | Browser/system notification delivery baseline. |
| 素材引用 | Asset References | Gallery/media contracts | Internal / module-facing | Modules store structured media references instead of duplicating local files. |
| 文件索引 | File Index | `Files` internal role | Hidden/internal | Metadata/index bridge, not a normal immersive app. |

## 8. Naming Decisions To Remember

- Use `世界中枢 / World Hub` for the optional runtime-control app. `Control Center`, `control_center`, `app_control_center`, and `/control-center` remain technical compatibility terms.
- Use `相册 / Photos` for the user-facing gallery app. `Gallery` can remain a code term.
- Use `外卖 / Food Delivery`, not only `Food`, when the distinction matters.
- Use `提醒事项 / Reminders` for cross-module cue follow-up. Do not keep calling all cue queues `Calendar`.
- Use `文件 / Files` only when discussing the hidden/internal storage component. Do not present it as a normal user-facing file manager.
- Use `购物 / Shopping` and `物流 / Logistics` separately when talking about product responsibilities.
