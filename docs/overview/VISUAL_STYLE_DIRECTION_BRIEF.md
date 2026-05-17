# SchatPhone Visual Style Direction Brief / SchatPhone 视觉风格方向简报

Updated / 更新时间: 2026-05-02

## 1. Purpose / 用途

This document records the intended visual direction for the full appearance rebuild.  
It answers "what should the rebuilt UI feel like?" while `docs/overview/APPEARANCE_REBUILD_SCOPE.md` answers "what needs to be rebuilt?"

本文记录整体外观重建的视觉方向。  
它回答“重建后应该像什么、是什么气质”，而 `docs/overview/APPEARANCE_REBUILD_SCOPE.md` 回答“哪些外观需要重建”。

Authority note / 职责说明:

- This file is a direction brief, not a live task board.  
  本文是视觉方向简报，不是动态任务看板。
- Active execution tasks and status still belong only in `docs/roadmap/TODO_ROADMAP.md`.  
  具体执行任务与状态仍只放入 `docs/roadmap/TODO_ROADMAP.md`。
- If a future visual decision conflicts with this file, update this brief in the same batch so future contributors do not inherit stale taste notes.  
  如果后续视觉决策与本文冲突，应在同批次更新本文，避免后续接手者继承过时审美记录。

Related docs / 相关文档:

- `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
- `docs/templates/VISUAL_REDESIGN_BRIEF_TEMPLATE.md`
- `docs/product-decisions/NOTIFICATION_AND_APP_ICON_REQUIREMENTS.md`

---

## 2. Global Direction / 全局方向

Core direction / 核心方向:

1. The whole product should feel closer to an iOS-like phone system.  
   整体更接近 iOS 系统质感。
2. It may borrow layout solutions from other systems or apps when a feature needs clearer presentation.  
   当某些功能展示需要更清楚时，可以借鉴其他系统或 App 的布局方案。
3. The highest-level keyword is real-phone immersion.  
   最高优先关键词是真实手机沉浸感。

Interpretation / 解释:

- "iOS-like" means believable mobile OS behavior, restrained system chrome, polished transitions, readable hierarchy, and strong default ergonomics.  
  “像 iOS”指可信的手机系统行为、克制的系统外壳、顺滑转场、清晰层级和稳定易用的默认交互。
- It does not mean copying every iOS screen literally.  
  它不等于逐屏照抄 iOS。
- Feature-heavy modules may use other references when they solve the product problem better.  
  功能较重的模块可以在更适合时借鉴其他参考。

Must avoid / 必须避免:

1. Admin dashboard feeling.  
   后台管理感。
2. Generic webpage feeling.  
   普通网页感。
3. Flat settings piles without mobile-system hierarchy.  
   没有手机系统层级的平铺设置堆。
4. Visual styles that break the illusion of being inside one phone.  
   破坏“正在一台手机里”的视觉跳脱感。

---

## 3. Module Direction Table / 模块方向表

| Module / 模块 | Primary reference / 主要参考 | Secondary references / 次级参考 | Target feeling / 目标气质 | Notes / 备注 |
| --- | --- | --- | --- | --- |
| Global Shell / 全局壳层 | iOS system | Other mobile OS patterns only when useful | Real phone, coherent, immersive | Lock, Home, Dock, notifications, status bar, and wallpaper readability should feel like one OS. |
| Chat / 聊天 | KakaoTalk | WhatsApp, iMessage | Immersive chat app, social, warm, believable | Overall direction leans KakaoTalk, but detail-level controls may borrow from WhatsApp/iMessage where useful. |
| Map / 地图 | Google Maps | Ride-hailing app trip flows | Functional map + trip system | Should combine map browsing, trip setup, route state, arrival reminders, and ride-hailing-like journey feedback. |
| Gallery / 相册 | iOS Photos | iOS Memories / Collections | Real photo album, curated memories | Current "asset center" should visually present as Photos/Album first, with categories such as wallpaper, memories, people, journeys. |
| Appearance / 外观 | iOS Settings + customization surfaces | iOS wallpaper / Focus-like organization | System customization, not developer console | Should separate daily appearance controls from advanced widget/custom CSS creation. |
| Settings / 设置 | iOS Settings | App-specific settings pages | Calm, native system settings | Should become a phone-native settings surface, while keeping backup/push/automation discoverable. |
| Contacts / 联系人 | iOS Contacts | Social profile editors | Character/social archive | Should feel less like a configuration form and more like a living profile book. |
| Calendar / 日历 | iOS Calendar | Reminder and trip status patterns | Personal schedule, system reminder | Needs to support Map-derived reminders without looking like a backend log. |
| WorldBook / 世界书 | Native notes/reference apps | Knowledge-base editors | Readable world memory | Should feel like an in-phone memory/reference surface, not a utility admin table. |
| Network / 网络 | iOS Settings subpage | Developer connection panels only when necessary | Technical but restrained | It can stay more utilitarian, but should inherit the global system skin. |
| Phone / Wallet / Stock / Files / More | To be defined | Inherit global shell first | Pending | Product role is not mature enough for bespoke style direction. |

Shell implementation note / 壳层实施备注:

- 2026-05-17: Home now includes a `-1` Today View baseline to the left of page 1.
- The surface should be treated as native system chrome, not as a normal editable Home page.
- Greeting, Smart Panel, and hidden-system placeholders such as World Hub and Cheats belong there rather than occupying ordinary app-icon pages.
- Locked hidden-system entries should feel like believable inactive phone affordances: visible enough to create anticipation, but dim, non-customizable, and not mistaken for installed apps.

---

## 4. Chat Direction / Chat 模块方向

Primary reference / 主要参考:

- KakaoTalk

Secondary references / 次级参考:

- WhatsApp
- iMessage

Target / 目标:

Chat should feel like a real messaging app inside the virtual phone, not like a web page that happens to contain messages.  
Chat 应该像虚拟手机里真实存在的聊天 App，而不是“一个网页里放了消息列表”。

Direction notes / 方向备注:

1. Overall mood can lean KakaoTalk: familiar, social, light, and conversation-first.  
   整体气质可偏 KakaoTalk：熟悉、社交、轻盈、以对话为中心。
2. WhatsApp may be useful for thread-level utility, media actions, and clear conversation affordances.  
   WhatsApp 可用于借鉴会话级工具、媒体操作和清晰的聊天可操作性。
3. iMessage may be useful for message polish, bubble behavior, attachment feeling, and phone-native credibility.  
   iMessage 可用于借鉴消息精致度、气泡行为、附件质感和手机原生可信度。
4. Some detail functions should be defined during the Chat-specific visual pass instead of being over-specified here.  
   部分细节功能应在 Chat 专项外观细化时再定义，不在本文提前锁死。
5. The key word remains immersion.  
   关键词依然是沉浸式。

Must preserve / 必须保留:

- Manual `Trigger Reply` availability
- Thread preferences
- Message actions
- Rich-send panel
- Structured assistant blocks
- Notification and lock-screen feedback path

---

## 5. Map Direction / 地图模块方向

Primary reference / 主要参考:

- Google Maps

Functional direction / 功能方向:

- Combine map exploration with a ride-hailing-like trip system.  
  结合地图探索与打车/行程系统。

Target / 目标:

Map should feel like a practical map app with route progress, trip state, current location, destination choice, and arrival feedback.  
地图应像一个可用的地图 App，包含路线进度、行程状态、当前位置、目的地选择与到达反馈。

Direction notes / 方向备注:

1. Google Maps is the strongest reference for map readability, route hierarchy, place cards, and location controls.  
   Google Maps 是地图可读性、路线层级、地点卡片、定位控件的主要参考。
2. Ride-hailing references should inform trip lifecycle: pickup/start, en route, arrival, history, and reminders.  
   打车类参考用于行程生命周期：出发、进行中、到达、历史与提醒。
3. SchatPhone should still keep its simulation-first rule: the map can look richer, but core progress remains system-computed.  
   SchatPhone 仍保留模拟优先规则：地图可以更丰富，但核心进度仍由系统计算。

Must preserve / 必须保留:

- Simulation-first behavior
- Optional AI visual enhancement
- Calendar/reminder ownership split
- Trip lifecycle and history
- WorldBook relevance hooks

Implementation note / 实施备注:

- 2026-05-17: Map has landed a structural map-first baseline before the full visual rebuild.
- The first screen now prioritizes a map canvas, destination search, route summary, and bottom navigation.
- Secondary surfaces such as visual settings, address book, route familiarity, area unlocks, and trip history are moved behind an in-app drawer.
- This is not the final Google Maps visual pass; it is an information-architecture correction so future delivery/logistics/asset-location integrations do not keep turning Map into a backend dashboard.

---

## 6. Gallery Direction / 相册模块方向

Current naming note / 当前命名备注:

The current module is sometimes described as an asset center, but its user-facing visual identity should be the Album/Gallery module.  
当前模块有时被描述为“素材中心”，但用户可见的视觉身份应更接近“相册/Gallery”。

Primary reference / 主要参考:

- iOS Photos

Target / 目标:

Gallery should feel like an iOS-like Photos app first, while quietly preserving its cross-module asset hub responsibilities.  
Gallery 首先应像 iOS 系统相册，同时在背后保留跨模块素材中台职责。

Suggested collection categories / 建议精选集归类:

1. Wallpapers / 壁纸
2. Memories / 回忆
3. People / 人物
4. Journeys / 旅程
5. Reference images / 参考图
6. Scenarios / 场景

Direction notes / 方向备注:

1. The page should not visually lead with file-management language.  
   页面视觉不应优先呈现文件管理器感。
2. Asset-management functions can remain, but should be framed as album organization, usage badges, and collection metadata.  
   素材管理能力可以保留，但应包装为相册整理、使用标记与精选集元信息。
3. Wallpaper, role images, map backgrounds, and chat references should feel like natural album reuse, not admin binding.  
   壁纸、角色图、地图背景、聊天参考图应像自然的相册复用，而不是后台绑定操作。

Must preserve / 必须保留:

- Asset import
- Folder/category behavior
- Usage badges
- Delete/replace safety
- Cross-module bindings

---

## 7. Other Modules / 其他模块

Current state / 当前状态:

The user has not finalized visual direction for all other modules yet.  
用户暂未完整定义其他模块的视觉方向。

Temporary rule / 临时规则:

1. Other modules should inherit the iOS-like global shell.  
   其他模块先继承 iOS-like 全局壳层。
2. Do not invent a strong standalone visual identity for modules whose product role is still unclear.  
   对产品角色尚未清晰的模块，不要先发明强烈独立视觉身份。
3. When the user adds more references, update this document rather than scattering style notes in chat or task boards.  
   用户后续补充更多参考时，应更新本文，而不是把风格信息散落在聊天或任务看板里。

Pending / 待补充:

- Phone
- Wallet
- Stock
- Files
- More
- Profile
- Contacts detail direction
- WorldBook detail direction
- Calendar detail direction

---

## 8. Practical Guidance for Future AI Assistants / 给后续 AI 助手的实操指引

1. Use `APPEARANCE_REBUILD_SCOPE.md` to understand rebuild breadth before proposing visual work.  
   做视觉方案前，先用 `APPEARANCE_REBUILD_SCOPE.md` 理解重建范围。
2. Use this file to choose references and mood when designing a specific page.  
   设计具体页面时，用本文判断参考对象与气质方向。
3. For unspecified modules, inherit the global iOS-like shell and avoid over-personalized page styles.  
   对未指定模块，继承全局 iOS-like 壳层，避免过度个性化页面风格。
4. For Chat, Map, and Gallery, respect the module-specific references in this file before inventing new directions.  
   对 Chat、Map、Gallery，先遵循本文模块级参考，再考虑新增方向。

---

## 9. Change Log / 变更记录

1. 2026-05-02 EN: Created from user-provided visual references: global iOS-like phone system, Chat leaning KakaoTalk with WhatsApp/iMessage references, Map leaning Google Maps plus ride-hailing trip flow, Gallery leaning iOS Photos collections.
   2026-05-02 中文：根据用户提供的视觉参考创建本文：全局偏 iOS 手机系统，Chat 偏 KakaoTalk 并参考 WhatsApp/iMessage，Map 参考 Google Maps 并结合打车行程，Gallery 参考 iOS Photos 精选集。
