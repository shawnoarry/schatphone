# SchatPhone Module Name Glossary

Updated: 2026-05-19

This file is the naming source for SchatPhone modules and runtime surfaces.

Use it when the team needs to confirm:

- the product-facing Chinese and English names;
- whether something is a normal Home app, a contextual surface, or a hidden/internal tool;
- which route and technical id map to that product name.

## 1. Naming Rules

- Product-facing Chinese names should use immersive phone language.
- Product-facing English names should match the app-like label users see or should see.
- Routes and internal ids may remain stable for compatibility even when product copy evolves.
- Hidden/internal services can be important without becoming normal Home apps.

## 2. Main Module Glossary

| Chinese | English | Route | App id / code name | Visibility | Note |
| --- | --- | --- | --- | --- | --- |
| 锁屏 | Lock Screen | `/lock` | shell route | default shell | lock state and notification return path |
| 主屏 / 桌面 | Home | `/home` | Home shell | main shell | app grid, widgets, folders |
| 设置 | Settings | `/settings` | `app_settings` | Home app | settings, backup, restore, diagnostics |
| 外观 | Appearance | `/appearance` | `app_themes` | Home app | theme, wallpaper, icon, and visual controls |
| 组件 | Widgets | `/widgets` | `app_widgets` | Home app / Appearance entry | widget library and management |
| 网络 / API | Network & API | `/network` | `app_network` | Home app | provider setup and diagnostics |
| 聊天 | Chat | `/chat`, `/chat/:id` | `app_chat` | Home app | AI chat and rich-message lane |
| 会话通讯录 | Chat Directory | `/chat-contacts` | route only | Chat/context entry | Chat-side binding and service-account management |
| 通讯录 | Contacts | `/contacts` | `app_contacts` | Home app | global role archive and role-centered management |
| 世界书 | WorldBook | `/worldbook` | route only | Settings/context entry | worldview and reusable knowledge points |
| 个人资料 | Profile | `/profile` | route only | Settings entry | user profile and AI context preview |
| 相册 | Photos | `/gallery` | `app_gallery` | Home app | shared media center |
| 电话 | Phone | `/phone` | `app_phone` | Home app | calls and call history |
| 地图 | Map | `/map` | `app_map` | Home app | route, trip, and location context |
| 日历 | Calendar | `/calendar` | `app_calendar` | Home app | confirmed schedule and date lane |
| 提醒事项 | Reminders | `/reminders` | `app_reminders` | Home app | cross-module cue surface |
| 钱包 | Wallet | `/wallet` | `app_wallet` | Home app | ledger, transfer, and expense records |
| 股票 | Stock | `/stock` | `app_stock` | Home app | market and holdings lane |
| 购物 | Shopping | `/shopping` | `app_shopping` | Home app | product, order, and store lane |
| 物流 | Logistics | inside Shopping | shopping contextual lane | Shopping peer entry / Chat service account | tracking-facing delivery lane |
| 外卖 | Food Delivery | `/food-delivery` | `app_food_delivery` | Home app | restaurant, menu, cart, and delivery lane |
| 资产 | Assets | `/assets` | `app_assets` | Home app | long-term owned things |
| 世界中枢 | World Hub | `/control-center` | `app_control_center` / `control_center` | optional hidden app | runtime review and narrow control |
| 金手指 | Cheats | not frozen yet | future hidden surface | hidden placeholder | future stronger override lane |
| 文件 | Files | `/files` | `app_files` | hidden/internal | internal storage/index role, not a normal public file manager |
| 更多 | More | `/more` | `app_more` | Home app | secondary entries, toggles, and labs |

## 3. Runtime And Internal Names

| Chinese | English | Technical name | Note |
| --- | --- | --- | --- |
| 事件运行时 | Event Runtime | `simulationStore` and simulation engine | shared event logs, cooldowns, caps, and trigger policy |
| 关系运行时 | Relationship Runtime | `relationshipRuntimeStore` | relationship truth layer |
| 前台滴答 | Foreground Tick | foreground session tick lifecycle | optional while-app-is-open event ticking |
| 真推送 | Real Push | browser/system push integration | scheduled or immediate notification delivery |
| 素材引用 | Asset References | Gallery/media contracts | structured media references across modules |

## 4. Naming Decisions To Remember

- Use `通讯录 / Contacts` for the main role archive and destructive role management.
- Use `会话通讯录 / Chat Directory` for the Chat-side contact list only.
- Use `世界中枢 / World Hub` as the product-facing name for the optional runtime-control app.
- Keep `Control Center`, `control_center`, and `/control-center` as technical compatibility names only.
- Use `相册 / Photos` as the user-facing gallery label even if some code still says `Gallery`.
- Use `提醒事项 / Reminders` for cross-module cues rather than calling every cue queue `Calendar`.
- Use `文件 / Files` only when discussing the hidden/internal storage component.
