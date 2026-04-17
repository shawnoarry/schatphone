# SchatPhone TODO Roadmap / SchatPhone 动态待办清单
Updated / 更新时间: 2026-04-17

## 0. Read First / 阅读顺序
1. EN: This file is the live execution board for implementation order.
   中文：本文件是实现顺序的动态执行看板。
2. EN: For product context, read `PROJECT_MASTER_GUIDE.md` first, then return here.
   中文：先读 `PROJECT_MASTER_GUIDE.md` 了解全局，再回到本文件执行。
3. EN: If any old document conflicts with this file, this file wins.
   中文：若旧文档与本文件冲突，以本文件为准。

## 0.5 AI Quick Start (10 min) / AI 接手速览（10分钟）
1. EN: Current target moved to P1 kickoff after closing all P0 items.
   中文：当前目标已切换为 P1 启动阶段（P0 已全部收口）。
2. EN: Start from these files first:
   中文：先从这些文件开始阅读与改动：
   - `src/stores/chat.js`
   - `src/views/ContactsView.vue`
   - `src/views/ChatDirectoryView.vue`
   - `src/views/GalleryView.vue`
   - `src/views/ChatView.vue`
3. EN: Run full verification before task closure:
   中文：收口前必须跑完整验证：
   - `npm run lint`
   - `npm test`
   - `npm run build`
4. EN: Keep docs and code in sync in the same commit batch.
   中文：文档和代码必须在同一批提交中同步更新。

## 1. Board Rules / 看板规则
1. EN: Every task status change must be synced in this file in the same commit batch.
   中文：任何任务状态变化都必须在同一批提交中同步到本文件。
2. EN: Every `IN_PROGRESS` item must have clear acceptance criteria and regression checks.
   中文：所有 `IN_PROGRESS` 任务必须有明确验收标准和回归检查点。
3. EN: Keep wording understandable for non-coding PMs and actionable for AI engineers.
   中文：文案需同时满足产品经理可读和 AI 工程师可执行。
4. EN: Do not delete historical decisions; move them to change log if needed.
   中文：不要删除历史决策，必要时转入变更记录。

## 2. Status Legend / 状态说明
- `TODO`: EN: Not started. / 中文：未开始。
- `IN_PROGRESS`: EN: Active development. / 中文：开发中。
- `PARTIAL_DONE`: EN: Baseline landed, closure pending. / 中文：基线已落地，仍需收口。
- `DONE`: EN: Accepted and closed. / 中文：验收完成并关闭。
- `ON_HOLD`: EN: Intentionally deferred. / 中文：主动搁置。

## 3. Program Snapshot / 项目快照
1. EN: Core shell is stable (Lock/Home/Settings/Chat main path).
   中文：核心壳层稳定（锁屏/Home/Settings/Chat 主链路）。
2. EN: Chat rich-send lane is online and `Trigger Reply` remains persistent.
   中文：Chat 富消息发送链路已上线，`Trigger Reply` 继续常驻。
3. EN: Global role profile + thread binding baseline is landed.
   中文：全局角色档案 + 会话绑定基线已落地。
4. EN: `P0-4` rich-message lane and `P0-1` semantic revision are now closed in P0 scope.
   中文：`P0-4` 富消息链路与 `P0-1` 语义修订已在 P0 范围内完成收口。
5. EN: `P0-3` and `P0-6` cross-module role/avatar/asset contract closure is completed with reusable API + tests.
   中文：`P0-3` 与 `P0-6` 的跨模块角色/头像/素材契约收口已完成，包含可复用 API 与测试。
6. EN: Real-push reliability + scheduling baseline is landed: health check, resync, startup self-heal, timed delivery, and Chat/Map scheduled reminders are now online.
   中文：真推送可靠性 + 定时基线已落地：健康检查、重同步、启动自愈、定时送达，以及 Chat/地图的定时提醒现已上线。
7. EN: Notification-surface split and app-icon identity baseline is landed: external push modes are selectable, while all built-in home modules now support preset-based icon customization shared by shell notifications.
   中文：通知分层与功能身份基线已落地：外部推送模式现可切换，且全部内建首页模块都已支持预设型图标自定义，并与壳内通知共用。

---

## 4. Next Up (Immediate) / 下一项待办（立即执行）

### P1 Kickoff Preview / P1 启动预览
Status / 状态: `IN_PROGRESS`
Priority / 优先级: `Highest next / 下一阶段最高`

#### 4.1 Problem Statement / 问题定义
1. EN: With P0 closed, the next risk is keeping immersive features extensible without breaking stable core paths.
   中文：P0 收口后，下一风险是扩展沉浸功能时不破坏稳定主链路。
2. EN: P1 should prioritize modules that increase immersion while reusing existing contracts and storage policies.
   中文：P1 需优先推进能提升沉浸感且可复用现有契约与存储策略的模块。

#### 4.2 Scope / 本轮范围
1. EN: Start P1 item-1: AI image-reference pipeline (provider-capability dependent).
   中文：启动 P1 第 1 项：AI 图生图参考链路（依赖供应商能力）。
2. EN: Keep role/asset contract reuse as mandatory baseline for new modules.
   中文：新模块必须复用现有角色/素材契约基线。
