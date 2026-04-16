# Notification and App Icon Requirements / 通知与功能图标需求说明

Updated / 更新时间: 2026-04-16

## 0. Implementation Snapshot / 当前实现快照
1. EN: `DONE (v1)` in-shell notifications now support a module-grouped lock-screen notification center, shared module identity rendering, and an unlocked top banner.
   中文：`已完成（v1）` 壳内通知现已支持按模块分组的锁屏通知中心、统一的模块身份渲染规则，以及解锁状态下的顶部横幅。
2. EN: `DONE (v1)` real external push now defaults to `SchatPhone`-level title/body instead of directly mirroring the in-shell copy.
   中文：`已完成（v1）` 真实移动端系统推送默认统一为 `SchatPhone` 级别的标题与正文，不再直接照搬壳内通知文案。
3. EN: `DONE (v2)` Settings now offers `minimal / standard / preview` external-push display modes, and the selected mode is applied to both instant relays and scheduled push deliveries.
   中文：`已完成（v2）` Settings 现已提供 `极简 / 标准 / 预览` 三种外部系统推送显示模式，且会同时作用于即时推送与定时推送。
4. EN: `DONE (v2)` Appearance now exposes app-icon customization for all built-in home modules, using preset glyph + accent choices that also flow into in-shell notifications.
   中文：`已完成（v2）` Appearance 现已为全部内建首页模块开放功能图标自定义，采用“预设图标 + 预设色系”方案，并同步影响壳内通知图标表现。
5. EN: `PENDING (v3)` image-based custom icons, more advanced push-copy customization, and deeper notification-center management remain future work.
   中文：`待后续（v3）` 图片型自定义图标、更细的外部推送文案自定义，以及更完整的通知中心管理仍属于后续工作。

## 1. Purpose / 文档用途
1. EN: This document records the latest PM decisions about notification layering and app-icon customization.
   中文：本文件用于统一记录产品经理关于“通知分层展示”和“功能图标自定义”的最新决策。
2. EN: If older chat discussion or partial docs conflict with this file, this file should be treated as the working source of truth for this topic.
   中文：如果旧聊天记录或旧说明文件与本文件冲突，针对本主题应以本文件作为当前执行依据。
3. EN: The audience is both non-technical PM review and AI-engineer handoff.
   中文：本文件同时面向非技术产品经理阅读，以及后续 AI 工程师接手执行。

## 2. Core Product Decision / 核心产品决策
1. EN: In-shell notifications and real device system notifications are different product layers and must not be treated as the same surface.
   中文：壳内通知与真实移动端系统通知属于不同产品层级，不能继续按同一种展示层来处理。
2. EN: The immersive phone shell should feel like a virtual mobile OS with different app identities.
   中文：沉浸式手机壳层应该更像一个虚拟手机系统，能够体现不同功能模块的不同 app 身份。
3. EN: Real mobile-device notifications should feel like one installed app named `SchatPhone`, not like many internal modules leaking outward by default.
   中文：真实移动端系统通知应更像一个安装在手机里的统一 app `SchatPhone`，而不是默认向外暴露多个内部模块。

## 3. In-Shell Notification Rules / 壳内通知规则
1. EN: In-shell notifications must always preserve module identity.
   中文：壳内通知必须保留明确的模块身份。
2. EN: Users should be able to tell at a glance whether a notification comes from `Chat`, `Map`, `Gallery`, `Forum`, `Shopping`, or `System`.
   中文：用户应能一眼分辨通知来自 `Chat`、`Map`、`Gallery`、`Forum`、`Shopping` 或 `System`。
3. EN: Lock screen and unlocked foreground banner should share the same module-identity logic.
   中文：锁屏通知与解锁状态下的前台横幅通知，应共用同一套模块身份逻辑。
4. EN: In-shell notification rendering should remain stable even if a custom module icon is missing, reset, or invalid.
   中文：即使某个模块自定义图标缺失、被重置或失效，壳内通知渲染也必须保持稳定。

## 4. Real External Push Rules / 真实外部推送规则
1. EN: External push should default to a restrained `SchatPhone`-level presentation.
   中文：外部系统推送默认应采用更克制的 `SchatPhone` 级展示。
2. EN: Default external push title should be `SchatPhone`, not the internal module name.
   中文：默认外部推送标题应为 `SchatPhone`，而非内部模块名。
3. EN: By default, external push should avoid over-exposing internal module names, role names, or immersive private content.
   中文：默认情况下，外部系统推送应避免过度暴露内部模块名、角色名或沉浸式私密内容。
4. EN: The user can choose notification verbosity through display modes instead of relying on one hardcoded style.
   中文：用户应通过显示模式来选择通知详细程度，而不是被固定在单一硬编码样式中。

## 5. External Push Display Modes / 外部系统推送显示模式
### 5.1 Minimal / 极简
1. EN: Purpose: maximum privacy and minimum surface noise.
   中文：目的：最高隐私性与最少干扰。
2. EN: Title: `SchatPhone`
   中文：标题：`SchatPhone`
3. EN: Body: generic reminder only, such as “You have a new reminder.”
   中文：正文：仅显示通用提醒，例如“你有一条新的提醒”。
4. EN: This mode should not expose module type or message preview by default.
   中文：此模式默认不暴露模块类型，也不展示消息预览。

