# SchatPhone TODO PM Status Report / SchatPhone 待办状态报告（产品经理视角）
Updated / 更新时间: 2026-04-16
Source / 来源: `TODO_ROADMAP.md`

## 1. Why this report exists / 为什么有这份报告
1. EN: This is the PM-readable mirror of the engineering TODO board.
   中文：这是工程待办看板的产品经理可读镜像版。
2. EN: It explains what is done, what is stable, what is still being built, and what choices are still open.
   中文：它会说明哪些内容已经完成、哪些已经稳定、哪些还在推进、哪些决策仍然开放。
3. EN: It is written for non-technical product review, but should also be clear enough for a new AI engineer to pick up work quickly.
   中文：这份报告既面向不懂技术的产品侧，也要让新的 AI 工程师能快速接手。

## 2. Current overall judgment / 当前整体判断
1. EN: Product direction remains on track: immersive virtual phone shell + AI-driven relationship interaction.
   中文：项目方向仍然正确：沉浸式虚拟手机壳层 + AI 驱动的关系互动。
2. EN: The core baseline is now strong enough: shell, chat, gallery, storage, and worldview/map base are all usable.
   中文：当前核心基线已经足够稳：壳层、聊天、相册、存储，以及世界观/地图基础都已经可用。
3. EN: All P0 closure work is considered complete; active work has moved into P1 immersive expansion and polish.
   中文：P0 收口任务已视为完成；当前工作重点已经转入 P1 的沉浸功能扩展与打磨。
4. EN: The newest quality jump is in notification layering and background reminder delivery.
   中文：最近一轮完成度提升最明显的部分，是通知分层体验与后台提醒送达能力。

## 3. What is already stable / 当前已稳定的能力
### 3.1 Core shell / 核心壳层
1. EN: Lock screen, home shell, settings, and main chat route are stable.
   中文：锁屏、主屏壳层、设置页和聊天主路径已经稳定。
2. EN: Lock-state guard is active, and notification click-through flow is available.
   中文：锁屏守卫已生效，通知点击跳转流程可用。
3. EN: In-shell lock screen now supports grouped notification display by module.
   中文：壳内锁屏现在支持按模块分组显示通知。
4. EN: Unlocked shell now also supports a top in-shell banner for new notifications.
   中文：解锁后的壳层现在也支持顶部横幅通知。

### 3.2 Chat baseline / Chat 基线
1. EN: Thread list, thread entry, message rendering, and manual AI trigger are all online.
   中文：会话列表、进入会话、消息渲染和手动 AI 触发都已上线。
2. EN: `Trigger Reply` remains available as the explicit user-controlled AI trigger.
   中文：`Trigger Reply` 仍然保留为用户主动触发 AI 的专用按钮。
3. EN: Rich user-send lanes are online, including image, gif, link, location, transfer, and virtual voice-card style content.
   中文：用户富消息发送链路已上线，包括图片、GIF、链接、位置、转账和虚拟语音卡样式内容。
4. EN: Long-press message actions, semantic revision, restore path, and in-chat edit modal are all available.
   中文：长按消息操作、语义修订、恢复原文，以及 Chat 内编辑弹层都已可用。
5. EN: Conversation-level AI preferences and auto-invoke timing controls are already connected.
   中文：会话级 AI 偏好和自动触发时间控制都已接通。

### 3.3 Global assets / 全局素材
1. EN: Gallery works as the global asset hub instead of a chat-only helper.
   中文：相册已经作为全局素材中台使用，而不是仅服务聊天的辅助功能。
2. EN: Local import, URL import, folder CRUD, role-slot binding, and one-off module-local media paths are online in baseline form.
   中文：本地导入、URL 导入、文件夹增删改、角色槽位绑定，以及模块本地单次媒体路径，都已有基线实现。
3. EN: Chat and Map both support “import before use” and “one-off without import” style local-media paths.
   中文：Chat 和地图都已支持“先入库再使用”与“不入库单次使用”两种本地媒体路径。
4. EN: Safety guards are online for media size and for deleting/replacing in-use assets.
   中文：媒体体积守卫以及“使用中素材删除/替换”的安全确认机制已上线。

### 3.4 Worldview and map / 世界观与地图
1. EN: Global worldview and bindable knowledge points are already split in data structure.
   中文：全局世界观与可绑定知识点已经在数据结构中拆分完成。