3. EN: Keep backup/reporting behavior unchanged while adding new immersion features.
   中文：新增沉浸功能时保持备份与诊断报告行为稳定不回退。
4. EN: Baseline landed in this round: chat now extracts recent user image blocks as references and injects them into one AI call with provider-aware transport + fallback.
   中文：本轮已落地基线：Chat 会提取近期用户图片消息作为参考图，并在一次 AI 调用中按供应商能力进行传输与回退。
5. EN: Thread-level image-reference mode control is now available (`auto` / `context_only` / `native_url`) and persisted in conversation AI prefs.
   中文：会话级参考图模式已可配置并持久化（`auto` / `context_only` / `native_url`）。
6. EN: Local gallery file assets can now be converted to image data URLs (size-guarded) for the same AI call; oversized files downgrade to text-only cues automatically.
   中文：本地相册文件素材现可在大小守卫下转为 data URL 参与同轮 AI 调用；超限文件会自动降级为文字线索。
7. EN: Assistant message metadata now records image-reference transport result (`mode/count/fallback/provider`) and exposes lightweight in-thread hints.
   中文：助手消息元信息现会记录参考图传输结果（`模式/数量/回退/供应商`），并在会话内提供轻量提示。
8. EN: PM locked the next feature family: global asset hub V2 with custom folders and cross-module binding.
   中文：产品侧已锁定下一组功能：全局素材中台 V2（自定义文件夹 + 跨模块绑定）。
9. EN: Binding model for V1 execution is fixed to single-folder-per-slot; schema must reserve future folder-priority chain extension.
   中文：V1 执行模型固定为“每槽位单文件夹绑定”；数据结构必须预留未来“文件夹优先级链”扩展。
10. EN: Bound asset/folder delete and replace must require second confirmation; force-delete is allowed.
    中文：被绑定素材/文件夹的删除与替换必须二次确认；允许强制删除。
11. EN: Each module that consumes visuals must define fallback defaults so missing assets never break baseline flows.
    中文：凡消费视觉素材的模块都必须有默认回退，确保缺少素材时不破坏基础流程。
12. EN: Not all uploads are forced into gallery: one-off upload/one-off AI generate lanes are allowed for module-local content, with optional "import to gallery" prompt.
    中文：并非所有上传都强制入相册：模块本地内容可走单次上传/单次 AI 生成，并提供“是否导入素材库”弹窗。
13. EN: Runtime smoothness policy is mandatory: broad format support with media-type size limits.
    中文：运行流畅性策略为强制项：格式支持尽量广，但需按媒体类型限制体积上限。

---

## 5. P0 Board / P0 任务看板（细化版）

### P0-1 AI Single-Message Semantic Revision / AI 单条语义修订
Status / 状态: `DONE`

Done / 已完成:
1. EN: Assistant message semantic revision is available from message actions (without full reroll).
   中文：助手消息已支持从消息动作入口进行语义修订（不需要整轮重 roll）。
2. EN: Revised text is persisted into message context and reused in later calls.
   中文：修订文本会写入消息上下文，并在后续调用中继续使用。
3. EN: Rollback path is available via `Restore original`.
   中文：可通过 `恢复原文` 执行回滚。
4. EN: Edit UX moved from browser prompt to in-chat modal editor for better immersion.
   中文：编辑交互已从浏览器 `prompt` 改为 Chat 内弹层编辑，沉浸感更好。
5. EN: Added dedicated regression tests for semantic-revision UI flow (open/edit/save/restore).
   中文：已补齐语义修订 UI 流程（打开/编辑/保存/恢复）的专项回归测试。
6. EN: Added configurable trace policy (`silent` by default, optional `meta_hint`) for future revision visibility strategy.
   中文：已加入可配置修订痕迹策略（默认 `silent`，可选 `meta_hint`），便于后续可见性策略调整。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-2 Chat Top-Level Bottom Dock / Chat 一级页底部功能位
Status / 状态: `DONE`

Done / 已完成:
1. EN: `/chat` list page now has fixed bottom dock entries (`Prefs` / `Identity` / `Labs`).
   中文：`/chat` 一级列表页已提供固定底部入口（`偏好` / `身份` / `实验室`）。
2. EN: Dock routes to real pages (`/chat-feature/:feature`) and keeps chat thread entry unchanged.
   中文：底部入口已路由到真实页面（`/chat-feature/:feature`），且不影响会话进入主流程。
3. EN: `preferences` and `labs` pages are now production-usable (batch conversation preference apply + maintenance utilities).
   中文：`preferences` 与 `labs` 页面已实装可用（会话偏好批量应用 + 运维清理工具）。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-3 Avatar Hierarchy B / 头像层级 B（会话 > 模块 > 全局 > 兜底）
Status / 状态: `DONE`

Done / 已完成:
1. EN: Shared resolver baseline landed.
   中文：统一解析器基线已落地。
2. EN: Module-level override entry available.
   中文：模块级覆写入口已可用。
3. EN: Thread-level self/contact override available.
   中文：会话级自己/对方覆写已可配。
4. EN: Avatar hierarchy layer trace is now available in role-binding contract (`thread/module/global/fallback`).
   中文：角色绑定契约中已提供头像层级命中信息（`会话/模块/全局/兜底`）。
5. EN: Added contract-level regression tests for hierarchy stability.
   中文：已补齐契约级头像层级稳定性回归测试。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-4 User Rich Message Lane Hardening / 用户富消息链路加固
