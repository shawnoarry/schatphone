# Deferred Visual Rebuild TODO / 暂存视觉重建 TODO

Updated / 更新时间: 2026-05-02

## 1. Purpose / 用途

This document parks the recommended next visual-rebuild work while the project focus returns to functional code.  
It is a memory aid for future developers and AI assistants, not the active execution board.

本文用于暂存后续外观重建建议，方便当前阶段先回到功能代码推进。  
它是给后续开发同事和 AI 助手看的存档，不是当前执行看板。

Authority note / 职责说明:

- This file is intentionally deferred.  
  本文内容当前刻意搁置。
- Do not treat the items below as active tasks unless they are promoted into `docs/roadmap/TODO_ROADMAP.md`.  
  除非被转入 `docs/roadmap/TODO_ROADMAP.md`，否则不要把下列条目视为进行中任务。
- Use this file after functional priorities are clearer and the team decides to resume visual work.  
  等功能优先级更清楚、团队决定恢复视觉工作后，再使用本文。

Related docs / 相关文档:

- `docs/overview/APPEARANCE_REBUILD_SCOPE.md`
- `docs/overview/VISUAL_STYLE_DIRECTION_BRIEF.md`
- `docs/templates/VISUAL_REDESIGN_BRIEF_TEMPLATE.md`

---

## 2. Current Decision / 当前决策

Visual work is parked for now.  
The next active exploration should return to functional code and engineering opportunities.

视觉工作暂时搁置。  
下一步主动探索应回到功能代码与工程可推进项。

Reason / 原因:

1. The visual rebuild scope has already been documented.  
   外观重建范围已经沉淀。
2. The first visual direction brief has already captured the main references.  
   第一版视觉方向简报已经记录主要参考。
3. The project still has functional and engineering work that can move forward before large UI redesign begins.  
   在大规模 UI 重建前，项目仍有功能与工程层面的工作可以推进。

---

## 3. Parked Visual TODO List / 暂存视觉 TODO 清单

### 3.1 Fill Remaining Style Directions / 补齐剩余视觉方向

Status / 状态: deferred / 已搁置

Recommended later work / 后续建议:

1. Add lightweight direction notes for `Settings`.  
   为 `Settings` 补一版轻量方向说明。
2. Add lightweight direction notes for `Appearance`.  
   为 `Appearance` 补一版轻量方向说明。
3. Add lightweight direction notes for `Contacts`.  
   为 `Contacts` 补一版轻量方向说明。
4. Add lightweight direction notes for `WorldBook`.  
   为 `WorldBook` 补一版轻量方向说明。

Minimum input needed / 最小输入:

- Like what / 像什么
- Unlike what / 不像什么
- Keywords / 关键词

### 3.2 Create Global Visual System Brief / 建立全局视觉底座

Status / 状态: deferred / 已搁置

Recommended later artifact / 后续建议产物:

- `docs/overview/GLOBAL_VISUAL_SYSTEM_BRIEF.md`

Content to define / 应定义内容:

1. Color system and semantic usage.  
   色彩系统与语义用途。
2. Typography direction and size scale.  
   字体方向与字号层级。
3. Radius, shadow, blur, and translucency rules.  
   圆角、阴影、模糊与半透明规则。
4. Status bar, Dock, notification, and wallpaper readability rules.  
   状态栏、Dock、通知与壁纸可读性规则。
5. Page transition and micro-motion language.  
   页面转场与微动效语言。
6. Icon style and app identity rules.  
   图标风格与应用身份规则。

### 3.3 Promote Shell Visual Rebuild Phase 1 / 推进入壳层视觉重建一期

Status / 状态: deferred until promoted / 待转入路线图

Recommended later promotion target / 后续建议转入:

- `docs/roadmap/TODO_ROADMAP.md`

Recommended scope / 建议范围:

1. `LockScreen` visual rebuild.  
   `LockScreen` 视觉重建。
2. `Home` visual rebuild.  
   `Home` 视觉重建。
3. `Dock` visual rebuild.  
   `Dock` 视觉重建。
4. In-shell notification surface rebuild.  
   壳内通知表面重建。

Why first / 为什么优先:

- These surfaces define whether the product feels like a real phone.  
  这些界面决定产品是否像一台真实手机。
- If the shell is not convincing, rebuilt modules will still feel like separate pages.  
  如果壳层不成立，模块再精细也会像分散页面。

### 3.4 Chat Visual Rebuild / Chat 视觉专项重建

Status / 状态: deferred / 已搁置

Reference direction / 参考方向:

- Primary: KakaoTalk
- Secondary: WhatsApp, iMessage

Recommended later scope / 后续建议范围:

1. Chat list / thread entry state.  
   会话列表 / 会话入口状态。
2. Message bubble and attachment presentation.  
   消息气泡与附件表现。
3. Rich-send panel.  
   富发送面板。
4. Thread settings and AI controls.  
   会话设置与 AI 控制。
5. Notification feedback and locked-state return path.  
   通知反馈与锁屏回流路径。

Must preserve / 必须保留:

- Manual `Trigger Reply`
- Rich message blocks
- Message actions
- Thread preferences
- Structured assistant block rendering

### 3.5 Gallery or Map Visual Benchmark / Gallery 或 Map 视觉标杆模块

Status / 状态: deferred / 已搁置

Candidate A: Gallery / 候选 A：相册

- Reference: iOS Photos
- Focus: album-first visual identity, collections, memories, wallpaper/person/journey organization
- Preserve: asset import, folder/category behavior, usage badges, cross-module bindings

Candidate B: Map / 候选 B：地图

- Reference: Google Maps + ride-hailing trip flow
- Focus: current location, destination, route status, trip lifecycle, arrival feedback
- Preserve: simulation-first behavior, optional AI visual enhancement, Calendar/reminder ownership split

Recommendation / 建议:

- Pick Gallery first if the goal is to prove emotional/album immersion.  
  如果目标是证明情绪化相册沉浸感，先选 Gallery。
- Pick Map first if the goal is to prove functional app realism and trip-system depth.  
  如果目标是证明功能 App 真实感与行程系统深度，先选 Map。

---

## 4. Suggested Resume Order / 未来恢复视觉工作时的建议顺序

### 4.1 Home Folder Visual Status / 主屏文件夹视觉进度

Status / 状态: partial baseline landed, full visual rebuild deferred / 已落地基础视觉骨架，完整视觉重建仍搁置

Landed / 已完成:

1. Home folder tile occupies the same 1x1 footprint as a normal app entry.
   主屏文件夹入口已使用与普通 App 相同的 1x1 占位。
2. Shopping now uses the folder-style Home entry instead of a normal single app icon.
   Shopping 已使用文件夹式 Home 入口，而不是普通单 App 图标。
3. The folder icon shows a 2x2 child-entry preview grid.
   文件夹图标已显示 2x2 子入口缩略预览。
4. Opening the folder uses a blur/glass overlay, rounded panel, and baseline open animation.
   文件夹打开已具备模糊/毛玻璃遮罩、圆角面板与基础打开动效。
5. The implementation has a presentation boundary in `src/lib/home-entry-registry.js`.
   实现已在 `src/lib/home-entry-registry.js` 中预留展示配置边界。

Not finished / 未完成:

1. Folder visuals are not yet controlled by Appearance settings.
   文件夹视觉尚未接入 Appearance 设置。
2. Blur strength, icon mask, preview density, tint, radius, and animation are not user-configurable.
   模糊强度、图标蒙版、预览密度、染色、圆角与动效尚不可由用户配置。
3. The current style is a functional visual scaffold, not the final iOS-grade shell rebuild.
   当前样式是功能性视觉脚手架，不是最终 iOS 级壳层重建。
4. Shopping's inner page still uses a functional baseline layout for products, cart, orders, Assets/Wallet suggestions, and Calendar delivery cues; it needs later module-level visual direction.
   Shopping 内页仍是商品、购物车、订单、Assets/Wallet 建议和 Calendar 配送线索的功能基线布局，后续需要单独做模块级视觉方向。
5. Assets' inner page now has functional CRUD and valuation layout, but its final module identity is not designed.
   Assets 内页现在已有功能性 CRUD 与估值布局，但最终模块视觉身份尚未设计。

Future visual TODO / 后续视觉 TODO:

1. Add Appearance controls for folder preview density, blur/tint, radius, and open animation.
   在 Appearance 中加入文件夹预览密度、模糊/染色、圆角与打开动效控制。
2. Move folder skin values from `HomeView.vue` scoped CSS into shared shell/appearance tokens.
   将文件夹皮肤值从 `HomeView.vue` 局部样式迁移到共享壳层/外观 token。
3. Rework Home folder opening motion together with the broader Lock/Home/Dock rebuild.
   在整体 Lock/Home/Dock 重建时一起重做文件夹打开动效。