2. EN: Chat prompt assembly already follows a deterministic order: global worldview -> role profile -> bound knowledge points -> conversation context.
   中文：Chat 提示词组装已采用固定顺序：全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文。
3. EN: Map baseline can already run without mandatory external map API.
   中文：地图基线已经可以在不依赖外部地图 API 的前提下运行。
4. EN: Trip lifecycle, countdown, history, backup continuity, default/gallery visual modes, and optional provider-side visuals are already online.
   中文：行程生命周期、倒计时、历史记录、备份连续性、默认/素材库视觉模式，以及可选供应商视觉，都已上线。

### 3.5 Storage, backup, and language / 存储、备份与语言
1. EN: Local persistence baseline is stable with backup export/import and diagnostics.
   中文：本地持久化基线已稳定，具备备份导出/导入与诊断能力。
2. EN: Backup reminders are already system-style and non-blocking.
   中文：备份提醒已经采用系统式、非弹窗打断的方式。
3. EN: System UI language switching is available and does not affect AI-generated content itself.
   中文：系统 UI 语言切换已经可用，且不会影响 AI 生成内容本身。

## 4. Biggest completed gains in the latest rounds / 最近几轮最大的完成度提升
1. EN: Real push baseline is online: subscription, permission, server URL, test push, and relay server are all connected.
   中文：真推送基线已上线：订阅、权限、服务地址、测试推送和中继服务均已接通。
2. EN: Real push reliability is no longer “best effort” only; it now includes health checks, resync, startup self-heal, and diagnostics integration.
   中文：真推送可靠性不再只是“尽量可用”，现在已经包括健康检查、重同步、启动自愈和诊断接入。
3. EN: Scheduled real push is online, which means timed reminders can still reach the system-notification layer after the page is closed.
   中文：真推送定时能力已上线，这意味着定时提醒可以在页面关闭后仍送达到系统通知层。
4. EN: Chat and Map have both started using that scheduled push baseline.
   中文：Chat 和地图都已经开始复用这套定时推送基线。
5. EN: Notification surfaces are now formally split:
   中文：通知展示层现在已经正式分层：
   - EN: in-shell notification = module identity first
     中文：壳内通知 = 模块身份优先
   - EN: external real-device push = `SchatPhone` identity first
     中文：外部真实设备推送 = `SchatPhone` 身份优先
6. EN: External push now supports `minimal / standard / preview` display modes.
   中文：外部系统推送现在支持 `极简 / 标准 / 预览` 三种显示模式。
7. EN: Appearance now supports preset-based app icon customization for all built-in home modules, and that choice also affects shell notifications.
   中文：外观页现在支持全部内建首页模块的预设型功能图标自定义，并且这个选择也会影响壳内通知。

## 5. What the PM can already feel in the product / 产品侧现在能直接感知到的东西
1. EN: The phone shell now feels more like a real phone because lock-screen notifications and unlocked banners are separated from the real-device push surface.
   中文：现在的手机壳层更像真实手机，因为锁屏/前台横幅通知已经和真实设备推送分开处理了。
2. EN: External notifications are more controllable and less noisy.
   中文：外部系统通知现在更可控，也更克制，不会显得太杂乱。
3. EN: App identity is stronger because icon choices now flow through more surfaces.
   中文：功能身份感更强，因为图标选择现在会同步到更多界面。
4. EN: Background reminder experience is more believable: map arrival reminders and chat role reminders can now continue through the push relay path.
   中文：后台提醒体验更像真的应用：地图到达提醒和聊天角色提醒已经可以走真实推送链路。

## 6. Current main work focus / 当前主要工作重点
1. EN: P1-2 global asset hub closure.
   中文：P1-2 全局素材中台继续收口。
2. EN: P1-3 worldview + map expansion, especially deeper gameplay/event value on top of the current baseline.
   中文：P1-3 世界观 + 地图继续扩展，重点是在现有基线之上增加更有价值的玩法/事件层。
3. EN: True closed-page event generation is still not complete.
   中文：真正意义上的“页面彻底关闭后仍自动生成新事件”还没有完成。
4. EN: Current real push solves delivery; future server-side orchestration will solve autonomous event generation.
   中文：当前真推送解决的是“送达”，后续服务端编排要解决的是“自动生成事件”。

## 7. What is not done yet / 当前还没有做完的部分
1. EN: Shopping, takeout, forum, and other future immersion modules are still early or pending.
   中文：购物、外卖、论坛等后续沉浸模块仍处于早期或待开发状态。