Status / 状态: `DONE`

Done / 已完成:
1. EN: `+` panel lane for image/gif/link/location/transfer/voice-card.
   中文：`+` 面板已支持图片/gif/链接/位置/转账/语音卡片。
2. EN: Link/transfer/voice-card changed to inline forms.
   中文：链接/转账/语音卡片已改为内联表单。
3. EN: `Trigger Reply` kept persistent as independent AI invoke lane.
   中文：`Trigger Reply` 保留为独立常驻 AI 调用通道。
4. EN: Link/transfer/voice-card forms now use pre-submit validation hints and disabled-state submit buttons.
   中文：链接/转账/语音卡片表单已接入提交前校验提示与提交按钮禁用态。
5. EN: Gallery/location entries in `+` action grid now use availability-state guards, disabled styles, and shared inline guidance.
   中文：`+` 动作网格中的“素材库/位置”入口已接入可用性守卫、禁用态样式与共享提示文案。
6. EN: Message-edit validation logic is extracted into a testable helper with dedicated unit tests.
   中文：消息编辑校验逻辑已抽离为可测试辅助函数，并补齐专门单元测试。
7. EN: Added success-state notices for edit-save and restore actions to improve edge-state feedback clarity.
   中文：已补充编辑保存与恢复原文的成功提示，增强边界状态反馈清晰度。
8. EN: Added component-level regression tests for in-chat edit modal and restore flow.
   中文：已补齐 Chat 组件级编辑弹层与恢复流程回归测试。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-5 Gallery Global Asset Center v1 / 相册全局素材中心 v1
Status / 状态: `DONE`

Done / 已完成:
1. EN: Unified gallery store with asset categories.
   中文：统一素材 store 与分类体系已上线。
2. EN: Local + URL import with dedupe checks.
   中文：本地 + URL 导入与去重校验已上线。
3. EN: Safe delete path with usage guard.
   中文：使用守卫 + 安全删除路径已上线。
4. EN: Backup metadata wiring and chat consumption wiring completed.
   中文：备份元数据接线与 Chat 消费接线已完成。
5. EN: Settings export panel now clearly exposes backup mode summary (metadata-only vs metadata+asset-package) and package size/item limits.
   中文：Settings 导出面板已清晰展示备份模式摘要（仅元数据 vs 元数据+素材包）与素材包体积/数量上限。
6. EN: Export result now reports partial asset-package packaging (skipped/missing/limit-hit) as warning with dedicated report code.
   中文：导出结果已支持“素材包部分打包”告警（跳过/缺失/超限），并写入独立报告编码。
7. EN: Export/import actions now enforce mutual exclusion to avoid overlapping operations.
   中文：导出与导入动作已加入互斥保护，避免并发操作冲突。
8. EN: Added backup copy style switch (`direct` / `immersive`) in Settings and normalized persistence fallback.
   中文：在 Settings 新增备份文案风格开关（`直白` / `沉浸`），并补齐持久化归一化回退。
9. EN: Network history entry naming is unified to diagnostics center (`API/Storage`) for non-technical readability.
   中文：Network 历史入口命名统一为“诊断报告中心（API/存储）”，提升非技术用户可读性。
10. EN: Added store-level regression tests for backup copy tone default/restore/invalid fallback.
    中文：新增 store 级回归测试，覆盖备份文案风格默认值/恢复值/非法值回退。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-6 Role Binding and Asset Reuse / 角色绑定与素材复用
Status / 状态: `DONE`

Done / 已完成:
1. EN: `/contacts` role profile supports asset-pack binding.
   中文：`/contacts` 角色档案支持素材包绑定。
2. EN: Chat directory supports thread-level preferred asset override.
   中文：会话通讯录支持会话级优先素材覆盖。
3. EN: Chat asset selection uses role-binding context.
   中文：Chat 素材选择已接入角色绑定上下文。
4. EN: Added unified cross-module role binding contract APIs in chat store:
   中文：已在 chat store 新增统一跨模块角色绑定契约 API：
   - `getRoleBindingContract(contactId, { moduleKey })`
   - `listRoleBindingContracts(contactIds?, { moduleKey })`
5. EN: Added contract reference document with integration checklist:
   中文：已补齐契约参考文档与接入清单：
   - `docs/reference/ROLE_BINDING_CONTRACT.md`
6. EN: Existing chat flow remains backward compatible via `getRoleBindingAssetContext`.
   中文：现有 Chat 流程保持向后兼容，继续可用 `getRoleBindingAssetContext`。

Remaining / 剩余:
1. EN: No remaining P0 closure items for this task.
   中文：该任务在 P0 范围内无剩余收口项。

---

### P0-7 Storage and Backup Hardening / 存储与备份加固
Status / 状态: `DONE`

Current / 当前:
1. EN: Layered persistence baseline and diagnostics are available.
   中文：分层持久化基线与诊断能力已可用。
2. EN: Backup restore has rollback-safe baseline.
   中文：备份恢复已具备回滚基线。
3. EN: Backup export/import now supports metadata-first mode with optional gallery asset package restore path and readable report codes.
   中文：备份导入导出已支持“元数据优先 + 可选相册素材包恢复”路径，并接入可读报告编码。