4. Revisit Shopping's folder and inner-page identity after the product/cart/order plus Assets/Wallet/Calendar handoff baseline is stable.
   等 Shopping 商品/购物车/订单以及 Assets/Wallet/Calendar 交接基线稳定后，再回看购物文件夹与内页视觉身份。
5. Revisit Assets visual identity after Shopping -> Assets handoff behavior is clear.
   等 Shopping -> Assets 交接行为明确后，再回看资产模块视觉身份。

### 4.2 Home -1 Today View Visual Status / 主屏 -1 今日视图视觉进度

Status / 状态: functional shell baseline landed, full visual rebuild deferred / 功能性壳层基线已落地，完整视觉重建仍搁置

Landed / 已完成:

1. Home now has a native-system `-1` Today View to the left of page 1.
   Home 现在在第 1 屏左侧拥有一个原生系统感的 `-1` 今日视图。
2. The greeting and Smart Panel have moved from page 1 into this `-1` surface.
   “你好，用户名”和智能面板已从第 1 屏移动到 `-1` 页面。
3. World Hub and Cheats are represented as fixed hidden-system placeholders.
   World Hub 与金手指已作为固定隐藏系统占位呈现。
4. Locked placeholders are dim/low-saturation and show `App not installed` feedback when tapped.
   未安装占位以暗色/低饱和显示，点击后提示“应用未安装”。
5. World Hub lights up and opens only when the `control_center` runtime toggle is enabled.
   只有 `control_center` 运行控制开关开启后，World Hub 才会变亮并可打开。

Not finished / 未完成:

1. Cheats still has no unlock condition, route, or value-editing surface.
   金手指尚未接入解锁条件、路由或数值编辑界面。
2. The `-1` widget/card visuals are local scaffolding, not final iOS Today View quality.
   `-1` 小组件/卡片视觉仍是局部脚手架，不是最终 iOS 今日视图质量。
3. The `-1` surface is intentionally not editable through Appearance or Home layout.
   `-1` 页面当前刻意不接入 Appearance 或 Home 布局编辑。

Future visual TODO / 后续视觉 TODO:

1. Rebuild `-1` with a more believable iOS Today View/widget composition.
   后续按更可信的 iOS 今日视图/小组件组合重建 `-1` 页面。
2. Define a locked/installed visual language for hidden system apps that cannot be customized by Appearance.
   定义隐藏系统 App 的未安装/已安装视觉语言，并保持不可被 Appearance 自定义。
3. Decide whether unlocked `-1` shortcuts should return to `-1` through an expanded navigation contract or continue normalizing to Home page 1.
   决定解锁后的 `-1` 快捷入口是否扩展返回协议回到 `-1`，或继续归一化返回第 1 屏。

When the project returns to visual work, resume in this order:

未来恢复视觉工作时，建议按以下顺序：

1. Fill remaining style directions for Settings, Appearance, Contacts, and WorldBook.  
   补齐 Settings、Appearance、Contacts、WorldBook 的视觉方向。
2. Create `GLOBAL_VISUAL_SYSTEM_BRIEF.md`.  
   创建 `GLOBAL_VISUAL_SYSTEM_BRIEF.md`。
3. Promote shell visual rebuild phase 1 into `docs/roadmap/TODO_ROADMAP.md`.  
   将壳层视觉重建一期转入 `docs/roadmap/TODO_ROADMAP.md`。
4. Implement LockScreen + Home + Dock + Notification visual rebuild.  
   实施 LockScreen + Home + Dock + Notification 视觉重建。
5. Implement Chat visual rebuild.  
   实施 Chat 视觉重建。
6. Choose Gallery or Map as the first module-level visual benchmark.  
   从 Gallery 或 Map 中选择第一个模块级视觉标杆。

---

## 5. Functional Work Reminder / 功能工作提醒

Since visual work is now parked, future contributors should return to the functional and engineering handoff docs before coding:

由于视觉工作当前已搁置，后续接手者在继续编码前应回到功能与工程接手文档：

1. `docs/roadmap/TODO_ROADMAP.md`
2. `docs/roadmap/PROJECT_MODULE_AUDIT.md`
3. `docs/overview/MODULE_MATURITY_AND_ENGINEERING_MAP.md`

Use those files to decide what functional code can be advanced next.  
使用这些文档判断下一步可推进的功能代码工作。

---

## 6. Change Log / 变更记录

1. 2026-05-02 EN: Created as a deferred visual TODO archive after the user decided to pause visual work and return focus to functional code opportunities.
   2026-05-02 中文：在用户决定暂时搁置视觉工作、转回功能代码机会后，新增为视觉 TODO 存档。
