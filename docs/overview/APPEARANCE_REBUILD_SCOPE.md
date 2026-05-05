# SchatPhone Appearance Rebuild Scope / SchatPhone 外观重建范围说明

Updated / 更新时间: 2026-05-02

## 1. Purpose / 用途

This document is a handoff-oriented reference for future developers and AI coding assistants.  
It records how the current appearance layer should be judged, and which surfaces should be treated as "to be rebuilt" under the current product plan.

本文是给后续开发同事与 AI 助手使用的外观重建参考文档。  
它用于说明当前外观层应如何判断，以及在当前产品规划下，哪些界面应被视为“待重建”。

Authority note / 职责说明:

- This file is a current reference for visual rebuild scope, not a live task board.  
  本文是当前有效的“外观重建范围参考”，不是动态任务看板。
- Any task status, sequencing, or owner tracking still belongs only in `docs/roadmap/TODO_ROADMAP.md`.  
  任何任务状态、执行顺序、负责人信息仍只允许进入 `docs/roadmap/TODO_ROADMAP.md`。
- Use this file to judge whether a page should be lightly polished, structurally restyled, or fully visually rebuilt.  
  使用本文来判断某个页面应该做轻量打磨、结构性换皮，还是完整视觉重建。

Source set / 参考来源:

- `src/views/AppearanceView.vue`
- `src/views/HomeView.vue`
- `src/views/LockScreen.vue`
- `src/views/SettingsView.vue`
- `src/views/ChatView.vue`
- `src/views/GalleryView.vue`
- `src/views/MapView.vue`
- `src/router/index.js`
- `docs/product-decisions/NOTIFICATION_AND_APP_ICON_REQUIREMENTS.md`
- `docs/roadmap/PROJECT_MODULE_AUDIT.md`
- `docs/overview/PROJECT_MASTER_GUIDE.md`

---

## 2. Core Verdict / 核心判断

Under the current plan, the appearance layer should be treated as a full rebuild, not as incremental polish.  
The existing implementation already proves many appearance-related functions, but it does not yet form the target product look.

在当前规划下，外观层应被视为“整体重建”，而不是“局部美化”。  
现有实现已经证明了大量外观相关功能可用，但它还没有形成目标产品所需的完整视觉形态。

Practical meaning / 实际含义:

1. Keep function, rebuild presentation.  
   保留功能，重做表现层。
2. Current page chrome, card skin, spacing, shadow, blur, icon feel, and motion language should not be treated as final.  
   当前页面外壳、卡片皮肤、留白、阴影、模糊、图标气质与动效语言都不应被视为最终方案。
3. Future contributors may rebuild shell visuals aggressively as long as route, data, and behavior contracts remain stable.  
   后续接手者可以大胆重做壳层视觉，只要路由、数据与行为契约保持稳定。

---

## 3. What Already Exists Technically / 技术上已存在的外观能力

The project is not starting from zero on appearance capability.  
What already exists is mainly the control layer and binding layer.

项目并不是从零开始建设外观能力。  
当前已经存在的，主要是“控制能力”和“绑定能力”。

Implemented today / 当前已实现:

1. Theme switching and theme-level wallpaper fallback.  
   主题切换，以及按主题回退的壁纸能力。
2. Wallpaper source modes: `theme / gallery / url`.  
   壁纸来源模式：`theme / gallery / url`。
3. Font presets and custom font stack.  
   字体预设与自定义字体栈。
4. Lock-screen clock style selection.  
   锁屏时钟样式切换。
5. Status-bar visibility and haptic-feedback toggles.  
   顶部状态栏显示与触感反馈开关。
6. Custom CSS entry for advanced overrides.  
   高级自定义 CSS 入口。
7. Preset-based app-icon glyph/accent customization, already flowing into Home, Dock, and in-shell notifications.  
   基于预设的功能图标 glyph / accent 自定义，并已贯通首页、Dock 与壳内通知。
8. Widget restore, custom widget creation, and JSON import flow.  
   内置 Widget 恢复、自定义 Widget、新增与 JSON 导入流程。
9. Five-page Home layout baseline with widget/app entry placement.  
   五屏 Home 基线，以及 Widget / 应用入口布局。
10. Lock-screen grouped notification center and foreground banner behavior.  
    锁屏分组通知中心与前台横幅通知行为。
11. Gallery asset categories and cross-module asset reuse, including wallpaper and map background usage.  
    Gallery 素材分类与跨模块复用，包括壁纸与地图背景绑定。
12. Map visual settings, including default visual, gallery-backed visual, and AI visual refresh path.  
    地图视觉设置，包括默认视觉、相册背景、AI 视觉刷新路径。

Conclusion / 结论:

- The appearance system is functionally broad enough.  
  外观系统的功能广度已经够用。
- The missing part is a converged visual language, not basic toggle coverage.  
  当前缺的不是基础开关，而是收敛后的视觉语言。

---

## 4. Why The Whole Appearance Layer Still Needs Rebuild / 为什么外观仍需整体重建

The current UI still reads as capability-first and page-local.  
It is strong as an MVP shell, but weak as a unified immersive product.

当前 UI 仍然更像“功能先行、页面各自成形”的产物。  
它作为 MVP 壳层是成立的，但作为统一的沉浸式产品外观仍然不够。

Main reasons / 主要原因:

1. There is no single shell-level visual language across Lock, Home, Settings, Chat, Gallery, and Map.  
   锁屏、首页、设置、聊天、相册、地图之间尚未形成统一的壳层视觉语言。
2. Many pages still look like tools or admin panels rather than a believable virtual phone OS.  
   多数页面仍偏工具页或后台页观感，不像一个可信的虚拟手机系统。
3. Module identity exists semantically, but not yet as a product-grade visual system.  
   模块身份在语义上已存在，但还没有成为成体系的产品级视觉表达。
4. Appearance controls and visual-authoring tools are mixed together, especially in `AppearanceView.vue`.  
   外观基础设置与视觉创作工具仍混在一起，尤其是 `AppearanceView.vue`。
5. The current style tokens are local and opportunistic rather than authoritative.  
   当前样式 token 更像局部应急方案，而不是权威视觉规范。
6. Mature modules already have strong behavior, but their visuals are still inconsistent with the intended immersion level.  
   成熟模块在行为层已经很强，但视觉层仍达不到目标沉浸感。

---

## 5. Rebuild Scope by Layer / 按层归纳的重建范围

### 5.1 Shell Layer / 壳层外观

These surfaces should all be treated as full visual rebuild targets.  
They are the strongest carriers of "this feels like a phone" and cannot be solved by isolated page polish.

以下界面都应被视为“完整视觉重建对象”。  
它们是“像不像一台手机”的第一层载体，不能靠零散修补解决。

| Surface / 界面 | Current technical state / 当前技术状态 | Rebuild judgment / 重建判断 | Must preserve / 必须保留 |
| --- | --- | --- | --- |
| Lock Screen / 锁屏 | Unlock guard, grouped notifications, tap-through route jump, clock-style options are all online. | Full visual rebuild required: time panel, banner, notification stack, background, typography, motion, and depth cues all need replacement. | Lock guard, notification tap-through, module identity logic, clock-style setting |
| Home Shell / 首页壳层 | 5-page layout, widgets, app entries, Dock, edit gating, drag/drop baseline are online. | Full visual rebuild required: app-grid mood, Dock treatment, wallpaper overlay, page transition, widget skin, and edit-mode presentation all need replacement. | `app_*` entries stay protected, page model, widget placement semantics, drag/drop behavior |
| Notification Surfaces / 壳内通知 | Module-aware icon/accent rendering, lock grouping, and foreground banner are already online. | Full visual rebuild required: cards, group headers, chips, privacy hierarchy, badge language, motion, and spacing all need replacement. | Module metadata, fallback safety, route jump behavior, external-push split policy |
| Theme and Wallpaper Base / 主题与壁纸基底 | Theme ids, wallpaper modes, gallery/url/theme fallback all exist. | Full visual rebuild required: tint system, blur policy, wallpaper readability overlay, shell contrast strategy, and global atmosphere need redesign. | Existing theme ids, wallpaper source semantics, asset bindings |
| Status Bar and Micro Shell Details / 状态栏与微观壳层细节 | Status-bar toggle and some shell details are wired. | Full visual rebuild required: should become part of a cohesive OS-style chrome instead of isolated switches. | Toggle semantics and accessibility of core indicators |

### 5.2 Appearance Control Center / 外观控制中心

`AppearanceView.vue` already acts as the capability hub for theme, wallpaper, font, icon, widget, and small shell-level toggles.  
Its function is real, but its information architecture and presentation should also be considered rebuild scope.

`AppearanceView.vue` 已经承担主题、壁纸、字体、图标、Widget 与局部壳层开关的能力中枢。  
它的功能是真实存在的，但它的信息架构与视觉表达也应被纳入重建范围。

Current sections / 当前已有分区:

1. Theme and wallpaper
2. Font settings
3. App icon presets
4. Widget studio and import
5. Lock clock style
6. Status bar / haptic / custom CSS

Rebuild judgment / 重建判断:

- The page should be fully restructured visually.  
  这个页面应做完整的视觉重构。