4. EN: Import preflight guard is active (invalid JSON / unsupported schema / unsupported structure are explicitly classified).
   中文：导入预检守卫已启用（无效 JSON / 版本过高 / 结构不支持均可明确分型）。

---

## 6. P1 Queue (After P0 Stabilizes) / P1 队列（P0 稳定后）
1. EN: AI image-reference pipeline (provider capability dependent) — `IN_PROGRESS` (phase-1/2 baseline landed + local-file data URL path + in-thread result hints).
   中文：AI 图生图参考链路（依赖供应商能力）— `IN_PROGRESS`（第一/二阶段基线已落地 + 本地图 data URL 路径 + 会话内结果提示）。
2. EN: Global asset hub V2 (PM-locked) — `IN_PROGRESS` (data schema landed; UI/safety/fallback tasks pending).
   中文：全局素材中台 V2（产品已冻结）— `IN_PROGRESS`（数据结构已落地；UI/安全/回退任务待完成）。
3. EN: Scenario cards and interactive mini-scenes.
   中文：场景卡片与互动小剧场扩展。
4. EN: Cross-module role/asset identity reuse.
   中文：跨模块角色/素材身份复用。
5. EN: World-kernel split (`global worldview` + `bindable knowledge points`) with chat prompt assembly wiring.
   中文：世界内核拆分（`全局世界观` + `可绑定知识点`）与 Chat 提示词组装接线。
6. EN: Map foundation v2 (`simulation-first, low-API`) with optional AI visuals/events as add-ons.
   中文：地图基础 v2（`模拟优先、低 API 依赖`），AI 视觉/事件仅作为可选增强层。

### 6.1 Asset Hub V2 Execution Checklist / 素材中台 V2 执行清单
Status / 状态: `IN_PROGRESS`

1. EN: Data schema task — `DONE`: custom folders + role slot-binding records are landed (V1 = single folder per slot, reserved priority fields + backward-compatible migration + tests).
   中文：数据结构任务——`DONE`：已落地自定义文件夹与角色槽位绑定记录（V1=单文件夹绑定，并预留优先级字段 + 向后兼容迁移 + 测试）。
2. EN: Gallery + Chat consumption task — `DONE`: Gallery folder CRUD is landed; Contacts exposes profile-image/dynamic-media/emoji/reference slot pickers with live binding-state/fallback hints and Gallery jump entry; Chat now consumes folder-bound assets in thread preferred list, gallery send ranking, and AI image-reference collection fallback; Chat Directory also surfaces profile-folder readiness summary.
   中文：相册 + Chat 消费任务——`DONE`：Gallery 文件夹增删改已落地；通讯录已提供形象照/动态图/表情包/参考图槽位选择，并补齐实时绑定状态/默认回退提示与跳转相册入口；Chat 已接入文件夹绑定素材用于会话优先素材列表、发送素材排序与 AI 参考图回退采样；会话通讯录也已显示档案文件夹就绪摘要。
3. EN: Safety task — `DONE (phase-1)`: bound folder delete + bound asset delete/replace now enforce second confirmation in Gallery UI; force-delete path remains available.
   中文：安全任务——`DONE（第一阶段）`：Gallery UI 中已对绑定文件夹删除与绑定素材删除/替换统一执行二次确认，并保留强制删除路径。
4. EN: Fallback task — `IN_PROGRESS` module-level default policies:
   中文：回退任务——`IN_PROGRESS` 模块级默认策略：
   - EN: role lanes fallback to text-first/no-pack/no-pad-image baseline (optional AI image-generation switch).
      中文：角色链路回退到文字优先/无包/无垫图基线（可选 AI 生图开关）。
   - EN: appearance fallback to built-in wallpaper.
      中文：美化链路回退到内置壁纸。
   - EN: map fallback (future) to icon/default image with first-use optional AI generate prompt.
      中文：地图链路（后续）回退到 icon/默认图，首次可选 AI 生图提示。
5. EN: Module-local upload task — `IN_PROGRESS`: Chat and Map now support one-off local media apply/send without gallery import (with size guard) plus import-before-use path; other modules (shopping/takeout/etc.) remain pending.
   中文：模块本地上传任务——`IN_PROGRESS`：Chat 与 Map 已支持“单次本地应用/发送不入库”（带体积守卫）与“先入库再使用”双路径；购物/外卖等模块待接入。
6. EN: Performance policy task — `DONE (phase-1)`: centralized media-size policy is now wired in Chat/Gallery (import + replace + one-off send) with explicit oversize rejection copy for image/animation and reserved video limits.
   中文：性能策略任务——`DONE（第一阶段）`：Chat/Gallery 已接入统一媒体体积策略（导入 + 替换 + 单次发送），并提供图片/动图超限拒绝提示，同时预留视频上限规则。

Acceptance / 验收标准:
1. EN: Missing assets do not block baseline module usage.
   中文：缺少素材不阻塞任何基础模块使用。
2. EN: Role-bound slots can switch folder bindings without data corruption.
   中文：角色槽位可切换文件夹绑定且不损坏数据。
3. EN: Delete/replace confirmation is always visible before destructive actions.
   中文：删除/替换前始终有明确二次确认。
4. EN: One-off upload flow can finish without gallery import, while optional import remains available.
   中文：单次上传可不入库完成流程，同时保留可选入库。