### 5.2 Standard / 标准
1. EN: Purpose: keep privacy while still letting the user know the type of update.
   中文：目的：在保留隐私的同时，让用户知道提醒属于哪一类。
2. EN: Title: `SchatPhone`
   中文：标题：`SchatPhone`
3. EN: Body: module-aware generic text, such as “You received a new chat message.” or “You have a new trip reminder.”
   中文：正文：按模块区分的通用提示，例如“你收到一条新的聊天消息”或“你有一条新的行程提醒”。
4. EN: This mode should distinguish `Chat / Map / Gallery / Shopping / Forum / System`, but still avoid raw message preview.
   中文：此模式应区分 `Chat / Map / Gallery / Shopping / Forum / System` 等类型，但仍不直接显示正文预览。

### 5.3 Preview / 预览
1. EN: Purpose: closest to a real chat-app/system-notification experience.
   中文：目的：尽量接近真实聊天软件或系统通知的体验。
2. EN: Title: `SchatPhone` by default, unless future product rules allow explicit override.
   中文：标题默认仍为 `SchatPhone`，除非后续产品规则明确允许更细的自定义覆盖。
3. EN: Body: when preview text exists, show message preview; otherwise fall back to Standard mode copy.
   中文：正文：若存在可用预览文本，则显示消息预览；若不存在，则回退到标准模式文案。
4. EN: This mode is the most expressive, so it should remain a user-controlled choice.
   中文：此模式信息量最大，因此必须保持为用户自主选择项。

## 6. App Icon Requirements / 功能图标需求
1. EN: Module identity should be visible not only on the home screen, but also inside in-shell notification surfaces.
   中文：模块身份不应只体现在首页，也应体现在壳内通知等系统层展示中。
2. EN: App-icon customization should cover built-in app entries first, using a safe preset-based system.
   中文：功能图标自定义应优先覆盖内建 app 入口，并采用安全的预设型方案。
3. EN: Current V2 scope already covers all built-in home modules through preset glyph + accent combinations.
   中文：当前 V2 范围已通过“预设图标 + 预设色系”的方式覆盖全部内建首页模块。
4. EN: The selected customization should flow consistently through:
   中文：所选图标自定义应统一流向以下位置：
   - EN: home-screen tiles
   - 中文：首页图标
   - EN: dock items
   - 中文：Dock 图标
   - EN: in-shell lock-screen notification center
   - 中文：壳内锁屏通知中心
   - EN: in-shell unlocked top banners
   - 中文：壳内前台顶部横幅
5. EN: Missing custom icons must always fall back safely to built-in defaults.
   中文：缺失的自定义图标必须始终安全回退到内建默认图标。

## 7. Current Implementation Contract / 当前实现契约
1. EN: In-shell notification presentation is derived from module key + module label + icon glyph + accent tone.
   中文：壳内通知展示当前由模块键、模块名称、图标 glyph 与色系组合而成。
2. EN: External push presentation is derived from locale + display mode + notification payload.
   中文：外部系统推送展示当前由语言、显示模式与通知载荷共同决定。
3. EN: Display mode is a system-level setting and is currently applied to:
   中文：显示模式是系统级设置，当前会作用于：
   - EN: instant push relay when a notification is forwarded while the page is backgrounded
   - 中文：页面处于后台时的即时推送转发
   - EN: scheduled push deliveries such as map arrival reminders and chat auto reminders
   - 中文：地图到达提醒、聊天自动提醒等定时推送
4. EN: App-icon customization is currently preset-based rather than image-upload based.
   中文：当前功能图标自定义仍是预设型方案，而不是图片上传型方案。

## 8. Acceptance Criteria / 验收标准
1. EN: In-shell notifications must clearly show module identity even if the external push layer stays generic.
   中文：即使外部推送层保持通用，壳内通知也必须清晰体现模块身份。
2. EN: External push mode changes made in Settings must actually affect delivered push payloads, not only UI labels.
   中文：在 Settings 中切换外部推送模式后，必须真实影响推送载荷，而不是只改 UI 文案。
3. EN: Scheduled push and instant push must honor the same external display-mode policy.
   中文：定时推送与即时推送必须遵循同一套外部显示模式策略。
4. EN: Home icons, dock icons, and in-shell notification icons must stay visually consistent when the user changes app-icon presets.
   中文：当用户修改功能图标预设后，首页、Dock 与壳内通知图标必须保持视觉一致。
5. EN: Missing or invalid customization data must never break navigation, notification rendering, or route jumps.
   中文：自定义数据缺失或失效时，绝不能破坏页面跳转、通知渲染或路由逻辑。

## 9. Next-Phase Suggestions / 下一阶段建议
1. EN: Add image-upload based custom app icons with file-size guard and safe fallback.
   中文：增加基于图片上传的自定义功能图标，并加入体积守卫与安全回退。
2. EN: Add richer notification-center management, such as per-module filters, grouped read state, and batch actions.
   中文：补齐更完整的通知中心管理，例如按模块筛选、分组已读状态和批量操作。
3. EN: Add future user-facing controls for deeper external push copy customization if PM decides it is needed.
   中文：若产品侧确认需要，可在后续增加更细的外部推送文案自定义控制。
4. EN: Eventually split in-shell notification fields and external-push fields more formally in the data schema.
   中文：后续应在数据结构层正式拆分“壳内通知字段”和“外部推送字段”。