- Basic appearance controls and advanced creative tools should no longer look like one flat settings pile.  
  基础外观设置与进阶创作工具不应继续表现为同一层平铺设置。
- Widget workshop concerns should be visually separated from everyday appearance basics.  
  Widget 工坊应在视觉层与日常外观设置明显分离。

Must preserve / 必须保留:

- Theme/wallpaper/font/icon/widget setting semantics
- Save behavior and safety feedback
- Wallpaper source compatibility
- App-icon fallback rules
- Widget import validation and restore safety

### 5.3 Mature Content Modules / 成熟内容模块

These modules already matter product-wise, so their current visuals should not be protected just because they are functional.  
They should all be considered rebuild targets.

这些模块在产品上已经有真实重量，因此不能因为“能用”就把当前视觉也一起默认保留。  
它们都应被视为外观重建对象。

| Module / 模块 | Current state / 当前状态 | Appearance judgment / 外观判断 | Must preserve / 必须保留 |
| --- | --- | --- | --- |
| Chat / 聊天 | Core gameplay loop is strong and deep. | Full visual rebuild required. Current page still feels too much like a long web view instead of a product-grade chat app. | Manual trigger, thread prefs, message actions, rich-send, structured blocks, notification linkage |
| Settings / 设置 | Strong configuration center. | Full visual rebuild required. Should become a calm, phone-native system settings surface rather than a dense tool page. | Backup, push, diagnostics, automation, explicit save feedback |
| Gallery / 相册 | Real asset hub with cross-module reuse. | Full visual rebuild required. It should lean more convincingly into a photo-first experience while retaining asset-management depth. | Asset categories, usage bindings, replace/delete safety, wallpaper/map bindings |
| Map / 地图 | Simulation-first baseline plus visual settings and AI enhancement path. | Full visual rebuild required. Current page mixes dashboard, controls, visual settings, and history too evenly. | Simulation-first behavior, reminder ownership split, optional AI visual path |
| Calendar / 日历 | Reminder -> event -> scheduled push loop is meaningful. | Full visual rebuild required. Needs a clearer event/reminder visual language and stronger relation to the shell. | Event store, edited times, push scheduling/status semantics |
| Contacts / 联系人 | Real role archive and binding hub. | Full visual rebuild required. Should look more character/social-product oriented and less like a configuration form. | Role profile data, asset slots, knowledge-point binding |
| Chat Directory / 会话通讯录 | Real role/service management surface. | Full visual rebuild required. Should stop reading like an internal tool once the broader visual system is rebuilt. | Role/service split, template logic, binding semantics |
| WorldBook / 世界书 | Cross-module world kernel interface is online. | Full visual rebuild required. Needs stronger reading/editing atmosphere and less utility-panel feel. | `global worldview + knowledge points` model, cross-module entry behavior |
| Network / 网络 | Technically usable provider setup. | Full visual rebuild required, but as a system-settings substyle rather than a standalone visual direction. | Provider config semantics, diagnostics, connection-related controls |
| Profile / 用户信息 | Basic but real profile editor. | Full visual rebuild required, but should follow shell/system language instead of inventing its own look. | Profile persistence and downstream AI-context role |

### 5.4 Ambiguous or Placeholder Modules / 定位未收敛或占位模块

These modules are also inside the "appearance needs rebuild" conclusion, but they should not receive expensive bespoke visual work before their product role is clearer.

这些模块同样处于“外观待重建”的结论里，但在产品定位更清晰之前，不适合投入昂贵的定制化视觉设计。

Included here / 包括:

1. `Phone`
2. `Wallet`
3. `Stock`
4. `Files`
5. `More`

Guideline / 处理原则:

- They must inherit the new shell, typography, icon, card, and motion system.  
  它们必须继承新的壳层、字体、图标、卡片与动效系统。
- Their bespoke page-level visual identity should wait until their product role is more stable.  
  但它们自己的专属页面视觉，应等产品角色更稳定后再细做。

---

## 6. What Should Be Explicitly Preserved During Rebuild / 重建时必须明确保留的内容

The visual layer is rebuildable.  
The following behavior contracts are not casually disposable.

视觉层可以重建。  
但下面这些行为契约不应被随意推翻。

1. `/lock -> /home` shell entry logic and lock guard.  
   `/lock -> /home` 的壳层入口逻辑与锁定守卫。
2. The split between in-shell notification identity and external push privacy policy.  
   壳内通知身份展示与外部系统推送隐私策略之间的分层。
3. Existing theme/wallpaper/font/icon/widget setting semantics.  
   现有主题、壁纸、字体、图标、Widget 设置语义。
4. Home app-entry protection and widget-page data model.  
   首页应用入口保护规则与 Widget 页面数据模型。