---

### 6.2 World Kernel + Map Alignment Checklist / 世界内核 + 地图对齐清单
Status / 状态: `IN_PROGRESS`

1. EN: Data-schema task — `DONE (phase-1)`: split current single `worldBook` text into two layers:
   中文：数据结构任务：将当前单一 `worldBook` 文本拆分为两层：
   - EN: `globalWorldview` (mandatory global baseline).
      中文：`globalWorldview`（全局必备基线）。
   - EN: `knowledgePoints[]` (targeted patches, bindable by role/module).
      中文：`knowledgePoints[]`（定向补丁，可按角色/模块绑定）。
2. EN: Binding task — `DONE (phase-1)`: contacts must support role-level knowledge-point binding (single/multi-select), and unbinding must not delete source knowledge points.
   中文：绑定任务：通讯录需支持角色级知识点绑定（单选/多选），解绑不删除知识点源数据。
3. EN: Prompt-assembly task — `DONE (phase-1)`: chat call context order must be deterministic:
   中文：提示词组装任务：Chat 调用上下文顺序必须固定：
   - EN: global worldview -> role profile -> bound knowledge points -> conversation context/memory.
      中文：全局世界观 -> 角色档案 -> 绑定知识点 -> 会话上下文/记忆。
4. EN: Map baseline task — `DONE (phase-1)`: map core loop now runs without mandatory external map API (`location setup -> start trip -> in-transit timer -> arrival state`), with persisted trip state/history.
   中文：地图基线任务 — `DONE（第一阶段）`：地图核心循环已可在不依赖外部地图 API 的情况下运行（`地点设置 -> 开始行程 -> 进行中计时 -> 到达状态`），并支持行程状态/记录持久化。
5. EN: Map-mode task: keep two routes in architecture plan (not both required in first release):
   中文：地图模式任务：架构上保留两条路线（首发不要求同时实现）：
   - EN: fictional simulation mode (default, no-API first).
      中文：架空模拟模式（默认，无 API 优先）。
   - EN: real-map integration mode (optional future extension).
      中文：现实地图接入模式（后续可选扩展）。
6. EN: AI-usage guard task: map AI calls are optional for visual/event flavor only; travel/time/progression must be system-computed.
   中文：AI 调用守卫任务：地图 AI 调用仅用于视觉/事件文案增强；移动时间/进度必须由系统计算。
7. EN: Fallback task — `DONE (phase-1)`: map now supports default visual mode + gallery visual mode, and auto-falls back to default icon/visual when bound asset is missing.
   中文：回退任务 — `DONE（第一阶段）`：地图现支持默认视觉模式 + 素材库视觉模式，且在绑定素材缺失时会自动回退到默认图标/视觉。
8. EN: Map automation-alignment task — `DONE (phase-2 baseline)`: map AI visual refresh now respects system automation runtime policy (`master/module/notify-only/quiet-hours`) and provides manual trigger + status feedback in map UI.
   中文：地图自动化对齐任务 — `DONE（第二阶段基线）`：地图 AI 视觉刷新现已遵循系统自动化运行策略（`总开关/模块开关/仅通知/安静时段`），并在地图页面提供手动触发与状态反馈。

Acceptance / 验收标准:
1. EN: With all map AI toggles off, user can still complete location setup, travel simulation, and arrival-state progression.
   中文：在地图 AI 开关全部关闭时，用户仍可完成地点设置、行程模拟和到达状态推进。
2. EN: Chat always receives global worldview context, and only receives knowledge points explicitly bound to the active role/thread.
   中文：Chat 始终注入全局世界观上下文，且仅注入当前角色/会话显式绑定的知识点。
3. EN: Deleting a role binding never deletes global knowledge-point records.
   中文：删除角色绑定不会删除全局知识点记录。
4. EN: No mandatory extra AI call is introduced for baseline map progression.
   中文：地图基础进度推进不引入强制额外 AI 调用。

---

## 7. Risk Register / 风险清单
1. EN: Documentation drift when IDs or priorities change without same-commit sync.
   中文：任务编号或优先级变更若未同批同步，会引发文档漂移。
2. EN: Storage pressure risk under heavy media usage.
   中文：重素材使用下存在浏览器存储压力风险。
3. EN: If future modules bypass the unified role-binding contract API, cross-module behavior may diverge again.
   中文：若后续模块绕过统一角色绑定契约 API，跨模块行为仍可能再次失配。
4. EN: User confusion if backup model is not clearly explained in settings/help text.
   中文：若设置中的备份模型说明不清，小白用户易误解。
5. EN: If gallery is over-centralized without one-off upload paths, module iteration speed and UX flexibility may regress.
   中文：若素材库过度中心化而缺少单次上传路径，模块迭代效率与体验灵活性会下降。
6. EN: If global worldview and role-targeted knowledge points remain mixed in one text blob, prompt pollution and maintenance cost will increase quickly.
   中文：若全局世界观与角色定向知识点长期混在一段文本中，提示词污染与维护成本会快速上升。
7. EN: If map baseline depends on external provider APIs too early, runtime stability and usage-cost predictability will degrade.
   中文：若地图基线过早依赖外部供应商 API，会降低运行稳定性并增加调用成本不确定性。

---

