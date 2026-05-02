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