5. Gallery asset-binding contracts used by wallpaper, chat, map, and role assets.  
   Gallery 被壁纸、聊天、地图、角色素材复用的绑定契约。
6. Map simulation-first rule and optional AI visual enhancement rule.  
   地图“模拟优先”与“AI 仅作视觉增强可选项”的规则。
7. Save actions and save feedback on key settings surfaces.  
   关键设置页面中的保存动作与保存反馈。
8. Safe fallback behavior for missing icons, missing assets, or invalid custom appearance data.  
   当图标缺失、素材失效、外观自定义数据异常时的安全回退行为。

---

## 7. Recommended Rebuild Grouping / 推荐的重建分组

This is not a live roadmap.  
It is only the safest grouping logic for future execution.

这不是动态路线图。  
它只是面向后续执行的较安全分组方式。

1. Global visual foundation first.  
   先做全局视觉底座。  
   Includes color system, typography direction, spacing scale, radius/shadow rules, shell blur/tint policy, icon style, and motion language.  
   包括色彩系统、字体方向、留白尺度、圆角阴影规则、壳层模糊与染色策略、图标风格、动效语言。
2. Shell surfaces second.  
   第二步重做壳层表面。  
   Lock Screen, Home, Dock, wallpaper readability, notification surfaces.  
   即锁屏、首页、Dock、壁纸可读性、通知表面。
3. Appearance and system-control pages third.  
   第三步重做外观与系统控制页。  
   Appearance, Settings, Network, basic system pages.  
   即外观、设置、网络及基础系统页。
4. Core immersive apps fourth.  
   第四步重做核心沉浸模块。  
   Chat, Gallery, Map, Calendar.  
   即聊天、相册、地图、日历。
5. Support modules fifth.  
   第五步重做辅助模块。  
   Contacts, Chat Directory, WorldBook, Profile.  
   即联系人、会话通讯录、世界书、用户信息。
6. Placeholder modules inherit last.  
   占位模块最后跟随继承。  
   Phone, Wallet, Stock, Files, More should mainly inherit shared visual system until product role matures.  
   电话、钱包、股票、文件、更多应先继承通用视觉系统，等产品角色成熟后再深做。

---

## 8. Practical Rule for Future Contributors / 给后续接手者的实操规则

1. Assume current visuals are replaceable; do not assume they are authoritative design tokens.  
   默认当前视觉可替换，不要把现有样式当成权威设计 token。
2. If a change is appearance-only, prefer rebuilding component skins and page structure over patching old utility classes forever.  
   如果改动只涉及外观，优先重做组件皮肤与页面结构，而不是无限续补旧样式。
3. Do not confuse "feature already exists" with "visual design is finished".  
   不要把“功能已存在”误判为“视觉设计已完成”。
4. Before adding new page-local styling, decide whether it belongs to global shell language or module identity language.  
   在新增页面私有样式前，先判断它属于全局壳层语言还是模块身份语言。
5. If a rebuild changes route/schema/core behavior, sync the main docs and roadmap in the same batch.  
   如果重建同时改动路由、数据结构或核心行为，就要在同批次同步主文档与路线图。

---

## 9. Change Log / 变更记录

1. 2026-05-02 EN: Created as the current reference for visual rebuild scope. Under the current plan, the appearance layer should be treated as a full rebuild rather than incremental polish.
   2026-05-02 中文：新增为当前外观重建范围参考文档；在当前规划下，外观层应被视为整体重建对象，而不是局部打磨对象。
2. 2026-05-04 EN: Home folder visual scaffold landed for Shopping: 1x1 folder tile, preview grid, blur overlay, rounded panel, and baseline animation exist, but full Appearance-controlled folder theming remains deferred.
   2026-05-04 中文：Shopping 的主屏文件夹视觉脚手架已落地：1x1 文件夹入口、预览格、模糊遮罩、圆角面板与基础动效已存在，但完整由 Appearance 控制的文件夹主题化仍处于搁置状态。
3. 2026-05-04 EN: Assets functional page baseline landed with CRUD and valuation summaries, but it should still be treated as a future visual rebuild target rather than final module styling.
   2026-05-04 中文：Assets 功能页基线已落地，包含 CRUD 与估值摘要；但它仍应被视为后续视觉重建对象，而不是最终模块样式。
4. 2026-05-04 EN: Shopping functional handoff baseline now includes Assets import suggestions, Wallet expense suggestions, and Calendar delivery cues; this is product behavior progress only, not final Shopping visual identity.
   2026-05-04 中文：Shopping 功能交接基线现已包含 Assets 转入建议、Wallet 消费建议与 Calendar 配送线索；这是产品行为进展，不代表 Shopping 最终视觉身份完成。