## 8. Recent Milestones / 近期里程碑
1. EN: Chat message action entry moved to long-press + bottom action sheet.
   中文：Chat 消息操作入口迁移为长按 + 底部动作面板。
2. EN: Avatar hierarchy baseline landed (`thread > module > global > fallback`).
   中文：头像层级基线已落地（会话 > 模块 > 全局 > 兜底）。
3. EN: Gallery phase-1 landed (import/categorize/dedupe/delete + backup metadata path).
   中文：相册第一阶段完成（导入/分类/去重/删除 + 备份元数据接线）。
4. EN: Role profile asset-pack binding and thread preferred asset override landed.
   中文：角色素材包绑定与会话优先素材覆盖已落地。
5. EN: Storage hardening batch added optional backup asset-package mode and partial-restore diagnostics in Settings/Network reports.
   中文：存储加固批次已新增“可选素材包备份模式”与 Settings/Network 报告中的部分恢复诊断。
6. EN: Backup import preflight now classifies invalid JSON / unsupported schema / unsupported structure explicitly.
   中文：备份导入预检现已可明确区分 JSON 无效 / 版本过高 / 结构不支持。
7. EN: Chat rich-message forms now support pre-submit validation hints and disabled-state submit buttons.
   中文：Chat 富消息表单现已支持提交前校验提示与提交按钮禁用态。
8. EN: Chat `+` action grid now applies consistent availability guards for gallery/location with disabled states and inline hints.
   中文：Chat `+` 动作网格现已对素材库/位置应用一致的可用性守卫、禁用态与内联提示。
9. EN: Message edit UX moved from browser prompt to in-chat modal editor while keeping semantic revision and restore path.
   中文：消息编辑交互已从浏览器 prompt 迁移为 Chat 内弹层，同时保留语义修订与恢复原文路径。
10. EN: `P0-1`, `P0-2`, and `P0-4` are now closed in P0 scope.
    中文：`P0-1`、`P0-2` 与 `P0-4` 已在 P0 范围内完成收口。
11. EN: Added dedicated unit tests for chat message-edit validation helper to reduce regression risk in future UI refactors.
    中文：已为聊天消息编辑校验辅助函数新增专项单测，降低后续 UI 重构回归风险。
12. EN: Chat dock feature pages were upgraded from placeholders to usable `preferences/labs` tools, closing `P0-2`.
    中文：Chat 底部功能页已从占位升级为可用 `preferences/labs` 工具，`P0-2` 正式收口。
13. EN: Closed `P0-3/P0-6` contract closure: unified role-binding contract APIs + checklist doc + regression tests are landed.
    中文：`P0-3/P0-6` 契约收口已完成：统一角色绑定契约 API、接入清单文档与回归测试已落地。
14. EN: Closed `P0-5` by landing backup copy-style switch and diagnostics-center naming polish.
    中文：通过落地备份文案风格切换与诊断中心命名优化，`P0-5` 已完成收口。
15. EN: Started `P1-1` phase-1: AI calls now support provider-aware image-reference transport with automatic context fallback.
    中文：已启动 `P1-1` 第一阶段：AI 调用已支持按供应商能力处理参考图，并在不支持时自动回退上下文注入。
16. EN: Added thread-level image-reference mode setting and persisted it in conversation AI prefs.
    中文：新增会话级参考图模式设置，并写入会话 AI 偏好持久化。
17. EN: Added local file-reference conversion for AI calls: gallery file assets now resolve to data URLs under size guard, with automatic text-cue downgrade on overflow.
    中文：新增本地文件参考图转换：相册文件素材在大小守卫下可转为 data URL 参与 AI 调用，超限自动降级为文字线索。
18. EN: Added assistant image-reference telemetry in message metadata (`mode/count/fallback/provider`) and surfaced compact thread hints.
    中文：新增助手参考图调用遥测元信息（`模式/数量/回退/供应商`），并在会话中展示精简提示。
19. EN: Started asset hub V2 UI rollout: Gallery now has folder CRUD + per-asset add-to-folder quick action; Contacts now exposes folder-slot binding pickers for profile-image/dynamic-media/emoji/reference.
    中文：已启动素材中台 V2 UI 落地：Gallery 现支持文件夹增删改与素材快速归档；通讯录已提供形象照/动态图/表情包/参考图槽位绑定选择。
20. EN: PM confirmed world-map adjustment direction: split world kernel into global worldview + bindable knowledge points, and keep map on simulation-first low-API baseline.
    中文：产品侧确认世界观-地图调整方向：世界内核拆分为“全局世界观 + 可绑定知识点”，地图基线采用“模拟优先、低 API 依赖”。
21. EN: Started world-kernel phase-1 implementation: system store now supports `globalWorldview + knowledgePoints`, contacts role profiles now support knowledge-point binding, and chat prompt now injects bound knowledge points in deterministic order.
    中文：已启动世界内核第一阶段实现：system store 已支持 `globalWorldview + knowledgePoints`，通讯录角色档案已支持知识点绑定，Chat 提示词已按固定顺序注入绑定知识点。
22. EN: Landed map baseline phase-1 loop: Map now supports trip lifecycle (`ready -> traveling -> arrived/cancelled`), real-time countdown by system clock, trip history, and backup restore continuity without external map API.
    中文：已落地地图基线第一阶段循环：Map 现支持行程生命周期（`待出发 -> 进行中 -> 到达/取消`）、基于系统时间的倒计时、行程记录，以及不依赖外部地图 API 的备份恢复连续性。
