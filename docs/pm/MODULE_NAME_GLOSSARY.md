# SchatPhone Module Name Glossary

Updated: 2026-08-26

Integrated baseline: `f06a575`

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
| 世界书 | WorldBook | `/worldbook` | route only | Settings/context entry | worldview, encyclopedia entries, world rules, profile templates, source activation, and World Pack governance |
| 文本库 | Book | `/book` | `app_book` | recoverable Home/App Store app | reusable text library for worldview documents, encyclopedia material, and world rules |
| 个人资料 | Profile | `/profile` | route only | Settings entry | user profile and AI context preview |
| 相册 | Photos | `/gallery` | `app_gallery` | Home app | shared media center |
| 电话 | Phone | `/phone` | `app_phone` | Home app | calls and call history |
| 地图 | Map | `/map` | `app_map` | Home app | route, trip, and location context |
| 日历 | Calendar | `/calendar` | `app_calendar` | Home app | confirmed schedule and date lane |
| 行程 | Agenda Journey | `/agenda-journey` | `app_agenda_journey` | Home app | today/near-term travel/activity execution; distinct from Map Journey |
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
| 应用商城 | App Store | `/app-store` | `app_store` | Home app | app-entry visibility, summaries, and Home placement |
| 通知中心 | Notification Center | Lock/Home shell surface | native system surface | shell/context surface | unlocked notification review; not an installed App owner |
| 相机 | Camera | `/camera` | `app_camera` | Home app | image-generation capture, tasks, provider/default/routing settings, and explicit Gallery keep |
| 音乐 | Music | `/music` | `app_music` | Home app | library, provider search, playback, queue/radio, and bounded Chat/Map callers |
| 天气 | Weather | `/weather` | `app_weather` | Home app | world/location-aware weather, forecast, and widget source |
| Daon 邮件 | Daon Mail | `/mail` | `app_daon_mail` | installed S1 App | local mail preview with explicit AI Receive exception; not a production mail service |
| 折光浏览器 | Prism Browser | `/browser` | `app_browser` | installed S1 App | Help/current-world/local search with honest Web-unavailable state |
| 涟漪 | Ripple | `/community` | `app_community` | installed S1 App | local community/feed preview with fail-closed source semantics |
| 温谈健康 | Ondam Care | `/healthcare` | `app_healthcare` | installed S1 App | local healthcare discovery and appointment-intent drafts |
| 住处 | Jari | `/housing` | `app_jari_housing` | installed S1 App | local housing discovery and viewing drafts |
| 工作台 | Work Hub | `/workplace` | `app_workplace` | installed S1 App | local workplace/team/schedule preview and bounded Calendar handoff |
| 星集 | Aster | `/fandom` | `app_fandom` | installed S1 App | local fandom/artist preview linked to Community fixtures |
| 入场 | GATE | `/tickets` | `app_tickets` | installed S1 App | local event/ticket discovery and intent drafts |
| 漫泊 | ROAM | `/travel` | `app_travel` | installed S1 App | local lodging/travel discovery and trip-intent drafts |
| 联程 | VIA | `/intercity` | `app_intercity` | installed S1 App | local rail/flight/coach/ferry comparison and intent drafts |
| 谱权 | CREDO | `/creator-rights` | `app_creator_rights` | installed S1 App | local works, rights-share, statement, and declaration previews |
| 递送 | POSTA | `/parcel` | `app_parcel` | installed S1 App | local parcel tracking and send drafts |
| 机会 | NEXT | `/career` | `app_career` | installed S1 App | local jobs/auditions/invitations and application drafts |
| 更多 | More | `/more` | legacy route | compatibility redirect | retired overflow surface |

## 3. Runtime And Internal Names

| Chinese | English | Technical name | Note |
| --- | --- | --- | --- |
| 事件运行时 | Event Runtime | `simulationStore` and simulation engine | shared event logs, cooldowns, caps, and trigger policy |
| 关系运行时 | Relationship Runtime | `relationshipRuntimeStore` | relationship truth layer |
| 时间编排模块 | Schedule Orchestrator | `store:schedule-orchestrator` | hidden owner that links confirmed Calendar commitments to Agenda Journey materialization and deadline reconciliation; never a Home app |
| 地图行程 | Map Journey | Map-owned journey runtime | known-destination travel, transport, checkpoints, and arrival/cancellation truth |
| 活动计时 | Activity Session | `store:activity-session` | Agenda Journey-owned timestamp-based duration and explicit activity checkpoints; not a required 25/5 Pomodoro cycle |
| 叙事时间线 | Narrative Timeline | future projection; route and owner not approved | bounded source-linked summaries for a later Story/Diary/Journal surface and AI context |
| 文本转语音 | Text To Speech | `ttsStore`; `/chat-settings/voice` | shared runtime speech preview and provider-settings surface; no durable Chat voice-message owner yet |
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
- Use `日历 / Calendar` for the visible long-range date app. `日程 / Agenda` is one Calendar view, not another long-range app.
- Use `行程 / Agenda Journey` for the current short-range execution app and always use `地图行程 / Map Journey` in architecture, persistence, event, and audit text where the Map meaning could be ambiguous.
- Use `时间编排模块 / Schedule Orchestrator` for the hidden cross-module materialization logic; do not call that internal Module `Calendar` or expose it as a Home app.
- Keep Story/Diary/Journal product naming undecided; use `叙事时间线 / Narrative Timeline` only for the future source-linked projection concept.
- Use `文件 / Files` only when discussing the hidden/internal storage component.
- Use `文本库 / Book` for the reusable text library. It is not the novel/fanfic reader, not Files, and not WorldBook activation itself.