2. EN: Asset-hub fallback rules are improved, but not every future module has fully consumed them yet.
   中文：素材中台的回退规则已经进步很多，但不是所有未来模块都已经完全接入。
3. EN: App icon customization is currently preset-based only; image-upload based custom icons are not done yet.
   中文：功能图标自定义目前仍是预设型，不支持用户上传图片作为图标。
4. EN: External push body customization is still limited to mode-based behavior; fully custom push copy is not yet a product feature.
   中文：外部推送正文目前仍主要按模式控制；更细的自定义推送文案还不是正式功能。
5. EN: The project still has large bundle warnings during build, so package-size optimization remains future engineering work.
   中文：项目构建时仍有较大的包体警告，因此包体优化仍是后续工程任务。

## 8. Current product decisions that are already locked / 当前已经锁定的产品决策
1. EN: Gallery is the global asset hub.
   中文：相册就是全局素材中台。
2. EN: Worldview and knowledge points are different layers and should not stay merged in one text blob.
   中文：世界观与知识点是两层不同内容，不应长期混在一段文本里。
3. EN: Map baseline should remain simulation-first and low-API.
   中文：地图基线应坚持“模拟优先、低 API 依赖”。
4. EN: In-shell notifications and real-device push are different product layers.
   中文：壳内通知与真实设备推送属于不同产品层。
5. EN: External push defaults to `SchatPhone` identity; module identity belongs mainly to the shell layer.
   中文：外部推送默认属于 `SchatPhone` 身份；模块身份主要属于壳内层。

## 9. PM decisions that may be needed later / 后续可能需要产品侧确认的点
1. EN: Whether external push default should stay `minimal` or switch to `standard` after more user testing.
   中文：外部推送默认模式是否继续保持 `极简`，还是在后续体验后改为 `标准`。
2. EN: Whether app-icon customization should expand from preset icons to uploaded image icons.
   中文：功能图标自定义是否要从预设图标扩展到用户上传图片图标。
3. EN: Whether real closed-page autonomous event generation is worth the extra server complexity in the next milestone.
   中文：下一阶段是否值得为“页面彻底关闭后也能自动生成事件”投入更高的服务端复杂度。
4. EN: Whether some future modules should reuse the same push style rules, or get their own exceptions.
   中文：后续某些模块是否继续沿用统一推送规则，还是允许做例外处理。

## 10. Quick read path / 快速阅读路径
1. EN: Project master guide: `PROJECT_MASTER_GUIDE.md`
   中文：项目总览：`PROJECT_MASTER_GUIDE.md`
2. EN: PM overall brief: `PRODUCT_MANAGER_PROJECT_BRIEF.md`
   中文：产品经理总览：`PRODUCT_MANAGER_PROJECT_BRIEF.md`
3. EN: Engineering execution board: `TODO_ROADMAP.md`
   中文：工程执行看板：`TODO_ROADMAP.md`
4. EN: Notification/app-identity requirements: `docs/reference/NOTIFICATION_AND_APP_ICON_REQUIREMENTS.md`
   中文：通知/功能身份需求：`docs/reference/NOTIFICATION_AND_APP_ICON_REQUIREMENTS.md`

## 11. Change log / 变更记录
1. 2026-04-07 EN: Initial PM-readable execution report was created.
   2026-04-07 中文：创建了首版产品经理可读执行报告。
2. 2026-04-09 EN: Synced P0 closure progress for chat, role binding, gallery, and backup.
   2026-04-09 中文：同步了聊天、角色绑定、相册与备份相关的 P0 收口进度。
3. 2026-04-10 EN: Synced P1-1 and P1-2 baseline progress for image-reference pipeline and asset-hub expansion.
   2026-04-10 中文：同步了 P1-1 与 P1-2 的基线进度，包括参考图链路与素材中台扩展。
4. 2026-04-12 EN: Synced worldview split and map baseline direction into PM narrative.
   2026-04-12 中文：将世界观拆分与地图基线方向同步进产品叙述。
5. 2026-04-16 EN: Rebuilt this document as clean UTF-8 bilingual content and synced the latest push / notification / app-identity progress.
   2026-04-16 中文：将本文件重建为干净的 UTF-8 双语内容，并同步最新的推送 / 通知 / 功能身份进展。