23. EN: Landed map fallback phase-1: added map visual mode switch (`default/gallery`), onboarding hint, gallery-asset binding, and automatic fallback to default when asset is unavailable.
    中文：已落地地图回退第一阶段：新增地图视觉模式切换（`默认/素材库`）、首启引导、素材库绑定，以及素材不可用时自动回退默认模式。
24. EN: Landed map automation-alignment baseline: map store now exposes AI-visual runtime policy and queue trigger, wired to system automation controls and map manual refresh entry.
    中文：已落地地图自动化对齐基线：map store 已提供 AI 视觉运行策略与队列触发能力，并接入系统自动化控制与地图手动刷新入口。
25. EN: Landed asset safety phase-1 in Gallery: in-use asset replace flow (`URL/file`) is now available with two-step confirmation and binding-preserving replacement.
    中文：已落地素材安全第一阶段：Gallery 新增“使用中素材替换”（`URL/文件`）流程，带双重确认并保持绑定关系不丢失。
26. EN: Landed media-size policy phase-1: Chat/Gallery now share centralized size guards for import/replace/one-off media, with explicit oversize feedback and deterministic reject reasons.
    中文：已落地媒体体积策略第一阶段：Chat/Gallery 现共用统一的导入/替换/单次媒体体积守卫，并提供明确超限提示与可追踪拒绝原因。

---

## 9. Change Log / 变更记录
1. 2026-04-07 EN: Replaced compressed TODO with detailed execution-grade bilingual board.
   2026-04-07 中文：将过度简化版 TODO 重写为“可执行细纲双语版”。
2. 2026-04-07 EN: Explicitly set `P0-7` as immediate next task with subtask breakdown.
   2026-04-07 中文：明确 `P0-7` 为下一项待办，并给出子任务拆分。
3. 2026-04-07 EN: Updated `P0-6` to `PARTIAL_DONE` and captured remaining closure points.
   2026-04-07 中文：将 `P0-6` 更新为 `PARTIAL_DONE`，并记录剩余收口点。
4. 2026-04-07 EN: Closed `P0-7` and switched immediate next-up to `P0-4`.
   2026-04-07 中文：完成 `P0-7` 收口，并将下一项待办切换为 `P0-4`。
5. 2026-04-07 EN: Completed `P0-4` action-grid availability pass for gallery/location and ran full lint/test/build verification.
   2026-04-07 中文：完成 `P0-4` 中素材库/位置动作网格可用性收口，并完成 lint/test/build 全量回归验证。
6. 2026-04-07 EN: Replaced browser prompt message editing with in-chat modal editor and synced `P0-1/P0-2` status updates.
   2026-04-07 中文：将消息编辑从浏览器 prompt 升级为 Chat 内弹层编辑，并同步 `P0-1/P0-2` 状态更新。
7. 2026-04-07 EN: Added `chat-message-edit` validation helper and dedicated tests, then passed lint/test/build full gate.
   2026-04-07 中文：新增 `chat-message-edit` 校验辅助与专项测试，并通过 lint/test/build 全量验证。
8. 2026-04-08 EN: Implemented production-ready `preferences/labs` pages for chat dock and marked `P0-2` as `DONE`.
   2026-04-08 中文：实装 Chat 底部 `preferences/labs` 页面并将 `P0-2` 标记为 `DONE`。
9. 2026-04-09 EN: Added component-level semantic revision regression tests (open/edit/save/restore) and closed `P0-1`.
   2026-04-09 中文：补齐语义修订组件级回归测试（打开/编辑/保存/恢复）并完成 `P0-1` 收口。
10. 2026-04-09 EN: Added configurable semantic-revision trace policy (`silent` default, optional `meta_hint`) and closed `P0-4`.
    2026-04-09 中文：新增可配置语义修订痕迹策略（默认 `silent`，可选 `meta_hint`）并完成 `P0-4` 收口。
11. 2026-04-09 EN: Closed `P0-3/P0-6` by landing cross-module role-binding contract APIs and contract reference doc.
    2026-04-09 中文：通过落地跨模块角色绑定契约 API 与契约参考文档，完成 `P0-3/P0-6` 收口。
12. 2026-04-09 EN: Closed `P0-5` with backup copy-style toggle, diagnostics naming unification, and regression tests.
    2026-04-09 中文：通过备份文案风格切换、诊断命名统一与回归测试，完成 `P0-5` 收口。
13. 2026-04-10 EN: Started `P1-1` phase-1 with provider-aware image-reference transport and fallback, plus helper regression tests.
    2026-04-10 中文：启动 `P1-1` 第一阶段：接入按供应商能力的参考图传输与回退，并补齐辅助函数回归测试。
14. 2026-04-10 EN: Added thread-level image-reference mode control (`auto/context_only/native_url`) in chat menu and wired store normalization.
    2026-04-10 中文：在 Chat 会话菜单新增参考图模式控制（`auto/context_only/native_url`），并完成 store 归一化接线。
15. 2026-04-10 EN: Extended `P1-1` with local gallery file-reference conversion (data URL path with size guard + overflow fallback).
    2026-04-10 中文：扩展 `P1-1`：新增本地相册文件参考图转换（data URL 路径 + 大小守卫 + 超限回退）。
16. 2026-04-10 EN: Added image-reference execution metadata into assistant messages and exposed compact in-thread hints.
    2026-04-10 中文：新增助手消息的参考图执行元信息，并在会话内展示精简提示。
17. 2026-04-10 EN: PM locked global asset hub V2 requirements (custom folders, slot binding, delete/replace confirmation, fallback defaults, one-off upload optional import).
    2026-04-10 中文：产品侧冻结全局素材中台 V2 需求（自定义文件夹、槽位绑定、删除/替换确认、默认回退、单次上传可选入库）。
18. 2026-04-10 EN: Added asset hub V2 execution checklist and acceptance criteria for AI engineer handoff.
    2026-04-10 中文：新增素材中台 V2 执行清单与验收标准，用于 AI 程序员接手执行。
19. 2026-04-10 EN: Landed asset hub V2 data layer baseline: custom folder model in gallery + role slot-folder bindings in chat/contract with backward-compatible tests.
    2026-04-10 中文：已落地素材中台 V2 数据层基线：相册自定义文件夹模型 + chat/contract 角色槽位文件夹绑定（含向后兼容测试）。
20. 2026-04-12 EN: Landed asset hub V2 UI phase-1: Contacts folder-slot pickers (profile-image/dynamic-media/emoji/reference) and Gallery folder CRUD + quick add/remove asset actions.
    2026-04-12 中文：已落地素材中台 V2 UI 第一阶段：通讯录槽位文件夹选择（形象照/动态图/表情包/参考图）与 Gallery 文件夹增删改 + 素材快速归档/移除。
21. 2026-04-12 EN: Landed asset hub V2 consumption phase-1 in Chat: folder-bound assets are now consumed by thread preferred options, gallery picker ranking badges, and role-bound AI image-reference fallback.
    2026-04-12 中文：已落地素材中台 V2 在 Chat 侧的第一阶段消费：文件夹绑定素材已用于会话优先素材候选、素材发送面板排序标识，以及角色绑定参考图回退链路。
22. 2026-04-12 EN: Landed role-lane fallback control in Chat thread settings: when no references are available, image blocks now default to text-first fallback, with an optional per-thread override to allow AI-generated image blocks.
    2026-04-12 中文：已落地 Chat 会话级角色回退控制：当无参考图时默认回退为文字优先（不输出图片消息），并提供每会话可选开关以允许 AI 图片消息生成。
23. 2026-04-12 EN: Landed module-local one-off media path in Chat: users can now choose import-before-send or one-off send without gallery import (with inline-size guard).
    2026-04-12 中文：已落地 Chat 模块本地单次媒体链路：用户可选择“先入库后发送”或“单次发送不入库”（含内联体积守卫）。
24. 2026-04-17 EN: Landed asset-hub visibility polish: Contacts now shows per-slot folder binding status/fallback hints plus direct Gallery jump, and Chat Directory now surfaces profile-folder readiness summaries.
    2026-04-17 中文：已落地素材中台可视化打磨：主通讯录现显示各槽位文件夹绑定状态/默认回退提示并提供相册直达入口；会话通讯录现显示档案文件夹就绪摘要。
25. 2026-04-17 EN: Landed package-size optimization phase-1: router now lazy-loads page views, and Vite now separates framework/icons/markdown/vendor chunks to reduce main-bundle pressure while keeping runtime behavior unchanged.
    2026-04-17 中文：已落地包体优化第一阶段：路由现按需懒加载页面视图，Vite 现对 framework/icons/markdown/vendor 进行拆包，在不改变运行逻辑的前提下降低主包压力。
26. 2026-04-17 EN: Landed asset-hub preview polish in Contacts: each folder-slot binding now shows the first few bound thumbnails so users can visually confirm the correct folder content.
    2026-04-17 中文：已落地主通讯录中的素材中台预览打磨：每个文件夹槽位绑定现在会显示前几张缩略图，方便用户直接确认是否绑定到正确内容。
27. 2026-04-17 EN: Landed Chat Directory preview polish: each bound role card now surfaces a lightweight thumbnail strip for profile-folder assets.
    2026-04-17 中文：已落地会话通讯录预览打磨：每个已绑定角色卡片现会显示档案文件夹素材的轻量缩略图带。
28. 2026-04-17 EN: Landed thread-meta preview polish in Chat Directory: thread settings now show the active preferred-image preview plus a quick thumbnail strip for override switching.
    2026-04-17 中文：已落地会话通讯录中的会话设定预览打磨：会话设定现显示当前优先图片预览，并提供覆写切换用的缩略图带。
29. 2026-04-17 EN: Landed map-visual quick-switch polish: Map visual settings now show current background state, direct Gallery jump, and thumbnail-based quick switching.
    2026-04-17 中文：已落地地图视觉快速切换打磨：地图视觉设置现显示当前背景状态、相册直达入口，以及基于缩略图的快速切换。
30. 2026-04-17 EN: Landed map-visual recovery polish: Map now supports one-tap default restore and clearing the remembered gallery binding in place.
    2026-04-17 中文：已落地地图视觉恢复打磨：地图现支持页内一键恢复默认视觉，并可直接清除已记住的素材库背景绑定。
